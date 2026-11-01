/**
 * (mocap-trial-2, crouch; docs/mocap-trial/BRIEF.md A5, MT2-CROUCH.md) The CMU crouch walk (136_09, R-strike cycle
 * 4.23-5.51 s) behind the "Mocap locomotion" switch: with it on, the crouched sneak band poses Wren's body from the
 * capture (pelvis, trunk, arms, head; as captured, M1) over the planner's feet (the hand-keyed sneak's duty, lift, track
 * and knee pole), cross-faded into the hand-keyed crouch walk / run as the hand-keyed set blends. Switch off nothing
 * changes (the identity fixtures, tests/animSkeletonIdentity*.test.ts and mocapSwitch's proofs).
 *
 * Asserts encode pops and slides (BRIEF M1: the old procedural limits are notes): a crouched sneak at 0.5-0.9 m/s steady,
 * starting and stopping, and turning at 1-3 rad/s keeps its planted feet (e2e-anim's slide measure, `plantSlide`, 2 cm),
 * moves the pelvis at most 2 cm a frame beyond the pace (bible 5.12.2), and has no bone step over 25 deg a frame that the
 * switch-off rig does not also have (to within 1 deg). The capture's crouch drop and trunk are checked as "it plays".
 */
import { afterEach, describe, expect, it } from 'vitest';
import { setMixamo } from '../src/anim/mixamo';
import { HAND_KEYED_SET, LOCO, MOCAP_SET, setMocapLocomotion, type LocoClipSet } from '../src/anim/mocap';
import { MOCAP_CROUCH_WALK } from '../src/anim/clips/mocap/crouch_walk';
import { KEYED_SNEAK } from '../src/anim/clips/keyed/sneak';
import { AnimGraph, defaultInput } from '../src/anim/animGraph';
import { proportions } from '../src/player/proportions';
import { driveRig, plantSlide, pops, POP_DEG, type Plan, type Rec } from './helpers/mocapMeasure';
import { bytesPerCall, HEAP_NUMBER, inputs } from './helpers/allocPerCall';
import { crouchScenarios, measureAll, rampDelta, type Measures } from './helpers/afpMeasure';
import { GEARS } from '../src/config/movement';

// (one-game) the Mixamo captures are on at load by default now; this file pins the hand-made state: `?mixamo=0`
setMixamo(false);

const SET = MOCAP_SET as { -readonly [K in keyof LocoClipSet]: LocoClipSet[K] };
afterEach(() => {
  SET.crouchWalk = MOCAP_CROUCH_WALK;
  setMocapLocomotion(false);
});

const DEG = 180 / Math.PI;

/** The pelvis's largest move in one frame beyond the pace x dt (m), as FIX-1 / CHECK-2 read it. */
function pelvisRule(R: Rec): number {
  const h = R.pos.hips;
  let worst = 0;
  for (let f = 1; f < R.n; f++) {
    const d = Math.hypot(h[f * 3]! - h[(f - 1) * 3]!, h[f * 3 + 1]! - h[(f - 1) * 3 + 1]!, h[f * 3 + 2]! - h[(f - 1) * 3 + 2]!);
    worst = Math.max(worst, d - R.speed[f]! / 60);
  }
  return worst;
}

/** Mean hip joint height (m) and the mean trunk pitch (hips -> neck off vertical, deg). */
function carriage(R: Rec): { hipY: number; trunk: number } {
  let y = 0;
  let a = 0;
  for (let f = 0; f < R.n; f++) {
    const k = f * 3;
    y += R.pos.hips[k + 1]!;
    const dx = R.pos.neck[k]! - R.pos.hips[k]!;
    const dy = R.pos.neck[k + 1]! - R.pos.hips[k + 1]!;
    const dz = R.pos.neck[k + 2]! - R.pos.hips[k + 2]!;
    a += Math.atan2(Math.hypot(dx, dz), dy) * DEG;
  }
  return { hipY: y / R.n, trunk: a / R.n };
}

interface Run {
  slide: number;
  rule: number;
  step: number;
  bone: string;
  hipY: number;
  trunk: number;
}

async function measure(on: boolean, steps: number, plan: Plan): Promise<Run> {
  setMocapLocomotion(on);
  const R = await driveRig(steps, plan);
  const p = pops(R);
  return { slide: plantSlide(R, 0.02), rule: pelvisRule(R), step: p.maxStepDeg, bone: p.bone, ...carriage(R) };
}

/** OFF and ON over the same plan; ON's pops, slides and pelvis against the limits and OFF. */
async function both(label: string, steps: number, plan: Plan, slideMax = 0.02): Promise<{ off: Run; on: Run }> {
  const off = await measure(false, steps, plan);
  const on = await measure(true, steps, plan);
  const msg = `${label}: ON slide ${(on.slide * 100).toFixed(2)} cm, pelvis ${(on.rule * 100).toFixed(2)} cm, step ${on.step.toFixed(1)} ${on.bone} (OFF ${off.step.toFixed(1)} ${off.bone}, slide ${(off.slide * 100).toFixed(2)})`;
  expect(on.slide, msg).toBeLessThanOrEqual(slideMax);
  expect(on.rule, msg).toBeLessThanOrEqual(0.02);
  expect(on.step, msg).toBeLessThanOrEqual(Math.max(POP_DEG, off.step + 1));
  return { off, on };
}

describe('mocap crouch: the clip and the set', () => {
  it('the mocap set carries the 136_09 crouch walk in place of the sneak; the hand-keyed set none', () => {
    expect(HAND_KEYED_SET.crouchWalk).toBeNull();
    expect(MOCAP_SET.crouchWalk).toBe(MOCAP_CROUCH_WALK);
    const c = MOCAP_CROUCH_WALK;
    expect(c.name).toBe('mocap_crouch_walk');
    expect(c.frames).toBe(48);
    expect(c.feet).not.toBeNull();
    expect(c.stride).toBeGreaterThan(1);
    // crouched as captured: the pelvis about 20 cm under Wren's rest (the hand-keyed sneak's keys 30 cm), trunk bent over
    expect(c.meanPel[1]!).toBeLessThan(-0.15);
    expect(c.meanPel[1]!).toBeGreaterThan(KEYED_SNEAK.meanPel[1]!);
    setMocapLocomotion(true);
    expect(LOCO.set.crouchWalk).toBe(MOCAP_CROUCH_WALK);
    setMocapLocomotion(false);
    expect(LOCO.set.crouchWalk).toBeNull();
  });
});

describe('mocap crouch: the crouched sneak on the rig (switch ON against OFF)', () => {
  it('steady 0.5 / 0.8 / 0.9 m/s: no slide, no pop, and the capture poses the body', async () => {
    for (const v of [0.5, 0.8, 0.9]) {
      const { off, on } = await both(`steady ${v}`, 60 * 5, (_k, t) => ({ speed: v, yawRate: 0, rec: t > 2, crouch: 1 }));
      expect(on.step).toBeLessThanOrEqual(POP_DEG);
      // (afp AF3) the capture carried as the crouch walk (MOCAP_CROUCH_POSE): trunk 30-38 deg (was 43 as captured) and the
      // hips no longer 8+ cm over the hand-keyed sneak (11 cm before; the gears 1-3 height bar is in the AF3 block below)
      expect(on.trunk).toBeGreaterThanOrEqual(30);
      expect(on.trunk).toBeLessThanOrEqual(38);
      expect(on.hipY - off.hipY, `v ${v} on ${on.hipY.toFixed(3)} off ${off.hipY.toFixed(3)}`).toBeLessThan(0.08);
      expect(off.trunk).toBeLessThan(30);
    }
  }, 120_000);

  it('starts and stops (stand 0.8 / 1.5 s, sneak 0.5 / 0.8 / 0.9 m/s)', async () => {
    for (const v of [0.5, 0.8, 0.9]) {
      for (const stand of [0.8, 1.5]) {
        const cyc = stand + 2.5;
        await both(`start / stop stand ${stand} v ${v}`, 60 * 16, (_k, t) => ({ speed: t % cyc < stand ? 0 : v, yawRate: 0, rec: t > 1, crouch: 1 }));
      }
    }
  }, 240_000);

  it('turns at 1 / 1.5 / 2 / 3 rad/s (two turn-start offsets), sneak 0.5 / 0.8 / 0.9 m/s', async () => {
    for (const v of [0.5, 0.8, 0.9]) {
      for (const yr of [1, 1.5, 2, 3]) {
        for (const off of [0, 0.37]) {
          const plan: Plan = (_k, t) => {
            const u = t - off;
            const turning = t > 2 + off && ((u % 2.5) + 2.5) % 2.5 < 1.2;
            return { speed: v, yawRate: turning ? ((((u % 5) + 5) % 5 < 2.5 ? yr : -yr)) : 0, rec: t > 1.5, crouch: 1 };
          };
          // (open, MT2-CROUCH.md) 0.5 m/s x 3 rad/s, a 17 cm turning circle: a landing foot's yaw settles about its heel
          // in two frames (the planner, OFF 2.2 cm too); ON within 1 cm of OFF there, 2 cm everywhere else
          const near = v === 0.5 && yr === 3;
          const r = await both(`turn ${v} x ${yr} offset ${off}`, 60 * 12, plan, near ? 0.04 : 0.02);
          if (near) expect(r.on.slide).toBeLessThanOrEqual(r.off.slide + 0.01);
        }
      }
    }
  }, 600_000);

  it('into the hand-keyed crouch walk and run (pace ramps over 0.3 s): no slide, no pop beyond OFF', async () => {
    for (const [a, b] of [[0.5, 1.3], [0.8, 1.8], [0.8, 2.6]] as const) {
      await both(`pace ${a} <-> ${b}`, 60 * 14, (_k, t) => {
        const u = t % 4;
        const r = Math.min(1, u < 2 ? u / 0.3 : (u - 2) / 0.3);
        return { speed: u < 2 ? b + (a - b) * r : a + (b - a) * r, yawRate: 0, rec: t > 1.5, crouch: 1 };
      });
    }
  }, 240_000);
});

describe('(afp AF3) the balanced crouch: one carriage across gears 1-3 (AF0 harness, CT-driven, mocap on)', () => {
  it('trunk 30-38 deg, hips within 5 cm, CoM within 5 cm of the feet, sway <= 5 cm, step 0.40-0.50 m, idle unchanged', async () => {
    const out: string[] = [];
    const rows: Record<string, Measures> = {};
    for (const s of crouchScenarios()) {
      const run = await s.run();
      const m = await measureAll(run, s.sg);
      rows[s.name] = m;
      let x = '';
      if (s.name === 'crouch-ramp-1to3') {
        const r = rampDelta(run.R);
        x = `, ramp trunk ${r.trunk.toFixed(1)} deg hips ${(r.hipY * 100).toFixed(1)} cm`;
        // the gear 1 -> 3 ramp keeps its shape (was -15 deg, -6.9 cm)
        expect(Math.abs(r.trunk), s.name).toBeLessThanOrEqual(6);
        expect(Math.abs(r.hipY), s.name).toBeLessThanOrEqual(0.05);
      }
      out.push(`${s.name}: trunk ${m.trunkMean_deg.toFixed(1)} hips ${m.hipY_cm.toFixed(1)} CoM ${m.comDouble_cm.toFixed(1)} sway ${m.pelLatP2P_cm.toFixed(1)} step ${m.stepLen_cm.toFixed(1)} slide ${m.slide_cm.toFixed(2)}${x}`);
    }
    console.info(out.join('\n'));
    // the crouched idle unchanged (AF0 before 28.4 deg on this measure)
    expect(Math.abs(rows['crouch-idle']!.trunkMean_deg - 28.4)).toBeLessThanOrEqual(2);
    const gears = GEARS.crouch.slice(0, 3).map((v, g) => rows[`crouch-gear${g + 1}-${v}`]!);
    for (const [g, m] of gears.entries()) {
      const msg = `gear ${g + 1}: ${out[g + 1]}`;
      expect(m.trunkMean_deg, msg).toBeGreaterThanOrEqual(30);
      expect(m.trunkMean_deg, msg).toBeLessThanOrEqual(38);
      expect(Math.abs(m.comDouble_cm), msg).toBeLessThanOrEqual(5);
      expect(m.pelLatP2P_cm, msg).toBeLessThanOrEqual(5);
      expect(m.slide_cm, msg).toBeLessThanOrEqual(1);
      // step 0.40-0.50 m at 1.3-1.7 m/s (gears 2-3)
      if (g > 0) {
        expect(m.stepLen_cm, msg).toBeGreaterThanOrEqual(40);
        expect(m.stepLen_cm, msg).toBeLessThanOrEqual(50);
      }
    }
    const hy = gears.map((m) => m.hipY_cm);
    expect(Math.max(...hy) - Math.min(...hy), out.join('; ')).toBeLessThanOrEqual(5);
    const tr = gears.map((m) => m.trunkMean_deg);
    expect(Math.max(...tr) - Math.min(...tr), out.join('; ')).toBeLessThanOrEqual(6);
  }, 600_000);
});

describe('mocap crouch: no allocation per frame', () => {
  it('the crouched graph with the switch on: the capture leaves no object a frame over the hand-keyed sneak in its place', async () => {
    const g = new AnimGraph(proportions('average', 1.68));
    const i = defaultInput();
    i.keyedOk = true;
    i.ready = true;
    i.armed = false;
    i.crouch = 1;
    const N = 2000;
    const SPD = inputs(N, (k) => 0.9 * (0.5 + 0.5 * Math.sin(k * 0.004)));
    const YR = inputs(N, (k) => (k % 400 < 40 ? 2 : 0));
    const run = (n: number): void => {
      for (let k = 0; k < n; k++) {
        i.speed = SPD[k]!;
        i.localZ = 1;
        i.yawRate = YR[k]!;
        g.update(1 / 120, i);
      }
    };
    // the switch on with the sneak in the capture's place (the mocap set as before this clip) and with the capture,
    // alternated twice, the fewest of each (one reading after the other can carry the JIT's state from the rig tests)
    let sneak = Infinity;
    let on = Infinity;
    for (let r = 0; r < 2; r++) {
      SET.crouchWalk = null;
      setMocapLocomotion(true);
      sneak = Math.min(sneak, await bytesPerCall(run, 2 * HEAP_NUMBER));
      SET.crouchWalk = MOCAP_CROUCH_WALK;
      setMocapLocomotion(true);
      on = Math.min(on, await bytesPerCall(run, sneak + HEAP_NUMBER));
    }
    console.info(`crouched bytes per frame, switch on: the sneak ${sneak.toFixed(1)}, the capture ${on.toFixed(1)}`);
    expect(g.out.keyW).toBeGreaterThan(0);
    // no object a frame (48 B or more each): at most the boxed doubles the mocap share's layer path leaves (the capture
    // sampled with the set's layer scales, MOCAP_LAYERS on N2's body motion: the standing mocap gait pays the same, as
    // mocapSwitch's 'filled' budget); a fresh process reads the two equal (1787 B a frame each)
    expect(on).toBeLessThanOrEqual(sneak + 8 * HEAP_NUMBER);
  }, 240_000);
});
