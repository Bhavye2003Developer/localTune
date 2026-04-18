import { describe, it, expect } from 'vitest';
import { hashToColor } from '../app/lib/utils';

describe('hashToColor', () => {
  it('returns a valid RGB triple for a normal string', () => {
    const [r, g, b] = hashToColor('Bohemian Rhapsody');
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(255);
    expect(g).toBeGreaterThanOrEqual(0);
    expect(g).toBeLessThanOrEqual(255);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(255);
  });

  it('is deterministic — same input produces same output', () => {
    const a = hashToColor('Track TitleArtist Name');
    const b = hashToColor('Track TitleArtist Name');
    expect(a).toEqual(b);
  });

  it('produces different colors for different strings', () => {
    const a = hashToColor('Alpha');
    const b = hashToColor('Beta');
    expect(a).not.toEqual(b);
  });

  it('handles empty string without throwing', () => {
    expect(() => hashToColor('')).not.toThrow();
    const [r, g, b] = hashToColor('');
    expect([r, g, b].every(v => v >= 0 && v <= 255)).toBe(true);
  });

  it('handles unicode characters', () => {
    const [r, g, b] = hashToColor('音楽 — いい曲');
    expect([r, g, b].every(v => v >= 0 && v <= 255)).toBe(true);
  });

  it('all returned values are integers', () => {
    const [r, g, b] = hashToColor('Some Track');
    expect(Number.isInteger(r)).toBe(true);
    expect(Number.isInteger(g)).toBe(true);
    expect(Number.isInteger(b)).toBe(true);
  });

  it('produces diverse hues across different titles', () => {
    const titles = ['Rock', 'Jazz', 'Pop', 'Classical', 'Electronic', 'Hip-Hop', 'Country', 'Blues'];
    const colors = titles.map(t => hashToColor(t));
    // Not all the same color
    const unique = new Set(colors.map(c => c.join(',')));
    expect(unique.size).toBeGreaterThan(4);
  });

  it('title-only and title+artist produce different colors', () => {
    const a = hashToColor('Imagine');
    const b = hashToColor('ImagineJohn Lennon');
    expect(a).not.toEqual(b);
  });

  it('very long string does not throw', () => {
    const long = 'a'.repeat(10_000);
    expect(() => hashToColor(long)).not.toThrow();
  });

  it('special characters in title produce valid RGB', () => {
    const [r, g, b] = hashToColor('Track #1 (feat. Artist) [Remastered]');
    expect([r, g, b].every(v => v >= 0 && v <= 255)).toBe(true);
  });
});
