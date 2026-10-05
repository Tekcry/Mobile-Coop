import { describe, expect, it } from 'vitest';
import { AdaptiveController, QUALITY_LEVELS } from '../src/core/quality';

const run = (c: AdaptiveController, ms: number, seconds: number) => {
  const changes: number[] = [];
  const dt = ms / 1000;
  for (let t = 0; t < seconds; t += dt) {
    const r = c.push(ms, dt);
    if (r !== null) changes.push(r);
  }
  return changes;
};

describe('adaptive quality', () => {
  it('levels are ordered cheapest first', () => {
    for (let i = 1; i < QUALITY_LEVELS.length; i++) expect(QUALITY_LEVELS[i]!.renderScale).toBeGreaterThan(QUALITY_LEVELS[i - 1]!.renderScale);
  });
  it('ignores the warm-up period', () => {
    const c = new AdaptiveController(2);
    expect(run(c, 40, 2.5)).toEqual([]);
  });
  it('steps down on sustained slow frames, one level per cooldown', () => {
    const c = new AdaptiveController(3);
    const ch = run(c, 30, 3 + 3);
    expect(ch[0]).toBe(2);
    expect(ch.length).toBe(1);
    expect(run(c, 30, 8)).toContain(1);
  });
  it('does not react to a single hitch', () => {
    const c = new AdaptiveController(2);
    run(c, 16, 4);
    const dt = 0.016;
    let changed = false;
    for (let i = 0; i < 300; i++) if (c.push(i === 100 ? 250 : 16, dt) !== null) changed = true;
    expect(changed).toBe(false);
  });
  it('steps up only after long headroom and respects max/min', () => {
    const c = new AdaptiveController(1, 0, 2);
    expect(run(c, 8, 10)).toEqual([]);
    expect(run(c, 8, 12)).toEqual([2]);
    expect(run(c, 8, 40)).toEqual([]);
    const d = new AdaptiveController(0);
    expect(run(d, 50, 20)).toEqual([]);
  });
  it('steady 60 fps (16.7 ms) holds the level', () => {
    const c = new AdaptiveController(2);
    expect(run(c, 16.7, 30)).toEqual([]);
  });
});
