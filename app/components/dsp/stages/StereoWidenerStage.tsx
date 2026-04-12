'use client';

import { memo } from 'react';
import { DspCard } from '../DspCard';
import {
  setStageBypass,
  setStereoWidth,
  getDSPSettings,
} from '../../../lib/dsp';

interface Props {
  dragHandleProps?: Record<string, unknown>;
}

export const StereoWidenerStage = memo(function StereoWidenerStage({ dragHandleProps }: Props) {
  const s = getDSPSettings().stereoWidener;

  function widthLabel(w: number): string {
    if (w === 0) return 'Mono';
    if (w === 100) return 'Unity';
    if (w === 200) return 'Hyper';
    return `${w}%`;
  }

  return (
    <DspCard
      title="Stereo Widener"
      bypassed={s.bypassed}
      onBypassToggle={v => setStageBypass('stereoWidener', v)}
      showBypass
      showDragHandle
      dragHandleProps={dragHandleProps}
    >
      <div className="flex items-center gap-2 min-h-[44px]">
        <span className="font-mono text-[9px] w-16 shrink-0 opacity-60">Width</span>
        <input
          type="range" min={0} max={200} step={1} value={s.width}
          onChange={e => setStereoWidth(parseInt(e.target.value))}
          className="flex-1 h-1 accent-cyan-400"
        />
        <span className="font-mono text-[9px] w-14 text-right opacity-60">{widthLabel(s.width)}</span>
      </div>
    </DspCard>
  );
});
