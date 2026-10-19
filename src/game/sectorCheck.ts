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
