/**
 * (marlow-bays item 24, track A) Guard tuning: the guards' own tuner rows, kept apart from Wren's (pure, Babylon-free,
 * no DOM). Michael: "Wren rows never touch guards". Three sections, registered through the registry so the panel shows
 * them with plain labels and the save, export, import, presets and undo carry them (additive group ids):
 * - Guard joints `guard.joint.<row>`: per-joint rotation offsets (degrees, the Joints section's sliders and rules);
 * - Guard stepping `guard.step.<gait>`: the foot planner's stepping multipliers (the Stepping section's sliders);
 * - Guard weight `guard.weight.<row>`: the visual Weight layers (lean, plant load, springs, the start dip) on a guard.
 *   The momentum, landing, jump, gear and camera sliders stay Wren's (a guard's motion is its brain's, it never jumps).
 *
 * Rows: what a guard does (`guardRowOf`): idle, walk (patrol and alert walks), run (the dash), aim (raised, standing),
 * crouch (crouched, aimed or not), cover (back to a high wall). A traversal (a ladder) has no row (identity).
 *
 * Base and delta, as Wren's (`animBase.ts`): the generated guard base table `animBaseGuard.ts` (the bake writes it)
 * sits under the tuner's values. Effective = base composed with the delta: joint degrees add per axis (wrapped),
 * stepping and weight multipliers multiply, weight amounts add. Rebuilt on a change (`tuneGuardFrame`, once a frame:
 * a few hundred keyed compares, setters only on a real difference), never per rig.
 *
 * Every guard rig (`CharacterRig.guardRows`, set in `buildEnemyRig`: the host's guards and the co-op client's puppets
 * alike) reads these tables in its own window (`tuneGuardRig.ts`); no Wren rig ever reads them, and Wren's tables never
 * reach a guard (the guard's planner reads `GUARD_STEP_ROWS`, its joints window is opened on the guard table only).
 * Empty base and identity values: nothing is live, every guard's output is bit-identical to the untuned rig.
 * Gameplay reads nothing here beyond the posed rig (the guard's head is its perception eye, as with any pose).
 */
import { ANIM_BASE_GUARD, type AnimBaseGuardData } from './animBaseGuard';
import { TUNE_BANDS, type TunePoseIn } from './tune';
import { eulerQuat, J, JOINT_COUNT, JOINT_RANGE, JOINTS, MIRROR_OF, MIRROR_SIGN, wrapDeg, type Joint } from './tuneJoints';
import { JOINT_KEYS, tuneV2Mirror } from './tuneV2Sections';
import { registerTuneSection, TUNE_LOG, TUNE_STATE_BAG, type TuneTunable } from './tuneRegistry';
import { SP, STEP_GAITS, STEP_N, STEP_PARAMS, stepGaitIndex } from './tuneStep';
import { WEIGHT_TUNABLES, type WeightValues } from './weight';

/** What a guard does: the guard rows, in picker order. */
export const GUARD_ROWS = ['idle', 'walk', 'run', 'aim', 'crouch', 'cover'] as const;
export type GuardRow = (typeof GUARD_ROWS)[number];
const GR = GUARD_ROWS.length;
const ROW_INDEX = Object.fromEntries(GUARD_ROWS.map((r, i) => [r, i])) as Record<string, number>;

/** The pose fields the row pick reads (an enemy's `RigPose` fits). */
export interface GuardPoseIn extends TunePoseIn {
  dash?: number;
}

/**
 * The guard row of a pose (index into `GUARD_ROWS`; -1 none: a traversal or a held / bent pose). Cover first, then the
 * crouch, a raised aim, still, then the walk or the run (the dash, or a pace past the walk band).
 */
export function guardRowOf(p: GuardPoseIn): number {
  if ((p.traverse ?? 'none') !== 'none') return -1;
  if ((p.bend ?? 0) > 0 || (p.bendDrop ?? 0) > 0) return -1;
  if (p.wall) return 5;
  if (p.crouch > 0.5) return 4;
  if (p.aim > 0.5) return 3;
  if (p.speed < TUNE_BANDS.idle) return 0;
  return (p.dash ?? 0) > 0.5 || p.speed >= TUNE_BANDS.walk ? 2 : 1;
}

/** The section ids and their group ids. */
export const GUARD_SECTION_IDS = ['guardJoint', 'guardStep', 'guardWeight'] as const;
export const GUARD_JOINT_GROUPS: readonly string[] = GUARD_ROWS.map((r) => `guard.joint.${r}`);
export const GUARD_STEP_GROUPS: readonly string[] = STEP_GAITS.map((g) => `guard.step.${g}`);
export const GUARD_WEIGHT_GROUPS: readonly string[] = GUARD_ROWS.map((r) => `guard.weight.${r}`);
/** The Wren section each guard section mirrors (the panel's labels, targets and tabs). */
export const GUARD_SECTION_OF: Readonly<Record<string, string>> = { guardJoint: 'joint', guardStep: 'step', guardWeight: 'weight' };
/** The guard section of a Wren section ('' none). */
export const GUARD_FOR_SECTION: Readonly<Record<string, string>> = { joint: 'guardJoint', step: 'guardStep', weight: 'guardWeight' };

/** The Weight sliders a guard has (the visual layers; momentum, landing, jump, gear and camera stay Wren's). */
export const GUARD_WEIGHT_IDS: readonly string[] = ['accelLean', 'stopLean', 'bank', 'plantDrop', 'plantTimeMul', 'chestLag', 'chestHzMul', 'chestDampMul', 'headLag', 'headHzMul', 'headDampMul', 'armLag', 'armHzMul', 'armDampMul', 'antStart', 'antTimeMul'];

/**
 * The tuner's "Who": the panel's choice of whose rows it edits (Wren / Guard) and, in the Test Chamber, the guard puppet
 * whose row the guard sections follow (`rig`, null none). Panel and chamber only; no rig reads `who`.
 */
export const TUNE_WHO: { who: 'wren' | 'guard'; rig: unknown } = { who: 'wren', rig: null };

TUNE_STATE_BAG.guardJoint = '';
TUNE_STATE_BAG.guardStep = '';
TUNE_STATE_BAG.guardWeight = '';

// ------------------------------------------------------------------------------------------
// The sections
// ------------------------------------------------------------------------------------------

const AXIS_NAME = ['pitch', 'yaw', 'roll'] as const;
const jointSliders: TuneTunable[] = [];
for (let j = 0; j < JOINTS.length; j++)
  for (let a = 0; a < 3; a++)
    jointSliders.push({ id: JOINT_KEYS[j * 3 + a]!, label: `${JOINTS[j]} ${AXIS_NAME[a]}`, kind: 'add', def: 0, min: JOINT_RANGE.min, max: JOINT_RANGE.max, step: JOINT_RANGE.step, unit: 'deg', groups: GUARD_JOINT_GROUPS, hook: `characterRig jointOffsets (guard rigs only): ${JOINTS[j]} ${AXIS_NAME[a]}` });

export const GUARD_JOINT_SECTION = registerTuneSection({
  id: 'guardJoint',
  label: 'Guard joints',
  note: 'Every guard (never Wren): the guard base table plus these.',
  groups: GUARD_JOINT_GROUPS,
  tunables: jointSliders,
  select: (s) => s.guardJoint || null,
});

export const GUARD_STEP_SECTION = registerTuneSection({
  id: 'guardStep',
  label: 'Guard stepping',
  note: 'Every guard\'s feet (never Wren\'s).',
  groups: GUARD_STEP_GROUPS,
  tunables: STEP_PARAMS.map((p) => ({ id: p.id, label: p.label, kind: 'mul' as const, def: 1, min: p.min, max: p.max, step: p.step, unit: 'x', groups: GUARD_STEP_GROUPS, hook: `${p.hook} (guard planners only)` })),
  select: (s) => s.guardStep || null,
});

const WEIGHT_DEFS = WEIGHT_TUNABLES.filter((t) => GUARD_WEIGHT_IDS.includes(t.id));
export const GUARD_WEIGHT_SECTION = registerTuneSection({
  id: 'guardWeight',
  label: 'Guard weight',
  note: 'Every guard\'s pose (never Wren\'s): lean, step load, springs, the start dip.',
  groups: GUARD_WEIGHT_GROUPS,
  tunables: WEIGHT_DEFS.map((t) => ({ ...t, hook: `${t.hook} (guard rigs only)`, groups: GUARD_WEIGHT_GROUPS })),
  select: (s) => s.guardWeight || null,
});

// ------------------------------------------------------------------------------------------
// Joints: delta (the registry, copied in), base, effective quaternions
// ------------------------------------------------------------------------------------------

const DEG = new Float64Array(GR * JOINT_COUNT * 3);
const BASE = new Float64Array(GR * JOINT_COUNT * 3);
/** Effective offset quaternions (x y z w), [row][joint]. */
export const GUARD_QUAT = new Float64Array(GR * JOINT_COUNT * 4);
/** 1: the joint's effective offset (base + delta) is not identity. */
export const GUARD_ELIVE = new Uint8Array(GR * JOINT_COUNT);
for (let i = 0; i < GR * JOINT_COUNT; i++) GUARD_QUAT[i * 4 + 3] = 1;
/** Per row: any joint live (the rig's quick check). */
export const GUARD_ROW_LIVE = new Uint8Array(GR);
/** Bumped by every base load (each guard's applied offsets jump: no ease from the old table). */
export const GUARD_GEN = { joints: 0 };

const D2R = Math.PI / 180;

function rebuildJoint(slot: number): void {
  const d = slot * 3;
  const x = wrapDeg(BASE[d]! + DEG[d]!);
  const y = wrapDeg(BASE[d + 1]! + DEG[d + 1]!);
  const z = wrapDeg(BASE[d + 2]! + DEG[d + 2]!);
  GUARD_ELIVE[slot] = x !== 0 || y !== 0 || z !== 0 ? 1 : 0;
  eulerQuat(x * D2R, y * D2R, z * D2R, GUARD_QUAT, slot * 4);
}

function rowLiveUpdate(r: number): void {
  const b = r * JOINT_COUNT;
  let on = 0;
  for (let j = 0; j < JOINT_COUNT; j++) if (GUARD_ELIVE[b + j] === 1) on = 1;
  GUARD_ROW_LIVE[r] = on;
}

/** The delta's value of one axis (degrees; the table as last copied from the registry). */
export function guardJointGet(row: string, joint: number, axis: number): number {
  const r = ROW_INDEX[row];
  return r === undefined ? Number.NaN : DEG[(r * JOINT_COUNT + joint) * 3 + axis]!;
}

/** The effective value of one axis (base + delta, wrapped; degrees): what every guard applies. */
export function guardJointEffective(row: string, joint: number, axis: number): number {
  const r = ROW_INDEX[row];
  if (r === undefined) return Number.NaN;
  const d = (r * JOINT_COUNT + joint) * 3 + axis;
  return wrapDeg(BASE[d]! + DEG[d]!);
}

/** One guard row's joints: registry -> table (with Wren's mirror lock on, a one-sided edit writes the partner mirrored). */
function syncJointRow(r: number): void {
  const group = GUARD_JOINT_GROUPS[r]!;
  const vals = GUARD_JOINT_SECTION.values[group] as Record<string, number>;
  const mirror = tuneV2Mirror();
  let ch = false;
  for (let j = 0; j < JOINT_COUNT; j++) {
    const m = MIRROR_OF[j]!;
    for (let a = 0; a < 3; a++) {
      const k = j * 3 + a;
      const v = vals[JOINT_KEYS[k]!]!;
      const d = (r * JOINT_COUNT + j) * 3 + a;
      if (v === DEG[d]) continue;
      DEG[d] = v;
      rebuildJoint(r * JOINT_COUNT + j);
      ch = true;
      if (!mirror || m === j) continue;
      const mk = JOINT_KEYS[m * 3 + a]!;
      const md = (r * JOINT_COUNT + m) * 3 + a;
      if (vals[mk] !== DEG[md]) continue; // the partner changed too (a load, a reset): copied as is
      const last = TUNE_LOG[TUNE_LOG.length - 1];
      if (!last || last.group !== group || last.id !== JOINT_KEYS[k] || last.to !== v) continue;
      const pv = v * MIRROR_SIGN[a]! + 0;
      DEG[md] = pv;
      vals[mk] = pv;
      rebuildJoint(r * JOINT_COUNT + m);
    }
  }
  if (ch) rowLiveUpdate(r);
}

// ------------------------------------------------------------------------------------------
// Stepping: the guards' planner table (base x delta)
// ------------------------------------------------------------------------------------------

const SG = STEP_GAITS.length;
/** `[gait * STEP_N + param]`: what every guard's planner reads (`FootPlanner.stepRows`); all 1 = identity. */
export const GUARD_STEP_ROWS = new Float64Array(SG * STEP_N).fill(1);
const STEP_DELTA = new Float64Array(SG * STEP_N).fill(1);
const STEP_BASE = new Float64Array(SG * STEP_N).fill(1);
const STEP_KEYS: readonly string[] = STEP_PARAMS.map((p) => p.id);
const STEP_IDX: readonly number[] = STEP_PARAMS.map((p) => SP[p.id]);

function syncStep(): void {
  for (let g = 0; g < SG; g++) {
    const vals = GUARD_STEP_SECTION.values[GUARD_STEP_GROUPS[g]!] as Record<string, number>;
    for (let k = 0; k < STEP_KEYS.length; k++) {
      const v = vals[STEP_KEYS[k]!]!;
      const o = g * STEP_N + STEP_IDX[k]!;
      if (v === STEP_DELTA[o]) continue;
      STEP_DELTA[o] = v;
      GUARD_STEP_ROWS[o] = STEP_BASE[o]! * v;
    }
  }
}

/** One gait's effective stepping multiplier (base x delta). */
export function guardStepGet(gait: string, param: string): number {
  const g = (STEP_GAITS as readonly string[]).indexOf(gait);
  const p = (SP as Record<string, number>)[param];
  return g < 0 || p === undefined ? Number.NaN : GUARD_STEP_ROWS[g * STEP_N + p]!;
}

// ------------------------------------------------------------------------------------------
// Weight: per row, the full values object the layers read (guard sliders composed, the rest at identity)
// ------------------------------------------------------------------------------------------

const WEIGHT_KIND = new Map(WEIGHT_TUNABLES.map((t) => [t.id, t.kind]));
const identityWeight = (): WeightValues => {
  const o: Record<string, number> = {};
  for (const t of WEIGHT_TUNABLES) o[t.id] = t.def;
  return o as WeightValues;
};
/** The identity values (never written). */
export const GUARD_WEIGHT_IDENTITY: Readonly<WeightValues> = Object.freeze(identityWeight());
/** Per row: the effective values (base composed with the delta). */
export const GUARD_WEIGHT_EFF: readonly WeightValues[] = GUARD_ROWS.map(() => identityWeight());
const WEIGHT_BASE_V: WeightValues[] = GUARD_ROWS.map(() => identityWeight());
/** Any row has an effective weight value off identity (the rigs' quick check). */
export const GUARD_WEIGHT_LIVE = { on: false };

const compose = (id: string, base: number, delta: number): number => (WEIGHT_KIND.get(id) === 'mul' ? base * delta : base + delta);

function weightLiveUpdate(): void {
  let on = false;
  for (let r = 0; r < GR && !on; r++) {
    const e = GUARD_WEIGHT_EFF[r]! as Record<string, number>;
    for (let k = 0; k < GUARD_WEIGHT_IDS.length; k++) {
      const id = GUARD_WEIGHT_IDS[k]!;
      if (e[id] !== (GUARD_WEIGHT_IDENTITY as Record<string, number>)[id]) {
        on = true;
        break;
      }
    }
  }
  GUARD_WEIGHT_LIVE.on = on;
}

const WEIGHT_DELTA: Record<string, number>[] = GUARD_ROWS.map(() => ({ ...(identityWeight() as Record<string, number>) }));

function syncWeight(): void {
  let ch = false;
  for (let r = 0; r < GR; r++) {
    const vals = GUARD_WEIGHT_SECTION.values[GUARD_WEIGHT_GROUPS[r]!] as Record<string, number>;
    const dl = WEIGHT_DELTA[r]!;
    const eff = GUARD_WEIGHT_EFF[r]! as Record<string, number>;
    const base = WEIGHT_BASE_V[r]! as Record<string, number>;
    for (let k = 0; k < GUARD_WEIGHT_IDS.length; k++) {
      const id = GUARD_WEIGHT_IDS[k]!;
      const v = vals[id]!;
      if (v === dl[id]) continue;
      dl[id] = v;
      eff[id] = compose(id, base[id]!, v);
      ch = true;
    }
  }
  if (ch) weightLiveUpdate();
}

// ------------------------------------------------------------------------------------------
// The frame step and the base table
// ------------------------------------------------------------------------------------------

/**
 * Once a frame (player.ts, beside `tuneV2Frame`): the registry's guard values into the guard tables where they differ
 * (every row: about 540 keyed compares; setters only on a real difference). No allocation.
 */
export function tuneGuardFrame(): void {
  for (let r = 0; r < GR; r++) syncJointRow(r);
  syncStep();
  syncWeight();
}

/** Every effective value rebuilt from base and delta (after a base load; not hot). */
function rebuildAll(): void {
  for (let i = 0; i < GR * JOINT_COUNT; i++) rebuildJoint(i);
  for (let r = 0; r < GR; r++) rowLiveUpdate(r);
  for (let i = 0; i < GUARD_STEP_ROWS.length; i++) GUARD_STEP_ROWS[i] = STEP_BASE[i]! * STEP_DELTA[i]!;
  for (let r = 0; r < GR; r++) {
    const eff = GUARD_WEIGHT_EFF[r]! as Record<string, number>;
    const base = WEIGHT_BASE_V[r]! as Record<string, number>;
    const dl = WEIGHT_DELTA[r]!;
    for (const id of GUARD_WEIGHT_IDS) eff[id] = compose(id, base[id]!, dl[id]!);
  }
  weightLiveUpdate();
  GUARD_GEN.joints++;
}

const cloneBase = (b: AnimBaseGuardData): AnimBaseGuardData => JSON.parse(JSON.stringify(b)) as AnimBaseGuardData;
let baseNow: AnimBaseGuardData = cloneBase(ANIM_BASE_GUARD);

/**
 * Load a guard base table (every guard jumps to it). Unknown rows, joints, gaits and params are skipped and returned
 * (`joints.<row>`, `joints.<row>.<joint>`, `step.<gait>.<param>`, `weight.<row>.<id>`).
 */
export function guardBaseLoad(b: AnimBaseGuardData): string[] {
  baseNow = cloneBase(b);
  const unknown: string[] = [];
  BASE.fill(0);
  STEP_BASE.fill(1);
  for (const w of WEIGHT_BASE_V) Object.assign(w, GUARD_WEIGHT_IDENTITY);
  const joints = baseNow.joints && typeof baseNow.joints === 'object' ? baseNow.joints : {};
  for (const [rName, row] of Object.entries(joints)) {
    const r = ROW_INDEX[rName];
    if (r === undefined || !row || typeof row !== 'object') {
      unknown.push(`joints.${rName}`);
      continue;
    }
    for (const [jName, v] of Object.entries(row)) {
      const j = (J as Record<string, number | undefined>)[jName];
      if (j === undefined || !Array.isArray(v)) {
        unknown.push(`joints.${rName}.${jName}`);
        continue;
      }
      for (let a = 0; a < 3; a++) {
        const n: unknown = v[a];
        if (typeof n === 'number' && Number.isFinite(n)) BASE[(r * JOINT_COUNT + j) * 3 + a] = wrapDeg(n);
      }
    }
  }
  const step = baseNow.step && typeof baseNow.step === 'object' ? baseNow.step : {};
  for (const [gName, row] of Object.entries(step)) {
    const g = (STEP_GAITS as readonly string[]).indexOf(gName);
    for (const [p, v] of Object.entries(row ?? {})) {
      const pi = (SP as Record<string, number>)[p];
      if (g < 0 || pi === undefined || typeof v !== 'number' || !Number.isFinite(v)) {
        unknown.push(`step.${gName}.${p}`);
        continue;
      }
      STEP_BASE[g * STEP_N + pi] = v;
    }
  }
  const weight = baseNow.weight && typeof baseNow.weight === 'object' ? baseNow.weight : {};
  for (const [rName, row] of Object.entries(weight)) {
    const r = ROW_INDEX[rName];
    for (const [id, v] of Object.entries(row ?? {})) {
      if (r === undefined || !GUARD_WEIGHT_IDS.includes(id) || typeof v !== 'number' || !Number.isFinite(v)) {
        unknown.push(`weight.${rName}.${id}`);
        continue;
      }
      (WEIGHT_BASE_V[r]! as Record<string, number>)[id] = v;
    }
  }
  rebuildAll();
  return unknown;
}

/** The guard base table in use (a copy). */
export function guardBaseNow(): AnimBaseGuardData {
  return cloneBase(baseNow);
}

/** Every guard table back to identity and the generated base (tests). */
export function guardTuneResetTables(): void {
  DEG.fill(0);
  STEP_DELTA.fill(1);
  for (const d of WEIGHT_DELTA) Object.assign(d, GUARD_WEIGHT_IDENTITY);
  guardBaseLoad(ANIM_BASE_GUARD);
}

/** The guard row's index by name (-1 unknown). */
export function guardRowIndex(row: string): number {
  return ROW_INDEX[row] ?? -1;
}

/** The step gait index a guard pose would pick (the follow; the planner picks its own from its input). */
export function guardStepGaitOf(p: GuardPoseIn): number {
  return stepGaitIndex(p.speed > 0.05, p.speed, p.crouch);
}

{
  const bad = guardBaseLoad(ANIM_BASE_GUARD);
  if (bad.length) console.warn(`animBaseGuard: unknown rows / joints / params skipped: ${bad.join(', ')}`);
}

// the e2e reads and sets the guard tables through this (dev / test hook; no game code reads it)
if (typeof window !== 'undefined') {
  (window as unknown as { __guardTune: unknown }).__guardTune = {
    rows: GUARD_ROWS,
    who: () => TUNE_WHO.who,
    /** The Test Chamber's guard puppet rig (null none). */
    puppet: () => TUNE_WHO.rig,
    jointEffective: (row: string, joint: string, axis: number) => guardJointEffective(row, J[joint as Joint] ?? -1, axis),
    stepGet: guardStepGet,
    weightLive: () => GUARD_WEIGHT_LIVE.on,
    base: guardBaseNow,
    load: guardBaseLoad,
    reset: (): string[] => guardBaseLoad(ANIM_BASE_GUARD),
  };
}
