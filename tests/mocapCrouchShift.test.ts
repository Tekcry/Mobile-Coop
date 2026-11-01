/**
 * (mocap-trial-2, crouchpop) Crouching or standing up while walking, and a draw while walking, with the mocap switch ON
 * against OFF. As the crouch (or the drawn share) grows, the standing walk's clip feet hand the steps to the planner (the
 * mocap share falls under MOCAP_FEET.share, then to 0): a clip swing in the air, a foot the clip planted toe up on its
 * heel strike, or a foot held on its raised heel while the other finished a rule step snapped its pitch (ankle-toe up to
 * 57 deg a frame ON against 12-17 OFF), and the clock took a rule step over mid-air (the ankle 31 cm on in a frame).
 * Each case: the ankle-toe bone and every bone's turn a frame no more than OFF + 2 deg (or under 24 deg), the planted
 * feet slide under 2 cm, and the pelvis moves at most 2 cm a frame beyond the pace (a 0.3 s crouch ramp: no worse than
 * OFF, whose pelvis reads up to 2.9 cm there as the ramp stops).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { setMixamo } from '../src/anim/mixamo';
import { setMocapLocomotion } from '../src/anim/mocap';
import type { RigPose } from '../src/player/characterRig';
import { driveRig, plantSlide, pops, type J, type Plan, type Rec } from './helpers/mocapMeasure';

// (one-game) the Mixamo captures are on at load by default now; this file pins the hand-made state: `?mixamo=0`
setMixamo(false);

afterEach(() => setMocapLocomotion(false));

const DEG = 180 / Math.PI;
const POP = 24;

/** The ankle-toe bones' largest turn in one frame (deg, in the root's heading frame). */
function ankleToe(R: Rec): number {
  let worst = 0;
  for (const [a, b] of [['ankleL', 'toeL'], ['ankleR', 'toeR']] as const satisfies readonly (readonly [J, J])[]) {
    let px = 0;
    let py = 0;
    let pz = 0;
    for (let i = 0; i < R.n; i++) {
      const k = i * 3;
      const c = Math.cos(R.yaw[i]!);
      const s = Math.sin(R.yaw[i]!);
      const dx = R.pos[b][k]! - R.pos[a][k]!;
      const dy = R.pos[b][k + 1]! - R.pos[a][k + 1]!;
      const dz = R.pos[b][k + 2]! - R.pos[a][k + 2]!;
      const x = dx * c - dz * s;
      const z = dx * s + dz * c;
      const l = Math.hypot(x, dy, z) || 1;
      if (i > 0) worst = Math.max(worst, Math.acos(Math.max(-1, Math.min(1, (px * x + py * dy + pz * z) / l))) * DEG);
      px = x / l;
      py = dy / l;
      pz = z / l;
    }
  }
  return worst;
}

/** The pelvis's largest move in one frame beyond the pace x dt (m). */
function pelvisRule(R: Rec): number {
  const h = R.pos.hips;
  let worst = 0;
  for (let f = 1; f < R.n; f++) {
    const d = Math.hypot(h[f * 3]! - h[(f - 1) * 3]!, h[f * 3 + 1]! - h[(f - 1) * 3 + 1]!, h[f * 3 + 2]! - h[(f - 1) * 3 + 2]!);
    worst = Math.max(worst, d - R.speed[f]! / 60);
  }
  return worst;
}

interface Run {
  at: number;
  bone: number;
  boneName: string;
  slide: number;
  pel: number;
}

/** `plan` driven with the switch `on`; `armed(t)` (if given) draws the weapon (the rig's pose `armed`). */
async function run(on: boolean, steps: number, plan: Plan, armed?: (t: number) => boolean): Promise<Run> {
  setMocapLocomotion(on);
  let drawn = false;
  let patched = false;
  const R = await driveRig(
    steps,
    (k, t) => {
      drawn = armed ? armed(t) : false;
      return plan(k, t);
    },
    armed
      ? (rig) => {
          if (patched) return;
          patched = true;
          const animate = rig.animate.bind(rig);
          rig.animate = (dt: number, p: RigPose) => {
            p.armed = drawn;
            animate(dt, p);
          };
        }
      : undefined,
  );
  const p = pops(R);
  return { at: ankleToe(R), bone: p.maxStepDeg, boneName: `${p.bone}@${p.at}`, slide: plantSlide(R, 0.02), pel: pelvisRule(R) };
}

async function both(label: string, steps: number, plan: Plan, pelOff: boolean, armed?: (t: number) => boolean): Promise<void> {
  const off = await run(false, steps, plan, armed);
  const on = await run(true, steps, plan, armed);
  const msg = `${label}: ON ankle-toe ${on.at.toFixed(1)}, bone ${on.bone.toFixed(1)} ${on.boneName}, slide ${(on.slide * 100).toFixed(2)} cm, pelvis ${(on.pel * 100).toFixed(2)} cm | OFF ankle-toe ${off.at.toFixed(1)}, bone ${off.bone.toFixed(1)} ${off.boneName}, pelvis ${(off.pel * 100).toFixed(2)} cm`;
  expect(on.at, msg).toBeLessThanOrEqual(Math.max(POP, off.at + 2));
  expect(on.bone, msg).toBeLessThanOrEqual(Math.max(POP, off.bone + 2));
  expect(on.slide, msg).toBeLessThan(0.02);
  expect(on.pel, msg).toBeLessThanOrEqual(pelOff ? Math.max(0.02, off.pel + 0.003) : 0.02);
}

/** Walk `v` m/s; at 2 s + `off` crouch over `ramp` s, hold, at 2 s later stand up over `ramp` s. */
const crouchPlan =
  (v: number, ramp: number, off: number): Plan =>
  (_k, t) => {
    const u = t - 2 - off;
    const crouch = u < 0 ? 0 : u < ramp ? u / ramp : u < 2 ? 1 : u < 2 + ramp ? 1 - (u - 2) / ramp : 0;
    return { speed: v, yawRate: 0, rec: t > 1.5, crouch };
  };

describe('mocap crouch shift: crouching / standing up / drawing while walking (switch ON against OFF)', () => {
  it('crouch 0 -> 1 -> 0 over 0.3 / 0.6 s at 0.8 / 1.0 / 1.4 m/s, four gait phases: no pop, no slide', async () => {
    for (const v of [0.8, 1, 1.4]) {
      for (const ramp of [0.3, 0.6]) {
        for (const off of [0, 0.15, 0.3, 0.45]) await both(`walk ${v}, crouch ramp ${ramp} s, at +${off} s`, 60 * 6.5, crouchPlan(v, ramp, off), ramp < 0.5);
      }
    }
  }, 120_000);

  it('a draw while walking (standing, and with a 0.3 s crouch), 0.8 / 1.0 / 1.4 m/s, two gait phases', async () => {
    for (const v of [0.8, 1, 1.4]) {
      for (const off of [0, 0.3]) {
        const armed = (t: number): boolean => t - 2 - off >= 0 && t - 2 - off < 2;
        await both(`walk ${v}, draw at +${off} s`, 60 * 6.5, (_k, t) => ({ speed: v, yawRate: 0, rec: t > 1.5 }), false, armed);
        await both(`walk ${v}, draw + crouch at +${off} s`, 60 * 6.5, crouchPlan(v, 0.3, off), true, armed);
      }
    }
  }, 120_000);
});
