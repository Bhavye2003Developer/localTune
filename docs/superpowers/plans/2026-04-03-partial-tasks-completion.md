# FineTune Partial Tasks Completion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all 🔶 partial tasks in PROGRESS.md — Dexie persistence, history buffer, speed range, arrow-key seek, keyboard shortcuts (A/F/V/?//), search, Now Playing panel, shortcuts overlay, album color mode, and bloom.

**Architecture:** Layer-by-layer — data (reducer + Dexie) → controls (speed, seek, shortcuts) → UI (search, panels) → visual (album color, bloom). Each layer builds on the previous. `playerContext.tsx` owns all state; components consume via `usePlayer()`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Dexie 4, `@react-three/fiber`, `@react-three/postprocessing`, `color-thief-browser`, Vitest + Testing Library

---

## File Map

| File | Change |
|------|--------|
| `PROGRESS.md` | Remove Terrain/Scope entries; mark partials done; note E/C/B deferred |
| `app/lib/playerContext.tsx` | history buffer, vizMode state, cycleVizMode action, Dexie writes in loadFiles |
| `app/lib/db.ts` | No schema change |
| `app/components/player/PlayerBar.tsx` | Speed array, arrow-key seek, track-info click, `?` button, new props |
| `app/hooks/useKeyboardShortcuts.ts` | Add A/F/V/?// cases; accept `opts` param |
| `app/components/player/TrackLibrary.tsx` | Search input + `forwardRef` + `focusSearch` handle |
| `app/components/player/PlayerShell.tsx` | `nowPlayingOpen`, `shortcutsOpen`, `searchRef`; wire callbacks |
| `app/components/player/NowPlayingPanel.tsx` | **New** — overlay with art, metadata, color-thief background |
| `app/components/player/KeyboardShortcutsOverlay.tsx` | **New** — shortcuts modal |
| `app/components/visualizer/VisualizerContainer.tsx` | Accept `vizMode` + `coverUrl`; extract album color; add Bloom |
| `app/components/visualizer/NebulaScene.tsx` | `uColorTint` uniform + GLSL fragment color blend; accept `colorTint` prop |
| `__tests__/playerReducer.test.ts` | Tests for PUSH_HISTORY, CYCLE_VIZ_MODE, PREV_TRACK with history |
| `__tests__/useKeyboardShortcuts.test.tsx` | Tests for a/f/v/?// keys |

---

## Task 1: PROGRESS.md Cleanup + Green Baseline

**Files:**
- Modify: `PROGRESS.md`

- [ ] **Step 1: Verify tests are green before touching code**

```bash
cd c:/Users/Bhavye/Desktop/finetune
npx vitest run
```
Expected: All 35 tests pass. If any fail, stop and fix before continuing.

- [ ] **Step 2: Remove Terrain mode and Scope mode entries from Feature 1 in PROGRESS.md**

In the Feature 1 section, remove these two lines:
```
- [ ] Terrain mode (3D mountain range, camera auto-fly)
- [ ] Scope mode (dual-channel oscilloscope, CRT phosphor shader)
```

- [ ] **Step 3: Note E/C/B shortcuts deferred in Step 6 table**

Change the three rows in the Step 6 table:
```markdown
| `E` | Toggle EQ panel | ❌ Deferred — next session (Feature 2 not built) |
| `C` | Toggle chord timeline | ❌ Deferred — next session (Feature 4 not built) |
| `B` | Toggle metronome | ❌ Deferred — next session (Feature 5 not built) |
```

- [ ] **Step 4: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: remove terrain/scope from spec; note E/C/B shortcuts deferred"
```

---

## Task 2: Reducer — History Buffer

**Files:**
- Modify: `app/lib/playerContext.tsx`
- Test: `__tests__/playerReducer.test.ts`

- [ ] **Step 1: Write failing tests for history buffer**

Append to `__tests__/playerReducer.test.ts`:

```typescript
describe('reducer — history buffer', () => {
  it('PUSH_HISTORY appends id to history', () => {
    const next = reducer(INITIAL, { type: 'PUSH_HISTORY', id: 'a' });
    expect(next.history).toEqual(['a']);
  });

  it('PUSH_HISTORY caps at 50 entries (drops oldest)', () => {
    let s = INITIAL;
    for (let i = 0; i < 52; i++) s = reducer(s, { type: 'PUSH_HISTORY', id: `t${i}` });
    expect(s.history).toHaveLength(50);
    expect(s.history[0]).toBe('t2');  // oldest two dropped
    expect(s.history[49]).toBe('t51');
  });

  it('PREV_TRACK pops from history when queuePos is 0', () => {
    const s = {
      ...INITIAL,
      queue: ['b'],
      queuePos: 0,
      history: ['a'],
      playing: true,
    };
    const next = reducer(s, { type: 'PREV_TRACK' });
    expect(next.queue[0]).toBe('a');
    expect(next.queuePos).toBe(0);
    expect(next.playing).toBe(true);
    expect(next.history).toEqual([]);
  });

  it('PREV_TRACK does nothing when queuePos 0 and history empty', () => {
    const s = { ...INITIAL, queue: ['a'], queuePos: 0, history: [] };
    const next = reducer(s, { type: 'PREV_TRACK' });
    expect(next).toBe(s);
  });

  it('PLAY_NOW pushes previous current track to history', () => {
    const s = { ...INITIAL, queue: ['a'], queuePos: 0, history: [] };
    const next = reducer(s, { type: 'PLAY_NOW', id: 'b' });
    expect(next.history).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/playerReducer.test.ts
```
Expected: 5 new tests fail with "Property 'history' does not exist" or similar.

- [ ] **Step 3: Add `history` to PlayerState and INITIAL**

In `app/lib/playerContext.tsx`, add to `PlayerState` interface (after `musicalKey`):
```typescript
  history: string[];
```

Add to `INITIAL`:
```typescript
  history: [],
```

- [ ] **Step 4: Add PUSH_HISTORY to Action union**

In the `Action` type union, add:
```typescript
  | { type: 'PUSH_HISTORY'; id: string }
```

- [ ] **Step 5: Implement PUSH_HISTORY, update PLAY_NOW and PREV_TRACK in reducer**

Replace the existing `PLAY_NOW` case:
```typescript
    case 'PLAY_NOW': {
      const currentId = state.queue[state.queuePos];
      const newHistory = currentId
        ? [...state.history, currentId].slice(-50)
        : state.history;
      return { ...state, queue: [action.id], queuePos: 0, playing: true, position: 0, history: newHistory };
    }
```

Replace the existing `PREV_TRACK` case:
```typescript
    case 'PREV_TRACK': {
      if (state.queuePos > 0) {
        return { ...state, queuePos: state.queuePos - 1, playing: true, position: 0 };
      }
      if (state.history.length > 0) {
        const prev = state.history[state.history.length - 1];
        const newHistory = state.history.slice(0, -1);
        return { ...state, queue: [prev, ...state.queue], queuePos: 0, playing: true, position: 0, history: newHistory };
      }
      return state;
    }
```

Add the `PUSH_HISTORY` case in the reducer switch (before `default`):
```typescript
    case 'PUSH_HISTORY': {
      const newHistory = [...state.history, action.id].slice(-50);
      return { ...state, history: newHistory };
    }
```

Update `NEXT_TRACK` to push history before advancing:
```typescript
    case 'NEXT_TRACK': {
      const currentId = state.queue[state.queuePos];
      const newHistory = currentId ? [...state.history, currentId].slice(-50) : state.history;
      const next = state.queuePos + 1;
      if (next < state.queue.length) return { ...state, queuePos: next, playing: true, position: 0, history: newHistory };
      if (state.loopMode === 'queue') return { ...state, queuePos: 0, playing: true, position: 0, history: newHistory };
      return { ...state, playing: false, history: newHistory };
    }
```

Update `TRACK_ENDED` to push history before advancing forward:
```typescript
    case 'TRACK_ENDED': {
      const { loopMode, queuePos, queue } = state;
      if (loopMode === 'track') return { ...state, playing: true, position: 0 };
      const currentId = queue[queuePos];
      const newHistory = currentId ? [...state.history, currentId].slice(-50) : state.history;
      const next = queuePos + 1;
      if (next < queue.length) return { ...state, queuePos: next, playing: true, position: 0, history: newHistory };
      if (loopMode === 'queue') return { ...state, queuePos: 0, playing: true, position: 0, history: newHistory };
      return { ...state, playing: false, history: newHistory };
    }
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run __tests__/playerReducer.test.ts
```
Expected: All reducer tests pass (28+ total).

- [ ] **Step 7: Commit**

```bash
git add app/lib/playerContext.tsx __tests__/playerReducer.test.ts
git commit -m "feat: add 50-track circular history buffer to player reducer"
```

---

## Task 3: Reducer — vizMode + cycleVizMode

**Files:**
- Modify: `app/lib/playerContext.tsx`
- Test: `__tests__/playerReducer.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `__tests__/playerReducer.test.ts`:

```typescript
describe('reducer — vizMode', () => {
  it('initial vizMode is nebula', () => {
    expect(INITIAL.vizMode).toBe('nebula');
  });

  it('CYCLE_VIZ_MODE toggles nebula → album-color', () => {
    const next = reducer(INITIAL, { type: 'CYCLE_VIZ_MODE' });
    expect(next.vizMode).toBe('album-color');
  });

  it('CYCLE_VIZ_MODE toggles album-color → nebula', () => {
    const s = { ...INITIAL, vizMode: 'album-color' as const };
    const next = reducer(s, { type: 'CYCLE_VIZ_MODE' });
    expect(next.vizMode).toBe('nebula');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/playerReducer.test.ts
```
Expected: 3 new tests fail.

- [ ] **Step 3: Add VizMode type, state field, INITIAL value**

In `app/lib/playerContext.tsx`, add after the `LoopMode` type:
```typescript
export type VizMode = 'nebula' | 'album-color';
```

Add to `PlayerState` interface (after `musicalKey`):
```typescript
  vizMode: VizMode;
```

Add to `INITIAL`:
```typescript
  vizMode: 'nebula',
```

- [ ] **Step 4: Add CYCLE_VIZ_MODE to Action union and reducer**

Add to the `Action` union:
```typescript
  | { type: 'CYCLE_VIZ_MODE' }
```

Add case to reducer (before `default`):
```typescript
    case 'CYCLE_VIZ_MODE':
      return { ...state, vizMode: state.vizMode === 'nebula' ? 'album-color' : 'nebula' };
```

- [ ] **Step 5: Expose cycleVizMode in context value**

Add to `PlayerContextValue` interface:
```typescript
  cycleVizMode: () => void;
```

Add the callback in the provider (after `setKey`):
```typescript
  const cycleVizMode = useCallback(() => dispatch({ type: 'CYCLE_VIZ_MODE' }), []);
```

Add to the context value object:
```typescript
      cycleVizMode,
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run __tests__/playerReducer.test.ts
```
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/lib/playerContext.tsx __tests__/playerReducer.test.ts
git commit -m "feat: add vizMode state and CYCLE_VIZ_MODE action to player"
```

---

## Task 4: Dexie Persistence in loadFiles

**Files:**
- Modify: `app/lib/playerContext.tsx`

- [ ] **Step 1: Wire Dexie pre-population and upsert in loadFiles**

In `app/lib/playerContext.tsx`, add the import at the top:
```typescript
import { db } from './db';
```

Replace the entire `loadFiles` callback with:
```typescript
  const loadFiles = useCallback(async (files: FileList | File[]) => {
    const wasNull = !audioEl;
    ensureAudio();
    if (wasNull) attachAudioEvents(dispatch, getState);
    if (audioCtx?.state === 'suspended') audioCtx.resume();
    const arr = Array.from(files).filter(
      f => f.type.startsWith('audio/') || f.type.startsWith('video/')
    );
    if (arr.length === 0) return;

    // Pre-populate from Dexie for files we've seen before
    const storedMap = new Map<string, { title: string; artist: string; album: string; duration: number }>();
    await Promise.all(arr.map(async f => {
      const fileId = `${f.name}-${f.size}`;
      const stored = await db.tracks.where('fileId').equals(fileId).first();
      if (stored) storedMap.set(fileId, { title: stored.title, artist: stored.artist ?? '', album: stored.album ?? '', duration: stored.duration });
    }));

    const tracks: Track[] = arr.map(f => {
      const fileId = `${f.name}-${f.size}`;
      const cached = storedMap.get(fileId);
      return {
        id: fileId,
        name: f.name,
        title: cached?.title ?? f.name.replace(/\.[^/.]+$/, ''),
        artist: cached?.artist ?? '',
        album: cached?.album ?? '',
        size: f.size,
        type: f.type,
        url: URL.createObjectURL(f),
        coverUrl: '',
        duration: cached?.duration ?? 0,
      };
    });
    dispatch({ type: 'ADD_TRACKS', tracks });

    tracks.forEach((track, i) => {
      readTags(arr[i]).then(meta => {
        const patch: Partial<Track> = {};
        if (meta.title) patch.title = meta.title;
        if (meta.artist) patch.artist = meta.artist;
        if (meta.album) patch.album = meta.album;
        if (meta.coverUrl) patch.coverUrl = meta.coverUrl;
        if (Object.keys(patch).length > 0) dispatch({ type: 'UPDATE_TRACK', id: track.id, patch });

        // Upsert metadata to Dexie (no blob URLs — session-scoped)
        db.tracks.put({
          fileId: track.id,
          name: track.name,
          title: patch.title ?? track.title,
          artist: patch.artist ?? track.artist,
          album: patch.album ?? track.album,
          size: track.size,
          type: track.type,
          duration: track.duration,
        }).catch(() => {}); // non-fatal
      });
    });

    // Update duration in Dexie once loadedmetadata fires
    // We wire this via UPDATE_TRACK — a useEffect watches duration changes and writes back
  }, []);
```

- [ ] **Step 2: Add a useEffect to persist duration updates back to Dexie**

After the existing speed `useEffect` in the provider, add:
```typescript
  // Persist duration to Dexie when loadedmetadata fires (duration becomes known)
  useEffect(() => {
    state.tracks.forEach(t => {
      if (t.duration > 0) {
        db.tracks.where('fileId').equals(t.id).modify({ duration: t.duration }).catch(() => {});
      }
    });
  }, [state.tracks]);
```

- [ ] **Step 3: Run existing tests**

```bash
npx vitest run
```
Expected: All tests pass (Dexie is not imported in tests — mocked by jsdom env, which returns undefined for IndexedDB operations; the `.catch(() => {})` guards prevent test failures).

- [ ] **Step 4: Commit**

```bash
git add app/lib/playerContext.tsx
git commit -m "feat: persist track metadata to Dexie; pre-populate on re-drop"
```

---

## Task 5: Speed Range Extension

**Files:**
- Modify: `app/components/player/PlayerBar.tsx`

- [ ] **Step 1: Update SPEEDS array**

In `app/components/player/PlayerBar.tsx`, replace line:
```typescript
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
```
with:
```typescript
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
```

- [ ] **Step 2: Update speed label to handle non-integer values**

Replace the `speedLabel` line:
```typescript
const speedLabel = speed === 1 ? '1×' : `${speed}×`;
```
with:
```typescript
const speedLabel = `${speed}×`;
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/components/player/PlayerBar.tsx
git commit -m "feat: extend speed range to 0.25×–4.0×"
```

---

## Task 6: Arrow-Key Seek on Focused Seek Bar

**Files:**
- Modify: `app/components/player/PlayerBar.tsx`

- [ ] **Step 1: Add tabIndex and onKeyDown to progress bar div**

In `app/components/player/PlayerBar.tsx`, find the outer progress bar div (the one with `ref={progressRef}` and `className="relative cursor-pointer group py-1.5"`).

Add `tabIndex={0}` and an `onKeyDown` handler and a focus ring class:

```tsx
      <div
        ref={progressRef}
        tabIndex={0}
        className="relative cursor-pointer group py-1.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={onContextMenu}
        onKeyDown={useCallback((e: React.KeyboardEvent) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          e.stopPropagation();
          const el = getAudioEl();
          if (!el || !duration) return;
          seek(e.key === 'ArrowRight' ? el.currentTime + 5 : Math.max(0, el.currentTime - 5));
        }, [duration, seek])}
      >
```

Note: The `useCallback` must be extracted as a named callback outside JSX. Replace the inline approach with a proper named callback. Add this above the `return` statement:

```typescript
  const onSeekBarKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    e.stopPropagation();
    const el = getAudioEl();
    if (!el || !duration) return;
    seek(e.key === 'ArrowRight' ? el.currentTime + 5 : Math.max(0, el.currentTime - 5));
  }, [duration, seek]);
```

And use it on the div:
```tsx
        onKeyDown={onSeekBarKeyDown}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/components/player/PlayerBar.tsx
git commit -m "feat: arrow-key seek on focused progress bar"
```

---

## Task 7: Keyboard Shortcuts — A / F / V / ? / /

**Files:**
- Modify: `app/hooks/useKeyboardShortcuts.ts`
- Test: `__tests__/useKeyboardShortcuts.test.tsx`

- [ ] **Step 1: Write failing tests**

Append to `__tests__/useKeyboardShortcuts.test.tsx`:

```typescript
describe('useKeyboardShortcuts — new shortcuts', () => {
  const mockActions = {
    togglePlay: vi.fn(),
    seek: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    cycleLoopMode: vi.fn(),
    cycleShuffle: vi.fn(),
    cycleVizMode: vi.fn(),
    setLoopA: vi.fn(),
    state: { volume: 0.5, muted: false },
  };

  const mockAudioEl = { currentTime: 30, duration: 180 } as HTMLAudioElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(playerContext.usePlayer).mockReturnValue(mockActions as ReturnType<typeof playerContext.usePlayer>);
    vi.mocked(playerContext.getAudioEl).mockReturnValue(mockAudioEl);
  });

  it('a fires setLoopA', () => {
    const opts = { onOpenShortcuts: vi.fn(), focusSearch: vi.fn() };
    renderHook(() => useKeyboardShortcuts(opts));
    fireKey('a');
    expect(mockActions.setLoopA).toHaveBeenCalledOnce();
  });

  it('v fires cycleVizMode', () => {
    const opts = { onOpenShortcuts: vi.fn(), focusSearch: vi.fn() };
    renderHook(() => useKeyboardShortcuts(opts));
    fireKey('v');
    expect(mockActions.cycleVizMode).toHaveBeenCalledOnce();
  });

  it('? fires onOpenShortcuts callback', () => {
    const opts = { onOpenShortcuts: vi.fn(), focusSearch: vi.fn() };
    renderHook(() => useKeyboardShortcuts(opts));
    fireKey('?');
    expect(opts.onOpenShortcuts).toHaveBeenCalledOnce();
  });

  it('/ fires focusSearch callback', () => {
    const opts = { onOpenShortcuts: vi.fn(), focusSearch: vi.fn() };
    renderHook(() => useKeyboardShortcuts(opts));
    fireKey('/');
    expect(opts.focusSearch).toHaveBeenCalledOnce();
  });

  it('f toggles fullscreen (calls requestFullscreen)', () => {
    const opts = { onOpenShortcuts: vi.fn(), focusSearch: vi.fn() };
    const mockRequestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: mockRequestFullscreen, configurable: true,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      value: null, configurable: true,
    });
    renderHook(() => useKeyboardShortcuts(opts));
    fireKey('f');
    expect(mockRequestFullscreen).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run to verify failures**

```bash
npx vitest run __tests__/useKeyboardShortcuts.test.tsx
```
Expected: 5 new tests fail.

- [ ] **Step 3: Update useKeyboardShortcuts signature and add new cases**

Replace the entire contents of `app/hooks/useKeyboardShortcuts.ts`:

```typescript
import { useEffect, useRef } from 'react';
import { usePlayer, getAudioEl } from '../lib/playerContext';

interface ShortcutOpts {
  onOpenShortcuts?: () => void;
  focusSearch?: () => void;
}

export function useKeyboardShortcuts(opts: ShortcutOpts = {}) {
  const player = usePlayer();
  const playerRef = useRef(player);
  useEffect(() => { playerRef.current = player; });

  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; });

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;

      const { togglePlay, seek, next, prev, setVolume, toggleMute, cycleLoopMode, cycleShuffle, cycleVizMode, setLoopA, state } = playerRef.current;
      const el = getAudioEl();
      const currentTime = el?.currentTime ?? 0;
      const { volume } = state;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) { next(); }
          else { seek(currentTime + 5); }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) { prev(); }
          else { seek(Math.max(0, currentTime - 5)); }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.05));
          break;
        case 'm':
          toggleMute();
          break;
        case 'l':
          cycleLoopMode();
          break;
        case 's':
          cycleShuffle();
          break;
        case 'a':
          setLoopA();
          break;
        case 'v':
          cycleVizMode();
          break;
        case 'f':
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          break;
        case '?':
          optsRef.current.onOpenShortcuts?.();
          break;
        case '/':
          e.preventDefault();
          optsRef.current.focusSearch?.();
          break;
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass (existing tests still call `useKeyboardShortcuts()` with no args — the default `{}` opts means no regressions).

- [ ] **Step 5: Commit**

```bash
git add app/hooks/useKeyboardShortcuts.ts __tests__/useKeyboardShortcuts.test.tsx
git commit -m "feat: add A/F/V/?// keyboard shortcuts"
```

---

## Task 8: TrackLibrary Search Input

**Files:**
- Modify: `app/components/player/TrackLibrary.tsx`

- [ ] **Step 1: Add forwardRef, search state, and focusSearch handle**

Replace the entire contents of `app/components/player/TrackLibrary.tsx`:

```typescript
'use client';

import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Music, Play, Search, X } from 'lucide-react';
import { usePlayer, formatTime } from '../../lib/playerContext';

export interface TrackLibraryHandle {
  focusSearch(): void;
}

export const TrackLibrary = forwardRef<TrackLibraryHandle>(function TrackLibrary(_, ref) {
  const { state, playNow, playNext, addToQueue } = usePlayer();
  const { tracks, queue, queuePos, playing } = state;
  const currentId = queue[queuePos] ?? null;
  const parentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useImperativeHandle(ref, () => ({
    focusSearch: () => searchRef.current?.focus(),
  }));

  const filtered = query
    ? tracks.filter(t =>
        [t.title, t.artist, t.album, t.name].some(s =>
          s.toLowerCase().includes(query.toLowerCase())
        )
      )
    : tracks;

  const [menu, setMenu] = useState<{ visible: boolean; x: number; y: number; trackId: string }>({
    visible: false, x: 0, y: 0, trackId: '',
  });

  const closeMenu = useCallback(() => setMenu(m => ({ ...m, visible: false })), []);

  useEffect(() => {
    if (!menu.visible) return;
    window.addEventListener('pointerdown', closeMenu);
    return () => window.removeEventListener('pointerdown', closeMenu);
  }, [menu.visible, closeMenu]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 5,
  });

  if (tracks.length === 0) return null;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Search bar */}
      <div className="px-3 py-1.5 relative">
        <Search size={11} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full bg-white/6 border border-white/10 rounded-md text-xs text-white/70 placeholder-white/25 pl-6 pr-6 py-1 focus:outline-none focus:border-white/25 focus:bg-white/8 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
          >
            <X size={11} />
          </button>
        )}
      </div>

      <div className="px-3 py-1 text-white/30 text-[10px] tracking-widest uppercase">
        {query ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}` : `Library — ${tracks.length} track${tracks.length !== 1 ? 's' : ''}`}
      </div>

      <div ref={parentRef} className="flex-1 overflow-y-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(vItem => {
            const track = filtered[vItem.index];
            const isCurrent = track.id === currentId;
            return (
              <div
                key={track.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${vItem.start}px)`,
                  width: '100%',
                  height: vItem.size,
                }}
                onClick={() => playNow(track.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ visible: true, x: e.clientX, y: e.clientY, trackId: track.id });
                }}
                className={`flex items-center gap-2.5 px-3 cursor-pointer transition-colors group
                  ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0">
                  {isCurrent && playing ? (
                    <span className="flex gap-0.5 items-end h-4">
                      {[1, 2, 3].map(i => (
                        <span
                          key={i}
                          className="w-0.5 bg-cyan-400 rounded-full animate-bounce"
                          style={{ height: `${50 + i * 15}%`, animationDelay: `${i * 100}ms` }}
                        />
                      ))}
                    </span>
                  ) : isCurrent ? (
                    <Play size={12} className="text-cyan-400 fill-cyan-400" />
                  ) : (
                    <Music size={12} className="text-white/25 group-hover:text-white/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate leading-tight ${isCurrent ? 'text-cyan-300' : 'text-white/70'}`}>
                    {track.title}
                  </p>
                  <p className="text-[10px] text-white/25 truncate">
                    {track.artist || track.name}
                  </p>
                </div>
                {track.duration > 0 && (
                  <span className="text-[10px] text-white/25 flex-shrink-0">
                    {formatTime(track.duration)}
                  </span>
                )}
                {track.error && (
                  <span className="text-[9px] text-red-400 bg-red-400/10 px-1 rounded ml-1 flex-shrink-0">ERR</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {menu.visible && (
        <div
          className="fixed z-50 bg-black/90 border border-white/15 rounded-lg py-1 shadow-xl"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            className="block w-full px-4 py-1.5 text-xs text-left text-white/70 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
            onPointerDown={e => { e.stopPropagation(); playNow(menu.trackId); closeMenu(); }}
          >
            Play Now
          </button>
          <button
            className="block w-full px-4 py-1.5 text-xs text-left text-white/70 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
            onPointerDown={e => { e.stopPropagation(); playNext(menu.trackId); closeMenu(); }}
          >
            Play Next
          </button>
          <button
            className="block w-full px-4 py-1.5 text-xs text-left text-white/70 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
            onPointerDown={e => { e.stopPropagation(); addToQueue(menu.trackId); closeMenu(); }}
          >
            Add to Queue
          </button>
        </div>
      )}
    </div>
  );
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/components/player/TrackLibrary.tsx
git commit -m "feat: add search input to TrackLibrary with forwardRef focusSearch handle"
```

---

## Task 9: PlayerShell Wiring + PlayerBar New Props

**Files:**
- Modify: `app/components/player/PlayerShell.tsx`
- Modify: `app/components/player/PlayerBar.tsx`

- [ ] **Step 1: Update PlayerBar to accept new props and add track-info click + ? button**

Add to `PlayerBarProps` interface in `app/components/player/PlayerBar.tsx`:
```typescript
  onOpenNowPlaying: () => void;
  onOpenShortcuts: () => void;
```

In the destructure at the top of the component:
```typescript
export function PlayerBar({ libOpen, onToggleLib, queueOpen, onToggleQueue, onOpenNowPlaying, onOpenShortcuts }: PlayerBarProps) {
```

Wrap the album art + track info block in a clickable button. Replace:
```tsx
        {/* Album art thumbnail */}
        <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-white/8 flex items-center justify-center">
          ...
        </div>

        {/* Track title + artist */}
        <div className="flex-1 min-w-0">
```

with:
```tsx
        {/* Album art + track info — click to open Now Playing */}
        <button
          onClick={track ? onOpenNowPlaying : undefined}
          disabled={!track}
          className="flex items-center gap-2 min-w-0 flex-1 text-left disabled:cursor-default group/info"
        >
          <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-white/8 flex items-center justify-center">
            {track?.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={track.coverUrl} alt="cover" className="w-full h-full object-cover" />
            ) : (
              <Music size={14} className="text-white/25" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {track ? (
              <>
                <p className="text-white/85 text-sm truncate leading-tight group-hover/info:text-white transition-colors">{track.title}</p>
                <p className="text-white/35 text-[11px] truncate">
                  {track.artist || track.name}
                </p>
              </>
            ) : (
              <p className="text-white/20 text-sm">No track loaded</p>
            )}
          </div>
        </button>
```

Add a `?` icon button to the right section (after the Queue toggle button, before the A-B section):
```tsx
        {/* Shortcuts help */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts (?)"
          className="p-1.5 rounded text-white/25 hover:text-white/60 transition-colors flex-shrink-0 text-xs font-mono"
        >
          ?
        </button>
```

Remove the old standalone album art div and track info div (they are now inside the button above).

- [ ] **Step 2: Update PlayerShell to wire all new state and callbacks**

Replace the entire contents of `app/components/player/PlayerShell.tsx`:

```typescript
'use client';

import { useState, useRef } from 'react';
import { PlayerProvider, usePlayer } from '../../lib/playerContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { VisualizerContainer } from '../visualizer/VisualizerContainer';
import { FileDropZone } from './FileDropZone';
import { TrackLibrary, type TrackLibraryHandle } from './TrackLibrary';
import { PlayerBar } from './PlayerBar';
import { QueueSidebar } from './QueueSidebar';
import { NowPlayingPanel } from './NowPlayingPanel';
import { KeyboardShortcutsOverlay } from './KeyboardShortcutsOverlay';

function PlayerInner() {
  const { state, analyserNode, setKey } = usePlayer();
  const [libOpen, setLibOpen] = useState(true);
  const [queueOpen, setQueueOpen] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const searchRef = useRef<TrackLibraryHandle>(null);

  useKeyboardShortcuts({
    onOpenShortcuts: () => setShortcutsOpen(true),
    focusSearch: () => searchRef.current?.focusSearch(),
  });

  const showLib = libOpen || state.tracks.length === 0;
  const currentId = state.queue[state.queuePos] ?? null;
  const currentTrack = currentId ? state.tracks.find(t => t.id === currentId) ?? null : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* ── Full-screen visualizer ──────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <VisualizerContainer
          analyserNode={analyserNode}
          musicalKey={state.musicalKey}
          onKeyChange={setKey}
          vizMode={state.vizMode}
          coverUrl={currentTrack?.coverUrl ?? ''}
        />
      </div>

      {/* ── Library panel ───────────────────────────────────────────────────── */}
      {showLib && (
        <div className="absolute left-0 top-0 bottom-14 w-72 bg-black/80 backdrop-blur-xl border-r border-white/8 flex flex-col z-20 select-none">
          <div className="px-3 pt-3 pb-1 text-white/60 text-xs font-semibold tracking-wide">
            Library
          </div>
          <FileDropZone />
          <TrackLibrary ref={searchRef} />
        </div>
      )}

      {/* ── Queue sidebar ────────────────────────────────────────────────────── */}
      {queueOpen && <QueueSidebar onClose={() => setQueueOpen(false)} />}

      {/* ── Now Playing panel ───────────────────────────────────────────────── */}
      {nowPlayingOpen && currentTrack && (
        <NowPlayingPanel track={currentTrack} onClose={() => setNowPlayingOpen(false)} />
      )}

      {/* ── Keyboard shortcuts overlay ──────────────────────────────────────── */}
      {shortcutsOpen && (
        <KeyboardShortcutsOverlay onClose={() => setShortcutsOpen(false)} />
      )}

      {/* ── Bottom player bar ────────────────────────────────────────────────── */}
      <PlayerBar
        libOpen={showLib}
        onToggleLib={() => setLibOpen(o => !o)}
        queueOpen={queueOpen}
        onToggleQueue={() => setQueueOpen(o => !o)}
        onOpenNowPlaying={() => setNowPlayingOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
    </div>
  );
}

export function PlayerShell() {
  return (
    <PlayerProvider>
      <PlayerInner />
    </PlayerProvider>
  );
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```
Expected: All tests pass (NowPlayingPanel and KeyboardShortcutsOverlay don't exist yet but aren't imported in tests).

- [ ] **Step 4: Commit**

```bash
git add app/components/player/PlayerBar.tsx app/components/player/PlayerShell.tsx
git commit -m "feat: wire nowPlaying/shortcuts/search callbacks in PlayerShell and PlayerBar"
```

---

## Task 10: KeyboardShortcutsOverlay Component

**Files:**
- Create: `app/components/player/KeyboardShortcutsOverlay.tsx`

- [ ] **Step 1: Create the component**

Create `app/components/player/KeyboardShortcutsOverlay.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const SHORTCUTS = [
  { section: 'Playback' },
  { key: 'Space', desc: 'Play / Pause' },
  { key: 'M', desc: 'Mute toggle' },
  { key: 'S', desc: 'Shuffle toggle' },
  { key: 'L', desc: 'Cycle loop mode' },
  { section: 'Seek' },
  { key: '← / →', desc: 'Seek ±5 seconds' },
  { key: 'Shift+← / →', desc: 'Previous / Next track' },
  { key: 'A', desc: 'Set loop start (A point)' },
  { section: 'Volume' },
  { key: '↑ / ↓', desc: 'Volume ±5%' },
  { section: 'View' },
  { key: 'F', desc: 'Toggle fullscreen' },
  { key: 'V', desc: 'Cycle visualizer mode' },
  { key: '/', desc: 'Focus search' },
  { key: '?', desc: 'Show this overlay' },
] as const;

export function KeyboardShortcutsOverlay({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onPointerDown={onClose}
    >
      <div
        className="relative bg-black/90 border border-white/12 rounded-2xl px-6 py-5 w-80 shadow-2xl"
        onPointerDown={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/30 hover:text-white/60 transition-colors"
        >
          <X size={16} />
        </button>
        <h2 className="text-white/80 text-sm font-semibold mb-4 tracking-wide">Keyboard Shortcuts</h2>
        <div className="space-y-0.5">
          {SHORTCUTS.map((item, i) => {
            if ('section' in item) {
              return (
                <p key={i} className="text-white/30 text-[10px] tracking-widest uppercase pt-3 pb-1 first:pt-0">
                  {item.section}
                </p>
              );
            }
            return (
              <div key={i} className="flex items-center justify-between gap-4 py-0.5">
                <span className="text-white/40 text-xs">{item.desc}</span>
                <kbd className="text-[10px] font-mono bg-white/8 border border-white/12 rounded px-1.5 py-0.5 text-white/60 whitespace-nowrap flex-shrink-0">
                  {item.key}
                </kbd>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/components/player/KeyboardShortcutsOverlay.tsx
git commit -m "feat: add KeyboardShortcutsOverlay modal (? key)"
```

---

## Task 11: NowPlayingPanel Component

**Files:**
- Create: `app/components/player/NowPlayingPanel.tsx`

- [ ] **Step 1: Create the component**

Create `app/components/player/NowPlayingPanel.tsx`:

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Music } from 'lucide-react';
import { type Track, formatTime } from '../../lib/playerContext';

interface Props {
  track: Track;
  onClose: () => void;
}

const FORMAT_MAP: Record<string, string> = {
  'audio/mpeg': 'MP3',
  'audio/flac': 'FLAC',
  'audio/wav': 'WAV',
  'audio/aac': 'AAC',
  'audio/mp4': 'M4A',
  'audio/webm': 'WebM',
  'video/webm': 'WebM',
  'audio/ogg': 'OGG',
  'audio/opus': 'OPUS',
  'audio/x-aiff': 'AIFF',
};

function formatBytes(bytes: number): string {
  return (bytes / 1_000_000).toFixed(1) + ' MB';
}

function formatLabel(type: string): string {
  return FORMAT_MAP[type] ?? type.split('/')[1]?.toUpperCase() ?? '?';
}

export function NowPlayingPanel({ track, onClose }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [bgColor, setBgColor] = useState<string>('');

  // Extract dominant color from cover art for background gradient
  useEffect(() => {
    if (!track.coverUrl) { setBgColor(''); return; }
    const img = new window.Image();
    img.src = track.coverUrl;
    img.onload = async () => {
      try {
        const { default: ColorThief } = await import('color-thief-browser');
        const ct = new ColorThief();
        const [r, g, b] = ct.getColor(img);
        setBgColor(`radial-gradient(ellipse at center, rgba(${r},${g},${b},0.45) 0%, rgba(0,0,0,0.95) 70%)`);
      } catch {
        setBgColor('');
      }
    };
  }, [track.coverUrl]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onPointerDown={onClose}
    >
      <div
        className="relative rounded-2xl overflow-hidden w-72 shadow-2xl border border-white/10"
        style={{ background: bgColor || 'rgba(10,10,10,0.97)' }}
        onPointerDown={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-white/30 hover:text-white/70 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Album art */}
        <div className="flex justify-center pt-8 pb-4 px-8">
          <div className="w-40 h-40 rounded-xl overflow-hidden bg-white/8 flex items-center justify-center shadow-xl">
            {track.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img ref={imgRef} src={track.coverUrl} alt="cover" className="w-full h-full object-cover" />
            ) : (
              <Music size={40} className="text-white/20" />
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="px-6 pb-6 text-center">
          <p className="text-white/90 text-base font-semibold leading-tight truncate">{track.title}</p>
          {track.artist && (
            <p className="text-white/50 text-sm mt-0.5 truncate">{track.artist}</p>
          )}
          {track.album && (
            <p className="text-white/30 text-xs mt-0.5 truncate">{track.album}</p>
          )}

          {/* Badges */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <span className="text-[10px] font-mono bg-white/8 border border-white/12 rounded px-2 py-0.5 text-white/50">
              {formatLabel(track.type)}
            </span>
            <span className="text-[10px] font-mono bg-white/8 border border-white/12 rounded px-2 py-0.5 text-white/50">
              {formatBytes(track.size)}
            </span>
            {track.duration > 0 && (
              <span className="text-[10px] font-mono bg-white/8 border border-white/12 rounded px-2 py-0.5 text-white/50">
                {formatTime(track.duration)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/components/player/NowPlayingPanel.tsx
git commit -m "feat: add NowPlayingPanel with album art, metadata, and color-thief background"
```

---

## Task 12: Album Color Mode — VisualizerContainer + NebulaScene

**Files:**
- Modify: `app/components/visualizer/VisualizerContainer.tsx`
- Modify: `app/components/visualizer/NebulaScene.tsx`

- [ ] **Step 1: Update NebulaScene to accept colorTint prop and add uColorTint uniform**

In `app/components/visualizer/NebulaScene.tsx`, add `uColorTint` to the fragment shader. Replace the existing `FRAG` constant:

```typescript
const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColorTint;
  varying float vAlpha;

  void main() {
    vec2  c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = step(d, 0.4) * vAlpha;
    vec3 col = mix(uColor, uColorTint, uColorTint == uColor ? 0.0 : 0.65);
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }
`;
```

Note: GLSL doesn't support `==` on vec3 reliably for this purpose. Use a separate uniform flag instead. Replace with:

```typescript
const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColorTint;
  uniform float uTintStrength;  // 0.0 = nebula color, 1.0 = full album tint
  varying float vAlpha;

  void main() {
    vec2  c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = step(d, 0.4) * vAlpha;
    vec3 col = mix(uColor, uColorTint, uTintStrength * 0.65);
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }
`;
```

Add `uColorTint` and `uTintStrength` to the module-level `sphereMat` uniforms:

```typescript
const sphereMat = new THREE.ShaderMaterial({
  vertexShader:   VERT,
  fragmentShader: FRAG,
  uniforms: {
    uTime:         { value: 0 },
    uBass:         { value: 0 },
    uMid:          { value: 0 },
    uKey:          { value: 8 },
    uColor:        { value: new THREE.Color(0x00aaff) },
    uColorTint:    { value: new THREE.Color(0x00aaff) },
    uTintStrength: { value: 0 },
  },
  transparent: true,
  depthWrite:  false,
  blending:    THREE.NormalBlending,
});
```

Add `colorTint` prop to `NebulaScene`:

```typescript
interface NebulaProps {
  colorTint?: THREE.Color | null;
}

export function NebulaScene({ colorTint }: NebulaProps) {
```

In `useFrame`, after the existing uniform updates, add:

```typescript
    if (colorTint) {
      sphereMat.uniforms.uColorTint.value.copy(colorTint);
      sphereMat.uniforms.uTintStrength.value = Math.min(
        1,
        sphereMat.uniforms.uTintStrength.value + 0.02
      );
    } else {
      sphereMat.uniforms.uTintStrength.value = Math.max(
        0,
        sphereMat.uniforms.uTintStrength.value - 0.02
      );
    }
```

- [ ] **Step 2: Update VisualizerContainer to accept vizMode + coverUrl, extract color, pass to NebulaScene**

Replace the contents of `app/components/visualizer/VisualizerContainer.tsx`:

```typescript
'use client';

import { useState, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { NebulaScene } from './NebulaScene';
import { AudioDataProvider } from '../../lib/audioData';
import { isIOS, KEY_NAMES } from '../../lib/utils';
import type { VizMode } from '../../lib/playerContext';

interface Props {
  analyserNode?: AnalyserNode | null;
  musicalKey?: number;
  onKeyChange?: (k: number) => void;
  vizMode?: VizMode;
  coverUrl?: string;
}

export function VisualizerContainer({ analyserNode, musicalKey: extKey, onKeyChange, vizMode = 'nebula', coverUrl = '' }: Props) {
  const [intKey, setIntKey] = useState(8);
  const musicalKey = extKey ?? intKey;
  const setMusicalKey = onKeyChange ?? setIntKey;
  const [ios] = useState(() => isIOS());
  const [colorTint, setColorTint] = useState<THREE.Color | null>(null);

  // Extract dominant color from cover art when in album-color mode
  useEffect(() => {
    if (vizMode !== 'album-color' || !coverUrl) {
      setColorTint(null);
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.src = coverUrl;
    img.onload = async () => {
      if (cancelled) return;
      try {
        const { default: ColorThief } = await import('color-thief-browser');
        const ct = new ColorThief();
        const [r, g, b] = ct.getColor(img);
        if (!cancelled) setColorTint(new THREE.Color(r / 255, g / 255, b / 255));
      } catch {
        if (!cancelled) setColorTint(null);
      }
    };
    img.onerror = () => { if (!cancelled) setColorTint(null); };
    return () => { cancelled = true; };
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
            <NebulaScene colorTint={colorTint} />
          </Suspense>

          <OrbitControls
            enablePan={false}
            enableZoom={false}
            target={[0, 0, 0]}
          />

          {/* Bloom — skip on iOS to preserve perf budget */}
          {!ios && (
            <EffectComposer>
              <Bloom intensity={0.4} luminanceThreshold={0.3} luminanceSmoothing={0.9} />
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

        {/* ── Viz mode indicator ────────────────────────────────── */}
        {vizMode === 'album-color' && (
          <div className="absolute top-4 left-24 flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full border border-white/20"
              style={{ background: colorTint ? `rgb(${Math.round(colorTint.r * 255)},${Math.round(colorTint.g * 255)},${Math.round(colorTint.b * 255)})` : '#888' }}
            />
            <span className="text-white/30 text-[10px]">Album Color</span>
          </div>
        )}

        {/* ── iOS notice ────────────────────────────────────────── */}
        {ios && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 text-amber-200/60 text-xs">
            iOS — reduced particles · bloom disabled
          </div>
        )}
      </div>
    </AudioDataProvider>
  );
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/components/visualizer/VisualizerContainer.tsx app/components/visualizer/NebulaScene.tsx
git commit -m "feat: album color mode with color-thief tint uniform; bloom post-processing (non-iOS)"
```

---

## Task 13: PROGRESS.md Final Update

**Files:**
- Modify: `PROGRESS.md`

- [ ] **Step 1: Update all partial tasks to complete**

Mark the following as ✅ in PROGRESS.md:

- Entry Point: Dexie persistence of loaded tracks
- Step 1 Stage 3: Library indexing (now wired to Dexie)
- Step 4: Click track info → opens Now Playing panel ✅; Now Playing panel ✅; Keyboard arrow-key seek ✅
- Step 5: History buffer ✅
- Step 6: `F` ✅, `V` ✅, `A` ✅, `/` ✅, `?` ✅ (E/C/B remain ❌ deferred)
- Feature 1: Album Color Mode ✅, Bloom ✅
- Feature 7: Speed range extended to 0.25×–4.0× ✅

Change Step 4, Step 5, Step 6, Feature 1 status from 🔶 to ✅ (or keep 🔶 only if E/C/B shortcut deferred items prevent full ✅).

Add to "What's Next" section at the bottom:
```markdown
## Deferred to Next Session

- `E` — Toggle EQ panel (requires Feature 2 — 10-Band EQ)
- `C` — Toggle chord timeline (requires Feature 4)
- `B` — Toggle metronome (requires Feature 5)
```

- [ ] **Step 2: Run full test suite one final time**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 3: Final commit**

```bash
git add PROGRESS.md
git commit -m "docs: mark all partial tasks complete in PROGRESS.md; note E/C/B deferred"
```
