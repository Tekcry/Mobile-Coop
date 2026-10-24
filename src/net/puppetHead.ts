/**
 * (rig-pose-fix S3, audit G7) The co-op client puppet's guard head input, pure (no Babylon). The puppet's head hit volume
 * was its rig's `headNode` after `animate` (client anim LOD and frame rate picked head vs body); it is now `guardHead`
 * (the host's own head model) on the inputs the puppet already gives its rig: the interpolated feet and yaw, the eased
 * crouch and speed, the travel direction in its frame and the stance's raise (before the carry: the host's head reads
 * the raise without it). What the wire does not carry is set as `wireHeadIn` sets it on the host (no gait clock, aim
 * pitch, wall, lean, ladder or flashbang pose), so the host's `Enemy.wireHead` is this head for the same state. The held
 * pose fields come from the puppet's own `emoteStep` (its takedown / the partner's hold).
 */
import { PHASE_UNKNOWN, type GuardHeadIn } from '../ai/guardHead';

/**
 * Fills `h` (all but the held pose fields) from what the puppet draws. `localX` / `localZ`: the unit travel direction in
 * its frame (0, 0 when it did not move), `speed` its eased speed (m/s), `aim` the raise before the carry. Returns `h`.
 */
export function puppetHeadIn(h: GuardHeadIn, x: number, y: number, z: number, yaw: number, crouch: number, speed: number, localX: number, localZ: number, aim: number): GuardHeadIn {
  h.x = x;
  h.y = y;
  h.z = z;
  h.yaw = yaw;
  h.crouch = crouch;
  h.speed = speed;
  h.moveX = localX * speed;
  h.moveZ = localZ * speed;
  h.phase = PHASE_UNKNOWN;
  h.aim = aim;
  h.aimPitch = 0;
  h.wall = false;
  h.wallSide = 0;
  h.lean = 0;
  h.leanDrop = 0;
  h.blind = 0;
  h.climb = false;
  return h;
}
