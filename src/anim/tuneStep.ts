/**
 * (tuner-v2 item 3) Stepping controls: per gait multipliers on the foot planner's own stepping values (`footPlanner.ts`).
 * Every value is a multiplier whose default 1 leaves the planner's expression exactly as it is (x * 1 === x), so the
 * defaults are the planner's current constants, read where they are, never copied. Pure, Babylon-free; the planner's
 * hooks read `STEP` (the gait row `stepSelect` copied in at the top of each planner update): no allocation.
 *
 * The gaits are the ones the planner tells apart: standing still (idle stepping; (anim-natural N1) also the aimed turn
 * on the spot, stride 'velocity' under 0.3 m/s), standing walk / jog / run by pace
 * (split halfway between the `GEARS.stand` walk, jog and run speeds), crouched walk / run (halfway between the crouched
 * jog and run speeds). (item 24, track A) Wren's planners (the player, the partner, the chamber puppets) read this table;
 * a guard's reads the guards' (`tuneGuard.ts`), any other rig's the identity table `STEP_IDENTITY_ROWS`.
 *
 * (anim-bake-all, BA-A1) Wren's rows are the base table's `sections.step` (`animBase.ts`, through the registry's
 * `tuneBaseValue`) times the tuner's values (`stepSet`, which the Stepping section syncs in): rebuilt on a set or a base
 * load, never per frame. With no base value the rows are the tuner's values exactly (1 x v). The identity table never
 * takes Wren's base; the guards' rows compose their own base (`animBaseGuard.ts`) in `tuneGuard.ts`.
 */
import { GEARS } from '../config/movement';
import { TUNE_BASE_HOOKS, tuneBaseValue } from './tuneRegistry';

export const STEP_GAITS = ['idle', 'walk', 'jog', 'run', 'crouchWalk', 'crouchRun'] as const;
export type StepGait = (typeof STEP_GAITS)[number];

/** Parameter slots of a gait row (`STEP[SP.lift]` ...). */
export const SP = { lift: 0, lock: 1, dur: 2, slide: 3, stride0: 4, stride1: 5, stride2: 6, toeOff: 7, heel: 8, replant: 9, turnTwist: 10, turnRate: 11, pivot: 12, pivotHeel: 13, landTurn: 14 } as const;
export type StepParam = keyof typeof SP;
export const STEP_N = 15;

/** Ids, labels and ranges (the registry's sliders); `hook` names the planner expression each one multiplies. */
export const STEP_PARAMS: readonly { id: StepParam; label: string; min: number; max: number; step: number; hook: string }[] = [
  { id: 'lift', label: 'foot lift height', min: 0, max: 3, step: 0.05, hook: 'footPlanner beginSwing: stepLift = lift (gait liftH / PLANNER.idleLift)' },
  { id: 'lock', label: 'plant lock strength (higher: a planted foot scrubs and twists less)', min: 0.25, max: 4, step: 0.05, hook: 'footPlanner band: scrub speed / lock; twistCap: twist allowance * lock' },
  { id: 'dur', label: 'step duration (rule and idle steps; running swings keep the gait clock)', min: 0.3, max: 3, step: 0.05, hook: 'footPlanner beginSwing: stepDur = max(0.16, dur)' },
  { id: 'slide', label: 'foot-slide tolerance (drag limit)', min: 0.5, max: 2, step: 0.05, hook: 'footPlanner holdOrStep: drag reach = max(reach, half a stance + 0.3)' },
  { id: 'stride0', label: 'stride at the gait\'s slowest pace', min: 0.3, max: 2, step: 0.05, hook: 'footPlanner updateMoving: landing ahead (LAND_AHEAD share of the stance)' },
  { id: 'stride1', label: 'stride at the gait\'s middle pace', min: 0.3, max: 2, step: 0.05, hook: 'footPlanner updateMoving: landing ahead' },
  { id: 'stride2', label: 'stride at the gait\'s fastest pace', min: 0.3, max: 2, step: 0.05, hook: 'footPlanner updateMoving: landing ahead' },
  { id: 'toeOff', label: 'toe-off roll (late-stance heel raise and swing toe pitch)', min: 0, max: 2, step: 0.05, hook: 'footPlanner HEEL_RAISE heel raise; swingTo toe-off pitch 0.45' },
  { id: 'heel', label: 'heel-strike roll (toe up at landing)', min: 0, max: 2, step: 0.05, hook: 'footPlanner swingTo pre-landing toe up 0.22; land / roll HEEL_ROLL.pitch' },
  { id: 'replant', label: 'replant threshold (moving: trailing-foot toe-off reach; still: idle step error)', min: 0.4, max: 1.5, step: 0.01, hook: 'footPlanner holdOrStep: reach * 0.92; updateIdle: idle error > 1' },
  // (anim-natural N1) the feet in turns; the idle row is the aimed turn on the spot
  { id: 'turnTwist', label: 'turn step: twist a planted foot may reach before it steps round (lower: steps sooner)', min: 0.4, max: 2.5, step: 0.05, hook: 'footPlanner turnOver: FOOT_TURN_STEP.twist[gait]' },
  { id: 'turnRate', label: 'turn step: body turn rate that arms it (lower: steps in gentler turns)', min: 0.5, max: 3, step: 0.05, hook: 'footPlanner turn rules: FOOT_TURN_STEP.rate[gait]' },
  { id: 'pivot', label: 'ball pivot: how far a planted foot turns on its ball in one plant (0: locked)', min: 0, max: 2, step: 0.05, hook: 'footPlanner pivotFeet: TURN_PIVOT.max[gait]' },
  { id: 'pivotHeel', label: 'ball pivot: heel raise while it turns', min: 0, max: 2, step: 0.05, hook: 'footPlanner pivotFeet: TURN_PIVOT.heel[gait]' },
  { id: 'landTurn', label: 'landing turned into the turn (yaw lead at touchdown)', min: 0, max: 2, step: 0.05, hook: 'footPlanner aimClock: LAND_TURN[gait]' },
];

const G = STEP_GAITS.length;
/** `[gait * STEP_N + param]`: the composed rows (base x tuner) the planner reads, all 1 (identity) untuned. */
const ROWS = new Float64Array(G * STEP_N).fill(1);
/** (anim-bake-all) The tuner's values (`stepSet` / `stepGet`), all 1 at default. */
const DELTA = new Float64Array(G * STEP_N).fill(1);
/** (anim-bake-all) The base table's values (`sections.step`), all 1 where unset. */
const BASE = new Float64Array(G * STEP_N).fill(1);

/** (anim-bake-all) The base rows from the registry's table, and the composed rows. Not hot (a load). */
export function stepBaseSync(): void {
  for (let g = 0; g < G; g++) {
    for (const p of STEP_PARAMS) {
      const i = g * STEP_N + SP[p.id];
      BASE[i] = tuneBaseValue('step', `step.${STEP_GAITS[g]!}`, p.id) ?? 1;
      ROWS[i] = BASE[i]! * DELTA[i]!;
    }
  }
}

/**
 * (item 24, track A) A fixed identity table (never written): the planners of rigs that are neither Wren's nor a guard's
 * (the VIP, the training dummy, a carried body) read it, so Wren's Stepping rows reach Wren only. Shared, allocated once.
 */
export const STEP_IDENTITY_ROWS = new Float64Array(G * STEP_N).fill(1);
/** The selected gait's row: what the planner's hooks read. */
export const STEP = new Float64Array(STEP_N).fill(1);
/** The gait `stepSelect` chose last (index into STEP_GAITS). */
export let stepGaitNow = 0;

const S = GEARS.stand;
const C = GEARS.crouch;
const WALK_JOG = (S[2] + S[3]) / 2;
const JOG_RUN = (S[3] + S[4]) / 2;
const CWALK_CRUN = (C[3] + C[4]) / 2;
/** Each gait's pace band (m/s) for the stride curve's three points (low, middle, high). */
const BAND_LO = [0, 0, WALK_JOG, JOG_RUN, 0, CWALK_CRUN];
const BAND_HI = [0, WALK_JOG, JOG_RUN, S[4], CWALK_CRUN, C[4]];

/** The planner's gait from its input: still, or by pace standing / crouched (`crouch > 0.5`, the planner's own split). */
export function stepGaitIndex(moving: boolean, speed: number, crouch: number): number {
  if (!moving) return 0;
  if (crouch > 0.5) return speed < CWALK_CRUN ? 4 : 5;
  return speed < WALK_JOG ? 1 : speed < JOG_RUN ? 2 : 3;
}

/** Top of each planner update: copy the gait's row into `STEP`. */
export function stepSelect(moving: boolean, speed: number, crouch: number): void {
  stepSelectRows(ROWS, moving, speed, crouch);
}

/**
 * (item 24, track A) `stepSelect` from another table of the same layout (`[gait * STEP_N + param]`): a guard's planner
 * reads the guards' table (`tuneGuard.ts` GUARD_STEP_ROWS), never Wren's rows. No allocation.
 */
export function stepSelectRows(rows: Float64Array, moving: boolean, speed: number, crouch: number): void {
  const g = stepGaitIndex(moving, speed, crouch);
  stepGaitNow = g;
  const o = g * STEP_N;
  for (let k = 0; k < STEP_N; k++) STEP[k] = rows[o + k]!;
}

/** The selected gait's stride multiplier at a pace: piecewise linear through its three points (exactly 1 at identity). */
export function stepStride(speed: number): number {
  const a = STEP[SP.stride0]!;
  const b = STEP[SP.stride1]!;
  const c = STEP[SP.stride2]!;
  if (a === b && b === c) return a;
  const lo = BAND_LO[stepGaitNow]!;
  const hi = BAND_HI[stepGaitNow]!;
  if (!(hi > lo)) return a;
  const u = (speed - lo) / (hi - lo);
  const t = u <= 0 ? 0 : u >= 1 ? 1 : u;
  return t < 0.5 ? a + (b - a) * t * 2 : b + (c - b) * (t * 2 - 1);
}

/** The tuner's value (the Stepping section's, before the base). */
export function stepGet(gait: number, p: number): number {
  return DELTA[gait * STEP_N + p]!;
}

/** Set the tuner's value; the planner's row gets base x value. */
export function stepSet(gait: number, p: number, v: number): void {
  const i = gait * STEP_N + p;
  DELTA[i] = v;
  ROWS[i] = BASE[i]! * v;
}

/** (anim-bake-all) The row value the planner reads (base x tuner). */
export function stepRowGet(gait: number, p: number): number {
  return ROWS[gait * STEP_N + p]!;
}

/** Every gait's tuner values back to identity (tests): the rows are the base again. */
export function stepResetAll(): void {
  DELTA.fill(1);
  ROWS.set(BASE);
  STEP.fill(1);
}

stepBaseSync();
TUNE_BASE_HOOKS.push(stepBaseSync);
