'use client';

import { memo, type ReactNode } from 'react';
import { Power } from 'lucide-react';

interface DspCardProps {
  title: string;
  bypassed?: boolean;
  onBypassToggle?: (v: boolean) => void;
  showBypass?: boolean;
  showDragHandle?: boolean;
  dragHandleProps?: Record<string, unknown>;
  children?: ReactNode;
  readOnlyLabel?: string;
}

export const DspCard = memo(function DspCard({
  title,
  bypassed = false,
  onBypassToggle,
  showBypass = true,
  showDragHandle = false,
  dragHandleProps,
  children,
  readOnlyLabel,
}: DspCardProps) {
  return (
    <div
      className="border rounded-none sm:rounded border-white/8 overflow-hidden"
      style={{ background: 'var(--s1)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 select-none">
        {showDragHandle && (
          <span
            {...dragHandleProps}
            className="cursor-grab text-white/20 hover:text-white/60 transition-colors px-0.5 touch-manipulation"
            title="Drag to reorder"
          >
            <span aria-hidden="true">⠿</span>
            <span className="sr-only">drag handle</span>
          </span>
        )}

        {showBypass && onBypassToggle && (
          <button
            onClick={() => onBypassToggle(!bypassed)}
            title={bypassed ? 'Enable stage' : 'Bypass stage'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 transition-colors touch-manipulation"
            style={{ color: bypassed ? 'var(--t3)' : 'var(--a)' }}
          >
            <Power size={13} />
          </button>
        )}

        <span
          className="text-[11px] font-semibold flex-1"
          style={{ color: bypassed ? 'var(--t3)' : 'var(--t2)' }}
        >
          {title}
        </span>

        {readOnlyLabel && (
          <span className="font-mono text-[9px] opacity-50">{readOnlyLabel}</span>
        )}
      </div>

      {/* Body */}
      {children && (
        <div className="px-3 pb-3 pt-1">
          {children}
        </div>
      )}
    </div>
  );
});
