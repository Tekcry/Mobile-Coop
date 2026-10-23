/**
 * AI cover points as typed arrays plus a load-time bucket grid (guard-ai S8, design section 8; pure: no Babylon / DOM),
 * unit-tested in squadRoles.test.ts.
 *
 * `CoverSet` holds the level's AI cover points (`World.level.cover`, built once at load) as struct-of-arrays, with two
 * per-point fields the manager writes at run time: `owner` (the slot of the guard who reserved it, -1 free; mirror of
 * `EnemyManager.reserveCover`) and `block` (1 = skip it for now, e.g. its overwatch LOS ray failed). `CoverGrid` buckets
 * the points in 4 m cells (`Int32Array` heads / next linked lists) so a role pick touches ~10-30 points, not all.
 * Built once; `query` allocates nothing.
 */

/** What a cover point must carry (the level's `CoverPoint` from `world/levelBuilder` fits it structurally). */
export interface CoverPointLike {
  pos: { x: number; y: number; z: number };
  /** Direction from the cover towards the protected side (unit, XZ): the side the threat is on. */
  normal: { x: number; z: number };
  low: boolean;
}

export class CoverSet {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly nx: Float32Array;
  readonly nz: Float32Array;
  readonly low: Uint8Array;
  /** Slot of the guard holding a reservation on it, -1 free (the manager mirrors `reserveCover` / `releaseCover`). */
  readonly owner: Int32Array;
  /** 1 = not usable for now (the manager's call, e.g. no clear view from it); role picks skip it. */
  readonly block: Uint8Array;
  constructor(readonly n: number) {
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.z = new Float32Array(n);
    this.nx = new Float32Array(n);
    this.nz = new Float32Array(n);
    this.low = new Uint8Array(n);
    this.owner = new Int32Array(n).fill(-1);
    this.block = new Uint8Array(n);
  }
}

/** Load time: the level's cover points into a `CoverSet` (index i = `points[i]`, so `reserveCover` indices match). */
export function coverSetFrom(points: readonly CoverPointLike[]): CoverSet {
  const s = new CoverSet(points.length);
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    s.x[i] = p.pos.x;
    s.y[i] = p.pos.y;
    s.z[i] = p.pos.z;
    s.nx[i] = p.normal.x;
    s.nz[i] = p.normal.z;
    s.low[i] = p.low ? 1 : 0;
  }
  return s;
}

export const COVER_CELL = 4;

export class CoverGrid {
  readonly minX: number;
  readonly minZ: number;
  readonly cols: number;
  readonly rows: number;
  /** First point index per cell, -1 empty. */
  readonly heads: Int32Array;
  /** Next point index in the same cell, -1 last. Lists run in ascending point index. */
  readonly next: Int32Array;
  private readonly px: Float32Array;
  private readonly pz: Float32Array;

  /** Build once from point positions (`xs[i]`, `zs[i]`, i < n). The arrays are kept (not copied). */
  constructor(xs: Float32Array, zs: Float32Array, n = xs.length, readonly cell = COVER_CELL) {
    this.px = xs;
    this.pz = zs;
    let x0 = Infinity;
    let z0 = Infinity;
    let x1 = -Infinity;
    let z1 = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = xs[i]!;
      const z = zs[i]!;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
    }
    if (n === 0) x0 = z0 = x1 = z1 = 0;
    this.minX = x0;
    this.minZ = z0;
    this.cols = Math.floor((x1 - x0) / cell) + 1;
    this.rows = Math.floor((z1 - z0) / cell) + 1;
    this.heads = new Int32Array(this.cols * this.rows).fill(-1);
    this.next = new Int32Array(Math.max(1, n)).fill(-1);
    // descending insert so every cell's list runs in ascending index (deterministic query order)
    for (let i = n - 1; i >= 0; i--) {
      const c = this.cellOf(xs[i]!, zs[i]!);
      this.next[i] = this.heads[c]!;
      this.heads[c] = i;
    }
  }

  static fromSet(s: CoverSet): CoverGrid {
    return new CoverGrid(s.x, s.z, s.n);
  }

  private cellOf(x: number, z: number): number {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor((x - this.minX) / this.cell)));
    const cz = Math.min(this.rows - 1, Math.max(0, Math.floor((z - this.minZ) / this.cell)));
    return cz * this.cols + cx;
  }

  /**
   * Indices of the points within `r` (XZ, inclusive) of (x, z) into `out`; returns the count. Order: cells row by row,
   * ascending index inside a cell (deterministic). Stops when `out` is full (returns `out.length`).
   */
  query(x: number, z: number, r: number, out: Int32Array): number {
    const cell = this.cell;
    const c0 = Math.max(0, Math.floor((x - r - this.minX) / cell));
    const c1 = Math.min(this.cols - 1, Math.floor((x + r - this.minX) / cell));
    const r0 = Math.max(0, Math.floor((z - r - this.minZ) / cell));
    const r1 = Math.min(this.rows - 1, Math.floor((z + r - this.minZ) / cell));
    const r2 = r * r;
    const cap = out.length;
    let k = 0;
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        for (let i = this.heads[row * this.cols + col]!; i >= 0; i = this.next[i]!) {
          const dx = this.px[i]! - x;
          const dz = this.pz[i]! - z;
          if (dx * dx + dz * dz > r2) continue;
          if (k >= cap) return k;
          out[k++] = i;
        }
      }
    }
    return k;
  }

  /**
   * (guard-ai S25b fix, check B1) The up to `min(out.length, d2.length)` NEAREST points within `r` (XZ, inclusive) of
   * (x, z) into `out`; returns the count. Unlike `query`, a full `out` never drops one side of the disk: a max-heap on
   * the squared distance (`d2`, the caller's scratch) keeps the nearest. The order in `out` is the heap's (not sorted);
   * ties keep the point met first (cells row by row). No allocation.
   */
  queryNearest(x: number, z: number, r: number, out: Int32Array, d2: Float64Array): number {
    const cell = this.cell;
    const c0 = Math.max(0, Math.floor((x - r - this.minX) / cell));
    const c1 = Math.min(this.cols - 1, Math.floor((x + r - this.minX) / cell));
    const r0 = Math.max(0, Math.floor((z - r - this.minZ) / cell));
    const r1 = Math.min(this.rows - 1, Math.floor((z + r - this.minZ) / cell));
    const r2 = r * r;
    const cap = Math.min(out.length, d2.length);
    if (cap <= 0) return 0;
    let k = 0;
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        for (let i = this.heads[row * this.cols + col]!; i >= 0; i = this.next[i]!) {
          const dx = this.px[i]! - x;
          const dz = this.pz[i]! - z;
          const dd = dx * dx + dz * dz;
          if (dd > r2) continue;
          if (k < cap) {
            // room: sift up
            let j = k++;
            while (j > 0) {
              const p = (j - 1) >> 1;
              if (d2[p]! >= dd) break;
              out[j] = out[p]!;
              d2[j] = d2[p]!;
              j = p;
            }
            out[j] = i;
            d2[j] = dd;
          } else if (dd < d2[0]!) {
            // full: nearer than the farthest kept, which goes; sift down
            let j = 0;
            for (;;) {
              let c = 2 * j + 1;
              if (c >= cap) break;
              if (c + 1 < cap && d2[c + 1]! > d2[c]!) c++;
              if (d2[c]! <= dd) break;
              out[j] = out[c]!;
              d2[j] = d2[c]!;
              j = c;
            }
            out[j] = i;
            d2[j] = dd;
          }
        }
      }
    }
    return k;
  }
}
