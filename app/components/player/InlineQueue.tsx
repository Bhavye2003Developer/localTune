'use client';

import { useCallback } from 'react';
import { Music, X, GripVertical } from 'lucide-react';
import { usePlayer, formatTime } from '../../lib/playerContext';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
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

interface SortableRowProps {
  id: string;
  dndId: string;
  title: string;
  artist: string;
  coverUrl: string;
  duration: number;
  isCurrent: boolean;
  pos: number;
  onRemove: (pos: number) => void;
  onPlay: (id: string, pos: number) => void;
}

function SortableRow({ id, dndId, title, artist, coverUrl, duration, isCurrent, pos, onRemove, onPlay }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        borderLeft: isCurrent ? '2px solid var(--a)' : '2px solid transparent',
        background: isCurrent ? '#f59e0b08' : undefined,
        paddingTop: 4, paddingBottom: 4, paddingLeft: 14, paddingRight: 14, minHeight: 40,
      }}
      className="flex items-center gap-2 cursor-pointer select-none group transition-colors"
      onClick={() => onPlay(id, pos)}
      onMouseEnter={e => {
        if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = 'var(--s3)';
      }}
      onMouseLeave={e => {
        if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = '';
      }}
    >
      <div
        className="shrink-0 cursor-grab touch-manipulation"
        style={{ color: 'var(--t3)' }}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={12} />
      </div>

      <div
        className="w-7 h-7 shrink-0 overflow-hidden flex items-center justify-center"
        style={{ background: 'var(--s2)', border: '1px solid var(--br)', borderRadius: 4 }}
      >
        {coverUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          : <Music size={10} style={{ color: 'var(--t3)' }} />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="truncate leading-tight"
          style={{ color: isCurrent ? 'var(--a)' : 'var(--t1)', fontSize: 11.5, fontWeight: 600 }}
        >
          {title}
        </p>
        <p className="truncate" style={{ color: 'var(--t2)', fontSize: 9.5, fontWeight: 500 }}>
          {artist}
        </p>
      </div>

      {duration > 0 && (
        <span className="shrink-0" style={{ color: 'var(--t2)', fontSize: 9, fontWeight: 400 }}>
          {formatTime(duration)}
        </span>
      )}

      <button
        className="shrink-0 flex items-center justify-center w-6 h-6 rounded transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 touch-manipulation"
        style={{ color: 'var(--t3)' }}
        onClick={e => { e.stopPropagation(); onRemove(pos); }}
        onMouseEnter={e => { (e.currentTarget).style.color = 'var(--orange)'; }}
        onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t3)'; }}
      >
        <X size={10} />
      </button>
    </div>
  );
}

export function InlineQueue() {
  const { state, jumpToQueuePos, removeFromQueue, reorderQueue, clearQueue } = usePlayer();
  const { tracks, queue, queuePos } = state;
  const currentId = queue[queuePos] ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = queue.findIndex((_, i) => `q-${i}` === active.id);
      const newIdx = queue.findIndex((_, i) => `q-${i}` === over.id);
      if (oldIdx !== -1 && newIdx !== -1) reorderQueue(oldIdx, newIdx);
    }
  }, [queue, reorderQueue]);

  const handleRemove = useCallback((pos: number) => removeFromQueue(pos), [removeFromQueue]);
  const handlePlay   = useCallback((_id: string, pos: number) => jumpToQueuePos(pos), [jumpToQueuePos]);

  return (
    <div className="flex flex-col min-h-0 flex-1" style={{ borderTop: '1px solid var(--br)' }}>
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--br)' }}
      >
        <span style={{ color: 'var(--t2)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Queue · {queue.length}
        </span>
        {queue.length > 0 && (
          <button
            onClick={clearQueue}
            className="px-2 py-0.5 rounded text-[9px] transition-colors"
            style={{ color: 'var(--t2)', border: '1px solid var(--br)', fontWeight: 700 }}
            onMouseEnter={e => { (e.currentTarget).style.color = 'var(--orange)'; (e.currentTarget).style.borderColor = '#f97316'; }}
            onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t2)'; (e.currentTarget).style.borderColor = 'var(--br)'; }}
          >
            Clear
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <p className="px-4 py-4 text-center" style={{ color: 'var(--t3)', fontSize: 12, fontWeight: 500 }}>
            Queue is empty
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={queue.map((_, i) => `q-${i}`)} strategy={verticalListSortingStrategy}>
              {queue.map((trackId, pos) => {
                const track = tracks.find(t => t.id === trackId);
                if (!track) return null;
                return (
                  <SortableRow
                    key={`${trackId}-${pos}`}
                    id={trackId}
                    dndId={`q-${pos}`}
                    title={track.title}
                    artist={track.artist || track.name}
                    coverUrl={track.coverUrl ?? ''}
                    duration={track.duration}
                    isCurrent={trackId === currentId}
                    pos={pos}
                    onRemove={handleRemove}
                    onPlay={handlePlay}
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
