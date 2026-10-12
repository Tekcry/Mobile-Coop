/**
 * The level editor's smarter A for the controller (ED3-2), pure: which part of the selected element A would take at the
 * dot (edge-aware grab) and the magnetic dot's snap search. Babylon- and DOM-free (tests/editor/grab.test.ts);
 * padControl.ts feeds it the selection, the dot and the snap candidates.
 */
import { hyp2 } from '../core/mathx';
import { snap } from './geometry';
import type { Pt, Rect } from './types';

/** Editor defaults; Michael tunes them after his pad test (docs/kestrel/prompts/ED3-2.md section 2). */
export const GRAB = {
  /** Edge band, rooms and walls: at most this, metres... */
  BAND_MAX: 0.5,
  /** ...and at most this share of the shorter side or the wall length (small rooms keep a middle to move by). */
  BAND_SHARE: 0.25,
  /** Edge band, doors and windows: at most this, metres, and at most BAND_SHARE of the opening width. */
  OPENING_BAND_MAX: 0.25,
} as const;

export const MAGNET = {
  /** The dot snaps inside PULL metres and lets go beyond RELEASE (the gap stops flicker). */
  PULL: 0.5,
  RELEASE: 0.7,
  /** The orbit target eases onto the snap point at this rate per second (exponential) while the stick is under EASE_STICK. */
  EASE: 12,
  EASE_STICK: 0.5,
  /** Pan speed inside the pull radius. */
  PAN_SLOW: 0.6,
} as const;

export const GHOST = {
  /** A door or window ghost sits on the nearest wall within this many metres (toolDown's nearestWall reach). */
  REACH: 1.2,
  /** See-through ghosts. */
  ALPHA: 0.35,
} as const;

/** The selected element as the grab sees it. Rooms, stairs and floor holes are rects; openings sit on their wall. */
export type GrabShape =
  | { kind: 'rect'; rect: Rect }
  | { kind: 'wall'; a: Pt; b: Pt; t: number }
  | { kind: 'opening'; a: Pt; b: Pt; t: number; at: number; w: number };

/** The part A would take: an editor handle (W, E, S, N, a, b, l, r) or null for the whole thing, and its words. */
export interface GrabPart {
  handle: string | null;
  words: string;
}

const EDGE_WORDS: Record<string, string> = { W: 'Stretch west edge', E: 'Stretch east edge', S: 'Stretch south edge', N: 'Stretch north edge' };

/** Along and across a segment from a to b: s from a (unclamped), d the distance from the line. */
function along(a: Pt, b: Pt, x: number, z: number): { s: number; d: number; len: number } {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = hyp2(dx, dz);
  if (len < 1e-9) return { s: 0, d: hyp2(x - a[0], z - a[1]), len: 0 };
  const ux = dx / len;
  const uz = dz / len;
  const px = x - a[0];
  const pz = z - a[1];
  return { s: px * ux + pz * uz, d: Math.abs(px * uz - pz * ux), len };
}

export function rectBand(r: Rect): number {
  return Math.min(GRAB.BAND_MAX, GRAB.BAND_SHARE * Math.min(r[2] - r[0], r[3] - r[1]));
}

/** What A takes at (x, z); null outside the element plus its band (A then selects what the dot is on). */
export function grabPart(g: GrabShape, x: number, z: number): GrabPart | null {
  if (g.kind === 'rect') {
    const r = g.rect;
    const band = rectBand(r);
    if (x < r[0] - band || x > r[2] + band || z < r[1] - band || z > r[3] + band) return null;
    const ds: [string, number][] = [['W', Math.abs(x - r[0])], ['E', Math.abs(x - r[2])], ['S', Math.abs(z - r[1])], ['N', Math.abs(z - r[3])]];
    let best: [string, number] | null = null;
    for (const e of ds) if (e[1] <= band && (!best || e[1] < best[1])) best = e;
    return best ? { handle: best[0], words: EDGE_WORDS[best[0]]! } : { handle: null, words: 'Move' };
  }
  const { s, d, len } = along(g.a, g.b, x, z);
  if (g.kind === 'wall') {
    const band = Math.min(GRAB.BAND_MAX, GRAB.BAND_SHARE * len);
    if (d > g.t / 2 + band || s < -band || s > len + band) return null;
    if (s <= band && s <= len - s) return { handle: 'a', words: 'Stretch this end' };
    if (s >= len - band) return { handle: 'b', words: 'Stretch this end' };
    return { handle: null, words: 'Move' };
  }
  const band = Math.min(GRAB.OPENING_BAND_MAX, GRAB.BAND_SHARE * g.w);
  const lo = g.at - g.w / 2;
  const hi = g.at + g.w / 2;
  if (d > g.t / 2 + band || s < lo - band || s > hi + band) return null;
  const dl = Math.abs(s - lo);
  const dr = Math.abs(s - hi);
  if (dl <= band && dl <= dr) return { handle: 'l', words: 'Widen' };
  if (dr <= band) return { handle: 'r', words: 'Widen' };
  return { handle: null, words: 'Slide along the wall' };
}

// ---------- the magnetic dot ----------
/** A snap candidate on the editing level. `owner` is the element key it belongs to (skipped while that one is dragged). */
export type SnapCand = { kind: 'point'; key: string; label: string; owner: string; p: Pt } | { kind: 'line'; key: string; label: string; owner: string; a: Pt; b: Pt };

export interface SnapHit {
  key: string;
  label: string;
  kind: 'point' | 'line';
  x: number;
  z: number;
}

export interface MagnetOpts {
  /** LB held: grid only. */
  off?: boolean;
  /** The dragged element's key: its own points and lines are skipped. */
  skip?: string | null;
  /** Grid along a wall line. */
  grid: number;
}

/** The nearest point on a line candidate, grid-snapped along it; null for a zero-length line. */
function onLine(c: { a: Pt; b: Pt }, x: number, z: number, grid: number): { x: number; z: number; d: number } | null {
  const { s, len } = along(c.a, c.b, x, z);
  if (len < 1e-9) return null;
  const t = Math.max(0, Math.min(len, snap(s, grid)));
  const px = c.a[0] + ((c.b[0] - c.a[0]) * t) / len;
  const pz = c.a[1] + ((c.b[1] - c.a[1]) * t) / len;
  return { x: +px.toFixed(3), z: +pz.toFixed(3), d: hyp2(x - px, z - pz) };
}

/**
 * The magnetic dot: points (wall ends, room corners, opening centres) beat lines (wall centre lines). A new snap needs
 * PULL; the current one (`prev`) holds until RELEASE, except that a line gives way to a point inside PULL.
 */
export function magnetSearch(x: number, z: number, cands: readonly SnapCand[], prev: SnapHit | null, o: MagnetOpts): SnapHit | null {
  if (o.off) return null;
  let bestP: SnapCand | null = null;
  let bestPD: number = MAGNET.PULL;
  let held: SnapHit | null = null;
  for (const c of cands) {
    if (o.skip && c.owner === o.skip) continue;
    if (c.kind === 'point') {
      const d = hyp2(x - c.p[0], z - c.p[1]);
      if (prev?.key === c.key && d <= MAGNET.RELEASE) held = { key: c.key, label: c.label, kind: 'point', x: c.p[0], z: c.p[1] };
      if (d < bestPD - 1e-9) {
        bestP = c;
        bestPD = d;
      }
    } else if (prev?.key === c.key) {
      const q = onLine(c, x, z, o.grid);
      if (q && q.d <= MAGNET.RELEASE) held = { key: c.key, label: c.label, kind: 'line', x: q.x, z: q.z };
    }
  }
  if (held?.kind === 'point') return held;
  if (bestP?.kind === 'point') return { key: bestP.key, label: bestP.label, kind: 'point', x: bestP.p[0], z: bestP.p[1] };
  if (held) return held;
  let bestL: SnapHit | null = null;
  let bestLD: number = MAGNET.PULL;
  for (const c of cands) {
    if (c.kind !== 'line' || (o.skip && c.owner === o.skip)) continue;
    const q = onLine(c, x, z, o.grid);
    if (q && q.d < bestLD - 1e-9) {
      bestLD = q.d;
      bestL = { key: c.key, label: c.label, kind: 'line', x: q.x, z: q.z };
    }
  }
  return bestL;
}

/** One frame of the pull: the target eases onto the snap point (factor for dt seconds). */
export const easeFactor = (dt: number): number => 1 - Math.exp(-MAGNET.EASE * dt);

/** Rotates a plan point a quarter turn clockwise (seen from above, north up) about (cx, cz). */
export const turnPt = (p: Pt, cx: number, cz: number): Pt => [+(cx + (p[1] - cz)).toFixed(3), +(cz - (p[0] - cx)).toFixed(3)];
