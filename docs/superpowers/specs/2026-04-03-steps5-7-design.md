# FineTune Steps 5–7 Design

**Date:** 2026-04-03  
**Scope:** Queue Management (Step 5), Keyboard Shortcuts (Step 6), Format Support (Step 7)  
**Status:** Approved — ready for implementation plan

---

## Step 5 — Queue Management

### State model change

Replace the unified `tracks[] + currentIdx` model with a separated library + queue model:

```ts
interface PlayerState {
  tracks: Track[];          // library — load order, never reordered
  queue: string[];          // ordered track IDs — the play order
  queuePos: number;         // index into queue[] of currently playing track (-1 = nothing)
  history: string[];        // circular buffer of last 50 played track IDs (for Previous)
  // ... rest unchanged
}
```

`currentIdx` is removed. `tracks` becomes a stable lookup map (find by id). The queue is the sole source of play order.

### Queue operations (added to playerContext)

| Operation | Behaviour |
|-----------|-----------|
| `playNow(id)` | Clear queue, push id, set queuePos 0, start playback |
| `playNext(id)` | Insert id at queuePos + 1 |
| `addToQueue(id)` | Append id to end of queue |
| `removeFromQueue(pos)` | Splice queue at position; adjust queuePos if needed |
| `clearQueue()` | Empty queue, stop playback |
| `reorderQueue(from, to)` | Move item from index → to index (dnd-kit callback) |

### Shuffle

`CYCLE_SHUFFLE` Fisher-Yates shuffles `queue[]` only. Library panel (`tracks[]`) is unaffected. The currently playing track stays at `queuePos 0` after shuffle.

### Loop modes

- **off** — advance queuePos; stop when end of queue reached
- **track** — re-queue same id at pos 0 on TRACK_ENDED
- **queue** — wrap queuePos back to 0 on TRACK_ENDED

### History (Previous button)

`history: string[]` stores the last 50 played track IDs. On `TRACK_ENDED` or `playNow`, push the outgoing track id onto history. `prev()` pops from history and plays that track via `playNow`.

### Auto-advance

`TRACK_ENDED` reducer reads `queue[queuePos + 1]`. If it exists, increments `queuePos` and sets playing. If not, checks `loopMode`.

### Queue sidebar

- Triggered by the Queue button in PlayerBar (currently a placeholder)
- Slides in from the right side of the screen (`absolute right-0 top-0 bottom-14 w-72`)
- Same visual style as the library panel (dark glass)
- Shows "Now Playing" section (current track, highlighted) then "Up Next" list
- Each row: track title, artist, drag handle, remove button
- Drag-to-reorder via `@dnd-kit/sortable`
- Right-click on any track in TrackLibrary → context menu: Play Now / Play Next / Add to Queue

### Packages to install

```
npm install @dnd-kit/core @dnd-kit/sortable
```

---

## Step 6 — Keyboard Shortcuts

### Architecture

A `useKeyboardShortcuts()` hook, mounted once in `PlayerShell` (inside `PlayerProvider`), so it has access to all player actions via `usePlayer()`.

Single `window.addEventListener('keydown', handler)` in a `useEffect`. Cleaned up on unmount.

### Guard condition

```ts
const tag = (e.target as HTMLElement).tagName;
if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
```

### Shortcut table

| Key | Action |
|-----|--------|
| `Space` | `togglePlay()` — prevent default to stop page scroll |
| `→` | `seek(pos + 5)` |
| `←` | `seek(pos - 5)` |
| `Shift+→` | `next()` |
| `Shift+←` | `prev()` |
| `↑` | `setVolume(min(1, volume + 0.05))` — prevent default |
| `↓` | `setVolume(max(0, volume - 0.05))` — prevent default |
| `M` | `toggleMute()` |
| `L` | `cycleLoopMode()` |
| `S` | `cycleShuffle()` |

### File

New file: `app/hooks/useKeyboardShortcuts.ts`  
Mounted in: `app/components/player/PlayerShell.tsx` (inside `PlayerInner`)

---

## Step 7 — Format Support

### Strategy: try-native-first

The `<audio>` element already handles MP3, FLAC, WAV, AAC/M4A, WebM, OGG (non-Safari), OPUS (non-Safari). No change needed for these.

For files that fail to play natively, an `error` event fires on the `<audio>` element. At that point, lazy-load `@ffmpeg/ffmpeg` and transcode to WebM.

### Flow

1. `audioEl.src = track.url` → `audioEl.load()` → `audioEl.play()`
2. If `error` event fires on `audioEl`:
   a. Show "Converting [filename]…" toast via `sonner`
   b. Dynamic `import('@ffmpeg/ffmpeg')` + `import('@ffmpeg/util')` (first call only — cached after)
   c. Fetch file bytes from the blob URL → pass to FFmpeg
   d. Transcode to WebM (`-c:a libopus`)
   e. Create new blob URL for the transcoded file
   f. Update `track.url` via `UPDATE_TRACK` dispatch
   g. Set `audioEl.src` to new URL → play
   h. Dismiss "Converting" toast; show success or error toast
3. If transcoding fails: show error toast "Could not play [filename] — format not supported", mark track with `error: true` in state

### Track type extension

```ts
export interface Track {
  // ... existing fields
  error?: boolean;   // true if file could not be decoded even after ffmpeg fallback
}
```

### Packages to install

```
npm install @ffmpeg/ffmpeg @ffmpeg/util
```

### Error toast (sonner)

Add `<Toaster />` from `sonner` to `app/layout.tsx`. Use `toast.loading()` for "Converting…" and `toast.error()` for failures.

---

## Files affected

| File | Change |
|------|--------|
| `app/lib/playerContext.tsx` | Refactor state: queue model, new actions, ffmpeg error handler |
| `app/components/player/PlayerShell.tsx` | Mount `useKeyboardShortcuts`, add queue sidebar |
| `app/components/player/PlayerBar.tsx` | Wire queue button to open sidebar |
| `app/components/player/TrackLibrary.tsx` | Add right-click context menu |
| `app/components/player/QueueSidebar.tsx` | New — dnd-kit sortable queue list |
| `app/hooks/useKeyboardShortcuts.ts` | New — global keydown handler |
| `app/layout.tsx` | Add `<Toaster />` |
| `app/types/` | Extend Track type if needed |

---

## What is NOT in scope

- Smart Shuffle (mood/energy awareness) — V1 ships True Random only
- Queue persistence to Dexie — in-memory for V1 (session resets)
- Keyboard shortcut overlay (`?` key) — Step 6 only covers the shortcuts themselves
- ffmpeg.wasm cross-origin isolation headers — documented separately if needed
