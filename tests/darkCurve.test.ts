import { describe, expect, it } from 'vitest';
import { bandOf, BODY_FILL, bodyFillScale, DARK_DESKTOP, DARK_GLSL, DARK_STANDARD, DARK_TARGETS, darkCurve, darkWeight, LEVEL_TO_RENDER, VISION_FLOOR, VISION_GAIN, VISION_TARGETS, visionAmount, visionDark } from '../src/world/darkCurve';
import { LIGHT } from '../src/world/lights';
import { LAMP_LEVEL_GAIN, LIGHT_GAIN } from '../src/world/lampMath';

const SETS = [
  ['standard', DARK_STANDARD],
  ['desktop', DARK_DESKTOP],
] as const;

describe('the darkness curve (3.6 Step 4b, bible L5 / L7)', () => {
  it('the targets follow the gameplay bands and get brighter with the level', () => {
    for (const t of DARK_TARGETS) expect(bandOf(t.level)).toBe(t.band);
    for (let i = 1; i < DARK_TARGETS.length; i++) {
      expect(DARK_TARGETS[i]!.level).toBeGreaterThan(DARK_TARGETS[i - 1]!.level);
      expect(DARK_TARGETS[i]!.max).toBeGreaterThanOrEqual(DARK_TARGETS[i - 1]!.max);
    }
    // the dark band's top is under the shadow threshold; the lit target over the lit one
    expect(DARK_TARGETS.find((t) => t.band === 'dark' && t.level > 0.2)!.level).toBeLessThan(LIGHT.shadow);
    expect(DARK_TARGETS.find((t) => t.band === 'lit')!.level).toBeGreaterThan(LIGHT.lit);
    // night vision: the dark reads, light is near white (nv-pass: the clip starts later; the card takes the capped body fill, BRIEF A2)
    expect(VISION_TARGETS[0]!.min).toBeGreaterThanOrEqual(DARK_TARGETS[0]!.max * 2.5);
    expect(VISION_TARGETS[1]!.min).toBeGreaterThanOrEqual(0.7);
    expect(VISION_TARGETS[1]!.min).toBeGreaterThan(VISION_TARGETS[0]!.max);
  });

  it('is monotone, falls to its floor in the dark and is near its top above lit', () => {
    for (const [, p] of SETS) {
      let prev = -1;
      for (let s = 0; s <= 2; s += 0.005) {
        const c = darkCurve(s, p);
        expect(c).toBeGreaterThanOrEqual(prev - 1e-12);
        prev = c;
      }
      expect(darkWeight(0, p)).toBe(p.floor);
      expect(darkWeight(1e-6, p)).toBeCloseTo(p.floor, 6);
      // steep below the shadow threshold: a dark interior keeps only a little more than the floor
      expect(darkWeight(0.12, p)).toBeLessThan(p.floor * 1.05);
      expect(darkWeight(LIGHT.shadow, p)).toBeLessThan(p.floor + (p.top - p.floor) * 0.25);
      // above lit: within 3% of the top (lamp pools keep their look)
      for (const x of [LIGHT.lit + 0.05, 0.8, 1, 1.5]) expect(darkWeight(x, p) / p.top).toBeGreaterThan(0.97);
      expect(p.floor).toBeLessThan(0.5);
      expect(p.top).toBeGreaterThanOrEqual(1);
    }
  });

  it('night vision is a gain before the curve', () => {
    for (const [, p] of SETS) {
      for (const s of [0, 0.03, 0.12, 0.27, 0.7]) expect(darkCurve(s, p, VISION_GAIN)).toBeCloseTo(s * VISION_GAIN * darkWeight(s * VISION_GAIN, p), 12);
      // a dark interior under night vision renders brighter than a lit spot without it
      expect(darkCurve(0.12, p, VISION_GAIN)).toBeGreaterThan(darkCurve(0.7, p));
    }
    expect(VISION_GAIN).toBeGreaterThan(4);
  });

  it('night vision lifts the dark band nearly as much as the lit one (nv-pass slice 1)', () => {
    expect(visionAmount(1)).toBe(0);
    expect(visionAmount(VISION_GAIN)).toBe(1);
    expect(visionAmount((1 + VISION_GAIN) / 2)).toBeCloseTo(0.5, 12);
    for (const [, p] of SETS) {
      // off: the look's own curve
      expect(visionDark(p, 1)).toEqual(p);
      const nv = visionDark(p, VISION_GAIN);
      expect(nv.floor).toBeCloseTo(Math.min(VISION_FLOOR, p.top), 12);
      expect(nv.top).toBe(p.top);
      // still monotone, and never below the curve without the floor lift
      let prev = -1;
      for (let s = 0; s <= 2; s += 0.005) {
        const c = darkCurve(s, nv, VISION_GAIN);
        expect(c).toBeGreaterThanOrEqual(prev - 1e-12);
        expect(c).toBeGreaterThanOrEqual(darkCurve(s, p, VISION_GAIN) - 1e-12);
        prev = c;
      }
      // the deep dark (a lamp-less corner, level 0.02) gains more than the lit band, and more than before the lift
      const dark = darkCurve(0.02, nv, VISION_GAIN) / darkCurve(0.02, p);
      const lit = darkCurve(0.7, nv, VISION_GAIN) / darkCurve(0.7, p);
      expect(dark).toBeGreaterThan(lit);
      expect(darkCurve(0.02, nv, VISION_GAIN)).toBeGreaterThan(darkCurve(0.02, p, 8) * 1.5);
      // but not flat: the lit band stays brighter than the dark one
      expect(darkCurve(0.7, nv, VISION_GAIN)).toBeGreaterThan(darkCurve(0.12, nv, VISION_GAIN) * 4);
      // an allocation-free form writes the scratch it is given
      const out = { ...p };
      expect(visionDark(p, VISION_GAIN, out)).toBe(out);
    }
  });

  it('bodies under night vision: the flat fill is capped and hemisphere-shaded (nv-pass slice 1)', () => {
    // off: untouched, whatever the normal
    for (const ny of [-1, 0, 1]) expect(bodyFillScale(0, ny)).toBe(1);
    // full night vision: at most `BODY_FILL.nv`, lit from above more than from below
    expect(bodyFillScale(1, 1)).toBeCloseTo(BODY_FILL.nv, 12);
    expect(bodyFillScale(1, -1)).toBeCloseTo(BODY_FILL.nv * BODY_FILL.wrap, 12);
    expect(bodyFillScale(1, 0)).toBeLessThan(bodyFillScale(1, 1));
    expect(bodyFillScale(1, 0)).toBeGreaterThan(bodyFillScale(1, -1));
    // eased in with the goggles, monotone
    let last = 2;
    for (let k = 0; k <= 1.0001; k += 0.1) {
      const s = bodyFillScale(k, 0.3);
      expect(s).toBeLessThanOrEqual(last + 1e-12);
      last = s;
    }
    // the fill's net night-vision lift stays well under the gain the walls get
    expect(BODY_FILL.nv).toBeLessThan(0.5);
    expect(BODY_FILL.wrap).toBeGreaterThan(0);
    // the GLSL mirrors it
    expect(DARK_GLSL).toContain('float nsBodyFill(float k, float ny)');
    expect(DARK_GLSL).toContain(BODY_FILL.nv.toFixed(4));
    expect(DARK_GLSL).toContain(BODY_FILL.wrap.toFixed(4));
  });

  it('the GLSL mirrors the formula', () => {
    expect(DARK_GLSL).toContain('p.z + (p.w - p.z) / (1.0 + pow(p.x / x, p.y))');
    expect(DARK_GLSL).toContain('g * nsDarkW(max(s, 1e-4) * g, p)');
    expect(LEVEL_TO_RENDER).toBeCloseTo(LIGHT_GAIN / LAMP_LEVEL_GAIN, 12);
  });
  // (brightness-range) the brightness slider's tests moved to tests/displayBrightness.test.ts
});
