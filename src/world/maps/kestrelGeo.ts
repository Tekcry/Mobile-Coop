/**
 * Kestrel arch-schema geometry (pure, no Babylon): turns a file in the arch schema (`docs/kestrel/schema.md` section 2) into
 * wall boxes, floor tiles, stair flights and teleport points. `kestrel.ts` draws them; B0 reads `kestrel.blocks.json`, B1
 * will read `kestrel.arch.json` through the same functions. No coordinate or size is typed here: every position, height and
 * width comes from the file (the only constants are slab thickness, colours and tolerances).
 */
export type Pt = readonly [number, number];
export type Rect4 = readonly [x0: number, z0: number, x1: number, z1: number];
export type Ring = number | string;

export interface ArchLevel {
  id: string;
  name: string;
  floor: number;
  height: number;
  footprint?: Rect4;
}
export interface ArchRoom {
  id: string;
  level: string;
  name: string;
  kind: string;
  rect: Rect4;
  ceiling: number;
  ring: Ring;
}
export interface ArchWall {
  id: string;
  level: string;
  a: Pt;
  b: Pt;
  t: number;
  h: number;
  kind: string;
}
export interface ArchOpening {
  id: string;
  wall: string;
  at: number;
  w: number;
  h: number;
  sill: number;
  type: string;
  between: string[];
}
export interface ArchStair {
  id: string;
  kind: string;
  from: string;
  to: string;
  rect: Rect4;
  up: 'N' | 'S' | 'E' | 'W';
  width: number;
  risers: number;
  layout?: string;
}
export interface ArchVoid {
  id: string;
  level: string;
  rect: Rect4;
  kind: string;
}
export interface KestrelArch {
  meta: { id: string; entry: Pt; site: Rect4; footprint: Rect4 };
  levels: ArchLevel[];
  rooms: ArchRoom[];
  walls: ArchWall[];
  openings: ArchOpening[];
  stairs: ArchStair[];
  voids: ArchVoid[];
}

/** Floor and roof slab thickness (m): below the level's floor top. */
export const SLAB = 0.3;
const EPS = 1e-6;

export function levelOf(arch: KestrelArch, id: string): ArchLevel {
  const l = arch.levels.find((q) => q.id === id);
  if (!l) throw new Error(`kestrel arch: unknown level ${id}`);
  return l;
}

/** The rect a level is built over: its own footprint, else the building footprint. */
export function levelFootprint(arch: KestrelArch, l: ArchLevel): Rect4 {
  return l.footprint ?? arch.meta.footprint;
}

/** Rooms are drawn in zone rings: one grey per ring (`3+` between 3 and 4). */
const RING_GREY: Record<string, number> = { '1': 0x9c, '2': 0x90, '3': 0x84, '3+': 0x7a, '4': 0x70, '5': 0x62 };
export function ringRank(r: Ring): number {
  return r === '3+' ? 3.5 : Number(r);
}
function hex(v: number): string {
  const c = Math.max(0, Math.min(255, Math.round(v)));
  const s = c.toString(16).padStart(2, '0');
  return `#${s}${s}${s}`;
}
export function ringFloorColour(r: Ring): string {
  return hex(RING_GREY[String(r)] ?? 0x88);
}
/** Walls of a ring: the ring's grey, lighter so a wall reads against its floor. */
export function ringWallColour(r: Ring): string {
  return hex((RING_GREY[String(r)] ?? 0x88) + 0x26);
}
export const EXTERIOR_COLOUR = '#b9bbbd';
export const FENCE_COLOUR = '#6e757b';
export const NEIGHBOUR_COLOUR = '#7d6f66';
export const PARAPET_COLOUR = '#a5a8ab';
export const STAIR_COLOUR = '#a8a196';

function within(r: Rect4, x: number, z: number, m = 0): boolean {
  return x >= r[0] - m && x <= r[2] + m && z >= r[1] - m && z <= r[3] + m;
}

/** The highest ring of the rooms (on the wall's level) whose rect holds the wall's middle. */
export function ringOfWall(arch: KestrelArch, w: ArchWall): Ring {
  const mx = (w.a[0] + w.b[0]) / 2;
  const mz = (w.a[1] + w.b[1]) / 2;
  let best: Ring = 1;
  for (const r of arch.rooms) if (r.level === w.level && within(r.rect, mx, mz, 0.01) && ringRank(r.ring) > ringRank(best)) best = r.ring;
  return best;
}

export interface WallBox {
  c: [number, number, number];
  s: [number, number, number];
  colour: string;
}

function wallColour(arch: KestrelArch, w: ArchWall, lowestBoundary: number): string {
  if (w.kind === 'parapet') return PARAPET_COLOUR;
  if (w.kind === 'boundary') return w.h > lowestBoundary + EPS ? NEIGHBOUR_COLOUR : FENCE_COLOUR;
  if (w.kind === 'exterior') return EXTERIOR_COLOUR;
  return ringWallColour(ringOfWall(arch, w));
}

/**
 * One wall as boxes: along its axis from end to end of its centreline (an outside corner keeps a half-thickness notch: a face at
 * a half-voxel offset in a corner would put the voxel fit check on a coin flip), an opening cut from sill to sill + h
 * (solid under and over it), and the height capped where a higher level is built over the wall (a ground wall inside the
 * first-floor footprint stops at the first floor, so it never stands up through the upper storey).
 */
export function wallBoxes(arch: KestrelArch, w: ArchWall): WallBox[] {
  const lvl = levelOf(arch, w.level);
  const alongX = Math.abs(w.a[1] - w.b[1]) < EPS;
  if (!alongX && Math.abs(w.a[0] - w.b[0]) >= EPS) throw new Error(`kestrel arch: wall ${w.id} is not on the X or Z axis`);
  const ai = alongX ? 0 : 1;
  const ci = alongX ? 1 : 0;
  const line = w.a[ci]!;
  const sign = w.b[ai]! >= w.a[ai]! ? 1 : -1;
  const lo = Math.min(w.a[ai]!, w.b[ai]!);
  const hi = Math.max(w.a[ai]!, w.b[ai]!);
  const gaps = arch.openings
    .filter((o) => o.wall === w.id)
    .map((o) => {
      const c = w.a[ai]! + sign * o.at;
      return { lo: c - o.w / 2, hi: c + o.w / 2, sill: o.sill, top: o.sill + o.h };
    });
  const upper = arch.levels.filter((l) => l.floor > lvl.floor + EPS);
  const marks = new Set<number>([lo, hi]);
  for (const g of gaps) for (const v of [g.lo, g.hi]) if (v > lo && v < hi) marks.add(v);
  for (const u of upper) {
    const fp = levelFootprint(arch, u);
    const across0 = alongX ? fp[1] : fp[0];
    const across1 = alongX ? fp[3] : fp[2];
    if (!(line > across0 + EPS && line < across1 - EPS)) continue;
    for (const v of alongX ? [fp[0], fp[2]] : [fp[1], fp[3]]) if (v > lo && v < hi) marks.add(v);
  }
  const xs = [...marks].sort((p, q) => p - q);
  const out: WallBox[] = [];
  const lowest = arch.walls.filter((q) => q.kind === 'boundary').reduce((m, q) => Math.min(m, q.h), Infinity);
  const colour = wallColour(arch, w, lowest);
  for (let i = 0; i + 1 < xs.length; i++) {
    const p = xs[i]!;
    const q = xs[i + 1]!;
    if (q - p < EPS) continue;
    const m = (p + q) / 2;
    let cap = w.h;
    for (const u of upper) {
      const fp = levelFootprint(arch, u);
      const across0 = alongX ? fp[1] : fp[0];
      const across1 = alongX ? fp[3] : fp[2];
      const along0 = alongX ? fp[0] : fp[1];
      const along1 = alongX ? fp[2] : fp[3];
      if (line > across0 + EPS && line < across1 - EPS && m > along0 && m < along1) cap = Math.min(cap, u.floor - lvl.floor);
    }
    const gap = gaps.find((g) => m > g.lo && m < g.hi);
    const piece = (y0: number, y1: number): void => {
      if (y1 - y0 < EPS) return;
      const len = q - p;
      const cy = lvl.floor + (y0 + y1) / 2;
      const sy = y1 - y0;
      if (alongX) out.push({ c: [m, cy, line], s: [len, sy, w.t], colour });
      else out.push({ c: [line, cy, m], s: [w.t, sy, len], colour });
    };
    if (!gap) piece(0, cap);
    else {
      piece(0, Math.min(gap.sill, cap));
      piece(gap.top, cap);
    }
  }
  return out;
}

export interface FloorTile {
  rect: Rect4;
  top: number;
  ring: Ring;
  room: string;
}

/** The floor of every room on a level, as tiles with the level's voids cut out. */
export function floorTiles(arch: KestrelArch, levelId: string): FloorTile[] {
  const lvl = levelOf(arch, levelId);
  const holes = arch.voids.filter((v) => v.level === levelId).map((v) => v.rect);
  const out: FloorTile[] = [];
  for (const r of arch.rooms) {
    if (r.level !== levelId) continue;
    const [x0, z0, x1, z1] = r.rect;
    const xs = new Set<number>([x0, x1]);
    const zs = new Set<number>([z0, z1]);
    for (const h of holes) {
      for (const x of [h[0], h[2]]) if (x > x0 && x < x1) xs.add(x);
      for (const z of [h[1], h[3]]) if (z > z0 && z < z1) zs.add(z);
    }
    const X = [...xs].sort((p, q) => p - q);
    const Z = [...zs].sort((p, q) => p - q);
    for (let i = 0; i + 1 < X.length; i++) {
      for (let j = 0; j + 1 < Z.length; j++) {
        const mx = (X[i]! + X[i + 1]!) / 2;
        const mz = (Z[j]! + Z[j + 1]!) / 2;
        if (holes.some((h) => mx > h[0] && mx < h[2] && mz > h[1] && mz < h[3])) continue;
        out.push({ rect: [X[i]!, Z[j]!, X[i + 1]!, Z[j + 1]!], top: lvl.floor, ring: r.ring, room: r.id });
      }
    }
  }
  return out;
}

export interface Flight {
  /** Centre of the flight's plan, width across, length along `yaw`. */
  c: [number, number];
  w: number;
  len: number;
  /** Climb direction (0 = +Z, as `LevelBuilder.stairs`). */
  yaw: number;
  /** Height of its low end, rise over its length, and the number of steps (risers). */
  y: number;
  rise: number;
  steps: number;
}
export interface StairLayout {
  flights: Flight[];
  /** Mid landing of a dog-leg: plan rect and top height. */
  landing: { rect: Rect4; top: number } | null;
  /** On flight 1 near its foot (level `from`) and on the last flight near its head (level `to`). */
  foot: [number, number];
  head: [number, number];
}

const DIR: Record<string, [number, number, number]> = { N: [0, 1, 0], S: [0, -1, Math.PI], E: [1, 0, Math.PI / 2], W: [-1, 0, -Math.PI / 2] };

/**
 * A stair as flights. Flights run from the stair rect's edge on the `from` side to the far edge, inset from the walls by half
 * the thinnest wall. A dog-leg (the layout of every stair in the block plan) is two flights side by side, a landing as deep
 * as the stair is wide at the far end; the first flight sits in the column nearer the opening on the `from` level's edge.
 */
export function stairLayout(arch: KestrelArch, s: ArchStair): StairLayout {
  const from = levelOf(arch, s.from);
  const to = levelOf(arch, s.to);
  const [dx, dz, yaw] = DIR[s.up]!;
  const alongZ = dx === 0;
  const half = arch.walls.reduce((m, q) => Math.min(m, q.t), Infinity) / 2;
  const [x0, z0, x1, z1] = s.rect;
  const a0 = alongZ ? z0 : x0;
  const a1 = alongZ ? z1 : x1;
  const c0 = (alongZ ? x0 : z0) + half;
  const c1 = (alongZ ? x1 : z1) - half;
  const dir = alongZ ? dz : dx;
  const u0 = dir > 0 ? a0 : a1;
  const uFar = dir > 0 ? a1 : a0;
  const total = to.floor - from.floor;
  const at = (u: number, c: number): [number, number] => (alongZ ? [c, u] : [u, c]);
  const dog = s.layout === 'dogleg';
  const w = s.width;
  const run = dog ? Math.abs(uFar - u0) - w : Math.abs(uFar - u0);
  const rise = dog ? total / 2 : total;
  const steps = dog ? s.risers / 2 : s.risers;
  const uEnd = u0 + dir * run;
  const mid = (u0 + uEnd) / 2;
  const colLow = c0 + w / 2;
  const colHigh = c1 - w / 2;
  if (!dog) {
    const col = (c0 + c1) / 2;
    return { flights: [{ c: at(mid, col), w, len: run, yaw, y: from.floor, rise, steps }], landing: null, foot: at(u0 + dir * 0.1, col), head: at(uEnd - dir * 0.1, col) };
  }
  // the opening on the start edge decides the column of flight 1
  let first = colLow;
  for (const o of arch.openings) {
    const wall = arch.walls.find((q) => q.id === o.wall);
    if (!wall || wall.level !== s.from) continue;
    const onEdge = alongZ ? Math.abs(wall.a[1] - u0) < EPS && Math.abs(wall.b[1] - u0) < EPS : Math.abs(wall.a[0] - u0) < EPS && Math.abs(wall.b[0] - u0) < EPS;
    if (!onEdge) continue;
    const ai = alongZ ? 0 : 1;
    const centre = wall.a[ai]! + (wall.b[ai]! >= wall.a[ai]! ? 1 : -1) * o.at;
    if (centre > c0 && centre < c1) first = Math.abs(centre - colLow) <= Math.abs(centre - colHigh) ? colLow : colHigh;
  }
  const second = first === colLow ? colHigh : colLow;
  const lRect: Rect4 = alongZ ? [c0, Math.min(uEnd, uFar), c1, Math.max(uEnd, uFar)] : [Math.min(uEnd, uFar), c0, Math.max(uEnd, uFar), c1];
  return {
    flights: [
      { c: at(mid, first), w, len: run, yaw, y: from.floor, rise, steps },
      { c: at(mid, second), w, len: run, yaw: yaw + Math.PI, y: from.floor + rise, rise, steps },
    ],
    landing: { rect: lRect, top: from.floor + rise },
    foot: at(u0 + dir * 0.1, first),
    head: at(u0 + dir * 0.1, second),
  };
}

export interface DebugSpot {
  room: string;
  level: string;
  x: number;
  y: number;
  z: number;
}

function inflate(r: Rect4, m: number): Rect4 {
  return [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
}

/**
 * One spot per room to stand on: the rect centre, else the free spot nearest it (clear of the level's voids and of the stairs
 * that start or end on the level), else the stair foot / head for a room the stair fills. A room the voids fill with no stair
 * in it (a lift shaft) has none.
 */
export function debugSpots(arch: KestrelArch): DebugSpot[] {
  const out: DebugSpot[] = [];
  for (const r of arch.rooms) {
    const lvl = levelOf(arch, r.level);
    const holes = arch.voids.filter((v) => v.level === r.level).map((v) => v.rect);
    const stairs = arch.stairs.filter((s) => s.from === r.level || s.to === r.level);
    const free = (x: number, z: number): boolean => !holes.some((h) => within(inflate(h, 0.4), x, z)) && !stairs.some((s) => within(inflate(s.rect, 0.4), x, z));
    const [x0, z0, x1, z1] = r.rect;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    let best: [number, number] | null = free(cx, cz) ? [cx, cz] : null;
    if (!best) {
      const m = Math.min(0.5, Math.min(x1 - x0, z1 - z0) / 4);
      let d2 = Infinity;
      for (let x = x0 + m; x <= x1 - m + EPS; x += 0.5) {
        for (let z = z0 + m; z <= z1 - m + EPS; z += 0.5) {
          const d = (x - cx) ** 2 + (z - cz) ** 2;
          if (d < d2 && free(x, z)) {
            d2 = d;
            best = [x, z];
          }
        }
      }
    }
    if (!best) {
      const s = stairs.find((q) => within(inflate(q.rect, 0.01), cx, cz));
      if (s) {
        const lay = stairLayout(arch, s);
        best = r.level === s.from ? lay.foot : lay.head;
      }
    }
    if (best) out.push({ room: r.id, level: r.level, x: best[0], y: lvl.floor, z: best[1] });
  }
  return out;
}
