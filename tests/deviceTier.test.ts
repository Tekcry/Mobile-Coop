import { describe, expect, it } from 'vitest';
import { Calibration, CALIBRATION, deviceKey, tierFromRenderer } from '../src/core/deviceTier';
import { PRESET_IDS } from '../src/core/quality';

describe('device tier from the GPU name (3.1)', () => {
  it('desktop GPUs', () => {
    const t = (r: string): string | null => tierFromRenderer(r).tier;
    expect(t('ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Laptop GPU (0x00002757) Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('epic');
    expect(t('ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Ti Direct3D11)')).toBe('ultra');
    expect(t('ANGLE (NVIDIA, NVIDIA GeForce RTX 3050 Laptop GPU)')).toBe('high');
    expect(t('ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB)')).toBe('medium');
    expect(t('ANGLE (AMD, AMD Radeon RX 7900 XTX)')).toBe('epic');
    expect(t('ANGLE (AMD, AMD Radeon 780M Graphics)')).toBe('high');
    expect(t('ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics)')).toBe('ultra');
    expect(t('ANGLE (Intel, Intel(R) Iris(R) Xe Graphics)')).toBe('medium');
    expect(t('ANGLE (Intel, Intel(R) UHD Graphics 620)')).toBe('low');
    expect(t('ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Max, Unspecified Version)')).toBe('ultra');
    expect(t('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)')).toBe('high');
    expect(t('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)')).toBe('low');
  });
  it('an unknown or hidden GPU needs a calibration', () => {
    expect(tierFromRenderer('Apple GPU')).toMatchObject({ tier: null, confident: false });
    expect(tierFromRenderer('').confident).toBe(false);
  });
  it('the key changes with the GPU or the screen, not with rotation; its format is unchanged', () => {
    const a = deviceKey('NVIDIA GeForce RTX 4090', 1920, 1080, 1);
    expect(a).toBe('NVIDIA GeForce RTX 4090|desktop|1920x1080');
    expect(deviceKey('NVIDIA GeForce RTX 4090', 1080, 1920, 1)).toBe(a);
    expect(deviceKey('NVIDIA GeForce RTX 4090', 2560, 1440, 1)).not.toBe(a);
    expect(deviceKey('AMD Radeon RX 7900 XTX', 1920, 1080, 1)).not.toBe(a);
  });
});

describe('calibration staircase (3.1)', () => {
  const run = (c: Calibration, frameMs: (p: string) => number, maxFrames = 5000): number => {
    let n = 0;
    while (!c.done && n < maxFrames) {
      c.push(frameMs(c.preset));
      n++;
    }
    return n;
  };
  it('a fast device holds the top preset on the first try', () => {
    const c = new Calibration([...PRESET_IDS].reverse(), 1000 / 60);
    run(c, () => 16.7);
    expect(c.result).toBe('epic');
    expect(c.tried.length).toBe(1);
  });
  it('steps down until a preset holds the budget', () => {
    const cost: Record<string, number> = { epic: 40, ultra: 25, high: 16, medium: 12, low: 9 };
    const c = new Calibration(PRESET_IDS.slice().reverse(), 1000 / 60);
    // (vsync: a frame takes a whole number of refresh intervals)
    run(c, (p) => Math.ceil(cost[p]! / 16.67) * 16.67);
    expect(c.result).toBe('high');
    expect(c.tried.map((t) => t.preset)).toEqual(['epic', 'ultra', 'high']);
  });
  it('the bottom preset when nothing holds; never longer than the time limit', () => {
    const c = new Calibration(['ultra', 'high', 'medium', 'low'], 1000 / 120);
    run(c, () => 33.3);
    expect(c.done).toBe(true);
    const slow = new Calibration(['ultra', 'high', 'medium', 'low'], 1000 / 120);
    let t = 0;
    while (!slow.done) {
      slow.push(100);
      t += 0.1;
    }
    expect(t).toBeLessThanOrEqual(CALIBRATION.maxSeconds + CALIBRATION.warmup + CALIBRATION.measure + 0.2);
    expect(['medium', 'low']).toContain(slow.result);
  });
});
