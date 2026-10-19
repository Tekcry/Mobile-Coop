/**
 * (CT prototype G8) Keyed gait clips (pure, Babylon-free): cycles keyed by hand in Blender on Wren's armature
 * (scripts/anim-keys, docs/ct-prototype/G8-PLAN.md) and sampled here on the graph's gait phase (left heel strike 0,
 * right 0.5). Each frame holds, in the body frame at 1.75 m (x right, y up, z forward):
 * - `pel` (3): the pelvis offset from its rest joint;
 * - `q` (16): the local quaternions (x, y, z, w) of pelvis, spine, chest and neck (their rest frames are the body's);
 * - `arm` (12): elbow L, wrist L, elbow R, wrist R from their shoulder joint, in the chest frame.
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
  /** The cycle's mean pose (the `amp` = 0 pose): pel 3, q 16 (normalised), arm 12. */
  readonly meanPel: Float32Array;
  readonly meanQ: Float32Array;
  readonly meanArm: Float32Array;
}

/** One sampled keyed pose (preallocate with `newKeyedPose`). */
export interface KeyedPose {
  readonly pel: Float64Array;
  readonly q: Float64Array;
  readonly arm: Float64Array;
}

export const KEYED_PEL = 3;
export const KEYED_Q = 16;
export const KEYED_ARM = 12;
/** Quaternion slots in `q` (offset of x). */
export const KQ = { pelvis: 0, spine: 4, chest: 8, neck: 12 } as const;
/** Arm points in `arm` (offset of x). */
export const KA = { elbowL: 0, wristL: 3, elbowR: 6, wristR: 9 } as const;

export function newKeyedPose(): KeyedPose {
  return { pel: new Float64Array(KEYED_PEL), q: new Float64Array(KEYED_Q), arm: new Float64Array(KEYED_ARM) };
}

function check(def: KeyedClipDef, n: number, len: number, what: string): void {
  if (len !== def.frames * n) throw new Error(`keyed clip ${def.name}: ${what} has ${len} values, want ${def.frames * n}`);
}

/** Build a clip from its generated data (module load time only). */
export function keyedClip(def: KeyedClipDef): KeyedClip {
  check(def, KEYED_PEL, def.pel.length, 'pel');
  check(def, KEYED_Q, def.q.length, 'q');
  check(def, KEYED_ARM, def.arm.length, 'arm');
  const N = def.frames;
  const q = Float32Array.from(def.q);
  // neighbouring frames on the same quaternion hemisphere (the bake keeps them so; this guards a hand edit)
  for (let f = 1; f <= N; f++) {
    const a = ((f - 1) % N) * KEYED_Q;
    const b = (f % N) * KEYED_Q;
    for (let s = 0; s < KEYED_Q; s += 4) {
      const d = q[a + s]! * q[b + s]! + q[a + s + 1]! * q[b + s + 1]! + q[a + s + 2]! * q[b + s + 2]! + q[a + s + 3]! * q[b + s + 3]!;
      if (d < 0 && f < N) for (let c = 0; c < 4; c++) q[b + s + c] = -q[b + s + c]!;
    }
  }
  const meanPel = new Float32Array(KEYED_PEL);
  const meanQ = new Float32Array(KEYED_Q);
  const meanArm = new Float32Array(KEYED_ARM);
  for (let f = 0; f < N; f++) {
    for (let c = 0; c < KEYED_PEL; c++) meanPel[c]! += def.pel[f * KEYED_PEL + c]! / N;
    for (let c = 0; c < KEYED_Q; c++) meanQ[c]! += q[f * KEYED_Q + c]! / N;
    for (let c = 0; c < KEYED_ARM; c++) meanArm[c]! += def.arm[f * KEYED_ARM + c]! / N;
  }
  for (let s = 0; s < KEYED_Q; s += 4) {
    const l = Math.sqrt(meanQ[s]! ** 2 + meanQ[s + 1]! ** 2 + meanQ[s + 2]! ** 2 + meanQ[s + 3]! ** 2) || 1;
    for (let c = 0; c < 4; c++) meanQ[s + c] = meanQ[s + c]! / l;
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
    meanPel,
    meanQ,
    meanArm,
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
  const Q = clip.q;
  const M = clip.meanQ;
  for (let s = 0; s < KEYED_Q; s += 4) {
    const a = i0 * KEYED_Q + s;
    const b = i1 * KEYED_Q + s;
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
    out.q[s] = x / l;
    out.q[s + 1] = y / l;
    out.q[s + 2] = z / l;
    out.q[s + 3] = w / l;
  }
  return out;
}
