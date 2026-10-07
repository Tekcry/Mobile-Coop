import { describe, expect, it } from 'vitest';
import { BENCH, benchPlan, benchResult, benchText, pathAt, sustainedDrift } from '../src/game/benchmark';

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

describe('benchmark plans', () => {
  it('every preset, one run each', () => {
    const p = benchPlan('presets', 2560, 1600);
    expect(p.map((r) => r.preset)).toEqual(['high', 'ultra', 'epic']);
    expect(p.every((r) => r.seconds === BENCH.seconds && !r.sustained)).toBe(true);
  });
  it('resolutions by pixel count within render scale 2', () => {
    const p = benchPlan('resolutions', 2560, 1600);
    expect(p[0]!.scale).toBe(1);
    // 1600p is the output itself; 4K and 7680 x 2160 are reachable (scale ~1.42 and ~2.01)
    expect(p.map((r) => r.label)).toEqual(['2560x1600 (output)', '3840x2160 (4K) pixel count', '7680x2160 (32:9) pixel count']);
    expect(p[1]!.scale).toBeCloseTo(Math.sqrt((3840 * 2160) / (2560 * 1600)), 6);
    // a small window cannot reach 7680 x 2160 within scale 2
    expect(benchPlan('resolutions', 1280, 720).some((r) => /7680/.test(r.label))).toBe(false);
  });
  it('the sustained run and its drift', () => {
    const [r] = benchPlan('sustained', 1920, 1080);
    expect(r!.sustained && r!.seconds === BENCH.sustained).toBe(true);
    expect(sustainedDrift([150, 148, 140, 135])).toBeCloseTo(-0.1, 6);
    expect(sustainedDrift([150])).toBe(0);
  });
});
