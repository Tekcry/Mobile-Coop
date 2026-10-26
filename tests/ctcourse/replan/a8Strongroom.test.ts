/**
 * Marlow re-plan, A8 the Strongroom (J14 slice G-A8; PLAN section 2, STATIONS.md sections 3, 5, 6, 8, 9): the set on
 * `ctcourseReplan`. Pins: the re-plan's collision (`GREY`), the contract, the three guards, stations 18-21 as STATIONS section 3
 * has them (all `caught`, 20 with 25 s and 21 with 60 s) with standing room at their marks and the station flow, the public stair
 * 2.4 m with 0.6 m past the column and the desk, the glazed office wall (stops guard sight, keeps the door), the side routes
 * kept open on the nav, the counters' staff side and the jam from (118, 67.2) to C2, circuits 85 and 86 live with their lamps
 * and switches, the pass zones, the objective, radio and retry lines. The built A8 is `tests/ctcourse/a8Strongroom.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COURSE_TEXT_MAX } from '../../../src/config/course';
import { MOVEMENT } from '../../../src/config/movement';
import { hyp2, hyp3 } from '../../../src/core/mathx';
import { layoutKnownIds, retryKey, validateCourse } from '../../../src/game/course/courseDef';
import { CourseState } from '../../../src/game/course/courseState';
import type { StationDef } from '../../../src/game/course/stationDef';
import { JAMMER } from '../../../src/game/jammer';
import { generateLedges, type Ledge } from '../../../src/world/anchors';
import { LevelBuilder, type BoxPiece } from '../../../src/world/levelBuilder';
import { MARLOW_CIRCUITS_REPLAN } from '../../../src/world/lighting/marlowCircuits';
import { buildCtcourse } from '../../../src/world/maps/ctcourse';
import {
  A8_CAMERAS,
  A8_COLUMNS_N,
  A8_COUNTER_MAIN,
  A8_COUNTER_RETURN,
  A8_DESK,
  A8_GALLERY_LEVEL,
  A8_H,
  A8_JAM,
  A8_LEVELS,
  A8_LIP,
  A8_N1,
  A8_N2,
  A8_NORTH,
  A8_OFFICE_DOOR,
  A8_OFFICER,
  A8_PUBLIC_STAIR,
  A8_REPLAN_COLUMN_OUT,
  A8_RTE_AT,
} from '../../../src/world/maps/ctcourseSets/a8Strongroom';
import {
  A8_GLASS,
  A8_GRILLE_IN_FLAG,
  A8_GRILLE_IN_ZONE,
  A8_OFFICE_IN_FLAG,
  A8_OFFICE_IN_ZONE,
  A8_OFFICE_SWITCH_Z,
  A8_RETRY_LINES,
  A8_STAIR,
  A8_STAIR_RAILS,
  A8_STATIONS,
  A8_VESTIBULE_LAMPS,
  A8_VESTIBULE_SWITCH,
  A8_WEST_COLUMN,
  A8_WEST_COUNTER_LAMP,
  A8_WEST_SWITCH,
  A8_WEST_WALL_LAMP,
} from '../../../src/world/maps/ctcourseSets/replan/a8Strongroom';
import { checkSetPart, inBox, OBJECTIVE_ID_MAX, registerSum, SET_BOX } from '../../../src/world/maps/ctcourseSets/types';
import { soloJumpThreats } from '../../helpers/soloJumpReach';

const b = new LevelBuilder();
const built = buildCtcourse(b, { replan: true });
const part = built.parts[7]!;
const course = built.layout.course!;
const def = course.def;
const range = built.ranges.a8Strongroom;
const mine = b.boxes.slice(range.boxes[0], range.boxes[1]);
const box = SET_BOX.a8Strongroom[0]!;
/** The set's collision on the re-plan: the built set's less the 1.2 m flight and its rails, the stair head's east piece, the fourth
 *  column and the office wall's south piece, plus the 2.4 m flight, its rails, the east piece from x 132.9, the x 112 column, the
 *  glazed screen and its head; the built 16 lamps and four more (circuits 85 and 86); five doors; one anchor (the loading edge). */
const GREY = { solids: 114, checksum: 46079.81240308785, lights: 20, doors: 5, anchors: 1 };
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && inBox(box, l.x, l.z) && l.group >= 80 && l.group < 90);
const doorAnchor = (cid: string) => b.anchors.doors.find((d) => d.id === course.doors[cid])!;
const solidBox = (x0: number, x1: number, z0: number, z1: number, y1 = 3): BoxPiece => ({ c: [(x0 + x1) / 2, y1 / 2, (z0 + z1) / 2], s: [x1 - x0, y1, z1 - z0], yaw: 0, pitch: 0, color: '#000', collide: true, visible: true });

/** The solid boxes whose band (floor to 1.7 m over `y`) is within `r` of (x, z): what a body walking there touches. */
const blockedAt = (x: number, z: number, r = MOVEMENT.radius, y = 0): string[] =>
  solid
    .filter((p) => bottom(p) < y + 1.7 && top(p) > y + 0.15)
    .filter((p) => hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r)
    .map((p) => `box (${p.c.map((v) => v.toFixed(2)).join(', ')}) size (${p.s.map((v) => v.toFixed(2)).join(', ')})`);

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
const blockers = (p: V3, q: V3): BoxPiece[] => solid.filter((o) => segHits(p, q, o));

/** A fresh course at set 8 with the two players at the given feet (feet y per player). */
function runAt(a: [number, number, number?], c: [number, number, number?]): CourseState {
  const s = new CourseState(def, course.consoles);
  s.startAt(8);
  s.setPlayer(0, a[0], a[2] ?? 0, a[1], false);
  s.setPlayer(1, c[0], c[2] ?? 0, c[1], false);
  s.update(1 / 60);
  return s;
}

/**
 * A flood fill of the floor a radius-0.3 body can walk (0.25 m cells over the set, doors are no boxes so openings are open; the
 * guard nav vaults low cover, a player does not): `plug` boxes shut extra places. Returns whether (x1, z1) is reached from (x0, z0).
 */
function reaches(from: [number, number], to: [number, number], plug: readonly BoxPiece[] = []): boolean {
  const C = 0.25;
  const [x0, z0, x1, z1] = [106.5, 50.5, 150, 77.5];
  const nx = Math.ceil((x1 - x0) / C);
  const nz = Math.ceil((z1 - z0) / C);
  const free = new Map<number, boolean>();
  const ok = (i: number, j: number): boolean => {
    if (i < 0 || j < 0 || i >= nx || j >= nz) return false;
    const k = i * nz + j;
    let f = free.get(k);
    if (f === undefined) {
      const x = x0 + (i + 0.5) * C;
      const z = z0 + (j + 0.5) * C;
      f = blockedAt(x, z).length === 0 && plug.every((p) => hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) >= MOVEMENT.radius);
      free.set(k, f);
    }
    return f;
  };
  const cell = (x: number, z: number): [number, number] => [Math.floor((x - x0) / C), Math.floor((z - z0) / C)];
  const [si, sj] = cell(from[0], from[1]);
  const [ti, tj] = cell(to[0], to[1]);
  if (!ok(si, sj) || !ok(ti, tj)) return false;
  const seen = new Set<number>([si * nz + sj]);
  const queue: [number, number][] = [[si, sj]];
  for (let q = 0; q < queue.length; q++) {
    const [i, j] = queue[q]!;
    if (i === ti && j === tj) return true;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const k = (i + di) * nz + (j + dj);
      if (seen.has(k) || !ok(i + di, j + dj)) continue;
      seen.add(k);
      queue.push([i + di, j + dj]);
    }
  }
  return false;
}
const PUBLIC: [number, number] = [120, 62];

describe('Marlow re-plan A8 the Strongroom (G-A8): the part', () => {
  it('passes the set-part contract; the re-plan course validates; every register row is an A8 row and counts the builder', () => {
    expect(part.id).toBe('a8Strongroom');
    expect(checkSetPart(part)).toEqual([]);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
    expect(part.register.every((r) => r.id.startsWith('A8-'))).toBe(true);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A8-1', 'A8-2', 'A8-R1', 'A8-R2', 'A8-R3', 'A8-R4', 'A8-R5', 'A8-R6']));
    // the replaced built pieces' rows are not on the re-plan
    expect(part.register.map((r) => r.id)).not.toContain('A8-3');
    expect(part.register.map((r) => r.id)).not.toContain('A8-19');
    expect(registerSum(part.register)).toEqual(built.counts.sets.a8Strongroom);
    for (const r of part.register) expect(/[–—]/.test(r.element), r.id).toBe(false);
  });

  it("GREY: the re-plan's collision (solids, checksum), 20 lamps, five doors, one anchor; the built yard is as built (16 lamps, no stations)", () => {
    const mineSolid = mine.filter((p) => p.collide);
    let sum = 0;
    for (const p of mineSolid) sum += p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw;
    expect(mineSolid).toHaveLength(GREY.solids);
    expect(sum).toBeCloseTo(GREY.checksum, 2);
    const c = built.counts.sets.a8Strongroom;
    expect(c.lights).toBe(GREY.lights);
    expect(c.doors).toBe(GREY.doors);
    expect(c.anchors).toBe(GREY.anchors);
    expect(lamps).toHaveLength(GREY.lights);
    const plain = buildCtcourse(new LevelBuilder());
    expect(plain.counts.sets.a8Strongroom).toMatchObject({ lights: 16, doors: 5, anchors: 1 });
    expect(plain.parts[7]!.bay.stations).toBeUndefined();
  });

  it('everything built lies inside the set box (0.3 m of wall slack) and under the hall roof; every tall collidable piece is noLedge but the two counters and the desk', () => {
    const [x0, z0, x1, z1] = box;
    for (const p of mine.filter((q) => Math.abs(q.yaw) < 1e-3 && Math.abs(q.pitch) < 1e-3)) {
      expect(p.c[0] - p.s[0] / 2).toBeGreaterThanOrEqual(x0 - 0.3);
      expect(p.c[0] + p.s[0] / 2).toBeLessThanOrEqual(x1 + 0.3);
      expect(p.c[2] - p.s[2] / 2).toBeGreaterThanOrEqual(z0 - 0.3);
      expect(p.c[2] + p.s[2] / 2).toBeLessThanOrEqual(z1 + 0.3);
      expect(top(p)).toBeLessThanOrEqual(10 + 1e-6);
    }
    for (const p of mine.filter((q) => q.collide && Math.abs(q.pitch) < 1e-3 && top(q) >= 1.9)) expect(p.noLedge, `box at (${p.c.join(', ')})`).toBe(true);
    expect(mine.filter((p) => p.collide && !p.noLedge && Math.abs(p.pitch) < 1e-3)).toHaveLength(3);
  });

  it('the re-plan adds no grip: the same ledges in the set as the built yard (the one manual edge), no split gap, and no solo jump reaches the lip', () => {
    const inA8 = (l: Ledge): boolean => inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3);
    const mineL = generateLedges(b.boxes, b.anchors);
    const plainB = new LevelBuilder();
    buildCtcourse(plainB);
    const plainL = generateLedges(plainB.boxes, plainB.anchors);
    expect(mineL.ledges.filter(inA8).length).toBe(plainL.ledges.filter(inA8).length);
    expect(mineL.ledges.filter(inA8).filter((l) => l.piece !== 0 && l.top >= 0.9)).toEqual([]);
    expect(mineL.splits.filter((s) => inBox(box, s.a.x, s.a.z))).toEqual([]);
    expect(part.lips).toEqual([A8_LIP]);
    expect(soloJumpThreats(solid, A8_LIP)).toEqual([]);
  });

  it('three guards as built, no alarm team (BRIEF A12): the night clerk, the hall patrol and the officer; armed grunts, none passive; the bay is rated', () => {
    expect(part.bay.squad).toEqual([A8_N1, A8_N2, A8_OFFICER]);
    expect(Object.keys(part.squads).sort()).toEqual([A8_N1, A8_N2, A8_OFFICER].sort());
    expect(def.bays[7]!.rated).toBe(true);
    for (const [id, s] of Object.entries(part.squads)) {
      expect(s.kind, id).toBe('grunt');
      expect(s.passive, id).toBeUndefined();
      expect(inBox(box, s.x, s.z), id).toBe(true);
    }
    expect(part.cameras.map((c) => c.id)).toEqual([...A8_CAMERAS]);
  });
});

describe('Marlow re-plan A8: the stations (STATIONS.md section 3)', () => {
  const sheet: StationDef[] = [
    { n: 18, id: 'a8-c2run', lesson: 'jam_relay', retry: 'caught', doneFlag: 'a8-office-in',
      marks: [{ x: 107.5, z: 64.0, y: 0, yaw: Math.PI / 2 }, { x: 107.5, z: 65.5, y: 0, yaw: Math.PI / 2 }],
      guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['a8-cam1', 'a8-cam2', 'a8-cam3'] },
    { n: 19, id: 'a8-loopset', lesson: 'camera_loop', retry: 'caught', doneFlag: 'a8-loop',
      marks: [{ x: 135.0, z: 76.5, y: 4.4, yaw: Math.PI / 2 }, { x: 126.5, z: 76.5, y: 0, yaw: 0 }],
      guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['g-a8-console'] },
    { n: 20, id: 'a8-isolate', lesson: 'timed_light_cut', retry: 'caught', doneFlag: 'a8-grille-in', drillS: 25,
      marks: [{ x: 141.5, z: 73.5, y: 4.4, yaw: Math.PI / 2 }, { x: 126.5, z: 76.5, y: 0, yaw: 0 }],
      guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['g-a8-night', 'g-a8-grille'] },
    { n: 21, id: 'a8-locks', lesson: 'synced_hack', retry: 'caught', doneFlag: 'a8-sync', drillS: 60,
      marks: [{ x: 141.5, z: 73.5, y: 4.4, yaw: Math.PI / 2 }, { x: 135.5, z: 66.5, y: 0, yaw: Math.PI / 2 }],
      guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['g-a8-console', 'g-a8-vault', 'laser-a8'] },
  ];
  /** The graph spaces' boxes the marks sit in (STATIONS section 7). */
  const SPACES: Record<number, [[number, number, number, number], [number, number, number, number]]> = {
    18: [[106.25, 56.2, 108.8, 75], [106.25, 56.2, 108.8, 75]],
    19: [[134.15, 71.55, 143.85, 77.75], [106.25, 75.2, 133.85, 77.75]],
    20: [[134.15, 71.55, 143.85, 77.75], [106.25, 75.2, 133.85, 77.75]],
    21: [[134.15, 71.55, 143.85, 77.75], [134.15, 56.15, 139.85, 67.85]],
  };

  it("stations 18-21 are the sheet's A8 block verbatim, on the bay, all caught; the board's 25 s on 20 and the loop's 60 s on 21", () => {
    expect(part.bay.stations).toEqual(sheet);
    expect(A8_STATIONS).toEqual(sheet);
    expect(def.bays[7]!.stations).toEqual(sheet);
    expect(sheet.map((s) => s.n)).toEqual([18, 19, 20, 21]);
    for (const s of sheet) expect(s.retry).toBe('caught');
    expect(sheet.map((s) => s.drillS)).toEqual([undefined, undefined, 25, 60]);
    // the windows are the set's own: 25 s the night circuit's timed cut, 60 s the console's loop
    expect(def.bays[7]!.gates.find((g) => g.id === 'g-a8-night')).toMatchObject({ kind: 'isolator', seconds: 25 });
    expect((course.consoles ?? []).find((c) => c.id === 'a8-console')).toMatchObject({ seconds: 60 });
  });

  it('every mark is on the 0.5 m grid, inside its graph space and the set, with standing room (a body of radius 0.3) on a floor at its height; A stands at 4.4 on the office floor for 19-21', () => {
    for (const s of sheet) {
      s.marks.forEach((m, i) => {
        expect(inBox(box, m.x, m.z), `${s.id} mark ${i}`).toBe(true);
        expect(inBox(SPACES[s.n]![i]!, m.x, m.z), `${s.id} mark ${i} in its space`).toBe(true);
        expect(blockedAt(m.x, m.z, MOVEMENT.radius, m.y), `${s.id} (${m.x}, ${m.z}) at ${m.y}`).toEqual([]);
        expect(Math.abs(m.x * 2 - Math.round(m.x * 2)) + Math.abs(m.z * 2 - Math.round(m.z * 2))).toBe(0);
        // a floor under it: a solid whose top is the mark's height (the office block, the gallery slab), or the ground
        if (m.y > 0) expect(solid.some((p) => Math.abs(top(p) - m.y) < 1e-6 && Math.abs(m.x - p.c[0]) <= p.s[0] / 2 && Math.abs(m.z - p.c[2]) <= p.s[2] / 2), `${s.id} floor at (${m.x}, ${m.z})`).toBe(true);
      });
    }
    for (const s of sheet.slice(1)) expect(s.marks[0].y).toBe(A8_H.gallery);
    for (const s of sheet) expect(s.marks[1].y).toBe(0);
  });

  it('the stations advance on their done flags (office, loop, grille, sync); a caught retry keeps the earlier steps done and drops the loop of a retried 19', () => {
    const s = runAt([107.5, 64.0], [107.5, 65.5]);
    expect(s.station()).toBe(18);
    s.setFlag(A8_OFFICE_IN_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(19);
    expect(s.retryStation('caught')).toBe(true);
    s.update(1 / 60);
    expect(s.station()).toBe(19);
    expect(s.hasFlag(A8_OFFICE_IN_FLAG)).toBe(true);
    expect(s.lastRetry?.st).toBe(19);
    s.setFlag('a8-loop');
    s.update(1 / 60);
    expect(s.station()).toBe(20);
    s.setFlag(A8_GRILLE_IN_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(21);
    expect(s.retryStation('timer', 21)).toBe(true);
    s.update(1 / 60);
    expect(s.station()).toBe(21);
    expect(s.hasFlag(A8_GRILLE_IN_FLAG)).toBe(true);
    s.setFlag('a8-sync');
    s.update(1 / 60);
    expect(s.station()).toBe(0);
    for (const id of ['a8-split', 'a8-office', 'a8-grille', 'a8-beams', 'a8-sync']) expect(def.objectives!.some((o) => o.id === id), id).toBe(true);
  });

  it('(marlow-play C5) a 20 or 21 retry never takes a step back: the office step is 19\'s, the grille step is done on a8-grille-in and is 20\'s; the built yard keeps a8-lobby', () => {
    expect(def.objectives!.find((o) => o.id === 'a8-grille')!.done).toEqual({ flag: A8_GRILLE_IN_FLAG });
    const plain = buildCtcourse(new LevelBuilder());
    expect(plain.parts[7]!.objectives.find((o) => o.id === 'a8-grille')!.done).toEqual({ flag: 'a8-lobby' });
    const s = runAt([107.5, 64.0], [107.5, 65.5]);
    s.setFlag('a8-gal1');
    s.setFlag(A8_OFFICE_IN_FLAG);
    s.update(1 / 60);
    s.setFlag('a8-loop');
    s.update(1 / 60);
    expect(s.station()).toBe(20);
    expect(s.isStepDone('a8-office')).toBe(true);
    // the loop runs out, then a caught 20: the office step stays ticked (it latched while 20 was live)
    s.clearFlag('a8-loop');
    expect(s.retryStation('caught')).toBe(true);
    s.update(1 / 60);
    expect(s.isStepDone('a8-office')).toBe(true);
    expect(s.currentStep()?.id).toBe('a8-grille');
    // B through the grille: the grille step ticks on 20's flag; A reaching the lobby during 21 then a 21 retry keeps it
    s.setFlag(A8_GRILLE_IN_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(21);
    expect(s.isStepDone('a8-grille')).toBe(true);
    s.setFlag('a8-lobby');
    s.update(1 / 60);
    expect(s.retryStation('caught')).toBe(true);
    s.update(1 / 60);
    expect(s.isStepDone('a8-office')).toBe(true);
    expect(s.isStepDone('a8-grille')).toBe(true);
    expect(s.currentStep()?.id).toBe('a8-beams');
  });

  it('the pass zones: a8-office-in [134.25, 75.5, 136, 77.75] at floor 4.4 and a8-grille-in [134.3, 60.5, 136, 63.5] at floor 0, any one player, flags external; the zones sit inside the office door and just through the grille', () => {
    const o = part.passZones.find((z) => z.flag === A8_OFFICE_IN_FLAG)!;
    const g = part.passZones.find((z) => z.flag === A8_GRILLE_IN_FLAG)!;
    expect(o).toEqual({ id: 'a8-p-office-in', box: [134.25, 75.5, 136, 77.75], flag: 'a8-office-in', floorY: 4.4, any: true });
    expect(g).toEqual({ id: 'a8-p-grille-in', box: [134.3, 60.5, 136, 63.5], flag: 'a8-grille-in', floorY: 0, any: true });
    expect([A8_OFFICE_IN_ZONE, A8_GRILLE_IN_ZONE]).toEqual([o.box, g.box]);
    expect(part.externalFlags).toEqual(expect.arrayContaining([A8_OFFICE_IN_FLAG, A8_GRILLE_IN_FLAG]));
    expect(built.layout.passZones!.filter((z) => z.id.startsWith('a8-p-')).map((z) => z.id)).toEqual(['a8-p-gal1', 'a8-p-lobby', 'a8-p-inner1', 'a8-p-office-in', 'a8-p-grille-in']);
    // the office zone is past the door (door at x 134, z 76.0-77.2); the grille zone starts 0.3 m past the grille line (door at x 134, z 61.1-62.9)
    const d = doorAnchor(A8_OFFICE_DOOR);
    expect(d.hinge.x).toBeLessThan(o.box[0]);
    expect(d.hinge.z).toBeGreaterThanOrEqual(o.box[1] - 0.5);
    expect(g.box[0]).toBeGreaterThan(134);
    expect(g.box[1]).toBeLessThan(61.1);
    expect(g.box[3]).toBeGreaterThan(62.9);
  });
});

describe('Marlow re-plan A8: the public stair, 2.4 m', () => {
  const steps = mine.filter((p) => !p.collide && p.s[1] > 0.1 && p.c[0] > A8_STAIR.x0 && p.c[0] < A8_STAIR.x1 && p.c[2] > 67 && p.c[2] < 75.1);

  it('27 risers rising north from z 67.3 to the gallery at 4.4, 2.4 m wide (x 130.5-132.9, the graph open_stair), a ramp collider and the underside filled; the built flight is 1.2 m', () => {
    expect(A8_STAIR).toEqual({ x0: 130.5, x1: 132.9, foot: 67.3 });
    expect(A8_STAIR.x1 - A8_STAIR.x0).toBeCloseTo(2.4, 9);
    expect(A8_PUBLIC_STAIR.x1 - A8_PUBLIC_STAIR.x0).toBeCloseTo(1.2, 9);
    expect(steps).toHaveLength(27);
    expect(steps[0]!.s[0]).toBeCloseTo(2.4, 9);
    expect(Math.max(...steps.map(top))).toBeCloseTo(4.4, 9);
    expect(Math.min(...steps.map((p) => p.c[2] - p.s[2] / 2))).toBeCloseTo(67.3, 3);
    expect(Math.max(...steps.map((p) => p.c[2] + p.s[2] / 2))).toBeCloseTo(75.0, 1);
    expect(4.4 / 27).toBeLessThanOrEqual(MOVEMENT.maxStep);
    const ramp = mine.filter((p) => p.collide && Math.abs(p.pitch) > 1e-3 && p.c[0] > 130 && p.c[0] < 133);
    expect(ramp).toHaveLength(1);
    expect(ramp[0]!.s[0]).toBeCloseTo(2.4, 9);
    const fillers = mine.filter((p) => p.collide && !p.visible && Math.abs(p.pitch) < 1e-3 && p.c[0] > 130.4 && p.c[0] < 133 && p.c[2] > 67 && p.c[2] < 75.1 && p.s[0] > 2.3);
    expect(fillers.length).toBeGreaterThan(10);
    for (const f of fillers) expect(f.noLedge).toBe(true);
    // none of the built 1.2 m flight is left: no step box 1.2 wide
    expect(mine.filter((p) => !p.collide && Math.abs(p.s[0] - 1.2) < 1e-6 && p.s[1] > 0.1 && p.c[0] > 130.4 && p.c[0] < 131.8 && p.c[2] > 67 && p.c[2] < 75.1)).toEqual([]);
  });

  it('the rails: 13 collision segments a side on x 130.45 and 132.95, 0.05 m outside the flight, so 2.4 m is clear between their faces; the foot stays open; a body walks the whole ramp on both sides', () => {
    const rails = mine.filter((p) => p.collide && p.visible === false && A8_STAIR_RAILS.x.some((x) => Math.abs(p.c[0] - x) < 1e-6));
    expect(rails).toHaveLength(26);
    for (const r of rails) expect(r.noLedge).toBe(true);
    const west = rails.filter((p) => Math.abs(p.c[0] - 130.45) < 1e-6);
    const east = rails.filter((p) => Math.abs(p.c[0] - 132.95) < 1e-6);
    expect([west.length, east.length]).toEqual([13, 13]);
    const gap = Math.min(...east.map((p) => p.c[0] - p.s[0] / 2)) - Math.max(...west.map((p) => p.c[0] + p.s[0] / 2));
    expect(gap).toBeCloseTo(2.4, 6);
    expect(Math.min(...rails.map((p) => p.c[2] - p.s[2] / 2))).toBeGreaterThanOrEqual(68.15 - 1e-6);
    // the ramp walk: at every 0.1 m of z, on the flight's line, a radius-0.3 body at the two edges and the middle touches nothing
    for (const x of [130.85, 131.7, 132.55]) {
      for (let z = 67.3; z <= 75.0; z += 0.1) expect(blockedAt(x, z, MOVEMENT.radius, (4.4 * (z - 67.3)) / (27 * 0.285)), `(${x}, ${z.toFixed(1)})`).toEqual([]);
    }
    for (const x of [130.85, 131.7, 132.55]) expect(blockedAt(x, 66.6)).toEqual([]);
    expect(blockedAt(131.7, 75.6, MOVEMENT.radius, 4.4)).toEqual([]);
  });

  it('0.6 m or more past the column and the desk: the night desk is 0.7 m off the west rail, the east wall 0.85 m past the east rail, no column within 3 m of the flight; the fourth north column (x 133) is not built, the east piece starts at x 132.9', () => {
    expect(A8_REPLAN_COLUMN_OUT).toBe(133);
    const cols = mine.filter((p) => p.collide && Math.abs(p.s[0] - 0.4) < 1e-6 && Math.abs(p.s[2] - 0.4) < 1e-6 && Math.abs(top(p) - A8_H.slab) < 1e-6 && Math.abs(p.c[2] - 75) < 1e-6);
    expect(cols.map((p) => p.c[0]).sort((p, q) => p - q)).toEqual([112, 115, 121, 127]);
    expect(A8_COLUMNS_N).toContain(133);
    for (const c of cols) expect(Math.max(A8_STAIR.x0 - (c.c[0] + 0.2), c.c[0] - 0.2 - A8_STAIR.x1), `column ${c.c[0]}`).toBeGreaterThanOrEqual(0.6);
    const westRailFace = 130.45 - 0.05;
    const eastRailFace = 132.95 + 0.05;
    expect(westRailFace - A8_DESK.x1).toBeGreaterThanOrEqual(0.6);
    expect(A8_NORTH.x1 - eastRailFace).toBeGreaterThanOrEqual(0.6);
    // a body passes between the desk and the west rail and between the east rail and the wall (z along the desk and the whole east strip)
    for (let z = 69.5; z <= 71.5; z += 0.1) expect(blockedAt((A8_DESK.x1 + westRailFace) / 2, z, MOVEMENT.radius, 0), `desk gap z ${z.toFixed(1)}`).toEqual([]);
    for (let z = 67.5; z <= 77.0; z += 0.1) expect(blockedAt((eastRailFace + A8_NORTH.x1) / 2, z), `east strip z ${z.toFixed(1)}`).toEqual([]);
    const east = mine.find((p) => p.collide && p.c[2] === 75.1 && Math.abs(p.c[1] - (4.4 + 1.2 / 2)) < 1e-6 && p.c[0] > 132)!;
    expect(east.c[0] - east.s[0] / 2).toBeCloseTo(132.9, 9);
    expect(east.c[0] + east.s[0] / 2).toBeCloseTo(133.85, 9);
    expect(mine.some((p) => p.collide && Math.abs(p.c[0] - 133) < 1e-6 && Math.abs(p.s[0] - 0.4) < 1e-6 && Math.abs(p.c[2] - 75) < 1e-6)).toBe(false);
  });
});

describe('Marlow re-plan A8: the glazed office wall', () => {
  const lens = (c: { at: [number, number]; y: number; level: string }): V3 => [c.at[0], c.y + (A8_LEVELS[c.level] ?? 0), c.at[1]];
  const glass = mine.filter((p) => p.collide && p.visible === false && Math.abs(p.c[0] - 134) < 1e-6 && Math.abs(p.s[0] - 0.1) < 1e-6 && Math.abs(p.s[1] - 3.0) < 1e-6);

  it('one 3.0 m glass box on x 134, z 71.25-76.0, from the office floor 4.4 to 7.4, under a solid head 7.4-9.0 (z 71.25-76.0); the door A8-office (z 76.0-77.2, lintel) and the wall north of it are as built', () => {
    expect(glass).toHaveLength(1);
    const g = glass[0]!;
    expect([bottom(g), top(g)].map((v) => Number(v.toFixed(3)))).toEqual([4.4, 7.4]);
    expect([g.c[2] - g.s[2] / 2, g.c[2] + g.s[2] / 2].map((v) => Number(v.toFixed(3)))).toEqual([A8_GLASS.z0, A8_GLASS.z1]);
    expect(g.noLedge).toBe(true);
    const head = mine.find((p) => p.collide && bottom(p) > 7.39 && top(p) < 9.01 && Math.abs(p.c[0] - 134) < 1e-6 && Math.abs(p.s[0] - 0.3) < 1e-6 && p.c[2] < 76)!;
    expect([bottom(head), top(head)].map((v) => Number(v.toFixed(3)))).toEqual([7.4, 9.0]);
    expect([head.c[2] - head.s[2] / 2, head.c[2] + head.s[2] / 2].map((v) => Number(v.toFixed(3)))).toEqual([71.25, 76.0]);
    // the built solid wall piece (z 71.4-76.0, 4.4-9.0) is gone: nothing solid but the glass between 4.4 and 7.4 at x 134 for z 71.3-76.0
    for (let z = 71.45; z < 76.0; z += 0.1) {
      const hit = solid.filter((p) => segHits([134, 5.0, z], [134, 7.0, z], p)).filter((p) => p !== glass[0]);
      expect(hit, `wall at z ${z.toFixed(2)}`).toEqual([]);
    }
    const d = doorAnchor(A8_OFFICE_DOOR);
    expect(d.hinge).toMatchObject({ x: 134, y: 4.4, z: 76.0 });
    expect(d.width).toBeCloseTo(1.2, 9);
    expect(d.height).toBeCloseTo(2.1, 9);
    for (const z of [76.3, 76.6, 77.0]) expect(solid.some((p) => segHits([134, 6.6, z], [134, 8.9, z], p)), `lintel at z ${z}`).toBe(true);
    for (const z of [76.3, 76.6, 77.0]) expect(solid.some((p) => segHits([134, 4.5, z], [134, 6.4, z], p)), `door gap at z ${z}`).toBe(false);
    expect(solid.some((p) => segHits([134, 5.0, 77.5], [134, 7.0, 77.5], p))).toBe(true);
  });

  it("it stops guard sight: from the gallery deck and the hall into the office (and out of it), at standing and crouched heads, every line is blocked; teeth: the same lines through the door's gap are not", () => {
    const officer = part.squads[A8_OFFICER]!;
    for (const [fx, fz] of [[130, 74.0], [132.5, 73.0], [133.3, 75.5], [133.5, 72.0]] as const) {
      for (const head of [1.0, 1.6]) {
        const from: V3 = [fx, 4.4 + head, fz];
        const to: V3 = [officer.x, 4.4 + 1.6, officer.z];
        expect(blockers(from, to).length, `from (${fx}, ${fz}) at ${head}`).toBeGreaterThan(0);
      }
    }
    // a guard on the stair (heads 1.0-3.4 over the flight) cannot see the console from the stair head or the hall above the glass line either
    for (const y of [3.0, 4.5, 5.5]) expect(blockers([131.7, y, 72.0], [officer.x, 6.0, officer.z]).length, `stair at ${y}`).toBeGreaterThan(0);
    // through the door's gap (z 76.6, opened) nothing solid is in the way: the line along z 76.6 from the deck to the office floor
    expect(blockers([132.0, 5.8, 76.6], [136.0, 5.8, 76.6])).toEqual([]);
    // the cameras: C2's lens, on the hall side of the wall, sees the deck as built; the office is not in its view through the wall
    const c2 = part.cameras[1]!;
    expect(c2.level).toBe(A8_GALLERY_LEVEL);
    expect(blockers(lens(c2), [138, 4.4 + 1.6, 74.7]).length).toBeGreaterThan(0);
    for (const x of [127, 130, 133]) expect(blockers(lens(c2), [x, 5.45, 76.0]).map((p) => p.c.join())).toEqual([]);
  });

  it('the office switch moved to the jamb strip north of the door (z 77.5, on the west wall); the glass left its old place (z 75.6) free of switch and plate', () => {
    const sw = part.switches.find((s) => s.id === 'a8-sw-office')!;
    expect(sw.pos.z).toBe(A8_OFFICE_SWITCH_Z);
    expect(sw.pos.x).toBeCloseTo(134.25, 9);
    expect(sw.group).toBe(83);
    expect(sw.pos.z).toBeGreaterThan(77.2);
    expect(sw.pos.z).toBeLessThan(77.75);
    const gal = part.switches.find((s) => s.id === 'a8-sw-gallery')!;
    expect(gal.pos.x).toBeCloseTo(132.85, 9);
    expect(gal.group).toBe(82);
  });
});

describe('Marlow re-plan A8: the side routes are kept (Q24)', () => {
  it('the public stair: the foot is open floor from the hall and the head steps onto the gallery (the ramp walk is in the stair cases above)', () => {
    for (const to of [[131.7, 66.6], [130.9, 66.3], [132.5, 66.3]] as const) expect(reaches(PUBLIC, [to[0], to[1]]), `(${to})`).toBe(true);
    // the east strip beside the flight (0.85 m) and the desk's gap are floor to the board strip: the board's west side reaches the grille spot either way
    expect(reaches([126.4, 76.5], [133.0, 62.0])).toBe(true);
  });

  it('the loop round the counters, both ends: the staff side (the jam spot) is reached from the public floor round the west end and round the return\'s south end; with both shut it is not (teeth)', () => {
    const jam: [number, number] = [A8_JAM.x, A8_JAM.z];
    const westEnd = solidBox(106.25, 114.0, 65.5, 66.24);
    const southEnd = solidBox(125.26, 126.0, 50.25, 58.3);
    expect(reaches(PUBLIC, jam)).toBe(true);
    // the west end shut (the main run carried to the west wall): still reached round the return's south end
    expect(reaches(PUBLIC, jam, [westEnd])).toBe(true);
    // the return's south end shut (carried to the south wall): still reached round the west end
    expect(reaches(PUBLIC, jam, [southEnd])).toBe(true);
    // both shut: not (the check has teeth), and the board strip's side is the same pocket
    expect(reaches(PUBLIC, jam, [westEnd, southEnd])).toBe(false);
    // the strip behind the return, from the south
    expect(reaches([127.8, 56.0], [127.8, 62.0])).toBe(true);
  });

  it('the request-to-exit button in the lobby: its floor spot (0.85 m off the south wall at x 136.3) is reached from the hall through the grille opening', () => {
    expect(reaches(PUBLIC, [A8_RTE_AT.x, A8_RTE_AT.z + 0.9])).toBe(true);
    expect(part.devices['a8-rte']).toMatchObject({ x: 136.3, z: 56.15 });
    expect(part.bay.gates.find((g) => g.id === 'g-a8-rte')).toMatchObject({ kind: 'egress', doorIds: ['A8-grille'] });
  });
});

describe('Marlow re-plan A8: the counters and the jam on C2', () => {
  const c2 = part.cameras[1]!;
  const lensAt: V3 = [c2.at[0], c2.y + A8_LEVELS[c2.level]!, c2.at[1]];

  it('the staff side of the main run (z 65.5-66.24) is NORTH: the oak back panels stand on its north face (z 66.24), the jam spot (118, 67.2) is on that side, and the staff pocket is bounded by the desk (z 70) and the stair rail (x 130.4)', () => {
    const panel = (z: number) => mine.filter((p) => !p.collide && Math.abs(p.c[2] - z) < 0.02 && Math.abs(p.s[2] - 0.03) < 1e-6 && p.c[0] - p.s[0] / 2 <= 114.01 && p.c[0] + p.s[0] / 2 >= 125.9);
    expect(panel(A8_COUNTER_MAIN.z1 + 0.015).length).toBeGreaterThan(0);
    expect(panel(A8_COUNTER_MAIN.z0 - 0.015)).toEqual([]);
    expect(A8_JAM.z).toBeGreaterThan(A8_COUNTER_MAIN.z1);
    expect(A8_JAM.z).toBeLessThan(A8_DESK.z0);
    expect(A8_JAM.x).toBeGreaterThan(A8_COUNTER_MAIN.x0);
    expect(A8_JAM.x).toBeLessThan(A8_COUNTER_MAIN.x1);
    // the return's east face (x 126.0) is the clerks' side too: the strip x 126-130.4, z 58.3-66.24 (graph a8-counters' second box)
    expect(mine.some((p) => !p.collide && Math.abs(p.c[0] - (A8_COUNTER_RETURN.x1 + 0.015)) < 0.02 && Math.abs(p.s[0] - 0.03) < 1e-6)).toBe(true);
    expect(blockedAt(A8_JAM.x, A8_JAM.z)).toEqual([]);
    expect(blockedAt(128.0, 62.0)).toEqual([]);
  });

  it("the floor partner at (118, 67.2) jams C2 (133.75, 4.4 + mount 3.0, 73.0; range 10): the lens is within the jammer's 18 m on a line with no box (the new rails, glass and column included), and the jam stays out of C1's 14 m", () => {
    expect(c2.range).toBe(10);
    expect(lensAt).toEqual([133.75, 7.4, 73.0]);
    const eye: V3 = [A8_JAM.x, 1.5, A8_JAM.z];
    const d = hyp3(lensAt[0] - eye[0], lensAt[1] - eye[1], lensAt[2] - eye[2]);
    expect(d).toBeLessThanOrEqual(JAMMER.range);
    expect(d).toBeGreaterThan(16);
    expect(blockers(eye, lensAt)).toEqual([]);
    for (const dy of [-0.4, 0, 0.4]) for (const dz of [-0.3, 0, 0.3]) expect(blockers([eye[0], eye[1] + dy, eye[2] + dz], lensAt), `eye ${dy} ${dz}`).toEqual([]);
    // 3.5 m or more over the 2.4 m stair's east rail (x 132.95)
    const t = (132.95 - eye[0]) / (lensAt[0] - eye[0]);
    expect(eye[1] + t * (lensAt[1] - eye[1]) - 2.9).toBeGreaterThan(3.5);
    const c1 = part.cameras[0]!;
    expect(hyp2(A8_JAM.x - c1.at[0], A8_JAM.z - c1.at[1])).toBeGreaterThan(14);
  });
});

describe('Marlow re-plan A8: circuits 85 and 86', () => {
  const g85 = lamps.filter((l) => l.group === 85);
  const g86 = lamps.filter((l) => l.group === 86);

  it('group 85, the vestibule: 2 ceiling panels (the circuit row\'s lamp count) at 3.8 under the return slab, between its soffit beams, switch a8-sw-vestibule by the L7 door (within 1 m of the plan point); group 86: 2 lamps, switch a8-sw-west (within 1 m)', () => {
    const row = (g: number) => MARLOW_CIRCUITS_REPLAN.find((c) => c.group === g)!;
    expect(g85).toHaveLength(row(85).lamps);
    expect(g86).toHaveLength(row(86).lamps);
    expect([row(85).lamps, row(86).lamps]).toEqual([2, 2]);
    for (const l of [...g85, ...g86]) {
      expect(l.electric).toBe(true);
      expect(l.destructible).toBe(true);
      expect(l.on).toBe(true);
    }
    expect(g85.map((l) => [l.x, l.y, l.z])).toEqual(A8_VESTIBULE_LAMPS.map((p) => [...p]));
    for (const l of g85) {
      expect(l.y).toBeLessThan(A8_H.slab);
      expect(l.x).toBeGreaterThan(106.25);
      expect(l.x).toBeLessThan(108.8);
      // between the soffit beams (z 58.0 + 2.75 k, 0.2 wide): the panel's 0.6 m body clears them
      for (let z = 58.0; z < 75; z += 2.75) expect(Math.abs(l.z - z)).toBeGreaterThan(0.1 + 0.3);
    }
    const counter = g86.find((l) => l.y < 2)!;
    const wall = g86.find((l) => l.y >= 2)!;
    expect([counter.x, counter.y, counter.z]).toEqual([A8_WEST_COUNTER_LAMP.x, A8_WEST_COUNTER_LAMP.y, A8_WEST_COUNTER_LAMP.z]);
    expect(counter.y - A8_COUNTER_MAIN.h).toBeCloseTo(0.4, 9);
    expect(counter.x).toBeGreaterThan(A8_COUNTER_MAIN.x0);
    expect(counter.x).toBeLessThan((A8_COUNTER_MAIN.x0 + A8_COUNTER_MAIN.x1) / 2);
    expect([wall.x, wall.y, wall.z]).toEqual([A8_WEST_WALL_LAMP.x, A8_WEST_WALL_LAMP.y, A8_WEST_WALL_LAMP.z]);
    // the wall light stands 0.05-0.15 m off the new column's south face (z 74.8)
    expect(74.8 - wall.z).toBeGreaterThan(0.05);
    expect(74.8 - wall.z).toBeLessThan(0.3);
    const plan = (id: string) => MARLOW_CIRCUITS_REPLAN.flatMap((c) => c.switches).find((s) => s.id === id)!;
    const swV = part.switches.find((s) => s.id === 'a8-sw-vestibule')!;
    const swW = part.switches.find((s) => s.id === 'a8-sw-west')!;
    expect([swV.group, swW.group]).toEqual([85, 86]);
    expect(hyp2(swV.pos.x - plan('a8-sw-vestibule').x, swV.pos.z - plan('a8-sw-vestibule').z)).toBeLessThan(1);
    expect(hyp2(swW.pos.x - plan('a8-sw-west').x, swW.pos.z - plan('a8-sw-west').z)).toBeLessThan(1);
    expect(swV).toMatchObject({ pos: A8_VESTIBULE_SWITCH.pos });
    expect(swW).toMatchObject({ pos: A8_WEST_SWITCH.pos });
    // the switches are in the layout, the groups live
    expect(built.layout.switches!.filter((s) => s.group === 85 || s.group === 86)).toHaveLength(2);
    expect(part.groups['a8-vestibule']).toBe(85);
    expect(part.groups['a8-west']).toBe(86);
    expect(course.groups).toMatchObject({ 'a8-vestibule': 85, 'a8-west': 86 });
    // the whole set stays inside the per-set lamp budget (24)
    expect(lamps.length).toBeLessThanOrEqual(24);
  });

  it('the west bays\' column: 0.4 m square at x 112, z 75 to the slab under the gallery front, noLedge; the switch (y 1.2) and the wall light (y 2.3) face south on it; no other piece of the set moved onto it', () => {
    const col = mine.find((p) => p.collide && Math.abs(p.c[0] - 112) < 1e-6 && Math.abs(p.c[2] - 75) < 1e-6)!;
    expect([col.s[0], col.s[2], top(col), bottom(col)].map((v) => Number(v.toFixed(3)))).toEqual([0.4, 0.4, A8_H.slab, 0]);
    expect(col.noLedge).toBe(true);
    expect(A8_WEST_COLUMN).toEqual({ x: 112, z: 75, w: 0.4 });
    expect(A8_WEST_SWITCH.pos.y).toBe(1.2);
    expect(A8_WEST_SWITCH.pos.z).toBeGreaterThan(74.7);
    expect(A8_WEST_SWITCH.pos.z).toBeLessThan(74.8);
    expect(A8_WEST_SWITCH.yaw).toBe(Math.PI);
    // standing room in front of the switch and the wall light
    expect(blockedAt(112.0, 74.0)).toEqual([]);
  });
});

describe('Marlow re-plan A8: the steps and the lines', () => {
  const steps = def.objectives!.filter((o) => o.bay === 'A8');

  it('the built chain stays (split, office, grille, beams, sync, out); two lines change: the west end is not dark, the jam is made from behind the counters; what and where, no fail', () => {
    expect(steps.map((o) => o.id)).toEqual(['a8-split', 'a8-office', 'a8-grille', 'a8-beams', 'a8-sync', 'a8-out']);
    expect(steps[0]!.a).toBe('Take the boost to the gallery at the west end, over the vestibule.');
    expect(steps[0]!.a).not.toMatch(/dark/i);
    expect(steps[1]!.b).toBe('Jam the gallery camera from behind the counters for your partner.');
    expect(steps[5]!.done).toBeUndefined();
    for (const o of steps) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(/[–—]/.test(t), t).toBe(false);
        expect(t, t).not.toMatch(/fail/i);
      }
      expect(o.id.length).toBeLessThanOrEqual(OBJECTIVE_ID_MAX);
    }
    // the built yard's chain keeps its line
    const plain = buildCtcourse(new LevelBuilder());
    expect(plain.parts[7]!.objectives.find((o) => o.id === 'a8-split')!.a).toBe('Take the boost to the gallery at the dark west end.');
  });

  it("LANTERN's six retry lines exist (STATIONS section 6, verbatim) and fit 90 characters; no radio line says fail; the built lines are kept", () => {
    const at = (k: string) => part.bay.radio.filter((r) => r.at === k).map((r) => r.text);
    expect(at(retryKey('a8-c2run'))).toEqual(['Caught in the banking hall. Back to the vestibule.']);
    expect(at(retryKey('a8-loopset'))).toEqual(['Caught at the security office. Back to the office door and the board.']);
    expect(at(retryKey('a8-isolate'))).toEqual(['Caught at the lighting board. Back to the board.']);
    expect(at(retryKey('a8-isolate', true))).toEqual(['The hall lights came back. Back to the lighting board.']);
    expect(at(retryKey('a8-locks'))).toEqual(['Caught in the vault lobby. Back to the office console and the lobby.']);
    expect(at(retryKey('a8-locks', true))).toEqual(['The cameras came back. Loop them again from the office console.']);
    expect(Object.keys(A8_RETRY_LINES).sort()).toEqual(['retry:a8-c2run', 'retry:a8-isolate', 'retry:a8-isolate:timer', 'retry:a8-locks', 'retry:a8-locks:timer', 'retry:a8-loopset']);
    expect(at(retryKey('a8-loopset', true))).toEqual([]);
    expect(at(retryKey('a8-c2run', true))).toEqual([]);
    for (const r of part.bay.radio) {
      expect(r.text.length, r.text).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(r.text), r.text).toBe(false);
      expect(r.text, r.text).not.toMatch(/fail/i);
    }
    expect(at('enter').join(' ')).toMatch(/Last one/);
    expect(at('a8-split').length).toBe(1);
    expect(at('warn:g-a8-night')).toEqual(['Lights back in five.', "Grille's locking again."]);
    expect(at('warn:g-a8-console')).toEqual(['Cameras back in five.']);
  });

  it("the light file is the re-plan's own (22 spots), the vestibule and the jam spot read lit, each new switch cuts its circuit dark", () => {
    const tuned = (JSON.parse(readFileSync('tests/ctcourse/replan/a8Strongroom.light.json', 'utf8')) as { levels: Record<string, number> }).levels;
    expect(Object.keys(tuned)).toEqual(part.lightSpots.map((s) => s.name));
    expect(part.lightSpots).toHaveLength(22);
    for (const n of ['A8 vestibule', 'A8 jam spot', 'A8 west bay']) expect(tuned[n]!, n).toBeGreaterThanOrEqual(0.4);
    for (const n of ['A8 vestibule cut', 'A8 jam spot cut', 'A8 west bay cut']) expect(tuned[n]!, n).toBeLessThanOrEqual(0.24);
    expect(part.lightSpots.find((s) => s.name === 'A8 vestibule cut')).toMatchObject({ band: 'cut', off: [85] });
    expect(part.lightSpots.find((s) => s.name === 'A8 jam spot cut')).toMatchObject({ band: 'cut', off: [86] });
    expect(part.lightSpots.find((s) => s.name === 'A8 west bay cut')).toMatchObject({ band: 'cut', off: [86] });
  });
});
