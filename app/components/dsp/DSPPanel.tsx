'use client';

import { memo } from 'react';
import { DspCard } from './DspCard';

interface DSPPanelProps {
  open: boolean;
  onClose: () => void;
}

// TODO Task 14: wire onClose to close button / keyboard-escape handler
export const DSPPanel = memo(function DSPPanel({ open, onClose: _onClose }: DSPPanelProps) {
  return (
    <div
      className="overflow-hidden transition-all duration-200 ease-in-out bg-black/85 backdrop-blur-xl border-t border-white/8"
      style={{ height: open ? 280 : 0, maxHeight: open ? 280 : 0, opacity: open ? 1 : 0 }}
    >
      <div className="h-[280px] overflow-y-auto flex flex-col gap-0.5 p-2">
        {/* Placeholder — stages wired in Tasks 8–14 */}
        <DspCard title="DSP Chain — stages coming soon" showBypass={false} />
      </div>
    </div>
  );
});
