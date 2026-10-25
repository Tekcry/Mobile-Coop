/**
 * (marlow-bays item 30e, anim-skeleton S4b) The exact key preview's math (pure, Babylon-free, no allocation): the bake's
 * forward kinematics of a key's trunk and arms (`scripts/anim-keys/py/key_clip.py` `fk`), as `tuneKeys.ts` `build` needs
 * it to spread a key edit the way the Blender rebake does (docs/archive/anim-skeleton/s4b/REPORT.md):
 * - the trunk: each segment's local quaternion (pelvis, spine, chest, neck; body-frame ypr chained) taken into its
 *   bone's Blender channel frame (the bone's rest, `TRUNK_REST`), where the bake's curve interpolates each component;
 * - the arms: the upper arm and forearm directions (chest frame) of a key's flex / abd / elbow / inward, the elbow's
 *   carrying angle from the key file, and the shortest turn from one direction to another (the offset the sampler
 *   applies to the baked arm points).
 * Quaternions are (x, y, z, w), Hamilton products, as tests/keyedExactPreview.test.ts.
 */

const D2R = Math.PI / 180;

/**
 * The trunk bones' Blender rest (armature space, `tests/fixtures/key-curve-blender.json` `rest`: Wren's rig as
 * build_skeleton.py makes it; pelvis, spine, chest, neck). tests/keyedExactPreview.test.ts checks them against the fixture.
 */
export const TRUNK_REST_MATS: readonly (readonly (readonly number[])[])[] = [
  [
    [1, 0, 0],
    [0, 0, -1],
    [0, 1, 0],
  ],
  [
    [1, 0, 0],
    [0, 0, -1],
    [0, 1, 0],
  ],
  [
    [1, 0, 0],
    [0, 0, -1],
    [0, 1, 0],
  ],
  [
    [1, 0, 0],
    [0, -0.0666074, -0.9977793],
    [0, 0.9977793, -0.0666074],
  ],
];

/** A rotation matrix (rows) to a quaternion (x, y, z, w), into o[oo]. */
function matQ(m: readonly (readonly number[])[], o: Float64Array, oo: number): void {
  const a = m[0]![0]!;
  const b = m[0]![1]!;
  const c = m[0]![2]!;
  const d = m[1]![0]!;
  const e = m[1]![1]!;
  const f = m[1]![2]!;
  const g = m[2]![0]!;
  const h = m[2]![1]!;
  const i = m[2]![2]!;
  const tr = a + e + i;
  let x: number;
  let y: number;
  let z: number;
  let w: number;
  if (tr > 0) {
    const S = Math.sqrt(tr + 1) * 2;
    x = (h - f) / S;
    y = (c - g) / S;
    z = (d - b) / S;
    w = S / 4;
  } else if (a > e && a > i) {
    const S = Math.sqrt(1 + a - e - i) * 2;
    x = S / 4;
    y = (b + d) / S;
    z = (c + g) / S;
    w = (h - f) / S;
  } else if (e > i) {
    const S = Math.sqrt(1 + e - a - i) * 2;
    x = (b + d) / S;
    y = S / 4;
    z = (f + h) / S;
    w = (c - g) / S;
  } else {
    const S = Math.sqrt(1 + i - a - e) * 2;
    x = (c + g) / S;
    y = (f + h) / S;
    z = S / 4;
    w = (d - b) / S;
  }
  const l = Math.sqrt(x * x + y * y + z * z + w * w) || 1;
  o[oo] = x / l;
  o[oo + 1] = y / l;
  o[oo + 2] = z / l;
  o[oo + 3] = w / l;
}

/**
 * The trunk bones' channel frames P (4 quaternions, 16 numbers): a clip local q is P b P^-1 of the bone's Blender
 * quaternion b, P = -CI REST (key_clip.py `evaluated`; C improper, so the minus makes P a rotation).
 */
export const TRUNK_REST: Float64Array = (() => {
  const out = new Float64Array(16);
  const CI = [
    [-1, 0, 0],
    [0, 0, 1],
    [0, -1, 0],
  ];
  TRUNK_REST_MATS.forEach((R, s) => {
    const P = CI.map((row) => [0, 1, 2].map((j) => -(row[0]! * R[0]![j]! + row[1]! * R[1]![j]! + row[2]! * R[2]![j]!)));
    matQ(P, out, s * 4);
  });
  return out;
})();

/** o[oo] = a[ao] * b[bo] (Hamilton). `o` may alias `a` or `b`. */
export function qmulInto(a: ArrayLike<number>, ao: number, b: ArrayLike<number>, bo: number, o: { [i: number]: number }, oo: number): void {
  const ax = a[ao]!;
  const ay = a[ao + 1]!;
  const az = a[ao + 2]!;
  const aw = a[ao + 3]!;
  const bx = b[bo]!;
  const by = b[bo + 1]!;
  const bz = b[bo + 2]!;
  const bw = b[bo + 3]!;
  o[oo] = aw * bx + ax * bw + ay * bz - az * by;
  o[oo + 1] = aw * by - ax * bz + ay * bw + az * bx;
  o[oo + 2] = aw * bz + ax * by - ay * bx + az * bw;
  o[oo + 3] = aw * bw - ax * bx - ay * by - az * bz;
}

/** o[oo] = conj(a[ao]) * b[bo]. `o` may alias. */
export function qconjMulInto(a: ArrayLike<number>, ao: number, b: ArrayLike<number>, bo: number, o: { [i: number]: number }, oo: number): void {
  const ax = -a[ao]!;
  const ay = -a[ao + 1]!;
  const az = -a[ao + 2]!;
  const aw = a[ao + 3]!;
  const bx = b[bo]!;
  const by = b[bo + 1]!;
  const bz = b[bo + 2]!;
  const bw = b[bo + 3]!;
  o[oo] = aw * bx + ax * bw + ay * bz - az * by;
  o[oo + 1] = aw * by - ax * bz + ay * bw + az * bx;
  o[oo + 2] = aw * bz + ax * by - ay * bx + az * bw;
  o[oo + 3] = aw * bw - ax * bx - ay * by - az * bz;
}

/** o[oo] = a[ao] * conj(b[bo]). `o` may alias. */
export function qmulConjInto(a: ArrayLike<number>, ao: number, b: ArrayLike<number>, bo: number, o: { [i: number]: number }, oo: number): void {
  const ax = a[ao]!;
  const ay = a[ao + 1]!;
  const az = a[ao + 2]!;
  const aw = a[ao + 3]!;
  const bx = -b[bo]!;
  const by = -b[bo + 1]!;
  const bz = -b[bo + 2]!;
  const bw = b[bo + 3]!;
  o[oo] = aw * bx + ax * bw + ay * bz - az * by;
  o[oo + 1] = aw * by - ax * bz + ay * bw + az * bx;
  o[oo + 2] = aw * bz + ax * by - ay * bx + az * bw;
  o[oo + 3] = aw * bw - ax * bx - ay * by - az * bz;
}

/** Babylon's RotationYawPitchRoll (deg): Ry(yaw) Rx(pitch) Rz(roll), into o[oo]. */
export function yprInto(yaw: number, pitch: number, roll: number, o: { [i: number]: number }, oo: number): void {
  const hy = yaw * D2R * 0.5;
  const hp = pitch * D2R * 0.5;
  const hr = roll * D2R * 0.5;
  const cy = Math.cos(hy);
  const sy = Math.sin(hy);
  const cp = Math.cos(hp);
  const sp = Math.sin(hp);
  const cr = Math.cos(hr);
  const sr = Math.sin(hr);
  o[oo] = cy * sp * cr + sy * cp * sr;
  o[oo + 1] = sy * cp * cr - cy * sp * sr;
  o[oo + 2] = cy * cp * sr - sy * sp * cr;
  o[oo + 3] = cy * cp * cr + sy * sp * sr;
}

const W4 = new Float64Array(16);
const L4 = new Float64Array(4);

/**
 * One key's trunk in the bake's channel frames: `abs(j)` the key's absolute field values (pelvis, spine, chest, neck
 * yaw / pitch / roll at `ix[s]`), into o[oo .. oo + 15] (per segment P^-1 local P), each sign-aligned with `prev`
 * (prev[po ..], or none when po < 0) so the curve never crosses hemispheres between keys.
 */
export function trunkChannelsInto(v: ArrayLike<number>, vo: number, ix: readonly (readonly [number, number, number])[], o: Float64Array, oo: number, prev: Float64Array | null, po: number): void {
  for (let s = 0; s < 4; s++) {
    const i = ix[s]!;
    yprInto(v[vo + i[0]]!, v[vo + i[1]]!, v[vo + i[2]]!, W4, s * 4);
  }
  for (let s = 0; s < 4; s++) {
    // the local: W_parent^-1 W_s (the pelvis its own)
    if (s === 0) for (let c = 0; c < 4; c++) L4[c] = W4[c]!;
    else qconjMulInto(W4, (s - 1) * 4, W4, s * 4, L4, 0);
    // into the bone's channel frame: P^-1 L P
    qconjMulInto(TRUNK_REST, s * 4, L4, 0, L4, 0);
    qmulInto(L4, 0, TRUNK_REST, s * 4, L4, 0);
    const t = oo + s * 4;
    let sg = 1;
    if (prev && po >= 0) {
      const p = po + s * 4;
      if (L4[0]! * prev[p]! + L4[1]! * prev[p + 1]! + L4[2]! * prev[p + 2]! + L4[3]! * prev[p + 3]! < 0) sg = -1;
    }
    for (let c = 0; c < 4; c++) o[t + c] = sg * L4[c]!;
  }
}

/** A channel-frame quaternion e[eo] (unnormalised, a curve's value) of trunk segment `s` back to the clip's local frame: P e P^-1. */
export function trunkLocalInto(e: ArrayLike<number>, eo: number, s: number, o: { [i: number]: number }, oo: number): void {
  const l = Math.sqrt(e[eo]! ** 2 + e[eo + 1]! ** 2 + e[eo + 2]! ** 2 + e[eo + 3]! ** 2) || 1;
  L4[0] = e[eo]! / l;
  L4[1] = e[eo + 1]! / l;
  L4[2] = e[eo + 2]! / l;
  L4[3] = e[eo + 3]! / l;
  qmulInto(TRUNK_REST, s * 4, L4, 0, L4, 0);
  qmulConjInto(L4, 0, TRUNK_REST, s * 4, o, oo);
}

/** v rotated `deg` about axis 0 / 1 / 2 (x / y / z), in place at v[o]. */
function rotAxis(axis: 0 | 1 | 2, deg: number, v: Float64Array, o: number): void {
  const c = Math.cos(deg * D2R);
  const s = Math.sin(deg * D2R);
  const x = v[o]!;
  const y = v[o + 1]!;
  const z = v[o + 2]!;
  if (axis === 0) {
    v[o + 1] = c * y - s * z;
    v[o + 2] = s * y + c * z;
  } else if (axis === 1) {
    v[o] = c * x + s * z;
    v[o + 2] = -s * x + c * z;
  } else {
    v[o] = c * x - s * y;
    v[o + 1] = s * x + c * y;
  }
}

/** The upper arm's direction (chest frame) of flex `fl` and abd `ab` (deg) on side `s` (-1 left, 1 right): Rx(-fl) Rz(s ab) down. */
export function armUpInto(fl: number, ab: number, s: number, v: Float64Array, o: number): void {
  v[o] = 0;
  v[o + 1] = -1;
  v[o + 2] = 0;
  rotAxis(2, s * ab, v, o);
  rotAxis(0, -fl, v, o);
}

/** The forearm's direction (chest frame): Ry(-s inw) Rx(-(fl + el)) Rz(s (ab + carry)) down (key_clip.py `fk`). */
export function armForeInto(fl: number, ab: number, el: number, inw: number, s: number, carry: number, v: Float64Array, o: number): void {
  v[o] = 0;
  v[o + 1] = -1;
  v[o + 2] = 0;
  rotAxis(2, s * (ab + carry), v, o);
  rotAxis(0, -(fl + el), v, o);
  rotAxis(1, -s * inw, v, o);
}

/** The shortest rotation taking unit direction a[ao] to b[bo], into o[oo] (identity when they agree). */
export function betweenInto(a: ArrayLike<number>, ao: number, b: ArrayLike<number>, bo: number, o: { [i: number]: number }, oo: number): void {
  const ax = a[ao]!;
  const ay = a[ao + 1]!;
  const az = a[ao + 2]!;
  const bx = b[bo]!;
  const by = b[bo + 1]!;
  const bz = b[bo + 2]!;
  const w = 1 + ax * bx + ay * by + az * bz;
  const x = ay * bz - az * by;
  const y = az * bx - ax * bz;
  const z = ax * by - ay * bx;
  const l = Math.sqrt(x * x + y * y + z * z + w * w);
  if (!(l > 1e-12)) {
    o[oo] = 0;
    o[oo + 1] = 0;
    o[oo + 2] = 0;
    o[oo + 3] = 1;
    return;
  }
  o[oo] = x / l;
  o[oo + 1] = y / l;
  o[oo + 2] = z / l;
  o[oo + 3] = w / l;
}
