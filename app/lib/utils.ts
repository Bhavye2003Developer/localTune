export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Chromatic circle color mapping: C=0 (red) → B=11 (magenta)
export const KEY_COLORS: readonly number[] = [
  0xff2200, // C  — red
  0xff5500, // C# — orange-red
  0xff8800, // D  — orange
  0xffbb00, // D# — amber
  0xffee00, // E  — yellow
  0x88ff00, // F  — lime
  0x00ff44, // F# — green
  0x00ffaa, // G  — aquamarine
  0x00ddff, // G# — cyan
  0x0088ff, // A  — blue
  0x6600ff, // A# — indigo
  0xee00ff, // B  — magenta
] as const;

export const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * Deterministically maps a string to an RGB color via djb2 hash → HSL(hue, 55%, 42%).
 * Used as a gradient fallback for tracks with no album art.
 */
export function hashToColor(str: string): [number, number, number] {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (((hash << 5) + hash) ^ str.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  // HSL → RGB  (s=0.55, l=0.42)
  const s = 0.55;
  const l = 0.42;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if      (hue < 60)  { r = c; g = x; b = 0; }
  else if (hue < 120) { r = x; g = c; b = 0; }
  else if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else if (hue < 300) { r = x; g = 0; b = c; }
  else                { r = c; g = 0; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}
