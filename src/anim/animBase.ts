/**
 * (anim-joints J1, COVERAGE gap 1) The animation base table: GENERATED. `scripts/anim-tune-bake.mjs` (logic
 * `src/anim/tuneBakeBase.ts`) rewrites the JSON between the `@anim-base-begin` / `@anim-base-end` lines when it bakes
 * Joints, Hands & feet, IK strength, Weapon, (anim-gear) Gear or (anim-bake-targets) Body values, or (anim-bake-all) any
 * other slider with no code value of its own (the `sections` key) (`docs/archive/anim-tuner/BAKE.md`); do not edit that part by hand.
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
  /**
   * (anim-gear) Gear offsets: row (`holster`, `holster.crouch`, ...; `tuneGear.ts` GEAR_ROWS) -> param id (x / y / z
   * m, pitch / yaw / roll deg) -> value; offsets add, the tuner's Gear values are deltas on it. Optional: a table
   * without it has every socket at 0 (the bake prints the key only when a row has an offset).
   */
  gear?: Record<string, Record<string, number>>;
  /**
   * (anim-bake-targets, BT-A1 / A3) Body base values: row (a Body group id: `idle`, `walk`, `lowReady`, ...) -> param (a
   * Body slider id, `tune.ts` BODY_BASE_FIELDS) -> value; a mul slider's value multiplies, an add slider's adds, and the
   * tuner's Body values compose on top. Every Wren rig reads its own row (`tuneJointsRig.ts`), guards never. Optional:
   * printed only when a row is set.
   */
  body?: Record<string, Record<string, number>>;
  /**
   * (anim-bake-all, BA-A1) The generic table: section id (`cam`, `gun`, `step`, `weight`, `speed`, `team_boost`, `trav`,
   * `body` for strideMul, ...) -> group -> slider id -> value, for every slider with no code value of its own. A mul
   * slider's value multiplies, an add slider's adds; the registry composes it with the tuner's value for every consumer
   * (`tuneRegistry.ts` `eff`), so it applies exactly where the slider does. Optional: printed only when a value is set.
   */
  sections?: Record<string, Record<string, Record<string, number>>>;
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
  "ik": {},
  "body": {
    "idle": { "elbowOutAdd": 0.03, "trackMul": 0.05 },
    "jog": { "armSwingMul": 1.7, "elbowOutAdd": 0.03, "trackMul": 0.05 },
    "lowReady": { "elbowPoleMul": 2.25 },
    "run": { "armSwingMul": 1.6, "kneeLiftMul": 1.55, "trackMul": 0.05 },
    "walk": { "elbowOutAdd": 0.03, "trackMul": 0.05 }
  }
}
// @anim-base-end
;
