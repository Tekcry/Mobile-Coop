// (sector-redesign perf) The guard render freeze rule: frozen only when neither the body nor any shadow can reach
// the frustum.
import { describe, expect, it } from 'vitest';
import { FREEZE, FREEZE_MAX_SPOTS, FreezeLights, guardFrozen, segmentOutside, sphereOutside, sunShadowLength } from '../src/game/sectorGuardFreeze';

/** A frustum from (0, 1.6, 0) looking down +z: 45 deg half-angles, near 0.1, far 100 (planes point inwards). */
function frustum(): Float64Array {
  const s = Math.SQRT1_2;
  return new Float64Array([
    // left: x >= -z  ->  (s, 0, s) . p >= 0
    s, 0, s, 0,
    // right: x <= z
    -s, 0, s, 0,
    // bottom: y - 1.6 >= -z
    0, s, s, -1.6 * s,
    // top: y - 1.6 <= z
    0, -s, s, 1.6 * s,
    // near: z >= 0.1
    0, 0, 1, -0.1,
    // far: z <= 100
    0, 0, -1, 100,
  ]);
}

const PL = frustum();
const noLights = (): FreezeLights => new FreezeLights();

describe('sectorGuardFreeze: frustum tests', () => {
  it('sphere inside / straddling / outside', () => {
    expect(sphereOutside(PL, 0, 1, 10, 1)).toBe(false);
    expect(sphereOutside(PL, 0, 1, -10, 1)).toBe(true);
    // straddles the right plane
    expect(sphereOutside(PL, 10.5, 1, 10, 1)).toBe(false);
    expect(sphereOutside(PL, 14, 1, 10, 1)).toBe(true);
  });
  it('segment outside only when both ends are behind one plane', () => {
    expect(segmentOutside(PL, 0, 1, -10, 0, 1, -5, 0.5)).toBe(true);
    expect(segmentOutside(PL, 0, 1, -10, 0, 1, 10, 0.5)).toBe(false);
  });
  it('the moon shadow length grows as the moon drops, capped by minSunY', () => {
    expect(sunShadowLength(1.8, -1)).toBeCloseTo(1.8 + FREEZE.shadowDrop, 6);
    expect(sunShadowLength(1.8, -0.5)).toBeCloseTo((1.8 + FREEZE.shadowDrop) / 0.5, 6);
    expect(sunShadowLength(1.8, -0.01)).toBeCloseTo((1.8 + FREEZE.shadowDrop) / FREEZE.minSunY, 6);
  });
});

describe('sectorGuardFreeze: guardFrozen', () => {
  it('on screen: never frozen; behind the camera, no lights: frozen', () => {
    expect(guardFrozen(PL, 0, 0, 20, 1.8, 0, 1.6, 0, noLights())).toBe(false);
    expect(guardFrozen(PL, 0, 0, -20, 1.8, 0, 1.6, 0, noLights())).toBe(true);
  });
  it('just off the screen edge: the body pad keeps him drawn', () => {
    // centre 1.5 m outside the right plane, radius 0.9 + 1.3 = 2.2
    const x = 20 + 1.5 * Math.SQRT2;
    expect(guardFrozen(PL, x, 0, 20, 1.8, 0, 1.6, 0, noLights())).toBe(false);
    expect(guardFrozen(PL, x + 4, 0, 20, 1.8, 0, 1.6, 0, noLights())).toBe(true);
  });
  it('within the near radius of the camera: never frozen (even behind it)', () => {
    expect(guardFrozen(PL, 0, 0, -2, 1.8, 0, 1.6, 0, noLights())).toBe(false);
  });
  it('the moon shadow: a guard behind the camera whose shadow falls into the view stays drawn', () => {
    const L = noLights();
    L.sun = true;
    // moon low in the south (behind the camera): long shadows run north (+z), into the view
    L.sx = 0;
    L.sy = -0.3;
    L.sz = Math.sqrt(1 - 0.09);
    expect(guardFrozen(PL, 0, 0, -6, 1.8, 0, 1.6, 0, L)).toBe(false);
    // shadows running south (away from the view): frozen
    L.sz = -Math.sqrt(1 - 0.09);
    expect(guardFrozen(PL, 0, 0, -6, 1.8, 0, 1.6, 0, L)).toBe(true);
  });
  it('a shadowing lamp: in range and its sphere in view -> drawn; out of range, or sphere out of view -> frozen', () => {
    const L = noLights();
    // a lamp behind the camera whose 8 m sphere reaches into the view; (guard-render S10) his shadow from it runs away
    // from the view, so he freezes (`sectorGuardFreezeLamp.test.ts` covers the shadow-volume rule)
    L.addSpot(0, 3, -4, 8);
    expect(guardFrozen(PL, 0, 0, -8, 1.8, 0, 1.6, 0, L)).toBe(true);
    // the guard far out of the lamp's range
    expect(guardFrozen(PL, 0, 0, -30, 1.8, 0, 1.6, 0, L)).toBe(true);
    // a lamp far behind: its sphere misses the view
    const M = noLights();
    M.addSpot(0, 3, -40, 8);
    expect(guardFrozen(PL, 0, 0, -38, 1.8, 0, 1.6, 0, M)).toBe(true);
    // unbounded reach: never frozen in range
    const U = noLights();
    U.addSpot(0, 3, -40, Infinity);
    expect(guardFrozen(PL, 0, 0, -38, 1.8, 0, 1.6, 0, U)).toBe(false);
  });
  it('too many shadowing lights: nothing frozen; clear() resets', () => {
    const L = noLights();
    for (let i = 0; i <= FREEZE_MAX_SPOTS; i++) L.addSpot(500, 0, 500, 1);
    expect(L.overflow).toBe(true);
    expect(guardFrozen(PL, 0, 0, -20, 1.8, 0, 1.6, 0, L)).toBe(false);
    L.clear();
    expect(guardFrozen(PL, 0, 0, -20, 1.8, 0, 1.6, 0, L)).toBe(true);
  });
});

describe('sectorGuardFreeze: guardFrustum bits and occlusion points', () => {
  it('in view: the body bit; behind with the moon shadow running into view: the shadow bit only', async () => {
    const { guardFrustum, FREEZE_BODY_IN, FREEZE_SHADOW_IN, FREEZE_DRAW } = await import('../src/game/sectorGuardFreeze');
    expect(guardFrustum(PL, 0, 0, 20, 1.8, 0, 1.6, 0, noLights())).toBe(FREEZE_BODY_IN);
    const L = noLights();
    L.sun = true;
    L.sx = 0;
    L.sy = -0.3;
    L.sz = Math.sqrt(1 - 0.09);
    expect(guardFrustum(PL, 0, 0, -6, 1.8, 0, 1.6, 0, L)).toBe(FREEZE_SHADOW_IN);
    expect(guardFrustum(PL, 0, 0, 20, 1.8, 0, 1.6, 0, L)).toBe(FREEZE_BODY_IN | FREEZE_SHADOW_IN);
    expect(guardFrustum(PL, 0, 0, -1, 1.8, 0, 1.6, 0, L)).toBe(FREEZE_DRAW);
  });
  it('body points: above the head, the chest, and FREEZE_SIDE across the view; shadow points on his floor along the moon', async () => {
    const { occlusionPoints, FREEZE_BODY_IN, FREEZE_SHADOW_IN, FREEZE_SIDE, FREEZE_MAX_POINTS } = await import('../src/game/sectorGuardFreeze');
    const out = new Float64Array(FREEZE_MAX_POINTS * 3);
    const L = noLights();
    expect(occlusionPoints(out, FREEZE_BODY_IN, 0, 0, 20, 1.8, 0, 0, L)).toBe(5);
    expect(out[1]).toBeCloseTo(1.95, 6);
    expect(out[4]).toBeCloseTo(1.08, 6);
    // the camera looks down +z: across is x
    expect(Math.abs(out[6]!)).toBeCloseTo(FREEZE_SIDE, 6);
    expect(out[6]! + out[9]!).toBeCloseTo(0, 6);
    expect(out[8]).toBeCloseTo(20, 6);
    // no moon: no shadow points
    expect(occlusionPoints(out, FREEZE_SHADOW_IN, 0, 0, 20, 1.8, 0, 0, L)).toBe(0);
    L.sun = true;
    L.sx = 0.6;
    L.sy = -0.8;
    L.sz = 0;
    expect(occlusionPoints(out, FREEZE_SHADOW_IN, 0, 2, 20, 1.8, 0, 0, L)).toBe(2);
    // the head's shadow: 1.8 * 0.6 / 0.8 = 1.35 m along +x, on his floor
    expect(out[3]).toBeCloseTo(1.35, 6);
    expect(out[4]).toBeCloseTo(2.1, 6);
    expect(occlusionPoints(out, FREEZE_BODY_IN | FREEZE_SHADOW_IN, 0, 0, 20, 1.8, 0, 0, L)).toBe(FREEZE_MAX_POINTS);
  });
});

describe('sector-redesign frzpol: knee sample, moon shadow off a roof edge', () => {
  it('the fifth body point is the knee, on his centre', async () => {
    const { occlusionPoints, FREEZE_BODY_IN, FREEZE_KNEE, FREEZE_MAX_POINTS } = await import('../src/game/sectorGuardFreeze');
    const out = new Float64Array(FREEZE_MAX_POINTS * 3);
    expect(occlusionPoints(out, FREEZE_BODY_IN, 3, 2, 20, 1.8, 0, 0, noLights())).toBe(5);
    expect(out[12]).toBeCloseTo(3, 6);
    expect(out[13]).toBeCloseTo(2 + FREEZE_KNEE, 6);
    expect(out[14]).toBeCloseTo(20, 6);
  });

  it('a probe from the head runs along the moon to shadowDrop below his feet; a stop below his floor is a landing', async () => {
    const { shadowProbe, shadowLanding, FREEZE } = await import('../src/game/sectorGuardFreeze');
    const L = noLights();
    const pr = new Float64Array(9);
    expect(shadowProbe(pr, 0, 8.4, 20, 1.8, 1, L)).toBe(false);
    L.sun = true;
    L.sx = 0.6;
    L.sy = -0.8;
    L.sz = 0;
    expect(shadowProbe(pr, 0, 8.4, 20, 1.8, 1, L)).toBe(true);
    expect(pr[1]).toBeCloseTo(10.2, 6);
    expect(pr[4]).toBeCloseTo(8.4 - FREEZE.shadowDrop, 6);
    // (1.8 + 9) / 0.8 = 13.5 m along the light
    expect(pr[3]).toBeCloseTo(0.6 * 13.5, 6);
    // stops on his own roof (2.25 m along: y 8.4): no landing
    expect(shadowLanding(pr, 8.4, 2.25)).toBe(false);
    // stops on the ground (12.75 m along: y 0): a landing, backed 0.2 m toward the light
    expect(shadowLanding(pr, 8.4, 12.75)).toBe(true);
    expect(pr[7]).toBeCloseTo(10.2 - 0.8 * 12.55, 6);
    expect(pr[6]).toBeCloseTo(0.6 * 12.55, 6);
    // never stopped: no ground within the drop
    expect(shadowLanding(pr, 8.4, 13.5)).toBe(false);
  });
});
