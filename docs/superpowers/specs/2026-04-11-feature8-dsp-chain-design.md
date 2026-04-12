# Feature 8 — Full DSP Signal Chain Design

**Date:** 2026-04-11  
**Status:** Approved  
**Spec source:** `FineTune_V1_Spec-1.md` § Feature 8

---

## Overview

A full configurable audio processing pipeline with 6 stages, each individually bypassable. The 4 middle stages are drag-to-reorder. ReplayGain (input normalization) and Limiter (output protection) are fixed at first and last positions respectively.

---

## Audio Graph

### Current chain
```
src → analyser → eq[0..9] → gainNode → destination
```

### New chain
```
src → analyser → replayGainNode → eq[0..9] → bassEngine → compressor → stereoWidener → reverb → limiter → gainNode → destination
```

All nodes are module-level singletons in `app/lib/dsp.ts`. Each bypassable stage uses a parallel wet/dry `GainNode` pair — toggling bypass swaps gains atomically (no audio click).

---

## Stage Definitions

### ReplayGain (fixed — first)
- Single `GainNode`
- Reads `REPLAYGAIN_TRACK_GAIN` ID3 tag via `jsmediatags` on each track load
- Converts dB string (e.g. `"-6.5 dB"`) to linear gain multiplier
- No bypass toggle in UI (always active); shown as read-only chip
- Not draggable

### EQ (draggable)
- Existing 10× `BiquadFilterNode` chain from Feature 2 — no changes to nodes
- Treated as a single opaque block by `rewireDSPChain`: the chain's input node and output node are the connection points; internal wiring is never touched
- DSP panel shows an "Open EQ →" link button to the existing EQ drawer; no duplication of controls

### Bass Engine (draggable)
- Sub-bass booster: `BiquadFilterNode` lowshelf at 40Hz, ±12dB
- Bass shelf: `BiquadFilterNode` lowshelf at 80Hz, ±12dB
- Bass compressor: `DynamicsCompressorNode` tuned for low frequencies (threshold -24, ratio 4, attack 0.003, release 0.25)
- Mono bass fold: `ChannelSplitterNode` + `ChannelMergerNode` — folds frequencies below 100Hz to mono via a `BiquadFilterNode` crossover pair
- Harmonic enhancer: `WaveShaperNode` soft-clip curve on bass signal path
- Each sub-control has its own on/off toggle

### Compressor (draggable)
- `DynamicsCompressorNode` with full controls: threshold (−60–0 dB), ratio (1–20), attack (0–1s), release (0–1s), knee (0–40 dB), makeup gain (0–+24 dB)
- Live gain reduction meter: reads `DynamicsCompressorNode.reduction` via RAF, rendered as an animated bar

### Stereo Widener (draggable)
- Native nodes only (no AudioWorklet): `ChannelSplitterNode` → mid channel (`GainNode`) + side channel (`GainNode`) → `ChannelMergerNode`
- Width 0 = mono (side gain 0), 100 = original (mid=1, side=1), 200 = hyper-wide (side gain 2)
- Single width slider 0–200

### Reverb (draggable)
- `ConvolverNode` + dry `GainNode` + wet `GainNode` mix
- 4 IR WAV presets: `Studio.wav`, `Hall.wav`, `Church.wav`, `Outdoor.wav` — bundled in `/public/ir/`
- IR WAVs fetched once via `fetch()` + `decodeAudioData()`, cached as `AudioBuffer` in module scope
- Dry/wet slider 0–100%

### Limiter (fixed — last)
- `DynamicsCompressorNode` hardcoded: threshold=-0.1, ratio=20, attack=0.001, release=0.1, knee=0
- Not draggable, no bypass toggle
- UI shows "-0.1 dBFS brickwall" as read-only label

---

## DSP State & Persistence

### State shape

```ts
type StageId = 'eq' | 'bassEngine' | 'compressor' | 'stereoWidener' | 'reverb';

interface DSPSettings {
  stageOrder: StageId[];
  replayGain: { enabled: boolean };
  bassEngine: {
    bypassed: boolean;
    subBass: number;        // dB, ±12
    bassShelf: number;      // dB, ±12
    compressor: boolean;
    monoBass: boolean;
    harmonicEnhancer: boolean;
  };
  compressor: {
    bypassed: boolean;
    threshold: number;      // dB, -60–0
    ratio: number;          // 1–20
    attack: number;         // seconds, 0–1
    release: number;        // seconds, 0–1
    knee: number;           // dB, 0–40
    makeupGain: number;     // dB, 0–24
  };
  stereoWidener: {
    bypassed: boolean;
    width: number;          // 0–200
  };
  reverb: {
    bypassed: boolean;
    preset: 'Studio' | 'Hall' | 'Church' | 'Outdoor';
    wet: number;            // 0–1
  };
}
```

### Defaults
```ts
const DSP_DEFAULTS: DSPSettings = {
  stageOrder: ['eq', 'bassEngine', 'compressor', 'stereoWidener', 'reverb'],
  replayGain: { enabled: true },
  bassEngine: { bypassed: false, subBass: 0, bassShelf: 0, compressor: false, monoBass: false, harmonicEnhancer: false },
  compressor: { bypassed: false, threshold: -24, ratio: 3, attack: 0.003, release: 0.25, knee: 30, makeupGain: 0 },
  stereoWidener: { bypassed: false, width: 100 },
  reverb: { bypassed: false, preset: 'Studio', wet: 0.2 },
};
```

### Persistence
- New Dexie table `dspSettings` — single row keyed `id: 'default'`
- On app load: read table, restore param values + stage order
- On change: immediate imperative audio mutation + debounced 500ms Dexie write (same pattern as EQ)

### ReplayGain flow
`jsmediatags` already runs on every track load in `playerContext.tsx`. Add `REPLAYGAIN_TRACK_GAIN` tag read there; on track change call `setReplayGain(db)` in `dsp.ts` which converts the dB string to linear and sets the `GainNode.gain.value`.

### Node rewire on drag
`stageOrder` change triggers `rewireDSPChain(order)` in `dsp.ts` — disconnects all middle-stage nodes, reconnects in new order between `analyser` output and `limiter` input. The `gainNode → destination` tail is untouched.

---

## UI — DSP Panel

### Component: `DSPPanel.tsx`
- Drawer slides above `PlayerBar`, identical structure to `EQPanel.tsx`
- Toggled by `D` keyboard shortcut and a `D` button in `PlayerBar`
- Height: `h-[280px]`, `bottom: 3.5rem`, CSS transition

### Layout
```
┌─ DSP Chain ──────────────────────── [master bypass] ─┐
│ ┌─ ReplayGain ─────────────────── -6.5 dB detected ─┐│
│ └────────────────────────────────────────────────────┘│
│ ┌─≡─ [●] EQ ──────────────────────────────── [∨] ──┐ │
│ │   Open EQ →                                       │ │
│ └───────────────────────────────────────────────────┘ │
│ ┌─≡─ [●] Bass Engine ─────────────────────── [∨] ──┐ │
│ │   sub-bass [-12──●──+12]  bass shelf [...] ...    │ │
│ └───────────────────────────────────────────────────┘ │
│ ┌─≡─ [●] Compressor ──────────────────────── [∨] ──┐ │
│ │   threshold [...] ratio [...] ║ GR: ████░░ -3dB   │ │
│ └───────────────────────────────────────────────────┘ │
│ ┌─≡─ [●] Stereo Widener ──────────────────── [∨] ──┐ │
│ │   width [0────●────200]                           │ │
│ └───────────────────────────────────────────────────┘ │
│ ┌─≡─ [●] Reverb ──────────────────────────── [∨] ──┐ │
│ │   [Studio] [Hall] [Church] [Outdoor]  wet [...]   │ │
│ └───────────────────────────────────────────────────┘ │
│ ┌─ Limiter ────────────────── -0.1 dBFS brickwall ─┐ │
│ └────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

### Cards
- Collapsed by default; click header to expand
- Bypass toggle (`●` power icon): active = colored, bypassed = dimmed
- Drag handle (`≡`): only on the 4 middle stages
- dnd-kit `@dnd-kit/sortable` (already installed) handles reorder

---

## File Structure

### New files
| File | Purpose |
|------|---------|
| `app/lib/dsp.ts` | All DSP node creation, wiring, bypass, mutation, rewire functions |
| `app/components/dsp/DSPPanel.tsx` | Drawer shell — card list, master bypass, dnd-kit sortable |
| `app/components/dsp/stages/ReplayGainStage.tsx` | ReplayGain card UI |
| `app/components/dsp/stages/BassEngineStage.tsx` | Bass Engine card UI |
| `app/components/dsp/stages/CompressorStage.tsx` | Compressor card UI + GR meter |
| `app/components/dsp/stages/StereoWidenerStage.tsx` | Stereo Widener card UI |
| `app/components/dsp/stages/ReverbStage.tsx` | Reverb card UI |
| `app/components/dsp/stages/LimiterStage.tsx` | Limiter card UI |
| `public/ir/Studio.wav` | IR impulse response |
| `public/ir/Hall.wav` | IR impulse response |
| `public/ir/Church.wav` | IR impulse response |
| `public/ir/Outdoor.wav` | IR impulse response |
| `__tests__/dsp.test.ts` | DSP node unit tests (~20 cases) |
| `__tests__/DSPPanel.test.tsx` | Panel component tests (~15 cases) |

### Modified files
| File | Change |
|------|--------|
| `app/lib/playerContext.tsx` | Import `dsp.ts`; add `dspOpen` state; expose DSP controls via context; add ReplayGain tag read on track load |
| `app/lib/db.ts` | Add `dspSettings` table |
| `app/components/player/PlayerShell.tsx` | Render `<DSPPanel />` |
| `app/components/player/PlayerBar.tsx` | Add `D` button |
| `app/hooks/useKeyboardShortcuts.ts` | Add `D` key handler |
| `__tests__/useKeyboardShortcuts.test.tsx` | Add `D` key test case |
| `PROGRESS.md` | Update Feature 8 status |

---

## Testing Strategy

### `__tests__/dsp.test.ts`
- Node chain wired in correct order on init
- Bypass toggle switches wet/dry gains correctly (both directions)
- `rewireDSPChain` produces correct connection order for arbitrary permutations
- ReplayGain dB-to-linear conversion is correct (e.g. `-6.02 dB` → `~0.5`)
- ReplayGain gracefully handles missing tag (gain stays 1.0)
- Limiter params are hardcoded and not mutated by any public function
- IR WAV fetch caches result — second call hits cache, no second `fetch()`
- Stereo widener width=0 produces mono (side gain=0), width=100 is unity, width=200 doubles side

### `__tests__/DSPPanel.test.tsx`
- Panel renders all 6 stage cards
- Bypass toggle calls correct DSP function and updates visual state
- Expand/collapse works per card
- Compressor GR meter renders and updates
- Reverb preset buttons switch active preset
- Drag reorder calls `rewireDSPChain` with updated order

### `__tests__/useKeyboardShortcuts.test.tsx`
- `D` key opens DSP panel
- `D` key closes DSP panel when open

**Estimated total new tests:** ~35 cases across 3 test files.

---

## Browser Compatibility

All nodes used are native Web Audio API — no AudioWorklet, no WASM.

| Browser | Support |
|---------|---------|
| Chrome | ✅ |
| Firefox | ✅ |
| Safari | ✅ |
| Edge | ✅ |
| Android Chrome | ✅ |
| iOS Safari | ✅ |

---

## Out of Scope (V1)

- Pitch-shift independent of speed (spec deferred in Feature 7)
- LUFS fallback for ReplayGain when no tag present (requires essentia.js — Feature 3)
- Per-stage presets / save slots
- Spectrum analyzer overlay on any stage
