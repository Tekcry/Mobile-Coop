/**
 * Live sizes and distances for the level editor (ON1, ED3-3b), pure: the clear run of a wall between its cross walls,
 * door and window centring and the distances to each side, the nearest parallel wall, room sizes, and room edges
 * snapping to walls and other rooms. One function per element feeds both the pad's dot words and the plan's dashed text
 * (decision 8). Babylon- and DOM-free (tests/editor/liveSizes.test.ts).
 */
import { hyp2 } from '../core/mathx';
import { fmt, JOIN_TOL, wallDir, wallLen, wallPoint } from './geometry';
import type { Edge } from './geometry';
import { SNAP } from './grab';
import type { Pt, Rect, Room, Wall } from './types';

/** A dashed line or a text label on the plan (the same shapes the pad's ghosts use). */
export type LiveShape = { kind: 'line'; a: Pt; b: Pt; guide?: boolean } | { kind: 'text'; p: Pt; text: string };

export interface LiveInfo {
  words: string;
  shapes: LiveShape[];
  /** ON4: red at the dot (a row's aisle under the facts). */
  bad?: boolean;
}

const r3 = (v: number): number => +v.toFixed(3);
const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
/** |sin| of the angle between two walls (0 parallel, 1 square). */
function sinAngle(w: Wall, o: Wall): number {
  const a = wallDir(w);
  const b = wallDir(o);
  return Math.abs(a[0] * b[1] - a[1] * b[0]);
}

/** Along and across wall w for a point: s from w.a, d from its centre line (signed, + to the left of a -> b). */
function local(w: Wall, p: Pt): { s: number; d: number } {
  const u = wallDir(w);
  const px = p[0] - w.a[0];
  const pz = p[1] - w.a[1];
  return { s: px * u[0] + pz * u[1], d: pz * u[0] - px * u[1] };
}

/**
 * Where cross walls meet wall w: [face before, face after] along w, metres from w.a. A cross wall is one on w's level,
 * not parallel, with an end on w (a T or an L), or one that w ends on.
 */
export function crossStops(w: Wall, walls: readonly Wall[]): [number, number][] {
  const L = wallLen(w);
  const out: [number, number][] = [];
  for (const o of walls) {
    if (o.id === w.id || o.level !== w.level) continue;
    const sn = sinAngle(w, o);
    if (sn < 0.1) continue;
    const hw = o.t / 2 / sn;
    let hit: number | null = null;
    for (const e of [o.a, o.b]) {
      const q = local(w, e);
      if (Math.abs(q.d) <= w.t / 2 + JOIN_TOL && q.s >= -hw - JOIN_TOL && q.s <= L + hw + JOIN_TOL) hit = q.s;
    }
    if (hit === null) {
      // w ends on o's line (w is the stem of a T)
      for (const [e, s] of [[w.a, 0], [w.b, L]] as [Pt, number][]) {
        const q = local(o, e);
        if (Math.abs(q.d) <= o.t / 2 + JOIN_TOL && q.s >= -JOIN_TOL && q.s <= wallLen(o) + JOIN_TOL) hit = s;
      }
    }
    if (hit !== null) out.push([hit - hw, hit + hw]);
  }
  return out;
}

/** The clear run of wall w around s: from the nearest cross wall face (or the wall end) before s to the one after. */
export function clearRun(w: Wall, walls: readonly Wall[], s: number): { lo: number; hi: number } {
  const L = wallLen(w);
  let lo = 0;
  let hi = L;
  for (const [f0, f1] of crossStops(w, walls)) {
    if (f1 <= s + 1e-6) lo = Math.max(lo, f1);
    else if (f0 >= s - 1e-6) hi = Math.min(hi, f0);
  }
  return { lo: Math.max(0, lo), hi: Math.min(L, hi) };
}

/**
 * Door and window centring (decision 3): with the dot at s along w, an opening `width` wide sits at the middle of the
 * clear run when s is within SNAP.CENTRE of it and the opening fits (`off`: LB or Ctrl held, no centring); else at s,
 * kept on the wall.
 */
export function centreOpening(w: Wall, walls: readonly Wall[], s: number, width: number, off = false): { at: number; centred: boolean } {
  const L = wallLen(w);
  if (!off) {
    const { lo, hi } = clearRun(w, walls, s);
    const m = (lo + hi) / 2;
    if (hi - lo >= width - 1e-6 && Math.abs(s - m) <= SNAP.CENTRE + 1e-9) return { at: r3(m), centred: true };
  }
  return { at: r3(Math.min(L - width / 2, Math.max(width / 2, s))), centred: false };
}

/** Clear distances from each side of an opening (centre at, width) to the nearest cross wall face or wall end. */
export function openingSides(w: Wall, walls: readonly Wall[], at: number, width: number): [number, number] {
  const { lo, hi } = clearRun(w, walls, at);
  return [r3(Math.max(0, at - width / 2 - lo)), r3(Math.max(0, hi - (at + width / 2)))];
}

/** Door and window words and plan shapes (decision 4): "Centred - 1.2 m | 2.4 m", a dashed line and figure each side. */
export function liveOpening(w: Wall, walls: readonly Wall[], at: number, width: number): LiveInfo & { centred: boolean } {
  const { lo, hi } = clearRun(w, walls, at);
  const [l, r] = openingSides(w, walls, at, width);
  const centred = Math.abs(at - (lo + hi) / 2) < 0.005;
  const shapes: LiveShape[] = [];
  const side = (s0: number, s1: number, v: number): void => {
    if (s1 - s0 < 1e-3) return;
    const a = wallPoint(w, s0);
    const b = wallPoint(w, s1);
    shapes.push({ kind: 'line', a, b }, { kind: 'text', p: mid(a, b), text: `${fmt(v)} m` });
  };
  side(lo, at - width / 2, l);
  side(at + width / 2, hi, r);
  return { words: `${centred ? 'Centred, ' : ''}${fmt(l)} m | ${fmt(r)} m`, shapes, centred };
}

/** The nearest parallel wall on w's level within SNAP.PARALLEL_MAX, face to face, overlapping w along its length. */
export function parallelGap(w: Wall, walls: readonly Wall[]): { dist: number; other: string; a: Pt; b: Pt } | null {
  const L = wallLen(w);
  if (L < 1e-6) return null;
  let best: { dist: number; other: string; a: Pt; b: Pt } | null = null;
  for (const o of walls) {
    if (o.id === w.id || o.level !== w.level || wallLen(o) < 1e-6 || sinAngle(w, o) > 0.01) continue;
    const qa = local(w, o.a);
    const qb = local(w, o.b);
    const s0 = Math.max(0, Math.min(qa.s, qb.s));
    const s1 = Math.min(L, Math.max(qa.s, qb.s));
    if (s1 - s0 < 0.01) continue;
    const d = (qa.d + qb.d) / 2;
    const dist = Math.abs(d) - w.t / 2 - o.t / 2;
    if (dist < 0.01 || dist > SNAP.PARALLEL_MAX || (best && dist >= best.dist)) continue;
    const u = wallDir(w);
    const n: Pt = [-u[1] * Math.sign(d), u[0] * Math.sign(d)];
    const c = wallPoint(w, (s0 + s1) / 2);
    const a: Pt = [c[0] + n[0] * (w.t / 2), c[1] + n[1] * (w.t / 2)];
    best = { dist: r3(dist), other: o.id, a, b: [a[0] + n[0] * dist, a[1] + n[1] * dist] };
  }
  return best;
}

/** A wall being drawn or dragged (decision 5): its length and the clear distance to the nearest parallel wall. */
export function liveWall(w: Wall, walls: readonly Wall[]): LiveInfo {
  const L = wallLen(w);
  const shapes: LiveShape[] = [{ kind: 'text', p: mid(w.a, w.b), text: `${fmt(L)} m` }];
  const g = parallelGap(w, walls);
  if (!g) return { words: `length ${fmt(L)} m`, shapes };
  shapes.push({ kind: 'line', a: g.a, b: g.b }, { kind: 'text', p: mid(g.a, g.b), text: `${fmt(g.dist)} m` });
  return { words: `length ${fmt(L)} m, ${fmt(g.dist)} m to the parallel wall`, shapes };
}

/** "4 x 3 m, 12 m2". */
export function roomSize(r: Rect): string {
  const w = r[2] - r[0];
  const d = r[3] - r[1];
  return `${fmt(w)} x ${fmt(d)} m, ${fmt(w * d)} m2`;
}

const ALONG_Z = (e: Edge): boolean => e === 'W' || e === 'E';
const edgeV = (r: Rect, e: Edge): number => (e === 'W' ? r[0] : e === 'E' ? r[2] : e === 'S' ? r[1] : r[3]);

/** A wall lying along z (constant x) or along x (constant z): its line value and span; null when angled. */
function axisWall(o: Wall, alongZ: boolean): { v: number; s0: number; s1: number } | null {
  const i: 0 | 1 = alongZ ? 0 : 1;
  const j: 0 | 1 = alongZ ? 1 : 0;
  if (Math.abs(o.a[i] - o.b[i]) > 1e-6) return null;
  return { v: o.a[i], s0: Math.min(o.a[j], o.b[j]), s1: Math.max(o.a[j], o.b[j]) };
}

/**
 * The nearest parallel wall a room edge approaches (decision 5): from the edge line to that wall's near face, on the side
 * `dir` (+1 east or north, -1 west or south), overlapping the edge; walls on the edge itself do not count.
 */
export function edgeGap(r: Rect, edge: Edge, level: string, walls: readonly Wall[], dir: 1 | -1): { dist: number; a: Pt; b: Pt } | null {
  const alongZ = ALONG_Z(edge);
  const v = edgeV(r, edge);
  const s0 = alongZ ? r[1] : r[0];
  const s1 = alongZ ? r[3] : r[2];
  let best: { dist: number; sm: number } | null = null;
  for (const o of walls) {
    if (o.level !== level) continue;
    const q = axisWall(o, alongZ);
    if (!q || Math.min(s1, q.s1) - Math.max(s0, q.s0) < 0.01) continue;
    const off = (q.v - v) * dir;
    if (off <= o.t / 2 + 1e-6) continue;
    const dist = off - o.t / 2;
    if (dist > SNAP.PARALLEL_MAX || (best && dist >= best.dist)) continue;
    best = { dist: r3(dist), sm: (Math.max(s0, q.s0) + Math.min(s1, q.s1)) / 2 };
  }
  if (!best) return null;
  const a: Pt = alongZ ? [v, best.sm] : [best.sm, v];
  const b: Pt = alongZ ? [v + dir * best.dist, best.sm] : [best.sm, v + dir * best.dist];
  return { dist: best.dist, a, b };
}

/**
 * A room being drawn or stretched (decision 5): "4 x 3 m, 12 m2"; a stretched edge adds the distance to the parallel wall
 * it approaches (the way it moved from `before`, outwards when it has not moved).
 */
export function liveRoom(r: Rect, edge: Edge | null, before: Rect | null, level: string, walls: readonly Wall[]): LiveInfo {
  const size = roomSize(r);
  const shapes: LiveShape[] = [{ kind: 'text', p: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2], text: size }];
  if (!edge) return { words: size, shapes };
  const out: 1 | -1 = edge === 'E' || edge === 'N' ? 1 : -1;
  const moved = before ? edgeV(r, edge) - edgeV(before, edge) : 0;
  const dir: 1 | -1 = Math.abs(moved) > 1e-6 ? (moved > 0 ? 1 : -1) : out;
  const g = edgeGap(r, edge, level, walls, dir);
  if (!g) return { words: size, shapes };
  shapes.push({ kind: 'line', a: g.a, b: g.b }, { kind: 'text', p: mid(g.a, g.b), text: `${fmt(g.dist)} m` });
  return { words: `${size}, ${fmt(g.dist)} m to the next wall`, shapes };
}

/**
 * Room edges snap (decision 7): an edge value v of a room edge snaps to the nearest wall centre line, wall face or other
 * room edge of the same direction on the level within SNAP.EDGE (a centre line wins a tie). Returns the snapped value and
 * the line it snapped to, or null. Only walls and rooms beside the edge count: their extent along the edge must reach
 * within SNAP.EDGE of `span` (the edge's own extent), so a wall far down the same grid line does not pull.
 */
export function edgeSnap(v: number, edge: Edge, level: string, walls: readonly Wall[], rooms: readonly Room[], skipRoom: string | null, span: [number, number]): { v: number; label: string } | null {
  const alongZ = ALONG_Z(edge);
  const beside = (s0: number, s1: number): boolean => s1 >= span[0] - SNAP.EDGE && s0 <= span[1] + SNAP.EDGE;
  let best: { v: number; label: string; d: number } | null = null;
  const consider = (t: number, label: string): void => {
    const d = Math.abs(t - v);
    if (d <= SNAP.EDGE + 1e-9 && (!best || d < best.d - 1e-9)) best = { v: r3(t), label, d };
  };
  for (const o of walls) {
    if (o.level !== level) continue;
    const q = axisWall(o, alongZ);
    if (!q || hyp2(o.b[0] - o.a[0], o.b[1] - o.a[1]) < 1e-6 || !beside(q.s0, q.s1)) continue;
    consider(q.v, 'Wall line');
    consider(q.v - o.t / 2, 'Wall face');
    consider(q.v + o.t / 2, 'Wall face');
  }
  for (const rm of rooms) {
    if (rm.level !== level || rm.id === skipRoom || !(alongZ ? beside(rm.rect[1], rm.rect[3]) : beside(rm.rect[0], rm.rect[2]))) continue;
    if (alongZ) {
      consider(rm.rect[0], 'Room edge');
      consider(rm.rect[2], 'Room edge');
    } else {
      consider(rm.rect[1], 'Room edge');
      consider(rm.rect[3], 'Room edge');
    }
  }
  const b = best as { v: number; label: string; d: number } | null;
  return b ? { v: b.v, label: b.label } : null;
}
