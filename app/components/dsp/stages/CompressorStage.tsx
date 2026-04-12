'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { DspCard } from '../DspCard';
import {
  setStageBypass,
  setCompressorThreshold,
  setCompressorRatio,
  setCompressorAttack,
  setCompressorRelease,
  setCompressorKnee,
  setCompressorMakeupGain,
  getCompressorReduction,
  getDSPSettings,
} from '../../../lib/dsp';

function DspSlider({
  label, value, min, max, step = 0.1,
  onChange, formatVal,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; onChange: (v: number) => void;
  formatVal?: (v: number) => string;
}) {
  const fmt = formatVal ?? ((v: number) => (v >= 0 ? '+' : '') + v.toFixed(1));
  return (
    <div className="flex items-center gap-2 min-h-[44px]">
      <span className="font-mono text-[9px] w-16 shrink-0 opacity-60">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-amber-400"
      />
      <span className="font-mono text-[9px] w-14 text-right opacity-60">{fmt(value)}</span>
    </div>
  );
}

function GRMeter() {
  const [reduction, setReduction] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    function tick() {
      setReduction(Math.abs(getCompressorReduction()));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const pct = Math.min(reduction / 20, 1) * 100; // 20 dB max GR

  return (
    <div className="flex items-center gap-2 min-h-[44px]">
      <span className="font-mono text-[9px] w-16 shrink-0 opacity-60">GR</span>
      <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
        <div
          className="h-full rounded-full transition-none"
          style={{
            width: `${pct}%`,
            background: pct > 75 ? 'var(--orange)' : pct > 40 ? 'var(--a)' : 'var(--green)',
          }}
        />
      </div>
      <span className="font-mono text-[9px] w-14 text-right opacity-60">
        -{reduction.toFixed(1)} dB
      </span>
    </div>
  );
}

interface Props {
  dragHandleProps?: Record<string, unknown>;
}

export const CompressorStage = memo(function CompressorStage({ dragHandleProps }: Props) {
  const s = getDSPSettings().compressor;

  return (
    <DspCard
      title="Compressor"
      bypassed={s.bypassed}
      onBypassToggle={v => setStageBypass('compressor', v)}
      showBypass
      showDragHandle
      dragHandleProps={dragHandleProps}
    >
      <GRMeter />
      <DspSlider label="Threshold" value={s.threshold} min={-60} max={0} step={1}
        onChange={setCompressorThreshold} formatVal={v => `${v.toFixed(0)} dB`} />
      <DspSlider label="Ratio" value={s.ratio} min={1} max={20} step={0.5}
        onChange={setCompressorRatio} formatVal={v => `${v.toFixed(1)}:1`} />
      <DspSlider label="Attack" value={s.attack} min={0} max={1} step={0.001}
        onChange={setCompressorAttack} formatVal={v => `${(v * 1000).toFixed(0)} ms`} />
      <DspSlider label="Release" value={s.release} min={0} max={1} step={0.01}
        onChange={setCompressorRelease} formatVal={v => `${(v * 1000).toFixed(0)} ms`} />
      <DspSlider label="Knee" value={s.knee} min={0} max={40} step={1}
        onChange={setCompressorKnee} formatVal={v => `${v.toFixed(0)} dB`} />
      <DspSlider label="Makeup" value={s.makeupGain} min={0} max={24} step={0.5}
        onChange={setCompressorMakeupGain} formatVal={v => `+${v.toFixed(1)} dB`} />
    </DspCard>
  );
});
