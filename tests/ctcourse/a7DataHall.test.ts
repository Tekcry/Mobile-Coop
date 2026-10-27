/**
 * A7 the Data Hall (marlow-final slice 7; set doc `docs/marlow-final/sets/a7DataHall.md`): the set's own cases. The synced hack is
 * the only way into the cage (the doors on the sync, the lid, the six fence anchors locked for good, no solo top near it, every
 * block `noLedge`), the two terminals are a scanner pair over `syncMinGap` that one player cannot serve (`scanStart`, the reach
 * from every floor point), each ready lamp is seen from the other terminal through the mesh, the cameras watch what the build
 * says (`a7-cam1` short of T1's spot, C2; `a7-cam2`'s two blind windows and the cooling units' lees) and the jam lines pass the
 * mesh but not the kick band, every lamp is on its circuit with the tuned levels, the technician is an armed `grunt` on a
 * walkable loop inside the 71 lure, the steps validate and read per player with the corridor claim, the pass zone and the sync
 * open the doors. The last block is the dressing (slice 7 step 5): the greybox pinned (no new collision at all), every hand-built box a
 * thin skin, the racks and cooling units as props over the greybox boxes (5 cm proud, ends capped), the budgets, the cage, door, camera
 * and lane clearances, the raised floor and grating, the riser block as a services core, every kit glow on its circuit. The map-wide
 * frames (`tests/ctcourse.test.ts`, `tests/ctcourseLight.test.ts`) run the contract, the register
 * and the light bands over this part too. Moved here from the old station 6 scanner cases (`A7_SCANNERS`).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/ai/enemyDefs';
import { EYE_STAND } from '../../src/ai/perception';
import { PatrolWalker } from '../../src/ai/patrol';
import { generateLedges } from '../../src/world/anchors';
import { LevelBuilder, type BoxPiece } from '../../src/world/levelBuilder';
import { surfaceAt } from '../../src/world/surfaces';
import { MOVEMENT } from '../../src/config/movement';
import { COURSE_TEXT_MAX } from '../../src/config/course';
import { CAMERA } from '../../src/config/security';
import { layoutKnownIds, validateCourse, type FlagGate } from '../../src/game/course/courseDef';
import { CourseState } from '../../src/game/course/courseState';
import { JAMMER } from '../../src/game/jammer';
import { newScanPair, newScanResult, REFUSE_SCAN_OTHER, SCAN_GLOW, scanGlowAt, SCANNER, scanStart, scanStep, SC_IDLE } from '../../src/game/scanners';
import { camPitch, camRange, inFrame, sweepCycle, sweepYaw } from '../../src/security/camera';
import { validateSecurity, type CameraDevice } from '../../src/security/data';
import { remoteHeadY } from '../../src/security/securitySystem';
import { hyp2 } from '../../src/core/mathx';
import { buildCtcourse, ctcourse, LIGHT_SPOTS } from '../../src/world/maps/ctcourse';
import { SILENT_CROUCH, syncMinGap, syncStation } from '../../src/world/maps/ctcourseGreybox';
import { kitTriangles } from '../../src/world/kit/facilityKit';
import { FacilityProps, propGlows, PROP_OWN_SUPPLY, propCollisionBox, propDraws, propToWorld, propTriangles, PROP_FOOTPRINT, PROP_HUNG, PROP_SET_BUDGET, type PropPlacement, type PropReport } from '../../src/world/props/facilityProps';
import { CANON_MIN_THICK } from '../../src/voxel/lightShapes';
import {
  A7_CABINET,
  A7_CAGE,
  A7_CAGE_E,
  A7_CAGE_W,
  A7_CAM1,
  A7_CAM2,
  A7_CORRIDOR_CLAIM,
  A7_EAST_DOOR,
  A7_GATE_CAGE_E,
  A7_GATE_CAGE_W,
  A7_GATE_EAST,
  A7_GRATING,
  A7_H,
  A7_HALL_DOOR,
  A7_LEES,
  A7_NEVER_FLAG,
  A7_PANEL_Y,
  A7_PASS_WAIT,
  A7_PROP_LIFT,
  A7_PLANT_DOOR,
  A7_POD_DOOR,
  A7_POD_FLAG,
  A7_POD_ZONE,
  A7_RACK_FRONT,
  A7_RACK_H,
  A7_RACK_PITCH,
  A7_RACK_PROUD,
  A7_RACKS,
  A7_SCANNER,
  A7_SYNC_FLAG,
  A7_SYNC_WALK,
  A7_T1,
  A7_T1_AT,
  A7_T1_SPOT,
  A7_T2,
  A7_T2_AT,
  A7_T2_SPOT,
  A7_TECH,
  A7_TECH_FACES,
  A7_TECH_ROUTE,
  A7_TECH_WAITS,
  A7_RISER,
  A7_TRAYS,
  A7_UNIT,
  A7_UNIT_Z,
  A7_UNITS,
} from '../../src/world/maps/ctcourseSets/a7DataHall';
import { GAL_TOP } from '../../src/world/maps/ctcourseSets/facility';
import { checkSetPart, HALL_H, holdDoorId, inBox, OBJECTIVE_ID_MAX, registerSum, SET_BOX, setExitDoor, setGroups } from '../../src/world/maps/ctcourseSets/types';
import { circuitOf, LURE_RANGE, marlowCourseGroups } from '../../src/world/lighting/marlowCircuits';
import { MARLOW_LEVEL } from '../../src/world/lighting/levels';
import { MANTLE, soloJumpThreats } from '../helpers/soloJumpReach';
import { runtimeNav } from '../helpers/runtimeNav';

const b = new LevelBuilder();
const built = buildCtcourse(b);
const part = built.parts[6]!;
const lay = built.layout;
const course = lay.course!;
const def = course.def;
const range = built.ranges.a7DataHall;
const mine = b.boxes.slice(range.boxes[0], range.boxes[1]);
/** The greybox as S7 built it (slice 7 steps 2-4): its 47 boxes (37 solids), 15 lamps, 5 doors, 6 anchors. The dressing is appended after.
 *  (marlow-a7-cabinet) Was 46 boxes, 36 solids: + the cage's equipment cabinet, one solid box (the checksum moved with it). */
const GREY = { boxes: 47, solids: 37, lights: 15, doors: 5, anchors: 6, checksum: 17774.157384388884 };
const grey = mine.slice(0, GREY.boxes);
const dressing = mine.slice(GREY.boxes);
const box = SET_BOX.a7DataHall[0]!;
const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && inBox(box, l.x, l.z));
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
/** Every collision box of the map, a quarter-turned one folded to its axis-aligned footprint (the glass sidelights). */
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.pitch) < 1e-3).map((p) => (Math.abs(Math.sin(p.yaw)) > 0.5 ? { ...p, s: [p.s[2], p.s[1], p.s[0]] as [number, number, number], yaw: 0 } : p));
const cage = A7_CAGE;
const CAGE_BOX: [number, number, number, number] = [cage.x0, cage.z0, cage.x1, cage.z1];
/** The pod's plan box to the set box's east edge (the facility's wall face is 99.75; the doc's pass zone runs to 99.8). */
const POD_BOX: [number, number, number, number] = [96, 55.95, 100, 68];
const tuned = (JSON.parse(readFileSync('tests/ctcourse/a7DataHall.light.json', 'utf8')) as { levels: Record<string, number> }).levels;
const anchors = generateLedges(b.boxes, b.anchors);

/** The solid boxes whose band (floor to 1.7 m) is within `r` of (x, z): what a body walking there touches. */
const blockedAt = (x: number, z: number, r = MOVEMENT.radius): string[] =>
  solid
    .filter((p) => p.c[1] - p.s[1] / 2 < 1.7 && top(p) > 0.15)
    .filter((p) => hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r)
    .map((p) => `box (${p.c.map((v) => v.toFixed(2)).join(', ')}) size (${p.s.map((v) => v.toFixed(2)).join(', ')})`);
/** A walk from (x0, z0) to (x1, z1) in 0.1 m steps: the first point a body of radius `r` touches a solid, or null. */
const walkBlocked = (x0: number, z0: number, x1: number, z1: number, r = MOVEMENT.radius): string | null => {
  const n = Math.ceil(hyp2(x1 - x0, z1 - z0) / 0.1);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const z = z0 + ((z1 - z0) * i) / n;
    const hit = blockedAt(x, z, r)[0];
    if (hit) return `(${x.toFixed(2)}, ${z.toFixed(2)}): ${hit}`;
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
/** The collision boxes (`G.STATIC`: sight, the jam line, camera rays) the segment p -> q passes through. A fence is no box. */
const blockers = (p: V3, q: V3, among: readonly BoxPiece[] = solid): BoxPiece[] => among.filter((o) => segHits(p, q, o));
const lens = (c: CameraDevice): V3 => [c.at[0], c.y, c.at[1]];
/** Is a head at (x, z) (standing or crouched) in the camera's frame at sweep time `t`? */
const framed = (c: CameraDevice, x: number, z: number, crouched: boolean, t = 0): boolean => inFrame(sweepYaw(c, t), c.at[0], c.y, c.at[1], x, remoteHeadY(0, crouched), z, camPitch(c), camRange(c));
/** A fresh course at set 7 with the two players at the given feet. */
function runAt(a: [number, number], c: [number, number]): CourseState {
  const s = new CourseState(def, course.consoles);
  s.startAt(7);
  s.setPlayer(0, a[0], 0, a[1], false);
  s.setPlayer(1, c[0], 0, c[1], false);
  s.update(1 / 60);
  return s;
}
const splitStep = def.objectives!.find((o) => o.id === 'a7-split')!;
const syncStep = def.objectives!.find((o) => o.id === 'a7-sync')!;
const FENCES = ['a7-fence-w1', 'a7-fence-w2', 'a7-fence-e1', 'a7-fence-e2', 'a7-fence-s', 'a7-fence-n'];
const LOBBY: [number, number] = [73, 61];

describe('A7 the Data Hall: the part', () => {
  it('is built (not the stub) and passes the contract rules', () => {
    expect(part.id).toBe('a7DataHall');
    expect(part.stub).toBeUndefined();
    expect(checkSetPart(part)).toEqual([]);
  });

  it("every register row is an A7 row; the lamps, solids, doors and anchors they count are the builder's", () => {
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A7-1', 'A7-2', 'A7-3', 'A7-4', 'A7-5', 'A7-6', 'A7-7', 'A7-8', 'A7-9', 'A7-10', 'A7-11']));
    const sum = registerSum(part.register);
    expect(sum).toEqual(built.counts.sets.a7DataHall);
    // 15 lamps (70: six strips + the lobby panel, A7-D4; 71: 2; 72: 4; 73: 2), five doors (hall, plant, both cage doors, the pod's),
    // the six fence anchors; every collidable box the part wrote
    expect(sum.lights).toBe(15);
    expect(sum.doors).toBe(5);
    expect(sum.anchors).toBe(6);
    expect(sum.solids).toBe(mine.filter((p) => p.collide).length);
    for (const r of part.register) expect(/[–—]/.test(r.element), r.id).toBe(false);
  });

  it('everything built lies inside the set box (0.3 m of wall slack) and under the 4.0 m slab', () => {
    const [x0, z0, x1, z1] = box;
    expect(mine.length).toBeGreaterThan(30);
    for (const p of mine.filter((q) => Math.abs(q.yaw) < 1e-3)) {
      expect(p.c[0] - p.s[0] / 2, 'west').toBeGreaterThanOrEqual(x0 - 0.3);
      expect(p.c[0] + p.s[0] / 2, 'east').toBeLessThanOrEqual(x1 + 0.3);
      expect(p.c[2] - p.s[2] / 2, 'south').toBeGreaterThanOrEqual(z0 - 0.3);
      expect(p.c[2] + p.s[2] / 2, 'north').toBeLessThanOrEqual(z1 + 0.3);
      expect(top(p)).toBeLessThanOrEqual(A7_H.slab + 0.2 + 1e-6);
    }
    for (const l of lamps) expect(l.y, `lamp ${l.id}`).toBeLessThan(A7_H.slab);
  });

  it('the plan: four 2.2 m rack runs (rows west of the cage, row 1\'s east part on the cage\'s south face), three 2.0 m cooling units, the metal grating across the corridor', () => {
    for (const [x0, x1, z0, z1] of A7_RACKS) {
      const r = mine.find((p) => p.collide && Math.abs(p.c[0] - (x0 + x1) / 2) < 1e-6 && Math.abs(p.c[2] - (z0 + z1) / 2) < 1e-6)!;
      expect(r, `rack ${x0}-${x1}`).toBeDefined();
      expect(top(r)).toBeCloseTo(A7_RACK_H, 9);
      expect(r.noLedge).toBe(true);
    }
    // rows only west of the cage (and row 1's east part along its south face); 3.0 m aisles between them
    expect(A7_RACKS.filter(([x0]) => x0 < cage.x0).every(([, x1]) => x1 <= cage.x0 - 3)).toBe(true);
    expect(A7_RACKS[2]![2] - A7_RACKS[0]![3]).toBeCloseTo(3, 9);
    expect(A7_RACKS[3]![2] - A7_RACKS[2]![3]).toBeCloseTo(3, 9);
    for (const x of A7_UNITS) {
      const u = mine.find((p) => p.collide && Math.abs(p.c[0] - x) < 1e-6 && Math.abs(top(p) - A7_UNIT.h) < 1e-6)!;
      expect(u, `unit ${x}`).toBeDefined();
      expect(u.noLedge).toBe(true);
      expect(u.c[2] + u.s[2] / 2).toBeCloseTo(A7_UNIT.z1, 9);
    }
    // the grating spans the corridor wall to wall: no way round it on concrete
    for (const z of [52.4, 53.9, 55.5]) expect(surfaceAt(b.surfaces, (A7_GRATING.x0 + A7_GRATING.x1) / 2, 0, z, 'concrete')).toBe('metal');
    expect(surfaceAt(b.surfaces, 84, 0, 53.9, 'concrete')).toBe('concrete');
    expect(surfaceAt(b.surfaces, 80.9, 0, 61.5, 'concrete')).toBe('concrete');
  });

  it('every collidable box in A7 is noLedge; the game generates no ledge, lip or split gap in the set', () => {
    for (const p of mine.filter((q) => q.collide)) expect(p.noLedge, `box at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBe(true);
    const inSetBox = (x: number, z: number): boolean => inBox(box, x, z, 0.3);
    expect(anchors.ledges.filter((l) => inSetBox((l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2)).map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
    expect(anchors.splits.filter((s) => inSetBox(s.a.x, s.a.z))).toEqual([]);
    expect(part.lips).toEqual([]);
  });
});

describe('A7 the Data Hall: the cage (the sync is the only way in)', () => {
  const fences = b.anchors.fences.filter((f) => inBox(box, (f.a.x + f.b.x) / 2, (f.a.z + f.b.z) / 2));
  const doorAt = (id: string) => b.anchors.doors.find((d) => d.id === course.doors[id])!;

  it('six b.fence mesh runs, 2.4 m, on the four faces; the two doors fill the gaps; together they close every face', () => {
    expect(fences).toHaveLength(6);
    expect(Object.keys(part.anchors).sort()).toEqual([...FENCES].sort());
    for (const id of FENCES) expect(fences.some((f) => f.id === part.anchors[id])).toBe(true);
    for (const f of fences) {
      expect(f.height).toBeCloseTo(cage.mesh, 9);
      expect(f.a.y).toBe(0);
    }
    // each face covered from corner to corner by mesh and door spans (no gap a body fits)
    const spans = (axis: 'x' | 'z', at: number): [number, number][] => {
      const out: [number, number][] = [];
      for (const f of fences) if ((axis === 'x' ? f.a.x === at && f.b.x === at : f.a.z === at && f.b.z === at)) out.push(axis === 'x' ? [Math.min(f.a.z, f.b.z), Math.max(f.a.z, f.b.z)] : [Math.min(f.a.x, f.b.x), Math.max(f.a.x, f.b.x)]);
      for (const id of [A7_CAGE_W, A7_CAGE_E]) {
        const d = doorAt(id);
        if (axis === 'x' && d.hinge.x === at) out.push([d.hinge.z, d.hinge.z + d.width]);
      }
      return out.sort((p, q) => p[0] - q[0]);
    };
    for (const [axis, at, a0, a1] of [['x', cage.x0, cage.z0, cage.z1], ['x', cage.x1, cage.z0, cage.z1], ['z', cage.z0, cage.x0, cage.x1], ['z', cage.z1, cage.x0, cage.x1]] as const) {
      const s = spans(axis, at);
      expect(s[0]![0], `${axis} ${at} start`).toBeCloseTo(a0, 9);
      expect(s[s.length - 1]![1], `${axis} ${at} end`).toBeCloseTo(a1, 9);
      for (let i = 1; i < s.length; i++) expect(s[i]![0] - s[i - 1]![1], `${axis} ${at} gap`).toBeLessThanOrEqual(1e-9);
    }
  });

  it('solid 1.2 m kick panels under every mesh run, lintels over both doors to the mesh top, and a noLedge lid over the whole cage at 2.4-2.5', () => {
    const kicks = mine.filter((p) => p.collide && Math.abs(top(p) - cage.kick) < 1e-6 && p.c[1] - p.s[1] / 2 < 1e-6);
    expect(kicks).toHaveLength(6);
    for (const k of kicks) {
      expect(Math.min(k.s[0], k.s[2])).toBeCloseTo(cage.panelT, 9);
      expect(k.noLedge).toBe(true);
    }
    const lintels = mine.filter((p) => p.collide && Math.abs(p.c[1] - p.s[1] / 2 - 2.1) < 1e-6 && Math.abs(top(p) - cage.mesh) < 1e-6);
    expect(lintels).toHaveLength(2);
    const lid = mine.find((p) => p.collide && Math.abs(p.c[1] - p.s[1] / 2 - cage.mesh) < 1e-6 && Math.abs(top(p) - (cage.mesh + cage.lidT)) < 1e-6)!;
    expect(lid).toBeDefined();
    expect(lid.noLedge).toBe(true);
    expect(lid.c[0] - lid.s[0] / 2).toBeLessThanOrEqual(cage.x0);
    expect(lid.c[0] + lid.s[0] / 2).toBeGreaterThanOrEqual(cage.x1);
    expect(lid.c[2] - lid.s[2] / 2).toBeLessThanOrEqual(cage.z0);
    expect(lid.c[2] + lid.s[2] / 2).toBeGreaterThanOrEqual(cage.z1);
  });

  it('every fence anchor is locked by an anchorLock gate on a flag nothing in the course sets; the sync and the pass zone leave them locked', () => {
    const locks = part.bay.gates.filter((g) => g.kind === 'anchorLock');
    expect(locks.map((g) => (g.kind === 'anchorLock' ? g.anchorId : '')).sort()).toEqual([...FENCES].sort());
    for (const g of locks) expect(g.kind === 'anchorLock' && g.flag).toBe(A7_NEVER_FLAG);
    for (const id of FENCES) expect(course.anchors![id]).toBe(part.anchors[id]);
    // nothing sets a7-never: no pass zone, scanner, pickup, pair or console names it (externalFlags only whitelists it)
    expect((lay.passZones ?? []).some((z) => z.flag === A7_NEVER_FLAG)).toBe(false);
    expect((lay.scanners ?? []).some((s) => s.flag === A7_NEVER_FLAG)).toBe(false);
    for (const bay of def.bays) for (const g of bay.gates) if (g.kind === 'pickup' || g.kind === 'pair') expect(g.flag).not.toBe(A7_NEVER_FLAG);
    expect((course.consoles ?? []).some((c) => c.flag === A7_NEVER_FLAG)).toBe(false);
    const s = runAt(LOBBY, [LOBBY[0], LOBBY[1] + 1]);
    expect(s.lockedAnchors().sort()).toEqual([...FENCES].sort());
    s.setFlag(A7_POD_FLAG);
    s.setFlag(A7_SYNC_FLAG);
    s.update(1 / 60);
    for (const id of FENCES) expect(s.anchorLocked(id), id).toBe(true);
  });

  it('the cage doors and the pod\'s east door (L7 near) stay locked until a7-sync; the sync opens all three', () => {
    const flags = part.bay.gates.filter((g): g is FlagGate => g.kind === 'flag');
    expect(flags.map((g) => [g.id, g.doorId, g.flag])).toEqual([
      [A7_GATE_CAGE_W, A7_CAGE_W, A7_SYNC_FLAG],
      [A7_GATE_CAGE_E, A7_CAGE_E, A7_SYNC_FLAG],
      [A7_GATE_EAST, A7_EAST_DOOR, A7_SYNC_FLAG],
    ]);
    expect(A7_EAST_DOOR).toBe(setExitDoor('a7DataHall'));
    expect(A7_EAST_DOOR).toBe(holdDoorId('L7', 'near'));
    for (const id of [A7_CAGE_W, A7_CAGE_E]) {
      const d = doorAt(id);
      expect(d.width).toBeCloseTo(1.2, 9);
      expect(d.height).toBeCloseTo(2.1, 9);
      expect(d.locked).toBe(true);
    }
    const s = runAt(LOBBY, [LOBBY[0], LOBBY[1] + 1]);
    for (const id of [A7_CAGE_W, A7_CAGE_E, A7_EAST_DOOR]) expect(s.locked(id), id).toBe(true);
    // the pod's pass zone alone opens nothing
    s.setFlag(A7_POD_FLAG);
    s.update(1 / 60);
    for (const id of [A7_CAGE_W, A7_CAGE_E, A7_EAST_DOOR]) expect(s.locked(id), id).toBe(true);
    s.setFlag(A7_SYNC_FLAG);
    s.update(1 / 60);
    for (const id of [A7_CAGE_W, A7_CAGE_E, A7_EAST_DOOR]) expect(s.locked(id), id).toBe(false);
    // the lobby's glazed doors and the pod's south door are never locked
    for (const id of [A7_HALL_DOOR, A7_PLANT_DOOR, A7_POD_DOOR]) expect(doorAt(id).locked, id).toBe(false);
  });

  it('no solo way over: soloJumpThreats is empty for the lid\'s four edges and every mesh top (no top over 0.3 m near the cage a lone player can stand on)', () => {
    const { x0, z0, x1, z1 } = cage;
    const y = cage.mesh + cage.lidT;
    const edges = [
      { y, a: { x: x0, z: z0 }, b: { x: x1, z: z0 }, n: { x: 0, z: -1 } },
      { y, a: { x: x0, z: z1 }, b: { x: x1, z: z1 }, n: { x: 0, z: 1 } },
      { y, a: { x: x0, z: z0 }, b: { x: x0, z: z1 }, n: { x: -1, z: 0 } },
      { y, a: { x: x1, z: z0 }, b: { x: x1, z: z1 }, n: { x: 1, z: 0 } },
    ];
    for (const g of edges) expect(soloJumpThreats(solid, g), `${g.a.x},${g.a.z} -> ${g.b.x},${g.b.z}`).toEqual([]);
    for (const f of fences) expect(soloJumpThreats(solid, { y: f.height, a: f.a, b: f.b }), `fence ${f.id}`).toEqual([]);
    // the racks (2.2), units (2.0), lid, pod roof and walls are noLedge over the mantle: none can be climbed onto alone
    for (const p of mine.filter((q) => q.collide && top(q) > MANTLE)) expect(p.noLedge).toBe(true);
  });

  it('the check has teeth: a 1.2 m crate in the front aisle threatens the lid\'s west edge', () => {
    const crate: BoxPiece = { c: [84.5, 0.6, 62.5], s: [1, 1.2, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true };
    const g = { y: cage.mesh + cage.lidT, a: { x: cage.x0, z: cage.z0 }, b: { x: cage.x0, z: cage.z1 }, n: { x: -1, z: 0 } };
    expect(soloJumpThreats([...solid, crate], g).length).toBeGreaterThan(0);
  });

  it('the cage floor is closed but for its doors: a body cannot stand in the kick band, and its inside is open floor from door to door', () => {
    // a body against the mesh from outside touches the kick panel (the fence line is not walkable through)
    for (const [x, z] of [[cage.x0 - 0.2, 61], [cage.x1 + 0.2, 62], [90, cage.z0 - 0.2], [90, cage.z1 + 0.2]] as const) expect(blockedAt(x, z).length, `${x}, ${z}`).toBeGreaterThan(0);
    const mid = (cage.door[0] + cage.door[1]) / 2;
    expect(walkBlocked(cage.x0 + 0.5, mid, cage.x1 - 0.5, mid)).toBeNull();
    expect(walkBlocked(cage.x1 + 0.6, mid, 98.5, mid)).toBeNull();
  });
});

describe('A7 the Data Hall: the terminals (scanner pair sc-a7, N6)', () => {
  const t1 = part.devices[A7_T1]!;
  const t2 = part.devices[A7_T2]!;

  it('A7_SCANNERS: one pair sc-a7 on a7-t1 / a7-t2 setting a7-sync, on the map\'s scanner list and the set\'s external flags', () => {
    expect(part.scanners).toEqual([{ id: A7_SCANNER, a: A7_T1, b: A7_T2, flag: A7_SYNC_FLAG }]);
    expect(lay.scanners).toContainEqual({ id: A7_SCANNER, a: A7_T1, b: A7_T2, flag: A7_SYNC_FLAG });
    expect(part.externalFlags).toContain(A7_SYNC_FLAG);
    expect(course.devices[A7_T1]).toBe(t1);
    expect(course.devices[A7_T2]).toBe(t2);
  });

  it('T1 on the cage\'s west face facing the hall, T2 on its east face facing the pod; each device sits on its panel\'s floor (y 0), the housing at 1.2 m', () => {
    expect([t1.x, t1.y, t1.z, t1.yaw]).toEqual([A7_T1_AT.x, 0, A7_T1_AT.z, A7_T1_AT.yaw]);
    expect([t2.x, t2.y, t2.z, t2.yaw]).toEqual([A7_T2_AT.x, 0, A7_T2_AT.z, A7_T2_AT.yaw]);
    expect(Math.abs(t1.x - cage.x0)).toBeLessThan(0.1);
    expect(Math.abs(t2.x - cage.x1)).toBeLessThan(0.1);
    // the hack spots, 0.6 m out along each facing
    expect(t1.x + Math.sin(t1.yaw) * 0.6).toBeCloseTo(A7_T1_SPOT[0], 9);
    expect(t2.x + Math.sin(t2.yaw) * 0.6).toBeCloseTo(A7_T2_SPOT[0], 9);
    for (const [x, z] of [A7_T1_SPOT, A7_T2_SPOT]) expect(blockedAt(x, z), `${x}, ${z}`).toEqual([]);
    const housings = grey.filter((p) => !p.collide && Math.abs(p.c[1] - (A7_PANEL_Y + 0.2)) < 1e-6 && Math.abs(p.s[1] - 0.9) < 1e-6);
    expect(housings).toHaveLength(2);
  });

  it('10.1 m apart, strictly over syncMinGap(scan) (4.6 m); the walk round is 26 m; syncStation throws with the panels at the gap', () => {
    const d = hyp2(t2.x - t1.x, t2.z - t1.z);
    expect(d).toBeCloseTo(10.1, 9);
    expect(syncMinGap('scan')).toBeCloseTo(2 * SCANNER.reach + 2 * MOVEMENT.radius, 9);
    expect(d).toBeGreaterThan(syncMinGap('scan'));
    expect(A7_SYNC_WALK).toBeGreaterThan(d);
    const at = (x: number) => ({ x, z: A7_T1_AT.z, yaw: Math.PI / 2 });
    expect(() => syncStation({ id: 'a7', kind: 'scan', a: A7_T1_AT, b: at(A7_T1_AT.x + syncMinGap('scan')) })).toThrow(/one player/);
    expect(() => syncStation({ id: 'a7', kind: 'scan', a: A7_T1_AT, b: A7_T2_AT, y: A7_PANEL_Y, walk: A7_SYNC_WALK })).not.toThrow();
  });

  it('one player cannot work both (scanStart refuses the other panel); two hacks inside 1.5 s open, 2 s apart fail on the late player', () => {
    const s = newScanPair();
    expect(scanStart(s, 0, 0)).toBeNull();
    expect(scanStart(s, 1, 0)).toBe(REFUSE_SCAN_OTHER);
    // in sync: starts 0.5 s apart
    const out = newScanResult();
    const ok = newScanPair();
    scanStart(ok, 0, 0);
    let opened = false;
    for (let t = 0; t < 4 && !opened; t += 1 / 60) {
      if (Math.abs(t - 0.5) < 1 / 120) scanStart(ok, 1, 1);
      opened = scanStep(ok, 1 / 60, true, true, out).kind === 'open';
    }
    expect(opened).toBe(true);
    // out of sync: starts 2.0 s apart, the late player (P2) pays, both panels reset
    const late = newScanPair();
    scanStart(late, 0, 0);
    let fail = '';
    let who = -1;
    for (let t = 0; t < 6 && !fail; t += 1 / 60) {
      if (Math.abs(t - 2.0) < 1 / 120) scanStart(late, 1, 1);
      const r = scanStep(late, 1 / 60, true, true, out);
      if (r.kind === 'fail') {
        fail = r.why;
        who = r.who;
      }
    }
    expect(fail).toBe('late');
    expect(who).toBe(1);
    expect([late.ph[0], late.ph[1]]).toEqual([SC_IDLE, SC_IDLE]);
  });

  it('no floor point reaches both terminals; every free floor point within reach of T2 is in the pod (or the cage), of T1 in the hall (or the cage)', () => {
    expect(hyp2(t2.x - t1.x, t2.z - t1.z)).toBeGreaterThan(2 * SCANNER.reach);
    const reachFrom = (d: { x: number; z: number }, ok: (x: number, z: number) => boolean): string[] => {
      const bad: string[] = [];
      for (let x = d.x - SCANNER.reach; x <= d.x + SCANNER.reach + 1e-9; x += 0.1) {
        for (let z = d.z - SCANNER.reach; z <= d.z + SCANNER.reach + 1e-9; z += 0.1) {
          if (hyp2(x - d.x, z - d.z) > SCANNER.reach || blockedAt(x, z).length > 0) continue;
          if (inBox(CAGE_BOX, x, z)) continue;
          if (!ok(x, z)) bad.push(`(${x.toFixed(1)}, ${z.toFixed(1)})`);
        }
      }
      return bad;
    };
    expect(reachFrom(t2, (x, z) => inBox(POD_BOX, x, z))).toEqual([]);
    expect(reachFrom(t1, (x, z) => x < cage.x0 && x > 76.15 && z > 55.95)).toEqual([]);
    // and the pod is reached on foot only from the corridor (its south door) or through the cage: its walls close it
    expect(blockedAt(96, 57.5).length).toBeGreaterThan(0);
    expect(blockedAt(96, 67).length).toBeGreaterThan(0);
    expect(blockedAt(98, 68).length).toBeGreaterThan(0);
  });

  it("each terminal's ready lamp is seen from the other's hack spot through the mesh (no box between), never through the kick band", () => {
    const g = { x: 0, y: 0, z: 0 };
    for (const [from, d] of [[A7_T2_SPOT, t1], [A7_T1_SPOT, t2]] as const) {
      scanGlowAt(d.x, d.y, d.z, d.yaw, g);
      const eye: V3 = [from[0], 1.6, from[1]];
      expect(blockers(eye, [g.x, d.y + SCAN_GLOW.ready, g.z]), `ready lamp of ${d.label}`).toEqual([]);
      expect(blockers(eye, [g.x, d.y + SCAN_GLOW.state, g.z]), `state lamp of ${d.label}`).toEqual([]);
      // the lamps hang in the mesh band (over the kick panels, under the lid)
      expect(d.y + SCAN_GLOW.state).toBeGreaterThan(cage.kick);
      expect(d.y + SCAN_GLOW.ready).toBeLessThan(cage.mesh);
      // teeth: the same line in the kick band hits a kick panel
      expect(blockers([from[0], 0.6, from[1]], [g.x, 0.6, g.z]).length).toBeGreaterThan(0);
    }
  });
});

describe("A7 the Data Hall: the cage's equipment cabinet (marlow-a7-cabinet: T2's spot hidden from the technician)", () => {
  const C = A7_CABINET;
  const cab = solid.find((p) => Math.abs(p.c[0] - (C.x0 + C.x1) / 2) < 1e-6 && Math.abs(p.c[2] - (C.z0 + C.z1) / 2) < 1e-6 && Math.abs(top(p) - C.h) < 1e-6)!;
  const others = solid.filter((p) => p !== cab);
  /** The technician's standing eye (`Enemy.eye`: EYE_STAND x the grunt's scale). */
  const EYE = EYE_STAND * ENEMIES.grunt.scale;
  /** The body samples perception rays go to (`Enemy` exposure: hips, the chest aim point, the head; `remoteHeadY` standing) and a tall head. */
  const BODY = [0.85, 1.35, remoteHeadY(0, false), 1.7];
  /** A player waiting at T2: the hack spot and 0.3 m round it. */
  const T2_FEET: [number, number][] = [];
  for (const dx of [-0.3, 0, 0.3]) for (const dz of [-0.3, 0, 0.3]) T2_FEET.push([A7_T2_SPOT[0] + dx, A7_T2_SPOT[1] + dz]);
  const R0 = A7_TECH_ROUTE[0]!;
  /** Where he looks from: R0, aisle B (z 61.5, x 78.5 to T1's spot), the front aisle x 84.4 from his south turn (57.4) to aisle C's east end (65.7). */
  const EYES: [number, number][] = [R0, A7_TECH_ROUTE[1]!, A7_TECH_ROUTE[4]!];
  for (let x = 78.5; x <= A7_T1_SPOT[0] + 1e-9; x += 0.25) EYES.push([x, 61.5]);
  for (let z = 57.4; z <= 65.7 + 1e-9; z += 0.25) EYES.push([84.4, z]);
  /** The eye -> body lines that no box in `among` stops (the mesh is no box: `b.fence` passes sight). */
  const openLines = (eyes: readonly [number, number][], among: readonly BoxPiece[]): string[] => {
    const out: string[] = [];
    for (const [ex, ez] of eyes) for (const [fx, fz] of T2_FEET) for (const y of BODY) if (blockers([ex, EYE, ez], [fx, y, fz], among).length === 0) out.push(`(${ex.toFixed(2)}, ${ez.toFixed(2)}) -> (${fx.toFixed(2)}, ${y}, ${fz.toFixed(2)})`);
    return out;
  };

  it('one solid noLedge box in the cage between the terminals, 1.75 m, thick enough for the light shapes, clear of the kick panels, the door span and both hack spots', () => {
    expect(cab).toBeDefined();
    expect(grey).toContain(cab);
    expect(cab.noLedge).toBe(true);
    expect(cab.c[1] - cab.s[1] / 2).toBeCloseTo(0, 9);
    expect(Math.min(...cab.s)).toBeGreaterThanOrEqual(CANON_MIN_THICK);
    expect(C.x0).toBeGreaterThan(A7_T1_SPOT[0] + 4);
    expect(C.x1).toBeLessThan(A7_T2_SPOT[0] - 4);
    expect(C.z0 - (cage.z0 + cage.panelT / 2)).toBeGreaterThanOrEqual(0.1);
    expect(cage.door[0] - C.z1).toBeGreaterThan(0.19);
    // under the auto-lip line and the mantle: nothing to climb onto the lid from
    expect(soloJumpThreats(solid, { y: cage.mesh + cage.lidT, a: { x: cage.x0, z: cage.z1 }, b: { x: cage.x1, z: cage.z1 }, n: { x: 0, z: 1 } })).toEqual([]);
  });

  it("blocks every line from his eye (R0, aisle B, the front aisle, aisle C's east end) to the hips, chest and head of a body at T2's spot (0.3 m round it)", () => {
    expect(EYES.length).toBeGreaterThan(60);
    expect(openLines(EYES, solid)).toEqual([]);
  });

  it('the check has teeth: without the cabinet his R0 eye sees the chest and head at T2 through both mesh faces', () => {
    for (const y of [1.35, remoteHeadY(0, false)]) expect(blockers([R0[0], EYE, R0[1]], [A7_T2_SPOT[0], y, A7_T2_SPOT[1]], others), `y ${y}`).toEqual([]);
    expect(openLines([R0], others).length).toBeGreaterThan(0);
    // and the R0 lines it closes are the cabinet's own (the rack row and the kick panels do not do it)
    for (const y of BODY.slice(1)) expect(blockers([R0[0], EYE, R0[1]], [A7_T2_SPOT[0], y, A7_T2_SPOT[1]])).toEqual([cab]);
  });

  it("keeps the synced hack readable: each standing hacker's line to the other terminal's ready and state lamps passes over its top", () => {
    const g = { x: 0, y: 0, z: 0 };
    for (const [from, d] of [[A7_T2_SPOT, part.devices[A7_T1]!], [A7_T1_SPOT, part.devices[A7_T2]!]] as const) {
      scanGlowAt(d.x, d.y, d.z, d.yaw, g);
      for (const lamp of [SCAN_GLOW.ready, SCAN_GLOW.state]) {
        expect(blockers([from[0], 1.6, from[1]], [g.x, d.y + lamp, g.z], [cab]), `${d.label} lamp ${lamp}`).toEqual([]);
        // the line's lowest point over the cabinet (its near edge) and the margin it keeps
        const near = Math.abs(from[0] - C.x0) < Math.abs(from[0] - C.x1) ? C.x0 : C.x1;
        const y = 1.6 + (lamp - 1.6) * ((near - from[0]) / (g.x - from[0]));
        expect(y - C.h, `${d.label} lamp ${lamp}`).toBeGreaterThan(0.01);
      }
    }
  });

  it("the crossing after the sync: door to door at z 64.5 a body passes with 0.3 m spare; the e2e's step-7 teleports land clear of it", () => {
    const mid = (cage.door[0] + cage.door[1]) / 2;
    expect(walkBlocked(cage.x0 - 0.6, mid, cage.x1 + 0.6, mid)).toBeNull();
    expect(walkBlocked(cage.x0 + 0.7, mid, cage.x1 - 0.7, mid, MOVEMENT.radius + 0.3)).toBeNull();
    // scripts/e2e-ctcourse/a7DataHall.mjs step 7: moveHost (85.2, 63.3), (87.0, 64.5), (95.2, 63.3), (97.2, 64.5), (99.0, 59.4)
    for (const [x, z] of [[85.2, 63.3], [87.0, 64.5], [95.2, 63.3], [97.2, 64.5], [99.0, 59.4]] as const) {
      expect(blockedAt(x, z), `${x}, ${z}`).toEqual([]);
      expect(hyp2(Math.max(Math.abs(x - cab.c[0]) - cab.s[0] / 2, 0), Math.max(Math.abs(z - cab.c[2]) - cab.s[2] / 2, 0)), `${x}, ${z}`).toBeGreaterThanOrEqual(MOVEMENT.radius + 0.3);
    }
  });

  it("the guards' nav grid: the cabinet's cells are blocked, the cage's two halves join round its north end, every A7 seed and the hack spots are on the grid", () => {
    const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, ctcourse.navLayers ?? 3, lay.navSeeds ?? []);
    expect(nav.isWalkable(nav.cellOf((C.x0 + C.x1) / 2, (C.z0 + C.z1) / 2))).toBe(false);
    expect(nav.findPath([88, 61], [94.5, 61])).not.toBeNull();
    for (const s of part.navSeeds) expect(nav.isWalkable(nav.cellOf(s.x, s.z)), `seed ${s.x}, ${s.z}`).toBe(true);
    for (const [x, z] of [A7_T1_SPOT, A7_T2_SPOT, R0]) expect(nav.isWalkable(nav.cellOf(x, z)), `${x}, ${z}`).toBe(true);
  });
});

describe('A7 the Data Hall: the cameras', () => {
  it('two cameras (the A7 budget), valid, on their mounts: cam1 fixed on the north wall over the front aisle (short aim), cam2 sweeping at the corridor\'s east end', () => {
    expect(part.cameras.map((c) => c.id)).toEqual(['a7-cam1', 'a7-cam2']);
    expect(validateSecurity({ devices: part.cameras })).toEqual([]);
    expect(A7_CAM1).toMatchObject({ at: [86.5, 71.5], y: 3.2, facing: 195, aim: 4, range: 12 });
    expect(A7_CAM1.sweep).toBeUndefined();
    expect(A7_CAM2).toMatchObject({ at: [99.6, 54.0], y: 3.0, facing: 270, sweep: [220, 320], aim: 9, range: 14 });
    // under their ceilings, within a wall's slack of the shell
    expect(A7_CAM1.y).toBeLessThan(A7_H.slab);
    expect(A7_CAM2.y).toBeLessThan(A7_H.corridor);
    expect(71.75 - A7_CAM1.at[1]).toBeLessThan(0.3);
    expect(99.75 - A7_CAM2.at[0]).toBeLessThan(0.3);
    expect(lay.security!.devices).toEqual(expect.arrayContaining([A7_CAM1, A7_CAM2].map((c) => ({ ...c, bulletproof: true }))));
  });

  it('C2: cam1 watches the front aisle\'s north mouth and the cage\'s north apron, and a head at T1\'s hack spot (standing or crouched) is out of its frame', () => {
    for (const [x, z] of [[85.0, 68.5], [84.5, 67.0], [87.5, 68.5]] as const) expect(framed(A7_CAM1, x, z, false), `${x}, ${z}`).toBe(true);
    for (const c of [false, true]) expect(framed(A7_CAM1, A7_T1_SPOT[0], A7_T1_SPOT[1], c), `T1 crouched ${c}`).toBe(false);
    // aisle B and the lobby are out of it
    expect(framed(A7_CAM1, 80.9, 61.5, false)).toBe(false);
    expect(framed(A7_CAM1, 73.5, 62, false)).toBe(false);
    // the mesh passes sight: nothing solid between cam1 and T1's spot, so only the frame keeps it out (the doc's C2)...
    expect(blockers(lens(A7_CAM1), [A7_T1_SPOT[0], remoteHeadY(0, false), A7_T1_SPOT[1]])).toEqual([]);
    // ...and with a long aim (10.2 m) the same camera would frame the hacker: the short aim is what keeps T1 clear
    expect(inFrame(A7_CAM1.facing * (Math.PI / 180), A7_CAM1.at[0], A7_CAM1.y, A7_CAM1.at[1], A7_T1_SPOT[0], remoteHeadY(0, false), A7_T1_SPOT[1], camPitch({ y: A7_CAM1.y, aim: 10.2 }), CAMERA.rangeMax)).toBe(true);
  });

  it('cam2 frames the corridor while its axis is near west and leaves it in two blind windows of about 4 s a cycle (17.3 s)', () => {
    const cyc = sweepCycle(A7_CAM2.sweep);
    expect(cyc).toBeCloseTo(17.33, 1);
    const pts: [number, number][] = [[86.5, 53.9], [88, 53.9], [94, 53.9]];
    for (const [x, z] of pts) expect(framed(A7_CAM2, x, z, true, 2 + (50 / 15)), `axis ${x}`).toBe(true);
    // the windows: the grating's middle (89, 53.9) out of frame (crouched head), over one cycle from a framed moment (the axis
    // at west) in 0.05 s steps, so every window starts and ends inside the cycle
    const t0 = 2 + 50 / 15;
    expect(framed(A7_CAM2, 89, 53.9, true, t0)).toBe(true);
    const windows: number[] = [];
    let n = 0;
    for (let k = 0; k * 0.05 <= cyc + 1e-9; k++) {
      if (!framed(A7_CAM2, 89, 53.9, true, t0 + k * 0.05)) n++;
      else if (n > 0) {
        windows.push(n * 0.05);
        n = 0;
      }
    }
    expect(windows).toHaveLength(2);
    for (const w of windows) {
      expect(w).toBeGreaterThan(3.5);
      expect(w).toBeLessThan(5);
    }
    // the grating hop (8 m at the silent crouch) is under a second longer than a window (A7-C4: marginal by design)
    expect(8 / SILENT_CROUCH - Math.min(...windows)).toBeLessThan(1.2);
  });

  it("the cooling units' west lees hide a head (standing or crouched) from cam2; without the units the line is clear; T2 and the pod are behind the corridor's wall", () => {
    const units = solid.filter((p) => A7_UNITS.some((x) => Math.abs(p.c[0] - x) < 1e-6) && Math.abs(top(p) - A7_UNIT.h) < 1e-6);
    expect(units).toHaveLength(3);
    for (const [x, z] of A7_LEES) {
      expect(blockedAt(x, z), `lee ${x}`).toEqual([]);
      // (14 m range cut) the x 85 lee is past cam2's range as well: hidden twice
      if (x > 90) expect(hyp2(x - A7_CAM2.at[0], z - A7_CAM2.at[1])).toBeLessThan(camRange(A7_CAM2));
      else expect(hyp2(x - A7_CAM2.at[0], z - A7_CAM2.at[1])).toBeGreaterThanOrEqual(camRange(A7_CAM2));
      for (const c of [false, true]) {
        const head: V3 = [x, remoteHeadY(0, c), z];
        expect(blockers(lens(A7_CAM2), head, units).length, `lee ${x} crouched ${c}`).toBeGreaterThan(0);
        expect(blockers(lens(A7_CAM2), head, solid.filter((p) => !units.includes(p))), `lee ${x} without the units`).toEqual([]);
      }
    }
    expect(blockers(lens(A7_CAM2), [A7_T2_SPOT[0], 1.6, A7_T2_SPOT[1]]).length).toBeGreaterThan(0);
    expect(blockers(lens(A7_CAM2), [98, 1.6, 62]).length).toBeGreaterThan(0);
  });

  it('the jam lines (G.STATIC; the mesh passes them): cam1 from the front aisle\'s mouth, cam2 from the lane beside the x 85 unit, both in JAMMER.range; from inside the lee its unit blocks', () => {
    const eye = (x: number, z: number): V3 => [x, 1.5, z];
    expect(blockers(eye(84.5, 63.5), lens(A7_CAM1))).toEqual([]);
    expect(hyp2(84.5 - A7_CAM1.at[0], 63.5 - A7_CAM1.at[1])).toBeLessThanOrEqual(JAMMER.range);
    expect(blockers(eye(83.7, 54.2), lens(A7_CAM2))).toEqual([]);
    expect(hyp2(83.7 - A7_CAM2.at[0], 54.2 - A7_CAM2.at[1])).toBeLessThanOrEqual(JAMMER.range);
    expect(blockers(eye(A7_LEES[0]![0], A7_LEES[0]![1]), lens(A7_CAM2)).length).toBeGreaterThan(0);
    // a jam from the pod through both mesh faces at chest height reaches cam1's line clear of boxes (the mesh is no box)...
    expect(blockers([A7_T2_SPOT[0], 1.6, A7_T2_SPOT[1]], [cage.x0 - 1, 2.0, cage.z1 + 1])).toEqual([]);
    // ...and the kick band stops it
    expect(blockers([A7_T2_SPOT[0], 0.8, A7_T2_SPOT[1]], [cage.x0 - 1, 0.8, cage.z1 + 1]).length).toBeGreaterThan(0);
  });
});

describe('A7 the Data Hall: the lights (LIGHTING-PLAN 3, A7)', () => {
  const by = (g: number) => lamps.filter((l) => l.group === g);

  it('fifteen lamps on circuits 70-73: rows 7 (six strips + the lobby panel, A7-D4), aisle ends 2, corridor 4, pod 2; every one grouped, electric and destructible as its row says', () => {
    expect(lamps).toHaveLength(15);
    expect([70, 71, 72, 73].map((g) => by(g).length)).toEqual([7, 2, 4, 2]);
    for (const l of lamps) {
      const row = circuitOf(l.group);
      expect(row, `lamp ${l.id} group ${l.group}`).toBeDefined();
      expect(row!.room).toBe('A7');
      expect(l.electric).toBe(row!.electric);
      expect(l.destructible).toBe(row!.destructible);
    }
    expect(by(70).length).toBe(circuitOf(70)!.lamps);
    for (const g of [71, 72, 73]) expect(by(g).length).toBe(circuitOf(g)!.lamps);
    // the lobby panel is the one row lamp inside the lobby; the pod strips under the pod roof; the corridor lamps in the corridor
    expect(by(70).filter((l) => l.x < 76)).toHaveLength(1);
    for (const l of by(73)) expect(inBox(POD_BOX, l.x, l.z) && l.y < A7_H.pod).toBe(true);
    for (const l of by(72)) expect(l.z < 55.65 && l.y < A7_H.corridor).toBe(true);
  });

  it('the part\'s groups are exactly the plan\'s A7 rows, and each has a lamp', () => {
    const plan = marlowCourseGroups();
    expect(part.groups).toEqual({ 'a7-rows': plan['a7-rows'], 'a7-aisles': plan['a7-aisles'], 'a7-plant': plan['a7-plant'], 'a7-pod': plan['a7-pod'] });
    for (const g of Object.values(part.groups)) expect(lamps.some((l) => l.group === g)).toBe(true);
  });

  it('three wall switches, each on its room\'s side of its wall: rows (70) in the lobby by the hall door, aisle ends (71) at the south aisle\'s west end, corridor (72) inside its west door; no switch on the pod', () => {
    expect(part.switches.map((s) => [s.id, s.group])).toEqual([['a7-sw-rows', 70], ['a7-sw-aisles', 71], ['a7-sw-plant', 72]]);
    const [rows, aisles, plant] = part.switches;
    // the set doc's points (x, z), within 1.5 m (the plant switch moved off the door's opening)
    const doc: [number, number][] = [[75.6, 60.4], [76.5, 56.3], [73.0, 55.3]];
    for (const [i, s] of part.switches.entries()) expect(hyp2(s.pos.x - doc[i]![0], s.pos.z - doc[i]![1]), s.id).toBeLessThanOrEqual(1.5);
    expect(rows!.pos.x).toBeLessThan(76);
    expect(rows!.pos.z).toBeGreaterThan(55.95);
    expect(aisles!.pos.x).toBeGreaterThan(76.15);
    expect(aisles!.pos.z).toBeGreaterThan(55.95);
    expect(plant!.pos.z).toBeLessThan(55.65);
    expect(circuitOf(73)!.switches).toEqual([]);
    expect(part.switches.some((s) => s.group === 73)).toBe(false);
  });

  it('the standby zone: the set at 0.14 under the slab', () => {
    expect(part.ambientZones).toEqual([{ id: 'A7', box: [70, 52, 100, 72], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 3.9 }]);
  });

  it('the tuned levels: T1 a lit pool, the routes read, R1 lit by 71 and dark with it off (the lure\'s isolation moment), each circuit\'s cut dark', () => {
    const spots = LIGHT_SPOTS.a7DataHall;
    const at = (n: string) => spots.find((s) => s.name === n)!;
    expect(at('A7 T1')).toMatchObject({ x: A7_T1_SPOT[0], z: A7_T1_SPOT[1], band: 'pool' });
    expect(tuned['A7 T1']!).toBeGreaterThanOrEqual(MARLOW_LEVEL.poolMin);
    for (const n of ['A7 aisle B', 'A7 aisle C', 'A7 north apron', 'A7 R1', 'A7 lobby', 'A7 corridor', 'A7 grating', 'A7 T2']) {
      expect(at(n).band, n).toBe('read');
      expect(tuned[n]!, n).toBeGreaterThanOrEqual(MARLOW_LEVEL.readMin);
    }
    expect(at('A7 R1 cut')).toMatchObject({ x: 77.5, z: 57.4, off: [71] });
    expect(tuned['A7 R1 cut']!).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
    expect(tuned['A7 R1']! - tuned['A7 R1 cut']!).toBeGreaterThan(0.3);
    for (const [n, g] of [['A7 aisle B cut', 70], ['A7 lobby cut', 70], ['A7 corridor cut', 72], ['A7 T2 cut', 73]] as const) {
      expect(at(n).off, n).toEqual([g]);
      expect(tuned[n]!, n).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
    }
    expect(Math.abs(tuned['A7 hall standby']! - MARLOW_LEVEL.standby)).toBeLessThanOrEqual(0.03);
  });
});

describe('A7 the Data Hall: the technician', () => {
  const slot = part.squads[A7_TECH]!;
  const patrolSpeed = ENEMIES.grunt.walkSpeed * 1.1;

  /** Walk the loop on its own pace (0.01 s steps, straight-line moves); the times each stop was left. */
  function walkLoop(waits: number[], seconds: number): { left: [number, number][]; stuck: boolean } {
    const w = new PatrolWalker({ points: A7_TECH_ROUTE, waits, faces: A7_TECH_FACES }, slot.x, slot.z, slot.yaw);
    let x = slot.x;
    let z = slot.z;
    const left: [number, number][] = [];
    let idx = w.idx;
    const dt = 0.01;
    for (let t = 0; t < seconds; t += dt) {
      w.tick(dt);
      const to = w.step(dt, x, z);
      if (to) {
        const d = hyp2(to[0] - x, to[1] - z);
        const k = Math.min(1, (patrolSpeed * dt) / (d || 1));
        x += (to[0] - x) * k;
        z += (to[1] - z) * k;
      }
      if (w.idx !== idx) {
        left.push([t, idx]);
        idx = w.idx;
      }
    }
    return { left, stuck: left.length < 5 };
  }

  it('the bay\'s one guard: an armed grunt at the cage front (R0) facing east, on his loop round rows 1-2; waits never 0', () => {
    expect(part.bay.squad).toEqual([A7_TECH]);
    expect(Object.keys(part.squads)).toEqual([A7_TECH]);
    expect(slot.kind).toBe('grunt');
    expect(['grunt', 'heavy', 'enforcer', 'officer', 'sniper']).toContain(slot.kind);
    expect(slot.passive).toBeUndefined();
    expect([slot.x, slot.z, slot.yaw]).toEqual([84.4, 60.6, Math.PI / 2]);
    expect(slot.route).toEqual([[84.4, 60.6], [84.4, 57.4], [77.5, 57.4], [77.5, 65.7], [84.4, 65.7]]);
    expect(slot.waits).toEqual([5, A7_PASS_WAIT, 3, A7_PASS_WAIT, A7_PASS_WAIT]);
    expect(slot.waits!.every((w) => w > 0)).toBe(true);
    expect(slot.faces![0]).toBe(Math.PI / 2);
    expect(slot.faces![2]).toBe(-Math.PI / 2);
    expect([1, 3, 4].every((i) => Number.isNaN(slot.faces![i]!))).toBe(true);
    expect(course.squads[A7_TECH]).toBe(slot);
    expect(inBox(box, slot.x, slot.z)).toBe(true);
    expect(def.bays[6]!.squad.length).toBeLessThanOrEqual(3);
  });

  it('his loop is open floor (a body of radius 0.3 walks every leg), and so is the lured walk from R0 to the aisle-ends switch', () => {
    for (let i = 0; i < A7_TECH_ROUTE.length; i++) {
      const a = A7_TECH_ROUTE[i]!;
      const c = A7_TECH_ROUTE[(i + 1) % A7_TECH_ROUTE.length]!;
      expect(walkBlocked(a[0], a[1], c[0], c[1]), `leg ${i}`).toBeNull();
    }
    const sw = part.switches.find((s) => s.group === 71)!;
    const lured: [number, number][] = [[84.4, 60.6], [84.4, 57.4], [sw.pos.x + 0.3, 57.0], [sw.pos.x + 0.3, sw.pos.z + 0.5]];
    for (let i = 1; i < lured.length; i++) expect(walkBlocked(lured[i - 1]![0], lured[i - 1]![1], lured[i]![0], lured[i]![1]), `lured leg ${i}`).toBeNull();
  });

  it('the loop takes 35-41 s on the walker (LD 4.3: 25-45 s) with stops of 5 s at R0 and 3 s at R1 (LD: 3-6 s); the walk is 30.4 m', () => {
    const n = A7_TECH_ROUTE.length;
    const len = A7_TECH_ROUTE.reduce((s, a, i) => s + hyp2(A7_TECH_ROUTE[(i + 1) % n]![0] - a[0], A7_TECH_ROUTE[(i + 1) % n]![1] - a[1]), 0);
    expect(len).toBeCloseTo(30.4, 1);
    const { left } = walkLoop(A7_TECH_WAITS, 140);
    const post = left.filter(([, i]) => i === 0).map(([t]) => t);
    expect(post.length).toBeGreaterThanOrEqual(3);
    const cycle = post[2]! - post[1]!;
    expect(cycle).toBeGreaterThan(35);
    expect(cycle).toBeLessThan(41);
    expect(cycle).toBeGreaterThanOrEqual(25);
    expect(cycle).toBeLessThanOrEqual(45);
    expect(post[0]!).toBeCloseTo(5, 1);
    for (const w of [A7_TECH_WAITS[0]!, A7_TECH_WAITS[2]!]) {
      expect(w).toBeGreaterThanOrEqual(3);
      expect(w).toBeLessThanOrEqual(6);
    }
  });

  it('the check has teeth: the doc\'s waits [5, 0, 3, 0, 0] freeze a PatrolWalker at the first corner, which is why the pass-throughs pause 0.1 s', () => {
    expect(walkLoop([5, 0, 3, 0, 0], 140).stuck).toBe(false); // (merge) master guard-ai S2 fix: a wait of 0 passes through now; the 0.1 s pause stays
    expect(walkLoop(A7_TECH_WAITS, 140).stuck).toBe(false);
  });

  it('the lure (EnemyManager.lightsOut, 25 m): the aisle-ends switch reaches every point of his loop; the circuit table names him', () => {
    const sw = part.switches.find((s) => s.group === 71)!;
    for (const p of A7_TECH_ROUTE) expect(hyp2(p[0] - sw.pos.x, p[1] - sw.pos.z), `(${p.join(', ')})`).toBeLessThan(LURE_RANGE);
    expect(circuitOf(71)!.lure?.guard).toBe(A7_TECH);
    // R1 (the isolation moment) is the loop's nearest stop to the switch and out of both cameras
    expect(hyp2(77.5 - sw.pos.x, 57.4 - sw.pos.z)).toBeLessThan(2);
    for (const c of [A7_CAM1, A7_CAM2]) for (let t = 0; t < 18; t += 0.5) expect(framed(c, 77.5, 57.4, false, t)).toBe(false);
  });
});

describe('A7 the Data Hall: the steps, the claim, the pass zone', () => {
  it('three steps in route order: the split (A / B lines, one player in the pod), the synced hack (a7-sync), one closing line; the course validates', () => {
    const steps = def.objectives!.filter((o) => o.bay === 'A7');
    expect(steps.map((o) => o.id)).toEqual(['a7-split', 'a7-sync', 'a7-lock']);
    expect(splitStep.done).toEqual({ flag: A7_POD_FLAG });
    expect(syncStep.done).toEqual({ flag: A7_SYNC_FLAG });
    for (const o of steps.slice(0, 2)) {
      expect(o.a).toBeDefined();
      expect(o.b).toBeDefined();
      expect(o.a).not.toBe(o.b);
    }
    expect(splitStep.a).toMatch(/terminal one/);
    expect(splitStep.b).toMatch(/terminal two/);
    expect(steps[2]!.done).toBeUndefined();
    expect(steps[2]!.text).toMatch(/holding room seven/);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
    expect(part.externalFlags).toEqual([A7_POD_FLAG, A7_SYNC_FLAG, A7_NEVER_FLAG]);
  });

  it("every line fits 90 characters, no em or en dash; ids fit the wire; the radio is the doc's three lines", () => {
    for (const o of def.objectives!.filter((x) => x.bay === 'A7')) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(/[–—]/.test(t), t).toBe(false);
      }
      expect(o.id.length).toBeLessThanOrEqual(OBJECTIVE_ID_MAX);
    }
    expect(part.bay.radio.map((r) => r.at)).toEqual(['enter', 'enter', 'a7-sync']);
    for (const r of part.bay.radio) {
      expect(r.text.length, r.text).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(r.text), r.text).toBe(false);
    }
    expect(part.bay.radio[0]!.text).toBe("Two terminals, two routes. You will be apart for a bit, then meet at the cage.");
  });

  it('the claim: the first player into the plant corridor is B; until then the lead (P1, odd set) reads A; either player may take either path; the first claim stands', () => {
    expect(part.bay.roles).toEqual([{ role: 'b', zone: { box: A7_CORRIDOR_CLAIM } }]);
    // the lobby is outside the claim box (and the pod beyond the corridor's wall)
    expect(inBox(A7_CORRIDOR_CLAIM, LOBBY[0], LOBBY[1])).toBe(false);
    expect(inBox(A7_CORRIDOR_CLAIM, A7_T2_SPOT[0], A7_T2_SPOT[1])).toBe(false);
    let s = runAt(LOBBY, [LOBBY[0], LOBBY[1] + 1]);
    expect(s.roleClaimed()).toBe(false);
    expect(s.roleOf(0)).toBe('a');
    expect(s.stepLine(splitStep, 0)).toBe(splitStep.a);
    expect(s.stepLine(splitStep, 1)).toBe(splitStep.b);
    // P2 into the corridor: P2 is B, P1 is A
    s.setPlayer(1, 73, 0, 54, false);
    s.update(1 / 60);
    expect(s.roleClaimed()).toBe(true);
    expect([s.roleOf(0), s.roleOf(1)]).toEqual(['a', 'b']);
    // P1 following into the corridor does not swap it
    s.setPlayer(0, 75, 0, 54, false);
    s.update(1 / 60);
    expect([s.roleOf(0), s.roleOf(1)]).toEqual(['a', 'b']);
    // the swap: the host (P1) in first takes B, the client reads the A line
    s = runAt(LOBBY, [LOBBY[0], LOBBY[1] + 1]);
    s.setPlayer(0, 73, 0, 54, false);
    s.update(1 / 60);
    expect([s.roleOf(0), s.roleOf(1)]).toEqual(['b', 'a']);
    expect(s.stepLine(splitStep, 0)).toBe(splitStep.b);
    expect(s.stepLine(syncStep, 1)).toBe(syncStep.a);
  });

  it('the pod pass zone: one player (any) in the pod on its floor ticks the split; the sync flag ticks the hack; flags are external', () => {
    expect(part.passZones).toEqual([{ id: 'a7-p-pod', box: A7_POD_ZONE, flag: A7_POD_FLAG, floorY: 0, any: true }]);
    expect(inBox(POD_BOX, A7_POD_ZONE[0], A7_POD_ZONE[1]) && inBox(POD_BOX, A7_POD_ZONE[2], A7_POD_ZONE[3])).toBe(true);
    expect(inBox(A7_POD_ZONE, A7_T2_SPOT[0], A7_T2_SPOT[1])).toBe(true);
    const s = runAt(LOBBY, [LOBBY[0], LOBBY[1] + 1]);
    expect(s.isStepDone('a7-split')).toBe(false);
    s.setFlag(A7_POD_FLAG);
    s.update(1 / 60);
    expect(s.isStepDone('a7-split')).toBe(true);
    expect(s.isStepDone('a7-sync')).toBe(false);
    s.setFlag(A7_SYNC_FLAG);
    s.update(1 / 60);
    expect(s.isStepDone('a7-sync')).toBe(true);
  });

  it('the routes are open floor: the hall (lobby, hall door, aisle B, T1) and the corridor (plant door, the lees, the grating, the pod door, T2)', () => {
    const hall: [number, number][] = [[73, 61.6], [75.2, 61.6], [76.9, 61.6], [78.5, 61.5], [A7_T1_SPOT[0], A7_T1_SPOT[1]]];
    const corridor: [number, number][] = [[72.8, 57.0], [72.8, 54.0], [A7_LEES[0]![0], 54.2], A7_LEES[0]!, [A7_LEES[0]![0], 54.2], [A7_LEES[1]![0], 54.2], A7_LEES[1]!, [A7_LEES[1]![0], 54.2], [98.0, 54.2], [98.0, 57.5], [A7_T2_SPOT[0], A7_T2_SPOT[1]]];
    for (const r of [hall, corridor]) for (let i = 1; i < r.length; i++) expect(walkBlocked(r[i - 1]![0], r[i - 1]![1], r[i]![0], r[i]![1]), `leg ${r[i - 1]} -> ${r[i]}`).toBeNull();
    // the doors on the routes: the hall door (x 76), the plant door and the pod door (z 55.8), 1.2 m
    const d = (id: string) => b.anchors.doors.find((q) => q.id === course.doors[id])!;
    for (const [id, x, z] of [[A7_HALL_DOOR, 76, 61.0], [A7_PLANT_DOOR, 72.2, 55.8], [A7_POD_DOOR, 97.4, 55.8]] as const) {
      expect(d(id).hinge.x, id).toBeCloseTo(x, 9);
      expect(d(id).hinge.z, id).toBeCloseTo(z, 9);
      expect(d(id).width, id).toBeCloseTo(1.2, 9);
    }
  });
});

describe('A7 the Data Hall: map data the e2e and the modes read', () => {
  it('debug points A7-entry / A7-mid / A7-t1 / A7-corridor / A7-pod on clear floor; camera spaces (hall open; lobby, corridor, pod and cage tight); nav seeds in the cage and the pod', () => {
    expect(part.debugPoints.map((d) => d.id)).toEqual(['A7-entry', 'A7-mid', 'A7-t1', 'A7-corridor', 'A7-pod']);
    for (const d of part.debugPoints) {
      expect(inBox(box, d.pos.x, d.pos.z)).toBe(true);
      expect(blockedAt(d.pos.x, d.pos.z), d.id).toEqual([]);
    }
    expect(part.camSpaces.map((c) => c.size)).toEqual(['open', 'tight', 'tight', 'tight', 'tight']);
    expect(part.navSeeds.some((s) => inBox(CAGE_BOX, s.x, s.z))).toBe(true);
    expect(part.navSeeds.some((s) => inBox(POD_BOX, s.x, s.z))).toBe(true);
    for (const s of part.navSeeds) expect(blockedAt(s.x, s.z), `seed ${s.x}, ${s.z}`).toEqual([]);
  });

  it('shot vantages for the lobby, the corridor and T1; no lasers, consoles or hide objects', () => {
    expect(part.shotVantages.map((v) => v.name)).toEqual(['a7-lobby', 'a7-corridor', 'a7-t1']);
    expect(part.lasers).toEqual([]);
    expect(part.laserPanels).toEqual([]);
    expect(part.consoles).toEqual([]);
    expect(part.hideSpots).toEqual([]);
  });
});

describe('A7 the Data Hall: dressing (slice 7 step 5)', () => {
  const kitReport = JSON.parse(readFileSync('src/world/kit/assets/facility-kit.json', 'utf8')) as { pieces: Record<string, { meshes: Record<string, number> }> };
  const propReport = JSON.parse(readFileSync('src/world/props/assets/facility-props.json', 'utf8')) as PropReport;
  const area = { x0: box[0], z0: box[1], x1: box[2], z1: box[3] };
  const own = part.props;
  const skins = dressing.filter((p) => !p.collide);
  const kitIn = lay.kit!.instances.filter((i) => inBox(box, i.x, i.z));
  const racks = own.filter((p) => p.prop === 'serverRack');
  const units = own.filter((p) => p.prop === 'coolingUnit');
  /** A skin box's extent as [x0, x1, y0, y1, z0, z1]. */
  const ext = (p: BoxPiece): [number, number, number, number, number, number] => [p.c[0] - p.s[0] / 2, p.c[0] + p.s[0] / 2, p.c[1] - p.s[1] / 2, p.c[1] + p.s[1] / 2, p.c[2] - p.s[2] / 2, p.c[2] + p.s[2] / 2];
  /** The skins whose box overlaps the volume [x0, x1] x [y0, y1] x [z0, z1] (1 mm in). */
  const skinsInOf = (list: readonly BoxPiece[], x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): BoxPiece[] =>
    list.filter((p) => {
      const [a, e, c, d, f, g] = ext(p);
      return a < x1 - 1e-3 && e > x0 + 1e-3 && c < y1 - 1e-3 && d > y0 + 1e-3 && f < z1 - 1e-3 && g > z0 + 1e-3;
    });
  const skinsIn = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): BoxPiece[] => skinsInOf(skins, x0, x1, y0, y1, z0, z1);
  /** A planted 0.03 m skin (a cube) at the middle of a window [x0, x1, y0, y1, z0, z1]: the test's own piece, never in the set. */
  const plantIn = (w: readonly [number, number, number, number, number, number]): BoxPiece => ({
    c: [(w[0] + w[1]) / 2, (w[2] + w[3]) / 2, (w[4] + w[5]) / 2],
    s: [0.03, 0.03, 0.03],
    yaw: 0,
    pitch: 0,
    color: '#ff00ff',
    collide: false,
  });

  it('the greybox is as S7 built it: its 47 boxes (checksum; the cabinet included), 37 solids, 15 lamps, 5 doors, 6 anchors; the dressing adds NO collision (every dressing box is a skin)', () => {
    let sum = 0;
    for (const p of grey) sum += (p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw) * (p.collide ? 1 : 1.5) * (p.visible === false ? 1.25 : 1) * (p.overhead ? 1.1 : 1);
    expect(sum).toBeCloseTo(GREY.checksum, 3);
    expect(grey.filter((p) => p.collide)).toHaveLength(GREY.solids);
    expect(dressing.length).toBeGreaterThan(500);
    expect(dressing.filter((p) => p.collide)).toEqual([]);
    expect(built.counts.sets.a7DataHall).toEqual({ lights: GREY.lights, solids: GREY.solids, doors: GREY.doors, anchors: GREY.anchors });
    expect(lamps).toHaveLength(GREY.lights);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A7-12', 'A7-13', 'A7-14', 'A7-15', 'A7-16', 'A7-17', 'A7-18', 'A7-19', 'A7-20', 'A7-21', 'A7-22', 'A7-23']));
    expect(Object.keys(part.doors)).toHaveLength(GREY.doors);
    expect(Object.keys(part.anchors)).toHaveLength(GREY.anchors);
  });

  it('every dressing box is a visual skin: no collision, noLedge, a side under 5 cm (out of the canonical light shapes, so the bake, the meter, the guards and the cameras see the greybox as built)', () => {
    for (const p of skins) {
      expect(p.noLedge, `skin at (${p.c.join(', ')})`).toBe(true);
      expect(Math.min(...p.s), `skin at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBeLessThan(CANON_MIN_THICK);
      expect(p.visible).not.toBe(false);
      expect(p.overhead).toBeFalsy();
    }
    expect(dressing.filter((p) => p.visible !== false && Math.min(...p.s) >= CANON_MIN_THICK)).toEqual([]);
    // the game still generates no ledge, lip or split gap in the set with the skins in
    const inSetBox = (x: number, z: number): boolean => inBox(box, x, z, 0.3);
    expect(anchors.ledges.filter((l) => inSetBox((l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2))).toEqual([]);
    expect(anchors.splits.filter((s) => inSetBox(s.a.x, s.a.z))).toEqual([]);
  });

  it("every skin lies inside the set box (0.3 m of wall slack) and under its own room's ceiling (lobby 3.0, corridor 3.5, pod 2.6, hall 4.0)", () => {
    const [x0, z0, x1, z1] = box;
    for (const p of skins) {
      const [a, e, , d, f, g] = ext(p);
      expect(a, `skin (${p.c.join(', ')})`).toBeGreaterThanOrEqual(x0 - 0.3);
      expect(e).toBeLessThanOrEqual(x1 + 0.3);
      expect(f).toBeGreaterThanOrEqual(z0 - 0.3);
      expect(g).toBeLessThanOrEqual(z1 + 0.3);
      const cx = p.c[0];
      const cz = p.c[2];
      const inPod = cx > 95.8 && cz < 68.2;
      const roof = cz < 55.65 ? A7_H.corridor : cx < 75.85 && cz < 65.85 ? A7_H.lobby : inPod ? A7_H.pod : A7_H.slab;
      // (the gas-suppression main runs over the pod's roof, in the hall's air at 3.6 m: that is the one skin allowed above a pod roof)
      if (!(inPod && p.c[1] > A7_H.pod)) expect(d, `skin (${p.c.join(', ')}) top`).toBeLessThanOrEqual(roof + 1e-6);
      expect(d).toBeLessThanOrEqual(A7_H.slab);
    }
  });

  it('racks and cooling units are props over the greybox boxes: 37 racks in runs of 7 / 16 / 7 / 7, 3 units; each stands 5 cm proud on its front and 1 cm up, never past the skin rule, with no box written', () => {
    expect(racks).toHaveLength(37);
    expect(units).toHaveLength(3);
    expect(A7_RACK_PROUD).toBeLessThanOrEqual(0.05);
    for (const [i, [x0, x1, z0, z1]] of A7_RACKS.entries()) {
      const front = A7_RACK_FRONT[i]!;
      const run = racks.filter((r) => r.x > x0 && r.x < x1 && Math.abs(r.z - (z0 + z1) / 2) < 0.2);
      expect(run, `run ${i}`).toHaveLength(Math.round((x1 - x0) / A7_RACK_PITCH));
      for (const r of run) {
        expect(r.y).toBeCloseTo(A7_PROP_LIFT, 9);
        expect(r.yaw).toBeCloseTo(front > 0 ? 0 : Math.PI, 9);
        // the drawn body (0.6 x 1.2): its front is 5 cm out of the run's box, its back inside or flush
        const boxFront = front > 0 ? z1 : z0;
        const boxBack = front > 0 ? z0 : z1;
        expect((r.z + front * 0.6 - boxFront) * front, `rack at ${r.x} front`).toBeCloseTo(A7_RACK_PROUD, 6);
        expect(((r.z - front * 0.6) - boxBack) * front, `rack at ${r.x} back`).toBeGreaterThanOrEqual(-1e-6);
        expect(((r.z - front * 0.6) - boxBack) * front).toBeLessThanOrEqual(A7_RACK_PROUD + 1e-6);
        expect(r.x - 0.3).toBeGreaterThanOrEqual(x0 - 1e-6);
        expect(r.x + 0.3).toBeLessThanOrEqual(x1 + 1e-6);
      }
      // the run's own greybox box is the collision: a solid 2.2 m noLedge box exactly on A7_RACKS, unchanged
      const g = grey.find((p) => p.collide && Math.abs(p.c[0] - (x0 + x1) / 2) < 1e-6 && Math.abs(p.c[2] - (z0 + z1) / 2) < 1e-6)!;
      expect(g.noLedge && Math.abs(g.s[1] - A7_RACK_H) < 1e-9).toBe(true);
    }
    for (const u of units) {
      expect(A7_UNITS.some((x) => Math.abs(u.x - x) < 1e-9)).toBe(true);
      expect(u.z).toBeCloseTo(A7_UNIT_Z, 9);
      expect(u.yaw).toBeCloseTo(Math.PI, 9);
      expect(u.y).toBeCloseTo(A7_PROP_LIFT, 9);
      // front (-z) 5 cm out of the greybox box at z 54.75-55.65, back 5 cm short of the corridor wall
      expect(u.z - 0.45).toBeCloseTo(A7_UNIT.z0 - A7_RACK_PROUD, 6);
      expect(u.z + 0.45).toBeCloseTo(A7_UNIT.z1 - A7_RACK_PROUD, 6);
    }
    // no prop box is written (nothing the dressing adds collides); the props' solid boxes sit within 5 cm of the greybox runs they cover
    expect(dressing.filter((p) => p.collide)).toEqual([]);
    for (const r of racks) {
      const w = propCollisionBox(r)![0]!;
      const cover = A7_RACKS.find(([x0, x1, z0, z1]) => w.c[0] > x0 && w.c[0] < x1 && Math.abs(w.c[2] - (z0 + z1) / 2) < 0.2)!;
      expect(w.noLedge).toBe(true);
      expect(w.c[0] - w.s[0] / 2).toBeGreaterThanOrEqual(cover[0] - A7_RACK_PROUD - 1e-6);
      expect(w.c[0] + w.s[0] / 2).toBeLessThanOrEqual(cover[1] + A7_RACK_PROUD + 1e-6);
      expect(w.c[2] - w.s[2] / 2).toBeGreaterThanOrEqual(cover[2] - A7_RACK_PROUD - 1e-6);
      expect(w.c[2] + w.s[2] / 2).toBeLessThanOrEqual(cover[3] + A7_RACK_PROUD + 1e-6);
    }
  });

  it("the rack ends and the unit flanks (faces the props share with the greybox boxes) are capped by skins 3 cm out, over the props' whole depth; the racks' hot sides carry rear panels", () => {
    for (const [i, [x0, x1, z0, z1]] of A7_RACKS.entries()) {
      const front = A7_RACK_FRONT[i]!;
      const zc = (front > 0 ? z1 : z0) + front * A7_RACK_PROUD - front * 0.6;
      for (const [x, dir] of [[x0, -1], [x1, 1]] as const) {
        const cap = skinsIn(dir < 0 ? x - 0.03 : x, dir < 0 ? x : x + 0.03, 0.1, 2.1, Math.min(z0, zc - 0.6) + 0.01, Math.max(z1, zc + 0.6) - 0.01);
        expect(cap.length, `run ${i} end at x ${x}`).toBeGreaterThan(0);
        expect(cap.some((p) => p.s[1] > 2.0 && p.s[2] > 1.1)).toBe(true);
      }
      // the rear (not on the east run, which stands on the cage's kick panel)
      const at = front > 0 ? z0 : z1;
      if (i !== 1) expect(skinsIn(x0 + 0.1, x1 - 0.1, 0.1, 2.0, at - 0.03, at + 0.03).some((p) => p.s[0] > 4.1)).toBe(true);
    }
    for (const u of units) {
      for (const dir of [-1, 1]) {
        const x = u.x + dir * 0.9;
        const flank = skinsIn(dir < 0 ? x - 0.03 : x, dir < 0 ? x : x + 0.03, 0.1, 1.9, A7_UNIT_Z - 0.4, A7_UNIT.z1 - 0.05);
        expect(flank.some((p) => p.s[1] > 1.9 && p.s[2] > 0.9), `unit ${u.x} flank ${dir}`).toBe(true);
      }
    }
  });

  it("budgets (computed): kit triangles <= 60 k; the props pass FacilityProps.check against the set box at 60 k triangles and 12 draws, with the facility's set-side plate in the box counted", () => {
    expect(kitIn.some((i) => i.piece === 'wallPanel')).toBe(true);
    const kitTris = kitTriangles({ instances: kitIn, doors: [] }, kitReport);
    expect(kitTris).toBeGreaterThan(0);
    expect(kitTris, `${kitTris} kit triangles`).toBeLessThanOrEqual(60_000);
    const facilityIn = built.facility.props.filter((p) => inBox(box, p.x, p.z));
    expect(facilityIn.some((p) => p.prop === 'signPlate')).toBe(true);
    const counted = [...own, ...facilityIn];
    const checker = (list: readonly PropPlacement[]): FacilityProps => {
      const f = new FacilityProps();
      f.placements.push(...list);
      return f;
    };
    expect(checker(counted).check(area, propReport)).toEqual([]);
    expect(propTriangles(counted, propReport)).toBeLessThanOrEqual(PROP_SET_BUDGET.tris);
    expect(propDraws(counted, propReport)).toBeLessThanOrEqual(PROP_SET_BUDGET.draws);
    expect(new Set(own.map((p) => p.prop))).toEqual(new Set(['serverRack', 'coolingUnit', 'cableTray', 'signPlate']));
  });

  it('props inside the set box: every drawn footprint; the cable trays are hung props above head height (2.25 m or more) with no gameplay box; every sign plate hangs on a wall face', () => {
    for (const p of own) {
      const f = PROP_FOOTPRINT[p.prop];
      for (const [lx, lz] of [[f[0], f[1]], [f[2], f[1]], [f[2], f[3]], [f[0], f[3]]] as const) {
        const w = propToWorld(p, lx, 0, lz);
        expect(inBox(box, w[0], w[2], 1e-6), `${p.prop} at ${p.x}, ${p.z}`).toBe(true);
      }
    }
    const trays = own.filter((p) => p.prop === 'cableTray');
    expect(trays.length).toBeGreaterThanOrEqual(40);
    expect(PROP_HUNG).toContain('cableTray');
    expect(PROP_HUNG).toContain('signPlate');
    for (const t of trays) {
      expect(t.y).toBeGreaterThanOrEqual(2.25 - 1e-9);
      expect(propCollisionBox(t)).toBeNull();
      // under the room's ceiling
      expect(t.y + 0.5, `tray at ${t.x}, ${t.z}`).toBeLessThan(t.z < 55.65 ? A7_H.corridor : A7_H.slab);
    }
    for (const [x0, z0, x1, z1, y] of A7_TRAYS) {
      expect(y).toBeGreaterThan(A7_RACK_H);
      expect(trays.some((t) => Math.abs(t.y - y) < 1e-9 && t.x >= Math.min(x0, x1) - 1e-6 && t.x <= Math.max(x0, x1) + 1e-6 && t.z >= Math.min(z0, z1) - 0.2 && t.z <= Math.max(z0, z1) + 0.2)).toBe(true);
    }
    const plates = own.filter((p) => p.prop === 'signPlate');
    expect(plates.length).toBeGreaterThanOrEqual(9);
    for (const p of plates) {
      expect(propCollisionBox(p)).toBeNull();
      expect(p.y).toBeGreaterThanOrEqual(2.15);
    }
    // three of them on the riser block's two faces, over its doors
    expect(plates.filter((p) => Math.abs(p.x - A7_RISER.x1) < 1e-9 && p.z > A7_RISER.z0).length).toBe(2);
    expect(plates.filter((p) => Math.abs(p.z - A7_RISER.z0) < 1e-9 && p.x < A7_RISER.x1).length).toBe(1);
  });

  it('every prop with an emissive part carries a circuit group (S3-7 S1, light parity): the 37 racks\' LEDs are on the rack-row strips (70), the three cooling units\' screens on the plant corridor (72), each sign plate on the circuit of the side it faces (70 lobby and hall, 72 corridor, 73 pod)', () => {
    const plan = new Set(Object.values(marlowCourseGroups()));
    const [g0, g1] = setGroups('a7DataHall');
    const glowing = own.filter((p) => propGlows(p) && !PROP_OWN_SUPPLY.includes(p.prop));
    const of = (prop: string): PropPlacement[] => glowing.filter((p) => p.prop === prop);
    expect(of('serverRack')).toHaveLength(37);
    expect(of('coolingUnit')).toHaveLength(3);
    expect(of('signPlate')).toHaveLength(9);
    expect(glowing).toHaveLength(49);
    for (const p of glowing) {
      expect(p.group, `${p.prop} at ${p.x}, ${p.y}, ${p.z}`).toBeDefined();
      expect(plan.has(p.group!), `${p.prop} group ${p.group}`).toBe(true);
      expect(p.group!).toBeGreaterThanOrEqual(g0);
      expect(p.group!).toBeLessThanOrEqual(g1);
    }
    for (const p of of('serverRack')) expect(p.group).toBe(70);
    for (const p of of('coolingUnit')) expect(p.group).toBe(72);
    expect(of('signPlate').map((p) => p.group).sort()).toEqual([70, 70, 70, 70, 70, 70, 72, 72, 73]);
  });

  it("every kit glow in A7 carries a circuit of the plan's A7 rows: hall panels on 70 from the slab's top (4.2 m), the wall over the gallery glazing on 72 from 7.5 m, the accent slots on 70 / 72 / 73 (no light); no lamp was added", () => {
    const plan = new Set(Object.values(marlowCourseGroups()));
    const [g0, g1] = setGroups('a7DataHall');
    const glowing = kitIn.filter((i) => ['wallPanel', 'skirting', 'column', 'handrail'].includes(i.piece) || (i.piece === 'ledSlot' && !i.noLed));
    expect(glowing.length).toBeGreaterThan(40);
    for (const i of glowing) {
      expect(i.group, `${i.piece} at ${i.x}, ${i.y}, ${i.z}`).toBeDefined();
      expect(plan.has(i.group!), `${i.piece} group ${i.group}`).toBe(true);
      expect(i.group!).toBeGreaterThanOrEqual(g0);
      expect(i.group!).toBeLessThanOrEqual(g1);
    }
    const panels = glowing.filter((i) => i.piece === 'wallPanel');
    // only the hall's panels above the slab (the set's own walls keep their finish)
    for (const i of panels) expect(i.y, `panel at ${i.x}, ${i.z}`).toBeGreaterThanOrEqual(A7_H.slab + 0.2 - 1e-9);
    for (const i of panels) expect(i.group, `panel at ${i.x}, ${i.y}, ${i.z}`).toBe(i.y >= GAL_TOP - 1e-9 ? 72 : 70);
    expect(panels.filter((i) => i.group === 70 && Math.abs(i.x - 70.25) < 0.1).length).toBeGreaterThan(8);
    expect(panels.filter((i) => i.group === 70 && Math.abs(i.z - 71.75) < 0.1).length).toBeGreaterThan(10);
    expect(panels.filter((i) => i.group === 70 && Math.abs(i.x - 99.75) < 0.1).length).toBeGreaterThan(8);
    expect(panels.filter((i) => i.group === 72 && Math.abs(i.z - 52.25) < 0.1 && i.y >= GAL_TOP - 1e-9).length).toBeGreaterThan(10);
    // the accent slots: cool under the rack-row trays (70), the corridor ceiling line (72), the pod roof line (73), all without a light
    const slots = kitIn.filter((i) => i.piece === 'ledSlot');
    expect(slots.filter((i) => i.group === 70)).toHaveLength(4);
    expect(slots.filter((i) => i.group === 72)).toHaveLength(1);
    expect(slots.filter((i) => i.group === 73)).toHaveLength(1);
    expect(slots.every((i) => !i.noLed)).toBe(true);
    expect(lamps).toHaveLength(GREY.lights);
    expect(HALL_H).toBeGreaterThan(A7_H.slab + 0.2);
    for (const l of lamps) expect(l.group).toBeGreaterThanOrEqual(g0);
  });

  /** The clearance windows the cage test expects bare, as [x0, x1, y0, y1, z0, z1] (the planted-skin test below runs the same list). */
  type ClearWindow = { name: string; w: [number, number, number, number, number, number] };
  const clearWindows = (): ClearWindow[] => {
    const out: ClearWindow[] = [];
    for (const x of [cage.x0, cage.x1]) out.push({ name: `fence ${x}`, w: [x - 0.15, x + 0.15, 1.9, 2.3, 61.4, 61.6] });
    for (const [sx, sz] of [A7_T1_SPOT, A7_T2_SPOT]) out.push({ name: `spot ${sx}, ${sz}`, w: [sx - 0.5, sx + 0.5, 0.05, 3.0, sz - 0.5, sz + 0.5] });
    // the doors' clear openings (1.2 x 2.1, through the wall's thickness): the hall door, the plant door, the pod door, both cage doors
    const d = (id: string) => b.anchors.doors.find((q) => q.id === course.doors[id])!;
    for (const id of [A7_HALL_DOOR, A7_PLANT_DOOR, A7_POD_DOOR, A7_CAGE_W, A7_CAGE_E]) {
      const q = d(id);
      const alongZ = Math.abs(Math.sin(q.yaw)) < 0.5;
      const x0 = alongZ ? q.hinge.x - 0.14 : q.hinge.x;
      const x1 = alongZ ? q.hinge.x + 0.14 : q.hinge.x + q.width;
      const z0 = alongZ ? q.hinge.z : q.hinge.z - 0.14;
      const z1 = alongZ ? q.hinge.z + q.width : q.hinge.z + 0.14;
      out.push({ name: id, w: [x0, x1, 0.05, 2.1, z0, z1] });
    }
    // the L6 far and L7 near sliding doors (1.8 m, frames to 2.42 m) on the set box's edges
    out.push({ name: 'L6 far sliding door', w: [70.2, 70.3, 0.05, 2.45, 61.0, 63.0] });
    out.push({ name: 'L7 near sliding door', w: [99.7, 99.8, 0.05, 2.45, 59.0, 61.0] });
    // the cameras lenses (the 0.2 m round the mount point) are free of skins
    for (const c of [A7_CAM1, A7_CAM2]) out.push({ name: c.id, w: [c.at[0] - 0.1, c.at[0] + 0.1, c.y - 0.15, c.y + 0.15, c.at[1] - 0.1, c.at[1] + 0.1] });
    // the units west lees: no skin above the floor within 0.25 m of the lee foot (the body is 0.3: a skin stands at most 5 cm off a box face, inside the capsule standoff)
    for (const [x, z] of A7_LEES) out.push({ name: `lee ${x}`, w: [x - 0.25, x + 0.25, 0.05, 1.8, z - 0.25, z + 0.25] });
    return out;
  };

  it("the cage keeps its clearances: no skin on the ready lamps' line (fence x 86 and 96, z 61.4-61.6, y 1.9-2.3), none within 0.5 m of either hack spot above the floor, the doors' clear openings and the cameras' lenses bare", () => {
    for (const { name, w } of clearWindows()) expect(skinsIn(...w).map((p) => p.c), name).toEqual([]);
  });

  it('the clearance windows have teeth: the same query over the dressing plus one planted 0.03 m skin inside each window (the ready-lamp line, the hack spots, the door openings, the sliding doors, the lenses, the lees) finds exactly that skin', () => {
    const wins = clearWindows();
    expect(wins).toHaveLength(2 + 2 + 5 + 2 + 2 + A7_LEES.length);
    for (const { name, w } of wins) {
      const skin = plantIn(w);
      expect(skinsInOf(skins, ...w), `${name} bare without the plant`).toEqual([]);
      const found = skinsInOf([...skins, skin], ...w);
      expect(found, `${name} planted skin`).toHaveLength(1);
      expect(found[0], `${name} planted skin`).toBe(skin);
    }
  });

  it('the raised floor and the grating: 0.6 m tile seams across the lobby and hall (60 or more), 14 perforated tiles in aisle B, every floor skin flush (under 4 cm), the grating 60 bars across x 86-92 over a dark pit', () => {
    const floor = skins.filter((p) => top(p) <= 0.04);
    expect(floor.length).toBeGreaterThan(150);
    const seams = skins.filter((p) => top(p) < 0.0061 && (p.s[0] < 0.021 || p.s[2] < 0.021) && p.c[2] > 56 && p.c[0] > 70 && p.c[2] < 72 && Math.max(p.s[0], p.s[2]) > 5);
    expect(seams.length).toBeGreaterThan(60);
    // perforated tiles: the darker squares 0.48 on a side, one row on each side of aisle B (z 60.3 and 62.7), seven columns from x 78.9
    const tiles = skins.filter((p) => Math.abs(p.s[0] - 0.48) < 1e-6 && Math.abs(p.s[2] - 0.48) < 1e-6);
    expect(tiles).toHaveLength(14);
    for (const t of tiles) {
      expect([60.3, 62.7].some((z) => Math.abs(t.c[2] - z) < 1e-6)).toBe(true);
      expect(t.c[0]).toBeGreaterThan(78.6);
      expect(t.c[0]).toBeLessThan(83.0);
    }
    const bars = skins.filter((p) => p.c[0] > A7_GRATING.x0 && p.c[0] < A7_GRATING.x1 && Math.abs(p.s[0] - 0.04) < 1e-6 && p.s[2] > 3.3 && top(p) < 0.03);
    expect(bars).toHaveLength(60);
    // the grating stays flush (nothing over 4 cm on the trench) and its surface is still metal
    for (const p of skinsIn(A7_GRATING.x0, A7_GRATING.x1, 0, 5, 52.4, 55.5)) expect(top(p)).toBeLessThanOrEqual(0.04 + 1e-9);
    for (const z of [52.4, 53.9, 55.5]) expect(surfaceAt(b.surfaces, 89, 0, z, 'concrete')).toBe('metal');
  });

  it("the riser block reads as a services core: its box is the greybox's (solid, noLedge, 6 x 6 m), and both faces carry doors, hatches, ladders, conduit, pipes and plates as skins", () => {
    const riser = grey.find((p) => p.collide && Math.abs(p.c[0] - (70.25 + 76.15) / 2) < 1e-6 && Math.abs(p.c[2] - (65.85 + 71.75) / 2) < 1e-6)!;
    expect(riser).toBeDefined();
    expect(riser.noLedge).toBe(true);
    expect(riser.s[0]).toBeCloseTo(5.9, 9);
    expect(riser.s[2]).toBeCloseTo(5.9, 9);
    const eastFace = skinsIn(A7_RISER.x1, A7_RISER.x1 + 0.2, 0, A7_H.slab, A7_RISER.z0, A7_RISER.z1);
    const southFace = skinsIn(A7_RISER.x0, A7_RISER.x1, 0, A7_H.lobby, A7_RISER.z0 - 0.2, A7_RISER.z0);
    expect(eastFace.length).toBeGreaterThan(100);
    expect(southFace.length).toBeGreaterThan(50);
    // two riser doors on the hall face (z 67.0 and 70.4: a 1.04 m frame to 2.12 m), one on the lobby face (x 71.35)
    for (const z of [67.0, 70.4]) expect(eastFace.some((p) => Math.abs(p.c[2] - z) < 0.01 && p.s[2] > 1.0 && top(p) > 2.1)).toBe(true);
    expect(southFace.some((p) => Math.abs(p.c[0] - 71.35) < 0.01 && p.s[0] > 1.0 && top(p) > 2.1)).toBe(true);
    // a vertical cable ladder (two rails and rungs every 0.3 m), conduit risers and two pipe runs at 3.2 / 3.45
    expect(eastFace.filter((p) => p.s[2] < 0.045 && p.s[1] > 3.5 && p.c[2] > 69 && p.c[2] < 70).length).toBeGreaterThanOrEqual(2);
    expect(eastFace.filter((p) => p.s[1] > 3.5 && p.c[2] > 66 && p.c[2] < 66.5).length).toBeGreaterThanOrEqual(3);
    for (const y of [3.27, 3.52]) expect(eastFace.some((p) => Math.abs(p.c[1] - y) < 0.01 && p.s[2] > 5)).toBe(true);
    // the three access hatches on the hall face
    expect(eastFace.filter((p) => Math.abs(p.c[2] - 68.55) < 0.01 && Math.abs(p.s[2] - 0.5) < 1e-6 && Math.abs(p.s[1] - 0.6) < 1e-6)).toHaveLength(3);
    // a hazard base on both faces (yellow with black dashes)
    expect(eastFace.filter((p) => top(p) < 0.16 && p.c[1] < 0.1).length).toBeGreaterThan(15);
    expect(southFace.filter((p) => top(p) < 0.16 && p.c[1] < 0.1).length).toBeGreaterThan(10);
    // no skin leaves the face's wall by more than 15 cm
    for (const p of eastFace) expect(p.c[0] - p.s[0] / 2).toBeLessThanOrEqual(A7_RISER.x1 + 0.15 + 1e-9);
  });

  it("the tech's round and the lanes are as the greybox left them: no skin stands in the aisles above the floor (the loop's legs, the corridor lane and the pod are open to 2.1 m)", () => {
    for (let i = 1; i < A7_TECH_ROUTE.length; i++) {
      const [ax, az] = A7_TECH_ROUTE[i - 1]!;
      const [bx, bz] = A7_TECH_ROUTE[i]!;
      const n = Math.ceil(hyp2(bx - ax, bz - az) / 0.1);
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n;
        const z = az + ((bz - az) * k) / n;
        expect(skinsIn(x - 0.3, x + 0.3, 0.05, 2.1, z - 0.3, z + 0.3).map((p) => p.c), `route leg ${i} at ${x.toFixed(2)}, ${z.toFixed(2)}`).toEqual([]);
      }
    }
    for (const z of [53.9, 54.2]) for (let x = 73; x <= 98; x += 0.25) expect(skinsIn(x - 0.3, x + 0.3, 0.05, 2.1, z - 0.3, z + 0.3).map((p) => p.c), `corridor ${x}, ${z}`).toEqual([]);
    for (const [x, z] of [[98, 57.5], [98, 62], [98, 66.5], [A7_T2_SPOT[0], A7_T2_SPOT[1]]] as const) expect(skinsIn(x - 0.3, x + 0.3, 0.05, 2.1, z - 0.3, z + 0.3).map((p) => p.c), `pod ${x}, ${z}`).toEqual([]);
  });
});
