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
import { GripVertical } from 'lucide-react';
import { TacticalBrackets } from '../ui/TacticalBrackets';

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
  onPlay: (id: string) => void;
}

function SortableRow({ id, dndId, title, artist, coverUrl, duration, isCurrent, pos, onRemove, onPlay }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });
  const idx = String(pos + 1).padStart(2, '0');

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        borderLeft: isCurrent ? '2px solid var(--nx-cyan)' : '2px solid transparent',
        background: isCurrent ? 'var(--nx-bg-raised)' : undefined,
      }}
      className="flex items-center gap-2 px-2 py-2 cursor-pointer select-none group transition-colors"
      onClick={() => onPlay(id)}
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
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing shrink-0 transition-colors"
        style={{ color: 'var(--nx-cyan-dim)' }}
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={12} />
      </span>

      {/* Index */}
      <span className="font-mono text-[9px] shrink-0 w-5" style={{ color: 'var(--nx-cyan-dim)' }}>
        [{idx}]
      </span>

      {/* Cover art */}
      <div
        className="w-7 h-7 shrink-0 overflow-hidden flex items-center justify-center"
        style={{ border: '1px solid rgba(0,212,255,0.15)', background: 'var(--nx-bg-raised)' }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-mono text-[8px]" style={{ color: 'var(--nx-cyan-dim)' }}>♪</span>
        )}
      </div>

      {/* Title + artist */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] truncate leading-tight" style={{ color: isCurrent ? 'var(--nx-cyan)' : 'var(--nx-text)' }}>
          {title}
        </p>
        <p className="font-mono text-[9px] truncate" style={{ color: 'var(--nx-text-dim)' }}>
          {artist || '—'}
        </p>
      </div>

      {/* Duration */}
      <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--nx-cyan-dim)' }}>
        {formatTime(duration)}
      </span>

      {/* Remove */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(pos); }}
        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 px-1.5 py-1 font-mono text-[9px] transition-all shrink-0 touch-manipulation"
        style={{ color: 'var(--nx-text-dim)' }}
        title="Remove from queue"
        onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-red)'; }}
        onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; }}
      >
        ✕
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

  const dndIds = queue.map((id, pos) => `${id}::${pos}`);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = parseInt((active.id as string).split('::')[1]);
    const to = parseInt((over.id as string).split('::')[1]);
    if (!isNaN(from) && !isNaN(to)) reorderQueue(from, to);
  }

  return (
    <div
      className="absolute right-0 top-0 bottom-0 z-25 flex flex-col select-none nx-scanline-overlay w-full sm:w-72 border-l"
      style={{ background: 'var(--nx-bg-panel)', borderColor: 'var(--nx-border)' }}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--nx-border)' }}>
        <span className="font-mono uppercase tracking-widest text-[9px]" style={{ color: 'var(--nx-cyan-dim)' }}>
          ◈ MISSION QUEUE
        </span>
        <div className="flex items-center gap-3">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="font-mono uppercase tracking-widest text-[9px] transition-colors touch-manipulation"
              style={{ color: 'var(--nx-text-dim)' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-red)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; }}
            >
              CLEAR
            </button>
          )}
          <button
            onClick={onClose}
            className="font-mono text-[10px] transition-colors touch-manipulation"
            style={{ color: 'var(--nx-text-dim)' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-cyan)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Count */}
      <div className="px-3 py-1 shrink-0">
        <span className="font-mono text-[9px]" style={{ color: 'var(--nx-text-dim)' }}>
          {queue.length === 0 ? 'NO TARGETS QUEUED' : `${queue.length} TARGET${queue.length === 1 ? '' : 'S'}`}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <div className="relative mx-3 my-4 flex flex-col items-center justify-center gap-2 py-6 px-4">
            <TacticalBrackets color="rgba(0,212,255,0.2)" size={10} thickness={1} />
            <span className="font-mono uppercase tracking-widest text-[9px] text-center" style={{ color: 'var(--nx-text-dim)' }}>
              RIGHT-CLICK TRACKS<br />TO QUEUE TARGETS
            </span>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={dndIds} strategy={verticalListSortingStrategy}>
              {queue.map((id, pos) => {
                const track = tracks.find(t => t.id === id);
                if (!track) return null;
                return (
                  <SortableRow
                    key={`${id}::${pos}`}
                    id={id}
                    dndId={`${id}::${pos}`}
                    title={track.title}
                    artist={track.artist}
                    coverUrl={track.coverUrl}
                    duration={track.duration}
                    isCurrent={pos === queuePos}
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
