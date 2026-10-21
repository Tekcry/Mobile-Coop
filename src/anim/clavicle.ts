/**
 * (anim-skeleton S2) The clavicle on the game rig, pure (no Babylon). A2: `clavL` / `clavR` sit under the chest at the
 * sternoclavicular point with an identity rest, so nothing moves until a clavicle input is set.
 *
 * The SC point is `scripts/anim-skeleton/skeleton.json` "clavicle" (where S1 put the skin's clavicle joints): `lateral`
 * of the midline, `belowNeck` under the neck joint, `forward` of the chest joint (m). The rig places it the same way
 * relative to its own chest and neck (`clavPoint`).
 *
 * Input (`CharacterRig.clavIn`, the slot S3's clip channel and S4's Joints row write): per side pitch / yaw / roll in
 * degrees, in the chest frame (+X right, +Y up, +Z forward), composed as `RotationYawPitchRoll` like the Joints rows.
 * A shrug lifts the shoulder: roll -deg on the left, +deg on the right; pushed forward: yaw +deg on the left, -deg on
 * the right. No mirroring is done here: each side's numbers are its own.
 */
import { eulerQuat } from './tuneJoints';

export const CLAV_SC = { lateral: 0.03, belowNeck: 0.035, forward: 0.04 } as const;

/** `clavIn` layout: left pitch, yaw, roll, then right (degrees). */
export const CLAV_L = 0;
export const CLAV_R = 3;
export const CLAV_LEN = 6;

const D2R = Math.PI / 180;

/** The SC point of a side (-1 left, 1 right) in the chest frame, given the neck joint's height above the chest (m). */
export function clavPoint(side: -1 | 1, neckY: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  out.x = side * CLAV_SC.lateral;
  out.y = neckY - CLAV_SC.belowNeck;
  out.z = CLAV_SC.forward;
  return out;
}

/** True when a side's input (`o` = CLAV_L / CLAV_R) turns the clavicle (any angle non-zero). */
export function clavActive(v: ArrayLike<number>, o: number): boolean {
  return v[o] !== 0 || v[o + 1] !== 0 || v[o + 2] !== 0;
}

/** A side's clavicle rotation (chest frame) into out[q..q+4]. No allocation. */
export function clavQuat(v: ArrayLike<number>, o: number, out: Float64Array, q: number): void {
  eulerQuat(v[o]! * D2R, v[o + 1]! * D2R, v[o + 2]! * D2R, out, q);
}

/**
 * (anim-skeleton S3) The clavicle's rotation when both inputs act: the Joints / tool input `e` (out[q..], from
 * `clavQuat`) turned in the chest frame on top of the clip's keyed rotation `k` (k[o..]): out = e * k. No allocation.
 */
export function clavCompose(out: Float64Array, q: number, k: ArrayLike<number>, o: number): void {
  const ax = out[q]!, ay = out[q + 1]!, az = out[q + 2]!, aw = out[q + 3]!;
  const bx = k[o]!, by = k[o + 1]!, bz = k[o + 2]!, bw = k[o + 3]!;
  out[q] = aw * bx + ax * bw + ay * bz - az * by;
  out[q + 1] = aw * by - ax * bz + ay * bw + az * bx;
  out[q + 2] = aw * bz + ax * by - ay * bx + az * bw;
  out[q + 3] = aw * bw - ax * bx - ay * by - az * bz;
}
