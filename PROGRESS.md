# FineTune V1 — Build Progress

> Spec source: `FineTune_V1_Spec-1.md`
> Last updated: 2026-04-04 (session 3)

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete |
| 🔶 | Partial — works but spec items missing |
| ❌ | Not started |

---

## File Inventory

| File | Role |
|------|------|
| `app/page.tsx` | Root page — renders `<PlayerLoader />` |
| `app/layout.tsx` | Next.js root layout |
| `app/lib/playerContext.tsx` | Core playback state, Web Audio singleton, jsmediatags extraction, `getAudioEl()` for RAF access |
| `app/lib/db.ts` | Dexie schema — `tracks` + `eqPresets` tables |
| `app/lib/audioData.tsx` | `AudioDataProvider` — feeds analyser FFT data to visualizer |
| `app/lib/utils.ts` | `isIOS()`, `KEY_NAMES` constant |
| `app/types/jsmediatags.d.ts` | Type declaration for `jsmediatags` (no upstream types) |
| `app/components/player/PlayerLoader.tsx` | `'use client'` wrapper for `next/dynamic` ssr:false |
| `app/components/player/PlayerShell.tsx` | Composes visualizer + library panel + player bar |
| `app/components/player/FileDropZone.tsx` | Click-to-pick + drag-drop (incl. folder traversal) |
| `app/components/player/TrackLibrary.tsx` | Virtualised track list (`@tanstack/react-virtual`); forwardRef search input + `focusSearch` handle |
| `app/components/player/PlayerBar.tsx` | Bottom control bar — all transport + secondary controls; album-art button opens Now Playing |
| `app/components/player/NowPlayingPanel.tsx` | Full-screen Now Playing overlay — album art, metadata badges, color-thief gradient |
| `app/components/player/KeyboardShortcutsOverlay.tsx` | Modal listing all keyboard shortcuts (`?` key) |
| `app/components/visualizer/VisualizerLoader.tsx` | `'use client'` wrapper with `next/dynamic` ssr:false |
| `app/components/visualizer/VisualizerContainer.tsx` | Canvas + key picker + album color extraction + Bloom pass |
| `app/components/visualizer/NebulaScene.tsx` | GLSL particle system — 4-shape morphing, audio-reactive, `uColorTint` uniform |
| `app/components/player/QueueSidebar.tsx` | dnd-kit sortable queue sidebar |
| `app/hooks/useKeyboardShortcuts.ts` | Global keydown handler — Space/arrows/M/L/S/F/V/A//?/? |
| `__tests__/playerReducer.test.ts` | Pure reducer unit tests (31 cases) |
| `__tests__/useKeyboardShortcuts.test.tsx` | Hook unit tests (17 cases) |
| `__tests__/visualizer.test.tsx` | Visualizer component tests (7 cases) |
| `vitest.config.ts` | Vitest config |
| `vitest.setup.ts` | jest-dom setup |

---

## Core — Playback Engine

### Entry Point — Universal File Loading ✅

- [x] File picker button (`<input multiple accept="audio/*,video/*">`)
- [x] Drag-and-drop zone with `webkitGetAsEntry()` folder traversal
- [x] Mobile-compatible (standard file input — no drag required)
- [x] Audio/video MIME filter
- [x] Dexie persistence of loaded tracks (track metadata + duration written on load; restored on next session)

---

### Step 1 — File Loading Flow ✅

| Stage | Status | Notes |
|-------|--------|-------|
| Stage 1 — File selection | ✅ | `FileDropZone.tsx` |
| Stage 2 — ID3 metadata via `jsmediatags` | ✅ | title, artist, album, cover art extracted async; filename fallback |
| Stage 3 — Library indexing | ✅ | In-memory `useReducer` state; Dexie write wired — upsert on `loadedmetadata` |
| Stage 4 — Duration from `<audio>` element | ✅ | `loadedmetadata` event updates duration on `Track` |
| Stage 5 — Cover art blob URL | ✅ | APIC frame → `Uint8Array` → `Blob` → `URL.createObjectURL` stored as `track.coverUrl` |
| Stage 6 — Analysis queue (essentia.js WASM) | ❌ | Not started |

---

### Step 2 — AudioContext Lifecycle ✅

- [x] One `AudioContext` per session (module-level singleton)
- [x] Created on first user gesture (`loadFiles` / `playTrack` / `togglePlay`)
- [x] `audioCtx.resume()` called before every `play()` — handles Safari suspension
- [x] Native device sample rate (no hardcoded value)
- [x] `MediaElementAudioSource` → `AnalyserNode` → `GainNode` → destination

---

### Step 3 — Core Playback Controls ✅

> Note: Spec prescribes `AudioBufferSourceNode` + `decodeAudioData`; implementation uses `HTMLAudioElement` + `MediaElementAudioSource` — functionally equivalent for V1, simpler seek/pause model.

- [x] Play / Pause
- [x] Seek (direct `audioEl.currentTime` assignment)
- [x] Next / Previous track
- [x] Auto-advance on track end
- [x] Volume (GainNode — muted at node level, not HTMLAudioElement level)
- [x] Mute toggle (sets GainNode gain to 0, preserves slider position)
- [x] Speed (`playbackRate` + `preservesPitch = true` for pitch preservation)

---

### Step 4 — Playback Control Bar UI ✅

#### Left section
- [x] Album art thumbnail (40×40, Music icon fallback)
- [x] Track title
- [x] Artist name (falls back to filename)
- [x] Click track info → opens Now Playing panel

#### Center section
- [x] Previous / Play-Pause / Next buttons
- [x] Seek bar — full-width, tall hit zone, visible fill, pointer capture drag
- [x] Seek bar fill + thumb + time display driven by RAF at 60fps (not `timeupdate`)
- [x] Current time / total duration display

#### Right section
- [x] Volume slider (0–1 range)
- [x] Mute toggle button (VolumeX / Volume2 icon)
- [x] Shuffle button — Off / True Random (Fisher-Yates on `CYCLE_SHUFFLE`)
- [x] Loop mode button — Off / Loop Track (`Repeat1`) / Loop Queue (`Repeat`)
- [x] Speed cycle button (0.25 / 0.5 / 0.75 / 1 / 1.25 / 1.5 / 2 / 3 / 4×)
- [x] Queue button (opens QueueSidebar)
- [x] Keyboard arrow-key seek on focused seek bar (±5s, ArrowLeft/Right)
- [x] Now Playing panel (expanded album art + metadata badges + color-thief gradient)

#### A-B Loop controls (Feature 7)
- [x] [A] and [B] buttons showing timestamps when set
- [x] Right-click progress bar → context menu to set A or B at any timestamp
- [x] Loop toggle (RotateCcw icon)
- [x] Clear loop points button
- [x] A-B region highlight on progress bar
- [x] A and B vertical marker lines on progress bar

---

### Step 5 — Queue Management ✅

- [x] Play Now / Play Next / Add to Queue / Remove / Clear
- [x] Queue sidebar (accessible from Queue button in PlayerBar)
- [x] Auto-advance respects queue order
- [x] Shuffle modes affect queue (library order preserved — tracks[] never reordered)
- [x] History buffer — 50-track circular history; Previous pops from history

---

### Step 6 — Keyboard Shortcuts 🔶

| Key | Action | Status |
|-----|--------|--------|
| `Space` | Play / Pause | ✅ |
| `→` / `←` | Seek ±5s | ✅ |
| `Shift+→` / `Shift+←` | Next / Prev track | ✅ |
| `↑` / `↓` | Volume ±5% | ✅ |
| `M` | Mute toggle | ✅ |
| `L` | Cycle loop mode | ✅ |
| `S` | Shuffle toggle | ✅ |
| `F` | Full-screen visualizer | ✅ |
| `V` | Cycle visualizer mode | ✅ |
| `E` | Toggle EQ panel | ❌ Deferred — next session (Feature 2 not built) |
| `C` | Toggle chord timeline | ❌ Deferred — next session (Feature 4 not built) |
| `B` | Toggle metronome | ❌ Deferred — next session (Feature 5 not built) |
| `A` | Set A loop point | ✅ |
| `/` | Focus search | ✅ |
| `?` | Show shortcuts overlay | ✅ |

---

### Step 7 — Format Support ✅ / 🔶

| Format | Status | Notes |
|--------|--------|-------|
| MP3, FLAC, WAV, AAC, M4A, WebM | ✅ | Browser native decode via `HTMLAudioElement` |
| OGG, OPUS, AIFF | 🔶 | Native on Chrome/Firefox; Safari falls back — no ffmpeg.wasm yet |
| WMA, ALAC, MKV | 🔶 | ffmpeg.wasm fallback wired; requires CDN load of core on demand |
| Error handling toast | ✅ | sonner toast on decode failure |

---

### Step 8 — Now Playing Metadata Display 🔶

- [x] Full-screen Now Playing panel (`NowPlayingPanel.tsx`, triggered by album-art click)
- [x] Large album art centered (160×160, with Music fallback icon)
- [x] Dynamic background gradient from `color-thief-browser` dominant color
- [ ] BPM chip, Camelot key badge, energy dot, mood tag (requires Feature 3 — essentia.js)
- [x] Format badge, sample rate, file size

---

## Features

### Feature 1 — WebGL Nebula Visualizer ✅

- [x] Full-screen WebGL particle system (`@react-three/fiber`, `three`)
- [x] 12,000 particles (desktop) / 3,200 (iOS)
- [x] Bass-reactive particle explosion (`uBass` uniform, smoothed — no snap on pause/resume)
- [x] Mid-frequency vortex rotation (`uMid` uniform, smoothed)
- [x] Key-driven shape morphing — 4 shapes blending across chromatic circle
  - Sphere (C), Torus (Eb), Hyperboloid (Gb), Star (A)
- [x] Smooth key transitions — module-level `interpKey` lerp at 0.02/frame
- [x] `OrbitControls` (pan disabled, zoom disabled)
- [x] iOS detection — reduced particles, antialiasing off, DPR 1
- [x] Musical key picker UI (12 buttons, top-right)
- [x] Album Color Mode (`V` key cycles; `uColorTint`/`uTintStrength` uniforms; ColorThief extraction)
- [x] Bloom post-processing (`EffectComposer` + `Bloom` — iOS skipped)

> Note: Terrain mode and Scope mode removed from spec — not needed.

---

### Feature 2 — 10-Band Parametric EQ ❌

- [ ] 10 `BiquadFilterNode` bands in Web Audio graph
- [ ] Per-band: frequency slider (log scale), ±15dB gain, Q factor
- [ ] Low shelf (band 1), high shelf (band 10), peaking/notch (bands 2–9)
- [ ] Live frequency response curve on canvas
- [ ] Presets: Flat, Bass Boost, Vocal Presence, Hip-Hop, Electronic, Classical, Podcast, Acoustic
- [ ] Custom preset save/load via Dexie `eqPresets` table
- [ ] Per-band bypass + full EQ bypass (gain → 0, nodes stay connected)

---

### Feature 3 — BPM + Key + Mood Analysis ❌

- [ ] `essentia.js` WASM in a Web Worker
- [ ] Per-track: BPM, musical key, energy, danceability, mood, LUFS
- [ ] Background analysis queue with progress indicator
- [ ] Results displayed as chips on track rows
- [ ] Cache results in Dexie keyed by `fileId`

---

### Feature 4 — Chord Detection + Scrolling Timeline ❌

- [ ] `ChordsDetection` algorithm via essentia.js
- [ ] Scrolling chord timeline above waveform
- [ ] Guitar chord diagrams (SVG lookup table in `/public/chords/`)
- [ ] Capo Mode with open-chord recalculation

---

### Feature 5 — BPM-Synced Metronome ❌

- [ ] `AudioWorkletProcessor` click track
- [ ] Sync to detected BPM
- [ ] On/Off toggle, independent volume, time signature selector
- [ ] Tap Tempo (4+ taps → set BPM)
- [ ] Visual beat pulse

---

### Feature 6 — Gapless Playback ❌

- [ ] Pre-decode next `AudioBuffer` in Web Worker during final 3 seconds
- [ ] Schedule next track on Web Audio timeline — zero silence
- [ ] Crossfade option (0–6 seconds)
- [ ] Settings stored in Dexie

---

### Feature 7 — A-B Loop + Variable Speed ✅

- [x] A and B marker points settable from PlayerBar
- [x] RAF-based loop enforcement (reads `stateRef`, never dispatches)
- [x] Loop toggle on/off
- [x] Clear loop points
- [x] A-B region visual on progress bar
- [x] Speed: 0.25×–4.0× via cycle button (0.25 / 0.5 / 0.75 / 1 / 1.25 / 1.5 / 2 / 3 / 4)
- [x] `preservesPitch = true` — pitch unchanged at all speeds
- [ ] Optional pitch-shift mode (±12 semitones independent of speed)

---

### Feature 8 — Full DSP Signal Chain ❌

- [ ] ReplayGain (read `REPLAYGAIN_TRACK_GAIN` tag)
- [ ] Bass Engine (sub-bass shelf, bass compressor, mono bass mode, harmonic enhancer)
- [ ] Parametric EQ nodes (same as Feature 2)
- [ ] Compressor (`DynamicsCompressorNode` with full controls + GR meter)
- [ ] Stereo Widener (`AudioWorkletProcessor` M-S matrix)
- [ ] Convolution Reverb (`ConvolverNode` + 4 IR WAV presets in `/public/ir/`)
- [ ] Brickwall Limiter at -0.1 dBFS
- [ ] Drag-to-reorder DSP chain

---

### Feature 9 — P2P Listen Together ❌

- [ ] PeerJS room creation + 6-char room code
- [ ] Host → guest playback state sync via WebRTC DataChannel
- [ ] Track matching by `title + artist + duration` hash
- [ ] Live text chat, emoji reactions, queue display
- [ ] Re-sync button

---

### Feature 10 — Media Session API ❌

- [ ] `navigator.mediaSession` metadata (title, artist, album, artwork)
- [ ] Handlers: play, pause, previoustrack, nexttrack, seekto
- [ ] Updates on every track change
- [ ] Cover art passed as MediaSession artwork

---

### Feature 11 — Waveform Display ❌

- [ ] PCM waveform decoded in Web Worker via `decodeAudioData`
- [ ] Rendered on `OffscreenCanvas`
- [ ] Click-to-seek
- [ ] Played/unplayed regions, A-B overlay, chord markers, cursor

---

### Feature 12 — Album Art Color Extraction 🔶

- [x] `color-thief-browser` dominant color extraction from `coverUrl`
- [x] Animated gradient background in player (NowPlayingPanel radial gradient)
- [x] Nebula particle palette tied to album color (`uColorTint` + `uTintStrength` uniforms)
- [ ] Hash-based gradient fallback for tracks without art

---

### Feature 13 — Smart Playlists ❌

- [ ] Energy Arc, Key Garden, Tempo Road, Mood Board, Similar To This generators
- [ ] Mood Board 2D scatter plot with lasso selection
- [ ] All driven from essentia.js analysis data

---

### Feature 14 — Global Chat Rooms ❌

- [ ] Ably WebSocket real-time chat
- [ ] 3 channels: #general, #now-playing, #find-music
- [ ] Auto-post Now Playing, typing indicator, @mentions, emoji picker

---

### Feature 15 — PWA ❌

- [ ] `next-pwa` Service Worker + offline cache
- [ ] Install prompt button
- [ ] App manifest with icons

---

## Keyboard Shortcuts ❌

All shortcuts listed in spec — none implemented yet.

---

## Packages Installed

| Package | Purpose | Installed |
|---------|---------|-----------|
| `next` 16.x | Framework | ✅ |
| `react` 19.x | UI | ✅ |
| `typescript` 5.x | Types | ✅ |
| `tailwindcss` 4.x | Styling | ✅ |
| `framer-motion` | Animations | ✅ |
| `dexie` | IndexedDB | ✅ |
| `lucide-react` | Icons | ✅ |
| `sonner` | Toast notifications | ✅ |
| `three` | WebGL | ✅ |
| `@react-three/fiber` | React Three.js | ✅ |
| `@react-three/drei` | Three helpers | ✅ |
| `@react-three/postprocessing` | Bloom etc. | ✅ |
| `@tanstack/react-virtual` | Virtual list | ✅ |
| `color-thief-browser` | Color extraction | ✅ |
| `jsmediatags` | ID3 tags | ✅ |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Queue drag-reorder | ✅ |
| `vitest` + `@testing-library/react` | Test framework | ✅ |
| `soundtouch-ts` | Pitch-preserving speed | ❌ not installed |
| `essentia.js` | BPM/key/mood analysis | ❌ not installed |
| `peerjs` | P2P sync rooms | ❌ not installed |
| `ably` | Global chat | ❌ not installed |
| `@emoji-mart/react` | Emoji picker | ❌ not installed |
| `next-pwa` | PWA / Service Worker | ❌ not installed |
| `@ffmpeg/ffmpeg` + `@ffmpeg/util` | Format fallback transcoder | ❌ not installed |

---

---

## Deferred to Next Session

These items were explicitly scoped out of session 3 because their underlying features are not yet built:

| Key | Action | Blocked On |
|-----|--------|------------|
| `E` | Toggle EQ panel | Feature 2 (10-band EQ) not built |
| `C` | Toggle chord timeline | Feature 4 (chord detection) not built |
| `B` | Toggle metronome | Feature 5 (BPM metronome) not built |

---

## What's Next (Recommended Build Order)

1. **Feature 2 — 10-Band Parametric EQ** — audio graph is in place; just insert `BiquadFilterNode` chain; unlocks `E` shortcut
2. **Feature 3 — BPM/Key/Mood Analysis** — unlocks Features 4, 5, 13, and Step 8 analysis chips
3. **Feature 4 — Chord Detection** — unlocks `C` shortcut
4. **Feature 5 — Metronome** — unlocks `B` shortcut
5. **Feature 10 — Media Session API** — small effort, huge perceived quality
6. **Feature 11 — Waveform Display** — visual anchor for A-B markers
7. **Feature 6 — Gapless Playback**
8. **Feature 15 — PWA**
9. **Features 7 (pitch shift), 8, 9, 13, 14** — advanced/networked features
