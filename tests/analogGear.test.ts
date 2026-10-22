import { describe, expect, it } from 'vitest';
import { AnalogGear, GEAR_DOWN, GEAR_UP, GearState, MAX_ROCKER_GEAR, gearCap, stickCurve, stickMagFor, stickSpeed } from '../src/player/speedGears';
import { GEARS, KBM_PACE, STICK_SPEED } from '../src/config/movement';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

/** Stick magnitude that asks for speed v (the inverse of the analogue curve). */
const magFor = (v: number, crouched: boolean): number => stickMagFor(v, crouched);

describe('analog gear thresholds (locomotion step 17, D5.12)', () => {
  it('derives the threshold table from GEARS (midpoint +- 15% of the gap)', () => {
    // (playtest 2) the old speed 2 is the slowest: standing 0.75 / 1.4 / 2.1 / 3.0 / 4.5 (G1), crouched 0.85 / 1.3 / 1.7 / 2.15 / 2.6
    const stand = [[1.1725, 0.9775], [1.855, 1.645], [2.685, 2.415], [3.65, 3.35]];
    const crouch = [[1.1425, 1.0075], [1.56, 1.44], [1.9925, 1.8575], [2.4425, 2.3075]];
    stand.forEach(([u, d], i) => {
      expect(GEAR_UP.stand[i]).toBeCloseTo(u!, 9);
      expect(GEAR_DOWN.stand[i]).toBeCloseTo(d!, 9);
    });
    crouch.forEach(([u, d], i) => {
      expect(GEAR_UP.crouch[i]).toBeCloseTo(u!, 9);
      expect(GEAR_DOWN.crouch[i]).toBeCloseTo(d!, 9);
    });
  });
});

// (anim-rework S1, Michael 2026-10-20: "remove the speed toggle, and allow full speed control via the analogue stick
// depending on how far you push the stick"; BRIEF section 1: a dead zone, then most of the travel to creep / sneak /
// walk, the last ~20 % to the jog and the run)
describe('analogue speed (anim-rework S1)', () => {
  it('the curve: the slowest creep at the dead-zone edge, the five speeds at their points, the stealth range to 0.8', () => {
    expect(stickSpeed(0, false)).toBe(0);
    expect(stickSpeed(1e-6, false)).toBeCloseTo(STICK_SPEED.minStand, 4);
    for (let g = 1; g <= 5; g++) {
      expect(stickSpeed(STICK_SPEED.at[g]!, false)).toBeCloseTo(GEARS.stand[g - 1]!, 9);
      expect(stickSpeed(STICK_SPEED.at[g]!, true)).toBeCloseTo(GEARS.crouch[g - 1]!, 9);
    }
    // the walk at 80 % of the travel; jog and run in the last fifth; the run from 0.97 to the rim
    expect(STICK_SPEED.at[3]).toBe(0.8);
    expect(stickSpeed(0.8, false)).toBeCloseTo(2.1, 9);
    expect(stickSpeed(0.985, false)).toBe(4.0);
    expect(stickSpeed(1, true)).toBe(2.6);
  });
  it('rises continuously with the stick (no steps), standing and crouched', () => {
    for (const crouched of [false, true]) {
      let last = 0;
      for (let i = 1; i <= 1000; i++) {
        const v = stickSpeed(i / 1000, crouched);
        expect(v).toBeGreaterThanOrEqual(last);
        // no jump bigger than the steepest segment allows over 0.001 of travel (the run segment: 1.5 m/s over 0.07)
        expect(v - last).toBeLessThan(i === 1 ? 0.5 : 0.03);
        last = v;
      }
    }
  });
  it('raw pad stick 50 / 80 / 90 / 100 % (radial dead zone 0.15): sneak / walk / jog / run', () => {
    const dz = 0.15;
    const at = (raw: number): number => stickSpeed(stickCurve((raw - dz) / (1 - dz)), false);
    expect(at(0.5)).toBeGreaterThan(1.2);
    expect(at(0.5)).toBeLessThan(1.5);
    expect(at(0.8)).toBeGreaterThan(1.9);
    expect(at(0.8)).toBeLessThan(2.15);
    expect(at(0.9)).toBeGreaterThan(2.6);
    expect(at(0.9)).toBeLessThan(3.2);
    expect(at(1)).toBe(4.0);
  });
  it('the analogue gear: v continuous, the nearest named speed with hysteresis, the pace band covers v', () => {
    const a = new AnalogGear();
    expect(a.update(5, false, 1)).toBe(5);
    expect(a.speed()).toBe(4.0);
    expect(a.band).toBe(5);
    // from the run, 1.75 m/s is still above gear 3's down threshold (hysteresis); from rest it is gear 2
    a.update(5, false, magFor(1.75, false));
    expect(a.v).toBeCloseTo(1.75, 6);
    expect(a.gear).toBe(3);
    a.reset();
    a.update(5, false, magFor(1.75, false));
    expect(a.gear).toBe(2);
    expect(a.band).toBe(3);
    // the band's speed + 15% (the host check) always covers the pace
    for (let i = 1; i <= 100; i++) {
      for (const crouched of [false, true]) {
        a.update(5, crouched, i / 100);
        if (a.moving) expect(gearCap(a.band, crouched) * 1.15).toBeGreaterThanOrEqual(a.v);
      }
    }
  });
  it('the internal cap (tests, tools: ?gear=N) holds the speed at its gear; 5 is no cap', () => {
    const a = new AnalogGear();
    for (let max = 1; max <= 5; max++) {
      a.update(max, false, 1);
      expect(a.v).toBe(gearCap(max, false));
      expect(a.gear).toBe(max);
      a.update(max, true, 1);
      expect(a.v).toBe(gearCap(max, true));
    }
    a.update(3, false, magFor(1.0, false));
    expect(a.v).toBeCloseTo(1.0, 6);
    expect(new GearState().gear).toBe(5);
  });
  it('any tilt past the dead zone moves; inside it, nothing', () => {
    const a = new AnalogGear();
    expect(a.update(5, false, GEARS.deadZone)).toBe(0);
    expect(a.moving).toBe(false);
    expect(a.speed()).toBe(0);
    expect(a.update(5, false, GEARS.deadZone + 0.01)).toBe(1);
    expect(a.v).toBeGreaterThan(STICK_SPEED.minStand);
  });
  it('the keyboard (A1): WASD walk, Shift run, Alt creep', () => {
    expect(stickSpeed(stickCurve(KBM_PACE.walk), false)).toBeCloseTo(GEARS.stand[2]!, 6);
    expect(stickSpeed(stickCurve(KBM_PACE.run), false)).toBe(GEARS.stand[4]);
    expect(stickSpeed(stickCurve(KBM_PACE.creep), false)).toBeCloseTo(GEARS.stand[0]!, 6);
    expect(stickSpeed(stickCurve(KBM_PACE.creep), true)).toBeCloseTo(GEARS.crouch[0]!, 6);
  });
  it('hysteresis: the nearest named speed does not chatter at a threshold +- 0.02', () => {
    for (const crouched of [false, true]) {
      const up = crouched ? GEAR_UP.crouch : GEAR_UP.stand;
      const down = crouched ? GEAR_DOWN.crouch : GEAR_DOWN.stand;
      for (let b = 0; b < MAX_ROCKER_GEAR - 1; b++) {
        const a = new AnalogGear();
        a.update(MAX_ROCKER_GEAR, crouched, magFor(up[b]! + 0.02, crouched));
        expect(a.gear).toBe(b + 2);
        let changes = 0;
        let g = a.gear as number;
        for (let i = 0; i < 40; i++) {
          const n = a.update(MAX_ROCKER_GEAR, crouched, magFor(up[b]! + (i % 2 ? 0.02 : -0.02), crouched));
          if (n !== g) changes++;
          g = n;
        }
        expect(changes).toBe(0);
        a.update(MAX_ROCKER_GEAR, crouched, magFor(down[b]! - 0.02, crouched));
        expect(a.gear).toBe(b + 1);
        g = a.gear;
        for (let i = 0; i < 40; i++) {
          const n = a.update(MAX_ROCKER_GEAR, crouched, magFor(down[b]! + (i % 2 ? 0.02 : -0.02), crouched));
          if (n !== g) changes++;
          g = n;
        }
        expect(changes).toBe(0);
      }
    }
  });
  it('allocates nothing per update', async () => {
    const a = new AnalogGear();
    // inputs precomputed, the result into a typed slot (+= on a captured let boxes 16 B an iteration)
    const T = inputs(2000, (i) => (i % 100) / 100);
    const S = inputs(2000, (i) => (i % 97) / 97);
    sink[0] = 0;
    // gc() + new space per iteration (tests/helpers/allocPerCall.ts): heapUsed read other work's garbage (3.5 MB on a
    // loaded CI runner, e2e-pad-fix) or a GC's leftovers. An iteration leaves only boxed doubles (the stick values
    // passed in and a speed returned, 48 B); one more { x, y, z } would read 96 B.
    const per = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) sink[0]! += a.update(5, (i & 1) === 0, T[i]!) + stickSpeed(S[i]!, false);
    }, 4 * HEAP_NUMBER);
    console.info(`bytes per AnalogGear.update + stickSpeed: ${per.toFixed(1)}`);
    expect(sink[0]!).toBeGreaterThan(0);
    expect(per).toBeLessThanOrEqual(4 * HEAP_NUMBER);
  });
});
