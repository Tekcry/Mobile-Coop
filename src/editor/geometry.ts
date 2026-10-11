/**
 * Pure geometry for the level editor: wall pieces around openings, snapping, wall projection, room lookup and the
 * walk-mode collision. Babylon-free (tests/editor/geometry.test.ts).
 */
import { hyp2 } from '../core/mathx';
import type { Opening, Pt, Rect, Room, Wall } from './types';

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
