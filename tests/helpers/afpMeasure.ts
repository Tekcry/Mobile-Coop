/**
 * (anim-fix-pass AF0) The measurement harness every AF slice asserts against. Headless runs of the player rig (the CT-driven
 * free gait of mocapPlayer.ts `ctRun`; the aimed / crouched / wall runs of mocapStrafe.ts `aimRun`), one exported function
 * per measure, each taking the run's `Rec` (and the `Probe` for what a `Rec` does not hold: the keepElbowOut state, the gun,
 * the kneel). Units: m, deg, s unless a name says cm. Frames: the sim runs at 60 Hz; `decimate(R, 2)` is the 30 Hz view (every
 * second recorded frame), so frame-based measures (wrist second difference, pops) read at either rate.
 * Facing frame: the root's yaw taken out (x right, z forward); the root frame is the same, origin on the root.
 */
import { centerOfMass, footTrack, segSegDistance, type BodyPoints } from '../../src/anim/audit/metrics';
import { GEARS } from '../../src/config/movement';
import type { CharacterRig } from '../../src/player/characterRig';
import { ctRun, pelvisStep, type Mode, type Stick, type Target } from './mocapPlayer';
import { JOINTS, plantSlide, type J, type Rec } from './mocapMeasure';
import { aimRun, CROUCH_PLANS, type AimOpts, type AimTarget } from './mocapStrafe';

const DT = 1 / 60;
const DEG = 180 / Math.PI;
const mean = (v: number[]): number => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
const p2p = (v: number[]): number => (v.length ? Math.max(...v) - Math.min(...v) : 0);
const minOf = (v: number[]): number => (v.length ? Math.min(...v) : NaN);
const maxOf = (v: number[]): number => (v.length ? Math.max(...v) : NaN);
const pct = (v: number[], q: number): number => {
  if (!v.length) return NaN;
  const s = [...v].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
};

// ------------------------------------------------------------------ probe (what the rig exposes per step, beyond a Rec)

/** Per-recorded-frame extras, filled by `probe.onStep` (pass it as / inside the run's `onStep`). Aligned with the `Rec`. */
export interface Probe {
  /** keepElbowOut moved the shoulder this frame: bit 1 left, bit 2 right. */
  elbow: number[];
  /** The held gun's segment (x y z of the back end, x y z of the muzzle end; world), 6 per frame; empty with no gun. */
  gun: number[];
  /** The graph's kneel weight and the knee down (1 right, -1 left) per frame. */
  kneelW: number[];
  kneelSide: number[];
  /** The stick's x (the run's target) per frame. */
  stickX: number[];
  onStep: (rig: CharacterRig, k: number) => void;
}

/** Gun segment extents along the grip node's forward (m): [behind the grip, ahead of it] for a rifle / a pistol. */
export const GUN_EXTENT = { rifle: [0.2, 0.55], pistol: [0.03, 0.18] } as const;

/** A probe for a run recorded from `recFrom` s; `gun` the extents when the rig holds one (aimRun's does). */
export function makeProbe(recFrom: number, gun: readonly [number, number] | null = null, stick?: AimTarget | Target): Probe {
  let hooked = false;
  let bits = 0;
  const P: Probe = {
    elbow: [], gun: [], kneelW: [], kneelSide: [], stickX: [],
    onStep(rig, k) {
      const r = rig as unknown as Record<string, unknown> & { setWorldRot: (n: unknown, ...a: unknown[]) => unknown; keepElbowOut: (s: number) => void };
      if (!hooked) {
        hooked = true;
        const swr = r.setWorldRot.bind(r);
        let inEl = 0;
        r.setWorldRot = (n: unknown, ...a: unknown[]) => {
          if (inEl && n === r.shoulderL) bits |= 1;
          if (inEl && n === r.shoulderR) bits |= 2;
          return swr(n, ...a);
        };
        const keo = r.keepElbowOut.bind(r);
        r.keepElbowOut = (s: number) => {
          inEl = 1;
          keo(s);
          inEl = 0;
        };
      }
      const b = bits;
      bits = 0;
      const t = k * DT;
      if (t < recFrom) return;
      P.elbow.push(b);
      const g = rig.graph as unknown as { kneelW: number; kneelSide: number };
      P.kneelW.push(g.kneelW);
      P.kneelSide.push(g.kneelSide);
      const st = stick ? (stick as (t: number) => { x?: number; yr?: number })(t) : null;
      P.stickX.push(st && typeof (st as { x?: number }).x === 'number' ? (st as { x: number }).x : 0);
      if (gun && rig.heldWeapon) {
        const m = rig.heldWeapon.computeWorldMatrix(true).m;
        const l = Math.hypot(m[8]!, m[9]!, m[10]!) || 1;
        const fx = m[8]! / l, fy = m[9]! / l, fz = m[10]! / l;
        P.gun.push(m[12]! - fx * gun[0], m[13]! - fy * gun[0], m[14]! - fz * gun[0], m[12]! + fx * gun[1], m[13]! + fy * gun[1], m[14]! + fz * gun[1]);
      }
    },
  };
  return P;
}

// ------------------------------------------------------------------ frame helpers

/** A joint's position in the root frame at frame i (x right, y world up, z forward). */
function loc(R: Rec, j: J, i: number): [number, number, number] {
  const a = R.pos[j];
  const k = i * 3;
  const y = R.yaw[i]!;
  const c = Math.cos(y), s = Math.sin(y);
  const dx = a[k]! - R.root[k]!;
  const dz = a[k + 2]! - R.root[k + 2]!;
  return [dx * c - dz * s, a[k + 1]!, dx * s + dz * c];
}

/** Every `step`-th recorded frame of a run (step 2: the 30 Hz view of a 60 Hz sim). Event lists (landings) are kept whole. */
export function decimate(R: Rec, step: number): Rec {
  const pick = (a: number[], w: number): number[] => {
    const o: number[] = [];
    for (let i = 0; i < R.n; i += step) for (let c = 0; c < w; c++) o.push(a[i * w + c]!);
    return o;
  };
  const pos = {} as Record<J, number[]>;
  for (const j of JOINTS) pos[j] = pick(R.pos[j], 3);
  return {
    n: Math.ceil(R.n / step), pos, root: pick(R.root, 3), yaw: pick(R.yaw, 1), speed: pick(R.speed, 1),
    contactL: pick(R.contactL, 1), contactR: pick(R.contactR, 1), targetL: pick(R.targetL, 2), targetR: pick(R.targetR, 2),
    landL: R.landL, landR: R.landR, cycleTime: pick(R.cycleTime, 1), clipOn: pick(R.clipOn, 1), share: pick(R.share, 1), zk: pick(R.zk, 1),
    gaze: pick(R.gaze, 1), heelL: pick(R.heelL, 3), ballL: pick(R.ballL, 3), heelR: pick(R.heelR, 3), ballR: pick(R.ballR, 3),
    heldL: pick(R.heldL, 1), heldR: pick(R.heldR, 1),
  };
}

// ------------------------------------------------------------------ feet (AF1)

export interface PlantedTrack {
  /** Smallest signed offset of a planted ankle from the line under the hips, per foot and overall (m; + on its own side,
   *  < -0.005 crossed). Facing frame, the hips' midpoint as the line. */
  minL: number;
  minR: number;
  min: number;
  /** The same through metrics.ts `footTrack` (the pelvis' own frame; the e2e-anim measure). */
  pelvisFrameMin: number;
}

/** Planted-ankle signed lateral offset from the hip midline in the facing frame (AF1: >= +2 cm each side; < -0.5 cm crossed). */
export function plantedTrack(R: Rec): PlantedTrack {
  const L: number[] = [], Rr: number[] = [];
  for (let i = 0; i < R.n; i++) {
    const hl = loc(R, 'hipL', i), hr = loc(R, 'hipR', i);
    const mid = (hl[0] + hr[0]) / 2;
    if (R.contactL[i]) L.push(-(loc(R, 'ankleL', i)[0] - mid));
    if (R.contactR[i]) Rr.push(loc(R, 'ankleR', i)[0] - mid);
  }
  const P = R.pos;
  const ft = footTrack(P.hipL, P.hipR, P.ankleL, P.ankleR, 1, R.contactL, R.contactR);
  return { minL: minOf(L), minR: minOf(Rr), min: Math.min(minOf(L), minOf(Rr)), pelvisFrameMin: ft.min };
}

/** The feet's sideways gap (m, facing frame: right ankle x less left ankle x) at the frames the ankles pass each other
 *  fore-aft, and its overall minimum (AF1: passing gap >= 7 cm). NaN `passing` when no pass was recorded. */
export function passingGap(R: Rec): { passing: number; passingMean: number; overall: number; passes: number } {
  const at: number[] = [];
  let overall = Infinity;
  let prev = NaN;
  for (let i = 0; i < R.n; i++) {
    const l = loc(R, 'ankleL', i), r = loc(R, 'ankleR', i);
    overall = Math.min(overall, r[0] - l[0]);
    const d = l[2] - r[2];
    if (i > 0 && Math.sign(d) !== Math.sign(prev) && Number.isFinite(prev)) at.push(r[0] - l[0]);
    prev = d;
  }
  return { passing: minOf(at), passingMean: mean(at), overall, passes: at.length };
}

/** The foot plants' durations (s; plants that touch the record's ends dropped), per foot and the longest (AF1: no plant longer
 *  than stance time + 0.1 s while turning > 1 rad/s). */
export function plantDurations(R: Rec): { max: number; mean: number; L: number[]; R: number[] } {
  const runs = (c: number[]): number[] => {
    const o: number[] = [];
    let s = -1;
    for (let i = 0; i < c.length; i++) {
      if (c[i] && s < 0) s = i;
      if (!c[i] && s >= 0) {
        if (s > 0) o.push((i - s) * DT);
        s = -1;
      }
    }
    return o;
  };
  const L = runs(R.contactL), Rr = runs(R.contactR);
  return { max: maxOf([...L, ...Rr]), mean: mean([...L, ...Rr]), L, R: Rr };
}

/** The planted feet's worst contact slide (m; plantSlide as e2e-anim reads it; AF1: <= 1.5 cm per plant). */
export function contactSlideWorst(R: Rec): number {
  return plantSlide(R, 0.02);
}

/** Clip-feet ownership flips (R.clipOn changes): the total, per second, and the most in any 0.25 s window (AF1: <= 1). */
export function ownershipFlips(R: Rec): { flips: number; perS: number; maxPer250ms: number } {
  const at: number[] = [];
  for (let i = 1; i < R.n; i++) if (R.clipOn[i] !== R.clipOn[i - 1]) at.push(i);
  const w = Math.round(0.25 / DT);
  let m = 0;
  for (let a = 0; a < at.length; a++) {
    let b = a;
    while (b + 1 < at.length && at[b + 1]! - at[a]! < w) b++;
    m = Math.max(m, b - a + 1);
  }
  return { flips: at.length, perS: R.n ? at.length / (R.n * DT) : 0, maxPer250ms: m };
}

// ------------------------------------------------------------------ arms and trunk (AF2)

/** The wrists' second difference of position in the root frame (cm / frame at the record's rate): the worst and the 99th
 *  percentile over both wrists, and per wrist (AF2: <= 1.0 cm / frame at 60 Hz; AF4a: the grip hand, `R`). */
export function wristJerk(R: Rec): { max: number; p99: number; L: number; R: number } {
  const per = (j: 'wristL' | 'wristR'): number[] => {
    const o: number[] = [];
    for (let i = 1; i + 1 < R.n; i++) {
      const a = loc(R, j, i - 1), b = loc(R, j, i), c = loc(R, j, i + 1);
      o.push(Math.hypot(c[0] - 2 * b[0] + a[0], c[1] - 2 * b[1] + a[1], c[2] - 2 * b[2] + a[2]) * 100);
    }
    return o;
  };
  const l = per('wristL'), r = per('wristR');
  return { max: maxOf([...l, ...r]), p99: pct([...l, ...r], 0.99), L: maxOf(l), R: maxOf(r) };
}

/** keepElbowOut activity (needs the probe): frames active, rising edges and state changes per second, either side
 *  (AF2: state changes <= 2 / s). */
export function elbowOutRate(P: Probe): { activeFrac: number; activationsPerS: number; changesPerS: number } {
  let act = 0, up = 0, ch = 0;
  for (let i = 0; i < P.elbow.length; i++) {
    for (let s = 0; s < 2; s++) {
      const on = (P.elbow[i]! >> s) & 1;
      const was = i > 0 ? (P.elbow[i - 1]! >> s) & 1 : on;
      act += on;
      if (on && !was) up++;
      if (on !== was) ch++;
    }
  }
  const sec = P.elbow.length * DT;
  return { activeFrac: P.elbow.length ? act / (2 * P.elbow.length) : 0, activationsPerS: sec ? up / sec : 0, changesPerS: sec ? ch / sec : 0 };
}

/** Trunk pitch: hips -> neck off vertical (deg, mean / min / max over the record), as tests/mocapCrouch.test.ts carriage()
 *  (AF2: run 10-20, sprint <= 25; AF3: crouch 30-38). `hipY` the mean hip joint height (m). */
export function trunkPitch(R: Rec): { mean: number; min: number; max: number; hipY: number } {
  const a: number[] = [], y: number[] = [];
  for (let f = 0; f < R.n; f++) {
    const k = f * 3;
    const dx = R.pos.neck[k]! - R.pos.hips[k]!;
    const dy = R.pos.neck[k + 1]! - R.pos.hips[k + 1]!;
    const dz = R.pos.neck[k + 2]! - R.pos.hips[k + 2]!;
    a.push(Math.atan2(Math.hypot(dx, dz), dy) * DEG);
    y.push(R.pos.hips[k + 1]!);
  }
  return { mean: mean(a), min: minOf(a), max: maxOf(a), hipY: mean(y) };
}

let standY: Promise<number> | null = null;
/** The mean hip joint height of the standing idle (m): the reference for `pelvisBelowStanding`. */
export function standingHipY(): Promise<number> {
  standY ??= ctRun(() => ({ v: 0, yr: 0 }), 150, 1, 'on').then((R) => trunkPitch(R).hipY);
  return standY;
}

/** How far the mean hip height sits below the standing idle's (m; + lower) (AF2: run within 5 cm of the keyed run). */
export async function pelvisBelowStanding(R: Rec): Promise<number> {
  return (await standingHipY()) - trunkPitch(R).hipY;
}

/** Roll and bank (deg). `bank`: the trunk's lean (hips -> neck) toward the turn, `sg` the turn side (+1 right), mean over the
 *  record (AF2: >= 3 at 2.5 rad/s, both signs). `pelvisRoll`: the hip line's roll (+ right hip higher), mean and mean |x|
 *  (AF2: mean |x| <= 1 straight). `shoulderRoll`: the same on the shoulders. */
export function bankRoll(R: Rec, sg = 1): { bank: number; pelvisRoll: number; pelvisRollAbs: number; shoulderRoll: number } {
  const b: number[] = [], p: number[] = [], s: number[] = [];
  for (let i = 0; i < R.n; i++) {
    const h = loc(R, 'hips', i), n = loc(R, 'neck', i);
    b.push(sg * Math.atan2(n[0] - h[0], n[1] - h[1]) * DEG);
    const hl = loc(R, 'hipL', i), hr = loc(R, 'hipR', i);
    p.push(Math.atan2(hr[1] - hl[1], Math.hypot(hr[0] - hl[0], hr[2] - hl[2])) * DEG);
    const sl = loc(R, 'shoulderL', i), sr = loc(R, 'shoulderR', i);
    s.push(Math.atan2(sr[1] - sl[1], Math.hypot(sr[0] - sl[0], sr[2] - sl[2])) * DEG);
  }
  return { bank: mean(b), pelvisRoll: mean(p), pelvisRollAbs: mean(p.map(Math.abs)), shoulderRoll: mean(s) };
}

// ------------------------------------------------------------------ balance and hips (AF3, AF4a)

/** The body's centre of mass (metrics.ts centerOfMass) fore-aft of the planted ankles' midpoint, facing frame (m; + ahead
 *  of the feet): the mean over frames with both feet planted (`double`), over any support (`any`), and the swing p2p
 *  (AF3: within 5 cm in crouched double support). */
export function comOffset(R: Rec): { double: number; any: number; p2p: number; frames: number } {
  const dbl: number[] = [], any: number[] = [];
  const pt = (j: J, i: number): [number, number, number] => [R.pos[j][i * 3]!, R.pos[j][i * 3 + 1]!, R.pos[j][i * 3 + 2]!];
  for (let i = 0; i < R.n; i++) {
    if (!R.contactL[i] && !R.contactR[i]) continue;
    const b: BodyPoints = {
      hips: pt('hips', i), neck: pt('neck', i), head: pt('headNode', i),
      shoulderL: pt('shoulderL', i), shoulderR: pt('shoulderR', i), elbowL: pt('elbowL', i), elbowR: pt('elbowR', i),
      wristL: pt('wristL', i), wristR: pt('wristR', i), hipL: pt('hipL', i), hipR: pt('hipR', i),
      kneeL: pt('kneeL', i), kneeR: pt('kneeR', i), ankleL: pt('ankleL', i), ankleR: pt('ankleR', i),
    };
    const c = centerOfMass(b);
    const al = pt('ankleL', i), ar = pt('ankleR', i);
    const sx = R.contactL[i] && R.contactR[i] ? (al[0] + ar[0]) / 2 : R.contactL[i] ? al[0] : ar[0];
    const sz = R.contactL[i] && R.contactR[i] ? (al[2] + ar[2]) / 2 : R.contactL[i] ? al[2] : ar[2];
    const y = R.yaw[i]!;
    const fwd = (c[0] - sx) * Math.sin(y) + (c[2] - sz) * Math.cos(y);
    any.push(fwd);
    if (R.contactL[i] && R.contactR[i]) dbl.push(fwd);
  }
  return { double: mean(dbl), any: mean(any), p2p: p2p(any), frames: any.length };
}

/** The hips' lateral offset from the root in the root frame (m): peak-to-peak and the worst frame step (AF3: sway <= 5 cm
 *  p2p; AF4a: <= 4 cm p2p steady). `beyondPace`: the worst hips move in a frame beyond pace x dt (m; AF4a <= 2 cm). */
export function pelvisLateral(R: Rec): { p2p: number; stepMax: number; beyondPace: number } {
  const x: number[] = [];
  for (let i = 0; i < R.n; i++) x.push(loc(R, 'hips', i)[0]);
  let st = 0;
  for (let i = 1; i < x.length; i++) st = Math.max(st, Math.abs(x[i]! - x[i - 1]!));
  return { p2p: p2p(x), stepMax: st, beyondPace: pelvisStep(R)[0] };
}

/** The change of the mean trunk pitch and hip height from the first to the last third of a run (a gear ramp): deg, m. */
export function rampDelta(R: Rec): { trunk: number; hipY: number } {
  const n = Math.floor(R.n / 3);
  const sub = (a: number, b: number): Rec => ({ ...R, n: b - a, pos: Object.fromEntries(JOINTS.map((j) => [j, R.pos[j].slice(a * 3, b * 3)])) as Record<J, number[]> });
  const f = trunkPitch(sub(0, n)), l = trunkPitch(sub(R.n - n, R.n));
  return { trunk: l.mean - f.mean, hipY: l.hipY - f.hipY };
}

// ------------------------------------------------------------------ gun and hand (AF4a, AF4b)

/** Limb capsule radii (m) used by `gunClearance` (thigh, shank, trunk) and the gun's (rifle, pistol). */
export const CAPSULE = { thigh: 0.075, shank: 0.055, trunk: 0.13, rifle: 0.03, pistol: 0.022 } as const;

/** Gun segment against the leg capsules and the trunk capsule (hips -> neck) per frame: the smallest clearance (m; < 0
 *  penetrates). AF4b: legs >= 0, trunk >= -0.01. Needs a probe made with a gun extent (aimRun runs). */
export function gunClearance(R: Rec, P: Probe, pistol: boolean): { leg: number; trunk: number; frames: number } {
  const rg = pistol ? CAPSULE.pistol : CAPSULE.rifle;
  let leg = Infinity, trunk = Infinity;
  const n = Math.min(R.n, Math.floor(P.gun.length / 6));
  for (let i = 0; i < n; i++) {
    const g0 = [P.gun[i * 6]!, P.gun[i * 6 + 1]!, P.gun[i * 6 + 2]!];
    const g1 = [P.gun[i * 6 + 3]!, P.gun[i * 6 + 4]!, P.gun[i * 6 + 5]!];
    const pt = (j: J): number[] => [R.pos[j][i * 3]!, R.pos[j][i * 3 + 1]!, R.pos[j][i * 3 + 2]!];
    for (const s of ['L', 'R'] as const) {
      leg = Math.min(leg, segSegDistance(g0, g1, pt(`hip${s}`), pt(`knee${s}`)) - rg - CAPSULE.thigh);
      leg = Math.min(leg, segSegDistance(g0, g1, pt(`knee${s}`), pt(`ankle${s}`)) - rg - CAPSULE.shank);
    }
    trunk = Math.min(trunk, segSegDistance(g0, g1, pt('hips'), pt('neck')) - rg - CAPSULE.trunk);
  }
  return { leg: n ? leg : NaN, trunk: n ? trunk : NaN, frames: n };
}

/** The grip (trigger) hand, the right wrist, in the root frame against the hips: lateral (x) offset mean / p2p (m) and its
 *  per-frame jitter, the worst step (cm / frame; AF4a: <= 1.0 steady, <= 2 on flips and stops). `cycles`: that offset's mean
 *  over each `cycleS`-second segment of the record (AF4b: the pistol hand varies <= 3 cm across 10 stop-go cycles). */
export function gripLateral(R: Rec, cycleS = 1.8): { mean: number; p2p: number; stepMax: number; cycles: number[]; cycleSpread: number } {
  const x: number[] = [];
  for (let i = 0; i < R.n; i++) x.push(loc(R, 'wristR', i)[0] - loc(R, 'hips', i)[0]);
  let st = 0;
  for (let i = 1; i < x.length; i++) st = Math.max(st, Math.abs(x[i]! - x[i - 1]!) * 100);
  const w = Math.round(cycleS / DT);
  const cycles: number[] = [];
  for (let a = 0; a + w <= x.length; a += w) cycles.push(mean(x.slice(a, a + w)));
  return { mean: mean(x), p2p: p2p(x), stepMax: st, cycles, cycleSpread: p2p(cycles) };
}

/** The kneels over a run (needs the probe): episodes (kneel weight crossing 0.5 up), the knee of each (1 right, -1 left),
 *  side changes between consecutive episodes (AF4b: 0 over 10 stop-go cycles), and the frames kneeling within 0.4 s of a stick
 *  flip L <-> R (the stick's x changing sign, through zero allowed; AF4a: 0). */
export function kneelSummary(P: Probe): { episodes: number; sides: number[]; sideChanges: number; kneelOnFlip: number } {
  const sides: number[] = [];
  for (let i = 1; i < P.kneelW.length; i++) if (P.kneelW[i]! >= 0.5 && P.kneelW[i - 1]! < 0.5) sides.push(P.kneelSide[i]!);
  let changes = 0;
  for (let i = 1; i < sides.length; i++) if (sides[i] !== sides[i - 1]) changes++;
  const flips: number[] = [];
  let last = 0;
  for (let i = 0; i < P.stickX.length; i++) {
    const s = Math.sign(P.stickX[i]!);
    if (s !== 0) {
      if (last !== 0 && s !== last) flips.push(i);
      last = s;
    }
  }
  let on = 0;
  const w = Math.round(0.4 / DT);
  for (let i = 0; i < P.kneelW.length; i++) if (P.kneelW[i]! >= 0.5 && flips.some((f) => Math.abs(f - i) <= w)) on++;
  return { episodes: sides.length, sides, sideChanges: changes, kneelOnFlip: on };
}

// ------------------------------------------------------------------ runs

export interface Run {
  R: Rec;
  P: Probe;
  /** Pistol rig (weight 0.7)? */
  pistol: boolean;
}

/** A CT-driven free gait (ctRun) at pace `v`, yaw rate `yr` (rad/s, + right), crouched or not: `warm` s to settle, `sec` s
 *  recorded. `mode` 'on' (mocap, the default) / 'off'. The probe's `stickX` is 0. */
export async function runGait(v: number, yr: number, opts: { crouch?: boolean; warm?: number; sec?: number; mode?: Mode; target?: Target } = {}): Promise<Run> {
  const warm = opts.warm ?? 2, sec = opts.sec ?? 3;
  const P = makeProbe(warm);
  const target: Target = opts.target ?? ((t): Stick => ({ v, yr: t >= 0.5 ? yr : 0, crouch: opts.crouch ? 1 : 0 }));
  const R = await ctRun(target, Math.round((warm + sec) * 60), warm, opts.mode ?? 'on', P.onStep);
  return { R, P, pistol: false };
}

/** An aimed / crouched / wall run on aimRun (`AimOpts.weight` 0.7 = pistol; `wall`: the drawn crouched back-to-wall slide). */
export async function runAimed(plan: [AimTarget, number, number], opts: AimOpts & { mode?: Mode } = {}): Promise<Run> {
  const pistol = opts.weight !== undefined && opts.weight < 0.85;
  const P = makeProbe(plan[2], pistol ? GUN_EXTENT.pistol : GUN_EXTENT.rifle, plan[0]);
  const R = await aimRun(plan[0], plan[1], plan[2], opts.mode ?? 'on', P.onStep, true, { weight: opts.weight, wall: opts.wall });
  return { R, P, pistol };
}

// ------------------------------------------------------------------ the scenario set (the AF0 list) and a flat measure

export interface Scenario {
  name: string;
  /** 'gait' | 'crouch' | 'strafe' | 'wall': which measures the table prints. */
  kind: 'gait' | 'crouch' | 'strafe' | 'wall';
  /** Turn side (+1 right, -1 left) for the bank sign; 1 when not turning. */
  sg: number;
  run: () => Promise<Run>;
}

/** Jog 3.0 / run 4.0 / sprint 5.0 m/s straight and turning 1.5 / 2.5 / 4.0 rad/s both ways; walk 1.4 turns (control). */
export function gaitScenarios(): Scenario[] {
  const out: Scenario[] = [];
  for (const [g, v] of [['walk', 1.4], ['jog', 3.0], ['run', 4.0], ['sprint', 5.0]] as const) {
    out.push({ name: `${g}-${v}-straight`, kind: 'gait', sg: 1, run: () => runGait(v, 0) });
    for (const yr of [1.5, 2.5, 4.0]) {
      if (g === 'walk' && yr > 2.5) continue;
      for (const sg of [1, -1]) out.push({ name: `${g}-${v}-turn${yr}${sg > 0 ? 'R' : 'L'}`, kind: 'gait', sg, run: () => runGait(v, sg * yr) });
    }
  }
  return out;
}

/** Crouch idle, gears 1-3 crouch walk (GEARS.crouch) and the gear 1 -> 3 ramp (the pace asked climbing over 6 s). */
export function crouchScenarios(): Scenario[] {
  const c = GEARS.crouch;
  const out: Scenario[] = [{ name: 'crouch-idle', kind: 'crouch', sg: 1, run: () => runGait(0, 0, { crouch: true, warm: 2, sec: 3 }) }];
  for (let g = 0; g < 3; g++) out.push({ name: `crouch-gear${g + 1}-${c[g]}`, kind: 'crouch', sg: 1, run: () => runGait(c[g]!, 0, { crouch: true, warm: 2.5, sec: 4 }) });
  out.push({
    name: 'crouch-ramp-1to3', kind: 'crouch', sg: 1,
    run: () => runGait(0, 0, { warm: 1, sec: 7, target: (t) => ({ v: c[0]! + (c[2]! - c[0]!) * Math.max(0, Math.min(1, (t - 1.5) / 6)), yr: 0, crouch: 1 }) }),
  });
  return out;
}

/** Crouched aimed strafe, rifle and pistol: steady L / R at 0.4 / 0.7, L <-> R flips (through the dead zone), 10 stop-go cycles. */
export function strafeScenarios(): Scenario[] {
  const out: Scenario[] = [];
  for (const [w, weight] of [['rifle', 1], ['pistol', 0.7]] as const) {
    for (const v of [0.4, 0.7]) {
      for (const sg of [-1, 1]) out.push({ name: `cstrafe-${w}-${sg < 0 ? 'L' : 'R'}${v}`, kind: 'strafe', sg, run: () => runAimed(CROUCH_PLANS.steady(sg, v), { weight }) });
    }
    out.push({ name: `cstrafe-${w}-flip0.7`, kind: 'strafe', sg: 1, run: () => runAimed(CROUCH_PLANS.flip(0.7, 1.3), { weight }) });
    for (const sg of [-1, 1]) out.push({ name: `cstrafe-${w}-stopgo10-${sg < 0 ? 'L' : 'R'}`, kind: 'strafe', sg, run: () => runAimed(CROUCH_PLANS.stopGo(sg, 0.7), { weight }) });
  }
  return out;
}

/** Drawn crouched wall slide both ways and a reversal, rifle and pistol (the wall behind the root; see mocapStrafe.ts AimOpts). */
export function wallScenarios(): Scenario[] {
  const out: Scenario[] = [];
  for (const [w, weight] of [['rifle', 1], ['pistol', 0.7]] as const) {
    for (const sg of [-1, 1]) out.push({ name: `wallslide-${w}-${sg < 0 ? 'L' : 'R'}`, kind: 'wall', sg, run: () => runAimed(CROUCH_PLANS.wallSlide(sg, 0.6), { weight, wall: true }) });
    out.push({ name: `wallslide-${w}-reverse`, kind: 'wall', sg: 1, run: () => runAimed(CROUCH_PLANS.wallReverse(0.6), { weight, wall: true }) });
  }
  return out;
}

/** One run's numbers, flat (cm / deg / s as the field names say). */
export interface Measures {
  speed: number;
  trackMinL_cm: number;
  trackMinR_cm: number;
  trackPelvisFrameMin_cm: number;
  passGap_cm: number;
  gapMin_cm: number;
  plantMax_s: number;
  plantMean_s: number;
  slide_cm: number;
  flipsPerS: number;
  flipsMax250: number;
  wristJerkMax_cm: number;
  wristJerkP99_cm: number;
  wristJerkR_cm: number;
  elbowChangesPerS: number;
  elbowActiveFrac: number;
  trunkMean_deg: number;
  trunkMax_deg: number;
  hipY_cm: number;
  pelBelowStanding_cm: number;
  bank_deg: number;
  pelvisRoll_deg: number;
  pelvisRollAbs_deg: number;
  comDouble_cm: number;
  comAny_cm: number;
  pelLatP2P_cm: number;
  pelBeyondPace_cm: number;
  gunLeg_cm: number;
  gunTrunk_cm: number;
  gripMean_cm: number;
  gripP2P_cm: number;
  gripStepMax_cm: number;
  gripCycleSpread_cm: number;
  kneelEpisodes: number;
  kneelSideChanges: number;
  kneelOnFlip_frames: number;
  /** Mean planted-foot stride (same-foot landings, m) and the step (half). */
  stepLen_cm: number;
}

/** Every measure of one run (NaN where the run has nothing to read: no gun, no kneel, no plants). */
export async function measureAll(run: Run, sg = 1): Promise<Measures> {
  const { R, P } = run;
  const t = plantedTrack(R), g = passingGap(R), d = plantDurations(R), f = ownershipFlips(R), w = wristJerk(R), e = elbowOutRate(P);
  const tr = trunkPitch(R), b = bankRoll(R, sg), c = comOffset(R), pl = pelvisLateral(R), gr = gripLateral(R), k = kneelSummary(P);
  const gc = P.gun.length ? gunClearance(R, P, run.pistol) : { leg: NaN, trunk: NaN };
  const strides: number[] = [];
  for (const L of [R.landL, R.landR]) for (let j = 4; j + 1 < L.length; j += 2) strides.push(Math.hypot(L[j]! - L[j - 2]!, L[j + 1]! - L[j - 1]!));
  const cm = 100;
  return {
    speed: mean(R.speed),
    trackMinL_cm: t.minL * cm, trackMinR_cm: t.minR * cm, trackPelvisFrameMin_cm: t.pelvisFrameMin * cm,
    passGap_cm: g.passing * cm, gapMin_cm: g.overall * cm,
    plantMax_s: d.max, plantMean_s: d.mean, slide_cm: contactSlideWorst(R) * cm,
    flipsPerS: f.perS, flipsMax250: f.maxPer250ms,
    wristJerkMax_cm: w.max, wristJerkP99_cm: w.p99, wristJerkR_cm: w.R,
    elbowChangesPerS: e.changesPerS, elbowActiveFrac: e.activeFrac,
    trunkMean_deg: tr.mean, trunkMax_deg: tr.max, hipY_cm: tr.hipY * cm, pelBelowStanding_cm: (await pelvisBelowStanding(R)) * cm,
    bank_deg: b.bank, pelvisRoll_deg: b.pelvisRoll, pelvisRollAbs_deg: b.pelvisRollAbs,
    comDouble_cm: c.double * cm, comAny_cm: c.any * cm, pelLatP2P_cm: pl.p2p * cm, pelBeyondPace_cm: pl.beyondPace * cm,
    gunLeg_cm: gc.leg * cm, gunTrunk_cm: gc.trunk * cm,
    gripMean_cm: gr.mean * cm, gripP2P_cm: gr.p2p * cm, gripStepMax_cm: gr.stepMax, gripCycleSpread_cm: gr.cycleSpread * cm,
    kneelEpisodes: k.episodes, kneelSideChanges: k.sideChanges, kneelOnFlip_frames: k.kneelOnFlip,
    stepLen_cm: (mean(strides) / 2) * cm,
  };
}
