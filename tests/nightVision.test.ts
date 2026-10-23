import { describe, expect, it } from 'vitest';
import { BLOOM, BRIGHT_GLSL, GLARE, NV_GLSL, NV_TONE, abcWeight, bloomInput, brightShare, easeGlare, easeVeil, luma709, nvColor, nvDrive, pickGlare, type GlareLamp } from '../src/vfx/nightVision';
import { VISION_TARGETS } from '../src/world/darkCurve';

const lamp = (x: number, z: number, o: Partial<GlareLamp> = {}): GlareLamp => ({ x, y: 3, z, kind: 'lamp', on: true, destroyed: false, intensity: 1, flicker: 1, fixture: null, ...o });

describe('night vision tube (Step 4b fix, nv-pass slice 1)', () => {
  it('the phosphor rises with the drive and clips to near white', () => {
    let last = -1;
    for (let l = 0; l <= 1.0001; l += 0.05) {
      const y = luma709(nvColor(nvDrive(l)));
      expect(y).toBeGreaterThanOrEqual(last);
      last = y;
    }
    expect(luma709(nvColor(nvDrive(1)))).toBeGreaterThanOrEqual(VISION_TARGETS[1]!.min);
  });
  it('a dark room under the gain (input luma ~0.6, the slice 1 estimate of the Step 4b probe) reads in the band', () => {
    const y = luma709(nvColor(nvDrive(0.6)));
    const t = VISION_TARGETS[0]!;
    expect(y).toBeGreaterThan(t.min);
    expect(y).toBeLessThan(t.max);
  });
  it('the shadows are not flat: the dark band keeps its steps and the clip to white starts late', () => {
    // a soft gamma: a quarter-bright input keeps well over a tenth of the drive
    expect(NV_TONE.gamma).toBeGreaterThanOrEqual(1.2);
    expect(NV_TONE.gamma).toBeLessThanOrEqual(1.4);
    expect(nvDrive(0.25)).toBeGreaterThan(0.15);
    // equal input steps in the dark give visible output steps
    const a = luma709(nvColor(nvDrive(0.1)));
    const b = luma709(nvColor(nvDrive(0.2)));
    const c = luma709(nvColor(nvDrive(0.3)));
    expect(b - a).toBeGreaterThan(0.03);
    expect(c - b).toBeGreaterThan(0.03);
    // no white before the late clip
    expect(NV_TONE.whiteFrom).toBeGreaterThanOrEqual(0.8);
    const mid = nvColor(0.8);
    expect(mid[0] / mid[1]).toBeLessThan(0.5);
  });
  it('a modern green phosphor (A1), not a pale grey-green', () => {
    const c = nvColor(0.5);
    // green leads clearly: red and blue under half of it
    expect(c[1]).toBeGreaterThan(c[0] * 2);
    expect(c[1]).toBeGreaterThan(c[2] * 2);
    // the floor is green too, and the clipped highlights a pale green-white
    expect(NV_TONE.black[1]).toBeGreaterThan(NV_TONE.black[0]);
    const w = nvColor(1);
    expect(w[1]).toBeGreaterThanOrEqual(w[0]);
    expect(w[0] / w[1]).toBeGreaterThan(0.8);
  });
  it('the tube never reaches black, and a bright source in view pulls the gain down', () => {
    expect(luma709(nvColor(0))).toBeGreaterThan(0.02);
    expect(luma709(nvColor(0))).toBeLessThan(0.06);
    expect(nvDrive(0.6, 1)).toBeLessThan(nvDrive(0.6, 0));
  });
  it('without baked lamps (?gfx=min) the post lift keeps night vision no darker than the goggles off', () => {
    expect(NV_TONE.postLift).toBeGreaterThan(1);
    for (let l = 0; l <= 0.9001; l += 0.05) expect(luma709(nvColor(nvDrive(l, 0, NV_TONE.postLift)))).toBeGreaterThanOrEqual(l - 1e-3);
    // the lift is the input multiplied
    expect(nvDrive(0.2, 0, NV_TONE.postLift)).toBeCloseTo(nvDrive(0.2 * NV_TONE.postLift), 12);
  });
  it('the GLSL mirrors the constants', () => {
    expect(NV_GLSL).toContain(NV_TONE.gamma.toFixed(4));
    expect(NV_GLSL).toContain(NV_TONE.whiteFrom.toFixed(4));
    expect(NV_GLSL).toContain(`vec3(${NV_TONE.tint.map((x) => x.toFixed(4)).join(', ')})`);
    expect(NV_GLSL).toContain(`vec3(${NV_TONE.black.map((x) => x.toFixed(4)).join(', ')})`);
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
    for (const look of [BLOOM.bright]) {
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
    const { threshold: t, knee: k } = BLOOM.bright;
    const below = brightShare(t + k - 1e-4, t, k) * (t + k - 1e-4);
    const above = brightShare(t + k + 1e-4, t, k) * (t + k + 1e-4);
    expect(Math.abs(above - below)).toBeLessThan(1e-3);
  });
  it('the GLSL mirror carries the same knee formula', () => {
    expect(BRIGHT_GLSL).toContain('smoothstep(threshold - knee, threshold + knee, l)');
  });
});

describe('night vision bloom on the HDR scene (nv-pass slice 1)', () => {
  const { threshold, ldrThreshold, knee, strength } = BLOOM.bright;
  const glows = (linear: number): number => brightShare(bloomInput(linear), threshold, knee);
  it('the compression is monotone and stays under 1', () => {
    let last = -1;
    for (let l = 0; l < 100; l += 0.25) {
      const c = bloomInput(l);
      expect(c).toBeGreaterThan(last);
      expect(c).toBeLessThan(1);
      last = c;
    }
    expect(bloomInput(-1)).toBe(0);
    expect(BRIGHT_GLSL).toContain('x / (1.0 + x)');
  });
  it('a lit wall or body under the gain does not glow; a lamp fixture does', () => {
    // a 50% grey card at the lit level under full night vision is about linear 2 (VISION_GAIN 6 x the curve's top)
    expect(glows(1)).toBe(0);
    expect(glows(2)).toBe(0);
    // a fixture: its colour x NV_BULB (8)
    expect(glows(7)).toBeGreaterThan(0.9);
  });
  it('an 8-bit source keeps the old threshold on its raw luma, and the glow is gentler', () => {
    expect(brightShare(1, ldrThreshold, knee)).toBe(1);
    expect(brightShare(0.6, ldrThreshold, knee)).toBe(0);
    expect(strength).toBeLessThan(1);
  });
});
