/**
 * A4 the Goods Shed (marlow-final slice 4; set doc `docs/marlow-final/sets/a4GoodsShed.md`): the set's own cases. The security
 * room's console is a timed loop (60 s, re-arm 20 s) on the three cameras' flag and refuses while the officer is up; the dock
 * wicket is L4's own east door held by an egress gate on a push bar on the floor side; every lamp is on its circuit and the
 * dark back aisle, the lit main aisle and the unlit kettle read as designed; the steps validate and read per player; the
 * officer is reached from behind unseen, the talking pair cover each other and D2 walks his kettle loop; nothing in A4 can be
 * climbed alone (racking and mezzanine are `noLedge`, no co-op lip, no solo jump reaches the deck). The map-wide frames
 * (`tests/ctcourse.test.ts`, `tests/ctcourseLight.test.ts`) run the contract, the register and the light bands over this part
 * too. The last block is the dressing (slice 4 step 5): the greybox pinned, hand-built skins out of the light shapes, the budgets (kit, and props per
 * area: the security room and the warehouse floor apart), every kit glow on its circuit, the props' boxes (four written, the rest over greybox
 * solids), the keep-clear points, sight and jam lines, the switches' plates, the rails, the brackets.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/ai/enemyDefs';
import { GUARD_INFO_LINE_MAX, hasInfo, takeInfo, type GuardInfo } from '../../src/ai/guardInfo';
import { PatrolWalker } from '../../src/ai/patrol';
import { PERCEPTION } from '../../src/ai/perception';
import { ContextMenu } from '../../src/game/contextMenu';
import { addGrabRows } from '../../src/game/grabMenu';
import { pickTakedown, TAKEDOWN } from '../../src/game/takedown';
import { COURSE_TEXT_MAX } from '../../src/config/course';
import { MOVEMENT } from '../../src/config/movement';
import { hyp2 } from '../../src/core/mathx';
import { layoutKnownIds, validateCourse, type EgressGate, type PickupGate } from '../../src/game/course/courseDef';
import { CourseState, REFUSE_CONSOLE_REARM } from '../../src/game/course/courseState';
import { CONSOLE_DONE, CONSOLE_GUARD_UP, CONSOLE_REARM, cameraOff, consoleErrors, consoleRefusal } from '../../src/game/course/securityRoom';
import { validateSecurity } from '../../src/security/data';
import { generateLedges } from '../../src/world/anchors';
import { LevelBuilder, type BoxPiece } from '../../src/world/levelBuilder';
import { surfaceAt } from '../../src/world/surfaces';
import { MARLOW_LEVEL } from '../../src/world/lighting/levels';
import { circuitOf, LURE_RANGE, marlowCourseGroups, MARLOW_POCKETS } from '../../src/world/lighting/marlowCircuits';
import { buildCtcourse, COOP_LIPS, LIGHT_SPOTS } from '../../src/world/maps/ctcourse';
import {
  A4_CAMERAS,
  A4_CONSOLE,
  A4_CONSOLE_AT,
  A4_D1,
  A4_D2,
  A4_DESK,
  A4_DOCK1,
  A4_DOCK2,
  A4_DOCK2_FACES,
  A4_DOCK2_LOOP,
  A4_DOCK2_ROUTE,
  A4_FLOOR,
  A4_GATE,
  A4_KETTLE,
  A4_LOOP,
  A4_LOOP_FLAG,
  A4_MEZZ,
  A4_OFFICE,
  A4_OFFICE_DOOR,
  A4_OFFICE_DOOR_X,
  A4_OFFICER,
  A4_OFFICER_INFO,
  A4_PASSAGE,
  A4_PASSAGE_DOOR,
  A4_PIER_X,
  A4_POST,
  A4_PROPS,
  A4_PUSHBAR,
  A4_RACK_H,
  A4_RACK_ROWS,
  A4_RACK_X,
  A4_RACK_Z,
  A4_ROOM,
  A4_SHUTTER,
  A4_SPOT_N,
  A4_SPOT_S,
  A4_STACK_N,
  A4_STACK_S,
  A4_STAIR,
  A4_STAIR_RAIL,
  A4_WEST_FLAG,
  A4_WEST_ZONE,
  A4_WICKET_GATE,
} from '../../src/world/maps/ctcourseSets/a4GoodsShed';
import { L4_EAST_DOOR } from '../../src/world/maps/ctcourseSets/facility';
import { checkSetPart, HOLD_BOX, inBox, OBJECTIVE_ID_MAX, registerSum, SET_BOX, setGroups } from '../../src/world/maps/ctcourseSets/types';
import { soloJumpThreats, MANTLE, type CoopGrip } from '../helpers/soloJumpReach';
import { kitTriangles } from '../../src/world/kit/facilityKit';
import { FacilityProps, propGlows, PROP_OWN_SUPPLY, propCollisionBox, propDraws, propToWorld, propTriangles, PROP_FOOTPRINT, PROP_PROUD, PROP_SET_BUDGET, type PropPlacement, type PropReport } from '../../src/world/props/facilityProps';
import { CANON_MIN_THICK } from '../../src/voxel/lightShapes';

const b = new LevelBuilder();
const built = buildCtcourse(b);
const part = built.parts[3]!;
const lay = built.layout;
const course = lay.course!;
const def = course.def;
const range = built.ranges.a4GoodsShed;
const mine = b.boxes.slice(range.boxes[0], range.boxes[1]);
/** The greybox as S4 built it (slice 4 steps 2-4): its 92 boxes (52 solids: the racking, the deck block, the stairs' ramp colliders and underside fillers, the office, the kit's rails and glass among them; the risers are visual), 20 lamps, 2 doors, no anchor. The dressing is appended after. */
const GREY = { boxes: 92, solids: 52, lights: 20, doors: 2, anchors: 0, checksum: 31467.63779606159 };
const grey = mine.slice(0, GREY.boxes);
/** A quarter-turn box folded upright (a kit rail along x is yawed): the axis-aligned shape the solo-reach and walk checks read. */
const upright = (p: BoxPiece): BoxPiece => (Math.abs(Math.sin(p.yaw)) > 0.5 ? { ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 } : { ...p, yaw: 0 });
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.pitch) < 1e-3 && (Math.abs(Math.sin(p.yaw)) < 1e-3 || Math.abs(Math.cos(p.yaw)) < 1e-3)).map(upright);
const box = SET_BOX.a4GoodsShed;
const floorBox = box[2]!;
const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && box.some((bx) => inBox(bx, l.x, l.z)) && l.group >= 40 && l.group <= 49);
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
/** The stairs' open-side collision rail (S34-check polish 4): the dressing's invisible `kit.handrail` boxes on the line z `A4_STAIR_RAIL.z` (nine a flight). */
const stairRail = mine.slice(GREY.boxes).filter((p) => p.collide && p.visible === false && Math.abs(p.c[2] - A4_STAIR_RAIL.z) < 1e-6);
const anchors = generateLedges(b.boxes, b.anchors);
const tuned = (JSON.parse(readFileSync('tests/ctcourse/a4GoodsShed.light.json', 'utf8')) as { levels: Record<string, number> }).levels;
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
/** The first leg of a polyline a body of radius `r` cannot walk, or null. */
const pathBlocked = (path: readonly (readonly [number, number])[], r = MOVEMENT.radius): string | null => {
  for (let i = 1; i < path.length; i++) {
    const hit = walkBlocked(path[i - 1]![0], path[i - 1]![1], path[i]![0], path[i]![1], r);
    if (hit) return `leg ${i}: ${hit}`;
  }
  return null;
};
/** A fresh course at set 4 with the two players at the given feet. */
function runAt(a: [number, number], c: [number, number]): CourseState {
  const s = new CourseState(def, course.consoles);
  s.startAt(4);
  s.setPlayer(0, a[0], 0, a[1], false);
  s.setPlayer(1, c[0], 0, c[1], false);
  s.update(1 / 60);
  return s;
}
const run = (s: CourseState, sec: number): void => {
  for (let t = 0; t < sec - 1e-9; t += 1 / 60) s.update(1 / 60);
};
const steps = def.objectives!.filter((o) => o.bay === 'A4');
const step = (id: string) => def.objectives!.find((o) => o.id === id)!;
const consoleDef = part.consoles[0]!;
const cams = part.cameras;
const AT_CONSOLE: [number, number] = [A4_CONSOLE_AT.x, A4_CONSOLE_AT.z - 0.4];
const AT_PUSHBAR: [number, number] = [77.6, 34.6];
const doorOf = (id: string) => b.anchors.doors.find((d) => d.id === course.doors[id])!;

describe('A4 the Goods Shed: the part', () => {
  it('is built (not the stub) and passes the contract rules', () => {
    expect(part.id).toBe('a4GoodsShed');
    expect(part.stub).toBeUndefined();
    expect(checkSetPart(part)).toEqual([]);
  });

  it("every register row is an A4 row; the lamps, solids, doors and anchors they count are the builder's", () => {
    expect(part.register.every((r) => r.id.startsWith('A4-'))).toBe(true);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A4-1', 'A4-2', 'A4-3', 'A4-4', 'A4-5', 'A4-6', 'A4-7', 'A4-8', 'A4-9', 'A4-10', 'A4-11', 'A4-12', 'A4-13']));
    const sum = registerSum(part.register);
    expect(sum).toEqual(built.counts.sets.a4GoodsShed);
    // 20 lamps (LIGHTING-PLAN 3: room 2, floor 8, aisles 6, mezzanine 4), the passage door and the office door, no manual ledge or other anchor
    expect(sum.lights).toBe(20);
    expect(sum.doors).toBe(2);
    expect(sum.anchors).toBe(0);
    expect(sum.solids).toBe(mine.filter((p) => p.collide).length);
    for (const r of part.register) expect(/[–—]/.test(r.element), r.id).toBe(false);
  });

  it('everything built lies inside the set boxes (0.3 m of wall slack) and under the hall roof', () => {
    expect(mine.length).toBeGreaterThan(40);
    for (const p of mine.filter((q) => Math.abs(q.yaw) < 1e-3 && Math.abs(q.pitch) < 1e-3)) {
      const foot = [p.c[0] - p.s[0] / 2, p.c[2] - p.s[2] / 2, p.c[0] + p.s[0] / 2, p.c[2] + p.s[2] / 2] as const;
      expect(box.some((bx) => inBox(bx, foot[0], foot[1], 0.3) && inBox(bx, foot[2], foot[3], 0.3)), `box at (${p.c.join(', ')})`).toBe(true);
      expect(top(p)).toBeLessThanOrEqual(10 + 1e-6);
    }
  });

  it('the greybox is pinned: its boxes (checksum), 20 lamps, 2 doors, no anchor; the dressing is appended after it', () => {
    let sum = 0;
    for (const p of grey) sum += (p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw) * (p.collide ? 1 : 1.5) * (p.visible === false ? 1.25 : 1) * (p.overhead ? 1.1 : 1);
    expect(grey).toHaveLength(GREY.boxes);
    expect(sum).toBeCloseTo(GREY.checksum, 3);
    expect(grey.filter((p) => p.collide)).toHaveLength(GREY.solids);
    // the register's totals include the dressing's four written prop boxes (the video wall's two, the reach truck's two): the greybox's own are GREY.solids
    // (and the stairs' open-side rail's boxes: eighteen, nine a flight)
    expect(built.counts.sets.a4GoodsShed).toEqual({ lights: GREY.lights, solids: GREY.solids + 4 + stairRail.length, doors: GREY.doors, anchors: GREY.anchors });
  });
});

describe('A4 the Goods Shed: the floor (racking, mezzanine, stairs; nothing climbable alone)', () => {
  const racks = mine.filter((p) => p.collide && Math.abs(top(p) - A4_RACK_H) < 1e-6);
  const deck = mine.find((p) => p.collide && Math.abs(top(p) - A4_MEZZ.deck) < 1e-6 && p.s[0] > 15)!;
  const ramps = mine.filter((p) => p.collide && Math.abs(p.pitch) > 1e-3);

  it('four 5.4 m rack runs, two rows of two (x 86-95 and 98.5-108, z 27.3-29.7 and 33.2-35.6), solid and noLedge', () => {
    expect(racks).toHaveLength(4);
    for (const p of racks) {
      expect(p.noLedge).toBe(true);
      expect(p.s[1]).toBeCloseTo(A4_RACK_H, 9);
    }
    for (const [z0, z1] of A4_RACK_Z) for (const [x0, x1] of A4_RACK_X) expect(racks.some((p) => Math.abs(p.c[0] - (x0 + x1) / 2) < 1e-6 && Math.abs(p.c[2] - (z0 + z1) / 2) < 1e-6 && Math.abs(p.s[0] - (x1 - x0)) < 1e-6 && Math.abs(p.s[2] - (z1 - z0)) < 1e-6)).toBe(true);
  });

  it('the aisles are the plan: back 3.05 (the dark pocket), aisle 2 3.5, cross 3.5, east lane 3.75, main 8.4; no split-jump gap anywhere in A4', () => {
    expect(A4_RACK_Z[0]![0] - A4_FLOOR.z0).toBeCloseTo(3.05, 9);
    expect(A4_RACK_Z[1]![0] - A4_RACK_Z[0]![1]).toBeCloseTo(3.5, 9);
    expect(A4_RACK_X[1]![0] - A4_RACK_X[0]![1]).toBeCloseTo(3.5, 9);
    expect(A4_FLOOR.x1 - A4_RACK_X[1]![1]).toBeCloseTo(3.75, 9);
    expect(A4_OFFICE.z1 - A4_RACK_Z[1]![1]).toBeCloseTo(8.4, 9);
    // every gap between two tall faces is over the split jump's widest (1.95 m)
    expect(anchors.splits.filter((s) => box.some((bx) => inBox(bx, s.a.x, s.a.z)))).toEqual([]);
  });

  it('every block 1.9 m or taller is noLedge (racking, deck block, office walls and roof, the room, the infill); the low cover (the stacks, the desk) is under the ledge minimum', () => {
    for (const p of mine.filter((q) => q.collide && Math.abs(q.pitch) < 1e-3)) {
      if (top(p) >= 1.9 && p.s[1] >= 1.9) expect(p.noLedge, `box at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBe(true);
    }
    for (const s of [A4_STACK_N, A4_STACK_S]) expect(s.h).toBeLessThan(1.9);
    expect(A4_DESK.h).toBeLessThan(1.9);
    // the office roof is overhead and noLedge (no roof access)
    const roof = mine.find((p) => p.overhead && Math.abs(top(p) - 3.0) < 1e-6)!;
    expect(roof.noLedge).toBe(true);
  });

  it('the game offers no grip in A4 above 0.9 m: no generated lip, no manual ledge, no planned lip, no top in the 3.8-4.5 band', () => {
    const generated = anchors.ledges.filter((l) => inBox(floorBox, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3) && l.top >= 0.9);
    expect(generated.map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
    expect(anchors.ledges.filter((l) => l.piece === 0 && box.some((bx) => inBox(bx, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3)))).toEqual([]);
    expect(part.lips).toEqual([]);
    expect(COOP_LIPS.filter((l) => box.some((bx) => inBox(bx, l.a.x, l.a.z, 0.3)))).toEqual([]);
    for (const p of mine.filter((q) => q.collide && Math.abs(q.pitch) < 1e-3 && q.s[1] >= 0.4)) expect(top(p) < 3.8 || top(p) > 4.5 || p.noLedge === true, `box at (${p.c.join(', ')}) top ${top(p)}`).toBe(true);
  });

  it('the mezzanine is one solid 3.3 m block x 86-106, z 44-47.75 on the north wall, noLedge, metal plate; the three open edges carry a 1.1 m rail (noLedge)', () => {
    expect(deck.noLedge).toBe(true);
    expect([deck.c[0] - deck.s[0] / 2, deck.c[0] + deck.s[0] / 2]).toEqual([A4_MEZZ.x0, A4_MEZZ.x1]);
    expect([deck.c[2] - deck.s[2] / 2, deck.c[2] + deck.s[2] / 2]).toEqual([A4_MEZZ.z0, A4_MEZZ.z1]);
    expect(A4_MEZZ.z1).toBe(A4_FLOOR.z1);
    expect(surfaceAt(b.surfaces, 96, A4_MEZZ.deck, 46, 'concrete')).toBe('metal');
    expect(surfaceAt(b.surfaces, 96, 0, 40, 'concrete')).toBe('concrete');
    const rails = mine.filter((p) => p.collide && Math.abs(p.s[1] - A4_MEZZ.rail) < 1e-6 && Math.abs(p.c[1] - (A4_MEZZ.deck + A4_MEZZ.rail / 2)) < 1e-6);
    expect(rails).toHaveLength(3);
    for (const r of rails) expect(r.noLedge).toBe(true);
  });

  it('two stairs of 20 risers (0.165 rise, 0.285 run, 1.2 m wide) along the north wall: the west one rising east from x 80.3, the east one rising west from x 111.7; the plates are metal', () => {
    expect(ramps).toHaveLength(2);
    const risers = grey.filter((p) => !p.collide && p.visible !== false && p.s[1] > 0.1 && p.c[2] > A4_STAIR.z0 && p.c[2] < A4_STAIR.z1 && (p.c[0] < 86 || p.c[0] > 106));
    expect(risers).toHaveLength(40);
    for (const x of [80.3, 111.7]) expect(risers.some((p) => Math.abs(p.c[0] - x) < 0.3)).toBe(true);
    expect(Math.max(...risers.map(top))).toBeCloseTo(A4_MEZZ.deck, 9);
    expect(risers[0]!.s[2]).toBeCloseTo(0.285, 9);
    expect(risers[0]!.s[0]).toBeCloseTo(A4_STAIR.w, 9);
    expect(A4_MEZZ.deck / 20).toBeLessThanOrEqual(MOVEMENT.maxStep);
    expect(A4_STAIR.z1 - A4_STAIR.z0).toBeCloseTo(A4_STAIR.w, 9);
    for (const [x, y] of [[81, 0.3], [85, 2.9], [110.7, 0.3], [107, 2.9]] as const) expect(surfaceAt(b.surfaces, x, y, 47.1, 'concrete'), `(${x}, ${y})`).toBe('metal');
    // the heads meet the deck block's end faces
    expect(ramps.map((r) => Number(r.c[0].toFixed(2)))).toEqual([83.15, 108.85]);
  });

  it('the flights are solid underneath: invisible noLedge fillers fill the space between the floor and each ramp collider (nothing can stand in the steps); without them there is air', () => {
    const len = (ramps[0]!.s[2] ** 2 - A4_MEZZ.deck ** 2) ** 0.5;
    const flights = [
      { name: 'west', line: (x: number) => (A4_MEZZ.deck * (x - A4_STAIR.westFoot)) / len, xs: [A4_STAIR.westFoot, A4_STAIR.westFoot + len] as const, ramp: ramps[0]! },
      { name: 'east', line: (x: number) => (A4_MEZZ.deck * (A4_STAIR.eastFoot - x)) / len, xs: [A4_STAIR.eastFoot - len, A4_STAIR.eastFoot] as const, ramp: ramps[1]! },
    ];
    const fillers = mine.filter((p) => p.collide && p.visible === false && Math.abs(p.pitch) < 1e-3);
    expect(fillers.length).toBeGreaterThanOrEqual(20);
    for (const f of fillers) expect(f.noLedge).toBe(true);
    const inside = (p: BoxPiece, x: number, y: number, z: number): boolean => Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(y - p.c[1]) <= p.s[1] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2;
    for (const f of flights) {
      const under = (x: number): number => f.line(x) - f.ramp.s[1] * (f.ramp.s[2] / len);
      let air = 0;
      let airWithout = 0;
      let samples = 0;
      for (let x = f.xs[0] + 0.05; x < f.xs[1]; x += 0.15) {
        for (const z of [A4_STAIR.z0 + 0.05, (A4_STAIR.z0 + A4_STAIR.z1) / 2, A4_STAIR.z1 - 0.05]) {
          for (let y = 0.02; y < f.line(x) - 0.02; y += 0.1) {
            samples++;
            if (y >= under(x) - 1e-6) continue;
            if (!fillers.some((p) => inside(p, x, y, z))) air++;
            airWithout++;
          }
        }
      }
      expect(samples, f.name).toBeGreaterThan(200);
      expect(air, `${f.name} stair: air under the flight`).toBe(0);
      expect(airWithout, `${f.name} stair: the check has teeth`).toBeGreaterThan(100);
    }
  });

  it('no solo way up: no top a running jump uses reaches a lip on the deck edge (a hypothetical one) or over the racking; the check has teeth', () => {
    const deckEdge: CoopGrip = { y: A4_MEZZ.deck, a: { x: A4_MEZZ.x0, z: A4_MEZZ.z0 }, b: { x: A4_MEZZ.x1, z: A4_MEZZ.z0 }, n: { x: 0, z: -1 } };
    // any lip height a jump could be asked to reach: the deck's 3.3 m, the 4.4 m co-op band over it, the racking's 5.4 m and the 4.4 m under it
    for (const y of [A4_MEZZ.deck, 4.4]) expect(soloJumpThreats(solid, { ...deckEdge, y }), `deck edge lip at ${y}`).toEqual([]);
    for (const [z0, z1] of A4_RACK_Z) {
      for (const [x0, x1] of A4_RACK_X) {
        for (const y of [4.4, A4_RACK_H]) {
          expect(soloJumpThreats(solid, { y, a: { x: x0, z: z0 }, b: { x: x1, z: z0 }, n: { x: 0, z: -1 } }), `rack z ${z0} lip at ${y}`).toEqual([]);
          expect(soloJumpThreats(solid, { y, a: { x: x0, z: z1 }, b: { x: x1, z: z1 }, n: { x: 0, z: 1 } }), `rack z ${z1} lip at ${y}`).toEqual([]);
        }
      }
    }
    // teeth: a 1.8 m crate on the aisle beside the deck's south edge is a top a jump uses; a 1.2 m stack too close would not matter (it is low), so only the tall crate is tested
    const crate: BoxPiece = { c: [96, 0.9, A4_MEZZ.z0 - 1.5], s: [1, 1.8, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true };
    expect(soloJumpThreats([...solid, crate], deckEdge).length).toBeGreaterThan(0);
    // and the deck is over the mantle with no ledge: a body cannot climb onto it
    expect(A4_MEZZ.deck).toBeGreaterThan(MANTLE);
  });
});

describe('A4 the Goods Shed: the security room, the passage and the dispatch office', () => {
  it('two 1.2 x 2.1 swing doors, both unlocked: the passage door x 101.7-102.9 on z 19.6 and the office door x 77.7-78.9 on z 38; course ids start A4-', () => {
    const p = doorOf(A4_PASSAGE_DOOR);
    const o = doorOf(A4_OFFICE_DOOR);
    for (const d of [p, o]) {
      expect(d.width).toBeCloseTo(1.2, 9);
      expect(d.height).toBeCloseTo(2.1, 9);
      expect(d.locked).toBe(false);
    }
    expect([p.hinge.x, p.hinge.z]).toEqual([101.7, 19.6]);
    expect([o.hinge.x, o.hinge.z]).toEqual([77.7, 38]);
    expect(Object.keys(part.doors)).toEqual([A4_PASSAGE_DOOR, A4_OFFICE_DOOR]);
    expect(A4_PASSAGE_DOOR.startsWith('A4-') && A4_OFFICE_DOOR.startsWith('A4-')).toBe(true);
  });

  it("the passage's wall opening is closed by the infill except the door: a body cannot pass beside the door, and the door's gap is open floor", () => {
    for (const x of [101.3, 101.6, 103.0, 103.5, 103.7]) expect(blockedAt(x, A4_PASSAGE.wallZ, 0.05), `x ${x}`).not.toEqual([]);
    expect(blockedAt(102.3, A4_PASSAGE.wallZ, MOVEMENT.radius)).toEqual([]);
    expect(blockedAt(102.3, 19.1, MOVEMENT.radius)).toEqual([]);
    // the lintel closes the opening above the door up to the gallery's underside (4.2)
    const lintel = mine.find((p) => p.collide && Math.abs(p.c[0] - 102.3) < 1e-6 && Math.abs(p.c[2] - 19.6) < 1e-6 && p.c[1] > 2.1)!;
    expect(lintel).toBeDefined();
    expect(top(lintel)).toBeCloseTo(4.2, 9);
  });

  it('the room has a 3.0 m ceiling (overhead, noLedge) over its lamps and a console desk on the north wall; the officer\'s post and the console\'s standing spot are clear floor', () => {
    const ceil = mine.find((p) => p.overhead && Math.abs(p.c[1] - 3.1) < 1e-6)!;
    expect(ceil).toBeDefined();
    expect(ceil.noLedge).toBe(true);
    expect(ceil.c[1] - ceil.s[1] / 2).toBeCloseTo(A4_ROOM.ceilY, 9);
    for (const l of lamps.filter((q) => q.group === 40)) expect(l.y).toBeLessThan(A4_ROOM.ceilY);
    const desk = mine.find((p) => p.collide && Math.abs(top(p) - 0.75) < 1e-6 && p.c[2] > 18.5)!;
    expect(desk.c[2] + desk.s[2] / 2).toBeCloseTo(A4_ROOM.z1, 9);
    expect(blockedAt(A4_POST.x, A4_POST.z, 0.3)).toEqual([]);
    expect(blockedAt(AT_CONSOLE[0], AT_CONSOLE[1], 0.3)).toEqual([]);
    expect(hyp2(AT_CONSOLE[0] - A4_CONSOLE_AT.x, AT_CONSOLE[1] - A4_CONSOLE_AT.z)).toBeLessThanOrEqual(1.4);
  });

  it('the dispatch office: 0.2 m walls to 2.9 m, a 3.0 m overhead roof, clear glazing on the south (x 80-82.6) and east faces over a 0.9 m sill, no lamp of its own; the kettle counter is on the west wall and clear glass passes light', () => {
    const roof = mine.find((p) => p.overhead && Math.abs(top(p) - 3.0) < 1e-6 && p.s[0] > 6)!;
    expect(roof.c[0] - roof.s[0] / 2).toBeCloseTo(A4_FLOOR.x0, 9);
    const glass = mine.filter((p) => p.collide && p.visible === false && Math.abs(p.s[1] - (A4_OFFICE.head - A4_OFFICE.sill)) < 1e-6);
    expect(glass).toHaveLength(2);
    expect(lamps.filter((l) => inBox([76, 38, 82.6, 44], l.x, l.z) && l.y < 3.0)).toEqual([]);
    const counter = mine.find((p) => p.collide && Math.abs(top(p) - 0.9) < 1e-6 && p.c[0] < 77)!;
    expect(counter.c[0] - counter.s[0] / 2).toBeCloseTo(A4_FLOOR.x0, 9);
    // D2's stop at the kettle is clear floor (0.35 m off the counter) and faces it (west)
    expect(blockedAt(A4_KETTLE.x, A4_KETTLE.z, 0.3)).toEqual([]);
    expect(A4_DOCK2_FACES[4]).toBeCloseTo(-Math.PI / 2, 9);
    expect(part.hideSpots.some((h) => inBox([76, 38, 82.6, 44], h.x, h.z))).toBe(true);
  });
});

describe('A4 the Goods Shed: the console loop (N3), refused while the officer is up', () => {
  const gate = part.bay.gates.find((g) => g.id === A4_GATE) as PickupGate;

  it('one console on the cameras\' flag: 60 s, re-arm 20 s, guarded by the officer, a shared pickup gate on it; every camera is covered by it and the console data validates', () => {
    expect(part.consoles).toEqual([{ id: A4_CONSOLE, guard: A4_OFFICER, flag: A4_LOOP_FLAG, seconds: 60, rearm: 20 }]);
    expect(A4_LOOP).toEqual({ seconds: 60, rearm: 20 });
    expect(gate).toMatchObject({ kind: 'pickup', id: A4_GATE, switchId: A4_CONSOLE, flag: A4_LOOP_FLAG, perPlayer: false });
    expect(course.consoles).toContainEqual(consoleDef);
    expect(consoleErrors(course, lay.security!.devices)).toEqual([]);
    expect(cams.map((c) => c.id)).toEqual([...A4_CAMERAS]);
    for (const c of cams) expect(c.offFlag, c.id).toBe(consoleDef.flag);
    expect(part.devices[A4_CONSOLE]).toBeDefined();
    expect(inBox(box[0]!, part.devices[A4_CONSOLE]!.x, part.devices[A4_CONSOLE]!.z)).toBe(true);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
  });

  it('the console refuses while the officer is up (alive, held or not), before "already looped" or the re-arm; a console without a guard check would not (the check has teeth)', () => {
    expect(consoleRefusal(true, false, false)).toBe(CONSOLE_GUARD_UP);
    expect(consoleRefusal(true, true, true)).toBe(CONSOLE_GUARD_UP);
    expect(consoleRefusal(false, true, false)).toBe(CONSOLE_DONE);
    expect(consoleRefusal(false, false, true)).toBe(CONSOLE_REARM);
    expect(consoleRefusal(false, false, false)).toBeNull();
    // the squad names him: the console's guard is a slot of this bay's squad, so the course state / mode can find him
    expect(part.bay.squad).toContain(consoleDef.guard);
    expect(part.squads[consoleDef.guard]).toBeDefined();
    // a console whose guard slot is missing is an error (the validator bites)
    expect(consoleErrors({ ...course, squads: {} }, lay.security!.devices).length).toBeGreaterThan(0);
  });

  it('a press loops the cameras for 60 s on the shared flag (the cameras are off by it, then back), a press inside the 20 s re-arm is refused, then it loops again', () => {
    const s = runAt(AT_CONSOLE, [92, 39.8]);
    const off = (id: string): boolean => cameraOff(cams.find((c) => c.id === id)!, (f) => s.hasShared(f));
    expect(s.isGateOpen(A4_GATE)).toBe(false);
    expect(A4_CAMERAS.some((id) => off(id))).toBe(false);
    expect(s.press(A4_CONSOLE, 0)).toBeNull();
    expect(s.isGateOpen(A4_GATE)).toBe(true);
    expect(s.hasShared(A4_LOOP_FLAG)).toBe(true);
    expect(s.gateTimer(A4_GATE)).toBe(60);
    expect(A4_CAMERAS.every((id) => off(id))).toBe(true);
    run(s, 30);
    expect(s.gateTimer(A4_GATE)).toBeCloseTo(30, 1);
    expect(s.stepTimer(step('a4-floor'))).toBeCloseTo(30, 1);
    // a second press while the loop runs does nothing (the window is not reset)
    expect(s.press(A4_CONSOLE, 1)).toBeNull();
    run(s, 0.5);
    expect(s.gateTimer(A4_GATE)).toBeLessThan(30);
    run(s, 29.6);
    // the window ends: the flag clears (the cameras are back), the gate closes, the steps stay latched
    expect(s.hasShared(A4_LOOP_FLAG)).toBe(false);
    expect(s.isGateOpen(A4_GATE)).toBe(false);
    expect(A4_CAMERAS.some((id) => off(id))).toBe(false);
    expect(s.isStepDone('a4-room')).toBe(true);
    expect(s.gateRearm(A4_GATE)).toBeGreaterThan(19);
    expect(s.press(A4_CONSOLE, 0)).toBe(REFUSE_CONSOLE_REARM);
    expect(s.isGateOpen(A4_GATE)).toBe(false);
    run(s, 20.2);
    expect(s.gateRearm(A4_GATE)).toBe(0);
    expect(s.press(A4_CONSOLE, 0)).toBeNull();
    expect(s.isGateOpen(A4_GATE)).toBe(true);
    expect(s.gateTimer(A4_GATE)).toBe(60);
  });

  it('the loop covers the taught crossings with time to spare: the main aisle to stack N (38.9 m), the back aisle to stack S (24.4 m) at the silent crouched pace; the takedown still fits', () => {
    const main: [number, number][] = [[102.5, 24.6], [97, 25.8], [96.75, 38], [88, 39.8], [82, 38.6], [A4_SPOT_N.x, A4_SPOT_N.z]];
    const shadow: [number, number][] = [[102.5, 24.6], [90, 25.8], [84.5, 25.8], [A4_SPOT_S.x, A4_SPOT_S.z]];
    const len = (p: [number, number][]): number => p.reduce((n, a, i) => (i === 0 ? 0 : n + hyp2(a[0] - p[i - 1]![0], a[1] - p[i - 1]![1])), 0);
    expect(len(main) / 1.7).toBeLessThan(A4_LOOP.seconds - 15);
    expect(len(shadow) / 1.7).toBeLessThan(A4_LOOP.seconds - 30);
    // the legs are open floor (the main line goes round the dispatch office's east face, up the cross aisle and along the lit main aisle)
    expect(pathBlocked([[102.5, 24.6], [97, 25.8], [96.75, 36], [96.75, 38.5], [88, 39.8], [84.5, 37.2], [A4_SPOT_N.x, A4_SPOT_N.z]])).toBeNull();
    expect(pathBlocked([[102.5, 24.6], [96.75, 25.8], [90, 25.8], [84.5, 25.8], [82, 27.5], [A4_SPOT_S.x, A4_SPOT_S.z]])).toBeNull();
  });
});

describe('A4 the Goods Shed: the dock wicket (L4\'s east door, an egress gate on a push bar)', () => {
  const gate = part.bay.gates.find((g) => g.id === A4_WICKET_GATE) as EgressGate;

  it('one egress gate on L4\'s east door, held by the push bar on the floor side: the door is built locked and only the bar opens it', () => {
    expect(gate).toMatchObject({ kind: 'egress', id: A4_WICKET_GATE, switchId: A4_PUSHBAR, doorIds: [L4_EAST_DOOR] });
    expect(part.bay.gates.map((g) => g.id)).toEqual([A4_WICKET_GATE, A4_GATE]);
    const door = doorOf(L4_EAST_DOOR);
    expect(door.locked).toBe(true);
    expect(door.hinge.x).toBeCloseTo(76, 9);
    // the bar is on the floor side of L4's east wall, outside L4, within reach of the door; L4 has no device of its own
    const bar = part.devices[A4_PUSHBAR]!;
    const [lx0, lz0, lx1, lz1] = HOLD_BOX.L4;
    expect(bar.x).toBeGreaterThan(lx1);
    expect(inBox([lx0, lz0, lx1, lz1], bar.x, bar.z)).toBe(false);
    expect(inBox(floorBox, bar.x, bar.z)).toBe(true);
    expect(Math.abs(bar.z - 33)).toBeLessThanOrEqual(2);
    expect(bar.yaw).toBeCloseTo(Math.PI / 2, 9);
    for (const d of Object.values(part.devices)) expect(inBox([lx0, lz0, lx1, lz1], d.x, d.z), 'no device inside L4').toBe(false);
    // nothing else in the course names the door: no lever, flag or bolt gate
    const others = def.bays.flatMap((bay) => bay.gates).filter((g) => g.id !== A4_WICKET_GATE && 'doorId' in g && g.doorId === L4_EAST_DOOR);
    expect(others).toEqual([]);
    expect(def.bays.flatMap((bay) => bay.gates).filter((g) => g.kind === 'egress' && g.doorIds.includes(L4_EAST_DOOR))).toHaveLength(1);
    expect(blockedAt(AT_PUSHBAR[0], AT_PUSHBAR[1], 0.3)).toEqual([]);
    expect(hyp2(AT_PUSHBAR[0] - bar.x, AT_PUSHBAR[1] - bar.z)).toBeLessThanOrEqual(1.4);
  });

  it('the door stays locked until the bar is pressed (the console or any other device does not open it); the press opens it and ticks a4-dock', () => {
    const s = runAt([80.4, 37], [79.6, 29]);
    expect(s.locked(L4_EAST_DOOR)).toBe(true);
    expect(s.press(A4_CONSOLE, 0)).toBeNull();
    expect(s.locked(L4_EAST_DOOR)).toBe(true);
    expect(s.isGateOpen(A4_WICKET_GATE)).toBe(false);
    expect(s.press(A4_PUSHBAR, 1)).toBeNull();
    expect(s.isGateOpen(A4_WICKET_GATE)).toBe(true);
    expect(s.locked(L4_EAST_DOOR)).toBe(false);
    s.update(1 / 60);
    expect(s.isStepDone('a4-dock')).toBe(true);
    // the other holding-room door in the chain is the facility's: the far door stays locked until the airlock cycles
    expect(s.locked('L4-far')).toBe(true);
  });
});

describe('A4 the Goods Shed: the steps, the claim, the pass zone and the radio', () => {
  it('four steps in route order: the room, the floor, the dock (A / B lines, the loop timer on the last two) and one closing line', () => {
    expect(steps.map((o) => o.id)).toEqual(['a4-room', 'a4-floor', 'a4-dock', 'a4-lock']);
    expect(step('a4-room').done).toEqual({ flag: A4_LOOP_FLAG });
    expect(step('a4-floor').done).toEqual({ flag: A4_WEST_FLAG });
    expect(step('a4-dock').done).toEqual({ gate: A4_WICKET_GATE });
    expect(step('a4-room').timer).toBeUndefined();
    expect(step('a4-floor').timer).toBe(A4_GATE);
    expect(step('a4-dock').timer).toBe(A4_GATE);
    for (const o of steps.slice(0, 3)) {
      expect(o.a).toBeDefined();
      expect(o.b).toBeDefined();
      expect(o.a).not.toBe(o.b);
    }
    expect(steps[3]!.done).toBeUndefined();
    expect(steps.filter((o) => o.done === undefined)).toHaveLength(1);
    expect(step('a4-room').a).toMatch(/officer from behind/);
    expect(step('a4-room').b).toMatch(/console/);
    expect(step('a4-dock').a).toMatch(/nearest the office/);
    expect(step('a4-dock').b).toMatch(/nearest the racking/);
  });

  it("every line fits 90 characters, no em or en dash; ids fit the wire; the radio is the doc's three lines; the officer's two lines fit the radio", () => {
    for (const o of steps) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(/[–—]/.test(t), t).toBe(false);
      }
      expect(o.id.length).toBeLessThanOrEqual(OBJECTIVE_ID_MAX);
    }
    expect(part.bay.radio.map((r) => r.at)).toEqual(['enter', A4_GATE, `warn:${A4_GATE}`]);
    for (const r of part.bay.radio) {
      expect(r.text.length, r.text).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(r.text), r.text).toBe(false);
    }
    expect(part.bay.radio[2]!.text).toBe('Cameras back in five.');
    expect(A4_OFFICER_INFO.lines).toHaveLength(2);
    for (const l of A4_OFFICER_INFO.lines) {
      expect(l.length).toBeLessThanOrEqual(GUARD_INFO_LINE_MAX);
      expect(/[–—]/.test(l)).toBe(false);
    }
    expect(A4_OFFICER_INFO.lines[0]).toMatch(/loops the floor cameras/);
  });

  it('the first player to press the console takes B; until then the lead (P2 in this even set) reads A; the claim stands; the other player reads the other line', () => {
    const room = step('a4-room');
    let s = runAt(AT_CONSOLE, [92, 39.8]);
    expect(s.roleClaimed()).toBe(false);
    expect(s.roleOf(1)).toBe('a');
    expect(s.stepLine(room, 1)).toBe(room.a);
    expect(s.stepLine(room, 0)).toBe(room.b);
    expect(part.bay.roles).toEqual([{ role: 'b', press: [A4_CONSOLE] }]);
    // P1 presses: P1 is B, P2 is A
    expect(s.press(A4_CONSOLE, 0)).toBeNull();
    expect(s.roleClaimed()).toBe(true);
    expect(s.roleOf(0)).toBe('b');
    expect(s.roleOf(1)).toBe('a');
    expect(s.stepLine(room, 0)).toBe(room.b);
    expect(s.stepLine(room, 1)).toBe(room.a);
    // P2 pressing first makes P2 B (and P1 A)
    s = runAt([92, 39.8], AT_CONSOLE);
    expect(s.press(A4_CONSOLE, 1)).toBeNull();
    expect(s.roleOf(1)).toBe('b');
    expect(s.roleOf(0)).toBe('a');
    // a refused press (the mode refuses while the officer is up before it reaches the state) claims nothing: a press on another device does not either
    s = runAt(AT_CONSOLE, [92, 39.8]);
    expect(s.press(A4_PUSHBAR, 0)).toBeNull();
    expect(s.roleClaimed()).toBe(false);
  });

  it('the pass zone: both players on the floor west of x 84 tick the floor step; the mezzanine does not count; the flag is the set\'s external flag; the floor step then the dock step tick in order', () => {
    const [west] = part.passZones;
    expect(west).toMatchObject({ flag: A4_WEST_FLAG, floorY: 0, box: A4_WEST_ZONE });
    expect(west!.any).toBeUndefined();
    expect(part.passZones).toHaveLength(1);
    expect(part.externalFlags).toEqual([A4_WEST_FLAG]);
    expect(west!.box[0]).toBeGreaterThanOrEqual(76);
    expect(west!.box[2]).toBe(84);
    expect(west!.box[3]).toBeLessThanOrEqual(48);
    const s = runAt(AT_CONSOLE, [92, 39.8]);
    expect(s.isStepDone('a4-floor')).toBe(false);
    s.press(A4_CONSOLE, 0);
    s.setFlag(A4_WEST_FLAG);
    s.update(1 / 60);
    expect(s.isStepDone('a4-room')).toBe(true);
    expect(s.isStepDone('a4-floor')).toBe(true);
    expect(s.isStepDone('a4-dock')).toBe(false);
    s.press(A4_PUSHBAR, 1);
    s.update(1 / 60);
    expect(s.isStepDone('a4-dock')).toBe(true);
    // the step latches after the loop ends
    run(s, 61);
    expect(s.isStepDone('a4-floor')).toBe(true);
  });
});

describe('A4 the Goods Shed: the lights (LIGHTING-PLAN 3, A4)', () => {
  const by = (g: number) => lamps.filter((l) => l.group === g);

  it('twenty lamps on the plan\'s circuits 40-43: room 2, floor 8, aisles 6, mezzanine 4; none on the dead row 49; every one grouped, electric and destructible as its row says', () => {
    // every lamp in the set's boxes but the gallery's decor lamps above the glazing (group 90) is one of the twenty: none is ungrouped or on another set's circuit
    expect(b.lights.lights.filter((l) => l.kind !== 'flashlight' && l.group !== 90 && box.some((bx) => inBox(bx, l.x, l.z)))).toHaveLength(20);
    expect(lamps).toHaveLength(20);
    expect([40, 41, 42, 43].map((g) => by(g).length)).toEqual([2, 8, 6, 4]);
    expect(by(49)).toEqual([]);
    expect(circuitOf(49)!.kind).toBe('dead');
    for (const l of lamps) {
      const row = circuitOf(l.group);
      expect(row, `lamp ${l.id} group ${l.group}`).toBeDefined();
      expect(row!.room).toBe('A4');
      expect(l.electric).toBe(row!.electric);
      expect(l.destructible).toBe(row!.destructible);
      expect(row!.kind).not.toBe('house');
    }
    for (const g of [40, 41, 42, 43]) expect(by(g).length).toBe(circuitOf(g)!.lamps);
    expect(by(40).length + by(41).length + by(42).length + by(43).length).toBeLessThanOrEqual(24);
  });

  it('the lamps stand where the plan puts them: panels under the room ceiling, high-bays at 7.2 m (the dock, the main aisle, the east lane), strips at 5.6 m over aisle 2 (short of the back aisle), strips at 6.3 m over the deck', () => {
    for (const l of by(40)) expect(inBox([100, 13, 106.6, 19.6], l.x, l.z, -0.3)).toBe(true);
    for (const l of by(41)) {
      expect(l.y).toBeCloseTo(7.2, 9);
      // none over the back aisle's dark pocket (z 24.3-27.3, x 84-110) or aisle 2
      expect(l.z > 33.2 || l.x < 86 || l.x > 108, `high-bay at (${l.x}, ${l.z})`).toBe(true);
    }
    for (const l of by(42)) {
      expect(l.y).toBeCloseTo(5.6, 9);
      expect(l.z).toBeCloseTo(31.45, 9);
      expect(l.y).toBeGreaterThan(A4_RACK_H);
    }
    for (const l of by(43)) {
      expect(l.y).toBeCloseTo(6.3, 9);
      expect(l.z).toBeGreaterThan(A4_MEZZ.z0);
      expect(l.x).toBeGreaterThan(A4_MEZZ.x0);
      expect(l.x).toBeLessThan(A4_MEZZ.x1);
    }
  });

  it("the part's groups are exactly the plan's A4 rows (dead row 49 left out, so a restart restores every shot lamp), each with a lamp", () => {
    const plan = marlowCourseGroups();
    expect(part.groups).toEqual({ 'a4-secroom': plan['a4-secroom'], 'a4-floor': plan['a4-floor'], 'a4-aisles': plan['a4-aisles'], 'a4-mezz': plan['a4-mezz'] });
    expect(plan['a4-bulk']).toBeUndefined();
    for (const g of Object.values(part.groups)) expect(lamps.some((l) => l.group === g)).toBe(true);
    for (const [k, g] of Object.entries(plan)) if (k.startsWith('a4-')) expect(course.groups![k]).toBe(g);
    const [g0, g1] = setGroups('a4GoodsShed');
    for (const l of lamps) expect(l.group >= g0 && l.group <= g1).toBe(true);
  });

  it('five wall switches: the room (40) by the L3 door, the floor (41) on the pier at the office door, the aisles (42) at the west end, the mezzanine (43) two-way at both stair heads on the deck', () => {
    expect(part.switches.map((s) => [s.id, s.group])).toEqual([['a4-sw-sec', 40], ['a4-sw-floor', 41], ['a4-sw-aisles', 42], ['a4-sw-mezz-w', 43], ['a4-sw-mezz-e', 43]]);
    for (const s of part.switches.filter((x) => x.group === 40 || x.group === 42)) {
      const spot = circuitOf(s.group)!.switches.find((x) => x.id === s.id)!;
      expect(hyp2(s.pos.x - spot.x, s.pos.z - spot.z), s.id).toBeLessThanOrEqual(1);
    }
    const sw = (id: string) => part.switches.find((s) => s.id === id)!;
    // the floor switch is on the solid pier east of the office door (A4-C8: the plan hint was a point in the open aisle)
    expect(sw('a4-sw-floor').pos.x).toBeGreaterThan(A4_OFFICE_DOOR_X[1]);
    expect(sw('a4-sw-floor').pos.x).toBeLessThan(A4_PIER_X);
    expect(sw('a4-sw-floor').pos.z).toBeLessThan(A4_OFFICE.z0);
    for (const id of ['a4-sw-mezz-w', 'a4-sw-mezz-e']) {
      expect(sw(id).pos.y).toBeCloseTo(A4_MEZZ.deck + 1.2, 9);
      expect(hyp2(sw(id).pos.x - (id.endsWith('w') ? A4_MEZZ.x0 : A4_MEZZ.x1), sw(id).pos.z - 47)).toBeLessThanOrEqual(1.6);
    }
    expect(sw('a4-sw-sec').pos.x).toBeLessThan(102.1);
    // none of the switches drives the dead row
    expect(part.switches.every((s) => s.group !== 49)).toBe(true);
  });

  it('the standby zones: the floor at 0.14 (to the roof tie), the room, the passage and the deck (the doc\'s four)', () => {
    const zones = Object.fromEntries(part.ambientZones.map((z) => [z.id, z]));
    expect(zones.A4).toMatchObject({ box: [76, 24, 112, 48], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 7.4 });
    expect(zones['a4-secroom']).toMatchObject({ box: [100, 13, 107, 20], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 2.9 });
    expect(zones['a4-passage']).toMatchObject({ box: [101, 20, 104, 24], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 4.1 });
    expect(zones['a4-mezz']).toMatchObject({ box: [86, 44, 106, 48], ambient: MARLOW_LEVEL.standby, minY: 2.8, maxY: 7.4 });
    expect(part.ambientZones).toHaveLength(4);
  });

  it('the tuned levels: the main aisle and the dock are lit pools, the aisles and the room read, the back aisle, the crossing, the passage and the mouth are the dark pocket, the floor switch cuts the floor and the dock, the kettle is dark with every circuit on', () => {
    const spots = LIGHT_SPOTS.a4GoodsShed;
    const at = (n: string) => spots.find((s) => s.name === n)!;
    for (const n of ['A4 main aisle', 'A4 main aisle east', 'A4 dock']) {
      expect(at(n).band, n).toBe('pool');
      expect(tuned[n]!, n).toBeGreaterThanOrEqual(MARLOW_LEVEL.poolMin);
    }
    for (const n of ['A4 secroom', 'A4 aisle 2', 'A4 aisle 2 east', 'A4 east lane', 'A4 mezzanine']) {
      expect(at(n).band, n).toBe('read');
      expect(tuned[n]!, n).toBeGreaterThanOrEqual(MARLOW_LEVEL.readMin);
    }
    for (const n of ['A4 back aisle', 'A4 back aisle west end', 'A4 crossing', 'A4 mouth', 'A4 passage']) {
      expect(at(n).band, n).toBe('pocket');
      expect(tuned[n]!, n).toBeLessThanOrEqual(MARLOW_LEVEL.pocketMax);
    }
    // the dark pocket is the plan's box and holds the vantages
    const pocket = MARLOW_POCKETS.find((x) => x.id === 'a4-back')!;
    for (const n of ['A4 back aisle', 'A4 back aisle west end', 'A4 crossing', 'A4 mouth']) expect(inBox(pocket.box as [number, number, number, number], at(n).x, at(n).z), n).toBe(true);
    // the cuts: 41 off darkens the main aisle, the dock and the kettle (the mezzanine strips and the aisle strips do not lift them); 40, 42 and 41 + 43 likewise
    const cuts: [string, number[]][] = [['A4 main aisle cut', [41]], ['A4 dock cut', [41]], ['A4 kettle cut', [41]], ['A4 secroom cut', [40]], ['A4 aisle 2 cut', [42]], ['A4 mezzanine cut', [41, 43]], ['A4 kettle', []]];
    for (const [n, off] of cuts) {
      expect(at(n).band, n).toBe('cut');
      expect(at(n).off, n).toEqual(off);
      expect(tuned[n]!, n).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
    }
    expect(tuned['A4 main aisle']! - tuned['A4 main aisle cut']!).toBeGreaterThan(0.4);
    expect(tuned['A4 dock']! - tuned['A4 dock cut']!).toBeGreaterThan(0.4);
    // the kettle is dark with the floor circuit on: D2's isolation moment needs no switch (the unlit office behind its glazing)
    expect(tuned['A4 kettle']!).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
    expect(Math.abs(tuned['A4 standby']! - MARLOW_LEVEL.standby)).toBeLessThanOrEqual(0.03);
    // the kettle point and the lure's plan stop are the doc's
    expect(hyp2(at('A4 kettle').x - A4_KETTLE.x, at('A4 kettle').z - A4_KETTLE.z)).toBeLessThanOrEqual(1);
    expect(at('A4 dock')).toMatchObject({ x: 80, z: 33 });
  });
});

describe('A4 the Goods Shed: the guards', () => {
  const officer = part.squads[A4_OFFICER]!;
  const d1 = part.squads[A4_DOCK1]!;
  const d2 = part.squads[A4_DOCK2]!;
  const speed = ENEMIES.grunt.walkSpeed;
  const loopRoute = { points: A4_DOCK2_ROUTE, faces: A4_DOCK2_FACES, loop: { period: A4_DOCK2_LOOP.period, leave: [...A4_DOCK2_LOOP.leave], t0: A4_DOCK2_LOOP.t0 } };

  /** Walk D2's loop on a plain walker at his loop pace (0.01 s steps): where he is every `dt`, up to `seconds`. */
  function walkLoop(route = loopRoute, seconds = 130): { t: number; x: number; z: number; idx: number; look: number }[] {
    const w = new PatrolWalker(route, d2.x, d2.z, d2.yaw);
    let x = d2.x;
    let z = d2.z;
    const out: { t: number; x: number; z: number; idx: number; look: number }[] = [];
    const dt = 0.01;
    for (let t = 0; t < seconds; t += dt) {
      w.tick(dt);
      const to = w.step(dt, x, z);
      if (to) {
        const d = hyp2(to[0] - x, to[1] - z);
        const k = Math.min(1, (speed * dt) / (d || 1));
        x += (to[0] - x) * k;
        z += (to[1] - z) * k;
      }
      if (Math.round(t / dt) % 10 === 0) out.push({ t, x, z, idx: w.idx, look: w.lookYaw });
    }
    return out;
  }

  it("three guards, all armed kinds and none passive: the officer (kind officer) and the loaders (grunt); the bay's whole squad, inside the set", () => {
    expect(part.bay.squad).toEqual([A4_OFFICER, A4_DOCK1, A4_DOCK2]);
    expect(Object.keys(part.squads)).toEqual([A4_OFFICER, A4_DOCK1, A4_DOCK2]);
    expect(part.bay.squad.length).toBeLessThanOrEqual(3);
    expect([officer.kind, d1.kind, d2.kind]).toEqual(['officer', 'grunt', 'grunt']);
    for (const s of [officer, d1, d2]) {
      expect(['grunt', 'heavy', 'enforcer', 'officer', 'sniper']).toContain(s.kind);
      expect(s.passive).toBeUndefined();
      expect(box.some((bx) => inBox(bx, s.x, s.z))).toBe(true);
    }
    expect(course.squads[A4_OFFICER]).toBe(officer);
    expect([officer.x, officer.z, officer.yaw]).toEqual([A4_POST.x, A4_POST.z, 0]);
    expect(officer.route).toBeUndefined();
    expect(officer.info).toEqual(A4_OFFICER_INFO);
    expect([d1.x, d1.z, d1.yaw]).toEqual([A4_D1.x, A4_D1.z, Math.PI]);
    expect(d1.route).toBeUndefined();
    expect([d2.x, d2.z, d2.yaw]).toEqual([A4_D2.x, A4_D2.z, 0]);
    expect(d2.info).toBeUndefined();
  });

  it('the officer is taken from behind unseen: the L3 door and the whole approach to 1.8 m behind him are outside his 100 degree periphery, and the spot is clear floor', () => {
    const door = [103, 13.25] as const;
    const behind = [A4_POST.x, A4_POST.z - 1.8] as const;
    const off = (x: number, z: number): number => Math.acos(((x - officer.x) * Math.sin(officer.yaw) + (z - officer.z) * Math.cos(officer.yaw)) / hyp2(x - officer.x, z - officer.z));
    for (let k = 0; k <= 10; k++) {
      const f = k / 10;
      const x = door[0] + (behind[0] - door[0]) * f;
      const z = door[1] + (behind[1] - door[1]) * f;
      expect(off(x, z), `step ${k}`).toBeGreaterThan(PERCEPTION.periphHalf);
    }
    expect(off(door[0], door[1])).toBeGreaterThan((150 * Math.PI) / 180);
    expect(pathBlocked([[door[0], door[1] + 0.4], [behind[0], behind[1]]])).toBeNull();
    // the debug point the e2e uses stands on that spot
    const spot = part.debugPoints.find((d) => d.id === 'A4-behind')!;
    expect(hyp2(spot.pos.x - behind[0], spot.pos.z - behind[1])).toBeLessThan(0.3);
    // the room switch (by the L3 door) lures him: within the lure range of his post
    expect(hyp2(101.2 - officer.x, 13.3 - officer.z)).toBeLessThan(LURE_RANGE);
  });

  it('the officer has information (the guard-information cases cut from guardInfo.test.ts, re-added for A4): INTERROGATE once in his hold menu, his two lines in order, true to the set, short, no dash', () => {
    const rows = (v: { info?: GuardInfo | null }): string[] => {
      const m = new ContextMenu();
      m.begin();
      addGrabRows(m, hasInfo(v));
      m.end();
      const out: string[] = [];
      for (let i = 0; i < m.count; i++) out.push(`${m.opts[i]!.kind}:${m.opts[i]!.opt}`);
      return out;
    };
    expect(hasInfo(officer)).toBe(true);
    expect(officer.info!.lines).toEqual(A4_OFFICER_INFO.lines);
    const g: { info?: GuardInfo | null } = { info: officer.info };
    expect(rows(g)).toEqual(['grab:interrogate']);
    expect(takeInfo(g)).toEqual(A4_OFFICER_INFO.lines);
    expect(rows(g)).toEqual([]);
    expect(takeInfo(g)).toBeNull();
    // the loaders have none: no INTERROGATE on them
    expect(hasInfo(d1) || hasInfo(d2)).toBe(false);
    // what he says is true: the loop is sixty seconds and a reboot, and D2 does leave the desk for the kettle
    expect(A4_OFFICER_INFO.lines[0]).toMatch(/Sixty seconds/);
    expect(A4_LOOP.seconds).toBe(60);
    expect(A4_OFFICER_INFO.lines[1]).toMatch(/kettle/);
    expect(A4_DOCK2_ROUTE.some(([x, z]) => x === A4_KETTLE.x && z === A4_KETTLE.z)).toBe(true);
    // the first line is the loop (the player's plan), the second the pair (the dock's)
    expect(A4_OFFICER_INFO.lines[0]).toMatch(/console|cameras/);
  });

  it('the pair stand 2.8 m apart facing each other with a low stack 0.7 m behind each (A4-C7): a crouched spot against each stack\'s far face is behind the man, 1.84 m from him (inside the over-cover takedown reach), hidden from his partner by the stack', () => {
    expect(hyp2(d1.x - d2.x, d1.z - d2.z)).toBeCloseTo(2.8, 9);
    expect(d1.yaw).toBeCloseTo(Math.PI, 9);
    expect(d2.yaw).toBeCloseTo(0, 9);
    for (const [spot, g] of [[A4_SPOT_N, d1], [A4_SPOT_S, d2]] as const) {
      expect(hyp2(spot.x - g.x, spot.z - g.z), 'spot to man').toBeCloseTo(1.84, 1);
      expect(hyp2(spot.x - g.x, spot.z - g.z)).toBeLessThanOrEqual(TAKEDOWN.coverReach);
      expect(hyp2(spot.x - g.x, spot.z - g.z)).toBeGreaterThan(TAKEDOWN.reach);
    }
    expect(A4_STACK_N.z0 - d1.z).toBeCloseTo(0.7, 9);
    expect(d2.z - A4_STACK_S.z1).toBeCloseTo(0.7, 9);
    expect(A4_SPOT_N.z - A4_STACK_N.z1).toBeCloseTo(0.3, 9);
    expect(A4_STACK_S.z0 - A4_SPOT_S.z).toBeCloseTo(0.3, 9);
    expect(A4_SPOT_N.x).toBeGreaterThan(A4_STACK_N.x0);
    expect(A4_SPOT_N.x).toBeLessThan(A4_STACK_N.x1);
    expect(A4_SPOT_S.x).toBeGreaterThan(A4_STACK_S.x0);
    expect(A4_SPOT_S.x).toBeLessThan(A4_STACK_S.x1);
    // behind each man: outside the takedown's behind cone's complement (the attacker is more than `behindCone` off his facing)
    const off = (g: { x: number; z: number; yaw: number }, x: number, z: number): number => Math.acos(((x - g.x) * Math.sin(g.yaw) + (z - g.z) * Math.cos(g.yaw)) / hyp2(x - g.x, z - g.z));
    expect(off(d1, A4_SPOT_N.x, A4_SPOT_N.z)).toBeGreaterThan(TAKEDOWN.behindCone);
    expect(off(d2, A4_SPOT_S.x, A4_SPOT_S.z)).toBeGreaterThan(TAKEDOWN.behindCone);
    // the partner's line to each spot crosses the stack (a segment / box test in plan), and the stacks are as tall as a crouched body (and low cover for the takedown: under 1.9 m)
    const crosses = (from: { x: number; z: number }, to: { x: number; z: number }, s: { x0: number; x1: number; z0: number; z1: number }): boolean => {
      for (let i = 0; i <= 100; i++) {
        const x = from.x + ((to.x - from.x) * i) / 100;
        const z = from.z + ((to.z - from.z) * i) / 100;
        if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) return true;
      }
      return false;
    };
    expect(crosses(d2, A4_SPOT_N, A4_STACK_N)).toBe(true);
    expect(crosses(d1, A4_SPOT_S, A4_STACK_S)).toBe(true);
    for (const s of [A4_STACK_N, A4_STACK_S]) {
      expect(s.h).toBeGreaterThanOrEqual(MOVEMENT.crouchHeight);
      expect(s.h).toBeLessThan(1.9);
    }
    // the spots are open floor beside the stacks (the check has teeth: a point inside a stack is blocked)
    expect(blockedAt(A4_SPOT_N.x, A4_SPOT_N.z, 0.3)).toEqual([]);
    expect(blockedAt(A4_SPOT_S.x, A4_SPOT_S.z, 0.3)).toEqual([]);
    expect(blockedAt(80.4, 35.5, 0.3)).not.toEqual([]);
    // and a step round the stack's end to the man's back is open floor too (the takedown's other way)
    expect(pathBlocked([[A4_SPOT_N.x, A4_SPOT_N.z], [79.4, 36.2], [79.4, 35.4]], 0.3)).toBeNull();
    expect(pathBlocked([[A4_SPOT_S.x, A4_SPOT_S.z], [80.6, 29.8], [80.6, 30.6]], 0.3)).toBeNull();
  });

  it('the takedown geometry works: from each crouch spot, back to the stack, the game\'s own pick (`pickTakedown`, state wallLow) is an over-cover takedown on the man behind it; the doc\'s first stack position (far face 0.7 m further out) would be out of reach (the check has teeth)', () => {
    const pick = (a: { x: number; z: number }, v: { x: number; z: number; yaw: number }, n: { x: number; z: number }) =>
      pickTakedown({ state: 'wallLow', ax: a.x, ay: 0, az: a.z, vx: v.x, vy: 0, vz: v.z, vyaw: v.yaw, vCalm: true, los: true, coverNx: n.x, coverNz: n.z });
    expect(pick(A4_SPOT_N, d1, { x: 0, z: 1 })?.kind).toBe('overCover');
    expect(pick(A4_SPOT_S, d2, { x: 0, z: -1 })?.kind).toBe('overCover');
    expect(pick({ x: A4_SPOT_N.x, z: A4_SPOT_N.z + 0.7 }, d1, { x: 0, z: 1 })).toBeNull();
    expect(pick({ x: A4_SPOT_S.x, z: A4_SPOT_S.z - 0.7 }, d2, { x: 0, z: -1 })).toBeNull();
    // the strike ends at the stand-off behind each man, on his side of the stack
    const n = pick(A4_SPOT_N, d1, { x: 0, z: 1 })!;
    const s = pick(A4_SPOT_S, d2, { x: 0, z: -1 })!;
    expect(n.alignZ).toBeGreaterThan(d1.z);
    expect(s.alignZ).toBeLessThan(d2.z);
  });

  it('D2 runs a timed 40 s loop (desk 17 s, kettle 5 s, away about 23 s): armed grunt route of eight points, open floor on every leg and at the kettle stop; every leave time is inside the period and rising', () => {
    expect(d2.route).toEqual(A4_DOCK2_ROUTE);
    expect(d2.route![0]).toEqual([d2.x, d2.z]);
    expect(d2.loop).toEqual({ period: 40, leave: [17, 18.4, 24.0, 24.9, 31.3, 32.7, 33.6, 39.3], t0: 0 });
    expect(d2.faces).toEqual(A4_DOCK2_FACES);
    expect(A4_DOCK2_LOOP.leave).toHaveLength(A4_DOCK2_ROUTE.length);
    for (let i = 1; i < A4_DOCK2_LOOP.leave.length; i++) expect(A4_DOCK2_LOOP.leave[i]!).toBeGreaterThan(A4_DOCK2_LOOP.leave[i - 1]!);
    expect(A4_DOCK2_LOOP.leave[A4_DOCK2_LOOP.leave.length - 1]!).toBeLessThan(A4_DOCK2_LOOP.period);
    for (let i = 0; i < A4_DOCK2_ROUTE.length; i++) {
      const a = A4_DOCK2_ROUTE[i]!;
      const c = A4_DOCK2_ROUTE[(i + 1) % A4_DOCK2_ROUTE.length]!;
      expect(walkBlocked(a[0], a[1], c[0], c[1], 0.3), `leg ${i}`).toBeNull();
    }
    expect(A4_DOCK2_ROUTE[4]).toEqual([A4_KETTLE.x, A4_KETTLE.z]);
    // the kettle stop is 5 s (leave 4 minus the time the leg takes) and he faces the counter
    expect(A4_DOCK2_FACES[0]).toBe(0);
    expect(A4_DOCK2_FACES[4]).toBeCloseTo(-Math.PI / 2, 9);
  });

  it('on the walker he keeps the clock: at the desk for about 16 s, at the kettle for at least 4 s, away from the desk 22-28 s, the same every cycle; the first departure is at loop time 17', () => {
    const track = walkLoop();
    const atDesk = (e: { x: number; z: number }): boolean => hyp2(e.x - d2.x, e.z - d2.z) < 0.6;
    const atKettle = (e: { x: number; z: number }): boolean => hyp2(e.x - A4_KETTLE.x, e.z - A4_KETTLE.z) < 0.6;
    const first = track.find((e) => !atDesk(e))!;
    expect(first.t).toBeGreaterThan(16.5);
    expect(first.t).toBeLessThan(18.5);
    // the stretches: leaves the desk area, back in it
    const away: [number, number][] = [];
    let from = -1;
    for (const e of track) {
      if (!atDesk(e) && from < 0) from = e.t;
      if (atDesk(e) && from >= 0) {
        away.push([from, e.t]);
        from = -1;
      }
    }
    expect(away.length).toBeGreaterThanOrEqual(3);
    for (const [a, c] of away.slice(0, 3)) {
      expect(c - a, `away ${a.toFixed(1)}-${c.toFixed(1)}`).toBeGreaterThan(21);
      expect(c - a).toBeLessThan(29);
    }
    // the departures are a period apart
    expect(Math.abs(away[1]![0] - away[0]![0] - 40)).toBeLessThan(1);
    expect(Math.abs(away[2]![0] - away[1]![0] - 40)).toBeLessThan(1);
    // at the kettle: he stands there at least 4 s each cycle (stationary within a small radius), looking along the counter (the route says west)
    const stay = track.filter((e) => atKettle(e) && e.t < 40);
    expect(stay.length * 0.1).toBeGreaterThanOrEqual(4);
    expect(stay.some((e) => Math.abs(e.look - -Math.PI / 2) < 1e-6)).toBe(true);
    // a walker without the master clock (the same route with no loop) is not the same: the check has teeth
    const noLoop = walkLoop({ points: A4_DOCK2_ROUTE, faces: A4_DOCK2_FACES, loop: undefined as never }, 130);
    const noFirst = noLoop.find((e) => !atDesk(e));
    expect(noFirst === undefined || Math.abs(noFirst.t - first.t) > 3).toBe(true);
  });

  it('the floor switch lures the nearest calm guard within 25 m: D1 from the desk (3.5 m, D2 at the desk 6.3 m), D2 at the kettle (3.0 m, the nearer: A4-C6), never the officer (over 25 m); the circuit table names D1', () => {
    const sw = part.switches.find((s) => s.id === 'a4-sw-floor')!;
    const d = (g: { x: number; z: number }): number => hyp2(sw.pos.x - g.x, sw.pos.z - g.z);
    expect(d(d1)).toBeLessThan(d(d2));
    expect(d(d1)).toBeLessThan(LURE_RANGE);
    expect(d({ x: A4_KETTLE.x, z: A4_KETTLE.z })).toBeLessThan(d(d1));
    expect(d(officer)).toBeGreaterThan(LURE_RANGE);
    expect(circuitOf(41)!.lure).toMatchObject({ guard: A4_DOCK1 });
    // the aisles' switch at the west end is nearest D2 (at his desk) of the pair
    const aw = part.switches.find((s) => s.id === 'a4-sw-aisles')!;
    expect(hyp2(aw.pos.x - d2.x, aw.pos.z - d2.z)).toBeLessThan(hyp2(aw.pos.x - d1.x, aw.pos.z - d1.z));
    // the lured walk to the switch from D1's post is open floor
    expect(pathBlocked([[A4_D1.x, A4_D1.z], [79.2, 35.0], [79.2, 37.2], [79.4, 37.5]], 0.3)).toBeNull();
  });
});

describe('A4 the Goods Shed: the cameras and the map data the e2e and the modes read', () => {
  it('three cameras (the budget) on the console flag, mounts 3.0 m under the 3.3 m deck: C1 on the east wall facing west, C2 on the mezzanine\'s south face facing south, C3 over L4\'s door facing east; the data validates', () => {
    expect(cams).toHaveLength(3);
    expect(validateSecurity({ devices: cams })).toEqual([]);
    const [c1, c2, c3] = cams as [typeof cams[0], typeof cams[0], typeof cams[0]];
    for (const c of cams) {
      expect(c.y).toBe(3.0);
      expect(c.y).toBeLessThan(A4_MEZZ.deck);
      expect(c.sweep).toBeDefined();
      expect(c.range).toBeLessThanOrEqual(14);
      expect(c.offFlag).toBe(A4_LOOP_FLAG);
    }
    expect([c1.at, c1.facing]).toEqual([[111.5, 39.8], 270]);
    expect([c2.at, c2.facing]).toEqual([[96.75, 43.6], 180]);
    expect([c3.at, c3.facing]).toEqual([[76.4, 33.0], 90]);
    expect(c1.at[0]).toBeGreaterThan(A4_FLOOR.x1 - 0.5);
    expect(c2.at[1]).toBeLessThan(A4_MEZZ.z0);
    expect(c2.at[1]).toBeGreaterThan(A4_MEZZ.z0 - 0.5);
    expect(Math.abs(c3.at[1] - 33)).toBeLessThan(1);
    expect(lay.security!.devices.filter((c) => c.id.startsWith('cam-a4-'))).toHaveLength(3);
  });

  it('debug points inside the set (A4-entry at L3\'s door, behind the officer, the console, the passage mouth, the back aisle west end, the main aisle, the two crouch spots, the push bar); camera spaces; nav seeds; hide spots; shot vantages', () => {
    expect(part.debugPoints.map((d) => d.id)).toEqual(['A4-entry', 'A4-behind', 'A4-console', 'A4-mouth', 'A4-west', 'A4-mid', 'A4-spotN', 'A4-spotS', 'A4-pushbar']);
    for (const d of part.debugPoints) expect(box.some((bx) => inBox(bx, d.pos.x, d.pos.z)), d.id).toBe(true);
    for (const d of part.debugPoints.filter((x) => x.id !== 'A4-console' && x.id !== 'A4-entry')) expect(blockedAt(d.pos.x, d.pos.z, 0.3), d.id).toEqual([]);
    expect(part.camSpaces.filter((c) => c.size === 'tight').length).toBeGreaterThanOrEqual(6);
    expect(part.camSpaces.some((c) => c.size === 'open' && c.box[2] - c.box[0] > 30)).toBe(true);
    expect(part.navSeeds.some((s) => inBox(box[0]!, s.x, s.z))).toBe(true);
    expect(part.navSeeds.some((s) => inBox(box[1]!, s.x, s.z))).toBe(true);
    expect(part.navSeeds.some((s) => s.y > 3 && s.x > A4_MEZZ.x0 && s.x < A4_MEZZ.x1)).toBe(true);
    expect(part.navSeeds.some((s) => inBox([76, 38, 82.6, 44], s.x, s.z))).toBe(true);
    for (const s of part.navSeeds.filter((q) => q.y < 1)) expect(blockedAt(s.x, s.z, 0.3), `seed (${s.x}, ${s.z})`).toEqual([]);
    expect(part.hideSpots).toHaveLength(3);
    for (const h of part.hideSpots) expect(blockedAt(h.x, h.z, 0.3), `hide spot (${h.x}, ${h.z})`).toEqual([]);
    expect(part.shotVantages.map((v) => v.name)).toEqual(['a4-room-door', 'a4-mouth', 'a4-main-aisle-east']);
    expect(part.lasers).toEqual([]);
    expect(part.scanners).toEqual([]);
    expect(part.laserPanels).toEqual([]);
    expect(part.medkitWalls).toEqual([]);
  });
});

describe('A4 the Goods Shed: dressing (slice 4 step 5)', () => {
  const kitReport = JSON.parse(readFileSync('src/world/kit/assets/facility-kit.json', 'utf8')) as { pieces: Record<string, { meshes: Record<string, number> }> };
  const propReport = JSON.parse(readFileSync('src/world/props/assets/facility-props.json', 'utf8')) as PropReport;
  const dressing = mine.slice(GREY.boxes);
  const skins = dressing.filter((p) => !p.collide);
  const colliders = dressing.filter((p) => p.collide && !stairRail.includes(p));
  const own = part.props;
  const roomBox = box[0]!;
  const passageBox = box[1]!;
  const areaOf = (bx: readonly number[]) => ({ x0: bx[0]!, z0: bx[1]!, x1: bx[2]!, z1: bx[3]! });
  const facilityIn = (bx: readonly number[]): PropPlacement[] => built.facility.props.filter((q) => inBox(bx as [number, number, number, number], q.x, q.z));
  const ownIn = (bx: readonly number[]): PropPlacement[] => own.filter((q) => inBox(bx as [number, number, number, number], q.x, q.z));
  const kitIn = lay.kit!.instances.filter((i) => box.some((bx) => inBox(bx, i.x, i.z)));
  /** The props whose own boxes the dressing writes: the video wall and the reach truck. The racking and the desk stand over greybox solids. */
  const writers = own.filter((q) => q.prop === 'monitorWall' || q.prop === 'reachTruck');
  const written = writers.flatMap((q) => propCollisionBox(q) ?? []);
  const checker = (list: readonly PropPlacement[]): FacilityProps => {
    const f = new FacilityProps();
    f.placements.push(...list);
    return f;
  };
  /** A written box's plan footprint (a quarter-turn prop swaps its sides). */
  const footOf = (w: { c: [number, number, number]; s: [number, number, number]; yaw: number }) => {
    const swap = Math.abs(Math.sin(w.yaw)) > 0.5;
    const hx = (swap ? w.s[2] : w.s[0]) / 2;
    const hz = (swap ? w.s[0] : w.s[2]) / 2;
    return { x0: w.c[0] - hx, x1: w.c[0] + hx, z0: w.c[2] - hz, z1: w.c[2] + hz, y0: w.c[1] - w.s[1] / 2, y1: w.c[1] + w.s[1] / 2 };
  };
  /** The first written box within `r` of (x, z) on the plan, or null. */
  const writtenNear = (x: number, z: number, r: number): string | null => {
    for (const w of written) {
      const f = footOf(w);
      if (hyp2(Math.max(f.x0 - x, x - f.x1, 0), Math.max(f.z0 - z, z - f.z1, 0)) < r) return `box (${w.c.map((v) => v.toFixed(2)).join(', ')})`;
    }
    return null;
  };
  /** Whether the segment a-c passes through a written box (sampled every 5 cm). */
  const writtenOnSight = (a: readonly [number, number, number], c: readonly [number, number, number]): string | null => {
    const n = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]) / 0.05);
    for (let i = 1; i < n; i++) {
      const x = a[0] + ((c[0] - a[0]) * i) / n;
      const y = a[1] + ((c[1] - a[1]) * i) / n;
      const z = a[2] + ((c[2] - a[2]) * i) / n;
      for (const w of written) {
        const f = footOf(w);
        if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 && y >= f.y0 && y <= f.y1) return `box (${w.c.map((v) => v.toFixed(2)).join(', ')}) at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`;
      }
    }
    return null;
  };
  /** Greybox solids (the dressing's four written boxes left out), upright: what the racking and the desk stand over. */
  const base = b.boxes.filter((p) => p.collide && Math.abs(p.pitch) < 1e-3 && !colliders.includes(p) && !stairRail.includes(p)).map(upright);
  const countIn = (x0: number, x1: number, z0: number, z1: number, y1 = 20, y0 = -1): number => skins.filter((p) => p.c[0] > x0 && p.c[0] < x1 && p.c[2] > z0 && p.c[2] < z1 && p.c[1] < y1 && p.c[1] > y0).length;

  it("the greybox is as S4 built it: 92 boxes (checksum), 20 lamps, 2 doors, no anchor; the only new collision is four prop boxes (the video wall's plinth and frame, the reach truck's chassis and envelope), all noLedge, and every new register row is a dressing row", () => {
    expect(grey).toHaveLength(GREY.boxes);
    expect(colliders).toHaveLength(4);
    expect(written).toHaveLength(4);
    for (const w of written) {
      const m = colliders.find((p) => p.c.every((v, k) => Math.abs(v - w.c[k]!) < 1e-6) && p.s.every((v, k) => Math.abs(v - w.s[k]!) < 1e-6) && Math.abs(p.yaw - w.yaw) < 1e-6);
      expect(m, `written box at (${w.c.join(', ')})`).toBeDefined();
      expect(m!.noLedge).toBe(true);
    }
    expect(built.counts.sets.a4GoodsShed).toEqual({ lights: GREY.lights, solids: GREY.solids + 4 + stairRail.length, doors: GREY.doors, anchors: GREY.anchors });
    expect(lamps).toHaveLength(GREY.lights);
    const ids = ['A4-14', 'A4-15', 'A4-16', 'A4-17', 'A4-18', 'A4-19', 'A4-20', 'A4-21', 'A4-22'];
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(ids));
    for (const id of ids.slice(0, 8)) expect(part.register.find((r) => r.id === id)!.solids, id).toBe(id === 'A4-17' ? stairRail.length : 0);
    expect(part.register.find((r) => r.id === 'A4-22')!.solids).toBe(4);
    expect(part.doors).toEqual({ [A4_PASSAGE_DOOR]: expect.any(Number), [A4_OFFICE_DOOR]: expect.any(Number) });
  });

  it("every hand-built dressing box is a visual skin: no collision, noLedge, a side under 5 cm (out of the canonical light shapes, so the light is the greybox's); the only visible boxes of 5 cm or more are written prop boxes (the props kit's greybox, hidden by its prop)", () => {
    expect(skins.length).toBeGreaterThan(600);
    for (const p of skins) {
      expect(p.noLedge, `skin at (${p.c.join(', ')})`).toBe(true);
      expect(Math.min(...p.s), `skin at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBeLessThan(CANON_MIN_THICK);
      expect(p.visible).not.toBe(false);
    }
    const thick = dressing.filter((p) => p.visible !== false && Math.min(...p.s) >= CANON_MIN_THICK);
    expect(thick.every((p) => p.collide)).toBe(true);
    expect(thick).toHaveLength(3);
    for (const p of colliders) expect(p.noLedge).toBe(true);
    // the one invisible collider is the truck's see-through envelope (light, the eye and the bake pass it, as the props kit's own rule)
    expect(colliders.filter((p) => p.visible === false)).toHaveLength(1);
  });

  it("budgets (computed): kit triangles <= 60 k; the props are budgeted per area (the security room, the warehouse floor): each passes FacilityProps.check at 60 k triangles and 12 draws, with the facility's own plate on L3's far door counted in the room", () => {
    const kitTris = kitTriangles({ instances: kitIn, doors: [] }, kitReport);
    expect(kitIn.some((i) => i.piece === 'wallPanel')).toBe(true);
    expect(kitTris).toBeGreaterThan(0);
    expect(kitTris, `${kitTris} kit triangles`).toBeLessThanOrEqual(60_000);
    // the facility's set-side plate on L3's far door is in the room; none in the passage or on the floor
    expect(facilityIn(roomBox).map((q) => q.prop)).toEqual(['signPlate']);
    expect(facilityIn(passageBox)).toEqual([]);
    expect(facilityIn(floorBox)).toEqual([]);
    expect(ownIn(passageBox)).toEqual([]);
    expect(ownIn(roomBox).length + ownIn(floorBox).length).toBe(own.length);
    const lists = [
      { name: 'room', list: [...ownIn(roomBox), ...facilityIn(roomBox)], area: areaOf(roomBox) },
      { name: 'floor', list: [...ownIn(floorBox), ...facilityIn(floorBox)], area: areaOf(floorBox) },
    ];
    for (const { name, list, area } of lists) {
      expect(checker(list).check(area, propReport), name).toEqual([]);
      expect(propTriangles(list, propReport), name).toBeLessThanOrEqual(PROP_SET_BUDGET.tris);
      expect(propDraws(list, propReport), name).toBeLessThanOrEqual(PROP_SET_BUDGET.draws);
    }
    expect(propDraws(lists[0]!.list, propReport)).toBe(11);
    expect(propDraws(lists[1]!.list, propReport)).toBe(12);
    // together they would break the limit: the reason the two areas are measured apart (the room and the floor are separate rooms of the hall)
    expect(propDraws([...lists[0]!.list, ...lists[1]!.list], propReport)).toBeGreaterThan(PROP_SET_BUDGET.draws);
    const names = own.map((q) => q.prop);
    expect(names.filter((n) => n === 'palletRackBay')).toHaveLength(24);
    expect(names.filter((n) => n === 'palletRackEnd')).toHaveLength(8);
    expect([...names].sort().filter((n) => n !== 'palletRackBay' && n !== 'palletRackEnd')).toEqual(['monitorWall', 'reachTruck', 'securityDesk']);
  });

  it('every prop with an emissive part carries a circuit group (S3-7 S1, light parity): the video wall and the console desk on the security room\'s panels (40), the truck\'s beacon on the floor high-bays (41)', () => {
    const plan = new Set(Object.values(marlowCourseGroups()));
    const [g0, g1] = setGroups('a4GoodsShed');
    const glowing = own.filter((p) => propGlows(p) && !PROP_OWN_SUPPLY.includes(p.prop));
    expect(glowing.map((p) => p.prop).sort()).toEqual(['monitorWall', 'reachTruck', 'securityDesk']);
    for (const p of glowing) {
      expect(p.group, `${p.prop} at ${p.x}, ${p.y}, ${p.z}`).toBeDefined();
      expect(plan.has(p.group!), `${p.prop} group ${p.group}`).toBe(true);
      expect(p.group!).toBeGreaterThanOrEqual(g0);
      expect(p.group!).toBeLessThanOrEqual(g1);
    }
    expect(glowing.find((p) => p.prop === 'monitorWall')!.group).toBe(40);
    expect(glowing.find((p) => p.prop === 'securityDesk')!.group).toBe(40);
    expect(glowing.find((p) => p.prop === 'reachTruck')!.group).toBe(41);
    // the racking has no emissive part
    expect(own.filter((p) => p.prop === 'palletRackBay' || p.prop === 'palletRackEnd').some((p) => propGlows(p))).toBe(false);
  });

  it("every kit glow in A4 carries a circuit: the hall panels are grouped on the floor high-bays (41) and, over the deck, the mezzanine strips (43), all from 7.5 m up; the deck's three rails now sit on 43; no lamp was added and the dead row 49 has none", () => {
    const plan = new Set(Object.values(marlowCourseGroups()));
    const [g0, g1] = setGroups('a4GoodsShed');
    const glowing = kitIn.filter((i) => ['wallPanel', 'skirting', 'column', 'handrail'].includes(i.piece) || (i.piece === 'ledSlot' && !i.noLed));
    expect(glowing.length).toBeGreaterThan(90);
    for (const i of glowing) {
      expect(i.group, `${i.piece} at ${i.x}, ${i.y}, ${i.z}`).toBeDefined();
      expect(plan.has(i.group!), `${i.piece} group ${i.group}`).toBe(true);
      expect(i.group! >= g0 && i.group! <= g1, `${i.piece} group ${i.group}`).toBe(true);
    }
    const panels = glowing.filter((i) => i.piece === 'wallPanel');
    for (const i of panels) expect(i.y, `panel at ${i.x}, ${i.z}`).toBeGreaterThanOrEqual(7.5 - 1e-9);
    // the north wall's middle (x 86-106, over the deck) is on 43, every other panel on 41
    for (const i of panels) expect(i.group, `panel at ${i.x}, ${i.z}`).toBe(Math.abs(i.z - 47.75) < 0.1 && i.x > 86 && i.x < 106 ? 43 : 41);
    expect(panels.filter((i) => Math.abs(i.z - 24.25) < 0.1).length).toBeGreaterThan(25);
    expect(panels.filter((i) => Math.abs(i.x - 76.25) < 0.1).length).toBeGreaterThan(15);
    expect(panels.filter((i) => Math.abs(i.x - 111.75) < 0.1).length).toBeGreaterThan(15);
    expect(panels.filter((i) => i.group === 43).length).toBeGreaterThan(10);
    expect(panels.filter((i) => Math.abs(i.z - 47.75) < 0.1 && i.group === 41).length).toBeGreaterThan(5);
    // the greybox's kit rails carry the mezzanine circuit now (they were an always-on accent line); 17 modules in the three rails
    const rails = glowing.filter((i) => i.piece === 'handrail' && Math.abs(i.z - A4_STAIR_RAIL.z) > 1e-6);
    expect(rails).toHaveLength(17);
    for (const i of rails) expect(i.group).toBe(43);
    // no lamp added: the twenty of the plan, none on the dead row
    expect(lamps).toHaveLength(20);
    expect(lamps.filter((l) => l.group === 49)).toEqual([]);
    expect(b.lights.lights.filter((l) => l.kind !== 'flashlight' && l.group !== 90 && box.some((bx) => inBox(bx, l.x, l.z)))).toHaveLength(20);
  });

  it("the props stand where planned and inside their area: the video wall flush on the room's east wall, the console desk over the greybox desk, three bays in each of the eight racking rows (fronts on the aisles, back to back with a 0.2 m flue) and a closing frame at each row's end, the reach truck at the east lane's south end", () => {
    for (const q of own) {
      const bx = inBox(roomBox, q.x, q.z) ? roomBox : floorBox;
      const f = PROP_FOOTPRINT[q.prop];
      for (const [lx, lz] of [[f[0], f[1]], [f[2], f[1]], [f[2], f[3]], [f[0], f[3]]] as const) {
        const w = propToWorld(q, lx, 0, lz);
        expect(inBox(bx, w[0], w[2], 1e-6), `${q.prop} at ${q.x}, ${q.z}`).toBe(true);
      }
    }
    const [mw] = own.filter((q) => q.prop === 'monitorWall');
    expect(mw!.x).toBeCloseTo(A4_PROPS.monitorWall.x, 9);
    expect(mw!.z).toBeCloseTo(A4_PROPS.monitorWall.z, 9);
    expect(mw!.x).toBeCloseTo(A4_ROOM.x1, 9);
    const [sd] = own.filter((q) => q.prop === 'securityDesk');
    expect([sd!.x, sd!.z, sd!.y].map((v) => Number(v.toFixed(2)))).toEqual([A4_PROPS.securityDesk.x, A4_PROPS.securityDesk.z, A4_PROPS.securityDesk.y]);
    // racking: rows
    const bays = own.filter((q) => q.prop === 'palletRackBay');
    const ends = own.filter((q) => q.prop === 'palletRackEnd');
    expect(A4_RACK_ROWS).toHaveLength(4);
    for (const [r, row] of A4_RACK_ROWS.entries()) {
      const [z0, z1] = A4_RACK_Z[Math.floor(r / 2)]!;
      // a south row hugs the run's south face (its bays' fronts face -z), a north row the north face
      expect(row.z).toBeCloseTo(row.flip ? z0 + 0.55 : z1 - 0.55, 9);
      for (const [x0, x1] of A4_RACK_X) {
        const inRun = bays.filter((q) => Math.abs(q.z - row.z) < 1e-6 && q.x > x0 && q.x < x1);
        expect(inRun, `row ${r} run ${x0}`).toHaveLength(3);
        for (const q of inRun) {
          expect(Math.cos(q.yaw) * (row.flip ? -1 : 1), 'front on the aisle').toBeGreaterThan(0.99);
          const f = footOf(propCollisionBox(q)![0]!);
          expect(f.x0).toBeGreaterThanOrEqual(x0 - 1e-6);
          expect(f.x1).toBeLessThanOrEqual(x1 + 1e-6);
          expect(f.z0).toBeGreaterThanOrEqual(z0 - 1e-6);
          expect(f.z1).toBeLessThanOrEqual(z1 + 1e-6);
          expect(f.y1).toBeCloseTo(A4_RACK_H, 9);
        }
        expect(ends.filter((q) => Math.abs(q.z - row.z) < 1e-6 && q.x > x0 - 0.1 && q.x < x1 + 0.1), `row ${r} run ${x0} closing frame`).toHaveLength(1);
      }
    }
    expect(A4_RACK_ROWS[1]!.z - A4_RACK_ROWS[0]!.z).toBeCloseTo(1.3, 9);
    expect(A4_RACK_ROWS[3]!.z - A4_RACK_ROWS[2]!.z).toBeCloseTo(1.3, 9);
    // the truck's footprint: nose north in the east lane's south end, a 1.95 m lane beside it and a sealed 0.5 m behind it
    const [tr] = own.filter((q) => q.prop === 'reachTruck');
    expect(tr!.x).toBeCloseTo(A4_PROPS.reachTruck.x, 9);
    expect(tr!.z).toBeCloseTo(A4_PROPS.reachTruck.z, 9);
    const env = footOf(written.find((w) => Math.abs(w.s[1] - 2.3) < 1e-6)!);
    expect(env.x0 - A4_RACK_X[1]![1]).toBeGreaterThanOrEqual(1.9);
    expect(A4_FLOOR.x1 - env.x1).toBeLessThan(2 * MOVEMENT.radius);
    expect(A4_FLOOR.x1 - env.x1).toBeGreaterThan(0);
    expect(env.z0).toBeGreaterThan(A4_FLOOR.z0);
    expect(env.z1).toBeLessThan(A4_RACK_Z[0]![0] + 0.5);
  });

  it("nothing is written over the racking or the desk: every bay's box and the desk's box are inside greybox solids (within the 5 cm skin rule), so the runs and the desk stay the collision", () => {
    const inside = (x: number, y: number, z: number): boolean => base.some((p) => Math.abs(x - p.c[0]) <= p.s[0] / 2 + PROP_PROUD && Math.abs(y - p.c[1]) <= p.s[1] / 2 + PROP_PROUD && Math.abs(z - p.c[2]) <= p.s[2] / 2 + PROP_PROUD);
    let samples = 0;
    for (const q of own.filter((p) => p.prop === 'palletRackBay' || p.prop === 'securityDesk')) {
      for (const w of propCollisionBox(q)!) {
        const f = footOf(w);
        for (const y of [f.y0 + 0.05, (f.y0 + f.y1) / 2, f.y1 - 0.05]) {
          for (let x = f.x0 + 0.02; x <= f.x1 - 0.02; x += 0.3) {
            for (let z = f.z0 + 0.02; z <= f.z1 - 0.02; z += 0.2) {
              samples++;
              expect(inside(x, y, z), `${q.prop} at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`).toBe(true);
            }
          }
        }
      }
    }
    expect(samples).toBeGreaterThan(2000);
    // teeth: the written truck's envelope (open floor) finds air
    const env = footOf(written.find((w) => Math.abs(w.s[1] - 2.3) < 1e-6)!);
    expect(inside((env.x0 + env.x1) / 2, 1.0, (env.z0 + env.z1) / 2)).toBe(false);
    // the desk's hull stands 4 cm off the greybox desk's front and west faces, no more
    const hull = footOf(propCollisionBox(own.find((q) => q.prop === 'securityDesk')!)![0]!);
    const gd = grey.find((p) => p.collide && Math.abs(top(p) - 0.75) < 1e-6 && p.c[2] > 18.5)!;
    expect(gd.c[2] - gd.s[2] / 2 - hull.z0).toBeLessThanOrEqual(PROP_PROUD);
    expect(gd.c[0] - gd.s[0] / 2 - hull.x0).toBeLessThanOrEqual(PROP_PROUD);
  });

  it('every written box is noLedge and none of 1.9 m or taller is not; with the boxes written no solo jump reaches a lip on the deck edge or over the racking (the check still bites)', () => {
    for (const p of colliders) if (top(p) >= 1.9) expect(p.noLedge).toBe(true);
    expect(solid.filter((p) => colliders.some((c) => Math.abs(c.c[0] - p.c[0]) < 1e-6 && Math.abs(c.c[1] - p.c[1]) < 1e-6 && Math.abs(c.c[2] - p.c[2]) < 1e-6))).toHaveLength(4);
    const deckEdge: CoopGrip = { y: A4_MEZZ.deck, a: { x: A4_MEZZ.x0, z: A4_MEZZ.z0 }, b: { x: A4_MEZZ.x1, z: A4_MEZZ.z0 }, n: { x: 0, z: -1 } };
    for (const y of [A4_MEZZ.deck, 4.4]) expect(soloJumpThreats(solid, { ...deckEdge, y })).toEqual([]);
    for (const [z0, z1] of A4_RACK_Z) {
      for (const [x0, x1] of A4_RACK_X) {
        for (const y of [4.4, A4_RACK_H]) {
          expect(soloJumpThreats(solid, { y, a: { x: x0, z: z0 }, b: { x: x1, z: z0 }, n: { x: 0, z: -1 } })).toEqual([]);
          expect(soloJumpThreats(solid, { y, a: { x: x0, z: z1 }, b: { x: x1, z: z1 }, n: { x: 0, z: 1 } })).toEqual([]);
        }
      }
    }
    const crate: BoxPiece = { c: [96, 0.9, A4_MEZZ.z0 - 1.5], s: [1, 1.8, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true };
    expect(soloJumpThreats([...solid, crate], deckEdge).length).toBeGreaterThan(0);
    // no new grip: no generated ledge in A4 above 0.9 m on the new boxes' faces
    expect(anchors.ledges.filter((l) => inBox(floorBox, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3) && l.top >= 0.9)).toEqual([]);
  });

  it("nothing written stands on a tested point or line: the officer's post, the spot behind him, the console's standing points, the L3 door pad, the passage door, the crouch spots and posts at the dock, the hide spots, the nav seeds and debug points, the passage mouth and the back aisle's west end", () => {
    const points: [number, number][] = [
      [A4_POST.x, A4_POST.z], [104.8, 15.8], [AT_CONSOLE[0], AT_CONSOLE[1]], [105.6, 17.3], [103, 14.4], [102.3, 19.1], [102.3, 18.4], [101.2, 14.4],
      [A4_SPOT_N.x, A4_SPOT_N.z], [A4_SPOT_S.x, A4_SPOT_S.z], [A4_D1.x, A4_D1.z], [A4_D2.x, A4_D2.z], [AT_PUSHBAR[0], AT_PUSHBAR[1]],
      [102.5, 24.6], [84.5, 25.8], [96.75, 25.8], [90, 25.8],
    ];
    for (const [x, z] of points) expect(writtenNear(x, z, MOVEMENT.radius), `point (${x}, ${z})`).toBeNull();
    for (const h of part.hideSpots) expect(writtenNear(h.x, h.z, MOVEMENT.radius), `hide spot (${h.x}, ${h.z})`).toBeNull();
    for (const s of part.navSeeds.filter((q) => q.y < 1)) expect(writtenNear(s.x, s.z, MOVEMENT.radius), `seed (${s.x}, ${s.z})`).toBeNull();
    for (const d of part.debugPoints) expect(writtenNear(d.pos.x, d.pos.z, MOVEMENT.radius), d.id).toBeNull();
    // the console's standing point: the video wall's plinth corner is the closest, more than a body's width off
    const plinth = footOf(written.find((w) => Math.abs(w.s[1] - 0.47) < 1e-6)!);
    expect(hyp2(Math.max(plinth.x0 - 105.6, 0), Math.max(17.3 - plinth.z1, 0))).toBeGreaterThan(0.2);
    // the lanes stay open: the officer's approach, and the east lane beside the truck
    expect(pathBlocked([[103, 14.0], [104.8, 15.8]], 0.3)).toBeNull();
    expect(pathBlocked([[109.0, 40], [109.0, 30], [109.0, 24.6], [102.5, 24.6]], 0.3)).toBeNull();
    // teeth: a point on the truck's chassis is blocked
    expect(writtenNear(110.6, 25.3, 0.01)).not.toBeNull();
  });

  it("no camera, no guard sight line and no jam line the greybox relies on crosses a written box: C1, C2 and C3 see their frames, the pair see each other, the officer sees the desk and the door", () => {
    const cam = (id: string) => cams.find((c) => c.id === id)!;
    const from = (id: string): [number, number, number] => [cam(id).at[0], cam(id).y, cam(id).at[1]];
    const c1 = from('cam-a4-c1');
    const c2 = from('cam-a4-c2');
    const c3 = from('cam-a4-c3');
    for (const h of [0.6, 1.2, 1.7]) {
      for (const [x, z] of [[100, 39.8], [104, 39.8], [96.75, 38], [97.5, 40.5]] as const) expect(writtenOnSight(c1, [x, h, z]), `C1 to (${x}, ${z}) at ${h}`).toBeNull();
      for (const z of [26, 28.5, 31.5, 36]) expect(writtenOnSight(c2, [96.75, h, z]), `C2 to z ${z} at ${h}`).toBeNull();
      for (const [x, z] of [[84, 33], [88, 33], [90, 36], [82, 30]] as const) expect(writtenOnSight(c3, [x, h, z]), `C3 to (${x}, ${z}) at ${h}`).toBeNull();
      // the jam lines: C1 from the cross aisle, C2 from the back aisle at x 92, C3 from the main aisle at x 88-94
      expect(writtenOnSight(c1, [97, h, 33]), 'C1 jam from the cross aisle').toBeNull();
      expect(writtenOnSight(c2, [92, h, 25.8]), 'C2 jam from the back aisle').toBeNull();
      expect(writtenOnSight(c3, [91, h, 39.8]), 'C3 jam from the main aisle').toBeNull();
      // the pair and the officer
      expect(writtenOnSight([A4_D1.x, 1.6, A4_D1.z], [A4_D2.x, 1.6, A4_D2.z])).toBeNull();
      expect(writtenOnSight([A4_POST.x, 1.6, A4_POST.z], [103, h, 13.5])).toBeNull();
      expect(writtenOnSight([A4_POST.x, 1.6, A4_POST.z], [102.3, h, 19.3])).toBeNull();
    }
    // teeth: the truck blocks a line across it
    expect(writtenOnSight([110.6, 1.0, 29], [110.6, 1.0, 24])).not.toBeNull();
  });

  it("the sheeting, signs and fittings are where the plan says: the south wall's sheeting leaves the passage mouth clear, L4's door gap carries only the push bar's plate, the roller shutter stands south of the office's wall, and the room, the passage, each rack run, each stack, the desk, the deck, the store front and the office are all dressed", () => {
    // the south wall (x 76.25-100.75 and 104.25-111.75): sheeting skins stand clear of the passage mouth
    const south = skins.filter((p) => Math.abs(p.c[2] - (24.25 + 0.015)) < 0.02 && p.s[1] > 3 && p.c[1] > 1.5);
    expect(south.length).toBeGreaterThanOrEqual(2);
    for (const p of south) expect(p.c[0] + p.s[0] / 2 < 100.8 || p.c[0] - p.s[0] / 2 > 104.2, `sheet at x ${p.c[0]}`).toBe(true);
    // L4's door gap on the west face: nothing between the door frame's z 31-34.25 below 2.4 m (the push bar's plate starts at z 34.3)
    const gap = skins.filter((p) => p.c[0] < 76.6 && p.c[2] > 31.05 && p.c[2] < 34.25 && p.c[1] < 2.4 && p.s[1] > 0.1 && p.c[1] > 0.1);
    expect(gap).toEqual([]);
    // the roller shutter: slats on the west face between z 35 and 37.8, clear of the office wall (z 37.9) and of the push bar's plate (z 34.9)
    const slats = skins.filter((p) => p.c[0] > 76.25 && p.c[0] < 76.46 && p.c[2] > A4_SHUTTER.z0 + 0.2 && p.c[2] < A4_SHUTTER.z1 - 0.2 && p.s[0] < 0.05 && p.s[2] > 2 && p.s[1] < 0.05);
    expect(slats.length).toBeGreaterThanOrEqual(8);
    expect(A4_SHUTTER.z1).toBeLessThan(A4_OFFICE.z0);
    expect(A4_SHUTTER.z0).toBeGreaterThan(34.9);
    // counts per area: the room, the passage, each rack run, each stack, the desk, the deck sheet, the store front, the office
    expect(countIn(100.25, 106.35, 13.25, 19.35, 3.1)).toBeGreaterThan(90);
    expect(countIn(101.2, 103.8, 19.8, 24.3, 4.6)).toBeGreaterThan(20);
    for (const [z0, z1] of A4_RACK_Z) for (const [x0, x1] of A4_RACK_X) expect(countIn(x0 - 0.2, x1 + 0.2, z0 - 0.3, z1 + 0.3, 5.5), `rack ${x0} ${z0}`).toBeGreaterThanOrEqual(20);
    for (const s of [A4_STACK_N, A4_STACK_S]) expect(countIn(s.x0 - 0.1, s.x1 + 0.1, s.z0 - 0.1, s.z1 + 0.1, 1.3), `stack ${s.x0}`).toBeGreaterThanOrEqual(25);
    expect(countIn(A4_DESK.x0, A4_DESK.x1, A4_DESK.z0 - 0.1, A4_DESK.z1 + 0.1, 1.4, 0.0)).toBeGreaterThanOrEqual(14);
    expect(countIn(A4_MEZZ.x0, A4_MEZZ.x1, A4_MEZZ.z0 - 0.1, A4_MEZZ.z1, 3.4, 3.29)).toBeGreaterThanOrEqual(18);
    expect(countIn(A4_MEZZ.x0, A4_MEZZ.x1, A4_MEZZ.z0 - 0.1, A4_MEZZ.z0, 3.3, 0)).toBeGreaterThanOrEqual(30);
    expect(countIn(A4_FLOOR.x0, 82.9, A4_OFFICE.z0 - 0.2, A4_OFFICE.z1 + 0.2, 3.1)).toBeGreaterThan(55);
  });

  it("the five switches each have a back plate and the stairs' rails follow the flights: three pitched rails a flight, no collision, the same yaw and pitch as the ramps; the deck sheet covers the deck; the three cameras each have a bracket; six dead fittings and four roof ties", () => {
    for (const s of part.switches) {
      const near = skins.filter((p) => Math.abs(p.c[0] - s.pos.x) < 0.25 && Math.abs(p.c[2] - s.pos.z) < 0.12 && Math.abs(p.c[1] - s.pos.y) < 0.4);
      expect(near.length, s.id).toBeGreaterThanOrEqual(1);
    }
    const ramps = grey.filter((p) => p.collide && Math.abs(p.pitch) > 1e-3).sort((p, q) => p.c[0] - q.c[0]);
    const rails = skins.filter((p) => Math.abs(p.pitch) > 1e-3);
    expect(rails).toHaveLength(6);
    for (const [k, r] of ramps.entries()) {
      const flight = rails.filter((p) => Math.abs(p.c[0] - r.c[0]) < 1e-6);
      expect(flight).toHaveLength(3);
      for (const p of flight) {
        expect(p.collide).toBe(false);
        expect(p.yaw).toBeCloseTo(r.yaw, 9);
        expect(p.pitch).toBeCloseTo(r.pitch, 9);
        expect(p.s[2]).toBeCloseTo(r.s[2], 9);
        expect(p.c[1], `rail ${k} over the ramp's centre line`).toBeGreaterThan(A4_MEZZ.deck / 2 + 0.4);
      }
    }
    const sheet = skins.find((p) => Math.abs(p.c[1] - (A4_MEZZ.deck + 0.0025)) < 1e-6 && p.s[0] > 19)!;
    expect(sheet).toBeDefined();
    expect([sheet.c[0] - sheet.s[0] / 2, sheet.c[0] + sheet.s[0] / 2]).toEqual([A4_MEZZ.x0, A4_MEZZ.x1]);
    for (const c of cams) expect(skins.some((p) => hyp2(p.c[0] - c.at[0], p.c[2] - c.at[1]) < 0.5 && Math.abs(p.c[1] - c.y) < 0.2), `bracket for ${c.id}`).toBe(true);
    // six dead fittings over the back aisle (group 49: skins, no lamp, no light)
    const dead = skins.filter((p) => Math.abs(p.c[1] - 5.62) < 1e-6 && Math.abs(p.s[0] - 1.5) < 1e-6 && Math.abs(p.c[2] - 25.8) < 1e-6);
    expect(dead).toHaveLength(6);
    for (const p of dead) expect(lamps.some((l) => Math.abs(l.x - p.c[0]) < 0.8 && Math.abs(l.z - 25.8) < 0.5)).toBe(false);
    // four roof ties (I-beams the length of the hall) over the back aisle, aisle 2, the main aisle and the deck's strips
    expect(skins.filter((p) => p.s[0] > 35 && p.c[1] > 7.6 && p.c[1] < 7.9 && p.s[2] < 0.05)).toHaveLength(4);
  });

  it("nothing the dressing drew stands in a player's body at a tested standing point: no skin above the floor paint within 0.2 m of the crouch spots, the loaders' posts, the officer's post, the console's standing points, the push bar spot or the hide spots", () => {
    const points: [number, number][] = [[A4_SPOT_N.x, A4_SPOT_N.z], [A4_SPOT_S.x, A4_SPOT_S.z], [A4_D1.x, A4_D1.z], [A4_D2.x, A4_D2.z], [A4_POST.x, A4_POST.z], [105.6, 17.85], [105.6, 17.3], [AT_PUSHBAR[0], AT_PUSHBAR[1]], ...part.hideSpots.map((h): [number, number] => [h.x, h.z])];
    for (const [x, z] of points) {
      const hit = skins.find((p) => p.c[1] - p.s[1] / 2 < 1.7 && p.c[1] + p.s[1] / 2 > 0.1 && Math.max(Math.abs(p.c[0] - x) - p.s[0] / 2, 0) ** 2 + Math.max(Math.abs(p.c[2] - z) - p.s[2] / 2, 0) ** 2 < 0.2 ** 2);
      expect(hit === undefined ? null : `skin at (${hit.c.map((v) => v.toFixed(2)).join(', ')}) size (${hit.s.map((v) => v.toFixed(2)).join(', ')})`, `standing point (${x}, ${z})`).toBeNull();
    }
  });

  it("the stairs' open south side has a 1.1 m rail (S34-check polish 4): nine kit.handrail segments a flight 0.05 m outside the flight from the third tread to the deck face, each at least 1.1 m over the walking line, no gap, meeting the deck's rail, invisible, noLedge", () => {
    const len = (grey.find((p) => p.collide && Math.abs(p.pitch) > 1e-3)!.s[2] ** 2 - A4_MEZZ.deck ** 2) ** 0.5;
    const flights = [
      { name: 'west', up: 1, foot: A4_STAIR.westFoot, ...A4_STAIR_RAIL.west },
      { name: 'east', up: -1, foot: A4_STAIR.eastFoot, ...A4_STAIR_RAIL.east },
    ] as const;
    const { z, seg, h } = A4_STAIR_RAIL;
    expect(z).toBeCloseTo(A4_STAIR.z0 - 0.05, 9);
    expect(stairRail).toHaveLength(18);
    expect(stairRail.every((p) => p.collide && p.visible === false && p.noLedge === true)).toBe(true);
    const railFlat = stairRail.map(upright);
    const deckRails = mine.filter((p) => p.collide && Math.abs(p.s[1] - A4_MEZZ.rail) < 1e-6 && Math.abs(p.c[1] - (A4_MEZZ.deck + A4_MEZZ.rail / 2)) < 1e-6).map(upright);
    const bodyHits = (x: number, y: number, zz: number, list: readonly BoxPiece[] = railFlat, r = MOVEMENT.radius): string | null => {
      for (const p of list) {
        if (p.c[1] - p.s[1] / 2 >= y + 1.7 || top(p) <= y + 0.3) continue;
        if (hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(zz - p.c[2]) - p.s[2] / 2, 0)) < r) return `box (${p.c.map((v) => v.toFixed(2)).join(', ')})`;
      }
      return null;
    };
    const zMid = (A4_STAIR.z0 + A4_STAIR.z1) / 2;
    for (const f of flights) {
      const line = (x: number): number => (A4_MEZZ.deck * (f.up === 1 ? x - f.foot : f.foot - x)) / len;
      const mine = railFlat.filter((p) => Math.abs(p.c[0] - (f.from + f.to) / 2) < Math.abs(f.to - f.from) / 2);
      expect(mine, f.name).toHaveLength(9);
      expect(Math.abs(f.to - f.from) / seg).toBeCloseTo(9, 9);
      // the third tread: the rail starts no earlier than the second tread's end, and the foot's first two treads are clear of it
      expect(Math.abs(f.from - f.foot)).toBeGreaterThanOrEqual(2 * 0.285 - 1e-9);
      mine.sort((p, q) => f.up * (p.c[0] - q.c[0]));
      let x: number = f.from;
      for (const p of mine) {
        // a 0.1 m box on the line z 46.5 (its face stops on the flight's open edge), one segment long, from the low end's floor line
        expect(p.s[0], f.name).toBeCloseTo(seg, 6);
        expect(p.s[2]).toBeCloseTo(0.1, 9);
        expect(p.c[2]).toBeCloseTo(z, 9);
        expect(p.c[2] + p.s[2] / 2, 'the box face is never inside the flight').toBeLessThanOrEqual(A4_STAIR.z0 + 1e-9);
        expect(p.c[0] - (f.up * p.s[0]) / 2, `${f.name}: no gap at the low end`).toBeCloseTo(x, 6);
        const lo = p.c[0] + (f.up * p.s[0]) / 2;
        expect(p.c[1] - p.s[1] / 2, 'from the floor line at the low end').toBeCloseTo(line(x), 6);
        expect(top(p) - line(lo), 'the rail height over the walking line at the high end').toBeGreaterThanOrEqual(h - 1e-6);
        x = lo;
      }
      expect(x, `${f.name}: the head`).toBeCloseTo(f.to, 6);
      // no gap: at every x from the third tread to the deck face a rail box stands on z 46.5 across 0.3 m to 1.0 m over the line
      for (let sx = Math.min(f.from, f.to) + 0.025; sx < Math.max(f.from, f.to); sx += 0.05) for (const dy of [0.3, 0.6, 1.0]) expect(railFlat.some((p) => Math.abs(sx - p.c[0]) <= p.s[0] / 2 + 1e-9 && Math.abs(line(sx) + dy - p.c[1]) <= p.s[1] / 2 + 1e-9 && Math.abs(z - p.c[2]) <= p.s[2] / 2 + 1e-9), `${f.name} x ${sx.toFixed(3)} dy ${dy}`).toBe(true);
      // the head meets the deck's rail end: the deck's side rail (x 86.2 / 105.8) ends at z 46.45, the stair rail ends at the deck face: no body-width gap
      const side = deckRails.find((p) => Math.abs(p.c[0] - (f.up === 1 ? A4_MEZZ.x0 + A4_MEZZ.inset : A4_MEZZ.x1 - A4_MEZZ.inset)) < 1e-6)!;
      const headBox = mine[mine.length - 1]!;
      const gapX = Math.max(f.up * (f.up === 1 ? side.c[0] - side.s[0] / 2 - (headBox.c[0] + headBox.s[0] / 2) : headBox.c[0] - headBox.s[0] / 2 - (side.c[0] + side.s[0] / 2)), 0);
      const gapZ = Math.max(headBox.c[2] - headBox.s[2] / 2 - (side.c[2] + side.s[2] / 2), 0);
      expect(hyp2(gapX, gapZ), `${f.name}: the gap at the head`).toBeLessThan(2 * MOVEMENT.radius);
      expect(Math.abs(headBox.c[2] - side.c[2] - side.s[2] / 2)).toBeLessThanOrEqual(headBox.s[2] / 2 + 1e-9);
      // the flight is not narrowed or blocked: a body walking its centre line and an edge lane 0.3 m in, the whole flight, meets no rail
      for (let t = 0; t <= len + 1e-9; t += 0.1) {
        const sx = f.foot + f.up * t;
        expect(bodyHits(sx, line(sx), zMid), `${f.name}: centre line at x ${sx.toFixed(2)}`).toBeNull();
        expect(bodyHits(sx, line(sx), A4_STAIR.z0 + 0.3 + 0.01), `${f.name}: edge lane at x ${sx.toFixed(2)}`).toBeNull();
      }
      // the foot's first two treads stay open from the open side: a body walks in from the floor at x foot + 0.15 and foot + 0.4
      for (const t of [0.15, 0.4]) for (let zz = A4_STAIR.z0 - 1.0; zz <= zMid; zz += 0.1) expect(bodyHits(f.foot + f.up * t, 0, zz), `${f.name}: foot walk at x ${(f.foot + f.up * t).toFixed(2)} z ${zz.toFixed(2)}`).toBeNull();
      // the rest of the open side is shut: a body on the flight cannot walk off it (the rail stops it); without the rail boxes it could (teeth)
      const lo = Math.min(f.from, f.to);
      const hi = Math.max(f.from, f.to);
      for (let sx = lo + 0.3; sx < hi - 0.3 + 1e-9; sx += 0.3) {
        expect(bodyHits(sx, line(sx), A4_STAIR.z0 - 0.1), `${f.name}: step off at x ${sx.toFixed(2)}`).not.toBeNull();
        expect(bodyHits(sx, line(sx), A4_STAIR.z0 - 0.1, base), `${f.name}: step off at x ${sx.toFixed(2)} without the rail`).toBeNull();
      }
    }
    // the kit's balustrade over each box: eighteen `handrail` modules on the mezzanine strip (43) along z 46.5
    const pieces = kitIn.filter((i) => i.piece === 'handrail' && Math.abs(i.z - z) < 1e-6);
    expect(pieces).toHaveLength(18);
    for (const i of pieces) expect(i.group).toBe(43);
  });

  it("the stairs' rail leaves the lanes open and the deck's lip safe: the strip south of each flight is walkable; soloJumpThreats for the deck edge is still empty with the rail in the solid list, and still bites", () => {
    expect(solid.filter((p) => p.visible === false && Math.abs(p.c[2] - A4_STAIR_RAIL.z) < 1e-6)).toHaveLength(18);
    // the strips south of the flights (x 80.3-86 and 106-111.7, z 44.2-46.4) are walkable end to end on three lanes
    for (const [x0, x1] of [[80.5, 85.6], [106.4, 111.4]] as const) for (const zz of [44.6, 45.3, 46.1]) expect(walkBlocked(x0, zz, x1, zz), `strip lane z ${zz} x ${x0}-${x1}`).toBeNull();
    const deckEdge: CoopGrip = { y: A4_MEZZ.deck, a: { x: A4_MEZZ.x0, z: A4_MEZZ.z0 }, b: { x: A4_MEZZ.x1, z: A4_MEZZ.z0 }, n: { x: 0, z: -1 } };
    for (const y of [A4_MEZZ.deck, 4.4]) expect(soloJumpThreats(solid, { ...deckEdge, y }), `deck edge lip at ${y}`).toEqual([]);
    const crate: BoxPiece = { c: [96, 0.9, A4_MEZZ.z0 - 1.5], s: [1, 1.8, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true };
    expect(soloJumpThreats([...solid, crate], deckEdge).length).toBeGreaterThan(0);
    // the guards' stair nav and legs are in the guard tests above (D1 and D2 walk with the rails in the solid list)
  });
});
