export interface Band {
  freq: number;
  gain: number;   // -15 to +15 dB
  q: number;
  type: BiquadFilterType;
}

export interface EQState {
  bands: Band[];
  bypass: boolean;
  presetName: string;  // '' = unsaved custom, 'Flat' = flat preset, etc.
}

export type EQAction =
  | { type: 'SET_BAND_GAIN'; index: number; gain: number }
  | { type: 'TOGGLE_BYPASS' }
  | { type: 'LOAD_PRESET'; gains: number[]; name: string }
  | { type: 'RESET_FLAT' }
  | { type: 'SET_PRESET_NAME'; name: string };

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
  presetName: 'Flat',
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

export function eqReducer(state: EQState, action: EQAction): EQState {
  switch (action.type) {
    case 'SET_BAND_GAIN': {
      const clamped = Math.max(-15, Math.min(15, action.gain));
      const bands = state.bands.map((b, i) =>
        i === action.index ? { ...b, gain: clamped } : b
      );
      return { ...state, bands, presetName: '' };
    }
    case 'TOGGLE_BYPASS':
      return { ...state, bypass: !state.bypass };
    case 'LOAD_PRESET': {
      const bands = state.bands.map((b, i) => ({ ...b, gain: action.gains[i] ?? 0 }));
      return { ...state, bands, presetName: action.name };
    }
    case 'RESET_FLAT': {
      const bands = state.bands.map(b => ({ ...b, gain: 0 }));
      return { ...state, bands, presetName: 'Flat' };
    }
    case 'SET_PRESET_NAME':
      return { ...state, presetName: action.name };
    default:
      return state;
  }
}
