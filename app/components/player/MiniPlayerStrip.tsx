'use client';

import { memo, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react';
import { usePlayer, formatTime, getAudioEl } from '../../lib/playerContext';

interface Props {
  onOpenPlayer: () => void;
}

export const MiniPlayerStrip = memo(function MiniPlayerStrip({ onOpenPlayer }: Props) {
  const { state, togglePlay, prev, next } = usePlayer();
  const { tracks, queue, queuePos, playing } = state;
  const currentId = queue[queuePos] ?? null;
  const track = currentId ? tracks.find(t => t.id === currentId) ?? null : null;

  const fillRef = useRef<HTMLDivElement>(null);

  // RAF-driven progress line
  useEffect(() => {
    let rafId: number;
    function tick() {
      const el = getAudioEl();
      if (el && fillRef.current) {
        const dur = el.duration;
        if (isFinite(dur) && dur > 0) {
          fillRef.current.style.width = `${(el.currentTime / dur) * 100}%`;
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  if (!track) return null;

  return (
    <div
      className="relative flex items-center gap-2 px-3 shrink-0"
      style={{
        height: 56,
        background: 'var(--s1)',
        borderTop: '1px solid var(--br)',
      }}
    >
      {/* Progress line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'var(--s5)' }}>
        <div ref={fillRef} className="h-full" style={{ background: 'var(--a)', width: '0%' }} />
      </div>

      {/* Tap target — opens player tab */}
      <button
        onClick={onOpenPlayer}
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
      >
        {/* Cover */}
        <div
          className="w-8 h-8 shrink-0 rounded-md overflow-hidden flex items-center justify-center"
          style={{ background: 'var(--s2)', border: '1px solid var(--br)' }}
        >
          {track.coverUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={track.coverUrl} alt="cover" className="w-full h-full object-cover" />
            : <Music size={12} style={{ color: 'var(--t3)' }} />
          }
        </div>

        {/* Title + time */}
        <div className="flex-1 min-w-0">
          <p className="truncate leading-tight" style={{ color: 'var(--t1)', fontSize: 11.5, fontWeight: 600 }}>
            {track.title}
          </p>
          <p className="truncate" style={{ color: 'var(--t2)', fontSize: 9.5, fontWeight: 500 }}>
            {track.artist || track.name}
          </p>
        </div>
      </button>

      {/* Prev */}
      <button
        onClick={e => { e.stopPropagation(); prev(); }}
        className="flex items-center justify-center w-11 h-11 shrink-0"
        style={{ color: 'var(--t2)' }}
      >
        <SkipBack size={16} />
      </button>

      {/* Play/pause */}
      <button
        onClick={e => { e.stopPropagation(); togglePlay(); }}
        className="flex items-center justify-center w-11 h-11 rounded-full shrink-0"
        style={{
          background: playing ? 'var(--a)' : 'transparent',
          border: '1px solid #f59e0b45',
          color: playing ? '#000' : 'var(--a)',
          boxShadow: '0 0 10px #F59E0B55',
        }}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="translate-x-px" />}
      </button>

      {/* Next */}
      <button
        onClick={e => { e.stopPropagation(); next(); }}
        className="flex items-center justify-center w-11 h-11 shrink-0"
        style={{ color: 'var(--t2)' }}
      >
        <SkipForward size={16} />
      </button>
    </div>
  );
});
