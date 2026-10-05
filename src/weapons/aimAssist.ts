import type { AimAssistLevel } from '../core/settings';
import { hyp2 } from '../core/mathx';

export interface AssistParams {
  /** Look sensitivity multiplier while the crosshair is over/near a target. */
  slowdown: number;
  /** Half-angle (deg) of the friction cone around a target. */
  frictionDeg: number;
  /** Rotational pull towards a target while the player is moving or looking (rad/s at full strength). */
  magnetism: number;
  magnetDeg: number;
  /** On ADS start, snap towards a target within this cone (deg). 0 = off. */
  snapDeg: number;
}

export const ASSIST: Record<AimAssistLevel, AssistParams> = {
  off: { slowdown: 1, frictionDeg: 0, magnetism: 0, magnetDeg: 0, snapDeg: 0 },
  low: { slowdown: 0.8, frictionDeg: 3, magnetism: 0.5, magnetDeg: 4, snapDeg: 0 },
  standard: { slowdown: 0.62, frictionDeg: 4, magnetism: 1.0, magnetDeg: 6, snapDeg: 7 },
  high: { slowdown: 0.45, frictionDeg: 5, magnetism: 1.8, magnetDeg: 8, snapDeg: 10 },
};

export interface AimTarget {
  /** Yaw/pitch (radians) from the camera to the target point. */
  yaw: number;
  pitch: number;
  distance: number;
}

export interface AssistResult {
  lookScale: number;
  dYaw: number;
  dPitch: number;
  /** Index of the target the assist latched onto, or -1. */
  target: number;
}

function wrap(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Pure aim-assist step. Angular error is measured in an angle that shrinks with distance
 * so distant targets are not "stickier" than close ones in screen space.
 */
export function computeAssist(
  level: AimAssistLevel,
  camYaw: number,
  camPitch: number,
  targets: readonly AimTarget[],
  inputMag: number,
  playerMoving: boolean,
  adsJustStarted: boolean,
  dt: number,
): AssistResult {
  const p = ASSIST[level];
  const res: AssistResult = { lookScale: 1, dYaw: 0, dPitch: 0, target: -1 };
  if (level === 'off' || targets.length === 0) return res;
  let best = -1;
  let bestErr = Infinity;
  let bestDy = 0;
  let bestDp = 0;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]!;
    if (t.distance > 60) continue;
    const dy = wrap(t.yaw - camYaw);
    const dp = t.pitch - camPitch;
    const err = hyp2(dy * Math.cos(camPitch), dp);
    if (err < bestErr) {
      bestErr = err;
      best = i;
      bestDy = dy;
      bestDp = dp;
    }
  }
  if (best < 0) return res;
  const errDeg = (bestErr * 180) / Math.PI;
  if (adsJustStarted && p.snapDeg > 0 && errDeg <= p.snapDeg) {
    res.dYaw = bestDy * 0.85;
    res.dPitch = bestDp * 0.85;
    res.target = best;
    return res;
  }
  if (errDeg <= p.frictionDeg) {
    res.lookScale = p.slowdown;
    res.target = best;
  }
  if (errDeg <= p.magnetDeg && (inputMag > 0.05 || playerMoving)) {
    const strength = (1 - errDeg / p.magnetDeg) * p.magnetism * dt;
    const k = Math.min(1, strength / Math.max(bestErr, 1e-4));
    res.dYaw = bestDy * k;
    res.dPitch = bestDp * k;
    res.target = best;
  }
  return res;
}
