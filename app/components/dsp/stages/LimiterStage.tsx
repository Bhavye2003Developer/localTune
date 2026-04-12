'use client';
import { DspCard } from '../DspCard';

export function LimiterStage() {
  return (
    <DspCard
      title="Limiter"
      showBypass={false}
      readOnlyLabel="-0.1 dBFS brickwall"
    />
  );
}
