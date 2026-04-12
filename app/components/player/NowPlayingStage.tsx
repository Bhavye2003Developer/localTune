'use client';

import { useMemo } from 'react';
import { Music } from 'lucide-react';
import { usePlayer, formatTime } from '../../lib/playerContext';
import { VinylPlatter } from './VinylPlatter';

const FORMAT_MAP: Record<string, string> = {
  'audio/mpeg': 'MP3', 'audio/flac': 'FLAC', 'audio/wav': 'WAV',
  'audio/aac': 'AAC', 'audio/mp4': 'M4A', 'audio/webm': 'WEBM',
  'video/webm': 'WEBM', 'audio/ogg': 'OGG', 'audio/opus': 'OPUS',
  'audio/x-aiff': 'AIFF',
};
function fmtLabel(type: string) {
  return FORMAT_MAP[type] ?? type.split('/')[1]?.toUpperCase() ?? '?';
}
function fmtBytes(bytes: number) {
  return (bytes / 1_000_000).toFixed(1) + ' MB';
}

function Chip({ children, accent, color }: { children: React.ReactNode; accent?: boolean; color?: string }) {
  if (color) {
    return (
      <span
        className="px-2 py-0.5 rounded"
        style={{ color, border: `1px solid ${color}45`, background: `${color}18`, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const }}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      className="px-2 py-0.5 rounded"
      style={accent
        ? { color: 'var(--a)', border: '1px solid #f59e0b45', background: '#f59e0b18', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const }
        : { color: 'var(--t2)', border: '1px solid var(--br)', background: 'var(--s2)', fontSize: 9, fontWeight: 500 }
      }
    >
      {children}
    </span>
  );
}

function EnergyBar({ value }: { value: number }) {
  // value: 0–1
  const pct = Math.round(value * 100);
  const color = value > 0.7 ? '#22C55E' : value > 0.4 ? '#F59E0B' : '#38BDF8';
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ color: 'var(--t3)', fontSize: 9, fontWeight: 500, whiteSpace: 'nowrap' }}>Energy</span>
      <div
        className="rounded-full overflow-hidden"
        style={{ width: 48, height: 4, background: 'var(--s5)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

const MOOD_COLORS: Record<string, string> = {
  Energetic: '#F97316',
  Happy:     '#F59E0B',
  Chill:     '#38BDF8',
  Melancholic: '#A78BFA',
  Dark:      '#777777',
};


function StandbyBlock() {
  return (
    <div className="flex flex-col gap-3 select-none py-6 px-6">
      <div
        className="w-14 h-14 flex items-center justify-center rounded-xl"
        style={{ background: 'var(--s2)', border: '1px solid var(--br)' }}
      >
        <Music size={24} style={{ color: 'var(--t3)' }} />
      </div>
      <div>
        <p style={{ color: 'var(--t2)', fontSize: 14, fontWeight: 600 }}>No track loaded</p>
        <p className="mt-1" style={{ color: 'var(--t3)', fontSize: 12, fontWeight: 500 }}>
          Drop files or open the library to get started
        </p>
      </div>
    </div>
  );
}

export function NowPlayingStage() {
  const { state } = usePlayer();
  const { tracks, queue, queuePos, playing } = state;
  const currentId = queue[queuePos] ?? null;
  const track = useMemo(
    () => (currentId ? tracks.find(t => t.id === currentId) ?? null : null),
    [currentId, tracks]
  );

  if (!track) {
    return (
      <div className="flex items-start" style={{ minHeight: 120 }}>
        <StandbyBlock />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6 px-6 py-5 select-none">

      {/* Vinyl platter */}
      <div className="shrink-0">
        <VinylPlatter
          coverUrl={track.coverUrl}
          playing={playing}
          size={140}
        />
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div>
          <p
            className="truncate leading-snug"
            style={{ color: 'var(--t1)', fontSize: 26, fontWeight: 800 }}
          >
            {track.title}
          </p>
          {track.artist && (
            <p className="mt-1 truncate" style={{ color: 'var(--t2)', fontSize: 13, fontWeight: 500 }}>
              {track.artist}
            </p>
          )}
          {track.album && (
            <p className="mt-0.5 truncate" style={{ color: 'var(--t3)', fontSize: 11, fontWeight: 400 }}>
              {track.album}
            </p>
          )}
        </div>

        {/* Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Chip accent>{fmtLabel(track.type)}</Chip>
          <Chip>{fmtBytes(track.size)}</Chip>
          {track.duration > 0 && <Chip>{formatTime(track.duration)}</Chip>}
          {track.bpm != null && (
            <Chip color="#F59E0B">{Math.round(track.bpm)} BPM</Chip>
          )}
          {track.camelot && track.musicalKey && (
            <Chip color="#38BDF8">{track.camelot} · {track.musicalKey}</Chip>
          )}
          {track.mood && (
            <Chip color={MOOD_COLORS[track.mood] ?? '#777777'}>{track.mood}</Chip>
          )}
        </div>

        {/* Energy bar */}
        {track.energy != null && (
          <EnergyBar value={track.energy} />
        )}
      </div>
    </div>
  );
}
