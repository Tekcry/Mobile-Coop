/**
 * Patrol routes, posts and search sweeps (pure), unit-tested.
 *
 * A route is a list of floor points walked in order (looping, or back and forth), pausing at each to look
 * round. A post is a single point with a facing: the guard stands there and glances either side now and
 * then. Searches sweep out from the last known position on a widening ring, each searcher on its own
 * bearing so a squad spreads out.
 */
import { hyp2 } from '../core/mathx';
import { SCENE_SWEEP, facePanYaw, panYaw, rejoinStop, wrapAng, wrapTime, type SweepPlan } from './sceneSweep';

export type Pt = [number, number];

export interface PatrolRoute {
  points: Pt[];
  /** Seconds paused at each point (default 2.5). */
  wait?: number;
  /** Walk back and forth instead of looping (default: loop when the route has 3+ points). */
  pingPong?: boolean;
  /** Pause per point (s), overriding `wait` (a timed loop such as the Trunk Annex master clock). */
  waits?: number[];
  /** Facing per point (rad, 0 = +Z) while paused there, instead of looking along the next leg. */
  faces?: number[];
  /** Where in the loop the walker begins: pausing at point `idx` for `wait` more seconds, or (wait 0) walking to it. */
  start?: { idx: number; wait: number };
  /**
   * A timed loop on a master clock: a guard pauses at point i until loop time `leave[i]` (so early or late arrival never
   * drifts the loop), walks at its plain walking speed, and rejoins at the point the schedule says. `t0` = loop time when
   * the walker was made (the walker keeps the clock itself: `tick`).
   */
  loop?: { period: number; leave: number[]; t0: number };
}

export const PATROL = {
  /** Arrival radius (m). */
  arrive: 0.45,
  /** Pause at each route point (s): guards hold their spots (2.0.1 / 2.3: they moved too often). */
  wait: 9,
  /** Post glances: every `glanceEvery` s turn up to `glanceYaw` rad either side for `glanceHold` s (calm, rare). */
  glanceEvery: 14,
  glanceYaw: 0.6,
  glanceHold: 2.4,
  /** Search ring: first radius, growth per point, cap (m). */
  searchR0: 2,
  searchStep: 2.5,
  searchMax: 11,
  /** Look-round at each search point (s). */
  searchLook: 3,
} as const;

/** Walks a route: `step` returns the point to head for, or null while paused (then `lookYaw` says where). */
export class PatrolWalker {
  idx = 0;
  private dir = 1;
  private waitT = 0;
  private glanceT = 0;
  /** Facing while paused (rad), NaN = keep the current one. */
  lookYaw = NaN;
  private postPt: Pt;
  /** Seconds since the walker was made (the master clock of a timed loop). */
  private clock = 0;
  /** (guard-ai S4) Pauses x this (`CAUTION.waitMul` while cautious: shorter waits, more frequent glances). Timed
   *  loops ignore it (their schedule is the map's). */
  waitMul = 1;
  /** (guard-ai piano GA6) The scene sweep he walks instead of his route rules (`setSweep`), null = none. */
  private sw: SweepPlan | null = null;
  /** Pan side: +1 pans left first, -1 right first (a pair pans opposite). */
  private swSide = 1;
  /** Sweep loop time (unwrapped) at `clock` = `swClock0`. */
  private swT0 = 0;
  private swClock0 = 0;
  /** Sweep time (unwrapped) the current hold ends, NaN = walking. */
  private swHoldEnd = Number.NaN;
  /** Seconds into the current pan cycle, NaN = not started (turning onto it: N2); below 0: looking at its start yaw
   *  until whole cycles end at `leave` (GA6b). */
  private swPanE = Number.NaN;
  /** A rejoin's target stop (-1: none) and the sweep time (unwrapped) he is back in step there. */
  private swRejoinIdx = -1;
  private swRejoinUntil = 0;
  /** `idx` when the sweep was set (restored by `clearSweep`). */
  private swIdx0 = 0;
  /** (GA6b) The current hold is a rejoin's catch-up hold (it pans whole cycles), not a schedule stop. */
  private swHoldRejoin = false;

  constructor(
    readonly route: PatrolRoute | null,
    readonly postX: number,
    readonly postZ: number,
    readonly postYaw: number,
    seed = 0,
  ) {
    this.glanceT = PATROL.glanceEvery * (0.3 + ((seed * 0.618) % 1) * 0.7);
    this.postPt = [postX, postZ];
    const st = route?.start;
    if (route && st && route.points.length > 0) {
      this.idx = Math.min(route.points.length - 1, Math.max(0, st.idx));
      this.waitT = st.wait;
    }
  }

  /** Seconds left in the current pause (tests / debug). */
  get waiting(): number {
    if (this.sw) {
      const e = this.swHoldEnd - this.swNow();
      return e > 0 ? e : 0;
    }
    return this.waitT;
  }

  /**
   * (guard-ai piano GA6) Walk `plan` instead of the route rules: `side` +1 pans left first, -1 right first; `t0` = the
   * sweep's loop time now (the guard's `plan.phase` + the scene's sweep clock). He heads for `plan.startIdx` and holds
   * there until its `leave`; a guard not at it should `rejoin` next.
   */
  setSweep(plan: SweepPlan, side: number, t0: number): void {
    if (!this.sw) this.swIdx0 = this.idx;
    this.sw = plan;
    this.swSide = side < 0 ? -1 : 1;
    this.swT0 = t0;
    this.swClock0 = this.clock;
    this.idx = plan.startIdx;
    this.swHoldEnd = Number.NaN;
    this.swPanE = Number.NaN;
    this.swRejoinIdx = -1;
    this.waitT = 0;
    this.lookYaw = Number.NaN;
  }

  /** (N4) Off the sweep: back to his authored route rules (the caller `rejoin`s as built). */
  clearSweep(): void {
    if (!this.sw) return;
    this.sw = null;
    this.idx = this.swIdx0;
    this.swHoldEnd = Number.NaN;
    this.swPanE = Number.NaN;
    this.swRejoinIdx = -1;
    this.waitT = 0;
    this.lookYaw = Number.NaN;
  }

  /** On a scene sweep (`setSweep`). */
  get sweeping(): boolean {
    return this.sw !== null;
  }

  /** The sweep plan he walks (null: none). */
  get sweepPlan(): SweepPlan | null {
    return this.sw;
  }

  /** Sweep loop time now (s, 0 .. period), NaN off the sweep. */
  sweepTime(): number {
    return this.sw ? wrapTime(this.swNow(), this.sw.period) : Number.NaN;
  }

  /** Sweep time now, unwrapped. */
  private swNow(): number {
    return this.swT0 + (this.clock - this.swClock0);
  }

  /** Advance the master clock (every tick, whatever the guard is doing). */
  tick(dt: number): void {
    this.clock += dt;
  }

  /** Loop time now (s, 0 .. period) of a timed loop. */
  private loopNow(): number {
    const l = this.route!.loop!;
    return (((l.t0 + this.clock) % l.period) + l.period) % l.period;
  }

  /** (guard-ai S10) Loop time now (s) of a timed loop, NaN without one (talking pairs line their clocks up with it). */
  loopTime(): number {
    return this.route?.loop ? this.loopNow() : Number.NaN;
  }

  private get pingPong(): boolean {
    const r = this.route;
    return !!r && (r.pingPong ?? r.points.length < 3);
  }

  /**
   * Next point to walk to, or null while waiting / standing post. `bodyYaw` (the guard's body yaw, optional): on a sweep
   * the pan cycle starts once the body is within `SCENE_SWEEP.panGate` of it (NaN: at once).
   */
  step(dt: number, x: number, z: number, bodyYaw = Number.NaN): Pt | null {
    if (this.sw) return this.sweepStep(dt, x, z, bodyYaw);
    const r = this.route;
    if (!r || r.points.length === 0) return this.post(dt, x, z);
    if (this.waitT > 0) {
      this.waitT -= dt;
      if (this.waitT > 0) return null;
      this.advance();
    }
    const p = r.points[this.idx]!;
    if (hyp2(p[0] - x, p[1] - z) < PATROL.arrive) {
      this.waitT = (r.waits?.[this.idx] ?? r.wait ?? PATROL.wait) * this.waitMul;
      const lp = r.loop;
      if (lp) {
        // pause until the planned departure (modulo the period, within half a period either way)
        let rem = (lp.leave[this.idx] ?? 0) - this.loopNow();
        if (rem > lp.period / 2) rem -= lp.period;
        else if (rem < -lp.period / 2) rem += lp.period;
        this.waitT = Math.max(1e-3, rem);
      } else if (!(this.waitT > 0)) {
        // a wait of 0: pass straight through (no pause, no facing). It used to set waitT 0 and return null, which
        // never reached `advance`: the guard stood there for good (Menu Notes, route waits [4, 0, 3, 0])
        this.waitT = 0;
        this.advance();
        this.lookYaw = NaN;
        return r.points[this.idx]!;
      }
      // look along the next leg while paused (or where the route says)
      const n = r.points[this.peekNext()]!;
      this.lookYaw = r.faces?.[this.idx] ?? Math.atan2(n[0] - p[0], n[1] - p[1]);
      return null;
    }
    this.lookYaw = NaN;
    return p;
  }

  /**
   * (GA6) A step on the sweep: walk to the stop, pass a corner, hold a pan stop until its `leave` (early or late within
   * half a lap of its planned arrival), panning every step; a rejoin's stop until he is back in step.
   */
  private sweepStep(dt: number, x: number, z: number, bodyYaw: number): Pt | null {
    const pl = this.sw!;
    const n = pl.pts.length;
    const now = this.swNow();
    if (this.swHoldEnd === this.swHoldEnd) {
      if (now < this.swHoldEnd) {
        this.swPan(dt, bodyYaw);
        return null;
      }
      this.swHoldEnd = Number.NaN;
      this.swPanE = Number.NaN;
      this.idx = (this.idx + 1) % n;
    }
    // at most one pass round the stops (corners and one-spot legs are passed in the same step)
    for (let k = 0; k <= n; k++) {
      const p = pl.pts[this.idx]!;
      if (hyp2(p[0] - x, p[1] - z) >= PATROL.arrive) {
        this.lookYaw = Number.NaN;
        return p;
      }
      const w = pl.wait[this.idx]!;
      let rem: number;
      if (this.swRejoinIdx === this.idx) {
        rem = this.swRejoinUntil - now;
        this.swRejoinIdx = -1;
        this.swHoldRejoin = true;
      } else if (w > 0) {
        // how late against the planned arrival (leave - wait), within half a lap either way
        let late = wrapTime(now - (pl.leave[this.idx]! - w), pl.period);
        if (late >= pl.period / 2) late -= pl.period;
        rem = w - late;
        this.swHoldRejoin = false;
      } else {
        this.idx = (this.idx + 1) % n;
        continue;
      }
      this.swHoldEnd = now + (rem > 1e-3 ? rem : 1e-3);
      this.swPanE = Number.NaN;
      this.swPan(0, bodyYaw);
      return null;
    }
    this.lookYaw = Number.NaN;
    return pl.pts[this.idx]!;
  }

  /**
   * The look while holding a sweep stop: onto the pan's start yaw, then (once the body is there) the pan. (GA6b) A hold
   * longer than the cycle D looks at the start yaw first: an early arrival at a schedule stop until `leave - D`, then
   * one full cycle (left, centre, right) ending at `leave`; a rejoin's catch-up hold only until whole cycles end at
   * `leave` (he pans while he waits for his schedule). A shorter hold is cut at `leave`.
   */
  private swPan(dt: number, bodyYaw: number): void {
    const pl = this.sw!;
    const i = this.idx;
    const fr = pl.from[i]!;
    const face = fr === fr;
    const c = pl.centre[i]!;
    const s = face ? fr : c;
    const D = pl.wait[i]!;
    if (!(this.swPanE === this.swPanE)) {
      this.lookYaw = s;
      if (bodyYaw === bodyYaw && Math.abs(wrapAng(bodyYaw - s)) > SCENE_SWEEP.panGate) return;
      const rem = this.swHoldEnd - this.swNow();
      this.swPanE = rem > D ? -(this.swHoldRejoin ? wrapTime(rem - D, face ? 2 * D : D) : rem - D) : 0;
    } else this.swPanE += dt;
    if (this.swPanE < 0) {
      this.lookYaw = s;
      return;
    }
    this.lookYaw = face ? facePanYaw(fr, c, D, this.swPanE) : panYaw(c, this.swSide, D, this.swPanE);
  }

  private peekNext(): number {
    const n = this.route!.points.length;
    if (n < 2) return 0;
    if (this.pingPong) {
      const k = this.idx + this.dir;
      return k < 0 || k >= n ? this.idx - this.dir : k;
    }
    return (this.idx + 1) % n;
  }

  private advance(): void {
    const n = this.route!.points.length;
    if (n < 2) return;
    if (this.pingPong) {
      if (this.idx + this.dir < 0 || this.idx + this.dir >= n) this.dir = -this.dir;
      this.idx += this.dir;
    } else this.idx = (this.idx + 1) % n;
  }

  /** Standing post: back to it, then face its direction with an occasional glance either side. */
  private post(dt: number, x: number, z: number): Pt | null {
    if (hyp2(this.postX - x, this.postZ - z) > PATROL.arrive * 1.5) {
      this.lookYaw = NaN;
      return this.postPt;
    }
    this.glanceT -= dt;
    if (this.glanceT <= -PATROL.glanceHold) this.glanceT = PATROL.glanceEvery * this.waitMul;
    const side = Math.floor(this.glanceT * 7.3) % 2 === 0 ? 1 : -1;
    this.lookYaw = this.postYaw + (this.glanceT < 0 ? side * PATROL.glanceYaw : 0);
    return null;
  }

  /** Back on the route at the nearest point (after an investigation). */
  rejoin(x: number, z: number): void {
    if (this.sw) {
      this.sweepRejoin(x, z);
      return;
    }
    const r = this.route;
    this.waitT = 0;
    if (!r || r.points.length === 0) return;
    if (r.loop) {
      // the point the schedule says the guard is at or heading for: the next planned departure
      const lt = this.loopNow();
      let nb = 0;
      let nd = Infinity;
      for (let i = 0; i < r.loop.leave.length; i++) {
        const d = (((r.loop.leave[i]! - lt) % r.loop.period) + r.loop.period) % r.loop.period;
        if (d < nd) {
          nd = d;
          nb = i;
        }
      }
      this.idx = nb;
      return;
    }
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < r.points.length; i++) {
      const p = r.points[i]!;
      const d = hyp2(p[0] - x, p[1] - z);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    this.idx = best;
  }

  /**
   * (GA6, N3) Back on the sweep: to the pan stop he can be back in step at soonest (`rejoinStop`), then hold there,
   * panning, until its next `leave` after he can reach it (at most a lap), then on with the schedule.
   */
  private sweepRejoin(x: number, z: number): void {
    const pl = this.sw!;
    const now = this.swNow();
    const k = rejoinStop(pl, x, z, now);
    this.idx = k;
    this.waitT = 0;
    this.swHoldEnd = Number.NaN;
    this.swPanE = Number.NaN;
    this.lookYaw = Number.NaN;
    this.swRejoinIdx = -1;
    if (pl.wait[k]! > 0) {
      const p = pl.pts[k]!;
      const tr = hyp2(p[0] - x, p[1] - z) / SCENE_SWEEP.pace;
      this.swRejoinUntil = now + tr + wrapTime(pl.leave[k]! - now - tr, pl.period);
      this.swRejoinIdx = k;
    }
  }
}

/**
 * The k-th search point around a last known position for searcher `slot` (0, 1, 2...): a widening ring,
 * each searcher offset by a golden-angle bearing so they fan out. Writes and returns `out`.
 */
export function searchPoint(cx: number, cz: number, k: number, slot: number, out: Pt): Pt {
  const r = Math.min(PATROL.searchMax, PATROL.searchR0 + k * PATROL.searchStep);
  const a = slot * 2.39996 + k * 1.9;
  out[0] = cx + Math.sin(a) * r;
  out[1] = cz + Math.cos(a) * r;
  return out;
}
