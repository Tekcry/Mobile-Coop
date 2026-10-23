import { describe, expect, it } from 'vitest';
import { SWEEP, sweepPoints, sweepStart } from '../src/ai/gear';

// (guard-ai S11) the response team's sweep: route points and posts thinned to one per 8 m, nearest to the LKP first
// (research item 11).

type Pt = [number, number];
const pairs = (flat: readonly number[]): Pt[] => {
  const o: Pt[] = [];
  for (let i = 0; i < flat.length; i += 2) o.push([flat[i]!, flat[i + 1]!]);
  return o;
};

describe('sweepPoints', () => {
  it('thins: the first point within 8 m is kept, later ones near it are dropped', () => {
    const out: number[] = [];
    const n = sweepPoints([[[0, 0], [3, 0], [20, 0]], [[0, 7.9], [0, 30]]], [], 0, 0, SWEEP.thin, out);
    expect(n).toBe(3);
    expect(pairs(out)).toEqual([[0, 0], [20, 0], [0, 30]]);
  });
  it('a point exactly thin metres away is kept', () => {
    const out: number[] = [];
    expect(sweepPoints([[[0, 0], [8, 0]]], [], 0, 0, 8, out)).toBe(2);
  });
  it('routes come first, then posts: a post near a route point is dropped, a far one kept', () => {
    const out: number[] = [];
    const n = sweepPoints([[[10, 10]]], [[12, 10], [40, 10]], 10, 10, SWEEP.thin, out);
    expect(n).toBe(2);
    expect(pairs(out)).toEqual([[10, 10], [40, 10]]);
  });
  it('orders the kept points nearest to the LKP first, into flat x, z pairs', () => {
    const out: number[] = [99, 99, 99];
    const n = sweepPoints([[[0, 0], [20, 0], [40, 0], [60, 0]]], [], 38, 0, SWEEP.thin, out);
    expect(n).toBe(4);
    expect(out.length).toBe(8);
    expect(pairs(out)).toEqual([[40, 0], [20, 0], [60, 0], [0, 0]]);
  });
  it('ties keep gather order', () => {
    const out: number[] = [];
    sweepPoints([[[-10, 0], [10, 0], [0, 10], [0, -10]]], [], 0, 0, 5, out);
    expect(pairs(out)).toEqual([[-10, 0], [10, 0], [0, 10], [0, -10]]);
  });
  it('empty data gives no points and an empty out', () => {
    const out: number[] = [1, 2];
    expect(sweepPoints([], [], 0, 0, 8, out)).toBe(0);
    expect(out).toEqual([]);
    expect(sweepPoints([[]], [], 0, 0, 8, out)).toBe(0);
  });
  it('thin 0 keeps every distinct point', () => {
    const out: number[] = [];
    expect(sweepPoints([[[0, 0], [0.1, 0], [0, 0.1]]], [], 0, 0, 0, out)).toBe(3);
  });
});

describe('sweepStart', () => {
  it('spreads teams about a third of the loop apart and wraps', () => {
    expect(sweepStart(0, 9)).toBe(0);
    expect(sweepStart(1, 9)).toBe(3);
    expect(sweepStart(2, 9)).toBe(6);
    expect(sweepStart(3, 9)).toBe(0);
    expect(sweepStart(1, 10)).toBe(4);
  });
  it('count 0, below 0 or 1: always 0; always inside 0..count-1', () => {
    expect(sweepStart(5, 0)).toBe(0);
    expect(sweepStart(5, -2)).toBe(0);
    expect(sweepStart(5, NaN)).toBe(0);
    expect(sweepStart(0, 1)).toBe(0);
    expect(sweepStart(7, 1)).toBe(0);
    for (let team = 0; team < 8; team++) {
      for (let count = 1; count < 12; count++) {
        const s = sweepStart(team, count);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(count);
      }
    }
  });
  it('a negative or fractional team is floored at 0', () => {
    expect(sweepStart(-3, 9)).toBe(0);
    expect(sweepStart(NaN, 9)).toBe(0);
    expect(sweepStart(1.9, 9)).toBe(3);
  });
});
