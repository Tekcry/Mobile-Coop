import { Color4, Matrix, Quaternion, TransformNode, Vector3, type Vector4, type AbstractMesh, type InstancedMesh, type Material, type Scene } from '../core/babylon';
import { VoxelBody, type VoxelBodyOptions } from '../voxel/voxelBody';
import { addGlow, GLOW_IDLE, GLOW_VISION } from './goggleGlow';
import type { SwapReach } from '../anim/clips/actions';
import type { PartShape } from '../world/partLibrary';
import type { AvatarLook } from '../cosmetics/avatarLook';
import { proportions, type Build, type Proportions } from './proportions';
import { AnimGraph, defaultInput, meleePoleW, type AnimInput, type TraverseKind } from '../anim/animGraph';
import { solveTwoBone } from '../anim/rigMath';
import { emptyPlannerInput, FootPlanner } from '../anim/footPlanner';
import type { MotionState } from '../anim/motion';
import { MotionDerive } from '../anim/motionDerive';
import { DEBUG_RIGS } from '../ui/debugVolumes';
import { hyp2 } from '../core/mathx';

/** Creates a unit-sized part mesh (instanced from the shared PartLibrary). `slot` names the colour/pattern slot. */
/** Weapon changing hands at an open-left back-to-wall edge (s): inside D9's 0.2-0.3 s draw / lean-out step (12b);
 *  a smoothstep with the graph's `hands` clip entered through the Inertializer, never a pop. */
export const EDGE_HAND_TIME = 0.25;

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
  /** Ready-position weights (default: low ready). */
  carry?: { low: number; high: number; compressed: number };
  /** Weapon mass factor (1 = rifle). */
  weight?: number;
  reload?: number;
  yawRate?: number;
  armed?: boolean;
  /** Dash blend 0..1. */
  dash?: number;
  /** Dash-in slide progress 0..1, or < 0. */
  slide?: number;
  /** Landing recovery 0..1. */
  landing?: number;
  /** Back to a wall (the flat-back high stance). */
  wall?: boolean;
  /** Side of the wall in the character's frame (-1 left, 1 right). */
  wallSide?: number;
  /** (step 11) The wall's outward normal (XZ) and its face plane (n . p on the face): no foot lands behind it. */
  wallNx?: number;
  wallNz?: number;
  wallFace?: number;
  /** Lean around an edge (-1 left .. 1 right), hips planted. */
  lean?: number;
  /** (step 12b, D10) World height the head centre stays under (a low-wall side lean: the wall top); unset = none.
   *  The pelvis sinks (knees bend deeper) by the excess, eased, so the head sample stays below the top. */
  headCap?: number;
  /** Stick intent along the body, wanted minus current pace (-1..1), at render rate. */
  intent?: number;
  traverse?: TraverseKind;
  traverseT?: number;
  melee?: number;
  /** (locomotion step 15) Medkit use 0..1, or < 0. */
  medkit?: number;
  /** (3.2.0) Whole-body tumble about the hips (rad): hanging legs up / inverted on a pipe. */
  tumble?: number;
  /** Doorway check sweep 0..1, or < 0. */
  check?: number;
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
}

export type JointName = 'pelvis' | 'spine' | 'chest' | 'neck' | 'head' | 'shoulderL' | 'shoulderR' | 'elbowL' | 'elbowR' | 'hipL' | 'hipR' | 'kneeL' | 'kneeR';
/** Forward-kinematics override (Euler x, y, z) per joint, used by emotes. */
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
/** 3.0 voxel characters (null: the smooth parts render, e.g. `?gfx=min`): the 'detailed' style is voxelised. */
let VOXEL_BODY: VoxelBodyOptions | null = null;
export function setVoxelBodies(o: VoxelBodyOptions | null): void {
  VOXEL_BODY = o;
}

export function avatarStyle(): AvatarStyle {
  return DEFAULT_STYLE;
}

/** Build -> look body type (and enemies can override with their own build). */
const BUILD_OF: Record<AvatarLook['body'], Build> = { average: 'average', lean: 'lean', athletic: 'athletic', broad: 'broad' };

/**
 * (locomotion step 22, A79) A planted foot rolling heel to toe (toe up, `pitch` < 0) turns about its heel, not the
 * ankle: the ankle rises by the heel's lever behind it so the heel stays on the floor.
 */
const HEEL_BACK = 0.05;
/** (step 22) The sole's depth under the ankle: turning about the ankle drops the heel by it times (1 - cos pitch) too. */
const HEEL_DOWN = 0.08;
function heelLift(f: { contact: boolean; pitch: number }): number {
  return f.contact && f.pitch < 0 ? -Math.sin(f.pitch) * HEEL_BACK + (1 - Math.cos(f.pitch)) * HEEL_DOWN : 0;
}

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

/** Aim pocket rest in the chest frame: x as a fraction of the shoulder half-width, y below the shoulder, z forward. */
export const AIM_POCKET = { x: 0.3, y: -0.1, z: 0.27 };
/** Neck flexion at a full cheek weld (rad): the eye drops onto the sight line. */
export const NECK_WELD = 0.35;
/** Shoulders lift into the stock at a full weld (m): the raised arms elevate the shoulder girdle. */
export const SHOULDER_WELD = 0.04;

/**
 * Wrist position relative to the palm point on the gun (weapon space: x across, y up, z along the bore;
 * x is mirrored for the left hand): the trigger hand's wrist sits behind the pistol grip, the support
 * hand's under and behind the handguard with the fingers wrapped over it.
 */
export const WRIST_TRIGGER: readonly [number, number, number] = [0.01, -0.015, -0.065];
export const WRIST_SUPPORT: readonly [number, number, number] = [0.015, -0.055, -0.035];

/** Knees point along the foot and this much outward (pole), so they never knock together in a side-step. */
export const KNEE_OUT = 0.12;
/** Closest the two knee centres may come (m): two kneecaps side by side. */
export const KNEE_GAP = 0.15;
/** A knee's centre never goes lower than this above the floor (m): the kneecap rests on it. */
export const KNEE_FLOOR = 0.05;

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
/** (fix 21-1, A81) Extra outward elbow pole (body x, against the pole's down 1) for the relaxed right arm over a thigh holster. */
const HOLSTER_ELBOW_OUT = 0.8;
/** (fix 21-2) The holster-out pole term eases in / out at this rate (1/s), so a draw never jumps the elbow. */
const HOLSTER_OUT_RATE = 8;
/** (step 21) Scratch body-space point for the ready-hands shoulder. */
const readyShTmp = { x: 0, y: 0, z: 0 };
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
const clrDir = new Vector3();
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
/** (21w) Weapon glide scratch. */
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
  /** Last body push-out applied to the weapon (m), for tests and the debug overlay. */
  gunPush = 0;
  /** Weapon node whose grips the hands follow (null = free arms). */
  heldWeapon: TransformNode | null = null;
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
  /** Extra emote overrides (set by the emote player). */
  emote: ((rig: CharacterRig, t: number) => FkPose | void) | null = null;
  emoteTime = 0;
  private emoteW = 0;
  /**
   * Weapon in the left hand (open side on the left at a back-to-wall edge, D9): grip / support swap and a
   * mirrored aim pocket. Dormant until step 12b drives it (WALL_SUB.leftHand).
   */
  openLeft = false;
  private handBlend = 0;
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
  /** (3.2.0) Pinned feet (world x / z, left then right; NaN = free): a remote's feet on the owner's (`FootPlanner`). */
  readonly footPins = [NaN, NaN, NaN, NaN];
  private pin = emptyPlannerInput();
  private prevRootX = 0;
  private prevRootZ = 0;
  private velX = 0;
  private velZ = 0;
  /** (locomotion step 22) Acceleration and motion state derived from the measured velocity (remote copies). */
  private derive = new MotionDerive();
  private pelvisDrop = 0;
  /** (locomotion step 21, A80) Per foot 0..1: how far a planted foot has eased from full leg length to the soft knee. */
  private softL = 1;
  private softR = 1;
  /** (fix 21-3) Per foot: the pelvis drop (m) it needed on its last planted frame (let go over its early swing). */
  private liftL = 0;
  private liftR = 0;
  /** (step 12b) Pelvis sink under a head cap (m) and the cap (world y), from `RigPose.headCap`. */
  private capDrop = 0;
  /** (locomotion step 21, M14) The ready-hands share this frame and the graph's shoulder for it (RigTargets). */
  private readyRf = 0;
  private readySh: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private headCap: number | undefined = undefined;
  /** Hand switch progress (open-left edge): 0..1 while changing hands, else -1. */
  handSwap = -1;
  private handFrom = 0;
  /** The hand target the running switch eases toward (a reversal mid-switch restarts from the current blend). */
  private handTo = 0;
  /** Where the running switch's progress started (0, or the mirrored progress after a reversal). */
  private handStart = 0;
  /** Blend rate (1/s) on the last switch frame, and the Hermite start tangent a reversal carries it into. */
  private handRate = 0;
  private handTan = 0;
  /** Duration (s) of the running switch: EDGE_HAND_TIME, or longer for a fast reversal. */
  private handDur = EDGE_HAND_TIME;
  /** Smoothed world aim rotation of the weapon (inertia from the weapon's mass). */
  private aimQ: Quaternion | null = null;
  private prevRot = new Map<TransformNode, Quaternion>();
  /** Joint-rate limiter hits (debug overlay warning counter). */
  limited = 0;
  /** Last graph output (debug overlay: layer weights, weapon bob). */
  lastTargets: ReturnType<AnimGraph['update']> | null = null;
  private lastFk: FkPose | null = null;
  private pelvisRest: number;
  private bodyPivot: number;
  private prevYaw: number | null = null;

  constructor(
    scene: Scene,
    make: PartFactory,
    look: AvatarLook,
    readonly height = 1.75,
    name = 'rig',
    opts: { build?: Build; armor?: boolean; style?: AvatarStyle } = {},
  ) {
    const p = proportions(opts.build ?? BUILD_OF[look.body], height);
    this.p = p;
    this.graph = new AnimGraph(p);
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
    // voxels (3.0): the parts merged into one skinned voxel mesh (they stay, unseen, for what reads them)
    const skin = ((this.parts[0] as InstancedMesh | undefined)?.sourceMesh?.metadata as { skinMaterial?: Material } | null | undefined)?.skinMaterial;
    if (VOXEL_BODY && this.style === 'detailed' && skin) this.voxel = new VoxelBody(scene, this.root, this.parts, this.headNode, skin, name, VOXEL_BODY, name === 'player');
    DEBUG_RIGS.add(this);
    LIVE_RIGS.push(this);
  }

  /** The merged voxel body (3.0; null: the smooth parts render). */
  voxel: VoxelBody | null = null;

  /** What renders (shadow casters): the voxel body's meshes, else the parts. */
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

  /** The tri-lens lenses always glow faintly (the goggle glow, bible L7); brighter while a vision mode (night vision) is on. */
  setLensGlow(on: boolean): void {
    if (on === this.lensOn) return;
    this.lensOn = on;
    const c = Color4.FromHexString(`${on ? LENS_ON : LENS_OFF}ff`);
    for (const m of this.lenses) m.instancedBuffers.color = c;
    for (const g of this.glows) g.instancedBuffers.color = on ? GLOW_VISION : GLOW_IDLE;
    if (this.voxel) for (const m of this.lenses) this.voxel.setPartColor(this.parts.indexOf(m), c);
  }

  // ------------------------------------------------------------------------------------------
  // Animation
  // ------------------------------------------------------------------------------------------

  /** Animation (clip graph + foot planner + IK). Call every render frame. */
  animate(dt: number, s: RigPose): void {
    if (this.disposed) return;
    // (21w) a re-parented weapon eases onto its new place (every frame, LOD or not)
    this.stepGlide(dt);
    // animation LOD: rigs far from the camera solve every other frame
    const cam = this.root.getScene().activeCamera;
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
    const i = this.input;
    i.speed = s.speed;
    i.localX = s.localX;
    i.localZ = s.localZ;
    i.grounded = s.grounded;
    i.crouch = s.crouch;
    i.kneel = s.kneel ?? false;
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
    i.grenade = s.grenade ?? -1;
    i.armed = s.armed ?? !!this.heldWeapon;
    i.ready = this.carrier && !this.heldWeapon;
    i.thighGear = this.thighGear;
    i.dash = s.dash ?? 0;
    i.slide = s.slide ?? -1;
    i.landing = s.landing ?? 0;
    i.wall = s.wall ?? false;
    i.wallSide = s.wallSide ?? 0;
    i.lean = s.lean ?? 0;
    this.headCap = s.headCap;
    i.traverse = s.traverse ?? 'none';
    i.traverseT = s.traverseT ?? 0;
    i.melee = s.melee ?? -1;
    i.medkit = s.medkit ?? -1;
    i.tumble = s.tumble ?? 0;
    i.check = s.check ?? -1;
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
      i.yawRate = d / dt;
    }
    this.prevYaw = yaw;
    // weapon changing hands (open-left wall edge, D9): eased over EDGE_HAND_TIME; the graph tucks the weapon in
    const handTarget = this.openLeft ? 1 : 0;
    // a new switch, or the target reversing mid-switch: restart from the current blend (no jump, 12b fix r1). A
    // reversal rewinds: progress restarts at the mirrored point 1 - s (the graph's tuck bump sin(pi * handSwap) stays
    // continuous and retracts) and the blend keeps its velocity (a cubic Hermite from the current blend and rate to
    // the new target at rest), so the weapon never steps or snaps direction. The rewind runs at least EDGE_HAND_TIME,
    // longer when needed so its peak acceleration stays under a plain switch's (6 / T^2)
    if (this.handSwap < 0 && handTarget !== this.handBlend) {
      this.handSwap = 0;
      this.handStart = 0;
      this.handFrom = this.handBlend;
      this.handTo = handTarget;
      this.handTan = 0;
      this.handDur = EDGE_HAND_TIME;
    } else if (this.handSwap >= 0 && handTarget !== this.handTo) {
      const s0 = Math.min(0.999, 1 - this.handSwap);
      this.handSwap = s0;
      this.handStart = s0;
      this.handFrom = this.handBlend;
      this.handTo = handTarget;
      const r = Math.abs(this.handRate) * EDGE_HAND_TIME;
      const x = (4 * r + Math.sqrt(16 * r * r + 144 * Math.abs(handTarget - this.handBlend))) / 12;
      this.handDur = EDGE_HAND_TIME * Math.min(2, Math.max(1, x));
      this.handTan = this.handRate * this.handDur;
    }
    if (this.handSwap >= 0) {
      const prev = this.handBlend;
      this.handSwap = Math.min(1, this.handSwap + ((1 - this.handStart) * dt) / this.handDur);
      const u = Math.min(1, (this.handSwap - this.handStart) / (1 - this.handStart));
      const e = u * u * (3 - 2 * u);
      const v = 1 - u;
      this.handBlend = Math.min(1, Math.max(0, this.handFrom + (handTarget - this.handFrom) * e + this.handTan * u * v * v));
      this.handRate = dt > 0 ? (this.handBlend - prev) / dt : 0;
      if (this.handSwap >= 1) {
        this.handBlend = handTarget;
        this.handSwap = -1;
        this.handRate = 0;
      }
    }
    i.handSwap = this.handSwap;
    i.hand = 1 - this.handBlend * 2;

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
    pin.reach = (this.p.thigh.len + this.p.calf.len) * 0.62;
    pin.quickStop = s.quickStop ?? 0;
    pin.hold = (s.holdSpeed ?? 0) > 0;
    pin.pinLX = this.footPins[0]!;
    pin.pinLZ = this.footPins[1]!;
    pin.pinRX = this.footPins[2]!;
    pin.pinRZ = this.footPins[3]!;
    if (i.wall && !t.gait.moving && Number.isNaN(pin.pinLX)) {
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
    pin.turnStep = i.wall ? 1.2 : Infinity;
    const free = !i.grounded || i.traverse !== 'none';
    pin.ground = free ? null : this.groundProbe;
    // airborne / traversing: the planner restarts from the clip pose when the feet are back down
    if (free) this.planner.L.init = this.planner.R.init = false;
    this.planner.update(pin);
    const L = this.planner.L;
    const R = this.planner.R;
    this.graph.setSupport(L.contact && !R.contact ? -1 : R.contact && !L.contact ? 1 : 0);

    this.applyTargets(t, dt, free);
    this.lastTargets = t;
    // emote overrides blend in/out
    let fk: FkPose | null = null;
    if (this.emote) {
      this.emoteTime += dt;
      fk = this.emote(this, this.emoteTime) ?? null;
      if (fk) this.lastFk = fk;
    }
    this.emoteW = Math.max(0, Math.min(1, this.emoteW + (fk ? dt : -dt) / 0.2));
    if (this.emoteW > 0 && this.lastFk) this.applyFk(this.lastFk, this.emoteW);
    if (this.emoteW === 0) this.lastFk = null;
    for (let k = 0; k < this.onPosed.length; k++) this.onPosed[k]!();
  }

  /**
   * Push the held weapon out of the body: sample its bore line and top edge against the trunk (a capsule
   * pelvis -> neck base), the head ball and the leg capsules, and translate the aim pocket out along the
   * summed overlap. Up to four passes on flat typed arrays (no allocation, no calls in the inner loop).
   * Returns the distance pushed (m).
   */
  private clearBody(): number {
    const w = this.heldWeapon!;
    const g = this.gunSpan;
    const m = w.getWorldMatrix();
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
    if (pushed > 0) {
      clrDir.set(ox, oy, oz);
      // world push -> the pocket's parent (torso) space
      const pm = (this.weaponPivot.parent as TransformNode).getWorldMatrix();
      pm.invertToRef(clrM);
      Vector3.TransformNormalToRef(clrDir, clrM, clrDir);
      this.weaponPivot.position.addInPlace(clrDir);
      fresh(this.weaponPivot);
      freshBelow(w, this.weaponPivot);
    }
    return pushed;
  }

  /** Hit reaction (additive flinch, recovers over ~0.4 s). */
  hit(strength: number, side = 0): void {
    this.graph.hitReact(strength, side);
  }

  private applyTargets(t: ReturnType<AnimGraph['update']>, dt: number, free: boolean): void {
    const p = this.p;
    this.body.rotationQuaternion!.copyFrom(Quaternion.RotationAxisToRef(Vector3.RightReadOnly, t.tumble, tmpQ));
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
      if (Math.abs(t.tumble) > 1e-3) {
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
    // pelvis drops so both feet stay reachable with soft knees (wide steps, lower ground, kneeling):
    // each foot measured from its own hip joint (pelvis offset and hip width), and a growing need is met
    // at once (a lagging drop lets the trailing leg overstretch and the planted ankle slide at toe-off);
    // easing back up stays smooth
    const legFull = p.thigh.len + p.calf.len;
    const legLen = legFull * 0.97;
    const hipY = rp.y + this.bodyPivot + this.pelvisRest + pe.y - 0.03;
    const yc = Math.cos(yaw);
    const ys = Math.sin(yaw);
    let need = 0;
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
      let soft = k === 0 ? this.softL : this.softR;
      soft = stepping ? 0 : reversed ? 1 : approachTo(soft, 1, dt, 0.035);
      if (k === 0) this.softL = soft;
      else this.softR = soft;
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
      const hx = pe.x + (k === 0 ? -p.hipHalf : p.hipHalf);
      const dh = hyp2(f.x - (rp.x + hx * yc + pe.z * ys), f.z - (rp.z - hx * ys + pe.z * yc));
      const footY = f.y + p.y.ankle + (k === 0 ? st.lY : st.rY);
      const reachV = Math.sqrt(Math.max(0, len * len - dh * dh));
      const fNeed = hipY - footY - reachV;
      if (!stepping) {
        if (k === 0) this.liftL = Math.max(0, fNeed);
        else this.liftR = Math.max(0, fNeed);
      }
      need = Math.max(need, fNeed * w);
    }
    need = Math.max(0, Math.min(0.4, need));
    // (3.2.0) turned over on a pipe (legs up / inverted) "down" is not the floor: no drop for the feet's reach
    const turned = Math.abs(this.input.tumble) > 0.3;
    if (turned) need = 0;
    this.pelvisDrop = need > this.pelvisDrop ? approachTo(this.pelvisDrop, need, dt, 0.012) : approachTo(this.pelvisDrop, need, dt, 0.08);
    this.hips.position.set(pe.x, this.pelvisRest + pe.y - this.pelvisDrop, pe.z);
    Quaternion.RotationYawPitchRollToRef(pe.yaw, pe.pitch, pe.roll, this.hips.rotationQuaternion!);
    // the spine counters most of the pelvis tilt and twist so the chest stays square (gun platform)
    const sp = t.spine;
    Quaternion.RotationYawPitchRollToRef(sp.yaw * 0.4 - pe.yaw * 0.6, sp.pitch * 0.45 - pe.pitch * 0.6, sp.roll * 0.5 - pe.roll * 0.4, this.spine.rotationQuaternion!);
    Quaternion.RotationYawPitchRollToRef(sp.yaw * 0.6, sp.pitch * 0.55, sp.roll * 0.5, this.torso.rotationQuaternion!);
    // cheek weld: the neck flexes the head down and forward onto the stock (the head stays level, below)
    Quaternion.RotationYawPitchRollToRef(t.head.yaw * 0.4, t.head.pitch * 0.3 + t.weld * NECK_WELD, t.head.roll * 0.4, this.neck.rotationQuaternion!);
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
    this.solveLegWorld(this.hipL, this.kneeL, this.ankleL, L.x, L.y + p.y.ankle + st.lY + heelLift(L), L.z, L.yaw, L.pitch + st.lPitch, -1);
    this.solveLegWorld(this.hipR, this.kneeR, this.ankleR, R.x, R.y + p.y.ankle + st.rY + heelLift(R), R.z, R.yaw, R.pitch + st.rPitch, 1);
    // anatomy: a knee never sinks into the floor (deep kneel): lift the pelvis and solve again
    const floorY = Math.min(L.y, R.y) + KNEE_FLOOR;
    const kneeY = Math.min(this.kneeL.getAbsolutePosition().y, this.kneeR.getAbsolutePosition().y);
    if (kneeY < floorY - 0.002 && !turned) {
      this.hips.position.y += floorY - kneeY;
      fresh(this.hips);
      fresh(this.spine);
      fresh(this.torso);
      this.solveLegWorld(this.hipL, this.kneeL, this.ankleL, L.x, L.y + p.y.ankle + st.lY + heelLift(L), L.z, L.yaw, L.pitch + st.lPitch, -1);
      this.solveLegWorld(this.hipR, this.kneeR, this.ankleR, R.x, R.y + p.y.ankle + st.rY + heelLift(R), R.z, R.yaw, R.pitch + st.rPitch, 1);
    }
    // anatomy: the knees never knock through each other (side-steps, leaning out): bow them outward
    const kneeGap = Vector3.Distance(this.kneeL.getAbsolutePosition(), this.kneeR.getAbsolutePosition());
    if (kneeGap < KNEE_GAP) {
      // steeper bow the closer they came (a pole up to ~70 deg outward)
      const bow = KNEE_OUT + (1 - kneeGap / KNEE_GAP) * 6;
      this.solveLegWorld(this.hipL, this.kneeL, this.ankleL, L.x, L.y + p.y.ankle + st.lY + heelLift(L), L.z, L.yaw, L.pitch + st.lPitch, -1, bow);
      this.solveLegWorld(this.hipR, this.kneeR, this.ankleR, R.x, R.y + p.y.ankle + st.rY + heelLift(R), R.z, R.yaw, R.pitch + st.rPitch, 1, bow);
    }
    // the legs' rate limit before anything is placed against them (the weapon's clearance sees the final legs)
    const lHip = this.limitJoint(this.hipL, dt);
    const lh = this.limitJoint(this.kneeL, dt) || lHip;
    const rHip = this.limitJoint(this.hipR, dt);
    const rh = this.limitJoint(this.kneeR, dt) || rHip;
    if (lh) {
      fresh(this.hipL);
      fresh(this.kneeL);
    }
    if (rh) {
      fresh(this.hipR);
      fresh(this.kneeR);
    }
    // head: world-stabilised (eyes level): looks along the aim plus the head channel
    Quaternion.RotationYawPitchRollToRef(
      yaw + this.input.aimYaw * 0.85 + this.lookYaw + t.head.yaw * 0.25,
      -this.input.aimPitch * 0.8 - this.lookPitch + t.head.pitch * 0.4,
      t.head.roll * 0.6,
      tmpQ,
    );
    this.setWorldRot(this.headNode, this.neck, tmpQ);
    this.limitJoint(this.headNode, dt);

    // aim pocket: rest + layer offsets, mirrored to the left shoulder when the weapon is in the left hand
    const chestY = p.y.waist + 0.13 * (p.height / 1.75);
    // raised to the eye the shoulder girdle lifts into the stock
    const shY = p.y.shoulder - chestY + t.weld * SHOULDER_WELD;
    if (Math.abs(this.shoulderR.position.y - shY) > 1e-5) {
      this.shoulderL.position.y = shY;
      this.shoulderR.position.y = shY;
    }
    const w = t.weapon;
    const mirror = 1 - this.handBlend * 2;
    this.weaponPivot.position.set((p.shoulderHalf * AIM_POCKET.x + w.x) * mirror, p.y.shoulder - chestY + AIM_POCKET.y + w.y, AIM_POCKET.z + w.z);
    // raised the weapon points along the aim; lowered (ready) it is carried with the body, so a lowered gun
    // never swings towards wherever the camera looks (into a wall beside you)
    const aimYaw = yaw + this.input.aimYaw * t.aimW;
    const aimPitch = this.input.aimPitch * (0.35 + 0.65 * t.aimW);
    Quaternion.RotationYawPitchRollToRef(aimYaw + w.yaw * mirror, -aimPitch + w.pitch, w.roll * mirror, tmpQ);
    if (Math.abs(t.tumble) > 1e-3) tmpQ.multiplyToRef(this.body.rotationQuaternion!, tmpQ);
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
      if (t.weld > 0.01) this.sightToEye(t.weld);
      // self-collision: the weapon never passes through the trunk or the head (pushed out before the hands
      // take it, so the grips stay in the hands)
      this.gunPush = this.clearBody();
    }

    // arms: the dominant hand takes the grip, the other the foregrip / magazine / wall (the wall contact moves
    // to the right hand when the weapon is in the left)
    const gripW = this.heldWeapon ? t.grip : 0;
    const leftGrips = this.handBlend > 0.5;
    // (locomotion step 21, M14) the ready hands hang from the real shoulders (the rig's own pelvis drop, head cap, twist)
    this.readyRf = t.readyFollow;
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
    this.solveArm(1, gripW, leftGrips ? t.offGrip : 1, t.handR, leftGrips ? offWall : 0, !leftGrips, leftGrips ? t.offMag : 0);
    this.solveArm(-1, gripW, leftGrips ? 1 : t.offGrip, t.handL, leftGrips ? 0 : offWall, leftGrips, leftGrips ? 0 : t.offMag);
    this.limitJoint(this.shoulderL, dt);
    this.limitJoint(this.shoulderR, dt);
    this.limitJoint(this.elbowL, dt);
    this.limitJoint(this.elbowR, dt);
  }

  /**
   * Realism limit + blend continuity: a joint's local rotation may not change faster than its max
   * angular speed. Any abrupt pose change (state switch, IK flip, emote) is spread over a few frames,
   * so motion stays continuous (an inertialization-style safety net under the weighted blends).
   */
  private jointRate = new Map<TransformNode, number>();

  private limitJoint(node: TransformNode, dt: number, rate?: number): boolean {
    let maxRate = rate ?? this.jointRate.get(node);
    if (maxRate === undefined) {
      maxRate = JOINT_RATE.get(node.name.split('-').pop() ?? '') ?? 20;
      this.jointRate.set(node, maxRate);
    }
    const q = node.rotationQuaternion!;
    const prev = this.prevRot.get(node);
    if (!prev) {
      this.prevRot.set(node, q.clone());
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
    const S = sh.getAbsolutePosition();
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
    if (gripW > 0 && this.heldWeapon) {
      const m = this.heldWeapon.getWorldMatrix();
      // the hand wraps the gun: the wrist sits behind / under the palm point (weapon space), so the arm
      // reaches only as far as a real one and the elbows bend
      if (isGrip) {
        tmpF.copyFrom(this.grip).addInPlaceFromFloats(WRIST_TRIGGER[0] * side, WRIST_TRIGGER[1], WRIST_TRIGGER[2]);
        Vector3.TransformCoordinatesToRef(tmpF, m, tmpB);
        Vector3.LerpToRef(target, tmpB, gripW, target);
      } else {
        // off hand: free target -> magazine well -> foregrip, by weight
        const onMag = Math.min(1, magW) * gripW;
        if (onMag > 0) {
          tmpF.copyFrom(this.magPoint).addInPlaceFromFloats(WRIST_SUPPORT[0] * side, WRIST_SUPPORT[1], WRIST_SUPPORT[2]);
          Vector3.TransformCoordinatesToRef(tmpF, m, tmpB);
          Vector3.LerpToRef(target, tmpB, onMag, target);
        }
        const onGrip = Math.min(1, offW) * gripW;
        if (onGrip > 0) {
          tmpF.copyFrom(this.foregrip).addInPlaceFromFloats(WRIST_SUPPORT[0] * side, WRIST_SUPPORT[1], WRIST_SUPPORT[2]);
          Vector3.TransformCoordinatesToRef(tmpF, m, tmpB);
          Vector3.LerpToRef(target, tmpB, onGrip, target);
        }
      }
    }
    if (wallW > 0 && this.wallHand && !isGrip) Vector3.LerpToRef(target, this.wallHand, wallW, target);
    // world grip (rung, pipe, lip): the wrist sits behind the palm along the reach from the shoulder
    const reach = side > 0 ? this.reachR : this.reachL;
    if (reach.w > 0) {
      tmpB.set(reach.x - S.x, reach.y - S.y, reach.z - S.z);
      const len = tmpB.length();
      const back = len > 1e-4 ? (p.hand.len * 0.45) / len : 0;
      tmpB.set(reach.x - tmpB.x * back, reach.y - tmpB.y * back, reach.z - tmpB.z * back);
      Vector3.LerpToRef(target, tmpB, Math.min(1, reach.w), target);
    }
    // elbows down/out/back; (step 10) the striking elbow (right) lifts out to the side, level, with the elbow arc
    const mw = side > 0 && this.input.melee >= 0 ? meleePoleW(this.input.melee) : 0;
    // (fix 21-1, A81) relaxed over a right-thigh holster the right elbow points further out, clear of the gun's grip
    // (fix 21-2) eased with the gear, and gone by a quarter of the reach to a world grip (zipline, ladder, ledge):
    // the elbow swings in under the grip before the body moves to the anchor (e2e-clip zipline)
    const holsterOut = side > 0 && this.holsterW > 0 ? HOLSTER_ELBOW_OUT * this.holsterW * Math.min(1, this.readyRf) * (1 - Math.min(1, reach.w * 4)) : 0;
    this.dirToWorld(side * (0.55 + 0.65 * mw + holsterOut), -1 + 0.9 * mw, -0.35 + 0.35 * mw, tmpPole);
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
      // fingers wrap the grip: hand -Y along weapon -Y, palm facing the weapon's side
      Quaternion.RotationYawPitchRollToRef(0, isGrip ? 0.25 : -1.2, isGrip ? 0 : -side * 0.4, tmpQ2);
      this.heldWeapon.absoluteRotationQuaternion.multiplyToRef(tmpQ2, tmpQ3);
      this.setWorldRot(wr, el, tmpQ3);
    } else {
      wr.rotationQuaternion!.copyFromFloats(0, 0, 0, 1);
    }
  }

  /** Leg IK onto a world ankle target; the foot takes its world yaw and the swing / pose pitch. */
  private solveLegWorld(hip: TransformNode, knee: TransformNode, ankle: TransformNode, x: number, y: number, z: number, footYaw: number, footPitch: number, side: number, out = KNEE_OUT): void {
    const p = this.p;
    fresh(hip);
    const H = hip.getAbsolutePosition();
    tmpA.set(x, y, z);
    // knees forward (along the foot) and slightly out
    const c = Math.cos(footYaw);
    const sn = Math.sin(footYaw);
    tmpPole.set(sn + side * out * c, 0, c - side * out * sn);
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

  /** Lift (or lower) the aim pocket so the weapon's sight line sits at the head centre (eye), by `w` 0..1. */
  private sightToEye(w: number): void {
    const g = this.gunSpan;
    const e = this.heldWeapon!.getWorldMatrix().m;
    const zc = (g.z0 + g.z1) * 0.5;
    const sightY = g.top * e[5]! + zc * e[9]! + e[13]!;
    const dy = (posIn(this.headNode, headPt).y + SIGHT_EYE - sightY) * w;
    if (Math.abs(dy) < 2e-4) return;
    // world up -> the pocket's parent (torso) space
    (this.weaponPivot.parent as TransformNode).getWorldMatrix().invertToRef(clrM);
    tmpE.set(0, dy, 0);
    Vector3.TransformNormalToRef(tmpE, clrM, tmpE);
    this.weaponPivot.position.addInPlace(tmpE);
    fresh(this.weaponPivot);
    freshBelow(this.heldWeapon!, this.weaponPivot);
  }

  /** Blend an FK pose (emotes) over the procedural result. */
  private applyFk(fk: FkPose, w: number): void {
    const map: Record<JointName, TransformNode> = {
      pelvis: this.hips,
      spine: this.spine,
      chest: this.torso,
      neck: this.neck,
      head: this.headNode,
      shoulderL: this.shoulderL,
      shoulderR: this.shoulderR,
      elbowL: this.elbowL,
      elbowR: this.elbowR,
      hipL: this.hipL,
      hipR: this.hipR,
      kneeL: this.kneeL,
      kneeR: this.kneeR,
    };
    for (const [k, e] of Object.entries(fk) as [JointName | 'pelvisLift', readonly [number, number, number] | number][]) {
      if (k === 'pelvisLift') {
        this.hips.position.y += (e as number) * w;
        continue;
      }
      const node = map[k];
      const [x, y, z] = e as readonly [number, number, number];
      Quaternion.RotationYawPitchRollToRef(y, x, z, tmpQ);
      Quaternion.SlerpToRef(node.rotationQuaternion!, tmpQ, w, node.rotationQuaternion!);
    }
    if (fk.shoulderL || fk.shoulderR) {
      // emote arms let go of the weapon: straighten the wrists
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
