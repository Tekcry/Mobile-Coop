import { hyp2 } from '../core/mathx';

/**
 * Sector Ops layout check (feature/sector-ops M8): every patrol has a takedown spot no other guard can see. Pure and
 * Babylon-free: it reads the level's solid pieces (`LevelBuilder.boxes` / `cylinders`, the same blockout gameplay
 * reads) and traces eye-height sight lines through them, doors open (doors are anchors, not pieces), windows open,
 * fences see-through. Used by the Vitest data check and the design notes, never at run time.
 */
export interface SolidBox {
  c: readonly number[];
  s: readonly number[];
  yaw: number;
  pitch: number;
  collide: boolean;
}

export interface SolidCyl {
  c: readonly number[];
  r: number;
  h: number;
  collide: boolean;
}

/** Standing eye height (m): `perception.EYE_STAND`. */
export const CHECK_EYE = 1.55;
/** A takedown spot must be out of every other guard's sight within this range (m, M8). */
export const CHECK_RANGE = 15;
/** Route points are sampled this often (m). */
export const CHECK_STEP = 1;

interface Obb {
  cx: number;
  cy: number;
  cz: number;
  hx: number;
  hy: number;
  hz: number;
  cos: number;
  sin: number;
  /** Plan bounding radius (a quick reject). */
  rr: number;
}

/** The solid pieces for sight lines (level, unpitched boxes; ramps and visual pieces skipped). */
export class SightWorld {
  private readonly boxes: Obb[] = [];
  private readonly cyls: SolidCyl[] = [];

  constructor(boxes: readonly SolidBox[], cyls: readonly SolidCyl[]) {
    for (const b of boxes) {
      if (!b.collide || Math.abs(b.pitch) > 1e-3) continue;
      this.boxes.push({ cx: b.c[0]!, cy: b.c[1]!, cz: b.c[2]!, hx: b.s[0]! / 2, hy: b.s[1]! / 2, hz: b.s[2]! / 2, cos: Math.cos(b.yaw), sin: Math.sin(b.yaw), rr: hyp2(b.s[0]!, b.s[2]!) / 2 });
    }
    for (const c of cyls) if (c.collide) this.cyls.push(c);
  }

  /** Nothing solid between a and b. */
  clear(ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
    const x0 = Math.min(ax, bx);
    const x1 = Math.max(ax, bx);
    const z0 = Math.min(az, bz);
    const z1 = Math.max(az, bz);
    const y0 = Math.min(ay, by);
    const y1 = Math.max(ay, by);
    for (let i = 0; i < this.boxes.length; i++) {
      const o = this.boxes[i]!;
      if (o.cx + o.rr < x0 || o.cx - o.rr > x1 || o.cz + o.rr < z0 || o.cz - o.rr > z1 || o.cy + o.hy < y0 || o.cy - o.hy > y1) continue;
      if (segHitsObb(o, ax, ay, az, bx, by, bz)) return false;
    }
    for (let i = 0; i < this.cyls.length; i++) if (segHitsCyl(this.cyls[i]!, ax, ay, az, bx, by, bz)) return false;
    return true;
  }

  /** A body (radius r, feet at y, 1.7 m tall) at (x, z) overlaps a solid piece. */
  blocked(x: number, y: number, z: number, r = 0.3): boolean {
    for (const o of this.boxes) {
      if (y + 1.7 < o.cy - o.hy || y + 0.3 > o.cy + o.hy) continue;
      const dx = x - o.cx;
      const dz = z - o.cz;
      const lx = dx * o.cos - dz * o.sin;
      const lz = dx * o.sin + dz * o.cos;
      if (Math.abs(lx) < o.hx + r && Math.abs(lz) < o.hz + r) return true;
    }
    for (const c of this.cyls) {
      if (y + 1.7 < c.c[1]! - c.h / 2 || y + 0.3 > c.c[1]! + c.h / 2) continue;
      if (hyp2(x - c.c[0]!, z - c.c[2]!) < c.r + r) return true;
    }
    return false;
  }
}

/** Segment a-b against a yawed box (slab test in the box's frame; local z runs along (sin yaw, cos yaw)). */
function segHitsObb(o: Obb, ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
  const dax = ax - o.cx;
  const daz = az - o.cz;
  const dbx = bx - o.cx;
  const dbz = bz - o.cz;
  const p0 = [dax * o.cos - daz * o.sin, ay - o.cy, dax * o.sin + daz * o.cos];
  const p1 = [dbx * o.cos - dbz * o.sin, by - o.cy, dbx * o.sin + dbz * o.cos];
  const h = [o.hx, o.hy, o.hz];
  let t0 = 0;
  let t1 = 1;
  for (let k = 0; k < 3; k++) {
    const s = p0[k]!;
    const d = p1[k]! - s;
    const e = h[k]!;
    if (Math.abs(d) < 1e-9) {
      if (s < -e || s > e) return false;
      continue;
    }
    let ta = (-e - s) / d;
    let tb = (e - s) / d;
    if (ta > tb) {
      const t = ta;
      ta = tb;
      tb = t;
    }
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return false;
  }
  return true;
}

/** Segment a-b against an upright cylinder (closest approach in plan, the height at that point). */
function segHitsCyl(c: SolidCyl, ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 1e-9 ? ((c.c[0]! - ax) * dx + (c.c[2]! - az) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const px = ax + dx * t;
  const pz = az + dz * t;
  if (hyp2(px - c.c[0]!, pz - c.c[2]!) > c.r) return false;
  const y = ay + (by - ay) * t;
  return Math.abs(y - c.c[1]!) <= c.h / 2;
}

/** A guard for the check: its post and patrol route on its floor (y). */
export interface CheckGuard {
  x: number;
  z: number;
  y?: number;
  route?: readonly (readonly [number, number])[];
  /** Timed patrol (the isolation-in-time check only): pause per point, overriding `wait` (s); walk speed (m/s); ping-pong a 3+ point route. */
  wait?: number;
  waits?: readonly number[];
  speed?: number;
  pingPong?: boolean;
}

/** Points a guard stands on or walks through (the post, then the route every `CHECK_STEP` m, looping back). */
export function guardPoints(g: CheckGuard): [number, number, number][] {
  const y = g.y ?? 0;
  const out: [number, number, number][] = [[g.x, y, g.z]];
  const r = g.route;
  if (!r || r.length === 0) return out;
  const pts: (readonly [number, number])[] = [[g.x, g.z], ...r, r[0]!];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, z0] = pts[i]!;
    const [x1, z1] = pts[i + 1]!;
    const n = Math.max(1, Math.ceil(hyp2(x1 - x0, z1 - z0) / CHECK_STEP));
    for (let k = 1; k <= n; k++) out.push([x0 + ((x1 - x0) * k) / n, y, z0 + ((z1 - z0) * k) / n]);
  }
  return out;
}

/** Plan distance (m) from (x, z) to the guard's post or route. */
export function distToGuard(g: CheckGuard, x: number, z: number): number {
  let best = hyp2(x - g.x, z - g.z);
  const r = g.route;
  if (!r || r.length === 0) return best;
  const pts: (readonly [number, number])[] = [[g.x, g.z], ...r, r[0]!];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, z0] = pts[i]!;
    const [x1, z1] = pts[i + 1]!;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const l2 = dx * dx + dz * dz;
    const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / l2)) : 0;
    best = Math.min(best, hyp2(x - (x0 + dx * t), z - (z0 + dz * t)));
  }
  return best;
}

/**
 * Who sees the takedown spot (x, z on floor y): the index of the first other guard with a post or route point within
 * `range` and a clear eye-height line to the spot, or -1 when none does.
 */
export function spotSeenBy(w: SightWorld, x: number, y: number, z: number, guards: readonly CheckGuard[], self: number, range = CHECK_RANGE): number {
  for (let i = 0; i < guards.length; i++) {
    if (i === self) continue;
    for (const [px, py, pz] of guardPoints(guards[i]!)) {
      if (hyp2(px - x, pz - z) > range || Math.abs(py - y) > 6) continue;
      if (w.clear(x, y + CHECK_EYE, z, px, py + CHECK_EYE, pz)) return i;
    }
  }
  return -1;
}

// ---- M8 isolation in time (warehouse-redesign A2 / C1) ------------------------------------------------------------

/** The time model samples the guards' timed patrols over this long (s) ... */
export const CHECK_HORIZON = 180;
/** ... every this often (s) ... */
export const CHECK_TIME_STEP = 0.25;
/** ... and a guard passes with this much isolation in a row (s). */
export const CHECK_ISOLATION = 3;
/** A takedown spot counts within this plan distance (m) of the guard (the data check's reach). */
export const CHECK_SPOT = 1.6;
/** Patrol pace over the archetype walk speed (mirrors `PATROL_PACE` in `ai/enemy.ts`; a plain route walks at 1.1 x). */
export const CHECK_PATROL_PACE = 1.1;

/** The patrol schedule of one guard: where it is at time t, built once (build-time only, never per frame). */
interface Schedule {
  /** Stops in visit order (flat x, z), the pause (s) at each and the time (s) each pause ends. */
  xs: number[];
  zs: number[];
  tPauseEnd: number[];
  tArrive: number[];
  cycle: number;
}

function buildSchedule(g: CheckGuard): Schedule | null {
  const r = g.route;
  if (!r || r.length === 0) return null;
  const speed = g.speed ?? 0.9 * CHECK_PATROL_PACE;
  const n = r.length;
  const order: number[] = [];
  if (n < 3 || g.pingPong) {
    for (let i = 0; i < n; i++) order.push(i);
    for (let i = n - 2; i >= 1; i--) order.push(i);
  } else for (let i = 0; i < n; i++) order.push(i);
  const s: Schedule = { xs: [], zs: [], tPauseEnd: [], tArrive: [], cycle: 0 };
  let t = 0;
  for (let k = 0; k < order.length; k++) {
    const idx = order[k]!;
    const p = r[idx]!;
    if (k > 0) {
      const q = r[order[k - 1]!]!;
      t += hyp2(p[0] - q[0], p[1] - q[1]) / speed;
    }
    s.xs.push(p[0]);
    s.zs.push(p[1]);
    s.tArrive.push(t);
    t += g.waits?.[idx] ?? g.wait ?? 2.5;
    s.tPauseEnd.push(t);
  }
  // the walk back from the last stop to the first closes the cycle
  const a = r[order[order.length - 1]!]!;
  const b0 = r[order[0]!]!;
  t += hyp2(b0[0] - a[0], b0[1] - a[1]) / speed;
  s.cycle = t;
  return s;
}

/** The guard's plan position at time t (s) written to out[0], out[1]. */
function scheduleAt(g: CheckGuard, s: Schedule | null, t: number, out: number[]): void {
  if (!s || s.cycle < 1e-6) {
    out[0] = g.x;
    out[1] = g.z;
    return;
  }
  const u = t % s.cycle;
  const m = s.xs.length;
  for (let k = 0; k < m; k++) {
    if (u <= s.tPauseEnd[k]!) {
      if (u >= s.tArrive[k]!) {
        out[0] = s.xs[k]!;
        out[1] = s.zs[k]!;
        return;
      }
      // walking from stop k - 1 (or, wrapping, the last stop) to stop k
      const kp = k === 0 ? m - 1 : k - 1;
      const t0 = k === 0 ? s.tPauseEnd[m - 1]! : s.tPauseEnd[kp]!;
      const f = (u - t0) / Math.max(1e-6, s.tArrive[k]! - t0);
      out[0] = s.xs[kp]! + (s.xs[k]! - s.xs[kp]!) * f;
      out[1] = s.zs[kp]! + (s.zs[k]! - s.zs[kp]!) * f;
      return;
    }
  }
  // the closing walk: last stop -> first stop
  const t0 = s.tPauseEnd[m - 1]!;
  const f = (u - t0) / Math.max(1e-6, s.cycle - t0);
  out[0] = s.xs[m - 1]! + (s.xs[0]! - s.xs[m - 1]!) * f;
  out[1] = s.zs[m - 1]! + (s.zs[0]! - s.zs[m - 1]!) * f;
}

/**
 * The longest run (s) over `horizon` s in which guard `self` is isolated: every other guard is more than `range` away
 * in plan (or on another floor) or has no clear eye-height line to it. Guards walk their routes at their walk speed
 * (`speed`, else a grunt's) pausing `waits[i]` / `wait` at each point; two points ping-pong, three or more loop; a guard
 * with no route stands at its slot. With a `spot` [x, z] only moments with the guard within `CHECK_SPOT` m of it count (the
 * takedown spot). A build-time check: it allocates freely.
 */
export function longestIsolation(w: SightWorld, guards: readonly CheckGuard[], self: number, range = CHECK_RANGE, spot: readonly [number, number] | null = null, horizon = CHECK_HORIZON, step = CHECK_TIME_STEP): number {
  const sch = guards.map(buildSchedule);
  const pos: number[][] = guards.map(() => [0, 0]);
  const me = guards[self]!;
  const my = me.y ?? 0;
  let run = 0;
  let best = 0;
  for (let t = 0; t <= horizon + 1e-9; t += step) {
    for (let i = 0; i < guards.length; i++) scheduleAt(guards[i]!, sch[i]!, t, pos[i]!);
    const [x, z] = pos[self]!;
    let isolated = spot === null || hyp2(x! - spot[0], z! - spot[1]) <= CHECK_SPOT;
    for (let j = 0; j < guards.length && isolated; j++) {
      if (j === self) continue;
      const [px, pz] = pos[j]!;
      const py = guards[j]!.y ?? 0;
      if (hyp2(px! - x!, pz! - z!) > range || Math.abs(py - my) > 6) continue;
      if (w.clear(x!, my + CHECK_EYE, z!, px!, py + CHECK_EYE, pz!)) isolated = false;
    }
    if (isolated) {
      run += step;
      if (run > best) best = run;
    } else run = 0;
  }
  return best;
}

/** M8 in time: the guard has `CHECK_ISOLATION` s or more of isolation in a row on its timed patrol. */
export function isolatedInTime(w: SightWorld, guards: readonly CheckGuard[], self: number, spot: readonly [number, number] | null = null, range = CHECK_RANGE): boolean {
  return longestIsolation(w, guards, self, range, spot) >= CHECK_ISOLATION - 1e-9;
}
