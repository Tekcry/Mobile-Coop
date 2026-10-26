/**
 * Marlow re-plan, A1 the Gate (J14 slice G-A1A7; PLAN section 2, STATIONS.md sections 3, 8, 9): the set on `ctcourseReplan`.
 * Pins: the re-plan's collision (`GREY`, the same as the built set: A1 only amends its part), the contract, the checker kept
 * passive in the squad and on no station's list, the two wall-top pass zones, the wicket a way back only (a course run:
 * B alone on the wall top, then in the yard, cannot open it), stations 1-2 as STATIONS section 3 has them with standing
 * room at their marks (B on the 4.4 m wall top), the objective and radio lines. The built A1 is `tests/ctcourse/a1Gate.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { COURSE_TEXT_MAX } from '../../../src/config/course';
import { MOVEMENT } from '../../../src/config/movement';
import { hyp2 } from '../../../src/core/mathx';
import { layoutKnownIds, validateCourse } from '../../../src/game/course/courseDef';
import { CourseState, REFUSE_BOLT } from '../../../src/game/course/courseState';
import { A1_TRAP_CLIMB, A1_TRAP_GRACE, A1_TRAP_YARD, a1Tick } from '../../../src/game/course/replan/a1Ticks';
import type { StationHooks } from '../../../src/game/course/replan/ticks';
import type { StationDef } from '../../../src/game/course/stationDef';
import { inTickZone, retryLine, stationSlots } from '../../../src/game/modes/courseMode';
import { passZoneNeed } from '../../../src/game/passZones';
import { LevelBuilder, type BoxPiece } from '../../../src/world/levelBuilder';
import { buildCtcourse } from '../../../src/world/maps/ctcourse';
import { A1_CHECKER, A1_MARK_ZONE, A1_WALL, A1_WICKET_DOOR, A1_WICKET_GATE, A1_YARD_ZONE } from '../../../src/world/maps/ctcourseSets/a1Gate';
import { A1_GATE_STATIONS, A1_TOP1_FLAG, A1_TOP_FLAG, A1_TOP_ZONE, A1_TRAP_LINES, A1_WICKET_TOP_GATE } from '../../../src/world/maps/ctcourseSets/replan/a1Gate';
import { checkSetPart, inBox, OBJECTIVE_ID_MAX, SET_BOX } from '../../../src/world/maps/ctcourseSets/types';

const b = new LevelBuilder();
const built = buildCtcourse(b, { replan: true });
const part = built.parts[0]!;
const course = built.layout.course!;
const def = course.def;
const range = built.ranges.a1Gate;
const mine = b.boxes.slice(range.boxes[0], range.boxes[1]);
/** The set's collision on the re-plan (A1 adds none: the built set's 27 solids, its greybox and the props' own). */
const GREY = { solids: 27, checksum: 2665.414, lights: 9 };
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
/** The solid boxes in a body's band (feet `y` to `y` + 1.7) within `r` of (x, z). */
const blockedAt = (x: number, z: number, y = 0, r = MOVEMENT.radius): BoxPiece[] =>
  solid.filter((p) => p.c[1] - p.s[1] / 2 < y + 1.7 && top(p) > y + 0.15).filter((p) => hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r);
/** A fresh course at set 1 with the two players at the given feet. */
function runAt(a: [number, number, number], c: [number, number, number]): CourseState {
  const s = new CourseState(def, course.consoles);
  s.startAt(1);
  s.setPlayer(0, a[0], a[1], a[2], false);
  s.setPlayer(1, c[0], c[1], c[2], false);
  s.update(1 / 60);
  return s;
}
/** How many of the players' feet stand in a pass zone, as `CtDevices` counts them (plan box, feet within 1 m of its floor). */
const inZone = (zoneId: string, feet: readonly [number, number, number][]): boolean => {
  const z = part.passZones.find((q) => q.id === zoneId)!;
  const n = feet.filter(([x, y, zz]) => inBox(z.box, x, zz) && Math.abs(y - (z.floorY ?? 0)) < 1).length;
  return n >= passZoneNeed(z.any, 2, false);
};

describe('Marlow re-plan A1 the Gate (G-A1A7): the part', () => {
  it('passes the set-part contract; the re-plan course validates', () => {
    expect(part.id).toBe('a1Gate');
    expect(checkSetPart(part)).toEqual([]);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
  });

  it('GREY: the collision is the built set\'s (A1 adds no box, lamp, door or anchor on the re-plan)', () => {
    const mineSolid = mine.filter((p) => p.collide);
    let sum = 0;
    for (const p of mineSolid) sum += p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw;
    expect(mineSolid).toHaveLength(GREY.solids);
    expect(sum).toBeCloseTo(GREY.checksum, 2);
    const plain = buildCtcourse(new LevelBuilder());
    expect(built.counts.sets.a1Gate).toEqual(plain.counts.sets.a1Gate);
    expect(built.counts.sets.a1Gate.lights).toBe(GREY.lights);
  });

  it('the squad is the passive checker alone (not a guard: BRIEF A11), on no station\'s list; the bay is unrated', () => {
    expect(part.bay.squad).toEqual([A1_CHECKER]);
    expect(part.squads[A1_CHECKER]!.passive).toBe(true);
    for (const s of part.bay.stations!) expect(s.guards).not.toContain(A1_CHECKER);
    expect(def.bays[0]!.rated).toBe(false);
  });
});

describe('Marlow re-plan A1: the stations (STATIONS.md section 3)', () => {
  const sheet: StationDef[] = [
    { n: 1, id: 'a1-boost', lesson: 'boost', retry: 'none', doneFlag: 'a1-top1',
      marks: [{ x: 10.5, z: 6.0, y: 0, yaw: Math.PI / 2 }, { x: 9.5, z: 6.0, y: 0, yaw: Math.PI / 2 }],
      guards: [], gates: [] },
    { n: 2, id: 'a1-ladder', lesson: 'human_ladder', retry: 'none', doneFlag: 'a1-top',
      marks: [{ x: 10.5, z: 6.0, y: 0, yaw: Math.PI / 2 }, { x: 12.0, z: 6.0, y: 4.4, yaw: -Math.PI / 2 }],
      guards: [], gates: ['g-a1-wicket'] },
  ];

  it('stations 1 and 2 are the sheet\'s A1 block, on the bay; nothing can fail (retry none, no drill)', () => {
    expect(part.bay.stations).toEqual(sheet);
    expect(A1_GATE_STATIONS).toEqual(sheet);
    expect(def.bays[0]!.stations).toEqual(sheet);
    for (const s of sheet) expect(s.drillS).toBeUndefined();
    // no seen or timer line: the only retry lines are the early-drop way back (A26, cause other)
    expect(part.bay.radio.filter((r) => r.at.startsWith('retry:')).map((r) => r.at)).toEqual(['retry:a1-boost:other', 'retry:a1-ladder:other']);
  });

  it('the marks have standing room: A on the apron by the striped mark, B on the wall top at 4.4 (the wall under the feet, nothing in the body band)', () => {
    const [s1, s2] = sheet;
    for (const m of [...s1!.marks, s2!.marks[0]]) {
      expect(m.y).toBe(0);
      expect(blockedAt(m.x, m.z)).toEqual([]);
      expect(m.x).toBeLessThan(A1_WALL.near - MOVEMENT.radius);
    }
    // the booster's mark is the striped mark's claim zone (the role claim gives A)
    expect(inBox(A1_MARK_ZONE, s1!.marks[0].x, s1!.marks[0].z)).toBe(true);
    const B = s2!.marks[1];
    expect(B.y).toBeCloseTo(A1_WALL.lip, 9);
    const under = solid.filter((p) => inBox([p.c[0] - p.s[0] / 2, p.c[2] - p.s[2] / 2, p.c[0] + p.s[0] / 2, p.c[2] + p.s[2] / 2], B.x, B.z) && Math.abs(top(p) - B.y) < 1e-6);
    expect(under.length).toBeGreaterThan(0);
    // the 0.6 m top takes a body's centre; nothing stands over it within a body's height
    expect(B.x).toBeGreaterThan(A1_WALL.near);
    expect(B.x).toBeLessThan(A1_WALL.far);
    expect(solid.filter((p) => inBox([p.c[0] - p.s[0] / 2, p.c[2] - p.s[2] / 2, p.c[0] + p.s[0] / 2, p.c[2] + p.s[2] / 2], B.x, B.z) && p.c[1] - p.s[1] / 2 < B.y + 1.8 && top(p) > B.y + 0.15)).toEqual([]);
    for (const m of [...s1!.marks, ...s2!.marks]) expect(inBox(SET_BOX.a1Gate[0]!, m.x, m.z)).toBe(true);
  });

  it('the stations advance on their done flags: 1 live at the start, 2 once one is on the top, none once both are', () => {
    const s = runAt([2, 0, 10], [2, 0, 12]);
    expect(s.station()).toBe(1);
    s.setFlag(A1_TOP1_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(2);
    s.setFlag(A1_TOP_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(0);
    expect(s.isStepDone('a1-boost')).toBe(true);
    expect(s.isStepDone('a1-ladder')).toBe(true);
    // nothing can fail: a seen or timer retry of either does nothing
    const r = runAt([2, 0, 10], [2, 0, 12]);
    expect(r.retryStation('seen')).toBe(false);
    expect(r.retryStation('timer', 1)).toBe(false);
    expect(r.station()).toBe(1);
    expect(r.restarts).toBe(0);
  });
});

describe('Marlow re-plan A1: the wall-top flags (STATIONS.md section 8)', () => {
  it('a1-top1 (any) and a1-top (both): the wall top between its faces, z 2.3-19.7, floor 4.4; flags external', () => {
    const z1 = part.passZones.find((z) => z.flag === A1_TOP1_FLAG)!;
    const z2 = part.passZones.find((z) => z.flag === A1_TOP_FLAG)!;
    expect(z1).toMatchObject({ id: 'a1-p-top1', box: [11.7, 2.3, 12.3, 19.7], floorY: 4.4, any: true });
    expect(z2).toMatchObject({ id: 'a1-p-top', box: [11.7, 2.3, 12.3, 19.7], floorY: 4.4 });
    expect(z2.any).toBeUndefined();
    expect(A1_TOP_ZONE).toEqual([11.7, 2.3, 12.3, 19.7]);
    expect(part.externalFlags).toEqual(expect.arrayContaining([A1_TOP1_FLAG, A1_TOP_FLAG]));
  });

  it('one on the top sets a1-top1, not a1-top; both set both; feet on the apron or the yard floor beside the wall set neither', () => {
    const top1: [number, number, number] = [12.0, 4.4, 6.0];
    const top2: [number, number, number] = [12.0, 4.4, 9.0];
    const apron: [number, number, number] = [10.5, 0, 6.0];
    const yardFoot: [number, number, number] = [12.2, 0, 11.0];
    expect(inZone('a1-p-top1', [top1, apron])).toBe(true);
    expect(inZone('a1-p-top', [top1, apron])).toBe(false);
    expect(inZone('a1-p-top', [top1, top2])).toBe(true);
    expect(inZone('a1-p-top1', [apron, yardFoot])).toBe(false);
    expect(inZone('a1-p-top', [yardFoot, [12.1, 0, 7]])).toBe(false);
  });
});

describe('Marlow re-plan A1: the wicket is a way back only (graph)', () => {
  it('a flag gate on a1-top joins the yard-side bolt on the wicket; the bolt is the built one', () => {
    const bolt = part.bay.gates.find((g) => g.id === A1_WICKET_GATE);
    expect(bolt).toMatchObject({ kind: 'bolt', doorId: A1_WICKET_DOOR, side: [1, 0], at: [12, 11] });
    expect(part.bay.gates.find((g) => g.id === A1_WICKET_TOP_GATE)).toEqual({ kind: 'flag', id: A1_WICKET_TOP_GATE, flag: A1_TOP_FLAG, doorId: A1_WICKET_DOOR });
    expect(part.bay.gates).toHaveLength(2);
    // the role claim is the built one: the striped mark takes A
    expect(part.bay.roles).toEqual([{ role: 'a', zone: { box: A1_MARK_ZONE, y1: 1 } }]);
  });

  it('B alone on the wall top, then in the yard, cannot open it: the apron press is refused, the yard press unbolts but the door stays locked', () => {
    // A on the apron at the mark, B boosted onto the top (a1-top1), then dropped into the yard by the wicket
    const s = runAt([10.5, 0, 6], [12.0, 4.4, 6]);
    s.setFlag(A1_TOP1_FLAG);
    s.update(1 / 60);
    s.setPlayer(1, 12.8, 0, 11, false);
    s.update(1 / 60);
    expect(s.press(A1_WICKET_DOOR, 0)).toBe(REFUSE_BOLT);
    expect(s.press(A1_WICKET_DOOR, 1)).toBeNull();
    s.update(1 / 60);
    expect(s.locked(A1_WICKET_DOOR)).toBe(true);
    s.update(1);
    expect(s.locked(A1_WICKET_DOOR)).toBe(true);
    expect(s.station()).toBe(2);
  });

  it('once both have been on the top (a1-top) the unbolted wicket opens: the way back; unbolted first or after, the same', () => {
    const s = runAt([10.5, 0, 6], [12.8, 0, 11]);
    s.setFlag(A1_TOP1_FLAG);
    s.press(A1_WICKET_DOOR, 1);
    s.setFlag(A1_TOP_FLAG);
    s.update(1 / 60);
    expect(s.locked(A1_WICKET_DOOR)).toBe(false);
    const t = runAt([13, 0, 9], [13, 0, 12]);
    t.setFlag(A1_TOP1_FLAG);
    t.setFlag(A1_TOP_FLAG);
    t.update(1 / 60);
    expect(t.locked(A1_WICKET_DOOR)).toBe(true);
    expect(t.press(A1_WICKET_DOOR, 0)).toBeNull();
    t.update(1 / 60);
    expect(t.locked(A1_WICKET_DOOR)).toBe(false);
  });

  it('the check has teeth: without the flag gate the yard press alone opens the wicket (the built yard\'s skip)', () => {
    const plain = buildCtcourse(new LevelBuilder()).layout.course!;
    const s = new CourseState(plain.def, plain.consoles);
    s.startAt(1);
    s.setPlayer(0, 10.5, 0, 6, false);
    s.setPlayer(1, 12.8, 0, 11, false);
    s.update(1 / 60);
    expect(s.press(A1_WICKET_DOOR, 1)).toBeNull();
    expect(s.locked(A1_WICKET_DOOR)).toBe(false);
  });
});

describe('Marlow re-plan A1: objective and radio lines', () => {
  const steps = def.objectives!.filter((o) => o.bay === 'A1');

  it('three steps: the boost (one on top), the ladder (both on top), then the closing line to holding room one', () => {
    expect(steps.map((o) => o.id)).toEqual(['a1-boost', 'a1-ladder', 'a1-lock']);
    expect(steps[0]!.done).toEqual({ flag: A1_TOP1_FLAG });
    expect(steps[1]!.done).toEqual({ flag: A1_TOP_FLAG });
    expect(steps[2]!.done).toBeUndefined();
    for (const o of steps.slice(0, 2)) {
      expect(o.a).toBeDefined();
      expect(o.b).toBeDefined();
      // what and where
      expect(o.text).toMatch(/striped mark/);
    }
    expect(steps[2]!.text).toMatch(/holding room one/);
  });

  it('every line fits 90 characters, no em or en dash; ids fit the wire; no radio line asks for the gate to be opened', () => {
    for (const o of steps) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(/[–—]/.test(t), t).toBe(false);
      }
      expect(o.id.length).toBeLessThanOrEqual(OBJECTIVE_ID_MAX);
    }
    expect(part.bay.radio.map((r) => r.at)).toEqual(['enter', 'a1-boost', 'a1-ladder', 'retry:a1-boost:other', 'retry:a1-ladder:other']);
    for (const r of part.bay.radio) {
      expect(r.text.length, r.text).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(r.text), r.text).toBe(false);
      expect(r.text).not.toMatch(/open the gate/i);
    }
  });

  it('the role lines follow the claim: the booster on the striped mark reads the A line', () => {
    const s = runAt([2, 0, 10], [10.8, 0, 6]);
    const boost = steps[0]!;
    expect(s.roleOf(1)).toBe('a');
    expect(s.stepLine(boost, 1)).toBe(boost.a);
    expect(s.stepLine(boost, 0)).toBe(boost.b);
  });
});

describe('Marlow re-plan A1: an early drop is never a trap (A26, Q5 / G370)', () => {
  type Feet = { x: number; y: number; z: number };
  const P = (x: number, y: number, z: number): Feet => ({ x, y, z });
  const APRON = P(10.5, 0, 6);
  const YARD = P(13.5, 0, 11);
  const TOP = P(12.0, 4.4, 9);
  /** A yard-face hang off the lip (feet about 2 m under it, a body's width out from the face). */
  const HANG = P(12.6, 2.4, 9);
  /** (e2e fix) A let-go off that hang: straight down, feet just off the face (12.3 + the hang's 0.22 m). */
  const LANDED = P(12.52, 0, 9);
  /** A climb or a boost at the apron face (feet 1.6 m up). */
  const CLIMB = P(11.4, 1.6, 6);
  const LOUNGE = P(2, 0, 12);
  const DT = 0.1;
  let epochSeq = 1000;

  /** A real re-plan course at set 1, the feet `a` / `b`, and the A1 tick driven by hooks over it (host side). */
  function trap(a: Feet, b: Feet, o: { top1?: boolean } = {}) {
    const s = runAt([a.x, a.y, a.z], [b.x, b.y, b.z]);
    if (o.top1) {
      s.setFlag(A1_TOP1_FLAG);
      s.update(1 / 60);
    }
    const feet = [a, b];
    let epoch = ++epochSeq;
    const calls: [number, string][] = [];
    const h: StationHooks = {
      flag: (id) => s.hasShared(id),
      live: () => s.station(),
      retry: (n, cause) => {
        calls.push([n, cause]);
        if (!s.retryStation(cause, n)) return false;
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
    /** Run the tick for `t` s (feet as they stand). */
    const run = (t: number): void => {
      for (let i = 0; i < Math.round(t / DT); i++) a1Tick(h, DT);
    };
    const put = (k: 0 | 1, f: Feet): void => {
      feet[k] = f;
      s.setPlayer(k, f.x, f.y, f.z, false);
      s.update(1 / 60);
    };
    return { s, calls, run, put };
  }

  it('the zones: the yard floor is the set\'s yard zone (a hop still counts), the climb band is the wall\'s faces and top', () => {
    expect(A1_TRAP_YARD.slice(1, 4)).toEqual(A1_YARD_ZONE.slice(1));
    // from the yard face, not the pass zone's 12.6: a let-go off the yard-face hang lands just off the face
    expect(A1_TRAP_YARD[0]).toBe(A1_WALL.far);
    expect(inTickZone(A1_TRAP_YARD, LANDED)).toBe(true);
    expect(inTickZone(A1_TRAP_CLIMB, LANDED)).toBe(false);
    expect(inTickZone(A1_TRAP_YARD, P(15, 0.8, 11))).toBe(true);
    expect(inTickZone(A1_TRAP_CLIMB, P(15, 0.8, 11))).toBe(false);
    for (const f of [TOP, HANG, CLIMB, P(11.3, 2.4, 6)]) expect(inTickZone(A1_TRAP_CLIMB, f), JSON.stringify(f)).toBe(true);
    for (const f of [APRON, YARD, LOUNGE]) expect(inTickZone(A1_TRAP_CLIMB, f), JSON.stringify(f)).toBe(false);
    expect(A1_TRAP_CLIMB[0]).toBeLessThan(A1_WALL.near - MOVEMENT.radius);
    expect(A1_TRAP_CLIMB[2]).toBeGreaterThan(A1_WALL.far + MOVEMENT.radius);
    expect(A1_TRAP_CLIMB[4]).toBeGreaterThan(A1_TRAP_YARD[5]!);
    expect(A1_TRAP_GRACE).toBe(5);
  });

  it('station 2: B dropped into the yard, A on the apron: no retry inside the grace, then station 2 retries (other), both on its marks', () => {
    const { s, calls, run } = trap(APRON, YARD, { top1: true });
    expect(s.press(A1_WICKET_DOOR, 1)).toBeNull();
    s.update(1 / 60);
    expect(s.isGateOpen(A1_WICKET_GATE)).toBe(true);
    expect(s.station()).toBe(2);
    run(A1_TRAP_GRACE - 0.2);
    expect(calls).toEqual([]);
    expect(s.restarts).toBe(0);
    run(0.3);
    expect(calls).toEqual([[2, 'other']]);
    expect(s.restarts).toBe(1);
    expect(s.lastRetry).toEqual({ st: 2, cause: 'other' });
    // only station 2 reset: the bolt shut again, station 1 (the boost) still done
    expect(s.station()).toBe(2);
    expect(s.isGateOpen(A1_WICKET_GATE)).toBe(false);
    expect(s.hasFlag(A1_TOP1_FLAG)).toBe(true);
    expect(s.locked(A1_WICKET_DOOR)).toBe(true);
    // the marks the mode puts them on (A claimed the striped mark: P1 is A): A at the mark, B on the wall top
    const st2 = def.bays[0]!.stations![1]!;
    expect(s.roleOf(0)).toBe('a');
    expect(stationSlots(st2, 0)).toEqual([
      { x: 10.5, y: 0, z: 6, yaw: Math.PI / 2 },
      { x: 12, y: 4.4, z: 6, yaw: -Math.PI / 2 },
    ]);
    // LANTERN's line, what and where, voice-able, fits the HUD; never the (absent) seen line
    expect(retryLine(def.bays[0]!.radio, 'a1-ladder', 'other')).toBe(A1_TRAP_LINES['a1-ladder']);
    expect(retryLine(def.bays[0]!.radio, 'a1-ladder', 'seen')).toBeNull();
    for (const t of Object.values(A1_TRAP_LINES)) {
      expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(t), t).toBe(false);
      expect(t).toMatch(/yard/);
    }
  });

  it('the grace: a partner on the wall top (a ladder is still on) or hanging off it holds the clock; both stuck below starts it', () => {
    const { s, calls, run, put } = trap(TOP, YARD, { top1: true });
    run(10);
    put(0, HANG);
    run(10);
    expect(calls).toEqual([]);
    // the one on top lets go into the yard too: nobody up, the clock runs from there
    put(0, P(14, 0, 8));
    run(A1_TRAP_GRACE - 0.2);
    expect(calls).toEqual([]);
    run(0.3);
    expect(calls).toEqual([[2, 'other']]);
    expect(s.lastRetry).toEqual({ st: 2, cause: 'other' });
  });

  it('a climb starts the clock again; so does a retry (a new epoch)', () => {
    const { s, calls, run, put } = trap(APRON, YARD, { top1: true });
    run(A1_TRAP_GRACE - 1);
    put(0, CLIMB);
    run(0.1);
    put(0, APRON);
    run(A1_TRAP_GRACE - 1);
    expect(calls).toEqual([]);
    run(1.3);
    expect(calls).toEqual([[2, 'other']]);
    // after the retry the clock is fresh: B still in the yard (not yet placed) waits a full grace again
    run(A1_TRAP_GRACE - 0.2);
    expect(calls).toHaveLength(1);
    expect(s.restarts).toBe(1);
  });

  it('station 2 (the e2e early drop): the one on top lets go off the yard-face hang, the partner on the mark: station 2 retries (other)', () => {
    const { s, calls, run, put } = trap(TOP, APRON, { top1: true });
    run(10);
    put(0, HANG);
    run(2);
    put(0, LANDED);
    run(A1_TRAP_GRACE - 0.2);
    expect(calls).toEqual([]);
    run(0.3);
    expect(calls).toEqual([[2, 'other']]);
    expect(s.lastRetry).toEqual({ st: 2, cause: 'other' });
  });

  it('station 1: a player over the wall before the top flag, the partner in the lounge: station 1 retries (other)', () => {
    const { s, calls, run } = trap(LOUNGE, YARD);
    expect(s.station()).toBe(1);
    run(A1_TRAP_GRACE + 0.1);
    expect(calls).toEqual([[1, 'other']]);
    expect(s.lastRetry).toEqual({ st: 1, cause: 'other' });
    expect(s.station()).toBe(1);
    expect(retryLine(def.bays[0]!.radio, 'a1-boost', 'other')).toBe(A1_TRAP_LINES['a1-boost']);
  });

  it('no retry once both have been on the top (the wicket is the way back), with the station\'s retry off (route-runs), or with nobody in the yard', () => {
    const done = trap(YARD, P(14, 0, 8), { top1: true });
    done.s.setFlag(A1_TOP_FLAG);
    done.s.update(1 / 60);
    expect(done.s.station()).toBe(0);
    done.run(20);
    expect(done.calls).toEqual([]);
    const off = trap(APRON, YARD, { top1: true });
    expect(off.s.retryOff(2)).toBe(true);
    off.run(20);
    expect(off.s.restarts).toBe(0);
    expect(off.s.station()).toBe(2);
    const apron = trap(APRON, P(9.5, 0, 6), { top1: true });
    apron.run(20);
    expect(apron.calls).toEqual([]);
  });

  it('teeth: on these none stations a seen retry is refused and other is taken only for the live station', () => {
    const s = runAt([10.5, 0, 6], [13.5, 0, 11]);
    s.setFlag(A1_TOP1_FLAG);
    s.update(1 / 60);
    expect(s.retryStation('seen', 2)).toBe(false);
    expect(s.retryStation('other', 1)).toBe(false);
    expect(s.restarts).toBe(0);
    expect(s.retryStation('other', 2)).toBe(true);
    expect(s.restarts).toBe(1);
  });
});
