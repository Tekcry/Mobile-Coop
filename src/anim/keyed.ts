/**
 * (CT prototype G8) Keyed gait clips (pure, Babylon-free): cycles keyed by hand in Blender on Wren's armature
 * (scripts/anim-keys, docs/ct-prototype/G8-PLAN.md) and sampled here on the graph's gait phase (left heel strike 0,
 * right 0.5). Each frame holds, in the body frame at 1.75 m (x right, y up, z forward):
 * - `pel` (3): the pelvis offset from its rest joint;
 * - `q` (16): the local quaternions (x, y, z, w) of pelvis, spine, chest and neck (their rest frames are the body's);
 * - `arm` (12): elbow L, wrist L, elbow R, wrist R from their shoulder joint, in the chest frame;
 * - `wrist` (8, optional, anim-rig): the local quaternions (x, y, z, w) of the left and right wrist relative to the
 *   forearm (the rig's wrist node under its elbow node), so a hand can turn away from the forearm (the knee hand: palm
 *   down, fingers forward). A clip without it samples identity (the hand continues the forearm), exactly as before.
 * - (marlow-bays T1a, item 17; optional) `fore` (8): the forearm twist L, R (a local quaternion of the elbow node, about
 *   the bone), `head` (4): the head's local turn on the neck, `sh` (8): the shoulder L, R (a rotation in the chest frame
 *   about the shoulder joint, the whole arm with it). A clip without one samples identity (the rig is untouched).
 * Per clip: the foot planner's `duty` and `liftH`, the knee pole's `kneeOut` and the track `half` width (ankle centre
 * from the midline). Sampling never allocates.
 */
import { TUNE_CUR, tuneKeyedLean, tuneKeyedTwist } from './tune';
import { keyWarpPhase } from './tuneKeysTime';

export interface KeyedClipDef {
  name: string;
  frames: number;
  duty: number;
  liftH: number;
  kneeOut: number;
  half: number;
  pel: readonly number[];
  q: readonly number[];
  arm: readonly number[];
  /** (anim-rig) Optional per-frame wrist frames: the L quaternion then the R quaternion (8 per frame). */
  wrist?: readonly number[];
  /** (T1a) Optional forearm twists L, R (8 per frame), head turns (4), shoulders L, R in the chest frame (8). */
  fore?: readonly number[];
  head?: readonly number[];
  sh?: readonly number[];
}

export interface KeyedClip {
  readonly name: string;
  readonly frames: number;
  readonly duty: number;
  readonly liftH: number;
  readonly kneeOut: number;
  readonly half: number;
  readonly pel: Float32Array;
  readonly q: Float32Array;
  readonly arm: Float32Array;
  /** (anim-rig) The wrist frames (8 per frame), or null: the clip keys no wrist (sampled as identity). */
  readonly wrist: Float32Array | null;
  /** The cycle's mean pose (the `amp` = 0 pose): pel 3, q 16 (normalised), arm 12, wrist 8 (normalised; identity without). */
  readonly meanPel: Float32Array;
  readonly meanQ: Float32Array;
  readonly meanArm: Float32Array;
  readonly meanWrist: Float32Array;
  /** (T1a) The forearm twist, head and shoulder frames (null: not keyed, sampled as identity) and their means. */
  readonly fore: Float32Array | null;
  readonly head: Float32Array | null;
  readonly sh: Float32Array | null;
  readonly meanFore: Float32Array;
  readonly meanHead: Float32Array;
  readonly meanSh: Float32Array;
  /** (tuner-v2 item 4) The per-key edit offsets (`tuneKeys` builds them on the first edit), or null: sampled exactly as baked. */
  keyOff: KeyedOffsets | null;
  /** (marlow-bays item 23) The key timing edits (`tuneKeys` sets them on the first retime), or null: the keys as baked. */
  keyTime: KeyedTime | null;
}

/**
 * (marlow-bays item 23) A clip's retimed keys: the sampler reads the baked clip at `keyWarpPhase` (piecewise linear
 * between the keys, `tuneKeysTime.ts`); the per-key offsets (`keyOff`, built on the retimed keys) at the phase itself.
 */
export interface KeyedTime {
  /** Keys in order (every key the bake poses). */
  n: number;
  /** The retimed and the baked key positions (bake frames, 48 a cycle; the first 0). */
  readonly newPos: Float64Array;
  readonly oldPos: Float64Array;
}

/**
 * (tuner-v2 item 4) One clip's per-key edits spread over its frames (`tuneKeys`): the sampler blends them between
 * frames and about their mean exactly as it blends the clip, then applies them. Quaternions (x, y, z, w) per frame.
 */
export interface KeyedOffsets {
  /** Pelvis, spine, chest, neck (16 a frame): each segment's offset in its own frame (the child is counter-turned). */
  readonly trunk: Float32Array;
  readonly trunkMean: Float32Array;
  /** Upper arm L, forearm L, upper arm R, forearm R (16 a frame): rotations in the chest frame. */
  readonly arm: Float32Array;
  readonly armMean: Float32Array;
  /** Wrist L, wrist R (8 a frame): offsets in the wrist's own frame. */
  readonly wrist: Float32Array;
  readonly wristMean: Float32Array;
  /** 1 when a wrist offset is set (a clip keying no wrist then samples wrist frames). */
  wristOn: number;
  /** (T1a) The pelvis offset (3 a frame, m in the 1.75 m body frame), added to `pel`. */
  readonly pel: Float32Array;
  readonly pelMean: Float32Array;
  pelOn: number;
  /** (T1a) Forearm twist L, R (8 a frame: local to the elbow node), head (4), shoulder L, R (8, chest frame). */
  readonly fore: Float32Array;
  readonly foreMean: Float32Array;
  foreOn: number;
  readonly head: Float32Array;
  readonly headMean: Float32Array;
  headOn: number;
  readonly sh: Float32Array;
  readonly shMean: Float32Array;
  shOn: number;
  /** (T1a) Upper arm twist L, R (2 a frame, rad about the shoulder-elbow line: the wrist point turns about it). */
  readonly twU: Float32Array;
  readonly twUMean: Float32Array;
  twUOn: number;
}

/** One sampled keyed pose (preallocate with `newKeyedPose`). */
export interface KeyedPose {
  readonly pel: Float64Array;
  readonly q: Float64Array;
  readonly arm: Float64Array;
  /** (anim-rig) Wrist L and R local quaternions relative to the forearm (identity when the clip keys none). */
  readonly wrist: Float64Array;
  /** (anim-rig) 1 when the sampled clip keys a wrist frame, else 0 (the rig then leaves the wrist alone). */
  hasWrist: number;
  /** (T1a) Forearm twist L, R (local to the elbow node), head (local on the look), shoulder L, R (chest frame); identity
   *  when not keyed, with their flags (0: the rig leaves that joint alone). */
  readonly fore: Float64Array;
  readonly head: Float64Array;
  readonly sh: Float64Array;
  hasFore: number;
  hasHead: number;
  hasSh: number;
  /**
   * (T1a, COVERAGE gap 4: the drawn set) The per-key edits as sampled, apart from the clip: the trunk offsets (16: pelvis,
   * spine, chest, neck, each in its own frame) and the arm offsets (16: upper arm L, forearm L, upper arm R, forearm R in
   * the chest frame), then the upper arm twists L, R (2, rad). With a gun in hand the rig applies them over the solved
   * upper body (`edOn` 1 when the sampled clip has edits).
   */
  readonly ed: Float64Array;
  edOn: number;
}

export const KEYED_PEL = 3;
export const KEYED_Q = 16;
export const KEYED_ARM = 12;
export const KEYED_WRIST = 8;
/** (T1a) Forearm twist, head and shoulder channels, and the edit channel (trunk 16, arms 16, twists 2). */
export const KEYED_FORE = 8;
export const KEYED_HEAD = 4;
export const KEYED_SH = 8;
export const KEYED_ED = 34;
/** (T1a) Edit channel slots: the trunk quaternions, the arm quaternions, the two upper arm twists (rad). */
export const KE = { trunk: 0, arm: 16, twist: 32 } as const;
/** Quaternion slots in `q` (offset of x). */
export const KQ = { pelvis: 0, spine: 4, chest: 8, neck: 12 } as const;
/** Arm points in `arm` (offset of x). */
export const KA = { elbowL: 0, wristL: 3, elbowR: 6, wristR: 9 } as const;
/** (anim-rig) Wrist frame slots in `wrist` (offset of x); (T1a) the same slots in `fore` and `sh`. */
export const KW = { wristL: 0, wristR: 4 } as const;

/** Quaternions (x y z w) at identity, `n` floats. */
function idQ(n: number): Float64Array {
  const q = new Float64Array(n);
  for (let s = 3; s < n; s += 4) q[s] = 1;
  return q;
}

export function newKeyedPose(): KeyedPose {
  const ed = new Float64Array(KEYED_ED);
  for (let s = 3; s < 32; s += 4) ed[s] = 1;
  return {
    pel: new Float64Array(KEYED_PEL),
    q: new Float64Array(KEYED_Q),
    arm: new Float64Array(KEYED_ARM),
    wrist: idQ(KEYED_WRIST),
    hasWrist: 0,
    fore: idQ(KEYED_FORE),
    head: idQ(KEYED_HEAD),
    sh: idQ(KEYED_SH),
    hasFore: 0,
    hasHead: 0,
    hasSh: 0,
    ed,
    edOn: 0,
  };
}

function check(def: KeyedClipDef, n: number, len: number, what: string): void {
  if (len !== def.frames * n) throw new Error(`keyed clip ${def.name}: ${what} has ${len} values, want ${def.frames * n}`);
}

/** Neighbouring frames of each quaternion (`stride` floats a frame) on the same hemisphere (the bake keeps them so; this guards a hand edit). */
function hemispheres(q: Float32Array, N: number, stride: number): void {
  for (let f = 1; f < N; f++) {
    const a = (f - 1) * stride;
    const b = f * stride;
    for (let s = 0; s < stride; s += 4) {
      const d = q[a + s]! * q[b + s]! + q[a + s + 1]! * q[b + s + 1]! + q[a + s + 2]! * q[b + s + 2]! + q[a + s + 3]! * q[b + s + 3]!;
      if (d < 0) for (let c = 0; c < 4; c++) q[b + s + c] = -q[b + s + c]!;
    }
  }
}

/** The per-frame mean of each quaternion (`stride` floats a frame), normalised. */
function meanQuats(q: Float32Array, N: number, stride: number): Float32Array {
  const m = new Float32Array(stride);
  for (let f = 0; f < N; f++) for (let c = 0; c < stride; c++) m[c]! += q[f * stride + c]! / N;
  for (let s = 0; s < stride; s += 4) {
    const l = Math.sqrt(m[s]! ** 2 + m[s + 1]! ** 2 + m[s + 2]! ** 2 + m[s + 3]! ** 2) || 1;
    for (let c = 0; c < 4; c++) m[s + c] = m[s + c]! / l;
  }
  return m;
}

/** Build a clip from its generated data (module load time only). */
export function keyedClip(def: KeyedClipDef): KeyedClip {
  check(def, KEYED_PEL, def.pel.length, 'pel');
  check(def, KEYED_Q, def.q.length, 'q');
  check(def, KEYED_ARM, def.arm.length, 'arm');
  if (def.wrist) check(def, KEYED_WRIST, def.wrist.length, 'wrist');
  if (def.fore) check(def, KEYED_FORE, def.fore.length, 'fore');
  if (def.head) check(def, KEYED_HEAD, def.head.length, 'head');
  if (def.sh) check(def, KEYED_SH, def.sh.length, 'sh');
  const N = def.frames;
  const q = Float32Array.from(def.q);
  hemispheres(q, N, KEYED_Q);
  const wrist = def.wrist ? Float32Array.from(def.wrist) : null;
  if (wrist) hemispheres(wrist, N, KEYED_WRIST);
  const meanPel = new Float32Array(KEYED_PEL);
  const meanArm = new Float32Array(KEYED_ARM);
  for (let f = 0; f < N; f++) {
    for (let c = 0; c < KEYED_PEL; c++) meanPel[c]! += def.pel[f * KEYED_PEL + c]! / N;
    for (let c = 0; c < KEYED_ARM; c++) meanArm[c]! += def.arm[f * KEYED_ARM + c]! / N;
  }
  const meanQ = meanQuats(q, N, KEYED_Q);
  let meanWrist: Float32Array;
  if (wrist) meanWrist = meanQuats(wrist, N, KEYED_WRIST);
  else {
    meanWrist = new Float32Array(KEYED_WRIST);
    meanWrist[3] = 1;
    meanWrist[7] = 1;
  }
  const opt = (v: readonly number[] | undefined, stride: number): [Float32Array | null, Float32Array] => {
    if (!v) {
      const m = new Float32Array(stride);
      for (let c = 3; c < stride; c += 4) m[c] = 1;
      return [null, m];
    }
    const a = Float32Array.from(v);
    hemispheres(a, N, stride);
    return [a, meanQuats(a, N, stride)];
  };
  const [fore, meanFore] = opt(def.fore, KEYED_FORE);
  const [head, meanHead] = opt(def.head, KEYED_HEAD);
  const [sh, meanSh] = opt(def.sh, KEYED_SH);
  return {
    name: def.name,
    frames: N,
    duty: def.duty,
    liftH: def.liftH,
    kneeOut: def.kneeOut,
    half: def.half,
    pel: Float32Array.from(def.pel),
    q,
    arm: Float32Array.from(def.arm),
    wrist,
    meanPel,
    meanQ,
    meanArm,
    meanWrist,
    fore,
    head,
    sh,
    meanFore,
    meanHead,
    meanSh,
    keyOff: null,
    keyTime: null,
  };
}

/**
 * Sample `clip` at gait `phase` (cycles, any real) into `out`, the cycle scaled about its mean by `amp` (1 = as keyed,
 * 0 = the mean pose: a slow walk swings less). Linear between frames, quaternions normalised (nlerp).
 */
export function sampleKeyed(clip: KeyedClip, phase: number, amp: number, out: KeyedPose): KeyedPose {
  const N = clip.frames;
  // (marlow-bays item 23) retimed keys: the baked clip read at the warped phase (null: exactly as before)
  const KT = clip.keyTime;
  const ph = KT ? keyWarpPhase(KT.newPos, KT.oldPos, KT.n, phase) : phase;
  const f = (((ph % 1) + 1) % 1) * N;
  const i0 = Math.floor(f) % N;
  const i1 = (i0 + 1) % N;
  const u = f - Math.floor(f);
  const P = clip.pel;
  for (let c = 0; c < KEYED_PEL; c++) {
    const v = P[i0 * KEYED_PEL + c]! + (P[i1 * KEYED_PEL + c]! - P[i0 * KEYED_PEL + c]!) * u;
    const m = clip.meanPel[c]!;
    out.pel[c] = m + (v - m) * amp;
  }
  const A = clip.arm;
  for (let c = 0; c < KEYED_ARM; c++) {
    const v = A[i0 * KEYED_ARM + c]! + (A[i1 * KEYED_ARM + c]! - A[i0 * KEYED_ARM + c]!) * u;
    const m = clip.meanArm[c]!;
    out.arm[c] = m + (v - m) * amp * TUNE_CUR.armSwingK;
  }
  sampleQuats(clip.q, clip.meanQ, KEYED_Q, i0, i1, u, amp, out.q);
  const K = clip.keyOff; // (tuner-v2 item 4) per-key edits: null unless the Keys section edits this clip
  // (item 23) the offsets are built on the retimed keys: read at the phase itself
  let j0 = i0;
  let j1 = i1;
  let v = u;
  if (K && KT) {
    const g = (((phase % 1) + 1) % 1) * N;
    j0 = Math.floor(g) % N;
    j1 = (j0 + 1) % N;
    v = g - Math.floor(g);
  }
  if (K) keyOffTrunk(K, j0, j1, v, amp, out.q);
  tuneKeyedTwist(out.q, clip.meanQ); // (anim-tuner) the trunk counter-rotation slider (identity at 1)
  tuneKeyedLean(out.q); // (anim-tuner) the forward lean slider (identity unless the local player's group sets one)
  const W = out.wrist;
  if (clip.wrist) {
    sampleQuats(clip.wrist, clip.meanWrist, KEYED_WRIST, i0, i1, u, amp, W);
    out.hasWrist = 1;
  } else {
    W[0] = 0; W[1] = 0; W[2] = 0; W[3] = 1;
    W[4] = 0; W[5] = 0; W[6] = 0; W[7] = 1;
    out.hasWrist = 0;
  }
  // (T1a) the forearm twist, head and shoulder channels (identity when not keyed)
  out.hasFore = optQuats(clip.fore, clip.meanFore, KEYED_FORE, i0, i1, u, amp, out.fore);
  out.hasHead = optQuats(clip.head, clip.meanHead, KEYED_HEAD, i0, i1, u, amp, out.head);
  out.hasSh = optQuats(clip.sh, clip.meanSh, KEYED_SH, i0, i1, u, amp, out.sh);
  if (K) {
    keyOffLimbs(K, j0, j1, v, amp, amp * TUNE_CUR.armSwingK, out);
    keyOffExtra(K, j0, j1, v, amp, amp * TUNE_CUR.armSwingK, out);
  } else edIdentity(out);
  return out;
}

// (tuner-v2 item 4) scratch for the per-key offsets (the sampled offset quaternions)
const OT = new Float64Array(KEYED_Q);
const OA = new Float64Array(KEYED_Q);
const OW = new Float64Array(KEYED_WRIST);
// (T1a) the pelvis shift, and one of the forearm / head / shoulder offsets
const OP = new Float64Array(KEYED_PEL);
const OX = new Float64Array(KEYED_SH);

const isId = (o: Float64Array, s: number): boolean => o[s] === 0 && o[s + 1] === 0 && o[s + 2] === 0 && o[s + 3] === 1;

/** q[s] = q[s] * b (`post`) or b * q[s], b = o[t] (conjugated when `cj` = -1). Hamilton product, no allocation. */
function qmul(q: Float64Array, s: number, o: Float64Array, t: number, post: boolean, cj: number): void {
  const bx = cj * o[t]!;
  const by = cj * o[t + 1]!;
  const bz = cj * o[t + 2]!;
  const bw = o[t + 3]!;
  const qx = q[s]!;
  const qy = q[s + 1]!;
  const qz = q[s + 2]!;
  const qw = q[s + 3]!;
  if (post) {
    q[s] = qw * bx + qx * bw + qy * bz - qz * by;
    q[s + 1] = qw * by - qx * bz + qy * bw + qz * bx;
    q[s + 2] = qw * bz + qx * by - qy * bx + qz * bw;
    q[s + 3] = qw * bw - qx * bx - qy * by - qz * bz;
  } else {
    q[s] = bw * qx + bx * qw + by * qz - bz * qy;
    q[s + 1] = bw * qy - bx * qz + by * qw + bz * qx;
    q[s + 2] = bw * qz + bx * qy - by * qx + bz * qw;
    q[s + 3] = bw * qw - bx * qx - by * qy - bz * qz;
  }
}

/** Rotate the point v[s..s+2] by the quaternion o[t] (v' = q v q*). */
function qrot(v: Float64Array, s: number, o: Float64Array, t: number): void {
  const x = o[t]!;
  const y = o[t + 1]!;
  const z = o[t + 2]!;
  const w = o[t + 3]!;
  const vx = v[s]!;
  const vy = v[s + 1]!;
  const vz = v[s + 2]!;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  v[s] = vx + w * tx + (y * tz - z * ty);
  v[s + 1] = vy + w * ty + (z * tx - x * tz);
  v[s + 2] = vz + w * tz + (x * ty - y * tx);
}

/** (tuner-v2 item 4) Trunk offsets: each segment turned in its own frame, its child counter-turned (key angles are body-frame). */
function keyOffTrunk(K: KeyedOffsets, i0: number, i1: number, u: number, amp: number, q: Float64Array): void {
  sampleQuats(K.trunk, K.trunkMean, KEYED_Q, i0, i1, u, amp, OT);
  for (let s = 0; s < KEYED_Q; s += 4) {
    if (isId(OT, s)) continue;
    qmul(q, s, OT, s, true, 1);
    if (s + 4 < KEYED_Q) qmul(q, s + 4, OT, s, false, -1);
  }
}

/** (tuner-v2 item 4) Arm offsets (upper arm about the shoulder, forearm about the elbow, chest frame), then the wrist frames. */
function keyOffLimbs(K: KeyedOffsets, i0: number, i1: number, u: number, amp: number, armAmp: number, out: KeyedPose): void {
  sampleQuats(K.arm, K.armMean, KEYED_Q, i0, i1, u, armAmp, OA);
  const a = out.arm;
  for (let side = 0; side < 2; side++) {
    const e = side * 6;
    const t = side * 8;
    if (isId(OA, t) && isId(OA, t + 4)) continue;
    // the forearm vector, the elbow turned about the shoulder, then the wrist = elbow + the turned forearm
    a[e + 3] = a[e + 3]! - a[e]!;
    a[e + 4] = a[e + 4]! - a[e + 1]!;
    a[e + 5] = a[e + 5]! - a[e + 2]!;
    qrot(a, e, OA, t);
    qrot(a, e + 3, OA, t + 4);
    a[e + 3] = a[e + 3]! + a[e]!;
    a[e + 4] = a[e + 4]! + a[e + 1]!;
    a[e + 5] = a[e + 5]! + a[e + 2]!;
  }
  if (!K.wristOn) return;
  sampleQuats(K.wrist, K.wristMean, KEYED_WRIST, i0, i1, u, amp, OW);
  for (let s = 0; s < KEYED_WRIST; s += 4) if (!isId(OW, s)) qmul(out.wrist, s, OW, s, true, 1);
  out.hasWrist = 1;
}

/** (T1a) An optional quaternion channel sampled into `out` (identity, 0, when the clip keys none; else 1). */
function optQuats(Q: Float32Array | null, M: Float32Array, stride: number, i0: number, i1: number, u: number, amp: number, out: Float64Array): number {
  if (Q) {
    sampleQuats(Q, M, stride, i0, i1, u, amp, out);
    return 1;
  }
  for (let s = 0; s < stride; s += 4) {
    out[s] = 0;
    out[s + 1] = 0;
    out[s + 2] = 0;
    out[s + 3] = 1;
  }
  return 0;
}

/** (T1a) The edit channel at identity (a clip with no per-key edits). */
function edIdentity(out: KeyedPose): void {
  const e = out.ed;
  for (let s = 0; s < 32; s += 4) {
    e[s] = 0;
    e[s + 1] = 0;
    e[s + 2] = 0;
    e[s + 3] = 1;
  }
  e[32] = 0;
  e[33] = 0;
  out.edOn = 0;
}

/** A scalar table (`stride` floats a frame) between frames, scaled about its mean by `amp`, into out[o..]. */
function sampleLin(T: Float32Array, M: Float32Array, stride: number, i0: number, i1: number, u: number, amp: number, out: Float64Array, o: number): void {
  for (let c = 0; c < stride; c++) {
    const v = T[i0 * stride + c]! + (T[i1 * stride + c]! - T[i0 * stride + c]!) * u;
    const m = M[c]!;
    out[o + c] = m + (v - m) * amp;
  }
}

/**
 * (T1a, item 17) The new key fields' offsets: the pelvis shift (added), the forearm twists (local to the elbow node), the
 * head (local) and the shoulders (chest frame) turned on with their flags set, the upper arm twists (the wrist point
 * turned about the shoulder-elbow line); and the edit channel (`ed`: the trunk and arm offsets as sampled, the twists)
 * for the drawn set. No allocation.
 */
function keyOffExtra(K: KeyedOffsets, i0: number, i1: number, u: number, amp: number, armAmp: number, out: KeyedPose): void {
  if (K.pelOn) {
    sampleLin(K.pel, K.pelMean, KEYED_PEL, i0, i1, u, amp, OP, 0);
    for (let c = 0; c < KEYED_PEL; c++) out.pel[c] = out.pel[c]! + OP[c]!;
  }
  if (K.foreOn) {
    sampleQuats(K.fore, K.foreMean, KEYED_FORE, i0, i1, u, armAmp, OX);
    for (let s = 0; s < KEYED_FORE; s += 4) if (!isId(OX, s)) qmul(out.fore, s, OX, s, true, 1);
    out.hasFore = 1;
  }
  if (K.headOn) {
    sampleQuats(K.head, K.headMean, KEYED_HEAD, i0, i1, u, amp, OX);
    if (!isId(OX, 0)) qmul(out.head, 0, OX, 0, true, 1);
    out.hasHead = 1;
  }
  if (K.shOn) {
    sampleQuats(K.sh, K.shMean, KEYED_SH, i0, i1, u, armAmp, OX);
    for (let s = 0; s < KEYED_SH; s += 4) if (!isId(OX, s)) qmul(out.sh, s, OX, s, false, 1);
    out.hasSh = 1;
  }
  const e = out.ed;
  for (let c = 0; c < KEYED_Q; c++) {
    e[KE.trunk + c] = OT[c]!;
    e[KE.arm + c] = OA[c]!;
  }
  e[KE.twist] = 0;
  e[KE.twist + 1] = 0;
  if (K.twUOn) {
    sampleLin(K.twU, K.twUMean, 2, i0, i1, u, armAmp, e, KE.twist);
    for (let side = 0; side < 2; side++) {
      const th = e[KE.twist + side]!;
      if (th !== 0) twistPoint(out.arm, side * 6, th);
    }
  }
  out.edOn = 1;
}

/** (T1a) The wrist point a[o+3..] turned by `th` (rad) about the shoulder-elbow line a[o..o+2] (Rodrigues). */
export function twistPoint(a: Float64Array, o: number, th: number): void {
  const ex = a[o]!;
  const ey = a[o + 1]!;
  const ez = a[o + 2]!;
  const l = Math.sqrt(ex * ex + ey * ey + ez * ez);
  if (l < 1e-9) return;
  const kx = ex / l;
  const ky = ey / l;
  const kz = ez / l;
  const vx = a[o + 3]! - ex;
  const vy = a[o + 4]! - ey;
  const vz = a[o + 5]! - ez;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const d = (kx * vx + ky * vy + kz * vz) * (1 - c);
  a[o + 3] = ex + vx * c + (ky * vz - kz * vy) * s + kx * d;
  a[o + 4] = ey + vy * c + (kz * vx - kx * vz) * s + ky * d;
  a[o + 5] = ez + vz * c + (kx * vy - ky * vx) * s + kz * d;
}

/** The quaternions of frames i0 -> i1 at `u` (nlerp), scaled about the mean `M` by `amp`, into `out`. No allocation. */
function sampleQuats(Q: Float32Array, M: Float32Array, stride: number, i0: number, i1: number, u: number, amp: number, out: Float64Array): void {
  for (let s = 0; s < stride; s += 4) {
    const a = i0 * stride + s;
    const b = i1 * stride + s;
    // the wrap from the last frame to the first may cross hemispheres
    const sg = Q[a]! * Q[b]! + Q[a + 1]! * Q[b + 1]! + Q[a + 2]! * Q[b + 2]! + Q[a + 3]! * Q[b + 3]! < 0 ? -1 : 1;
    let x = Q[a]! + (sg * Q[b]! - Q[a]!) * u;
    let y = Q[a + 1]! + (sg * Q[b + 1]! - Q[a + 1]!) * u;
    let z = Q[a + 2]! + (sg * Q[b + 2]! - Q[a + 2]!) * u;
    let w = Q[a + 3]! + (sg * Q[b + 3]! - Q[a + 3]!) * u;
    if (amp !== 1) {
      const sm = M[s]! * x + M[s + 1]! * y + M[s + 2]! * z + M[s + 3]! * w < 0 ? -1 : 1;
      x = sm * M[s]! + (x - sm * M[s]!) * amp;
      y = sm * M[s + 1]! + (y - sm * M[s + 1]!) * amp;
      z = sm * M[s + 2]! + (z - sm * M[s + 2]!) * amp;
      w = sm * M[s + 3]! + (w - sm * M[s + 3]!) * amp;
    }
    const l = Math.sqrt(x * x + y * y + z * z + w * w) || 1;
    out[s] = x / l;
    out[s + 1] = y / l;
    out[s + 2] = z / l;
    out[s + 3] = w / l;
  }
}

/**
 * (anim-rework S2) Blend two sampled poses into `out` (`out` may be `a`): `t` = 0 is `a`, 1 is `b`. Offsets and arm
 * points lerp, quaternions nlerp on the same hemisphere; a wrist frame counts when either pose keys one. The standing
 * speed blend (walk / jog / run) and the idle's share use it. (T1a) The head always blends; the forearm twists, the
 * shoulders and the edit channel blend with `edits` (default), else `a`'s are kept. No allocation.
 */
export function mixKeyed(a: KeyedPose, b: KeyedPose, t: number, out: KeyedPose, edits = true): KeyedPose {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  for (let c = 0; c < KEYED_PEL; c++) out.pel[c] = a.pel[c]! + (b.pel[c]! - a.pel[c]!) * u;
  for (let c = 0; c < KEYED_ARM; c++) out.arm[c] = a.arm[c]! + (b.arm[c]! - a.arm[c]!) * u;
  nlerpInto(a.q, b.q, KEYED_Q, u, out.q);
  nlerpInto(a.wrist, b.wrist, KEYED_WRIST, u, out.wrist);
  out.hasWrist = a.hasWrist || b.hasWrist ? 1 : 0;
  nlerpInto(a.head, b.head, KEYED_HEAD, u, out.head);
  out.hasHead = a.hasHead || b.hasHead ? 1 : 0;
  if (edits) {
    nlerpInto(a.fore, b.fore, KEYED_FORE, u, out.fore);
    nlerpInto(a.sh, b.sh, KEYED_SH, u, out.sh);
    out.hasFore = a.hasFore || b.hasFore ? 1 : 0;
    out.hasSh = a.hasSh || b.hasSh ? 1 : 0;
    nlerpInto(a.ed, b.ed, 32, u, out.ed);
    out.ed[32] = a.ed[32]! + (b.ed[32]! - a.ed[32]!) * u;
    out.ed[33] = a.ed[33]! + (b.ed[33]! - a.ed[33]!) * u;
    out.edOn = a.edOn || b.edOn ? 1 : 0;
  } else if (out !== a) {
    out.fore.set(a.fore);
    out.sh.set(a.sh);
    out.ed.set(a.ed);
    out.hasFore = a.hasFore;
    out.hasSh = a.hasSh;
    out.edOn = a.edOn;
  }
  return out;
}

/**
 * (T1a, COVERAGE gap 4) A pose's arm channels and edits cleared (identity): the drawn set's walk / jog / run legs and
 * trunk keep playing, but their holstered arms' twists, shoulders and edits never reach the gun arms. No allocation.
 */
export function clearKeyedArms(p: KeyedPose): KeyedPose {
  for (let s = 0; s < KEYED_FORE; s += 4) {
    p.fore[s] = p.fore[s + 1] = p.fore[s + 2] = 0;
    p.fore[s + 3] = 1;
    p.sh[s] = p.sh[s + 1] = p.sh[s + 2] = 0;
    p.sh[s + 3] = 1;
  }
  p.hasFore = p.hasSh = 0;
  edIdentity(p);
  return p;
}

function nlerpInto(A: Float64Array, B: Float64Array, stride: number, u: number, out: Float64Array): void {
  for (let s = 0; s < stride; s += 4) {
    const sg = A[s]! * B[s]! + A[s + 1]! * B[s + 1]! + A[s + 2]! * B[s + 2]! + A[s + 3]! * B[s + 3]! < 0 ? -1 : 1;
    const x = A[s]! + (sg * B[s]! - A[s]!) * u;
    const y = A[s + 1]! + (sg * B[s + 1]! - A[s + 1]!) * u;
    const z = A[s + 2]! + (sg * B[s + 2]! - A[s + 2]!) * u;
    const w = A[s + 3]! + (sg * B[s + 3]! - A[s + 3]!) * u;
    const l = Math.sqrt(x * x + y * y + z * z + w * w) || 1;
    out[s] = x / l;
    out[s + 1] = y / l;
    out[s + 2] = z / l;
    out[s + 3] = w / l;
  }
}

/** Quaternions at `a` and `b` swapped, each reflected through the body's YZ plane (y and z negated). */
function swapReflect(w: Float64Array, a: number, b: number): void {
  for (let c = 0; c < 4; c++) {
    const l = w[a + c]!;
    const r = w[b + c]!;
    w[a + c] = c === 1 || c === 2 ? -r : r;
    w[b + c] = c === 1 || c === 2 ? -l : l;
  }
}

/**
 * (anim-rework S3) Mirror a sampled pose left <-> right in place (as `mirror_key` in scripts/anim-keys/key_clip.py): the
 * pelvis x offset negated, each trunk quaternion reflected through the body's YZ plane (y and z negated: yaw and roll
 * flip, pitch stays), the arm points swapped side for side with x negated, the wrist frames swapped and reflected
 * ((T1a) the forearm twists and shoulders too, the head reflected, the edits mirrored). The left glide strafe plays the
 * right one mirrored, half a cycle on (S3-KEYS.md). No allocation.
 */
export function mirrorKeyed(p: KeyedPose): KeyedPose {
  p.pel[0] = -p.pel[0]!;
  const q = p.q;
  for (let s = 0; s < KEYED_Q; s += 4) {
    q[s + 1] = -q[s + 1]!;
    q[s + 2] = -q[s + 2]!;
  }
  const a = p.arm;
  for (let c = 0; c < 6; c++) {
    const l = a[c]!;
    const r = a[c + 6]!;
    a[c] = c % 3 === 0 ? -r : r;
    a[c + 6] = c % 3 === 0 ? -l : l;
  }
  swapReflect(p.wrist, 0, 4);
  swapReflect(p.fore, 0, 4);
  swapReflect(p.sh, 0, 4);
  p.head[1] = -p.head[1]!;
  p.head[2] = -p.head[2]!;
  const e = p.ed;
  for (let s = 0; s < 16; s += 4) {
    e[s + 1] = -e[s + 1]!;
    e[s + 2] = -e[s + 2]!;
  }
  swapReflect(e, KE.arm, KE.arm + 8);
  swapReflect(e, KE.arm + 4, KE.arm + 12);
  const t = e[KE.twist]!;
  e[KE.twist] = -e[KE.twist + 1]!;
  e[KE.twist + 1] = -t;
  return p;
}
