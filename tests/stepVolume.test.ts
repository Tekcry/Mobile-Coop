import { describe, expect, it } from 'vitest';
import { STEP_VOLUME, noiseRadius, stepVolume } from '../src/player/movement';
import { GEARS } from '../src/config/movement';

describe('own footstep volume follows the noise meter (playtest 2, G61)', () => {
  it('silent bands are very soft, a run the loudest, never above the cap', () => {
    expect(stepVolume(0)).toBe(STEP_VOLUME.silent);
    expect(stepVolume(1e6)).toBe(STEP_VOLUME.loud);
    expect(STEP_VOLUME.loud).toBeLessThan(0.5);
    expect(stepVolume(2)).toBeGreaterThan(stepVolume(1));
  });
  it('the two slowest standing and three slowest crouched speeds emit no noise (G40)', () => {
    for (let g = 1; g <= 2; g++) expect(noiseRadius(GEARS.stand[g - 1]!, false)).toBe(0);
    for (let g = 1; g <= 3; g++) expect(noiseRadius(GEARS.crouch[g - 1]!, true)).toBe(0);
    expect(noiseRadius(GEARS.stand[2]!, false)).toBeGreaterThan(0);
    expect(noiseRadius(GEARS.crouch[3]!, true)).toBeGreaterThan(0);
  });
});
