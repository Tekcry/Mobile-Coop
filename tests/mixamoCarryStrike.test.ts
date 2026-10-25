/**
 * (mixamo-retarget I5) The Mixamo body carry (walk + idle) and strike (elbow strike, cross punch) on Wren behind
 * `?mixamo=1` (`src/anim/mixamo.ts` `WREN_CARRY` / `WREN_STRIKE`, played by `animGraph.ts` `carryShot` / `strikeShot`
 * over the keyed pose on the game's clocks: the gait phase, the strike's arc).
 * - (a) off identity: a Wren graph through a carry (walk and still) and a strike is bit-identical (every `RigTargets`
 *   field and the pose, float64 bits, every frame) after the flag went on and off, and with the flag on and every I5 row
 *   false;
 * - (b) on: the tables by row (the elbow strike first, the cross punch only with its row off; the take's contact); the
 *   keyed pose moves during the carry and the strike, `strikeCap` only around a strike;
 * - (c) timing: the graph never writes its input (the strike's arc and the carry's load stay the game's); the strike's
 *   capture reaches its contact frame on the arc's contact;
 * - (d) the measures (headless Wren rig, A8 readings as information; Michael 2026-10-26: the capture plays unless visibly
 *   broken): bone step a frame, planted slide, knees, knee bow, elbows; the hard caps (`visiblyBroken`) decide the rows
 *   (asserted equal to what ships);
 * - (e) a graph that is not Wren's is bit-identical with the flag on; no allocation per frame beyond the hand-made path.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { MIXAMO_ON, setMixamo, strikeContact, WREN_CARRY, WREN_STRIKE } from '../src/anim/mixamo';
import { AnimGraph, defaultInput, type AnimInput } from '../src/anim/animGraph';
import { MOCAP_CARRY_BODY_WALKING } from '../src/anim/clips/mixamo/carry_body_walking';
import { MOCAP_CARRY_BODY_IDLE } from '../src/anim/clips/mixamo/carry_body_idle';
import { MOCAP_ELBOW_STRIKE } from '../src/anim/clips/mixamo/elbow_strike';
import { MOCAP_CROSS_PUNCH } from '../src/anim/clips/mixamo/cross_punch';
import { STRIKE_ARC_CONTACT, strikeWarp } from '../src/anim/strikeBody';
import { STRIKE_DUR, strikePhase } from '../src/game/elbowStrike';
import { CQ } from '../src/game/closeQuarters';
import { BODY } from '../src/ai/bodies';
import { proportions } from '../src/player/proportions';
import { CRAB, FOOT_SLIDE } from '../src/anim/audit/limits';
import { elbowWing, kneeBow, kneeSeparation } from '../src/anim/audit/metrics';
import { driveRig, plantSlide, pops, POP_DEG, type Rec } from './helpers/mocapMeasure';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';

const ON0 = { ...MIXAMO_ON };
const ROWS = ['carry_body_walking', 'carry_body_idle', 'elbow_strike', 'cross_punch', 'kneel_down'] as const;
afterEach(() => {
  Object.assign(MIXAMO_ON, ON0);
  setMixamo(false);
});

const DT = 1 / 60;
const STRIKE_N = Math.ceil(STRIKE_DUR / DT);

function rowsOn(on = true): void {
  for (const r of ROWS) if (r !== 'kneel_down') MIXAMO_ON[r] = on;
  setMixamo(true);
}

/** cyrb53 over float64 bit patterns (-0 as +0), as tests/mixamoStance.test.ts. */
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
    } else for (const k of Object.keys(v)) hashAll(h, (v as Record<string, unknown>)[k], seen);
  }
}
const hashOf = (v: unknown): string => {
  const h = new Hasher();
  hashAll(h, v, new Set());
  return h.digest();
};

/** The input of frame `f` of the run: stand 1 s, a strike (1 s from its start), the lift's load (0.8 s), a carry walk 2 s
 *  at the carry pace, carry still 2 s, the put down's hand-over (0.4 s), stand 1 s. */
const RUN_N = 60 * 8;
function setInput(i: AnimInput, f: number): void {
  const t = f * DT;
  const s0 = 60;
  i.melee = f >= s0 && f < s0 + STRIKE_N ? strikeWarp(strikePhase((f - s0 + 1) * DT)) : -1;
  const lift0 = 2;
  const load = t < lift0 ? 0 : t < lift0 + 0.8 ? (t - lift0) / 0.8 : t < 6.8 ? 1 : t < 7.2 ? 1 - (t - 6.8) / 0.4 : 0;
  const carrying = t >= lift0 && t < 7.2;
  i.cqBody = carrying;
  i.cqCarry = carrying ? load : 0;
  i.bend = carrying ? CQ.carryBend * Math.max(load, 0.3) : 0;
  i.bendDrop = carrying ? CQ.carryDrop * load : 0;
  i.keyedOk = !carrying;
  i.speed = t >= 2.8 && t < 4.8 ? BODY.carrySpeed : 0;
  i.localZ = i.speed > 0 ? 1 : 0;
}

interface Run {
  all: string[];
  keyed: string[];
  cap: number[];
  inputs: string[];
}

function runGraph(wren = true, mocapOk = true): Run {
  const random = Math.random;
  let seed = 4242;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  try {
    const g = new AnimGraph(proportions('average', 1.68));
    g.wrenReady = wren;
    const i: AnimInput = defaultInput();
    i.ready = true;
    i.armed = false;
    i.mocapOk = mocapOk;
    const r: Run = { all: [], keyed: [], cap: [], inputs: [] };
    for (let f = 0; f < RUN_N; f++) {
      setInput(i, f);
      const before = hashOf(i);
      g.update(DT, i);
      r.inputs.push(before === hashOf(i) ? 'same' : 'written');
      const h = new Hasher();
      hashAll(h, g.out, new Set());
      for (let c = 0; c < g.pose.length; c++) h.add(g.pose[c]!);
      r.all.push(h.digest());
      r.keyed.push(hashOf(g.out.keyed));
      r.cap.push(g.out.strikeCap);
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

describe('mixamo I5 (a): off is bit-identical', () => {
  it('a carry and a strike after the flag went on and off; the flag on with every I5 row false', () => {
    const base = runGraph();
    rowsOn();
    setMixamo(false);
    expect(WREN_CARRY.any).toBe(false);
    expect(WREN_STRIKE.clip).toBeNull();
    expect(differ(base.all, runGraph().all)).toBe(0);
    rowsOn(false);
    expect(WREN_CARRY.any).toBe(false);
    expect(WREN_STRIKE.clip).toBeNull();
    expect(differ(base.all, runGraph().all)).toBe(0);
  }, 120_000);
});

describe('mixamo I5 (b): on', () => {
  it('the tables by row: the elbow strike first, the cross punch with its row off; the same objects always', () => {
    const C = WREN_CARRY;
    const S = WREN_STRIKE;
    rowsOn();
    expect(WREN_CARRY).toBe(C);
    expect(WREN_STRIKE).toBe(S);
    expect(C.walk).toBe(MOCAP_CARRY_BODY_WALKING);
    expect(C.idle).toBe(MOCAP_CARRY_BODY_IDLE);
    expect(S.clip).toBe(MOCAP_ELBOW_STRIKE);
    MIXAMO_ON.elbow_strike = false;
    setMixamo(true);
    expect(S.clip).toBe(MOCAP_CROSS_PUNCH);
    MIXAMO_ON.cross_punch = false;
    MIXAMO_ON.carry_body_idle = false;
    setMixamo(true);
    expect(S.clip).toBeNull();
    expect(C.idle).toBeNull();
    expect(C.any).toBe(true);
    Object.assign(MIXAMO_ON, ON0);
    setMixamo(true);
    expect(C.walk).toBe(ON0.carry_body_walking ? MOCAP_CARRY_BODY_WALKING : null);
    expect(C.idle).toBe(ON0.carry_body_idle ? MOCAP_CARRY_BODY_IDLE : null);
    expect(S.clip).toBe(ON0.elbow_strike ? MOCAP_ELBOW_STRIKE : ON0.cross_punch ? MOCAP_CROSS_PUNCH : null);
  });

  it("the takes' contact: the striking wrist at its furthest forward (elbow strike the left, cross punch the right)", () => {
    const e = strikeContact(MOCAP_ELBOW_STRIKE!);
    const c = strikeContact(MOCAP_CROSS_PUNCH!);
    console.info(`(mixamo I5) contact: elbow_strike ${e.toFixed(3)} (frame ${Math.round(e * 67)} of 68), cross_punch ${c.toFixed(3)} (frame ${Math.round(c * 35)} of 36)`);
    expect(e).toBeGreaterThan(0.15);
    expect(e).toBeLessThan(0.5);
    expect(c).toBeGreaterThan(0.2);
    expect(c).toBeLessThan(0.6);
  });

  it('the keyed pose moves during the carry and the strike; strikeCap only around a strike', () => {
    const off = runGraph();
    rowsOn();
    const on = runGraph();
    const strike = (f: number): boolean => f >= 60 && f < 60 + STRIKE_N;
    const carry = (f: number): boolean => f >= 60 * 3 && f < 60 * 6.5;
    expect(differ(off.keyed, on.keyed, strike)).toBeGreaterThan(STRIKE_N * 0.8);
    expect(differ(off.keyed, on.keyed, carry)).toBeGreaterThan(60 * 3);
    // before anything happens: the same
    expect(differ(off.all, on.all, (f) => f < 60)).toBe(0);
    for (let f = 0; f < RUN_N; f++) if (f < 60 || f > 60 + STRIKE_N + 90) expect(on.cap[f], `strikeCap frame ${f}`).toBe(0);
    expect(Math.max(...on.cap)).toBeGreaterThan(0.9);
  }, 120_000);
});

describe('mixamo I5 (c): timing', () => {
  it('the graph never writes its input: the arc and the load stay the game\'s', () => {
    rowsOn();
    const on = runGraph();
    expect(on.inputs.every((s) => s === 'same')).toBe(true);
  }, 120_000);

  it("the strike capture's progress puts its contact frame on the arc's contact", () => {
    // the graph's map (strikeShot): arc C -> contact, linear either side
    const pc = strikeContact(MOCAP_ELBOW_STRIKE!);
    const map = (a: number): number => (a <= STRIKE_ARC_CONTACT ? (pc * a) / STRIKE_ARC_CONTACT : pc + ((1 - pc) * (a - STRIKE_ARC_CONTACT)) / (1 - STRIKE_ARC_CONTACT));
    expect(map(0)).toBe(0);
    expect(map(STRIKE_ARC_CONTACT)).toBeCloseTo(pc, 12);
    expect(map(1)).toBeCloseTo(1, 12);
  });
});

// ---- (d) the measures (headless Wren rig) ----

const cm = (m: number): string => (m * 100).toFixed(1);

interface Body {
  step: number;
  bone: string;
  kneeMin: number;
  kneeMax: number;
  bow: number;
  wing: number;
  slide: number;
}

function body(R: Rec): Body {
  const P = R.pos;
  const knee = kneeSeparation(P.hipL, P.hipR, P.kneeL, P.kneeR, CRAB.kneeSep.min, CRAB.kneeSep.max);
  const p = pops(R);
  return {
    step: p.maxStepDeg,
    bone: p.bone,
    kneeMin: knee.min,
    kneeMax: knee.max,
    bow: kneeBow(P.hipL, P.hipR, P.kneeL, P.kneeR, P.ankleL, P.ankleR, CRAB.kneeBow).max,
    wing: elbowWing(P.shoulderL, P.shoulderR, P.elbowL, P.elbowR, CRAB.elbowWing).max,
    slide: plantSlide(R, FOOT_SLIDE),
  };
}

const line = (b: Body): string =>
  `step ${b.step.toFixed(1)} deg (${b.bone}), knees ${b.kneeMin.toFixed(2)}-${b.kneeMax.toFixed(2)} x hips, knee out ${cm(b.bow)} cm, elbow out ${cm(b.wing)} cm, slide ${cm(b.slide)} cm`;

/**
 * Visibly broken in play (Michael 2026-10-26: a spin, a pop or joint jump at a glance, limbs through the body, bad foot
 * slide): a bone turning past e2e-anim's pose-continuity limit in a frame (a pop), the knees crossing or splayed past the
 * crab range and further than the hand-made move (a spin with the feet planted twists the knees through each other), a
 * knee bowed 10 cm past the hand-made one, or a planted foot sliding 3 cm past it. Worse numbers inside these are kept
 * (A8 readings, information).
 */
const visiblyBroken = (mx: Body, hand: Body): boolean =>
  mx.step > Math.max(POP_DEG, hand.step + 1) ||
  (mx.kneeMin < CRAB.kneeSep.min && mx.kneeMin < hand.kneeMin - 0.1) ||
  (mx.kneeMax > CRAB.kneeSep.max && mx.kneeMax > hand.kneeMax + 0.3) ||
  mx.bow > hand.bow + 0.1 ||
  mx.slide > hand.slide + 0.03;

const CARRY_POSE = { carryBody: true, carrySide: 1, bend: CQ.carryBend, bendDrop: CQ.carryDrop, armed: false };
/** Carrying (on the shoulder from the start): settle 1.5 s still, record the walk at the carry pace 3 s, then 3 s still. */
async function carryRun(): Promise<{ walk: Rec; still: Rec }> {
  const plan = (_k: number, t: number) => ({ speed: t >= 1.5 && t < 4.5 ? BODY.carrySpeed : 0, yawRate: 0, rec: t >= 2, pose: CARRY_POSE });
  const R = await driveRig(Math.round(7.5 * 60), plan);
  return { walk: sub(R, 0, Math.round(2.5 * 60)), still: sub(R, Math.round(3 * 60), R.n) };
}

/** A strike standing holstered: settle 2 s, the arc as StrikeController plays it, 1 s after. */
async function strikeRun(): Promise<Rec> {
  const n0 = 120;
  const plan = (k: number, t: number) => ({ speed: 0, yawRate: 0, rec: t >= 1.8, pose: { armed: false, melee: k >= n0 && k < n0 + STRIKE_N ? strikeWarp(strikePhase((k - n0 + 1) * DT)) : -1 } });
  return driveRig(n0 + STRIKE_N + 60, plan);
}

function sub(R: Rec, from: number, to: number): Rec {
  const cut = (a: number[], s: number): number[] => a.slice(from * s, to * s);
  const pos = {} as Rec['pos'];
  for (const j of Object.keys(R.pos) as (keyof Rec['pos'])[]) pos[j] = cut(R.pos[j], 3);
  return { ...R, n: to - from, pos, root: cut(R.root, 3), yaw: cut(R.yaw, 1), speed: cut(R.speed, 1), contactL: cut(R.contactL, 1), contactR: cut(R.contactR, 1), targetL: cut(R.targetL, 2), targetR: cut(R.targetR, 2), heelL: cut(R.heelL, 3), ballL: cut(R.ballL, 3), heelR: cut(R.heelR, 3), ballR: cut(R.ballR, 3), heldL: cut(R.heldL, 1), heldR: cut(R.heldR, 1) };
}

/** The largest wrist move in one frame (m), either hand. */
function wristStep(R: Rec): number {
  let m = 0;
  for (const P of [R.pos.wristL, R.pos.wristR]) for (let f = 1; f < R.n; f++) m = Math.max(m, Math.hypot(P[f * 3]! - P[f * 3 - 3]!, P[f * 3 + 1]! - P[f * 3 - 2]!, P[f * 3 + 2]! - P[f * 3 - 1]!));
  return m;
}

describe('mixamo I5 (d): the measures (headless, Wren rig)', () => {
  it('the carry: walk at the carry pace and still, against the hand-made carry', async () => {
    setMixamo(false);
    const hand = await carryRun();
    rowsOn();
    const mx = await carryRun();
    const hw = body(hand.walk), hs = body(hand.still), mw = body(mx.walk), ms = body(mx.still);
    console.info(`(mixamo I5) carry walk ${BODY.carrySpeed} m/s: Mixamo ${line(mw)}\n  hand-made ${line(hw)}\ncarry still: Mixamo ${line(ms)}\n  hand-made ${line(hs)}`);
    expect(mw.step + mw.wing + ms.wing).not.toBe(hw.step + hw.wing + hs.wing);
    expect(ON0.carry_body_walking, `carry_body_walking visibly broken: ${visiblyBroken(mw, hw)}`).toBe(!visiblyBroken(mw, hw));
    expect(ON0.carry_body_idle, `carry_body_idle visibly broken: ${visiblyBroken(ms, hs)}`).toBe(!visiblyBroken(ms, hs));
  }, 300_000);

  it('the strike: the elbow strike and the cross punch against the hand-made strike', async () => {
    setMixamo(false);
    const hand = await strikeRun();
    rowsOn();
    const el = await strikeRun();
    MIXAMO_ON.elbow_strike = false;
    setMixamo(true);
    const cp = await strikeRun();
    const h = body(hand), e = body(el), c = body(cp);
    console.info(
      `(mixamo I5) strike (${STRIKE_DUR} s, contact at the hit):\n` +
        `elbow_strike: Mixamo ${line(e)}, wrist ${cm(wristStep(el))} cm/frame\n` +
        `cross_punch: Mixamo ${line(c)}, wrist ${cm(wristStep(cp))} cm/frame\n` +
        `  hand-made ${line(h)}, wrist ${cm(wristStep(hand))} cm/frame`,
    );
    expect(ON0.elbow_strike, `elbow_strike visibly broken: ${visiblyBroken(e, h)}`).toBe(!visiblyBroken(e, h));
    expect(ON0.cross_punch, `cross_punch visibly broken: ${visiblyBroken(c, h)}`).toBe(!visiblyBroken(c, h));
  }, 300_000);
});

// ---- (e) only Wren, and allocation ----

describe('mixamo I5 (e): only Wren, no allocation', () => {
  it("a graph that is not Wren's (wrenReady off) is bit-identical with the flag on", () => {
    const guard = runGraph(false, false);
    const carrier = runGraph(false);
    rowsOn();
    expect(differ(guard.all, runGraph(false, false).all)).toBe(0);
    expect(differ(carrier.all, runGraph(false).all)).toBe(0);
  }, 120_000);

  it('a carry and a strike with the flag on leave at most the keyed calls boxed doubles a frame more than off', async () => {
    const g = new AnimGraph(proportions('average', 1.68));
    g.wrenReady = true;
    const i = defaultInput();
    i.ready = true;
    i.armed = false;
    // the run's inputs precomputed (the loop only reads them)
    const keep: AnimInput[] = [];
    for (let f = 0; f < RUN_N; f++) {
      const c = defaultInput();
      setInput(c, f);
      keep.push(c);
    }
    const M = Float64Array.from(keep.map((c) => c.melee));
    const L = Float64Array.from(keep.map((c) => c.cqCarry));
    const B = Float64Array.from(keep.map((c) => c.bend));
    const D = Float64Array.from(keep.map((c) => c.bendDrop));
    const S = Float64Array.from(keep.map((c) => c.speed));
    const at = new Int32Array(1);
    const run = (n: number): void => {
      for (let k = 0; k < n; k++) {
        const j = at[0]!;
        at[0] = j + 1 === RUN_N ? 0 : j + 1;
        i.melee = M[j]!;
        i.cqCarry = L[j]!;
        i.cqBody = L[j]! > 0 || B[j]! > 0;
        i.keyedOk = !i.cqBody;
        i.bend = B[j]!;
        i.bendDrop = D[j]!;
        i.speed = S[j]!;
        i.localZ = S[j]! > 0 ? 1 : 0;
        g.update(DT, i);
      }
    };
    rowsOn();
    const on = await bytesPerCall(run, 0);
    setMixamo(false);
    const off = await bytesPerCall(run, 0);
    console.info(`(mixamo I5) bytes a frame through a carry and a strike: on ${on} (off ${off})`);
    // off, the carry runs no keyed set (keyW 0); on, the keyed set runs through it (speed set + idle) with the two carry
    // samples and mixes: each sampleKeyed / mixKeyed call boxes its double argument (16 B), as every keyed frame does
    // (tests/mixamoStance.test.ts (e)): at most 8 a frame on average, nothing that grows with time
    expect(on).toBeLessThanOrEqual(off + 8 * HEAP_NUMBER);
  }, 240_000);
});
