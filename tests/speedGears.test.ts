import { describe, expect, it } from 'vitest';
import { clampGear, coverPace, gearCap, gearSpeed, GearState, StickRelease, stickCurve } from '../src/player/speedGears';
import { noiseRadius, targetSpeed } from '../src/player/movement';
import { CT, GEARS, MOVEMENT, NOISE_QUIET } from '../src/config/movement';

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
  it('cover strafe: the gear pace, capped along the wall (gear 3 ~ the 2.x cover pace)', () => {
    expect(coverPace(1, false)).toBeCloseTo(0.8);
    expect(coverPace(3, false)).toBeCloseTo(2.0);
    expect(coverPace(6, false)).toBeCloseTo(GEARS.coverMax.stand);
    expect(coverPace(1, true)).toBeCloseTo(0.5);
    expect(coverPace(3, true)).toBeCloseTo(1.3);
    expect(coverPace(6, true)).toBeCloseTo(GEARS.coverMax.crouch);
    for (let g = 1; g < 6; g++) expect(coverPace(g + 1, false)).toBeGreaterThanOrEqual(coverPace(g, false));
  });
});

describe('stick release (3.2.0)', () => {
  const dt = 1 / 60;
  it('a stick springing back keeps its deflection until it reaches the dead zone (a release from full pace)', () => {
    const r = new StickRelease();
    for (let k = 0; k < 10; k++) r.update(0, 1, dt);
    const seen: number[] = [];
    for (const y of [0.6, 0.25, 0.08, 0]) {
      r.update(0, y, dt);
      seen.push(r.y);
    }
    expect(seen.slice(0, 3)).toEqual([1, 1, 1]);
    expect(seen[3]).toBe(0);
  });
  it('a deliberate slow-down follows the stick; a quick drop that settles lets go at once', () => {
    const r = new StickRelease();
    for (let k = 0; k < 10; k++) r.update(0, 1, dt);
    // easing off over 0.3 s (under the release rate)
    for (let k = 1; k <= 18; k++) {
      const y = 1 - (0.5 * k) / 18;
      r.update(0, y, dt);
      expect(r.y).toBeCloseTo(y);
    }
    // a quick drop to 0.2 that stops there
    r.update(0, 0.35, dt);
    expect(r.y).toBeCloseTo(0.5);
    r.update(0, 0.2, dt);
    r.update(0, 0.2, dt);
    expect(r.y).toBeCloseTo(0.2);
    expect(r.latched).toBe(false);
  });
  it('a latch never outlasts the release window', () => {
    const r = new StickRelease();
    for (let k = 0; k < 10; k++) r.update(1, 0, dt);
    let y = 1;
    let latchedFor = 0;
    for (let k = 0; k < 30; k++) {
      y = Math.max(0.06, y - 0.08);
      r.update(y, 0, dt);
      if (r.latched) latchedFor += dt;
    }
    expect(latchedFor).toBeLessThanOrEqual(CT.releaseWindow + dt);
    expect(r.x).toBeCloseTo(0.06);
  });
});
