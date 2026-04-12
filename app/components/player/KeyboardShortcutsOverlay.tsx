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
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onPointerDown={onClose}
    >
      <div
        className="relative px-5 py-4 w-full mx-4 sm:w-80 max-h-[80vh] overflow-y-auto"
        style={{
          background: 'var(--s1)',
          border: '1px solid var(--br)',
          borderRadius: 12,
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4" style={{ borderBottom: '1px solid var(--br)', paddingBottom: '0.75rem' }}>
          <span style={{ color: 'var(--t1)', fontSize: 14, fontWeight: 800 }}>Keyboard Shortcuts</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors touch-manipulation"
            style={{ color: 'var(--t2)', background: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget).style.color = 'var(--t1)'; (e.currentTarget).style.background = 'var(--s3)'; }}
            onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t2)'; (e.currentTarget).style.background = 'transparent'; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Shortcut rows */}
        <div className="space-y-0">
          {SHORTCUTS.map((item, i) => {
            if ('section' in item) {
              return (
                <p
                  key={i}
                  className="pt-3 pb-1 first:pt-0"
                  style={{ color: 'var(--t3)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--br)' }}
                >
                  {item.section}
                </p>
              );
            }
            return (
              <div key={i} className="flex items-center justify-between gap-4 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ color: 'var(--t2)', fontSize: 11, fontWeight: 500 }}>{item.desc}</span>
                <kbd
                  className="shrink-0 px-1.5 py-0.5 rounded"
                  style={{
                    color: 'var(--a)',
                    border: '1px solid #f59e0b45',
                    background: '#f59e0b18',
                    fontSize: 9,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
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
