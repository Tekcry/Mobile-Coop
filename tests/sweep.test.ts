import { describe, expect, it } from 'vitest';
import { SWEEP, sweepPoints, sweepStart } from '../src/ai/gear';
import { pointBusy, SweepTeam } from '../src/ai/sweepTeam';

// (guard-ai S11) the response team's sweep: route points and posts thinned to one per 8 m, nearest to the LKP first
// (research item 11).

type Pt = [number, number];
const pairs = (flat: readonly number[]): Pt[] => {
  const o: Pt[] = [];
  for (let i = 0; i < flat.length; i += 2) o.push([flat[i]!, flat[i + 1]!]);
  return o;
};

describe('sweepPoints', () => {
  it('thins: the first point within 8 m is kept, later ones near it are dropped', () => {
    const out: number[] = [];
    const n = sweepPoints([[[0, 0], [3, 0], [20, 0]], [[0, 7.9], [0, 30]]], [], 0, 0, SWEEP.thin, out);
    expect(n).toBe(3);
    expect(pairs(out)).toEqual([[0, 0], [20, 0], [0, 30]]);
  });
  it('a point exactly thin metres away is kept', () => {
    const out: number[] = [];
    expect(sweepPoints([[[0, 0], [8, 0]]], [], 0, 0, 8, out)).toBe(2);
  });
  it('routes come first, then posts: a post near a route point is dropped, a far one kept', () => {
    const out: number[] = [];
    const n = sweepPoints([[[10, 10]]], [[12, 10], [40, 10]], 10, 10, SWEEP.thin, out);
    expect(n).toBe(2);
    expect(pairs(out)).toEqual([[10, 10], [40, 10]]);
  });
  it('orders the kept points nearest to the LKP first, into flat x, z pairs', () => {
    const out: number[] = [99, 99, 99];
    const n = sweepPoints([[[0, 0], [20, 0], [40, 0], [60, 0]]], [], 38, 0, SWEEP.thin, out);
    expect(n).toBe(4);
    expect(out.length).toBe(8);
    expect(pairs(out)).toEqual([[40, 0], [20, 0], [60, 0], [0, 0]]);
  });
  it('ties keep gather order', () => {
    const out: number[] = [];
    sweepPoints([[[-10, 0], [10, 0], [0, 10], [0, -10]]], [], 0, 0, 5, out);
    expect(pairs(out)).toEqual([[-10, 0], [10, 0], [0, 10], [0, -10]]);
  });
  it('empty data gives no points and an empty out', () => {
    const out: number[] = [1, 2];
    expect(sweepPoints([], [], 0, 0, 8, out)).toBe(0);
    expect(out).toEqual([]);
    expect(sweepPoints([[]], [], 0, 0, 8, out)).toBe(0);
  });
  it('thin 0 keeps every distinct point', () => {
    const out: number[] = [];
    expect(sweepPoints([[[0, 0], [0.1, 0], [0, 0.1]]], [], 0, 0, 0, out)).toBe(3);
  });
});

describe('sweepStart', () => {
  it('spreads teams about a third of the loop apart and wraps', () => {
    expect(sweepStart(0, 9)).toBe(0);
    expect(sweepStart(1, 9)).toBe(3);
    expect(sweepStart(2, 9)).toBe(6);
    expect(sweepStart(3, 9)).toBe(0);
    expect(sweepStart(1, 10)).toBe(4);
  });
  it('count 0, below 0 or 1: always 0; always inside 0..count-1', () => {
    expect(sweepStart(5, 0)).toBe(0);
    expect(sweepStart(5, -2)).toBe(0);
    expect(sweepStart(5, NaN)).toBe(0);
    expect(sweepStart(0, 1)).toBe(0);
    expect(sweepStart(7, 1)).toBe(0);
    for (let team = 0; team < 8; team++) {
      for (let count = 1; count < 12; count++) {
        const s = sweepStart(team, count);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(count);
      }
    }
  });
  it('a negative or fractional team is floored at 0', () => {
    expect(sweepStart(-3, 9)).toBe(0);
    expect(sweepStart(NaN, 9)).toBe(0);
    expect(sweepStart(1.9, 9)).toBe(3);
  });
});

// (coop4 AI5, A177) two or more teams in one section: starts spread over the section's most teams, and a team passes
// over a point another sweeping team holds (all held: it goes anyway). 1-2 players: no peers, today.
describe('coop4 AI5: sweep spacing between teams', () => {
  it('sweepStart with spread 3 (or less) is today exactly', () => {
    for (let team = 0; team < 8; team++) {
      for (let count = 1; count < 14; count++) {
        const today = (team * Math.max(1, Math.ceil(count / 3))) % count;
        expect(sweepStart(team, count)).toBe(today);
        expect(sweepStart(team, count, 3)).toBe(today);
        expect(sweepStart(team, count, 2)).toBe(today);
      }
    }
  });
  it('spread 6: six teams start on six distinct points (team 3 no longer on team 0)', () => {
    for (let count = 6; count < 20; count++) {
      const starts = [0, 1, 2, 3, 4, 5].map((t) => sweepStart(t, count, 6));
      expect(new Set(starts).size).toBe(6);
      for (const s of starts) expect(s).toBeLessThan(count);
    }
    expect([0, 1, 2, 3, 4, 5].map((t) => sweepStart(t, 12, 6))).toEqual([0, 2, 4, 6, 8, 10]);
    // today's thirds put team 3 on team 0's point
    expect(sweepStart(3, 12)).toBe(sweepStart(0, 12));
    expect(sweepStart(5, 0, 6)).toBe(0);
  });
});

describe('coop4 AI5: pointBusy and the dedupe', () => {
  const line = (): Pt[] => [[0, 0], [20, 0], [40, 0], [60, 0]];
  const member = () => ({ alive: true, taken: false, pos: { x: 0, z: 0 }, aware: { level: 'searching', t: 0 }, teamRank: -1 });
  function team(index: number, section = 0) {
    const t = new SweepTeam(index, section, line(), [], []);
    t.add(member());
    return t;
  }

  it('busy: another sweeping team of the section heads for a point within SWEEP.thin', () => {
    const a = team(0);
    const b = team(1);
    b.begin(40, 0, 40, 0);
    expect(b.sweeping).toBe(true);
    // b's start (sweepStart(1, 4) = 2): the third point of the list ordered from (40, 0)
    const bi = b.point;
    const bx = b.pts[2 * bi]!;
    const bz = b.pts[2 * bi + 1]!;
    expect(pointBusy(bx, bz, [a, b], a)).toBe(true);
    expect(pointBusy(bx + SWEEP.thin - 0.1, bz, [a, b], a)).toBe(true);
    expect(pointBusy(bx + SWEEP.thin + 0.1, bz, [a, b], a)).toBe(false);
    // never itself; not another section's; not a team that is not sweeping
    expect(pointBusy(bx, bz, [b], b)).toBe(false);
    const c = team(0, 1);
    expect(pointBusy(bx, bz, [b], c)).toBe(false);
    b.sweeping = false;
    expect(pointBusy(bx, bz, [a, b], a)).toBe(false);
  });

  it("next() passes over the point another team holds; without peers (1-2 players) it does not", () => {
    for (const on of [true, false]) {
      const a = team(0);
      const b = team(1);
      a.peers = on ? [a, b] : null;
      a.begin(0, 0, 0, 0);
      expect(a.pts).toEqual([0, 0, 20, 0, 40, 0, 60, 0]);
      expect(a.point).toBe(0);
      // b sweeps and heads for (20, 0): a's next point
      b.begin(0, 0, 0, 0);
      b.start = 1;
      expect([b.pts[2 * b.point], b.pts[2 * b.point + 1]]).toEqual([20, 0]);
      a.next();
      expect(a.point).toBe(on ? 2 : 1);
      expect(a.busySkips).toBe(on ? 1 : 0);
      expect(a.visited).toBe(1);
    }
  });

  it('every point held: the next one anyway', () => {
    const a = team(0);
    a.begin(0, 0, 0, 0);
    // three teams on the other three points
    const others = [1, 2, 3].map((k) => {
      const o = team(k);
      o.begin(0, 0, 0, 0);
      o.start = k;
      return o;
    });
    // and one on a's own point
    const own = team(4);
    own.begin(0, 0, 0, 0);
    own.start = 0;
    a.peers = [a, ...others, own];
    a.next();
    expect(a.point).toBe(1);
    expect(a.passes).toBe(0);
  });

  it("begin(): a start point another team holds moves to the next free one", () => {
    const b = team(0);
    b.begin(0, 0, 0, 0);
    expect(b.point).toBe(0);
    const a = team(3);
    a.peers = [a, b];
    // today's thirds: team 3 of 4 points starts on point 2 (ceil(4 / 3) = 2, 6 % 4 = 2), which b holds
    expect(sweepStart(3, 4)).toBe(2);
    b.start = 2;
    a.begin(0, 0, 0, 0);
    expect(a.point).toBe(3);
    expect(a.busySkips).toBe(1);
  });

  it('the stall skip (#302) still gives a point up with the dedupe on', () => {
    const a = team(0);
    const b = team(1);
    a.peers = [a, b];
    a.begin(0, 0, 0, 0);
    a.next(); // on to (20, 0)
    expect(a.point).toBe(1);
    // held 50 m short with no progress: replan at SWEEP.stall, give up at 2 x SWEEP.stall
    const dt = 0.1;
    for (let k = 0; k < Math.ceil((2 * SWEEP.stall) / dt) + 4; k++) a.lead(dt, 20, 50, 50);
    expect(a.skipped).toBe(1);
    expect(a.point).toBe(2);
  });
});
