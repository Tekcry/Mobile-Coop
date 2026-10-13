import { describe, expect, it } from 'vitest';
import { VISION, VisionState } from '../src/game/vision';

const run = (v: VisionState, sec: number, dt = 1 / 60): void => {
  for (let t = 0; t < sec; t += dt) v.step(dt);
};

describe('vision modes', () => {
  it('the button toggles off -> night -> off', () => {
    const v = new VisionState();
    expect(v.cycle()).toBe('night');
    expect(v.cycle()).toBe('off');
  });
  it('only the flip time is a constant', () => {
    expect(Object.keys(VISION)).toEqual(['flip']);
    expect(VISION.flip).toBe(0.2);
  });
  it('night vision does not fade: the goggles flip and it switches at the middle (Step 4b fix round 3)', () => {
    const v = new VisionState();
    expect(Number.isNaN(v.flipCentre)).toBe(true);
    v.cycle();
    run(v, VISION.flip * 0.4);
    expect(v.night).toBe(0);
    // flipping down: the housing comes from above the screen
    expect(v.flipCentre).toBeGreaterThan(0.5);
    run(v, VISION.flip * 0.2);
    expect(v.night).toBe(1);
    run(v, VISION.flip);
    expect(v.night).toBe(1);
    expect(Number.isNaN(v.flipCentre)).toBe(true);
    v.set('off');
    run(v, VISION.flip * 0.4);
    expect(v.night).toBe(1);
    // flipping up: from below
    expect(v.flipCentre).toBeLessThan(0.5);
    run(v, VISION.flip);
    expect(v.night).toBe(0);
  });
});
