/**
 * Corners and doorways derived from cover faces (pure, unit-tested). Used for slicing the pie (keep a
 * standoff from an outside corner while working round it), the contextual lean and the doorway check.
 */
import type { CoverSegment } from './coverData';
import { hyp2 } from '../core/mathx';

export interface Doorway {
  x: number;
  z: number;
  /** Passage axis (through the wall) and the wall tangent. */
  nx: number;
  nz: number;
  tx: number;
  tz: number;
  width: number;
}

export interface OutsideCorner {
  x: number;
  z: number;
  /** Normal of the face the player works along, and the direction past the corner along that face. */
  nx: number;
  nz: number;
  ox: number;
  oz: number;
}

/** Slicing the pie: lateral standoff from the wall (m) kept while approaching an outside corner. */
export const SLICE = { standoff: 1.0, min: 0.8, max: 1.2, reach: 3.0, push: 0.45 };

/**
 * Gaps of 0.7-1.8 m between two collinear high faces with the same normal are doorways. A wall gives
 * faces on both sides, so the same door is found twice; duplicates within 0.5 m are merged.
 */
export function findDoorways(segs: readonly CoverSegment[]): Doorway[] {
  const out: Doorway[] = [];
  for (let i = 0; i < segs.length; i++) {
    const a = segs[i]!;
    if (a.low) continue;
    for (let j = i + 1; j < segs.length; j++) {
      const b = segs[j]!;
      if (b.low || a.piece === b.piece) continue;
      if (a.nx * b.nx + a.nz * b.nz < 0.95) continue;
      // collinear: b's endpoints lie on a's face line
      const offA = (b.ax - a.ax) * a.nx + (b.az - a.az) * a.nz;
      const offB = (b.bx - a.ax) * a.nx + (b.bz - a.az) * a.nz;
      if (Math.abs(offA) > 0.15 || Math.abs(offB) > 0.15) continue;
      // positions along a's tangent
      const sb0 = (b.ax - a.ax) * a.tx + (b.az - a.az) * a.tz;
      const sb1 = (b.bx - a.ax) * a.tx + (b.bz - a.az) * a.tz;
      const lo = Math.min(sb0, sb1);
      const hi = Math.max(sb0, sb1);
      let g0: number;
      let g1: number;
      if (lo >= a.len) {
        g0 = a.len;
        g1 = lo;
      } else if (hi <= 0) {
        g0 = hi;
        g1 = 0;
      } else continue; // overlapping
      const width = g1 - g0;
      if (width < 0.7 || width > 1.8) continue;
      const m = (g0 + g1) / 2;
      const x = a.ax + a.tx * m - a.nx * a.depth * 0.5;
      const z = a.az + a.tz * m - a.nz * a.depth * 0.5;
      if (out.some((d) => hyp2(d.x - x, d.z - z) < 0.5)) continue;
      out.push({ x, z, nx: a.nx, nz: a.nz, tx: a.tx, tz: a.tz, width });
    }
  }
  return out;
}

/**
 * Ends of high faces that turn round an outside corner (wall ends, block corners). Ends that butt into
 * another piece (an L-junction of two walls) are not corners.
 */
export function outsideCorners(segs: readonly CoverSegment[]): OutsideCorner[] {
  const out: OutsideCorner[] = [];
  const blocked = (s: CoverSegment, x: number, z: number): boolean =>
    segs.some((o) => o.piece !== s.piece && !o.low && distToSeg(o, x, z) < 0.3);
  for (const s of segs) {
    if (s.low || s.len < 0.6) continue;
    if (!blocked(s, s.ax, s.az)) out.push({ x: s.ax, z: s.az, nx: s.nx, nz: s.nz, ox: -s.tx, oz: -s.tz });
    if (!blocked(s, s.bx, s.bz)) out.push({ x: s.bx, z: s.bz, nx: s.nx, nz: s.nz, ox: s.tx, oz: s.tz });
  }
  return out;
}

function distToSeg(s: CoverSegment, x: number, z: number): number {
  const t = Math.max(0, Math.min(s.len, (x - s.ax) * s.tx + (z - s.az) * s.tz));
  return hyp2(x - (s.ax + s.tx * t), z - (s.az + s.tz * t));
}

/**
 * Lateral push (m/s, along the face normal) that eases a player approaching an outside corner along
 * its face out to the slicing standoff, so they work round the corner in a wide arc instead of
 * hugging the wall. Zero beside the corner's far side, far away, or already at the standoff.
 */
export function sliceSteer(c: OutsideCorner, px: number, pz: number, wishX: number, wishZ: number): number {
  const dx = px - c.x;
  const dz = pz - c.z;
  const lateral = dx * c.nx + dz * c.nz;
  const along = -(dx * c.ox + dz * c.oz); // distance before the corner
  if (lateral < 0.05 || along < 0.2 || along > SLICE.reach) return 0;
  // only while moving towards the corner
  if (wishX * c.ox + wishZ * c.oz < 0.3) return 0;
  if (lateral >= SLICE.min) return 0;
  const k = 1 - along / SLICE.reach;
  return SLICE.push * Math.min(1, (SLICE.standoff - lateral) / SLICE.standoff + 0.2) * (0.4 + 0.6 * k);
}

/** Signed side of a doorway plane (+ on the normal side) and whether a point is inside its opening. */
export function doorSide(d: Doorway, x: number, z: number): { side: number; inside: boolean; dist: number } {
  const dx = x - d.x;
  const dz = z - d.z;
  const side = dx * d.nx + dz * d.nz;
  const lat = Math.abs(dx * d.tx + dz * d.tz);
  return { side, inside: lat < d.width / 2 + 0.2, dist: hyp2(dx, dz) };
}

/**
 * Lean decision from three probes along the aim: centre blocked close in front, left / right clear
 * from a shoulder-width offset. Returns -1 / 1 to lean, or 0. Prefers the current shoulder side.
 */
export function pickLean(centreBlocked: boolean, leftClear: boolean, rightClear: boolean, shoulder: number): number {
  if (!centreBlocked) return 0;
  if (leftClear && rightClear) return shoulder < 0 ? -1 : 1;
  if (rightClear) return 1;
  if (leftClear) return -1;
  return 0;
}
