/**
 * Layered procedural animation graph (tactical / SWAT style). Pure (no Babylon), unit-tested.
 *
 * Lower body: a state machine (locomotion / crouch / kneel / air / slide / cover / traverse) whose
 * states cross-fade by weight over `FADE`; locomotion is a blend tree over the tactical gaits (idle ->
 * creep -> walk -> brisk -> dash) driven by ground speed, with a weapon-led rolling walk: soft knees,
 * level upper body, sidesteps and backsteps whose feet never cross, planted feet locked to the ground.
 * Upper body: the weapon-carry layer (low / high / compressed ready blended by weight, raised on the
 * aim line by `raise`), reload, recoil spring, blind fire; spine/head look-at; additive breathing, sway
 * (scaled by weapon weight), lean, landing compression, hit react and flinch. Stabilisation counter-
 * animates the weapon and head against gait bob so the sight picture stays steady while walking.
 * Output: IK targets in the character's root space (+Z forward, +Y up, feet at y = 0).
 */
import type { Proportions } from '../player/proportions';
import { approach, cadence, clamp, gaitFoot, lerp, smoothstep, springStep, type V3 } from './rigMath';

export const FADE = 0.2;
export const LOWER_STATES = ['locomotion', 'crouch', 'kneel', 'air', 'slide', 'cover', 'traverse'] as const;
export type LowerState = (typeof LOWER_STATES)[number];
export type TraverseKind = 'none' | 'vault' | 'mantle' | 'step';

export interface AnimInput {
  /** Horizontal ground speed (m/s) and local movement direction (x right, z forward). */
  speed: number;
  localX: number;
  localZ: number;
  grounded: boolean;
  /** 0 standing .. 1 crouched (target). */
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
  /** Reload progress 0..1, or < 0. */
  reload: number;
  /** Body yaw rate (rad/s), for turn-in-place steps and lean. */
  yawRate: number;
  /** Holding a weapon (two-hand grip). */
  armed: boolean;
  /** Dash blend 0..1 (low crouched rush). */
  dash: number;
  /** Dash-in slide progress 0..1, or < 0. */
  slide: number;
  /** Landing recovery 0..1. */
  landing: number;
  cover: 'none' | 'low' | 'high';
  /** Which side the cover surface is on, in the character's frame (-1 left, 1 right, 0 none). */
  wallSide: number;
  /** Lean around an edge: -1 left .. 1 right (hips planted). */
  lean: number;
  /** Low cover: rise to aim over the top 0..1. */
  peekOver: number;
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
    yawRate: 0,
    armed: true,
    dash: 0,
    slide: -1,
    landing: 0,
    cover: 'none',
    wallSide: 0,
    lean: 0,
    peekOver: 0,
    blind: false,
    edgeLook: 0,
    traverse: 'none',
    traverseT: 0,
    melee: -1,
    check: -1,
  };
}

/** Tactical gait blend tree: per-speed stance travel (m), duty factor, foot lift, pelvis bob, arm swing, lean. */
export const GAIT = [
  { speed: 0, stride: 0.25, duty: 0.65, lift: 0.05, bob: 0, swing: 0, lean: 0 },
  { speed: 0.6, stride: 0.4, duty: 0.68, lift: 0.05, bob: 0.008, swing: 0.05, lean: 0.03 },
  { speed: 1.2, stride: 0.6, duty: 0.64, lift: 0.07, bob: 0.014, swing: 0.1, lean: 0.05 },
  { speed: 2.0, stride: 0.8, duty: 0.58, lift: 0.09, bob: 0.022, swing: 0.15, lean: 0.08 },
  { speed: 5.5, stride: 1.25, duty: 0.36, lift: 0.16, bob: 0.05, swing: 0.6, lean: 0.25 },
] as const;

export type GaitParams = { stride: number; duty: number; lift: number; bob: number; swing: number; lean: number };

/** Blend-tree lookup: linear between neighbouring gait nodes, clamped at the ends. */
export function gaitAt(speed: number): GaitParams & { weights: number[] } {
  const w = GAIT.map(() => 0);
  const s = Math.max(0, speed);
  let i = GAIT.length - 2;
  for (let j = 0; j < GAIT.length - 1; j++) {
    if (s <= GAIT[j + 1]!.speed) {
      i = j;
      break;
    }
  }
  const a = GAIT[i]!;
  const b = GAIT[i + 1]!;
  const t = clamp((s - a.speed) / (b.speed - a.speed), 0, 1);
  w[i] = 1 - t;
  w[i + 1] = t;
  return {
    stride: lerp(a.stride, b.stride, t),
    duty: lerp(a.duty, b.duty, t),
    lift: lerp(a.lift, b.lift, t),
    bob: lerp(a.bob, b.bob, t),
    swing: lerp(a.swing, b.swing, t),
    lean: lerp(a.lean, b.lean, t),
    weights: w,
  };
}

/**
 * Lateral foot offset for a gait foot. Sideways components keep each foot on its own side: the lead
 * foot steps out and the trail foot closes in, so the feet never cross (the along-travel term is the
 * same for both, keeping planted feet locked).
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
  /** Ankle targets in root space, and foot pitch (toe down +). */
  footL: V3;
  footR: V3;
  footPitchL: number;
  footPitchR: number;
  /** Weapon pose relative to the aim pocket: offsets (m) and rotation (rad). */
  weapon: { x: number; y: number; z: number; pitch: number; yaw: number; roll: number };
  /** 1 = both hands on the weapon (IK), 0 = free arms (swing targets below). */
  grip: number;
  /** Off-hand: 1 = on the foregrip, 0 = on the magazine (reload) or free. */
  offGrip: number;
  /** Off-hand on the cover surface (weight; the rig supplies the world point). */
  offCover: number;
  handL: V3;
  handR: V3;
  /** Whole-body tumble about the hips (unused by tactical states; kept for completeness). */
  tumble: number;
  /** Layer weights for the debug overlay. */
  layers: Record<string, number>;
  /** Vertical weapon bob left after stabilisation (m), for tests and the debug trace. */
  weaponBob: number;
}

export function emptyTargets(): RigTargets {
  return {
    pelvis: { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 },
    spine: { pitch: 0, yaw: 0, roll: 0 },
    head: { pitch: 0, yaw: 0, roll: 0 },
    footL: { x: 0, y: 0, z: 0 },
    footR: { x: 0, y: 0, z: 0 },
    footPitchL: 0,
    footPitchR: 0,
    weapon: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
    grip: 1,
    offGrip: 1,
    offCover: 0,
    handL: { x: 0, y: 0, z: 0 },
    handR: { x: 0, y: 0, z: 0 },
    tumble: 0,
    layers: {},
    weaponBob: 0,
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
export const READY_POSES = {
  low: { x: -0.03, y: -0.13, z: -0.05, pitch: 0.7, yaw: -0.12, roll: 0.05 },
  high: { x: -0.03, y: 0.07, z: -0.12, pitch: -1.0, yaw: -0.08, roll: 0 },
  compressed: { x: -0.12, y: -0.1, z: -0.2, pitch: 0.3, yaw: -0.4, roll: 0.22 },
} as const;

export class AnimGraph {
  readonly weights: Record<LowerState, number> = { locomotion: 1, crouch: 0, kneel: 0, air: 0, slide: 0, cover: 0, traverse: 0 };
  state: LowerState = 'locomotion';
  phase = 0;
  readonly out = emptyTargets();
  /** Smoothed layer parameters. */
  private crouchS = 0;
  private raiseS = 0;
  private dashS = 0;
  private reloadS = 0;
  private blindS = 0;
  private leanS = 0;
  private peekS = 0;
  private gripS = 1;
  private speedS = 0;
  private dirX = 0;
  private dirZ = 1;
  private prevSpeed = 0;
  private accelLean = 0;
  private turnLean = 0;
  private land = 0;
  private landV = 0;
  private wasGrounded = true;
  private airT = 0;
  private hitX = 0;
  private hitV = 0;
  private hitSide = 0;
  private breathe = Math.random() * 10;
  private recoil = 0;
  private recoilV = 0;
  private wallS = 0;
  private edgeS = 0;
  private coverLowS = 0;
  private yawLag = 0;
  private yawLagV = 0;

  constructor(private p: Proportions) {}

  setProportions(p: Proportions): void {
    this.p = p;
  }

  private addFeet(L: V3, R: V3, w: number, lx: number, ly: number, lz: number, rx: number, ry: number, rz: number): void {
    L.x += lx * w;
    L.y += ly * w;
    L.z += lz * w;
    R.x += rx * w;
    R.y += ry * w;
    R.z += rz * w;
  }

  /** Additive hit reaction / flinch (side: -1 from the left .. 1 from the right). */
  hit(strength: number, side = 0): void {
    this.hitV += 6 * clamp(strength, 0, 1);
    this.hitSide = side;
  }

  /** Cross-fade the lower-body state weights towards `target` over `fade` seconds (sum stays 1). */
  fade(target: LowerState, dt: number, fade = FADE): void {
    this.state = target;
    const step = fade > 0 ? dt / fade : 1;
    let sum = 0;
    for (const s of LOWER_STATES) {
      const w = this.weights[s];
      this.weights[s] = s === target ? Math.min(1, w + step) : Math.max(0, w - step);
      sum += this.weights[s];
    }
    for (const s of LOWER_STATES) this.weights[s] /= sum || 1;
  }

  update(dt: number, i: AnimInput): RigTargets {
    const p = this.p;
    const o = this.out;
    const k = p.height / 1.75;
    const target = pickLower(i);
    this.fade(target, dt, target === 'slide' || target === 'traverse' ? 0.1 : target === 'kneel' ? 0.35 : FADE);
    const W = this.weights;
    const mass = clamp(i.weight, 0.5, 1.6);

    // --- smoothed parameters (time constants scale with weapon mass where the weapon moves)
    this.crouchS = approach(this.crouchS, i.crouch, 0.1, dt);
    this.raiseS = approach(this.raiseS, i.raise, 0.03, dt);
    this.dashS = approach(this.dashS, i.dash, 0.12, dt);
    this.reloadS = approach(this.reloadS, i.reload >= 0 ? 1 : 0, 0.12 * mass, dt);
    this.blindS = approach(this.blindS, i.blind ? 1 : 0, 0.12 * mass, dt);
    this.leanS = approach(this.leanS, i.lean, 0.14, dt);
    this.peekS = approach(this.peekS, i.peekOver, 0.14, dt);
    this.gripS = approach(this.gripS, i.armed ? 1 : 0, 0.15, dt);
    this.speedS = approach(this.speedS, i.speed, 0.08, dt);
    this.wallS = approach(this.wallS, i.wallSide, 0.18, dt);
    this.edgeS = approach(this.edgeS, i.edgeLook, 0.2, dt);
    this.coverLowS = approach(this.coverLowS, i.cover === 'low' ? 1 : 0, 0.15, dt);
    const dl = Math.hypot(i.localX, i.localZ);
    if (dl > 0.1 && i.speed > 0.1) {
      this.dirX = approach(this.dirX, i.localX / dl, 0.12, dt);
      this.dirZ = approach(this.dirZ, i.localZ / dl, 0.12, dt);
    }
    const dn = Math.hypot(this.dirX, this.dirZ) || 1;
    const dx = this.dirX / dn;
    const dz = this.dirZ / dn;
    const accel = dt > 0 ? (i.speed - this.prevSpeed) / dt : 0;
    this.prevSpeed = i.speed;
    this.accelLean = approach(this.accelLean, clamp(accel * 0.025, -0.1, 0.1) * dz, 0.2, dt);
    this.turnLean = approach(this.turnLean, clamp(-i.yawRate * this.speedS * 0.015, -0.1, 0.1), 0.22, dt);
    // torso/weapon follow-through behind fast turns (mass-weighted)
    [this.yawLag, this.yawLagV] = springStep(this.yawLag, this.yawLagV, clamp(-i.yawRate * 0.04 * mass, -0.25, 0.25), 10 / mass, dt);
    if (i.grounded && !this.wasGrounded) this.landV -= clamp(this.airT * 2.2, 0.4, 2.2);
    this.airT = i.grounded ? 0 : this.airT + dt;
    this.wasGrounded = i.grounded;
    [this.land, this.landV] = springStep(this.land, this.landV, -i.landing * 0.6, 14, dt);
    [this.hitX, this.hitV] = springStep(this.hitX, this.hitV, 0, 16, dt);
    [this.recoil, this.recoilV] = springStep(this.recoil, this.recoilV, i.kick, 28 / Math.sqrt(mass), dt);
    this.breathe += dt;

    // --- gait: planted feet (cadence from ground speed), stepping when turning in place
    const turnStep = this.speedS < 0.3 ? Math.min(0.9, Math.abs(i.yawRate) * 0.3) : 0;
    const gs = Math.max(this.speedS, turnStep);
    const g = gaitAt(gs);
    const crouchK = this.crouchS;
    const stride = g.stride * (1 - crouchK * 0.3) * k;
    const duty = g.duty;
    if (i.grounded) this.phase = (this.phase + cadence(gs, stride, duty) * dt) % 1;
    const fL = gaitFoot(this.phase, stride, g.lift, duty);
    const fR = gaitFoot(this.phase + 0.5, stride, g.lift, duty);
    const moving = smoothstep(gs / 0.3);
    const hip = p.hipHalf;
    const footY = p.y.ankle;
    // tactical stance: feet about shoulder width, support (left) foot slightly forward
    const stanceW = hip * 1.25 * (1 + crouchK * 0.35);
    const supportZ = 0.07 * k * (1 - moving * 0.7);

    const pel = o.pelvis;
    pel.x = pel.z = pel.yaw = 0;
    let pelY = 0;
    let pelPitch = 0;
    let pelRoll = 0;
    const L = o.footL;
    const R = o.footR;
    L.x = L.y = L.z = R.x = R.y = R.z = 0;
    let pitchL = 0;
    let pitchR = 0;
    const addFeet = this.addFeet;
    const ax = dx * moving;
    const az = dz * moving;
    const gaitFeet = (w: number, liftK: number): void => {
      if (w <= 0) return;
      addFeet(
        L,
        R,
        w,
        -stanceW + lateralOffset(ax, fL.along, stride, -1),
        footY + fL.up * liftK * moving,
        az * fL.along + supportZ,
        stanceW + lateralOffset(ax, fR.along, stride, 1),
        footY + fR.up * liftK * moving,
        az * fR.along - supportZ * 0.5,
      );
      pitchL += w * (fL.planted ? 0 : -0.3 * moving);
      pitchR += w * (fR.planted ? 0 : -0.3 * moving);
    };
    // gait bob (the part stabilisation removes from the weapon and head)
    const bobRaw = g.bob * Math.cos(this.phase * Math.PI * 4) * moving;
    // locomotion: soft knees, slight forward lean, dash = low crouched rush
    {
      const w = W.locomotion;
      gaitFeet(w, 1);
      pelY += w * (bobRaw - 0.04 * k - this.dashS * 0.1 * k);
      pelPitch += w * (0.08 + g.lean * dz * (1 - this.dashS) + this.dashS * 0.3);
      pelRoll += w * Math.sin(this.phase * Math.PI * 2) * 0.02 * moving;
    }
    const crouchDrop = 0.36 * k;
    {
      const w = W.crouch;
      gaitFeet(w, 0.7);
      pelY += w * (-crouchDrop + bobRaw * 0.6);
      pelPitch += w * 0.3;
    }
    // kneel: rear (right) knee down, front foot planted forward
    const kneelDrop = 0.5 * k;
    {
      const w = W.kneel;
      addFeet(L, R, w, -stanceW * 0.9, footY, 0.3 * k, stanceW * 0.8, footY + 0.06 * k, -0.34 * k);
      pitchR += w * 1.25;
      pelY += w * -kneelDrop;
      pelPitch += w * 0.12;
    }
    // cover: side-on, shoulder to the surface; low cover kneels, high cover stands flush
    {
      const w = W.cover;
      if (w > 0) {
        const low = this.coverLowS * (1 - this.peekS * 0.75);
        // feet: kneel pattern behind low cover, shoulder-width stance at high cover; sidesteps use the gait
        const stepping = moving;
        addFeet(L, R, w * (1 - stepping) * low, -stanceW * 0.9, footY, 0.28 * k, stanceW * 0.8, footY + 0.06 * k, -0.32 * k);
        addFeet(L, R, w * (1 - stepping) * (1 - low), -stanceW, footY, 0.04, stanceW, footY, -0.04);
        gaitFeet(w * stepping, 0.6);
        pitchR += w * (1 - stepping) * low * 1.25;
        pelY += w * (-(kneelDrop * (1 - stepping) + crouchDrop * stepping) * low - 0.03 * (1 - low));
        pelPitch += w * (0.1 + 0.2 * low * stepping);
        // shoulder against the wall: hips shift and the torso rests towards it
        pel.x += w * this.wallS * 0.04 * k;
        pelRoll += w * this.wallS * 0.05;
      }
    }
    // air (drops): legs ready for the landing
    {
      const w = W.air;
      const up = clamp(0.1 + this.airT * 0.25, 0.1, 0.25);
      addFeet(L, R, w, -hip, footY + up, 0.08, hip, footY + up * 0.7, -0.05);
      pelPitch += w * 0.1;
    }
    // dash-in slide: low, lead leg forward, trail leg folded, torso upright towards the cover
    {
      const w = W.slide;
      if (w > 0) {
        const t = clamp(i.slide, 0, 1);
        const s = Math.sin(Math.PI * Math.min(1, t * 1.2));
        addFeet(L, R, w, -hip, footY + 0.02, 0.45 * k * s + 0.1, hip * 0.9, footY + 0.05, -0.25 * k);
        pitchL += w * -0.4 * s;
        pitchR += w * 1.0;
        pelY += w * -0.55 * k * (0.4 + 0.6 * s);
        pelPitch += w * -0.12 * s;
      }
    }
    // traversal: vault (legs swing over), mantle (hands up, knees tucked), step (high knee)
    {
      const w = W.traverse;
      if (w > 0) {
        const t = clamp(i.traverseT, 0, 1);
        const arc = Math.sin(Math.PI * t);
        if (i.traverse === 'vault') {
          addFeet(L, R, w, -hip + 0.15 * arc, footY + 0.35 * arc, 0.1, hip + 0.25 * arc, footY + 0.3 * arc, 0.05);
          pelY += w * -0.1 * arc;
          pelPitch += w * 0.35 * arc;
        } else if (i.traverse === 'mantle') {
          const tuck = Math.sin(Math.PI * clamp(t * 1.3, 0, 1));
          addFeet(L, R, w, -hip, footY + 0.45 * tuck, 0.15 * tuck, hip, footY + 0.3 * tuck, -0.05);
          pelPitch += w * 0.45 * tuck;
          pelY += w * -0.15 * tuck;
        } else {
          addFeet(L, R, w, -hip, footY + 0.3 * arc, 0.2 * arc, hip, footY, -0.05);
          pelPitch += w * 0.1 * arc;
        }
      }
    }
    pelY += this.land * 0.12 * k;
    pel.y = pelY;
    pel.pitch = pelPitch * 0.5 + this.accelLean * 0.5;
    pel.roll = pelRoll + this.turnLean;
    o.tumble = 0;
    o.footPitchL = pitchL;
    o.footPitchR = pitchR;

    // --- upper body: spine/head follow the aim; lean around edges with the hips planted
    const breath = Math.sin(this.breathe * 1.6) * 0.01;
    const aimPitch = clamp(i.aimPitch, -1.2, 1.2);
    const raise = this.raiseS;
    const sp = o.spine;
    // stabilisation: the spine counters the pelvis tilt/bob so the chest (and weapon) stay level
    sp.pitch = -aimPitch * 0.45 * (0.35 + raise * 0.65) + pelPitch * 0.35 + this.accelLean + breath - this.hitX * 0.12 + this.dashS * 0.2 + crouchK * 0.1;
    sp.yaw = clamp(i.aimYaw, -0.9, 0.9) * 0.6 + raise * 0.2 * this.gripS + this.yawLag;
    const lean = this.leanS;
    sp.roll = this.hitX * 0.1 * this.hitSide - lean * 0.38 - pel.roll * 0.8;
    pel.x += lean * 0.1 * k;
    // head: steady (counter-bob), looks along the aim, glances at edges and sweeps on doorway checks
    const check = i.check >= 0 ? Math.sin(i.check * Math.PI * 2) * 0.65 * Math.sin(Math.PI * i.check) : 0;
    o.head.pitch = -aimPitch * 0.45 - sp.pitch * 0.3 + bobRaw * 2;
    o.head.yaw = clamp(i.aimYaw, -0.9, 0.9) * 0.4 - raise * 0.18 * this.gripS + this.edgeS * 0.45 + check;
    o.head.roll = lean * 0.2;

    // --- weapon layer: ready positions blended by weight, raised by `raise`; additive reload/blind/recoil/sway
    const wp = o.weapon;
    const rl = READY_POSES.low;
    const rh = READY_POSES.high;
    const rc = READY_POSES.compressed;
    const cl = i.carryLow;
    const ch = i.carryHigh;
    const cc = i.carryComp;
    const ready = 1 - raise;
    const reloadK = this.reloadS;
    const rt = i.reload >= 0 ? i.reload : 1;
    const sway = (Math.sin(this.breathe * 1.3) * 0.005 + Math.sin(this.breathe * 0.7) * 0.003) * mass * (1 - (i.kneel ? 0.5 : 0));
    // stabilisation: remove most of the gait bob from the weapon (residual reported as weaponBob)
    const bobComp = -bobRaw * 0.85 * (W.locomotion + W.crouch * 0.6);
    const blindLow = i.cover === 'low' ? 1 : 0;
    wp.x = ready * (rl.x * cl + rh.x * ch + rc.x * cc) + this.blindS * (1 - blindLow) * lean * 0.22;
    wp.y = ready * (rl.y * cl + rh.y * ch + rc.y * cc) + sway + bobComp + reloadK * -0.05 + this.blindS * (blindLow ? 0.42 : 0.1);
    wp.z = ready * (rl.z * cl + rh.z * ch + rc.z * cc) - this.recoil * 0.05 / Math.sqrt(mass) + reloadK * -0.06;
    wp.pitch = ready * (rl.pitch * cl + rh.pitch * ch + rc.pitch * cc) + reloadK * 0.35 * Math.sin(Math.PI * rt) - this.recoil * 0.12 / mass + sway * 2;
    wp.yaw = ready * (rl.yaw * cl + rh.yaw * ch + rc.yaw * cc) + this.blindS * (1 - blindLow) * lean * 0.3 + check * 0.6 * ready + this.edgeS * 0.25 * ready;
    wp.roll = ready * (rl.roll * cl + rh.roll * ch + rc.roll * cc) + reloadK * 0.4 * Math.sin(Math.PI * rt);
    o.weaponBob = bobRaw + bobComp;
    o.grip = this.gripS;
    // off hand: magazine mid-reload; on the cover surface when settled in cover at the ready
    o.offGrip = 1 - reloadK * smoothstep(Math.sin(Math.PI * rt) * 1.6);
    o.offCover = W.cover * ready * (1 - moving) * (1 - reloadK) * 0.8;

    // --- free arms (unarmed, melee): swing opposite the legs
    const swing = g.swing * moving * Math.sin(this.phase * Math.PI * 2);
    const shY = p.y.shoulder + pelY;
    const armLen = p.upperArm.len + p.forearm.len;
    o.handL.x = -p.shoulderHalf - 0.06;
    o.handL.y = shY - armLen * 0.92 + Math.abs(swing) * 0.06;
    o.handL.z = 0.05 + swing * 0.3;
    o.handR.x = p.shoulderHalf + 0.06;
    o.handR.y = shY - armLen * 0.92 + Math.abs(swing) * 0.06;
    o.handR.z = 0.05 - swing * 0.3;
    if (i.melee >= 0) {
      const m = Math.sin(Math.PI * clamp(i.melee, 0, 1));
      o.handR.x = p.shoulderHalf * (1 - m * 0.8);
      o.handR.y = shY - 0.25 + m * 0.2;
      o.handR.z = 0.15 + m * 0.45;
    }

    // --- layer weights (debug overlay)
    const ly = o.layers;
    for (const s of LOWER_STATES) ly[s] = W[s];
    ly.raise = raise;
    ly.low = ready * cl;
    ly.high = ready * ch;
    ly.compressed = ready * cc;
    ly.reload = reloadK;
    ly.blind = this.blindS;
    ly.lean = Math.abs(lean);
    ly.dash = this.dashS;
    ly.hit = Math.min(1, Math.abs(this.hitX) * 4);
    return o;
  }
}
