/**
 * (anim-joints J1, COVERAGE gap 1) The animation base table: GENERATED. `scripts/anim-tune-bake.mjs` (logic
 * `src/anim/tuneBakeBase.ts`) rewrites the JSON between the `@anim-base-begin` / `@anim-base-end` lines when it bakes
 * Joints, Hands & feet, IK strength or Weapon values (`docs/anim-tuner/BAKE.md`); do not edit that part by hand.
 *
 * Every Wren rig (`CharacterRig.tuneRows`) reads it: the tuner's Joints / Hands & feet / IK / Weapon values are deltas on
 * it (`tuneJoints.ts`, `tuneHands.ts`: joints add degrees per axis, offsets add, gun scale and IK strength multiply, the
 * trigger mode is the delta's when not 0 (auto)). Keyed by row id, joint name and param id, never by index. Empty (every
 * row identity) = the untuned rig, bit-identical.
 */
export interface AnimBaseData {
  version: 1;
  /** Joints row (`walk`, `rifle.aim`, ...) -> joint name -> [pitch, yaw, roll] degrees. */
  joints: Record<string, Record<string, [number, number, number]>>;
  /** Hands & feet and Weapon: weapon -> row -> param id -> value. */
  hands: Record<string, Record<string, Record<string, number>>>;
  /** IK strength: row -> [handL, handR, footL, footR]. */
  ik: Record<string, [number, number, number, number]>;
}

export const ANIM_BASE: AnimBaseData =
// @anim-base-begin
{
  "version": 1,
  "joints": {
    "idle": { "upperArmL": [0, 0, -4], "upperArmR": [0, 0, 4] },
    "jog": { "upperArmL": [0, 0, -4], "upperArmR": [0, 0, 4] },
    "walk": { "upperArmL": [0, 0, -4], "upperArmR": [0, 0, 4] }
  },
  "hands": {},
  "ik": {}
}
// @anim-base-end
;
