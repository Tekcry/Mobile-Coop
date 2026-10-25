/**
 * (anim-rig) The toe joint's pitch from the foot planner's roll (pure, Babylon-free; docs/archive/anim-rework/RIG.md).
 *
 * A planted foot rising onto its ball (planner `pitch` > 0: heel up, toe on the floor, CharacterRig's `TOE_BALL` lift)
 * used to pivot the rigid foot about the toe tip, so the toe box went into the floor. With a toe joint per foot (the
 * game LODs' `toeL` / `toeR`, at the ball of the foot) the toes bend back up by the same angle and stay flat on the
 * floor while the foot rolls over them. The toe-off fades it over the first 0.3 of the swing, as `heelLift` fades the
 * raised heel. A heel-first landing (`pitch` < 0, toe up) leaves the toes straight.
 */

/** The toes' largest bend up from the foot (rad): the ball joint's comfortable extension (about 60 degrees). */
export const TOE_MAX = 1.05;

/** The local pitch (rad, about the foot's lateral axis, the ankle's pitch convention) of a foot's toe joint. */
export function toePitch(f: { readonly contact: boolean; readonly pitch: number; readonly swing: number }): number {
  if (!(f.pitch > 0)) return 0;
  const a = f.pitch < TOE_MAX ? f.pitch : TOE_MAX;
  if (f.contact) return -a;
  const u = f.swing < 0 ? 1 : Math.min(1, f.swing / 0.3);
  return -a * (1 - u * u * (3 - 2 * u));
}
