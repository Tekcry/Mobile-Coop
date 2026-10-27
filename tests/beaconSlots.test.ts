import { describe, expect, it } from 'vitest';
import { BEACON } from '../src/player/goggleGlow';

const key = (c: { r: number; g: number; b: number }): string => `${c.r.toFixed(3)},${c.g.toFixed(3)},${c.b.toFixed(3)}`;
const rgb = (c: { r: number; g: number; b: number }): number[] => [c.r, c.g, c.b];

describe('beacon slots (coop4 A15)', () => {
  it('has 4 entries with distinct idle and on colours', () => {
    expect(BEACON.length).toBe(4);
    expect(new Set(BEACON.map((b) => key(b.idle))).size).toBe(4);
    expect(new Set(BEACON.map((b) => key(b.on))).size).toBe(4);
  });

  it('keeps blue and red equal to master', () => {
    const master = [
      { idle: [0.12, 0.3, 1], on: [0.35, 0.55, 1] },
      { idle: [1, 0.1, 0.08], on: [1, 0.4, 0.3] },
    ];
    master.forEach((m, i) => {
      const b = BEACON[i]!;
      expect(rgb(b.idle)).toEqual(m.idle);
      expect(rgb(b.on)).toEqual(m.on);
      expect(b.idle.a).toBe(1);
      expect(b.on.a).toBe(1);
    });
  });

  it('amber and violet match the spec', () => {
    expect(rgb(BEACON[2]!.idle)).toEqual([1, 0.55, 0.05]);
    expect(rgb(BEACON[2]!.on)).toEqual([1, 0.75, 0.3]);
    expect(rgb(BEACON[3]!.idle)).toEqual([0.6, 0.2, 1]);
    expect(rgb(BEACON[3]!.on)).toEqual([0.8, 0.5, 1]);
  });
});
