/**
 * A8 the Strongroom (marlow-final slice 8; set doc `docs/marlow-final/sets/a8Strongroom.md`): the set's own cases. The gallery is a
 * hand slab with one planned lip (the return's open loading edge: in the band, on `COOP_LIPS`, no solo jump reaches it, the leg-up
 * takes it, every other piece `noLedge`); C2 sees the gallery's last 8 m from over its level and the jam from behind the counters
 * reaches it; the console loops the three cameras for 60 s (re-arm 20 s); the lighting board cuts the night circuit for 25 s (re-arm
 * 5 s) and the grille, a mains gate on it, opens with it and relocks when it returns; the stair bar and the request-to-exit are
 * out of reach from the wrong side; the beam curtain is the throw's (the beams every body gap under a crouch, a throw clears them,
 * `a8-sync` switches them off); the two time locks are a scanner pair no player alone can serve and no stair or hall point
 * reaches; every lamp is on its circuit with the tuned levels; the three guards are armed with walkable routes; the steps validate
 * and read per player with the gallery claim. The map-wide frames (`tests/ctcourse.test.ts`, `tests/ctcourseLight.test.ts`) run the
 * contract, the register and the light bands over this part too. Moved here from the old station 6 scanner / guard info cases
 * (`A8_SCANNERS`, the `a8-officer` lines).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/ai/enemyDefs';
import { GUARD_INFO_LINE_MAX } from '../../src/ai/guardInfo';
import { NavGrid, type NavBlocker } from '../../src/ai/navGrid';
import { PatrolWalker } from '../../src/ai/patrol';
import { COURSE_TEXT_MAX } from '../../src/config/course';
import { LEAP, MOVEMENT, TEAM, WALL_JUMP } from '../../src/config/movement';
import { hyp2, hyp3 } from '../../src/core/mathx';
import { layoutKnownIds, validateCourse, type EgressGate, type FlagGate, type IsolatorGate, type MainsGate } from '../../src/game/course/courseDef';
import { CourseState } from '../../src/game/course/courseState';
import { consoleErrors } from '../../src/game/course/securityRoom';
import { JAMMER, LASER, laserTouch } from '../../src/game/jammer';
import { checkPanels, panelFor, panelTarget } from '../../src/game/laserPanels';
import { newScanPair, newScanResult, REFUSE_SCAN_OTHER, SCAN_GLOW, scanGlowAt, SCANNER, scanStart, scanStep, SC_IDLE } from '../../src/game/scanners';
import { throwArc, throwLanding, throwLandingOk, throwRoom } from '../../src/game/teamMoves';
import { GRAVITY } from '../../src/physics/havok';
import { camPitch, camRange, inFrame, sweepYaw } from '../../src/security/camera';
import { validateSecurity, type CameraDevice } from '../../src/security/data';
import { remoteHeadY } from '../../src/security/securitySystem';
import { findJumpTarget, generateLedges, LEDGE, type Ledge } from '../../src/world/anchors';
import { kitTriangles } from '../../src/world/kit/facilityKit';
import { FacilityProps, propGlows, PROP_OWN_SUPPLY, propCollisionBox, propDraws, propToWorld, propTriangles, PROP_FOOTPRINT, PROP_HUNG, PROP_OVERHANG, PROP_SET_BUDGET, type PropPlacement, type PropReport } from '../../src/world/props/facilityProps';
import { CANON_MIN_THICK } from '../../src/voxel/lightShapes';
import { LevelBuilder, type BoxPiece } from '../../src/world/levelBuilder';
import { MARLOW_LEVEL } from '../../src/world/lighting/levels';
import { circuitOf, LURE_RANGE, marlowCourseGroups, SILENT_PACE } from '../../src/world/lighting/marlowCircuits';
import { surfaceAt } from '../../src/world/surfaces';
import { buildCtcourse, COOP_LIPS, LIGHT_SPOTS } from '../../src/world/maps/ctcourse';
import { BEAM_KEEP_CLEAR, COOP_BAND, GREY_KEEP_CLEAR, JAM_WINDOW, LEGUP_STANDOFF, SILENT_CROUCH, syncMinGap, syncStation, throwGateway } from '../../src/world/maps/ctcourseGreybox';
import {
  A8_BOARD,
  A8_BAYS,
  A8_BOARD_WEST,
  A8_CAMERAS,
  A8_CEIL_TOP,
  A8_CHECKER,
  A8_COLUMNS_N,
  A8_COLUMNS_W,
  A8_CONSOLE,
  A8_CONSOLE_GATE,
  A8_COUNTER_MAIN,
  A8_COUNTER_MAIN_X,
  A8_COUNTER_MAIN_Z,
  A8_COUNTER_RETURN,
  A8_COUNTER_RETURN_X,
  A8_COUNTER_RETURN_Z,
  A8_CORNICE,
  A8_DESK,
  A8_DEPOSIT_X,
  A8_DESK_PROP,
  A8_GALLERY_LEVEL,
  A8_GAL_FLAG,
  A8_GAL_ZONE,
  A8_EAST_P,
  A8_GATEWAY,
  A8_GRILLE,
  A8_GRILLE_GATE,
  A8_GRILLE_SPOT,
  A8_H,
  A8_INNER_FLAG,
  A8_INNER_ZONE,
  A8_JAM,
  A8_LANDING,
  A8_LASER,
  A8_LEGUP,
  A8_LEVELS,
  A8_LIP,
  A8_LOBBY_FLAG,
  A8_LOBBY_ZONE,
  A8_LOOP,
  A8_LOOP_FLAG,
  A8_MARKS,
  A8_N1,
  A8_N1_FACES,
  A8_N1_POST,
  A8_N1_ROUTE,
  A8_N1_WAITS,
  A8_N2,
  A8_N2_FACES,
  A8_N2_ROUTE,
  A8_N2_WAITS,
  A8_NIGHT_GATE,
  A8_NIGHT_GROUP,
  A8_NORTH_P,
  A8_OFFICE_DOOR,
  A8_OFFICE_STAIR,
  A8_OFFICER,
  A8_OFFICER_INFO,
  A8_OFFICER_POST,
  A8_OPEN_EDGE,
  A8_PANEL,
  A8_PANEL_Y,
  A8_PASS_WAIT,
  A8_PIER,
  A8_PROP_LIFT,
  A8_PUBLIC_STAIR,
  A8_STAIR_RAIL,
  A8_RAIL_LIFT,
  A8_RETURN,

  A8_RTE,
  A8_RTE_GATE,
  A8_RTE_AT,
  A8_RTE_GATE_ON,
  A8_RUNNER,
  A8_SCANNER,
  A8_SHELL,
  A8_SIGNS,
  A8_SOUTH_P,
  A8_STAIR_BAR,
  A8_STAIR_BLOCK_X0,
  A8_STAIR_FOOT,
  A8_STAIR_GATE,
  A8_STAIR_TOP,
  A8_SYNC_FLAG,
  A8_T1,
  A8_T1_AT,
  A8_T1_SPOT,
  A8_T2,
  A8_T2_AT,
  A8_T2_SPOT,
  A8_THROW,
  A8_VAULT,
  A8_VAULT_GATE,
  A8_WEST_P,
  A8_WINDOW_N,
  A8_WINDOW_S,
  A8_WINDOW_Y,
} from '../../src/world/maps/ctcourseSets/a8Strongroom';
import { checkSetPart, HALL_H, inBox, OBJECTIVE_ID_MAX, registerSum, SET_BOX, EXIT_ZONE } from '../../src/world/maps/ctcourseSets/types';
import { lastTimeAtOrOver, LEAP_APEX, MANTLE, SOLO_TOP_SPEED, soloJumpThreats } from '../helpers/soloJumpReach';

const b = new LevelBuilder();
const built = buildCtcourse(b);
const part = built.parts[7]!;
const lay = built.layout;
const course = lay.course!;
const def = course.def;
const range = built.ranges.a8Strongroom;
const mineAll = b.boxes.slice(range.boxes[0], range.boxes[1]);
/** The greybox as S8 built it (slice 8 steps 2-4): its 138 boxes (81 solids), 16 lamps, 5 doors, one manual ledge. The dressing (step 5) is appended after. */
const GREY = { boxes: 138, solids: 81, lights: 16, doors: 5, anchors: 1, checksum: 69168.01343550302 };
const mine = mineAll.slice(0, GREY.boxes);
const dressing = mineAll.slice(GREY.boxes);
/** The public stair's open-side collision rail (S8-check polish 10): the dressing's invisible `kit.handrail` boxes on the two lines x `A8_STAIR_RAIL.x` (thirteen a side). */
const stairRail = dressing.filter((p) => p.collide && p.visible === false && A8_STAIR_RAIL.x.some((x) => Math.abs(p.c[0] - x) < 1e-6));
const box = SET_BOX.a8Strongroom[0]!;
const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && inBox(box, l.x, l.z) && l.group >= 80 && l.group < 90);
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
/** Every axis-aligned collision box of the map (the pitched stair ramps are the frame's own). */
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
const tuned = (JSON.parse(readFileSync('tests/ctcourse/a8Strongroom.light.json', 'utf8')) as { levels: Record<string, number> }).levels;
const anchors = generateLedges(b.boxes, b.anchors);
const gateOf = <T>(id: string): T => part.bay.gates.find((g) => g.id === id) as unknown as T;

/** The solid boxes whose band (floor to 1.7 m over `y`) is within `r` of (x, z): what a body walking there touches. */
const blockedAt = (x: number, z: number, r = MOVEMENT.radius, y = 0): string[] =>
  solid
    .filter((p) => bottom(p) < y + 1.7 && top(p) > y + 0.15)
    .filter((p) => hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r)
    .map((p) => `box (${p.c.map((v) => v.toFixed(2)).join(', ')}) size (${p.s.map((v) => v.toFixed(2)).join(', ')})`);
/** A walk from (x0, z0) to (x1, z1) in 0.1 m steps over floor `y`: the first point a body of radius `r` touches a solid, or null. */
const walkBlocked = (x0: number, z0: number, x1: number, z1: number, r = MOVEMENT.radius, y = 0): string | null => {
  const n = Math.ceil(hyp2(x1 - x0, z1 - z0) / 0.1);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const z = z0 + ((z1 - z0) * i) / n;
    const hit = blockedAt(x, z, r, y)[0];
    if (hit) return `(${x.toFixed(2)}, ${z.toFixed(2)}): ${hit}`;
  }
  return null;
};
const walkPath = (pts: readonly (readonly [number, number])[], r = MOVEMENT.radius, y = 0): string | null => {
  for (let i = 1; i < pts.length; i++) {
    const hit = walkBlocked(pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1], r, y);
    if (hit) return `leg ${i}: ${hit}`;
  }
  return null;
};
const pathLen = (pts: readonly (readonly [number, number])[]): number => pts.reduce((n, p, i) => (i === 0 ? 0 : n + hyp2(p[0] - pts[i - 1]![0], p[1] - pts[i - 1]![1])), 0);

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
/** The collision boxes (`G.STATIC`: sight, the jam line, camera rays) the segment p -> q passes through. A closed door is no box here. */
const blockers = (p: V3, q: V3, among: readonly BoxPiece[] = solid): BoxPiece[] => among.filter((o) => segHits(p, q, o));
/** A camera's lens in the world (its mount over its level's floor). */
const lens = (c: CameraDevice): V3 => [c.at[0], c.y + (A8_LEVELS[c.level] ?? 0), c.at[1]];
/** Is a head at (x, y, z) in the camera's frame (its own level's floor: `y` is the world height of the head)? */
const framed = (c: CameraDevice, x: number, y: number, z: number, crouched: boolean, t = 0): boolean =>
  inFrame(sweepYaw(c, t), c.at[0], c.y, c.at[1], x, remoteHeadY(y, crouched) - (A8_LEVELS[c.level] ?? 0), z, camPitch(c), camRange(c));
/** A fresh course at set 8 with the two players at the given feet (feet y per player). */
function runAt(a: [number, number, number?], c: [number, number, number?]): CourseState {
  const s = new CourseState(def, course.consoles);
  s.startAt(8);
  s.setPlayer(0, a[0], a[2] ?? 0, a[1], false);
  s.setPlayer(1, c[0], c[2] ?? 0, c[1], false);
  s.update(1 / 60);
  return s;
}
const run = (s: CourseState, sec: number): void => {
  for (let t = 0; t < sec - 1e-9; t += 1 / 60) s.update(1 / 60);
};
const stepOf = (id: string) => def.objectives!.find((o) => o.id === id)!;
const HALL: [number, number] = [120, 62];

describe('A8 the Strongroom: the part', () => {
  it('is built (not the stub) and passes the contract rules', () => {
    expect(part.id).toBe('a8Strongroom');
    expect(part.stub).toBeUndefined();
    expect(checkSetPart(part)).toEqual([]);
  });

  it("every register row is an A8 row; the lamps, solids, doors and anchors they count are the builder's", () => {
    expect(part.register.every((r) => r.id.startsWith('A8-'))).toBe(true);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A8-1', 'A8-2', 'A8-3', 'A8-4', 'A8-5', 'A8-6', 'A8-7', 'A8-8', 'A8-9', 'A8-10', 'A8-11', 'A8-12', 'A8-13', 'A8-14', 'A8-15']));
    const sum = registerSum(part.register);
    expect(sum).toEqual(built.counts.sets.a8Strongroom);
    // 16 lamps (81: 7, 82: 3, 83: 2, 84: 2 panels + 2 lock lamps, A8-D12), five doors (office, stair top and foot, grille, vault), the one manual ledge
    expect(sum.lights).toBe(16);
    expect(sum.doors).toBe(5);
    expect(sum.anchors).toBe(1);
    expect(sum.solids).toBe(mineAll.filter((p) => p.collide).length);
    for (const r of part.register) expect(/[–—]/.test(r.element), r.id).toBe(false);
  });

  it('everything built lies inside the set box (0.3 m of wall slack) and under the hall roof', () => {
    const [x0, z0, x1, z1] = box;
    expect(mineAll.length).toBeGreaterThan(80);
    expect(mine).toHaveLength(GREY.boxes);
    for (const p of mineAll.filter((q) => Math.abs(q.yaw) < 1e-3 && Math.abs(q.pitch) < 1e-3)) {
      expect(p.c[0] - p.s[0] / 2, 'west').toBeGreaterThanOrEqual(x0 - 0.3);
      expect(p.c[0] + p.s[0] / 2, 'east').toBeLessThanOrEqual(x1 + 0.3);
      expect(p.c[2] - p.s[2] / 2, 'south').toBeGreaterThanOrEqual(z0 - 0.3);
      expect(p.c[2] + p.s[2] / 2, 'north').toBeLessThanOrEqual(z1 + 0.3);
      expect(top(p)).toBeLessThanOrEqual(10 + 1e-6);
    }
    for (const l of lamps) expect(l.y, `lamp ${l.id}`).toBeLessThan(A8_H.hall);
  });

  it('the plan: a 9 m hall ceiling, a 1.2 m main counter from x 114 and its return, a 0.75 m night desk, the office floor at 4.4 and ceiling 7.4, the lobby ceiling 5.5, the vault roof 3.0', () => {
    const ceil = mine.find((p) => p.collide && p.overhead && Math.abs(bottom(p) - A8_H.hall) < 1e-6)!;
    expect(ceil).toBeDefined();
    expect(ceil.noLedge).toBe(true);
    // the ceiling spans the hall wall face to wall face; the columns stand under the north run's front edge, the return's on x 109
    expect(ceil.c[0] - ceil.s[0] / 2).toBeCloseTo(A8_SHELL.west, 9);
    expect(ceil.c[2] + ceil.s[2] / 2).toBeCloseTo(A8_SHELL.north, 9);
    for (const x of A8_COLUMNS_N) {
      const col = mine.find((p) => p.collide && Math.abs(p.c[0] - x) < 1e-6 && Math.abs(p.c[2] - 75) < 1e-6)!;
      expect([col.s[0], col.s[2], top(col), bottom(col)].map((v) => Number(v.toFixed(3)))).toEqual([0.4, 0.4, A8_H.slab, 0]);
      expect(col.noLedge).toBe(true);
    }
    for (const z of A8_COLUMNS_W) expect(mine.some((p) => p.collide && Math.abs(p.c[0] - 109) < 1e-6 && Math.abs(p.c[2] - z) < 1e-6 && Math.abs(top(p) - A8_H.slab) < 1e-6)).toBe(true);
    for (const c of [A8_COUNTER_MAIN, A8_COUNTER_RETURN]) {
      const p = mine.find((q) => q.collide && Math.abs(q.c[0] - (c.x0 + c.x1) / 2) < 1e-6 && Math.abs(q.c[2] - (c.z0 + c.z1) / 2) < 1e-6)!;
      expect(top(p)).toBeCloseTo(c.h, 9);
    }
    expect(A8_COUNTER_MAIN.x0).toBe(114);
    const desk = mine.find((q) => q.collide && Math.abs(q.c[0] - (A8_DESK.x0 + A8_DESK.x1) / 2) < 1e-6 && Math.abs(q.c[2] - (A8_DESK.z0 + A8_DESK.z1) / 2) < 1e-6)!;
    expect(top(desk)).toBeCloseTo(A8_DESK.h, 9);
    const roofs = mine.filter((p) => p.collide && p.overhead).map((p) => bottom(p).toFixed(2));
    for (const y of [A8_H.office, A8_H.lobby, A8_H.slab, A8_H.hall]) expect(roofs).toContain(y.toFixed(2));
    const vaultRoof = mine.find((p) => p.collide && Math.abs(bottom(p) - A8_H.vault) < 1e-6 && p.c[0] > 146)!;
    expect(vaultRoof.noLedge).toBe(true);
    // surfaces: the gallery's oak boards, the office carpet, the lobby's steel plate (loud), the hall marble stays the floor default
    expect(surfaceAt(b.surfaces, 120, 4.4, 76.4, 'concrete')).toBe('wood');
    expect(surfaceAt(b.surfaces, 108, 4.4, 60, 'concrete')).toBe('wood');
    expect(surfaceAt(b.surfaces, 139, 4.4, 74.7, 'concrete')).toBe('carpet');
    expect(surfaceAt(b.surfaces, 140, 0, 62, 'concrete')).toBe('metal');
    expect(surfaceAt(b.surfaces, HALL[0], 0, HALL[1], 'concrete')).toBe('concrete');
  });

  it('every collidable block 1.9 m or taller is noLedge (the two counters and the night desk, under 1.9 m, are the only others)', () => {
    for (const p of mine.filter((q) => q.collide && Math.abs(q.pitch) < 1e-3)) {
      if (top(p) >= 1.9) expect(p.noLedge, `box at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBe(true);
      else if (!p.noLedge) expect(top(p) < 1.9).toBe(true);
    }
    expect(mine.filter((p) => p.collide && !p.noLedge && Math.abs(p.pitch) < 1e-3)).toHaveLength(3);
  });
});

describe('A8 the Strongroom: the gallery (the one co-op lip, the leg-up split)', () => {
  const LIP = part.lips[0]!;
  const ledgesIn = anchors.ledges.filter((l) => inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3));

  it('the one planned lip is the return\'s open loading edge x 109, z 66-70.5 at 4.4 m: in COOP_BAND, on COOP_LIPS, normal +x (to the hall)', () => {
    expect(part.lips).toEqual([A8_LIP]);
    expect(LIP.y - LIP.floor).toBeCloseTo(4.4, 9);
    expect(LIP.y - LIP.floor).toBeGreaterThanOrEqual(COOP_BAND.min);
    expect(LIP.y - LIP.floor).toBeLessThanOrEqual(COOP_BAND.max);
    expect(COOP_LIPS).toContainEqual(LIP);
    expect([LIP.n.x, LIP.n.z]).toEqual([1, 0]);
    expect([LIP.a.z, LIP.b.z]).toEqual(A8_OPEN_EDGE);
    expect(LIP.a.x).toBe(A8_RETURN.x1);
    expect(A8_OPEN_EDGE[1] - A8_OPEN_EDGE[0]).toBeGreaterThanOrEqual(4);
    expect(4.4).toBeLessThanOrEqual(TEAM.relayMax);
  });

  it('the only grip the game offers in A8 above a body is the planned lip: no generated lip, one manual ledge on the open span (normal +x, can be climbed)', () => {
    expect(ledgesIn.filter((l) => l.piece !== 0 && l.top >= 0.9).map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
    const manual = ledgesIn.filter((l) => l.piece === 0);
    expect(manual).toHaveLength(1);
    const l = manual[0]!;
    expect(l.top).toBeCloseTo(4.4, 9);
    expect([l.a.z, l.b.z]).toEqual(A8_OPEN_EDGE);
    expect(l.a.x).toBe(109);
    expect(l.nx).toBeCloseTo(1, 9);
    expect(l.canClimbUp).toBe(true);
    // no split gap, nothing in the band anywhere in A8 but the lip
    expect(anchors.splits.filter((s) => inBox(box, s.a.x, s.a.z))).toEqual([]);
    expect(ledgesIn.filter((l2) => l2.drop >= WALL_JUMP.maxUp && l2.drop <= TEAM.boostMax).map((l2) => `(${l2.a.x}, ${l2.a.z})`)).toEqual(['(109, 66)']);
  });

  it('no solo jump reaches the lip: soloJumpThreats is empty over every solid in the map; the main counter\'s west end is 5.0 m off it (A8-D2)', () => {
    expect(soloJumpThreats(solid, LIP)).toEqual([]);
    const nearest = Math.min(...[A8_COUNTER_MAIN, A8_COUNTER_RETURN].map((c) => hyp2(Math.max(c.x0 - 109, 0), Math.max(A8_OPEN_EDGE[0] - c.z1, 0, c.z0 - A8_OPEN_EDGE[1]))));
    expect(nearest).toBeGreaterThanOrEqual(GREY_KEEP_CLEAR);
  });

  it('the check has teeth: a 1.8 m crate on the hall floor within the running jump threatens the lip, one at GREY_KEEP_CLEAR does not; the counter at x 111 would', () => {
    const crate = (gap: number): BoxPiece => ({ c: [109 + gap + 0.5, 0.9, 68.25], s: [1, 1.8, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true });
    expect(soloJumpThreats([...solid, crate(2.5)], LIP).length).toBeGreaterThan(0);
    expect(soloJumpThreats([...solid, crate(GREY_KEEP_CLEAR)], LIP)).toEqual([]);
    const near: BoxPiece = { c: [112.2, 0.6, 66], s: [2.4, 1.2, 0.74], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true };
    expect(soloJumpThreats([...solid, near], LIP).length).toBeGreaterThan(0);
  });

  it('the leg-up from the mark (0.5 m off the lip face, z 68.25) takes the loading edge; there is room beside and over the booster', () => {
    expect(A8_LEGUP.x - 109).toBeCloseTo(LEGUP_STANDOFF, 9);
    expect(A8_LEGUP.z).toBeGreaterThan(A8_OPEN_EDGE[0] + 1);
    expect(A8_LEGUP.z).toBeLessThan(A8_OPEN_EDGE[1] - 1);
    const t = findJumpTarget(anchors, { x: A8_LEGUP.x, y: TEAM.boostMax - 1.15, z: A8_LEGUP.z }, -1, -1, 0, 1, 2.2, 0.2);
    expect(t).not.toBeNull();
    const l = t!.anchor as Ledge;
    expect(l.kind).toBe('ledge');
    expect(l.piece).toBe(0);
    expect(l.top).toBeCloseTo(4.4, 9);
    for (const dz of [-TEAM.roomSide, TEAM.roomSide]) expect(blockedAt(A8_LEGUP.x, A8_LEGUP.z + dz, MOVEMENT.radius), `beside ${dz}`).toEqual([]);
    expect(solid.filter((p) => top(p) > 0.15 && bottom(p) < TEAM.roomUp && Math.abs(A8_LEGUP.x - p.c[0]) < p.s[0] / 2 && Math.abs(A8_LEGUP.z - p.c[2]) < p.s[2] / 2)).toEqual([]);
    // no column in the open span (A8-D9: the doc's third column at z 68 moved to z 65.6, a fourth at 71)
    expect(A8_COLUMNS_W.filter((z) => z > A8_OPEN_EDGE[0] - 0.2 && z < A8_OPEN_EDGE[1] + 0.2)).toEqual([]);
    // the 1.2 m balustrade closes every other front edge; none stands on the open span
    const front = mine.filter((p) => p.collide && Math.abs(bottom(p) - 4.4) < 1e-6 && Math.abs(top(p) - 5.6) < 1e-6);
    expect(front.length).toBeGreaterThanOrEqual(5);
    for (const p of front) expect(p.noLedge).toBe(true);
    for (const z of [66.2, 68.25, 70.3]) expect(front.some((p) => Math.abs(p.c[0] - 108.9) < 0.15 && Math.abs(z - p.c[2]) < p.s[2] / 2)).toBe(false);
    // the stair head is open (x 130.5-131.7 at z 75)
    expect(front.some((p) => Math.abs(p.c[2] - 75.1) < 0.15 && p.c[0] - p.s[0] / 2 < 131 && p.c[0] + p.s[0] / 2 > 131)).toBe(false);
  });

  it('the public stair: 27 risers rising north from z 67.3 to the gallery at 4.4 (1.2 m wide, 0.285 run), a ramp collider and the underside filled', () => {
    const steps = mine.filter((p) => !p.collide && p.s[1] > 0.1 && p.c[0] > 130.4 && p.c[0] < 131.8 && p.c[2] > 67 && p.c[2] < 75.1);
    expect(steps).toHaveLength(27);
    expect(Math.max(...steps.map(top))).toBeCloseTo(4.4, 9);
    expect(steps[0]!.s[0]).toBeCloseTo(1.2, 9);
    expect(4.4 / 27).toBeLessThanOrEqual(MOVEMENT.maxStep);
    expect(Math.min(...steps.map((p) => p.c[2] - p.s[2] / 2))).toBeCloseTo(A8_PUBLIC_STAIR.foot, 3);
    expect(Math.max(...steps.map((p) => p.c[2] + p.s[2] / 2))).toBeCloseTo(75.0, 1);
    expect(mine.some((p) => p.collide && Math.abs(p.pitch) > 1e-3 && p.c[0] > 130.4 && p.c[0] < 131.8)).toBe(true);
    const fillers = mine.filter((p) => p.collide && !p.visible && Math.abs(p.pitch) < 1e-3 && p.c[0] > 130.4 && p.c[0] < 131.8 && p.c[2] > 67 && p.c[2] < 75.1);
    expect(fillers.length).toBeGreaterThan(10);
    for (const f of fillers) expect(f.noLedge).toBe(true);
    // the foot is open floor and the top steps onto the slab at the balustrade's opening
    expect(blockedAt(131.1, 66.8)).toEqual([]);
    expect(blockedAt(131.1, 75.6, MOVEMENT.radius, 4.4)).toEqual([]);
    expect(anchors.ledges.filter((l) => Math.abs((l.a.x + l.b.x) / 2 - 131.1) < 0.7 && l.a.z > 67 && l.a.z < 75.3 && l.piece !== 0)).toEqual([]);
  });
});

/** The course devices' reach from the host's side: the item's own 1.4 m (`courseMode.device`) plus the 0.75 m lag margin the host takes a client's press within (`inUseReach`). */
const DEVICE_REACH = 1.4 + 0.75;
/** Where a body can stand on the stair side of the lobby's north wall: the foot landing (ground), the flight, the head landing (4.4), as (x, z, floor y). */
const stairSide: [number, number, number][] = [];
for (let x = 134.15; x <= 144.15; x += 0.1) {
  for (let z = 68.15; z <= 71.3; z += 0.1) {
    if (blockedAt(x, z, MOVEMENT.radius, 0).length === 0) stairSide.push([x, z, 0]);
    else if (x >= 142.4 && blockedAt(x, z, MOVEMENT.radius, 4.4).length === 0 && x <= 143.9) stairSide.push([x, z, 4.4]);
  }
}
for (let x = 134.5; x <= 142.2; x += 0.1) for (let z = 70.3; z <= 70.9; z += 0.1) stairSide.push([x, z, (4.4 * (x - 134.5)) / 7.7]);
/** Bodies in the hall against the east wall, as (x, z). */
const hallSide: [number, number][] = [];
for (let x = 120; x <= 133.55 + 1e-9; x += 0.1) for (let z = 51; z <= 71.3; z += 0.1) if (blockedAt(x, z, MOVEMENT.radius, 0).length === 0) hallSide.push([x, z]);
const minDist = (pts: readonly (readonly number[])[], d: { x: number; z: number }): number => Math.min(...pts.map((q) => hyp2(q[0]! - d.x, q[1]! - d.z)));
const doorAt = (id: string) => b.anchors.doors.find((d) => d.id === course.doors[id])!;
/** The mode's job on a course tick: the isolator's edge drives the light group (`CourseMode.isolatorEdge`). */
function pump(s: CourseState, sec: number): void {
  for (let t = 0; t < sec - 1e-9; t += 1 / 60) {
    s.update(1 / 60);
    for (const e of s.events) if (e.t === 'gateClosed' && e.gate === A8_NIGHT_GATE) s.setGroup(A8_NIGHT_GROUP, true);
    s.clearEvents();
  }
}
const press = (s: CourseState, id: string, p: 0 | 1): string | null => {
  const r = s.press(id, p);
  for (const e of s.events) if (e.t === 'gateOpened' && e.gate === A8_NIGHT_GATE) s.setGroup(A8_NIGHT_GROUP, false);
  s.clearEvents();
  return r;
};

describe('A8 the Strongroom: the doors, the night circuit and the grille', () => {
  it('five course doors on their lines: the office (gallery level), the stair top (4.4), the stair foot, the public grille (1.8 m) and the vault (1.4 m x 2.2); every one at least 1.2 m wide and five metres from the next', () => {
    expect(Object.keys(part.doors).sort()).toEqual([A8_GRILLE, A8_OFFICE_DOOR, A8_STAIR_FOOT, A8_STAIR_TOP, A8_VAULT].sort());
    const spec: [string, number, number, number, number, number, number, boolean][] = [
      [A8_OFFICE_DOOR, 134, 4.4, 76.0, 1.2, 2.1, 0, false],
      [A8_STAIR_TOP, 142.6, 4.4, 71.4, 1.2, 2.1, Math.PI / 2, false],
      [A8_STAIR_FOOT, 134.4, 0, 68.0, 1.2, 2.1, Math.PI / 2, true],
      [A8_GRILLE, 134, 0, 61.1, 1.8, 3.0, 0, true],
      [A8_VAULT, 146, 0, 61.3, 1.4, 2.2, 0, true],
    ];
    for (const [id, hx, hy, hz, w, h, yaw, locked] of spec) {
      const d = doorAt(id);
      expect([d.hinge.x, d.hinge.y, d.hinge.z, d.height, d.yaw, d.locked], id).toEqual([hx, hy, hz, h, yaw, locked]);
      expect(d.width, id).toBeCloseTo(w, 9);
      expect(d.width).toBeGreaterThanOrEqual(1.2 - 1e-6);
    }
    const centre = (id: string): [number, number] => {
      const d = doorAt(id);
      return [d.hinge.x + (Math.sin(d.yaw) * d.width) / 2, d.hinge.z + (Math.cos(d.yaw) * d.width) / 2];
    };
    const ids = Object.keys(part.doors);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) expect(hyp2(centre(ids[i]!)[0] - centre(ids[j]!)[0], centre(ids[i]!)[1] - centre(ids[j]!)[1]), `${ids[i]} ${ids[j]}`).toBeGreaterThanOrEqual(5);
    // the doc's pairs: the stair-top door 10.6 m from the office door, the stair foot 6.1 m from the grille, the grille 12 m from the vault door
    expect(hyp2(centre(A8_STAIR_TOP)[0] - centre(A8_OFFICE_DOOR)[0], centre(A8_STAIR_TOP)[1] - centre(A8_OFFICE_DOOR)[1])).toBeCloseTo(10.6, 0);
    expect(hyp2(centre(A8_STAIR_FOOT)[0] - centre(A8_GRILLE)[0], centre(A8_STAIR_FOOT)[1] - centre(A8_GRILLE)[1])).toBeCloseTo(6.1, 0);
    expect(hyp2(centre(A8_GRILLE)[0] - centre(A8_VAULT)[0], centre(A8_GRILLE)[1] - centre(A8_VAULT)[1])).toBeCloseTo(12, 0);
  });

  it("the gates are the doc's: isolator on the night group (25 s, re-arm 5 s from the circuit table), the mains grille, the grille's request-to-exit, the stair foot's push bar, the vault's flag gate, the console's pickup; validated with the course", () => {
    expect(part.bay.gates.map((g) => g.id)).toEqual([A8_RTE_GATE, A8_NIGHT_GATE, A8_GRILLE_GATE, A8_STAIR_GATE, A8_VAULT_GATE, A8_CONSOLE_GATE]);
    // the grille has two gates: `CourseState.locked` (2e58f265) wants every other gate on a door open and lets an open egress gate release it on its own, so the board (the mains gate) and the request-to-exit each open it
    expect(A8_RTE_GATE_ON).toBe(true);
    expect(part.bay.gates.filter((g) => (g.kind === "egress" && g.doorIds.includes(A8_GRILLE)) || (g.kind === "mains" && g.doorId === A8_GRILLE))).toHaveLength(2);
    expect(gateOf<IsolatorGate>(A8_NIGHT_GATE)).toEqual({ kind: 'isolator', id: A8_NIGHT_GATE, switchIds: [A8_BOARD], group: A8_NIGHT_GROUP, seconds: 25, rearm: 5 });
    expect(circuitOf(81)!.timed).toEqual({ seconds: 25, rearm: 5 });
    expect(gateOf<MainsGate>(A8_GRILLE_GATE)).toEqual({ kind: 'mains', id: A8_GRILLE_GATE, group: A8_NIGHT_GROUP, doorId: A8_GRILLE });

    expect(gateOf<EgressGate>(A8_STAIR_GATE)).toEqual({ kind: 'egress', id: A8_STAIR_GATE, switchId: A8_STAIR_BAR, doorIds: [A8_STAIR_FOOT] });
    expect(gateOf<FlagGate>(A8_VAULT_GATE)).toEqual({ kind: 'flag', id: A8_VAULT_GATE, flag: A8_SYNC_FLAG, doorId: A8_VAULT });
    expect(gateOf<{ kind: string; switchId: string; flag: string }>(A8_CONSOLE_GATE)).toMatchObject({ kind: 'pickup', switchId: A8_CONSOLE, flag: A8_LOOP_FLAG, perPlayer: false });
    expect(course.groups![A8_NIGHT_GROUP]).toBe(81);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
    for (const dv of [A8_BOARD, A8_STAIR_BAR, A8_CONSOLE, A8_T1, A8_T2]) expect(part.devices[dv], dv).toBeDefined();
    // no wall switch drives the night circuit (a plain switch would cut it for good)
    expect((lay.switches ?? []).map((s) => s.group)).not.toContain(81);
    expect(circuitOf(81)!.switches.every((s) => s.kind === 'board' || s.kind === 'isolator')).toBe(true);
  });

  it('the grille, the stair foot and the vault start locked; the board cuts the night circuit for 25 s and the grille is open for it, then relocks (the door stays as it is: the relock only stops it opening)', () => {
    const s = runAt(HALL, [HALL[0], HALL[1] + 1]);
    for (const id of [A8_GRILLE, A8_STAIR_FOOT, A8_VAULT]) expect(s.locked(id), id).toBe(true);
    for (const id of [A8_OFFICE_DOOR, A8_STAIR_TOP]) expect(s.locked(id), id).toBe(false);
    expect(press(s, A8_BOARD, 1)).toBeNull();
    expect(s.isGateOpen(A8_NIGHT_GATE)).toBe(true);
    expect(s.gateTimer(A8_NIGHT_GATE)).toBe(25);
    expect(s.locked(A8_GRILLE)).toBe(false);
    // a second press while dark does nothing
    expect(press(s, A8_BOARD, 0)).toBeNull();
    pump(s, 20);
    expect(s.gateTimer(A8_NIGHT_GATE)).toBeCloseTo(5, 1);
    expect(s.locked(A8_GRILLE)).toBe(false);
    pump(s, 5.2);
    expect(s.isGateOpen(A8_NIGHT_GATE)).toBe(false);
    expect(s.locked(A8_GRILLE)).toBe(true);
    expect(s.locked(A8_STAIR_FOOT)).toBe(true);
    // the re-arm: refused for 5 s, then the board works again
    expect(s.gateRearm(A8_NIGHT_GATE)).toBeGreaterThan(4);
    expect(press(s, A8_BOARD, 1)).not.toBeNull();
    pump(s, 5.2);
    expect(press(s, A8_BOARD, 1)).toBeNull();
    expect(s.locked(A8_GRILLE)).toBe(false);
  });

  it('the cut covers the walk to the grille: from the board along the east side (x 132.25, between the column and the stair, A8-D14) about 20.6 m, 12.1 s at the silent pace, 12.9 s spare; the takedown variant (8 s lure, 2 s takedown) still has 2.9 s', () => {
    const w = [[A8_BOARD_WEST.x, A8_BOARD_WEST.z], [132.25, 76.0], [132.25, 62.0], [A8_GRILLE_SPOT.x, A8_GRILLE_SPOT.z]] as [number, number][];
    expect(walkPath(w)).toBeNull();
    // the doc's x 132.9 runs into the column at x 133 (0.4 m): the walk would be blocked
    expect(walkPath([[A8_BOARD_WEST.x, A8_BOARD_WEST.z], [132.9, 76.0], [132.9, 62.0]])).not.toBeNull();
    expect(pathLen(w)).toBeLessThan(21);
    expect(pathLen(w) / SILENT_PACE).toBeLessThan(12.3);
    expect(25 - pathLen(w) / SILENT_PACE).toBeGreaterThan(12.5);
    expect(25 - (8 + 2 + pathLen(w) / SILENT_PACE)).toBeGreaterThan(2.5);
    // the isolator's window against the circuit table's own timed exercise (crossM 20, slack 8)
    expect(25 - 20 / SILENT_PACE).toBeGreaterThanOrEqual(8);
  });

  it('the stair bar opens the stair foot for good (egress); the vault opens on a8-sync alone; the pass flags open nothing', () => {
    const s = runAt(HALL, [HALL[0], HALL[1] + 1]);
    pump(s, 60);
    expect(s.locked(A8_GRILLE)).toBe(true);
    expect(s.locked(A8_STAIR_FOOT)).toBe(true);
    expect(press(s, A8_STAIR_BAR, 0)).toBeNull();
    expect(s.locked(A8_STAIR_FOOT)).toBe(false);
    expect(s.locked(A8_VAULT)).toBe(true);
    s.setFlag(A8_LOBBY_FLAG);
    s.setFlag(A8_INNER_FLAG);
    s.update(1 / 60);
    expect(s.locked(A8_VAULT)).toBe(true);
    s.setFlag(A8_SYNC_FLAG);
    s.update(1 / 60);
    expect(s.locked(A8_VAULT)).toBe(false);
  });

  it("the push bar and the request-to-exit (both built, A8_RTE_GATE_ON) are out of reach (item 1.4 m + the host's 0.75 m margin) from the wrong side of their walls: the rte from the hall and the stairs, the bar from the hall and the lobby", () => {
    const rte = A8_RTE_AT;
    const bar = part.devices[A8_STAIR_BAR]!;
    expect(minDist(hallSide, rte)).toBeGreaterThan(DEVICE_REACH);
    expect(minDist(stairSide, rte)).toBeGreaterThan(DEVICE_REACH);
    expect(minDist(hallSide, bar)).toBeGreaterThan(DEVICE_REACH);
    // the lobby's outer zone: free floor south of the north wall
    const lobby: [number, number][] = [];
    for (let x = 134.45; x <= 139.5; x += 0.1) for (let z = 56.5; z <= 67.55 + 1e-9; z += 0.1) if (blockedAt(x, z).length === 0) lobby.push([x, z]);
    expect(lobby.length).toBeGreaterThan(300);
    expect(minDist(lobby, bar)).toBeGreaterThan(DEVICE_REACH);
    // both are on the side they serve: the bar on the stair side of the wall z 68, the button on the lobby's south wall
    expect(bar.z).toBeGreaterThan(68.15);
    expect(rte.z).toBeLessThan(56.5);
    expect(minDist(stairSide, bar)).toBeLessThan(1.0);
    // a player at the grille's inside walks to the button (the doc's request-to-exit is a walk from the gate)
    expect(hyp2(rte.x - 134.5, rte.z - 62)).toBeLessThan(7);
    expect(walkPath([[134.7, 62], [136.3, 57.0]])).toBeNull();
    // the stair bar is the device the foot door gate reads (and the request-to-exit is a course device of its own)
    expect(part.devices[A8_RTE]).toMatchObject({ label: 'Request to exit' });
  });

  it('the grille swings into the lobby; N2 stops at it (the grille spot is on his loop)', () => {
    expect(doorAt(A8_GRILLE).swing).toBe(1);
    expect(A8_N2_ROUTE.some(([x, z]) => hyp2(x - A8_GRILLE_SPOT.x, z - A8_GRILLE_SPOT.z) < 1)).toBe(true);
  });
});

describe('A8 the Strongroom: the office, its stair and the console (N3)', () => {
  const officerSlot = part.squads[A8_OFFICER]!;

  it('the security office: a solid 4.4 floor block, walls to the hall roof, a roof at 7.4; the doors on its west and south walls, the console desk 0.75 m on the east wall, the medkit on the north wall', () => {
    const floor = mine.find((p) => p.collide && Math.abs(top(p) - 4.4) < 1e-6 && p.c[0] > 134 && p.c[0] < 143 && p.s[2] > 5)!;
    expect(floor).toBeDefined();
    expect(floor.noLedge).toBe(true);
    expect(bottom(floor)).toBe(0);
    expect(part.medkitWalls).toHaveLength(1);
    expect(part.medkitWalls[0]!.pos.z).toBeGreaterThan(77);
    expect(inBox([134, 71.4, 144, 78], part.medkitWalls[0]!.pos.x, part.medkitWalls[0]!.pos.z)).toBe(true);
    expect(part.medkitWalls[0]!.pos.y).toBe(4.4);
    // the way in from the gallery's east end: the office door, then the room to the console, all on the 4.4 floor
    expect(walkPath([[132.5, 76.6], [135.0, 76.6], [139.0, 75.6], [142.3, 74.7]], MOVEMENT.radius, 4.4)).toBeNull();
    // the console is in reach of a body behind the officer's post and out of reach from the door
    const cs = part.devices[A8_CONSOLE]!;
    expect([cs.x, cs.y, cs.z]).toEqual([143.7, 5.6, 74.7]);
    expect(hyp2(cs.x - 143.0, cs.z - 74.7)).toBeLessThan(1.4);
    expect(hyp2(cs.x - 135.0, cs.z - 76.6)).toBeGreaterThan(DEVICE_REACH);
    expect(Math.abs(cs.y - 4.4)).toBeLessThan(1.5);
    // the officer: seated at the console, his back to the door, 0.8 m from his post to the desk
    expect([officerSlot.x, officerSlot.z, officerSlot.y, officerSlot.yaw]).toEqual([A8_OFFICER_POST.x, A8_OFFICER_POST.z, 4.4, Math.PI / 2]);
    expect(blockedAt(officerSlot.x, officerSlot.z, MOVEMENT.radius, 4.4)).toEqual([]);
    expect(officerSlot.route).toBeUndefined();
    expect(officerSlot.passive).toBeUndefined();
  });

  it('the office stair: 27 risers rising east x 134.5-142.2 along the lobby wall (a ramp collider, noLedge fillers under it), the closed block south of the flight, the head landing and the stair-top door; the foot door opens into the lobby\'s outer zone', () => {
    const steps = mine.filter((p) => !p.collide && p.s[1] > 0.1 && p.c[0] > 134 && p.c[0] < 142.5 && p.c[2] > 70 && p.c[2] < 71.3);
    expect(steps).toHaveLength(27);
    expect(Math.max(...steps.map(top))).toBeCloseTo(4.4, 9);
    expect(mine.some((p) => p.collide && Math.abs(p.pitch) > 1e-3 && p.c[0] > 134.5 && p.c[0] < 142.5)).toBe(true);
    const fillers = mine.filter((p) => p.collide && !p.visible && Math.abs(p.pitch) < 1e-3 && p.c[0] > 134.4 && p.c[0] < 142.3 && p.c[2] > 70 && p.c[2] < 71.3);
    expect(fillers.length).toBeGreaterThan(10);
    for (const f of fillers) expect(f.noLedge).toBe(true);
    const block = mine.find((p) => p.collide && Math.abs(p.c[2] - (68.15 + A8_OFFICE_STAIR.z0) / 2) < 1e-6 && top(p) > 7)!;
    expect(block.noLedge).toBe(true);
    expect(bottom(block)).toBe(0);
    expect(block.c[0] - block.s[0] / 2).toBeCloseTo(A8_STAIR_BLOCK_X0, 9);
    // the way down: the stair-top door, the head landing (4.4), the flight, the foot landing, the foot door, the outer zone
    expect(walkPath([[143.2, 72.2], [143.2, 70.6], [142.4, 70.6]], MOVEMENT.radius, 4.4)).toBeNull();
    expect(walkPath([[134.8, 67.5], [134.8, 68.6], [134.7, 69.3], [134.6, 70.3]])).toBeNull();
    expect(walkPath([[134.8, 68.6], [134.8, 66.5], [137.0, 64.0]])).toBeNull();
    // the foot door leads from the stairwell to the lobby; the flight is as wide as the doc's 1.2 m
    expect(A8_OFFICE_STAIR.z1 - A8_OFFICE_STAIR.z0).toBeCloseTo(1.2, 9);
    expect(4.4 / 27).toBeLessThanOrEqual(MOVEMENT.maxStep);
  });

  it('no time lock can be hacked or pressed from the stairs: every body point on the foot landing, the flight and the head landing is over the device reach from T1 (the doc\'s A8-C9, with the foot landing)', () => {
    const t1 = part.devices[A8_T1]!;
    expect(stairSide.length).toBeGreaterThan(200);
    expect(minDist(stairSide, t1)).toBeGreaterThan(DEVICE_REACH);
    expect(minDist(stairSide, t1)).toBeGreaterThan(SCANNER.reach);
    // the doc's 2.75 m is the flight itself (centre line z 70.6); the foot landing is the nearest part
    expect(minDist(stairSide.filter((q) => q[0] > 135.4), t1)).toBeGreaterThan(2.4);
    // teeth: the block kept 0.3 m further west would put the landing 1.9 m from T1
    expect(hyp2(135.5 - 0.3 - t1.x, 68.45 - t1.z)).toBeLessThan(DEVICE_REACH);
    // nothing on the stairs reaches the console, the board or either hall device either (the console is two floors of walls away)
    expect(minDist(stairSide.filter((q) => q[2] > 4), part.devices[A8_CONSOLE]!)).toBeGreaterThan(DEVICE_REACH);
  });

  it('T2 is reached only from the inner zone: every free floor point within the device reach of it is in the lobby east of the beams (or in the vault behind the locked door)', () => {
    const t2 = part.devices[A8_T2]!;
    const near: [number, number][] = [];
    for (let x = t2.x - 2.2; x <= t2.x + 2.2; x += 0.1) for (let z = t2.z - 2.2; z <= t2.z + 2.2; z += 0.1) if (hyp2(x - t2.x, z - t2.z) <= DEVICE_REACH && blockedAt(x, z).length === 0) near.push([x, z]);
    expect(near.length).toBeGreaterThan(20);
    for (const [x] of near) expect(x > 140.3).toBe(true);
  });

  it('the console: a timed loop of 60 s on a8-loop (pickup gate g-a8-console, re-arm 20 s), one console for the officer, validated; the cameras name the flag', () => {
    expect(part.consoles).toEqual([{ id: A8_CONSOLE, guard: A8_OFFICER, flag: A8_LOOP_FLAG, seconds: 60, rearm: 20 }]);
    expect(A8_LOOP).toEqual({ seconds: 60, rearm: 20 });
    expect(course.consoles).toContainEqual(part.consoles[0]);
    expect(consoleErrors(course, lay.security!.devices).filter((e) => e.startsWith('a8-'))).toEqual([]);
    const s = runAt([142.5, 74.7, 4.4], [HALL[0], HALL[1]]);
    expect(s.isGateOpen(A8_CONSOLE_GATE)).toBe(false);
    expect(s.press(A8_CONSOLE, 0)).toBeNull();
    expect(s.hasFlag(A8_LOOP_FLAG)).toBe(true);
    expect(s.gateTimer(A8_CONSOLE_GATE)).toBe(60);
    s.update(1 / 60);
    expect(s.isStepDone('a8-office')).toBe(true);
    // while it loops: the timer shows on the steps after the office (A8-D8), a second press does nothing
    run(s, 10);
    expect(s.stepTimer(stepOf('a8-grille'))).toBeCloseTo(50, 0);
    expect(s.press(A8_CONSOLE, 1)).toBeNull();
    expect(s.gateTimer(A8_CONSOLE_GATE)).toBeLessThan(51);
    run(s, 50.2);
    expect(s.hasFlag(A8_LOOP_FLAG)).toBe(false);
    expect(s.isStepDone('a8-office')).toBe(true);
    // the re-arm: refused for 20 s, then it loops again
    expect(s.gateRearm(A8_CONSOLE_GATE)).toBeGreaterThan(19);
    expect(s.press(A8_CONSOLE, 0)).not.toBeNull();
    run(s, 20.2);
    expect(s.press(A8_CONSOLE, 0)).toBeNull();
    expect(s.hasFlag(A8_LOOP_FLAG)).toBe(true);
  });

  it('the loop fits the run: the sync (about 30-45 s after the press) inside the 60 s, and A down the office stair with the doors in about 15 s (A8-D15)', () => {
    const down = [[142.5, 74.7], [143.2, 72.2], [143.2, 70.6], [135.0, 70.5], [134.7, 69.3], [134.8, 68.3], [135.5, 64.0]] as [number, number][];
    expect(pathLen(down) / SILENT_PACE + 4).toBeLessThan(16);
    expect(60 - 45).toBeGreaterThanOrEqual(15);
  });
});

describe('A8 the Strongroom: the cameras', () => {
  const [c1, c2, c3] = part.cameras as [CameraDevice, CameraDevice, CameraDevice];

  it('three cameras (the A8 budget), valid, all on a8-loop, every range 4-14 m (the camera-range cut); C2 hangs over the gallery level', () => {
    expect(part.cameras.map((c) => c.id)).toEqual([...A8_CAMERAS]);
    expect(validateSecurity({ devices: part.cameras, levels: A8_LEVELS })).toEqual([]);
    for (const c of part.cameras) {
      expect(c.offFlag, c.id).toBe(A8_LOOP_FLAG);
      expect(c.range!, c.id).toBeLessThanOrEqual(14);
      expect(c.range!, c.id).toBeGreaterThanOrEqual(4);
      expect(c.sweep, c.id).toBeUndefined();
    }
    expect(c1).toMatchObject({ at: [120.0, 50.4], y: 3.2, facing: 0, aim: 8, range: 14, level: 'ground' });
    expect(c2).toMatchObject({ at: [133.75, 73.0], y: 3.0, facing: 323, aim: 6, range: 10, level: A8_GALLERY_LEVEL });
    expect(c3).toMatchObject({ at: [134.45, 56.45], y: 3.2, facing: 45, aim: 8, range: 14, level: 'ground' });
    expect(A8_LEVELS).toEqual({ [A8_GALLERY_LEVEL]: 4.4 });
    expect((part as { levels?: Record<string, number> }).levels).toEqual(A8_LEVELS);
    expect(lens(c2)[1]).toBeCloseTo(7.4, 9);
    // on their walls, under their ceilings, in the set
    expect(c1.at[1] - 50.25).toBeLessThan(0.3);
    expect(133.85 - c2.at[0]).toBeLessThan(0.3);
    expect(lens(c3)[1]).toBeLessThan(A8_H.lobby);
    for (const c of part.cameras) expect(inBox(box, c.at[0], c.at[1])).toBe(true);
    expect(lay.security!.devices).toEqual(expect.arrayContaining(part.cameras.map((c) => ({ ...c, bulletproof: true }))));
  });

  it('C2 watches the gallery deck\'s last 8 m (x 126-134) and the office door, standing or crouched, and not the hall floor below it', () => {
    for (const x of [126.5, 128, 130, 132, 133.4]) for (const z of [75.6, 76.4, 77.2]) for (const crouched of [false, true]) expect(framed(c2, x, 4.4, z, crouched), `${x}, ${z}, crouched ${crouched}`).toBe(true);
    expect(framed(c2, 133.2, 4.4, 76.6, true)).toBe(true);
    // the far gallery (west of the pier by a long way) is out of its range
    for (const x of [112, 118]) expect(framed(c2, x, 4.4, 76.4, false), `x ${x}`).toBe(false);
    // the hall floor under it is out of frame
    for (const [x, z] of [[128, 66], [120, 60]] as const) expect(framed(c2, x, 0, z, false), `${x}, ${z}`).toBe(false);
    // the line from the lens to a crouched head on the deck clears the balustrade (nothing solid): the cornice hides a body from the floor, not from C2 over it
    for (const x of [127, 130, 133]) for (const z of [75.6, 76.4]) expect(blockers(lens(c2), [x, 4.4 + 1.05, z]).map((p) => p.c.join()), `${x}, ${z}`).toEqual([]);
  });

  it('the cross-level jam: from the jam spot behind the main counter C2\'s lens is in the jammer\'s range (18 m) on a line with no box; the line passes south of the gallery slab and 3.6 m over the public stair', () => {
    const eye: V3 = [A8_JAM.x, 1.5, A8_JAM.z];
    const d = hyp3(lens(c2)[0] - eye[0], lens(c2)[1] - eye[1], lens(c2)[2] - eye[2]);
    expect(d).toBeLessThanOrEqual(JAMMER.range);
    expect(d).toBeGreaterThan(17);
    expect(blockers(eye, lens(c2))).toEqual([]);
    for (const dy of [-0.4, 0, 0.4]) for (const dz of [-0.3, 0, 0.3]) expect(blockers([eye[0], eye[1] + dy, eye[2] + dz], lens(c2)), `eye ${dy} ${dz}`).toEqual([]);
    // the line's height over the stair (x 131, z about 72) and its plan distance to the slab front (z 75)
    const t = (131 - eye[0]) / (lens(c2)[0] - eye[0]);
    expect(eye[1] + t * (lens(c2)[1] - eye[1]) - 2.4).toBeGreaterThan(3.5);
    expect(lens(c2)[2]).toBeLessThan(75);
    // a jam from the leg-up mark would be out of range (the spot is named: 18 m is near the edge)
    expect(hyp3(lens(c2)[0] - A8_LEGUP.x, lens(c2)[1] - 1.5, lens(c2)[2] - A8_LEGUP.z)).toBeGreaterThan(JAMMER.range);
    // the spot is behind the main counter (north of it), 16.8 m from C1 (past its 14 m range), and the A hop under C2 is within the jam window
    expect(A8_JAM.z).toBeGreaterThan(A8_COUNTER_MAIN.z1);
    expect(hyp2(A8_JAM.x - c1.at[0], A8_JAM.z - c1.at[1])).toBeGreaterThan(camRange(c1));
    expect(walkBlocked(A8_JAM.x, A8_JAM.z, A8_JAM.x + 0.5, A8_JAM.z)).toBeNull();
    const hop = 9.0 / SILENT_CROUCH;
    expect(hop).toBeLessThan(JAM_WINDOW);
    expect(hyp2(134 - A8_PIER.x, 76.6 - A8_PIER.z)).toBeCloseTo(9.0, 0);
  });

  it('C1 frames the public floor south of the counters (z 51-64, the range cut leaves the counters\' south face just out); C3 frames both time locks, the throw spot and the beam curtain', () => {
    for (const [x, z] of [[120, 53], [118, 57], [122, 60], [120, 63.5]] as const) expect(framed(c1, x, 0, z, false), `${x}, ${z}`).toBe(true);
    // the counters hide a crouched body on their north side (the solid between the lens and the head)
    expect(framed(c1, 118, 0, 67.2, true)).toBe(false);
    for (const spot of [A8_T1_SPOT, A8_T2_SPOT, [A8_THROW.x, A8_THROW.z], [140, 60], [140, 64]] as const) expect(framed(c3, spot[0], 0, spot[1], false), `${spot}`).toBe(true);
    // C3 sees the throw spot and the time locks with a clear ray; an open grille shows it the inside of the gate (the rooms behind the wall are out)
    for (const spot of [A8_THROW, { x: A8_T1_SPOT[0], z: A8_T1_SPOT[1] }, { x: A8_T2_SPOT[0], z: A8_T2_SPOT[1] }]) expect(blockers(lens(c3), [spot.x, 1.6, spot.z]).map((p) => p.c.join())).toEqual([]);
    expect(framed(c3, 107.6, 0, 64.5, false)).toBe(false);
  });
});

const laser = part.lasers[0]!;
const BEAM_TOP = Math.max(...laser.ys);
const HEADER = A8_GATEWAY.header!;
const WALL_X = 140;
/** Plan distance from (x, z) to the beam line. */
function distSeg(x: number, z: number): number {
  const sx = laser.x2 - laser.x1;
  const sz = laser.z2 - laser.z1;
  const t = Math.max(0, Math.min(1, ((x - laser.x1) * sx + (z - laser.z1) * sz) / (sx * sx + sz * sz)));
  return hyp2(x - (laser.x1 + sx * t), z - (laser.z1 + sz * t));
}
/** The furthest (m, plan) from a top at `from` to a beam line that a top-gear running jump carries the feet over the top beam across the beams' touch band, or 0 (`tests/ctcourseGreybox.test.ts`'s formula). */
function beamJumpReach(from: number, beam: number): number {
  const t2 = lastTimeAtOrOver(from, beam);
  if (t2 === null) return 0;
  const t1 = from >= beam ? 0 : (2 * LEAP.vy) / -GRAVITY.y - t2;
  if (SOLO_TOP_SPEED * (t2 - t1) < 2 * LASER.reach) return 0;
  return SOLO_TOP_SPEED * t2 + MOVEMENT.radius - LASER.reach;
}
/** The solo-standable tops on the curtain's approach side (x west of its wall) from which a running jump carries a player alone over the beams. */
function beamThreats(pieces: readonly BoxPiece[]): string[] {
  const out: string[] = [];
  for (const p of pieces) {
    const t = top(p);
    if (t <= 0.3 || t >= HEADER || Math.min(p.s[0], p.s[2]) < LEDGE.climbDepth || (p.noLedge && t > MANTLE)) continue;
    const reach = beamJumpReach(t, BEAM_TOP);
    if (reach <= 0) continue;
    const x1 = Math.min(p.c[0] + p.s[0] / 2, WALL_X - 0.15);
    const x0 = p.c[0] - p.s[0] / 2;
    if (x1 <= x0) continue;
    if (hyp2(Math.max(0, laser.x1 - x1), Math.max(0, Math.abs(p.c[2] - 62) - p.s[2] / 2 - 5.5)) > reach) continue;
    const z0 = p.c[2] - p.s[2] / 2;
    const nx = Math.max(1, Math.ceil((x1 - x0) / 0.1));
    const nz = Math.max(1, Math.ceil(p.s[2] / 0.1));
    let near = Infinity;
    for (let i = 0; i <= nx; i++) for (let k = 0; k <= nz; k++) near = Math.min(near, distSeg(x0 + ((x1 - x0) * i) / nx, z0 + (p.s[2] * k) / nz));
    if (near < reach) out.push(`top ${t.toFixed(2)} at (${p.c[0].toFixed(2)}, ${p.c[2].toFixed(2)}): ${near.toFixed(2)} m < ${reach.toFixed(2)} m`);
  }
  return out;
}

describe('A8 the Strongroom: the beam curtain (the throw) and the time locks (the paired hack, N6)', () => {
  const g = throwGateway(A8_GATEWAY);
  const thrower = g.spots.find((s) => s.kind === 'throw')!;
  const runner = g.spots.find((s) => s.kind === 'runner')!;
  const landing = g.spots.find((s) => s.kind === 'landing')!;
  const t1 = part.devices[A8_T1]!;
  const t2 = part.devices[A8_T2]!;

  it("the curtain: piers z 56-56.5 and 67.5-68 (5.5 m, noLedge) and a header at 4.8-5.5 over z 56.5-67.5 on x 140 (0.3); the marks are the helper's; the laser is laser-a8 on a8-sync (the helper's release and its gate are dropped, A8-D4)", () => {
    const walls = mine.filter((p) => p.collide && Math.abs(p.c[0] - WALL_X) < 1e-6 && Math.abs(p.s[0] - 0.3) < 1e-6);
    expect(walls).toHaveLength(3);
    for (const w of walls) expect(w.noLedge).toBe(true);
    const piers = walls.filter((w) => bottom(w) < 1e-6).map((w) => [w.c[2] - w.s[2] / 2, w.c[2] + w.s[2] / 2]).sort((p, q) => p[0]! - q[0]!);
    expect(piers).toEqual([[56, 56.5], [67.5, 68]]);
    for (const w of walls.filter((q) => bottom(q) < 1e-6)) expect(top(w)).toBeCloseTo(5.5, 9);
    const header = walls.find((w) => bottom(w) > 1)!;
    expect(bottom(header)).toBeCloseTo(HEADER, 9);
    expect(header.overhead).toBe(true);
    expect([thrower.x, thrower.z, runner.x, runner.z, landing.x, landing.z]).toEqual([A8_THROW.x, A8_THROW.z, A8_RUNNER.x, A8_RUNNER.z, A8_LANDING.x, A8_LANDING.z]);
    expect(mine.some((p) => !p.collide && Math.abs(p.c[0] - A8_THROW.x) < 0.01 && Math.abs(p.c[2] - A8_THROW.z) < 0.01)).toBe(true);
    expect(part.lasers).toHaveLength(1);
    expect(laser).toMatchObject({ id: A8_LASER, x1: 140, z1: 56.5, x2: 140, z2: 67.5, ys: [0.35, 0.9, 1.45], offFlag: A8_SYNC_FLAG });
    expect(g.devices['sw-a8-release']).toBeDefined();
    expect(Object.keys(part.devices).filter((k) => k.includes('release'))).toEqual([]);
    expect(part.bay.gates.some((x) => x.kind === 'pickup' && x.flag === 'a8-release')).toBe(false);
    expect(lay.lasers?.filter((l) => l.id === A8_LASER)).toHaveLength(1);
  });

  it('every laser has its one power panel: panel-a8 high on the lobby\'s east wall, jammable from the outer zone like A5\'s, hard to see from the hall', () => {
    expect(checkPanels(part.lasers, part.laserPanels)).toEqual([]);
    expect(part.laserPanels).toEqual([A8_PANEL]);
    expect(panelFor(lay.laserPanels ?? [], A8_LASER)).toBeGreaterThanOrEqual(0);
    expect(A8_PANEL.y).toBeGreaterThan(3);
    const at = panelTarget(A8_PANEL, { x: 0, y: 0, z: 0 });
    expect(at.x).toBeLessThan(A8_PANEL.x);
    expect(inBox([146, 56, 146, 68], 146, at.z, 0.3)).toBe(true);
    // the wall it hangs on is the lobby's east wall (x 146), clear of the vault door's opening (z 61.3-62.7) and of T2
    expect(A8_PANEL.z).toBeGreaterThan(62.7);
    expect(hyp2(A8_PANEL.x - t2.x, A8_PANEL.z - t2.z)).toBeGreaterThan(5);
  });

  it('nobody walks, crouches or jumps from the floor through: every beam gap is under a crouched body, the floor jump peaks under the top beam, the band covers the whole opening', () => {
    const ys = [0, ...laser.ys].sort((p, q) => p - q);
    for (let i = 1; i < ys.length; i++) expect(ys[i]! - ys[i - 1]!).toBeLessThan(LASER.crouchHeight);
    expect(LEAP_APEX).toBeLessThan(BEAM_TOP);
    for (let z = 56.5 + MOVEMENT.radius; z <= 67.5 - MOVEMENT.radius; z += 0.25) {
      for (let py = 0; py <= BEAM_TOP; py += 0.05) expect(laserTouch(laser, WALL_X, py, z, LASER.crouchHeight), `${z}, ${py}`).toBe(true);
      expect(laserTouch(laser, WALL_X, LEAP_APEX, z, LASER.standHeight)).toBe(true);
    }
    expect(distSeg(WALL_X, 56.5 + MOVEMENT.radius)).toBeLessThanOrEqual(LASER.reach);
    // the piers close the rest of the line; no grip on the wall or its header
    const onWall = anchors.ledges.filter((l) => Math.abs((l.a.x + l.b.x) / 2 - WALL_X) < 0.5 && inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2));
    expect(onWall.map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
  });

  it('no solo-standable top on the outer zone is within a beam-clearing running jump of the line (every solid in the map); BEAM_KEEP_CLEAR with teeth', () => {
    expect(beamThreats(solid)).toEqual([]);
    const crate = (gap: number, h = 1.8): BoxPiece => ({ c: [WALL_X - 0.15 - gap - 0.5, h / 2, 62], s: [1, h, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true });
    expect(beamThreats([...solid, crate(2)]).length).toBeGreaterThan(0);
    expect(beamThreats([...solid, crate(BEAM_KEEP_CLEAR)])).toEqual([]);
    expect(beamThreats([...solid, crate(3.5, HEADER - 0.05)]).length).toBeGreaterThan(0);
    // nothing in the outer zone stands over 0.3 m but walls: the only mounted things are the time lock, the camera and the panels (no collision)
    const tops = solid.filter((p) => top(p) > 0.3 && top(p) < HEADER && p.c[0] + p.s[0] / 2 > 136 && p.c[0] - p.s[0] / 2 < 139.85 && p.c[2] + p.s[2] / 2 > 56.5 && p.c[2] - p.s[2] / 2 < 67.5);
    expect(tops.map((p) => p.c.join())).toEqual([]);
  });

  it('the throw from the mark carries the runner (0.3-1.6 m behind) over the beams, under the header, inside the gap, onto the landing in the inner zone', () => {
    const o = { x: 0, y: 0, z: 0 };
    const land = { x: 0, z: 0, dx: 0, dz: 0 };
    for (let d = 0.3; d <= 1.6 + 1e-9; d += 0.05) {
      throwLanding(A8_THROW.x - d, A8_THROW.z, A8_THROW.x, A8_THROW.z, Math.PI / 2, land);
      expect(throwLandingOk(A8_THROW.x, 0, A8_THROW.z, land.x, 0, land.z)).toBe(true);
      for (let k = 0; k <= 200; k++) {
        throwArc((TEAM.throwTime * k) / 200, A8_THROW.x - d, 0, A8_THROW.z, land.x, 0, land.z, o);
        expect(laserTouch(laser, o.x, o.y, o.z, LASER.standHeight), `d ${d.toFixed(2)} k ${k}`).toBe(false);
        if (Math.abs(o.x - WALL_X) < 0.15 + MOVEMENT.radius) expect(o.y + MOVEMENT.standHeight).toBeLessThan(HEADER);
        expect(Math.abs(o.z - 62) + MOVEMENT.radius).toBeLessThan(5.5);
        expect(o.y + MOVEMENT.standHeight).toBeLessThan(A8_H.lobby);
      }
    }
    throwLanding(A8_RUNNER.x, A8_RUNNER.z, A8_THROW.x, A8_THROW.z, Math.PI / 2, land);
    expect(hyp2(land.x - A8_LANDING.x, land.z - A8_LANDING.z)).toBeLessThan(1e-6);
    expect(inBox(A8_INNER_ZONE, land.x, land.z)).toBe(true);
    expect(inBox(A8_INNER_ZONE, A8_THROW.x, A8_THROW.z)).toBe(false);
  });

  it('room for the throw in the built map: free air over the thrower, nothing solid along the arc, a floor and head room at the landing', () => {
    const inside = (x: number, y: number, z: number): boolean => solid.some((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2);
    for (let y = 1.0; y <= 1.0 + TEAM.throwUp; y += 0.05) expect(inside(A8_THROW.x, y, A8_THROW.z), `over the thrower at ${y.toFixed(2)}`).toBe(false);
    const o = { x: 0, y: 0, z: 0 };
    let clear = true;
    for (let k = 0; k <= 100; k++) {
      throwArc((TEAM.throwTime * k) / 100, A8_RUNNER.x, 0, A8_RUNNER.z, A8_LANDING.x, 0, A8_LANDING.z, o);
      for (const off of [0.3, 1.0, 1.6]) if (inside(o.x, o.y + off, o.z)) clear = false;
    }
    let head = 10;
    for (const p of solid) if (Math.abs(A8_LANDING.x - p.c[0]) < p.s[0] / 2 && Math.abs(A8_LANDING.z - p.c[2]) < p.s[2] / 2 && bottom(p) > 0) head = Math.min(head, bottom(p));
    expect(throwRoom(clear, 0, Math.min(head, 1.8))).toBe('ok');
    for (const s of [A8_LANDING, A8_THROW, A8_RUNNER]) expect(blockedAt(s.x, s.z)).toEqual([]);
  });

  it('the beams drop with the time lock: a8-sync is the laser\'s offFlag and the vault door\'s flag; the thrower walks the dead line; the throw step ticks on the landing flag', () => {
    expect(laser.offFlag).toBe(A8_SYNC_FLAG);
    expect(gateOf<FlagGate>(A8_VAULT_GATE).flag).toBe(A8_SYNC_FLAG);
    expect(laserTouch({ ...laser, offFlag: undefined }, WALL_X, 0.5, 62, LASER.standHeight)).toBe(true);
    const s = runAt([A8_THROW.x, A8_THROW.z], [A8_LANDING.x, A8_LANDING.z]);
    s.setFlag(A8_LOBBY_FLAG);
    s.update(1 / 60);
    expect(s.isStepDone('a8-beams')).toBe(false);
    s.setFlag(A8_INNER_FLAG);
    s.update(1 / 60);
    expect(s.isStepDone('a8-beams')).toBe(true);
  });

  it('A8_SCANNERS: one pair sc-a8 on a8-t1 / a8-t2 setting a8-sync, on the map\'s scanner list (beside A7\'s) and the set\'s external flags', () => {
    expect(part.scanners).toEqual([{ id: A8_SCANNER, a: A8_T1, b: A8_T2, flag: A8_SYNC_FLAG }]);
    expect(lay.scanners).toContainEqual({ id: A8_SCANNER, a: A8_T1, b: A8_T2, flag: A8_SYNC_FLAG });
    expect((lay.scanners ?? []).length).toBeLessThanOrEqual(8);
    expect(part.externalFlags).toEqual([A8_GAL_FLAG, A8_LOBBY_FLAG, A8_INNER_FLAG, A8_SYNC_FLAG]);
    expect(course.devices[A8_T1]).toBe(t1);
    expect(course.devices[A8_T2]).toBe(t2);
  });

  it('T1 on the lobby\'s north wall facing south, T2 on its east wall facing west beside the vault door; each device sits on its panel\'s floor (y 0), the housing at 1.2 m; the hack spots are the helper\'s, 0.6 m out and free floor', () => {
    expect([t1.x, t1.y, t1.z, t1.yaw]).toEqual([A8_T1_AT.x, 0, A8_T1_AT.z, A8_T1_AT.yaw]);
    expect([t2.x, t2.y, t2.z, t2.yaw]).toEqual([A8_T2_AT.x, 0, A8_T2_AT.z, A8_T2_AT.yaw]);
    expect(Math.abs(t1.z - 67.85)).toBeLessThan(0.15);
    expect(Math.abs(t2.x - 145.85)).toBeLessThan(0.15);
    expect(t1.x + Math.sin(t1.yaw) * 0.6).toBeCloseTo(A8_T1_SPOT[0], 9);
    expect(t1.z + Math.cos(t1.yaw) * 0.6).toBeCloseTo(A8_T1_SPOT[1], 9);
    expect(t2.x + Math.sin(t2.yaw) * 0.6).toBeCloseTo(A8_T2_SPOT[0], 9);
    expect(t2.z + Math.cos(t2.yaw) * 0.6).toBeCloseTo(A8_T2_SPOT[1], 9);
    for (const [x, z] of [A8_T1_SPOT, A8_T2_SPOT]) expect(blockedAt(x, z), `${x}, ${z}`).toEqual([]);
    expect(mine.filter((p) => !p.collide && Math.abs(p.c[1] - (A8_PANEL_Y + 0.2)) < 1e-6 && Math.abs(p.s[1] - 0.9) < 1e-6)).toHaveLength(2);
    // T1 is 5.5 m from the stair foot door and out of C2's and C1's frames; T2 is 3.9 m from the throw landing
    expect(hyp2(A8_T2_SPOT[0] - A8_LANDING.x, A8_T2_SPOT[1] - A8_LANDING.z)).toBeLessThan(4.5);
    expect(hyp2(A8_T1_SPOT[0] - A8_THROW.x, A8_T1_SPOT[1] - A8_THROW.z)).toBeLessThan(6);
  });

  it('12 m apart, strictly over syncMinGap(scan) (4.6 m); syncStation throws with the panels at the gap', () => {
    const d = hyp2(t2.x - t1.x, t2.z - t1.z);
    expect(d).toBeCloseTo(11.97, 1);
    expect(syncMinGap('scan')).toBeCloseTo(2 * SCANNER.reach + 2 * MOVEMENT.radius, 9);
    expect(d).toBeGreaterThan(syncMinGap('scan'));
    const at = (x: number) => ({ x, z: A8_T1_AT.z, yaw: Math.PI / 2 });
    expect(() => syncStation({ id: 'a8', kind: 'scan', a: A8_T1_AT, b: at(A8_T1_AT.x + syncMinGap('scan')) })).toThrow(/one player/);
    expect(() => syncStation({ id: 'a8', kind: 'scan', a: A8_T1_AT, b: A8_T2_AT, y: A8_PANEL_Y })).not.toThrow();
  });

  it('one player cannot work both (scanStart refuses the other panel); two hacks inside 1.5 s open, 2 s apart fail on the late player', () => {
    const s = newScanPair();
    expect(scanStart(s, 0, 0)).toBeNull();
    expect(scanStart(s, 1, 0)).toBe(REFUSE_SCAN_OTHER);
    const out = newScanResult();
    const ok = newScanPair();
    scanStart(ok, 0, 0);
    let opened = false;
    for (let t = 0; t < 4 && !opened; t += 1 / 60) {
      if (Math.abs(t - 0.5) < 1 / 120) scanStart(ok, 1, 1);
      opened = scanStep(ok, 1 / 60, true, true, out).kind === 'open';
    }
    expect(opened).toBe(true);
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

  it('no floor point reaches both time locks (over 2 x the scanner reach apart), and each ready lamp is seen from the other lock\'s hack spot through the curtain with no box between', () => {
    expect(hyp2(t2.x - t1.x, t2.z - t1.z)).toBeGreaterThan(2 * SCANNER.reach);
    const g0 = { x: 0, y: 0, z: 0 };
    for (const [from, d] of [[A8_T2_SPOT, t1], [A8_T1_SPOT, t2]] as const) {
      scanGlowAt(d.x, d.y, d.z, d.yaw, g0);
      const eye: V3 = [from[0], 1.6, from[1]];
      expect(blockers(eye, [g0.x, d.y + SCAN_GLOW.ready, g0.z]), `ready lamp of ${d.label}`).toEqual([]);
      expect(blockers(eye, [g0.x, d.y + SCAN_GLOW.state, g0.z]), `state lamp of ${d.label}`).toEqual([]);
    }
  });

  it('the sync sets a8-sync: the hack step ticks, the vault opens, and the walk out is clear: the inner zone to the vault door, through the vault and the dock to the exit zone', () => {
    const s = runAt([A8_T1_SPOT[0], A8_T1_SPOT[1]], [A8_T2_SPOT[0], A8_T2_SPOT[1]]);
    expect(s.isStepDone('a8-sync')).toBe(false);
    s.setFlag(A8_SYNC_FLAG);
    s.update(1 / 60);
    expect(s.isStepDone('a8-sync')).toBe(true);
    expect(s.locked(A8_VAULT)).toBe(false);
    expect(walkPath([[A8_LANDING.x, A8_LANDING.z], [145.2, 62], [147.5, 62], [152, 62], [156, 62]])).toBeNull();
    expect(inBox(EXIT_ZONE, 156, 62)).toBe(true);
    // the vault's back is open to the dock (no wall at x 150 inside z 58-66)
    expect(blockedAt(150, 62)).toEqual([]);
    expect(blockedAt(150, 59)).toEqual([]);
  });
});

describe('A8 the Strongroom: the lights (LIGHTING-PLAN 3, A8)', () => {
  const by = (g: number) => lamps.filter((l) => l.group === g);

  it('sixteen lamps on circuits 81-84: the night circuit 7 (three chandeliers, three counter lamps, the desk lamp), gallery 3, office 2, lobby 4 (two panels and a status lamp over each time lock, A8-D12); every one grouped, electric and destructible as its row says', () => {
    expect(lamps).toHaveLength(16);
    expect([81, 82, 83, 84].map((g) => by(g).length)).toEqual([7, 3, 2, 4]);
    for (const l of lamps) {
      const row = circuitOf(l.group);
      expect(row, `lamp ${l.id} group ${l.group}`).toBeDefined();
      expect(row!.room).toBe('A8');
      expect(l.electric).toBe(row!.electric);
      expect(l.destructible).toBe(row!.destructible);
    }
    for (const g of [81, 82, 83]) expect(by(g).length).toBe(circuitOf(g)!.lamps);
    expect(by(84).length).toBe(circuitOf(84)!.lamps + 2);
    // the doc's positions: chandeliers at 7.5 m, counter lamps over the counters, the desk lamp on the desk, wall lights on the north wall, panels under the ceilings
    const at = (g: number) => by(g).map((l) => [l.x, l.y, l.z].map((v) => Number(v.toFixed(2))).join(','));
    expect(at(81)).toEqual(['130,7.5,62', '124,7.5,58', '128,7.5,69.5', '121,1.6,65.9', '124.8,1.6,65.9', '125.6,1.6,61.5', '128.5,1,70.4']);
    expect(at(82)).toEqual(['126,6.6,77.6', '129.5,6.6,77.6', '133,6.6,77.6']);
    expect(at(83)).toEqual(['137.5,7.2,74.7', '141.5,7.2,74.7']);
    expect(at(84).slice(0, 2)).toEqual(['137,5.3,62', '143,5.3,62']);
    for (const l of by(82)) expect(l.y).toBeGreaterThan(A8_H.gallery + 2);
    for (const l of by(83)) expect(l.y).toBeLessThan(A8_H.office);
    for (const l of by(84)) expect(l.y).toBeLessThan(A8_H.lobby);
    // no fitting under the gallery's return or in the west bays (the vestibule and `a8-west` pockets)
    for (const l of lamps) expect(l.x > 110 || l.y > 4.4, `lamp ${l.id}`).toBe(true);
    expect(lamps.filter((l) => l.x < 118 && l.z > 66.3 && l.z < 74.5 && l.y < 4.4)).toEqual([]);
  });

  it("the part's groups are exactly the plan's A8 rows (so the client hears the board and the switches), and each has a lamp", () => {
    const plan = marlowCourseGroups();
    expect(part.groups).toEqual({ 'a8-night': plan['a8-night'], 'a8-gallery': plan['a8-gallery'], 'a8-office': plan['a8-office'], 'a8-vault': plan['a8-vault'] });
    expect(Object.values(part.groups)).toEqual([81, 82, 83, 84]);
    for (const g of Object.values(part.groups)) expect(lamps.some((l) => l.group === g)).toBe(true);
    expect(circuitOf(81)!.kind).toBe('isolator');
    expect(circuitOf(84)!.kind).toBe('device');
  });

  it("two wall switches: the gallery's at the stair head (balustrade end, 1.2 m up), the office's inside its door; none on 81 (the board's) or 84 (the time lock's)", () => {
    expect(part.switches.map((s) => [s.id, s.group])).toEqual([['a8-sw-gallery', 82], ['a8-sw-office', 83]]);
    const [gal, off] = part.switches;
    // the set doc's points (131.1, 75.3) and (134.6, 75.6) within 1 m; the plan hint (131.0, 76.2) within 1.5 m
    expect(hyp2(gal!.pos.x - 131.1, gal!.pos.z - 75.3)).toBeLessThanOrEqual(1);
    expect(hyp2(off!.pos.x - 134.6, off!.pos.z - 75.6)).toBeLessThanOrEqual(1);
    expect(gal!.pos.y).toBeCloseTo(4.4 + 1.2, 9);
    expect(off!.pos.y).toBeCloseTo(4.4 + 1.2, 9);
    // the gallery switch is reached from the deck at the stair head and from the stair's top steps, not from the hall floor
    expect(Math.abs(gal!.pos.y - 4.4)).toBeLessThan(1.5);
    expect(Math.abs(gal!.pos.y - 0)).toBeGreaterThan(1.5);
    expect(off!.pos.x).toBeGreaterThan(134.15);
    expect(circuitOf(81)!.switches.every((s) => s.kind !== 'wall')).toBe(true);
    expect(circuitOf(84)!.switches).toEqual([]);
    expect(part.switches.some((s) => s.group === 81 || s.group === 84)).toBe(false);
  });

  it('the standby zones: the set at 0.14 under the slab, and its upper levels (gallery, office) and the lobby', () => {
    expect(part.ambientZones).toEqual([
      { id: 'A8', box: [106, 50, 150, 78], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 8.9 },
      { id: 'a8-gallery', box: [106, 56, 134, 78], ambient: MARLOW_LEVEL.standby, minY: 3.9, maxY: 8.9 },
      { id: 'a8-office', box: [134, 71, 144, 78], ambient: MARLOW_LEVEL.standby, minY: 3.9, maxY: 7.3 },
      { id: 'a8-lobby', box: [134, 56, 146, 68], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 5.4 },
    ]);
  });

  it('the tuned levels: the front and the grille approach are lit pools and dark with 81 cut (the grille is a mains gate: the same cut), the board dim even lit, the dark pockets (vestibule, leg-up mark, jam spot) under the pocket band, the lit rooms read, the time locks lit', () => {
    const spots = LIGHT_SPOTS.a8Strongroom;
    const at = (n: string) => spots.find((s) => s.name === n)!;
    for (const n of ['A8 front', 'A8 grille approach']) {
      expect(at(n).band, n).toBe('pool');
      expect(tuned[n]!, n).toBeGreaterThanOrEqual(MARLOW_LEVEL.poolMin);
    }
    for (const [n, off] of [['A8 front cut', [81]], ['A8 grille approach cut', [81]], ['A8 board cut', [81]], ['A8 gallery east cut', [82]], ['A8 office cut', [83]]] as const) {
      expect(at(n), n).toMatchObject({ band: 'cut', off });
      expect(tuned[n]!, n).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
    }
    expect(at('A8 front')).toMatchObject({ x: 128, z: 66.5 });
    expect(at('A8 grille approach')).toMatchObject({ x: A8_GRILLE_SPOT.x, z: A8_GRILLE_SPOT.z });
    expect(at('A8 board')).toMatchObject({ x: A8_BOARD_WEST.x, z: A8_BOARD_WEST.z });
    expect(tuned['A8 board']!).toBeLessThanOrEqual(0.4);
    expect(tuned['A8 front']! - tuned['A8 front cut']!).toBeGreaterThan(0.4);
    for (const n of ['A8 jam spot', 'A8 leg-up mark', 'A8 vestibule', 'A8 gallery west']) {
      expect(at(n).band, n).toBe('pocket');
      expect(tuned[n]!, n).toBeLessThanOrEqual(MARLOW_LEVEL.pocketMax);
    }
    expect(at('A8 jam spot')).toMatchObject({ x: A8_JAM.x, z: A8_JAM.z });
    expect(at('A8 leg-up mark')).toMatchObject({ x: A8_LEGUP.x, z: A8_LEGUP.z });
    for (const n of ['A8 gallery east', 'A8 office', 'A8 T1', 'A8 T2']) {
      expect(at(n).band, n).toBe('read');
      expect(tuned[n]!, n).toBeGreaterThanOrEqual(MARLOW_LEVEL.readMin);
    }
    expect(at('A8 T1')).toMatchObject({ x: A8_T1_SPOT[0], z: A8_T1_SPOT[1] });
    expect(at('A8 T2')).toMatchObject({ x: A8_T2_SPOT[0], z: A8_T2_SPOT[1] });
    expect(Math.abs(tuned['A8 hall standby']! - MARLOW_LEVEL.standby)).toBeLessThanOrEqual(0.03);
  });
});

/** A nav grid over the set the way the game builds one (cell 0.5, agent radius 0.32, step 0.45; solids not overhead block). */
function setNav(): NavGrid {
  const blockers: NavBlocker[] = solid
    .filter((p) => !p.overhead && p.c[0] + p.s[0] / 2 > 105 && p.c[0] - p.s[0] / 2 < 151 && p.c[2] + p.s[2] / 2 > 49 && p.c[2] - p.s[2] / 2 < 79 && bottom(p) < 1.7 && top(p) > 0.45)
    .map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: 0, bottom: bottom(p), top: top(p) }));
  return new NavGrid({ minX: 106, maxX: 150, minZ: 50, maxZ: 78, cell: 0.5, agentRadius: 0.32, stepHeight: 0.45, blockers, sample: () => ({ h: 0, ok: true }), seed: [120, 62] });
}
const nav = setNav();
/** The guard's A* walk from a to b (as `Enemy.goTo` takes it): its length, or null when the grid has no path. */
const navLen = (a: readonly [number, number], q: readonly [number, number]): number | null => {
  const path = nav.findPath([a[0], a[1]], [q[0], q[1]], 1e6);
  if (!path) return null;
  return pathLen([a, ...path.map((w) => [w[0], w[1]] as const), q]);
};

describe('A8 the Strongroom: the guards', () => {
  const n1 = part.squads[A8_N1]!;
  const n2 = part.squads[A8_N2]!;
  const patrolSpeed = ENEMIES.grunt.walkSpeed * 1.1;

  /** Walk a loop on its own pace along straight legs (0.01 s steps); the times each stop was left. */
  function walkLoop(route: [number, number][], waits: number[], faces: number[], slot: { x: number; z: number; yaw: number }, seconds: number): { left: [number, number][]; stuck: boolean } {
    const w = new PatrolWalker({ points: route, waits, faces }, slot.x, slot.z, slot.yaw);
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

  it('three armed grunts, no passive slot, none a runner, inside the set (A8 squad, SPEC rule 9); the officer is static at the console with his two lines', () => {
    expect(part.bay.squad).toEqual([A8_N1, A8_N2, A8_OFFICER]);
    expect(Object.keys(part.squads).sort()).toEqual([A8_N1, A8_N2, A8_OFFICER].sort());
    expect(def.bays[7]!.squad.length).toBeLessThanOrEqual(3);
    for (const [id, s] of Object.entries(part.squads)) {
      expect(s.kind, id).toBe('grunt');
      expect(['grunt', 'heavy', 'enforcer', 'officer', 'sniper']).toContain(s.kind);
      expect(s.passive, id).toBeUndefined();
      expect(inBox(box, s.x, s.z), id).toBe(true);
      expect(course.squads[id]).toBe(s);
    }
    expect(part.squads[A8_OFFICER]!.info).toEqual(A8_OFFICER_INFO);
    expect(A8_OFFICER_INFO.lines).toEqual(['The board under the gallery kills the hall lights. The grille is on the same circuit.', 'Both time locks turn together. The beams in the lobby drop with them.']);
    for (const l of A8_OFFICER_INFO.lines) {
      expect(l.length).toBeLessThanOrEqual(GUARD_INFO_LINE_MAX);
      expect(l.length).toBeLessThanOrEqual(90);
      expect(/[–—]/.test(l)).toBe(false);
    }
    expect(A8_OFFICER_INFO.lines.map((l) => l.length)).toEqual([85, 69]);
  });

  it('N1: a post at the desk (128.5, 71.6) facing south, head turns south-west then south-east every 6 s on a two-point route; waits never 0', () => {
    expect([n1.x, n1.z, n1.yaw]).toEqual([128.5, 71.6, Math.PI]);
    expect(n1.route).toEqual(A8_N1_ROUTE);
    expect(n1.waits).toEqual(A8_N1_WAITS);
    expect(n1.faces).toEqual(A8_N1_FACES);
    expect(n1.waits!.every((w) => w > 0)).toBe(true);
    expect(A8_N1_FACES[0]).toBeGreaterThan(Math.PI);
    expect(A8_N1_FACES[1]).toBeLessThan(Math.PI);
    for (const w of A8_N1_WAITS) {
      expect(w).toBeGreaterThanOrEqual(3);
      expect(w).toBeLessThanOrEqual(6);
    }
    const { left } = walkLoop(A8_N1_ROUTE, A8_N1_WAITS, A8_N1_FACES, n1, 40);
    expect(left.length).toBeGreaterThanOrEqual(5);
    const gaps = left.slice(1).map((l, i) => l[0] - left[i]![0]);
    for (const gap of gaps) expect(gap).toBeGreaterThan(5.5);
    for (const gap of gaps) expect(gap).toBeLessThan(6.6);
    // behind the desk: his post is clear floor and the desk is south of it
    expect(blockedAt(A8_N1_POST.x, A8_N1_POST.z)).toEqual([]);
    expect(A8_DESK.z1).toBeLessThan(A8_N1_POST.z);
    // facing south-east he looks at the grille stop (8 degrees off, 10.7 m); facing south-west the jam spot is 33 degrees past it
    const bearing = (x: number, z: number): number => Math.atan2(x - A8_N1_POST.x, z - A8_N1_POST.z);
    const off = (face: number, x: number, z: number): number => Math.abs(Math.atan2(Math.sin(bearing(x, z) - face), Math.cos(bearing(x, z) - face))) * (180 / Math.PI);
    expect(off(A8_N1_FACES[1]!, A8_N2_ROUTE[2]![0], A8_N2_ROUTE[2]![1])).toBeLessThan(12);
    expect(hyp2(A8_N2_ROUTE[2]![0] - A8_N1_POST.x, A8_N2_ROUTE[2]![1] - A8_N1_POST.z)).toBeLessThan(12);
    expect(off(A8_N1_FACES[0]!, A8_JAM.x, A8_JAM.z)).toBeGreaterThan(27.5);
  });

  it('N2: the hall patrol TALK - W1 - G (the grille) - SE - W2 with stops of 5 s at the talk and the grille (passes 0.1 s: the zero-wait freeze, with teeth); the loop is open floor by the nav grid and takes 35-45 s', () => {
    expect([n2.x, n2.z, n2.yaw]).toEqual([126.4, 71.2, Math.PI / 2]);
    expect(n2.route).toEqual(A8_N2_ROUTE);
    expect(n2.waits).toEqual(A8_N2_WAITS);
    expect(n2.waits).toEqual([5, A8_PASS_WAIT, 5, A8_PASS_WAIT, A8_PASS_WAIT]);
    expect(n2.waits!.every((w) => w > 0)).toBe(true);
    expect(n2.faces![0]).toBe(Math.PI / 2);
    expect(n2.faces![2]).toBe(Math.PI / 2);
    expect([1, 3, 4].every((i) => Number.isNaN(n2.faces![i]!))).toBe(true);
    expect(walkLoop(A8_N2_ROUTE, [5, 0, 5, 0, 0], A8_N2_FACES, n2, 140).stuck).toBe(false); // (merge) master guard-ai S2 fix: a wait of 0 passes through now; the 0.1 s pause stays
    expect(walkLoop(A8_N2_ROUTE, A8_N2_WAITS, A8_N2_FACES, n2, 140).stuck).toBe(false);
    // every leg is a walk for the nav grid (his A* path, as `Enemy.goTo` takes it) no longer than a third over the straight line
    let len = 0;
    for (let i = 0; i < A8_N2_ROUTE.length; i++) {
      const a = A8_N2_ROUTE[i]!;
      const c = A8_N2_ROUTE[(i + 1) % A8_N2_ROUTE.length]!;
      const nl = navLen(a, c);
      expect(nl, `leg ${i}`).not.toBeNull();
      expect(nl!, `leg ${i}`).toBeLessThan(hyp2(c[0] - a[0], c[1] - a[1]) * 1.34 + 0.5);
      len += nl!;
    }
    expect(len).toBeGreaterThan(28);
    expect(len).toBeLessThan(36);
    const cycle = len / patrolSpeed + 5 + 5 + 3 * A8_PASS_WAIT;
    expect(cycle).toBeGreaterThanOrEqual(25);
    expect(cycle).toBeLessThanOrEqual(45);
    expect(cycle).toBeGreaterThan(35);
    // the walker's own loop (straight legs) leaves the talk about every 40 s
    const { left } = walkLoop(A8_N2_ROUTE, A8_N2_WAITS, A8_N2_FACES, n2, 200);
    const post = left.filter(([, i]) => i === 0).map(([t]) => t);
    expect(post.length).toBeGreaterThanOrEqual(3);
    const walkerCycle = post[2]! - post[1]!;
    expect(walkerCycle).toBeGreaterThan(34);
    expect(walkerCycle).toBeLessThan(44);
    for (const w of [A8_N2_WAITS[0]!, A8_N2_WAITS[2]!]) {
      expect(w).toBeGreaterThanOrEqual(3);
      expect(w).toBeLessThanOrEqual(6);
    }
    // the stops stand on clear floor; the grille stop is 0.65 m from the gate, the talk is west of the desk
    for (const [x, z] of A8_N2_ROUTE) expect(blockedAt(x, z), `(${x}, ${z})`).toEqual([]);
    expect(A8_DESK.x0 - A8_N2_ROUTE[0]![0]).toBeGreaterThan(0.5);
  });

  it('the lure (EnemyManager.lightsOut, 25 m): the board reaches both night guards, N1 is the nearer at every point of N2\'s loop, and N1 walks to the board over open floor; the circuit table names N1', () => {
    const bd = part.devices[A8_BOARD]!;
    expect(circuitOf(81)!.lure?.guard).toBe(A8_N1);
    const d1 = hyp2(A8_N1_POST.x - bd.x, A8_N1_POST.z - bd.z);
    expect(d1).toBeLessThan(LURE_RANGE);
    expect(d1).toBeLessThan(6.5);
    let nearest = Infinity;
    for (let i = 0; i < A8_N2_ROUTE.length; i++) {
      const a = A8_N2_ROUTE[i]!;
      const c = A8_N2_ROUTE[(i + 1) % A8_N2_ROUTE.length]!;
      for (let t = 0; t <= 1; t += 0.02) nearest = Math.min(nearest, hyp2(a[0] + (c[0] - a[0]) * t - bd.x, a[1] + (c[1] - a[1]) * t - bd.z));
      expect(hyp2(a[0] - bd.x, a[1] - bd.z), `route point ${i}`).toBeLessThan(LURE_RANGE);
    }
    expect(nearest).toBeGreaterThan(d1 + 0.1);
    // the walk: his post to the board's west side, 8 s at the investigate pace (the doc), and the board's side is out of C1 and N2's view
    const walk = navLen([A8_N1_POST.x, A8_N1_POST.z], [A8_BOARD_WEST.x + 0.6, A8_BOARD_WEST.z]);
    expect(walk).not.toBeNull();
    expect(walk!).toBeLessThan(10);
    expect(framed(part.cameras[0]!, A8_BOARD_WEST.x, 0, A8_BOARD_WEST.z, false)).toBe(false);
    // the board: a body at its west side stands in the strip under the gallery slab (4.0 m), 0.4 m from the north wall's face
    expect(blockedAt(A8_BOARD_WEST.x, A8_BOARD_WEST.z)).toEqual([]);
    expect(bd.z).toBeGreaterThan(77.5);
    expect(hyp2(bd.x - A8_BOARD_WEST.x, bd.z - A8_BOARD_WEST.z)).toBeLessThan(1.4);
  });

  it('bodies and hide spots: the vestibule, the west bays and the board\'s west side are open floor off N2\'s loop except the board; none within 5 m of N1 but the board', () => {
    expect(part.hideSpots.map((h) => [h.x, h.z])).toEqual([[107.6, 64.5], [116, 70], [A8_BOARD_WEST.x, A8_BOARD_WEST.z]]);
    for (const h of part.hideSpots) expect(blockedAt(h.x, h.z), `hide ${h.x}, ${h.z}`).toEqual([]);
    for (const h of part.hideSpots.slice(0, 2)) {
      for (let i = 0; i < A8_N2_ROUTE.length; i++) {
        const a = A8_N2_ROUTE[i]!;
        const c = A8_N2_ROUTE[(i + 1) % A8_N2_ROUTE.length]!;
        for (let t = 0; t <= 1; t += 0.05) expect(hyp2(a[0] + (c[0] - a[0]) * t - h.x, a[1] + (c[1] - a[1]) * t - h.z), `hide ${h.x}`).toBeGreaterThan(8);
      }
    }
  });
});

describe('A8 the Strongroom: the steps, the claim, the pass zones, the radio', () => {
  const steps = def.objectives!.filter((o) => o.bay === 'A8');
  const splitStep = stepOf('a8-split');

  it('six steps in route order with A / B lines (split, office, grille, beams, sync) and one closing line; the course validates; every text fits 90 characters, no em or en dash; ids fit the wire', () => {
    expect(steps.map((o) => o.id)).toEqual(['a8-split', 'a8-office', 'a8-grille', 'a8-beams', 'a8-sync', 'a8-out']);
    expect(steps.map((o) => o.done)).toEqual([{ flag: A8_GAL_FLAG }, { flag: A8_LOOP_FLAG }, { flag: A8_LOBBY_FLAG }, { flag: A8_INNER_FLAG }, { flag: A8_SYNC_FLAG }, undefined]);
    expect(steps.map((o) => o.timer)).toEqual([undefined, undefined, A8_CONSOLE_GATE, A8_CONSOLE_GATE, A8_CONSOLE_GATE, undefined]);
    for (const o of steps.slice(0, 5)) {
      expect(o.a).toBeDefined();
      expect(o.b).toBeDefined();
      expect(o.a).not.toBe(o.b);
    }
    expect(steps.filter((o) => o.done === undefined)).toHaveLength(1);
    expect(steps[5]!.text).toBe('The vault is open. Both of you out to the cash dock.');
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
    for (const o of steps) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(t.length, t).toBeLessThanOrEqual(90);
        expect(/[–—]/.test(t), t).toBe(false);
      }
      expect(o.id.length).toBeLessThanOrEqual(OBJECTIVE_ID_MAX);
    }
    // the doc's shared, A and B lines word for word
    expect(splitStep.text).toBe('Split up: one onto the gallery, one stays on the floor.');
    expect(splitStep.a).toBe('Take the boost to the gallery at the dark west end.');
    expect(splitStep.b).toBe('Boost your partner up, then keep to the counters.');
    expect(stepOf('a8-grille').b).toBe('Isolate the hall lights at the board, then slip through the grille.');
    expect(stepOf('a8-beams').a).toBe('Throw your partner over the beams.');
    expect(stepOf('a8-sync').b).toBe("Hack time lock two on your partner's count.");
    expect(part.externalFlags).toEqual([A8_GAL_FLAG, A8_LOBBY_FLAG, A8_INNER_FLAG, A8_SYNC_FLAG]);
  });

  it('the radio: the entry line, (joint-interrogation) the officer teach on a8-split, "Lights back in five." and "Grille\'s locking again." on the night gate\'s warning, "Cameras back in five." on the console\'s, the vault line on a8-sync; each at most 90 characters', () => {
    expect(part.bay.radio.map((r) => r.at)).toEqual(['enter', 'a8-split', `warn:${A8_NIGHT_GATE}`, `warn:${A8_NIGHT_GATE}`, `warn:${A8_CONSOLE_GATE}`, 'a8-sync']);
    expect(part.bay.radio.map((r) => r.text)).toEqual(["Last one. Everything you've done tonight, in one room. Take your time.", 'The duty officer clams up with one of you. Two of you, he might say more.', 'Lights back in five.', "Grille's locking again.", 'Cameras back in five.', 'Vault open. Well done, both of you.']);
    for (const r of part.bay.radio) {
      expect(r.text.length, r.text).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(r.text), r.text).toBe(false);
    }
    // the warnings fire as the timed windows cross five seconds left
    const s = runAt(HALL, [HALL[0], HALL[1] + 1]);
    press(s, A8_BOARD, 1);
    let warned = false;
    for (let t = 0; t < 21; t += 1 / 60) {
      s.update(1 / 60);
      if (s.events.some((e) => e.t === 'gateWarn' && e.gate === A8_NIGHT_GATE)) warned = true;
      s.clearEvents();
    }
    expect(warned).toBe(true);
  });

  it('the claim: the first player onto the gallery (feet over 3.9 m inside the gallery box) takes A; until then the lead (P2 in this even set) reads A; the first claim stands', () => {
    expect(part.bay.roles).toEqual([{ role: 'a', zone: { box: A8_GAL_ZONE, y0: 3.9 } }]);
    // the floor under the gallery is outside the claim (y), the gallery inside
    let s = runAt(HALL, [HALL[0], HALL[1] + 1]);
    expect(s.roleClaimed()).toBe(false);
    expect(s.roleOf(1)).toBe('a');
    expect(s.roleOf(0)).toBe('b');
    expect(s.stepLine(splitStep, 1)).toBe(splitStep.a);
    expect(s.stepLine(splitStep, 0)).toBe(splitStep.b);
    // the host (P1) onto the gallery first: P1 is A, P2 B
    s.setPlayer(0, 125, 4.4, 76.4, false);
    s.update(1 / 60);
    expect(s.roleClaimed()).toBe(true);
    expect([s.roleOf(0), s.roleOf(1)]).toEqual(['a', 'b']);
    expect(s.stepLine(splitStep, 0)).toBe(splitStep.a);
    // P2 following does not swap it
    s.setPlayer(1, 128, 4.4, 76.4, false);
    s.update(1 / 60);
    expect([s.roleOf(0), s.roleOf(1)]).toEqual(['a', 'b']);
    // the client (P2) onto the gallery first: P2 is A (the lead's default made a claim)
    s = runAt(HALL, [HALL[0], HALL[1] + 1]);
    s.setPlayer(1, 125, 4.4, 76.4, false);
    s.update(1 / 60);
    expect(s.roleClaimed()).toBe(true);
    expect([s.roleOf(0), s.roleOf(1)]).toEqual(['b', 'a']);
    // a body in the hall at gallery height 0 (or on the stair's low steps) claims nothing
    s = runAt([131.1, 70], [HALL[0], HALL[1]]);
    expect(s.roleClaimed()).toBe(false);
    expect(inBox(A8_GAL_ZONE, 131.1, 76) && !inBox(A8_GAL_ZONE, 131.1, 78)).toBe(true);
  });

  it('the pass zones: the gallery (any player, floor 4.4), the lobby (both, floor 0; not the stairwell or the hall), the inner zone (any, east of the curtain; the landing and T2 in, the throw spot and T1 out)', () => {
    expect(part.passZones).toEqual([
      { id: 'a8-p-gal1', box: A8_GAL_ZONE, flag: A8_GAL_FLAG, floorY: 4.4, any: true },
      { id: 'a8-p-lobby', box: A8_LOBBY_ZONE, flag: A8_LOBBY_FLAG, floorY: 0 },
      { id: 'a8-p-inner1', box: A8_INNER_ZONE, flag: A8_INNER_FLAG, floorY: 0, any: true },
    ]);
    expect(lay.passZones?.filter((z) => z.id.startsWith('a8-'))).toHaveLength(3);
    for (const z of part.passZones) expect(inBox(box, z.box[0], z.box[1], 0.01) && inBox(box, z.box[2], z.box[3], 0.01), z.id).toBe(true);
    expect(inBox(A8_LOBBY_ZONE, A8_T1_SPOT[0], A8_T1_SPOT[1])).toBe(true);
    expect(inBox(A8_LOBBY_ZONE, A8_T2_SPOT[0], A8_T2_SPOT[1])).toBe(true);
    expect(inBox(A8_LOBBY_ZONE, 134.8, 69)).toBe(false);
    expect(inBox(A8_LOBBY_ZONE, 133, 62)).toBe(false);
    expect(inBox(A8_INNER_ZONE, A8_LANDING.x, A8_LANDING.z)).toBe(true);
    expect(inBox(A8_INNER_ZONE, A8_T2_SPOT[0], A8_T2_SPOT[1])).toBe(true);
    expect(inBox(A8_INNER_ZONE, A8_THROW.x, A8_THROW.z)).toBe(false);
    expect(inBox(A8_INNER_ZONE, A8_T1_SPOT[0], A8_T1_SPOT[1])).toBe(false);
    // the plan box covers the hall too: the floor height keeps it to the gallery (4.4 against a hall floor 0, the zone takes feet within 1 m of it)
    expect(inBox(A8_GAL_ZONE, 108, 68.25)).toBe(true);
    expect(Math.abs(0 - 4.4)).toBeGreaterThanOrEqual(1);
  });

  it('the run in route order: split, office (the console), the lobby, the beams, the sync each tick on their flag; both in the exit zone end the course (G138), one alone does not', () => {
    const s = runAt(HALL, [HALL[0], HALL[1] + 1]);
    const done = (id: string): boolean => s.isStepDone(id);
    const inZone = (): void => {
      s.setPlayer(0, 156, 0, 62, false);
      s.setPlayer(1, 157, 0, 63, false);
      s.update(1 / 60);
    };
    s.setPlayer(0, 156, 0, 62, false);
    s.setPlayer(1, HALL[0], 0, HALL[1] + 1, false);
    s.update(1 / 60);
    expect(s.over).toBe(false);
    s.setPlayer(0, HALL[0], 0, HALL[1], false);
    for (const [id, flag] of [['a8-split', A8_GAL_FLAG], ['a8-office', A8_LOOP_FLAG], ['a8-grille', A8_LOBBY_FLAG], ['a8-beams', A8_INNER_FLAG], ['a8-sync', A8_SYNC_FLAG]] as const) {
      expect(done(id), id).toBe(false);
      s.setFlag(flag);
      s.update(1 / 60);
      expect(done(id), id).toBe(true);
    }
    expect(s.over).toBe(false);
    inZone();
    expect(s.over).toBe(true);
  });
});

describe('A8 the Strongroom: map data the e2e and the modes read', () => {
  it('debug points A8-entry / A8-mid (the stub\'s names) and the set\'s marks on clear floor at their floor; camera spaces (hall and lobby open, vault, stairwell and office tight); nav seeds on every floor and room', () => {
    expect(part.debugPoints.map((d) => d.id)).toEqual(['A8-entry', 'A8-mid', 'A8-legup', 'A8-jam', 'A8-pier', 'A8-board', 'A8-grille', 'A8-console', 'A8-throw', 'A8-t1', 'A8-t2', 'A8-vault']);
    for (const d of part.debugPoints) {
      expect(inBox(box, d.pos.x, d.pos.z)).toBe(true);
      expect(blockedAt(d.pos.x, d.pos.z, MOVEMENT.radius, d.pos.y), d.id).toEqual([]);
    }
    expect(part.camSpaces.map((c) => c.size)).toEqual(['open', 'open', 'tight', 'tight', 'tight']);
    expect(part.navSeeds.some((s) => s.y > 4)).toBe(true);
    expect(part.navSeeds.filter((s) => s.y > 4)).toHaveLength(2);
    for (const s of part.navSeeds) expect(blockedAt(s.x, s.z, MOVEMENT.radius, s.y), `seed ${s.x}, ${s.z}`).toEqual([]);
    expect(part.navSeeds.some((s) => inBox([146, 58, 150, 66], s.x, s.z))).toBe(true);
    expect(part.navSeeds.some((s) => inBox([134, 68, 144, 71.4], s.x, s.z))).toBe(true);
  });

  it('shot vantages for the vestibule, the gallery pier and the outer zone; one laser, one panel, one console; the exit zone is in the cash dock (the facility\'s)', () => {
    expect(part.shotVantages.map((v) => v.name)).toEqual(['a8-vestibule', 'a8-pier', 'a8-outer']);
    expect(part.lasers).toHaveLength(1);
    expect(part.laserPanels).toHaveLength(1);
    expect(part.consoles).toHaveLength(1);
    expect(def.exitZone!.box).toEqual([...EXIT_ZONE]);
    expect(part.lips).toHaveLength(1);
  });
});

describe('A8 the Strongroom: dressing (slice 8 step 5)', () => {
  const LIP = part.lips[0]!;
  const kitReport = JSON.parse(readFileSync('src/world/kit/assets/facility-kit.json', 'utf8')) as { pieces: Record<string, { meshes: Record<string, number> }> };
  const propReport = JSON.parse(readFileSync('src/world/props/assets/facility-props.json', 'utf8')) as PropReport;
  const area = { x0: box[0], z0: box[1], x1: box[2], z1: box[3] };
  const heWidth = 133.85 - 106.25;
  const own = part.props;
  const skins = dressing.filter((p) => !p.collide);
  const written = dressing.filter((p) => p.collide && !stairRail.includes(p));
  const kitIn = lay.kit!.instances.filter((i) => inBox(box, i.x, i.z));
  /** A skin box's extent as [x0, x1, y0, y1, z0, z1] (pitched skins are listed apart: their extent is not their box's). */
  const ext = (p: BoxPiece): [number, number, number, number, number, number] => [p.c[0] - p.s[0] / 2, p.c[0] + p.s[0] / 2, p.c[1] - p.s[1] / 2, p.c[1] + p.s[1] / 2, p.c[2] - p.s[2] / 2, p.c[2] + p.s[2] / 2];
  const flat = skins.filter((p) => Math.abs(p.pitch) < 1e-6);
  const pitched = skins.filter((p) => Math.abs(p.pitch) >= 1e-6);
  /** The flat skins whose box overlaps the volume [x0, x1] x [y0, y1] x [z0, z1] (1 mm in). */
  const skinsIn = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): BoxPiece[] =>
    flat.filter((p) => {
      const [a, e, c, d, f, g] = ext(p);
      return a < x1 - 1e-3 && e > x0 + 1e-3 && c < y1 - 1e-3 && d > y0 + 1e-3 && f < z1 - 1e-3 && g > z0 + 1e-3;
    });
  /** The flat skins of a size (any order of the two thin axes: a skin on an x face is (0.03, h, w), on a z face (w, h, 0.03)). */
  const sized = (w: number, h: number, thick = 0.03): BoxPiece[] =>
    flat.filter((p) => Math.abs(p.s[1] - h) < 1e-6 && ((Math.abs(p.s[0] - w) < 1e-6 && Math.abs(p.s[2] - thick) < 1e-6) || (Math.abs(p.s[2] - w) < 1e-6 && Math.abs(p.s[0] - thick) < 1e-6)));

  it('the greybox is as S8 built it: its 138 boxes (checksum), 81 solids, 16 lamps, 5 doors, 1 anchor; the dressing adds six solid boxes (the deposit walls, all noLedge) and nothing else collides', () => {
    let sum = 0;
    for (const p of mine) sum += (p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw) * (p.collide ? 1 : 1.5) * (p.visible === false ? 1.25 : 1) * (p.overhead ? 1.1 : 1);
    expect(sum).toBeCloseTo(GREY.checksum, 3);
    expect(mine.filter((p) => p.collide)).toHaveLength(GREY.solids);
    expect(dressing.length).toBeGreaterThan(1000);
    expect(written).toHaveLength(6);
    for (const w of written) {
      expect(w.noLedge).toBe(true);
      expect(w.visible).toBe(true);
      expect(w.c[0] - w.s[0] / 2).toBeGreaterThanOrEqual(146.15 - 1e-6);
      expect(w.c[0] + w.s[0] / 2).toBeLessThanOrEqual(149.75 + 1e-6);
    }
    expect(built.counts.sets.a8Strongroom).toEqual({ lights: GREY.lights, solids: GREY.solids + 6 + stairRail.length, doors: GREY.doors, anchors: GREY.anchors });
    expect(lamps).toHaveLength(GREY.lights);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A8-16', 'A8-17', 'A8-18', 'A8-19', 'A8-20', 'A8-21', 'A8-22', 'A8-23', 'A8-24', 'A8-25', 'A8-26', 'A8-27', 'A8-28', 'A8-29', 'A8-30', 'A8-31']));
    expect(Object.keys(part.doors)).toHaveLength(GREY.doors);
    expect(part.bay.gates).toHaveLength(6);
    for (const r of part.register) expect(/[–—]/.test(r.element), r.id).toBe(false);
  });

  it('every other dressing box is a visual skin: no collision, noLedge, a side under 5 cm (out of the canonical light shapes: the bake, the meter, the guards and the cameras see the greybox as built); the game still generates no ledge, lip or split gap in the set beyond the planned one', () => {
    for (const p of skins) {
      expect(p.noLedge, `skin at (${p.c.join(', ')})`).toBe(true);
      expect(Math.min(...p.s), `skin at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBeLessThan(CANON_MIN_THICK);
      expect(p.visible).not.toBe(false);
      expect(p.overhead).toBeFalsy();
    }
    // the stair's rail boxes (A8-19) are the dressing's other collision: invisible and noLedge
    for (const p of stairRail) {
      expect(p.visible, `rail box at (${p.c.join(', ')})`).toBe(false);
      expect(p.noLedge, `rail box at (${p.c.join(', ')})`).toBe(true);
    }
    // the only visible box of 5 cm or more is a deposit wall's
    expect(dressing.filter((p) => p.visible !== false && Math.min(...p.s) >= CANON_MIN_THICK)).toEqual(written);
    const inSetBox = (x: number, z: number): boolean => inBox(box, x, z, 0.3);
    expect(anchors.ledges.filter((l) => inSetBox((l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2) && l.piece !== 0 && l.top >= 0.5)).toEqual([]);
    expect(anchors.ledges.filter((l) => inSetBox((l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2) && l.piece === 0)).toHaveLength(1);
    expect(anchors.splits.filter((q) => inSetBox(q.a.x, q.a.z))).toEqual([]);
  });

  it("every skin lies inside the set box (0.3 m of wall slack) and under its own room's ceiling (hall 9.0, under the gallery 4.0, office and stairwell 7.4, lobby 5.5, vault 3.0)", () => {
    const [x0, z0, x1, z1] = box;
    for (const p of skins) {
      const [a, e, , d, f, g] = ext(p);
      expect(a, `skin (${p.c.join(', ')})`).toBeGreaterThanOrEqual(x0 - 0.3);
      expect(e).toBeLessThanOrEqual(x1 + 0.3);
      expect(f).toBeGreaterThanOrEqual(z0 - 0.3);
      expect(g).toBeLessThanOrEqual(z1 + 0.3);
      const [cx, cy, cz] = p.c;
      const inVault = cx > 146.15 && cz > 58.15 && cz < 65.85;
      const inLobby = cx > 134.15 && cx < 145.85 && cz > 56.15 && cz < 67.85 && cy < 5.6;
      const inStairwell = cx > 134.15 && cx < 144.15 && cz > 68.15 && cz < 71.3;
      const inOffice = cx > 134.15 && cx < 143.85 && cz > 71.3 && cy > 4.3;
      const under = p.c[1] - p.s[1] / 2 < 3.99 && cx < 134 && (cz > 74.9 || (cx < 109 && cz > 56));
      const roof = inVault ? A8_H.vault : inLobby ? A8_H.lobby : inStairwell || inOffice ? A8_H.office : under ? A8_H.slab : A8_H.hall;
      expect(d, `skin (${p.c.join(', ')}) top`).toBeLessThanOrEqual(roof + 1e-6);
    }
    for (const p of pitched) expect(p.c[1] + 0.05, `pitched skin (${p.c.join(', ')})`).toBeLessThan(A8_H.hall);
  });

  it("the props over the greybox boxes: 5 + 3 bank counters (2 / 3 cm proud on the front, the back flush or inside, lifted 1 cm), the night desk (5 cm proud on its front, its back 5 cm inside), no box written for them; the written boxes are the deposit walls' only", () => {
    const counters = own.filter((q) => q.prop === 'bankCounter');
    const desks = own.filter((q) => q.prop === 'nightDesk');
    expect(counters).toHaveLength(8);
    expect(desks).toHaveLength(1);
    expect(A8_PROP_LIFT).toBeLessThanOrEqual(0.05);
    for (const c of counters) expect(c.y).toBeCloseTo(A8_PROP_LIFT, 9);
    const hull = (q: PropPlacement): { x0: number; x1: number; z0: number; z1: number } => {
      const f = PROP_FOOTPRINT[q.prop];
      const ws = [[f[0], f[1]], [f[2], f[1]], [f[2], f[3]], [f[0], f[3]]].map(([lx, lz]) => propToWorld(q, lx!, 0, lz!));
      return { x0: Math.min(...ws.map((w) => w[0])), x1: Math.max(...ws.map((w) => w[0])), z0: Math.min(...ws.map((w) => w[2])), z1: Math.max(...ws.map((w) => w[2])) };
    };
    // main run: the box x 114-126, z 65.5-66.24; the prop's solid box (1.19 x 0.74 x 1.19) sits within 5 cm of it, the front (-z) 3 cm out at most
    const mainBox = { x0: A8_COUNTER_MAIN.x0, x1: A8_COUNTER_MAIN.x1, z0: A8_COUNTER_MAIN.z0, z1: A8_COUNTER_MAIN.z1 };
    const retBox = { x0: A8_COUNTER_RETURN.x0, x1: A8_COUNTER_RETURN.x1, z0: A8_COUNTER_RETURN.z0, z1: A8_COUNTER_RETURN.z1 };
    for (const [list, cover] of [[counters.filter((c) => Math.abs(c.z - A8_COUNTER_MAIN_Z) < 1e-6), mainBox], [counters.filter((c) => Math.abs(c.x - A8_COUNTER_RETURN_X) < 1e-6), retBox]] as const) {
      for (const c of list) {
        const w = propCollisionBox(c)![0]!;
        // a quarter-turned prop's box has its sizes in the prop's frame: fold them to the plan
        const turned = Math.abs(Math.sin(w.yaw)) > 0.5;
        const hx = (turned ? w.s[2] : w.s[0]) / 2;
        const hz = (turned ? w.s[0] : w.s[2]) / 2;
        expect(w.c[0] - hx).toBeGreaterThanOrEqual(cover.x0 - 0.05 - 1e-6);
        expect(w.c[0] + hx).toBeLessThanOrEqual(cover.x1 + 0.05 + 1e-6);
        expect(w.c[2] - hz).toBeGreaterThanOrEqual(cover.z0 - 0.05 - 1e-6);
        expect(w.c[2] + hz).toBeLessThanOrEqual(cover.z1 + 0.05 + 1e-6);
        expect(w.s[1]).toBeCloseTo(1.19, 9);
      }
    }
    // (the brass foot rail at the floor is the prop's listed overhang, 9 cm past its box on the public side: no collision, no top)
    expect(PROP_OVERHANG.bankCounter).toMatchObject({ by: 0.14 });
    expect(counters.filter((c) => Math.abs(c.z - A8_COUNTER_MAIN_Z) < 1e-6).map((c) => Math.round(c.x * 100) / 100)).toEqual([...A8_COUNTER_MAIN_X]);
    expect(counters.filter((c) => Math.abs(c.x - A8_COUNTER_RETURN_X) < 1e-6).map((c) => Math.round(c.z * 100) / 100)).toEqual([...A8_COUNTER_RETURN_Z]);
    // the five modules tile the main run's 12 m, the three the return's 7.2 m (2.4 m pitch), the fronts to the public side (main -z, return -x)
    expect(counters.filter((c) => Math.abs(c.z - A8_COUNTER_MAIN_Z) < 1e-6).every((c) => Math.abs(c.yaw - Math.PI) < 1e-9)).toBe(true);
    expect(counters.filter((c) => Math.abs(c.x - A8_COUNTER_RETURN_X) < 1e-6).every((c) => Math.abs(c.yaw - (3 * Math.PI) / 2) < 1e-9)).toBe(true);
    // the desk
    const d = desks[0]!;
    const dh = hull(d);
    expect([d.x, d.z]).toEqual([A8_DESK_PROP.x, A8_DESK_PROP.z]);
    expect(dh.x0).toBeCloseTo(A8_DESK.x0, 9);
    expect(dh.x1).toBeCloseTo(A8_DESK.x1, 9);
    expect(dh.z1 - A8_DESK.z1).toBeCloseTo(0.05, 9);
    expect(A8_DESK.z0 - dh.z0).toBeCloseTo(-0.05, 9);
    expect(d.y).toBeCloseTo(A8_PROP_LIFT, 9);
    // the greybox boxes under them are unchanged and still the collision: the counters' and the desk's solid boxes exist exactly once
    for (const c of [A8_COUNTER_MAIN, A8_COUNTER_RETURN]) expect(mine.filter((q) => q.collide && Math.abs(q.c[0] - (c.x0 + c.x1) / 2) < 1e-6 && Math.abs(q.c[2] - (c.z0 + c.z1) / 2) < 1e-6)).toHaveLength(1);
    expect(mine.filter((q) => q.collide && Math.abs(q.c[0] - (A8_DESK.x0 + A8_DESK.x1) / 2) < 1e-6 && Math.abs(q.c[2] - (A8_DESK.z0 + A8_DESK.z1) / 2) < 1e-6)).toHaveLength(1);
    // their faces are covered by skins: the counters' back panels (north face z 66.24 and east face x 126.0), the desk's back panel and end caps
    expect(skinsIn(114.0, 126.0, 0.2, 1.1, 66.241, 66.27)).not.toHaveLength(0);
    expect(skinsIn(126.001, 126.03, 0.2, 1.1, 58.4, 66.2)).not.toHaveLength(0);
    expect(skinsIn(A8_DESK.x0, A8_DESK.x1, 0.1, 0.7, A8_DESK.z0 - 0.03, A8_DESK.z0 - 0.001).some((q) => q.s[0] > 2.3)).toBe(true);
    for (const x of [A8_DESK.x0, A8_DESK.x1]) expect(skinsIn(x - 0.03, x + 0.03, 0.1, 0.7, A8_DESK.z0 + 0.1, A8_DESK.z1).some((q) => q.s[2] > 0.9)).toBe(true);
  });

  it('the deposit walls: six modules on the vault flanks, backs on the walls (z 58.15 and 65.85), six noLedge solids 1.19 x 2.39 x 0.56; the vault stays 6.5 m wide and the door axis clear: no new top, no narrowed door, no jam or camera line touched', () => {
    const walls = own.filter((q) => q.prop === 'depositWall');
    expect(walls).toHaveLength(6);
    expect(walls.filter((q) => q.z < 62)).toHaveLength(3);
    expect([...new Set(walls.map((q) => Math.round(q.x * 100) / 100))].sort((a, c) => a - c)).toEqual([...A8_DEPOSIT_X]);
    expect(walls.filter((q) => q.z > 62)).toHaveLength(3);
    for (const q of walls) {
      const w = propCollisionBox(q)![0]!;
      expect(w.noLedge).toBe(true);
      expect(w.s[1]).toBeCloseTo(2.39, 9);
      expect(w.s[2]).toBeCloseTo(0.56, 9);
      expect(w.c[0] - w.s[0] / 2).toBeGreaterThanOrEqual(146.15 - 1e-6);
      expect(w.c[0] + w.s[0] / 2).toBeLessThanOrEqual(149.75 + 1e-6);
      // inside the flank's face (z 58.15 / 65.85) by 1 cm, not beyond
      if (q.z < 62) expect(w.c[2] - w.s[2] / 2).toBeGreaterThanOrEqual(58.15);
      else expect(w.c[2] + w.s[2] / 2).toBeLessThanOrEqual(65.85);
      // the box is a written box of the builder, once
      expect(written.filter((q2) => Math.abs(q2.c[0] - w.c[0]) < 1e-6 && Math.abs(q2.c[2] - w.c[2]) < 1e-6)).toHaveLength(1);
    }
    const south = Math.max(...written.filter((q) => q.c[2] < 62).map((q) => q.c[2] + q.s[2] / 2));
    const north = Math.min(...written.filter((q) => q.c[2] > 62).map((q) => q.c[2] - q.s[2] / 2));
    expect(north - south).toBeGreaterThanOrEqual(6.5);
    // the door's swing (hinge (146, 61.3), leaf 1.4 m into the vault) and the walk to the exit zone stay clear
    expect(north - 61.3).toBeGreaterThan(1.4 + MOVEMENT.radius);
    expect(61.3 - south).toBeGreaterThan(MOVEMENT.radius);
    expect(walkBlocked(147, 62, 154, 62)).toBeNull();
    expect(walkBlocked(147, 60, 150.5, 60.2)).toBeNull();
    expect(Math.max(...written.map(top))).toBeLessThan(2.4);
    expect(soloJumpThreats(solid, LIP)).toEqual([]);
  });

  it("budgets (computed): kit triangles <= 60 k; the props pass FacilityProps.check against the set box at 60 k triangles and 12 draws, with the facility's set-side plate in the box counted", () => {
    expect(kitIn.some((i) => i.piece === 'wallPanel')).toBe(true);
    const kitTris = kitTriangles({ instances: kitIn, doors: [] }, kitReport);
    expect(kitTris).toBeGreaterThan(0);
    expect(kitTris, `${kitTris} kit triangles`).toBeLessThanOrEqual(60_000);
    const facilityIn = built.facility.props.filter((q) => inBox(box, q.x, q.z));
    expect(facilityIn.some((q) => q.prop === 'signPlate')).toBe(true);
    const counted = [...own, ...facilityIn];
    const checker = (list: readonly PropPlacement[]): FacilityProps => {
      const f = new FacilityProps();
      f.placements.push(...list);
      return f;
    };
    expect(checker(counted).check(area, propReport)).toEqual([]);
    expect(propTriangles(counted, propReport)).toBeLessThanOrEqual(PROP_SET_BUDGET.tris);
    expect(propDraws(counted, propReport)).toBeLessThanOrEqual(PROP_SET_BUDGET.draws);
    expect(new Set(own.map((q) => q.prop))).toEqual(new Set(['bankCounter', 'nightDesk', 'depositWall', 'signPlate']));
    // the skins are thin instances of the level's box shapes, not draws of their own: the count is recorded (S8 Dressing), the budget is the kit's and the props'
    expect(skins.length).toBeLessThan(2500);
  });

  it('sign plates hang on wall faces (their back inside a solid wall, 2.15 m or more up, no gameplay box); five of them, one over each of the grille, the vault door, the stair foot door, the stair-top door and the office door', () => {
    const plates = own.filter((q) => q.prop === 'signPlate');
    expect(plates).toHaveLength(5);
    expect(PROP_HUNG).toContain('signPlate');
    for (const q of plates) {
      expect(propCollisionBox(q)).toBeNull();
      expect(q.y).toBeGreaterThanOrEqual(2.15);
      // 2 cm behind its mounting face is inside a collidable wall at the plate's height
      const bx = q.x - Math.sin(q.yaw) * 0.02;
      const bz = q.z - Math.cos(q.yaw) * 0.02;
      expect(
        solid.some((w) => Math.abs(bx - w.c[0]) < w.s[0] / 2 && Math.abs(bz - w.c[2]) < w.s[2] / 2 && q.y + 0.15 > w.c[1] - w.s[1] / 2 && q.y + 0.15 < w.c[1] + w.s[1] / 2),
        `plate at (${q.x}, ${q.y}, ${q.z})`,
      ).toBe(true);
    }
    expect(plates.map((q) => [Math.round(q.x * 100) / 100, Math.round(q.z * 100) / 100])).toEqual(A8_SIGNS.map(([x, z]) => [x, z]));
    // over their doors: the sign is above the door's head
    for (const [id, [sx, sz]] of [[A8_GRILLE, [133.85, 62.0]], [A8_VAULT, [145.85, 62.0]], [A8_STAIR_FOOT, [135.0, 67.85]], [A8_STAIR_TOP, [143.2, 71.55]], [A8_OFFICE_DOOR, [133.85, 76.6]]] as const) {
      const d = doorAt(id);
      const q = plates.find((p2) => Math.abs(p2.x - sx) < 1e-6 && Math.abs(p2.z - sz) < 1e-6)!;
      expect(q.y).toBeGreaterThanOrEqual(d.hinge.y + d.height);
    }
  });

  it("every prop with an emissive part carries a circuit group (S3-7 S1, light parity): the night desk's screen and lamp on the hall night circuit (81), each sign plate on the circuit that lights its wall (grille 81, vault door and stair foot door 84, stair-top door 83, office door 82); the counters and the deposit walls have nothing that glows", () => {
    const plan = new Set(Object.values(marlowCourseGroups()));
    const glowing = own.filter((q) => propGlows(q) && !PROP_OWN_SUPPLY.includes(q.prop));
    const of = (prop: string): PropPlacement[] => glowing.filter((q) => q.prop === prop);
    expect(of('nightDesk')).toHaveLength(1);
    expect(of('signPlate')).toHaveLength(5);
    expect(glowing).toHaveLength(6);
    expect(own.filter((q) => q.prop === 'bankCounter' || q.prop === 'depositWall').some((q) => propGlows(q))).toBe(false);
    for (const q of glowing) {
      expect(q.group, `${q.prop} at ${q.x}, ${q.y}, ${q.z}`).toBeDefined();
      expect(plan.has(q.group!), `${q.prop} group ${q.group}`).toBe(true);
      expect(q.group!).toBeGreaterThanOrEqual(81);
      expect(q.group!).toBeLessThanOrEqual(84);
    }
    expect(of('nightDesk')[0]!.group).toBe(81);
    // the plate's circuit is the one whose lamps are nearest on its side: the greybox's lamps of that group
    expect(of('signPlate').map((q) => [Math.round(q.x * 100) / 100, Math.round(q.z * 100) / 100, q.group])).toEqual(A8_SIGNS.map(([x, z, , , g]) => [x, z, g]));
    expect(of('signPlate').map((q) => q.group)).toEqual([81, 84, 84, 83, 82]);
    for (const q of of('signPlate')) expect(lamps.some((l) => l.group === q.group), `a lamp on group ${q.group}`).toBe(true);
  });

  it("every kit glow in A8 carries a circuit of the plan's A8 rows: the hall's panels above the 9.2 slab top on 81 (south, north and west) and 83 / 84 over the office, plant and lobby side, the accent slots on 82 (under the gallery's front), 83, 84 (no light); no lamp was added", () => {
    const plan = new Set(Object.values(marlowCourseGroups()));
    const glowing = kitIn.filter((i) => ['wallPanel', 'skirting', 'column', 'handrail'].includes(i.piece) || (i.piece === 'ledSlot' && !i.noLed));
    expect(glowing.length).toBeGreaterThan(40);
    for (const i of glowing) {
      expect(i.group, `${i.piece} at ${i.x}, ${i.y}, ${i.z}`).toBeDefined();
      expect(plan.has(i.group!), `${i.piece} group ${i.group}`).toBe(true);
      expect(i.group!).toBeGreaterThanOrEqual(81);
      expect(i.group!).toBeLessThanOrEqual(84);
    }
    const panels = glowing.filter((i) => i.piece === 'wallPanel');
    for (const i of panels) expect(i.y, `panel at ${i.x}, ${i.z}`).toBeCloseTo(A8_CEIL_TOP, 9);
    expect(panels.filter((i) => i.group === 81 && Math.abs(i.z - 50.25) < 0.1).length).toBeGreaterThan(15);
    expect(panels.filter((i) => i.group === 81 && Math.abs(i.z - 77.75) < 0.1).length).toBeGreaterThan(15);
    expect(panels.filter((i) => i.group === 81 && Math.abs(i.x - 106.25) < 0.1).length).toBeGreaterThan(15);
    expect(panels.filter((i) => i.group === 83 && Math.abs(i.z - 77.75) < 0.1).length).toBeGreaterThan(5);
    expect(panels.filter((i) => i.group === 84 && Math.abs(i.x - 149.75) < 0.1).length).toBeGreaterThan(15);
    // no panel stands over a group it does not belong to: the hall's (81) are all west of the east wall's face, the lobby side's (84) all east of it
    for (const i of panels.filter((q) => q.group === 81 && Math.abs(q.x - 106.25) > 0.1)) expect(i.x).toBeLessThan(134);
    for (const i of panels.filter((q) => q.group === 84 && Math.abs(q.x - 149.75) > 0.1)) expect(i.x).toBeGreaterThan(134);
    const slots = kitIn.filter((i) => i.piece === 'ledSlot');
    expect(slots.filter((i) => i.group === 82)).toHaveLength(4);
    expect(slots.filter((i) => i.group === 83)).toHaveLength(2);
    expect(slots.filter((i) => i.group === 84)).toHaveLength(3);
    expect(slots.every((i) => !i.noLed)).toBe(true);
    for (const i of slots.filter((q) => q.group === 82)) expect(i.y).toBeCloseTo(A8_H.slab, 9);
    expect(lamps).toHaveLength(GREY.lights);
    expect(HALL_H).toBeGreaterThan(A8_CEIL_TOP);
  });

  it("no skin touches a lamp's fixture, a course device's place, a camera's lens, a switch or the doors' clear openings (the through-wall box of each door, from 5 cm up to its height)", () => {
    for (const l of lamps) {
      const f = l.fixture!;
      expect(skinsIn(l.x - f.sx / 2, l.x + f.sx / 2, l.y + f.oy - f.sy / 2, l.y + f.oy + f.sy / 2, l.z - f.sz / 2, l.z + f.sz / 2).map((q) => q.c), `lamp ${l.id} at ${l.x}, ${l.y}, ${l.z}`).toEqual([]);
    }
    // the board (127, 0.9, 77.6): the cabinet is at most 12 cm deep (layers 0-3), nothing stands in front of that, and the knob is 3 cm behind the device; the console, the push bar: their holes bare; the request-to-exit: nothing past the plate
    expect(skinsIn(126.4, 127.6, 0.05, 1.9, 77.2, 77.629)).toEqual([]);
    expect(skinsIn(126.9, 127.1, 0.8, 1.0, 77.2, 77.629)).toEqual([]);
    expect(skinsIn(143.4, 143.8, 5.3, 5.9, 74.3, 75.1).map((q) => q.c)).toEqual([]);
    expect(skinsIn(135.6, 136.0, 0.9, 1.3, 71.1, 71.24).map((q) => q.c)).toEqual([]);
    expect(skinsIn(136.0, 136.6, 0.7, 1.5, 56.21, 56.5)).toEqual([]);
    // the time locks' ready lamps: the wall-face column above 1.75 m (x +-0.1 at T1; z +-0.1 at T2) is bare, nothing hangs in front of it but the greybox's status lamps
    expect(skinsIn(A8_T1_AT.x - 0.1, A8_T1_AT.x + 0.1, 1.75, 2.45, 67.6, 67.84).map((q) => q.c)).toEqual([]);
    expect(skinsIn(145.6, 145.84, 1.75, 2.45, A8_T2_AT.z - 0.1, A8_T2_AT.z + 0.1).map((q) => q.c)).toEqual([]);
    // a body at either hack spot (0.3 m round, to 2.0 m) touches no skin; the brackets of the status lamps are at 2.2 m
    for (const [sx, sz] of [A8_T1_SPOT, A8_T2_SPOT]) expect(skinsIn(sx - 0.3, sx + 0.3, 0.05, 2.0, sz - 0.3, sz + 0.3).map((q) => q.c), `spot ${sx}, ${sz}`).toEqual([]);
    for (const c of part.cameras) {
      const y = c.y + (A8_LEVELS[c.level] ?? 0);
      expect(skinsIn(c.at[0] - 0.1, c.at[0] + 0.1, y - 0.15, y + 0.15, c.at[1] - 0.1, c.at[1] + 0.1).map((q) => q.c), c.id).toEqual([]);
    }
    for (const s of part.switches) expect(skinsIn(s.pos.x - 0.05, s.pos.x + 0.04, s.pos.y - 0.06, s.pos.y + 0.06, s.pos.z - 0.06, s.pos.z + 0.06).map((q) => q.c), s.id).toEqual([]);
    for (const id of [A8_GRILLE, A8_VAULT, A8_OFFICE_DOOR, A8_STAIR_TOP, A8_STAIR_FOOT]) {
      const q = doorAt(id);
      const alongZ = Math.abs(Math.sin(q.yaw)) < 0.5;
      const x0 = alongZ ? q.hinge.x - 0.14 : q.hinge.x;
      const x1 = alongZ ? q.hinge.x + 0.14 : q.hinge.x + q.width;
      const z0 = alongZ ? q.hinge.z : q.hinge.z - 0.14;
      const z1 = alongZ ? q.hinge.z + q.width : q.hinge.z + 0.14;
      expect(skinsIn(x0, x1, q.hinge.y + 0.05, q.hinge.y + q.height, z0, z1).map((p2) => p2.c), id).toEqual([]);
    }
    // the L7 sliding door (frames to 2.42) on the set box's west edge
    expect(skinsIn(106.2, 106.3, 0.05, 2.45, 59.0, 61.0)).toEqual([]);
  });

  it("the routes and lanes are as the greybox left them: no skin in the body's way (0.3 m round each route point, 5 cm to 2.1 m over the floor) at N1's post, N2's five points, the jam spot, the leg-up mark, the vestibule, the east lane, the pier and the board, the time lock and throw spots, the vault walk; the decks and the stair lanes are open", () => {
    const pts: [number, number, number][] = [
      [A8_N1_POST.x, A8_N1_POST.z, 0],
      ...A8_N2_ROUTE.map(([x, z]) => [x, z, 0] as [number, number, number]),
      [A8_JAM.x, A8_JAM.z, 0],
      [A8_LEGUP.x, A8_LEGUP.z, 0],
      [107.6, 64.5, 0],
      [132.25, 66.0, 0],
      [132.25, 70.0, 0],
      [A8_GRILLE_SPOT.x, A8_GRILLE_SPOT.z, 0],
      [A8_BOARD_WEST.x, A8_BOARD_WEST.z, 0],
      [A8_PIER.x, A8_PIER.z, A8_H.gallery],
      [133.2, 76.6, A8_H.gallery],
      [A8_OFFICER_POST.x, A8_OFFICER_POST.z, A8_H.gallery],
      [A8_THROW.x, A8_THROW.z, 0],
      [A8_RUNNER.x, A8_RUNNER.z, 0],
      [A8_LANDING.x, A8_LANDING.z, 0],
      [A8_T1_SPOT[0], A8_T1_SPOT[1], 0],
      [A8_T2_SPOT[0], A8_T2_SPOT[1], 0],
      [148, 62, 0],
      [135.4, 62, 0],
    ];
    for (const [x, z, y] of pts) expect(skinsIn(x - 0.3, x + 0.3, y + 0.05, y + 2.1, z - 0.3, z + 0.3).map((q) => q.c), `point (${x}, ${z})`).toEqual([]);
    // the gallery's decks: the return (x 106.5-108.7) and the north run (z 75.3-77.6), the stair head's gap
    expect(skinsIn(106.5, 108.7, A8_H.gallery + 0.05, 6.4, 56.3, 74.9).map((q) => q.c)).toEqual([]);
    expect(skinsIn(107, 133.2, A8_H.gallery + 0.05, 6.4, 75.3, 77.6).map((q) => q.c)).toEqual([]);
    expect(skinsIn(130.6, 131.6, A8_H.gallery + 0.05, 6.4, 74.9, 75.2).map((q) => q.c)).toEqual([]);
    // the public stair's lane (the body's 0.6 m within 130.5-131.7: the rails stand outside) and the office stair's (z 70.1-71.1)
    expect(skinsIn(130.8, 131.4, 0.05, 6.4, 67.3, 75.0).map((q) => q.c)).toEqual([]);
    expect(skinsIn(134.5, 142.2, 0.05, 7.4, 70.1, 71.1).map((q) => q.c)).toEqual([]);
    // the stairwell's landings: the foot (x 134.4-135.2, z 68.5-70.9) and the head (x 142.3-143.9, y 4.4 up)
    expect(skinsIn(134.3, 135.05, 0.05, 2.1, 68.5, 70.9).map((q) => q.c)).toEqual([]);
    expect(skinsIn(142.3, 143.9, A8_H.gallery + 0.05, 6.5, 68.5, 70.9).filter((q) => ext(q)[0] < 143.7 && ext(q)[4] < 70.8 && ext(q)[5] > 68.6).map((q) => q.c)).toEqual([]);
    // the hall floor's open ground: nothing stands above 5 cm in the middle of the public floor (x 108-133, z 52-65.4) except the counters' return end
    expect(skinsIn(109.5, 125.0, 0.05, 2.1, 52, 65.4).map((q) => q.c)).toEqual([]);
  });

  it('the hall walls: oak dado and plaster on the four faces, 6 + 6 + 7 + 6 pilaster lines, five tall windows on the south wall (x 110.8-129.2, sill 3.5, clear of C1) and four over the gallery on the north wall, a stepped cornice under the 9.0 ceiling, the grille bays, the L7 door, the glazed end bay, the board and the office door left bare', () => {
    // pilaster shafts: a 0.36 m skin along the whole shaft
    const shaftS = flat.filter((q) => Math.abs(q.s[0] - 0.36) < 1e-6 && Math.abs(q.s[2] - 0.03) < 1e-6 && q.s[1] > 7.9 && q.c[2] < 50.5);
    expect(shaftS.map((q) => q.c[0]).sort((a, c) => a - c)).toEqual([...A8_SOUTH_P]);
    for (const q of shaftS) expect(top(q)).toBeLessThanOrEqual(A8_CORNICE);
    const shaftN = flat.filter((q) => Math.abs(q.s[0] - 0.36) < 1e-6 && Math.abs(q.s[2] - 0.03) < 1e-6 && q.c[2] > 77.5);
    expect(new Set(shaftN.map((q) => q.c[0]))).toEqual(new Set(A8_NORTH_P));
    const shaftE = flat.filter((q) => Math.abs(q.s[2] - 0.36) < 1e-6 && Math.abs(q.s[0] - 0.03) < 1e-6 && q.c[0] > 133 && q.c[0] < 134 && q.s[1] > 8);
    expect(shaftE.map((q) => q.c[2]).sort((a, c) => a - c)).toEqual([...A8_EAST_P]);
    const shaftW = flat.filter((q) => Math.abs(q.s[2] - 0.36) < 1e-6 && Math.abs(q.s[0] - 0.03) < 1e-6 && q.c[0] < 107);
    expect(new Set(shaftW.map((q) => q.c[2]))).toEqual(new Set(A8_WEST_P));
    // windows: dark glass 1.8 wide, 4.0 tall (south) and 2.1 tall (north)
    expect(sized(1.8, 4.0).filter((q) => q.c[2] < 51).map((q) => q.c[0]).sort((a, c) => a - c)).toEqual([...A8_WINDOW_S]);
    expect(sized(1.8, 2.1).filter((q) => q.c[2] > 77).map((q) => q.c[0]).sort((a, c) => a - c)).toEqual([...A8_WINDOW_N]);
    // C1's mount (120, 3.2) sits below the middle window's sill (3.42): the clear zone above is the test above; the window's glass is above 3.5
    for (const q of sized(1.8, 4.0)) expect(q.c[1] - q.s[1] / 2).toBeCloseTo(A8_WINDOW_Y.south[0], 9);
    // cornices: a stone band 0.22 m high (8.78-9.0) along each of the four walls (the south wall's is 27.6 m)
    const corn = flat.filter((q) => Math.abs(q.s[1] - 0.22) < 1e-6 && top(q) === A8_H.hall && Math.max(q.s[0], q.s[2]) > 20);
    expect(corn.length).toBeGreaterThanOrEqual(4);
    // the panelled dado: oak up to 2.4 on the hall floor, 1.2 over the gallery's boards
    // (the pilasters stand over the finish, on layers 2 and 3: the dado runs behind them whole)
    const oakS = flat.filter((q) => Math.abs(q.s[1] - 2.4) < 1e-6 && q.c[2] < 50.5 && Math.abs(q.c[1] - 1.2) < 1e-6);
    expect(oakS.reduce((n, q) => n + q.s[0], 0)).toBeCloseTo(heWidth, 6);
    const oakN = flat.filter((q) => Math.abs(q.s[1] - 1.2) < 1e-6 && q.c[2] > 77.6 && Math.abs(q.c[1] - (A8_H.gallery + 0.6)) < 1e-6);
    expect(oakN.reduce((n, q) => n + q.s[0], 0)).toBeGreaterThan(20);
    // bare places: the grille's opening on the east face (below the lintel at 3.0 nothing in z 61.1-62.9 above 5 cm but the threshold's paint), the board's place, the L7 door and slot
    expect(skinsIn(133.7, 133.85, 0.05, 3.0, 61.15, 62.85)).toEqual([]);
    expect(skinsIn(106.2, 106.5, 0.05, 2.6, 58.6, 63.0)).toEqual([]);
    expect(skinsIn(106.2, 106.5, 4.5, 7.5, 50.6, 52.0)).toEqual([]);
    expect(skinsIn(133.7, 133.85, A8_H.gallery + 0.05, 6.5, 76.0, 77.2)).toEqual([]);
  });

  it("the floors: a cream marble skin over the whole hall (x 106.25-133.85, z 50.25-77.75), a black chequer of 105 cells of 1.6 m inside a brass line, plank seams on both decks, a yellow-black edge band on the open loading edge, plate seams in the lobby and the vault, carpet seams in the office, and the two striped 1 m marks at the leg-up mark and the jam spot (SPEC P16); every floor skin is flush (under 2 cm)", () => {
    const floor = flat.filter((q) => top(q) <= 0.02);
    expect(floor.length).toBeGreaterThan(120);
    const cells = flat.filter((q) => Math.abs(q.s[0] - A8_CHECKER.cell) < 1e-6 && Math.abs(q.s[2] - A8_CHECKER.cell) < 1e-6 && Math.abs(q.s[1] - 0.008) < 1e-9);
    expect(cells).toHaveLength(105);
    for (const q of cells) {
      expect(q.c[0] - q.s[0] / 2).toBeGreaterThanOrEqual(109.25 - 1e-6);
      expect(q.c[0] + q.s[0] / 2).toBeLessThanOrEqual(133.25 + 1e-6);
    }
    const base = flat.find((q) => q.s[0] > 27.5 && q.s[2] > 27.4 && top(q) < 0.01)!;
    expect(base).toBeDefined();
    expect(base.c[0] - base.s[0] / 2).toBeCloseTo(106.25, 6);
    expect(base.c[2] + base.s[2] / 2).toBeCloseTo(77.75, 6);
    // the game's surfaces are the greybox's (a skin changes no footstep)
    expect(surfaceAt(b.surfaces, 120, 0, 62, 'concrete')).toBe('concrete');
    expect(surfaceAt(b.surfaces, 140, 0, 62, 'concrete')).toBe('metal');
    expect(surfaceAt(b.surfaces, 148, 0, 62, 'concrete')).toBe('metal');
    expect(surfaceAt(b.surfaces, 120, 4.4, 76.4, 'concrete')).toBe('wood');
    expect(surfaceAt(b.surfaces, 139, 4.4, 74.7, 'concrete')).toBe('carpet');
    // plank seams on the north run (z 75.3-77.4, every 0.3) and the return (x 106.55-108.55)
    expect(flat.filter((q) => Math.abs(q.c[1] - (A8_H.gallery + 0.003)) < 1e-6 && q.s[0] > 27 && q.s[2] < 0.03).length).toBeGreaterThanOrEqual(8);
    expect(flat.filter((q) => Math.abs(q.c[1] - (A8_H.gallery + 0.003)) < 1e-6 && q.s[2] > 18 && q.s[0] < 0.03).length).toBeGreaterThanOrEqual(8);
    // the open loading edge's band (x 108.7-109.0, z 66-70.5) with its black dashes
    const band = flat.find((q) => Math.abs(q.c[0] - 108.85) < 1e-6 && Math.abs(q.s[2] - 4.5) < 1e-6)!;
    expect(band).toBeDefined();
    expect(top(band)).toBeLessThan(A8_H.gallery + 0.02);
    expect(flat.filter((q) => Math.abs(q.s[0] - 0.3) < 1e-6 && Math.abs(q.s[2] - 0.2) < 1e-6 && q.c[1] > A8_H.gallery && q.c[1] < A8_H.gallery + 0.02).length).toBeGreaterThanOrEqual(10);
    // the striped marks: five 1 m x 0.2 m strips each, centred on the marks
    for (const m of A8_MARKS) {
      const strips = flat.filter((q) => Math.abs(q.s[0] - 1.0) < 1e-6 && Math.abs(q.s[2] - 0.2) < 1e-6 && Math.abs(q.s[1] - 0.015) < 1e-9 && Math.abs(q.c[0] - m.x) < 1e-6 && Math.abs(q.c[2] - m.z) < 0.5);
      expect(strips, `mark at ${m.x}, ${m.z}`).toHaveLength(5);
    }
    expect(A8_MARKS[0]).toEqual({ x: A8_LEGUP.x, z: A8_LEGUP.z });
    expect(A8_MARKS[1]).toEqual({ x: A8_JAM.x, z: A8_JAM.z });
    // the marks' floors: the leg-up mark is open floor at the lip's foot, the jam spot clear of the counter's north face (z 66.24) by its half width
    expect(A8_JAM.z - 0.5).toBeGreaterThan(A8_COUNTER_MAIN.z1);
    expect(A8_LEGUP.x - 0.5).toBeGreaterThanOrEqual(A8_RETURN.x1);
  });

  it('the gallery: a stone coping 4 cm proud each side on the 1.2 m balustrade and raised panels on both faces, the slab front frieze with a brass line (not across the stair head or the open edge), bases and capitals on all eight columns, newels on both ends of the stair head, the drop chain (24 links, two eye plates) across the open loading edge, an accent line on circuit 82 under the front', () => {
    const topY = A8_H.gallery + A8_H.balustrade;
    const coping = flat.filter((q) => Math.abs(q.c[1] - (topY + 0.015)) < 1e-6 && Math.abs(q.s[1] - 0.03) < 1e-9 && Math.max(q.s[0], q.s[2]) > 2);
    expect(coping.length).toBeGreaterThanOrEqual(5);
    for (const q of coping) {
      // the coping is wider than the balustrade (0.2 m) by 8 cm over the slab's own thickness at most
      expect(Math.min(q.s[0], q.s[2])).toBeLessThanOrEqual(0.28 + 1e-6);
      expect(Math.min(q.s[0], q.s[2])).toBeGreaterThanOrEqual(0.2);
    }
    // raised panels: a darker block 0.7 m high with a lighter inset on both faces of every run
    expect(flat.filter((q) => Math.abs(q.s[1] - 0.7) < 1e-6 && Math.abs(q.c[1] - 5.0) < 1e-6).length).toBeGreaterThanOrEqual(20);
    // 8 columns x 4 faces x (a base, two capital blocks)
    expect(flat.filter((q) => Math.abs(q.s[1] - 0.35) < 1e-9 && q.c[1] < 0.2 && Math.max(q.s[0], q.s[2]) > 0.39 && Math.max(q.s[0], q.s[2]) < 0.41)).toHaveLength(32);
    expect(flat.filter((q) => Math.abs(q.s[1] - 0.38) < 1e-9 && top(q) === A8_H.slab)).toHaveLength(32);
    expect(flat.filter((q) => Math.abs(q.s[1] - 0.18) < 1e-9 && top(q) === A8_H.slab)).toHaveLength(32);
    // the newels: 0.35 m posts of four plates on the balustrade tops at x 130.3-130.5 and 131.7-131.9 (the switch stands at x 131.65, the post's west face is 131.7)
    for (const x of [130.4, 131.8]) expect(flat.filter((q) => Math.abs(q.c[0] - x) < 0.12 && Math.abs(q.s[1] - 0.35) < 1e-9 && Math.abs(q.c[1] - (topY + 0.175)) < 1e-6)).toHaveLength(4);
    // the drop chain (P13): 24 links 0.14 m long 0.75-0.95 m over the deck, in a swag lowest at its middle, no collision
    const links = flat.filter((q) => Math.abs(q.s[0] - 0.04) < 1e-9 && Math.abs(q.s[1] - 0.04) < 1e-9 && Math.abs(q.s[2] - 0.14) < 1e-9 && Math.abs(q.c[0] - 108.9) < 1e-6);
    expect(links).toHaveLength(24);
    for (const q of links) {
      expect(q.c[2]).toBeGreaterThan(A8_OPEN_EDGE[0]);
      expect(q.c[2]).toBeLessThan(A8_OPEN_EDGE[1]);
      expect(q.c[1] - 0.02 - A8_H.gallery).toBeGreaterThanOrEqual(0.75 - 0.03);
      expect(q.c[1] - 0.02 - A8_H.gallery).toBeLessThanOrEqual(0.95 + 1e-6);
    }
    const lowest = links.reduce((m, q) => (q.c[1] < m.c[1] ? q : m));
    expect(Math.abs(lowest.c[2] - (A8_OPEN_EDGE[0] + A8_OPEN_EDGE[1]) / 2)).toBeLessThan(0.3);
    // the lip is untouched: the one manual ledge stays the only grip and the leg-up still finds it
    expect(anchors.ledges.filter((l) => inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3) && l.piece === 0)).toHaveLength(1);
    // the accent slots (82) under the slab's front: along the north front and the return's
    const accent = kitIn.filter((i) => i.piece === 'ledSlot' && i.group === 82);
    expect(accent.map((i) => i.yaw === 0)).toEqual([true, true, false, false]);
  });

  it("the stairs' rails (visual skins; the open sides' collision rail is tested below): the public flight has a brass top rail 1.0 m and a steel mid rail 0.5 m over the nosing line on both sides, pitched like the ramp, a stringer, balusters and posts; the office flight a brass rail 0.9 m on both walls", () => {
    const pitch = -Math.atan2(A8_H.gallery, 27 * 0.285);
    const pub = pitched.filter((q) => Math.abs(q.yaw) < 1e-9);
    // per side: top rail, mid rail, stringer
    expect(pub).toHaveLength(6);
    for (const q of pub) {
      expect(q.pitch).toBeCloseTo(pitch, 6);
      expect(q.s[2]).toBeCloseTo(hyp2(27 * 0.285, A8_H.gallery), 6);
      expect([130.47, 131.73].some((x) => Math.abs(q.c[0] - x) < 1e-6)).toBe(true);
      expect(q.c[2]).toBeCloseTo(A8_PUBLIC_STAIR.foot + (27 * 0.285) / 2, 6);
    }
    // heights over the nosing line at the flight's middle (the line is at half the rise there)
    const above = pub.map((q) => Math.round((q.c[1] - A8_H.gallery / 2) * 100) / 100).sort((a, c) => a - c);
    expect(above).toEqual([-0.1, -0.1, A8_RAIL_LIFT.mid, A8_RAIL_LIFT.mid, A8_RAIL_LIFT.top, A8_RAIL_LIFT.top]);
    // balusters and posts: thin vertical skins on the two edges
    const verticals = flat.filter((q) => (q.c[0] < 130.6 || q.c[0] > 131.6) && q.c[0] > 130.4 && q.c[0] < 131.8 && q.c[2] > 67.3 && q.c[2] < 75 && q.s[1] > 0.5 && q.s[1] < 1.2 && q.s[0] < 0.05 && q.s[2] < 0.05);
    expect(verticals.length).toBeGreaterThanOrEqual(2 * 18);
    // the office flight: the wall rails (x 134.5-142.2 along z 71.2, x 135.2-142.2 along z 70.03)
    const off = pitched.filter((q) => Math.abs(q.yaw - Math.PI / 2) < 1e-9);
    expect(off).toHaveLength(2);
    for (const q of off) expect(q.pitch).toBeCloseTo(pitch, 6);
    const offZ = off.map((q) => q.c[2]).sort((a, c) => a - c);
    expect(offZ[0]).toBeCloseTo(A8_OFFICE_STAIR.z0 + 0.07, 6);
    expect(offZ[1]).toBeCloseTo(71.18, 6);
    const longRail = off.find((q) => Math.abs(q.c[2] - 71.18) < 1e-6)!;
    expect(longRail.c[1] - A8_H.gallery / 2).toBeCloseTo(A8_RAIL_LIFT.wall, 6);
    // the rails stand outside the 1.2 m stair: the body's 0.6 m keeps its clearance each side (the public flight's rails 3 cm off its edge, the walls' 2-5 cm)
    expect(131.73 - 131.7).toBeLessThanOrEqual(0.05);
    expect(130.5 - 130.47).toBeLessThanOrEqual(0.05);
  });

  it("the counters and the night desk dressing: oak back panels over the boxes' backs, end caps, brass stems carrying the three counter lamps (1.21 to 1.6) and the desk lamp (0.76 to 1.0)", () => {
    for (const [x, z] of [[121.0, 65.9], [124.8, 65.9], [125.6, 61.5]] as const) {
      const stem = flat.find((q) => Math.abs(q.c[0] - x) < 1e-6 && Math.abs(q.c[2] - z) < 1e-6 && Math.abs(q.s[0] - 0.04) < 1e-9 && Math.abs(q.s[1] - 0.37) < 1e-9)!;
      expect(stem, `stem at ${x}, ${z}`).toBeDefined();
      expect(top(stem)).toBeCloseTo(1.6, 9);
      expect(stem.c[1] - stem.s[1] / 2).toBeCloseTo(1.23, 9);
    }
    const stemD = flat.find((q) => Math.abs(q.c[0] - 128.5) < 1e-6 && Math.abs(q.c[2] - 70.4) < 1e-6 && Math.abs(q.s[1] - 0.22) < 1e-9)!;
    expect(stemD).toBeDefined();
    expect(top(stemD)).toBeCloseTo(1.0, 9);
    // the lamps the stems carry are the greybox's (their fixtures' feet are the stems' tops)
    for (const [x, z, y] of [[121.0, 65.9, 1.6], [124.8, 65.9, 1.6], [125.6, 61.5, 1.6], [128.5, 70.4, 1.0]] as const) expect(lamps.some((l) => Math.abs(l.x - x) < 1e-6 && Math.abs(l.z - z) < 1e-6 && Math.abs(l.y - y) < 1e-6)).toBe(true);
    // the counter tops: the stems start over the 1.2 m solid
    expect(top(mine.find((q) => q.collide && Math.abs(q.c[0] - 120) < 1e-6 && Math.abs(q.c[2] - 65.87) < 1e-6)!)).toBeCloseTo(1.2, 9);
  });

  it("the grille wall: a stepped stone surround (0.3 m) round the opening with a keystone and a cornice shelf over the sign, two brass bar panels (nine bars each between stiles, three rails, over black) either side, a brass threshold in the opening; the lobby face a steel surround 0.25 m with a hazard strip; the gate's own leaf and lock are the door system's", () => {
    // jambs: 0.3 m stone from the floor to 3.3
    expect(flat.filter((q) => Math.abs(q.s[2] - 0.3) < 1e-6 && Math.abs(q.s[1] - 3.3) < 1e-6 && Math.abs(q.c[0] - 133.805) < 1e-6)).toHaveLength(2);
    // bars: 2 bays x 9 bars (0.025 x 2.78) and the frames
    const bars = flat.filter((q) => Math.abs(q.s[2] - 0.025) < 1e-9 && Math.abs(q.s[1] - 2.78) < 1e-9 && q.c[0] > 133.7 && q.c[0] < 133.8);
    expect(bars).toHaveLength(18);
    for (const { bars: [a, e] } of A8_BAYS) expect(bars.filter((q) => q.c[2] > a && q.c[2] < e)).toHaveLength(9);
    for (const q of bars) expect(q.c[2] > 59.5 && q.c[2] < 64.5 && !(q.c[2] > 60.8 && q.c[2] < 63.2)).toBe(true);
    // the bay's backing is black and fills z 59.55-61.1 / 62.9-64.45 (the dado's stiles are cut out there)
    for (const { fill } of A8_BAYS) expect(flat.filter((q) => Math.abs(q.s[2] - (fill[1] - fill[0])) < 1e-6 && Math.abs(q.s[1] - 3.05) < 1e-9 && Math.abs(q.s[0] - 0.03) < 1e-9 && q.c[0] > 133.8 && Math.abs(q.c[2] - (fill[0] + fill[1]) / 2) < 1e-6)).toHaveLength(1);
    // a threshold in the opening, a few mm proud
    const thresh = flat.find((q) => Math.abs(q.c[2] - 62.0) < 1e-6 && Math.abs(q.s[2] - 1.8) < 1e-9 && top(q) < 0.02 && q.s[0] > 0.29)!;
    expect(thresh).toBeDefined();
    // the lobby surround
    expect(flat.filter((q) => Math.abs(q.s[2] - 0.25) < 1e-6 && Math.abs(q.s[1] - 3.25) < 1e-6 && q.c[0] > 134.1 && q.c[0] < 134.3)).toHaveLength(2);
    expect(flat.filter((q) => Math.abs(q.s[0] - 0.03) < 1e-9 && Math.abs(q.s[2] - 0.15) < 1e-9 && Math.abs(q.s[1] - 0.08) < 1e-9 && q.c[0] > 134.2 && q.c[0] < 134.3).length).toBeGreaterThanOrEqual(5);
    // the gate stays a locked mains-and-egress door of the same size
    const gd = doorAt(A8_GRILLE);
    expect(gd.width).toBeCloseTo(1.8, 9);
    expect([gd.height, gd.locked]).toEqual([3.0, true]);
  });

  it("the lighting board and the strip: a steel cabinet 1.2 x 1.8 m on the north wall with two doors, hinges, twelve vent slats, a yellow plate with the red rotary knob at x 127, three indicator squares, a label, a hazard square and a conduit; beams under the gallery's soffit; nothing stands out of the wall's face past 12 cm at the board", () => {
    const cabinet = flat.find((q) => Math.abs(q.s[0] - 1.2) < 1e-6 && Math.abs(q.s[1] - 1.8) < 1e-6 && Math.abs(q.s[2] - 0.03) < 1e-9 && q.c[2] > 77.7)!;
    expect(cabinet).toBeDefined();
    expect(cabinet.c[0]).toBeCloseTo(127.0, 6);
    expect(flat.filter((q) => Math.abs(q.s[0] - 0.4) < 1e-9 && Math.abs(q.s[1] - 0.03) < 1e-9 && q.c[2] > 77.6 && q.c[2] < 77.7 && q.c[1] < 0.7)).toHaveLength(12);
    const rotary = flat.find((q) => Math.abs(q.s[0] - 0.12) < 1e-9 && Math.abs(q.s[1] - 0.12) < 1e-9 && q.c[2] > 77.6)!;
    expect(rotary).toBeDefined();
    expect(rotary.c[0]).toBeCloseTo(127.0, 9);
    expect(rotary.c[1]).toBeCloseTo(0.9, 9);
    // the knob stays 3 cm behind the device (z 77.6): its front face is at z 77.63
    expect(rotary.c[2] - rotary.s[2] / 2).toBeGreaterThanOrEqual(77.6 + 0.03 - 1e-6);
    // the board's device is the greybox's, at the cabinet's centre
    expect(part.devices[A8_BOARD]).toMatchObject({ x: 127.0, y: 0.9, z: 77.6 });
    // the hide spot west of it (126.4, 76.5) and the walk beside the strip are clear (above)
    expect(flat.filter((q) => Math.abs(q.s[1] - 0.04) < 1e-9 && Math.abs(top(q) - A8_H.slab) < 1e-9 && q.s[2] > 2.5).length).toBeGreaterThanOrEqual(8);
  });

  it("the security office: painted walls on a dark dado with a rail and a black skirting, a cove, a ceiling grid with eight hangers for the two panels, eleven screens round the console (the device's place bare), the console desk's worktop, front and ends, a notice board with notes, a clock; the officer's post and the console's reach are unchanged", () => {
    // eleven bezels: eight 0.55 x 0.32 and three 0.6 x 0.35 on the east wall
    expect(flat.filter((q) => Math.abs(q.s[2] - 0.55) < 1e-9 && Math.abs(q.s[1] - 0.32) < 1e-9 && Math.abs(q.s[0] - 0.03) < 1e-9)).toHaveLength(8);
    expect(flat.filter((q) => Math.abs(q.s[2] - 0.6) < 1e-9 && Math.abs(q.s[1] - 0.35) < 1e-9 && Math.abs(q.s[0] - 0.03) < 1e-9)).toHaveLength(3);
    // hangers: 8 rods 0.02 x 0.12 (7.25 to 7.37) at the panels' corners
    expect(flat.filter((q) => Math.abs(q.s[0] - 0.02) < 1e-9 && Math.abs(q.s[2] - 0.02) < 1e-9 && Math.abs(q.s[1] - (A8_H.office - 0.03 - 7.25)) < 1e-9)).toHaveLength(8);
    // the desk: a worktop skin 1 cm over the 0.75 m box, the officer's feet at 4.4 and the console device 0.4 m from the desk's front
    const work = flat.find((q) => Math.abs(q.c[1] - (A8_H.gallery + 0.755)) < 1e-6 && Math.abs(q.s[0] - 0.55) < 1e-9 && Math.abs(q.s[2] - 2.0) < 1e-9)!;
    expect(work).toBeDefined();
    expect(part.devices[A8_CONSOLE]).toMatchObject({ x: 143.7, y: 5.6, z: 74.7 });
    expect(A8_OFFICER_POST.y).toBe(A8_H.gallery);
    // the screens stay out of the console's hole (z 74.2-75.2 from the desk top to 5.9) and the medkit's (x 137.85-139.15)
    expect(skinsIn(143.8, 143.85, 5.2, 5.9, 74.2, 75.2)).toEqual([]);
    expect(skinsIn(137.85, 139.15, A8_H.gallery + 0.05, 6.9, 77.5, 77.75)).toEqual([]);
    // the door architraves: the office door's (west face) and the stair-top door's (south face), 0.12 m
    expect(flat.filter((q) => q.c[0] > 134.15 && q.c[0] < 134.2 && Math.abs(q.s[2] - 0.1) < 1e-9 && Math.abs(q.s[1] - 2.2) < 1e-9)).toHaveLength(2);
  });

  it('the office stair and its stairwell: painted walls (the flight, the block, the landings), the foot and stair-top doors\' architraves, a brass handrail 0.9 m over the nosing line on each wall with a bracket every 1.3 m; the push bar and the stair-top door\'s places are bare', () => {
    expect(flat.filter((q) => Math.abs(q.s[0] - 0.04) < 1e-9 && Math.abs(q.s[1] - 0.08) < 1e-9 && Math.abs(q.s[2] - 0.05) < 1e-9).length).toBeGreaterThanOrEqual(0);
    const brackets = flat.filter((q) => Math.abs(q.s[0] - 0.04) < 1e-9 && Math.abs(q.s[1] - 0.08) < 1e-9 && q.c[0] > 134.5 && q.c[0] < 142.5 && q.c[2] > 69.9 && q.c[2] < 71.3);
    expect(brackets.length).toBeGreaterThanOrEqual(7);
    // the push bar (135.8, 1.1, 71.2) and the door: bare
    expect(skinsIn(135.5, 136.1, 0.85, 1.35, 71.1, 71.24).map((q) => q.c)).toEqual([]);
    expect(skinsIn(142.6, 143.8, A8_H.gallery + 0.05, 6.5, 71.2, 71.3).map((q) => q.c)).toEqual([]);
    // the stairwell is still a closed block south of the flight and the flight's walls: the greybox boxes are the same
    expect(mine.filter((q) => q.collide && q.c[2] > 68 && q.c[2] < 70 && q.s[1] > 7 && q.c[0] > 135 && q.c[0] < 143)).toHaveLength(1);
  });

  it("the vault lobby: steel plate walls with seams every 1.2 m, a surround and a maker's plate on the vault door (jambs 0.3 m, six bolts a jamb), ceiling ribs clear of the beam header, hangers for both panels, two yellow lines at the beam line; the beam curtain's piers and header carry plates, a hazard band and 36 chevrons; the time locks carry cases, dials and keypads", () => {
    // the vault door's jambs on the lobby face: two 0.3 x 2.5 plates
    expect(flat.filter((q) => Math.abs(q.s[2] - 0.3) < 1e-6 && Math.abs(q.s[1] - 2.5) < 1e-6 && Math.abs(q.c[0] - 145.805) < 1e-6)).toHaveLength(2);
    expect(flat.filter((q) => Math.abs(q.s[0] - 0.03) < 1e-9 && Math.abs(q.s[2] - 0.08) < 1e-9 && Math.abs(q.s[1] - 0.08) < 1e-9 && q.c[0] > 145.7 && q.c[0] < 145.8)).toHaveLength(12);
    // the ribs: none across the header (x 139.55-140.45)
    const ribs = flat.filter((q) => Math.abs(q.s[0] - 0.14) < 1e-9 && Math.abs(q.s[1] - 0.04) < 1e-9 && Math.abs(q.s[2] - 11.7) < 1e-9);
    expect(ribs.length).toBeGreaterThanOrEqual(6);
    for (const q of ribs) expect(Math.abs(q.c[0] - 140)).toBeGreaterThan(0.4);
    // the beam curtain: 36 chevrons, plates on the piers (four broad faces) and the header's two faces
    expect(flat.filter((q) => Math.abs(q.s[0] - 0.03) < 1e-9 && Math.abs(q.s[1] - 0.15) < 1e-9 && Math.abs(q.s[2] - 0.3) < 1e-9 && Math.abs(q.c[0] - 140) < 0.3)).toHaveLength(36);
    expect(flat.filter((q) => Math.abs(q.s[1] - 4.5) < 1e-9 && Math.abs(q.s[0] - 0.03) < 1e-9 && Math.abs(q.c[0] - 140) < 0.3)).toHaveLength(4);
    expect(flat.filter((q) => Math.abs(q.s[2] - 11.0) < 1e-9 && Math.abs(q.s[0] - 0.03) < 1e-9 && Math.abs(q.c[0] - 140) < 0.3 && Math.abs(q.s[1] - 0.6) < 1e-9)).toHaveLength(2);
    // the beams, their panel and the throw are the greybox's: nothing within the beam gaps' lens heads (x 139.7-140.3, the pier faces z 56.5 and 67.5, y 0.2-1.6)
    expect(skinsIn(139.7, 140.3, 0.05, 2.0, 56.501, 67.499).map((q) => q.c)).toEqual([]);
    // the time locks: a dial and a case at each (the dial 0.4 square at y 1.0-1.4)
    expect(sized(0.4, 0.4).filter((q) => q.c[2] > 67 && q.c[2] < 68 && Math.abs(q.c[0] - A8_T1_AT.x) < 1e-6)).toHaveLength(1);
    expect(sized(0.4, 0.4).filter((q) => q.c[0] > 145 && q.c[0] < 146 && Math.abs(q.c[2] - A8_T2_AT.z) < 1e-6)).toHaveLength(1);
    expect(sized(0.6, 1.05)).toHaveLength(2);
  });

  it("the vault: plate on its west wall with the door's inner surround, three ribs under the roof, end caps on the deposit walls' open ends (x 149.75)", () => {
    expect(flat.filter((q) => Math.abs(q.s[0] - 0.14) < 1e-9 && Math.abs(q.s[1] - 0.04) < 1e-9 && Math.abs(q.s[2] - 7.7) < 1e-9)).toHaveLength(3);
    expect(flat.filter((q) => Math.abs(q.s[2] - 0.6) < 1e-9 && Math.abs(q.s[1] - 2.4) < 1e-9 && Math.abs(q.c[0] - 149.765) < 1e-6)).toHaveLength(2);
    expect(flat.filter((q) => Math.abs(q.s[2] - 0.3) < 1e-6 && Math.abs(q.s[1] - 2.5) < 1e-6 && Math.abs(q.c[0] - 146.195) < 1e-6)).toHaveLength(2);
  });

  it('the lamp fittings: three chandeliers on twelve rods to brass roses at 9.0 with rings and finials, a plate behind each gallery wall light, coffer beams on the hall ceiling every 3 m / 3.45 m; no lamp added, none moved (the tuned bands and the light frame hold)', () => {
    expect(flat.filter((q) => Math.abs(q.s[0] - 0.02) < 1e-9 && Math.abs(q.s[2] - 0.02) < 1e-9 && Math.abs(q.s[1] - 1.1) < 1e-9 && Math.abs(top(q) - A8_H.hall) < 1e-9)).toHaveLength(12);
    expect(flat.filter((q) => Math.abs(q.s[0] - 0.4) < 1e-9 && Math.abs(q.s[2] - 0.4) < 1e-9 && Math.abs(q.s[1] - 0.03) < 1e-9 && Math.abs(top(q) - A8_H.hall) < 1e-9)).toHaveLength(3);
    expect(flat.filter((q) => Math.abs(q.s[0] - 0.28) < 1e-9 && Math.abs(q.s[1] - 0.58) < 1e-9 && Math.abs(q.c[2] - 77.735) < 1e-6)).toHaveLength(3);
    expect(flat.filter((q) => Math.abs(q.s[1] - 0.04) < 1e-9 && Math.abs(top(q) - A8_H.hall) < 1e-9 && Math.max(q.s[0], q.s[2]) > 27)).toHaveLength(9 + 7);
    // the 16 greybox lamps, by group: 7 / 3 / 2 / 4, each still at the tuned point and grouped
    expect(lamps.filter((l) => l.group === 81)).toHaveLength(7);
    expect(lamps.filter((l) => l.group === 82)).toHaveLength(3);
    expect(lamps.filter((l) => l.group === 83)).toHaveLength(2);
    expect(lamps.filter((l) => l.group === 84)).toHaveLength(4);
    for (const l of lamps) {
      expect(l.electric).toBe(true);
      expect(l.destructible).toBe(true);
    }
    // the light frame's levels (ctcourseLight runs them too): the front and the grille approach lit, dark when 81 is cut, the pockets dark
    expect(tuned['A8 front']).toBeGreaterThanOrEqual(0.6);
    expect(tuned['A8 front cut']).toBeLessThanOrEqual(0.24);
    expect(tuned['A8 vestibule']).toBeLessThanOrEqual(0.22);
  });

  it("the public stair's open sides have a 1.1 m rail (S8-check polish 10): thirteen kit.handrail segments a side 0.05 m outside the flight from the fourth tread to the gallery (twelve whole segments and a shorter last one), each at least 1.1 m over the walking line, no gap, meeting the balustrade's ends, invisible, noLedge, the flight and its foot left open", () => {
    const ps = A8_PUBLIC_STAIR;
    const len = 27 * 0.285;
    const line = (z: number): number => (A8_H.gallery * (z - ps.foot)) / len;
    const { x: lines, from, to, seg, h } = A8_STAIR_RAIL;
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBeCloseTo(ps.x0 - 0.05, 9);
    expect(lines[1]).toBeCloseTo(ps.x1 + 0.05, 9);
    // twelve whole segments and a shorter last one to the head (P4-1: the rail starts on the fourth tread, so the run is not a whole number of segments)
    expect(Math.floor((to - from) / seg + 1e-9)).toBe(12);
    expect(Math.ceil((to - from) / seg - 1e-9)).toBe(13);
    const lastLen = to - from - 12 * seg;
    expect(lastLen).toBeGreaterThan(0.1);
    expect(lastLen).toBeLessThan(seg);
    expect(to).toBe(75);
    // the fourth tread (P4-1): the rail starts where the fourth tread does (z 67.3 + 3 x 0.285 = 68.155), 5 mm before it on the 5 cm grid, so the first three treads are open
    expect(from).toBeLessThanOrEqual(ps.foot + 3 * 0.285 + 0.05);
    expect(from).toBeGreaterThanOrEqual(ps.foot + 3 * 0.285 - 0.05);
    expect(stairRail).toHaveLength(26);
    expect(part.register.find((r) => r.id === 'A8-19')!.solids).toBe(26);
    expect(stairRail.every((p) => p.collide && p.visible === false && p.noLedge === true && Math.abs(p.yaw) < 1e-9 && Math.abs(p.pitch) < 1e-9)).toBe(true);
    const bodyHits = (x: number, y: number, z: number, list: readonly BoxPiece[] = stairRail, r = MOVEMENT.radius): string | null => {
      for (const p of list) {
        if (bottom(p) >= y + 1.7 || top(p) <= y + 0.3) continue;
        if (hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r) return `box (${p.c.map((v) => v.toFixed(2)).join(', ')})`;
      }
      return null;
    };
    // the balustrade's two ends at the stair head (A8-2): the north front stops at x 130.5 and resumes at x 131.7
    const front = mine.filter((p) => p.collide && Math.abs(p.c[2] - 75.1) < 1e-6 && Math.abs(bottom(p) - A8_H.gallery) < 1e-6 && Math.abs(p.s[1] - A8_H.balustrade) < 1e-6);
    for (const [k, x] of lines.entries()) {
      const side = stairRail.filter((p) => Math.abs(p.c[0] - x) < 1e-6).sort((p, q) => p.c[2] - q.c[2]);
      expect(side, `side ${k}`).toHaveLength(13);
      let z: number = from;
      for (const p of side) {
        // a 0.1 m box on the line (its face stops on the flight's open edge), one segment long, from the low end's floor line
        expect(p.s[0]).toBeCloseTo(0.1, 9);
        expect(p.s[2]).toBeCloseTo(Math.min(seg, to - z), 6);
        if (k === 0) expect(p.c[0] + p.s[0] / 2, 'the box face is never inside the flight').toBeLessThanOrEqual(ps.x0 + 1e-9);
        else expect(p.c[0] - p.s[0] / 2, 'the box face is never inside the flight').toBeGreaterThanOrEqual(ps.x1 - 1e-9);
        expect(p.c[2] - p.s[2] / 2, 'no gap at the low end').toBeCloseTo(z, 6);
        const hi = p.c[2] + p.s[2] / 2;
        expect(bottom(p), 'from the floor line at the low end').toBeCloseTo(line(z), 6);
        expect(top(p) - line(hi), 'the rail height over the walking line at the high end').toBeGreaterThanOrEqual(h - 1e-6);
        z = hi;
      }
      expect(z, `side ${k}: the head`).toBeCloseTo(to, 6);
      // no gap: at every z from the fourth tread to the gallery a rail box stands on the line across 0.3 m to 1.0 m over the walking line
      for (let sz = from + 0.025; sz < to; sz += 0.05) for (const dy of [0.3, 0.6, 1.0]) expect(side.some((p) => Math.abs(sz - p.c[2]) <= p.s[2] / 2 + 1e-9 && Math.abs(line(sz) + dy - p.c[1]) <= p.s[1] / 2 + 1e-9), `side ${k} z ${sz.toFixed(3)} dy ${dy}`).toBe(true);
      // the head meets the balustrade's end (it stands at x 130.5 / 131.7 on z 75.0-75.2, 1.2 m over the gallery): no gap
      const bal = front.find((p) => (k === 0 ? Math.abs(p.c[0] + p.s[0] / 2 - ps.x0) < 1e-6 : Math.abs(p.c[0] - p.s[0] / 2 - ps.x1) < 1e-6))!;
      expect(bal, `side ${k}: the balustrade's end`).toBeDefined();
      const head = side[side.length - 1]!;
      const gapX = Math.max(head.c[0] - head.s[0] / 2 - (bal.c[0] + bal.s[0] / 2), bal.c[0] - bal.s[0] / 2 - (head.c[0] + head.s[0] / 2), 0);
      const gapZ = Math.max(bal.c[2] - bal.s[2] / 2 - (head.c[2] + head.s[2] / 2), 0);
      expect(hyp2(gapX, gapZ), `side ${k}: the gap at the head`).toBeLessThan(0.05);
      expect(top(head)).toBeGreaterThan(bottom(bal));
      expect(bottom(head)).toBeLessThan(top(bal));
    }
    // the flight is not narrowed or blocked: a body walking its centre line and both edge lanes 0.3 m in, the whole flight, meets no rail
    for (let t = 0; t <= len + 1e-9; t += 0.1) {
      const z = ps.foot + t;
      for (const x of [(ps.x0 + ps.x1) / 2, ps.x0 + 0.3 + 0.01, ps.x1 - 0.3 - 0.01]) expect(bodyHits(x, line(z), z), `lane x ${x.toFixed(2)} at z ${z.toFixed(2)}`).toBeNull();
    }
    // the foot stays open to step on (P4-1): a body walks in from either side to the centre of the first and of the second tread (a 0.6 m body clears the rail's first box by 0.3 m or more)
    const tread = (i: number): number => ps.foot + (i - 0.5) * 0.285;
    const sides = [[ps.x0 - 1.0, (ps.x0 + ps.x1) / 2], [ps.x1 + 1.0, (ps.x0 + ps.x1) / 2]] as const;
    for (const i of [1, 2]) for (const [x0, x1] of sides) for (let k = 0; k <= 10; k++) expect(bodyHits(x0 + ((x1 - x0) * k) / 10, line(tread(i)), tread(i)), `foot walk onto tread ${i} at z ${tread(i).toFixed(3)}, x ${(x0 + ((x1 - x0) * k) / 10).toFixed(2)}`).toBeNull();
    expect(tread(2) + MOVEMENT.radius, 'the second tread centre is clear of the rail start').toBeLessThanOrEqual(from + 1e-9);
    // the third tread is still shut from the side: the same walk to its centre meets the rail on both sides (teeth against a rail started too late)
    for (const [x0, x1] of sides) expect(Array.from({ length: 11 }, (_, k) => bodyHits(x0 + ((x1 - x0) * k) / 10, line(tread(3)), tread(3))).some((h) => h !== null), 'the third tread is railed from the side').toBe(true);
    // the rest of the open sides is shut: a body 0.1 m outside the edge at the walking line meets the rail from the fourth tread up; without the rail boxes it meets nothing (teeth)
    const without = solid.filter((p) => !stairRail.includes(p));
    for (const x of [ps.x0 - 0.1, ps.x1 + 0.1]) {
      for (let sz = from + 0.3; sz < to - 0.3 + 1e-9; sz += 0.3) {
        expect(bodyHits(x, line(sz), sz), `step off at x ${x.toFixed(2)}, z ${sz.toFixed(2)}`).not.toBeNull();
        expect(bodyHits(x, line(sz), sz, without), `step off at x ${x.toFixed(2)}, z ${sz.toFixed(2)} without the rail`).toBeNull();
      }
    }
    // the kit's balustrade over each box: twenty-six `handrail` modules on the gallery strip (82) along the two lines
    const pieces = kitIn.filter((i) => i.piece === 'handrail' && lines.some((x) => Math.abs(i.x - x) < 1e-6));
    expect(pieces).toHaveLength(26);
    for (const i of pieces) expect(i.group).toBe(82);
  });

  it("the stair's rails leave the lanes and the lip alone: x 132.25 (A8-D14) is clear from z 62 to 75, N2's W1 leg past the stair's foot is walkable, soloJumpThreats for the gallery's co-op lip is still empty with the rails in the solid list, and a crate still bites", () => {
    expect(solid.filter((p) => stairRail.includes(p))).toHaveLength(26);
    expect(walkBlocked(132.25, 76.0, 132.25, 62.0)).toBeNull();
    for (let z = 62; z <= 75 + 1e-9; z += 0.1) expect(blockedAt(132.25, z)).toEqual([]);
    // N2's W1 -> G leg (the TALK -> W1 leg is the guard tests' A* walk past the night desk), the stair's foot at W1 (129.6, 66.5) 0.9 m west of the flight and 0.8 m south of the first rail box
    expect(walkPath([[129.6, 66.5], [133.2, 62.0]])).toBeNull();
    expect(walkPath([[129.6, 69.0], [129.6, 66.5]])).toBeNull();
    expect(walkPath([[129.6, 66.5], [129.6, 67.3], [131.1, 67.3]])).toBeNull();
    expect(soloJumpThreats(solid, LIP)).toEqual([]);
    const crate: BoxPiece = { c: [109 + 2.5 + 0.5, 0.9, 68.25], s: [1, 1.8, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true };
    expect(soloJumpThreats([...solid, crate], LIP).length).toBeGreaterThan(0);
  });
});
