import { describe, expect, it } from 'vitest';
import { camSpaceAt, doorPassing, probeOpen } from '../src/world/camSpaces';
import { CAMERA, exploreBoom, framing } from '../src/config/camera';

describe('camera spaces (G3, AUDIT-CAMERA rows 1 and 7)', () => {
  it('the smallest box wins, a feet-height range limits a box, outside every box the map default; no data is NaN', () => {
    const spaces = [
      { box: [0, 0, 20, 20] as const, size: 'tight' as const },
      { box: [5, 5, 8, 8] as const, size: 'open' as const, y: [0, 3] as const },
    ];
    expect(camSpaceAt(spaces, 'open', 1, 0, 1)).toBe(0);
    expect(camSpaceAt(spaces, 'open', 6, 0, 6)).toBe(1);
    expect(camSpaceAt(spaces, 'open', 6, 4, 6)).toBe(0);
    expect(camSpaceAt(spaces, 'tight', 30, 0, 30)).toBe(0);
    expect(camSpaceAt(spaces, 'open', 30, 0, 30)).toBe(1);
    expect(Number.isNaN(camSpaceAt(undefined, undefined, 0, 0, 0))).toBe(true);
  });
  // (marlow-final 0d) the Marlow Yard case (yard open, airlocks and the roofed annex tight) pinned the old bays: the
  // whole-map frame checks the holding rooms tight (tests/ctcourse.test.ts) and each part's spaces lie in its set box
  // (`checkSetPart`); each set slice adds its own open / tight cases (SPEC 13)
  it('the probe fallback: open only with the back and both sides clear', () => {
    const B = CAMERA.openBack;
    const S = CAMERA.openSide;
    expect(probeOpen(B, S, S, B, S)).toBe(1);
    expect(probeOpen(B - 0.1, S, S, B, S)).toBe(0);
    expect(probeOpen(B, 0.5, S, B, S)).toBe(0);
    expect(probeOpen(B, S, 1.9, B, S)).toBe(0);
    // hysteresis: once open, it holds down to 0.8 of the distances
    expect(probeOpen(B * 0.85, S * 0.85, S, B, S, true)).toBe(1);
    expect(probeOpen(B * 0.75, S, S, B, S, true)).toBe(0);
  });
  it('the explore boom: open 2.8 m, crouched open 2.2 m, tight 1.8 m both ways', () => {
    expect(exploreBoom(1, 0)).toBeCloseTo(2.8);
    expect(exploreBoom(1, 1)).toBeCloseTo(2.2);
    expect(exploreBoom(0, 0)).toBeCloseTo(1.8);
    expect(exploreBoom(0, 1)).toBeCloseTo(1.8);
    expect(exploreBoom(0.5, 0)).toBeCloseTo(2.3);
  });
  it('(fix round) open: the look-at point drops 0.25 m under the head holstered, none aiming', () => {
    expect(framing(0, 0, CAMERA, 0).pivot - framing(0, 0, CAMERA, 1).pivot).toBeCloseTo(CAMERA.openDrop);
    expect(framing(1, 0, CAMERA, 1).pivot).toBeCloseTo(framing(1, 0, CAMERA, 0).pivot);
  });
  it('(fix round) door passage: only moving across the doorway, not standing by it or walking past it', () => {
    // a door hinged at (0, 0) along +z (yaw 0), 1 m wide: its plane is x = 0, the opening z 0..1
    expect(doorPassing(0.3, 0.5, 1.2, 0, 0, 0, 0, 1)).toBe(true);
    expect(doorPassing(-0.6, 0.5, 1.2, 0, 0, 0, 0, 1)).toBe(true);
    // standing in it, or walking along the wall beside it
    expect(doorPassing(0.3, 0.5, 0, 0, 0, 0, 0, 1)).toBe(false);
    expect(doorPassing(0.3, 0.5, 0, 1.2, 0, 0, 0, 1)).toBe(false);
    // off to the side of the opening, or too far from its plane
    expect(doorPassing(0.3, 2, 1.2, 0, 0, 0, 0, 1)).toBe(false);
    expect(doorPassing(1.5, 0.5, 1.2, 0, 0, 0, 0, 1)).toBe(false);
  });
});
