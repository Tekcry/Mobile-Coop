/**
 * (mixamo-retarget I1) The Mixamo standing idle and crouched walk on Wren behind `?mixamo=1` (`src/anim/mixamo.ts`
 * `WREN_KEYED`, read by the graph's standing keyed set; `src/anim/mocap.ts` `setMocapCrouchWalk`, the mocap set's crouch
 * walk slot):
 * - (a) off identity: a Wren graph through the idle (14 s still, past the hand-made idle's 12 s cycle), a crouched sneak
 *   and a walk is bit-identical (every `RigTargets` field and the pose, as float64 bits, every frame) to one after the flag
 *   went on and off again, with the "Mocap locomotion" switch off and on (the crouch walk then the CMU 136_09); the
 *   anim-skeleton identity capture equals its fixture after the flag went on and off;
 * - (b) on: the idle is the Mixamo one over its 6 s (its `MIXAMO_ON` row false: identical to off); the crouched walk
 *   reaches `LOCO.set` only with the mocap switch on (A2), its row false keeps the CMU clip;
 * - (c) a rig that is not Wren's (`wrenReady` off) is bit-identical with the flag on, even on the keyed set's path;
 * - (d) headless on Wren's rig (A8): the idle's seam (phase 1 -> 0) and its knee / elbow ranges against the hand-made idle,
 *   the crouched walk's planted slide, pose continuity and knee / elbow ranges against the CMU clip at the sneak pace;
 *   the readings are logged and decide the `MIXAMO_ON` rows (asserted equal to what ships);
 * - (e) no allocation per frame with the flag on (idle, crouched sneak); a flip rewrites the same objects.
 */
import { existsSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { KEYED_IDLE_PERIOD_S, MIXAMO_LOCO, MIXAMO_ON, setMixamo, STANDING_IDLE_SECONDS, WREN_KEYED } from '../src/anim/mixamo';
import { applyMocapSwitch, HAND_KEYED_SET, LOCO, MOCAP_SET, setMocapLocomotion } from '../src/anim/mocap';
import { AnimGraph, defaultInput, KEYED_IDLE_PERIOD, type AnimInput } from '../src/anim/animGraph';
import { KEYED_IDLE } from '../src/anim/clips/keyed/idle';
import { MOCAP_STANDING_IDLE } from '../src/anim/clips/mixamo/standing_idle';
import { MOCAP_CROUCHED_WALKING } from '../src/anim/clips/mixamo/crouched_walking';
import { MOCAP_CROUCH_WALK } from '../src/anim/clips/mocap/crouch_walk';
import { proportions } from '../src/player/proportions';
import { CRAB_CROUCH, CRAB_IDLE, FOOT_SLIDE } from '../src/anim/audit/limits';
import { elbowWing, kneeBow, kneeSeparation } from '../src/anim/audit/metrics';
import { driveRig, plantSlide, pops, POP_DEG, type Plan, type Rec } from './helpers/mocapMeasure';
import { runIdentity, type IdentityFixture } from './helpers/animSkeletonIdentity';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';

/** MIXAMO_ON as shipped (a test that forces a row puts it back). */
const ON0 = { ...MIXAMO_ON };
/** (I6) The locomotion rows off: these tests isolate the I1 idle and crouched walk (I6's are tests/mixamoLoco.test.ts). */
const locoOff = (): void => {
  for (const k of Object.keys(MIXAMO_LOCO)) MIXAMO_ON[k] = false;
};
afterEach(() => {
  Object.assign(MIXAMO_ON, ON0);
  setMixamo(false);
  setMocapLocomotion(false);
});

const DT = 1 / 60;

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

/** Every number / boolean under `v` (the graph's RigTargets: nested objects, arrays, typed arrays), keys in order. */
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

/** The run's segments: 14 s still (past the hand-made idle's 12 s), a crouched sneak, crouched still, a walk. */
const SEGMENTS: readonly { sec: number; speed: number; crouch: number }[] = [
  { sec: 14, speed: 0, crouch: 0 },
  { sec: 3, speed: 0.7, crouch: 1 },
  { sec: 1, speed: 0, crouch: 1 },
  { sec: 3, speed: 1.4, crouch: 0 },
];
/** Frame where the still segment ends (the keyed idle's frames are before it). */
const STILL_END = 14 * 60;

/** A fresh graph (Wren's, or another rig's: `mocapOk` false a guard's, no carrier) through SEGMENTS: one hash per frame
 *  of `out` and the pose. */
function runGraph(wren: boolean, mocapOk = true): string[] {
  // the graph's own randomness (the idle clock's start) seeded, so two runs compare bit for bit
  const random = Math.random;
  let seed = 4242;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  try {
    const g = new AnimGraph(proportions('average', 1.68));
    g.wrenReady = wren;
    const i: AnimInput = defaultInput();
    // holstered, on foot along the facing: the standing / crouched keyed sets (as the player's rig on foot)
    i.keyedOk = true;
    i.ready = true;
    i.armed = false;
    i.mocapOk = mocapOk;
    const out: string[] = [];
    for (const s of SEGMENTS) {
      for (let n = 0; n < Math.round(s.sec * 60); n++) {
        i.speed = s.speed;
        i.localZ = s.speed > 0 ? 1 : 0;
        i.crouch = s.crouch;
        g.update(DT, i);
        const h = new Hasher();
        hashAll(h, g.out, new Set());
        for (let c = 0; c < g.pose.length; c++) h.add(g.pose[c]!);
        out.push(h.digest());
      }
    }
    return out;
  } finally {
    Math.random = random;
  }
}

function differ(a: string[], b: string[]): number {
  let n = Math.abs(a.length - b.length);
  for (let k = 0; k < Math.min(a.length, b.length); k++) if (a[k] !== b[k]) n++;
  return n;
}

describe('mixamo I1: the switch and the resolved keyed clips', () => {
  it('starts hand-made: the idle KEYED_IDLE over the graph\'s own 12 s cycle, no crouch walk, the mocap set CMU', () => {
    expect(KEYED_IDLE_PERIOD_S).toBe(KEYED_IDLE_PERIOD);
    expect(STANDING_IDLE_SECONDS).toBe(6);
    expect(WREN_KEYED.idle).toBe(KEYED_IDLE);
    expect(WREN_KEYED.idlePeriod).toBe(KEYED_IDLE_PERIOD);
    expect(WREN_KEYED.crouchWalk).toBeNull();
    setMocapLocomotion(true);
    expect(LOCO.set).toBe(MOCAP_SET);
    expect(LOCO.set.crouchWalk).toBe(MOCAP_CROUCH_WALK);
  });
});

describe('mixamo I1 (a): off is bit-identical', () => {
  it('the graph (idle 14 s, crouched sneak, walk) after the flag went on and off, mocap switch off and on', () => {
    for (const mocap of [false, true]) {
      setMocapLocomotion(mocap);
      const base = runGraph(true);
      setMixamo(true);
      setMixamo(false);
      expect(LOCO.set).toBe(mocap ? MOCAP_SET : HAND_KEYED_SET);
      if (mocap) expect(LOCO.set.crouchWalk).toBe(MOCAP_CROUCH_WALK);
      expect(differ(base, runGraph(true)), `mocap ${mocap}`).toBe(0);
    }
  }, 120_000);

  it('the anim-skeleton identity capture equals its fixture after the flag went on and off', async () => {
    const FIXTURE = 'tests/fixtures/anim-skeleton-identity.json';
    expect(existsSync(FIXTURE)).toBe(true);
    const want = JSON.parse(readFileSync(FIXTURE, 'utf8')) as IdentityFixture;
    setMixamo(true);
    setMixamo(false);
    const got = await runIdentity();
    for (const id of Object.keys(want)) {
      expect(got[id], `${id} still runs`).toBeDefined();
      expect(got[id]!.rig, `${id} rig`).toBe(want[id]!.rig);
      expect(got[id]!.poser, `${id} poser`).toEqual(want[id]!.poser);
    }
  }, 300_000);
});

describe('mixamo I1 (b): on', () => {
  it('the idle: the Mixamo standing idle over 6 s on Wren\'s still frames; its row false is identical to off', () => {
    const off = runGraph(true);
    MIXAMO_ON.standing_idle = true;
    MIXAMO_ON.crouched_walking = true;
    setMixamo(true);
    expect(WREN_KEYED.idle).toBe(MOCAP_STANDING_IDLE);
    expect(WREN_KEYED.idlePeriod).toBe(6);
    const on = runGraph(true);
    // the still frames move (the keyed idle), and with the mocap switch off nothing else does
    expect(differ(off.slice(0, STILL_END), on.slice(0, STILL_END))).toBeGreaterThan(STILL_END / 2);
    MIXAMO_ON.standing_idle = false;
    setMixamo(true);
    expect(WREN_KEYED.idle).toBe(KEYED_IDLE);
    expect(WREN_KEYED.idlePeriod).toBe(KEYED_IDLE_PERIOD);
    expect(differ(off, runGraph(true))).toBe(0);
  }, 120_000);

  it('the crouched walk: in LOCO.set only with the mocap switch on (A2); its row false keeps the CMU clip', () => {
    locoOff();
    MIXAMO_ON.crouched_walking = true;
    setMixamo(true);
    expect(WREN_KEYED.crouchWalk).toBe(MOCAP_CROUCHED_WALKING);
    // the mocap switch off: the hand-made set
    expect(LOCO.set).toBe(HAND_KEYED_SET);
    setMocapLocomotion(true);
    expect(LOCO.set.crouchWalk).toBe(MOCAP_CROUCHED_WALKING);
    // the rest of the set is the mocap set's
    for (const k of Object.keys(MOCAP_SET) as (keyof typeof MOCAP_SET)[]) if (k !== 'crouchWalk') expect(LOCO.set[k], k).toBe(MOCAP_SET[k]);
    expect(MOCAP_SET.crouchWalk).toBe(MOCAP_CROUCH_WALK);
    // the settings path keeps it (applyMocapSwitch compares against the active set)
    const s = LOCO.set;
    applyMocapSwitch(null, true);
    expect(LOCO.set).toBe(s);
    setMocapLocomotion(false);
    expect(LOCO.set).toBe(HAND_KEYED_SET);
    // the flag flipped while the switch is on takes effect at once
    setMocapLocomotion(true);
    setMixamo(false);
    expect(LOCO.set).toBe(MOCAP_SET);
    setMixamo(true);
    expect(LOCO.set.crouchWalk).toBe(MOCAP_CROUCHED_WALKING);
    MIXAMO_ON.crouched_walking = false;
    setMixamo(true);
    expect(LOCO.set).toBe(MOCAP_SET);
    expect(LOCO.set.crouchWalk).toBe(MOCAP_CROUCH_WALK);
  });

  it('the crouched sneak on Wren\'s graph moves with the capture (mocap switch on), the idle row aside', () => {
    locoOff();
    setMocapLocomotion(true);
    const off = runGraph(true);
    MIXAMO_ON.standing_idle = false;
    MIXAMO_ON.crouched_walking = true;
    setMixamo(true);
    const on = runGraph(true);
    expect(differ(off.slice(0, STILL_END), on.slice(0, STILL_END))).toBe(0);
    expect(differ(off.slice(STILL_END, STILL_END + 180), on.slice(STILL_END, STILL_END + 180))).toBeGreaterThan(90);
  }, 120_000);
});

describe('mixamo I1 (c): only Wren', () => {
  it("a graph that is not Wren's (wrenReady off) is bit-identical with the flag on, on the keyed set's path too", () => {
    for (const mocap of [false, true]) {
      setMocapLocomotion(mocap);
      // a guard's rig is no carrier: no mocap set (CharacterRig `mocapOk`), so its crouch walk is never a capture
      const off = runGraph(false, false);
      // a carrier that is not Wren's keeps the hand-made idle (with the mocap switch off nothing else could differ)
      const offCarrier = mocap ? [] : runGraph(false);
      MIXAMO_ON.standing_idle = true;
      MIXAMO_ON.crouched_walking = true;
      setMixamo(true);
      expect(differ(off, runGraph(false, false)), `mocap ${mocap}`).toBe(0);
      if (!mocap) expect(differ(offCarrier, runGraph(false))).toBe(0);
      setMixamo(false);
    }
  }, 240_000);
});

// ---- (d) the headless measures (A8) ----

const cm = (m: number): string => (m * 100).toFixed(2);

interface Body {
  /** The largest bone turn in one frame (deg) over the recording and across the idle's seams; its bone. */
  step: number;
  bone: string;
  seam: number;
  seams: number;
  /** Planted slide (m, e2e-anim's measure; NaN at a standstill: the feet stay planted). */
  slide: number;
  /** Knee separation (x the hips: min, max), knee outside the ankle (m), elbow outside the shoulder (m). */
  kneeMin: number;
  kneeMax: number;
  bow: number;
  wing: number;
}

/** A Wren rig standing still `sec` s (recorded from 3 s): continuity, the seams of the idle's clock, the ranges. */
async function idleBody(sec: number): Promise<Body> {
  const steps = Math.round(sec * 60);
  const warm = 3;
  const phase: number[] = [];
  const plan: Plan = (_k, t) => ({ speed: 0, yawRate: 0, rec: t >= warm });
  const R = await driveRig(steps, plan, (rig, k) => {
    if (k * DT < warm) return;
    const t = (rig.graph as unknown as { idleT: number }).idleT;
    phase.push(Math.floor(t / WREN_KEYED.idlePeriod));
  });
  let seam = 0;
  let seams = 0;
  for (let f = 1; f < R.n; f++) {
    if (phase[f] === phase[f - 1]) continue;
    seams++;
    seam = Math.max(seam, pops(R, f, Math.min(R.n, f + 2)).maxStepDeg);
  }
  return { ...ranges(R, CRAB_IDLE, IDLE_BODY), seam, seams, slide: NaN };
}

/** e2e-anim's idle body tune (scripts/e2e-anim.mjs BODY_STATE.idle: Michael's 2026-10-22 tune). */
const IDLE_BODY = { kneeBow: 0.093, elbowWing: 0.08 } as const;

function ranges(R: Rec, C: { kneeSep: { min: number; max: number } }, L: { kneeBow: number; elbowWing: number }): Omit<Body, 'seam' | 'seams' | 'slide'> {
  const P = R.pos;
  const knee = kneeSeparation(P.hipL, P.hipR, P.kneeL, P.kneeR, C.kneeSep.min, C.kneeSep.max);
  const bow = kneeBow(P.hipL, P.hipR, P.kneeL, P.kneeR, P.ankleL, P.ankleR, L.kneeBow);
  const wing = elbowWing(P.shoulderL, P.shoulderR, P.elbowL, P.elbowR, L.elbowWing);
  const p = pops(R);
  return { step: p.maxStepDeg, bone: p.bone, kneeMin: knee.min, kneeMax: knee.max, bow: bow.max, wing: wing.max };
}

/** A Wren rig in the crouched sneak at `v` m/s, the mocap switch on (2 s settle, 3 s recorded). */
async function sneakBody(v: number): Promise<Body> {
  setMocapLocomotion(true);
  const R = await driveRig(60 * 5, (_k, t) => ({ speed: v, yawRate: 0, rec: t > 2, crouch: 1 }));
  return { ...ranges(R, CRAB_CROUCH, CRAB_CROUCH), seam: NaN, seams: 0, slide: plantSlide(R, 0.02) };
}

const line = (b: Body): string =>
  `step ${b.step.toFixed(1)} deg (${b.bone})${b.seams ? `, seam ${b.seam.toFixed(1)} deg over ${b.seams}` : ''}${Number.isNaN(b.slide) ? '' : `, slide ${cm(b.slide)} cm`}, knees ${b.kneeMin.toFixed(2)}-${b.kneeMax.toFixed(2)} x hips, knee out ${cm(b.bow)} cm, elbow out ${cm(b.wing)} cm`;

/** At least as good on a measure (lower is better): within the limit where the reference is, else no worse than it. */
const asGood = (mx: number, ref: number, limit: number, tol: number): boolean => mx <= Math.max(limit, ref + tol);
const kneesAsGood = (mx: Body, ref: Body, C: { kneeSep: { min: number; max: number } }): boolean =>
  mx.kneeMin >= Math.min(C.kneeSep.min, ref.kneeMin - 0.02) && mx.kneeMax <= Math.max(C.kneeSep.max, ref.kneeMax + 0.02);

describe('mixamo I1 (d): the A8 measures (headless, Wren rig)', () => {
  it('the standing idle against the hand-made idle: seam continuity, knee / elbow ranges', async () => {
    // 20 s: the hand-made idle's seam (12 s, from a clock start under 4 s) and three of the capture's (6 s)
    const hand = await idleBody(20);
    MIXAMO_ON.standing_idle = true;
    setMixamo(true);
    const mx = await idleBody(20);
    console.info(`(mixamo I1) standing idle: Mixamo ${line(mx)}; hand-made ${line(hand)}`);
    expect(hand.seams).toBeGreaterThanOrEqual(1);
    expect(mx.seams).toBeGreaterThanOrEqual(2);
    const pass =
      mx.seam <= POP_DEG &&
      asGood(mx.seam, hand.seam, POP_DEG, 1) &&
      asGood(mx.step, hand.step, POP_DEG, 1) &&
      kneesAsGood(mx, hand, CRAB_IDLE) &&
      asGood(mx.bow, hand.bow, IDLE_BODY.kneeBow, 0.002) &&
      asGood(mx.wing, hand.wing, IDLE_BODY.elbowWing, 0.002);
    expect(ON0.standing_idle, `standing_idle passes A8: ${pass}`).toBe(pass);
  }, 300_000);

  it('the crouched walk against the CMU crouch walk at the sneak pace: slide, continuity, knee / elbow ranges', async () => {
    const rows: string[] = [];
    let pass = true;
    for (const v of [0.5, 0.8, 0.9]) {
      setMixamo(false);
      const cmu = await sneakBody(v);
      MIXAMO_ON.crouched_walking = true;
      setMixamo(true);
      expect(LOCO.set.crouchWalk).toBe(MOCAP_CROUCHED_WALKING);
      const mx = await sneakBody(v);
      rows.push(`${v} m/s: Mixamo ${line(mx)}; CMU ${line(cmu)}`);
      pass &&=
        asGood(mx.slide, cmu.slide, FOOT_SLIDE, 0.002) &&
        asGood(mx.step, cmu.step, POP_DEG, 1) &&
        kneesAsGood(mx, cmu, CRAB_CROUCH) &&
        asGood(mx.bow, cmu.bow, CRAB_CROUCH.kneeBow, 0.002) &&
        asGood(mx.wing, cmu.wing, CRAB_CROUCH.elbowWing, 0.002);
    }
    console.info(`(mixamo I1) crouched walk:\n${rows.join('\n')}`);
    expect(ON0.crouched_walking, `crouched_walking passes A8: ${pass}`).toBe(pass);
  }, 300_000);
});

// ---- (e) allocation ----

describe('mixamo I1 (e): no allocation per frame', () => {
  it('the idle and the crouched sneak with the flag on leave no more a frame than off; a flip rewrites the same objects', async () => {
    const g = new AnimGraph(proportions('average', 1.68));
    g.wrenReady = true;
    const i = defaultInput();
    i.keyedOk = true;
    i.ready = true;
    i.armed = false;
    const run = (n: number): void => {
      for (let k = 0; k < n; k++) g.update(DT, i);
    };
    MIXAMO_ON.standing_idle = true;
    MIXAMO_ON.crouched_walking = true;
    const keyed = WREN_KEYED;
    // still (the idle)
    setMixamo(true);
    const idle = await bytesPerCall(run, 0);
    setMixamo(false);
    const idleRef = await bytesPerCall(run, 0);
    // crouched sneak, the mocap switch on (the capture against the CMU clip in its place)
    i.crouch = 1;
    i.speed = 0.7;
    i.localZ = 1;
    setMocapLocomotion(true);
    setMixamo(true);
    const set = LOCO.set;
    const sneak = await bytesPerCall(run, 0);
    setMixamo(false);
    const sneakRef = await bytesPerCall(run, 0);
    setMixamo(true);
    console.info(`(mixamo I1) bytes a frame: idle ${idle} (off ${idleRef}), crouched sneak ${sneak} (off ${sneakRef})`);
    expect(g.out.keyW).toBeGreaterThan(0);
    expect(idle).toBeLessThanOrEqual(idleRef + HEAP_NUMBER);
    expect(sneak).toBeLessThanOrEqual(sneakRef + HEAP_NUMBER);
    // the resolved objects are rewritten in place: the same table and the same mocap set after the flips
    expect(WREN_KEYED).toBe(keyed);
    expect(LOCO.set).toBe(set);
  }, 240_000);
});
