/**
 * (mocap-trial-2, CHECK-2 required 2) A stop with the mocap switch on: the clip swing in the air when the walk stops is
 * handed to the planner (footPlanner: clip feet only while moving) and finishes as its step. It snapped to the
 * planner's swing in a frame: its pitch (0.86 -> 0.00 rad at the rig's pitch cap, the ankle-toe bone 35-41 deg a frame),
 * its height (the clip's 13 cm lift dropped) and its place (a nearly planted foot jumped 21 cm back). Now its pitch and
 * place ease over (CLIP_PITCH_EASE / OFF_FADE) and a landing still easing its pitch is flattened standing (a toe left
 * up by the rig's pitch cap stayed up for the whole stand).
 *
 * Stops from 1.0 / 1.4 / 2.0 / 2.2 m/s at six gait phases (the stop's frame stepped through the cycle; the scratch
 * sweep zzstops ran ten): with the switch on the worst ankle-toe step from the stop on is no worse than master's (the
 * switch off) at the same pace, no bone turns more than master's own one-frame stop already does, the pelvis moves no
 * more than 2 cm a frame beyond the pace (bible 5.12.2), the planted feet do not slide, and both feet stand flat.
 * Measured on 20515978 + this fix (ON / OFF worst ankle-toe deg): 1.0 12.4 / 16.8, 1.4 12.8 / 12.7, 2.0 13.5 / 17.4,
 * 2.2 11.6 / 17.2 over ten phases; before the fix ON 39.9-40.9.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { setMocapLocomotion } from '../src/anim/mocap';
import { driveRig, plantSlide, pops, POP_DEG, type Plan, type Rec } from './helpers/mocapMeasure';

afterEach(() => {
  setMocapLocomotion(false);
});

const DEG = 180 / Math.PI;
/** Recording starts after this (s); the walk starts at 1 s. */
const REC_FROM = 0.5;

/** The largest ankle-toe bone turn in one frame over frames [from, to) (deg; a straight walk: world frame). */
function ankleToeStep(R: Rec, from: number, to = R.n): number {
  const P = R.pos;
  let m = 0;
  for (let f = Math.max(1, from); f < to; f++) {
    for (const [a, b] of [[P.ankleL, P.toeL], [P.ankleR, P.toeR]] as const) {
      const p = (f - 1) * 3;
      const q = f * 3;
      const x1 = b[p]! - a[p]!, y1 = b[p + 1]! - a[p + 1]!, z1 = b[p + 2]! - a[p + 2]!;
      const x2 = b[q]! - a[q]!, y2 = b[q + 1]! - a[q + 1]!, z2 = b[q + 2]! - a[q + 2]!;
      const d = (x1 * x2 + y1 * y2 + z1 * z2) / Math.hypot(x1, y1, z1) / Math.hypot(x2, y2, z2);
      m = Math.max(m, Math.acos(Math.min(1, d)) * DEG);
    }
  }
  return m;
}

/** The pelvis's largest move in one frame beyond what the pace carries it, from frame `from` on (m). */
function pelvisStep(R: Rec, from: number): number {
  const h = R.pos.hips;
  let m = 0;
  for (let f = Math.max(1, from); f < R.n; f++) {
    const d = Math.hypot(h[f * 3]! - h[(f - 1) * 3]!, h[f * 3 + 1]! - h[(f - 1) * 3 + 1]!, h[f * 3 + 2]! - h[(f - 1) * 3 + 2]!);
    m = Math.max(m, d - R.speed[f]! / 60);
  }
  return m;
}

interface StopNumbers {
  toe: number;
  /** The steady walk's own (from 1 s into it to the stop window). */
  walkToe: number;
  bone: string;
  boneDeg: number;
  /** From the frame after the stop on: the stop's own frame is the pose blend's one-frame stop (the pelvis carries on
   *  2.3-3.4 cm OFF, 3.9-4.9 on the mocap walk's lower pelvis, with or without this fix), not the feet's hand-over. */
  pel: number;
  slide: number;
  plannerSlide: number;
  pitch: number;
}

/** Walk at `v` for `walk` s from 1 s, then stand 1 s; numbers from 0.2 s before the stop on. */
async function stop(v: number, walk: number, on: boolean): Promise<StopNumbers> {
  setMocapLocomotion(on);
  const plan: Plan = (_k, t) => ({ speed: t < 1 ? 0 : t < 1 + walk ? v : 0, yawRate: 0, rec: t > REC_FROM });
  let plannerSlide = 0;
  let pitch = 0;
  const R = await driveRig(Math.round(60 * (2 + walk)), plan, (rig) => {
    plannerSlide = Math.max(plannerSlide, rig.planner.L.slide, rig.planner.R.slide);
    pitch = Math.max(Math.abs(rig.planner.L.pitch), Math.abs(rig.planner.R.pitch));
  });
  const from = Math.round((1 + walk - REC_FROM - 0.2) * 60);
  let stopAt = from;
  while (stopAt < R.n && R.speed[stopAt]! > 0) stopAt++;
  const p = pops(R, from);
  return { toe: ankleToeStep(R, from), walkToe: ankleToeStep(R, Math.round((2 - REC_FROM) * 60), from), bone: p.bone, boneDeg: p.maxStepDeg, pel: pelvisStep(R, stopAt + 1), slide: plantSlide(R, 0.01), plannerSlide, pitch };
}

describe('mocap switch: a stop hands the clip swing in the air to the planner without a pop (CHECK-2 required 2)', () => {
  it('stops from 1.0 / 1.4 / 2.0 / 2.2 m/s over the gait phase: no ankle-toe pop on top of master, no pelvis step, no slide, feet flat', async () => {
    const rows: string[] = [];
    // walk lengths that stop the gait at six phases: each pace's worst before the fix (39.9-40.9 deg) and a late swing that
    // lands still easing its pitch (1.96: the toe left up)
    const WALKS = [1.69, 1.78, 1.87, 1.96, 2.14, 2.23];
    for (const v of [1.0, 1.4, 2.0, 2.2]) {
      let offToe = 0;
      let offBone = 0;
      let onToe = 0;
      let onWalkToe = 0;
      let onBone = 0;
      let onBoneName = '';
      let onPel = 0;
      for (const w of WALKS) {
        const off = await stop(v, w, false);
        const on = await stop(v, w, true);
        offToe = Math.max(offToe, off.toe);
        offBone = Math.max(offBone, off.boneDeg);
        onToe = Math.max(onToe, on.toe);
        onWalkToe = Math.max(onWalkToe, on.walkToe);
        if (on.boneDeg > onBone) {
          onBone = on.boneDeg;
          onBoneName = `${on.bone} (walk ${w})`;
        }
        onPel = Math.max(onPel, on.pel);
        const at = `stop from ${v} m/s after ${w} s`;
        expect(on.plannerSlide, `${at}: planner slide`).toBe(0);
        expect(on.slide, `${at}: planted ankle slide`).toBeLessThan(0.01);
        expect(on.pel, `${at}: pelvis step beyond pace x dt`).toBeLessThanOrEqual(0.02);
        // standing 1 s: both feet flat (a landing's toe left up by the rig's pitch cap stayed at -0.27 rad)
        expect(on.pitch, `${at}: foot pitch after the stand`).toBeLessThan(0.01);
      }
      rows.push(`stop from ${v}: ankle-toe step off ${offToe.toFixed(1)} on ${onToe.toFixed(1)} deg (the mocap walk's own ${onWalkToe.toFixed(1)}); bone step off ${offBone.toFixed(1)} on ${onBone.toFixed(1)} deg ${onBoneName}; pelvis beyond pace on ${(onPel * 100).toFixed(2)} cm`);
      // no ankle-toe pop: under the bible's limit and within 2 deg of master's stop at the same pace or the mocap walk's own
      // step (an ordinary step turns it 10-12 deg a frame either way; the pop was 35-41), and no bone past master's own
      // one-frame stop
      expect(onToe, `stop from ${v}: ankle-toe step`).toBeLessThan(POP_DEG);
      expect(onToe, `stop from ${v}: ankle-toe step`).toBeLessThanOrEqual(Math.max(offToe, onWalkToe) + 2);
      expect(onBone, `stop from ${v}: bone step`).toBeLessThanOrEqual(offBone + 0.5);
    }
    console.info(rows.join(String.fromCharCode(10)));
  }, 120_000);
});
