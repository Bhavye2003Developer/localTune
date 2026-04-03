# FineTune — Partial Tasks Completion Design

**Date:** 2026-04-03  
**Scope:** Complete all 🔶 partial tasks from PROGRESS.md (excluding Terrain mode, Scope mode — removed from spec)  
**Approach:** Layer-by-layer — Data → Controls → UI → Visual

---

## Removed from Spec

The following items have been removed from PROGRESS.md Feature 1 (Nebula Visualizer) as they are not needed:

- Terrain mode (3D mountain range, camera auto-fly)
- Scope mode (dual-channel oscilloscope, CRT phosphor shader)

---

## Layer 1 — Data

### 1a. Dexie Persistence

**File:** `app/lib/playerContext.tsx`, `app/lib/db.ts`

- `StoredTrack` schema already exists with correct fields (`fileId`, `name`, `title`, `artist`, `album`, `size`, `type`, `duration`).
- `url` and `coverUrl` are blob URLs (session-scoped) — never persisted.
- **On `loadFiles`:** for each file, check `db.tracks.where('fileId').equals(fileId).first()`. If found, pre-populate `title`/`artist`/`album`/`duration` immediately (no jsmediatags wait). Still run jsmediatags to get `coverUrl`.
- **After jsmediatags resolves:** call `db.tracks.put({ fileId, name, title, artist, album, size, type, duration })` to upsert.
- **After `loadedmetadata` fires** (duration known): call `db.tracks.update(fileId, { duration })`.
- Result: re-dropping the same files shows metadata instantly on repeat sessions.

### 1b. History Buffer

**File:** `app/lib/playerContext.tsx` (reducer + actions)

- Add `history: string[]` to `PlayerState` (max 50 IDs, circular — oldest dropped when full). Init: `[]`.
- Add `PUSH_HISTORY` action: `{ type: 'PUSH_HISTORY'; id: string }`.
- Push current track ID to history before any forward advance: `PLAY_NOW`, `NEXT_TRACK`, `TRACK_ENDED` (when advancing forward).
- **`PREV_TRACK` change:** if `queuePos > 0` → existing decrement behavior. If `queuePos === 0` and `history` non-empty → pop last from history, add it to front of queue, set `queuePos: 0`, `playing: true`.
- History is in-memory only — not persisted to Dexie.

---

## Layer 2 — Controls

### 2a. Speed Range Extension

**File:** `app/components/player/PlayerBar.tsx`

- Change `SPEEDS` from `[0.5, 0.75, 1, 1.25, 1.5, 2]` to `[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]`.
- No other changes — cycle logic and label display are already correct.

### 2b. Arrow-Key Seek on Focused Seek Bar

**File:** `app/components/player/PlayerBar.tsx`

- Add `tabIndex={0}` to the progress bar `<div>` (the outer hit-zone div with `ref={progressRef}`).
- Add `onKeyDown` handler: `ArrowLeft` → `seek(currentTime - 5)`, `ArrowRight` → `seek(currentTime + 5)`, both call `e.preventDefault()` and `e.stopPropagation()` (prevents double-fire with global shortcuts).
- Add minimal focus ring style (`focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30`) for accessibility feedback.

### 2c. Keyboard Shortcuts

**Files:** `app/hooks/useKeyboardShortcuts.ts`, `app/components/player/PlayerShell.tsx`

New shortcuts to implement:

| Key | Action | Implementation |
|-----|--------|----------------|
| `a` | Set loop A point at current position | Call `setLoopA()` from player context |
| `f` | Toggle native fullscreen | `document.documentElement.requestFullscreen()` / `document.exitFullscreen()` |
| `v` | Cycle viz mode (`nebula` → `album-color`) | Dispatch `CYCLE_VIZ_MODE` to player state |
| `?` | Open shortcuts overlay | Call `onOpenShortcuts()` callback |
| `/` | Focus library search input | Call `focusSearch()` callback |

**Hook signature change:** `useKeyboardShortcuts(opts: { onOpenShortcuts: () => void; focusSearch: () => void })` — callbacks passed from `PlayerShell`.

**`CYCLE_VIZ_MODE` action** added to reducer in `playerContext.tsx`:
- New `vizMode: 'nebula' | 'album-color'` field in `PlayerState`. Init: `'nebula'`.
- `CYCLE_VIZ_MODE` toggles between the two values.

**Deferred (next session):** `E` (EQ panel), `C` (chord timeline), `B` (metronome) — underlying features not yet built.

---

## Layer 3 — UI

### 3a. Search in TrackLibrary

**File:** `app/components/player/TrackLibrary.tsx`

- Add a controlled `query` state (`useState('')`).
- Render a search `<input>` above the virtualised list with a clear button (×) when non-empty.
- Filter: `tracks.filter(t => !query || [t.title, t.artist, t.album, t.name].some(s => s.toLowerCase().includes(query.toLowerCase())))`.
- Forward a `focusSearch` method via `useImperativeHandle` + `forwardRef` so `PlayerShell` can call it from the `/` shortcut.
- `PlayerShell` holds a `searchRef = useRef<{ focusSearch(): void }>(null)` and passes `focusSearch: () => searchRef.current?.focusSearch()` to `useKeyboardShortcuts`.

### 3b. Now Playing Panel

**New file:** `app/components/player/NowPlayingPanel.tsx`

- Triggered by clicking the album art + track info area in `PlayerBar` (wrap in a `<button onClick={onOpenNowPlaying}>`).
- `PlayerShell` adds `nowPlayingOpen: boolean` state; passes `onOpenNowPlaying` down to `PlayerBar`.
- Panel renders as `z-40` absolute overlay, centered, with:
  - Large album art (160×160, rounded-xl, Music icon fallback)
  - Title (large), artist, album (smaller)
  - Row of badges: format (from `track.type`, e.g. `audio/mpeg` → `MP3`), file size (formatted as `X.X MB`), duration (`M:SS`)
  - Dynamic background: if `coverUrl` exists → `color-thief-browser` `ColorThief.getColor()` → `rgb(r,g,b)` → radial gradient from that color at center to `#000` at edges
  - Close: `×` button top-right + `Escape` key
- `color-thief-browser` is already installed. Extract color inside a `useEffect` that watches `track?.coverUrl`, using an off-screen `<img>` element.
- No BPM/key/mood chips (Feature 3 dependency — deferred).

### 3c. Keyboard Shortcuts Overlay

**New file:** `app/components/player/KeyboardShortcutsOverlay.tsx`

- Modal (absolute overlay, `z-50`, backdrop blur) listing all currently-implemented shortcuts in a two-column grid.
- Triggered by `?` key (via `useKeyboardShortcuts`) or a `?` icon button added to the right section of `PlayerBar`.
- Dismissed by `Escape` or clicking outside the modal box.
- `PlayerShell` adds `shortcutsOpen: boolean` state; passes `onOpenShortcuts` to the keyboard hook.
- Shortcut list rendered as `<kbd>` tags with descriptions. Sections: Playback, Seek, Volume, Queue, Loop, Visualizer.

---

## Layer 4 — Visual

### 4a. Album Color Mode

**Files:** `app/lib/playerContext.tsx` (state), `app/components/visualizer/VisualizerContainer.tsx`, `app/components/visualizer/NebulaScene.tsx`

- `vizMode` already added to state in Layer 2c.
- `PlayerShell` passes `vizMode` to `VisualizerContainer` → `NebulaScene`.
- When `vizMode === 'album-color'` and current track has `coverUrl`:
  - `VisualizerContainer` renders an off-screen `<img src={coverUrl}>` and runs `ColorThief.getColor()` in a `useEffect`.
  - Extracted `[r, g, b]` normalized to `[0–1]` range → passed as `uColorTint: THREE.Color` uniform to `NebulaScene`.
- **GLSL change in `NebulaScene.tsx`:** add `uniform vec3 uColorTint` to fragment shader. Blend output color: `mix(baseColor, uColorTint, 0.65)` when `uColorTint` is non-white.
- When `vizMode === 'nebula'` or no cover art: `uColorTint` = `vec3(1.0)` (white — no visible change).
- `V` button in `PlayerBar` shows a filled color dot (using extracted color) when `vizMode === 'album-color'`.

### 4b. Bloom Post-Processing

**File:** `app/components/visualizer/VisualizerContainer.tsx` (or `NebulaScene.tsx`)

- Import `{ EffectComposer, Bloom }` from `@react-three/postprocessing` (already installed).
- Wrap scene content inside `<EffectComposer>` with `<Bloom intensity={0.4} luminanceThreshold={0.3} luminanceSmoothing={0.9} />`.
- **iOS guard:** `isIOS()` already exists in `app/lib/utils.ts`. Skip `EffectComposer` entirely on iOS — render children directly — to preserve the existing performance budget.
- No new state needed — bloom is always on for non-iOS.

---

## Files Changed Summary

| File | Change |
|------|--------|
| `app/lib/playerContext.tsx` | Dexie writes in `loadFiles`, history buffer in reducer, `vizMode` state + `CYCLE_VIZ_MODE` action |
| `app/lib/db.ts` | No schema change needed |
| `app/components/player/PlayerBar.tsx` | Speed array, arrow-key seek, track info click handler, `?` button, `onOpenNowPlaying` prop |
| `app/hooks/useKeyboardShortcuts.ts` | Add A, F, V, ?, / cases; accept `opts` callbacks |
| `app/components/player/TrackLibrary.tsx` | Search input + `forwardRef` + `focusSearch` imperative handle |
| `app/components/player/PlayerShell.tsx` | `nowPlayingOpen`, `shortcutsOpen`, `searchRef`; wire all callbacks |
| `app/components/player/NowPlayingPanel.tsx` | **New file** — Now Playing overlay |
| `app/components/player/KeyboardShortcutsOverlay.tsx` | **New file** — shortcuts modal |
| `app/components/visualizer/VisualizerContainer.tsx` | Pass `vizMode` + color tint; add Bloom |
| `app/components/visualizer/NebulaScene.tsx` | `uColorTint` uniform + GLSL color blend |
| `PROGRESS.md` | Remove Terrain/Scope, mark all partial tasks complete, defer E/C/B shortcuts |

---

## Out of Scope (this session)

- EQ panel (`E` shortcut), chord timeline (`C`), metronome (`B`) — deferred to next session when underlying features are built
- BPM/key/mood chips in Now Playing panel — deferred to Feature 3
- Dexie persistence of `coverUrl` — blob URLs are session-scoped; deferred until File System Access API or base64 storage is decided
