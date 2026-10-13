/**
 * Layered, clip-based animation graph (pure: no Babylon). Evaluated every render frame.
 *
 * Lower body: a 2D blend space (speed x direction) over keyed locomotion cycles, standing and
 * crouched, all sampled at the gait clock so blends never fight the feet; a timed kneel pose; start
 * weight shift, stop settle and pivot clips driven by the motion driver's state; back-to-wall, traversal,
 * slide and air poses. Switches between these are inertialized (the jump decays through a critically
 * damped curve per joint group), never cut or linearly faded.
 * Upper body: weapon ready positions blended to the raised aim pose; reload (tactical / empty), swap and
 * grenade clips; head-first peek and lean sequencing; recoil absorbed through the spine; spine/head
 * look-at; breathing after 2 s still; hit flinch; acceleration lean.
 * Balance: a pelvis spring compressed on every heel strike and shifted over the support foot.
 * Feet are placed by the rig's world-space FootPlanner from the stance and gait values output here.
 */
import type { Proportions } from '../player/proportions';
import { overClip, addClip, type Clip } from './clip';
import { CH, Inertializer, lerpPose, newPose, type Pose } from './pose';
import { stepLength, type MotionState } from './motion';
import { MOVEMENT } from '../config/movement';
import { approach, clamp, smoothstep, Spring, type V3 } from './rigMath';
import {
  CROUCH_BACK,
  CROUCH_IDLE,
  CROUCH_STRAFE_L,
  CROUCH_STRAFE_R,
  CROUCH_NODES,
  FORWARD_NODES,
  IDLE,
  KNEEL,
  WALK_BACK,
  WALK_STRAFE_L,
  WALK_STRAFE_R,
} from './clips/locomotion';
import { DROP, GRENADE, LAND, MANTLE, PIVOT, RELOAD_EMPTY, RELOAD_TACTICAL, SLIDE, START_SHIFT, STEP_UP, STOP_SETTLE, swapClipFor, VAULT, type SwapReach } from './clips/actions';
import { CLIMB, CLIMB_UP, CRAWL, HANG, BRACE, PIPE_INVERTED, PIPE_LEGS_UP, RAPPEL_HANG, ROLL, rollTumble, SPLIT_BRACE, VENT_DROP, WALL_KICK, WINDOW_VAULT } from './clips/traverse';
import { hyp2 } from '../core/mathx';


export const FADE = 0.2;
export const LOWER_STATES = ['locomotion', 'crouch', 'kneel', 'air', 'slide', 'wall', 'traverse'] as const;
export type LowerState = (typeof LOWER_STATES)[number];
/** Committed moves (vault .. hop) and the attached pose family (hang, climb, crawl: keyed over the climb
 *  cadence, `traverseT`). */
export type TraverseKind = 'none' | 'vault' | 'mantle' | 'step' | 'drop' | 'hop' | 'roll' | 'hang' | 'climb' | 'crawl' | 'climbUp' | 'ventDrop' | 'windowVault' | 'split' | 'wallKick' | 'pipeLegs' | 'pipeInv' | 'rappel' | 'brace';

export interface AnimInput {
  /** Horizontal ground speed (m/s) and local movement direction (x right, z forward). */
  speed: number;
  localX: number;
  localZ: number;
  grounded: boolean;
  /** 0 standing .. 1 crouched (eased by the controller). */
  crouch: number;
  /** Crouched and still: one-knee kneel. */
  kneel: boolean;
  /** Aim pitch (up +) and aim yaw relative to the body (radians). */
  aimPitch: number;
  aimYaw: number;
  /** 0 at the ready position .. 1 shouldered on the aim line. */
  raise: number;
  /** Ready-position weights (sum 1). */
  carryLow: number;
  carryHigh: number;
  carryComp: number;
  /** Weapon mass factor (1 = rifle). Heavier = more inertia and sway. */
  weight: number;
  /** Momentary recoil 0..1. */
  kick: number;
  /** Reload progress 0..1, or < 0; empty = the longer reload with the charging handle. */
  reload: number;
  reloadEmpty: boolean;
  /** Weapon swap progress 0..1, or < 0. */
  swap: number;
  /** Carry slot kinds the swap holsters to / draws from. */
  swapFrom: SwapReach;
  swapTo: SwapReach;
  /** Grenade throw progress 0..1, or < 0. */
  grenade: number;
  /** Body yaw rate (rad/s). */
  yawRate: number;
  /** Holding a weapon (two-hand grip). */
  armed: boolean;
  /**
   * (step 09, A42) Weapons carried slung / holstered with the hands empty, on foot: the arms take the ready-hands
   * stand-in and the body keeps the armed carriage (holstering never changes pelvis or head motion, D2).
   */
  ready: boolean;
  /** Dash blend 0..1. */
  dash: number;
  /** Dash-in slide progress 0..1, or < 0. */
  slide: number;
  /** Landing recovery 0..1. */
  landing: number;
  /** Back to a wall (the flat-back high stance; back-to-wall, step 11 / A6). */
  wall: boolean;
  /** Which side the wall is on, in the character's frame (-1 left, 1 right, 0 none). */
  wallSide: number;
  /** Lean around an edge: -1 left .. 1 right (hips planted). */
  lean: number;
  traverse: TraverseKind;
  /** Traversal progress 0..1. */
  traverseT: number;
  /** Melee swing 0..1, or < 0. */
  melee: number;
  /** (3.2.0) Whole-body tumble about the hips (rad) set by the caller (pipe legs up / inverted). */
  tumble: number;
  /** Doorway check sweep 0..1, or < 0. */
  check: number;
  /** Gait clock from the motion driver (0..1), or < 0 to integrate from speed. */
  phase: number;
  /** Motion driver state and time in it ('' when there is no driver: enemies, remotes). */
  motion: MotionState | '';
  motionT: number;
  /** Chaos Theory instant stop (3.2.0): the locomotion blends out to idle over this many seconds (0 = the usual). */
  quickStop: number;
  /**
   * Chaos Theory stop hold (3.2.0, m/s; 0 = none): stopped, the body holds the stride it stopped in - the locomotion
   * pose at the frozen gait clock for this pace - until the next input (move, aim, stance, wall, traversal).
   */
  holdSpeed: number;
  /** Root acceleration in the body frame (m/s^2): forward, right. */
  accelFwd: number;
  accelSide: number;
  /** Render-rate stick intent along the body (-1..1, wanted minus current pace): the lean-in shows on the
   *  very next frame, before the fixed-rate root motion catches up. */
  intent: number;
  /** Weapon changing hands 0..1, or < 0 (set by the rig). */
  handSwap: number;
  /** Which hand holds the weapon: 1 right .. -1 left (the rig mirrors weapon x / yaw / roll by it). */
  hand: number;
}

/** (locomotion step 10) The elbow arc's hand overlay weight at melee phase `ph` 0..1 (in by 0.17, out from 0.62). */
export function meleeHandW(ph: number): number {
  return smoothstep(ph / 0.167) * (1 - smoothstep((ph - 0.62) / 0.38));
}

/** (step 10) The elbow arc's sweep 0 (wind-up, hand out to the side) .. 1 (contact, across the front). */
export function meleeSweep(ph: number): number {
  return smoothstep((ph - 0.1) / 0.456) * (1 - 0.5 * smoothstep((ph - 0.62) / 0.38));
}

/** (step 10) How far the striking elbow's IK pole lifts (out to the side, level): the graph's hand sweep and the
 *  rig's pole share it, so local and remote rigs (both from `melee`) pose alike. */
export function meleePoleW(ph: number): number {
  return meleeSweep(ph) * meleeHandW(ph);
}

export function defaultInput(): AnimInput {
  return {
    speed: 0,
    localX: 0,
    localZ: 0,
    grounded: true,
    crouch: 0,
    kneel: false,
    aimPitch: 0,
    aimYaw: 0,
    raise: 0,
    carryLow: 1,
    carryHigh: 0,
    carryComp: 0,
    weight: 1,
    kick: 0,
    reload: -1,
    reloadEmpty: false,
    swap: -1,
    swapFrom: 'backC',
    swapTo: 'backC',
    grenade: -1,
    yawRate: 0,
    armed: true,
    ready: false,
    dash: 0,
    slide: -1,
    landing: 0,
    wall: false,
    wallSide: 0,
    lean: 0,
    traverse: 'none',
    traverseT: 0,
    melee: -1,
    tumble: 0,
    check: -1,
    phase: -1,
    motion: '',
    motionT: 0,
    quickStop: 0,
    holdSpeed: 0,
    accelFwd: 0,
    accelSide: 0,
    intent: 0,
    handSwap: -1,
    hand: 1,
  };
}

/**
 * Lateral foot offset for a sidestep: the lead foot steps out and the trail foot closes in, so the
 * feet never cross (kept as a utility; the planner enforces the same rule in world space).
 */
export function lateralOffset(dx: number, along: number, stride: number, side: -1 | 1): number {
  return dx * along + side * Math.abs(dx) * stride * 0.5;
}

export interface RigTargets {
  /** Pelvis offset from its rest position and rotation (radians). */
  pelvis: { x: number; y: number; z: number; pitch: number; roll: number; yaw: number };
  /** Spine + chest rotation (split between both). */
  spine: { pitch: number; yaw: number; roll: number };
  head: { pitch: number; yaw: number; roll: number };
  /** Weapon pose relative to the aim pocket: offsets (m) and rotation (rad). */
  weapon: { x: number; y: number; z: number; pitch: number; yaw: number; roll: number };
  /** 1 = both hands on the weapon (IK), 0 = free arms (targets below). */
  grip: number;
  /** Off hand: weights on the foregrip, the magazine well, the wall (rest = free target). */
  offGrip: number;
  offMag: number;
  offWall: number;
  handL: V3;
  handR: V3;
  /** Ideal stance per foot (root space, m) and heel raise / pitch offsets. */
  stance: { lX: number; lZ: number; rX: number; rZ: number; lY: number; rY: number; lPitch: number; rPitch: number };
  /** Gait values for the foot planner. */
  gait: { phase: number; duty: number; liftH: number; cycleTime: number; moving: boolean };
  /** Whole-body tumble about the hips (rad, forward): the landing roll. */
  tumble: number;
  /** Layer weights for the debug overlay. */
  layers: Record<string, number>;
  /** Vertical weapon bob left after stabilisation (m), for tests and the debug trace. */
  weaponBob: number;
  /** Cheek weld 0..1 (raised to aim): the neck bends the head down onto the stock, eyes stay on the aim. */
  weld: number;
  /** How far the weapon is raised onto the aim line 0..1 (lowered it follows the body, raised the aim). */
  aimW: number;
}

export function emptyTargets(): RigTargets {
  return {
    pelvis: { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 },
    spine: { pitch: 0, yaw: 0, roll: 0 },
    head: { pitch: 0, yaw: 0, roll: 0 },
    weapon: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
    grip: 1,
    offGrip: 1,
    offMag: 0,
    offWall: 0,
    handL: { x: 0, y: 0, z: 0 },
    handR: { x: 0, y: 0, z: 0 },
    stance: { lX: -0.11, lZ: 0.04, rX: 0.11, rZ: -0.02, lY: 0, rY: 0, lPitch: 0, rPitch: 0 },
    gait: { phase: 0, duty: 0.63, liftH: 0.065, cycleTime: 1.1, moving: false },
    tumble: 0,
    layers: {},
    weaponBob: 0,
    weld: 0,
    aimW: 0,
  };
}

/** Choose the lower-body state (priority order). */
export function pickLower(i: AnimInput): LowerState {
  if (i.traverse !== 'none') return 'traverse';
  if (i.slide >= 0) return 'slide';
  if (!i.grounded) return 'air';
  if (i.wall) return 'wall';
  if (i.crouch > 0.5) return i.kneel ? 'kneel' : 'crouch';
  return 'locomotion';
}

/** Ready-position weapon poses (offsets from the aim pocket; pitch + = muzzle down). */
/**
 * Raised to aim, the weapon comes up to the eye (cheek weld): this offset from the rest aim pocket puts
 * the sight line level with the eye, beside the head (stock high in the shoulder, elbows up); the head dips onto the stock
 * (`SIGHT_HEAD` pitch, roll toward the gun). Scaled by the aim raise.
 */
export const SIGHT_RAISE = { x: 0.08, y: 0.215, z: 0.02 };
export const SIGHT_HEAD = { roll: 0.15 };

/** Heel strike pelvis kick (spring velocity, m/s): how hard each footfall lands. */
export const HEEL_KICK = 0.45;
/**
 * Tactical carriage with a weapon: the chest well forward over the hips, hips back, knees bent, head up (eyes
 * level) - never upright like a mannequin. More bent over moving along a wall and crouched (`crouch`: over the
 * knees); a little more leaning into a raised weapon.
 */
export const HUNCH = { spine: 0.5, pelvis: 0.1, head: 0.34, drop: 0.07, wall: 0.2, wallDrop: 0.06, aim: 0.05, crouch: 0.34 };

/**
 * (step 09, A42) Ready hands while holstered on foot (a stand-in until the step 21 trained posture): elbows soft and
 * bent (about 60-90 deg), hands in front at the belt line, a little inside the shoulders and clear of the slung long
 * gun and the hip holster. The hands are placed from the chest: `torso` (m) is the spine-to-shoulder length used to
 * follow the hunch / lean forward, and the pelvis offsets carry them too, so a lean or a start lunge never folds the arms; `x` in from the shoulder half-width, `y` below
 * and `z` ahead of the leaned shoulder; `swing` the small fore-aft hand motion with the gait; `lag` (s) how far the
 * hands ease behind the shoulders' follow.
 */
export const READY_HANDS = { torso: 0.45, x: -0.06, y: 0.4, z: -0.02, swing: 0.012, lag: 0.035 };

export const READY_POSES = {
  // stock in the shoulder pocket, muzzle ~45 deg down and angled across the body, elbows bent and in
  low: { x: 0, y: -0.08, z: -0.02, pitch: 0.8, yaw: -0.6, roll: 0.2 },
  high: { x: -0.03, y: 0.07, z: -0.12, pitch: -1.0, yaw: -0.08, roll: 0 },
  // pulled in tight to the chest, muzzle forward and down (never swung across into a wall beside you)
  compressed: { x: -0.06, y: -0.08, z: -0.12, pitch: 0.6, yaw: -0.12, roll: 0.1 },
} as const;
/**
 * Back to a wall: tucked against the chest on the open side, muzzle down along the wall and angled away from it
 * (`yaw` is turned away from the wall side), so it never pokes into the wall; raised from here to aim.
 */
export const WALL_READY = { x: 0.06, y: -0.24, z: 0.1, pitch: 1.05, yaw: 0.28, roll: 0 };
/**
 * The flat-back high stance (A6): the settled end of the old cover entry - hips over towards the wall, the spine
 * and head rolled into it (side-signed by the wall side), a little lower and bent (unsigned).
 */
export const WALL_STANCE = { pelX: 0.05, spRoll: 0.09, pelRoll: 0.06, hdRoll: 0.05, pelY: -0.03, pelPitch: 0.05, spPitch: 0.03 };
/** (step 09) Fade rate (1/s) of the swap overlay: in as a swap / draw / holster starts, out when it stops mid-clip. */
const SWAP_FADE = 8;
/** (step 09) Carriage ease (s) during a weapon-to-weapon swap: out before the reach to the slot (~0.2 s in). */
const CARRY_SWAP_TAU = 0.08;
/** (step 09) Grip weight rate (1/s): the hands take / leave the grip and the foregrip in at least 0.2 s. */
const GRIP_RATE = 5;
/** Seconds the support hand takes to settle onto the wall. */
const WALL_HAND_TIME = 0.42;

const TRAVERSE_CLIP: Record<Exclude<TraverseKind, 'none'>, Clip> = { vault: VAULT, mantle: MANTLE, step: STEP_UP, drop: DROP, hop: VAULT, roll: ROLL, hang: HANG, climb: CLIMB, crawl: CRAWL, climbUp: CLIMB_UP, ventDrop: VENT_DROP, windowVault: WINDOW_VAULT, split: SPLIT_BRACE, wallKick: WALL_KICK, pipeLegs: PIPE_LEGS_UP, pipeInv: PIPE_INVERTED, rappel: RAPPEL_HANG, brace: BRACE };

/** Active-clip slots for the debug overlay timeline. */
export interface ClipSlot {
  name: string;
  w: number;
  t: number;
}

const SLOTS = 10;

export class AnimGraph {
  readonly weights: Record<LowerState, number> = { locomotion: 1, crouch: 0, kneel: 0, air: 0, slide: 0, wall: 0, traverse: 0 };
  state: LowerState = 'locomotion';
  /** Gait clock in use (driver's, or integrated from speed). */
  phase = 0;
  readonly out = emptyTargets();
  /** Final pose (after inertialization) and the pre-inertialization source. */
  readonly pose: Pose = newPose();
  private src: Pose = newPose();
  private stand: Pose = newPose();
  private crouch: Pose = newPose();
  readonly inert = new Inertializer();
  /** Debug timeline: active clips (name, weight, time). */
  readonly slots: ClipSlot[] = Array.from({ length: SLOTS }, () => ({ name: '', w: 0, t: 0 }));
  private nSlots = 0;
  // timers and smoothed parameters
  private idleT = Math.random() * 4;
  private stillT = 0;
  /** Pace the locomotion blend uses this frame (the speed, or the held stop's pace). */
  private locoSpeed = 0;
  private kneelW = 0;
  private startT = -1;
  private settleT = -1;
  private landT = -1;
  private wallT = 0;
  private prevMotion: MotionState | '' = '';
  private prevAction = '';
  private raiseS = 0;
  private dashS = 0;
  private reloadW = 0;
  /** Tucked in against the wall while reloading / swapping / throwing. */
  tuckW = 0;
  /** Back-to-wall ready weight (eased ~0.25 s). */
  private wallReadyW = 0;

  /** How far the body / weapon is leaned out (signed, follows the lean target). */
  get leanOut(): number {
    return this.leanBody.x;
  }
  private leanHead = new Spring();
  private leanBody = new Spring();
  private wallS = 0;
  private dirX = 0;
  private dirZ = 1;
  private moveW = 0;
  private accelLean = new Spring();
  private intentLean = 0;
  private accelRoll = new Spring();
  private pelSpring = new Spring();
  private supportX = new Spring();
  private hit = new Spring();
  private hitSide = 0;
  private recoil = new Spring();
  private yawLag = new Spring();
  private support = 0;
  private pelBase = new Spring(-0.04);
  /** Support hand foregrip weight (eased: a draw / holster enters and leaves the swap clip mid-clip). */
  private offGripS = 1;
  /** Two-hand grip weight, eased on a draw / holster and a mid-clip swap entry. */
  private gripS = 1;
  /** Swap overlay weight and its last clip time (fades out when a holster stops it mid-clip). */
  private swapW = 0;
  private swapLastT = 0;
  /** Armed carriage weight (armed, or holstered with ready hands), eased ~0.25 s. */
  private carryW = 1;
  /** Ready-hands weight (A42), eased ~0.25 s. */
  private readyW = 0;
  /** Grenade hands weight (eased), for the ready-hands follow (the melee arc keeps the follow: step 10). */
  private handClipW = 0;
  /** Ready-hands follow of the chest and pelvis (m, root space), eased by READY_HANDS.lag. */
  private readyFy = 0;
  private readyFz = 0;
  private bobResidual = 0;

  constructor(private p: Proportions) {}

  setProportions(p: Proportions): void {
    this.p = p;
  }

  /** Additive hit reaction / flinch (side: -1 from the left .. 1 from the right). */
  hitReact(strength: number, side = 0): void {
    this.hit.kick(4.5 * clamp(strength, 0, 1));
    this.hitSide = side;
  }

  /** Heel strike from the foot planner: the pelvis compresses (2-4 cm, heavier with more mass): weight lands. */
  heelStrike(mass = 1): void {
    this.pelSpring.kick(-HEEL_KICK * clamp(mass, 0.6, 1.6));
  }

  /** Support side from the planner (-1 left foot only, 1 right only, 0 both / none). */
  setSupport(side: number): void {
    this.support = side;
  }

  private slot(name: string, w: number, t: number): void {
    if (w <= 0.001 || this.nSlots >= SLOTS) return;
    const s = this.slots[this.nSlots++]!;
    s.name = name;
    s.w = w;
    s.t = t;
  }

  /** Cross-fade bookkeeping for the debug overlay (the pose itself is inertialized). */
  fade(target: LowerState, dt: number, fade = FADE): void {
    this.state = target;
    const step = fade > 0 ? dt / fade : 1;
    let sum = 0;
    const W = this.weights;
    for (let k = 0; k < LOWER_STATES.length; k++) {
      const s = LOWER_STATES[k]!;
      const w = W[s];
      const nw = s === target ? (w + step > 1 ? 1 : w + step) : w - step < 0 ? 0 : w - step;
      W[s] = nw;
      sum += nw;
    }
    const inv = 1 / (sum || 1);
    for (let k = 0; k < LOWER_STATES.length; k++) W[LOWER_STATES[k]!] *= inv;
  }

  /** Locomotion blend space (speed x direction) for one posture into `out`. */
  private locomotion(out: Pose, crouched: boolean, ph: number): void {
    out.set(NEUTRAL_POSE);
    // idle: a static ready stance; breathing and weight shifts after 2 s still
    const idle = crouched ? CROUCH_IDLE : IDLE;
    overClip(out, idle, 0, 1);
    overClip(out, idle, this.idleT, smoothstep((this.stillT - 2) / 1.5));
    if (this.moveW <= 0) return;
    // direction weights from the smoothed local move direction
    const fw = Math.max(0, this.dirZ);
    const bw = Math.max(0, -this.dirZ);
    const sw = Math.abs(this.dirX);
    const tot = fw + bw + sw || 1;
    const s = Math.max(0, this.locoSpeed);
    this.moveAcc = 0;
    this.tmpMove.set(out);
    // forward: between the neighbouring speed nodes of the posture's set
    const nodes = crouched ? CROUCH_NODES : FORWARD_NODES;
    const a = fwdNode(nodes, s);
    const na = nodes[a]!;
    const nb = nodes[a + 1]!;
    const k = clamp((s - na.speed) / (nb.speed - na.speed), 0, 1);
    this.addMove(na.clip, (fw / tot) * (1 - k), ph);
    this.addMove(nb.clip, (fw / tot) * k, ph);
    // backwards and sideways only happen while aiming (strafe-locked)
    if (crouched) {
      this.addMove(CROUCH_BACK, bw / tot, ph);
      this.addMove(this.dirX > 0 ? CROUCH_STRAFE_R : CROUCH_STRAFE_L, sw / tot, ph);
    } else {
      this.addMove(WALK_BACK, bw / tot, ph);
      this.addMove(this.dirX > 0 ? WALK_STRAFE_R : WALK_STRAFE_L, sw / tot, ph);
    }
    lerpPose(out, out, this.tmpMove, this.moveW);
  }

  private tmpMove: Pose = newPose();
  private moveAcc = 0;

  /** Sequential weighted blend into tmpMove (exact weighted average of the added clips). */
  private addMove(c: Clip, w: number, ph: number): void {
    if (w <= 0) return;
    this.moveAcc += w;
    overClip(this.tmpMove, c, ph, w / this.moveAcc);
  }

  update(dt: number, i: AnimInput): RigTargets {
    const p = this.p;
    const o = this.out;
    const k = p.height / 1.75;
    const mass = clamp(i.weight, 0.5, 1.6);
    this.nSlots = 0;
    let trigger = false;

    // --- lower state (inertialized on change)
    const target = pickLower(i);
    if (target !== this.state) trigger = true;
    this.fade(target, dt, target === 'slide' || target === 'traverse' ? 0.12 : target === 'kneel' ? 0.35 : FADE);

    // --- clocks and smoothed parameters
    const still = i.speed < 0.05;
    this.stillT = still ? this.stillT + dt : 0;
    this.idleT += dt;
    if (i.phase >= 0) this.phase = i.phase;
    else if (i.speed > 0.02 && i.grounded) this.phase = (this.phase + (i.speed / (2 * stepLength(i.speed, undefined, lateralShare(i)))) * dt) % 1;
    const ph = this.phase;
    // (a Chaos Theory stop blends the frozen stride out to idle over `quickStop`: 95% within it)
    // (holding a Chaos Theory stop: the stride it stopped in stays, at the pace it stopped from)
    const locoSpeed = i.holdSpeed > 0 ? i.holdSpeed : i.speed;
    this.locoSpeed = locoSpeed;
    const moveTarget = smoothstep(locoSpeed / 0.22);
    this.moveW = approach(this.moveW, moveTarget, i.quickStop > 0 && moveTarget < this.moveW ? i.quickStop / 3 : 0.08, dt);
    const dl = hyp2(i.localX, i.localZ);
    if (dl > 0.1 && i.speed > 0.05) {
      this.dirX = approach(this.dirX, i.localX / dl, 0.18, dt);
      this.dirZ = approach(this.dirZ, i.localZ / dl, 0.18, dt);
    }
    const dn = hyp2(this.dirX, this.dirZ) || 1;
    this.dirX /= dn;
    this.dirZ /= dn;
    this.raiseS = approach(this.raiseS, i.raise, 0.02, dt);
    this.dashS = approach(this.dashS, i.dash, 0.15, dt);
    this.wallS = approach(this.wallS, i.wallSide, 0.2, dt);
    const atWall = i.wall;
    this.wallT = atWall ? this.wallT + dt : 0;

    // --- locomotion blend space, standing and crouched, then the posture blend
    const crouchK = clamp(i.crouch, 0, 1);
    const src = this.src;
    if (crouchK < 0.999) this.locomotion(this.stand, false, ph);
    if (crouchK > 0.001) this.locomotion(this.crouch, true, ph);
    if (crouchK <= 0.001) src.set(this.stand);
    else if (crouchK >= 0.999) src.set(this.crouch);
    else lerpPose(src, this.stand, this.crouch, crouchK);
    this.slot(crouchK > 0.5 ? 'crouch loco' : 'loco', 1, ph);

    // --- kneel: one knee down when crouched and still (eased over kneelTime)
    const wantKneel = i.kneel && crouchK > 0.5;
    const kStep = dt / (wantKneel ? MOVEMENT.kneelTime : MOVEMENT.standTime);
    this.kneelW = clamp(this.kneelW + (wantKneel ? kStep : -kStep), 0, 1);
    const kw = smoothstep(this.kneelW);
    overClip(src, KNEEL, this.idleT, kw);
    this.slot('kneel', kw, this.idleT);

    // --- start / stop / pivot clips from the motion driver
    if (i.motion === 'start' && this.prevMotion !== 'start') this.startT = 0;
    if (i.motion !== this.prevMotion && (i.motion === 'idle' || i.motion === 'turn') && (this.prevMotion === 'stop' || this.prevMotion === 'pivot')) this.settleT = 0;
    if (i.motion === 'pivot' && this.prevMotion !== 'pivot') trigger = true;
    this.prevMotion = i.motion;
    if (this.startT >= 0) {
      addClip(src, START_SHIFT, this.startT, 1 - crouchK * 0.5);
      this.slot('start', 1, this.startT);
      this.startT += dt;
      if (this.startT > START_SHIFT.duration) this.startT = -1;
    }
    if (this.settleT >= 0) {
      addClip(src, STOP_SETTLE, this.settleT, 1);
      this.slot('settle', 1, this.settleT);
      this.settleT += dt;
      if (this.settleT > STOP_SETTLE.duration) this.settleT = -1;
    }
    if (i.motion === 'pivot') {
      const t = clamp(i.motionT / MOVEMENT.pivotTime, 0, 1);
      addClip(src, PIVOT, t, 1);
      this.slot('pivot', 1, t);
    }

    // --- back to a wall: the flat-back high stance (A6), shoulder to the wall
    if (atWall) {
      const ws = this.wallS || 1;
      const st = WALL_STANCE;
      src[CH.pelX] = src[CH.pelX]! + st.pelX * ws;
      src[CH.spRoll] = src[CH.spRoll]! + st.spRoll * ws;
      src[CH.pelRoll] = src[CH.pelRoll]! + st.pelRoll * ws;
      src[CH.hdRoll] = src[CH.hdRoll]! + st.hdRoll * ws;
      src[CH.pelY] = src[CH.pelY]! + st.pelY;
      src[CH.pelPitch] = src[CH.pelPitch]! + st.pelPitch;
      src[CH.spPitch] = src[CH.spPitch]! + st.spPitch;
      // reloading, swapping or throwing at the wall: tuck in closer to it, a little lower
      this.tuckW = approach(this.tuckW, i.reload >= 0 || i.swap >= 0 || i.grenade >= 0 ? 1 : 0, 0.12, dt);
      src[CH.pelX] = src[CH.pelX]! + this.wallS * 0.035 * this.tuckW;
      src[CH.pelY] = src[CH.pelY]! - 0.03 * this.tuckW;
      src[CH.spPitch] = src[CH.spPitch]! + 0.06 * this.tuckW;
    } else this.tuckW = 0;

    // --- traversal, slide, air, landing
    if (i.traverse !== 'none') {
      const tc = TRAVERSE_CLIP[i.traverse];
      // cycles (climb, crawl) wrap the cadence clock; committed moves clamp their progress
      overClip(src, tc, tc.loop ? i.traverseT - Math.floor(i.traverseT) : clamp(i.traverseT, 0, 1), 1);
      this.slot(i.traverse, 1, i.traverseT);
      // (3.2.0) a sidearm aimed one-handed from a split / hanging inverted: the weapon hand takes the grip
      if ((i.traverse === 'split' || i.traverse === 'pipeInv' || i.traverse === 'rappel') && i.raise > 0) src[CH.grip] = Math.min(1, i.raise * 1.5);
    }
    if (i.slide >= 0) {
      overClip(src, SLIDE, clamp(i.slide, 0, 1), 1);
      this.slot('slide', 1, i.slide);
    }
    if (!i.grounded) {
      src[CH.fLY] = src[CH.fLY]! + 0.14;
      src[CH.fRY] = src[CH.fRY]! + 0.1;
      src[CH.pelPitch] = src[CH.pelPitch]! + 0.1;
    }
    if (i.landing > 0.5 && this.landT < 0) this.landT = 0;
    if (this.landT >= 0) {
      addClip(src, LAND, this.landT, 1);
      this.landT += dt;
      if (this.landT > LAND.duration) this.landT = -1;
    }
    // dash: low, driving rush (the dash cycle is in the blend space; this adds the wind-up crouch)
    src[CH.pelY] = src[CH.pelY]! - this.dashS * 0.04;

    // --- acceleration lean (into acceleration, back against braking); the chest stays steadier
    // anticipation: a first-order (not spring) response so it moves on the first frame
    this.intentLean += (clamp(i.intent, -1, 1) * 0.1 - this.intentLean) * (1 - Math.exp(-dt / 0.05));
    const lean = this.accelLean.step(clamp(i.accelFwd * 0.025, -0.14, 0.14), 14, dt) + this.intentLean;
    // (a Chaos Theory sprint turns at 720 deg/s: its roll is held a little lower so the sprint's hunch and the turn
    // still bank within 8 deg)
    const rollMax = i.quickStop > 0 ? 0.08 - 0.03 * this.dashS : 0.08;
    const roll = this.accelRoll.step(clamp(-i.accelSide * 0.025, -rollMax, rollMax), 12, dt);
    src[CH.pelPitch] = src[CH.pelPitch]! + lean;
    src[CH.spPitch] = src[CH.spPitch]! - lean * 0.45;
    src[CH.pelRoll] = src[CH.pelRoll]! + roll;

    // ready hands (A42): holstered on foot, eased so a draw / holster never pops the arms or the carriage
    // a weapon-to-weapon swap (the outgoing and incoming slots differ; a draw / holster uses one slot) reaches
    // both slots from an upright chest: its empty-hands beat is not a holstered carry, so neither the ready hands
    // nor the carriage hold through it (the carriage eases out over the swap's first ~0.2 s and back after it)
    const weaponSwap = i.swap >= 0 && i.swapFrom !== i.swapTo;
    this.readyW = approach(this.readyW, !i.armed && i.ready && i.traverse === 'none' && !weaponSwap ? 1 : 0, 0.25, dt);
    // the carriage weight: armed or holstered with ready hands (eased, so it never pops as the weapon leaves the
    // hands at the end of a holster, or across a swap's empty-hands beat)
    const carryOn = !weaponSwap && (i.armed || (i.ready && i.traverse === 'none'));
    this.carryW = approach(this.carryW, carryOn ? 1 : 0, weaponSwap ? CARRY_SWAP_TAU : 0.25, dt);
    // --- tactical carriage (armed, or holstered with ready hands): hunched over the weapon; more bent over moving
    // along a wall (the same carriage either way: holstering never changes pelvis or head motion, D2)
    const carryK = this.carryW;
    if (carryK > 0) {
      // (a reload opens the chest up a little so the support arm can reach the magazine well)
      const hunch = (1 - this.dashS * 0.4) * (1 - this.reloadW) * carryK;
      const along = atWall ? this.moveW * carryK : 0;
      // crouched: bent well over the knees (half of it straightens into a raised weapon); at a wall the wall
      // hunch bends over the tucked weapon instead (the tuck stays clear of the thighs and the wall)
      const crouchBend = HUNCH.crouch * crouchK * (1 - 0.5 * this.raiseS) * (atWall ? 0 : 1) * carryK;
      src[CH.spPitch] = src[CH.spPitch]! + HUNCH.spine * hunch + HUNCH.wall * along + HUNCH.aim * this.raiseS + crouchBend;
      src[CH.pelPitch] = src[CH.pelPitch]! + HUNCH.pelvis * hunch;
      src[CH.hdPitch] = src[CH.hdPitch]! - HUNCH.head * hunch - HUNCH.wall * 0.6 * along - crouchBend * 0.7;
      src[CH.pelY] = src[CH.pelY]! - HUNCH.drop * hunch * (1 - crouchK * 0.6) - HUNCH.wallDrop * along;
    }

    // --- weapon actions (inertialized as they start and end). Not the swap (step 09): its overlay fades in and out
    // (SWAP_FADE), so it has no jump to absorb, and a draw / holster starts while the aim raise / lower is already
    // moving - a trigger there carries the output's velocity on top of the source's own and overshoots
    const action = i.reload >= 0 ? (i.reloadEmpty ? 'reloadE' : 'reloadT') : i.grenade >= 0 ? 'grenade' : i.handSwap >= 0 ? 'hands' : '';
    if (action !== this.prevAction) trigger = true;
    this.prevAction = action;

    // --- upper body: aim, lean (head first), checks
    const aimPitch = clamp(i.aimPitch, -1.2, 1.2);
    const raise = this.raiseS;
    const breath = Math.sin(this.idleT * 1.6) * 0.008;
    // head-first peek: the head leans out first, the body follows; coming back the body (and weapon)
    // return first and the head follows
    // the weapon changes to the outside hand before any lean starts
    const leanIn = i.handSwap >= 0 ? 0 : i.lean;
    const peekOut = Math.abs(leanIn) > 0.01;
    const headTarget = leanIn;
    // out: head ~60 ms ahead, weapon and body out by ~200 ms; back: body in ~180 ms, head just behind
    const hd = this.leanHead.step(headTarget, peekOut ? 34 : 18, dt);
    const bodyTarget = peekOut ? (Math.abs(hd) > Math.abs(leanIn) * 0.55 ? leanIn : 0) : 0;
    const bd = this.leanBody.step(bodyTarget, 24, dt);
    const yl = this.yawLag.step(clamp(-i.yawRate * 0.04 * mass, -0.25, 0.25), 10 / mass, dt);
    src[CH.spPitch] = src[CH.spPitch]! - aimPitch * 0.45 * (0.35 + raise * 0.65) + breath + this.dashS * 0.2 + crouchK * 0.08;
    // raised, the chest blades towards the shooting shoulder (mirrored with the hand holding the weapon)
    const handS = i.hand < 0 ? -1 : 1;
    src[CH.spYaw] = src[CH.spYaw]! + clamp(i.aimYaw, -1.2, 1.2) * 0.6 + raise * 0.2 * handS * (i.armed ? 1 : 0) + yl;
    src[CH.spRoll] = src[CH.spRoll]! - bd * 0.52;
    src[CH.pelX] = src[CH.pelX]! + bd * 0.17 * k;
    const check = i.check >= 0 ? Math.sin(i.check * Math.PI * 2) * 0.65 * Math.sin(Math.PI * i.check) : 0;
    src[CH.hdPitch] = src[CH.hdPitch]! - aimPitch * 0.45;
    src[CH.hdYaw] = src[CH.hdYaw]! + clamp(i.aimYaw, -1.2, 1.2) * 0.4 - raise * 0.18 * handS + check + hd * 0.12;
    src[CH.hdRoll] = src[CH.hdRoll]! + hd * 0.22;
    if (Math.abs(i.lean) > 0.01 || Math.abs(hd) > 0.01) this.slot('lean', Math.abs(hd), bd);
    if (i.check >= 0) this.slot('check', 1, i.check);

    // --- weapon layer: ready positions blended by weight, raised by `raise`; edge prep tucks it in
    const swapBump = i.handSwap >= 0 ? Math.sin(Math.PI * clamp(i.handSwap, 0, 1)) : 0;
    let cl = i.carryLow;
    let chh = i.carryHigh;
    let cc = i.carryComp;
    if (swapBump > 0) {
      cl *= 1 - swapBump;
      chh *= 1 - swapBump;
      cc = cc * (1 - swapBump) + swapBump;
    }
    // at an edge peek the weapon comes up only as the body leans out past the edge (never raised into it)
    const leanK = peekOut ? smoothstep(Math.abs(bd) / Math.max(0.05, Math.abs(leanIn)) / 0.8) : 1;
    const raiseW = raise * leanK;
    const ready = 1 - raiseW * (1 - swapBump);
    const rl = READY_POSES.low;
    const rh = READY_POSES.high;
    const rc = READY_POSES.compressed;
    const sway = (Math.sin(this.idleT * 1.3) * 0.005 + Math.sin(this.idleT * 0.7) * 0.003) * mass * (1 - kw * 0.5);
    const rec = this.recoil.step(i.kick, 26 / Math.sqrt(mass), dt);
    // raised: up to the eye
    const sight = raiseW;
    // at a wall the ready is the wall tuck: muzzle down along the wall, turned away from it (the rig mirrors
    // yaw with the hand, so the away side is relative to the hand holding it)
    this.wallReadyW = approach(this.wallReadyW, atWall ? 1 : 0, 0.25, dt);
    const cw = this.wallReadyW;
    const nw = 1 - this.wallReadyW;
    const awayYaw = (this.wallS === 0 ? 1 : -Math.sign(this.wallS)) * (i.hand < 0 ? -1 : 1);
    const cr = WALL_READY;
    // stepping to the wall the open-ground carry comes in tight to the chest (compressed) until the tuck takes
    // over, so a low-ready muzzle never reaches into the wall on the way in
    const enterK = atWall ? 1 - smoothstep(this.wallT / WALL_HAND_TIME) : 0;
    cc += (cl + chh) * enterK;
    cl *= 1 - enterK;
    chh *= 1 - enterK;
    cl *= nw;
    chh *= nw;
    cc *= nw;
    src[CH.wpX] = ready * (rl.x * cl + rh.x * chh + rc.x * cc + cr.x * cw) + sight * SIGHT_RAISE.x;
    src[CH.wpY] = ready * (rl.y * cl + rh.y * chh + rc.y * cc + cr.y * cw) + sway + sight * SIGHT_RAISE.y;
    src[CH.wpZ] = ready * (rl.z * cl + rh.z * chh + rc.z * cc + cr.z * cw) - (rec * 0.05) / Math.sqrt(mass) + sight * SIGHT_RAISE.z;
    src[CH.hdRoll] = src[CH.hdRoll]! + sight * SIGHT_HEAD.roll * handS;
    this.out.weld = sight;
    this.out.aimW = raiseW;
    // landing roll: the whole body turns over forward about the hips
    this.out.tumble = i.traverse === 'roll' ? rollTumble(i.traverseT) : i.tumble;
    // leaning out at an edge the tucked muzzle comes up towards level (the lean would roll it onto the leg)
    const crPitch = cr.pitch * (1 - 0.6 * Math.min(1, Math.abs(bd)));
    src[CH.wpPitch] = ready * (rl.pitch * cl + rh.pitch * chh + rc.pitch * cc + crPitch * cw) - (rec * 0.12) / mass + sway * 2;
    src[CH.wpYaw] = ready * (rl.yaw * cl + rh.yaw * chh + rc.yaw * cc + cr.yaw * cw * awayYaw) + check * 0.6 * ready;
    src[CH.wpRoll] = ready * (rl.roll * cl + rh.roll * chh + rc.roll * cc + cr.roll * cw);
    // bent over in a crouch the lowered muzzle comes up with the chest and the gun sits further out, clear of
    // the thighs (the lowered weapon is oriented with the body, not the spine)
    // (the open-ground carries only: the wall tuck has its own pose)
    const bendK = HUNCH.crouch * crouchK * (1 - 0.5 * this.raiseS) * ready * nw;
    src[CH.wpPitch] = src[CH.wpPitch]! - bendK * 1.1;
    src[CH.wpZ] = src[CH.wpZ]! + bendK * 0.16;
    src[CH.wpY] = src[CH.wpY]! + bendK * 0.06;
    // recoil absorbed through the shoulder and spine
    src[CH.spPitch] = src[CH.spPitch]! - rec * 0.05 / mass;
    src[CH.pelPitch] = src[CH.pelPitch]! - rec * 0.015 / mass;
    // grip and off hand defaults (at a wall: off hand to the wall when settled and lowered)
    src[CH.grip] = i.armed ? 1 : 0;
    src[CH.offGrip] = 1;
    src[CH.offMag] = 0;
    // the support hand reaches the wall (0.18-0.42 s) and rests there while still and lowered; moving along the
    // wall takes it back to the weapon
    src[CH.offWall] = atWall ? 0.85 * ready * (1 - this.moveW) * smoothstep((this.wallT - 0.18) / 0.24) : 0;
    // free hands hang at the sides (swing a little with the gait when unarmed)
    const swing = 0.1 * this.moveW * Math.sin(ph * Math.PI * 2);
    const shY = p.y.shoulder - 0.04 * k;
    const armLen = p.upperArm.len + p.forearm.len;
    src[CH.hLX] = -p.shoulderHalf - 0.06;
    src[CH.hLY] = shY - armLen * 0.92;
    src[CH.hLZ] = 0.05 + swing * 0.3;
    src[CH.hRX] = p.shoulderHalf + 0.06;
    src[CH.hRY] = shY - armLen * 0.92;
    src[CH.hRZ] = 0.05 - swing * 0.3;
    // ready hands (A42): forearms up, hands in front at the belt line (a slight counter swing with the gait)
    const rw = this.readyW;
    if (rw > 0) {
      const rs = READY_HANDS.swing * this.moveW * Math.sin(ph * Math.PI * 2);
      // body-relative here; the follow of the leaning chest and the pelvis is added after inertialization (below)
      const rx = p.shoulderHalf + READY_HANDS.x;
      const ry = shY - READY_HANDS.y;
      const rz = READY_HANDS.z;
      src[CH.hLX] = src[CH.hLX]! + (-rx - src[CH.hLX]!) * rw;
      src[CH.hLY] = src[CH.hLY]! + (ry - src[CH.hLY]!) * rw;
      src[CH.hLZ] = src[CH.hLZ]! + (rz + rs - src[CH.hLZ]!) * rw;
      src[CH.hRX] = src[CH.hRX]! + (rx - src[CH.hRX]!) * rw;
      src[CH.hRY] = src[CH.hRY]! + (ry - src[CH.hRY]!) * rw;
      src[CH.hRZ] = src[CH.hRZ]! + (rz - rs - src[CH.hRZ]!) * rw;
    }
    // reload / swap / grenade clips over the weapon layer
    this.reloadW = approach(this.reloadW, i.reload >= 0 ? 1 : 0, 0.08 * mass, dt);
    if (i.reload >= 0 || this.reloadW > 0.01) {
      const rt = i.reload >= 0 ? i.reload : 1;
      overClip(src, i.reloadEmpty ? RELOAD_EMPTY : RELOAD_TACTICAL, rt, this.reloadW);
      this.slot(i.reloadEmpty ? 'reload empty' : 'reload', this.reloadW, rt);
      // held a little further out while reloading: the support arm reaches the magazine with the elbow clear of
      // the chest (compact guns hunched at a wall would fold it in)
      src[CH.wpZ] = src[CH.wpZ]! + 0.07 * this.reloadW;
      // crouched / curled over, the reach to the pouch goes out to the side so the elbow clears the chest
      src[CH.hLX] = src[CH.hLX]! - 0.09 * this.reloadW * crouchK;
      src[CH.hLZ] = src[CH.hLZ]! + 0.05 * this.reloadW * crouchK;
    }
    // attached (hang, climb, crawl) the body belongs to the anchor pose and the hands to the grips: a weapon
    // stowed for it goes to its slot without the swap's reach
    const attachedPose = i.traverse === 'hang' || i.traverse === 'climb' || i.traverse === 'crawl' || i.traverse === 'climbUp' || i.traverse === 'ventDrop' || i.traverse === 'split' || i.traverse === 'wallKick' || i.traverse === 'pipeLegs' || i.traverse === 'pipeInv' || i.traverse === 'rappel' || i.traverse === 'brace';
    // (step 09) the swap clip overrides the chest and head pitch, so entering it from the carriage (hunched over a
    // raised weapon, or the holstered ready carry) would snap the spine by up to ~0.6 rad in one frame - more than
    // the inertializer hides. The overlay fades in over ~0.125 s (a holster from aim, a draw entering at the
    // holstered beat, a swap), and a holster that settles in the slot before the clip's end (the overlay stops
    // mid-clip) fades out from its last time at the same rate instead of cutting
    const swapOn = i.swap >= 0 && !attachedPose;
    if (swapOn) {
      this.swapW = Math.min(1, this.swapW + SWAP_FADE * dt);
      this.swapLastT = i.swap;
    } else this.swapW = Math.max(0, this.swapW - SWAP_FADE * dt);
    if (this.swapW > 0) {
      const st = swapOn ? i.swap : this.swapLastT;
      overClip(src, swapClipFor(i.swapFrom, i.swapTo), st, this.swapW);
      this.slot('swap', this.swapW, st);
    }
    // (step 09) a draw / holster puts the weapon into / out of the hands, and a draw enters the swap clip at its
    // holstered beat, mid-clip (and a holster leaves it mid-clip): the grip weights move onto their targets at a
    // limited rate (GRIP_RATE: a full change in 0.2 s) instead of jumping
    const gStep = GRIP_RATE * dt;
    this.gripS += clamp(src[CH.grip]! - this.gripS, -gStep, gStep);
    src[CH.grip] = this.gripS;
    this.offGripS += clamp(src[CH.offGrip]! - this.offGripS, -gStep, gStep);
    src[CH.offGrip] = this.offGripS;
    if (i.grenade >= 0) {
      overClip(src, GRENADE, i.grenade, 1);
      this.slot('grenade', 1, i.grenade);
    }
    if (i.melee >= 0) {
      // (locomotion step 10) the elbow arc with the hip turn (the strike and the lethal takedown blow): the wind-up
      // draws the right hand back with the chest and hips turning right (0 - 0.17), the strike drives the elbow
      // across the chest at shoulder height with the hips leading the turn left to contact (0.56), the recovery eases
      // back to the hands' own pose (1). Weighted from the clip's hands, so it starts and ends without a jump; the
      // turn is spread over pelvis, spine and head (5.12.2 joint rates: about 3 deg per frame at its fastest).
      const ph = clamp(i.melee, 0, 1);
      const wStrike = smoothstep((ph - 0.1) / 0.456) * (1 - smoothstep((ph - 0.62) / 0.38));
      const wWind = smoothstep(ph / 0.167) * (1 - smoothstep((ph - 0.167) / 0.333)) * (1 - wStrike);
      // the right hand sweeps round the shoulder (never folding the elbow shut, never through the chest): reaching
      // forward and out to the side on the wind-up, across the front to the midline at contact (the forearm level, the
      // elbow out to the side: the rig lifts its pole by `meleePoleW`), half way back as it blends out. The chest sits
      // ~0.2 m ahead of the root in the hands' frame; the reach forward fades last (in first) so the hand stays clear
      const u = meleeSweep(ph);
      const wHand = meleeHandW(ph);
      const wFwd = Math.min(1, wHand * 1.6);
      const phi = 0.5 + 1.68 * u;
      const r = 0.24 + 0.08 * u;
      // (targets in the frame after the ready-hands follow, which is added below: less the follow, last frame's)
      const fwM = this.readyW * (1 - this.reloadW) * (1 - this.swapW) * (1 - this.handClipW);
      const fy = this.readyFy * fwM;
      const fz = this.readyFz * fwM;
      src[CH.hRX] = src[CH.hRX]! * (1 - wHand) + (p.shoulderHalf + r * Math.cos(phi)) * wHand;
      src[CH.hRY] = src[CH.hRY]! * (1 - wHand) + (shY - 0.22 + 0.12 * u - fy) * wHand;
      src[CH.hRZ] = src[CH.hRZ]! * (1 - wFwd) + (0.2 + r * Math.sin(phi) - fz) * wFwd;
      // the left hand comes up as a guard (forward first, down last)
      src[CH.hLY] = src[CH.hLY]! + 0.15 * wHand;
      src[CH.hLZ] = src[CH.hLZ]! + 0.3 * wFwd;
      const turn = 0.22 * wWind - 0.4 * wStrike;
      src[CH.pelYaw] = src[CH.pelYaw]! + turn * 0.4;
      src[CH.spYaw] = src[CH.spYaw]! + turn * 0.6;
      src[CH.hdYaw] = src[CH.hdYaw]! - turn * 0.5;
      src[CH.pelY] = src[CH.pelY]! - 0.015 * wStrike;
    }

    // --- additive: hit flinch, heel-strike compression, weight over the support foot
    const hx = this.hit.step(0, 9, dt);
    src[CH.spPitch] = src[CH.spPitch]! - hx * 0.12;
    src[CH.spRoll] = src[CH.spRoll]! + hx * 0.1 * this.hitSide;
    src[CH.hdPitch] = src[CH.hdPitch]! - hx * 0.08;
    const comp = this.pelSpring.step(0, 15, dt);
    src[CH.pelY] = src[CH.pelY]! + comp;
    const sup = this.supportX.step(this.moveW > 0.3 ? 0 : this.support * 0.012, 10, dt);
    src[CH.pelX] = src[CH.pelX]! + sup;

    // --- stabilisation: most of the gait bob is taken out of the weapon (the head is world-stabilised)
    const bob = src[CH.pelY]! - this.pelBase.step(src[CH.pelY]!, 6, dt);
    src[CH.wpY] = src[CH.wpY]! - bob * 0.8;
    this.bobResidual = bob * 0.2;

    // --- inertialize discrete switches, then output
    if (trigger) this.inert.trigger(src, dt);
    const pose = this.inert.apply(src, this.pose, dt);
    // ready hands (A42) follow the shoulders as the chest leans (pelvis + spine pitch) and the pelvis moves, taken
    // from the inertialized body: the follow is as continuous as the body, and the hands are never inertialized
    // while they move with it (a stance or state switch mid-crouch would carry their velocity on top of the
    // body's own and overshoot). Weighted by the share of the ready hands the clips above left in place.
    this.handClipW = approach(this.handClipW, i.grenade >= 0 ? 1 : 0, 0.05, dt);
    const fw = this.readyW * (1 - this.reloadW) * (1 - this.swapW) * (1 - this.handClipW);
    // (the hands hang a touch behind the shoulders, READY_HANDS.lag: a fast crouch folds the chest and drops the
    // pelvis together, and the hands ease through it instead of taking the sum of both at full speed)
    const tp = pose[CH.spPitch]! + pose[CH.pelPitch]!;
    this.readyFy = approach(this.readyFy, pose[CH.pelY]! - READY_HANDS.torso * (1 - Math.cos(tp)), READY_HANDS.lag, dt);
    this.readyFz = approach(this.readyFz, pose[CH.pelZ]! + READY_HANDS.torso * Math.sin(tp), READY_HANDS.lag, dt);
    if (fw > 0.0001) {
      const fy = this.readyFy * fw;
      const fz = this.readyFz * fw;
      pose[CH.hLY] = pose[CH.hLY]! + fy;
      pose[CH.hRY] = pose[CH.hRY]! + fy;
      pose[CH.hLZ] = pose[CH.hLZ]! + fz;
      pose[CH.hRZ] = pose[CH.hRZ]! + fz;
    }
    this.writeTargets(pose, i, k, ph);
    this.out.weaponBob = this.bobResidual;
    return o;
  }

  /** Map the pose to rig targets and the planner's stance/gait values. */
  private writeTargets(q: Pose, i: AnimInput, k: number, ph: number): void {
    const o = this.out;
    const pe = o.pelvis;
    pe.x = q[CH.pelX]! * k;
    pe.y = q[CH.pelY]! * k;
    pe.z = q[CH.pelZ]! * k;
    pe.pitch = q[CH.pelPitch]!;
    pe.roll = q[CH.pelRoll]!;
    pe.yaw = q[CH.pelYaw]!;
    o.spine.pitch = q[CH.spPitch]!;
    o.spine.yaw = q[CH.spYaw]!;
    o.spine.roll = q[CH.spRoll]!;
    o.head.pitch = q[CH.hdPitch]!;
    o.head.yaw = q[CH.hdYaw]!;
    o.head.roll = q[CH.hdRoll]!;
    const w = o.weapon;
    w.x = q[CH.wpX]!;
    w.y = q[CH.wpY]!;
    w.z = q[CH.wpZ]!;
    w.pitch = q[CH.wpPitch]!;
    w.yaw = q[CH.wpYaw]!;
    w.roll = q[CH.wpRoll]!;
    o.grip = clamp(q[CH.grip]!, 0, 1);
    o.offGrip = clamp(q[CH.offGrip]!, 0, 1);
    o.offMag = clamp(q[CH.offMag]!, 0, 1);
    o.offWall = clamp(q[CH.offWall]!, 0, 1);
    o.handL.x = q[CH.hLX]! * k;
    o.handL.y = q[CH.hLY]! * k;
    o.handL.z = q[CH.hLZ]! * k;
    o.handR.x = q[CH.hRX]! * k;
    o.handR.y = q[CH.hRY]! * k;
    o.handR.z = q[CH.hRZ]! * k;
    // stance: shoulder-width tactical stance, support (left) foot slightly forward
    const half = this.p.hipHalf * 1.2 * q[CH.width]!;
    const st = o.stance;
    st.lX = (-half + q[CH.fLX]!) * k;
    st.lZ = (0.05 + q[CH.fLZ]!) * k;
    st.rX = (half + q[CH.fRX]!) * k;
    st.rZ = (-0.03 + q[CH.fRZ]!) * k;
    st.lY = q[CH.fLY]! * k;
    st.rY = q[CH.fRY]! * k;
    st.lPitch = q[CH.fLPitch]!;
    st.rPitch = q[CH.fRPitch]!;
    // gait values for the planner: duty and lift from the blended cycle at this speed
    const s = Math.max(0, i.speed);
    const g = o.gait;
    g.phase = ph;
    // near the end of a stop the gait clock crawls: hand the last step to deliberate idle stepping
    g.moving = s > (i.motion === 'stop' ? 0.3 : 0.05) && i.grounded;
    g.cycleTime = s > 0.05 ? (2 * stepLength(s, undefined, lateralShare(i))) / s : 1.2;
    const nodes = i.crouch > 0.5 ? CROUCH_NODES : FORWARD_NODES;
    const a = fwdNode(nodes, s);
    const na = nodes[a]!;
    const nb = nodes[a + 1]!;
    const kk = clamp((s - na.speed) / (nb.speed - na.speed), 0, 1);
    const duty = na.clip.duty + (nb.clip.duty - na.clip.duty) * kk;
    const lift = na.clip.liftH + (nb.clip.liftH - na.clip.liftH) * kk;
    g.duty = clamp(duty, 0.4, 0.75);
    g.liftH = lift * k * clamp(q[CH.lift]!, 0.3, 2);
    // layer weights for the overlay
    const ly = o.layers;
    for (let k = 0; k < LOWER_STATES.length; k++) ly[LOWER_STATES[k]!] = this.weights[LOWER_STATES[k]!];
    ly.raise = this.raiseS;
    ly.low = i.carryLow;
    ly.high = i.carryHigh;
    ly.compressed = i.carryComp;
    ly.reload = this.reloadW;
    ly.dash = this.dashS;
    ly.kneel = smoothstep(this.kneelW);
    ly.inert = this.inert.maxOffset;
  }

  /** Active clips this frame (debug overlay). */
  activeClips(): readonly ClipSlot[] {
    return this.slots.slice(0, this.nSlots);
  }
}

const NEUTRAL_POSE: Pose = newPose();

/** Sideways share of the local movement direction (0 forward/back .. 1 pure strafe). */
function lateralShare(i: AnimInput): number {
  const l = Math.sqrt(i.localX * i.localX + i.localZ * i.localZ);
  return l > 1e-4 ? Math.min(1, Math.abs(i.localX) / l) : 0;
}

/** Index of the lower node bracketing a speed in a forward node set. */
function fwdNode(nodes: readonly { speed: number }[], s: number): number {
  let a = 0;
  while (a < nodes.length - 2 && s > nodes[a + 1]!.speed) a++;
  return a;
}
