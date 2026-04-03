'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Music, Play } from 'lucide-react';
import { usePlayer, formatTime } from '../../lib/playerContext';

export function TrackLibrary() {
  const { state, playNow } = usePlayer();
  const { tracks, queue, queuePos, playing } = state;
  const currentId = queue[queuePos] ?? null;
  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 5,
  });

  if (tracks.length === 0) return null;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-3 py-2 text-white/30 text-[10px] tracking-widest uppercase">
        Library — {tracks.length} track{tracks.length !== 1 ? 's' : ''}
      </div>
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(vItem => {
            const track = tracks[vItem.index];
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
