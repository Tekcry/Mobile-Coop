/**
 * J14 G-A2: the A2 station tick (`src/game/course/replan/a2Ticks.ts`), station 4's neck windows, on fake hooks (a plain
 * object implementing `StationHooks`): the window is `g-a2-neck`'s dark; the lights back with a player in the neck retries
 * station 4 once (cause `timer`), with nobody there it is no fail; the second crossing's window (after the 3 s re-arm) is
 * judged on its own; an `epoch()` change mid-window forgets it; nothing happens while station 4 is not live.
 */
import { describe, expect, it } from 'vitest';
import { a2Tick, A2_NECK_GATE, A2_NECK_STATION, A2_NECK_ZONE } from '../../../src/game/course/replan/a2Ticks';
import { REPLAN_TICKS, type StationHooks, type TickZone } from '../../../src/game/course/replan/ticks';
import { A2_GATE } from '../../../src/world/maps/ctcourseSets/a2CarriageShed';

/** A fake host: the live station, the neck gate's dark, players' feet, the epoch; records every retry asked for. */
function fake() {
  const s = { live: A2_NECK_STATION, dark: false, feet: [] as { x: number; y: number; z: number }[], epoch: 1, t: 0 };
  const retries: [number, string][] = [];
  const zones: TickZone[] = [];
  const h: StationHooks = {
    flag: () => false,
    live: () => s.live,
    retry: (n, cause) => {
      retries.push([n, cause]);
      return n === s.live;
    },
    playersIn: (zone) => {
      zones.push(zone);
      let c = 0;
      for (const f of s.feet) if (f.x >= zone[0] && f.x <= zone[2] && f.z >= zone[1] && f.z <= zone[3]) c++;
      return c;
    },
    now: () => s.t,
    gate: (id) => id === A2_NECK_GATE && s.dark,
    down: () => false,
    jammed: () => false,
    lit: () => true,
    tripped: () => false,
    epoch: () => s.epoch,
  };
  let epochs = 100;
  /** `n` fixed steps of 1/60 s. */
  const step = (n = 1): void => {
    for (let i = 0; i < n; i++) {
      s.t += 1 / 60;
      a2Tick(h, 1 / 60);
    }
  };
  /** A fresh match: a new epoch never seen before (module state from an earlier case is forgotten). */
  const fresh = (): void => {
    s.epoch = ++epochs;
    s.dark = false;
    s.feet = [];
    s.live = A2_NECK_STATION;
    step();
  };
  return { s, h, retries, zones, step, fresh };
}
const IN_NECK = { x: 51, y: 0, z: 12.5 };
const IN_LANE = { x: 40, y: 0, z: 12.5 };
const EAST = { x: 60, y: 0, z: 12.5 };

describe('A2 station tick: station 4, the neck windows', () => {
  it('is the registered A2 tick; the gate is the set\'s isolator; the neck is STATIONS section 5\'s box', () => {
    expect(REPLAN_TICKS.A2).toBe(a2Tick);
    expect(A2_NECK_GATE).toBe(A2_GATE);
    expect(A2_NECK_STATION).toBe(4);
    expect([...A2_NECK_ZONE]).toEqual([46, 0.3, 56, 19.7]);
  });

  it('dark then lit with a player in the neck retries station 4 once, cause timer', () => {
    const f = fake();
    f.fresh();
    f.s.feet = [IN_NECK, IN_LANE];
    f.s.dark = true;
    f.step(60 * 15);
    expect(f.retries).toEqual([]);
    f.s.dark = false;
    f.step();
    expect(f.retries).toEqual([[4, 'timer']]);
    // the lights stay on: no second retry for the same window
    f.step(120);
    expect(f.retries).toHaveLength(1);
  });

  it('a window that closes with nobody in the neck is no fail', () => {
    const f = fake();
    f.fresh();
    f.s.feet = [IN_LANE, EAST];
    f.s.dark = true;
    f.step(60 * 15);
    f.s.dark = false;
    f.step(60);
    expect(f.retries).toEqual([]);
    // the zone read is the neck's (a player on the neck's edge, x 46, counts; one at x 45.9 does not)
    f.s.feet = [{ x: 45.9, y: 0, z: 12.5 }];
    f.s.dark = true;
    f.step(10);
    f.s.dark = false;
    f.step();
    expect(f.retries).toEqual([]);
    f.s.feet = [{ x: 46, y: 0, z: 12.5 }];
    f.s.dark = true;
    f.step(10);
    f.s.dark = false;
    f.step();
    expect(f.retries).toEqual([[4, 'timer']]);
  });

  it('two crossings, one window each: the first clean, the second (after the 3 s re-arm) judged on its own', () => {
    const f = fake();
    f.fresh();
    // B crosses in the first window and is east when the lights come back
    f.s.feet = [IN_LANE, IN_NECK];
    f.s.dark = true;
    f.step(60 * 8);
    f.s.feet = [IN_LANE, EAST];
    f.step(60 * 7);
    f.s.dark = false;
    f.step(60 * 3);
    expect(f.retries).toEqual([]);
    // the second window: A is still in the neck when it ends
    f.s.dark = true;
    f.s.feet = [IN_NECK, EAST];
    f.step(60 * 15);
    f.s.dark = false;
    f.step();
    expect(f.retries).toEqual([[4, 'timer']]);
    // and a third window after that, clean, adds nothing
    f.s.feet = [EAST, EAST];
    f.s.dark = true;
    f.step(60);
    f.s.dark = false;
    f.step();
    expect(f.retries).toHaveLength(1);
  });

  it('an epoch change mid-window forgets it (a gate still dark is no window until it has been seen shut)', () => {
    const f = fake();
    f.fresh();
    f.s.feet = [IN_NECK];
    f.s.dark = true;
    f.step(60 * 5);
    // a retry (or a bay restart) under way: the epoch rises while the gate still reads dark
    f.s.epoch += 1;
    f.step(60);
    f.s.dark = false;
    f.step();
    expect(f.retries).toEqual([]);
    // the next window under the new epoch counts again
    f.s.dark = true;
    f.step(60);
    f.s.dark = false;
    f.step();
    expect(f.retries).toEqual([[4, 'timer']]);
  });

  it('nothing happens while station 4 is not live (station 3, station 5, none)', () => {
    for (const live of [3, 5, 0]) {
      const f = fake();
      f.fresh();
      f.s.live = live;
      f.s.feet = [IN_NECK, IN_NECK];
      f.s.dark = true;
      f.step(60);
      f.s.dark = false;
      f.step(60);
      expect(f.retries, `live ${live}`).toEqual([]);
    }
  });

  it('reads the same zone object every step (no allocation per call)', () => {
    const f = fake();
    f.fresh();
    f.s.feet = [IN_NECK];
    for (let k = 0; k < 3; k++) {
      f.s.dark = true;
      f.step(5);
      f.s.dark = false;
      f.step();
    }
    expect(f.zones.length).toBe(3);
    for (const z of f.zones) expect(z).toBe(A2_NECK_ZONE);
  });
});
