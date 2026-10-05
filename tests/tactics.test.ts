import { describe, expect, it } from 'vitest';
import { coverQuality, exposureFraction, exposurePoints, flanks, segPointDist, Suppression, SUPPRESS, type P3 } from '../src/game/tactics';

describe('exposure', () => {
  const feet = { x: 0, y: 0, z: 0 };
  it('fraction of sample points the best-placed threat can see', () => {
    const pts = exposurePoints(feet, 0, 1, 0, 0, []);
    expect(pts).toHaveLength(5);
    // a wall hides everything below 1.1 m
    const lowWall = (_a: P3, b: P3): boolean => b.y < 1.1;
    expect(exposureFraction(pts, [{ x: 0, y: 1.5, z: 10 }], lowWall)).toBeCloseTo(2 / 5);
    expect(exposureFraction(pts, [{ x: 0, y: 1.5, z: 10 }], () => true)).toBe(0);
    expect(exposureFraction(pts, [{ x: 0, y: 1.5, z: 10 }], () => false)).toBe(1);
    expect(exposureFraction(pts, [], () => false)).toBe(0);
  });
  it('crouching lowers the points; leaning shifts the head and chest out', () => {
    const stand = exposurePoints(feet, 0, 1, 0, 0, []);
    const crouch = exposurePoints(feet, 1, 1, 0, 0, []);
    expect(crouch[0]!.y).toBeLessThan(stand[0]!.y - 0.5);
    const lean = exposurePoints(feet, 0, 1, 0, 1, []);
    expect(lean[0]!.x).toBeGreaterThan(0.3);
    expect(lean[1]!.x).toBeGreaterThan(0.2);
    expect(Math.abs(lean[3]!.x)).toBeLessThan(0.15);
  });
});

describe('cover quality', () => {
  // face at the origin, outward normal +z (user stands at +z, threats expected at -z)
  const c = { nx: 0, nz: 1, low: false, x: 0, z: 0 };
  it('squarely between user and threat is good; flanking threats ruin it', () => {
    expect(coverQuality(c, [{ x: 0, z: -15 }])).toBeCloseTo(1);
    expect(coverQuality(c, [{ x: 15, z: -2 }])).toBeLessThan(0.3);
    expect(coverQuality(c, [{ x: 0, z: -15 }, { x: 5, z: 8 }])).toBeLessThan(0.4);
    expect(coverQuality({ ...c, low: true }, [{ x: 0, z: -15 }])).toBeLessThan(1);
    expect(coverQuality(c, [])).toBe(1);
  });
  it('flank test', () => {
    expect(flanks(c, 0, -10)).toBe(false);
    expect(flanks(c, 10, 1)).toBe(true);
    expect(flanks(c, 0, 10)).toBe(true);
  });
});

describe('suppression', () => {
  it('near misses build it, it holds, then decays; effects scale', () => {
    const s = new Suppression();
    s.nearMiss(0.2);
    s.nearMiss(0.2);
    s.nearMiss(0.2);
    expect(s.value).toBeGreaterThan(0.5);
    expect(s.flinch).toBeGreaterThan(0.5);
    expect(s.spreadMul).toBeGreaterThan(1.4);
    const v = s.value;
    s.update(SUPPRESS.hold * 0.5);
    expect(s.value).toBe(v);
    for (let i = 0; i < 300; i++) s.update(1 / 60);
    expect(s.value).toBe(0);
    s.nearMiss(5);
    expect(s.value).toBe(0);
    s.impact(0.3);
    expect(s.value).toBeGreaterThan(0);
  });
  it('segment-point distance', () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 10, y: 0, z: 0 };
    expect(segPointDist(a, b, { x: 5, y: 1, z: 0 })).toBeCloseTo(1);
    expect(segPointDist(a, b, { x: -3, y: 4, z: 0 })).toBeCloseTo(5);
  });
});
