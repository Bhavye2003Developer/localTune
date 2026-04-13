'use client';

import { memo, useEffect, useState, useCallback } from 'react';
import { db } from '../../../lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GaplessSettings {
  enabled: boolean;
  crossfade: number; // 0–6 seconds
}

interface Props {
  onSettingsChange: (settings: GaplessSettings) => void;
}

const DEFAULT: GaplessSettings = { enabled: false, crossfade: 0 };

// ─── Component ────────────────────────────────────────────────────────────────

export const GaplessStage = memo(function GaplessStage({ onSettingsChange }: Props) {
  const [settings, setSettings] = useState<GaplessSettings>(DEFAULT);

  // Restore from Dexie on mount
  useEffect(() => {
    db.gaplessSettings.get('default').then(stored => {
      if (stored) {
        const s: GaplessSettings = { enabled: stored.enabled, crossfade: stored.crossfade };
        setSettings(s);
        onSettingsChange(s);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((patch: Partial<GaplessSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      db.gaplessSettings.put({ id: 'default', ...next }).catch(() => {});
      onSettingsChange(next);
      return next;
    });
  }, [onSettingsChange]);

  return (
    <div
      style={{
        padding: '12px 16px',
        background: '#141414',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#F2F2F2', fontFamily: 'Syne, system-ui, sans-serif' }}>
          Gapless Playback
        </span>

        {/* Toggle */}
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minHeight: 44 }}
        >
          <input
            type="checkbox"
            aria-label="Gapless"
            checked={settings.enabled}
            onChange={e => update({ enabled: e.target.checked })}
            style={{ accentColor: '#F59E0B', width: 16, height: 16, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 9.5, fontWeight: 500, color: '#777777', fontFamily: 'Syne, system-ui, sans-serif' }}>
            {settings.enabled ? 'On' : 'Off'}
          </span>
        </label>
      </div>

      {/* Crossfade slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
        <span
          style={{ fontSize: 9, fontWeight: 700, color: '#777777', width: 56, flexShrink: 0, fontFamily: 'Syne, system-ui, sans-serif' }}
        >
          CROSSFADE
        </span>
        <input
          type="range"
          aria-label="Crossfade"
          min={0}
          max={6}
          step={1}
          value={settings.crossfade}
          onChange={e => update({ crossfade: parseInt(e.target.value, 10) })}
          style={{ flex: 1, height: 4, accentColor: '#F59E0B' }}
        />
        <span
          style={{ fontSize: 9, fontWeight: 500, color: '#777777', width: 28, textAlign: 'right', fontFamily: 'Syne, system-ui, sans-serif' }}
        >
          {settings.crossfade}s
        </span>
      </div>
    </div>
  );
});
