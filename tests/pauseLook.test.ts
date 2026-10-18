import { describe, expect, it } from 'vitest';
import { PAUSE_APERTURE, PAUSE_EASE_MS, PauseLook, pauseAperture, stepPauseLevel } from '../src/vfx/pauseLook';

describe('pause look', () => {
  it('eases in over 250 ms and out again', () => {
    let l = 0;
    l = stepPauseLevel(l, true, PAUSE_EASE_MS / 2, false);
    expect(l).toBeCloseTo(0.5);
    l = stepPauseLevel(l, true, PAUSE_EASE_MS, false);
    expect(l).toBe(1);
    l = stepPauseLevel(l, false, PAUSE_EASE_MS / 4, false);
    expect(l).toBeCloseTo(0.75);
    l = stepPauseLevel(l, false, PAUSE_EASE_MS, false);
    expect(l).toBe(0);
  });
  it('is instant with reduced motion', () => {
    expect(stepPauseLevel(0, true, 1, true)).toBe(1);
    expect(stepPauseLevel(1, false, 1, true)).toBe(0);
  });
  it('maps the level to the aperture', () => {
    expect(pauseAperture(0)).toBe(0);
    expect(pauseAperture(1)).toBe(PAUSE_APERTURE);
  });
  it('tracks wall time and is off on resume', () => {
    const p = new PauseLook();
    p.set(true, 1000);
    expect(p.step(false, 1100)).toBeCloseTo(0.4);
    p.step(false, 1200);
    expect(p.step(false, 1300)).toBe(1);
    p.set(false, 1300);
    expect(p.active).toBe(true);
    p.step(false, 1400);
    p.step(false, 1500);
    expect(p.step(false, 1600)).toBe(0);
    expect(p.active).toBe(false);
  });
});
