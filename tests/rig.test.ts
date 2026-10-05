import { describe, expect, it } from 'vitest';
import { BUILDS, headsTall, hitVolumes, proportions } from '../src/player/proportions';
import { solveTwoBone, gaitFoot, cadence, springStep, v3, type V3 } from '../src/anim/rigMath';
import { AnimGraph, defaultInput, gaitAt, GAIT, LOWER_STATES, pickLower, FADE } from '../src/anim/animGraph';
import { MOVEMENT } from '../src/config/movement';
import { coverStandoff } from '../src/cover/coverData';

const dist = (a: V3, b: V3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

describe('body proportions', () => {
  it('average build is ~7.5 heads tall at 1.75 m with shoulders ~2 head heights wide', () => {
    const p = proportions('average');
    expect(p.height).toBe(1.75);
    expect(headsTall(p)).toBeGreaterThan(7.3);
    expect(headsTall(p)).toBeLessThan(7.8);
    expect(p.shoulderWidth / p.head.h).toBeGreaterThan(1.8);
    expect(p.shoulderWidth / p.head.h).toBeLessThan(2.2);
  });
  it('torso tapers from chest to waist and limbs taper towards hands and feet', () => {
    for (const b of BUILDS) {
      const p = proportions(b);
      expect(p.waist.w).toBeLessThan(p.chest.w);
      expect(p.upperArm.r1).toBeLessThan(p.upperArm.r0);
      expect(p.forearm.r1).toBeLessThan(p.forearm.r0);
      expect(p.forearm.r0).toBeLessThanOrEqual(p.upperArm.r0);
      expect(p.thigh.r1).toBeLessThan(p.thigh.r0);
      expect(p.calf.r1).toBeLessThan(p.calf.r0);
      expect(p.calf.r0).toBeLessThan(p.thigh.r0);
      // not skinny: thigh at least ~half the head width, upper arm about a third
      expect(p.thigh.r0 * 2).toBeGreaterThan(p.head.w * 0.85);
      expect(p.upperArm.r0 * 2).toBeGreaterThan(p.head.w * 0.5);
    }
  });
  it('body types stay within a believable range of the average build', () => {
    const avg = proportions('average');
    for (const b of BUILDS) {
      const p = proportions(b);
      expect(p.shoulderWidth / avg.shoulderWidth).toBeGreaterThan(0.9);
      expect(p.shoulderWidth / avg.shoulderWidth).toBeLessThan(1.15);
      expect(p.thigh.r0 / avg.thigh.r0).toBeGreaterThan(0.85);
      expect(p.thigh.r0 / avg.thigh.r0).toBeLessThan(1.2);
      expect(p.waist.w / avg.waist.w).toBeGreaterThan(0.85);
      expect(p.waist.w / avg.waist.w).toBeLessThan(1.2);
      expect(p.height).toBe(avg.height);
    }
    const ath = proportions('athletic');
    expect(ath.chest.w / ath.waist.w).toBeGreaterThan(avg.chest.w / avg.waist.w);
  });
  it('joint pivots are stacked in anatomical order and limbs reach the ground', () => {
    for (const b of BUILDS) {
      const p = proportions(b);
      const y = p.y;
      expect(y.ankle).toBeLessThan(y.knee);
      expect(y.knee).toBeLessThan(y.hip);
      expect(y.hip).toBeLessThan(y.waist);
      expect(y.waist).toBeLessThan(y.chest);
      expect(y.chest).toBeLessThan(y.shoulder);
      expect(y.shoulder).toBeLessThan(y.neck);
      // leg lengths match the joint heights (hip -> ankle) within a few cm
      expect(Math.abs(p.thigh.len + p.calf.len - (y.hip - y.ankle))).toBeLessThan(0.06);
      // head top at the standing height
      expect(Math.abs(y.neck + p.neck.len + p.head.h - p.height)).toBeLessThan(0.06);
      // hands hang to mid-thigh
      const wrist = y.shoulder - p.upperArm.len - p.forearm.len;
      expect(wrist).toBeGreaterThan(y.knee);
      expect(wrist).toBeLessThan(y.hip);
      expect(p.shoulderHalf).toBeGreaterThan(p.hipHalf);
    }
  });
  it('scales with height', () => {
    const a = proportions('average', 1.75);
    const b = proportions('average', 1.85);
    expect(b.y.hip / a.y.hip).toBeCloseTo(1.85 / 1.75, 3);
    expect(b.thigh.len / a.thigh.len).toBeCloseTo(1.85 / 1.75, 3);
  });
  it('hit volumes fit inside the controller capsule and cover the body', () => {
    for (const b of BUILDS) {
      const p = proportions(b);
      const hv = hitVolumes(p);
      expect(hv.bodyR).toBeLessThanOrEqual(p.capsuleRadius);
      expect(hv.bodyR).toBeLessThanOrEqual(MOVEMENT.radius + 0.01);
      expect(hv.bodyR).toBeGreaterThanOrEqual(p.chest.d / 2);
      expect(hv.bodyY1 + hv.bodyR).toBeGreaterThanOrEqual(p.y.shoulder);
      expect(hv.bodyY0 - hv.bodyR).toBeLessThanOrEqual(p.y.knee);
      // head sphere sits on the skull: wider than half the head, smaller than the whole head
      expect(hv.headR * 2).toBeGreaterThan(p.head.w);
      expect(hv.headR * 2).toBeLessThan(p.head.h * 1.1);
      expect(hv.headY + hv.headR).toBeLessThan(p.height + 0.05);
      expect(MOVEMENT.standHeight).toBeGreaterThanOrEqual(p.height - 0.01);
    }
  });
  it('cover standoff clears the body depth and the capsule', () => {
    for (const b of BUILDS) {
      const p = proportions(b);
      const s = coverStandoff(MOVEMENT.radius, p.bodyDepthHalf);
      expect(s).toBeGreaterThan(p.bodyDepthHalf);
      expect(s).toBeGreaterThan(MOVEMENT.radius);
      expect(s).toBeLessThan(0.5);
    }
  });
});

describe('two-bone IK', () => {
  it('keeps bone lengths and reaches reachable targets', () => {
    const root = v3(0, 1, 0);
    const j = v3();
    const end = v3();
    for (const t of [v3(0.25, 0.65, 0.25), v3(-0.2, 0.9, 0.4), v3(0.1, 0.5, 0)]) {
      solveTwoBone(root, t, 0.3, 0.26, v3(0, -1, -0.3), j, end);
      expect(dist(root, j)).toBeCloseTo(0.3, 4);
      expect(dist(j, end)).toBeCloseTo(0.26, 4);
      expect(dist(end, t)).toBeLessThan(1e-3);
    }
  });
  it('bends towards the pole and straightens (not past) for far targets', () => {
    const j = v3();
    const end = v3();
    solveTwoBone(v3(0, 1, 0), v3(0, 0.2, 0.1), 0.42, 0.43, v3(0, 0, 1), j, end);
    expect(j.z).toBeGreaterThan(0.05); // knee forward
    solveTwoBone(v3(0, 1, 0), v3(0, -5, 0), 0.42, 0.43, v3(0, 0, 1), j, end);
    expect(dist(v3(0, 1, 0), end)).toBeLessThan(0.85);
    expect(dist(v3(0, 1, 0), end)).toBeGreaterThan(0.84);
  });
});

describe('gait and blending', () => {
  it('planted feet do not slide: stance travel per second equals ground speed', () => {
    for (const speed of [1.4, 3.5, 5.5]) {
      const g = gaitAt(speed);
      const c = cadence(speed, g.stride, g.duty);
      const dt = 1 / 600;
      // foot movement relative to the body during stance must cancel the body's motion
      const p0 = 0.1;
      const a = gaitFoot(p0, g.stride, g.lift, g.duty);
      const b = gaitFoot(p0 + c * dt, g.stride, g.lift, g.duty);
      expect(a.planted && b.planted).toBe(true);
      expect((a.along - b.along) / dt).toBeCloseTo(speed, 1);
    }
  });
  it('swing lifts the foot, stance keeps it on the ground', () => {
    const st = gaitFoot(0.3, 1, 0.1);
    const sw = gaitFoot(0.8, 1, 0.1);
    expect(st.up).toBe(0);
    expect(sw.up).toBeGreaterThan(0.05);
  });
  it('blend tree weights interpolate between neighbouring gaits and sum to 1', () => {
    for (const s of [0, 0.7, 1.4, 2.5, 3.5, 4.5, 5.5, 8]) {
      const g = gaitAt(s);
      const sum = g.weights.reduce((x, y) => x + y, 0);
      expect(sum).toBeCloseTo(1, 6);
      expect(g.weights.filter((w) => w > 0).length).toBeLessThanOrEqual(2);
    }
    expect(gaitAt(GAIT[1]!.speed).weights[1]).toBeCloseTo(1);
    expect(gaitAt(2.45).stride).toBeGreaterThan(GAIT[1]!.stride);
    expect(gaitAt(2.45).stride).toBeLessThan(GAIT[2]!.stride);
  });
  it('lower-body states cross-fade over ~200 ms with weights summing to 1', () => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    i.crouch = 1;
    expect(pickLower(i)).toBe('crouch');
    let t = 0;
    while (g.weights.crouch < 0.999 && t < 1) {
      g.update(1 / 60, i);
      t += 1 / 60;
      const sum = LOWER_STATES.reduce((a, s) => a + g.weights[s], 0);
      expect(sum).toBeCloseTo(1, 6);
    }
    expect(t).toBeGreaterThan(FADE * 0.7);
    expect(t).toBeLessThan(0.26);
    // mid-fade both states contribute (no snap)
    const h = new AnimGraph(proportions());
    h.update(0.1, i);
    expect(h.weights.crouch).toBeGreaterThan(0.2);
    expect(h.weights.locomotion).toBeGreaterThan(0.2);
  });
  it('state priority: roll > vault > air > cover > crouch > locomotion', () => {
    const i = defaultInput();
    expect(pickLower(i)).toBe('locomotion');
    i.cover = 'low';
    expect(pickLower(i)).toBe('cover');
    i.grounded = false;
    expect(pickLower(i)).toBe('air');
    i.vault = 0.2;
    expect(pickLower(i)).toBe('vault');
    i.roll = 0.5;
    expect(pickLower(i)).toBe('roll');
  });
  it('crouching lowers the pelvis and the aim layer raises the weapon', () => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    for (let k = 0; k < 60; k++) g.update(1 / 60, i);
    const standY = g.out.pelvis.y;
    const lowPitch = g.out.weapon.pitch;
    i.crouch = 1;
    i.aim = 1;
    for (let k = 0; k < 60; k++) g.update(1 / 60, i);
    expect(g.out.pelvis.y).toBeLessThan(standY - 0.2);
    expect(g.out.weapon.pitch).toBeLessThan(lowPitch);
  });
  it('critically damped spring settles without overshoot', () => {
    let x = 0;
    let v = 0;
    let max = 0;
    for (let k = 0; k < 120; k++) {
      [x, v] = springStep(x, v, 1, 12, 1 / 60);
      max = Math.max(max, x);
    }
    expect(x).toBeCloseTo(1, 3);
    expect(max).toBeLessThanOrEqual(1 + 1e-6);
  });
});
