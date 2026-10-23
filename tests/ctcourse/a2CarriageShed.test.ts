/**
 * A2 the Carriage Shed (marlow-final slice 2; set doc `docs/marlow-final/sets/a2CarriageShed.md`): the set's own cases. The
 * staging's loading edge is the one co-op lip (in the band, no solo jump reaches it, the leg-up from the mark takes it), every
 * lamp is on its circuit and the isolator darkens the neck (the tuned light levels) and brings it back, the timed gate runs its
 * window and refuses a press while it re-arms, one player alone cannot press and cross, the shunter is an armed `grunt` on a
 * walkable timed loop inside the lure range, the steps validate and read per player, the role claim is cabinet 1. The map-wide
 * frames (`tests/ctcourse.test.ts`, `tests/ctcourseLight.test.ts`) run the contract, the register and the light bands over this
 * part too. The last block is the dressing (slice 2 step 5): the greybox pinned, the east stair's underside solid (S2-check should-fix
 * 2), hand-built skins out of the light shapes, the staging switch's post, the budgets, the props' boxes and keep-clear rules, the routes
 * left clear, every kit glow on its circuit. The walk482 block (X2b / X3) is last of the set's own cases: the neck's two lanes behind four closures, the two
 * overwatch guards on the staging deck and their static sight rays (they see the lit crossing and the lane mouths, never a taught dark wait), and road 2's
 * east wheel stop removed from the L2 door's approach.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/ai/enemyDefs';
import { PatrolWalker } from '../../src/ai/patrol';
import { generateLedges, findJumpTarget, type Ledge } from '../../src/world/anchors';
import { LevelBuilder, type BoxPiece } from '../../src/world/levelBuilder';
import { surfaceAt } from '../../src/world/surfaces';
import { MOVEMENT, TEAM } from '../../src/config/movement';
import { COURSE_TEXT_MAX } from '../../src/config/course';
import { layoutKnownIds, validateCourse, type IsolatorGate } from '../../src/game/course/courseDef';
import { CourseState, REFUSE_ISO_REARM } from '../../src/game/course/courseState';
import { hyp2 } from '../../src/core/mathx';
import { buildCtcourse, COOP_LIPS, LIGHT_SPOTS } from '../../src/world/maps/ctcourse';
import { coopDeck, COOP_BAND, GREY_KEEP_CLEAR } from '../../src/world/maps/ctcourseGreybox';
import { kitTriangles } from '../../src/world/kit/facilityKit';
import { FacilityProps, propGlows, PROP_OWN_SUPPLY, propCollisionBox, propDraws, propToWorld, propTriangles, PROP_FOOTPRINT, PROP_HUNG, PROP_SET_BUDGET, type PropPlacement, type PropReport } from '../../src/world/props/facilityProps';
import { CANON_MIN_THICK } from '../../src/voxel/lightShapes';
import {
  A2_BACK_DOOR,
  A2_CAB1,
  A2_CAB2,
  A2_CABIN,
  A2_CLOSE_N,
  A2_CLOSE_S,
  A2_CLOSE_X,
  A2_CROSS_Z,
  A2_CABIN_DOOR,
  A2_DECK,
  A2_EAST1_FLAG,
  A2_EAST_FLAG,
  A2_EAST_ZONE,
  A2_GATE,
  A2_GATE_AT,
  A2_ISO_1,
  A2_ISO_2,
  A2_LIP_X,
  A2_MARK,
  A2_NECK_GROUP,
  A2_PASS_WAIT,
  A2_RAKES,
  A2_ROADS,
  A2_SHUNTER,
  A2_SHUNTER_FACES,
  A2_SHUNTER_ROUTE,
  A2_SHUNTER_WAITS,
  A2_STAIR_RAIL,
  A2_TRACK_X,
  A2_WATCH_AT,
  A2_WATCH_E,
  A2_WATCH_W,
  STAIR_FILL,
} from '../../src/world/maps/ctcourseSets/a2CarriageShed';
import { checkSetPart, inBox, OBJECTIVE_ID_MAX, registerSum, SET_BOX, SET_GUARDS_MAX, setGroups } from '../../src/world/maps/ctcourseSets/types';
import { circuitOf, LURE_RANGE, marlowCourseGroups, MARLOW_POCKETS, SILENT_PACE } from '../../src/world/lighting/marlowCircuits';
import { MARLOW_LEVEL } from '../../src/world/lighting/levels';
import { soloJumpThreats } from '../helpers/soloJumpReach';

const b = new LevelBuilder();
const built = buildCtcourse(b);
const part = built.parts[1]!;
const lay = built.layout;
const course = lay.course!;
const def = course.def;
const range = built.ranges.a2CarriageShed;
const mine = b.boxes.slice(range.boxes[0], range.boxes[1]);
/** The greybox as S2 built it (slice 2 steps 2-4) with walk482's two changes: its 61 boxes (30 solids, the east stair's visual risers and ramp collider among them: S2's 58 less road 2's east wheel stop (X3) and plus the four neck closures (X2b)), 15 lamps, 2 doors, the manual ledge. The dressing is appended after. */
const GREY = { boxes: 61, solids: 30, lights: 15, doors: 2, anchors: 1, checksum: 11640.39830075869 };
const grey = mine.slice(0, GREY.boxes);
const dressing = mine.slice(GREY.boxes);
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
const box = SET_BOX.a2CarriageShed[0]!;
const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && inBox(box, l.x, l.z));
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const LIP = part.lips[0]!;
/** The solid boxes whose band (floor to 1.7 m) is within `r` of (x, z): what a body walking there touches. */
const blockedAt = (x: number, z: number, r = MOVEMENT.radius): string[] =>
  solid
    .filter((p) => p.c[1] - p.s[1] / 2 < 1.7 && top(p) > 0.15)
    .filter((p) => Math.hypot(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r)
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
/** A fresh course at set 2 with the two players at the given feet. */
function runAt(a: [number, number], c: [number, number]): CourseState {
  const s = new CourseState(def, course.consoles);
  s.startAt(2);
  s.setPlayer(0, a[0], 0, a[1], false);
  s.setPlayer(1, c[0], 0, c[1], false);
  s.update(1 / 60);
  return s;
}
const run = (s: CourseState, sec: number): void => {
  for (let t = 0; t < sec - 1e-9; t += 1 / 60) s.update(1 / 60);
};
const neckStep = def.objectives!.find((o) => o.id === 'a2-neck')!;
const backStep = def.objectives!.find((o) => o.id === 'a2-back')!;
const gate = part.bay.gates.find((g) => g.id === A2_GATE) as IsolatorGate;
const tuned = (JSON.parse(readFileSync('tests/ctcourse/a2CarriageShed.light.json', 'utf8')) as { levels: Record<string, number> }).levels;
/** The anchors the game builds over the whole map plus the helpers' manual ledges (the leg-up search reads both). */
const anchors = generateLedges(b.boxes, b.anchors);

describe('A2 the Carriage Shed: the part', () => {
  it('is built (not the stub) and passes the contract rules', () => {
    expect(part.id).toBe('a2CarriageShed');
    expect(part.stub).toBeUndefined();
    expect(checkSetPart(part)).toEqual([]);
  });

  it("every register row is an A2 row; the lamps, solids, doors and anchors they count are the builder's", () => {
    expect(part.register.every((r) => r.id.startsWith('A2-'))).toBe(true);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A2-1', 'A2-2', 'A2-3', 'A2-4', 'A2-5', 'A2-6', 'A2-7', 'A2-8', 'A2-9', 'A2-10', 'A2-11']));
    const sum = registerSum(part.register);
    expect(sum).toEqual(built.counts.sets.a2CarriageShed);
    // 15 lamps (LIGHTING-PLAN 3: shed 6, neck 4, cabin 1, staging 4), the cabin's two doors, the staging's one manual ledge; 27 greybox solids,
    // the east stair's fillers (A2-17) and the permit gate's box (A2-20) from the dressing
    expect(sum.lights).toBe(15);
    expect(sum.solids).toBe(GREY.solids + dressing.filter((p) => p.collide).length);
    expect(sum.doors).toBe(2);
    expect(sum.anchors).toBe(1);
    for (const r of part.register) expect(/[–—]/.test(r.element), r.id).toBe(false);
  });

  it('everything built lies inside the set box (0.3 m of wall slack) and under the hall roof', () => {
    const [x0, z0, x1, z1] = box;
    expect(mine.length).toBeGreaterThan(40);
    // (the pitched stair ramp and the yawed steps are the map-wide frame's: it folds the rotation in)
    for (const p of mine.filter((q) => Math.abs(q.yaw) < 1e-3 && Math.abs(q.pitch) < 1e-3)) {
      expect(p.c[0] - p.s[0] / 2, 'west').toBeGreaterThanOrEqual(x0 - 0.3);
      expect(p.c[0] + p.s[0] / 2, 'east').toBeLessThanOrEqual(x1 + 0.3);
      expect(p.c[2] - p.s[2] / 2, 'south').toBeGreaterThanOrEqual(z0 - 0.3);
      expect(p.c[2] + p.s[2] / 2, 'north').toBeLessThanOrEqual(z1 + 0.3);
      expect(top(p)).toBeLessThanOrEqual(10 + 1e-6);
    }
  });

  it('the roads, vans and wheel stops are the plan: six 10 x 2.6 x 3.4 noLedge vans on 5 m centres (2.4 m gaps), five 0.3 m stops (none at road 2 east end), gravel strips and a metal deck', () => {
    const vans = mine.filter((p) => p.collide && Math.abs(p.s[1] - 3.4) < 1e-6 && Math.abs(p.s[0] - 10) < 1e-6);
    expect(vans).toHaveLength(6);
    for (const v of vans) {
      expect(v.noLedge).toBe(true);
      expect(Math.abs(v.s[2] - 2.6)).toBeLessThan(1e-6);
      expect(A2_RAKES.some(([x0, x1]) => Math.abs(v.c[0] - (x0 + x1) / 2) < 1e-6)).toBe(true);
      expect(A2_ROADS.some((c) => Math.abs(v.c[2] - c) < 1e-6)).toBe(true);
    }
    // 2.4 m gaps and faces of 3.4 m (under the split gap's 3.6 m): no accidental split gap
    expect(A2_ROADS[1] - A2_ROADS[0] - 2.6).toBeCloseTo(2.4, 9);
    expect(anchors.splits.filter((s) => inBox(box, s.a.x, s.a.z))).toEqual([]);
    const stops = grey.filter((p) => p.collide && Math.abs(top(p) - 0.3) < 1e-6);
    expect(stops).toHaveLength(5);
    // road 2's east stop (x 68.6-69.4, z 9.2-10.8) is gone (X3): nothing 0.3 m tall stands east of x 66 in the L2 door's width (z 9.1-10.9)
    expect(stops.filter((p) => p.c[0] > 66 && p.c[2] > 9.1 && p.c[2] < 10.9)).toEqual([]);
    expect(stops.filter((p) => p.c[0] > 66).map((p) => p.c[2])).toEqual([A2_ROADS[0], A2_ROADS[2]]);
    expect(stops.filter((p) => p.c[0] < 40)).toHaveLength(3);
    // surfaces: ballast on each road, cess concrete, the deck chequer plate
    for (const c of A2_ROADS) expect(surfaceAt(b.surfaces, 41, 0, c, 'concrete')).toBe('gravel');
    expect(surfaceAt(b.surfaces, 41, 0, 7.5, 'concrete')).toBe('concrete');
    expect(surfaceAt(b.surfaces, 40, 4.4, 18.7, 'concrete')).toBe('metal');
  });
});

describe('A2 the Carriage Shed: the staging (the co-op lip, the leg-up)', () => {
  it('the one planned lip is the open loading edge x 31-35 at 4.4 m: in COOP_BAND, on COOP_LIPS, normal -z, 4 m long', () => {
    expect(part.lips.map((l) => l.id)).toEqual(['a2-stage-lip']);
    expect(LIP.y - LIP.floor).toBeCloseTo(A2_DECK.lip, 9);
    expect(LIP.y - LIP.floor).toBeGreaterThanOrEqual(COOP_BAND.min);
    expect(LIP.y - LIP.floor).toBeLessThanOrEqual(COOP_BAND.max);
    expect(COOP_LIPS).toContainEqual(LIP);
    expect(LIP.n.x).toBeCloseTo(0, 9);
    expect(LIP.n.z).toBeCloseTo(-1, 9);
    expect([LIP.a.x, LIP.b.x].sort((p, q) => p - q)).toEqual(A2_LIP_X);
    expect(LIP.a.z).toBeCloseTo(A2_DECK.z, 9);
    expect(A2_DECK.lip).toBeLessThanOrEqual(TEAM.relayMax);
  });

  it('no solo jump reaches the lip: soloJumpThreats is empty over every solid in the map (the vans, the cabin, the wheel stops included)', () => {
    expect(soloJumpThreats(solid, LIP)).toEqual([]);
  });

  it('the check has teeth: a 1.8 m crate on the walkway within the running jump threatens the lip, one at GREY_KEEP_CLEAR does not', () => {
    const crate = (gap: number): BoxPiece => ({ c: [33, 0.9, A2_DECK.z - gap - 0.5], s: [1, 1.8, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true });
    expect(soloJumpThreats([...solid, crate(2.5)], LIP).length).toBeGreaterThan(0);
    expect(soloJumpThreats([...solid, crate(GREY_KEEP_CLEAR)], LIP)).toEqual([]);
  });

  it('every block 1.9 m or taller is noLedge (vans, deck, screens, cabin, cabinets); the cabin and the cabinets all are', () => {
    for (const p of mine.filter((q) => Math.abs(q.yaw) < 1e-3 && Math.abs(q.pitch) < 1e-3)) {
      if (top(p) >= 1.9 && p.collide && Math.abs(p.pitch) < 1e-3) expect(p.noLedge, `box at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBe(true);
      const cabin = p.c[0] > 28 && p.c[0] < 32.2 && p.c[2] > 0.2 && p.c[2] < 5.2;
      if (cabin) expect(p.noLedge, `cabin box at (${p.c.join(', ')})`).toBe(true);
    }
    for (const p of mine.filter((q) => q.collide && q.c[0] > 69.4 && q.c[0] < 69.8 && Math.abs(q.c[2] - A2_CAB2.z) < 0.5)) expect(p.noLedge).toBe(true);
  });

  it('the only grip the game offers in A2 above a body is the planned lip: no generated lip, one manual ledge on the open span', () => {
    const generated = anchors.ledges.filter((l) => l.piece !== 0 && inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3) && l.top >= 0.9);
    expect(generated.map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
    const manual = anchors.ledges.filter((l) => l.piece === 0 && inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3));
    expect(manual).toHaveLength(1);
    const l = manual[0]!;
    expect(l.top).toBeCloseTo(A2_DECK.lip, 9);
    expect([l.a.x, l.b.x].sort((p, q) => p - q)).toEqual(A2_LIP_X);
    expect(l.a.z).toBeCloseTo(A2_DECK.z, 9);
    expect(l.nz).toBeCloseTo(-1, 9);
    expect(l.canClimbUp).toBe(true);
  });

  it('the leg-up from the mark (0.5 m off the deck face, x 33) takes the loading edge; there is room beside and over the booster', () => {
    const g = coopDeck({ id: 'a2-stage', at: { x: A2_DECK.x, z: A2_DECK.z }, facing: '+z', span: A2_DECK.span, depth: A2_DECK.depth, lip: A2_DECK.lip, open: A2_DECK.open, screen: 1.2, stair: 'end', stairW: 1.2 });
    const spot = g.spots.find((s) => s.kind === 'legUp')!;
    expect([spot.x, spot.z]).toEqual([A2_MARK.x, A2_MARK.z]);
    expect(A2_DECK.z - spot.z).toBeCloseTo(0.5, 9);
    const t = findJumpTarget(anchors, { x: spot.x, y: TEAM.boostMax - 1.15, z: spot.z }, -1, 0, 1, 1, 2.2, 0.2);
    expect(t).not.toBeNull();
    const l = t!.anchor as Ledge;
    expect(l.kind).toBe('ledge');
    expect(l.piece).toBe(0);
    expect(l.top).toBeCloseTo(A2_DECK.lip, 9);
    for (const dx of [-TEAM.roomSide, TEAM.roomSide]) expect(blockedAt(spot.x + dx, spot.z, MOVEMENT.radius)).toEqual([]);
    expect(solid.filter((p) => top(p) > 0.15 && p.c[1] - p.s[1] / 2 < TEAM.roomUp && Math.abs(p.c[0] - spot.x) < p.s[0] / 2 && Math.abs(p.c[2] - spot.z) < p.s[2] / 2)).toEqual([]);
    // the mark's paint is on the map (no collision)
    expect(mine.some((p) => !p.collide && Math.abs(p.c[0] - spot.x) < 0.01 && Math.abs(p.c[2] - spot.z) < 0.01)).toBe(true);
  });

  it('the deck is one solid block x 30-62, z 17.5-20, 4.4 m, with 1.2 m screens on the rest of the edge and a 27-riser east stair x 62-69.7 along the back wall', () => {
    const deck = mine.find((p) => p.collide && Math.abs(top(p) - 4.4) < 1e-6 && p.s[0] > 31)!;
    expect(deck.c[0]).toBeCloseTo(46, 9);
    expect(deck.s[0]).toBeCloseTo(32, 9);
    expect(deck.c[2] - deck.s[2] / 2).toBeCloseTo(17.5, 9);
    expect(deck.noLedge).toBe(true);
    const screens = mine.filter((p) => p.collide && Math.abs(p.s[1] - 1.2) < 1e-6 && Math.abs(p.c[1] - 5.0) < 1e-6);
    expect(screens.map((p) => [p.c[0] - p.s[0] / 2, p.c[0] + p.s[0] / 2].map((v) => Number(v.toFixed(3))))).toEqual([[30, 31], [35, 62]]);
    const steps = grey.filter((p) => !p.collide && p.s[1] > 0.1 && p.c[0] > 62 && p.c[0] < 70);
    expect(steps).toHaveLength(27);
    expect(Math.max(...steps.map(top))).toBeCloseTo(4.4, 9);
    expect(Math.max(...steps.map((p) => p.c[0] + (p.s[0] * Math.abs(Math.cos(p.yaw)) + p.s[2] * Math.abs(Math.sin(p.yaw))) / 2))).toBeCloseTo(69.7, 1);
    // 1.2 m wide against the back wall (z 18.8-20), within the deck's 2.5 m depth, a ramp collider under it
    expect(steps[0]!.s[0]).toBeCloseTo(1.2, 9);
    expect(1.2).toBeLessThanOrEqual(A2_DECK.depth);
    expect(mine.some((p) => p.collide && Math.abs(p.pitch) > 1e-3)).toBe(true);
    expect(4.4 / 27).toBeLessThanOrEqual(MOVEMENT.maxStep);
  });
});

describe('A2 the Carriage Shed: the cabin', () => {
  const cabin = [A2_CABIN.x0, A2_CABIN.z0, A2_CABIN.x1, A2_CABIN.z1] as const;
  const doorAt = (id: string) => b.anchors.doors.find((d) => d.id === course.doors[id])!;

  it('two 1.2 x 2.1 swing doors, both unlocked: the north door x 30.4-31.6 on z 5 and the back door on the east wall z 2.0-3.2', () => {
    const n = doorAt(A2_CABIN_DOOR);
    const e = doorAt(A2_BACK_DOOR);
    for (const d of [n, e]) {
      expect(d.width).toBeCloseTo(1.2, 9);
      expect(d.height).toBeCloseTo(2.1, 9);
      expect(d.locked).toBe(false);
    }
    expect([n.hinge.x, n.hinge.z]).toEqual([30.4, 5]);
    expect([e.hinge.x, e.hinge.z]).toEqual([32, 2]);
    expect(A2_CABIN_DOOR.startsWith('A2-') && A2_BACK_DOOR.startsWith('A2-')).toBe(true);
    expect(Object.keys(part.doors)).toEqual([A2_CABIN_DOOR, A2_BACK_DOOR]);
  });

  it('the plant wall closes the strip behind the cabin (no 0.65 m gap to hide in) and the roof is 2.6 m, overhead', () => {
    const plant = mine.find((p) => p.collide && Math.abs(p.c[2] - (0.25 + 1.1) / 2) < 1e-6)!;
    expect(plant).toBeDefined();
    expect(plant.c[2] - plant.s[2] / 2).toBeCloseTo(0.25, 9);
    const roof = mine.find((p) => p.overhead && Math.abs(top(p) - 2.6) < 1e-6)!;
    expect(roof).toBeDefined();
    expect(roof.noLedge).toBe(true);
    // the roof's underside is above the panel lamp
    expect(roof.c[1] - roof.s[1] / 2).toBeGreaterThan(lamps.find((l) => l.group === 22)!.y);
  });

  it('the coat corner is the plan pocket, inside the cabin, clear floor, and a short walk from the cabinet 1 standing spot (the takedown step)', () => {
    const pocket = MARLOW_POCKETS.find((x) => x.id === 'a2-coat')!;
    expect(inBox([...cabin], pocket.box[0], pocket.box[1], -0.2)).toBe(true);
    expect(inBox([...cabin], pocket.box[2], pocket.box[3], -0.1)).toBe(true);
    expect(blockedAt(28.95, 4.25, 0.3)).toEqual([]);
    expect(walkBlocked(28.95, 4.25, 30.6, 3.2)).toBeNull();
    expect(hyp2(30.6 - 28.95, 3.2 - 4.25)).toBeLessThanOrEqual(2.0);
    const spot = part.lightSpots.find((s) => s.name === 'A2 coat corner')!;
    expect(spot).toMatchObject({ x: 28.95, z: 4.25, band: 'pocket' });
  });

  it('cabinet 1 stands against the plant wall facing +z, cabinet 2 on the east wall facing -x, both within a metre of the plan and 1.6 m tall', () => {
    const plan = (id: string) => circuitOf(21)!.switches.find((s) => s.id === id)!;
    const d1 = part.devices[A2_ISO_1]!;
    const d2 = part.devices[A2_ISO_2]!;
    expect([d1.x, d1.z, d1.yaw]).toEqual([A2_CAB1.x, A2_CAB1.z, 0]);
    expect([d2.x, d2.z, d2.yaw]).toEqual([A2_CAB2.x, A2_CAB2.z, -Math.PI / 2]);
    expect(hyp2(d1.x - plan(A2_ISO_1).x, d1.z - plan(A2_ISO_1).z)).toBeLessThanOrEqual(1);
    expect(hyp2(d2.x - plan(A2_ISO_2).x, d2.z - plan(A2_ISO_2).z)).toBeLessThanOrEqual(1);
    // each cabinet has a body behind its push station and clear floor to stand on (the wheel stop is not under the spot)
    const bodies = mine.filter((p) => p.collide && Math.abs(p.s[1] - 1.6) < 1e-6);
    expect(bodies).toHaveLength(2);
    expect(blockedAt(d1.x, d1.z + 1.0, 0.3)).toEqual([]);
    expect(blockedAt(d2.x - 0.6, d2.z, 0.3)).toEqual([]);
    expect(hyp2(d1.x - 30.6, d1.z - 3.0)).toBeLessThanOrEqual(1.5);
  });
});

describe('A2 the Carriage Shed: the isolator (N2) and the steps', () => {
  it('one isolator gate on the neck group: both cabinets, 15 s dark, 3 s re-arm (the circuit table), validated with the course', () => {
    expect(part.bay.gates).toHaveLength(1);
    expect(gate).toMatchObject({ kind: 'isolator', id: A2_GATE, switchIds: [A2_ISO_1, A2_ISO_2], group: A2_NECK_GROUP, seconds: 15, rearm: 3 });
    expect(circuitOf(21)!.timed).toEqual({ seconds: gate.seconds, rearm: gate.rearm });
    expect(course.groups![A2_NECK_GROUP]).toBe(21);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
    // every device the gate names is the set's (no wall switch drives group 21: a plain switch would cut it for good)
    for (const s of gate.switchIds) expect(part.devices[s]).toBeDefined();
    expect((lay.switches ?? []).map((s) => s.group)).not.toContain(21);
  });

  it('a press cuts the circuit for the window; a press while dark does nothing; a press while re-arming is refused; then it is ready again', () => {
    const s = runAt([30.6, 2.6], [44.5, 16.9]);
    expect(s.isGateOpen(A2_GATE)).toBe(false);
    expect(s.press(A2_ISO_1, 0)).toBeNull();
    expect(s.isGateOpen(A2_GATE)).toBe(true);
    expect(s.gateTimer(A2_GATE)).toBe(15);
    run(s, 4);
    expect(s.press(A2_ISO_2, 1)).toBeNull();
    expect(s.gateTimer(A2_GATE)).toBeCloseTo(11, 1);
    run(s, 11.2);
    expect(s.isGateOpen(A2_GATE)).toBe(false);
    expect(s.gateRearm(A2_GATE)).toBeGreaterThan(2);
    expect(s.press(A2_ISO_2, 1)).toBe(REFUSE_ISO_REARM);
    expect(s.isGateOpen(A2_GATE)).toBe(false);
    run(s, 3);
    expect(s.gateRearm(A2_GATE)).toBe(0);
    expect(s.press(A2_ISO_2, 1)).toBeNull();
    expect(s.isGateOpen(A2_GATE)).toBe(true);
  });

  it('the window covers the neck crossing with spare time, and one player alone cannot press and cross (28.4 m along the cess at 1.7 m/s > 15 s)', () => {
    const cross = 10 / SILENT_PACE;
    expect(cross + 5).toBeLessThanOrEqual(gate.seconds);
    // cabinet 1 -> the cabin door (31, 5.5) -> the cess at (35, 7.5) -> the east rake's west end (56, 7.5)
    const path: [number, number][] = [[A2_CAB1.x, 2.6], [31, 5.5], [35, 7.5], [56, 7.5]];
    let len = 0;
    for (let i = 1; i < path.length; i++) len += hyp2(path[i]![0] - path[i - 1]![0], path[i]![1] - path[i - 1]![1]);
    expect(len).toBeGreaterThan(28);
    expect(len / SILENT_PACE).toBeGreaterThan(gate.seconds);
    // the route is open floor all the way
    for (let i = 1; i < path.length; i++) expect(walkBlocked(path[i - 1]![0], path[i - 1]![1], path[i]![0], path[i]![1]), `leg ${i}`).toBeNull();
    // B's way to cabinet 2 from the neck's gap 2/3 (the taught crossing, z 12.5; the north walkway is closed at the neck, X2b) is open and ready inside the re-arm (window 15 + 3 s)
    const east: [number, number][] = [[56, A2_CROSS_Z], [67.2, A2_CROSS_Z], [67.2, A2_CAB2.z], [68.8, A2_CAB2.z]];
    for (let i = 1; i < east.length; i++) expect(walkBlocked(east[i - 1]![0], east[i - 1]![1], east[i]![0], east[i]![1]), `east leg ${i}`).toBeNull();
  });

  it('three steps in route order: the neck (A / B lines, one player east of x 56, the window timer), the way back (both east) and one closing line', () => {
    const steps = def.objectives!.filter((o) => o.bay === 'A2');
    expect(steps.map((o) => o.id)).toEqual(['a2-neck', 'a2-back', 'a2-lock']);
    expect(neckStep.done).toEqual({ flag: A2_EAST1_FLAG });
    expect(backStep.done).toEqual({ flag: A2_EAST_FLAG });
    expect(neckStep.timer).toBe(A2_GATE);
    expect(backStep.timer).toBe(A2_GATE);
    for (const o of steps.slice(0, 2)) {
      expect(o.a).toBeDefined();
      expect(o.b).toBeDefined();
      expect(o.a).not.toBe(o.b);
    }
    expect(steps[2]!.done).toBeUndefined();
    expect(steps.filter((o) => o.done === undefined)).toHaveLength(1);
    expect(neckStep.a).toMatch(/cabinet one/);
    expect(neckStep.b).toMatch(/cabinet two/);
  });

  it('every line fits 90 characters, no em or en dash; ids fit the wire; the radio is the doc\'s four lines (three at the entry, the five-second warning)', () => {
    for (const o of def.objectives!.filter((x) => x.bay === 'A2')) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(/[–—]/.test(t), t).toBe(false);
      }
      expect(o.id.length).toBeLessThanOrEqual(OBJECTIVE_ID_MAX);
    }
    expect(part.bay.radio.map((r) => r.at)).toEqual(['enter', 'enter', 'enter', `warn:${A2_GATE}`]);
    for (const r of part.bay.radio) {
      expect(r.text.length, r.text).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(r.text), r.text).toBe(false);
    }
    expect(part.bay.radio[2]!.text).toBe('Two spotters on the staging. Seen in the neck lights and we start again.');
    expect(part.bay.radio[3]!.text).toBe('Lights back in five.');
  });

  it('the first player to press cabinet 1 takes the A job; until then the lead (P2 in this even set) reads A; the first claim stands', () => {
    let s = runAt([30.6, 2.6], [44.5, 16.9]);
    expect(s.roleClaimed()).toBe(false);
    expect(s.roleOf(1)).toBe('a');
    expect(s.stepLine(neckStep, 1)).toBe(neckStep.a);
    expect(s.stepLine(neckStep, 0)).toBe(neckStep.b);
    // P1 presses cabinet 1: P1 is A, P2 is B
    expect(s.press(A2_ISO_1, 0)).toBeNull();
    expect(s.roleClaimed()).toBe(true);
    expect(s.roleOf(0)).toBe('a');
    expect(s.stepLine(neckStep, 0)).toBe(neckStep.a);
    expect(s.stepLine(neckStep, 1)).toBe(neckStep.b);
    // cabinet 2 afterwards (any player) does not swap it
    run(s, 19);
    expect(s.press(A2_ISO_2, 0)).toBeNull();
    s.update(1 / 60);
    expect(s.roleOf(0)).toBe('a');
    // cabinet 2 first claims nothing: the lead stays A
    s = runAt([66, 7], [44.5, 16.9]);
    expect(s.press(A2_ISO_2, 0)).toBeNull();
    expect(s.roleClaimed()).toBe(false);
    expect(s.roleOf(1)).toBe('a');
    // the window runs on the step line (the HUD's "Lights back in")
    expect(s.stepTimer(neckStep)).toBeGreaterThan(14);
  });

  it('the pass zones: one player east of x 56 on the floor ticks the neck step, both tick the way back; flags are the set\'s external flags', () => {
    const [east1, east] = part.passZones;
    expect(east1).toMatchObject({ flag: A2_EAST1_FLAG, floorY: 0, any: true, box: A2_EAST_ZONE });
    expect(east).toMatchObject({ flag: A2_EAST_FLAG, floorY: 0, box: A2_EAST_ZONE });
    expect(east!.any).toBeUndefined();
    expect(part.externalFlags).toEqual([A2_EAST1_FLAG, A2_EAST_FLAG]);
    // x 56 on: the east rake's west end; the box stops inside the set's walls (the stair's foot at 69.7 is in it)
    expect(east1!.box[0]).toBe(56);
    expect(east1!.box[2]).toBeGreaterThanOrEqual(69.7);
    expect(east1!.box[2]).toBeLessThanOrEqual(70);
    const s = runAt([30.6, 2.6], [44.5, 16.9]);
    expect(s.isStepDone('a2-neck')).toBe(false);
    s.setFlag(A2_EAST1_FLAG);
    s.update(1 / 60);
    expect(s.isStepDone('a2-neck')).toBe(true);
    expect(s.isStepDone('a2-back')).toBe(false);
    s.setFlag(A2_EAST_FLAG);
    s.update(1 / 60);
    expect(s.isStepDone('a2-back')).toBe(true);
  });
});

describe('A2 the Carriage Shed: the lights (LIGHTING-PLAN 3, A2)', () => {
  const by = (g: number) => lamps.filter((l) => l.group === g);

  it('fifteen lamps on the plan\'s circuits 20-23: shed 6, neck 4, cabin 1, staging 4; every one grouped, electric and destructible as its row says', () => {
    expect(lamps).toHaveLength(15);
    expect([20, 21, 22, 23].map((g) => by(g).length)).toEqual([6, 4, 1, 4]);
    for (const l of lamps) {
      const row = circuitOf(l.group);
      expect(row, `lamp ${l.id} group ${l.group}`).toBeDefined();
      expect(row!.room).toBe('A2');
      expect(l.electric).toBe(row!.electric);
      expect(l.destructible).toBe(row!.destructible);
      expect(row!.kind).not.toBe('house');
    }
    for (const g of [20, 21, 22, 23]) expect(by(g).length).toBe(circuitOf(g)!.lamps);
  });

  it('the neck high-bays stand over the neck (x 46-56) on the roof tie; the shed strips hang over the rakes and the apron under the tie; the cabin panel is under its roof', () => {
    for (const l of by(21)) {
      expect(l.x).toBeGreaterThan(46);
      expect(l.x).toBeLessThan(56);
      expect(l.y).toBeCloseTo(6.8, 9);
    }
    for (const l of by(20)) {
      expect(l.x < 46 || l.x > 56, `strip at ${l.x}`).toBe(true);
      expect(l.y).toBeCloseTo(6.5, 9);
    }
    const panel = by(22)[0]!;
    expect(inBox([28, 1, 32, 5], panel.x, panel.z, -0.3)).toBe(true);
    expect(panel.y).toBeLessThan(2.5);
    for (const l of by(23)) expect(l.z).toBeGreaterThan(17.5);
  });

  it('the part\'s groups are exactly the plan\'s A2 rows (so the client hears every switch and the isolator), and each has a lamp', () => {
    const plan = marlowCourseGroups();
    expect(part.groups).toEqual({ 'a2-shed': plan['a2-shed'], 'a2-neck': plan['a2-neck'], 'a2-cabin': plan['a2-cabin'], 'a2-staging': plan['a2-staging'] });
    for (const g of Object.values(part.groups)) expect(lamps.some((l) => l.group === g)).toBe(true);
    for (const [k, g] of Object.entries(plan)) if (k.startsWith('a2-')) expect(course.groups![k]).toBe(g);
  });

  it('three wall switches: the shed (20) by the west door, the cabin (22) inside by its door, the staging (23) at the stair head on the deck; no switch drives the neck', () => {
    expect(part.switches.map((s) => [s.id, s.group])).toEqual([['a2-sw-shed', 20], ['a2-sw-cabin', 22], ['a2-sw-staging', 23]]);
    for (const s of part.switches.slice(0, 2)) {
      const spot = circuitOf(s.group)!.switches.find((x) => x.id === s.id)!;
      expect(hyp2(s.pos.x - spot.x, s.pos.z - spot.z), s.id).toBeLessThanOrEqual(1);
    }
    const stage = part.switches[2]!;
    expect(stage.pos.y).toBeCloseTo(4.4 + 1.2, 9);
    expect(stage.pos.x).toBeGreaterThan(61);
    expect(stage.pos.x).toBeLessThan(62);
    expect(inBox([30, 17.5, 62, 20], stage.pos.x, stage.pos.z, 0.3)).toBe(true);
    expect(circuitOf(23)!.switches[0]!.y).toBeCloseTo(4.4, 9);
    expect(circuitOf(21)!.switches.every((s) => s.kind === 'isolator')).toBe(true);
  });

  it('the standby zones: the set at 0.14 (to the roof tie) and the staging\'s upper level', () => {
    const zones = Object.fromEntries(part.ambientZones.map((z) => [z.id, z]));
    expect(zones.A2).toMatchObject({ box: [28, 0, 70, 20], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 6.9 });
    expect(zones['a2-staging']).toMatchObject({ box: [30, 17.5, 62, 20], ambient: MARLOW_LEVEL.standby, minY: 3.9, maxY: 6.9 });
    expect(part.ambientZones).toHaveLength(2);
  });

  it('the isolator darkens the neck and restores it: with 21 on the pool spots read lit, with 21 off every crossing spot reads under the cut band (the tuned levels the light frame re-checks)', () => {
    const spots = LIGHT_SPOTS.a2CarriageShed;
    const at = (n: string) => spots.find((s) => s.name === n)!;
    for (const n of ['A2 neck centre', 'A2 neck crossing']) {
      expect(at(n).band, n).toBe('pool');
      expect(tuned[n]!, n).toBeGreaterThanOrEqual(MARLOW_LEVEL.poolMin);
    }
    const cuts = spots.filter((s) => s.band === 'cut' && s.off?.includes(21));
    expect(cuts.map((s) => s.name)).toEqual(['A2 neck centre cut', 'A2 neck crossing cut', 'A2 neck crossing west cut', 'A2 neck crossing east cut', 'A2 neck cess west cut', 'A2 neck cess east cut']);
    for (const c of cuts) {
      expect(c.off, c.name).toEqual([21]);
      expect(tuned[c.name]!, c.name).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
      // the same plan point read lit is the pool's (or a lit crossing line): the cut is the circuit's doing
      expect(tuned[c.name]!).toBeLessThan(MARLOW_LEVEL.standby + 0.1);
    }
    expect(at('A2 neck centre cut')).toMatchObject({ x: 51, z: 10 });
    // the taught crossing is gap 2/3 (z 12.5; the north walkway at z 16.9 is closed at the neck, X2b)
    for (const n of ['A2 neck crossing', 'A2 neck crossing cut', 'A2 neck crossing west cut', 'A2 neck crossing east cut']) expect(at(n).z, n).toBe(A2_CROSS_Z);
    expect(at('A2 neck crossing cut')).toMatchObject({ x: 51, z: 12.5 });
    expect(tuned['A2 neck crossing']! - tuned['A2 neck crossing cut']!).toBeGreaterThan(0.4);
    // the other states: the rake gap, the vantage, cabinet 1's spot, the deck and cabinet 2 read lit; the coat corner is the dark pocket; standby 0.14
    for (const n of ['A2 rake gap', 'A2 cess', 'A2 vantage', 'A2 cabinet 1', 'A2 deck', 'A2 cabinet 2', 'A2 east rake gap']) {
      expect(at(n).band, n).toBe('read');
      expect(tuned[n]!, n).toBeGreaterThanOrEqual(MARLOW_LEVEL.readMin);
    }
    expect(at('A2 coat corner').band).toBe('pocket');
    expect(tuned['A2 coat corner']!).toBeLessThanOrEqual(MARLOW_LEVEL.pocketMax);
    expect(Math.abs(tuned['A2 neck standby']! - MARLOW_LEVEL.standby)).toBeLessThanOrEqual(0.03);
    // the shed and cabin switches darken their own areas without touching the neck
    expect(at('A2 rake gap cut').off).toEqual([20]);
    expect(at('A2 cabin cut').off).toEqual([22]);
    expect(tuned['A2 rake gap cut']!).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
    expect(tuned['A2 cabin cut']!).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
  });
});

describe('A2 the Carriage Shed: the shunter', () => {
  const slot = part.squads[A2_SHUNTER]!;
  const patrolSpeed = ENEMIES.grunt.walkSpeed * 1.1;

  /** Walk the loop on its own pace (0.01 s steps, straight-line moves); the times each stop was left and the point it reached. */
  function walkLoop(waits: number[], seconds: number): { left: [number, number][]; stuck: boolean } {
    const w = new PatrolWalker({ points: A2_SHUNTER_ROUTE, waits, faces: A2_SHUNTER_FACES }, slot.x, slot.z, slot.yaw);
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
    return { left, stuck: left.length < 4 };
  }

  it('is the squad\'s first guard (then the two overwatch guards): an armed kind (grunt) on a patrol loop from his post (51, 10) facing west, inside the set', () => {
    expect(part.bay.squad).toEqual([A2_SHUNTER, A2_WATCH_W, A2_WATCH_E]);
    expect(Object.keys(part.squads)).toEqual([A2_SHUNTER, A2_WATCH_W, A2_WATCH_E]);
    expect(slot.kind).toBe('grunt');
    expect(['grunt', 'heavy', 'enforcer', 'officer', 'sniper']).toContain(slot.kind);
    expect(slot.passive).toBeUndefined();
    expect([slot.x, slot.z, slot.yaw]).toEqual([51, 10, -Math.PI / 2]);
    expect(slot.route).toEqual([[51, 10], [56, 7.5], [66, 7.5], [56, 7.5]]);
    expect(slot.route![0]).toEqual([slot.x, slot.z]);
    expect(slot.waits).toEqual([4, A2_PASS_WAIT, 3, A2_PASS_WAIT]);
    expect(slot.faces![0]).toBe(-Math.PI / 2);
    expect(Number.isNaN(slot.faces![1]!)).toBe(true);
    expect(slot.faces![2]).toBe(Math.PI / 2);
    expect(course.squads[A2_SHUNTER]).toBe(slot);
    expect(inBox(box, slot.x, slot.z)).toBe(true);
  });

  it('his loop is open floor (a body of radius 0.3 walks every leg), and so is the lured walk to cabinet 1 through the cabin door', () => {
    for (let i = 0; i < A2_SHUNTER_ROUTE.length; i++) {
      const a = A2_SHUNTER_ROUTE[i]!;
      const c = A2_SHUNTER_ROUTE[(i + 1) % A2_SHUNTER_ROUTE.length]!;
      expect(walkBlocked(a[0], a[1], c[0], c[1]), `leg ${i}`).toBeNull();
    }
    const lured: [number, number][] = [[51, 10], [46, 7.5], [35, 7.5], [31, 5.9], [31, 5.3], [A2_CAB1.x, 2.6]];
    for (let i = 1; i < lured.length; i++) expect(walkBlocked(lured[i - 1]![0], lured[i - 1]![1], lured[i]![0], lured[i]![1], 0.3), `lured leg ${i}`).toBeNull();
    // the east end and the stops: clear of the vans and the wheel stops
    expect(blockedAt(66, 7.5, 0.3)).toEqual([]);
    expect(blockedAt(56, 7.5, 0.3)).toEqual([]);
  });

  it('the loop takes about 37 s on the walker (38.7 s by the plain sum; LD 4.3: 25-45 s) with stops of 4 s at the post and 3 s at the east end (LD: 3-6 s); the walk is 31.2 m at his patrol pace', () => {
    const len = A2_SHUNTER_ROUTE.reduce((n, a, i) => n + hyp2(A2_SHUNTER_ROUTE[(i + 1) % 4]![0] - a[0], A2_SHUNTER_ROUTE[(i + 1) % 4]![1] - a[1]), 0);
    expect(len).toBeCloseTo(31.18, 1);
    const { left } = walkLoop(A2_SHUNTER_WAITS, 130);
    // the times he leaves the post (stop 0): the cycle between two departures
    const post = left.filter(([, i]) => i === 0).map(([t]) => t);
    expect(post.length).toBeGreaterThanOrEqual(3);
    const cycle = post[2]! - post[1]!;
    expect(cycle).toBeGreaterThan(35);
    expect(cycle).toBeLessThan(41);
    // (the walker counts a stop as reached within `PATROL.arrive` 0.45 m: up to 1.8 s under the plain sum)
    expect(Math.abs(cycle - (len / patrolSpeed + 4 + 3 + 2 * A2_PASS_WAIT))).toBeLessThan(2.5);
    expect(cycle).toBeGreaterThanOrEqual(25);
    expect(cycle).toBeLessThanOrEqual(45);
    // he leaves the post after 4 s and the east end after 3 s
    expect(post[0]!).toBeCloseTo(4, 1);
    const east = left.find(([, i]) => i === 2)!;
    const arrived = left.find(([, i]) => i === 1)!;
    expect(east[0] - arrived[0] - 10 / patrolSpeed).toBeCloseTo(3, 0);
    expect(A2_SHUNTER_WAITS[0]).toBeGreaterThanOrEqual(3);
    expect(A2_SHUNTER_WAITS[0]).toBeLessThanOrEqual(6);
    expect(A2_SHUNTER_WAITS[2]).toBeGreaterThanOrEqual(3);
    expect(A2_SHUNTER_WAITS[2]).toBeLessThanOrEqual(6);
  });

  it('the check has teeth: a pass-through wait of 0 (the doc\'s [4, 0, 3, 0]) freezes a PatrolWalker at the first corner, which is why the loop pauses 0.1 s there', () => {
    expect(walkLoop([4, 0, 3, 0], 130).stuck).toBe(false); // (merge) master guard-ai S2 fix: a wait of 0 passes through now; the 0.1 s pause stays
    expect(walkLoop(A2_SHUNTER_WAITS, 130).stuck).toBe(false);
    expect(A2_PASS_WAIT).toBeGreaterThan(0);
  });

  it('the lure (EnemyManager.lightsOut, 25 m): cabinet 1 reaches him at the post and on his west legs only, cabinet 2 anywhere on the loop', () => {
    const d = (cab: { x: number; z: number }, p: readonly [number, number]): number => hyp2(p[0] - cab.x, p[1] - cab.z);
    const post = A2_SHUNTER_ROUTE[0]!;
    expect(d(A2_CAB1, post)).toBeLessThan(LURE_RANGE);
    expect(d(A2_CAB1, post)).toBeGreaterThan(21);
    expect(d(A2_CAB1, [66, 7.5])).toBeGreaterThan(LURE_RANGE);
    expect(d(A2_CAB1, [56, 7.5])).toBeGreaterThan(LURE_RANGE);
    for (const p of A2_SHUNTER_ROUTE) expect(d(A2_CAB2, p), `cabinet 2 from (${p.join(', ')})`).toBeLessThan(LURE_RANGE);
    // the circuit table's own lure stop is his post
    expect(circuitOf(21)!.lure).toEqual({ guard: A2_SHUNTER, from: [51, 10] });
  });
});

describe('A2 the Carriage Shed: map data the e2e and the modes read', () => {
  it('debug points A2-entry / A2-vantage / A2-cabin / A2-mid / A2-mark / A2-east inside the set; camera spaces (hall open, cabin and deck tight); nav seeds on the neck, the east apron and the deck', () => {
    expect(part.debugPoints.map((d) => d.id)).toEqual(['A2-entry', 'A2-vantage', 'A2-cabin', 'A2-mid', 'A2-mark', 'A2-east']);
    for (const d of part.debugPoints) expect(inBox(box, d.pos.x, d.pos.z)).toBe(true);
    expect(part.camSpaces.map((c) => c.size)).toEqual(['open', 'tight', 'tight']);
    expect(part.navSeeds.some((s) => s.x > 46 && s.x < 56)).toBe(true);
    expect(part.navSeeds.some((s) => s.x > 62)).toBe(true);
    expect(part.navSeeds.some((s) => s.y > 4)).toBe(true);
    for (const d of part.debugPoints.filter((x) => x.id !== 'A2-cabin')) expect(blockedAt(d.pos.x, d.pos.z, 0.3), d.id).toEqual([]);
  });

  it('shot vantages for the gap mouth and the stair head; no cameras, lasers, scanners, consoles or hide objects (a guard and a light puzzle)', () => {
    expect(part.shotVantages.map((v) => v.name)).toEqual(['a2-vantage', 'a2-stair-head']);
    expect(part.cameras).toEqual([]);
    expect(part.lasers).toEqual([]);
    expect(part.scanners).toEqual([]);
    expect(part.consoles).toEqual([]);
    expect(part.hideSpots).toEqual([]);
  });
});

describe('A2 the Carriage Shed: dressing (slice 2 step 5)', () => {
  const kitReport = JSON.parse(readFileSync('src/world/kit/assets/facility-kit.json', 'utf8')) as { pieces: Record<string, { meshes: Record<string, number> }> };
  const propReport = JSON.parse(readFileSync('src/world/props/assets/facility-props.json', 'utf8')) as PropReport;
  const area = { x0: box[0], z0: box[1], x1: box[2], z1: box[3] };
  const own = part.props;
  /** The props' own boxes as written (matched by centre and size), a quarter-turn prop folded to the axis-aligned box `soloJumpThreats` reads. */
  const propBoxes = own.flatMap((p) => propCollisionBox(p) ?? []);
  const written = propBoxes.map((w) => mine.find((p) => p.collide && p.c.every((v, k) => Math.abs(v - w.c[k]!) < 1e-6) && p.s.every((v, k) => Math.abs(v - w.s[k]!) < 1e-6) && Math.abs(p.yaw - w.yaw) < 1e-6)!);
  const upright = (p: BoxPiece): BoxPiece => (Math.abs(Math.sin(p.yaw)) > 0.5 ? { ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 } : { ...p, yaw: 0 });
  /** The east stair's open-side collision rail (P3-2): the dressing's `kit.handrail` boxes on the line z `A2_STAIR_RAIL.z` (twelve). */
  const stairRail = dressing.filter((p) => p.collide && Math.abs(p.c[2] - A2_STAIR_RAIL.z) < 1e-6);
  /** The deck's east-end rail beside the stair head (P3-2 fix): the dressing's `kit.handrail` box along z, 0.05 m in from the deck's east face (the rail's head x). */
  const deckEnd = dressing.filter((p) => p.collide && Math.abs(p.yaw) < 1e-6 && Math.abs(p.c[0] - (A2_STAIR_RAIL.to - 0.05)) < 1e-6);
  const fillers = dressing.filter((p) => p.collide && !written.includes(p) && !stairRail.includes(p) && !deckEnd.includes(p));
  const skins = dressing.filter((p) => !p.collide);
  /** The east stair (the helper's flight): its nosing line over x (the ramp collider's top) and the ramp's underside. */
  const stair = coopDeck({ id: 'a2-stage', at: { x: A2_DECK.x, z: A2_DECK.z }, facing: '+z', span: A2_DECK.span, depth: A2_DECK.depth, lip: A2_DECK.lip, open: A2_DECK.open, screen: 1.2, stair: 'end', stairW: 1.2 }).stairs[0]!;
  const xFoot = stair.x + stair.len / 2;
  const xHead = stair.x - stair.len / 2;
  const ramp = grey.find((p) => p.collide && Math.abs(p.pitch) > 1e-3)!;
  const lineAt = (x: number): number => (stair.rise * (xFoot - x)) / stair.len;
  const underAt = (x: number): number => lineAt(x) - ramp.s[1] * (ramp.s[2] / stair.len);
  const inside = (p: BoxPiece, x: number, y: number, z: number): boolean => Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(y - p.c[1]) <= p.s[1] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2;
  /** The first dressing collider (a filler or the gate) within `r` of a point on the floor plan, or null. */
  const dressNear = (x: number, z: number, r: number): string | null => {
    for (const p of [...fillers, ...written].map(upright)) {
      if (hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r) return `box (${p.c.map((v) => v.toFixed(2)).join(', ')})`;
    }
    return null;
  };
  const dressWalk = (x0: number, z0: number, x1: number, z1: number, r = MOVEMENT.radius): string | null => {
    const n = Math.ceil(hyp2(x1 - x0, z1 - z0) / 0.1);
    for (let i = 0; i <= n; i++) {
      const hit = dressNear(x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n, r);
      if (hit) return `(${(x0 + ((x1 - x0) * i) / n).toFixed(2)}, ${(z0 + ((z1 - z0) * i) / n).toFixed(2)}): ${hit}`;
    }
    return null;
  };

  it('the greybox is as S2 built it: its 58 boxes (checksum), 15 lamps, 2 doors, 1 anchor; the only new collision is the stair fillers, the stair\'s open-side rail and the permit gate\'s box', () => {
    let sum = 0;
    for (const p of grey) sum += (p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw) * (p.collide ? 1 : 1.5) * (p.visible === false ? 1.25 : 1) * (p.overhead ? 1.1 : 1);
    expect(sum).toBeCloseTo(GREY.checksum, 3);
    expect(grey.filter((p) => p.collide)).toHaveLength(GREY.solids);
    expect(propBoxes).toHaveLength(1);
    expect(written.every((p) => p !== undefined)).toBe(true);
    expect(fillers.length).toBeGreaterThanOrEqual(10);
    expect(built.counts.sets.a2CarriageShed).toEqual({ lights: GREY.lights, solids: GREY.solids + fillers.length + propBoxes.length + stairRail.length + deckEnd.length, doors: GREY.doors, anchors: GREY.anchors });
    // after the greybox: the fillers, the stair rail's boxes, the deck's east-end rail, the gate's box and visual skins; nothing else collides
    expect(dressing.filter((p) => p.collide)).toHaveLength(fillers.length + propBoxes.length + stairRail.length + deckEnd.length);
    expect(lamps).toHaveLength(GREY.lights);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A2-12', 'A2-13', 'A2-14', 'A2-15', 'A2-16', 'A2-17', 'A2-18', 'A2-19', 'A2-20']));
    expect(part.doors).toEqual({ [A2_CABIN_DOOR]: expect.any(Number), [A2_BACK_DOOR]: expect.any(Number) });
  });

  it('every hand-built dressing box is a visual skin: no collision, noLedge, a side under 5 cm (out of the canonical light shapes, so the light is the greybox\'s); the new colliders are invisible and noLedge', () => {
    expect(skins.length).toBeGreaterThan(400);
    for (const p of skins) {
      expect(p.noLedge, `skin at (${p.c.join(', ')})`).toBe(true);
      expect(Math.min(...p.s), `skin at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBeLessThan(CANON_MIN_THICK);
      expect(p.visible).not.toBe(false);
    }
    // no visible box the dressing added reaches the light shapes; the colliders are invisible (light passes, no cover, no ledge: the same as the greybox's ramp)
    expect(dressing.filter((p) => p.visible !== false && Math.min(...p.s) >= CANON_MIN_THICK)).toEqual([]);
    for (const p of dressing.filter((q) => q.collide)) {
      expect(p.visible, `collider at (${p.c.join(', ')})`).toBe(false);
      expect(p.noLedge).toBe(true);
    }
  });

  it('S2-check should-fix 2: the east stair\'s underside is solid. Fillers in 0.5 m slices fill the floor up to just under the ramp\'s top, so no body can stand inside the steps, and the flight stays walkable', () => {
    // the stair is the helper's: 27 risers x 62-69.7, z 18.8-20, a 0.3 m pitched slab as its collider
    expect(xHead).toBeCloseTo(62, 9);
    expect(ramp.s[1]).toBeCloseTo(0.3, 9);
    expect(ramp.c[1] + (ramp.s[1] / 2) * Math.cos(ramp.pitch), 'the ramp top at its centre').toBeCloseTo(stair.rise / 2, 6);
    // the S2-check hole: the slab's underside stands over 1.8 m high at the head, the strip x 62-66, z 18.8-19.75 is open to the south
    expect(underAt(62)).toBeGreaterThan(1.8);
    expect(underAt(66)).toBeGreaterThan(0.5);
    // every filler: z 18.8 to the gallery wall's face (19.75), a slice wide, flat, from the floor, its top under the nosing line at its low end and inside the slab (within 0.15 m of the line)
    const run = [...fillers].sort((p, q) => p.c[0] - q.c[0]);
    expect(run.length).toBeGreaterThanOrEqual(12);
    let x = xHead;
    for (const f of run) {
      expect(f.c[2] - f.s[2] / 2).toBeCloseTo(stair.z - stair.w / 2, 9);
      expect(f.c[2] + f.s[2] / 2).toBeCloseTo(19.75, 9);
      expect(f.c[0] - f.s[0] / 2).toBeCloseTo(x, 9);
      expect(f.s[0]).toBeLessThanOrEqual(STAIR_FILL.step + 1e-9);
      x = f.c[0] + f.s[0] / 2;
      expect(f.c[1] - f.s[1] / 2, 'from the floor').toBeCloseTo(0, 9);
      expect(top(f), `filler at x ${f.c[0]} stands over the walking line`).toBeLessThanOrEqual(lineAt(x) - STAIR_FILL.gap + 1e-9);
      expect(top(f), `filler at x ${f.c[0]} stops short of the slab`).toBeGreaterThan(underAt(f.c[0] - f.s[0] / 2));
      expect(f.collide && f.visible === false && f.noLedge).toBe(true);
    }
    expect(x).toBeGreaterThan(69.4);
    // no point under the flight is walkable: a column at each sample (the floor up to the nosing line) is solid, a filler first and the pitched slab over it
    const stairColliders = [...solid.filter((p) => !fillers.includes(p)), ...fillers];
    const hole = (list: readonly BoxPiece[], x1: number, z1: number): number | null => {
      for (let y = 0.05; y < lineAt(x1) - 0.06; y += 0.1) {
        const filler = list.some((p) => p.s[1] > 0 && inside(p, x1, y, z1));
        const slab = y >= underAt(x1) && y <= lineAt(x1);
        if (!filler && !slab) return y;
      }
      return null;
    };
    let samples = 0;
    for (let sx = 62.05; sx <= 69.45; sx += 0.1) {
      for (let sz = 18.85; sz <= 19.7; sz += 0.1) {
        samples++;
        expect(hole(stairColliders, sx, sz), `air at (${sx.toFixed(2)}, ${sz.toFixed(2)})`).toBeNull();
      }
    }
    expect(samples).toBeGreaterThan(500);
    // teeth: with the fillers taken out the same samples find air under the flight (the S2-check finding)
    const without = solid.filter((p) => !fillers.includes(p));
    let airy = 0;
    for (let sx = 62.05; sx <= 66.05; sx += 0.5) for (let sz = 18.85; sz <= 19.7; sz += 0.25) if (hole(without, sx, sz) !== null) airy++;
    expect(airy).toBeGreaterThan(20);
    // the flight itself is the greybox's: 27 risers and the same collider; the fillers never stand over its top line (so the climb is unchanged)
    expect(grey.filter((p) => !p.collide && p.s[1] > 0.1 && p.c[0] > 62 && p.c[0] < 70)).toHaveLength(27);
    expect(grey.filter((p) => p.collide && Math.abs(p.pitch) > 1e-3)).toHaveLength(1);
    // beside the flight (south of z 18.8, east of the foot) there is open floor: nothing was added there
    expect(dressNear(66, 18.2, 0.3)).toBeNull();
    expect(dressNear(69.6, 19.3, 0.05)).toBeNull();
  });

  it('the staging switch (61.7, 5.6, 19.7) no longer floats: a conduit post stands on the deck against the gallery wall\'s face with a box round the switch', () => {
    const sw = lay.switches!.find((s) => s.group === 23)!;
    expect(sw.pos.x).toBeCloseTo(61.7, 9);
    expect(sw.pos.y).toBeCloseTo(5.6, 9);
    expect(sw.pos.z).toBeCloseTo(19.7, 9);
    const around = skins.filter((p) => Math.abs(p.c[0] - sw.pos.x) < 0.2 && p.c[2] > 19.66 && p.c[2] < 19.76);
    // the post: from the deck up past the switch, 0.3 m wide, on the wall's face (z 19.72-19.75)
    const post = around.find((p) => p.s[0] > 0.25 && p.s[0] < 0.35 && p.c[1] - p.s[1] / 2 < A2_DECK.lip + 0.01 && top(p) > 6.0)!;
    expect(post).toBeDefined();
    expect(post.c[2] + post.s[2] / 2).toBeCloseTo(19.75, 9);
    // the box behind the switch: it reaches the switch's height and holds its z
    const sbox = around.find((p) => p.s[0] > 0.15 && p.s[1] > 0.3 && p.s[1] < 0.4 && Math.abs(p.c[1] - sw.pos.y) < 0.2)!;
    expect(sbox).toBeDefined();
    expect(sw.pos.z).toBeGreaterThan(sbox.c[2] - sbox.s[2] / 2);
    expect(sw.pos.z).toBeLessThan(sbox.c[2] + sbox.s[2] / 2 + 0.02);
    // it is a skin: the deck's walkable depth (z 17.5 to the wall's face) is unchanged
    expect(post.collide).toBe(false);
  });

  it('budgets (computed): kit triangles <= 60 k; the props pass FacilityProps.check against the set box at 60 k triangles and 12 draws, with the facility\'s set-side plate in the box counted', () => {
    const kitIn = lay.kit!.instances.filter((i) => inBox(box, i.x, i.z));
    const kitTris = kitTriangles({ instances: kitIn, doors: [] }, kitReport);
    expect(kitIn.some((i) => i.piece === 'wallPanel')).toBe(true);
    expect(kitTris).toBeGreaterThan(0);
    expect(kitTris, `${kitTris} kit triangles`).toBeLessThanOrEqual(60_000);
    // any facility prop in the box (the L1 far door's set-side plate) counts against the set's props
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
    expect(propDraws(counted, propReport)).toBeGreaterThan(8);
    expect(own.map((p) => p.prop).sort()).toEqual([...Array<string>(12).fill('trackPanel'), 'permitGate', 'pushStation', 'pushStation'].sort());
  });

  it('every prop with an emissive part carries a circuit group (S3-7 S1, light parity): A2 places only the two push stations, whose status lamp is the isolator\'s own indicator (own supply, no circuit), so no lit prop is left ungrouped', () => {
    const plan = new Set(Object.values(marlowCourseGroups()));
    const [g0, g1] = setGroups('a2CarriageShed');
    const glowing = own.filter((p) => propGlows(p) && !PROP_OWN_SUPPLY.includes(p.prop));
    expect(glowing).toEqual([]);
    const stations = own.filter((p) => p.prop === 'pushStation');
    expect(stations).toHaveLength(2);
    expect(PROP_OWN_SUPPLY).toEqual(['pushStation']);
    for (const p of stations) expect(propGlows(p), 'the lamp is lit').toBe(true);
    expect(plan.size).toBeGreaterThan(0);
    expect(g1 - g0).toBe(9);
  });

  it('every kit glow in A2 carries a circuit: the hall panels are grouped on the plan\'s A2 rows (shed general 20 on the walls round the shed, staging 23 over the glazing), all from 4.4 m up; no lamp was added', () => {
    const plan = new Set(Object.values(marlowCourseGroups()));
    const [g0, g1] = setGroups('a2CarriageShed');
    const kitIn = lay.kit!.instances.filter((i) => inBox(box, i.x, i.z));
    const glowing = kitIn.filter((i) => ['wallPanel', 'skirting', 'column', 'handrail'].includes(i.piece) || (i.piece === 'ledSlot' && !i.noLed));
    expect(glowing.length).toBeGreaterThan(40);
    for (const i of glowing) {
      expect(i.group, `${i.piece} at ${i.x}, ${i.y}, ${i.z}`).toBeDefined();
      expect(plan.has(i.group!), `${i.piece} group ${i.group}`).toBe(true);
      expect(i.group!, `${i.piece} group ${i.group}`).toBeGreaterThanOrEqual(g0);
      expect(i.group!, `${i.piece} group ${i.group}`).toBeLessThanOrEqual(g1);
      // the hall's panels only: nothing lower than the 4.4 m deck's top (the shed's own walls keep their sheeting); the east stair's collision rail
      // (P3-2, z 18.75) climbs with the flight, so its modules are asserted below
      if (i.piece === 'handrail' && Math.abs(i.z - A2_STAIR_RAIL.z) < 1e-6) continue;
      expect(i.y, `${i.piece} at ${i.x}, ${i.z}`).toBeGreaterThanOrEqual(A2_DECK.lip - 1e-9);
    }
    // the stair rail's balustrade modules: one a segment, on the staging circuit (23)
    const stairRailKit = glowing.filter((i) => i.piece === 'handrail' && Math.abs(i.z - A2_STAIR_RAIL.z) < 1e-6);
    expect(stairRailKit).toHaveLength(stairRail.length);
    for (const i of stairRailKit) expect(i.group).toBe(23);
    const panels = glowing.filter((i) => i.piece === 'wallPanel');
    for (const i of panels) expect(i.group, `panel at ${i.x}, ${i.y}, ${i.z}`).toBe(i.y >= 7.5 - 1e-9 ? 23 : 20);
    for (const i of panels) expect(i.group).not.toBe(21);
    expect(panels.some((i) => i.group === 20)).toBe(true);
    expect(panels.some((i) => i.group === 23)).toBe(true);
    // three walls round the shed on 20 (south, west, east) and the glazing's wall on 23
    expect(panels.filter((i) => i.group === 20 && Math.abs(i.z - 0.25) < 0.1).length).toBeGreaterThan(20);
    expect(panels.filter((i) => i.group === 20 && Math.abs(i.x - 28.25) < 0.1).length).toBeGreaterThan(5);
    expect(panels.filter((i) => i.group === 20 && Math.abs(i.x - 69.75) < 0.1).length).toBeGreaterThan(5);
    expect(panels.filter((i) => i.group === 23 && Math.abs(i.z - 19.75) < 0.1 && i.y >= 7.5 - 1e-9).length).toBeGreaterThan(20);
    // the sliding doors' 1.0 m frames stay clear
    for (const i of panels.filter((q) => Math.abs(q.x - 28.25) < 0.1)) expect(Math.abs(i.z - 11) - 0.6 * i.sx, `L1 panel at z ${i.z}`).toBeGreaterThanOrEqual(1.0 - 1e-6);
    for (const i of panels.filter((q) => Math.abs(q.x - 69.75) < 0.1)) expect(Math.abs(i.z - 10) - 0.6 * i.sx, `L2 panel at z ${i.z}`).toBeGreaterThanOrEqual(1.0 - 1e-6);
    // no lamp was added: the fifteen of the plan, each on its row
    expect(lamps).toHaveLength(15);
    for (const l of lamps) expect(l.group).toBeGreaterThanOrEqual(g0);
  });

  it('props inside the set box: every drawn footprint and the gate\'s gameplay box; the two push stations hang on the cabinets\' faces, the track panels cover each road from x 29.5 to 69.5 flush with the floor', () => {
    for (const w of propBoxes) {
      const swap = Math.abs(Math.sin(w.yaw)) > 0.5;
      const hx = (swap ? w.s[2] : w.s[0]) / 2;
      const hz = (swap ? w.s[0] : w.s[2]) / 2;
      expect(inBox(box, w.c[0] - hx, w.c[2] - hz)).toBe(true);
      expect(inBox(box, w.c[0] + hx, w.c[2] + hz)).toBe(true);
    }
    for (const p of own) {
      const f = PROP_FOOTPRINT[p.prop];
      for (const [lx, lz] of [[f[0], f[1]], [f[2], f[1]], [f[2], f[3]], [f[0], f[3]]] as const) {
        const w = propToWorld(p, lx, 0, lz);
        expect(inBox(box, w[0], w[2], 1e-6), `${p.prop} at ${p.x}, ${p.z}`).toBe(true);
      }
    }
    // the stations are device-owned (no box), hung 0.6 m up on each cabinet's front face (cabinet 1 front z 1.55 facing +z, cabinet 2 front x 69.45 facing -x)
    const stations = own.filter((p) => p.prop === 'pushStation');
    expect(PROP_HUNG).toContain('pushStation');
    expect(stations.map((p) => [p.x, p.y, p.z])).toEqual([[A2_CAB1.x, 0.6, 1.55], [69.45, 0.6, A2_CAB2.z]]);
    for (const p of stations) expect(propCollisionBox(p)).toBeNull();
    // the track: four 10 m panels per road, end to end (29.5 to 69.5), on the road's centre line, at floor level (rail heads 2 cm proud)
    const track = own.filter((p) => p.prop === 'trackPanel');
    expect(track).toHaveLength(12);
    for (const c of A2_ROADS) {
      const row = track.filter((p) => Math.abs(p.z - c) < 1e-9).map((p) => p.x).sort((p, q) => p - q);
      expect(row).toEqual([...A2_TRACK_X]);
      expect(row[0]! - 5).toBeCloseTo(29.5, 9);
      expect(row[3]! + 5).toBeCloseTo(69.5, 9);
    }
    for (const p of track) expect(p.y).toBe(0);
    expect(own.filter((p) => p.prop === 'permitGate')).toHaveLength(1);
  });

  it('every new collider is noLedge; none within 4.7 m of the loading edge tops out at 1.0 m or more unless noLedge; with the props written soloJumpThreats is still empty for the staging lip (and still bites)', () => {
    for (const p of written) expect(p.noLedge, `prop box at (${p.c.join(', ')})`).toBe(true);
    for (const p of [...written, ...fillers]) if (top(p) >= 1.9) expect(p.noLedge).toBe(true);
    /** Plan gap (m) from an axis-aligned piece to the loading edge's run (x 31-35 at z 17.5). */
    const gapToLip = (p: BoxPiece): number => hyp2(Math.max(A2_LIP_X[0] - (p.c[0] + p.s[0] / 2), p.c[0] - p.s[0] / 2 - A2_LIP_X[1], 0), Math.max(Math.abs(LIP.a.z - p.c[2]) - p.s[2] / 2, 0));
    const near = written.map(upright).filter((p) => gapToLip(p) <= GREY_KEEP_CLEAR);
    // (the gate stands 1.4 m from the loading edge's end, so the rule has something to bite on)
    expect(near.length).toBeGreaterThanOrEqual(1);
    for (const p of near) expect(top(p) < 1.0 || p.noLedge, `prop box at (${p.c.join(', ')}) tops out at ${top(p).toFixed(2)}`).toBe(true);
    const withProps = [...solid, ...written.filter((p) => !solid.includes(p)).map(upright)];
    expect(withProps.length).toBeGreaterThan(solid.length);
    expect(soloJumpThreats(withProps, LIP)).toEqual([]);
    // teeth: a 1.8 m crate 2.5 m off the edge, with the props written, still threatens
    const crate: BoxPiece = { c: [33, 0.9, A2_DECK.z - 2.5 - 0.5], s: [1, 1.8, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true };
    expect(soloJumpThreats([...withProps, crate], LIP).length).toBeGreaterThan(0);
  });

  it('nothing new stands on the cabinets\' press spots, the neck crossing line, the shunter\'s loop and his lured walk, the L1 door to the vantage, the L2 door approach, the leg-up mark and its room, or in the staging\'s deck depth', () => {
    for (const [x, z] of [[30.6, 3.0], [30.6, A2_CAB1.z + 0.4], [68.8, A2_CAB2.z], [A2_MARK.x, A2_MARK.z], [A2_MARK.x - TEAM.roomSide, A2_MARK.z], [A2_MARK.x + TEAM.roomSide, A2_MARK.z]] as const) {
      expect(dressNear(x, z, MOVEMENT.radius), `spot (${x}, ${z})`).toBeNull();
    }
    expect(dressWalk(33, A2_CROSS_Z, 66, A2_CROSS_Z), 'the crossing line (gap 2/3)').toBeNull();
    for (let i = 1; i < A2_SHUNTER_ROUTE.length; i++) expect(dressWalk(A2_SHUNTER_ROUTE[i - 1]![0], A2_SHUNTER_ROUTE[i - 1]![1], A2_SHUNTER_ROUTE[i]![0], A2_SHUNTER_ROUTE[i]![1]), `loop leg ${i}`).toBeNull();
    for (const [x0, z0, x1, z1] of [[51, 10, 35, 7.5], [35, 7.5, 31, 5.3], [31, 5.3, 30.6, 3.0], [28.5, 11, 33.5, 12.5], [60, 10, 69.7, 10], [66, 9.2, 69.7, 9.2], [66, 10.8, 69.7, 10.8]] as const) {
      expect(dressWalk(x0, z0, x1, z1), `walk (${x0}, ${z0}) to (${x1}, ${z1})`).toBeNull();
    }
    // the deck's depth: the only collider over it is the stair's, far east; the walkable strip along the staging (z 17.5 to the wall's face) is untouched
    for (const f of fillers) expect(f.c[0] - f.s[0] / 2).toBeGreaterThanOrEqual(62 - 1e-9);
    expect(dressNear(46, 18.7, 1.0)).toBeNull();
    // the leg-up pocket: the permit gate seals x 28.25-30 so no body (0.6 m) fits either side of it; it stands 1.0 m across, 1.1 m tall, see-through, beside the deck face
    const gateBox = upright(written[0]!);
    expect(gateBox.s[0]).toBeCloseTo(1.0, 9);
    expect(top(gateBox)).toBeCloseTo(1.1, 9);
    expect(gateBox.visible).toBe(false);
    const left = gateBox.c[0] - gateBox.s[0] / 2 - 28.25;
    const right = 30 - (gateBox.c[0] + gateBox.s[0] / 2);
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThan(2 * MOVEMENT.radius);
    expect(right).toBeGreaterThan(0);
    expect(right).toBeLessThan(2 * MOVEMENT.radius);
    expect(gateBox.c[0]).toBeCloseTo(A2_GATE_AT.x, 9);
    expect(gateBox.c[2]).toBeCloseTo(A2_GATE_AT.z, 9);
  });

  it('the drop chain (SPEC P13) is visual: 24 links across the open edge x 31-35, hanging in a swag above the deck, on eye plates on the screens\' ends, no collision; the deck\'s edge stays the one lip', () => {
    const links = skins.filter((p) => p.s[0] > 0.1 && p.s[0] < 0.2 && p.c[0] > 31 && p.c[0] < 35 && p.c[1] > A2_DECK.lip + 0.6 && p.c[1] < A2_DECK.lip + 1.0 && Math.abs(p.c[2] - (A2_DECK.z + 0.05)) < 1e-6);
    expect(links).toHaveLength(24);
    const ys = links.map((p) => p.c[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.1);
    expect(Math.min(...ys)).toBeGreaterThan(A2_DECK.lip + 0.7);
    for (const p of links) expect(p.collide).toBe(false);
    // the greybox's lip and its one manual ledge are as built
    expect(part.lips.map((l) => l.id)).toEqual(['a2-stage-lip']);
    expect(anchors.ledges.filter((l) => l.piece === 0 && inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3))).toHaveLength(1);
  });

  it('the vans, the wheel stops, the cabin and the cabinets are dressed: skins round each van (at least 40), each stop (5), the cabin, both cabinets; the road numbers 1-3 are stencilled on the neck ends', () => {
    const near = (x0: number, x1: number, z0: number, z1: number, y1: number): number => skins.filter((p) => p.c[0] > x0 - 0.1 && p.c[0] < x1 + 0.1 && p.c[2] > z0 - 0.1 && p.c[2] < z1 + 0.1 && p.c[1] < y1).length;
    for (const [x0, x1] of A2_RAKES) for (const c of A2_ROADS) expect(near(x0, x1, c - 1.3, c + 1.3, 3.5), `van x ${x0}-${x1} road ${c}`).toBeGreaterThanOrEqual(40);
    for (const c of A2_ROADS) {
      for (const [x0, x1] of [[32.6, 33.4], [68.6, 69.4]] as const) {
        // (X3) road 2's east stop and its buffer skins are gone: nothing stands there
        if (c === A2_ROADS[1] && x0 > 60) expect(near(x0 - 0.05, x1 + 0.05, c - 0.8, c + 0.8, 0.4), `no stop skins at road 2's east end`).toBe(0);
        else expect(near(x0 - 0.05, x1 + 0.05, c - 0.8, c + 0.8, 0.4), `stop x ${x0} road ${c}`).toBeGreaterThanOrEqual(5);
      }
    }
    expect(near(28.25, 32.1, 1.1, 5.1, 2.7)).toBeGreaterThan(50);
    expect(near(30.15, 31.05, 1.1, 1.55, 2.0)).toBeGreaterThan(8);
    expect(near(69.45, 69.75, 12.95, 13.85, 2.0)).toBeGreaterThan(8);
    // road numbers: black strokes on the white boards of the neck ends (x 46 on the west rake, x 56 on the east), more strokes for 2 and 3 than for 1
    const strokes = (x: number, c: number): number => skins.filter((p) => Math.abs(p.c[0] - x) < 0.09 && Math.abs(p.c[0] - x) > 0.04 && Math.abs(p.c[2] - c) < 0.2 && p.c[1] > 2.1 && p.c[1] < 2.6).length;
    for (const x of [46, 56]) {
      expect(strokes(x, A2_ROADS[0])).toBeLessThan(strokes(x, A2_ROADS[1]));
      expect(strokes(x, A2_ROADS[1])).toBeGreaterThanOrEqual(5);
      expect(strokes(x, A2_ROADS[2])).toBeGreaterThanOrEqual(5);
    }
  });

  it('the coat corner keeps its dark pocket: four coats hang on the hook rail inside it (skins, out of the light shapes) and the floor and the takedown step stay clear', () => {
    const spot = part.lightSpots.find((s) => s.name === 'A2 coat corner')!;
    expect(spot).toMatchObject({ x: 28.95, z: 4.25, band: 'pocket' });
    const coats = skins.filter((p) => p.c[1] > 0.8 && p.c[1] < 1.6 && p.c[2] > 4.8 && p.c[2] < 4.9 && p.c[0] > 28.3 && p.c[0] < 29.6 && p.s[1] > 0.7);
    expect(coats).toHaveLength(4);
    // the pocket stays clear floor for a crouched body and the takedown step
    expect(blockedAt(28.95, 4.25, 0.3)).toEqual([]);
    expect(walkBlocked(28.95, 4.25, 30.6, 3.2)).toBeNull();
  });

  /** The flight's open south edge (z 18.8), the gallery wall's face (the flight's back), and a body's hit on a list of upright boxes at a walking height `y`. */
  const zStairS = stair.z - stair.w / 2;
  const zWall = 19.75;
  /** The east wall's face (the shell's 0.5 m wall on the set box's east edge x 70). */
  const xWall = box[2] - 0.25;
  const bodyHits = (x: number, y: number, zz: number, list: readonly BoxPiece[], r = MOVEMENT.radius): string | null => {
    for (const p of list) {
      if (p.c[1] - p.s[1] / 2 >= y + 1.7 || top(p) <= y + 0.3) continue;
      if (hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(zz - p.c[2]) - p.s[2] / 2, 0)) < r) return `box (${p.c.map((v) => v.toFixed(2)).join(', ')})`;
    }
    return null;
  };

  it("the east stair's open south side has a 1.1 m rail (P3-2): twelve kit.handrail segments of 0.55 m on z 18.75 (0.05 m outside the flight) from x 68.6 to the head, each at least 1.1 m over the walking line at its high end, no gap, invisible, noLedge, the kit's modules on the staging circuit 23", () => {
    const { z, seg, h, from, to } = A2_STAIR_RAIL;
    // on the kit's 0.05 m snap, a whole number of segments, the line 0.05 m outside the open edge, the head at the flight's head (the deck's east end)
    for (const v of [z, seg, from, to]) expect(Math.abs(v / 0.05 - Math.round(v / 0.05)), `${v} on the 0.05 m snap`).toBeLessThan(1e-9);
    expect((from - to) / seg).toBeCloseTo(12, 9);
    expect(z).toBeCloseTo(zStairS - 0.05, 9);
    expect(to).toBeCloseTo(xHead, 9);
    // the side entry stays open: from the rail's start to the east wall's face is wider than a body
    expect(zWall).toBeCloseTo(stair.z + stair.w / 2 - 0.25, 9);
    expect(xWall - xFoot).toBeCloseTo(0.05, 1);
    expect(xWall - from).toBeGreaterThan(2 * MOVEMENT.radius);
    expect(stairRail).toHaveLength(12);
    expect(stairRail.every((p) => p.collide && p.visible === false && p.noLedge === true)).toBe(true);
    const run = stairRail.map(upright).sort((p, q) => q.c[0] - p.c[0]);
    let x: number = from;
    for (const p of run) {
      // a 0.1 m box on the line z 18.75 (its face stops on the flight's open edge), one segment long, from the walking line at its low (east) end
      expect(p.s[0]).toBeCloseTo(seg, 6);
      expect(p.s[2]).toBeCloseTo(0.1, 9);
      expect(p.c[2]).toBeCloseTo(z, 9);
      expect(p.c[2] + p.s[2] / 2, 'the box face is never inside the flight').toBeLessThanOrEqual(zStairS + 1e-9);
      expect(p.c[0] + p.s[0] / 2, `no gap at x ${x.toFixed(2)}`).toBeCloseTo(x, 6);
      const hi = p.c[0] - p.s[0] / 2;
      expect(p.c[1] - p.s[1] / 2, 'from the walking line at the low end').toBeCloseTo(lineAt(x), 6);
      expect(top(p) - lineAt(hi), 'the rail height over the walking line at the high end').toBeGreaterThanOrEqual(h - 1e-6);
      x = hi;
    }
    expect(x, 'the head').toBeCloseTo(to, 6);
    // no gap: at every x from 68.6 to the head a rail box stands on z 18.75 across 0.3 m to 1.0 m over the walking line
    for (let sx = to + 0.025; sx < from; sx += 0.05) for (const dy of [0.3, 0.6, 1.0]) expect(run.some((p) => inside(p, sx, lineAt(sx) + dy, z)), `x ${sx.toFixed(3)} dy ${dy}`).toBe(true);
    // the register counts the rail's boxes on A2-17 with the fillers and the deck's east-end rail
    expect(part.register.find((r) => r.id === 'A2-17')!.solids).toBe(fillers.length + stairRail.length + deckEnd.length);
    // the kit's balustrade over each box: twelve `handrail` modules along z 18.75 on the staging strip (23)
    const pieces = lay.kit!.instances.filter((i) => i.piece === 'handrail' && Math.abs(i.z - z) < 1e-6);
    expect(pieces).toHaveLength(12);
    for (const i of pieces) expect(i.group).toBe(23);
  });

  it("the east stair's rail keeps the flight and its side entry open and stops a step-off (P3-2): a body clears the centre line and an edge lane 0.3 m in, and the side step-on across the bottom treads; 0.1 m outside the open edge it hits the rail from x 68.6 to the head, and without the rail nothing (teeth)", () => {
    const rail = stairRail.map(upright);
    const zMid = (zStairS + zWall) / 2;
    // the flight is not narrowed: a body walking its centre line and an edge lane 0.3 m in, foot to head, meets no rail box
    for (let t = 0; t <= stair.len + 1e-9; t += 0.1) {
      const sx = xFoot - t;
      expect(bodyHits(sx, lineAt(sx), zMid, rail), `centre line at x ${sx.toFixed(2)}`).toBeNull();
      expect(bodyHits(sx, lineAt(sx), zStairS + 0.3 + 0.01, rail), `edge lane at x ${sx.toFixed(2)}`).toBeNull();
    }
    // the side step-on: the foot is 0.05 m off the east wall, so a body steps on from the south across the bottom treads (x 69.45 and 69.2, z 18.0 to 19.3)
    for (const sx of [69.45, 69.2]) {
      for (let k = 0; k <= 13; k++) {
        const zz = 18.0 + k * 0.1;
        expect(bodyHits(sx, zz < zStairS ? 0 : lineAt(sx), zz, rail), `step-on at x ${sx} z ${zz.toFixed(2)}`).toBeNull();
      }
      // and the floor up to the open edge is as it was (a body a hair more than its radius off the east wall's face)
      const fx = Math.min(sx, xWall - MOVEMENT.radius - 0.01);
      expect(walkBlocked(fx, 18.0, fx, zStairS - MOVEMENT.radius), `floor to the edge at x ${fx}`).toBeNull();
    }
    // the open side is shut from x 68.6 to the head: a body 0.1 m outside the edge at the walking line hits the rail; without the rail boxes nothing (teeth)
    const { from, to } = A2_STAIR_RAIL;
    const n = Math.round((from - to) / 0.1);
    for (let k = 0; k <= n; k++) {
      const sx = to + k * 0.1;
      expect(bodyHits(sx, lineAt(sx), zStairS - 0.1, [...solid, ...rail]), `step off at x ${sx.toFixed(2)}`).not.toBeNull();
      expect(bodyHits(sx, lineAt(sx), zStairS - 0.1, solid.filter((p) => !deckEnd.includes(p))), `step off at x ${sx.toFixed(2)} without the rail`).toBeNull();
    }
  });

  it("the east stair's rail leaves the lanes as they were (P3-2): the floor strip south of the flight is walkable, the shunter's loop and the debug points are clear of it, and soloJumpThreats for the loading edge is still empty with the rail in the solid list (and still bites)", () => {
    const rail = stairRail.map(upright);
    const railWalk = (x0: number, z0: number, x1: number, z1: number): string | null => {
      const steps = Math.ceil(hyp2(x1 - x0, z1 - z0) / 0.1);
      for (let i = 0; i <= steps; i++) {
        const x = x0 + ((x1 - x0) * i) / steps;
        const z = z0 + ((z1 - z0) * i) / steps;
        const hit = bodyHits(x, 0, z, rail);
        if (hit) return `(${x.toFixed(2)}, ${z.toFixed(2)}): ${hit}`;
      }
      return null;
    };
    // the strip south of the flight (z 17.0-18.2, x 62-69.4: body centres from a radius off the deck's east face) on three lanes
    for (const zz of [17.0, 17.6, 18.2]) {
      expect(walkBlocked(xHead + MOVEMENT.radius + 0.01, zz, 69.4, zz), `strip lane z ${zz}`).toBeNull();
      expect(railWalk(xHead + MOVEMENT.radius + 0.01, zz, 69.4, zz), `strip lane z ${zz} (rail)`).toBeNull();
    }
    for (let i = 1; i <= A2_SHUNTER_ROUTE.length; i++) {
      const a = A2_SHUNTER_ROUTE[i - 1]!;
      const c = A2_SHUNTER_ROUTE[i % A2_SHUNTER_ROUTE.length]!;
      expect(railWalk(a[0], a[1], c[0], c[1]), `loop leg ${i}`).toBeNull();
    }
    for (const d of part.debugPoints) expect(bodyHits(d.pos.x, d.pos.y, d.pos.z, [...rail, ...deckEnd]), d.id).toBeNull();
    const withRail = [...solid, ...rail];
    expect(soloJumpThreats(withRail, LIP)).toEqual([]);
    const crate: BoxPiece = { c: [33, 0.9, A2_DECK.z - 2.5 - 0.5], s: [1, 1.8, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true };
    expect(soloJumpThreats([...withRail, crate], LIP).length).toBeGreaterThan(0);
  });

  it("the deck's east end beside the stair head is closed (P3-2 fix): one 1.1 m kit.handrail on the deck from the edge screen's back to the stair rail's line stops a body walking east at z 18.2 at the deck's east face (without it the body walks off), the stair mouth stays walkable onto the flight, and soloJumpThreats stays empty", () => {
    const rail = stairRail.map(upright);
    const screen = solid.filter((p) => p.c[0] - p.s[0] / 2 < xHead && p.c[0] + p.s[0] / 2 >= xHead - 1e-6 && Math.abs(p.c[2] - A2_DECK.z) < 0.2 && p.c[1] - p.s[1] / 2 >= A2_DECK.lip - 1e-6);
    expect(screen, 'the edge screen ends at the deck\'s east face').toHaveLength(1);
    const zScreen = screen[0]!.c[2] + screen[0]!.s[2] / 2;
    // one invisible noLedge box on the deck, 0.1 m thick on x 61.9-62 (its east face on the deck's east face), from the screen's back to the stair rail's line, 1.1 m over the deck
    expect(deckEnd).toHaveLength(1);
    const e = deckEnd[0]!;
    expect(e.collide && e.visible === false && e.noLedge === true).toBe(true);
    expect(e.c[0] + e.s[0] / 2).toBeCloseTo(xHead, 6);
    expect(e.s[0]).toBeCloseTo(0.1, 9);
    expect(e.c[2] - e.s[2] / 2, 'meets the edge screen\'s back face').toBeCloseTo(zScreen, 6);
    expect(e.c[2] + e.s[2] / 2, 'meets the stair rail\'s line, short of the flight\'s open edge').toBeCloseTo(A2_STAIR_RAIL.z, 6);
    expect(e.c[2] + e.s[2] / 2).toBeLessThanOrEqual(zStairS + 1e-9);
    expect(e.c[1] - e.s[1] / 2).toBeCloseTo(A2_DECK.lip, 6);
    expect(top(e) - A2_DECK.lip).toBeCloseTo(A2_STAIR_RAIL.h, 6);
    expect(solid).toContain(e);
    // the kit's balustrade module over it, on the staging circuit (23)
    const pieces = lay.kit!.instances.filter((i) => i.piece === 'handrail' && Math.abs(i.x - e.c[0]) < 1e-6);
    expect(pieces.length).toBeGreaterThanOrEqual(1);
    for (const i of pieces) expect(i.group).toBe(23);
    /** A walk along the deck (at the deck's top, then the walking line past the head) from x0 to x1 at z: the first x a body touches a box in `list`, or null. */
    const deckWalk = (x0: number, x1: number, zz: number, list: readonly BoxPiece[]): number | null => {
      for (let x = x0; x <= x1 + 1e-9; x += 0.05) if (bodyHits(x, x <= xHead ? A2_DECK.lip : lineAt(x), zz, list)) return x;
      return null;
    };
    const all = [...solid, ...rail];
    const without = all.filter((p) => !deckEnd.includes(p));
    // a body walking east at z 18.2 is stopped at the deck's east face; without the box it walks off the end (teeth)
    const stop = deckWalk(xHead - 2, xHead + 1, 18.2, all);
    expect(stop, 'stopped at z 18.2').not.toBeNull();
    expect(stop!).toBeLessThanOrEqual(xHead - 0.1 - MOVEMENT.radius + 0.05 + 1e-9);
    expect(deckWalk(xHead - 2, xHead + 1, 18.2, without), 'without the box it walks off').toBeNull();
    // no gap anywhere across the east face: a body at the face hits something at every z from the screen's back to the stair rail's line
    for (let zz = zScreen; zz <= A2_STAIR_RAIL.z + 1e-9; zz += 0.05) expect(bodyHits(xHead, A2_DECK.lip, zz, all), `east face at z ${zz.toFixed(2)}`).not.toBeNull();
    // the stair mouth stays open: from the deck onto the flight on the centre line and the edge lane 0.3 m in, to a metre down the flight
    for (const zz of [(zStairS + zWall) / 2, zStairS + 0.3 + 0.01]) expect(deckWalk(xHead - 2, xHead + 1, zz, all), `stair mouth at z ${zz.toFixed(2)}`).toBeNull();
    // the loading edge still has no solo jump with the box in the solid list, and the check still bites
    expect(soloJumpThreats(all, LIP)).toEqual([]);
    const crate: BoxPiece = { c: [33, 0.9, A2_DECK.z - 2.5 - 0.5], s: [1, 1.8, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true };
    expect(soloJumpThreats([...all, crate], LIP).length).toBeGreaterThan(0);
  });

  it("the deck's east-end rail is drawn (P4-2): two posts and a top and a mid rail as visual skins on x 61.95 from z 17.6 to the stair rail's line, matching the stair's steel skins, no collision, none added to the solids", () => {
    const xe = xHead - 0.05;
    const end = skins.filter((p) => Math.abs(p.c[0] - xe) < 1e-6 && p.c[1] > A2_DECK.lip && p.c[2] > 17.6 - 1e-6 && p.c[2] < A2_STAIR_RAIL.z + 1e-6);
    expect(end).toHaveLength(4);
    const posts = end.filter((p) => p.s[1] > 0.9);
    const rails = end.filter((p) => p.s[1] < 0.1).sort((p, q) => q.c[1] - p.c[1]);
    expect(posts).toHaveLength(2);
    expect(rails).toHaveLength(2);
    // a post at each end of the run, 1.0 m over the lip, steelDark like the stair's posts; at most 1.5 m between posts
    const pz = posts.map((p) => p.c[2]).sort((p, q) => p - q);
    expect(pz[0]! - 0.02, 'post at the screen\'s back').toBeCloseTo(17.6, 9);
    expect(pz[1]! + 0.02, 'post at the stair rail\'s line').toBeCloseTo(A2_STAIR_RAIL.z, 9);
    expect(pz[1]! - pz[0]!).toBeLessThanOrEqual(1.5);
    const stairPost = skins.find((p) => Math.abs(p.c[0] - 69.4) < 1e-6 && p.s[1] > 0.9 && p.s[1] < 1.1)!;
    for (const p of posts) {
      expect(p.c[1] - p.s[1] / 2).toBeCloseTo(A2_DECK.lip, 9);
      expect(top(p) - A2_DECK.lip).toBeCloseTo(1.0, 9);
      expect(p.color).toBe(stairPost.color);
    }
    // top rail at the lip + 1.0 m, a mid rail at + 0.5 m, each spanning the whole run, steel like the stair's slope rails
    const stairRailSkin = dressing.find((p) => !p.collide && p.color !== stairPost.color && Math.abs(p.pitch) > 1e-3)!;
    expect(rails[0]!.c[1] - A2_DECK.lip).toBeCloseTo(1.0, 9);
    expect(rails[1]!.c[1] - A2_DECK.lip).toBeCloseTo(0.5, 9);
    for (const r of rails) {
      expect(r.c[2] - r.s[2] / 2).toBeCloseTo(17.6, 9);
      expect(r.c[2] + r.s[2] / 2).toBeCloseTo(A2_STAIR_RAIL.z, 9);
      expect(r.color).toBe(stairRailSkin.color);
    }
    // visual only: none collides, all noLedge, thin; the solids the dressing added are unchanged by them
    for (const p of end) {
      expect(p.collide).toBe(false);
      expect(p.noLedge).toBe(true);
      expect(Math.min(...p.s)).toBeLessThan(CANON_MIN_THICK);
      expect(solid).not.toContain(p);
    }
    expect(deckEnd).toHaveLength(1);
  });
});

describe('A2 the Carriage Shed: the neck lanes and the overwatch (walk482 X2b / X3)', () => {
  const EYE = A2_DECK.lip + 1.6;
  const HEADS = [1.05, 1.7] as const;
  const watchSlots = [A2_WATCH_W, A2_WATCH_E].map((id) => part.squads[id]!);
  /** The solids a body touches (as `blockedAt`, over a given list): lets the checks run with a piece taken out or put back. */
  const touching = (list: readonly BoxPiece[], x: number, z: number, r = MOVEMENT.radius): boolean =>
    list.some((p) => p.c[1] - p.s[1] / 2 < 1.7 && top(p) > 0.15 && Math.hypot(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r);
  /** The z intervals (from `lo` to `hi`, 0.05 m steps) where a body of radius 0.3 can stand on the column x: the lanes at that x. */
  const lanes = (list: readonly BoxPiece[], x: number, lo = 0.25, hi = 17.5): [number, number][] => {
    const out: [number, number][] = [];
    let from: number | null = null;
    for (let z = lo; z <= hi + 1e-9; z += 0.05) {
      const free = !touching(list, x, z);
      if (free && from === null) from = z;
      if ((!free || z + 0.05 > hi + 1e-9) && from !== null) {
        out.push([Number(from.toFixed(2)), Number((free ? z : z - 0.05).toFixed(2))]);
        from = null;
      }
    }
    return out;
  };
  const isClosure = (p: BoxPiece): boolean => p.collide && A2_CLOSE_X.some(([x0, x1]) => Math.abs(p.s[0] - (x1 - x0)) < 1e-6 && Math.abs(p.c[0] - (x0 + x1) / 2) < 1e-6) && p.noLedge === true && [A2_CLOSE_S, A2_CLOSE_N].some((c) => Math.abs(p.c[2] - (c.z0 + c.z1) / 2) < 1e-6 && Math.abs(p.s[2] - (c.z1 - c.z0)) < 1e-6);
  const closures = mine.filter(isClosure);
  const skins = dressing.filter((p) => !p.collide);

  /** Does the segment p to q cross the box (slab method, the box shrunk by 1 mm so a grazing ray or an end on a face does not count)? */
  const crosses = (p: readonly number[], q: readonly number[], bx: BoxPiece): boolean => {
    let t0 = 0;
    let t1 = 1;
    for (let k = 0; k < 3; k++) {
      const lo = bx.c[k]! - bx.s[k]! / 2 + 1e-3;
      const hi = bx.c[k]! + bx.s[k]! / 2 - 1e-3;
      const d = q[k]! - p[k]!;
      if (Math.abs(d) < 1e-12) {
        if (p[k]! < lo || p[k]! > hi) return false;
        continue;
      }
      const a = (lo - p[k]!) / d;
      const c = (hi - p[k]!) / d;
      t0 = Math.max(t0, Math.min(a, c));
      t1 = Math.min(t1, Math.max(a, c));
      if (t0 > t1) return false;
    }
    return true;
  };
  /** The sight blockers: every visible upright solid (the invisible rails and the gate let the light and the eye through). */
  const blockers = solid.filter((p) => p.visible !== false);
  const eyeOf = (w: 'w' | 'e'): [number, number, number] => [A2_WATCH_AT[w].x, EYE, A2_WATCH_AT[w].z];
  const sees = (w: 'w' | 'e', x: number, y: number, z: number, list: readonly BoxPiece[] = blockers): boolean => !list.some((p) => crosses(eyeOf(w), [x, y, z], p));

  it('the squad is the shunter first and then the two watchers (at most SET_GUARDS_MAX), every guard an armed grunt', () => {
    expect(part.bay.squad).toEqual([A2_SHUNTER, A2_WATCH_W, A2_WATCH_E]);
    expect(part.bay.squad.length).toBeLessThanOrEqual(SET_GUARDS_MAX);
    expect(Object.keys(part.squads)).toEqual(part.bay.squad);
    for (const id of part.bay.squad) {
      const s = part.squads[id]!;
      expect(s.kind, id).toBe('grunt');
      expect(s.passive, id).toBeUndefined();
      expect(inBox(box, s.x, s.z), id).toBe(true);
      expect(course.squads[id], id).toBe(s);
    }
    // the shunter's slot is untouched by the watchers
    expect([part.squads[A2_SHUNTER]!.x, part.squads[A2_SHUNTER]!.z]).toEqual([51, 10]);
  });

  it('the watchers stand on the staging deck (x 48 and 54, z 17.9, y 4.4) facing south over the neck, on a high-security post with a leash of 0, on walkable deck behind the 1.2 m screens', () => {
    expect(A2_WATCH_AT).toEqual({ w: { x: 48.0, z: 17.9 }, e: { x: 54.0, z: 17.9 } });
    for (const [s, at] of [[watchSlots[0]!, A2_WATCH_AT.w], [watchSlots[1]!, A2_WATCH_AT.e]] as const) {
      expect([s.x, s.y, s.z, s.yaw]).toEqual([at.x, A2_DECK.lip, at.z, Math.PI]);
      expect(s.post).toEqual({ leash: 0, highSecurity: true, guards: 'a2-neck' });
      expect(s.post!.guards).toBe(A2_NECK_GROUP);
      expect(s.route).toBeUndefined();
      // the deck under him: a solid whose top is the lip and which covers a body's circle; the screen is in front, below his eye, and nothing else rises round him
      const under = solid.filter((p) => Math.abs(top(p) - A2_DECK.lip) < 1e-6 && Math.abs(s.x - p.c[0]) <= p.s[0] / 2 - MOVEMENT.radius && Math.abs(s.z - p.c[2]) <= p.s[2] / 2 - MOVEMENT.radius);
      expect(under, 'deck under the watcher').toHaveLength(1);
      const standing = solid.filter((p) => p !== under[0] && p.c[1] - p.s[1] / 2 < A2_DECK.lip + 1.7 && top(p) > A2_DECK.lip + 0.15 && Math.hypot(Math.max(Math.abs(s.x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(s.z - p.c[2]) - p.s[2] / 2, 0)) < MOVEMENT.radius - 1e-6);
      expect(standing, 'nothing stands inside his body circle').toEqual([]);
      const screen = solid.find((p) => Math.abs(p.s[1] - 1.2) < 1e-6 && Math.abs(p.c[1] - 5.0) < 1e-6 && Math.abs(s.x - p.c[0]) <= p.s[0] / 2)!;
      expect(screen.c[2] + screen.s[2] / 2, 'behind the screen').toBeLessThanOrEqual(s.z - MOVEMENT.radius + 1e-9);
      expect(top(screen)).toBeLessThan(EYE);
    }
  });

  it('four closures at the rakes\' neck ends (x 45.5-46.0 and 56.0-56.5): the south cess 2.5 m tall, the north walkway up to the deck\'s 4.4 m, every one solid and noLedge, dressed with skins on both faces', () => {
    expect(A2_CLOSE_X).toEqual([[45.5, 46.0], [56.0, 56.5]]);
    expect(closures).toHaveLength(4);
    for (const [x0, x1] of A2_CLOSE_X) {
      const south = closures.filter((p) => Math.abs(p.c[0] - (x0 + x1) / 2) < 1e-6 && p.c[2] < 5);
      const north = closures.filter((p) => Math.abs(p.c[0] - (x0 + x1) / 2) < 1e-6 && p.c[2] > 15);
      expect(south).toHaveLength(1);
      expect(north).toHaveLength(1);
      expect([south[0]!.c[2] - south[0]!.s[2] / 2, south[0]!.c[2] + south[0]!.s[2] / 2].map((v) => Number(v.toFixed(3)))).toEqual([0.25, 3.7]);
      expect(top(south[0]!)).toBeCloseTo(2.5, 9);
      expect([north[0]!.c[2] - north[0]!.s[2] / 2, north[0]!.c[2] + north[0]!.s[2] / 2].map((v) => Number(v.toFixed(3)))).toEqual([16.3, 17.5]);
      expect(top(north[0]!)).toBeCloseTo(A2_DECK.lip, 9);
      for (const p of [south[0]!, north[0]!]) {
        expect(p.collide).toBe(true);
        expect(p.noLedge).toBe(true);
        expect(p.c[1] - p.s[1] / 2).toBeCloseTo(0, 9);
        // dressing skins on the face and the back (thin, visual, noLedge): the sheeting, stanchions and rails
        const near = skins.filter((q) => Math.abs(q.c[0] - p.c[0]) < p.s[0] / 2 + 0.1 && Math.abs(q.c[2] - p.c[2]) < p.s[2] / 2 + 0.01 && q.c[1] < top(p) + 0.05);
        expect(near.length, `skins on the closure at (${p.c.join(', ')})`).toBeGreaterThanOrEqual(12);
      }
    }
    // the closures sit in the greybox's boxes (the lamps, the cabin and the neck's lights are untouched by them)
    expect(closures.every((p) => grey.includes(p))).toBe(true);
    // register: A2-21 (the closures) and A2-22 (their skins)
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A2-21', 'A2-22']));
    expect(part.register.find((r) => r.id === 'A2-21')!.solids).toBe(4);
    expect(part.register.find((r) => r.id === 'A2-22')!.solids ?? 0).toBe(0);
  });

  it('the neck has two lanes, gap 1/2 (z 6.3-8.7) and gap 2/3 (z 11.3-13.7): at both neck ends no other way in (no walk from a rake end into the south cess or the north strip), and with the closures out there are four (teeth)', () => {
    for (const x of [45.75, 56.25]) {
      const l = lanes(solid, x);
      expect(l, `lanes at x ${x}`).toHaveLength(2);
      expect(l[0]![0]).toBeGreaterThanOrEqual(6.3 + MOVEMENT.radius - 0.06);
      expect(l[0]![1]).toBeLessThanOrEqual(8.7 - MOVEMENT.radius + 0.06);
      expect(l[1]![0]).toBeGreaterThanOrEqual(11.3 + MOVEMENT.radius - 0.06);
      expect(l[1]![1]).toBeLessThanOrEqual(13.7 - MOVEMENT.radius + 0.06);
      expect(lanes(solid.filter((p) => !closures.includes(p)), x), `lanes at x ${x} without the closures (teeth)`).toHaveLength(4);
    }
    // walks along the cess (z 2) and the north strip (z 16.9) from the rake's end into the neck are stopped; gap 1/2 and gap 2/3 walk through
    for (const z of [1.0, 2.0, 3.2, 16.6, 16.9, 17.2]) {
      expect(walkBlocked(40, z, 51, z), `west rake end, z ${z}`).not.toBeNull();
      expect(walkBlocked(62, z, 51, z), `east rake end, z ${z}`).not.toBeNull();
    }
    for (const z of [7.5, A2_CROSS_Z]) {
      expect(walkBlocked(40, z, 62, z), `through the gap at z ${z}`).toBeNull();
    }
    // the way round from the entry side to the neck is the two gaps only: the north strip west of the closure and the cess west of it stay open floor to the closure
    expect(walkBlocked(31, 16.9, 45.1, 16.9)).toBeNull();
    expect(walkBlocked(33, 2.0, 45.1, 2.0)).toBeNull();
  });

  it('the shunter\'s lured walk and his loop still run through the gaps, and the taught crossing (gap 2/3, z 12.5) is open floor from the west rake end to cabinet 2', () => {
    expect(walkBlocked(46, 7.5, 56, 7.5)).toBeNull();
    expect(walkBlocked(34, A2_CROSS_Z, 69, A2_CROSS_Z)).toBeNull();
    expect(walkBlocked(46, A2_CROSS_Z, 51, A2_CROSS_Z)).toBeNull();
    expect(walkBlocked(51, A2_CROSS_Z, 56, A2_CROSS_Z)).toBeNull();
    expect(walkBlocked(66, A2_CROSS_Z, 68.8, A2_CAB2.z)).toBeNull();
  });

  it('static sight (watcher eye 6.0 m over the deck): both watchers see the lit crossing along z 12.5 and the four lane mouths at head heights 1.05 and 1.7, over the screens', () => {
    for (const w of ['w', 'e'] as const) {
      for (const h of HEADS) {
        for (const x of [47, 49, 51, 53, 55]) expect(sees(w, x, h, A2_CROSS_Z), `${w} sees the crossing (${x}, ${h}, ${A2_CROSS_Z})`).toBe(true);
        expect(sees(w, 51, h, 10), `${w} sees the neck's middle at ${h}`).toBe(true);
      }
    }
    for (const x of [46, 56]) {
      for (const z of [7.5, A2_CROSS_Z]) {
        for (const h of HEADS) expect(['w', 'e'].some((w) => sees(w as 'w' | 'e', x, h, z)), `a watcher sees the lane mouth (${x}, ${h}, ${z})`).toBe(true);
      }
    }
    // teeth: a fake wall on the screen's line at 3 m over the deck blinds them
    const wall: BoxPiece = { c: [51, A2_DECK.lip + 2.5, 17.7], s: [20, 3, 0.2], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true };
    expect(sees('w', 51, 1.7, A2_CROSS_Z, [...blockers, wall])).toBe(false);
  });

  it('the taught waits are out of view of both watchers at head heights 1.05 and 1.7: the west gap 2/3 (x 41 and west of it, the centre line to x 43), the cabin corner and cabinet 2\'s spot (the vans, the cabin and the east rake hide them)', () => {
    const waits: [string, number, number][] = [];
    for (const x of [41, 40, 39, 37.5]) for (const z of [11.6, 12.5, 13.4]) waits.push([`west gap 2/3 (${x}, ${z})`, x, z]);
    // (on the centre line the shadow reaches x 43; along the gap's south side the east watcher looks in diagonally from x 42)
    for (const x of [43, 42]) waits.push([`west gap 2/3 centre (${x}, ${A2_CROSS_Z})`, x, A2_CROSS_Z]);
    waits.push(['cabin corner', 28.95, 4.25], ['cabinet 1 spot', A2_CAB1.x, 2.6], ['cabinet 2 spot', 68.8, A2_CAB2.z], ['cabinet 2 apron', 68.4, 12.4]);
    for (const [name, x, z] of waits) {
      for (const w of ['w', 'e'] as const) {
        for (const h of HEADS) expect(sees(w, x, h, z), `${w} sees ${name} at ${h}`).toBe(false);
      }
    }
  });

  it('soloJumpThreats stays empty with the closures in (their tops, 2.5 m and 4.4 m, are noLedge and far from the loading edge)', () => {
    expect(soloJumpThreats(solid, LIP)).toEqual([]);
    for (const p of closures) expect(p.noLedge).toBe(true);
  });

  it('X3: road 2\'s east wheel stop is gone: five stops, nothing 0.3 m tall in x 66-70 across the L2 door\'s width (z 9.1-10.9), and the approach is open floor along z 9.4, 10 and 10.6 from the east rake\'s end to the wall', () => {
    const stops = grey.filter((p) => p.collide && Math.abs(top(p) - 0.3) < 1e-6);
    expect(stops).toHaveLength(5);
    expect(stops.filter((p) => p.c[0] + p.s[0] / 2 > 66 && p.c[2] + p.s[2] / 2 > 9.1 && p.c[2] - p.s[2] / 2 < 10.9)).toEqual([]);
    for (const z of [9.4, 10, 10.6]) expect(walkBlocked(66.4, z, 69.7, z), `L2 door approach at z ${z}`).toBeNull();
    // teeth: the old stop (x 68.6-69.4, z 9.2-10.8, 0.3 m) put back blocks the same walks
    const old: BoxPiece = { c: [69, 0.15, 10], s: [0.8, 0.3, 1.6], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true };
    for (const z of [9.4, 10, 10.6]) {
      const xs = Array.from({ length: 34 }, (_, k) => 66.4 + k * 0.1);
      expect(xs.some((x) => touching([...solid, old], x, z)), `old stop at z ${z}`).toBe(true);
      expect(xs.some((x) => touching(solid, x, z)), `no stop at z ${z}`).toBe(false);
    }
    // the other five stops are where they were: road 1 and road 3 at both ends, road 2's west end
    const spots = stops.map((p) => [Number(p.c[0].toFixed(1)), p.c[2]]).sort((p, q) => p[0]! - q[0]! || p[1]! - q[1]!);
    expect(spots).toEqual([[33, 5], [33, 10], [33, 15], [69, 5], [69, 15]]);
  });
});
