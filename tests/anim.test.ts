import { describe, expect, it } from 'vitest';
import { curve, evalCurve } from '../src/anim/curves';
import { addClip, makeClip, mirrorClip, overClip, sample } from '../src/anim/clip';
import { CH, Inertializer, newPose, NCH } from '../src/anim/pose';
import { AnimGraph, defaultInput } from '../src/anim/animGraph';
import { proportions } from '../src/player/proportions';
import { RELOAD_EMPTY, RELOAD_TACTICAL, SWAP, GRENADE } from '../src/anim/clips/actions';
import { WALK, WALK_STRAFE_L, WALK_STRAFE_R } from '../src/anim/clips/locomotion';
import { Spring } from '../src/anim/rigMath';

describe('curves', () => {
  it('passes through keys and eases between them without overshoot', () => {
    const c = curve([0, 0, 1, 1, 2, 0]);
    expect(evalCurve(c, 0)).toBe(0);
    expect(evalCurve(c, 1)).toBeCloseTo(1);
    expect(evalCurve(c, 2)).toBeCloseTo(0);
    for (let t = 0; t <= 2; t += 0.01) {
      expect(evalCurve(c, t)).toBeLessThanOrEqual(1 + 1e-9);
      expect(evalCurve(c, t)).toBeGreaterThanOrEqual(-1e-9);
    }
    // clamped outside the keys
    expect(evalCurve(c, -1)).toBe(0);
    expect(evalCurve(c, 5)).toBeCloseTo(0);
  });
  it('looping curves wrap smoothly across the period', () => {
    const c = curve([0, 0, 0.25, 1, 0.5, 0, 0.75, -1], true, 1);
    expect(evalCurve(c, 1.25)).toBeCloseTo(1);
    expect(evalCurve(c, -0.25)).toBeCloseTo(-1);
    // continuity at the wrap point
    expect(Math.abs(evalCurve(c, 0.999) - evalCurve(c, 0.001))).toBeLessThan(0.02);
  });
});

describe('clips', () => {
  it('additive and override blending', () => {
    const c = makeClip({ name: 't', duration: 1, keys: { pelY: [0, -0.1, 1, -0.1], grip: [0, 0, 1, 0] } });
    const p = newPose();
    addClip(p, c, 0.5, 0.5);
    expect(p[CH.pelY]).toBeCloseTo(-0.05);
    const q = newPose();
    overClip(q, c, 0.5, 0.25);
    expect(q[CH.grip]).toBeCloseTo(0.75);
  });
  it('mirroring swaps sides, negates lateral channels and shifts cycles by half a cycle', () => {
    expect(sample(WALK_STRAFE_L, 'pelX', 0.25)).toBeCloseTo(-sample(WALK_STRAFE_R, 'pelX', 0.75), 5);
    const k = makeClip({ name: 'k', duration: 1, keys: { fLZ: [0, 0.3], fRZ: [0, -0.3], pelYaw: [0, 0.1] } });
    const m = mirrorClip(k);
    expect(sample(m, 'fRZ', 0)).toBeCloseTo(0.3);
    expect(sample(m, 'fLZ', 0)).toBeCloseTo(-0.3);
    expect(sample(m, 'pelYaw', 0)).toBeCloseTo(-0.1);
  });
  it('walk cycle: pelvis lowest just after each heel strike (loading), highest mid-stance', () => {
    const y = (t: number): number => sample(WALK, 'pelY', t);
    expect(y(0.08)).toBeLessThan(y(0));
    expect(y(0.25)).toBeGreaterThan(y(0));
    expect(y(0.58)).toBeLessThan(y(0.5));
  });
  it('reloads: off hand leaves the foregrip, visits the magazine, returns; empty reload is longer and charges', () => {
    for (const c of [RELOAD_TACTICAL, RELOAD_EMPTY]) {
      expect(sample(c, 'offGrip', 0)).toBeCloseTo(1);
      expect(sample(c, 'offGrip', 0.4)).toBeCloseTo(0);
      expect(sample(c, 'offGrip', 1)).toBeCloseTo(1);
      expect(sample(c, 'offMag', c.events.magOut!)).toBeGreaterThan(0.5);
      expect(sample(c, 'offMag', c.events.magIn!)).toBeGreaterThan(0.5);
    }
    expect(RELOAD_EMPTY.events.charge).toBeGreaterThan(RELOAD_EMPTY.events.magIn!);
    expect(sample(SWAP, 'grip', SWAP.events.holstered!)).toBeCloseTo(0);
    expect(GRENADE.events.release).toBeGreaterThan(GRENADE.events.pin!);
  });
});

describe('inertialization', () => {
  it('a jump in the source decays smoothly: continuous output, settles within the group time', () => {
    const z = new Inertializer();
    const a = newPose();
    const b = newPose();
    b[CH.pelY] = -0.3;
    b[CH.wpPitch] = 0.7;
    const out = newPose();
    const dt = 1 / 120;
    for (let k = 0; k < 10; k++) z.apply(a, out, dt);
    z.trigger(b, dt);
    let prev = out[CH.pelY]!;
    let maxStep = 0;
    let settled = -1;
    for (let k = 0; k < 120; k++) {
      z.apply(b, out, dt);
      maxStep = Math.max(maxStep, Math.abs(out[CH.pelY]! - prev));
      prev = out[CH.pelY]!;
      if (settled < 0 && Math.abs(out[CH.pelY]! - b[CH.pelY]!) < 0.003) settled = k * dt;
    }
    // first frame after the switch stays where the pose was (no snap)
    expect(maxStep).toBeLessThan(0.03);
    expect(settled).toBeGreaterThan(0.12);
    expect(settled).toBeLessThan(0.4);
    for (let i = 0; i < NCH; i++) expect(out[i]).toBeCloseTo(b[i]!, 3);
  });
});

describe('graph', () => {
  it('state switches are inertialized (no frame-to-frame jumps in the pose)', () => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    const dt = 1 / 120;
    for (let k = 0; k < 120; k++) g.update(dt, i);
    let prevY = g.out.pelvis.y;
    let maxJump = 0;
    i.cover = 'high';
    i.wallSide = 1;
    for (let k = 0; k < 60; k++) {
      g.update(dt, i);
      maxJump = Math.max(maxJump, Math.abs(g.out.pelvis.y - prevY));
      prevY = g.out.pelvis.y;
    }
    i.cover = 'none';
    i.traverse = 'vault';
    for (let k = 0; k < 90; k++) {
      i.traverseT = k / 90;
      g.update(dt, i);
      maxJump = Math.max(maxJump, Math.abs(g.out.pelvis.y - prevY));
      prevY = g.out.pelvis.y;
    }
    expect(maxJump).toBeLessThan(0.02);
    expect(g.inert.count).toBeGreaterThanOrEqual(2);
  });
  it('blend space: duty and lift follow speed; stance offsets from the kneel pose', () => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    i.speed = 0.45;
    i.localZ = 1;
    g.update(1 / 60, i);
    const creep = { duty: g.out.gait.duty, lift: g.out.gait.liftH };
    i.speed = 1.4;
    for (let k = 0; k < 30; k++) g.update(1 / 60, i);
    expect(g.out.gait.duty).toBeLessThan(creep.duty);
    expect(g.out.gait.liftH).toBeGreaterThan(creep.lift);
    const h = new AnimGraph(proportions());
    const j = defaultInput();
    j.crouch = 1;
    j.kneel = true;
    for (let k = 0; k < 90; k++) h.update(1 / 60, j);
    expect(h.out.stance.rZ).toBeLessThan(-0.2);
    expect(h.out.stance.lZ).toBeGreaterThan(0.2);
  });
  it('heel strikes compress the pelvis by 1-2 cm and it recovers', () => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    for (let k = 0; k < 240; k++) g.update(1 / 120, i);
    const y0 = g.out.pelvis.y;
    g.heelStrike(1);
    let low = y0;
    for (let k = 0; k < 60; k++) {
      g.update(1 / 120, i);
      low = Math.min(low, g.out.pelvis.y);
    }
    expect(y0 - low).toBeGreaterThan(0.008);
    expect(y0 - low).toBeLessThan(0.025);
    expect(Math.abs(g.out.pelvis.y - y0)).toBeLessThan(0.003);
  });
  it('spring helper settles without overshoot', () => {
    const s = new Spring();
    let max = 0;
    for (let k = 0; k < 240; k++) max = Math.max(max, s.step(1, 12, 1 / 120));
    expect(s.x).toBeCloseTo(1, 3);
    expect(max).toBeLessThanOrEqual(1 + 1e-6);
  });
});
