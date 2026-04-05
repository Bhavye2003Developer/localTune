# FineTune — Claude Build Progress

## Current Status: Feature 2 (EQ) — Complete. WebGL Visualizer removed.

---

## Stack Installed

```
next                    16.2.2   (NOT 15 — spec is outdated)
react                   19.2.4
color-thief-browser     2.0.2    (used in NowPlayingPanel for bg gradient)
tailwindcss             4.x
```

**Removed (performance):** `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `@types/three` — WebGL visualizer caused app-wide lag and was not core to music player functionality.

---

## Files Created

### Infrastructure

| File                    | Purpose                                                                                                                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/lib/audioData.tsx` | React context providing live AudioData via RAF loop. Demo-animates bass/mid/treble when no real AnalyserNode is connected. Provides `useAudioData()` hook returning a stable `MutableRefObject<AudioData>` — consumers read `.current` inside `useFrame` for zero re-renders. |
| `app/lib/utils.ts`      | `isIOS()` detection (SSR-safe). `KEY_COLORS[12]` — chromatic circle hex colors (C=red … B=magenta). `KEY_NAMES[12]`.                                                                                                                                                          |

### Pages

| File             | Change                                                            |
| ---------------- | ----------------------------------------------------------------- |
| `app/page.tsx`   | Renders `<VisualizerLoader />` — full viewport, black background. |
| `app/layout.tsx` | Updated metadata title to "FineTune".                             |

---

## Key Architecture Decisions

### React Lint Rules (Next.js 16 / React Compiler)

Three strict rules enforced by `eslint-config-next/core-web-vitals`:

1. **`react-hooks/purity`** — `Math.random()` banned inside `useMemo`/`useCallback`.
   - Fix: generate typed arrays in module-level functions, pass pre-computed data to `useMemo`.

2. **`react-hooks/immutability`** — Cannot mutate values returned from hooks in `useFrame`.
   - Fix: move Three.js objects (geometry, material, lines) to **module-level singletons**. Mutations in `useFrame` on module-level vars are unrestricted.

3. **`react-hooks/set-state-in-effect`** — `setIos(isIOS())` in `useEffect` is flagged.
   - Fix: `useState(() => isIOS())` lazy initializer.

### Next.js 16 Breaking Change

`next/dynamic` with `{ ssr: false }` cannot be used in Server Components.

- Fix: create a `'use client'` wrapper component that does the dynamic import.

### audioData pattern

Context provides `MutableRefObject<AudioData>` (not the data directly).
Three.js components read `audioRef.current.bass` etc. inside `useFrame` — no React re-renders triggered on audio updates.

### Module-level Three.js Singletons

TerrainScene, ScopeScene, and NebulaScene all create their Three.js objects at module load time (not in hooks). Safe because the files are only loaded in browser (`ssr: false` on the dynamic import). Avoids `react-hooks/immutability` lint errors entirely.

---

## Feature Build Status

| #   | Feature                                     | Status                                 |
| --- | ------------------------------------------- | -------------------------------------- |
| 1   | WebGL Visualizer                            | ❌ Removed — caused app-wide lag       |
| 2   | 10-Band Parametric EQ                       | ✅ Complete — 153 tests passing        |
| 3   | BPM + Key + Mood Analysis                   | ⬜ Not started                         |
| 4   | Chord Detection + Timeline                  | ⬜ Not started                         |
| 5   | BPM-Synced Metronome                        | ⬜ Not started                         |
| 6   | Gapless Playback                            | ⬜ Not started                         |
| 7   | A-B Loop + Variable Speed                   | ⬜ Not started                         |
| 8   | Full DSP Signal Chain                       | ⬜ Not started                         |
| 9   | P2P Listen Together Rooms                   | ⬜ Not started                         |
| 10  | Media Session API                           | ⬜ Not started                         |
| 11  | Waveform Display                            | ⬜ Not started                         |
| 12  | Album Art Color Extraction                  | ⬜ Not started                         |
| 13  | Smart Playlists                             | ⬜ Not started                         |
| 14  | Global Chat Rooms                           | ⬜ Not started                         |
| 15  | PWA                                         | ⬜ Not started                         |

---

## Pending / Next Steps

- Spec build order: file loading → EQ → analysis → waveform → chat/P2P
- Packages still to install when needed: `dexie`, `essentia.js`, `soundtouch-ts`, `peerjs`, `ably`, `jsmediatags`, `@tanstack/react-virtual`, `@dnd-kit/*`, `sonner`, `framer-motion`, `next-pwa`
