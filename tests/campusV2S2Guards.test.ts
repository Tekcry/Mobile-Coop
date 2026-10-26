/**
 * (campus-greybox S2-G6a, `docs/campus-greybox/briefs/S2.md` section 6) Section 2's 18 guards in the v2 data
 * (`campusV2/s2Data.ts`, `S2-detail.md:247-276`): kinds and guns, floors, posts, none dormant, every patrol cycle 25-45 s
 * (LD 4.3, the live `tests/campusS2.test.ts` cycle check ported), the kitchen pair's loop, and the live cap. Pure data.
 */
import { describe, expect, it } from 'vitest';
import { S2_GUARDS, S2_SECTOR } from '../src/world/maps/campusV2/s2Data';
import { SECTOR, checkSectorGuards, type SectorGuard } from '../src/game/sectors';
import { ENEMIES } from '../src/ai/enemyDefs';
import { PATROL } from '../src/ai/patrol';
import { CHECK_PATROL_PACE } from '../src/game/sectorCheck';
import { hyp2 } from '../src/core/mathx';

const PI = Math.PI;
const G = S2_GUARDS;
/** The plan's guard numbers in list order (#1-#14, then #18-#21). */
const NUM = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 18, 19, 20, 21];
const floorOf = (g: { y?: number }): number => g.y ?? 0;

/** A guard's patrol cycle (s): the walk at the check pace plus the pauses; a timed loop is its master clock's period. */
function cycle(g: SectorGuard): number | null {
  const r = g.route;
  if (!r || r.length < 2) return null;
  if (g.loop) return g.loop.period;
  const speed = ENEMIES[g.kind].walkSpeed * CHECK_PATROL_PACE;
  const n = r.length;
  const order: number[] = [];
  if (n < 3) {
    for (let i = 0; i < n; i++) order.push(i);
    for (let i = n - 2; i >= 1; i--) order.push(i);
  } else for (let i = 0; i < n; i++) order.push(i);
  let t = 0;
  for (let k = 0; k < order.length; k++) {
    const idx = order[k]!;
    if (k > 0) {
      const q = r[order[k - 1]!]!;
      t += hyp2(r[idx]![0] - q[0], r[idx]![1] - q[1]) / speed;
    }
    t += g.waits?.[idx] ?? g.wait ?? PATROL.wait;
  }
  const a = r[order[order.length - 1]!]!;
  const f = r[order[0]!]!;
  return t + hyp2(f[0] - a[0], f[1] - a[1]) / speed;
}

describe('S2-G6a the 18 guards (C7)', () => {
  it('18 guards: kinds and guns as the D table (officer = pistolSd, grunt = rifle), no dogs; checkSectorGuards passes', () => {
    expect(G.length).toBe(18);
    expect(S2_SECTOR.guards).toBe(G);
    const kinds = ['officer', 'grunt', 'officer', 'grunt', 'grunt', 'officer', 'officer', 'grunt', 'officer', 'grunt', 'officer', 'grunt', 'grunt', 'officer', 'grunt', 'officer', 'officer', 'grunt'];
    expect(G.map((g) => g.kind)).toEqual(kinds);
    expect(G.map((g) => ENEMIES[g.kind].gun)).toEqual(kinds.map((k) => (k === 'officer' ? 'pistolSd' : 'rifle')));
    expect(checkSectorGuards(S2_SECTOR)).toEqual([]);
    expect(S2_SECTOR.dogs ?? 0).toBe(0);
  });

  it('floors per entry; every guard has a role, a zone, a reason and a squad (0 G, 1 east wing, 2 L1 plan, 3 L2)', () => {
    expect(G.map(floorOf)).toEqual([0, 0, 4.4, 8.4, 4.4, 4.4, 4.4, 4.4, 8.4, 8.4, 4.4, 0, 0, 0, 4.4, 4.4, 4.4, 8.4]);
    G.forEach((g, i) => {
      const n = `#${NUM[i]}`;
      expect(g.role, n).toBeTruthy();
      expect(g.zone, n).toBeTruthy();
      expect((g.reason ?? '').length, n).toBeGreaterThan(8);
      expect(g.squad, n).toBe(floorOf(g) === 8.4 ? 3 : floorOf(g) === 0 ? 0 : ['comms', 'facilities', 'c2', 'wing'].includes(g.zone!) ? 1 : 2);
    });
  });

  it('posts: #1, #11, #12 (no route); none dormant; #11 is K2 at (1.5, 4.4, -15.8) facing the comms door (yaw 0), leash 5, guards c2-door', () => {
    expect(G.flatMap((g, i) => (g.route ? [] : [NUM[i]]))).toEqual([1, 11, 12]);
    expect(G.filter((g) => g.dormant).length).toBe(0);
    const k2 = G[10]!;
    expect([k2.x, k2.y, k2.z, k2.yaw]).toEqual([1.5, 4.4, -15.8, 0]);
    expect(k2.post).toEqual({ leash: 5, guards: 'c2-door' });
    expect(k2.takedownSpot).toEqual([1.5, -16.5]);
    expect(k2.role).toBe('posted');
    expect(G[11]!).toMatchObject({ x: -42.5, z: -16, yaw: PI / 2 });
  });

  it('the D table slots and routes (Q2 defaults) and BA11 / BA12', () => {
    const at = (n: number): SectorGuard => G[NUM.indexOf(n)]!;
    expect(at(8).route).toEqual([[-4, -1.5], [2.2, -6.5], [-4, -14.5]]);
    expect(at(8).waits).toEqual([3, 7, 3]);
    expect(at(8).takedownSpot).toEqual([2.2, -6.5]);
    expect(at(13).route).toEqual([[-20, 2], [-2, 2]]);
    expect(at(13).takedownSpot).toEqual([-2, 2]);
    expect(at(14).route).toEqual([[-19, -8.5], [-17, -8.5]]);
    expect(at(14).waits).toEqual([12, 12]);
    expect(at(14).faces).toEqual([PI - 1.05, PI + 1.05]);
    expect(at(14).takedownSpot).toEqual([-18, -8.5]);
    expect(at(18).route).toEqual([[-38, -21], [-33, -16], [-32, -8]]);
    expect(at(18).takedownSpot).toEqual([-32, -8]);
    expect(at(19).route).toEqual([[-39, -1.5], [-22, -1.5]]);
    expect(at(19).takedownSpot).toEqual([-39, -1.5]);
    expect(at(20).route).toEqual([[1.2, -2.7], [-4.5, -2.2]]);
    expect(at(20).waits).toEqual([7, 7]);
    expect(at(20).takedownSpot).toEqual([1.2, -2.7]);
    expect(at(21).route).toEqual([[-27, -1.5], [-9, -1.5]]);
    expect(at(21).takedownSpot).toEqual([-9, -1.5]);
    // BA11: each new guard's first yaw faces his second route point; faces only where the plan gives them (#14)
    for (const n of [13, 14, 18, 19, 20, 21]) {
      const g = at(n);
      const r = g.route!;
      expect(g.yaw, `#${n}`).toBeCloseTo(Math.atan2(r[1]![0] - r[0]![0], r[1]![1] - r[0]![1]));
      expect(hyp2(r[0]![0] - g.x, r[0]![1] - g.z), `#${n} starts on his route`).toBeLessThan(0.1);
      if (n !== 14) expect(g.faces, `#${n}`).toBeUndefined();
    }
  });

  it('every patrol cycle is 25-45 s (LD 4.3; walk speed x CHECK_PATROL_PACE, loops closed)', () => {
    const out: string[] = [];
    G.forEach((g, i) => {
      const c = cycle(g);
      if (c === null) return;
      out.push(`#${NUM[i]} ${c.toFixed(1)}`);
      expect(c, `#${NUM[i]} cycle ${c}`).toBeGreaterThanOrEqual(25);
      expect(c, `#${NUM[i]} cycle ${c}`).toBeLessThanOrEqual(45);
    });
    expect(out.length).toBe(15);
    // the brief's numbers for the new and moved rounds
    const at = (n: number): number => cycle(G[NUM.indexOf(n)]!)!;
    expect(at(8)).toBeCloseTo(44.4, 0);
    expect(at(13)).toBeCloseTo(44.4, 0);
    expect(at(14)).toBeCloseTo(28.3, 0);
    expect(at(18)).toBeCloseTo(41.7, 0);
    expect(at(19)).toBeCloseTo(44.4, 0);
    expect(at(20)).toBeCloseTo(26.2, 0);
    expect(at(21)).toBeCloseTo(44.4, 0);
  });

  it('the pair loop (#5, #6): the same clock, the slower walker fits every leg, stops of 3-6 s', () => {
    for (const k of [4, 5]) {
      const g = G[k]!;
      const lp = g.loop!;
      const speed = ENEMIES[g.kind].walkSpeed;
      const r = g.route!;
      for (let i = 0; i < r.length; i++) {
        const prev = (i + r.length - 1) % r.length;
        const leg = hyp2(r[i]![0] - r[prev]![0], r[i]![1] - r[prev]![1]) / speed;
        const gap = (((lp.leave[i]! - lp.leave[prev]!) % lp.period) + lp.period) % lp.period;
        expect(gap - leg, `#${k + 1} stop ${i}`).toBeGreaterThanOrEqual(3);
        expect(gap - leg, `#${k + 1} stop ${i}`).toBeLessThanOrEqual(6.2);
      }
    }
    expect(G[4]!.loop).toEqual(G[5]!.loop);
    expect(G[4]!.pair).toBe(5);
    expect(G[5]!.pair).toBe(4);
  });

  it('the live cap: 18 guards + alarmMax 3 x perStage 2 = 24, within maxAlive 32; reinforce points unchanged', () => {
    expect(S2_SECTOR.perStage).toBe(2);
    expect(G.length + SECTOR.alarmMax * S2_SECTOR.perStage).toBe(24);
    expect(G.length + SECTOR.alarmMax * S2_SECTOR.perStage).toBeLessThanOrEqual(SECTOR.maxAlive);
    expect(S2_SECTOR.reinforce).toEqual([[-40, -16.5], [-36, -7]]);
  });
});
