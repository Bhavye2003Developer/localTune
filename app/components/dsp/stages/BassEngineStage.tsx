'use client';

import { memo } from 'react';
import { DspCard } from '../DspCard';
import {
  setStageBypass,
  setBassSubBass,
  setBassShelf,
  setBassCompressorEnabled,
  setBassMonoBass,
  setBassHarmonicEnhancer,
  getDSPSettings,
} from '../../../lib/dsp';

interface Props {
  dragHandleProps?: Record<string, unknown>;
}

function DspSlider({
  label, value, min, max, step = 0.5,
  onChange, unit = 'dB',
}: {
  label: string; value: number; min: number; max: number;
  step?: number; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div className="flex items-center gap-2 min-h-[44px]">
      <span className="font-mono text-[9px] w-20 shrink-0 opacity-60">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-amber-400"
      />
      <span className="font-mono text-[9px] w-12 text-right opacity-60">
        {value >= 0 ? '+' : ''}{value.toFixed(1)}{unit}
      </span>
    </div>
  );
}

function DspToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="h-[44px] px-3 rounded font-mono text-[9px] uppercase tracking-widest transition-colors shrink-0 touch-manipulation"
      style={{
        background: value ? '#f59e0b18' : 'rgba(255,255,255,0.04)',
        color: value ? 'var(--a)' : 'var(--t2)',
        border: `1px solid ${value ? '#f59e0b45' : 'transparent'}`,
      }}
    >
      {label}
    </button>
  );
}

export const BassEngineStage = memo(function BassEngineStage({ dragHandleProps }: Props) {
  const s = getDSPSettings().bassEngine;

  return (
    <DspCard
      title="Bass Engine"
      bypassed={s.bypassed}
      onBypassToggle={v => { setStageBypass('bassEngine', v); }}
      showBypass
      showDragHandle
      dragHandleProps={dragHandleProps}
    >
      <DspSlider label="Sub-bass" value={s.subBass} min={-12} max={12} onChange={setBassSubBass} />
      <DspSlider label="Bass shelf" value={s.bassShelf} min={-12} max={12} onChange={setBassShelf} />
      <div className="flex flex-wrap gap-2 mt-1">
        <DspToggle label="Compressor" value={s.compressor} onChange={setBassCompressorEnabled} />
        <DspToggle label="Mono bass" value={s.monoBass} onChange={setBassMonoBass} />
        <DspToggle label="Harmonic" value={s.harmonicEnhancer} onChange={setBassHarmonicEnhancer} />
      </div>
    </DspCard>
  );
});
