import { describe, it, expect } from 'vitest';
import type { PlayerState, Track } from '../app/lib/playerContext';
import { INITIAL, getNextTrackFromState } from '../app/lib/playerContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTrack = (id: string, duration = 180): Track => ({
  id,
  name: `${id}.mp3`,
  title: id,
  artist: '',
  album: '',
  size: 1000,
  type: 'audio/mpeg',
  url: `blob:${id}`,
  coverUrl: '',
  duration,
});

const withQueue = (ids: string[], pos: number, loopMode: PlayerState['loopMode'] = 'off'): PlayerState => ({
  ...INITIAL,
  tracks: ids.map(id => makeTrack(id)),
  queue: ids,
  queuePos: pos,
  loopMode,
});

// ─── getNextTrackFromState ────────────────────────────────────────────────────

describe('getNextTrackFromState', () => {
  it('returns the next track when one exists after queuePos', () => {
    const state = withQueue(['a', 'b', 'c'], 0);
    const next = getNextTrackFromState(state);
    expect(next?.id).toBe('b');
  });

  it('returns the track two positions ahead when queuePos=1', () => {
    const state = withQueue(['a', 'b', 'c'], 1);
    const next = getNextTrackFromState(state);
    expect(next?.id).toBe('c');
  });

  it('returns null when current track is last and loopMode is off', () => {
    const state = withQueue(['a', 'b'], 1, 'off');
    expect(getNextTrackFromState(state)).toBeNull();
  });

  it('returns null when queue is empty', () => {
    expect(getNextTrackFromState(INITIAL)).toBeNull();
  });

  it('returns null when queue has only one track and loopMode is off', () => {
    const state = withQueue(['a'], 0, 'off');
    expect(getNextTrackFromState(state)).toBeNull();
  });

  it('wraps to first track when loopMode is queue and current is last', () => {
    const state = withQueue(['a', 'b', 'c'], 2, 'queue');
    const next = getNextTrackFromState(state);
    expect(next?.id).toBe('a');
  });

  it('returns null when loopMode is queue but only one track', () => {
    const state = withQueue(['a'], 0, 'queue');
    // single-track queue-loop replays same track — gapless not applicable
    expect(getNextTrackFromState(state)).toBeNull();
  });

  it('returns null when loopMode is track (gapless not applicable)', () => {
    const state = withQueue(['a', 'b'], 0, 'track');
    // track-loop replays same track — no next track for gapless
    expect(getNextTrackFromState(state)).toBeNull();
  });

  it('finds the next track object from state.tracks', () => {
    const trackA = makeTrack('a');
    const trackB = makeTrack('b', 240);
    const state: PlayerState = {
      ...INITIAL,
      tracks: [trackA, trackB],
      queue: ['a', 'b'],
      queuePos: 0,
      loopMode: 'off',
    };
    const next = getNextTrackFromState(state);
    expect(next).toEqual(trackB);
  });

  it('returns null if next queue id has no matching track object', () => {
    const state: PlayerState = {
      ...INITIAL,
      tracks: [makeTrack('a')],
      queue: ['a', 'orphan-id'],
      queuePos: 0,
      loopMode: 'off',
    };
    // 'orphan-id' is in queue but not in tracks — should safely return null
    expect(getNextTrackFromState(state)).toBeNull();
  });
});
