import { describe, expect, it } from 'vitest';
import { CAMERA } from '../src/config/camera';
import { castStop, easeRate, lowFraming, lowSwing, lowWeight, nearPlane, pivotFraction } from '../src/player/cameraBounds';

describe('camera cast placement', () => {
  it('no hit keeps the full length', () => {
    expect(castStop(1, 2.2, CAMERA.castPad)).toBe(2.2);
  });
  it('a hit stops at the hit minus the pad', () => {
    expect(castStop(0.5, 2, 0.04)).toBeCloseTo(0.96, 9);
  });
  it('a hit nearer than the pad puts the camera at the start, never past it or behind the wall', () => {
    expect(castStop(0.01, 2, 0.04)).toBe(0);
  });
  it('head-on, sphere radius plus pad keeps the old 0.16 m gap', () => {
    expect(CAMERA.castRadius + CAMERA.castPad).toBeCloseTo(CAMERA.padding, 9);
  });
  it('the cast sphere is wider than the near plane half-diagonal at 75 deg on 16:9 and 21:9', () => {
    const vf = 2 * Math.atan(Math.tan((CAMERA.fov * Math.PI) / 360) * (9 / 16));
    for (const aspect of [16 / 9, 21 / 9]) {
      const hh = CAMERA.near * Math.tan(vf / 2);
      const diag = Math.hypot(CAMERA.near, hh, hh * aspect);
      expect(CAMERA.castRadius).toBeGreaterThan(diag);
    }
  });
});

describe('pivot pull-back', () => {
  it('a clear head-to-pivot keeps the pivot', () => {
    expect(pivotFraction(1, 0.4, CAMERA.castSkin)).toBe(1);
  });
  it('a wall half way pulls the pivot back to the head side, a skin short of the hit', () => {
    expect(pivotFraction(0.5, 0.4, 0.03)).toBeCloseTo((0.2 - 0.03) / 0.4, 9);
  });
  it('a wall at the head keeps the pivot on the head', () => {
    expect(pivotFraction(0, 0.4, 0.03)).toBe(0);
    expect(pivotFraction(0.3, 0, 0.03)).toBe(0);
  });
});

describe('low spaces', () => {
  it('open above lowStart: no change', () => {
    expect(lowWeight(3.0)).toBe(0);
    expect(lowWeight(CAMERA.lowStart)).toBe(0);
    const out = lowFraming(2.128, 1.54, 0, 3.0, lowWeight(3.0), { boom: 0, shoulderY: 0 });
    expect(out.boom).toBe(2.128);
    expect(out.shoulderY).toBe(1.54);
    expect(lowSwing(0)).toBe(1);
  });
  it('fully low at lowFull and below; half way between', () => {
    expect(lowWeight(CAMERA.lowFull)).toBe(1);
    expect(lowWeight(1.2)).toBe(1);
    expect(lowWeight((CAMERA.lowStart + CAMERA.lowFull) / 2)).toBeCloseTo(0.5, 9);
  });
  it('a 1.5 m crawl void: boom no longer than lowBoom, shoulder point between floor and ceiling with the gaps', () => {
    const out = lowFraming(2.128, 1.4, 0, 1.5, 1, { boom: 0, shoulderY: 0 });
    expect(out.boom).toBe(CAMERA.lowBoom);
    expect(out.shoulderY).toBeLessThanOrEqual(1.5 - CAMERA.lowCeilGap + 1e-9);
    expect(out.shoulderY).toBeGreaterThanOrEqual(CAMERA.lowFloorGap);
  });
  it('a crouched shoulder already under the gap stays where it is', () => {
    const out = lowFraming(2.128, 1.1, 0, 1.5, 1, { boom: 0, shoulderY: 0 });
    expect(out.shoulderY).toBeCloseTo(1.1, 9);
  });
  it('too low for both gaps: half way between floor and ceiling', () => {
    const out = lowFraming(2.128, 1.1, 0, 0.5, 1, { boom: 0, shoulderY: 0 });
    expect(out.shoulderY).toBeCloseTo(0.25, 9);
  });
  it('a short boom (duct framing) is not lengthened', () => {
    expect(lowFraming(0.9, 0.5, 0, 1.2, 1, { boom: 0, shoulderY: 0 }).boom).toBe(0.9);
  });
  it('the vertical swing flattens with the low weight', () => {
    expect(lowSwing(1)).toBeCloseTo(CAMERA.lowSwing, 9);
    expect(lowSwing(0.5)).toBeCloseTo((1 + CAMERA.lowSwing) / 2, 9);
  });
});

describe('near plane and easing', () => {
  it('normal near plane when the boom is long, shorter only while pulled in close', () => {
    expect(nearPlane(2.2)).toBe(CAMERA.near);
    expect(nearPlane(CAMERA.nearCloseBoom)).toBe(CAMERA.nearClose);
    expect(nearPlane(0)).toBe(CAMERA.nearClose);
    const mid = nearPlane((CAMERA.nearCloseBoom + CAMERA.nearFarBoom) / 2);
    expect(mid).toBeGreaterThan(CAMERA.nearClose);
    expect(mid).toBeLessThan(CAMERA.near);
  });
  it('pull in fast, ease out slowly', () => {
    expect(easeRate(true, CAMERA.boomIn, CAMERA.boomOut)).toBe(CAMERA.boomIn);
    expect(easeRate(false, CAMERA.boomIn, CAMERA.boomOut)).toBe(CAMERA.boomOut);
    expect(CAMERA.boomIn).toBeGreaterThan(CAMERA.boomOut);
    expect(CAMERA.lowIn).toBeGreaterThan(CAMERA.lowOut);
  });
});
