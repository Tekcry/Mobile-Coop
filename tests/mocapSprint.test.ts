/**
 * (mocap-trial-2, sprint, BRIEF A6) The CMU sprint loop (127_07) behind the "Mocap locomotion" switch: `speedSet` crosses the
 * run into the sprint between effort pace 4.2 and 5.0 (KEYED_GAITS `runTo` / `sprintFrom`, the game's sprint pace). Asserts
 * ON is no worse than OFF (the hand-keyed run held to 5 m/s): ankle-toe and any-bone step at most OFF + 2 deg (or both under
 * the bible's 24 deg), the planted feet do not slide (< 1 cm), the pelvis stays inside pace x dt + 2 cm, over steady
 * 4.0 / 4.5 / 5.0 m/s, 3 <-> 5 m/s ramps, turns at 5 m/s and a stop from 5 m/s. OFF never reads the sprint slot.
 */
import { appendFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { HAND_KEYED_SET, MOCAP_SET, setMocapLocomotion } from '../src/anim/mocap';
import { driveRig, gaitNumbers, plantSlide, pops, type Plan, type Rec } from './helpers/mocapMeasure';

/** Allowance (deg) on ON <= OFF: a frame's worst bone moves 1-2 deg with the plan's start offset alone (mocapRunTurn). */
const POP_MARGIN = 2;
/** Under this both are fine whatever the other reads (the bible's 25 deg pop line less a degree). */
const BOTH_UNDER = 24;

/** The ankle-toe bone's largest turn in one frame (deg, in the root's heading frame), either foot. */
function toeStep(R: Rec): number {
  let m = 0;
  for (const [a, b] of [[R.pos.ankleL, R.pos.toeL], [R.pos.ankleR, R.pos.toeR]] as const) {
    let prev: [number, number, number] | null = null;
    for (let f = 0; f < R.n; f++) {
      const c = Math.cos(R.yaw[f]!);
      const s = Math.sin(R.yaw[f]!);
      const dx = b[f * 3]! - a[f * 3]!;
      const dy = b[f * 3 + 1]! - a[f * 3 + 1]!;
      const dz = b[f * 3 + 2]! - a[f * 3 + 2]!;
      const x = dx * c - dz * s;
      const z = dx * s + dz * c;
      const l = Math.hypot(x, dy, z) || 1;
      const d: [number, number, number] = [x / l, dy / l, z / l];
      if (prev) m = Math.max(m, (Math.acos(Math.max(-1, Math.min(1, prev[0] * d[0] + prev[1] * d[1] + prev[2] * d[2]))) * 180) / Math.PI);
      prev = d;
    }
  }
  return m;
}

/** The pelvis's largest move in a frame beyond pace x dt (m). */
function pelvisOver(R: Rec): number {
  const h = R.pos.hips;
  let m = 0;
  for (let f = 1; f < R.n; f++) m = Math.max(m, Math.hypot(h[f * 3]! - h[(f - 1) * 3]!, h[f * 3 + 1]! - h[(f - 1) * 3 + 1]!, h[f * 3 + 2]! - h[(f - 1) * 3 + 2]!) - R.speed[f]! / 60);
  return m;
}

const steadyPlan = (v: number): Plan => (_k, t) => ({ speed: v, yawRate: 0, rec: t >= 2 });
/** `a` m/s for 3 s, then `b` over 0.5 s, held; recorded from 2 s. */
const rampPlan = (a: number, b: number): Plan => (_k, t) => ({ speed: t < 3 ? a : t < 3.5 ? a + ((b - a) * (t - 3)) / 0.5 : b, yawRate: 0, rec: t >= 2 });
/** 5 m/s, turning right / left 1.2 s in every 2.5 s from 2 s, recorded from 1.5 s (mocapRunTurn). */
const turnPlan = (v: number, yr: number, off: number): Plan => (_k, t) => {
  const u = t - off;
  return { speed: v, yawRate: t > 2 + off && ((u % 2.5) + 2.5) % 2.5 < 1.2 ? (((u % 5) + 5) % 5 < 2.5 ? yr : -yr) : 0, rec: t > 1.5 };
};
/** 5 m/s, then braked to 0 over 0.25 s (the rig's ~20 m/s2 brake) from `at` s; recorded from 2 s. */
const stopPlan = (at: number): Plan => (_k, t) => ({ speed: t < at ? 5 : t < at + 0.25 ? 5 * (1 - (t - at) / 0.25) : 0, yawRate: 0, rec: t >= 2 });

interface Row {
  toe: number;
  bone: number;
  pel: number;
  slide: number;
  ratio: number;
  scale: number;
  share: number;
}
async function run(on: boolean, steps: number, plan: Plan): Promise<Row> {
  setMocapLocomotion(on);
  const R = await driveRig(steps, plan);
  setMocapLocomotion(false);
  const g = gaitNumbers(R, { kneeSep: { min: 0, max: 9 }, trackHalf: 9, kneeBow: 9, elbowWing: 9, slide: 9 } as never);
  return { toe: toeStep(R), bone: pops(R).maxStepDeg, pel: pelvisOver(R), slide: plantSlide(R, 0.01), ratio: g.strideRatio, scale: g.clipScale, share: g.share };
}
/** ON / OFF numbers into the file named by SPRINT_LOG (a measuring run; vitest hides console output of passing tests). */
const log = (m: string): void => {
  if (process.env.SPRINT_LOG) appendFileSync(process.env.SPRINT_LOG, `SPRINT ${m}
`);
};
const f1 = (v: number): string => v.toFixed(1);
const ok = (on: number, off: number): boolean => on <= off + POP_MARGIN || (on < BOTH_UNDER && off < BOTH_UNDER);

describe('mocap sprint (switch ON no worse than OFF)', () => {
  afterAll(() => setMocapLocomotion(false));

  it('the sprint slot is filled in the mocap set only', () => {
    expect(MOCAP_SET.sprint).not.toBeNull();
    expect(HAND_KEYED_SET.sprint).toBeNull();
  });

  const cases: [string, number, Plan][] = [
    ['steady 4.0 m/s', 7, steadyPlan(4.0)],
    ['steady 4.5 m/s', 7, steadyPlan(4.5)],
    ['steady 5.0 m/s', 7, steadyPlan(5.0)],
    ['ramp 3 -> 5 m/s in 0.5 s', 7, rampPlan(3, 5)],
    ['ramp 5 -> 3 m/s in 0.5 s', 7, rampPlan(5, 3)],
    ['5 m/s x 2 rad/s turns', 10, turnPlan(5, 2, 0)],
    ['5 m/s x 3 rad/s turns', 10, turnPlan(5, 3, 0.37)],
    ['5 m/s x 4 rad/s turns', 10, turnPlan(5, 4, 0)],
  ];
  for (const [name, sec, plan] of cases) {
    it(name, async () => {
      const O = await run(false, sec * 60, plan);
      const N = await run(true, sec * 60, plan);
      log(`${name} | toe ${f1(N.toe)}/${f1(O.toe)} bone ${f1(N.bone)}/${f1(O.bone)} pel ${(N.pel * 100).toFixed(1)}/${(O.pel * 100).toFixed(1)} cm slide ${(N.slide * 100).toFixed(2)}/${(O.slide * 100).toFixed(2)} cm stride ${N.ratio.toFixed(2)}/${O.ratio.toFixed(2)} scale ${N.scale.toFixed(2)} share ${N.share.toFixed(2)}`);
      expect(ok(N.toe, O.toe), `ankle-toe ON ${f1(N.toe)} vs OFF ${f1(O.toe)} deg`).toBe(true);
      expect(ok(N.bone, O.bone), `bone step ON ${f1(N.bone)} vs OFF ${f1(O.bone)} deg`).toBe(true);
      expect(N.slide, 'planted feet slide (m)').toBeLessThan(0.01);
      expect(N.pel, 'pelvis beyond pace x dt (m)').toBeLessThanOrEqual(0.02);
    }, 60_000);
  }

  it('stop from 5 m/s (braked over 0.25 s, six gait phases)', async () => {
    const W = { toe: [0, 0], bone: [0, 0], pel: [0, 0], slide: [0, 0] };
    for (const at of [3.0, 3.06, 3.12, 3.18, 3.24, 3.3]) {
      const O = await run(false, 360, stopPlan(at));
      const N = await run(true, 360, stopPlan(at));
      for (const [k, a, b] of [['toe', O.toe, N.toe], ['bone', O.bone, N.bone], ['pel', O.pel, N.pel], ['slide', O.slide, N.slide]] as const) {
        W[k][0] = Math.max(W[k][0]!, a);
        W[k][1] = Math.max(W[k][1]!, b);
      }
    }
    log(`stop from 5 m/s (worst of six phases) | toe ${f1(W.toe[1]!)}/${f1(W.toe[0]!)} bone ${f1(W.bone[1]!)}/${f1(W.bone[0]!)} pel ${(W.pel[1]! * 100).toFixed(1)}/${(W.pel[0]! * 100).toFixed(1)} cm slide ${(W.slide[1]! * 100).toFixed(2)}/${(W.slide[0]! * 100).toFixed(2)} cm`);
    expect(ok(W.toe[1]!, W.toe[0]!), 'ankle-toe').toBe(true);
    expect(ok(W.bone[1]!, W.bone[0]!), 'bone step').toBe(true);
    expect(W.slide[1]!, 'planted feet slide (m)').toBeLessThan(0.01);
    // the braking pelvis: ON carried on 3.2 cm beyond pace x dt at 2.2 m/s mid-brake (the jog band crossed in under two frames; MT2-SPRINT.md), 1.9 since mt2-qstop (the standing pose's pace falls at most MOCAP_SLOT.paceFall)
    expect(W.pel[1]!, 'pelvis beyond pace x dt (m)').toBeLessThanOrEqual(0.02);
  }, 60_000);
});
