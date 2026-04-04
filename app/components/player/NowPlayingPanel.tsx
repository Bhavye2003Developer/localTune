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
  'audio/webm': 'WebM',
  'video/webm': 'WebM',
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
        setBgColor(`radial-gradient(ellipse at center, rgba(${r},${g},${b},0.45) 0%, rgba(0,0,0,0.95) 70%)`);
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
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onPointerDown={onClose}
    >
      <div
        className="relative rounded-2xl overflow-hidden w-72 shadow-2xl border border-white/10"
        style={{ background: bgColor || 'rgba(10,10,10,0.97)' }}
        onPointerDown={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-white/30 hover:text-white/70 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Album art */}
        <div className="flex justify-center pt-8 pb-4 px-8">
          <div className="w-40 h-40 rounded-xl overflow-hidden bg-white/8 flex items-center justify-center shadow-xl">
            {track.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={imgRef} src={track.coverUrl} alt="cover" className="w-full h-full object-cover" />
            ) : (
              <Music size={40} className="text-white/20" />
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="px-6 pb-6 text-center">
          <p className="text-white/90 text-base font-semibold leading-tight truncate">{track.title}</p>
          {track.artist && (
            <p className="text-white/50 text-sm mt-0.5 truncate">{track.artist}</p>
          )}
          {track.album && (
            <p className="text-white/30 text-xs mt-0.5 truncate">{track.album}</p>
          )}

          {/* Badges */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <span className="text-[10px] font-mono bg-white/8 border border-white/12 rounded px-2 py-0.5 text-white/50">
              {formatLabel(track.type)}
            </span>
            <span className="text-[10px] font-mono bg-white/8 border border-white/12 rounded px-2 py-0.5 text-white/50">
              {formatBytes(track.size)}
            </span>
            {track.duration > 0 && (
              <span className="text-[10px] font-mono bg-white/8 border border-white/12 rounded px-2 py-0.5 text-white/50">
                {formatTime(track.duration)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
