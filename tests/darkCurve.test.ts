import { describe, expect, it } from 'vitest';
import { bandOf, BRIGHTNESS_MAX, BRIGHTNESS_MIN, CALIBRATION_GREY, calibrationGrey, DARK_DESKTOP, DARK_GLSL, DARK_PHONE, DARK_TARGETS, darkCurve, darkWeight, LEVEL_TO_RENDER, VISION_GAIN, VISION_TARGETS } from '../src/world/darkCurve';
import { LIGHT } from '../src/world/lights';
import { LAMP_LEVEL_GAIN, LIGHT_GAIN } from '../src/world/lampMath';

const SETS = [
  ['phone', DARK_PHONE],
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
    // night vision: the dark reads, light clips
    expect(VISION_TARGETS[0]!.min).toBeGreaterThan(DARK_TARGETS[0]!.max * 5);
    expect(VISION_TARGETS[1]!.min).toBeGreaterThanOrEqual(0.9);
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

  it('the GLSL mirrors the formula', () => {
    expect(DARK_GLSL).toContain('p.z + (p.w - p.z) / (1.0 + pow(p.x / x, p.y))');
    expect(DARK_GLSL).toContain('g * nsDarkW(max(s, 1e-4) * g, p)');
    expect(LEVEL_TO_RENDER).toBeCloseTo(LIGHT_GAIN / LAMP_LEVEL_GAIN, 12);
  });

  it('brightness calibration is clamped to a small range', () => {
    expect(BRIGHTNESS_MIN).toBeLessThan(1);
    expect(BRIGHTNESS_MAX).toBeGreaterThan(1);
    // (the dark band's measured top - 6.7% on Epic, 4.3% on the phone at 0.27 - stays under 9% at the maximum)
    expect(0.067 * BRIGHTNESS_MAX).toBeLessThanOrEqual(0.09);
    expect(calibrationGrey(1)).toBe(Math.round(255 * CALIBRATION_GREY));
    expect(calibrationGrey(9)).toBe(calibrationGrey(BRIGHTNESS_MAX));
    expect(calibrationGrey(0)).toBe(calibrationGrey(BRIGHTNESS_MIN));
    expect(calibrationGrey(BRIGHTNESS_MAX)).toBeGreaterThan(calibrationGrey(BRIGHTNESS_MIN));
  });
});
