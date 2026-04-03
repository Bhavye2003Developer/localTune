'use client';

import { usePlayer, formatTime } from '../../lib/playerContext';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Music } from 'lucide-react';

interface SortableRowProps {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  duration: number;
  isCurrent: boolean;
  pos: number;
  onRemove: (pos: number) => void;
  onPlay: (id: string) => void;
}

function SortableRow({ id, title, artist, coverUrl, duration, isCurrent, pos, onRemove, onPlay }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`flex items-center gap-2 px-3 py-2 group cursor-pointer select-none
        ${isCurrent ? 'bg-cyan-400/10 border-l-2 border-cyan-400' : 'hover:bg-white/5'}`}
      onClick={() => onPlay(id)}
    >
      <span
        {...attributes}
        {...listeners}
        className="text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </span>

      <div className="w-8 h-8 rounded overflow-hidden bg-white/8 flex items-center justify-center flex-shrink-0">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music size={10} className="text-white/25" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs truncate leading-tight ${isCurrent ? 'text-cyan-300' : 'text-white/80'}`}>{title}</p>
        <p className="text-[10px] text-white/35 truncate">{artist || ''}</p>
      </div>

      <span className="text-[10px] text-white/30 tabular-nums flex-shrink-0">{formatTime(duration)}</span>

      <button
        onClick={e => { e.stopPropagation(); onRemove(pos); }}
        className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-red-400 transition-all flex-shrink-0"
        title="Remove from queue"
      >
        <X size={12} />
      </button>
    </div>
  );
}

interface QueueSidebarProps {
  onClose: () => void;
}

export function QueueSidebar({ onClose }: QueueSidebarProps) {
  const { state, playNow, removeFromQueue, reorderQueue, clearQueue } = usePlayer();
  const { tracks, queue, queuePos } = state;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = queue.indexOf(active.id as string);
    const to = queue.indexOf(over.id as string);
    if (from !== -1 && to !== -1) reorderQueue(from, to);
  }

  const currentId = queue[queuePos] ?? null;

  return (
    <div className="absolute right-0 top-0 bottom-14 w-72 bg-black/85 backdrop-blur-xl border-l border-white/8 flex flex-col z-20 select-none">
      <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">
        <span className="text-white/60 text-xs font-semibold tracking-wide">Queue</span>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              Clear
            </button>
          )}
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="px-3 pb-1 text-[10px] text-white/25">
        {queue.length === 0 ? 'Empty' : `${queue.length} track${queue.length === 1 ? '' : 's'}`}
      </div>

      <div className="flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <p className="text-white/20 text-xs text-center mt-8 px-4">
            Double-click a track or right-click → Play Now
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={queue} strategy={verticalListSortingStrategy}>
              {queue.map((id, pos) => {
                const track = tracks.find(t => t.id === id);
                if (!track) return null;
                return (
                  <SortableRow
                    key={id}
                    id={id}
                    title={track.title}
                    artist={track.artist}
                    coverUrl={track.coverUrl}
                    duration={track.duration}
                    isCurrent={id === currentId}
                    pos={pos}
                    onRemove={removeFromQueue}
                    onPlay={playNow}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
