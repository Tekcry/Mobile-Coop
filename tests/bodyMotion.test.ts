/**
 * (anim-natural-n2 step 2) The body motion layer (`src/anim/bodyMotion.ts`): row-weight continuity across the band
 * edges, phase lock (the same output for the same phase at 60 / 120 / 240 Hz), no allocation, the layer at 0 amounts
 * bit-identical to the pre-layer Wren rig, and the measured trunk / sway / head ranges before and after on a headless
 * Wren rig (`tests/helpers/bodyMotionMeasure.ts`, the research harness's maths; the e2e-anim "body motion" block in
 * scripts/e2e-anim.mjs uses the same maths in the live game).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BODY_MOTION,
  BODY_MOTION_FIELDS,
  BODY_MOTION_ROWS,
  bodyMotionBands,
  bodyMotionStep,
  bodyMotionWeights,
  newBodyMotion,
  newBodyMotionIn,
  type BodyMotion,
  type BodyMotionIn,
} from '../src/anim/bodyMotion';
import { KEYED_CROUCH, KEYED_GAITS } from '../src/anim/animGraph';
import { BODY_GROUPS } from '../src/anim/tune';
import { measureMotion, withBodyMotionOff, type MotionMetrics } from './helpers/bodyMotionMeasure';
import { runIdentity, type IdentityFixture } from './helpers/animSkeletonIdentity';

const OFF_FIXTURE = 'tests/fixtures/anim-skeleton-identity-motion-off.json';
const CAPTURE = process.env.ANIM_SKELETON_CAPTURE === '1';

function frame(i: BodyMotionIn, o: BodyMotion): number[] {
  bodyMotionStep(i, o);
  return [o.hipYaw, o.chestYaw, o.pelX, o.headFollow, o.headPitch];
}

describe('body motion: the rows', () => {
  it('has one numeric literal per field for every row, rows named as the tuner body groups', () => {
    for (const r of BODY_MOTION_ROWS) {
      expect((BODY_GROUPS as readonly string[]).includes(r), r).toBe(true);
      for (const f of BODY_MOTION_FIELDS) expect(typeof BODY_MOTION[r][f], `${r}.${f}`).toBe('number');
    }
    // the source holds them as literals (step 5 bakes into BODY_MOTION.<row>.<field>)
    const src = readFileSync('src/anim/bodyMotion.ts', 'utf8');
    for (const r of BODY_MOTION_ROWS) expect(src, r).toMatch(new RegExp(`\\n  ${r}: \\{ hipTurn: -?[\\d.]+, hipTime: -?[\\d.]+, chestTurn: -?[\\d.]+, chestTime: -?[\\d.]+, sway: -?[\\d.]+, swayTime: -?[\\d.]+, headFollow: -?[\\d.]+, headNod: -?[\\d.]+ \\}`));
  });

  it('weights sum to 1 and never step across the band edges (pace, crouch, raise, drawn, moving)', () => {
    const i = newBodyMotionIn();
    const o = newBodyMotion();
    const w = new Float64Array(13);
    i.gate = 1;
    const EPS = 2e-3; // per input step of 1e-3: the outputs move at most ~2x the step (smoothstep slope 1.5)
    const scale = [1, 1, 100, 1, 1]; // pelX m -> cm, the angles rad
    let worst = 0;
    const sweep = (set: (x: number) => void): void => {
      for (const ph of [0, 0.13, 0.37, 0.61, 0.88]) {
        i.phase = ph;
        let prev: number[] | null = null;
        for (let x = 0; x <= 1.0000001; x += 1e-3) {
          set(x);
          bodyMotionWeights(i, w);
          let sum = 0;
          for (let r = 0; r < 13; r++) {
            expect(w[r]!).toBeGreaterThanOrEqual(-1e-12);
            sum += w[r]!;
          }
          expect(sum).toBeCloseTo(1, 9);
          const f = frame(i, o);
          if (prev) for (let k = 0; k < 5; k++) worst = Math.max(worst, Math.abs(f[k]! - prev[k]!) * scale[k]! * (k < 2 || k === 4 ? 180 / Math.PI : 1));
          prev = f;
        }
      }
    };
    const pace = (es: number, cp: number) => bodyMotionBands(i, es, cp, KEYED_GAITS, KEYED_CROUCH);
    for (const [move, crouch, drawn, aim] of [[1, 0, 0, 0], [1, 1, 0, 0], [1, 0.5, 1, 0.5], [0.5, 0, 1, 0]] as const) {
      i.move = move;
      i.crouch = crouch;
      i.drawn = drawn;
      i.aim = aim;
      // the standing and crouched effort pace through every band edge (0..6 and 0..3 in 1e-3 of the sweep)
      sweep((x) => pace(x * 6, x * 3));
    }
    pace(2.3, 1.3);
    sweep((x) => (i.crouch = x));
    sweep((x) => (i.aim = x));
    sweep((x) => (i.drawn = x));
    sweep((x) => (i.move = x));
    sweep((x) => (i.gate = x));
    // in deg (or cm, share) per 1e-3 of the input: no pop anywhere (the largest swing is ~5 deg, 1.5 x 6 x 1e-3 x 5)
    expect(worst).toBeLessThan(EPS * 100);
  });

  it('is phase-locked: the same phase gives the same offsets at 60, 120 and 240 Hz', () => {
    const i = newBodyMotionIn();
    const o = newBodyMotion();
    i.gate = 1;
    i.move = 1;
    bodyMotionBands(i, 2.3, 0, KEYED_GAITS, KEYED_CROUCH);
    const run = (hz: number): number[][] => {
      const out: number[][] = [];
      const n = 2 * hz;
      for (let k = 0; k <= n; k++) {
        i.phase = ((k / hz) * 1.7) % 1; // 1.7 cycles a second
        out.push(frame(i, o));
      }
      return out;
    };
    const a = run(60);
    const b = run(120);
    const c = run(240);
    for (let k = 0; k < a.length; k++) {
      for (let f = 0; f < 5; f++) {
        expect(b[k * 2]![f]!).toBeCloseTo(a[k]![f]!, 12);
        expect(c[k * 4]![f]!).toBeCloseTo(a[k]![f]!, 12);
      }
    }
  });

  it('a closed gate gives exact zeros', () => {
    const i = newBodyMotionIn();
    i.move = 1;
    i.phase = 0.3;
    const o = bodyMotionStep(i, newBodyMotion());
    expect([o.w, o.hipYaw, o.chestYaw, o.pelX, o.headFollow, o.headPitch]).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('allocates nothing per step', () => {
    const i = newBodyMotionIn();
    const o = newBodyMotion();
    i.gate = 1;
    let acc = 0;
    const run = (): number => {
      const before = process.memoryUsage().heapUsed;
      for (let k = 0; k < 200000; k++) {
        i.phase = (k * 0.013) % 1;
        i.move = 0.5 + 0.5 * Math.sin(k * 0.001);
        i.crouch = (k & 1023) / 1023;
        i.aim = (k & 511) / 511;
        i.drawn = (k & 255) / 255;
        bodyMotionBands(i, (k % 6000) / 1000, (k % 3000) / 1000, KEYED_GAITS, KEYED_CROUCH);
        bodyMotionStep(i, o);
        acc += o.hipYaw + o.chestYaw + o.pelX + o.headPitch;
      }
      return process.memoryUsage().heapUsed - before;
    };
    run();
    const grown = Math.min(run(), run(), run());
    expect(Number.isFinite(acc)).toBe(true);
    expect(grown).toBeLessThan(2_000_000);
  });
});

describe('body motion: amounts 0 are the pre-layer Wren rig bit for bit', () => {
  it.skipIf(!CAPTURE)('captures the layer-off fixture (amounts 0)', async () => {
    const got = await withBodyMotionOff(() => runIdentity());
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(got)) o[k] = { steps: v.steps, rig: v.rig, poser: v.poser };
    writeFileSync(OFF_FIXTURE, `${JSON.stringify(o, null, 1)}\n`);
  }, 600000);

  // the off fixture is the Wren identity fixture before the layer (master 5220f79c; keyed:run and partner:moves re-captured
  // after the A1 merge, equal on all 40 entries to feature/anim-n2-runkey 038e2519's fixture; re-captured after the master
  // 4.54.1 merge, equal to master's fixture but for keyed:run and partner:moves, the A1 rebake): with every amount 0 the rig's
  // world matrices, local TRS and the poser output on every LOD match it, so the layer adds only its own swings
  it.skipIf(CAPTURE)('every clip, state and the partner path hash as before the layer', async () => {
    expect(existsSync(OFF_FIXTURE)).toBe(true);
    const want = JSON.parse(readFileSync(OFF_FIXTURE, 'utf8')) as IdentityFixture;
    const got = await withBodyMotionOff(() => runIdentity());
    for (const id of Object.keys(want)) {
      expect(got[id], `${id} still runs`).toBeDefined();
      expect(got[id]!.rig, `${id} rig`).toBe(want[id]!.rig);
      expect(got[id]!.poser, `${id} poser`).toEqual(want[id]!.poser);
    }
  }, 600000);
});

/**
 * Measured at 60 Hz (sim time), before (amounts 0) and after. Before: the N2 research table (PLAN.md "Measured now").
 * After: PLAN step 2's targets (fix round: the sway at 0.7x, A11, walk lateral 3.6 cm; A12: the walk sway 0.6, 2.9 cm).
 * The run after A1 (the key pop gone): pinned as measured.
 */
describe('body motion: measured on a headless Wren rig', () => {
  let off: Record<string, MotionMetrics>;
  let on: Record<string, MotionMetrics>;
  const get = async (): Promise<void> => {
    if (on) return;
    off = await withBodyMotionOff(() => measureMotion(60));
    on = await measureMotion(60);
  };

  it('before: the keyed clips alone (the research table)', async () => {
    await get();
    const near = (v: number, want: number, tol: number, what: string) => expect(Math.abs(v - want), `${what} ${v} vs ${want}`).toBeLessThanOrEqual(tol);
    near(off.walk!.pelvisYaw, 3.1, 0.3, 'walk pelvis');
    near(off.walk!.shoulderYaw, 3.1, 0.3, 'walk shoulders');
    near(off.walk!.lateralCm, 1.7, 0.3, 'walk lateral');
    near(off.jog!.pelvisYaw, 5, 0.3, 'jog pelvis');
    near(off.jog!.shoulderYaw, 7, 0.3, 'jog shoulders');
    near(off.sneak!.pelvisYaw, 2, 0.3, 'sneak pelvis');
    near(off.crouchWalk!.pelvisYaw, 4, 0.3, 'crouch walk pelvis');
    near(off.aimSide!.counterCorr, -0.47, 0.05, 'aim side corr');
    for (const k of ['walk', 'jog', 'sneak', 'crouchWalk', 'aimFwd', 'aimSide']) {
      expect(off[k]!.headYaw, `${k} head yaw`).toBeLessThan(0.01);
      expect(off[k]!.headPitch, `${k} head pitch`).toBeLessThan(0.01);
    }
  }, 600000);

  it('after: the trunk counter-rotates, the pelvis sways and the head follows (PLAN step 2 targets)', async () => {
    await get();
    const inR = (v: number, lo: number, hi: number, what: string) => {
      expect(v, what).toBeGreaterThanOrEqual(lo);
      expect(v, what).toBeLessThanOrEqual(hi);
    };
    inR(on.walk!.pelvisYaw, 7, 9, 'walk pelvis');
    inR(on.walk!.shoulderYaw, 7, 9, 'walk shoulders');
    // (A12) the walk sway 0.98 -> 0.6 (master's Body base narrows the feet: the knee-out margin): 3.6 -> 2.9 cm
    inR(on.walk!.lateralCm, 2.6, 3.3, 'walk lateral');
    inR(on.jog!.pelvisYaw, 11, 13, 'jog pelvis');
    inR(on.jog!.shoulderYaw, 14.5, 17, 'jog shoulders');
    inR(on.sneak!.pelvisYaw, 4.5, 5.5, 'sneak pelvis');
    inR(on.sneak!.shoulderYaw, 4.5, 6, 'sneak shoulders');
    inR(on.crouchWalk!.pelvisYaw, 7, 9, 'crouch walk pelvis');
    inR(on.crouchWalk!.shoulderYaw, 7, 9.5, 'crouch walk shoulders');
    inR(on.aimFwd!.pelvisYaw, 3, 4.5, 'aim glide pelvis');
    inR(on.run!.lateralCm, 2, 3, 'run lateral');
    for (const k of ['walk', 'jog', 'run', 'sneak', 'crouchWalk', 'crouchRun', 'lowReadyWalk']) {
      expect(on[k]!.counterCorr, `${k} corr`).toBeLessThan(-0.9);
      inR(on[k]!.headYaw, 2, 6, `${k} head yaw`);
    }
    for (const k of ['aimFwd', 'aimSide', 'aimBack', 'crouchAimFwd']) {
      expect(on[k]!.counterCorr, `${k} corr`).toBeLessThan(-0.8);
      expect(on[k]!.headYaw, `${k} head yaw (aiming)`).toBeLessThan(0.01);
      // the chest stays on the aim: the shoulders as before
      expect(Math.abs(on[k]!.shoulderYaw - off[k]!.shoulderYaw), `${k} shoulders`).toBeLessThanOrEqual(0.1);
    }
    for (const k of Object.keys(on)) expect(on[k]!.headPitch, `${k} head pitch`).toBeLessThanOrEqual(2);
    // the stills are untouched in this step (step 4 adds them)
    for (const k of ['idle', 'aimStill']) expect(on[k], k).toEqual(off[k]);
    // (A1 merged) the run's keyed trunk ~20 / 21 deg p2p, the layer's 3 / 4 deg added on top
    inR(on.run!.pelvisYaw, 24, 28, 'run pelvis (after A1)');
    inR(on.run!.shoulderYaw, 27, 31, 'run shoulders (after A1)');
  }, 600000);

  it('the same ranges at 120 and 240 Hz (phase-locked, sim time)', async () => {
    await get();
    for (const hz of [120, 240]) {
      const r = await measureMotion(hz, ['walk', 'aimSide']);
      for (const k of ['walk', 'aimSide']) {
        expect(Math.abs(r[k]!.pelvisYaw - on[k]!.pelvisYaw), `${k} pelvis @${hz}`).toBeLessThanOrEqual(0.3);
        expect(Math.abs(r[k]!.shoulderYaw - on[k]!.shoulderYaw), `${k} shoulders @${hz}`).toBeLessThanOrEqual(0.3);
      }
      // the walk's sway is the layer's (the side glide's lateral is its own eased hip shift, GLIDE_HIP)
      expect(Math.abs(r.walk!.lateralCm - on.walk!.lateralCm), `walk lateral @${hz}`).toBeLessThanOrEqual(0.3);
    }
  }, 600000);
});
