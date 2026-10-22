/**
 * A2 the Carriage Shed (marlow-final slice 2; set doc `docs/marlow-final/sets/a2CarriageShed.md`): the set's own cases. The
 * staging's loading edge is the one co-op lip (in the band, no solo jump reaches it, the leg-up from the mark takes it), every
 * lamp is on its circuit and the isolator darkens the neck (the tuned light levels) and brings it back, the timed gate runs its
 * window and refuses a press while it re-arms, one player alone cannot press and cross, the shunter is an armed `grunt` on a
 * walkable timed loop inside the lure range, the steps validate and read per player, the role claim is cabinet 1. The map-wide
 * frames (`tests/ctcourse.test.ts`, `tests/ctcourseLight.test.ts`) run the contract, the register and the light bands over this
 * part too.
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
import {
  A2_BACK_DOOR,
  A2_CAB1,
  A2_CAB2,
  A2_CABIN,
  A2_CABIN_DOOR,
  A2_DECK,
  A2_EAST1_FLAG,
  A2_EAST_FLAG,
  A2_EAST_ZONE,
  A2_GATE,
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
} from '../../src/world/maps/ctcourseSets/a2CarriageShed';
import { checkSetPart, inBox, OBJECTIVE_ID_MAX, registerSum, SET_BOX } from '../../src/world/maps/ctcourseSets/types';
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
    // 15 lamps (LIGHTING-PLAN 3: shed 6, neck 4, cabin 1, staging 4), the cabin's two doors, the staging's one manual ledge
    expect(sum.lights).toBe(15);
    expect(sum.solids).toBe(27);
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

  it('the roads, vans and wheel stops are the plan: six 10 x 2.6 x 3.4 noLedge vans on 5 m centres (2.4 m gaps), six 0.3 m stops, gravel strips and a metal deck', () => {
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
    const stops = mine.filter((p) => p.collide && Math.abs(top(p) - 0.3) < 1e-6);
    expect(stops).toHaveLength(6);
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
    const steps = mine.filter((p) => !p.collide && p.s[1] > 0.1 && p.c[0] > 62 && p.c[0] < 70);
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
    // B's way to cabinet 2 from the east rake's walkway is open and ready inside the re-arm (window 15 + 3 s)
    const east: [number, number][] = [[56, 16.9], [67.2, 16.9], [67.2, A2_CAB2.z], [68.8, A2_CAB2.z]];
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

  it('every line fits 90 characters, no em or en dash; ids fit the wire; the radio is the doc\'s three lines', () => {
    for (const o of def.objectives!.filter((x) => x.bay === 'A2')) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(/[–—]/.test(t), t).toBe(false);
      }
      expect(o.id.length).toBeLessThanOrEqual(OBJECTIVE_ID_MAX);
    }
    expect(part.bay.radio.map((r) => r.at)).toEqual(['enter', 'enter', `warn:${A2_GATE}`]);
    for (const r of part.bay.radio) {
      expect(r.text.length, r.text).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(r.text), r.text).toBe(false);
    }
    expect(part.bay.radio[2]!.text).toBe('Lights back in five.');
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
    expect(at('A2 neck crossing cut')).toMatchObject({ x: 51, z: 16.9 });
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

  it('is the bay\'s one guard: an armed kind (grunt) on a patrol loop from his post (51, 10) facing west, inside the set', () => {
    expect(part.bay.squad).toEqual([A2_SHUNTER]);
    expect(Object.keys(part.squads)).toEqual([A2_SHUNTER]);
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
    expect(walkLoop([4, 0, 3, 0], 130).stuck).toBe(true);
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
