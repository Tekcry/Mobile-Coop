// (sector-redesign perfg) The FROZEN anim tier: a render-frozen guard skips the solve, the skipped time is carried
// (capped) into the thaw solve.
import { describe, expect, it } from 'vitest';
import { ANIM_FROZEN_CARRY_MAX, animFrozenStep, newAnimFrozenState } from '../src/ai/animFrozen';

describe('perfg: FROZEN anim tier', () => {
  it('drawn: solves every frame with its own dt', () => {
    const st = newAnimFrozenState();
    for (let i = 0; i < 5; i++) expect(animFrozenStep(st, false, 1 / 60)).toBeCloseTo(1 / 60, 9);
    expect(st.carry).toBe(0);
    expect(animFrozenStep(st, false, 0)).toBe(0);
  });

  it('frozen: skips and carries; the thaw solve gets dt plus the carry, then the carry is cleared', () => {
    const st = newAnimFrozenState();
    for (let i = 0; i < 3; i++) expect(animFrozenStep(st, true, 0.02)).toBe(-1);
    expect(st.carry).toBeCloseTo(0.06, 9);
    expect(animFrozenStep(st, false, 0.01)).toBeCloseTo(0.07, 9);
    expect(st.carry).toBe(0);
    expect(animFrozenStep(st, false, 0.01)).toBeCloseTo(0.01, 9);
  });

  it('a long freeze caps the carry at ANIM_FROZEN_CARRY_MAX', () => {
    const st = newAnimFrozenState();
    for (let i = 0; i < 600; i++) expect(animFrozenStep(st, true, 1 / 60)).toBe(-1);
    expect(st.carry).toBe(ANIM_FROZEN_CARRY_MAX);
    expect(ANIM_FROZEN_CARRY_MAX).toBeCloseTo(0.1, 9);
    expect(animFrozenStep(st, false, 1 / 60)).toBeCloseTo(1 / 60 + ANIM_FROZEN_CARRY_MAX, 9);
  });

  it('one big frame while frozen is capped too', () => {
    const st = newAnimFrozenState();
    animFrozenStep(st, true, 0.5);
    expect(st.carry).toBe(ANIM_FROZEN_CARRY_MAX);
  });
});
