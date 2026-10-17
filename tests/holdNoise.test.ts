import { describe, expect, it } from 'vitest';
import { holdNoisePulse, HOLD_NOISE_PULSE, MANHOLE_LIFT_NOISE_RADIUS } from '../src/config/noise';

describe('per-object hold noise', () => {
  it('sounds at the start of a hold and on each pulse, not between', () => {
    expect(holdNoisePulse(0, 1 / 60)).toBe(true);
    expect(holdNoisePulse(0.1, 0.2)).toBe(false);
    expect(holdNoisePulse(HOLD_NOISE_PULSE - 0.01, HOLD_NOISE_PULSE + 0.01)).toBe(true);
    expect(holdNoisePulse(0.3, 0.3)).toBe(false);
  });
  it('a 4 s manhole lift sounds 9 times at 60 Hz and carries 10 m', () => {
    let p = 0, n = 0;
    while (p < 4) { const q = p + 1 / 60; if (holdNoisePulse(p, q)) n++; p = q; }
    expect(n).toBe(9);
    expect(MANHOLE_LIFT_NOISE_RADIUS).toBe(10);
  });
});
