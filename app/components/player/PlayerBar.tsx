'use client';

import React, { useCallback, useRef, useEffect, memo, type PointerEvent } from 'react';
import {
  SkipBack, SkipForward, Play, Pause,
  Volume2, VolumeX, Shuffle, Repeat, Repeat1,
  RotateCcw, Music,
} from 'lucide-react';
import { usePlayer, formatTime, getAudioEl } from '../../lib/playerContext';
import type { LoopMode } from '../../lib/playerContext';
import { SleepTimer } from './SleepTimer';

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

interface PlayerBarProps {
  onOpenNowPlaying: () => void;
  onOpenShortcuts:  () => void;
}

function LoopIcon({ mode }: { mode: LoopMode }) {
  if (mode === 'track') return <Repeat1 size={14} />;
  return <Repeat size={14} />;
}

function ABtn({ onClick, title, active, children, disabled }: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="flex items-center justify-center w-11 h-11 rounded-lg transition-colors shrink-0 disabled:opacity-20"
      style={{
        color: active ? 'var(--a)' : 'var(--t2)',
        background: active ? '#f59e0b18' : 'transparent',
        border: active ? '1px solid #f59e0b45' : '1px solid transparent',
      }}
    >
      {children}
    </button>
  );
}

export const PlayerBar = memo(function PlayerBar({
  onOpenNowPlaying, onOpenShortcuts,
}: PlayerBarProps) {
  const {
    state,
    togglePlay, seek, next, prev,
    setVolume, toggleMute, setSpeed,
    setLoopA, setLoopB, setLoopAAt, setLoopBAt, toggleLoop, clearLoop,
    cycleShuffle, cycleLoopMode,
  } = usePlayer();

  const [seekCtxMenu, setSeekCtxMenu] = React.useState<{ visible: boolean; x: number; y: number; time: number }>({
    visible: false, x: 0, y: 0, time: 0,
  });
  const closeSeekCtx = useCallback(() => setSeekCtxMenu(m => ({ ...m, visible: false })), []);

  const {
    tracks, queue, queuePos, playing,
    position, duration, volume, muted, speed,
    loopA, loopB, loopActive,
    shuffleMode, loopMode,
  } = state;

  const currentId   = queue[queuePos] ?? null;
  const track       = currentId ? tracks.find(t => t.id === currentId) ?? null : null;
  const progressRef = useRef<HTMLDivElement>(null);
  const fillRef     = useRef<HTMLDivElement>(null);
  const thumbRef    = useRef<HTMLDivElement>(null);
  const timeCurrentRef = useRef<HTMLSpanElement>(null);
  const timeTotalRef   = useRef<HTMLSpanElement>(null);
  const draggingRef = useRef(false);
  const volRef      = useRef<HTMLDivElement>(null);
  const volDragging = useRef(false);
  // RAF-driven smooth progress bar
  useEffect(() => {
    let rafId: number;
    function tick() {
      const el = getAudioEl();
      if (el && !draggingRef.current) {
        const dur = el.duration;
        if (isFinite(dur) && dur > 0) {
          const p = (el.currentTime / dur) * 100;
          if (fillRef.current)        fillRef.current.style.width = `${p}%`;
          if (thumbRef.current)       thumbRef.current.style.left = `calc(${p}% - 5px)`;
          if (timeCurrentRef.current) timeCurrentRef.current.textContent = formatTime(el.currentTime);
          if (timeTotalRef.current)   timeTotalRef.current.textContent   = formatTime(dur);
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const seekFromEvent = useCallback((e: globalThis.PointerEvent) => {
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

  const onPointerUp = useCallback(() => { draggingRef.current = false; }, []);

  const setVolFromEvent = useCallback((e: globalThis.PointerEvent) => {
    if (!volRef.current) return;
    const rect = volRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(ratio);
  }, [setVolume]);

  const onVolPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    volDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setVolFromEvent(e.nativeEvent);
  }, [setVolFromEvent]);

  const onVolPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (volDragging.current) setVolFromEvent(e.nativeEvent);
  }, [setVolFromEvent]);

  const onVolPointerUp = useCallback(() => { volDragging.current = false; }, []);

  const onSeekBarKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); e.stopPropagation();
    const el = getAudioEl();
    if (!el) return;
    seek(e.key === 'ArrowRight' ? el.currentTime + 5 : Math.max(0, el.currentTime - 5));
  }, [seek]);

  const onSeekBarContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = ratio * duration;
    const clampedX = Math.min(e.clientX, window.innerWidth - 148);
    const clampedY = Math.min(e.clientY, window.innerHeight - 88);
    setSeekCtxMenu({ visible: true, x: clampedX, y: clampedY, time });
  }, [duration]);

  useEffect(() => {
    if (!seekCtxMenu.visible) return;
    window.addEventListener('pointerdown', closeSeekCtx);
    return () => window.removeEventListener('pointerdown', closeSeekCtx);
  }, [seekCtxMenu.visible, closeSeekCtx]);

  const pct      = duration > 0 ? (position / duration) * 100 : 0;
  const loopAPct = loopA !== null && duration > 0 ? (loopA / duration) * 100 : null;
  const loopBPct = loopB !== null && duration > 0 ? (loopB / duration) * 100 : null;

  const nextSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(speed);
    const safeIdx = idx === -1 ? SPEEDS.indexOf(1) : idx;
    setSpeed(SPEEDS[(safeIdx + 1) % SPEEDS.length]);
  }, [speed, setSpeed]);

  return (
    <div className="pb-safe shrink-0" style={{ background: 'var(--s1)', borderTop: '1px solid var(--br)' }}>

      {/* ── Row 1: Controls (h-14) ── */}
      <div className="flex items-center gap-1 px-2 h-14">

        {/* Left: thumbnail + title */}
        <button
          onClick={track ? onOpenNowPlaying : undefined}
          disabled={!track}
          className="flex items-center gap-2 min-w-0 w-28 sm:w-44 shrink-0 text-left disabled:cursor-default"
        >
          <div
            className="w-10 h-10 shrink-0 flex items-center justify-center overflow-hidden rounded-md"
            style={{ border: '1px solid var(--br)', background: 'var(--s2)' }}
          >
            {track?.coverUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={track.coverUrl} alt="cover" className="w-full h-full object-cover" />
              : <Music size={14} style={{ color: 'var(--t3)' }} />
            }
          </div>
          <div className="flex-1 min-w-0">
            {track ? (
              <>
                <p className="truncate leading-tight" style={{ color: 'var(--t1)', fontSize: 11.5, fontWeight: 600 }}>
                  {track.title}
                </p>
                <p className="truncate" style={{ color: 'var(--t2)', fontSize: 9.5, fontWeight: 500 }}>
                  {track.artist || track.name}
                </p>
              </>
            ) : (
              <p style={{ color: 'var(--t3)', fontSize: 11, fontWeight: 500 }}>No track</p>
            )}
          </div>
        </button>

        {/* Center: transport */}
        <div className="flex-1 flex items-center justify-center gap-0">
          {/* Shuffle */}
          <ABtn onClick={cycleShuffle} title={shuffleMode === 'off' ? 'Shuffle off' : 'Shuffle on'} active={shuffleMode !== 'off'}>
            <Shuffle size={13} />
          </ABtn>

          {/* Prev */}
          <button
            onClick={prev} disabled={!track}
            className="flex items-center justify-center w-11 h-11 rounded-lg transition-colors disabled:opacity-20"
            style={{ color: 'var(--t2)' }}
            onMouseEnter={e => { (e.currentTarget).style.color = 'var(--a)'; }}
            onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t2)'; }}
          >
            <SkipBack size={16} />
          </button>

          {/* Play/pause — amber glow */}
          <button
            onClick={togglePlay}
            disabled={!track}
            className="flex items-center justify-center w-10 h-10 mx-1 rounded-full transition-all disabled:opacity-20"
            style={{
              background: playing ? 'var(--a)' : 'transparent',
              border: '1px solid #f59e0b45',
              color: playing ? '#000' : 'var(--a)',
              boxShadow: '0 0 12px #F59E0B55',
            }}
          >
            {playing ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
          </button>

          {/* Next */}
          <button
            onClick={next} disabled={!track}
            className="flex items-center justify-center w-11 h-11 rounded-lg transition-colors disabled:opacity-20"
            style={{ color: 'var(--t2)' }}
            onMouseEnter={e => { (e.currentTarget).style.color = 'var(--a)'; }}
            onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t2)'; }}
          >
            <SkipForward size={16} />
          </button>

          {/* Loop */}
          <ABtn onClick={cycleLoopMode}
            title={loopMode === 'off' ? 'Loop off' : loopMode === 'track' ? 'Loop track' : 'Loop queue'}
            active={loopMode !== 'off'}>
            <LoopIcon mode={loopMode} />
          </ABtn>
        </div>

        {/* Right: secondary controls */}
        <div className="flex items-center gap-0 shrink-0">

          {/* Speed */}
          <button onClick={nextSpeed} title={`Speed: ${speed}×`}
            className="hidden sm:flex items-center justify-center h-10 px-2 text-[10px] transition-colors min-w-10 shrink-0 rounded-lg"
            style={{
              color: speed !== 1 ? 'var(--a)' : 'var(--t2)',
              background: speed !== 1 ? '#f59e0b18' : 'transparent',
              border: speed !== 1 ? '1px solid #f59e0b45' : '1px solid transparent',
              fontWeight: 700,
            }}>
            {speed}×
          </button>

          {/* A-B loop */}
          <div className="hidden sm:flex items-center gap-0 px-1 mx-1 shrink-0" style={{ borderLeft: '1px solid var(--br)', borderRight: '1px solid var(--br)' }}>
            <button onClick={setLoopA} disabled={!track} title="Set loop start (A)"
              className="flex items-center justify-center h-10 px-2 text-[10px] font-bold transition-colors disabled:opacity-20 rounded"
              style={{
                color: loopA !== null ? 'var(--a)' : 'var(--t2)',
                background: loopA !== null ? '#f59e0b18' : 'transparent',
                border: loopA !== null ? '1px solid #f59e0b45' : '1px solid transparent',
              }}>
              A{loopA !== null ? ` ${formatTime(loopA)}` : ''}
            </button>
            <button onClick={setLoopB} disabled={!track} title="Set loop end (B)"
              className="flex items-center justify-center h-10 px-2 text-[10px] font-bold transition-colors disabled:opacity-20 rounded"
              style={{
                color: loopB !== null ? 'var(--a)' : 'var(--t2)',
                background: loopB !== null ? '#f59e0b18' : 'transparent',
                border: loopB !== null ? '1px solid #f59e0b45' : '1px solid transparent',
              }}>
              B{loopB !== null ? ` ${formatTime(loopB)}` : ''}
            </button>
            {loopA !== null && loopB !== null && (
              <button onClick={toggleLoop} title={loopActive ? 'Disable A-B loop' : 'Enable A-B loop'}
                className="flex items-center justify-center w-10 h-10 transition-colors rounded"
                style={{
                  color: loopActive ? 'var(--a)' : 'var(--t2)',
                  background: loopActive ? '#f59e0b18' : 'transparent',
                }}>
                <RotateCcw size={12} />
              </button>
            )}
            {(loopA !== null || loopB !== null) && (
              <button onClick={clearLoop} title="Clear loop points"
                className="flex items-center justify-center w-8 h-10 text-[9px] transition-colors"
                style={{ color: 'var(--t2)' }}>
                ✕
              </button>
            )}
          </div>

          {/* Volume mute */}
          <button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}
            className="hidden sm:flex items-center justify-center w-10 h-10 transition-colors shrink-0"
            style={{ color: 'var(--t2)' }}>
            {(muted || volume === 0) ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>

          {/* Volume slider */}
          <div
            ref={volRef}
            className="hidden sm:flex relative w-16 h-10 items-center cursor-pointer shrink-0 group"
            onPointerDown={onVolPointerDown}
            onPointerMove={onVolPointerMove}
            onPointerUp={onVolPointerUp}
          >
            <div className="relative w-full h-[3px] rounded-full" style={{ background: 'var(--s5)' }}>
              <div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{ width: `${(muted ? 0 : volume) * 100}%`, background: 'var(--a)' }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${(muted ? 0 : volume) * 100}% - 4px)`, background: 'var(--a)' }}
              />
            </div>
          </div>

          {/* Sleep timer — desktop only; mobile has its own row below */}
          <div className="hidden sm:flex ml-1 pl-1" style={{ borderLeft: '1px solid var(--br)' }}>
            <SleepTimer />
          </div>

          {/* Keyboard shortcuts (desktop only) */}
          <button onClick={onOpenShortcuts} title="Keyboard shortcuts (?)"
            className="hidden sm:flex items-center justify-center w-10 h-10 text-[10px] transition-colors shrink-0"
            style={{ color: 'var(--t2)', fontWeight: 700 }}>
            ?
          </button>
        </div>
      </div>

      {/* ── Row 2: Seek bar (h-7) ── */}
      <div className="flex items-center gap-2 px-3 pb-1.5">
        {/* Current time */}
        <span
          ref={timeCurrentRef}
          className="tabular-nums text-[10px] shrink-0 w-10 text-right"
          style={{ color: 'var(--t2)', fontWeight: 400 }}
        >
          {formatTime(position)}
        </span>

        {/* Seek track */}
        <div
          ref={progressRef}
          tabIndex={0}
          className="flex-1 relative cursor-pointer group py-2 focus:outline-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onSeekBarKeyDown}
          onContextMenu={onSeekBarContextMenu}
        >
          <div className="relative h-[3px] group-hover:h-[4px] transition-all" style={{ background: 'var(--s5)' }}>
            {/* A-B region */}
            {loopAPct !== null && loopBPct !== null && (
              <div
                className="absolute top-0 h-full"
                style={{ left: `${loopAPct}%`, width: `${loopBPct - loopAPct}%`, background: 'rgba(245,158,11,0.2)' }}
              />
            )}
            {/* Fill */}
            <div ref={fillRef} className="absolute top-0 left-0 h-full" style={{ width: `${pct}%`, background: 'var(--a)' }} />
            {/* Loop markers */}
            {loopAPct !== null && (
              <div className="absolute top-1/2 -translate-y-1/2 w-px h-3" style={{ left: `${loopAPct}%`, background: 'var(--a)' }} />
            )}
            {loopBPct !== null && (
              <div className="absolute top-1/2 -translate-y-1/2 w-px h-3" style={{ left: `${loopBPct}%`, background: 'var(--a)' }} />
            )}
            {/* Thumb */}
            <div
              ref={thumbRef}
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${pct}% - 5px)`, background: 'var(--a)' }}
            />
          </div>
        </div>

        {/* Total time */}
        <span
          ref={timeTotalRef}
          className="tabular-nums text-[10px] shrink-0 w-10"
          style={{ color: 'var(--t2)', fontWeight: 400 }}
        >
          {formatTime(duration)}
        </span>
      </div>

      {/* ── Row 3: Mobile secondary controls ── */}
      <div className="sm:hidden flex items-center justify-end px-3 pb-2">
        <SleepTimer />
      </div>

      {/* ── Seek bar A/B context menu ── */}
      {seekCtxMenu.visible && (
        <div
          className="fixed z-50 py-1 shadow-xl rounded-lg overflow-hidden"
          style={{ left: seekCtxMenu.x, top: seekCtxMenu.y, background: 'var(--s2)', border: '1px solid var(--br)' }}
        >
          {[
            { label: `Set A — ${formatTime(seekCtxMenu.time)}`, action: () => { setLoopAAt(seekCtxMenu.time); closeSeekCtx(); } },
            { label: `Set B — ${formatTime(seekCtxMenu.time)}`, action: () => { setLoopBAt(seekCtxMenu.time); closeSeekCtx(); } },
          ].map(({ label, action }) => (
            <button
              key={label}
              className="block w-full px-4 py-2.5 text-left transition-colors whitespace-nowrap touch-manipulation"
              style={{ color: 'var(--t2)', fontSize: 11, fontWeight: 600 }}
              onPointerDown={e => { e.stopPropagation(); action(); }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--t1)'; (e.target as HTMLElement).style.background = 'var(--s3)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--t2)'; (e.target as HTMLElement).style.background = ''; }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
