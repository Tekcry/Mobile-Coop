/**
 * J14 G-A5: the A5 station tick (`src/game/course/replan/a5Ticks.ts`), station 13's flood window and beam trip, on fake hooks
 * (a plain object implementing `StationHooks`): the kiosk flood (light group 52) dark while station 13 is live arms the window;
 * the flood lit again before `a5-release` retries 13 once (cause `timer`); the release set first, or a flood shot out (dark for
 * good), is no fail; a lit flood before any window opens is no fail; `laser-a5` tripped retries 13 once (cause `seen`), checked
 * before the flood rule; an `epoch()` change disarms the window; (fix 1) only a lit-to-dark change within the attempt arms it
 * (a jam running on past a retry does not), and a refused `retry()` spends nothing; nothing happens while 13 is not live. The tick reads only
 * `live`, `lit`, `flag`, `tripped`, `epoch` and calls `retry`.
 */
import { describe, expect, it } from 'vitest';
import { a5Tick, A5_BEAMS, A5_FLOOD_GROUP, A5_THROW_DONE, A5_THROW_N } from '../../../src/game/course/replan/a5Ticks';
import { REPLAN_TICKS, type StationHooks } from '../../../src/game/course/replan/ticks';
import { A5_LASER, A5_RELEASE_FLAG } from '../../../src/world/maps/ctcourseSets/a5Substation';

/** The epoch counter: never repeats across cases, as the real hook's never repeats across matches. */
let epochs = 100;

/** A fake host: the live station, the flood's lit state, the done flag, the beam trip, the epoch; records every call asked for. */
function fake() {
  const s = { live: A5_THROW_N, flood: true, released: false, tripped: false, epoch: 1 };
  const retries: [number, string][] = [];
  const flagIds: string[] = [];
  const laserIds: string[] = [];
  const groups: number[] = [];
  const unused = (name: string) => (): never => {
    throw new Error(`the A5 tick must not read ${name}`);
  };
  const h: StationHooks = {
    flag: (id) => {
      flagIds.push(id);
      return id === A5_RELEASE_FLAG && s.released;
    },
    live: () => s.live,
    retry: (n, cause) => {
      retries.push([n, cause]);
      return n === s.live;
    },
    playersIn: unused('playersIn'),
    now: unused('now'),
    gate: unused('gate'),
    down: unused('down'),
    jammed: unused('jammed'),
    lit: (g) => {
      groups.push(g);
      return g === A5_FLOOD_GROUP && s.flood;
    },
    tripped: (id) => {
      laserIds.push(id);
      return id === A5_LASER && s.tripped;
    },
    epoch: () => s.epoch,
  };
  /** `n` fixed steps of 1/60 s. */
  const step = (n = 1): void => {
    for (let i = 0; i < n; i++) a5Tick(h, 1 / 60);
  };
  /** A fresh match: an epoch never seen before (module state from an earlier case is forgotten). */
  const fresh = (): void => {
    s.epoch = ++epochs;
    s.live = A5_THROW_N;
    s.flood = true;
    s.released = false;
    s.tripped = false;
    step();
  };
  return { s, h, retries, flagIds, laserIds, groups, step, fresh };
}

describe('A5 station tick: station 13, the flood window and the beam trip', () => {
  it('is the registered A5 tick; station 13, the done flag a5-release, the kiosk flood group 52 and the gateway\'s laser-a5 are the set\'s', () => {
    expect(REPLAN_TICKS.A5).toBe(a5Tick);
    expect(A5_THROW_N).toBe(13);
    expect(A5_THROW_DONE).toBe(A5_RELEASE_FLAG);
    expect(A5_BEAMS).toBe(A5_LASER);
    expect(A5_FLOOD_GROUP).toBe(52);
  });

  it('the flood dark, then lit again before the release, retries station 13 once with cause timer', () => {
    const f = fake();
    f.fresh();
    f.step(60 * 3);
    f.s.flood = false;
    f.step(60 * 5);
    expect(f.retries).toEqual([]);
    f.s.flood = true;
    f.step();
    expect(f.retries).toEqual([[13, 'timer']]);
    // the flood stays lit: the window is spent, no second retry in the same epoch
    f.step(120);
    expect(f.retries).toHaveLength(1);
  });

  it('the flood dark, then the release set (the flood may come back after): no retry', () => {
    const f = fake();
    f.fresh();
    f.s.flood = false;
    f.step(60);
    f.s.released = true;
    f.step(60);
    f.s.flood = true;
    f.step(60 * 10);
    expect(f.retries).toEqual([]);
    // and the station moving on (live 0) with the flood back: nothing either
    f.s.live = 0;
    f.step(60);
    expect(f.retries).toEqual([]);
  });

  it('the release set on the same step the flood comes back is no fail (the release wins)', () => {
    const f = fake();
    f.fresh();
    f.s.flood = false;
    f.step(30);
    f.s.released = true;
    f.s.flood = true;
    f.step();
    expect(f.retries).toEqual([]);
  });

  it('a flood shot out (it stays unlit) never fails the window, however long it stays dark', () => {
    const f = fake();
    f.fresh();
    f.s.flood = false;
    f.step(60 * 120);
    expect(f.retries).toEqual([]);
    f.s.released = true;
    f.step(60);
    expect(f.retries).toEqual([]);
  });

  it('a lit flood before any window opens is no fail', () => {
    const f = fake();
    f.fresh();
    f.step(60 * 60);
    expect(f.retries).toEqual([]);
    // the beams unbroken, the done flag unset: still nothing
    expect(f.flagIds.every((id) => id === A5_RELEASE_FLAG)).toBe(true);
  });

  it('laser-a5 tripped retries station 13 once with cause seen; the same step\'s flood rule does not add a second retry', () => {
    const f = fake();
    f.fresh();
    f.s.flood = false;
    f.step(60);
    f.s.tripped = true;
    f.s.flood = true;
    f.step();
    expect(f.retries).toEqual([[13, 'seen']]);
    f.step(120);
    expect(f.retries).toHaveLength(1);
  });

  it('a trip with the flood dark is a seen retry too, and a trip alone (the flood lit all along) retries once', () => {
    const a = fake();
    a.fresh();
    a.s.flood = false;
    a.step(30);
    a.s.tripped = true;
    a.step(30);
    expect(a.retries).toEqual([[13, 'seen']]);
    const b = fake();
    b.fresh();
    b.step(10);
    b.s.tripped = true;
    b.step(10);
    expect(b.retries).toEqual([[13, 'seen']]);
  });

  it('an epoch change (a retry, a bay restart) disarms the window: the flood back after it is no fail; a new window in the new epoch still works', () => {
    const f = fake();
    f.fresh();
    f.s.flood = false;
    f.step(60);
    f.s.epoch += 1;
    f.s.flood = true;
    f.step(60);
    expect(f.retries).toEqual([]);
    // the new epoch's own window: dark, then lit
    f.s.flood = false;
    f.step(30);
    f.s.flood = true;
    f.step();
    expect(f.retries).toEqual([[13, 'timer']]);
    // a retry bumps the epoch (the real hook): the next window is a fresh one that can fail again
    f.s.epoch += 1;
    f.step();
    f.s.flood = false;
    f.step(30);
    f.s.flood = true;
    f.step();
    expect(f.retries).toEqual([[13, 'timer'], [13, 'timer']]);
  });

  it('an epoch change clears a beam trip the tick had not acted on, and the spent retry of the old epoch', () => {
    const f = fake();
    f.fresh();
    f.s.tripped = true;
    f.step();
    expect(f.retries).toEqual([[13, 'seen']]);
    // the hook clears `tripped` with the epoch (the retry's own): the new epoch is quiet
    f.s.epoch += 1;
    f.s.tripped = false;
    f.step(120);
    expect(f.retries).toHaveLength(1);
    f.s.tripped = true;
    f.step();
    expect(f.retries).toEqual([[13, 'seen'], [13, 'seen']]);
  });

  it('nothing happens while station 13 is not live: no window opens, no beam counts, and a window armed before it ended with it', () => {
    const f = fake();
    f.fresh();
    f.s.live = 12;
    f.s.flood = false;
    f.s.tripped = true;
    f.step(60);
    f.s.flood = true;
    f.step(60);
    expect(f.retries).toEqual([]);
    // the flood dark while 12 is live does not arm 13's window
    f.s.tripped = false;
    f.s.flood = false;
    f.step(60);
    f.s.live = 13;
    f.s.flood = true;
    f.step(60);
    expect(f.retries).toEqual([]);
    // a window armed on 13, then 13 not live (the bay left it), then 13 live again with the flood lit: spent
    f.s.flood = false;
    f.step(30);
    f.s.live = 0;
    f.step(30);
    f.s.live = 13;
    f.s.flood = true;
    f.step(30);
    expect(f.retries).toEqual([]);
  });

  /**
   * (fix 1) A fake with the real retry's hold (`CourseMode.stationRetry`): a retry taken bumps the epoch (the hook clears
   * the trip with it) and holds 1.5 s, inside which `retry()` refuses; a retry never touches the flood (a jam runs on).
   * `refuse` makes every call refused (a retry under way for another cause).
   */
  function held() {
    const f = fake();
    const st = { hold: 0, refuse: false, taken: 0 };
    const accepted: [number, string][] = [];
    f.h.retry = (n, cause) => {
      f.retries.push([n, cause]);
      if (st.refuse || st.hold > 0 || n !== f.s.live) return false;
      accepted.push([n, cause]);
      st.taken++;
      f.s.epoch += 1;
      f.s.tripped = false;
      st.hold = 90;
      return true;
    };
    const step = (n = 1): void => {
      for (let i = 0; i < n; i++) {
        a5Tick(f.h, 1 / 60);
        if (st.hold > 0) st.hold--;
      }
    };
    return { ...f, st, accepted, step };
  }

  it('(fix 1 a) a retry with the flood still jammed dark: the flood coming back after the hold is no second retry', () => {
    const f = held();
    f.fresh();
    // the flood jammed (lit -> dark: a window), then a beam broken: one seen retry
    f.s.flood = false;
    f.step(30);
    f.s.tripped = true;
    f.step();
    expect(f.accepted).toEqual([[13, 'seen']]);
    // the jam runs on through the hold and after it, then the flood comes back with both on their marks
    f.step(90 + 60);
    f.s.flood = true;
    f.step(120);
    expect(f.retries).toEqual([[13, 'seen']]);
  });

  it('(fix 1 b) the flood back inside the hold calls nothing, and a refused call spends nothing: a later failure in the attempt still retries', () => {
    const f = held();
    f.fresh();
    f.s.flood = false;
    f.step(30);
    f.s.tripped = true;
    f.step();
    // the flood back while the retry's hold runs: no call, so nothing is spent
    f.step(30);
    f.s.flood = true;
    f.step(30);
    expect(f.retries).toEqual([[13, 'seen']]);
    // after the hold a beam trip in the same attempt is taken
    f.step(60);
    f.s.tripped = true;
    f.step();
    expect(f.accepted).toEqual([[13, 'seen'], [13, 'seen']]);
    // a timer failure whose retry() is refused (a retry under way for another cause) spends nothing either
    f.step(120);
    f.st.refuse = true;
    f.s.flood = false;
    f.step(30);
    f.s.flood = true;
    f.step();
    expect(f.retries.at(-1)).toEqual([13, 'timer']);
    expect(f.accepted).toHaveLength(2);
    f.st.refuse = false;
    f.s.tripped = true;
    f.step();
    expect(f.accepted).toEqual([[13, 'seen'], [13, 'seen'], [13, 'seen']]);
  });

  it('(fix 1) a fresh jam after the retry still times out once', () => {
    const f = held();
    f.fresh();
    f.s.flood = false;
    f.step(30);
    f.s.tripped = true;
    f.step();
    // the old jam ends after the hold (no fail), then the players jam the flood again and it comes back before the release
    f.step(120);
    f.s.flood = true;
    f.step(60);
    expect(f.retries).toEqual([[13, 'seen']]);
    f.s.flood = false;
    f.step(60 * 4);
    f.s.flood = true;
    f.step(120);
    expect(f.accepted).toEqual([[13, 'seen'], [13, 'timer']]);
    expect(f.retries).toEqual([[13, 'seen'], [13, 'timer']]);
  });

  it('reads only live, lit(52), flag(a5-release), tripped(laser-a5) and epoch; calls retry(13, ...) and nothing else', () => {
    const f = fake();
    f.fresh();
    f.s.flood = false;
    f.step(10);
    f.s.flood = true;
    f.step(10);
    f.s.tripped = true;
    f.step(10);
    expect(f.retries.every(([n]) => n === 13)).toBe(true);
    expect(new Set(f.groups)).toEqual(new Set([52]));
    expect(new Set(f.flagIds)).toEqual(new Set(['a5-release']));
    expect(new Set(f.laserIds)).toEqual(new Set(['laser-a5']));
    // a per-player flag is never read
    expect(f.flagIds.some((id) => id.includes('@'))).toBe(false);
  });
});
