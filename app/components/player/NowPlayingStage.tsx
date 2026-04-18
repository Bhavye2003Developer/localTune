'use client';

import { useMemo } from 'react';
import { Music } from 'lucide-react';
import { usePlayer, formatTime } from '../../lib/playerContext';
import { VinylPlatter } from './VinylPlatter';
import { SleepTimer } from './SleepTimer';

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

function Chip({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
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

        {/* Chips + mobile sleep timer */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Chip accent>{fmtLabel(track.type)}</Chip>
          <Chip>{fmtBytes(track.size)}</Chip>
          {track.duration > 0 && <Chip>{formatTime(track.duration)}</Chip>}
          <div className="sm:hidden">
            <SleepTimer direction="down" />
          </div>
        </div>
      </div>
    </div>
  );
}
