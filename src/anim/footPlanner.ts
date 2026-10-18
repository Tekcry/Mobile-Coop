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
  return { x: 0, y: 0, z: 0, yaw: 0, contact: true, swing: -1, pitch: 0, fromPitch: 0, roll: 0, landed: false, slide: 0, fromX: 0, fromY: 0, fromZ: 0, fromYaw: 0, toX: 0, toY: 0, toZ: 0, toYaw: 0, stepT: 0, stepDur: 0.3, stepLift: 0.05, probeT: 0, edgeK: 1, swBase: -1, offX: 0, offY: 0, offZ: 0, offBase: -1, init: false };
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
}

export function emptyPlannerInput(): PlannerInput {
  return { dt: 0, rootX: 0, rootY: 0, rootZ: 0, yaw: 0, goalYaw: 0, velX: 0, velZ: 0, moving: false, phase: 0, duty: 0.62, cycleTime: 1.1, liftH: 0.06, lX: -0.11, lZ: 0.03, rX: 0.11, rZ: -0.02, rest: false, restX: 0, restZ: 0, reach: 0.55, quickStop: 0, hold: false, pinLX: NaN, pinLZ: NaN, pinRX: NaN, pinRZ: NaN, wallNx: 0, wallNz: 0, wallD: NaN, turnStep: Infinity, ground: null };
}

/** A pinned foot further than this (m) from its pin steps onto it. */
export const PIN_TOL = 0.04;

/**
 * (locomotion step 22, A79) Heel-to-toe roll: at a walking pace (standing gears 1-3, crouched gears 1-4) a foot lands
 * heel first with the toe `pitch` up and rolls flat over `time` s after contact (the rig keeps the heel on the
 * floor while it does). Faster gaits land flatter, as before.
 */
export const HEEL_ROLL = { pitch: 0.12, time: 0.1, maxSpeed: 1.7 } as const;

/** Idle stepping thresholds. */
export const PLANNER = { idleErr: 0.075, idleStagger: 0.16, idleYawErr: 0.38, idleStepTime: 0.34, idleLift: 0.05, minGap: 0.13, maxStep: 2.6, swingGap: 0.1, swingNear: 0.18 };

const TAU = Math.PI * 2;
const wrap = (a: number): number => {
  a %= TAU;
  return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a;
};
const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** (locomotion step 21, A80) A start's first steps (s): the trailing foot may toe off early at any speed. */
const START_TOE_OFF = 1.2;
/**
 * (locomotion step 22, M14) A planted foot turned more than `PIVOT_TURN` (rad) from the body: the reversal pivot (A88)
 * has turned the body over it and pushes off the other way (the travel within 60 deg of the foot's heel). While the other foot is in the air it holds its spot out
 * to `PIVOT_REACH` x its reach instead of being dragged after the body (turn180 footSlideR 6.7 cm); a toe-off there
 * would be a flight phase (pelvis jump 29 cm).
 */
const PIVOT_TURN = 1.2;
const PIVOT_REACH = 1.15;
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

  /** Root-space lateral coordinate of a world point. */
  private lateral(i: PlannerInput, x: number, z: number): number {
    return (x - i.rootX) * Math.cos(i.yaw) - (z - i.rootZ) * Math.sin(i.yaw);
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
    // (fix 21-2) a start is a move after START_STILL s still: a remote copy's moving flag flickers off for a frame or
    // two mid-gait (snapshot velocity), which must not restart the start window
    this.stillT = i.moving ? 0 : this.stillT + i.dt;
    this.moveT = i.moving ? this.moveT + i.dt : this.stillT > START_STILL ? 0 : this.moveT;
    if (i.moving) this.updateMoving(i);
    else this.updateIdle(i);
    if (this.L.contact && this.R.contact) this.quick = false;
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
        const v = hyp2(i.velX, i.velZ);
        const ahead = Math.min(i.duty * i.cycleTime * 0.5 * v, i.reach * 0.75);
        const lead = toLand + (v > 1e-3 ? ahead / v : 0);
        let rx = i.rootX + i.velX * lead;
        let rz = i.rootZ + i.velZ * lead;
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
        this.aim(f, i, side, rx, rz, i.yaw);
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
      }
    }
  }

  // --- still: planted, deliberate steps when out of place -----------------------------------
  private updateIdle(i: PlannerInput): void {
    const dt = i.dt;
    for (const side of [-1, 1] as const) {
      const f = side < 0 ? this.L : this.R;
      if (f.contact) continue;
      // finish the step; a gait swing left over from moving (slow near a stop) finishes at idle pace (a quick stop
      // sets it down sooner, already timed above)
      if (!this.quick && f.stepDur > PLANNER.idleStepTime * 1.2) {
        f.stepDur = PLANNER.idleStepTime;
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
        this.beginSwing(f, i, PLANNER.idleStepTime, PLANNER.idleLift);
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
      this.beginSwing(worst, i, PLANNER.idleStepTime, PLANNER.idleLift);
      worst.stepT = 0;
      this.aim(worst, i, worstSide, i.rootX, i.rootZ, i.goalYaw);
    }
  }

  /** A planted foot stays put unless the body has moved out of reach (then it must step). */
  private holdOrStep(f: FootState, i: PlannerInput, side: -1 | 1): void {
    // (step 11) turned well away from the body (a turn onto a wall): step round with it, one foot at a time
    const o = side < 0 ? this.R : this.L;
    if (o.contact && Math.abs(wrap(f.yaw - i.yaw)) > i.turnStep) {
      this.beginSwing(f, i, PLANNER.idleStepTime * 0.75, i.liftH);
      this.aim(f, i, side, i.rootX, i.rootZ, i.yaw);
      return;
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
    if (hyp2(dx, dz) > i.reach * 0.92 && i.moving && (hyp2(i.velX, i.velZ) > 2 || this.moveT < START_TOE_OFF)) {
      // accelerating (a sprint or a walk start): the trailing foot toes off early instead of sliding or pulling the
      // pelvis down; the clock's contact window then lands it ahead
      this.beginSwing(f, i, Math.min(0.6, (1 - i.duty) * i.cycleTime), i.liftH);
      this.aim(f, i, side, i.rootX + i.velX * f.stepDur, i.rootZ + i.velZ * f.stepDur, i.yaw);
      return;
    }
    // (step 22, M14) the reversal pivot: the planted foot turned back under a body pushing off the other way holds its
    // spot to a longer reach while the other foot is still in the air (no flight phase; the clock lifts it next)
    const pivotReach =
      !o.contact && Math.abs(wrap(f.yaw - i.yaw)) > PIVOT_TURN && i.velX * Math.sin(f.yaw) + i.velZ * Math.cos(f.yaw) < -0.5 * hyp2(i.velX, i.velZ)
        ? reach * PIVOT_REACH
        : reach;
    if (hyp2(dx, dz) > pivotReach) {
      // out of reach while locked: drag (counted) back to the reach limit; a real step follows
      const d = hyp2(dx, dz);
      const k = pivotReach / d;
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
    void i;
  }

  /** Update a swinging foot's landing target (ideal spot around a root position), feet never crossing. */
  private aim(f: FootState, i: PlannerInput, side: -1 | 1, rx: number, rz: number, yaw: number): void {
    this.ideal(i, side, rx, rz, yaw);
    let tx = this.ix;
    let tz = this.iz;
    // no crossing: keep a gap from the other foot along the body's lateral axis
    const other = side < 0 ? this.R : this.L;
    const latT = this.lateral(i, tx, tz);
    const latO = this.lateral(i, other.contact ? other.x : other.toX, other.contact ? other.z : other.toZ);
    const gapNeed = PLANNER.minGap;
    const bad = side < 0 ? latT - (latO - gapNeed) : latO + gapNeed - latT;
    if (bad > 0) {
      const c = Math.cos(i.yaw);
      const s = Math.sin(i.yaw);
      const shift = side < 0 ? -bad : bad;
      tx += shift * c;
      tz += -shift * s;
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
    f.toY = this.groundAt(i, f.x, f.z);
    f.stepLift = 0;
    f.stepT = 0;
    f.stepDur = Math.max(1e-3, i.quickStop);
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
      const c = Math.cos(i.yaw);
      const sn = Math.sin(i.yaw);
      const along = (f.x - o.x) * sn + (f.z - o.z) * c;
      if (along < PLANNER.swingNear && along > -PLANNER.swingNear) {
        const latF = this.lateral(i, f.x, f.z);
        const latO = this.lateral(i, o.x, o.z);
        const bad = f === this.L ? latF - (latO - PLANNER.swingGap) : latO + PLANNER.swingGap - latF;
        if (bad > 0) {
          const shift = (f === this.L ? -bad : bad) * Math.sin(Math.PI * s);
          f.x += shift * c;
          f.z -= shift * sn;
        }
      }
    }
    f.yaw = f.fromYaw + wrap(f.toYaw - f.fromYaw) * h;
    // toe-off then heel strike: toe down early, toe up just before landing
    // (locomotion step 21, A80) the toe-off pitch eases in over the first tenth of the swing: it started at 0.45 rad
    // (26 deg) on the lift frame, an ankle snap of 25-36 deg a frame once the pelvis stopped dropping for the swing
    // (step 22) a quick stop's set-down or closing step eases the toe flat from where it was (restarting the toe-off
    // there tipped the ankle 22 deg in a frame at 120 Hz, flat-stand4)
    if (this.quick) f.pitch = f.fromPitch * (1 - smooth(s));
    else f.pitch = s < 0.3 ? 0.45 * (1 - s / 0.3) * smooth(s / 0.1) : s > 0.72 ? -0.22 * smooth((s - 0.72) / 0.2) * (1 - (this.rollOn ? 1 - HEEL_ROLL.pitch / 0.22 : 1) * smooth((s - 0.92) / 0.08)) : 0;
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
