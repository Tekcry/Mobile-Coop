/**
 * Marlow re-plan, A4's station tick (J14 slice G-A4, `src/game/course/replan/a4Ticks.ts`): station 8's 60 s loop window and station
 * 10's 1.5 s pair window, run on fake hooks (a plain object implementing `StationHooks`, stepped at 1/60 s). Pins: the loop set then
 * cleared while 8 is live retries 8 once (`timer`); cleared after `a4-west` (live moved on) it does not; after a retry it waits for
 * the next press; dock1 down then dock2 at 1.4 s is no retry, at 1.6 s retries 10 once; both at once is no retry; an `epoch()` change
 * mid-window forgets it; a loader already down when 10 goes live opens no window; the tick acts only on 8 and 10; its ids are the
 * set file's; the registry runs it for bay A4.
 */
import { describe, expect, it } from 'vitest';
import { a4Tick, A4T_DOCK1, A4T_DOCK2, A4T_LOOP_FLAG, A4T_WEST_FLAG } from '../../../src/game/course/replan/a4Ticks';
import { REPLAN_TICKS, type StationHooks, type TickZone } from '../../../src/game/course/replan/ticks';
import { SYNC_WINDOW } from '../../../src/game/rating/sectionRating';
import { A4_DOCK1, A4_DOCK2, A4_LOOP_FLAG, A4_WEST_FLAG } from '../../../src/world/maps/ctcourseSets/a4GoodsShed';
import { A4_STATIONS } from '../../../src/world/maps/ctcourseSets/replan/a4GoodsShed';

const DT = 1 / 60;
/** Each new fake starts on its own epoch band (the real counter never repeats across matches, so module state never leaks). */
let epochBase = 1000;

/** Fake hooks: the state the tick reads, the retries it asks for. `retry` answers as the host does: only for the live station. */
class FakeHooks implements StationHooks {
  flags = new Set<string>();
  downs = new Set<string>();
  st = 0;
  t = 0;
  ep = (epochBase += 1000);
  retries: [number, 'timer' | 'seen'][] = [];
  flag(id: string): boolean {
    return this.flags.has(id);
  }
  live(): number {
    return this.st;
  }
  retry(n: number, cause: 'timer' | 'seen'): boolean {
    if (n !== this.st) return false;
    this.retries.push([n, cause]);
    return true;
  }
  playersIn(_zone: TickZone): number {
    return 0;
  }
  now(): number {
    return this.t;
  }
  gate(_id: string): boolean {
    return false;
  }
  down(slotId: string): boolean {
    return this.downs.has(slotId);
  }
  jammed(_targetId: string): boolean {
    return false;
  }
  lit(_group: number): boolean {
    return true;
  }
  tripped(_laserId: string): boolean {
    return false;
  }
  epoch(): number {
    return this.ep;
  }
  /** Step the tick for `sec` s of course clock. */
  run(sec: number): void {
    const n = Math.round(sec / DT);
    for (let i = 0; i < n; i++) {
      this.t += DT;
      a4Tick(this, DT);
    }
  }
}

describe('A4 station tick (J14 G-A4): the ids and the registry', () => {
  it("reads the set file's ids and SYNC_WINDOW 1.5 s; the registry runs it for bay A4; the drill seconds are the stations'", () => {
    expect([A4T_LOOP_FLAG, A4T_WEST_FLAG, A4T_DOCK1, A4T_DOCK2]).toEqual([A4_LOOP_FLAG, A4_WEST_FLAG, A4_DOCK1, A4_DOCK2]);
    expect(REPLAN_TICKS.A4).toBe(a4Tick);
    expect(SYNC_WINDOW).toBe(1.5);
    expect(A4_STATIONS.find((s) => s.n === 10)!.drillS).toBe(SYNC_WINDOW);
    expect(A4_STATIONS.find((s) => s.n === 8)!.drillS).toBe(60);
    expect(A4_STATIONS.find((s) => s.n === 8)!.doneFlag).toBe(A4_WEST_FLAG);
  });
});

describe('A4 station tick: station 8, the camera loop', () => {
  it('the loop set then cleared while 8 is live retries 8 once (timer)', () => {
    const h = new FakeHooks();
    h.st = 8;
    h.run(1);
    h.flags.add(A4_LOOP_FLAG);
    h.run(60);
    expect(h.retries).toEqual([]);
    h.flags.delete(A4_LOOP_FLAG);
    h.run(1);
    expect(h.retries).toEqual([[8, 'timer']]);
    h.run(5);
    expect(h.retries).toHaveLength(1);
  });

  it('cleared after a4-west (live moved on to 10) is no retry; nor is a clear with a4-west set while 8 still reads live', () => {
    const h = new FakeHooks();
    h.st = 8;
    h.flags.add(A4_LOOP_FLAG);
    h.run(30);
    h.flags.add(A4_WEST_FLAG);
    h.st = 10;
    h.run(0.5);
    h.flags.delete(A4_LOOP_FLAG);
    h.run(2);
    expect(h.retries).toEqual([]);
    const k = new FakeHooks();
    k.st = 8;
    k.flags.add(A4_LOOP_FLAG);
    k.run(10);
    k.flags.add(A4_WEST_FLAG);
    k.flags.delete(A4_LOOP_FLAG);
    k.run(1);
    expect(k.retries).toEqual([]);
  });

  it('no loop pressed, no window: 8 live for long with the flag never set is no retry; a press seen while 9 is live arms only once 8 is live', () => {
    const h = new FakeHooks();
    h.st = 8;
    h.run(120);
    expect(h.retries).toEqual([]);
    const k = new FakeHooks();
    k.st = 9;
    k.flags.add(A4_LOOP_FLAG);
    k.run(5);
    k.flags.delete(A4_LOOP_FLAG);
    k.run(1);
    expect(k.retries).toEqual([]);
    // pressed during 9, still running as 8 goes live, then it ends before a4-west: the retry
    k.flags.add(A4_LOOP_FLAG);
    k.run(2);
    k.st = 8;
    k.run(2);
    k.flags.delete(A4_LOOP_FLAG);
    k.run(DT);
    expect(k.retries).toEqual([[8, 'timer']]);
  });

  it('after a retry (a new epoch) it waits for the next press, then runs the window again', () => {
    const h = new FakeHooks();
    h.st = 8;
    h.flags.add(A4_LOOP_FLAG);
    h.run(2);
    h.flags.delete(A4_LOOP_FLAG);
    h.run(DT);
    expect(h.retries).toHaveLength(1);
    h.ep++;
    h.run(10);
    expect(h.retries).toHaveLength(1);
    h.flags.add(A4_LOOP_FLAG);
    h.run(60);
    h.flags.delete(A4_LOOP_FLAG);
    h.run(DT);
    expect(h.retries).toEqual([[8, 'timer'], [8, 'timer']]);
  });

  it('an epoch change while the loop runs (a seen retry, a bay restart) disarms it: the flag cleared by that retry is no timer retry', () => {
    const h = new FakeHooks();
    h.st = 8;
    h.flags.add(A4_LOOP_FLAG);
    h.run(10);
    h.ep++;
    h.flags.delete(A4_LOOP_FLAG);
    h.run(2);
    expect(h.retries).toEqual([]);
  });
});

describe('A4 station tick: station 10, the synced takedown', () => {
  /** 10 live with both loaders up for a moment, then dock1 down; dock2 down `gap` s later (or never). */
  function pair(gap: number | null, run = 3): FakeHooks {
    const h = new FakeHooks();
    h.st = 10;
    h.run(0.5);
    h.downs.add(A4_DOCK1);
    if (gap === null) {
      h.run(run);
      return h;
    }
    h.run(gap);
    h.downs.add(A4_DOCK2);
    h.run(run);
    return h;
  }

  it('dock1 down then dock2 at 1.4 s: no retry; at 1.6 s: station 10 retries once (timer)', () => {
    expect(pair(1.4).retries).toEqual([]);
    expect(pair(1.6).retries).toEqual([[10, 'timer']]);
    expect(pair(null).retries).toEqual([[10, 'timer']]);
  });

  it('the retry comes SYNC_WINDOW after the first one goes down, not before', () => {
    const h = new FakeHooks();
    h.st = 10;
    h.run(0.5);
    h.downs.add(A4_DOCK2);
    h.run(1.45);
    expect(h.retries).toEqual([]);
    h.run(0.1);
    expect(h.retries).toEqual([[10, 'timer']]);
  });

  it('both down on the same step: no retry; the window settles (a loader woken later is no retry)', () => {
    const h = new FakeHooks();
    h.st = 10;
    h.run(0.5);
    h.downs.add(A4_DOCK1);
    h.downs.add(A4_DOCK2);
    h.run(1);
    h.downs.delete(A4_DOCK2);
    h.run(3);
    expect(h.retries).toEqual([]);
  });

  it('an epoch() change mid-window forgets it: no retry for the old window', () => {
    const h = new FakeHooks();
    h.st = 10;
    h.run(0.5);
    h.downs.add(A4_DOCK1);
    h.run(0.7);
    h.ep++;
    // the retry put dock1 back up (the station's guards reset): a fresh start, nothing pending
    h.downs.delete(A4_DOCK1);
    h.run(3);
    expect(h.retries).toEqual([]);
    // the old down still standing after the change (not reset) opens no window either: only a fresh down does
    const k = new FakeHooks();
    k.st = 10;
    k.run(0.5);
    k.downs.add(A4_DOCK1);
    k.run(0.7);
    k.ep++;
    k.run(3);
    expect(k.retries).toEqual([]);
    k.downs.add(A4_DOCK2);
    k.run(3);
    expect(k.retries).toEqual([]);
  });

  it('a loader already down when 10 goes live (taken during 8) opens no window: the other going down alone is the pair done', () => {
    const h = new FakeHooks();
    h.st = 8;
    h.downs.add(A4_DOCK1);
    h.run(1);
    h.st = 10;
    h.run(5);
    expect(h.retries).toEqual([]);
    h.downs.add(A4_DOCK2);
    h.run(3);
    expect(h.retries).toEqual([]);
  });

  it('only stations 8 and 10: the same loop end or a lone takedown with 9 (or none) live is no retry', () => {
    for (const st of [0, 9, 11]) {
      const h = new FakeHooks();
      h.st = st;
      h.flags.add(A4_LOOP_FLAG);
      h.run(1);
      h.flags.delete(A4_LOOP_FLAG);
      h.downs.add(A4_DOCK1);
      h.run(3);
      expect(h.retries, `live ${st}`).toEqual([]);
    }
  });

  it('a refused retry (the host says no: a retry under way, the retry switched off) is asked once, not every step', () => {
    const h = new FakeHooks();
    let asked = 0;
    h.retry = (): boolean => {
      asked++;
      return false;
    };
    h.st = 10;
    h.run(0.5);
    h.downs.add(A4_DOCK1);
    h.run(4);
    expect(asked).toBe(1);
  });
});
