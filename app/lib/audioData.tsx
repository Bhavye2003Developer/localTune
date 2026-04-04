'use client';

import {
  createContext,
  useContext,
  useRef,
  useEffect,
  type ReactNode,
  type MutableRefObject,
} from 'react';

export interface AudioData {
  bass: number;
  mid: number;
  treble: number;
  timeDomain: Float32Array;
  key: number;
}

// Context holds the ref itself — consumers read ref.current in useFrame, no React re-renders needed
const AudioDataContext = createContext<MutableRefObject<AudioData>>({
  current: {
    bass: 0,
    mid: 0,
    treble: 0,
    timeDomain: new Float32Array(2048),
    key: 0,
  },
});

interface AudioDataProviderProps {
  children: ReactNode;
  analyserNode?: AnalyserNode | null;
  musicalKey?: number;
}

export function AudioDataProvider({
  children,
  analyserNode,
  musicalKey = 0,
}: AudioDataProviderProps) {
  const dataRef = useRef<AudioData>({
    bass: 0,
    mid: 0,
    treble: 0,
    timeDomain: new Float32Array(2048),
    key: musicalKey,
  });

  useEffect(() => {
    let rafId: number;
    const startTime = performance.now();

    function tick() {
      const elapsed = (performance.now() - startTime) / 1000;
      dataRef.current.key = musicalKey;

      if (analyserNode) {
        const fftSize = analyserNode.frequencyBinCount;
        const freqBuf = new Uint8Array(fftSize);
        analyserNode.getByteFrequencyData(freqBuf);

        const tdBuf = new Uint8Array(fftSize * 2);
        analyserNode.getByteTimeDomainData(tdBuf);
        const len = Math.min(tdBuf.length, dataRef.current.timeDomain.length);
        for (let i = 0; i < len; i++) {
          dataRef.current.timeDomain[i] = tdBuf[i] / 128.0 - 1.0;
        }

        const bassEnd = Math.floor(fftSize * 0.05);
        const midEnd = Math.floor(fftSize * 0.4);

        let bs = 0, ms = 0, ts = 0;
        for (let i = 0; i < bassEnd; i++) bs += freqBuf[i];
        for (let i = bassEnd; i < midEnd; i++) ms += freqBuf[i];
        for (let i = midEnd; i < fftSize; i++) ts += freqBuf[i];

        dataRef.current.bass = bs / bassEnd / 255;
        dataRef.current.mid = ms / (midEnd - bassEnd) / 255;
        dataRef.current.treble = ts / (fftSize - midEnd) / 255;
      } else {
        // Animated demo mode — drives the visualizer without audio
        const b = (Math.sin(elapsed * 1.3) + 1) / 2;
        const m = (Math.sin(elapsed * 0.7 + 1.0) + 1) / 2;
        const t = (Math.sin(elapsed * 2.2 + 2.0) + 1) / 2;

        dataRef.current.bass = b * 0.7 + 0.1;
        dataRef.current.mid = m * 0.5 + 0.05;
        dataRef.current.treble = t * 0.35 + 0.05;

        const tdLen = dataRef.current.timeDomain.length;
        for (let i = 0; i < tdLen; i++) {
          const x = i / tdLen;
          dataRef.current.timeDomain[i] =
            Math.sin(x * Math.PI * 12 + elapsed * 3) * 0.35 * b +
            Math.sin(x * Math.PI * 7 + elapsed * 5) * 0.15 * t;
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [analyserNode, musicalKey]);

  return (
    <AudioDataContext.Provider value={dataRef as MutableRefObject<AudioData>}>
      {children}
    </AudioDataContext.Provider>
  );
}

/** Returns a stable ref — read `.current` inside useFrame for audio-reactive animation */
export function useAudioData(): MutableRefObject<AudioData> {
  return useContext(AudioDataContext);
}
