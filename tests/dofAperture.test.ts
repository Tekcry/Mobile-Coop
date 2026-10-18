import { describe, expect, it } from 'vitest';
import { AIM_APERTURE, SHARP_FSTOP, depthWanted, fStopFor, stepAperture } from '../src/vfx/dofAperture';

/** Babylon's circle of confusion (circleOfConfusion.fragment, lens 50 mm, focal length 50 mm), clamped to 0..1. */
function coc(fStop: number, focusMm: number, depthMm: number): number {
  const pre = ((50 / fStop) * 50) / (focusMm - 50);
  return Math.min(1, Math.abs((pre * (focusMm - depthMm)) / depthMm));
}

describe('depth of field aperture (3.6 desktop blur fix)', () => {
  it('is fully sharp when not aiming: no blur at any depth, even a depth map that reads "at the lens"', () => {
    expect(stepAperture(0, false, false, 1 / 60)).toBe(0);
    expect(fStopFor(0)).toBe(SHARP_FSTOP);
    for (const focus of [1000, 10000, 80000]) for (const depth of [100, 1000, 50000]) expect(coc(fStopFor(0), focus, depth)).toBeLessThan(1e-4);
    // the old idle f/32 blurred the whole frame when the paused depth read near (the bug)
    expect(coc(32, 10000, 100)).toBeGreaterThan(0.7);
  });

  it('only opens once the depth pass is live, then eases to f/2.8', () => {
    // the frame the depth pass restarts: still sharp
    expect(stepAperture(0, true, false, 1 / 60)).toBe(0);
    let a = 0;
    for (let i = 0; i < 120; i++) a = stepAperture(a, true, true, 1 / 60);
    expect(a).toBeCloseTo(AIM_APERTURE, 3);
    expect(fStopFor(a)).toBeCloseTo(2.8, 2);
  });

  it('closes after aiming and lets the depth pass pause only once shut', () => {
    let a = AIM_APERTURE;
    a = stepAperture(a, false, true, 1 / 60);
    expect(a).toBeGreaterThan(0);
    expect(depthWanted(a, false)).toBe(true);
    for (let i = 0; i < 120; i++) a = stepAperture(a, false, true, 1 / 60);
    expect(a).toBe(0);
    expect(depthWanted(a, false)).toBe(false);
    expect(depthWanted(0, true)).toBe(true);
  });
});
