/**
 * (mixamo-retarget I3) The Mixamo stand-to-crouch / crouch-to-stand on Wren's stance changes behind `?mixamo=1`
 * (`src/anim/mixamo.ts` `WREN_STANCE`, played by `animGraph.ts` `stanceShot` over the keyed pose by progress on the
 * game's stance blend). The crouch input is driven as `playerController.ts` `updateStance` drives it: a linear `crouchK`
 * at `1 / MOVEMENT.crouchTime` down and `1 / MOVEMENT.standTime` up, eased by `easeInOut`.
 * - (a) off identity: a Wren graph through stand -> crouch -> hold -> stand -> walk is bit-identical (every `RigTargets`
 *   field and the pose, as float64 bits, every frame) after the flag went on and off; with the flag on and both
 *   `MIXAMO_ON` rows false too;
 * - (b) on: `WREN_STANCE` holds the captures by their rows; the keyed pose mid-change differs from off, and equals off
 *   exactly at a settled stance (crouch 0 or 1), moving (walk + crouch press) and drawn (the drawn share 1);
 * - (c) timing: the shot never changes the stance: the keyed pelvis height is bit-identical on and off every frame, the
 *   change takes the game's frames, and the shot's progress reaches 1 (the take's last frame) the frame the blend does;
 * - (d) no pop: the largest bone step a frame over a full change and over a reversal at mid-change stays under
 *   e2e-anim's pose-continuity limit; the A8 readings (bone step, e2e-anim's stand <-> crouch velocity pop, knee / elbow
 *   ranges, planted slide) against the hand-made blend decide the `MIXAMO_ON` rows (asserted equal to what ships);
 * - (e) a graph that is not Wren's (`wrenReady` off) is bit-identical with the flag on; no allocation per frame with the
 *   flag on through stance changes.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { MIXAMO_ON, setMixamo, WREN_STANCE } from '../src/anim/mixamo';
import { AnimGraph, defaultInput, type AnimInput } from '../src/anim/animGraph';
import { newKeyedPose, sampleKeyed, type KeyedPose } from '../src/anim/keyed';
import { MOCAP_STAND_TO_CROUCH } from '../src/anim/clips/mixamo/stand_to_crouch';
import { MOCAP_CROUCH_TO_STAND } from '../src/anim/clips/mixamo/crouch_to_stand';
import { MOVEMENT } from '../src/config/movement';
import { easeInOut } from '../src/anim/motion';
import { proportions } from '../src/player/proportions';
import { CRAB_CROUCH, CROUCH_POP, FOOT_SLIDE } from '../src/anim/audit/limits';
import { elbowWing, kneeBow, kneeSeparation } from '../src/anim/audit/metrics';
import { driveRig, plantSlide, pops, POP_DEG, type Rec } from './helpers/mocapMeasure';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';

// (one-game) the Mixamo captures are on at load by default now; this file pins the hand-made state: `?mixamo=0`
setMixamo(false);

/** MIXAMO_ON as shipped (a test that forces a row puts it back). */
const ON0 = { ...MIXAMO_ON };
afterEach(() => {
  Object.assign(MIXAMO_ON, ON0);
  setMixamo(false);
});

const DT = 1 / 60;

/** Both rows on (the shots themselves, whatever ships); I1's idle and crouch walk rows off (I4 ships them on: they would
 *  move the still and settled frames these tests compare). */
function shotsOn(): void {
  MIXAMO_ON.standing_idle = false;
  MIXAMO_ON.crouched_walking = false;
  MIXAMO_ON.stand_to_crouch = true;
  MIXAMO_ON.crouch_to_stand = true;
  setMixamo(true);
}

/** `updateStance` (playerController.ts): crouchK linear to its target, the blend eased. */
class Stance {
  k = 0;
  crouched = false;
  step(dt: number): number {
    const target = this.crouched ? 1 : 0;
    const rate = target > this.k ? 1 / MOVEMENT.crouchTime : 1 / MOVEMENT.standTime;
    this.k = target > this.k ? Math.min(target, this.k + rate * dt) : Math.max(target, this.k - rate * dt);
    return easeInOut(this.k);
  }
}

// ---- the graph run and its bit hash ----

/** cyrb53 over float64 bit patterns (-0 as +0), as tests/helpers/animSkeletonIdentity.ts hashes. */
class Hasher {
  private h1 = 0xdeadbeef;
  private h2 = 0x41c6ce57;
  private readonly f = new Float64Array(1);
  private readonly u = new Uint32Array(this.f.buffer);
  add(v: number): void {
    this.f[0] = v === 0 ? 0 : v;
    for (let k = 0; k < 2; k++) {
      const c = this.u[k]!;
      this.h1 = Math.imul(this.h1 ^ c, 2654435761);
      this.h2 = Math.imul(this.h2 ^ c, 1597334677);
    }
  }
  digest(): string {
    let h1 = Math.imul(this.h1 ^ (this.h1 >>> 16), 2246822507);
    h1 ^= Math.imul(this.h2 ^ (this.h2 >>> 13), 3266489909);
    let h2 = Math.imul(this.h2 ^ (this.h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  }
}

/** Every number / boolean under `v` (nested objects, arrays, typed arrays), keys in order. */
function hashAll(h: Hasher, v: unknown, seen: Set<object>): void {
  if (typeof v === 'number') h.add(v);
  else if (typeof v === 'boolean') h.add(v ? 1 : 0);
  else if (typeof v === 'string') for (let k = 0; k < v.length; k++) h.add(v.charCodeAt(k));
  else if (v !== null && typeof v === 'object') {
    if (seen.has(v)) return;
    seen.add(v);
    if (ArrayBuffer.isView(v)) {
      const a = v as unknown as ArrayLike<number>;
      for (let k = 0; k < a.length; k++) h.add(Number(a[k]));
    }
    else for (const k of Object.keys(v)) hashAll(h, (v as Record<string, unknown>)[k], seen);
  }
}

const hashOf = (v: unknown): string => {
  const h = new Hasher();
  hashAll(h, v, new Set());
  return h.digest();
};

/** A run's segment: `sec` s at `speed` m/s with the crouch held (`crouched`) or not. */
interface Seg { sec: number; speed: number; crouched: boolean }

/** Still: stand 2 s, crouch (a press), hold, stand up, hold, then a walk. */
const STILL: readonly Seg[] = [
  { sec: 2, speed: 0, crouched: false },
  { sec: 1.5, speed: 0, crouched: true },
  { sec: 1, speed: 0, crouched: false },
  { sec: 2, speed: 1.4, crouched: false },
];
/** Moving: a walk 3 s, a crouch press walking, stand up walking. */
const MOVING: readonly Seg[] = [
  { sec: 3, speed: 1.4, crouched: false },
  { sec: 1, speed: 1.4, crouched: true },
  { sec: 1, speed: 1.4, crouched: false },
];

interface Run {
  /** Per frame: every RigTargets field and the pose; the keyed pose; its pelvis height; the crouch input. */
  all: string[];
  keyed: string[];
  pelY: number[];
  crouch: number[];
  /** The graph's shot direction and progress (+1 down at the blend, -1 up at one less it). */
  dir: number[];
  prog: number[];
}

/** A fresh graph (Wren's, or another rig's: `mocapOk` false a guard's) through `segs`, holstered (or drawn). */
function runGraph(segs: readonly Seg[], wren = true, drawn = false, mocapOk = true): Run {
  const random = Math.random;
  let seed = 4242;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  try {
    const g = new AnimGraph(proportions('average', 1.68));
    g.wrenReady = wren;
    const gi = g as unknown as { snDir: number; snK: number };
    const i: AnimInput = defaultInput();
    i.keyedOk = true;
    i.ready = !drawn;
    i.armed = drawn;
    i.keyedDrawn = drawn;
    i.mocapOk = mocapOk;
    const st = new Stance();
    const r: Run = { all: [], keyed: [], pelY: [], crouch: [], dir: [], prog: [] };
    for (const s of segs) {
      for (let n = 0; n < Math.round(s.sec * 60); n++) {
        st.crouched = s.crouched;
        i.speed = s.speed;
        i.localZ = s.speed > 0 ? 1 : 0;
        i.crouch = st.step(DT);
        g.update(DT, i);
        const h = new Hasher();
        hashAll(h, g.out, new Set());
        for (let c = 0; c < g.pose.length; c++) h.add(g.pose[c]!);
        r.all.push(h.digest());
        r.keyed.push(hashOf(g.out.keyed));
        r.pelY.push(g.out.keyed.pel[1]!);
        r.crouch.push(i.crouch);
        r.dir.push(gi.snDir);
        r.prog.push(gi.snDir > 0 ? gi.snK : gi.snDir < 0 ? 1 - gi.snK : NaN);
      }
    }
    return r;
  } finally {
    Math.random = random;
  }
}

function differ(a: string[], b: string[], keep: (f: number) => boolean = () => true): number {
  let n = Math.abs(a.length - b.length);
  for (let k = 0; k < Math.min(a.length, b.length); k++) if (keep(k) && a[k] !== b[k]) n++;
  return n;
}

const changeFrames = (sec: number): number => Math.ceil(sec * 60 - 1e-9);

describe('mixamo I3 (a): off is bit-identical', () => {
  it('stand -> crouch -> stand -> walk after the flag went on and off; the flag on with both rows false', () => {
    const base = runGraph(STILL);
    shotsOn();
    setMixamo(false);
    expect(WREN_STANCE.down).toBeNull();
    expect(WREN_STANCE.up).toBeNull();
    expect(differ(base.all, runGraph(STILL).all)).toBe(0);
    MIXAMO_ON.stand_to_crouch = false;
    MIXAMO_ON.crouch_to_stand = false;
    MIXAMO_ON.standing_idle = false;
    MIXAMO_ON.crouched_walking = false;
    setMixamo(true);
    expect(WREN_STANCE.down).toBeNull();
    expect(WREN_STANCE.up).toBeNull();
    expect(differ(base.all, runGraph(STILL).all)).toBe(0);
  }, 120_000);
});

describe('mixamo I3 (b): on', () => {
  it('WREN_STANCE holds each capture by its row (A2: the flag only); the same object always', () => {
    const S = WREN_STANCE;
    shotsOn();
    expect(WREN_STANCE).toBe(S);
    expect(S.down).toBe(MOCAP_STAND_TO_CROUCH);
    expect(S.up).toBe(MOCAP_CROUCH_TO_STAND);
    MIXAMO_ON.crouch_to_stand = false;
    setMixamo(true);
    expect(S.down).toBe(MOCAP_STAND_TO_CROUCH);
    expect(S.up).toBeNull();
    setMixamo(true);
    Object.assign(MIXAMO_ON, ON0);
    setMixamo(true);
    expect(S.down).toBe(ON0.stand_to_crouch ? MOCAP_STAND_TO_CROUCH : null);
    expect(S.up).toBe(ON0.crouch_to_stand ? MOCAP_CROUCH_TO_STAND : null);
    setMixamo(false);
    expect(S.down).toBeNull();
  });

  it('the keyed pose moves mid-change and equals off at a settled stance (crouch 0 or 1)', () => {
    const off = runGraph(STILL);
    shotsOn();
    const on = runGraph(STILL);
    const mid = (f: number): boolean => off.crouch[f]! > 0 && off.crouch[f]! < 1;
    const nMid = off.crouch.filter((c) => c > 0 && c < 1).length;
    expect(nMid).toBe(changeFrames(MOVEMENT.crouchTime) - 1 + changeFrames(MOVEMENT.standTime) - 1);
    // (I4) the edge fade 0.4: the first and last mid frame of each change weigh under the shot's 1e-4 skip
    expect(differ(off.keyed, on.keyed, mid)).toBeGreaterThanOrEqual(nMid - 4);
    expect(differ(off.keyed, on.keyed, (f) => !mid(f))).toBe(0);
  }, 120_000);

  it('moving (walk + crouch press) and drawn (the drawn share 1) equal off', () => {
    const offMove = runGraph(MOVING);
    const offDrawn = runGraph(STILL, true, true);
    shotsOn();
    expect(differ(offMove.all, runGraph(MOVING).all)).toBe(0);
    expect(differ(offDrawn.all, runGraph(STILL, true, true).all)).toBe(0);
  }, 120_000);
});

describe('mixamo I3 (c): timing', () => {
  it("the stance keeps the game's clock: pelvis height identical every frame, the change in the game's frames, progress 1 on the blend's last frame", () => {
    const off = runGraph(STILL);
    shotsOn();
    const on = runGraph(STILL);
    expect(on.crouch).toEqual(off.crouch);
    for (let f = 0; f < on.pelY.length; f++) expect(Object.is(on.pelY[f], off.pelY[f]), `pelvis height frame ${f}`).toBe(true);
    // the down change: from the press (frame 120) to the first frame at 1
    const down0 = 120;
    const down1 = on.crouch.indexOf(1, down0);
    expect(down1 - down0 + 1).toBe(changeFrames(MOVEMENT.crouchTime));
    // progress rises with the blend and is 1 (shot over) exactly where it reaches 1
    for (let f = down0; f < down1; f++) {
      expect(on.dir[f], `down frame ${f}`).toBe(1);
      expect(on.prog[f]).toBe(on.crouch[f]);
    }
    expect(on.dir[down1]).toBe(0);
    const up0 = 120 + 90;
    const up1 = on.crouch.indexOf(0, up0);
    expect(up1 - up0 + 1).toBe(changeFrames(MOVEMENT.standTime));
    for (let f = up0; f < up1; f++) {
      expect(on.dir[f], `up frame ${f}`).toBe(-1);
      expect(on.prog[f]).toBe(1 - on.crouch[f]!);
    }
    expect(on.dir[up1]).toBe(0);
    // progress 1 samples a one-shot's last frame (sampleKeyed wraps phase 1 to frame 0: the graph maps p x (N-1)/N)
    for (const c of [MOCAP_STAND_TO_CROUCH, MOCAP_CROUCH_TO_STAND]) {
      expect(c).not.toBeNull();
      const N = c!.frames;
      const P: KeyedPose = sampleKeyed(c!, (1 * (N - 1)) / N, 1, newKeyedPose());
      for (let k = 0; k < 3; k++) expect(P.pel[k]).toBeCloseTo(c!.pel[(N - 1) * 3 + k]!, 6);
      const P0 = sampleKeyed(c!, 0, 1, newKeyedPose());
      for (let k = 0; k < 3; k++) expect(P0.pel[k]).toBeCloseTo(c!.pel[k]!, 6);
    }
  }, 120_000);
});

// ---- (d) the headless measures on Wren's rig (A8) ----

const cm = (m: number): string => (m * 100).toFixed(2);
const JS = ['hips', 'kneeL', 'kneeR', 'wristL', 'wristR', 'headNode'] as const;

/** e2e-anim's stand <-> crouch metric (tests/crouchPops.test.ts `popOf`): the worst velocity change of the hips, wrists,
 *  head and the knees over planted feet, in the body frame (m per 60 Hz frame). */
function popOf(R: Rec): number {
  let worst = 0;
  let prev: number[] | null = null;
  let vel: number[] | null = null;
  const now: number[] = [];
  const v: number[] = [];
  for (let f = 0; f < R.n; f++) {
    const rx = R.root[f * 3]!, ry = R.root[f * 3 + 1]!, rz = R.root[f * 3 + 2]!;
    const cs = Math.cos(R.yaw[f]!), sn = Math.sin(R.yaw[f]!);
    now.length = 0;
    for (const j of JS) {
      const P = R.pos[j];
      const dx = P[f * 3]! - rx, dz = P[f * 3 + 2]! - rz;
      now.push(dx * cs - dz * sn, P[f * 3 + 1]! - ry, dx * sn + dz * cs);
    }
    if (prev) {
      v.length = 0;
      for (let k = 0; k < now.length; k++) v.push(now[k]! - prev[k]!);
      if (vel)
        for (let k = 0; k < JS.length; k++) {
          const pl = k === 1 ? R.contactL : k === 2 ? R.contactR : null;
          if (pl && !(pl[f] && pl[f - 1])) continue;
          const a = Math.sqrt((v[3 * k]! - vel[3 * k]!) ** 2 + (v[3 * k + 1]! - vel[3 * k + 1]!) ** 2 + (v[3 * k + 2]! - vel[3 * k + 2]!) ** 2);
          if (a > worst) worst = a;
        }
      vel = v.slice();
    }
    prev = now.slice();
  }
  return worst;
}

/** Frames `from` .. `to` of a recording (every per-frame array cut by its stride). */
function sub(R: Rec, from: number, to: number): Rec {
  const cut = (a: number[], s: number): number[] => a.slice(from * s, to * s);
  const pos = {} as Rec['pos'];
  for (const j of Object.keys(R.pos) as (keyof Rec['pos'])[]) pos[j] = cut(R.pos[j], 3);
  return {
    ...R,
    n: to - from,
    pos,
    root: cut(R.root, 3),
    yaw: cut(R.yaw, 1),
    speed: cut(R.speed, 1),
    contactL: cut(R.contactL, 1),
    contactR: cut(R.contactR, 1),
    targetL: cut(R.targetL, 2),
    targetR: cut(R.targetR, 2),
    heelL: cut(R.heelL, 3),
    ballL: cut(R.ballL, 3),
    heelR: cut(R.heelR, 3),
    ballR: cut(R.ballR, 3),
    heldL: cut(R.heldL, 1),
    heldR: cut(R.heldR, 1),
  };
}

interface Body {
  step: number;
  bone: string;
  pop: number;
  kneeMin: number;
  kneeMax: number;
  bow: number;
  wing: number;
  slide: number;
}

function body(R: Rec): Body {
  const P = R.pos;
  const C = CRAB_CROUCH;
  const knee = kneeSeparation(P.hipL, P.hipR, P.kneeL, P.kneeR, C.kneeSep.min, C.kneeSep.max);
  const p = pops(R);
  return {
    step: p.maxStepDeg,
    bone: p.bone,
    pop: popOf(R),
    kneeMin: knee.min,
    kneeMax: knee.max,
    bow: kneeBow(P.hipL, P.hipR, P.kneeL, P.kneeR, P.ankleL, P.ankleR, C.kneeBow).max,
    wing: elbowWing(P.shoulderL, P.shoulderR, P.elbowL, P.elbowR, C.elbowWing).max,
    slide: plantSlide(R, FOOT_SLIDE),
  };
}

const line = (b: Body): string =>
  `step ${b.step.toFixed(1)} deg (${b.bone}), pop ${cm(b.pop)} cm/frame, knees ${b.kneeMin.toFixed(2)}-${b.kneeMax.toFixed(2)} x hips, knee out ${cm(b.bow)} cm, elbow out ${cm(b.wing)} cm, slide ${cm(b.slide)} cm`;

/** The recording starts at REC s; the crouch press at PRESS s, the stand press at STAND s (or at crouchK 0.5: a reversal). */
const REC = 2;
const PRESS = 2.5;
const STAND = 4;
const END = 5;

/** Wren's rig at a standstill, holstered: stand -> crouch -> stand on the game's stance clock (or the reversal). */
async function cycle(reverse: boolean): Promise<{ R: Rec; down: [number, number]; up: [number, number] }> {
  const st = new Stance();
  let reversed = false;
  let wren = true;
  const R = await driveRig(Math.round(END * 60), (_k, t) => {
    if (reverse) {
      if (t >= PRESS && !reversed) st.crouched = true;
      if (st.crouched && st.k >= 0.5) {
        st.crouched = false;
        reversed = true;
      }
    } else st.crouched = t >= PRESS && t < STAND;
    return { speed: 0, yawRate: 0, rec: t >= REC, crouch: st.step(DT) };
  }, (rig) => {
    wren &&= rig.graph.wrenReady;
  });
  expect(wren, 'the measure rig is Wren').toBe(true);
  // each change's frames (from the press, a few frames past the settle, for the velocity pop's tail)
  const f0 = Math.round((PRESS - REC) * 60);
  const f1 = Math.round((STAND - REC) * 60);
  return { R, down: [f0 - 2, f0 + changeFrames(MOVEMENT.crouchTime) + 6], up: [f1 - 2, f1 + changeFrames(MOVEMENT.standTime) + 6] };
}

/** At least as good on a measure (lower is better): within the limit where the reference is, else no worse than it. */
const asGood = (mx: number, ref: number, limit: number, tol: number): boolean => mx <= Math.max(limit, ref + tol);
const kneesAsGood = (mx: Body, ref: Body): boolean =>
  mx.kneeMin >= Math.min(CRAB_CROUCH.kneeSep.min, ref.kneeMin - 0.02) && mx.kneeMax <= Math.max(CRAB_CROUCH.kneeSep.max, ref.kneeMax + 0.02);
const passes = (mx: Body, ref: Body): boolean =>
  mx.step <= POP_DEG &&
  asGood(mx.step, ref.step, POP_DEG, 1) &&
  asGood(mx.pop, ref.pop, CROUCH_POP, 0.002) &&
  kneesAsGood(mx, ref) &&
  asGood(mx.bow, ref.bow, CRAB_CROUCH.kneeBow, 0.002) &&
  asGood(mx.wing, ref.wing, CRAB_CROUCH.elbowWing, 0.002) &&
  asGood(mx.slide, ref.slide, FOOT_SLIDE, 0.002);

describe('mixamo I3 (d): no pop, and the A8 measures (headless, Wren rig)', () => {
  it('the shots against the hand-made stance blend: bone step, velocity pop, knee / elbow ranges, planted slide', async () => {
    setMixamo(false);
    const hand = await cycle(false);
    shotsOn();
    const mx = await cycle(false);
    const hd = body(sub(hand.R, ...hand.down));
    const hu = body(sub(hand.R, ...hand.up));
    const md = body(sub(mx.R, ...mx.down));
    const mu = body(sub(mx.R, ...mx.up));
    console.info(
      `(mixamo I3) stance changes at a standstill (crouch ${MOVEMENT.crouchTime} s, stand ${MOVEMENT.standTime} s):\n` +
        `stand_to_crouch: Mixamo ${line(md)}\n  hand-made ${line(hd)}\n` +
        `crouch_to_stand: Mixamo ${line(mu)}\n  hand-made ${line(hu)}`,
    );
    // the shots move the body mid-change (a capture, not the blend)
    expect(Math.abs(md.step - hd.step) + Math.abs(md.pop - hd.pop) + Math.abs(md.wing - hd.wing)).toBeGreaterThan(0);
    // no pop (e2e-anim's pose continuity) over each full change
    expect(md.step, 'stand_to_crouch bone step').toBeLessThanOrEqual(POP_DEG);
    expect(mu.step, 'crouch_to_stand bone step').toBeLessThanOrEqual(POP_DEG);
    // (I4) A8 is information (Michael 2026-10-26: Mixamo wins unless visibly broken): the caps above and the slide catch a
    // visible break; the rows ship on
    console.info(`(mixamo I4) A8: stand_to_crouch ${passes(md, hd) ? 'pass' : 'fail'}, crouch_to_stand ${passes(mu, hu) ? 'pass' : 'fail'}`);
    expect(md.slide, 'stand_to_crouch planted slide').toBeLessThanOrEqual(FOOT_SLIDE);
    expect(mu.slide, 'crouch_to_stand planted slide').toBeLessThanOrEqual(FOOT_SLIDE);
    expect(ON0.stand_to_crouch).toBe(true);
    expect(ON0.crouch_to_stand).toBe(true);
  }, 300_000);

  it('a reversal at mid-change (a stand press at crouchK 0.5) does not pop', async () => {
    setMixamo(false);
    const hand = await cycle(true);
    shotsOn();
    const mx = await cycle(true);
    const w: [number, number] = [mx.down[0], mx.down[0] + 40];
    const h = body(sub(hand.R, ...w));
    const m = body(sub(mx.R, ...w));
    console.info(`(mixamo I3) reversal at crouchK 0.5: Mixamo ${line(m)}\n  hand-made ${line(h)}`);
    expect(m.step, 'reversal bone step').toBeLessThanOrEqual(POP_DEG);
  }, 300_000);
});

// ---- (e) only Wren, and allocation ----

describe('mixamo I3 (e): only Wren, no allocation', () => {
  it("a graph that is not Wren's (wrenReady off) is bit-identical with the flag on", () => {
    const guard = runGraph(STILL, false, false, false);
    const carrier = runGraph(STILL, false);
    shotsOn();
    expect(differ(guard.all, runGraph(STILL, false, false, false).all)).toBe(0);
    expect(differ(carrier.all, runGraph(STILL, false).all)).toBe(0);
  }, 120_000);

  it('stance changes with the flag on leave no more a frame than off', async () => {
    const g = new AnimGraph(proportions('average', 1.68));
    g.wrenReady = true;
    const i = defaultInput();
    i.keyedOk = true;
    i.ready = true;
    i.armed = false;
    // one cycle: stand 0.5 s, crouch, hold 0.5 s, stand up (the inputs precomputed: the loop only reads them)
    const st = new Stance();
    const seq: number[] = [];
    for (let f = 0; f < 120; f++) {
      st.crouched = f >= 30 && f < 80;
      seq.push(st.step(DT));
    }
    // and a reversal at mid-change
    st.crouched = true;
    while (st.k < 0.5) seq.push(st.step(DT));
    st.crouched = false;
    for (let f = 0; f < 40; f++) seq.push(st.step(DT));
    const C = Float64Array.from(seq);
    const at = new Int32Array(1);
    const run = (n: number): void => {
      for (let k = 0; k < n; k++) {
        const j = at[0]!;
        at[0] = j + 1 === C.length ? 0 : j + 1;
        i.crouch = C[j]!;
        g.update(DT, i);
      }
    };
    shotsOn();
    const on = await bytesPerCall(run, 0);
    setMixamo(false);
    const off = await bytesPerCall(run, 0);
    console.info(`(mixamo I3) bytes a frame through stance changes: on ${on} (off ${off})`);
    expect(g.out.keyW).toBeGreaterThan(0);
    expect(on).toBeLessThanOrEqual(off + HEAP_NUMBER);
  }, 240_000);
});
