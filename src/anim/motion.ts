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
import { CT, MOVEMENT, TENSE } from '../config/movement';
import { hyp2 } from '../core/mathx';
import { Spring } from './rigMath';

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
  /**
   * Chaos Theory feel (3.2.0, the player's free movement only; enemies never set it): releasing the stick stops
   * dead on the step, starts reach 95% of the target within `CT.startTime`, direction and speed changes re-target
   * at once, no planted pivots, travel turns at `CT.turnRate`.
   */
  ct: boolean;
  /** (CT prototype M1) The stick is at the slowest speed: pulled behind the body it walks backwards (free movement). */
  slowest?: boolean;
  /** (G1, audit row 26) The tense sneak near an unaware guard: long deliberate steps (`TENSE.step`). */
  tense?: boolean;
  /** (G8, A4) The stance's crouch blend 0..1 (the rig's): the standing walk's shorter steps fade with it (WALK_STEP). */
  crouch?: number;
}

export function emptyMotionInput(): MotionInput {
  return { vx: 0, vz: 0, yaw: 0, aiming: false, sprinting: false, faceTravel: false, ct: false };
}

/** Chaos Theory start: the velocity error decays with this time constant (95% inside `CT.startTime`). */
export function ctTau(): number {
  return CT.startTime / 4;
}

/** (step 22) w t of a critically damped spring at 95% (start) and 98% (stop) of its travel: (1 + wt) e^-wt. */
export const CT_START_W = 4.744;
export const CT_STOP_W = 5.834;
/** (step 22) A released pace under this (m/s) is at rest. */
export const CT_REST = 0.1;

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
 * (CT prototype G8, A4: footage wins) The player's standing walk takes CT's shorter steps: `stepLen0 + k * speed` up to
 * `to` m/s (gear 3: 0.66 m at 2.1 m/s, ~3.2 steps a second; CT 105949 @ 12.13-12.45 ~0.66 m at ~3.1 steps a second at
 * ~2 m/s; was 0.72 at 2.9), blended back to `stepLen0 + stepLenK * speed` by `blend` m/s (the jog at gear 4 and the run
 * keep theirs). Standing only (`crouch` 0..1 fades it: the crouched gaits get their own clips). A pure function of the
 * speed and the stance, so an owner's driver and a remote's graph count the same clock. Not for guards (ENEMY_MOTION).
 */
export const WALK_STEP = { k: 0.17, to: 2.1, blend: 3.0 } as const;

/**
 * Step length (m) at a ground speed; a gait cycle is two steps. Side-steps are shorter (feet cannot
 * pass each other sideways, so a full-length stride would spread them ~1 m): `lateral` = |sideways
 * share of the velocity| (0..1) shortens steps to 60% at a pure strafe, with a higher cadence.
 */
export function stepLength(speed: number, M: MotionTuning = MOVEMENT, lateral = 0, tense = 0, crouch = 0): number {
  const v = Math.max(0, speed);
  // (G1, audit row 7) capped at `stepLenMax`: faster than that the cadence rises instead
  let s = Math.min(M.stepLenMax, M.stepLen0 + M.stepLenK * v);
  // (CT prototype G8, A4) the player's standing walk steps shorter (WALK_STEP), blended back to the line by the jog
  if (M === MOVEMENT && crouch < 1 && v < WALK_STEP.blend) {
    const u = v <= WALK_STEP.to ? 0 : (v - WALK_STEP.to) / (WALK_STEP.blend - WALK_STEP.to);
    const w = Math.min(s, M.stepLen0 + WALK_STEP.k * v);
    s += (w - s) * (1 - u * u * (3 - 2 * u)) * (1 - Math.max(0, crouch));
  }
  // (G1, audit row 26) the tense sneak's long deliberate steps, by its weight 0..1
  return (s + (TENSE.step - s) * tense) * (1 - 0.4 * lateral * lateral);
}

/**
 * (CT prototype G1 fix, audit row 13) A start's gait clock (CT 110117 @ 6.5-6.75: a full run stride within 0.25 s): for
 * `time` s after a start from rest the clock counts `share` of the way from the pace to the target pace.
 */
export const START_CLOCK = { time: 0.5, share: 1 } as const;

/** (A1.2) One step per this much body turn (rad): a spin is the walk cycle on a tight circle, ~4 steps per 360 (footage 051339). */
export const TURN_STEP = Math.PI / 2;
/** (A1.2) Turning faster than this (rad/s) steps the feet even at no pace (a spin at a crawl still steps). */
export const TURN_GAIT_MIN = 1.0;

/**
 * (A1.2) Gait rate (cycles/s) from ground distance AND body turning: the larger of the linear rate (two steps per
 * cycle) and one step per `TURN_STEP` of yaw. Straight walking is unchanged; a 450 deg/s spin is 2.5 cycles/s (a step
 * per 0.2 s). `max`, not a sum: a run turn keeps its cadence.
 */
export function gaitRate(speed: number, yawRate: number, M: MotionTuning = MOVEMENT, lateral = 0, tense = 0, crouch = 0): number {
  const lin = speed > 0.02 ? speed / (2 * stepLength(speed, M, lateral, tense, crouch)) : 0;
  const ang = Math.abs(yawRate) > TURN_GAIT_MIN ? Math.abs(yawRate) / (2 * TURN_STEP) : 0;
  return lin > ang ? lin : ang;
}

/**
 * Root speed multiplier through a stride (phase 0..1, two steps per cycle): a small dip at each heel
 * strike (phase 0 and 0.5) and a swell mid-stance; averages exactly 1 over a step.
 */
export function rootModulation(phase: number, M: MotionTuning = MOVEMENT): number {
  return 1 - M.rootDip * Math.cos(phase * TAU * 2);
}

/** Smoothstep of a 0..1 value. */
function smoothUnit(t: number): number {
  const x = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return x * x * (3 - 2 * x);
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
  /** (step 22) Chaos Theory pace (x, m/s) and its rate (v, m/s^2), critically damped. */
  private paceSpring = new Spring();
  /** (CT prototype M1) Walking backwards at the slowest speed (the velocity runs opposite the facing). */
  backward = false;
  /** (A1.2) Where the body is turning to: the stick heading while free and pushed, else the facing (caps the planner's yaw prediction). */
  faceGoal = 0;
  /** (G1) The tense sneak's weight 0..1 (eased with `TENSE.tau`), for the gait clock's step. */
  tense = 0;
  /** (G1 fix) Time since a Chaos Theory start from rest (s; -1: none) and the pace the spring heads for (m/s). */
  private startT = -1;
  private wantPace = 0;
  /** (A1.2) The stick heading last step (NaN: none) and its smoothed sweep rate (rad/s). */
  private stickPrev = Number.NaN;
  private stickRate = 0;

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
    this.paceSpring.reset(0);
    this.heading = Number.NaN;
    this.backward = false;
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
    if (i.ct) {
      this.stepCt(dt, i);
      this.finish(dt, i, M);
      return;
    }
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
    // never carry more acceleration than the current tuning allows (switching from a snappier tuning,
    // e.g. a slide, would otherwise leave an acceleration the jerk limit cannot unwind in time)
    const al = hyp2(this.ax, this.az);
    if (al > cap) {
      this.ax *= cap / al;
      this.az *= cap / al;
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
    this.finish(dt, i, M);
  }

  /**
   * (CT prototype M1) Chaos Theory body velocity. The pace follows the stick's through a critically damped spring
   * (95% of a start within `CT.startTime`, 98% of a stop within `CT.stopTime`: ~0.3 m of slide from a run, no closing
   * step, G26). Free (not aiming) the body moves along its FACING and turns toward the stick at `CT.turnRate`: no
   * stationary pivot (the stick held on the spot walks a tight circle), a flick 180 or a run reversal is one smooth
   * ~0.4 s turn with the pace dipping through it (G25, G33). Only at the slowest speed does a stick pulled behind the
   * body (over `CT.backAngle`) walk backwards at `CT.backSpeed` instead of turning. Aiming: strafe-locked, the
   * velocity follows the stick directly. States: `move`, `stop` (released, still sliding), `idle`.
   */
  private stepCt(dt: number, i: MotionInput): void {
    const want = hyp2(i.vx, i.vz);
    const px = this.vx;
    const pz = this.vz;
    let sp = this.speed;
    const pushed = want > 0.05;
    const free = i.faceTravel && !i.aiming;
    let target = pushed ? want : 0;
    if (!free) this.backward = false;
    this.faceGoal = this.yaw;
    if (!pushed || !free) {
      this.stickPrev = Number.NaN;
      this.stickRate = 0;
    }
    // (G1 fix, audit row 13) a start from rest: the gait clock runs at the pace being reached, not the one reached yet
    if (pushed && sp < 0.05 && this.state !== 'move') this.startT = 0;
    else if (this.startT >= 0) this.startT = pushed ? this.startT + dt : -1;
    if (this.startT > START_CLOCK.time) this.startT = -1;
    if (pushed) {
      const th = Math.atan2(i.vx, i.vz);
      if (this.state !== 'move') this.go('move');
      if (free) {
        // (A1.2) a stick swept round (a held spin) leads its own heading: the goal runs ahead by its sweep rate x 0.25 s
        // (a flick is one jump, not a sweep: per-step changes over 0.3 rad do not count)
        const dTh = Number.isNaN(this.stickPrev) ? 0 : wrapPi(th - this.stickPrev);
        this.stickPrev = th;
        const sw = Math.abs(dTh) > 0.3 ? 0 : dTh / dt;
        this.stickRate += (sw - this.stickRate) * (1 - Math.exp(-dt / 0.1));
        this.faceGoal = wrapPi(th + Math.max(-1, Math.min(1, this.stickRate * 0.25)));
        const d = wrapPi(th - this.yaw);
        const ad = Math.abs(d);
        // the slowest speed walks backwards when the stick is pulled behind; any faster speed turns round
        if (i.slowest && (ad > CT.backAngle || (this.backward && ad > CT.backExit))) {
          this.backward = true;
          target = CT.backSpeed;
        } else {
          this.backward = false;
          // the pace dips through a big turn and recovers as the body comes round
          target *= 1 - CT.turnDip * smoothUnit(ad / Math.PI);
        }
        if (sp < 0.05 && !this.backward) this.heading = this.yaw;
        else if (sp < 0.05) this.heading = wrapPi(this.yaw + Math.PI);
      } else this.heading = th;
    } else if (this.state === 'move') this.go(sp > 0.02 ? 'stop' : 'idle');
    // the pace: one critically damped spring, quicker down than up (a carry or reset elsewhere re-seeds it)
    if (Math.abs(this.paceSpring.x - sp) > 1e-6) this.paceSpring.reset(sp);
    const omega = target < sp ? CT_STOP_W / CT.stopTime : CT_START_W / CT.startTime;
    sp = this.paceSpring.step(target, omega, dt);
    this.wantPace = target;
    // (the last 0.1 m/s of a stop is a 1.7 mm step at 60 Hz: the stop lands inside `stopTime` at every speed)
    if (sp < 0 || (target === 0 && sp < CT_REST)) {
      sp = 0;
      this.paceSpring.reset(0);
    }
    if (!pushed && sp === 0 && this.state === 'stop') this.go('idle');
    // the velocity direction: along the facing (or straight behind it), the stick's while aiming, kept while stopping
    let h = this.heading;
    if (free && pushed) h = this.backward ? wrapPi(this.yaw + Math.PI) : this.yaw;
    else if (Number.isNaN(h)) h = this.yaw;
    if (free && pushed) this.heading = h;
    this.vx = Math.sin(h) * sp;
    this.vz = Math.cos(h) * sp;
    // the spring keeps its exact pace (the vector round trip would re-seed it every step)
    this.paceSpring.x = this.speed;
    this.ax = (this.vx - px) / dt;
    this.az = (this.vz - pz) / dt;
  }

  /**
   * Distance (m) the Chaos Theory pace still covers once released: the spring's remaining travel from its
   * pace x and rate v, 2 x / w + v / w^2 (for the stop's landing prediction).
   */
  ctStopDistance(): number {
    const x = this.speed;
    if (x <= 0.01) return 0;
    const w = CT_STOP_W / CT.stopTime;
    return Math.max(0, (2 * x) / w + this.paceSpring.v / (w * w));
  }

  /** Gait clock, stride modulation and facing (after the velocity). */
  private finish(dt: number, i: MotionInput, M: MotionTuning): void {
    // --- gait clock and stride modulation
    const sp = this.speed;
    this.tense += ((i.tense ? 1 : 0) - this.tense) * (1 - Math.exp(-dt / TENSE.tau));
    // (A1.2) the clock counts body turning as well as distance: one step per 90 deg (a spin at a crawl still steps)
    if (sp > 0.02 || Math.abs(this.yawRate) > TURN_GAIT_MIN) {
      const lat = sp > 0.02 ? Math.min(1, Math.abs(this.vx * Math.cos(this.yaw) - this.vz * Math.sin(this.yaw)) / sp) : 0;
      // (G1 fix) in a start the clock runs START_CLOCK.share of the way to the target pace (the first step lands at ~0.25 s)
      const spc = this.startT >= 0 && this.wantPace > sp ? sp + (this.wantPace - sp) * START_CLOCK.share : sp;
      this.phase = (this.phase + gaitRate(spc, this.yawRate, M, lat, this.tense, i.crouch ?? 0) * dt) % 1;
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
      if (i.ct) {
        // (CT prototype M1) turns toward the stick at one smooth rate; released or walking backwards it holds the facing
        if (want > 0.05 && !this.backward) {
          // (A1.1) the cap scales with speed: ~450 deg/s up to a jog, ~350 deg/s at the full run (footage 300-400)
          const k = Math.max(0, Math.min(1, (sp - CT.turnSlowFrom) / (CT.turnSlowTo - CT.turnSlowFrom)));
          this.turnToward(wrapPi(Math.atan2(i.vx, i.vz) - this.yaw), CT.turnRate + (CT.turnRateRun - CT.turnRate) * k, CT.turnAccel, dt);
        }
        else this.yawRate = 0;
        return;
      }
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
