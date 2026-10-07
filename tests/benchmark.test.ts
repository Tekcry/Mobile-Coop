import { describe, expect, it } from 'vitest';
import { benchResult, benchText, pathAt } from '../src/game/benchmark';

describe('benchmark', () => {
  it('the flight passes through every room point and loops', () => {
    const pts = [{ x: 0, y: 2, z: 0 }, { x: 10, y: 2, z: 0 }, { x: 10, y: 2, z: 10 }, { x: 0, y: 2, z: 10 }];
    for (let i = 0; i < 4; i++) {
      const p = pathAt(pts, i / 4);
      expect(p.x).toBeCloseTo(pts[i]!.x);
      expect(p.z).toBeCloseTo(pts[i]!.z);
    }
    expect(pathAt(pts, 1).x).toBeCloseTo(0);
  });
  it('average and 1% low', () => {
    const iv = [...Array.from({ length: 990 }, () => 5), ...Array.from({ length: 10 }, () => 20)];
    const r = benchResult(iv);
    expect(r.frames).toBe(1000);
    expect(r.avgFps).toBeCloseTo(1000 / 5.15, 1);
    expect(r.low1Fps).toBeCloseTo(50, 5);
    expect(r.p50Ms).toBe(5);
    expect(r.p99Ms).toBe(20);
    expect(benchText(r, 'Warehouse, Epic')).toMatch(/average 194 fps, 1% low 50 fps/);
    expect(benchResult([]).frames).toBe(0);
  });
});
