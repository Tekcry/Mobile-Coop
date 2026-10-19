/**
 * (CT prototype G6, AUDIT-WALLS row 12) The raised weapon against a wall right in front: one ray from the shoulder along
 * the aim (the local player each fixed step, the remote copy each frame while raised), the graph's `wallBlock` from its
 * distance (`wallBlockK`). No allocation: the caller owns the two scratch vectors.
 */
import type { Vector3 } from '../core/babylon';
import { MASK } from '../physics/groups';
import { WALL_BLOCK, wallBlockK } from '../anim/animGraph';
import type { Ballistics } from '../weapons/ballistics';

/** Shoulder height over the feet standing / crouched (m). */
const SHOULDER_Y = 1.42;
const SHOULDER_Y_CROUCH = 1.0;

export function muzzleBlock(b: Ballistics, x: number, y: number, z: number, yaw: number, pitch: number, crouch: number, from: Vector3, to: Vector3): number {
  const sy = y + SHOULDER_Y + (SHOULDER_Y_CROUCH - SHOULDER_Y) * Math.max(0, Math.min(1, crouch));
  const cp = Math.cos(pitch);
  const r = WALL_BLOCK.far + 0.05;
  from.set(x, sy, z);
  to.set(x + Math.sin(yaw) * cp * r, sy + Math.sin(pitch) * r, z + Math.cos(yaw) * cp * r);
  return wallBlockK(b.hitDistance(from, to, MASK.WORLD));
}
