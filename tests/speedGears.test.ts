import { describe, expect, it } from 'vitest';
import { clampGear, gearCap, gearSpeed, GearState, stickCurve } from '../src/player/speedGears';
import { noiseRadius, targetSpeed } from '../src/player/movement';
import { GEARS, MOVEMENT, NOISE_QUIET } from '../src/config/movement';

describe('speed gears (3.2.0)', () => {
  it('six gears with the spec caps, crouched and standing', () => {
    expect(GEARS.crouch).toEqual([0.5, 0.9, 1.3, 1.8, 2.3, 2.8]);
    expect(GEARS.stand).toEqual([0.8, 1.3, 2.0, 2.8, 3.8, 5.0]);
    for (let g = 1; g <= 6; g++) {
      expect(gearCap(g, true)).toBe(GEARS.crouch[g - 1]);
      expect(gearCap(g, false)).toBe(GEARS.stand[g - 1]);
    }
    expect(clampGear(0)).toBe(1);
    expect(clampGear(9)).toBe(6);
    expect(clampGear(Number.NaN)).toBe(GEARS.spawn);
  });
  it('steps one gear at a time, clamps, keeps the gear and resets to the spawn gear', () => {
    const g = new GearState();
    expect(g.gear).toBe(3);
    expect(g.step(1)).toBe(true);
    expect(g.gear).toBe(4);
    for (let i = 0; i < 5; i++) g.step(1);
    expect(g.gear).toBe(6);
    expect(g.step(1)).toBe(false);
    for (let i = 0; i < 9; i++) g.step(-1);
    expect(g.gear).toBe(1);
    const changes = g.changes;
    g.reset();
    expect(g.gear).toBe(3);
    expect(g.changes).toBe(changes + 1);
    expect(new GearState(5).gear).toBe(5);
  });
  it('stick curve: 0 inside the dead zone, linear to 1 at the rim', () => {
    expect(stickCurve(0)).toBe(0);
    expect(stickCurve(GEARS.deadZone)).toBe(0);
    expect(stickCurve(1)).toBe(1);
    expect(stickCurve(2)).toBe(1);
    const mid = (1 + GEARS.deadZone) / 2;
    expect(stickCurve(mid)).toBeCloseTo(0.5);
    // linear above the dead zone
    expect(stickCurve(0.6) - stickCurve(0.4)).toBeCloseTo(stickCurve(0.8) - stickCurve(0.6));
  });
  it('target speed = gear cap x stick curve; full deflection (keyboard / touch rim) gives the cap', () => {
    for (let g = 1; g <= 6; g++) {
      expect(targetSpeed(1, 'stand', 0, 1, MOVEMENT, g)).toBeCloseTo(GEARS.stand[g - 1]!);
      expect(targetSpeed(1, 'crouch', 0, 1, MOVEMENT, g)).toBeCloseTo(GEARS.crouch[g - 1]!);
      expect(gearSpeed(g, false, 0.5)).toBeCloseTo(GEARS.stand[g - 1]! * stickCurve(0.5));
    }
    expect(targetSpeed(0.02, 'stand', 0, 1, MOVEMENT, 6)).toBe(0);
  });
  it('aiming is capped at the aim paces; the sprint is gear 6 standing', () => {
    expect(targetSpeed(1, 'ads', 0, 1, MOVEMENT, 6)).toBeCloseTo(MOVEMENT.adsSpeed);
    expect(targetSpeed(1, 'ads', 0, 1, MOVEMENT, 1)).toBeCloseTo(0.8);
    expect(targetSpeed(1, 'adsCrouch', 0, 1, MOVEMENT, 6)).toBeCloseTo(MOVEMENT.adsCrouchSpeed);
    expect(targetSpeed(1, 'ads', 0, -1, MOVEMENT, 6)).toBeCloseTo(MOVEMENT.adsSpeed * MOVEMENT.backMult);
    expect(targetSpeed(0.3, 'sprint', 0, 1, MOVEMENT, 2)).toBeCloseTo(5.0);
  });
  it('noise: crouched gears 1-4 and standing gears 1-2 are silent (with the stride swell); faster gears are heard', () => {
    const swell = 1 + MOVEMENT.rootDip;
    for (let g = 1; g <= 4; g++) expect(noiseRadius(GEARS.crouch[g - 1]! * swell, true, false)).toBe(0);
    for (let g = 1; g <= 2; g++) expect(noiseRadius(GEARS.stand[g - 1]! * swell, false, false)).toBe(0);
    expect(noiseRadius(GEARS.crouch[4]! * (1 - MOVEMENT.rootDip), true, false)).toBeGreaterThan(0);
    expect(noiseRadius(GEARS.stand[2]! * (1 - MOVEMENT.rootDip), false, false)).toBeGreaterThan(0);
    // louder with every gear, sprinting loudest
    let last = 0;
    for (let g = 3; g <= 6; g++) {
      const n = noiseRadius(GEARS.stand[g - 1]!, false, false);
      expect(n).toBeGreaterThan(last);
      last = n;
    }
    expect(noiseRadius(5, false, true)).toBeGreaterThan(last);
    expect(NOISE_QUIET.crouch).toBeLessThan(GEARS.crouch[4]! * (1 - MOVEMENT.rootDip));
    expect(NOISE_QUIET.stand).toBeLessThan(GEARS.stand[2]! * (1 - MOVEMENT.rootDip));
  });
});
