import { hyp2 } from '../core/mathx';
/**
 * Layered 2.5D navigation grid. Pure (no Babylon): heights come from an injected sampler (Havok raycasts at
 * runtime, functions in tests); walls / cover are rasterised analytically.
 *
 * Multi-level: a column can hold up to `layers` walkable surfaces (a floor, an upper storey over it, a roof).
 * Cells are `layer * columns + column`; moving between columns picks the neighbour surface within the step
 * height, so stairs and ramps join storeys by height, never by layer number. Off-mesh links join what walking
 * cannot: ladders (both ways) and drops off a ledge (down only). Every query takes an optional height `y`
 * (NaN = the lowest walkable surface, the single-storey behaviour).
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

export interface NavSample {
  h: number;
  ok: boolean;
}

/** A ladder / drop to join two surfaces: `pts` is the route (flat x, y, z triples, start to end). */
export interface NavLinkInput {
  kind: 'ladder' | 'drop';
  pts: number[];
  /** Ladders go both ways; drops only down. */
  twoWay: boolean;
}

export interface NavLink {
  kind: 'ladder' | 'drop';
  /** Cells it joins (from -> to). */
  a: number;
  b: number;
  /** Cost in cells. */
  cost: number;
  /** Route from a to b: flat x, y, z triples. */
  pts: number[];
}

export interface NavBuildInput {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  cell: number;
  /** Single surface per column (tests, flat maps). */
  sample(x: number, z: number): NavSample;
  /** Every standing surface in the column, lowest first (overrides `sample`). */
  sampleLayers?(x: number, z: number): NavSample[];
  /** Surfaces kept per column (default 1, or 3 with `sampleLayers`). */
  layers?: number;
  blockers: readonly NavBlocker[];
  links?: readonly NavLinkInput[];
  agentRadius: number;
  stepHeight: number;
  /** Seed point used to keep only the main connected region. */
  seed?: [number, number];
  /**
   * More flood seeds (x, y, z feet points) kept with `seed`'s region: a map whose parts are joined only by player
   * routes the grid does not model (ropes, locked doors, one-way drops) seeds each part. None: `seed` alone, as before.
   */
  extraSeeds?: readonly (readonly [number, number, number])[];
}

export type P2 = [number, number];
/** A route point; `link` marks the start of a ladder / drop to take from here. */
export type Waypoint = P2 & { link?: NavLink };

const SQRT2 = Math.SQRT2;
const DIRS: ReadonlyArray<[number, number, number]> = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2],
];
/** Neighbour buffer size: eight directions plus links out of one cell. */
const NB_MAX = 16;
/** A height within this of a surface picks it (m). */
const LAYER_PICK = 1.2;

/** (guard-ai play A, train 132 fix; check FIX 1) Frames (`sliceTick`) an owner may skip his slice before another guard
 *  may take the search over (`sliceFree`): 1 s at 30 Hz. */
const SLICE_IDLE = 30;

/** (guard-ai play A, train 132 fix) One A* spread over several calls (`NavGrid.sliceStart` / `sliceStep`): the owner,
 *  the ends, the expansions so far, the nav version it started under and its own buffers. */
interface SliceState {
  by: object | null;
  idle: number;
  gen: number;
  s: number;
  g: number;
  gx: number;
  gz: number;
  fx: number;
  fz: number;
  tx: number;
  tz: number;
  expanded: number;
  ver: number;
  readonly heap: Heap;
  readonly gScore: Float64Array;
  readonly came: Int32Array;
  readonly cameLink: Int32Array;
  readonly stamp: Uint32Array;
}

/** Binary min-heap keyed by Float32 priorities, on growable typed arrays (reused: no per-query allocation). */
class Heap {
  private items = new Int32Array(256);
  private pri = new Float32Array(256);
  private n = 0;
  /** Priority of the most recently popped item (lets Dijkstra skip stale duplicates). */
  lastPri = 0;
  get size(): number {
    return this.n;
  }
  clear(): void {
    this.n = 0;
  }
  push(item: number, p: number): void {
    if (this.n === this.items.length) {
      const a2 = new Int32Array(this.n * 2);
      a2.set(this.items);
      const b2 = new Float32Array(this.n * 2);
      b2.set(this.pri);
      this.items = a2;
      this.pri = b2;
    }
    const a = this.items;
    const b = this.pri;
    let i = this.n++;
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
    this.lastPri = b[0]!;
    const n = --this.n;
    if (n > 0) {
      const last = a[n]!;
      const lp = b[n]!;
      let i = 0;
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
  /** Surfaces per column. */
  readonly layers: number;
  /** Columns per layer (w * h). */
  readonly cols: number;
  readonly height: Float32Array;
  readonly walk: Uint8Array;
  /** A sampled surface (walkable or not: blocked, pruned) - storeys are picked among these. */
  readonly surf: Uint8Array;
  readonly step: number;
  readonly links: NavLink[] = [];
  /** Steps only: ladders and drops are left out of searches while set (the benchmark flight, 3.2.5). */
  walkOnly = false;
  /** First link out of / into a cell (-1 = none), chained through `linkNext` / `rlinkNext`. */
  private linkHead: Int32Array;
  private rlinkHead: Int32Array;
  private linkNext: number[] = [];
  private rlinkNext: number[] = [];
  /** Path costs (Float64: with Float32 a re-reached cell whose stored cost rounded up counted as an improvement, and a long search looped and found no path). */
  private gScore: Float64Array;
  /** Shared priority queue for path and flow queries (not re-entrant). */
  private heap = new Heap();
  private came: Int32Array;
  private cameLink: Int32Array;
  private stamp: Uint32Array;
  private gen = 1;
  /** (polish2 A184) The last `findPath` with `partial` found no path and ended at the reached cell nearest the goal
   *  (or returned null: the start was that cell). */
  partialEnd = false;
  /** (polish2 A184) The partial end's cell centre (scratch). */
  private endP: P2 = [0, 0];
  /** (guard-ai play A, train 132 fix) The sliced search (`sliceStart`), null until first used. */
  private slice: SliceState | null = null;
  /** `octile`'s cell centre (scratch). */
  private readonly octP: P2 = [0, 0];
  /**
   * Bumped whenever a closure opens or shuts: an agent holding a path (or a cached flow field) compares it with the
   * value it planned under and replans when it changed.
   */
  version = 0;
  /** Closures holding each cell shut (allocated by the first `addClosure`). */
  private closeCount: Uint8Array | null = null;
  /** Each closure's cells (collected once by `addClosure`), and whether it is shut. */
  private closureCells: Int32Array[] = [];
  private closureOn: boolean[] = [];

  constructor(input: NavBuildInput) {
    this.cell = input.cell;
    this.ox = input.minX;
    this.oz = input.minZ;
    this.w = Math.ceil((input.maxX - input.minX) / input.cell);
    this.h = Math.ceil((input.maxZ - input.minZ) / input.cell);
    this.step = input.stepHeight;
    this.layers = Math.max(1, input.layers ?? (input.sampleLayers ? 3 : 1));
    this.cols = this.w * this.h;
    const n = this.cols * this.layers;
    this.height = new Float32Array(n);
    this.walk = new Uint8Array(n);
    this.surf = new Uint8Array(n);
    this.gScore = new Float64Array(n);
    this.came = new Int32Array(n);
    this.cameLink = new Int32Array(n);
    this.stamp = new Uint32Array(n);
    this.linkHead = new Int32Array(n).fill(-1);
    this.rlinkHead = new Int32Array(n).fill(-1);
    for (let col = 0; col < this.cols; col++) {
      const [x, z] = this.center(col);
      if (input.sampleLayers) {
        const ss = input.sampleLayers(x, z);
        for (let l = 0; l < this.layers && l < ss.length; l++) {
          const i = l * this.cols + col;
          this.height[i] = ss[l]!.h;
          this.walk[i] = ss[l]!.ok ? 1 : 0;
          this.surf[i] = 1;
        }
      } else {
        const s = input.sample(x, z);
        this.height[col] = s.h;
        this.walk[col] = s.ok ? 1 : 0;
        this.surf[col] = 1;
      }
    }
    this.rasterBlockers(input);
    for (const l of input.links ?? []) this.addLink(l);
    if (input.seed) {
      const seeds = [this.nearestWalkable(input.seed[0], input.seed[1])];
      for (const p of input.extraSeeds ?? []) seeds.push(this.nearestWalkable(p[0], p[2], 12, p[1]));
      this.keepRegion(seeds);
    }
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
          const col = iz * this.w + ix;
          const [x, z] = this.center(col);
          const dx = x - b.cx;
          const dz = z - b.cz;
          let inside: boolean;
          if (b.round) {
            inside = hyp2(dx, dz) <= b.hx + r;
          } else {
            // rotate into box local space (yaw about +Y, Babylon left-handed: local x = cos*dx - sin*dz)
            const lx = c * dx + s * dz;
            const lz = -s * dx + c * dz;
            inside = Math.abs(lx) <= b.hx + r && Math.abs(lz) <= b.hz + r;
          }
          if (!inside) continue;
          for (let l = 0; l < this.layers; l++) {
            const i = l * this.cols + col;
            if (!this.walk[i]) continue;
            const hc = this.height[i]!;
            if (b.top > hc + this.step && b.bottom < hc + 1.6) this.walk[i] = 0;
          }
        }
      }
    }
  }

  /** Join two surfaces (resolved from the route's ends; skipped when either end has no surface). */
  private addLink(l: NavLinkInput): void {
    const p = l.pts;
    const k = p.length - 3;
    if (k < 3) return;
    const a = this.surfaceNear(p[0]!, p[1]!, p[2]!);
    const b = this.surfaceNear(p[k]!, p[k + 1]!, p[k + 2]!);
    if (a < 0 || b < 0 || a === b) return;
    let len = 0;
    for (let j = 3; j <= k; j += 3) len += Math.sqrt((p[j]! - p[j - 3]!) ** 2 + (p[j + 1]! - p[j - 2]!) ** 2 + (p[j + 2]! - p[j - 1]!) ** 2);
    // climbing is slow; a drop is quick but costs the landing
    const cost = (l.kind === 'ladder' ? len * 2.5 : len + 2) / this.cell;
    this.pushLink({ kind: l.kind, a, b, cost, pts: p.slice() });
    if (l.twoWay) {
      const rev: number[] = [];
      for (let j = k; j >= 0; j -= 3) rev.push(p[j]!, p[j + 1]!, p[j + 2]!);
      this.pushLink({ kind: l.kind, a: b, b: a, cost, pts: rev });
    }
  }

  private pushLink(l: NavLink): void {
    const id = this.links.length;
    this.links.push(l);
    this.linkNext.push(this.linkHead[l.a]!);
    this.linkHead[l.a] = id;
    this.rlinkNext.push(this.rlinkHead[l.b]!);
    this.rlinkHead[l.b] = id;
  }

  /** The walkable surface nearest (x, y, z) within half a metre and `LAYER_PICK` of the height (-1 = none). */
  private surfaceNear(x: number, y: number, z: number): number {
    const cx = Math.floor((x - this.ox) / this.cell);
    const cz = Math.floor((z - this.oz) / this.cell);
    let best = -1;
    let bd = Infinity;
    const r = Math.max(1, Math.round(0.5 / this.cell));
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const col = this.index(cx + dx, cz + dz);
        if (col < 0) continue;
        for (let l = 0; l < this.layers; l++) {
          const i = l * this.cols + col;
          if (!this.walk[i]) continue;
          const dh = Math.abs(this.height[i]! - y);
          if (dh > LAYER_PICK) continue;
          const d = dx * dx + dz * dz + dh * dh * 4;
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
      }
    }
    return best;
  }

  /** Flood fill from the seeds (the first the main one: none there, no fill); anything unreachable becomes unwalkable. */
  private keepRegion(seeds: readonly number[]): void {
    if (seeds[0]! < 0) return;
    const seen = new Uint8Array(this.walk.length);
    const stack: number[] = [];
    for (const sd of seeds) {
      if (sd < 0 || seen[sd]) continue;
      seen[sd] = 1;
      stack.push(sd);
    }
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

  /** Column index (layer 0 cell) of grid coordinates, -1 outside. */
  index(ix: number, iz: number): number {
    if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.h) return -1;
    return iz * this.w + ix;
  }

  /**
   * Cell at (x, z): with a height `y` the surface closest to it (walkable or not: a blocked cell by a wall is still
   * that storey), else the lowest walkable one (a column with none gives its layer 0 cell; outside the grid -1).
   */
  cellOf(x: number, z: number, y = Number.NaN): number {
    const col = this.index(Math.floor((x - this.ox) / this.cell), Math.floor((z - this.oz) / this.cell));
    if (col < 0 || this.layers === 1) return col;
    return this.pick(col, y);
  }

  private pick(col: number, y: number): number {
    let best = col;
    let bd = Infinity;
    for (let l = 0; l < this.layers; l++) {
      const i = l * this.cols + col;
      if (y !== y) {
        if (this.walk[i]) return i;
        continue;
      }
      if (!this.surf[i]) continue;
      const d = Math.abs(this.height[i]! - y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }

  /** The cell at (x, z) an agent standing in `cur` would be on: same column = same cell, else the surface
   *  nearest its height. */
  cellNear(cur: number, x: number, z: number): number {
    const col = this.index(Math.floor((x - this.ox) / this.cell), Math.floor((z - this.oz) / this.cell));
    if (col < 0) return -1;
    if (cur < 0) return this.layers === 1 ? col : this.pick(col, Number.NaN);
    if (cur % this.cols === col) return cur;
    return this.layers === 1 ? col : this.pick(col, this.height[cur]!);
  }

  /** (guard-ai sweep fix) `center` into `out`, no allocation. */
  centerInto(i: number, out: P2): P2 {
    const col = i % this.cols;
    out[0] = this.ox + ((col % this.w) + 0.5) * this.cell;
    out[1] = this.oz + (((col / this.w) | 0) + 0.5) * this.cell;
    return out;
  }

  center(i: number): P2 {
    const col = i % this.cols;
    const ix = col % this.w;
    const iz = (col / this.w) | 0;
    return [this.ox + (ix + 0.5) * this.cell, this.oz + (iz + 0.5) * this.cell];
  }

  isWalkable(i: number): boolean {
    return i >= 0 && this.walk[i] === 1;
  }

  heightAt(x: number, z: number, y = Number.NaN): number {
    const i = this.cellOf(x, z, y);
    return i >= 0 ? this.height[i]! : 0;
  }

  /** (guard-ai S15 laptop fix) The surface height of cell `i` (0 outside the grid). `heightAt` on a wall's own column
   *  gives the wall's top (often its only surface): a point on a wall stands on the walkable cell beside it, at that
   *  cell's height. */
  cellHeight(i: number): number {
    return i >= 0 ? this.height[i]! : 0;
  }

  /** Can an agent step directly from cell a to adjacent cell b? */
  canStep(a: number, b: number): boolean {
    return a >= 0 && b >= 0 && this.walk[a] === 1 && this.walk[b] === 1 && Math.abs(this.height[a]! - this.height[b]!) <= this.step;
  }

  /** The surface in column `col` an agent in cell i can step onto (-1 = none). */
  private stepTo(i: number, col: number): number {
    const hi = this.height[i]!;
    let best = -1;
    let bd = this.step;
    for (let l = 0; l < this.layers; l++) {
      const j = l * this.cols + col;
      if (!this.walk[j]) continue;
      const d = Math.abs(this.height[j]! - hi);
      if (d <= bd) {
        bd = d;
        best = j;
      }
    }
    return best;
  }

  /** Neighbour buffers reused by every search (no per-expansion allocation). */
  private nb = new Int32Array(NB_MAX);
  private nbCost = new Float32Array(NB_MAX);
  /** Link taken to reach the neighbour (-1 = a step). */
  private nbLink = new Int32Array(NB_MAX);

  /**
   * Fill `this.nb` with the cells reachable from i (steps to the eight neighbours, then links out of it);
   * returns the count. Diagonals need both adjacent orthogonals steppable (no corner cutting).
   */
  private fillNeighbours(i: number): number {
    const col = i % this.cols;
    const ix = col % this.w;
    const iz = (col / this.w) | 0;
    let n = 0;
    if (!this.walk[i]) return 0;
    for (let k = 0; k < 8; k++) {
      const d = DIRS[k]!;
      const dx = d[0];
      const dz = d[1];
      const jc = this.index(ix + dx, iz + dz);
      if (jc < 0) continue;
      const j = this.stepTo(i, jc);
      if (j < 0) continue;
      if (dx !== 0 && dz !== 0) {
        const a = this.index(ix + dx, iz);
        const b = this.index(ix, iz + dz);
        if (a < 0 || b < 0 || this.stepTo(i, a) < 0 || this.stepTo(i, b) < 0) continue;
      }
      this.nb[n] = j;
      this.nbCost[n] = d[2];
      this.nbLink[n] = -1;
      n++;
    }
    if (this.walkOnly) return n;
    for (let l = this.linkHead[i]!; l >= 0 && n < NB_MAX; l = this.linkNext[l]!) {
      const lk = this.links[l]!;
      if (!this.walk[lk.b]) continue;
      this.nb[n] = lk.b;
      this.nbCost[n] = lk.cost;
      this.nbLink[n] = l;
      n++;
    }
    return n;
  }

  /** Cells that reach i (steps are symmetric; links are followed backwards). */
  private fillPredecessors(i: number): number {
    let n = this.fillNeighbours(i);
    // drop the forward links, add the backward ones
    let m = 0;
    for (let k = 0; k < n; k++) {
      if (this.nbLink[k]! >= 0) continue;
      this.nb[m] = this.nb[k]!;
      this.nbCost[m] = this.nbCost[k]!;
      this.nbLink[m] = -1;
      m++;
    }
    n = m;
    for (let l = this.rlinkHead[i]!; l >= 0 && n < NB_MAX; l = this.rlinkNext[l]!) {
      const lk = this.links[l]!;
      if (!this.walk[lk.a]) continue;
      this.nb[n] = lk.a;
      this.nbCost[n] = lk.cost;
      this.nbLink[n] = l;
      n++;
    }
    return n;
  }

  /** Neighbour list (allocates; for tests and tooling only). */
  neighbours(i: number): number[] {
    const n = this.fillNeighbours(i);
    return Array.from(this.nb.subarray(0, n));
  }

  /** Nearest walkable cell to (x, z) within `maxRing` cells; a height y picks the storey (soft: the surface in
   *  the column closest to it, then nearby columns weighed by distance and height). */
  nearestWalkable(x: number, z: number, maxRing = 12, y = Number.NaN): number {
    const c = this.cellOf(x, z, y);
    if (this.isWalkable(c) && (y !== y || Math.abs(this.height[c]! - y) <= LAYER_PICK)) return c;
    const cx = Math.floor((x - this.ox) / this.cell);
    const cz = Math.floor((z - this.oz) / this.cell);
    // with a height the column's other storey competes with nearby columns on the right one
    let best = -1;
    let bd = Infinity;
    for (let r = y === y ? 0 : 1; r <= maxRing; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          const col = this.index(cx + dx, cz + dz);
          if (col < 0) continue;
          for (let l = 0; l < this.layers; l++) {
            const j = l * this.cols + col;
            if (!this.walk[j]) continue;
            let d = dx * dx + dz * dz;
            if (y === y) {
              const dh = (this.height[j]! - y) / this.cell;
              d += dh * dh;
            }
            if (d < bd) {
              bd = d;
              best = j;
            }
          }
        }
      }
      if (best >= 0 && (y !== y || (r + 1) * (r + 1) > bd)) return best;
    }
    return best;
  }

  /**
   * Grid line walk: true if every cell on the segment is steppable from the previous one. With heights the walk
   * starts on the surface at `ya` and, given `yb`, must end on the surface at that height.
   */
  lineClear(a: P2, b: P2, ya = Number.NaN, yb = Number.NaN): boolean {
    return this.walkLine(this.cellOf(a[0], a[1], ya), a[0], a[1], b[0], b[1], yb);
  }

  private walkLine(start: number, ax: number, az: number, bx: number, bz: number, yb: number): boolean {
    const dist = hyp2(bx - ax, bz - az);
    const steps = Math.max(1, Math.ceil(dist / (this.cell * 0.5)));
    let prev = start;
    if (!this.isWalkable(prev)) return false;
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      const c = this.cellNear(prev, ax + (bx - ax) * t, az + (bz - az) * t);
      if (c !== prev) {
        if (!this.canStep(prev, c)) return false;
        prev = c;
      }
    }
    // with a height for b: it must end on the storey there (near yb, or the surface in that column closest to it)
    return yb !== yb || this.layers === 1 || Math.abs(this.height[prev]! - yb) <= LAYER_PICK || prev === this.pick(prev % this.cols, yb);
  }

  /**
   * A* returning smoothed world waypoints (excluding the start), or null if unreachable. A waypoint carrying a
   * `link` is where a ladder / drop starts; the next one is past its far end.
   * (polish2 A184) `partial`: with no path, the path ends at the reached cell nearest the goal (its centre is the
   * last waypoint): the lowest octile among cells within `LAYER_PICK` of the goal cell's height, so it stays on the
   * goal's storey, not straight above / below; with none reached, the lowest octile plus the height gap in cells.
   * That cell is the start: null. `partialEnd` says whether the last call ended short.
   */
  findPath(from: P2, to: P2, maxExpand = 6000, fromY = Number.NaN, toY = Number.NaN, partial = false): Waypoint[] | null {
    this.partialEnd = false;
    const s = this.nearestWalkable(from[0], from[1], 12, fromY);
    let g = this.nearestWalkable(to[0], to[1], 12, toY);
    if (s < 0 || g < 0) return null;
    if (s === g) return [to];
    const gen = ++this.gen;
    const heap = this.heap;
    heap.clear();
    const [gx, gz] = this.center(g);
    this.stamp[s] = gen;
    this.gScore[s] = 0;
    this.came[s] = -1;
    this.cameLink[s] = -1;
    // (polish2 A184 fix) the partial end keeps the goal's storey: a reached cell within LAYER_PICK of the goal's
    // height (lowest octile) beats any other; with none, the lowest octile plus the height gap in cells
    const gy = this.height[g]!;
    const h0 = this.octile(s, gx, gz);
    const dh0 = Math.abs(this.height[s]! - gy);
    let bestH = h0 + dh0 / this.cell;
    let best = s;
    let bestOnH = dh0 <= LAYER_PICK ? h0 : Infinity;
    let bestOn = dh0 <= LAYER_PICK ? s : -1;
    heap.push(s, h0);
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
        const ng = gc + this.nbCost[k]!;
        if (this.stamp[j] !== gen || ng < this.gScore[j]!) {
          this.stamp[j] = gen;
          this.gScore[j] = ng;
          this.came[j] = cur;
          this.cameLink[j] = this.nbLink[k]!;
          const h = this.octile(j, gx, gz);
          if (partial) {
            const dh = Math.abs(this.height[j]! - gy);
            if (dh <= LAYER_PICK) {
              if (h < bestOnH) {
                bestOnH = h;
                bestOn = j;
              }
            } else if (h + dh / this.cell < bestH) {
              bestH = h + dh / this.cell;
              best = j;
            }
          }
          heap.push(j, ng + h);
        }
      }
    }
    // (polish2 A184) the nearest reached cell instead (the start itself: nothing nearer to walk to)
    let tx = to[0];
    let tz = to[1];
    if (!found) {
      if (!partial) return null;
      this.partialEnd = true;
      if (bestOn >= 0) best = bestOn;
      if (best === s) return null;
      g = best;
      const c = this.centerInto(best, this.endP);
      tx = c[0];
      tz = c[1];
    }
    return this.buildPath(g, this.came, this.cameLink, from[0], from[1], tx, tz);
  }

  /** The smoothed waypoints of a finished search, walking `came` / `cameLink` back from cell `g` (`findPath`,
   *  `sliceStep`). */
  private buildPath(g: number, came: Int32Array, cameLink: Int32Array, fx: number, fz: number, tx: number, tz: number): Waypoint[] {
    const cells: number[] = [];
    const via: number[] = [];
    for (let c = g; c !== -1; c = came[c]!) {
      cells.push(c);
      via.push(cameLink[c]!);
    }
    cells.reverse();
    via.reverse();
    // smooth each walked stretch; links split them
    const out: Waypoint[] = [];
    let segStart = 0;
    let sx = fx;
    let sz = fz;
    for (let k = 1; k <= cells.length; k++) {
      const last = k === cells.length;
      const lk = last ? -1 : via[k]!;
      if (!last && lk < 0) continue;
      const link = lk >= 0 ? this.links[lk]! : null;
      const ex = link ? link.pts[0]! : tx;
      const ez = link ? link.pts[2]! : tz;
      this.smoothCells(sx, sz, cells, segStart, k - 1, ex, ez, out);
      if (!link) break;
      const wp = out[out.length - 1]!;
      wp.link = link;
      const m = link.pts.length - 3;
      sx = link.pts[m]!;
      sz = link.pts[m + 2]!;
      segStart = k;
    }
    return out;
  }

  /** (guard-ai play A, train 132 fix) Whether `owner` may run the sliced search now: it is free, his, or left idle by
   *  its owner over `SLICE_IDLE` frames (a guard that stopped walking home mid-search: dead, in a fight). A pure read
   *  (check FIX 1: the frames are counted by `sliceTick`, not by asks). */
  sliceFree(owner: object): boolean {
    const sl = this.slice;
    return !sl || sl.by === null || sl.by === owner || sl.idle > SLICE_IDLE;
  }

  /** (check FIX 1) One frame passed (`EnemyManager.update`): a running search's idle count goes up (`sliceStep` zeroes it). */
  sliceTick(): void {
    const sl = this.slice;
    if (sl && sl.by !== null) sl.idle++;
  }

  /** (check FIX 1) The last `sliceStep` returned null because the search was not his any more (taken over, or a closure
   *  changed the grid): not "no path", the caller may start again. */
  sliceLost = false;

  /**
   * (guard-ai play A, train 132 fix) Starts one A* from `from` to `to` that runs over several `sliceStep` calls on its
   * own buffers (allocated on the first use), so the shared `findPath` / flow queries in between leave it alone. One at
   * a time: a new start takes the search over. False if either end has no walkable cell (nothing started).
   */
  sliceStart(owner: object, from: P2, to: P2, fromY = Number.NaN, toY = Number.NaN): boolean {
    const s = this.nearestWalkable(from[0], from[1], 12, fromY);
    const g = this.nearestWalkable(to[0], to[1], 12, toY);
    if (s < 0 || g < 0) return false;
    const n = this.gScore.length;
    let sl = this.slice;
    if (!sl) {
      sl = { by: null, idle: 0, gen: 1, s: 0, g: 0, gx: 0, gz: 0, fx: 0, fz: 0, tx: 0, tz: 0, expanded: 0, ver: 0, heap: new Heap(), gScore: new Float64Array(n), came: new Int32Array(n), cameLink: new Int32Array(n), stamp: new Uint32Array(n) };
      this.slice = sl;
    }
    sl.by = owner;
    sl.idle = 0;
    const gen = ++sl.gen;
    sl.s = s;
    sl.g = g;
    const c = this.centerInto(g, this.endP);
    sl.gx = c[0];
    sl.gz = c[1];
    sl.fx = from[0];
    sl.fz = from[1];
    sl.tx = to[0];
    sl.tz = to[1];
    sl.expanded = 0;
    sl.ver = this.version;
    sl.heap.clear();
    sl.stamp[s] = gen;
    sl.gScore[s] = 0;
    sl.came[s] = -1;
    sl.cameLink[s] = -1;
    sl.heap.push(s, this.octile(s, sl.gx, sl.gz));
    return true;
  }

  /**
   * (guard-ai play A, train 132 fix) Up to `budget` more expansions of `owner`'s sliced search: its path (as
   * `findPath`'s), null when it ends without one (unreachable, `cap` expansions in all; or, with `sliceLost`, a closure
   * changed or another owner took it), undefined while it still runs. A finished search frees the slot.
   */
  sliceStep(owner: object, budget: number, cap: number): Waypoint[] | null | undefined {
    const sl = this.slice;
    this.sliceLost = false;
    if (!sl || sl.by !== owner) {
      this.sliceLost = true;
      return null;
    }
    sl.idle = 0;
    if (sl.ver !== this.version) {
      sl.by = null;
      this.sliceLost = true;
      return null;
    }
    if (sl.s === sl.g) {
      sl.by = null;
      return [[sl.tx, sl.tz]];
    }
    const heap = sl.heap;
    const gen = sl.gen;
    const end = Math.min(cap, sl.expanded + budget);
    while (heap.size && sl.expanded < end) {
      sl.expanded++;
      const cur = heap.pop();
      if (cur === sl.g) {
        sl.by = null;
        return this.buildPath(cur, sl.came, sl.cameLink, sl.fx, sl.fz, sl.tx, sl.tz);
      }
      const gc = sl.gScore[cur]!;
      const n = this.fillNeighbours(cur);
      for (let k = 0; k < n; k++) {
        const j = this.nb[k]!;
        const ng = gc + this.nbCost[k]!;
        if (sl.stamp[j] !== gen || ng < sl.gScore[j]!) {
          sl.stamp[j] = gen;
          sl.gScore[j] = ng;
          sl.came[j] = cur;
          sl.cameLink[j] = this.nbLink[k]!;
          heap.push(j, ng + this.octile(j, sl.gx, sl.gz));
        }
      }
    }
    if (heap.size && sl.expanded < cap) return undefined;
    sl.by = null;
    return null;
  }

  /** (guard-ai play A, train 132 fix) `owner` drops his sliced search (a new goal): the slot is free. */
  sliceCancel(owner: object): void {
    const sl = this.slice;
    if (sl && sl.by === owner) sl.by = null;
  }

  private octile(i: number, gx: number, gz: number): number {
    // (re-check P2) the cell centre into a kept scratch: no array per heap push
    const c = this.centerInto(i, this.octP);
    const dx = Math.abs(c[0] - gx) / this.cell;
    const dz = Math.abs(c[1] - gz) / this.cell;
    return Math.max(dx, dz) + (SQRT2 - 1) * Math.min(dx, dz);
  }

  /** String pulling over cells[i0..i1] from (sx, sz) to (ex, ez): pushes the waypoints after the start. */
  private smoothCells(sx: number, sz: number, cells: number[], i0: number, i1: number, ex: number, ez: number, out: Waypoint[]): void {
    // points: start, inner cell centres, end; each with the cell it lies on
    const px: number[] = [sx];
    const pz: number[] = [sz];
    const pc: number[] = [cells[i0]!];
    for (let k = i0 + 1; k < i1; k++) {
      const [x, z] = this.center(cells[k]!);
      px.push(x);
      pz.push(z);
      pc.push(cells[k]!);
    }
    px.push(ex);
    pz.push(ez);
    pc.push(cells[i1]!);
    let anchor = 0;
    const last = px.length - 1;
    if (last === 0) {
      out.push([ex, ez]);
      return;
    }
    while (anchor < last) {
      let far = anchor + 1;
      for (let k = last; k > anchor + 1; k--) {
        if (this.walkLine(pc[anchor]!, px[anchor]!, pz[anchor]!, px[k]!, pz[k]!, this.height[pc[k]!]!)) {
          far = k;
          break;
        }
      }
      out.push([px[far]!, pz[far]!]);
      anchor = far;
    }
  }

  /** String pulling: skip waypoints while the straight line stays walkable (single surface). */
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

  /** Multi-source Dijkstra distance field (in cells) to the nearest goal. Unreached = Infinity. `ys` gives the
   *  goals' heights (pick their storey). */
  flowField(goals: readonly P2[], out?: Float32Array, ys?: readonly number[]): Float32Array {
    const dist = out ?? new Float32Array(this.walk.length);
    dist.fill(Infinity);
    const heap = this.heap;
    heap.clear();
    for (let gi = 0; gi < goals.length; gi++) {
      const gp = goals[gi]!;
      const g = this.nearestWalkable(gp[0], gp[1], 12, ys?.[gi] ?? Number.NaN);
      if (g < 0) continue;
      dist[g] = 0;
      heap.push(g, 0);
    }
    while (heap.size) {
      const cur = heap.pop();
      const dc = dist[cur]!;
      // stale duplicate entry (dist is Float32, so compare with a tolerance)
      if (heap.lastPri > dc + 1e-3) continue;
      const n = this.fillPredecessors(cur);
      for (let k = 0; k < n; k++) {
        const j = this.nb[k]!;
        const nd = dc + this.nbCost[k]!;
        if (nd < dist[j]!) {
          dist[j] = nd;
          heap.push(j, nd);
        }
      }
    }
    return dist;
  }

  /** Steer target from a flow field: the centre of the best neighbouring cell, or a link's start (`link` set). */
  flowNext(dist: Float32Array, x: number, z: number, y = Number.NaN): Waypoint | null {
    let c = this.cellOf(x, z, y);
    if (!this.isWalkable(c)) c = this.nearestWalkable(x, z, 3, y);
    if (c < 0) return null;
    let best = c;
    let bd = dist[c]!;
    let via = -1;
    const n = this.fillNeighbours(c);
    for (let k = 0; k < n; k++) {
      const j = this.nb[k]!;
      if (dist[j]! < bd) {
        bd = dist[j]!;
        best = j;
        via = this.nbLink[k]!;
      }
    }
    if (best === c) return null;
    if (via >= 0) {
      const lk = this.links[via]!;
      const wp: Waypoint = [lk.pts[0]!, lk.pts[2]!];
      wp.link = lk;
      return wp;
    }
    return this.center(best);
  }

  /**
   * A runtime closure (a bolted door): collects, once, the walkable cells whose centres lie in the rect (centre cx, cz;
   * half extents hx across, hz along the yaw direction (sin yaw, cos yaw), the `NavBlocker` box convention) on the
   * surface within `tol` of height y. Starts open; `setClosed` shuts and opens it. Build time only (allocates).
   */
  addClosure(cx: number, cz: number, hx: number, hz: number, yaw: number, y: number, tol = 0.6): number {
    if (!this.closeCount) this.closeCount = new Uint8Array(this.walk.length);
    const cnt = this.closeCount;
    const ext = hyp2(hx, hz);
    const ix0 = Math.max(0, Math.floor((cx - ext - this.ox) / this.cell));
    const ix1 = Math.min(this.w - 1, Math.floor((cx + ext - this.ox) / this.cell));
    const iz0 = Math.max(0, Math.floor((cz - ext - this.oz) / this.cell));
    const iz1 = Math.min(this.h - 1, Math.floor((cz + ext - this.oz) / this.cell));
    const c = Math.cos(-yaw);
    const s = Math.sin(-yaw);
    const cells: number[] = [];
    for (let iz = iz0; iz <= iz1; iz++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        const dx = this.ox + (ix + 0.5) * this.cell - cx;
        const dz = this.oz + (iz + 0.5) * this.cell - cz;
        const lx = c * dx + s * dz;
        const lz = -s * dx + c * dz;
        if (Math.abs(lx) > hx || Math.abs(lz) > hz) continue;
        const col = iz * this.w + ix;
        for (let l = 0; l < this.layers; l++) {
          const i = l * this.cols + col;
          // walkable, or walkable but held shut by another closure already
          if (!this.surf[i] || (!this.walk[i] && !cnt[i])) continue;
          if (Math.abs(this.height[i]! - y) > tol) continue;
          cells.push(i);
        }
      }
    }
    this.closureCells.push(Int32Array.from(cells));
    this.closureOn.push(false);
    return this.closureCells.length - 1;
  }

  /** Shut (on) or open a closure; a cell stays blocked while any closure holding it is shut. No allocation. */
  setClosed(id: number, on: boolean): void {
    const cells = this.closureCells[id];
    const cnt = this.closeCount;
    if (!cells || !cnt || this.closureOn[id] === on) return;
    this.closureOn[id] = on;
    for (let k = 0; k < cells.length; k++) {
      const i = cells[k]!;
      const n = cnt[i]!;
      if (on) {
        cnt[i] = n + 1;
        if (n === 0) this.walk[i] = 0;
      } else if (n > 0) {
        cnt[i] = n - 1;
        if (n === 1) this.walk[i] = 1;
      }
    }
    this.version++;
  }

  isClosed(id: number): boolean {
    return this.closureOn[id] === true;
  }

  /** A closure's cells (tests and tooling). */
  closureSize(id: number): number {
    return this.closureCells[id]?.length ?? 0;
  }

  randomWalkable(rng: () => number): number {
    for (let k = 0; k < 200; k++) {
      const i = Math.floor(rng() * this.walk.length);
      if (this.walk[i]) return i;
    }
    return -1;
  }
}
