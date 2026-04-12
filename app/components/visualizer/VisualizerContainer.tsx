'use client';

import { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { NebulaScene } from './NebulaScene';
import { AudioDataProvider } from '../../lib/audioData';
import { isIOS, KEY_NAMES } from '../../lib/utils';

interface Props {
  /** If provided, AudioDataProvider uses real audio instead of demo animation */
  analyserNode?: AnalyserNode | null;
  /** If provided, key picker becomes controlled from outside */
  musicalKey?: number;
  onKeyChange?: (k: number) => void;
  vizMode?: 'nebula' | 'album-color';
  coverUrl?: string;
}

export function VisualizerContainer({ analyserNode, musicalKey: extKey, onKeyChange, vizMode, coverUrl }: Props) {
  const [intKey, setIntKey] = useState(8); // G# = cyan default
  const musicalKey = extKey ?? intKey;
  const setMusicalKey = onKeyChange ?? setIntKey;
  // Lazy initializer — runs once on mount (client-only), avoids setState-in-effect
  const [ios] = useState(() => isIOS());
  const [albumColor, setAlbumColor] = useState<THREE.Color | null>(null);

  useEffect(() => {
    let mounted = true;

    if (vizMode === 'album-color' && coverUrl) {
      (async () => {
        try {
          const ColorThiefModule = await import('color-thief-browser');
          const ColorThief = ColorThiefModule.default;
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = coverUrl;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
          });
          const ct = new ColorThief();
          const [r, g, b] = ct.getColor(img);
          if (mounted) {
            const color = new THREE.Color();
            color.setRGB(r / 255, g / 255, b / 255);
            setAlbumColor(color);
          }
        } catch {
          // Ignore extraction errors
        }
      })();
    } else {
      setAlbumColor(null);
    }

    return () => { mounted = false; };
  }, [vizMode, coverUrl]);

  return (
    <AudioDataProvider analyserNode={analyserNode} musicalKey={musicalKey}>
      <div className="relative w-full h-full bg-black select-none">

        {/* ── Three.js Canvas ───────────────────────────────────── */}
        <Canvas
          style={{ width: '100%', height: '100%' }}
          camera={{ position: [0, 0, 14], fov: 60, near: 0.1, far: 1000 }}
          gl={{ antialias: !ios, alpha: false }}
          dpr={ios ? 1 : [1, 2]}
        >
          <color attach="background" args={['#000000']} />

          <Suspense fallback={null}>
            <NebulaScene colorTint={albumColor} />
          </Suspense>

          <OrbitControls
            enablePan={false}
            enableZoom={false}
            target={[0, 0, 0]}
          />

          {!ios && (
            <EffectComposer>
              <Bloom luminanceThreshold={0.2} intensity={0.6} mipmapBlur />
            </EffectComposer>
          )}
        </Canvas>

        {/* ── Musical key picker ────────────────────────────────── */}
        <div className="absolute top-4 right-4 flex flex-col items-center gap-1.5">
          <span className="text-white/30 text-[10px] tracking-widest uppercase">Key</span>
          <div className="grid grid-cols-6 gap-1">
            {KEY_NAMES.map((note, i) => (
              <button
                key={note}
                onClick={() => setMusicalKey(i)}
                title={note}
                className={`w-7 h-7 rounded text-[10px] font-mono font-semibold transition-all ${
                  musicalKey === i
                    ? 'bg-white text-black scale-110'
                    : 'bg-white/8 text-white/40 hover:bg-white/18 hover:text-white/70'
                }`}
              >
                {note}
              </button>
            ))}
          </div>
        </div>

        {/* ── Header wordmark ───────────────────────────────────── */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="text-white font-semibold text-lg tracking-tight">FineTune</span>
          <span className="text-white/25 text-xs">v1</span>
        </div>

        {/* ── iOS notice ────────────────────────────────────────── */}
        {ios && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 text-amber-200/60 text-xs">
            iOS — reduced particles · bloom disabled
          </div>
        )}

        {/* ── Album Color badge ─────────────────────────────────── */}
        {vizMode === 'album-color' && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-3 py-1 text-white/70 text-xs">
            Album Color
          </div>
        )}
      </div>
    </AudioDataProvider>
  );
}
