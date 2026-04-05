'use client';

import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Play, X } from 'lucide-react';
import { usePlayer, formatTime } from '../../lib/playerContext';

export interface TrackLibraryHandle {
  focusSearch(): void;
}

export const TrackLibrary = forwardRef<TrackLibraryHandle>(function TrackLibrary(_, ref) {
  const { state, playNow, playNext, addToQueue } = usePlayer();
  const { tracks, queue, queuePos, playing } = state;
  const currentId = queue[queuePos] ?? null;
  const parentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useImperativeHandle(ref, () => ({
    focusSearch: () => searchRef.current?.focus(),
  }));

  const filtered = query
    ? tracks.filter(t =>
        [t.title, t.artist, t.album, t.name].some(s =>
          s.toLowerCase().includes(query.toLowerCase())
        )
      )
    : tracks;

  const [menu, setMenu] = useState<{ visible: boolean; x: number; y: number; trackId: string }>({
    visible: false, x: 0, y: 0, trackId: '',
  });

  const closeMenu = useCallback(() => setMenu(m => ({ ...m, visible: false })), []);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = useCallback((x: number, y: number, trackId: string) => {
    const clampedX = Math.min(x, window.innerWidth - 164);
    const clampedY = Math.min(y, window.innerHeight - 120);
    setMenu({ visible: true, x: clampedX, y: clampedY, trackId });
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (!menu.visible) return;
    window.addEventListener('pointerdown', closeMenu);
    return () => window.removeEventListener('pointerdown', closeMenu);
  }, [menu.visible, closeMenu]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 5,
  });

  if (tracks.length === 0) return null;

  return (
    <div className="flex-1 min-h-0 flex flex-col">

      {/* ── Search ── */}
      <div className="px-3 py-2 relative">
        <div className="flex items-center border-b" style={{ borderColor: 'rgba(0,212,255,0.2)' }}>
          <span className="font-mono text-[10px] shrink-0 pr-1.5" style={{ color: 'var(--nx-cyan-dim)' }}>
            QUERY ›
          </span>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="search tracks..."
            className="flex-1 bg-transparent text-[11px] py-1 focus:outline-none font-mono"
            style={{
              color: 'var(--nx-text)',
              caretColor: 'var(--nx-cyan)',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="shrink-0 transition-colors"
              style={{ color: 'var(--nx-text-dim)' }}
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* ── Count line ── */}
      <div className="px-3 pb-1 flex items-center justify-between">
        <span className="font-mono uppercase tracking-widest text-[9px]" style={{ color: 'var(--nx-cyan-dim)' }}>
          {query ? `${filtered.length} RESULTS` : `${tracks.length} FILES LOADED`}
        </span>
        {query && (
          <span className="font-mono text-[9px]" style={{ color: 'var(--nx-text-dim)' }}>
            {filtered.length}/{tracks.length}
          </span>
        )}
      </div>

      {/* ── Track list ── */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(vItem => {
            const track = filtered[vItem.index];
            const isCurrent = track.id === currentId;
            const idx = String(vItem.index + 1).padStart(3, '0');

            return (
              <div
                key={track.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${vItem.start}px)`,
                  width: '100%',
                  height: vItem.size,
                  borderLeft: isCurrent
                    ? '2px solid var(--nx-cyan)'
                    : '2px solid transparent',
                  background: isCurrent ? 'var(--nx-bg-raised)' : undefined,
                }}
                onClick={() => playNow(track.id)}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  const { clientX, clientY } = e;
                  const tid = track.id;
                  longPressTimer.current = setTimeout(() => {
                    longPressTimer.current = null;
                    openMenu(clientX, clientY, tid);
                  }, 500);
                }}
                onPointerMove={cancelLongPress}
                onPointerUp={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  cancelLongPress();
                  openMenu(e.clientX, e.clientY, track.id);
                }}
                className="flex items-center gap-2 px-2 cursor-pointer transition-colors group"
                onMouseEnter={e => {
                  if (!isCurrent) {
                    (e.currentTarget as HTMLDivElement).style.borderLeftColor = 'var(--nx-red)';
                    (e.currentTarget as HTMLDivElement).style.background = '#06101a';
                  }
                }}
                onMouseLeave={e => {
                  if (!isCurrent) {
                    (e.currentTarget as HTMLDivElement).style.borderLeftColor = 'transparent';
                    (e.currentTarget as HTMLDivElement).style.background = '';
                  }
                }}
              >
                {/* Index */}
                <span className="font-mono text-[9px] shrink-0 w-7 text-right" style={{ color: 'var(--nx-cyan-dim)' }}>
                  T-{idx}
                </span>

                {/* Status dot */}
                <span
                  className={isCurrent && playing ? 'animate-nx-blink' : ''}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: track.error ? 'var(--nx-red)' : isCurrent ? 'var(--nx-cyan)' : 'var(--nx-cyan-dim)',
                    flexShrink: 0,
                  }}
                />

                {/* Playing indicator */}
                <div className="w-5 shrink-0 flex items-center justify-center">
                  {isCurrent && playing ? (
                    <span className="flex gap-px items-end h-3.5">
                      {[1, 2, 3].map(i => (
                        <span
                          key={i}
                          className="w-px rounded-full animate-bounce"
                          style={{
                            height: `${50 + i * 15}%`,
                            animationDelay: `${i * 100}ms`,
                            background: 'var(--nx-cyan)',
                          }}
                        />
                      ))}
                    </span>
                  ) : isCurrent ? (
                    <Play size={10} style={{ color: 'var(--nx-cyan)', fill: 'var(--nx-cyan)' }} />
                  ) : null}
                </div>

                {/* Title + artist */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] truncate leading-tight" style={{ color: isCurrent ? 'var(--nx-cyan)' : 'var(--nx-text)' }}>
                    {track.title}
                  </p>
                  <p className="font-mono text-[9px] truncate" style={{ color: 'var(--nx-text-dim)' }}>
                    {track.artist || track.name}
                  </p>
                </div>

                {/* Duration */}
                {track.duration > 0 && (
                  <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--nx-cyan-dim)' }}>
                    {formatTime(track.duration)}
                  </span>
                )}

                {/* Error badge */}
                {track.error && (
                  <span className="font-mono text-[9px] px-1 shrink-0" style={{ color: 'var(--nx-red)', border: '1px solid var(--nx-red)', opacity: 0.8 }}>
                    ERR
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Context menu ── */}
      {menu.visible && (
        <div
          className="fixed z-50 py-1 shadow-xl"
          style={{
            left: menu.x,
            top: menu.y,
            background: 'var(--nx-bg-panel)',
            border: '1px solid var(--nx-border-active)',
          }}
        >
          {[
            { label: 'PLAY NOW',     action: () => { playNow(menu.trackId);    closeMenu(); } },
            { label: 'PLAY NEXT',    action: () => { playNext(menu.trackId);   closeMenu(); } },
            { label: 'ADD TO QUEUE', action: () => { addToQueue(menu.trackId); closeMenu(); } },
          ].map(({ label, action }) => (
            <button
              key={label}
              className="block w-full px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-widest transition-colors whitespace-nowrap touch-manipulation"
              style={{ color: 'var(--nx-text-dim)' }}
              onPointerDown={e => { e.stopPropagation(); action(); }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-cyan)'; (e.target as HTMLElement).style.background = 'var(--nx-bg-raised)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; (e.target as HTMLElement).style.background = ''; }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
