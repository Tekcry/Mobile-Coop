/**
 * (marlow-bays item 24, track A) The guards' animation base table: GENERATED. `scripts/anim-tune-bake.mjs` (logic
 * `src/anim/tuneBakeBase.ts`, the guard part) rewrites the JSON between the `@anim-base-guard-begin` /
 * `@anim-base-guard-end` lines when it bakes the Guard joints, Guard stepping or Guard weight values of a tuner export
 * (`docs/archive/anim-tuner/BAKE.md`); do not edit that part by hand.
 *
 * Every guard rig reads it (`CharacterRig.guardRows`, set in `buildEnemyRig`: the host's guards and the co-op client's
 * puppets alike, and the Anim Studio's guard puppet); no Wren rig ever does, and Wren's table (`animBase.ts`) never
 * reaches a guard. The tuner's guard rows are deltas on it (`tuneGuard.ts`): joint degrees add per axis (wrapped to
 * -180..180), stepping multipliers multiply, weight multipliers multiply and weight amounts add. Keyed by row id, joint
 * name and param id, never by index. Empty (every row identity) = the untuned guard, bit-identical.
 */
export interface AnimBaseGuardData {
  version: 1;
  /** Guard Joints row (`idle`, `walk`, `run`, `aim`, `crouch`, `cover`) -> joint name -> [pitch, yaw, roll] degrees. */
  joints: Record<string, Record<string, [number, number, number]>>;
  /** Guard Stepping gait (`idle`, `walk`, ... `crouchRun`) -> param id -> multiplier. */
  step: Record<string, Record<string, number>>;
  /** Guard Weight row -> slider id -> value (a multiplier or an amount, as the slider). */
  weight: Record<string, Record<string, number>>;
}

export const ANIM_BASE_GUARD: AnimBaseGuardData =
// @anim-base-guard-begin
{
  "version": 1,
  "joints": {},
  "step": {},
  "weight": {}
}
// @anim-base-guard-end
;
