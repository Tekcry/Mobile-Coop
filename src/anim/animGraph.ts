/**
 * Layered procedural animation graph. Pure (no Babylon), unit-tested.
 *
 * Lower body: a state machine (locomotion / crouch / air / roll / cover / vault) whose states
 * cross-fade over `FADE` seconds; locomotion itself is a blend tree over idle -> walk -> jog ->
 * sprint driven by ground speed. Upper body: an aim layer (weapon raised vs low-ready, sprint carry,
 * reload, recoil, blind fire) blended separately, plus additive breathing, sway, lean and hit react.
 * The graph outputs IK targets in the character's root space (+Z forward, +Y up, feet at y = 0);
 * the rig turns them into joint rotations.
 */
import type { Proportions } from '../player/proportions';
import { approach, cadence, clamp, gaitFoot, lerp, smoothstep, springStep, type V3 } from './rigMath';

export const FADE = 0.2;
export const LOWER_STATES = ['locomotion', 'crouch', 'air', 'roll', 'cover', 'vault'] as const;
export type LowerState = (typeof LOWER_STATES)[number];

export interface AnimInput {
  /** Horizontal ground speed (m/s) and local movement direction (x right, z forward). */
  speed: number;
  localX: number;
  localZ: number;
  grounded: boolean;
  /** 0 standing .. 1 crouched (target). */
  crouch: number;
  /** Roll progress 0..1, or < 0. */
  roll: number;
  /** Aim pitch (up +) and yaw offset of the aim relative to the body (radians). */
  aimPitch: number;
  aimYaw: number;
  /** 0 relaxed .. 1 weapon raised. */
  aim: number;
  /** Momentary recoil 0..1. */
  kick: number;
  sprint: boolean;
  /** Reload progress 0..1, or < 0. */
  reload: number;
  /** Body yaw rate (rad/s), for turn-in-place steps and lean. */
  yawRate: number;
  /** Holding a weapon (two-hand grip). */
  armed: boolean;
  cover: 'none' | 'low' | 'high';
  /** Lean side while peeking from cover: -1 left, 0, 1 right. */
  peek: number;
  blind: boolean;
  /** Vault progress 0..1, or < 0. */
  vault: number;
  /** Melee swing 0..1, or < 0. */
  melee: number;
}

export function defaultInput(): AnimInput {
  return {
    speed: 0,
    localX: 0,
    localZ: 0,
    grounded: true,
    crouch: 0,
    roll: -1,
    aimPitch: 0,
    aimYaw: 0,
    aim: 0.15,
    kick: 0,
    sprint: false,
    reload: -1,
    yawRate: 0,
    armed: true,
    cover: 'none',
    peek: 0,
    blind: false,
    vault: -1,
    melee: -1,
  };
}

/** Gait blend tree: per-speed stance travel (m), duty factor, foot lift, pelvis bob, arm swing, lean. */
export const GAIT = [
  { speed: 0, stride: 0.3, duty: 0.6, lift: 0.06, bob: 0, swing: 0, lean: 0 },
  { speed: 1.4, stride: 0.75, duty: 0.6, lift: 0.08, bob: 0.022, swing: 0.25, lean: 0.03 },
  { speed: 3.5, stride: 1.0, duty: 0.42, lift: 0.13, bob: 0.045, swing: 0.5, lean: 0.09 },
  { speed: 5.5, stride: 1.3, duty: 0.35, lift: 0.17, bob: 0.06, swing: 0.75, lean: 0.17 },
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

export interface RigTargets {
  /** Pelvis offset from its rest position and rotation (radians). */
  pelvis: { x: number; y: number; z: number; pitch: number; roll: number; yaw: number };
  /** Spine + chest rotation (split between both). */
  spine: { pitch: number; yaw: number; roll: number };
  head: { pitch: number; yaw: number };
  /** Ankle targets in root space, and foot pitch (toe down +). */
  footL: V3;
  footR: V3;
  footPitchL: number;
  footPitchR: number;
  /** Weapon pose relative to the aim pocket: offsets (m) and rotation (rad). */
  weapon: { x: number; y: number; z: number; pitch: number; yaw: number; roll: number };
  /** 1 = both hands on the weapon (IK), 0 = free arms (swing targets below). */
  grip: number;
  /** Off-hand only: 1 = off-hand on the foregrip, 0 = on the magazine (reload) or free. */
  offGrip: number;
  handL: V3;
  handR: V3;
  /** Whole-body tumble (roll) about the hips, radians. */
  tumble: number;
}

export function emptyTargets(): RigTargets {
  return {
    pelvis: { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0 },
    spine: { pitch: 0, yaw: 0, roll: 0 },
    head: { pitch: 0, yaw: 0 },
    footL: { x: 0, y: 0, z: 0 },
    footR: { x: 0, y: 0, z: 0 },
    footPitchL: 0,
    footPitchR: 0,
    weapon: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
    grip: 1,
    offGrip: 1,
    handL: { x: 0, y: 0, z: 0 },
    handR: { x: 0, y: 0, z: 0 },
    tumble: 0,
  };
}

/** Choose the lower-body state (priority order). */
export function pickLower(i: AnimInput): LowerState {
  if (i.roll >= 0) return 'roll';
  if (i.vault >= 0) return 'vault';
  if (!i.grounded) return 'air';
  if (i.cover !== 'none') return 'cover';
  if (i.crouch > 0.5) return 'crouch';
  return 'locomotion';
}

export class AnimGraph {
  readonly weights: Record<LowerState, number> = { locomotion: 1, crouch: 0, air: 0, roll: 0, cover: 0, vault: 0 };
  state: LowerState = 'locomotion';
  phase = 0;
  readonly out = emptyTargets();
  /** Smoothed layer parameters. */
  private crouchS = 0;
  private aimS = 0.15;
  private sprintS = 0;
  private reloadS = 0;
  private blindS = 0;
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

  constructor(private p: Proportions) {}

  private addFeet(L: V3, R: V3, w: number, lx: number, ly: number, lz: number, rx: number, ry: number, rz: number): void {
    L.x += lx * w;
    L.y += ly * w;
    L.z += lz * w;
    R.x += rx * w;
    R.y += ry * w;
    R.z += rz * w;
  }

  setProportions(p: Proportions): void {
    this.p = p;
  }

  /** Additive hit reaction (direction: -1 from the left .. 1 from the right). */
  hit(strength: number, side = 0): void {
    this.hitV += 6 * clamp(strength, 0, 1);
    this.hitSide = side;
  }

  /** Cross-fade the lower-body state weights towards `target` over FADE seconds (sum stays 1). */
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
    const target = pickLower(i);
    // rolls and vaults commit instantly enough to read as one motion
    this.fade(target, dt, target === 'roll' || target === 'vault' ? 0.08 : FADE);
    const W = this.weights;

    // --- smoothed parameters
    const coverCrouch = i.cover === 'low' && !(i.aim > 0.5 && !i.blind) ? 1 : 0;
    this.crouchS = approach(this.crouchS, Math.max(i.crouch, coverCrouch), 0.12, dt);
    this.aimS = approach(this.aimS, i.aim, 0.09, dt);
    this.sprintS = approach(this.sprintS, i.sprint ? 1 : 0, 0.15, dt);
    this.reloadS = approach(this.reloadS, i.reload >= 0 ? 1 : 0, 0.12, dt);
    this.blindS = approach(this.blindS, i.blind ? 1 : 0, 0.1, dt);
    this.peekS = approach(this.peekS, i.peek, 0.12, dt);
    this.gripS = approach(this.gripS, i.armed ? 1 : 0, 0.15, dt);
    this.speedS = approach(this.speedS, i.speed, 0.08, dt);
    const dl = Math.hypot(i.localX, i.localZ);
    if (dl > 0.1 && i.speed > 0.15) {
      this.dirX = approach(this.dirX, i.localX / dl, 0.1, dt);
      this.dirZ = approach(this.dirZ, i.localZ / dl, 0.1, dt);
    }
    const dn = Math.hypot(this.dirX, this.dirZ) || 1;
    const dx = this.dirX / dn;
    const dz = this.dirZ / dn;
    const accel = dt > 0 ? (i.speed - this.prevSpeed) / dt : 0;
    this.prevSpeed = i.speed;
    this.accelLean = approach(this.accelLean, clamp(accel * 0.03, -0.12, 0.12), 0.18, dt);
    this.turnLean = approach(this.turnLean, clamp(-i.yawRate * this.speedS * 0.02, -0.15, 0.15), 0.2, dt);
    // landing compression spring
    if (i.grounded && !this.wasGrounded) this.landV -= clamp(this.airT * 2.2, 0.4, 2.2);
    this.airT = i.grounded ? 0 : this.airT + dt;
    this.wasGrounded = i.grounded;
    [this.land, this.landV] = springStep(this.land, this.landV, 0, 14, dt);
    [this.hitX, this.hitV] = springStep(this.hitX, this.hitV, 0, 16, dt);
    [this.recoil, this.recoilV] = springStep(this.recoil, this.recoilV, i.kick, 30, dt);
    this.breathe += dt;

    // --- gait (feet planted: cadence from ground speed, plus stepping when turning in place)
    const turnStep = this.speedS < 0.4 ? Math.min(1.2, Math.abs(i.yawRate) * 0.35) : 0;
    const gs = Math.max(this.speedS, turnStep);
    const g = gaitAt(gs);
    const crouchK = this.crouchS;
    const stride = g.stride * (1 - crouchK * 0.35) * (p.height / 1.75);
    const duty = g.duty;
    if (i.grounded) this.phase = (this.phase + cadence(gs, stride, duty) * dt) % 1;
    const fL = gaitFoot(this.phase, stride, g.lift, duty);
    const fR = gaitFoot(this.phase + 0.5, stride, g.lift, duty);
    const moving = smoothstep(gs / 0.4);
    const hip = p.hipHalf;
    const footY = p.y.ankle;
    const stanceW = hip * (1 + crouchK * 0.5);

    // --- lower body: per-state contributions blended by weight
    const pel = o.pelvis;
    pel.x = pel.z = pel.yaw = 0;
    let pelY = 0;
    let pelPitch = 0;
    let pelRoll = 0;
    const L = o.footL;
    const R = o.footR;
    L.x = L.y = L.z = R.x = R.y = R.z = 0;
    let tumble = 0;
    const addFeet = this.addFeet;
    const gaitFeet = (w: number, liftK: number): void => {
      if (w <= 0) return;
      const ax = dx * moving;
      const az = dz * moving;
      addFeet(L, R, w, -stanceW + ax * fL.along, footY + fL.up * liftK * moving, az * fL.along + 0.02, stanceW + ax * fR.along, footY + fR.up * liftK * moving, az * fR.along + 0.02);
    };
    // locomotion
    {
      const w = W.locomotion;
      gaitFeet(w, 1);
      const bob = g.bob * Math.cos(this.phase * Math.PI * 4) * moving;
      pelY += w * (bob - g.bob * moving * 0.6 - this.sprintS * 0.03);
      pelPitch += w * (g.lean * dz + this.sprintS * 0.12);
      pelRoll += w * Math.sin(this.phase * Math.PI * 2) * 0.03 * moving;
    }
    // crouch (and low cover share the crouched pose)
    const crouchDrop = 0.36 * (p.height / 1.75);
    {
      const w = W.crouch;
      gaitFeet(w, 0.7);
      pelY += w * -crouchDrop;
      pelPitch += w * 0.32;
    }
    {
      const w = W.cover;
      gaitFeet(w, 0.6);
      pelY += w * -crouchDrop * crouchK;
      pelPitch += w * (0.3 * crouchK + 0.05);
      pel.x += w * this.peekS * 0.12;
      pelRoll += w * -this.peekS * 0.08;
    }
    // air: legs tuck, one forward
    {
      const w = W.air;
      const up = clamp(0.12 + this.airT * 0.3, 0.12, 0.3);
      addFeet(L, R, w, -hip, footY + up, 0.12, hip, footY + up * 0.6, -0.08);
      pelY += w * 0.02;
      pelPitch += w * 0.08;
    }
    // roll: tucked ball tumbling forward about the hips
    {
      const w = W.roll;
      const t = clamp(i.roll, 0, 1);
      tumble += w * smoothstep(t) * Math.PI * 2;
      addFeet(L, R, w, -hip * 0.8, p.y.hip - 0.3, 0.32, hip * 0.8, p.y.hip - 0.25, 0.28);
      pelY += w * -0.32;
      pelPitch += w * 0.6;
    }
    // vault: hips over the top, legs swung to the side
    {
      const w = W.vault;
      const t = clamp(i.vault, 0, 1);
      const arc = Math.sin(Math.PI * t);
      addFeet(L, R, w, -hip + 0.15 * arc, footY + 0.35 * arc, 0.1, hip + 0.25 * arc, footY + 0.3 * arc, 0.05);
      pelY += w * -0.1 * arc;
      pelPitch += w * 0.35 * arc;
    }
    pelY += this.land * 0.1 * (1 - W.roll);
    pel.y = pelY;
    pel.pitch = pelPitch * 0.5 + this.accelLean * 0.5;
    pel.roll = pelRoll + this.turnLean;
    o.tumble = tumble;
    o.footPitchL = fL.planted ? 0 : -0.35 * moving * W.locomotion;
    o.footPitchR = fR.planted ? 0 : -0.35 * moving * W.locomotion;

    // --- upper body: spine/head follow the aim; lean and breathing are additive
    const breath = Math.sin(this.breathe * 1.7) * 0.012;
    const aimPitch = clamp(i.aimPitch, -1.2, 1.2);
    const sp = o.spine;
    sp.pitch = -aimPitch * 0.45 * (0.4 + this.aimS * 0.6) + pelPitch * 0.4 + this.accelLean + breath - this.hitX * 0.12 + this.sprintS * 0.15 + crouchK * 0.15;
    sp.yaw = clamp(i.aimYaw, -0.9, 0.9) * 0.6 + this.aimS * 0.22 * this.gripS;
    sp.roll = this.hitX * 0.1 * this.hitSide - this.peekS * 0.18 * W.cover;
    o.head.pitch = -aimPitch * 0.45 - sp.pitch * 0.3;
    o.head.yaw = clamp(i.aimYaw, -0.9, 0.9) * 0.4 - this.aimS * 0.18 * this.gripS;

    // --- weapon layer (offsets from the aim pocket in chest space)
    const wp = o.weapon;
    const sway = Math.sin(this.breathe * 1.3) * 0.006 + Math.sin(this.phase * Math.PI * 4) * 0.01 * moving * (1 - this.aimS);
    const lowReady = 1 - this.aimS;
    const sprintK = this.sprintS * (1 - this.aimS);
    const reloadK = this.reloadS;
    const rt = i.reload >= 0 ? i.reload : 1;
    wp.x = -0.02 * lowReady - 0.08 * sprintK + this.blindS * (i.cover === 'high' ? this.peekS * 0.22 : 0);
    wp.y = -0.12 * lowReady - 0.1 * sprintK + sway + reloadK * -0.05 + this.blindS * (i.cover === 'low' ? 0.42 : 0.1);
    wp.z = -0.08 * lowReady - this.recoil * 0.05 - 0.06 * sprintK + reloadK * -0.06;
    wp.pitch = 0.5 * lowReady * (1 - sprintK) + 0.55 * sprintK + reloadK * 0.35 * Math.sin(Math.PI * rt) - this.recoil * 0.12;
    wp.yaw = -0.35 * lowReady * (1 - sprintK) - 0.9 * sprintK + this.blindS * (i.cover === 'high' ? this.peekS * 0.3 : 0);
    wp.roll = reloadK * 0.4 * Math.sin(Math.PI * rt) + sprintK * 0.25;
    o.grip = this.gripS;
    // off-hand goes to the magazine for the middle of the reload
    o.offGrip = 1 - reloadK * smoothstep(Math.sin(Math.PI * rt) * 1.6);

    // --- free arms (unarmed, melee, emote fallback): swing opposite the legs
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
    return o;
  }
}
