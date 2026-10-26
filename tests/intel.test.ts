import { describe, expect, it } from 'vitest';
import { INTEL, checkIntel, gatherIntel, intelCodes, intelGuard, interrogationEnded, patrolPeriod, type GuardIntel, type IntelCam, type IntelGuard, type PatrolSource } from '../src/game/intel';
import type { Enemy } from '../src/ai/enemy';
import type { PatrolRoute } from '../src/ai/patrol';

// (CT Core spare 9) interrogation gives door codes, camera routes and patrol timing.
const square: PatrolRoute = { points: [[0, 0], [10, 0], [10, 10], [0, 10]], waits: [1, 2, 3, 4] };
const line: PatrolRoute = { points: [[0, 0], [10, 0]], wait: 5 };

describe('patrolPeriod', () => {
  it('ping-pong two points', () => expect(patrolPeriod(line, 2)).toBe(20));
  it('closed square with waits', () => expect(patrolPeriod(square, 4)).toBe(20));
  it('default wait', () => expect(patrolPeriod({ points: [[0, 0], [6, 0]] }, 2)).toBe(24));
  it('timed loop', () => expect(patrolPeriod({ points: [[0, 0], [5, 0]], loop: { period: 42, leave: [0], t0: 0 } }, 2)).toBe(42));
  it('one point', () => expect(patrolPeriod({ points: [[0, 0]] }, 2)).toBe(0));
});

const at = { x: 0, y: 0, z: 0 };
const cam = (x: number, y: number, cycle: number, live = true): IntelCam => ({ x, y, z: 0, cycle, live });
const guard = (x: number, z: number, route: PatrolRoute | null, speed: number, up = true): IntelGuard => ({ x, y: 0, z, up, route, speed });
const info: GuardIntel = { lines: ['x'], codes: [{ flag: 'lab-door', label: 'Lab door 4471' }] };

describe('gatherIntel', () => {
  it('codes, cameras and patrols', () => {
    const r = gatherIntel(at, info, [cam(10, 2.6, 16), cam(20, 2.6, 8), cam(40, 2.6, 8), cam(5, 8, 8), cam(3, 2.6, 8, false)],
      [guard(5, 0, square, 4), guard(0, 12, line, 2), guard(8, 0, null, 2), guard(2, 0, square, 4, false)]);
    expect(r.lines).toEqual(['Code: Lab door 4471', 'Cameras near: 2, sweep 8-16 s', 'Patrols near: 2, loop 20 s']);
    expect(r.codes).toEqual(['lab-door']);
    expect(r.cams).toBe(2);
    expect(r.patrols).toBe(2);
  });
  it('a fixed camera', () => expect(gatherIntel(at, { lines: ['x'] }, [cam(5, 2.6, 0)], []).lines).toEqual(['Cameras near: 1, fixed']));
  it('nothing near: only the code line', () => expect(gatherIntel(at, info, [], []).lines).toEqual(['Code: Lab door 4471']));
  it('no codes: no Code line', () => expect(gatherIntel(at, { lines: ['x'] }, [cam(5, 2.6, 8)], []).lines).toEqual(['Cameras near: 1, sweep 8 s']));
  it('every line fits the feed', () => {
    const long: GuardIntel = { lines: ['x'], codes: [{ flag: 'a', label: 'x'.repeat(INTEL.labelMax) }] };
    const r = gatherIntel(at, long, [cam(5, 2.6, 8)], []);
    for (const l of r.lines) expect(l.length).toBeLessThanOrEqual(INTEL.lineMax);
  });
});

describe('codes and the end of an interrogation', () => {
  it('intelCodes', () => expect(intelCodes({ lines: ['a'] })).toEqual([]));
  it('checkIntel', () => {
    expect(checkIntel({ lines: ['a'], codes: [{ flag: 'f', label: 'x'.repeat(41) }] })).toHaveLength(1);
    expect(checkIntel({ lines: ['a'], codes: [{ flag: 'f', label: 'a' }, { flag: 'f', label: 'b' }] })).toHaveLength(1);
    expect(checkIntel(info)).toEqual([]);
  });
  it('interrogationEnded', () => {
    expect(interrogationEnded(0.97, 0)).toBe(true);
    expect(interrogationEnded(0.97, 2)).toBe(false);
    expect(interrogationEnded(0.5, 2)).toBe(false);
    expect(interrogationEnded(0, 0)).toBe(true);
    expect(interrogationEnded(-1, 0)).toBe(false);
    expect(interrogationEnded(-1, 2)).toBe(false);
  });
  it("interrogationEnded: a host frame that missed the read's tail still sees its end", () => {
    // (joint-flake-3) the host saw ph 0.4, then its next frame has the bit dropped (the 0.4..1 tail fell between frames)
    expect(interrogationEnded(0.4, 2)).toBe(false);
    expect(interrogationEnded(0.4, 0)).toBe(true);
  });
});

// (batch-23) patrol timing through the Guard AI getter `Enemy.patrolRoute` (master 4.74.0): an Enemy is a PatrolSource
// (checked by tsc here, no runtime import of the Babylon-backed class), and intelGuard reads the route off it.
export const enemyIsPatrolSource = (e: Enemy): PatrolSource => e;

describe('patrol timing from the patrolRoute getter', () => {
  const src = (x: number, route: PatrolRoute | null, o: Partial<{ ko: boolean; taken: boolean; alive: boolean; quadruped: boolean }> = {}): PatrolSource => ({
    pos: { x, y: 0, z: 0 },
    alive: o.alive ?? true,
    ko: o.ko ?? false,
    taken: o.taken ?? false,
    def: { walkSpeed: 2, quadruped: o.quadruped ?? false },
    patrolRoute: route,
  });
  it('intelGuard: the route and the patrol pace', () => {
    const g = intelGuard(src(5, square), 1.1);
    expect(g.route).toBe(square);
    expect(g.speed).toBeCloseTo(2.2, 9);
    expect(g.up).toBe(true);
    expect([g.x, g.y, g.z]).toEqual([5, 0, 0]);
  });
  it('a post (null route), KO, held, dead or a dog: no patrol', () => {
    expect(intelGuard(src(5, null), 1).route).toBeNull();
    for (const o of [{ ko: true }, { taken: true }, { alive: false }, { quadruped: true }]) expect(intelGuard(src(5, square, o), 1).up).toBe(false);
  });
  it('gatherIntel on getter-fed guards: loop times from their routes', () => {
    const timed: PatrolRoute = { points: [[0, 0], [5, 0]], loop: { period: 42, leave: [0], t0: 0 } };
    const gs = [src(5, line), src(6, timed), src(7, null), src(8, square, { ko: true }), src(60, line)].map((e) => intelGuard(e, 1));
    const r = gatherIntel(at, { lines: ['x'] }, [], gs);
    expect(r.patrols).toBe(2);
    expect(r.lines).toEqual(['Patrols near: 2, loop 20-42 s']); // line: 2 x 10 m at 2 m/s + two 5 s waits; timed: its period
  });
});
