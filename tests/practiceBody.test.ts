import { describe, expect, it, vi } from 'vitest';
import { Enemy } from '../src/ai/enemy';
import { Vector3 } from '../src/core/babylon';

/** (G2c) Who looks for a downed body: a Test Chamber practice guard does not; every other guard, a passive one included (the Marlow Yard gate checker), does as before. */
function guard(o: { passive: boolean; practice: boolean }) {
  const bodyFound = vi.fn();
  const body = { found: false, present: true, pos: new Vector3(0, 0, 2), light: 0.6 };
  const ctx = { bodies: () => [body], ballistics: { ray: () => ({ hit: false, distance: 0 }) }, bodyFound };
  const e = Object.create(Enemy.prototype) as Enemy;
  Object.assign(e, {
    ctx,
    pos: new Vector3(0, 0, 0),
    yaw: 0,
    def: { melee: null },
    aware: { alert: false },
    passive: o.passive,
    practice: o.practice,
    tmpHips: new Vector3(),
  });
  const look = (e as unknown as { lookForBodies(eye: Vector3): void }).lookForBodies.bind(e);
  return { bodyFound, look: () => look(new Vector3(0, 1.6, 0)) };
}

describe('G2c: a practice guard looks past bodies, no other guard does', () => {
  it('an ordinary guard finds a body in front of him', () => {
    const g = guard({ passive: false, practice: false });
    g.look();
    expect(g.bodyFound).toHaveBeenCalledTimes(1);
  });
  it('a passive guard that is not a practice guard (the gate checker) finds it as before', () => {
    const g = guard({ passive: true, practice: false });
    g.look();
    expect(g.bodyFound).toHaveBeenCalledTimes(1);
  });
  it('a practice guard does not', () => {
    const g = guard({ passive: true, practice: true });
    g.look();
    expect(g.bodyFound).not.toHaveBeenCalled();
  });
});
