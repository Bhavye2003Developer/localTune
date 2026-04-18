'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Moon } from 'lucide-react';
import { usePlayer } from '../../lib/playerContext';

const PRESETS = [15, 30, 45, 60];

interface SleepTimerProps {
  direction?: 'up' | 'down';
}

export function SleepTimer({ direction = 'up' }: SleepTimerProps) {
  const { state, togglePlay } = usePlayer();
  const [sleepEnd, setSleepEnd] = useState<number | null>(null);
  const [display, setDisplay] = useState('');
  const [open, setOpen] = useState(false);
  const playingRef = useRef(state.playing);
  useEffect(() => { playingRef.current = state.playing; }, [state.playing]);

  useEffect(() => {
    if (!sleepEnd) return;
    const tick = () => {
      const ms = Math.max(0, sleepEnd - Date.now());
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setDisplay(`${m}:${s.toString().padStart(2, '0')}`);
      if (ms <= 0) {
        setSleepEnd(null);
        if (playingRef.current) togglePlay();
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [sleepEnd, togglePlay]);

  // Close picker on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-sleep-timer]')) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  const set = useCallback((mins: number) => {
    setSleepEnd(Date.now() + mins * 60 * 1000);
    setOpen(false);
  }, []);

  const cancel = useCallback(() => {
    setSleepEnd(null);
    setDisplay('');
    setOpen(false);
  }, []);

  const active = sleepEnd !== null;

  return (
    <div className="relative" data-sleep-timer>
      <button
        onClick={() => setOpen(o => !o)}
        title={active ? `Sleep in ${display}` : 'Sleep timer'}
        className="flex items-center justify-center h-10 px-2 rounded-lg transition-colors shrink-0"
        style={{
          color: active ? 'var(--a)' : 'var(--t2)',
          background: active ? '#f59e0b18' : 'transparent',
          border: active ? '1px solid #f59e0b45' : '1px solid transparent',
          fontSize: 10,
          fontWeight: 700,
          gap: 4,
          minWidth: 40,
        }}
      >
        <Moon size={13} />
        {active && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{display}</span>}
      </button>

      {open && (
        <div
          className={`absolute ${direction === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'} right-0 py-1 rounded-lg shadow-xl`}
          style={{ background: 'var(--s2)', border: '1px solid var(--br)', minWidth: 120, zIndex: 50 }}
        >
          {active && (
            <>
              <p className="px-4 py-1.5" style={{ color: 'var(--t2)', fontSize: 10, fontWeight: 500 }}>
                pausing in {display}
              </p>
              <div style={{ height: 1, background: 'var(--br)' }} />
            </>
          )}
          {PRESETS.map(m => (
            <button
              key={m}
              onClick={() => set(m)}
              className="block w-full px-4 py-2 text-left transition-colors"
              style={{ color: 'var(--t2)', fontSize: 11, fontWeight: 600 }}
              onMouseEnter={e => { (e.currentTarget).style.color = 'var(--t1)'; (e.currentTarget).style.background = 'var(--s3)'; }}
              onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t2)'; (e.currentTarget).style.background = ''; }}
            >
              {m} min
            </button>
          ))}
          {active && (
            <>
              <div style={{ height: 1, background: 'var(--br)' }} />
              <button
                onClick={cancel}
                className="block w-full px-4 py-2 text-left transition-colors"
                style={{ color: 'var(--orange)', fontSize: 11, fontWeight: 600 }}
                onMouseEnter={e => { (e.currentTarget).style.background = 'var(--s3)'; }}
                onMouseLeave={e => { (e.currentTarget).style.background = ''; }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
