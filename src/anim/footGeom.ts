/**
 * (anim-natural N1) The foot's contact geometry, shared by the foot planner (the ball pivot) and the character rig (the
 * raised heel's ankle lift). Pure, Babylon-free. Moved from `characterRig.ts` (step 22, G1) unchanged.
 *
 * In the foot's own frame (the ankle at the origin, +z forward, toe-down pitch `p` about the ankle's lateral axis, as
 * Babylon's RotationYawPitchRoll): the sole is `HEEL_DOWN` under the ankle, the ball `TOE_BALL` ahead on it, the heel
 * `HEEL_BACK` behind.
 */

/** (locomotion step 22, A79) A planted foot rolling heel to toe (toe up, `pitch` < 0) turns about its heel: the heel's lever (m). */
export const HEEL_BACK = 0.05;
/** (step 22) The sole's depth under the ankle (m): turning about the ankle drops the heel by it times (1 - cos pitch) too. */
export const HEEL_DOWN = 0.08;
/** (G1) The ball of the foot ahead of the ankle (m): a planted foot rising onto its toes (`pitch` > 0) turns about it. */
export const TOE_BALL = 0.12;

/**
 * (anim-natural N1) The floor distance (m) from the ankle forward to the ball's spot with the foot's contact held: heel up
 * (toe-down pitch `p` > 0) the ball is on the floor, `TOE_BALL cos p - HEEL_DOWN sin p` ahead; toe up (`p` < 0, a
 * heel-first landing) the heel is, and the ball's flat spot lies `TOE_BALL + HEEL_BACK (1 - cos p) - HEEL_DOWN sin p`
 * ahead; flat, `TOE_BALL`. A planted foot whose ankle sits this far behind a fixed ball spot keeps its heel (rolling flat)
 * and its ball (rising onto the toes, turning on it) on their spots, as the rig's `heelLift` keeps their height.
 */
export function ankleToBall(p: number): number {
  if (p > 0) return TOE_BALL * Math.cos(p) - HEEL_DOWN * Math.sin(p);
  if (p < 0) return TOE_BALL + HEEL_BACK * (1 - Math.cos(p)) - HEEL_DOWN * Math.sin(p);
  return TOE_BALL;
}

/**
 * The ankle's rise over its rest height (m) for a foot's pitch, so the heel (toe up) or the ball (heel up) stays on the
 * floor. (G1 fix) Also in the air: the heel-first landing's toe-up (terminal swing) lifts the ankle as it will on the
 * floor, and the toe-off's raised heel fades over the first 0.3 of the swing (the ankle target jumped 1-5 cm at strike
 * and toe-off).
 */
export function heelLift(f: { readonly contact: boolean; readonly pitch: number; readonly swing: number }): number {
  if (f.pitch < 0) return f.contact || f.swing > 0.5 ? -Math.sin(f.pitch) * HEEL_BACK + (1 - Math.cos(f.pitch)) * HEEL_DOWN : 0;
  if (f.pitch <= 0) return 0;
  // (G1, footPlanner HEEL_RAISE) heel up, toe on the floor: the ankle rises by the ball's lever
  const toe = Math.sin(f.pitch) * TOE_BALL - (1 - Math.cos(f.pitch)) * HEEL_DOWN;
  if (f.contact) return toe;
  const u = f.swing < 0 ? 1 : Math.min(1, f.swing / 0.3);
  return toe * (1 - u * u * (3 - 2 * u));
}
