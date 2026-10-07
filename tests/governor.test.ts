import { describe, expect, it } from 'vitest';
import { adaptiveAt, FULL, Governor, GOVERNOR, MAX_LEVEL } from '../src/core/governor';

/** Run the governor for `seconds` with frames from `cost(level)` (ms of work) on a vsynced display of `hz`. */
function run(g: Governor, seconds: number, cost: (level: number) => number, hz = 60): void {
  const refresh = 1000 / hz;
  let t = 0;
  while (t < seconds * 1000) {
    const iv = Math.max(1, Math.ceil(cost(g.level) / refresh - 1e-6)) * refresh;
    g.frame(iv, refresh);
    t += iv;
  }
}

describe('frame governor (3.1)', () => {
  it('detail steps down in the documented order and nothing else changes', () => {
    expect(adaptiveAt(0)).toEqual(FULL);
    expect(adaptiveAt(1).scale).toBeLessThan(1);
    expect(adaptiveAt(3)).toMatchObject({ shadowEvery: 1, volLights: 1 });
    expect(adaptiveAt(4).shadowEvery).toBe(2);
    expect(adaptiveAt(5).volLights).toBe(0.5);
    expect(adaptiveAt(6).voxelLod).toBe(0.75);
    expect(adaptiveAt(7).effects).toBe(0.6);
    expect(adaptiveAt(8).lights).toBe(0.75);
    expect(adaptiveAt(9).partLod).toBe(0.75);
    expect(adaptiveAt(MAX_LEVEL).scale).toBeLessThan(adaptiveAt(9).scale);
    for (let l = 1; l <= MAX_LEVEL; l++) {
      const a = adaptiveAt(l);
      const b = adaptiveAt(l - 1);
      for (const k of Object.keys(a) as (keyof typeof a)[]) {
        if (k === 'shadowEvery') expect(a[k]).toBeGreaterThanOrEqual(b[k]);
        else expect(a[k]).toBeLessThanOrEqual(b[k]);
      }
    }
  });
  it('holds full detail when the device keeps up', () => {
    const g = new Governor();
    run(g, 30, () => 10);
    expect(g.level).toBe(0);
  });
  it('steps down until frames fit, within a few seconds', () => {
    const g = new Governor();
    // each level saves 8% of a 26 ms frame: fits the 16.7 ms budget from level 5
    const cost = (l: number): number => 26 * (1 - 0.08 * l);
    run(g, 10, cost);
    expect(cost(g.level)).toBeLessThanOrEqual(16.7);
    expect(g.level).toBeLessThanOrEqual(6);
  });
  it('probes back up when there is room again, and backs off when the probe misses', () => {
    const g = new Governor();
    let heavy = true;
    const cost = (l: number): number => (heavy ? 30 : 12) * (1 - 0.05 * l);
    run(g, 15, cost);
    const low = g.level;
    expect(low).toBeGreaterThan(3);
    heavy = false;
    run(g, 120, cost);
    expect(g.level).toBe(0);
    // a level that never holds: tries become rarer (no flicker)
    const h = new Governor();
    const edge = (l: number): number => (l >= 2 ? 16 : 18);
    run(h, 10, edge);
    expect(h.level).toBe(2);
    let changes = 0;
    let last = h.level;
    const refresh = 1000 / 60;
    for (let t = 0; t < 120000; ) {
      const iv = Math.max(1, Math.ceil(edge(h.level) / refresh - 1e-6)) * refresh;
      h.frame(iv, refresh);
      if (h.level !== last) changes++;
      last = h.level;
      t += iv;
    }
    // (6 s, 12, 24, 48, 96 s between tries: a handful in two minutes, not one a second)
    expect(changes).toBeLessThanOrEqual(10);
    expect(GOVERNOR.probeMax).toBeGreaterThan(GOVERNOR.probeAfter);
  });
  it('a very slow device (a second per frame) still steps down', () => {
    const g = new Governor();
    for (let i = 0; i < 40; i++) g.frame(1000, 1000 / 60);
    expect(g.level).toBeGreaterThanOrEqual(3);
  });
  it('Low Power Mode: a phone at ~30 Hz', () => {
    const g = new Governor();
    g.display(30, true);
    expect(g.lowPower).toBe(true);
    g.display(120, true);
    expect(g.lowPower).toBe(false);
    g.display(30, false);
    expect(g.lowPower).toBe(false);
  });
  it('thermal: frames slowing at the same level for minutes', () => {
    const g = new Governor();
    let t = 0;
    // 15 ms frames, then 17.5 once hot (still inside the miss slack: the level holds)
    while (t < 300000) {
      const iv = t < 60000 ? 15 : 17.5;
      g.frame(iv, 1000 / 60);
      t += iv;
    }
    expect(g.thermal).toBe(true);
    const cool = new Governor();
    run(cool, 300, () => 10);
    expect(cool.thermal).toBe(false);
  });
});
