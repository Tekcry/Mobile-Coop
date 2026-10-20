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
 * Per clip: the foot planner's `duty` and `liftH`, the knee pole's `kneeOut` and the track `half` width (ankle centre
 * from the midline). Sampling never allocates.
 */

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
}

export const KEYED_PEL = 3;
export const KEYED_Q = 16;
export const KEYED_ARM = 12;
export const KEYED_WRIST = 8;
/** Quaternion slots in `q` (offset of x). */
export const KQ = { pelvis: 0, spine: 4, chest: 8, neck: 12 } as const;
/** Arm points in `arm` (offset of x). */
export const KA = { elbowL: 0, wristL: 3, elbowR: 6, wristR: 9 } as const;
/** (anim-rig) Wrist frame slots in `wrist` (offset of x). */
export const KW = { wristL: 0, wristR: 4 } as const;

export function newKeyedPose(): KeyedPose {
  const wrist = new Float64Array(KEYED_WRIST);
  wrist[3] = 1;
  wrist[7] = 1;
  return { pel: new Float64Array(KEYED_PEL), q: new Float64Array(KEYED_Q), arm: new Float64Array(KEYED_ARM), wrist, hasWrist: 0 };
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
  };
}

/**
 * Sample `clip` at gait `phase` (cycles, any real) into `out`, the cycle scaled about its mean by `amp` (1 = as keyed,
 * 0 = the mean pose: a slow walk swings less). Linear between frames, quaternions normalised (nlerp).
 */
export function sampleKeyed(clip: KeyedClip, phase: number, amp: number, out: KeyedPose): KeyedPose {
  const N = clip.frames;
  const f = (((phase % 1) + 1) % 1) * N;
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
    out.arm[c] = m + (v - m) * amp;
  }
  sampleQuats(clip.q, clip.meanQ, KEYED_Q, i0, i1, u, amp, out.q);
  const W = out.wrist;
  if (clip.wrist) {
    sampleQuats(clip.wrist, clip.meanWrist, KEYED_WRIST, i0, i1, u, amp, W);
    out.hasWrist = 1;
  } else {
    W[0] = 0; W[1] = 0; W[2] = 0; W[3] = 1;
    W[4] = 0; W[5] = 0; W[6] = 0; W[7] = 1;
    out.hasWrist = 0;
  }
  return out;
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
