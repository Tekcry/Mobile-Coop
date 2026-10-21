/**
 * (anim-skeleton S2) Per-finger drive, pure (no Babylon, no allocation per frame). Each hand has five fingers (thumb,
 * index, middle, ring, little), each a curl (0 open .. 1 closed; a little past either end is allowed) and a spread
 * (-1 .. 1, +: away from the middle finger, the middle itself toward the index). The skinned figure's finger joints
 * (`fingerS_K_J`, K 1 thumb .. 5 little, J 1-3 from the knuckle out) turn by them:
 * - a finger's three joints (MCP, PIP, DIP) flex about the joint's own bend axis by curl x FINGER_MAX_DEG; the MCP also
 *   splays by spread x SPREAD_MAX_DEG;
 * - the thumb's base (CMC) swings across the palm (opposition) by curl x THUMB_MAX_DEG[0], its MCP and IP flex by the
 *   rest; its spread splays it away from the index.
 *
 * Axes: the Wren skeleton's finger bones lie along their local +Y; the bend axis is local +Z on the right hand and -Z
 * on the left (game frame; fitted to the hero's grip morphs on 2026-10-21: the fingertips close toward local -X / +X),
 * the splay axis local X. The thumb's axes are fitted the same way (right hand; the left mirrors x, -y, -z).
 *
 * Inputs and outputs use one flat layout: [hand][finger][curl, spread], hand 0 = left (FING_L), 1 = right (FING_R).
 */

export const FINGER_N = 5;
/** Offsets of each hand's ten values in a finger array (curl, spread per finger, thumb first). */
export const FING_L = 0;
export const FING_R = 10;
export const FING_LEN = 20;

/** Curl 1 per joint (deg): MCP, PIP, DIP. */
export const FINGER_MAX_DEG = [80, 95, 65] as const;
/** Curl 1 per thumb joint (deg): CMC (opposition, across the palm), MCP, IP. */
export const THUMB_MAX_DEG = [35, 40, 45] as const;
/** Spread 1 (deg) at the knuckle (thumb: at its base). */
export const SPREAD_MAX_DEG = 30;
/** Clamps on the composed values (a tuner or clip offset on top of a full grip stays in a sane range). */
export const CURL_LIMIT = { min: -0.25, max: 1.2 } as const;
export const SPREAD_LIMIT = 1.5;

/**
 * The game's hand closures as per-finger curls (thumb .. little), matching the old grip morph targets (A9): a free hand
 * is lightly curled (relax), the trigger hand closes three fingers round the grip with the index along the trigger, a
 * full wrap (a knife, a world grip, a held body) closes all five, the support hand cups the handguard / magazine.
 */
export const HAND_SHAPES = {
  relax: [0.15, 0.18, 0.22, 0.25, 0.28],
  trigger: [0.45, 0.3, 0.8, 0.85, 0.85],
  wrap: [0.55, 0.8, 0.85, 0.85, 0.85],
  support: [0.4, 0.65, 0.7, 0.75, 0.75],
} as const satisfies Record<string, readonly number[]>;

/**
 * The hands' base shape from the rig's grip closures (`handGrip`, 0..1 each) into `out` (FING_LEN): the relaxed shape
 * blended toward the grip shape by the closure, as the old morphs (relax x (1 - g) + grip x g). Spreads 0. `trigger`:
 * the right hand is on a weapon's trigger grip (else its full wrap).
 */
export function handGripShape(gripL: number, gripR: number, trigger: boolean, out: Float64Array): void {
  const rel = HAND_SHAPES.relax;
  const l = HAND_SHAPES.support;
  const r = trigger ? HAND_SHAPES.trigger : HAND_SHAPES.wrap;
  for (let f = 0; f < FINGER_N; f++) {
    const a = rel[f]!;
    out[FING_L + f * 2] = a + (l[f]! - a) * gripL;
    out[FING_L + f * 2 + 1] = 0;
    out[FING_R + f * 2] = a + (r[f]! - a) * gripR;
    out[FING_R + f * 2 + 1] = 0;
  }
}

/** Joint angles (rad) of finger `f` (0 thumb .. 4 little) at `curl`, segment `seg` (0 base .. 2 tip). */
export function fingerAngle(f: number, seg: number, curl: number): number {
  const c = Math.min(CURL_LIMIT.max, Math.max(CURL_LIMIT.min, curl));
  const max = f === 0 ? THUMB_MAX_DEG[seg]! : FINGER_MAX_DEG[seg]!;
  return (c * max * Math.PI) / 180;
}

/** The splay angle (rad) of a spread value. */
export function spreadAngle(spread: number): number {
  const s = Math.min(SPREAD_LIMIT, Math.max(-SPREAD_LIMIT, spread));
  return (s * SPREAD_MAX_DEG * Math.PI) / 180;
}

/** A file's finger joints and their axes in the bind (skeleton) frame. Built once per LOD file. */
export interface FingerRig {
  /** Skeleton slot of each finger joint. */
  slot: Int32Array;
  /** Per joint: hand (0 left, 1 right), finger (0 thumb .. 4), segment (0 .. 2). */
  hand: Uint8Array;
  finger: Uint8Array;
  seg: Uint8Array;
  /** Per joint: the bend axis and (segment 0) the splay axis, unit vectors in the bind frame (3 each). */
  flex: Float64Array;
  splay: Float64Array;
}

/** Local bend axes of the thumb's joints on the right hand (game frame; the left mirrors x, -y, -z). */
const THUMB_AXES: readonly (readonly [number, number, number])[] = [
  [-0.96, -0.15, -0.25],
  [0.98, 0.05, -0.18],
  [0.83, 0.07, 0.55],
];

const FINGER_RE = /^finger([LR])_([1-5])_([1-3])$/;

/** Rotates (x, y, z) by the unit quaternion q[o..o+4] into out[0..3]. */
function rot(q: ArrayLike<number>, o: number, x: number, y: number, z: number, out: Float64Array): void {
  const qx = q[o]!, qy = q[o + 1]!, qz = q[o + 2]!, qw = q[o + 3]!;
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  out[0] = x + qw * tx + (qy * tz - qz * ty);
  out[1] = y + qw * ty + (qz * tx - qx * tz);
  out[2] = z + qw * tz + (qx * ty - qy * tx);
}

/**
 * The finger joints of a skeleton (`names`, bind positions 3 / rotations 4 per slot, game frame) and their bind-frame
 * axes; null when it has none (LOD2). Load time only.
 */
export function fingerRig(names: readonly string[], bindPos: Float64Array, bindRot: Float64Array): FingerRig | null {
  const found: { s: number; h: number; f: number; j: number }[] = [];
  const knuckle = new Map<string, number>();
  for (let s = 0; s < names.length; s++) {
    const m = FINGER_RE.exec(names[s]!);
    if (!m) continue;
    const h = m[1] === 'L' ? 0 : 1;
    const f = Number(m[2]) - 1;
    const j = Number(m[3]) - 1;
    found.push({ s, h, f, j });
    if (j === 0) knuckle.set(`${h}${f}`, s);
  }
  if (!found.length) return null;
  const n = found.length;
  const r: FingerRig = {
    slot: new Int32Array(n), hand: new Uint8Array(n), finger: new Uint8Array(n), seg: new Uint8Array(n),
    flex: new Float64Array(n * 3), splay: new Float64Array(n * 3),
  };
  const a = new Float64Array(3);
  const d = new Float64Array(3);
  found.forEach(({ s, h, f, j }, i) => {
    r.slot[i] = s;
    r.hand[i] = h;
    r.finger[i] = f;
    r.seg[i] = j;
    const mx = h === 0 ? -1 : 1;
    // bend axis (local), the left hand mirrored (x, -y, -z)
    let lx = 0, ly = 0, lz = mx;
    if (f === 0) {
      const t = THUMB_AXES[j]!;
      lx = t[0];
      ly = t[1] * mx;
      lz = t[2] * mx;
    }
    rot(bindRot, s * 4, lx, ly, lz, a);
    let l = Math.sqrt(a[0]! * a[0]! + a[1]! * a[1]! + a[2]! * a[2]!);
    r.flex[i * 3] = a[0]! / l;
    r.flex[i * 3 + 1] = a[1]! / l;
    r.flex[i * 3 + 2] = a[2]! / l;
    if (j !== 0) return;
    // splay axis: local X on the fingers, local Z on the thumb; signed so + moves the finger away from the middle one
    // (the middle toward the index, the thumb away from the index)
    if (f === 0) rot(bindRot, s * 4, 0, 0, 1, a);
    else rot(bindRot, s * 4, 1, 0, 0, a);
    rot(bindRot, s * 4, 0, 1, 0, d);
    const mvx = a[1]! * d[2]! - a[2]! * d[1]!;
    const mvy = a[2]! * d[0]! - a[0]! * d[2]!;
    const mvz = a[0]! * d[1]! - a[1]! * d[0]!;
    // the side to splay toward: the thumb away from the index, the middle toward the index, the others away from the middle
    const from = f === 0 ? knuckle.get(`${h}1`) : f === 2 ? s : knuckle.get(`${h}2`);
    const to = f === 2 ? knuckle.get(`${h}1`) : s;
    let sg = 1;
    if (from !== undefined && to !== undefined && from !== to) {
      const lx2 = bindPos[to * 3]! - bindPos[from * 3]!;
      const ly2 = bindPos[to * 3 + 1]! - bindPos[from * 3 + 1]!;
      const lz2 = bindPos[to * 3 + 2]! - bindPos[from * 3 + 2]!;
      sg = mvx * lx2 + mvy * ly2 + mvz * lz2 >= 0 ? 1 : -1;
    }
    l = Math.sqrt(a[0]! * a[0]! + a[1]! * a[1]! + a[2]! * a[2]!);
    r.splay[i * 3] = (a[0]! / l) * sg;
    r.splay[i * 3 + 1] = (a[1]! / l) * sg;
    r.splay[i * 3 + 2] = (a[2]! / l) * sg;
  });
  return r;
}

/**
 * Each finger joint's rotation in the bind frame about the joint (out: 4 per skeleton slot; `on[slot]` = 1) from the
 * per-finger values `v` (FING_LEN). The poser chains them down each finger. No allocation.
 */
export function fingerPose(r: FingerRig, v: ArrayLike<number>, out: Float64Array, on: Uint8Array): void {
  const n = r.slot.length;
  for (let i = 0; i < n; i++) {
    const s = r.slot[i]!;
    const f = r.finger[i]!;
    const seg = r.seg[i]!;
    const base = (r.hand[i] === 0 ? FING_L : FING_R) + f * 2;
    const th = fingerAngle(f, seg, v[base]!) * 0.5;
    const sn = Math.sin(th);
    const fx = r.flex[i * 3]! * sn, fy = r.flex[i * 3 + 1]! * sn, fz = r.flex[i * 3 + 2]! * sn, fw = Math.cos(th);
    const o = s * 4;
    const sp = seg === 0 ? spreadAngle(v[base + 1]!) * 0.5 : 0;
    if (sp === 0) {
      out[o] = fx; out[o + 1] = fy; out[o + 2] = fz; out[o + 3] = fw;
    } else {
      // splay (bind frame) then the bend in the splayed finger: q = splay * flex
      const ss = Math.sin(sp);
      const ax = r.splay[i * 3]! * ss, ay = r.splay[i * 3 + 1]! * ss, az = r.splay[i * 3 + 2]! * ss, aw = Math.cos(sp);
      out[o] = aw * fx + ax * fw + ay * fz - az * fy;
      out[o + 1] = aw * fy - ax * fz + ay * fw + az * fx;
      out[o + 2] = aw * fz + ax * fy - ay * fx + az * fw;
      out[o + 3] = aw * fw - ax * fx - ay * fy - az * fz;
    }
    on[s] = 1;
  }
}
