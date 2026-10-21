/**
 * (anim-joints J1, COVERAGE gap 1, A2 / A7) The per-rig window of the Joints, Hands & feet, IK strength and Weapon
 * tables (pure, Babylon-free). Every Wren rig (`CharacterRig.tuneRows`, set where the rig is made: `operatorRig`) owns
 * one `TuneRigState` (allocated once) and, inside its own `animate`, picks its own row from its own pose with the same
 * pick the local player's tuner uses (`selectBodyGroup`, `handsWeaponOf`, the gun's own Joints row in an armed state),
 * eases its own applied values toward the effective row (base table + tuner delta) and opens the window on them; the
 * rig hooks (`jointApply`, `HANDS_CUR`, `HANDS_GUN`, `ikStrength`, ...) then read that rig's applied state, never
 * another rig's. Non-Wren rigs (guards, the VIP, the dummy) have no state and never open a window.
 *
 * Nothing live (an empty base table, zero deltas, nothing still easing): both windows stay off and the hooks never run,
 * so the output is bit-identical to the untuned rig. No allocation per frame.
 */
import { ANIM_BASE, type AnimBaseData } from './animBase';
import { BODY_GROUPS, tuneBodyGroup, type TunePoseIn } from './tune';
import { HAND_WEAPONS, handsBaseLoad, handsBeginRig, handsEnd, handsRigState, handsWeaponOf, type HandsRigIn, type HandsRigState } from './tuneHands';
import { JOINT_ROWS, jointsBaseLoad, jointsBeginRig, jointsEnd, jointsRigState, type JointsRigState } from './tuneJoints';

export interface TuneRigState {
  readonly joints: JointsRigState;
  readonly hands: HandsRigState;
  /** The body state row picked last ('' none), for the dev hooks and tests. */
  body: string;
}

export function tuneRigState(): TuneRigState {
  return { joints: jointsRigState(), hands: handsRigState(), body: '' };
}

/** What the pick reads from the rig (a `CharacterRig` fits). */
export interface TuneRigPick extends HandsRigIn {
  readonly reachL: { readonly hook?: number };
  readonly reachR: { readonly hook?: number };
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

/**
 * Before the rig's own `animate` frame (after its LOD skip): pick its rows from its pose and open both windows on `st`
 * (eased over `dt`). Close with `tuneRigEnd` in a `finally`. No allocation.
 */
export function tuneRigBegin(st: TuneRigState, pose: TunePoseIn, rig: TuneRigPick, dt: number): void {
  const armed = rig.heldWeapon !== null && rig.heldWeapon !== undefined;
  const ledge = rig.reachL.hook === 1 || rig.reachR.hook === 1;
  const bg = tuneBodyGroup(pose, ledge, armed, rig); // (marlow-bays item 29) the studio's pin on her rig
  const gi = bg === null ? -1 : (BODY_INDEX[bg] ?? -1);
  const wi = WEAPON_INDEX[handsWeaponOf(rig)] ?? -1;
  st.body = bg ?? '';
  jointsBeginRig(st.joints, gi < 0 || wi < 0 ? -1 : JOINT_ROW_OF[wi]![gi]!, dt);
  handsBeginRig(st.hands, gi, wi, dt);
}

/** After the rig's `animate` frame: both windows off. */
export function tuneRigEnd(): void {
  handsEnd();
  jointsEnd();
}

// ------------------------------------------------------------------------------------------
// The base table in memory (the generated `animBase.ts` at start; the dev hook may replace it until a reload)
// ------------------------------------------------------------------------------------------

const clone = (b: AnimBaseData): AnimBaseData => JSON.parse(JSON.stringify(b)) as AnimBaseData;
let baseNow: AnimBaseData = clone(ANIM_BASE);

/** Load a base table object into the Joints / Hands / IK tables (every rig jumps). Returns the unknown names skipped. */
export function animBaseLoad(b: AnimBaseData): string[] {
  baseNow = clone(b);
  return [...jointsBaseLoad(baseNow.joints), ...handsBaseLoad(baseNow.hands, baseNow.ik)];
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
    /** Back to the generated table. */
    reset: (): string[] => animBaseLoad(ANIM_BASE),
  };
}
