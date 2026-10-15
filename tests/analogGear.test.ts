import { describe, expect, it } from 'vitest';
import { AnalogGear, GEAR_DOWN, GEAR_UP, GearState, MAX_ROCKER_GEAR, gearCap, stickCurve } from '../src/player/speedGears';
import { GEARS } from '../src/config/movement';

/** Stick magnitude that gives speed v at maximum gear `max` (inverse of cap(max) x stickCurve). */
const magFor = (v: number, max: number, crouched: boolean): number => GEARS.deadZone + (1 - GEARS.deadZone) * (v / gearCap(max, crouched));

describe('analog gear (locomotion step 17, D5.12)', () => {
  it('derives the threshold table from GEARS (midpoint +- 15% of the gap)', () => {
    const stand = [[1.125, 0.975], [1.755, 1.545], [2.52, 2.28], [3.45, 3.15], [4.58, 4.22]];
    const crouch = [[0.76, 0.64], [1.16, 1.04], [1.625, 1.475], [2.125, 1.975], [2.625, 2.475]];
    stand.forEach(([u, d], i) => {
      expect(GEAR_UP.stand[i]).toBeCloseTo(u!, 9);
      expect(GEAR_DOWN.stand[i]).toBeCloseTo(d!, 9);
    });
    crouch.forEach(([u, d], i) => {
      expect(GEAR_UP.crouch[i]).toBeCloseTo(u!, 9);
      expect(GEAR_DOWN.crouch[i]).toBeCloseTo(d!, 9);
    });
  });
  it('snaps to the highest gear whose up threshold is passed; speed is that cap', () => {
    const a = new AnalogGear();
    expect(a.update(5, false, 1)).toBe(5);
    expect(a.speed(false)).toBe(gearCap(5, false));
    a.reset();
    expect(a.update(5, false, magFor(1.2, 5, false))).toBe(2);
    expect(a.speed(false)).toBe(gearCap(2, false));
    expect(a.update(5, false, magFor(2.6, 5, false))).toBe(4);
  });
  it('any tilt past the dead zone gives gear 1; inside it, no gear', () => {
    const a = new AnalogGear();
    expect(a.update(5, false, GEARS.deadZone)).toBe(0);
    expect(a.moving).toBe(false);
    expect(a.update(5, false, GEARS.deadZone + 0.01)).toBe(1);
    expect(stickCurve(GEARS.deadZone + 0.01)).toBeGreaterThan(0);
  });
  it('hysteresis: no chatter at a threshold +- 0.02', () => {
    for (const crouched of [false, true]) {
      const up = crouched ? GEAR_UP.crouch : GEAR_UP.stand;
      const down = crouched ? GEAR_DOWN.crouch : GEAR_DOWN.stand;
      for (let b = 0; b < MAX_ROCKER_GEAR - 1; b++) {
        const a = new AnalogGear();
        a.update(MAX_ROCKER_GEAR, crouched, magFor(up[b]! + 0.02, MAX_ROCKER_GEAR, crouched));
        expect(a.gear).toBe(b + 2);
        let changes = 0;
        let g = a.gear as number;
        for (let i = 0; i < 40; i++) {
          const n = a.update(MAX_ROCKER_GEAR, crouched, magFor(up[b]! + (i % 2 ? 0.02 : -0.02), MAX_ROCKER_GEAR, crouched));
          if (n !== g) changes++;
          g = n;
        }
        expect(changes).toBe(0);
        // the same at the down threshold, from below
        a.update(MAX_ROCKER_GEAR, crouched, magFor(down[b]! - 0.02, MAX_ROCKER_GEAR, crouched));
        expect(a.gear).toBe(b + 1);
        g = a.gear;
        for (let i = 0; i < 40; i++) {
          const n = a.update(MAX_ROCKER_GEAR, crouched, magFor(down[b]! + (i % 2 ? 0.02 : -0.02), MAX_ROCKER_GEAR, crouched));
          if (n !== g) changes++;
          g = n;
        }
        expect(changes).toBe(0);
      }
    }
  });
  it('clamps to the maximum gear (crouch table too)', () => {
    const a = new AnalogGear();
    for (let max = 1; max <= 5; max++) {
      expect(a.update(max, false, 1)).toBe(max);
      expect(a.update(max, true, 1)).toBe(max);
    }
    expect(a.update(3, true, 1)).toBe(3);
    expect(a.speed(true)).toBe(gearCap(3, true));
  });
  it('gear 6 only with sprint held; the rocker stops at gear 5', () => {
    const a = new AnalogGear();
    expect(a.update(5, false, 1, true)).toBe(6);
    expect(a.update(5, false, 1, false)).toBe(5);
    // a maximum of 6 (`?gear=6` via GearState.set) without sprint stays at gear 5, standing and crouched
    a.reset();
    expect(a.update(6, false, 1, false)).toBe(5);
    expect(a.speed(false)).toBe(gearCap(5, false));
    expect(a.update(6, true, 1, false)).toBe(5);
    expect(a.update(6, false, 1, true)).toBe(6);
    const s = new GearState(4);
    s.step(1);
    s.step(1);
    s.step(1);
    expect(s.gear).toBe(MAX_ROCKER_GEAR);
    s.step(-1);
    expect(s.gear).toBe(4);
  });
  it('allocates nothing per update', () => {
    const a = new AnalogGear();
    const before = process.memoryUsage().heapUsed;
    let acc = 0;
    for (let i = 0; i < 200000; i++) acc += a.update(5, (i & 1) === 0, (i % 100) / 100);
    expect(acc).toBeGreaterThan(0);
    // a per-call allocation of even 16 bytes would add ~3 MB
    expect(process.memoryUsage().heapUsed - before).toBeLessThan(2_000_000);
  });
});
