/**
 * (A1.2) Hips follow the legs in turns (pure, Babylon-free, unit-tested).
 *
 * The chest keeps the body's facing; the pelvis turns a very little toward the planted feet (up to `PELVIS_FOLLOW_MAX`),
 * so in a turn it trails the chest, and the knees aim between the hips and the toes (never backwards).
 */

/**
 * Largest pelvis yaw toward the planted feet (rad, 3 deg). (CT prototype G1, audit row 1) was 0.35 (20 deg): in Chaos
 * Theory the pelvis, knees and feet turn as one unit with the chest (105624 @ 24-27, 105949 @ 10-13), and the planted
 * feet now turn with the root (footPlanner `TURN_FOLLOW.twistFree`), so the hips stay with the chest.
 */
export const PELVIS_FOLLOW_MAX = 0.35;
/** Ease time constant of the pelvis follow (s). */
export const PELVIS_FOLLOW_TAU = 0.06;
/** Largest knee pole yaw away from the pelvis (rad). */
export const KNEE_POLE_MAX = 0.6;

const TAU = Math.PI * 2;
function wrap(a: number): number {
  a %= TAU;
  return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a;
}

/**
 * The pelvis yaw offset from the root (rad) after `dt`: half the planted feet's mean yaw error, clamped to
 * +-PELVIS_FOLLOW_MAX, eased from `prev` with PELVIS_FOLLOW_TAU. No planted foot: eases back to 0.
 */
export function pelvisFollow(prev: number, rootYaw: number, lYaw: number, rYaw: number, lContact: boolean, rContact: boolean, dt: number): number {
  let target = 0;
  if (lContact && rContact) {
    // circular mean of the two planted feet
    const m = Math.atan2(Math.sin(lYaw) + Math.sin(rYaw), Math.cos(lYaw) + Math.cos(rYaw));
    target = 0.5 * wrap(m - rootYaw);
  } else if (lContact) target = 0.5 * wrap(lYaw - rootYaw);
  else if (rContact) target = 0.5 * wrap(rYaw - rootYaw);
  if (target > PELVIS_FOLLOW_MAX) target = PELVIS_FOLLOW_MAX;
  else if (target < -PELVIS_FOLLOW_MAX) target = -PELVIS_FOLLOW_MAX;
  if (dt <= 0) return prev;
  const k = 1 - Math.exp(-dt / PELVIS_FOLLOW_TAU);
  return prev + (target - prev) * k;
}

/**
 * The knee pole world yaw: between the pelvis and the toes (`share` of the way, 0.5 by default), never more than
 * KNEE_POLE_MAX from the pelvis (NaN pelvis: the foot yaw). (anim-rework S2) A swinging leg passes `KNEE_SWING_SHARE`:
 * its knee stays forward under the hips while the foot turns to its landing (a foot still turned from the last plant
 * swung its knee 7-9 cm outside the ankle through a direction change).
 */
export const KNEE_SWING_SHARE = 0.15;

export function kneePoleYaw(pelvisYaw: number, footYaw: number, share = 0.5): number {
  if (Number.isNaN(pelvisYaw)) return footYaw;
  let d = share * wrap(footYaw - pelvisYaw);
  if (d > KNEE_POLE_MAX) d = KNEE_POLE_MAX;
  else if (d < -KNEE_POLE_MAX) d = -KNEE_POLE_MAX;
  return pelvisYaw + d;
}
