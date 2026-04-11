'use client';
import { DspCard } from '../DspCard';

interface Props { detectedGain: string | null; }

export function ReplayGainStage({ detectedGain }: Props) {
  return (
    <DspCard
      title="ReplayGain"
      showBypass={false}
      readOnlyLabel={detectedGain ? detectedGain : 'no tag'}
    />
  );
}
