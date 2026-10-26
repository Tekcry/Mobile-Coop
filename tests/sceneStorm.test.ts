/**
 * (piano-escape S6) The storm's sound: the thunder schedule (from the map's lightning data), the per-step clock (loop
 * seam, restart / jump, no roll before the EMP) and the rain's height curve. Schedules only: no audio context.
 */
import { describe, expect, it } from 'vitest';
import {
  DOUBLE_GAP,
  JUMP_S,
  RAIN_GALLERY,
  RAIN_GALLERY_Y,
  RAIN_GROUND,
  THUNDER_DELAY,
  ThunderClock,
  rainGain,
  rollVar,
  thunderRolls,
  thunderTimes,
} from '../src/audio/sceneStorm';
import { DECK_Y, THORNBECK_FLASH_TIMES, THORNBECK_LIGHTNING } from '../src/world/maps/thornbeckMill';

const P = THORNBECK_LIGHTNING.period;

/** Run a clock from `from` to `to` in 1/60 s steps; the times (scene clock) at which a roll fired. */
function run(c: ThunderClock, from: number, to: number): number[] {
  const out: number[] = [];
  for (let t = from; t <= to + 1e-9; t += 1 / 60) {
    const i = c.step(t);
    if (i >= 0) out.push(c.rolls[i]!.t);
  }
  return out;
}

describe('S6: the thunder schedule', () => {
  it('Thornbeck: 18 rolls a period, each 2.0 s after its flash, the doubles merged', () => {
    expect(THORNBECK_LIGHTNING.flashes).toHaveLength(24);
    const times = thunderTimes(THORNBECK_LIGHTNING.flashes, P);
    expect(times).toHaveLength(18);
    expect(times).toEqual(THORNBECK_FLASH_TIMES.map(([t]) => t + THUNDER_DELAY));
    // sorted, all inside one period (the last flash, 148 s, rolls at 150 s)
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(times[times.length - 1]).toBeLessThan(P);
    // a double (36.68 + 0.45) gives one roll, 2.0 s after the first entry, not a second 0.45 s later
    expect(times).toContain(36.68 + THUNDER_DELAY);
    expect(times).not.toContain(36.68 + 0.45 + THUNDER_DELAY);
    expect(THORNBECK_LIGHTNING.flashes.filter((f) => f.t === 36.68 + 0.45)).toHaveLength(1);
  });

  it('a roll carries the strongest peak of its group and a stable group index', () => {
    const rolls = thunderRolls(THORNBECK_LIGHTNING.flashes, P);
    expect(rolls.map((r) => r.i)).toEqual(rolls.map((_, k) => k));
    expect(rolls.every((r) => r.peak === 1 && !r.wrapped)).toBe(true);
    const r = thunderRolls([{ t: 1, peak: 0.5, len: 0.5 }, { t: 1 + DOUBLE_GAP - 0.05, peak: 0.9, len: 0.5 }], 0);
    expect(r).toHaveLength(1);
    expect(r[0]!.peak).toBe(0.9);
    // just past the gap it is its own strike
    expect(thunderRolls([{ t: 1, peak: 1, len: 0.5 }, { t: 1 + DOUBLE_GAP + 0.05, peak: 1, len: 0.5 }], 0)).toHaveLength(2);
  });

  it('the loop seam: a flash near the end rolls past the period and wraps into the next', () => {
    const fl = [{ t: 5, peak: 1, len: 0.6 }, { t: 159, peak: 1, len: 0.6 }];
    const rolls = thunderRolls(fl, P);
    expect(rolls.map((r) => r.t)).toEqual([159 + 2 - P, 7].sort((a, b) => a - b));
    expect(rolls[0]!.wrapped).toBe(true);
    expect(rolls[0]!.t).toBeCloseTo(0.96, 6);
    // the first period has no flash behind the seam: no roll at 0.96 s; later periods do
    const c = new ThunderClock(rolls, P);
    // period 1: the 7 s roll; period 2: the seam roll (0.96 s) from the 159 s flash, then the 7 s roll again
    expect(run(c, 0, P + 10)).toEqual([7, rolls[0]!.t, 7]);
    // no loop: nothing wraps
    expect(thunderTimes(fl, 0)).toEqual([7, 161]);
  });

  it('fires each roll once in a period and again in the next', () => {
    const times = thunderTimes(THORNBECK_LIGHTNING.flashes, P);
    const c = new ThunderClock(thunderRolls(THORNBECK_LIGHTNING.flashes, P), P);
    const fired = run(c, 0, 2 * P - 1);
    expect(fired).toHaveLength(36);
    expect(fired.slice(0, 18)).toEqual(times);
    expect(fired.slice(18)).toEqual(times);
  });

  it('no roll before the EMP (t0 = +Infinity), none at a negative clock', () => {
    const c = new ThunderClock(thunderRolls(THORNBECK_LIGHTNING.flashes, P), P);
    for (let sim = 0; sim < 300; sim += 0.5) expect(c.step(sim - Number.POSITIVE_INFINITY)).toBe(-1);
    expect(c.step(-3)).toBe(-1);
    expect(c.step(Number.NaN)).toBe(-1);
    // the press: the clock starts at 0 and the first roll is the 8 s one
    expect(run(c, 0, 9)).toEqual([8]);
  });

  it('a restart of the clock, a seek or a late join re-seeks without firing the missed rolls', () => {
    const rolls = thunderRolls(THORNBECK_LIGHTNING.flashes, P);
    // a late join well into the loop: nothing fires on the way in, the next roll is the next one due
    let c = new ThunderClock(rolls, P);
    expect(c.step(100)).toBe(-1);
    expect(run(c, 100, 105.9)).toEqual([]);
    expect(run(c, 105.9, 108)).toEqual([106]);
    // a backward step (the clock restarted) re-seeks: the rolls behind are not replayed
    c = new ThunderClock(rolls, P);
    run(c, 0, 50);
    expect(c.step(20)).toBe(-1);
    expect(run(c, 20, 29)).toEqual([]);
    expect(run(c, 29, 31)).toEqual([30]);
    // a stalled page (a step over JUMP_S) skips the rolls it spanned
    c = new ThunderClock(rolls, P);
    run(c, 0, 5);
    expect(c.step(5 + JUMP_S + 30)).toBe(-1);
    expect(run(c, 36, 38.5)).toEqual([]);
    expect(run(c, 38.5, 39)).toHaveLength(1);
    // a jump into the next loop
    c = new ThunderClock(rolls, P);
    run(c, 0, 1);
    expect(c.step(P + 7)).toBe(-1);
    expect(run(c, P + 7, P + 8.5)).toEqual([8]);
  });

  it('the variation is a pure function of the roll index', () => {
    for (let i = 0; i < 18; i++) {
      for (let s = 0; s < 6; s++) {
        const v = rollVar(i, s);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
        expect(rollVar(i, s)).toBe(v);
      }
    }
    expect(rollVar(1, 1)).not.toBe(rollVar(2, 1));
  });
});

describe('S6: the rain follows the listener height', () => {
  it('the gallery is the map deck and the levels are ordered', () => {
    expect(RAIN_GALLERY_Y).toBe(DECK_Y);
    expect(RAIN_GALLERY).toBeGreaterThan(RAIN_GROUND);
    expect(rainGain(0)).toBe(RAIN_GROUND);
    expect(rainGain(DECK_Y)).toBe(RAIN_GALLERY);
  });

  it('is monotonic in height and clamped at both ends', () => {
    let prev = -1;
    for (let y = -3; y <= 9; y += 0.05) {
      const g = rainGain(y);
      expect(g).toBeGreaterThanOrEqual(prev);
      expect(g).toBeGreaterThanOrEqual(RAIN_GROUND);
      expect(g).toBeLessThanOrEqual(RAIN_GALLERY);
      prev = g;
    }
    expect(rainGain(-50)).toBe(RAIN_GROUND);
    expect(rainGain(50)).toBe(RAIN_GALLERY);
    expect(rainGain(Number.NaN)).toBe(RAIN_GROUND);
    // smooth: a half step up the stair is strictly between
    expect(rainGain(DECK_Y / 2)).toBeCloseTo((RAIN_GROUND + RAIN_GALLERY) / 2, 9);
  });
});
