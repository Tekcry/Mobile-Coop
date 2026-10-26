import type { Vec2 } from './actions';
import { hyp2 } from '../core/mathx';

/** The radial dead zone's default outer edge: at or beyond it the stick reads full. */
export const RADIAL_OUTER = 0.98;

/**
 * Radial dead zone with rescale: inside `inner` -> 0, beyond `outer` -> full,
 * linear remap in between so there is no jump at the dead-zone edge.
 */
export function applyRadialDeadzone(x: number, y: number, inner: number, outer = RADIAL_OUTER): Vec2 {
  return applyRadialDeadzoneTo(x, y, inner, outer, { x: 0, y: 0 });
}

/** (player-hygiene S2) `applyRadialDeadzone` written into `out` (the pad poll's scratch; no allocation). */
export function applyRadialDeadzoneTo(x: number, y: number, inner: number, outer: number, out: Vec2): Vec2 {
  const mag = hyp2(x, y);
  if (mag <= inner || mag === 0) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  const t = Math.min(1, (mag - inner) / Math.max(1e-6, outer - inner));
  out.x = (x / mag) * t;
  out.y = (y / mag) * t;
  return out;
}

/** Axial dead zone for triggers / single axes. */
export function applyAxisDeadzone(v: number, inner: number): number {
  const a = Math.abs(v);
  if (a <= inner) return 0;
  return Math.sign(v) * Math.min(1, (a - inner) / (1 - inner));
}

export type CurveKind = 'linear' | 'classic' | 'precise' | 'aggressive';

const CURVE_EXP: Record<CurveKind, number> = { linear: 1, classic: 1.6, precise: 2.4, aggressive: 0.7 };
/** (player-hygiene S2) `CURVE_EXP` as a Map for the per-frame read: `CURVE_EXP[curve]`, a keyed load whose key varies,
 *  copied its fractional number (16 B) every call once V8 had seen two curves; a Map hands back the stored number. */
const CURVE_EXP_BY = new Map<CurveKind, number>(Object.entries(CURVE_EXP) as [CurveKind, number][]);

/** Response curve applied to the magnitude, preserving direction. */
export function applyCurve(v: Vec2, curve: CurveKind): Vec2 {
  return applyCurveTo(v, curve, { x: 0, y: 0 });
}

/** (player-hygiene S2) `applyCurve` written into `out`; `out` may be `v` (read before written). */
export function applyCurveTo(v: Vec2, curve: CurveKind, out: Vec2): Vec2 {
  const vx = v.x;
  const vy = v.y;
  const mag = hyp2(vx, vy);
  if (mag === 0) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  const m = Math.pow(Math.min(1, mag), CURVE_EXP_BY.get(curve)!);
  out.x = (vx / mag) * m;
  out.y = (vy / mag) * m;
  return out;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
