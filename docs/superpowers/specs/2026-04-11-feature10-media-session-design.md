# Feature 10 — Media Session API Design

**Date:** 2026-04-11  
**Status:** Approved

---

## Overview

Integrate the [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API) so the OS (lock screen, notification tray, Bluetooth/hardware keys) shows track metadata and can control playback.

---

## Scope

- Set `navigator.mediaSession.metadata` on every track change
- Set `navigator.mediaSession.playbackState` in sync with `state.playing`
- Register action handlers: `play`, `pause`, `previoustrack`, `nexttrack`, `seekto`
- Pass cover art blob URL as artwork
- Unit tests for metadata and handler wiring

Out of scope: `seekbackward`/`seekforward` handlers, `setPositionState` (position reporting), chapter markers.

---

## Architecture

No new files. All logic added to `PlayerProvider` in `app/lib/playerContext.tsx` as a single `useEffect`.

```
PlayerProvider
  └── useEffect (Media Session)
        deps: [currentTrack, state.playing, togglePlay, next, prev, seek]
        ├── guard: 'mediaSession' in navigator
        ├── set navigator.mediaSession.metadata
        ├── set navigator.mediaSession.playbackState
        └── register action handlers
```

---

## Implementation Detail

### Current track derivation

Computed with `useMemo` to avoid recomputing on every render tick:

```ts
const currentTrack = useMemo(
  () => state.tracks.find(t => t.id === state.queue[state.queuePos]) ?? null,
  [state.tracks, state.queue, state.queuePos]
);
```

### Metadata

```ts
navigator.mediaSession.metadata = new MediaMetadata({
  title:  currentTrack.title  || currentTrack.name,
  artist: currentTrack.artist || '',
  album:  currentTrack.album  || '',
  artwork: currentTrack.coverUrl
    ? [{ src: currentTrack.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
    : [],
});
```

`coverUrl` is a `blob:` URL from the APIC frame. All four standard sizes point to the same blob — browsers pick the best fit. When `coverUrl` is empty, `artwork` is `[]` so the OS shows its default music icon.

### Playback state

```ts
navigator.mediaSession.playbackState = state.playing ? 'playing' : 'paused';
```

Updated in the same effect so it stays in sync with the metadata update.

### Action handlers

| Handler | Action |
|---------|--------|
| `play` | `togglePlay()` |
| `pause` | `togglePlay()` |
| `previoustrack` | `prev()` |
| `nexttrack` | `next()` |
| `seekto` | `seek(e.seekTime ?? 0)` |

Handlers reference stable `useCallback` refs — no churn on track changes.

### Effect cleanup

No explicit cleanup. Each effect run overwrites the previous handlers. Browser clears on page unload. This matches the pattern used by the existing volume/speed/A-B loop effects in `PlayerProvider`.

### SSR guard

`navigator.mediaSession` is browser-only. The `'mediaSession' in navigator` guard at the top of the effect handles SSR and unsupported browsers (Firefox Android, older Safari) — effect exits early, no error thrown.

---

## Testing

File: `__tests__/mediaSession.test.tsx`

| Test | Assertion |
|------|-----------|
| Metadata set on track load | `navigator.mediaSession.metadata.title` equals track title |
| Artwork passed when coverUrl present | `artwork[0].src` equals coverUrl blob |
| Empty artwork when no coverUrl | `artwork` is `[]` |
| `playbackState` syncs with `state.playing` | `'playing'` / `'paused'` |
| `previoustrack` handler calls `prev` | mock `prev`, fire handler |
| `nexttrack` handler calls `next` | mock `next`, fire handler |
| `seekto` handler calls `seek(e.seekTime)` | mock `seek`, fire handler with `seekTime: 42` |
| No-op on unsupported browsers | delete `navigator.mediaSession`, no throw |

Mock strategy: assign a plain object to `navigator.mediaSession` in `vitest.setup.ts` or per-test `beforeEach`. Track handler registrations in a `Map<string, Function>`.

---

## Files Changed

| File | Change |
|------|--------|
| `app/lib/playerContext.tsx` | Add `useMemo` for `currentTrack`, add Media Session `useEffect` |
| `__tests__/mediaSession.test.tsx` | New — 8 test cases |
| `PROGRESS.md` | Mark Feature 10 ✅ |
