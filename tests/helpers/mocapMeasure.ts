/**
 * (mocap-trial) A headless Wren rig driven through a holstered free-gait plan (as player.ts drives it: a carrier with
 * nothing in hand, the facing stride), recording the joints and the planner's feet every 60 Hz step, and the numbers the
 * mocap integration is judged by: the e2e-anim anti-crab metrics (src/anim/audit/metrics.ts against e2e-anim's BODY_GAIT /
 * RUN_TUNE ranges), the body motion (pelvis and shoulder yaw, sway, bob, the wrists' swing), the stride against the
 * game's, and pops (each bone's turn per frame against the bible's 25 deg, the joints' positional jerk). Node only
 * (NullEngine, no ground: the floor is y = 0).
 */
import { elbowWing, footSlide, footTrack, kneeBow, kneeSeparation } from '../../src/anim/audit/metrics';
import { HEEL_BACK, HEEL_DOWN, TOE_BALL } from '../../src/anim/footGeom';
import { CRAB, JOINT_DEG_PER_60HZ_FRAME } from '../../src/anim/audit/limits';
import type { CharacterRig, RigPose } from '../../src/player/characterRig';

/** e2e-anim's ranges per gait (scripts/e2e-anim.mjs: BODY_GAIT walk / jog, RUN_TUNE the run; the rest `CRAB`). */
export const GAIT_RANGES = {
  walk: { ...CRAB, kneeBow: 0.035, elbowWing: 0.083 },
  jog: { ...CRAB, kneeBow: 0.034, elbowWing: 0.08 },
  run: { ...CRAB, kneeSep: { min: 0.44, max: 2.15 }, trackHalf: 0.18, kneeBow: 0.107, elbowWing: 0.11 },
} as const;
export type GaitName = keyof typeof GAIT_RANGES;
export type Ranges = (typeof GAIT_RANGES)[GaitName];

export const JOINTS = ['hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'toeL', 'toeR', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hips', 'spine', 'torso', 'neck', 'headNode'] as const;
export type J = (typeof JOINTS)[number];
/** The bones whose direction is checked for pops (a joint node's own roll is left out: an aimed bone flips it harmlessly). */
export const SEGS: readonly (readonly [J, J])[] = [
  ['hipL', 'kneeL'], ['kneeL', 'ankleL'], ['ankleL', 'toeL'], ['hipR', 'kneeR'], ['kneeR', 'ankleR'], ['ankleR', 'toeR'],
  ['shoulderL', 'elbowL'], ['elbowL', 'wristL'], ['shoulderR', 'elbowR'], ['elbowR', 'wristR'],
  ['hips', 'spine'], ['spine', 'torso'], ['torso', 'neck'], ['neck', 'headNode'], ['hipL', 'hipR'], ['shoulderL', 'shoulderR'],
];

/** One step of a plan: the pace (m/s) and the turn rate (rad/s, + right); `rec` records it. */
export interface PlanStep {
  speed: number;
  yawRate: number;
  rec: boolean;
  /** (mt2-crouch) The crouch 0..1 (absent: standing). */
  crouch?: number;
  /** (mixamo-retarget I5) More pose fields for this step (a carry's bend and load, a strike's `melee`); absent: none. */
  pose?: Partial<RigPose>;
}
export type Plan = (k: number, t: number) => PlanStep;

export interface Rec {
  n: number;
  /** World positions (x, y, z per recorded frame). */
  pos: Record<J, number[]>;
  /** The root position (x, y, z) and yaw per frame, the pace asked. */
  root: number[];
  yaw: number[];
  speed: number[];
  /** The planner's contacts, its planted feet's targets (x, z each side; NaN in the air) and its landings (x, z). */
  contactL: number[];
  contactR: number[];
  targetL: number[];
  targetR: number[];
  landL: number[];
  landR: number[];
  /** The gait clock's cycle time; the clip feet on (1) / off; the mocap share; the clip stride scale (game / clip, 0: none). */
  cycleTime: number[];
  clipOn: number[];
  share: number[];
  zk: number[];
  /** (N1 merge) Each foot's rendered heel and ball (world, x y z per frame; footGeom's points under the ankle, as e2e-anim
   *  records them) and whether the planner anchors it (N1's held contact). */
  heelL: number[];
  ballL: number[];
  heelR: number[];
  ballR: number[];
  heldL: number[];
  heldR: number[];
  /** The head's gaze pitch (deg, + down: its forward axis below the horizon). */
  gaze: number[];
}

/** Drive a fresh rig through `plan` for `steps` 60 Hz steps. */
export async function driveRig(steps: number, plan: Plan, onStep?: (rig: CharacterRig, k: number) => void): Promise<Rec> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { defaultLook } = await import('../../src/cosmetics/avatarLook');
  const { operatorRig } = await import('../../src/operators/runtime/playerFigure');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const random = Math.random;
  let seed = 777;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pos = {} as Record<J, number[]>;
  for (const j of JOINTS) pos[j] = [];
  const R: Rec = { n: 0, pos, root: [], yaw: [], speed: [], contactL: [], contactR: [], targetL: [], targetR: [], landL: [], landR: [], cycleTime: [], clipOn: [], share: [], zk: [], gaze: [], heelL: [], ballL: [], heelR: [], ballR: [], heldL: [], heldR: [] };
  try {
    const op = operatorRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook(), 'measure');
    const rig: CharacterRig = op.rig;
    rig.carrier = true;
    const p: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 };
    const DT = 1 / 60;
    const K = rig.height / 1.75;
    let yaw = 0;
    for (let k = 0; k < steps; k++) {
      const s = plan(k, k * DT);
      yaw += s.yawRate * DT;
      rig.root.rotation.y = yaw;
      rig.root.position.x += Math.sin(yaw) * s.speed * DT;
      rig.root.position.z += Math.cos(yaw) * s.speed * DT;
      p.speed = s.speed;
      p.crouch = s.crouch ?? 0;
      p.localZ = s.speed > 0 ? 1 : 0;
      p.stride = 'facing';
      if (s.pose) Object.assign(p, s.pose);
      rig.animate(DT, p);
      onStep?.(rig, k);
      if (!s.rec) continue;
      for (const j of JOINTS) {
        const m = rig[j].computeWorldMatrix(true).m;
        pos[j].push(m[12]!, m[13]!, m[14]!);
      }
      R.n++;
      R.root.push(rig.root.position.x, rig.root.position.y, rig.root.position.z);
      R.yaw.push(yaw);
      R.speed.push(s.speed);
      const PL = rig.planner;
      R.contactL.push(PL.L.contact ? 1 : 0);
      R.contactR.push(PL.R.contact ? 1 : 0);
      R.targetL.push(PL.L.contact ? PL.L.x : NaN, PL.L.contact ? PL.L.z : NaN);
      R.targetR.push(PL.R.contact ? PL.R.x : NaN, PL.R.contact ? PL.R.z : NaN);
      if (PL.L.landed) R.landL.push(PL.L.x, PL.L.z);
      if (PL.R.landed) R.landR.push(PL.R.x, PL.R.z);
      R.heldL.push(PL.L.anchored ? 1 : 0);
      R.heldR.push(PL.R.anchored ? 1 : 0);
      contactPts(rig.ankleL, R.heelL, R.ballL);
      contactPts(rig.ankleR, R.heelR, R.ballR);
      const o = rig.graph.out;
      R.cycleTime.push(o.gait.cycleTime);
      R.clipOn.push(o.clipFeet.valid && o.clipFeet.on ? 1 : 0);
      R.share.push(o.keyMocap);
      const ms = (rig.graph as unknown as { mStride: number }).mStride;
      R.zk.push(ms > 0 && o.clipFeet.valid ? (s.speed * o.gait.cycleTime) / (ms * K) : 0);
      const hm = rig.headNode.computeWorldMatrix(true).m;
      R.gaze.push((Math.atan2(-hm[9]!, Math.hypot(hm[8]!, hm[10]!)) * 180) / Math.PI);
    }
    op.figure.dispose();
    rig.dispose();
  } finally {
    Math.random = random;
    scene.dispose();
  }
  return R;
}

/** The ankle node's rendered heel and ball (footGeom's points along its own axes, as e2e-anim's `contactPts`) onto `heel` / `ball`. */
function contactPts(n: CharacterRig['ankleL'], heel: number[], ball: number[]): void {
  const m = n.computeWorldMatrix(true).m;
  const ly = Math.hypot(m[4]!, m[5]!, m[6]!) || 1;
  const lz = Math.hypot(m[8]!, m[9]!, m[10]!) || 1;
  const y = -HEEL_DOWN;
  for (const [z, out] of [[-HEEL_BACK, heel], [TOE_BALL, ball]] as const) out.push(m[12]! + (m[4]! / ly) * y + (m[8]! / lz) * z, m[13]! + (m[5]! / ly) * y + (m[9]! / lz) * z, m[14]! + (m[6]! / ly) * y + (m[10]! / lz) * z);
}

/**
 * (N1 merge) The planted feet's slide as e2e-anim reads it (metrics.ts `footSlide`, N1 decisions 1 / 2): a plant the
 * planner anchors (N1's held contact: the ankle rolls / pivots round the heel or ball by design) at its contact points,
 * any other plant at the ankle. (mt2-fixF) The clip's plants are anchored too now (held at the heel / ball as the clip's
 * stance pitch rolls), so they read at the contact; before, pinned at the ankle, they read at the ankle. A plant whose holder changes (the planner's anchored
 * foot taken over by the clip at a turn's end, or handed back) is read in its parts, each by its own holder's measure.
 * Worst over both feet (m).
 */
export function plantSlide(R: Rec, limit: number): number {
  let worst = 0;
  for (const s of ['L', 'R'] as const) {
    const ankle = s === 'L' ? R.pos.ankleL : R.pos.ankleR;
    const heel = s === 'L' ? R.heelL : R.heelR;
    const ball = s === 'L' ? R.ballL : R.ballR;
    const c = s === 'L' ? R.contactL : R.contactR;
    const h = s === 'L' ? R.heldL : R.heldR;
    for (let i = 0; i < c.length; i++) {
      if (!c[i] || (i > 0 && c[i - 1] && h[i - 1] === h[i])) continue;
      let j = i;
      while (j < c.length && c[j] && h[j] === h[i]) j++;
      const one = (a: number[]): number[] => a.slice(i * 3, j * 3);
      const r = footSlide(one(ankle), one(heel), one(ball), new Array<number>(j - i).fill(1), new Array<number>(j - i).fill(h[i]!), limit);
      if (r.worst > worst) worst = r.worst;
    }
  }
  return worst;
}

/** A steady straight gait: `warm` s to settle, then `sec` s recorded. */
export function steady(speed: number, warm = 2, sec = 3): [number, Plan] {
  return [Math.round((warm + sec) * 60), (_k, t) => ({ speed, yawRate: 0, rec: t >= warm })];
}

const p2p = (v: number[]): number => (v.length ? Math.max(...v) - Math.min(...v) : 0);
const mean = (v: number[]): number => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
const DEG = 180 / Math.PI;
const wrapPi = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export interface GaitNumbers {
  speed: number;
  /** The mocap share and the clip feet's share of the frames. */
  share: number;
  clipOn: number;
  /** e2e-anim's anti-crab numbers (m; knee separation a ratio of the hip width) and the limits missed. */
  knee: [number, number, number];
  track: [number, number];
  bow: number;
  slide: number;
  plants: number;
  wing: number;
  out: string[];
  /** The planted ankles off their planner targets (m, horizontal, max). */
  pinErr: number;
  /** Body motion: pelvis and shoulder-line yaw p2p (deg), the pelvis' sway and bob p2p (m), the wrists' fore-aft and
   *  vertical range (m, mean of both). */
  pelvisYawP2P: number;
  shoulderYawP2P: number;
  swayP2P: number;
  bobP2P: number;
  wristSwing: number;
  wristLift: number;
  /** The landed stride (same-foot landings, m) against the game's (pace x cycle time) and the clip feet's scale. */
  stride: number;
  gameStride: number;
  strideRatio: number;
  clipScale: number;
  /** The head's gaze pitch (deg, + down; mean and range). */
  gaze: number;
  gazeMin: number;
  gazeMax: number;
  /** The largest bone turn in one frame (deg) and its bone. */
  maxStepDeg: number;
  maxStepBone: string;
}

/** The numbers of a steady straight recording against `C`. */
export function gaitNumbers(R: Rec, C: Ranges): GaitNumbers {
  const P = R.pos;
  const knee = kneeSeparation(P.hipL, P.hipR, P.kneeL, P.kneeR, C.kneeSep.min, C.kneeSep.max);
  const track = footTrack(P.hipL, P.hipR, P.ankleL, P.ankleR, C.trackHalf, R.contactL, R.contactR);
  const bow = kneeBow(P.hipL, P.hipR, P.kneeL, P.kneeR, P.ankleL, P.ankleR, C.kneeBow);
  // (mt2-fixF) the planted feet as e2e-anim's foot locking reads them (metrics.ts footSlide): a plant the planner anchors (N1's
  // held contact; since fix F the clip's plants too: the ankle travels with the clip's heel-to-toe roll by design, 6 cm in
  // a walk stance) at its heel / ball while each is down, any other plant at the ankle. Was every plant's ankle. Limit kept
  const sL = footSlide(P.ankleL, R.heelL, R.ballL, R.contactL, R.heldL, C.slide);
  const sR = footSlide(P.ankleR, R.heelR, R.ballR, R.contactR, R.heldR, C.slide);
  const wing = elbowWing(P.shoulderL, P.shoulderR, P.elbowL, P.elbowR, C.elbowWing);
  const slide = Math.max(sL.worst, sR.worst);
  const out = [!knee.pass && 'knees', !track.pass && 'track', !bow.pass && 'knee-out', slide >= C.slide && 'slide', !wing.pass && 'elbows'].filter((x): x is string => !!x);
  const pelYaw: number[] = [];
  const shYaw: number[] = [];
  const sway: number[] = [];
  const bob: number[] = [];
  const wrZ: [number[], number[]] = [[], []];
  const wrY: [number[], number[]] = [[], []];
  let pinErr = 0;
  for (let i = 0; i < R.n; i++) {
    const k = i * 3;
    const y = R.yaw[i]!;
    const c = Math.cos(y);
    const s = Math.sin(y);
    // the root frame: x right, z forward
    const loc = (a: number[]): [number, number, number] => {
      const dx = a[k]! - R.root[k]!;
      const dz = a[k + 2]! - R.root[k + 2]!;
      return [dx * c - dz * s, a[k + 1]!, dx * s + dz * c];
    };
    const hl = loc(P.hipL);
    const hr = loc(P.hipR);
    pelYaw.push(Math.atan2(-(hr[2] - hl[2]), hr[0] - hl[0]));
    const sl = loc(P.shoulderL);
    const sr = loc(P.shoulderR);
    shYaw.push(Math.atan2(-(sr[2] - sl[2]), sr[0] - sl[0]));
    sway.push((hl[0] + hr[0]) / 2);
    bob.push((hl[1] + hr[1]) / 2);
    const wl = loc(P.wristL);
    const wr = loc(P.wristR);
    wrZ[0].push(wl[2] - (sl[2] + sr[2]) / 2);
    wrZ[1].push(wr[2] - (sl[2] + sr[2]) / 2);
    wrY[0].push(wl[1]);
    wrY[1].push(wr[1]);
    for (const [T, A] of [[R.targetL, P.ankleL], [R.targetR, P.ankleR]] as const) {
      const tx = T[i * 2]!;
      if (Number.isNaN(tx)) continue;
      pinErr = Math.max(pinErr, Math.hypot(A[k]! - tx, A[k + 2]! - T[i * 2 + 1]!));
    }
  }
  const unwrap = (v: number[]): number[] => v.map((a) => wrapPi(a - v[0]!));
  // stride: same-foot landings, the mean distance between successive ones (the first per side dropped: its swing began
  // in the warm-up)
  const strides: number[] = [];
  for (const L of [R.landL, R.landR]) {
    for (let j = 4; j + 1 < L.length; j += 2) strides.push(Math.hypot(L[j]! - L[j - 2]!, L[j + 1]! - L[j - 1]!));
  }
  const speed = mean(R.speed);
  const gameStride = speed * mean(R.cycleTime);
  const stride = mean(strides);
  const st = pops(R);
  const zk = R.zk.filter((v) => v > 0);
  return {
    speed,
    share: mean(R.share),
    clipOn: mean(R.clipOn),
    knee: [knee.min, knee.mean, knee.max],
    track: [track.min, track.max],
    bow: bow.max,
    slide,
    plants: sL.plants + sR.plants,
    wing: wing.max,
    out,
    pinErr,
    pelvisYawP2P: p2p(unwrap(pelYaw)) * DEG,
    shoulderYawP2P: p2p(unwrap(shYaw)) * DEG,
    swayP2P: p2p(sway),
    bobP2P: p2p(bob),
    wristSwing: (p2p(wrZ[0]) + p2p(wrZ[1])) / 2,
    wristLift: (p2p(wrY[0]) + p2p(wrY[1])) / 2,
    stride,
    gameStride,
    strideRatio: stride / gameStride,
    clipScale: zk.length ? mean(zk) : NaN,
    gaze: mean(R.gaze),
    gazeMin: Math.min(...R.gaze),
    gazeMax: Math.max(...R.gaze),
    maxStepDeg: st.maxStepDeg,
    maxStepBone: st.bone,
  };
}

export interface PopNumbers {
  /** The largest bone turn in one frame (deg, relative to the root's heading), the bone and the frame. */
  maxStepDeg: number;
  bone: string;
  at: number;
  /** The largest positional jerk (second difference of a joint's root-relative position, m per frame^2), joint, frame. */
  maxJerk: number;
  jerkJoint: string;
  jerkAt: number;
}

/** Pops over a recording: the bones' largest turn per frame and the joints' largest positional jerk (root-relative). */
export function pops(R: Rec, from = 0, to = R.n): PopNumbers {
  let maxStepDeg = 0;
  let bone = '';
  let at = -1;
  let maxJerk = 0;
  let jerkJoint = '';
  let jerkAt = -1;
  const dir = (a: J, b: J, i: number): [number, number, number] => {
    const A = R.pos[a];
    const B = R.pos[b];
    const k = i * 3;
    // into the root's heading frame (its yaw taken out: a turning body's bones turn with it)
    const y = R.yaw[i]!;
    const c = Math.cos(y);
    const s = Math.sin(y);
    const dx = B[k]! - A[k]!;
    const dy = B[k + 1]! - A[k + 1]!;
    const dz = B[k + 2]! - A[k + 2]!;
    const x = dx * c - dz * s;
    const z = dx * s + dz * c;
    const l = Math.hypot(x, dy, z) || 1;
    return [x / l, dy / l, z / l];
  };
  for (const sg of SEGS) {
    for (let i = Math.max(1, from); i < to; i++) {
      const a = dir(sg[0], sg[1], i - 1);
      const b = dir(sg[0], sg[1], i);
      const d = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * DEG;
      if (d > maxStepDeg) {
        maxStepDeg = d;
        bone = `${sg[0]}-${sg[1]}`;
        at = i;
      }
    }
  }
  for (const j of JOINTS) {
    const P = R.pos[j];
    for (let i = Math.max(1, from); i + 1 < to; i++) {
      let e = 0;
      for (let c = 0; c < 3; c++) {
        const f = (q: number): number => P[q * 3 + c]! - R.root[q * 3 + c]!;
        const dd = f(i + 1) - 2 * f(i) + f(i - 1);
        e += dd * dd;
      }
      e = Math.sqrt(e);
      if (e > maxJerk) {
        maxJerk = e;
        jerkJoint = j;
        jerkAt = i;
      }
    }
  }
  return { maxStepDeg, bone, at, maxJerk, jerkJoint, jerkAt };
}

/** The bible's pop limit (deg a 60 Hz frame). */
export const POP_DEG = JOINT_DEG_PER_60HZ_FRAME;
