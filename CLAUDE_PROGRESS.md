# FineTune — Claude Build Progress

## Current Status: Feature 1 (WebGL Visualizer) — In Progress

---

## Stack Installed

```
next                    16.2.2   (NOT 15 — spec is outdated)
react                   19.2.4
three                   0.183.x
@react-three/fiber      9.5.0    (NOT 8.x — React 19 required v9)
@react-three/drei       10.7.7
@react-three/postprocessing  3.0.4
@types/three            dev dep
color-thief-browser     2.0.2    (installed, not yet used)
tailwindcss             4.x
```

---

## Files Created

### Infrastructure

| File                    | Purpose                                                                                                                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/lib/audioData.tsx` | React context providing live AudioData via RAF loop. Demo-animates bass/mid/treble when no real AnalyserNode is connected. Provides `useAudioData()` hook returning a stable `MutableRefObject<AudioData>` — consumers read `.current` inside `useFrame` for zero re-renders. |
| `app/lib/utils.ts`      | `isIOS()` detection (SSR-safe). `KEY_COLORS[12]` — chromatic circle hex colors (C=red … B=magenta). `KEY_NAMES[12]`.                                                                                                                                                          |

### Visualizer Components

| File                                                | Purpose                                                                                                                                                                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/components/visualizer/NebulaScene.tsx`         | Sphere of wavy particle lines. 80 longitude strips × 150 pts = 12k particles. GLSL vertex shader with multi-frequency wave displacement. Musical key drives wave frequencies/speed (not color). Fixed cyan color (#00aaff). NormalBlending — no additive shininess. |
| `app/components/visualizer/TerrainScene.tsx`        | 3D value-noise terrain (PlaneGeometry 128×128 segments). Bass pumps peak height. Camera orbits at fixed height (no bass zoom-in). Module-level geometry + material (avoids react-hooks/immutability lint).                                                          |
| `app/components/visualizer/ScopeScene.tsx`          | Dual-channel retro oscilloscope. CRT phosphor green, additive blending. Module-level Three.js objects. Grid overlay.                                                                                                                                                |
| `app/components/visualizer/VisualizerContainer.tsx` | Canvas wrapper. Mode switcher (nebula/terrain/scope). Musical key picker (12 keys). iOS detection via lazy `useState(() => isIOS())`. Bloom disabled for nebula (silhouette density creates natural glow), enabled for terrain/scope.                               |
| `app/components/visualizer/VisualizerLoader.tsx`    | Thin `'use client'` wrapper for `next/dynamic` with `ssr: false`. Required because Next.js 16 forbids `ssr: false` in Server Components.                                                                                                                            |

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

## Nebula Design Evolution

| Version          | Shape                                                     | Issue                                                 |
| ---------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| v1               | Full-screen sphere cloud (100k particles, ShaderMaterial) | WebGL context loss — GPU overloaded                   |
| v2               | Torus ring, PointsMaterial, 9k particles                  | Too dark, scattered look                              |
| v3               | Flat face-on ring (ShaderMaterial)                        | GLSL error: `RING_R` used but not declared as uniform |
| v4               | Sphere of longitude lines (ShaderMaterial)                | Linter reduced counts to 40×20 → blurry               |
| **v5 (current)** | Sphere 80×150 pts, fixed 1.4px dot size, key→wave pattern | ✅ Crisp, matches reference                           |

---

## Feature Build Status

| #   | Feature                                     | Status                                 |
| --- | ------------------------------------------- | -------------------------------------- |
| 1   | WebGL Visualizer (Nebula / Terrain / Scope) | 🟡 In progress — visual tuning ongoing |
| 2   | 10-Band Parametric EQ                       | ⬜ Not started                         |
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

- Finalise Nebula visual (user still tuning)
- Move to Feature 2 (EQ) once visualizer is approved
- Spec build order: file loading → EQ → analysis → waveform → visualizer → chat/P2P
- Packages still to install when needed: `dexie`, `essentia.js`, `soundtouch-ts`, `peerjs`, `ably`, `jsmediatags`, `@tanstack/react-virtual`, `@dnd-kit/*`, `sonner`, `framer-motion`, `next-pwa`
