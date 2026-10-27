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
 * Two parameter sets, one function: the game shades in linear space (PBR), then the neutral tone map (whose toe
 * crushes the lowest light) and the sRGB encode; the standard-material look (the Kestrel editor's light view, from the
 * retired phone look) shades in gamma space. Each set is tuned so its pipeline meets the same display targets
 * (`DARK_TARGETS`, bible L5), measured on real pixels by `scripts/e2e-darkness.mjs`. Both read under the lit target
 * before Step 4b (standard 44%, Epic 37% at 0.70), so `top` lifts the lit band a little there and more in the game.
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

/** The standard-material look (gamma space; the Kestrel editor's light view). */
export const DARK_STANDARD: DarkParams = { centre: 0.33, steep: 8, floor: 0.2, top: 1.12 };
/** The game (linear PBR, sRGB encode and the neutral tone map after it). */
export const DARK_DESKTOP: DarkParams = { centre: 0.37, steep: 12, floor: 0.3, top: 1.55 };

/** Night vision: the static light's gain inside the lighting (bible L7). (nv-pass slice 1: 8 -> 6, with the curve's
 *  floor lifted under the goggles, `VISION_FLOOR`: the deep dark gains more than before, the mid and lit bands less, so
 *  shadows read without the mid tones clipping.) */
export const VISION_GAIN = 6;
/** (nv-pass slice 1) The curve's floor at full night vision (off: the look's `floor`, 0.3 on desktop): the tube's
 *  auto-gain lifts the dark band nearly as much as the lit one (a near-linear gain, not the naked eye's steep fall to
 *  black). Eased in with the gain (`visionDark`). */
export const VISION_FLOOR = 1.0;

/** (nv-pass slice 1) How far night vision is on (0..1) for a lighting gain `g` (1 off, `VISION_GAIN` full). */
export function visionAmount(g: number): number {
  return Math.min(1, Math.max(0, (g - 1) / (VISION_GAIN - 1)));
}

/** (nv-pass slice 1) The curve's shape under a night-vision gain `g`: the floor eased up to `VISION_FLOOR` (never past
 *  the top). Rendering only. Writes `out` (allocation-free when one is passed). */
export function visionDark(p: DarkParams, g: number, out: DarkParams = { ...p }): DarkParams {
  const k = visionAmount(g);
  out.centre = p.centre;
  out.steep = p.steep;
  out.top = p.top;
  out.floor = p.floor + (Math.max(p.floor, Math.min(VISION_FLOOR, p.top)) - p.floor) * k;
  return out;
}

/**
 * (nv-pass slice 1) The non-voxel surfaces' fill under night vision (characters, props, weapons; rendering only). They
 * take the ambient grid as a flat, directionless fill, while the voxel walls take the sky fill by sky visibility (dark
 * under a roof); the gain turned that difference into a glowing body. Under the goggles the fill keeps `nv` of its
 * strength, shaded like a hemisphere (`wrap` on a face pointing down, 1 pointing up). Lamp light on a body is untouched,
 * so a body under a lamp stays lit. Gameplay never reads it: the ambient grid and the light field are unchanged.
 */
export const BODY_FILL = { nv: 0.35, wrap: 0.5 } as const;

/** The non-voxel fill's scale for night-vision amount `k` (0..1) and the surface normal's up component `ny` (-1..1). */
export function bodyFillScale(k: number, ny: number): number {
  const up = Math.min(1, Math.max(0, ny * 0.5 + 0.5));
  const nv = BODY_FILL.nv * (BODY_FILL.wrap + (1 - BODY_FILL.wrap) * up);
  return 1 + (nv - 1) * Math.min(1, Math.max(0, k));
}

/**
 * Display brightness targets (bible L5): a matte 50% grey card facing the strongest light, at default brightness,
 * after tone mapping and grade, as display luminance 0..1 (Rec. 709 luma of the output pixel).
 */
export const DARK_TARGETS: readonly { level: number; band: 'dark' | 'mid' | 'lit'; min: number; max: number }[] = [
  { level: 0.12, band: 'dark', min: 0, max: 0.04 },
  { level: 0.27, band: 'dark', min: 0, max: 0.09 },
  { level: 0.4, band: 'mid', min: 0.12, max: 0.35 },
  { level: 0.7, band: 'lit', min: 0.45, max: 1 },
];

/** With night vision on (Step 4b): a dark interior reads, lamp light is near white. (nv-pass slice 1: the white clip
 *  starts later and the card, a non-voxel surface, takes the capped body fill, so both bands reach lower; the dark
 *  min is from the GPU check, 13.7% and readable, nv-pass BRIEF A2. `scripts/e2e-darkness.mjs` mirrors this table.) */
export const VISION_TARGETS: readonly { level: number; min: number; max: number }[] = [
  { level: 0.12, min: 0.1, max: 0.45 },
  { level: 0.7, min: 0.7, max: 1 },
];

/** Brightness setting (stored, render only): the slider's range, default 1 and step. The display curve it drives
 *  (-1.5 .. +1.5 stops, brightness-range) and the calibration symbol's grey are `src/vfx/displayBrightness.ts`. */
export const BRIGHTNESS_MIN = 0.75;
export const BRIGHTNESS_MAX = 1.3;
export const BRIGHTNESS_STEP = 0.05;

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
// (nv-pass slice 1) \`bodyFillScale\`: the non-voxel fill under night vision (k 0..1, ny the normal's up component)
float nsBodyFill(float k, float ny) {
  return 1.0 + (${BODY_FILL.nv.toFixed(4)} * (${BODY_FILL.wrap.toFixed(4)} + ${(1 - BODY_FILL.wrap).toFixed(4)} * clamp(ny * 0.5 + 0.5, 0.0, 1.0)) - 1.0) * clamp(k, 0.0, 1.0);
}
`;

