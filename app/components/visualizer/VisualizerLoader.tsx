'use client';

import dynamic from 'next/dynamic';

// next/dynamic with ssr:false must live in a Client Component (Next.js 16 restriction)
const VisualizerContainer = dynamic(
  () =>
    import('./VisualizerContainer').then((m) => m.VisualizerContainer),
  { ssr: false },
);

export function VisualizerLoader() {
  return <VisualizerContainer />;
}
