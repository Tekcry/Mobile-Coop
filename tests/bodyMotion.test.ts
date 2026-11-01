/**
 * (anim-natural-n2 step 2) The body motion layer (`src/anim/bodyMotion.ts`): row-weight continuity across the band
 * edges, phase lock (the same output for the same phase at 60 / 120 / 240 Hz), no allocation, the layer at 0 amounts
 * bit-identical to the pre-layer Wren rig, and the measured trunk / sway / head ranges before and after on a headless
 * Wren rig (`tests/helpers/bodyMotionMeasure.ts`, the research harness's maths; the e2e-anim "body motion" block in
 * scripts/e2e-anim.mjs uses the same maths in the live game). (step 3) The keyed arms: KEY_MOTION's literals, the speed
 * cap's blend, and the wrists measured before / after on the gaits and turns (the drawn arms untouched).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { setMixamo } from '../src/anim/mixamo';
import {
  ARM_SPEED_MAX,
  BODY_MOTION,
  BODY_MOTION_FIELDS,
  BODY_MOTION_ROWS,
  KEY_MOTION,
  KEY_MOTION_FIELDS,
  KEY_MOTION_ROWS,
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
import { measureMotion, measureStudioArms, measureTurns, withBodyMotionOff, withKeyMotionOff, withTrunkMotionOff, type MotionMetrics } from './helpers/bodyMotionMeasure';
import { runIdentity, type IdentityFixture } from './helpers/animSkeletonIdentity';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

// (one-game) the Mixamo captures are on at load by default now; this file pins the hand-made state: `?mixamo=0`
setMixamo(false);

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

  it('(step 3) KEY_MOTION: one numeric literal per field for every keyed gait row (body rows the keyed arms swing in)', () => {
    for (const r of KEY_MOTION_ROWS) {
      expect((BODY_MOTION_ROWS as readonly string[]).includes(r), r).toBe(true);
      for (const f of KEY_MOTION_FIELDS) expect(typeof KEY_MOTION[r][f], `${r}.${f}`).toBe('number');
      expect(KEY_MOTION[r].armSpeed, `${r} armSpeed`).toBeGreaterThan(0);
      expect(KEY_MOTION[r].armSpeed, `${r} armSpeed`).toBeLessThanOrEqual(ARM_SPEED_MAX);
    }
    const src = readFileSync('src/anim/bodyMotion.ts', 'utf8');
    for (const r of KEY_MOTION_ROWS) expect(src, r).toMatch(new RegExp(`\\n  ${r}: \\{ armGain: [\\d.]+, armSpeed: [\\d.]+ \\}`));
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
    // (step 3) no keyed arm speed cap with the gate closed
    expect(o.armSpeed).toBe(Infinity);
  });

  it('(step 3) the arm speed cap blends by the keyed gait shares, never steps at a band edge, lets go with the gate', () => {
    const i = newBodyMotionIn();
    const o = newBodyMotion();
    i.gate = 1;
    i.move = 1;
    const speeds = KEY_MOTION_ROWS.map((r) => KEY_MOTION[r].armSpeed);
    const lo = Math.min(...speeds);
    const hi = Math.max(...speeds);
    let worst = 0;
    for (const crouch of [0, 0.5, 1]) {
      i.crouch = crouch;
      let prev = Number.NaN;
      for (let x = 0; x <= 1.0000001; x += 1e-3) {
        bodyMotionBands(i, x * 6, x * 3, KEYED_GAITS, KEYED_CROUCH);
        bodyMotionStep(i, o);
        expect(o.armSpeed).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(o.armSpeed).toBeLessThanOrEqual(hi + 1e-9);
        if (!Number.isNaN(prev)) worst = Math.max(worst, Math.abs(o.armSpeed - prev));
        prev = o.armSpeed;
      }
    }
    // m/s per 1e-3 of the sweep: the widest row gap (12) x the smoothstep slope 1.5 x 6 / 0.6 (the run band) ~0.18
    expect(worst).toBeLessThan(0.3);
    // each row's own cap at its pace (standing walk, run; crouched sneak, crouch run)
    const at = (crouch: number, es: number, cp: number): number => {
      i.crouch = crouch;
      bodyMotionBands(i, es, cp, KEYED_GAITS, KEYED_CROUCH);
      return bodyMotionStep(i, o).armSpeed;
    };
    expect(at(0, 1, 1)).toBeCloseTo(KEY_MOTION.walk.armSpeed, 9);
    expect(at(0, 5, 1)).toBeCloseTo(KEY_MOTION.run.armSpeed, 9);
    expect(at(1, 1, 0.5)).toBeCloseTo(KEY_MOTION.sneak.armSpeed, 9);
    expect(at(1, 1, 3)).toBeCloseTo(KEY_MOTION.crouchRun.armSpeed, 9);
    // the gate eases it in: cap / gate
    i.gate = 0.5;
    expect(bodyMotionStep(i, o).armSpeed).toBeCloseTo(KEY_MOTION.crouchRun.armSpeed * 2, 9);
  });

  it('allocates nothing per step', async () => {
    const i = newBodyMotionIn();
    const o = newBodyMotion();
    i.gate = 1;
    // (CHECK-3 should-fix 1) gc() + new space per round (tests/helpers/allocPerCall.ts): heapUsed over 200k steps read
    // other work's garbage under load (3.2 MB > 2 MB in a 12-file parallel run). Inputs precomputed (no double arithmetic
    // in the measured loop), the result into a typed slot; the pace sweeps every band edge (0..6 / 0..3 m/s).
    const N = 2000;
    const PH = inputs(N, (k) => (k * 0.013) % 1);
    const MV = inputs(N, (k) => 0.5 + 0.5 * Math.sin(k * 0.003));
    const CR = inputs(N, (k) => (k & 1023) / 1023);
    const AM = inputs(N, (k) => (k & 511) / 511);
    const DR = inputs(N, (k) => (k & 255) / 255);
    const TA = inputs(N, (k) => ((k * 3) % 6000) / 1000);
    const TB = inputs(N, (k) => ((k * 3) % 3000) / 1000);
    sink[0] = 0;
    // a step leaving one boxed double (16 B) reads over the limit; any object (48 B and up) far over it
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        i.phase = PH[k]!;
        i.move = MV[k]!;
        i.crouch = CR[k]!;
        i.aim = AM[k]!;
        i.drawn = DR[k]!;
        bodyMotionBands(i, TA[k]!, TB[k]!, KEYED_GAITS, KEYED_CROUCH);
        bodyMotionStep(i, o);
        sink[0]! += o.hipYaw + o.chestYaw + o.pelX + o.headPitch;
      }
    }, HEAP_NUMBER / 2, { n: N });
    console.info(`bytes per bodyMotionBands + bodyMotionStep: ${per.toFixed(2)}`);
    expect(Number.isFinite(sink[0]!)).toBe(true);
    expect(per).toBeLessThanOrEqual(HEAP_NUMBER / 2);
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
  // 4.54.1 merge, equal to master's fixture but for keyed:run and partner:moves, the A1 rebake; re-captured after the master
  // 4.55.1 merge, equal to master's fixture but for partner:moves, the run taking #110's half; re-captured after the N1
  // merge, the previous one but for partner:moves, N1's turn rules): with every amount 0 the rig's
  // world matrices, local TRS and the poser output on every LOD match it, so the layer adds only its own swings. (step 3)
  // The keyed arms at their identity too (KEY_MOTION armGain 1, armSpeed ARM_SPEED_MAX): unchanged, not re-captured
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
      // (e2e-anim low ready jog elbows, PASS2 item 7) the gun out keeps the chest on the gun: the low-ready head follows
      // only the keyed carry trunk (1.1 deg p2p; was 2-6 with the layer's chest swing, which winged the elbows 6.0 cm)
      if (k === 'lowReadyWalk') expect(on[k]!.headYaw, `${k} head yaw`).toBeLessThanOrEqual(2);
      else inR(on[k]!.headYaw, 2, 6, `${k} head yaw`);
    }
    // the low-ready chest stays on the gun: the shoulders as with the layer off (the pelvis still swings under them)
    expect(Math.abs(on.lowReadyWalk!.shoulderYaw - off.lowReadyWalk!.shoulderYaw), 'lowReadyWalk shoulders').toBeLessThanOrEqual(0.1);
    inR(on.lowReadyWalk!.pelvisYaw, 7, 9, 'lowReadyWalk pelvis');
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

  /**
   * (step 3) The keyed arms (KEY_MOTION): the wrist's forward range and peak speed (root frame, the audit's
   * wristFwdRangeCm / wristSpeedMax; and the chest frame the cap reads), before (`keyOff`: KEY_MOTION at its identity,
   * the trunk layer on, the N2 step 2 head) and after. PLAN step 3: walk wrist 23 -> ~30 cm, jog ~35 (Michael's Body
   * base already gives it), the turn / strafe whip (13-22 m/s in the audit) gone; the drawn arms untouched (the grip IK);
   * AUDIT fix 35 (the low-ready run pelvis +-25 deg with 20 deg snaps) re-measured after A1 + A13.
   */
  it('(step 3) the keyed arms: the walk swings wider, the turns no longer whip, the drawn arms and the run keys untouched', async () => {
    await get();
    const keyOff = await withKeyMotionOff(() => measureMotion(60));
    const turns = await measureTurns(60);
    const turnsOff = await withKeyMotionOff(() => measureTurns(60));
    const inR = (v: number, lo: number, hi: number, what: string) => {
      expect(v, what).toBeGreaterThanOrEqual(lo);
      expect(v, what).toBeLessThanOrEqual(hi);
    };
    // before: the research table's arms (the keyed clips alone; the jog with Michael's Body base armSwingMul 1.7)
    inR(off.walk!.wristFwdCm, 22, 24, 'walk wrist range before');
    inR(off.jog!.wristFwdCm, 33, 36, 'jog wrist range before');
    // the walk's arm gain 1.3: 23 -> 29.9 cm (31.1 with the trunk layer); the jog keeps its 34-37 (gain 1)
    const trunkOff = await withTrunkMotionOff(() => measureMotion(60, ['walk']));
    inR(trunkOff.walk!.wristFwdCm, 28, 31, 'walk wrist range, the keyed arms alone (no trunk layer)');
    inR(on.walk!.wristFwdCm, 29, 33, 'walk wrist range after');
    inR(on.jog!.wristFwdCm, 34, 39, 'jog wrist range after');
    expect(Math.abs(on.jog!.wristFwdCm - keyOff.jog!.wristFwdCm), 'jog wrist range (gain 1)').toBeLessThanOrEqual(0.3);
    // (PASS2 item 9) the crouch run swings its own keyed clip, not the jog's arms (21.8 cm audit / 23.6 here vs 36.8)
    expect(on.crouchRun!.wristFwdCm, 'crouch run wrist range').toBeLessThan(on.jog!.wristFwdCm * 0.75);
    expect(on.crouchRun!.wristPeak, 'crouch run wrist peak').toBeLessThan(2);
    // the jog's own keys under the cap (chest frame 6.9 -> 6.0 m/s, at most 1.7 cm off its keys)
    expect(on.jog!.wristPeakChest, 'jog wrist peak, chest frame').toBeLessThanOrEqual(6.5);
    expect(keyOff.jog!.wristPeakChest, 'jog wrist peak before, chest frame').toBeGreaterThan(6.5);
    expect(on.walk!.wristPeak, 'walk wrist peak').toBeLessThan(1.5);
    // the run's keys untouched at 4 m/s (KEY_MOTION.run.armSpeed 18; since the run arm pop fix the keys peak at 5.5 m/s)
    expect(Math.abs(on.run!.wristFwdCm - keyOff.run!.wristFwdCm), 'run wrist range').toBeLessThanOrEqual(0.1);
    expect(Math.abs(on.run!.wristPeak - keyOff.run!.wristPeak), 'run wrist peak').toBeLessThanOrEqual(0.05);
    // the turns and the strafe start: the gait swap's whip capped (audit 13-16 / 22 m/s; here before 14.2 / 9.8)
    for (const k of ['turn180Jog', 'strafe', 'curveJog']) {
      expect(turns[k]!.wristPeak, `${k} wrist peak`).toBeLessThanOrEqual(7.5);
      expect(turns[k]!.wristPeakChest, `${k} wrist peak, chest frame`).toBeLessThanOrEqual(7.5);
    }
    expect(turnsOff.turn180Jog!.wristPeak, 'turn180Jog wrist peak before').toBeGreaterThan(12);
    expect(turnsOff.strafe!.wristPeak, 'strafe wrist peak before').toBeGreaterThan(9);
    // (PASS2 item 7) drawn, the arms ride the gun's grip IK: the gain and the cap never reach them (and A13's low-ready
    // head and chest stay as they were)
    for (const k of ['lowReadyWalk', 'lowReadyJog', 'lowReadyRun']) expect(on[k], k).toEqual(keyOff[k]);
    expect(turns.lowReadyTurn180, 'lowReadyTurn180').toEqual(turnsOff.lowReadyTurn180);
    // the crouch rows (gain 1, their keys under the cap) and the stills as before
    for (const k of ['sneak', 'crouchWalk', 'crouchRun', 'idle', 'aimStill']) expect(on[k], k).toEqual(keyOff[k]);
    // (AUDIT fix 35, after A1 + A13) the low-ready run's pelvis is the run's: ~26 deg p2p (+-13), no snap (3.1 deg per
    // frame at most; the audit read +-25 deg with ~20 deg snaps: A1's run key pop)
    inR(on.lowReadyRun!.pelvisYaw, 22, 30, 'low ready run pelvis');
    expect(on.lowReadyRun!.pelvisStep, 'low ready run pelvis step').toBeLessThan(5);
    expect(Math.abs(on.lowReadyRun!.pelvisYaw - on.run!.pelvisYaw), 'low ready run pelvis = the run').toBeLessThanOrEqual(1);
  }, 900000);

  it('the same ranges at 120 and 240 Hz (phase-locked, sim time)', async () => {
    await get();
    for (const hz of [120, 240]) {
      const r = await measureMotion(hz, ['walk', 'aimSide']);
      // (step 3) the arm gain and the cap (m/s, per frame time) read the same at any rate
      expect(Math.abs(r.walk!.wristFwdCm - on.walk!.wristFwdCm), `walk wrist range @${hz}`).toBeLessThanOrEqual(0.5);
      for (const k of ['walk', 'aimSide']) {
        expect(Math.abs(r[k]!.pelvisYaw - on[k]!.pelvisYaw), `${k} pelvis @${hz}`).toBeLessThanOrEqual(0.3);
        expect(Math.abs(r[k]!.shoulderYaw - on[k]!.shoulderYaw), `${k} shoulders @${hz}`).toBeLessThanOrEqual(0.3);
      }
      // the walk's sway is the layer's (the side glide's lateral is its own eased hip shift, GLIDE_HIP)
      expect(Math.abs(r.walk!.lateralCm - on.walk!.lateralCm), `walk lateral @${hz}`).toBeLessThanOrEqual(0.3);
    }
  }, 600000);
});

/**
 * (CHECK-4 should-fix 2) Anim Studio: the loop player shows Michael's keys as keyed. The studio Wren stands (stride
 * 'facing', the gate open) while the drive plays, so the layer's bands read the walk's and its 6 m/s cap filtered the
 * playing loops (keyed:run 7.7 cm off its keys on 24 / 240 frames, hold_knife 27.5 cm, hold_choke 2.0 cm). No cap while a
 * drive is set: cap on equals the cap-off rig (KEY_MOTION at its identity) on every frame.
 */
describe('body motion: the studio loop player is never capped', () => {
  it('keyed:run, hold_knife and hold_choke: cap on = cap off on every frame (0.0 cm)', async () => {
    const ids = ['keyed:run', 'keyed:hold_knife', 'keyed:hold_choke'];
    const on = await measureStudioArms(ids);
    const off = await withKeyMotionOff(() => measureStudioArms(ids));
    for (const id of ids) {
      // the gate is open (the cap would apply without the drive's override) and the drive lifts it
      expect(on[id]!.gated, `${id} gated frames`).toBeGreaterThan(0);
      expect(on[id]!.armSpeedMax, `${id} arm speed cap`).toBe(Infinity);
      expect(on[id]!.pts.length, `${id} frames`).toBe(off[id]!.pts.length);
      let worst = 0;
      for (let k = 0; k < on[id]!.pts.length; k += 3) {
        const a = on[id]!.pts;
        const b = off[id]!.pts;
        worst = Math.max(worst, Math.sqrt((a[k]! - b[k]!) ** 2 + (a[k + 1]! - b[k + 1]!) ** 2 + (a[k + 2]! - b[k + 2]!) ** 2));
      }
      expect(worst * 100, `${id} elbow / wrist cm off the cap-off rig`).toBe(0);
    }
  }, 600000);
});
