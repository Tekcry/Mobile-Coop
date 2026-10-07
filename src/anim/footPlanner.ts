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
  /** Swing progress when the gait clock's swing window began (an early toe-off already in the air), else -1. */
  swBase: number;
  init: boolean;
}

function newFoot(): FootState {
  return { x: 0, y: 0, z: 0, yaw: 0, contact: true, swing: -1, pitch: 0, landed: false, slide: 0, fromX: 0, fromY: 0, fromZ: 0, fromYaw: 0, toX: 0, toY: 0, toZ: 0, toYaw: 0, stepT: 0, stepDur: 0.3, stepLift: 0.05, probeT: 0, swBase: -1, init: false };
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
  /** Ground height under a point, or null (keeps the root height). */
  ground: ((x: number, z: number, yFrom: number) => number | null) | null;
}

export function emptyPlannerInput(): PlannerInput {
  return { dt: 0, rootX: 0, rootY: 0, rootZ: 0, yaw: 0, goalYaw: 0, velX: 0, velZ: 0, moving: false, phase: 0, duty: 0.62, cycleTime: 1.1, liftH: 0.06, lX: -0.11, lZ: 0.03, rX: 0.11, rZ: -0.02, rest: false, restX: 0, restZ: 0, reach: 0.55, ground: null };
}

/** Idle stepping thresholds. */
export const PLANNER = { idleErr: 0.075, idleStagger: 0.16, idleYawErr: 0.38, idleStepTime: 0.34, idleLift: 0.05, minGap: 0.13, maxStep: 2.6 };

const TAU = Math.PI * 2;
const wrap = (a: number): number => {
  a %= TAU;
  return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a;
};
const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export class FootPlanner {
  readonly L = newFoot();
  readonly R = newFoot();

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
    if (i.moving) this.updateMoving(i);
    else this.updateIdle(i);
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
        } else if (f.swBase < 0) f.swBase = f.swing;
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
        if (i.rest) {
          // distance matching: do not land beyond where the body will stop
          const ahead = (rx - i.restX) * i.velX + (rz - i.restZ) * i.velZ;
          if (ahead > 0) {
            rx = i.restX;
            rz = i.restZ;
          }
        }
        this.aim(f, i, side, rx, rz, i.yaw);
        // an early toe-off already in the air goes on from its progress to land on the clock (restarting from
        // the clock's 0 snaps the foot back to where it left the ground and the pelvis drops to reach it)
        const sp = f.swBase + (1 - f.swBase) * s;
        this.swingTo(f, i, sp);
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
      // finish the step; a gait swing left over from moving (slow near a stop) finishes at idle pace
      if (f.stepDur > PLANNER.idleStepTime * 1.2) {
        f.stepDur = PLANNER.idleStepTime;
        f.stepT = Math.max(0, f.swing) * f.stepDur;
      }
      f.stepT += dt;
      const s = Math.min(1, f.stepT / f.stepDur);
      this.aim(f, i, side, i.rootX, i.rootZ, i.goalYaw);
      this.swingTo(f, i, s);
      if (s >= 1) this.land(f);
    }
    if (!this.L.contact || !this.R.contact) return;
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
      const fwd = ex * Math.sin(i.goalYaw) + ez * Math.cos(i.goalYaw);
      const lat = ex * Math.cos(i.goalYaw) - ez * Math.sin(i.goalYaw);
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
    if (hyp2(dx, dz) > i.reach * 0.92 && i.moving && hyp2(i.velX, i.velZ) > 2) {
      // accelerating hard (a sprint start): the trailing foot toes off early instead of sliding; the
      // clock's contact window then lands it ahead
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
    f.toX = tx;
    f.toZ = tz;
    f.toYaw = yaw;
    // ground under the landing spot (refreshed a few times per swing)
    f.probeT -= i.dt;
    if (f.probeT <= 0) {
      f.probeT = 0.08;
      const g = i.ground ? i.ground(tx, tz, i.rootY + 0.6) : null;
      f.toY = g === null ? i.rootY : Math.max(i.rootY - 0.4, Math.min(i.rootY + 0.45, g));
    }
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
    f.yaw = f.fromYaw + wrap(f.toYaw - f.fromYaw) * h;
    // toe-off then heel strike: toe down early, toe up just before landing
    f.pitch = s < 0.3 ? 0.45 * (1 - s / 0.3) : s > 0.72 ? -0.22 * smooth((s - 0.72) / 0.2) * (1 - smooth((s - 0.92) / 0.08)) : 0;
    void i;
  }

  private land(f: FootState): void {
    f.x = f.toX;
    f.y = f.toY;
    f.z = f.toZ;
    f.yaw = f.toYaw;
    f.contact = true;
    f.swing = -1;
    f.pitch = 0;
    f.landed = true;
  }
}
