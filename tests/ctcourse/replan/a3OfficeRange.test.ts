/**
 * Marlow re-plan, A3 the Office Range (J14 slice G-A3; PLAN section 2, STATIONS.md sections 3, 5, 6, 8, 9): the set on
 * `ctcourseReplan`. Pins: the re-plan's collision (`GREY`), the contract, no guard (the cleaner gone), stations 6-7 as
 * STATIONS section 3 has them with standing room at their marks, the riser cupboard and the sealed services crawl with its
 * one-way duct, the fire door bolted from the corridor side, the offices locked for good, on the nav (a crouched player's
 * grid) the crawl the only way from the west lobby to the corridor with every gate shut and the fire door a way once open,
 * the crawl's exit and the fire door out of the camera's 14 m and its frame, no pass zone with the send-back, the station
 * flow and the retry, the objective, radio and retry lines. The built A3 is `tests/ctcourse/a3OfficeRange.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { NavGrid, type NavBlocker } from '../../../src/ai/navGrid';
import { COURSE_TEXT_MAX } from '../../../src/config/course';
import { MOVEMENT } from '../../../src/config/movement';
import { hyp2, hyp3 } from '../../../src/core/mathx';
import { layoutKnownIds, retryKey, validateCourse } from '../../../src/game/course/courseDef';
import { CourseState, REFUSE_BOLT } from '../../../src/game/course/courseState';
import type { StationDef } from '../../../src/game/course/stationDef';
import { pickJamTarget, type JamTarget } from '../../../src/game/jammer';
import { camPitch, camRange, inFrame } from '../../../src/security/camera';
import type { Duct } from '../../../src/world/anchors';
import { LevelBuilder, type BoxPiece } from '../../../src/world/levelBuilder';
import { buildCtcourse } from '../../../src/world/maps/ctcourse';
import { A3_CAMERA, A3_CAMERA_RANGE, A3_CLEANER, A3_DOOR_LOBBY, A3_FAR_FLAG, A3_FAR_ZONE, A3_HALL } from '../../../src/world/maps/ctcourseSets/a3OfficeRange';
import {
  A3_CRAWL,
  A3_DUCT_IN,
  A3_DUCT_OUT,
  A3_FIRE,
  A3_FIRE_DOOR,
  A3_FIRE_FLAG,
  A3_FIRE_GATE,
  A3_FIRE_ZONE,
  A3_GRILLE,
  A3_NEVER_FLAG,
  A3_OFFICE_DOORS,
  A3_OFFICE_RANGE_STATIONS,
  A3_RETRY_LINES,
  A3_RISER,
  officeGate,
} from '../../../src/world/maps/ctcourseSets/replan/a3OfficeRange';
import { checkSetPart, inBox, OBJECTIVE_ID_MAX, registerSum, SET_BOX } from '../../../src/world/maps/ctcourseSets/types';

const b = new LevelBuilder();
const built = buildCtcourse(b, { replan: true });
const part = built.parts[2]!;
const course = built.layout.course!;
const def = course.def;
const range = built.ranges.a3OfficeRange;
const mine = b.boxes.slice(range.boxes[0], range.boxes[1]);
const box = SET_BOX.a3OfficeRange[0]!;
/** The set's collision on the re-plan: the built set's less the pieces the crawl passes, plus the cupboard, the crawl, the
 *  re-cut walls, the fire door's wall and the trimmed run; the built 14 lamps; six doors (the fire door); one anchor (the duct). */
const GREY = { solids: 45, checksum: 6721.495796326795, lights: 14, doors: 6, anchors: 1 };
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
const cam = part.cameras[0]!;
const doorAnchor = (cid: string) => b.anchors.doors.find((d) => d.id === course.doors[cid])!;
/** A course door's shut leaf as a thin box (sight and bodies stop on it). */
const leafOf = (cid: string): BoxPiece => {
  const d = doorAnchor(cid);
  const ex = d.hinge.x + Math.sin(d.yaw) * d.width;
  const ez = d.hinge.z + Math.cos(d.yaw) * d.width;
  return { c: [(d.hinge.x + ex) / 2, d.height / 2, (d.hinge.z + ez) / 2], s: [Math.max(Math.abs(ex - d.hinge.x), 0.06), d.height, Math.max(Math.abs(ez - d.hinge.z), 0.06)], yaw: 0, pitch: 0, color: '#000', collide: true, visible: true };
};
/** Every course door in the set (the offices' five and the fire door), shut. */
const A3_DOORS = [...A3_OFFICE_DOORS, A3_FIRE_DOOR];
const leaves = A3_DOORS.map(leafOf);
/** The solid boxes (shut leaves too) in a body's band (feet to `hgt`) within `r` of (x, z). */
const blockedAt = (x: number, z: number, r = MOVEMENT.radius, hgt = 1.7): BoxPiece[] =>
  [...solid, ...leaves].filter((p) => bottom(p) < hgt && top(p) > 0.15).filter((p) => hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r);
/** Does a solid box overlap the open box [x0, x1] x [y0, y1] x [z0, z1] (a hair of slack)? */
const overlaps = (p: BoxPiece, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): boolean =>
  p.c[0] - p.s[0] / 2 < x1 - 1e-6 && p.c[0] + p.s[0] / 2 > x0 + 1e-6 && bottom(p) < y1 - 1e-6 && top(p) > y0 + 1e-6 && p.c[2] - p.s[2] / 2 < z1 - 1e-6 && p.c[2] + p.s[2] / 2 > z0 + 1e-6;
/** The crawl's two legs, clear inside: [x0, x1, z0, z1]. */
const LEG1 = [A3_RISER.x1, A3_CRAWL.leg1.x1, A3_CRAWL.leg1.z0, A3_CRAWL.leg1.z1] as const;
const LEG2 = [A3_CRAWL.leg2.x0, A3_CRAWL.leg2.x1, A3_CRAWL.leg1.z0, A3_CRAWL.leg2.z1] as const;
/** The cupboard's clear inside (behind its 0.1 m front panel). */
const RISER_IN = [A3_RISER.x0, A3_RISER.x1, A3_RISER.z0, A3_RISER.z1 - A3_RISER.front] as const;

/**
 * A nav grid over the set the way the game builds one (`NavGrid`, flat floor), cell 0.25, a player's radius. `crouch`: a
 * crouched player's (blockers whose underside is over the crouch height pass over him: the crawl's lid, the cupboard's body),
 * else a guard's 1.6 m body (every solid not overhead). `shut`: the course doors whose leaves stand shut; `plug`: extra boxes.
 */
function setNav(crouch: boolean, shut: readonly string[], plug: readonly BoxPiece[] = []): NavGrid {
  const pieces = [...solid.filter((p) => !p.overhead), ...shut.map(leafOf), ...plug];
  const blockers: NavBlocker[] = pieces
    .filter((p) => p.c[0] + p.s[0] / 2 > 75 && p.c[0] - p.s[0] / 2 < 101 && p.c[2] + p.s[2] / 2 > -1 && p.c[2] - p.s[2] / 2 < 14)
    .filter((p) => !crouch || bottom(p) < MOVEMENT.crouchHeight)
    .map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: 0, bottom: bottom(p), top: top(p) }));
  return new NavGrid({ minX: 76, maxX: 100, minZ: 0, maxZ: 13, cell: 0.25, agentRadius: MOVEMENT.radius, stepHeight: 0.45, blockers, sample: () => ({ h: 0, ok: true }) });
}
const solidBox = (x0: number, x1: number, z0: number, z1: number, y1 = 3): BoxPiece => ({ c: [(x0 + x1) / 2, y1 / 2, (z0 + z1) / 2], s: [x1 - x0, y1, z1 - z0], yaw: 0, pitch: 0, color: '#000', collide: true, visible: true });
/** A plug filling leg 2 (the crawl shut for the check's teeth). */
const PLUG = solidBox(LEG2[0], LEG2[1], 3, 6);
const WEST: [number, number] = [77.8, 6.0];
const CORRIDOR: [number, number] = [85.0, 10.75];
const EAST: [number, number] = [98.5, 6.0];
const path = (nav: NavGrid, a: [number, number], c: [number, number]) => nav.findPath(a, c, 1e6);

/** The camera's sweep, its pitch and range (the built test's frame), and whether a head at (x, y, z) is in its frame. */
const SWEEP_YAWS = [262, 265, 268, 270, 272, 275, 278].map((d) => (d * Math.PI) / 180);
const pitch = camPitch(cam);
const camR = camRange(cam);
const inSweep = (x: number, y: number, z: number): boolean => SWEEP_YAWS.some((yaw) => inFrame(yaw, cam.at[0], cam.y, cam.at[1], x, y, z, pitch, camR));
const HEADS = [MOVEMENT.crouchHeight - 0.1, 1.6];
const fromLens = (x: number, z: number, y = 1.6): number => hyp3(x - cam.at[0], y - cam.y, z - cam.at[1]);

/** A fresh course at set 3 with the two players at the given feet. */
function runAt(a: [number, number], c: [number, number]): CourseState {
  const s = new CourseState(def, course.consoles);
  s.startAt(3);
  s.setPlayer(0, a[0], 0, a[1], false);
  s.setPlayer(1, c[0], 0, c[1], false);
  s.update(1 / 60);
  return s;
}

describe('Marlow re-plan A3 the Office Range (G-A3): the part', () => {
  it('passes the set-part contract; the re-plan course validates; every register row is an A3 row and counts the builder', () => {
    expect(part.id).toBe('a3OfficeRange');
    expect(checkSetPart(part)).toEqual([]);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
    expect(part.register.every((r) => r.id.startsWith('A3-'))).toBe(true);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A3-R1', 'A3-R2', 'A3-R3', 'A3-R4', 'A3-R5', 'A3-R6']));
    expect(registerSum(part.register)).toEqual(built.counts.sets.a3OfficeRange);
    for (const r of part.register) expect(/[–—]/.test(r.element), r.id).toBe(false);
  });

  it('GREY: the re-plan\'s collision (solids, checksum), 14 lamps (no circuit change), six doors, one anchor (the duct)', () => {
    const mineSolid = mine.filter((p) => p.collide);
    let sum = 0;
    for (const p of mineSolid) sum += p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw;
    expect(mineSolid).toHaveLength(GREY.solids);
    expect(sum).toBeCloseTo(GREY.checksum, 2);
    const c = built.counts.sets.a3OfficeRange;
    expect(c.lights).toBe(GREY.lights);
    expect(c.doors).toBe(GREY.doors);
    expect(c.anchors).toBe(GREY.anchors);
    // the built yard: five doors, no anchor, the same lamps (its own GREY is the built test's)
    const plain = buildCtcourse(new LevelBuilder());
    expect(plain.counts.sets.a3OfficeRange).toMatchObject({ lights: 14, doors: 5, anchors: 0 });
    expect(plain.parts[2]!.bay.stations).toBeUndefined();
  });

  it('everything built lies inside the set box (0.3 m of wall slack) and under the 3.0 m slab; every collidable piece the re-plan adds is noLedge', () => {
    const [x0, z0, x1, z1] = box;
    for (const p of mine.filter((q) => Math.abs(q.yaw) < 1e-3 && Math.abs(q.pitch) < 1e-3)) {
      expect(p.c[0] - p.s[0] / 2).toBeGreaterThanOrEqual(x0 - 0.3);
      expect(p.c[0] + p.s[0] / 2).toBeLessThanOrEqual(x1 + 0.3);
      expect(p.c[2] - p.s[2] / 2).toBeGreaterThanOrEqual(z0 - 0.3);
      expect(p.c[2] + p.s[2] / 2).toBeLessThanOrEqual(z1 + 0.3);
    }
    expect(Math.max(...mine.filter((p) => p.collide && !p.overhead).map(top))).toBeLessThanOrEqual(3.0 + 1e-6);
    for (const p of mine.filter((q) => q.collide && top(q) >= 1.5)) expect(p.noLedge, `box at (${p.c.join(', ')})`).toBe(true);
  });

  it('no guard: the cleaner is gone from the squad and the slots (route and objective with him); the bay is unrated; the camera is as built', () => {
    expect(part.bay.squad).toEqual([]);
    expect(part.squads[A3_CLEANER]).toBeUndefined();
    expect(Object.keys(part.squads)).toEqual([]);
    expect(def.bays[2]!.squad).toEqual([]);
    expect(def.bays[2]!.rated).toBe(false);
    for (const o of def.objectives!.filter((q) => q.bay === 'A3')) for (const t of [o.text, o.a, o.b]) if (t) expect(t).not.toMatch(/cleaner/i);
    // cam-a3-hall: IR, 14 m, armoured on the map, no guard response (the built training camera's), the set's whole budget
    expect(part.cameras.map((c) => c.id)).toEqual([A3_CAMERA]);
    expect(cam.range).toBe(A3_CAMERA_RANGE);
    expect(cam.range).toBe(14);
    expect(cam.guardResponse).toBe(false);
    const dev = built.layout.security!.devices.find((d) => d.id === A3_CAMERA) as { bulletproof?: boolean } | undefined;
    expect(dev?.bulletproof).toBe(true);
  });

  it('the bay keeps its role claim: B is the first player into the corridor box', () => {
    expect(part.bay.roles).toEqual([{ role: 'b', zone: { box: [...A3_HALL.box], y1: 1 } }]);
  });
});

describe('Marlow re-plan A3: the stations (STATIONS.md section 3)', () => {
  const sheet: StationDef[] = [
    { n: 6, id: 'a3-vent', lesson: 'vent_unlock', retry: 'station', doneFlag: 'a3-fire',
      marks: [{ x: 77.5, z: 2.0, y: 0, yaw: Math.PI }, { x: 78.5, z: 10.5, y: 0, yaw: Math.PI / 2 }],
      guards: [], gates: ['g-a3-fire', 'cam-a3-hall'] },
    { n: 7, id: 'a3-jam', lesson: 'jam_relay', retry: 'station', doneFlag: 'a3-far',
      marks: [{ x: 80.0, z: 10.0, y: 0, yaw: Math.PI / 2 }, { x: 80.0, z: 11.5, y: 0, yaw: Math.PI / 2 }],
      guards: [], gates: ['cam-a3-hall'] },
  ];

  it('stations 6 and 7 are the sheet\'s A3 block, on the bay; neither has a drill window (SA6: the camera judges each hop)', () => {
    expect(part.bay.stations).toEqual(sheet);
    expect(A3_OFFICE_RANGE_STATIONS).toEqual(sheet);
    expect(def.bays[2]!.stations).toEqual(sheet);
    for (const s of sheet) expect(s.drillS).toBeUndefined();
  });

  it('the marks have standing room (a body of radius 0.3, shut doors included) on the floor inside the set; A stands 0.6 m in front of the cupboard\'s grille, facing it', () => {
    for (const s of sheet) {
      for (const m of s.marks) {
        expect(m.y).toBe(0);
        expect(blockedAt(m.x, m.z).map((p) => `(${p.c.join(', ')})`), `${s.id} (${m.x}, ${m.z})`).toEqual([]);
        expect(inBox(box, m.x, m.z)).toBe(true);
      }
    }
    const A = sheet[0]!.marks[0];
    expect(A.z - A3_RISER.z1).toBeCloseTo(0.6, 9);
    expect(A.x).toBeGreaterThan(A3_RISER.mouth[0]);
    expect(A.x).toBeLessThan(A3_RISER.mouth[1]);
    expect(hyp2(A.x - A3_DUCT_IN.pos.x, A.z - A3_DUCT_IN.pos.z)).toBeCloseTo(0.6, 9);
    // B waits at the fire door in the west lobby; station 7's marks are inside the fire door, in the corridor's west end
    expect(inBox([76.25, 0.25, 79.35, 12.75], sheet[0]!.marks[1].x, sheet[0]!.marks[1].z)).toBe(true);
    for (const m of sheet[1]!.marks) expect(inBox(A3_FIRE_ZONE, m.x, m.z)).toBe(true);
  });

  it('the stations advance on their done flags; a camera retry of station 7 keeps station 6 done; a station 6 retry rebolts the fire door', () => {
    const s = runAt([77.5, 2.0], [78.5, 10.5]);
    expect(s.station()).toBe(6);
    s.setFlag(A3_FIRE_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(7);
    expect(s.retryStation('seen')).toBe(true);
    s.update(1 / 60);
    expect(s.station()).toBe(7);
    expect(s.hasFlag(A3_FIRE_FLAG)).toBe(true);
    expect(s.lastRetry?.st).toBe(7);
    s.setFlag(A3_FAR_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(0);
    expect(s.isStepDone('a3-vent')).toBe(true);
    expect(s.isStepDone('a3-jam')).toBe(true);
    // station 6: the crawler (corridor side) opens the fire door; a camera retry shuts it again
    const r = runAt([80.8, 9.75], [78.5, 10.5]);
    expect(r.press(A3_FIRE_DOOR, 0)).toBeNull();
    r.update(1 / 60);
    expect(r.locked(A3_FIRE_DOOR)).toBe(false);
    expect(r.retryStation('seen')).toBe(true);
    r.update(1 / 60);
    expect(r.station()).toBe(6);
    expect(r.locked(A3_FIRE_DOOR)).toBe(true);
  });
});

describe('Marlow re-plan A3: the riser cupboard and the services crawl', () => {
  const ducts = b.anchors.ducts.filter((d) => inBox(box, d.entry.pos.x, d.entry.pos.z));
  const duct = ducts[0] as Duct;

  it('the cupboard: x 76.25-78.75, z 0.25-1.4 to the slab, in the lobby\'s south-west corner; its north face has the crawl\'s 1.2 x 1.5 mouth and nothing else open', () => {
    expect([A3_RISER.x0, A3_RISER.x1, A3_RISER.z0, A3_RISER.z1]).toEqual([76.25, 78.75, 0.25, 1.4]);
    // the body over the crawl reaches the slab; the face is solid either side of the mouth and over it
    expect(solid.some((p) => overlaps(p, 76.3, 78.7, 2.9, 2.95, 0.3, 1.35))).toBe(true);
    for (const x of [76.5, 78.4]) expect(solid.some((p) => overlaps(p, x - 0.01, x + 0.01, 0.5, 0.6, 1.33, 1.37)), `face at x ${x}`).toBe(true);
    expect(A3_RISER.mouth[1] - A3_RISER.mouth[0]).toBeCloseTo(1.2, 9);
    expect(solid.some((p) => overlaps(p, A3_RISER.mouth[0], A3_RISER.mouth[1], 0, A3_CRAWL.h, A3_RISER.z1 - 0.2, A3_RISER.z1 + 0.5))).toBe(false);
  });

  it('the crawl is 1.2 wide x 1.5 high clear: nothing solid inside either leg or the cupboard below 1.5 m, a lid at 1.5 over both legs, a crouched body fits', () => {
    for (const [x0, x1, z0, z1] of [LEG1, LEG2, RISER_IN]) expect(solid.filter((p) => overlaps(p, x0, x1, 0, A3_CRAWL.h, z0, z1)).map((p) => `(${p.c.join(', ')})`)).toEqual([]);
    expect(LEG1[3] - LEG1[2]).toBeCloseTo(1.2, 9);
    expect(LEG2[1] - LEG2[0]).toBeCloseTo(1.2, 9);
    expect([LEG1[2], LEG1[3], LEG1[1], LEG2[0], LEG2[1]]).toEqual([0.25, 1.45, 81.4, 80.2, 81.4]);
    // the lid: a solid underside at 1.5 over every metre of both legs
    for (const [x, z] of [[79.0, 0.85], [79.5, 0.85], [80.0, 0.85], [80.8, 0.85], [80.8, 3.0], [80.8, 6.0], [80.8, 8.6]] as const) {
      const lid = solid.filter((p) => overlaps(p, x - 0.01, x + 0.01, A3_CRAWL.h, A3_CRAWL.h + 0.05, z - 0.01, z + 0.01));
      expect(lid.length, `lid at (${x}, ${z})`).toBeGreaterThan(0);
      expect(Math.min(...lid.map(bottom))).toBeCloseTo(A3_CRAWL.h, 6);
    }
    expect(MOVEMENT.crouchHeight).toBeLessThan(A3_CRAWL.h);
    expect(MOVEMENT.radius * 2).toBeLessThan(1.2);
  });

  it('sealed on every side: from inside the crawl a crouched player reaches the lobby only by the cupboard\'s mouth and the corridor only by the grille, never office 1', () => {
    const shut = A3_DOORS;
    const mouth = solidBox(A3_RISER.mouth[0], A3_RISER.mouth[1], A3_RISER.z1 - 0.1, A3_RISER.z1 + 0.1);
    const grille = solidBox(A3_GRILLE.x0, A3_GRILLE.x1, A3_GRILLE.z - 0.15, A3_GRILLE.z + 0.15);
    const inside: [number, number] = [80.8, 4.0];
    const open = setNav(true, shut);
    expect(path(open, inside, WEST)).not.toBeNull();
    expect(path(open, inside, CORRIDOR)).not.toBeNull();
    const closed = setNav(true, shut, [mouth, grille]);
    for (const [to, what] of [[WEST, 'the west lobby'], [CORRIDOR, 'the corridor'], [[83.0, 4.3], 'office 1'], [EAST, 'the east lobby']] as const) expect(path(closed, inside, [to[0], to[1]]), what).toBeNull();
    expect(path(closed, inside, [79.0, 0.85])).not.toBeNull();
  });

  it('one duct, one way (the master\'s vent pieces): in by a wall grate on the cupboard\'s north face, out by a wall grate in the corridor\'s south wall; about 12 m (graph duct)', () => {
    expect(ducts).toHaveLength(1);
    expect(duct.entry).toEqual(A3_DUCT_IN);
    expect(duct.exit).toEqual(A3_DUCT_OUT);
    expect(duct.entry).toMatchObject({ where: 'wall', nx: 0, nz: 1, pos: { x: 77.5, z: 1.4 } });
    expect(duct.exit).toMatchObject({ where: 'wall', nx: 0, nz: 1, pos: { x: 80.8, z: 9.0 } });
    expect(duct.grates).toEqual([]);
    let len = 0;
    for (let i = 1; i < duct.path.length; i++) len += hyp3(duct.path[i]!.x - duct.path[i - 1]!.x, duct.path[i]!.y - duct.path[i - 1]!.y, duct.path[i]!.z - duct.path[i - 1]!.z);
    expect(len).toBeGreaterThan(11);
    expect(len).toBeLessThan(13);
    // every path point is inside the clear crawl (the cupboard, leg 1 or leg 2) or the grille's opening, at the floor
    const inCrawl = (x: number, z: number): boolean =>
      [RISER_IN, LEG1, LEG2, [A3_GRILLE.x0, A3_GRILLE.x1, A3_GRILLE.z - 0.15 - MOVEMENT.radius, A3_GRILLE.face + MOVEMENT.radius] as const].some(([x0, x1, z0, z1]) => x > x0 + MOVEMENT.radius - 1e-9 && x < x1 - MOVEMENT.radius + 1e-9 && z > z0 + MOVEMENT.radius - 1e-9 && z <= z1 + 1e-9);
    for (const p of duct.path) {
      expect(p.y).toBe(0);
      expect(inCrawl(p.x, p.z), `(${p.x}, ${p.z})`).toBe(true);
    }
    // nobody comes back the other way: no duct starts at the corridor's grille
    expect(b.anchors.ducts.filter((d) => hyp2(d.entry.pos.x - A3_DUCT_OUT.pos.x, d.entry.pos.z - A3_DUCT_OUT.pos.z) < 1)).toEqual([]);
  });

  it('the crawl is player-only: on a guard\'s grid (a 1.6 m body) none of it is walkable', () => {
    const nav = setNav(false, []);
    for (const [x, z] of [[77.5, 0.85], [79.0, 0.85], [80.8, 0.85], [80.8, 4.0], [80.8, 8.5]] as const) expect(nav.isWalkable(nav.cellOf(x, z)), `(${x}, ${z})`).toBe(false);
    expect(nav.isWalkable(nav.cellOf(WEST[0], WEST[1]))).toBe(true);
  });
});

describe('Marlow re-plan A3: the fire door and the closed offices', () => {
  it('the fire door: 1.2 x 2.1 at x 79.5, z 10.15-11.35, built locked and unbreachable; the rest of the mouth (z 9-12.5) is wall to the slab', () => {
    const d = doorAnchor(A3_FIRE_DOOR);
    expect(d.hinge).toEqual({ x: 79.5, y: 0, z: 10.15 });
    expect(d.width).toBeCloseTo(1.2, 9);
    expect(d.height).toBeCloseTo(2.1, 9);
    expect(d.yaw).toBe(0);
    expect(d.locked).toBe(true);
    expect(d.breachable).toBe(false);
    expect((A3_FIRE.z0 + A3_FIRE.z1) / 2).toBeCloseTo(10.75, 9);
    for (const z of [9.1, 9.6, 10.0, 11.5, 12.0, 12.4]) expect(solid.some((p) => overlaps(p, 79.45, 79.55, 0.5, 2.9, z - 0.01, z + 0.01)), `wall at z ${z}`).toBe(true);
    for (const z of [10.3, 10.75, 11.2]) {
      expect(solid.some((p) => overlaps(p, 79.45, 79.55, 0.1, 2.05, z - 0.01, z + 0.01)), `door gap at z ${z}`).toBe(false);
      expect(solid.some((p) => overlaps(p, 79.45, 79.55, 2.15, 2.95, z - 0.01, z + 0.01)), `lintel at z ${z}`).toBe(true);
    }
  });

  it('g-a3-fire is a bolt on the corridor side: a press from the lobby is refused, the crawler\'s press from the corridor opens it', () => {
    const g = part.bay.gates.find((q) => q.id === A3_FIRE_GATE);
    expect(g).toEqual({ kind: 'bolt', id: A3_FIRE_GATE, doorId: A3_FIRE_DOOR, side: [1, 0], at: [79.5, 10.75] });
    const s = runAt([78.5, 10.5], [80.8, 9.75]);
    expect(s.locked(A3_FIRE_DOOR)).toBe(true);
    expect(s.press(A3_FIRE_DOOR, 0)).toBe(REFUSE_BOLT);
    s.update(1 / 60);
    expect(s.locked(A3_FIRE_DOOR)).toBe(true);
    expect(s.press(A3_FIRE_DOOR, 1)).toBeNull();
    s.update(1 / 60);
    expect(s.locked(A3_FIRE_DOOR)).toBe(false);
  });

  it('the offices are locked for good: each of the five doors built locked and unbreachable, held by a flag gate on a3-never that nothing sets', () => {
    expect(A3_OFFICE_DOORS).toEqual(['A3-office1', 'A3-comm1', 'A3-comm2', 'A3-recess', 'A3-office3']);
    for (const id of A3_OFFICE_DOORS) {
      const d = doorAnchor(id);
      expect(d.locked, id).toBe(true);
      expect(d.breachable, id).toBe(false);
      expect(part.bay.gates.find((g) => g.id === officeGate(id))).toEqual({ kind: 'flag', id: officeGate(id), flag: A3_NEVER_FLAG, doorId: id });
    }
    expect(officeGate(A3_DOOR_LOBBY)).toBe('g-a3-office1');
    expect(part.externalFlags).toContain(A3_NEVER_FLAG);
    expect(part.passZones.some((z) => z.flag === A3_NEVER_FLAG)).toBe(false);
    for (const g of def.bays.flatMap((x) => x.gates)) if (g.kind === 'pickup' || g.kind === 'pair') expect(g.flag).not.toBe(A3_NEVER_FLAG);
    // a whole run of the bay: every station done, every press tried from both sides, the offices stay shut
    const s = runAt([82.5, 9.6], [86, 9.6]);
    for (const id of A3_OFFICE_DOORS) {
      s.press(id, 0);
      s.press(id, 1);
    }
    s.setFlag(A3_FIRE_FLAG);
    s.setFlag(A3_FAR_FLAG);
    s.update(1);
    for (const id of A3_OFFICE_DOORS) expect(s.locked(id), id).toBe(true);
  });
});

describe('Marlow re-plan A3: on the nav, the crawl is the only way into the corridor', () => {
  it('every gate shut (the five office doors and the fire door): a crouched player walks from the west lobby to the corridor, through the crawl', () => {
    const nav = setNav(true, A3_DOORS);
    const p = path(nav, WEST, CORRIDOR);
    expect(p).not.toBeNull();
    expect(p!.some(([x, z]) => [LEG1, LEG2].some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1))).toBe(true);
    expect(path(nav, WEST, EAST)).not.toBeNull();
  });

  it('the check has teeth: with the crawl plugged (every gate shut) the west lobby reaches neither the corridor nor the east lobby, nor any office', () => {
    const nav = setNav(true, A3_DOORS, [PLUG]);
    expect(path(nav, WEST, CORRIDOR)).toBeNull();
    expect(path(nav, WEST, EAST)).toBeNull();
    for (const o of [[83.0, 4.3], [88.3, 4.3], [94.1, 4.3]] as const) expect(path(nav, WEST, [o[0], o[1]]), `office at ${o[0]}`).toBeNull();
  });

  it('with g-a3-fire open (its door open) both reach the corridor: the partner from the lobby through the fire door, the crawler out of the grille', () => {
    const nav = setNav(true, A3_OFFICE_DOORS, [PLUG]);
    const p = path(nav, WEST, CORRIDOR);
    expect(p).not.toBeNull();
    const out: [number, number] = [A3_DUCT_OUT.pos.x + A3_DUCT_OUT.nx * 0.75, A3_DUCT_OUT.pos.z + A3_DUCT_OUT.nz * 0.75];
    expect(path(nav, out, CORRIDOR)).not.toBeNull();
    // and the offices stay shut either way
    expect(path(nav, WEST, [83.0, 4.3])).toBeNull();
  });
});

describe('Marlow re-plan A3: the camera, the crawl\'s exit and the fire door', () => {
  const landing: [number, number] = [A3_DUCT_OUT.pos.x + A3_DUCT_OUT.nx * 0.75, A3_DUCT_OUT.pos.z + A3_DUCT_OUT.nz * 0.75];

  it('the grille, the crawler\'s landing, the fire door and the whole a3-fire zone are past the camera\'s 14 m (x 82.6 on the corridor\'s line)', () => {
    expect(camR).toBe(14);
    expect(cam.at[0] - camR).toBeCloseTo(82.6, 6);
    expect(A3_GRILLE.x1).toBeLessThan(82.0);
    for (const [x, z] of [[A3_GRILLE.x0, A3_GRILLE.face], [A3_GRILLE.x1, A3_GRILLE.face], landing, [A3_FIRE.x, A3_FIRE.z0], [A3_FIRE.x, A3_FIRE.z1]] as const) {
      for (const y of [0.3, ...HEADS]) expect(fromLens(x, z, y), `(${x}, ${z}) at ${y}`).toBeGreaterThan(camR);
    }
    const [x0, z0, x1, z1] = A3_FIRE_ZONE;
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]] as const) for (const y of HEADS) expect(fromLens(x, z, y)).toBeGreaterThan(camR);
  });

  it('and outside its frame at every sweep angle (a crouched or a standing head, every 0.1 m of the zone and the grille); teeth: a step past x 83 is in it', () => {
    const [x0, z0, x1, z1] = A3_FIRE_ZONE;
    for (let x = x0; x <= x1 + 1e-9; x += 0.1) for (let z = z0; z <= z1 + 1e-9; z += 0.1) for (const y of HEADS) expect(inSweep(x, y, z), `(${x.toFixed(1)}, ${z.toFixed(1)}) at ${y}`).toBe(false);
    for (let x = A3_GRILLE.x0; x <= A3_GRILLE.x1 + 1e-9; x += 0.1) for (const y of [0.3, 0.75, 1.4]) expect(inSweep(x, y, A3_GRILLE.face)).toBe(false);
    expect(HEADS.some((y) => inSweep(84.0, y, 10.75))).toBe(true);
  });

  it('(marlow-play C1) station 7: the jammer takes the camera, not the corridor lamp 0.6 m in front of its lens, aimed at either', () => {
    const lights = b.lights.lights.filter((l) => l.electric && (l.kind === 'lamp' || l.kind === 'spot'));
    const targets: JamTarget[] = [
      ...lights.map((l): JamTarget => ({ id: `lt-${l.id}`, kind: 'light', x: l.x, y: l.y, z: l.z })),
      { id: cam.id, kind: 'camera', x: cam.at[0], y: cam.y, z: cam.at[1] },
    ];
    const lamp = lights.find((l) => l.x === 96 && Math.abs(l.z - cam.at[1]) < 0.5)!;
    expect(lamp, 'the corridor lamp at x 96').toBeDefined();
    const st7 = part.bay.stations!.find((s) => s.n === 7)!;
    for (const m of st7.marks) {
      for (const y of [1.5, 1.7, 1.9]) {
        for (const [ax, ay, az] of [[cam.at[0], cam.y, cam.at[1]], [lamp.x, lamp.y, lamp.z]] as const) {
          const d = hyp3(ax - m.x, ay - y, az - m.z);
          const i = pickJamTarget(targets, m.x, y, m.z, (ax - m.x) / d, (ay - y) / d, (az - m.z) / d);
          expect(targets[i]?.id, `eye (${m.x}, ${y}, ${m.z}) aimed at (${ax}, ${az})`).toBe(cam.id);
        }
        // teeth: aimed at the lamp it is the nearer angle, and with no camera in the list it is the pick
        const d = hyp3(lamp.x - m.x, lamp.y - y, lamp.z - m.z);
        const noCam = targets.filter((t) => t.kind === 'light');
        expect(noCam[pickJamTarget(noCam, m.x, y, m.z, (lamp.x - m.x) / d, (lamp.y - y) / d, (lamp.z - m.z) / d)]?.id).toBe(`lt-${lamp.id}`);
      }
    }
  });
});

describe('Marlow re-plan A3: the pass zones, the steps and the lines', () => {
  const steps = def.objectives!.filter((o) => o.bay === 'A3');

  it('no A3 pass zone carries the send-back (hall); a3-fire [79.6, 9.2, 82, 12.3] both at floor 0; a3-far (both) and a3-far1 kept; flags external', () => {
    const zones = built.layout.passZones!.filter((z) => z.id.startsWith('a3-'));
    for (const z of zones) expect(z.hall, z.id).toBeUndefined();
    for (const z of part.passZones) expect(z.hall, z.id).toBeUndefined();
    const fire = part.passZones.find((z) => z.flag === A3_FIRE_FLAG)!;
    expect(fire).toEqual({ id: 'a3-p-fire', box: [79.6, 9.2, 82, 12.3], flag: 'a3-fire', floorY: 0 });
    expect(fire.any).toBeUndefined();
    const far = part.passZones.find((z) => z.flag === A3_FAR_FLAG)!;
    expect(far).toMatchObject({ id: 'a3-p-far', box: A3_FAR_ZONE, floorY: 0 });
    expect(far.any).toBeUndefined();
    expect(part.passZones.find((z) => z.id === 'a3-p-far1')).toMatchObject({ any: true });
    expect(part.externalFlags).toEqual(expect.arrayContaining([A3_FIRE_FLAG, A3_FAR_FLAG]));
    // the built yard keeps its send-back
    const plain = buildCtcourse(new LevelBuilder());
    expect(plain.parts[2]!.passZones.filter((z) => z.hall).map((z) => z.id)).toEqual(['a3-p-far1', 'a3-p-far']);
  });

  it('three steps: the vent unlock (a3-fire), the jam relay (a3-far), the holding-room line; what and where, no fail', () => {
    expect(steps.map((o) => o.id)).toEqual(['a3-vent', 'a3-jam', 'a3-lock']);
    expect(steps[0]!.done).toEqual({ flag: A3_FIRE_FLAG });
    expect(steps[1]!.done).toEqual({ flag: A3_FAR_FLAG });
    expect(steps[2]!.done).toBeUndefined();
    expect(steps[0]!.text).toMatch(/riser cupboard/i);
    expect(steps[0]!.text).toMatch(/fire door/);
    expect(steps[1]!.text).toMatch(/camera/);
    expect(steps[1]!.text).toMatch(/recess/);
    expect(steps[1]!.a).toBeDefined();
    expect(steps[1]!.b).toBeDefined();
    expect(steps[2]!.text).toMatch(/holding room three/);
    for (const o of steps) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(/[–—]/.test(t), t).toBe(false);
        expect(t, t).not.toMatch(/fail|send|cleaner|start again/i);
      }
      expect(o.id.length).toBeLessThanOrEqual(OBJECTIVE_ID_MAX);
    }
  });

  it('the retry lines exist (STATIONS section 6, verbatim) and fit; no radio line names the send-back or the cleaner; every line fits 90 characters', () => {
    const at = (k: string) => part.bay.radio.filter((r) => r.at === k).map((r) => r.text);
    expect(at(retryKey('a3-vent'))).toEqual(['The camera had you. Back to the west lobby.']);
    expect(at(retryKey('a3-jam'))).toEqual(["The camera had you. Back to the corridor's west end; jam it again."]);
    expect(A3_RETRY_LINES).toEqual({ 'a3-vent': at(retryKey('a3-vent'))[0], 'a3-jam': at(retryKey('a3-jam'))[0] });
    expect(at(retryKey('a3-vent', true))).toEqual([]);
    expect(at(retryKey('a3-jam', true))).toEqual([]);
    for (const r of part.bay.radio) {
      expect(r.text.length, r.text).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(r.text), r.text).toBe(false);
      expect(r.text, r.text).not.toMatch(/sends? you back|back to the lobby|cleaner|failed/i);
      // keyed to the bay's start, a step of this bay or a retry
      expect(['enter', 'a3-vent', 'a3-jam', 'a3-lock', retryKey('a3-vent'), retryKey('a3-jam')]).toContain(r.at);
    }
    expect(at('enter').length).toBeGreaterThan(0);
    expect(at('enter').join(' ')).toMatch(/fire door/i);
  });
});
