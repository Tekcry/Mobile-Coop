/**
 * Marlow re-plan, A8's station tick (J14 slice G-A8, `src/game/course/replan/a8Ticks.ts`): station 20's dark window (the lighting
 * board's 25 s) and station 21's loop window (the console's 60 s), run on fake hooks (a plain object implementing `StationHooks`,
 * stepped at 1/60 s). Pins: dark then lit before `a8-grille-in` retries 20 once (`timer`); dark then the grille flag set is no
 * retry; the loop cleared while 21 is live retries 21 once; 21 going live from 20 with the loop already ended retries at once;
 * after a retry with the loop off there is no retry until a new press ends; an `epoch()` change mid-window forgets it; a refused
 * ask is made again; the tick acts only on 20 and 21; its ids are the set file's; the registry runs it for bay A8.
 */
import { describe, expect, it } from 'vitest';
import { a8Tick, A8T_DARK_ST, A8T_GRILLE_FLAG, A8T_LOOP_FLAG, A8T_LOOP_ST, A8T_NIGHT_GATE, A8T_SYNC_FLAG } from '../../../src/game/course/replan/a8Ticks';
import { REPLAN_TICKS, type StationHooks, type TickZone } from '../../../src/game/course/replan/ticks';
import { A8_LOOP, A8_LOOP_FLAG, A8_NIGHT_GATE, A8_SYNC_FLAG } from '../../../src/world/maps/ctcourseSets/a8Strongroom';
import { A8_GRILLE_IN_FLAG, A8_STATIONS } from '../../../src/world/maps/ctcourseSets/replan/a8Strongroom';

const DT = 1 / 60;
/** Each new fake starts on its own epoch band (the real counter never repeats across matches, so module state never leaks). */
let epochBase = 1000;

/** Fake hooks: the state the tick reads, the retries it asks for. `retry` answers as the host does: only for the live station. */
class FakeHooks implements StationHooks {
  flags = new Set<string>();
  gates = new Set<string>();
  st = 0;
  t = 0;
  ep = (epochBase += 1000);
  /** Refuse the next `refuse` asks (a retry under way). */
  refuse = 0;
  retries: [number, 'timer' | 'seen'][] = [];
  flag(id: string): boolean {
    return this.flags.has(id);
  }
  live(): number {
    return this.st;
  }
  retry(n: number, cause: 'timer' | 'seen'): boolean {
    if (n !== this.st) return false;
    if (this.refuse > 0) {
      this.refuse--;
      return false;
    }
    this.retries.push([n, cause]);
    return true;
  }
  playersIn(_zone: TickZone): number {
    return 0;
  }
  now(): number {
    return this.t;
  }
  gate(id: string): boolean {
    return this.gates.has(id);
  }
  down(_slotId: string): boolean {
    return false;
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
      a8Tick(this, DT);
    }
  }
  /** What the host does on a retry: a new epoch, the retried station's gates reset and its loop flag dropped. */
  retried(): void {
    this.ep += 1;
    this.gates.delete(A8T_NIGHT_GATE);
    this.flags.delete(A8T_LOOP_FLAG);
  }
}

describe('A8 station tick (J14 G-A8): the ids and the registry', () => {
  it("reads the set file's ids and the re-plan's grille flag; the registry runs it for bay A8; the drill seconds are the stations'", () => {
    expect([A8T_NIGHT_GATE, A8T_LOOP_FLAG, A8T_SYNC_FLAG, A8T_GRILLE_FLAG]).toEqual([A8_NIGHT_GATE, A8_LOOP_FLAG, A8_SYNC_FLAG, A8_GRILLE_IN_FLAG]);
    expect(REPLAN_TICKS.A8).toBe(a8Tick);
    const st20 = A8_STATIONS.find((s) => s.n === A8T_DARK_ST)!;
    const st21 = A8_STATIONS.find((s) => s.n === A8T_LOOP_ST)!;
    expect([st20.drillS, st21.drillS]).toEqual([25, A8_LOOP.seconds]);
    expect(st20.doneFlag).toBe(A8T_GRILLE_FLAG);
    expect(st21.doneFlag).toBe(A8T_SYNC_FLAG);
    expect(st20.gates).toContain(A8T_NIGHT_GATE);
    expect(st21.gates).toContain('g-a8-console');
  });
});

describe('A8 station tick: station 20, the lighting board\'s dark', () => {
  it('dark, then the lights back before a8-grille-in: retries 20 once (timer), and not again while nothing changes', () => {
    const h = new FakeHooks();
    h.st = 20;
    h.run(1);
    expect(h.retries).toEqual([]);
    h.gates.add(A8T_NIGHT_GATE);
    h.run(24);
    expect(h.retries).toEqual([]);
    h.gates.delete(A8T_NIGHT_GATE);
    h.run(0.1);
    expect(h.retries).toEqual([[20, 'timer']]);
    h.run(10);
    expect(h.retries).toHaveLength(1);
  });

  it('dark, then the grille flag set (someone through): no retry, whether the station has moved on or not yet', () => {
    const a = new FakeHooks();
    a.st = 20;
    a.gates.add(A8T_NIGHT_GATE);
    a.run(10);
    a.flags.add(A8T_GRILLE_FLAG);
    a.gates.delete(A8T_NIGHT_GATE);
    a.run(5);
    expect(a.retries).toEqual([]);
    const b = new FakeHooks();
    b.st = 20;
    b.gates.add(A8T_NIGHT_GATE);
    b.run(10);
    b.flags.add(A8T_GRILLE_FLAG);
    b.st = 21;
    b.flags.add(A8T_LOOP_FLAG);
    b.run(1);
    b.gates.delete(A8T_NIGHT_GATE);
    b.run(5);
    expect(b.retries).toEqual([]);
  });

  it('a board never pressed opens no window (nothing to run out); the tick reads only 20 in this branch', () => {
    const h = new FakeHooks();
    h.st = 20;
    h.run(60);
    expect(h.retries).toEqual([]);
  });

  it('a refused ask (a retry under way) is made again on the next step, then once', () => {
    const h = new FakeHooks();
    h.st = 20;
    h.gates.add(A8T_NIGHT_GATE);
    h.run(2);
    h.gates.delete(A8T_NIGHT_GATE);
    h.refuse = 3;
    h.run(1);
    expect(h.retries).toEqual([[20, 'timer']]);
  });

  it('after the retry (new epoch, gate closed) it waits for the next dark: no instant fail, then a second dark that runs out retries again', () => {
    const h = new FakeHooks();
    h.st = 20;
    h.gates.add(A8T_NIGHT_GATE);
    h.run(5);
    h.gates.delete(A8T_NIGHT_GATE);
    h.run(0.1);
    expect(h.retries).toHaveLength(1);
    h.retried();
    h.run(8);
    expect(h.retries).toHaveLength(1);
    h.gates.add(A8T_NIGHT_GATE);
    h.run(25);
    h.gates.delete(A8T_NIGHT_GATE);
    h.run(0.1);
    expect(h.retries).toEqual([[20, 'timer'], [20, 'timer']]);
  });

  it('an epoch change mid-window forgets it: the dark seen before is not a window in the new epoch', () => {
    const h = new FakeHooks();
    h.st = 20;
    h.gates.add(A8T_NIGHT_GATE);
    h.run(5);
    h.ep += 1;
    h.gates.delete(A8T_NIGHT_GATE);
    h.run(2);
    expect(h.retries).toEqual([]);
  });
});

describe('A8 station tick: station 21, the console\'s loop', () => {
  it('the loop cleared while 21 is live retries 21 once (timer)', () => {
    const h = new FakeHooks();
    h.st = 21;
    h.flags.add(A8T_LOOP_FLAG);
    h.run(59);
    expect(h.retries).toEqual([]);
    h.flags.delete(A8T_LOOP_FLAG);
    h.run(0.1);
    expect(h.retries).toEqual([[21, 'timer']]);
    h.run(10);
    expect(h.retries).toHaveLength(1);
  });

  it('the loop cleared with the sync set on the same step (the course is done) is no retry', () => {
    const h = new FakeHooks();
    h.st = 21;
    h.flags.add(A8T_LOOP_FLAG);
    h.run(30);
    h.flags.delete(A8T_LOOP_FLAG);
    h.flags.add(A8T_SYNC_FLAG);
    h.run(2);
    expect(h.retries).toEqual([]);
  });

  it('21 going live from 20 in the same epoch with the loop already ended retries at once, and only once', () => {
    const h = new FakeHooks();
    h.st = 20;
    h.gates.add(A8T_NIGHT_GATE);
    h.flags.add(A8T_LOOP_FLAG);
    h.run(10);
    h.flags.delete(A8T_LOOP_FLAG);
    h.run(5);
    expect(h.retries).toEqual([]);
    h.flags.add(A8T_GRILLE_FLAG);
    h.st = 21;
    h.run(DT * 1.5);
    expect(h.retries).toEqual([[21, 'timer']]);
    h.run(5);
    expect(h.retries).toHaveLength(1);
  });

  it('21 going live from 20 with the loop still running is no retry until the loop ends', () => {
    const h = new FakeHooks();
    h.st = 20;
    h.flags.add(A8T_LOOP_FLAG);
    h.run(3);
    h.st = 21;
    h.run(20);
    expect(h.retries).toEqual([]);
    h.flags.delete(A8T_LOOP_FLAG);
    h.run(0.1);
    expect(h.retries).toEqual([[21, 'timer']]);
  });

  it('after a retry with the loop off (A back at the console) there is no retry until a new press runs out', () => {
    const h = new FakeHooks();
    h.st = 21;
    h.flags.add(A8T_LOOP_FLAG);
    h.run(10);
    h.flags.delete(A8T_LOOP_FLAG);
    h.run(0.1);
    expect(h.retries).toHaveLength(1);
    h.retried();
    h.run(30);
    expect(h.retries).toHaveLength(1);
    h.flags.add(A8T_LOOP_FLAG);
    h.run(60);
    expect(h.retries).toHaveLength(1);
    h.flags.delete(A8T_LOOP_FLAG);
    h.run(0.1);
    expect(h.retries).toEqual([[21, 'timer'], [21, 'timer']]);
  });

  it('a station started directly at 21 (no 20 seen) with the loop off waits for a press: no instant fail', () => {
    const h = new FakeHooks();
    h.st = 21;
    h.run(10);
    expect(h.retries).toEqual([]);
  });

  it('an epoch change mid-window forgets it; a refused ask is made again', () => {
    const h = new FakeHooks();
    h.st = 21;
    h.flags.add(A8T_LOOP_FLAG);
    h.run(20);
    h.ep += 1;
    h.flags.delete(A8T_LOOP_FLAG);
    h.run(3);
    expect(h.retries).toEqual([]);
    h.flags.add(A8T_LOOP_FLAG);
    h.run(1);
    h.flags.delete(A8T_LOOP_FLAG);
    h.refuse = 2;
    h.run(1);
    expect(h.retries).toEqual([[21, 'timer']]);
  });
});

describe('A8 station tick: only stations 20 and 21', () => {
  it('stations 18 and 19 and none: a dark, a loop and their ends never retry', () => {
    for (const st of [0, 18, 19, 22]) {
      const h = new FakeHooks();
      h.st = st;
      h.gates.add(A8T_NIGHT_GATE);
      h.flags.add(A8T_LOOP_FLAG);
      h.run(5);
      h.gates.delete(A8T_NIGHT_GATE);
      h.flags.delete(A8T_LOOP_FLAG);
      h.run(5);
      expect(h.retries, `station ${st}`).toEqual([]);
    }
  });

  it('a dark seen while 19 was live is not a window: it opens when 20 is live and sees the gate open', () => {
    const h = new FakeHooks();
    h.st = 19;
    h.gates.add(A8T_NIGHT_GATE);
    h.run(5);
    h.gates.delete(A8T_NIGHT_GATE);
    h.run(1);
    h.st = 20;
    h.run(2);
    expect(h.retries).toEqual([]);
  });
});
