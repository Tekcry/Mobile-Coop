/**
 * (anim-tuner) Live animation tuning table (pure, Babylon-free, no DOM): a dev aid behind the F3 overlay so Michael can
 * fix crab-looking animation while moving. Every tunable is a multiplier (default 1) or an offset (default 0) on a value
 * that already exists in code, per state group (walk, crouch walk, back to wall, ladder, ...) and, for the gun hold, per
 * weapon x state (rifle / pistol x low ready / aim / crouched aim).
 *
 * Hot paths read plain preallocated objects: `TUNE_CUR.<field>` (the local player's active group, copied in by
 * `tuneBegin` around the local player's `rig.animate`, identity at every other time, so guards, remote copies and every
 * other rig are untouched), or `TUNE_LOCAL.<field>` (the local player's last selected values, for code that runs outside
 * that window: the wall push, the root offset, the motion driver's stride). No Map lookups, closures or allocation on
 * those paths. A transition between groups may pop: it is a dev aid. The values never go on the wire.
 *
 * The panel (`ui/animTunePanel.ts`) edits the table, saves it to its own IndexedDB store (`save/animTuneStore.ts`) and
 * exports the changed values with a timestamped change log (`tuneExport`).
 */
import { CH } from './pose';

export const BODY_GROUPS = [
  'idle',
  'walk',
  'jog',
  'run',
  'crouchIdle',
  'sneak',
  'crouchWalk',
  'lowReady',
  'aim',
  'aimCrouch',
  'wallIdle',
  'wallSlide',
  'wallPeek',
  'ladder',
  'pipe',
  'ledge',
  'vent',
  'crawl',
  'hang',
  'hold',
] as const;
export type BodyGroup = (typeof BODY_GROUPS)[number];

export const GUN_GROUPS = ['rifle.lowReady', 'rifle.aim', 'rifle.aimCrouch', 'pistol.lowReady', 'pistol.aim', 'pistol.aimCrouch'] as const;
export type GunGroup = (typeof GUN_GROUPS)[number];
export type TuneGroup = BodyGroup | GunGroup;
export const ALL_GROUPS: readonly TuneGroup[] = [...BODY_GROUPS, ...GUN_GROUPS];

export const BODY_FIELDS = [
  'kneeFlexAdd',
  'trunkTwistMul',
  'trackMul',
  'kneeOutMul',
  'kneeLiftMul',
  'strideMul',
  'pelvisYAdd',
  'leanAdd',
  'armSwingMul',
  'armSwingGrow',
  'elbowOutAdd',
  'elbowPoleMul',
  'headTurnMul',
  'peekLeanMul',
  'wallGapAdd',
  'bodyFwdAdd',
  'bodyUpAdd',
  'handUpAdd',
  'handFwdAdd',
  'handOutAdd',
  'footUpAdd',
  'footFwdAdd',
  'footOutAdd',
  'guardGapAdd',
  'guardSideAdd',
] as const;
export type BodyField = (typeof BODY_FIELDS)[number];

export const GUN_FIELDS = ['gunFwd', 'gunUp', 'gunSide', 'gunPitch', 'gunYaw', 'gunCant', 'sightYAdd', 'headDropMul', 'tuckMul'] as const;
export type GunField = (typeof GUN_FIELDS)[number];
export type TuneField = BodyField | GunField;

export type BodyValues = Record<BodyField, number>;
export type GunValues = Record<GunField, number>;
/** The active values: body and gun fields plus `armSwingK` (derived each frame: armSwingMul + armSwingGrow x speed). */
export type CurValues = BodyValues & GunValues & { armSwingK: number };

export interface Tunable {
  id: TuneField;
  label: string;
  kind: 'mul' | 'add';
  def: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  groups: readonly TuneGroup[];
  /** What code value it scales or offsets (for the report and the panel tooltip). */
  hook: string;
}

const FOOT: readonly BodyGroup[] = ['idle', 'walk', 'jog', 'run', 'crouchIdle', 'sneak', 'crouchWalk', 'lowReady', 'aim', 'aimCrouch', 'wallIdle', 'wallSlide', 'wallPeek', 'hold'];
const MOVING: readonly BodyGroup[] = ['walk', 'jog', 'run', 'sneak', 'crouchWalk', 'aim', 'aimCrouch', 'wallSlide', 'hold'];
const SWING: readonly BodyGroup[] = ['walk', 'jog', 'run', 'sneak', 'crouchWalk'];
const KEYED: readonly BodyGroup[] = ['idle', 'walk', 'jog', 'run'];
const WALL: readonly BodyGroup[] = ['wallIdle', 'wallSlide', 'wallPeek'];
const ATTACHED: readonly BodyGroup[] = ['ladder', 'pipe', 'ledge', 'vent', 'crawl', 'hang'];
const ALL_BODY: readonly BodyGroup[] = BODY_GROUPS;
const ALL_GUN: readonly GunGroup[] = GUN_GROUPS;
const AIM_GUN: readonly GunGroup[] = ['rifle.aim', 'rifle.aimCrouch', 'pistol.aim', 'pistol.aimCrouch'];

/** The registry: every slider. Defaults are identity (mul 1, add 0): nothing changes until a slider moves. */
export const TUNABLES: readonly Tunable[] = [
  { id: 'armSwingMul', label: 'arm swing amplitude', kind: 'mul', def: 1, min: 0, max: 2.5, step: 0.05, unit: 'x', groups: SWING, hook: 'keyed.ts sampleKeyed: arm points about the clip mean; animGraph READY_HANDS swingT' },
  { id: 'kneeFlexAdd', label: 'stance knee flex', kind: 'add', def: 0, min: -0.03, max: 0.15, step: 0.002, unit: 'm', groups: ['idle', 'walk', 'jog', 'run'], hook: 'characterRig: the planted leg soft-knee length legLen (SOFT_KNEE_STAND) shortened: the knees bend at contact and in stance' },
  { id: 'trunkTwistMul', label: 'trunk / shoulder counter-rotation', kind: 'mul', def: 1, min: 0, max: 3, step: 0.05, unit: 'x', groups: ['walk', 'jog', 'run'], hook: 'keyed.ts: the keyed spine and chest yaw about the clip mean; animGraph: the gait clip spine yaw (spYaw twist)' },
  { id: 'strideMul', label: 'step length (cadence at the same speed)', kind: 'mul', def: 1, min: 0.6, max: 1.6, step: 0.01, unit: 'x', groups: MOVING, hook: 'motion.ts stepLength (the cadence drops as the step grows; the speed stays)' },
  { id: 'trackMul', label: 'foot width / track', kind: 'mul', def: 1, min: 0.3, max: 2, step: 0.01, unit: 'x', groups: FOOT, hook: 'animGraph writeTargets: the stance half-width `half` (keyed track `half` / hip width)' },
  { id: 'kneeOutMul', label: 'knee out (pole)', kind: 'mul', def: 1, min: 0, max: 3, step: 0.05, unit: 'x', groups: ALL_BODY, hook: 'characterRig: KNEE_OUT / keyed kneeOut (kneeOutNow), climbing CLIMB_KNEE_OUT' },
  { id: 'kneeLiftMul', label: 'knee / foot lift', kind: 'mul', def: 1, min: 0.3, max: 2.5, step: 0.05, unit: 'x', groups: [...MOVING, 'ladder', 'pipe'], hook: 'animGraph: gait liftH; climbing CLIMB_KNEE_UP (characterRig solveLegWorld)' },
  { id: 'pelvisYAdd', label: 'pelvis height / crouch depth', kind: 'add', def: 0, min: -0.25, max: 0.1, step: 0.005, unit: 'm', groups: ALL_BODY, hook: 'animGraph writeTargets: pelvis.y' },
  { id: 'leanAdd', label: 'forward lean', kind: 'add', def: 0, min: -0.4, max: 0.4, step: 0.01, unit: 'rad', groups: ALL_BODY, hook: 'animGraph writeTargets: spine.pitch; keyed clips: the keyed spine (keyed.ts sampleKeyed)' },
  { id: 'armSwingGrow', label: 'arm swing growth / speed', kind: 'add', def: 0, min: -0.5, max: 0.5, step: 0.01, unit: 'x per m/s', groups: SWING, hook: 'adds to the arm swing multiplier per m/s of speed' },
  { id: 'elbowOutAdd', label: 'elbow out (keyed arms)', kind: 'add', def: 0, min: -0.1, max: 0.15, step: 0.005, unit: 'm', groups: KEYED, hook: 'characterRig keyedArm: the keyed elbow point x' },
  { id: 'elbowPoleMul', label: 'elbow out (IK pole)', kind: 'mul', def: 1, min: 0, max: 2.5, step: 0.05, unit: 'x', groups: ALL_BODY, hook: 'characterRig solveArm: the elbow pole outward share 0.55' },
  { id: 'headTurnMul', label: 'head turn', kind: 'mul', def: 1, min: 0, max: 2, step: 0.05, unit: 'x', groups: ALL_BODY, hook: 'RigPose.lookYaw (the head glance / wall head turn)' },
  { id: 'peekLeanMul', label: 'peek lean', kind: 'mul', def: 1, min: 0, max: 2.5, step: 0.05, unit: 'x', groups: ['wallPeek'], hook: 'RigPose.lean (WALL.peekLean on the rig)' },
  { id: 'wallGapAdd', label: 'gap to wall', kind: 'add', def: 0, min: -0.1, max: 0.15, step: 0.005, unit: 'm', groups: WALL, hook: 'player.ts: wallRootPush (the rig root pushed onto the face)' },
  { id: 'bodyFwdAdd', label: 'body fwd (to wall / pipe / guard)', kind: 'add', def: 0, min: -0.25, max: 0.25, step: 0.005, unit: 'm', groups: [...ATTACHED, 'hold'], hook: 'player.ts: the rig root along the facing (visual only)' },
  { id: 'bodyUpAdd', label: 'body up', kind: 'add', def: 0, min: -0.25, max: 0.25, step: 0.005, unit: 'm', groups: ATTACHED, hook: 'player.ts: the rig root height (visual only)' },
  { id: 'handUpAdd', label: 'hand reach up', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: [...ATTACHED, 'hold'], hook: 'rig.reachL / reachR world grip targets (rungs, pipe, lip, hold hands)' },
  { id: 'handFwdAdd', label: 'hand reach fwd', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: [...ATTACHED, 'hold'], hook: 'rig.reachL / reachR along the facing' },
  { id: 'handOutAdd', label: 'hand spacing (out)', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: [...ATTACHED, 'hold'], hook: 'rig.reachL / reachR outward (the shimmy hand spacing)' },
  { id: 'footUpAdd', label: 'foot reach up', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: ATTACHED, hook: 'rig.plantL / plantR (rungs, wall pads)' },
  { id: 'footFwdAdd', label: 'foot reach fwd', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: ATTACHED, hook: 'rig.plantL / plantR along the facing' },
  { id: 'footOutAdd', label: 'foot spacing (out)', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: ATTACHED, hook: 'rig.plantL / plantR outward' },
  { id: 'guardGapAdd', label: 'gap to guard (visual)', kind: 'add', def: 0, min: -0.15, max: 0.25, step: 0.005, unit: 'm', groups: ['hold'], hook: 'player.ts tuneRoot: her rig root back along her facing (+ = more gap); GRAB.hold and the guard stay put' },
  { id: 'guardSideAdd', label: 'guard side offset (visual)', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: ['hold'], hook: 'player.ts tuneRoot: her rig root the other way (+ = the guard further to her right); GRAB.side stays' },
  { id: 'gunFwd', label: 'gun fwd / stock depth', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: ALL_GUN, hook: 'characterRig: weaponPivot z (AIM_POCKET.z + pose)' },
  { id: 'gunUp', label: 'gun up (low ready; aimed the sight is held at the eye)', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: ALL_GUN, hook: 'characterRig: weaponPivot y' },
  { id: 'gunSide', label: 'gun side (out)', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: ALL_GUN, hook: 'characterRig: weaponPivot x (mirrored with the hand)' },
  { id: 'gunPitch', label: 'muzzle pitch (+ down)', kind: 'add', def: 0, min: -0.8, max: 0.8, step: 0.01, unit: 'rad', groups: ALL_GUN, hook: 'characterRig: the weapon pitch' },
  { id: 'gunYaw', label: 'muzzle yaw (+ out)', kind: 'add', def: 0, min: -0.5, max: 0.5, step: 0.01, unit: 'rad', groups: ALL_GUN, hook: 'characterRig: the weapon yaw (mirrored)' },
  { id: 'gunCant', label: 'cant (roll)', kind: 'add', def: 0, min: -0.8, max: 0.8, step: 0.01, unit: 'rad', groups: ALL_GUN, hook: 'characterRig: the weapon roll (mirrored)' },
  { id: 'sightYAdd', label: 'sight height vs eye', kind: 'add', def: 0, min: -0.1, max: 0.1, step: 0.002, unit: 'm', groups: AIM_GUN, hook: 'characterRig sightToEye: SIGHT_EYE' },
  { id: 'headDropMul', label: 'head drop to sights', kind: 'mul', def: 1, min: 0, max: 3, step: 0.05, unit: 'x', groups: AIM_GUN, hook: 'characterRig: NECK_WELD (the neck flexes onto the stock)' },
  { id: 'tuckMul', label: 'elbow tuck aiming', kind: 'mul', def: 1, min: 0, max: 1.6, step: 0.05, unit: 'x', groups: AIM_GUN, hook: 'characterRig solveArm: AIM_ELBOW_TUCK' },
];

/**
 * (pass 3) Real-world targets shown under the matching sliders (walk / jog / run; CT Core's reference numbers), so the
 * tuning has somewhere to aim. Text only: no default follows them (every default stays identity).
 */
export const TUNE_HINTS: Partial<Record<BodyGroup, Partial<Record<TuneField, string>>>> = {
  walk: {
    armSwingMul: 'target at 1.4 m/s: shoulder swing +15/-18 deg, elbow 20-40 deg',
    kneeFlexAdd: 'target at 1.4 m/s: stance knee (loading) 15-18 deg',
    kneeLiftMul: 'target at 1.4 m/s: swing knee peak ~60 deg',
    trunkTwistMul: 'target at 1.4 m/s: pelvis yaw / thorax counter-rotation ±4/∓3 deg',
    pelvisYAdd: 'target at 1.4 m/s: vertical bob 3.5-4 cm',
    strideMul: 'target at 1.4 m/s: step 0.72 m at 115/min'
  },
  jog: {
    armSwingMul: 'target at 3.0 m/s: shoulder swing +25/-35 deg, elbow 75-95 deg',
    kneeFlexAdd: 'target at 3.0 m/s: stance knee (loading) 35-40 deg',
    kneeLiftMul: 'target at 3.0 m/s: swing knee peak ~95 deg',
    trunkTwistMul: 'target at 3.0 m/s: pelvis yaw / thorax counter-rotation ±6/∓4 deg',
    pelvisYAdd: 'target at 3.0 m/s: vertical bob 6-8 cm',
    strideMul: 'target at 3.0 m/s: step 1.10 m at 165/min'
  },
  run: {
    armSwingMul: 'target at 4.0 m/s: shoulder swing +35/-45 deg, elbow 80-100 deg',
    kneeFlexAdd: 'target at 4.0 m/s: stance knee (loading) 40-45 deg',
    kneeLiftMul: 'target at 4.0 m/s: swing knee peak ~115 deg',
    trunkTwistMul: 'target at 4.0 m/s: pelvis yaw / thorax counter-rotation ±7/∓5 deg',
    pelvisYAdd: 'target at 4.0 m/s: vertical bob 7-9 cm',
    strideMul: 'target at 4.0 m/s: step 1.35 m at 178/min'
  }
};

/** The target hint for a slider of a group, or ''. */
export function tuneHint(group: TuneGroup, id: TuneField): string {
  return (TUNE_HINTS as Partial<Record<string, Partial<Record<TuneField, string>>>>)[group]?.[id] ?? '';
}

const TUNABLE_BY_ID = new Map<TuneField, Tunable>(TUNABLES.map((t) => [t.id, t]));

export function tunable(id: TuneField): Tunable {
  return TUNABLE_BY_ID.get(id)!;
}

export function isGunGroup(g: string): g is GunGroup {
  return (GUN_GROUPS as readonly string[]).includes(g);
}

export function isTuneGroup(g: string): g is TuneGroup {
  return (ALL_GROUPS as readonly string[]).includes(g);
}

/** The sliders a group shows (registry order). */
export function tunablesFor(group: TuneGroup): Tunable[] {
  return TUNABLES.filter((t) => t.groups.includes(group));
}

/** Whether `id` is a slider of `group`. */
export function hasTunable(group: TuneGroup, id: string): id is TuneField {
  const t = TUNABLE_BY_ID.get(id as TuneField);
  return !!t && t.groups.includes(group);
}

function defBody(): BodyValues {
  const o = {} as BodyValues;
  for (const f of BODY_FIELDS) o[f] = tunable(f).def;
  return o;
}
function defGun(): GunValues {
  const o = {} as GunValues;
  for (const f of GUN_FIELDS) o[f] = tunable(f).def;
  return o;
}
function defCur(): CurValues {
  return { ...defBody(), ...defGun(), armSwingK: 1 };
}

/** The live values per body group (preallocated). */
export const TUNE_BODY = Object.fromEntries(BODY_GROUPS.map((g) => [g, defBody()])) as Record<BodyGroup, BodyValues>;
/** The live values per weapon x state (preallocated). */
export const TUNE_GUN = Object.fromEntries(GUN_GROUPS.map((g) => [g, defGun()])) as Record<GunGroup, GunValues>;

/** The identity values (never written). */
export const TUNE_IDENTITY: Readonly<CurValues> = Object.freeze(defCur());
/** The active values the rig and graph read: the local player's group inside `tuneBegin` .. `tuneEnd`, else identity. */
export const TUNE_CUR: CurValues = defCur();
/** The local player's last selected values (kept after `tuneEnd`): for code outside the animate window. */
export const TUNE_LOCAL: CurValues = defCur();
/** What the local player is doing now (the panel's auto-follow); '' = no group (a vault, a ladder top-out, ...). */
export const TUNE_STATE: { body: BodyGroup | ''; gun: GunGroup | '' } = { body: '', gun: '' };

/** Gait-clip pose channel of the spine yaw (pose.ts CH.spYaw). */
const SP_YAW = CH.spYaw;

/**
 * The trunk counter-rotation on the procedural gait clips' blend (the locomotion pose before it is mixed in): its spine
 * yaw times `TUNE_CUR.trunkTwistMul` (the twist curves swing about 0). Returns the pose. No allocation.
 */
export function tuneMoveTwist<P extends { [i: number]: number }>(pose: P): P {
  const k = TUNE_CUR.trunkTwistMul;
  if (k !== 1) pose[SP_YAW] = pose[SP_YAW]! * k;
  return pose;
}

const BODY_KEYS: readonly BodyField[] = BODY_FIELDS;
const GUN_KEYS: readonly GunField[] = GUN_FIELDS;

// ------------------------------------------------------------------------------------------
// State selection
// ------------------------------------------------------------------------------------------

/** The RigPose fields the selection reads (and the few it scales). */
export interface TunePoseIn {
  speed: number;
  crouch: number;
  aim: number;
  wall?: boolean;
  lean?: number;
  traverse?: string;
  bend?: number;
  bendDrop?: number;
  weight?: number;
  lookYaw?: number;
}

/** Speed bands (m/s), the same as the F3 crab readout's gait label. */
export const TUNE_BANDS = { idle: 0.15, walk: 2.2, jog: 3.7, sneak: 1.2 } as const;

/** The body group for a pose (`ledge`: the hands hook a lip; `armed`: a weapon in hand). Null: no group (identity). */
export function selectBodyGroup(p: TunePoseIn, ledge: boolean, armed: boolean): BodyGroup | null {
  if ((p.bend ?? 0) > 0 || (p.bendDrop ?? 0) > 0) return 'hold';
  const tr = p.traverse ?? 'none';
  if (tr !== 'none') {
    switch (tr) {
      case 'climb':
        return 'ladder';
      case 'pipeClimb':
      case 'pipeLegs':
      case 'pipeInv':
        return 'pipe';
      case 'hang':
        return ledge ? 'ledge' : 'hang';
      case 'crawl':
        return 'crawl';
      case 'crawlOut':
      case 'ventDrop':
        return 'vent';
      default:
        return null;
    }
  }
  const s = p.speed;
  if (p.wall) return (p.lean ?? 0) !== 0 ? 'wallPeek' : s > TUNE_BANDS.idle ? 'wallSlide' : 'wallIdle';
  const crouched = p.crouch > 0.5;
  if (p.aim > 0.5) return crouched ? 'aimCrouch' : 'aim';
  if (crouched) return s < TUNE_BANDS.idle ? 'crouchIdle' : s < TUNE_BANDS.sneak ? 'sneak' : 'crouchWalk';
  if (armed && s < TUNE_BANDS.idle) return 'lowReady';
  return s < TUNE_BANDS.idle ? 'idle' : s < TUNE_BANDS.walk ? 'walk' : s < TUNE_BANDS.jog ? 'jog' : 'run';
}

/** The gun group: the weapon by its mass (a pistol 0.7, rifles 1) x low ready / aim / crouched aim. Null unarmed. */
export function selectGunGroup(p: TunePoseIn, armed: boolean): GunGroup | null {
  if (!armed) return null;
  const pistol = (p.weight ?? 1) < 0.8;
  if (p.aim > 0.5) {
    if (p.crouch > 0.5) return pistol ? 'pistol.aimCrouch' : 'rifle.aimCrouch';
    return pistol ? 'pistol.aim' : 'rifle.aim';
  }
  return pistol ? 'pistol.lowReady' : 'rifle.lowReady';
}

// ------------------------------------------------------------------------------------------
// The animate window (hot path: no allocation)
// ------------------------------------------------------------------------------------------

/** A world grip target on the rig (characterRig WorldTarget). */
export interface TuneTarget {
  x: number;
  y: number;
  z: number;
  w: number;
  hook?: number;
  cx?: number;
  cy?: number;
  cz?: number;
}

/** The rig fields `tuneBegin` / `tuneEnd` touch. */
export interface TuneRigIn {
  heldWeapon: unknown;
  reachL: TuneTarget;
  reachR: TuneTarget;
  plantL: TuneTarget;
  plantR: TuneTarget;
  root: { rotation: { y: number } };
}

/** Saved grip targets (x y z cx cy cz) x 4, restored by `tuneEnd`. */
const saved = new Float64Array(24);
let shifted = false;

function copyBody(src: BodyValues, dst: CurValues): void {
  for (let i = 0; i < BODY_KEYS.length; i++) {
    const k = BODY_KEYS[i]!;
    dst[k] = src[k];
  }
}
function copyGun(src: Readonly<GunValues>, dst: CurValues): void {
  for (let i = 0; i < GUN_KEYS.length; i++) {
    const k = GUN_KEYS[i]!;
    dst[k] = src[k];
  }
}

function shiftTarget(t: TuneTarget, slot: number, dx: number, dy: number, dz: number): void {
  const o = slot * 6;
  saved[o] = t.x;
  saved[o + 1] = t.y;
  saved[o + 2] = t.z;
  saved[o + 3] = t.cx ?? NaN;
  saved[o + 4] = t.cy ?? NaN;
  saved[o + 5] = t.cz ?? NaN;
  t.x += dx;
  t.y += dy;
  t.z += dz;
  if (t.cx !== undefined) t.cx += dx;
  if (t.cy !== undefined) t.cy += dy;
  if (t.cz !== undefined) t.cz += dz;
}

function restoreTarget(t: TuneTarget, slot: number): void {
  const o = slot * 6;
  t.x = saved[o]!;
  t.y = saved[o + 1]!;
  t.z = saved[o + 2]!;
  if (t.cx !== undefined && !Number.isNaN(saved[o + 3]!)) t.cx = saved[o + 3]!;
  if (t.cy !== undefined && !Number.isNaN(saved[o + 4]!)) t.cy = saved[o + 4]!;
  if (t.cz !== undefined && !Number.isNaN(saved[o + 5]!)) t.cz = saved[o + 5]!;
}

/**
 * Before the LOCAL player's `rig.animate`: select its groups, load their values into `TUNE_CUR` (and `TUNE_LOCAL`),
 * scale the pose's head turn and peek lean, and offset the world grip targets (restored by `tuneEnd`). No allocation.
 */
export function tuneBegin(p: TunePoseIn, rig: TuneRigIn): void {
  const armed = rig.heldWeapon !== null && rig.heldWeapon !== undefined;
  const ledge = rig.reachL.hook === 1 || rig.reachR.hook === 1;
  const bg = selectBodyGroup(p, ledge, armed);
  const gg = selectGunGroup(p, armed);
  TUNE_STATE.body = bg ?? '';
  TUNE_STATE.gun = gg ?? '';
  const cur = TUNE_CUR;
  if (bg) copyBody(TUNE_BODY[bg], cur);
  else copyBody(TUNE_IDENTITY, cur);
  copyGun(gg ? TUNE_GUN[gg] : TUNE_IDENTITY, cur);
  cur.armSwingK = Math.max(0, cur.armSwingMul + cur.armSwingGrow * Math.max(0, p.speed));
  copyBody(cur, TUNE_LOCAL);
  copyGun(cur, TUNE_LOCAL);
  TUNE_LOCAL.armSwingK = cur.armSwingK;
  if (p.lookYaw !== undefined) p.lookYaw *= cur.headTurnMul;
  if (p.lean !== undefined && p.lean !== 0) p.lean = Math.max(-1.5, Math.min(1.5, p.lean * cur.peekLeanMul));
  // grip targets: hands and feet in the body frame (x right, z forward)
  const hu = cur.handUpAdd;
  const hf = cur.handFwdAdd;
  const ho = cur.handOutAdd;
  const fu = cur.footUpAdd;
  const ff = cur.footFwdAdd;
  const fo = cur.footOutAdd;
  shifted = hu !== 0 || hf !== 0 || ho !== 0 || fu !== 0 || ff !== 0 || fo !== 0;
  if (!shifted) return;
  const yaw = rig.root.rotation.y;
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  // the body's right is (fz, -fx)
  shiftTarget(rig.reachL, 0, fx * hf - fz * ho, hu, fz * hf + fx * ho);
  shiftTarget(rig.reachR, 1, fx * hf + fz * ho, hu, fz * hf - fx * ho);
  shiftTarget(rig.plantL, 2, fx * ff - fz * fo, fu, fz * ff + fx * fo);
  shiftTarget(rig.plantR, 3, fx * ff + fz * fo, fu, fz * ff - fx * fo);
}

/** After the local player's `rig.animate`: the grip targets back, `TUNE_CUR` back to identity. No allocation. */
export function tuneEnd(rig: TuneRigIn): void {
  if (shifted) {
    restoreTarget(rig.reachL, 0);
    restoreTarget(rig.reachR, 1);
    restoreTarget(rig.plantL, 2);
    restoreTarget(rig.plantR, 3);
    shifted = false;
  }
  copyBody(TUNE_IDENTITY, TUNE_CUR);
  copyGun(TUNE_IDENTITY, TUNE_CUR);
  TUNE_CUR.armSwingK = 1;
}

/** Around the local player's motion driver step: its step length (stride) from the last selected group. */
export function tuneSim(on: boolean): void {
  TUNE_CUR.strideMul = on ? TUNE_LOCAL.strideMul : 1;
}

/**
 * The local rig root's visual offset from the last selected group: body fwd / up, and in the hold the gap to the guard
 * (back along her facing) and the guard's side offset (her rig the other way). Visual only: the capsule, the guard and
 * GRAB stay where gameplay puts them. No allocation.
 */
export function tuneRoot(pos: { x: number; y: number; z: number }, yaw: number): void {
  const f = TUNE_LOCAL.bodyFwdAdd - TUNE_LOCAL.guardGapAdd;
  const r = -TUNE_LOCAL.guardSideAdd;
  const u = TUNE_LOCAL.bodyUpAdd;
  if (f === 0 && u === 0 && r === 0) return;
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  // forward (s, c), right (c, -s)
  pos.x += s * f + c * r;
  pos.z += c * f - s * r;
  pos.y += u;
}

/**
 * The forward lean on a sampled keyed pose's spine (local quaternion at offset 4 of `q`, x y z w): times a pitch of
 * `TUNE_CUR.leanAdd` about its x axis (positive leans forward, as the graph's spine pitch). No allocation.
 */
export function tuneKeyedLean(q: Float64Array): void {
  const a = TUNE_CUR.leanAdd;
  if (a === 0) return;
  const rx = Math.sin(a * 0.5);
  const rw = Math.cos(a * 0.5);
  const x = q[4]!;
  const y = q[5]!;
  const z = q[6]!;
  const w = q[7]!;
  q[4] = w * rx + x * rw;
  q[5] = y * rw + z * rx;
  q[6] = z * rw - y * rx;
  q[7] = w * rw - x * rx;
}

const tq = new Float64Array(4);
const td = new Float64Array(4);

/** a * b (Hamilton, x y z w) into out (out may not alias a or b). */
function qmul(ax: number, ay: number, az: number, aw: number, bx: number, by: number, bz: number, bw: number, out: Float64Array): void {
  out[0] = aw * bx + ax * bw + ay * bz - az * by;
  out[1] = aw * by - ax * bz + ay * bw + az * bx;
  out[2] = aw * bz + ax * by - ay * bx + az * bw;
  out[3] = aw * bw - ax * bx - ay * by - az * bz;
}

/** One keyed joint (`q` at offset `s`): its deviation from the mean, its yaw (twist about y) scaled by `k`. */
function twistAbout(q: Float64Array, m: Float32Array, s: number, k: number): void {
  const mx = m[s]!;
  const my = m[s + 1]!;
  const mz = m[s + 2]!;
  const mw = m[s + 3]!;
  // d = q * conj(m)
  qmul(q[s]!, q[s + 1]!, q[s + 2]!, q[s + 3]!, -mx, -my, -mz, mw, td);
  if (td[3]! < 0) for (let c = 0; c < 4; c++) td[c] = -td[c]!;
  const tl = Math.sqrt(td[1]! * td[1]! + td[3]! * td[3]!);
  if (tl < 1e-9) return;
  const ty = td[1]! / tl;
  const tw = td[3]! / tl;
  // swing = d * conj(twist); d' = swing * twist^k; q' = d' * m
  qmul(td[0]!, td[1]!, td[2]!, td[3]!, 0, -ty, 0, tw, tq);
  const th = 2 * Math.atan2(ty, tw) * k;
  qmul(tq[0]!, tq[1]!, tq[2]!, tq[3]!, 0, Math.sin(th * 0.5), 0, Math.cos(th * 0.5), td);
  qmul(td[0]!, td[1]!, td[2]!, td[3]!, mx, my, mz, mw, tq);
  const l = Math.sqrt(tq[0]! * tq[0]! + tq[1]! * tq[1]! + tq[2]! * tq[2]! + tq[3]! * tq[3]!) || 1;
  for (let c = 0; c < 4; c++) q[s + c] = tq[c]! / l;
}

/**
 * The trunk counter-rotation on a sampled keyed pose: the spine (offset 4) and chest (offset 8) yaw about the clip's mean
 * (`mean`, KeyedClip.meanQ) times `TUNE_CUR.trunkTwistMul`. Identity at 1. No allocation.
 */
export function tuneKeyedTwist(q: Float64Array, mean: Float32Array): void {
  const k = TUNE_CUR.trunkTwistMul;
  if (k === 1) return;
  twistAbout(q, mean, 4, k);
  twistAbout(q, mean, 8, k);
}

// ------------------------------------------------------------------------------------------
// Edit, reset, change log, export, save (the panel; not hot)
// ------------------------------------------------------------------------------------------

export interface TuneChange {
  /** ISO time of the first move in this entry. */
  t: string;
  group: TuneGroup;
  id: TuneField;
  from: number;
  to: number;
}

/** The change log (oldest first). A run of moves of one slider within `LOG_MERGE_MS` is one entry. */
export const TUNE_LOG: TuneChange[] = [];
const LOG_MAX = 5000;
const LOG_MERGE_MS = 1500;
let lastLogAt = 0;

/** Called after every change (the panel's debounced save). */
export const TUNE_HOOKS: { changed: (() => void) | null } = { changed: null };

function valuesOf(group: TuneGroup): Record<string, number> {
  return (isGunGroup(group) ? TUNE_GUN[group] : TUNE_BODY[group as BodyGroup]) as Record<string, number>;
}

function round(v: number, step: number): number {
  const d = Math.max(0, Math.min(6, Math.ceil(-Math.log10(step)) + 1));
  return Number(v.toFixed(d));
}

export function tuneGet(group: TuneGroup, id: TuneField): number {
  return valuesOf(group)[id]!;
}

/** Set one value (clamped to the slider's range); logs the change. False: not a slider of that group. */
export function tuneSet(group: TuneGroup, id: TuneField, value: number, now = Date.now()): boolean {
  if (!hasTunable(group, id) || !Number.isFinite(value)) return false;
  const t = tunable(id);
  const v = round(Math.max(t.min, Math.min(t.max, value)), t.step);
  const vals = valuesOf(group);
  const from = vals[id]!;
  if (v === from) return true;
  vals[id] = v;
  const last = TUNE_LOG[TUNE_LOG.length - 1];
  if (last && last.group === group && last.id === id && now - lastLogAt < LOG_MERGE_MS) last.to = v;
  else {
    TUNE_LOG.push({ t: new Date(now).toISOString(), group, id, from, to: v });
    if (TUNE_LOG.length > LOG_MAX) TUNE_LOG.splice(0, TUNE_LOG.length - LOG_MAX);
  }
  lastLogAt = now;
  TUNE_HOOKS.changed?.();
  return true;
}

export function tuneReset(group: TuneGroup, id: TuneField, now = Date.now()): void {
  if (hasTunable(group, id)) tuneSet(group, id, tunable(id).def, now);
}

export function tuneResetGroup(group: TuneGroup, now = Date.now()): void {
  for (const t of tunablesFor(group)) tuneSet(group, t.id, t.def, now);
}

export function tuneResetAll(now = Date.now()): void {
  for (const g of ALL_GROUPS) tuneResetGroup(g, now);
}

/** Whether a group has any value off its default. */
export function tuneGroupChanged(group: TuneGroup): boolean {
  return tunablesFor(group).some((t) => tuneGet(group, t.id) !== t.def);
}

export interface TuneValue {
  group: TuneGroup;
  id: TuneField;
  label: string;
  kind: 'mul' | 'add';
  unit: string;
  value: number;
  default: number;
}

/** Every value off its default. */
export function tuneChanged(): TuneValue[] {
  const out: TuneValue[] = [];
  for (const g of ALL_GROUPS) {
    for (const t of tunablesFor(g)) {
      const v = tuneGet(g, t.id);
      if (v !== t.def) out.push({ group: g, id: t.id, label: t.label, kind: t.kind, unit: t.unit, value: v, default: t.def });
    }
  }
  return out;
}

export const TUNE_EXPORT_MAGIC = 'night-shift-anim-tune';

export interface TuneExport {
  magic: typeof TUNE_EXPORT_MAGIC;
  version: 1;
  exported: string;
  changed: TuneValue[];
  log: TuneChange[];
}

/** The export: every changed value with its default, and the change log. */
export function tuneExport(now = new Date()): TuneExport {
  return { magic: TUNE_EXPORT_MAGIC, version: 1, exported: now.toISOString(), changed: tuneChanged(), log: TUNE_LOG.slice() };
}

/** `anim-tune-YYYY-MM-DD.json` (local date). */
export function tuneExportName(now = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `anim-tune-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

/** What the store keeps: the changed values per group, and the log. */
export interface TuneSnapshot {
  version: 1;
  values: Record<string, Record<string, number>>;
  log: TuneChange[];
}

export function tuneSnapshot(): TuneSnapshot {
  const values: Record<string, Record<string, number>> = {};
  for (const c of tuneChanged()) (values[c.group] ??= {})[c.id] = c.value;
  return { version: 1, values, log: TUNE_LOG.slice() };
}

/** Load a saved snapshot (no log entries for the load; unknown groups / ids are skipped). */
export function tuneLoad(s: unknown): void {
  if (!s || typeof s !== 'object') return;
  const snap = s as Partial<TuneSnapshot>;
  const hook = TUNE_HOOKS.changed;
  TUNE_HOOKS.changed = null;
  try {
    for (const g of ALL_GROUPS) for (const t of tunablesFor(g)) valuesOf(g)[t.id] = t.def;
    for (const [g, vals] of Object.entries(snap.values ?? {})) {
      if (!isTuneGroup(g) || !vals || typeof vals !== 'object') continue;
      for (const [id, v] of Object.entries(vals)) {
        if (!hasTunable(g, id) || typeof v !== 'number' || !Number.isFinite(v)) continue;
        const t = tunable(id);
        valuesOf(g)[id] = Math.max(t.min, Math.min(t.max, v));
      }
    }
    TUNE_LOG.length = 0;
    if (Array.isArray(snap.log)) for (const c of snap.log.slice(-LOG_MAX)) if (c && isTuneGroup(c.group) && hasTunable(c.group, c.id)) TUNE_LOG.push(c);
    lastLogAt = 0;
  } finally {
    TUNE_HOOKS.changed = hook;
  }
}

/** Clear the change log (keeps the values). */
export function tuneClearLog(): void {
  TUNE_LOG.length = 0;
  lastLogAt = 0;
  TUNE_HOOKS.changed?.();
}
