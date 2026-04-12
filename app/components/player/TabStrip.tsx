'use client';

import { memo } from 'react';

export type TabId =
  | 'EQ' | 'DSP' | 'FX' | 'Gapless' | 'Metronome'
  | 'Chords' | 'Playlists' | 'Info' | 'Marks' | 'LockScreen' | 'PWA';

interface TabDef {
  id: TabId;
  label: string;
  built: boolean;
}

const TABS: TabDef[] = [
  { id: 'EQ',         label: 'EQ',         built: true  },
  { id: 'DSP',        label: 'DSP',         built: true  },
  { id: 'Info',       label: 'Info',        built: true  },
  { id: 'Marks',      label: 'Marks',       built: true  },
  { id: 'FX',         label: 'FX',          built: false },
  { id: 'Gapless',    label: 'Gapless',     built: false },
  { id: 'Metronome',  label: 'Metronome',   built: false },
  { id: 'Chords',     label: 'Chords',      built: false },
  { id: 'Playlists',  label: 'Playlists',   built: false },
  { id: 'LockScreen', label: 'Lock Screen', built: false },
  { id: 'PWA',        label: 'PWA',         built: false },
];

interface Props {
  openPanels: Set<TabId>;
  onToggle: (tab: TabId) => void;
}

export const TabStrip = memo(function TabStrip({ openPanels, onToggle }: Props) {
  return (
    <div
      className="flex items-center gap-1 px-3 overflow-x-auto shrink-0"
      style={{
        height: 40,
        borderBottom: '1px solid var(--br)',
        scrollbarWidth: 'none',
      }}
    >
      {TABS.map(({ id, label, built }) => {
        const active = openPanels.has(id);
        return (
          <button
            key={id}
            onClick={() => built && onToggle(id)}
            disabled={!built}
            className="flex items-center gap-1 px-3 rounded shrink-0 transition-colors"
            style={{
              height: 28,
              fontSize: 10,
              fontWeight: active ? 700 : 600,
              color: !built ? 'var(--t3)' : active ? 'var(--a)' : 'var(--t2)',
              background: active ? '#f59e0b18' : 'transparent',
              border: active ? '1px solid #f59e0b45' : '1px solid transparent',
              cursor: built ? 'pointer' : 'default',
              opacity: built ? 1 : 0.5,
            }}
          >
            {label}
            {!built && (
              <span
                className="rounded px-1"
                style={{
                  fontSize: 7,
                  fontWeight: 700,
                  color: 'var(--t3)',
                  background: 'var(--s3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                soon
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});
