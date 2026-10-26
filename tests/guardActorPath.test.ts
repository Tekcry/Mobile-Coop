import { describe, expect, it } from 'vitest';
import { actorPath, emptyPathSample, pathLength, sample } from '../src/ai/guardActorPath';

// (guard-ai piano GA4) The GuardActor's path: a flat (x, z) polyline sampled by distance, no allocation per call.

const EAST = Math.PI / 2; // +X
const NORTH = 0; // +Z

describe('guardActorPath', () => {
  // (0,0) -> (4,0) -> (4,3): an L, 7 m
  const L = actorPath([0, 0, 4, 0, 4, 3]);

  it('measures the length', () => {
    expect(pathLength(L)).toBeCloseTo(7, 9);
    expect(pathLength(actorPath([1, 1, 4, 5]))).toBeCloseTo(5, 9);
    expect(pathLength(actorPath([2, 2]))).toBe(0);
  });

  it('the start: the first point, the first leg heading (and before the start)', () => {
    const o = emptyPathSample();
    sample(L, 0, o);
    expect([o.x, o.z]).toEqual([0, 0]);
    expect(o.heading).toBeCloseTo(EAST, 9);
    sample(L, -3, o);
    expect([o.x, o.z]).toEqual([0, 0]);
    expect(o.heading).toBeCloseTo(EAST, 9);
  });

  it('mid-leg: interpolated, that leg heading', () => {
    const o = emptyPathSample();
    sample(L, 1.5, o);
    expect(o.x).toBeCloseTo(1.5, 9);
    expect(o.z).toBeCloseTo(0, 9);
    expect(o.heading).toBeCloseTo(EAST, 9);
    sample(L, 5.5, o);
    expect(o.x).toBeCloseTo(4, 9);
    expect(o.z).toBeCloseTo(1.5, 9);
    expect(o.heading).toBeCloseTo(NORTH, 9);
  });

  it('a corner: the corner point, then the next leg heading', () => {
    const o = emptyPathSample();
    sample(L, 3.999, o);
    expect(o.heading).toBeCloseTo(EAST, 9);
    sample(L, 4, o);
    expect(o.x).toBeCloseTo(4, 9);
    expect(o.z).toBeCloseTo(0, 9);
    expect(o.heading).toBeCloseTo(NORTH, 9);
  });

  it('past the end: stops on the last point, the last leg heading held', () => {
    const o = emptyPathSample();
    sample(L, 7, o);
    expect([o.x, o.z]).toEqual([4, 3]);
    expect(o.heading).toBeCloseTo(NORTH, 9);
    sample(L, 50, o);
    expect([o.x, o.z]).toEqual([4, 3]);
    expect(o.heading).toBeCloseTo(NORTH, 9);
  });

  it('a one-point path stands still', () => {
    const P = actorPath([3, -2]);
    const o = emptyPathSample();
    for (const d of [-1, 0, 0.5, 10]) {
      sample(P, d, o);
      expect([o.x, o.z, o.heading]).toEqual([3, -2, 0]);
    }
  });

  it('repeated points: no NaN heading, the length unchanged', () => {
    const P = actorPath([0, 0, 0, 0, 0, 2, 0, 2, -2, 2]);
    expect(pathLength(P)).toBeCloseTo(4, 9);
    const o = emptyPathSample();
    sample(P, 0, o);
    expect(o.heading).toBeCloseTo(NORTH, 9);
    sample(P, 2, o);
    expect(o.heading).toBeCloseTo(-EAST, 9);
    sample(P, 9, o);
    expect([o.x, o.z]).toEqual([-2, 2]);
    expect(o.heading).toBeCloseTo(-EAST, 9);
  });

  it('writes into the caller object (returns it) and rejects bad data', () => {
    const o = emptyPathSample();
    expect(sample(L, 2, o)).toBe(o);
    expect(() => actorPath([])).toThrow();
    expect(() => actorPath([1, 2, 3])).toThrow();
    expect(() => actorPath([0, Number.NaN])).toThrow();
  });
});
