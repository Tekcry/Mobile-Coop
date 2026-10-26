/**
 * Marlow re-plan, A4 the Goods Shed (J14 slice G-A4; PLAN section 2, STATIONS.md sections 3, 5, 6, 8, 9, 10): the set on
 * `ctcourseReplan`. Pins: the re-plan's collision (`GREY`), the contract, the squad (officer, two loaders, the second loader
 * static: the kettle loop is out), stations 9, 8, 10 as STATIONS section 3 has them with standing room at their marks, one
 * floor route on the nav (a player's grid: with the grille shut nothing past z 24.25 is reachable; open, the only way to the
 * dock is the back aisle's east part, the cross aisle and the main aisle, and aisle 2, the east lane, the west back aisle, the
 * mezzanine stairs and the dispatch office are all closed), the grille and its stand-in gates, the office locked for good,
 * the cameras (station 9's ground out of C2's range, station 10's marks out of C3's frame at every sweep angle), the lamps
 * (groups 49 and 44, A4 at its 24), the pass zones, the objective, radio and retry lines. The drill windows of stations 8 and
 * 10 are `a4Ticks.test.ts`; the built A4 is `tests/ctcourse/a4GoodsShed.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NavGrid, type NavBlocker } from '../../../src/ai/navGrid';
import { GUARD_INFO_LINE_MAX } from '../../../src/ai/guardInfo';
import { COURSE_TEXT_MAX } from '../../../src/config/course';
import { MOVEMENT } from '../../../src/config/movement';
import { hyp2, hyp3 } from '../../../src/core/mathx';
import { layoutKnownIds, retryKey, validateCourse, type EgressGate, type LeverGate } from '../../../src/game/course/courseDef';
import { CourseState } from '../../../src/game/course/courseState';
import { cameraOff } from '../../../src/game/course/securityRoom';
import type { StationDef } from '../../../src/game/course/stationDef';
import { camPitch, camRange, inFrame } from '../../../src/security/camera';
import type { CameraDevice } from '../../../src/security/data';
import { LevelBuilder, type BoxPiece } from '../../../src/world/levelBuilder';
import { MARLOW_CIRCUITS_REPLAN, MARLOW_LAMP_BUDGET } from '../../../src/world/lighting/marlowCircuits';
import { buildCtcourse } from '../../../src/world/maps/ctcourse';
import {
  A4_CAMERAS,
  A4_CONSOLE,
  A4_D1,
  A4_D2,
  A4_DOCK1,
  A4_DOCK2,
  A4_GATE,
  A4_LOOP_FLAG,
  A4_OFFICE,
  A4_OFFICE_DOOR,
  A4_OFFICER,
  A4_OFFICER_INFO,
  A4_PASSAGE,
  A4_PASSAGE_DOOR,
  A4_RACK_H,
  A4_STAIR,
  A4_WEST_FLAG,
  A4_WEST_ZONE,
  A4_WICKET_GATE,
} from '../../../src/world/maps/ctcourseSets/a4GoodsShed';
import { L4_EAST_DOOR } from '../../../src/world/maps/ctcourseSets/facility';
import {
  A4_BULK,
  A4_BULK_STRIPS,
  A4_C3_FACING,
  A4_DISPATCH_PANEL,
  A4_FRAMES,
  A4_GRILLE,
  A4_GRILLE_DOOR,
  A4_GRILLE_FLAG,
  A4_GRILLE_GATE,
  A4_GRILLE_MOTOR,
  A4_GRILLE_MOTOR_AT,
  A4_GRILLE_MOTOR_GATE,
  A4_GRILLE_ZONE,
  A4_HOARD_H,
  A4_HOARDS,
  A4_OFFICE_GATE,
  A4_OFFICE_KEY,
  A4_OFFICER_INFO_REPLAN,
  A4_RETRY_LINES,
  A4_STATIONS,
  A4_SW_BULK,
  A4_SW_DISPATCH,
  A4_WICKET_FLAG,
  A4_WICKET_ZONE,
} from '../../../src/world/maps/ctcourseSets/replan/a4GoodsShed';
import { checkSetPart, inBox, OBJECTIVE_ID_MAX, registerSum, SET_BOX } from '../../../src/world/maps/ctcourseSets/types';

const b = new LevelBuilder();
const built = buildCtcourse(b, { replan: true });
const part = built.parts[3]!;
const course = built.layout.course!;
const def = course.def;
const range = built.ranges.a4GoodsShed;
const mine = b.boxes.slice(range.boxes[0], range.boxes[1]);
const box = SET_BOX.a4GoodsShed;
const plain = buildCtcourse(new LevelBuilder());
const plainPart = plain.parts[3]!;

/**
 * The set's collision on the re-plan: the built set's solids less the kettle counter, plus the seven end frames, the three
 * hoardings, the grille's header; 24 lamps (the built 20 + 3 + 1); three doors (the grille); no anchor.
 */
const GREY = { solids: 84, checksum: 21855.050134876084, lights: 24, doors: 3, anchors: 0 };
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
/** A quarter-turn box folded upright (a kit rail along x is yawed): the axis-aligned shape the walk checks read. */
const upright = (p: BoxPiece): BoxPiece => (Math.abs(Math.sin(p.yaw)) > 0.5 ? { ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 } : { ...p, yaw: 0 });
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.pitch) < 1e-3 && (Math.abs(Math.sin(p.yaw)) < 1e-3 || Math.abs(Math.cos(p.yaw)) < 1e-3)).map(upright);
const doorAnchor = (cid: string) => b.anchors.doors.find((d) => d.id === course.doors[cid])!;
/** A course door's shut leaf as a thin box (sight and bodies stop on it). */
const leafOf = (cid: string): BoxPiece => {
  const d = doorAnchor(cid);
  const ex = d.hinge.x + Math.sin(d.yaw) * d.width;
  const ez = d.hinge.z + Math.cos(d.yaw) * d.width;
  return { c: [(d.hinge.x + ex) / 2, d.height / 2, (d.hinge.z + ez) / 2], s: [Math.max(Math.abs(ex - d.hinge.x), 0.06), d.height, Math.max(Math.abs(ez - d.hinge.z), 0.06)], yaw: 0, pitch: 0, color: '#000', collide: true, visible: true };
};
const SHUT = [A4_GRILLE_DOOR, A4_OFFICE_DOOR, L4_EAST_DOOR];
const blockedAt = (x: number, z: number, r = MOVEMENT.radius, shut: readonly string[] = SHUT): BoxPiece[] =>
  [...solid, ...shut.map(leafOf)].filter((p) => bottom(p) < 1.7 && top(p) > 0.15).filter((p) => hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r);
/** Does a solid box overlap the open box [x0, x1] x [y0, y1] x [z0, z1] (a hair of slack)? */
const overlaps = (p: BoxPiece, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): boolean =>
  p.c[0] - p.s[0] / 2 < x1 - 1e-6 && p.c[0] + p.s[0] / 2 > x0 + 1e-6 && bottom(p) < y1 - 1e-6 && top(p) > y0 + 1e-6 && p.c[2] - p.s[2] / 2 < z1 - 1e-6 && p.c[2] + p.s[2] / 2 > z0 + 1e-6;

/**
 * A nav grid over the set the way the game builds one (`NavGrid`, flat floor), cell 0.25, a player's radius. `shut`: the course
 * doors whose leaves stand shut (the passage door is a plain unlocked door: a player opens it, so it is never shut here);
 * `skip`: solid boxes the check removes for its teeth.
 */
function setNav(shut: readonly string[], skip: (p: BoxPiece) => boolean = () => false): NavGrid {
  const pieces = [...solid.filter((p) => !p.overhead && !skip(p)), ...shut.map(leafOf)];
  const blockers: NavBlocker[] = pieces
    .filter((p) => p.c[0] + p.s[0] / 2 > 75 && p.c[0] - p.s[0] / 2 < 113 && p.c[2] + p.s[2] / 2 > 12 && p.c[2] - p.s[2] / 2 < 49)
    .map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: 0, bottom: bottom(p), top: top(p) }));
  return new NavGrid({ minX: 76, maxX: 112, minZ: 13, maxZ: 48, cell: 0.25, agentRadius: MOVEMENT.radius, stepHeight: 0.45, blockers, sample: () => ({ h: 0, ok: true }) });
}
const ROOM_SPOT: [number, number] = [103, 15.4];
/** The cells a player can reach from the security room, as a lookup over plan points. */
function reach(nav: NavGrid): { at: (x: number, z: number) => boolean; cells: [number, number][] } {
  const dist = nav.flowField([ROOM_SPOT]);
  const cells: [number, number][] = [];
  for (let i = 0; i < nav.cols; i++) if (nav.isWalkable(i) && Number.isFinite(dist[i]!)) cells.push([...nav.center(i)] as [number, number]);
  return { at: (x, z) => Number.isFinite(dist[nav.cellOf(x, z)]!) && nav.isWalkable(nav.cellOf(x, z)), cells };
}
const inAny = (boxes: readonly (readonly number[])[], x: number, z: number): boolean => boxes.some((q) => x > q[0]! && x < q[2]! && z > q[1]! && z < q[3]!);
/** The closed ground (plan boxes [x0, z0, x1, z1], a hair inside each edge): aisle 2's two runs, the east lane, the west back aisle, the
 *  mezzanine block and both stair strips, the dispatch office. */
const CLOSED: Record<string, readonly (readonly number[])[]> = {
  'aisle 2': [[86, 29.7, 95, 33.2], [98.5, 29.7, 108, 33.2]],
  'east lane': [[108, 24.25, 111.75, 35.6]],
  'west back aisle': [[86, 24.25, 95, 27.3]],
  'mezzanine and stairs': [[86, 44, 106, 47.75], [A4_STAIR.westFoot - 0.2, 46.55, 86, 47.75], [106, 46.55, A4_STAIR.eastFoot + 0.05, 47.75]],
  'dispatch office': [[A4_OFFICE.x0, A4_OFFICE.z0, A4_OFFICE.x1, A4_OFFICE.z1]],
};
/** The route's own ground: the security room and passage, the back aisle's east part with the cross aisle, the main aisle, the dock. */
const ROUTE: readonly (readonly number[])[] = [
  [100.25, 13, 106.35, 19.6],
  [101, 19.6, 104, 24.25],
  [95, 24.25, 108, 27.3],
  [95, 27.3, 98.5, 35.6],
  [86, 35.6, 111.75, 44],
  [106, 44, 111.75, 47.75],
  [76.25, 24.25, 86, 47.75],
];

/** A fresh course at set 4 with the two players at the given feet. */
function runAt(a: [number, number], c: [number, number]): CourseState {
  const s = new CourseState(def, course.consoles);
  s.startAt(4);
  s.setPlayer(0, a[0], 0, a[1], false);
  s.setPlayer(1, c[0], 0, c[1], false);
  s.update(1 / 60);
  return s;
}

/** STATIONS.md section 3, A4 block, verbatim (play order 9, 8, 10). */
const SHEET: StationDef[] = [
  { n: 9, id: 'a4-deadweight', lesson: 'deadweight', retry: 'station', doneFlag: 'a4-grille', kit: 'deadweight', standIn: 'g-a4-grille-motor',
    marks: [{ x: 102.5, z: 14.0, y: 0, yaw: 0 }, { x: 103.5, z: 14.0, y: 0, yaw: 0 }],
    guards: ['a4-officer'], gates: ['g-a4-grille', 'g-a4-grille-motor'] },
  { n: 8, id: 'a4-camloop', lesson: 'camera_loop', retry: 'station', doneFlag: 'a4-west', drillS: 60,
    marks: [{ x: 104.5, z: 14.0, y: 0, yaw: 0 }, { x: 105.5, z: 14.0, y: 0, yaw: 0 }],
    guards: ['a4-officer', 'a4-dock1', 'a4-dock2'], gates: ['g-a4-console', 'cam-a4-c1', 'cam-a4-c2', 'cam-a4-c3'] },
  { n: 10, id: 'a4-takedown', lesson: 'synced_takedown', retry: 'station', doneFlag: 'a4-wicket', drillS: 1.5,
    marks: [{ x: 80.5, z: 36.5, y: 0, yaw: Math.PI }, { x: 79.5, z: 29.5, y: 0, yaw: 0 }],
    guards: ['a4-dock1', 'a4-dock2'], gates: ['g-a4-wicket'] },
];

describe('Marlow re-plan A4 the Goods Shed (G-A4): the part', () => {
  it('passes the set-part contract; the re-plan course validates; every register row is an A4 row and counts the builder', () => {
    expect(part.id).toBe('a4GoodsShed');
    expect(checkSetPart(part)).toEqual([]);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
    expect(part.register.every((r) => r.id.startsWith('A4-'))).toBe(true);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A4-30', 'A4-31', 'A4-32', 'A4-33', 'A4-34', 'A4-35']));
    expect(registerSum(part.register)).toEqual(built.counts.sets.a4GoodsShed);
    for (const r of part.register) expect(/[–—]/.test(r.element), r.id).toBe(false);
  });

  it("GREY: the re-plan's collision (solids, checksum), 24 lamps, three doors (the grille), no anchor; the built yard's A4 is unchanged", () => {
    const mineSolid = mine.filter((p) => p.collide);
    let sum = 0;
    for (const p of mineSolid) sum += p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw;
    expect(mineSolid).toHaveLength(GREY.solids);
    expect(sum).toBeCloseTo(GREY.checksum, 2);
    const c = built.counts.sets.a4GoodsShed;
    expect(c.lights).toBe(GREY.lights);
    expect(c.doors).toBe(GREY.doors);
    expect(c.anchors).toBe(GREY.anchors);
    expect(c.solids).toBe(GREY.solids);
    // the built yard (its own GREY is the built test's): 20 lamps, two doors, the kettle counter, D2's loop, no stations
    expect(plain.counts.sets.a4GoodsShed).toMatchObject({ lights: 20, doors: 2, anchors: 0 });
    expect(plain.counts.sets.a4GoodsShed.solids - c.solids).toBe(1 - (A4_FRAMES.length + A4_HOARDS.length + 1));
    expect(plainPart.bay.stations).toBeUndefined();
    expect(plainPart.register.map((r) => r.id)).toContain('A4-10');
    expect(plainPart.squads[A4_DOCK2]!.route).toBeDefined();
    expect(plainPart.squads[A4_DOCK2]!.loop).toBeDefined();
    expect(plainPart.lightSpots.map((s) => s.name)).toContain('A4 kettle');
    expect(plainPart.passZones.map((z) => z.flag)).toEqual([A4_WEST_FLAG]);
  });

  it('everything built lies inside the set boxes (0.3 m of wall slack); every collidable piece the re-plan adds is noLedge', () => {
    for (const p of mine.filter((q) => Math.abs(q.yaw) < 1e-3 && Math.abs(q.pitch) < 1e-3)) {
      const foot = [p.c[0] - p.s[0] / 2, p.c[2] - p.s[2] / 2, p.c[0] + p.s[0] / 2, p.c[2] + p.s[2] / 2] as const;
      expect(box.some((bx) => inBox(bx, foot[0], foot[1], 0.3) && inBox(bx, foot[2], foot[3], 0.3)), `box at (${p.c.join(', ')})`).toBe(true);
    }
    for (const f of A4_FRAMES) {
      const hit = mine.filter((p) => p.collide && Math.abs(p.c[0] - (f.box[0] + f.box[2]) / 2) < 1e-6 && Math.abs(p.c[2] - (f.box[1] + f.box[3]) / 2) < 1e-6 && Math.abs(top(p) - A4_RACK_H) < 1e-6);
      expect(hit, f.id).toHaveLength(1);
      expect(hit[0]!.noLedge, f.id).toBe(true);
      expect(hit[0]!.s[0] * hit[0]!.s[2], f.id).toBeGreaterThan(0.5);
    }
    for (const h of A4_HOARDS) {
      const hit = mine.filter((p) => p.collide && Math.abs(p.c[0] - (h.box[0] + h.box[2]) / 2) < 1e-6 && Math.abs(p.c[2] - (h.box[1] + h.box[3]) / 2) < 1e-6 && Math.abs(top(p) - A4_HOARD_H) < 1e-6);
      expect(hit, h.id).toHaveLength(1);
      expect(hit[0]!.noLedge, h.id).toBe(true);
    }
  });

  it('the squad is the officer and the two loaders; the second loader stands at the desk (80.0, 31.6), yaw 0, no route and no loop; the kettle loop and counter are out', () => {
    expect(part.bay.squad).toEqual([A4_OFFICER, A4_DOCK1, A4_DOCK2]);
    expect(Object.keys(part.squads)).toEqual([A4_OFFICER, A4_DOCK1, A4_DOCK2]);
    expect(def.bays[3]!.squad).toEqual([A4_OFFICER, A4_DOCK1, A4_DOCK2]);
    expect(part.squads[A4_DOCK2]).toEqual({ kind: 'grunt', x: 80.0, z: 31.6, yaw: 0 });
    expect([A4_D2.x, A4_D2.z]).toEqual([80.0, 31.6]);
    expect(part.squads[A4_DOCK2]!.route).toBeUndefined();
    expect(part.squads[A4_DOCK2]!.loop).toBeUndefined();
    expect(part.squads[A4_DOCK2]!.faces).toBeUndefined();
    expect(part.squads[A4_DOCK1]).toMatchObject({ kind: 'grunt', x: A4_D1.x, z: A4_D1.z });
    expect(part.squads[A4_DOCK1]!.route).toBeUndefined();
    // no counter on the office's west wall (0.9 m, x 76.25-76.6, z 39-40.2) and no register row for it
    expect(solid.some((p) => overlaps(p, 76.3, 76.55, 0.1, 0.85, 39.1, 40.1))).toBe(false);
    expect(part.register.map((r) => r.id)).not.toContain('A4-10');
    expect(part.lightSpots.map((s) => s.name).filter((n) => /kettle/i.test(n))).toEqual([]);
  });

  it("the officer's second line is about the pair, not the kettle; no A4 line (steps, radio, officer) names the kettle", () => {
    const info = part.squads[A4_OFFICER]!.info!;
    expect(info).toEqual(A4_OFFICER_INFO_REPLAN);
    expect(info.lines).toHaveLength(2);
    expect(info.lines[0]).toBe(A4_OFFICER_INFO.lines[0]);
    expect(info.lines[1]).toMatch(/two at the dock/i);
    expect(info.lines[1]).not.toMatch(/kettle/i);
    for (const l of info.lines) expect(l.length).toBeLessThanOrEqual(GUARD_INFO_LINE_MAX);
    for (const o of def.objectives!.filter((q) => q.bay === 'A4')) for (const t of [o.text, o.a, o.b]) if (t) expect(t, t).not.toMatch(/kettle/i);
    for (const r of part.bay.radio) expect(r.text, r.text).not.toMatch(/kettle/i);
    expect(part.squads[A4_OFFICER]).toMatchObject({ kind: 'officer', x: 104.8, z: 17.6 });
  });
});

describe('Marlow re-plan A4: the stations (STATIONS.md section 3)', () => {
  it('stations 9, 8, 10 are the sheet\'s A4 block in that order, on the part and the bay; drill windows 60 s and 1.5 s', () => {
    expect(part.bay.stations).toEqual(SHEET);
    expect(A4_STATIONS).toEqual(SHEET);
    expect(def.bays[3]!.stations).toEqual(SHEET);
    expect(part.bay.stations!.map((s) => s.n)).toEqual([9, 8, 10]);
    expect(part.bay.stations!.map((s) => s.drillS)).toEqual([undefined, 60, 1.5]);
    expect(part.bay.stations![0]).toMatchObject({ kit: 'deadweight', standIn: A4_GRILLE_MOTOR_GATE });
    // the guards and gates a retry resets are ids the set has
    for (const s of SHEET) for (const g of s.guards) expect(part.bay.squad).toContain(g);
    const gateIds = part.bay.gates.map((g) => g.id);
    for (const g of [...SHEET[0]!.gates, SHEET[1]!.gates[0]!, ...SHEET[2]!.gates]) expect(gateIds, g).toContain(g);
    for (const id of SHEET[1]!.gates.slice(1)) expect([...A4_CAMERAS], id).toContain(id);
  });

  it('the marks have standing room (a body of radius 0.3, shut doors included) inside the set; station 8 and 9 start in the security room, station 10 behind the two stacks', () => {
    for (const s of SHEET) {
      for (const m of s.marks) {
        expect(m.y).toBe(0);
        expect(blockedAt(m.x, m.z).map((p) => `(${p.c.join(', ')})`), `${s.id} (${m.x}, ${m.z})`).toEqual([]);
        expect(box.some((bx) => inBox(bx, m.x, m.z)), `${s.id} (${m.x}, ${m.z}) in the set box`).toBe(true);
      }
    }
    for (const s of SHEET.slice(0, 2)) for (const m of s.marks) expect(inBox([100.25, 13.25, 106.35, 19.35], m.x, m.z)).toBe(true);
    // the two crouch spots: A north of the north stack (it stands behind it from D1), B south of the south stack
    expect(SHEET[2]!.marks[0]).toMatchObject({ x: 80.5, z: 36.5 });
    expect(SHEET[2]!.marks[1]).toMatchObject({ x: 79.5, z: 29.5 });
  });

  it('the stations advance 9, 8, 10 on their done flags; a retry of 8 keeps 9 done and puts the console back; a retry of 9 keeps the grille open', () => {
    const s = runAt([102.5, 14], [103.5, 14]);
    expect(s.station()).toBe(9);
    s.setFlag(A4_GRILLE_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(8);
    expect(s.retryStation('timer')).toBe(true);
    s.update(1 / 60);
    expect(s.station()).toBe(8);
    expect(s.hasFlag(A4_GRILLE_FLAG)).toBe(true);
    expect(s.lastRetry).toEqual({ st: 8, cause: 'timer' });
    s.setFlag(A4_WEST_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(10);
    expect(s.retryStation('timer')).toBe(true);
    s.update(1 / 60);
    expect(s.station()).toBe(10);
    expect(s.hasFlag(A4_WEST_FLAG)).toBe(true);
    expect(s.lastRetry).toEqual({ st: 10, cause: 'timer' });
    s.setFlag(A4_WICKET_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(0);
    for (const id of ['a4-s9', 'a4-s8', 'a4-s10']) expect(s.isStepDone(id), id).toBe(true);
  });
});

describe('Marlow re-plan A4: one floor route (Q24, M4)', () => {
  it('seven pallet-rack end frames (5.4 m, solid, noLedge) stand where the plan has them; three locked hoardings (2.4 m) close the stairs\' feet', () => {
    expect(A4_FRAMES.map((f) => f.id)).toEqual(['back-x95', 'back-x86', 'back-x108', 'aisle2-x95', 'aisle2-x98', 'aisle2-x86', 'lane-north']);
    const f = Object.fromEntries(A4_FRAMES.map((q) => [q.id, q.box]));
    // the back aisle west of x 95 (from the cross aisle) and its east end at x 108: the full 3.05 m of the aisle
    expect([f['back-x95']![0] < 95 && f['back-x95']![2] >= 95, f['back-x95']![1], f['back-x95']![3]]).toEqual([true, 24.25, 27.3]);
    expect([f['back-x108']![0] < 108 && f['back-x108']![2] >= 108, f['back-x108']![1], f['back-x108']![3]]).toEqual([true, 24.25, 27.3]);
    // aisle 2's two mouths on the cross aisle (x 95 and x 98.5, z 29.7-33.2)
    expect([f['aisle2-x95']![1], f['aisle2-x95']![3], f['aisle2-x98']![1], f['aisle2-x98']![3]]).toEqual([29.7, 33.2, 29.7, 33.2]);
    expect(f['aisle2-x95']![0] < 95 && f['aisle2-x95']![2] >= 95).toBe(true);
    expect(f['aisle2-x98']![0] <= 98.5 + 0.2 && f['aisle2-x98']![0] >= 98.5).toBe(true);
    // the east lane's north mouth: across the lane (x 108-111.75) on the main aisle's south edge (z 35.6)
    expect([f['lane-north']![0], f['lane-north']![2]]).toEqual([108, 111.75]);
    expect(f['lane-north']![3]).toBeCloseTo(35.6, 9);
    // the stairs: a hoarding at each foot, 2.4 m
    expect(A4_HOARD_H).toBe(2.4);
    expect(A4_HOARDS.map((h) => h.id)).toEqual(['west-end', 'west-side', 'east-side']);
    expect(A4_HOARDS[0]!.box[2]).toBe(A4_STAIR.westFoot);
    expect(A4_HOARDS[2]!.box[2]).toBe(A4_STAIR.eastFoot + 0.05);
  });

  it('on the nav, from the security room with the grille shut nothing past z 24.25 is reachable (the passage dead-ends at the grille)', () => {
    const r = reach(setNav(SHUT));
    expect(r.cells.length).toBeGreaterThan(300);
    expect(r.at(102.5, 22.0)).toBe(true);
    expect(r.at(102.5, 24.0)).toBe(false);
    expect(r.cells.filter(([, z]) => z > 24.25 - 0.1).length).toBe(0);
    // the check has teeth: with the grille open the same cell is reachable
    expect(reach(setNav([A4_OFFICE_DOOR, L4_EAST_DOOR])).at(102.5, 25.5)).toBe(true);
  });

  it('with the grille open the only way to the dock is the back aisle east part, the cross aisle and the main aisle; aisle 2, the east lane, the west back aisle, the stairs and the mezzanine, and the office are closed', () => {
    const nav = setNav([A4_OFFICE_DOOR, L4_EAST_DOOR]);
    const r = reach(nav);
    for (const [x, z] of [[102.5, 25.5], [96.75, 31.4], [96.75, 40], [90, 40], [82, 33], [80.5, 36.5], [79.5, 29.5], [105, 40], [102.5, 15], [110, 40]] as const) expect(r.at(x, z), `(${x}, ${z})`).toBe(true);
    // every reachable cell is on the route's own ground; none is in a closed space
    const stray = r.cells.filter(([x, z]) => !inAny(ROUTE, x, z));
    expect(stray.slice(0, 5)).toEqual([]);
    for (const [name, boxes] of Object.entries(CLOSED)) expect(r.cells.filter(([x, z]) => inAny(boxes, x, z)).slice(0, 5), name).toEqual([]);
    // the way to the dock runs through the cross aisle and the main aisle
    const path = nav.findPath(ROOM_SPOT, [80.5, 36.5], 1e6);
    expect(path).not.toBeNull();
    const pts: [number, number][] = [ROOM_SPOT, ...path!.map((w): [number, number] => [w[0], w[1]])];
    let cross = false;
    let main = false;
    for (let i = 1; i < pts.length; i++) {
      const n = Math.max(1, Math.ceil(hyp2(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]) / 0.25));
      for (let k = 0; k <= n; k++) {
        const x = pts[i - 1]![0] + ((pts[i]![0] - pts[i - 1]![0]) * k) / n;
        const z = pts[i - 1]![1] + ((pts[i]![1] - pts[i - 1]![1]) * k) / n;
        if (inAny([[95, 27.3, 98.5, 35.6]], x, z)) cross = true;
        if (inAny([[86, 35.6, 108, 44]], x, z)) main = true;
        expect(inAny(ROUTE, x, z), `(${x.toFixed(2)}, ${z.toFixed(2)}) on the route`).toBe(true);
      }
    }
    expect(cross && main).toBe(true);
  });

  it('the check has teeth: with a frame (or a hoarding) missing the space behind it is reachable', () => {
    const open = [A4_OFFICE_DOOR, L4_EAST_DOOR];
    const without = (id: string) => {
      const f = A4_FRAMES.find((q) => q.id === id)!;
      return (p: BoxPiece): boolean => Math.abs(p.c[0] - (f.box[0] + f.box[2]) / 2) < 1e-6 && Math.abs(p.c[2] - (f.box[1] + f.box[3]) / 2) < 1e-6 && Math.abs(top(p) - A4_RACK_H) < 1e-6;
    };
    // the west back aisle opens from the cross aisle without its x 95 frame; aisle 2's east run without the x 98.5 one; the lane without its mouth frame
    expect(reach(setNav(open, without('back-x95'))).cells.filter(([x, z]) => inAny(CLOSED['west back aisle']!, x, z)).length).toBeGreaterThan(0);
    expect(reach(setNav(open, without('aisle2-x98'))).cells.filter(([x, z]) => inAny(CLOSED['aisle 2']!, x, z)).length).toBeGreaterThan(0);
    expect(reach(setNav(open, without('lane-north'))).cells.filter(([x, z]) => inAny(CLOSED['east lane']!, x, z)).length).toBeGreaterThan(0);
    // the west stair's foot without its hoarding is open floor
    const hoards = A4_HOARDS.filter((h) => h.id.startsWith('west')).map((h) => h.box);
    const noHoard = (p: BoxPiece): boolean => hoards.some((q) => Math.abs(p.c[0] - (q[0] + q[2]) / 2) < 1e-6 && Math.abs(p.c[2] - (q[1] + q[3]) / 2) < 1e-6 && Math.abs(top(p) - A4_HOARD_H) < 1e-6);
    expect(reach(setNav(open, noHoard)).cells.filter(([x, z]) => x < 83 && z > 46.4).length).toBeGreaterThan(0);
  });

  it('the dispatch office is locked for good: a flag gate on a key nothing sets; every press from both sides and every flag of the bay leave it locked', () => {
    const g = part.bay.gates.find((q) => q.id === A4_OFFICE_GATE);
    expect(g).toEqual({ kind: 'flag', id: A4_OFFICE_GATE, flag: A4_OFFICE_KEY, doorId: A4_OFFICE_DOOR });
    expect(part.externalFlags).toContain(A4_OFFICE_KEY);
    expect(part.passZones.some((z) => z.flag === A4_OFFICE_KEY)).toBe(false);
    for (const q of def.bays.flatMap((x) => x.gates)) if (q.kind === 'pickup' || q.kind === 'pair') expect(q.flag).not.toBe(A4_OFFICE_KEY);
    const s = runAt([103, 15.4], [104, 15.4]);
    expect(s.locked(A4_OFFICE_DOOR)).toBe(true);
    s.press(A4_OFFICE_DOOR, 0);
    s.press(A4_OFFICE_DOOR, 1);
    for (const f of [A4_GRILLE_FLAG, A4_LOOP_FLAG, A4_WEST_FLAG, A4_WICKET_FLAG]) s.setFlag(f);
    s.update(1);
    expect(s.locked(A4_OFFICE_DOOR)).toBe(true);
    // the passage door is a plain door: not locked by the course
    expect(s.locked(A4_PASSAGE_DOOR)).toBe(false);
  });
});

describe('Marlow re-plan A4: station 9, the lift grille (stand-in)', () => {
  const lever = part.bay.gates.find((g) => g.id === A4_GRILLE_MOTOR_GATE) as LeverGate;
  const egress = part.bay.gates.find((g) => g.id === A4_GRILLE_GATE) as EgressGate;

  it('the grille: a 3 m sliding leaf across the passage mouth (x 101-104, z 24), 2.4 m, built locked, with its header to the gallery underside; the motor button beside the mouth on the passage side', () => {
    const d = doorAnchor(A4_GRILLE_DOOR);
    expect(d.hinge).toEqual({ x: 101, y: 0, z: 24 });
    expect(d.width).toBeCloseTo(3, 9);
    expect(d.height).toBeCloseTo(2.4, 9);
    expect(d.locked).toBe(true);
    expect(A4_GRILLE).toMatchObject({ x0: 101, x1: 104, z: 24, h: 2.4 });
    expect(A4_PASSAGE.open).toEqual([101, 104]);
    // the header closes the opening from 2.4 m to the gallery's underside (4.2)
    const head = mine.find((p) => p.collide && Math.abs(p.c[0] - 102.5) < 1e-6 && Math.abs(p.c[2] - 24) < 1e-6 && Math.abs(bottom(p) - 2.4) < 1e-6)!;
    expect(head).toBeDefined();
    expect(top(head)).toBeCloseTo(A4_PASSAGE.top, 9);
    expect(head.noLedge).toBe(true);
    // the button: a course device on the passage's east wall, inside the passage (x 101-104, z under 24), within reach of the mouth
    const dev = part.devices[A4_GRILLE_MOTOR]!;
    expect(dev).toMatchObject({ x: A4_GRILLE_MOTOR_AT.x, z: A4_GRILLE_MOTOR_AT.z });
    expect(inBox([101, 19.6, 104, 24], dev.x, dev.z)).toBe(true);
    expect(hyp2(dev.x - 102.5, dev.z - 24)).toBeLessThan(2.0);
    // 0.55 m in front of it (west, in the passage) a body stands clear
    expect(blockedAt(dev.x - 0.55, dev.z, MOVEMENT.radius)).toEqual([]);
    // the passage is open floor under the grille (the leaf is the only closure)
    expect(blockedAt(102.5, 24.0, MOVEMENT.radius, []).filter((p) => bottom(p) < 1.7)).toEqual([]);
  });

  it('g-a4-grille-motor is a lever (the button as its switch, the grille as its door): it latches; g-a4-grille is the egress gate on the same door; nothing holds, times or reads mains', () => {
    expect(lever).toEqual({ kind: 'lever', id: A4_GRILLE_MOTOR_GATE, switchId: A4_GRILLE_MOTOR, doorId: A4_GRILLE_DOOR });
    expect(egress).toEqual({ kind: 'egress', id: A4_GRILLE_GATE, switchId: A4_GRILLE_MOTOR, doorIds: [A4_GRILLE_DOOR] });
    for (const g of part.bay.gates) if (g.id.startsWith('g-a4-grille')) expect(['lever', 'flag', 'egress'], g.id).toContain(g.kind);
    expect(part.bay.gates.some((g) => (g.kind === 'hold' || g.kind === 'timedHold' || g.kind === 'mains') && (g.doorId === A4_GRILLE_DOOR))).toBe(false);
  });

  it('as station 9 goes live the base opens the stand-in (the grille unlocks) and keeps it open through a retry; the button opens the grille too', () => {
    const s = runAt([102.5, 14], [103.5, 14]);
    expect(s.station()).toBe(9);
    expect(s.isGateOpen(A4_GRILLE_MOTOR_GATE)).toBe(true);
    expect(s.locked(A4_GRILLE_DOOR)).toBe(false);
    expect(s.retryStation('seen')).toBe(true);
    s.update(1 / 60);
    expect(s.station()).toBe(9);
    expect(s.isGateOpen(A4_GRILLE_MOTOR_GATE)).toBe(true);
    expect(s.locked(A4_GRILLE_DOOR)).toBe(false);
    // the button on its own (nobody opened a stand-in): the egress gate opens the door and stays open
    const g = new CourseState(def, course.consoles);
    g.startAt(4);
    g.setPlayer(0, 102.5, 0, 14, false);
    g.setPlayer(1, 103.5, 0, 14, false);
    g.update(1 / 60);
    expect(g.press(A4_GRILLE_MOTOR, 0)).toBeNull();
    g.update(1 / 60);
    expect(g.isGateOpen(A4_GRILLE_GATE)).toBe(true);
    expect(g.locked(A4_GRILLE_DOOR)).toBe(false);
    run(g, 20);
    expect(g.locked(A4_GRILLE_DOOR)).toBe(false);
  });

  it('station 9 is done under the grille: the a4-grille zone [98.5, 24.3, 104.5, 27.2] needs both players, floor 0; it runs before the console press, never inside the loop', () => {
    const z = part.passZones.find((q) => q.flag === A4_GRILLE_FLAG)!;
    expect(z).toEqual({ id: 'a4-p-grille', box: [98.5, 24.3, 104.5, 27.2], flag: 'a4-grille', floorY: 0 });
    expect(A4_GRILLE_ZONE).toEqual([98.5, 24.3, 104.5, 27.2]);
    expect(z.any).toBeUndefined();
    expect(z.hall).toBeUndefined();
    expect(part.externalFlags).toEqual(expect.arrayContaining([A4_GRILLE_FLAG, A4_WICKET_FLAG]));
    // the zone is the back aisle's east part, on the route, not in the closed west part
    expect(inBox([95, 24.25, 108, 27.3], 98.5, 24.3) && inBox([95, 24.25, 108, 27.3], 104.5, 27.2)).toBe(true);
    // (the pass zone itself runs in `CtDevices`: both players inside sets the flag, the station then moves on)
    for (const [x, z] of [[100, 25.5], [103, 25.5]] as const) expect(blockedAt(x, z)).toEqual([]);
    const s = runAt([100, 25.5], [103, 25.5]);
    expect(s.station()).toBe(9);
    s.setFlag(A4_GRILLE_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(8);
    expect(s.hasShared(A4_LOOP_FLAG)).toBe(false);
  });
});

describe('Marlow re-plan A4: station 8, the camera loop, and station 10, the synced takedown', () => {
  it('the console is as built (60 s loop, re-arm 20 s, the officer down first, the shared pickup gate on the cameras\' flag); the pair window and the loop window are the set\'s tick', () => {
    expect(part.consoles).toEqual([{ id: A4_CONSOLE, guard: A4_OFFICER, flag: A4_LOOP_FLAG, seconds: 60, rearm: 20 }]);
    expect(part.bay.gates.find((g) => g.id === A4_GATE)).toMatchObject({ kind: 'pickup', id: A4_GATE, switchId: A4_CONSOLE, flag: A4_LOOP_FLAG, perPlayer: false });
    expect(part.cameras.map((c) => c.id)).toEqual([...A4_CAMERAS]);
    // (marlow-play B2) C1 and C2 on the loop flag; C3 on station 9's done flag (off for the rest of the set)
    for (const c of part.cameras) expect(c.offFlag, c.id).toBe(c.id === 'cam-a4-c3' ? A4_GRILLE_FLAG : A4_LOOP_FLAG);
    expect(part.bay.gates.find((g) => g.id === A4_WICKET_GATE)).toBeDefined();
    expect(SHEET[1]!.drillS).toBe(60);
    expect(SHEET[2]!.drillS).toBe(1.5);
  });

  it('the wicket pass zone a4-wicket [76.3, 33, 78, 36] needs both players at floor 0; a4-west is the built one; the three zones are the route\'s', () => {
    const z = part.passZones.find((q) => q.flag === A4_WICKET_FLAG)!;
    expect(z).toEqual({ id: 'a4-p-wicket', box: [76.3, 33, 78, 36], flag: 'a4-wicket', floorY: 0 });
    expect(A4_WICKET_ZONE).toEqual([76.3, 33, 78, 36]);
    expect(z.any).toBeUndefined();
    expect(part.passZones.map((q) => q.flag)).toEqual([A4_WEST_FLAG, A4_GRILLE_FLAG, A4_WICKET_FLAG]);
    expect(part.passZones.find((q) => q.flag === A4_WEST_FLAG)!.box).toEqual(A4_WEST_ZONE);
    // the zone is the dock's west wall strip at the push bar: clear floor at its middle, inside the dock and the set
    expect(blockedAt(77.5, 34.5)).toEqual([]);
    expect(inBox(A4_WICKET_ZONE as unknown as [number, number, number, number], 77.5, 34.5)).toBe(true);
    expect(part.devices['a4-pushbar']!.x).toBeLessThan(A4_WICKET_ZONE[0] + 0.5);
    const s = runAt([77, 34], [77.5, 35]);
    s.setFlag(A4_GRILLE_FLAG);
    s.setFlag(A4_WEST_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(10);
    s.setFlag(A4_WICKET_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(0);
  });
});

describe('Marlow re-plan A4: the cameras', () => {
  const cams = Object.fromEntries(part.cameras.map((c) => [c.id, c])) as Record<string, CameraDevice>;
  const HEADS = [MOVEMENT.crouchHeight - 0.1, 1.6];
  const inView = (c: CameraDevice, yaw: number, x: number, y: number, z: number): boolean => inFrame(yaw, c.at[0], c.y, c.at[1], x, y, z, camPitch(c), camRange(c));
  /** The yaws (rad) a camera's frame sweeps through, every 2.5 degrees of its sweep (a fixed camera: its facing). */
  const yawsOf = (c: CameraDevice): number[] => {
    if (!c.sweep) return [(c.facing * Math.PI) / 180];
    const out: number[] = [];
    for (let d = Math.min(...c.sweep); d <= Math.max(...c.sweep) + 1e-9; d += 2.5) out.push((d * Math.PI) / 180);
    out.push((Math.max(...c.sweep) * Math.PI) / 180);
    return out;
  };
  const seenAny = (c: CameraDevice, x: number, z: number): boolean => yawsOf(c).some((yaw) => HEADS.some((y) => inView(c, yaw, x, y, z)));
  const fromLens = (c: CameraDevice, x: number, z: number, y = 1.6): number => hyp3(x - c.at[0], y - c.y, z - c.at[1]);

  it("station 9's ground (the a4-grille zone and the back aisle's east part) is out of C2's 14 m, and out of every camera's frame", () => {
    const c2 = cams['cam-a4-c2']!;
    expect(camRange(c2)).toBe(14);
    const [x0, z0, x1, z1] = A4_GRILLE_ZONE;
    for (let x = x0; x <= x1 + 1e-9; x += 0.25) for (let z = z0; z <= z1 + 1e-9; z += 0.25) for (const y of [0.3, ...HEADS]) expect(fromLens(c2, x, z, y), `(${x}, ${z}) at ${y}`).toBeGreaterThan(camRange(c2));
    for (const [x, z] of [[95, 27.3], [96.75, 27.3], [102.5, 24.3], [107.9, 25.8]] as const) expect(fromLens(c2, x, z, 1.6), `(${x}, ${z})`).toBeGreaterThan(camRange(c2));
    for (const c of Object.values(cams)) for (let x = 95; x <= 108; x += 0.5) for (let z = 24.3; z <= 27.3; z += 0.5) expect(seenAny(c, x, z), `${c.id} (${x}, ${z})`).toBe(false);
    // teeth: the cross aisle's far end is inside C2's range and frame
    expect(seenAny(c2, 96.75, 36)).toBe(true);
  });

  it('station 10\'s marks (the crouch spots behind both stacks) are outside C3\'s frame at every angle it holds; the built C3 swept 70-110 and had both in it', () => {
    const c3 = cams['cam-a4-c3']!;
    expect(c3.sweep).toBeUndefined();
    expect(c3.facing).toBe(A4_C3_FACING);
    expect(c3.at).toEqual([76.4, 33.0]);
    expect(c3.range).toBe(14);
    // (marlow-play B2) off for good once station 9 is done: past the 60 s loop it saw every takedown at the desk, and 10's retry
    // never re-runs the loop; the console's flag alone leaves it on, `a4-grille` (a shared flag) switches it off
    expect(c3.offFlag).toBe(A4_GRILLE_FLAG);
    expect(cameraOff(c3, (f) => f === A4_LOOP_FLAG)).toBe(false);
    const s = runAt([102, 25], [103, 25]);
    s.setFlag(A4_GRILLE_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(8);
    expect(cameraOff(c3, (f) => s.hasShared(f))).toBe(true);
    for (const id of ['cam-a4-c1', 'cam-a4-c2']) expect(cameraOff(cams[id]!, (f) => s.hasShared(f)), id).toBe(false);
    for (const m of SHEET[2]!.marks) for (const y of HEADS) expect(inView(c3, (c3.facing * Math.PI) / 180, m.x, y, m.z), `mark (${m.x}, ${m.z}) at ${y}`).toBe(false);
    // the spots the built set named (feet 0.3 m off each stack's far face) are out too
    for (const [x, z] of [[80.4, 36.2], [79.6, 29.8]] as const) expect(seenAny(c3, x, z), `spot (${x}, ${z})`).toBe(false);
    // teeth: the built C3 (sweep 70-110) had each mark in its frame at an end of the sweep
    const old = plainPart.cameras.find((c) => c.id === 'cam-a4-c3')!;
    expect(old.sweep).toEqual([70, 110]);
    for (const m of SHEET[2]!.marks) expect(seenAny(old, m.x, m.z), `built C3 sees (${m.x}, ${m.z})`).toBe(true);
    // C3's frame still holds the loaders' desk at both posts (it is off by then: B2)
    for (const [x, z] of [[A4_D1.x, A4_D1.z], [A4_D2.x, A4_D2.z]] as const) expect(inView(c3, (c3.facing * Math.PI) / 180, x, 1.6, z), `loader at (${x}, ${z})`).toBe(true);
    // C1 and C2 are the built cameras
    for (const id of ['cam-a4-c1', 'cam-a4-c2']) expect(cams[id]).toEqual(plainPart.cameras.find((c) => c.id === id));
  });
});

describe('Marlow re-plan A4: the lamps (Q2)', () => {
  const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && box.some((bx) => inBox(bx, l.x, l.z)) && l.group >= 40 && l.group <= 49);
  const row = (g: number) => MARLOW_CIRCUITS_REPLAN.find((c) => c.group === g)!;

  it('group 49 (the back aisle) has three strips over the back aisle and group 44 (the dispatch office) one ceiling panel, each on its own circuit; A4 is at its 24 lamps', () => {
    const g49 = lamps.filter((l) => l.group === 49);
    const g44 = lamps.filter((l) => l.group === 44);
    expect(g49).toHaveLength(3);
    expect(g44).toHaveLength(1);
    expect(row(49).lamps).toBe(3);
    expect(row(44).lamps).toBe(1);
    expect(row(49).kind).toBe('switch');
    expect(row(44).kind).toBe('switch');
    for (const l of g49) {
      expect(inBox([95, 24.25, 108, 27.3], l.x, l.z), `strip at ${l.x}`).toBe(true);
      expect(l.electric && l.destructible).toBe(true);
    }
    expect(g49.map((l) => l.x).sort((a, c) => a - c)).toEqual([...A4_BULK_STRIPS]);
    expect(g49.every((l) => Math.abs(l.intensity - A4_BULK.intensity) < 1e-9)).toBe(true);
    expect(inBox([A4_OFFICE.x0, A4_OFFICE.z0, A4_OFFICE.x1, A4_OFFICE.z1], g44[0]!.x, g44[0]!.z)).toBe(true);
    expect(g44[0]!.y).toBeLessThan(2.9);
    expect([g44[0]!.x, g44[0]!.z]).toEqual([A4_DISPATCH_PANEL.x, A4_DISPATCH_PANEL.z]);
    // every A4 lamp (set box, circuits 40-49) counts: 24, the per-set budget
    expect(lamps).toHaveLength(24);
    expect(MARLOW_LAMP_BUDGET.perSet).toBe(24);
    expect(MARLOW_CIRCUITS_REPLAN.filter((c) => c.room === 'A4').reduce((n, c) => n + c.lamps, 0)).toBe(24);
    expect(part.groups['a4-bulk']).toBe(49);
    expect(part.groups['a4-dispatch']).toBe(44);
  });

  it('the two switches are in the part and within 1 m of the circuit table\'s spots; the bulk switch is on the open back aisle, reachable from the route, out of every camera', () => {
    const sw = (id: string) => part.switches.find((s) => s.id === id)!;
    for (const [id, g] of [['a4-sw-bulk', 49], ['a4-sw-dispatch', 44]] as const) {
      const s = sw(id);
      expect(s.group, id).toBe(g);
      const spot = row(g).switches.find((q) => q.id === id)!;
      expect(hyp2(s.pos.x - spot.x, s.pos.z - spot.z), id).toBeLessThan(1);
    }
    expect(sw('a4-sw-bulk').pos).toMatchObject({ x: A4_SW_BULK.x, z: A4_SW_BULK.z });
    expect(sw('a4-sw-dispatch').pos).toMatchObject({ x: A4_SW_DISPATCH.x, z: A4_SW_DISPATCH.z });
    const spot = row(49).switches.find((q) => q.id === 'a4-sw-bulk')!;
    expect([spot.x, spot.z]).toEqual([99.0, 24.3]);
    expect(inBox([95, 24.25, 108, 27.3], spot.x, spot.z + 0.1)).toBe(true);
    expect(spot.by).toMatch(/back aisle/);
    // the old spot (76.3, 25.8) sat west of the closed part of the aisle: on the nav it is not reachable from the route
    const r = reach(setNav([A4_OFFICE_DOOR, L4_EAST_DOOR]));
    const near = (x: number, z: number, m: number): boolean => r.cells.some(([cx, cz]) => hyp2(cx - x, cz - z) <= m);
    expect(near(spot.x, spot.z, 1.2)).toBe(true);
    expect(hyp2(76.3 - 99, 25.8 - 24.3)).toBeGreaterThan(20);
    // out of every camera's range
    for (const c of part.cameras) expect(hyp3(spot.x - c.at[0], 1.2 - c.y, spot.z - c.at[1]), c.id).toBeGreaterThan(camRange(c));
    // the office switch is inside the office, east of the door, on the pier
    expect(inBox([A4_OFFICE.x0, A4_OFFICE.z0, A4_OFFICE.x1, A4_OFFICE.z1 + 0.5], A4_SW_DISPATCH.x, A4_SW_DISPATCH.z)).toBe(true);
    expect(A4_SW_DISPATCH.x).toBeGreaterThan(78.9);
  });

  it('the light spots: the back aisle and the office are lit now (a read spot each, a cut spot with the circuit off); the kettle\'s dark spots are gone', () => {
    const spots = part.lightSpots;
    const by = (n: string) => spots.find((s) => s.name === n)!;
    expect(by('A4 back aisle lit')).toMatchObject({ band: 'read' });
    expect(by('A4 back aisle cut')).toMatchObject({ band: 'cut', off: [49] });
    expect(by('A4 dispatch office')).toMatchObject({ band: 'read' });
    expect(by('A4 dispatch office cut')).toMatchObject({ band: 'cut', off: [44] });
    expect(by('A4 mouth').band).toBe('read');
    expect(by('A4 crossing').band).toBe('read');
    expect(spots.some((s) => /kettle/i.test(s.name))).toBe(false);
    // the west part of the aisle stays a pocket (no lamp reaches it)
    expect(by('A4 back aisle').band).toBe('pocket');
    expect(by('A4 back aisle west end').band).toBe('pocket');
    expect(new Set(spots.map((s) => s.name)).size).toBe(spots.length);
  });
});

describe('Marlow re-plan A4: the steps and the lines', () => {
  const steps = def.objectives!.filter((o) => o.bay === 'A4');

  it('four steps in play order: the grille (9), the loop and the crossing (8), the takedown (10), the holding-room line; what and where, no fail', () => {
    expect(steps.map((o) => o.id)).toEqual(['a4-s9', 'a4-s8', 'a4-s10', 'a4-lock']);
    expect(steps[0]!.done).toEqual({ flag: A4_GRILLE_FLAG });
    expect(steps[1]!.done).toEqual({ flag: A4_WEST_FLAG });
    expect(steps[2]!.done).toEqual({ flag: A4_WICKET_FLAG });
    expect(steps[3]!.done).toBeUndefined();
    expect(steps[0]!.text).toMatch(/grille/);
    expect(steps[1]!.b).toMatch(/console/);
    expect(steps[1]!.text).toMatch(/dock/);
    expect(steps[1]!.timer).toBe(A4_GATE);
    expect(steps[2]!.text).toMatch(/loaders/);
    expect(steps[2]!.a).toBeDefined();
    expect(steps[2]!.b).toBeDefined();
    // (marlow-play C7) the job lines are all the HUD shows: 8's name the run to the dock (the HUD adds the 60 s), 10's the loader by
    // position (A's mark north, B's south)
    for (const t of [steps[1]!.a!, steps[1]!.b!]) expect(t).toMatch(/then run to the dock/);
    expect(steps[2]!.a).toMatch(/north loader/);
    expect(steps[2]!.b).toMatch(/south loader/);
    expect(SHEET[2]!.marks[0]!.z).toBeGreaterThan(SHEET[2]!.marks[1]!.z);
    for (const t of [steps[2]!.a!, steps[2]!.b!]) expect(t).toMatch(/^Count down with your partner and take the (north|south) loader.$/);
    expect(steps[3]!.text).toMatch(/holding room four/);
    for (const o of steps) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(/[–—]/.test(t), t).toBe(false);
        expect(t, t).not.toMatch(/fail|send|kettle|start again/i);
      }
      expect(o.id.length).toBeLessThanOrEqual(OBJECTIVE_ID_MAX);
    }
  });

  it("LANTERN's retry lines exist (STATIONS section 6, verbatim, keyed `retry:<id>` and `retry:<id>:timer`) and fit; none says failed or names the kettle", () => {
    const at = (k: string) => part.bay.radio.filter((r) => r.at === k).map((r) => r.text);
    expect(at(retryKey('a4-deadweight'))).toEqual(['The duty officer saw you. Back to the security room door.']);
    expect(at(retryKey('a4-camloop'))).toEqual(['Seen on the shop floor. Back to the security room.']);
    expect(at(retryKey('a4-camloop', true))).toEqual(['The cameras came back. Back to the security room.']);
    expect(at(retryKey('a4-takedown'))).toEqual(['The loaders saw you. Back behind the pallet stacks at the dock.']);
    expect(at(retryKey('a4-takedown', true))).toEqual(['Not together, so the other loader saw. Back behind the stacks.']);
    expect(at(retryKey('a4-deadweight', true))).toEqual([]);
    expect(A4_RETRY_LINES.map((r) => r.at)).toEqual(['retry:a4-deadweight', 'retry:a4-camloop', 'retry:a4-camloop:timer', 'retry:a4-takedown', 'retry:a4-takedown:timer']);
    for (const r of part.bay.radio) {
      expect(r.text.length, r.text).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(r.text), r.text).toBe(false);
      expect(r.text, r.text).not.toMatch(/failed|kettle/i);
    }
    // the built lines stay: the bay's welcome and the console's two
    expect(at('enter').length).toBeGreaterThan(0);
    expect(at(A4_GATE)).toEqual(['Cameras looped. Go.']);
  });

  it("the e2e walk's step-line patterns match both job lines of stations 8 and 10 (the HUD shows the player's own job line, `stepLine`)", () => {
    const src = readFileSync('scripts/e2e-ctcourse/replan/a4GoodsShed.mjs', 'utf8');
    const pat = (name: string): RegExp => {
      const m = new RegExp(`export const ${name} = /(.+)/;`).exec(src);
      expect(m, name).not.toBeNull();
      return new RegExp(m![1]!);
    };
    for (const [i, name] of [[1, 'S8_LINE'], [2, 'S10_LINE']] as const) {
      const re = pat(name);
      const o = steps[i]!;
      for (const t of [o.a, o.b]) {
        expect(t, o.id).toBeDefined();
        expect(t!, o.id).toMatch(re);
      }
    }
  });
});

/** Advance the course by `sec` seconds of fixed steps. */
function run(s: CourseState, sec: number): void {
  for (let t = 0; t < sec - 1e-9; t += 1 / 60) s.update(1 / 60);
}
