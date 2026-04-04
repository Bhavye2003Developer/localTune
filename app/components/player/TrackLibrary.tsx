'use client';

import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Music, Play, Search, X } from 'lucide-react';
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
      {/* Search bar */}
      <div className="px-3 py-1.5 relative">
        <Search size={11} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full bg-white/6 border border-white/10 rounded-md text-xs text-white/70 placeholder-white/25 pl-6 pr-6 py-1 focus:outline-none focus:border-white/25 focus:bg-white/8 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
          >
            <X size={11} />
          </button>
        )}
      </div>

      <div className="px-3 py-1 text-white/30 text-[10px] tracking-widest uppercase">
        {query ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}` : `Library — ${tracks.length} track${tracks.length !== 1 ? 's' : ''}`}
      </div>

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
                }}
                onClick={() => playNow(track.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ visible: true, x: e.clientX, y: e.clientY, trackId: track.id });
                }}
                className={`flex items-center gap-2.5 px-3 cursor-pointer transition-colors group
                  ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0">
                  {isCurrent && playing ? (
                    <span className="flex gap-0.5 items-end h-4">
                      {[1, 2, 3].map(i => (
                        <span
                          key={i}
                          className="w-0.5 bg-cyan-400 rounded-full animate-bounce"
                          style={{ height: `${50 + i * 15}%`, animationDelay: `${i * 100}ms` }}
                        />
                      ))}
                    </span>
                  ) : isCurrent ? (
                    <Play size={12} className="text-cyan-400 fill-cyan-400" />
                  ) : (
                    <Music size={12} className="text-white/25 group-hover:text-white/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate leading-tight ${isCurrent ? 'text-cyan-300' : 'text-white/70'}`}>
                    {track.title}
                  </p>
                  <p className="text-[10px] text-white/25 truncate">
                    {track.artist || track.name}
                  </p>
                </div>
                {track.duration > 0 && (
                  <span className="text-[10px] text-white/25 flex-shrink-0">
                    {formatTime(track.duration)}
                  </span>
                )}
                {track.error && (
                  <span className="text-[9px] text-red-400 bg-red-400/10 px-1 rounded ml-1 flex-shrink-0">ERR</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {menu.visible && (
        <div
          className="fixed z-50 bg-black/90 border border-white/15 rounded-lg py-1 shadow-xl"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            className="block w-full px-4 py-1.5 text-xs text-left text-white/70 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
            onPointerDown={e => { e.stopPropagation(); playNow(menu.trackId); closeMenu(); }}
          >
            Play Now
          </button>
          <button
            className="block w-full px-4 py-1.5 text-xs text-left text-white/70 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
            onPointerDown={e => { e.stopPropagation(); playNext(menu.trackId); closeMenu(); }}
          >
            Play Next
          </button>
          <button
            className="block w-full px-4 py-1.5 text-xs text-left text-white/70 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
            onPointerDown={e => { e.stopPropagation(); addToQueue(menu.trackId); closeMenu(); }}
          >
            Add to Queue
          </button>
        </div>
      )}
    </div>
  );
});
