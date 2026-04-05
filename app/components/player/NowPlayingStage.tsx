'use client';

import { useMemo } from 'react';
import { usePlayer, formatTime } from '../../lib/playerContext';
import { TacticalBrackets } from '../ui/TacticalBrackets';

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

export function NowPlayingStage({ libOpen, queueOpen }: Props) {
  const { state } = usePlayer();
  const { tracks, queue, queuePos, playing } = state;
  const currentId = queue[queuePos] ?? null;
  const track = useMemo(
    () => (currentId ? tracks.find(t => t.id === currentId) ?? null : null),
    [currentId, tracks]
  );

  return (
    <div
      className="absolute inset-0 flex items-center justify-center transition-all duration-200"
      style={{
        paddingLeft: libOpen ? '18rem' : 0,
        paddingRight: queueOpen ? '18rem' : 0,
        // Hide on mobile when library is open (library covers full screen)
        pointerEvents: 'none',
      }}
    >
      {track ? (
        /* ── Track loaded ── */
        <div className="flex flex-col items-center gap-5 px-6 max-w-sm w-full select-none">

          {/* Album art */}
          <div className="relative w-52 h-52 shrink-0">
            <TacticalBrackets color="rgba(0,212,255,0.35)" size={18} thickness={1.5} />
            <div
              className="w-full h-full overflow-hidden flex items-center justify-center"
              style={{ background: 'var(--nx-bg-raised)', border: '1px solid rgba(0,212,255,0.18)' }}
            >
              {track.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={track.coverUrl} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <span style={{ fontSize: 56, color: 'var(--nx-cyan-dim)', lineHeight: 1 }}>♪</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--nx-text-dim)' }}>
                    NO ART
                  </span>
                </div>
              )}
            </div>

            {/* Playing animation bars — overlaid bottom of art */}
            {playing && (
              <div
                className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-0.5 px-3 pb-2"
                style={{ background: 'linear-gradient(to top, rgba(0,10,14,0.7) 0%, transparent 100%)' }}
              >
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div
                    key={i}
                    className="w-1 rounded-full"
                    style={{
                      background: 'var(--nx-cyan)',
                      height: `${12 + Math.sin(i * 1.3) * 10}px`,
                      animation: `nx-bar-bounce ${0.6 + i * 0.07}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Track info */}
          <div className="text-center w-full min-w-0">
            <div
              className="font-mono uppercase tracking-widest text-[8px] mb-1"
              style={{ color: 'var(--nx-cyan-dim)' }}
            >
              {playing ? '▶ BROADCASTING' : '‖ STANDBY'}
            </div>
            <p
              className="text-xl font-semibold leading-tight truncate"
              style={{ color: 'var(--nx-text)', maxWidth: '100%' }}
            >
              {track.title}
            </p>
            {track.artist && (
              <p className="font-mono text-[11px] mt-1 truncate" style={{ color: 'var(--nx-cyan-dim)' }}>
                {track.artist}
              </p>
            )}
            {track.album && (
              <p className="font-mono text-[10px] mt-0.5 truncate" style={{ color: 'var(--nx-text-dim)' }}>
                {track.album}
              </p>
            )}
          </div>

          {/* Metadata badges */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="font-mono uppercase text-[9px] px-2 py-0.5" style={{ color: 'var(--nx-cyan)', border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.06)' }}>
              {fmtLabel(track.type)}
            </span>
            <span className="font-mono text-[9px] px-2 py-0.5" style={{ color: 'var(--nx-text-dim)', border: '1px solid rgba(0,212,255,0.12)' }}>
              {fmtBytes(track.size)}
            </span>
            {track.duration > 0 && (
              <span className="font-mono text-[9px] px-2 py-0.5" style={{ color: 'var(--nx-text-dim)', border: '1px solid rgba(0,212,255,0.12)' }}>
                {formatTime(track.duration)}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* ── Standby state ── */
        <div className="relative flex flex-col items-center gap-4 py-10 px-12 select-none">
          <TacticalBrackets color="rgba(0,212,255,0.15)" size={20} thickness={1} />
          <div className="font-mono text-[40px] leading-none" style={{ color: 'rgba(0,212,255,0.12)' }}>◈</div>
          <div className="text-center">
            <p className="font-mono uppercase tracking-widest text-[10px]" style={{ color: 'rgba(0,212,255,0.3)' }}>
              AWAITING TRANSMISSION
            </p>
            <p className="font-mono text-[9px] mt-1.5" style={{ color: 'rgba(0,212,255,0.15)' }}>
              DROP AUDIO FILES OR CLICK INTEL DATABASE
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
