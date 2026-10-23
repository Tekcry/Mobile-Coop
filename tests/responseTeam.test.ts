import { describe, expect, it } from 'vitest';
import { RESPONSE, responseTeam } from '../src/ai/gear';
import type { EnemyKind } from '../src/ai/enemyDefs';

// (guard-ai S11) the alarm response team: a shield guard first, the rest armed guards, count = perStage (research item 3).

describe('responseTeam', () => {
  it('stage 0 (and below) sends no team and empties out', () => {
    const out: EnemyKind[] = ['grunt', 'heavy'];
    expect(responseTeam(0, 2, out)).toBe(0);
    expect(out).toEqual([]);
    expect(responseTeam(-1, 2, ['grunt'])).toBe(0);
    expect(responseTeam(NaN, 2, out)).toBe(0);
  });
  it('stages 1..3: shield first, the rest grunts, count = perStage', () => {
    for (const stage of [1, 2, 3]) {
      const out: EnemyKind[] = [];
      expect(responseTeam(stage, 2, out)).toBe(2);
      expect(out).toEqual(['enforcer', 'grunt']);
    }
    const out: EnemyKind[] = [];
    expect(responseTeam(1, 3, out)).toBe(3);
    expect(out).toEqual(['enforcer', 'grunt', 'grunt']);
    expect(responseTeam(2, 1, out)).toBe(1);
    expect(out).toEqual(['enforcer']);
  });
  it('the live-map team is the shield plus two guards', () => {
    const out: EnemyKind[] = [];
    expect(responseTeam(1, RESPONSE.liveTeam, out)).toBe(3);
    expect(out).toEqual(['enforcer', 'grunt', 'grunt']);
  });
  it('perStage 0 (or below) sends no team', () => {
    const out: EnemyKind[] = ['grunt'];
    expect(responseTeam(2, 0, out)).toBe(0);
    expect(out).toEqual([]);
    expect(responseTeam(2, -3, out)).toBe(0);
    expect(responseTeam(2, NaN, out)).toBe(0);
  });
  it('reuses out: a longer old content is cut to the new length', () => {
    const out: EnemyKind[] = ['heavy', 'heavy', 'heavy', 'heavy'];
    expect(responseTeam(1, 2, out)).toBe(2);
    expect(out).toEqual(['enforcer', 'grunt']);
  });
});
