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
  if (mode === 'track') return <Repeat1 size={15} />;
  return <Repeat size={15} />;
}

// Reusable touch-friendly icon button (≥44×44px tap target)
function IconBtn({ onClick, title, active, activeClass, children, disabled }: {
  onClick: () => void;
  title: string;
  active?: boolean;
  activeClass?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex items-center justify-center w-11 h-11 rounded-lg transition-colors shrink-0
        ${active ? (activeClass ?? 'text-cyan-400 bg-cyan-400/10') : 'text-white/40 hover:text-white/80'}
        disabled:opacity-25`}
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

  // ── RAF-driven smooth progress bar ────────────────────────────────────────
  useEffect(() => {
    let rafId: number;
    function tick() {
      const el = getAudioEl();
      if (el && !draggingRef.current) {
        const dur = el.duration;
        if (isFinite(dur) && dur > 0) {
          const p = (el.currentTime / dur) * 100;
          if (fillRef.current)  fillRef.current.style.width = `${p}%`;
          if (thumbRef.current) thumbRef.current.style.left  = `calc(${p}% - 8px)`;
          if (timeRef.current)  timeRef.current.textContent =
            `${formatTime(el.currentTime)}\u00a0/\u00a0${formatTime(dur)}`;
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ── Seek ─────────────────────────────────────────────────────────────────
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
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
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

  const speedLabel = `${speed}×`;

  return (
    <div className="bg-black/75 backdrop-blur-xl border-t border-white/8 pb-safe">

      {/* ── Progress bar (tall hit zone for fat fingers) ─────────────────────── */}
      <div
        ref={progressRef}
        tabIndex={0}
        className="relative cursor-pointer group py-3 px-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={onContextMenu}
        onKeyDown={onSeekBarKeyDown}
      >
        <div className="relative h-1 bg-white/20 rounded-full overflow-visible mx-0">
          {loopAPct !== null && loopBPct !== null && (
            <div className="absolute top-0 h-full bg-cyan-400/35 rounded-full"
              style={{ left: `${loopAPct}%`, width: `${loopBPct - loopAPct}%` }} />
          )}
          <div ref={fillRef} className="absolute top-0 left-0 h-full bg-white/70 rounded-full"
            style={{ width: `${pct}%` }} />
          {loopAPct !== null && (
            <div className="absolute top-1/2 -translate-y-1/2 h-3 w-0.5 bg-cyan-400 rounded-full"
              style={{ left: `${loopAPct}%` }} />
          )}
          {loopBPct !== null && (
            <div className="absolute top-1/2 -translate-y-1/2 h-3 w-0.5 bg-cyan-300 rounded-full"
              style={{ left: `${loopBPct}%` }} />
          )}
          {/* Thumb — larger on mobile for easier touch */}
          <div ref={thumbRef}
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 sm:group-active:opacity-100 transition-opacity"
            style={{ left: `calc(${pct}% - 8px)` }} />
        </div>

        {contextMenu.visible && (
          <div className="absolute z-50 bg-black/90 border border-white/15 rounded-lg py-1 shadow-xl"
            style={{ left: `clamp(0px, ${contextMenu.x}%, calc(100% - 160px))`, bottom: '100%', marginBottom: 6 }}>
            <button className="block w-full px-4 py-2 text-xs text-left text-white/70 hover:bg-white/10 hover:text-cyan-300 transition-colors whitespace-nowrap"
              onPointerDown={e => { e.stopPropagation(); onSetLoopPoint('a'); }}>
              Set Loop Start (A)
            </button>
            <button className="block w-full px-4 py-2 text-xs text-left text-white/70 hover:bg-white/10 hover:text-cyan-200 transition-colors whitespace-nowrap"
              onPointerDown={e => { e.stopPropagation(); onSetLoopPoint('b'); }}>
              Set Loop End (B)
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile: top row — track info + transport ─────────────────────────── */}
      {/* ── Desktop sm+: single merged row ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 sm:px-3 sm:h-14">

        {/* ─── Row 1 (mobile) / left section (desktop) ─────────────────────── */}
        <div className="flex items-center gap-1 px-2 sm:px-0 sm:gap-2 sm:flex-none">

          {/* Library toggle */}
          <IconBtn onClick={onToggleLib} title="Library" active={libOpen} activeClass="text-cyan-400">
            <Library size={18} />
          </IconBtn>

          {/* Album art + track info */}
          <button
            onClick={track ? onOpenNowPlaying : undefined}
            disabled={!track}
            className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none sm:w-48 text-left disabled:cursor-default group/info"
          >
            <div className="w-10 h-10 rounded shrink-0 overflow-hidden bg-white/8 flex items-center justify-center">
              {track?.coverUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={track.coverUrl} alt="cover" className="w-full h-full object-cover" />
                : <Music size={14} className="text-white/25" />
              }
            </div>
            <div className="flex-1 min-w-0">
              {track ? (
                <>
                  <p className="text-white/85 text-sm truncate leading-tight group-hover/info:text-white transition-colors">{track.title}</p>
                  <p className="text-white/35 text-[11px] truncate">{track.artist || track.name}</p>
                </>
              ) : (
                <p className="text-white/20 text-sm">No track loaded</p>
              )}
            </div>
          </button>

          {/* Transport — always visible, center on mobile */}
          <div className="flex items-center gap-0 ml-auto sm:ml-0">
            <button onClick={prev} disabled={!track}
              className="flex items-center justify-center w-11 h-11 text-white/50 hover:text-white/90 disabled:opacity-25 transition-colors">
              <SkipBack size={18} />
            </button>
            <button onClick={togglePlay} disabled={!track}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-25 transition-colors text-white mx-1">
              {playing ? <Pause size={20} /> : <Play size={20} className="translate-x-0.5" />}
            </button>
            <button onClick={next} disabled={!track}
              className="flex items-center justify-center w-11 h-11 text-white/50 hover:text-white/90 disabled:opacity-25 transition-colors">
              <SkipForward size={18} />
            </button>
          </div>
        </div>

        {/* ─── Row 2 (mobile) / right section (desktop) ──────────────────────── */}
        <div className="flex items-center gap-0 px-1 sm:px-0 sm:ml-auto overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">

          {/* Time — always show (compact on mobile) */}
          <span ref={timeRef} className="text-white/30 text-[10px] tabular-nums shrink-0 px-1 sm:text-[11px]">
            {formatTime(position)}&nbsp;/&nbsp;{formatTime(duration)}
          </span>

          {/* Volume + mute */}
          <button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}
            className="flex items-center justify-center w-10 h-10 text-white/40 hover:text-white/70 transition-colors shrink-0">
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input type="range" min={0} max={1} step={0.01}
            value={muted ? 0 : volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="w-16 sm:w-20 accent-white/70 cursor-pointer shrink-0" />

          {/* Shuffle */}
          <IconBtn onClick={cycleShuffle} title={shuffleMode === 'off' ? 'Shuffle off' : 'Shuffle on'}
            active={shuffleMode !== 'off'}>
            <Shuffle size={15} />
          </IconBtn>

          {/* Loop mode */}
          <IconBtn onClick={cycleLoopMode}
            title={loopMode === 'off' ? 'Loop off' : loopMode === 'track' ? 'Loop track' : 'Loop queue'}
            active={loopMode !== 'off'}>
            <LoopIcon mode={loopMode} />
          </IconBtn>

          {/* Speed */}
          <button onClick={nextSpeed} title={`Speed: ${speedLabel}`}
            className="flex items-center justify-center h-10 px-2 rounded text-[11px] font-mono text-white/45 hover:text-white/80 hover:bg-white/8 transition-colors min-w-10 shrink-0">
            {speedLabel}
          </button>

          {/* Queue */}
          <IconBtn onClick={onToggleQueue} title="Queue" active={queueOpen}>
            <ListMusic size={15} />
          </IconBtn>

          {/* EQ */}
          <IconBtn onClick={onToggleEQ} title="EQ (E)" active={eqOpen} activeClass="text-violet-400 bg-violet-400/10">
            <SlidersHorizontal size={15} />
          </IconBtn>

          {/* Shortcuts — hide on mobile (keyboard shortcuts aren't useful there) */}
          <button onClick={onOpenShortcuts} title="Keyboard shortcuts (?)"
            className="hidden sm:flex items-center justify-center w-10 h-10 rounded text-white/25 hover:text-white/60 transition-colors shrink-0 text-xs font-mono">
            ?
          </button>

          {/* A-B loop controls */}
          <div className="flex items-center gap-0 border-l border-white/10 pl-1 ml-1 shrink-0">
            <button onClick={setLoopA} disabled={!track} title="Set loop start (A)"
              className={`flex items-center justify-center h-10 px-2 rounded text-[11px] font-mono font-bold transition-colors disabled:opacity-25
                ${loopA !== null ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/35 hover:text-white/70 hover:bg-white/8'}`}>
              A{loopA !== null ? ` ${formatTime(loopA)}` : ''}
            </button>
            <button onClick={setLoopB} disabled={!track} title="Set loop end (B)"
              className={`flex items-center justify-center h-10 px-2 rounded text-[11px] font-mono font-bold transition-colors disabled:opacity-25
                ${loopB !== null ? 'bg-cyan-400/20 text-cyan-200' : 'text-white/35 hover:text-white/70 hover:bg-white/8'}`}>
              B{loopB !== null ? ` ${formatTime(loopB)}` : ''}
            </button>
            {loopA !== null && loopB !== null && (
              <button onClick={toggleLoop} title={loopActive ? 'Disable A-B loop' : 'Enable A-B loop'}
                className={`flex items-center justify-center w-10 h-10 rounded transition-colors
                  ${loopActive ? 'text-cyan-400 bg-cyan-400/15' : 'text-white/35 hover:text-white/70 hover:bg-white/8'}`}>
                <RotateCcw size={13} />
              </button>
            )}
            {(loopA !== null || loopB !== null) && (
              <button onClick={clearLoop} title="Clear loop points"
                className="flex items-center justify-center w-8 h-10 text-white/25 hover:text-white/50 transition-colors text-[10px]">
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
