import { describe, expect, it } from 'vitest';
import { GLARE, NV_GLSL, NV_TONE, easeGlare, glareRadius, luma709, nvColor, nvDrive, pickGlare, type GlareLamp } from '../src/vfx/nightVision';
import { VISION_TARGETS } from '../src/world/darkCurve';

const lamp = (x: number, z: number, o: Partial<GlareLamp> = {}): GlareLamp => ({ x, y: 3, z, kind: 'lamp', on: true, destroyed: false, intensity: 1, fixture: null, ...o });

describe('night vision tube (Step 4b fix)', () => {
  it('the phosphor rises with the drive and clips to near white', () => {
    let last = -1;
    for (let l = 0; l <= 1.0001; l += 0.05) {
      const y = luma709(nvColor(nvDrive(l)));
      expect(y).toBeGreaterThanOrEqual(last);
      last = y;
    }
    expect(luma709(nvColor(nvDrive(1)))).toBeGreaterThanOrEqual(VISION_TARGETS[1]!.min);
  });
  it('a dark room under the gain (input luma ~0.74, the Step 4b probe) reads in the 25-45% band', () => {
    const y = luma709(nvColor(nvDrive(0.74)));
    const t = VISION_TARGETS[0]!;
    expect(y).toBeGreaterThan(t.min);
    expect(y).toBeLessThan(t.max);
  });
  it('a pale grey-green, not a saturated green', () => {
    const c = nvColor(0.5);
    // green leads, but red and blue stay within a third of it
    expect(c[1]).toBeGreaterThan(c[0]);
    expect(c[0] / c[1]).toBeGreaterThan(0.75);
    expect(c[2] / c[1]).toBeGreaterThan(0.7);
  });
  it('the tube never reaches black, and a bright source in view pulls the gain down', () => {
    expect(luma709(nvColor(0))).toBeGreaterThan(0.01);
    expect(nvDrive(0.74, 1)).toBeLessThan(nvDrive(0.74, 0));
  });
  it('the GLSL mirrors the constants', () => {
    expect(NV_GLSL).toContain(NV_TONE.gamma.toFixed(4));
    expect(NV_GLSL).toContain(NV_TONE.whiteFrom.toFixed(4));
  });
});

describe('night vision glare sources', () => {
  const out = new Int16Array(GLARE.max);
  const score = new Float32Array(GLARE.max);
  it('only fixed lamps that are on, in front and in range; nearest first', () => {
    const lamps = [
      lamp(0, 10),
      lamp(0, 4),
      lamp(0, -5), // behind
      lamp(0, 6, { on: false }),
      lamp(0, 7, { destroyed: true }),
      lamp(0, 8, { kind: 'flashlight' }),
      lamp(0, GLARE.range + 5), // too far
    ];
    const n = pickGlare(lamps, 0, 1.6, 0, 0, 0, 1, out, score);
    expect(n).toBe(2);
    expect(out[0]).toBe(1);
    expect(out[1]).toBe(0);
  });
  it('keeps the best `max` when more are in view', () => {
    const lamps: GlareLamp[] = [];
    for (let i = 0; i < 20; i++) lamps.push(lamp(0, 30 - i));
    const n = pickGlare(lamps, 0, 1.6, 0, 0, 0, 1, out, score);
    expect(n).toBe(GLARE.max);
    for (let i = 0; i < n; i++) expect(out[i]).toBe(19 - i);
  });
  it('fades in and out over the fade time; the radius is clamped', () => {
    let w = 0;
    w = easeGlare(w, 1, GLARE.fade / 2);
    expect(w).toBeCloseTo(0.5, 5);
    w = easeGlare(w, 1, GLARE.fade);
    expect(w).toBe(1);
    expect(easeGlare(1, 0, GLARE.fade * 2)).toBe(0);
    expect(glareRadius(0)).toBe(GLARE.minR);
    expect(glareRadius(5)).toBe(GLARE.maxR);
  });
});
