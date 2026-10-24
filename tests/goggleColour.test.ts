import { describe, expect, it } from 'vitest';
import { GOGGLE_COLOURS, goggleColour } from '../src/operators/runtime/goggle';

// (G135) Each player's goggle light is a distinct colour: the partner beacon.

type Rgb = readonly [number, number, number];
const lum = (c: Rgb): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
/** Machado et al. 2009, severity 1, linear RGB. */
const DEUTAN = [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881];
const PROTAN = [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998];
const sim = (m: number[], c: Rgb): Rgb => [
  m[0]! * c[0] + m[1]! * c[1] + m[2]! * c[2],
  m[3]! * c[0] + m[4]! * c[1] + m[5]! * c[2],
  m[6]! * c[0] + m[7]! * c[1] + m[8]! * c[2],
];
const dist = (a: Rgb, b: Rgb): number => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

describe('goggle colour per player (G135)', () => {
  it('slot 0 (host, solo) is Wren\'s own green lens; slot 1 (partner) is cyan', () => {
    expect(goggleColour(0)).toEqual([0.3, 0.85, 0.16]);
    const c = goggleColour(1);
    expect(c[2]).toBeGreaterThan(c[0]);
    expect(c[2]).toBeGreaterThanOrEqual(c[1]);
    expect(c[1]).toBeGreaterThan(0.5); // cyan, not blue: reads in the dark
  });

  it('every slot colour differs from the others; the two players\' also with red-green colour blindness', () => {
    for (let i = 0; i < GOGGLE_COLOURS.length; i++) {
      for (let j = i + 1; j < GOGGLE_COLOURS.length; j++) {
        expect(dist(GOGGLE_COLOURS[i]!, GOGGLE_COLOURS[j]!), `${i}/${j}`).toBeGreaterThan(0.4);
      }
    }
    // G132: two humans, so the pair that must survive colour blindness is slot 0 / slot 1 (2-3 are legacy lobby slots)
    const a = goggleColour(0);
    const b = goggleColour(1);
    expect(dist(sim(DEUTAN, a), sim(DEUTAN, b))).toBeGreaterThan(0.5);
    expect(dist(sim(PROTAN, a), sim(PROTAN, b))).toBeGreaterThan(0.5);
    // the reason the partner is not amber: green and amber collapse for a deuteranope
    expect(dist(sim(DEUTAN, GOGGLE_COLOURS[0]!), sim(DEUTAN, [1, 0.5, 0.05]))).toBeLessThan(0.25);
  });

  it('every beacon is about as bright as the green (within 25%), so both read alike in the dark', () => {
    const g = lum(GOGGLE_COLOURS[0]!);
    for (const c of GOGGLE_COLOURS) expect(Math.abs(lum(c) - g) / g).toBeLessThan(0.25);
  });

  it('out-of-range slots wrap; bad slots are 0', () => {
    expect(goggleColour(GOGGLE_COLOURS.length + 1)).toBe(goggleColour(1));
    expect(goggleColour(-1)).toBe(goggleColour(0));
    expect(goggleColour(0.5)).toBe(goggleColour(0));
    expect(goggleColour(Number.NaN)).toBe(goggleColour(0));
  });
});
