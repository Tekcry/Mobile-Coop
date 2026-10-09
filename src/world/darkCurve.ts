/**
 * Darkness is dark (3.6, Phase 1 Step 4b; bible 1.10 L5 / L7; pure, rendering only - gameplay never reads it).
 *
 * The darkness curve: a pixel's summed static light (fill + baked lamps + baked moon, as a gameplay light level) to the
 * light it renders with. Steep below `LIGHT.shadow`, so the dark band falls towards black; near identity above
 * `LIGHT.lit`, so lamp pools keep their look. It runs in the lighting (`LampPlugin`, before tone mapping and 8-bit
 * output), never in the post: a post curve would crush the dark into banded black that night vision could not lift.
 *
 *   curve(s) = s x w(g s) x g,   w(x) = floor + (top - floor) / (1 + (centre / x)^steep)
 *
 * `g` is the night-vision gain (1 off, `VISION_GAIN` on): it multiplies the static light before the curve, so night
 * vision reveals real detail in the dark and blows out in light. Flashlights are added after the curve.
 *
 * Two parameter sets, one function: the phone light look shades in gamma space (standard materials); the desktop in
 * linear space, then the neutral tone map (whose toe crushes the lowest light) and the sRGB encode. Each set is tuned
 * so its pipeline meets the same display targets (`DARK_TARGETS`, bible L5), measured on real pixels by
 * `scripts/e2e-darkness.mjs`. Both read under the lit target before Step 4b (phone 44%, Epic 37% at 0.70), so `top`
 * lifts the lit band a little on the phone and more on desktop.
 */
import { LAMP_LEVEL_GAIN, LIGHT_GAIN } from './lampMath';
import { LIGHT } from './lights';

/** Rendering: a gameplay light level shows as this much light on screen (a lamp's `LIGHT_GAIN` over its gameplay
 *  `LAMP_LEVEL_GAIN`). */
export const LEVEL_TO_RENDER = LIGHT_GAIN / LAMP_LEVEL_GAIN;

/** One curve's shape: where it turns (level), how steeply, the weight left at the bottom and the weight at the top
 *  (a pipeline whose lit band reads under its target is lifted there; 1 = identity). */
export interface DarkParams {
  centre: number;
  steep: number;
  floor: number;
  top: number;
}

/** The phone light look (gamma-space standard materials). */
export const DARK_PHONE: DarkParams = { centre: 0.33, steep: 8, floor: 0.2, top: 1.12 };
/** The desktop (linear PBR, sRGB encode and the neutral tone map after it). */
export const DARK_DESKTOP: DarkParams = { centre: 0.37, steep: 12, floor: 0.3, top: 1.55 };

/** Night vision: the static light's gain inside the lighting (bible L7). */
export const VISION_GAIN = 8;

/**
 * Display brightness targets (bible L5): a matte 50% grey card facing the strongest light, at default brightness,
 * after tone mapping and grade, as display luminance 0..1 (Rec. 709 luma of the output pixel). Phone and desktop.
 */
export const DARK_TARGETS: readonly { level: number; band: 'dark' | 'mid' | 'lit'; min: number; max: number }[] = [
  { level: 0.12, band: 'dark', min: 0, max: 0.04 },
  { level: 0.27, band: 'dark', min: 0, max: 0.09 },
  { level: 0.4, band: 'mid', min: 0.12, max: 0.35 },
  { level: 0.7, band: 'lit', min: 0.45, max: 1 },
];

/** With night vision on (Step 4b): a dark interior reads, lamp light clips. */
export const VISION_TARGETS: readonly { level: number; min: number; max: number }[] = [
  { level: 0.12, min: 0.25, max: 0.45 },
  { level: 0.7, min: 0.9, max: 1 },
];

/** Brightness calibration: the grade's exposure multiplier, clamped so it cannot lift the dark band out of dark. */
export const BRIGHTNESS_MIN = 0.75;
export const BRIGHTNESS_MAX = 1.3;
export const BRIGHTNESS_STEP = 0.05;
/** The calibration symbol's grey on black (display value at brightness 1): set right, it is barely visible. */
export const CALIBRATION_GREY = 0.035;

/** The calibration symbol's 8-bit grey at brightness `k` (it goes through the same multiplier as the grade). */
export function calibrationGrey(k: number): number {
  const b = Math.min(BRIGHTNESS_MAX, Math.max(BRIGHTNESS_MIN, k));
  return Math.round(255 * CALIBRATION_GREY * b);
}

/** The curve's weight at level `x` (`floor` at black, `top` well above `centre`). */
export function darkWeight(x: number, p: DarkParams): number {
  if (x <= 0) return p.floor;
  return p.floor + (p.top - p.floor) / (1 + Math.pow(p.centre / x, p.steep));
}

/** The curve: summed static level `s` (gain `g`) to the level it renders with (x `LEVEL_TO_RENDER` on screen). */
export function darkCurve(s: number, p: DarkParams, g = 1): number {
  return s * g * darkWeight(s * g, p);
}

/** The band a level falls in (gameplay's thresholds). */
export function bandOf(level: number): 'dark' | 'mid' | 'lit' {
  return level < LIGHT.shadow ? 'dark' : level < LIGHT.lit ? 'mid' : 'lit';
}

/** The curve in GLSL (the same formula; the constants come in as a uniform): `nsDarkRatio(s, g, p)` scales a pixel's
 *  static light (`p` = centre, steep, floor, top). */
export const DARK_GLSL = `
float nsDarkW(float x, vec4 p) { return x <= 0.0 ? p.z : p.z + (p.w - p.z) / (1.0 + pow(p.x / x, p.y)); }
float nsDarkRatio(float s, float g, vec4 p) { return g * nsDarkW(max(s, 1e-4) * g, p); }
`;

