// (anim-rework S4) The crouched keyed set (S4-KEYS.md, BRIEF 3 "Stealth"): sneak -> crouch walk -> crouch run as one
// continuous blend, the crouched idle (the keyed squat, hands on the knees) instead of the kneel when holstered, the
// clips' depth replacing the procedural crouch, the crouched glide's short side-step and the re-step on a stance change.
import { describe, expect, it } from 'vitest';
import { AnimGraph, defaultInput, KEYED_CROUCH, KEYED_CROUCH_LEG } from '../src/anim/animGraph';
import { CROUCH_BAND, FootPlanner, PLANNER, RESTEP, emptyPlannerInput } from '../src/anim/footPlanner';
import { GLIDE_STEP, stepLength } from '../src/anim/motion';
import { KEYED_CROUCH_IDLE } from '../src/anim/clips/keyed/crouch_idle';
import { MOVEMENT } from '../src/config/movement';
import { proportions } from '../src/player/proportions';

const crouched = (set: (i: ReturnType<typeof defaultInput>) => void, n = 90) => {
  const g = new AnimGraph(proportions());
  const i = defaultInput();
  i.localZ = 1;
  i.keyedOk = true;
  i.ready = true;
  i.armed = false;
  i.crouch = 1;
  set(i);
  for (let k = 0; k < n; k++) g.update(1 / 60, i);
  return { g, i };
};

describe('the crouched keyed set', () => {
  it('plays crouched at every pace and still, holstered (keyed arms) and drawn (the procedural gun arms)', () => {
    for (const v of [0, 0.85, 1.3, 1.7, 2.15, 2.6]) {
      const { g } = crouched((i) => (i.speed = v));
      expect(g.out.keyW, `${v} m/s`).toBeGreaterThan(0.95);
      expect(g.out.keyArmW, `${v} m/s arms`).toBeGreaterThan(0.95);
      expect(g.out.keyHol, `${v} m/s holstered`).toBeGreaterThan(0.95);
    }
    const d = crouched((i) => ((i.ready = false), (i.armed = true), (i.keyedDrawn = true), (i.speed = 1.3)));
    expect(d.g.out.keyW).toBeGreaterThan(0.95);
    expect(d.g.out.keyDrawn).toBeGreaterThan(0.95);
    expect(d.g.out.keyArmW).toBe(0);
  });
  it('one continuous blend: no pop in the keyed pose from a creep to the crouch run', () => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    i.localZ = 1;
    i.keyedOk = true;
    i.ready = true;
    i.crouch = 1;
    i.phase = 0.25;
    for (let n = 0; n < 60; n++) g.update(1 / 60, ((i.speed = 0.5), i));
    let worst = 0;
    let prevA: Float64Array | null = null;
    let prevY = 0;
    for (let n = 0; n <= 180; n++) {
      i.speed = 0.5 + (2.1 * n) / 180;
      g.update(1 / 60, i);
      const a = g.out.keyed.arm;
      if (prevA) {
        for (let c = 0; c < 12; c++) worst = Math.max(worst, Math.abs(a[c]! - prevA[c]!));
        worst = Math.max(worst, Math.abs(g.out.keyed.pel[1]! - prevY));
      }
      prevA = Float64Array.from(a);
      prevY = g.out.keyed.pel[1]!;
    }
    expect(worst).toBeLessThan(0.02);
  });
  it('the clips own the crouch depth (it replaces the procedural drop) and the planner takes their leg values', () => {
    const { g } = crouched((i) => (i.speed = 1.7));
    // the rig adds the keyed height to the pose's: their sum is the clip's depth (the crouch walk ~24 cm plus the game's drop)
    const k = proportions().height / 1.75;
    const total = g.out.pelvis.y / k + g.out.keyed.pel[1]!;
    expect(total).toBeLessThan(-0.2);
    expect(total).toBeGreaterThan(-0.34);
    expect(g.out.gait.duty).toBeCloseTo(KEYED_CROUCH_LEG.walk.duty, 1);
    // the narrow crouched track (the feet near the line under the hips)
    expect(g.out.stance.rX / k).toBeLessThan(0.07);
  });
  it('holstered and still: the keyed squat (no kneel), its hands on the knees, its slow breathing and scan', () => {
    const { g } = crouched((i) => ((i.speed = 0), (i.kneel = true)), 120);
    expect(g.out.kneel).toBe(0);
    expect(g.out.kneeRest).toBeGreaterThan(0.95);
    expect(g.out.keyed.hasWrist).toBe(1);
    // the squat's stance: about hip width (KEYED_CROUCH.idleHalfK of the keyed 12.2 cm)
    const k = proportions().height / 1.75;
    expect(g.out.stance.rX / k).toBeCloseTo(KEYED_CROUCH_IDLE.half * KEYED_CROUCH.idleHalfK, 2);
    expect(KEYED_CROUCH.period).toBeGreaterThanOrEqual(10);
    // drawn (a gun in the hands) and still: the one-knee kneel as before, the keyed set fading out under it
    const d = crouched((i) => ((i.ready = false), (i.armed = true), (i.keyedDrawn = true), (i.speed = 0), (i.kneel = true)), 120);
    expect(d.g.out.kneel).toBeGreaterThan(0.95);
    expect(d.g.out.keyW).toBeLessThan(0.05);
  });
  it('a crouched stop settles into the squat without a jump in the hands or the hips', () => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    i.localZ = 1;
    i.keyedOk = true;
    i.ready = true;
    i.crouch = 1;
    for (let n = 0; n < 90; n++) g.update(1 / 60, ((i.speed = 1.3), i));
    let worst = 0;
    let prevA: Float64Array | null = null;
    let prevY = 0;
    for (let n = 0; n < 60; n++) {
      // a quick stop: the pace gone in 0.1 s
      i.speed = Math.max(0, 1.3 - n * 0.22);
      g.update(1 / 60, i);
      const a = g.out.keyed.arm;
      if (prevA) {
        for (let c = 0; c < 12; c++) worst = Math.max(worst, Math.abs(a[c]! - prevA[c]!));
        worst = Math.max(worst, Math.abs(g.out.keyed.pel[1]! - prevY));
      }
      prevA = Float64Array.from(a);
      prevY = g.out.keyed.pel[1]!;
    }
    expect(worst).toBeLessThan(0.03);
  });
  it('crouched aiming takes the glide short side-step', () => {
    expect(stepLength(0.5, MOVEMENT, 1, 0, 1, 0, 1)).toBeCloseTo(GLIDE_STEP.lat0 + GLIDE_STEP.latK * 0.5, 9);
  });
});

describe('the planner crouched', () => {
  it('a stance change re-steps the feet into the new stance (no crouched spacing left under a standing body)', () => {
    const p = new FootPlanner();
    const i = emptyPlannerInput();
    i.dt = 1 / 60;
    i.stride = 'facing';
    // crouched still with the feet 12 cm a side (a wide crouched stance)
    i.crouch = 1;
    i.lX = -0.12;
    i.rX = 0.12;
    i.lZ = i.rZ = 0;
    p.reset(i);
    for (let n = 0; n < 30; n++) p.update(i);
    // stand up: the standing stance 8 cm a side, 4 cm off each foot (inside PLANNER.idleErr, so no step without the re-step)
    i.crouch = 0;
    i.lX = -0.08;
    i.rX = 0.08;
    expect(0.04).toBeLessThan(PLANNER.idleErr);
    for (let n = 0; n < Math.round(RESTEP.window * 60); n++) p.update(i);
    expect(Math.abs(p.L.x - i.lX)).toBeLessThan(RESTEP.err + 0.005);
    expect(Math.abs(p.R.x - i.rX)).toBeLessThan(RESTEP.err + 0.005);
  });
  it('the crouched band is inside the crouched track', () => {
    expect(CROUCH_BAND.max).toBeLessThanOrEqual(0.1);
    expect(CROUCH_BAND.min).toBeGreaterThan(0.02);
  });
});
