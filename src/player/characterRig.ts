import { Color4, Quaternion, TransformNode, Vector3, type AbstractMesh, type InstancedMesh, type Scene } from '../core/babylon';
import type { PartShape } from '../world/partLibrary';
import type { AvatarLook } from '../cosmetics/avatarLook';
import { proportions, type Build, type Proportions } from './proportions';
import { AnimGraph, defaultInput, type AnimInput } from '../anim/animGraph';
import { solveTwoBone } from '../anim/rigMath';
import { DEBUG_RIGS } from '../ui/debugVolumes';

/** Creates a unit-sized part mesh (instanced from the shared PartLibrary). `slot` names the colour/pattern slot. */
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
  /** Roll progress 0..1 while rolling, else <0. */
  roll: number;
  /** Aim pitch in radians (up positive). */
  aimPitch: number;
  /** 0 relaxed .. 1 weapon raised. */
  aim: number;
  /** Momentary kick from firing 0..1. */
  kick: number;
  aimYaw?: number;
  sprint?: boolean;
  reload?: number;
  yawRate?: number;
  armed?: boolean;
  cover?: AnimInput['cover'];
  peek?: number;
  blind?: boolean;
  vault?: number;
  melee?: number;
}

export type JointName = 'pelvis' | 'spine' | 'chest' | 'neck' | 'head' | 'shoulderL' | 'shoulderR' | 'elbowL' | 'elbowR' | 'hipL' | 'hipR' | 'kneeL' | 'kneeR';
/** Forward-kinematics override (Euler x, y, z) per joint, used by emotes. */
export type FkPose = Partial<Record<JointName, readonly [number, number, number]>> & { pelvisLift?: number };

/** Build -> look body type (and enemies can override with their own build). */
const BUILD_OF: Record<AvatarLook['body'], Build> = { average: 'average', lean: 'lean', athletic: 'athletic', broad: 'broad' };

const tmpA = new Vector3();
const tmpB = new Vector3();
const tmpC = new Vector3();
const tmpD = new Vector3();
const tmpE = new Vector3();
const tmpPole = new Vector3();
const tmpQ = new Quaternion();
const tmpQ2 = new Quaternion();
const tmpQ3 = new Quaternion();
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

/**
 * The shared humanoid: one skeleton and one smooth part set for the player, enemies, coop
 * remotes, training dummies and the customiser preview. Feet at the origin, facing +Z.
 *
 * Joint hierarchy: root -> body (tumble pivot) -> pelvis -> spine -> chest -> neck -> head;
 * chest -> shoulder -> elbow -> wrist; pelvis -> hip -> knee -> ankle. Limbs hang along -Y in the
 * bind pose. Each frame `animate` runs the AnimGraph, then two-bone IK places arms (on the weapon's
 * grip and foregrip, or free swing targets) and legs (on the gait's planted foot targets).
 */
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
  /** Weapon node whose grips the hands follow (null = free arms). */
  heldWeapon: TransformNode | null = null;
  /** Extra emote overrides (set by the emote player). */
  emote: ((rig: CharacterRig, t: number) => FkPose | void) | null = null;
  emoteTime = 0;
  private emoteW = 0;
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
    opts: { build?: Build; armor?: boolean } = {},
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
    this.buildParts(make, look, p, opts.armor ?? false);
    DEBUG_RIGS.add(this);
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
    const longSleeves = look.torso === 'jacket' || look.torso === 'hoodie' || look.torso === 'armor';
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
    }
    if (look.torso === 'armor' || armor) {
      part('pill', c.accent, 'accent', this.torso, p.chest.w * 0.85, 0.32, 0.06, 0, 0.1, front - 0.005);
      part('pill', c.accent, 'accent', this.torso, p.chest.w * 0.85, 0.32, 0.06, 0, 0.1, -front + 0.005);
      part('dome', c.accent, 'accent', this.shoulderL, p.upperArm.r0 * 3.1, 0.09, p.upperArm.r0 * 3.1, -0.01, 0.0, 0, 0, 0, 0.35);
      part('dome', c.accent, 'accent', this.shoulderR, p.upperArm.r0 * 3.1, 0.09, p.upperArm.r0 * 3.1, 0.01, 0.0, 0, 0, 0, -0.35);
    }

    // neck + head
    const H = p.head;
    part('limbA', c.skin, 'skin', this.neck, p.neck.r * 2, p.neck.len + H.h * 0.35, p.neck.r * 2.1, 0, -0.04, -0.005, Math.PI - 0.1);
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
      part('sphere', c.skin, 'skin', wr, fa.r1 * 2.2, fa.r1 * 2.2, fa.r1 * 2.2);
      // mitten: palm faces inwards (towards the body), fingers down
      part('pill', c.skin, 'skin', wr, p.hand.t * 1.7, p.hand.len * 0.72, p.hand.w, 0, -p.hand.len * 0.4, 0.004);
      part('capsule', c.skin, 'skin', wr, 0.03, 0.075, 0.03, -side * 0.006, -p.hand.len * 0.25, p.hand.w * 0.48, 0.5, 0, 0);
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
      if (look.legs === 'armored' || armor) part('dome', c.accent, 'accent', kn, 0.11, 0.07, 0.12, 0, 0.0, th.r1 * 0.9, Math.PI / 2);
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

  // ------------------------------------------------------------------------------------------
  // Animation
  // ------------------------------------------------------------------------------------------

  /** Procedural animation. Call every render frame. */
  animate(dt: number, s: RigPose): void {
    const i = this.input;
    i.speed = s.speed;
    i.localX = s.localX;
    i.localZ = s.localZ;
    i.grounded = s.grounded;
    i.crouch = s.crouch;
    i.roll = s.roll;
    i.aimPitch = s.aimPitch;
    i.aim = s.aim;
    i.kick = s.kick;
    i.aimYaw = s.aimYaw ?? 0;
    i.sprint = s.sprint ?? false;
    i.reload = s.reload ?? -1;
    i.armed = s.armed ?? !!this.heldWeapon;
    i.cover = s.cover ?? 'none';
    i.peek = s.peek ?? 0;
    i.blind = s.blind ?? false;
    i.vault = s.vault ?? -1;
    i.melee = s.melee ?? -1;
    const yaw = this.root.rotation.y;
    if (s.yawRate !== undefined) i.yawRate = s.yawRate;
    else if (this.prevYaw !== null && dt > 0) {
      let d = yaw - this.prevYaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      i.yawRate = d / dt;
    }
    this.prevYaw = yaw;
    const t = this.graph.update(dt, i);
    this.applyTargets(t);
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
  }

  /** Hit reaction (additive spine twitch). */
  hit(strength: number, side = 0): void {
    this.graph.hit(strength, side);
  }

  private applyTargets(t: ReturnType<AnimGraph['update']>): void {
    const p = this.p;
    // body tumble (rolls) about the hips
    this.body.rotationQuaternion!.copyFrom(Quaternion.RotationAxisToRef(Vector3.RightReadOnly, t.tumble, tmpQ));
    const pe = t.pelvis;
    this.hips.position.set(pe.x, this.pelvisRest + pe.y, pe.z);
    Quaternion.RotationYawPitchRollToRef(pe.yaw, pe.pitch, pe.roll, this.hips.rotationQuaternion!);
    // the spine counters most of the pelvis tilt so the chest stays readable
    const sp = t.spine;
    Quaternion.RotationYawPitchRollToRef(sp.yaw * 0.4, sp.pitch * 0.45 - pe.pitch * 0.6, sp.roll * 0.5 - pe.roll * 0.7, this.spine.rotationQuaternion!);
    Quaternion.RotationYawPitchRollToRef(sp.yaw * 0.6, sp.pitch * 0.55, sp.roll * 0.5, this.torso.rotationQuaternion!);
    Quaternion.RotationYawPitchRollToRef(t.head.yaw * 0.4, t.head.pitch * 0.4, 0, this.neck.rotationQuaternion!);
    Quaternion.RotationYawPitchRollToRef(t.head.yaw * 0.6, t.head.pitch * 0.6, 0, this.headNode.rotationQuaternion!);

    // aim pocket: rest + layer offsets; orientation = body yaw, aim pitch (world), layer rotation
    const chestY = p.y.waist + 0.13 * (p.height / 1.75);
    const w = t.weapon;
    this.weaponPivot.position.set(p.shoulderHalf * 0.55 + w.x, p.y.shoulder - chestY - 0.1 + w.y, 0.3 + w.z);
    this.torso.computeWorldMatrix(true);
    const aimYaw = this.root.rotation.y + this.input.aimYaw;
    Quaternion.RotationYawPitchRollToRef(aimYaw + w.yaw, -this.input.aimPitch + w.pitch, w.roll, tmpQ);
    // when tumbling the gun goes with the body
    if (Math.abs(t.tumble) > 1e-3) tmpQ.multiplyToRef(this.body.rotationQuaternion!, tmpQ);
    this.setWorldRot(this.weaponPivot, this.torso, tmpQ);

    // arms
    const gripW = this.heldWeapon ? t.grip : 0;
    this.solveArm(1, gripW, 1, t.handR);
    this.solveArm(-1, gripW, t.offGrip, t.handL);
    // legs
    this.solveLeg(this.hipL, this.kneeL, this.ankleL, t.footL, t.footPitchL, -1);
    this.solveLeg(this.hipR, this.kneeR, this.ankleR, t.footR, t.footPitchR, 1);
  }

  /** Set a node's world rotation through its parent. */
  private setWorldRot(node: TransformNode, parent: TransformNode, world: Quaternion): void {
    parent.computeWorldMatrix(true);
    const inv = Quaternion.InverseToRef(parent.absoluteRotationQuaternion, tmpQ2);
    inv.multiplyToRef(world, node.rotationQuaternion!);
  }

  /** Root/body-space point -> world. */
  private bodyToWorld(v: { x: number; y: number; z: number }, out: Vector3): Vector3 {
    this.body.computeWorldMatrix(true);
    tmpE.set(v.x, v.y - this.bodyPivot, v.z);
    return Vector3.TransformCoordinatesToRef(tmpE, this.body.getWorldMatrix(), out);
  }

  private dirToWorld(x: number, y: number, z: number, out: Vector3): Vector3 {
    tmpE.set(x, y, z);
    return Vector3.TransformNormalToRef(tmpE, this.body.getWorldMatrix(), out).normalize();
  }

  private solveArm(side: 1 | -1, gripW: number, offW: number, free: { x: number; y: number; z: number }): void {
    const sh = side > 0 ? this.shoulderR : this.shoulderL;
    const el = side > 0 ? this.elbowR : this.elbowL;
    const wr = side > 0 ? this.wristR : this.wristL;
    const p = this.p;
    sh.computeWorldMatrix(true);
    const S = sh.getAbsolutePosition();
    // free-swing target, then the weapon grip blended over it
    const target = this.bodyToWorld(free, tmpA);
    if (gripW > 0 && this.heldWeapon) {
      this.heldWeapon.computeWorldMatrix(true);
      const local = side > 0 ? this.grip : offW >= 1 ? this.foregrip : Vector3.LerpToRef(this.magPoint, this.foregrip, offW, tmpE);
      Vector3.TransformCoordinatesToRef(local, this.heldWeapon.getWorldMatrix(), tmpB);
      // the wrist sits a little behind the palm point
      Vector3.LerpToRef(target, tmpB, gripW, target);
      target.y += 0.035 * gripW;
    }
    // elbows down/out/back
    this.dirToWorld(side * 0.55, -1, -0.35, tmpPole);
    solveTwoBone(S, target, p.upperArm.len, p.forearm.len, tmpPole, tmpC, tmpD);
    // upper arm
    tmpC.subtractToRef(S, tmpA);
    this.dirToWorld(0, 0, 1, tmpE);
    boneRotation(tmpA, tmpE, tmpQ3);
    this.setWorldRot(sh, sh.parent as TransformNode, tmpQ3);
    // forearm
    tmpD.subtractToRef(tmpC, tmpA);
    boneRotation(tmpA, tmpE, tmpQ);
    sh.computeWorldMatrix(true);
    this.setWorldRot(el, sh, tmpQ);
    // hand: follow the weapon when gripping, else continue the forearm
    if (gripW > 0.5 && this.heldWeapon) {
      // fingers wrap the grip: hand -Y along weapon -Y, palm facing the weapon's side
      this.heldWeapon.computeWorldMatrix(true);
      Quaternion.RotationYawPitchRollToRef(0, side > 0 ? 0.25 : -1.2, side > 0 ? 0 : -side * 0.4, tmpQ2);
      this.heldWeapon.absoluteRotationQuaternion.multiplyToRef(tmpQ2, tmpQ3);
      el.computeWorldMatrix(true);
      this.setWorldRot(wr, el, tmpQ3);
    } else {
      wr.rotationQuaternion!.copyFromFloats(0, 0, 0, 1);
    }
  }

  private solveLeg(hip: TransformNode, knee: TransformNode, ankle: TransformNode, foot: { x: number; y: number; z: number }, footPitch: number, side: number): void {
    const p = this.p;
    hip.computeWorldMatrix(true);
    const H = hip.getAbsolutePosition();
    const target = this.bodyToWorld(foot, tmpA);
    // knees forward and slightly out
    this.dirToWorld(side * 0.12, 0, 1, tmpPole);
    solveTwoBone(H, target, p.thigh.len, p.calf.len, tmpPole, tmpC, tmpD);
    tmpC.subtractToRef(H, tmpB);
    boneRotation(tmpB, tmpPole, tmpQ3);
    this.setWorldRot(hip, hip.parent as TransformNode, tmpQ3);
    tmpD.subtractToRef(tmpC, tmpB);
    boneRotation(tmpB, tmpPole, tmpQ);
    hip.computeWorldMatrix(true);
    this.setWorldRot(knee, hip, tmpQ);
    // feet stay level with the body (toe-off pitch while swinging)
    this.body.computeWorldMatrix(true);
    Quaternion.RotationYawPitchRollToRef(0, footPitch, 0, tmpQ2);
    this.body.absoluteRotationQuaternion.multiplyToRef(tmpQ2, tmpQ3);
    knee.computeWorldMatrix(true);
    this.setWorldRot(ankle, knee, tmpQ3);
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
    const parts = this.parts as InstancedMesh[];
    if (!this.baseColors) this.baseColors = parts.map((m) => (m.instancedBuffers?.color as Color4 | undefined)?.clone() ?? new Color4(1, 1, 1, 1));
    parts.forEach((m, i) => {
      if (!m.instancedBuffers) return;
      const b = this.baseColors![i]!;
      m.instancedBuffers.color = new Color4(b.r + (1 - b.r) * k, b.g + (0.92 - b.g) * k, b.b + (0.85 - b.b) * k, 1);
    });
  }

  dispose(): void {
    DEBUG_RIGS.delete(this);
    for (const m of this.parts) m.dispose();
    this.root.dispose();
  }
}
