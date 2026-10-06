/**
 * Enemy perception maths (pure: no Babylon / DOM), unit-tested.
 *
 * Each enemy keeps an awareness meter 0..1 per target. Sight fills it at a rate set by distance, where the
 * target sits in the field of view (a focused cone, then slower peripheral vision), the light on the body,
 * stance, motion and how much of the body is in view (the fraction of sample points with line of sight).
 * Out of sight the meter holds for a moment, then drains. Noises push it to a floor (`noiseSuspicion`).
 * Point blank in full light in the focused cone is instant; everything else takes visible time (the HUD arc
 * fills first: AI fairness).
 */
import { LIGHT, visibilityFromLight } from '../world/lights';

export const PERCEPTION = {
  /** Focused cone half-angle (rad): ~55 deg full cone. */
  focusHalf: (55 / 2) * (Math.PI / 180),
  /** Focused sight range (m). */
  focusRange: 25,
  /** Peripheral half-angle (rad) and range (m): slower fill, shorter reach. */
  periphHalf: 100 * (Math.PI / 180),
  periphRange: 12,
  periphMul: 0.35,
  /** Width of the focus -> peripheral blend (rad). */
  edgeBlend: 0.18,
  /** Fill rate (/s) for a fully visible, still-standing body in full light at 0 m in focus. */
  rate: 2.2,
  /** Distance falloff exponent: rate x (1 - d / range)^distPow. */
  distPow: 1.5,
  /** Within this anyone notices a moving body, whatever the light or angle (bumping into them). */
  closeRange: 2.2,
  closeRate: 1.8,
  /** Point blank in full light, in focus: detected at once. */
  instantRange: 1.6,
  /** Fill-rate cap (/s): anything short of point blank takes at least ~0.3 s (the arc shows first). */
  maxRate: 3.2,
  /** Seconds the meter holds after the last sighting before it drains, and the drain rate (/s). */
  hold: 1.2,
  decay: 0.18,
  /** Evidence below this rate (/s) never builds up (a dim shape at the edge of sight): the meter only
   *  rises by what exceeds it, and drains at half the decay while that is all there is. */
  leak: 0.2,
  /** Thresholds: suspicious (white arc shows and the enemy looks), investigate. Detection is 1. */
  suspicious: 0.3,
  investigate: 0.6,
  /** Stance and motion multipliers. */
  crouchMul: 0.55,
  stillMul: 0.55,
  sneakMul: 0.75,
  walkMul: 1,
  jogMul: 1.35,
  sprintMul: 1.9,
  /** Even a sliver in view counts for something. */
  exposureMin: 0.2,
} as const;

export interface SightInput {
  /** Distance eye -> body (m). */
  dist: number;
  /** Angle between the enemy's facing and the body (rad, 0 = dead ahead). */
  angle: number;
  /** Light level on the body 0..1. */
  light: number;
  crouched: boolean;
  /** Body speed (m/s). */
  speed: number;
  /** Fraction of body sample points in line of sight 0..1 (0 = not in sight). */
  exposure: number;
  /** State sensitivity multiplier (searching enemies look harder). */
  sensitivity: number;
}

/** 0..1 how much a light level shows a body (squared: shadow hides far more than linear). */
export function lightFactor(level: number): number {
  const v = visibilityFromLight(level);
  return v * v;
}

/** Motion multiplier from speed: still .. sneak .. walk .. jog .. sprint. */
export function motionFactor(speed: number): number {
  const P = PERCEPTION;
  if (speed < 0.15) return P.stillMul;
  if (speed < 0.9) return P.sneakMul;
  if (speed < 1.4) return P.sneakMul + (P.walkMul - P.sneakMul) * ((speed - 0.9) / 0.5);
  if (speed < 2.0) return P.walkMul;
  if (speed < 3.6) return P.walkMul + (P.jogMul - P.walkMul) * ((speed - 2.0) / 1.6);
  return P.jogMul + (P.sprintMul - P.jogMul) * Math.min(1, (speed - 3.6) / 1.4);
}

/**
 * Where in the field of view: returns the angular multiplier (1 in focus .. periphMul .. 0 behind) and
 * writes the effective range for that angle into `out[0]`.
 */
export function fieldFactor(angle: number, out?: number[]): number {
  const P = PERCEPTION;
  const a = Math.abs(angle);
  let mul: number;
  let range: number;
  if (a <= P.focusHalf) {
    mul = 1;
    range = P.focusRange;
  } else if (a <= P.focusHalf + P.edgeBlend) {
    const t = smooth((a - P.focusHalf) / P.edgeBlend);
    mul = 1 + (P.periphMul - 1) * t;
    range = P.focusRange + (P.periphRange - P.focusRange) * t;
  } else if (a <= P.periphHalf) {
    mul = P.periphMul;
    range = P.periphRange;
  } else {
    mul = 0;
    range = 0;
  }
  if (out) out[0] = range;
  return mul;
}

const rangeOut = [0];

/** Sight fill rate (/s) for one target, 0 when not seen at all. */
export function sightRate(i: SightInput): number {
  const P = PERCEPTION;
  if (i.exposure <= 0) return 0;
  const stance = i.crouched ? P.crouchMul : 1;
  const motion = motionFactor(i.speed);
  let rate = 0;
  const field = fieldFactor(i.angle, rangeOut);
  const range = rangeOut[0]!;
  if (field > 0 && i.dist < range) {
    const df = Math.pow(1 - i.dist / range, P.distPow);
    const exp = P.exposureMin + (1 - P.exposureMin) * Math.min(1, i.exposure);
    rate = P.rate * df * field * lightFactor(i.light) * stance * motion * exp;
  }
  // close by: a moving body is noticed whatever the light (felt / heard as much as seen); still and
  // behind, it is not
  if (i.dist < P.closeRange && i.speed > 0.15) {
    const k = 1 - i.dist / P.closeRange;
    const behind = field > 0 ? 1 : 0.5;
    rate += P.closeRate * k * behind * Math.min(1, motion) * stance;
  }
  rate *= i.sensitivity;
  return rate > P.maxRate ? P.maxRate : rate;
}

/** Point blank in full light in the focused cone: detected at once. */
export function instantDetect(i: SightInput): boolean {
  return i.exposure > 0.3 && i.dist < PERCEPTION.instantRange && i.light >= LIGHT.lit && Math.abs(i.angle) <= PERCEPTION.focusHalf;
}

/** The target counts as seen (the meter rises) at this rate. */
export function seenAt(rate: number): boolean {
  return rate > PERCEPTION.leak;
}

/**
 * Advance a meter: rises by what the rate exceeds the leak while seen; a glimpse too weak to count drains
 * it slowly; out of sight it holds for `hold` seconds, then drains. `sinceSeen` is the seconds since the
 * target was last seen (`seenAt`).
 */
export function stepMeter(meter: number, rate: number, dt: number, sinceSeen: number): number {
  const P = PERCEPTION;
  let m = meter;
  if (rate > P.leak) m += (rate - P.leak) * dt;
  else if (rate > 0) m -= P.decay * 0.5 * dt;
  else if (sinceSeen > P.hold) m -= P.decay * dt;
  return m < 0 ? 0 : m > 1 ? 1 : m;
}

/**
 * A noise heard at `dist` from a source audible to `radius`: the meter floor it pushes to (0 when out of
 * earshot). Anything heard makes the listener suspicious; close noises reach the investigate level.
 */
export function noiseSuspicion(dist: number, radius: number): number {
  if (radius <= 0 || dist >= radius) return 0;
  const k = 1 - dist / radius;
  return PERCEPTION.suspicious + 0.05 + (PERCEPTION.investigate + 0.1 - PERCEPTION.suspicious - 0.05) * k;
}

function smooth(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}
