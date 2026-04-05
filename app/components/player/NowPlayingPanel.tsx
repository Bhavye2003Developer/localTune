'use client';

import { useEffect, useRef, useState } from 'react';
import { type Track, formatTime } from '../../lib/playerContext';
import { TacticalBrackets } from '../ui/TacticalBrackets';

interface Props {
  track: Track;
  onClose: () => void;
}

const FORMAT_MAP: Record<string, string> = {
  'audio/mpeg': 'MP3',
  'audio/flac': 'FLAC',
  'audio/wav': 'WAV',
  'audio/aac': 'AAC',
  'audio/mp4': 'M4A',
  'audio/webm': 'WEBM',
  'video/webm': 'WEBM',
  'audio/ogg': 'OGG',
  'audio/opus': 'OPUS',
  'audio/x-aiff': 'AIFF',
};

function formatBytes(bytes: number): string {
  return (bytes / 1_000_000).toFixed(1) + ' MB';
}

function formatLabel(type: string): string {
  return FORMAT_MAP[type] ?? type.split('/')[1]?.toUpperCase() ?? '?';
}

export function NowPlayingPanel({ track, onClose }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [bgColor, setBgColor] = useState<string>('');

  // Extract dominant color from cover art for background gradient
  useEffect(() => {
    if (!track.coverUrl) { setBgColor(''); return; }
    const img = new window.Image();
    img.src = track.coverUrl;
    img.onload = async () => {
      try {
        const { default: ColorThief } = await import('color-thief-browser');
        const ct = new ColorThief();
        const [r, g, b] = ct.getColor(img);
        setBgColor(`radial-gradient(ellipse at center, rgba(${r},${g},${b},0.3) 0%, var(--nx-bg-panel) 70%)`);
      } catch {
        setBgColor('');
      }
    };
  }, [track.coverUrl]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: 'rgba(0,10,14,0.85)', backdropFilter: 'blur(8px)' }}
      onPointerDown={onClose}
    >
      <div
        className="relative overflow-hidden w-full sm:w-80 max-h-full overflow-y-auto nx-scanline-overlay"
        style={{
          background: bgColor || 'var(--nx-bg-panel)',
          border: '1px solid var(--nx-border-active)',
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        <TacticalBrackets color="rgba(0,212,255,0.4)" size={14} thickness={1.5} />

        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--nx-border)' }}>
          <span className="font-mono uppercase tracking-widest text-[9px]" style={{ color: 'var(--nx-cyan-dim)' }}>
            ◈ NOW BROADCASTING
          </span>
          <button
            onClick={onClose}
            className="font-mono text-[10px] transition-colors touch-manipulation"
            style={{ color: 'var(--nx-text-dim)' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--nx-red)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--nx-text-dim)'; }}
          >
            ✕
          </button>
        </div>

        {/* Album art */}
        <div className="flex justify-center pt-6 pb-4 px-8">
          <div
            className="w-40 h-40 overflow-hidden flex items-center justify-center"
            style={{ border: '1px solid var(--nx-border-active)', background: 'var(--nx-bg-raised)' }}
          >
            {track.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={imgRef} src={track.coverUrl} alt="cover" className="w-full h-full object-cover" />
            ) : (
              <span className="font-mono text-4xl" style={{ color: 'var(--nx-cyan-dim)' }}>♪</span>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="px-6 pb-6 text-center">
          <p className="text-base font-semibold leading-tight truncate" style={{ color: 'var(--nx-text)' }}>
            {track.title}
          </p>
          {track.artist && (
            <p className="font-mono text-[11px] mt-0.5 truncate" style={{ color: 'var(--nx-cyan-dim)' }}>
              {track.artist}
            </p>
          )}
          {track.album && (
            <p className="font-mono text-[10px] mt-0.5 truncate" style={{ color: 'var(--nx-text-dim)' }}>
              {track.album}
            </p>
          )}

          {/* Badges */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <span className="font-mono uppercase text-[9px] px-2 py-0.5" style={{ color: 'var(--nx-cyan)', border: '1px solid rgba(0,212,255,0.3)' }}>
              {formatLabel(track.type)}
            </span>
            <span className="font-mono text-[9px] px-2 py-0.5" style={{ color: 'var(--nx-text-dim)', border: '1px solid var(--nx-border)' }}>
              {formatBytes(track.size)}
            </span>
            {track.duration > 0 && (
              <span className="font-mono text-[9px] px-2 py-0.5" style={{ color: 'var(--nx-text-dim)', border: '1px solid var(--nx-border)' }}>
                {formatTime(track.duration)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
