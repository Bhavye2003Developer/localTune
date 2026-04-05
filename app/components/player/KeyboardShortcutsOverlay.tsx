'use client';

import { useEffect } from 'react';
import { TacticalBrackets } from '../ui/TacticalBrackets';

interface Props {
  onClose: () => void;
}

const SHORTCUTS = [
  { section: 'PLAYBACK' },
  { key: 'SPACE', desc: 'Play / Pause' },
  { key: 'M', desc: 'Mute toggle' },
  { key: 'S', desc: 'Shuffle toggle' },
  { key: 'L', desc: 'Cycle loop mode' },
  { section: 'SEEK' },
  { key: '← / →', desc: 'Seek ±5 seconds' },
  { key: 'SHIFT+← / →', desc: 'Previous / Next track' },
  { key: 'A', desc: 'Set loop start (A point)' },
  { section: 'VOLUME' },
  { key: '↑ / ↓', desc: 'Volume ±5%' },
  { section: 'VIEW' },
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
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,10,14,0.85)', backdropFilter: 'blur(8px)' }}
      onPointerDown={onClose}
    >
      <div
        className="relative px-5 py-4 w-full mx-4 sm:w-80 max-h-[80vh] overflow-y-auto nx-scanline-overlay"
        style={{
          background: 'var(--nx-bg-panel)',
          border: '1px solid var(--nx-border-active)',
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        <TacticalBrackets color="rgba(0,212,255,0.4)" size={12} thickness={1.5} />

        {/* Header */}
        <div className="flex items-center justify-between mb-4" style={{ borderBottom: '1px solid var(--nx-border)', paddingBottom: '0.5rem' }}>
          <span className="font-mono uppercase tracking-widest text-[9px]" style={{ color: 'var(--nx-cyan-dim)' }}>
            ◈ COMMAND REFERENCE
          </span>
          <button
            onClick={onClose}
            className="font-mono text-[10px] transition-colors touch-manipulation"
            style={{ color: 'var(--nx-text-dim)' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-red)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; }}
          >
            ✕
          </button>
        </div>

        {/* Shortcut table */}
        <div className="space-y-0">
          {SHORTCUTS.map((item, i) => {
            if ('section' in item) {
              return (
                <p
                  key={i}
                  className="font-mono uppercase tracking-widest text-[8px] pt-3 pb-1 first:pt-0"
                  style={{ color: 'rgba(0,212,255,0.3)', borderBottom: '1px solid rgba(0,212,255,0.08)' }}
                >
                  {item.section}
                </p>
              );
            }
            return (
              <div key={i} className="flex items-center justify-between gap-4 py-1" style={{ borderBottom: '1px solid rgba(0,212,255,0.05)' }}>
                <span className="text-[11px]" style={{ color: 'var(--nx-text-dim)' }}>{item.desc}</span>
                <kbd
                  className="font-mono text-[9px] px-1.5 py-0.5 whitespace-nowrap shrink-0"
                  style={{
                    color: 'var(--nx-cyan)',
                    border: '1px solid rgba(0,212,255,0.3)',
                    background: 'rgba(0,212,255,0.06)',
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
