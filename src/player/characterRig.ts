import { Color4, Matrix, Quaternion, TransformNode, Vector3, type Vector4, type AbstractMesh, type InstancedMesh, type Material, type Scene } from '../core/babylon';
import { buildSmoothBody, type SmoothBody } from './smoothBody';
import { addGlow, BEACON, GLOW_IDLE, GLOW_VISION } from './goggleGlow';
import type { SwapReach } from '../anim/clips/actions';
import type { PartShape } from '../world/partLibrary';
import type { AvatarLook } from '../cosmetics/avatarLook';
import { proportions, type Build, type Proportions } from './proportions';
import { AIM_ELBOW_TUCK, AnimGraph, defaultInput, meleePoleW, wrenTuckMul, type AnimInput, type TraverseKind } from '../anim/animGraph';
import { ROLL_BODY, rollTurn } from '../anim/clips/traverse'; // (anim-n4b) the grounded roll's body turn
import { gripClose, smoothInv } from '../anim/drawMotion';
import { elbowSwivelClear, solveTwoBone } from '../anim/rigMath';
import { HOLDS, holdInto, solveHold, type HandFrame, type HoldName } from './handHold';
import { emptyPlannerInput, FootPlanner, type FootState } from '../anim/footPlanner';
import { CqLiftCrouch } from '../anim/cqGait'; // (anim-n4, track A)
import { newStrikeBody, strikeBodyAt, strikeBodyPhase, type StrikeBodyOut } from '../anim/strikeBody'; // (anim-natural N4c) the elbow strike's hips and trunk
import { KNEE_SWING_SHARE, kneePoleYaw, PELVIS_FOLLOW_KEYED, PELVIS_FOLLOW_MAX, pelvisFollow } from '../anim/turnFollow';
import { LOCO, MOCAP_FEET, MOCAP_LAYERS, MOCAP_RUN_POSE, mocapLayerK } from '../anim/mocap'; // (mocap-trial; afp-af2 the run pose)
import type { MotionState } from '../anim/motion';
import { MotionDerive } from '../anim/motionDerive';
import { DEBUG_RIGS } from '../ui/debugVolumes';
import { hyp2 } from '../core/mathx';
import { KA, KD, KE, KEYED_LEG_SIDE, KEYED_LEGD_SIDE, KL, KQ, KW, type KeyedPose } from '../anim/keyed';
import { LEGD_OPT, legdContactW, plantKnee } from '../anim/legDelta';
import { toePitch } from '../anim/toeRoll';
import { heelLift } from '../anim/footGeom';
import { TUNE_CUR } from '../anim/tune';
import { HAND_SWAP, handSwapK, handSwapPh } from '../anim/handSwapPath'; // (anim-n4c; strike-pops)
import { studioFeet } from '../anim/studioDrive';
import { J, JOINTS_CUR, jointApply, mulInto } from '../anim/tuneJoints';
import { HANDS_CUR, HANDS_GUN, HP, gunVisualPoint, handsRotApply, ikStrength, type GunVisual } from '../anim/tuneHands';
import { tuneRigBegin, tuneRigEnd, tuneRigState, type TuneRigState } from '../anim/tuneJointsRig';
import { guardRigBegin, guardRigEnd, guardRigState, type GuardRigState } from '../anim/tuneGuardRig';
import { GUARD_STEP_ROWS } from '../anim/tuneGuard';
import { STEP_IDENTITY_ROWS } from '../anim/tuneStep';
import { gearCompose, GS } from '../anim/tuneGear';
import { FING_L, FING_LEN, FING_R, FINGER_N, handGripShape, SPREAD_MAX_DEG } from '../anim/fingers';
import { CLAV_L, CLAV_LEN, CLAV_R, clavActive, clavCompose, clavPoint, clavQuat } from '../anim/clavicle';
import { GOGGLE_OFFSET, setGoggleOffset } from '../operators/runtime/goggle';
import { EDGE_HAND_TIME, HandSwitch } from './handSwitch';

/** Creates a unit-sized part mesh (instanced from the shared PartLibrary). `slot` names the colour/pattern slot. */
// (rig-pose-fix S7, G15) the hand switch's clock is shared with the sim (`handSwitch.ts`): EDGE_HAND_TIME lives there
export { EDGE_HAND_TIME };

export type PartFactory = (shape: PartShape, hex: string, slot: string) => AbstractMesh;

/** High-level animation inputs. Callers describe what the character is doing; the rig's graph
 *  turns that into a layered, cross-faded pose. Optional fields default to neutral. */
export interface RigPose {
  /** Horizontal speed in m/s. */
  speed: number;
  /** Local movement direction (x right, z forward), normalised or zero. */
  localX: number;
  localZ: number;
  grounded: boolean;
  /** 0 standing .. 1 fully crouched. */
  crouch: number;
  /** Aim pitch in radians (up positive). */
  aimPitch: number;
  /** Weapon raise: 0 at the ready position .. 1 shouldered on the aim line. */
  aim: number;
  /** Momentary kick from firing 0..1. */
  kick: number;
  aimYaw?: number;
  /** (3.2.0) A raised weapon's world aim (yaw, pitch + up), not tumbled with the body: aiming hanging inverted. */
  aimWorldYaw?: number;
  aimWorldPitch?: number;
  /** Head-only glance towards where the camera looks (rad, yaw right-positive / pitch up), lowered: the
   *  gun, arms and spine stay put while the view orbits. */
  lookYaw?: number;
  lookPitch?: number;
  kneel?: boolean;
  /** (G1, audit row 26) Crouched near an unaware guard: the tense sneak (`tenseSneak.ts`). */
  tense?: boolean;
  /** Ready-position weights (default: low ready). */
  carry?: { low: number; high: number; compressed: number };
  /** Weapon mass factor (1 = rifle). */
  weight?: number;
  reload?: number;
  yawRate?: number;
  armed?: boolean;
  /** (guard-ai S21) The holstered / slung carry with the hands empty (the ready hands, the armed carriage kept); unset:
   *  a carrier (the player, a remote player) with no weapon in hand. A guard sets it while his gun is holstered. */
  ready?: boolean;
  /** Dash blend 0..1. */
  dash?: number;
  /** Landing recovery 0..1. */
  landing?: number;
  /** Back to a wall (the flat-back high stance). */
  wall?: boolean;
  /** (doorPeek parity) Still, the feet step onto the stance spots under the root, as on a wall: the same on every peer
   *  whatever the approach and the frame rate left (the door peek). */
  settleFeet?: boolean;
  /** Side of the wall in the character's frame (-1 left, 1 right). */
  wallSide?: number;
  /** (step 11) The wall's outward normal (XZ) and its face plane (n . p on the face): no foot lands behind it. */
  wallNx?: number;
  wallNz?: number;
  wallFace?: number;
  /** (G6) How far the posed body is turned off facing out from the wall (|sin|, 0 square .. 1 side-on: the crouched
   *  side-on stance, AUDIT-WALLS row 1). */
  wallTurn?: number;
  /** (G6) A wall right in front of the raised weapon (0..1, `wallBlockK`). */
  wallBlock?: number;
  /** Lean around an edge (-1 left .. 1 right), hips planted. */
  lean?: number;
  /** (step 12b, D10) World height the head centre stays under (a low-wall side lean: the wall top); unset = none.
   *  The pelvis sinks (knees bend deeper) by the excess, eased, so the head sample stays below the top. */
  headCap?: number;
  /** Stick intent along the body, wanted minus current pace (-1..1), at render rate. */
  intent?: number;
  traverse?: TraverseKind;
  traverseT?: number;
  /** (anim-n4b) A committed move's top above its start feet and its start-to-end distance (m): the mantle's hand plant. */
  traverseH?: number;
  traverseD?: number;
  /** (anim-joints J2) This rig's co-op team role row (`team.<move>.<a|b>`, '' / unset none): the tuner's team rows. */
  tuneTeam?: string;
  melee?: number;
  /** (G7) Close quarters: the spine bent forward (rad), the pelvis dropped (m), the hold sway (m); see AnimInput. */
  bend?: number;
  bendDrop?: number;
  /** (marlow-bays T1a) The bend is over a body (lift, carry, put down), not a held guard: the tuner's `carry` row. */
  carryBody?: boolean;
  /** (anim-n4, track A) The carried body's load: its shoulder (1 right, -1 left) x its weight on it (0..1): the carry's
   *  lean away from the load and the hips under it scale by it (none kneeling at the body). Absent: no load. */
  carrySide?: number;
  /** (anim-n4, track A) The body lift's step-in 0..1 (absent / -1: no lift): the rig's lift crouch pose (`CqLiftCrouch`). */
  liftStep?: number;
  sway?: number;
  /** (3.2.0) Whole-body tumble about the hips (rad): hanging legs up / inverted on a pipe. */
  tumble?: number;
  /** Reload is the empty one (charging handle). */
  reloadEmpty?: boolean;
  /** Weapon swap / grenade throw progress 0..1, or < 0. */
  swap?: number;
  /** Where the hand holsters the outgoing weapon and draws the next (carry slot kinds). */
  swapFrom?: SwapReach;
  swapTo?: SwapReach;
  grenade?: number;
  /** Motion driver: gait clock, state and time in it, body-frame acceleration, root velocity. */
  phase?: number;
  motion?: MotionState;
  motionT?: number;
  /** Chaos Theory instant stop (3.2.0): blend to idle over this (s), a swing left from moving lands within it. */
  quickStop?: number;
  /** Chaos Theory stop hold (3.2.0): the pace the held stride stopped from (0 / absent = none). */
  holdSpeed?: number;
  accelFwd?: number;
  accelSide?: number;
  velX?: number;
  velZ?: number;
  /** Where the body is turning to (stepped turns plant the feet for it). */
  goalYaw?: number;
  /**
   * (A1.2) 'facing' (free movement): the stride runs along the facing, no strafe or back clips except the slow back walk;
   * 'velocity' (aiming, wall, cover; the default): the stride follows the velocity.
   */
  stride?: 'facing' | 'velocity';
  /** (anim-natural N1) The foot planner's turn rules (turn step, ball pivot, held contact): 1 on (absent), 0 off (an opt-out). */
  turnRule?: number;
  /** (A1.2) Where a free turn is heading (the stick, rad); absent: the planner caps its turn prediction at +-90 deg. */
  faceGoal?: number;
  /** Predicted rest position while stopping (the last steps land there). */
  restX?: number;
  restZ?: number;
}

/** A world point with a blend weight (rig hand / foot targets). */
export interface WorldTarget {
  x: number;
  y: number;
  z: number;
  w: number;
  /** (anim-cleanup) Hands: the grip axis, radius and hook (attachGrips.GripTarget). */
  ax?: number;
  ay?: number;
  az?: number;
  rad?: number;
  hook?: number;
  /** (anim-cleanup) The real grip geometry's point under the hand (attachGrips.axisPoint). */
  cx?: number;
  cy?: number;
  cz?: number;
  /** (team-climb) Hands: the share of the arm's reach (shoulder to grip) past which the palm lifts off the grip towards
   *  the shoulder (`liftOffTarget`); unset = held whatever the reach. */
  liftOff?: number;
}

/** (team-climb) The longest a lifting-off hand's grip point is held from the shoulder (share of the arm's reach). */
const LIFT_OFF_MAX = 0.93;
/** (team-climb) An arm on a lifting-off grip turns up to this many times the free arm's rate limit (JOINT_RATE). */
const LIFT_OFF_RATE = 2;
const liftScratch: WorldTarget[] = [{ x: 0, y: 0, z: 0, w: 0 }, { x: 0, y: 0, z: 0, w: 0 }];

/**
 * (team-climb) A grip that lets go as the arm runs out (the rope top-out's lip, the body rising past it on the team clip):
 * within `r.liftOff` of the arm the grip as it is; past it the grip point (and the target with it) eased towards the
 * shoulder `S`, at most LIFT_OFF_MAX of the arm (a tanh: the palm leaves the grip with no velocity step, and the arm never
 * runs out, so the lip grip's pivot stays at palm-down). Writes a scratch target per hand (`gi`); no allocation.
 */
function liftOffTarget(r: WorldTarget, S: Vector3, arm: number, gi: number): WorldTarget {
  const o = liftScratch[gi]!;
  o.x = r.x; o.y = r.y; o.z = r.z; o.w = r.w;
  o.ax = r.ax; o.ay = r.ay; o.az = r.az; o.rad = r.rad; o.hook = r.hook;
  o.cx = r.cx; o.cy = r.cy; o.cz = r.cz;
  const gx = r.cx ?? r.x, gy = r.cy ?? r.y, gz = r.cz ?? r.z;
  const dx = gx - S.x, dy = gy - S.y, dz = gz - S.z;
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const r0 = (r.liftOff ?? 1) * arm;
  const r1 = Math.max(r0 + 1e-3, LIFT_OFF_MAX * arm);
  if (d <= r0) return o;
  const f = (r0 + (r1 - r0) * Math.tanh((d - r0) / (r1 - r0))) / d - 1;
  o.x += dx * f; o.y += dy * f; o.z += dz * f;
  o.cx = gx + dx * f; o.cy = gy + dy * f; o.cz = gz + dz * f;
  return o;
}

export type JointName = 'pelvis' | 'spine' | 'chest' | 'neck' | 'head' | 'shoulderL' | 'shoulderR' | 'elbowL' | 'elbowR' | 'hipL' | 'hipR' | 'kneeL' | 'kneeR';
/** Forward-kinematics override (Euler x, y, z) per joint: scripted poses (a grabbed or hostage guard, the VIP). */
export type FkPose = Partial<Record<JointName, readonly [number, number, number]>> & { pelvisLift?: number };

/** Tri-lens goggle lens colours (off / glowing). */
const LENS_OFF = '#20331f';
const LENS_ON = '#8dff5a';

/** Avatar render style: classic stick figure or the detailed smooth body (the operator; default). */
export type AvatarStyle = 'stick' | 'detailed';
let DEFAULT_STYLE: AvatarStyle = 'detailed';
/** Style for rigs built from now on (set from Settings > Video). */
export function setAvatarStyle(s: AvatarStyle): void {
  DEFAULT_STYLE = s;
}
export function avatarStyle(): AvatarStyle {
  return DEFAULT_STYLE;
}

/** Build -> look body type (and enemies can override with their own build). */
const BUILD_OF: Record<AvatarLook['body'], Build> = { average: 'average', lean: 'lean', athletic: 'athletic', broad: 'broad' };

// (anim-natural N1) the foot's contact geometry (HEEL_BACK, HEEL_DOWN, TOE_BALL) and the raised heel's ankle lift
// (`heelLift`) moved to the pure `anim/footGeom.ts`: the foot planner's ball pivot turns about the same ball.
// (mocap-trial) with it the clip feet swing's branch (`clipOwn`).

/**
 * (mocap-trial, fix 2) A foot's clip feet state back to the planner's (`newFoot`'s values). (fix 2 check) Except a planted
 * foot still on the clip's heel strike (toe up): it keeps `clipPlant` until it lifts, the one thing the flag does with the
 * switch off, so a stop flattens it (cleared, the switch turned off mid-stop left it 6 deg toe up for good at idle).
 */
function clipFootOff(f: FootState): void {
  f.clipOwn = false;
  f.clipPlant = f.clipPlant && f.contact && f.pitch < 0;
  f.clipPitchT = -1;
  f.clipPitchOff = 0;
}

/** (guard-render S5 L5) A joint's limiter state (`limitJoint`): its max rate once resolved, the previous local rotation. */
type LimitedNode = TransformNode & { _lim?: { rate: number | undefined; prev: Quaternion | null } };

/**
 * Max joint angular speeds (rad/s) by joint name suffix: realistic limits, also blend continuity. (locomotion step 21)
 * hips and knees 25 rad/s = 23.9 deg per 60 Hz frame, under bible 5.12.2's 25 deg per frame.
 */
const JOINT_RATE = new Map<string, number>([
  ['pelvis', 8],
  ['spine', 8],
  ['chest', 9],
  ['neck', 10],
  ['head', 12],
  ['shL', 22],
  ['shR', 22],
  ['elL', 24],
  ['elR', 24],
  ['hipL', 25],
  ['hipR', 25],
  ['knL', 25],
  ['knR', 25],
]);

const approachTo = (x: number, target: number, dt: number, tau: number): number => target + (x - target) * Math.exp(-dt / tau);
/** (mocap-trial) `x` moved toward `target` by at most `max`. */
const rateTo = (x: number, target: number, max: number): number => (target > x + max ? x + max : target < x - max ? x - max : target);

/** Aim pocket rest in the chest frame: x as a fraction of the shoulder half-width, y below the shoulder, z forward. */
export const AIM_POCKET = { x: 0.3, y: -0.1, z: 0.27 };
/** (BC note 6) Extra release time constant (s) of the pelvis drop at a walking pace and above (bob damping). (CT prototype G1,
 *  audit rows 5 / 6) 0.7 -> 0.06: the held drop kept the walk on 30-60 deg knees all cycle; the toe raise (HEEL_RAISE) now
 *  keeps the dip small instead. Starting value. */
export const PELVIS_HOLD = 0;
/**
 * (anim-natural N2, n138 fix 2) The keyed pelvis offset's top speed (m/s, height and forward each). The keyed run's pelvis
 * sits 21 cm higher and 10 cm further forward than the jog's (run.ts / jog.ts means), cross-faded over 3.2-3.8 m/s
 * (KEYED_GAITS): a run's 180 brake (~22 m/s2) crossed most of that band in one frame, the hips dropped 10 cm, the planted
 * knee needed 44 deg in a frame, its joint rate (25 rad/s) held it and the planted foot slid 14 cm (e2e-anim run 180,
 * 16.5 cm headless); the re-acceleration's rise slid the next plant 6.9 cm. A clip's own bob stays under ~0.6 m/s (the
 * run's ~1 cm a frame), so only a band crossing is eased. Headless (tests/turnCrossRig.test.ts): 1.8 left 7.0 cm, 1.5
 * 1.7 cm, 1.2 every turn row <= 0.01 cm; the identity fixtures move on partner:moves only.
 */
export const KEY_PEL_RATE = 1.2;
/** (mt2-fixB) With clip feet on hand, a knee pole's swing / stance share moves at most 1 / POLE_SWAP a second (0.5 ->
 *  0.15 in 0.09 s). */
const POLE_SWAP = 0.25;
/** (mt2-fixB) The seconds the mocap switch's cross-fade takes after a toggle mid-move (`switchFade`). */
const SWITCH_FADE = 0.25;
/** (mt2-fixB) The first seconds of that cross-fade the pose goes on as it was going (`switchFade`). */
const SWITCH_HOLD = 0.05;
/** (mt2-fixB) `switchFade`'s node list: the legs (hip, knee, ankle, toe; L, R alternating) from this index. */
const XF_LEG0 = 13;
/** (mt2-fixB) `switchFade`: the most a node turns (rad) and the hips move (m: side, height, forward) a 60 Hz frame while it runs. */
const SWITCH_STEP = 0.35;
/** (mt2-fixB) `switchFade`: the most a swinging ankle moves (m, root frame) a 60 Hz frame while it runs. */
const SWITCH_FOOT = 0.16;
const SWITCH_HIPS = [0.015, 0.03, 0.01] as const;
/** (mt2-fixB) `switchFade` scratch: the planted ankles and feet, the hip, two directions and the knee. */
const xfAL = new Vector3();
const xfAR = new Vector3();
const xfFL = new Quaternion();
const xfFR = new Quaternion();
const xfH = new Vector3();
const xfV = new Vector3();
const xfX = new Vector3();
const xfK = new Vector3();
const xfHint = new Vector3();
/** (G1 fix) The 3.2.0 hold for the aimed / wall gaits (stride 'velocity'). */
export const PELVIS_HOLD_AIM = 0.7;
/** Neck flexion at a full cheek weld (rad): the eye drops onto the sight line. */
export const NECK_WELD = 0.35;
/** Shoulders lift into the stock at a full weld (m): the raised arms elevate the shoulder girdle. */
export const SHOULDER_WELD = 0.04;
/**
 * (feature/weapons) A hand on the weapon beyond the arm's reach brings its shoulder forward towards it by up to this
 * much (m): the shoulder blade's protraction a shooter uses to reach the handguard (the rig has no collarbone; Wren's
 * support hand on the rifle's launcher was 6 cm out of reach, the arm at full stretch with the elbow up).
 */
export const PROTRACT_MAX = 0.07;
const protQ = new Quaternion();
/** (anim-cleanup) World grip scratch (no allocation) and the palm centre's depth under its skin (m). */
const gripOut = new Float64Array(7);
const gripYaw = new Quaternion();
const gripLocal = new Quaternion();
const PALM_DEPTH = 0.014;
const protV = new Vector3();
/** (anim-skeleton S2) Scratch: a clavicle's quaternion, the shoulder rest about the SC point, the SC point. */
const clavBuf = new Float64Array(4);
const clavV = new Vector3();
const scTmp = { x: 0, y: 0, z: 0 };
/** (anim-skeleton S4) Scratch for the leg deltas: the hip, solved knee, plant, raw and planted knee, a direction; the
 *  planted foot, the ankle delta, the raw hip / knee / ankle locals. */
const ldH = new Vector3();
const ldK0 = new Vector3();
const ldA0 = new Vector3();
const ldKr = new Vector3();
const ldKp = new Vector3();
const ldV = new Vector3();
const ldX = new Vector3();
const ldN = new Vector3();
const ldF0 = new Quaternion();
const ldD = new Quaternion();
const ldQh = new Quaternion();
const ldQk = new Quaternion();
const ldQa = new Quaternion();
/** (S2) The tuner's per-finger rows (Hands & feet): each hand's thumb curl index (spread next, then the next finger). */
const HP_FING_L = HP.thumbLCurl!;
const HP_FING_R = HP.thumbRCurl!;

/**
 * Wrist position relative to the palm point on the gun (weapon space: x across, y up, z along the bore;
 * x is mirrored for the left hand): the trigger hand's wrist sits behind the pistol grip, the support
 * hand's under and behind the handguard with the fingers wrapped over it.
 */
export const WRIST_TRIGGER: readonly [number, number, number] = [0.01, -0.015, -0.065];
export const WRIST_SUPPORT: readonly [number, number, number] = [0.015, -0.055, -0.035];

/** Knees point along the foot and this much outward (pole), so they never knock together in a side-step. */
export const KNEE_OUT = 0.12;
/** (ct-prototype E1) Climbing (ladder, drainpipe): the knee pole's up share (with forward 1): knees bend up and forward. */
export const CLIMB_KNEE_UP = 0.5;
/** (ct-prototype G4) Climbing, the knee pole's outward share at least this (the knees either side of the rungs / pipe). */
export const CLIMB_KNEE_OUT = 0.45;
/** (ct-prototype D1) After a draw / holster travel the hand's grip hold eases back to the graph's weight at this rate (1/s). */
const TRAVEL_HOLD_RATE = 5;
/**
 * (anim-natural N3) Seconds the trigger hand takes to let go of a gun just put away (seated in its slot): it eases off the
 * grip instead of leaving it in a frame (a holster's end moved the wrist 9 cm in one frame).
 */
const RELEASE_TIME = 0.4;
/** (anim-natural N3) Added to the trigger arm's elbow pole (body frame: out, up, forward) while a travel carries the gun. */
const TRAVEL_POLE = [0.5, 0.7, -0.15] as const;
/** (anim-natural N3) Time constants (s) of that pole easing in, and out after the travel (the elbow settles, no swing). */
const TRAVEL_POLE_TAU = 0.08;
const TRAVEL_POLE_OUT_TAU = 0.25;
/** (ct-prototype E1) Climbing, a planted sole stays at least this far (m) below the hip joints' rest height (see `lYc`). */
const CLIMB_FOOT_BELOW = 0.35;
/** Closest the two knee centres may come (m): two kneecaps side by side. */
export const KNEE_GAP = 0.15;
/** (CT prototype G8) Under the keyed walk the knees pass closer (its feet under the body, CT's narrow track): the bow-out
 *  rule starts at this centre distance (m) instead (e2e-clip keeps them >= 9 cm apart). */
export const KEYED_KNEE_GAP = 0.11;
/** (anim-rework S2) The bow-out rule's pole share per unit of closing under the keyed gaits (6 otherwise). */
export const KEYED_KNEE_BOW = 2.5;
/** (mocap-trial-2 strafe fix 2, the e2e-anim knee-out) In the mocap strafe (by its share, keyStrafe) the bow-out rule's pole
 *  share per unit of closing: just enough to part the knees. The captures' closed stance (ankles 9 cm apart, both feet down
 *  for 8 frames, OFF 1) brought the knees inside KEYED_KNEE_GAP, and 2.5 bowed both 2 cm past the gap (15 cm apart): the
 *  knees 3.4-3.5 cm outside their ankles. One unit of pole moves each bent knee about 0.2 m across the body (0.4 m of gap),
 *  so 0.11 m of gap per unit of closing needs 0.28: 0.5 keeps a margin. */
export const STRAFE_KNEE_BOW = 0.5;
/** A knee's centre never goes lower than this above the floor (m): the kneecap rests on it. */
export const KNEE_FLOOR = 0.05;
/** (CT prototype G1, audit rows 16 / 27) Moving crouched (sneak, crouch walk, crouch run) the rear knee stays this high
 *  (m): CT's knee never touches the floor while travelling; only the kneel puts it down. */
export const KNEE_FLOOR_MOVING = 0.12;
/** (G1) The knee-floor lift eases back down over this (s) moving crouched: the hips ride steady over the strides. */
const KNEE_LIFT_TAU = 0.4;
/** (G1, audit row 5) Standing, a planted leg reaches up to this share of its length before the pelvis drops (was 0.97,
 *  ~28 deg of knee bend at every plant): CT's standing stance and walk keep the stance knee near straight (~9 deg at full reach). */
export const SOFT_KNEE_STAND = 0.997;
/** (G1 fix) The most of its length a planted leg is asked to reach (the IK's margin under full stretch). */
const REACH_HARD = 0.999;
/** (G1 fix) Crouched, the planted-foot reach as a share of the leg (standing 0.62). */
const CROUCH_REACH = 0.8;
/** (G1 fix) Standing still, the hips settle at most this far (m) fore-aft toward the feet's midpoint. */
const REST_SHIFT = 0.22;
/** (mt2-fixC) While the mocap share keeps the hips off the feet, the settle moves at most this fast (m/s). */
const REST_SHIFT_RATE = 0.6;
/**
 * (anim-rework S3) Gliding aimed, the hips move `share` of the way across to the feet's centre (at most `max` m off the
 * capsule), eased over `tau` s: a side-step's weight goes onto the lead foot, then the trailing foot closes under it.
 */
export const GLIDE_HIP = { share: 1, max: 0.09, tau: 0.08 } as const;
/** (anim-fix-pass AF4a, Michael P4 "moves around constantly") Crouched, the glide's hips go only `share` of the way to the
 *  feet's centre (blended in by the crouch), and that shift changes at most `rate` m/s (/ the crouch): every short crouched
 *  shuffle moved the hips the full way at tau 0.08 with no limit (stop-go 8-11 cm p2p, flips 12.7). The share stays >= 0.85:
 *  under it the steady strafe's knee bows past 3 cm (e2e-anim's crouched aimed strafe knee-out gate). Standing: GLIDE_HIP. */
export const GLIDE_HIP_CROUCH = { share: 0.85, max: 0.09, rate: 0.03 } as const;
/** (mocap-trial-2 strafe fix) In the mocap strafe the hips stay this far (m) inside each planted foot across the body (the
 *  captures keep theirs 4.4 cm inside; the planted knee then stays over its toes). */
export const STRAFE_HIP_IN = 0.06;
/** (mocap-trial-2 strafe fix 3) In the mocap strafe the hips' sideways offset from the root (the keyed pelvis, GLIDE_HIP
 *  and STRAFE_HIP_IN together) changes at most this fast (m/s): after a flip or a restart the side-steps lag the root up to
 *  30 cm, the hold inside the planted feet grew to 23 cm and let go at its ease as a foot lifted (the hips jumped 3-4 cm a
 *  frame beyond the pace). A steady strafe moves it up to ~0.75 m/s (GLIDE_HIP over the long side-steps): under that the
 *  hips lagged their feet and the knees bowed out (0.3: knee-out 3.5 cm). */
export const STRAFE_HIP_RATE = 0.75;
/** (anim-rework S3, BRIEF 3 "elbows down and close to the ribs") With a gun in the hands the elbow pole's outward share
 *  is cut by this much at low ready (AIM_ELBOW_TUCK raised). */
export const READY_ELBOW_TUCK = 0.5;
/** (anim-rework S4) Crouched the low ready elbows tuck this much (the crouched trunk leans the shoulders over the gun:
 *  READY_ELBOW_TUCK left them 6.7 cm out in the crouched low ready walk, the leaning trunk 5.9 at 0.7). */
export const READY_ELBOW_TUCK_CROUCH = 0.8;
/** (anim-bake-targets) The arm IK pole's outward share (was the inline 0.55 in solveArm); the Body slider elbowPoleMul
 *  scales it, per state through the base table's `body` key. */
export const ELBOW_POLE_OUT = 0.55;
/** (anim-rework S4) The knee pole's outward share in the free kneel (KNEE_OUT 0.12 put the front knee 4.7 cm outside its
 *  ankle): the knees track over the toes. */
export const KNEEL_KNEE_OUT = 0.03;

/** Beyond this distance (m) from the camera a rig animates at half rate. */
export const ANIM_LOD_DISTANCE = 22;
/** Live animation LOD distance (3.0: x the Detail setting's scale; `setAnimLodScale`). */
let animLod = ANIM_LOD_DISTANCE;
export function setAnimLodScale(k: number): void {
  animLod = ANIM_LOD_DISTANCE * k;
}

const tmpA = new Vector3();
const tmpF = new Vector3();
const tmpB = new Vector3();
const tmpC = new Vector3();
const tmpD = new Vector3();
const tmpE = new Vector3();
const tmpPole = new Vector3();
/** (tuner-v2 item 2) Hand / foot IK target offset scratch. */
const handsV = new Vector3();
/** (fix 21-1, A81) Extra outward elbow pole (body x, against the pole's down 1) for the relaxed right arm over a thigh holster. */
const HOLSTER_ELBOW_OUT = 0.8;
/** (fix 21-2) The holster-out pole term eases in / out at this rate (1/s), so a draw never jumps the elbow. */
const HOLSTER_OUT_RATE = 8;
/** (step 21) Scratch body-space point for the ready-hands shoulder. */
const readyShTmp = { x: 0, y: 0, z: 0 };
/** (G6, AUDIT-WALLS row 18) The knee hand: the wrist this far (m) over the knee joint and ahead of it along the body
 *  (the palm on the kneecap, fingers over the front); the wall-side wrist `shin` of the way from knee to ankle and
 *  `shinFwd` m in front of the shin. Starting values (to check on the contact sheets). */
const KNEE_HAND = { up: 0.09, fwd: 0.03, shin: 0.45, shinFwd: 0.12 };
/** (anim-rework S4, BRIEF 3 "The crouched idle") The keyed squat's hands: each palm centre this far (m) over its knee
 *  joint (the kneecap's top) and ahead of it along the body (fingers over the front of the knee).
 *  (anim-natural N2, #138 fix round 4) fwd 0.01 -> 0.03 (the wall's KNEE_HAND.fwd): the palm on the kneecap, which sits
 *  ahead of the joint, not on the thigh just behind it. At 0.01 the right wrist sat over the end of the right thigh, and
 *  the crouch entry's re-step with N1's planner (left foot first: train 8, -3.2 cm) took e2e-clip "crouched holstered"
 *  to -3.0 cm on the GPU run (limit -3; master -2.7). Headless (the e2e sequence on a driven rig, 60 Hz sim / 120 Hz
 *  render, from 90 / 180 deg): squat -2.43 / -2.54 -> -1.87 / -1.92 cm, sneak -2.21 -> -1.73, the stop -1.79 -> -1.50,
 *  standing up -1.73 -> -1.44; e2e-anim's knee hand (palm within 7 cm of the knee top) ~1.4 -> ~3 cm. Undo: 0.01. */
export const KNEE_REST = { up: 0.06, fwd: 0.03 } as const;
const khS = new Vector3();
const khE = new Vector3();
const khW = new Vector3();
const khP = new Vector3();
const khT = new Vector3();
const khV = new Vector3();
const khF = new Vector3();
const khE2 = new Vector3();
const khW2 = new Vector3();
const legHint = new Vector3();
const legPole = new Vector3();
/**
 * Recompute one node's world matrix from its parent's current one. `computeWorldMatrix(true)` re-forces
 * the whole parent chain on every call (it was 35% of the sim's CPU at 10 rigs); the rig instead
 * refreshes nodes top-down once after changing them, so each node is computed from a fresh parent.
 */
function fresh(n: TransformNode): void {
  (n as unknown as { _isDirty: boolean })._isDirty = true;
  n.computeWorldMatrix();
}

/** Refresh `n` and its ancestors below `anchor` (already fresh), top-down. */
function freshBelow(n: TransformNode, anchor: TransformNode): void {
  const p = n.parent as TransformNode | null;
  if (p && p !== anchor) freshBelow(p, anchor);
  fresh(n);
}

const tmpQ = new Quaternion();
// (G8) keyed walk temporaries
const kP = new Quaternion();
const kS = new Quaternion();
const kT = new Quaternion();
const kF = new Quaternion();
const kSave = new Quaternion();
const kV = new Vector3();
const kH = new Vector3();
// (anim-natural N4c) the elbow strike's arm target scratch
const sbFree = { x: 0, y: 0, z: 0 };

/** (T1a) The quaternion q[o..o+3] (x y z w) taken `w` of the way from identity (nlerp, normalised) into `out`. */
function keyPow(q: Float64Array, o: number, w: number, out: Quaternion): Quaternion {
  const sg = q[o + 3]! < 0 ? -1 : 1;
  const x = sg * q[o]! * w;
  const y = sg * q[o + 1]! * w;
  const z = sg * q[o + 2]! * w;
  const ww = 1 + (sg * q[o + 3]! - 1) * w;
  const l = Math.sqrt(x * x + y * y + z * z + ww * ww) || 1;
  out.set(x / l, y / l, z / l, ww / l);
  return out;
}
/**
 * (operators step 11e) An elbow keeps this far (m) outside the trunk's half depth from the trunk line (pelvis -> neck
 * base). A rate-limited arm swinging from a back draw to the grip (G72's lower shoulder) passed the elbow through the
 * chest for a frame (e2e-clip "aim walking + crouched" -6.9 cm).
 */
const ELBOW_TRUNK_MARGIN = 0.02;
const elbQ = new Quaternion();
const elbAxis = new Vector3();
const elbHand = new Quaternion();
const clrDir = new Vector3();
/** (anim-natural N3) Time constant (s) of the pocket's clearance push while a travel carries the gun to it. */
const TRAVEL_PUSH_TAU = 0.07;
const clrM = new Matrix();
/** Body capsules for the weapon push-out, 8 floats each: start xyz, segment xyz, 1/|segment|^2, radius. */
const CLR_N = 6;
const clrCap = new Float64Array(CLR_N * 8);
/** Gun sample points (world xyz), bore line and top edge. */
const CLR_PTS = 14;
const clrPts = new Float64Array(CLR_PTS * 3);
function clrSet(k: number, a: Vector3, b: Vector3, r: number): void {
  const o = k * 8;
  clrCap[o] = a.x;
  clrCap[o + 1] = a.y;
  clrCap[o + 2] = a.z;
  const sx = b.x - a.x;
  const sy = b.y - a.y;
  const sz = b.z - a.z;
  clrCap[o + 3] = sx;
  clrCap[o + 4] = sy;
  clrCap[o + 5] = sz;
  const l2 = sx * sx + sy * sy + sz * sz;
  clrCap[o + 6] = l2 > 1e-9 ? 1 / l2 : 0;
  clrCap[o + 7] = r;
}
const headPt = new Vector3();
const ankLPt = new Vector3();
const ankRPt = new Vector3();
/** A node's world position from its (already fresh) parent: no world matrix of its own to refresh. */
function posIn(n: TransformNode, out: Vector3): Vector3 {
  return Vector3.TransformCoordinatesToRef(n.position, (n.parent as TransformNode).getWorldMatrix(), out);
}
/** Raised, the sight line sits this far (m) above the head centre: the eye line of the stick head. */
const SIGHT_EYE = 0.0;
/** (step 12b) The most the pelvis sinks to keep the head under a low wall's top (m). */
const HEAD_CAP_MAX = 0.3;
/** Body clearance kept around the held weapon (m). */
const CLEAR_MARGIN = 0.015;
const tmpQ2 = new Quaternion();
const tmpQ3 = new Quaternion();
/** (anim-n4b) The roll's spin axis and a turned foot point (applyTargets; reused). */
const rollAxisV = new Vector3();
const rollV = { x: 0, y: 0, z: 0 };
/** (21w) Weapon glide scratch. */
/** (anim-gear) `gearPlace`'s result (position, rotation). */
const gearRes = new Float64Array(7);
/** (anim-goggle) `GOGGLE_OFFSET.inUse` kept across a Wren rig's goggle write (x, y, z, pitch, yaw, roll). */
const goggleSave = new Float64Array(6);
const glideInv = new Matrix();
const glideLocal = new Matrix();
const glideS = new Vector3();
const glideV = new Vector3();
const glideQ = new Quaternion();
const glideBodyInv = new Matrix();
/** (21w, PC-PASS 42) Weapon re-parent glide: seconds per metre of the offset, and its clamp (s). At 0.9 s/m the
 *  glide's peak speed (smoothstep, 1.5 x mean) stays about 1.7 m/s, under 3 cm per 60 Hz frame. */
const GLIDE_PER_M = 0.9;
const GLIDE_MIN = 0.1;
const GLIDE_MAX = 0.45;
/** Farther than this (m) the last pose is stale (or a teleport): the weapon is placed, not glided. (21w-3) 0.4 (was
 *  0.8): a longer straight glide (a wall draw from the back, 0.6-0.85 m) crossed the torso (audit walllow selfUpperArm). */
const GLIDE_FAR = 0.4;
/** (21w-3) Larger turns (rad) than this are not glided (set at once). */
const GLIDE_TURN_MAX = 1.0;
/** (21w-5) The support hand's wall point must sit this far (m) out on the hand's own side of the body (root frame) to
 *  take the hand, full over `span` more. */
const WALL_HAND_SIDE = { min: 0.05, span: 0.15 };
const axX = new Vector3();
const axY = new Vector3();
const axZ = new Vector3();

/** World rotation whose local -Y points along `dir` and local +Z leans towards `hint`. */
function boneRotation(dir: Vector3, hint: Vector3, out: Quaternion): Quaternion {
  axY.copyFrom(dir).scaleInPlace(-1).normalize();
  const d = Vector3.Dot(hint, axY);
  axZ.copyFrom(hint).subtractInPlace(axY.scale(d));
  if (axZ.lengthSquared() < 1e-8) axZ.set(0, 0, 1);
  axZ.normalize();
  Vector3.CrossToRef(axY, axZ, axX);
  return Quaternion.RotationQuaternionFromAxisToRef(axX, axY, axZ, out);
}

/** (step 11) How far in front of a wall's face the ankles stay (m): the heel clear of it. */
const WALL_FOOT_CLEAR = 0.1;
/** (G6 fix) A knee closer than this (m) to the wall face swings its pole `WALL_KNEE_SWING` away from it. */
const WALL_KNEE_CLEAR = 0.08;
const WALL_KNEE_SWING = 0.6;
/** (G6 fix) The elbow joint's least distance (m) to a wall face (the upper arm's radius at the elbow plus 5 mm). */
const WALL_ELBOW_CLEAR = 0.045;

/**
 * The shared humanoid: one skeleton and one smooth part set for the player, enemies, coop
 * remotes, training dummies and the customiser preview. Feet at the origin, facing +Z.
 *
 * Joint hierarchy: root -> body (tumble pivot) -> pelvis -> spine -> chest -> neck -> head;
 * chest -> shoulder -> elbow -> wrist; pelvis -> hip -> knee -> ankle. Limbs hang along -Y in the
 * bind pose. Each frame `animate` runs the AnimGraph, then two-bone IK places arms (on the weapon's
 * grip and foregrip, or free swing targets) and legs (on the gait's planted foot targets).
 */
/** (Step 14) every live rig (render-only passes such as thermal vision's warmth walk it without an iterator). */
export const LIVE_RIGS: CharacterRig[] = [];

export class CharacterRig {
  readonly root: TransformNode;
  readonly body: TransformNode;
  readonly parts: AbstractMesh[] = [];
  readonly p: Proportions;
  /** Pelvis (kept as `hips` for older callers). */
  readonly hips: TransformNode;
  readonly spine: TransformNode;
  /** Upper spine (kept as `torso` for older callers). */
  readonly torso: TransformNode;
  readonly neck: TransformNode;
  readonly shoulderL: TransformNode;
  readonly shoulderR: TransformNode;
  /**
   * (anim-skeleton S2, A2) The clavicles: under the chest at the sternoclavicular points (anim/clavicle.ts), identity at
   * rest. Not the shoulders' parents (the shoulders' world transforms stay bit-identical): a turned clavicle carries its
   * shoulder's rest about the SC point (`solveArm`) and drives the skin's clavicle joint (the figure's poser).
   */
  readonly clavL: TransformNode;
  readonly clavR: TransformNode;
  /**
   * (S2) Clavicle input (anim/clavicle.ts layout: per side pitch, yaw, roll in degrees, chest frame) for a test or dev
   * tool; (S3) the clip channel and (S4) the Joints clavicle rows turn on the node beside it (`clavFrame`). Zero: identity.
   */
  readonly clavIn = new Float64Array(CLAV_LEN);
  /** (S2) Per side whether the clavicle is turned this frame. */
  private readonly clavOn = new Uint8Array(2);
  /**
   * (anim-skeleton S3) The clip's clavicle channel this frame (L, R quaternions in the chest frame, already weighted),
   * a quaternion path beside the Euler `clavIn` (no Euler round trip); per side whether it turns (0: not keyed).
   */
  private readonly clavKey = new Float64Array(8);
  private readonly clavKeyOn = new Uint8Array(2);
  /** (S3) 1 while the clip's finger channel is in `fingerClip` (cleared once when it stops; else the slot is untouched). */
  private fingClipOn = 0;
  /**
   * (anim-skeleton S4) Per side, cm the planted foot (its ankle) moved off the planner's solved plant during its current
   * contact (the most this contact), by the clip's FK legs or leg deltas; 0 when the foot is not planted or nothing
   * keyed turns the leg. The studio shows it (Course Ready's line); the re-solve keeps it ~0. Written each frame, no
   * allocation.
   */
  readonly footSlide = { l: 0, r: 0 };
  /** (S4) The planted ankles before the keyed leg stages (world, L then R) and last frame's contacts (footSlide). */
  private readonly plantAt = new Float64Array(6);
  private readonly slideContact = new Uint8Array(2);
  /**
   * (S2, A9) The hands' per-finger curl and spread (anim/fingers.ts layout), composed at the end of each frame: the grip
   * closure's shape (`handGrip`), this rig's own Hands & feet finger rows (tuner), and `fingerClip`. The figure turns
   * them into the finger joints. Render side only.
   */
  readonly fingers = new Float64Array(FING_LEN);
  /** (S2) Per-finger input slot (curl / spread offsets, same layout) for S3's clip channel; a test may set it. */
  readonly fingerClip = new Float64Array(FING_LEN);
  /**
   * (S2) The goggle gear offsets (goggle.ts GOGGLE_OFFSET: stowed x y z pitch yaw roll, then in use) as they stood inside
   * this rig's animate window (its tuner window): the figure reads this copy, so per-rig values written in the window
   * reach the right body.
   */
  readonly goggleOff = new Float64Array(12);
  readonly elbowL: TransformNode;
  readonly elbowR: TransformNode;
  readonly wristL: TransformNode;
  readonly wristR: TransformNode;
  readonly hipL: TransformNode;
  readonly hipR: TransformNode;
  readonly kneeL: TransformNode;
  readonly kneeR: TransformNode;
  readonly ankleL: TransformNode;
  readonly ankleR: TransformNode;
  /**
   * (anim-rig) The toe joints at the ball of each foot (children of the ankles, the operator LODs' skinned `toeL` /
   * `toeR`): pitched up as the planted foot rolls onto its ball (`toePitch`, anim/toeRoll.ts), so the toes stay flat.
   */
  readonly toeL: TransformNode;
  readonly toeR: TransformNode;
  /**
   * (anim-rig) Sling sockets for a slung long gun (docs/anim-rework/RIG.md): `slingBack` on the chest at the left
   * shoulder blade (where the sling's rear end anchors on the back plate), `slingHip` on the pelvis at the left hip (the
   * belt's quick-detach sling socket). Rest frames match their parents' (+X right, +Y up, +Z forward); a player rig
   * moves them onto Wren's own kit (playerFigure.ts, WREN_SLING). Nothing is parented to them yet.
   */
  readonly slingBack: TransformNode;
  readonly slingHip: TransformNode;
  /** Right hand socket (kept as `weaponSocket`). */
  readonly weaponSocket: TransformNode;
  /** Aim pocket: the held weapon is parented here (points +Z along the aim). */
  readonly weaponPivot: TransformNode;
  /** Holster sockets: long guns across the back, pistol on the right hip. */
  readonly backSocket: TransformNode;
  readonly hipSocket: TransformNode;
  /** Head centre (headshot hit volume). */
  readonly headNode: TransformNode;
  readonly graph: AnimGraph;
  readonly input: AnimInput = defaultInput();
  /** Weapon-local grip and foregrip points for the hands (set by whoever attaches the weapon). */
  readonly grip = new Vector3(0, -0.05, 0);
  readonly foregrip = new Vector3(0, -0.04, 0.22);
  /** Off-hand reload target (magazine), weapon-local. */
  readonly magPoint = new Vector3(0, -0.14, 0.12);
  /** Held weapon extent along its bore (weapon space: stock end z0 .. muzzle z1) and bore / top heights,
   *  for the body clearance push-out (set by `WeaponModel.hold`). */
  readonly gunSpan = { z0: -0.3, z1: 0.5, bore: 0.04, top: 0.1 };
  /**
   * (feature/weapons) How closed each hand is round something it holds, 0..1, after each pose: the weapon's grip and
   * support point, the magazine, a world grip (rung, pipe, ledge); open on a wall. Render only: the operator figure's
   * finger-grip morph targets (gameplay never reads it).
   */
  readonly handGrip = { l: 0, r: 0 };
  /**
   * (feature/weapons) The body's own thigh holster (an operator's built holster, e.g. WREN_HOLSTER): the sidearm's frame
   * from the right hip joint (axes as columns) and the weapon point placed at its origin; null: the generic thigh slot.
   */
  thighMount: { origin: readonly number[]; x: readonly number[]; y: readonly number[]; z: readonly number[]; centre: readonly number[] } | null = null;
  /**
   * (feature/weapons) The body's own back mount (an operator's back plate sockets, e.g. WREN_BACK_MOUNT): per back slot the
   * socket face from the chest joint, the muzzle direction and out from the back; null: the generic back slots.
   */
  backMount: Readonly<Record<'backL' | 'backC' | 'backR', { readonly origin: readonly number[]; readonly up: readonly number[]; readonly out: readonly number[] }>> | null = null;
  /** (feature/weapons) The shoulders' height this pose (the weld's), before any protraction. */
  private shoulderY = 0;
  /** (feature/weapons) A drawn knife in the right fist (KnifeModel): the hand stays closed. */
  holdingKnife = false;
  /** (anim-cleanup) The right hand is on a held weapon's trigger grip (the figure's trigger finger shape). */
  get rightTrigger(): boolean {
    const on = this.heldWeapon !== null && this.handBlend < 0.5 && this.reachR.w < 0.5 && !this.holdingKnife;
    // (tuner-v2 item 2) the local player's trigger finger mode (0 auto: the rig's own; set inside its tuner window only)
    if (this.triggerTune < 0) return false;
    if (this.triggerTune > 0) return this.heldWeapon !== null && !this.holdingKnife;
    return on;
  }
  /** (tuner-v2 item 2) Trigger finger mode from the tuner this frame: -1 off, 0 auto, 1 on (only the local player's). */
  triggerTune = 0;
  /** (anim-joints J1) This rig's tuner window state (`tuneRows`); null: the rig never reads the tables. */
  tuneSt: TuneRigState | null = null;
  /**
   * (anim-joints J1, A2 / A7) A Wren rig reads the animation base table and the tuner's Joints / Hands & feet / IK /
   * Weapon deltas (set where the rig is made: `operatorRig`). Its state is allocated once here; off for every other rig.
   */
  get tuneRows(): boolean {
    return this.tuneSt !== null;
  }
  set tuneRows(on: boolean) {
    if (on && !this.tuneSt) this.tuneSt = tuneRigState();
    else if (!on) this.tuneSt = null;
    // (anim-bake-1022) a Wren rig holds Wren's low ready / pistol ready, every other rig the guards' (a reference swap)
    this.graph.wrenReady = on;
    // (item 24, track A) a Wren rig's planner reads Wren's Stepping rows (the shared table), any other the identity table
    if (!this.guardSt) this.planner.stepRows = on ? null : STEP_IDENTITY_ROWS;
    // (idle-shins) a Wren rig's teleport plants the feet inside the stance band's floor
    this.planner.resetBand = on && !this.guardSt;
  }
  /** (item 24, track A) This guard rig's window state on the guard tables (`guardRows`); null: not a guard rig. */
  guardSt: GuardRigState | null = null;
  /**
   * (item 24, track A) A guard rig reads the guard base table and the tuner's guard rows (Guard joints, Guard stepping,
   * Guard weight; `tuneGuard.ts`), never Wren's: set where a guard's rig is made (`buildEnemyRig`: the host's guards
   * and the co-op client's puppets). Its planner reads the guards' stepping table. Off for every other rig.
   */
  get guardRows(): boolean {
    return this.guardSt !== null;
  }
  set guardRows(on: boolean) {
    if (on && !this.guardSt) this.guardSt = guardRigState();
    else if (!on) this.guardSt = null;
    this.planner.stepRows = on ? GUARD_STEP_ROWS : this.tuneSt ? null : STEP_IDENTITY_ROWS;
  }
  /**
   * (anim-gear, marlow-bays item 22) The version of this rig's gear offsets (`tuneGear.ts`; 0 on a rig without
   * `tuneRows`): a carried item placed at another version takes its slot again (`WeaponModel`). Visual only (G-A3).
   */
  get gearVer(): number {
    return this.tuneSt ? this.tuneSt.gear.ver : 0;
  }
  /**
   * (anim-gear) A carried item just placed in its slot (`node`'s position and rotation in its parent's frame), the
   * slot's pivot at (vx, vy, vz) in the item's frame: this rig's offset of `socket` (`tuneGear.ts` GS) applied in place
   * (moved in the slot's frame, turned about the pivot). No offset (not a Wren rig, nothing live): untouched. No
   * allocation.
   */
  gearPlace(node: TransformNode, socket: number, vx: number, vy: number, vz: number): void {
    const ts = this.tuneSt;
    const q = node.rotationQuaternion;
    if (ts === null || q === null) return;
    const p = node.position;
    if (!gearCompose(ts.gear, socket, p.x, p.y, p.z, q.x, q.y, q.z, q.w, vx, vy, vz, gearRes)) return;
    p.set(gearRes[0]!, gearRes[1]!, gearRes[2]!);
    q.copyFromFloats(gearRes[3]!, gearRes[4]!, gearRes[5]!, gearRes[6]!);
  }
  /** (anim-gear) The gear version the sling nodes were placed at. */
  private gearNodesVer = 0;
  /** (anim-gear) The hip sling node's own place while an offset is on it (slots 7..13; 0..6 unused since slingBack was dropped). */
  private readonly gearNodeBase = new Float64Array(14);
  /** (anim-gear) Bit 2: slingHip offset. */
  private gearNodeOn = 0;

  /** (anim-gear) The sling nodes take their sockets' offsets (from their own places) when this rig's gear changed. */
  private gearNodes(): void {
    const ts = this.tuneSt;
    if (ts === null || ts.gear.ver === this.gearNodesVer) return;
    this.gearNodesVer = ts.gear.ver;
    this.gearNode(ts, this.slingHip, GS.slingHip, 7, 2);
  }

  private gearNode(ts: TuneRigState, n: TransformNode, s: number, o: number, bit: number): void {
    const q = n.rotationQuaternion;
    if (!q) return;
    const p = n.position;
    const b = this.gearNodeBase;
    const live = ts.gear.live[s] === 1;
    if ((this.gearNodeOn & bit) === 0) {
      if (!live) return;
      b[o] = p.x;
      b[o + 1] = p.y;
      b[o + 2] = p.z;
      b[o + 3] = q.x;
      b[o + 4] = q.y;
      b[o + 5] = q.z;
      b[o + 6] = q.w;
      this.gearNodeOn |= bit;
    }
    p.set(b[o]!, b[o + 1]!, b[o + 2]!);
    q.copyFromFloats(b[o + 3]!, b[o + 4]!, b[o + 5]!, b[o + 6]!);
    if (!live) {
      this.gearNodeOn &= ~bit;
      return;
    }
    this.gearPlace(n, s, 0, 0, 0);
  }
  /**
   * (tuner-v2 item 2) The held gun's model (WeaponModel.hold sets it): the tuner's visual gun transform goes on its
   * rendered mesh while `node` is `heldWeapon`. Gameplay never reads it.
   */
  heldModel: { readonly node: TransformNode; tuneVisual(v: GunVisual | null): void } | null = null;
  /** (anim-cleanup) The weapon is changing hands (the shoulder swap or the open-left wall edge, eased). */
  get handSwitching(): boolean {
    return this.handSwap >= 0;
  }
  /** (anim-cleanup) A magazine in the left hand (a reload, on its way to and from the pouch): the hand stays closed. */
  holdingMag = false;
  /** (feature/weapons) The support hand's hold: under a handguard / launcher tube (long guns) or cupping a pistol grip. */
  supportStyle: 'tube' | 'cup' = 'tube';
  /** (feature/weapons) Solved holds of the body's own hands (`setHands`), index 0 right, 1 left; null: the rig's constants. */
  private holds: Record<HoldName, { q: Quaternion; w: Vector3 }>[] | null = null;

  /**
   * (feature/weapons) An operator body's hands (their rest frames, e.g. WREN_HANDS): the weapon holds then put that
   * hand's palm on the grip with the knuckles round it (handHold.ts) instead of the rig's generic wrist offsets.
   */
  /**
   * (feature/weapons) The wrist's offset from the weapon point for a hand in a hold (weapon space), or null when the body
   * has no hands of its own (the rig's WRIST_TRIGGER / WRIST_SUPPORT apply). Tests and tools.
   */
  wristOffset(side: 1 | -1, hold: HoldName): Vector3 | null {
    return this.holds ? this.holds[side > 0 ? 0 : 1]![hold].w : null;
  }

  /** (anim-cleanup) The body's own hands' rest frames (world grips solve onto them each frame); null: none. */
  private handRest: { readonly L: HandFrame; readonly R: HandFrame } | null = null;
  /** (anim-cleanup) Per hand (0 right, 1 left): a world grip's solved wrist rotation this frame, valid when gripOk. */
  private readonly gripQ = [new Quaternion(), new Quaternion()];
  private readonly gripOk = [false, false];
  /** (anim-cleanup, check fix r1) Per hand: where the palm centre should sit this frame (world), for gripError. */
  private readonly gripPalm = [new Vector3(), new Vector3()];

  /**
   * (anim-cleanup) For a body with its own hands on a world grip with an axis: how far (m) its palm centre is from where
   * it should sit (the grip's surface plus the palm's depth), else null. Tests and tools; allocates.
   */
  gripError(side: 1 | -1): number | null {
    const r = side > 0 ? this.reachR : this.reachL;
    const ax = r.ax ?? 0, ay = r.ay ?? 0, az = r.az ?? 0;
    if (!this.handRest || r.w < 0.5 || ax * ax + ay * ay + az * az < 0.5 || !this.gripOk[side > 0 ? 0 : 1]) return null;
    const hand = side > 0 ? this.handRest.R : this.handRest.L;
    const m = (side > 0 ? this.wristR : this.wristL).computeWorldMatrix(true);
    const p = Vector3.TransformCoordinates(new Vector3(hand.palm[0], hand.palm[1], hand.palm[2]), m);
    // the palm centre against where the solve put it (on the real geometry: the rung, the pipe, the lip)
    return Vector3.Distance(p, this.gripPalm[side > 0 ? 0 : 1]!);
  }


  setHands(h: { readonly L: HandFrame; readonly R: HandFrame } | null): void {
    this.handRest = h;
    if (!h) {
      this.holds = null;
      return;
    }
    const one = (f: HandFrame, side: 1 | -1): Record<HoldName, { q: Quaternion; w: Vector3 }> => {
      const out = {} as Record<HoldName, { q: Quaternion; w: Vector3 }>;
      for (const k of Object.keys(HOLDS) as HoldName[]) {
        const r = solveHold(f, HOLDS[k], side);
        out[k] = { q: new Quaternion(r.q[0], r.q[1], r.q[2], r.q[3]), w: new Vector3(r.wrist[0], r.wrist[1], r.wrist[2]) };
      }
      return out;
    };
    this.holds = [one(h.R, 1), one(h.L, -1)];
  }
  /** Last body push-out applied to the weapon (m), for tests and the debug overlay. */
  gunPush = 0;
  /** Weapon node whose grips the hands follow (null = free arms). */
  heldWeapon: TransformNode | null = null;
  /**
   * (ct-prototype D1) The weapon node a draw / holster travel is carrying (WeaponModel sets it; null: none): while it is
   * `heldWeapon` the grip stays at 1. (fix r1) A node, not a flag: a travel abandoned without its end (death, the weapon
   * removed or disposed mid-travel) can never hold the grip of anything else.
   */
  travelNode: TransformNode | null = null;
  /** (ct-prototype D1) A travel is carrying the held weapon now. */
  get weaponTravel(): boolean {
    const n = this.travelNode;
    return n !== null && n === this.heldWeapon && !n.isDisposed() && n.isEnabled(false);
  }
  /** (ct-prototype D1) The trigger hand's grip hold from a travel (1 while it runs, easing out after). */
  private travelHold = 0;
  /**
   * (anim-natural N3) While a travel runs: the trigger hand's IK weight onto the gun's grip (WeaponModel writes it: 0 at
   * the start of a draw from the slot, eased to 1 over the reach, anim/drawMotion.ts; 1 for every other travel). The
   * fingers close over its last part (`gripClose`).
   */
  travelReach = 1;
  /** (anim-natural N3 fix) The trigger hand's weight still on `node` as it lets go of it (0: not letting go of it). */
  releaseOf(node: TransformNode): number {
    return node === this.relNode ? this.relK : 0;
  }
  /** (anim-natural N3) The gun the trigger hand is letting go of (put away last frame), its weight left, eased (0..1). */
  private relNode: TransformNode | null = null;
  private relPrev: TransformNode | null = null;
  private relW = 0;
  private relK = 0;
  /** (anim-natural N3 fix) The trigger hand's weight on the held gun last frame (a release starts from it). */
  private relFrom = 1;
  /** (anim-natural N3) That gun's grip point (weapon space), and the held gun's, kept each frame. */
  private readonly relGrip = new Vector3();
  private readonly relGripPrev = new Vector3();
  /** (anim-natural N3) The travel's elbow pole weight (TRAVEL_POLE), eased. */
  private travelPoleK = 0;
  /** (anim-natural N3) The pocket's body-clearance push (torso frame), eased while a travel runs (`clearBody`). */
  private readonly travelPush = new Vector3();
  /** (anim-natural N3) The raise to the aim this frame (the graph's aim weight, 0 at the ready .. 1 aimed; read only). */
  get aimWeight(): number {
    return this.aimK;
  }
  /**
   * (step 09, A42) Carries weapons slung / holstered (the player and remote players): with the hands empty on foot
   * the arms take the ready hands and the body keeps the armed carriage. Remotes pose it from `dw` (their weapon in
   * hand follows it), so local and remote match.
   */
  carrier = false;
  /** (3.2.0) World aim of a raised weapon (`RigPose.aimWorldYaw`), null when body-relative. */
  private aimWorldYaw: number | null = null;
  private aimWorldPitch = 0;
  /** Head-only glance (see `RigPose.lookYaw`). */
  private lookYaw = 0;
  private lookPitch = 0;
  /** Depth (m) of gear on the back beyond the chest shell (carried weapons stand off it). */
  backGear = 0;
  /** Sideways reach (m) of the thigh's surface and gear from the hip joint. */
  thighOuter = 0;
  /** (fix 21-2) Visible weapons holstered on the right thigh (kept by WeaponModel; see `thighGear`). */
  thighCount = 0;
  /** (fix 21-1, A81) A visible weapon sits in the right-thigh holster (derived from WeaponModel's count). */
  get thighGear(): boolean {
    return this.thighCount > 0;
  }
  /** (fix 21-2) Eased 0..1 share of the holster-out elbow pole (follows `thighGear`). */
  private holsterW = 0;
  /** Called after each solved pose (carried gear that reacts to the body, e.g. a sling pushed by the thigh). */
  readonly onPosed: (() => void)[] = [];
  /** A scripted FK pose over the procedural result (a grabbed or hostage guard, the VIP; the player emotes that
   *  also used it were deleted, G24). */
  emote: ((rig: CharacterRig, t: number) => FkPose | void) | null = null;
  emoteTime = 0;
  private emoteW = 0;
  /**
   * Weapon in the left hand (open side on the left at a back-to-wall edge, D9): grip / support swap and a
   * mirrored aim pocket. Dormant until step 12b drives it (WALL_SUB.leftHand).
   */
  openLeft = false;
  /** (rig-pose-fix S7, G15) The drawn hand switch: this rig's own copy of the sim's clock (`HandSwitch`, the same math and
   *  target), eased at the render rate. Gameplay reads the sim's (`PlayerWeapons.hand`), never this. */
  private readonly hs = new HandSwitch();
  private get handBlend(): number {
    return this.hs.blend;
  }
  /**
   * (step 12b, light parity) The posed head centre and chest (torso joint) in world space, refreshed from the root:
   * perception's exposure points and the light meter's head sample read the real pose (a mirrored open-side lean,
   * the low-wall side lean under the top), never a separate model. Locally off the hot path (4-10 Hz); on the host
   * it is also called every render frame per remote on a wall (`CoopHost` -> `RemotePlayer.setPosedHead`): a matrix
   * refresh of the root and the neck chain, no allocation.
   */
  posedHead(out: Vector3): Vector3 {
    fresh(this.root);
    freshBelow(this.neck, this.root);
    return posIn(this.headNode, out);
  }
  posedChest(out: Vector3): Vector3 {
    fresh(this.root);
    freshBelow(this.torso, this.root);
    return out.copyFrom(this.torso.getAbsolutePosition());
  }
  /** (step 11) The hand holding the weapon now (1 right, -1 left): the other one goes on a wall. */
  get weaponHand(): number {
    return this.handBlend > 0.5 ? -1 : 1;
  }
  /** (step 21w, PC-PASS 42) The weapon gliding from where it was posed onto a new parent (aim pocket, hand, slot):
   *  its world offset (P0), local target (P1), local start / target rotation, the time and duration (s). One at a time; local and remote rigs alike (D8). */
  private glideNode: TransformNode | null = null;
  /** (anim-weight) The weapon gliding into a slot now (the carried-gear spring leaves it alone), or null. */
  get gliding(): TransformNode | null {
    return this.glideNode;
  }
  private readonly glideP0 = new Vector3();
  private readonly glideP1 = new Vector3();
  private readonly glideQ0 = new Quaternion();
  private readonly glideQ1 = new Quaternion();
  private glideT = 0;
  private glideDur = 0;

  /**
   * (step 21w, PC-PASS 42) A weapon node was just re-parented (`WeaponModel.hold / inHand / holster`) with its new local
   * place set; `prevWorld` is its last posed world matrix. It starts there (no jump) and eases onto the new place over
   * 0.1-0.45 s (by the distance), so a mid-draw release, a draw taken before the hand reaches the slot or the open-side
   * hand switch never pops the weapon or the hands on it. No allocation.
   */
  glideWeapon(node: TransformNode, prevWorld: Matrix): void {
    // a re-parent drops any glide still running on this node (an early return below would otherwise leave the old
    // parent's local place to be written into the new parent)
    if (this.glideNode === node) this.glideNode = null;
    const parent = node.parent as TransformNode | null;
    // on a wall only (the draw / holster elsewhere hands over at the slot and the pocket as authored)
    if (!parent || !node.rotationQuaternion || !this.input.wall) return;
    const pw = parent.getWorldMatrix();
    pw.invertToRef(glideInv);
    prevWorld.multiplyToRef(glideInv, glideLocal);
    glideLocal.decompose(glideS, glideQ, glideV);
    const a = 2 * Math.acos(Math.min(1, Math.abs(Quaternion.Dot(glideQ, node.rotationQuaternion))));
    // the position offset is kept in the body's frame (21w-3: in world space a body turn, the wall entry or a remote's
    // snapped yaw, left the gun behind and its straight line crossed the torso; a turning hand or chest still never
    // swings it round on a lever)
    Vector3.TransformCoordinatesToRef(node.position, pw, glideS);
    prevWorld.getTranslationToRef(glideV);
    glideV.subtractInPlace(glideS);
    const d = glideV.length();
    // a stale matrix (not posed since it was last shown) or a teleport: no glide

    if ((d < 0.004 && a < 0.02) || d > GLIDE_FAR) return;
    // a glide still running on another weapon ends where it was going
    if (this.glideNode && this.glideNode !== node) this.endGlide();
    this.glideNode = node;
    this.glideP1.copyFrom(node.position);
    this.glideQ1.copyFrom(node.rotationQuaternion);
    this.body.getWorldMatrix().invertToRef(glideBodyInv);
    Vector3.TransformNormalToRef(glideV, glideBodyInv, this.glideP0);
    // (21w-3) a large turn (a draw from the back or the thigh, the open-side hand switch: 70-180 deg) is not slerped:
    // the muzzle swept through the torso and the arms (audit selfWeapon / selfUpperArm); only the place glides
    this.glideQ0.copyFrom(a > GLIDE_TURN_MAX ? node.rotationQuaternion : glideQ);
    this.glideT = 0;
    this.glideDur = Math.max(GLIDE_MIN, Math.min(GLIDE_MAX, Math.max(d, a * 0.15) * GLIDE_PER_M));
    // starts exactly where it was posed
    Vector3.TransformNormalToRef(glideV, glideInv, glideS);
    node.position.addInPlace(glideS);
    node.rotationQuaternion.copyFrom(this.glideQ0);
  }

  private endGlide(): void {
    const n = this.glideNode;
    if (!n) return;
    n.position.copyFrom(this.glideP1);
    n.rotationQuaternion?.copyFrom(this.glideQ1);
    this.glideNode = null;
  }

  /** The glide's world offset (`glideP0`, decaying) mapped into the parent's space each frame. */
  private stepGlide(dt: number): void {
    const n = this.glideNode;
    const parent = n?.parent as TransformNode | null;
    if (!n || !n.rotationQuaternion || !parent) return;
    this.glideT += dt;
    const u = Math.min(1, this.glideT / this.glideDur);
    if (u >= 1) return this.endGlide();
    const e = u * u * (3 - 2 * u);
    parent.getWorldMatrix().invertToRef(glideInv);
    Vector3.TransformNormalToRef(this.glideP0, this.body.getWorldMatrix(), glideV);
    Vector3.TransformNormalToRef(glideV, glideInv, glideS);
    n.position.copyFrom(this.glideP1).addInPlace(glideS.scaleInPlace(1 - e));
    Quaternion.SlerpToRef(this.glideQ0, this.glideQ1, e, n.rotationQuaternion);
  }

  /** (21w-5) How far the shoulder line is turned off the wall line: the torso's right axis (last posed frame) along
   *  the wall normal (nx, nz), 0 square to the wall (back or chest on it) .. 1 side on. No allocation. */
  shoulderTurnSin(nx: number, nz: number): number {
    const m = this.torso.getWorldMatrix().m;
    const rx = m[0]!;
    const rz = m[2]!;
    return (rx * nx + rz * nz) / (hyp2(rx, rz) || 1);
  }

  /** World point for the off hand on the wall (back-to-wall contact IK, step 11), or null. */
  wallHand: Vector3 | null = null;
  /**
   * World grips for the hands, independent of any weapon (rungs, pipe, ledge lip, a victim in a takedown):
   * the palm point and a weight 0..1. Weighted over the weapon / clip target; the wrist sits behind the palm
   * along the reach so the hand closes on the grip. Set by attached traversal; zero weight = unused.
   */
  readonly reachL: WorldTarget = { x: 0, y: 0, z: 0, w: 0 };
  readonly reachR: WorldTarget = { x: 0, y: 0, z: 0, w: 0 };
  /** World sole targets for the feet (rungs, wall pads) and a weight 0..1; used while the feet are off the
   *  ground planner (airborne / traversing / attached). */
  readonly plantL: WorldTarget = { x: 0, y: 0, z: 0, w: 0 };
  readonly plantR: WorldTarget = { x: 0, y: 0, z: 0, w: 0 };
  /** Ground height under a world XZ (raycast) for foot IK, or null to skip. */
  groundProbe: ((x: number, z: number, yFrom: number) => number | null) | null = null;
  /** World-space foot placement (contacts, locking, swing arcs, idle stepping). */
  readonly planner = new FootPlanner();
  /** (anim-n4, track A) The body lift's crouch pose (cqGait.ts). */
  private readonly liftCrouch = new CqLiftCrouch();
  /** (anim-natural N4c) The elbow strike's hips and trunk this frame (strikeBody.ts; rest on every non-Wren rig). */
  private readonly sb = newStrikeBody();
  /** (strike-pops) The strike body layer's phase (`strikeBodyPhase`: the trunk's pace; -1 none). */
  private sbPh = -1;
  /** (3.2.0) Pinned feet (world x / z, left then right; NaN = free): a remote's feet on the owner's (`FootPlanner`). */
  readonly footPins = [NaN, NaN, NaN, NaN];
  private pin = emptyPlannerInput();
  private prevRootX = 0;
  private prevRootZ = 0;
  private velX = 0;
  private velZ = 0;

  /** (tuner-ui) The world slid by (dx, dz) under the body (the Anim Studio's treadmill): the feet and the root's last
   *  place move with it, so nothing reads it as a step or a jump. No allocation. */
  shiftWorld(dx: number, dz: number): void {
    this.planner.shift(dx, dz);
    this.prevRootX += dx;
    this.prevRootZ += dz;
  }

  /** (artnext C8) Before a solve after a skipped stretch (a guard thawed from the render freeze, or seeding his ragdoll):
   *  when the root moved more than `d` m (horizontal) since the last solve, the feet re-plant, as the 2 m jump rule in
   *  `animateFrame` does, instead of stretching back to where they were planted. Returns whether it reset. No allocation. */
  replantIfMoved(d: number): boolean {
    const p = this.root.position;
    const jx = p.x - this.prevRootX;
    const jz = p.z - this.prevRootZ;
    if (jx * jx + jz * jz <= d * d) return false;
    this.planner.L.init = this.planner.R.init = false;
    this.derive.reset();
    // (the measured velocity starts again from here, as after a jump; a guard's driver supplies its own)
    this.velX = this.velZ = 0;
    this.prevRootX = p.x;
    this.prevRootZ = p.z;
    return true;
  }
  /** (locomotion step 22) Acceleration and motion state derived from the measured velocity (remote copies). */
  private derive = new MotionDerive();
  private pelvisDrop = 0;
  /** (mocap-trial) Each foot's pitch as last posed (the switch on: rate-limited, MOCAP_FEET.pitchRate). */
  private footPitchL = 0;
  private footPitchR = 0;
  /** (mocap-trial, fix 2) The switch as last frame (turned off: the planner gets its feet back clean, `clipFootOff`). */
  private mocapWas = false;
  /** (mt2-guardgate, CHECK-6 R1) The switch for this rig this frame: `LOCO.mocap` on a carrier (the player, a remote player)
   *  only; guards and the menu preview keep the hand-keyed set and the planner's feet whatever the switch says. */
  private mOn = false;
  /** (mt2-fixB, CHECK-3 item 5) The switch's cross-fade: the skeleton's nodes (built on the first frame), their local
   *  rotations the last two frames (x, y, z, w each) and the hips' local position, the frames seen (to 2), the offsets
   *  a toggle eases out (rotations pre-multiplied, the hips' position added), seconds into it (-1: none). */
  private xfNodes: TransformNode[] | null = null;
  private xfQ1 = new Float64Array(0);
  private xfQ2 = new Float64Array(0);
  private xfD = new Float64Array(0);
  private readonly xfP = new Float64Array(9);
  /** (mt2-fixB) The ankles in the root frame (x, y, z; L, R): this frame, last frame, the offsets eased out; the knees. */
  private readonly xfA = new Float64Array(24);
  private xfSeen = 0;
  private xfStart = false;
  private xfT = -1;
  /** (mt2-fixB) Each leg's share of the cross-fade [L, R] (out by a swing's landing; 0 planted). */
  private readonly xfW = new Float64Array(2);
  /** (mt2-fixB) Each knee pole's eased swing / stance share [L, R] with clip feet on hand (-1: none, the share as is). */
  private readonly poleShare = new Float64Array([-1, -1]);
  /** (locomotion step 21, A80) Per foot 0..1: how far a planted foot has eased from full leg length to the soft knee. */
  /** Soft-knee share per foot [L, R] (0..1). (operators step 11e) A Float64Array, not two fields: the fields started as
   *  the integer 1 and turned fractional mid-match, a representation change that deoptimised the rig's hot update. */
  private readonly soft = new Float64Array([1, 1]);
  /** (fix 21-3) Per foot: the pelvis drop (m) it needed on its last planted frame (let go over its early swing). */
  private liftL = 0;
  private liftR = 0;
  /** (step 12b) Pelvis sink under a head cap (m) and the cap (world y), from `RigPose.headCap`. */
  private capDrop = 0;
  /** (G1) The knee floor in use (m), eased between KNEE_FLOOR_MOVING crouched on the move and KNEE_FLOOR. */
  private kneeFloor = KNEE_FLOOR;
  /** (G1) The pelvis lift held for the knee floor (m). */
  private kneeLift = 0;
  /** (G1 fix) The hips' fore-aft shift over the still feet (m, body frame). */
  private restShift = 0;
  /** (n138 fix 2) The keyed pelvis offset applied last frame (m: height, forward; KEY_PEL_RATE). */
  private keyPelY = 0;
  private keyPelZ = 0;
  /** (mocap-trial-2 strafe fix) The mocap strafe's hips shift inside the planted feet (m, eased; STRAFE_HIP_IN). */
  private strafeHip = 0;
  /** (mocap-trial-2 strafe fix 3) The hips's sideways shift (glideShift + strafeHip) applied last frame (m; STRAFE_HIP_RATE). */
  private strafeSum = 0;
  private keyPelOn = false;
  /** (anim-rework S3) The glide's lateral hip shift over the feet (m, eased; GLIDE_HIP). */
  private glideShift = 0;
  /** (locomotion step 21, M14) The ready-hands share this frame and the graph's shoulder for it (RigTargets). */
  private readyRf = 0;
  /** (G6) The graph's knee hand this frame (RigTargets.kneeHand: signed side x weight). */
  private kneeHandW = 0;
  /** (BC note 2) Aim raise weight this frame (tucks the elbows). */
  private aimK = 0;
  private readySh: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private headCap: number | undefined = undefined;
  /** Hand switch progress (open-left edge): 0..1 while changing hands, else -1. */
  get handSwap(): number {
    return this.hs.swap;
  }
  /** Smoothed world aim rotation of the weapon (inertia from the weapon's mass). */
  private aimQ: Quaternion | null = null;
  /** Joint-rate limiter hits (debug overlay warning counter). */
  limited = 0;
  /** Last graph output (debug overlay: layer weights, weapon bob). */
  lastTargets: ReturnType<AnimGraph['update']> | null = null;
  private lastFk: FkPose | null = null;
  private pelvisRest: number;
  private bodyPivot: number;
  private prevYaw: number | null = null;
  /** (A1.2) Measured yaw rate (no driver), smoothed. */
  private yawRateS = 0;
  /** (A1.2) Pelvis yaw toward the planted feet (rad, from the root), and the pelvis world yaw the knee poles use. */
  private follow = 0;
  /** (G8) This frame's keyed walk weight on the body (after the free-movement gate) and the knee pole out-share. */
  private keyWNow = 0;
  /** (G8) The keyed walk's weight on the body this frame (tests, the debug trace). */
  get keyedWalk(): number {
    return this.keyWNow;
  }
  private kneeOutNow = KNEE_OUT;
  private pelvisWorldYaw = 0;
  /** (G6 fix) The legs' yaw override this frame (side-on at a wall: the body's), NaN = the planner's foot yaws. */
  private legYaw = Number.NaN;
  /** (anim-n4b fix) A grounded roll this frame (the body spun / tumbled with `tumbleLift`): the knee poles turn with the body. */
  private rollPole = false;

  constructor(
    scene: Scene,
    make: PartFactory,
    look: AvatarLook,
    readonly height = 1.75,
    name = 'rig',
    opts: { build?: Build; armor?: boolean; style?: AvatarStyle; merge?: boolean } = {},
  ) {
    const p = proportions(opts.build ?? BUILD_OF[look.body], height);
    this.p = p;
    this.graph = new AnimGraph(p);
    // (item 24, track A) neither Wren's nor a guard's until `tuneRows` / `guardRows` says so: the identity stepping table
    this.planner.stepRows = STEP_IDENTITY_ROWS;
    const n = (nm: string, parent: TransformNode | null, x = 0, y = 0, z = 0): TransformNode => {
      const t = new TransformNode(`${name}-${nm}`, scene);
      t.parent = parent;
      t.position.set(x, y, z);
      t.rotationQuaternion = Quaternion.Identity();
      return t;
    };
    const Y = p.y;
    this.bodyPivot = Y.hip * 0.62;
    this.pelvisRest = Y.hip - this.bodyPivot;
    this.root = n('root', null);
    this.root.rotationQuaternion = null; // callers set root.rotation.y
    this.body = n('body', this.root, 0, this.bodyPivot, 0);
    this.hips = n('pelvis', this.body, 0, this.pelvisRest, 0);
    this.spine = n('spine', this.hips, 0, Y.waist - Y.hip, 0);
    this.torso = n('chest', this.spine, 0, 0.13 * (height / 1.75), 0);
    const chestY = Y.waist + 0.13 * (height / 1.75);
    this.neck = n('neck', this.torso, 0, Y.neck - chestY, 0);
    this.headNode = n('head', this.neck, 0, p.neck.len + p.head.h * 0.42, 0.01);
    this.shoulderL = n('shL', this.torso, -p.shoulderHalf, Y.shoulder - chestY, -0.01);
    this.shoulderR = n('shR', this.torso, p.shoulderHalf, Y.shoulder - chestY, -0.01);
    // (anim-skeleton S2) the clavicles at the SC points, placed off the rig's own chest and neck as the skin's are
    clavPoint(-1, Y.neck - chestY, scTmp);
    this.clavL = n('clavL', this.torso, scTmp.x, scTmp.y, scTmp.z);
    clavPoint(1, Y.neck - chestY, scTmp);
    this.clavR = n('clavR', this.torso, scTmp.x, scTmp.y, scTmp.z);
    this.elbowL = n('elL', this.shoulderL, 0, -p.upperArm.len, 0);
    this.elbowR = n('elR', this.shoulderR, 0, -p.upperArm.len, 0);
    this.wristL = n('wrL', this.elbowL, 0, -p.forearm.len, 0);
    this.wristR = n('wrR', this.elbowR, 0, -p.forearm.len, 0);
    this.hipL = n('hipL', this.hips, -p.hipHalf, -0.03, 0);
    this.hipR = n('hipR', this.hips, p.hipHalf, -0.03, 0);
    this.kneeL = n('knL', this.hipL, 0, -p.thigh.len, 0);
    this.kneeR = n('knR', this.hipR, 0, -p.thigh.len, 0);
    this.ankleL = n('anL', this.kneeL, 0, -p.calf.len, 0);
    this.ankleR = n('anR', this.kneeR, 0, -p.calf.len, 0);
    // (anim-rig) the ball of the foot, as operatorBody.ts's toe joint: on the floor, 45 % of the foot length ahead
    const ankleY = Y.hip - 0.03 - p.thigh.len - p.calf.len;
    this.toeL = n('toeL', this.ankleL, 0, -ankleY, p.foot.len * 0.45);
    this.toeR = n('toeR', this.ankleR, 0, -ankleY, p.foot.len * 0.45);
    this.slingBack = n('slingBack', this.torso, -p.shoulderHalf * 0.45, Y.shoulder - chestY - 0.07, -p.chest.d / 2 - 0.04);
    this.slingHip = n('slingHip', this.hips, -(p.pelvis.w / 2 + 0.02), -0.02, -0.05);
    this.weaponSocket = n('hand', this.wristR, 0, -p.hand.len * 0.45, 0);
    this.weaponPivot = n('aim', this.torso, p.shoulderHalf * 0.55, Y.shoulder - chestY - 0.1, 0.3);
    this.backSocket = n('back', this.torso, 0, Y.shoulder - chestY - 0.12, -p.chest.d / 2 - 0.07);
    this.backSocket.rotationQuaternion = Quaternion.RotationYawPitchRoll(Math.PI / 2, 0, -0.9);
    this.hipSocket = n('hipHolster', this.hips, p.pelvis.w / 2 + 0.03, -0.02, 0.0);
    this.hipSocket.rotationQuaternion = Quaternion.RotationYawPitchRoll(0, Math.PI / 2 - 0.15, 0);
    this.style = opts.style ?? DEFAULT_STYLE;
    if (this.style === 'stick') this.buildStick(make, look, p);
    else this.buildParts(make, look, p, opts.armor ?? false);
    // how far gear on the back (vest plate, hood, backpack) stands off the chest shell: carried weapons
    // rest beyond it
    let back = 0;
    for (const m of this.parts) {
      if (m.parent !== this.torso) continue;
      const rx = m.rotation.x;
      const half = (Math.abs(Math.cos(rx)) * m.scaling.z + Math.abs(Math.sin(rx)) * m.scaling.y) / 2;
      back = Math.max(back, -(m.position.z - half) - p.chest.d / 2);
    }
    this.backGear = back;
    // how far the thigh (hip ball, limb, cargo pocket) reaches out sideways from the hip joint: the thigh
    // holster and the hip sling rest beyond it
    let thigh = p.thigh.r0;
    for (const m of this.parts) if (m.parent === this.hipR || m.parent === this.hipL) thigh = Math.max(thigh, Math.abs(m.position.x) + m.scaling.x / 2);
    this.thighOuter = thigh;
    // (guard-render S1) opted in (guards): the parts merged into one rigidly skinned smooth mesh (they stay, unseen, for what reads them)
    const skin = ((this.parts[0] as InstancedMesh | undefined)?.sourceMesh?.metadata as { skinMaterial?: Material } | null | undefined)?.skinMaterial;
    if (opts.merge && this.style === 'detailed' && skin) this.voxel = buildSmoothBody(scene, this.root, this.parts, name);
    DEBUG_RIGS.add(this);
    LIVE_RIGS.push(this);
  }

  /** The merged smooth body (guard-render S1; null: the parts render). */
  voxel: SmoothBody | null = null;

  /** What renders (shadow casters): the merged body's meshes, else the parts. */
  get renderMeshes(): AbstractMesh[] {
    return this.voxel ? this.voxel.meshes : this.parts;
  }

  /** The camera hides the head when it gets too close. */
  setHeadVisible(v: boolean): void {
    if (this.voxel) this.voxel.setHeadVisible(v);
    else for (const m of this.parts) if (m.parent === this.headNode) m.isVisible = v;
    // (the goggle glow goes with the head: hidden in a first-person view)
    for (const g of this.glows) g.isVisible = v;
  }

  /** All joints, for the debug skeleton view. Pairs of (parent, child). */
  bones(): [TransformNode, TransformNode][] {
    return [
      [this.hips, this.spine],
      [this.spine, this.torso],
      [this.torso, this.neck],
      [this.neck, this.headNode],
      [this.torso, this.shoulderL],
      [this.torso, this.shoulderR],
      [this.shoulderL, this.elbowL],
      [this.elbowL, this.wristL],
      [this.shoulderR, this.elbowR],
      [this.elbowR, this.wristR],
      [this.hips, this.hipL],
      [this.hips, this.hipR],
      [this.hipL, this.kneeL],
      [this.kneeL, this.ankleL],
      [this.hipR, this.kneeR],
      [this.kneeR, this.ankleR],
    ];
  }

  /** Render style this rig was built with. */
  style: AvatarStyle = 'stick';

  /**
   * Classic stick figure on the same skeleton: a sphere head, thin capsule segments (spine, neck,
   * shoulder and hip bars, limbs) and small joint spheres so no pose opens a gap. One body colour
   * (patterns apply) and an accent on the head; three shared shapes, so all characters cost a few
   * draw calls.
   */
  private buildStick(make: PartFactory, look: AvatarLook, p: Proportions): void {
    const c = look.colors;
    const body = c.torso;
    const k = p.height / 1.75;
    const girth = Math.max(0.85, Math.min(1.25, p.chest.w / 0.34));
    const rLimb = 0.024 * k * girth;
    const rBody = 0.034 * k * girth;
    const joint = 0.06 * k * girth;
    const add = (shape: PartShape, hex: string, slot: string, parent: TransformNode, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0, rz = 0): void => {
      const m = make(shape, hex, slot);
      m.parent = parent;
      m.scaling.set(sx, sy, sz);
      m.position.set(x, y, z);
      if (rz) m.rotation.z = rz;
      this.parts.push(m);
    };
    // a capsule segment of length `len` hanging from (or rising above) its joint; the unit capsule
    // is 0.5 wide and 1 long
    const seg = (parent: TransformNode, len: number, r: number, dir: 1 | -1, slot = 'torso', hex = body): void => add('capsule', hex, slot, parent, r * 4, len + r * 2, r * 4, 0, (dir * len) / 2, 0);
    const ball = (parent: TransformNode, d: number, hex = body, slot = 'torso', y = 0): void => add('sphere', hex, slot, parent, d, d, d, 0, y, 0);
    const Y = p.y;
    const chestY = Y.waist + 0.13 * k;
    // spine in three bending parts: pelvis -> waist -> chest -> neck base
    seg(this.hips, Y.waist - Y.hip, rBody, 1);
    seg(this.spine, chestY - Y.waist, rBody, 1);
    seg(this.torso, Y.neck - chestY, rBody, 1);
    ball(this.hips, joint * 1.15);
    ball(this.spine, joint);
    ball(this.torso, joint);
    // shoulder and hip bars
    add('capsule', body, 'torso', this.torso, rBody * 4, p.shoulderHalf * 2 + rBody * 2, rBody * 4, 0, Y.shoulder - chestY, -0.01, Math.PI / 2);
    add('capsule', body, 'torso', this.hips, rBody * 4, p.hipHalf * 2 + rBody * 2, rBody * 4, 0, -0.03, 0, Math.PI / 2);
    // neck and head (accent colour)
    seg(this.neck, p.neck.len + p.head.h * 0.1, rLimb * 1.1, 1);
    ball(this.headNode, p.head.h * 0.95, c.accent, 'accent');
    // arms
    for (const [sh, el, wr] of [
      [this.shoulderL, this.elbowL, this.wristL],
      [this.shoulderR, this.elbowR, this.wristR],
    ] as const) {
      ball(sh, joint);
      seg(sh, p.upperArm.len, rLimb, -1);
      ball(el, joint * 0.85);
      seg(el, p.forearm.len, rLimb * 0.9, -1);
      ball(wr, joint * 0.95, body, 'torso', -p.hand.len * 0.3);
    }
    // legs
    for (const [hp, kn, an] of [
      [this.hipL, this.kneeL, this.ankleL],
      [this.hipR, this.kneeR, this.ankleR],
    ] as const) {
      ball(hp, joint);
      seg(hp, p.thigh.len, rLimb * 1.15, -1);
      ball(kn, joint * 0.9);
      seg(kn, p.calf.len, rLimb, -1);
      ball(an, joint * 0.8);
      // foot: a flat rounded bar forward along the ground
      add('pill', body, 'torso', an, rLimb * 3.2, rLimb * 2.2, p.foot.len * 0.9, 0, -Y.ankle * 0.55, p.foot.len * 0.28);
    }
  }

  // ------------------------------------------------------------------------------------------
  // Mesh construction: smooth primitives only, joint spheres sleeved into tapered limbs so poses
  // never open gaps. Sizes come from the proportions table.
  // ------------------------------------------------------------------------------------------
  private buildParts(make: PartFactory, look: AvatarLook, p: Proportions, armor: boolean): void {
    const c = look.colors;
    const part = (shape: PartShape, hex: string, slot: string, parent: TransformNode, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): AbstractMesh => {
      const m = make(shape, hex, slot);
      m.parent = parent;
      m.scaling.set(sx, sy, sz);
      m.position.set(x, y, z);
      if (rx || ry || rz) m.rotation.set(rx, ry, rz);
      this.parts.push(m);
      return m;
    };
    const operator = look.torso === 'operator';
    const longSleeves = look.torso === 'jacket' || look.torso === 'hoodie' || look.torso === 'armor' || operator;
    // gloves (the operator's), else bare hands
    const hand = operator ? '#16181c' : c.skin;
    const handSlot = operator ? 'boots' : 'skin';
    const sleeve = longSleeves ? c.torso : c.skin;
    const sleeveSlot = longSleeves ? 'torso' : 'skin';
    const Y = p.y;
    const chestY = Y.waist + 0.13 * (p.height / 1.75);
    const torsoH = Y.neck - Y.waist + 0.02;

    // pelvis + abdomen blend + torso shell
    part('sphere', c.legs, 'legs', this.hips, p.pelvis.w * 0.95, p.pelvis.h * 1.05, p.pelvis.d, 0, 0.0, 0);
    part('sphere', c.torso, 'torso', this.spine, p.waist.w * 1.02, 0.24, p.waist.d * 1.02, 0, 0.02, 0);
    part('torso', c.torso, 'torso', this.torso, p.chest.w, torsoH, p.chest.d, 0, Y.waist - chestY, 0);
    // trapezius blend into the neck
    part('sphere', c.torso, 'torso', this.torso, p.shoulderHalf * 1.5, 0.1, p.chest.d * 0.75, 0, Y.shoulder - chestY + 0.01, -0.01);

    // torso clothing (rounded plates/pockets over the shell)
    const front = p.chest.d / 2;
    switch (look.torso) {
      case 'vest':
        part('pill', c.accent, 'accent', this.torso, p.chest.w * 0.7, 0.24, 0.045, 0, 0.1, front - 0.01);
        part('pill', c.accent, 'accent', this.torso, p.chest.w * 0.7, 0.24, 0.045, 0, 0.1, -front + 0.01);
        part('pill', c.accent, 'accent', this.torso, 0.075, 0.06, 0.03, -0.065, 0.0, front + 0.01);
        part('pill', c.accent, 'accent', this.torso, 0.075, 0.06, 0.03, 0.065, 0.0, front + 0.01);
        break;
      case 'armor':
        break; // plates added below (shared with armoured enemies)
      case 'jacket':
        part('torus', c.accent, 'accent', this.torso, 0.17, 0.3, 0.15, 0, Y.neck - chestY - 0.01, 0, 0, 0, 0);
        part('pill', c.accent, 'accent', this.torso, 0.025, torsoH * 0.75, 0.02, 0, -0.04, front + 0.012);
        break;
      case 'hoodie':
        part('pill', c.torso, 'torso', this.torso, 0.24, 0.13, 0.12, 0, Y.neck - chestY - 0.02, -front * 0.8, -0.4);
        part('pill', c.accent, 'accent', this.torso, 0.2, 0.09, 0.04, 0, -0.08, front + 0.005);
        break;
      case 'tee':
        break;
      case 'operator': {
        // plate carrier front / back over the fitted suit, a row of magazine pouches, shoulder straps, a collar
        part('pill', c.accent, 'accent', this.torso, p.chest.w * 0.78, 0.3, 0.055, 0, 0.09, front - 0.004);
        part('pill', c.accent, 'accent', this.torso, p.chest.w * 0.8, 0.32, 0.055, 0, 0.1, -front + 0.004);
        for (let i = -1; i <= 1; i++) part('rbox', c.accent, 'accent', this.torso, 0.062, 0.085, 0.04, i * 0.07, -0.02, front + 0.035);
        part('rbox', c.helmet, 'helmet', this.torso, 0.05, 0.06, 0.03, -0.075, 0.17, front + 0.03);
        part('pill', c.accent, 'accent', this.torso, 0.05, 0.05, p.chest.d * 0.95, -p.shoulderHalf * 0.55, Y.shoulder - chestY - 0.02, 0);
        part('pill', c.accent, 'accent', this.torso, 0.05, 0.05, p.chest.d * 0.95, p.shoulderHalf * 0.55, Y.shoulder - chestY - 0.02, 0);
        part('torus', c.torso, 'torso', this.torso, 0.15, 0.24, 0.14, 0, Y.neck - chestY - 0.015, 0);
        // belt with a radio and a utility pouch
        part('torus', c.helmet, 'helmet', this.spine, p.waist.w * 1.06, 0.16, p.waist.d * 1.08, 0, -0.04, 0);
        part('rbox', c.accent, 'accent', this.spine, 0.07, 0.08, 0.045, -p.waist.w * 0.36, -0.05, -p.waist.d * 0.4);
        break;
      }
    }
    if (look.torso === 'armor' || armor) {
      part('pill', c.accent, 'accent', this.torso, p.chest.w * 0.85, 0.32, 0.06, 0, 0.1, front - 0.005);
      part('pill', c.accent, 'accent', this.torso, p.chest.w * 0.85, 0.32, 0.06, 0, 0.1, -front + 0.005);
      part('dome', c.accent, 'accent', this.shoulderL, p.upperArm.r0 * 3.1, 0.09, p.upperArm.r0 * 3.1, -0.01, 0.0, 0, 0, 0, 0.35);
      part('dome', c.accent, 'accent', this.shoulderR, p.upperArm.r0 * 3.1, 0.09, p.upperArm.r0 * 3.1, 0.01, 0.0, 0, 0, 0, -0.35);
    }

    // neck + head
    const H = p.head;
    // (the balaclava covers the neck)
    const masked = look.helmet === 'trilens';
    part('limbA', masked ? c.torso : c.skin, masked ? 'torso' : 'skin', this.neck, p.neck.r * 2, p.neck.len + H.h * 0.35, p.neck.r * 2.1, 0, -0.04, -0.005, Math.PI - 0.1);
    const hs = look.head === 'oval' ? [0.94, 1.0, 1.0] : look.head === 'long' ? [0.95, 1.07, 0.98] : look.head === 'strong' ? [1.02, 1.0, 1.0] : [1, 1, 1];
    const jaw = look.head === 'strong' ? 0.92 : look.head === 'oval' ? 0.76 : 0.82;
    const hw = H.w * hs[0]!;
    const hh = H.h * hs[1]!;
    const hd = H.d * hs[2]!;
    part('sphere', c.skin, 'skin', this.headNode, hw, hh * 0.86, hd, 0, hh * 0.08, 0);
    part('sphere', c.skin, 'skin', this.headNode, hw * jaw, hh * 0.5, hd * 0.8, 0, -hh * 0.2, 0.012);
    part('sphere', c.skin, 'skin', this.headNode, 0.03, 0.05, 0.022, -hw * 0.49, 0, -0.005);
    part('sphere', c.skin, 'skin', this.headNode, 0.03, 0.05, 0.022, hw * 0.49, 0, -0.005);
    part('sphere', c.skin, 'skin', this.headNode, 0.028, 0.04, 0.035, 0, -0.012, hd * 0.47);
    part('sphere', '#15181c', 'eyes', this.headNode, 0.022, 0.016, 0.012, -0.032, 0.022, hd * 0.44);
    part('sphere', '#15181c', 'eyes', this.headNode, 0.022, 0.016, 0.012, 0.032, 0.022, hd * 0.44);
    const top = hh * 0.08 + hh * 0.43;
    switch (look.hair) {
      case 'buzz':
        part('dome', c.hair, 'hair', this.headNode, hw * 1.05, hh * 0.62, hd * 1.05, 0, hh * 0.13, -0.004, -0.15);
        break;
      case 'long':
        part('dome', c.hair, 'hair', this.headNode, hw * 1.08, hh * 0.66, hd * 1.08, 0, hh * 0.12, -0.004, -0.12);
        part('pill', c.hair, 'hair', this.headNode, hw * 0.98, hh * 0.85, 0.07, 0, -hh * 0.15, -hd * 0.42);
        break;
      case 'bun':
        part('dome', c.hair, 'hair', this.headNode, hw * 1.05, hh * 0.62, hd * 1.05, 0, hh * 0.13, -0.004, -0.15);
        part('sphere', c.hair, 'hair', this.headNode, 0.09, 0.085, 0.085, 0, top - 0.03, -hd * 0.48);
        break;
      case 'mohawk':
        for (let i = 0; i < 4; i++) part('sphere', c.hair, 'hair', this.headNode, 0.035, 0.07, 0.08, 0, top - 0.015 - Math.abs(i - 1.5) * 0.012, hd * 0.3 - i * 0.07);
        break;
      case 'swept':
        part('dome', c.hair, 'hair', this.headNode, hw * 1.06, hh * 0.64, hd * 1.08, 0, hh * 0.13, -0.008, -0.2);
        part('pill', c.hair, 'hair', this.headNode, hw * 0.7, 0.05, hd * 0.6, 0, top - 0.01, 0.0, -0.35);
        break;
      case 'none':
        break;
    }
    switch (look.helmet) {
      case 'cap':
        part('dome', c.helmet, 'helmet', this.headNode, hw * 1.1, hh * 0.58, hd * 1.08, 0, hh * 0.16, 0);
        part('pill', c.helmet, 'helmet', this.headNode, hw * 0.85, 0.022, 0.11, 0, hh * 0.17, hd * 0.55, -0.12);
        break;
      case 'combat':
        part('helmet', c.helmet, 'helmet', this.headNode, hw * 1.24, hh * 0.8, hd * 1.16, 0, hh * 0.14, -0.006);
        break;
      case 'visor':
        part('helmet', c.helmet, 'helmet', this.headNode, hw * 1.26, hh * 0.84, hd * 1.18, 0, hh * 0.13, -0.006);
        part('pill', c.accent, 'accent', this.headNode, hw * 0.95, hh * 0.24, 0.05, 0, hh * 0.1, hd * 0.52, 0.12);
        break;
      case 'beret':
        part('sphere', c.helmet, 'helmet', this.headNode, hw * 1.18, 0.07, hd * 1.12, 0.012, top - 0.025, -0.01, 0, 0, 0.18);
        break;
      case 'headset':
        part('torus', c.helmet, 'helmet', this.headNode, hw * 1.12, hw * 1.12, hh * 1.0, 0, hh * 0.05, 0, 0, Math.PI / 2, Math.PI / 2);
        part('sphere', c.accent, 'accent', this.headNode, 0.04, 0.075, 0.07, -hw * 0.54, 0, 0);
        part('sphere', c.accent, 'accent', this.headNode, 0.04, 0.075, 0.07, hw * 0.54, 0, 0);
        break;
      case 'trilens': {
        // balaclava over the head and face (eyes open), a strap, the tri-lens goggle on its mount: two lenses at
        // the eyes, one above between them; they glow in a vision mode (`setLensGlow`)
        part('sphere', c.torso, 'torso', this.headNode, hw * 1.05, hh * 0.9, hd * 1.04, 0, hh * 0.08, -0.004);
        part('sphere', c.torso, 'torso', this.headNode, hw * jaw * 1.05, hh * 0.52, hd * 0.84, 0, -hh * 0.2, 0.012);
        part('torus', c.helmet, 'helmet', this.headNode, hw * 1.08, hh * 0.18, hd * 1.08, 0, hh * 0.12, -0.004, -0.1);
        const z = hd * 0.5 + 0.012;
        part('rbox', c.helmet, 'helmet', this.headNode, 0.1, 0.05, 0.035, 0, 0.04, z);
        const lens = (x: number, y: number): void => {
          part('rcyl', c.helmet, 'helmet', this.headNode, 0.034, 0.042, 0.034, x, y, z + 0.022, Math.PI / 2);
          this.lenses.push(part('rcyl', LENS_OFF, 'lens', this.headNode, 0.026, 0.006, 0.026, x, y, z + 0.044, Math.PI / 2) as InstancedMesh);
          // (Step 4b) the goggle glow: the lens as an emissive point, seen in the dark (visual only)
          this.glows.push(addGlow(this.headNode.getScene(), this.headNode, x, y, z + 0.047, 0.02));
        };
        lens(-0.026, 0.022);
        lens(0.026, 0.022);
        lens(0, 0.058);
        // the goggle's battery pack at the back of the strap, its LED the glow the camera behind sees (Step 4b)
        part('rbox', c.helmet, 'helmet', this.headNode, 0.05, 0.034, 0.022, 0, hh * 0.12, -hd * 0.52 - 0.006);
        this.glows.push(addGlow(this.headNode.getScene(), this.headNode, 0, hh * 0.12, -hd * 0.52 - 0.019, 0.014));
        break;
      }
      case 'hood':
        // a loose hood over a cap, drawn down at the back (the sniper)
        part('dome', c.helmet, 'helmet', this.headNode, hw * 1.22, hh * 0.78, hd * 1.2, 0, hh * 0.1, -0.012, -0.1);
        part('pill', c.helmet, 'helmet', this.headNode, hw * 1.12, hh * 0.7, 0.07, 0, -hh * 0.14, -hd * 0.46, 0.15);
        part('pill', c.helmet, 'helmet', this.headNode, hw * 0.9, 0.022, 0.1, 0, hh * 0.2, hd * 0.55, -0.12);
        break;
      case 'none':
        break;
    }

    // backpacks (rounded, on the chest so they follow the spine)
    const back = -p.chest.d / 2;
    switch (look.backpack) {
      case 'pack':
        part('pill', c.backpack, 'backpack', this.torso, p.chest.w * 0.78, 0.4, 0.17, 0, 0.1, back - 0.07);
        part('pill', c.backpack, 'backpack', this.torso, p.chest.w * 0.6, 0.13, 0.08, 0, -0.02, back - 0.17);
        break;
      case 'radio':
        part('pill', c.backpack, 'backpack', this.torso, p.chest.w * 0.62, 0.36, 0.15, 0, 0.1, back - 0.06);
        part('capsule', '#1c1f24', 'eyes', this.torso, 0.03, 0.24, 0.03, 0.08, 0.36, back - 0.07);
        break;
      case 'tank':
        part('capsule', c.backpack, 'backpack', this.torso, 0.13, 0.44, 0.13, -0.075, 0.1, back - 0.06);
        part('capsule', c.backpack, 'backpack', this.torso, 0.13, 0.44, 0.13, 0.075, 0.1, back - 0.06);
        break;
      case 'bedroll':
        part('pill', c.backpack, 'backpack', this.torso, p.chest.w * 0.7, 0.3, 0.14, 0, 0.05, back - 0.06);
        part('rcyl', c.accent, 'accent', this.torso, 0.13, p.chest.w * 0.95, 0.13, 0, 0.27, back - 0.08, 0, 0, Math.PI / 2);
        break;
      case 'none':
        break;
    }

    // arms: deltoid, upper arm, elbow, forearm, wrist, mitten hand + thumb
    const arm = (side: -1 | 1, sh: TransformNode, el: TransformNode, wr: TransformNode): void => {
      const ua = p.upperArm;
      const fa = p.forearm;
      part('sphere', sleeve, sleeveSlot, sh, ua.r0 * 2.35, ua.r0 * 2.3, ua.r0 * 2.2, side * 0.004, 0.005, 0);
      if (longSleeves) {
        part('limbA', c.torso, 'torso', sh, ua.r0 * 2, ua.len, ua.r0 * 2);
      } else {
        part('limbA', c.skin, 'skin', sh, ua.r0 * 1.94, ua.len, ua.r0 * 1.94);
        part('limbA', look.torso === 'tee' ? c.torso : c.accent, look.torso === 'tee' ? 'torso' : 'accent', sh, ua.r0 * 2.12, ua.len * 0.42, ua.r0 * 2.12);
      }
      part('sphere', longSleeves ? c.torso : c.skin, longSleeves ? 'torso' : 'skin', el, ua.r1 * 2.1, ua.r1 * 2.1, ua.r1 * 2.1);
      part('limbA', longSleeves ? c.torso : c.skin, longSleeves ? 'torso' : 'skin', el, fa.r0 * 2, fa.len, fa.r0 * 2);
      part('sphere', hand, handSlot, wr, fa.r1 * 2.2, fa.r1 * 2.2, fa.r1 * 2.2);
      // mitten: palm faces inwards (towards the body), fingers down
      part('pill', hand, handSlot, wr, p.hand.t * 1.7, p.hand.len * 0.72, p.hand.w, 0, -p.hand.len * 0.4, 0.004);
      part('capsule', hand, handSlot, wr, 0.03, 0.075, 0.03, -side * 0.006, -p.hand.len * 0.25, p.hand.w * 0.48, 0.5, 0, 0);
      // operator: elbow pad
      if (operator) part('dome', c.accent, 'accent', el, ua.r1 * 2.4, 0.05, ua.r1 * 2.4, 0, 0.0, -ua.r1 * 0.75, -Math.PI / 2);
    };
    arm(-1, this.shoulderL, this.elbowL, this.wristL);
    arm(1, this.shoulderR, this.elbowR, this.wristR);

    // legs: hip ball, thigh, knee, calf, ankle, rounded boot
    const leg = (side: -1 | 1, hp: TransformNode, kn: TransformNode, an: TransformNode): void => {
      const th = p.thigh;
      const cf = p.calf;
      const shorts = look.legs === 'shorts';
      part('sphere', c.legs, 'legs', hp, th.r0 * 2.15, th.r0 * 2.2, th.r0 * 2.1, side * 0.006, 0.01, 0);
      part('limbL', c.legs, 'legs', hp, th.r0 * (look.legs === 'cargo' ? 2.12 : 2), th.len, th.r0 * (look.legs === 'cargo' ? 2.12 : 2));
      if (shorts) part('limbL', c.skin, 'skin', hp, th.r0 * 1.85, th.len, th.r0 * 1.85, 0, -0.005);
      if (shorts) part('limbL', c.legs, 'legs', hp, th.r0 * 2.08, th.len * 0.55, th.r0 * 2.08);
      if (look.legs === 'cargo') part('pill', c.accent, 'accent', hp, 0.05, 0.13, 0.1, side * th.r0 * 0.95, -th.len * 0.5, 0.01);
      const lower = shorts ? c.skin : c.legs;
      const lowerSlot = shorts ? 'skin' : 'legs';
      part('sphere', lower, lowerSlot, kn, th.r1 * 2.1, th.r1 * 2.2, th.r1 * 2.15);
      part('limbL', lower, lowerSlot, kn, cf.r0 * 2, cf.len, cf.r0 * 2);
      if (look.legs === 'armored' || armor || operator) part('dome', c.accent, 'accent', kn, 0.11, 0.07, 0.12, 0, 0.0, th.r1 * 0.9, Math.PI / 2);
      // operator: a thigh pocket panel on each leg (cargo trousers already carry one; the sling and holster sit
      // just outside it)
      if (operator && look.legs !== 'cargo') part('rbox', c.accent, 'accent', hp, 0.045, 0.14, 0.11, side * th.r0 * 0.95, -th.len * 0.45, 0.0);
      part('sphere', c.boots, 'boots', an, cf.r1 * 2.6, cf.r1 * 2.4, cf.r1 * 2.6, 0, 0.0, 0);
      // boot: rounded toe forward, sole at the ground (ankle sits at foot.h above it)
      part('pill', c.boots, 'boots', an, p.foot.w, p.foot.h, p.foot.len, 0, -p.y.ankle * 0.45, p.foot.len * 0.28);
    };
    leg(-1, this.hipL, this.kneeL, this.ankleL);
    leg(1, this.hipR, this.kneeR, this.ankleR);
  }

  setEnabled(v: boolean): void {
    this.root.setEnabled(v);
  }

  /** Tri-lens goggle lenses (empty without the goggle) and their glow points (Step 4b, `goggleGlow.ts`). */
  private readonly lenses: InstancedMesh[] = [];
  private readonly glows: InstancedMesh[] = [];
  private lensOn = false;
  /** Partner beacon colour (0 = player 1 blue, 1 = player 2 red; -1 = the default green). */
  private beacon = -1;

  /** (A5, G135) this operator's lamp colour: 1 = blue, 2 = red (render only; the remote knows it from `PlayerInfo.host`). */
  setBeacon(player: 1 | 2): void {
    this.beacon = player - 1;
    this.paintGlow();
  }

  private paintGlow(): void {
    const b = this.beacon >= 0 ? BEACON[this.beacon] : null;
    const c = this.lensOn ? (b ? b.on : GLOW_VISION) : b ? b.idle : GLOW_IDLE;
    for (const g of this.glows) g.instancedBuffers.color = c;
  }

  /** The tri-lens lenses always glow faintly (the goggle glow, bible L7); brighter while a vision mode (night vision) is on. */
  setLensGlow(on: boolean): void {
    if (on === this.lensOn) return;
    this.lensOn = on;
    const c = Color4.FromHexString(`${on ? LENS_ON : LENS_OFF}ff`);
    for (const m of this.lenses) m.instancedBuffers.color = c;
    this.paintGlow();
    if (this.voxel) for (const m of this.lenses) this.voxel.setPartColor(this.parts.indexOf(m), c);
  }

  // ------------------------------------------------------------------------------------------
  // Animation
  // ------------------------------------------------------------------------------------------

  /** Animation (clip graph + foot planner + IK). Call every render frame. `solveDt` (guard-render S4, guards'
   *  `animTier.ts`): the caller's anim tier, the time to solve this frame (it carries the skipped time) or -1 to skip;
   *  omitted: the camera-distance LOD below. */
  animate(dt: number, s: RigPose, solveDt?: number): void {
    if (this.disposed) return;
    // (21w) a re-parented weapon eases onto its new place (every frame, LOD or not)
    this.stepGlide(dt);
    if (solveDt !== undefined && solveDt < 0) return;
    if (solveDt !== undefined) dt = solveDt;
    // animation LOD: rigs far from the camera solve every other frame
    const cam = solveDt === undefined ? this.root.getScene().activeCamera : null;
    if (cam) {
      const p = this.root.position;
      const c = cam.globalPosition;
      const far = (p.x - c.x) ** 2 + (p.z - c.z) ** 2 > animLod * animLod;
      if (far && (this.lodSkip = !this.lodSkip)) {
        this.lodDt += dt;
        return;
      }
    }
    dt += this.lodDt;
    this.lodDt = 0;
    // (anim-joints J1) a Wren rig (`tuneRows`) opens its own tuner window: its rows of the base table + the tuner deltas
    const ts = this.tuneSt;
    if (ts === null) {
      // (item 24, track A) a guard rig (`guardRows`) opens its own window on the guard tables; nothing live: untouched
      const gs = this.guardSt;
      if (gs === null || !guardRigBegin(gs, s, this, dt)) {
        this.animateFrame(dt, s);
        return;
      }
      try {
        this.animateFrame(dt, s);
      } finally {
        guardRigEnd(gs, this);
      }
      return;
    }
    tuneRigBegin(ts, s, this, dt);
    try {
      // (anim-gear) the sling nodes follow a gear change before the pose (carried guns re-place in `onPosed`)
      this.gearNodes();
      this.animateFrame(dt, s);
    } finally {
      tuneRigEnd();
    }
  }

  /** (anim-joints J1) One solved frame of `animate` (after the LOD skip; inside the rig's tuner window when it has one). */
  private animateFrame(dt: number, s: RigPose): void {
    const i = this.input;
    this.mOn = LOCO.mocap && this.carrier;
    i.mocapOk = this.carrier;
    i.speed = s.speed;
    i.localX = s.localX;
    i.localZ = s.localZ;
    if (s.stride === 'facing') {
      // (A1.2) free movement walks along the facing: no strafe or back clip in a turn (a lagging measured velocity on a
      // remote pulled them in), except the slow back walk
      const back = s.speed < 0.9 && s.localZ < -0.7 * hyp2(s.localX, s.localZ);
      i.localX = 0;
      i.localZ = back ? -1 : 1;
    }
    i.grounded = s.grounded;
    // (anim-n4, track A) the body lift: the step-in posed standing, kneeling once it is done, standing up only once both
    // feet are planted (the planner's last frame; animation only)
    i.crouch = this.liftCrouch.step(s.crouch, s.liftStep ?? -1, this.planner.L.contact && this.planner.R.contact, dt);
    i.kneel = s.kneel ?? false;
    i.tense = s.tense ?? false;
    // (G8) the keyed walk: free movement along the facing, not holding / carrying / lowering a body (the hostage walk
    // keeps its own offset stance clear of the guard's legs: g7CloseQuarters)
    i.keyedOk = s.stride === 'facing' && !((s.bend ?? 0) > 0) && !((s.bendDrop ?? 0) > 0);
    i.aimPitch = s.aimPitch;
    i.raise = s.aim;
    i.kick = s.kick;
    i.aimYaw = s.aimYaw ?? 0;
    this.aimWorldYaw = s.aimWorldYaw ?? null;
    this.aimWorldPitch = s.aimWorldPitch ?? 0;
    this.lookYaw = s.lookYaw ?? 0;
    this.lookPitch = s.lookPitch ?? 0;
    const cr = s.carry;
    i.carryLow = cr ? cr.low : 1;
    i.carryHigh = cr ? cr.high : 0;
    i.carryComp = cr ? cr.compressed : 0;
    i.weight = s.weight ?? 1;
    i.reload = s.reload ?? -1;
    i.reloadEmpty = s.reloadEmpty ?? false;
    i.swap = s.swap ?? -1;
    i.swapFrom = s.swapFrom ?? 'backC';
    i.swapTo = s.swapTo ?? 'backC';
    i.weaponTravel = this.weaponTravel;
    i.grenade = s.grenade ?? -1;
    i.armed = s.armed ?? !!this.heldWeapon;
    i.ready = s.ready ?? (this.carrier && !this.heldWeapon);
    // (anim-rework S3) the drawn keyed set: a carrier (the player, a remote player) with the gun in hand, free on foot
    i.keyedDrawn = this.carrier && !!this.heldWeapon && !((s.bend ?? 0) > 0) && !((s.bendDrop ?? 0) > 0) && !(s.wall ?? false) && !(s.settleFeet ?? false);
    i.thighGear = this.thighGear;
    i.dash = s.dash ?? 0;
    i.landing = s.landing ?? 0;
    i.wall = s.wall ?? false;
    i.wallSide = s.wallSide ?? 0;
    i.wallTurn = s.wallTurn ?? 0;
    i.wallBlock = s.wallBlock ?? 0;
    i.lean = s.lean ?? 0;
    this.headCap = s.headCap;
    // (ct-prototype D+E fix r1) a climbUp that starts with the hands on world grips (a ledge / drainpipe hang, local or a
    // remote) is the ledge climb-up; one that starts without (the team boost, relay, rope top) keeps the old clip
    const trav = s.traverse ?? 'none';
    if (trav === 'climbUp' && i.traverse !== 'climbUp') i.ledgeClimb = Math.max(this.reachL.w, this.reachR.w) > 0.5;
    else if (trav !== 'climbUp') i.ledgeClimb = false;
    i.traverse = trav;
    i.traverseT = s.traverseT ?? 0;
    i.travH = s.traverseH ?? 0;
    i.travD = s.traverseD ?? 0;
    i.melee = s.melee ?? -1;
    i.bend = s.bend ?? 0;
    i.bendDrop = s.bendDrop ?? 0;
    i.cqBody = s.carryBody === true; // (anim-n4, track A)
    i.cqCarry = s.carryBody ? (s.carrySide ?? 0) : 0;
    i.sway = s.sway ?? 0;
    i.tumble = s.tumble ?? 0;
    i.phase = s.phase ?? -1;
    i.motion = s.motion ?? '';
    i.motionT = s.motionT ?? 0;
    i.quickStop = s.quickStop ?? 0;
    i.holdSpeed = s.holdSpeed ?? 0;
    i.accelFwd = s.accelFwd ?? 0;
    i.accelSide = s.accelSide ?? 0;
    i.intent = s.intent ?? 0;
    const yaw = this.root.rotation.y;
    // root velocity: supplied by the motion driver, else measured from the root's movement
    const rp = this.root.position;
    if (dt > 0) {
      const jx = rp.x - this.prevRootX;
      const jz = rp.z - this.prevRootZ;
      const jump = jx * jx + jz * jz > 4;
      this.velX = s.velX ?? (jump ? 0 : approachTo(this.velX, jx / dt, dt, 0.06));
      this.velZ = s.velZ ?? (jump ? 0 : approachTo(this.velZ, jz / dt, dt, 0.06));
      if (jump) {
        this.planner.L.init = this.planner.R.init = false;
        this.derive.reset();
      }
    }
    this.prevRootX = rp.x;
    this.prevRootZ = rp.z;
    // (locomotion step 22, D8) no motion driver (a remote copy): the acceleration lean and the stop settle from the
    // measured velocity's own edges, as the owner's driver gives them (no extra bandwidth)
    if (s.accelFwd === undefined) {
      this.derive.update(dt, this.velX, this.velZ, yaw);
      i.accelFwd = this.derive.accelFwd;
      i.accelSide = this.derive.accelSide;
      if (s.motion === undefined) {
        i.motion = this.derive.motion;
        i.motionT = this.derive.motionT;
      }
    }
    if (s.yawRate !== undefined) i.yawRate = s.yawRate;
    else if (this.prevYaw !== null && dt > 0) {
      let d = yaw - this.prevYaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      // (A1.2) smoothed (tau 0.05 s): a remote copy turns in 20 Hz snapshot steps, and this feeds the gait clock
      this.yawRateS = approachTo(this.yawRateS, d / dt, dt, 0.05);
      i.yawRate = this.yawRateS;
    }
    this.prevYaw = yaw;
    // weapon changing hands (open-left wall edge, D9): eased over EDGE_HAND_TIME; the graph tucks the weapon in
    // (rig-pose-fix S7, G15) the math is the sim clock's (`HandSwitch.step`: a reversal rewinds, no jump), stepped here
    // at the render rate toward the same target (the local player's `openLeft` is written in the fixed step)
    this.hs.step(dt, this.openLeft);
    // (strike-pops, n4c polish 1) the graph's tuck bump and the gun's dip read the progress from the blend
    // (`handSwapPh`): a reversal's rewind of `handSwap` flipped their rate in one frame
    i.handSwap = this.handSwap < 0 ? -1 : handSwapPh(this.handBlend);
    i.hand = 1 - this.handBlend * 2;

    // (G1) the kneel keeps the lead foot planted: which foot is ahead (last frame's planted feet, body frame)
    {
      const pl = this.planner.L;
      const pr = this.planner.R;
      const ry = this.root.rotation.y;
      this.graph.setLead((pl.x - pr.x) * Math.sin(ry) + (pl.z - pr.z) * Math.cos(ry));
    }
    const t = this.graph.update(dt, i);

    // feet: world-space planner (locked contacts, swing arcs, idle steps)
    const pin = this.pin;
    pin.dt = dt;
    pin.rootX = rp.x;
    pin.rootY = rp.y;
    pin.rootZ = rp.z;
    pin.yaw = yaw;
    pin.goalYaw = s.goalYaw ?? yaw;
    pin.velX = this.velX;
    pin.velZ = this.velZ;
    pin.moving = t.gait.moving;
    pin.phase = t.gait.phase;
    pin.duty = t.gait.duty;
    pin.cycleTime = t.gait.cycleTime;
    pin.liftH = t.gait.liftH;
    pin.lX = t.stance.lX;
    pin.lZ = t.stance.lZ;
    pin.rX = t.stance.rX;
    pin.rZ = t.stance.rZ;
    // (step 22, M14) not on a Chaos Theory stop (quickStop): its eased stop is short (<= 0.36 m) and its rest spot
    // pulled a swing already over the next stair back down one (stairs-stand5 pelvis jump 7 -> 19 cm); the leftover
    // swing sets down where it is and the idle steps square up, as in 3.2.0
    pin.rest = s.restX !== undefined && s.restZ !== undefined && s.motion === 'stop' && !((s.quickStop ?? 0) > 0);
    pin.restX = s.restX ?? 0;
    pin.restZ = s.restZ ?? 0;
    // (G1 fix, audit row 16) crouched the hips sit low, so a planted leg reaches further back before it must toe off: the
    // crouch run's rear leg trails long and straight (CT N4) instead of folding its knee down to the floor
    pin.reach = (this.p.thigh.len + this.p.calf.len) * (0.62 + (CROUCH_REACH - 0.62) * Math.max(0, Math.min(1, i.crouch)));
    pin.quickStop = s.quickStop ?? 0;
    pin.hold = (s.holdSpeed ?? 0) > 0;
    pin.pinLX = this.footPins[0]!;
    pin.pinLZ = this.footPins[1]!;
    pin.pinRX = this.footPins[2]!;
    pin.pinRZ = this.footPins[3]!;
    if ((i.wall || s.settleFeet) && !t.gait.moving && Number.isNaN(pin.pinLX)) {
      // (step 11) still with the back to a wall: the feet step onto the stance spots under the (pushed) root, the same
      // on every peer. Without this the idle stepping's front-back stagger tolerance keeps a foot wherever the entry
      // left it (the local glide steps both feet in; a remote, posed still from MoveState, leaves one 15 cm out)
      const c = Math.cos(yaw);
      const sn = Math.sin(yaw);
      pin.pinLX = rp.x + t.stance.lX * c + t.stance.lZ * sn;
      pin.pinLZ = rp.z - t.stance.lX * sn + t.stance.lZ * c;
      pin.pinRX = rp.x + t.stance.rX * c + t.stance.rZ * sn;
      pin.pinRZ = rp.z - t.stance.rX * sn + t.stance.rZ * c;
    }
    // (step 11) back to a wall: the feet stay in front of its face (ankle 0.1 m out: the heel clear of it) and step
    // round with the turn onto it
    const wf = i.wall && s.wallFace !== undefined ? s.wallFace : NaN;
    pin.wallNx = s.wallNx ?? 0;
    pin.wallNz = s.wallNz ?? 0;
    pin.wallD = wf + WALL_FOOT_CLEAR;
    pin.turnStep = i.wall ? 1.2 : 0.9; // (A1.2) a backstop: the turn-stepping clock keeps planted feet with the body
    pin.yawRate = i.yawRate;
    pin.faceGoal = s.faceGoal ?? (s.stride === 'facing' ? NaN : yaw);
    pin.stride = s.stride === 'facing' && !i.wall ? 'facing' : 'velocity';
    // (anim-rework S3) the aimed glide's closer side-step (footPlanner GLIDE_GAP)
    pin.glide = i.keyedDrawn && i.raise > 0.5;
    pin.pelvisYaw = yaw + this.follow;
    pin.crouch = i.crouch;
    pin.turnRule = s.turnRule ?? 1;
    const free = !i.grounded || i.traverse !== 'none';
    pin.ground = free ? null : this.groundProbe;
    // (mocap-trial, A3) the mocap clip's feet place the steps (graph `clipFeet`; null: the planner's, as always)
    pin.clipFeet = t.clipFeet.valid && !free ? t.clipFeet : null;
    // (mt2-pop1) each planted leg's reach need last frame (the planner reads it with clip feet only)
    pin.reachNeedL = this.liftL;
    pin.reachNeedR = this.liftR;
    // (mocap-trial-2, crouchpop) the switch: a clip-planted foot's hand-off rules once clip feet are gone
    pin.mocap = this.mOn;
    // (mocap-trial-2, strafe) the mocap strafe's share (0 with the switch off): its trailing foot's toe-off rule
    pin.strafe = t.keyStrafe;
    // (mocap-trial, fix 2) the switch turned off mid-game: no clip feet state is left on the feet (a clip-planted foot kept
    // its flag, read at a stop), so the planner has them as if the switch had never been on (but a toe-up plant's flag)
    if (this.mOn !== this.mocapWas) {
      this.mocapWas = this.mOn;
      // (mt2-fixB) a rig already posing cross-fades from where it was (`switchFade`); a rig's first frame does not
      if (this.xfSeen >= 2) this.xfStart = true;
      if (!this.mOn) {
        clipFootOff(this.planner.L);
        clipFootOff(this.planner.R);
      }
    }
    // airborne / traversing: the planner restarts from the clip pose when the feet are back down
    if (free) this.planner.L.init = this.planner.R.init = false;
    this.planner.update(pin);
    // (mocap-trial) with the switch on, a foot's pitch turns at most MOCAP_FEET.pitchRate: a hand-off between the clip's
    // feet and the planner's (a fast turn, a stop, a start) swapped one foot model for the other in a frame (the ankle
    // snapped 30-40 deg); the clips' own pitch stays under it
    // (orchestrator review #159) only on this rig's mocap share or a clip-owned / clip-planted foot: guards and the drawn /
    // crouched rigs keep the planner's landings uncapped with the switch on
    const PL = this.planner;
    // (orchestrator review, mocap-trial-2) the clip flags count only with clip feet on the input
    if (this.mOn && (t.keyMocap > 0 || (pin.clipFeet !== null && (PL.L.clipOwn || PL.L.clipPlant || PL.R.clipOwn || PL.R.clipPlant)))) {
      const mx = MOCAP_FEET.pitchRate * dt;
      this.footPitchL = this.planner.L.pitch = rateTo(this.footPitchL, this.planner.L.pitch, mx);
      this.footPitchR = this.planner.R.pitch = rateTo(this.footPitchR, this.planner.R.pitch, mx);
      // (mt2-fixF) an anchored planted foot keeps its contact at the capped pitch
      this.planner.holdPitch(this.planner.L);
      this.planner.holdPitch(this.planner.R);
    } else {
      this.footPitchL = this.planner.L.pitch;
      this.footPitchR = this.planner.R.pitch;
    }
    if (this.graph.drive) studioFeet(this.graph.drive, this.planner, rp.x, rp.y, rp.z, yaw, this.p.height / 1.75); // (anim-studio) the treadmill feet, studio only
    const L = this.planner.L;
    const R = this.planner.R;
    this.graph.setSupport(L.contact && !R.contact ? -1 : R.contact && !L.contact ? 1 : 0);
    // (A1.2) the pelvis turns toward the planted feet (up to 20 deg); the chest keeps the facing (applyTargets)
    const follows = !free && !i.wall && pin.stride === 'facing';
    // (anim-rework S2) standing holstered the hips trail further (PELVIS_FOLLOW_KEYED, by this frame's keyHol); crouched and
    // drawn as before
    const holK = t.keyHol;
    // (mocap-trial) MOCAP_LAYERS.pelvisFollow on the mocap share (1: PELVIS_FOLLOW_KEYED exactly)
    const folK = PELVIS_FOLLOW_KEYED * mocapLayerK(MOCAP_LAYERS.pelvisFollow, t.keyMocap);
    this.follow = pelvisFollow(this.follow, yaw, L.yaw, R.yaw, follows && L.contact, follows && R.contact, dt, PELVIS_FOLLOW_MAX + (folK - PELVIS_FOLLOW_MAX) * holK);

    this.applyTargets(t, dt, free);
    this.lastTargets = t;
    // scripted FK poses blend in / out
    let fk: FkPose | null = null;
    if (this.emote) {
      this.emoteTime += dt;
      fk = this.emote(this, this.emoteTime) ?? null;
      if (fk) this.lastFk = fk;
    }
    this.emoteW = Math.max(0, Math.min(1, this.emoteW + (fk ? dt : -dt) / 0.2));
    if (this.emoteW > 0 && this.lastFk) this.applyFk(this.lastFk, this.emoteW);
    if (this.emoteW === 0) this.lastFk = null;
    this.switchFade(dt);
    // (anim-skeleton S2) the hands' fingers and this window's goggle offsets, for the figure
    // (guard-render S5 L6) only the operator figure reads them; a guard rig (`guardRows`, no tuner rows) has none
    if (this.guardSt === null || this.tuneSt !== null) {
      this.fingerFrame();
      this.goggleFrame();
    }
    for (let k = 0; k < this.onPosed.length; k++) this.onPosed[k]!();
  }

  /**
   * (anim-skeleton S2, A9) The per-finger curl / spread: the grip closures' hand shapes, then (a rig with tuner rows)
   * this rig's own Hands & feet finger values (inside its window: the closure carries their mean, taken back out so each
   * finger gets its own), then the clip slot `fingerClip`. No allocation.
   */
  private fingerFrame(): void {
    const f = this.fingers;
    const st = this.tuneSt;
    const rows = st !== null && st.hands.curAny;
    const meanOn = rows && HANDS_CUR.on && HANDS_CUR.curlOn;
    const gl = meanOn ? Math.min(1, Math.max(0, this.handGrip.l - HANDS_CUR.curl[1]!)) : this.handGrip.l;
    const gr = meanOn ? Math.min(1, Math.max(0, this.handGrip.r - HANDS_CUR.curl[0]!)) : this.handGrip.r;
    handGripShape(gl, gr, this.rightTrigger, f);
    if (rows) {
      const cur = st.hands.cur;
      for (let k = 0; k < FINGER_N; k++) {
        f[FING_L + k * 2] = f[FING_L + k * 2]! + cur[HP_FING_L + k * 2]!;
        f[FING_L + k * 2 + 1] = f[FING_L + k * 2 + 1]! + cur[HP_FING_L + k * 2 + 1]! / SPREAD_MAX_DEG;
        f[FING_R + k * 2] = f[FING_R + k * 2]! + cur[HP_FING_R + k * 2]!;
        f[FING_R + k * 2 + 1] = f[FING_R + k * 2 + 1]! + cur[HP_FING_R + k * 2 + 1]! / SPREAD_MAX_DEG;
      }
    }
    const c = this.fingerClip;
    for (let i = 0; i < FING_LEN; i++) f[i] = f[i]! + c[i]!;
  }

  /**
   * (S2) This window's goggle gear offsets into `goggleOff` (the figure applies its own pose's). (anim-goggle) A Wren rig
   * with a `goggles` gear offset writes it into `GOGGLE_OFFSET.inUse` (over the table's own value) for the copy and puts
   * the old value back after, so the global never leaks to the next rig. No offset: the table copied as it stands. No
   * allocation.
   */
  private goggleFrame(): void {
    const ts = this.tuneSt;
    const gOn = ts !== null && ts.gear.live[GS.goggles] === 1;
    if (gOn) {
      const u = GOGGLE_OFFSET.inUse;
      const v = ts.gear.goggle;
      const w = goggleSave;
      w[0] = u.x;
      w[1] = u.y;
      w[2] = u.z;
      w[3] = u.pitch;
      w[4] = u.yaw;
      w[5] = u.roll;
      setGoggleOffset('inUse', u.x + v[0]!, u.y + v[1]!, u.z + v[2]!, u.pitch + v[3]!, u.yaw + v[4]!, u.roll + v[5]!);
    }
    this.goggleCopy();
    if (gOn) {
      const w = goggleSave;
      setGoggleOffset('inUse', w[0]!, w[1]!, w[2]!, w[3]!, w[4]!, w[5]!);
    }
  }

  /** (S2) `GOGGLE_OFFSET` (stowed, then in use) into `goggleOff`. */
  private goggleCopy(): void {
    const g = this.goggleOff;
    for (let k = 0; k < 2; k++) {
      const o = k === 0 ? GOGGLE_OFFSET.stowed : GOGGLE_OFFSET.inUse;
      const b = k * 6;
      g[b] = o.x;
      g[b + 1] = o.y;
      g[b + 2] = o.z;
      g[b + 3] = o.pitch;
      g[b + 4] = o.yaw;
      g[b + 5] = o.roll;
    }
  }

  /**
   * (anim-skeleton S2) The clavicle nodes from `clavIn` and (S3) the clip's clavicle channel (`clavKey`: the Joints / tool
   * input turns on top of it in the chest frame), before the arms: a turned clavicle carries its shoulder's rest about
   * the SC point in `solveArm`. (S3, the S2 polish note) `applyTargets` has no early return: this and both `solveArm`
   * calls run as a pair on every animated frame, and nothing else writes the clavicle nodes or the shoulders' positions
   * after them, so the node's turn and the shoulder's carry always agree and `readRig`'s un-carry is exact (an LOD-skipped
   * frame changes neither). An untouched side stays at the identity it was built with. No allocation.
   */
  private clavFrame(): void {
    for (let k = 0; k < 2; k++) {
      const o = k === 0 ? CLAV_L : CLAV_R;
      const q = (k === 0 ? this.clavL : this.clavR).rotationQuaternion!;
      const tuned = clavActive(this.clavIn, o);
      const keyed = this.clavKeyOn[k] === 1;
      if (tuned || keyed) {
        if (tuned) {
          clavQuat(this.clavIn, o, clavBuf, 0);
          if (keyed) clavCompose(clavBuf, 0, this.clavKey, k * 4);
        } else for (let c = 0; c < 4; c++) clavBuf[c] = this.clavKey[k * 4 + c]!;
        q.set(clavBuf[0]!, clavBuf[1]!, clavBuf[2]!, clavBuf[3]!);
        this.clavOn[k] = 1;
      } else if (this.clavOn[k] === 1) {
        q.set(0, 0, 0, 1);
        this.clavOn[k] = 0;
      }
      // (anim-skeleton S4) the Joints clavicle row (this rig's composed base + tuner delta, eased; outside a tuner window
      // or at zero: no-op) on top in the chest frame, as the shoulder rows turn in their parent's frame
      if (jointApply(q, k === 0 ? J.clavicleL : J.clavicleR, true)) this.clavOn[k] = 1;
    }
  }

  /**
   * Push the held weapon out of the body: sample its bore line and top edge against the trunk (a capsule
   * pelvis -> neck base), the head ball and the leg capsules, and translate the aim pocket out along the
   * summed overlap. Up to four passes on flat typed arrays (no allocation, no calls in the inner loop).
   * Returns the distance pushed (m).
   */
  private clearBody(dt: number): number {
    const w = this.heldWeapon!;
    const g = this.gunSpan;
    const m = this.gunFrame().getWorldMatrix();
    // hips, neck (setWorldRot of the head), head, knees and ankles are already fresh this frame
    const P = this.hips.getAbsolutePosition();
    const Hc = posIn(this.headNode, headPt);
    // trunk (pelvis -> neck base), head ball, and the legs (solved this frame, before the weapon); legs get
    // extra margin (a thin stick limb still reads as touching just outside its radius)
    clrSet(0, P, this.neck.getAbsolutePosition(), this.p.chest.d * 0.5 + CLEAR_MARGIN);
    clrSet(1, Hc, Hc, this.p.head.h * 0.46 + CLEAR_MARGIN);
    const thighR = this.p.thigh.r0 + CLEAR_MARGIN + 0.035;
    const calfR = this.p.calf.r0 + CLEAR_MARGIN + 0.035;
    clrSet(2, this.hipL.getAbsolutePosition(), this.kneeL.getAbsolutePosition(), thighR);
    clrSet(3, this.kneeL.getAbsolutePosition(), posIn(this.ankleL, ankLPt), calfR);
    clrSet(4, this.hipR.getAbsolutePosition(), this.kneeR.getAbsolutePosition(), thighR);
    clrSet(5, this.kneeR.getAbsolutePosition(), posIn(this.ankleR, ankRPt), calfR);
    // gun samples in world space (bore line and top edge, stock to muzzle), moved with each push
    const e = m.m;
    const half = CLR_PTS / 2;
    for (let k = 0; k < half; k++) {
      const z = g.z0 + ((g.z1 - g.z0) * k) / (half - 1);
      for (let j = 0; j < 2; j++) {
        const y = j === 0 ? g.bore : g.top;
        const o = (k * 2 + j) * 3;
        clrPts[o] = y * e[4]! + z * e[8]! + e[12]!;
        clrPts[o + 1] = y * e[5]! + z * e[9]! + e[13]!;
        clrPts[o + 2] = y * e[6]! + z * e[10]! + e[14]!;
      }
    }
    let pushed = 0;
    let ox = 0;
    let oy = 0;
    let oz = 0;
    for (let pass = 0; pass < 4; pass++) {
      // every overlap pushes along its own normal; the summed push resolves several contacts at once
      let best = 0;
      let sx = 0;
      let sy = 0;
      let sz = 0;
      for (let k = 0; k < CLR_PTS; k++) {
        const px = clrPts[k * 3]! + ox;
        const py = clrPts[k * 3 + 1]! + oy;
        const pz = clrPts[k * 3 + 2]! + oz;
        for (let c = 0; c < CLR_N; c++) {
          const o = c * 8;
          const ax = clrCap[o]!;
          const ay = clrCap[o + 1]!;
          const az = clrCap[o + 2]!;
          const vx = clrCap[o + 3]!;
          const vy = clrCap[o + 4]!;
          const vz = clrCap[o + 5]!;
          let t = ((px - ax) * vx + (py - ay) * vy + (pz - az) * vz) * clrCap[o + 6]!;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const dx = px - ax - vx * t;
          const dy = py - ay - vy * t;
          const dz = pz - az - vz * t;
          const r = clrCap[o + 7]!;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= r * r) continue;
          const d = Math.sqrt(d2);
          const depth = r - d;
          const f = depth / (d > 1e-6 ? d : 1e-6);
          sx += dx * f;
          sy += dy * f;
          sz += dz * f;
          if (depth > best) best = depth;
        }
      }
      // the summed push, at least as long as the deepest overlap
      const sl = Math.sqrt(sx * sx + sy * sy + sz * sz);
      if (sl <= 1e-4) break;
      const len = Math.max(best, Math.min(sl, best * 2));
      sx *= len / sl;
      sy *= len / sl;
      sz *= len / sl;
      ox += sx;
      oy += sy;
      oz += sz;
      pushed += len;
    }
    clrDir.set(ox, oy, oz);
    if (pushed > 0) {
      // world push -> the pocket's parent (torso) space
      const pm = (this.weaponPivot.parent as TransformNode).getWorldMatrix();
      pm.invertToRef(clrM);
      Vector3.TransformNormalToRef(clrDir, clrM, clrDir);
    }
    // (anim-natural N3) while a travel carries the gun the pocket is its target, measured where the gun will be held:
    // in the swap's compressed pocket that push jumped 10-17 cm a frame as contacts came and went, and the gun followed;
    // the push is eased then (TRAVEL_PUSH_TAU) and held in step otherwise, so the hold at the end takes it as it is
    // (anim-n4c) and while changing hands: the gun crosses the trunk's centre line, where a contact's push turns over
    const ps = this.travelPush;
    const easePush = this.weaponTravel || this.handSwap >= 0;
    if (easePush) {
      const k = 1 - Math.exp(-dt / TRAVEL_PUSH_TAU);
      ps.x += (clrDir.x - ps.x) * k;
      ps.y += (clrDir.y - ps.y) * k;
      ps.z += (clrDir.z - ps.z) * k;
      clrDir.copyFrom(ps);
    } else ps.copyFrom(clrDir);
    if (pushed > 0 || easePush) {
      this.weaponPivot.position.addInPlace(clrDir);
      fresh(this.weaponPivot);
      freshBelow(w, this.weaponPivot);
    }
    return pushed;
  }

  /**
   * (anim-natural N3) The frame the aim pocket's sight and body clearance are measured on: the held gun, or while a
   * travel carries it, the pocket itself (where the gun will be held: the gun's node sits at the pocket with no offset).
   * Measured on the travelling gun they pushed the pocket by where the gun was last frame, the travel then followed the
   * pushed pocket, and the two fed back (the gun jittered about 5 mm a frame settling into the low ready).
   */
  private gunFrame(): TransformNode {
    return this.weaponTravel ? this.weaponPivot : this.heldWeapon!;
  }

  /** Hit reaction (additive flinch, recovers over ~0.4 s). */
  hit(strength: number, side = 0): void {
    this.graph.hitReact(strength, side);
  }

  private applyTargets(t: ReturnType<AnimGraph['update']>, dt: number, free: boolean): void {
    const p = this.p;
    this.rollPole = t.tumbleLift || t.tumbleSpin !== 0;
    // (anim-n4b, PASS2 row 66) a roll: the spin about the hips-to-feet line first, then the tumble's pitch (as `rollTurn`),
    // and the pivot sunk toward the floor (`tumbleDrop`)
    if (t.tumbleSpin !== 0) {
      rollAxisV.set(0, Math.cos(ROLL_BODY.tilt), -Math.sin(ROLL_BODY.tilt));
      Quaternion.RotationAxisToRef(Vector3.RightReadOnly, t.tumble, tmpQ);
      tmpQ.multiplyToRef(Quaternion.RotationAxisToRef(rollAxisV, t.tumbleSpin, tmpQ2), this.body.rotationQuaternion!);
    } else this.body.rotationQuaternion!.copyFrom(Quaternion.RotationAxisToRef(Vector3.RightReadOnly, t.tumble, tmpQ));
    this.body.position.y = this.bodyPivot - t.tumbleDrop;
    // root (moved by the caller) and body: the one forced update per frame; everything below is
    // refreshed top-down with `fresh`
    this.body.computeWorldMatrix(true);
    const pe = t.pelvis;
    const L = this.planner.L;
    const R = this.planner.R;
    const st = t.stance;
    const rp = this.root.position;
    const yaw = this.root.rotation.y;
    // feet in the air / traversing: placed in root space from the stance (the clip lifts them)
    if (free) {
      const c = Math.cos(yaw);
      const s = Math.sin(yaw);
      L.x = rp.x + st.lX * c + st.lZ * s;
      L.z = rp.z - st.lX * s + st.lZ * c;
      R.x = rp.x + st.rX * c + st.rZ * s;
      R.z = rp.z - st.rX * s + st.rZ * c;
      L.y = R.y = rp.y;
      L.yaw = R.yaw = yaw;
      L.pitch = R.pitch = 0;
      // tumbling (landing roll): the feet turn over with the body about the hip pivot
      // (anim-n4b) a roll: with the spin and the sunk pivot, the clip's lifts turning with the body (the IK adds the lift
      // back on top: the sole lands on the turned point)
      if (t.tumbleLift) {
        // (the soles in the body frame: they sink with the pivot)
        const py = rp.y + this.bodyPivot - t.tumbleDrop;
        for (let k = 0; k < 2; k++) {
          const f = k === 0 ? L : R;
          const lift = k === 0 ? st.lY : st.rY;
          const dx = f.x - rp.x;
          const dz = f.z - rp.z;
          rollTurn(t.tumble, t.tumbleSpin, dx * c - dz * s, f.y + p.y.ankle + lift - rp.y - this.bodyPivot, dx * s + dz * c, rollV);
          f.x = rp.x + rollV.x * c + rollV.z * s;
          f.z = rp.z - rollV.x * s + rollV.z * c;
          f.y = py + rollV.y - p.y.ankle - lift;
          f.pitch = t.tumble;
        }
      } else if (Math.abs(t.tumble) > 1e-3) {
        const tc = Math.cos(t.tumble);
        const ts = Math.sin(t.tumble);
        const py = rp.y + this.bodyPivot;
        for (let k = 0; k < 2; k++) {
          const f = k === 0 ? L : R;
          const dx = f.x - rp.x;
          const dz = f.z - rp.z;
          const vf = dx * s + dz * c;
          const vr = dx * c - dz * s;
          const vy = f.y + p.y.ankle - py;
          const vf2 = vy * ts + vf * tc;
          const vy2 = vy * tc - vf * ts;
          f.x = rp.x + vr * c + vf2 * s;
          f.z = rp.z - vr * s + vf2 * c;
          f.y = py + vy2 - p.y.ankle;
          f.pitch = t.tumble;
        }
      }
      // attached: soles onto rungs / wall pads
      const pl = this.plantL;
      const pr = this.plantR;
      if (pl.w > 0) {
        L.x += (pl.x - L.x) * pl.w;
        L.y += (pl.y - L.y) * pl.w;
        L.z += (pl.z - L.z) * pl.w;
      }
      if (pr.w > 0) {
        R.x += (pr.x - R.x) * pr.w;
        R.y += (pr.y - R.y) * pr.w;
        R.z += (pr.z - R.z) * pr.w;
      }
    }
    // (ct-prototype D+E, E1) climbing (ladder, drainpipe) the CLIMB clip's foot lift (up to 0.3 m, unsynced with the
    // foot stepper) put a planted foot at hip height straight ahead: on a plant the lifted sole stays CLIMB_FOOT_BELOW
    // under the hip joints' rest height. (Taking the lift off altogether lowered the feet so far the pelvis sank away
    // from the hands: e2e-traverse drainpipe grip reach 4-8 cm.)
    const climbing = this.input.traverse === 'climb' || this.input.traverse === 'pipeClimb';
    const footCap = rp.y + this.bodyPivot + this.pelvisRest - CLIMB_FOOT_BELOW - p.y.ankle;
    const lYc = climbing && this.plantL.w > 0 ? Math.min(st.lY, Math.max(0, footCap - L.y)) : st.lY;
    const rYc = climbing && this.plantR.w > 0 ? Math.min(st.rY, Math.max(0, footCap - R.y)) : st.rY;
    // pelvis drops so both feet stay reachable with soft knees (wide steps, lower ground, kneeling):
    // each foot measured from its own hip joint (pelvis offset and hip width), and a growing need is met
    // at once (a lagging drop lets the trailing leg overstretch and the planted ankle slide at toe-off);
    // easing back up stays smooth
    const legFull = p.thigh.len + p.calf.len;
    // (G1) standing the soft knee is nearly straight; crouched (the pelvis far below any reach) it stays 0.97
    // (G1 fix) free movement only (stride 'facing'): aiming, strafing and the wall keep the 3.2.0 soft knee and pelvis hold
    // (their wide side-steps need the slack: e2e-anim aim strafe foot lock)
    const freeGait = this.pin.stride === 'facing';
    // (CT prototype G8) the keyed walk (G8-PLAN.md) in free movement on foot: its pelvis offset, knee pole and (below) trunk
    // and arms over the procedural pose; the feet stay the planner's (world-locked, slopes, turns)
    // (anim-rework S3) and the drawn set aiming (stride 'velocity': the glide)
    const kw = (freeGait || t.keyDrawn > 0.01) && !free ? t.keyW : 0;
    this.keyWNow = kw;
    const kq = t.keyed;
    const kk = p.height / 1.75;
    let pex = pe.x + (kq.pel[0]! * kk - pe.x) * kw;
    // (the height adds to the procedural one: the posture's knee bend and the legs' reach stay; the clip shapes the step)
    // (n138 fix 2) the keyed offsets (height, forward) change at most KEY_PEL_RATE m/s (unchanged when under it)
    // (mocap-trial) MOCAP_LAYERS.keyPelRate on the mocap share (1: KEY_PEL_RATE exactly; 0 lets the limit go there)
    const kpm = (KEY_PEL_RATE * dt) / mocapLayerK(MOCAP_LAYERS.keyPelRate, t.keyMocap);
    // (afp-af2, BRIEF A2) past a jog the capture's height rides about its own mean (MOCAP_LAYERS.pelHeight: the clip's
    // absolute height put the run 6.9 cm and the sprint 12.5 cm under the procedural one, over bent knees), its stance
    // dip scaled by MOCAP_RUN_POSE.bob and the whole lifted by `lift` (the stance knee under ~35 deg)
    const runS = this.mocapRunPose(t.keyMocap, kw, kq, pe.roll, t.spine.roll, dt);
    const pc = 1 - mocapLayerK(MOCAP_LAYERS.pelHeight, runS);
    const pm = this.runMean[0]!;
    const pl = this.runLift;
    let kpy = (kq.pel[1]! + pc * (MOCAP_RUN_POSE.lift * pl - pm - (1 - MOCAP_RUN_POSE.bob) * pl * (kq.pel[1]! - pm))) * kk * kw;
    let kpz = (kq.pel[2]! * kk - pe.z) * kw;
    if (this.keyPelOn) {
      if (kpy > this.keyPelY + kpm) kpy = this.keyPelY + kpm;
      else if (kpy < this.keyPelY - kpm) kpy = this.keyPelY - kpm;
      if (kpz > this.keyPelZ + kpm) kpz = this.keyPelZ + kpm;
      else if (kpz < this.keyPelZ - kpm) kpz = this.keyPelZ - kpm;
    }
    this.keyPelOn = true;
    this.keyPelY = kpy;
    this.keyPelZ = kpz;
    const pey = pe.y + kpy;
    const pez = pe.z + kpz;
    // (anim-rework S4) the free kneel's knees over the toes (KNEEL_KNEE_OUT)
    const kneeOut0 = KNEE_OUT + (KNEEL_KNEE_OUT - KNEE_OUT) * t.kneel;
    this.kneeOutNow = (kneeOut0 + (t.keyKneeOut - kneeOut0) * kw) * TUNE_CUR.kneeOutMul;
    const softStand = freeGait ? SOFT_KNEE_STAND : 0.97;
    const legLen = legFull * (this.input.crouch > 0.5 ? 0.97 : softStand - (softStand - 0.97) * Math.max(0, this.input.crouch * 2)) - TUNE_CUR.kneeFlexAdd;
    const hipY = rp.y + this.bodyPivot + this.pelvisRest + pey - 0.03;
    // (G1 fix, audit row 9) standing still the body settles over its feet: a stop's slide leaves the frozen feet behind the
    // capsule (up to ~0.3 m), so the hips come back toward the feet's midpoint (at most REST_SHIFT, eased); the same on a
    // remote copy (from its own planted feet)
    {
      const still = !free && !t.gait.moving && !this.input.wall && L.contact && R.contact && this.input.crouch < 0.5;
      const mid = ((L.x + R.x) * 0.5 - rp.x) * Math.sin(yaw) + ((L.z + R.z) * 0.5 - rp.z) * Math.cos(yaw);
      const target = still ? Math.max(-REST_SHIFT, Math.min(REST_SHIFT, mid)) : 0;
      const rs = approachTo(this.restShift, target, dt, 0.06);
      // (mt2-fixC, CHECK-3 item 6) and at most REST_SHIFT_RATE while the mocap share keeps the hips off the feet (the
      // pelvis-follow layer, as the knee pole below): a CT stop hold's release let go of a 7 cm settle by 1.7 cm in a frame
      const rm = REST_SHIFT_RATE * dt;
      this.restShift = this.mOn && mocapLayerK(MOCAP_LAYERS.pelvisFollow, t.keyMocap) < 1 && (rs > this.restShift + rm || rs < this.restShift - rm) ? this.restShift + (rs > this.restShift ? rm : -rm) : rs;
    }
    // (anim-rework S3, BRIEF 3 "the centre of mass over the base of support") gliding aimed (the drawn keyed set raised)
    // the hips ride over the feet's centre across the body (GLIDE_HIP: the weight moves onto the lead foot of a side-step
    // before the trailing foot closes), eased; the chest above stays square (the spine counters only the tilt)
    {
      // (mocap-trial-2 strafe fix) also under the mocap strafe: its hips over the planner's feet, not a fixed hold (knee-out)
      const gk = free || this.input.wall ? 0 : t.keyDrawn * t.aimW * kw;
      const midX = ((L.x + R.x) * 0.5 - rp.x) * Math.cos(yaw) - ((L.z + R.z) * 0.5 - rp.z) * Math.sin(yaw);
      // (AF4a) crouched (blended by the crouch) the hips go GLIDE_HIP_CROUCH.share of the way, at most `max` off and
      // `rate` m/s; crouch 0 keeps GLIDE_HIP as it was
      const ck = this.input.crouch > 0 ? Math.min(1, this.input.crouch) : 0;
      const share = GLIDE_HIP.share + (GLIDE_HIP_CROUCH.share - GLIDE_HIP.share) * ck;
      const gmax = GLIDE_HIP.max + (GLIDE_HIP_CROUCH.max - GLIDE_HIP.max) * ck;
      const want = gk > 0 ? Math.max(-gmax, Math.min(gmax, midX - pex)) * share * gk : 0;
      const gs = approachTo(this.glideShift, want, dt, GLIDE_HIP.tau);
      const gm = ck > 0 ? (GLIDE_HIP_CROUCH.rate * dt) / ck : Infinity;
      this.glideShift = gs > this.glideShift + gm ? this.glideShift + gm : gs < this.glideShift - gm ? this.glideShift - gm : gs;
      pex += this.glideShift;
    }
    // (mocap-trial-2 strafe fix, the e2e-anim knee-out) in the mocap strafe the hips stay STRAFE_HIP_IN inside each planted
    // foot across the body (the captures keep the pelvis 4.4 cm inside theirs; played over the planner's longer side-steps
    // the hips sat over or past the planted trailing foot and its knee bowed out 7.6 cm); both planted closer than that:
    // their midpoint. Eased (GLIDE_HIP.tau), by the strafe's share; never with the switch off (keyStrafe 0, strafeHip 0)
    if (t.keyStrafe > 0 || this.strafeHip !== 0) {
      let want = 0;
      if (t.keyStrafe > 0 && !free && !this.input.wall) {
        const cy = Math.cos(yaw);
        const sy = Math.sin(yaw);
        const lo = L.contact ? (L.x - rp.x) * cy - (L.z - rp.z) * sy + STRAFE_HIP_IN : -1e9;
        const hi = R.contact ? (R.x - rp.x) * cy - (R.z - rp.z) * sy - STRAFE_HIP_IN : 1e9;
        const at = pex;
        const tgt = lo > hi ? (lo + hi) * 0.5 : at < lo ? lo : at > hi ? hi : at;
        want = (tgt - at) * t.keyStrafe;
      }
      this.strafeHip = approachTo(this.strafeHip, want, dt, GLIDE_HIP.tau);
      // (strafe fix 3) in the strafe the hips' whole sideways offset (last frame's: strafeSum) at most STRAFE_HIP_RATE a
      // frame: this shift takes up the excess
      const ds = pex + this.strafeHip - this.strafeSum;
      const dm = STRAFE_HIP_RATE * dt;
      if (t.keyStrafe > 0 && ds > dm) this.strafeHip -= ds - dm;
      else if (t.keyStrafe > 0 && ds < -dm) this.strafeHip -= ds + dm;
      if (t.keyStrafe <= 0 && this.strafeHip < 1e-5 && this.strafeHip > -1e-5) this.strafeHip = 0;
      pex += this.strafeHip;
    }
    this.strafeSum = pex;
    // (anim-natural-n2) the body motion layer's pelvis sway, before the feet's reach (a Wren rig on foot; 0 on any other)
    if (t.motion.pelX !== 0) pex += t.motion.pelX * kk;
    // (anim-natural N4c, AUDIT row 49) a Wren rig's elbow strike: the hips and trunk drive it (strikeBody.ts); the weight
    // shifts back over the rear foot on the wind-up and onto the lead foot driving, on the feet only (attached, a takedown
    // blow from a hang or a pipe, the turn alone); the turn goes on after the keyed trunk
    // (strike-pops) at the trunk's pace (`STRIKE_BODY_RATE`): the strike's drive over 3 frames, not on the arm's fastest 2
    this.sbPh = strikeBodyPhase(this.sbPh, this.graph.wrenReady ? this.input.melee : -1, dt);
    const sb = strikeBodyAt(this.sbPh, this.sb);
    if (!free) pex += sb.side;
    const peZ = pez + this.restShift + (free ? 0 : sb.fwd);
    const yc = Math.cos(yaw);
    const ys = Math.sin(yaw);
    let need = 0;
    let hard = 0;
    for (let k = 0; k < 2; k++) {
      const f = k === 0 ? L : R;
      // (locomotion step 21, D2 one low / one high per step, A80) a stepping foot in the air does not pull the
      // pelvis down before it lands: the trailing foot just lifted lets go (early swing counts for nothing) and the
      // reaching foot may straighten its knee (terminal swing, full leg length), its share growing over the second
      // half of the swing so a step down onto a lower tread still lowers the pelvis ahead of the landing. Before,
      // the reaching foot dropped the pelvis 2-3 cm two frames before every other heel strike (a second low per
      // step) and the sprint's trailing foot up to 13 cm in flight.
      // A landed foot eases from the full leg back to the soft knee over ~0.1 s (the loading response: the low
      // just after the strike), so the need is continuous across the landing (no one-frame drop, no ankle snap).
      // (A82) Not for a step the travel has reversed against (over ~135 deg from the foot's heading at lift: a 180
      // turn's first steps, a backpedal; not a strafe or wall side-step): the foot swings back past the planted one,
      // and a pelvis held high for it overstretched the legs (turn180 selfShanks 1.8 -> 2.0-5 cm, the landed ankle
      // pulled 3.9 cm off its plant); such a step pulls the pelvis down at the soft
      // knee all through its swing as before step 21, and lands already at the soft knee
      let w = 1;
      const air = !free && !f.contact && f.swing >= 0;
      const reversed = air && this.velX * Math.sin(f.fromYaw) + this.velZ * Math.cos(f.fromYaw) < -0.7 * hyp2(this.velX, this.velZ);
      const stepping = air && !reversed;
      const soft = stepping ? 0 : reversed ? 1 : approachTo(this.soft[k]!, 1, dt, 0.035);
      this.soft[k] = soft;
      let len = legFull - (legFull - legLen) * soft;
      if (stepping) {
        const u = Math.max(0, Math.min(1, (f.swing - 0.5) * 2));
        w = u * u * (3 - 2 * u);
        len = legFull;
      }
      // (fix 21-3) the trailing foot just lifted lets go of the drop it held over the first half of its swing (the
      // reaching foot's share grows over the second half): letting go at once raised the pelvis 1.8-6.8 cm in a frame
      // on stairs and ramps going up, where the planted trailing foot had held it low. Capped at what it needed
      // planted (it never grows in the air: the sprint's trailing foot pulled the pelvis down 13 cm in flight)
      // Only for a take-off below the root (climbing): on the level it lets go at once as before (a turn's held
      // trailing drop crossed the shins, turn180 selfShanks 1.3 -> 8 cm)
      if (stepping) {
        const u = Math.max(0, Math.min(1, f.swing * 2));
        const up = Math.max(0, Math.min(1, (rp.y - f.fromY - 0.03) / 0.05));
        if (up > 0) need = Math.max(need, (k === 0 ? this.liftL : this.liftR) * up * (1 - u * u * (3 - 2 * u)));
      }
      if (w <= 0) continue;
      const hx = pex + (k === 0 ? -p.hipHalf : p.hipHalf);
      const dh = hyp2(f.x - (rp.x + hx * yc + peZ * ys), f.z - (rp.z - hx * ys + peZ * yc));
      // (G1) with the heel lift the IK target gets (the toe raise and heel roll lengthen the leg: no dip for them)
      const footY = f.y + p.y.ankle + (k === 0 ? lYc : rYc) + heelLift(f);
      const reachV = Math.sqrt(Math.max(0, len * len - dh * dh));
      const fNeed = hipY - footY - reachV;
      if (!stepping) {
        if (k === 0) this.liftL = Math.max(0, fNeed);
        else this.liftR = Math.max(0, fNeed);
        // (G1 fix) a planted leg is never asked past REACH_HARD of its length, whatever the drop's easing (with the soft
        // knee near straight a lagging drop stretched the IK and the planted ankle slid ~1 cm: e2e-anim aim strafe)
        if (f.contact) hard = Math.max(hard, hipY - footY - Math.sqrt(Math.max(0, legFull * legFull * REACH_HARD * REACH_HARD - dh * dh)));
      }
      need = Math.max(need, fNeed * w);
    }
    need = Math.max(0, Math.min(0.4, need));
    hard = Math.max(0, Math.min(0.4, hard));
    // (3.2.0) turned over on a pipe (legs up / inverted) "down" is not the floor: no drop for the feet's reach
    const turned = Math.abs(this.input.tumble) > 0.3 || t.tumbleLift; // (anim-n4b) and a roll (its feet turn with the body)
    if (turned) need = 0;
    // (BC note 6) walking, the drop is held near its per-step peak (slow release) so the chest does not bob with every
    // step: a growing need is still met at once (no overstretched leg), only the easing back up slows with speed
    // (ct-prototype D+E) on foot only: hanging / climbing (free feet) the body's speed is the shimmy or the climb, and a
    // held drop kept the pelvis (and the shoulders) low, the hands short of the lip (e2e-traverse shimmy grip reach 3 cm)
    const fall = 0.08 + (free ? 0 : (freeGait ? PELVIS_HOLD : PELVIS_HOLD_AIM) * Math.min(1, hyp2(this.velX, this.velZ) / 1.2));
    this.pelvisDrop = need > this.pelvisDrop ? approachTo(this.pelvisDrop, need, dt, 0.012) : approachTo(this.pelvisDrop, need, dt, fall);
    if (!turned && this.pelvisDrop < hard) this.pelvisDrop = hard;
    this.hips.position.set(pex, this.pelvisRest + pey - this.pelvisDrop, peZ);
    // (A1.2) the hips follow the legs (this.follow); the spine takes it back so the chest stays on the facing
    Quaternion.RotationYawPitchRollToRef(pe.yaw + this.follow, pe.pitch, pe.roll, this.hips.rotationQuaternion!);
    // (on a wall the knees keep to the feet, as before)
    this.pelvisWorldYaw = this.input.wall || free ? Number.NaN : yaw + this.follow;
    // (G6 fix, e2e-netmove wall crouch) side-on on a wall the legs (knee pole and foot yaw) take the body's yaw, not the
    // planner's foot yaws: those differ between the owner and the remote copy (their feet turn-stepped at other times),
    // which bent the kneel's down knee forward on one and down on the other (the knee hand 0.15-0.37 m apart)
    this.legYaw = this.input.wall && this.input.wallTurn > 0.5 ? yaw : Number.NaN;
    // the spine counters most of the pelvis tilt and twist so the chest stays square (gun platform)
    const sp = t.spine;
    Quaternion.RotationYawPitchRollToRef(sp.yaw * 0.4 - pe.yaw * 0.6 - this.follow, sp.pitch * 0.45 - pe.pitch * 0.6, sp.roll * 0.5 - pe.roll * 0.4, this.spine.rotationQuaternion!);
    Quaternion.RotationYawPitchRollToRef(sp.yaw * 0.6, sp.pitch * 0.55, sp.roll * 0.5, this.torso.rotationQuaternion!);
    // cheek weld: the neck flexes the head down and forward onto the stock (the head stays level, below)
    Quaternion.RotationYawPitchRollToRef(t.head.yaw * 0.4, t.head.pitch * 0.3 + t.weld * t.stockWeld * NECK_WELD * TUNE_CUR.headDropMul, t.head.roll * 0.4, this.neck.rotationQuaternion!);
    // (anim-rework S3) the trunk by keyTrunk: aiming the upper body stays the procedural gun platform
    if (kw * t.keyTrunk > 0) this.keyedTrunk(kq, kw * t.keyTrunk, t.head.yaw * 0.4);
    // (marlow-bays T1a, COVERAGE gap 4) aiming, the keyed trunk is not applied (the gun platform): the glide's and the
    // ready stance's per-key trunk edits go on over it by the share the keyed trunk leaves
    if (kq.edOn && kw * (1 - t.keyTrunk) > 0) this.keyedTrunkEdit(kq, kw * (1 - t.keyTrunk));
    // (anim-natural-n2) the body motion layer's pelvis / shoulder counter-rotation over the keyed trunk and its edits
    if (t.motion.hipYaw !== 0 || t.motion.chestYaw !== 0) this.motionTrunk(t.motion.hipYaw, t.motion.chestYaw);
    // (anim-natural-n2 step 3, A8) this frame's keyed arm speed cap (m per frame; Infinity: none) and the frame count
    this.armStep = dt > 0 ? t.motion.armSpeed * dt : Infinity;
    this.armTick++;
    if (sb.pel !== 0 || sb.chest !== 0) this.strikeTrunk(sb); // (anim-natural N4c) after the keyed trunk, which wiped it
    if (JOINTS_CUR.on) this.jointOffsets(0); // (tuner-v2) per-joint offsets on the trunk, before the leg and arm IK
    this.limitJoint(this.hips, dt);
    this.limitJoint(this.spine, dt);
    this.limitJoint(this.torso, dt);
    this.limitJoint(this.neck, dt);
    fresh(this.hips);
    fresh(this.spine);
    fresh(this.torso);
    // (step 12b, D10) a low-wall side lean keeps the head under the wall top: the pelvis sinks by the excess (eased)
    const cap = this.headCap;
    let capNeed = 0;
    if (cap !== undefined) {
      fresh(this.neck);
      capNeed = Math.max(0, Math.min(HEAD_CAP_MAX, posIn(this.headNode, headPt).y - cap));
    }
    this.capDrop = approachTo(this.capDrop, capNeed, dt, 0.04);
    if (this.capDrop > 1e-4) {
      this.hips.position.y -= this.capDrop;
      fresh(this.hips);
      fresh(this.spine);
      fresh(this.torso);
    }
    // legs first (onto the planner's world feet: ankle above the sole; heel raise and pitch from the pose),
    // so the weapon below is placed against this frame's legs
    // (mt2-fixB, CHECK-3 item 3) clip feet on hand: each knee pole's swing / stance share moves at most 1 / POLE_SWAP a
    // second (a landing swapped KNEE_SWING_SHARE for half way in a frame: in a 7.85 rad/s flick the knee swung round, the
    // hip / knee rate limit held it and the landed ankle missed its spot by 2.4 cm); off: -1, exactly as before
    // (mt2-fixC, CHECK-3 item 4) and while the mocap share keeps the hips off the feet (MOCAP_LAYERS.pelvisFollow: a spot
    // turn's turn-in-place slot, no clip feet), until a swap under way has run out: a spot flick's landing missed its spot
    // by 2.1 cm the same way. Placeholder clips (every layer 1) are left as before
    const poleM = this.mOn && mocapLayerK(MOCAP_LAYERS.pelvisFollow, t.keyMocap) < 1;
    for (let k = 0; k < 2; k++) {
      if (this.pin.clipFeet === null && !poleM && !(this.poleShare[k]! >= 0 && this.poleShare[k] !== this.poleWant(k === 0 ? -1 : 1))) {
        this.poleShare[k] = -1;
        continue;
      }
      const want = this.poleWant(k === 0 ? -1 : 1);
      const was = this.poleShare[k]!;
      const m = dt / POLE_SWAP;
      this.poleShare[k] = was < 0 ? want : want > was + m ? was + m : want < was - m ? was - m : want;
    }
    this.solveLegWorld(this.hipL, this.kneeL, this.ankleL, L.x, L.y + p.y.ankle + lYc + heelLift(L), L.z, L.yaw, L.pitch + st.lPitch, -1);
    this.solveLegWorld(this.hipR, this.kneeR, this.ankleR, R.x, R.y + p.y.ankle + rYc + heelLift(R), R.z, R.yaw, R.pitch + st.rPitch, 1);
    // (anim-rig) the toes bend up as the planted foot rolls onto its ball (the planner's pitch), so they stay on the floor
    Quaternion.RotationYawPitchRollToRef(0, free ? 0 : toePitch(L), 0, this.toeL.rotationQuaternion!);
    Quaternion.RotationYawPitchRollToRef(0, free ? 0 : toePitch(R), 0, this.toeR.rotationQuaternion!);
    // (G1 fix) exact reach guard on the solved hips: a planted foot the leg cannot reach (the drop above estimates the hip
    // joints; a pelvis tilt or shift it does not see left the IK short and the planted ankle slid: e2e-anim aim strafe)
    // lowers the hips by the shortfall and solves again
    if (!free && !turned) {
      const lim = legFull * REACH_HARD;
      let short = 0;
      for (let k = 0; k < 2; k++) {
        const f = k === 0 ? L : R;
        if (!f.contact) continue;
        const H = (k === 0 ? this.hipL : this.hipR).getAbsolutePosition();
        const ty = f.y + p.y.ankle + (k === 0 ? lYc : rYc) + heelLift(f);
        const dh2 = (H.x - f.x) * (H.x - f.x) + (H.z - f.z) * (H.z - f.z);
        const dv = H.y - ty;
        if (dh2 + dv * dv <= lim * lim || dh2 >= lim * lim) continue;
        short = Math.max(short, dv - Math.sqrt(lim * lim - dh2));
      }
      if (short > 1e-4) {
        this.hips.position.y -= short;
        this.pelvisDrop += short;
        fresh(this.hips);
        fresh(this.spine);
        fresh(this.torso);
        this.solveLegWorld(this.hipL, this.kneeL, this.ankleL, L.x, L.y + p.y.ankle + lYc + heelLift(L), L.z, L.yaw, L.pitch + st.lPitch, -1);
        this.solveLegWorld(this.hipR, this.kneeR, this.ankleR, R.x, R.y + p.y.ankle + rYc + heelLift(R), R.z, R.yaw, R.pitch + st.rPitch, 1);
      }
    }
    // anatomy: a knee never sinks into the floor (deep kneel): lift the pelvis and solve again
    // (G1) moving crouched the rear knee stays KNEE_FLOOR_MOVING up (eased: the kneel lowers it to the floor smoothly)
    const kfT = !free && t.gait.moving && this.input.crouch > 0.5 && !this.input.kneel ? KNEE_FLOOR_MOVING : KNEE_FLOOR;
    this.kneeFloor = approachTo(this.kneeFloor, kfT, dt, 0.08);
    const floorY = Math.min(L.y, R.y) + this.kneeFloor;
    const kneeY = Math.min(this.kneeL.getAbsolutePosition().y, this.kneeR.getAbsolutePosition().y);
    // (G1) the lift a moving crouch needs is met at once and let go over KNEE_LIFT_TAU (no 1:1 bob with every rear knee)
    const kneeNeed = turned ? 0 : Math.max(0, floorY - kneeY);
    this.kneeLift = kneeNeed >= this.kneeLift ? kneeNeed : approachTo(this.kneeLift, kneeNeed, dt, this.kneeFloor > KNEE_FLOOR + 0.01 ? KNEE_LIFT_TAU : 0.02);
    if (this.kneeLift > 0.002) {
      this.hips.position.y += this.kneeLift;
      fresh(this.hips);
      fresh(this.spine);
      fresh(this.torso);
      this.solveLegWorld(this.hipL, this.kneeL, this.ankleL, L.x, L.y + p.y.ankle + lYc + heelLift(L), L.z, L.yaw, L.pitch + st.lPitch, -1);
      this.solveLegWorld(this.hipR, this.kneeR, this.ankleR, R.x, R.y + p.y.ankle + rYc + heelLift(R), R.z, R.yaw, R.pitch + st.rPitch, 1);
    }
    // anatomy: the knees never knock through each other (side-steps, leaning out): bow them outward
    const kneeGap = Vector3.Distance(this.kneeL.getAbsolutePosition(), this.kneeR.getAbsolutePosition());
    const gapMin = KNEE_GAP + (KEYED_KNEE_GAP - KNEE_GAP) * kw;
    if (kneeGap < gapMin) {
      // steeper bow the closer they came (a pole up to ~70 deg outward)
      // (anim-rework S2) under the keyed gaits a gentler bow, and only on a swinging leg when one swings: the planted knee
      // stays over its toes and the passing knee clears it (both bowed 6 x had both knees 9-17 cm outside the ankles in
      // a direction change)
      const need = 1 - kneeGap / gapMin;
      // (mocap-trial-2 strafe fix 2) in the mocap strafe a bow that only parts them (STRAFE_KNEE_BOW); never with the switch off
      const bowK = 6 + (KEYED_KNEE_BOW - 6) * kw;
      const bow = this.kneeOutNow + need * (t.keyStrafe > 0 ? bowK + (STRAFE_KNEE_BOW - bowK) * t.keyStrafe : bowK);
      const oneSwings = kw > 0.5 && L.contact !== R.contact;
      if (!oneSwings || !L.contact) this.solveLegWorld(this.hipL, this.kneeL, this.ankleL, L.x, L.y + p.y.ankle + lYc + heelLift(L), L.z, L.yaw, L.pitch + st.lPitch, -1, bow);
      if (!oneSwings || !R.contact) this.solveLegWorld(this.hipR, this.kneeR, this.ankleR, R.x, R.y + p.y.ankle + rYc + heelLift(R), R.z, R.yaw, R.pitch + st.rPitch, 1, bow);
    }
    // (G6 fix, check BLOCK 3) on a wall, turned side-on, a knee bowed out toward the face swings in, away from it (the
    // wall-side knee's outward is the wall); the ankles already keep WALL_FOOT_CLEAR off it
    if (this.input.wall && !Number.isNaN(this.pin.wallD)) {
      const nx = this.pin.wallNx;
      const nz = this.pin.wallNz;
      const face = this.pin.wallD - WALL_FOOT_CLEAR;
      const ry = this.root.rotation.y;
      const rn = Math.cos(ry) * nx - Math.sin(ry) * nz;
      for (let k = 0; k < 2; k++) {
        const kn = (k === 0 ? this.kneeL : this.kneeR).getAbsolutePosition();
        if (kn.x * nx + kn.z * nz - face >= WALL_KNEE_CLEAR || Math.abs(rn) < 0.3) continue;
        const sd = k === 0 ? -1 : 1;
        const o = sd * rn > 0 ? WALL_KNEE_SWING : -WALL_KNEE_SWING;
        if (k === 0) this.solveLegWorld(this.hipL, this.kneeL, this.ankleL, L.x, L.y + p.y.ankle + lYc + heelLift(L), L.z, L.yaw, L.pitch + st.lPitch, -1, o);
        else this.solveLegWorld(this.hipR, this.kneeR, this.ankleR, R.x, R.y + p.y.ankle + rYc + heelLift(R), R.z, R.yaw, R.pitch + st.rPitch, 1, o);
      }
    }
    if (HANDS_CUR.ikOn) this.ikStrengthLimbs(2); // (tuner-v2 item 2) IK targeting strength, before the joint offsets
    // (anim-skeleton S4) the planted ankles before the keyed leg stages (footSlide), then the deltas over the planner
    const legKeyed = kw > 0 && (kq.hasLeg === 1 || kq.hasLegd === 1);
    if (legKeyed) this.plantMark();
    if (kw > 0 && kq.hasLeg) this.keyedLegs(kq, kw); // (anim-skeleton S3, A7) the clip's FK legs over the IK legs
    if (kw > 0 && kq.hasLegd === 1) this.keyedLegDeltas(kq, kw);
    this.footSlideStep(legKeyed);
    if (JOINTS_CUR.on) this.jointOffsets(1); // (tuner-v2) per-joint offsets on the solved legs
    // the legs' rate limit before anything is placed against them (the weapon's clearance sees the final legs)
    // (mt2-fixB) while the switch's cross-fade runs (`switchFade`) a planted leg goes unlimited: the new pose's legs jump at the
    // toggle and the limit held a planted ankle 3.6 cm off its plant; the fade eases what is seen (undefined: as before)
    // (mt2-fixC, CHECK-3 item 6) and on the mocap share (`poleM`), a leg on its landing frame (plantT 0): the knee leaves
    // the swing's bow and pole there, and the limit held a 5 m/s flick's landed ankle 2.2 cm off its plant for the frame
    const xf = this.xfT >= 0 || this.xfStart;
    // (mt2-fixF) and a clip-planted leg holding its contact (clip feet on hand, anchored): the limit lagged it as the clip's
    // heel rose through a crouch's hand-over and the held ball slid 2.0 cm in the frame
    const cfOn = this.pin.clipFeet !== null;
    const xl = (xf || (poleM && L.plantT === 0) || (cfOn && L.clipPlant && L.anchored)) && L.contact ? 1e9 : undefined;
    const xrr = (xf || (poleM && R.plantT === 0) || (cfOn && R.clipPlant && R.anchored)) && R.contact ? 1e9 : undefined;
    const lHip = this.limitJoint(this.hipL, dt, xl);
    const lh = this.limitJoint(this.kneeL, dt, xl) || lHip;
    const rHip = this.limitJoint(this.hipR, dt, xrr);
    const rh = this.limitJoint(this.kneeR, dt, xrr) || rHip;
    if (lh) {
      fresh(this.hipL);
      fresh(this.kneeL);
    }
    if (rh) {
      fresh(this.hipR);
      fresh(this.kneeR);
    }
    // (mt2-pop1) clip feet on hand: a rate-limited hip / knee carried the foot round with it for the frame (the knee pole's
    // swing / stance share swaps at a landing: in a fast walk turn the landed foot flicked 24-25 deg in a frame and back);
    // the foot keeps the planner's yaw and pitch (its pitch already turns at most MOCAP_FEET.pitchRate), its Joints offset on top
    // (mt2-fixC, CHECK-3 item 6c) also on the mocap share (`poleM`) and in the crouched capture (switch on, crouchWalk set):
    // a crouched sneak flick's toe-off turned the limited leg's foot off the planner's and its ball slid 2.1 cm
    if ((lh || rh) && (this.pin.clipFeet || poleM || (this.mOn && LOCO.set.crouchWalk !== null && this.input.crouch > 0)) && !legKeyed && !HANDS_CUR.ikOn) {
      const ly = Number.isNaN(this.legYaw);
      if (lh) {
        Quaternion.RotationYawPitchRollToRef(ly ? L.yaw : this.legYaw, L.pitch + st.lPitch, 0, tmpQ3);
        this.setWorldRot(this.ankleL, this.kneeL, tmpQ3);
        if (JOINTS_CUR.on) jointApply(this.ankleL.rotationQuaternion!, J.ankleL);
        freshBelow(this.toeL, this.kneeL);
      }
      if (rh) {
        Quaternion.RotationYawPitchRollToRef(ly ? R.yaw : this.legYaw, R.pitch + st.rPitch, 0, tmpQ3);
        this.setWorldRot(this.ankleR, this.kneeR, tmpQ3);
        if (JOINTS_CUR.on) jointApply(this.ankleR.rotationQuaternion!, J.ankleR);
        freshBelow(this.toeR, this.kneeR);
      }
    }
    // head: world-stabilised (eyes level): looks along the aim plus the head channel
    // (anim-rework S2) plus the keyed idle's head scan (standing holstered and still only; the keyed neck alone was
    // undone by this stabilisation)
    // (anim-natural-n2) the body motion layer: the head lets a share of the chest's yaw off the facing through (not
    // aiming) and nods with the steps; added only when non-zero (every other rig is unchanged bit for bit)
    let hdYaw = yaw + this.input.aimYaw * 0.85 + this.lookYaw + t.head.yaw * 0.25 + (freeGait && !free ? t.keyScan : 0);
    let hdPitch = -this.input.aimPitch * 0.8 - this.lookPitch + t.head.pitch * 0.4;
    const mo = t.motion;
    if (mo.headFollow > 0 && t.aimW < 1) {
      const tm = this.torso.getWorldMatrix().m;
      const d = Math.atan2(tm[8]!, tm[10]!) - yaw;
      const f = mo.headFollow * Math.atan2(Math.sin(d), Math.cos(d)) * (1 - t.aimW);
      if (f !== 0) hdYaw += f;
    }
    if (mo.headPitch !== 0) hdPitch += mo.headPitch;
    Quaternion.RotationYawPitchRollToRef(hdYaw, hdPitch, t.head.roll * 0.6, tmpQ);
    this.setWorldRot(this.headNode, this.neck, tmpQ);
    // (marlow-bays T1a, item 17) a keyed head turn (local, on the look)
    if (kq.hasHead && kw > 0) {
      keyPow(kq.head, 0, kw, kT);
      this.headNode.rotationQuaternion!.multiplyInPlace(kT);
    }
    if (JOINTS_CUR.on) this.jointOffsets(2); // (tuner-v2) the head's offset on the look
    this.limitJoint(this.headNode, dt);

    // aim pocket: rest + layer offsets, mirrored to the left shoulder when the weapon is in the left hand
    const chestY = p.y.waist + 0.13 * (p.height / 1.75);
    // raised to the eye the shoulder girdle lifts into the stock
    const shY = p.y.shoulder - chestY + t.weld * SHOULDER_WELD;
    this.shoulderY = shY;
    if (Math.abs(this.shoulderR.position.y - shY) > 1e-5) {
      this.shoulderL.position.y = shY;
      this.shoulderR.position.y = shY;
    }
    const w = t.weapon;
    const mirror = 1 - this.handBlend * 2;
    // (anim-n4c, AUDIT row 29) changing hands aimed, the gun drops and comes forward under the chin (handSwapPath.ts)
    const swapK = handSwapK(this.input.handSwap);
    const swapDrop = swapK * t.aimW * TUNE_CUR.swapDropMul;
    this.weaponPivot.position.set((p.shoulderHalf * AIM_POCKET.x + w.x + TUNE_CUR.gunSide) * mirror, p.y.shoulder - chestY + AIM_POCKET.y + w.y + TUNE_CUR.gunUp - HAND_SWAP.drop * swapDrop, AIM_POCKET.z + w.z + TUNE_CUR.gunFwd + HAND_SWAP.fwd * swapDrop);
    // raised the weapon points along the aim; lowered (ready) it is carried with the body, so a lowered gun
    // never swings towards wherever the camera looks (into a wall beside you)
    const aimYaw = yaw + this.input.aimYaw * t.aimW;
    // (anim-n4c) changing hands the gun lets go of the aim's pitch: it passes at the carry's own tip (muzzle forward-down,
    // the graph's compressed carry at the mid-point), so aimed low the butt never rises past the face
    const aimPitch = this.input.aimPitch * (0.35 + 0.65 * t.aimW) * (1 - swapK);
    Quaternion.RotationYawPitchRollToRef(aimYaw + (w.yaw + TUNE_CUR.gunYaw) * mirror, -aimPitch + w.pitch + TUNE_CUR.gunPitch, (w.roll + TUNE_CUR.gunCant) * mirror, tmpQ);
    if (Math.abs(t.tumble) > 1e-3 || t.tumbleSpin !== 0) tmpQ.multiplyToRef(this.body.rotationQuaternion!, tmpQ);
    // (3.2.0) upside down the raised weapon aims in world space
    if (this.aimWorldYaw !== null && t.aimW > 0) {
      Quaternion.RotationYawPitchRollToRef(this.aimWorldYaw, -this.aimWorldPitch, 0, tmpQ3);
      Quaternion.SlerpToRef(tmpQ, tmpQ3, t.aimW, tmpQ);
    }
    // the weapon has mass: its world orientation follows the target through a short, mass-scaled lag
    if (!this.aimQ) this.aimQ = tmpQ.clone();
    else Quaternion.SlerpToRef(this.aimQ, tmpQ, 1 - Math.exp(-dt / (0.035 * Math.max(0.6, this.input.weight))), this.aimQ);
    this.setWorldRot(this.weaponPivot, this.torso, this.aimQ);
    this.limitJoint(this.weaponPivot, dt, 14 / Math.max(0.7, this.input.weight));
    fresh(this.weaponPivot);
    if (this.heldWeapon) {
      freshBelow(this.heldWeapon, this.weaponPivot);
      // raised: the sight line comes level with the eye, closed loop on the posed head (any stance, hunch or
      // lean), so an aimed or fired weapon is always up at the eye, never down at the chest
      // (anim-n4c) changing hands the sight lets go of the eye (the gun passes under the chin, not round the head)
      const weld = t.weld * (1 - swapK);
      if (weld > 0.01) this.sightToEye(weld, t.sightDrop);
      // self-collision: the weapon never passes through the trunk or the head (pushed out before the hands
      // take it, so the grips stay in the hands)
      this.gunPush = this.clearBody(dt);
    }

    // arms: the dominant hand takes the grip, the other the foregrip / magazine / wall (the wall contact moves
    // to the right hand when the weapon is in the left)
    // (ct-prototype D1) a draw / holster travel holds the trigger hand on the grip at once (the joint-rate limits spread
    // the reach), easing back to the graph's grip weight over 0.2 s after it
    this.travelHold = this.weaponTravel ? 1 : Math.max(0, this.travelHold - TRAVEL_HOLD_RATE * dt);
    // (anim-natural N3) a draw from the slot reaches first: the hand's weight on the grip rises with the reach
    const travelling = this.weaponTravel;
    // (anim-natural N3) a gun just put away (the hands empty, or the next gun taken in a swap): the trigger hand eases off
    // its grip over RELEASE_TIME (its grip point kept: the next gun's replaces `grip` as it is taken)
    // (anim-natural N3 fix) from the weight the hand had on it (a rewound draw seats the gun with the reach already let
    // go: the release started at 1 and put the hand back on the grip in a frame); a re-draw while letting go starts its
    // reach at the release's weight (`releaseOf`, WeaponModel.beginTravel)
    const held = this.heldWeapon;
    const relP = this.relPrev;
    if (relP !== null && held !== relP && !relP.isDisposed() && relP.isEnabled(false)) {
      this.relNode = relP;
      this.relW = smoothInv(this.relFrom);
      this.relGrip.copyFrom(this.relGripPrev);
    } else if (held !== null && held === this.relNode) this.relW = 0;
    this.relFrom = held !== null && travelling ? this.travelReach : 1;
    const gripW = this.heldWeapon ? (travelling ? this.travelReach : Math.max(t.grip, this.travelHold)) : 0;
    this.relPrev = held;
    if (held !== null) this.relGripPrev.copyFrom(this.grip);
    const rw = this.relW;
    this.relK = this.relNode !== null ? rw * rw * (3 - 2 * rw) : 0;
    this.relW = Math.max(0, rw - dt / RELEASE_TIME);
    if (this.relW === 0 && this.relK === 0) this.relNode = null;
    this.travelPoleK += ((travelling ? 1 : 0) - this.travelPoleK) * (1 - Math.exp(-dt / (travelling ? TRAVEL_POLE_TAU : TRAVEL_POLE_OUT_TAU)));
    const leftGrips = this.handBlend > 0.5;
    // (locomotion step 21, M14) the ready hands hang from the real shoulders (the rig's own pelvis drop, head cap, twist)
    this.readyRf = t.readyFollow;
    this.kneeHandW = t.kneeHand;
    this.aimK = t.aimW;
    this.readySh = t.readyShoulder;
    // (fix 21-2) the holster-out elbow eases with the gear (a draw clears thighGear while the hands still hang)
    this.holsterW += ((this.thighGear ? 1 : 0) - this.holsterW) * Math.min(1, dt * HOLSTER_OUT_RATE);
    // (21w-5) the support hand on the wall only while its wall point is on the hand's own side of the body: the point is
    // set for a body facing out, so a body turned by the lean-out arc (M16, up to 175 deg) reached across the chest
    // for it (audit edge rows selfForearm 5-11 cm as the lean eases back and the lowered weapon hands over to the wall)
    let offWall = t.offWall;
    const wh = this.wallHand;
    if (wh && offWall > 0) {
      const ry = this.root.rotation.y;
      const ox = wh.x - this.root.position.x;
      const oz = wh.z - this.root.position.z;
      const fu = Math.max(0, Math.min(1, (((ox * Math.cos(ry) - oz * Math.sin(ry)) * (leftGrips ? 1 : -1)) - WALL_HAND_SIDE.min) / WALL_HAND_SIDE.span));
      offWall *= fu * fu * (3 - 2 * fu);
    }
    // (tuner-v2 item 2) the local player's gun visual (mesh only) and trigger finger; untuned / remote rigs: no-op
    const hm = this.heldModel;
    if (hm) hm.tuneVisual(HANDS_CUR.on && HANDS_GUN.on && hm.node === this.heldWeapon ? HANDS_GUN : null);
    this.triggerTune = HANDS_CUR.on ? HANDS_CUR.trigger : 0;
    // (anim-skeleton S3) the clip's clavicle and finger channels by the keyed arms' weight (free hands), else the drawn
    // set's edit weight (a gun in hand), as the shoulder channel
    {
      const kaw0 = kw > 0 && gripW <= 0 && !travelling && this.kneeHandW === 0 ? t.keyArmW : 0;
      this.keyedUpper(kq, kaw0 > 0 ? kaw0 : kw * t.keyDrawn);
    }
    this.clavFrame(); // (anim-skeleton S2) the clavicles before the arms reach from the shoulders
    this.solveArm(1, gripW, leftGrips ? t.offGrip : 1, t.handR, leftGrips ? offWall : 0, !leftGrips, leftGrips ? t.offMag : 0);
    this.solveArm(-1, gripW, leftGrips ? 1 : t.offGrip, t.handL, leftGrips ? 0 : offWall, leftGrips, leftGrips ? 0 : t.offMag);
    // (feature/weapons) the fingers close round the grips (the support hand by its foregrip / magazine weight, open on
    // a wall), and round a world grip
    const offHold = Math.min(1, Math.max(t.offGrip, t.offMag)) * (1 - Math.min(1, offWall));
    // (anim-natural N3) reaching for a gun the trigger hand's fingers close as it arrives
    const close = travelling ? gripClose(this.travelReach) : 1;
    const relF = held === null ? this.relK : 0;
    const hr = leftGrips ? gripW * offHold : Math.max(gripW * close, relF);
    const hl = leftGrips ? Math.max(gripW * close, relF) : gripW * offHold;
    this.handGrip.r = this.holdingKnife ? 1 : Math.max(Math.min(1, hr), Math.min(1, this.reachR.w));
    this.handGrip.l = this.holdingMag ? 1 : Math.max(Math.min(1, hl), Math.min(1, this.reachL.w));
    if (HANDS_CUR.on && HANDS_CUR.curlOn) {
      // (tuner-v2 item 2) finger curl: the figure has one closure shape per hand, so the mean of the five curls
      this.handGrip.r = Math.min(1, Math.max(0, this.handGrip.r + HANDS_CUR.curl[0]!));
      this.handGrip.l = Math.min(1, Math.max(0, this.handGrip.l + HANDS_CUR.curl[1]!));
    }
    // (team-climb) an arm on a lifting-off grip (the rope top-out's lip, the body rising past the hands at up to 4 m/s)
    // turns up to LIFT_OFF_RATE x the free arm's limit, so the palm stays on the grip (was: 5.5 cm over it)
    const lfL = this.reachL.liftOff !== undefined && this.reachL.w > 0 ? LIFT_OFF_RATE : 0;
    const lfR = this.reachR.liftOff !== undefined && this.reachR.w > 0 ? LIFT_OFF_RATE : 0;
    this.limitJoint(this.shoulderL, dt, lfL ? JOINT_RATE.get('shL')! * lfL : undefined);
    this.limitJoint(this.shoulderR, dt, lfR ? JOINT_RATE.get('shR')! * lfR : undefined);
    this.limitJoint(this.elbowL, dt, lfL ? JOINT_RATE.get('elL')! * lfL : undefined);
    this.limitJoint(this.elbowR, dt, lfR ? JOINT_RATE.get('elR')! * lfR : undefined);
    // (G8) the keyed walk's arms (free hands only: no grip, no world grip, no knee hand)
    const kaw = kw > 0 && gripW <= 0 && this.kneeHandW === 0 ? t.keyArmW : 0;
    if (kaw > 0) {
      // (mocap-trial) MOCAP_LAYERS.elbowOut: the Body tune's elbow-out on the mocap share (1: elbowOutAdd exactly)
      this.elbowOutK = mocapLayerK(MOCAP_LAYERS.elbowOut, t.keyMocap);
      this.keyedArm(1, kaw * (1 - Math.min(1, this.reachR.w)), kq);
      this.keyedArm(-1, kaw * (1 - Math.min(1, this.reachL.w)), kq);
      // (anim-rework S4) the crouched idle's hands onto the knees the legs actually posed
      if (t.kneeRest > 0) {
        this.kneeRest(1, t.kneeRest * (1 - Math.min(1, this.reachR.w)));
        this.kneeRest(-1, t.kneeRest * (1 - Math.min(1, this.reachL.w)));
      }
    }
    // (marlow-bays T1a, COVERAGE gap 4) a gun in hand (the keyed arms are off): the drawn set's per-key arm edits (the
    // ready stance, the glides) and its forearm twist and shoulder keys over the solved arms
    const kew = kaw > 0 ? 0 : kw * t.keyDrawn;
    if (kew > 0 && (kq.edOn || kq.hasFore || kq.hasSh)) {
      this.keyedArmEdit(1, kew, kq);
      this.keyedArmEdit(-1, kew, kq);
    }
    if (HANDS_CUR.ikOn) this.ikStrengthLimbs(0); // (tuner-v2 item 2) IK targeting strength, before the joint offsets
    if (JOINTS_CUR.on) this.jointOffsets(3); // (tuner-v2) per-joint offsets on the solved arms, before the self-collision
    this.keepElbowOut(1);
    this.keepElbowOut(-1);
    // (G6 fix, check BLOCK 3) on a wall no elbow goes into the face (the crouched reversal's hands to the knee / shin)
    if (this.input.wall && !Number.isNaN(this.pin.wallD)) {
      this.keepElbowOffWall(1);
      this.keepElbowOffWall(-1);
    }
  }

  /**
   * (tuner-v2 item 1, anim-joints J1) A Wren rig's per-joint offsets (`anim/tuneJoints`), only while `JOINTS_CUR.on`: 0 the trunk
   * (pelvis, spine, chest, neck: before the IK), 1 the legs (hips, knees, ankles, toes: on the IK's solution, so an
   * offset there moves the foot off its plant), 2 the head (on the look), 3 the arms (shoulders in the chest frame, upper
   * arms, elbows, wrists: on the IK's solution). A joint with no offset is untouched. No allocation.
   */
  private jointOffsets(part: 0 | 1 | 2 | 3): void {
    if (part === 0) {
      let c = jointApply(this.hips.rotationQuaternion!, J.pelvis);
      c = jointApply(this.spine.rotationQuaternion!, J.spine) || c;
      c = jointApply(this.torso.rotationQuaternion!, J.chest) || c;
      c = jointApply(this.neck.rotationQuaternion!, J.neck) || c;
      if (c) freshBelow(this.neck, this.body);
    } else if (part === 1) {
      const l = jointApply(this.hipL.rotationQuaternion!, J.hipL);
      const r = jointApply(this.hipR.rotationQuaternion!, J.hipR);
      const kl = jointApply(this.kneeL.rotationQuaternion!, J.kneeL);
      const kr = jointApply(this.kneeR.rotationQuaternion!, J.kneeR);
      const al = jointApply(this.ankleL.rotationQuaternion!, J.ankleL);
      const ar = jointApply(this.ankleR.rotationQuaternion!, J.ankleR);
      const tl = jointApply(this.toeL.rotationQuaternion!, J.toeL);
      const tr = jointApply(this.toeR.rotationQuaternion!, J.toeR);
      if (l || kl || al || tl) freshBelow(this.toeL, this.hips);
      if (r || kr || ar || tr) freshBelow(this.toeR, this.hips);
    } else if (part === 2) {
      if (jointApply(this.headNode.rotationQuaternion!, J.head)) fresh(this.headNode);
    } else {
      for (let k = 0; k < 2; k++) {
        const sh = k === 0 ? this.shoulderL : this.shoulderR;
        const el = k === 0 ? this.elbowL : this.elbowR;
        const wr = k === 0 ? this.wristL : this.wristR;
        let c = jointApply(sh.rotationQuaternion!, k === 0 ? J.shoulderL : J.shoulderR, true);
        c = jointApply(sh.rotationQuaternion!, k === 0 ? J.upperArmL : J.upperArmR) || c;
        c = jointApply(el.rotationQuaternion!, k === 0 ? J.elbowL : J.elbowR) || c;
        c = jointApply(wr.rotationQuaternion!, k === 0 ? J.wristL : J.wristR) || c;
        if (c) freshBelow(wr, this.torso);
      }
    }
  }

  /**
   * (anim-natural N4c, AUDIT row 49) The elbow strike's hip and trunk turn (strikeBody.ts) on top of the trunk as posed
   * (keyed or procedural): the pelvis turns by `pel` about the vertical, the spine and chest take the rest of the
   * shoulder line's `chest` between them, the neck takes `neck` back (the head is world-stabilised on the target after
   * this). No allocation.
   */
  private strikeTrunk(sb: StrikeBodyOut): void {
    const rest = sb.chest - sb.pel;
    Quaternion.RotationYawPitchRollToRef(sb.pel, 0, 0, kF);
    kF.multiplyToRef(this.hips.rotationQuaternion!, this.hips.rotationQuaternion!);
    Quaternion.RotationYawPitchRollToRef(rest * 0.45, 0, 0, kF);
    kF.multiplyToRef(this.spine.rotationQuaternion!, this.spine.rotationQuaternion!);
    Quaternion.RotationYawPitchRollToRef(rest * 0.55, 0, 0, kF);
    kF.multiplyToRef(this.torso.rotationQuaternion!, this.torso.rotationQuaternion!);
    Quaternion.RotationYawPitchRollToRef(sb.neck, 0, 0, kF);
    kF.multiplyToRef(this.neck.rotationQuaternion!, this.neck.rotationQuaternion!);
  }

  /**
   * (CT prototype G8) The keyed walk's trunk over the procedural one by `w`: the pelvis takes the keyed rotation with the
   * turn follow on top (the hips follow the planted feet), the spine takes the follow back (the chest keeps the facing),
   * chest and neck their keyed local rotations (the neck with the look's yaw share `lookYaw` on top). No allocation.
   */
  /** (afp-af2) The captures' followed means: pelvis height, pelvis roll / yaw, chest roll / yaw / pitch (stage 2; `runMean1`
   *  stage 1), whether they hold a value, the run carriage's share (gated mocap share), the followed graph rolls (pelvis,
   *  spine), the chest pitch target. */
  private readonly runMean = new Float64Array(6);
  private readonly runMean1 = new Float64Array(6);
  private runInit = false;
  private runShare = 0;
  private runRoll = 0;
  private runSpRoll = 0;
  private runPitch = 0;
  private runLift = 0;
  /** (afp-af2) The swivel keepElbowOut applied last frame per side (left, right; rad). */
  private readonly runElb = new Float64Array(2);
  private readonly runE = new Vector3();
  private readonly runQ = new Quaternion();

  /**
   * (afp-af2, BRIEF A2) Follows the keyed pose's means (MOCAP_RUN_POSE.tau, two stages) and the graph's pelvis / spine roll
   * (bankLag), and sets this frame's run carriage share: the mocap share `keyMocap` eased in past a jog (MOCAP_RUN_POSE
   * from / to on the rig's pace). Returns that share of the keyed pose `kw` (0..1, for the pelvis height). No allocation.
   */
  private mocapRunPose(keyMocap: number, kw: number, kq: KeyedPose, peRoll: number, spRoll: number, dt: number): number {
    const R = MOCAP_RUN_POSE;
    const q = kq.q;
    const M1 = this.runMean1;
    const M = this.runMean;
    const E = this.runE;
    // the pelvis's own roll / yaw, then the chest's (pelvis x spine x chest, body frame)
    const P = KQ.pelvis;
    kP.set(q[P]!, q[P + 1]!, q[P + 2]!, q[P + 3]!);
    kP.toEulerAnglesToRef(E);
    const pr = E.z;
    const py = E.y;
    const S = KQ.spine;
    const C = KQ.chest;
    kS.set(q[S]!, q[S + 1]!, q[S + 2]!, q[S + 3]!);
    kP.multiplyToRef(kS, kT);
    kS.set(q[C]!, q[C + 1]!, q[C + 2]!, q[C + 3]!);
    kT.multiplyToRef(kS, kT);
    kT.toEulerAnglesToRef(E);
    const v0 = kq.pel[1]!;
    if (!this.runInit || !(dt > 0)) {
      if (!this.runInit) {
        M1[0] = M[0] = v0;
        M1[1] = M[1] = pr;
        M1[2] = M[2] = py;
        M1[3] = M[3] = E.z;
        M1[4] = M[4] = E.y;
        M1[5] = M[5] = E.x;
        this.runRoll = peRoll;
        this.runSpRoll = spRoll;
        this.runInit = true;
      }
    } else {
      const k = 1 - Math.exp(-dt / R.tau);
      M1[0]! += (v0 - M1[0]!) * k;
      M1[1]! += (pr - M1[1]!) * k;
      M1[2]! += (py - M1[2]!) * k;
      M1[3]! += (E.z - M1[3]!) * k;
      M1[4]! += (E.y - M1[4]!) * k;
      M1[5]! += (E.x - M1[5]!) * k;
      for (let j = 0; j < 6; j++) M[j]! += (M1[j]! - M[j]!) * k;
      const kb = 1 - Math.exp(-dt / R.bankLag);
      this.runRoll += (peRoll - this.runRoll) * kb;
      this.runSpRoll += (spRoll - this.runSpRoll) * kb;
    }
    this.runDt = dt;
    const xl = Math.max(0, Math.min(1, (this.input.speed - R.liftFrom) / (R.liftTo - R.liftFrom)));
    this.runLift = xl * xl * (3 - 2 * xl);
    const v = this.input.speed;
    const x = Math.max(0, Math.min(1, (v - R.from) / (R.to - R.from)));
    const g = x * x * (3 - 2 * x);
    this.runShare = g * keyMocap;
    const u = Math.max(0, Math.min(1, (v - R.pitchFrom) / (R.pitchTo - R.pitchFrom)));
    this.runPitch = R.pitch + (R.pitchSprint - R.pitch) * u;
    return kw > 1e-6 ? Math.min(1, this.runShare / kw) : 0;
  }

  /**
   * (afp-af2, BRIEF A2) The run carriage over the keyed trunk on the run share (`mocapRunPose`): the capture's mean pelvis
   * roll / yaw off the hips (MOCAP_LAYERS.trunkMean), its mean chest roll / yaw off and its chest pitch onto the CT
   * carriage's (the spine carries it, so the chest takes it all), and the graph's followed turn bank on both
   * (MOCAP_LAYERS.bankWipe: the pelvis its roll, the chest 0.6 of it plus the spine's, as the procedural chain). No allocation.
   */
  private mocapRunTrunk(): void {
    const a = this.runShare;
    if (a <= 0) return;
    const m = 1 - mocapLayerK(MOCAP_LAYERS.trunkMean, a);
    const b = 1 - mocapLayerK(MOCAP_LAYERS.bankWipe, a);
    if (m === 0 && b === 0) return;
    const M = this.runMean;
    const H = this.hips.rotationQuaternion!;
    const Sp = this.spine.rotationQuaternion!;
    this.runQ.copyFrom(H);
    Quaternion.RotationYawPitchRollToRef(-m * M[2]!, 0, -m * M[1]! + b * this.runRoll, kF);
    kF.multiplyToRef(this.runQ, H);
    Quaternion.RotationYawPitchRollToRef(-m * M[4]!, m * (this.runPitch - M[5]!), -m * M[3]! + b * (0.6 * this.runRoll + this.runSpRoll), kF);
    kF.multiplyToRef(this.runQ, kS);
    kS.multiplyToRef(Sp, kS);
    Quaternion.InverseToRef(H, kP);
    kP.multiplyToRef(kS, Sp);
  }

  private keyedTrunk(kq: KeyedPose, w: number, lookYaw: number): void {
    const q = kq.q;
    const P = KQ.pelvis;
    kP.set(q[P]!, q[P + 1]!, q[P + 2]!, q[P + 3]!);
    Quaternion.RotationYawPitchRollToRef(this.follow, 0, 0, kF);
    kF.multiplyToRef(kP, kT);
    Quaternion.SlerpToRef(this.hips.rotationQuaternion!, kT, w, this.hips.rotationQuaternion!);
    const S = KQ.spine;
    kS.set(q[S]!, q[S + 1]!, q[S + 2]!, q[S + 3]!);
    Quaternion.RotationYawPitchRollToRef(-this.follow, 0, 0, kF);
    Quaternion.InverseToRef(kP, kT);
    kT.multiplyToRef(kF, kT);
    kT.multiplyToRef(kP, kT);
    kT.multiplyToRef(kS, kT);
    Quaternion.SlerpToRef(this.spine.rotationQuaternion!, kT, w, this.spine.rotationQuaternion!);
    const C = KQ.chest;
    kT.set(q[C]!, q[C + 1]!, q[C + 2]!, q[C + 3]!);
    Quaternion.SlerpToRef(this.torso.rotationQuaternion!, kT, w, this.torso.rotationQuaternion!);
    const N = KQ.neck;
    kT.set(q[N]!, q[N + 1]!, q[N + 2]!, q[N + 3]!);
    // (anim-rework S2) the look-at keeps its neck share on top of the keyed neck (the idle's scan, the walk's carriage)
    Quaternion.RotationYawPitchRollToRef(lookYaw, 0, 0, kF);
    kF.multiplyToRef(kT, kT);
    Quaternion.SlerpToRef(this.neck.rotationQuaternion!, kT, w, this.neck.rotationQuaternion!);
    // (afp-af2) the run carriage and the turn bank over the capture's trunk
    this.mocapRunTrunk();
  }

  /**
   * (anim-natural-n2) The body motion layer's trunk (`bodyMotion.ts`): the pelvis turns `hip` rad about the vertical
   * (root frame) and the spine takes back `hip - chest`, so the shoulders turn `chest` rad (0: the chest stays where the
   * keyed / procedural trunk put it, the aim's gun platform). No allocation.
   */
  private motionTrunk(hip: number, chest: number): void {
    const h = this.hips.rotationQuaternion!;
    const s = this.spine.rotationQuaternion!;
    kP.copyFrom(h);
    Quaternion.RotationYawPitchRollToRef(hip, 0, 0, kF);
    kF.multiplyToRef(kP, h);
    Quaternion.RotationYawPitchRollToRef(chest - hip, 0, 0, kF);
    Quaternion.InverseToRef(kP, kT);
    kT.multiplyToRef(kF, kT);
    kT.multiplyToRef(kP, kT);
    kT.multiplyToRef(s, s);
  }

  /**
   * (anim-natural-n2 step 3, A8) The keyed arms as posed last frame (chest frame, from the shoulder joint, m): elbow L,
   * wrist L, elbow R, wrist R; this call's elbow and wrist targets (`armCapO`); the frame (`armTick`) each side last
   * ran (L, R; -2 never); the frame count and this frame's cap (m per frame), set in `applyTargets` from the layer.
   */
  private readonly armCapP = new Float64Array(12);
  private readonly armCapO = new Float64Array(6);
  private readonly armCapTick = new Float64Array([-2, -2]);
  private armTick = 0;
  private armStep = Infinity;

  /**
   * (anim-natural-n2 step 3, A8) One keyed arm's elbow and wrist targets (chest frame, m, from the shoulder joint) into
   * `armCapO`, capped in speed: where the arm will pose them (the upper arm along the elbow target, the forearm from there
   * toward the wrist target) may move at most `armStep` from where it posed them last frame (`cont`: this side ran last
   * frame), both by the same share so the arm keeps its shape. Under the cap the targets are the keyed points exactly
   * (bit for bit). The caller writes the targets into `armCapO` first: six computed doubles passed as arguments to this
   * non-inlined call boxed (~208 B a frame a rig, CHECK-4 should-fix 1). No allocation.
   */
  private armCap(si: number, cont: boolean): void {
    const O = this.armCapO;
    const ex = O[0]!;
    const ey = O[1]!;
    const ez = O[2]!;
    const wx = O[3]!;
    const wy = O[4]!;
    const wz = O[5]!;
    const lu = this.p.upperArm.len;
    const lf = this.p.forearm.len;
    const le = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1;
    let px = (ex * lu) / le;
    let py = (ey * lu) / le;
    let pz = (ez * lu) / le;
    const fx = wx - px;
    const fy = wy - py;
    const fz = wz - pz;
    const lw = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
    let qx = px + (fx * lf) / lw;
    let qy = py + (fy * lf) / lw;
    let qz = pz + (fz * lf) / lw;
    const P = this.armCapP;
    const o = si * 6;
    const step = this.armStep;
    if (cont && step < Infinity) {
      const de = (px - P[o]!) ** 2 + (py - P[o + 1]!) ** 2 + (pz - P[o + 2]!) ** 2;
      const dw = (qx - P[o + 3]!) ** 2 + (qy - P[o + 4]!) ** 2 + (qz - P[o + 5]!) ** 2;
      const d2 = de > dw ? de : dw;
      if (d2 > step * step) {
        const k = step / Math.sqrt(d2);
        px = P[o]! + (px - P[o]!) * k;
        py = P[o + 1]! + (py - P[o + 1]!) * k;
        pz = P[o + 2]! + (pz - P[o + 2]!) * k;
        qx = P[o + 3]! + (qx - P[o + 3]!) * k;
        qy = P[o + 4]! + (qy - P[o + 4]!) * k;
        qz = P[o + 5]! + (qz - P[o + 5]!) * k;
        O[0] = px;
        O[1] = py;
        O[2] = pz;
        O[3] = qx;
        O[4] = qy;
        O[5] = qz;
      }
    }
    P[o] = px;
    P[o + 1] = py;
    P[o + 2] = pz;
    P[o + 3] = qx;
    P[o + 4] = qy;
    P[o + 5] = qz;
  }

  /** (mocap-trial) This frame's share of the Body tune's elbow-out on the keyed arms (MOCAP_LAYERS.elbowOut; 1: as is). */
  private elbowOutK = 1;
  /** (afp-af2) The arm follower's state per side: elbow and wrist points (chest frame), their rates and the last raw points, 18 a side. */
  private readonly runArm = new Float64Array(36);
  private runDt = 0;

  /**
   * (afp-af2, BRIEF A2 "hands randomly moving around when running") The keyed arm points (`armCapO`: elbow, wrist in the
   * chest frame) through a critically damped follower (MOCAP_RUN_POSE.armTau) on the run share (MOCAP_LAYERS.armSmooth):
   * the capture's sharp swing ends and the sprint's jerky arms (wrists 3.5 cm / frame^2) are rounded off. The follower
   * always tracks (`cont` false: it starts on the points at rest). No allocation.
   */
  private mocapRunArm(si: number, cont: boolean): void {
    const O = this.armCapO;
    const A = this.runArm;
    const o = si * 18;
    const dt = this.runDt;
    if (!cont || !(dt > 0)) {
      for (let c = 0; c < 6; c++) {
        A[o + c] = O[c]!;
        A[o + 6 + c] = 0;
        A[o + 12 + c] = O[c]!;
      }
      return;
    }
    const R = MOCAP_RUN_POSE;
    const w = 1 / R.armTau;
    const s = 1 - mocapLayerK(MOCAP_LAYERS.armSmooth, this.runShare);
    for (let c = 0; c < 6; c++) {
      const r = O[c]!;
      // the point's own rate fed forward (armLead): the follower keeps the swing's timing, only its sharp turns round off
      const rv = ((r - A[o + 12 + c]!) / dt) * R.armLead;
      A[o + 12 + c] = r;
      const x = A[o + c]!;
      let v = A[o + 6 + c]!;
      v += (w * w * (r - x) + 2 * w * (rv - v)) * dt;
      const nx = x + v * dt;
      A[o + c] = nx;
      A[o + 6 + c] = v;
      if (s > 0) O[c] = r + (nx - r) * s;
    }
  }
  /**
   * (CT prototype G8) One keyed arm over the solved one by `w`: the upper arm turned onto the keyed elbow point and the
   * forearm onto the keyed wrist point (both from the shoulder joint in the chest frame), with the rig's own bone frames
   * (+Z toward the body's front), so the free hand keeps its orientation. No allocation.
   */
  private keyedArm(side: 1 | -1, w: number, kq: KeyedPose): void {
    if (w <= 0) return;
    const sh = side > 0 ? this.shoulderR : this.shoulderL;
    const el = side > 0 ? this.elbowR : this.elbowL;
    const wr = side > 0 ? this.wristR : this.wristL;
    const a = kq.arm;
    const kk = this.p.height / 1.75;
    const eo = side > 0 ? KA.elbowR : KA.elbowL;
    const wo = side > 0 ? KA.wristR : KA.wristL;
    // (anim-natural-n2 step 3, A8) the speed cap's slots (elbow, wrist) and whether this side ran last frame
    const si = side > 0 ? 1 : 0;
    const cont = this.armCapTick[si] === this.armTick - 1;
    this.armCapTick[si] = this.armTick;
    fresh(sh);
    const S = sh.getAbsolutePosition();
    const Rc = this.torso.absoluteRotationQuaternion;
    this.dirToWorld(0, 0, 1, kH);
    const O = this.armCapO;
    // (mocap-trial) MOCAP_LAYERS.elbowOut on the mocap share (elbowOutK 1: elbowOutAdd exactly)
    O[0] = a[eo]! * kk + side * TUNE_CUR.elbowOutAdd * this.elbowOutK;
    O[1] = a[eo + 1]! * kk;
    O[2] = a[eo + 2]! * kk;
    O[3] = a[wo]! * kk;
    O[4] = a[wo + 1]! * kk;
    O[5] = a[wo + 2]! * kk;
    this.mocapRunArm(si, cont);
    this.armCap(si, cont);
    // upper arm onto the keyed elbow
    kV.set(O[0]!, O[1]!, O[2]!);
    kV.rotateByQuaternionToRef(Rc, kV);
    kSave.copyFrom(sh.rotationQuaternion!);
    boneRotation(kV, kH, tmpQ3);
    this.setWorldRot(sh, sh.parent as TransformNode, tmpQ3);
    Quaternion.SlerpToRef(kSave, sh.rotationQuaternion!, w, sh.rotationQuaternion!);
    fresh(sh);
    fresh(el);
    // forearm from where the elbow is now onto the keyed wrist
    kV.set(O[3]!, O[4]!, O[5]!);
    kV.rotateByQuaternionToRef(Rc, kV);
    kV.addInPlace(S).subtractInPlace(el.getAbsolutePosition());
    kSave.copyFrom(el.rotationQuaternion!);
    boneRotation(kV, kH, tmpQ3);
    this.setWorldRot(el, sh, tmpQ3);
    Quaternion.SlerpToRef(kSave, el.rotationQuaternion!, w, el.rotationQuaternion!);
    fresh(el);
    // (marlow-bays T1a, item 17) the keyed shoulder (the whole arm about the shoulder joint, chest frame) and forearm twist
    this.keyedShFore(side, w, kq);
    // (anim-rig) a clip's keyed wrist frame (local to the forearm) turns the free hand; a clip without one (the walk)
    // leaves the solve's wrist (identity: the hand continues the forearm)
    if (kq.hasWrist) {
      const o = side > 0 ? KW.wristR : KW.wristL;
      kT.set(kq.wrist[o]!, kq.wrist[o + 1]!, kq.wrist[o + 2]!, kq.wrist[o + 3]!);
      Quaternion.SlerpToRef(wr.rotationQuaternion!, kT, w, wr.rotationQuaternion!);
    }
    fresh(wr);
  }

  /**
   * (anim-skeleton S3) The clip's clavicle channel into `clavKey` (each side by `w`, as `keyPow`; a side left at the
   * identity is off) and its finger channel into `fingerClip` (x `w`). Without the channel (or `w` 0) the clavicle path
   * is off and `fingerClip` is cleared once, then left to whoever else writes it (a test, a tool). No allocation.
   */
  private keyedUpper(kq: KeyedPose, w: number): void {
    const clav = w > 0 && kq.hasClav === 1;
    for (let k = 0; k < 2; k++) {
      this.clavKeyOn[k] = 0;
      if (!clav) continue;
      keyPow(kq.clav, k * 4, w, kT);
      if (kT.x === 0 && kT.y === 0 && kT.z === 0) continue;
      const b = k * 4;
      this.clavKey[b] = kT.x;
      this.clavKey[b + 1] = kT.y;
      this.clavKey[b + 2] = kT.z;
      this.clavKey[b + 3] = kT.w;
      this.clavKeyOn[k] = 1;
    }
    const c = this.fingerClip;
    if (w > 0 && kq.hasFing === 1) {
      for (let i = 0; i < FING_LEN; i++) c[i] = kq.fing[i]! * w;
      this.fingClipOn = 1;
    } else if (this.fingClipOn === 1) {
      c.fill(0);
      this.fingClipOn = 0;
    }
  }

  /**
   * (anim-skeleton S3, A7) The clip's FK legs over the solved IK legs, per side by its keyed weight (0..1) x `kw`: the
   * hip (local to the pelvis), the knee flex (about its local X), the ankle (local to the knee) and the toe slerped from
   * the IK solution toward the clip's. Runs after the legs' solves and the IK strength, before the Joints offsets and
   * the rate limits; at weight 0 the planner's leg is untouched (a planted foot stays planted). No allocation.
   */
  private keyedLegs(kq: KeyedPose, kw: number): void {
    const g = kq.leg;
    for (let k = 0; k < 2; k++) {
      const b = k * KEYED_LEG_SIDE;
      const lw = g[b + KL.w]!;
      const w = (lw < 0 ? 0 : lw > 1 ? 1 : lw) * kw;
      if (!(w > 0)) continue;
      const hip = k === 0 ? this.hipL : this.hipR;
      const knee = k === 0 ? this.kneeL : this.kneeR;
      const ankle = k === 0 ? this.ankleL : this.ankleR;
      const toe = k === 0 ? this.toeL : this.toeR;
      const h = b + KL.hip;
      kT.set(g[h]!, g[h + 1]!, g[h + 2]!, g[h + 3]!);
      Quaternion.SlerpToRef(hip.rotationQuaternion!, kT, w, hip.rotationQuaternion!);
      Quaternion.RotationYawPitchRollToRef(0, g[b + KL.knee]!, 0, kT);
      Quaternion.SlerpToRef(knee.rotationQuaternion!, kT, w, knee.rotationQuaternion!);
      const a = b + KL.ankle;
      kT.set(g[a]!, g[a + 1]!, g[a + 2]!, g[a + 3]!);
      Quaternion.SlerpToRef(ankle.rotationQuaternion!, kT, w, ankle.rotationQuaternion!);
      Quaternion.RotationYawPitchRollToRef(0, g[b + KL.toe]!, 0, kT);
      Quaternion.SlerpToRef(toe.rotationQuaternion!, kT, w, toe.rotationQuaternion!);
      freshBelow(toe, this.hips);
    }
  }

  /** (anim-skeleton S4) Each ankle's world position into `plantAt` (the plant footSlide measures from). No allocation. */
  private plantMark(): void {
    for (let k = 0; k < 2; k++) {
      const an = k === 0 ? this.ankleL : this.ankleR;
      freshBelow(an, this.hips);
      const a = an.getAbsolutePosition();
      this.plantAt[k * 3] = a.x;
      this.plantAt[k * 3 + 1] = a.y;
      this.plantAt[k * 3 + 2] = a.z;
    }
  }

  /**
   * (anim-skeleton S4) `footSlide` per side: in contact, the most the ankle moved off `plantAt` this contact (cm; this
   * frame's offset counts only when `active`, the keyed leg stages ran); not in contact, 0. No allocation.
   */
  private footSlideStep(active: boolean): void {
    for (let k = 0; k < 2; k++) {
      const f = k === 0 ? this.planner.L : this.planner.R;
      let s = k === 0 ? this.footSlide.l : this.footSlide.r;
      if (!f.contact) s = 0;
      else {
        let e = 0;
        if (active) {
          const an = k === 0 ? this.ankleL : this.ankleR;
          freshBelow(an, this.hips);
          const a = an.getAbsolutePosition();
          const dx = a.x - this.plantAt[k * 3]!;
          const dy = a.y - this.plantAt[k * 3 + 1]!;
          const dz = a.z - this.plantAt[k * 3 + 2]!;
          e = Math.sqrt(dx * dx + dy * dy + dz * dz) * 100;
        }
        s = this.slideContact[k] === 1 && s > e ? s : e;
      }
      this.slideContact[k] = f.contact ? 1 : 0;
      if (k === 0) this.footSlide.l = s;
      else this.footSlide.r = s;
    }
  }

  /**
   * (anim-skeleton S4) The clip's leg deltas (`legd`, rad, rig frame, x `kw`) over the solved legs, right after the FK
   * blend: raw, each joint's local rotation turned by its delta (hip yaw / pitch / roll, the knee and ankle and toe
   * about their hinges). A planted leg (the planner's contact weight, `legdContactW`) is re-solved onto its plant: the
   * knee moves to the plant's circle on the raw knee's side (`plantKnee`), the hip and the shin turned by the shortest
   * arcs onto it and back onto the plant, the foot keeps its planted world rotation turned by the ankle delta, the toe
   * takes its delta; raw and planted are slerped per joint by that weight. Zero deltas leave a side untouched.
   * No allocation.
   */
  private keyedLegDeltas(kq: KeyedPose, kw: number): void {
    const d = kq.legd;
    for (let k = 0; k < 2; k++) {
      const b = k * KEYED_LEGD_SIDE;
      let any = false;
      for (let c = 0; c < KEYED_LEGD_SIDE; c++) if (d[b + c] !== 0) any = true;
      if (!any) continue;
      const hip = k === 0 ? this.hipL : this.hipR;
      const knee = k === 0 ? this.kneeL : this.kneeR;
      const ankle = k === 0 ? this.ankleL : this.ankleR;
      const toe = k === 0 ? this.toeL : this.toeR;
      const f = k === 0 ? this.planner.L : this.planner.R;
      const wc = LEGD_OPT.resolve ? legdContactW(f.contact, f.swing) : 0;
      freshBelow(ankle, this.hips);
      // the plant: the solved leg as it stands
      ldH.copyFrom(hip.getAbsolutePosition());
      ldK0.copyFrom(knee.getAbsolutePosition());
      ldA0.copyFrom(ankle.getAbsolutePosition());
      ldF0.copyFrom(ankle.absoluteRotationQuaternion);
      // raw: each joint turned in its own frame
      Quaternion.RotationYawPitchRollToRef(d[b + KD.hipYaw]! * kw, d[b + KD.hipPitch]! * kw, d[b + KD.hipRoll]! * kw, kT);
      hip.rotationQuaternion!.multiplyInPlace(kT);
      Quaternion.RotationYawPitchRollToRef(0, d[b + KD.knee]! * kw, 0, kT);
      knee.rotationQuaternion!.multiplyInPlace(kT);
      Quaternion.RotationYawPitchRollToRef(0, d[b + KD.anklePitch]! * kw, d[b + KD.ankleRoll]! * kw, ldD);
      ankle.rotationQuaternion!.multiplyInPlace(ldD);
      Quaternion.RotationYawPitchRollToRef(0, d[b + KD.toe]! * kw, 0, kT);
      toe.rotationQuaternion!.multiplyInPlace(kT);
      if (!(wc > 0)) {
        freshBelow(toe, this.hips);
        continue;
      }
      freshBelow(ankle, this.hips);
      ldQh.copyFrom(hip.rotationQuaternion!);
      ldQk.copyFrom(knee.rotationQuaternion!);
      ldQa.copyFrom(ankle.rotationQuaternion!);
      // planted: the raw leg swung about the hip onto the plant line gives the knee's side (a hip yaw or roll swivels
      // the knee about the hip-ankle line); the knee onto the plant's circle there (`plantKnee`)
      ldKr.copyFrom(knee.getAbsolutePosition()).subtractInPlace(ldH);
      ankle.getAbsolutePosition().subtractToRef(ldH, ldX).normalize();
      ldA0.subtractToRef(ldH, ldV).normalize();
      Quaternion.FromUnitVectorsToRef(ldX, ldV, kF);
      ldKr.rotateByQuaternionToRef(kF, ldX).addInPlace(ldH);
      plantKnee(ldH, ldA0, ldK0, ldX, ldKp);
      // the thigh: the shortest arc from the raw knee onto the planted one, then twisted about itself so its hinge (local
      // x) is normal to the hip-knee-ankle plane (the knee stays a hinge; on the side the hinge already faced)
      ldKr.normalize();
      ldKp.subtractToRef(ldH, ldV).normalize();
      Quaternion.FromUnitVectorsToRef(ldKr, ldV, kF);
      kF.multiplyToRef(hip.absoluteRotationQuaternion, tmpQ3);
      ldA0.subtractToRef(ldKp, ldX);
      Vector3.CrossToRef(ldV, ldX, ldN);
      if (ldN.lengthSquared() > 1e-10) {
        ldN.normalize();
        ldX.set(1, 0, 0).rotateByQuaternionToRef(tmpQ3, ldX);
        if (Vector3.Dot(ldN, ldX) < 0) ldN.scaleInPlace(-1);
        ldX.subtractInPlace(ldV.scaleToRef(Vector3.Dot(ldX, ldV), ldKr));
        if (ldX.lengthSquared() > 1e-10) {
          Quaternion.FromUnitVectorsToRef(ldX.normalize(), ldN, kF);
          kF.multiplyToRef(tmpQ3, tmpQ3);
        }
      }
      this.setWorldRot(hip, hip.parent as TransformNode, tmpQ3);
      freshBelow(ankle, this.hips);
      const K = knee.getAbsolutePosition();
      ankle.getAbsolutePosition().subtractToRef(K, ldKr).normalize();
      ldA0.subtractToRef(K, ldV).normalize();
      Quaternion.FromUnitVectorsToRef(ldKr, ldV, kF);
      kF.multiplyToRef(knee.absoluteRotationQuaternion, tmpQ3);
      this.setWorldRot(knee, hip, tmpQ3);
      // the foot: its planted world rotation turned by the ankle delta (the ankle stays on the plant)
      ldF0.multiplyToRef(ldD, tmpQ3);
      this.setWorldRot(ankle, knee, tmpQ3);
      if (wc < 1) {
        Quaternion.SlerpToRef(ldQh, hip.rotationQuaternion!, wc, hip.rotationQuaternion!);
        Quaternion.SlerpToRef(ldQk, knee.rotationQuaternion!, wc, knee.rotationQuaternion!);
        Quaternion.SlerpToRef(ldQa, ankle.rotationQuaternion!, wc, ankle.rotationQuaternion!);
      }
      freshBelow(toe, this.hips);
    }
  }

  /** (T1a, item 17) The keyed shoulder (chest frame, the arm with it) and the forearm twist (about the bone) by `w`. */
  private keyedShFore(side: 1 | -1, w: number, kq: KeyedPose): void {
    const o = side > 0 ? KW.wristR : KW.wristL;
    const sh = side > 0 ? this.shoulderR : this.shoulderL;
    const el = side > 0 ? this.elbowR : this.elbowL;
    if (kq.hasSh) {
      keyPow(kq.sh, o, w, kT);
      // the shoulder node's parent is the chest: a chest-frame turn is a pre-multiply of its local rotation
      kT.multiplyToRef(sh.rotationQuaternion!, sh.rotationQuaternion!);
      fresh(sh);
      fresh(el);
    }
    if (kq.hasFore) {
      keyPow(kq.fore, o, w, kT);
      el.rotationQuaternion!.multiplyInPlace(kT);
      fresh(el);
    }
  }

  /**
   * (marlow-bays T1a, COVERAGE gap 4) The drawn set's per-key edits on one solved arm by `w` (a gun in hand): the upper
   * arm turned about the shoulder and the forearm about the elbow by the edit offsets (chest frame, as the sampler turns
   * the keyed points), the upper arm twist about the shoulder-elbow line, then the keyed shoulder and forearm twist. The
   * hand leaves the grip by as much (as a Joints offset does). No allocation.
   */
  private keyedArmEdit(side: 1 | -1, w: number, kq: KeyedPose): void {
    const sh = side > 0 ? this.shoulderR : this.shoulderL;
    const el = side > 0 ? this.elbowR : this.elbowL;
    const wr = side > 0 ? this.wristR : this.wristL;
    if (kq.edOn) {
      const e = kq.ed;
      const up = KE.arm + (side > 0 ? 8 : 0);
      fresh(sh);
      fresh(el);
      const Rc = this.torso.absoluteRotationQuaternion;
      kSave.copyFrom(el.absoluteRotationQuaternion);
      // the upper arm: a chest-frame turn of the shoulder node
      keyPow(e, up, w, kT);
      kT.multiplyToRef(sh.rotationQuaternion!, sh.rotationQuaternion!);
      fresh(sh);
      // the forearm: its world rotation turned by Rc * O * Rc^-1 from where it was
      keyPow(e, up + 4, w, kT);
      Quaternion.InverseToRef(Rc, kF);
      Rc.multiplyToRef(kT, kP);
      kP.multiplyToRef(kF, kP);
      kP.multiplyToRef(kSave, tmpQ3);
      this.setWorldRot(el, sh, tmpQ3);
      fresh(el);
      // the upper arm twist: the arm turned about the shoulder-elbow line (the elbow stays, the forearm swings)
      const th = e[KE.twist + (side > 0 ? 1 : 0)]! * w;
      if (th !== 0) {
        kV.copyFrom(el.getAbsolutePosition()).subtractInPlace(sh.getAbsolutePosition());
        if (kV.lengthSquared() > 1e-10) {
          kV.normalize();
          Quaternion.RotationAxisToRef(kV, th, kF);
          kF.multiplyToRef(sh.absoluteRotationQuaternion, tmpQ3);
          this.setWorldRot(sh, this.torso, tmpQ3);
          fresh(sh);
          fresh(el);
        }
      }
    }
    this.keyedShFore(side, w, kq);
    fresh(wr);
  }

  /** (marlow-bays T1a) The per-key trunk edits by `w` over the procedural trunk: each segment turned in its own frame,
   *  its child counter-turned (as the sampler applies them to the keyed trunk). No allocation. */
  private keyedTrunkEdit(kq: KeyedPose, w: number): void {
    const e = kq.ed;
    for (let s = 0; s < 4; s++) {
      const t = KE.trunk + s * 4;
      if (e[t] === 0 && e[t + 1] === 0 && e[t + 2] === 0) continue;
      const node = s === 0 ? this.hips : s === 1 ? this.spine : s === 2 ? this.torso : this.neck;
      keyPow(e, t, w, kT);
      node.rotationQuaternion!.multiplyInPlace(kT);
      if (s < 3) {
        const child = s === 0 ? this.spine : s === 1 ? this.torso : this.neck;
        Quaternion.InverseToRef(kT, kF);
        kF.multiplyToRef(child.rotationQuaternion!, child.rotationQuaternion!);
      }
    }
  }

  /**
   * (anim-rework S4, BRIEF 3 "The crouched idle": "a hand resting on top of the knee (palm down, fingers forward)") The
   * keyed squat's hand onto the top of its own posed knee by `w`: the palm centre's miss from the knee top (KNEE_REST)
   * moves the wrist target by as much and the keyed arm is re-aimed at it (two-bone, the elbow kept on its keyed side of
   * the shoulder-wrist line); the keyed wrist frame stays (palm down, fingers forward). No allocation.
   */
  private kneeRest(side: 1 | -1, w: number): void {
    if (w <= 0) return;
    const sh = side > 0 ? this.shoulderR : this.shoulderL;
    const el = side > 0 ? this.elbowR : this.elbowL;
    const wr = side > 0 ? this.wristR : this.wristL;
    const knee = side > 0 ? this.kneeR : this.kneeL;
    fresh(sh);
    fresh(el);
    fresh(wr);
    fresh(knee);
    khS.copyFrom(sh.getAbsolutePosition());
    khE.copyFrom(el.getAbsolutePosition());
    khW.copyFrom(wr.getAbsolutePosition());
    const hand = this.handRest ? (side > 0 ? this.handRest.R : this.handRest.L) : null;
    if (hand) {
      khV.set(hand.palm[0], hand.palm[1], hand.palm[2]);
      Vector3.TransformCoordinatesToRef(khV, wr.getWorldMatrix(), khP);
    } else khP.copyFrom(khW);
    const kp = knee.getAbsolutePosition();
    const fwd = this.dirToWorld(0, 0, 1, khF);
    khT.set(kp.x + fwd.x * KNEE_REST.fwd - khP.x, kp.y + KNEE_REST.up - khP.y, kp.z + fwd.z * KNEE_REST.fwd - khP.z);
    khT.scaleInPlace(w).addInPlace(khW);
    const a = Vector3.Distance(khS, khE);
    const b = Vector3.Distance(khE, khW);
    khV.copyFrom(khE).subtractInPlace(khS);
    solveTwoBone(khS, khT, a, b, khV, khE2, khW2);
    // the bones onto the solved points with the keyed arm's frames (+Z toward the body's front)
    khE2.subtractInPlace(khS);
    boneRotation(khE2, fwd, tmpQ3);
    this.setWorldRot(sh, sh.parent as TransformNode, tmpQ3);
    fresh(sh);
    fresh(el);
    khW2.subtractInPlace(el.getAbsolutePosition());
    boneRotation(khW2, fwd, tmpQ3);
    this.setWorldRot(el, sh, tmpQ3);
    fresh(el);
    fresh(wr);
  }

  /**
   * (operators step 11e) Self-collision for an elbow after the IK and the joint-rate limit: an elbow inside the trunk
   * (closer than its half depth plus `ELBOW_TRUNK_MARGIN` to the pelvis -> neck line) swivels round the shoulder ->
   * wrist axis until it is out (`elbowSwivelClear`); the shoulder and wrist stay put and the hand keeps its world
   * rotation, so the grip holds. Allocates nothing; does nothing on a clear frame beyond one distance test.
   */
  /**
   * (G6 fix) An elbow within `WALL_ELBOW_CLEAR` of the wall face swivels round the shoulder -> wrist axis by the smallest
   * angle (steps of 0.1 rad, at most 1.2) that clears it, as `keepElbowOut` (the shoulder and wrist stay, the hand keeps
   * its world rotation). No allocation.
   */
  private keepElbowOffWall(side: 1 | -1): void {
    const sh = side > 0 ? this.shoulderR : this.shoulderL;
    const el = side > 0 ? this.elbowR : this.elbowL;
    const wr = side > 0 ? this.wristR : this.wristL;
    fresh(sh);
    fresh(el);
    fresh(wr);
    const nx = this.pin.wallNx;
    const nz = this.pin.wallNz;
    const face = this.pin.wallD - WALL_FOOT_CLEAR;
    const E = el.getAbsolutePosition();
    const d0 = E.x * nx + E.z * nz - face;
    if (d0 >= WALL_ELBOW_CLEAR) return;
    const S = sh.getAbsolutePosition();
    wr.getAbsolutePosition().subtractToRef(S, elbAxis);
    elbAxis.normalize();
    const ux = elbAxis.x;
    const uy = elbAxis.y;
    const uz = elbAxis.z;
    const vx = E.x - S.x;
    const vy = E.y - S.y;
    const vz = E.z - S.z;
    const uv = ux * vx + uy * vy + uz * vz;
    // the elbow's distance to the face after a turn th (Rodrigues; only x and z count)
    const cx = uy * vz - uz * vy;
    const cz = ux * vy - uy * vx;
    let best = 0;
    let bestD = d0;
    for (let k = 1; k <= 12 && bestD < WALL_ELBOW_CLEAR; k++) {
      for (let sgn = -1; sgn <= 1; sgn += 2) {
        const th = sgn * k * 0.1;
        const c = Math.cos(th);
        const s = Math.sin(th);
        const ex = S.x + vx * c + cx * s + ux * uv * (1 - c);
        const ez = S.z + vz * c + cz * s + uz * uv * (1 - c);
        const d = ex * nx + ez * nz - face;
        if (d > bestD) {
          bestD = d;
          best = th;
        }
      }
    }
    if (best === 0) return;
    elbHand.copyFrom(wr.absoluteRotationQuaternion);
    // (the engine's axis-angle handedness against the right-handed sum above: checked on the result, turned back the
    // other way if it went the wrong one)
    for (let pass = 0; pass < 2; pass++) {
      Quaternion.RotationAxisToRef(elbAxis, pass === 0 ? best : -2 * best, elbQ);
      elbQ.multiplyToRef(sh.absoluteRotationQuaternion, tmpQ3);
      this.setWorldRot(sh, sh.parent as TransformNode, tmpQ3);
      (sh as LimitedNode)._lim?.prev?.copyFrom(sh.rotationQuaternion!);
      fresh(sh);
      fresh(el);
      const e = el.getAbsolutePosition();
      if (e.x * nx + e.z * nz - face >= d0) break;
    }
    this.setWorldRot(wr, el, elbHand);
    fresh(wr);
  }

  private keepElbowOut(side: 1 | -1): void {
    const sh = side > 0 ? this.shoulderR : this.shoulderL;
    const el = side > 0 ? this.elbowR : this.elbowL;
    const wr = side > 0 ? this.wristR : this.wristL;
    fresh(sh);
    fresh(el);
    fresh(wr);
    const r = this.p.chest.d * 0.5 + ELBOW_TRUNK_MARGIN;
    const S = sh.getAbsolutePosition();
    const th0 = elbowSwivelClear(S, wr.getAbsolutePosition(), el.getAbsolutePosition(), this.hips.getAbsolutePosition(), this.neck.getAbsolutePosition(), r);
    // (afp-af2) on the run share the swivel (15 deg steps) changes at most MOCAP_RUN_POSE.elbowRate rad/s, in and out: the
    // capture's tucked elbows grazing the trunk flicked the arm 15 deg in a frame and back
    const si = side > 0 ? 1 : 0;
    let th = th0;
    const es = this.runShare > 0 ? 1 - mocapLayerK(MOCAP_LAYERS.armSmooth, this.runShare) : 0;
    if (es > 0 && this.runDt > 0) {
      const p = this.runElb[si]!;
      const m = MOCAP_RUN_POSE.elbowRate * this.runDt;
      const lim = th0 > p + m ? p + m : th0 < p - m ? p - m : th0;
      th = th0 + (lim - th0) * es;
    }
    this.runElb[si] = th;
    if (th === 0) return;
    elbHand.copyFrom(wr.absoluteRotationQuaternion);
    wr.getAbsolutePosition().subtractToRef(S, elbAxis);
    elbAxis.normalize();
    Quaternion.RotationAxisToRef(elbAxis, th, elbQ);
    elbQ.multiplyToRef(sh.absoluteRotationQuaternion, tmpQ3);
    this.setWorldRot(sh, sh.parent as TransformNode, tmpQ3);
    (sh as LimitedNode)._lim?.prev?.copyFrom(sh.rotationQuaternion!);
    fresh(sh);
    fresh(el);
    this.setWorldRot(wr, el, elbHand);
    fresh(wr);
  }

  /**
   * Realism limit + blend continuity: a joint's local rotation may not change faster than its max
   * angular speed. Any abrupt pose change (state switch, IK flip, scripted pose) is spread over a few frames,
   * so motion stays continuous (an inertialization-style safety net under the weighted blends).
   */
  private limitJoint(node: TransformNode, dt: number, rate?: number): boolean {
    // (guard-render S5 L5) the limiter state lives on the node itself (a node belongs to one rig): no Map lookups
    let st = (node as LimitedNode)._lim;
    if (st === undefined) st = (node as LimitedNode)._lim = { rate: undefined, prev: null };
    let maxRate = rate ?? st.rate;
    if (maxRate === undefined) {
      maxRate = JOINT_RATE.get(node.name.split('-').pop() ?? '') ?? 20;
      st.rate = maxRate;
    }
    const q = node.rotationQuaternion!;
    const prev = st.prev;
    if (!prev) {
      st.prev = q.clone();
      return false;
    }
    const dot = Math.min(1, Math.abs(Quaternion.Dot(prev, q)));
    const angle = 2 * Math.acos(dot);
    const max = maxRate * Math.max(dt, 1 / 240);
    const hit = angle > max;
    if (hit) {
      Quaternion.SlerpToRef(prev, q, max / angle, q);
      this.limited++;
    }
    prev.copyFrom(q);
    return hit;
  }

  /** Set a node's world rotation through its parent. */
  private setWorldRot(node: TransformNode, parent: TransformNode, world: Quaternion): void {
    fresh(parent);
    const inv = Quaternion.InverseToRef(parent.absoluteRotationQuaternion, tmpQ2);
    inv.multiplyToRef(world, node.rotationQuaternion!);
  }

  /** Root/body-space point -> world. */
  private bodyToWorld(v: { x: number; y: number; z: number }, out: Vector3): Vector3 {
    tmpE.set(v.x, v.y - this.bodyPivot, v.z);
    return Vector3.TransformCoordinatesToRef(tmpE, this.body.getWorldMatrix(), out);
  }

  private dirToWorld(x: number, y: number, z: number, out: Vector3): Vector3 {
    tmpE.set(x, y, z);
    return Vector3.TransformNormalToRef(tmpE, this.body.getWorldMatrix(), out).normalize();
  }

  /**
   * Arm IK. `isGrip`: this hand holds the trigger grip (else the foregrip / magazine / wall).
   * `wallW` blends the support hand onto the wall point (`wallHand`).
   */

  private solveArm(side: 1 | -1, gripW: number, offW: number, free: { x: number; y: number; z: number }, wallW = 0, isGrip = side > 0, magW = 0): void {
    const sh = side > 0 ? this.shoulderR : this.shoulderL;
    const el = side > 0 ? this.elbowR : this.elbowL;
    const wr = side > 0 ? this.wristR : this.wristL;
    const p = this.p;
    fresh(sh);
    let S = sh.getAbsolutePosition();
    // (anim-natural N4c) the elbow strike: the arm targets turn with the shoulder line about the shoulder (the ready
    // follow below carries the shoulder's own move), so the elbow drives through with the chest
    const sc = this.sb.chest;
    if (sc !== 0) {
      const c = Math.cos(sc);
      const s = Math.sin(sc);
      const dx = free.x - side * p.shoulderHalf;
      sbFree.x = side * p.shoulderHalf + dx * c + free.z * s;
      sbFree.y = free.y;
      sbFree.z = -dx * s + free.z * c;
      free = sbFree;
    }
    // free-swing target, then the weapon grip blended over it
    const target = this.bodyToWorld(free, tmpA);
    if (this.readyRf > 0) {
      readyShTmp.x = this.readySh.x * side;
      readyShTmp.y = this.readySh.y;
      readyShTmp.z = this.readySh.z;
      this.bodyToWorld(readyShTmp, tmpF);
      target.x += (S.x - tmpF.x) * this.readyRf;
      target.y += (S.y - tmpF.y) * this.readyRf;
      target.z += (S.z - tmpF.z) * this.readyRf;
    }
    // (G6, AUDIT-WALLS row 18) crouched side-on at a wall: the open-side hand rests on the top of its posed knee (the wrist
    // KNEE_HAND.up over the joint, a little ahead), the wall-side hand low by its shin, clear in front of it
    const kh = this.kneeHandW;
    if (kh !== 0) {
      const own = (kh > 0 ? 1 : -1) === side;
      const knee = side > 0 ? this.kneeR : this.kneeL;
      const ankle = side > 0 ? this.ankleR : this.ankleL;
      fresh(knee);
      fresh(ankle);
      const kp = knee.getAbsolutePosition();
      const fwd = this.dirToWorld(0, 0, 1, tmpPole);
      if (own) tmpC.set(kp.x + fwd.x * KNEE_HAND.fwd, kp.y + KNEE_HAND.up, kp.z + fwd.z * KNEE_HAND.fwd);
      else {
        const ap = ankle.getAbsolutePosition();
        tmpC.set(kp.x + (ap.x - kp.x) * KNEE_HAND.shin + fwd.x * KNEE_HAND.shinFwd, kp.y + (ap.y - kp.y) * KNEE_HAND.shin, kp.z + (ap.z - kp.z) * KNEE_HAND.shin + fwd.z * KNEE_HAND.shinFwd);
      }
      Vector3.LerpToRef(target, tmpC, Math.min(1, Math.abs(kh)), target);
    }
    if (isGrip && this.relK > 0 && this.relNode !== null) {
      // (anim-natural N3) letting go of a gun just put away: the hand eases off its grip in the slot (in a swap, reaching
      // for the next gun from there: its grip weight below takes over)
      const hold = this.holds ? this.holds[side > 0 ? 0 : 1]! : null;
      if (hold) tmpF.copyFrom(this.relGrip).addInPlace(hold.trigger.w);
      else tmpF.copyFrom(this.relGrip).addInPlaceFromFloats(WRIST_TRIGGER[0] * side, WRIST_TRIGGER[1], WRIST_TRIGGER[2]);
      Vector3.TransformCoordinatesToRef(tmpF, this.relNode.getWorldMatrix(), tmpB);
      Vector3.LerpToRef(target, tmpB, this.relK, target);
    }
    if (gripW > 0 && this.heldWeapon) {
      const m = this.heldWeapon.getWorldMatrix();
      // the hand wraps the gun: the wrist sits behind / under the palm point (weapon space), so the arm
      // reaches only as far as a real one and the elbows bend
      const hold = this.holds ? this.holds[side > 0 ? 0 : 1]! : null;
      if (isGrip) {
        if (hold) tmpF.copyFrom(this.grip).addInPlace(hold.trigger.w);
        else tmpF.copyFrom(this.grip).addInPlaceFromFloats(WRIST_TRIGGER[0] * side, WRIST_TRIGGER[1], WRIST_TRIGGER[2]);
        Vector3.TransformCoordinatesToRef(tmpF, m, tmpB);
        Vector3.LerpToRef(target, tmpB, gripW, target);
      } else {
        // off hand: free target -> magazine well -> foregrip, by weight
        const onMag = Math.min(1, magW) * gripW;
        if (onMag > 0) {
          // (anim-cleanup) a body with its own hands grips the magazine (and the charging handle) as a grip: palm on
          // its left side, fingers round the front
          if (hold) tmpF.copyFrom(this.magPoint).addInPlace(hold.trigger.w);
          else tmpF.copyFrom(this.magPoint).addInPlaceFromFloats(WRIST_SUPPORT[0] * side, WRIST_SUPPORT[1], WRIST_SUPPORT[2]);
          if (HANDS_CUR.on) this.tuneSupport(side, false);
          Vector3.TransformCoordinatesToRef(tmpF, m, tmpB);
          Vector3.LerpToRef(target, tmpB, onMag, target);
        }
        const onGrip = Math.min(1, offW) * gripW;
        if (onGrip > 0) {
          if (hold) tmpF.copyFrom(this.foregrip).addInPlace(hold[this.supportStyle].w);
          else tmpF.copyFrom(this.foregrip).addInPlaceFromFloats(WRIST_SUPPORT[0] * side, WRIST_SUPPORT[1], WRIST_SUPPORT[2]);
          if (HANDS_CUR.on) this.tuneSupport(side, true);
          Vector3.TransformCoordinatesToRef(tmpF, m, tmpB);
          Vector3.LerpToRef(target, tmpB, onGrip, target);
        }
      }
    }
    if (wallW > 0 && this.wallHand && !isGrip) Vector3.LerpToRef(target, this.wallHand, wallW, target);
    // world grip (rung, pipe, lip): the wrist sits behind the palm along the reach from the shoulder; (anim-cleanup) a
    // body with its own hands puts its palm on the grip, the hand closed round the grip's axis (or hooked over a lip)
    const reach = side > 0 ? this.reachR : this.reachL;
    const gi = side > 0 ? 0 : 1;
    this.gripOk[gi] = false;
    if (reach.w > 0) {
      // (team-climb) a grip that lets go as the arm runs out (the rope top-out's lip): `liftOffTarget`
      const rt = reach.liftOff ? liftOffTarget(reach, S, p.upperArm.len + p.forearm.len, gi) : reach;
      if (!(this.handRest && this.solveWorldGrip(side, rt, S, tmpB))) {
        tmpB.set(rt.x - S.x, rt.y - S.y, rt.z - S.z);
        const len = tmpB.length();
        const back = len > 1e-4 ? (p.hand.len * 0.45) / len : 0;
        tmpB.set(rt.x - tmpB.x * back, rt.y - tmpB.y * back, rt.z - tmpB.z * back);
      }
      Vector3.LerpToRef(target, tmpB, Math.min(1, reach.w), target);
    }
    if (HANDS_CUR.on && HANDS_CUR.hands) {
      // (tuner-v2 item 2) the local player's hand IK target offset (body frame: fwd, up, out), before the solve
      const o = side > 0 ? 3 : 0;
      const hp = HANDS_CUR.pos;
      Vector3.TransformNormalFromFloatsToRef(hp[o + 2]! * side, hp[o + 1]!, hp[o]!, this.body.getWorldMatrix(), handsV);
      target.addInPlace(handsV);
    }
    // elbows down/out/back; (step 10) the striking elbow (right) lifts out to the side, level, with the elbow arc
    const mw = side > 0 && this.input.melee >= 0 ? meleePoleW(this.input.melee) : 0;
    // (fix 21-1, A81) relaxed over a right-thigh holster the right elbow points further out, clear of the gun's grip
    // (fix 21-2) eased with the gear, and gone by a quarter of the reach to a world grip (zipline, ladder, ledge):
    // the elbow swings in under the grip before the body moves to the anchor (e2e-clip zipline)
    const holsterOut = side > 0 && this.holsterW > 0 ? HOLSTER_ELBOW_OUT * this.holsterW * Math.min(1, this.readyRf) * (1 - Math.min(1, reach.w * 4)) : 0;
    // (anim-rework S3) the gun in the hands tucks the elbows at low ready too (READY_ELBOW_TUCK)
    // (anim-rework S4) crouched more (READY_ELBOW_TUCK_CROUCH)
    const cr = Math.max(0, Math.min(1, this.input.crouch));
    const tuck = Math.max(AIM_ELBOW_TUCK * this.aimK, (this.heldWeapon ? 1 : this.relK) * (READY_ELBOW_TUCK + (READY_ELBOW_TUCK_CROUCH - READY_ELBOW_TUCK) * cr)) * TUNE_CUR.tuckMul * (this.tuneSt ? wrenTuckMul(this.supportStyle === 'cup', this.aimK, cr) : 1); // (anim-bake-targets) Wren's tuck per gun state
    // (anim-natural N3) carrying a gun between its slot and the pocket the trigger arm's elbow leads out to the side: the
    // grip passes below-behind the shoulder, along the resting pole, where the elbow flipped front to back (37 cm in four
    // frames) and the wrist slipped 14 cm off the grip
    const tp = isGrip ? this.travelPoleK : 0;
    this.dirToWorld(side * (ELBOW_POLE_OUT * TUNE_CUR.elbowPoleMul * (1 - tuck) + 0.65 * mw + holsterOut + TRAVEL_POLE[0] * tp), -1 + 0.9 * mw + TRAVEL_POLE[1] * tp, -0.35 + 0.35 * mw + TRAVEL_POLE[2] * tp, tmpPole);
    // (feature/weapons) shoulder protraction towards a weapon hand point out of reach (in the torso frame; the shoulder's
    // height stays the weld's)
    {
      // the shoulder's rest (this pose's weld height) first, so the reach is measured from there
      let rx = side * p.shoulderHalf;
      let ry = this.shoulderY || sh.position.y;
      let rz = -0.01;
      // (anim-skeleton S2) a turned clavicle carries the rest about its SC point (chest frame); untouched: as before
      if (this.clavOn[side > 0 ? 1 : 0] === 1) {
        const c = side > 0 ? this.clavR : this.clavL;
        const cp = c.position;
        clavV.set(rx - cp.x, ry - cp.y, rz - cp.z).rotateByQuaternionToRef(c.rotationQuaternion!, clavV);
        rx = cp.x + clavV.x;
        ry = cp.y + clavV.y;
        rz = cp.z + clavV.z;
      }
      protV.copyFrom(target).subtractInPlace(S);
      // from where the shoulder is now back to its rest, in world space, so the excess is the rest pose's
      Quaternion.InverseToRef(this.torso.absoluteRotationQuaternion, protQ);
      protV.rotateByQuaternionToRef(protQ, protV);
      protV.x += sh.position.x - rx;
      protV.y += sh.position.y - ry;
      protV.z += sh.position.z - rz;
      // aim for 93 % of the arm's length, so the elbow keeps a bend
      const over = protV.length() - (p.upperArm.len + p.forearm.len) * 0.93;
      const holdW = gripW > 0 && this.heldWeapon ? Math.min(1, gripW) : 0;
      // (anim-natural N3) letting go of a gun just put away the shoulder eases back with the hand (relK)
      const want = Math.min(PROTRACT_MAX, Math.max(0, over)) * Math.max(holdW, isGrip ? this.relK : 0);
      protV.normalize();
      const px = rx + protV.x * want;
      const py = ry + protV.y * want;
      const pz = rz + protV.z * want;
      if (Math.abs(sh.position.x - px) > 1e-6 || Math.abs(sh.position.y - py) > 1e-6 || Math.abs(sh.position.z - pz) > 1e-6) {
        sh.position.set(px, py, pz);
        fresh(sh);
        S = sh.getAbsolutePosition();
      }
    }
    solveTwoBone(S, target, p.upperArm.len, p.forearm.len, tmpPole, tmpC, tmpD);
    // upper arm
    tmpC.subtractToRef(S, tmpA);
    this.dirToWorld(0, 0, 1, tmpE);
    boneRotation(tmpA, tmpE, tmpQ3);
    this.setWorldRot(sh, sh.parent as TransformNode, tmpQ3);
    // forearm
    tmpD.subtractToRef(tmpC, tmpA);
    boneRotation(tmpA, tmpE, tmpQ);
    this.setWorldRot(el, sh, tmpQ);
    // hand: follow the weapon when gripping, else continue the forearm
    if (gripW > 0.5 && this.heldWeapon && !(wallW > 0.5 && !isGrip) && reach.w < 0.5) {
      // fingers wrap the grip: hand -Y along weapon -Y, palm facing the weapon's side; (feature/weapons) a body with its
      // own hands takes the solved hold (palm on the grip, knuckles round it)
      const hold = this.holds ? this.holds[side > 0 ? 0 : 1]![isGrip || magW > 0.5 ? 'trigger' : this.supportStyle] : null;
      if (hold) tmpQ2.copyFrom(hold.q);
      else Quaternion.RotationYawPitchRollToRef(0, isGrip ? 0.25 : -1.2, isGrip ? 0 : -side * 0.4, tmpQ2);
      if (HANDS_CUR.on && !isGrip) {
        // (tuner-v2 item 2) the support hand's rotation on the gun, then the gun's visual turn (the hand stays on it)
        const c = HANDS_CUR;
        if (c.supRotOn && magW <= 0.5) mulInto(tmpQ2, c.supQ[0]!, c.supQ[1]!, c.supQ[2]!, c.supQ[3]!, false);
        if (HANDS_GUN.on && this.heldModel?.node === this.heldWeapon) mulInto(tmpQ2, HANDS_GUN.qx, HANDS_GUN.qy, HANDS_GUN.qz, HANDS_GUN.qw, true);
      }
      this.heldWeapon.absoluteRotationQuaternion.multiplyToRef(tmpQ2, tmpQ3);
      this.setWorldRot(wr, el, tmpQ3);
    } else if (reach.w > 0.01 && this.gripOk[gi]) {
      // (anim-cleanup) on a world grip: the solved hold, eased in with the reach (the forearm's own line before it)
      el.computeWorldMatrix(true);
      Quaternion.SlerpToRef(el.absoluteRotationQuaternion, this.gripQ[gi]!, Math.min(1, reach.w), tmpQ3);
      this.setWorldRot(wr, el, tmpQ3);
    } else {
      wr.rotationQuaternion!.copyFromFloats(0, 0, 0, 1);
    }
    if (HANDS_CUR.on) handsRotApply(wr.rotationQuaternion!, side > 0 ? 0 : 1); // (tuner-v2 item 2) after the hand pose
  }

  /**
   * (tuner-v2 item 2) The local player's support hand point on the gun (`tmpF`, weapon space): the slide along the bore
   * and the 3-D offset (x out to that hand's side) on the foregrip hold, then the gun's visual transform, so the hand
   * stays on the rendered (scaled / moved) gun. No allocation.
   */
  private ikStrengthLimbs(first: 0 | 2): void {
    // (tuner-v2 item 2) 0: the arms (shoulder, elbow, wrist), 2: the legs (hip, knee, ankle); `anim/tuneHands` ikStrength
    if (first === 0) {
      ikStrength(0, this.shoulderL.rotationQuaternion!, this.elbowL.rotationQuaternion!, this.wristL.rotationQuaternion!);
      ikStrength(1, this.shoulderR.rotationQuaternion!, this.elbowR.rotationQuaternion!, this.wristR.rotationQuaternion!);
    } else {
      ikStrength(2, this.hipL.rotationQuaternion!, this.kneeL.rotationQuaternion!, this.ankleL.rotationQuaternion!);
      ikStrength(3, this.hipR.rotationQuaternion!, this.kneeR.rotationQuaternion!, this.ankleR.rotationQuaternion!);
    }
  }

  private tuneSupport(side: 1 | -1, foregrip: boolean): void {
    const c = HANDS_CUR;
    if (foregrip && c.supOn) tmpF.addInPlaceFromFloats(c.sup[0]! * side, c.sup[1]!, c.sup[2]!);
    if (HANDS_GUN.on && this.heldModel?.node === this.heldWeapon) gunVisualPoint(HANDS_GUN, this.grip, tmpF);
  }

  /**
   * (anim-cleanup slice 3) A world grip for a body with its own hands: the hand's frame from the grip's axis (a bar
   * across the body: the palm towards it from the front, fingers over; a bar along the body or upright: the palm towards
   * the body's midline from the hand's side; a lip: palm down, fingers over towards the wall), the wrist placed so the
   * palm sits on the grip's surface. Writes the wrist target into `out`; the rotation into gripQ. False: no axis.
   */
  private solveWorldGrip(side: 1 | -1, r: WorldTarget, S: Vector3, out: Vector3): boolean {
    const ax = r.ax ?? 0, ay = r.ay ?? 0, az = r.az ?? 0;
    if (ax * ax + ay * ay + az * az < 0.5) return false;
    const hand = side > 0 ? this.handRest!.R : this.handRest!.L;
    const gi = side > 0 ? 0 : 1;
    // the real geometry under the hand (check fix r1: the target itself can sit off the rung, inside the pipe)
    const gx = r.cx ?? r.x, gy = r.cy ?? r.y, gz = r.cz ?? r.z;
    // the body's frame (world): right and forward from the root's yaw
    const ry = this.root.rotation.y;
    const rx = Math.cos(ry), rz = -Math.sin(ry);
    const fx = Math.sin(ry), fz = Math.cos(ry);
    const reach = (this.p.upperArm.len + this.p.forearm.len) * 0.985;
    if (r.hook) {
      // over a lip: forward across the lip's axis; the hand pivots over the edge (palm down on top, then the heel over
      // the edge and the palm on the face) until the arm reaches its wrist
      const k = fx * ax + fz * az;
      let hx = fx - k * ax, hz = fz - k * az;
      const hl = Math.sqrt(hx * hx + hz * hz) || 1;
      hx /= hl; hz /= hl;
      // (traverse-fix-2) the pivot is continuous: the least angle in reach (bisected between the 15-degree steps), or, with
      // none in reach, the angle nearest the shoulder. Was: the first step in reach, else 90 degrees (the hand flipped
      // 0 -> 90 in a frame as the climb-up's shoulders rose out of reach while the hands let go: a 4.6 cm wrist pop).
      const H = Math.PI / 2;
      if (!this.hookAt(hand, ry, gi, hx, hz, gx, gy, gz, 0, out)) return false;
      let bestD = Vector3.Distance(out, S);
      if (bestD > reach) {
        let lo = 0, hi = -1, best = 0;
        for (let step = 1; step <= 6; step++) {
          const th = (step / 6) * H;
          if (!this.hookAt(hand, ry, gi, hx, hz, gx, gy, gz, th, out)) return false;
          const d = Vector3.Distance(out, S);
          if (d <= reach) { hi = th; break; }
          if (d < bestD) { bestD = d; best = th; }
          lo = th;
        }
        let th: number;
        if (hi >= 0) {
          // the reach boundary between the last step out of reach and the first in it
          for (let it = 0; it < 6; it++) {
            const m = (lo + hi) / 2;
            if (!this.hookAt(hand, ry, gi, hx, hz, gx, gy, gz, m, out)) return false;
            if (Vector3.Distance(out, S) <= reach) hi = m; else lo = m;
          }
          th = hi;
        } else {
          // none in reach: the nearest angle (a ternary search either side of the nearest step)
          let a = Math.max(0, best - H / 6), b = Math.min(H, best + H / 6);
          for (let it = 0; it < 10; it++) {
            const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3;
            if (!this.hookAt(hand, ry, gi, hx, hz, gx, gy, gz, m1, out)) return false;
            const d1 = Vector3.Distance(out, S);
            if (!this.hookAt(hand, ry, gi, hx, hz, gx, gy, gz, m2, out)) return false;
            if (d1 <= Vector3.Distance(out, S)) b = m2; else a = m1;
          }
          th = (a + b) / 2;
        }
        if (!this.hookAt(hand, ry, gi, hx, hz, gx, gy, gz, th, out)) return false;
      }
      this.gripOk[gi] = true;
      return true;
    }
    let dx: number, dy: number, dz: number, nx: number, ny: number, nz: number;
    if (Math.abs(ax * rx + az * rz) > 0.7 && Math.abs(ay) < 0.3) {
      // (check fix r1) a bar across the body (a rung, a fence wire): a fixed overhand grip, palm towards the wall
      // (forward), knuckles up, the fingers over the bar (picking it from the arm flipped the palm as the arm passed level)
      const k = fx * ax + fz * az;
      nx = fx - k * ax; ny = 0; nz = fz - k * az;
      dx = 0; dy = 1; dz = 0;
    } else {
      // along the body or upright: the knuckles carry on along the arm (shoulder -> grip), square to the axis; the palm
      // square to both, towards the body's midline from the hand's side
      dx = gx - S.x; dy = gy - S.y; dz = gz - S.z;
      const k = dx * ax + dy * ay + dz * az;
      dx -= k * ax; dy -= k * ay; dz -= k * az;
      nx = ay * dz - az * dy; ny = az * dx - ax * dz; nz = ax * dy - ay * dx;
      if (-(nx * rx + nz * rz) * side < 0) { nx = -nx; ny = -ny; nz = -nz; }
    }
    if (!this.gripFrame(hand, ry, dx, dy, dz, nx, ny, nz, gi)) return false;
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    const depth = (r.rad ?? 0) + PALM_DEPTH;
    this.gripWrist(gx - (nx / nl) * depth, gy - (ny / nl) * depth, gz - (nz / nl) * depth, ry, out, gi);
    // (check fix r1) never a locked arm: past 96 % of the arm the wrist (and the palm with it) stays short of the grip
    // (a top rung): at full stretch the rate-limited elbow lagged the body's pull by a frame or two
    const dl = Vector3.Distance(out, S);
    const cap = (this.p.upperArm.len + this.p.forearm.len) * 0.96;
    if (dl > cap) {
      const k2 = cap / dl;
      const ox = out.x, oy = out.y, oz = out.z;
      out.set(S.x + (ox - S.x) * k2, S.y + (oy - S.y) * k2, S.z + (oz - S.z) * k2);
      const gp = this.gripPalm[gi]!;
      gp.set(gp.x + out.x - ox, gp.y + out.y - oy, gp.z + out.z - oz);
    }
    this.gripOk[gi] = true;
    return true;
  }

  /** (traverse-fix-2) A lip grip's hand pivoted `th` over the edge (0: palm down on top, pi/2: palm into the face; the
   *  knuckles forward over the lip, then up; `hx`, `hz` the unit across the lip): its frame and wrist target into `out`. */
  private hookAt(hand: HandFrame, ry: number, gi: number, hx: number, hz: number, gx: number, gy: number, gz: number, th: number, out: Vector3): boolean {
    const c = Math.cos(th), s = Math.sin(th);
    const nx = hx * s, ny = -c, nz = hz * s;
    if (!this.gripFrame(hand, ry, hx * c, s, hz * c, nx, ny, nz, gi)) return false;
    this.gripWrist(gx - nx * PALM_DEPTH, gy - ny * PALM_DEPTH, gz - nz * PALM_DEPTH, ry, out, gi);
    return true;
  }

  /** (anim-cleanup) Solves a world hand frame (knuckles d, palm n) for one hand into gripQ / gripOut. */
  private gripFrame(hand: HandFrame, ry: number, dx: number, dy: number, dz: number, nx: number, ny: number, nz: number, gi: number): boolean {
    // into the root frame (the hand's rest frame is root-relative): rotate by -yaw about y
    const c = Math.cos(-ry), s = Math.sin(-ry);
    if (!holdInto(hand, dx * c + dz * s, dy, -dx * s + dz * c, nx * c + nz * s, ny, -nx * s + nz * c, gripOut)) return false;
    Quaternion.RotationYawPitchRollToRef(ry, 0, 0, gripYaw);
    gripLocal.copyFromFloats(gripOut[0]!, gripOut[1]!, gripOut[2]!, gripOut[3]!);
    gripYaw.multiplyToRef(gripLocal, this.gripQ[gi]!);
    return true;
  }

  /** (anim-cleanup) The wrist target for a palm centre at (px, py, pz) with the frame gripFrame solved. */
  private gripWrist(px: number, py: number, pz: number, ry: number, out: Vector3, gi: number): void {
    const pc = Math.cos(ry), ps = Math.sin(ry);
    const pwx = gripOut[4]! * pc + gripOut[6]! * ps, pwz = -gripOut[4]! * ps + gripOut[6]! * pc;
    out.set(px - pwx, py - gripOut[5]!, pz - pwz);
    this.gripPalm[gi]!.set(px, py, pz);
  }


  /**
   * (mt2-fixB, CHECK-3 item 5) The mocap switch toggled mid-move swaps the clip set, the clip feet and the slots in a
   * frame (the pelvis 12-14.5 cm, bones 41-62 deg a frame at jog, run and sprint). On the toggle frame each skeleton
   * node's offset from where it was going (last frame's local rotation turned on by its last step; the hips' position
   * likewise) to the new pose is taken and eased out over SWITCH_FADE s (smoothstep). Every frame records the posed nodes:
   * reads only, so a rig never toggled poses exactly as before. No allocation (the node list and buffers once).
   */
  private switchFade(dt: number): void {
    let N = this.xfNodes;
    if (N === null) {
      N = this.xfNodes = [this.hips, this.spine, this.torso, this.neck, this.headNode, this.clavL, this.clavR, this.shoulderL, this.shoulderR, this.elbowL, this.elbowR, this.wristL, this.wristR, this.hipL, this.hipR, this.kneeL, this.kneeR, this.ankleL, this.ankleR, this.toeL, this.toeR];
      this.xfQ1 = new Float64Array(N.length * 4);
      this.xfQ2 = new Float64Array(N.length * 4);
      this.xfD = new Float64Array(N.length * 4);
    }
    const Q1 = this.xfQ1;
    const Q2 = this.xfQ2;
    const D = this.xfD;
    const P = this.xfP;
    const A = this.xfA;
    const W = this.xfW;
    const hp = this.hips.position;
    const rp = this.root.position;
    const c = Math.cos(this.root.rotation.y);
    const sn = Math.sin(this.root.rotation.y);
    if (this.xfStart) {
      this.xfStart = false;
      this.xfT = 0;
      W[0] = W[1] = 1;
    }
    const on = this.xfT >= 0;
    if (on) {
      // the new pose's ankles (world) and feet (world rotation), before the fade
      for (let k = 0; k < 2; k++) {
        const an = k === 0 ? this.ankleL : this.ankleR;
        freshBelow(an, this.hips);
        (k === 0 ? xfAL : xfAR).copyFrom(an.getAbsolutePosition());
        (k === 0 ? xfFL : xfFR).copyFrom(an.absoluteRotationQuaternion);
      }
    }
    // over its first SWITCH_HOLD s the offsets are taken again each frame (the pose goes on as it was going: parts of the
    // new pose still jump a frame or two after the toggle, the arm cap, the planner's hand-off). Each node: where it was
    // going (last frame's local rotation turned on by its last step) times the new pose's inverse; the hips' position and
    // each ankle (root frame) likewise
    if (on && this.xfT < SWITCH_HOLD) {
      for (let j = 0; j < N.length; j++) {
        const q = N[j]!.rotationQuaternion!;
        const b = j * 4;
        const ax = Q1[b]!, ay = Q1[b + 1]!, az = Q1[b + 2]!, aw = Q1[b + 3]!;
        const cx = -Q2[b]!, cy = -Q2[b + 1]!, cz = -Q2[b + 2]!, cw = Q2[b + 3]!;
        const dx = cw * ax + cx * aw + cy * az - cz * ay;
        const dy = cw * ay - cx * az + cy * aw + cz * ax;
        const dz = cw * az + cx * ay - cy * ax + cz * aw;
        const dw = cw * aw - cx * ax - cy * ay - cz * az;
        const ex = aw * dx + ax * dw + ay * dz - az * dy;
        const ey = aw * dy - ax * dz + ay * dw + az * dx;
        const ez = aw * dz + ax * dy - ay * dx + az * dw;
        const ew = aw * dw - ax * dx - ay * dy - az * dz;
        const nx = -q.x, ny = -q.y, nz = -q.z, nw = q.w;
        const ox = ew * nx + ex * nw + ey * nz - ez * ny;
        const oy = ew * ny - ex * nz + ey * nw + ez * nx;
        const oz = ew * nz + ex * ny - ey * nx + ez * nw;
        const ow = ew * nw - ex * nx - ey * ny - ez * nz;
        const l = Math.sqrt(ox * ox + oy * oy + oz * oz + ow * ow) * (ow < 0 ? -1 : 1);
        D[b] = ox / l;
        D[b + 1] = oy / l;
        D[b + 2] = oz / l;
        D[b + 3] = ow / l;
      }
      P[6] = 2 * P[0]! - P[3]! - hp.x;
      P[7] = 2 * P[1]! - P[4]! - hp.y;
      P[8] = 2 * P[2]! - P[5]! - hp.z;
      for (let k = 0; k < 2; k++) {
        const a = k === 0 ? xfAL : xfAR;
        const x = a.x - rp.x, z = a.z - rp.z;
        const o = k * 3;
        A[12 + o] = 2 * A[o]! - A[6 + o]! - (x * c - z * sn);
        A[13 + o] = 2 * A[1 + o]! - A[7 + o]! - (a.y - rp.y);
        A[14 + o] = 2 * A[2 + o]! - A[8 + o]! - (x * sn + z * c);
      }
    }
    if (on) {
      const u = this.xfT > SWITCH_HOLD ? Math.min(1, (this.xfT - SWITCH_HOLD) / SWITCH_FADE) : 0;
      const w = 1 - u * u * (3 - 2 * u);
      // each leg's share: no more than w; a swinging foot's runs out by its landing (spread over the swing left); planted,
      // out (the planted foot stays where the new pose plants it)
      for (let k = 0; k < 2; k++) {
        const f = k === 0 ? this.planner.L : this.planner.R;
        if (W[k]! > w) W[k] = w;
        const rem = (1 - (f.swing > 0 ? f.swing : 0)) * f.stepDur;
        W[k] = f.contact ? 0 : W[k]! * (rem > dt ? 1 - dt / rem : 0);
      }
      let lim = false;
      // (past its time the limits below open up, 1 + 10 x the seconds over: what is still held back catches up smoothly)
      const f60 = dt * 60 * (1 + 10 * Math.max(0, this.xfT - SWITCH_HOLD - SWITCH_FADE));
      // the offsets' shares (slerp from identity) times the pose (a leg by its own share; its hip and knee solved below)
      for (let j = 0; j < N.length; j++) {
        const leg = j >= XF_LEG0;
        const wj = leg ? W[(j - XF_LEG0) & 1]! : w;
        const q = N[j]!.rotationQuaternion!;
        const b = j * 4;
        const h = Math.acos(Math.min(1, D[b + 3]!));
        const s = Math.sin(h);
        const k = s < 1e-6 ? wj : Math.sin(wj * h) / s;
        const ox = D[b]! * k, oy = D[b + 1]! * k, oz = D[b + 2]! * k, ow = s < 1e-6 ? 1 : Math.cos(wj * h);
        const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
        let rx = ow * qx + ox * qw + oy * qz - oz * qy;
        let ry = ow * qy - ox * qz + oy * qw + oz * qx;
        let rz = ow * qz + ox * qy - oy * qx + oz * qw;
        let rw = ow * qw - ox * qx - oy * qy - oz * qz;
        // at most SWITCH_STEP rad a frame from what was shown (the new pose's own late jumps: the planner's hand-off, the
        // legs unlimited); a planted leg's hip, knee and ankle are solved onto the plant below instead
        const side = (j - XF_LEG0) & 1;
        if (!(leg && j < XF_LEG0 + 6 && (side === 0 ? this.planner.L : this.planner.R).contact)) {
          const px = Q1[b]!, py = Q1[b + 1]!, pz = Q1[b + 2]!, pw = Q1[b + 3]!;
          let dt4 = px * rx + py * ry + pz * rz + pw * rw;
          if (dt4 < 0) {
            rx = -rx;
            ry = -ry;
            rz = -rz;
            rw = -rw;
            dt4 = -dt4;
          }
          const ang = 2 * Math.acos(Math.min(1, dt4));
          const mx = SWITCH_STEP * f60;
          if (ang > mx) {
            // slerp from the shown rotation by mx / ang
            const t = mx / ang, hh = ang / 2, sh = Math.sin(hh);
            const a0 = Math.sin((1 - t) * hh) / sh, a1 = Math.sin(t * hh) / sh;
            rx = px * a0 + rx * a1;
            ry = py * a0 + ry * a1;
            rz = pz * a0 + rz * a1;
            rw = pw * a0 + rw * a1;
            lim = true;
          }
        }
        q.set(rx, ry, rz, rw);
      }
      let hx = hp.x + P[6]! * w, hy = hp.y + P[7]! * w, hz = hp.z + P[8]! * w;
      // the hips at most SWITCH_HIPS m a frame (side, height, forward: the forward step adds to the pace's) from where
      // they were shown

      const lx = SWITCH_HIPS[0] * f60, ly = SWITCH_HIPS[1] * f60, lz = SWITCH_HIPS[2] * f60;
      if (hx > P[0]! + lx || hx < P[0]! - lx || hy > P[1]! + ly || hy < P[1]! - ly || hz > P[2]! + lz || hz < P[2]! - lz) lim = true;
      hx = hx > P[0]! + lx ? P[0]! + lx : hx < P[0]! - lx ? P[0]! - lx : hx;
      hy = hy > P[1]! + ly ? P[1]! + ly : hy < P[1]! - ly ? P[1]! - ly : hy;
      hz = hz > P[2]! + lz ? P[2]! + lz : hz < P[2]! - lz ? P[2]! - lz : hz;
      hp.set(hx, hy, hz);
      for (let j = 0; j < N.length; j++) fresh(N[j]!);
      // a planted leg reaches its plant: the faded hips come down as far as it needs (the new pose's sat lower)
      let drop = 0;
      for (let k = 0; k < 2; k++) {
        if (!(k === 0 ? this.planner.L : this.planner.R).contact) continue;
        const a = k === 0 ? xfAL : xfAR;
        const hj = (k === 0 ? this.hipL : this.hipR).getAbsolutePosition();
        const reach = ((k === 0 ? this.kneeL : this.kneeR).position.length() + (k === 0 ? this.ankleL : this.ankleR).position.length()) * 0.999;
        const hd = hyp2(hj.x - a.x, hj.z - a.z);
        const need = hj.y - a.y - Math.sqrt(Math.max(0, reach * reach - hd * hd));
        if (need > drop) drop = need;
      }
      if (drop > 0) {
        hp.y -= drop;
        for (let j = 0; j < N.length; j++) fresh(N[j]!);
      }
      // the legs: each ankle onto the new pose's plus its share of the offset (root frame), its foot as faded (planted:
      // the new pose's)
      for (let k = 0; k < 2; k++) {
        const a = k === 0 ? xfAL : xfAR;
        const F = k === 0 ? xfFL : xfFR;
        const an = k === 0 ? this.ankleL : this.ankleR;
        const wl = W[k]!;
        const planted = (k === 0 ? this.planner.L : this.planner.R).contact;
        if (!planted) {
          const o = 12 + k * 3;
          // the swinging ankle (root frame): the new pose's plus its share of the offset, at most SWITCH_FOOT m a frame
          // from where it was shown
          const x = a.x - rp.x, z = a.z - rp.z;
          let fx = x * c - z * sn + A[o]! * wl, fy = a.y - rp.y + A[o + 1]! * wl, fz = x * sn + z * c + A[o + 2]! * wl;
          const ex = fx - A[k * 3]!, ey = fy - A[k * 3 + 1]!, ez = fz - A[k * 3 + 2]!;
          const e = Math.sqrt(ex * ex + ey * ey + ez * ez);
          const em = SWITCH_FOOT * f60;
          if (e > em) {
            fx = A[k * 3]! + (ex * em) / e;
            fy = A[k * 3 + 1]! + (ey * em) / e;
            fz = A[k * 3 + 2]! + (ez * em) / e;
            lim = true;
          }
          a.set(rp.x + fx * c + fz * sn, rp.y + fy, rp.z - fx * sn + fz * c);
          F.copyFrom(an.absoluteRotationQuaternion);
        }
        // the knee's side: planted, where it was shown last frame (its leg unlimited, the new pose's knee flips as it
        // jumps); swinging, its own
        const ko = 18 + k * 3;
        if (planted) xfHint.set(rp.x + A[ko]! * c + A[ko + 2]! * sn, rp.y + A[ko + 1]!, rp.z - A[ko]! * sn + A[ko + 2]! * c);
        else xfHint.copyFrom((k === 0 ? this.kneeL : this.kneeR).getAbsolutePosition());
        if (k === 0) this.xfPlant(this.hipL, this.kneeL, an, a, F);
        else this.xfPlant(this.hipR, this.kneeR, an, a, F);
      }
      this.xfT += dt;
      // (on while anything is still held back, up to SWITCH_HOLD + SWITCH_FADE s more)
      if (this.xfT >= SWITCH_HOLD + SWITCH_FADE && (!lim || this.xfT >= 2 * (SWITCH_HOLD + SWITCH_FADE))) this.xfT = -1;
    }
    // the posed frame, for the next toggle (reads only)
    Q2.set(Q1);
    for (let j = 0; j < N.length; j++) {
      const q = N[j]!.rotationQuaternion!;
      const b = j * 4;
      Q1[b] = q.x;
      Q1[b + 1] = q.y;
      Q1[b + 2] = q.z;
      Q1[b + 3] = q.w;
    }
    P[3] = P[0]!;
    P[4] = P[1]!;
    P[5] = P[2]!;
    P[0] = hp.x;
    P[1] = hp.y;
    P[2] = hp.z;
    for (let k = 0; k < 2; k++) {
      const an = k === 0 ? this.ankleL : this.ankleR;
      if (!on) freshBelow(an, this.hips);
      const a = an.getAbsolutePosition();
      const x = a.x - rp.x, z = a.z - rp.z;
      const o = k * 3;
      A[6 + o] = A[o]!;
      A[7 + o] = A[1 + o]!;
      A[8 + o] = A[2 + o]!;
      A[o] = x * c - z * sn;
      A[1 + o] = a.y - rp.y;
      A[2 + o] = x * sn + z * c;
      const kn = (k === 0 ? this.kneeL : this.kneeR).getAbsolutePosition();
      const kx = kn.x - rp.x, kz = kn.z - rp.z;
      A[18 + o] = kx * c - kz * sn;
      A[19 + o] = kn.y - rp.y;
      A[20 + o] = kx * sn + kz * c;
    }
    if (this.xfSeen < 2) this.xfSeen++;
  }

  /** (mt2-fixB) `switchFade`: a planted leg re-solved from its faded hip onto its plant (ankle `A`, foot world rotation
   *  `F`): the knee on the plant's circle on the faded knee's side, the hip and the shin turned by the shortest arcs. */
  private xfPlant(hip: TransformNode, knee: TransformNode, ankle: TransformNode, A: Vector3, F: Quaternion): void {
    freshBelow(ankle, this.hips);
    xfH.copyFrom(hip.getAbsolutePosition());
    const lt = knee.position.length();
    const ls = ankle.position.length();
    A.subtractToRef(xfH, xfV);
    let d = xfV.length();
    if (d < 1e-6) return;
    xfV.scaleInPlace(1 / d);
    if (d > (lt + ls) * 0.9999) d = (lt + ls) * 0.9999;
    const a = (lt * lt - ls * ls + d * d) / (2 * d);
    const r = Math.sqrt(Math.max(0, lt * lt - a * a));
    // the knee's side: the hint (where it was shown) off the hip-ankle line
    xfX.copyFrom(xfHint).subtractInPlace(xfH);
    const along = Vector3.Dot(xfX, xfV);
    xfX.set(xfX.x - xfV.x * along, xfX.y - xfV.y * along, xfX.z - xfV.z * along);
    const n = xfX.length();
    if (n < 1e-6) return;
    xfX.scaleInPlace(r / n);
    // the hip: the knee's direction onto the planted knee's
    xfK.copyFrom(knee.getAbsolutePosition()).subtractInPlace(xfH);
    xfK.normalize();
    xfV.scaleInPlace(a).addInPlace(xfX).normalize();
    Quaternion.FromUnitVectorsToRef(xfK, xfV, kF);
    kF.multiplyToRef(hip.absoluteRotationQuaternion, tmpQ3);
    this.setWorldRot(hip, hip.parent as TransformNode, tmpQ3);
    freshBelow(ankle, this.hips);
    // the shin onto the plant
    const K = knee.getAbsolutePosition();
    ankle.getAbsolutePosition().subtractToRef(K, xfK).normalize();
    A.subtractToRef(K, xfV).normalize();
    Quaternion.FromUnitVectorsToRef(xfK, xfV, kF);
    kF.multiplyToRef(knee.absoluteRotationQuaternion, tmpQ3);
    this.setWorldRot(knee, hip, tmpQ3);
    fresh(ankle);
    // the foot as planted
    this.setWorldRot(ankle, knee, F);
    freshBelow(ankle === this.ankleL ? this.toeL : this.toeR, this.hips);
  }

  /** The knee pole's share toward the foot's yaw for a side (KNEE_SWING_SHARE swinging, standing holstered; else half). */
  private poleWant(side: number): number {
    const swinging = !(side < 0 ? this.planner.L : this.planner.R).contact;
    const holK = this.lastTargets?.keyHol ?? 0;
    return swinging ? 0.5 + (KNEE_SWING_SHARE - 0.5) * holK : 0.5;
  }

  /** Leg IK onto a world ankle target; the foot takes its world yaw and the swing / pose pitch. */
  private solveLegWorld(hip: TransformNode, knee: TransformNode, ankle: TransformNode, x: number, y: number, z: number, footYaw: number, footPitch: number, side: number, out = this.kneeOutNow): void {
    const p = this.p;
    if (!Number.isNaN(this.legYaw)) footYaw = this.legYaw;
    fresh(hip);
    const H = hip.getAbsolutePosition();
    tmpA.set(x, y, z);
    if (HANDS_CUR.on && HANDS_CUR.feet) {
      // (tuner-v2 item 2) the local player's foot IK target offset (body frame: fwd, up, out); the planner is untouched
      const o = side < 0 ? 6 : 9;
      const fp = HANDS_CUR.pos;
      Vector3.TransformNormalFromFloatsToRef(fp[o + 2]! * side, fp[o + 1]!, fp[o]!, this.body.getWorldMatrix(), handsV);
      tmpA.addInPlace(handsV);
    }
    // knees forward (along the foot) and slightly out
    // (A1.2) knees forward between the hips and the toes (never backwards over a turned foot), and slightly out
    // (anim-rework S2) standing holstered, a swinging foot's knee stays nearer the pelvis' forward (KNEE_SWING_SHARE);
    // crouched and drawn as before (half way)
    const ps = this.poleShare[side < 0 ? 0 : 1]!;
    const poleYaw = kneePoleYaw(this.pelvisWorldYaw, footYaw, ps >= 0 ? ps : this.poleWant(side));
    const c = Math.cos(poleYaw);
    const sn = Math.sin(poleYaw);
    // (ct-prototype E1) climbing a ladder / drainpipe the knee pole also points up (CLIMB_KNEE_UP): a raised foot's
    // hip-ankle line ran along the level pole and the knee flipped (legs "upside down"); now it bends up and forward
    // (ct-prototype G4) and out to the side (CLIMB_KNEE_OUT): the 2-rung ladder steps and the drainpipe's paired feet draw
    // both knees up at once, and a forward-and-up pole brought them within 8 cm of each other (e2e-clip ladder)
    const climbK = this.input.traverse === 'climb' || this.input.traverse === 'pipeClimb';
    const o = climbK ? Math.max(out, CLIMB_KNEE_OUT * TUNE_CUR.kneeOutMul) : out;
    tmpPole.set(sn + side * o * c, climbK ? CLIMB_KNEE_UP * TUNE_CUR.kneeLiftMul : 0, c - side * o * sn);
    if (this.rollPole) {
      // (anim-n4b fix) in a roll the pole turns with the body (into the root frame, then the body's world rotation): a
      // level world pole lay along the pitched, spun hip-to-ankle line and the knees bent through the floor (-0.21 m)
      const ry = this.root.rotation.y;
      const rc = Math.cos(ry);
      const rs = Math.sin(ry);
      Vector3.TransformNormalFromFloatsToRef(tmpPole.x * rc - tmpPole.z * rs, tmpPole.y, tmpPole.x * rs + tmpPole.z * rc, this.body.getWorldMatrix(), tmpPole);
    }
    solveTwoBone(H, tmpA, p.thigh.len, p.calf.len, tmpPole, tmpC, tmpD);
    // twist references that stay defined at any hip flexion (deep sneak, kneel): the kneecap faces away
    // from the shin, the shin faces along the thigh; the pole only steers them when the leg is straight
    // (a pole-only reference flips when the thigh points along it)
    tmpC.subtractToRef(H, tmpB);
    tmpD.subtractToRef(tmpC, tmpE);
    legHint.copyFrom(tmpE).normalize().scaleInPlace(-1).addInPlace(tmpPole.scaleToRef(0.3, legPole));
    boneRotation(tmpB, legHint, tmpQ3);
    this.setWorldRot(hip, hip.parent as TransformNode, tmpQ3);
    legHint.copyFrom(tmpB).normalize().addInPlace(tmpPole.scaleToRef(0.3, legPole));
    boneRotation(tmpE, legHint, tmpQ);
    this.setWorldRot(knee, hip, tmpQ);
    // foot: world yaw from the planner, pitch from the swing (toe-off / heel strike) and the pose
    Quaternion.RotationYawPitchRollToRef(footYaw, footPitch, 0, tmpQ3);
    this.setWorldRot(ankle, knee, tmpQ3);
  }

  /**
   * Lift (or lower) the aim pocket so the weapon's sight line sits at the head centre (eye), by `w` 0..1; (G2) `drop` m
   * below it (a pistol held under the line, AUDIT-AIM row 5).
   */
  private sightToEye(w: number, drop: number): void {
    const g = this.gunSpan;
    const e = this.gunFrame().getWorldMatrix().m;
    const zc = (g.z0 + g.z1) * 0.5;
    const sightY = g.top * e[5]! + zc * e[9]! + e[13]!;
    const dy = (posIn(this.headNode, headPt).y + SIGHT_EYE + TUNE_CUR.sightYAdd - drop - sightY) * w;
    if (Math.abs(dy) < 2e-4) return;
    // world up -> the pocket's parent (torso) space
    (this.weaponPivot.parent as TransformNode).getWorldMatrix().invertToRef(clrM);
    tmpE.set(0, dy, 0);
    Vector3.TransformNormalToRef(tmpE, clrM, tmpE);
    this.weaponPivot.position.addInPlace(tmpE);
    fresh(this.weaponPivot);
    freshBelow(this.heldWeapon!, this.weaponPivot);
  }

  /** (guard-render S5 L4) the FK joint names, in `fkNodes` order. */
  private static readonly FK_JOINTS: readonly JointName[] = [
    'pelvis', 'spine', 'chest', 'neck', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR',
  ];
  /** The nodes of `FK_JOINTS`, built on the first emote (no per-frame map / entries allocation). */
  private fkNodes: TransformNode[] | null = null;

  /** Blend an FK pose (scripted poses) over the procedural result. */
  private applyFk(fk: FkPose, w: number): void {
    let nodes = this.fkNodes;
    if (nodes === null) {
      nodes = this.fkNodes = [
        this.hips, this.spine, this.torso, this.neck, this.headNode, this.shoulderL, this.shoulderR, this.elbowL, this.elbowR,
        this.hipL, this.hipR, this.kneeL, this.kneeR,
      ];
    }
    if (fk.pelvisLift !== undefined) this.hips.position.y += fk.pelvisLift * w;
    const names = CharacterRig.FK_JOINTS;
    for (let j = 0; j < names.length; j++) {
      const e = fk[names[j]!];
      if (e === undefined) continue;
      const node = nodes[j]!;
      Quaternion.RotationYawPitchRollToRef(e[1], e[0], e[2], tmpQ);
      Quaternion.SlerpToRef(node.rotationQuaternion!, tmpQ, w, node.rotationQuaternion!);
    }
    if (fk.shoulderL || fk.shoulderR) {
      // posed arms let go of the weapon: straighten the wrists
      if (fk.shoulderR) this.wristR.rotationQuaternion!.copyFromFloats(0, 0, 0, 1);
      if (fk.shoulderL) this.wristL.rotationQuaternion!.copyFromFloats(0, 0, 0, 1);
    }
  }

  private baseColors: Color4[] | null = null;
  private flashK = 0;

  /** Tint every part towards white (hit feedback). k = 0..1. Only touches buffers when k changes. */
  setFlash(k: number): void {
    if (Math.abs(k - this.flashK) < 0.02 && !(k === 0 && this.flashK !== 0)) return;
    this.flashK = k;
    if (this.voxel) {
      this.voxel.setFlash(k);
      return;
    }
    const parts = this.parts as InstancedMesh[];
    if (!this.baseColors) this.baseColors = parts.map((m) => (m.instancedBuffers?.color as Color4 | undefined)?.clone() ?? new Color4(1, 1, 1, 1));
    parts.forEach((m, i) => {
      if (!m.instancedBuffers) return;
      const b = this.baseColors![i]!;
      m.instancedBuffers.color = new Color4(b.r + (1 - b.r) * k, b.g + (0.92 - b.g) * k, b.b + (0.85 - b.b) * k, 1);
    });
  }

  /** (Step 14) thermal vision's warmth on this body, 0..1 (render-only `pattern.w` glow). */
  private heatK = 0;
  /** (Step 14) set by gameState's render frame while this rig lies as a body: the frame stamp and its age (s). */
  bodyFrame = -1;
  bodyAge = 0;

  /** (Step 14) thermal vision's warmth (render only; nothing in gameplay reads it). Only touches buffers on a change. */
  setHeat(k: number): void {
    if (k === this.heatK) return;
    this.heatK = k;
    if (this.voxel) {
      this.voxel.setHeat(k);
      return;
    }
    const parts = this.parts;
    for (let i = 0; i < parts.length; i++) {
      const pt = (parts[i] as InstancedMesh).instancedBuffers?.pattern as Vector4 | undefined;
      if (pt) pt.w = k;
    }
  }

  get heat(): number {
    return this.heatK;
  }

  /** Disposed (no longer animates or renders). */
  disposed = false;
  private lodSkip = false;
  private lodDt = 0;

  dispose(): void {
    this.disposed = true;
    DEBUG_RIGS.delete(this);
    const li = LIVE_RIGS.indexOf(this);
    if (li >= 0) LIVE_RIGS.splice(li, 1);
    this.voxel?.dispose();
    for (const m of this.parts) m.dispose();
    for (const g of this.glows) g.dispose();
    this.root.dispose();
  }
}
