import { describe, expect, it } from 'vitest';
import { FLY, flyForward, flyGoTo, flyLook, flyMove, flyPad, flyVel, wheelSpeed } from '../../src/editor/fly';
import type { FlyPose } from '../../src/editor/fly';
import { ORBIT } from '../../src/editor/orbit';
import type { OrbitTune } from '../../src/editor/orbit';
import { aimPoint, AIM, rayPlane, rayToCeiling } from '../../src/editor/aim';
import type { AimRay } from '../../src/editor/aim';

const tune: OrbitTune = { dead: ORBIT.DEAD, smoothing: 'low', pan: 1, orbit: 1 };
const pose = (): FlyPose => ({ x: 0, y: 10, z: 0, yaw: 0, pitch: 0 });
const close = (a: number, b: number, e = 1e-6): boolean => Math.abs(a - b) < e;

describe('free-fly camera', () => {
  it('W moves along the view (pitch included), D to the right, E straight up', () => {
    const p = pose();
    flyMove(p, 1, 0, 0, 10, 1);
    expect([p.x, p.y, p.z].map((v) => +v.toFixed(6))).toEqual([0, 10, 10]);
    p.pitch = Math.PI / 2 - 0.0001;
    flyMove(p, 1, 0, 0, 10, 0.5);
    expect(close(p.y, 5, 1e-3)).toBe(true);
    const q = pose();
    flyMove(q, 0, 1, 1, 4, 0.5);
    expect([q.x, q.y, q.z].map((v) => +v.toFixed(6))).toEqual([2, 12, 0]);
  });

  it('mouse look turns and clamps the pitch', () => {
    const p = pose();
    flyLook(p, 100, 10000);
    expect(close(p.yaw, 100 * FLY.MOUSE)).toBe(true);
    expect(p.pitch).toBe(FLY.PITCH);
  });

  it('the wheel steps the fly speed within its limits', () => {
    expect(wheelSpeed(10, -100)).toBe(12.5);
    expect(wheelSpeed(10, 100)).toBe(8);
    let s = 10;
    for (let i = 0; i < 40; i++) s = wheelSpeed(s, -1);
    expect(s).toBe(FLY.SPEED_MAX);
    for (let i = 0; i < 40; i++) s = wheelSpeed(s, 1);
    expect(s).toBe(FLY.SPEED_MIN);
    expect(wheelSpeed(7, 0)).toBe(7);
  });

  it('pad: the dead zone holds still, a full push eases in to full speed, LB slows it', () => {
    const p = pose();
    const v = flyVel();
    flyPad(p, v, { moveX: 0.1, moveY: 0.1, lookX: 0.1, lookY: 0, rise: 0, slow: false }, 1 / 60, tune, 10);
    expect(p).toEqual(pose());
    for (let i = 0; i < 60; i++) flyPad(p, v, { moveX: 0, moveY: 1, lookX: 0, lookY: 0, rise: 0, slow: false }, 1 / 60, tune, 10);
    expect(v.my).toBe(1);
    expect(p.z > 8 && p.z < 10).toBe(true);
    const z0 = p.z;
    flyPad(p, v, { moveX: 0, moveY: 1, lookX: 0, lookY: 0, rise: 0, slow: true }, 1, tune, 10);
    expect(close(p.z - z0, 10 * ORBIT.PRECISION)).toBe(true);
  });

  it('pad: the triggers rise and drop, the right stick turns at the orbit rates (inverted on request)', () => {
    const p = pose();
    const v = { mx: 0, my: 0, lx: 1, ly: 0, up: 1 };
    flyPad(p, v, { moveX: 0, moveY: 0, lookX: 1, lookY: 0, rise: 1, slow: false }, 0.1, tune, 10);
    expect(close(p.y, 11)).toBe(true);
    expect(close(p.yaw, ORBIT.ORBIT_RATE * 0.1)).toBe(true);
    const u = pose();
    flyPad(u, { mx: 0, my: 0, lx: 0, ly: 1, up: -1 }, { moveX: 0, moveY: 0, lookX: 0, lookY: 1, rise: -1, slow: false }, 0.1, tune, 10);
    expect(close(u.pitch, -ORBIT.TILT_RATE * 0.1) && close(u.y, 9)).toBe(true);
    const q = pose();
    flyPad(q, { mx: 0, my: 0, lx: 0, ly: -1, up: 0 }, { moveX: 0, moveY: 0, lookX: 0, lookY: 1, rise: 0, slow: false }, 0.1, tune, 10, true);
    expect(close(q.pitch, ORBIT.TILT_RATE * 0.1)).toBe(true);
  });

  it('go to: keeps the yaw, looks down, the aim lands on the point', () => {
    const g = flyGoTo({ x: 0, y: 2, z: 0, yaw: 1, pitch: 0 }, 10, 0, 20, 22);
    expect(g.yaw).toBe(1);
    expect(g.pitch).toBe(ORBIT.PITCH_MIN);
    const f = flyForward(g.yaw, g.pitch);
    expect(close(g.x + f[0] * 22, 10) && close(g.y + f[1] * 22, 0) && close(g.z + f[2] * 22, 20)).toBe(true);
  });
});

describe('surface aiming', () => {
  const down: AimRay = { o: [0, 10, 0], d: [0, -1, 1] };
  const ceil = (x: number): number => (x < 5 ? 3 : 4);

  it('the floor plane, only ahead', () => {
    expect(rayPlane(down, 0)).toEqual([0, 10]);
    expect(rayPlane({ o: [0, 1, 0], d: [0, 1, 0] }, 0)).toBeNull();
  });

  it('a ceiling underside hit is the point under it; its height is the ceiling', () => {
    const a = aimPoint({ o: [0, 1.6, 0], d: [0, 1, 1] }, { x: 0.04, y: 3, z: 1.43, n: [0, -1, 0] }, 0, ceil, 0.1)!;
    expect(a).toEqual({ p: [0, 1.4], surf: 'ceiling', y: 3, ceil: 3 });
  });

  it('from above the ceiling, a floor hit maps to the ceiling above that point', () => {
    const a = aimPoint(down, { x: 6.02, y: 0, z: 10, n: [0, 1, 0] }, 0, ceil, 0.1)!;
    expect(a.surf).toBe('floor');
    expect(a.p).toEqual([6, 10]);
    expect(a.ceil).toBe(4);
  });

  it('looking up at nothing: the ceiling plane of the room the point is in', () => {
    const r: AimRay = { o: [0, 1.6, 0], d: [1, 1, 0] };
    expect(rayToCeiling(r, ceil)).toEqual({ p: [1.4, 0], y: 3 });
    const far: AimRay = { o: [4, 1.6, 0], d: [1, 1, 0] };
    expect(rayToCeiling(far, ceil)).toEqual({ p: [6.4, 0], y: 4 });
    expect(aimPoint(far, null, 0, ceil, 0.1)).toEqual({ p: [6.4, 0], surf: 'ceiling', y: 4, ceil: 4 });
  });

  it('a wall face hit stands just out of the face, facing the camera, snapped along the face only', () => {
    // a wall whose +x face is at x = 5.15, seen from the east (the normal given either way round)
    const r: AimRay = { o: [10, 1.6, 0], d: [-1, 0.1, 0.2] };
    for (const n of [[1, 0, 0], [-1, 0, 0]] as const) {
      const a = aimPoint(r, { x: 5.15, y: 2.1, z: 1.07, n }, 0, ceil, 0.25)!;
      expect(a.surf).toBe('wall');
      expect(a.p).toEqual([+(5.15 + AIM.OUT).toFixed(3), 1]);
      expect(a.face).toEqual([1, 0]);
    }
  });

  it('an object top is a top; nothing hit and looking down is the floor', () => {
    expect(aimPoint(down, { x: 1, y: 0.9, z: 9.1, n: [0, 1, 0] }, 0, ceil, 0.1)!.surf).toBe('top');
    expect(aimPoint(down, null, 0, ceil, 0.1)).toEqual({ p: [0, 10], surf: 'floor', y: 0, ceil: 3 });
  });
});
