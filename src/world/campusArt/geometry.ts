/**
 * Pure geometry over the greybox pieces for the campus art dressing (sector-redesign ART-KIT step 4): find a greybox
 * piece by position (the section dressers never hard-code a `b.boxes` index), the floor and ceiling over a point, the
 * walls of a room (`wallRuns`), and the plan / 3D distance helpers the keepouts use. No Babylon; nothing here runs per
 * frame (build time only).
 */
import { hyp2 } from '../../core/mathx';
import type { RoomRect } from '../rooms';
import type { BoxPiece, CylPiece } from '../levelBuilder';

// ------------------------------------------------------------------------------------------------------- oriented boxes

/** A world box with a yaw and a pitch (Babylon's yaw-pitch-roll, roll 0): centre, half sizes, rotation rows. */
export interface Obb3 {
  c: [number, number, number];
  h: [number, number, number];
  /** Local axes in the world (columns of the rotation): x, y, z. */
  ax: [number, number, number];
  ay: [number, number, number];
  az: [number, number, number];
}

/** The rotation axes of yaw then pitch (R = Ry(yaw) Rx(pitch)): local x, y, z in the world. */
export function axes(yaw: number, pitch: number): { ax: [number, number, number]; ay: [number, number, number]; az: [number, number, number] } {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return { ax: [cy, 0, -sy], ay: [sy * sp, cp, cy * sp], az: [sy * cp, -sp, cy * cp] };
}

export function obbOf(c: readonly number[], s: readonly number[], yaw: number, pitch = 0): Obb3 {
  const a = axes(yaw, pitch);
  return { c: [c[0]!, c[1]!, c[2]!], h: [s[0]! / 2, s[1]! / 2, s[2]! / 2], ...a };
}

export const boxObb = (b: BoxPiece): Obb3 => obbOf(b.c, b.s, b.yaw, b.pitch);

/** The world axis-aligned bounds of an OBB: [x0, y0, z0, x1, y1, z1]. */
export function obbAabb(o: Obb3): [number, number, number, number, number, number] {
  const e = [0, 0, 0];
  for (let k = 0; k < 3; k++) e[k] = Math.abs(o.ax[k]!) * o.h[0] + Math.abs(o.ay[k]!) * o.h[1] + Math.abs(o.az[k]!) * o.h[2];
  return [o.c[0] - e[0]!, o.c[1] - e[1]!, o.c[2] - e[2]!, o.c[0] + e[0]!, o.c[1] + e[1]!, o.c[2] + e[2]!];
}

/** Distance from a point to an OBB (0 inside). */
export function pointObbDist(o: Obb3, x: number, y: number, z: number): number {
  const dx = x - o.c[0];
  const dy = y - o.c[1];
  const dz = z - o.c[2];
  const lx = dx * o.ax[0] + dy * o.ax[1] + dz * o.ax[2];
  const ly = dx * o.ay[0] + dy * o.ay[1] + dz * o.ay[2];
  const lz = dx * o.az[0] + dy * o.az[1] + dz * o.az[2];
  const ex = Math.max(Math.abs(lx) - o.h[0], 0);
  const ey = Math.max(Math.abs(ly) - o.h[1], 0);
  const ez = Math.max(Math.abs(lz) - o.h[2], 0);
  return Math.sqrt(ex * ex + ey * ey + ez * ez);
}

/** Does the segment a -> b cross the OBB shrunk by `shrink` on every side (a touch does not count)? Slab test. */
export function segHitsObb(o: Obb3, ax: number, ay: number, az: number, bx: number, by: number, bz: number, shrink = 0): boolean {
  return segEntryObb(o, ax, ay, az, bx, by, bz, shrink) >= 0;
}

/** (artpol) Where the segment a -> b enters the OBB shrunk by `shrink`, as a fraction 0..1 of the segment (0: it starts
 *  inside); -1 when it does not cross it (`segHitsObb`'s test). */
export function segEntryObb(o: Obb3, ax: number, ay: number, az: number, bx: number, by: number, bz: number, shrink = 0): number {
  const px = ax - o.c[0];
  const py = ay - o.c[1];
  const pz = az - o.c[2];
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  let t0 = 0;
  let t1 = 1;
  for (let k = 0; k < 3; k++) {
    const u = k === 0 ? o.ax : k === 1 ? o.ay : o.az;
    const h = o.h[k]! - shrink;
    if (h <= 0) return -1;
    const p = px * u[0] + py * u[1] + pz * u[2];
    const d = dx * u[0] + dy * u[1] + dz * u[2];
    if (Math.abs(d) < 1e-12) {
      if (Math.abs(p) > h) return -1;
      continue;
    }
    let ta = (-h - p) / d;
    let tb = (h - p) / d;
    if (ta > tb) {
      const w = ta;
      ta = tb;
      tb = w;
    }
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return -1;
  }
  return t0;
}

/** Plan rectangle of an OBB (yaw only; a pitched box's plan bounds are used as an axis-aligned rect). */
export interface PlanRect {
  cx: number;
  cz: number;
  hx: number;
  hz: number;
  /** Unit local x in the plan (cos yaw, -sin yaw); local z is (sin yaw, cos yaw). */
  ux: number;
  uz: number;
}

export function planRect(cx: number, cz: number, hx: number, hz: number, yaw: number): PlanRect {
  return { cx, cz, hx, hz, ux: Math.cos(yaw), uz: -Math.sin(yaw) };
}

/** Distance from a plan point to a plan rectangle (0 inside). */
export function pointRectDist(r: PlanRect, x: number, z: number): number {
  const dx = x - r.cx;
  const dz = z - r.cz;
  const lx = dx * r.ux + dz * r.uz;
  const lz = dx * -r.uz + dz * r.ux;
  return hyp2(Math.max(Math.abs(lx) - r.hx, 0), Math.max(Math.abs(lz) - r.hz, 0));
}

/** Distance from a plan point to the segment a -> b. */
export function pointSegDist(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz;
  const t = l2 < 1e-12 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
  return hyp2(x - (ax + dx * t), z - (az + dz * t));
}

function segsCross(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number): boolean {
  const d1 = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
  const d2 = (bx - ax) * (dz - az) - (bz - az) * (dx - ax);
  const d3 = (dx - cx) * (az - cz) - (dz - cz) * (ax - cx);
  const d4 = (dx - cx) * (bz - cz) - (dz - cz) * (bx - cx);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Distance from the plan segment a -> b to a plan rectangle (0 when they touch or cross). */
export function segRectDist(r: PlanRect, ax: number, az: number, bx: number, bz: number): number {
  let d = Math.min(pointRectDist(r, ax, az), pointRectDist(r, bx, bz));
  if (d === 0) return 0;
  // (artpol, load time) the four corners walked in place, no arrays: (-1, -1), (1, -1), (1, 1), (-1, 1) in (hx, hz)
  const vx = -r.uz;
  const vz = r.ux;
  const ex = r.ux * r.hx;
  const ez = r.uz * r.hx;
  const fx = vx * r.hz;
  const fz = vz * r.hz;
  for (let i = 0; i < 4; i++) {
    const sa = i === 1 || i === 2 ? 1 : -1;
    const sb = i >= 2 ? 1 : -1;
    const ta = i === 0 || i === 1 ? 1 : -1;
    const tb = i === 1 || i === 2 ? 1 : -1;
    const px = r.cx + ex * sa + fx * sb;
    const pz = r.cz + ez * sa + fz * sb;
    const qx = r.cx + ex * ta + fx * tb;
    const qz = r.cz + ez * ta + fz * tb;
    if (segsCross(ax, az, bx, bz, px, pz, qx, qz)) return 0;
    d = Math.min(d, pointSegDist(px, pz, ax, az, bx, bz));
  }
  return d;
}

/** Plan gap between two rectangles (0 when they overlap or touch): the largest separation over the four SAT axes. */
export function rectGap(a: PlanRect, b: PlanRect): number {
  let gap = 0;
  for (const [ux, uz] of [
    [a.ux, a.uz],
    [-a.uz, a.ux],
    [b.ux, b.uz],
    [-b.uz, b.ux],
  ] as const) {
    const ra = Math.abs(a.hx * (a.ux * ux + a.uz * uz)) + Math.abs(a.hz * (-a.uz * ux + a.ux * uz));
    const rb = Math.abs(b.hx * (b.ux * ux + b.uz * uz)) + Math.abs(b.hz * (-b.uz * ux + b.ux * uz));
    const d = Math.abs((b.cx - a.cx) * ux + (b.cz - a.cz) * uz) - ra - rb;
    if (d > gap) gap = d;
  }
  return gap;
}

/** Do two rectangles overlap by more than `eps` on every SAT axis (touching is fine: rows)? */
export function rectsOverlap(a: PlanRect, b: PlanRect, eps = 0.01): boolean {
  for (const [ux, uz] of [
    [a.ux, a.uz],
    [-a.uz, a.ux],
    [b.ux, b.uz],
    [-b.uz, b.ux],
  ] as const) {
    const ra = Math.abs(a.hx * (a.ux * ux + a.uz * uz)) + Math.abs(a.hz * (-a.uz * ux + a.ux * uz));
    const rb = Math.abs(b.hx * (b.ux * ux + b.uz * uz)) + Math.abs(b.hz * (-b.uz * ux + b.ux * uz));
    const d = Math.abs((b.cx - a.cx) * ux + (b.cz - a.cz) * uz) - ra - rb;
    if (d >= -eps) return false;
  }
  return true;
}

/** A greybox box's plan rectangle and y range (a pitched box uses its axis-aligned plan bounds). */
export function boxPlan(b: BoxPiece): { r: PlanRect; y0: number; y1: number } {
  if (Math.abs(b.pitch) > 1e-6) {
    const a = obbAabb(boxObb(b));
    return { r: planRect((a[0] + a[3]) / 2, (a[2] + a[5]) / 2, (a[3] - a[0]) / 2, (a[5] - a[2]) / 2, 0), y0: a[1], y1: a[4] };
  }
  return { r: planRect(b.c[0], b.c[2], b.s[0] / 2, b.s[2] / 2, b.yaw), y0: b.c[1] - b.s[1] / 2, y1: b.c[1] + b.s[1] / 2 };
}

// ------------------------------------------------------------------------------------------------------- lookups

/** The one box whose centre is (x, y, z) within `tol` on each axis; throws when none or more than one match. */
export function boxAt(boxes: readonly BoxPiece[], x: number, y: number, z: number, tol = 0.05): number {
  let found = -1;
  for (let i = 0; i < boxes.length; i++) {
    const c = boxes[i]!.c;
    if (Math.abs(c[0] - x) > tol || Math.abs(c[1] - y) > tol || Math.abs(c[2] - z) > tol) continue;
    if (found >= 0) throw new Error(`boxAt(${x}, ${y}, ${z}): boxes ${found} and ${i} both match`);
    found = i;
  }
  if (found < 0) throw new Error(`boxAt(${x}, ${y}, ${z}): no box within ${tol}`);
  return found;
}

/** The one cylinder whose plan centre is (x, z) within `tol`; throws when none or more than one match. */
export function cylAt(cyls: readonly CylPiece[], x: number, z: number, tol = 0.05): number {
  let found = -1;
  for (let i = 0; i < cyls.length; i++) {
    const c = cyls[i]!.c;
    if (Math.abs(c[0] - x) > tol || Math.abs(c[2] - z) > tol) continue;
    if (found >= 0) throw new Error(`cylAt(${x}, ${z}): cylinders ${found} and ${i} both match`);
    found = i;
  }
  if (found < 0) throw new Error(`cylAt(${x}, ${z}): no cylinder within ${tol}`);
  return found;
}

/** Indices of the boxes whose world bounds meet the box x0..x1, y0..y1, z0..z1 (either corner order). */
export function boxesIn(boxes: readonly BoxPiece[], x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): number[] {
  const ax = Math.min(x0, x1);
  const bx = Math.max(x0, x1);
  const az = Math.min(z0, z1);
  const bz = Math.max(z0, z1);
  const out: number[] = [];
  for (let i = 0; i < boxes.length; i++) {
    const a = obbAabb(boxObb(boxes[i]!));
    if (a[3] < ax || a[0] > bx || a[5] < az || a[2] > bz || a[4] < y0 || a[1] > y1) continue;
    out.push(i);
  }
  return out;
}

/** Is the plan point inside the box's plan footprint (yaw; pitched boxes by their plan bounds)? */
function overPlan(b: BoxPiece, x: number, z: number): boolean {
  return pointRectDist(boxPlan(b).r, x, z) === 0;
}

/** The top of the highest collide box over (x, z) whose top is at or below `yHint + 0.3` (-Infinity: none). A ramp's
 *  top is its height at the point. */
export function floorAt(boxes: readonly BoxPiece[], x: number, z: number, yHint: number): number {
  let best = -Infinity;
  for (const b of boxes) {
    if (!b.collide || !overPlan(b, x, z)) continue;
    let top: number;
    if (Math.abs(b.pitch) > 1e-6) {
      // the slab's upper face at (x, z): along the local z axis
      const o = boxObb(b);
      const dz = (x - o.c[0]) * o.az[0] + (z - o.c[2]) * o.az[2];
      const lz = dz / Math.max(1e-6, o.az[0] * o.az[0] + o.az[2] * o.az[2]);
      top = o.c[1] + o.ay[1] * o.h[1] + o.az[1] * lz;
    } else top = b.c[1] + b.s[1] / 2;
    if (top <= yHint + 0.3 && top > best) best = top;
  }
  return best;
}

/** The underside of the lowest collide or overhead box over (x, z) above `floorY + 1.9` (Infinity: open sky). */
export function ceilingAt(boxes: readonly BoxPiece[], x: number, z: number, floorY: number): number {
  let best = Infinity;
  for (const b of boxes) {
    if (!(b.collide || b.overhead) || !overPlan(b, x, z)) continue;
    const bot = Math.abs(b.pitch) > 1e-6 ? obbAabb(boxObb(b))[1] : b.c[1] - b.s[1] / 2;
    if (bot >= floorY + 1.9 && bot < best) best = bot;
  }
  return best;
}

// ------------------------------------------------------------------------------------------------------- wall runs

export interface WallRun {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Unit normal into the room. */
  nx: number;
  nz: number;
  y0: number;
  y1: number;
  glass: boolean;
}

/** A wall run's length (m). */
export const runLen = (r: WallRun): number => hyp2(r.x1 - r.x0, r.z1 - r.z0);

/**
 * The inner faces of the room's walls on its storey: every collide box at a quarter-turn yaw (no pitch) standing on the
 * floor (bottom <= floor + 0.1) at least 2.0 m tall over it, whose face lies within 0.35 of a room edge, clipped to the
 * room's extent along that edge. Door and window gaps are cut out by construction (the walls are built as separate
 * boxes either side of an opening); a box over a gap (a lintel) does not reach the floor and is no run. Glass boxes are
 * runs flagged `glass` (nothing mounts on them). Order: edges -x, +x, -z, +z, each by its start along the edge.
 */
export function wallRuns(boxes: readonly BoxPiece[], room: RoomRect, floorY: number): WallRun[] {
  const edges: WallRun[][] = [[], [], [], []];
  const near = 0.35;
  for (const b of boxes) {
    if (!b.collide || Math.abs(b.pitch) > 1e-6) continue;
    const q = Math.round(b.yaw / (Math.PI / 2));
    if (Math.abs(b.yaw - q * (Math.PI / 2)) > 1e-3) continue;
    const bot = b.c[1] - b.s[1] / 2;
    const top = b.c[1] + b.s[1] / 2;
    if (bot > floorY + 0.1 || top < floorY + 2.0) continue;
    const odd = ((q % 2) + 2) % 2 === 1;
    const hx = odd ? b.s[2] / 2 : b.s[0] / 2;
    const hz = odd ? b.s[0] / 2 : b.s[2] / 2;
    const x0 = b.c[0] - hx;
    const x1 = b.c[0] + hx;
    const z0 = b.c[2] - hz;
    const z1 = b.c[2] + hz;
    const glass = !!b.glass;
    const y0 = Math.max(bot, floorY);
    // -x edge: the box's +x face near room.minX, faces +x
    const zs = Math.max(z0, room.minZ);
    const ze = Math.min(z1, room.maxZ);
    if (ze - zs > 0.3) {
      if (Math.abs(x1 - room.minX) <= near && x0 < room.minX + near) edges[0]!.push({ x0: x1, z0: zs, x1, z1: ze, nx: 1, nz: 0, y0, y1: top, glass });
      if (Math.abs(x0 - room.maxX) <= near && x1 > room.maxX - near) edges[1]!.push({ x0, z0: zs, x1: x0, z1: ze, nx: -1, nz: 0, y0, y1: top, glass });
    }
    const xs = Math.max(x0, room.minX);
    const xe = Math.min(x1, room.maxX);
    if (xe - xs > 0.3) {
      if (Math.abs(z1 - room.minZ) <= near && z0 < room.minZ + near) edges[2]!.push({ x0: xs, z0: z1, x1: xe, z1, nx: 0, nz: 1, y0, y1: top, glass });
      if (Math.abs(z0 - room.maxZ) <= near && z1 > room.maxZ - near) edges[3]!.push({ x0: xs, z0, x1: xe, z1: z0, nx: 0, nz: -1, y0, y1: top, glass });
    }
  }
  edges[0]!.sort((a, b) => a.z0 - b.z0 || a.x0 - b.x0);
  edges[1]!.sort((a, b) => a.z0 - b.z0 || a.x0 - b.x0);
  edges[2]!.sort((a, b) => a.x0 - b.x0 || a.z0 - b.z0);
  edges[3]!.sort((a, b) => a.x0 - b.x0 || a.z0 - b.z0);
  return [...edges[0]!, ...edges[1]!, ...edges[2]!, ...edges[3]!];
}
