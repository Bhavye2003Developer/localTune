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
