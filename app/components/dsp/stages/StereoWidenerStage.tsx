'use client';

import { memo, useState } from 'react';
import { DspCard } from '../DspCard';
import {
  setStageBypass,
  getStageBypass,
  setStereoWidth,
  getDSPSettings,
} from '../../../lib/dsp';

interface Props {
  dragHandleProps?: Record<string, unknown>;
}

export const StereoWidenerStage = memo(function StereoWidenerStage({ dragHandleProps }: Props) {
  const [width,    setWidthState]    = useState(() => getDSPSettings().stereoWidener.width);
  const [bypassed, setBypassedState] = useState(() => getStageBypass('stereoWidener'));

  function widthLabel(w: number): string {
    if (w === 0) return 'Mono';
    if (w === 100) return 'Unity';
    if (w === 200) return 'Hyper';
    return `${w}%`;
  }

  return (
    <DspCard
      title="Stereo Widener"
      bypassed={bypassed}
      onBypassToggle={v => { setStageBypass('stereoWidener', v); setBypassedState(v); }}
      showBypass
      showDragHandle
      dragHandleProps={dragHandleProps}
    >
      <div className="flex items-center gap-2 min-h-[44px]">
        <span className="font-mono text-[9px] w-16 shrink-0 opacity-60">Width</span>
        <input
          type="range" min={0} max={200} step={1} value={width}
          onChange={e => { const v = parseInt(e.target.value); setStereoWidth(v); setWidthState(v); }}
          className="flex-1 h-1 accent-amber-400"
        />
        <span className="font-mono text-[9px] w-14 text-right opacity-60">{widthLabel(width)}</span>
      </div>
    </DspCard>
  );
});
