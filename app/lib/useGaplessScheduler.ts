'use client';

import { useEffect, useRef } from 'react';
import type { PlayerState } from './playerContext';
import {
  getAudioEl,
  getAudioCtx,
  getMediaElementGainNode,
  getGaplessGainNode,
  getNextTrackFromState,
} from './playerContext';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Seconds before track end to start pre-decoding next track */
const PRE_DECODE_WINDOW = 3;

/** Seconds before track end to schedule the AudioBufferSourceNode start */
const SCHEDULE_WINDOW = 1.5;

// ─── Public interface ─────────────────────────────────────────────────────────

export interface GaplessOptions {
  state: PlayerState;
  enabled: boolean;
  crossfade: number; // 0–6 seconds
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages gapless playback by pre-decoding the next track and scheduling an
 * AudioBufferSourceNode to start at the exact moment the current track ends.
 *
 * The hook runs as a polling interval (100 ms) rather than RAF so it can drive
 * async work without violating the "no dispatch inside RAF" rule.
 *
 * Audio graph during handoff:
 *   AudioBufferSourceNode → gaplessGainNode ─┐
 *   HTMLAudioElement → mediaElementGainNode ──┤→ AnalyserNode → DSP → out
 *
 * Cross-fade gain ramps are applied to both GainNodes; the source node is only
 * created and started once per handoff.
 */
export function useGaplessScheduler({ state, enabled, crossfade }: GaplessOptions): void {
  const { queuePos, playing } = state;

  // Stable reference to crossfade so the schedule callback reads the latest value
  const crossfadeRef = useRef(crossfade);
  useEffect(() => { crossfadeRef.current = crossfade; }, [crossfade]);

  // nextTrackId drives the effect dependency — changes when queue or pos changes
  const nextTrack = getNextTrackFromState(state);
  const nextTrackId = nextTrack?.id ?? null;
  const nextTrackUrl = nextTrack?.url ?? null;

  useEffect(() => {
    if (!enabled || !playing || !nextTrackId || !nextTrackUrl) return;

    let cancelled = false;
    let decodedBuffer: AudioBuffer | null = null;
    let decoding = false;
    let scheduled = false;
    let wasInWindow = false;

    const check = async () => {
      if (cancelled) return;

      const audioEl = getAudioEl();
      const audioCtx = getAudioCtx();
      if (!audioEl || !audioCtx) return;

      const currentTime = audioEl.currentTime;
      const duration    = audioEl.duration;
      if (!isFinite(duration) || duration <= 0) return;

      const remaining = duration - currentTime;

      // User sought back past the window — re-arm so we decode again on
      // the next approach to the end.
      if (wasInWindow && remaining > PRE_DECODE_WINDOW) {
        decodedBuffer = null;
        decoding      = false;
        scheduled     = false;
        wasInWindow   = false;
      }

      // ── Pre-decode phase ─────────────────────────────────────────────────
      if (remaining <= PRE_DECODE_WINDOW && !decoding && !decodedBuffer && !scheduled) {
        wasInWindow = true;
        decoding    = true;
        try {
          const res         = await fetch(nextTrackUrl);
          if (cancelled) return;
          const arrayBuffer = await res.arrayBuffer();
          if (cancelled) return;
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          if (cancelled) return;
          decodedBuffer = audioBuffer;
          decoding      = false;
        } catch {
          if (!cancelled) decoding = false;
        }
      }

      // ── Schedule phase ───────────────────────────────────────────────────
      if (decodedBuffer && !scheduled && remaining <= SCHEDULE_WINDOW) {
        scheduled = true;
        scheduleHandoff(decodedBuffer, remaining, crossfadeRef.current);
      }
    };

    const intervalId = setInterval(check, 100);
    check(); // immediate check so we don't wait 100ms on first render

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, playing, queuePos, nextTrackId, nextTrackUrl]);
}

// ─── Handoff ──────────────────────────────────────────────────────────────────

/**
 * Creates an AudioBufferSourceNode from the pre-decoded buffer, connects it
 * into the gaplessGainNode, schedules its start, and applies crossfade ramps.
 *
 * Called at most once per track end — `scheduled` flag in the hook prevents
 * re-entry.
 */
function scheduleHandoff(
  buffer: AudioBuffer,
  remainingTime: number,
  crossfade: number,
): void {
  const audioCtx       = getAudioCtx();
  const mediaElGainNode = getMediaElementGainNode();
  const gaplessGainNode = getGaplessGainNode();

  if (!audioCtx || !mediaElGainNode || !gaplessGainNode) return;

  // Ensure AudioContext is running before scheduling (required on iOS)
  audioCtx.resume().catch(() => {});

  const bufferSource   = audioCtx.createBufferSource();
  bufferSource.buffer  = buffer;
  bufferSource.connect(gaplessGainNode as unknown as AudioNode);

  const now        = audioCtx.currentTime;
  const scheduleAt = now + Math.max(0, remainingTime);

  if (crossfade <= 0) {
    // Hard cut: gains swap at exact schedule point — sample-accurate
    mediaElGainNode.gain.setValueAtTime(0, scheduleAt);
    gaplessGainNode.gain.setValueAtTime(1, scheduleAt);
  } else {
    // Smooth crossfade: both ramps start at (scheduleAt - crossfade)
    const fadeStart    = Math.max(now, scheduleAt - crossfade);
    const timeConstant = crossfade / 3; // reach ~95% at crossfade duration

    mediaElGainNode.gain.setTargetAtTime(0, fadeStart, timeConstant);
    // gapless gain ramps from 0 → 1 starting at fadeStart
    gaplessGainNode.gain.setValueAtTime(0, now);
    gaplessGainNode.gain.setTargetAtTime(1, fadeStart, timeConstant);
  }

  bufferSource.start(scheduleAt);

  // After the buffer source finishes playing, reset gain nodes so the next
  // HTMLAudioElement track (dispatched via TRACK_ENDED in onEnded) gets full
  // gain through the mediaElementGainNode again.
  bufferSource.onended = () => {
    mediaElGainNode.gain.setTargetAtTime(1, audioCtx.currentTime, 0.01);
    gaplessGainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.01);
  };
}
