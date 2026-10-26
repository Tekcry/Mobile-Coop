/**
 * J14 G-A6 fix 2 (A26 for A6; Q5 / G370 "every failure is a retry"): the A6 station tick (`src/game/course/replan/a6Ticks.ts`)
 * frees a pair stuck on the pump floor. Once `a6-gal1` is set the loading edge's lip is locked and the stair is gone, so from
 * the pump floor only the rope (a holder on top) goes up. While station 14, 15 or 16 is live, `a6-gal1` set, a player on the
 * pump floor and nobody on the gallery, the bridge, the rope or climbing to them for `A6_TRAP_GRACE` (5 s), the live station
 * retries once with cause `other`. Cases: the zones against the re-plan's geometry (the floor less the pit and the culvert's
 * housing, the kerb and plinth tops off it; the gallery, the bridge and the climbs); on fake hooks (a plain `StationHooks`
 * over two players' feet) per station a trapped pair retries once after 5 s and not before; no retry with a player on the
 * gallery, the bridge, the rope, the lip or the pit ladder, before `a6-gal1`, or on another station; the clock resets on an
 * epoch change and when the condition breaks; a refused `retry()` spends nothing. On the real re-plan course (`CourseState`):
 * the retry at each station's marks, 14 reopening the lip, 15 and 16 keeping it locked, LANTERN's `retry:<id>:other` lines.
 */
import { describe, expect, it } from 'vitest';
import { COURSE_TEXT_MAX } from '../../../src/config/course';
import { CourseState } from '../../../src/game/course/courseState';
import {
  a6Tick,
  A6_TRAP_BRIDGE,
  A6_TRAP_FACE,
  A6_TRAP_FIRST,
  A6_TRAP_FLAG,
  A6_TRAP_FLOOR_E,
  A6_TRAP_FLOOR_HS,
  A6_TRAP_FLOOR_N,
  A6_TRAP_FLOOR_PS,
  A6_TRAP_FLOOR_S,
  A6_TRAP_FLOOR_W,
  A6_TRAP_GALLERY,
  A6_TRAP_GRACE,
  A6_TRAP_LAST,
  A6_TRAP_PIT_CLIMB,
} from '../../../src/game/course/replan/a6Ticks';
import { REPLAN_TICKS, type StationHooks, type TickZone } from '../../../src/game/course/replan/ticks';
import { inTickZone, retryLine } from '../../../src/game/modes/courseMode';
import { LevelBuilder } from '../../../src/world/levelBuilder';
import { buildCtcourse } from '../../../src/world/maps/ctcourse';
import { A6_BRIDGE, A6_DECK, A6_GALLERY_LIP, A6_KERB, A6_MARK, A6_PLATE, A6_PUMP, A6_PUMPS, A6_ROPE, A6_SHELL } from '../../../src/world/maps/ctcourseSets/a6PumpHouse';
import {
  A6_CULVERT_1,
  A6_CULVERT_2,
  A6_DROP,
  A6_EDGE_GATE,
  A6_GAL1_FLAG,
  A6_HOUSING,
  A6_LANDING,
  A6_PIT,
  A6_PIT_LADDER_AT,
  A6_PIT_LADDER_GATE,
  A6_PLINTH,
  A6_PUMP_HOUSE_STATIONS,
  A6_RETRY_LINES,
  A6_STAIR_SCREEN,
  A6_STEPS,
  A6_TRAP_LINES,
} from '../../../src/world/maps/ctcourseSets/replan/a6PumpHouse';

type Feet = { x: number; y: number; z: number };
const P = (x: number, y: number, z: number): Feet => ({ x, y, z });

const FLOOR: readonly TickZone[] = [A6_TRAP_FLOOR_S, A6_TRAP_FLOOR_W, A6_TRAP_FLOOR_PS, A6_TRAP_FLOOR_HS, A6_TRAP_FLOOR_E, A6_TRAP_FLOOR_N];
const UP: readonly TickZone[] = [A6_TRAP_GALLERY, A6_TRAP_BRIDGE, A6_TRAP_FACE, A6_TRAP_PIT_CLIMB];
const onFloor = (f: Feet): boolean => FLOOR.some((z) => inTickZone(z, f));
const up = (f: Feet): boolean => UP.some((z) => inTickZone(z, f));
const inPlan = (r: readonly number[], x: number, z: number): boolean => x >= r[0]! && x <= r[2]! && z >= r[1]! && z <= r[3]!;

// the places the cases stand players
/** Station 14's marks in the sump bay (behind the kerb). */
const SUMP_A = P(51.0, 0, 56.5);
const SUMP_B = P(52.5, 0, 56.5);
/** The pump floor at the loading edge (the leg-up mark, the rope's foot), in front of the cage door, under the bridge's north
 *  half, by the gauge board, by the desk. */
const EDGE_FOOT = P(A6_MARK.x, 0, A6_MARK.z);
const CAGE_DOOR = P(51.5, 0, 61.4);
const UNDER_BRIDGE = P(51.5, 0, 67.5);
const GAUGE = P(58.0, 0, 64.8);
const DESK = P(61.0, 0, 67.1);
/** Up: the rope holder on the gallery, station 15's marks on the bridge, station 16's A on the bridge. */
const GALLERY = P(A6_ROPE.x, A6_DECK.lip, A6_ROPE.z);
const BRIDGE = P(50.5, A6_DECK.lip, 68.5);
const DROP_MARK = P(51.5, A6_DECK.lip, 65.5);
/** Climbing: hanging on the loading edge's lip, on the rope, a boosted climber in the air; hanging through the gland plate;
 *  on the pit's stand-in ladder (low and high). */
const LIP_HANG = P(43.0, 2.3, 69.3);
const ROPE_CLIMB = P(A6_ROPE.x, 2.5, 69.3);
const BOOSTED = P(A6_MARK.x, 1.5, A6_MARK.z);
const PLATE_HANG = P(A6_PLATE.x, 1.6, A6_PLATE.z);
const LADDER_LOW = P(A6_PIT_LADDER_AT.x, -0.5, 65.5);
const LADDER_HIGH = P(A6_PIT_LADDER_AT.x, 3.0, 65.5);
/** Neither: the pit floor (station 16's B mark, the ladder's foot, a hop there), the landing in the cage, the culvert (the
 *  ramp, the flat to the L6 door), the kerb's and a plinth's tops, the holding rooms beyond the shell. */
const PIT = P(51.5, A6_PIT.y, 63.5);
const LADDER_FOOT = P(A6_PIT_LADDER_AT.x, A6_PIT.y, 65.5);
const PIT_HOP = P(A6_PIT_LADDER_AT.x, A6_PIT.y + 0.8, 65.5);
const LANDING = P(51.5, 0, 62.5);
const CULVERT_RAMP = P(57.5, -0.82, 63.1);
const CULVERT_FLAT = P(62.8, 0, 62.0);
const KERB_TOP = P(52.0, A6_KERB.h, A6_KERB.z);
const PLINTH_TOP = P(A6_PUMPS[1]![0], A6_PUMP.plinthH, A6_PUMPS[1]![1]);
const L6 = P(65.0, 0, 62.0);
const L5 = P(53.0, 0, 53.0);

describe('A6 station tick (fix 2): the zones on the re-plan\'s geometry', () => {
  it('is the registered A6 tick; the grace is 5 s; stations 14-16; the flag is a6-gal1', () => {
    expect(REPLAN_TICKS.A6).toBe(a6Tick);
    expect(A6_TRAP_GRACE).toBe(5);
    expect([A6_TRAP_FIRST, A6_TRAP_LAST]).toEqual([14, 16]);
    expect(A6_PUMP_HOUSE_STATIONS.map((s) => s.n)).toEqual([14, 15, 16]);
    expect(A6_TRAP_FLAG).toBe(A6_GAL1_FLAG);
  });

  it('the pump floor (feet about y 0) is the shell less the drive pit and the culvert\'s housing: every 0.25 m of plan in exactly one floor box or in neither', () => {
    const H = A6_HOUSING;
    const pit = [A6_PIT.x0, A6_PIT.z0, A6_PIT.x1, A6_PIT.z1];
    const housing1 = [A6_CULVERT_1[0], H.south1, H.east, H.north];
    const housing2 = [H.jog, H.south2, H.east, H.north];
    // the culvert's holes lie inside the housing
    expect(inPlan(housing1, A6_CULVERT_1[0], A6_CULVERT_1[1]) && inPlan(housing1, A6_CULVERT_1[2], A6_CULVERT_1[3])).toBe(true);
    expect(inPlan(housing2, A6_CULVERT_2[0], A6_CULVERT_2[1]) && inPlan(housing2, H.east, A6_CULVERT_2[3])).toBe(true);
    let n = 0;
    for (let x = A6_SHELL.west + 0.125; x < A6_SHELL.east; x += 0.25) {
      for (let z = A6_SHELL.south + 0.125; z < A6_SHELL.north; z += 0.25) {
        const f = P(x, 0, z);
        const hits = FLOOR.filter((q) => inTickZone(q, f)).length;
        const out = inPlan(pit, x, z) || inPlan(housing1, x, z) || inPlan(housing2, x, z);
        expect(hits, `(${x}, ${z})`).toBe(out ? 0 : 1);
        n++;
      }
    }
    expect(n).toBeGreaterThan(6000);
    // nothing beyond the shell
    for (const q of FLOOR) {
      expect(q[0]).toBeGreaterThanOrEqual(A6_SHELL.west);
      expect(q[2]).toBeLessThanOrEqual(A6_SHELL.east);
      expect(q[1]).toBeGreaterThanOrEqual(A6_SHELL.south);
      expect(q[3]).toBeLessThanOrEqual(A6_SHELL.north);
      expect([q[4], q[5]]).toEqual([-0.5, 1.0]);
    }
  });

  it('on the floor: the sump bay, the loading edge\'s foot, the cage door, under the bridge, the gauge board, the desk; not the pit, the landing, the culvert, the kerb or plinth tops, the holding rooms', () => {
    for (const f of [SUMP_A, SUMP_B, EDGE_FOOT, CAGE_DOOR, UNDER_BRIDGE, GAUGE, DESK, P(51, 0.8, 56.5)]) {
      expect(onFloor(f), JSON.stringify(f)).toBe(true);
      expect(up(f), JSON.stringify(f)).toBe(false);
    }
    for (const f of [PIT, LADDER_FOOT, PIT_HOP, LANDING, CULVERT_RAMP, CULVERT_FLAT, KERB_TOP, PLINTH_TOP, L6, L5]) {
      expect(onFloor(f), JSON.stringify(f)).toBe(false);
      expect(up(f), JSON.stringify(f)).toBe(false);
    }
  });

  it('up or climbing: the gallery, the bridge (15\'s marks, 16\'s A), the lip, the rope, a boost, a hang through the plate, the pit ladder', () => {
    for (const f of [GALLERY, BRIDGE, DROP_MARK, LIP_HANG, ROPE_CLIMB, BOOSTED, PLATE_HANG, LADDER_LOW, LADDER_HIGH]) {
      expect(up(f), JSON.stringify(f)).toBe(true);
      expect(onFloor(f), JSON.stringify(f)).toBe(false);
    }
    // the gallery and the bridge are the set's: the bridge's plan, the gallery from the west wall to the stair-head screen
    expect(A6_TRAP_BRIDGE.slice(0, 4)).toEqual(A6_BRIDGE);
    expect(A6_TRAP_GALLERY.slice(0, 4)).toEqual([A6_SHELL.west, A6_DECK.z, A6_STAIR_SCREEN.x1, A6_SHELL.north]);
    for (const q of [A6_TRAP_GALLERY, A6_TRAP_BRIDGE]) expect(A6_DECK.lip > q[4]! + 0.5 && A6_DECK.lip < q[5]! - 1).toBe(true);
    // the face strip is in front of the gallery's south face along its whole length
    expect([A6_TRAP_FACE[0], A6_TRAP_FACE[2], A6_TRAP_FACE[3]]).toEqual([A6_SHELL.west, A6_STAIR_SCREEN.x1, A6_DECK.z]);
    // the pit climb covers the drop opening, the gland plate and the ladder, and is clear of the plinth, the steps and the landing
    const c = A6_TRAP_PIT_CLIMB;
    expect(inPlan(c, A6_DROP[0], A6_DROP[1]) && inPlan(c, A6_DROP[2], A6_DROP[3])).toBe(true);
    expect(inPlan(c, A6_PLATE.x, A6_PLATE.z)).toBe(true);
    expect(inPlan(c, A6_PIT_LADDER_AT.x, A6_PIT_LADDER_AT.z)).toBe(true);
    expect(c[1]).toBeGreaterThan(A6_PLINTH[3]);
    expect(c[0]).toBeGreaterThan(A6_STEPS.x1);
    expect(c[1]).toBeGreaterThan(A6_LANDING.z1);
    expect(c[2]).toBeLessThanOrEqual(A6_PIT.x1);
    expect(c[3]).toBeLessThanOrEqual(A6_PIT.z1);
    expect(c[4]).toBeGreaterThan(A6_PIT.y + 0.8);
  });

  it('the marks: 14\'s on the floor (its retry drops a6-gal1), 15\'s on the bridge, 16\'s A on the bridge and B in the pit (never the floor)', () => {
    const [s14, s15, s16] = A6_PUMP_HOUSE_STATIONS;
    for (const m of s14!.marks) expect(onFloor(m)).toBe(true);
    for (const m of s15!.marks) expect(up(m)).toBe(true);
    expect(up(s16!.marks[0])).toBe(true);
    expect(onFloor(s16!.marks[1])).toBe(false);
  });
});

/** The epoch counter: never repeats across cases, as the real hook's never repeats across matches. */
let epochs = 500;
const DT = 0.1;

/** A fake host over two players' feet: the live station, `a6-gal1`, the epoch; `retry` records every call and is accepted
 *  (a new epoch, as the real hook) unless `refuse` is set. The hooks an A6 tick has no business reading throw. */
function fake(live: number, a: Feet, c: Feet, gal1 = true) {
  const s = { live, gal1, epoch: ++epochs, refuse: false };
  const feet = [a, c];
  const calls: [number, string][] = [];
  const flagIds = new Set<string>();
  const unused = (name: string) => (): never => {
    throw new Error(`the A6 tick must not read ${name}`);
  };
  const h: StationHooks = {
    flag: (id) => {
      flagIds.add(id);
      return id === A6_GAL1_FLAG && s.gal1;
    },
    live: () => s.live,
    retry: (n, cause) => {
      calls.push([n, cause]);
      if (s.refuse || n !== s.live) return false;
      s.epoch = ++epochs;
      return true;
    },
    playersIn: (z) => (inTickZone(z, feet[0]!) ? 1 : 0) + (inTickZone(z, feet[1]!) ? 1 : 0),
    now: unused('now'),
    gate: unused('gate'),
    down: unused('down'),
    jammed: unused('jammed'),
    lit: unused('lit'),
    tripped: unused('tripped'),
    epoch: () => s.epoch,
  };
  const run = (t: number): void => {
    for (let i = 0; i < Math.round(t / DT); i++) a6Tick(h, DT);
  };
  const put = (k: 0 | 1, f: Feet): void => {
    feet[k] = f;
  };
  return { s, calls, flagIds, run, put };
}

describe('A6 station tick (fix 2): the trap retry on fake hooks', () => {
  it('station 14: the gallery player dropped back to the floor, the partner at the rope\'s foot: no retry inside 5 s, then one retry (other)', () => {
    const f = fake(14, EDGE_FOOT, UNDER_BRIDGE);
    f.run(A6_TRAP_GRACE - 0.2);
    expect(f.calls).toEqual([]);
    f.run(0.3);
    expect(f.calls).toEqual([[14, 'other']]);
    // once: the new epoch's clock is fresh (on the real course the marks and the dropped flag end it)
    f.run(A6_TRAP_GRACE - 0.2);
    expect(f.calls).toHaveLength(1);
    expect([...f.flagIds]).toEqual([A6_GAL1_FLAG]);
  });

  it('station 15: the hanger walked out of the pit by the cage door, the holder jumped down: one retry (other) after 5 s', () => {
    const f = fake(15, CAGE_DOOR, P(52.5, 0, 66.8));
    f.run(A6_TRAP_GRACE - 0.2);
    expect(f.calls).toEqual([]);
    f.run(0.3);
    expect(f.calls).toEqual([[15, 'other']]);
    f.run(1);
    expect(f.calls).toHaveLength(1);
  });

  it('station 16: both dropped early and left by the cage door: one retry (other) after 5 s; so does one on the floor with the partner idle in the pit', () => {
    const f = fake(16, CAGE_DOOR, GAUGE);
    f.run(A6_TRAP_GRACE - 0.2);
    expect(f.calls).toEqual([]);
    f.run(0.3);
    expect(f.calls).toEqual([[16, 'other']]);
    const g = fake(16, DESK, PIT);
    g.run(A6_TRAP_GRACE - 0.2);
    expect(g.calls).toEqual([]);
    g.run(0.3);
    expect(g.calls).toEqual([[16, 'other']]);
  });

  it('no retry while a player is on the gallery, the bridge or the rope, hangs on the lip or through the plate, or climbs the pit ladder', () => {
    for (const n of [14, 15, 16]) {
      for (const other of [GALLERY, BRIDGE, DROP_MARK, ROPE_CLIMB, LIP_HANG, BOOSTED, PLATE_HANG, LADDER_LOW, LADDER_HIGH]) {
        const f = fake(n, EDGE_FOOT, other);
        f.run(20);
        expect(f.calls, `${n} ${JSON.stringify(other)}`).toEqual([]);
      }
    }
  });

  it('no retry before a6-gal1 (the lip is open), with nobody on the floor (the pit, the culvert, the holding rooms), or on another station', () => {
    for (const n of [14, 15, 16]) {
      const f = fake(n, EDGE_FOOT, UNDER_BRIDGE, false);
      f.run(20);
      expect(f.calls).toEqual([]);
    }
    const g = fake(16, PIT, CULVERT_FLAT);
    g.run(20);
    g.put(0, L6);
    g.put(1, LANDING);
    g.run(20);
    expect(g.calls).toEqual([]);
    for (const n of [0, 13, 17]) {
      const h = fake(n, EDGE_FOOT, UNDER_BRIDGE);
      h.run(20);
      expect(h.calls).toEqual([]);
    }
  });

  it('the clock resets on an epoch change (a retry, a bay restart) and whenever the condition breaks', () => {
    const f = fake(15, CAGE_DOOR, UNDER_BRIDGE);
    f.run(A6_TRAP_GRACE - 1);
    f.s.epoch = ++epochs;
    f.run(A6_TRAP_GRACE - 1);
    expect(f.calls).toEqual([]);
    f.run(1.2);
    expect(f.calls).toEqual([[15, 'other']]);
    // a climb holds and resets it
    const g = fake(14, EDGE_FOOT, UNDER_BRIDGE);
    g.run(A6_TRAP_GRACE - 1);
    g.put(1, ROPE_CLIMB);
    g.run(0.1);
    g.put(1, UNDER_BRIDGE);
    g.run(A6_TRAP_GRACE - 1);
    expect(g.calls).toEqual([]);
    g.run(1.2);
    expect(g.calls).toEqual([[14, 'other']]);
    // so do no A6 station live (the set done) and a6-gal1 dropped
    const h = fake(15, CAGE_DOOR, UNDER_BRIDGE);
    h.run(A6_TRAP_GRACE - 1);
    h.s.live = 0;
    h.run(0.1);
    h.s.live = 16;
    h.run(A6_TRAP_GRACE - 1);
    expect(h.calls).toEqual([]);
    h.s.gal1 = false;
    h.run(0.1);
    h.s.gal1 = true;
    h.run(A6_TRAP_GRACE - 1);
    expect(h.calls).toEqual([]);
    h.run(1.2);
    expect(h.calls).toEqual([[16, 'other']]);
  });

  it('the retry counts only when retry() takes it: refused calls go on (the route-runs\' retryOff, a retry under way), the first taken one resets the clock', () => {
    const f = fake(16, CAGE_DOOR, GAUGE);
    f.s.refuse = true;
    f.run(A6_TRAP_GRACE + 1);
    expect(f.calls.length).toBeGreaterThan(5);
    expect(f.calls.every(([n, c]) => n === 16 && c === 'other')).toBe(true);
    const refused = f.calls.length;
    f.s.refuse = false;
    f.run(DT);
    expect(f.calls).toHaveLength(refused + 1);
    f.run(A6_TRAP_GRACE - 0.2);
    expect(f.calls).toHaveLength(refused + 1);
  });
});

describe('A6 station tick (fix 2) on the re-plan course: the station retry, the lip and LANTERN\'s lines', () => {
  const b = new LevelBuilder();
  const built = buildCtcourse(b, { replan: true });
  const course = built.layout.course!;
  const def = course.def;
  const bay = def.bays.find((q) => q.id === 'A6')!;
  let epochSeq = 9000;

  /** A real course at set 6 with station `n` live, `a6-gal1` set, the feet `a` / `c`, and the tick on hooks over it. */
  function trap(n: 14 | 15 | 16, a: Feet, c: Feet) {
    const s = new CourseState(def, course.consoles);
    s.startAt(6);
    s.setPlayer(0, a.x, a.y, a.z, false);
    s.setPlayer(1, c.x, c.y, c.z, false);
    s.update(1 / 60);
    s.setFlag(A6_GAL1_FLAG);
    s.update(1 / 60);
    if (n >= 15) s.setFlag('a6-gal');
    s.update(1 / 60);
    if (n >= 16) s.setFlag('a6-drive');
    s.update(1 / 60);
    const feet = [a, c];
    let epoch = ++epochSeq;
    const calls: [number, string][] = [];
    const h: StationHooks = {
      flag: (id) => s.hasShared(id),
      live: () => s.station(),
      retry: (k, cause) => {
        calls.push([k, cause]);
        if (!s.retryStation(cause, k)) return false;
        epoch = ++epochSeq;
        return true;
      },
      playersIn: (z) => (inTickZone(z, feet[0]!) ? 1 : 0) + (inTickZone(z, feet[1]!) ? 1 : 0),
      now: () => s.clock,
      gate: (id) => s.isGateOpen(id),
      down: () => false,
      jammed: () => false,
      lit: () => false,
      tripped: () => false,
      epoch: () => epoch,
    };
    const run = (t: number): void => {
      for (let i = 0; i < Math.round(t / DT); i++) a6Tick(h, DT);
      s.update(1 / 60);
    };
    return { s, calls, run };
  }

  it('station 14: the retry (other) drops a6-gal1 and the lip opens again for the leg-up', () => {
    const { s, calls, run } = trap(14, EDGE_FOOT, UNDER_BRIDGE);
    expect(s.station()).toBe(14);
    expect(s.anchorLocked(A6_GALLERY_LIP)).toBe(true);
    run(A6_TRAP_GRACE - 0.2);
    expect(calls).toEqual([]);
    run(0.3);
    expect(calls).toEqual([[14, 'other']]);
    expect(s.lastRetry).toEqual({ st: 14, cause: 'other' });
    expect(s.restarts).toBe(1);
    expect(s.station()).toBe(14);
    expect(s.hasShared(A6_GAL1_FLAG)).toBe(false);
    expect(s.anchorLocked(A6_GALLERY_LIP)).toBe(false);
    expect(s.isGateOpen(A6_EDGE_GATE)).toBe(true);
    // the lip open, nothing to free: the clock stays off
    run(20);
    expect(calls).toHaveLength(1);
  });

  it('station 15: the retry (other) keeps 14 done and a6-gal1 set (the lip stays locked; both go back up on its marks)', () => {
    const { s, calls, run } = trap(15, CAGE_DOOR, UNDER_BRIDGE);
    expect(s.station()).toBe(15);
    run(A6_TRAP_GRACE + 0.1);
    expect(calls).toEqual([[15, 'other']]);
    expect(s.lastRetry).toEqual({ st: 15, cause: 'other' });
    expect(s.station()).toBe(15);
    expect(s.hasShared(A6_GAL1_FLAG)).toBe(true);
    expect(s.hasShared('a6-gal')).toBe(true);
    expect(s.anchorLocked(A6_GALLERY_LIP)).toBe(true);
  });

  it('station 16: the retry (other) keeps 14 and 15 done and the stand-in ladder open', () => {
    const { s, calls, run } = trap(16, CAGE_DOOR, GAUGE);
    expect(s.station()).toBe(16);
    expect(s.isGateOpen(A6_PIT_LADDER_GATE)).toBe(true);
    run(A6_TRAP_GRACE + 0.1);
    expect(calls).toEqual([[16, 'other']]);
    expect(s.lastRetry).toEqual({ st: 16, cause: 'other' });
    expect(s.station()).toBe(16);
    expect(s.hasShared('a6-drive')).toBe(true);
    expect(s.hasShared(A6_GAL1_FLAG)).toBe(true);
    expect(s.isGateOpen(A6_PIT_LADDER_GATE)).toBe(true);
  });

  it('the station\'s retry switched off (route-runs\' retryOff): the clock runs out with no retry', () => {
    const { s, run } = trap(15, CAGE_DOOR, UNDER_BRIDGE);
    expect(s.retryOff(15)).toBe(true);
    run(20);
    expect(s.restarts).toBe(0);
    expect(s.station()).toBe(15);
  });

  it('LANTERN says the retry:<id>:other line for 14-16 (what and where, fits the HUD); the seen lines are unchanged', () => {
    for (const st of A6_PUMP_HOUSE_STATIONS) {
      const t = A6_TRAP_LINES[st.id as keyof typeof A6_TRAP_LINES];
      expect(t, st.id).toBeDefined();
      expect(retryLine(bay.radio, st.id, 'other')).toBe(t);
      expect(retryLine(bay.radio, st.id, 'seen')).toBe(A6_RETRY_LINES.find((r) => r.id === st.id)!.text);
      expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(t), t).toBe(false);
      expect(t.toLowerCase()).not.toContain('fail');
      expect(t).toMatch(/Back to the /);
    }
    expect(Object.keys(A6_TRAP_LINES)).toEqual(A6_PUMP_HOUSE_STATIONS.map((s) => s.id));
  });
});
