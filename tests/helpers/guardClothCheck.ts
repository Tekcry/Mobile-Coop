/**
 * (gm-look) Body-through-garment and garment-through-garment measures on one skinned guard mesh in its bind pose (the
 * bundled GLB's POSITION / NORMAL / indices). Pure functions, no Babylon, no fs: tests/guardAssets.test.ts feeds them
 * the bundled files.
 *
 * - `skinThrough`: body triangles that sit outside the outfit where the outfit is right behind them: the ray from the
 *   triangle's centroid inward (against its normal) meets an outfit triangle within `inReach`, and the ray outward meets
 *   none within `outReach`. That is skin showing through the cloth (the G10a sheet's runner elbows).
 * - `clothCrossings`: pairs of outfit triangles that cut through each other (an edge of one crosses the other's
 *   interior), triangles sharing a corner position not counted. A clean layered outfit has few (a cuff over a glove);
 *   a garment decimated into folded shards, or a jacket hem through the trousers, has hundreds (the G10a hem shards).
 */

export interface MeshView {
  /** Flat xyz per vertex. */
  pos: ArrayLike<number>;
  /** Flat xyz per vertex (only the sign of the face normal is taken from it). */
  nrm: ArrayLike<number>;
  /** Flat triangle corner indices. */
  idx: ArrayLike<number>;
}

type V3 = [number, number, number];

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function corner(m: MeshView, t: number, c: number): V3 {
  const v = m.idx[t + c]!;
  return [m.pos[3 * v]!, m.pos[3 * v + 1]!, m.pos[3 * v + 2]!];
}

/** Möller-Trumbore: distance along `d` (unit) from `o` to the triangle, or -1. Both faces count. */
function rayTri(o: V3, d: V3, a: V3, b: V3, c: V3): number {
  const e1 = sub(b, a);
  const e2 = sub(c, a);
  const p = cross(d, e2);
  const det = dot(e1, p);
  if (Math.abs(det) < 1e-14) return -1;
  const inv = 1 / det;
  const s = sub(o, a);
  const u = dot(s, p) * inv;
  if (u < 0 || u > 1) return -1;
  const q = cross(s, e1);
  const v = dot(d, q) * inv;
  if (v < 0 || u + v > 1) return -1;
  const t = dot(e2, q) * inv;
  return t > 0 ? t : -1;
}

interface Tri {
  t: number;
  a: V3;
  b: V3;
  c: V3;
  lo: V3;
  hi: V3;
}

function tris(m: MeshView, list: readonly number[]): Tri[] {
  return list.map((t) => {
    const a = corner(m, t, 0);
    const b = corner(m, t, 1);
    const c = corner(m, t, 2);
    return {
      t, a, b, c,
      lo: [Math.min(a[0], b[0], c[0]), Math.min(a[1], b[1], c[1]), Math.min(a[2], b[2], c[2])],
      hi: [Math.max(a[0], b[0], c[0]), Math.max(a[1], b[1], c[1]), Math.max(a[2], b[2], c[2])],
    };
  });
}

/** A uniform grid over triangle boxes (cell `size`), for the candidate lists below. */
class Grid {
  private cells = new Map<string, number[]>();
  private readonly items: readonly Tri[];
  private readonly size: number;
  constructor(items: readonly Tri[], size: number) {
    this.items = items;
    this.size = size;
    items.forEach((it, i) => {
      for (const k of this.keys(it.lo, it.hi)) {
        let l = this.cells.get(k);
        if (!l) this.cells.set(k, (l = []));
        l.push(i);
      }
    });
  }

  keys(lo: V3, hi: V3, pad = 0): string[] {
    const f = (x: number): number => Math.floor(x / this.size);
    const out: string[] = [];
    for (let i = f(lo[0] - pad); i <= f(hi[0] + pad); i++) {
      for (let j = f(lo[1] - pad); j <= f(hi[1] + pad); j++) {
        for (let k = f(lo[2] - pad); k <= f(hi[2] + pad); k++) out.push(`${i},${j},${k}`);
      }
    }
    return out;
  }

  near(lo: V3, hi: V3): Set<number> {
    const s = new Set<number>();
    for (const k of this.keys(lo, hi)) for (const i of this.cells.get(k) ?? []) s.add(i);
    return s;
  }

  item(i: number): Tri {
    return this.items[i]!;
  }
}

export interface ThroughResult {
  /** Body triangles showing through the outfit. */
  count: number;
  /** Their centroids (x, y, z), for the failure message and the region split. */
  at: V3[];
}

/** Body triangles (first-corner offsets into `idx`, i.e. t = 3 x triangle number) showing through the outfit's. */
export function skinThrough(m: MeshView, body: readonly number[], outfit: readonly number[], inReach = 0.015, outReach = 0.08): ThroughResult {
  const cloth = tris(m, outfit);
  const grid = new Grid(cloth, 0.04);
  const at: V3[] = [];
  for (const bt of tris(m, body)) {
    const o: V3 = [(bt.a[0] + bt.b[0] + bt.c[0]) / 3, (bt.a[1] + bt.b[1] + bt.c[1]) / 3, (bt.a[2] + bt.b[2] + bt.c[2]) / 3];
    let n = cross(sub(bt.b, bt.a), sub(bt.c, bt.a));
    const len = Math.hypot(...n);
    if (len < 1e-12) continue;
    n = [n[0] / len, n[1] / len, n[2] / len];
    // the face normal's sign from the shading normals (whatever the exporter's winding)
    let vn = 0;
    for (let c = 0; c < 3; c++) {
      const v = m.idx[bt.t + c]!;
      vn += n[0] * m.nrm[3 * v]! + n[1] * m.nrm[3 * v + 1]! + n[2] * m.nrm[3 * v + 2]!;
    }
    if (vn < 0) n = [-n[0], -n[1], -n[2]];
    const hit = (d: V3, reach: number): boolean => {
      const end: V3 = [o[0] + d[0] * reach, o[1] + d[1] * reach, o[2] + d[2] * reach];
      const lo: V3 = [Math.min(o[0], end[0]), Math.min(o[1], end[1]), Math.min(o[2], end[2])];
      const hi: V3 = [Math.max(o[0], end[0]), Math.max(o[1], end[1]), Math.max(o[2], end[2])];
      for (const i of grid.near(lo, hi)) {
        const c = grid.item(i);
        const t = rayTri(o, d, c.a, c.b, c.c);
        if (t > 0 && t <= reach) return true;
      }
      return false;
    };
    if (hit([-n[0], -n[1], -n[2]], inReach) && !hit(n, outReach)) at.push(o);
  }
  return { count: at.length, at };
}

/** Does segment p-q cross triangle (a, b, c) strictly inside both? */
function segCrosses(p: V3, q: V3, a: V3, b: V3, c: V3): boolean {
  const d = sub(q, p);
  const len = Math.hypot(...d);
  if (len < 1e-9) return false;
  const u: V3 = [d[0] / len, d[1] / len, d[2] / len];
  const t = rayTri(p, u, a, b, c);
  return t > len * 1e-4 && t < len * (1 - 1e-4);
}

export interface CrossResult {
  /** Outfit triangles crossed by at least one other outfit triangle. */
  count: number;
  at: V3[];
}

/** Outfit triangles that cut through another outfit triangle (corner-sharing pairs, by position, skipped). */
export function clothCrossings(m: MeshView, outfit: readonly number[]): CrossResult {
  const cloth = tris(m, outfit);
  const key = (p: V3): string => `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)},${Math.round(p[2] * 1e5)}`;
  const keys = cloth.map((c) => [key(c.a), key(c.b), key(c.c)]);
  const grid = new Grid(cloth, 0.03);
  const crossed = new Set<number>();
  cloth.forEach((A, i) => {
    for (const j of grid.near(A.lo, A.hi)) {
      if (j <= i) continue;
      const B = grid.item(j);
      if (B.lo[0] > A.hi[0] || B.hi[0] < A.lo[0] || B.lo[1] > A.hi[1] || B.hi[1] < A.lo[1] || B.lo[2] > A.hi[2] || B.hi[2] < A.lo[2]) continue;
      if (keys[i]!.some((k) => keys[j]!.includes(k))) continue;
      const ea: [V3, V3][] = [[A.a, A.b], [A.b, A.c], [A.c, A.a]];
      const eb: [V3, V3][] = [[B.a, B.b], [B.b, B.c], [B.c, B.a]];
      if (ea.some(([p, q]) => segCrosses(p, q, B.a, B.b, B.c)) || eb.some(([p, q]) => segCrosses(p, q, A.a, A.b, A.c))) {
        crossed.add(i);
        crossed.add(j);
      }
    }
  });
  const at = [...crossed].map((i) => {
    const c = cloth[i]!;
    return [(c.a[0] + c.b[0] + c.c[0]) / 3, (c.a[1] + c.b[1] + c.c[1]) / 3, (c.a[2] + c.b[2] + c.c[2]) / 3] as V3;
  });
  return { count: crossed.size, at };
}
