/**
 * (feature/weapons) How a body's hand sits on a weapon (pure, Babylon-free). Given the hand's own frame in the arm's
 * hanging rest (knuckle direction, palm normal, palm centre from the wrist: `HandFrame`) and a hold's target frame in
 * weapon space, `solveHold` gives the wrist's rotation relative to the weapon and the wrist's offset from the weapon's
 * hand point, so the palm lands on the grip with the knuckles round it. Michael 2026-10-19: "Make sure they line up and
 * are believable".
 *
 * Hold frames are written for the right hand (weapon space: x right, y up, z along the bore); a left hand mirrors x.
 */

export type V3 = readonly [number, number, number];

/** A hand in the arm's hanging rest (rig root frame): knuckle direction, palm normal (out of the palm), palm centre. */
export interface HandFrame {
  d: V3;
  n: V3;
  palm: V3;
}

/** Where a hand goes on the weapon (right-hand convention): knuckle direction, palm normal, palm centre from the point. */
export interface HoldTarget {
  d: V3;
  n: V3;
  palm: V3;
}

/**
 * The holds. trigger: the palm on the right side of a pistol grip raked about 18 degrees, the knuckles forward and down
 * round its front. tube: the support palm up under a handguard or launcher tube, the knuckles across to the far side.
 * cup: the support hand over the trigger hand's fingers on a pistol grip, palm in, knuckles forward and down.
 */
export const HOLDS = {
  trigger: { d: [-0.2, -0.31, 0.95], n: [-1, 0, 0], palm: [0.027, 0.002, -0.004] },
  tube: { d: [-0.7, 0.15, 0.7], n: [-0.2, 1, 0], palm: [0.006, -0.013, 0] },
  cup: { d: [-0.2, -0.55, 0.8], n: [-1, 0.25, 0], palm: [0.016, 0, 0.004] },
} as const satisfies Record<string, HoldTarget>;
export type HoldName = keyof typeof HOLDS;

function norm(a: readonly number[]): [number, number, number] {
  const l = Math.sqrt(a[0]! * a[0]! + a[1]! * a[1]! + a[2]! * a[2]!) || 1;
  return [a[0]! / l, a[1]! / l, a[2]! / l];
}
function cross(a: V3, b: V3): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
/** An orthonormal frame [d, n', d x n'] from a direction and a roughly perpendicular normal. */
function frame(d0: V3, n0: V3): [V3, V3, V3] {
  const d = norm(d0);
  const k = n0[0] * d[0] + n0[1] * d[1] + n0[2] * d[2];
  const n = norm([n0[0] - k * d[0], n0[1] - k * d[1], n0[2] - k * d[2]]);
  return [d, n, cross(d, n)];
}

/** Quaternion (x, y, z, w) of a rotation matrix given by its columns. */
export function quatFromColumns(c0: V3, c1: V3, c2: V3): [number, number, number, number] {
  const m00 = c0[0], m10 = c0[1], m20 = c0[2];
  const m01 = c1[0], m11 = c1[1], m21 = c1[2];
  const m02 = c2[0], m12 = c2[1], m22 = c2[2];
  const tr = m00 + m11 + m22;
  let x: number, y: number, z: number, w: number;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    w = s / 4; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s;
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    w = (m21 - m12) / s; x = s / 4; y = (m01 + m10) / s; z = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    w = (m02 - m20) / s; x = (m01 + m10) / s; y = s / 4; z = (m12 + m21) / s;
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = s / 4;
  }
  return [x, y, z, w];
}

export interface SolvedHold {
  /** Wrist rotation relative to the weapon (x, y, z, w): weapon rotation x this = the wrist's world rotation. */
  q: [number, number, number, number];
  /** Wrist position relative to the weapon's hand point, weapon space. */
  wrist: [number, number, number];
}

/** Rotates v by the rotation whose matrix columns are [a, b, c] applied after the inverse of [e, f, g]. */
function apply(t: [V3, V3, V3], h: [V3, V3, V3], v: V3): [number, number, number] {
  // coordinates of v in the hand frame, then rebuilt in the target frame
  const c = [h[0][0] * v[0] + h[0][1] * v[1] + h[0][2] * v[2], h[1][0] * v[0] + h[1][1] * v[1] + h[1][2] * v[2], h[2][0] * v[0] + h[2][1] * v[1] + h[2][2] * v[2]];
  return [t[0][0] * c[0]! + t[1][0] * c[1]! + t[2][0] * c[2]!, t[0][1] * c[0]! + t[1][1] * c[1]! + t[2][1] * c[2]!, t[0][2] * c[0]! + t[1][2] * c[1]! + t[2][2] * c[2]!];
}

/** The wrist's rotation and offset for a hand (its own rest frame) in a hold; side -1 mirrors the hold for a left hand. */
export function solveHold(hand: HandFrame, hold: HoldTarget, side: 1 | -1): SolvedHold {
  const td: V3 = [hold.d[0] * side, hold.d[1], hold.d[2]];
  const tn: V3 = [hold.n[0] * side, hold.n[1], hold.n[2]];
  const T = frame(td, tn);
  const H = frame(hand.d, hand.n);
  // Q = T * H^T: columns are Q applied to the unit axes
  const c0 = apply(T, H, [1, 0, 0]);
  const c1 = apply(T, H, [0, 1, 0]);
  const c2 = apply(T, H, [0, 0, 1]);
  const q = quatFromColumns(c0, c1, c2);
  const p = apply(T, H, hand.palm);
  return { q, wrist: [hold.palm[0] * side - p[0], hold.palm[1] - p[1], hold.palm[2] - p[2]] };
}

/** Rotates v by the quaternion q (x, y, z, w). */
export function rotateQ(q: readonly number[], v: V3): [number, number, number] {
  const [x, y, z, w] = q as [number, number, number, number];
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}

// ---- (anim-cleanup slice 3) world grips: the same solve without allocating (the rig runs it every frame) ----

const S9 = new Float64Array(9);
const H9 = new Float64Array(9);
const M9 = new Float64Array(9);

/** Orthonormal frame [d, n', d x n'] into `o` (columns) from a direction and a roughly perpendicular normal. */
function frameInto(dx: number, dy: number, dz: number, nx: number, ny: number, nz: number, o: Float64Array): boolean {
  let l = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (l < 1e-6) return false;
  dx /= l; dy /= l; dz /= l;
  const k = nx * dx + ny * dy + nz * dz;
  nx -= k * dx; ny -= k * dy; nz -= k * dz;
  l = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (l < 1e-6) return false;
  nx /= l; ny /= l; nz /= l;
  o[0] = dx; o[1] = dy; o[2] = dz;
  o[3] = nx; o[4] = ny; o[5] = nz;
  o[6] = dy * nz - dz * ny; o[7] = dz * nx - dx * nz; o[8] = dx * ny - dy * nx;
  return true;
}

/**
 * The wrist's rotation (x, y, z, w into out[0..3]) taking a hand's rest frame onto a target frame (knuckles `d`, palm
 * normal `n`, both in the hand's rest space: the rig root frame), and the rest palm offset rotated by it (out[4..6]).
 * False when the target is degenerate. No allocation.
 */
export function holdInto(hand: HandFrame, dx: number, dy: number, dz: number, nx: number, ny: number, nz: number, out: Float64Array): boolean {
  if (!frameInto(dx, dy, dz, nx, ny, nz, S9)) return false;
  frameInto(hand.d[0], hand.d[1], hand.d[2], hand.n[0], hand.n[1], hand.n[2], H9);
  // M = S * H^T (columns: S applied to H's rows)
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) M9[c * 3 + r] = S9[r]! * H9[c]! + S9[3 + r]! * H9[3 + c]! + S9[6 + r]! * H9[6 + c]!;
  }
  const m00 = M9[0]!, m10 = M9[1]!, m20 = M9[2]!, m01 = M9[3]!, m11 = M9[4]!, m21 = M9[5]!, m02 = M9[6]!, m12 = M9[7]!, m22 = M9[8]!;
  const tr = m00 + m11 + m22;
  let x: number, y: number, z: number, w: number;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    w = s / 4; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s;
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    w = (m21 - m12) / s; x = s / 4; y = (m01 + m10) / s; z = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    w = (m02 - m20) / s; x = (m01 + m10) / s; y = s / 4; z = (m12 + m21) / s;
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = s / 4;
  }
  out[0] = x; out[1] = y; out[2] = z; out[3] = w;
  const p = hand.palm;
  out[4] = m00 * p[0] + m01 * p[1] + m02 * p[2];
  out[5] = m10 * p[0] + m11 * p[1] + m12 * p[2];
  out[6] = m20 * p[0] + m21 * p[1] + m22 * p[2];
  return true;
}
