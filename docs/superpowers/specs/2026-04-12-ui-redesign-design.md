# FineTune UI Redesign — Design Spec

**Date:** 2026-04-12
**Scope:** Full visual layer replacement — NEXUS-7 cyberpunk → CLAUDE.md design system
**Constraint:** Zero functional changes. All audio logic, state, Web Audio graph untouched.

---

## Goal

Replace the current NEXUS-7 theme (cyan accent, monospace tactical labels, dot-grid background, scanline overlays) with the design system defined in CLAUDE.md: Syne font, amber accent, neutral dark palette, clean minimal layout.

---

## Design Tokens

Replace all `--nx-*` CSS variables with CLAUDE.md tokens in `globals.css`.

```css
/* Backgrounds */
--bg:  #060606;   /* page background only */
--s1:  #0D0D0D;   /* sidebar, player bar, drawer backgrounds */
--s2:  #141414;   /* input fields, panel bodies, cards */
--s3:  #1C1C1C;   /* hover backgrounds, secondary cards */
--s4:  #242424;   /* disabled/inactive elements */
--s5:  #2E2E2E;   /* seek bar track, slider rails */

/* Border */
--br:  rgba(255,255,255,0.07);  /* every border, no exceptions */

/* Text */
--t1:  #F2F2F2;   /* primary text */
--t2:  #777777;   /* secondary text, metadata */
--t3:  #333333;   /* dim text, inactive icons */

/* Accents */
--a:       #F59E0B;   /* amber — all interactive highlights */
--green:   #22C55E;
--blue:    #38BDF8;
--purple:  #A78BFA;
--pink:    #EC4899;
--orange:  #F97316;
```

---

## Font

Remove Geist. Add Syne from Google Fonts.

```css
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
font-family: 'Syne', system-ui, sans-serif;
```

Weight usage per CLAUDE.md:
- 800 — titles, logo, track name (large)
- 700 — chips, labels, button text
- 600 — track names in list, section headers
- 500 — metadata, secondary info
- 400 — dim text, timestamps

---

## Active State Pattern

Every active/selected interactive element:
```css
background: {color} at 14–18% opacity
border:     1px solid {color} at 40–50% opacity
color:      {color} at full opacity
```

For amber:
```css
background: #f59e0b18;
border: 1px solid #f59e0b45;
color: #f59e0b;
```

Never solid fill. No other glow except play/pause button and logo.

---

## Layout

### Desktop (≥768px)

```
┌─────────────┬──────────────────────────────────┐
│  240px      │  flex:1 center                   │
│  sidebar    │  now playing stage               │
│  (S1 bg)    │  EQ/DSP panels above seek bar    │
│             │  (BG background)                 │
├─────────────┴──────────────────────────────────┤
│  72px fixed player bar (S1 bg, full width)     │
└────────────────────────────────────────────────┘
```

- Sidebar: `w-60` (240px), fixed left, `background: var(--s1)`, `border-right: 1px solid var(--br)`
- Center: `flex-1`, `background: var(--bg)`
- Player bar: `h-18` (72px = 52px transport + 20px seek), `background: var(--s1)`, `border-top: 1px solid var(--br)`
- Feature panels (EQ, DSP): collapse inline above seek bar in center column. No right drawers, no modals except keyboard shortcuts.

### Mobile (<768px)

Two-tab bottom nav: Library tab + Player tab.
- Library tab: track list + mini player strip at bottom
- Player tab: now playing + seek bar + transport + horizontal pill row
- Feature panels open as bottom sheets sliding up
- Sheet: drag handle 36×3px, borderRadius 2, background `var(--t3)`; backdrop closes it
- Animation: `slideUp 0.2s ease`

---

## Typography Scale

| Use                       | Size     | Weight |
|---------------------------|----------|--------|
| Track title (now playing) | 28–30px  | 800    |
| Section title             | 14–16px  | 800    |
| Track name in list        | 11.5px   | 600    |
| Metadata / secondary      | 9.5–10px | 500    |
| Chips / badges            | 9–10.5px | 700    |
| Dim labels / timestamps   | 8.5–9px  | 400    |

Never below 7px or above 30px.

---

## Component Changes

### `globals.css`
- Remove all `--nx-*` variables and NEXUS-7 theme
- Remove dot-grid, scanline, nx-clip-panel, all nx-* keyframes and utilities
- Add CLAUDE.md tokens
- Add Syne import
- Add `slideUp` keyframe for mobile bottom sheets
- Keep: `pb-safe`, `overscroll-behavior: none`, scrollbar styles

### `app/layout.tsx`
- Remove Geist font import
- Add Syne via next/font/google or direct import

### `TacticalBrackets.tsx`
- **Delete** — remove file, remove all imports

### `PlayerShell.tsx`
- Page background: `var(--bg)` (#060606)
- Remove `nx-dot-grid` class
- Sidebar: `w-60` fixed left, `background: var(--s1)`, `border-right: 1px solid var(--br)`
- Center: `flex-1 min-w-0`, `background: var(--bg)`
- Sidebar header: "Library" label in Syne 800 14px, `color: var(--t1)`
- No "INTEL DATABASE" tactical label

### `PlayerBar.tsx`
- Background: `var(--s1)`, `border-top: 1px solid var(--br)`
- Height: 72px total (52px transport row + 20px seek row)
- All icon buttons: `color: var(--t2)` inactive, amber active state pattern
- Play/pause button: amber glow `0 0 12px #F59E0B55` (only this button gets glow)
- Speed badge: chip style (amber active pattern)
- Volume slider track: `var(--s5)`, fill `var(--a)`
- Seek bar track: `var(--s5)`, fill `var(--a)`, thumb amber
- Album art: 40×40px, `borderRadius: 6px`
- Track title: Syne 600 11.5px, `var(--t1)`
- Artist: Syne 500 9.5px, `var(--t2)`

### `TrackLibrary.tsx`
- Background: `var(--s1)` (inherits from sidebar)
- Row: hover `background: var(--s3)`
- Active track: `border-left: 2px solid var(--a)`, `background: var(--s3)`, `color: var(--t1)`
- Inactive track title: Syne 600 11.5px, `var(--t1)`
- Artist/duration metadata: Syne 500 9.5px, `var(--t2)`
- Search input: `background: var(--s2)`, `border: 1px solid var(--br)`, `borderRadius: 6px`, placeholder `var(--t3)`
- "Library" section header: Syne 800 14px, `var(--t1)`

### `FileDropZone.tsx`
- Default state: `border: 1px dashed var(--br)`, `background: var(--s2)`, `borderRadius: 8px`
- Hover/drag-over: `border-color: var(--a)`, `background: #f59e0b08`
- Icon/text: `var(--t2)` → `var(--a)` on hover
- Remove tactical "LOAD AUDIO" style labels

### `NowPlayingStage.tsx`
- Background: `var(--bg)`
- Remove `TacticalBrackets`, dot-grid, scanline, all `--nx-*` usage
- Remove "AWAITING TRANSMISSION", "INTEL DATABASE", "BROADCASTING", "STANDBY" labels
- Standby state: simple centered icon + "Drop files or click to open library" in Syne 500 14px `var(--t2)`
- Album art: larger centered, `borderRadius: 10px`, `border: 1px solid var(--br)`
- Track title: Syne 800 28px, `var(--t1)`
- Artist: Syne 500 14px, `var(--t2)`
- Album: Syne 400 12px, `var(--t3)`
- Format/size chips: amber active pattern for format, `var(--s2)` border chip for size/duration
- Playing indicator: simple green dot `var(--green)` instead of animated cyan bars

### `NowPlayingPanel.tsx`
- Overlay: `background: var(--s1)`, `border: 1px solid var(--br)`, `borderRadius: 12px`
- Album art: `borderRadius: 10px`
- Title: Syne 800 28px, `var(--t1)`
- Artist: Syne 500 14px, `var(--t2)`
- Metadata chips: amber active pattern
- Close button: `var(--t2)` → `var(--t1)` hover
- Remove nx-* styles

### `EQPanel.tsx`
- Background: `var(--s1)`, `border-top: 1px solid var(--br)`
- Header: Syne 800 14px, `var(--t1)`
- Bypass toggle: amber active pattern
- Preset chips: amber active pattern when selected, `var(--s2)` default
- Band value labels: Syne 400 8.5px, `var(--t2)`
- EQ curve line: `var(--a)` (amber)
- Draggable dots: amber fill

### `EQCurve.tsx`
- Curve stroke: `var(--a)` (#F59E0B)
- Grid lines: `var(--br)` (rgba(255,255,255,0.07))
- Draggable dots: amber fill with amber glow (no — only play button gets glow)
- Dots: amber fill, `var(--s1)` stroke

### `QueueSidebar.tsx`
- Background: `var(--s1)`, `border-left: 1px solid var(--br)`
- Header: Syne 800 14px, `var(--t1)`
- Active/playing track row: amber active pattern left border
- Drag handle: `var(--t3)`
- Remove button: `var(--t2)` → `var(--orange)` hover

### `KeyboardShortcutsOverlay.tsx`
- Backdrop: `rgba(0,0,0,0.7)`
- Panel: `background: var(--s1)`, `border: 1px solid var(--br)`, `borderRadius: 12px`
- Title: Syne 800 16px, `var(--t1)`
- Key chips: `background: var(--s2)`, `border: 1px solid var(--br)`, Syne 700 9px
- Description text: Syne 500 11px, `var(--t2)`

---

## What Does NOT Change

- All TypeScript logic, state management, reducers
- Web Audio graph (nodes, connections, gain values)
- Dexie schema and persistence
- All hook implementations
- All test files
- Component interfaces / prop shapes
- playerContext.tsx (core singleton — never touch without explicit ask)
- Next.js routing and layout structure
- Any feature not listed above

---

## Borders & Radius Reference

- 4px — chips, badges, small buttons
- 6–8px — standard buttons, inputs
- 10–12px — panels, cards, drawers
- 14px — mini player, floating elements
- Never above 18px

---

## Glow Rule

`boxShadow` with amber glow (`0 0 Xpx #F59E0B55`) appears **only** on:
- The play/pause button
- The logo icon (if present)

Nothing else gets any glow of any kind.

---

## Worktree Merges

After UI redesign is complete on `dev`, merge the following to `master`:
1. `feature/feature8-dsp` (Full DSP Signal Chain)
2. `feature/partial-tasks-completion` (NowPlayingPanel, KeyboardShortcuts, queue callbacks)
3. `dev` (UI redesign + all prior work)

Merge order: feature branches → master via fast-forward or merge commit. No rebase.
