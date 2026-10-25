/**
 * (anim-weight) The Weight layers: procedural weight on the local player's movement and pose, tuned by the tuner's
 * Weight section (`src/player/weightTune.ts` registers it; `docs/archive/anim-tuner/WEIGHT.md`). Pure and Babylon-free.
 *
 * Every slider's identity (its default) reproduces today's output exactly: a `mul` is x1 and an `add` is +0, every
 * layer whose amount is 0 writes exactly 0 and skips its maths, and the pose hook (`weightApplyPose`) only runs while
 * a layer is non-zero (`WEIGHT_POSE.on`).
 *
 * - Momentum (gameplay, owner side): `WEIGHT_MOVE` scales the Chaos Theory pace spring's start / stop times and the
 *   turn rate caps, and `stopSettle` lets the stop spring overshoot and settle back (motion.ts reads it, inside the
 *   local player's `weightSim` window only).
 * - Lean, foot-plant loading, secondary springs, anticipation (visual, local pose only): `WeightLayers.step` once per
 *   render frame before the local rig's animate, `weightApplyPose` in the graph's `writeTargets`.
 * - Camera signal: `WEIGHT_CAM` (a follow lag offset and a landing dip) for the camera section to read; nothing reads
 *   it yet.
 *
 * No allocation per frame: the state is preallocated and every step is plain arithmetic.
 */
import { TUNE_BANDS } from './tune';

export const WEIGHT_GROUPS = ['weight.walk', 'weight.jog', 'weight.run', 'weight.crouch', 'weight.drawn'] as const;
export type WeightGroup = (typeof WEIGHT_GROUPS)[number];

/** The group for a state: crouched first, then a weapon in hand (drawn), then the holstered gait by speed (m/s). */
export function weightGroupFor(crouched: boolean, drawn: boolean, speed: number): WeightGroup {
  if (crouched) return 'weight.crouch';
  if (drawn) return 'weight.drawn';
  return speed < TUNE_BANDS.walk ? 'weight.walk' : speed < TUNE_BANDS.jog ? 'weight.jog' : 'weight.run';
}

/** The base values the multipliers scale (only read off identity). */
export const WEIGHT_BASE = {
  /** Secondary spring frequencies (Hz) and damping ratio (1 = critically damped). */
  chestHz: 2.2,
  headHz: 3,
  armHz: 2.6,
  gearHz: 1.8,
  zeta: 1,
  /** Foot-plant load pulse (s). */
  plantTime: 0.18,
  /** Landing load pulse (s): this plus `landTimePerM` per metre fallen; the fall counts up to `landMaxFall` m. */
  landTime: 0.2,
  landTimePerM: 0.12,
  landMaxFall: 6,
  /** Anticipation wind-up pulse (s), and its spine pitch (rad) per metre of dip. */
  antTime: 0.12,
  antPitchPerM: 4,
  /** Lean filters (s): the body-frame acceleration and the turn's centripetal acceleration. */
  accelTau: 0.08,
  /** Clamps: spine and head offsets (rad), hand / gear offsets (m), the pelvis drop (m). */
  maxRot: 0.6,
  maxPos: 0.15,
  maxDrop: 0.3,
} as const;

/** Every slider (ids are the section's fields). Ranges are the panel's; `wide ranges` doubles them. */
export interface WeightValues extends Record<string, number> {
  startMul: number;
  stopMul: number;
  turnMul: number;
  turnRunMul: number;
  stopSettle: number;
  accelLean: number;
  stopLean: number;
  bank: number;
  plantDrop: number;
  plantTimeMul: number;
  landDepth: number;
  landTimeMul: number;
  chestLag: number;
  chestHzMul: number;
  chestDampMul: number;
  headLag: number;
  headHzMul: number;
  headDampMul: number;
  armLag: number;
  armHzMul: number;
  armDampMul: number;
  gearLag: number;
  gearHzMul: number;
  gearDampMul: number;
  antStart: number;
  antJump: number;
  antTimeMul: number;
  camLag: number;
  camDip: number;
}

export interface WeightTunableDef {
  id: keyof WeightValues & string;
  label: string;
  kind: 'mul' | 'add';
  def: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  hook: string;
}

const M = (id: WeightTunableDef['id'], label: string, min: number, max: number, hook: string): WeightTunableDef => ({ id, label, kind: 'mul', def: 1, min, max, step: 0.01, unit: 'x', hook });
const A = (id: WeightTunableDef['id'], label: string, max: number, step: number, unit: string, hook: string): WeightTunableDef => ({ id, label, kind: 'add', def: 0, min: 0, max, step, unit, hook });

/** The Weight section's sliders, in panel order (every group shows every slider). */
export const WEIGHT_TUNABLES: readonly WeightTunableDef[] = [
  // 1. momentum (gameplay)
  M('startMul', 'momentum: time to speed (gameplay)', 0.3, 3, 'motion.ts stepCt: CT.startTime x (the pace spring speeding up)'),
  M('stopMul', 'momentum: stop time / distance (gameplay)', 0.3, 3, 'motion.ts stepCt + ctStopDistance: CT.stopTime x (the pace spring slowing; the slide grows with it)'),
  M('turnMul', 'momentum: turn rate, slow (gameplay)', 0.3, 2, 'motion.ts updateYaw: CT.turnRate x (the cap up to a jog)'),
  M('turnRunMul', 'momentum: turn rate, at a run (gameplay)', 0.3, 2, 'motion.ts updateYaw: CT.turnRateRun x (the cap at the full run)'),
  A('stopSettle', 'momentum: stop overshoot and settle (gameplay)', 0.6, 0.01, '1-zeta', 'motion.ts stepCt: the stop spring damping ratio 1 - this (0 = critically damped, today)'),
  // 2. lean (visual)
  A('accelLean', 'lean into acceleration', 3, 0.05, 'deg/(m/s2)', 'animGraph writeTargets: spine pitch forward x the speeding-up acceleration'),
  A('stopLean', 'counter-lean on stops', 3, 0.05, 'deg/(m/s2)', 'animGraph writeTargets: spine pitch back x the braking'),
  A('bank', 'bank into turns', 2, 0.02, 'deg/(m/s2)', 'animGraph writeTargets: spine roll into the turn x speed x turn rate'),
  // 3. foot-plant loading (visual)
  A('plantDrop', 'plant load: pelvis drop', 0.05, 0.001, 'm', 'animGraph writeTargets: pelvis y down at each foot plant (the planted knee compresses)'),
  M('plantTimeMul', 'plant load: recovery time', 0.3, 3, 'weight.ts WEIGHT_BASE.plantTime (0.18 s)'),
  A('landDepth', 'landing: depth per metre fallen', 0.1, 0.002, 'm/m', 'animGraph writeTargets: pelvis y down on a landing x the fall height (to 6 m)'),
  M('landTimeMul', 'landing: recovery time', 0.3, 3, 'weight.ts WEIGHT_BASE.landTime + landTimePerM x fall (0.2 s + 0.12 s/m)'),
  // 4. secondary motion (visual): a spring on the body velocity per part; the output is its lag
  A('chestLag', 'chest spring: lag', 15, 0.1, 'deg/(m/s)', 'animGraph writeTargets: spine pitch / roll x the chest spring lag'),
  M('chestHzMul', 'chest spring: stiffness', 0.3, 3, 'weight.ts WEIGHT_BASE.chestHz (2.2 Hz)'),
  M('chestDampMul', 'chest spring: damping', 0.2, 2, 'weight.ts WEIGHT_BASE.zeta (1, critically damped)'),
  A('headLag', 'head spring: lag', 15, 0.1, 'deg/(m/s)', 'animGraph writeTargets: head pitch / roll x the head spring lag'),
  M('headHzMul', 'head spring: stiffness', 0.3, 3, 'weight.ts WEIGHT_BASE.headHz (3 Hz)'),
  M('headDampMul', 'head spring: damping', 0.2, 2, 'weight.ts WEIGHT_BASE.zeta (1)'),
  A('armLag', 'arm spring: lag', 0.06, 0.001, 'm/(m/s)', 'animGraph writeTargets: both hand targets and the held weapon x the arm spring lag'),
  M('armHzMul', 'arm spring: stiffness', 0.3, 3, 'weight.ts WEIGHT_BASE.armHz (2.6 Hz)'),
  M('armDampMul', 'arm spring: damping', 0.2, 2, 'weight.ts WEIGHT_BASE.zeta (1)'),
  A('gearLag', 'carried gear spring: lag', 0.06, 0.001, 'm/(m/s)', 'weaponModel weightGear: the slung / back-carried guns in their slot x the gear spring lag'),
  M('gearHzMul', 'carried gear spring: stiffness', 0.3, 3, 'weight.ts WEIGHT_BASE.gearHz (1.8 Hz)'),
  M('gearDampMul', 'carried gear spring: damping', 0.2, 2, 'weight.ts WEIGHT_BASE.zeta (1)'),
  // 5. anticipation (visual; never delays input)
  A('antStart', 'anticipation: start dip', 0.05, 0.001, 'm', 'animGraph writeTargets: pelvis dip + spine pitch as a start from rest begins (no input delay)'),
  A('antJump', 'anticipation: jump / vault dip', 0.08, 0.001, 'm', 'animGraph writeTargets: pelvis dip + spine pitch as a vault / mantle / hop begins (no input delay)'),
  M('antTimeMul', 'anticipation: wind-up time', 0.3, 3, 'weight.ts WEIGHT_BASE.antTime (0.12 s)'),
  // 6. camera signal (exposed only: the camera does not read it yet)
  A('camLag', 'camera signal: follow lag', 0.5, 0.01, 's', 'weight.ts WEIGHT_CAM.lagX / lagY / lagZ (a lagged body position minus the body; the camera section may read it)'),
  A('camDip', 'camera signal: load dip share', 2, 0.05, 'x', 'weight.ts WEIGHT_CAM.dip (this x the plant and landing pelvis drop; the camera section may read it)'),
];

/** The momentum values motion.ts reads (identity outside the local player's `weightSim` window). */
export const WEIGHT_MOVE = { startMul: 1, stopMul: 1, turnMul: 1, turnRunMul: 1, stopSettle: 0 };

/** Load the momentum values (null: identity). No allocation. */
export function weightMoveLoad(v: Readonly<WeightValues> | null): void {
  const m = WEIGHT_MOVE;
  if (!v) {
    m.startMul = m.stopMul = m.turnMul = m.turnRunMul = 1;
    m.stopSettle = 0;
    return;
  }
  m.startMul = v.startMul;
  m.stopMul = v.stopMul;
  m.turnMul = v.turnMul;
  m.turnRunMul = v.turnRunMul;
  m.stopSettle = v.stopSettle;
}

/** A spring's state (position, velocity). */
export interface SpringXV {
  x: number;
  v: number;
}

/**
 * One damped spring step toward `target`: omega (rad/s), damping ratio `zeta`, over `dt` s. Exact closed form for
 * under-, critically and over-damped springs (stable at any dt). No allocation.
 */
export function springStep(s: SpringXV, target: number, omega: number, zeta: number, dt: number): void {
  if (!(dt > 0) || !(omega > 0)) return;
  const d = s.x - target;
  const v = s.v;
  const z = zeta > 0 ? zeta : 0;
  if (Math.abs(z - 1) < 1e-4) {
    const e = Math.exp(-omega * dt);
    const t1 = (v + omega * d) * dt;
    s.x = target + (d + t1) * e;
    s.v = (v - omega * t1) * e;
    return;
  }
  if (z < 1) {
    const wd = omega * Math.sqrt(1 - z * z);
    const e = Math.exp(-z * omega * dt);
    const c = Math.cos(wd * dt);
    const sn = Math.sin(wd * dt);
    s.x = target + e * (d * c + ((v + z * omega * d) / wd) * sn);
    s.v = e * (v * c - ((omega * omega * d + z * omega * v) / wd) * sn);
    return;
  }
  // over-damped: two real roots r1, r2 < 0
  const q = omega * Math.sqrt(z * z - 1);
  const r1 = -z * omega + q;
  const r2 = -z * omega - q;
  const c2 = (v - r1 * d) / (r2 - r1);
  const c1 = d - c2;
  const e1 = Math.exp(r1 * dt);
  const e2 = Math.exp(r2 * dt);
  s.x = target + c1 * e1 + c2 * e2;
  s.v = c1 * r1 * e1 + c2 * r2 * e2;
}

/** A load pulse 0 -> 1 -> 0 over u in [0, 1]: a quick quarter-sine in (the first quarter), a cosine recovery. */
export function loadPulse(u: number): number {
  if (!(u > 0) || u >= 1) return 0;
  if (u < 0.25) return Math.sin((u / 0.25) * (Math.PI / 2));
  return 0.5 + 0.5 * Math.cos((Math.PI * (u - 0.25)) / 0.75);
}

/** The pose offsets the graph adds (body frame: x right, y up, z forward; rad, m). `on`: any non-zero. */
export const WEIGHT_POSE = {
  on: false,
  pelY: 0,
  spPitch: 0,
  spRoll: 0,
  hdPitch: 0,
  hdRoll: 0,
  armX: 0,
  armY: 0,
  armZ: 0,
  gearX: 0,
  gearY: 0,
  gearZ: 0,
};

/**
 * The camera signal (world metres): `lagX / lagY / lagZ` a lagged body position minus the body (add it to a follow
 * target to trail the body), `dip` the load drop the camera may follow down (positive = down). Exposed only.
 */
export const WEIGHT_CAM = { lagX: 0, lagY: 0, lagZ: 0, dip: 0 };

/** One render frame of the local player (written by player.ts; no allocation). */
export interface WeightFrameIn {
  dt: number;
  /** The rendered body root (world m) and its yaw (rad; 0 = +Z, + toward +X). */
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Horizontal speed (m/s), the body-frame forward acceleration (m/s2), the body's yaw rate (rad/s). */
  speed: number;
  accelFwd: number;
  yawRate: number;
  grounded: boolean;
  /** A foot planted last frame. */
  plant: boolean;
  /** The landing counter and the last fall height (m). */
  landings: number;
  fall: number;
  /** A start from rest began this frame. */
  start: boolean;
  /** A vault / mantle / hop / jump began this frame. */
  jump: boolean;
  /** The teleport counter (a jump in position resets the springs). */
  teleports: number;
}

/** The traversals that count as a jump / vault for the anticipation (animGraph `TraverseKind`). */
export function weightJumpKind(t: string): boolean {
  return t === 'vault' || t === 'mantle' || t === 'hop' || t === 'windowVault' || t === 'wallKick' || t === 'climbUp';
}

export function weightFrameIn(): WeightFrameIn {
  return { dt: 0, x: 0, y: 0, z: 0, yaw: 0, speed: 0, accelFwd: 0, yawRate: 0, grounded: true, plant: false, landings: 0, fall: 0, start: false, jump: false, teleports: 0 };
}

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const MAX_V = 15;

function clampAbs(v: number, m: number): number {
  return v > m ? m : v < -m ? -m : v;
}

/** One secondary spring: three channels (world x, y, z) chasing the body velocity. */
class Spring3 {
  readonly x: SpringXV = { x: 0, v: 0 };
  readonly y: SpringXV = { x: 0, v: 0 };
  readonly z: SpringXV = { x: 0, v: 0 };
  /** The lag (spring minus body velocity) in the body frame: forward, side (right), up. */
  f = 0;
  s = 0;
  u = 0;
  seed(vx: number, vy: number, vz: number): void {
    this.x.x = vx;
    this.y.x = vy;
    this.z.x = vz;
    this.x.v = this.y.v = this.z.v = 0;
    this.f = this.s = this.u = 0;
  }
  step(vx: number, vy: number, vz: number, omega: number, zeta: number, dt: number, sy: number, cy: number): void {
    springStep(this.x, vx, omega, zeta, dt);
    springStep(this.y, vy, omega, zeta, dt);
    springStep(this.z, vz, omega, zeta, dt);
    const lx = this.x.x - vx;
    const lz = this.z.x - vz;
    this.f = lx * sy + lz * cy;
    this.s = lx * cy - lz * sy;
    this.u = this.y.x - vy;
  }
}

/**
 * The visual layers' state for one character (the local player): springs, pulses and filters. `step` writes
 * `WEIGHT_POSE` and `WEIGHT_CAM`; a layer at identity writes exactly 0.
 */
export class WeightLayers {
  readonly chest = new Spring3();
  readonly head = new Spring3();
  readonly arm = new Spring3();
  readonly gear = new Spring3();
  private init = false;
  private px = 0;
  private py = 0;
  private pz = 0;
  private teleports = 0;
  private landings = 0;
  /** Filtered body-frame acceleration and centripetal acceleration (m/s2). */
  accelF = 0;
  turnF = 0;
  /** Pulse clocks (s; -1 idle) and amplitudes (m). */
  plantT = -1;
  landT = -1;
  landAmp = 0;
  landDur = 0;
  antT = -1;
  antAmp = 0;
  /** The camera's lagged position. */
  private cx = 0;
  private cy = 0;
  private cz = 0;

  reset(): void {
    this.init = false;
    this.plantT = this.landT = this.antT = -1;
    this.accelF = this.turnF = 0;
  }

  /** One frame: the layers from the frame `i` and the values `v` (the section's eased current values). */
  step(i: WeightFrameIn, v: Readonly<WeightValues>): void {
    const P = WEIGHT_POSE;
    const C = WEIGHT_CAM;
    const B = WEIGHT_BASE;
    const dt = i.dt > 0.1 ? 0.1 : i.dt;
    if (!this.init || i.teleports !== this.teleports) {
      this.init = true;
      this.teleports = i.teleports;
      this.landings = i.landings;
      this.px = this.cx = i.x;
      this.py = this.cy = i.y;
      this.pz = this.cz = i.z;
      this.chest.seed(0, 0, 0);
      this.head.seed(0, 0, 0);
      this.arm.seed(0, 0, 0);
      this.gear.seed(0, 0, 0);
      this.plantT = this.landT = this.antT = -1;
    }
    let pelY = 0;
    let spPitch = 0;
    let spRoll = 0;
    let hdPitch = 0;
    let hdRoll = 0;
    let armX = 0;
    let armY = 0;
    let armZ = 0;
    let gearX = 0;
    let gearY = 0;
    let gearZ = 0;
    let load = 0;
    if (dt > 0) {
      const vx = clampAbs((i.x - this.px) / dt, MAX_V);
      const vy = clampAbs((i.y - this.py) / dt, MAX_V);
      const vz = clampAbs((i.z - this.pz) / dt, MAX_V);
      this.px = i.x;
      this.py = i.y;
      this.pz = i.z;
      const sy = Math.sin(i.yaw);
      const cyw = Math.cos(i.yaw);
      // 2. lean: the filtered acceleration (always tracked; read only off identity)
      const k = 1 - Math.exp(-dt / B.accelTau);
      this.accelF += (i.accelFwd - this.accelF) * k;
      this.turnF += (i.yawRate * i.speed - this.turnF) * k;
      if (v.accelLean !== 0 && this.accelF > 0) spPitch += v.accelLean * DEG * this.accelF;
      if (v.stopLean !== 0 && this.accelF < 0) spPitch += v.stopLean * DEG * this.accelF;
      // a turn to the right (yaw rate > 0) leans the top right: a negative roll
      if (v.bank !== 0) spRoll -= v.bank * DEG * this.turnF;
      // 4. secondary springs (a spring at 0 lag stays seeded on the body: switched on later it starts at rest)
      if (v.chestLag !== 0) {
        const s = this.chest;
        s.step(vx, vy, vz, TWO_PI * B.chestHz * v.chestHzMul, B.zeta * v.chestDampMul, dt, sy, cyw);
        spPitch += v.chestLag * DEG * (s.f - 0.5 * s.u);
        spRoll -= v.chestLag * DEG * s.s;
      } else this.chest.seed(vx, vy, vz);
      if (v.headLag !== 0) {
        const s = this.head;
        s.step(vx, vy, vz, TWO_PI * B.headHz * v.headHzMul, B.zeta * v.headDampMul, dt, sy, cyw);
        hdPitch += v.headLag * DEG * (s.f - 0.5 * s.u);
        hdRoll -= v.headLag * DEG * s.s;
      } else this.head.seed(vx, vy, vz);
      if (v.armLag !== 0) {
        const s = this.arm;
        s.step(vx, vy, vz, TWO_PI * B.armHz * v.armHzMul, B.zeta * v.armDampMul, dt, sy, cyw);
        armX = v.armLag * s.s;
        armY = v.armLag * s.u;
        armZ = v.armLag * s.f;
      } else this.arm.seed(vx, vy, vz);
      if (v.gearLag !== 0) {
        const s = this.gear;
        s.step(vx, vy, vz, TWO_PI * B.gearHz * v.gearHzMul, B.zeta * v.gearDampMul, dt, sy, cyw);
        gearX = v.gearLag * s.s;
        gearY = v.gearLag * s.u;
        gearZ = v.gearLag * s.f;
      } else this.gear.seed(vx, vy, vz);
      // 3. loading: a pulse at each plant and on a landing (its depth and time by the fall)
      if (i.plant && i.grounded && i.speed > 0.1) this.plantT = 0;
      if (i.landings !== this.landings) {
        this.landings = i.landings;
        const f = Math.min(B.landMaxFall, Math.max(0, i.fall));
        this.landT = 0;
        this.landAmp = Math.min(B.maxDrop, v.landDepth * f);
        this.landDur = (B.landTime + B.landTimePerM * f) * v.landTimeMul;
      }
      if (this.plantT >= 0) {
        this.plantT += dt;
        const dur = B.plantTime * v.plantTimeMul;
        if (this.plantT >= dur) this.plantT = -1;
        else if (v.plantDrop !== 0) load += v.plantDrop * loadPulse(this.plantT / dur);
      }
      if (this.landT >= 0) {
        this.landT += dt;
        if (this.landT >= this.landDur) this.landT = -1;
        else if (this.landAmp !== 0) load += this.landAmp * loadPulse(this.landT / this.landDur);
      }
      pelY -= load;
      // 5. anticipation: a dip that plays as the move begins (the input is never held back)
      if (i.start && v.antStart !== 0) {
        this.antT = 0;
        this.antAmp = v.antStart;
      }
      if (i.jump && v.antJump !== 0) {
        this.antT = 0;
        this.antAmp = v.antJump;
      }
      if (this.antT >= 0) {
        this.antT += dt;
        const dur = B.antTime * v.antTimeMul;
        if (this.antT >= dur) this.antT = -1;
        else {
          const a = this.antAmp * loadPulse(this.antT / dur);
          pelY -= a;
          spPitch += a * B.antPitchPerM;
        }
      }
      // 6. the camera signal
      if (v.camLag !== 0) {
        const kc = 1 - Math.exp(-dt / v.camLag);
        this.cx += (i.x - this.cx) * kc;
        this.cy += (i.y - this.cy) * kc;
        this.cz += (i.z - this.cz) * kc;
        C.lagX = this.cx - i.x;
        C.lagY = this.cy - i.y;
        C.lagZ = this.cz - i.z;
      } else {
        this.cx = i.x;
        this.cy = i.y;
        this.cz = i.z;
        C.lagX = C.lagY = C.lagZ = 0;
      }
      C.dip = v.camDip !== 0 ? v.camDip * load : 0;
    }
    P.pelY = pelY === 0 ? 0 : -Math.min(B.maxDrop, -pelY);
    P.spPitch = clampAbs(spPitch, B.maxRot);
    P.spRoll = clampAbs(spRoll, B.maxRot);
    P.hdPitch = clampAbs(hdPitch, B.maxRot);
    P.hdRoll = clampAbs(hdRoll, B.maxRot);
    P.armX = clampAbs(armX, B.maxPos);
    P.armY = clampAbs(armY, B.maxPos);
    P.armZ = clampAbs(armZ, B.maxPos);
    P.gearX = clampAbs(gearX, B.maxPos);
    P.gearY = clampAbs(gearY, B.maxPos);
    P.gearZ = clampAbs(gearZ, B.maxPos);
    // (the gear is applied by the weapon models, not the graph)
    P.on = P.pelY !== 0 || P.spPitch !== 0 || P.spRoll !== 0 || P.hdPitch !== 0 || P.hdRoll !== 0 || P.armX !== 0 || P.armY !== 0 || P.armZ !== 0;
  }
}

/** Zero the pose offsets (after the local rig's animate: other rigs never see them). */
export function weightPoseClear(): void {
  const P = WEIGHT_POSE;
  P.on = false;
  P.pelY = P.spPitch = P.spRoll = P.hdPitch = P.hdRoll = P.armX = P.armY = P.armZ = 0;
}

/** The graph output fields the pose layers move (animGraph `AnimOut`). */
export interface WeightPoseTarget {
  pelvis: { y: number };
  spine: { pitch: number; roll: number };
  head: { pitch: number; roll: number };
  handL: { x: number; y: number; z: number };
  handR: { x: number; y: number; z: number };
  weapon: { x: number; y: number; z: number };
}

/** Add the pose offsets to the graph's targets (animGraph `writeTargets`, only while `WEIGHT_POSE.on`). */
export function weightApplyPose(o: WeightPoseTarget): void {
  const P = WEIGHT_POSE;
  o.pelvis.y += P.pelY;
  o.spine.pitch += P.spPitch;
  o.spine.roll += P.spRoll;
  o.head.pitch += P.hdPitch;
  o.head.roll += P.hdRoll;
  o.handL.x += P.armX;
  o.handL.y += P.armY;
  o.handL.z += P.armZ;
  o.handR.x += P.armX;
  o.handR.y += P.armY;
  o.handR.z += P.armZ;
  o.weapon.x += P.armX;
  o.weapon.y += P.armY;
  o.weapon.z += P.armZ;
}
