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
 * - (anim-skeleton S3; optional) `clav` (8): the clavicle L, R as local quaternions (x, y, z, w) of the rig's clavicle
 *   nodes in the chest frame (a shrug, a shoulder pushed forward); `fing` (20, A6): per hand L then R, per finger thumb
 *   .. little, [curl, spread] added to the grip's shape (anim/fingers.ts units: curl 1 = closed, spread 1 = 30 deg);
 *   `leg` (22, A7): per side L then R (11 each, `KL`): the hip's local quaternion (4, under the pelvis), the knee flex
 *   (1, rad, + bends the shin back), the ankle's local quaternion (4, under the knee), the toe (1, rad, the toe roll's
 *   pitch: - bends the toes up), the FK weight (1, 0..1: 0 the foot planner's IK leg as without the channel, 1 the clip's FK leg). A clip
 *   without one samples identity / 0 (the rig is untouched). (S4) Per-key edits (`keyOff`) reach them: `clav` turned on
 *   top in the chest frame, `fing` added, the FK weight added (clips with `leg` only).
 * - (anim-skeleton S4; optional) `legd` (18, `KD`): per side L then R (9 each) deltas on the foot planner's solved IK leg,
 *   rad in the rig's local frames (each joint's own node: x the hinge, y along the bone, z forward; the rig's
 *   `RotationYawPitchRoll` order): hip pitch, yaw, roll, knee (+ bends the shin back), ankle pitch, roll, toe (the toe
 *   roll's sense), (tuner-clarity S2) ankle yaw (the foot about the ankle's y) and shin twist (the shin about its bone,
 *   after the knee delta). The rig turns a swinging leg by them and re-solves a planted one onto its plant with them
 *   folded in (the shin twist then turns the foot about the shin).
 *   The key files' `legX.d` degrees are anatomical (the same sense on both sides): `LEGD_SIGN` converts. A clip without
 *   it samples 0 (the rig is untouched).
 * - (mocap-trial; optional) `feet` (10, `KF`): per side L then R the ankle in the ROOT frame (x right, y up, z forward,
 *   1.75 m body units: x, z from the root's ground point, y the ankle's lift over its flat-foot rest height), the foot's
 *   pitch (rad, + heel up / toe down, the planner's sense) and contact (0 / 1). With the clip's `stride` (the root's
 *   travel over one cycle, 1.75 m units) it drives the "clip feet" mode of the foot planner (`FootPlanner`, mocap set
 *   only): the clip places the steps, the planner only grounds and pins them. Sampled at full amplitude (never scaled by
 *   `amp`: the stride must match the travel). A clip without it samples 0 with `hasFeet` 0 (the planner's steps).
 *   docs/mocap-trial/CLIP-FORMAT.md.
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
  /** (anim-skeleton S3) Optional clavicles L, R (8 per frame), fingers (20), FK legs (22). */
  clav?: readonly number[];
  fing?: readonly number[];
  leg?: readonly number[];
  /** (anim-skeleton S4) Optional leg deltas on the IK legs (`KEYED_LEGD` = 18 per frame, `KD`). */
  legd?: readonly number[];
  /** (mocap-trial) Optional clip feet (10 per frame, `KF`) and the root's travel over one cycle (1.75 m units). */
  feet?: readonly number[];
  stride?: number;
  /** (mocap-trial-2, strafe) The direction the root travels over a cycle (absent: 'z', forward; CLIP-FORMAT.md `travel`). */
  travel?: KeyedTravel;
}

/** (mocap-trial-2, strafe) A cycle's travel in the root frame: forward along +z, or sideways (+x right, -x left). */
export type KeyedTravel = 'z' | '+x' | '-x';

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
  /** (anim-skeleton S3) The clavicle, finger and leg frames (null: not keyed, sampled as identity / 0) and their means. */
  readonly clav: Float32Array | null;
  readonly fing: Float32Array | null;
  readonly leg: Float32Array | null;
  readonly meanClav: Float32Array;
  readonly meanFing: Float32Array;
  readonly meanLeg: Float32Array;
  /** (anim-skeleton S4) The leg deltas (null: not keyed, sampled as 0) and their mean. */
  readonly legd: Float32Array | null;
  readonly meanLegd: Float32Array;
  /** (mocap-trial) The clip feet (null: none, the planner places the steps) and the cycle's root travel (0: none). */
  readonly feet: Float32Array | null;
  readonly stride: number;
  /** (mocap-trial-2, strafe) The cycle's travel ('z': forward, every clip but the mocap strafes). */
  readonly travel: KeyedTravel;
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
  /** (anim-skeleton S4) Clavicle L, R (8 a frame: chest frame, turned on top of the clip's), on with `clavOn`. */
  readonly clav: Float32Array;
  readonly clavMean: Float32Array;
  clavOn: number;
  /** (S4) The fingers' [curl, spread] offsets (20 a frame, the `fing` layout), added. */
  readonly fing: Float32Array;
  readonly fingMean: Float32Array;
  fingOn: number;
  /** (S4) The leg deltas (`KEYED_LEGD` = 18 a frame, `KD`, rad, rig frame), added to the clip's. */
  readonly legd: Float32Array;
  readonly legdMean: Float32Array;
  legdOn: number;
  /** (S4) The FK leg weights L, R (2 a frame), added to a clip's `leg` weight (a clip without `leg` ignores them). */
  readonly legW: Float32Array;
  readonly legWMean: Float32Array;
  legWOn: number;
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
  /** (anim-skeleton S3) Clavicle L, R (chest frame), the fingers' [curl, spread] offsets, the FK legs (`KL`); identity /
   *  0 when not keyed, with their flags (0: the rig leaves them alone). */
  readonly clav: Float64Array;
  readonly fing: Float64Array;
  readonly leg: Float64Array;
  hasClav: number;
  hasFing: number;
  hasLeg: number;
  /** (anim-skeleton S4) The leg deltas (`KD`, 0 when not keyed) and their flag (0: the rig leaves the legs alone). */
  readonly legd: Float64Array;
  hasLegd: number;
  /** (mocap-trial) The clip feet (`KF`, 0 when not keyed) and their flag (0: the planner places the steps). */
  readonly feet: Float64Array;
  hasFeet: number;
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
/** (anim-skeleton S3) Clavicle (L, R quaternions: the `KW` slots), finger (fingers.ts layout) and leg channels. */
export const KEYED_CLAV = 8;
export const KEYED_FING = 20;
export const KEYED_LEG = 22;
/** (S3) One side's leg values; the right side starts at KEYED_LEG_SIDE. */
export const KEYED_LEG_SIDE = 11;
/** (S3) Slots in one side of `leg`: hip quaternion, knee flex (rad), ankle quaternion, toe (rad), FK weight. */
export const KL = { hip: 0, knee: 4, ankle: 5, toe: 9, w: 10 } as const;
/** (S3) The leg channel's quaternion offsets (hip L, ankle L, hip R, ankle R) and its scalar offsets (knee, toe x 2). */
const LEG_Q = [KL.hip, KL.ankle, KEYED_LEG_SIDE + KL.hip, KEYED_LEG_SIDE + KL.ankle] as const;
const LEG_S = [KL.knee, KL.toe, KEYED_LEG_SIDE + KL.knee, KEYED_LEG_SIDE + KL.toe] as const;
const LEG_W = [KL.w, KEYED_LEG_SIDE + KL.w] as const;
/**
 * (anim-skeleton S4) The leg delta channel: 9 a side (L then R), slots in one side (`KD`), rad in the rig frame.
 * (tuner-clarity S2) 7 -> 9 a side, the ankle yaw and the shin twist appended (no clip carried `legd` before).
 */
export const KEYED_LEGD = 18;
export const KEYED_LEGD_SIDE = 9;
export const KD = { hipPitch: 0, hipYaw: 1, hipRoll: 2, knee: 3, anklePitch: 4, ankleRoll: 5, toe: 6, ankleYaw: 7, shinTwist: 8 } as const;
/** (mocap-trial) The clip feet channel: 5 a side (L then R), slots in one side (`KF`). */
export const KEYED_FEET = 10;
export const KEYED_FEET_SIDE = 5;
export const KF = { x: 0, y: 1, z: 2, pitch: 3, contact: 4 } as const;
/**
 * (mocap-trial) Per-layer scales a clip set samples with (`mocap.ts` MOCAP_LAYERS): `armSwing` on the tuner's arm swing
 * gain, `trunkTwist` on its trunk counter-rotation, `keyLean` on its forward lean. 1 keeps each exactly as it is.
 */
export interface KeyedLayerScale {
  readonly armSwing: number;
  readonly trunkTwist: number;
  readonly keyLean: number;
}
/** A multiplier layer `k` (identity 1) moved toward 1 by scale `s` (1: `k` exactly, 0: 1). */
export function layerMul(k: number, s: number): number {
  return s === 1 ? k : 1 + (k - 1) * s;
}
/** (S4) The key files' `legX.d` fields in `KD` order (degrees, anatomical: the same sense on both sides). */
export const LEGD_FIELDS = ['hipPitch', 'hipYaw', 'hipRoll', 'knee', 'anklePitch', 'ankleRoll', 'toe', 'ankleYaw', 'shinTwist'] as const;
/**
 * (S4) Key degrees -> the rig's channel (times pi / 180), per side [L, R] in `KD` order: hip pitch + the thigh forward,
 * hip yaw + the knee turned out, hip roll + the thigh out, knee + bent, ankle pitch + the toes up, ankle roll + the sole
 * in, toe + up; (tuner-clarity S2) ankle yaw + the toes out, shin twist + the shin turned out (the toes out with it),
 * both checked on the rig by tests/keyLegTwist.test.ts. key_clip.py `LEGD_SIGN` is the same table.
 */
export const LEGD_SIGN: readonly (readonly number[])[] = [
  [-1, -1, -1, 1, -1, 1, -1, -1, -1],
  [-1, 1, 1, 1, -1, -1, -1, 1, 1],
];
/** (S4) The rig-frame slots a left / right mirror negates (yaw and roll about the reflected axes; S2 the two twists). */
const LEGD_NEG = [KD.hipYaw, KD.hipRoll, KD.ankleRoll, KD.ankleYaw, KD.shinTwist] as const;

/** Quaternions (x y z w) at identity, `n` floats. */
function idQ(n: number): Float64Array {
  const q = new Float64Array(n);
  for (let s = 3; s < n; s += 4) q[s] = 1;
  return q;
}

/** (S3) The leg channel at rest into `g` (identity hips and ankles; knees, toes and weights 0). */
function legIdentity(g: Float64Array | Float32Array): void {
  g.fill(0);
  for (let k = 0; k < LEG_Q.length; k++) g[LEG_Q[k]! + 3] = 1;
}

export function newKeyedPose(): KeyedPose {
  const ed = new Float64Array(KEYED_ED);
  for (let s = 3; s < 32; s += 4) ed[s] = 1;
  const leg = new Float64Array(KEYED_LEG);
  legIdentity(leg);
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
    clav: idQ(KEYED_CLAV),
    fing: new Float64Array(KEYED_FING),
    leg,
    hasClav: 0,
    hasFing: 0,
    hasLeg: 0,
    legd: new Float64Array(KEYED_LEGD),
    hasLegd: 0,
    feet: new Float64Array(KEYED_FEET),
    hasFeet: 0,
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
  if (def.clav) check(def, KEYED_CLAV, def.clav.length, 'clav');
  if (def.fing) check(def, KEYED_FING, def.fing.length, 'fing');
  if (def.leg) check(def, KEYED_LEG, def.leg.length, 'leg');
  if (def.legd) check(def, KEYED_LEGD, def.legd.length, 'legd');
  if (def.feet) check(def, KEYED_FEET, def.feet.length, 'feet');
  if (def.feet && !(typeof def.stride === 'number' && def.stride > 0)) throw new Error(`keyed clip ${def.name}: feet need a stride > 0`);
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
  // (anim-skeleton S3) the clavicles like the shoulders; the fingers and legs below
  const [clav, meanClav] = opt(def.clav, KEYED_CLAV);
  const fing = def.fing ? Float32Array.from(def.fing) : null;
  const meanFing = new Float32Array(KEYED_FING);
  if (fing) for (let f = 0; f < N; f++) for (let c = 0; c < KEYED_FING; c++) meanFing[c]! += fing[f * KEYED_FING + c]! / N;
  const leg = def.leg ? Float32Array.from(def.leg) : null;
  const meanLeg = new Float32Array(KEYED_LEG);
  legIdentity(meanLeg);
  if (leg) legMean(leg, N, meanLeg);
  // (anim-skeleton S4) the leg deltas: scalars, averaged
  const legd = def.legd ? Float32Array.from(def.legd) : null;
  const meanLegd = new Float32Array(KEYED_LEGD);
  if (legd) for (let f = 0; f < N; f++) for (let c = 0; c < KEYED_LEGD; c++) meanLegd[c]! += legd[f * KEYED_LEGD + c]! / N;
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
    clav,
    fing,
    leg,
    meanClav,
    meanFing,
    meanLeg,
    legd,
    meanLegd,
    feet: def.feet ? Float32Array.from(def.feet) : null,
    stride: def.feet ? def.stride! : 0,
    travel: def.travel ?? 'z',
    keyOff: null,
    keyTime: null,
  };
}

/**
 * (anim-skeleton S3) A leg channel's quaternions kept on one hemisphere frame to frame, and its mean into `m`: the
 * quaternions averaged and normalised, the knee, toe and weight averaged. Module load time only.
 */
function legMean(g: Float32Array, N: number, m: Float32Array): void {
  for (let f = 1; f < N; f++) {
    for (let k = 0; k < LEG_Q.length; k++) {
      const a = (f - 1) * KEYED_LEG + LEG_Q[k]!;
      const b = f * KEYED_LEG + LEG_Q[k]!;
      if (g[a]! * g[b]! + g[a + 1]! * g[b + 1]! + g[a + 2]! * g[b + 2]! + g[a + 3]! * g[b + 3]! < 0) for (let c = 0; c < 4; c++) g[b + c] = -g[b + c]!;
    }
  }
  m.fill(0);
  for (let f = 0; f < N; f++) for (let c = 0; c < KEYED_LEG; c++) m[c]! += g[f * KEYED_LEG + c]! / N;
  for (let k = 0; k < LEG_Q.length; k++) {
    const s = LEG_Q[k]!;
    const l = Math.sqrt(m[s]! ** 2 + m[s + 1]! ** 2 + m[s + 2]! ** 2 + m[s + 3]! ** 2) || 1;
    for (let c = 0; c < 4; c++) m[s + c] = m[s + c]! / l;
  }
}

/**
 * Sample `clip` at gait `phase` (cycles, any real) into `out`, the cycle scaled about its mean by `amp` (1 = as keyed,
 * 0 = the mean pose: a slow walk swings less). Linear between frames, quaternions normalised (nlerp).
 */
export function sampleKeyed(clip: KeyedClip, phase: number, amp: number, out: KeyedPose, L: KeyedLayerScale | null = null): KeyedPose {
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
  // (mocap-trial) the arm swing gain, scaled for a set with layer scales (null or 1: exactly the tuner's)
  const armK = L === null ? TUNE_CUR.armSwingK : layerMul(TUNE_CUR.armSwingK, L.armSwing);
  for (let c = 0; c < KEYED_ARM; c++) {
    const v = A[i0 * KEYED_ARM + c]! + (A[i1 * KEYED_ARM + c]! - A[i0 * KEYED_ARM + c]!) * u;
    const m = clip.meanArm[c]!;
    out.arm[c] = m + (v - m) * amp * armK;
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
  tuneKeyedTwist(out.q, clip.meanQ, L === null ? 1 : L.trunkTwist); // (anim-tuner) the trunk counter-rotation slider (identity at 1)
  tuneKeyedLean(out.q, L === null ? 1 : L.keyLean); // (anim-tuner) the forward lean slider (identity unless the local player's group sets one)
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
  // (anim-skeleton S3) the clavicle, finger and leg channels (identity / 0 when not keyed)
  out.hasClav = optQuats(clip.clav, clip.meanClav, KEYED_CLAV, i0, i1, u, amp, out.clav);
  if (clip.fing) {
    sampleLin(clip.fing, clip.meanFing, KEYED_FING, i0, i1, u, amp, out.fing, 0);
    out.hasFing = 1;
  } else {
    out.fing.fill(0);
    out.hasFing = 0;
  }
  out.hasLeg = sampleLeg(clip.leg, clip.meanLeg, i0, i1, u, amp, out.leg);
  // (anim-skeleton S4) the leg deltas (0 when not keyed)
  if (clip.legd) {
    sampleLin(clip.legd, clip.meanLegd, KEYED_LEGD, i0, i1, u, amp, out.legd, 0);
    out.hasLegd = 1;
  } else {
    out.legd.fill(0);
    out.hasLegd = 0;
  }
  // (mocap-trial) the clip feet: between frames at full amplitude (the stride must match the travel), contact lerped
  if (clip.feet) {
    const F = clip.feet;
    for (let c = 0; c < KEYED_FEET; c++) out.feet[c] = F[i0 * KEYED_FEET + c]! + (F[i1 * KEYED_FEET + c]! - F[i0 * KEYED_FEET + c]!) * u;
    out.hasFeet = 1;
  } else if (out.hasFeet) {
    out.feet.fill(0);
    out.hasFeet = 0;
  }
  if (K) {
    keyOffLimbs(K, j0, j1, v, amp, amp * armK, out);
    keyOffExtra(K, j0, j1, v, amp, amp * armK, out);
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
// (anim-skeleton S4) one of the finger / leg delta / leg weight offsets
const OF = new Float64Array(Math.max(KEYED_FING, KEYED_LEGD));

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

/**
 * (anim-skeleton S3) The leg channel into `out` (1), or at rest (0: no channel): the hip and ankle quaternions nlerped
 * between frames and scaled about their mean by `amp`, the knee and toe likewise; the FK weight between frames only (a
 * slow walk's smaller swing never lifts a planted foot's weight off 0). No allocation.
 */
function sampleLeg(G: Float32Array | null, M: Float32Array, i0: number, i1: number, u: number, amp: number, out: Float64Array): number {
  if (!G) {
    legIdentity(out);
    return 0;
  }
  for (let k = 0; k < LEG_Q.length; k++) {
    const s = LEG_Q[k]!;
    const a = i0 * KEYED_LEG + s;
    const b = i1 * KEYED_LEG + s;
    const sg = G[a]! * G[b]! + G[a + 1]! * G[b + 1]! + G[a + 2]! * G[b + 2]! + G[a + 3]! * G[b + 3]! < 0 ? -1 : 1;
    let x = G[a]! + (sg * G[b]! - G[a]!) * u;
    let y = G[a + 1]! + (sg * G[b + 1]! - G[a + 1]!) * u;
    let z = G[a + 2]! + (sg * G[b + 2]! - G[a + 2]!) * u;
    let w = G[a + 3]! + (sg * G[b + 3]! - G[a + 3]!) * u;
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
  for (let k = 0; k < LEG_S.length; k++) {
    const s = LEG_S[k]!;
    const v = G[i0 * KEYED_LEG + s]! + (G[i1 * KEYED_LEG + s]! - G[i0 * KEYED_LEG + s]!) * u;
    out[s] = M[s]! + (v - M[s]!) * amp;
  }
  for (let k = 0; k < LEG_W.length; k++) {
    const s = LEG_W[k]!;
    out[s] = G[i0 * KEYED_LEG + s]! + (G[i1 * KEYED_LEG + s]! - G[i0 * KEYED_LEG + s]!) * u;
  }
  return 1;
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
  keyOffSkeleton(K, i0, i1, u, amp, armAmp, out);
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

/**
 * (anim-skeleton S4) The skeleton channels' key offsets: the clavicles turned on top of the clip's in the chest frame
 * (as `clavCompose`: offset x clip), the fingers and the leg deltas added, the FK leg weights added to a clip that has
 * legs. Each sets its channel's flag. No allocation.
 */
function keyOffSkeleton(K: KeyedOffsets, i0: number, i1: number, u: number, amp: number, armAmp: number, out: KeyedPose): void {
  if (K.clavOn) {
    sampleQuats(K.clav, K.clavMean, KEYED_CLAV, i0, i1, u, armAmp, OX);
    for (let s = 0; s < KEYED_CLAV; s += 4) if (!isId(OX, s)) qmul(out.clav, s, OX, s, false, 1);
    out.hasClav = 1;
  }
  if (K.fingOn) {
    sampleLin(K.fing, K.fingMean, KEYED_FING, i0, i1, u, amp, OF, 0);
    for (let c = 0; c < KEYED_FING; c++) out.fing[c] = out.fing[c]! + OF[c]!;
    out.hasFing = 1;
  }
  if (K.legdOn) {
    sampleLin(K.legd, K.legdMean, KEYED_LEGD, i0, i1, u, amp, OF, 0);
    for (let c = 0; c < KEYED_LEGD; c++) out.legd[c] = out.legd[c]! + OF[c]!;
    out.hasLegd = 1;
  }
  if (K.legWOn && out.hasLeg) {
    sampleLin(K.legW, K.legWMean, 2, i0, i1, u, 1, OF, 0);
    for (let k = 0; k < 2; k++) out.leg[LEG_W[k]!] = out.leg[LEG_W[k]!]! + OF[k]!;
  }
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
    // (anim-skeleton S3) the clavicles and fingers go with the arm channels
    nlerpInto(a.clav, b.clav, KEYED_CLAV, u, out.clav);
    for (let c = 0; c < KEYED_FING; c++) out.fing[c] = a.fing[c]! + (b.fing[c]! - a.fing[c]!) * u;
    out.hasClav = a.hasClav || b.hasClav ? 1 : 0;
    out.hasFing = a.hasFing || b.hasFing ? 1 : 0;
  } else if (out !== a) {
    out.fore.set(a.fore);
    out.sh.set(a.sh);
    out.ed.set(a.ed);
    out.hasFore = a.hasFore;
    out.hasSh = a.hasSh;
    out.edOn = a.edOn;
    out.clav.set(a.clav);
    out.fing.set(a.fing);
    out.hasClav = a.hasClav;
    out.hasFing = a.hasFing;
  }
  mixLeg(a, b, u, out);
  // (anim-skeleton S4) the leg deltas always blend with the legs (a pose without them is 0: a blend fades them)
  for (let c = 0; c < KEYED_LEGD; c++) out.legd[c] = a.legd[c]! + (b.legd[c]! - a.legd[c]!) * u;
  out.hasLegd = a.hasLegd || b.hasLegd ? 1 : 0;
  // (mocap-trial) the clip feet: both keyed lerp; one keyed is kept as it is (a blend with a clip without feet never
  // drags the steps toward 0); none: left at 0
  if (a.hasFeet && b.hasFeet) {
    for (let c = 0; c < KEYED_FEET; c++) out.feet[c] = a.feet[c]! + (b.feet[c]! - a.feet[c]!) * u;
    out.hasFeet = 1;
  } else if (a.hasFeet || b.hasFeet) {
    const src = a.hasFeet ? a.feet : b.feet;
    if (out.feet !== src) out.feet.set(src);
    out.hasFeet = 1;
  } else if (out.hasFeet) {
    out.feet.fill(0);
    out.hasFeet = 0;
  }
  return out;
}

/**
 * (mocap-trial) Only the arm channels of `b` toward `a` by `t` into `out` (`out` may be `b`): `t` = 0 is `a`'s arms, 1
 * `b`'s. The arm points and finger offsets lerp, the wrist, forearm, shoulder and clavicle quaternions nlerp; the flags,
 * trunk, head, legs and feet are left as `out` has them. A slot mixed at weight w after this plays its arms at t x w (the
 * walking start's arms capped, MocapSlots). No allocation.
 */
export function mixKeyedArms(a: KeyedPose, b: KeyedPose, t: number, out: KeyedPose): void {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  for (let c = 0; c < KEYED_ARM; c++) out.arm[c] = a.arm[c]! + (b.arm[c]! - a.arm[c]!) * u;
  for (let c = 0; c < KEYED_FING; c++) out.fing[c] = a.fing[c]! + (b.fing[c]! - a.fing[c]!) * u;
  nlerpInto(a.wrist, b.wrist, KEYED_WRIST, u, out.wrist);
  nlerpInto(a.fore, b.fore, KEYED_FORE, u, out.fore);
  nlerpInto(a.sh, b.sh, KEYED_SH, u, out.sh);
  nlerpInto(a.clav, b.clav, KEYED_CLAV, u, out.clav);
}

/**
 * (anim-skeleton S3) The leg channels blended (always, with the legs): both keyed, the quaternions nlerp and the knee,
 * toe and weight lerp; one keyed, its leg is kept and only its weight fades (toward the other's 0), so a blend never
 * bends an FK leg toward the straight rest. No allocation; `out` may be `a` or `b`.
 */
function mixLeg(a: KeyedPose, b: KeyedPose, u: number, out: KeyedPose): void {
  const A = a.leg;
  const B = b.leg;
  const O = out.leg;
  if (a.hasLeg && b.hasLeg) {
    for (let k = 0; k < LEG_Q.length; k++) {
      const s = LEG_Q[k]!;
      const sg = A[s]! * B[s]! + A[s + 1]! * B[s + 1]! + A[s + 2]! * B[s + 2]! + A[s + 3]! * B[s + 3]! < 0 ? -1 : 1;
      const x = A[s]! + (sg * B[s]! - A[s]!) * u;
      const y = A[s + 1]! + (sg * B[s + 1]! - A[s + 1]!) * u;
      const z = A[s + 2]! + (sg * B[s + 2]! - A[s + 2]!) * u;
      const w = A[s + 3]! + (sg * B[s + 3]! - A[s + 3]!) * u;
      const l = Math.sqrt(x * x + y * y + z * z + w * w) || 1;
      O[s] = x / l;
      O[s + 1] = y / l;
      O[s + 2] = z / l;
      O[s + 3] = w / l;
    }
    for (let k = 0; k < LEG_S.length; k++) O[LEG_S[k]!] = A[LEG_S[k]!]! + (B[LEG_S[k]!]! - A[LEG_S[k]!]!) * u;
    for (let k = 0; k < LEG_W.length; k++) O[LEG_W[k]!] = A[LEG_W[k]!]! + (B[LEG_W[k]!]! - A[LEG_W[k]!]!) * u;
  } else if (a.hasLeg || b.hasLeg) {
    const src = a.hasLeg ? A : B;
    const k = a.hasLeg ? 1 - u : u;
    if (O !== src) O.set(src);
    for (let j = 0; j < LEG_W.length; j++) O[LEG_W[j]!] = src[LEG_W[j]!]! * k;
  } else if (O !== A) O.set(A);
  out.hasLeg = a.hasLeg || b.hasLeg ? 1 : 0;
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
  // (anim-skeleton S3) the clavicles and fingers too (the gun hands keep their grip); the legs stay
  for (let s = 0; s < KEYED_CLAV; s += 4) {
    p.clav[s] = p.clav[s + 1] = p.clav[s + 2] = 0;
    p.clav[s + 3] = 1;
  }
  p.fing.fill(0);
  p.hasClav = p.hasFing = 0;
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
  // (anim-skeleton S3) the clavicles swapped and reflected; the hands' finger values swapped (curl and spread are each
  // hand's own: symmetric); the legs swapped side for side, hip and ankle reflected, knee, toe and weight as they are
  swapReflect(p.clav, 0, 4);
  const f = p.fing;
  for (let c = 0; c < 10; c++) {
    const l = f[c]!;
    f[c] = f[c + 10]!;
    f[c + 10] = l;
  }
  const g = p.leg;
  for (let c = 0; c < KEYED_LEG_SIDE; c++) {
    const l = g[c]!;
    g[c] = g[c + KEYED_LEG_SIDE]!;
    g[c + KEYED_LEG_SIDE] = l;
  }
  for (let k = 0; k < LEG_Q.length; k++) {
    g[LEG_Q[k]! + 1] = -g[LEG_Q[k]! + 1]!;
    g[LEG_Q[k]! + 2] = -g[LEG_Q[k]! + 2]!;
  }
  // (anim-skeleton S4) the leg deltas swapped side for side, the yaws and rolls negated (rig frame)
  const d = p.legd;
  for (let c = 0; c < KEYED_LEGD_SIDE; c++) {
    const l = d[c]!;
    d[c] = d[c + KEYED_LEGD_SIDE]!;
    d[c + KEYED_LEGD_SIDE] = l;
  }
  for (let k = 0; k < LEGD_NEG.length; k++) {
    const s = LEGD_NEG[k]!;
    d[s] = -d[s]! + 0;
    d[KEYED_LEGD_SIDE + s] = -d[KEYED_LEGD_SIDE + s]! + 0;
  }
  // (mocap-trial) the clip feet swapped side for side, x negated
  if (p.hasFeet) {
    const t = p.feet;
    for (let c = 0; c < KEYED_FEET_SIDE; c++) {
      const l = t[c]!;
      t[c] = t[c + KEYED_FEET_SIDE]!;
      t[c + KEYED_FEET_SIDE] = l;
    }
    t[KF.x] = -t[KF.x]! + 0;
    t[KEYED_FEET_SIDE + KF.x] = -t[KEYED_FEET_SIDE + KF.x]! + 0;
  }
  return p;
}
