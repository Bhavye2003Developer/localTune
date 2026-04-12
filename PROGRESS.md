# FineTune V1 — Build Progress

> Spec source: `FineTune_V1_Spec-1.md`
> Last updated: 2026-04-12 (session 11 — Feature 3 BPM/Key/Mood/Energy analysis)

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete |
| 🔶 | Partial — works but spec items missing |
| ❌ | Not started |

---

## Recent Sessions

### Session 8 — Mobile redesign + UI cleanup (2026-04-12)
- Replaced 3-section desktop layout with tabbed mobile UX (Library / Queue / Player)
- Added `MobileBottomNav.tsx` — 3-tab bottom nav with active indicator line
- Added `InlineQueue.tsx` — replaces QueueSidebar in center column and mobile Queue tab
- Added `MiniPlayerStrip.tsx` — persistent mini player on Library/Queue tabs (Prev + Play + Next)
- Added `NowPlayingStage.tsx` — vinyl platter + track info above queue in desktop center column
- Added `VinylPlatter.tsx` — spinning vinyl animation component
- Added `TabStrip.tsx` — EQ / DSP / Marks toggle strip
- Removed Info tab from TabStrip (nothing to show yet)
- Removed Key/BPM/Mood placeholder chips from TrackLibrary, NowPlayingStage, PlayerBar
- Removed SmartPlaylists "coming soon" section from PlayerShell
- Fixed mobile PlayerBar loop button hidden (left section `w-28 sm:w-44`)
- Removed all scrollbars globally (globals.css: `scrollbar-width: none`)
- Fixed `QueueSidebar.tsx` is now dead code (InlineQueue replaced it) — kept file

### Session 9 — Loop + Marks + persistence fixes (2026-04-12)
- Fixed loop not working on mobile — `onEnded` now uses `setTimeout(0)` before `play()`
- Fixed Marks panel text clipping — switched to pure inline styles with `width:100%` + `boxSizing:border-box`
- Added file persistence via IndexedDB blob storage (150 MB cap, `db.fileBlobs` table)
- Added restore-on-mount effect in PlayerProvider — recreates object URLs on session start
- Added DB version 3 migration (`fileBlobs: 'fileId'` table)
- Fixed duplicate filtering in `loadFiles` — skips files already in library

### Session 11 — Feature 3: BPM/Key/Mood/Energy analysis (2026-04-12)
- Installed `essentia.js` package
- Created `app/lib/analysisWorker.ts` — Web Worker with lazy EssentiaWASM import; exports `buildCamelotKey`, `moodFromFeatures`, `analyseBuffer` for testing; full Camelot wheel lookup; mood heuristic from energy+danceability+key scale
- Created `app/lib/useAnalysisQueue.ts` — serial background queue; reads file blobs from `db.fileBlobs`, decodes via OfflineAudioContext, posts to Worker; writes results to `db.tracks`; dispatches `UPDATE_TRACK_ANALYSIS`; exposes `{ pending, total }` via `analysisProgress` on context
- Added Dexie v4 migration — extends `StoredTrack` with `keyScale`, `camelot`, `energy`, `danceability`, `lufs` (no new indexes, no upgrade function needed)
- Extended `Track` interface with all 8 analysis fields; added `UPDATE_TRACK_ANALYSIS` action + reducer case to playerContext
- `useAnalysisQueue` mounted inside `PlayerProvider` (has direct dispatch access); `analysisProgress` exposed on context value
- Restore-on-mount effect now restores analysis fields from Dexie for persisted tracks
- Updated `NowPlayingStage` — BPM chip (amber), Camelot+key chip (blue), mood chip (colour-coded), energy bar (green/amber/blue by level)
- Updated `TrackLibrary` header — shows "Analysing X/Y" in amber while queue is active
- Added `__tests__/analysisWorker.test.ts` (18 cases) and `__tests__/useAnalysisQueue.test.ts` (6 cases); zero regressions

### Session 10 — Delete feature + codebase audit (2026-04-12)
- Added `REMOVE_TRACK` action + reducer — resets player if deleting current track
- Added `removeTrack` callback — stops audio, revokes blob URLs, cleans IndexedDB
- Added hover trash icon in TrackLibrary rows (desktop `group-hover:opacity-100`)
- Added "Delete" option in TrackLibrary right-click / long-press context menu
- **Bug fixes found in audit:**
  - TrackLibrary: `group` class was missing on row div → trash button was permanently hidden
  - InlineQueue: remove button was `opacity-0` on mobile → changed to `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`
  - KeyboardShortcutsOverlay: 'D → Toggle DSP' was missing from SHORTCUTS list
  - PlayerBar: seek bar right-click A/B context menu missing (referenced in MarksPanel help text) → added
  - playerContext.tsx: `BLOB_STORAGE_LIMIT` const was declared before import block → moved after imports

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
| `app/components/player/QueueSidebar.tsx` | dnd-kit sortable queue sidebar — **dead code**, replaced by InlineQueue |
| `app/components/player/InlineQueue.tsx` | Inline queue list with dnd-kit reorder; used in desktop center + mobile Queue tab |
| `app/components/player/MobileBottomNav.tsx` | Mobile 3-tab bottom nav (Library / Queue / Player) |
| `app/components/player/MiniPlayerStrip.tsx` | Persistent mini player strip on Library/Queue mobile tabs |
| `app/components/player/NowPlayingStage.tsx` | Now Playing section — vinyl platter + track info + chips |
| `app/components/player/VinylPlatter.tsx` | Spinning vinyl record animation component |
| `app/components/player/TabStrip.tsx` | EQ / DSP / Marks toggle tab strip |
| `app/lib/eqPresets.ts` | Band/EQState interfaces, INITIAL_BANDS (10 bands), BUILTIN_PRESETS (8), eqReducer |
| `app/components/eq/EQCurve.tsx` | SVG EQ curve — 512 log-spaced points, mathematical biquad transfer function, draggable dots |
| `app/components/eq/EQPanel.tsx` | EQ drawer shell — useReducer, bypass toggle, preset chips, Dexie save |
| `app/hooks/useKeyboardShortcuts.ts` | Global keydown handler — Space/arrows/M/L/S/E/F/V/A//?/? |
| `app/lib/dsp.ts` | DSP node creation, wiring, bypass, rewire, mutation, persistence |
| `app/components/dsp/DSPPanel.tsx` | DSP chain drawer — sortable stage cards |
| `app/components/dsp/DspCard.tsx` | Shared card wrapper with bypass toggle + drag handle |
| `app/components/dsp/stages/*.tsx` | Per-stage UI components (6 stages) |
| `public/ir/*.wav` | Impulse response WAVs for ConvolverNode |
| `__tests__/playerReducer.test.ts` | Pure reducer unit tests (31 cases) |
| `__tests__/eqReducer.test.ts` | EQ reducer unit tests (12 cases) |
| `__tests__/playerContext.eq.test.ts` | EQ audio chain tests (6 cases) |
| `__tests__/EQCurve.test.tsx` | EQCurve component + math tests (14 cases) |
| `__tests__/EQPanel.test.tsx` | EQPanel component tests (11 cases) |
| `__tests__/useKeyboardShortcuts.test.tsx` | Hook unit tests (17 cases) |
| `__tests__/visualizer.test.tsx` | Visualizer component tests (7 cases) |
| `app/lib/analysisWorker.ts` | Web Worker — essentia.js WASM BPM/Key/Mood/Energy; exports pure functions for testing |
| `app/lib/useAnalysisQueue.ts` | Background analysis queue hook; reads blobs, posts to Worker, writes Dexie, dispatches results |
| `__tests__/analysisWorker.test.ts` | Analysis worker pure function tests (18 cases) |
| `__tests__/useAnalysisQueue.test.ts` | Analysis queue hook tests (6 cases) |
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
- [x] Right-click progress bar → context menu to set A or B at clicked timestamp

---

### Step 5 — Queue Management ✅

- [x] Play Now / Play Next / Add to Queue / Remove / Clear
- [x] Queue sidebar (accessible from Queue button in PlayerBar)
- [x] Auto-advance respects queue order
- [x] Shuffle modes affect queue (library order preserved — tracks[] never reordered)
- [x] History buffer — 50-track circular history; Previous pops from history

---

### Step 6 — Keyboard Shortcuts ✅ (partial — C and B still pending Features 4/5)

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
| `E` | Toggle EQ panel | ✅ |
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

### Step 8 — Now Playing Metadata Display ✅

- [x] Full-screen Now Playing panel (`NowPlayingPanel.tsx`, triggered by album-art click)
- [x] Large album art centered (160×160, with Music fallback icon)
- [x] Dynamic background gradient from `color-thief-browser` dominant color
- [x] BPM chip, Camelot key badge, energy bar, mood chip (Feature 3 — essentia.js)
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

### Feature 2 — 10-Band Parametric EQ ✅

- [x] 10 `BiquadFilterNode` bands in Web Audio graph (`src → analyser → eq[0..9] → gainNode → destination`)
- [x] Per-band: ±15dB gain, Q factor, type (lowshelf/peaking/highshelf)
- [x] Low shelf (band 1, 32Hz), high shelf (band 10, 16kHz), peaking (bands 2–9)
- [x] Live SVG frequency response curve — 512 log-spaced points, mathematical biquad transfer function
- [x] Draggable dots on curve — vertical drag changes gain, double-click resets to 0
- [x] Presets: Flat, Bass Boost, Vocal Presence, Hip-Hop, Electronic, Classical, Podcast, Acoustic
- [x] Custom preset save/load via Dexie `eqPresets` table
- [x] Full EQ bypass (zeros all gains, restores on un-bypass — no audio click)
- [x] EQ drawer slides above PlayerBar (`h-[210px]`, `bottom: 3.5rem`, CSS transition)
- [x] `E` keyboard shortcut toggles EQ panel
- [x] Multi-preset selection — multiple preset chips active simultaneously; gains are summed (clamped ±15 dB)
- [x] Per-preset saved configs — manual band tweaks saved per active preset combination; restored when you return to the same preset(s)
- [x] "Flat" is now a dedicated reset button; all other presets are toggleable

---

### Feature 3 — BPM + Key + Mood Analysis ✅

- [x] `essentia.js` WASM in a Web Worker (`app/lib/analysisWorker.ts`)
- [x] Per-track: BPM, musical key (+ Camelot), energy, danceability, mood, LUFS
- [x] Background analysis queue with progress indicator (`useAnalysisQueue` → `analysisProgress`)
- [x] Results displayed as chips on NowPlayingStage (BPM, Camelot, mood, energy bar)
- [x] Cache results in Dexie v4 keyed by `fileId`; restored on session reload

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

### Feature 8 — Full DSP Signal Chain ✅

- [x] ReplayGain (read `REPLAYGAIN_TRACK_GAIN` tag)
- [x] Bass Engine (sub-bass shelf, bass compressor, mono bass mode, harmonic enhancer)
- [x] Parametric EQ nodes (same as Feature 2)
- [x] Compressor (`DynamicsCompressorNode` with full controls + GR meter)
- [x] Stereo Widener (`AudioWorkletProcessor` M-S matrix)
- [x] Convolution Reverb (`ConvolverNode` + 4 IR WAV presets in `/public/ir/`)
- [x] Brickwall Limiter at -0.1 dBFS
- [x] Drag-to-reorder DSP chain

---

### Feature 9 — P2P Listen Together ❌

- [ ] PeerJS room creation + 6-char room code
- [ ] Host → guest playback state sync via WebRTC DataChannel
- [ ] Track matching by `title + artist + duration` hash
- [ ] Live text chat, emoji reactions, queue display
- [ ] Re-sync button

---

### Feature 10 — Media Session API ✅

- [x] `navigator.mediaSession` metadata (title, artist, album, artwork)
- [x] Handlers: play, pause, previoustrack, nexttrack, seekto
- [x] Updates on every track change
- [x] Cover art passed as MediaSession artwork

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
| `essentia.js` | BPM/key/mood analysis | ✅ |
| `peerjs` | P2P sync rooms | ❌ not installed |
| `ably` | Global chat | ❌ not installed |
| `@emoji-mart/react` | Emoji picker | ❌ not installed |
| `next-pwa` | PWA / Service Worker | ❌ not installed |
| `@ffmpeg/ffmpeg` + `@ffmpeg/util` | Format fallback transcoder | ❌ not installed |

---

---

## Performance Fixes (session 5)

- `audioData.tsx`: Pre-allocated `Uint8Array` buffers (reused every RAF frame) — eliminated 3,600+ GC allocations/min; `musicalKey` via ref instead of effect dependency to avoid RAF restart
- `EQCurve.tsx`: Wrapped in `React.memo`; memoized 512-point biquad path with `useMemo(bands)`; static grid elements hoisted to module level; `bandsRef` stabilizes pointer callbacks
- `EQPanel.tsx`: Wrapped in `React.memo` — prevents re-renders from parent TICK dispatches
- `PlayerBar.tsx`: Wrapped in `React.memo`
- `VisualizerContainer.tsx`: Wrapped in `React.memo` — prevents Canvas re-creation on parent state changes
- `NebulaScene.tsx`: `isIOS()` call moved to module-level constant (was called every render); removed no-op `useEffect`
- `PlayerShell.tsx`: `currentTrack` wrapped in `useMemo`; all inline arrow handlers replaced with `useCallback`
- `vitest.config.ts`: Excluded `.worktrees/**` from test runs to fix phantom failures
- `app/types/color-thief-browser.d.ts`: Added missing type declaration — fixes production build TS error

---

## Mobile Responsiveness (session 6)

All UI components now work on screens < 640px with ≥ 44px touch targets.

- `PlayerBar.tsx`: Two-row layout on mobile (transport row + secondary row); `overflow-x-auto` on secondary; all icon buttons 44×44px (`w-11 h-11`); `pb-safe` for iOS notch; progress bar thumb enlarged; context menu clamped to viewport
- `PlayerShell.tsx`: Flex-column layout — EQ drawer stacks naturally above PlayerBar; Library panel is `w-full` on mobile (full-screen overlay); all inline handlers replaced with `useCallback`
- `QueueSidebar.tsx`: `w-full sm:w-72`; remove button always visible on mobile (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`)
- `NowPlayingPanel.tsx`: `w-full sm:w-80`; `rounded-none sm:rounded-2xl`; `border-0 sm:border`; `max-h-full overflow-y-auto`
- `KeyboardShortcutsOverlay.tsx`: `w-full mx-4 sm:w-80`; `max-h-[80vh] overflow-y-auto`; added `E → Toggle EQ` entry
- `EQPanel.tsx`: Preset chips `overflow-x-auto sm:flex-wrap`; buttons `py-1 shrink-0 touch-manipulation`
- `TrackLibrary.tsx`: Long-press (500ms) opens context menu on mobile; menu position clamped to viewport; menu buttons `py-2.5 touch-manipulation` (44px)
- `VisualizerContainer.tsx`: Mobile key picker toggle button; grid hidden on mobile until toggled; grid buttons `w-8 h-8` on mobile
- `app/globals.css`: `.pb-safe` utility; `overscroll-behavior: none` on html/body
- `app/layout.tsx`: `viewport` moved to separate `export const viewport: Viewport` (Next.js 16 API)

---

## What's Next (Recommended Build Order)

1. **Feature 3 — BPM/Key/Mood Analysis** — unlocks Features 4, 5, 13, and Step 8 analysis chips
3. **Feature 4 — Chord Detection** — unlocks `C` shortcut
4. **Feature 5 — Metronome** — unlocks `B` shortcut
5. **Feature 10 — Media Session API** — small effort, huge perceived quality
6. **Feature 11 — Waveform Display** — visual anchor for A-B markers
7. **Feature 6 — Gapless Playback**
8. **Feature 15 — PWA**
9. **Features 7 (pitch shift), 8, 9, 13, 14** — advanced/networked features
