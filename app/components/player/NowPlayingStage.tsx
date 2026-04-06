'use client';

import { useMemo, useCallback } from 'react';
import { usePlayer, formatTime } from '../../lib/playerContext';
import { TacticalBrackets } from '../ui/TacticalBrackets';
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
    <div className="relative shrink-0 w-56 h-56">
      <TacticalBrackets color="rgba(0,212,255,0.35)" size={18} thickness={1.5} />
      <div
        className="w-full h-full overflow-hidden flex items-center justify-center"
        style={{ background: 'var(--nx-bg-raised)', border: '1px solid rgba(0,212,255,0.18)' }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span style={{ fontSize: 52, color: 'var(--nx-cyan-dim)', lineHeight: 1 }}>♪</span>
            <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--nx-text-dim)' }}>
              NO ART
            </span>
          </div>
        )}
      </div>
      {playing && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-[2px] px-3 pb-2"
          style={{ background: 'linear-gradient(to top, rgba(0,10,14,0.75) 0%, transparent 100%)' }}
        >
          {[1,2,3,4,5,6,7,8].map(i => (
            <div
              key={i}
              className="w-[3px]"
              style={{
                background: 'var(--nx-cyan)',
                height: `${10 + Math.sin(i * 1.3) * 9}px`,
                animation: `nx-bar-bounce ${0.55 + i * 0.07}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.05}s`,
                transformOrigin: 'bottom',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StandbyBlock({ centered }: { centered?: boolean }) {
  return (
    <div
      className={`relative flex flex-col select-none ${centered ? 'items-center text-center gap-5 py-10 px-10' : 'gap-6 py-10 px-8'}`}
    >
      {!centered && <TacticalBrackets color="rgba(0,212,255,0.12)" size={20} thickness={1} />}

      {/* System info lines */}
      <div className="font-mono text-[8px] leading-relaxed" style={{ color: 'rgba(0,212,255,0.18)' }}>
        <p>SYS-ID: NX7-FINETUNE</p>
        <p>STATUS: IDLE · READY</p>
      </div>

      {/* Large icon */}
      <div
        className="font-mono leading-none animate-nx-idle-pulse"
        style={{ fontSize: centered ? 56 : 80, color: 'rgba(0,212,255,1)' }}
      >
        ◈
      </div>

      {/* Message */}
      <div>
        <p
          className="font-mono uppercase tracking-widest text-[11px] font-medium"
          style={{ color: 'rgba(0,212,255,0.35)' }}
        >
          AWAITING TRANSMISSION
        </p>
        <p className="font-mono text-[9px] mt-2 leading-relaxed" style={{ color: 'rgba(0,212,255,0.15)' }}>
          {centered ? 'DROP AUDIO FILES OR CLICK INTEL DATABASE' : 'DROP AUDIO FILES OR\nCLICK INTEL DATABASE'}
        </p>
      </div>

      {/* Blinking cursor */}
      <span
        className="font-mono text-[13px] animate-nx-blink"
        style={{ color: 'rgba(0,212,255,0.3)' }}
      >
        ▮
      </span>
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
        paddingLeft: libOpen ? '18rem' : 0,
        paddingRight: queueOpen ? '18rem' : 0,
      }}
    >
      {/* ── Desktop split: [art + info] | [EQ panel] ── */}
      <div className="hidden sm:flex h-full">

        {/* Left column: art + track info */}
        <div className="flex flex-col justify-center gap-5 px-8 py-8 w-72 shrink-0 select-none">
          {track ? (
            <>
              <ArtBox coverUrl={track.coverUrl} playing={playing} />

              <div className="min-w-0 w-full">
                <div
                  className="font-mono uppercase tracking-widest text-[8px] mb-2"
                  style={{ color: 'var(--nx-cyan-dim)' }}
                >
                  {playing ? '▶ BROADCASTING' : '‖ STANDBY'}
                </div>
                <p
                  className="text-2xl font-bold leading-snug"
                  style={{ color: 'var(--nx-text)', wordBreak: 'break-word' }}
                >
                  {track.title}
                </p>
                {track.artist && (
                  <p className="font-mono text-[12px] mt-2" style={{ color: 'var(--nx-cyan-dim)' }}>
                    {track.artist}
                  </p>
                )}
                {track.album && (
                  <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--nx-text-dim)' }}>
                    {track.album}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <span
                    className="font-mono uppercase text-[9px] px-2 py-0.5"
                    style={{ color: 'var(--nx-cyan)', border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.06)' }}
                  >
                    {fmtLabel(track.type)}
                  </span>
                  <span
                    className="font-mono text-[9px] px-2 py-0.5"
                    style={{ color: 'var(--nx-text-dim)', border: '1px solid rgba(0,212,255,0.12)' }}
                  >
                    {fmtBytes(track.size)}
                  </span>
                  {track.duration > 0 && (
                    <span
                      className="font-mono text-[9px] px-2 py-0.5"
                      style={{ color: 'var(--nx-text-dim)', border: '1px solid rgba(0,212,255,0.12)' }}
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
          className="flex-1 flex flex-col min-w-0 border-l"
          style={{ borderColor: 'var(--nx-border)' }}
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

      {/* ── Mobile: centered art + info (EQ lives in bottom drawer) ── */}
      <div
        className="sm:hidden h-full flex items-center justify-center"
        style={{ pointerEvents: 'none' }}
      >
        {track ? (
          <div
            className="flex flex-col items-center gap-5 px-6 max-w-sm w-full select-none"
            style={{ pointerEvents: 'auto' }}
          >
            <ArtBox coverUrl={track.coverUrl} playing={playing} />
            <div className="text-center w-full min-w-0">
              <div
                className="font-mono uppercase tracking-widest text-[8px] mb-1"
                style={{ color: 'var(--nx-cyan-dim)' }}
              >
                {playing ? '▶ BROADCASTING' : '‖ STANDBY'}
              </div>
              <p className="text-xl font-semibold leading-tight truncate" style={{ color: 'var(--nx-text)' }}>
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
              <div className="flex items-center gap-2 flex-wrap justify-center mt-3">
                <span
                  className="font-mono uppercase text-[9px] px-2 py-0.5"
                  style={{ color: 'var(--nx-cyan)', border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.06)' }}
                >
                  {fmtLabel(track.type)}
                </span>
                <span
                  className="font-mono text-[9px] px-2 py-0.5"
                  style={{ color: 'var(--nx-text-dim)', border: '1px solid rgba(0,212,255,0.12)' }}
                >
                  {fmtBytes(track.size)}
                </span>
                {track.duration > 0 && (
                  <span
                    className="font-mono text-[9px] px-2 py-0.5"
                    style={{ color: 'var(--nx-text-dim)', border: '1px solid rgba(0,212,255,0.12)' }}
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
