import { describe, it, expect } from 'vitest';
import { INITIAL_BANDS, BUILTIN_PRESETS, eqReducer, INITIAL_EQ_STATE } from '../app/lib/eqPresets';
import type { EQState } from '../app/lib/eqPresets';

describe('eqReducer', () => {
  it('INITIAL_BANDS has 10 bands with all gains at 0', () => {
    expect(INITIAL_BANDS).toHaveLength(10);
    expect(INITIAL_BANDS.every(b => b.gain === 0)).toBe(true);
  });

  it('INITIAL_BANDS band 0 is lowshelf at 32Hz', () => {
    expect(INITIAL_BANDS[0].type).toBe('lowshelf');
    expect(INITIAL_BANDS[0].freq).toBe(32);
  });

  it('INITIAL_BANDS band 9 is highshelf at 16000Hz', () => {
    expect(INITIAL_BANDS[9].type).toBe('highshelf');
    expect(INITIAL_BANDS[9].freq).toBe(16000);
  });

  it('BUILTIN_PRESETS has 8 entries', () => {
    expect(BUILTIN_PRESETS).toHaveLength(8);
  });

  it('BUILTIN_PRESETS Flat has all gains 0', () => {
    const flat = BUILTIN_PRESETS.find(p => p.name === 'Flat');
    expect(flat).toBeDefined();
    expect(flat!.gains.every(g => g === 0)).toBe(true);
  });

  it('SET_BAND_GAIN updates the correct band gain', () => {
    const next = eqReducer(INITIAL_EQ_STATE, { type: 'SET_BAND_GAIN', index: 2, gain: 6 });
    expect(next.bands[2].gain).toBe(6);
    expect(next.bands[0].gain).toBe(0); // others unchanged
    expect(next.presetName).toBe(''); // custom now
  });

  it('SET_BAND_GAIN clamps gain to +15', () => {
    const next = eqReducer(INITIAL_EQ_STATE, { type: 'SET_BAND_GAIN', index: 0, gain: 20 });
    expect(next.bands[0].gain).toBe(15);
  });

  it('SET_BAND_GAIN clamps gain to -15', () => {
    const next = eqReducer(INITIAL_EQ_STATE, { type: 'SET_BAND_GAIN', index: 0, gain: -20 });
    expect(next.bands[0].gain).toBe(-15);
  });

  it('TOGGLE_BYPASS flips the bypass flag', () => {
    const s1 = eqReducer(INITIAL_EQ_STATE, { type: 'TOGGLE_BYPASS' });
    expect(s1.bypass).toBe(true);
    const s2 = eqReducer(s1, { type: 'TOGGLE_BYPASS' });
    expect(s2.bypass).toBe(false);
  });

  it('LOAD_PRESET replaces all gains and sets presetName', () => {
    const bassBoost = BUILTIN_PRESETS.find(p => p.name === 'Bass Boost')!;
    const next = eqReducer(INITIAL_EQ_STATE, {
      type: 'LOAD_PRESET',
      gains: bassBoost.gains,
      name: bassBoost.name,
    });
    expect(next.bands[0].gain).toBe(bassBoost.gains[0]);
    expect(next.presetName).toBe('Bass Boost');
  });

  it('RESET_FLAT sets all gains to 0 and clears presetName', () => {
    const dirty: EQState = {
      ...INITIAL_EQ_STATE,
      bands: INITIAL_EQ_STATE.bands.map((b, i) => ({ ...b, gain: i + 1 })),
      presetName: 'Bass Boost',
    };
    const next = eqReducer(dirty, { type: 'RESET_FLAT' });
    expect(next.bands.every(b => b.gain === 0)).toBe(true);
    expect(next.presetName).toBe('Flat');
  });

  it('SET_PRESET_NAME sets name without touching bands', () => {
    const next = eqReducer(INITIAL_EQ_STATE, { type: 'SET_PRESET_NAME', name: 'My Custom' });
    expect(next.presetName).toBe('My Custom');
    expect(next.bands).toEqual(INITIAL_EQ_STATE.bands);
  });
});
