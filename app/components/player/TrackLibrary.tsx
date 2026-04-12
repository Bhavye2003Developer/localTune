'use client';

import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Play, X, Search } from 'lucide-react';
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
    estimateSize: () => 64,
    overscan: 5,
  });

  if (tracks.length === 0) return null;

  return (
    <div className="flex-1 min-h-0 flex flex-col">

      {/* Search */}
      <div className="px-3 py-2">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md"
          style={{ background: 'var(--s2)', border: '1px solid var(--br)' }}
        >
          <Search size={11} style={{ color: 'var(--t3)', flexShrink: 0 }} />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tracks..."
            className="flex-1 bg-transparent focus:outline-none"
            style={{
              color: 'var(--t1)',
              fontSize: 11,
              fontWeight: 500,
              caretColor: 'var(--a)',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="shrink-0 transition-colors"
              style={{ color: 'var(--t3)' }}
              onMouseEnter={e => { (e.currentTarget).style.color = 'var(--t2)'; }}
              onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t3)'; }}
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Count */}
      <div className="px-3 pb-1">
        <span style={{ color: 'var(--t3)', fontSize: 9, fontWeight: 500 }}>
          {query ? `${filtered.length} of ${tracks.length} tracks` : `${tracks.length} tracks`}
        </span>
      </div>

      {/* Track list */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(vItem => {
            const track = filtered[vItem.index];
            const isCurrent = track.id === currentId;

            return (
              <div
                key={track.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${vItem.start}px)`,
                  width: '100%',
                  height: vItem.size,
                  borderLeft: isCurrent ? '2px solid var(--a)' : '2px solid transparent',
                  background: isCurrent ? '#f59e0b08' : undefined,
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
                className="flex flex-col justify-center gap-0.5 px-3 cursor-pointer transition-colors"
                onMouseEnter={e => {
                  if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = 'var(--s3)';
                }}
                onMouseLeave={e => {
                  if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = '';
                }}
              >
                {/* Row 1: indicator + title + duration */}
                <div className="flex items-center gap-2">
                  <div className="w-4 shrink-0 flex items-center justify-center">
                    {isCurrent && playing ? (
                      <span className="flex gap-px items-end h-3.5">
                        {[1, 2, 3].map(i => (
                          <span
                            key={i}
                            className="w-px rounded-full animate-bounce"
                            style={{
                              height: `${50 + i * 15}%`,
                              animationDelay: `${i * 100}ms`,
                              background: 'var(--green)',
                            }}
                          />
                        ))}
                      </span>
                    ) : isCurrent ? (
                      <Play size={9} style={{ color: 'var(--a)', fill: 'var(--a)' }} />
                    ) : null}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="truncate leading-tight"
                      style={{ color: isCurrent ? 'var(--a)' : 'var(--t1)', fontSize: 11.5, fontWeight: 600 }}
                    >
                      {track.title}
                    </p>
                    <p className="truncate" style={{ color: 'var(--t2)', fontSize: 9.5, fontWeight: 500 }}>
                      {track.artist || track.name}
                    </p>
                  </div>

                  {track.duration > 0 && (
                    <span className="shrink-0" style={{ color: 'var(--t2)', fontSize: 9, fontWeight: 400 }}>
                      {formatTime(track.duration)}
                    </span>
                  )}

                  {track.error && (
                    <span
                      className="px-1 rounded shrink-0"
                      style={{ color: 'var(--orange)', border: '1px solid var(--orange)', fontSize: 9, fontWeight: 700, opacity: 0.8 }}
                    >
                      ERR
                    </span>
                  )}
                </div>

                {/* Row 2: chips */}
                <div className="flex items-center gap-1 pl-6">
                  <span
                    className="px-1.5 py-px rounded"
                    style={{ color: 'var(--a)', border: '1px solid #f59e0b30', background: '#f59e0b10', fontSize: 7, fontWeight: 700, textTransform: 'uppercase' }}
                  >
                    {track.type.split('/')[1]?.toUpperCase() ?? '?'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Context menu */}
      {menu.visible && (
        <div
          className="fixed z-50 py-1 shadow-xl rounded-lg overflow-hidden"
          style={{
            left: menu.x,
            top: menu.y,
            background: 'var(--s2)',
            border: '1px solid var(--br)',
          }}
        >
          {[
            { label: 'Play now',     action: () => { playNow(menu.trackId);    closeMenu(); } },
            { label: 'Play next',    action: () => { playNext(menu.trackId);   closeMenu(); } },
            { label: 'Add to queue', action: () => { addToQueue(menu.trackId); closeMenu(); } },
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
