'use client';

import { memo } from 'react';

export type TabId = 'EQ' | 'DSP' | 'Info' | 'Marks';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'EQ',    label: 'EQ'    },
  { id: 'DSP',   label: 'DSP'   },
  { id: 'Info',  label: 'Info'  },
  { id: 'Marks', label: 'Marks' },
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
      {TABS.map(({ id, label }) => {
        const active = openPanels.has(id);
        return (
          <button
            key={id}
            onClick={() => onToggle(id)}
            className="px-3 rounded shrink-0 transition-colors"
            style={{
              height: 28,
              fontSize: 10,
              fontWeight: active ? 700 : 600,
              color: active ? 'var(--a)' : 'var(--t2)',
              background: active ? '#f59e0b18' : 'transparent',
              border: active ? '1px solid #f59e0b45' : '1px solid transparent',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
});
