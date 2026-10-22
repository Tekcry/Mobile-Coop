/**
 * (mocap-trial-2, runturn) Fast jog / run turns with the mocap switch on: a turn past the clip feet's limit (jog ~2.5,
 * run ~3.6 rad/s) hands the steps to the planner inside the clip's long swing window. Those planner swings run in the
 * body's frame (footPlanner `CLIP_SWING`); along the world chord the outside foot crossed the planted one and snapped
 * back (run 4.0 m/s x 4 rad/s ankle-toe 81 deg in a frame, OFF 58). Asserts: ON pops no more than OFF (+ POP_MARGIN), and
 * under the bible's 25 deg; the pelvis inside pace x dt + 2 cm (bible 5.12.2); the planted feet do not slide.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { setMocapLocomotion } from '../src/anim/mocap';
import { driveRig, plantSlide, pops, POP_DEG, type Plan, type Rec } from './helpers/mocapMeasure';

/**
 * Allowance (deg) on ON <= OFF: the same turn's worst frame moves 1-2 deg with the turn's start offset alone (OFF jog 2.8
 * x 2.5 rad/s 30.2-30.7, run 4.0 x 4 56.8-59.3), so 2 deg is noise, not a pop. Measured ON sits 20-44 deg under OFF here.
 */
const POP_MARGIN = 2;

/** Turning right / left 1.2 s in every 2.5 s from 2 s + `off`, recorded from 1.5 s. */
function turns(v: number, yr: number, off: number): Plan {
  return (_k, t) => {
    const u = t - off;
    return { speed: v, yawRate: t > 2 + off && ((u % 2.5) + 2.5) % 2.5 < 1.2 ? (((u % 5) + 5) % 5 < 2.5 ? yr : -yr) : 0, rec: t > 1.5 };
  };
}

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

describe('mocap fast jog / run turns (switch ON no worse than OFF)', () => {
  afterAll(() => setMocapLocomotion(false));
  const cases: [number, number, number][] = [
    [2.8, 3, 0],
    [2.8, 4, 0.71],
    [4.0, 4, 0],
    [4.0, 4, 0.37],
  ];
  for (const [v, yr, off] of cases) {
    it(`${v} m/s x ${yr} rad/s, turns from ${off} s`, async () => {
      setMocapLocomotion(false);
      const O = await driveRig(60 * 10, turns(v, yr, off));
      setMocapLocomotion(true);
      const N = await driveRig(60 * 10, turns(v, yr, off));
      setMocapLocomotion(false);
      // the turns hand the steps to the planner (clip feet valid but off) and give them back
      expect(N.clipOn.some((c) => c === 0)).toBe(true);
      expect(N.clipOn.some((c) => c === 1)).toBe(true);
      const toeOff = toeStep(O);
      const toeOn = toeStep(N);
      const boneOff = pops(O).maxStepDeg;
      const boneOn = pops(N).maxStepDeg;
      expect(toeOn, `ankle-toe ON ${toeOn.toFixed(1)} vs OFF ${toeOff.toFixed(1)} deg`).toBeLessThanOrEqual(toeOff + POP_MARGIN);
      expect(boneOn, `bone step ON ${boneOn.toFixed(1)} vs OFF ${boneOff.toFixed(1)} deg`).toBeLessThanOrEqual(boneOff + POP_MARGIN);
      expect(boneOn, `bone step ON ${boneOn.toFixed(1)} deg`).toBeLessThan(POP_DEG);
      expect(pelvisOver(N), 'pelvis beyond pace x dt (m)').toBeLessThanOrEqual(0.02);
      expect(plantSlide(N, 0.01), 'planted feet slide (m)').toBeLessThan(0.01);
    }, 60_000);
  }
});
