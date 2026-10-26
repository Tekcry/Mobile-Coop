/**
 * (mixamo-retarget I6) The Mixamo locomotion set (`src/anim/mocap.ts` `setMocapMixamo`, `src/anim/mixamo.ts`
 * `MIXAMO_LOCO`): Mixamo captures take the mocap set's walk / jog / run / sprint / start / stop slots when the flag is on
 * and their `MIXAMO_ON` row is true, else the CMU clips play.
 * - off identity: with the flag off (or no capture handed over) the switch's ON set is `MOCAP_SET` itself;
 * - a handed-over slot replaces only that slot; the seconds and layers stay CMU's (the game's timing holds); null puts
 *   the CMU clip back and the set back to `MOCAP_SET`;
 * - rows: every capture in `MIXAMO_LOCO` has a `MIXAMO_ON` row and a known slot;
 * - guards: the hand-keyed set (guards, the switch's OFF side) is never touched.
 * - (d) readings (headless Wren rig, the mocap switch on): each capture in its slot's own move (steady walk / jog / run /
 *   sprint, CT starts and stops, a spin on the spot, flick turns on the move, the aimed strafe) against the CMU clip in the
 *   same move: planted slide, the largest bone turn a frame, knees x hips, knee outside ankle, elbow outside shoulder (and
 *   the strafe's feet gap). Michael 2026-10-26: a row plays unless visibly broken (`broken` below); the readings are
 *   logged and the shipped `MIXAMO_ON` rows asserted equal to "not broken".
 */
import { afterEach, describe, expect, it } from 'vitest';
import { CRAB } from '../src/anim/audit/limits';
import { elbowWing, kneeBow, kneeSeparation } from '../src/anim/audit/metrics';
import { GAIT_RANGES, plantSlide, pops, POP_DEG, type Rec } from './helpers/mocapMeasure';
import { ctRun, flickPlan, startStopPlan, type Target } from './helpers/mocapPlayer';
import { aimRun, footGap, STRAFE_PLANS } from './helpers/mocapStrafe';
import { MIXAMO_LOCO, MIXAMO_ON, setMixamo } from '../src/anim/mixamo';
import { HAND_KEYED_SET, LOCO, MOCAP_SET, MX_SLOTS, setMocapLocomotion, setMocapMixamo } from '../src/anim/mocap';
import { MOCAP_CARRY_BODY_WALKING } from '../src/anim/clips/mixamo/carry_body_walking';
import { MOCAP_CROSS_PUNCH as PUNCH } from '../src/anim/clips/mixamo/cross_punch';
import { MOCAP_CROUCHED_WALKING } from '../src/anim/clips/mixamo/crouched_walking';

const ON0 = { ...MIXAMO_ON };
const HAND0 = { ...HAND_KEYED_SET };
afterEach(() => {
  Object.assign(MIXAMO_ON, ON0);
  setMocapMixamo({ walk: null, jog: null, run: null, sprint: null, start: null, stop: null });
  setMixamo(false);
  setMocapLocomotion(false);
});

describe('mixamoLoco: the Mixamo locomotion set', () => {
  it('off identity: no capture handed over keeps MOCAP_SET itself', () => {
    setMixamo(false);
    setMocapLocomotion(true);
    expect(LOCO.set).toBe(MOCAP_SET);
    // every locomotion row off (and I1/I4's crouched walk, which also takes a mocap slot): the flag on changes nothing
    for (const slug of Object.keys(MIXAMO_LOCO)) MIXAMO_ON[slug] = false;
    MIXAMO_ON.crouched_walking = false;
    setMixamo(true);
    expect(LOCO.set).toBe(MOCAP_SET);
    setMixamo(false);
    // the shipped rows on: each takes its slot, and the flag off puts MOCAP_SET back
    Object.assign(MIXAMO_ON, ON0);
    setMixamo(true);
    for (const [slug, r] of Object.entries(MIXAMO_LOCO)) expect(LOCO.set[r.slot], slug).toBe(ON0[slug] ? r.clip : MOCAP_SET[r.slot]);
    expect(LOCO.set.crouchWalk).toBe(ON0.crouched_walking ? MOCAP_CROUCHED_WALKING : MOCAP_SET.crouchWalk);
    setMixamo(false);
    expect(LOCO.set).toBe(MOCAP_SET);
  });

  it('a slot takes the capture; the seconds and layers stay CMU; null puts the CMU clip back', () => {
    setMocapLocomotion(true);
    setMocapMixamo({ walk: MOCAP_CARRY_BODY_WALKING, start: PUNCH! });
    const S = LOCO.set;
    expect(S).not.toBe(MOCAP_SET);
    expect(S.walk).toBe(MOCAP_CARRY_BODY_WALKING);
    expect(S.start).toBe(PUNCH!);
    for (const k of ['jog', 'run', 'sprint', 'stop', 'crouchWalk', 'turnInPlace', 'strafeL', 'strafeR'] as const) expect(S[k]).toBe(MOCAP_SET[k]);
    expect(S.startSeconds).toBe(MOCAP_SET.startSeconds);
    expect(S.stopSeconds).toBe(MOCAP_SET.stopSeconds);
    expect(S.layers).toBe(MOCAP_SET.layers);
    expect(S.id).toBe('mocap');
    expect(LOCO.slots).toBe(true);
    setMocapMixamo({ walk: null });
    expect(LOCO.set.walk).toBe(MOCAP_SET.walk);
    expect(LOCO.set.start).toBe(PUNCH!); // a slot left out keeps what it had
    setMocapMixamo({ start: null });
    expect(LOCO.set).toBe(MOCAP_SET);
  });

  it('the switch off is the hand-keyed set whatever is handed over', () => {
    setMocapMixamo({ walk: MOCAP_CARRY_BODY_WALKING });
    setMocapLocomotion(false);
    expect(LOCO.set).toBe(HAND_KEYED_SET);
  });

  it('rows: each capture has a MIXAMO_ON row and a known slot; the locomotion rows ship on', () => {
    for (const [slug, r] of Object.entries(MIXAMO_LOCO)) {
      expect(MIXAMO_ON[slug], slug).toBeTypeOf('boolean');
      expect(MX_SLOTS).toContain(r.slot);
    }
    const slots = Object.values(MIXAMO_LOCO).map((r) => r.slot);
    expect(new Set(slots).size, 'one capture a slot').toBe(slots.length);
    for (const r of Object.values(MIXAMO_LOCO)) expect(r.clip).not.toBeNull();
  });

  it('guards: the hand-keyed set is unchanged by any hand-over', () => {
    setMixamo(true);
    setMocapMixamo({ walk: MOCAP_CARRY_BODY_WALKING, stop: PUNCH! });
    expect({ ...HAND_KEYED_SET }).toEqual(HAND0);
    for (const k of Object.keys(HAND0) as (keyof typeof HAND0)[]) expect(HAND_KEYED_SET[k]).toBe(HAND0[k]);
  });
});

// ---- (d) readings ----

interface Reading { slide: number; step: number; bone: string; kneeMin: number; kneeMax: number; bow: number; wing: number; gap: number }
type Lim = { kneeSep: { min: number; max: number }; kneeBow: number; elbowWing: number };

function reading(R: Rec, C: Lim, strafe = false): Reading {
  const P = R.pos;
  const knee = kneeSeparation(P.hipL, P.hipR, P.kneeL, P.kneeR, C.kneeSep.min, C.kneeSep.max);
  const p = pops(R);
  return {
    slide: plantSlide(R, 0.01), step: p.maxStepDeg, bone: p.bone, kneeMin: knee.min, kneeMax: knee.max,
    bow: kneeBow(P.hipL, P.hipR, P.kneeL, P.kneeR, P.ankleL, P.ankleR, C.kneeBow).max,
    wing: elbowWing(P.shoulderL, P.shoulderR, P.elbowL, P.elbowR, C.elbowWing).max,
    gap: strafe ? footGap(R) : NaN,
  };
}

const cm = (m: number): string => (Number.isNaN(m) ? '-' : (m * 100).toFixed(1));
const fmt = (r: Reading): string =>
  `slide ${cm(r.slide)} cm, step ${r.step.toFixed(1)} deg (${r.bone}), knees ${r.kneeMin.toFixed(2)}-${r.kneeMax.toFixed(2)} x hips, knee out ${cm(r.bow)} cm, elbow out ${cm(r.wing)} cm${Number.isNaN(r.gap) ? '' : `, feet gap ${cm(r.gap)} cm`}`;

/**
 * Visibly broken (Michael 2026-10-26: "on unless visibly broken"), against the CMU clip in the same move: feet sliding
 * (over 3 cm, and 2 cm past CMU), a pop (a bone turning over POP_DEG in a frame, and 5 deg past CMU), the knees knocking
 * (under 0.2 x the hips, and 0.1 under CMU), the knees thrown out (over 12 cm, and 8 cm past CMU), the elbows flung out
 * (over 25 cm, and 15 cm past CMU: Mixamo carries its arms wider, 15-22 cm on the walks and runs against CMU's 5-8, a
 * style rather than a fault), the feet crossing in a strafe (gap under 2 cm, and 4 cm under CMU). Returns the reasons
 * (none: plays).
 */
function broken(mx: Reading, cmu: Reading): string[] {
  const out: string[] = [];
  if (mx.slide > Math.max(0.03, cmu.slide + 0.02)) out.push('slide');
  if (mx.step > Math.max(POP_DEG, cmu.step + 5)) out.push('pop');
  if (mx.kneeMin < Math.min(0.2, cmu.kneeMin - 0.1)) out.push('knees knock');
  if (mx.bow > Math.max(0.12, cmu.bow + 0.08)) out.push('knees out');
  if (mx.wing > Math.max(0.25, cmu.wing + 0.15)) out.push('elbows out');
  if (!Number.isNaN(mx.gap) && mx.gap < Math.min(0.02, cmu.gap - 0.04)) out.push('feet cross');
  return out;
}

/** One move, with the capture alone in its slot (the other rows off) and with the CMU clip. */
async function compare(slug: string, run: () => Promise<Rec>, C: Lim, strafe = false): Promise<{ mx: Reading; cmu: Reading }> {
  setMixamo(false);
  const cmu = reading(await run(), C, strafe);
  for (const k of Object.keys(MIXAMO_LOCO)) MIXAMO_ON[k] = k === slug;
  setMixamo(true);
  const slot = MIXAMO_LOCO[slug]!.slot;
  const mx = reading(await run(), C, strafe);
  setMocapLocomotion(true);
  expect(LOCO.set[slot], slug).toBe(MIXAMO_LOCO[slug]!.clip);
  setMixamo(false);
  return { mx, cmu };
}

const steady = (v: number): (() => Promise<Rec>) => () => ctRun(() => ({ v, yr: 0 }), 60 * 5, 2, 'on');
const ctPlan = ([t, steps]: [Target, number]): (() => Promise<Rec>) => () => ctRun(t, steps, 1, 'on');
/** A spin on the spot (3 rad/s for 3 s, both ways). */
const spin = (): Promise<Rec> => ctRun((t) => ({ v: 0, yr: t > 1 && t < 4 ? 3 : t > 5 && t < 8 ? -3 : 0 }), 60 * 9, 0.8, 'on');
const flicks = (): Promise<Rec> => ctRun(flickPlan(1.5, 90, 0), 60 * 10, 2, 'on');
const aimed = (sg: number) => (): Promise<Rec> => aimRun(...STRAFE_PLANS.steady(sg, 0.7), 'on');

const MOVES: [string, () => Promise<Rec>, Lim, boolean?][] = [
  ['walking', steady(1.6), GAIT_RANGES.walk],
  ['jogging', steady(3.0), GAIT_RANGES.jog],
  ['running', steady(4.3), GAIT_RANGES.run],
  ['fast_run', steady(5.0), GAIT_RANGES.run],
  ['start_walking', ctPlan(startStopPlan(1.5, 1.2, 2)), GAIT_RANGES.walk],
  ['stop_walking', ctPlan(startStopPlan(1.5, 1.2, 2)), GAIT_RANGES.walk],
  ['right_turn', spin, CRAB],
  ['walking_left_turn', flicks, GAIT_RANGES.walk],
  ['walking_left_turn_mirror', flicks, GAIT_RANGES.walk],
  ['left_strafe_walking', aimed(-1), CRAB, true],
  ['right_strafe_walking', aimed(1), CRAB, true],
];

describe('mixamoLoco (d): readings against the CMU clips (headless, Wren rig, the mocap switch on)', () => {
  for (const [slug, run, C, strafe] of MOVES) {
    it(`${slug}: plays unless visibly broken`, async () => {
      const { mx, cmu } = await compare(slug, run, C, strafe);
      const why = broken(mx, cmu);
      console.info(`(mixamo I6) ${slug}: Mixamo ${fmt(mx)}; CMU ${fmt(cmu)}${why.length ? `; broken: ${why.join(', ')}` : ''}`);
      expect(ON0[slug], `${slug} ships ${why.length ? 'off' : 'on'}`).toBe(why.length === 0);
    }, 300_000);
  }
});
