import { describe, expect, it } from 'vitest';
import { VISION, VisionState } from '../src/game/vision';

const run = (v: VisionState, sec: number, dt = 1 / 60): number => {
  let pulses = 0;
  for (let t = 0; t < sec; t += dt) if (v.step(dt)) pulses++;
  return pulses;
};

describe('vision modes', () => {
  it('the button cycles off -> night -> sonar -> off', () => {
    const v = new VisionState();
    expect(v.cycle()).toBe('night');
    expect(v.cycle()).toBe('sonar');
    expect(v.cycle()).toBe('off');
  });
  it('night vision fades in and out', () => {
    const v = new VisionState();
    v.cycle();
    run(v, VISION.nightFade + 0.05);
    expect(v.night).toBeCloseTo(1, 5);
    v.set('off');
    run(v, VISION.nightFade + 0.05);
    expect(v.night).toBe(0);
  });
  it('sonar pulses at once and every period; marks show then fade', () => {
    const v = new VisionState();
    v.set('sonar');
    expect(run(v, 0.05)).toBe(1);
    expect(v.markAlpha).toBe(1);
    run(v, VISION.sonarShow + 0.1);
    expect(v.markAlpha).toBe(0);
    expect(run(v, VISION.sonarPeriod)).toBe(1);
  });
  it('sonar runs out after its max time and must recharge (the cycle skips it meanwhile)', () => {
    const v = new VisionState();
    v.set('sonar');
    const n = run(v, VISION.sonarMax + 0.1);
    expect(n).toBe(Math.ceil(VISION.sonarMax / VISION.sonarPeriod));
    expect(v.mode).toBe('off');
    expect(v.cooldown).toBeGreaterThan(0);
    v.cycle();
    expect(v.cycle()).toBe('off');
    run(v, VISION.sonarCooldown + 0.1);
    v.set('night');
    expect(v.cycle()).toBe('sonar');
  });
});
