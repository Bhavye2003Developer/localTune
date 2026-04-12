'use client';

import { memo } from 'react';
import { DspCard } from '../DspCard';
import {
  setStageBypass,
  setReverbWet,
  setReverbPreset,
  getDSPSettings,
} from '../../../lib/dsp';
import type { DSPSettings } from '../../../lib/dsp';

const PRESETS: DSPSettings['reverb']['preset'][] = ['Studio', 'Hall', 'Church', 'Outdoor'];

interface Props {
  dragHandleProps?: Record<string, unknown>;
}

export const ReverbStage = memo(function ReverbStage({ dragHandleProps }: Props) {
  const s = getDSPSettings().reverb;

  return (
    <DspCard
      title="Reverb"
      bypassed={s.bypassed}
      onBypassToggle={v => setStageBypass('reverb', v)}
      showBypass
      showDragHandle
      dragHandleProps={dragHandleProps}
    >
      <div className="flex gap-1 flex-wrap mt-1">
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => setReverbPreset(p)}
            className="h-[44px] px-3 font-mono text-[9px] uppercase tracking-widest transition-colors touch-manipulation rounded"
            style={{
              background: s.preset === p ? '#f59e0b18' : 'rgba(255,255,255,0.04)',
              color: s.preset === p ? 'var(--a)' : 'var(--t2)',
              border: `1px solid ${s.preset === p ? '#f59e0b45' : 'transparent'}`,
            }}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 min-h-[44px] mt-1">
        <span className="font-mono text-[9px] w-16 shrink-0 opacity-60">Wet</span>
        <input
          type="range" min={0} max={1} step={0.01} value={s.wet}
          onChange={e => setReverbWet(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-amber-400"
        />
        <span className="font-mono text-[9px] w-14 text-right opacity-60">
          {Math.round(s.wet * 100)}%
        </span>
      </div>
    </DspCard>
  );
});
