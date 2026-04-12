'use client';

import { useMemo, useCallback } from 'react';
import { Music } from 'lucide-react';
import { usePlayer, formatTime } from '../../lib/playerContext';
import { EQPanel } from '../eq/EQPanel';

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

interface Props {
  libOpen: boolean;
  queueOpen: boolean;
}

function ArtBox({ coverUrl, playing }: { coverUrl?: string; playing: boolean }) {
  return (
    <div
      className="relative shrink-0 w-52 h-52 overflow-hidden"
      style={{ border: '1px solid var(--br)', borderRadius: 12, background: 'var(--s2)' }}
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Music size={48} style={{ color: 'var(--t3)' }} />
        </div>
      )}
      {playing && (
        <div
          className="absolute top-3 right-3 w-2 h-2 rounded-full"
          style={{ background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }}
        />
      )}
    </div>
  );
}

function StandbyBlock({ centered }: { centered?: boolean }) {
  return (
    <div
      className={`flex flex-col select-none ${centered ? 'items-center text-center gap-4 py-10 px-10' : 'gap-4 py-10 px-8'}`}
    >
      <div className="w-16 h-16 flex items-center justify-center rounded-xl" style={{ background: 'var(--s2)', border: '1px solid var(--br)' }}>
        <Music size={28} style={{ color: 'var(--t3)' }} />
      </div>
      <div>
        <p style={{ color: 'var(--t2)', fontSize: 14, fontWeight: 600 }}>
          No track loaded
        </p>
        <p className="mt-1" style={{ color: 'var(--t3)', fontSize: 12, fontWeight: 500 }}>
          {centered ? 'Drop files or open the library to get started' : 'Drop files or open the library'}
        </p>
      </div>
    </div>
  );
}

export function NowPlayingStage({ libOpen, queueOpen }: Props) {
  const { state, setEQBandGain, setEQBypass } = usePlayer();
  const { tracks, queue, queuePos, playing } = state;
  const currentId = queue[queuePos] ?? null;
  const track = useMemo(
    () => (currentId ? tracks.find(t => t.id === currentId) ?? null : null),
    [currentId, tracks]
  );
  const noop = useCallback(() => {}, []);

  return (
    <div
      className="absolute inset-0 transition-all duration-200"
      style={{
        paddingLeft: libOpen ? '15rem' : 0,
        paddingRight: queueOpen ? '18rem' : 0,
      }}
    >
      {/* ── Desktop: [art + info] | [EQ panel] ── */}
      <div className="hidden sm:flex h-full">

        {/* Left column: art + track info */}
        <div className="flex flex-col justify-center gap-5 px-8 py-8 w-72 shrink-0 select-none overflow-hidden">
          {track ? (
            <>
              <ArtBox coverUrl={track.coverUrl} playing={playing} />
              <div className="min-w-0 w-full overflow-hidden">
                <p
                  className="line-clamp-2 leading-snug"
                  style={{ color: 'var(--t1)', fontSize: 22, fontWeight: 800 }}
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
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{ color: 'var(--a)', border: '1px solid #f59e0b45', background: '#f59e0b18', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}
                  >
                    {fmtLabel(track.type)}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{ color: 'var(--t2)', border: '1px solid var(--br)', background: 'var(--s2)', fontSize: 9, fontWeight: 500 }}
                  >
                    {fmtBytes(track.size)}
                  </span>
                  {track.duration > 0 && (
                    <span
                      className="px-2 py-0.5 rounded"
                      style={{ color: 'var(--t2)', border: '1px solid var(--br)', background: 'var(--s2)', fontSize: 9, fontWeight: 500 }}
                    >
                      {formatTime(track.duration)}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <StandbyBlock />
          )}
        </div>

        {/* Right column: EQ — always visible on desktop */}
        <div
          className="flex-1 flex flex-col min-w-0"
          style={{ borderLeft: '1px solid var(--br)' }}
        >
          <EQPanel
            open={true}
            onClose={noop}
            setEQBandGain={setEQBandGain}
            setEQBypass={setEQBypass}
            embedded
          />
        </div>
      </div>

      {/* ── Mobile ── */}
      <div className="sm:hidden h-full flex flex-col" style={{ pointerEvents: 'none' }}>
        {track ? (
          <div
            className="flex flex-col items-center justify-center gap-5 px-6 py-8 h-full select-none"
            style={{ pointerEvents: 'auto' }}
          >
            <ArtBox coverUrl={track.coverUrl} playing={playing} />
            <div className="text-center w-full min-w-0 max-w-xs">
              <p className="line-clamp-2 leading-snug" style={{ color: 'var(--t1)', fontSize: 22, fontWeight: 800 }}>
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
              <div className="flex items-center gap-2 flex-wrap justify-center mt-3">
                <span
                  className="px-2 py-0.5 rounded"
                  style={{ color: 'var(--a)', border: '1px solid #f59e0b45', background: '#f59e0b18', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}
                >
                  {fmtLabel(track.type)}
                </span>
                <span
                  className="px-2 py-0.5 rounded"
                  style={{ color: 'var(--t2)', border: '1px solid var(--br)', background: 'var(--s2)', fontSize: 9, fontWeight: 500 }}
                >
                  {fmtBytes(track.size)}
                </span>
                {track.duration > 0 && (
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{ color: 'var(--t2)', border: '1px solid var(--br)', background: 'var(--s2)', fontSize: 9, fontWeight: 500 }}
                  >
                    {formatTime(track.duration)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ pointerEvents: 'auto' }}>
            <StandbyBlock centered />
          </div>
        )}
      </div>
    </div>
  );
}
