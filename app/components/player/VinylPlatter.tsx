'use client';

import { Music } from 'lucide-react';
import { memo } from 'react';

interface Props {
  coverUrl?: string;
  playing: boolean;
  size?: number;
}

export const VinylPlatter = memo(function VinylPlatter({ coverUrl, playing, size = 160 }: Props) {
  const labelSize = Math.round(size * 0.44);
  const labelOffset = (size - labelSize) / 2;

  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: '#111',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        animationName: playing ? 'vinylSpin' : 'none',
        animationDuration: '2s',
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
      }}
    >
      {/* Grooves */}
      {[0.72, 0.62, 0.52].map(r => (
        <div
          key={r}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${r * 100}%`,
            height: `${r * 100}%`,
            top: `${((1 - r) / 2) * 100}%`,
            left: `${((1 - r) / 2) * 100}%`,
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        />
      ))}

      {/* Label circle */}
      <div
        className="absolute overflow-hidden rounded-full flex items-center justify-center"
        style={{
          width: labelSize,
          height: labelSize,
          top: labelOffset,
          left: labelOffset,
          background: 'var(--s3)',
          border: '1px solid var(--br)',
        }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />
        ) : (
          <Music size={labelSize * 0.32} style={{ color: 'var(--t3)' }} />
        )}
      </div>

      {/* Center spindle dot */}
      <div
        className="absolute rounded-full"
        style={{
          width: 6,
          height: 6,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--s5)',
          zIndex: 2,
        }}
      />

      {/* Playing indicator */}
      {playing && (
        <div
          className="absolute top-2 right-2 w-2 h-2 rounded-full"
          style={{ background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }}
        />
      )}
    </div>
  );
});
