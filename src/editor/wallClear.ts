/**
 * No placing inside walls (Michael 2026-10-14): climb pieces, objects, lamps, security devices and signs may not overlap a
 * wall's solid volume. A piece a little way in (facts rules.wallPushMax) is pushed out to the nearest face; deeper is
 * refused ("Inside a wall"). Touching a face (facts rules.wallTouchTol) is on it, not inside. Pure and Babylon-free
 * (tests/editor/wallClear.test.ts): plan boxes by the separating axis test, heights as ranges above the level's floor.
 */
import facts from '../../scripts/kestrel/facts.json';
import { hyp2 } from '../core/mathx';
import { pieceObb, wallPieces } from './geometry';
import type { Obb } from './geometry';
import type { Opening, Pt, Rect, Wall } from './types';

export const WALL_PUSH_MAX = facts.rules.wallPushMax.value;
export const WALL_TOUCH = facts.rules.wallTouchTol.value;
export const INSIDE_WALL = 'Inside a wall';

/** A wall's solid box: its plan box and its height range above its level's floor. */
export interface Solid extends Obb {
  y0: number;
  y1: number;
  wall: string;
}

/** A piece's footprint: an oriented plan box (a point has no size) and its height range above the level's floor. */
export type Foot = Obb & { y0: number; y1: number };

/** The solid parts of the walls on `level` (openings cut out). */
export function wallSolids(walls: readonly Wall[], openings: readonly Opening[], level: string): Solid[] {
  const out: Solid[] = [];
  for (const w of walls) {
    if (w.level !== level) continue;
    for (const p of wallPieces(w, openings)) out.push({ ...pieceObb(w, p), y0: p.y0, y1: p.y1, wall: w.id });
  }
  return out;
}

/** A plan rectangle from y0 to y1. */
export const rectFoot = (r: Rect, y0: number, y1: number): Foot => ({ cx: (r[0] + r[2]) / 2, cz: (r[1] + r[3]) / 2, ux: 1, uz: 0, hl: Math.abs(r[2] - r[0]) / 2, ht: Math.abs(r[3] - r[1]) / 2, y0, y1 });

/** A line piece from a to b, `half` either side of it (a point when a = b: a square of side 2 half). */
export function segFoot(a: Pt, b: Pt, half: number, y0: number, y1: number): Foot {
  const L = hyp2(b[0] - a[0], b[1] - a[1]);
  const ux = L > 1e-9 ? (b[0] - a[0]) / L : 1;
  const uz = L > 1e-9 ? (b[1] - a[1]) / L : 0;
  return { cx: (a[0] + b[0]) / 2, cz: (a[1] + b[1]) / 2, ux, uz, hl: L / 2 + half, ht: half, y0: Math.min(y0, y1), y1: Math.max(y0, y1) };
}

/** A point at height y (a fitting, a device, a sign's centre). */
export const pointFoot = (x: number, z: number, y: number): Foot => ({ cx: x, cz: z, ux: 1, uz: 0, hl: 0, ht: 0, y0: y, y1: y });

const radius = (b: Obb, lx: number, lz: number): number => b.hl * Math.abs(b.ux * lx + b.uz * lz) + b.ht * Math.abs(-b.uz * lx + b.ux * lz);

/** How deep `f` is in `s` and the shortest way out (unit plan direction), or null when they do not overlap by more than tol. */
export function overlap(f: Foot, s: Solid, tol = WALL_TOUCH): { depth: number; nx: number; nz: number } | null {
  // heights: a flat piece (y0 = y1) is inside only strictly between the solid's bottom and top
  if (!(f.y0 < s.y1 - tol && f.y1 > s.y0 + tol)) return null;
  const axes: [number, number][] = [[f.ux, f.uz], [-f.uz, f.ux], [s.ux, s.uz], [-s.uz, s.ux]];
  const dx = f.cx - s.cx;
  const dz = f.cz - s.cz;
  let best: { depth: number; nx: number; nz: number } | null = null;
  for (const [lx, lz] of axes) {
    const d = dx * lx + dz * lz;
    const depth = radius(f, lx, lz) + radius(s, lx, lz) - Math.abs(d);
    if (depth <= tol) return null;
    if (!best || depth < best.depth - 1e-9) {
      // out along the axis, away from the solid's centre (a centre exactly on it leaves by the axis's own sense)
      const sg = d < 0 ? -1 : 1;
      best = { depth, nx: lx * sg, nz: lz * sg };
    }
  }
  return best;
}

/** The first solid `f` is inside, or null. */
export function wallUnder(f: Foot, solids: readonly Solid[], tol = WALL_TOUCH): Solid | null {
  for (const s of solids) if (overlap(f, s, tol)) return s;
  return null;
}

export type Clear = { ok: true; dx: number; dz: number } | { ok: false; why: string; wall: string };

const r3 = (v: number): number => Math.round(v * 1000) / 1000;

/**
 * Whether `f` is clear of every wall: clear as it is (dx = dz = 0); pushed out to the face (dx, dz, at most `max` in all);
 * or refused, with the wall it is inside.
 */
export function clearOfWalls(f: Foot, solids: readonly Solid[], max = WALL_PUSH_MAX, tol = WALL_TOUCH): Clear {
  let dx = 0;
  let dz = 0;
  for (let pass = 0; pass < 4; pass++) {
    const g: Foot = { ...f, cx: f.cx + dx, cz: f.cz + dz };
    let hit: { s: Solid; o: { depth: number; nx: number; nz: number } } | null = null;
    for (const s of solids) {
      const o = overlap(g, s, tol);
      if (o) {
        hit = { s, o };
        break;
      }
    }
    if (!hit) return { ok: true, dx: r3(dx), dz: r3(dz) };
    dx += hit.o.nx * hit.o.depth;
    dz += hit.o.nz * hit.o.depth;
    if (hyp2(dx, dz) > max + 1e-9) return { ok: false, why: INSIDE_WALL, wall: hit.s.wall };
  }
  const left = wallUnder({ ...f, cx: f.cx + dx, cz: f.cz + dz }, solids, tol);
  return left ? { ok: false, why: INSIDE_WALL, wall: left.wall } : { ok: true, dx: r3(dx), dz: r3(dz) };
}
