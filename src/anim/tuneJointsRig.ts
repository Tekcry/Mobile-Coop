/**
 * (anim-joints J1, COVERAGE gap 1, A2 / A7) The per-rig window of the Joints, Hands & feet, IK strength and Weapon
 * tables (pure, Babylon-free). Every Wren rig (`CharacterRig.tuneRows`, set where the rig is made: `operatorRig`) owns
 * one `TuneRigState` (allocated once) and, inside its own `animate`, picks its own row from its own pose with the same
 * pick the local player's tuner uses (`selectBodyGroup` via `tuneBodyGroup`: the chamber's pin on her rig, `handsWeaponOf`, the gun's own Joints row in an armed state),
 * eases its own applied values toward the effective row (base table + tuner delta) and opens the window on them; the
 * rig hooks (`jointApply`, `HANDS_CUR`, `HANDS_GUN`, `ikStrength`, ...) then read that rig's applied state, never
 * another rig's. Non-Wren rigs (guards, the VIP, the dummy) have no state and never open a window.
 *
 * (anim-joints J2, COVERAGE gap 2, A5) The rig also picks up to 3 move / action rows (`pickTuneRows`: the traversal
 * kind, its team role `RigPose.tuneTeam`, the anim graph's action weights `AnimGraph.rowW`, last frame's: the graph
 * updates inside `animate`) and composes them over the stance row by their weights (`jointsBeginRigRows`,
 * `handsBeginRigRows`). The pick stays in the state (`pick`): the local player's panel follow reads it.
 *
 * Nothing live (an empty base table, zero deltas, nothing still easing): both windows stay off and the hooks never run,
 * so the output is bit-identical to the untuned rig. No allocation per frame.
 *
 * (anim-gear) The rig's gear offsets (`TuneRigState.gear`, `tuneGear.ts`) are composed here too, by its crouch amount;
 * `CharacterRig.gearPlace` and its sling nodes read them. The base table's `gear` key loads with the rest.
 *
 * (anim-bake-targets, BT-A1) And its Body base (`TuneRigState.bodyBase`, the base table's `body` key): `bodyRigBegin`
 * composes the rig's own row onto TUNE_CUR, put back by `tuneRigEnd` (`tune.ts`).
 */
import { ANIM_BASE, type AnimBaseData } from './animBase';
import { BODY_BASE_FIELDS, BODY_GROUPS, bodyBaseLoad, bodyRigBegin, bodyRigEnd, bodyRigState, selectBodyGroup, TUNE_PIN, tuneBodyGroup, type BodyField, type BodyRigState, type TunePoseIn, type TuneRigIn } from './tune';
import { HAND_WEAPONS, handsBaseLoad, handsBeginRigRows, handsEnd, handsRigState, handsWeaponOf, type HandsRigIn, type HandsRigState } from './tuneHands';
import { JOINT_ROWS, jointsBaseLoad, jointsBeginRigRows, jointsEnd, jointsRigState, type JointsRigState } from './tuneJoints';
import { pickTuneRows, TUNE_MOVE_MAX, TUNE_ROW_IDS, tuneRowPick, type TuneActionWeights, type TuneMovePoseIn, type TuneRowPick } from './tuneMoveRows';
import { GEAR_PARAMS, gearBaseLoad, gearRigState, gearRigUpdate, type GearRigState } from './tuneGear';
import { tuneBaseLoad } from './tuneRegistry';

export interface TuneRigState {
  readonly joints: JointsRigState;
  readonly hands: HandsRigState;
  /** (anim-gear) This rig's gear offsets (base table + Gear deltas, standing + crouch x crouched). */
  readonly gear: GearRigState;
  /** (anim-bake-targets, BT-A1) This rig's Body base values (the base table's `body` key, eased per rig). */
  readonly bodyBase: BodyRigState;
  /** The body state row picked last ('' none), for the dev hooks and tests. */
  body: string;
  /** (J2) The stance and move / action rows picked last (the panel follow, the dev hooks, the tests). */
  readonly pick: TuneRowPick;
  /** (J2) The move rows' Joints row indices (scratch). */
  readonly jRows: Int16Array;
}

export function tuneRigState(): TuneRigState {
  return { joints: jointsRigState(), hands: handsRigState(), gear: gearRigState(), bodyBase: bodyRigState(), body: '', pick: tuneRowPick(), jRows: new Int16Array(TUNE_MOVE_MAX).fill(-1) };
}

/** What the pick reads from the rig (a `CharacterRig` fits). */
export interface TuneRigPick extends HandsRigIn {
  readonly reachL: { readonly hook?: number };
  readonly reachR: { readonly hook?: number };
  /** (J2) The rig's anim graph: its action weights (last frame's). */
  readonly graph?: { readonly rowW: TuneActionWeights };
}

const BODY_INDEX = Object.fromEntries(BODY_GROUPS.map((b, i) => [b, i])) as Record<string, number>;
/** [weapon][body state] -> Joints row index: the gun's own row for an armed state with a rifle or pistol, else the state's. */
const JOINT_ROW_OF: readonly (readonly number[])[] = HAND_WEAPONS.map((w) =>
  BODY_GROUPS.map((b, gi) => {
    const r = JOINT_ROWS.indexOf(`${w}.${b}`);
    return r >= 0 ? r : gi; // (JOINT_ROWS starts with the body states, in order)
  }),
);
const WEAPON_INDEX = Object.fromEntries(HAND_WEAPONS.map((w, i) => [w, i])) as Record<string, number>;
/** (J2) `TUNE_ROW_IDS` index -> Joints row index (by name). */
export const JOINT_OF_TUNE_ROW: readonly number[] = TUNE_ROW_IDS.map((r) => JOINT_ROWS.indexOf(r));

/**
 * Before the rig's own `animate` frame (after its LOD skip): pick its rows from its pose and open both windows on `st`
 * (eased over `dt`). Close with `tuneRigEnd` in a `finally`. No allocation.
 */
export function tuneRigBegin(st: TuneRigState, pose: TunePoseIn & TuneMovePoseIn, rig: TuneRigPick & TuneRigIn, dt: number): void {
  const armed = rig.heldWeapon !== null && rig.heldWeapon !== undefined;
  const ledge = rig.reachL.hook === 1 || rig.reachR.hook === 1;
  const bg = tuneBodyGroup(pose, ledge, armed, rig); // (marlow-bays item 29) the chamber's pin on her rig
  const gi = bg === null ? -1 : (BODY_INDEX[bg] ?? -1);
  const wi = WEAPON_INDEX[handsWeaponOf(rig)] ?? -1;
  st.body = bg ?? '';
  const p = pickTuneRows(pose, rig.graph ? rig.graph.rowW : null, st.body, st.pick);
  const jr = st.jRows;
  for (let k = 0; k < TUNE_MOVE_MAX; k++) jr[k] = k < p.n ? JOINT_OF_TUNE_ROW[p.idx[k]!]! : -1;
  jointsBeginRigRows(st.joints, gi < 0 || wi < 0 ? -1 : JOINT_ROW_OF[wi]![gi]!, jr, p.w, p.n, dt);
  handsBeginRigRows(st.hands, gi, wi, p.idx, p.w, p.n, dt);
  // (anim-gear) the gear offsets by this rig's crouch amount (nothing live: returns at once)
  gearRigUpdate(st.gear, pose.crouch);
  // (anim-bake-targets, BT-A1) the Body base of this rig's row onto TUNE_CUR (the local player's tuner values or identity)
  // (crouch-pops, CP-A2) mid-crouch (no chamber pin): the standing row blended toward the crouched row by the crouch amount
  const c = pose.crouch;
  if (c > 0 && c < 1 && !(TUNE_PIN.body !== '' && rig === TUNE_PIN.rig)) {
    pose.crouch = 0;
    const gs = selectBodyGroup(pose, ledge, armed);
    pose.crouch = 1;
    const gc = selectBodyGroup(pose, ledge, armed);
    pose.crouch = c;
    bodyRigBegin(st.bodyBase, gs === null ? -1 : (BODY_INDEX[gs] ?? -1), pose, rig, dt, gc === null ? -1 : (BODY_INDEX[gc] ?? -1), c);
  } else bodyRigBegin(st.bodyBase, gi, pose, rig, dt);
}

/** After the rig's `animate` frame: both windows off. */
export function tuneRigEnd(): void {
  bodyRigEnd();
  handsEnd();
  jointsEnd();
}

// ------------------------------------------------------------------------------------------
// The base table in memory (the generated `animBase.ts` at start; the dev hook may replace it until a reload)
// ------------------------------------------------------------------------------------------

const clone = (b: AnimBaseData): AnimBaseData => JSON.parse(JSON.stringify(b)) as AnimBaseData;
let baseNow: AnimBaseData = clone(ANIM_BASE);

/** Load a base table object into the Joints / Hands / IK / Gear / Body tables and (anim-bake-all) the registry's generic `sections` (every rig jumps). Returns the unknown names skipped. */
export function animBaseLoad(b: AnimBaseData): string[] {
  baseNow = clone(b);
  return [...jointsBaseLoad(baseNow.joints), ...handsBaseLoad(baseNow.hands, baseNow.ik), ...gearBaseLoad(baseNow.gear).map((n) => `gear.${n}`), ...bodyBaseLoad(baseNow.body).map((n) => `body.${n}`), ...tuneBaseLoad(baseNow.sections).map((n) => `sections.${n}`)];
}

/** The base table in use (a copy). */
export function animBaseNow(): AnimBaseData {
  return clone(baseNow);
}

// the e2e sets base rows through this (dev / test hook, like `__tuneV2`; no game code reads it)
if (typeof window !== 'undefined') {
  (window as unknown as { __animBase: unknown }).__animBase = {
    get: animBaseNow,
    load: animBaseLoad,
    /** One joint's base offset (degrees) in one Joints row. */
    setJoint: (row: string, joint: string, xyz: [number, number, number]): string[] => {
      const b = clone(baseNow);
      (b.joints[row] ??= {})[joint] = xyz;
      return animBaseLoad(b);
    },
    /** (anim-gear) One gear param's base offset (`row` a socket or `<socket>.crouch`, `param` x / y / z / pitch / yaw / roll). */
    setGear: (row: string, param: string, v: number): string[] => {
      if (!GEAR_PARAMS.some((p) => p.id === param)) return [`gear.${row}.${param}`];
      const b = clone(baseNow);
      ((b.gear ??= {})[row] ??= {})[param] = v;
      return animBaseLoad(b);
    },
    /** (anim-bake-targets) One Body slider's base value in one Body row (mul sliders multiply, add sliders add). */
    setBody: (row: string, param: string, v: number): string[] => {
      if (!(BODY_BASE_FIELDS as readonly string[]).includes(param as BodyField)) return [`body.${row}.${param}`];
      const b = clone(baseNow);
      ((b.body ??= {})[row] ??= {})[param] = v;
      return animBaseLoad(b);
    },
    /** (anim-bake-all) One slider's value in the generic table (`sections.<section>.<group>.<id>`; mul multiplies, add adds). */
    setSection: (section: string, group: string, id: string, v: number): string[] => {
      const b = clone(baseNow);
      (((b.sections ??= {})[section] ??= {})[group] ??= {})[id] = v;
      return animBaseLoad(b);
    },
    /** Back to the generated table. */
    reset: (): string[] => animBaseLoad(ANIM_BASE),
  };
}
