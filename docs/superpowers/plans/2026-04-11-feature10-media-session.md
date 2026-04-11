# Feature 10 — Media Session API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Media Session API into `PlayerProvider` so the OS lock screen, notification tray, and hardware media keys show track metadata and control playback.

**Architecture:** Single `useEffect` in `PlayerProvider` watches current track + playing state. Sets `navigator.mediaSession.metadata`, `playbackState`, and five action handlers (`play`, `pause`, `previoustrack`, `nexttrack`, `seekto`). A `useMemo` derives `currentTrack` from queue state to avoid recomputing on every TICK dispatch.

**Tech Stack:** Web Media Session API (browser-native, no packages), React `useMemo` + `useEffect`, Vitest + Testing Library for tests.

---

## File Map

| File | Change |
|------|--------|
| `app/lib/playerContext.tsx` | Add `useMemo` for `currentTrack`; add Media Session `useEffect` |
| `__tests__/mediaSession.test.tsx` | New — 8 test cases |
| `PROGRESS.md` | Mark Feature 10 ✅ |

---

### Task 1: Write failing tests for Media Session metadata

**Files:**
- Create: `__tests__/mediaSession.test.tsx`

- [ ] **Step 1: Create the test file with mock setup and first two failing tests**

```tsx
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../app/lib/db', () => ({
  db: {
    tracks: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          modify: vi.fn().mockResolvedValue(0),
        })),
      })),
      add: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock('jsmediatags', () => ({
  default: {
    read: (_file: unknown, { onError }: { onError: () => void }) => onError(),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

type MockMediaSession = {
  metadata: { title: string; artist: string; album: string; artwork: { src: string }[] } | null;
  playbackState: string;
  setActionHandler: ReturnType<typeof vi.fn>;
  _handlers: Record<string, ((e?: { seekTime?: number }) => void) | null>;
};

let mockMediaSession: MockMediaSession;

function makeMockAudioContext() {
  return {
    createAnalyser: vi.fn(() => ({ fftSize: 0, connect: vi.fn() })),
    createGain: vi.fn(() => ({ gain: { value: 1 }, connect: vi.fn() })),
    createMediaElementSource: vi.fn(() => ({ connect: vi.fn() })),
    createBiquadFilter: vi.fn(() => ({
      frequency: { value: 0 },
      gain: { value: 0 },
      Q: { value: 0 },
      type: 'peaking',
      connect: vi.fn(),
    })),
    state: 'running',
    resume: vi.fn(),
    destination: {},
  };
}

class MockAudio {
  src = '';
  currentTime = 0;
  playbackRate = 1;
  preservesPitch = true;
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  pause = vi.fn();
  play = vi.fn().mockResolvedValue(undefined);
  load = vi.fn();
}

// Renders PlayerProvider, loads one track, plays it, waits for effects.
// Returns the player context value.
async function renderWithTrack(coverUrl = '') {
  // Patch jsmediatags to return metadata (including optional coverUrl)
  const jsmediatags = await import('jsmediatags');
  (jsmediatags.default.read as ReturnType<typeof vi.fn>).mockImplementation(
    (_file: unknown, { onSuccess }: { onSuccess: (tag: unknown) => void }) => {
      const picture = coverUrl
        ? { data: [0x89, 0x50], format: 'image/jpeg' }
        : undefined;
      onSuccess({ tags: { title: 'Test Song', artist: 'Test Artist', album: 'Test Album', picture } });
    }
  );

  // Also mock URL.createObjectURL for cover art blob
  const origCreate = URL.createObjectURL;
  URL.createObjectURL = vi.fn(() => coverUrl || 'blob:mock');
  URL.revokeObjectURL = vi.fn();

  const { PlayerProvider, usePlayer } = await import('../app/lib/playerContext');

  let playerRef!: ReturnType<typeof usePlayer>;
  function Capture() {
    playerRef = usePlayer();
    return null;
  }

  render(
    <PlayerProvider>
      <Capture />
    </PlayerProvider>
  );

  const mockFile = new File(['audio'], 'song.mp3', { type: 'audio/mpeg' });
  Object.defineProperty(mockFile, 'size', { value: 12345 });

  await act(async () => {
    await playerRef.loadFiles([mockFile]);
  });

  await act(async () => {
    playerRef.playNow('song.mp3-12345');
  });

  // Flush remaining effects
  await act(async () => {});

  URL.createObjectURL = origCreate;
  return playerRef;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PlayerProvider — Media Session', () => {
  beforeEach(() => {
    vi.resetModules();

    vi.stubGlobal('Audio', MockAudio);
    vi.stubGlobal('AudioContext', vi.fn(makeMockAudioContext));
    vi.stubGlobal('MediaMetadata', class {
      title: string; artist: string; album: string; artwork: { src: string; sizes: string; type: string }[];
      constructor(init: { title: string; artist: string; album: string; artwork: { src: string; sizes: string; type: string }[] }) {
        this.title = init.title;
        this.artist = init.artist;
        this.album = init.album;
        this.artwork = init.artwork;
      }
    });

    mockMediaSession = {
      metadata: null,
      playbackState: 'none',
      _handlers: {},
      setActionHandler: vi.fn((action, handler) => {
        mockMediaSession._handlers[action] = handler;
      }),
    };
    Object.defineProperty(navigator, 'mediaSession', {
      value: mockMediaSession,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets metadata title, artist, album on track load', async () => {
    await renderWithTrack();
    expect(mockMediaSession.metadata?.title).toBe('Test Song');
    expect(mockMediaSession.metadata?.artist).toBe('Test Artist');
    expect(mockMediaSession.metadata?.album).toBe('Test Album');
  });

  it('passes coverUrl as artwork when present', async () => {
    await renderWithTrack('blob:cover-url');
    expect(mockMediaSession.metadata?.artwork[0]?.src).toBe('blob:cover-url');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (media session effect not yet written)**

```bash
npx vitest run __tests__/mediaSession.test.tsx
```

Expected: 2 failures — `metadata` is still `null` because the effect doesn't exist yet.

---

### Task 2: Write remaining failing tests

**Files:**
- Modify: `__tests__/mediaSession.test.tsx`

- [ ] **Step 1: Add the remaining 6 tests inside the `describe` block, after the two existing tests**

```tsx
  it('passes empty artwork array when coverUrl is empty', async () => {
    await renderWithTrack('');
    expect(mockMediaSession.metadata?.artwork).toEqual([]);
  });

  it('sets playbackState to "playing" when track is playing', async () => {
    await renderWithTrack();
    expect(mockMediaSession.playbackState).toBe('playing');
  });

  it('registers all five action handlers', async () => {
    await renderWithTrack();
    const registered = mockMediaSession.setActionHandler.mock.calls.map((c: unknown[]) => c[0]);
    expect(registered).toContain('play');
    expect(registered).toContain('pause');
    expect(registered).toContain('previoustrack');
    expect(registered).toContain('nexttrack');
    expect(registered).toContain('seekto');
  });

  it('seekto handler does not throw when called with seekTime', async () => {
    await renderWithTrack();
    expect(() => mockMediaSession._handlers['seekto']?.({ seekTime: 42 })).not.toThrow();
  });

  it('no-op on browsers without mediaSession (no throw)', async () => {
    Object.defineProperty(navigator, 'mediaSession', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    await expect(renderWithTrack()).resolves.not.toThrow();
  });
```

- [ ] **Step 2: Run tests — expect 8 FAIL**

```bash
npx vitest run __tests__/mediaSession.test.tsx
```

Expected: 8 failures.

---

### Task 3: Implement Media Session effect in `PlayerProvider`

**Files:**
- Modify: `app/lib/playerContext.tsx`

- [ ] **Step 1: Add `useMemo` import if not already present**

`useMemo` is already in the import list at line 7. No change needed.

- [ ] **Step 2: Add `currentTrack` memo inside `PlayerProvider`, after the `stateRef` setup (after line 456)**

Find this block:

```ts
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const getState = () => stateRef.current;
```

Add immediately after it:

```ts
  const currentTrack = useMemo(
    () => state.tracks.find(t => t.id === state.queue[state.queuePos]) ?? null,
    [state.tracks, state.queue, state.queuePos]
  );
```

- [ ] **Step 3: Add the Media Session `useEffect` inside `PlayerProvider`, after the A-B loop RAF effect (after line 506)**

Find this block:

```ts
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
```

Insert between those two comments:

```ts
  // ── Media Session API ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title:  currentTrack.title  || currentTrack.name,
      artist: currentTrack.artist || '',
      album:  currentTrack.album  || '',
      artwork: currentTrack.coverUrl
        ? [{ src: currentTrack.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    });

    navigator.mediaSession.playbackState = state.playing ? 'playing' : 'paused';

    navigator.mediaSession.setActionHandler('play',          () => togglePlay());
    navigator.mediaSession.setActionHandler('pause',         () => togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => prev());
    navigator.mediaSession.setActionHandler('nexttrack',     () => next());
    navigator.mediaSession.setActionHandler('seekto',        (e) => seek((e as MediaSessionActionDetails).seekTime ?? 0));
  }, [currentTrack, state.playing, togglePlay, next, prev, seek]);

```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run __tests__/mediaSession.test.tsx
```

Expected: 8 PASS.

- [ ] **Step 5: Run full test suite to verify no regressions**

```bash
npx vitest run
```

Expected: all existing tests still pass alongside the 8 new ones.

- [ ] **Step 6: Commit**

```bash
git add app/lib/playerContext.tsx __tests__/mediaSession.test.tsx
git commit -m "feat: Feature 10 — Media Session API metadata and handlers"
```

---

### Task 4: Update PROGRESS.md

**Files:**
- Modify: `PROGRESS.md`

- [ ] **Step 1: Mark Feature 10 complete**

Find:

```markdown
### Feature 10 — Media Session API ❌
```

Replace with:

```markdown
### Feature 10 — Media Session API ✅
```

Find the four unchecked items under Feature 10:

```markdown
- [ ] `navigator.mediaSession` metadata (title, artist, album, artwork)
- [ ] Handlers: play, pause, previoustrack, nexttrack, seekto
- [ ] Updates on every track change
- [ ] Cover art passed as MediaSession artwork
```

Replace with:

```markdown
- [x] `navigator.mediaSession` metadata (title, artist, album, artwork)
- [x] Handlers: play, pause, previoustrack, nexttrack, seekto
- [x] Updates on every track change
- [x] Cover art passed as MediaSession artwork
```

- [ ] **Step 2: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: mark Feature 10 complete"
```
