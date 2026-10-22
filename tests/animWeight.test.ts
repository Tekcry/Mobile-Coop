import { afterEach, describe, expect, it } from 'vitest';
import { MotionDriver, emptyMotionInput } from '../src/anim/motion';
import { TUNE_SECTIONS, tuneResetGroup, tuneSet } from '../src/anim/tuneRegistry';
import {
  loadPulse,
  springStep,
  WEIGHT_CAM,
  WEIGHT_GROUPS,
  WEIGHT_MOVE,
  WEIGHT_POSE,
  WEIGHT_TUNABLES,
  weightApplyPose,
  weightFrameIn,
  weightGroupFor,
  WeightLayers,
  weightMoveLoad,
  weightPoseClear,
  type WeightValues,
} from '../src/anim/weight';
import { WEIGHT_SECTION, weightSim, weightSimEnd } from '../src/player/weightTune';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

const T0 = 1_000_000;

function identity(): WeightValues {
  const o = {} as Record<string, number>;
  for (const t of WEIGHT_TUNABLES) o[t.id] = t.def;
  return o as WeightValues;
}

/** A varied frame sequence: a start, a run with turns, plants, a landing, a vault start, a stop. */
function drive(L: WeightLayers, v: WeightValues, frames: number, onFrame?: (k: number) => void): void {
  const i = weightFrameIn();
  let x = 0;
  let z = 0;
  let yaw = 0;
  let sp = 0;
  for (let k = 0; k < frames; k++) {
    const dt = 1 / 60;
    const want = k < 20 ? 0 : k < 200 ? 5 : 0;
    const a = (want - sp) * 6;
    sp += a * dt;
    const yr = k > 60 && k < 120 ? 3 : 0;
    yaw += yr * dt;
    x += Math.sin(yaw) * sp * dt;
    z += Math.cos(yaw) * sp * dt;
    i.dt = dt;
    i.x = x;
    i.y = k === 150 ? 0.2 : 0;
    i.z = z;
    i.yaw = yaw;
    i.speed = sp;
    i.accelFwd = a;
    i.yawRate = yr;
    i.grounded = true;
    i.plant = k % 18 === 0;
    i.landings = k > 151 ? 1 : 0;
    i.fall = 1.5;
    i.start = k === 21;
    i.jump = k === 170;
    i.teleports = 0;
    L.step(i, v);
    onFrame?.(k);
  }
}

afterEach(() => {
  weightPoseClear();
  weightMoveLoad(null);
  for (const g of WEIGHT_GROUPS) tuneResetGroup(g, T0);
});

describe('Weight section (anim-weight)', () => {
  it('registers after Speed with the five groups and every slider at identity (mul 1 / add 0)', () => {
    const ids = TUNE_SECTIONS.map((s) => s.id);
    expect(ids.indexOf('weight')).toBeGreaterThan(ids.indexOf('speed'));
    expect(WEIGHT_SECTION.groups).toEqual(['weight.walk', 'weight.jog', 'weight.run', 'weight.crouch', 'weight.drawn']);
    for (const t of WEIGHT_SECTION.tunables) {
      expect(t.def).toBe(t.kind === 'mul' ? 1 : 0);
      expect(t.def).toBeGreaterThanOrEqual(t.min);
      expect(t.def).toBeLessThanOrEqual(t.max);
      expect(t.groups.length).toBe(5);
    }
    expect(WEIGHT_SECTION.select?.({ weight: 'weight.run' })).toBe('weight.run');
  });

  it('picks the group: crouched, then drawn, then the holstered gait by speed', () => {
    expect(weightGroupFor(true, true, 5)).toBe('weight.crouch');
    expect(weightGroupFor(false, true, 5)).toBe('weight.drawn');
    expect(weightGroupFor(false, false, 0)).toBe('weight.walk');
    expect(weightGroupFor(false, false, 3)).toBe('weight.jog');
    expect(weightGroupFor(false, false, 5)).toBe('weight.run');
  });

  it('at identity every layer writes exactly 0 (pose off, camera signal 0) through starts, turns, plants, a landing and a vault', () => {
    const L = new WeightLayers();
    const v = identity();
    drive(L, v, 300, () => {
      expect(WEIGHT_POSE.on).toBe(false);
      for (const k of ['pelY', 'spPitch', 'spRoll', 'hdPitch', 'hdRoll', 'armX', 'armY', 'armZ', 'gearX', 'gearY', 'gearZ'] as const) expect(Object.is(WEIGHT_POSE[k], 0)).toBe(true);
      expect(WEIGHT_CAM.lagX === 0 && WEIGHT_CAM.lagY === 0 && WEIGHT_CAM.lagZ === 0 && WEIGHT_CAM.dip === 0).toBe(true);
    });
  });

  it('off identity each layer moves the pose: lean, bank, plant / landing load, the springs, anticipation, the camera signal', () => {
    const L = new WeightLayers();
    const v = identity();
    v.accelLean = 1;
    v.bank = 1;
    v.plantDrop = 0.02;
    v.landDepth = 0.05;
    v.chestLag = 5;
    v.headLag = 5;
    v.armLag = 0.03;
    v.gearLag = 0.03;
    v.antStart = 0.03;
    v.antJump = 0.05;
    v.camLag = 0.2;
    v.camDip = 1;
    let pitch = 0;
    let roll = 0;
    let drop = 0;
    let arm = 0;
    let gear = 0;
    let cam = 0;
    let dip = 0;
    drive(L, v, 300, () => {
      pitch = Math.max(pitch, Math.abs(WEIGHT_POSE.spPitch));
      roll = Math.max(roll, Math.abs(WEIGHT_POSE.spRoll));
      drop = Math.min(drop, WEIGHT_POSE.pelY);
      arm = Math.max(arm, Math.abs(WEIGHT_POSE.armZ));
      gear = Math.max(gear, Math.abs(WEIGHT_POSE.gearZ));
      cam = Math.max(cam, Math.hypot(WEIGHT_CAM.lagX, WEIGHT_CAM.lagZ));
      dip = Math.max(dip, WEIGHT_CAM.dip);
    });
    expect(pitch).toBeGreaterThan(0.05);
    expect(roll).toBeGreaterThan(0.05);
    expect(drop).toBeLessThan(-0.015);
    expect(arm).toBeGreaterThan(0.005);
    expect(gear).toBeGreaterThan(0.005);
    expect(cam).toBeGreaterThan(0.1);
    expect(dip).toBeGreaterThan(0.01);
  });

  it('a spring settles: critically damped without overshoot, under-damped overshoots then settles, over-damped creeps in', () => {
    for (const [zeta, overshoots] of [
      [1, false],
      [0.3, true],
      [2, false],
    ] as const) {
      const s = { x: 1, v: 0 };
      let minX = 1;
      for (let k = 0; k < 600; k++) {
        springStep(s, 0, 2 * Math.PI * 2, zeta, 1 / 60);
        minX = Math.min(minX, s.x);
      }
      expect(Math.abs(s.x)).toBeLessThan(1e-3);
      expect(Math.abs(s.v)).toBeLessThan(1e-2);
      expect(minX < -0.01).toBe(overshoots);
    }
    // the pulse shape: 0 -> 1 -> 0
    expect(loadPulse(0)).toBe(0);
    expect(loadPulse(0.25)).toBeCloseTo(1, 9);
    expect(loadPulse(1)).toBe(0);
  });

  it('the pose hook adds the offsets to the graph targets', () => {
    const o = { pelvis: { y: 1 }, spine: { pitch: 0.1, roll: 0 }, head: { pitch: 0, roll: 0 }, handL: { x: 0, y: 0, z: 0 }, handR: { x: 0, y: 0, z: 0 }, weapon: { x: 0, y: 0, z: 0 } };
    WEIGHT_POSE.pelY = -0.02;
    WEIGHT_POSE.spPitch = 0.05;
    WEIGHT_POSE.armZ = -0.01;
    weightApplyPose(o);
    expect(o.pelvis.y).toBeCloseTo(0.98, 12);
    expect(o.spine.pitch).toBeCloseTo(0.15, 12);
    expect(o.handL.z).toBeCloseTo(-0.01, 12);
    expect(o.weapon.z).toBeCloseTo(-0.01, 12);
  });

  it('the graph is untouched while the pose is off, and moves by the offsets while on', async () => {
    const { AnimGraph, defaultInput } = await import('../src/anim/animGraph');
    const { proportions } = await import('../src/player/proportions');
    const a = new AnimGraph(proportions());
    const b = new AnimGraph(proportions());
    const ia = defaultInput();
    const ib = defaultInput();
    ia.speed = ib.speed = 1.4;
    ia.localZ = ib.localZ = 1;
    for (let k = 0; k < 60; k++) {
      a.update(1 / 60, ia);
      b.update(1 / 60, ib);
    }
    expect(b.out.pelvis.y).toBe(a.out.pelvis.y);
    expect(b.out.spine.pitch).toBe(a.out.spine.pitch);
    WEIGHT_POSE.on = true;
    WEIGHT_POSE.pelY = -0.03;
    WEIGHT_POSE.spRoll = 0.1;
    a.update(1 / 60, ia);
    b.update(1 / 60, ib);
    weightPoseClear();
    // (a and b see the same global: compare against a third graph stepped with the pose off)
    const c = new AnimGraph(proportions());
    const ic = defaultInput();
    ic.speed = 1.4;
    ic.localZ = 1;
    for (let k = 0; k < 61; k++) c.update(1 / 60, ic);
    expect(b.out.pelvis.y - c.out.pelvis.y).toBeCloseTo(-0.03, 9);
    expect(b.out.spine.roll - c.out.spine.roll).toBeCloseTo(0.1, 9);
  });

  it('allocates nothing per step (the layers and the spring)', async () => {
    const L = new WeightLayers();
    const v = identity();
    v.chestLag = 5;
    v.armLag = 0.03;
    v.plantDrop = 0.02;
    v.bank = 1;
    const i = weightFrameIn();
    i.dt = 1 / 60;
    // a typed slot, not a captured let (+= on a captured number boxes 16 B an iteration); gc() + new space per step
    // (tests/helpers/allocPerCall.ts), not heapUsed (that read whatever a GC left in the window). A step leaves only
    // boxed doubles, the springs' and the load pulse's arguments (V8's sampling heap profiler: every allocation in it
    // is 16 B, heap-asserts 2026-10-22): about 100 B. One more { x, y, z } a step would read about 150 B.
    const X = inputs(2000, (k) => Math.sin(k * 0.01) * 3);
    const Z = inputs(2000, (k) => k * 0.05);
    const YAW = inputs(2000, (k) => k * 0.001);
    const ACC = inputs(2000, (k) => Math.sin(k * 0.1));
    sink[0] = 0;
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        i.x = X[k]!;
        i.z = Z[k]!;
        i.yaw = YAW[k]!;
        i.speed = 3;
        i.accelFwd = ACC[k]!;
        i.yawRate = 1;
        i.plant = (k & 15) === 0;
        L.step(i, v);
        sink[0]! += WEIGHT_POSE.spPitch;
      }
    }, 8 * HEAP_NUMBER);
    console.info(`bytes per WeightLayers.step: ${per.toFixed(1)}`);
    expect(Number.isFinite(sink[0]!)).toBe(true);
    expect(per).toBeLessThanOrEqual(8 * HEAP_NUMBER);
  });
});

describe('Weight momentum in the motion driver (gameplay, the local window only)', () => {
  function ctRun(steps: number, push: (k: number) => number, setup?: () => void): MotionDriver {
    const d = new MotionDriver(0);
    const i = emptyMotionInput();
    i.ct = true;
    i.faceTravel = true;
    for (let k = 0; k < steps; k++) {
      i.vz = push(k);
      setup?.();
      d.step(1 / 60, i);
      weightMoveLoad(null);
    }
    return d;
  }

  it('identity values give the driver bit for bit the same velocity, yaw and phase', () => {
    const v = identity();
    const trace = (load: boolean): number[] => {
      const d = new MotionDriver(0);
      const i = emptyMotionInput();
      i.ct = true;
      i.faceTravel = true;
      const out: number[] = [];
      for (let k = 0; k < 240; k++) {
        i.vz = k < 100 ? 4.5 : 0;
        i.vx = k > 40 && k < 80 ? 3 : 0;
        if (load) weightMoveLoad(v);
        d.step(1 / 60, i);
        weightMoveLoad(null);
        out.push(d.vx, d.vz, d.yaw, d.phase, d.ctStopDistance());
      }
      return out;
    };
    expect(trace(true)).toEqual(trace(false));
  });

  it('a slower start (time to speed x2) is slower; a stop settle overshoots back and comes to rest', () => {
    const fast = ctRun(20, () => 4);
    const slow = ctRun(20, () => 4, () => {
      WEIGHT_MOVE.startMul = 2;
    });
    expect(slow.speed).toBeLessThan(fast.speed * 0.8);
    // run, release, stop with a settle: the pace goes back past 0 (vz < 0) and ends at rest
    let minVz = 0;
    const d = new MotionDriver(0);
    const i = emptyMotionInput();
    i.ct = true;
    i.faceTravel = true;
    for (let k = 0; k < 300; k++) {
      i.vz = k < 120 ? 4 : 0;
      WEIGHT_MOVE.stopSettle = 0.5;
      d.step(1 / 60, i);
      weightMoveLoad(null);
      if (k >= 120) minVz = Math.min(minVz, d.vz);
    }
    expect(minVz).toBeLessThan(-0.05);
    expect(d.speed).toBe(0);
  });

  it('weightSim loads the group from the section (and the bypass / end read identity)', () => {
    tuneSet('weight.run', 'startMul', 1.5, T0);
    weightSim(false, false, 5);
    expect(WEIGHT_MOVE.startMul).toBe(1.5);
    weightSim(false, false, 1);
    expect(WEIGHT_MOVE.startMul).toBe(1);
    weightSimEnd();
    expect(WEIGHT_MOVE.startMul).toBe(1);
  });
});
