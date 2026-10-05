/**
 * 2.5D navigation grid. Pure (no Babylon): heights come from an injected sampler
 * (Havok raycasts at runtime, functions in tests); walls/cover are rasterised analytically.
 */
export interface NavBlocker {
  cx: number;
  cz: number;
  /** Half extents of the footprint. Cylinders use hx = hz = radius and round = true. */
  hx: number;
  hz: number;
  yaw: number;
  bottom: number;
  top: number;
  round?: boolean;
}

export interface NavBuildInput {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  cell: number;
  sample(x: number, z: number): { h: number; ok: boolean };
  blockers: readonly NavBlocker[];
  agentRadius: number;
  stepHeight: number;
  /** Seed point used to keep only the main connected region. */
  seed?: [number, number];
}

export type P2 = [number, number];

const SQRT2 = Math.SQRT2;
const DIRS: ReadonlyArray<[number, number, number]> = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2],
];

/** Binary min-heap keyed by Float32 priorities. */
class Heap {
  private items: number[] = [];
  private pri: number[] = [];
  /** Priority of the most recently popped item (lets Dijkstra skip stale duplicates). */
  lastPri: number | undefined;
  get size(): number {
    return this.items.length;
  }
  push(item: number, p: number): void {
    const a = this.items;
    const b = this.pri;
    a.push(item);
    b.push(p);
    let i = a.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (b[par]! <= p) break;
      a[i] = a[par]!;
      b[i] = b[par]!;
      i = par;
    }
    a[i] = item;
    b[i] = p;
  }
  pop(): number {
    const a = this.items;
    const b = this.pri;
    const top = a[0]!;
    this.lastPri = b[0];
    const last = a.pop()!;
    const lp = b.pop()!;
    if (a.length > 0) {
      let i = 0;
      const n = a.length;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && b[c + 1]! < b[c]!) c++;
        if (b[c]! >= lp) break;
        a[i] = a[c]!;
        b[i] = b[c]!;
        i = c;
      }
      a[i] = last;
      b[i] = lp;
    }
    return top;
  }
}

export class NavGrid {
  readonly w: number;
  readonly h: number;
  readonly cell: number;
  readonly ox: number;
  readonly oz: number;
  readonly height: Float32Array;
  readonly walk: Uint8Array;
  readonly step: number;
  private gScore: Float32Array;
  private came: Int32Array;
  private stamp: Uint32Array;
  private gen = 1;

  constructor(input: NavBuildInput) {
    this.cell = input.cell;
    this.ox = input.minX;
    this.oz = input.minZ;
    this.w = Math.ceil((input.maxX - input.minX) / input.cell);
    this.h = Math.ceil((input.maxZ - input.minZ) / input.cell);
    this.step = input.stepHeight;
    const n = this.w * this.h;
    this.height = new Float32Array(n);
    this.walk = new Uint8Array(n);
    this.gScore = new Float32Array(n);
    this.came = new Int32Array(n);
    this.stamp = new Uint32Array(n);
    for (let iz = 0; iz < this.h; iz++) {
      for (let ix = 0; ix < this.w; ix++) {
        const i = iz * this.w + ix;
        const [x, z] = this.center(i);
        const s = input.sample(x, z);
        this.height[i] = s.h;
        this.walk[i] = s.ok ? 1 : 0;
      }
    }
    this.rasterBlockers(input);
    if (input.seed) this.keepRegion(this.nearestWalkable(input.seed[0], input.seed[1]));
  }

  private rasterBlockers(input: NavBuildInput): void {
    const r = input.agentRadius;
    for (const b of input.blockers) {
      const ext = Math.max(b.hx, b.hz) + r;
      const ix0 = Math.max(0, Math.floor((b.cx - ext - this.ox) / this.cell));
      const ix1 = Math.min(this.w - 1, Math.floor((b.cx + ext - this.ox) / this.cell));
      const iz0 = Math.max(0, Math.floor((b.cz - ext - this.oz) / this.cell));
      const iz1 = Math.min(this.h - 1, Math.floor((b.cz + ext - this.oz) / this.cell));
      const c = Math.cos(-b.yaw);
      const s = Math.sin(-b.yaw);
      for (let iz = iz0; iz <= iz1; iz++) {
        for (let ix = ix0; ix <= ix1; ix++) {
          const i = iz * this.w + ix;
          if (!this.walk[i]) continue;
          const [x, z] = this.center(i);
          const dx = x - b.cx;
          const dz = z - b.cz;
          let inside: boolean;
          if (b.round) {
            inside = Math.hypot(dx, dz) <= b.hx + r;
          } else {
            // rotate into box local space (yaw about +Y, Babylon left-handed: local x = cos*dx - sin*dz)
            const lx = c * dx + s * dz;
            const lz = -s * dx + c * dz;
            inside = Math.abs(lx) <= b.hx + r && Math.abs(lz) <= b.hz + r;
          }
          if (!inside) continue;
          const hc = this.height[i]!;
          if (b.top > hc + this.step && b.bottom < hc + 1.6) this.walk[i] = 0;
        }
      }
    }
  }

  /** Flood fill from a seed; anything unreachable becomes unwalkable. */
  private keepRegion(seed: number): void {
    if (seed < 0) return;
    const seen = new Uint8Array(this.walk.length);
    const stack = [seed];
    seen[seed] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      const n = this.fillNeighbours(i);
      for (let k = 0; k < n; k++) {
        const j = this.nb[k]!;
        if (!seen[j]) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    for (let i = 0; i < this.walk.length; i++) if (!seen[i]) this.walk[i] = 0;
  }

  index(ix: number, iz: number): number {
    if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.h) return -1;
    return iz * this.w + ix;
  }

  cellOf(x: number, z: number): number {
    return this.index(Math.floor((x - this.ox) / this.cell), Math.floor((z - this.oz) / this.cell));
  }

  center(i: number): P2 {
    const ix = i % this.w;
    const iz = (i / this.w) | 0;
    return [this.ox + (ix + 0.5) * this.cell, this.oz + (iz + 0.5) * this.cell];
  }

  isWalkable(i: number): boolean {
    return i >= 0 && this.walk[i] === 1;
  }

  heightAt(x: number, z: number): number {
    const i = this.cellOf(x, z);
    return i >= 0 ? this.height[i]! : 0;
  }

  /** Can an agent step directly from cell a to adjacent cell b? */
  canStep(a: number, b: number): boolean {
    return this.walk[a] === 1 && this.walk[b] === 1 && Math.abs(this.height[a]! - this.height[b]!) <= this.step;
  }

  /** Neighbour buffer reused by every search (no per-expansion allocation). */
  private nb = new Int32Array(8);
  private nbDiag = new Uint8Array(8);

  /**
   * Fill `this.nb` with steppable neighbours of i; returns the count. Diagonals are only allowed
   * when both adjacent orthogonals are steppable (no corner cutting). `this.nbDiag[k]` marks diagonals.
   */
  private fillNeighbours(i: number): number {
    const ix = i % this.w;
    const iz = (i / this.w) | 0;
    let n = 0;
    for (let k = 0; k < 8; k++) {
      const d = DIRS[k]!;
      const dx = d[0];
      const dz = d[1];
      const j = this.index(ix + dx, iz + dz);
      if (j < 0 || !this.canStep(i, j)) continue;
      if (dx !== 0 && dz !== 0) {
        const a = this.index(ix + dx, iz);
        const b = this.index(ix, iz + dz);
        if (a < 0 || b < 0 || !this.canStep(i, a) || !this.canStep(i, b)) continue;
      }
      this.nb[n] = j;
      this.nbDiag[n] = dx !== 0 && dz !== 0 ? 1 : 0;
      n++;
    }
    return n;
  }

  /** Neighbour list (allocates; for tests and tooling only). */
  neighbours(i: number): number[] {
    const n = this.fillNeighbours(i);
    return Array.from(this.nb.subarray(0, n));
  }

  nearestWalkable(x: number, z: number, maxRing = 12): number {
    const c = this.cellOf(x, z);
    if (this.isWalkable(c)) return c;
    const cx = Math.floor((x - this.ox) / this.cell);
    const cz = Math.floor((z - this.oz) / this.cell);
    for (let r = 1; r <= maxRing; r++) {
      let best = -1;
      let bd = Infinity;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          const j = this.index(cx + dx, cz + dz);
          if (j >= 0 && this.walk[j]) {
            const d = dx * dx + dz * dz;
            if (d < bd) {
              bd = d;
              best = j;
            }
          }
        }
      }
      if (best >= 0) return best;
    }
    return -1;
  }

  /** Grid line walk: true if every cell on the segment is steppable from the previous one. */
  lineClear(a: P2, b: P2): boolean {
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.ceil(dist / (this.cell * 0.5)));
    let prev = this.cellOf(a[0], a[1]);
    if (!this.isWalkable(prev)) return false;
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      const c = this.cellOf(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
      if (c !== prev) {
        if (!this.canStep(prev, c)) return false;
        prev = c;
      }
    }
    return true;
  }

  /** A* returning smoothed world waypoints (excluding the start), or null if unreachable. */
  findPath(from: P2, to: P2, maxExpand = 6000): P2[] | null {
    const s = this.nearestWalkable(from[0], from[1]);
    const g = this.nearestWalkable(to[0], to[1]);
    if (s < 0 || g < 0) return null;
    if (s === g) return [to];
    const gen = ++this.gen;
    const heap = new Heap();
    const [gx, gz] = this.center(g);
    const hfn = (i: number): number => {
      const [x, z] = this.center(i);
      const dx = Math.abs(x - gx) / this.cell;
      const dz = Math.abs(z - gz) / this.cell;
      return Math.max(dx, dz) + (SQRT2 - 1) * Math.min(dx, dz);
    };
    this.stamp[s] = gen;
    this.gScore[s] = 0;
    this.came[s] = -1;
    heap.push(s, hfn(s));
    let expanded = 0;
    let found = false;
    while (heap.size && expanded++ < maxExpand) {
      const cur = heap.pop();
      if (cur === g) {
        found = true;
        break;
      }
      const gc = this.gScore[cur]!;
      const n = this.fillNeighbours(cur);
      for (let k = 0; k < n; k++) {
        const j = this.nb[k]!;
        const ng = gc + (this.nbDiag[k] ? SQRT2 : 1);
        if (this.stamp[j] !== gen || ng < this.gScore[j]!) {
          this.stamp[j] = gen;
          this.gScore[j] = ng;
          this.came[j] = cur;
          heap.push(j, ng + hfn(j));
        }
      }
    }
    if (!found) return null;
    const cells: number[] = [];
    for (let c = g; c !== -1; c = this.came[c]!) cells.push(c);
    cells.reverse();
    return this.smooth(from, cells.map((c) => this.center(c)), to);
  }

  /** String pulling: skip waypoints while the straight line stays walkable. */
  smooth(from: P2, pts: P2[], to: P2): P2[] {
    const all = [from, ...pts.slice(1, -1), to];
    const out: P2[] = [];
    let anchor = 0;
    while (anchor < all.length - 1) {
      let far = anchor + 1;
      for (let k = all.length - 1; k > anchor + 1; k--) {
        if (this.lineClear(all[anchor]!, all[k]!)) {
          far = k;
          break;
        }
      }
      out.push(all[far]!);
      anchor = far;
    }
    return out;
  }

  /** Multi-source Dijkstra distance field (in cells) to the nearest goal. Unreached = Infinity. */
  flowField(goals: readonly P2[], out?: Float32Array): Float32Array {
    const dist = out ?? new Float32Array(this.walk.length);
    dist.fill(Infinity);
    const heap = new Heap();
    for (const gp of goals) {
      const g = this.nearestWalkable(gp[0], gp[1]);
      if (g < 0) continue;
      dist[g] = 0;
      heap.push(g, 0);
    }
    while (heap.size) {
      const cur = heap.pop();
      const dc = dist[cur]!;
      // stale duplicate entry (dist is Float32, so compare with a tolerance)
      if ((heap.lastPri ?? dc) > dc + 1e-3) continue;
      const n = this.fillNeighbours(cur);
      for (let k = 0; k < n; k++) {
        const j = this.nb[k]!;
        const nd = dc + (this.nbDiag[k] ? SQRT2 : 1);
        if (nd < dist[j]!) {
          dist[j] = nd;
          heap.push(j, nd);
        }
      }
    }
    return dist;
  }

  /** Steer target from a flow field: the centre of the best neighbouring cell. */
  flowNext(dist: Float32Array, x: number, z: number): P2 | null {
    let c = this.cellOf(x, z);
    if (!this.isWalkable(c)) c = this.nearestWalkable(x, z, 3);
    if (c < 0) return null;
    let best = c;
    let bd = dist[c]!;
    const n = this.fillNeighbours(c);
    for (let k = 0; k < n; k++) {
      const j = this.nb[k]!;
      if (dist[j]! < bd) {
        bd = dist[j]!;
        best = j;
      }
    }
    if (best === c) return null;
    return this.center(best);
  }

  randomWalkable(rng: () => number): number {
    for (let k = 0; k < 200; k++) {
      const i = Math.floor(rng() * this.walk.length);
      if (this.walk[i]) return i;
    }
    return -1;
  }
}
