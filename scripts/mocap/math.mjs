// (mocap-trial) Small 3D maths for the mocap pipeline: 3x3 matrices (row-major, column vectors: v' = M v) and
// quaternions [x, y, z, w] acting on coordinates as v' = q v q^-1 (the same as Babylon's applyRotationQuaternion).
// Offline only (scripts/mocap/**); allocation is fine here.

export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;

export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]),
  norm: (a) => {
    const l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  dist: (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2),
  distXZ: (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2),
};

export const m3 = {
  I: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
  mul: (a, b) => {
    const r = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    return r;
  },
  apply: (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]],
  T: (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]],
  rx: (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; },
  ry: (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; },
  rz: (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; },
};

export const q4 = {
  I: () => [0, 0, 0, 1],
  mul: (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ],
  conj: (q) => [-q[0], -q[1], -q[2], q[3]],
  norm: (q) => {
    const l = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]) || 1;
    return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
  },
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3],
  /** Same hemisphere as `ref` (for blending and continuity). */
  align: (q, ref) => (q[0] * ref[0] + q[1] * ref[1] + q[2] * ref[2] + q[3] * ref[3] < 0 ? [-q[0], -q[1], -q[2], -q[3]] : q),
  axisAngle: (axis, a) => {
    const n = v3.norm(axis), s = Math.sin(a / 2);
    return [n[0] * s, n[1] * s, n[2] * s, Math.cos(a / 2)];
  },
  rotate: (q, v) => {
    // v' = v + 2w (u x v) + 2 u x (u x v)
    const u = [q[0], q[1], q[2]], w = q[3];
    const t = v3.scale(v3.cross(u, v), 2);
    return v3.add(v3.add(v, v3.scale(t, w)), v3.cross(u, t));
  },
  angle: (q) => 2 * Math.acos(Math.min(1, Math.abs(q[3]))),
  /** Angle between two rotations (radians). */
  between: (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]))),
  slerp: (a, b0, t) => {
    let b = b0;
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = [-b[0], -b[1], -b[2], -b[3]]; d = -d; }
    if (d > 0.9995) return q4.norm([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]);
    const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb, a[3] * wa + b[3] * wb];
  },
  /** Shortest-arc rotation taking unit direction a onto b. */
  arc: (a0, b0) => {
    const a = v3.norm(a0), b = v3.norm(b0), d = v3.dot(a, b);
    if (d < -0.999999) {
      const p = Math.abs(a[0]) < 0.9 ? v3.cross(a, [1, 0, 0]) : v3.cross(a, [0, 1, 0]);
      return q4.axisAngle(p, Math.PI);
    }
    const c = v3.cross(a, b);
    return q4.norm([c[0], c[1], c[2], 1 + d]);
  },
  fromMat: (m) => {
    const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = m;
    const tr = m00 + m11 + m22;
    let q;
    if (tr > 0) {
      const s = Math.sqrt(tr + 1) * 2;
      q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s];
    } else if (m00 > m11 && m00 > m22) {
      const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
      q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
    } else if (m11 > m22) {
      const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
      q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
    } else {
      const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
      q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
    }
    return q4.norm(q);
  },
  yaw: (a) => [0, Math.sin(a / 2), 0, Math.cos(a / 2)],
};

/** Heading (radians) of a horizontal direction in the game frame: 0 = +Z, + turns toward +X (right). */
export const headingOf = (d) => Math.atan2(d[0], d[2]);
/** Wrap an angle to (-pi, pi]. */
export const wrapPi = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
/** Unwrap a sequence of angles in place-free fashion. */
export const unwrap = (arr) => {
  const out = [arr[0]];
  for (let i = 1; i < arr.length; i++) out.push(out[i - 1] + wrapPi(arr[i] - arr[i - 1]));
  return out;
};
export const median = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
export const pct = (a, p) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))];
};
/** Centred moving average over +-w samples (edges use the samples available). */
export const smooth = (arr, w) => arr.map((_, i) => {
  let s = 0, n = 0;
  for (let k = Math.max(0, i - w); k <= Math.min(arr.length - 1, i + w); k++) { s += arr[k]; n++; }
  return s / n;
});
