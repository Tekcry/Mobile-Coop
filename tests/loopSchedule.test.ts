import { describe, expect, it } from 'vitest';
import { loopArrivals, loopLegs, loopPath, loopPeriod, loopStateAt, loopWaits, type LoopWp } from '../src/ai/loopSchedule';
import { PatrolWalker } from '../src/ai/patrol';

const square: LoopWp[] = [
  { x: 0, z: 0, d: 1 },
  { x: 4, z: 0, d: 0 },
  { x: 4, z: 4, d: 2 },
  { x: 0, z: 4, d: 0 },
];
const out: LoopWp[] = [
  { x: 0, z: 0, d: 2 },
  { x: 6, z: 0, d: 1 },
];

describe('timed guard loops', () => {
  it('a closed loop of three or more points, out and back for two', () => {
    expect(loopLegs(square)).toEqual([4, 4, 4, 4]);
    expect(loopPath(square)).toBe(16);
    expect(loopLegs(out)).toEqual([6, 6]);
  });

  it('the period is the walk plus every pause (dwell and a 0.5 s turn)', () => {
    expect(loopWaits(square)).toEqual([1.5, 0.5, 2.5, 0.5]);
    expect(loopPeriod(square, 2)).toBeCloseTo(8 + 5, 9);
    expect(loopPeriod(out, 1)).toBeCloseTo(12 + 3 + 1, 9);
    expect(loopArrivals(square, 2)).toEqual([0, 3.5, 6, 10.5]);
  });

  it('the state at a loop time: pausing at a waypoint, walking to the next, wrapping by the period', () => {
    const a = loopStateAt(square, 2, 1);
    expect([a.x, a.z, a.idx]).toEqual([0, 0, 0]);
    expect(a.wait).toBeCloseTo(0.5, 9);
    const b = loopStateAt(square, 2, 2.5);
    expect(b.idx).toBe(1);
    expect(b.wait).toBe(0);
    expect([b.x, b.z]).toEqual([2, 0]);
    const c = loopStateAt(square, 2, -0.5);
    expect(c.idx).toBe(0);
    expect([c.x, c.z]).toEqual([0, 1]);
    expect(loopStateAt(square, 2, 13 + 2.5).x).toBe(b.x);
  });

  it('a walker made with a route start pauses, then heads for the next point; faces and waits come from the route', () => {
    const w = new PatrolWalker({ points: [[0, 0], [4, 0], [4, 4]], waits: [3, 1, 1], faces: [1, 2, 3], start: { idx: 0, wait: 2 } }, 0, 0, 0);
    expect(w.step(1, 0, 0)).toBeNull();
    expect(w.step(1.5, 0, 0)).toEqual([4, 0]);
    // arrive at point 1: the pause there is 1 s, facing 2
    expect(w.step(0.1, 4, 0)).toBeNull();
    expect(w.lookYaw).toBe(2);
    expect(w.step(1.2, 4, 0)).toEqual([4, 4]);
  });

  it('a timed loop leaves on the planned time whenever the walker arrives, and rejoins where the schedule says', () => {
    const route = { points: [[0, 0], [4, 0], [4, 4]] as [number, number][], waits: [1, 1, 1], loop: { period: 20, leave: [5, 10, 15], t0: 0 } };
    const w = new PatrolWalker(route, 0, 0, 0);
    // arrives at point 0 at loop time 0: waits until 5
    expect(w.step(0, 0, 0)).toBeNull();
    for (let t = 0; t < 4.9; t += 0.1) {
      w.tick(0.1);
      expect(w.step(0.1, 0, 0)).toBeNull();
    }
    for (let t = 0; t < 0.4; t += 0.1) w.tick(0.1);
    expect(w.step(0.2, 0, 0)).toEqual([4, 0]);
    // after an alert at loop time ~12 the walker rejoins at the point it should be heading for (departure at 15: point 2)
    const v = new PatrolWalker(route, 0, 0, 0);
    for (let i = 0; i < 120; i++) v.tick(0.1);
    v.rejoin(1, 1);
    expect(v.idx).toBe(2);
  });
});
