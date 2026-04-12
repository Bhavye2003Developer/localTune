'use client';

import { DspCard } from '../DspCard';
import { setStageBypass, getStageBypass } from '../../../lib/dsp';

interface Props {
  dragHandleProps?: Record<string, unknown>;
  onOpenEQ?: () => void;
}

export function EQLink({ dragHandleProps, onOpenEQ }: Props) {
  return (
    <DspCard
      title="Parametric EQ"
      bypassed={getStageBypass('eq')}
      onBypassToggle={v => setStageBypass('eq', v)}
      showBypass
      showDragHandle
      dragHandleProps={dragHandleProps}
    >
      {onOpenEQ && (
        <button
          onClick={onOpenEQ}
          className="font-mono text-[9px] uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity min-h-[44px] px-2 touch-manipulation"
          style={{ color: 'var(--nx-cyan)' }}
        >
          Open EQ →
        </button>
      )}
    </DspCard>
  );
}
