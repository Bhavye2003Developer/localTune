export interface Band {
  freq: number;
  gain: number;   // -15 to +15 dB
  q: number;
  type: BiquadFilterType;
}

export interface EQState {
  bands: Band[];
  bypass: boolean;
  activePresets: string[];
  savedConfigs: Record<string, number[]>;   // comboKey → gains array
  presetBaseGains: Record<string, number[]>; // single preset name → original gains
}

export type EQAction =
  | { type: 'SET_BAND_GAIN'; index: number; gain: number }
  | { type: 'TOGGLE_BYPASS' }
  | { type: 'TOGGLE_PRESET'; name: string; gains: number[] }
  | { type: 'RESET_FLAT' }
  | { type: 'LOAD_PRESET'; gains: number[]; name: string }  // single-select (custom preset workflow)
  | { type: 'SET_PRESET_NAME'; name: string };              // no-op kept for compat

export const INITIAL_BANDS: Band[] = [
  { freq: 32,    gain: 0, q: 0.7, type: 'lowshelf'  },
  { freq: 64,    gain: 0, q: 1.4, type: 'peaking'   },
  { freq: 125,   gain: 0, q: 1.4, type: 'peaking'   },
  { freq: 250,   gain: 0, q: 1.4, type: 'peaking'   },
  { freq: 500,   gain: 0, q: 1.4, type: 'peaking'   },
  { freq: 1000,  gain: 0, q: 1.4, type: 'peaking'   },
  { freq: 2000,  gain: 0, q: 1.4, type: 'peaking'   },
  { freq: 4000,  gain: 0, q: 1.4, type: 'peaking'   },
  { freq: 8000,  gain: 0, q: 1.4, type: 'peaking'   },
  { freq: 16000, gain: 0, q: 0.7, type: 'highshelf' },
];

export const INITIAL_EQ_STATE: EQState = {
  bands: INITIAL_BANDS,
  bypass: false,
  activePresets: [],
  savedConfigs: {},
  presetBaseGains: {},
};

export const BUILTIN_PRESETS: { name: string; gains: number[] }[] = [
  { name: 'Flat',           gains: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Bass Boost',     gains: [ 6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
  { name: 'Vocal Presence', gains: [ 0,-1,-1, 0, 2, 4, 4, 2, 1, 0] },
  { name: 'Hip-Hop',        gains: [ 5, 4, 2, 0,-1, 0, 1, 2, 2, 1] },
  { name: 'Electronic',     gains: [ 4, 3, 0,-1, 0, 2, 1, 2, 3, 4] },
  { name: 'Classical',      gains: [ 0, 0, 0, 0, 0, 0,-1,-1,-1,-2] },
  { name: 'Podcast',        gains: [-2,-2, 0, 1, 4, 4, 3, 1, 0,-1] },
  { name: 'Acoustic',       gains: [ 2, 1, 0, 1, 2, 3, 3, 2, 1, 0] },
];

// --- helpers ---

function comboKey(presets: string[]): string {
  return [...presets].sort().join('+');
}

function sumGains(presets: string[], baseGains: Record<string, number[]>): number[] {
  const result = Array(10).fill(0) as number[];
  for (const name of presets) {
    const g = baseGains[name] ?? Array(10).fill(0);
    for (let i = 0; i < 10; i++) result[i] += g[i] ?? 0;
  }
  return result.map(g => Math.max(-15, Math.min(15, g)));
}

// --- reducer ---

export function eqReducer(state: EQState, action: EQAction): EQState {
  switch (action.type) {

    case 'SET_BAND_GAIN': {
      const clamped = Math.max(-15, Math.min(15, action.gain));
      const bands = state.bands.map((b, i) =>
        i === action.index ? { ...b, gain: clamped } : b
      );
      // Persist tweaks into the current combo's savedConfig
      const key = comboKey(state.activePresets);
      const savedConfigs = key
        ? { ...state.savedConfigs, [key]: bands.map(b => b.gain) }
        : state.savedConfigs;
      return { ...state, bands, savedConfigs };
    }

    case 'TOGGLE_BYPASS':
      return { ...state, bypass: !state.bypass };

    case 'TOGGLE_PRESET': {
      const { name, gains } = action;
      // Save current combo state before changing
      const oldKey = comboKey(state.activePresets);
      const savedConfigs: Record<string, number[]> = oldKey
        ? { ...state.savedConfigs, [oldKey]: state.bands.map(b => b.gain) }
        : { ...state.savedConfigs };
      // Remember this preset's base gains for fresh combo computation
      const presetBaseGains = { ...state.presetBaseGains, [name]: gains };
      // Toggle membership
      const isActive = state.activePresets.includes(name);
      const newActivePresets = isActive
        ? state.activePresets.filter(p => p !== name)
        : [...state.activePresets, name];
      // Resolve new band gains
      const newKey = comboKey(newActivePresets);
      let newGains: number[];
      if (savedConfigs[newKey] !== undefined) {
        newGains = savedConfigs[newKey];
      } else if (newActivePresets.length === 0) {
        newGains = Array(10).fill(0) as number[];
      } else {
        newGains = sumGains(newActivePresets, presetBaseGains);
      }
      const bands = state.bands.map((b, i) => ({ ...b, gain: newGains[i] ?? 0 }));
      return { ...state, bands, activePresets: newActivePresets, savedConfigs, presetBaseGains };
    }

    case 'RESET_FLAT': {
      const bands = state.bands.map(b => ({ ...b, gain: 0 }));
      return { ...state, bands, activePresets: [] };
    }

    case 'LOAD_PRESET': {
      // Single-selects the named preset (used by custom preset workflow)
      const oldKey = comboKey(state.activePresets);
      const savedConfigs: Record<string, number[]> = oldKey
        ? { ...state.savedConfigs, [oldKey]: state.bands.map(b => b.gain) }
        : { ...state.savedConfigs };
      const presetBaseGains = { ...state.presetBaseGains, [action.name]: action.gains };
      const newActivePresets = [action.name];
      const newKey = comboKey(newActivePresets);
      const finalGains = savedConfigs[newKey] ?? action.gains;
      const bands = state.bands.map((b, i) => ({ ...b, gain: finalGains[i] ?? 0 }));
      return { ...state, bands, activePresets: newActivePresets, savedConfigs, presetBaseGains };
    }

    case 'SET_PRESET_NAME':
      return state; // no-op — activePresets is source of truth

    default:
      return state;
  }
}
