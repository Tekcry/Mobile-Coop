/**
 * Layered, clip-based animation graph (pure: no Babylon). Evaluated every render frame.
 *
 * Lower body: a 2D blend space (speed x direction) over keyed locomotion cycles, standing and
 * crouched, all sampled at the gait clock so blends never fight the feet; a timed kneel pose; start
 * weight shift, stop settle and pivot clips driven by the motion driver's state; cover, traversal,
 * slide and air poses. Switches between these are inertialized (the jump decays through a critically
 * damped curve per joint group), never cut or linearly faded.
 * Upper body: weapon ready positions blended to the raised aim pose; reload (tactical / empty), swap and
 * grenade clips; head-first peek and lean sequencing; recoil absorbed through the spine; spine/head
 * look-at; breathing after 2 s still; hit flinch; acceleration lean.
 * Balance: a pelvis spring compressed on every heel strike and shifted over the support foot.
 * Feet are placed by the rig's world-space FootPlanner from the stance and gait values output here.
 */
import type { Proportions } from '../player/proportions';
import { overClip, addClip, mirrorClip, type Clip } from './clip';
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
import { COVER_ENTER, COVER_ENTER_SIDE, COVER_EXIT, COVER_TURN, DROP, GRENADE, LAND, MANTLE, PIVOT, RELOAD_EMPTY, RELOAD_TACTICAL, SLIDE, START_SHIFT, STEP_UP, STOP_SETTLE, swapClipFor, VAULT, type SwapReach } from './clips/actions';
import { CLIMB, CLIMB_UP, CRAWL, HANG, ROLL, rollTumble, VENT_DROP, WINDOW_VAULT } from './clips/traverse';
import { hyp2 } from '../core/mathx';

/** The kneel with the right knee up (the clip has the left knee up): in cover the raised knee is on the wall
 *  side, so the weapon (in the open-side hand) rests beside the kneeling leg, not across the raised one. */
const KNEEL_M = mirrorClip(KNEEL);

export const FADE = 0.2;
export const LOWER_STATES = ['locomotion', 'crouch', 'kneel', 'air', 'slide', 'cover', 'traverse'] as const;
export type LowerState = (typeof LOWER_STATES)[number];
/** Committed moves (vault .. hop) and the attached pose family (hang, climb, crawl: keyed over the climb
 *  cadence, `traverseT`). */
export type TraverseKind = 'none' | 'vault' | 'mantle' | 'step' | 'drop' | 'hop' | 'roll' | 'hang' | 'climb' | 'crawl' | 'climbUp' | 'ventDrop' | 'windowVault';

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
  /** Dash blend 0..1. */
  dash: number;
  /** Dash-in slide progress 0..1, or < 0. */
  slide: number;
  /** Turn-and-swap / corner swing in cover 0..1, or < 0: a ducking spin. */
  coverTurn: number;
  /** Edge peek: 1 when the line of fire clears the cover, 0 while still stepping out (weapon stays tucked). */
  peekClear: number;
  /** Landing recovery 0..1. */
  landing: number;
  cover: 'none' | 'low' | 'high';
  /** Which side the cover surface is on, in the character's frame (-1 left, 1 right, 0 none). */
  wallSide: number;
  /** Lean around an edge: -1 left .. 1 right (hips planted). */
  lean: number;
  /** Low cover: rise to aim over the top 0..1. */
  peekOver: number;
  /** Ducking behind low cover 0..1 (hunch the spine, tuck the head; the rig lowers the pelvis). */
  duck: number;
  /** Crouched aim over low cover 0..1: lean over the top with the weapon up at the cheek. */
  aimOver: number;
  blind: boolean;
  /** Head/muzzle turned towards a nearby edge: -1 left, 1 right, 0 none. */
  edgeLook: number;
  traverse: TraverseKind;
  /** Traversal progress 0..1. */
  traverseT: number;
  /** Melee swing 0..1, or < 0. */
  melee: number;
  /** Doorway check sweep 0..1, or < 0. */
  check: number;
  /** Gait clock from the motion driver (0..1), or < 0 to integrate from speed. */
  phase: number;
  /** Motion driver state and time in it ('' when there is no driver: enemies, remotes). */
  motion: MotionState | '';
  motionT: number;
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
    dash: 0,
    slide: -1,
    coverTurn: -1,
    peekClear: 1,
    landing: 0,
    cover: 'none',
    wallSide: 0,
    lean: 0,
    peekOver: 0,
    duck: 0,
    aimOver: 0,
    blind: false,
    edgeLook: 0,
    traverse: 'none',
    traverseT: 0,
    melee: -1,
    check: -1,
    phase: -1,
    motion: '',
    motionT: 0,
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
  /** Off hand: weights on the foregrip, the magazine well, the cover surface (rest = free target). */
  offGrip: number;
  offMag: number;
  offCover: number;
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
    offCover: 0,
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
  if (i.cover !== 'none') return 'cover';
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
 * level) - never upright like a mannequin. More bent over moving along cover and crouched (`crouch`: over the
 * knees); a little more leaning into a raised weapon.
 */
export const HUNCH = { spine: 0.5, pelvis: 0.1, head: 0.34, drop: 0.07, cover: 0.2, coverDrop: 0.06, aim: 0.05, crouch: 0.34 };

export const READY_POSES = {
  // stock in the shoulder pocket, muzzle ~45 deg down and angled across the body, elbows bent and in
  low: { x: 0, y: -0.08, z: -0.02, pitch: 0.8, yaw: -0.6, roll: 0.2 },
  high: { x: -0.03, y: 0.07, z: -0.12, pitch: -1.0, yaw: -0.08, roll: 0 },
  // pulled in tight to the chest, muzzle forward and down (never swung across into a wall beside you)
  compressed: { x: -0.06, y: -0.08, z: -0.12, pitch: 0.6, yaw: -0.12, roll: 0.1 },
} as const;
/**
 * In cover: tucked against the chest on the open side, muzzle down along the wall and angled away from it
 * (`yaw` is turned away from the wall side), so it never pokes into the cover; raised from here to aim.
 */
export const COVER_READY = { x: 0.06, y: -0.24, z: 0.1, pitch: 1.05, yaw: 0.28, roll: 0 };
/** Crouched / kneeling in cover: muzzle flatter and the gun carried higher, clear of the raised knee. */
export const COVER_READY_CROUCH = { pitch: 0.22, y: 0.15, yaw: 0.24, x: 0.05 };
/** Kneeling still in cover (added to the crouched carry): out beside the kneeling leg on the open side,
 *  muzzle angled down past the knee, clear of the raised thigh and the curled chest. */
export const COVER_READY_KNEEL = { x: 0.12, y: 0.1, pitch: -0.25, yaw: 0.15 };

const TRAVERSE_CLIP: Record<Exclude<TraverseKind, 'none'>, Clip> = { vault: VAULT, mantle: MANTLE, step: STEP_UP, drop: DROP, hop: VAULT, roll: ROLL, hang: HANG, climb: CLIMB, crawl: CRAWL, climbUp: CLIMB_UP, ventDrop: VENT_DROP, windowVault: WINDOW_VAULT };

/** Active-clip slots for the debug overlay timeline. */
export interface ClipSlot {
  name: string;
  w: number;
  t: number;
}

const SLOTS = 10;

export class AnimGraph {
  readonly weights: Record<LowerState, number> = { locomotion: 1, crouch: 0, kneel: 0, air: 0, slide: 0, cover: 0, traverse: 0 };
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
  private kneelW = 0;
  private kneelClip: Clip = KNEEL;
  private startT = -1;
  private settleT = -1;
  private exitT = -1;
  private landT = -1;
  private coverT = 0;
  private prevMotion: MotionState | '' = '';
  private prevCover: AnimInput['cover'] = 'none';
  private prevAction = '';
  private raiseS = 0;
  private dashS = 0;
  private reloadW = 0;
  /** Tucked in against the cover while reloading / swapping / throwing. */
  tuckW = 0;
  /** In-cover ready weight (eased ~0.25 s). */
  private coverReadyW = 0;
  private clearW = 1;
  private blindS = 0;

  /** How far the body / weapon is leaned out (signed, follows the lean target) and raised for blind fire. */
  get leanOut(): number {
    return this.leanBody.x;
  }

  get blindOut(): number {
    return this.blindS;
  }
  private leanHead = new Spring();
  private leanBody = new Spring();
  private wallS = 0;
  private edgeS = 0;
  private dirX = 0;
  private dirZ = 1;
  private moveW = 0;
  private accelLean = new Spring();
  private duckS = new Spring();
  private overS = new Spring();
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
  private locomotion(out: Pose, crouched: boolean, i: AnimInput, ph: number): void {
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
    const s = Math.max(0, i.speed);
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
    this.moveW = approach(this.moveW, smoothstep(i.speed / 0.22), 0.08, dt);
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
    this.blindS = approach(this.blindS, i.blind ? 1 : 0, 0.12 * mass, dt);
    this.wallS = approach(this.wallS, i.wallSide, 0.2, dt);
    this.edgeS = approach(this.edgeS, i.edgeLook, 0.22, dt);
    const inCover = i.cover !== 'none';
    this.coverT = inCover ? this.coverT + dt : 0;

    // --- locomotion blend space, standing and crouched, then the posture blend
    const crouchK = clamp(i.crouch, 0, 1);
    const src = this.src;
    if (crouchK < 0.999) this.locomotion(this.stand, false, i, ph);
    if (crouchK > 0.001) this.locomotion(this.crouch, true, i, ph);
    if (crouchK <= 0.001) src.set(this.stand);
    else if (crouchK >= 0.999) src.set(this.crouch);
    else lerpPose(src, this.stand, this.crouch, crouchK);
    this.slot(crouchK > 0.5 ? 'crouch loco' : 'loco', 1, ph);

    // --- kneel: one knee down behind low cover or when crouched and still (eased over kneelTime)
    const wantKneel = (i.kneel || (i.cover === 'low' && still)) && i.peekOver < 0.5 && crouchK > 0.5;
    const kStep = dt / (wantKneel ? MOVEMENT.kneelTime : MOVEMENT.standTime);
    this.kneelW = clamp(this.kneelW + (wantKneel ? kStep : -kStep), 0, 1);
    const kw = smoothstep(this.kneelW);
    const kneelClip = inCover && this.wallS > 0 ? KNEEL_M : KNEEL;
    if (kneelClip !== this.kneelClip && kw > 0.01) trigger = true;
    this.kneelClip = kneelClip;
    overClip(src, kneelClip, this.idleT, kw);
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

    // --- cover: side-on, shoulder to the wall; the entry is a timed clip; leaving pushes off
    if (inCover && this.prevCover === 'none') trigger = true;
    if (!inCover && this.prevCover !== 'none') {
      this.exitT = 0;
      trigger = true;
    }
    this.prevCover = i.cover;
    if (inCover) {
      const settled = Math.min(this.coverT, COVER_ENTER.duration);
      addClip(src, COVER_ENTER_SIDE, settled, 1, this.wallS || 1);
      addClip(src, COVER_ENTER, settled, 1);
      this.slot('cover enter', this.coverT < COVER_ENTER.duration ? 1 : 0.3, settled);
      if (i.coverTurn >= 0) {
        addClip(src, COVER_TURN, clamp(i.coverTurn, 0, 1), 1);
        this.slot('cover turn', 1, i.coverTurn);
      }
      // reloading, swapping or throwing in cover: tuck in closer to the wall, a little lower
      this.tuckW = approach(this.tuckW, i.reload >= 0 || i.swap >= 0 || i.grenade >= 0 ? 1 : 0, 0.12, dt);
      src[CH.pelX] = src[CH.pelX]! + this.wallS * 0.035 * this.tuckW;
      src[CH.pelY] = src[CH.pelY]! - 0.03 * this.tuckW;
      src[CH.spPitch] = src[CH.spPitch]! + 0.06 * this.tuckW;
    } else this.tuckW = 0;
    if (this.exitT >= 0) {
      addClip(src, COVER_EXIT, this.exitT, 1);
      this.slot('cover exit', 1, this.exitT);
      this.exitT += dt;
      if (this.exitT > COVER_EXIT.duration) this.exitT = -1;
    }

    // --- traversal, slide, air, landing
    if (i.traverse !== 'none') {
      const tc = TRAVERSE_CLIP[i.traverse];
      // cycles (climb, crawl) wrap the cadence clock; committed moves clamp their progress
      overClip(src, tc, tc.loop ? i.traverseT - Math.floor(i.traverseT) : clamp(i.traverseT, 0, 1), 1);
      this.slot(i.traverse, 1, i.traverseT);
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
    const roll = this.accelRoll.step(clamp(-i.accelSide * 0.025, -0.08, 0.08), 12, dt);
    src[CH.pelPitch] = src[CH.pelPitch]! + lean;
    src[CH.spPitch] = src[CH.spPitch]! - lean * 0.45;
    src[CH.pelRoll] = src[CH.pelRoll]! + roll;
    // ducking behind low cover: curl the back over the knees, the head down but eyes forward
    const duckS = this.duckS.step(i.duck, 16, dt);
    src[CH.pelPitch] = src[CH.pelPitch]! + duckS * 0.45;
    src[CH.spPitch] = src[CH.spPitch]! + duckS * 1.15;
    src[CH.hdPitch] = src[CH.hdPitch]! - duckS * 0.7;
    // crouched aim over low cover: the back straightens out of the crouch hunch and the weapon comes up
    // to the cheek (the rig then rises only until the muzzle clears), so only eyes, head and gun show
    const overS = this.overS.step(i.aimOver, 20, dt);
    src[CH.spPitch] = src[CH.spPitch]! - overS * 0.18;

    // --- tactical carriage (armed): hunched over the weapon; more bent over moving along cover
    if (i.armed) {
      // (a reload opens the chest up a little so the support arm can reach the magazine well)
      const hunch = (1 - this.dashS * 0.4) * (1 - this.reloadW);
      const along = inCover && i.cover === 'high' ? this.moveW : 0;
      // crouched: bent well over the knees (half of it straightens into a raised weapon); in cover the cover
      // hunch bends over the tucked weapon instead (the tuck stays clear of the thighs and the wall)
      const crouchBend = HUNCH.crouch * crouchK * (1 - 0.5 * this.raiseS) * (inCover ? 0 : 1);
      src[CH.spPitch] = src[CH.spPitch]! + HUNCH.spine * hunch + HUNCH.cover * along + HUNCH.aim * this.raiseS + crouchBend;
      src[CH.pelPitch] = src[CH.pelPitch]! + HUNCH.pelvis * hunch;
      src[CH.hdPitch] = src[CH.hdPitch]! - HUNCH.head * hunch - HUNCH.cover * 0.6 * along - crouchBend * 0.7;
      src[CH.pelY] = src[CH.pelY]! - HUNCH.drop * hunch * (1 - crouchK * 0.6) - HUNCH.coverDrop * along;
    }

    // --- weapon actions (inertialized as they start and end)
    const action = i.reload >= 0 ? (i.reloadEmpty ? 'reloadE' : 'reloadT') : i.swap >= 0 ? 'swap' : i.grenade >= 0 ? 'grenade' : i.handSwap >= 0 ? 'hands' : '';
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
    src[CH.hdYaw] = src[CH.hdYaw]! + clamp(i.aimYaw, -1.2, 1.2) * 0.4 - raise * 0.18 * handS + this.edgeS * 0.45 + check + hd * 0.12;
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
    this.clearW = approach(this.clearW, i.peekClear, 0.08, dt);
    const leanK = (peekOut ? smoothstep(Math.abs(bd) / Math.max(0.05, Math.abs(leanIn)) / 0.8) : 1) * this.clearW;
    const raiseW = raise * leanK;
    const ready = 1 - raiseW * (1 - swapBump);
    const rl = READY_POSES.low;
    const rh = READY_POSES.high;
    const rc = READY_POSES.compressed;
    const sway = (Math.sin(this.idleT * 1.3) * 0.005 + Math.sin(this.idleT * 0.7) * 0.003) * mass * (1 - kw * 0.5);
    const rec = this.recoil.step(i.kick, 26 / Math.sqrt(mass), dt);
    const blindLow = i.cover === 'low' ? 1 : 0;
    // raised: up to the eye (blind fire holds it out over / round the cover instead)
    const sight = raiseW * (1 - this.blindS);
    // in cover the ready is the cover tuck: muzzle down along the wall, turned away from it (the rig mirrors
    // yaw with the hand, so the away side is relative to the hand holding it)
    this.coverReadyW = approach(this.coverReadyW, inCover ? 1 : 0, 0.25, dt);
    // turning round at high cover (turn-and-swap, corner swing): the gun comes up to the high ready (muzzle up,
    // tight in) while the hands change - nothing sticks out sideways into the wall (low cover keeps its tuck)
    const turnK = inCover && i.cover === 'high' && i.coverTurn >= 0 ? Math.sin(Math.PI * clamp(i.coverTurn, 0, 1)) : 0;
    const cw = this.coverReadyW * (1 - turnK);
    const nw = 1 - this.coverReadyW;
    const awayYaw = (this.wallS === 0 ? 1 : -Math.sign(this.wallS)) * (i.hand < 0 ? -1 : 1);
    const cr = COVER_READY;
    // kneeling still (not leaning out): the carry moves out beside the kneeling leg
    const kneelK = kw * (1 - Math.min(1, Math.abs(bd)));
    // gliding into cover the open-ground carry comes in tight to the chest (compressed) until the tuck takes
    // over, so a low-ready muzzle never reaches into the cover or the floor on the way in
    const enterK = inCover ? 1 - smoothstep(this.coverT / COVER_ENTER.duration) : 0;
    cc += (cl + chh) * enterK;
    cl *= 1 - enterK;
    chh *= 1 - enterK;
    cl *= nw;
    chh = chh * nw + this.coverReadyW * turnK;
    cc *= nw;
    src[CH.wpX] = ready * (rl.x * cl + rh.x * chh + rc.x * cc + (cr.x + COVER_READY_CROUCH.x * crouchK + COVER_READY_KNEEL.x * kneelK + 0.06 * this.moveW * crouchK) * cw) + this.blindS * (1 - blindLow) * bd * 0.22 + sight * SIGHT_RAISE.x;
    src[CH.wpY] = ready * (rl.y * cl + rh.y * chh + rc.y * cc + (cr.y + COVER_READY_CROUCH.y * crouchK + COVER_READY_KNEEL.y * kneelK + 0.08 * this.moveW * crouchK) * cw) + sway + this.blindS * (blindLow ? 0.42 : 0.1) + sight * SIGHT_RAISE.y;
    src[CH.wpZ] = ready * (rl.z * cl + rh.z * chh + rc.z * cc + cr.z * cw) - (rec * 0.05) / Math.sqrt(mass) + sight * SIGHT_RAISE.z;
    src[CH.hdRoll] = src[CH.hdRoll]! + sight * SIGHT_HEAD.roll * handS;
    this.out.weld = sight;
    this.out.aimW = raiseW;
    // landing roll: the whole body turns over forward about the hips
    this.out.tumble = i.traverse === 'roll' ? rollTumble(i.traverseT) : 0;
    // crouched / kneeling the muzzle points out past the knees rather than down into them
    // leaning out at an edge the tucked muzzle comes up towards level (the lean would roll it onto the leg)
    // turning round at low cover the tucked muzzle comes up towards level (pointing down it would reach the
    // floor past the end of the cover as the body swings); moving crouched along cover it is carried flatter too
    const lowTurn = inCover && i.cover === 'low' && i.coverTurn >= 0 ? Math.sin(Math.PI * clamp(i.coverTurn, 0, 1)) : 0;
    const crPitch = ((cr.pitch - (cr.pitch - COVER_READY_CROUCH.pitch) * crouchK) * (1 - 0.6 * Math.min(1, Math.abs(bd))) + COVER_READY_KNEEL.pitch * kneelK) * (1 - 0.7 * lowTurn) - 0.3 * this.moveW * crouchK;
    src[CH.wpPitch] = ready * (rl.pitch * cl + rh.pitch * chh + rc.pitch * cc + crPitch * cw) - (rec * 0.12) / mass + sway * 2;
    src[CH.wpYaw] = ready * (rl.yaw * cl + rh.yaw * chh + rc.yaw * cc + (cr.yaw + COVER_READY_CROUCH.yaw * crouchK + COVER_READY_KNEEL.yaw * kneelK) * cw * awayYaw) + this.blindS * (1 - blindLow) * bd * 0.3 + check * 0.6 * ready + this.edgeS * 0.25 * ready;
    src[CH.wpRoll] = ready * (rl.roll * cl + rh.roll * chh + rc.roll * cc + cr.roll * cw);
    // bent over in a crouch the lowered muzzle comes up with the chest and the gun sits further out, clear of
    // the thighs (the lowered weapon is oriented with the body, not the spine)
    // (the open-ground carries only, crouching into cover included: the cover tucks have their own crouch pose)
    const bendK = HUNCH.crouch * crouchK * (1 - 0.5 * this.raiseS) * ready * nw;
    src[CH.wpPitch] = src[CH.wpPitch]! - bendK * 1.1;
    src[CH.wpZ] = src[CH.wpZ]! + bendK * 0.16;
    src[CH.wpY] = src[CH.wpY]! + bendK * 0.06;
    // recoil absorbed through the shoulder and spine
    src[CH.spPitch] = src[CH.spPitch]! - rec * 0.05 / mass;
    src[CH.pelPitch] = src[CH.pelPitch]! - rec * 0.015 / mass;
    // grip and off hand defaults (cover: off hand to the wall when settled and lowered)
    src[CH.grip] = i.armed ? 1 : 0;
    src[CH.offGrip] = 1;
    src[CH.offMag] = 0;
    // the hand reaches the wall during the entry (0.18-0.42 s) and rests there while still and lowered
    // the support hand reaches for the wall first (during the entry glide), then stays on it while
    // holding still; moving along the cover takes it back to the weapon
    const entering = this.coverT < COVER_ENTER.duration;
    src[CH.offCover] = inCover ? 0.85 * ready * (entering ? 1 : 1 - this.moveW) * smoothstep((this.coverT - 0.18) / 0.24) : 0;
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
    // reload / swap / grenade clips over the weapon layer
    this.reloadW = approach(this.reloadW, i.reload >= 0 ? 1 : 0, 0.08 * mass, dt);
    if (i.reload >= 0 || this.reloadW > 0.01) {
      const rt = i.reload >= 0 ? i.reload : 1;
      overClip(src, i.reloadEmpty ? RELOAD_EMPTY : RELOAD_TACTICAL, rt, this.reloadW);
      this.slot(i.reloadEmpty ? 'reload empty' : 'reload', this.reloadW, rt);
      // held a little further out while reloading: the support arm reaches the magazine with the elbow clear of
      // the chest (compact guns hunched in cover would fold it in)
      src[CH.wpZ] = src[CH.wpZ]! + 0.07 * this.reloadW;
      // crouched / curled over, the reach to the pouch goes out to the side so the elbow clears the chest
      src[CH.hLX] = src[CH.hLX]! - 0.09 * this.reloadW * crouchK;
      src[CH.hLZ] = src[CH.hLZ]! + 0.05 * this.reloadW * crouchK;
    }
    // attached (hang, climb, crawl) the body belongs to the anchor pose and the hands to the grips: a weapon
    // stowed for it goes to its slot without the swap's reach
    const attachedPose = i.traverse === 'hang' || i.traverse === 'climb' || i.traverse === 'crawl' || i.traverse === 'climbUp' || i.traverse === 'ventDrop';
    if (i.swap >= 0 && !attachedPose) {
      overClip(src, swapClipFor(i.swapFrom, i.swapTo), i.swap, 1);
      this.slot('swap', 1, i.swap);
    }
    if (i.grenade >= 0) {
      overClip(src, GRENADE, i.grenade, 1);
      this.slot('grenade', 1, i.grenade);
    }
    if (i.melee >= 0) {
      const m = Math.sin(Math.PI * clamp(i.melee, 0, 1));
      src[CH.hRX] = p.shoulderHalf * (1 - m * 0.8);
      src[CH.hRY] = shY - 0.25 + m * 0.2;
      src[CH.hRZ] = 0.15 + m * 0.45;
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
    o.offCover = clamp(q[CH.offCover]!, 0, 1);
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
    ly.blind = this.blindS;
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
