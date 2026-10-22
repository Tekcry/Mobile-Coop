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
import { kneeBow } from '../src/anim/audit/metrics';

/** A swing foot's largest move in a frame (m): ON's steady 0.9 m/s side-step peaks at 7.8 cm, a snap off the strafe at
 *  11.3 cm (the STRAFE_REAIM fade); before the fade a re-aimed side-step jumped 24-29 cm in a frame (a pop). */
const ANKLE_JUMP = 0.115;
/** A CT start / stop's pelvis step beyond pace x dt (m): ON 1.51-1.89 cm (OFF 1.47-1.59); the kinked settle read 2.21. */
const STOP_PEL = 0.0195;
/** A planted foot's contact slide (m): 0 ON and OFF in every plan here; the wrong-foot snap dragged 1.6 cm before. */
const SLIDE = 0.005;
/** A snap's pelvis step beyond pace x dt (m), or OFF's: ON 1.65-2.01 (OFF 0.94-1.14). */
const SNAP_PEL = 0.021;
/** A toggle mid-strafe's worst bone turn a frame (deg): ON 18.6-19.7 after the fix (the base's toggles 15.6-17.5; 32.6 before). */
const TOGGLE_BONE = 20.5;
/** The steady strafe's knee outside its ankle across the body (m): ON 3.3-5.0 after the fix (7.6-8.0 before; OFF 3.1-3.3).
 *  Open: the e2e-anim gate is 3.0 cm. */
const KNEE_OUT = 0.052;
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

  it('snaps into and out of the strafe (0.8 s, diagonals) and N <-> S: no pop over OFF, no planted slide', async () => {
    // (fresh check of 842270f0) the clock's takeover of an early strafe swing re-aimed it in a frame (E <-> N 0.7: ankle
    // 39.1 cm a frame, knee-ankle 40.6 deg; OFF 18.6 / 17.5); a ~1e-6 strafe share on N <-> S left the re-aim fade's offset
    // past the touchdown (planted slide 3.2 cm); E <-> S stretched the trailing leg past its reach (0.88 cm)
    const d = (a: number): number => a * Math.SQRT1_2;
    const sn = (a: [number, number], b: [number, number]): [AimTarget, number, number] => [(t) => (Math.floor(t / 0.8) % 2 ? { x: b[0], z: b[1] } : { x: a[0], z: a[1] }), 480, 1];
    const plans: [string, [AimTarget, number, number]][] = [
      ['E <-> N 0.7', sn([0.7, 0], [0, 0.7])],
      ['W <-> NE 0.7', sn([-0.7, 0], [d(0.7), d(0.7)])],
      ['NW <-> E 0.9', sn([-d(0.9), d(0.9)], [0.9, 0])],
      ['E <-> S 0.7', sn([0.7, 0], [0, -0.7])],
      ['N <-> S 0.9', sn([0, 0.9], [0, -0.9])],
    ];
    for (const [name, p] of plans) {
      const { off, on } = await both(p);
      const mOff = measurePlayer(off);
      const mOn = measurePlayer(on);
      expect(mOn.bone, `${name}: bone ON ${mOn.bone.toFixed(1)} vs OFF ${mOff.bone.toFixed(1)} deg`).toBeLessThanOrEqual(mOff.bone + 0.5);
      expect(ankleJump(on), `${name}: ankle jump (OFF ${(ankleJump(off) * 100).toFixed(1)} cm)`).toBeLessThanOrEqual(Math.max(ankleJump(off) + 0.005, ANKLE_JUMP));
      expect(mOn.pel, `${name}: pelvis`).toBeLessThanOrEqual(Math.max(SNAP_PEL, mOff.pel));
      expect(plantSlide(on, 0.01), `${name}: planted slide`).toBeLessThan(SLIDE);
      expect(footGap(on), `${name}: feet crossing`).toBeGreaterThanOrEqual(GAP_MIN);
    }
  }, 300000);

  it('the switch toggled mid-strafe: no planted-knee pop as the rig switch fade ends', async () => {
    // (fresh check) the strafe tracking was stale while the switch was off: on, keyStrafe jumped 0 -> 1 and the planted
    // knee jumped as the fade ended (hip-knee 29.9-32.6 deg in a frame; a toggle on the base 15.6-17.5)
    for (const [sg, sp] of [[-1, 0.9], [1, 0.7]] as const) {
      const tg: AimTarget = (t) => ({ x: sg * sp, z: 0, mocap: t < 2 || (t > 3.5 && t < 5) });
      const on = await aimRun(tg, 480, 1, 'on');
      const mOn = measurePlayer(on);
      expect(mOn.bone, `toggle ${sg < 0 ? 'W' : 'E'} ${sp}: bone ${mOn.bone.toFixed(1)} deg (${mOn.boneN})`).toBeLessThanOrEqual(TOGGLE_BONE);
      expect(plantSlide(on, 0.01), 'toggle: planted slide').toBeLessThan(SLIDE);
    }
  }, 300000);

  it('the knees stay near their ankles across the body in a steady strafe (knee-out)', async () => {
    // (fresh check, the GPU e2e-anim fail) the captures' 3.6 cm hips sink and a fixed 13 cm hips hold bowed the planted
    // trailing knee 7.6-8.0 cm outside its ankle in the closed stance (the capture keeps its pelvis 4.4 cm inside)
    for (const v of [0.36, 0.7, 0.9]) {
      for (const sg of [-1, 1]) {
        const on = await aimRun(() => ({ x: sg * v, z: 0 }), Math.round(2.7 * 60), 1.2, 'on');
        const P = on.pos;
        const b = kneeBow(P.hipL, P.hipR, P.kneeL, P.kneeR, P.ankleL, P.ankleR, KNEE_OUT);
        expect(b.max, `knee-out ${sg < 0 ? 'L' : 'R'} ${v}`).toBeLessThanOrEqual(KNEE_OUT);
      }
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
