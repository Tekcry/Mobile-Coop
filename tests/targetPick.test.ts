import { describe, expect, it } from 'vitest';
import { CALM_KEEP, MAX_INTRUDERS, mayBeSeen, nearestTarget, PERCEIVE, perceiveOrder, pickTarget, TARGETS } from '../src/ai/targetPick';
import { sightRate, type SightInput } from '../src/ai/perception';

// (guard-ai S23) Co-op perception, the pure part: `mayBeSeen` (no ray for a player a calm guard cannot see) agrees with
// `sightRate > 0`, and `pickTarget` picks the best-seen player when calm and keeps the one he fights in combat.

const D = (...v: number[]) => Float64Array.from(v);
const L = (...v: number[]) => Uint8Array.from(v);
const X = Infinity;

describe('mayBeSeen', () => {
  it('agrees with sightRate > 0 on a grid (dist 0-30, angle -pi..pi, speed 0 / 1 / 4; exposure 1, light 1): no false "no"', () => {
    const si: SightInput = { dist: 0, angle: 0, light: 1, crouched: false, speed: 0, exposure: 1, sensitivity: 1, pitch: 0 };
    let checked = 0;
    let yes = 0;
    for (const speed of [0, 1, 4]) {
      for (const crouched of [false, true]) {
        for (let d = 0; d <= 30; d += 0.25) {
          for (let a = -Math.PI; a <= Math.PI + 1e-9; a += Math.PI / 90) {
            si.dist = d;
            si.angle = a;
            si.speed = speed;
            si.crouched = crouched;
            const seen = sightRate(si) > 0;
            expect(mayBeSeen(d, a, speed, false, false), `d ${d} a ${a.toFixed(3)} v ${speed} c ${crouched}`).toBe(seen);
            checked++;
            if (seen) yes++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(40000);
    expect(yes).toBeGreaterThan(1000);
  });

  it('a calm guard: behind him beyond the close range, or past the field range, is a "no"; alerted guards and dogs always pass', () => {
    expect(mayBeSeen(15, Math.PI, 4, false, false)).toBe(false);
    expect(mayBeSeen(26, 0, 1, false, false)).toBe(false);
    expect(mayBeSeen(13, 1.5, 1, false, false)).toBe(false);
    expect(mayBeSeen(9, 0, 0, false, false)).toBe(true);
    // felt close by from behind: a walk, not a sneak
    expect(mayBeSeen(1, Math.PI, 1.5, false, false)).toBe(true);
    expect(mayBeSeen(1, Math.PI, 0.5, false, false)).toBe(false);
    expect(mayBeSeen(15, Math.PI, 0, true, false)).toBe(true);
    expect(mayBeSeen(40, Math.PI, 0, false, true)).toBe(true);
  });
});

describe('pickTarget', () => {
  it('calm: the highest rate wins; nobody seen: the nearest', () => {
    expect(pickTarget(2, false, -1, -1, L(0, 1), D(0.1, 0.9), D(4, 9))).toBe(1);
    expect(pickTarget(2, false, -1, -1, L(1, 1), D(1.2, 0.4), D(6, 3))).toBe(0);
    expect(pickTarget(3, false, -1, -1, L(0, 0, 0), D(0, 0, 0), D(7, 3, 5))).toBe(1);
  });

  it('(polish C1, A169) calm: keeps cur until another rate beats his by CALM_KEEP (1.25); solo unchanged', () => {
    expect(CALM_KEEP).toBe(1.25);
    // near-equal rates: cur stays, whichever he is (no swap every think)
    expect(pickTarget(2, false, 0, -1, L(1, 1), D(1.0, 1.1), D(6, 4))).toBe(0);
    expect(pickTarget(2, false, 1, -1, L(1, 1), D(1.1, 1.0), D(4, 6))).toBe(1);
    // equal rates, the other nearer: cur stays (before: the nearer)
    expect(pickTarget(2, false, 0, -1, L(1, 1), D(0.5, 0.5), D(6, 4))).toBe(0);
    // clearly better seen: switch
    expect(pickTarget(2, false, 0, -1, L(1, 1), D(1.0, 1.3), D(6, 4))).toBe(1);
    // exactly 1.25 x is not "beats": stays
    expect(pickTarget(2, false, 0, -1, L(1, 1), D(2, 2.5), D(6, 4))).toBe(0);
    // cur not seen any more (rate 0) or dead: the best seen
    expect(pickTarget(2, false, 0, -1, L(0, 1), D(0, 0.2), D(6, 4))).toBe(1);
    expect(pickTarget(2, false, 0, -1, L(1, 1), D(1.0, 0.9), D(X, 4))).toBe(1);
    // cur out of range: ignored
    expect(pickTarget(2, false, 3, -1, L(1, 1), D(1.0, 1.1), D(6, 4))).toBe(1);
    // solo: the one seen, as before
    expect(pickTarget(1, false, 0, -1, L(1), D(0.4), D(5))).toBe(0);
    expect(pickTarget(1, false, -1, -1, L(1), D(0.4), D(5))).toBe(0);
    // no cur (TARGETS.sticky false passes -1): the highest rate as before
    expect(pickTarget(2, false, -1, -1, L(1, 1), D(1.0, 1.1), D(6, 4))).toBe(1);
  });

  it('alerted: keeps cur while he has los; else the nearest visible; else hunt, then cur, then the nearest', () => {
    // cur 1 in sight, a nearer 0 also in sight: stays on 1
    expect(pickTarget(2, true, 1, -1, L(1, 1), D(0, 0), D(2, 9))).toBe(1);
    // cur 1 out of sight: the nearest visible
    expect(pickTarget(3, true, 1, -1, L(0, 0, 1), D(0, 0, 0), D(2, 4, 8))).toBe(2);
    expect(pickTarget(3, true, 1, -1, L(1, 0, 1), D(0, 0, 0), D(9, 4, 8))).toBe(2);
    // nobody visible: hunt when alive
    expect(pickTarget(3, true, 1, 2, L(0, 0, 0), D(0, 0, 0), D(2, 4, 8))).toBe(2);
    // hunt dead: cur
    expect(pickTarget(3, true, 1, 2, L(0, 0, 0), D(0, 0, 0), D(2, 4, X))).toBe(1);
    // hunt -1 and cur dead: the nearest
    expect(pickTarget(3, true, 1, -1, L(0, 0, 0), D(0, 0, 0), D(5, X, 3))).toBe(2);
    // no cur at all: the nearest visible, else the nearest
    expect(pickTarget(2, true, -1, -1, L(0, 1), D(0, 0), D(2, 6))).toBe(1);
    expect(pickTarget(2, true, -1, -1, L(0, 0), D(0, 0), D(2, 6))).toBe(0);
  });

  it('dead players (Infinity) are never picked; all dead: -1', () => {
    expect(pickTarget(2, false, -1, -1, L(1, 1), D(3, 0.5), D(X, 9))).toBe(1);
    expect(pickTarget(2, true, 0, -1, L(1, 1), D(0, 0), D(X, 9))).toBe(1);
    expect(pickTarget(2, true, 0, 0, L(0, 0), D(0, 0), D(X, 9))).toBe(1);
    expect(pickTarget(2, false, -1, -1, L(0, 0), D(0, 0), D(X, X))).toBe(-1);
    expect(pickTarget(2, true, 1, 0, L(0, 0), D(0, 0), D(X, X))).toBe(-1);
    expect(pickTarget(0, false, -1, -1, L(), D(), D())).toBe(-1);
  });

  it('ties: the nearer, then the lower index', () => {
    expect(pickTarget(3, false, -1, -1, L(1, 1, 1), D(0.5, 0.5, 0.5), D(6, 4, 4))).toBe(1);
    expect(pickTarget(2, false, -1, -1, L(1, 1), D(0.5, 0.5), D(4, 4))).toBe(0);
    expect(pickTarget(3, true, -1, -1, L(1, 1, 1), D(0, 0, 0), D(6, 4, 4))).toBe(1);
    expect(pickTarget(2, false, -1, -1, L(0, 0), D(0, 0), D(4, 4))).toBe(0);
  });

  it('TARGETS.all false gives the nearest (nearestTarget); the defaults are all and sticky; four players at most', () => {
    expect(TARGETS).toEqual({ all: true, sticky: true });
    expect(MAX_INTRUDERS).toBe(4);
    expect(nearestTarget(3, D(7, X, 3))).toBe(2);
    expect(nearestTarget(2, D(4, 4))).toBe(0);
    expect(nearestTarget(2, D(X, X))).toBe(-1);
  });
});

// (coop4 AI2) Perception over 4 players: `pickTarget` with n = 4, and the ray budget's order (`perceiveOrder`, A181).
describe('coop4 AI2: pickTarget with 4 players', () => {
  it('calm: the best rate of 4; equal rates: the nearer; nobody seen: the nearest', () => {
    expect(pickTarget(4, false, -1, -1, L(1, 1, 1, 1), D(0.2, 0.5, 0.9, 0.4), D(3, 5, 12, 7))).toBe(2);
    expect(pickTarget(4, false, -1, -1, L(1, 1, 1, 1), D(0.5, 0.5, 0.5, 0.5), D(9, 8, 4, 6))).toBe(2);
    expect(pickTarget(4, false, -1, -1, L(0, 0, 0, 0), D(0, 0, 0, 0), D(9, 8, 4, 6))).toBe(2);
    // a dead best (Infinity) never wins
    expect(pickTarget(4, false, -1, -1, L(1, 1, 1, 1), D(0.2, 0.5, 0.9, 0.4), D(3, 5, X, 7))).toBe(1);
  });

  it('alerted: sticky cur while seen; else the nearest seen; else hunt; else cur; else the nearest', () => {
    expect(pickTarget(4, true, 3, -1, L(1, 1, 1, 1), D(0, 0, 0, 0), D(2, 3, 4, 9))).toBe(3);
    expect(pickTarget(4, true, 3, -1, L(0, 1, 1, 0), D(0, 0, 0, 0), D(2, 6, 4, 9))).toBe(2);
    expect(pickTarget(4, true, 3, 1, L(0, 0, 0, 0), D(0, 0, 0, 0), D(2, 6, 4, 9))).toBe(1);
    expect(pickTarget(4, true, 3, 1, L(0, 0, 0, 0), D(0, 0, 0, 0), D(2, X, 4, 9))).toBe(3);
    expect(pickTarget(4, true, -1, -1, L(0, 0, 0, 0), D(0, 0, 0, 0), D(5, 6, 4, 9))).toBe(2);
  });

  it('ties go to the lower index (equal distances)', () => {
    expect(pickTarget(4, false, -1, -1, L(0, 0, 0, 0), D(0, 0, 0, 0), D(5, 4, 4, 4))).toBe(1);
    expect(pickTarget(4, true, -1, -1, L(0, 1, 1, 1), D(0, 0, 0, 0), D(5, 4, 4, 4))).toBe(1);
    expect(pickTarget(4, false, -1, -1, L(1, 1, 1, 1), D(0.3, 0.7, 0.7, 0.7), D(5, 4, 4, 4))).toBe(1);
  });
});

describe('coop4 AI2: perceiveOrder and the ray budget (A181)', () => {
  const out = new Int8Array(MAX_INTRUDERS);
  const order = (n: number, cur: number, hunt: number, dist: Float64Array, rr: number) => {
    const m = perceiveOrder(n, cur, hunt, dist, rr, out);
    return Array.from(out.subarray(0, m));
  };
  /** perceive's walk: start a player only while used + cost <= maxRays. */
  const started = (ord: number[], cost: number) => {
    const s: number[] = [];
    let used = 0;
    for (const i of ord) {
      if (used + cost > PERCEIVE.maxRays) continue;
      used += cost;
      s.push(i);
    }
    return { s, used };
  };

  it('cur first, then hunt, then the rest nearest first; dead players left out; cur = hunt once', () => {
    expect(order(4, -1, -1, D(9, 3, 6, 1), 0)).toEqual([3, 1, 2, 0]);
    expect(order(4, 2, -1, D(9, 3, 6, 1), 0)).toEqual([2, 3, 1, 0]);
    expect(order(4, 2, 0, D(9, 3, 6, 1), 0)).toEqual([2, 0, 3, 1]);
    expect(order(4, 2, 2, D(9, 3, 6, 1), 0)).toEqual([2, 3, 1, 0]);
    expect(order(4, -1, -1, D(9, X, 6, 1), 0)).toEqual([3, 2, 0]);
    // a dead cur / hunt is not put first (nor anywhere)
    expect(order(4, 1, 2, D(9, X, X, 1), 0)).toEqual([3, 0]);
    // equal distances: the lower index first
    expect(order(4, -1, -1, D(5, 5, 5, 5), 0)).toEqual([0, 1, 2, 3]);
  });

  it('rr rotates the tail only (cur and hunt stay first)', () => {
    expect(order(4, -1, -1, D(9, 3, 6, 1), 1)).toEqual([1, 2, 0, 3]);
    expect(order(4, -1, -1, D(9, 3, 6, 1), 5)).toEqual([1, 2, 0, 3]);
    expect(order(4, 2, 0, D(9, 3, 6, 1), 1)).toEqual([2, 0, 1, 3]);
    expect(order(4, 2, 0, D(9, 3, 6, 1), 2)).toEqual([2, 0, 3, 1]);
  });

  it('budget 9, 4 calm players (3 rays each): 3 started a think; in 4 thinks every one is started 3 times', () => {
    expect(PERCEIVE.maxRays).toBe(9);
    const dist = D(4, 9, 6, 12);
    const count = [0, 0, 0, 0];
    for (let rr = 0; rr < 4; rr++) {
      const { s, used } = started(order(4, -1, -1, dist, rr), 3);
      expect(s.length).toBe(3);
      expect(used).toBe(9);
      for (const i of s) count[i]!++;
    }
    expect(count).toEqual([3, 3, 3, 3]);
  });

  it('budget 9, 4 calm with a cur: cur every think, the other 3 share 2 places (each 2 in 3)', () => {
    const dist = D(4, 9, 6, 12);
    const count = [0, 0, 0, 0];
    for (let rr = 0; rr < 3; rr++) {
      const { s } = started(order(4, 1, -1, dist, rr), 3);
      expect(s[0]).toBe(1);
      for (const i of s) count[i]!++;
    }
    expect(count).toEqual([2, 3, 2, 2]);
  });

  it('budget 9, 4 alerted players (2 rays each): all 4 started, 8 rays, never capped', () => {
    for (let rr = 0; rr < 4; rr++) {
      const { s, used } = started(order(4, 2, 1, D(4, 9, 6, 12), rr), 2);
      expect(s.length).toBe(4);
      expect(used).toBe(8);
    }
  });

  it('1-2 players cost at most 6: the budget is never reached', () => {
    for (let n = 1; n <= 2; n++) expect(started(order(n, -1, -1, D(4, 9), 0), 3).s.length).toBe(n);
  });

  it('no allocation: the same out array, nothing returned but a count', () => {
    const o = new Int8Array(MAX_INTRUDERS);
    expect(perceiveOrder(4, -1, -1, D(1, 2, 3, 4), 3, o)).toBe(4);
    expect(Array.from(o)).toEqual([3, 0, 1, 2]);
  });
});
