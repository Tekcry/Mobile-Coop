import { hyp2 } from '../core/mathx';
/**
 * World-space foot planner (pure, allocation-free, unit-tested).
 *
 * Moving: contacts follow the gait clock (left on the ground for `duty` of the cycle from phase 0,
 * right from 0.5). A foot on the ground is locked in world space, so it cannot slide whatever the root
 * does; a foot in swing travels from where it left the ground to a landing point predicted from the
 * root's velocity (half a stance ahead of the hip, so mid-stance is under the body), lifted along a
 * swing arc with toe-off and heel-strike pitch. When stopping, landings aim at the predicted rest
 * position (distance matching), so the last steps land where the body stops.
 *
 * Still: feet stay planted; when the body turns or settles away from a foot's ideal stance spot, that
 * foot takes a deliberate step (one at a time). Turning on the spot and settling after a stop are
 * therefore real steps, and the feet never cross.
 */

export interface FootState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** On the ground (locked). */
  contact: boolean;
  /** Swing progress 0..1 while stepping, else -1. */
  swing: number;
  /** Toe pitch from the swing (toe down +). */
  pitch: number;
  /** (step 22) Toe pitch when a quick stop's set-down or closing step began: it eases flat from there (no toe-off). */
  fromPitch: number;
  /** (step 22, A79) Heel-to-toe roll time left after a heel-first landing (s); 0 when flat. */
  roll: number;
  /** Landed this frame (heel strike). */
  landed: boolean;
  /** Distance a locked foot was dragged (should stay ~0). */
  slide: number;
  /** (A1.2) Yaw a planted foot was turned by the twist cap (rad; should stay ~0). */
  scrub: number;
  /** (G1) Distance a planted foot was scrubbed sideways by the free-movement stance band (m): CT's feet pivot with the hips. */
  scrubPos: number;
  // swing internals
  fromX: number;
  fromY: number;
  fromZ: number;
  fromYaw: number;
  toX: number;
  toY: number;
  toZ: number;
  toYaw: number;
  stepT: number;
  stepDur: number;
  stepLift: number;
  probeT: number;
  /** (step 22) Share of the step toward its target the landing spot keeps (1: all; less: held back from a drop's edge). */
  edgeK: number;
  /** Swing progress when the gait clock's swing window began (an early toe-off already in the air), else -1. */
  swBase: number;
  /** (fix 21-2) Where the foot was minus where the clock's swing put it when the clock took over an early toe-off. */
  offX: number;
  offY: number;
  offZ: number;
  /** (fix 21-2) Time (s) since the offset was taken (-1: none). */
  offBase: number;
  init: boolean;
}

function newFoot(): FootState {
  return { x: 0, y: 0, z: 0, yaw: 0, contact: true, swing: -1, pitch: 0, fromPitch: 0, roll: 0, landed: false, slide: 0, scrub: 0, scrubPos: 0, fromX: 0, fromY: 0, fromZ: 0, fromYaw: 0, toX: 0, toY: 0, toZ: 0, toYaw: 0, stepT: 0, stepDur: 0.3, stepLift: 0.05, probeT: 0, edgeK: 1, swBase: -1, offX: 0, offY: 0, offZ: 0, offBase: -1, init: false };
}

export interface PlannerInput {
  dt: number;
  /** Root (feet level) world position and facing. */
  rootX: number;
  rootY: number;
  rootZ: number;
  yaw: number;
  /** Where the body is turning to (stepped turns plant feet for the goal). */
  goalYaw: number;
  /** Root velocity (world, m/s). */
  velX: number;
  velZ: number;
  /** Gait clock and whether contacts follow it. */
  moving: boolean;
  phase: number;
  duty: number;
  /** Seconds per gait cycle (two steps) at the current speed. */
  cycleTime: number;
  /** Swing lift (m). */
  liftH: number;
  /** Ideal stance offsets (root space, m) per foot. */
  lX: number;
  lZ: number;
  rX: number;
  rZ: number;
  /** Predicted rest position while stopping (distance matching), when `rest` is true. */
  rest: boolean;
  restX: number;
  restZ: number;
  /** Max leg reach from under the hip before a planted foot must step (m). */
  reach: number;
  /**
   * Chaos Theory instant stop (3.2.0, s; 0 = off): when moving stops, a foot still in its gait swing sets down within
   * this instead of finishing the stride at idle pace (planted feet stay locked).
   */
  quickStop: number;
  /** Chaos Theory stop hold (3.2.0): stopped feet stay where they are - no settling or idle steps until it ends. */
  hold: boolean;
  /**
   * (3.2.0) Pinned feet (world x / z; NaN = free): a co-op / PvP remote's still feet step to where the owner's are
   * planted (back-to-wall, step 11), instead of where its own history put them.
   */
  pinLX: number;
  pinLZ: number;
  pinRX: number;
  pinRZ: number;
  /**
   * (step 11) Back to a wall: no foot lands behind the plane n . p = wallD (outward normal wallNx / wallNz; wallD NaN =
   * none), and a planted foot turned more than `turnStep` (rad) from the body steps round with it (a turn onto the wall
   * never twists the legs across each other).
   */
  wallNx: number;
  wallNz: number;
  wallD: number;
  turnStep: number;
  /** Ground height under a point, or null (keeps the root height). */
  ground: ((x: number, z: number, yFrom: number) => number | null) | null;
  /** (A1.2) Body yaw rate (rad/s): landings are predicted along the turn. */
  yawRate: number;
  /** (A1.2) Where the body is turning to (rad); NaN = unknown (a remote: the prediction caps at +-90 deg). */
  faceGoal: number;
  /**
   * (A1.2) 'facing': free movement, the stride runs along the facing (no sideways or backwards steps except the slowest
   * back walk). 'velocity': aiming, wall, cover: the stride follows the velocity.
   */
  stride: 'facing' | 'velocity';
  /** (A1.2) The pelvis yaw (rad; NaN = the body yaw): the no-crossing rules are measured in its frame. */
  pelvisYaw: number;
  /** (G1) Crouch 0..1: crouched, a trailing foot rises onto its toes further (HEEL_RAISE.pitchCrouch), so the rear knee stays off the floor. */
  crouch: number;
}

export function emptyPlannerInput(): PlannerInput {
  return { dt: 0, rootX: 0, rootY: 0, rootZ: 0, yaw: 0, goalYaw: 0, velX: 0, velZ: 0, moving: false, phase: 0, duty: 0.62, cycleTime: 1.1, liftH: 0.06, lX: -0.11, lZ: 0.03, rX: 0.11, rZ: -0.02, rest: false, restX: 0, restZ: 0, reach: 0.55, quickStop: 0, hold: false, pinLX: NaN, pinLZ: NaN, pinRX: NaN, pinRZ: NaN, wallNx: 0, wallNz: 0, wallD: NaN, turnStep: 0.9, ground: null, yawRate: 0, faceGoal: NaN, stride: 'velocity', pelvisYaw: NaN, crouch: 0 };
}

/**
 * (A1.2) Legs follow the body in turns: the largest planted-foot yaw from the body (`twistMax`, rad, 52 deg), the
 * least lateral gap between the feet in the pelvis frame for an airborne foot (`minGapAny`, m) within `nearAlong` m
 * front to back, and the most a foot turns in one swing (`maxSwingYaw`, rad).
 */
export const TURN_FOLLOW = { twistMax: 0.9, minGapAny: 0.08, nearAlong: 0.25, maxSwingYaw: 3.4, earlySwap: 0.85, twistFree: 0.25, minLateral: 0.055, maxLateral: 0.14 } as const;

/**
 * (CT prototype G1, audit row 1-2) Free movement (`stride: 'facing'`) turns the legs as one unit with the body, as Chaos
 * Theory does (105624 @ 24-27, 105949 @ 10-13): a planted foot turns with the root to within `TURN_FOLLOW.twistFree` (rad,
 * 14 deg; was the 52 deg `twistMax`) and stays inside a lateral band of `minLateral`..`maxLateral` m either side of the
 * root's midline (scrubbing on the floor as CT's feet do), landings aim inside the same band; aiming, walls and cover keep
 * the world-locked feet. `HEEL_RAISE`: a planted foot behind the hip rises onto its toes over the last share of its stance
 * (`from` .. 1 of the stance, up to `pitch` rad toe down), so the trailing leg stays long and the pelvis need not drop.
 */
export const HEEL_RAISE = { from: 0.5, pitch: 0.45, pitchRun: 0.55, pitchCrouch: 1.0 } as const;
/** (G1, audit rows 5 / 6) A landing aims this share of the stance's travel ahead of the hip (was 0.5): the pelvis dips less. */
export const LAND_AHEAD = 0.45;
/** (G1, audit row 9) A Chaos Theory stop's set-down lands no further than this (m, front to back) from the planted foot. */
export const STOP_SPLIT = 0.3;

/** A pinned foot further than this (m) from its pin steps onto it. */
export const PIN_TOL = 0.04;

/**
 * (locomotion step 22, A79) Heel-to-toe roll: at a walking pace (standing gears 1-3, crouched gears 1-4) a foot lands
 * heel first with the toe `pitch` up and rolls flat over `time` s after contact (the rig keeps the heel on the
 * floor while it does). Faster gaits land flatter, as before.
 */
export const HEEL_ROLL = { pitch: 0.2, time: 0.1, maxSpeed: 1.7 } as const;

/** Idle stepping thresholds. */
export const PLANNER = { idleErr: 0.075, idleStagger: 0.16, idleYawErr: 0.38, idleStepTime: 0.34, idleStepCrouch: 0.45, idleLift: 0.05, minGap: 0.13, maxStep: 2.6, swingGap: 0.1, swingNear: 0.18 };

const TAU = Math.PI * 2;
const wrap = (a: number): number => {
  a %= TAU;
  return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a;
};
const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const clampAbs = (a: number, m: number): number => (a > m ? m : a < -m ? -m : a);
/** (locomotion step 21, A80) A start's first steps (s): the trailing foot may toe off early at any speed. */
const START_TOE_OFF = 1.2;
/** (G1) A turn's after-effect (s): a foot it left behind may toe off early this long after the body stops turning. */
const TURN_LEFT_TIME = 0.6;
/** (fix 21-2) Still this long (s) before a move counts as a new start. */
const START_STILL = 0.25;
/** (fix 21-2) Time (s) over which a taken-over early toe-off's gap to the clock's swing fades out. */
const OFF_FADE = 0.15;
/** (step 22) A fresh swing the clock starts further into its window than this fades in from the foot (`OFF_FADE`). */
const FRESH_LATE = 0.2;
/** (step 22) Shares of a step tried, in turn, when its landing spot has no ground under it (0: back where it left). */
const EDGE_PULL = [0.6, 0.3, 0] as const;
/** (step 22) A stance staggered more than `min` m front to back: its front foot holds up to `hold` m short of its spot. */
const STAGGER = { min: 0.4, hold: 0.3 } as const;

export class FootPlanner {
  readonly L = newFoot();
  readonly R = newFoot();
  /** Moving on the last update (a quick stop acts on the change to still). */
  private wasMoving = false;
  /** (step 22, A79) Landings this frame roll heel to toe. */
  private rollOn = false;
  /** (step 22) Per foot (L, R): its swing target was held back to the stop's rest spot last update. */
  private restL = false;
  private restR = false;
  /** (locomotion step 21, A80) Time since moving began (s). */
  private moveT = 0;
  /** (fix 21-2) Time since the last move (s). */
  private stillT = 0;
  /** A quick stop's swings are still setting down. */
  private quick = false;
  /** (G1) Time since the body last turned faster than 1 rad/s (s). */
  private turnT = 9;

  /** Reset both feet to their ideal stance (teleport, spawn). */
  reset(i: PlannerInput): void {
    for (const side of [-1, 1] as const) {
      const f = side < 0 ? this.L : this.R;
      this.ideal(i, side, i.rootX, i.rootZ, i.yaw);
      f.x = this.ix;
      f.z = this.iz;
      f.y = i.rootY;
      f.yaw = i.yaw;
      f.contact = true;
      f.swing = -1;
      f.pitch = 0;
      f.slide = 0;
      f.scrub = 0;
      f.scrubPos = 0;
      f.init = true;
    }
  }

  private ix = 0;
  private iz = 0;

  /** Ideal stance spot for a foot around a root position (writes ix, iz). */
  private ideal(i: PlannerInput, side: -1 | 1, rx: number, rz: number, yaw: number): void {
    const lx = side < 0 ? i.lX : i.rX;
    const lz = side < 0 ? i.lZ : i.rZ;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    this.ix = rx + lx * c + lz * s;
    this.iz = rz - lx * s + lz * c;
  }

  update(i: PlannerInput): void {
    if (!this.L.init) this.reset(i);
    this.L.landed = this.R.landed = false;
    this.rollOn = i.moving && hyp2(i.velX, i.velZ) <= HEEL_ROLL.maxSpeed;
    for (let k = 0; k < 2; k++) {
      const f = k === 0 ? this.L : this.R;
      if (f.roll <= 0) continue;
      if (!f.contact) f.roll = 0;
      else {
        f.roll = Math.max(0, f.roll - i.dt);
        f.pitch = -HEEL_ROLL.pitch * smooth(f.roll / HEEL_ROLL.time);
      }
    }
    if (!i.moving && this.wasMoving && i.quickStop > 0) {
      // (G26) the feet freeze: a swing left over from moving sets straight down where it is within `quickStop`, no closing step
      for (let k = 0; k < 2; k++) {
        const f = k === 0 ? this.L : this.R;
        if (f.contact || f.swing < 0) continue;
        this.setDown(f, i);
      }
      this.quick = true;
    }
    this.wasMoving = i.moving;
    this.turnT = Math.abs(i.yawRate) > 1 ? 0 : this.turnT + i.dt;
    // (fix 21-2) a start is a move after START_STILL s still: a remote copy's moving flag flickers off for a frame or
    // two mid-gait (snapshot velocity), which must not restart the start window
    this.stillT = i.moving ? 0 : this.stillT + i.dt;
    this.moveT = i.moving ? this.moveT + i.dt : this.stillT > START_STILL ? 0 : this.moveT;
    if (i.moving) this.updateMoving(i);
    else this.updateIdle(i);
    if (this.L.contact && this.R.contact) this.quick = false;
    if (i.moving && Number.isNaN(i.wallD)) this.twistCap(i);
    if (i.moving && i.stride === 'facing' && Number.isNaN(i.wallD)) this.band(i);
    this.uncross(i);
  }

  /** (A1.2) The pelvis yaw the turn rules measure in. */
  private pelvis(i: PlannerInput): number {
    return Number.isNaN(i.pelvisYaw) ? i.yaw : i.pelvisYaw;
  }

  /** (A1.2) A planted foot never twists more than TURN_FOLLOW.twistMax from the body: it turns on the spot (counted). */
  private twistCap(i: PlannerInput): void {
    // (measured from the body yaw: a foot lands ~47 deg ahead and toes off ~47 deg behind in a full-rate spin; the pelvis
    // trails up to 20 deg, so from the pelvis a fresh landing reads up to ~67 deg for a moment)
    const py = i.yaw;
    for (let k = 0; k < 2; k++) {
      const f = k === 0 ? this.L : this.R;
      if (!f.contact) continue;
      const d = wrap(f.yaw - py);
      const m = i.stride === 'facing' ? TURN_FOLLOW.twistFree : TURN_FOLLOW.twistMax;
      if (d > m || d < -m) {
        const to = py + (d > 0 ? m : -m);
        f.scrub += Math.abs(wrap(to - f.yaw));
        f.yaw = wrap(to);
      }
    }
  }

  /**
   * (G1) Free movement: a planted foot stays within TURN_FOLLOW.minLateral..maxLateral m of the root's midline on its own
   * side (root frame), scrubbing sideways when the body turns round it (counted in `scrubPos`).
   */
  private band(i: PlannerInput): void {
    const c = Math.cos(i.yaw);
    const s = Math.sin(i.yaw);
    for (let k = 0; k < 2; k++) {
      const f = k === 0 ? this.L : this.R;
      if (!f.contact) continue;
      const side = k === 0 ? -1 : 1;
      const lat = ((f.x - i.rootX) * c - (f.z - i.rootZ) * s) * side;
      const cl = lat < TURN_FOLLOW.minLateral ? TURN_FOLLOW.minLateral : lat > TURN_FOLLOW.maxLateral ? TURN_FOLLOW.maxLateral : lat;
      if (cl === lat) continue;
      const d = (cl - lat) * side;
      f.x += d * c;
      f.z -= d * s;
      f.scrubPos += Math.abs(d);
    }
  }

  /**
   * (A1.2) Hard no-crossing post-pass in the pelvis frame: an airborne foot within TURN_FOLLOW.nearAlong front to back of
   * the other is pushed outward to at least TURN_FOLLOW.minGapAny from it; a planted foot is never moved.
   */
  private uncross(i: PlannerInput): void {
    const py = this.pelvis(i);
    const c = Math.cos(py);
    const s = Math.sin(py);
    const L = this.L;
    const R = this.R;
    if (L.contact && R.contact) return;
    const along = (L.x - R.x) * s + (L.z - R.z) * c;
    if (along > TURN_FOLLOW.nearAlong || along < -TURN_FOLLOW.nearAlong) return;
    const gap = (R.x - L.x) * c - (R.z - L.z) * s;
    const bad = TURN_FOLLOW.minGapAny - gap;
    if (bad <= 0) return;
    // the airborne foot moves (both airborne: each half)
    const kL = L.contact ? 0 : R.contact ? 1 : 0.5;
    const kR = 1 - kL;
    L.x -= bad * kL * c;
    L.z += bad * kL * s;
    R.x += bad * kR * c;
    R.z -= bad * kR * s;
  }

  // --- moving: contacts from the gait clock -------------------------------------------------
  private updateMoving(i: PlannerInput): void {
    for (const side of [-1, 1] as const) {
      const f = side < 0 ? this.L : this.R;
      const strike = side < 0 ? 0 : 0.5;
      const sinceStrike = (((i.phase - strike) % 1) + 1) % 1;
      const wantContact = sinceStrike < i.duty;
      if (!wantContact) {
        const s = (sinceStrike - i.duty) / (1 - i.duty);
        // (G1) a rule step (a turn's step round, a no-crossing step) mostly done when the clock's swing window opens, past
        // a start: it lands, and the clock's swing starts from there (taking it over jumped the foot up to its landing
        // spot, ~0.5 m in a frame in a crouched turn)
        if (!f.contact && f.swing >= 0.5 && f.swBase < 0 && !this.quick && this.moveT >= START_TOE_OFF) this.land(f);
        const fresh = f.contact || f.swing < 0;
        if (fresh) {
          this.beginSwing(f, i, (1 - i.duty) * i.cycleTime, i.liftH);
          f.swBase = 0;
        }
        // (fix 21-2) the clock takes over an early toe-off already in the air (a start, A80): its target moves on to
        // the clock's landing spot, up to a stride further on; the foot keeps where it is and the difference fades out
        // over the rest of the swing (it jumped up to 68 cm in one frame on a remote copy, the pelvis dropped 9 cm to
        // reach it and the ankle snapped 70-80 deg)
        const takeover = !fresh && f.swBase < 0;
        if (takeover) {
          f.swBase = f.swing;
          f.offBase = -1;
          f.offX = f.x;
          f.offY = f.y;
          f.offZ = f.z;
        }
        // slow near starts and stops, but a step never hangs in the air for long
        f.stepDur = Math.min(0.6, (1 - i.duty) * i.cycleTime);
        // remaining time to land, then half a stance ahead so mid-stance is under the hip
        const toLand = (1 - s) * f.stepDur;
        // land ahead by at most what the leg can reach (at a sprint half a stance would overreach: the
        // foot lands nearer and toes off early instead)
        // (A1.2) facing mode: the stride runs along the facing at the facing-projected pace (backwards only on the slow
        // back walk), and the root is predicted on the turn's arc (chord at the mid yaw), not on the velocity's tangent
        let vx = i.velX;
        let vz = i.velZ;
        const fy = Math.sin(i.yaw);
        const fz = Math.cos(i.yaw);
        if (i.stride === 'facing') {
          const along = vx * fy + vz * fz;
          const vf = along >= 0 || !this.backWalk(i) ? Math.max(0, along) : along;
          vx = fy * vf;
          vz = fz * vf;
        }
        const v = hyp2(vx, vz);
        // (G1) a little short of half a stance: the trailing foot's heel raise (HEEL_RAISE) lengthens it at the back
        const ahead = Math.min(i.duty * i.cycleTime * LAND_AHEAD * v, i.reach * 0.75);
        const lead = toLand + (v > 1e-3 ? ahead / v : 0);
        const cap = Number.isNaN(i.faceGoal) ? Math.PI / 2 : Math.abs(wrap(i.faceGoal - i.yaw));
        const dy = clampAbs(i.yawRate * lead, cap);
        let rx: number;
        let rz: number;
        if (i.stride === 'facing' && dy !== 0) {
          const ha = i.yaw + dy * 0.5;
          const vf = vx * fy + vz * fz;
          rx = i.rootX + Math.sin(ha) * vf * lead;
          rz = i.rootZ + Math.cos(ha) * vf * lead;
        } else {
          rx = i.rootX + vx * lead;
          rz = i.rootZ + vz * lead;
        }
        // the foot lands at the predicted mid-stance yaw: half the stance's turn ahead at touchdown, half behind at toe-off
        // (G1) free movement: no more than TURN_FOLLOW.twistFree ahead of the body at touchdown (the feet turn with it)
        const landYaw =
          i.stride === 'facing'
            ? wrap(i.yaw + clampAbs(clampAbs(i.yawRate * toLand, cap) + clampAbs(i.yawRate * 0.5 * i.duty * i.cycleTime, TURN_FOLLOW.twistFree), cap))
            : wrap(i.yaw + clampAbs(i.yawRate * (toLand + 0.5 * i.duty * i.cycleTime), cap));
        let clamped = false;
        if (i.rest) {
          // distance matching: do not land beyond where the body will stop
          const ahead = (rx - i.restX) * i.velX + (rz - i.restZ) * i.velZ;
          if (ahead > 0) {
            rx = i.restX;
            rz = i.restZ;
            clamped = true;
          }
        }
        const prevToX = f.toX;
        const prevToZ = f.toZ;
        this.aim(f, i, side, rx, rz, landYaw);
        // an early toe-off already in the air goes on from its progress to land on the clock (restarting from
        // the clock's 0 snaps the foot back to where it left the ground and the pelvis drops to reach it)
        const sp = f.swBase + (1 - f.swBase) * s;
        // (step 22, M14) a swing re-aimed at the stop's rest spot (or let go of it) mid-air: the jump in its target
        // fades out over OFF_FADE instead of moving the foot in one frame (a stop from gear 4-6 snapped the swing
        // foot back up to 27 cm: knee and hip 33-45 deg in a frame)
        const wasClamped = side < 0 ? this.restL : this.restR;
        if (clamped !== wasClamped && !fresh && !takeover) {
          const h = smooth(sp);
          const k = f.offBase >= 0 ? 1 - smooth(f.offBase / OFF_FADE) : 0;
          f.offX = f.offX * k - (f.toX - prevToX) * h;
          f.offY = f.offY * k;
          f.offZ = f.offZ * k - (f.toZ - prevToZ) * h;
          f.offBase = 0;
        }
        if (side < 0) this.restL = clamped;
        else this.restR = clamped;
        this.swingTo(f, i, sp);
        // (step 22, M14) a swing the clock starts late in its window (the first frame moving after a landing: the pace
        // now carries over a drop) starts from where the foot is and fades onto the clock's swing over OFF_FADE (it
        // jumped 0.4 m in one frame, drop24 ankle 43 deg a frame); along the ground only (its height follows the swing)
        if (fresh && s > FRESH_LATE) {
          f.offX = f.fromX - f.x;
          f.offY = 0;
          f.offZ = f.fromZ - f.z;
          f.offBase = 0;
          f.x = f.fromX;
          f.z = f.fromZ;
        }
        // (only in a start's first START_TOE_OFF s, the early toe-offs A80 adds, and not turning: in a turn's
        // reversal the held offset put the swing foot across the planted one, turn180 selfShanks 1.3 -> 8 cm).
        // (A82) Not when the travel has reversed against the foot's heading: the body's yaw has only begun to turn on
        // a reversal's first frames (0.2 rad, inside the yaw test), but the velocity already points back
        if (
          takeover &&
          f.swBase > 0 &&
          f.swBase < 0.9 &&
          this.moveT < START_TOE_OFF &&
          Math.abs(wrap(i.yaw - f.fromYaw)) < 0.35 &&
          i.velX * Math.sin(f.fromYaw) + i.velZ * Math.cos(f.fromYaw) > 0
        ) {
          f.offX -= f.x;
          f.offY -= f.y;
          f.offZ -= f.z;
          f.offBase = 0;
          f.x += f.offX;
          f.y += f.offY;
          f.z += f.offZ;
        }
        f.stepT = sp * f.stepDur;
      } else if (!f.contact) {
        // a step still in the air when the clock says contact (e.g. an idle step as walking starts)
        f.swBase = -1;
        if (f.swing >= 0.9) this.land(f);
        else this.swingTo(f, i, Math.min(1, f.swing + i.dt / f.stepDur));
      } else {
        this.holdOrStep(f, i, side);
        // (G1) late stance: the heel comes up, the foot rolls onto its toes (after the heel-first roll has ended)
        if (f.contact && f.roll <= 0) {
          const u = (sinceStrike / i.duty - HEEL_RAISE.from) / (1 - HEEL_RAISE.from);
          const v = hyp2(i.velX, i.velZ);
          const stand = HEEL_RAISE.pitch + (HEEL_RAISE.pitchRun - HEEL_RAISE.pitch) * Math.min(1, v / 3);
          const top = stand + (HEEL_RAISE.pitchCrouch - stand) * (i.crouch < 0 ? 0 : i.crouch > 1 ? 1 : i.crouch);
          f.pitch = u > 0 ? top * smooth(u) : 0;
        }
      }
    }
  }

  // --- still: planted, deliberate steps when out of place -----------------------------------
  private updateIdle(i: PlannerInput): void {
    const dt = i.dt;
    // (G1, audit row 29) crouched the idle steps are slower and more deliberate (CT ~1 step per 0.5 s)
    const idleT = PLANNER.idleStepTime + (PLANNER.idleStepCrouch - PLANNER.idleStepTime) * (i.crouch < 0 ? 0 : i.crouch > 1 ? 1 : i.crouch);
    for (const side of [-1, 1] as const) {
      const f = side < 0 ? this.L : this.R;
      // (G1) a heel raised at the end of a stance comes back down once still (~0.15 s)
      if (f.contact && f.roll <= 0 && f.pitch > 0) f.pitch = f.pitch < 1e-3 ? 0 : f.pitch * Math.exp(-dt / 0.05);
      if (f.contact) continue;
      // finish the step; a gait swing left over from moving (slow near a stop) finishes at idle pace (a quick stop
      // sets it down sooner, already timed above)
      if (!this.quick && f.stepDur > idleT * 1.2) {
        f.stepDur = idleT;
        f.stepT = Math.max(0, f.swing) * f.stepDur;
      }
      f.stepT += dt;
      const s = Math.min(1, f.stepT / f.stepDur);
      // (a quick stop's leftover swing lands where its stride was going: the stance it stopped in)
      if (this.pinned(i, side)) this.aimPin(f, i, side);
      else if (!this.quick) this.aim(f, i, side, i.rootX, i.rootZ, i.goalYaw);
      this.swingTo(f, i, s);
      if (s >= 1) this.land(f);
    }
    if (!this.L.contact || !this.R.contact) return;
    // pinned (a remote's feet on the owner's): a planted foot off its pin steps onto it
    if (this.pinned(i, -1) || this.pinned(i, 1)) {
      for (const side of [-1, 1] as const) {
        const f = side < 0 ? this.L : this.R;
        if (!this.pinned(i, side) || !f.contact) continue;
        const px = side < 0 ? i.pinLX : i.pinRX;
        const pz = side < 0 ? i.pinLZ : i.pinRZ;
        if (hyp2(f.x - px, f.z - pz) <= PIN_TOL) continue;
        this.beginSwing(f, i, idleT, PLANNER.idleLift);
        f.probeT = 0;
        this.aimPin(f, i, side);
        // one foot at a time
        return;
      }
      return;
    }
    // holding a stop: the feet stay in the stride
    if (i.hold) return;
    // both planted: step the foot furthest from its ideal spot, if far enough
    let worst: FootState | null = null;
    let worstSide: -1 | 1 = -1;
    let worstErr = 0;
    for (const side of [-1, 1] as const) {
      const f = side < 0 ? this.L : this.R;
      this.ideal(i, side, i.rootX, i.rootZ, i.goalYaw);
      // a relaxed stance tolerates a front-back stagger (a stop's settling step leaves one), not a
      // sideways one
      const ex = f.x - this.ix;
      const ez = f.z - this.iz;
      let fwd = ex * Math.sin(i.goalYaw) + ez * Math.cos(i.goalYaw);
      const lat = ex * Math.cos(i.goalYaw) - ez * Math.sin(i.goalYaw);
      // (step 22) a staggered stance (the kneel) is entered by the rear foot only: the front foot short of its spot
      // stays planted (lifting it after the rear foot stepped back left the body over nothing: an eased stop ends with
      // the feet square, so both stepped; flat-crouch3-aim balance 36 cm)
      if (fwd < 0 && (side < 0 ? i.lZ - i.rZ : i.rZ - i.lZ) > STAGGER.min) fwd = Math.min(0, fwd + STAGGER.hold);
      const err = hyp2(fwd / PLANNER.idleStagger, lat / PLANNER.idleErr) + Math.abs(wrap(f.yaw - i.goalYaw)) / PLANNER.idleYawErr;
      if (err > worstErr) {
        worstErr = err;
        worst = f;
        worstSide = side;
      }
    }
    if (worst && worstErr > 1) {
      this.beginSwing(worst, i, idleT, PLANNER.idleLift);
      worst.stepT = 0;
      this.aim(worst, i, worstSide, i.rootX, i.rootZ, i.goalYaw);
    }
  }

  /** A planted foot stays put unless the body has moved out of reach (then it must step). */
  private holdOrStep(f: FootState, i: PlannerInput, side: -1 | 1): void {
    // (step 11) turned well away from the body (a turn onto a wall): step round with it, one foot at a time
    const o = side < 0 ? this.R : this.L;
    // (A1.2) the rules also fire while the other foot is nearly down: it lands now (an early swap, never both in the air)
    // (only a rule step: a clock swing landed early would restart its window at once)
    const swap = !o.contact && o.swing >= TURN_FOLLOW.earlySwap && o.swBase < 0 && !this.quick;
    const turned = Math.abs(wrap(f.yaw - i.yaw)) > i.turnStep;
    const c = Math.cos(i.yaw);
    const sn = Math.sin(i.yaw);
    const ox = o.contact ? o.x : o.toX;
    const oz = o.contact ? o.z : o.toZ;
    const crossed = ((f.x - ox) * c - (f.z - oz) * sn) * side < PLANNER.minGap * 0.5;
    if ((o.contact || swap) && (turned || crossed)) {
      if (!o.contact) this.land(o);
    }
    if (o.contact && turned) {
      this.beginSwing(f, i, PLANNER.idleStepTime * 0.75, i.liftH);
      this.aim(f, i, side, i.rootX, i.rootZ, i.yaw);
      return;
    }
    // (A1.1) the body has turned round the planted feet until they are side by side or crossed in its frame (a tight
    // circle): this foot steps round to its own side
    if (o.contact) {
      const gap = ((f.x - o.x) * c - (f.z - o.z) * sn) * side;
      if (gap < PLANNER.minGap * 0.5) {
        this.beginSwing(f, i, PLANNER.idleStepTime * 0.75, i.liftH);
        this.aim(f, i, side, i.rootX, i.rootZ, i.yaw);
        return;
      }
    }
    // measured from under its own hip (the foot's stance spot), not the root centre: a side-step's
    // trailing foot is a hip width further from the centre than the leg is actually stretched
    const lx = side < 0 ? i.lX : i.rX;
    const hx = i.rootX + lx * Math.cos(i.yaw);
    const hz = i.rootZ - lx * Math.sin(i.yaw);
    const dx = f.x - hx;
    const dz = f.z - hz;
    // a planted foot trails up to half a stance behind the hip at speed
    const reach = Math.max(i.reach, hyp2(i.velX, i.velZ) * i.duty * i.cycleTime * 0.5 + 0.3);
    // moving: toe off before the leg is stretched past what the IK can hold planted
    // (locomotion step 21, D2, A80) over 2 m/s, and in a start's first START_TOE_OFF s at any speed: a walk start at
    // gear 1 held the trailing foot planted 0.2 s past its reach and the pelvis sank 10 cm (a start bob, and a second
    // high in the first step). Only at the start: mid-gait on a remote copy it toed off against the clock (stairs slid)
    // (G1, audit rows 1 / 6) and turning in free movement: a foot the turn has left behind toes off before it stretches the
    // leg (zig-zag walks dropped the pelvis 10 cm for a trailing foot 0.49 m behind)
    const turnLeft = i.stride === 'facing' && this.turnT < TURN_LEFT_TIME && hyp2(dx, dz) > i.reach * 0.85;
    // (G1, audit row 13) a start's trailing foot goes a little sooner (0.92 -> 0.82 of the reach): the first stride's
    // double support no longer sinks the pelvis 9 cm
    const dl = hyp2(dx, dz);
    const startOff = this.moveT < START_TOE_OFF && dl > i.reach * 0.82;
    if (i.moving && (turnLeft || startOff || (dl > i.reach * 0.92 && hyp2(i.velX, i.velZ) > 2))) {
      // accelerating (a sprint or a walk start): the trailing foot toes off early instead of sliding or pulling the
      // pelvis down; the clock's contact window then lands it ahead
      this.beginSwing(f, i, Math.min(0.6, (1 - i.duty) * i.cycleTime), i.liftH);
      this.aim(f, i, side, i.rootX + i.velX * f.stepDur, i.rootZ + i.velZ * f.stepDur, i.yaw);
      return;
    }
    if (hyp2(dx, dz) > reach) {
      // out of reach while locked: drag (counted) back to the reach limit; a real step follows
      const d = hyp2(dx, dz);
      const k = reach / d;
      const nx = hx + dx * k;
      const nz = hz + dz * k;
      f.slide += hyp2(nx - f.x, nz - f.z);
      f.x = nx;
      f.z = nz;
    }
  }

  private beginSwing(f: FootState, i: PlannerInput, dur: number, lift: number): void {
    f.contact = false;
    f.fromX = f.x;
    f.fromY = f.y;
    f.fromZ = f.z;
    f.fromYaw = f.yaw;
    f.stepDur = Math.max(0.16, dur);
    f.stepLift = lift;
    f.stepT = 0;
    f.swing = 0;
    f.probeT = 0;
    f.swBase = -1;
    f.offBase = -1;
    // (G1) a heel already raised at toe-off carries its pitch into the swing (no ankle snap)
    f.fromPitch = f.pitch > 0 ? f.pitch : 0;
    void i;
  }

  /** Update a swinging foot's landing target (ideal spot around a root position), feet never crossing. */
  private aim(f: FootState, i: PlannerInput, side: -1 | 1, rx: number, rz: number, yaw: number): void {
    this.ideal(i, side, rx, rz, yaw);
    let tx = this.ix;
    let tz = this.iz;
    // no crossing: keep a gap from the other foot along the body's lateral axis
    const other = side < 0 ? this.R : this.L;
    // (A1.1) measured in the landing foot's own frame (the yaw it lands at), not the body's current one: the body
    // yaw moves ~90 deg per 0.2 s in a fast turn
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const ox = other.contact ? other.x : other.toX;
    const oz = other.contact ? other.z : other.toZ;
    const latT = (tx - rx) * c - (tz - rz) * s;
    const latO = (ox - rx) * c - (oz - rz) * s;
    const gapNeed = PLANNER.minGap;
    const bad = side < 0 ? latT - (latO - gapNeed) : latO + gapNeed - latT;
    if (bad > 0) {
      const shift = side < 0 ? -bad : bad;
      tx += shift * c;
      tz += -shift * s;
    }
    // (A1.2) and against the other foot where it is now, in the current pelvis frame, when they land near each other
    const py = this.pelvis(i);
    const pc = Math.cos(py);
    const ps = Math.sin(py);
    const oxN = other.x;
    const ozN = other.z;
    const alongP = (tx - oxN) * ps + (tz - ozN) * pc;
    if (alongP < TURN_FOLLOW.nearAlong && alongP > -TURN_FOLLOW.nearAlong) {
      const gapP = ((tx - oxN) * pc - (tz - ozN) * ps) * side;
      const badP = gapNeed - gapP;
      if (badP > 0) {
        tx += badP * side * pc;
        tz -= badP * side * ps;
      }
    }
    // (G1) free movement: the landing stays inside the stance band either side of the midline (no lateral splay)
    if (i.stride === 'facing' && Number.isNaN(i.wallD)) {
      const lat = ((tx - rx) * c - (tz - rz) * s) * side;
      const cl = lat < TURN_FOLLOW.minLateral ? TURN_FOLLOW.minLateral : lat > TURN_FOLLOW.maxLateral ? TURN_FOLLOW.maxLateral : lat;
      if (cl !== lat) {
        const d = (cl - lat) * side;
        tx += d * c;
        tz -= d * s;
      }
    }
    // limit the step length from where the foot left the ground
    const sx = tx - f.fromX;
    const sz = tz - f.fromZ;
    const sl = hyp2(sx, sz);
    if (sl > PLANNER.maxStep) {
      tx = f.fromX + (sx * PLANNER.maxStep) / sl;
      tz = f.fromZ + (sz * PLANNER.maxStep) / sl;
    }
    // (step 11) never behind a wall's face
    if (!Number.isNaN(i.wallD)) {
      const behind = tx * i.wallNx + tz * i.wallNz - i.wallD;
      if (behind < 0) {
        tx -= behind * i.wallNx;
        tz -= behind * i.wallNz;
      }
    }
    // ground under the landing spot (refreshed a few times per swing)
    f.probeT -= i.dt;
    if (f.probeT <= 0) {
      f.probeT = 0.08;
      // (step 22) never past a drop's edge: a spot with no ground in the probe's reach (walking off a ledge) is pulled
      // back toward where the foot left (`EDGE_PULL`); landing there at the root's height left the foot planted in
      // the air past the edge (drop09 footFloat 29-92 cm)
      let k = 1;
      let g = this.groundHit(i, tx, tz);
      for (let n = 0; n < EDGE_PULL.length && Number.isNaN(g); n++) {
        k = EDGE_PULL[n] ?? 0;
        g = this.groundHit(i, f.fromX + (tx - f.fromX) * k, f.fromZ + (tz - f.fromZ) * k);
      }
      f.edgeK = k;
      f.toY = Number.isNaN(g) ? i.rootY : g;
    }
    if (f.edgeK < 1) {
      tx = f.fromX + (tx - f.fromX) * f.edgeK;
      tz = f.fromZ + (tz - f.fromZ) * f.edgeK;
    }
    f.toX = tx;
    f.toZ = tz;
    f.toYaw = yaw;
  }

  /**
   * Ground height under a landing spot, within -0.4..+0.45 m of the root. (fix 21-3) The probe starts 0.6 m over the
   * root; ground higher than that (a stride ahead up a 35 deg slope at a sprint) missed it and the foot aimed at the
   * root's height, 30-60 cm under the slope, then jumped up when a later probe hit: a second probe from higher up
   * takes only ground the first one started under.
   */
  private groundAt(i: PlannerInput, x: number, z: number): number {
    const g = this.groundHit(i, x, z);
    return Number.isNaN(g) ? i.rootY : g;
  }

  /** `groundAt`, NaN when neither probe finds ground (a drop: past a ledge's edge). */
  private groundHit(i: PlannerInput, x: number, z: number): number {
    if (!i.ground) return i.rootY;
    let g = i.ground(x, z, i.rootY + 0.6);
    if (g === null) {
      g = i.ground(x, z, i.rootY + 1.1);
      if (g !== null && g < i.rootY + 0.6) g = null;
    }
    return g === null ? Number.NaN : Math.max(i.rootY - 0.4, Math.min(i.rootY + 0.45, g));
  }

  /** (A1.2) The slow back walk: travelling against the facing at under 0.9 m/s. */
  private backWalk(i: PlannerInput): boolean {
    const v = hyp2(i.velX, i.velZ);
    return v < 0.9 && i.velX * Math.sin(i.yaw) + i.velZ * Math.cos(i.yaw) < -0.7 * v;
  }

  private pinned(i: PlannerInput, side: -1 | 1): boolean {
    return side < 0 ? !Number.isNaN(i.pinLX) : !Number.isNaN(i.pinRX);
  }

  /** A swinging foot's landing target on its pin (ground probed as `aim`). */
  private aimPin(f: FootState, i: PlannerInput, side: -1 | 1): void {
    f.toX = side < 0 ? i.pinLX : i.pinRX;
    f.toZ = side < 0 ? i.pinLZ : i.pinRZ;
    if (!Number.isNaN(i.wallD)) {
      const behind = f.toX * i.wallNx + f.toZ * i.wallNz - i.wallD;
      if (behind < 0) {
        f.toX -= behind * i.wallNx;
        f.toZ -= behind * i.wallNz;
      }
    }
    f.toYaw = i.goalYaw;
    f.probeT -= i.dt;
    if (f.probeT <= 0) {
      f.probeT = 0.08;
      f.toY = this.groundAt(i, f.toX, f.toZ);
    }
  }

  /** Instant stop: a foot in the air sets straight down where it is, over `quickStop` (the stride it stopped in). */
  private setDown(f: FootState, i: PlannerInput): void {
    f.fromX = f.toX = f.x;
    f.fromZ = f.toZ = f.z;
    f.fromY = f.y;
    f.fromYaw = f.toYaw = f.yaw;
    // (G1, audit row 9) the freeze keeps a small split: a foot just off the ground behind (or reaching far ahead) sets
    // down within STOP_SPLIT front to back of the planted one, with a little lift when it has to travel
    const o = f === this.L ? this.R : this.L;
    let move = 0;
    if (o.contact) {
      const sn = Math.sin(i.yaw);
      const cs = Math.cos(i.yaw);
      const fwd = (f.x - o.x) * sn + (f.z - o.z) * cs;
      const cl = fwd > STOP_SPLIT ? STOP_SPLIT : fwd < -STOP_SPLIT ? -STOP_SPLIT : fwd;
      if (cl !== fwd) {
        f.toX += (cl - fwd) * sn;
        f.toZ += (cl - fwd) * cs;
        move = Math.abs(cl - fwd);
      }
    }
    f.toY = this.groundAt(i, f.toX, f.toZ);
    f.stepLift = move > 0.05 ? 0.035 : 0;
    f.stepT = 0;
    f.stepDur = Math.max(1e-3, i.quickStop, move > 0.05 ? 0.16 : 0);
    f.fromPitch = f.pitch;
    f.swing = 0;
    f.swBase = -1;
    f.offBase = -1;
  }

  /** Position along the swing at progress s. */
  private swingTo(f: FootState, i: PlannerInput, s: number): void {
    f.swing = s;
    const h = smooth(s);
    f.x = f.fromX + (f.toX - f.fromX) * h;
    f.z = f.fromZ + (f.toZ - f.fromZ) * h;
    // lift peaks early (heel comes up first), sets down gently
    const arc = Math.sin(Math.PI * Math.min(1, s * 1.08)) * (1 - 0.25 * s);
    f.y = f.fromY + (f.toY - f.fromY) * h + f.stepLift * Math.max(0, arc);
    if (f.offBase >= 0) {
      // (fix 21-2) a taken-over early toe-off: the gap to the clock's swing fades out over OFF_FADE s (a landing
      // before then lands where the foot is)
      f.offBase += i.dt;
      const k = 1 - smooth(f.offBase / OFF_FADE);
      f.x += f.offX * k;
      f.y += f.offY * k;
      f.z += f.offZ * k;
      if (k <= 0) f.offBase = -1;
    }
    // passing the planted foot (a side-step back across, a reversal) the swing bows out sideways to `swingGap` from
    // it, so the feet never brush; the ends of the swing stay where they are
    const o = f === this.L ? this.R : this.L;
    if (o.contact) {
      // (A1.2) in the current pelvis frame, and a window that widens with the turn rate
      const py = this.pelvis(i);
      const c = Math.cos(py);
      const sn = Math.sin(py);
      const along = (f.x - o.x) * sn + (f.z - o.z) * c;
      const near = PLANNER.swingNear * (1 + Math.min(1.5, Math.abs(i.yawRate) * 0.2));
      if (along < near && along > -near) {
        const latF = (f.x - i.rootX) * c - (f.z - i.rootZ) * sn;
        const latO = (o.x - i.rootX) * c - (o.z - i.rootZ) * sn;
        const bad = f === this.L ? latF - (latO - PLANNER.swingGap) : latO + PLANNER.swingGap - latF;
        if (bad > 0) {
          const shift = (f === this.L ? -bad : bad) * Math.sin(Math.PI * s);
          f.x += shift * c;
          f.z -= shift * sn;
        }
      }
    }
    // (A1.2) the foot turns the way the body turns (past 115 deg the shortest way could swing it through the other leg),
    // at most TURN_FOLLOW.maxSwingYaw a swing (the landing yaw is held there too)
    let dy = wrap(f.toYaw - f.fromYaw);
    if ((dy > 2 || dy < -2) && Math.abs(i.yawRate) > 1 && Math.sign(dy) !== Math.sign(i.yawRate)) dy += TAU * Math.sign(i.yawRate);
    if (dy > TURN_FOLLOW.maxSwingYaw || dy < -TURN_FOLLOW.maxSwingYaw) {
      dy = clampAbs(dy, TURN_FOLLOW.maxSwingYaw);
      f.toYaw = wrap(f.fromYaw + dy);
    }
    f.yaw = wrap(f.fromYaw + dy * h);
    // toe-off then heel strike: toe down early, toe up just before landing
    // (locomotion step 21, A80) the toe-off pitch eases in over the first tenth of the swing: it started at 0.45 rad
    // (26 deg) on the lift frame, an ankle snap of 25-36 deg a frame once the pelvis stopped dropping for the swing
    // (step 22) a quick stop's set-down or closing step eases the toe flat from where it was (restarting the toe-off
    // there tipped the ankle 22 deg in a frame at 120 Hz, flat-stand4)
    if (this.quick) f.pitch = f.fromPitch * (1 - smooth(s));
    else f.pitch = s < 0.3 ? Math.max(0.45 * (1 - s / 0.3) * smooth(s / 0.1), f.fromPitch * (1 - smooth(s / 0.3))) : s > 0.72 ? -0.22 * smooth((s - 0.72) / 0.2) * (1 - (this.rollOn ? 1 - HEEL_ROLL.pitch / 0.22 : 1) * smooth((s - 0.92) / 0.08)) : 0;
  }

  private land(f: FootState): void {
    if (f.offBase >= 0) {
      // (fix 21-2) still fading a taken-over swing's offset: set down where the foot is
      f.toX = f.x;
      f.toZ = f.z;
      f.offBase = -1;
    }
    f.x = f.toX;
    f.y = f.toY;
    f.z = f.toZ;
    f.yaw = f.toYaw;
    f.contact = true;
    f.swing = -1;
    // (step 22, A79) heel first at a walking pace: the toe comes down over HEEL_ROLL.time
    f.roll = this.rollOn ? HEEL_ROLL.time : 0;
    f.pitch = this.rollOn ? -HEEL_ROLL.pitch : 0;
    f.landed = true;
  }
}
