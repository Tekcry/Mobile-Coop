/**
 * A6 the Pump House (marlow-final slice 6; set doc `docs/marlow-final/sets/a6PumpHouse.md`): the set's own cases. The motor
 * gallery's loading edge is the one co-op lip (in the band, no solo jump reaches it, the leg-up from the mark takes it, the rope
 * serves its 4.4 m drop); the hang-down through the gland plate is the only way to the drive panel (out of reach from outside the
 * cage and from the deck and bridge, reached from the hang at some depth, from the cage floor only after a drop); the outfall door
 * opens only on `a6-drive`; every lamp is on its circuit (the tuned levels: the dark west end and sump, the lit east end, the
 * holder lit by 61 and dark without it, the lit cage); the attendant is an armed `grunt` on a walkable timed loop whose west half
 * is inside the panel's buzzer; the steps validate and read per player, the claim is the gallery zone. The map-wide frames
 * (`tests/ctcourse.test.ts`, `tests/ctcourseLight.test.ts`) run the contract, the register and the light bands over this part too. The last block is the
 * dressing (slice 6 step 5): the greybox pinned, the staff stair's open-side rail (S567-check polish 2), hand-built skins out of the light
 * shapes, the budgets, the props' boxes and keep-clear rules, the routes left clear, every kit glow on its circuit, the devices and marks
 * left uncovered.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/ai/enemyDefs';
import { PatrolWalker } from '../../src/ai/patrol';
import { noiseSuspicion } from '../../src/ai/perception';
import { generateLedges, findJumpTarget, type Ledge } from '../../src/world/anchors';
import { LevelBuilder, type BoxPiece } from '../../src/world/levelBuilder';
import { surfaceAt } from '../../src/world/surfaces';
import { MOVEMENT, TEAM, WALL_JUMP } from '../../src/config/movement';
import { COURSE_TEXT_MAX } from '../../src/config/course';
import { layoutKnownIds, validateCourse } from '../../src/game/course/courseDef';
import { CourseState } from '../../src/game/course/courseState';
import { hangDepthMax, hangPointOk, hangReaches, ropeRoom } from '../../src/game/teamMoves';
import { hyp2 } from '../../src/core/mathx';
import { buildCtcourse, COOP_LIPS, LIGHT_SPOTS } from '../../src/world/maps/ctcourse';
import { coopDeck, COOP_BAND, GREY_KEEP_CLEAR, hangPlate, INTERACT_DY, INTERACT_REACH } from '../../src/world/maps/ctcourseGreybox';
import { kitTriangles } from '../../src/world/kit/facilityKit';
import { FacilityProps, propGlows, PROP_LAMP_TINT, PROP_OWN_SUPPLY, propCollisionBox, propDraws, propToWorld, propTriangles, PROP_FOOTPRINT, PROP_SET_BUDGET, type PropReport } from '../../src/world/props/facilityProps';
import { CANON_MIN_THICK } from '../../src/voxel/lightShapes';
import { GAL_TOP } from '../../src/world/maps/ctcourseSets/facility';
import {
  A6_ATTENDANT,
  A6_ATTENDANT_FACES,
  A6_ATTENDANT_ROUTE,
  A6_ATTENDANT_WAITS,
  A6_BRIDGE,
  A6_CAGE,
  A6_CAGE_DOOR,
  A6_CRANE,
  A6_DEAD_FITTINGS,
  A6_DECK,
  A6_DESK,
  A6_DRIVE_FLAG,
  A6_EXIT,
  A6_EXIT_GATE,
  A6_GAL_FLAG,
  A6_G_FLOOR,
  A6_G_GALLERY,
  A6_G_TAGGED,
  A6_GAL_ZONE,
  A6_HANG,
  A6_HOLD,
  A6_HOLD_NOISE,
  A6_HOLDER,
  A6_INTERLOCK,
  A6_KERB,
  A6_LIP_X,
  A6_MARK,
  A6_OUTFALL_DOOR,
  A6_OUTFALL_GATE,
  A6_PANEL,
  A6_PANEL_GATE,
  A6_PASS_WAIT,
  A6_PIPES,
  A6_PLATE,
  A6_PUMP,
  A6_PUMPS,
  A6_ROPE,
  A6_RUNNER,
  A6_SCREENS,
  A6_SHELL,
  A6_STAIR_FILL,
  A6_STAIR_RAIL,
  A6_SWITCH_COLUMN,
  A6_VANTAGE,
} from '../../src/world/maps/ctcourseSets/a6PumpHouse';
import { checkSetPart, inBox, OBJECTIVE_ID_MAX, registerSum, SET_BOX, setGroups } from '../../src/world/maps/ctcourseSets/types';
import { circuitOf, LURE_RANGE, marlowCourseGroups } from '../../src/world/lighting/marlowCircuits';
import { MARLOW_LEVEL } from '../../src/world/lighting/levels';
import { soloJumpThreats } from '../helpers/soloJumpReach';

const b = new LevelBuilder();
const built = buildCtcourse(b);
const part = built.parts[5]!;
const lay = built.layout;
const course = lay.course!;
const def = course.def;
const range = built.ranges.a6PumpHouse;
const mine = b.boxes.slice(range.boxes[0], range.boxes[1]);
/** The greybox as S6 built it (slice 6 steps 2-4): its 78 boxes (45 solids), 8 lamps, 1 door, the manual ledge. The dressing is appended after. */
const GREY = { boxes: 78, solids: 45, lights: 8, doors: 1, anchors: 1, checksum: 29740.0379991399 };
const grey = mine.slice(0, GREY.boxes);
const dressing = mine.slice(GREY.boxes);
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
const box = SET_BOX.a6PumpHouse[0]!;
const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && inBox(box, l.x, l.z));
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const LIP = part.lips[0]!;
const tuned = (JSON.parse(readFileSync('tests/ctcourse/a6PumpHouse.light.json', 'utf8')) as { levels: Record<string, number> }).levels;
/** The anchors the game builds over the whole map plus the helpers' manual ledges (the leg-up search reads both). */
const anchors = generateLedges(b.boxes, b.anchors);
const panel = part.devices[A6_PANEL]!;
const exit = part.devices[A6_EXIT]!;
const deck = A6_HANG.deck;

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
const solidAt = (x: number, y: number, z: number, from: readonly BoxPiece[] = solid): boolean =>
  from.some((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2);
/** A fresh course at set 6 with the two players at the given feet (y 0 unless given). */
function runAt(a: [number, number, number?], c: [number, number, number?]): CourseState {
  const s = new CourseState(def, course.consoles);
  s.startAt(6);
  s.setPlayer(0, a[0], a[2] ?? 0, a[1], false);
  s.setPlayer(1, c[0], c[2] ?? 0, c[1], false);
  s.update(1 / 60);
  return s;
}
/** The outside ring of the cage: every body centre a radius off its outer faces (the closest a player outside can stand). */
function cageRing(): [number, number][] {
  const [x0, z0, x1, z1] = A6_CAGE;
  const r = MOVEMENT.radius;
  const out: [number, number][] = [];
  for (let x = x0 - r; x <= x1 + r + 1e-9; x += 0.05) out.push([x, z0 - r], [x, z1 + r]);
  for (let z = z0 - r; z <= z1 + r + 1e-9; z += 0.05) out.push([x0 - r, z], [x1 + r, z]);
  return out;
}

describe('A6 the Pump House: the part', () => {
  it('is built (not the stub) and passes the contract rules', () => {
    expect(part.id).toBe('a6PumpHouse');
    expect(part.stub).toBeUndefined();
    expect(checkSetPart(part)).toEqual([]);
  });

  it("every register row is an A6 row; the lamps, solids, doors and anchors they count are the builder's", () => {
    expect(part.register.every((r) => r.id.startsWith('A6-'))).toBe(true);
    expect(part.register.map((r) => r.id).sort()).toEqual(Array.from({ length: 25 }, (_, i) => `A6-${i + 1}`).sort());
    const sum = registerSum(part.register);
    expect(sum).toEqual(built.counts.sets.a6PumpHouse);
    // 8 lamps (60: 3, 61: 3, 62: 1, 63: 1), the cage door, the gallery's one manual ledge
    expect(sum.lights).toBe(8);
    expect(sum.doors).toBe(1);
    expect(sum.anchors).toBe(1);
    expect(sum.solids).toBe(mine.filter((p) => p.collide).length);
    for (const r of part.register) expect(/[–—]/.test(r.element), r.id).toBe(false);
  });

  it('everything built lies inside the set box (0.3 m of wall slack) and under the hall roof', () => {
    const [x0, z0, x1, z1] = box;
    expect(mine.length).toBeGreaterThan(40);
    for (const p of mine.filter((q) => Math.abs(q.yaw) < 1e-3 && Math.abs(q.pitch) < 1e-3)) {
      expect(p.c[0] - p.s[0] / 2, 'west').toBeGreaterThanOrEqual(x0 - 0.3);
      expect(p.c[0] + p.s[0] / 2, 'east').toBeLessThanOrEqual(x1 + 0.3);
      expect(p.c[2] - p.s[2] / 2, 'south').toBeGreaterThanOrEqual(z0 - 0.3);
      expect(p.c[2] + p.s[2] / 2, 'north').toBeLessThanOrEqual(z1 + 0.3);
      expect(top(p)).toBeLessThanOrEqual(10 + 1e-6);
    }
  });

  it('the pumps are the plan: three 2.4 m plinths 1.2 high and 1.2 m motors to 4.0 at x 60 / 56 / 46, z 61, every piece noLedge (4.0 is in the 3.8-4.5 band)', () => {
    for (const [x, z] of A6_PUMPS) {
      const at = mine.filter((p) => p.collide && Math.abs(p.c[0] - x) < 1e-6 && Math.abs(p.c[2] - z) < 1e-6);
      expect(at.map((p) => Number(top(p).toFixed(3))).sort()).toEqual([A6_PUMP.plinthH, A6_PUMP.top]);
      for (const p of at) expect(p.noLedge, `pump at ${x}`).toBe(true);
      const plinth = at.find((p) => Math.abs(top(p) - A6_PUMP.plinthH) < 1e-6)!;
      expect(plinth.s[0]).toBeCloseTo(A6_PUMP.plinth, 9);
      expect(plinth.s[2]).toBeCloseTo(A6_PUMP.plinth, 9);
    }
    expect(A6_PUMPS[2]).toEqual([46, 61]);
    // surfaces: the pump floor quiet concrete, the sump plate, the gallery and the bridge chequer plate (all loud metal)
    expect(surfaceAt(b.surfaces, 58, 0, 64, 'concrete')).toBe('concrete');
    expect(surfaceAt(b.surfaces, 53, 0, 56, 'concrete')).toBe('metal');
    expect(surfaceAt(b.surfaces, 47, 4.4, 70.6, 'concrete')).toBe('metal');
    expect(surfaceAt(b.surfaces, 51.5, 4.4, 67, 'concrete')).toBe('metal');
  });
});

describe('A6 the Pump House: the motor gallery (the co-op lip, the leg-up, the rope)', () => {
  it('the one planned lip is the open loading edge x 40.8-45.3 at 4.4 m: in COOP_BAND, on COOP_LIPS, normal -z, at the deck front z 69.6', () => {
    expect(part.lips.map((l) => l.id)).toEqual(['a6-gallery-lip']);
    expect(LIP.y - LIP.floor).toBeCloseTo(A6_DECK.lip, 9);
    expect(LIP.y - LIP.floor).toBeGreaterThanOrEqual(COOP_BAND.min);
    expect(LIP.y - LIP.floor).toBeLessThanOrEqual(COOP_BAND.max);
    expect(LIP.y - LIP.floor).toBeGreaterThan(WALL_JUMP.maxUp);
    expect(COOP_LIPS).toContainEqual(LIP);
    expect(LIP.n.x).toBeCloseTo(0, 9);
    expect(LIP.n.z).toBeCloseTo(-1, 9);
    expect([LIP.a.x, LIP.b.x].sort((p, q) => p - q)).toEqual(A6_LIP_X);
    expect(LIP.a.z).toBeCloseTo(A6_DECK.z, 9);
    expect(A6_DECK.lip).toBeLessThanOrEqual(TEAM.relayMax);
  });

  it('no solo jump reaches the lip: soloJumpThreats is empty over every solid in the map (pumps, kerb, desk, cage, bridge, stair fillers included)', () => {
    expect(soloJumpThreats(solid, LIP)).toEqual([]);
  });

  it('the check has teeth: a 1.8 m crate on the dark west floor within the running jump threatens the lip, one at GREY_KEEP_CLEAR does not', () => {
    const crate = (gap: number): BoxPiece => ({ c: [43, 0.9, A6_DECK.z - gap - 0.5], s: [1, 1.8, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true });
    expect(soloJumpThreats([...solid, crate(2.5)], LIP).length).toBeGreaterThan(0);
    expect(soloJumpThreats([...solid, crate(GREY_KEEP_CLEAR)], LIP)).toEqual([]);
  });

  it('every block 1.9 m or taller is noLedge; nothing over 0.3 m stands on the floor within the keep-clear of the open edge', () => {
    for (const p of mine.filter((q) => q.collide && Math.abs(q.yaw) < 1e-3 && Math.abs(q.pitch) < 1e-3)) {
      if (top(p) >= 1.9) expect(p.noLedge, `box at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBe(true);
    }
    // the floor side of the open edge: x 36-50, z 64.9-69.6 (the set doc's 4.7 m keep-clear) holds nothing standable
    const near = solid.filter((p) => top(p) > 0.3 && p.c[1] - p.s[1] / 2 < 0.3 && inBox(box, p.c[0], p.c[2]));
    const inKeep = near.filter((p) => p.c[0] + p.s[0] / 2 > 36 && p.c[0] - p.s[0] / 2 < A6_LIP_X[1] + GREY_KEEP_CLEAR && p.c[2] + p.s[2] / 2 > A6_DECK.z - GREY_KEEP_CLEAR && p.c[2] - p.s[2] / 2 < A6_DECK.z);
    // the cage's west wall (to the slab, noLedge) and the deck block itself are the only pieces there: neither has a standable top under the lip
    for (const p of inKeep) expect(p.noLedge && (top(p) >= A6_DECK.lip - 0.4 - 1e-6), `box at (${p.c.join(', ')})`).toBe(true);
  });

  it('the only grip the game offers in A6 above a body is the planned lip: no generated lip over 0.9 m, one manual ledge on the open span', () => {
    const generated = anchors.ledges.filter((l) => l.piece !== 0 && inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3) && l.top >= 0.9);
    expect(generated.map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
    const manual = anchors.ledges.filter((l) => l.piece === 0 && inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3));
    expect(manual).toHaveLength(1);
    const l = manual[0]!;
    expect(l.top).toBeCloseTo(A6_DECK.lip, 9);
    expect([l.a.x, l.b.x].sort((p, q) => p - q)).toEqual(A6_LIP_X);
    expect(l.a.z).toBeCloseTo(A6_DECK.z, 9);
    expect(l.nz).toBeCloseTo(-1, 9);
    expect(l.canClimbUp).toBe(true);
  });

  const g = coopDeck({ id: 'a6-gallery', at: { x: A6_DECK.x, z: A6_DECK.z }, facing: '+z', span: A6_DECK.span, depth: A6_DECK.depth, lip: A6_DECK.lip, open: A6_DECK.open, screen: 1.2, stair: 'end', stairW: 1.2, rope: A6_DECK.rope });

  it('the leg-up from the mark (0.5 m off the deck face, x 43.05) takes the loading edge; there is room beside and over the booster', () => {
    const spot = g.spots.find((s) => s.kind === 'legUp')!;
    expect(spot.x).toBeCloseTo(A6_MARK.x, 9);
    expect(spot.z).toBeCloseTo(A6_MARK.z, 9);
    const t = findJumpTarget(anchors, { x: spot.x, y: TEAM.boostMax - 1.15, z: spot.z }, -1, 0, 1, 1, 2.2, 0.2);
    expect(t).not.toBeNull();
    const l = t!.anchor as Ledge;
    expect(l.kind).toBe('ledge');
    expect(l.piece).toBe(0);
    expect(l.top).toBeCloseTo(A6_DECK.lip, 9);
    for (const dx of [-TEAM.roomSide, TEAM.roomSide]) expect(blockedAt(spot.x + dx, spot.z, MOVEMENT.radius)).toEqual([]);
    expect(solid.filter((p) => top(p) > 0.15 && p.c[1] - p.s[1] / 2 < TEAM.roomUp && Math.abs(p.c[0] - spot.x) < p.s[0] / 2 && Math.abs(p.c[2] - spot.z) < p.s[2] / 2)).toEqual([]);
    expect(mine.some((p) => !p.collide && Math.abs(p.c[0] - spot.x) < 0.01 && Math.abs(p.c[2] - spot.z) < 0.01)).toBe(true);
  });

  it('the rescue line serves the 4.4 m drop: the holder spot (43.15, 4.4, 70.2) has open air ahead over the floor, the climber at its foot is within the rope reach on clear floor', () => {
    expect(ropeRoom(A6_DECK.lip, 0)).toBe('ok');
    const rope = g.spots.find((s) => s.kind === 'rope')!;
    const runner = g.spots.find((s) => s.kind === 'runner')!;
    expect([rope.x, rope.y, rope.z]).toEqual([expect.closeTo(A6_ROPE.x, 9), A6_ROPE.y, expect.closeTo(A6_ROPE.z, 9)]);
    expect(runner.x).toBeCloseTo(A6_RUNNER.x, 9);
    expect(runner.z).toBeCloseTo(A6_RUNNER.z, 9);
    expect(hyp2(rope.x - runner.x, rope.z - runner.z)).toBeLessThanOrEqual(TEAM.ropeReach);
    expect(blockedAt(runner.x, runner.z)).toEqual([]);
    // no screen and nothing solid in front of the holder at waist height; the floor 4.4 m under the edge
    for (let d = 0.3; d <= 1.2 + 1e-9; d += 0.1) expect(solidAt(rope.x, deck + 0.5, rope.z - d), `${d}`).toBe(false);
    expect(solidAt(rope.x, deck - 0.2, rope.z)).toBe(true);
    expect(solidAt(rope.x, 2.0, A6_DECK.z - 0.3)).toBe(false);
    // the davit box stands behind the holder, not on the spot
    expect(blockedAt(rope.x, rope.z).length).toBeGreaterThan(0); // (the deck block itself)
    expect(solid.filter((p) => p.c[1] - p.s[1] / 2 >= deck - 1e-6 && p.c[1] - p.s[1] / 2 < deck + 2 && hyp2(Math.max(Math.abs(rope.x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(rope.z - p.c[2]) - p.s[2] / 2, 0)) < MOVEMENT.radius)).toEqual([]);
  });

  it('the deck is one solid block x 40.3-56.0, z 69.6-71.775, 4.4 m; screens on x 40.3-40.8, 45.3-49.0 and 54.0-56.0 (the bridge opening x 49-54 left open); the 27-riser stair x 56.0-63.7', () => {
    const block = mine.find((p) => p.collide && Math.abs(top(p) - 4.4) < 1e-6 && p.c[1] < 3 && p.s[0] > 15)!;
    expect(block.c[0] - block.s[0] / 2).toBeCloseTo(40.3, 9);
    expect(block.c[0] + block.s[0] / 2).toBeCloseTo(56.0, 9);
    expect(block.c[2] - block.s[2] / 2).toBeCloseTo(69.6, 9);
    expect(block.c[2] + block.s[2] / 2).toBeCloseTo(71.775, 9);
    expect(block.noLedge).toBe(true);
    const screens = mine.filter((p) => p.collide && Math.abs(p.s[1] - 1.2) < 1e-6 && Math.abs(p.c[1] - 5.0) < 1e-6);
    expect(screens.map((p) => [p.c[0] - p.s[0] / 2, p.c[0] + p.s[0] / 2].map((v) => Number(v.toFixed(3))))).toEqual(A6_SCREENS.map((s) => [...s]));
    for (const p of screens) expect(p.noLedge).toBe(true);
    // the bridge opening: nothing over the deck's front between x 49 and 54
    for (let x = 49.1; x < 53.95; x += 0.1) expect(solidAt(x, 5.0, 69.65), `x ${x.toFixed(2)}`).toBe(false);
    const steps = grey.filter((p) => !p.collide && p.s[1] > 0.1 && p.c[0] > 56 && p.c[0] < 64 && p.c[2] > 70.5);
    expect(steps).toHaveLength(27);
    expect(Math.max(...steps.map(top))).toBeCloseTo(4.4, 9);
    expect(4.4 / 27).toBeLessThanOrEqual(MOVEMENT.maxStep);
    expect(mine.some((p) => p.collide && Math.abs(p.pitch) > 1e-3)).toBe(true);
  });

  it("the staff stair's underside is closed: every point under the flight's ramp is inside a filler; without the fillers the same space is open (teeth)", () => {
    const flight = g.stairs[0]!;
    const xFoot = flight.x + flight.len / 2;
    const xHead = flight.x - flight.len / 2;
    expect(xHead).toBeCloseTo(56.0, 9);
    expect(xFoot).toBeCloseTo(63.695, 6);
    const lineAt = (x: number): number => (flight.rise * (xFoot - x)) / flight.len;
    const fillers = mine.filter((p) => p.collide && p.visible === false && Math.abs(p.pitch) < 1e-3 && p.c[0] > 55.9 && p.c[2] > 70.5);
    expect(fillers.length).toBeGreaterThan(10);
    for (const f of fillers) expect(f.noLedge).toBe(true);
    let n = 0;
    let open = 0;
    for (let x = xHead + 0.05; x < xFoot - 0.05; x += 0.25)
      for (let z = flight.z - flight.w / 2 + 0.05; z < A6_SHELL.north - 0.02; z += 0.25)
        for (let y = 0.05; y <= lineAt(x) - 0.35; y += 0.25) {
          n++;
          expect(solidAt(x, y, z, fillers), `(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`).toBe(true);
          if (!solidAt(x, y, z, solid.filter((p) => !fillers.includes(p)))) open++;
        }
    expect(n).toBeGreaterThan(300);
    expect(open).toBeGreaterThan(n / 2);
    // a filler never stands over the line a body walks on (its top under the nosing line at its low end)
    for (const f of fillers) {
      expect(top(f)).toBeCloseTo(lineAt(f.c[0] + f.s[0] / 2) - A6_STAIR_FILL.gap, 6);
      expect(f.s[0]).toBeLessThanOrEqual(A6_STAIR_FILL.step + 1e-6);
    }
  });
});

describe('A6 the Pump House: the hang-down is the only way to the drive panel', () => {
  const gh = hangPlate({ id: 'a6', at: { x: A6_HANG.x, z: A6_HANG.z }, facing: '-z', deck, slab: A6_HANG.slab, cage: A6_HANG.cage, overhang: A6_HANG.overhang, hole: A6_HANG.hole, hold: A6_HOLD });

  it('the bridge is 5 m (x 49-54) over a 4.2 m cage with a 0.4 m overhang (A6-D1); the panel faces the plate, the exit release is on the cabinet\'s back (A6-D2)', () => {
    expect(A6_BRIDGE[2] - A6_BRIDGE[0]).toBeCloseTo(5, 9);
    expect(A6_CAGE[2] - A6_CAGE[0]).toBeCloseTo(4.2, 9);
    expect(A6_CAGE[3] - A6_CAGE[1]).toBeCloseTo(4.2, 9);
    expect(A6_CAGE[0] - A6_BRIDGE[0]).toBeCloseTo(0.4, 9);
    expect([panel.x, panel.y, panel.z]).toEqual([51.5, 1.2, expect.closeTo(64.42, 9)]);
    expect(panel.yaw).toBeCloseTo(0, 9);
    expect([exit.x, exit.y, exit.z]).toEqual([51.5, 1.1, expect.closeTo(63.78, 9)]);
    expect(Math.abs(exit.yaw)).toBeCloseTo(Math.PI, 9);
    expect(panel.hold).toBe(A6_HOLD);
    expect(panel.holdNoise).toBe(A6_HOLD_NOISE);
    expect(exit.hold).toBeUndefined();
    // the helper's own plate and holder spot are the plan's
    expect(gh.spots.find((s) => s.kind === 'hold')).toMatchObject({ x: A6_HOLDER.x, y: deck, z: expect.closeTo(A6_HOLDER.z, 9) });
  });

  it('the cage is closed at body height and to the slab, but for its locked door; the plate passes no body; the bridge has no lip', () => {
    const [x0, z0, x1, z1] = A6_CAGE;
    const wt = 0.05;
    const inDoor = (x: number, z: number, y: number): boolean => Math.abs(z - z0) < 0.2 && Math.abs(x - A6_HANG.x) < 0.6 - 1e-3 && y < 2.1;
    for (let s = 0.02; s <= 4.18 + 1e-9; s += 0.1)
      for (let y = 0.05; y < deck - A6_HANG.slab; y += 0.25)
        for (const [x, z] of [[x0 + wt, z0 + s], [x1 - wt, z0 + s], [x0 + s, z0 + wt], [x0 + s, z1 - wt]] as const) {
          if (inDoor(x, z, y)) continue;
          expect(solidAt(x, y, z), `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`).toBe(true);
        }
    const door = b.anchors.doors.find((d) => d.id === course.doors[A6_CAGE_DOOR])!;
    expect(door.locked).toBe(true);
    expect(door.width).toBeCloseTo(1.2, 9);
    expect(Object.keys(part.doors)).toEqual([A6_CAGE_DOOR]);
    // the slab over the cage is solid but for the plate, which is under a body's width
    const hole = A6_HANG.hole;
    for (let x = x0; x <= x1 + 1e-9; x += 0.1)
      for (let z = z0; z <= z1 + 1e-9; z += 0.1) {
        const inHole = Math.abs(x - A6_PLATE.x) < hole / 2 - 1e-3 && Math.abs(z - A6_PLATE.z) < hole / 2 - 1e-3;
        expect(solidAt(x, deck - 0.2, z), `${x.toFixed(2)}, ${z.toFixed(2)}`).toBe(!inHole);
      }
    expect(hole).toBeLessThan(2 * MOVEMENT.radius);
    // the bridge slab: noLedge, overhead, with handrails on both sides and the south end
    for (const p of mine.filter((q) => q.collide && Math.abs(top(q) - deck) < 1e-6 && q.c[0] > A6_BRIDGE[0] - 1e-6 && q.c[0] < A6_BRIDGE[2] + 1e-6 && q.c[2] < A6_BRIDGE[3])) {
      expect(p.noLedge).toBe(true);
      expect(p.overhead).toBe(true);
    }
    const rails = mine.filter((p) => p.collide && p.visible === false && Math.abs(p.c[1] - (deck + 0.55)) < 1e-6);
    expect(rails).toHaveLength(3);
    for (const r of rails) expect(r.noLedge).toBe(true);
  });

  it('the holder at the striped spot finds the drop through the plate (the game probe on the map) and the hang reaches the panel at some depth, not at the start depth', () => {
    const ray = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): boolean => {
      for (let k = 0; k <= 200; k++) if (solidAt(x0 + ((x1 - x0) * k) / 200, y0 + ((y1 - y0) * k) / 200, z0 + ((z1 - z0) * k) / 200)) return true;
      return false;
    };
    const hold = { x: A6_HOLDER.x, z: A6_HOLDER.z };
    // the holder faces south (-z): `TeamController.hangPoint` probes 0.4 / 0.7 / 1.0 m ahead, the air clear at the waist, no floor within hangDrop
    let hp: { x: number; z: number } | null = null;
    for (let d = 0.4; d <= TEAM.hangProbe + 1e-3 && !hp; d += 0.3) {
      const z = hold.z - d;
      expect(ray(hold.x, deck + 0.5, hold.z, hold.x, deck + 0.5, z)).toBe(false);
      if (ray(hold.x, deck + 0.5, z, hold.x, deck - TEAM.hangDrop, z)) continue;
      const hz = z - 0.15;
      hp = ray(hold.x, deck + 0.5, hz, hold.x, deck - TEAM.hangDrop, hz) ? { x: hold.x, z } : { x: hold.x, z: hz };
    }
    expect(hp).not.toBeNull();
    expect(hangPointOk(hold.x, deck, hold.z, hp!.x, deck, hp!.z)).toBe(true);
    // the hanging body clears the cabinet (its north face at z 64.4)
    expect(hp!.z - 64.4).toBeGreaterThanOrEqual(MOVEMENT.radius - 0.01);
    const max = hangDepthMax(deck, 0);
    let reached = false;
    for (let d = TEAM.hangMin; d <= max + 1e-9; d += 0.05) if (hangReaches(hp!.x, hp!.z, deck, d, panel.x, panel.y, panel.z)) reached = true;
    expect(reached).toBe(true);
    expect(hangReaches(hp!.x, hp!.z, deck, TEAM.hangStart, panel.x, panel.y, panel.z)).toBe(false);
  });

  it('the panel and the exit release are out of reach from every body outside the cage and from the deck and bridge; in reach from the cage floor (the fallback after a drop)', () => {
    for (const dv of [panel, exit]) {
      for (const [x, z] of cageRing()) expect(hyp2(dv.x - x, dv.z - z), `${x.toFixed(2)}, ${z.toFixed(2)}`).toBeGreaterThanOrEqual(INTERACT_REACH);
      // the bridge and the gallery are 4.4 m up: 3.2 m over the panel, past the interact band
      expect(Math.abs(deck - dv.y)).toBeGreaterThan(INTERACT_DY);
      // a dropped player on the cage floor beside the cabinet
      expect(hyp2(dv.x - (A6_HANG.x + 0.6), dv.z - 64.9)).toBeLessThan(INTERACT_REACH);
      expect(Math.abs(dv.y)).toBeLessThan(INTERACT_DY);
    }
    // the course devices' own reach (1.4, `courseMode.device`) is shorter still
    const closest = Math.min(...cageRing().map(([x, z]) => hyp2(panel.x - x, panel.z - z)));
    expect(closest).toBeGreaterThan(1.4 + 0.5);
  });

  it('the check has teeth: a release by the door (the SPEC push-bar, 0.3 m inside the door face) would be in reach from the attendant\'s path outside', () => {
    const byDoor = { x: A6_HANG.x, z: A6_CAGE[1] + 0.3 };
    expect(cageRing().some(([x, z]) => hyp2(byDoor.x - x, byDoor.z - z) < INTERACT_REACH)).toBe(true);
    expect(walkBlocked(54.2, 61.2, 48.2, 61.0)).toBeNull();
    expect(hyp2(byDoor.x - A6_HANG.x, byDoor.z - 61.1)).toBeLessThan(INTERACT_REACH);
  });

  it('the gates: the panel (held) sets a6-drive, which alone unlocks the outfall door (L6 near); the exit release frees the cage door; a restart re-locks both', () => {
    expect(part.bay.gates).toEqual([
      { kind: 'pickup', id: A6_PANEL_GATE, switchId: A6_PANEL, flag: A6_DRIVE_FLAG, perPlayer: false },
      { kind: 'egress', id: A6_EXIT_GATE, switchId: A6_EXIT, doorIds: [A6_CAGE_DOOR] },
      { kind: 'flag', id: A6_OUTFALL_GATE, flag: A6_DRIVE_FLAG, doorId: A6_OUTFALL_DOOR },
    ]);
    expect(A6_OUTFALL_DOOR).toBe('L6-near');
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
    const s = runAt([51.5, 64.9], [51.5, 65.6, 4.4]);
    expect(s.locked(A6_OUTFALL_DOOR)).toBe(true);
    expect(s.locked(A6_CAGE_DOOR)).toBe(true);
    // nothing else opens the outfall: the gallery flag, the exit release
    s.setFlag(A6_GAL_FLAG);
    expect(s.press(A6_EXIT, 0)).toBeNull();
    s.update(1 / 60);
    expect(s.locked(A6_CAGE_DOOR)).toBe(false);
    expect(s.locked(A6_OUTFALL_DOOR)).toBe(true);
    expect(s.hasShared(A6_DRIVE_FLAG)).toBe(false);
    // the drive panel's (completed) hold
    expect(s.press(A6_PANEL, 0)).toBeNull();
    s.update(1 / 60);
    expect(s.hasShared(A6_DRIVE_FLAG)).toBe(true);
    expect(s.locked(A6_OUTFALL_DOOR)).toBe(false);
    expect(s.isStepDone('a6-hang')).toBe(true);
    // a restart (both down, or the host's checkpoint) re-locks the outfall door and the cage, and clears the flag
    s.restart();
    s.update(1 / 60);
    expect(s.hasShared(A6_DRIVE_FLAG)).toBe(false);
    expect(s.locked(A6_OUTFALL_DOOR)).toBe(true);
    expect(s.locked(A6_CAGE_DOOR)).toBe(true);
  });

  it('the buzzer (holdNoise 6 m, A6-D6): heard on the west half of his loop (the gap, pump 3), not at the desk or the gauge board', () => {
    const d = (p: readonly [number, number]): number => hyp2(p[0] - panel.x, p[1] - panel.z);
    const [post, w, gauge, gapN, gapS, p3] = A6_ATTENDANT_ROUTE;
    for (const p of [post!, w!, gauge!]) {
      expect(d(p), `${p.join(', ')}`).toBeGreaterThan(A6_HOLD_NOISE);
      expect(noiseSuspicion(d(p), A6_HOLD_NOISE)).toBe(0);
    }
    for (const p of [gapN!, gapS!, p3!]) {
      expect(d(p), `${p.join(', ')}`).toBeLessThan(A6_HOLD_NOISE);
      expect(noiseSuspicion(d(p), A6_HOLD_NOISE)).toBeGreaterThan(0.1);
    }
    expect(d(post!)).toBeCloseTo(10.35, 1);
  });
});

describe('A6 the Pump House: the steps, the claim, the pass zone', () => {
  const up = def.objectives!.find((o) => o.id === 'a6-up')!;
  const hang = def.objectives!.find((o) => o.id === 'a6-hang')!;

  it('three steps in route order: up (both on the gallery), the hang (a6-drive) and one closing line; A / B lines per player', () => {
    const steps = def.objectives!.filter((o) => o.bay === 'A6');
    expect(steps.map((o) => o.id)).toEqual(['a6-up', 'a6-hang', 'a6-lock']);
    expect(up.done).toEqual({ flag: A6_GAL_FLAG });
    expect(hang.done).toEqual({ flag: A6_DRIVE_FLAG });
    for (const o of [up, hang]) {
      expect(o.a).toBeDefined();
      expect(o.b).toBeDefined();
      expect(o.a).not.toBe(o.b);
      expect(o.timer).toBeUndefined();
    }
    expect(steps[2]!.done).toBeUndefined();
    expect(up.b).toMatch(/rescue line/);
    expect(hang.b).toMatch(/isolate key/);
    expect(hang.a).toMatch(/Hold your partner/);
  });

  it("every line fits 90 characters, no em or en dash; ids fit the wire; the radio is the doc's three lines", () => {
    for (const o of def.objectives!.filter((x) => x.bay === 'A6')) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(/[–—]/.test(t), t).toBe(false);
      }
      expect(o.id.length).toBeLessThanOrEqual(OBJECTIVE_ID_MAX);
    }
    expect(part.bay.radio.map((r) => r.at)).toEqual(['enter', 'enter', 'a6-hang']);
    for (const r of part.bay.radio) {
      expect(r.text.length, r.text).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(r.text), r.text).toBe(false);
    }
  });

  it('the first player onto the gallery or the bridge takes B (the hanger); until then the lead (P2, an even set) reads A; the floor under the bridge claims nothing; the first claim stands', () => {
    const s = runAt([51, 67], [43.05, 69.1]);
    expect(s.roleClaimed()).toBe(false);
    expect(s.roleOf(1)).toBe('a');
    expect(s.stepLine(up, 1)).toBe(up.a);
    expect(s.stepLine(up, 0)).toBe(up.b);
    // P1 under the bridge (in the zone's plan box, on the floor): no claim
    s.update(1 / 60);
    expect(s.roleClaimed()).toBe(false);
    // P1 boosted onto the open span: P1 is B, P2 is A
    s.setPlayer(0, 43.05, 4.4, 70.4, false);
    s.update(1 / 60);
    expect(s.roleClaimed()).toBe(true);
    expect(s.roleOf(0)).toBe('b');
    expect(s.roleOf(1)).toBe('a');
    expect(s.stepLine(hang, 0)).toBe(hang.b);
    // P2 climbs the rope after: the claim stands
    s.setPlayer(1, 43.15, 4.4, 70.2, false);
    s.update(1 / 60);
    expect(s.roleOf(0)).toBe('b');
    expect(part.bay.roles).toEqual([{ role: 'b', zone: { box: A6_GAL_ZONE, y0: 3.9 } }]);
  });

  it('the pass zone: both players on the gallery or the bridge (floor 4.4) set a6-gal and tick the climb; its flag is an external flag', () => {
    expect(part.passZones).toEqual([{ id: 'a6-p-gal', box: A6_GAL_ZONE, flag: A6_GAL_FLAG, floorY: 4.4 }]);
    expect(part.passZones[0]!.any).toBeUndefined();
    expect(part.externalFlags).toEqual([A6_GAL_FLAG]);
    // the zone covers the deck and the bridge and stays inside the set's walls
    for (const [x, z] of [[43.15, 70.2], [A6_HOLDER.x, A6_HOLDER.z], [55.5, 70.6]] as const) expect(inBox(A6_GAL_ZONE, x, z)).toBe(true);
    expect(inBox(box, A6_GAL_ZONE[0], A6_GAL_ZONE[1]) && inBox(box, A6_GAL_ZONE[2], A6_GAL_ZONE[3])).toBe(true);
    const s = runAt([51, 56.6], [51, 57]);
    expect(s.isStepDone('a6-up')).toBe(false);
    s.setFlag(A6_GAL_FLAG);
    s.update(1 / 60);
    expect(s.isStepDone('a6-up')).toBe(true);
    expect(s.isStepDone('a6-hang')).toBe(false);
  });
});

describe('A6 the Pump House: the lights (LIGHTING-PLAN 3, A6)', () => {
  const by = (g: number) => lamps.filter((l) => l.group === g);

  it("eight lamps on the plan's circuits 60-63: floor 3, gallery 3, desk 1, cage 1; every one grouped, electric and destructible as its row says; none on the dead 69", () => {
    expect(lamps).toHaveLength(8);
    expect([60, 61, 62, 63].map((g) => by(g).length)).toEqual([3, 3, 1, 1]);
    for (const l of lamps) {
      const row = circuitOf(l.group);
      expect(row, `lamp ${l.id} group ${l.group}`).toBeDefined();
      expect(row!.room).toBe('A6');
      expect(l.electric).toBe(row!.electric);
      expect(l.destructible).toBe(row!.destructible);
      expect(row!.kind).not.toBe('dead');
    }
    for (const g of [60, 61, 62, 63]) expect(by(g).length).toBe(circuitOf(g)!.lamps);
    expect(by(69)).toEqual([]);
  });

  it('the high-bays stand over the east third (x 61); the cage light inside the cage under the slab; the desk lamp on the desk', () => {
    for (const l of by(60)) {
      expect(l.x).toBeGreaterThan(58);
      expect(l.y).toBeCloseTo(8.4, 9);
    }
    const cage = by(63)[0]!;
    expect(inBox(A6_CAGE, cage.x, cage.z, -0.3)).toBe(true);
    expect(cage.y).toBeLessThan(deck - A6_HANG.slab);
    expect(inBox(A6_DESK, by(62)[0]!.x, by(62)[0]!.z)).toBe(true);
    // no gallery-strip lamp in the dark west end (the tagged-out fittings, 69)
    for (const l of by(61)) expect(l.x).toBeGreaterThan(50);
  });

  it("the part's groups are exactly the plan's live A6 rows (the client hears every switch), and each has a lamp", () => {
    const plan = marlowCourseGroups();
    expect(part.groups).toEqual({ 'a6-floor': plan['a6-floor'], 'a6-gallery': plan['a6-gallery'], 'a6-desk': plan['a6-desk'], 'a6-cage': plan['a6-cage'] });
    for (const g of Object.values(part.groups)) expect(lamps.some((l) => l.group === g)).toBe(true);
    for (const [k, g] of Object.entries(plan)) if (k.startsWith('a6-')) expect(course.groups![k]).toBe(g);
  });

  it('three wall switches: the floor (60) by the outfall door, the gallery (61) at the stair head on the gallery, the desk lamp (62) on the desk; no switch on the cage light', () => {
    expect(part.switches.map((s) => [s.id, s.group])).toEqual([['a6-sw-floor', 60], ['a6-sw-gallery', 61], ['a6-sw-desk', 62]]);
    const [floor, gallery, desk] = part.switches;
    expect(hyp2(floor!.pos.x - 63.6, floor!.pos.z - 60.4)).toBeLessThanOrEqual(0.3);
    expect(gallery!.pos.y).toBeCloseTo(A6_DECK.lip + 1.2, 9);
    expect(hyp2(gallery!.pos.x - 56.4, gallery!.pos.z - 71.4)).toBeLessThanOrEqual(0.5);
    expect(hyp2(desk!.pos.x - 61.0, desk!.pos.z - 66.0)).toBeLessThanOrEqual(0.1);
    expect(circuitOf(63)!.switches).toEqual([]);
    // the lure: every switch reaches the attendant anywhere on his loop (25 m)
    for (const sw of part.switches) for (const p of A6_ATTENDANT_ROUTE) expect(hyp2(sw.pos.x - p[0], sw.pos.z - p[1]), `${sw.id} to ${p.join(', ')}`).toBeLessThan(LURE_RANGE);
  });

  it('the standby zones: the set at 0.14 and the gallery and bridge level', () => {
    const zones = Object.fromEntries(part.ambientZones.map((z) => [z.id, z]));
    expect(zones.A6).toMatchObject({ box: [40, 54, 64, 72], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 8.9 });
    expect(zones['a6-gallery']).toMatchObject({ box: [40.3, 61.6, 63.7, 71.775], ambient: MARLOW_LEVEL.standby, minY: 3.9 });
    expect(part.ambientZones).toHaveLength(2);
  });

  it('the tuned levels: the dark sump vantage, pump 3, the west floor, the mark and the rope spot; the lit east end; the holder lit by 61 and dark without it; the lit cage; 60 off darkens the east end', () => {
    const spots = LIGHT_SPOTS.a6PumpHouse;
    const at = (n: string) => spots.find((s) => s.name === n)!;
    for (const n of ['A6 vantage', 'A6 pump 3', 'A6 leg-up mark', 'A6 west floor', 'A6 rope spot']) {
      expect(at(n).band, n).toBe('pocket');
      expect(tuned[n]!, n).toBeLessThanOrEqual(MARLOW_LEVEL.pocketMax);
    }
    expect(at('A6 rope spot').y).toBeCloseTo(A6_DECK.lip, 9);
    for (const n of ['A6 desk', 'A6 cage']) {
      expect(at(n).band, n).toBe('pool');
      expect(tuned[n]!, n).toBeGreaterThanOrEqual(MARLOW_LEVEL.poolMin);
    }
    for (const n of ['A6 gauge board', 'A6 outfall approach', 'A6 holder']) {
      expect(at(n).band, n).toBe('read');
      expect(tuned[n]!, n).toBeGreaterThanOrEqual(MARLOW_LEVEL.readMin);
    }
    expect(at('A6 holder cut')).toMatchObject({ x: A6_HOLDER.x, y: deck, z: A6_HOLDER.z, band: 'cut', off: [61] });
    expect(tuned['A6 holder cut']!).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
    expect(tuned['A6 holder']! - tuned['A6 holder cut']!).toBeGreaterThan(0.2);
    for (const n of ['A6 outfall cut', 'A6 gauge board cut']) {
      expect(at(n).off, n).toEqual([60]);
      expect(tuned[n]!, n).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
    }
    expect(Math.abs(tuned['A6 floor standby']! - MARLOW_LEVEL.standby)).toBeLessThanOrEqual(0.03);
  });
});

describe('A6 the Pump House: the attendant', () => {
  const slot = part.squads[A6_ATTENDANT]!;
  const patrolSpeed = ENEMIES.grunt.walkSpeed * 1.1;
  const n = A6_ATTENDANT_ROUTE.length;

  /** Walk the loop on its own pace (0.01 s steps, straight-line moves); the times each stop was left. */
  function walkLoop(waits: number[], seconds: number): { left: [number, number][]; stuck: boolean } {
    const w = new PatrolWalker({ points: A6_ATTENDANT_ROUTE, waits, faces: A6_ATTENDANT_FACES }, slot.x, slot.z, slot.yaw);
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
    return { left, stuck: left.length < n };
  }

  it("is the bay's one guard: an armed kind (grunt) on a patrol loop from the desk (61.5, 67.1) facing south, inside the set", () => {
    expect(part.bay.squad).toEqual([A6_ATTENDANT]);
    expect(Object.keys(part.squads)).toEqual([A6_ATTENDANT]);
    expect(slot.kind).toBe('grunt');
    expect(['grunt', 'heavy', 'enforcer', 'officer', 'sniper']).toContain(slot.kind);
    expect(slot.passive).toBeUndefined();
    expect([slot.x, slot.z, slot.yaw]).toEqual([61.5, 67.1, Math.PI]);
    expect(slot.route![0]).toEqual([slot.x, slot.z]);
    expect(slot.waits).toEqual(A6_ATTENDANT_WAITS);
    expect(slot.waits!.filter((w) => w > 1)).toEqual([4, 3, 4]);
    expect(slot.waits!.every((w) => w > 0)).toBe(true);
    expect(slot.faces![0]).toBe(Math.PI);
    expect(slot.faces![2]).toBe(Math.PI);
    expect(slot.faces![5]).toBe(-Math.PI / 2);
    expect(course.squads[A6_ATTENDANT]).toBe(slot);
    expect(circuitOf(61)!.lure!.guard).toBe(A6_ATTENDANT);
  });

  it('his loop is open floor (a body of radius 0.3 walks every leg): round the desk, past the gauge board, through the pump-2 gap, along the cage door to pump 3', () => {
    for (let i = 0; i < n; i++) {
      const a = A6_ATTENDANT_ROUTE[i]!;
      const c = A6_ATTENDANT_ROUTE[(i + 1) % n]!;
      expect(walkBlocked(a[0], a[1], c[0], c[1]), `leg ${i}`).toBeNull();
    }
    // the cage door is on his path: he passes it at under a metre
    expect(Math.abs(61.2 - A6_CAGE[1])).toBeLessThan(1);
  });

  it("the check has teeth: the doc's straight desk-to-gauge leg (no pass point round the desk) clips the desk", () => {
    expect(walkBlocked(61.5, 67.1, 58.0, 63.1)).not.toBeNull();
    expect(walkBlocked(54.2, 62.9, 61.5, 67.1)).not.toBeNull();
  });

  it('the loop takes 36-45 s on the walker (LD 4.3: 25-45 s) with stops of 4 s at the desk, 3 s at the gauge board and 4 s at pump 3', () => {
    const len = A6_ATTENDANT_ROUTE.reduce((s, a, i) => s + hyp2(A6_ATTENDANT_ROUTE[(i + 1) % n]![0] - a[0], A6_ATTENDANT_ROUTE[(i + 1) % n]![1] - a[1]), 0);
    expect(len).toBeCloseTo(33.7, 1);
    const { left } = walkLoop(A6_ATTENDANT_WAITS, 160);
    const post = left.filter(([, i]) => i === 0).map(([t]) => t);
    expect(post.length).toBeGreaterThanOrEqual(3);
    const cycle = post[2]! - post[1]!;
    const plain = len / patrolSpeed + 4 + 3 + 4 + 6 * A6_PASS_WAIT;
    expect(cycle).toBeGreaterThanOrEqual(25);
    expect(cycle).toBeLessThanOrEqual(45);
    // (the walker counts a stop as reached within `PATROL.arrive` 0.45 m: up to about 0.45 s a point under the plain sum)
    expect(cycle).toBeLessThanOrEqual(plain + 0.5);
    expect(cycle).toBeGreaterThan(plain - n * 0.5);
    expect(post[0]!).toBeCloseTo(4, 1);
  });

  it('the check has teeth: a pass-through wait of 0 freezes a PatrolWalker at the first corner, which is why the pass points pause 0.1 s', () => {
    expect(walkLoop(A6_ATTENDANT_WAITS.map((w) => (w === A6_PASS_WAIT ? 0 : w)), 160).stuck).toBe(false); // (merge) master guard-ai S2 fix: a wait of 0 passes through now; the 0.1 s pause stays
    expect(walkLoop(A6_ATTENDANT_WAITS, 160).stuck).toBe(false);
  });
});

describe('A6 the Pump House: map data the e2e and the modes read', () => {
  it('debug points inside the set on clear floor (or the deck); camera spaces (hall open, gallery and cage tight); nav seeds on the floor, the gallery, the bridge and in the cage', () => {
    expect(part.debugPoints.map((d) => d.id)).toEqual(['A6-entry', 'A6-vantage', 'A6-mid', 'A6-mark', 'A6-holder', 'A6-cage', 'A6-exit']);
    for (const d of part.debugPoints) {
      expect(inBox(box, d.pos.x, d.pos.z)).toBe(true);
      if (d.pos.y < 1) expect(blockedAt(d.pos.x, d.pos.z, 0.3), d.id).toEqual([]);
    }
    expect(part.camSpaces.map((c) => c.size)).toEqual(['open', 'tight', 'tight']);
    expect(part.navSeeds.some((s) => s.y > 4 && s.z > 69.6)).toBe(true);
    expect(part.navSeeds.some((s) => s.y > 4 && inBox(A6_BRIDGE, s.x, s.z))).toBe(true);
    expect(part.navSeeds.some((s) => s.y < 1 && inBox(A6_CAGE, s.x, s.z))).toBe(true);
  });

  it('shot vantages for the kerb, the holder and the stair head; no cameras, lasers, scanners, consoles or hide objects', () => {
    expect(part.shotVantages.map((v) => v.name)).toEqual(['a6-kerb', 'a6-holder', 'a6-stair-head']);
    expect(part.cameras).toEqual([]);
    expect(part.lasers).toEqual([]);
    expect(part.scanners).toEqual([]);
    expect(part.consoles).toEqual([]);
    expect(part.hideSpots).toEqual([]);
  });
});

describe('A6 the Pump House: dressing (slice 6 step 5)', () => {
  const kitReport = JSON.parse(readFileSync('src/world/kit/assets/facility-kit.json', 'utf8')) as { pieces: Record<string, { meshes: Record<string, number> }> };
  const propReport = JSON.parse(readFileSync('src/world/props/assets/facility-props.json', 'utf8')) as PropReport;
  const area = { x0: box[0], z0: box[1], x1: box[2], z1: box[3] };
  const own = part.props;
  /** (P3-1) The pipe runs (the interlock station is the other prop). */
  const pipes = own.filter((p) => p.prop === 'pipeRun');
  const lip4 = A6_DECK.lip;
  /** The props' own boxes as written (matched by centre, size and yaw); a quarter-turn box folded to the axis-aligned box the helpers read. */
  const propBoxes = own.flatMap((p) => propCollisionBox(p) ?? []);
  const written = propBoxes.map((w) => mine.find((p) => p.collide && p.c.every((v, k) => Math.abs(v - w.c[k]!) < 1e-6) && p.s.every((v, k) => Math.abs(v - w.s[k]!) < 1e-6) && Math.abs(p.yaw - w.yaw) < 1e-6)!);
  const upright = (p: BoxPiece): BoxPiece => (Math.abs(Math.sin(p.yaw)) > 0.5 ? { ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 } : { ...p, yaw: 0 });
  const colliders = dressing.filter((p) => p.collide);
  const rail = colliders.filter((p) => !written.includes(p));
  const railFlat = rail.map(upright);
  const pipeFlat = written.map(upright);
  const flat = [...railFlat, ...pipeFlat];
  const skins = dressing.filter((p) => !p.collide);
  /** The skins that are plain axis-aligned boxes (everything but the two boards pitched with the stair). */
  const level = skins.filter((p) => Math.abs(p.yaw) < 1e-6 && Math.abs(p.pitch) < 1e-6);
  const kitIn = lay.kit!.instances.filter((i) => inBox(box, i.x, i.z));
  /** The staff stair (the helper's flight): its nosing line over x (the ramp collider's top). */
  const stair = coopDeck({ id: 'a6-gallery', at: { x: A6_DECK.x, z: A6_DECK.z }, facing: '+z', span: A6_DECK.span, depth: A6_DECK.depth, lip: A6_DECK.lip, open: A6_DECK.open, screen: 1.2, stair: 'end', stairW: 1.2, rope: A6_DECK.rope }).stairs[0]!;
  const xFoot = stair.x + stair.len / 2;
  const zStairS = stair.z - stair.w / 2;
  const lineAt = (x: number): number => (stair.rise * (xFoot - x)) / stair.len;
  const inside = (p: BoxPiece, x: number, y: number, z: number): boolean => Math.abs(x - p.c[0]) <= p.s[0] / 2 + 1e-9 && Math.abs(y - p.c[1]) <= p.s[1] / 2 + 1e-9 && Math.abs(z - p.c[2]) <= p.s[2] / 2 + 1e-9;
  /** The first box of `list` a body of radius `r` standing with its feet at `y` touches at (x, z) (its band is feet + 0.3 to feet + 1.7), or null. */
  const bodyHits = (x: number, y: number, z: number, list: readonly BoxPiece[] = flat, r = MOVEMENT.radius): string | null => {
    for (const p of list) {
      if (p.c[1] - p.s[1] / 2 >= y + 1.7 || top(p) <= y + 0.3) continue;
      if (hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r) return `box (${p.c.map((v) => v.toFixed(2)).join(', ')})`;
    }
    return null;
  };
  const bodyWalk = (x0: number, z0: number, x1: number, z1: number, y = 0): string | null => {
    const n = Math.ceil(hyp2(x1 - x0, z1 - z0) / 0.1);
    for (let i = 0; i <= n; i++) {
      const hit = bodyHits(x0 + ((x1 - x0) * i) / n, y, z0 + ((z1 - z0) * i) / n);
      if (hit) return `(${(x0 + ((x1 - x0) * i) / n).toFixed(2)}, ${(z0 + ((z1 - z0) * i) / n).toFixed(2)}): ${hit}`;
    }
    return null;
  };
  /** Skins whose centre lies in the plan box [x0, x1] x [z0, z1] and between `y0` and `y1`. */
  const skinsInOf = (list: readonly BoxPiece[], x0: number, x1: number, z0: number, z1: number, y0 = -1, y1 = 99): BoxPiece[] => list.filter((p) => p.c[0] > x0 && p.c[0] < x1 && p.c[2] > z0 && p.c[2] < z1 && p.c[1] > y0 && p.c[1] < y1);
  const skinsIn = (x0: number, x1: number, z0: number, z1: number, y0 = -1, y1 = 99): BoxPiece[] => skinsInOf(skins, x0, x1, z0, z1, y0, y1);

  it("the greybox is as S6 built it: its 78 boxes (checksum), 8 lamps, 1 door, 1 anchor; the only new collision is the stair's twelve rail boxes and the five pipes' ten", () => {
    let sum = 0;
    for (const p of grey) sum += (p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw) * (p.collide ? 1 : 1.5) * (p.visible === false ? 1.25 : 1) * (p.overhead ? 1.1 : 1);
    expect(sum).toBeCloseTo(GREY.checksum, 3);
    expect(grey.filter((p) => p.collide)).toHaveLength(GREY.solids);
    expect(propBoxes).toHaveLength(10);
    expect(written.every((p) => p !== undefined)).toBe(true);
    expect(rail).toHaveLength(12);
    expect(colliders).toHaveLength(22);
    expect(built.counts.sets.a6PumpHouse).toEqual({ lights: GREY.lights, solids: GREY.solids + rail.length + propBoxes.length, doors: GREY.doors, anchors: GREY.anchors });
    expect(lamps).toHaveLength(GREY.lights);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(Array.from({ length: 11 }, (_, i) => `A6-${i + 15}`)));
    expect(part.doors).toEqual({ [A6_CAGE_DOOR]: expect.any(Number) });
    expect(Object.keys(part.devices)).toEqual([A6_PANEL, A6_EXIT]);
    expect(part.squads[A6_ATTENDANT]!.route).toEqual(A6_ATTENDANT_ROUTE);
  });

  it("every hand-built dressing box is a visual skin (no collision, noLedge, a side under 5 cm: out of the canonical light shapes, so the light is the greybox's); the new colliders are the rail's invisible boxes and the props' own, all noLedge", () => {
    expect(skins.length).toBeGreaterThan(600);
    for (const p of skins) {
      expect(p.noLedge, `skin at (${p.c.join(', ')})`).toBe(true);
      expect(Math.min(...p.s), `skin at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBeLessThan(CANON_MIN_THICK);
      expect(p.visible).not.toBe(false);
    }
    // the only visible boxes of any thickness the dressing added are the props' solid pipes (their own greybox, hidden by the prop)
    const heavy = dressing.filter((p) => p.visible !== false && Math.min(...p.s) >= CANON_MIN_THICK);
    expect(heavy).toHaveLength(pipes.length);
    for (const p of heavy) expect(written).toContain(p);
    for (const p of rail) expect(p.visible, `rail box at (${p.c.join(', ')})`).toBe(false);
    for (const p of colliders) expect(p.noLedge, `collider at (${p.c.join(', ')})`).toBe(true);
  });

  it("the staff stair's open side has a 1.1 m rail (S567-check polish 2): twelve kit.handrail segments 0.05 m outside the flight from the third tread to the head, each at least 1.1 m over the walking line, no gap, invisible, noLedge, the flight and its foot left open", () => {
    const { z, from, to, seg, h } = A6_STAIR_RAIL;
    expect(z + 0.05).toBeLessThan(zStairS);
    expect((from - to) / seg).toBeCloseTo(12, 9);
    expect(to).toBeCloseTo(56.0, 9);
    const sorted = [...railFlat].sort((p, q) => q.c[0] - p.c[0]);
    let x: number = from;
    for (const p of sorted) {
      // a 0.1 m box on the line z 70.5 (its face stops 0.025 m short of the flight's open edge), one segment long, from the low end's floor line
      expect(p.s[0]).toBeCloseTo(seg, 6);
      expect(p.s[2]).toBeCloseTo(0.1, 9);
      expect(p.c[2]).toBeCloseTo(z, 9);
      expect(p.c[2] + p.s[2] / 2).toBeLessThan(zStairS);
      expect(p.c[0] + p.s[0] / 2).toBeCloseTo(x, 6);
      const lo = p.c[0] - p.s[0] / 2;
      expect(p.c[1] - p.s[1] / 2, 'from the floor line at the low end').toBeCloseTo(lineAt(x), 6);
      expect(top(p) - lineAt(lo), 'the rail height over the walking line at the high end').toBeCloseTo(h, 6);
      x = lo;
    }
    expect(x).toBeCloseTo(to, 6);
    // no gap: at every x from the head to the third tread a rail box stands on z 70.5 across 0.3 m to 1.0 m over the line
    for (let sx = to + 0.025; sx < from; sx += 0.05) for (const dy of [0.3, 0.6, 1.0]) expect(railFlat.some((p) => inside(p, sx, lineAt(sx) + dy, z)), `x ${sx.toFixed(3)} dy ${dy}`).toBe(true);
    // the flight is not narrowed or blocked: a body walking its length, and along its open-side lane, meets no new collider
    for (let sx = to; sx <= 63.6 + 1e-9; sx += 0.1) expect(bodyHits(sx, lineAt(sx), stair.z), `x ${sx.toFixed(2)}`).toBeNull();
    for (let sx = to; sx <= from; sx += 0.1) expect(bodyHits(sx, lineAt(sx), zStairS + 0.3 + 0.01), `edge lane at x ${sx.toFixed(2)}`).toBeNull();
    // the foot stays open to step on (the rail starts at the third tread): a body goes from the floor to the flight at x 63.2
    expect(bodyWalk(63.2, 69.5, 63.2, 70.9)).toBeNull();
    // the rest of the open side is shut: a body on the flight cannot walk off it (the rail stops it 0.3 m off its face); without the rail it could (teeth)
    for (let sx = to + 0.3; sx < from - 0.3; sx += 0.3) {
      expect(bodyHits(sx, lineAt(sx), zStairS - 0.1), `step off at x ${sx.toFixed(2)}`).not.toBeNull();
      expect(bodyHits(sx, lineAt(sx), zStairS - 0.1, pipeFlat), `step off at x ${sx.toFixed(2)} without the rail`).toBeNull();
    }
    // the kit's balustrade over each box: twelve `handrail` pieces on the gallery strip (61) along z 70.5
    const pieces = kitIn.filter((i) => i.piece === 'handrail' && i.z > 70 && i.x > 56);
    expect(pieces).toHaveLength(12);
    for (const i of pieces) {
      expect(i.group).toBe(A6_G_GALLERY);
      expect(i.z).toBeCloseTo(z, 9);
    }
    // the rope, the leg-up, the holder and the cage are far from the stair
    for (const [px, pz] of [[A6_ROPE.x, A6_ROPE.z], [A6_RUNNER.x, A6_RUNNER.z], [A6_MARK.x, A6_MARK.z], [A6_HOLDER.x, A6_HOLDER.z]] as const) expect(Math.min(...railFlat.map((p) => hyp2(p.c[0] - px, p.c[2] - pz)))).toBeGreaterThan(5);
  });

  it('the stair is dressed: a yellow nosing on each of the 27 treads, a wall rail with brackets and a skirting board pitched with the flight, the wall above it', () => {
    const nosings = skins.filter((p) => p.c[0] > 55.9 && p.c[0] < 63.8 && p.c[2] > zStairS && p.c[1] < 4.5 && Math.abs(p.s[0] - 0.06) < 1e-6 && Math.abs(p.s[1] - 0.012) < 1e-6);
    expect(nosings).toHaveLength(27);
    expect(Math.max(...nosings.map(top))).toBeGreaterThan(4.4);
    const boards = skins.filter((p) => Math.abs(p.pitch) > 0.4);
    expect(boards).toHaveLength(2);
    expect(skinsIn(56.9, 63.7, 71.6, 71.76, 0.5, 4.4).length).toBeGreaterThan(12);
  });

  it("budgets (computed): kit triangles <= 60 k; the props pass FacilityProps.check against the set box at 60 k triangles and 12 draws, with the facility's set-side plate in the box counted", () => {
    const kitTris = kitTriangles({ instances: kitIn, doors: [] }, kitReport);
    expect(kitIn.some((i) => i.piece === 'wallPanel')).toBe(true);
    expect(kitTris, `${kitTris} kit triangles`).toBeLessThanOrEqual(60_000);
    const facilityIn = built.facility.props.filter((p) => inBox(box, p.x, p.z));
    expect(facilityIn.map((p) => p.prop)).toEqual(['signPlate']);
    const counted = [...own, ...facilityIn];
    const checker = new FacilityProps();
    checker.placements.push(...counted);
    expect(checker.check(area, propReport)).toEqual([]);
    expect(propTriangles(counted, propReport)).toBeLessThanOrEqual(PROP_SET_BUDGET.tris);
    expect(propDraws(counted, propReport)).toBeLessThanOrEqual(PROP_SET_BUDGET.draws);
    expect(pipes.map((p) => p.prop)).toEqual(Array<string>(5).fill('pipeRun'));
  });

  it("the pipes: five modules end to end along the east wall (x 63.0-63.7, z 54.25-59.25), 0.7 m tall, noLedge, off the wall, clear of the L6 door, the floor switch, the kerb's east opening and the exit route", () => {
    expect(pipes).toHaveLength(A6_PIPES.z.length);
    for (const [i, p] of pipes.entries()) {
      expect([p.x, p.z]).toEqual([A6_PIPES.x, A6_PIPES.z[i]]);
      expect(p.y).toBe(0);
      const f = PROP_FOOTPRINT[p.prop];
      for (const [lx, lz] of [[f[0], f[1]], [f[2], f[1]], [f[2], f[3]], [f[0], f[3]]] as const) {
        const w = propToWorld(p, lx, 0, lz);
        expect(inBox(box, w[0], w[2], 1e-6), `pipe ${i}`).toBe(true);
        expect(w[0], `pipe ${i} stands off the wall face`).toBeLessThanOrEqual(A6_SHELL.east - 0.04);
        expect(w[2]).toBeGreaterThanOrEqual(A6_SHELL.south - 1e-6);
      }
    }
    for (const w of pipeFlat) {
      expect(top(w)).toBeLessThanOrEqual(0.7 + 1e-6);
      expect(w.noLedge).toBe(true);
      // 2.5 m or more from the door's opening centre (x 64, z 62)
      expect(hyp2(Math.max(Math.abs(64 - w.c[0]) - w.s[0] / 2, 0), Math.max(Math.abs(62 - w.c[2]) - w.s[2] / 2, 0))).toBeGreaterThan(2.5);
    }
    for (const [x, z] of [[62.6, 61.4], [62.6, 62.6], [A6_SHELL.east - 1.0, 60.4], [57.0, 58.5], [A6_DESK[2] + 0.6, 66.0]] as const) expect(bodyHits(x, 0, z), `spot (${x}, ${z})`).toBeNull();
    for (const [x0, z0, x1, z1] of [[57.0, 58.5, 62.6, 61.4], [62.6, 61.4, 62.6, 62.6], [63.0, 70.3, 62.6, 62.6], [53, 56.0, 57.0, 58.5], [A6_VANTAGE.x, A6_VANTAGE.z, 48.8, 58.4]] as const) expect(bodyWalk(x0, z0, x1, z1), `walk (${x0}, ${z0}) to (${x1}, ${z1})`).toBeNull();
  });

  it('(P3-1) the interlock station beside the L6 door: one pushStation on a6-interlock / a6-drive, green lamp with a red off colour, its lamp at (63.44, 2.3, 64.0), no collision box, on its own supply', () => {
    const st = own.filter((p) => p.prop === 'pushStation');
    expect(st).toHaveLength(1);
    const s = st[0]!;
    expect(s.device).toBe(A6_INTERLOCK);
    expect(s.flag).toBe(A6_DRIVE_FLAG);
    expect(s.lamp).toEqual(PROP_LAMP_TINT.default);
    expect(s.lampOff).toEqual([1.0, 0.12, 0.08]);
    // the status lamp's centre (build.py push_station: x 0, y 0.86-0.92, z 0.30-0.31 in the prop's frame)
    const lamp = propToWorld(s, 0, 0.89, 0.305);
    expect(hyp2(lamp[0] - 63.44, lamp[2] - 64.0)).toBeLessThan(0.02);
    expect(Math.abs(lamp[1] - 2.3)).toBeLessThan(0.02);
    expect(propCollisionBox(s)).toBeNull();
    expect(PROP_OWN_SUPPLY).toContain(s.prop);
  });

  it('with the props and the rail written soloJumpThreats is still empty for the gallery lip (and still bites); nothing new stands within the keep-clear of the open edge; the game generates no new grip over 0.9 m', () => {
    const withNew = [...solid, ...flat];
    expect(soloJumpThreats(withNew, LIP)).toEqual([]);
    const crate: BoxPiece = { c: [43, 0.9, A6_DECK.z - 2.5 - 0.5], s: [1, 1.8, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true };
    expect(soloJumpThreats([...withNew, crate], LIP).length).toBeGreaterThan(0);
    const gapToLip = (p: BoxPiece): number => hyp2(Math.max(A6_LIP_X[0] - (p.c[0] + p.s[0] / 2), p.c[0] - p.s[0] / 2 - A6_LIP_X[1], 0), Math.max(Math.abs(A6_DECK.z - p.c[2]) - p.s[2] / 2, 0));
    for (const p of flat) if (p.c[1] - p.s[1] / 2 < 0.3) expect(gapToLip(p), `collider at (${p.c.join(', ')})`).toBeGreaterThan(GREY_KEEP_CLEAR);
    const generated = anchors.ledges.filter((l) => l.piece !== 0 && inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3) && l.top >= 0.9);
    expect(generated.map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
  });

  it("nothing new stands on the attendant's loop, the kerb's openings, the pump-2 gap, the leg-up mark and its room, the rope's runner, the cage's ring, the holder's spot or the debug points", () => {
    for (let i = 0; i < A6_ATTENDANT_ROUTE.length; i++) {
      const a = A6_ATTENDANT_ROUTE[i]!;
      const c = A6_ATTENDANT_ROUTE[(i + 1) % A6_ATTENDANT_ROUTE.length]!;
      expect(bodyWalk(a[0], a[1], c[0], c[1]), `loop leg ${i}`).toBeNull();
    }
    for (const [x, z] of [[A6_MARK.x, A6_MARK.z], [A6_MARK.x - TEAM.roomSide, A6_MARK.z], [A6_MARK.x + TEAM.roomSide, A6_MARK.z], [A6_RUNNER.x, A6_RUNNER.z]] as const) expect(bodyHits(x, 0, z), `spot (${x}, ${z})`).toBeNull();
    for (const [x, z] of cageRing()) expect(bodyHits(x, 0, z), `cage ring (${x.toFixed(2)}, ${z.toFixed(2)})`).toBeNull();
    for (const [x, z] of [[A6_HOLDER.x, A6_HOLDER.z], [A6_PLATE.x, A6_PLATE.z], [A6_ROPE.x, A6_ROPE.z]] as const) expect(bodyHits(x, deck, z), `deck spot (${x}, ${z})`).toBeNull();
    for (const d of part.debugPoints.filter((q) => q.pos.y < 1)) expect(bodyHits(d.pos.x, 0, d.pos.z), d.id).toBeNull();
    for (const x of [48.8, 57.2]) expect(bodyWalk(x, 57.0, x, 59.0), `kerb opening x ${x}`).toBeNull();
    expect(bodyWalk(54.2, 62.9, 54.2, 61.2)).toBeNull();
  });

  it('every prop with an emissive part carries a circuit group (S3-7 S1, light parity): the pipe runs have none and the interlock station is on its own supply', () => {
    const plan = new Set(Object.values(marlowCourseGroups()));
    const [g0, g1] = setGroups('a6PumpHouse');
    const glowing = own.filter((p) => propGlows(p) && !PROP_OWN_SUPPLY.includes(p.prop));
    expect(pipes.length).toBeGreaterThan(0);
    expect(pipes.every((p) => p.prop === 'pipeRun')).toBe(true);
    // (P3-1) the only other prop is the interlock station, which glows on its own supply
    expect(own.filter((p) => p.prop !== 'pipeRun').map((p) => p.prop)).toEqual(['pushStation']);
    expect(own.some((p) => propGlows(p))).toBe(true);
    expect(glowing).toEqual([]);
    expect(plan.size).toBeGreaterThan(0);
    expect(g1 - g0).toBe(9);
  });

  it('every kit glow in A6 carries a circuit: hall panels on the pump floor (60) south and east, the gallery strip (61) north, the tagged-out circuit (69, no lamp: dark) west; all over 4.4 m (the south wall over its glazing); the north wall leaves the switch column; no lamp was added', () => {
    const [g0, g1] = setGroups('a6PumpHouse');
    const plan = new Set(Object.values(marlowCourseGroups()));
    const glowing = kitIn.filter((i) => ['wallPanel', 'skirting', 'column', 'handrail'].includes(i.piece) || (i.piece === 'ledSlot' && !i.noLed));
    expect(glowing.length).toBeGreaterThan(40);
    for (const i of glowing) {
      expect(i.group, `${i.piece} at ${i.x}, ${i.y}, ${i.z}`).toBeDefined();
      expect(i.group!).toBeGreaterThanOrEqual(g0);
      expect(i.group!).toBeLessThanOrEqual(g1);
    }
    for (const i of glowing.filter((q) => q.group !== A6_G_TAGGED)) expect(plan.has(i.group!), `${i.piece} group ${i.group}`).toBe(true);
    // 69 is the dead circuit: not a course group, no lamp on it, so its LED lines never light
    expect(plan.has(A6_G_TAGGED)).toBe(false);
    expect(lamps.filter((l) => l.group === A6_G_TAGGED)).toEqual([]);
    const panels = glowing.filter((i) => i.piece === 'wallPanel');
    const south = panels.filter((i) => Math.abs(i.z - A6_SHELL.south) < 0.1);
    const east = panels.filter((i) => Math.abs(i.x - A6_SHELL.east) < 0.1);
    const west = panels.filter((i) => Math.abs(i.x - A6_SHELL.west) < 0.1);
    const northP = panels.filter((i) => Math.abs(i.z - A6_SHELL.north) < 0.1);
    expect(south.length + east.length + west.length + northP.length).toBe(panels.length);
    for (const i of south) {
      expect(i.group).toBe(A6_G_FLOOR);
      expect(i.y).toBeCloseTo(GAL_TOP, 9);
    }
    for (const i of east) expect(i.group).toBe(A6_G_FLOOR);
    for (const i of west) expect(i.group).toBe(A6_G_TAGGED);
    for (const i of northP) expect(i.group).toBe(A6_G_GALLERY);
    for (const i of [...east, ...west, ...northP]) expect(i.y).toBeCloseTo(lip4, 9);
    for (const list of [south, east, west, northP]) expect(list.length).toBeGreaterThan(10);
    for (const i of northP) {
      const [a, e] = [i.x - 0.6 * i.sx, i.x + 0.6 * i.sx];
      expect(Math.min(e, A6_SWITCH_COLUMN[1]) - Math.max(a, A6_SWITCH_COLUMN[0]), `panel at ${i.x} over the switch column`).toBeLessThanOrEqual(1e-6);
    }
    // the gallery switch rides a riser column in the recess (a skin from the deck to the roof) with its conduit
    const column = skins.filter((p) => Math.abs(p.c[0] - (A6_SWITCH_COLUMN[0] + A6_SWITCH_COLUMN[1]) / 2) < 1e-6 && p.s[1] > 5);
    expect(column).toHaveLength(1);
    expect(top(column[0]!)).toBeCloseTo(10, 9);
    expect(column[0]!.c[1] - column[0]!.s[1] / 2).toBeCloseTo(lip4, 9);
    const sw = part.switches.find((s) => s.id === 'a6-sw-gallery')!;
    expect(sw.pos.x).toBeGreaterThan(A6_SWITCH_COLUMN[0]);
    expect(sw.pos.x).toBeLessThan(A6_SWITCH_COLUMN[1]);
    // the stair's balustrade lines and the bridge's are on 61
    for (const i of kitIn.filter((q) => q.piece === 'handrail')) expect(i.group).toBe(A6_G_GALLERY);
    expect(lamps).toHaveLength(GREY.lights);
  });

  /** Skin `p` overlaps box `q` (a 1 mm / 1 um margin on the plan / height, as the mark test always used). */
  const overlap = (p: BoxPiece, q: BoxPiece): boolean => {
    const o = (k: number): number => Math.min(p.c[k]! + p.s[k]! / 2, q.c[k]! + q.s[k]! / 2) - Math.max(p.c[k]! - p.s[k]! / 2, q.c[k]! - q.s[k]! / 2);
    return o(0) > 1e-6 && o(1) > 1e-9 && o(2) > 1e-6;
  };
  const marks = grey.filter((p) => !p.collide && p.visible && Math.abs(p.yaw) < 1e-6 && p.s[1] < 0.1);
  const clearPoints: [string, number, number, number][] = [
    ['drive panel', panel.x, panel.y, panel.z],
    ['exit release', exit.x, exit.y, exit.z],
    ...part.switches.map((s) => [s.id, s.pos.x, s.pos.y, s.pos.z] as [string, number, number, number]),
    ['interlock lamp', 63.7, 2.3, 64.0],
    ...lamps.map((l) => [`lamp ${l.id}`, l.x, l.y, l.z] as [string, number, number, number]),
  ];
  /** The plate's column: the 0.55 m hole from the cage floor to the slab's top. */
  const inPlateColumn = (s: BoxPiece): boolean => {
    const o = (k: number, a: number, e: number): number => Math.min(s.c[k]! + s.s[k]! / 2, e) - Math.max(s.c[k]! - s.s[k]! / 2, a);
    return o(0, 51.225, 51.775) > 1e-6 && o(2, 64.625, 65.175) > 1e-6 && o(1, 0, 4.45) > 1e-9;
  };
  /** A planted 0.03 m skin (a cube) centred on (x, y, z): the test's own piece, never in the set. */
  const plantAt = (x: number, y: number, z: number): BoxPiece => ({ c: [x, y, z], s: [0.03, 0.03, 0.03], yaw: 0, pitch: 0, color: '#ff00ff', collide: false });

  it("dressing stays off the greybox's marks, the devices, the switches, the lamps and the gland plate's drop: no skin overlaps a mark, covers a device, a switch or a lamp, or crosses the plate's column to the cage floor; the cage door's opening and the leg-up's floor are clear", () => {
    expect(marks.length).toBe(6);
    for (const m of marks) for (const s of level) expect(overlap(m, s), `skin at (${s.c.join(', ')}) over the mark at (${m.c.join(', ')})`).toBe(false);
    for (const [name, x, y, z] of clearPoints) for (const s of level) expect(inside(s, x, y, z), `${name} inside the skin at (${s.c.join(', ')})`).toBe(false);
    // the plate's column: nothing from the cage floor to the slab's top over the 0.55 m hole
    for (const s of level) expect(inPlateColumn(s), `skin at (${s.c.join(', ')}) in the plate's column`).toBe(false);
    for (const s of level) expect(inside(s, 51.5, 1.0, 62.05), `cage door opening, skin at (${s.c.join(', ')})`).toBe(false);
    expect(skinsIn(A6_MARK.x - 1.0, A6_MARK.x + 1.0, A6_MARK.z - 0.6, A6_MARK.z + 0.6, -1, 0.2)).toEqual([]);
  });

  it('the dressing-clearance checks have teeth: one planted 0.03 m skin inside each window (every mark, every device, switch and lamp point, the plate column, the cage door opening, the leg-up floor) is found by the same query, and the bare dressing is not', () => {
    // every mark
    for (const m of marks) {
      const skin = plantAt(m.c[0], m.c[1], m.c[2]);
      expect(level.some((s) => overlap(m, s)), `mark at (${m.c.join(', ')}) bare`).toBe(false);
      expect(overlap(m, skin), `mark at (${m.c.join(', ')}) planted`).toBe(true);
    }
    // the devices, switches and lamps (the 0.03 skin centred on the point)
    expect(clearPoints.length).toBeGreaterThanOrEqual(2 + part.switches.length + 1 + lamps.length);
    for (const [name, x, y, z] of clearPoints) {
      const skin = plantAt(x, y, z);
      expect(level.some((s) => inside(s, x, y, z)), `${name} bare`).toBe(false);
      expect(inside(skin, x, y, z), `${name} planted`).toBe(true);
    }
    // the plate's column and the cage door's opening
    const plate = plantAt(51.5, 2.0, 64.9);
    expect(level.some(inPlateColumn), 'plate column bare').toBe(false);
    expect(inPlateColumn(plate), 'plate column planted').toBe(true);
    const door = plantAt(51.5, 1.0, 62.05);
    expect(level.some((s) => inside(s, 51.5, 1.0, 62.05)), 'cage door opening bare').toBe(false);
    expect(inside(door, 51.5, 1.0, 62.05), 'cage door opening planted').toBe(true);
    // the leg-up's floor window: the planted skin is the only one found
    const legUp = plantAt(A6_MARK.x, 0.1, A6_MARK.z);
    const legWindow = [A6_MARK.x - 1.0, A6_MARK.x + 1.0, A6_MARK.z - 0.6, A6_MARK.z + 0.6, -1, 0.2] as const;
    expect(skinsIn(...legWindow)).toEqual([]);
    expect(skinsInOf([...skins, legUp], ...legWindow)).toEqual([legUp]);
  });

  it("the pumps are dressed: each has at least 70 skins (grout, caps, sole plate, bolts, guard, slots, ribs, cowl, eyes, terminal box, nameplate, keep-clear line); the numbers 1 / 2 / 3 stencilled on the plinths' south faces have 2, 5 and 5 strokes; four yellow guard bands each", () => {
    for (const [px, pz] of A6_PUMPS) expect(skinsIn(px - 1.6, px + 1.6, pz - 1.6, pz + 1.6, -1, 4.5).length, `pump at ${px}`).toBeGreaterThanOrEqual(70);
    const strokes = (px: number, pz: number): number => skins.filter((p) => Math.abs(p.c[0] - px) < 0.2 && Math.abs(p.c[2] - (pz - 1.2 - 0.045)) < 0.01 && p.c[1] > 0.36 && p.c[1] < 0.95 && p.color === '#e5e5de').length;
    expect(A6_PUMPS.map(([px, pz]) => strokes(px, pz))).toEqual([2, 5, 5]);
    for (const [px, pz] of A6_PUMPS) expect(skins.filter((p) => p.color === '#c9a227' && Math.abs(p.c[1] - (1.2 + 1.9) / 2) < 1e-6 && Math.abs(p.c[0] - px) < 0.65 && Math.abs(p.c[2] - pz) < 0.65)).toHaveLength(4);
  });

  it('the sump, the kerb, the gauge board, the desk, the gallery and the davit box are dressed: plate sheet and two hatch frames, 12 kerb stripes and a cap, three gauges and a lamp row, drawers and a timber top, the 24-link drop chain on eye plates, the red davit body with lid, label and latches', () => {
    expect(skinsIn(48.2, 57.8, 54.25, 58.0, -1, 0.05).length).toBeGreaterThanOrEqual(18);
    const stripes = skins.filter((p) => p.color === '#1d1f20' && Math.abs(p.c[1] - 1.05) < 1e-6 && Math.abs(p.c[2] - (A6_KERB.z - A6_KERB.t / 2 - 0.045)) < 1e-6);
    expect(stripes).toHaveLength(12);
    expect(skins.some((p) => p.color === '#c9a227' && Math.abs(top(p) - (A6_KERB.h + 0.03)) < 1e-6 && p.s[0] > 7)).toBe(true);
    expect(skinsIn(57.3, 58.7, 62.2, 62.6, 0, 1.6).length).toBeGreaterThanOrEqual(12);
    expect(skinsIn(60.5, 62.5, 65.5, 66.5, 0, 1.1).length).toBeGreaterThanOrEqual(12);
    const desk = skins.find((p) => p.color === '#6b5a43' && Math.abs(top(p) - 0.78) < 1e-6)!;
    expect(desk.s[0]).toBeCloseTo(1.8, 9);
    const links = skins.filter((p) => p.s[0] > 0.1 && p.s[0] < 0.2 && p.c[0] > A6_LIP_X[0] && p.c[0] < A6_LIP_X[1] && p.c[1] > A6_DECK.lip + 0.6 && p.c[1] < A6_DECK.lip + 1.0 && Math.abs(p.c[2] - (A6_DECK.z + 0.05)) < 1e-6);
    expect(links).toHaveLength(24);
    expect(Math.max(...links.map((p) => p.c[1])) - Math.min(...links.map((p) => p.c[1]))).toBeGreaterThan(0.1);
    // the greybox's lip and its one manual ledge are as built
    expect(part.lips.map((l) => l.id)).toEqual(['a6-gallery-lip']);
    expect(skins.some((p) => p.s[0] > 15 && Math.abs(p.c[1] - (A6_DECK.lip + 0.0025)) < 1e-6)).toBe(true);
    const davit = skins.filter((p) => p.c[0] > 42.8 && p.c[0] < 43.5 && p.c[2] > 70.85 && p.c[2] < 71.55 && p.c[1] > A6_DECK.lip && p.c[1] < A6_DECK.lip + 0.7);
    expect(davit.length).toBeGreaterThanOrEqual(10);
    expect(davit.filter((p) => p.color === '#b5282d').length).toBeGreaterThanOrEqual(4);
    // the screens are banded on both faces
    for (const [a, e] of A6_SCREENS) expect(skins.filter((p) => Math.abs(p.c[0] - (a + e) / 2) < 1e-6 && Math.abs(p.s[0] - (e - a)) < 1e-6 && p.color === '#c9a227').length).toBeGreaterThanOrEqual(2);
  });

  it("the bridge and the cage are dressed: the plate round the gland plate, the lifting-point sign on the south fascia, louvres, kick band and posts on every cage face (the door left open), the drive cabinet's doors, screen, lamps and vents with the devices' centres left clear", () => {
    const sign = skins.filter((p) => Math.abs(p.c[2] - (A6_BRIDGE[1] - 0.045)) < 0.04 && p.c[1] > 4.0 && p.c[1] < 4.4);
    expect(sign.length).toBeGreaterThanOrEqual(8);
    expect(sign.some((p) => p.color === '#c9a227' && p.s[0] > 1.1)).toBe(true);
    const sheet = skins.filter((p) => Math.abs(p.c[1] - (A6_HANG.deck + 0.0025)) < 1e-6 && p.s[1] < 0.006 && p.c[0] > A6_BRIDGE[0] && p.c[0] < A6_BRIDGE[2]);
    expect(sheet).toHaveLength(7);
    const [cx0, cz0, cx1, cz1] = A6_CAGE;
    const louvres = (cond: (p: BoxPiece) => boolean): number => skins.filter((p) => p.color === '#6e757b' && p.c[1] > 1.3 && p.c[1] < 3.9 && cond(p)).length;
    expect(louvres((p) => Math.abs(p.c[0] - (cx0 - 0.045)) < 0.01)).toBeGreaterThanOrEqual(8);
    expect(louvres((p) => Math.abs(p.c[0] - (cx1 + 0.045)) < 0.01)).toBeGreaterThanOrEqual(8);
    expect(louvres((p) => Math.abs(p.c[2] - (cz1 + 0.045)) < 0.01)).toBeGreaterThanOrEqual(8);
    expect(louvres((p) => Math.abs(p.c[2] - (cz0 - 0.045)) < 0.01)).toBeGreaterThanOrEqual(16);
    expect(skinsIn(cx0 - 0.2, cx1 + 0.2, cz0 - 0.2, cz1 + 0.2, -1, 4.0).length).toBeGreaterThanOrEqual(120);
    // the inside of the cage is free but for the cabinet's skins and the work light's conduit
    const inner = skinsIn(cx0 + 0.15, cx1 - 0.15, cz0 + 0.15, cz1 - 0.15, 0, 4.0).filter((p) => !(p.c[0] > 51.0 && p.c[0] < 52.0 && p.c[2] > 63.7 && p.c[2] < 64.55) && !(Math.abs(p.c[0] - 51.5) < 0.05 && Math.abs(p.c[2] - 62.9) < 0.05));
    expect(inner).toEqual([]);
    const cab = skinsIn(51.0, 52.0, 63.7, 64.55, 0, 1.7);
    expect(cab.length).toBeGreaterThanOrEqual(30);
    expect(cab.filter((p) => p.color === '#27546e')).toHaveLength(1);
    expect(cab.filter((p) => ['#2f9e5a', '#c98a1f', '#b5282d'].includes(p.color)).length).toBeGreaterThanOrEqual(3);
  });

  it("the walls are dressed (the set's own materials under the hall's panels): plinth, dado, block, rail and posts on the south, west and east walls with the L5 door, the L6 door, the floor switch and the interlock lamp left clear; a tide gauge with eight marks and a flood line; the interlock's housing and the outfall sign", () => {
    expect(skinsIn(40.2, 64, 54.2, 54.4, 0, 4.6).length).toBeGreaterThanOrEqual(10);
    expect(skinsIn(40.2, 40.4, 54, 69.6, 0, 4.6).length).toBeGreaterThanOrEqual(12);
    expect(skinsIn(63.6, 63.8, 54, 71, 0, 4.6).length).toBeGreaterThanOrEqual(20);
    // clear: the L5 door's span on the south wall, the L6 door's span on the east wall to 2.9 m (its sign stands above)
    expect(skinsIn(52.0, 54.0, 54.2, 54.4, 0, 4.6)).toEqual([]);
    expect(skinsIn(63.6, 63.8, 61.0, 63.0, 0, 2.9)).toEqual([]);
    const gauge = skins.filter((p) => Math.abs(p.c[0] - (A6_SHELL.west + 0.075)) < 0.01 && p.color === '#1d1f20');
    expect(gauge).toHaveLength(8);
    expect(skins.some((p) => Math.abs(p.c[0] - (A6_SHELL.west + 0.075)) < 0.01 && p.color === '#b5282d' && Math.abs(p.c[1] - 3.23) < 0.01)).toBe(true);
    expect(skins.some((p) => p.color === '#3a3f44' && Math.abs(p.c[2] - 64.0) < 1e-6 && Math.abs(p.c[1] - 2.3) < 1e-6 && p.c[0] > 63.7)).toBe(true);
    expect(skins.some((p) => p.color === '#e5e5de' && p.s[2] > 1.3 && Math.abs(p.c[2] - 62.0) < 1e-6 && p.c[1] > 3)).toBe(true);
  });

  it('the overhead crane is dressed: two runway beams on the walls, a girder across at z 60.3 clear of every lamp, a hoist with chain, block and hook; the tagged-out fittings (sump high-bay and two west bulkheads) are dark housings with red tags; the live fittings hang on rods and arms', () => {
    const high = skins.filter((p) => p.c[1] > 7.8 && p.c[1] < 9.2 && p.s[0] > 20);
    expect(high).toHaveLength(3);
    for (const p of high) expect(Math.abs(p.c[2] - A6_CRANE.girderZ)).toBeLessThan(0.3);
    for (const l of lamps) expect(Math.abs(l.z - A6_CRANE.girderZ), `lamp ${l.id}`).toBeGreaterThan(1.5);
    const runway = skins.filter((p) => p.s[2] > 16 && p.c[1] > 7.8 && p.c[1] < 8.3);
    expect(runway.map((p) => Number(p.c[0].toFixed(2))).sort((p, q) => p - q)).toEqual([40.55, 40.55, 40.55, 63.45, 63.45, 63.45]);
    expect(skins.filter((p) => p.c[0] > 49.4 && p.c[0] < 50.6 && p.c[2] > 59.9 && p.c[2] < 60.7 && p.c[1] > 5.9).length).toBeGreaterThanOrEqual(9);
    for (const f of A6_DEAD_FITTINGS) {
      const plates = skins.filter((p) => Math.abs(p.c[0] - f.x) <= f.sx / 2 + 1e-6 && Math.abs(p.c[1] - f.y) <= f.sy / 2 + 1e-6 && Math.abs(p.c[2] - f.z) <= f.sz / 2 + 1e-6);
      expect(plates.length, `housing at (${f.x}, ${f.y}, ${f.z})`).toBe(6);
      expect(skins.some((p) => p.color === '#c0262b' && Math.abs(p.c[0] - f.x) < 0.01 && p.c[1] < f.y - f.sy / 2 && p.c[1] > f.y - 0.7)).toBe(true);
    }
    for (const x of [53.5, 59.5]) expect(skins.some((p) => Math.abs(p.c[0] - x) < 0.01 && Math.abs(p.c[1] - 6.6) < 0.03 && p.c[2] > 71.4 && p.c[2] < 71.7)).toBe(true);
    for (const l of lamps.filter((q) => q.group === 60)) expect(skins.some((p) => Math.abs(p.c[0] - l.x) < 0.01 && Math.abs(p.c[2] - l.z) < 0.01 && top(p) > 9.99)).toBe(true);
  });
});
