import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRIGHTNESS_GLSL, BRIGHTNESS_STOPS, brightnessCurve, brightnessGain, brightnessStops, CALIBRATION_GREY, calibrationGrey } from '../src/vfx/displayBrightness';
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, BRIGHTNESS_STEP } from '../src/world/darkCurve';
import { defaultSettings, sanitizeSettings } from '../src/core/settings';

/** Every slider position, low to high. */
const positions = (): number[] => {
  const out: number[] = [];
  for (let k = BRIGHTNESS_MIN; k <= BRIGHTNESS_MAX + 1e-9; k += BRIGHTNESS_STEP) out.push(k);
  return out;
};

describe('brightness slider range (brightness-range)', () => {
  it('the stored setting keeps its range and default (no save change); an old save keeps its slider position', () => {
    expect(BRIGHTNESS_MIN).toBe(0.75);
    expect(BRIGHTNESS_MAX).toBe(1.3);
    expect(BRIGHTNESS_STEP).toBe(0.05);
    expect(defaultSettings().video.brightness).toBe(1);
    const old = defaultSettings();
    old.video.brightness = 1.15;
    expect(sanitizeSettings(JSON.parse(JSON.stringify(old))).video.brightness).toBe(1.15);
  });

  it('the middle (default) is exactly today: gain 1 and the curve is the identity', () => {
    expect(brightnessStops(1)).toBe(0);
    expect(brightnessGain(1)).toBe(1);
    for (const x of [0, 0.01, 0.2, 0.5, 0.9, 1, 1.4]) expect(brightnessCurve(x, 1)).toBe(x);
    expect(calibrationGrey(1)).toBe(Math.round(255 * CALIBRATION_GREY));
  });

  it('the ends are about -1.5 and +1.5 stops (was about -0.4 .. +0.4)', () => {
    expect(BRIGHTNESS_STOPS).toBe(1.5);
    expect(brightnessStops(BRIGHTNESS_MIN)).toBeCloseTo(-1.5, 9);
    expect(brightnessStops(BRIGHTNESS_MAX)).toBeCloseTo(1.5, 9);
    expect(brightnessGain(BRIGHTNESS_MIN)).toBeCloseTo(2 ** -1.5, 9);
    expect(brightnessGain(BRIGHTNESS_MAX)).toBeCloseTo(2 ** 1.5, 9);
    // out of range and junk clamp to the ends / the default
    expect(brightnessGain(0)).toBe(brightnessGain(BRIGHTNESS_MIN));
    expect(brightnessGain(9)).toBe(brightnessGain(BRIGHTNESS_MAX));
    expect(brightnessGain(Number.NaN)).toBe(1);
  });

  it('monotonic across the slider, in the gain, the picture and the calibration symbol', () => {
    const ks = positions();
    expect(ks.length).toBe(12);
    for (let i = 1; i < ks.length; i++) {
      expect(brightnessGain(ks[i]!)).toBeGreaterThan(brightnessGain(ks[i - 1]!));
      expect(brightnessCurve(0.2, brightnessGain(ks[i]!))).toBeGreaterThan(brightnessCurve(0.2, brightnessGain(ks[i - 1]!)));
      expect(calibrationGrey(ks[i]!)).toBeGreaterThanOrEqual(calibrationGrey(ks[i - 1]!));
    }
    expect(calibrationGrey(BRIGHTNESS_MAX)).toBeGreaterThan(calibrationGrey(1) * 2);
    expect(calibrationGrey(BRIGHTNESS_MIN)).toBeLessThan(calibrationGrey(1) / 2);
    // the curve is monotonic in x at both ends too
    for (const m of [brightnessGain(BRIGHTNESS_MIN), brightnessGain(BRIGHTNESS_MAX)]) {
      for (let x = 0.05; x <= 1; x += 0.05) expect(brightnessCurve(x, m)).toBeGreaterThan(brightnessCurve(x - 0.05, m));
    }
  });

  it('the ends are clearly different, white never clips past white and a lit room still shows at the bottom', () => {
    const lo = brightnessGain(BRIGHTNESS_MIN);
    const hi = brightnessGain(BRIGHTNESS_MAX);
    // mid grey 0.2: was 0.15 .. 0.26 with the old multiplier; now about 0.08 .. 0.41
    expect(brightnessCurve(0.2, lo)).toBeLessThan(0.1);
    expect(brightnessCurve(0.2, lo)).toBeGreaterThan(0.06);
    expect(brightnessCurve(0.2, hi)).toBeGreaterThan(0.38);
    // white and black stay put; a lit wall (0.7) is bright but not white at the top
    for (const m of [lo, hi]) {
      expect(brightnessCurve(1, m)).toBeCloseTo(1, 12);
      expect(brightnessCurve(0, m)).toBe(0);
      expect(brightnessCurve(3, m)).toBeCloseTo(1, 12);
    }
    expect(brightnessCurve(0.7, hi)).toBeLessThan(0.9);
    expect(brightnessCurve(0.7, lo)).toBeGreaterThan(0.4);
  });

  it('the GLSL mirrors the curve and the cinematic pass skips it at the default, after the vision modes', () => {
    expect(BRIGHTNESS_GLSL).toContain('m * c / (1.0 + (m - 1.0) * c)');
    expect(BRIGHTNESS_GLSL).toContain('clamp(c, 0.0, 1.0)');
    const src = readFileSync('src/vfx/cinematicPost.ts', 'utf8');
    expect(src).toContain('if (bright != 1.0) c.rgb = displayBright(c.rgb, bright);');
    expect(src).not.toMatch(/c\.rgb \*= bright/);
    // after the goggle frame and the feed, before the flash
    const at = src.indexOf('displayBright(c.rgb, bright)');
    expect(at).toBeGreaterThan(src.indexOf('goggleShade(ge)'));
    expect(at).toBeLessThan(src.indexOf('mix(c.rgb, vec3(1.0), flash)'));
  });
});

const walk = (dir: string, acc: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith('.ts')) acc.push(p);
  }
  return acc;
};

describe('gameplay never reads the brightness setting (display only)', () => {
  it('AI, co-op, the player, the world (light field, bake, meter), config and saves never import the curve or read the setting', () => {
    const files = [...walk('src/ai'), ...walk('src/net'), ...walk('src/player'), ...walk('src/world'), ...walk('src/config'), ...walk('src/save')];
    expect(files.length).toBeGreaterThan(50);
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/from '[^']*(displayBrightness|cinematicPost)'|brightnessGain\(|video\.brightness/);
    }
  });
});
