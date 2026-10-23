import { describe, expect, it } from 'vitest';
import { throwArc, throwArcVy, throwKoHit, throwLanding } from '../src/game/teamMoves';
import { TEAM } from '../src/config/movement';
import { ThrowKo, type ThrowKoGuard } from '../src/net/throwKo';

// (throw-ko, spare job 3) CT: the thrown partner landing on a guard knocks him out. The landing-hit decision (pure) and
// the host's watch over a throw in flight (the unit-level host test: what CoopHost runs each fixed step).

const DT = 1 / 60;

interface Guard extends ThrowKoGuard {
  pos: { x: number; y: number; z: number };
  alive: boolean;
  taken: boolean;
}
const guard = (id: string, x: number, y: number, z: number, o: Partial<Guard> = {}): Guard => ({ id, pos: { x, y, z }, alive: true, taken: false, ...o });

/** A throw: the runner at (0, 0, -1) runs into the thrower at the origin and is thrown on along +z (lands at z 3.2). */
function fly(guards: Guard[], opts: { alive?: () => boolean; until?: number } = {}): { hits: [string, string, number, number, number][]; ko: ThrowKo<Guard> } {
  const hits: [string, string, number, number, number][] = [];
  const ko = new ThrowKo<Guard>(opts.alive ?? (() => true), (by, g, at) => {
    hits.push([by, g.id, at.x, at.y, at.z]);
    g.alive = false; // knocked out: the game's own path takes him down
  });
  const l = throwLanding(0, -1, 0, 0, 0, { x: 0, z: 0, dx: 0, dz: 0 });
  ko.start('p2', 10, 0, 0, -1, l.x, 0, l.z);
  for (let t = 10; t <= 10 + (opts.until ?? 1.3) && ko.active; t += DT) ko.step(t, guards);
  return { hits, ko };
}

describe('throw-ko: the landing-hit decision (pure)', () => {
  it('the arc is descending after its apex and on the landing, rising before it', () => {
    expect(throwArcVy(0, 0, 0)).toBeGreaterThan(0);
    expect(throwArcVy(TEAM.throwTime * 0.25, 0, 0)).toBeGreaterThan(0);
    expect(throwArcVy(TEAM.throwTime * 0.75, 0, 0)).toBeLessThan(0);
    expect(throwArcVy(TEAM.throwTime, 0, 0)).toBeLessThan(0);
    // a landing 1 m lower turns over earlier
    expect(throwArcVy(TEAM.throwTime * 0.5, 0, -1)).toBeLessThan(0);
  });

  it('throwArcVy is the arc height over time (finite difference)', () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    for (const k of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const t = k * TEAM.throwTime;
      const h = 1e-4;
      throwArc(t - h, 0, 0.2, 0, 0, -0.6, 3, a);
      throwArc(t + h, 0, 0.2, 0, 0, -0.6, 3, b);
      expect(throwArcVy(t, 0.2, -0.6)).toBeCloseTo((b.y - a.y) / (2 * h), 3);
    }
  });

  it('descending feet over a guard\'s head / shoulders take him down', () => {
    expect(throwKoHit(0, 1.4, 0, -3, 0, 0, 0)).toBe(true);
    expect(throwKoHit(0.5, 1.0, 0.3, -3, 0, 0, 0)).toBe(true);
    // a guard on a floor 1 m up: the band rides with his feet
    expect(throwKoHit(0, 2.4, 0, -3, 0, 1, 0)).toBe(true);
    expect(throwKoHit(0, 1.2, 0, -3, 0, 1, 0)).toBe(false);
  });

  it('rising, beside him, over his head or already at his feet is no hit', () => {
    expect(throwKoHit(0, 1.4, 0, 2, 0, 0, 0)).toBe(false);
    expect(throwKoHit(0, 1.4, 0, 0, 0, 0, 0)).toBe(false);
    expect(throwKoHit(0, 1.4, 0, Number.NaN, 0, 0, 0)).toBe(false);
    expect(throwKoHit(TEAM.throwKoReach + 0.01, 1.4, 0, -3, 0, 0, 0)).toBe(false);
    expect(throwKoHit(0, TEAM.throwKoHigh + 0.01, 0, -3, 0, 0, 0)).toBe(false);
    expect(throwKoHit(0, TEAM.throwKoLow - 0.01, 0, -3, 0, 0, 0)).toBe(false);
  });

  it('the band edges are inclusive', () => {
    expect(throwKoHit(TEAM.throwKoReach, 1, 0, -1, 0, 0, 0)).toBe(true);
    expect(throwKoHit(0, TEAM.throwKoHigh, 0, -1, 0, 0, 0)).toBe(true);
    expect(throwKoHit(0, TEAM.throwKoLow, 0, -1, 0, 0, 0)).toBe(true);
  });
});

describe('throw-ko: the host watch over a throw in flight', () => {
  it('a guard standing on the landing is knocked out on the way down, once', () => {
    const g = guard('e1', 0, 0, 3.2);
    const { hits, ko } = fly([g]);
    expect(hits.length).toBe(1);
    expect(hits[0]![0]).toBe('p2');
    expect(hits[0]![1]).toBe('e1');
    // the feet were on his head / shoulders, in reach
    expect(hits[0]![3]).toBeGreaterThanOrEqual(TEAM.throwKoLow);
    expect(hits[0]![3]).toBeLessThanOrEqual(TEAM.throwKoHigh);
    expect(Math.abs(hits[0]![4] - 3.2)).toBeLessThanOrEqual(TEAM.throwKoReach + 1e-9);
    expect(ko.ko).toBe(1);
    expect(ko.active).toBe(false);
  });

  it('a guard just off the line of the landing, or a step short of it, is knocked out too', () => {
    expect(fly([guard('e1', 0.35, 0, 3.2)]).hits.length).toBe(1);
    expect(fly([guard('e1', 0, 0, 2.2)]).hits.length).toBe(1);
  });

  it('one guard per throw: the first the body comes down on', () => {
    const a = guard('near', 0, 0, 2.6);
    const b = guard('far', 0, 0, 3.2);
    const { hits } = fly([b, a]);
    expect(hits.length).toBe(1);
    expect(hits[0]![1]).toBe('near');
    expect(b.alive).toBe(true);
  });

  it('a guard past the landing, under the rising half or off to the side is left standing', () => {
    expect(fly([guard('past', 0, 0, 4.6)]).hits.length).toBe(0);
    expect(fly([guard('rise', 0, 0, 0.4)]).hits.length).toBe(0);
    expect(fly([guard('side', 1.2, 0, 3.2)]).hits.length).toBe(0);
  });

  it('a guard already down or seized by a takedown is not a target', () => {
    expect(fly([guard('dead', 0, 0, 3.2, { alive: false })]).hits.length).toBe(0);
    expect(fly([guard('held', 0, 0, 3.2, { taken: true })]).hits.length).toBe(0);
  });

  it('a thrown player downed in the air takes nobody down', () => {
    const { hits, ko } = fly([guard('e1', 0, 0, 3.2)], { alive: () => false });
    expect(hits.length).toBe(0);
    expect(ko.active).toBe(false);
  });

  it('the watch ends at the landing (a guard walking in afterwards is safe)', () => {
    const ko = new ThrowKo<Guard>(() => true, () => {
      throw new Error('no hit expected');
    });
    ko.start('p2', 0, 0, 0, -1, 0, 0, 3.2);
    ko.step(TEAM.throwTime + 0.5, []);
    expect(ko.active).toBe(false);
    ko.step(TEAM.throwTime + 0.6, [guard('late', 0, 0, 3.2)]);
    expect(ko.ko).toBe(0);
  });

  it('a new throw by the same player replaces its flight; two players fly at once', () => {
    const ko = new ThrowKo<Guard>(() => true, () => undefined);
    ko.start('p1', 0, 0, 0, -1, 0, 0, 3.2);
    ko.start('p1', 0.5, 0, 0, -1, 0, 0, 3.2);
    ko.start('p2', 0.5, 10, 0, -1, 10, 0, 3.2);
    const hits: string[] = [];
    const ko2 = new ThrowKo<Guard>(() => true, (by) => hits.push(by));
    ko2.start('p1', 0, 0, 0, -1, 0, 0, 3.2);
    ko2.start('p2', 0, 10, 0, -1, 10, 0, 3.2);
    const gs = [guard('a', 0, 0, 3.2), guard('b', 10, 0, 3.2)];
    for (let t = 0; t <= 1.2 && ko2.active; t += DT) ko2.step(t, gs);
    expect(hits.sort()).toEqual(['p1', 'p2']);
    expect(ko.active).toBe(true);
  });
});
