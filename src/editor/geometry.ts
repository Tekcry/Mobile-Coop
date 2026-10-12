/**
 * Pure geometry for the level editor: wall pieces around openings, snapping, wall projection, room lookup and the
 * walk-mode collision. Babylon-free (tests/editor/geometry.test.ts).
 */
import facts from '../../scripts/kestrel/facts.json';
import { hyp2 } from '../core/mathx';
import type { Campus, Opening, Pt, Rect, Room, Wall } from './types';

export const EPS = 1e-6;

/** Rounds to `g` and strips float noise (0.30000000000000004 -> 0.3). */
export function snap(v: number, g: number): number {
  return g > 0 ? +(Math.round(v / g) * g).toFixed(3) : +v.toFixed(3);
}

export const wallLen = (w: Wall): number => hyp2(w.b[0] - w.a[0], w.b[1] - w.a[1]);

/** Unit direction a -> b. */
export function wallDir(w: Wall): Pt {
  const L = wallLen(w);
  return L > EPS ? [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L] : [1, 0];
}

export function wallPoint(w: Wall, s: number): Pt {
  const d = wallDir(w);
  return [w.a[0] + d[0] * s, w.a[1] + d[1] * s];
}

/** A solid box of a wall: from s0 to s1 along it, y0 to y1 above its level's floor. */
export interface Piece {
  s0: number;
  s1: number;
  y0: number;
  y1: number;
}

/** The solid parts of a wall once its openings are cut: full-height runs between openings, a sill below and a lintel above each. */
export function wallPieces(w: Wall, openings: readonly Opening[]): Piece[] {
  const L = wallLen(w);
  const ops = openings.filter((o) => o.wall === w.id).sort((p, q) => p.at - q.at);
  const out: Piece[] = [];
  let cur = 0;
  for (const o of ops) {
    const s0 = Math.max(0, o.at - o.w / 2);
    const s1 = Math.min(L, o.at + o.w / 2);
    if (s1 <= s0 + EPS) continue;
    if (s0 > cur + EPS) out.push({ s0: cur, s1: s0, y0: 0, y1: w.h });
    const a = Math.max(s0, cur);
    if (s1 > a + EPS) {
      if (o.sill > EPS) out.push({ s0: a, s1, y0: 0, y1: Math.min(o.sill, w.h) });
      const top = o.sill + o.h;
      if (top < w.h - EPS) out.push({ s0: a, s1, y0: top, y1: w.h });
    }
    cur = Math.max(cur, s1);
  }
  if (cur < L - EPS) out.push({ s0: cur, s1: L, y0: 0, y1: w.h });
  return out;
}

/** Distance along the wall (clamped to it) of the point nearest (x, z), and how far (x, z) is from the wall line. */
export function projectOnWall(w: Wall, x: number, z: number): { s: number; dist: number } {
  const d = wallDir(w);
  const L = wallLen(w);
  const s = Math.max(0, Math.min(L, (x - w.a[0]) * d[0] + (z - w.a[1]) * d[1]));
  const p = wallPoint(w, s);
  return { s, dist: hyp2(x - p[0], z - p[1]) };
}

/** The wall on `level` nearest (x, z) within `maxDist`, or null. */
export function nearestWall(walls: readonly Wall[], level: string, x: number, z: number, maxDist: number): Wall | null {
  let best: Wall | null = null;
  let bestD = maxDist;
  for (const w of walls) {
    if (w.level !== level) continue;
    const { dist } = projectOnWall(w, x, z);
    if (dist <= bestD) {
      bestD = dist;
      best = w;
    }
  }
  return best;
}

export const inRect = (r: Rect, x: number, z: number): boolean => x >= r[0] - EPS && x <= r[2] + EPS && z >= r[1] - EPS && z <= r[3] + EPS;
export const rectArea = (r: Rect): number => (r[2] - r[0]) * (r[3] - r[1]);

/** The smallest room on `level` containing (x, z). */
export function roomAt(rooms: readonly Room[], level: string, x: number, z: number): Room | null {
  let best: Room | null = null;
  for (const r of rooms) if (r.level === level && inRect(r.rect, x, z) && (!best || rectArea(r.rect) < rectArea(best.rect))) best = r;
  return best;
}

/** The rooms either side of a point on a wall: [left of a -> b, right of a -> b] (ids, '' when none). */
export function roomsEitherSide(w: Wall, s: number, rooms: readonly Room[]): [string, string] {
  const d = wallDir(w);
  const p = wallPoint(w, s);
  const off = w.t / 2 + 0.2;
  const left = roomAt(rooms, w.level, p[0] - d[1] * off, p[1] + d[0] * off);
  const right = roomAt(rooms, w.level, p[0] + d[1] * off, p[1] - d[0] * off);
  return [left?.id ?? '', right?.id ?? ''];
}

/** [x0, z0, x1, z1] with x0 <= x1 and z0 <= z1. */
export function normRect(r: Rect): Rect {
  return [Math.min(r[0], r[2]), Math.min(r[1], r[3]), Math.max(r[0], r[2]), Math.max(r[1], r[3])];
}

export type Edge = 'W' | 'S' | 'E' | 'N';

/** Moves one edge of a rect to `v`, keeping at least `min` metres between opposite edges. */
export function setEdge(r: Rect, edge: Edge, v: number, min: number): Rect {
  const o: Rect = [r[0], r[1], r[2], r[3]];
  if (edge === 'W') o[0] = Math.min(v, r[2] - min);
  else if (edge === 'E') o[2] = Math.max(v, r[0] + min);
  else if (edge === 'S') o[1] = Math.min(v, r[3] - min);
  else o[3] = Math.max(v, r[1] + min);
  return o;
}

/** A wall piece as a box in plan: centre, unit direction, half length and half thickness. */
export interface Obb {
  cx: number;
  cz: number;
  ux: number;
  uz: number;
  hl: number;
  ht: number;
}

export function pieceObb(w: Wall, p: Piece): Obb {
  const d = wallDir(w);
  const m = wallPoint(w, (p.s0 + p.s1) / 2);
  return { cx: m[0], cz: m[1], ux: d[0], uz: d[1], hl: (p.s1 - p.s0) / 2, ht: w.t / 2 };
}

/**
 * Walk-mode collision: pushes a circle at (x, z) of radius r out of every box, twice over. Returns the corrected
 * position (a new pair; the editor's walk loop is not a game hot path).
 */
export function collide(x: number, z: number, r: number, boxes: readonly Obb[]): Pt {
  let px = x;
  let pz = z;
  for (let pass = 0; pass < 2; pass++) {
    for (const b of boxes) {
      const dx = px - b.cx;
      const dz = pz - b.cz;
      const along = dx * b.ux + dz * b.uz;
      const across = -dx * b.uz + dz * b.ux;
      const ca = Math.max(-b.hl, Math.min(b.hl, along));
      const cc = Math.max(-b.ht, Math.min(b.ht, across));
      const ex = along - ca;
      const ez = across - cc;
      const dist = hyp2(ex, ez);
      if (dist >= r) continue;
      let na: number;
      let nc: number;
      let push: number;
      if (dist > EPS) {
        na = ex / dist;
        nc = ez / dist;
        push = r - dist;
      } else {
        // centre inside the box: leave by the nearest face
        const fa = b.hl - Math.abs(along);
        const fc = b.ht - Math.abs(across);
        if (fa < fc) {
          na = along < 0 ? -1 : 1;
          nc = 0;
          push = fa + r;
        } else {
          na = 0;
          nc = across < 0 ? -1 : 1;
          push = fc + r;
        }
      }
      px += (na * b.ux - nc * b.uz) * push;
      pz += (na * b.uz + nc * b.ux) * push;
    }
  }
  return [px, pz];
}

/** Compass words for a move: "2 m east, 0.5 m north". */
export function moveWords(dx: number, dz: number): string {
  const parts: string[] = [];
  if (Math.abs(dx) > EPS) parts.push(`${fmt(Math.abs(dx))} m ${dx > 0 ? 'east' : 'west'}`);
  if (Math.abs(dz) > EPS) parts.push(`${fmt(Math.abs(dz))} m ${dz > 0 ? 'north' : 'south'}`);
  return parts.join(', ') || 'nowhere';
}

export const fmt = (n: number): string => (Math.round(n * 100) / 100).toString();

// ---------- wall corners and gaps (ON0b decisions 6 and 7) ----------
/** A wall end within this of another wall meets it; a near miss up to GAP_MAX is a Gap (scripts/kestrel/facts.json). */
export const JOIN_TOL = facts.rules.wallJoinTol.value;
export const GAP_MAX = facts.rules.wallGapMax.value;
/** Each joining end grows by this share of the other wall's thickness (0.5: to its far face, so corners are square). */
export const WALL_EXTEND = facts.render.wallExtend.value;

/** How far each end of a wall is drawn past its centre-line end, and whether an end runs on into a wall on the same line. */
export interface WallJoin {
  a: number;
  b: number;
  /** The end continues into a wall on the same line (drawn as one wall: no extension, no seam outline). */
  seamA: boolean;
  seamB: boolean;
}

const cross = (u: Pt, v: Pt): number => u[0] * v[1] - u[1] * v[0];

/** The join at one end of w: `out` points away from the wall at that end. */
function endJoin(w: Wall, e: Pt, out: Pt, others: readonly Wall[]): { ext: number; seam: boolean } {
  const d = wallDir(w);
  let ext = 0;
  let seam = false;
  for (const q of others) {
    if (q === w || q.level !== w.level || wallLen(q) < EPS) continue;
    if (projectOnWall(q, e[0], e[1]).dist > JOIN_TOL) continue;
    if (Math.abs(cross(d, wallDir(q))) < 1e-6) {
      // same line: a continuation past this end joins seamlessly; one lying back along this wall changes nothing
      const beyond = Math.max((q.a[0] - e[0]) * out[0] + (q.a[1] - e[1]) * out[1], (q.b[0] - e[0]) * out[0] + (q.b[1] - e[1]) * out[1]);
      if (beyond > JOIN_TOL) seam = true;
      continue;
    }
    ext = Math.max(ext, WALL_EXTEND * q.t);
  }
  return { ext: seam ? 0 : ext, seam };
}

/**
 * Corner joins for every wall (ON0b decision 6): an end that meets another wall (end to end, or on its line) is drawn
 * WALL_EXTEND x that wall's thickness longer, so outside corners are square and T-joins reach the far face; an end that
 * runs on into a wall on the same line is not extended (the two draw as one); a free end stays as drawn. The data is
 * not changed. Walls with no join are left out of the map.
 */
export function wallJoins(walls: readonly Wall[]): Map<string, WallJoin> {
  const out = new Map<string, WallJoin>();
  const byLevel = new Map<string, Wall[]>();
  for (const w of walls) byLevel.set(w.level, [...(byLevel.get(w.level) ?? []), w]);
  for (const w of walls) {
    if (wallLen(w) < EPS) continue;
    const d = wallDir(w);
    const same = byLevel.get(w.level) ?? [];
    const ja = endJoin(w, w.a, [-d[0], -d[1]], same);
    const jb = endJoin(w, w.b, d, same);
    if (ja.ext || jb.ext || ja.seam || jb.seam) out.set(w.id, { a: ja.ext, b: jb.ext, seamA: ja.seam, seamB: jb.seam });
  }
  return out;
}

/** Wall pieces with the end pieces grown by the join (s runs from -j.a to L + j.b). */
export function joinPieces(pieces: readonly Piece[], L: number, j: WallJoin | undefined): Piece[] {
  if (!j || (!j.a && !j.b)) return pieces.slice();
  return pieces.map((p) => ({ ...p, s0: p.s0 <= EPS ? -j.a : p.s0, s1: p.s1 >= L - EPS ? L + j.b : p.s1 }));
}

/**
 * The campus as the walk test builds it (ON0b): each wall grown by its joins, its openings' `at` moved with the a end.
 * A copy; the file's centre lines stay as they are.
 */
export function joinedCampus<C extends Pick<Campus, 'walls' | 'openings'>>(c: C): C {
  const joins = wallJoins(c.walls);
  const walls = c.walls.map((w) => {
    const j = joins.get(w.id);
    if (!j || (!j.a && !j.b)) return w;
    const d = wallDir(w);
    const r = (v: number): number => +v.toFixed(4);
    return { ...w, a: [r(w.a[0] - d[0] * j.a), r(w.a[1] - d[1] * j.a)] as Pt, b: [r(w.b[0] + d[0] * j.b), r(w.b[1] + d[1] * j.b)] as Pt };
  });
  const openings = c.openings.map((o) => {
    const ja = joins.get(o.wall)?.a ?? 0;
    return ja ? { ...o, at: +(o.at + ja).toFixed(4) } : o;
  });
  return { ...c, walls, openings };
}

/** A wall end that nearly meets another wall (within GAP_MAX, not within JOIN_TOL). */
export interface WallGap {
  wall: string;
  end: 'a' | 'b';
  other: string;
  level: string;
  /** Gap, metres. */
  dist: number;
  at: Pt;
  /** Where the end would close the gap: the other wall's end when that is near, else the nearest point on it. */
  to: Pt;
}

/** Every near-miss wall end (ON0b decision 7), largest first; `once`: an end-to-end pair is listed once (the checks), else both ends (Close gap on either wall). */
export function wallGaps(walls: readonly Wall[], once = true): WallGap[] {
  const out: WallGap[] = [];
  const seen = new Set<string>();
  const key = (p: Pt): string => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  for (const w of walls) {
    if (wallLen(w) < EPS) continue;
    const same = walls.filter((q) => q !== w && q.level === w.level && wallLen(q) >= EPS);
    for (const end of ['a', 'b'] as const) {
      const e = w[end];
      if (same.some((q) => projectOnWall(q, e[0], e[1]).dist <= JOIN_TOL)) continue;
      let best: WallGap | null = null;
      for (const q of same) {
        const pr = projectOnWall(q, e[0], e[1]);
        if (pr.dist >= GAP_MAX) continue;
        const ends = [q.a, q.b].map((p) => ({ p, d: hyp2(p[0] - e[0], p[1] - e[1]) })).sort((x, y) => x.d - y.d);
        const near = ends[0]!;
        const to: Pt = near.d < GAP_MAX ? [near.p[0], near.p[1]] : wallPoint(q, pr.s);
        const dist = near.d < GAP_MAX ? near.d : pr.dist;
        if (!best || dist < best.dist) best = { wall: w.id, end, other: q.id, level: w.level, dist: +dist.toFixed(3), at: [e[0], e[1]], to: [+to[0].toFixed(4), +to[1].toFixed(4)] };
      }
      if (!best) continue;
      const k = [key(best.at), key(best.to)].sort().join('|');
      if (once && seen.has(k)) continue;
      seen.add(k);
      out.push(best);
    }
  }
  return out.sort((p, q) => q.dist - p.dist);
}

/** Words for a gap: "Gap 0.04 m: W12 end b to W13". */
export const gapWords = (g: WallGap): string => `Gap ${fmt(g.dist)} m: ${g.wall} end ${g.end} to ${g.other}`;

/**
 * The wall with its gap closed (decision 7's one-click fix): the end moves onto `to`. A wall along x or z stays along
 * it: the end moves along the wall, and when that alone leaves it off the other wall, the whole wall shifts across.
 */
export function closeGap(w: Wall, g: WallGap, other?: Wall): Wall {
  const e = w[g.end];
  const alongX = Math.abs(w.a[1] - w.b[1]) < EPS;
  const alongZ = Math.abs(w.a[0] - w.b[0]) < EPS;
  const out = { ...w, a: [...w.a] as Pt, b: [...w.b] as Pt };
  if (!alongX && !alongZ) {
    out[g.end] = [g.to[0], g.to[1]];
    return out;
  }
  const ai = alongX ? 0 : 1;
  const ci = alongX ? 1 : 0;
  out[g.end][ai] = g.to[ai];
  const off = g.to[ci] - e[ci];
  const on = other ? projectOnWall(other, out[g.end][0], out[g.end][1]).dist <= JOIN_TOL : hyp2(out[g.end][0] - g.to[0], out[g.end][1] - g.to[1]) <= JOIN_TOL;
  if (Math.abs(off) > JOIN_TOL && !on) {
    out.a[ci] = +(out.a[ci] + off).toFixed(4);
    out.b[ci] = +(out.b[ci] + off).toFixed(4);
  }
  return out;
}

/**
 * A rect with holes cut out (ON2: floor holes cut the room floors in the editor's 3D): the pieces left, as strips along x
 * per band of z between the hole edges. A rect with no hole in it comes back whole.
 */
export function cutRect(r: Rect, holes: readonly Rect[]): Rect[] {
  if (!holes.length) return [r];
  const xs = new Set([r[0], r[2]]);
  const zs = new Set([r[1], r[3]]);
  for (const h of holes) {
    for (const x of [h[0], h[2]]) if (x > r[0] && x < r[2]) xs.add(x);
    for (const z of [h[1], h[3]]) if (z > r[1] && z < r[3]) zs.add(z);
  }
  const X = [...xs].sort((a, b) => a - b);
  const Z = [...zs].sort((a, b) => a - b);
  const out: Rect[] = [];
  for (let j = 0; j + 1 < Z.length; j++) {
    const mz = (Z[j]! + Z[j + 1]!) / 2;
    let start: number | null = null;
    for (let i = 0; i + 1 < X.length; i++) {
      const mx = (X[i]! + X[i + 1]!) / 2;
      const open = holes.some((h) => mx > h[0] && mx < h[2] && mz > h[1] && mz < h[3]);
      if (!open && start === null) start = X[i]!;
      if (open && start !== null) {
        out.push([start, Z[j]!, X[i]!, Z[j + 1]!]);
        start = null;
      }
    }
    if (start !== null) out.push([start, Z[j]!, X[X.length - 1]!, Z[j + 1]!]);
  }
  return out;
}
