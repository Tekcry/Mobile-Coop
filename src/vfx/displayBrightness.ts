import { BRIGHTNESS_MAX, BRIGHTNESS_MIN } from '../world/darkCurve';

/**
 * The Options brightness slider's display curve (render only; brightness-range). Michael: "brightness slider doesnt
 * seem to make a big difference ... make the range a lot bigger". The stored setting keeps its range and default
 * (`BRIGHTNESS_MIN` .. 1 .. `BRIGHTNESS_MAX`, no save change); it is remapped here to a shadow gain of -1.5 .. +1.5
 * stops (piecewise linear in stops either side of 1, so the default is exactly today's picture).
 *
 * The gain drives a curve on the final display colour, `m x / (1 + (m - 1) x)`: slope `m` at black, white stays white
 * and black stays black, so the brightest setting never clips a lit room to white and the darkest still shows a
 * moderately lit room (mid grey 0.2 reads about 0.08). Mid grey moves about one stop each way. It runs after the
 * vision modes (night vision, thermal and electro read the un-brightened scene, so heat and the tube's gain do not
 * shift with it) and before the flash, vignette and grain.
 *
 * Gameplay never reads it: the light meter, guard perception, the light field and co-op parity use the light bake.
 */
export const BRIGHTNESS_STOPS = 1.5;

/** The slider value (stored setting) to stops of shadow gain: 0 at 1, -1.5 at the minimum, +1.5 at the maximum. */
export function brightnessStops(k: number): number {
  const b = Math.min(BRIGHTNESS_MAX, Math.max(BRIGHTNESS_MIN, Number.isFinite(k) ? k : 1));
  if (b === 1) return 0;
  return b < 1 ? (-BRIGHTNESS_STOPS * (1 - b)) / (1 - BRIGHTNESS_MIN) : (BRIGHTNESS_STOPS * (b - 1)) / (BRIGHTNESS_MAX - 1);
}

/** The slider value to the curve's gain `m` (1 at the default; about 0.35 .. 2.83). */
export function brightnessGain(k: number): number {
  const s = brightnessStops(k);
  return s === 0 ? 1 : 2 ** s;
}

/** The display curve for one channel `x` (0..1) at gain `m` (GLSL `displayBright`); `m` 1 returns `x` unchanged. */
export function brightnessCurve(x: number, m: number): number {
  if (m === 1) return x;
  const c = Math.min(1, Math.max(0, x));
  return (m * c) / (1 + (m - 1) * c);
}

/** GLSL mirror of `brightnessCurve` (the cinematic pass skips it at gain 1, so the default is bit-exact). */
export const BRIGHTNESS_GLSL = `
vec3 displayBright(vec3 c, float m) {
  c = clamp(c, 0.0, 1.0);
  return m * c / (1.0 + (m - 1.0) * c);
}`;

/** The calibration symbol's grey on black (display value at the default): set right, it is barely visible. */
export const CALIBRATION_GREY = 0.035;

/** The calibration symbol's 8-bit grey at slider value `k` (through the same curve as the picture). */
export function calibrationGrey(k: number): number {
  return Math.round(255 * brightnessCurve(CALIBRATION_GREY, brightnessGain(k)));
}
