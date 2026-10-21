/**
 * (tuner-v2 wiring) The tuner-v2 sections of the animation tuner, registered through the section registry: Joints
 * (item 1), Hands & feet, IK strength and Weapon (item 2), Stepping (item 3, the `tuneStep` table). The registry's values are the source the panel edits, saves
 * and exports; once per frame `tuneV2Frame` copies the active state's (and weapon's) values into the item 1-2 tables
 * (`tuneJoints`, `tuneHands`) where they differ. Pure, Babylon-free; the frame step allocates nothing.
 *
 * Group ids: `joint.<state>` plus `joint.options` (the mirror lock), `hand.<weapon>.<state>`, `ik.<state>`,
 * `weapon.<weapon>.<state>`, `step.<gait>`. The follow keys of `TUNE_STATE_BAG`: `joint`, `hand`, `ik`, `weapon`, `step`.
 */
import { BODY_GROUPS, type BodyGroup } from './tune';
import { HAND_PARAMS, HAND_WEAPONS, HP, handsGet, handsSet, ikGet, ikSet, IK_LIMBS, IK_RANGE, type HandWeapon, type IkLimb } from './tuneHands';
import { J, JOINTS, JOINT_RANGE, JOINT_ROWS, MIRROR_OF, MIRROR_SIGN, jointsGet, jointsMirror, jointsSet, type JointAxis } from './tuneJoints';
import { registerTuneSection, TUNE_LOG, TUNE_STATE_BAG, type TuneTunable } from './tuneRegistry';
import { SP, STEP_GAITS, STEP_PARAMS, stepGet, stepSet, type StepGait } from './tuneStep';

const AXIS_NAME = ['pitch', 'yaw', 'roll'] as const;
const AXIS_ID = ['x', 'y', 'z'] as const;

/** Joint slider ids, index `joint * 3 + axis` (e.g. `elbowR_x`). */
export const JOINT_KEYS: readonly string[] = JOINTS.flatMap((j) => AXIS_ID.map((a) => `${j}_${a}`));
/** (marlow-bays T1a) Every Joints row: the body states (`joint.<state>`), then the per-gun armed rows (`joint.rifle.aim`). */
export const JOINT_GROUP_IDS: readonly string[] = JOINT_ROWS.map((g) => `joint.${g}`);
/** (T1a) The Joints row index per weapon x body state: the gun's own row for an armed state with a rifle or pistol. */
const JOINT_ROW_OF: readonly (readonly number[])[] = HAND_WEAPONS.map((w) =>
  BODY_GROUPS.map((b, gi) => {
    const r = JOINT_ROWS.indexOf(`${w}.${b}`);
    return r >= 0 ? r : gi;
  }),
);
let jointRowNow = '';
export const JOINT_OPTIONS = 'joint.options';
export const IK_GROUP_IDS: readonly string[] = BODY_GROUPS.map((g) => `ik.${g}`);
/** `[weapon][state]` group ids. */
export const HAND_GROUP_IDS: readonly (readonly string[])[] = HAND_WEAPONS.map((w) => BODY_GROUPS.map((g) => `hand.${w}.${g}`));
export const WEAPON_GROUP_IDS: readonly (readonly string[])[] = HAND_WEAPONS.map((w) => BODY_GROUPS.map((g) => `weapon.${w}.${g}`));

const jointSliders: TuneTunable[] = [];
for (let j = 0; j < JOINTS.length; j++)
  for (let a = 0; a < 3; a++)
    jointSliders.push({ id: JOINT_KEYS[j * 3 + a]!, label: `${JOINTS[j]} ${AXIS_NAME[a]}`, kind: 'add', def: 0, min: JOINT_RANGE.min, max: JOINT_RANGE.max, step: JOINT_RANGE.step, unit: 'deg', groups: JOINT_GROUP_IDS, hook: `characterRig jointOffsets: ${JOINTS[j]} ${AXIS_NAME[a]}` });
jointSliders.push({ id: 'mirror', label: 'mirror lock L / R (0 off, 1 on)', kind: 'add', def: 0, min: 0, max: 1, step: 1, unit: '', groups: [JOINT_OPTIONS], hook: 'tuneJoints: an L / R edit writes the partner mirrored' });

export const JOINT_SECTION = registerTuneSection({
  id: 'joint',
  label: 'Joints',
  groups: [...JOINT_GROUP_IDS, JOINT_OPTIONS],
  tunables: jointSliders,
  select: (s) => s.joint || null,
});

const handSlider = (p: (typeof HAND_PARAMS)[number], groups: readonly string[]): TuneTunable => ({
  id: p.id,
  label: p.label,
  kind: p.def === 1 ? 'mul' : 'add',
  def: p.def,
  min: p.min,
  max: p.max,
  step: p.step,
  unit: p.unit === 'mode' || p.unit === 'curl' ? '' : p.unit,
  groups,
  hook: `tuneHands ${p.id}`,
});
const handGroups = HAND_GROUP_IDS.flat();
const weaponGroups = WEAPON_GROUP_IDS.flat();
const placeParams = HAND_PARAMS.filter((p) => p.section === 'place');
const weaponParams = HAND_PARAMS.filter((p) => p.section !== 'place');

export const HAND_SECTION = registerTuneSection({
  id: 'hand',
  label: 'Hands & feet',
  groups: handGroups,
  tunables: placeParams.map((p) => handSlider(p, handGroups)),
  select: (s) => s.hand || null,
});

export const IK_SECTION = registerTuneSection({
  id: 'ik',
  label: 'IK strength',
  groups: IK_GROUP_IDS,
  tunables: IK_LIMBS.map((l) => ({ id: l, label: `${l} IK strength (0 = FK: rest + joint offsets)`, kind: 'mul' as const, def: IK_RANGE.def, min: IK_RANGE.min, max: IK_RANGE.max, step: IK_RANGE.step, unit: 'x', groups: IK_GROUP_IDS, hook: `characterRig ikStrengthLimbs: ${l}` })),
  select: (s) => s.ik || null,
});

export const WEAPON_SECTION = registerTuneSection({
  id: 'weapon',
  label: 'Weapon',
  groups: weaponGroups,
  tunables: weaponParams.map((p) => handSlider(p, weaponGroups)),
  select: (s) => s.weapon || null,
});

/** (item 3) Stepping: `step.<gait>` (tuneStep's gaits), multipliers on the foot planner's stepping values, default 1. */
export const STEP_GROUP_IDS: readonly string[] = STEP_GAITS.map((g) => `step.${g}`);
export const STEP_SECTION = registerTuneSection({
  id: 'step',
  label: 'Stepping',
  groups: STEP_GROUP_IDS,
  tunables: STEP_PARAMS.map((p) => ({ id: p.id, label: p.label, kind: 'mul' as const, def: 1, min: p.min, max: p.max, step: p.step, unit: 'x', groups: STEP_GROUP_IDS, hook: p.hook })),
  select: (s) => s.step || null,
});
const STEP_KEYS: readonly string[] = STEP_PARAMS.map((p) => p.id);
const STEP_IDX: readonly number[] = STEP_PARAMS.map((p) => SP[p.id]);
/** The follow group per body state (the planner picks its gait by pace; these are the states that name one). */
const STEP_OF_BODY: Partial<Record<BodyGroup, StepGait>> = { idle: 'idle', crouchIdle: 'idle', walk: 'walk', jog: 'jog', run: 'run', sneak: 'crouchWalk', crouchWalk: 'crouchWalk', crouchRun: 'crouchRun' };
const STEP_FOLLOW: readonly string[] = BODY_GROUPS.map((b) => {
  const g = STEP_OF_BODY[b];
  return g ? `step.${g}` : '';
});

/** Registry -> tuneStep table, every gait, where they differ (60 compares, no allocation). */
function syncStep(): void {
  for (let g = 0; g < STEP_GROUP_IDS.length; g++) {
    const vals = STEP_SECTION.values[STEP_GROUP_IDS[g]!] as Record<string, number>;
    for (let k = 0; k < STEP_KEYS.length; k++) {
      const v = vals[STEP_KEYS[k]!]!;
      if (v !== stepGet(g, STEP_IDX[k]!)) stepSet(g, STEP_IDX[k]!, v);
    }
  }
}

const PLACE_IDX: readonly number[] = placeParams.map((p) => HP[p.id]!);
const PLACE_KEYS: readonly string[] = placeParams.map((p) => p.id);
const WEAPON_IDX: readonly number[] = weaponParams.map((p) => HP[p.id]!);
const WEAPON_KEYS: readonly string[] = weaponParams.map((p) => p.id);

TUNE_STATE_BAG.joint = '';
TUNE_STATE_BAG.hand = '';
TUNE_STATE_BAG.ik = '';
TUNE_STATE_BAG.weapon = '';
TUNE_STATE_BAG.step = '';

/** The registry's mirror lock (item 1's own flag stays off: this sync does the mirroring). */
export function tuneV2Mirror(): boolean {
  return (JOINT_SECTION.values[JOINT_OPTIONS]!.mirror ?? 0) >= 0.5;
}

/**
 * One state's joint row: registry -> table. With the mirror lock on, a panel edit of one side of an L / R pair (the
 * change log's last entry, the partner untouched) gives the partner the mirrored value in the table and the registry
 * (no log entry of its own, so a drag stays one entry); a load or a group reset is copied as is.
 */
function syncJoints(b: string, gi: number): void {
  const group = JOINT_GROUP_IDS[gi]!;
  const vals = JOINT_SECTION.values[group] as Record<string, number>;
  const mirror = tuneV2Mirror();
  for (let j = 0; j < JOINTS.length; j++) {
    const m = MIRROR_OF[j]!;
    for (let a = 0 as JointAxis; a < 3; a = (a + 1) as JointAxis) {
      const k = j * 3 + a;
      const v = vals[JOINT_KEYS[k]!]!;
      if (v === jointsGet(b, j, a)) continue;
      jointsSet(b, j, a, v);
      if (!mirror || m === j) continue;
      const mk = JOINT_KEYS[m * 3 + a]!;
      if (vals[mk] !== jointsGet(b, m, a)) continue; // the partner changed too (a load, a reset): copy as is
      const last = TUNE_LOG[TUNE_LOG.length - 1];
      if (!last || last.group !== group || last.id !== JOINT_KEYS[k] || last.to !== v) continue;
      const pv = v * MIRROR_SIGN[a]! + 0;
      jointsSet(b, m, a, pv);
      vals[mk] = pv;
    }
  }
}

function syncHandRow(w: HandWeapon, b: BodyGroup, vals: Record<string, number>, keys: readonly string[], idx: readonly number[]): void {
  for (let i = 0; i < keys.length; i++) {
    const v = vals[keys[i]!]!;
    const p = idx[i]!;
    if (v !== handsGet(w, b, p)) handsSet(w, b, p, v);
  }
}

/**
 * Once per frame, for the local player before `jointsBegin` / `handsBegin`: write the follow keys and copy the active
 * state's (and weapon's) registry values into the item 1-2 tables where they differ. No allocation.
 */
export function tuneV2Frame(body: BodyGroup | '', weapon: HandWeapon): void {
  const gi = body === '' ? -1 : BODY_GROUPS.indexOf(body);
  const wi = HAND_WEAPONS.indexOf(weapon);
  syncStep();
  TUNE_STATE_BAG.step = gi < 0 ? '' : STEP_FOLLOW[gi]!;
  if (gi < 0 || wi < 0) {
    jointRowNow = '';
    TUNE_STATE_BAG.joint = TUNE_STATE_BAG.hand = TUNE_STATE_BAG.ik = TUNE_STATE_BAG.weapon = '';
    return;
  }
  const b = body as BodyGroup;
  // (T1a) a rifle or pistol in an armed state: the gun's own Joints row
  const ri = JOINT_ROW_OF[wi]![gi]!;
  jointRowNow = JOINT_ROWS[ri]!;
  TUNE_STATE_BAG.joint = JOINT_GROUP_IDS[ri]!;
  TUNE_STATE_BAG.ik = IK_GROUP_IDS[gi]!;
  const hg = HAND_GROUP_IDS[wi]![gi]!;
  const wg = WEAPON_GROUP_IDS[wi]![gi]!;
  TUNE_STATE_BAG.hand = hg;
  TUNE_STATE_BAG.weapon = wg;
  if (jointsMirror()) jointsMirror(false);
  syncJoints(jointRowNow, ri);
  syncHandRow(weapon, b, HAND_SECTION.values[hg] as Record<string, number>, PLACE_KEYS, PLACE_IDX);
  syncHandRow(weapon, b, WEAPON_SECTION.values[wg] as Record<string, number>, WEAPON_KEYS, WEAPON_IDX);
  const ik = IK_SECTION.values[IK_GROUP_IDS[gi]!] as Record<string, number>;
  for (let l = 0 as IkLimb; l < 4; l = (l + 1) as IkLimb) {
    const v = ik[IK_LIMBS[l]]!;
    if (v !== ikGet(b, l)) ikSet(b, l, v);
  }
}

/** Every state and weapon at once (tests; not hot). */
export function tuneV2SyncAll(): void {
  for (const w of HAND_WEAPONS) for (const b of BODY_GROUPS) tuneV2Frame(b, w);
}

// the e2e reads the tables through this (dev / test hook, no game code reads it)
if (typeof window !== 'undefined') {
  (window as unknown as { __tuneV2: unknown }).__tuneV2 = { jointsGet, handsGet, ikGet, J, HP, mirror: tuneV2Mirror };
}

/** (marlow-bays T1a) The Joints row `tuneV2Frame` picked last ('' none): the body state, or the gun's armed row. */
export function tuneV2JointRow(): string {
  return jointRowNow;
}
