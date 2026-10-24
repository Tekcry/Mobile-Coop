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
import { TUNE_CUR } from './tune';
import { springStep, WEIGHT_MOVE } from './weight';
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
  /** (mocap-trial-2, strafe) The mocap strafe's side-step on this gait clock (`GLIDE_SIDE`): the player's driver sets it
   *  with the switch (a carrier); enemies and the VIP never do (their aimed glide keeps its shuffle). */
  mocapSide?: boolean;
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
// (anim-rework S2, M6: the CT movement references dropped, "too many steps") k 0.17 -> 0.2: 0.58 m at 1.4 m/s (2.4 steps a
// second, was 2.6), 0.72 m at 2.1 m/s; the full 0.24 line (0.64 m) lifted the walk's head bob over 3.5 cm and a 90 deg walk
// turn's to 6 cm (g1Locomotion), so the walk keeps a little shorter step and the jog and run take the line
/**
 * (anim-rework S2, M6) The player's crouched step line (m: stepLen0 + k * speed, capped at max). (afp AF3, walk 4.72 P2
 * "the crouch walk is still awkard") k 0.2 -> 0.115: shorter steps at a higher cadence for the low gait, 0.40 / 0.45 /
 * 0.50 m at gears 1-3 (0.85 / 1.3 / 1.7 m/s; were 0.47 / 0.56 / 0.64); past `runFrom` m/s the step grows by `runK` a m/s
 * more, so the crouch run keeps a longer stride (0.76 m at 2.6 m/s, was 0.82: at 0.6 m its arms swung over 2 m/s).
 */
export const CROUCH_STEP = { k: 0.115, max: 0.95, runFrom: 1.9, runK: 0.35 } as const;
/** A crouched step line (CROUCH_STEP's shape). */
export type CrouchStepLine = { readonly k: number; readonly max: number; readonly runFrom: number; readonly runK: number };
/** (afp CI fix) The pre-AF3 crouched step line: a guard's graph clock (not AnimGraph afRig: guards keep their rig, mt2-guardgate)
 *  and every graph's turn share (`turning`, animGraph writeTargets). */
export const CROUCH_STEP_GUARD: CrouchStepLine = { k: 0.2, max: 0.95, runFrom: 1.9, runK: 0 };
export const WALK_STEP = { k: 0.2, to: 2.1, blend: 3.0 } as const;
/**
 * (anim-rework S3, BRIEF 3 "the glide") The aimed glide's steps (`glide` 1: a carrier aiming; MOVEMENT only; standing and
 * (anim-rework S4) crouched; holstered, low ready and enemies keep the old 60 % side-step). A side-step is a shuffle: the lead foot steps out, the trailing foot closes, they
 * never cross, so each foot travels two steps' length per cycle and the feet open by that much between the closes. A
 * pure strafe steps `lat0 + latK x speed` (m; 0.094 m at 0.37 m/s, a slow stick: the feet open about 19 cm past the close,
 * 4 steps a second; 0.11 m at the 0.7 m/s full-stick aimed strafe, 6.4 a second) instead of 60 % of the walk's 0.5-0.6 m (the
 * 45-53 cm crab: the feet spread up to 1 m between the closes). Walking backwards (`back` share 1) steps `back` shorter
 * (0.33 m at the 1.05 m/s aimed back glide: the reaching foot checks the ground behind, BRIEF 3), blended by the
 * share's square (a diagonal keeps most of its step). Aiming (`glide` 1) every step is at most `fwd0 + fwdK x speed` (0.46 m at
 * the 1.4 m/s aimed walk, was the walk's 0.58 m: the glide's short steps, a steadier platform).
 */
export const GLIDE_STEP = { lat0: 0.075, latK: 0.05, back: 0.35, fwd0: 0.25, fwdK: 0.15 } as const;

/**
 * (mocap-trial-2, strafe, BRIEF A10) The mocap strafe's side-step, standing, in place of the glide's (`GLIDE_STEP.lat0 +
 * latK x speed`): half a cycle's travel, the captures' `stride` (m, a cycle at their pace `stride` / `cycle`) scaled
 * by (v / that pace)^`exp` (`sideStepAt`). `mocap.ts` sets them from the mocap set's strafe captures (stride NaN: none).
 * Read only when the caller passes `mside` (a carrier's clock with the strafes in its set: the graph's `mSide`, the
 * player's driver `mocapSide`). The crouched aimed glide keeps its shuffle (blended by the crouch).
 */
export const GLIDE_SIDE = { stride: Number.NaN, cycle: 1, exp: 0.25 };

/** (mocap-trial-2, strafe) GLIDE_SIDE's side-step (m) at pace v, or NaN (no strafe captures, or not moving). No allocation. */
export function sideStepAt(v: number): number {
  const s = GLIDE_SIDE.stride;
  return s > 0 && v > 0 ? 0.5 * s * Math.pow(v / (s / GLIDE_SIDE.cycle), GLIDE_SIDE.exp) : Number.NaN;
}

/**
 * Step length (m) at a ground speed; a gait cycle is two steps. Side-steps are shorter (feet cannot
 * pass each other sideways, so a full-length stride would spread them ~1 m): `lateral` = |sideways
 * share of the velocity| (0..1) shortens steps to 60% at a pure strafe, with a higher cadence.
 */
export function stepLength(speed: number, M: MotionTuning = MOVEMENT, lateral = 0, tense = 0, crouch = 0, back = 0, glide = 0, mside = false, cs: CrouchStepLine = CROUCH_STEP): number {
  const v = Math.max(0, speed);
  // (G1, audit row 7) capped at `stepLenMax`: faster than that the cadence rises instead
  let s = Math.min(M.stepLenMax, M.stepLen0 + M.stepLenK * v);
  // (anim-rework S2, M6) the player's crouched gaits take their own step line (CROUCH_STEP; afp AF3: short at the low gears,
  // lengthening again into the crouch run; `cs` CROUCH_STEP_GUARD on a guard's graph)
  if (M === MOVEMENT && crouch > 0) s += (Math.min(cs.max, M.stepLen0 + cs.k * v + cs.runK * Math.max(0, v - cs.runFrom)) - s) * Math.min(1, crouch);
  // (CT prototype G8, A4) the player's standing walk steps shorter (WALK_STEP), blended back to the line by the jog
  if (M === MOVEMENT && crouch < 1 && v < WALK_STEP.blend) {
    const u = v <= WALK_STEP.to ? 0 : (v - WALK_STEP.to) / (WALK_STEP.blend - WALK_STEP.to);
    const w = Math.min(s, M.stepLen0 + WALK_STEP.k * v);
    s += (w - s) * (1 - u * u * (3 - 2 * u)) * (1 - Math.max(0, crouch));
  }
  // (G1, audit row 26) the tense sneak's long deliberate steps, by its weight 0..1
  const base = s + (TENSE.step - s) * tense;
  const old = base * (1 - 0.4 * lateral * lateral);
  if (M !== MOVEMENT) return old * TUNE_CUR.strideMul;
  // (anim-rework S3) the glide's short shuffle side-step and the shorter back-step (GLIDE_STEP); (anim-rework S4) crouched
  // too (the crouched aimed strafe opened the feet 33-44 cm off the line with the old 60 % side-step)
  const g = Math.max(0, Math.min(1, glide));
  if (g <= 0) return old * TUNE_CUR.strideMul;
  const fwd = base + (Math.min(base, GLIDE_STEP.fwd0 + GLIDE_STEP.fwdK * v) - base) * g;
  const l2 = lateral * lateral;
  // (mocap-trial-2, strafe) a carrier's mocap strafe side-step standing (GLIDE_SIDE; NaN or not `mside`: the glide's, as before)
  const sideG = GLIDE_STEP.lat0 + GLIDE_STEP.latK * v;
  // (sideStepAt written out: a call with a double boxes it, 16 B a frame per gaitRate)
  const gs = GLIDE_SIDE.stride;
  const sideM = mside && gs > 0 && v > 0 ? 0.5 * gs * Math.pow(v / (gs / GLIDE_SIDE.cycle), GLIDE_SIDE.exp) : Number.NaN;
  const side = Math.min(fwd, !Number.isNaN(sideM) ? sideG + (sideM - sideG) * (1 - Math.max(0, Math.min(1, crouch))) : sideG);
  const step = (fwd + (side - fwd) * l2) * (1 - GLIDE_STEP.back * back * back);
  return (old + (step - old) * g) * TUNE_CUR.strideMul;
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
export function gaitRate(speed: number, yawRate: number, M: MotionTuning = MOVEMENT, lateral = 0, tense = 0, crouch = 0, back = 0, glide = 0, mside = false, cs: CrouchStepLine = CROUCH_STEP): number {
  const lin = speed > 0.02 ? speed / (2 * stepLength(speed, M, lateral, tense, crouch, back, glide, mside, cs)) : 0;
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
  /** Gait clock 0..1 (left heel strike at 0, right at 0.5): the drawn feet (the rig, the wire's `gph`). */
  phase = 0;
  /**
   * (rig-pose-fix S7, audit G17) The sim's gait clock: the root modulation of the velocity runs on it. It never takes the
   * mocap strafe's side-step (`mocapSide`, a per-machine anim setting), so the sim velocity is the same with mocap on or
   * off; without `mocapSide` it advances exactly as `phase`.
   */
  simPhase = 0;
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
  /** (anim-weight) The Weight section's stop time multiplier the last CT step used (`ctStopDistance` predicts with it). */
  private stopMul = 1;
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
    // (anim-weight) WEIGHT_MOVE: the Weight section's momentum (x1 / 0 = today; set in the local player's window only).
    // A stop settle above 0 makes the stop spring under-damped: the pace overshoots below 0 (back along the heading)
    // and settles at rest
    const settle = WEIGHT_MOVE.stopSettle;
    this.stopMul = WEIGHT_MOVE.stopMul;
    const px0 = this.paceSpring.x;
    if (Math.abs((px0 < 0 ? -px0 : px0) - sp) > 1e-6) this.paceSpring.reset(sp);
    else if (px0 < 0) sp = px0;
    const omega = target < sp || (settle > 0 && !pushed) ? CT_STOP_W / (CT.stopTime * WEIGHT_MOVE.stopMul) : CT_START_W / (CT.startTime * WEIGHT_MOVE.startMul);
    if (settle > 0 && !pushed) {
      springStep(this.paceSpring, 0, omega, 1 - settle, dt);
      sp = this.paceSpring.x;
    } else sp = this.paceSpring.step(target, omega, dt);
    this.wantPace = target;
    // (the last 0.1 m/s of a stop is a 1.7 mm step at 60 Hz: the stop lands inside `stopTime` at every speed)
    if (settle > 0 && !pushed) {
      if (Math.abs(sp) < 0.02 && Math.abs(this.paceSpring.v) < 0.1) {
        sp = 0;
        this.paceSpring.reset(0);
      }
    } else if (sp < 0 || (target === 0 && sp < CT_REST)) {
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
    this.paceSpring.x = sp < 0 ? -this.speed : this.speed;
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
    const w = CT_STOP_W / (CT.stopTime * this.stopMul);
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
      // (anim-rework S3) and the backward share (GLIDE_STEP.back)
      const bk = sp > 0.02 ? Math.min(1, Math.max(0, -(this.vx * Math.sin(this.yaw) + this.vz * Math.cos(this.yaw)) / sp)) : 0;
      // (G1 fix) in a start the clock runs START_CLOCK.share of the way to the target pace (the first step lands at ~0.25 s)
      const spc = this.startT >= 0 && this.wantPace > sp ? sp + (this.wantPace - sp) * START_CLOCK.share : sp;
      const rate = gaitRate(spc, this.yawRate, M, lat, this.tense, i.crouch ?? 0, bk, i.aiming ? 1 : 0, false);
      // (G17) the drawn clock may take the mocap side-step; the sim clock never does
      const drawn = i.mocapSide === true ? gaitRate(spc, this.yawRate, M, lat, this.tense, i.crouch ?? 0, bk, i.aiming ? 1 : 0, true) : rate;
      this.phase = (this.phase + drawn * dt) % 1;
      this.simPhase = (this.simPhase + rate * dt) % 1;
    }
    const mod = sp > 0.1 ? rootModulation(this.simPhase, M) : 1;
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
          // (anim-weight) x WEIGHT_MOVE.turnMul / turnRunMul (x1 today)
          const r0 = CT.turnRate * WEIGHT_MOVE.turnMul;
          this.turnToward(wrapPi(Math.atan2(i.vx, i.vz) - this.yaw), r0 + (CT.turnRateRun * WEIGHT_MOVE.turnRunMul - r0) * k, CT.turnAccel, dt);
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
