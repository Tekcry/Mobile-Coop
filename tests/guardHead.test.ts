import { describe, expect, it } from 'vitest';
import { GuardCq, type GuardCqMode } from '../src/game/closeQuarters';
import { BLIND_PITCH, HELD_PITCH, guardHead, guardHeadRest, leanStep, newLeanState, type GuardHeadIn } from '../src/ai/guardHead';

function inp(over: Partial<GuardHeadIn> = {}): GuardHeadIn {
  return { x: 0, y: 0, z: 0, yaw: 0, crouch: 0, speed: 0, aim: 0.2, aimPitch: 0, wall: false, wallSide: 0, lean: 0, leanDrop: 0, held: null, heldK: 0, koK: 0, blind: 0, climb: false, ...over };
}
const grunt = guardHeadRest(1.75, 'average');
const head = (i: GuardHeadIn, r = grunt) => {
  const o = { x: 0, y: 0, z: 0 };
  guardHead(i, r, o);
  return o;
};

describe('guardHead (pure sim head)', () => {
  it('turns with yaw about the feet', () => {
    for (const yaw of [0, Math.PI / 2, -2.3]) {
      const a = head(inp({ yaw, x: 1, z: 2 }));
      const b = head(inp({ yaw: 0, x: 1, z: 2 }));
      const fx = a.x - 1;
      const fz = a.z - 2;
      const bx = b.x - 1;
      const bz = b.z - 2;
      // the same horizontal distance from the feet, rotated by yaw
      expect(Math.hypot(fx, fz)).toBeCloseTo(Math.hypot(bx, bz), 9);
      expect(fx).toBeCloseTo(bx * Math.cos(yaw) + bz * Math.sin(yaw), 9);
      expect(fz).toBeCloseTo(-bx * Math.sin(yaw) + bz * Math.cos(yaw), 9);
      expect(a.y).toBeCloseTo(b.y, 9);
    }
  });

  it('crouch lowers the head monotonically', () => {
    let prev = Infinity;
    for (let c = 0; c <= 1.0001; c += 0.1) {
      const y = head(inp({ crouch: c })).y;
      expect(y).toBeLessThan(prev);
      prev = y;
    }
  });

  it('lean moves it sideways by the sign (yaw 0: +x is the root-local side)', () => {
    const l = head(inp({ wall: false, lean: -1, leanDrop: 1 }));
    const r = head(inp({ lean: 1, leanDrop: 1 }));
    expect(l.x).toBeLessThan(-0.5);
    expect(r.x).toBeGreaterThan(0.5);
    expect(r.y).toBeLessThan(head(inp()).y);
  });

  it('held and blind poses pitch the head forward and down', () => {
    const base = head(inp());
    const held = head(inp({ held: 'seizedLethal', heldK: 1 }));
    expect(held.z).toBeGreaterThan(base.z);
    expect(held.y).toBeLessThan(base.y);
    const blind = head(inp({ blind: 1 }));
    expect(blind.y).toBeLessThan(base.y);
  });

  it('scales with height', () => {
    const lo = head(inp(), guardHeadRest(1.6, 'average'));
    const hi = head(inp(), guardHeadRest(1.95, 'average'));
    expect(hi.y).toBeGreaterThan(lo.y);
    expect(hi.y / lo.y).toBeCloseTo(1.95 / 1.6, 1);
  });

  it('writes out in place', () => {
    const o = { x: 9, y: 9, z: 9 };
    const ret = guardHead(inp({ x: 1 }), grunt, o);
    expect(ret).toBeUndefined();
    expect(o.x).not.toBe(9);
    expect(o.y).toBeGreaterThan(1);
  });

  it('the lean springs settle on the target', () => {
    const st = newLeanState();
    for (let i = 0; i < 120; i++) leanStep(st, 1, 1 / 60);
    expect(st.bd).toBeCloseTo(1, 3);
    for (let i = 0; i < 240; i++) leanStep(st, 0, 1 / 60);
    expect(Math.abs(st.bd)).toBeLessThan(1e-3);
  });

  it('the held and blind pitch table matches GuardCq / Enemy.blind', () => {
    for (const mode of Object.keys(HELD_PITCH) as GuardCqMode[]) {
      const cq = new GuardCq();
      cq.seize(false, 0);
      cq.set(mode);
      cq.k = mode === 'interrogate' ? 0.5 : 1;
      const p = cq.pose(2)!;
      const [n, c] = HELD_PITCH[mode];
      expect(p.neck[0], mode).toBeCloseTo(n, 6);
      expect(p.chest[0], mode).toBeCloseTo(c, 6);
    }
    expect(BLIND_PITCH).toEqual({ neck: 0.45, chest: 0.3, lift: -0.06 });
  });
});
