import { hyp3 } from '../core/mathx';
/** Small pure maths for procedural animation: vectors, two-bone IK, gait, springs. No Babylon. */

export interface V3 {
  x: number;
  y: number;
  z: number;
}

export const v3 = (x = 0, y = 0, z = 0): V3 => ({ x, y, z });
export const add = (a: V3, b: V3): V3 => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: V3, b: V3): V3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (a: V3, s: number): V3 => v3(a.x * s, a.y * s, a.z * s);
export const dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: V3, b: V3): V3 => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const len = (a: V3): number => hyp3(a.x, a.y, a.z);
export const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return v3(a.x / l, a.y / l, a.z / l);
};
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerpV = (a: V3, b: V3, t: number): V3 => v3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const smoothstep = (t: number): number => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};

/**
 * Two-bone IK: joint position for a chain root -> joint -> end of lengths a, b reaching for `target`,
 * bending towards `pole` (a direction). Unreachable targets straighten the chain (slightly short of
 * full extension, so knees/elbows never pop). Writes into `outJoint` / `outEnd` (Babylon Vector3s
 * work too) and allocates nothing.
 */
export function solveTwoBone(root: V3, target: V3, a: number, b: number, pole: V3, outJoint: V3, outEnd?: V3): void {
  let dx = target.x - root.x;
  let dy = target.y - root.y;
  let dz = target.z - root.z;
  const l = hyp3(dx, dy, dz) || 1e-6;
  dx /= l;
  dy /= l;
  dz /= l;
  const dist = clamp(l, Math.abs(a - b) + 1e-4, (a + b) * 0.999);
  const cosA = clamp((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  // bend direction: pole made perpendicular to the reach direction
  let pd = pole.x * dx + pole.y * dy + pole.z * dz;
  let bx = pole.x - dx * pd;
  let by = pole.y - dy * pd;
  let bz = pole.z - dz * pd;
  let bl = hyp3(bx, by, bz);
  if (bl < 1e-6) {
    // pole parallel to the reach: any perpendicular will do
    bx = Math.abs(dy) < 0.9 ? 0 : 0;
    by = Math.abs(dy) < 0.9 ? 1 : 0;
    bz = Math.abs(dy) < 0.9 ? 0 : 1;
    pd = bx * dx + by * dy + bz * dz;
    bx -= dx * pd;
    by -= dy * pd;
    bz -= dz * pd;
    bl = hyp3(bx, by, bz) || 1;
  }
  bx /= bl;
  by /= bl;
  bz /= bl;
  const ra = a * cosA;
  const rb = a * sinA;
  outJoint.x = root.x + dx * ra + bx * rb;
  outJoint.y = root.y + dy * ra + by * rb;
  outJoint.z = root.z + dz * ra + bz * rb;
  if (outEnd) {
    outEnd.x = root.x + dx * dist;
    outEnd.y = root.y + dy * dist;
    outEnd.z = root.z + dz * dist;
  }
}

/** Distance (m) from point (px, py, pz) to the segment a -> b. Allocates nothing. */
export function segDist(px: number, py: number, pz: number, a: V3, b: V3): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const ll = abx * abx + aby * aby + abz * abz;
  const t = ll > 1e-12 ? clamp(((px - a.x) * abx + (py - a.y) * aby + (pz - a.z) * abz) / ll, 0, 1) : 0;
  return hyp3(px - a.x - abx * t, py - a.y - aby * t, pz - a.z - abz * t);
}

/** Steps of the elbow swivel search (each side): 15 deg each, up to a half turn. */
const SWIVEL_STEPS = 12;

/**
 * (operators step 11e) Keep an elbow out of the trunk: the swivel angle (rad, right-handed about the shoulder -> wrist
 * axis) that turns elbow `e` round that axis until it is at least `r` from the trunk segment `p0` -> `p1`, keeping the
 * shoulder and wrist where they are (the hand stays on its grip). 0 when it is already clear; the smallest clearing
 * angle (15 deg steps, both ways), else the angle with the most clearance. Allocates nothing.
 */
export function elbowSwivelClear(s: V3, w: V3, e: V3, p0: V3, p1: V3, r: number): number {
  if (segDist(e.x, e.y, e.z, p0, p1) >= r) return 0;
  let ux = w.x - s.x;
  let uy = w.y - s.y;
  let uz = w.z - s.z;
  const ul = hyp3(ux, uy, uz);
  if (ul < 1e-5) return 0;
  ux /= ul;
  uy /= ul;
  uz /= ul;
  // the elbow's circle about the axis: centre c, radius vector q, and b = u x q (a quarter turn on)
  const ex = e.x - s.x;
  const ey = e.y - s.y;
  const ez = e.z - s.z;
  const along = ex * ux + ey * uy + ez * uz;
  const cx = s.x + ux * along;
  const cy = s.y + uy * along;
  const cz = s.z + uz * along;
  const qx = e.x - cx;
  const qy = e.y - cy;
  const qz = e.z - cz;
  const bx = uy * qz - uz * qy;
  const by = uz * qx - ux * qz;
  const bz = ux * qy - uy * qx;
  let best = 0;
  let bestD = -1;
  for (let k = 1; k <= SWIVEL_STEPS; k++) {
    for (let sg = -1; sg <= 1; sg += 2) {
      const th = (sg * k * Math.PI) / SWIVEL_STEPS;
      const co = Math.cos(th);
      const si = Math.sin(th);
      const d = segDist(cx + qx * co + bx * si, cy + qy * co + by * si, cz + qz * co + bz * si, p0, p1);
      if (d >= r) return th;
      if (d > bestD) {
        bestD = d;
        best = th;
      }
    }
  }
  return best;
}

/** Planted-foot gait. Phase 0..1; stance takes `duty` of the cycle, during which the foot moves
 *  backwards linearly (so its world speed is zero when stride/period matches ground speed). */
export function gaitFoot(phase: number, stride: number, lift: number, duty = 0.6): { along: number; up: number; planted: boolean } {
  const p = ((phase % 1) + 1) % 1;
  if (p < duty) {
    const t = p / duty;
    return { along: stride * (0.5 - t), up: 0, planted: true };
  }
  const t = (p - duty) / (1 - duty);
  const e = smoothstep(t);
  return { along: stride * (-0.5 + e), up: lift * Math.sin(Math.PI * t), planted: false };
}

/** Gait cadence: cycles per second so a stance foot stays planted at `speed` m/s. */
export function cadence(speed: number, stride: number, duty = 0.6): number {
  // during stance the foot covers `stride` in duty/cadence seconds -> speed = stride * cadence / duty
  return stride > 1e-4 ? (speed * duty) / stride : 0;
}

/** Critically damped spring towards `target` (value/velocity), stable for any dt. */
export function springStep(x: number, v: number, target: number, omega: number, dt: number): [number, number] {
  const e = Math.exp(-omega * dt);
  const d = x - target;
  const t1 = (v + omega * d) * dt;
  const nx = target + (d + t1) * e;
  const nv = (v - omega * t1) * e;
  return [nx, nv];
}

/** Exponential approach with a time constant in seconds (frame-rate independent). */
export function approach(x: number, target: number, tau: number, dt: number): number {
  return tau <= 0 ? target : target + (x - target) * Math.exp(-dt / tau);
}

/**
 * Critically damped spring with state in fields (allocation-free for per-frame use).
 * `omega` ~ 4 / settle time.
 */
export class Spring {
  constructor(
    public x = 0,
    public v = 0,
  ) {}

  step(target: number, omega: number, dt: number): number {
    const e = Math.exp(-omega * dt);
    const d = this.x - target;
    const t1 = (this.v + omega * d) * dt;
    this.x = target + (d + t1) * e;
    this.v = (this.v - omega * t1) * e;
    return this.x;
  }

  /** Add an instantaneous velocity kick (impulse). */
  kick(dv: number): void {
    this.v += dv;
  }

  reset(x = 0): void {
    this.x = x;
    this.v = 0;
  }
}
