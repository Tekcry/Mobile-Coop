/**
 * (tuner-v2 wiring) The tuner-v2 sections of the animation tuner, registered through the section registry: Joints
 * (item 1), Hands & feet, IK strength and Weapon (item 2), Stepping (item 3, the `tuneStep` table). The registry's values are the source the panel edits, saves
 * and exports; once per frame `tuneV2Frame` copies the active state's (and weapon's) values into the item 1-2 tables
 * (`tuneJoints`, `tuneHands`) where they differ. Pure, Babylon-free; the frame step allocates nothing.
 *
 * Group ids: `joint.<state>` plus `joint.options` (the mirror lock), `hand.<weapon>.<state>`, `ik.<state>`,
 * `weapon.<weapon>.<state>`, `step.<gait>`. The follow keys of `TUNE_STATE_BAG`: `joint`, `hand`, `ik`, `weapon`, `step`.
 * (anim-joints J2) `<state>` is any row of `TUNE_ROW_IDS` (`tuneMoveRows.ts`): the body states, then the move rows
 * (`joint.trav.vault`, `hand.rifle.team.boost.b`) and the action rows (`joint.reload`, `ik.air`, `weapon.pistol.throw`).
 * (anim-gear) Gear (`gear.<socket>`, `gear.<socket>.crouch`) registers last; every row is copied each frame.
 */
import { BODY_GROUPS, type BodyGroup } from './tune';
import { HAND_PARAMS, HAND_WEAPONS, HP, handsGet, handsSet, ikGet, ikSet, IK_LIMBS, IK_RANGE, type HandWeapon, type IkLimb } from './tuneHands';
import { J, JOINTS, JOINT_RANGE, JOINT_ROWS, MIRROR_OF, MIRROR_SIGN, jointsGet, jointsMirror, jointsSet, type JointAxis } from './tuneJoints';
import { TUNE_MOVE_MAX, TUNE_ROW_IDS, tuneRowFollow, type TuneRowPick } from './tuneMoveRows';
import { registerTuneSection, TUNE_LOG, TUNE_STATE_BAG, type TuneTunable } from './tuneRegistry';
import { SP, STEP_GAITS, STEP_PARAMS, stepGet, stepSet, type StepGait } from './tuneStep';
import { GEAR_PARAMS, GEAR_RANGE_DEG, GEAR_RANGE_M, GEAR_ROWS, gearGet, gearSet } from './tuneGear';

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
/** (anim-joints J2) The IK, Hands & feet and Weapon rows: the body states, then the move and action rows (`TUNE_ROW_IDS`). */
export const IK_GROUP_IDS: readonly string[] = TUNE_ROW_IDS.map((g) => `ik.${g}`);
/** `[weapon][state]` group ids. */
export const HAND_GROUP_IDS: readonly (readonly string[])[] = HAND_WEAPONS.map((w) => TUNE_ROW_IDS.map((g) => `hand.${w}.${g}`));
export const WEAPON_GROUP_IDS: readonly (readonly string[])[] = HAND_WEAPONS.map((w) => TUNE_ROW_IDS.map((g) => `weapon.${w}.${g}`));

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

/**
 * (anim-gear, G-A1) Gear: `gear.<socket>` (holster, backL, backC, backR, slingHip; (anim-goggle) goggles, the worn
 * goggle in the head frame) and the crouched variant `gear.<socket>.crouch` (applied over the standing one by the rig's
 * crouch amount); x / y / z (m) and pitch / yaw / roll (deg) in the socket's own frame, identity 0 (`tuneGear.ts`).
 * Deltas on the base table's `gear` key; every Wren rig reads them. No follow (the picker stays where it is put).
 */
export const GEAR_GROUP_IDS: readonly string[] = GEAR_ROWS.map((r) => `gear.${r}`);
export const GEAR_SECTION = registerTuneSection({
  id: 'gear',
  label: 'Gear',
  note: 'Worn gear per socket (visual only): x / y / z in the socket frame, turns about its pivot; .crouch adds by the crouch amount',
  groups: GEAR_GROUP_IDS,
  tunables: GEAR_PARAMS.map((p) => {
    const r = p.unit === 'm' ? GEAR_RANGE_M : GEAR_RANGE_DEG;
    return { id: p.id, label: p.label, kind: 'add' as const, def: 0, min: r.min, max: r.max, step: r.step, unit: p.unit, groups: GEAR_GROUP_IDS, hook: `tuneGear ${p.id} (the socket's offset on every Wren rig)` };
  }),
});
const GEAR_KEYS: readonly string[] = GEAR_PARAMS.map((p) => p.id);

/** (anim-gear) Registry -> Gear delta table, every row (72 keyed reads; setters only on a real difference). */
function syncGear(): void {
  for (let g = 0; g < GEAR_ROWS.length; g++) {
    const row = GEAR_ROWS[g]!;
    const vals = GEAR_SECTION.values[GEAR_GROUP_IDS[g]!] as Record<string, number>;
    for (let k = 0; k < GEAR_KEYS.length; k++) {
      const v = vals[GEAR_KEYS[k]!]!;
      if (v !== gearGet(row, k)) gearSet(row, k, v);
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

function syncHandRow(w: HandWeapon, b: string, vals: Record<string, number>, keys: readonly string[], idx: readonly number[]): void {
  for (let i = 0; i < keys.length; i++) {
    const v = vals[keys[i]!]!;
    const p = idx[i]!;
    if (v !== handsGet(w, b, p)) handsSet(w, b, p, v);
  }
}

/** One (weapon, row) Hands & feet and Weapon row: registry -> table (`gi` an index into `TUNE_ROW_IDS`). */
function syncHands(wi: number, gi: number): void {
  const wn = HAND_WEAPONS[wi]!;
  const b = TUNE_ROW_IDS[gi]!;
  syncHandRow(wn, b, HAND_SECTION.values[HAND_GROUP_IDS[wi]![gi]!] as Record<string, number>, PLACE_KEYS, PLACE_IDX);
  syncHandRow(wn, b, WEAPON_SECTION.values[WEAPON_GROUP_IDS[wi]![gi]!] as Record<string, number>, WEAPON_KEYS, WEAPON_IDX);
}

/** (anim-joints J2) `TUNE_ROW_IDS` index -> Joints row index (a body state's own row; the move rows by name). */
const JOINT_OF_ROW: readonly number[] = TUNE_ROW_IDS.map((r) => JOINT_ROWS.indexOf(r));

/** (anim-joints J1) The round-robin cursors of `syncBackground`. */
let bgJoint = 0;
let bgHand = 0;
let bgIk = 0;
const ROWS = TUNE_ROW_IDS.length;
const BG_HAND_ROWS = HAND_WEAPONS.length * ROWS;
/** (J2) Rows copied per frame: every Joints row within ~23 frames, every Hands & feet + Weapon row within ~25, IK ~20. */
const BG_JOINTS = 3;
const BG_HANDS = 12;
const BG_IK = 3;

/**
 * (anim-joints J1, A2) Every Wren rig reads the tables, not only the local player in its active row: each frame a few
 * more rows are copied registry -> table (J2, with the move and action rows: 3 Joints rows, 12 Hands & feet + Weapon
 * rows, 3 IK rows; every row within about 0.4 s; a few hundred keyed reads, setters only on a real difference), so the
 * partner and the chamber puppets in another state see a panel edit too. No allocation.
 */
function syncBackground(): void {
  for (let n = 0; n < BG_JOINTS; n++) {
    const ri = bgJoint;
    bgJoint = (bgJoint + 1) % JOINT_ROWS.length;
    syncJoints(JOINT_ROWS[ri]!, ri);
  }
  for (let n = 0; n < BG_HANDS; n++) {
    const r = bgHand;
    bgHand = (bgHand + 1) % BG_HAND_ROWS;
    const w = Math.floor(r / ROWS);
    syncHands(w, r - w * ROWS);
  }
  for (let n = 0; n < BG_IK; n++) {
    const g = bgIk;
    bgIk = (bgIk + 1) % ROWS;
    syncIk(g);
  }
}

/** One row's IK strengths: registry -> table (`gi` an index into `TUNE_ROW_IDS`). */
function syncIk(gi: number): void {
  const b = TUNE_ROW_IDS[gi]!;
  const ik = IK_SECTION.values[IK_GROUP_IDS[gi]!] as Record<string, number>;
  for (let l = 0 as IkLimb; l < 4; l = (l + 1) as IkLimb) {
    const v = ik[IK_LIMBS[l]]!;
    if (v !== ikGet(b, l)) ikSet(b, l, v);
  }
}

/**
 * Once per frame, for the local player before its `rig.animate`: write the follow keys and copy the active state's (and
 * weapon's) registry values into the item 1-2 tables where they differ, plus a few background rows (`syncBackground`).
 * (anim-joints J1) Every Wren rig then reads the tables inside its own `animate` (`tuneJointsRig.ts`).
 * (anim-joints J2) `pick`: the local rig's move / action rows (its `TuneRigState.pick`, last frame's): they are copied
 * every frame too, and the follow keys show the strongest one while its weight is 0.5 or more (A5), else the stance's.
 * No allocation.
 */
export function tuneV2Frame(body: BodyGroup | '', weapon: HandWeapon, pick: TuneRowPick | null = null): void {
  const gi = body === '' ? -1 : BODY_GROUPS.indexOf(body);
  const wi = HAND_WEAPONS.indexOf(weapon);
  syncStep();
  syncGear();
  TUNE_STATE_BAG.step = gi < 0 ? '' : STEP_FOLLOW[gi]!;
  if (jointsMirror()) jointsMirror(false);
  jointRowNow = '';
  TUNE_STATE_BAG.joint = TUNE_STATE_BAG.hand = TUNE_STATE_BAG.ik = TUNE_STATE_BAG.weapon = '';
  if (gi >= 0 && wi >= 0) {
    // (T1a) a rifle or pistol in an armed state: the gun's own Joints row
    const ri = JOINT_ROW_OF[wi]![gi]!;
    jointRowNow = JOINT_ROWS[ri]!;
    TUNE_STATE_BAG.joint = JOINT_GROUP_IDS[ri]!;
    TUNE_STATE_BAG.ik = IK_GROUP_IDS[gi]!;
    TUNE_STATE_BAG.hand = HAND_GROUP_IDS[wi]![gi]!;
    TUNE_STATE_BAG.weapon = WEAPON_GROUP_IDS[wi]![gi]!;
    syncJoints(jointRowNow, ri);
    syncHands(wi, gi);
    syncIk(gi);
  }
  if (pick && wi >= 0) {
    const n = pick.n < TUNE_MOVE_MAX ? pick.n : TUNE_MOVE_MAX;
    for (let k = 0; k < n; k++) {
      const t = pick.idx[k]!;
      if (t < 0 || t >= ROWS) continue;
      const jr = JOINT_OF_ROW[t]!;
      if (jr >= 0) syncJoints(JOINT_ROWS[jr]!, jr);
      syncHands(wi, t);
      syncIk(t);
    }
    const f = tuneRowFollow(pick);
    if (pick.n > 0 && f >= 0 && f === pick.idx[0] && f < ROWS) {
      const jr = JOINT_OF_ROW[f]!;
      if (jr >= 0) {
        jointRowNow = JOINT_ROWS[jr]!;
        TUNE_STATE_BAG.joint = JOINT_GROUP_IDS[jr]!;
      }
      TUNE_STATE_BAG.ik = IK_GROUP_IDS[f]!;
      TUNE_STATE_BAG.hand = HAND_GROUP_IDS[wi]![f]!;
      TUNE_STATE_BAG.weapon = WEAPON_GROUP_IDS[wi]![f]!;
    }
  }
  syncBackground();
}

/** Every row and weapon at once (tests; not hot). */
export function tuneV2SyncAll(): void {
  for (let r = 0; r < JOINT_ROWS.length; r++) syncJoints(JOINT_ROWS[r]!, r);
  for (let w = 0; w < HAND_WEAPONS.length; w++) for (let g = 0; g < ROWS; g++) syncHands(w, g);
  for (let g = 0; g < ROWS; g++) syncIk(g);
  syncGear();
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
