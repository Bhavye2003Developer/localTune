'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const SHORTCUTS = [
  { section: 'Playback' },
  { key: 'Space', desc: 'Play / Pause' },
  { key: 'M', desc: 'Mute toggle' },
  { key: 'S', desc: 'Shuffle toggle' },
  { key: 'L', desc: 'Cycle loop mode' },
  { section: 'Seek' },
  { key: '← / →', desc: 'Seek ±5 seconds' },
  { key: 'Shift+← / →', desc: 'Previous / Next track' },
  { key: 'A', desc: 'Set loop start (A point)' },
  { section: 'Volume' },
  { key: '↑ / ↓', desc: 'Volume ±5%' },
  { section: 'View' },
  { key: 'F', desc: 'Toggle fullscreen' },
  { key: 'E', desc: 'Toggle EQ' },
  { key: '/', desc: 'Focus search' },
  { key: '?', desc: 'Show this overlay' },
] as const;

export function KeyboardShortcutsOverlay({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onPointerDown={onClose}
    >
      <div
        className="relative bg-black/90 border border-white/12 rounded-2xl px-6 py-5 w-full mx-4 sm:w-80 shadow-2xl max-h-[80vh] overflow-y-auto"
        onPointerDown={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/30 hover:text-white/60 transition-colors"
        >
          <X size={16} />
        </button>
        <h2 className="text-white/80 text-sm font-semibold mb-4 tracking-wide">Keyboard Shortcuts</h2>
        <div className="space-y-0.5">
          {SHORTCUTS.map((item, i) => {
            if ('section' in item) {
              return (
                <p key={i} className="text-white/30 text-[10px] tracking-widest uppercase pt-3 pb-1 first:pt-0">
                  {item.section}
                </p>
              );
            }
            return (
              <div key={i} className="flex items-center justify-between gap-4 py-0.5">
                <span className="text-white/40 text-xs">{item.desc}</span>
                <kbd className="text-[10px] font-mono bg-white/8 border border-white/12 rounded px-1.5 py-0.5 text-white/60 whitespace-nowrap flex-shrink-0">
                  {item.key}
                </kbd>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
