'use client';

// 'use client' wrapper required for next/dynamic with ssr:false in Next.js 16
// (Server Components cannot use ssr:false directly)

import dynamic from 'next/dynamic';

const PlayerShell = dynamic(
  () => import('./PlayerShell').then(m => m.PlayerShell),
  { ssr: false }
);

export function PlayerLoader() {
  return <PlayerShell />;
}
