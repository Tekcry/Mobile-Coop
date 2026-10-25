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
import type { StationDef } from '../../../src/game/course/stationDef';
import { passZoneNeed } from '../../../src/game/passZones';
import { LevelBuilder, type BoxPiece } from '../../../src/world/levelBuilder';
import { buildCtcourse } from '../../../src/world/maps/ctcourse';
import { A1_CHECKER, A1_MARK_ZONE, A1_WALL, A1_WICKET_DOOR, A1_WICKET_GATE } from '../../../src/world/maps/ctcourseSets/a1Gate';
import { A1_GATE_STATIONS, A1_TOP1_FLAG, A1_TOP_FLAG, A1_TOP_ZONE, A1_WICKET_TOP_GATE } from '../../../src/world/maps/ctcourseSets/replan/a1Gate';
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
    expect(part.bay.radio.filter((r) => r.at.startsWith('retry:'))).toEqual([]);
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
    // nothing can fail: a retry of either does nothing
    const r = runAt([2, 0, 10], [2, 0, 12]);
    expect(r.retryStation('seen')).toBe(false);
    expect(r.station()).toBe(1);
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
    expect(part.bay.radio.map((r) => r.at)).toEqual(['enter', 'a1-boost', 'a1-ladder']);
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
