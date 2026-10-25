// (crouch-pops) Michael's Body tune (idle / walk / jog / run trackMul 0.05, the crouched rows 1) changed rows at crouch
// 0.5 and then eased the stance width over BODY_TAU: a step in the width's velocity mid-crouch (e2e-anim's two crouch
// pops, docs/archive/crouch-pops/BRIEF.md). The Body base now blends the standing row toward the crouched row by the crouch
// amount (CP-A2). Asserted on the posed rig, CT-driven (helpers/mocapPlayer), mocap OFF and ON:
// - the stance width's velocity changes by no more than 0.5 cm per 60 Hz frame over the transition;
// - the e2e-anim pop metric (the worst velocity change of the hips, wrists, head and the knees over planted feet, in the
//   body frame) is within 0.5 cm of the same run with the Body rows' trackMul at 1 (CP-A1: the tune adds no pop).
import { afterEach, describe, expect, it } from 'vitest';
import { ANIM_BASE } from '../src/anim/animBase';
import { bodyBaseLoad } from '../src/anim/tune';
import { ctRun, type Mode, type Target } from './helpers/mocapPlayer';
import type { Rec } from './helpers/mocapMeasure';

const POP = 0.005;
const JS = ['hips', 'kneeL', 'kneeR', 'wristL', 'wristR', 'headNode'] as const;

/** e2e-anim's stand <-> crouch metric on a recording (m per 60 Hz frame). */
function popOf(R: Rec): number {
  let worst = 0;
  let prev: number[] | null = null;
  let vel: number[] | null = null;
  const now: number[] = [];
  const v: number[] = [];
  for (let f = 0; f < R.n; f++) {
    const rx = R.root[f * 3]!, ry = R.root[f * 3 + 1]!, rz = R.root[f * 3 + 2]!;
    const cs = Math.cos(R.yaw[f]!), sn = Math.sin(R.yaw[f]!);
    now.length = 0;
    for (const j of JS) {
      const P = R.pos[j];
      const dx = P[f * 3]! - rx, dz = P[f * 3 + 2]! - rz;
      now.push(dx * cs - dz * sn, P[f * 3 + 1]! - ry, dx * sn + dz * cs);
    }
    if (prev) {
      v.length = 0;
      for (let k = 0; k < now.length; k++) v.push(now[k]! - prev[k]!);
      if (vel)
        for (let k = 0; k < JS.length; k++) {
          const pl = k === 1 ? R.contactL : k === 2 ? R.contactR : null;
          if (pl && !(pl[f] && pl[f - 1])) continue;
          const a = Math.sqrt((v[3 * k]! - vel[3 * k]!) ** 2 + (v[3 * k + 1]! - vel[3 * k + 1]!) ** 2 + (v[3 * k + 2]! - vel[3 * k + 2]!) ** 2);
          if (a > worst) worst = a;
        }
      vel = v.slice();
    }
    prev = now.slice();
  }
  return worst;
}

/** One run: the pop metric and the stance width's worst velocity change (m per frame) from `rec` s on. */
async function measure(T: Target, steps: number, rec: number, mode: Mode): Promise<{ pop: number; width: number }> {
  const w: number[] = [];
  const from = Math.round(rec * 60);
  const R = await ctRun(T, steps, rec, mode, (rig, k) => {
    if (k < from) return;
    const s = rig.graph.out.stance;
    w.push(s.rX - s.lX);
  });
  let width = 0;
  for (let f = 2; f < w.length; f++) width = Math.max(width, Math.abs(w[f]! - 2 * w[f - 1]! + w[f - 2]!));
  return { pop: popOf(R), width };
}

const still: Target = (t) => ({ v: 0, yr: 0, crouch: t >= 0.8 && t < 2.0 ? 1 : 0 });
const running: Target = (t) => {
  const c = t >= 1.0 && t < 2.0;
  return { v: c ? 2.6 : 4.0, yr: 0, crouch: c ? 1 : 0 };
};
const CASES: readonly (readonly [string, Target, number, number])[] = [
  ['holstered still: stand -> crouch -> stand', still, 200, 0.8],
  ['holstered running: crouch -> stand', running, 190, 1.0],
];

const flat = (): Record<string, Record<string, number>> => {
  const b = JSON.parse(JSON.stringify(ANIM_BASE.body)) as Record<string, Record<string, number>>;
  for (const r of Object.values(b)) if (r.trackMul !== undefined) r.trackMul = 1;
  return b;
};

afterEach(() => {
  bodyBaseLoad(ANIM_BASE.body);
});

describe('crouch pops (Michael\'s Body tune, trackMul 0.05)', () => {
  it('the baked tune is the one measured (idle trackMul 0.05, crouched rows untuned)', () => {
    expect((ANIM_BASE.body as Record<string, Record<string, number>>).idle?.trackMul).toBe(0.05);
    expect((ANIM_BASE.body as Record<string, Record<string, number>>).crouchIdle?.trackMul).toBeUndefined();
  });
  for (const mode of ['off', 'on'] as const)
    for (const [name, T, steps, rec] of CASES)
      it(`${name}, mocap ${mode.toUpperCase()}: no pop (<= 0.5 cm per frame)`, async () => {
        bodyBaseLoad(ANIM_BASE.body);
        const baked = await measure(T, steps, rec, mode);
        bodyBaseLoad(flat());
        const ref = await measure(T, steps, rec, mode);
        const cm = (x: number): string => (x * 100).toFixed(2);
        console.info(`${name} ${mode}: width ${cm(baked.width)} cm/frame (untuned width ${cm(ref.width)}); pop ${cm(baked.pop)} vs ${cm(ref.pop)} cm/frame`);
        expect(baked.width, 'stance width velocity change').toBeLessThanOrEqual(POP);
        expect(baked.pop - ref.pop, 'pop over the untuned width').toBeLessThanOrEqual(POP);
      }, 120000);
});
