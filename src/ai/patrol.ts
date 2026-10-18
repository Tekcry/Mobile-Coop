/**
 * Patrol routes, posts and search sweeps (pure), unit-tested.
 *
 * A route is a list of floor points walked in order (looping, or back and forth), pausing at each to look
 * round. A post is a single point with a facing: the guard stands there and glances either side now and
 * then. Searches sweep out from the last known position on a widening ring, each searcher on its own
 * bearing so a squad spreads out.
 */
import { hyp2 } from '../core/mathx';

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

  /** Advance the master clock (every tick, whatever the guard is doing). */
  tick(dt: number): void {
    this.clock += dt;
  }

  /** Loop time now (s, 0 .. period) of a timed loop. */
  private loopNow(): number {
    const l = this.route!.loop!;
    return (((l.t0 + this.clock) % l.period) + l.period) % l.period;
  }

  private get pingPong(): boolean {
    const r = this.route;
    return !!r && (r.pingPong ?? r.points.length < 3);
  }

  /** Next point to walk to, or null while waiting / standing post. */
  step(dt: number, x: number, z: number): Pt | null {
    const r = this.route;
    if (!r || r.points.length === 0) return this.post(dt, x, z);
    if (this.waitT > 0) {
      this.waitT -= dt;
      if (this.waitT > 0) return null;
      this.advance();
    }
    const p = r.points[this.idx]!;
    if (hyp2(p[0] - x, p[1] - z) < PATROL.arrive) {
      this.waitT = r.waits?.[this.idx] ?? r.wait ?? PATROL.wait;
      const lp = r.loop;
      if (lp) {
        // pause until the planned departure (modulo the period, within half a period either way)
        let rem = (lp.leave[this.idx] ?? 0) - this.loopNow();
        if (rem > lp.period / 2) rem -= lp.period;
        else if (rem < -lp.period / 2) rem += lp.period;
        this.waitT = Math.max(1e-3, rem);
      }
      // look along the next leg while paused (or where the route says)
      const n = r.points[this.peekNext()]!;
      this.lookYaw = r.faces?.[this.idx] ?? Math.atan2(n[0] - p[0], n[1] - p[1]);
      return null;
    }
    this.lookYaw = NaN;
    return p;
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
    if (this.glanceT <= -PATROL.glanceHold) this.glanceT = PATROL.glanceEvery;
    const side = Math.floor(this.glanceT * 7.3) % 2 === 0 ? 1 : -1;
    this.lookYaw = this.postYaw + (this.glanceT < 0 ? side * PATROL.glanceYaw : 0);
    return null;
  }

  /** Back on the route at the nearest point (after an investigation). */
  rejoin(x: number, z: number): void {
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
