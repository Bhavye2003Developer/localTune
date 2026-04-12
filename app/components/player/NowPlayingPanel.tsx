'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Music } from 'lucide-react';
import { type Track, formatTime } from '../../lib/playerContext';

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

  useEffect(() => {
    if (!track.coverUrl) { setBgColor(''); return; }
    const img = new window.Image();
    img.src = track.coverUrl;
    img.onload = async () => {
      try {
        const { default: ColorThief } = await import('color-thief-browser');
        const ct = new ColorThief();
        const [r, g, b] = ct.getColor(img);
        setBgColor(`radial-gradient(ellipse at center, rgba(${r},${g},${b},0.25) 0%, var(--s1) 70%)`);
      } catch {
        setBgColor('');
      }
    };
  }, [track.coverUrl]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onPointerDown={onClose}
    >
      <div
        className="relative overflow-hidden w-full sm:w-80 max-h-full overflow-y-auto"
        style={{
          background: bgColor || 'var(--s1)',
          border: '1px solid var(--br)',
          borderRadius: 12,
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--br)' }}>
          <span style={{ color: 'var(--t1)', fontSize: 14, fontWeight: 800 }}>Now Playing</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors touch-manipulation"
            style={{ color: 'var(--t2)', background: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget).style.color = 'var(--t1)'; (e.currentTarget).style.background = 'var(--s3)'; }}
            onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t2)'; (e.currentTarget).style.background = 'transparent'; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Album art */}
        <div className="flex justify-center pt-6 pb-4 px-8">
          <div
            className="w-40 h-40 overflow-hidden flex items-center justify-center"
            style={{ border: '1px solid var(--br)', background: 'var(--s2)', borderRadius: 10 }}
          >
            {track.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={imgRef} src={track.coverUrl} alt="cover" className="w-full h-full object-cover" />
            ) : (
              <Music size={36} style={{ color: 'var(--t3)' }} />
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="px-6 pb-6 text-center">
          <p style={{ color: 'var(--t1)', fontSize: 20, fontWeight: 800, lineHeight: 1.3 }} className="truncate">
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

          {/* Badges */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <span
              className="px-2 py-0.5 rounded"
              style={{ color: 'var(--a)', border: '1px solid #f59e0b45', background: '#f59e0b18', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}
            >
              {formatLabel(track.type)}
            </span>
            <span
              className="px-2 py-0.5 rounded"
              style={{ color: 'var(--t2)', border: '1px solid var(--br)', background: 'var(--s2)', fontSize: 9, fontWeight: 500 }}
            >
              {formatBytes(track.size)}
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
    </div>
  );
}
