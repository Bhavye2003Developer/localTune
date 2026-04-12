@AGENTS.md

# FineTune — CLAUDE.md

> Local-first browser media player. No accounts. No uploads. No server calls. Everything runs offline in the browser.

---

## What This Project Is

A browser-based audio/video player built entirely on Web APIs. Files never leave the device. No backend. No auth. No cloud. The entire product is a Next.js app that talks only to IndexedDB, Web Audio API, and the local filesystem.

When suggesting solutions, always default to browser-native APIs before reaching for a library. If a Web Audio node, a Web Worker, or a standard browser API can do it — use that.

---

## Tech Stack

- **Framework:** Next.js 16 App Router
- **Language:** TypeScript 5 — strict mode, no `any`
- **UI:** React 19
- **Styling:** Tailwind CSS 4
- **Persistence:** Dexie (IndexedDB wrapper) — the only storage layer
- **Animation:** Framer Motion
- **Audio:** Web Audio API — no audio libraries except where explicitly noted
- **Icons:** Lucide React
- **Testing:** Vitest + @testing-library/react

---

## Agent-Driven Development

This project is built session by session using Claude Code. Each session has a clear scope. Follow these rules to keep sessions clean and non-destructive.

### Before writing any code

1. Read `PROGRESS.md` in the project root to understand current state
2. Identify exactly which files are touched by the current task
3. State your plan before executing — what you'll create, what you'll modify, what you won't touch

### Session discipline

- **One feature per session.** Don't bleed into adjacent features even if they look easy.
- **Never refactor outside the current task scope.** If you see something to improve elsewhere, note it in a comment — don't change it.
- **Never rename files, move components, or restructure folders** unless explicitly asked.
- **Never change `playerContext.tsx` structure** without being explicitly asked — it is the core singleton and touches everything.
- If a task requires more than ~15 files, stop and ask for scope confirmation before proceeding.

### After every session

- Update `PROGRESS.md` with what was built, what's partial, what was skipped and why
- Note any new files created in the File Inventory section
- Note any packages installed
- Note any architectural decisions made that future sessions should know about

---

## Code Style

### TypeScript

- Strict mode always — no `any`, no `@ts-ignore` without a comment explaining why
- Explicit return types on all functions that touch audio or state
- Interfaces over types for object shapes
- Never use `!` non-null assertion on DOM queries — check existence first

### React

- Functional components only
- `React.memo` on any component that receives props from a high-frequency update source (RAF ticks, audio data)
- `useCallback` on all handlers passed as props
- `useMemo` for expensive derived values (EQ curve math, filtered lists)
- No inline arrow functions in JSX on performance-sensitive components
- `'use client'` on every component that touches browser APIs
- All audio/canvas components behind `next/dynamic` with `ssr: false`

### State management

- `useReducer` for complex state (player state, EQ state)
- `useState` for simple local UI state only
- Refs (`useRef`) for values that must be read inside RAF or event handlers without causing re-renders
- Never dispatch inside a RAF callback — use refs to read, dispatch only on user gesture

### File organisation

- One component per file
- Co-locate types with the file that owns them
- Shared types go in `app/types/`
- Pure utility functions go in `app/lib/utils.ts`

### Naming

- Components: PascalCase
- Hooks: `use` prefix, camelCase
- Constants: UPPER_SNAKE_CASE
- All other functions and variables: camelCase

---

## Web Audio Rules

These are non-negotiable. Getting them wrong causes audible artifacts or crashes.

### AudioContext

- One `AudioContext` per session — module-level singleton, never recreate
- Always call `audioCtx.resume()` before `play()` — handles Safari autoplay policy
- Use native device sample rate — never hardcode `sampleRate`

### Node graph

- Build the entire graph once on AudioContext creation — never tear down and rebuild
- To bypass a node, set a wrapper `GainNode` gain to 0 — **never disconnect nodes** (causes audio clicks)
- To smoothly change gain: use `setTargetAtTime(value, currentTime, 0.01)` — never set `gain.value` directly during playback

### Workers

- All CPU-intensive audio work in Web Workers — WASM, PCM decode, analysis queues
- Never import WASM bundles in the main thread
- Use `postMessage` for Worker communication — keep message shapes typed

### Performance

- Pre-allocate `Uint8Array` buffers for FFT data — reuse every RAF frame, never allocate inside the loop
- RAF callbacks read from refs only — never call `setState` or `dispatch` inside RAF
- `timeupdate` is too infrequent for seek bar — use RAF reading `audioEl.currentTime` directly

---

## Styling & Design System

### Font

**Syne** — the only font used in this project.

```
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
font-family: 'Syne', system-ui, sans-serif;
```

Weight usage:

- 800 — titles, logo, track name (large)
- 700 — chips, labels, button text
- 600 — track names in list, section headers
- 500 — metadata, secondary info
- 400 — dim text, timestamps

**Never use** Inter, Roboto, system-ui alone, or any other font.

---

### Color Tokens

Always use these exact values. Never invent new grays or neutrals.

```ts
// Backgrounds — darkest to lightest
BG = "#060606"; // true black — page background only
S1 = "#0D0D0D"; // sidebar, player bar, drawer backgrounds
S2 = "#141414"; // input fields, panel bodies, cards
S3 = "#1C1C1C"; // hover backgrounds, secondary cards
S4 = "#242424"; // disabled/inactive elements
S5 = "#2E2E2E"; // seek bar track, slider rails

// Border — one value for everything
BR = "rgba(255,255,255,0.07)";

// Text
T1 = "#F2F2F2"; // primary text
T2 = "#777777"; // secondary text, metadata
T3 = "#333333"; // dim text, inactive icons

// Primary accent
A = "#F59E0B"; // amber — all interactive highlights

// Semantic accents
GREEN = "#22C55E"; // playing state, active, success
BLUE = "#38BDF8"; // info, secondary controls
PURPLE = "#A78BFA"; // moods, stereo
PINK = "#EC4899"; // bookmarks, favorites
ORANGE = "#F97316"; // warnings, limiter
```

---

### Active State Pattern

Every active/selected interactive element follows this exact pattern — no exceptions:

```
background: {color} at 14–18% opacity
border:     1px solid {color} at 40–50% opacity
color:      {color} at full opacity
```

Example for amber:

```css
background: #f59e0b18;
border: 1px solid #f59e0b45;
color: #f59e0b;
```

Never use a solid fill for active states. Always the translucent pattern.

---

### Borders & Radius

- **All borders:** `1px solid rgba(255,255,255,0.07)` — never thicker, never a different color
- **Border radius scale:**
  - 4px — chips, badges, small buttons
  - 6–8px — standard buttons, inputs
  - 10–12px — panels, cards, drawers
  - 14px — mini player, floating elements
  - 18px — mobile bottom sheets only
  - Never go above 18px

---

### Typography Scale

| Use                       | Size     | Weight |
| ------------------------- | -------- | ------ |
| Track title (now playing) | 28–30px  | 800    |
| Section title             | 14–16px  | 800    |
| Track name in list        | 11.5px   | 600    |
| Metadata / secondary      | 9.5–10px | 500    |
| Chips / badges            | 9–10.5px | 700    |
| Dim labels / timestamps   | 8.5–9px  | 400    |
| Minimum (EQ band labels)  | 7px      | 700    |

Never go below 7px or above 30px.

---

### Spacing

- Touch targets: minimum 44×44px on all interactive elements (mobile)
- Panel padding: 12–16px
- Section gap: 8px between related items, 14–16px between sections
- Player bar height: 52px (transport row) + 20px (seek row) = 72px total

---

### Glow Rule

`boxShadow` with amber glow (`0 0 Xpx #F59E0B55`) appears **only** on:

- The play/pause button
- The logo icon

Nowhere else. No other element gets a colored glow of any kind.

---

### Decorative Restraint

Things that are explicitly not done in this project:

- No gradient backgrounds (the Now Playing color-thief gradient is a deliberate one-off)
- No drop shadows on panels or cards
- No border-radius above 18px
- No animations on layout — only on state transitions (playing/paused, active/inactive)
- No decorative dividers — use `1px solid BR` only where separation is functionally needed
- No colored backgrounds on sidebar rows — only the amber left-border on the active track

---

## Layout Principles

### Desktop (≥768px)

Three-column structure:

- **Left:** 240px fixed sidebar — library list + smart playlists
- **Center:** flex:1 — now playing, panel strip, seek bar, queue
- **Bottom:** fixed player bar — transport + seek

All feature panels (EQ, DSP, FX, etc.) collapse inline above the seek bar. No right drawers. No modals except keyboard shortcuts.

### Mobile (<768px)

Two-tab bottom nav:

- **Library tab** — track list + mini player strip at bottom
- **Player tab** — now playing + seek bar + transport + horizontal pill row

Feature panels open as bottom sheets sliding up. Sheet has a drag handle, backdrop closes it. Only the pills that have been activated appear as tabs inside the sheet.

---

## Mobile Rules

- All touch targets ≥ 44px
- `pb-safe` on player bar for iOS notch
- `overscroll-behavior: none` on `html, body`
- Long-press (500ms) for context menus — no hover-only affordances
- Bottom sheets: `animation: slideUp .2s ease`, drag handle `36×3px borderRadius:2 background:T3`

---

## Testing Rules

- Every audio processing function gets a unit test before the feature ships
- Pure reducers must have full coverage
- Web Audio nodes are mocked in tests — never instantiate a real `AudioContext` in Vitest
- Component tests use `@testing-library/react` — test behavior, not implementation
- `.worktrees/**` is excluded in `vitest.config.ts` — never remove this

---

## Hard Rules — Never Do These

- **Never use `localStorage` or `sessionStorage`** — Dexie only
- **Never hardcode sample rates** — always use `AudioContext.sampleRate`
- **Never import WASM in the main thread** — Web Worker only, lazy import
- **Never use `ScriptProcessorNode`** — deprecated, use `AudioWorkletProcessor`
- **Never call `setState` inside RAF** — read refs, dispatch on gesture only
- **Never disconnect/reconnect audio nodes** — use GainNode bypass
- **Never install `next-pwa`** — use Serwist
- **Never add Three.js or WebGL libraries** — the Nebula visualizer was cut, stays out
- **Never suggest a backend or server** — this app has no server, V1 is 100% client
- **Never use Inter, Roboto, Arial, or system-ui** as the font — Syne only
- **Never use `any` in TypeScript** — use `unknown` and narrow, or define the type
