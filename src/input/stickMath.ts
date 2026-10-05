import type { Vec2 } from './actions';

/**
 * Radial dead zone with rescale: inside `inner` -> 0, beyond `outer` -> full,
 * linear remap in between so there is no jump at the dead-zone edge.
 */
export function applyRadialDeadzone(x: number, y: number, inner: number, outer = 0.98): Vec2 {
  const mag = Math.hypot(x, y);
  if (mag <= inner || mag === 0) return { x: 0, y: 0 };
  const t = Math.min(1, (mag - inner) / Math.max(1e-6, outer - inner));
  return { x: (x / mag) * t, y: (y / mag) * t };
}

/** Axial dead zone for triggers / single axes. */
export function applyAxisDeadzone(v: number, inner: number): number {
  const a = Math.abs(v);
  if (a <= inner) return 0;
  return Math.sign(v) * Math.min(1, (a - inner) / (1 - inner));
}

export type CurveKind = 'linear' | 'classic' | 'precise' | 'aggressive';

const CURVE_EXP: Record<CurveKind, number> = { linear: 1, classic: 1.6, precise: 2.4, aggressive: 0.7 };

/** Response curve applied to the magnitude, preserving direction. */
export function applyCurve(v: Vec2, curve: CurveKind): Vec2 {
  const mag = Math.hypot(v.x, v.y);
  if (mag === 0) return { x: 0, y: 0 };
  const m = Math.pow(Math.min(1, mag), CURVE_EXP[curve]);
  return { x: (v.x / mag) * m, y: (v.y / mag) * m };
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
