/**
 * Marlow re-plan, A7 the Data Hall (J14 slice G-A1A7; PLAN section 2 "Guards per lesson", STATIONS.md sections 3, 6, 9): the
 * set on `ctcourseReplan`. Pins: the re-plan's collision (`GREY`), the contract; the full-height glazed lobby screen with the
 * hall door kept (glass to the slab, no solid wall left on the line but the switch pier, no paint over the glass, a body
 * walks through the door and not the glass); the squad: the built technician plus `a7-tech2`, both spawned in the hall, his
 * round on the north apron and never in the pod's box; the two sightlines of two-way cover: (a) from his look stop he sees
 * the pod leg's approach through the cage mesh, (b) the hall leg sees him through the mesh from T1's spot and the front
 * aisle; station 17 as STATIONS section 3 has it with standing room at its marks, LANTERN's retry line. The built A7 is
 * `tests/ctcourse/a7DataHall.test.ts` (its `GREY` proves the flag-off build unchanged).
 */
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../../src/ai/enemyDefs';
import { EYE_STAND } from '../../../src/ai/perception';
import { PatrolWalker } from '../../../src/ai/patrol';
import { COURSE_TEXT_MAX } from '../../../src/config/course';
import { MOVEMENT } from '../../../src/config/movement';
import { hyp2 } from '../../../src/core/mathx';
import { layoutKnownIds, retryKey, validateCourse } from '../../../src/game/course/courseDef';
import { CourseState } from '../../../src/game/course/courseState';
import type { StationDef } from '../../../src/game/course/stationDef';
import { remoteHeadY } from '../../../src/security/securitySystem';
import { LevelBuilder, type BoxPiece } from '../../../src/world/levelBuilder';
import { buildCtcourse, ctcourseReplan } from '../../../src/world/maps/ctcourse';
import { A7_CAGE, A7_HALL_DOOR, A7_T1_SPOT, A7_T2_SPOT, A7_TECH, A7_TECH_ROUTE } from '../../../src/world/maps/ctcourseSets/a7DataHall';
import { A7_DATA_HALL_STATIONS, A7_POD_APPROACH, A7_RETRY_LINE, A7_SCREEN, A7_TECH2, A7_TECH2_FACES, A7_TECH2_LOOK, A7_TECH2_ROUTE, A7_TECH2_WAITS } from '../../../src/world/maps/ctcourseSets/replan/a7DataHall';
import { checkSetPart, inBox, SET_GUARDS_MAX, type Box } from '../../../src/world/maps/ctcourseSets/types';
import { runtimeNav } from '../../helpers/runtimeNav';

const b = new LevelBuilder();
const built = buildCtcourse(b, { replan: true });
const part = built.parts[6]!;
const lay = built.layout;
const course = lay.course!;
const def = course.def;
const range = built.ranges.a7DataHall;
const mine = b.boxes.slice(range.boxes[0], range.boxes[1]);
/** The set's collision on the re-plan: the built 37 solids less the east wall's four runs and its sidelight glass, plus the
 *  screen's three glass boxes and the switch pier. */
const GREY = { solids: 36, checksum: 12220.896, lights: 15, doors: 5, anchors: 6 };
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
/** Every collision box of the map, a quarter-turned one folded to its axis-aligned footprint. */
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.pitch) < 1e-3).map((p) => (Math.abs(Math.sin(p.yaw)) > 0.5 ? { ...p, s: [p.s[2], p.s[1], p.s[0]] as [number, number, number], yaw: 0 } : p));
/** The solid boxes in a body's band (floor to 1.7 m) within `r` of (x, z). */
const blockedAt = (x: number, z: number, r = MOVEMENT.radius): BoxPiece[] =>
  solid.filter((p) => p.c[1] - p.s[1] / 2 < 1.7 && top(p) > 0.15).filter((p) => hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r);
/** A walk from (x0, z0) to (x1, z1) in 0.1 m steps: the first point a body of radius `r` touches a solid, or null. */
const walkBlocked = (x0: number, z0: number, x1: number, z1: number, r = MOVEMENT.radius): string | null => {
  const n = Math.ceil(hyp2(x1 - x0, z1 - z0) / 0.1);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const z = z0 + ((z1 - z0) * i) / n;
    const hit = blockedAt(x, z, r)[0];
    if (hit) return `(${x.toFixed(2)}, ${z.toFixed(2)}): box (${hit.c.map((v) => v.toFixed(2)).join(', ')})`;
  }
  return null;
};
type V3 = [number, number, number];
/** Does the segment p -> q pass through an axis-aligned box (strictly inside, 1 mm in)? Slab clip in 3D. */
const segHits = (p: V3, q: V3, o: BoxPiece): boolean => {
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 3; i++) {
    const lo = o.c[i]! - o.s[i]! / 2 + 1e-3;
    const hi = o.c[i]! + o.s[i]! / 2 - 1e-3;
    const d = q[i]! - p[i]!;
    if (Math.abs(d) < 1e-12) {
      if (p[i]! < lo || p[i]! > hi) return false;
      continue;
    }
    let a = (lo - p[i]!) / d;
    let c = (hi - p[i]!) / d;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
    if (t0 > t1) return false;
  }
  return true;
};
/** The collision boxes (`G.STATIC`: sight, the jam line, camera rays; glass included) the segment p -> q passes through. A fence is no box. */
const blockers = (p: V3, q: V3, among: readonly BoxPiece[] = solid): BoxPiece[] => among.filter((o) => segHits(p, q, o));
/** Does the plan segment (x0, z0) -> (x1, z1) run through the cage (some 0.1 m sample strictly inside its fence lines)? */
const throughCage = (x0: number, z0: number, x1: number, z1: number): boolean => {
  for (let i = 1; i < 100; i++) {
    const x = x0 + ((x1 - x0) * i) / 100;
    const z = z0 + ((z1 - z0) * i) / 100;
    if (x > A7_CAGE.x0 + 0.05 && x < A7_CAGE.x1 - 0.05 && z > A7_CAGE.z0 + 0.05 && z < A7_CAGE.z1 - 0.05) return true;
  }
  return false;
};
/** A guard's standing eye (`Enemy.eye`), a player's, and the body samples perception reads (chest, head). */
const GUARD_EYE = EYE_STAND * ENEMIES.grunt.scale;
const PLAYER_EYE = 1.6;
const BODY = [1.35, remoteHeadY(0, false)];
/** The hall's three G0 boxes (graph `a7-hall`), the pod's (`a7-pod`), the lobby's (`a7-lobby`). */
const HALL: readonly Box[] = [[76.15, 55.95, 86, 71.75], [86, 55.95, 96, 58.8], [86, 66.05, 99.75, 71.75]];
const POD: Box = [96.15, 55.95, 99.75, 67.85];
const LOBBY: Box = [70.25, 55.95, 75.85, 65.85];
const inHall = (x: number, z: number): boolean => HALL.some((h) => inBox(h, x, z));
/** A fresh course at set 7 with the two players at the given feet. */
function runAt(a: [number, number], c: [number, number]): CourseState {
  const s = new CourseState(def, course.consoles);
  s.startAt(7);
  s.setPlayer(0, a[0], 0, a[1], false);
  s.setPlayer(1, c[0], 0, c[1], false);
  s.update(1 / 60);
  return s;
}

describe('Marlow re-plan A7 the Data Hall (G-A1A7): the part', () => {
  it('passes the set-part contract; the re-plan course validates', () => {
    expect(part.id).toBe('a7DataHall');
    expect(checkSetPart(part)).toEqual([]);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
  });

  it('GREY: 36 solids (the east wall gone, the screen and its pier in), the lamps, doors and anchors the built set\'s', () => {
    const mineSolid = mine.filter((p) => p.collide);
    let sum = 0;
    for (const p of mineSolid) sum += p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw;
    expect(mineSolid).toHaveLength(GREY.solids);
    expect(sum).toBeCloseTo(GREY.checksum, 2);
    expect(built.counts.sets.a7DataHall).toEqual({ lights: GREY.lights, solids: GREY.solids, doors: GREY.doors, anchors: GREY.anchors });
    expect(part.register.find((r) => r.id === 'A7-R1')).toMatchObject({ solids: 4, lights: 0, doors: 0, anchors: 0 });
  });
});

describe('Marlow re-plan A7: the glazed lobby screen (PLAN section 2)', () => {
  const S = A7_SCREEN;
  /** The collision boxes on the screen line (x 75.9-76.1) inside its run (z 55.95-65.85), between the floor and the slab. */
  const onLine = solid.filter((p) => p.c[0] - p.s[0] / 2 < 76.1 && p.c[0] + p.s[0] / 2 > 75.9 && p.c[2] - p.s[2] / 2 < S.z1 - 0.01 && p.c[2] + p.s[2] / 2 > S.z0 + 0.01 && p.c[1] - p.s[1] / 2 > -1e-6 && top(p) < 4 + 1e-6);
  const glass = onLine.filter((p) => p.visible === false);
  const pier = onLine.filter((p) => p.visible !== false);

  it('the line holds three glass boxes and one pier, nothing else: the built runs, head and sidelight are gone', () => {
    expect(glass).toHaveLength(3);
    expect(pier).toHaveLength(1);
    const pr = pier[0]!;
    expect([pr.c[2] - pr.s[2] / 2, pr.c[2] + pr.s[2] / 2]).toEqual([expect.closeTo(S.pier[0], 6), expect.closeTo(S.pier[1], 6)]);
    expect(pr.noLedge).toBe(true);
    // the rack-row switch is on the pier's lobby face
    const sw = part.switches.find((s) => s.id === 'a7-sw-rows')!;
    expect(sw.pos.z).toBeGreaterThan(S.pier[0]);
    expect(sw.pos.z).toBeLessThan(S.pier[1]);
  });

  it('full height to the 4.0 m slab: glass z 55.95-60.25 and 62.2-65.85 from the floor, a transom 2.1-4.0 over the hall door', () => {
    const span = (p: BoxPiece): [number, number, number, number] => [p.c[2] - p.s[2] / 2, p.c[2] + p.s[2] / 2, p.c[1] - p.s[1] / 2, top(p)];
    const runs = glass.map(span).sort((a, c) => a[0] - c[0]);
    expect(runs.map((r) => r.map((v) => +v.toFixed(3)))).toEqual([
      [55.95, 60.25, 0, 4],
      [61, 62.2, 2.1, 4],
      [62.2, 65.85, 0, 4],
    ]);
    // the door keeps its span; the screen, the pier and the door close the line from the corridor wall to the riser block
    const door = b.anchors.doors.find((d) => d.id === course.doors[A7_HALL_DOOR])!;
    expect(door.hinge.x).toBeCloseTo(S.x, 6);
    expect(door.hinge.z).toBeCloseTo(S.door[0], 6);
    expect(door.width).toBeCloseTo(S.door[1] - S.door[0], 6);
    expect(door.height).toBeCloseTo(S.doorH, 6);
  });

  it('a body walks lobby -> hall through the door, never through the glass; sight from the lobby down all three aisles meets only the glass', () => {
    expect(walkBlocked(73, 61.6, 80, 61.6)).toBeNull();
    for (const z of [57.4, 64.5]) {
      expect(blockedAt(76, z).some((p) => glass.includes(p)), `z ${z}`).toBe(true);
      expect(walkBlocked(73, z, 80, z), `z ${z}`).not.toBeNull();
    }
    for (const z of [57.4, 65.7]) {
      const hit = blockers([74.5, PLAYER_EYE, z], [82, 1.2, z]);
      expect(hit.length, `aisle z ${z}`).toBe(1);
      expect(glass).toContain(hit[0]);
    }
    // the guards cannot see into the lobby through the screen: every line from either technician's stops to a lobby body that
    // crosses x 76 off the hall door (a door is no box here: the built glazed door is as before) is stopped
    for (const [ex, ez] of [...A7_TECH_ROUTE, ...A7_TECH2_ROUTE]) {
      for (const [fx, fz] of [[74, 57], [74, 59], [74, 63.5], [74, 65.2]] as const) {
        const zAt = ez + ((fz - ez) * (ex - S.x)) / (ex - fx);
        if (zAt > S.door[0] - 0.3 && zAt < S.door[1] + 0.3) continue;
        for (const y of BODY) expect(blockers([ex, GUARD_EYE, ez], [fx, y, fz]).length, `(${ex}, ${ez}) -> (${fx}, ${fz})`).toBeGreaterThan(0);
      }
    }
  });

  it('no paint over the glass: no dressing skin on either face of the screen in the glazed runs (the built wall finish and PDU are flag-off only)', () => {
    const skins = mine.filter((p) => !p.collide);
    const over = (list: readonly BoxPiece[]): BoxPiece[] =>
      list.filter((p) => p.c[0] - p.s[0] / 2 < 76.25 && p.c[0] + p.s[0] / 2 > 75.75 && p.c[1] - p.s[1] / 2 < 1.9 && top(p) > 0.3 && ((p.c[2] - p.s[2] / 2 < 60.2 && p.c[2] + p.s[2] / 2 > 56.0) || (p.c[2] - p.s[2] / 2 < 63.6 && p.c[2] + p.s[2] / 2 > 62.6)));
    expect(over(skins).filter((p) => p.s[2] > 1)).toEqual([]);
    // teeth: the built set paints that wall
    const pb = new LevelBuilder();
    const plain = buildCtcourse(pb);
    const r = plain.ranges.a7DataHall;
    expect(over(pb.boxes.slice(r.boxes[0], r.boxes[1]).filter((p) => !p.collide)).filter((p) => p.s[2] > 1).length).toBeGreaterThan(0);
  });
});

describe('Marlow re-plan A7: the two technicians (STATIONS section 9)', () => {
  const t1 = part.squads[A7_TECH]!;
  const t2 = part.squads[A7_TECH2]!;

  it('the squad is the built technician and a7-tech2, armed grunts, both spawned in the hall; the bay is rated, at most 3 guards', () => {
    expect(part.bay.squad).toEqual([A7_TECH, A7_TECH2]);
    expect(part.bay.squad.length).toBeLessThanOrEqual(SET_GUARDS_MAX);
    for (const s of [t1, t2]) {
      expect(s.kind).toBe('grunt');
      expect(s.passive).toBeUndefined();
      expect(inHall(s.x, s.z), `${s.x}, ${s.z}`).toBe(true);
      expect(inBox(POD, s.x, s.z)).toBe(false);
    }
    expect(t1.route).toEqual(A7_TECH_ROUTE);
    expect([t2.x, t2.z, t2.yaw]).toEqual([98.5, 70.5, Math.PI]);
    expect(t2.route).toEqual(A7_TECH2_ROUTE);
    expect(t2.waits).toEqual(A7_TECH2_WAITS);
    expect(t2.faces).toEqual(A7_TECH2_FACES);
    expect(t2.waits!.every((w) => w > 0)).toBe(true);
    expect(def.bays[6]!.rated).toBe(true);
    expect(course.squads[A7_TECH2]).toBe(t2);
  });

  it("his round: every point and every 0.1 m of its legs inside the hall's boxes, never in the pod's box, on open floor", () => {
    const pts = A7_TECH2_ROUTE;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!;
      const c = pts[(i + 1) % pts.length]!;
      const n = Math.ceil(hyp2(c[0] - a[0], c[1] - a[1]) / 0.1);
      for (let k = 0; k <= n; k++) {
        const x = a[0] + ((c[0] - a[0]) * k) / n;
        const z = a[1] + ((c[1] - a[1]) * k) / n;
        expect(inHall(x, z), `${x.toFixed(2)}, ${z.toFixed(2)}`).toBe(true);
        expect(inBox(POD, x, z, MOVEMENT.radius), `${x.toFixed(2)}, ${z.toFixed(2)}`).toBe(false);
      }
      expect(walkBlocked(a[0], a[1], c[0], c[1]), `leg ${i}`).toBeNull();
    }
  });

  it("his round is on the guards' nav grid, both stops joined", () => {
    const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, ctcourseReplan.navLayers ?? 3, lay.navSeeds ?? []);
    for (const [x, z] of A7_TECH2_ROUTE) expect(nav.isWalkable(nav.cellOf(x, z)), `${x}, ${z}`).toBe(true);
    expect(nav.findPath(A7_TECH2_ROUTE[0]!, A7_TECH2_ROUTE[1]!)).not.toBeNull();
  });

  it('the loop takes 25-45 s on the walker (LD 4.3) with stops of 12 s at the pod panel and 8 s at the cage corner', () => {
    const w = new PatrolWalker({ points: A7_TECH2_ROUTE, waits: A7_TECH2_WAITS, faces: A7_TECH2_FACES }, t2.x, t2.z, t2.yaw);
    const speed = ENEMIES.grunt.walkSpeed * 1.1;
    let [x, z] = [t2.x, t2.z];
    let idx = w.idx;
    const left: number[] = [];
    const dt = 0.01;
    for (let t = 0; t < 140; t += dt) {
      w.tick(dt);
      const to = w.step(dt, x, z);
      if (to) {
        const d = hyp2(to[0] - x, to[1] - z);
        const k = Math.min(1, (speed * dt) / (d || 1));
        x += (to[0] - x) * k;
        z += (to[1] - z) * k;
      }
      if (w.idx !== idx) {
        if (idx === 0) left.push(t);
        idx = w.idx;
      }
    }
    expect(left.length).toBeGreaterThanOrEqual(3);
    const cycle = left[2]! - left[1]!;
    expect(cycle).toBeGreaterThanOrEqual(25);
    expect(cycle).toBeLessThanOrEqual(45);
  });

  it('(a) from his look stop he sees the pod leg\'s approach (inside the pod\'s south door, the pod, T2\'s spot) through the cage mesh, clear of the east door\'s leaf', () => {
    const [lx, lz] = A7_TECH2_LOOK;
    const face = A7_TECH2_FACES[1]!;
    for (const [fx, fz] of A7_POD_APPROACH) {
      expect(inBox(POD, fx, fz), `${fx}, ${fz}`).toBe(true);
      for (const y of BODY) expect(blockers([lx, GUARD_EYE, lz], [fx, y, fz]), `-> (${fx}, ${y}, ${fz})`).toEqual([]);
      expect(throughCage(lx, lz, fx, fz)).toBe(true);
      // where the line leaves the cage on its east face (x 96): outside the east door's span (its leaf is no fence)
      const zAt96 = lz + ((fz - lz) * (A7_CAGE.x1 - lx)) / (fx - lx);
      expect(zAt96 > A7_CAGE.z0 && zAt96 < A7_CAGE.door[0], `z at the east face ${zAt96.toFixed(2)}`).toBe(true);
      // and inside his focused cone while he faces his stop's facing
      const off = Math.abs(Math.atan2(Math.sin(Math.atan2(fx - lx, fz - lz) - face), Math.cos(Math.atan2(fx - lx, fz - lz) - face)));
      expect(off, `${fx}, ${fz}`).toBeLessThan((27.5 * Math.PI) / 180);
    }
  });

  it('the check has teeth: from the pod panel stop (facing the pod\'s solid north wall) every line to the pod leg\'s approach is stopped', () => {
    const [px, pz] = A7_TECH2_ROUTE[0]!;
    for (const [fx, fz] of A7_POD_APPROACH) for (const y of BODY) expect(blockers([px, GUARD_EYE, pz], [fx, y, fz]).length, `-> (${fx}, ${fz})`).toBeGreaterThan(0);
    expect(blockers([px, GUARD_EYE, pz], [px, GUARD_EYE, 66]).length).toBeGreaterThan(0);
  });

  it('(b) the hall leg sees him at his look stop through the cage mesh: from T1\'s spot and the front aisle', () => {
    const [lx, lz] = A7_TECH2_LOOK;
    const from: [number, number][] = [A7_T1_SPOT, [84.4, 61.5], [84.4, 62.5]];
    for (const [ex, ez] of from) {
      expect(inHall(ex, ez)).toBe(true);
      for (const y of BODY) expect(blockers([ex, PLAYER_EYE, ez], [lx, y, lz]), `(${ex}, ${ez}) -> ${y}`).toEqual([]);
      expect(throughCage(ex, ez, lx, lz)).toBe(true);
    }
  });

  it('the other way round (built): from the pod the pod leg sees the rows 1-2 technician on his round through the mesh', () => {
    const pod: [number, number][] = [[98.0, 65.5], [97.5, 65.6], [98.0, 64.5], [98.5, 60.5]];
    const open = A7_TECH_ROUTE.filter(([gx, gz]) => pod.some(([ex, ez]) => BODY.every((y) => blockers([ex, PLAYER_EYE, ez], [gx, y, gz]).length === 0) && throughCage(ex, ez, gx, gz)));
    expect(open.length).toBeGreaterThan(0);
  });
});

describe('Marlow re-plan A7: station 17 (STATIONS.md sections 3, 6)', () => {
  const sheet: StationDef[] = [
    { n: 17, id: 'a7-split', lesson: 'synced_hack', retry: 'station', doneFlag: 'a7-sync',
      marks: [{ x: 74.0, z: 62.0, y: 0, yaw: Math.PI / 2 }, { x: 72.5, z: 57.0, y: 0, yaw: Math.PI }],
      guards: ['a7-tech', 'a7-tech2'], gates: ['g-a7-cage-w', 'g-a7-cage-e', 'g-a7-east', 'a7-cam1', 'a7-cam2'] },
  ];

  it('the sheet\'s A7 block, on the bay; no drillS (a hack miss resets the terminals in place, SA6)', () => {
    expect(part.bay.stations).toEqual(sheet);
    expect(A7_DATA_HALL_STATIONS).toEqual(sheet);
    expect(def.bays[6]!.stations).toEqual(sheet);
    expect(sheet[0]!.drillS).toBeUndefined();
  });

  it('the marks have standing room in the entry lobby (A the hall leg by the hall door, B the plant corridor leg by the plant door)', () => {
    for (const m of sheet[0]!.marks) {
      expect(inBox(LOBBY, m.x, m.z), `${m.x}, ${m.z}`).toBe(true);
      expect(blockedAt(m.x, m.z), `${m.x}, ${m.z}`).toEqual([]);
    }
    expect(walkBlocked(74, 62, 80, 61.6)).toBeNull();
  });

  it("LANTERN's retry line: at retry:a7-split, the sheet's words, within 90 characters; no timer line", () => {
    const r = part.bay.radio.filter((l) => l.at.startsWith('retry:'));
    expect(r).toEqual([{ at: retryKey('a7-split'), text: 'Seen in the data hall. Back to the entry lobby.' }]);
    expect(A7_RETRY_LINE.length).toBeLessThanOrEqual(COURSE_TEXT_MAX);
  });

  it('a course run: 17 is live on the bay, a seen retry counts and keeps it live, the sync ends it', () => {
    const s = runAt([73, 61], [73, 58]);
    expect(s.station()).toBe(17);
    expect(s.retryStation('seen')).toBe(true);
    expect(s.lastRetry).toEqual({ st: 17, cause: 'seen' });
    expect(s.station()).toBe(17);
    s.setFlag('a7-sync');
    s.update(1 / 60);
    expect(s.station()).toBe(0);
    // the built objective lines stay (no line was changed)
    expect(def.objectives!.filter((o) => o.bay === 'A7').map((o) => o.id)).toEqual(['a7-split', 'a7-sync', 'a7-lock']);
  });

  it('a seen retry with the pod leg in the pod drops the split (a7-pod, its step) and the claim; the course state alone', () => {
    // the e2e's `the split is cleared`: the state side holds; a pass zone setting a7-pod again on the old positions is the
    // mode's (its zone hold must start before the step's device update)
    const s = runAt([75.3, 60.5], [72.8, 54.0]);
    for (let i = 0; i < 120; i++) s.update(1 / 60);
    expect(s.roleOf(1)).toBe('b');
    s.setPlayer(1, A7_T2_SPOT[0], 0, A7_T2_SPOT[1], false);
    s.setFlag('a7-pod');
    s.update(1 / 60);
    expect(s.hasFlag('a7-pod')).toBe(true);
    expect(s.retryStation('seen')).toBe(true);
    expect(s.hasFlag('a7-pod')).toBe(false);
    expect(s.hasFlag('obj:a7-split')).toBe(false);
    expect(s.roleClaimed()).toBe(false);
    expect(s.station()).toBe(17);
  });

  it('the terminals keep their spots: T1 in the hall, T2 in the pod', () => {
    expect(inHall(A7_T1_SPOT[0], A7_T1_SPOT[1])).toBe(true);
    expect(inBox(POD, A7_T2_SPOT[0], A7_T2_SPOT[1])).toBe(true);
  });
});
