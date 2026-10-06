/**
 * Sim-side motion driver (pure, unit-tested): the root motion every step of the character follows.
 *
 * - Velocity is jerk-limited: acceleration and braking are capped and themselves change at a capped
 *   rate, so nothing starts or stops instantly. From standstill a weight shift (`startShift`) plays
 *   before the root moves at all.
 * - Within each stride the root speed dips slightly at heel strike and swells mid-stance (mean 1), so
 *   the body is carried by the steps rather than gliding.
 * - The gait clock (`phase`, one cycle = two steps, left heel strike at 0, right at 0.5) advances by
 *   ground distance / cycle length, so feet and root stay in sync at any speed and frame rate.
 * - Facing (`faceTravel`, the player when not aiming): the body faces where it is going, turning at
 *   540 deg/s sneaking down to 300 deg/s sprinting; the velocity itself swings round in an arc for
 *   changes under ~135 degrees, and a reversal at speed is a short planted pivot. Standing still the
 *   body holds its facing (the camera orbits freely). Aiming: strafe-locked to the aim with a fast eased
 *   turn. Drivers that face an explicit yaw (enemies) turn continuously while moving and in stepped
 *   chunks on the spot.
 *
 * Everything is in seconds: identical results at any step size within reason.
 */
import { MOVEMENT } from '../config/movement';
import { hyp2 } from '../core/mathx';

export type MotionState = 'idle' | 'start' | 'move' | 'stop' | 'turn' | 'pivot';

export interface MotionInput {
  /** Desired velocity (world XZ, m/s); zero to stop. */
  vx: number;
  vz: number;
  /** Where the body should face (rad, world yaw; 0 = +Z). */
  yaw: number;
  /** Aiming: smooth continuous turns at the aim rate instead of stepped turns. */
  aiming: boolean;
  /** Sprinting: higher acceleration caps, sprint steering, no weight shift. */
  sprinting: boolean;
  /** Face the travel direction (ignores `yaw` unless aiming); still = hold the facing. */
  faceTravel: boolean;
}

export function emptyMotionInput(): MotionInput {
  return { vx: 0, vz: 0, yaw: 0, aiming: false, sprinting: false, faceTravel: false };
}

export type MotionTuning = typeof MOVEMENT;

const TAU = Math.PI * 2;

export function wrapPi(a: number): number {
  a %= TAU;
  if (a > Math.PI) a -= TAU;
  if (a < -Math.PI) a += TAU;
  return a;
}

/** A stepped turn keeps stepping until the feet are within this of the aim (rad, ~7 deg). */
const TURN_SETTLE = 0.12;

/**
 * Step length (m) at a ground speed; a gait cycle is two steps. Side-steps are shorter (feet cannot
 * pass each other sideways, so a full-length stride would spread them ~1 m): `lateral` = |sideways
 * share of the velocity| (0..1) shortens steps to 60% at a pure strafe, with a higher cadence.
 */
export function stepLength(speed: number, M: MotionTuning = MOVEMENT, lateral = 0): number {
  return (M.stepLen0 + M.stepLenK * Math.max(0, speed)) * (1 - 0.4 * lateral * lateral);
}

/**
 * Root speed multiplier through a stride (phase 0..1, two steps per cycle): a small dip at each heel
 * strike (phase 0 and 0.5) and a swell mid-stance; averages exactly 1 over a step.
 */
export function rootModulation(phase: number, M: MotionTuning = MOVEMENT): number {
  return 1 - M.rootDip * Math.cos(phase * TAU * 2);
}

/** Smooth 0..1 ease (cubic in-out). */
export function easeInOut(t: number): number {
  const x = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export class MotionDriver {
  /** Root velocity before the stride modulation (m/s), and its acceleration (m/s^2). */
  vx = 0;
  vz = 0;
  ax = 0;
  az = 0;
  /** Output root velocity this step (with the stride modulation). */
  outX = 0;
  outZ = 0;
  yaw: number;
  /** Body angular velocity (rad/s). */
  yawRate = 0;
  state: MotionState = 'idle';
  stateT = 0;
  /** Gait clock 0..1 (left heel strike at 0, right at 0.5). */
  phase = 0;
  /** Stepped turn in progress. */
  private turnFrom = 0;
  private turnTo = 0;
  private turnDur = 0;
  /** Travel heading (rad): swings towards the stick direction at the travel turn rate. */
  private heading = Number.NaN;
  /** Pivot: direction to resume in. */
  private pivotX = 0;
  private pivotZ = 0;

  constructor(yaw = 0) {
    this.yaw = yaw;
  }

  get speed(): number {
    return hyp2(this.vx, this.vz);
  }

  /** Where the body is heading: the end of a stepped turn, else the current facing. */
  get goalYaw(): number {
    return this.state === 'turn' ? this.turnTo : this.yaw;
  }

  get accel(): number {
    return hyp2(this.ax, this.az);
  }

  /** Carry momentum out of a committed move (traversal exit): moving at (vx, vz) straight away. */
  carry(vx: number, vz: number): void {
    this.vx = this.outX = vx;
    this.vz = this.outZ = vz;
    this.ax = this.az = 0;
    if (hyp2(vx, vz) > 0.05) this.go('move');
  }

  reset(yaw = this.yaw): void {
    this.vx = this.vz = this.ax = this.az = this.outX = this.outZ = 0;
    this.yaw = yaw;
    this.yawRate = 0;
    this.go('idle');
  }

  private go(s: MotionState): void {
    this.state = s;
    this.stateT = 0;
  }

  step(dt: number, i: MotionInput, M: MotionTuning = MOVEMENT): void {
    if (dt <= 0) return;
    this.stateT += dt;
    const want = hyp2(i.vx, i.vz);
    const speed = this.speed;
    let tx = i.vx;
    let tz = i.vz;

    // --- locomotion state
    switch (this.state) {
      case 'idle':
      case 'turn':
        if (want > 0.05) {
          // a dash commits immediately (its own wind-up plays); otherwise shift weight first
          if (i.sprinting || M.startShift <= 0) this.go('move');
          else this.go('start');
        }
        break;
      case 'start':
        if (want <= 0.05) this.go(speed > 0.05 ? 'stop' : 'idle');
        else if (this.stateT >= M.startShift) this.go('move');
        break;
      case 'move':
        if (want <= 0.05) this.go('stop');
        else if (speed > M.pivotMinSpeed && (i.vx * this.vx + i.vz * this.vz) / (want * speed) < (i.faceTravel ? -0.7 : -0.5)) {
          // reversal: plant and pivot before heading back
          this.pivotX = i.vx;
          this.pivotZ = i.vz;
          this.go('pivot');
        }
        break;
      case 'stop':
        if (want > 0.05) this.go(speed < 0.05 ? 'start' : 'move');
        else if (speed < 0.02 && this.accel < 0.05) this.go('idle');
        break;
      case 'pivot':
        this.pivotX = i.vx;
        this.pivotZ = i.vz;
        if (this.stateT >= M.pivotTime) this.go(want > 0.05 ? 'move' : 'stop');
        break;
    }
    if (this.state === 'start' || this.state === 'idle' || this.state === 'turn') {
      tx = 0;
      tz = 0;
    } else if (this.state === 'pivot') {
      // brake onto the planted foot for the first part of the pivot, then push off the new way
      const k = this.stateT / M.pivotTime;
      tx = k < 0.6 ? 0 : this.pivotX;
      tz = k < 0.6 ? 0 : this.pivotZ;
    }

    // travel facing: the heading swings round in an arc (at the body's turn rate) instead of cutting
    // through a slow-down, for direction changes short of a pivot
    if (i.faceTravel && !i.aiming && this.state === 'move' && want > 0.05) {
      const hd = Math.atan2(tx, tz);
      if (Number.isNaN(this.heading) || speed < 0.3) this.heading = hd;
      const d = wrapPi(hd - this.heading);
      if (Math.abs(d) < 2.36) {
        // the path can bend no tighter than the grip allows (centripetal accel within the cap)
        const maxD = Math.min(travelRate(speed, i.sprinting, M), (M.accelMax * 0.9) / Math.max(speed, 0.5)) * dt;
        this.heading = wrapPi(this.heading + (d > maxD ? maxD : d < -maxD ? -maxD : d));
      } else this.heading = hd;
      tx = Math.sin(this.heading) * want;
      tz = Math.cos(this.heading) * want;
    } else this.heading = Number.NaN;

    // --- jerk-limited velocity
    const accelMax = i.sprinting ? M.sprintAccel : M.accelMax;
    const ex = tx - this.vx;
    const ez = tz - this.vz;
    // braking when the change opposes the current velocity (a firmer gain: stops do not tail off)
    const braking = ex * this.vx + ez * this.vz < 0;
    const gain = braking ? M.brakeGain : M.velGain;
    let dax = ex * gain;
    let daz = ez * gain;
    const cap = braking ? Math.max(M.decelMax, accelMax) : accelMax;
    const dl = hyp2(dax, daz);
    if (dl > cap) {
      dax *= cap / dl;
      daz *= cap / dl;
    }
    let jx = dax - this.ax;
    let jz = daz - this.az;
    const jl = hyp2(jx, jz);
    const jmax = (i.sprinting ? M.jerkMax * 2 : M.jerkMax) * dt;
    if (jl > jmax) {
      jx *= jmax / jl;
      jz *= jmax / jl;
    }
    this.ax += jx;
    this.az += jz;
    const nvx = this.vx + this.ax * dt;
    const nvz = this.vz + this.az * dt;
    // no overshoot past the target along the error direction
    const before = ex * ex + ez * ez;
    const after = (tx - nvx) * ex + (tz - nvz) * ez;
    if (before > 0 && after < 0) {
      this.vx = tx;
      this.vz = tz;
      this.ax *= 0.5;
      this.az *= 0.5;
    } else {
      this.vx = nvx;
      this.vz = nvz;
    }
    if (tx === 0 && tz === 0 && this.speed < 0.004) {
      this.vx = this.vz = 0;
      this.ax = this.az = 0;
    }

    // --- gait clock and stride modulation
    const sp = this.speed;
    if (sp > 0.02) {
      const lat = Math.min(1, Math.abs(this.vx * Math.cos(this.yaw) - this.vz * Math.sin(this.yaw)) / sp);
      this.phase = (this.phase + (sp / (2 * stepLength(sp, M, lat))) * dt) % 1;
    }
    const mod = sp > 0.1 ? rootModulation(this.phase, M) : 1;
    this.outX = this.vx * mod;
    this.outZ = this.vz * mod;

    // --- facing
    this.updateYaw(dt, i, sp, M);
  }

  /** One stepped turn chunk (at most `turnChunk`) towards a yaw error. */
  private startChunk(err: number, M: MotionTuning): void {
    const chunk = Math.sign(err) * Math.min(Math.abs(err), M.turnChunk);
    this.turnFrom = this.yaw;
    this.turnTo = wrapPi(this.yaw + chunk);
    this.turnDur = Math.max(0.18, M.turnChunkTime * (Math.abs(chunk) / M.turnChunk));
    this.stateT = 0;
    this.go('turn');
  }

  private updateYaw(dt: number, i: MotionInput, sp: number, M: MotionTuning): void {
    const err = wrapPi(i.yaw - this.yaw);
    if (this.state === 'turn') {
      const k = Math.min(1, this.stateT / this.turnDur);
      const prev = this.yaw;
      this.yaw = wrapPi(this.turnFrom + wrapPi(this.turnTo - this.turnFrom) * easeInOut(k));
      this.yawRate = wrapPi(this.yaw - prev) / dt;
      if (k >= 1) {
        // a turn, once started, steps on until the feet face the aim (start / stop hysteresis):
        // the aim may have moved on while this chunk played
        const rest = wrapPi(i.yaw - this.yaw);
        if (Math.abs(rest) > TURN_SETTLE && sp < 0.15 && !i.aiming && !i.sprinting && !i.faceTravel) this.startChunk(rest, M);
        else this.go('idle');
      }
      return;
    }
    if (i.faceTravel && !i.aiming) {
      // face where we are going; standing still, hold the facing (the camera orbits freely)
      const want = hyp2(i.vx, i.vz);
      const moving = want > 0.05 || sp > 0.3;
      const target = want > 0.05 && this.state !== 'pivot' ? Math.atan2(i.vx, i.vz) : sp > 0.3 ? Math.atan2(this.vx, this.vz) : this.yaw;
      if (!moving) {
        this.yawRate = 0;
        return;
      }
      let rate = travelRate(sp, i.sprinting, M);
      if (this.state === 'pivot') rate = Math.max(rate, Math.PI / M.pivotTime);
      this.turnToward(wrapPi(target - this.yaw), rate, M.turnAccel, dt);
      return;
    }
    const still = sp < 0.15 && (this.state === 'idle' || this.state === 'start');
    if (still && !i.aiming && !i.sprinting) {
      // stepped turn on the spot once the aim leads the feet far enough
      this.yawRate = 0;
      if (this.state === 'idle' && Math.abs(err) > M.turnThreshold) this.startChunk(err, M);
      return;
    }
    // continuous, eased turn at the stance rate (faster if the aim is about to out-twist the body)
    let rate = i.sprinting ? M.turnSprint : i.aiming ? M.turnAim : M.turnMoving;
    if (!i.aiming && Math.abs(err) > M.twistMax * 0.8) rate *= 1.6;
    if (this.state === 'pivot') rate = Math.max(rate, Math.PI / M.pivotTime);
    this.turnToward(err, rate, M.turnAccel, dt);
  }

  /** Eased turn by `err` (rad): angular velocity that stops exactly on target, sqrt(2 * accel * remaining). */
  private turnToward(err: number, rate: number, accel: number, dt: number): void {
    const wantRate = Math.sign(err) * Math.min(rate, Math.sqrt(2 * accel * Math.abs(err)));
    const dw = wantRate - this.yawRate;
    const maxDw = accel * dt;
    this.yawRate += Math.max(-maxDw, Math.min(maxDw, dw));
    let step = this.yawRate * dt;
    if (Math.abs(step) > Math.abs(err)) {
      step = err;
      this.yawRate = 0;
    }
    this.yaw = wrapPi(this.yaw + step);
  }
}

/** Travel-facing turn rate (rad/s): quick at a sneak, wider arcs at a sprint. */
export function travelRate(speed: number, sprinting: boolean, M: MotionTuning = MOVEMENT): number {
  if (sprinting) return M.turnSprint;
  const k = Math.max(0, Math.min(1, (speed - M.sneakSpeed) / (M.sprintSpeed - M.sneakSpeed)));
  return M.turnTravelSlow + (M.turnTravelFast - M.turnTravelSlow) * k;
}
