'use client';

import { memo, useState } from 'react';
import { DspCard } from '../DspCard';
import {
  setStageBypass,
  getStageBypass,
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
  const init = getDSPSettings().bassEngine;
  const [subBass,    setSubBassState]    = useState(init.subBass);
  const [bassShelf,  setBassShelfState]  = useState(init.bassShelf);
  const [compressor, setCompressorState] = useState(init.compressor);
  const [monoBass,   setMonoBassState]   = useState(init.monoBass);
  const [harmonic,   setHarmonicState]   = useState(init.harmonicEnhancer);
  const [bypassed,   setBypassedState]   = useState(() => getStageBypass('bassEngine'));

  return (
    <DspCard
      title="Bass Engine"
      bypassed={bypassed}
      onBypassToggle={v => { setStageBypass('bassEngine', v); setBypassedState(v); }}
      showBypass
      showDragHandle
      dragHandleProps={dragHandleProps}
    >
      <DspSlider label="Sub-bass"  value={subBass}   min={-12} max={12} onChange={v => { setBassSubBass(v);  setSubBassState(v);   }} />
      <DspSlider label="Bass shelf" value={bassShelf} min={-12} max={12} onChange={v => { setBassShelf(v);   setBassShelfState(v); }} />
      <div className="flex flex-wrap gap-2 mt-1">
        <DspToggle label="Compressor" value={compressor} onChange={v => { setBassCompressorEnabled(v); setCompressorState(v); }} />
        <DspToggle label="Mono bass"  value={monoBass}   onChange={v => { setBassMonoBass(v);          setMonoBassState(v);   }} />
        <DspToggle label="Harmonic"   value={harmonic}   onChange={v => { setBassHarmonicEnhancer(v);  setHarmonicState(v);   }} />
      </div>
    </DspCard>
  );
});
