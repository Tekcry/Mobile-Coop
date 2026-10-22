/** (partner-seed) The partner rig's eased ground speed and its first-seen / teleport seeding. Pure (no Babylon / DOM). */
import { SNAP_MIN, SNAP_SPEED } from './interp';

/** The most ground speed the rig animates from (m/s). */
export const REMOTE_SPEED_MAX = 12;

/**
 * A render frame that moved the shown spot further than a teleport (`SNAP_MIN` m, and faster than `SNAP_SPEED` m/s: a
 * hitch's long dt is not one) is a bay start / checkpoint reset / respawn: the eased state belongs to the old spot.
 */
export function isShownTeleport(moved: number, dt: number): boolean {
  return moved > SNAP_MIN && moved > SNAP_SPEED * dt;
}

/**
 * The eased speed after a frame. `reseed` (the first placement, or a teleport) takes the owner's pace at once instead of
 * easing up from 0 (a partner first seen already walking slower than about 0.3 m/s at 60 Hz, 1.2 m/s at 240 Hz, seeded
 * as standing and played a start one-shot).
 */
export function easeRemoteSpeed(speed: number, want: number, dt: number, reseed: boolean): number {
  const w = Math.min(Math.max(want, 0), REMOTE_SPEED_MAX);
  return reseed ? w : speed + (w - speed) * Math.min(1, dt * 10);
}

/**
 * The frame offset (x, z) the heading reads from while the rig has no previous spot to difference against: the owner's
 * direction of travel (the horizontal from -> to of the sample) at `speed` over `dt`. Zero when the two states are the
 * same spot or a teleport apart.
 */
export function seedHeading(fx: number, fz: number, tx: number, tz: number, speed: number, dt: number, out: { x: number; z: number }): void {
  const dx = tx - fx;
  const dz = tz - fz;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d < 1e-4 || d > SNAP_MIN || dt <= 0) {
    out.x = 0;
    out.z = 0;
    return;
  }
  const k = (speed * dt) / d;
  out.x = dx * k;
  out.z = dz * k;
}
