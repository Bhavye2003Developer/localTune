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
  });

  it('SET_BAND_GAIN clamps gain to +15', () => {
    const next = eqReducer(INITIAL_EQ_STATE, { type: 'SET_BAND_GAIN', index: 0, gain: 20 });
    expect(next.bands[0].gain).toBe(15);
  });

  it('SET_BAND_GAIN clamps gain to -15', () => {
    const next = eqReducer(INITIAL_EQ_STATE, { type: 'SET_BAND_GAIN', index: 0, gain: -20 });
    expect(next.bands[0].gain).toBe(-15);
  });

  it('SET_BAND_GAIN with active preset saves gains to savedConfigs', () => {
    const bassBoost = BUILTIN_PRESETS.find(p => p.name === 'Bass Boost')!;
    const withPreset = eqReducer(INITIAL_EQ_STATE, {
      type: 'TOGGLE_PRESET', name: 'Bass Boost', gains: bassBoost.gains,
    });
    const modified = eqReducer(withPreset, { type: 'SET_BAND_GAIN', index: 0, gain: 9 });
    expect(modified.bands[0].gain).toBe(9);
    expect(modified.activePresets).toEqual(['Bass Boost']); // preset stays active
    expect(modified.savedConfigs['Bass Boost']).toBeDefined();
    expect(modified.savedConfigs['Bass Boost'][0]).toBe(9);
  });

  it('TOGGLE_BYPASS flips the bypass flag', () => {
    const s1 = eqReducer(INITIAL_EQ_STATE, { type: 'TOGGLE_BYPASS' });
    expect(s1.bypass).toBe(true);
    const s2 = eqReducer(s1, { type: 'TOGGLE_BYPASS' });
    expect(s2.bypass).toBe(false);
  });

  it('TOGGLE_PRESET activates a preset and sets its bands', () => {
    const bassBoost = BUILTIN_PRESETS.find(p => p.name === 'Bass Boost')!;
    const next = eqReducer(INITIAL_EQ_STATE, {
      type: 'TOGGLE_PRESET', name: 'Bass Boost', gains: bassBoost.gains,
    });
    expect(next.activePresets).toEqual(['Bass Boost']);
    expect(next.bands[0].gain).toBe(bassBoost.gains[0]); // +6
  });

  it('TOGGLE_PRESET deactivates an already-active preset and returns to flat', () => {
    const bassBoost = BUILTIN_PRESETS.find(p => p.name === 'Bass Boost')!;
    const s1 = eqReducer(INITIAL_EQ_STATE, {
      type: 'TOGGLE_PRESET', name: 'Bass Boost', gains: bassBoost.gains,
    });
    const s2 = eqReducer(s1, {
      type: 'TOGGLE_PRESET', name: 'Bass Boost', gains: bassBoost.gains,
    });
    expect(s2.activePresets).toEqual([]);
    expect(s2.bands.every(b => b.gain === 0)).toBe(true);
  });

  it('TOGGLE_PRESET with two presets sums gains (clamped to ±15)', () => {
    const bassBoost = BUILTIN_PRESETS.find(p => p.name === 'Bass Boost')!;
    const acoustic  = BUILTIN_PRESETS.find(p => p.name === 'Acoustic')!;
    const s1 = eqReducer(INITIAL_EQ_STATE, {
      type: 'TOGGLE_PRESET', name: 'Bass Boost', gains: bassBoost.gains,
    });
    const s2 = eqReducer(s1, {
      type: 'TOGGLE_PRESET', name: 'Acoustic', gains: acoustic.gains,
    });
    expect(s2.activePresets).toContain('Bass Boost');
    expect(s2.activePresets).toContain('Acoustic');
    // Band 0: Bass Boost[0]=6, Acoustic[0]=2 → 8
    expect(s2.bands[0].gain).toBe(6 + 2);
    // Gains should be clamped at ±15
    expect(s2.bands.every(b => b.gain >= -15 && b.gain <= 15)).toBe(true);
  });

  it('TOGGLE_PRESET restores savedConfig when a preset is reactivated', () => {
    const bassBoost = BUILTIN_PRESETS.find(p => p.name === 'Bass Boost')!;
    const acoustic  = BUILTIN_PRESETS.find(p => p.name === 'Acoustic')!;
    // Activate Bass Boost, then tweak band 0 to 9
    const s1 = eqReducer(INITIAL_EQ_STATE, {
      type: 'TOGGLE_PRESET', name: 'Bass Boost', gains: bassBoost.gains,
    });
    const s2 = eqReducer(s1, { type: 'SET_BAND_GAIN', index: 0, gain: 9 });
    // Switch to Acoustic (saves Bass Boost's tweaked state)
    const s3 = eqReducer(s2, {
      type: 'TOGGLE_PRESET', name: 'Bass Boost', gains: bassBoost.gains,
    });
    const s4 = eqReducer(s3, {
      type: 'TOGGLE_PRESET', name: 'Acoustic', gains: acoustic.gains,
    });
    // Come back to Bass Boost
    const s5 = eqReducer(s4, {
      type: 'TOGGLE_PRESET', name: 'Acoustic', gains: acoustic.gains,
    });
    const s6 = eqReducer(s5, {
      type: 'TOGGLE_PRESET', name: 'Bass Boost', gains: bassBoost.gains,
    });
    // Should restore the tweaked band 0 = 9
    expect(s6.activePresets).toEqual(['Bass Boost']);
    expect(s6.bands[0].gain).toBe(9);
  });

  it('LOAD_PRESET replaces all gains and single-selects the preset', () => {
    const bassBoost = BUILTIN_PRESETS.find(p => p.name === 'Bass Boost')!;
    const next = eqReducer(INITIAL_EQ_STATE, {
      type: 'LOAD_PRESET',
      gains: bassBoost.gains,
      name: bassBoost.name,
    });
    expect(next.bands[0].gain).toBe(bassBoost.gains[0]);
    expect(next.activePresets).toEqual(['Bass Boost']);
  });

  it('RESET_FLAT sets all gains to 0 and clears activePresets', () => {
    const bassBoost = BUILTIN_PRESETS.find(p => p.name === 'Bass Boost')!;
    const dirty = eqReducer(INITIAL_EQ_STATE, {
      type: 'TOGGLE_PRESET', name: 'Bass Boost', gains: bassBoost.gains,
    });
    const next = eqReducer(dirty, { type: 'RESET_FLAT' });
    expect(next.bands.every(b => b.gain === 0)).toBe(true);
    expect(next.activePresets).toEqual([]);
  });

  it('SET_PRESET_NAME is a no-op (activePresets is source of truth)', () => {
    const next = eqReducer(INITIAL_EQ_STATE, { type: 'SET_PRESET_NAME', name: 'My Custom' });
    expect(next.bands).toEqual(INITIAL_EQ_STATE.bands);
    expect(next.activePresets).toEqual(INITIAL_EQ_STATE.activePresets);
  });
});
