import { describe, expect, it } from 'vitest';
import { SectorMode } from '../src/game/modes/sectorMode';
import { KILL_BASE, killScore } from '../src/game/modes/score';
import { NO_KILLS, SyncedDetector, newSectionStats, rateSection } from '../src/game/rating/sectionRating';
import { ENEMIES, type EnemyKind } from '../src/ai/enemyDefs';
import type { Enemy } from '../src/ai/enemy';
import type { HitInfo } from '../src/game/damage';

// (guard-rules S1, A5, M1, G348) The dog kill score through `SectorMode.onEnemyKilled` (Sector Ops' scoring): a killed
// dog lowers the score and counts as a kill (No kills and Perfect go); a gassed dog (`knockOut`, `e.ko` true) keeps
// today's +120, counts as a knock-out and leaves `kills` 0; other kinds score as before.

/** Sector Ops on its prototype: only what `onEnemyKilled` reads. */
function sector() {
  const m = Object.create(SectorMode.prototype) as SectorMode;
  const stats = { score: 0 };
  Object.assign(m, { g: { stats }, secStats: newSectionStats(), syncDet: new SyncedDetector(), t: 0 });
  return { m, stats };
}

const enemy = (kind: EnemyKind, ko: boolean): Enemy => ({ def: ENEMIES[kind], ko }) as unknown as Enemy;
const hit = (part: 'head' | 'body', kind: HitInfo['kind'] = 'bullet'): HitInfo => ({ part, kind, attackerId: 'local' }) as unknown as HitInfo;
/** Sector Ops scores at tier 2: x1.1. */
const tier2 = (base: number) => Math.round(base * 1.1);

describe('dog kill score (guard-rules S1, A5)', () => {
  it('a killed dog lowers the score (-120 x the tier, no headshot bonus) and counts as a kill', () => {
    const { m, stats } = sector();
    m.onEnemyKilled(enemy('dog', false), hit('body'));
    expect(stats.score).toBe(tier2(-120));
    m.onEnemyKilled(enemy('dog', false), hit('head'));
    expect(stats.score).toBe(2 * tier2(-120));
    expect([m.secStats.kills, m.secStats.knockouts, m.secStats.bodiesMade]).toEqual([2, 0, 2]);
    // a kill: No kills is gone from the section's marks (so no Perfect)
    expect(rateSection(m.secStats) & NO_KILLS).toBe(0);
  });

  it('a gassed dog (knocked out) scores as before, counts as a knock-out and keeps No kills', () => {
    const { m, stats } = sector();
    m.onEnemyKilled(enemy('dog', true), hit('body', 'explosion'));
    expect(stats.score).toBe(tier2(120));
    expect([m.secStats.kills, m.secStats.knockouts]).toEqual([0, 1]);
    expect(rateSection(m.secStats) & NO_KILLS).toBe(NO_KILLS);
  });

  it('other kinds score as before, killed or knocked out', () => {
    const { m, stats } = sector();
    m.onEnemyKilled(enemy('grunt', false), hit('head'));
    expect(stats.score).toBe(Math.round(100 * 1.5 * 1.1));
    m.onEnemyKilled(enemy('officer', true), hit('body', 'melee'));
    expect(stats.score).toBe(Math.round(100 * 1.5 * 1.1) + tier2(250));
    expect([m.secStats.kills, m.secStats.knockouts]).toEqual([1, 1]);
  });

  it('killScore: `killed` defaults true (the parked modes and co-op validation); only the dog changes', () => {
    expect(killScore('dog', false, 1)).toBe(-120);
    expect(killScore('dog', true, 1)).toBe(-120);
    expect(killScore('dog', true, 3)).toBe(Math.round(-120 * 1.2));
    expect(killScore('dog', true, 1, false)).toBe(180);
    expect(killScore('dog', false, 2, false)).toBe(tier2(120));
    for (const k of ['grunt', 'heavy', 'enforcer', 'officer', 'sniper', 'runner', 'droneOp'] as const) {
      expect(killScore(k, true, 2, false)).toBe(killScore(k, true, 2));
      expect(killScore(k, false, 2)).toBeGreaterThan(0);
    }
  });

  it('the undo (`KILL_BASE.dog` back to 120) fully restores the old dog score, the headshot bonus included', () => {
    const old = (headshot: boolean, tier: number) => Math.round(120 * (headshot ? 1.5 : 1) * (1 + (tier - 1) * 0.1));
    const saved = KILL_BASE.dog;
    try {
      KILL_BASE.dog = 120;
      for (const tier of [1, 2, 3]) {
        for (const headshot of [false, true]) {
          expect(killScore('dog', headshot, tier)).toBe(old(headshot, tier));
          expect(killScore('dog', headshot, tier, false)).toBe(old(headshot, tier));
        }
      }
    } finally {
      KILL_BASE.dog = saved;
    }
    // today's negative base: no headshot bonus on a killed dog, the knock-out keeps it
    expect(killScore('dog', true, 2)).toBe(killScore('dog', false, 2));
    expect(killScore('dog', true, 2, false)).toBe(old(true, 2));
  });
});
