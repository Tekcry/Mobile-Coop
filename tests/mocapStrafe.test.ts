/**
 * (mocap-trial-2, strafe, BRIEF A10) The CMU strafe captures (69_59 left, 69_56 right: sideways cycles, CLIP-FORMAT
 * `travel` -x / +x) behind the "Mocap locomotion" switch: the aimed glide's sideways share plays them on their own
 * side-step (motion.ts GLIDE_SIDE). Driven as player.ts drives an aiming CT player (tests/helpers/mocapStrafe.ts). M1: the
 * capture's shape is not held to the old limits; pops, slides and crossings fail: per frame the pelvis stays inside pace x
 * dt + 2 cm (or OFF's; a CT start / stop 1.95 cm), no bone turns more than 24 deg (or OFF's + 2), no ankle jumps more
 * than 11.5 cm, planted feet do not slide (< 0.5 cm), the feet never cross (ankles >= 8 cm apart sideways), over steady
 * strafes, CT starts / stops, L <-> R flips and snaps onto forward / back. OFF never plays them; the side-step reaches a
 * carrier's gait clock only (`mside`); the switch never reaches a non-carrier (guard) rig.
 */
import { describe, expect, it } from 'vitest';
import { HAND_KEYED_SET, MOCAP_SET, mocapSideStep, setMocapLocomotion } from '../src/anim/mocap';
import { stepLength } from '../src/anim/motion';
import { plantSlide, type Rec } from './helpers/mocapMeasure';
import { measurePlayer, playerFails } from './helpers/mocapPlayer';
import { aimRun, ankleJump, footGap, STRAFE_PLANS, type AimTarget } from './helpers/mocapStrafe';

/** A swing foot's largest move in a frame (m): ON's steady 0.9 m/s side-step peaks at 7.8 cm, a snap off the strafe at
 *  11.3 cm (the STRAFE_REAIM fade); before the fade a re-aimed side-step jumped 24-29 cm in a frame (a pop). */
const ANKLE_JUMP = 0.115;
/** A CT start / stop's pelvis step beyond pace x dt (m): ON 1.51-1.89 cm (OFF 1.47-1.59); the kinked settle read 2.21. */
const STOP_PEL = 0.0195;
/** A planted foot's contact slide (m): 0 ON and OFF in every plan here; the wrong-foot snap dragged 1.6 cm before. */
const SLIDE = 0.005;
/** The feet's sideways gap floor (m): the planner's no-crossing gap holds 9 cm ON and OFF. */
const GAP_MIN = 0.08;

async function both(p: [AimTarget, number, number]): Promise<{ off: Rec; on: Rec; strafe: number[] }> {
  const off = await aimRun(p[0], p[1], p[2], 'off');
  const strafe: number[] = [];
  const on = await aimRun(p[0], p[1], p[2], 'on', (rig, k) => {
    if (k * (1 / 60) >= p[2]) strafe.push(rig.graph.out.keyStrafe);
  });
  return { off, on, strafe };
}

/** The pop / slide / crossing checks on an ON run against its OFF twin; returns ON's worst pelvis step (m). */
function expectClean(name: string, off: Rec, on: Rec): number {
  const mOff = measurePlayer(off);
  const mOn = measurePlayer(on);
  expect(playerFails(mOn, mOff), `${name}: pelvis ${(mOn.pel * 100).toFixed(2)} (OFF ${(mOff.pel * 100).toFixed(2)}) cm, bone ${mOn.bone.toFixed(1)} (OFF ${mOff.bone.toFixed(1)}) deg`).toEqual([]);
  expect(plantSlide(on, 0.01), `${name}: planted slide`).toBeLessThan(SLIDE);
  expect(footGap(on), `${name}: feet crossing`).toBeGreaterThanOrEqual(GAP_MIN);
  expect(ankleJump(on), `${name}: ankle jump`).toBeLessThanOrEqual(ANKLE_JUMP);
  return mOn.pel;
}

describe('mocap strafe (A10)', () => {
  it('the sets: the mocap set carries the sideways captures, the hand-keyed set none; the side-step only with the switch on', () => {
    expect(MOCAP_SET.strafeL?.travel).toBe('-x');
    expect(MOCAP_SET.strafeR?.travel).toBe('+x');
    expect(HAND_KEYED_SET.strafeL).toBeNull();
    expect(HAND_KEYED_SET.strafeR).toBeNull();
    setMocapLocomotion(false);
    expect(Number.isNaN(mocapSideStep(0.7))).toBe(true);
    setMocapLocomotion(true);
    try {
      const s = mocapSideStep(0.7);
      expect(s).toBeGreaterThan(0.2);
      expect(s).toBeLessThan(0.35);
    } finally {
      setMocapLocomotion(false);
    }
  });

  it('the side-step reaches a carrier clock only: without `mside` the glide side-step is the same ON as OFF', () => {
    for (const v of [0.4, 0.7, 0.9]) {
      const off = stepLength(v, undefined, 1, 0, 0, 0, 1);
      setMocapLocomotion(true);
      try {
        expect(stepLength(v, undefined, 1, 0, 0, 0, 1)).toBe(off);
        expect(stepLength(v, undefined, 1, 0, 0, 0, 1, true)).toBeGreaterThan(off + 0.05);
      } finally {
        setMocapLocomotion(false);
      }
    }
  });

  it('a steady strafe plays the captures ON (keyStrafe), never OFF', async () => {
    for (const sg of [-1, 1]) {
      const p = STRAFE_PLANS.steady(sg, 0.7);
      const off: number[] = [];
      await aimRun(p[0], p[1], p[2], 'off', (rig) => off.push(rig.graph.out.keyStrafe));
      expect(Math.max(...off)).toBe(0);
      const { strafe } = await both(p);
      expect(strafe.reduce((a, b) => a + b, 0) / strafe.length).toBeGreaterThan(0.9);
    }
  }, 120000);

  it('steady strafes L / R at 0.4 / 0.7 / 0.9 m/s: no pops, slides or crossings', async () => {
    for (const v of [0.4, 0.7, 0.9]) {
      for (const sg of [-1, 1]) {
        const { off, on } = await both(STRAFE_PLANS.steady(sg, v));
        expectClean(`steady ${sg < 0 ? 'L' : 'R'} ${v}`, off, on);
      }
    }
  }, 300000);

  it('CT starts and stops L / R at 0.4 / 0.7 / 0.9 m/s: no pops, slides or crossings', async () => {
    for (const v of [0.4, 0.7, 0.9]) {
      for (const sg of [-1, 1]) {
        const { off, on } = await both(STRAFE_PLANS.startStop(sg, v));
        const name = `start / stop ${sg < 0 ? 'L' : 'R'} ${v}`;
        expect(expectClean(name, off, on), `${name}: stop pelvis`).toBeLessThanOrEqual(STOP_PEL);
      }
    }
  }, 300000);

  it('L <-> R flips and snaps off the strafe onto forward / back: no pops, slides or crossings', async () => {
    const plans: [string, [AimTarget, number, number]][] = [
      ['flip 0.4 / 1.3 s', STRAFE_PLANS.flip(0.4, 1.3)],
      ['flip 0.7 / 0.6 s', STRAFE_PLANS.flip(0.7, 0.6)],
      ['flip 0.7 / 1.3 s', STRAFE_PLANS.flip(0.7, 1.3)],
      ['flip 0.9 / 0.6 s', STRAFE_PLANS.flip(0.9, 0.6)],
      ['snap L fwd', STRAFE_PLANS.snap(-1, 1.4)],
      ['snap R fwd', STRAFE_PLANS.snap(1, 1.4)],
      ['snap L back', STRAFE_PLANS.snap(-1, -1)],
      ['snap R back', STRAFE_PLANS.snap(1, -1)],
    ];
    for (const [name, p] of plans) {
      const { off, on } = await both(p);
      expectClean(name, off, on);
    }
  }, 300000);

  it('a non-carrier (guard) rig strafing aimed poses bit for bit as OFF with the switch on', async () => {
    for (const p of [STRAFE_PLANS.steady(1, 0.7), STRAFE_PLANS.flip(0.7, 1.3)]) {
      const off = await aimRun(p[0], p[1], p[2], 'off', undefined, false);
      const on = await aimRun(p[0], p[1], p[2], 'on', undefined, false);
      expect(on.n).toBe(off.n);
      for (const j of Object.keys(off.pos) as (keyof Rec['pos'])[]) expect(on.pos[j]).toEqual(off.pos[j]);
      expect(on.cycleTime).toEqual(off.cycleTime);
    }
  }, 120000);
});
