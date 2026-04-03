'use client';

import { useCallback, useRef, useState, useEffect, type MouseEvent, type PointerEvent } from 'react';
import {
  SkipBack, SkipForward, Play, Pause,
  Volume2, VolumeX, Shuffle, Repeat, Repeat1,
  Library, RotateCcw, ListMusic, Music,
} from 'lucide-react';
import { usePlayer, formatTime, getAudioEl } from '../../lib/playerContext';
import type { LoopMode } from '../../lib/playerContext';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface PlayerBarProps {
  libOpen: boolean;
  onToggleLib: () => void;
  queueOpen: boolean;
  onToggleQueue: () => void;
}

function LoopIcon({ mode }: { mode: LoopMode }) {
  if (mode === 'track') return <Repeat1 size={15} />;
  return <Repeat size={15} />;
}

export function PlayerBar({ libOpen, onToggleLib, queueOpen, onToggleQueue }: PlayerBarProps) {
  const {
    state,
    togglePlay, seek, next, prev,
    setVolume, toggleMute, setSpeed,
    setLoopA, setLoopB, setLoopAAt, setLoopBAt, toggleLoop, clearLoop,
    cycleShuffle, cycleLoopMode,
  } = usePlayer();

  const {
    tracks, queue, queuePos, playing,
    position, duration, volume, muted, speed,
    loopA, loopB, loopActive,
    shuffleMode, loopMode,
  } = state;

  const currentId = queue[queuePos] ?? null;
  const track = currentId ? tracks.find(t => t.id === currentId) ?? null : null;
  const progressRef = useRef<HTMLDivElement>(null);
  const fillRef     = useRef<HTMLDivElement>(null);
  const thumbRef    = useRef<HTMLDivElement>(null);
  const timeRef     = useRef<HTMLSpanElement>(null);
  const draggingRef = useRef(false);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; pct: number }>({
    visible: false, x: 0, pct: 0,
  });

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu.visible) return;
    const close = () => setContextMenu(m => ({ ...m, visible: false }));
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [contextMenu.visible]);

  // ── RAF-driven smooth progress bar (bypasses React state at 60fps) ─────────
  useEffect(() => {
    let rafId: number;
    function tick() {
      const el = getAudioEl();
      if (el && !draggingRef.current) {
        const dur = el.duration;
        if (isFinite(dur) && dur > 0) {
          const p = (el.currentTime / dur) * 100;
          if (fillRef.current)  fillRef.current.style.width = `${p}%`;
          if (thumbRef.current) thumbRef.current.style.left  = `calc(${p}% - 6px)`;
          if (timeRef.current)  timeRef.current.textContent =
            `${formatTime(el.currentTime)}\u00a0/\u00a0${formatTime(dur)}`;
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ── Seek on progress bar click / drag ─────────────────────────────────────

  const seekFromEvent = useCallback((e: MouseEvent | globalThis.PointerEvent) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  }, [duration, seek]);

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    seekFromEvent(e.nativeEvent);
  }, [seekFromEvent]);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) seekFromEvent(e.nativeEvent);
  }, [seekFromEvent]);

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    // x as percentage of bar width for positioning the popup
    const xPct = pct * 100;
    setContextMenu({ visible: true, x: xPct, pct });
  }, [duration]);

  const onSetLoopPoint = useCallback((point: 'a' | 'b') => {
    if (!duration) return;
    const seconds = contextMenu.pct * duration;
    if (point === 'a') setLoopAAt(seconds);
    else setLoopBAt(seconds);
    setContextMenu(m => ({ ...m, visible: false }));
  }, [contextMenu.pct, duration, setLoopAAt, setLoopBAt]);

  // ── Derived progress percentages ──────────────────────────────────────────

  const pct = duration > 0 ? (position / duration) * 100 : 0;
  const loopAPct = loopA !== null && duration > 0 ? (loopA / duration) * 100 : null;
  const loopBPct = loopB !== null && duration > 0 ? (loopB / duration) * 100 : null;

  const nextSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    setSpeed(SPEEDS[(idx + 1) % SPEEDS.length]);
  };

  const speedLabel = speed === 1 ? '1×' : `${speed}×`;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/75 backdrop-blur-xl border-t border-white/8">

      {/* ── Progress bar ──────────────────────────────────────────────────── */}
      {/* Outer div is the large hit zone; inner track is the visual bar */}
      <div
        ref={progressRef}
        className="relative cursor-pointer group py-1.5"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={onContextMenu}
      >
        {/* Visual track */}
        <div className="relative h-1 bg-white/20 rounded-full overflow-visible">
          {/* A-B region highlight */}
          {loopAPct !== null && loopBPct !== null && (
            <div
              className="absolute top-0 h-full bg-cyan-400/35 rounded-full"
              style={{ left: `${loopAPct}%`, width: `${loopBPct - loopAPct}%` }}
            />
          )}

          {/* Played fill — width driven by RAF via fillRef */}
          <div
            ref={fillRef}
            className="absolute top-0 left-0 h-full bg-white/70 rounded-full"
            style={{ width: `${pct}%` }}
          />

          {/* A marker */}
          {loopAPct !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 w-0.5 bg-cyan-400 rounded-full"
              style={{ left: `${loopAPct}%` }}
            />
          )}

          {/* B marker */}
          {loopBPct !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 w-0.5 bg-cyan-300 rounded-full"
              style={{ left: `${loopBPct}%` }}
            />
          )}

          {/* Thumb — left driven by RAF via thumbRef */}
          <div
            ref={thumbRef}
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${pct}% - 6px)` }}
          />
        </div>

        {/* Right-click context menu */}
        {contextMenu.visible && (
          <div
            className="absolute z-50 bg-black/90 border border-white/15 rounded-lg py-1 shadow-xl"
            style={{ left: Math.min(contextMenu.x, 90) + '%', bottom: '100%', transform: 'translateX(-50%)', marginBottom: 6 }}
          >
            <button
              className="block w-full px-4 py-1.5 text-xs text-left text-white/70 hover:bg-white/10 hover:text-cyan-300 transition-colors whitespace-nowrap"
              onPointerDown={e => { e.stopPropagation(); onSetLoopPoint('a'); }}
            >
              Set Loop Start (A)
            </button>
            <button
              className="block w-full px-4 py-1.5 text-xs text-left text-white/70 hover:bg-white/10 hover:text-cyan-200 transition-colors whitespace-nowrap"
              onPointerDown={e => { e.stopPropagation(); onSetLoopPoint('b'); }}
            >
              Set Loop End (B)
            </button>
          </div>
        )}
      </div>

      {/* ── Main controls row ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 h-14">

        {/* ── Left: Library toggle + Album art + Track info ─────────────────── */}
        <button
          onClick={onToggleLib}
          title="Library"
          className={`p-1.5 rounded transition-colors flex-shrink-0 ${libOpen ? 'text-cyan-400' : 'text-white/40 hover:text-white/70'}`}
        >
          <Library size={16} />
        </button>

        {/* Album art thumbnail */}
        <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-white/8 flex items-center justify-center">
          {track?.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.coverUrl} alt="cover" className="w-full h-full object-cover" />
          ) : (
            <Music size={14} className="text-white/25" />
          )}
        </div>

        {/* Track title + artist */}
        <div className="flex-1 min-w-0">
          {track ? (
            <>
              <p className="text-white/85 text-sm truncate leading-tight">{track.title}</p>
              <p className="text-white/35 text-[11px] truncate">
                {track.artist || track.name}
              </p>
            </>
          ) : (
            <p className="text-white/20 text-sm">No track loaded</p>
          )}
        </div>

        {/* ── Center: Transport + time ──────────────────────────────────────── */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={prev}
            disabled={!track}
            className="p-2 text-white/50 hover:text-white/90 disabled:opacity-25 transition-colors"
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={togglePlay}
            disabled={!track}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-25 transition-colors flex items-center justify-center text-white"
          >
            {playing ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
          </button>

          <button
            onClick={next}
            disabled={!track}
            className="p-2 text-white/50 hover:text-white/90 disabled:opacity-25 transition-colors"
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Time — content driven by RAF via timeRef */}
        <span ref={timeRef} className="text-white/30 text-[11px] tabular-nums flex-shrink-0 hidden sm:block">
          {formatTime(position)}&nbsp;/&nbsp;{formatTime(duration)}
        </span>

        {/* ── Right: Secondary controls ─────────────────────────────────────── */}

        {/* Volume + mute */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={toggleMute}
            title={muted ? 'Unmute' : 'Mute'}
            className="p-1 text-white/40 hover:text-white/70 transition-colors"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range"
            min={0} max={1} step={0.01}
            value={muted ? 0 : volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="w-16 accent-white/70 cursor-pointer"
          />
        </div>

        {/* Shuffle */}
        <button
          onClick={cycleShuffle}
          title={shuffleMode === 'off' ? 'Shuffle off' : 'Shuffle on'}
          className={`p-1.5 rounded transition-colors flex-shrink-0 ${
            shuffleMode !== 'off'
              ? 'text-cyan-400 bg-cyan-400/10'
              : 'text-white/35 hover:text-white/70'
          }`}
        >
          <Shuffle size={15} />
        </button>

        {/* Loop mode */}
        <button
          onClick={cycleLoopMode}
          title={loopMode === 'off' ? 'Loop off' : loopMode === 'track' ? 'Loop track' : 'Loop queue'}
          className={`p-1.5 rounded transition-colors flex-shrink-0 ${
            loopMode !== 'off'
              ? 'text-cyan-400 bg-cyan-400/10'
              : 'text-white/35 hover:text-white/70'
          }`}
        >
          <LoopIcon mode={loopMode} />
        </button>

        {/* Speed */}
        <button
          onClick={nextSpeed}
          title={`Speed: ${speedLabel}`}
          className="px-2 py-1 rounded text-[11px] font-mono text-white/45 hover:text-white/80 hover:bg-white/8 transition-colors min-w-[2.5rem] text-center flex-shrink-0"
        >
          {speedLabel}
        </button>

        {/* Queue toggle */}
        <button
          onClick={onToggleQueue}
          title="Queue"
          className={`p-1.5 rounded transition-colors flex-shrink-0 ${
            queueOpen ? 'text-cyan-400 bg-cyan-400/10' : 'text-white/35 hover:text-white/70'
          }`}
        >
          <ListMusic size={15} />
        </button>

        {/* ── A-B loop controls (collapsed to a button group) ───────────────── */}
        <div className="flex items-center gap-0.5 border-l border-white/10 pl-2 flex-shrink-0">
          <button
            onClick={setLoopA}
            disabled={!track}
            title="Set loop start (A)"
            className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors disabled:opacity-25
              ${loopA !== null ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/35 hover:text-white/70 hover:bg-white/8'}`}
          >
            A{loopA !== null ? ` ${formatTime(loopA)}` : ''}
          </button>

          <button
            onClick={setLoopB}
            disabled={!track}
            title="Set loop end (B)"
            className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors disabled:opacity-25
              ${loopB !== null ? 'bg-cyan-400/20 text-cyan-200' : 'text-white/35 hover:text-white/70 hover:bg-white/8'}`}
          >
            B{loopB !== null ? ` ${formatTime(loopB)}` : ''}
          </button>

          {loopA !== null && loopB !== null && (
            <button
              onClick={toggleLoop}
              title={loopActive ? 'Disable A-B loop' : 'Enable A-B loop'}
              className={`p-1.5 rounded transition-colors ${
                loopActive ? 'text-cyan-400 bg-cyan-400/15' : 'text-white/35 hover:text-white/70 hover:bg-white/8'
              }`}
            >
              <RotateCcw size={13} />
            </button>
          )}

          {(loopA !== null || loopB !== null) && (
            <button
              onClick={clearLoop}
              title="Clear loop points"
              className="text-[10px] text-white/25 hover:text-white/50 transition-colors px-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
