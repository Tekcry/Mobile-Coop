/**
 * (mocap-trial-2, qstop) Stops from a jog, run or sprint with the mocap switch on. A one-frame stop (the asked pace 5 -> 0
 * in a frame; the game's CT_MAX_ACCEL makes such stops real) posed the slowest gait at once: the procedural stand's speed
 * nodes and the mocap speed set both read the pace of the frame, so the run's low pelvis rose 7-10 cm in a frame (8.7 cm
 * beyond pace x dt at 5 m/s, the switch off 2.5-8.9) with the arms swinging up to 47 deg, and a planted foot slid 2-5 cm
 * at some phases. A braked stop (0.25 s) crossed the speed set's jog band in under two frames: 3.0-3.2 cm beyond pace at
 * 2.2 m/s mid-brake (off 1.7). Now, falling from over a walk, the standing pose's pace falls at most MOCAP_SLOT.paceFall and
 * the fade to the idle is slower (animGraph `mPace`).
 *
 * One-frame stops from 1.4 / 2.8 / 4.0 / 5.0 m/s and 0.25 s braked stops from 2.8 / 4.0 / 5.0 m/s, six gait phases each,
 * worst of the six, ON against OFF (the hand-keyed set): the pelvis moves no more than pace x dt + max(2 cm, OFF's own) a
 * frame, the ankle-toe and any-bone steps are at most OFF + 2 deg (or both under 24), the planted feet do not slide (1 cm).
 * Measured (ON / OFF, pelvis cm): one-frame 1.3 / 1.8, 1.8 / 5.7, 1.6 / 5.8, 2.1 / 8.9; braked 1.3 / 1.6, 1.8 / 1.7,
 * 1.9 / 13.8; before (a7147e26) one-frame 1.3, 7.7, 8.9, 10.5 (slide 5.3 cm at 2.8), braked 1.6, 3.0, 3.2.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { setMixamo } from '../src/anim/mixamo';
import { setMocapLocomotion } from '../src/anim/mocap';
import { driveRig, plantSlide, pops, type Plan, type Rec } from './helpers/mocapMeasure';

// (one-game) the Mixamo captures are on at load by default now; this file pins the hand-made state: `?mixamo=0`
setMixamo(false);

/** Allowance (deg) on ON <= OFF (mocapSprint, mocapRunTurn: a frame's worst bone moves 1-2 deg with the phase alone). */
const POP_MARGIN = 2;
/** Under this both are fine whatever the other reads (the bible's 25 deg pop line less a degree). */
const BOTH_UNDER = 24;
/** The bible's pelvis line beyond pace x dt (m a frame). */
const PEL = 0.02;
const REC_FROM = 2;

/** The ankle-toe bone's largest turn in one frame (deg; a straight line: the world frame), either foot. */
function toeStep(R: Rec): number {
  let m = 0;
  for (const [a, b] of [[R.pos.ankleL, R.pos.toeL], [R.pos.ankleR, R.pos.toeR]] as const) {
    for (let f = 1; f < R.n; f++) {
      const p = (f - 1) * 3;
      const q = f * 3;
      const x1 = b[p]! - a[p]!, y1 = b[p + 1]! - a[p + 1]!, z1 = b[p + 2]! - a[p + 2]!;
      const x2 = b[q]! - a[q]!, y2 = b[q + 1]! - a[q + 1]!, z2 = b[q + 2]! - a[q + 2]!;
      const d = (x1 * x2 + y1 * y2 + z1 * z2) / Math.hypot(x1, y1, z1) / Math.hypot(x2, y2, z2);
      m = Math.max(m, (Math.acos(Math.max(-1, Math.min(1, d))) * 180) / Math.PI);
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

/** `v` m/s, stopped at `at` s (in one frame, or braked linearly over `brake` s); recorded from REC_FROM to 1.5 s after. */
const stopPlan = (v: number, at: number, brake: number): Plan => (_k, t) => ({ speed: t < at ? v : brake > 0 && t < at + brake ? v * (1 - (t - at) / brake) : 0, yawRate: 0, rec: t >= REC_FROM });

interface Worst {
  pel: number;
  bone: number;
  toe: number;
  slide: number;
}
async function worst(on: boolean, v: number, brake: number): Promise<Worst> {
  const W: Worst = { pel: 0, bone: 0, toe: 0, slide: 0 };
  // six phases over about a step of each gait
  const ph = v < 2 ? 0.1 : v < 3 ? 0.07 : 0.06;
  for (let i = 0; i < 6; i++) {
    const at = 3 + i * ph;
    setMocapLocomotion(on);
    const R = await driveRig(Math.round((at + 1.5) * 60), stopPlan(v, at, brake));
    setMocapLocomotion(false);
    W.pel = Math.max(W.pel, pelvisOver(R));
    W.bone = Math.max(W.bone, pops(R).maxStepDeg);
    W.toe = Math.max(W.toe, toeStep(R));
    W.slide = Math.max(W.slide, plantSlide(R, 0.01));
  }
  return W;
}

const ok = (on: number, off: number): boolean => on <= off + POP_MARGIN || (on < BOTH_UNDER && off < BOTH_UNDER);
const f1 = (x: number): string => x.toFixed(1);

describe('mocap quick stops (switch ON no worse than OFF)', () => {
  afterAll(() => setMocapLocomotion(false));
  const cases: [number, number][] = [[1.4, 0], [2.8, 0], [4.0, 0], [5.0, 0], [2.8, 0.25], [4.0, 0.25], [5.0, 0.25]];
  for (const [v, brake] of cases) {
    it(`${brake > 0 ? `braked ${brake} s` : 'one-frame'} stop from ${v} m/s (six phases)`, async () => {
      const O = await worst(false, v, brake);
      const N = await worst(true, v, brake);
      const msg = `ON / OFF pelvis ${(N.pel * 100).toFixed(1)} / ${(O.pel * 100).toFixed(1)} cm, bone ${f1(N.bone)} / ${f1(O.bone)}, ankle-toe ${f1(N.toe)} / ${f1(O.toe)} deg, slide ${(N.slide * 100).toFixed(2)} cm`;
      expect(N.pel, `pelvis beyond pace x dt: ${msg}`).toBeLessThanOrEqual(Math.max(PEL, O.pel));
      expect(ok(N.bone, O.bone), `bone step: ${msg}`).toBe(true);
      expect(ok(N.toe, O.toe), `ankle-toe step: ${msg}`).toBe(true);
      expect(N.slide, `planted feet slide (m): ${msg}`).toBeLessThan(0.01);
    }, 60_000);
  }
});
