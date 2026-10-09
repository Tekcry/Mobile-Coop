import { describe, expect, it } from 'vitest';
import { BLOOM, BRIGHT_GLSL, GLARE, NV_GLSL, NV_TONE, abcWeight, brightShare, easeGlare, easeVeil, luma709, nvColor, nvDrive, pickGlare, type GlareLamp } from '../src/vfx/nightVision';
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

describe('night vision auto-gain (the lamps in view)', () => {
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
  it('a lamp fades in and out over the fade time', () => {
    let w = 0;
    w = easeGlare(w, 1, GLARE.fade / 2);
    expect(w).toBeCloseTo(0.5, 5);
    w = easeGlare(w, 1, GLARE.fade);
    expect(w).toBe(1);
    expect(easeGlare(1, 0, GLARE.fade * 2)).toBe(0);
  });
  it('a near lamp turns the gain down more than a far one', () => {
    expect(abcWeight(2, 1)).toBeGreaterThan(abcWeight(20, 1));
    expect(abcWeight(2, 1)).toBeLessThanOrEqual(1);
  });
  it('the auto-gain turns down over its attack and recovers over its release', () => {
    let v = 0;
    v = easeVeil(v, 1, GLARE.abcAttack);
    expect(v).toBeCloseTo(1 - Math.exp(-1), 5);
    const up = easeVeil(0, 1, 0.1);
    const down = 1 - easeVeil(1, 0, 0.1);
    expect(up).toBeGreaterThan(down);
  });
});

describe('night vision bloom (round 4)', () => {
  it('nothing dark glows; past the threshold the glow grows towards the whole pixel', () => {
    for (const look of [BLOOM.phone, BLOOM.desktop]) {
      expect(brightShare(0, look.threshold, look.knee)).toBe(0);
      expect(brightShare(look.threshold - look.knee - 0.01, look.threshold, look.knee)).toBe(0);
      let last = 0;
      for (let l = look.threshold - look.knee; l < look.threshold * 4; l += 0.05) {
        const g = brightShare(l, look.threshold, look.knee) * l;
        expect(g).toBeGreaterThanOrEqual(last - 1e-9);
        last = g;
      }
      expect(brightShare(1, look.threshold, look.knee)).toBe(1);
    }
  });
  it('the knee is smooth: no jump at the threshold', () => {
    const { threshold: t, knee: k } = BLOOM.phone;
    const below = brightShare(t + k - 1e-4, t, k) * (t + k - 1e-4);
    const above = brightShare(t + k + 1e-4, t, k) * (t + k + 1e-4);
    expect(Math.abs(above - below)).toBeLessThan(1e-3);
  });
  it('the GLSL mirror carries the same knee formula', () => {
    expect(BRIGHT_GLSL).toContain('smoothstep(threshold - knee, threshold + knee, l)');
  });
});
