/**
 * (campus-fence-s2s5) Saltmarsh Park perimeter checks shared by the S1 fence test (`campusV2S1Fence.test.ts`) and the
 * whole-campus one (`campusV2Perimeter.test.ts`), Babylon-free, from the built collision pieces:
 *  - `collisionPieces`: the collision boxes as plain axis-aligned boxes (quarter-turn walls swapped; glass stops bodies
 *    too), plus every locked, unbreachable door shut in its gap (the player can never open it);
 *  - `groundFlood`: a fine ground flood (the body's radius, the controller's step) from seed points;
 *  - `perimeterLaunches`: every way a player gets over a perimeter line from a top they can reach. Reach is a fixpoint
 *    from the floors the nav seeds and ladders stand on, over the moves the traversal makes: a mantle (`MANTLE` up, the
 *    probe's 1.3 m reach, room on top and the probe's chest-high line clear, `Traversal.probe`), a lip grab on a piece
 *    that is not `noLedge`, a step, and a running jump or a walk-off (`LEAP`, gravity, no fall damage) that is clear of
 *    everything until it comes down on the target. A launch is a mantle that puts the body past the line, or a jump /
 *    walk-off that is clear until past it.
 * The model over-approximates (a top counts as reachable when one such move reaches it; the jump runs straight at the
 * target at four paces), so a clean result is the claim the tests make.
 */
import type { BoxPiece, LevelBuilder } from '../../src/world/levelBuilder';
import type { Door } from '../../src/world/anchors';
import { LEAP, MOVEMENT } from '../../src/config/movement';
import { GRAVITY } from '../../src/physics/havok';
import { hyp2 } from '../../src/core/mathx';
import { MANTLE } from './soloJumpReach';

/** A collision box with its index in `b.boxes` (or the door it stands for). */
export interface Piece extends BoxPiece {
  id: string;
}

export const lo = (p: BoxPiece, k: 0 | 2): number => p.c[k] - p.s[k] / 2;
export const hi = (p: BoxPiece, k: 0 | 2): number => p.c[k] + p.s[k] / 2;
export const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
export const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
export const covers = (p: BoxPiece, x: number, z: number, e = 0): boolean => x >= lo(p, 0) - e && x <= hi(p, 0) + e && z >= lo(p, 2) - e && z <= hi(p, 2) + e;
export const rectDist = (p: BoxPiece, x: number, z: number): number => hyp2(Math.max(lo(p, 0) - x, 0, x - hi(p, 0)), Math.max(lo(p, 2) - z, 0, z - hi(p, 2)));
const gap = (a: BoxPiece, b: BoxPiece): number => hyp2(Math.max(lo(a, 0) - hi(b, 0), 0, lo(b, 0) - hi(a, 0)), Math.max(lo(a, 2) - hi(b, 2), 0, lo(b, 2) - hi(a, 2)));

const R = MOVEMENT.radius;
const STAND = MOVEMENT.standHeight;
const CROUCH = MOVEMENT.crouchHeight;
/** The traversal probe's forward reach (m, `Traversal.probe`). */
export const PROBE_REACH = 1.3;
/** A lip a player can get to from the floor under it: the wall jump's top (`WALL_JUMP.maxUp`). */
const GRAB = 3.8;
const G = -GRAVITY.y;

/** The collision pieces as plain axis-aligned boxes, plus every locked, unbreachable door shut in its gap. */
export function collisionPieces(b: LevelBuilder): Piece[] {
  const out: Piece[] = [];
  b.boxes.forEach((p, i) => {
    if (!p.collide || Math.abs(p.pitch) > 1e-3) return;
    const q = Math.abs(Math.sin(p.yaw));
    if (q < 1e-3) out.push({ ...p, id: `#${i}` });
    else if (Math.abs(q - 1) < 1e-3) out.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0, id: `#${i}` });
  });
  for (const a of b.anchors.doors as Door[]) {
    if (!a.locked || a.breachable) continue;
    const ax = Math.sin(a.yaw);
    const az = Math.cos(a.yaw);
    const cx = a.hinge.x + (ax * a.width) / 2;
    const cz = a.hinge.z + (az * a.width) / 2;
    out.push({ c: [cx, a.hinge.y + a.height / 2, cz], s: [Math.abs(ax) * a.width + 0.3 * Math.abs(az), a.height, Math.abs(az) * a.width + 0.3 * Math.abs(ax)], yaw: 0, pitch: 0, color: '', collide: true, noLedge: true, id: `door (${cx.toFixed(1)}, ${cz.toFixed(1)})` });
  }
  return out;
}

/** 2 m plan buckets of pieces (each within 1 m of its bucket). */
export class PieceGrid {
  private readonly x0 = -90;
  private readonly z0 = -100;
  private readonly n = 100;
  private readonly cells: Piece[][];
  constructor(pieces: readonly Piece[]) {
    this.cells = Array.from({ length: this.n * this.n }, () => []);
    for (const p of pieces) {
      for (let i = this.ix(lo(p, 0) - 1); i <= this.ix(hi(p, 0) + 1); i++) for (let k = this.ix(lo(p, 2) - 1, this.z0); k <= this.ix(hi(p, 2) + 1, this.z0); k++) this.cells[k * this.n + i]!.push(p);
    }
  }
  private ix(v: number, o = this.x0): number {
    return Math.max(0, Math.min(this.n - 1, Math.floor((v - o) / 2)));
  }
  /** The pieces near (x, z). */
  at(x: number, z: number): readonly Piece[] {
    return this.cells[this.ix(z, this.z0) * this.n + this.ix(x)]!;
  }
}

/**
 * A ground flood at `cell` m from `seeds` over [x0, x1] x [z0, z1]: the pieces over the step and under the head stop the
 * body (radius), as do the colliding cylinders. Returns the cells reached and those `inside` says are out (a cell out
 * is not flooded on from).
 */
export function groundFlood(
  b: LevelBuilder,
  pieces: readonly Piece[],
  o: { x0: number; x1: number; z0: number; z1: number; cell: number; seeds: readonly (readonly [number, number])[]; inside: (x: number, z: number) => boolean },
): { count: number; outside: string[] } {
  const { x0, z0, cell: c } = o;
  const nx = Math.round((o.x1 - x0) / c);
  const nz = Math.round((o.z1 - z0) / c);
  const grid = new PieceGrid(pieces.filter((p) => !p.overhead && bottom(p) < STAND && top(p) > MOVEMENT.maxStep));
  const cyl = b.cylinders.filter((q) => q.collide && q.c[1] - q.h / 2 < STAND && q.c[1] + q.h / 2 > MOVEMENT.maxStep);
  const free = (x: number, z: number): boolean => {
    for (const p of grid.at(x, z)) if (rectDist(p, x, z) < R - 0.02) return false;
    for (const q of cyl) if (hyp2(x - q.c[0], z - q.c[2]) < q.r + R - 0.02) return false;
    return true;
  };
  const seen = new Uint8Array(nx * nz);
  const stack: number[] = [];
  for (const [x, z] of o.seeds) {
    const id = Math.floor((z - z0) / c) * nx + Math.floor((x - x0) / c);
    if (!seen[id]) {
      seen[id] = 1;
      stack.push(id);
    }
  }
  const outside: string[] = [];
  let count = 0;
  while (stack.length) {
    const id = stack.pop()!;
    count++;
    const i = id % nx;
    const k = (id - i) / nx;
    const x = x0 + (i + 0.5) * c;
    const z = z0 + (k + 0.5) * c;
    if (!o.inside(x, z)) {
      outside.push(`(${x.toFixed(2)}, ${z.toFixed(2)})`);
      continue;
    }
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const ii = i + di;
      const kk = k + dk;
      if (ii < 0 || kk < 0 || ii >= nx || kk >= nz) continue;
      const j = kk * nx + ii;
      if (seen[j]) continue;
      seen[j] = 1;
      if (free(x0 + (ii + 0.5) * c, z0 + (kk + 0.5) * c)) stack.push(j);
    }
  }
  return { count, outside };
}

/** A perimeter line: a -> b (one axis fixed), `out` the unit normal out of the playable area. */
export interface PerimeterLine {
  id: string;
  a: readonly [number, number];
  b: readonly [number, number];
  out: readonly [number, number];
}

interface Spot {
  x: number;
  z: number;
}
interface Top {
  p: Piece;
  t: number;
  spots: Spot[];
}

/**
 * Every launch over a perimeter line from a top a player reaches (see the file comment). `inside(x, z, y)` is the
 * playable area (a stand spot must be in it); `seeds` the floors the nav seeds stand on (x, y, z); `ladderTops` the
 * ladders' tops.
 */
export function perimeterLaunches(
  pieces: readonly Piece[],
  o: { lines: readonly PerimeterLine[]; inside: (x: number, z: number, y: number) => boolean; seeds: readonly (readonly [number, number, number])[]; ladderTops: readonly (readonly [number, number, number])[] },
): string[] {
  const grid = new PieceGrid(pieces);
  const freeAt = (p: Piece | null, t: number, x: number, z: number): boolean => {
    for (const q of grid.at(x, z)) if (q !== p && covers(q, x, z, 0.1) && bottom(q) < t + CROUCH && top(q) > t + 0.05) return false;
    return true;
  };
  /** The top of the obstacle stack at (x, z) that overlaps [y0, y1] (pieces stacked with less than a crouch between), or -1. */
  const stackAt = (skip: readonly (Piece | null)[], x: number, z: number, y0: number, y1: number): number => {
    let st = -1;
    const here = grid.at(x, z).filter((q) => !skip.includes(q) && covers(q, x, z));
    for (const q of here) if (top(q) > y0 && bottom(q) < y1 && top(q) > st) st = top(q);
    if (st < 0) return -1;
    for (let grew = true; grew; ) {
      grew = false;
      for (const q of here) {
        if (bottom(q) <= st + CROUCH && top(q) > st) {
          st = top(q);
          grew = true;
        }
      }
    }
    return st;
  };
  // the standable tops: a stand spot (0.25 m lattice, 0.15 in from the edges) in the playable area with crouch room
  const tops: Top[] = [];
  for (const p of pieces) {
    const t = top(p);
    if (t < 0.3 || Math.min(p.s[0], p.s[2]) < 0.25 || p.s[0] > 100) continue;
    const spots: Spot[] = [];
    const nx = Math.max(1, Math.ceil((p.s[0] - 0.3) / 0.25));
    const nz = Math.max(1, Math.ceil((p.s[2] - 0.3) / 0.25));
    for (let i = 0; i <= nx; i++) {
      for (let k = 0; k <= nz; k++) {
        const x = p.s[0] <= 0.3 ? p.c[0] : lo(p, 0) + 0.15 + ((p.s[0] - 0.3) * i) / nx;
        const z = p.s[2] <= 0.3 ? p.c[2] : lo(p, 2) + 0.15 + ((p.s[2] - 0.3) * k) / nz;
        if (o.inside(x, z, t) && freeAt(p, t, x, z)) spots.push({ x, z });
      }
    }
    if (spots.length) tops.push({ p, t, spots });
  }
  const nearest = (a: Top, x: number, z: number): Spot => {
    let best = a.spots[0]!;
    let bd = Infinity;
    for (const s of a.spots) {
      const d = hyp2(s.x - x, s.z - z);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  };
  /** A mantle off `q` on `from` (height t) along (dx, dz): the obstacle's top and where the body ends, or null. */
  const mantle = (from: Piece | null, t: number, q: Spot, dx: number, dz: number): { s: number; st: number; mx: number; mz: number } | null => {
    for (let s = 0.05; s <= PROBE_REACH; s += 0.05) {
      const px = q.x + dx * s;
      const pz = q.z + dz * s;
      // the probe's forward rays (0.25-1.4 over the feet) hit something here
      if (!grid.at(px, pz).some((r) => r !== from && covers(r, px, pz) && bottom(r) < t + 1.4 && top(r) > t + 0.25)) continue;
      const st = stackAt([from], px, pz, t + 0.2, t + STAND);
      if (st - t > MANTLE) return null;
      // standing room where the body ends, and the probe's line at the top + 0.5 clear up to there
      const mx = q.x + dx * (s + 0.4);
      const mz = q.z + dz * (s + 0.4);
      if (grid.at(mx, mz).some((r) => r !== from && covers(r, mx, mz) && bottom(r) < st + STAND && top(r) > st + 0.05)) return null;
      for (let u = 0; u <= s + 0.4; u += 0.05) {
        const hx = q.x + dx * u;
        const hz = q.z + dz * u;
        if (grid.at(hx, hz).some((r) => r !== from && covers(r, hx, hz) && bottom(r) < st + 0.5 && top(r) > st + 0.5)) return null;
      }
      return { s, st, mx, mz };
    }
    return null;
  };
  /** A run off `q` (height t) along (dx, dz), jumping or walking off at four paces: clear of everything (but `skip`) and
   *  still at `yMin` or over when it has gone `dist`. */
  const runClear = (skip: readonly (Piece | null)[], t: number, q: Spot, dx: number, dz: number, dist: number, yMin: number): boolean => {
    for (const v of [LEAP.maxSpeed, 3, 1.5, 0.6]) {
      for (const vy of [LEAP.vy, 0]) {
        let ok = true;
        for (let s = 0; s <= dist && ok; s += 0.05) {
          const tt = Math.max(0, s - 0.15) / v;
          const y = t + vy * tt - (G * tt * tt) / 2;
          if (y < yMin || stackAt(skip, q.x + dx * s, q.z + dz * s, y + 0.02, y + CROUCH) >= 0) ok = false;
        }
        if (ok) return true;
      }
    }
    return false;
  };
  /** One move from `a` (null: the floor of the playable area) onto `b`. */
  const canMove = (a: Top | null, b: Top): boolean => {
    if (!a) {
      // off the floor: a mantle or a lip from a floor spot just off each of b's sides
      for (const s of b.spots) {
        for (const [x, z] of [[lo(b.p, 0) - 0.45, s.z], [hi(b.p, 0) + 0.45, s.z], [s.x, lo(b.p, 2) - 0.45], [s.x, hi(b.p, 2) + 0.45]] as const) {
          if (!o.inside(x, z, 0) || !freeAt(null, 0, x, z) || stackAt([], x, z, 0.05, STAND) >= 0) continue;
          const d = hyp2(s.x - x, s.z - z);
          const m = mantle(null, 0, { x, z }, (s.x - x) / d, (s.z - z) / d);
          if (m && Math.abs(m.st - b.t) < 0.06) return true;
          if (!b.p.noLedge && b.t <= GRAB) return true;
        }
      }
      return false;
    }
    const pairs = b.spots.map((s) => [nearest(a, s.x, s.z), s] as const);
    pairs.sort((u, w) => hyp2(u[0].x - u[1].x, u[0].z - u[1].z) - hyp2(w[0].x - w[1].x, w[0].z - w[1].z));
    for (const [qa, qb] of pairs.slice(0, 4)) {
      const d = hyp2(qb.x - qa.x, qb.z - qa.z);
      if (d < 1e-6) {
        if (Math.abs(a.t - b.t) < MOVEMENT.maxStep) return true;
        continue;
      }
      const dx = (qb.x - qa.x) / d;
      const dz = (qb.z - qa.z) / d;
      if (b.t > a.t + MOVEMENT.maxStep) {
        if (d > PROBE_REACH + 0.6) continue;
        const m = mantle(a.p, a.t, qa, dx, dz);
        if (m && Math.abs(m.st - b.t) < 0.06) return true;
        if (!b.p.noLedge && b.t - a.t <= GRAB && d <= 1.2) return true;
        continue;
      }
      if (d <= 6 && runClear([a.p, b.p], a.t, qa, dx, dz, d, b.t - 0.02)) return true;
    }
    return false;
  };
  // reach: the nav seeds' floors and the ladders' tops, then the floor, then every move on
  const reached = new Map<Top, string>();
  const queue: Top[] = [];
  const add = (b: Top, why: string): void => {
    reached.set(b, why);
    queue.push(b);
  };
  for (const a of tops) {
    if (o.ladderTops.some(([x, y, z]) => Math.abs(y - a.t) < 0.15 && rectDist(a.p, x, z) < 0.8)) add(a, 'a ladder top');
    else if (o.seeds.some(([x, y, z]) => Math.abs(y - a.t) < 0.15 && covers(a.p, x, z))) add(a, 'a nav seed');
  }
  for (const a of tops) if (!reached.has(a) && a.t <= GRAB && canMove(null, a)) add(a, 'the floor');
  const near = tops.map((a) => tops.filter((b) => b !== a && gap(a.p, b.p) <= 6));
  const index = new Map(tops.map((a, i) => [a, i] as const));
  while (queue.length) {
    const a = queue.shift()!;
    for (const b of near[index.get(a)!]!) {
      if (reached.has(b) || (b.t > a.t + MOVEMENT.maxStep && gap(a.p, b.p) > PROBE_REACH + 0.6)) continue;
      if (canMove(a, b)) add(b, `from ${a.p.id} (top ${a.t.toFixed(2)})`);
    }
  }
  // launches over each line, from each reached top within 6 m of a line point
  const out = new Map<string, string>();
  for (const L of o.lines) {
    const n = Math.max(1, Math.round(hyp2(L.b[0] - L.a[0], L.b[1] - L.a[1]) / 0.1));
    for (let i = 0; i <= n; i++) {
      const x = L.a[0] + ((L.b[0] - L.a[0]) * i) / n;
      const z = L.a[1] + ((L.b[1] - L.a[1]) * i) / n;
      const ex = x + L.out[0] * 0.4;
      const ez = z + L.out[1] * 0.4;
      for (const [a, why] of reached) {
        if (rectDist(a.p, x, z) > 6 || o.inside(ex, ez, a.t) || covers(a.p, ex, ez, 0.01)) continue;
        const q = nearest(a, x, z);
        const d = hyp2(ex - q.x, ez - q.z);
        if (d < 1e-6) continue;
        const dx = (ex - q.x) / d;
        const dz = (ez - q.z) / d;
        let kind = '';
        const m = mantle(a.p, a.t, q, dx, dz);
        if (m && m.s + 0.4 > (x - q.x) * dx + (z - q.z) * dz && !o.inside(m.mx, m.mz, m.st)) kind = `a mantle onto ${m.st.toFixed(2)}`;
        else if (d <= 6 && runClear([a.p], a.t, q, dx, dz, d, -0.5)) kind = 'a jump or walk-off';
        if (!kind) continue;
        const key = `${L.id}|${a.p.id}|${kind.slice(0, 3)}`;
        if (!out.has(key)) out.set(key, `${L.id}: ${kind} off ${a.p.id} (top ${a.t.toFixed(2)}, x ${lo(a.p, 0).toFixed(2)}..${hi(a.p, 0).toFixed(2)}, z ${lo(a.p, 2).toFixed(2)}..${hi(a.p, 2).toFixed(2)}; reached ${why}) from (${q.x.toFixed(2)}, ${q.z.toFixed(2)}) over (${x.toFixed(1)}, ${z.toFixed(1)})`);
      }
      // off the floor of the playable area, straight at the line
      const gx = x - L.out[0] * 0.45;
      const gz = z - L.out[1] * 0.45;
      if (!o.inside(ex, ez, 0) && o.inside(gx, gz, 0) && freeAt(null, 0, gx, gz) && stackAt([], gx, gz, 0.05, STAND) < 0) {
        const m = mantle(null, 0, { x: gx, z: gz }, L.out[0], L.out[1]);
        if (m && m.s + 0.4 > 0.45 && !o.inside(m.mx, m.mz, m.st) && !out.has(`${L.id}|floor`)) out.set(`${L.id}|floor`, `${L.id}: a mantle onto ${m.st.toFixed(2)} off the floor at (${gx.toFixed(1)}, ${gz.toFixed(1)})`);
      }
    }
  }
  return [...out.values()];
}
