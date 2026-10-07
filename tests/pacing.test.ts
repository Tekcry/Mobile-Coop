import { describe, expect, it } from 'vitest';
import { emptySnapshot, FrameStats, RefreshDetector, ResolutionScaler, snapHz } from '../src/core/pacing';

describe('refresh detection', () => {
  it('snaps intervals to common refresh rates', () => {
    expect(snapHz(8.33)).toBe(120);
    expect(snapHz(8.0)).toBe(120);
    expect(snapHz(16.67)).toBe(60);
    expect(snapHz(11.1)).toBe(90);
    expect(snapHz(6.94)).toBe(144);
    expect(snapHz(0)).toBe(60);
  });
  it('detects 120 Hz from jittery rAF intervals, ignoring hitches and the first frames', () => {
    const d = new RefreshDetector();
    let changed = false;
    for (let i = 0; i < 200; i++) changed = d.push(i < 10 ? 50 : i % 17 === 0 ? 40 : 8.33 + Math.sin(i) * 0.6) || changed;
    expect(changed).toBe(true);
    expect(d.hz).toBe(120);
  });
  it('reports a 60 Hz cap (Safari) and re-detects when the rate changes', () => {
    const d = new RefreshDetector();
    for (let i = 0; i < 110; i++) d.push(16.7);
    expect(d.hz).toBe(60);
    for (let i = 0; i < 90; i++) d.push(8.33);
    expect(d.hz).toBe(120);
  });
});

describe('frame stats', () => {
  it('percentiles, worst and drops against the budget', () => {
    const s = new FrameStats(100);
    for (let i = 0; i < 100; i++) s.push(i < 95 ? 8.3 : 20, 3);
    const p = s.snapshot(120, emptySnapshot());
    expect(p.budgetMs).toBeCloseTo(8.333, 2);
    expect(p.p50).toBeCloseTo(8.3, 3);
    expect(p.p95).toBeCloseTo(20, 3);
    expect(p.worst).toBe(20);
    expect(p.dropShare).toBeCloseTo(0.05, 5);
    expect(p.cpuP95).toBe(3);
  });
  it('is a ring buffer (old samples fall out)', () => {
    const s = new FrameStats(10);
    for (let i = 0; i < 10; i++) s.push(30, 1);
    for (let i = 0; i < 10; i++) s.push(8, 1);
    expect(s.snapshot(120, emptySnapshot()).worst).toBe(8);
  });
});

describe('dynamic resolution', () => {
  const B = 1000 / 120;
  const run = (r: ResolutionScaler, frame: number, cpu: number, seconds: number): number => {
    let changes = 0;
    for (let t = 0; t < seconds; t += frame / 1000) if (r.push(frame, cpu, B, frame / 1000)) changes++;
    return changes;
  };
  it('steps down when GPU bound, never when CPU bound', () => {
    const cpuBound = new ResolutionScaler();
    run(cpuBound, 12, 10, 5);
    expect(cpuBound.scale).toBe(1);
    const gpu = new ResolutionScaler();
    run(gpu, 12, 3, 1);
    expect(gpu.scale).toBeCloseTo(0.9);
    run(gpu, 12, 3, 10);
    expect(gpu.scale).toBeCloseTo(0.6);
  });
  it('recovers slowly with headroom and does not oscillate around the budget', () => {
    const r = new ResolutionScaler();
    run(r, 12, 3, 2);
    const low = r.scale;
    expect(low).toBeLessThan(1);
    // borderline frames (just over budget, not GPU bound): no change either way
    expect(run(r, B * 1.12, 3, 10)).toBe(0);
    // sustained headroom climbs back in half steps
    run(r, B, 2, 30);
    expect(r.scale).toBe(1);
  });
});
