'use client';

import { useCallback, useRef, useState, useEffect, memo, type MouseEvent, type PointerEvent } from 'react';
import {
  SkipBack, SkipForward, Play, Pause,
  Volume2, VolumeX, Shuffle, Repeat, Repeat1,
  Library, RotateCcw, ListMusic, Music, SlidersHorizontal,
} from 'lucide-react';
import { usePlayer, formatTime, getAudioEl } from '../../lib/playerContext';
import type { LoopMode } from '../../lib/playerContext';

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

interface PlayerBarProps {
  libOpen: boolean;
  onToggleLib: () => void;
  queueOpen: boolean;
  onToggleQueue: () => void;
  onOpenNowPlaying: () => void;
  onOpenShortcuts: () => void;
  eqOpen: boolean;
  onToggleEQ: () => void;
}

function LoopIcon({ mode }: { mode: LoopMode }) {
  if (mode === 'track') return <Repeat1 size={14} />;
  return <Repeat size={14} />;
}

function NxBtn({ onClick, title, active, activeRed, children, disabled }: {
  onClick: () => void;
  title: string;
  active?: boolean;
  activeRed?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="flex items-center justify-center w-11 h-11 transition-colors shrink-0 disabled:opacity-20"
      style={{
        color: active
          ? (activeRed ? 'var(--nx-red)' : 'var(--nx-cyan)')
          : 'var(--nx-text-dim)',
        background: active
          ? (activeRed ? 'rgba(255,0,60,0.08)' : 'rgba(0,212,255,0.06)')
          : 'transparent',
      }}
    >
      {children}
    </button>
  );
}

export const PlayerBar = memo(function PlayerBar({
  libOpen, onToggleLib, queueOpen, onToggleQueue,
  onOpenNowPlaying, onOpenShortcuts, eqOpen, onToggleEQ,
}: PlayerBarProps) {
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

  const currentId   = queue[queuePos] ?? null;
  const track       = currentId ? tracks.find(t => t.id === currentId) ?? null : null;
  const progressRef = useRef<HTMLDivElement>(null);
  const fillRef     = useRef<HTMLDivElement>(null);
  const thumbRef    = useRef<HTMLDivElement>(null);
  const timeRef     = useRef<HTMLSpanElement>(null);
  const sysIdRef    = useRef<HTMLSpanElement>(null);
  const draggingRef = useRef(false);
  const prevTrackId = useRef<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; pct: number }>({
    visible: false, x: 0, pct: 0,
  });

  // Flicker SYS-ID on track change
  useEffect(() => {
    if (currentId && currentId !== prevTrackId.current) {
      prevTrackId.current = currentId;
      const el = sysIdRef.current;
      if (el) {
        el.classList.remove('animate-nx-flicker');
        void el.offsetWidth;
        el.classList.add('animate-nx-flicker');
      }
    }
  }, [currentId]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu.visible) return;
    const close = () => setContextMenu(m => ({ ...m, visible: false }));
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [contextMenu.visible]);

  // RAF-driven smooth progress bar
  useEffect(() => {
    let rafId: number;
    function tick() {
      const el = getAudioEl();
      if (el && !draggingRef.current) {
        const dur = el.duration;
        if (isFinite(dur) && dur > 0) {
          const p = (el.currentTime / dur) * 100;
          if (fillRef.current)  fillRef.current.style.width = `${p}%`;
          if (thumbRef.current) thumbRef.current.style.left = `calc(${p}% - 5px)`;
          if (timeRef.current)  timeRef.current.textContent =
            `${formatTime(el.currentTime)}\u00a0/\u00a0${formatTime(dur)}`;
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

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

  const onPointerUp = useCallback(() => { draggingRef.current = false; }, []);

  const onContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setContextMenu({ visible: true, x: pct * 100, pct });
  }, [duration]);

  const onSetLoopPoint = useCallback((point: 'a' | 'b') => {
    if (!duration) return;
    const seconds = contextMenu.pct * duration;
    if (point === 'a') setLoopAAt(seconds); else setLoopBAt(seconds);
    setContextMenu(m => ({ ...m, visible: false }));
  }, [contextMenu.pct, duration, setLoopAAt, setLoopBAt]);

  const onSeekBarKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); e.stopPropagation();
    const el = getAudioEl();
    if (!el) return;
    seek(e.key === 'ArrowRight' ? el.currentTime + 5 : Math.max(0, el.currentTime - 5));
  }, [seek]);

  const pct      = duration > 0 ? (position / duration) * 100 : 0;
  const loopAPct = loopA !== null && duration > 0 ? (loopA / duration) * 100 : null;
  const loopBPct = loopB !== null && duration > 0 ? (loopB / duration) * 100 : null;

  const nextSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(speed);
    const safeIdx = idx === -1 ? SPEEDS.indexOf(1) : idx;
    setSpeed(SPEEDS[(safeIdx + 1) % SPEEDS.length]);
  }, [speed, setSpeed]);

  return (
    <div className="pb-safe" style={{ background: 'var(--nx-bg-panel)', borderTop: '1px solid var(--nx-cyan)' }}>

      {/* ── Progress bar ── */}
      <div
        ref={progressRef}
        tabIndex={0}
        className="relative cursor-pointer group py-2.5 px-0 focus:outline-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={onContextMenu}
        onKeyDown={onSeekBarKeyDown}
      >
        <div className="relative h-[3px] group-hover:h-[4px] transition-all" style={{ background: 'rgba(0,212,255,0.1)' }}>

          {/* Tick marks at 10% intervals */}
          {[10,20,30,40,50,60,70,80,90].map(p => (
            <div
              key={p}
              className="absolute top-1/2 -translate-y-1/2 w-px"
              style={{ left: `${p}%`, height: 6, background: 'rgba(0,212,255,0.18)' }}
            />
          ))}

          {/* A-B region */}
          {loopAPct !== null && loopBPct !== null && (
            <div
              className="absolute top-0 h-full"
              style={{ left: `${loopAPct}%`, width: `${loopBPct - loopAPct}%`, background: 'rgba(0,212,255,0.2)' }}
            />
          )}

          {/* Fill */}
          <div ref={fillRef} className="absolute top-0 left-0 h-full" style={{ width: `${pct}%`, background: 'var(--nx-cyan)' }} />

          {/* Loop markers */}
          {loopAPct !== null && (
            <div className="absolute top-1/2 -translate-y-1/2 w-px h-3" style={{ left: `${loopAPct}%`, background: 'var(--nx-cyan)' }} />
          )}
          {loopBPct !== null && (
            <div className="absolute top-1/2 -translate-y-1/2 w-px h-3" style={{ left: `${loopBPct}%`, background: 'var(--nx-cyan)' }} />
          )}

          {/* Diamond thumb */}
          <div
            ref={thumbRef}
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${pct}% - 5px)`, background: 'var(--nx-red)' }}
          />
        </div>

        {/* Context menu */}
        {contextMenu.visible && (
          <div
            className="absolute z-50 py-1 shadow-xl"
            style={{
              left: `clamp(0px, ${contextMenu.x}%, calc(100% - 160px))`,
              bottom: '100%',
              marginBottom: 4,
              background: 'var(--nx-bg-panel)',
              border: '1px solid var(--nx-border-active)',
            }}
          >
            {[
              { label: 'SET LOOP START (A)', point: 'a' as const },
              { label: 'SET LOOP END (B)',   point: 'b' as const },
            ].map(({ label, point }) => (
              <button
                key={point}
                className="block w-full px-4 py-2 font-mono text-[9px] uppercase tracking-widest text-left transition-colors whitespace-nowrap"
                style={{ color: 'var(--nx-text-dim)' }}
                onPointerDown={e => { e.stopPropagation(); onSetLoopPoint(point); }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-cyan)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1 sm:px-2 sm:h-14">

        {/* Left — track info + transport */}
        <div className="flex items-center gap-1 px-2 sm:px-0 sm:gap-1.5 sm:flex-none">

          <NxBtn onClick={onToggleLib} title="Library" active={libOpen}>
            <Library size={16} />
          </NxBtn>

          {/* Album art + info */}
          <button
            onClick={track ? onOpenNowPlaying : undefined}
            disabled={!track}
            className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none sm:w-44 text-left disabled:cursor-default"
          >
            <div
              className="w-9 h-9 shrink-0 flex items-center justify-center overflow-hidden"
              style={{ border: '1px solid rgba(0,212,255,0.2)', background: 'var(--nx-bg-raised)' }}
            >
              {track?.coverUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={track.coverUrl} alt="cover" className="w-full h-full object-cover" />
                : <Music size={12} style={{ color: 'var(--nx-cyan-dim)' }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              {track ? (
                <>
                  <span ref={sysIdRef} className="block font-mono uppercase tracking-widest text-[8px]" style={{ color: 'var(--nx-cyan-dim)' }}>
                    SYS-ID
                  </span>
                  <p className="text-[12px] truncate leading-tight" style={{ color: 'var(--nx-text)' }}>{track.title}</p>
                  <p className="font-mono text-[9px] truncate" style={{ color: 'var(--nx-text-dim)' }}>{track.artist || track.name}</p>
                </>
              ) : (
                <p className="font-mono text-[10px]" style={{ color: 'var(--nx-text-dim)' }}>NO TRACK LOADED</p>
              )}
            </div>
          </button>

          {/* Transport */}
          <div className="flex items-center gap-0 ml-auto sm:ml-0">
            <button onClick={prev} disabled={!track}
              className="flex items-center justify-center w-11 h-11 transition-colors disabled:opacity-20"
              style={{ color: 'var(--nx-text-dim)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--nx-cyan)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--nx-text-dim)'; }}
            >
              <SkipBack size={16} />
            </button>

            {/* Play button — clip-path diagonal */}
            <button
              onClick={togglePlay}
              disabled={!track}
              className="flex items-center justify-center w-10 h-10 mx-1 transition-all disabled:opacity-20 animate-nx-glow-pulse"
              style={{
                background: playing ? 'var(--nx-cyan)' : 'transparent',
                border: '1px solid rgba(0,212,255,0.5)',
                color: playing ? 'var(--nx-bg-deep)' : 'var(--nx-cyan)',
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
              }}
            >
              {playing ? <Pause size={16} /> : <Play size={16} className="translate-x-0.5" />}
            </button>

            <button onClick={next} disabled={!track}
              className="flex items-center justify-center w-11 h-11 transition-colors disabled:opacity-20"
              style={{ color: 'var(--nx-text-dim)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--nx-cyan)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--nx-text-dim)'; }}
            >
              <SkipForward size={16} />
            </button>
          </div>
        </div>

        {/* Right — secondary controls */}
        <div className="flex items-center gap-0 px-1 sm:px-0 sm:ml-auto overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">

          {/* Time */}
          <span ref={timeRef} className="font-mono tabular-nums text-[10px] shrink-0 px-1.5"
            style={{ color: 'var(--nx-cyan)' }}>
            {formatTime(position)}&nbsp;/&nbsp;{formatTime(duration)}
          </span>

          {/* Volume */}
          <button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}
            className="flex items-center justify-center w-10 h-10 transition-colors shrink-0"
            style={{ color: 'var(--nx-text-dim)' }}>
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          <input type="range" min={0} max={1} step={0.01}
            value={muted ? 0 : volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="w-14 sm:w-16 cursor-pointer shrink-0"
            style={{ accentColor: 'var(--nx-cyan)' }} />

          <NxBtn onClick={cycleShuffle} title={shuffleMode === 'off' ? 'Shuffle off' : 'Shuffle on'} active={shuffleMode !== 'off'}>
            <Shuffle size={13} />
          </NxBtn>

          <NxBtn onClick={cycleLoopMode}
            title={loopMode === 'off' ? 'Loop off' : loopMode === 'track' ? 'Loop track' : 'Loop queue'}
            active={loopMode !== 'off'}>
            <LoopIcon mode={loopMode} />
          </NxBtn>

          {/* Speed */}
          <button onClick={nextSpeed} title={`Speed: ${speed}×`}
            className="flex items-center justify-center h-10 px-2 font-mono text-[10px] transition-colors min-w-10 shrink-0"
            style={{ color: speed !== 1 ? 'var(--nx-cyan)' : 'var(--nx-text-dim)' }}>
            {speed}×
          </button>

          <NxBtn onClick={onToggleQueue} title="Queue" active={queueOpen}>
            <ListMusic size={13} />
          </NxBtn>

          <NxBtn onClick={onToggleEQ} title="EQ (E)" active={eqOpen} activeRed>
            <SlidersHorizontal size={13} />
          </NxBtn>

          <button onClick={onOpenShortcuts} title="Keyboard shortcuts (?)"
            className="hidden sm:flex items-center justify-center w-10 h-10 font-mono text-[10px] transition-colors shrink-0"
            style={{ color: 'var(--nx-text-dim)' }}>
            ?
          </button>

          {/* A-B loop */}
          <div className="flex items-center gap-0 pl-1 ml-1 shrink-0" style={{ borderLeft: '1px solid var(--nx-border)' }}>
            <button onClick={setLoopA} disabled={!track} title="Set loop start (A)"
              className="flex items-center justify-center h-10 px-2 font-mono text-[10px] font-bold transition-colors disabled:opacity-20"
              style={{ color: loopA !== null ? 'var(--nx-cyan)' : 'var(--nx-text-dim)', background: loopA !== null ? 'rgba(0,212,255,0.08)' : '' }}>
              A{loopA !== null ? ` ${formatTime(loopA)}` : ''}
            </button>
            <button onClick={setLoopB} disabled={!track} title="Set loop end (B)"
              className="flex items-center justify-center h-10 px-2 font-mono text-[10px] font-bold transition-colors disabled:opacity-20"
              style={{ color: loopB !== null ? 'var(--nx-cyan)' : 'var(--nx-text-dim)', background: loopB !== null ? 'rgba(0,212,255,0.08)' : '' }}>
              B{loopB !== null ? ` ${formatTime(loopB)}` : ''}
            </button>
            {loopA !== null && loopB !== null && (
              <button onClick={toggleLoop} title={loopActive ? 'Disable A-B loop' : 'Enable A-B loop'}
                className="flex items-center justify-center w-10 h-10 transition-colors"
                style={{ color: loopActive ? 'var(--nx-cyan)' : 'var(--nx-text-dim)', background: loopActive ? 'rgba(0,212,255,0.08)' : '' }}>
                <RotateCcw size={12} />
              </button>
            )}
            {(loopA !== null || loopB !== null) && (
              <button onClick={clearLoop} title="Clear loop points"
                className="flex items-center justify-center w-8 h-10 font-mono text-[9px] transition-colors"
                style={{ color: 'var(--nx-text-dim)' }}>
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
