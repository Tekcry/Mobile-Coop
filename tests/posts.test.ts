import { describe, expect, it } from 'vitest';
import { LURE, POST, PostLure, clampToLeash, inLeash, lurePoint, mayLeave, type PostDef, type PostLureOut } from '../src/ai/posts';
import { KIND } from '../src/ai/incidents';
import type { P2 } from '../src/ai/navGrid';

// (guard-ai S5) posts and high security (design section 6, goal 7, A10, A12): leash maths, may-leave rules and the
// lured posted guard's walk / look / return.

const angDiff = (a: number, b: number): number => {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
};

describe('leash maths', () => {
  it('clampToLeash: a point inside stays, outside goes to the edge, writes into out', () => {
    const out: P2 = [0, 0];
    expect(clampToLeash(11, 21, 10, 20, 3, out)).toBe(out);
    expect(out).toEqual([11, 21]);
    clampToLeash(10, 30, 10, 20, 3, out);
    expect(out[0]).toBeCloseTo(10, 9);
    expect(out[1]).toBeCloseTo(23, 9);
    clampToLeash(14, 24, 10, 20, 2, out); // diagonal: |(x, z) - post| = 2
    expect(Math.hypot(out[0] - 10, out[1] - 20)).toBeCloseTo(2, 9);
    expect(out[0]).toBeCloseTo(out[1] - 10, 9);
  });
  it('clampToLeash: leash 0 stays on the spot', () => {
    const out: P2 = [9, 9];
    clampToLeash(50, -3, 1, 2, 0, out);
    expect(out).toEqual([1, 2]);
    clampToLeash(1.1, 2, 1, 2, 0, out);
    expect(out).toEqual([1, 2]);
  });
  it('lurePoint: the lure inside the circle, the nearest edge point outside it', () => {
    const out: P2 = [0, 0];
    lurePoint(1, 1, 0, 0, 3, out);
    expect(out).toEqual([1, 1]);
    lurePoint(-8, 0, 0, 0, 3, out);
    expect(out[0]).toBeCloseTo(-3, 9);
    expect(out[1]).toBeCloseTo(0, 9);
    expect(inLeash(out[0], out[1], 0, 0, 3)).toBe(true);
  });
});

describe('mayLeave', () => {
  it('no post and a normal post: may be sent out for anything', () => {
    const normal: PostDef = { leash: 5, guards: 'c1-door' };
    for (const k of KIND) {
      expect(mayLeave(null, k)).toBe(true);
      expect(mayLeave(undefined, k)).toBe(true);
      expect(mayLeave(normal, k)).toBe(true);
      expect(mayLeave({ leash: 0 }, k)).toBe(true);
    }
  });
  it('a high-security post never leaves (A10), whatever the incident', () => {
    const vault: PostDef = { leash: 3, highSecurity: true, guards: 'token' };
    for (const k of KIND) expect(mayLeave(vault, k)).toBe(false);
  });
  it('(guard-rules S7, A9) a lookout never leaves, whatever the incident', () => {
    for (const k of KIND) expect(mayLeave({ leash: 1, lookout: true }, k)).toBe(false);
  });
});

/** Drive a PostLure with a guard walking at `speed` m/s; returns the trace. */
function run(lure: PostLure, startX: number, startZ: number, speed = 1.2, dt = 1 / 60, maxT = 60) {
  const out: PostLureOut = { x: 0, z: 0, yaw: 0, moving: false, phase: LURE.idle };
  let x = startX;
  let z = startZ;
  let at = false;
  let lookT = 0;
  let maxLookOff = 0;
  let maxDistFromPost = 0;
  const phases: number[] = [];
  let edgeAtLook: P2 | null = null;
  for (let t = 0; t < maxT; t += dt) {
    const ph = lure.step(dt, at, out);
    if (phases[phases.length - 1] !== ph) phases.push(ph);
    if (ph === LURE.look) {
      lookT += dt;
      maxLookOff = Math.max(maxLookOff, angDiff(out.yaw, lure.bearing));
      edgeAtLook ??= [x, z];
    }
    if (ph === LURE.done) break;
    if (out.moving) {
      const dx = out.x - x;
      const dz = out.z - z;
      const d = Math.hypot(dx, dz);
      const s = Math.min(d, speed * dt);
      if (d > 1e-9) {
        x += (dx / d) * s;
        z += (dz / d) * s;
      }
    }
    at = Math.hypot(out.x - x, out.z - z) <= POST.arrive;
    maxDistFromPost = Math.max(maxDistFromPost, Math.hypot(x - lure.postX, z - lure.postZ));
  }
  return { out, x, z, lookT, maxLookOff, maxDistFromPost, phases, edgeAtLook };
}

describe('PostLure (A12)', () => {
  it('the table keeps the A12 promise to Course Ready: look >= 5 s, sweep <= 0.6 rad', () => {
    expect(POST.lureLook).toBeGreaterThanOrEqual(5);
    expect(POST.lureSweep).toBeLessThanOrEqual(0.6);
  });

  it('K4-like keyholder (leash 3, high security) lured by a noise 8 m away: edge, look >= 5 s at the lure, back, faces his yaw', () => {
    const post: PostDef = { leash: 3, highSecurity: true, guards: 'token' };
    const px = 20;
    const pz = 40;
    const yaw = Math.PI / 2; // faces +X (the choke)
    // the noise 8 m away, behind him and to the side (so facing it faces away from the choke)
    const nx = px - 8 * Math.sin(0.5);
    const nz = pz - 8 * Math.cos(0.5);
    expect(mayLeave(post, 'noise')).toBe(false);
    const lure = new PostLure();
    lure.start(nx, nz, px, pz, yaw, post.leash);
    expect(lure.active).toBe(true);
    // the look point is on the leash edge, on the line to the noise
    expect(Math.hypot(lure.look[0] - px, lure.look[1] - pz)).toBeCloseTo(3, 6);
    expect(angDiff(lure.bearing, Math.atan2(nx - px, nz - pz))).toBeLessThan(1e-9);

    const r = run(lure, px, pz);
    expect(r.phases).toEqual([LURE.walk, LURE.look, LURE.back, LURE.face, LURE.done]);
    // reached the edge (within the arrival radius) and never left the circle
    expect(r.edgeAtLook).not.toBeNull();
    expect(Math.hypot(r.edgeAtLook![0] - lure.look[0], r.edgeAtLook![1] - lure.look[1])).toBeLessThanOrEqual(POST.arrive + 1e-9);
    expect(r.maxDistFromPost).toBeLessThanOrEqual(post.leash + 1e-9);
    // looked at least 5 s, always within 0.6 rad of the lure bearing (so never back at the choke while looking)
    expect(r.lookT).toBeGreaterThanOrEqual(5 - 1e-6);
    expect(r.maxLookOff).toBeLessThanOrEqual(0.6 + 1e-9);
    expect(r.maxLookOff).toBeGreaterThan(0.3); // he does sweep
    // back on his post, facing his yaw
    expect(Math.hypot(r.x - px, r.z - pz)).toBeLessThanOrEqual(POST.arrive);
    expect(r.out.x).toBe(px);
    expect(r.out.z).toBe(pz);
    expect(r.out.yaw).toBe(yaw);
    expect(r.out.moving).toBe(false);
    expect(lure.active).toBe(false);
  });

  it('a lure inside the circle: he walks onto it and looks along post -> lure', () => {
    const lure = new PostLure();
    lure.start(2, 0, 0, 0, 0, 5);
    expect(lure.look).toEqual([2, 0]);
    expect(lure.bearing).toBeCloseTo(Math.PI / 2, 9);
    const r = run(lure, 0, 0);
    expect(r.phases[r.phases.length - 1]).toBe(LURE.done);
    expect(r.lookT).toBeGreaterThanOrEqual(5 - 1e-6);
  });

  it('leash 0: he turns to the lure on the spot, looks, faces his post again', () => {
    const lure = new PostLure();
    lure.start(0, 10, 3, 3, -1, 0);
    expect(lure.look).toEqual([3, 3]);
    const r = run(lure, 3, 3);
    expect(r.maxDistFromPost).toBe(0);
    expect(r.lookT).toBeGreaterThanOrEqual(5 - 1e-6);
    expect(r.out.yaw).toBe(-1);
  });

  it('atTarget means "at the target the previous step gave": an arrival on the first step after start is ignored', () => {
    const lure = new PostLure();
    const out: PostLureOut = { x: 0, z: 0, yaw: 0, moving: false, phase: LURE.idle };
    lure.start(10, 0, 0, 0, 0, 3);
    expect(lure.step(0.1, true, out)).toBe(LURE.walk); // no target given yet: ignored
    expect(out.moving).toBe(true);
    expect(lure.step(0.1, true, out)).toBe(LURE.look);
    let ph = lure.step(0.1, true, out);
    while (ph === LURE.look) ph = lure.step(0.1, true, out); // arrivals while looking change nothing
    expect(ph).toBe(LURE.back);
    expect(out.moving).toBe(true);
    expect(lure.step(0.1, false, out)).toBe(LURE.back);
    expect(lure.step(0.1, true, out)).toBe(LURE.face);
    expect(out.yaw).toBe(0);
  });

  it('a blocked walk gives up after lureWalkMax and looks from where he is; cancel drops it', () => {
    const lure = new PostLure();
    const out: PostLureOut = { x: 0, z: 0, yaw: 0, moving: false, phase: LURE.idle };
    lure.start(10, 0, 0, 0, 0, 3);
    let t = 0;
    while (lure.step(0.5, false, out) === LURE.walk) t += 0.5;
    expect(lure.phase).toBe(LURE.look);
    expect(t).toBeLessThanOrEqual(POST.lureWalkMax);
    lure.cancel();
    expect(lure.active).toBe(false);
    expect(lure.step(0.1, false, out)).toBe(LURE.idle);
    expect(out.moving).toBe(false);
  });
});
