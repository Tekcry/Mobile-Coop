import { describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { reachElbow } from '../src/characters/reach';

const S = new Vector3(0, 1.4, 0);
const dist = (a: Vector3, b: Vector3): number => Vector3.Distance(a, b);

describe('mixamo arm reach (walk-test fix A3)', () => {
  it('puts the elbow at both bone lengths, the wrist on a target in reach', () => {
    const E = new Vector3(0.05, 1.12, -0.05);
    const T = new Vector3(0.1, 1.35, 0.4);
    const out = new Vector3();
    expect(reachElbow(S, E, T, 0.28, 0.26, out)).toBe(true);
    expect(dist(S, out)).toBeCloseTo(0.28, 6);
    expect(dist(out, T)).toBeCloseTo(0.26, 6);
  });

  it('keeps the elbow on its side of the shoulder-to-target line', () => {
    const T = new Vector3(0, 1.4, 0.4);
    const down = new Vector3();
    const up = new Vector3();
    reachElbow(S, new Vector3(0, 1.2, 0.1), T, 0.28, 0.26, down);
    reachElbow(S, new Vector3(0, 1.6, 0.1), T, 0.28, 0.26, up);
    expect(down.y).toBeLessThan(1.4);
    expect(up.y).toBeGreaterThan(1.4);
  });

  it('points the straight arm at a target out of reach', () => {
    const T = new Vector3(0, 1.4, 2);
    const out = new Vector3();
    expect(reachElbow(S, new Vector3(0, 1.2, 0.1), T, 0.28, 0.26, out)).toBe(true);
    expect(out.z).toBeCloseTo(0.28, 2);
    expect(Math.abs(out.y - 1.4)).toBeLessThan(0.01);
  });

  it('leaves the elbow alone when the arm lies along the target line', () => {
    const out = new Vector3(9, 9, 9);
    expect(reachElbow(S, new Vector3(0, 1.4, 0.28), new Vector3(0, 1.4, 0.5), 0.28, 0.26, out)).toBe(false);
    expect(out.x).toBe(9);
  });
});
