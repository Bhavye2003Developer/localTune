'use client';

import { memo } from 'react';
import { BookOpen, Music2, ListMusic } from 'lucide-react';

export type MobileTab = 'library' | 'queue' | 'player';

interface Props {
  activeTab: MobileTab;
  onSwitch: (tab: MobileTab) => void;
}

export const MobileBottomNav = memo(function MobileBottomNav({ activeTab, onSwitch }: Props) {
  const tabs: { id: MobileTab; label: string; Icon: typeof BookOpen }[] = [
    { id: 'library', label: 'Library',  Icon: BookOpen  },
    { id: 'queue',   label: 'Queue',    Icon: ListMusic  },
    { id: 'player',  label: 'Player',   Icon: Music2     },
  ];

  return (
    <div
      className="pb-safe flex sm:hidden shrink-0"
      style={{ background: 'var(--s1)', borderTop: '1px solid var(--br)' }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onSwitch(id)}
            className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors"
            style={{ minHeight: 52 }}
          >
            <Icon
              size={20}
              style={{ color: active ? 'var(--a)' : 'var(--t2)' }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--a)' : 'var(--t2)',
              }}
            >
              {label}
            </span>
            {active && (
              <div
                className="absolute bottom-0 rounded-full"
                style={{ width: 24, height: 2, background: 'var(--a)' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
});
