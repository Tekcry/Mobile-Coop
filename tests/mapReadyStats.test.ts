/**
 * (map-ready S1) The load record (`src/core/mapReadyStats.ts`): steps and the reveal in ms from the load start, the
 * after-reveal window's deltas from cumulative frame samples, its frame-interval quantiles, the `loadCounters` deltas,
 * `bakeSourceOf` and the feedback line.
 */
import { describe, expect, it } from 'vitest';
import { AFTER_WINDOW_MS, bakeSourceOf, loadCounters, MapReadyStats, type FrameSample } from '../src/core/mapReadyStats';

const sample = (programs = 0, landings = 0, tileUploads = 0, materials = 0, popIns = 0): FrameSample => ({ programs, landings, tileUploads, materials, popIns });

describe('MapReadyStats', () => {
  it('steps and the reveal are ms from the load start; the record starts unrevealed', () => {
    const s = new MapReadyStats('tallowWharf', 'sector', false, 1000);
    expect(s.record.revealMs).toBe(-1);
    expect(s.record.released).toBe(false);
    expect(s.record.after.done).toBe(false);
    s.step('world', 3500);
    s.step('create', 6000);
    s.reveal(8400, sample(40), 512);
    expect(s.record.steps).toEqual({ world: 2500, create: 5000 });
    expect(s.record.revealMs).toBe(7400);
    expect(s.record.released).toBe(true);
    expect(s.record.heapMb).toBe(512);
    expect(s.record.map).toBe('tallowWharf');
    expect(s.record.mode).toBe('sector');
    expect(s.record.gated).toBe(false);
  });

  it('the window takes the deltas of the cumulative samples from the reveal to 10 s after', () => {
    const s = new MapReadyStats('tallowWharf', 'sector', false, 0, 10);
    s.reveal(1000, sample(40, 5, 2, 100, 1), -1);
    expect(s.record.loadPrograms).toBe(30);
    s.frame(1016, sample(41, 6, 2, 100, 1));
    s.frame(1032, sample(41, 8, 3, 102, 2));
    s.frame(1000 + AFTER_WINDOW_MS + 100, sample(42, 9, 4, 103, 4));
    const a = s.record.after;
    expect(a.done).toBe(true);
    expect(a.programs).toBe(2);
    expect(a.landings).toBe(4);
    expect(a.tileUploads).toBe(2);
    expect(a.materials).toBe(3);
    expect(a.popIns).toBe(3);
    expect(a.frames).toBe(3);
    // the program count changed on the first frame (40 -> 41) and the last (41 -> 42)
    expect(a.shaderFrames).toBe(2);
  });

  it('frames before the reveal and after the window are ignored', () => {
    const s = new MapReadyStats('ctcourse', 'course', false, 0);
    s.frame(100, sample(99, 99, 99, 99, 99));
    expect(s.record.after.frames).toBe(0);
    s.reveal(1000, sample(40), -1);
    s.frame(1000 + AFTER_WINDOW_MS, sample(42));
    expect(s.record.after.done).toBe(true);
    expect(s.record.after.frames).toBe(1);
    s.frame(1000 + AFTER_WINDOW_MS + 16, sample(50, 9, 9, 9, 9));
    expect(s.record.after.frames).toBe(1);
    expect(s.record.after.programs).toBe(2);
    // a second reveal changes nothing
    s.reveal(99999, sample(0), 1);
    expect(s.record.revealMs).toBe(1000);
  });

  it('p50 / p95 / max of the frame intervals', () => {
    const s = new MapReadyStats('warehouse', 'clear', false, 0);
    s.reveal(0, sample(), -1);
    // 20 intervals of 1..20 ms (out of order), then one 10 s interval that closes the window
    const iv = [5, 3, 1, 20, 2, 4, 19, 6, 7, 18, 8, 9, 17, 10, 11, 16, 12, 13, 15, 14];
    let t = 0;
    for (const d of iv) s.frame((t += d), sample());
    s.frame(t + AFTER_WINDOW_MS, sample());
    const a = s.record.after;
    expect(a.done).toBe(true);
    expect(a.frames).toBe(21);
    // 21 values: 1..20 and 10000; nearest rank p50 = 11th = 11, p95 = 20th = 20, max = 10000
    expect(a.p50).toBe(11);
    expect(a.p95).toBe(20);
    expect(a.max).toBe(AFTER_WINDOW_MS);
  });

  it('the load counters are deltas from the record\'s start to the reveal', () => {
    loadCounters.texReused += 3;
    loadCounters.filesFetched += 1;
    const s = new MapReadyStats('tallowWharf', 'sector', false, 0);
    loadCounters.texReused += 2;
    loadCounters.texDecoded += 5;
    loadCounters.filesReused += 4;
    loadCounters.filesFetched += 6;
    loadCounters.effReused += 7;
    loadCounters.effCompiled += 8;
    s.reveal(500, sample(), -1);
    loadCounters.texDecoded += 100;
    const r = s.record;
    expect([r.texReused, r.texDecoded, r.filesReused, r.filesFetched, r.effReused, r.effCompiled]).toEqual([2, 5, 4, 6, 7, 8]);
  });

  it('setBake and summary(): the map, the reveal seconds, the window and the bake source', () => {
    const s = new MapReadyStats('tallowWharf', 'sector', false, 0);
    s.setBake('cache', 1234);
    expect(s.record.bakeSource).toBe('cache');
    expect(s.record.bakeMs).toBe(1234);
    expect(s.summary()).toContain('tallowWharf');
    s.reveal(8400, sample(40), -1);
    expect(s.summary()).toContain('tallowWharf reveal 8.4 s');
    s.frame(8418, sample(40, 3, 0, 0, 0));
    s.frame(8400 + AFTER_WINDOW_MS, sample(40, 3, 0, 0, 0));
    expect(s.summary()).toBe('tallowWharf reveal 8.4 s, after 10 s: 0 programs, 3 landings, 0 pop-ins, p95 9982 ms, bake cache');
  });
});

describe('bakeSourceOf', () => {
  it('a declared source wins; a section-bake map reads baked with a running baker, cache without; others unknown', () => {
    expect(bakeSourceOf('shipped', true, true)).toBe('shipped');
    expect(bakeSourceOf(undefined, true, true)).toBe('baked');
    expect(bakeSourceOf(undefined, true, false)).toBe('cache');
    expect(bakeSourceOf(undefined, false, false)).toBe('unknown');
    expect(bakeSourceOf(undefined, false, true)).toBe('unknown');
  });
});
