import { describe, it, expect } from 'vitest';
import type { Track } from '../app/lib/playerContext';
import { reducer, INITIAL } from '../app/lib/playerContext';

const makeTrack = (id: string): Track => ({
  id,
  name: `${id}.mp3`,
  title: id,
  artist: '',
  album: '',
  size: 1000,
  type: 'audio/mpeg',
  url: `blob:${id}`,
  coverUrl: '',
  duration: 180,
});

describe('reducer — queue model', () => {
  it('ADD_TRACKS adds to library without touching queue', () => {
    const tracks = [makeTrack('a'), makeTrack('b')];
    const next = reducer(INITIAL, { type: 'ADD_TRACKS', tracks });
    expect(next.tracks).toHaveLength(2);
    expect(next.queue).toEqual([]);
    expect(next.queuePos).toBe(-1);
  });

  it('PLAY_NOW clears queue, adds id, sets queuePos 0', () => {
    const state = { ...INITIAL, tracks: [makeTrack('a'), makeTrack('b')], queue: ['b'], queuePos: 0 };
    const next = reducer(state, { type: 'PLAY_NOW', id: 'a' });
    expect(next.queue).toEqual(['a']);
    expect(next.queuePos).toBe(0);
    expect(next.playing).toBe(true);
  });

  it('PLAY_NEXT inserts after current position', () => {
    const state = { ...INITIAL, queue: ['a', 'c'], queuePos: 0 };
    const next = reducer(state, { type: 'PLAY_NEXT', id: 'b' });
    expect(next.queue).toEqual(['a', 'b', 'c']);
    expect(next.queuePos).toBe(0);
  });

  it('ADD_TO_QUEUE appends to end', () => {
    const state = { ...INITIAL, queue: ['a', 'b'], queuePos: 0 };
    const next = reducer(state, { type: 'ADD_TO_QUEUE', id: 'c' });
    expect(next.queue).toEqual(['a', 'b', 'c']);
  });

  it('REMOVE_FROM_QUEUE splices correctly', () => {
    const state = { ...INITIAL, queue: ['a', 'b', 'c'], queuePos: 0 };
    const next = reducer(state, { type: 'REMOVE_FROM_QUEUE', pos: 1 });
    expect(next.queue).toEqual(['a', 'c']);
    expect(next.queuePos).toBe(0);
  });

  it('REMOVE_FROM_QUEUE adjusts queuePos when removing before current', () => {
    const state = { ...INITIAL, queue: ['a', 'b', 'c'], queuePos: 2 };
    const next = reducer(state, { type: 'REMOVE_FROM_QUEUE', pos: 0 });
    expect(next.queue).toEqual(['b', 'c']);
    expect(next.queuePos).toBe(1);
  });

  it('REORDER_QUEUE moves item correctly', () => {
    const state = { ...INITIAL, queue: ['a', 'b', 'c'], queuePos: 0 };
    const next = reducer(state, { type: 'REORDER_QUEUE', from: 2, to: 0 });
    expect(next.queue).toEqual(['c', 'a', 'b']);
  });

  it('CYCLE_SHUFFLE shuffles queue, not tracks', () => {
    const tracks = [makeTrack('a'), makeTrack('b'), makeTrack('c')];
    const state = { ...INITIAL, tracks, queue: ['a', 'b', 'c'], queuePos: 0 };
    const next = reducer(state, { type: 'CYCLE_SHUFFLE' });
    expect(next.tracks.map(t => t.id)).toEqual(['a', 'b', 'c']);
    expect([...next.queue].sort()).toEqual(['a', 'b', 'c']);
    expect(next.shuffleMode).toBe('random');
  });

  it('TRACK_ENDED advances queuePos when loopMode=off', () => {
    const state = { ...INITIAL, queue: ['a', 'b'], queuePos: 0, playing: true, loopMode: 'off' as const };
    const next = reducer(state, { type: 'TRACK_ENDED' });
    expect(next.queuePos).toBe(1);
    expect(next.playing).toBe(true);
  });

  it('TRACK_ENDED stops when queue exhausted and loopMode=off', () => {
    const state = { ...INITIAL, queue: ['a'], queuePos: 0, playing: true, loopMode: 'off' as const };
    const next = reducer(state, { type: 'TRACK_ENDED' });
    expect(next.playing).toBe(false);
  });

  it('TRACK_ENDED replays when loopMode=track', () => {
    const state = { ...INITIAL, queue: ['a'], queuePos: 0, playing: true, loopMode: 'track' as const };
    const next = reducer(state, { type: 'TRACK_ENDED' });
    expect(next.queuePos).toBe(0);
    expect(next.playing).toBe(true);
    expect(next.position).toBe(0);
  });

  it('TRACK_ENDED wraps to 0 when loopMode=queue', () => {
    const state = { ...INITIAL, queue: ['a', 'b'], queuePos: 1, playing: true, loopMode: 'queue' as const };
    const next = reducer(state, { type: 'TRACK_ENDED' });
    expect(next.queuePos).toBe(0);
    expect(next.playing).toBe(true);
  });

  it('NEXT_TRACK advances queuePos regardless of loopMode', () => {
    const state = { ...INITIAL, queue: ['a', 'b'], queuePos: 0, loopMode: 'track' as const };
    const next = reducer(state, { type: 'NEXT_TRACK' });
    expect(next.queuePos).toBe(1);
  });

  it('PREV_TRACK decrements queuePos when queuePos > 0', () => {
    const state = { ...INITIAL, queue: ['a', 'b', 'c'], queuePos: 2 };
    const next = reducer(state, { type: 'PREV_TRACK' });
    expect(next.queuePos).toBe(1);
    expect(next.playing).toBe(true);
  });

  it('PREV_TRACK returns state unchanged when queuePos=0', () => {
    const state = { ...INITIAL, queue: ['a'], queuePos: 0 };
    const next = reducer(state, { type: 'PREV_TRACK' });
    expect(next.queuePos).toBe(0);
  });

  it('REMOVE_FROM_QUEUE stops playback when removing currently playing track', () => {
    const state = { ...INITIAL, queue: ['a', 'b', 'c'], queuePos: 1, playing: true };
    const next = reducer(state, { type: 'REMOVE_FROM_QUEUE', pos: 1 });
    expect(next.queue).toEqual(['a', 'c']);
    expect(next.playing).toBe(false);
    expect(next.position).toBe(0);
    expect(next.queuePos).toBe(1); // 'c' slides into slot 1 after 'b' removed
  });

  it('CYCLE_SHUFFLE toggling off leaves mode as off (queue stays in current order)', () => {
    const state = { ...INITIAL, queue: ['a', 'b', 'c'], queuePos: 0, shuffleMode: 'random' as const };
    const next = reducer(state, { type: 'CYCLE_SHUFFLE' });
    expect(next.shuffleMode).toBe('off');
    expect(next.queue).toEqual(['a', 'b', 'c']); // order preserved as-is
  });

  it('REORDER_QUEUE keeps queuePos pointing at same track id', () => {
    // 'a' is at pos 0 (current). Move 'c' from pos 2 to pos 0 → 'a' shifts to pos 1
    const state = { ...INITIAL, queue: ['a', 'b', 'c'], queuePos: 0 };
    const next = reducer(state, { type: 'REORDER_QUEUE', from: 2, to: 0 });
    expect(next.queue).toEqual(['c', 'a', 'b']);
    expect(next.queuePos).toBe(1); // 'a' is now at index 1
  });

  it('PLAY_NOW resets position to 0', () => {
    const state = { ...INITIAL, queue: ['b'], queuePos: 0, position: 45 };
    const next = reducer(state, { type: 'PLAY_NOW', id: 'a' });
    expect(next.position).toBe(0);
  });

  it('NEXT_TRACK wraps queue when loopMode=queue', () => {
    const state = { ...INITIAL, queue: ['a', 'b'], queuePos: 1, loopMode: 'queue' as const };
    const next = reducer(state, { type: 'NEXT_TRACK' });
    expect(next.queuePos).toBe(0);
    expect(next.playing).toBe(true);
  });

  it('CLEAR_QUEUE empties queue, sets queuePos -1, stops playback', () => {
    const state = { ...INITIAL, queue: ['a', 'b'], queuePos: 0, playing: true };
    const next = reducer(state, { type: 'CLEAR_QUEUE' });
    expect(next.queue).toEqual([]);
    expect(next.queuePos).toBe(-1);
    expect(next.playing).toBe(false);
  });

  it('PLAY_NEXT inserts at index 0 when queuePos is -1 (idle)', () => {
    const state = { ...INITIAL, queue: ['a', 'b'], queuePos: -1 };
    const next = reducer(state, { type: 'PLAY_NEXT', id: 'x' });
    expect(next.queue).toEqual(['x', 'a', 'b']); // inserted at front when idle
    expect(next.queuePos).toBe(-1); // still idle — no auto-play
  });

  it('NEXT_TRACK on empty queue stops playback', () => {
    const state = { ...INITIAL, queue: [], queuePos: -1 };
    const next = reducer(state, { type: 'NEXT_TRACK' });
    expect(next.playing).toBe(false);
  });
});

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
