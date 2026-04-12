'use client';

import { memo, useState, useCallback } from 'react';
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
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { rewireDSPChain, getStageOrder, type StageId } from '../../lib/dsp';
import { ReplayGainStage } from './stages/ReplayGainStage';
import { BassEngineStage } from './stages/BassEngineStage';
import { CompressorStage } from './stages/CompressorStage';
import { StereoWidenerStage } from './stages/StereoWidenerStage';
import { ReverbStage } from './stages/ReverbStage';
import { LimiterStage } from './stages/LimiterStage';
import { EQLink } from './stages/EQLink';

// ─── Sortable stage wrapper ───────────────────────────────────────────────────

function SortableStage({ id, children }: { id: StageId; children: (dragHandleProps: Record<string, unknown>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

// ─── Stage renderer ───────────────────────────────────────────────────────────

function renderStage(id: StageId, dragHandleProps: Record<string, unknown>, onOpenEQ: () => void) {
  switch (id) {
    case 'eq':             return <EQLink dragHandleProps={dragHandleProps} onOpenEQ={onOpenEQ} />;
    case 'bassEngine':     return <BassEngineStage dragHandleProps={dragHandleProps} />;
    case 'compressor':     return <CompressorStage dragHandleProps={dragHandleProps} />;
    case 'stereoWidener':  return <StereoWidenerStage dragHandleProps={dragHandleProps} />;
    case 'reverb':         return <ReverbStage dragHandleProps={dragHandleProps} />;
  }
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface DSPPanelProps {
  onOpenEQ: () => void;
  detectedReplayGain: string | null;
  /** @deprecated — visibility now controlled by parent mount/unmount */
  open?: boolean;
  /** @deprecated — visibility now controlled by parent mount/unmount */
  onClose?: () => void;
}

export const DSPPanel = memo(function DSPPanel({
  onOpenEQ, detectedReplayGain, open: _open, onClose: _onClose,
}: DSPPanelProps) {
  const [order, setOrder] = useState<StageId[]>(() => getStageOrder());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as StageId);
    const newIndex = order.indexOf(over.id as StageId);
    const newOrder = arrayMove(order, oldIndex, newIndex);
    setOrder(newOrder);
    rewireDSPChain(newOrder);
  }, [order]);

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ minHeight: 280 }}>
      <div className="flex flex-col gap-0.5 p-2">
        {/* Fixed top: ReplayGain */}
        <ReplayGainStage detectedGain={detectedReplayGain} />

        {/* Sortable middle stages */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            {order.map(id => (
              <SortableStage key={id} id={id}>
                {dragHandleProps => renderStage(id, dragHandleProps, onOpenEQ)}
              </SortableStage>
            ))}
          </SortableContext>
        </DndContext>

        {/* Fixed bottom: Limiter */}
        <LimiterStage />
      </div>
    </div>
  );
});
