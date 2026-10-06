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

  constructor(
    readonly route: PatrolRoute | null,
    readonly postX: number,
    readonly postZ: number,
    readonly postYaw: number,
    seed = 0,
  ) {
    this.glanceT = PATROL.glanceEvery * (0.3 + ((seed * 0.618) % 1) * 0.7);
    this.postPt = [postX, postZ];
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
      this.waitT = r.wait ?? PATROL.wait;
      // look along the next leg while paused
      const n = r.points[this.peekNext()]!;
      this.lookYaw = Math.atan2(n[0] - p[0], n[1] - p[1]);
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
