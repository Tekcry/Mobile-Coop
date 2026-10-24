/**
 * (rig-pose-fix S6, audit G10) The dog's head hit volume from the sim (`src/ai/dogHead.ts`): the pure model, its
 * parity with the dog model's scene graph on a NullEngine (the head pivot the hit volume used to read), and the wiring
 * (the host steps it in the fixed step; nothing reads the model's head back).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DOG_BITE_REACH,
  DOG_BODY_Y,
  DOG_HEAD_LIFT,
  DOG_HEAD_UP,
  DOG_HEAD_Z,
  DOG_MEAN_PHASE,
  DOG_PHASE_WRAP,
  dogGaitRate,
  dogGaitStep,
  dogHead,
  dogPhaseBack,
  dogPose,
  type DogPose,
} from '../src/ai/dogHead';

const out = { x: 0, y: 0, z: 0 };
const pose: DogPose = { bodyY: 0, swing: 0, headPitch: 0, headZ: 0, tail: 0 };
/** The dog's run speed (enemies.json `dog.runSpeed`) and walk speed. */
const RUN = 6;
const WALK = 1.1;

describe('dogHead: pure', () => {
  it('standing still, facing +z: the head pivot (body height + pivot up, pivot forward) and the lift above it', () => {
    const r = dogHead({ x: 1, y: 2, z: 3 }, 0, 0, 0, 0, 0, out);
    expect(r).toBe(out);
    expect(out.x).toBeCloseTo(1, 9);
    expect(out.y).toBeCloseTo(2 + DOG_BODY_Y + DOG_HEAD_UP + DOG_HEAD_LIFT, 9);
    expect(out.y).toBeCloseTo(2.8, 9);
    expect(out.z).toBeCloseTo(3 + DOG_HEAD_Z, 9);
  });

  it('turns with the yaw (Babylon rotation.y: forward = (sin, 0, cos)) and the bite reaches forward', () => {
    dogHead({ x: 0, y: 0, z: 0 }, Math.PI / 2, 0, 0, 0, 1, out);
    expect(out.x).toBeCloseTo(DOG_HEAD_Z + DOG_BITE_REACH, 9);
    expect(out.z).toBeCloseTo(0, 9);
    dogHead({ x: 0, y: 0, z: 0 }, Math.PI, 0, 0, 0, 0.5, out);
    expect(out.z).toBeCloseTo(-(DOG_HEAD_Z + DOG_BITE_REACH * 0.5), 9);
  });

  it('alert pitches the skull about the pivot only: the centre does not move (as the old volume)', () => {
    dogHead({ x: 0, y: 0, z: 0 }, 0.3, WALK, 1.2, 0, 0, out);
    const a = { ...out };
    dogHead({ x: 0, y: 0, z: 0 }, 0.3, WALK, 1.2, 1, 0, out);
    expect(out).toEqual(a);
  });

  it('the trot bob is at most 3 cm (4 % of the 0.75 rad swing cap) and the mean phase is within 1.9 cm of any phase', () => {
    dogHead({ x: 0, y: 0, z: 0 }, 0, RUN, DOG_MEAN_PHASE, 0, 0, out);
    const mean = out.y;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i <= 400; i++) {
      dogHead({ x: 0, y: 0, z: 0 }, 0, RUN, (i / 400) * DOG_PHASE_WRAP, 0, 0, out);
      lo = Math.min(lo, out.y);
      hi = Math.max(hi, out.y);
      expect(Math.abs(out.y - mean)).toBeLessThanOrEqual(0.0192);
    }
    expect(hi - lo).toBeCloseTo(0.03, 4);
  });

  it('the gait clock: still below 5 cm/s, the model\'s stride rate, a seamless wrap, and dogPhaseBack undoes a step', () => {
    expect(dogGaitRate(0.04)).toBe(0);
    expect(dogGaitRate(2)).toBeCloseTo(2.7, 9);
    expect(dogGaitStep(1, 0, 1)).toBe(1);
    let p = 0;
    for (let i = 0; i < 6000; i++) p = dogGaitStep(p, RUN, 1 / 60);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThan(DOG_PHASE_WRAP);
    // every pose term is continuous across the wrap
    const q = 0.7;
    dogPose(RUN, q, 1, 0.3, pose);
    const a = { ...pose };
    dogPose(RUN, q + DOG_PHASE_WRAP, 1, 0.3, pose);
    for (const k of ['bodyY', 'swing', 'headPitch', 'headZ', 'tail'] as const) expect(pose[k]).toBeCloseTo(a[k], 9);
    const s = dogGaitStep(2, WALK, 0.01);
    expect(dogPhaseBack(s, WALK, 0.01)).toBeCloseTo(2, 9);
  });
});

describe('dogHead: parity with the dog model (NullEngine scene graph)', () => {
  it('the scene graph head pivot + lift equals dogHead within 1 mm over sampled states; the model draws from dogHead', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { DogModel } = await import('../src/ai/dogModel');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const dog = new DogModel(scene, lib, '#7a5a3a', '#2a1e14');
    const nodes = dog.root.getChildTransformNodes(false);
    const body = nodes.find((n) => n.name === 'dog-body')!;
    const pivot = nodes.find((n) => n.name === 'dog-head')!;
    expect(body).toBeTruthy();
    expect(pivot).toBeTruthy();
    let worst = 0;
    let n = 0;
    for (const speed of [0, 0.5, WALK, 3, RUN])
      for (const phase of [0, 0.4, 1.3, 2.9, 4.4, 7.1, 11.8])
        for (const alert of [0, 1])
          for (const bite of [0, 0.4, 1])
            for (const yaw of [0, 1.1, -2.4]) {
              const x = 3.5 - yaw;
              const y = 0.25 * alert;
              const z = -7 + speed;
              dog.update(1 / 60, x, y, z, yaw, speed, alert, bite, phase);
              dog.root.computeWorldMatrix(true);
              body.computeWorldMatrix(true);
              pivot.computeWorldMatrix(true);
              const p = pivot.getAbsolutePosition();
              dogHead({ x, y, z }, yaw, speed, phase, alert, bite, out);
              const e = Math.max(Math.abs(p.x - out.x), Math.abs(p.y + DOG_HEAD_LIFT - out.y), Math.abs(p.z - out.z));
              worst = Math.max(worst, e);
              // the drawn head (presentation) is the same function at the drawn root
              expect(Math.abs(dog.head.x - out.x) + Math.abs(dog.head.y - out.y) + Math.abs(dog.head.z - out.z)).toBeLessThan(1e-9);
              n++;
            }
    expect(n).toBe(630);
    expect(worst).toBeLessThan(0.001);
    dog.dispose();
    scene.dispose();
  });
});

describe('dogHead: wiring', () => {
  const enemy = readFileSync('src/ai/enemy.ts', 'utf8');
  const model = readFileSync('src/ai/dogModel.ts', 'utf8');
  it('the host steps the dog head in the fixed step (syncHitboxes) and never copies the model head', () => {
    const sync = enemy.slice(enemy.indexOf('private syncHitboxes('), enemy.indexOf('private aimWeight('));
    expect(sync).toContain('dogGaitStep(this.dogPhase');
    expect(sync).toContain('dogHead(this.pos, this.yaw');
    expect(enemy).not.toMatch(/this\.dog\.head/);
  });
  it('the dog model reads nothing back from the scene graph for its head', () => {
    expect(model).not.toContain('getAbsolutePosition');
    expect(model).not.toContain('computeWorldMatrix');
    expect(model).toContain('dogHead(');
  });
});
