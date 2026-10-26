/**
 * J14 G-A2: A2 the Carriage Shed on the re-plan (`src/world/maps/ctcourseSets/replan/a2CarriageShed.ts`, built through
 * `buildCtcourse(b, { replan: true })`): one guard, no staging, a one-way route stores bay -> roller door -> lane -> neck ->
 * pit, stations 3-5, the walkway stand-in, the coat-corner lamp. Pins: the set builder's own greybox with `{ replan: true }`
 * (its `GREY`: the built test's method), the contract, the shunter alone, the stations equal STATIONS' A2 block, the marks'
 * standing room, the closures on the guards' runtime nav grid (no path from the stores bay with every gate shut; none to the
 * east end but through the neck; none across the pit but the walkway), the pit cannot be left on the far side or hopped, the
 * two pass zones, LANTERN's retry lines, the objective lines, the coat lamp on circuit 22, the course gates at run time (the
 * roller door's latch after station 3: lead answer 3), the stores bay strip on circuit 20 and the marks out of the shunter's
 * sight (lead answer 4), the tuned light file. The built yard's own cases stay in `tests/ctcourse/a2CarriageShed.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { MOVEMENT } from '../../../src/config/movement';
import { COURSE_TEXT_MAX } from '../../../src/config/course';
import { hyp2 } from '../../../src/core/mathx';
import { layoutKnownIds, validateCourse, type EgressGate, type FlagGate, type HoldGate, type IsolatorGate } from '../../../src/game/course/courseDef';
import { CourseState } from '../../../src/game/course/courseState';
import { REPLAN_TICKS } from '../../../src/game/course/replan/ticks';
import { a2Tick } from '../../../src/game/course/replan/a2Ticks';
import type { StationDef } from '../../../src/game/course/stationDef';
import type { NavGrid } from '../../../src/ai/navGrid';
import { isolatorLures } from '../../../src/game/modes/courseMode';
import { STAGE_NAV_ACROSS, STAGE_NAV_ALONG } from '../../../src/game/sectorStage';
import { FacilityKit } from '../../../src/world/kit/facilityKit';
import { generateLedges } from '../../../src/world/anchors';
import { LevelBuilder, type BoxPiece } from '../../../src/world/levelBuilder';
import { MARLOW_CIRCUITS, MARLOW_CIRCUITS_REPLAN, MARLOW_POCKETS_REPLAN, marlowCourseGroups } from '../../../src/world/lighting/marlowCircuits';
import { buildCtcourse, ctcourseReplan } from '../../../src/world/maps/ctcourse';
import {
  A2_BACK_DOOR,
  A2_CABIN_DOOR,
  A2_EAST_FLAG,
  A2_GATE,
  A2_ISO_1,
  A2_ISO_2,
  A2_NECK_GROUP,
  A2_ROADS,
  A2_SHUNTER,
  A2_SHUNTER_WAITS,
  A2_WATCH_E,
  A2_WATCH_W,
  buildA2CarriageShed,
} from '../../../src/world/maps/ctcourseSets/a2CarriageShed';
import {
  A2_ACROSS_FLAG,
  A2_ACROSS_ZONE,
  A2_CAB2_REPLAN,
  A2_COAT_LAMP,
  A2_BUILT_NECK_LINES,
  A2_GAP12_CLOSE,
  A2_L2_FACE_X,
  A2_LANE_FLAG,
  A2_LANE_ZONE,
  A2_NORTH_CLOSE,
  A2_PIT,
  A2_PIT_BARRIER,
  A2_RETRY_LINES,
  A2_SHUNTER_ROUTE_REPLAN,
  A2_SHUNTER_YAW_REPLAN,
  A2_SHUTTER,
  A2_SHUTTER_DOOR,
  A2_SHUTTER_GATE,
  A2_SHUTTER_HOLD,
  A2_SHUTTER_OPEN_GATE,
  A2_STATIONS,
  A2_STEP_IRONS_X,
  A2_STEP_IRONS_Z,
  A2_STORES_LAMP,
  A2_STORES_WALL,
  A2_WALKWAY,
  A2_WALKWAY_DOOR,
  A2_WALKWAY_FLAG,
  A2_WALKWAY_GATE,
  FLOOR_HOLES,
  A2_BOARD_STACK,
  A2_PLANK_KIT_TEXT,
} from '../../../src/world/maps/ctcourseSets/replan/a2CarriageShed';
import { kitSpotsOf } from '../../../src/game/kit/kitApi';
import { flags } from '../../../src/core/flags';
import { REPLAN_FLOOR_HOLES } from '../../../src/world/maps/ctcourseSets/replan';
import { checkSetPart, HALL_H, inBox, pieceCount, registerSum, SET_BOX, SET_GUARDS_MAX } from '../../../src/world/maps/ctcourseSets/types';
import { runtimeNav } from '../../helpers/runtimeNav';
import { lastTimeAtOrOver, MANTLE, SOLO_TOP_SPEED } from '../../helpers/soloJumpReach';

const b = new LevelBuilder();
const built = buildCtcourse(b, { replan: true });
const part = built.parts[1]!;
const lay = built.layout;
const course = lay.course!;
const def = course.def;
const range = built.ranges.a2CarriageShed;
const mine = b.boxes.slice(range.boxes[0], range.boxes[1]);
const box = SET_BOX.a2CarriageShed[0]!;

/** The set builder's own pieces with `{ replan: true }` (before the re-plan's): the greybox first, then the dressing. */
const solo = new LevelBuilder();
buildA2CarriageShed(solo, new FacilityKit(solo), { replan: true });
const soloCount = pieceCount(solo);
/** The greybox as the built test counts it, with the re-plan's guards: the built yard's 61 boxes (30 solids) less the staging deck, its two screens, the stair's 27 risers
 *  and ramp, the leg-up mark, the three ballast strips, the two east wheel stops and cabinet 2's east-wall body (38). The same checksum method as the built test. */
const GREY = { boxes: 23, solids: 23, lights: 15, doors: 2, anchors: 0, checksum: 2673.4599999999996 };
const grey = solo.boxes.slice(0, GREY.boxes);
const own = mine.slice(solo.boxes.length);
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
const key = (p: BoxPiece): string => [...p.c, ...p.s, p.yaw, p.pitch, p.collide].map((v) => (typeof v === 'number' ? v.toFixed(4) : String(v))).join(',');
/** Upright collision pieces (what a body walking meets). */
const solid = b.boxes.filter((p) => p.collide && !p.overhead && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
/** The solid boxes whose band (floor to 1.7 m over `y`) is within `r` of (x, z): what a body standing there touches. */
const blockedAt = (x: number, z: number, y = 0, r = MOVEMENT.radius): string[] =>
  solid
    .filter((p) => bottom(p) < y + 1.7 && top(p) > y + 0.15)
    .filter((p) => hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r)
    .map((p) => `box (${p.c.map((v) => v.toFixed(2)).join(', ')}) size (${p.s.map((v) => v.toFixed(2)).join(', ')})`);

/** STATIONS.md section 3, the A2 block, verbatim, with the lead's one change (answer 3, 2026-10-26): station 4 lists the roller
 *  door's latch in its gates and has it as its stand-in (the base opens it as station 4 goes live). */
const STATIONS_A2: StationDef[] = [
  { n: 3, id: 'a2-shutter', lesson: 'shutter_hold', retry: 'station', doneFlag: 'a2-lane',
    marks: [{ x: 31.0, z: 11.5, y: 0, yaw: Math.PI / 2 }, { x: 31.0, z: 13.0, y: 0, yaw: Math.PI / 2 }],
    guards: ['a2-shunter'], gates: ['g-a2-shutter'] },
  { n: 4, id: 'a2-lights', lesson: 'timed_light_cut', retry: 'station', doneFlag: 'a2-east', drillS: 15,
    marks: [{ x: 30.5, z: 2.5, y: 0, yaw: Math.PI }, { x: 45.5, z: 12.5, y: 0, yaw: Math.PI / 2 }],
    guards: ['a2-shunter'], gates: ['g-a2-neck', 'g-a2-shutter-open'], standIn: 'g-a2-shutter-open' },
  { n: 5, id: 'a2-plank', lesson: 'plank_bridge', retry: 'station', doneFlag: 'a2-across', kit: 'plankBridge', standIn: 'g-a2-walkway',
    marks: [{ x: 65.5, z: 12.0, y: 0, yaw: Math.PI / 2 }, { x: 65.5, z: 13.0, y: 0, yaw: Math.PI / 2 }],
    guards: ['a2-shunter'], gates: ['g-a2-walkway'] },
];

describe('A2 re-plan: the part and the greybox', () => {
  it('passes the set-part contract; the course validates; every register row is an A2 row and sums to the builder pieces', () => {
    expect(part.id).toBe('a2CarriageShed');
    expect(part.stub).toBeUndefined();
    expect(checkSetPart(part)).toEqual([]);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
    expect(part.register.every((r) => r.id.startsWith('A2-'))).toBe(true);
    for (const r of part.register) expect(/[–—]/.test(r.element), r.id).toBe(false);
    expect(registerSum(part.register)).toEqual(built.counts.sets.a2CarriageShed);
  });

  it("the set builder's own greybox with { replan: true }: 23 solids (the built 61 boxes less the staging, its stair, the east stops, cabinet 2's wall body and the ballast), the built method's checksum, 15 lamps, the cabin's 2 doors, no anchor", () => {
    expect(grey).toHaveLength(GREY.boxes);
    let sum = 0;
    for (const p of grey) sum += (p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw) * (p.collide ? 1 : 1.5) * (p.visible === false ? 1.25 : 1) * (p.overhead ? 1.1 : 1);
    expect(sum).toBeCloseTo(GREY.checksum, 3);
    expect(grey.filter((p) => p.collide)).toHaveLength(GREY.solids);
    expect(soloCount.lights).toBe(GREY.lights);
    expect(soloCount.doors).toBe(GREY.doors);
    expect(soloCount.anchors).toBe(GREY.anchors);
    // the full build's set boxes start with exactly those pieces, then the re-plan's own
    expect(mine.slice(0, solo.boxes.length).map(key)).toEqual(solo.boxes.map(key));
    expect(own.length).toBeGreaterThan(30);
    // against the built yard: every greybox piece here is one the built yard has; the ones gone are the staging, its stair and screens, the east stops, cabinet 2's wall body, the ballast
    const bb = new LevelBuilder();
    const bt = buildCtcourse(bb);
    const r0 = bt.ranges.a2CarriageShed;
    const builtGrey = bb.boxes.slice(r0.boxes[0], r0.boxes[1]).slice(0, 61);
    const builtKeys = new Set(builtGrey.map(key));
    for (const p of grey) expect(builtKeys.has(key(p)), `grey piece ${key(p)}`).toBe(true);
    const greyKeys = new Set(grey.map(key));
    const gone = builtGrey.filter((p) => !greyKeys.has(key(p)));
    expect(gone).toHaveLength(38);
    expect(gone.filter((p) => p.collide && p.s[0] > 30 && top(p) > 4.3)).toHaveLength(1);
    expect(gone.filter((p) => p.collide && Math.abs(p.s[1] - 0.3) < 1e-6 && p.c[0] > 68)).toHaveLength(2);
  });

  it('no deck, no stair, no permit gate, no lip: nothing over 2 m stands on the staging footprint, the one planned lip and the manual ledge are gone, no walkable top over 0.5 m inside the set', () => {
    expect(part.lips).toEqual([]);
    expect(built.parts.flatMap((x) => x.lips).filter((l) => inBox(box, l.a.x, l.a.z))).toEqual([]);
    expect(part.props.map((p) => p.prop).filter((n) => n === 'permitGate')).toEqual([]);
    expect(part.props.filter((p) => p.prop === 'pushStation')).toHaveLength(2);
    expect(part.props.filter((p) => p.prop === 'trackPanel')).toHaveLength(9);
    const tall = mine.filter((p) => p.collide && Math.abs(p.pitch) < 1e-3 && top(p) > 2 && p.c[2] > 17.5 && p.c[0] > 46.5 && p.c[0] < 55.5);
    expect(tall).toEqual([]);
    const inSet = mine.filter((p) => p.collide && p.c[0] > 30 && p.c[0] < 66 && p.c[2] > 17.5 && p.c[2] < 19.75 && top(p) > 0.5);
    for (const p of inSet) expect(p.noLedge, `box at (${p.c.join(', ')})`).toBe(true);
    expect(generateLedges(b.boxes, b.anchors).ledges.filter((l) => l.piece !== 0 && inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3) && l.top >= 0.9)).toEqual([]);
    expect(b.anchors.all.filter((a) => a.kind === 'ledge' && inBox(box, (a as { a: { x: number } }).a.x, (a as { a: { z: number } }).a.z))).toEqual([]);
  });

  it('every collider the re-plan adds is noLedge (the closers, the stores wall, the pit liners and floor, the barrier, the walkway, cabinet 2), the new walls reach the roof, inside the set box', () => {
    const colliders = own.filter((p) => p.collide);
    expect(colliders.length).toBeGreaterThan(15);
    for (const p of colliders) expect(p.noLedge, `collider at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBe(true);
    const [x0, z0, x1, z1] = box;
    for (const p of own) {
      expect(p.c[0] - p.s[0] / 2, 'west').toBeGreaterThanOrEqual(x0 - 0.3);
      expect(p.c[0] + p.s[0] / 2, 'east').toBeLessThanOrEqual(x1 + 0.3);
      expect(p.c[2] - p.s[2] / 2, 'south').toBeGreaterThanOrEqual(z0 - 0.3);
      expect(p.c[2] + p.s[2] / 2, 'north').toBeLessThanOrEqual(z1 + 0.3);
      expect(top(p)).toBeLessThanOrEqual(HALL_H + 1e-6);
    }
    const wall = own.filter((p) => p.collide && Math.abs(p.c[0] - A2_STORES_WALL.x) < 1e-6 && Math.abs(p.s[0] - A2_STORES_WALL.t) < 1e-6);
    expect(wall.length).toBeGreaterThanOrEqual(3);
    for (const p of wall) expect(top(p)).toBeCloseTo(HALL_H, 6);
    // the wall runs from the cabin's north-east corner (z 5) to the north wall's face (z 19.75), with only the roller door's opening (z 11-14) low
    expect(Math.min(...wall.map((p) => p.c[2] - p.s[2] / 2))).toBeCloseTo(A2_STORES_WALL.z0, 6);
    expect(Math.max(...wall.map((p) => p.c[2] + p.s[2] / 2))).toBeCloseTo(A2_STORES_WALL.z1, 6);
    const header = wall.find((p) => bottom(p) > 0.5)!;
    expect(bottom(header)).toBeCloseTo(A2_SHUTTER.lift, 6);
    expect([header.c[2] - header.s[2] / 2, header.c[2] + header.s[2] / 2]).toEqual([A2_SHUTTER.z0, A2_SHUTTER.z1]);
  });
});

describe('A2 re-plan: one guard, the shunter', () => {
  it('the squad is [a2-shunter]; the two watchers are gone from the squad slots and the bay; the strict rule is off', () => {
    expect(Object.keys(part.squads)).toEqual([A2_SHUNTER]);
    expect(part.bay.squad).toEqual([A2_SHUNTER]);
    expect(part.squads[A2_WATCH_W]).toBeUndefined();
    expect(part.squads[A2_WATCH_E]).toBeUndefined();
    expect(part.bay.squad.length).toBeLessThanOrEqual(SET_GUARDS_MAX);
    expect(def.bays.find((x) => x.id === 'A2')!.spotFail).toBeUndefined();
    expect(def.bays.find((x) => x.id === 'A2')!.rated).toBe(true);
  });

  it('his post (51, 10) faces east (yaw PI / 2); the round is (51, 10), (56, 7.5), (65.5, 7.5), (56, 7.5) with the built waits; the east stop is 0.5 m short of the pit', () => {
    const s = part.squads[A2_SHUNTER]!;
    expect([s.x, s.z]).toEqual([51, 10]);
    expect(s.yaw).toBeCloseTo(Math.PI / 2, 9);
    expect(A2_SHUNTER_YAW_REPLAN).toBeCloseTo(Math.PI / 2, 9);
    expect(s.route).toEqual([[51, 10], [56, 7.5], [65.5, 7.5], [56, 7.5]]);
    expect(A2_SHUNTER_ROUTE_REPLAN).toEqual(s.route);
    expect(s.waits).toEqual(A2_SHUNTER_WAITS);
    expect(s.faces![0]).toBeCloseTo(Math.PI / 2, 9);
    expect(A2_PIT.x0 - s.route![2]![0]).toBeCloseTo(0.5, 9);
    // every route point has standing room, the east stop included
    for (const [x, z] of s.route!) expect(blockedAt(x, z, 0, 0.3), `(${x}, ${z})`).toEqual([]);
  });
});

describe('A2 re-plan: stations 3-5, the marks, the flags, the lines', () => {
  it("the stations are STATIONS section 3's A2 block, verbatim but for station 4's latch; every mark has standing room for a 0.3 m body on its floor, inside the set box and clear of the pit", () => {
    expect(part.bay.stations).toEqual(STATIONS_A2);
    expect(A2_STATIONS).toEqual(STATIONS_A2);
    expect(def.bays.find((x) => x.id === 'A2')!.stations).toEqual(STATIONS_A2);
    for (const s of STATIONS_A2) {
      for (const m of s.marks) {
        expect(inBox(box, m.x, m.z), `${s.id} (${m.x}, ${m.z}) in the set box`).toBe(true);
        expect(blockedAt(m.x, m.z, m.y, 0.3), `${s.id} (${m.x}, ${m.z})`).toEqual([]);
        for (const h of FLOOR_HOLES) expect(m.x > h[0] - 0.3 && m.x < h[2] + 0.3 && m.z > h[1] && m.z < h[3], `${s.id} mark over a hole`).toBe(false);
      }
    }
    // station 5's marks and cabinet 2's body (0.6 m body clear) stay apart
    for (const m of STATIONS_A2[2]!.marks) expect(hyp2(Math.max(Math.abs(m.x - A2_CAB2_REPLAN.x) - 0.45, 0), Math.max(Math.abs(m.z - 11.45) - 0.15, 0))).toBeGreaterThan(0.6);
    // the drill station's 15 s is the circuit's (the isolator gate)
    expect(STATIONS_A2[1]!.drillS).toBe(15);
    expect((part.bay.gates.find((g) => g.id === A2_GATE) as IsolatorGate).seconds).toBe(15);
  });

  it('the tick is registered for the A2 drill; the stand-in and gates the stations name exist as bay gates', () => {
    expect(Object.values(REPLAN_TICKS)).toContain(a2Tick);
    const ids = new Set(part.bay.gates.map((g) => g.id));
    for (const s of STATIONS_A2) for (const g of [...s.gates, ...(s.standIn ? [s.standIn] : [])]) expect(ids.has(g), `${s.id} gate ${g}`).toBe(true);
  });

  it("the two pass zones: a2-lane [36, 11.3, 46, 13.7] and a2-across [69, 8.5, 69.75, 11.5], both players, floor 0; a2-east exists; the flags are external", () => {
    const lane = part.passZones.find((z) => z.flag === A2_LANE_FLAG)!;
    const across = part.passZones.find((z) => z.flag === A2_ACROSS_FLAG)!;
    expect(lane.box).toEqual([36, 11.3, 46, 13.7]);
    expect(A2_LANE_ZONE).toEqual([36, 11.3, 46, 13.7]);
    expect(across.box).toEqual([69, 8.5, 69.75, 11.5]);
    expect(A2_ACROSS_ZONE).toEqual([69, 8.5, 69.75, 11.5]);
    for (const z of [lane, across]) {
      expect(z.floorY).toBe(0);
      expect(z.any).toBeUndefined();
    }
    expect(part.passZones.find((z) => z.flag === A2_EAST_FLAG)).toBeDefined();
    for (const f of [A2_LANE_FLAG, A2_ACROSS_FLAG, A2_EAST_FLAG, A2_WALKWAY_FLAG]) expect(part.externalFlags).toContain(f);
    // the lane's zone is lane floor: no solid in the way of its middle line, the landing's zone is the far landing in front of the L2 door
    expect(blockedAt(41, 12.5, 0, 0.3)).toEqual([]);
    expect(blockedAt(69.4, 10, 0, 0.3)).toEqual([]);
  });

  it("LANTERN's retry lines: 'retry:a2-shutter', 'retry:a2-lights', 'retry:a2-lights:timer', 'retry:a2-plank' (verbatim), none says failed, all fit COURSE_TEXT_MAX; the built staging line is gone", () => {
    const line = (at: string): string | undefined => part.bay.radio.find((r) => r.at === at)?.text;
    expect(line('retry:a2-shutter')).toBe('Seen at the roller door. Back to the stores bay.');
    expect(line('retry:a2-lights')).toBe('The shunter saw you in the neck. Back to the cabin and the lane.');
    expect(line('retry:a2-lights:timer')).toBe('Lights came back with you in the neck. Back to the cabin and the lane.');
    expect(line('retry:a2-plank')).toBe('The shunter saw the board. Back to the board stack at the east end.');
    expect(A2_RETRY_LINES.map((r) => r.at)).toEqual(['retry:a2-shutter', 'retry:a2-lights', 'retry:a2-lights:timer', 'retry:a2-plank']);
    for (const r of part.bay.radio) {
      expect(r.text.length, r.text).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/fail/i.test(r.text), r.text).toBe(false);
    }
    expect(part.bay.radio.some((r) => /Two spotters/.test(r.text))).toBe(false);
    expect(part.bay.radio.some((r) => r.at === `warn:${A2_GATE}`)).toBe(true);
    // the station ids the lines key on are the stations'
    for (const s of STATIONS_A2) expect(part.bay.radio.some((r) => r.at === `retry:${s.id}`), s.id).toBe(true);
  });

  it('(marlow-play C2) the neck isolator lures nobody on the re-plan (the shunter stays off the crossers\' lane), and the built lines that promise a lure are gone', () => {
    expect(isolatorLures('ctcourseReplan', A2_GATE)).toBe(false);
    expect(isolatorLures('ctcourse', A2_GATE)).toBe(true);
    expect(isolatorLures('ctcourseReplan', 'g-a5-other')).toBe(true);
    expect(A2_BUILT_NECK_LINES).toHaveLength(2);
    // the built set still has them (the built yard keeps its lure), the re-plan's radio does not
    const soloRadio = new LevelBuilder();
    const builtPart = buildA2CarriageShed(soloRadio, new FacilityKit(soloRadio));
    for (const t of A2_BUILT_NECK_LINES) {
      expect(builtPart.bay.radio.some((r) => r.text === t), t).toBe(true);
      expect(part.bay.radio.some((r) => r.text === t), t).toBe(false);
    }
    expect(part.bay.radio.some((r) => /shunter stands at the neck|on two isolators/i.test(r.text))).toBe(false);
  });

  it('the objective lines: one per station then the holding-room line, each what and where, at most COURSE_TEXT_MAX, never "fail"; the built neck steps are gone', () => {
    const ids = part.objectives.map((o) => o.id);
    expect(ids).toEqual(['a2-shutter', 'a2-lights', 'a2-plank', 'a2-lock']);
    const flags = part.objectives.map((o) => (o.done && 'flag' in o.done ? o.done.flag : undefined));
    expect(flags).toEqual([A2_LANE_FLAG, 'a2-east', A2_ACROSS_FLAG, undefined]);
    for (const o of part.objectives) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(/fail/i.test(t), t).toBe(false);
        expect(/[–—]/.test(t), t).toBe(false);
      }
    }
    expect(part.objectives[1]!.timer).toBe(A2_GATE);
    const text = part.objectives.map((o) => o.text.toLowerCase());
    expect(text[0]).toMatch(/roller door/);
    expect(text[0]).toMatch(/stores bay/);
    // (marlow-play C6) holding only unlocks the roller door: the lines say the one going under opens it, the holder follows
    const s3 = part.objectives[0]!;
    expect(s3.a).toMatch(/roller door/);
    expect(s3.a).toMatch(/opens it/);
    expect(s3.a).toMatch(/[Ff]ollow/);
    expect(s3.b).toMatch(/roller door/);
    expect(s3.b).toMatch(/^Open the roller door/);
    expect(text[1]).toMatch(/neck/);
    expect(text[1]).toMatch(/cabinet/);
    expect(text[2]).toMatch(/pit/);
    expect(text[2]).toMatch(/l2 door/);
    expect(text[3]).toMatch(/holding room two/);
  });
});

describe('A2 re-plan: the course gates at run time', () => {
  const fresh = (n: number): CourseState => {
    const s = new CourseState(def, course.consoles);
    expect(s.startStation(n)).toBe(true);
    s.setPlayer(0, 31, 0, 11.5, false);
    s.setPlayer(1, 31, 0, 13, false);
    s.update(1 / 60);
    return s;
  };
  const run = (s: CourseState, sec: number): void => {
    for (let t = 0; t < sec - 1e-9; t += 1 / 60) s.update(1 / 60);
  };

  it('the shutter is a hold gate on the roller door: shut by default, up while one holds the hold point, shut again when released; either player can hold', () => {
    const gate = part.bay.gates.find((g) => g.id === A2_SHUTTER_GATE) as HoldGate;
    expect(gate).toEqual({ kind: 'hold', id: 'g-a2-shutter', holdId: A2_SHUTTER_HOLD, doorId: A2_SHUTTER_DOOR });
    expect(part.devices[A2_SHUTTER_HOLD]).toBeDefined();
    const s = fresh(3);
    expect(s.station()).toBe(3);
    expect(s.isGateOpen(A2_SHUTTER_GATE)).toBe(false);
    expect(s.locked(A2_SHUTTER_DOOR)).toBe(true);
    for (const p of [0, 1] as const) {
      s.hold(A2_SHUTTER_HOLD, p, true);
      s.update(1 / 60);
      expect(s.isGateOpen(A2_SHUTTER_GATE), `held by ${p}`).toBe(true);
      expect(s.locked(A2_SHUTTER_DOOR)).toBe(false);
      s.hold(A2_SHUTTER_HOLD, p, false);
      s.update(1 / 60);
      expect(s.isGateOpen(A2_SHUTTER_GATE), `released by ${p}`).toBe(false);
    }
    // the hold point is on the stores face at the south jamb, within reach (1.4 m) of a body either side of the door
    const d = part.devices[A2_SHUTTER_HOLD]!;
    for (const [x, z] of [[32.2, 10.6], [33.8, 10.6]] as const) {
      expect(blockedAt(x, z, 0, 0.3), `standing at (${x}, ${z})`).toEqual([]);
      expect(hyp2(d.x - x, d.z - z)).toBeLessThan(1.4);
    }
    // the jamb: the device is on the south wall piece's face (the opening starts at z 11.0)
    expect(d.z).toBeLessThan(A2_SHUTTER.z0);
    expect(d.x).toBeLessThan(A2_STORES_WALL.x);
  });

  it('the lane flag finishes station 3 and the next live station is 4; the neck flag finishes 4 and 5 is next; the across flag finishes 5', () => {
    const s = fresh(3);
    expect(s.hasShared(A2_LANE_FLAG)).toBe(false);
    s.setFlag(A2_LANE_FLAG);
    run(s, 0.2);
    expect(s.station()).toBe(4);
    s.setFlag(A2_EAST_FLAG);
    run(s, 0.2);
    expect(s.station()).toBe(5);
    s.setFlag(A2_ACROSS_FLAG);
    run(s, 0.2);
    expect(s.station()).toBe(0);
  });

  it("the walkway stand-in is a flag gate that latches: open as station 5 goes live and through a retry; its flag is external; never hold, timedHold or mains", () => {
    const g = part.bay.gates.find((x) => x.id === A2_WALKWAY_GATE) as FlagGate;
    expect(g).toEqual({ kind: 'flag', id: 'g-a2-walkway', flag: 'a2-walkway', doorId: A2_WALKWAY_DOOR });
    expect(['hold', 'timedHold', 'mains']).not.toContain(g.kind);
    expect(part.externalFlags).toContain(g.flag);
    const s = fresh(5);
    expect(s.station()).toBe(5);
    run(s, 0.2);
    expect(s.isGateOpen(A2_WALKWAY_GATE)).toBe(true);
    expect(s.locked(A2_WALKWAY_DOOR)).toBe(false);
    expect(s.retryStation('seen')).toBe(true);
    run(s, 0.5);
    expect(s.station()).toBe(5);
    expect(s.isGateOpen(A2_WALKWAY_GATE)).toBe(true);
    // before station 5 is live the walkway is shut
    const early = fresh(4);
    expect(early.isGateOpen(A2_WALKWAY_GATE)).toBe(false);
    expect(early.locked(A2_WALKWAY_DOOR)).toBe(true);
  });

  it('the neck isolator keeps both cabinets; cabinet 2 is the new device by the pit, cabinet 1 the built one; the part has the three course doors only', () => {
    const g = part.bay.gates.find((x) => x.id === A2_GATE) as IsolatorGate;
    expect(g.switchIds).toEqual([A2_ISO_1, A2_ISO_2]);
    expect(g.group).toBe(A2_NECK_GROUP);
    expect(part.devices[A2_ISO_2]).toMatchObject({ x: A2_CAB2_REPLAN.x, z: A2_CAB2_REPLAN.z });
    expect(Object.keys(part.doors).sort()).toEqual([A2_CABIN_DOOR, A2_SHUTTER_DOOR, A2_WALKWAY_DOOR].sort());
    expect(part.doors[A2_BACK_DOOR]).toBeUndefined();
  });

  it("the roller door latches open for good once station 3 passes (lead answer 3): an egress gate on the same door, after the hold gate, its switch the hold point, station 4's stand-in", () => {
    const ids = part.bay.gates.map((g) => g.id);
    const latch = part.bay.gates.find((g) => g.id === A2_SHUTTER_OPEN_GATE) as EgressGate;
    expect(latch).toEqual({ kind: 'egress', id: 'g-a2-shutter-open', switchId: A2_SHUTTER_HOLD, doorIds: [A2_SHUTTER_DOOR] });
    // the mode builds the hold point's braced item for the hold gate first and the latch shares it: a hold never presses it
    expect(ids.indexOf(A2_SHUTTER_GATE)).toBeLessThan(ids.indexOf(A2_SHUTTER_OPEN_GATE));
    expect(STATIONS_A2[1]!.gates).toContain(A2_SHUTTER_OPEN_GATE);
    expect(STATIONS_A2[1]!.standIn).toBe(A2_SHUTTER_OPEN_GATE);
    expect(STATIONS_A2[1]!.kit).toBeUndefined();
  });

  it('before the pass the roller door is shut without a hold: the latch stays shut, the door opens only while held; a station 3 retry still needs the hold', () => {
    const s = fresh(3);
    run(s, 0.5);
    expect(s.station()).toBe(3);
    expect(s.isGateOpen(A2_SHUTTER_OPEN_GATE)).toBe(false);
    expect(s.locked(A2_SHUTTER_DOOR)).toBe(true);
    s.hold(A2_SHUTTER_HOLD, 0, true);
    s.update(1 / 60);
    expect(s.locked(A2_SHUTTER_DOOR)).toBe(false);
    s.hold(A2_SHUTTER_HOLD, 0, false);
    s.update(1 / 60);
    expect(s.locked(A2_SHUTTER_DOOR)).toBe(true);
    expect(s.retryStation('seen')).toBe(true);
    run(s, 0.5);
    expect(s.station()).toBe(3);
    expect(s.isGateOpen(A2_SHUTTER_OPEN_GATE)).toBe(false);
    expect(s.locked(A2_SHUTTER_DOOR)).toBe(true);
    s.hold(A2_SHUTTER_HOLD, 1, true);
    s.update(1 / 60);
    expect(s.locked(A2_SHUTTER_DOOR), 'held after the retry').toBe(false);
  });

  it('after the pass the roller door is open for good: unlocked with nobody holding, through station 4 retries (timer and seen), into station 5; a bay restart shuts it again', () => {
    const s = fresh(3);
    s.hold(A2_SHUTTER_HOLD, 0, true);
    s.update(1 / 60);
    s.hold(A2_SHUTTER_HOLD, 0, false);
    s.setFlag(A2_LANE_FLAG);
    run(s, 0.2);
    expect(s.station()).toBe(4);
    expect(s.isGateOpen(A2_SHUTTER_GATE)).toBe(false);
    expect(s.isGateOpen(A2_SHUTTER_OPEN_GATE)).toBe(true);
    expect(s.locked(A2_SHUTTER_DOOR)).toBe(false);
    for (const cause of ['timer', 'seen'] as const) {
      expect(s.retryStation(cause, 4)).toBe(true);
      run(s, 0.5);
      expect(s.station(), cause).toBe(4);
      expect(s.hasShared(A2_LANE_FLAG), `${cause}: station 3 stays done`).toBe(true);
      expect(s.isGateOpen(A2_SHUTTER_OPEN_GATE), cause).toBe(true);
      expect(s.locked(A2_SHUTTER_DOOR), cause).toBe(false);
    }
    s.setFlag(A2_EAST_FLAG);
    run(s, 0.2);
    expect(s.station()).toBe(5);
    expect(s.locked(A2_SHUTTER_DOOR)).toBe(false);
    s.restart();
    run(s, 0.2);
    expect(s.station()).toBe(3);
    expect(s.isGateOpen(A2_SHUTTER_OPEN_GATE)).toBe(false);
    expect(s.locked(A2_SHUTTER_DOOR)).toBe(true);
    // starting at station 4 (the dev start, a checkpoint) finds the door latched too
    const s4 = fresh(4);
    run(s4, 0.2);
    expect(s4.locked(A2_SHUTTER_DOOR)).toBe(false);
  });

  it('the cabin back door is locked for good: locked, not breachable, and no course gate or door list names it', () => {
    const backs = b.anchors.doors.filter((d) => Math.abs(d.hinge.x - 32) < 0.2 && d.hinge.z > 1.9 && d.hinge.z < 3.3);
    expect(backs).toHaveLength(1);
    expect(backs[0]!.locked).toBe(true);
    expect(backs[0]!.breachable).toBe(false);
    for (const g of part.bay.gates) if ('doorId' in g) expect(g.doorId).not.toBe(A2_BACK_DOOR);
  });
});

/** The guards' runtime nav grid over the re-plan, with each door's closure (the `LockedDoorNav` size) held shut or open as asked. */
const lay0 = lay.playerSpawns[0]!.pos;
/** The roller door's header (bottom at the lift height, over the opening): a standing body (the grid's 1.7 m headroom) cannot pass under it, a crouched one (1.15 m) can, so the
 *  grid is built without it: it answers for the crouched players. */
const header = (p: BoxPiece): boolean => p.collide && Math.abs(p.c[0] - A2_STORES_WALL.x) < 1e-6 && Math.abs(bottom(p) - A2_SHUTTER.lift) < 1e-6 && Math.abs(p.c[2] - (A2_SHUTTER.z0 + A2_SHUTTER.z1) / 2) < 1e-6;
const nav: NavGrid = runtimeNav({ ...b, boxes: b.boxes.filter((p) => !header(p)) } as LevelBuilder, lay0, ctcourseReplan.navLayers ?? 3, lay.navSeeds ?? []);
const doorClosure = (id: number): number => {
  const d = b.anchors.doors.find((x) => x.id === id)!;
  const cx = d.hinge.x + (Math.sin(d.yaw) * d.width) / 2;
  const cz = d.hinge.z + (Math.cos(d.yaw) * d.width) / 2;
  return nav.addClosure(cx, cz, STAGE_NAV_ACROSS, (d.width + STAGE_NAV_ALONG) / 2, d.yaw, d.hinge.y);
};
const SHUTTER = doorClosure(part.doors[A2_SHUTTER_DOOR]!);
const WALKWAY = doorClosure(part.doors[A2_WALKWAY_DOOR]!);
const BACK = doorClosure(b.anchors.doors.find((d) => Math.abs(d.hinge.x - 32) < 0.2 && d.hinge.z > 1.9 && d.hinge.z < 3.3)!.id);
type P2 = [number, number];
const reach = (from: P2, to: P2, fromY = 0, toY = 0): boolean => nav.findPath(from, to, 1_000_000, fromY, toY) !== null;
const setDoors = (shutter: boolean, walkway: boolean): void => {
  nav.setClosed(SHUTTER, shutter);
  nav.setClosed(WALKWAY, walkway);
  nav.setClosed(BACK, true);
};
/** Close a rectangle (centre, half extents) on the floor for one query; returns the closure to open again. */
const wall = (cx: number, cz: number, hx: number, hz: number, y = 0): number => {
  const id = nav.addClosure(cx, cz, hx, hz, 0, y);
  nav.setClosed(id, true);
  return id;
};

const STORES: P2 = [30.5, 12.5];
const LANE_W: P2 = [40, 12.5];
const NECK: P2 = [51, 10];
const EAST_SOUTH: P2 = [65.5, 7.5];
const EAST_LANE: P2 = [65.5, 12.25];
/** The far landing is 0.75 m wide: under two agent radii (0.64), so the grid's 0.5 m cells hold it only at the walkway's end. */
const FAR: P2 = [69.25, 12.25];

describe('A2 re-plan: the closures on the nav (one way: stores bay -> shutter -> lane -> neck -> pit)', () => {
  it('the guards\' grid walks every point the route needs when the doors are open: the stores bay, the lane, the neck, both east lane mouths, the far landing', () => {
    setDoors(false, false);
    for (const p of [STORES, LANE_W, NECK, EAST_SOUTH, EAST_LANE, FAR]) expect(nav.isWalkable(nav.cellOf(p[0], p[1])), `(${p.join(', ')})`).toBe(true);
    // the roller door's header is over a standing body but not a crouched one
    expect(A2_SHUTTER.lift).toBeGreaterThanOrEqual(MOVEMENT.crouchHeight + 0.05);
    expect(own.filter(header)).toHaveLength(1);
    expect(reach(STORES, LANE_W)).toBe(true);
    expect(reach(LANE_W, NECK)).toBe(true);
    expect(reach(NECK, EAST_SOUTH)).toBe(true);
    expect(reach(NECK, EAST_LANE)).toBe(true);
    expect(reach(STORES, FAR)).toBe(true);
  });

  it("from the stores bay with every gate shut no path reaches the lane, the neck, the east end or the far landing; the cabin is shut off too (back door locked)", () => {
    setDoors(true, true);
    for (const to of [LANE_W, [34.5, 12.5] as P2, [34.5, 7.5] as P2, [40, 18] as P2, NECK, EAST_SOUTH, EAST_LANE, FAR]) expect(reach(STORES, to), `to (${to.join(', ')})`).toBe(false);
    // the cabin (its north door opens on the stores bay) reaches nothing beyond either: the back door is a wall
    expect(reach([30.5, 2.5], LANE_W)).toBe(false);
    expect(reach([30.5, 2.5], STORES)).toBe(true);
    // the stores bay is the one room west of x 33: (30.5, 17) and (30.5, 7) reach the same rooms and no more
    for (const from of [[30.5, 17] as P2, [30.5, 7] as P2]) expect(reach(from, LANE_W), `from (${from.join(', ')})`).toBe(false);
  });

  it('with the shutter open the lane opens, and from there nothing reaches the east end except through the neck (a wall across the neck shuts it)', () => {
    setDoors(false, true);
    expect(reach(STORES, LANE_W)).toBe(true);
    expect(reach(STORES, EAST_SOUTH)).toBe(true);
    expect(reach(STORES, EAST_LANE)).toBe(true);
    const across = wall(51, 10, 4.9, 10);
    expect(reach(STORES, LANE_W)).toBe(true);
    expect(reach(STORES, EAST_SOUTH)).toBe(false);
    expect(reach(STORES, EAST_LANE)).toBe(false);
    expect(reach(LANE_W, EAST_LANE)).toBe(false);
    nav.setClosed(across, false);
    expect(reach(STORES, EAST_SOUTH)).toBe(true);
  });

  it("the lane is the one way into the neck: with the lane's mouth walled nothing west of the neck reaches it (gap 1/2's mouth x 45.5-46.0, z 6.3-8.7 is shut; the north strip and the south cess are dead ends)", () => {
    setDoors(false, true);
    const west: P2[] = [[40, 7.5], [34.5, 7.5], [40, 18], [34.5, 12.5], LANE_W, [40, 2], STORES];
    for (const from of west) expect(reach(from, NECK), `from (${from.join(', ')}) open`).toBe(true);
    const mouth = wall(45.75, 12.5, 0.4, 1.5);
    for (const from of west) {
      expect(reach(from, NECK), `from (${from.join(', ')}) lane walled`).toBe(false);
      expect(reach(from, [51, 18]), `from (${from.join(', ')}) to the neck's north`).toBe(false);
      expect(reach(from, [51, 3]), `from (${from.join(', ')}) to the neck's south`).toBe(false);
    }
    nav.setClosed(mouth, false);
    // the closer is on the gap's mouth itself, to the van height
    const g = A2_GAP12_CLOSE;
    const closer = own.filter((p) => p.collide && Math.abs(p.c[0] - (g.x0 + g.x1) / 2) < 1e-6 && Math.abs(p.c[2] - (g.z0 + g.z1) / 2) < 1e-6);
    expect(closer).toHaveLength(1);
    expect(top(closer[0]!)).toBeCloseTo(g.h, 6);
    // the east gap 1/2 stays open: the shunter's round uses it
    expect(reach(NECK, EAST_SOUTH)).toBe(true);
    // the north closures reach the north wall's face at full height, both sides of the neck
    for (const [x0, x1] of A2_NORTH_CLOSE.xs) {
      const c = own.filter((p) => p.collide && Math.abs(p.c[0] - (x0 + x1) / 2) < 1e-6 && Math.abs(p.c[2] - (A2_NORTH_CLOSE.z0 + A2_NORTH_CLOSE.z1) / 2) < 1e-6);
      expect(c, `north closure x ${x0}-${x1}`).toHaveLength(1);
      expect(top(c[0]!)).toBeCloseTo(HALL_H, 6);
      expect(c[0]!.c[2] + c[0]!.s[2] / 2).toBeCloseTo(19.75, 6);
    }
  });

  it('no path crosses the pit except the walkway: with its door shut the far landing is out of reach from the near side; open, the only way over is the walkway (a wall on its deck shuts it again)', () => {
    setDoors(false, true);
    for (const from of [EAST_LANE, EAST_SOUTH, NECK, [65.5, 13.25] as P2]) expect(reach(from, FAR), `shut from (${from.join(', ')})`).toBe(false);
    setDoors(false, false);
    expect(reach(EAST_LANE, FAR)).toBe(true);
    expect(reach(NECK, FAR)).toBe(true);
    const deck = wall(67.5, 12.25, 1.4, 0.6);
    expect(reach(EAST_LANE, FAR)).toBe(false);
    expect(reach(EAST_SOUTH, FAR)).toBe(false);
    nav.setClosed(deck, false);
    expect(reach(EAST_LANE, FAR)).toBe(true);
  });

  it('the pit floor (a fall) reaches the near side by the step irons only and never the far landing', () => {
    setDoors(false, true);
    const floor = (z: number): P2 => [67.5, z];
    const y = -A2_PIT.depth;
    expect(nav.isWalkable(nav.cellOf(67.5, 5, y))).toBe(true);
    expect(reach(floor(5), EAST_SOUTH, y, 0)).toBe(true);
    expect(reach(floor(5), FAR, y, 0)).toBe(false);
    expect(reach(floor(16), FAR, y, 0)).toBe(false);
    // the irons: one each side of the walkway, on the near face, base on the pit floor
    const irons = b.anchors.ladders.filter((l) => Math.abs(l.base.x - A2_STEP_IRONS_X) < 1e-6);
    expect(irons.map((l) => l.base.z).sort((p, q) => p - q)).toEqual([...A2_STEP_IRONS_Z]);
    for (const l of irons) {
      expect(l.base.y).toBeCloseTo(-A2_PIT.depth, 9);
      expect(l.top.y).toBeCloseTo(0, 9);
      expect(l.top.x).toBeLessThan(A2_PIT.x0);
      expect(Math.sin(l.facing)).toBeCloseTo(-1, 6);
    }
    expect(b.anchors.ladders.filter((l) => l.base.x > A2_PIT.x0 && l.base.x < A2_PIT.x1 + 1.0 && l.base.z > A2_PIT.z0 && l.base.z < A2_PIT.z1 && Math.abs(l.base.x - A2_STEP_IRONS_X) > 1e-6)).toEqual([]);
  });
});

describe('A2 re-plan: the pit (SA9: x 66.0-69.0, depth 1.6 m)', () => {
  const x0 = A2_PIT.x0;
  const x1 = A2_PIT.x1;
  const floorY = -A2_PIT.depth;

  it('the hole is the one the facility cuts: FLOOR_HOLES [[66, 0.25, 69, 19.75]] is in the re-plan table; no slab piece covers it; a pit floor and liners close it below', () => {
    expect(FLOOR_HOLES).toEqual([[66.0, 0.25, 69.0, 19.75]]);
    expect(REPLAN_FLOOR_HOLES).toContainEqual([66.0, 0.25, 69.0, 19.75]);
    expect(A2_PIT.depth).toBe(1.6);
    // no collider with its top at or over the floor line over the hole's middle (walkway aside)
    const over = solid.filter((p) => top(p) > floorY + 0.05 && p.c[0] - p.s[0] / 2 < 67.4 && p.c[0] + p.s[0] / 2 > 67.6 && p.c[2] - p.s[2] / 2 < 5 && p.c[2] + p.s[2] / 2 > 5);
    expect(over).toEqual([]);
    const floor = solid.filter((p) => Math.abs(top(p) - floorY) < 1e-6 && p.c[0] - p.s[0] / 2 < x0 && p.c[0] + p.s[0] / 2 > x1);
    expect(floor).toHaveLength(1);
    expect(floor[0]!.c[2] - floor[0]!.s[2] / 2).toBeLessThan(A2_PIT.z0);
    expect(floor[0]!.c[2] + floor[0]!.s[2] / 2).toBeGreaterThan(A2_PIT.z1);
    // wall to wall: the liners stand on all four sides, down to the floor, and the north and south ones reach the hole's z ends (no walk-round)
    const liners = solid.filter((p) => bottom(p) < floorY + 1e-6 && top(p) < 1e-6 && top(p) > -1e-6);
    expect(liners.length).toBeGreaterThanOrEqual(4);
    expect(Math.min(...liners.map((p) => p.c[2] - p.s[2] / 2))).toBeLessThanOrEqual(A2_PIT.z0);
    expect(Math.max(...liners.map((p) => p.c[2] + p.s[2] / 2))).toBeGreaterThanOrEqual(A2_PIT.z1);
    // the shell's walls stand on z 0.25 and z 19.75's far side: the pit runs to them
    expect(A2_PIT.z0).toBeCloseTo(0.25, 9);
    expect(A2_PIT.z1).toBeCloseTo(19.75, 9);
  });

  it('far landing 0.75 m (x 69.0-69.75) in front of the L2 door; the pit is 3.0 m wide', () => {
    expect(x1 - x0).toBeCloseTo(3.0, 9);
    expect(69.75 - x1).toBeCloseTo(0.75, 9);
    expect(A2_ACROSS_ZONE[0]).toBe(x1);
    expect(A2_ACROSS_ZONE[2]).toBe(69.75);
  });

  it('(marlow-play B3) the strip from the walkway to the L2 door between the barrier and the L2 wall is at least a body wide (2 x (radius + keepDistance 0.04)) at every z', () => {
    const need = 2 * (MOVEMENT.radius + 0.04);
    expect(A2_L2_FACE_X - A2_PIT_BARRIER.x1).toBeGreaterThanOrEqual(need);
    // the solids in a body's band (0.15-1.7 m) on the landing, walking from the walkway (z 12.0) to the L2 door's middle (z 10.0)
    const mid = (A2_PIT_BARRIER.x1 + A2_L2_FACE_X) / 2;
    const band = solid.filter((p) => bottom(p) < 1.7 && top(p) > 0.15);
    for (let z = 10.0; z <= 12.0 + 1e-9; z += 0.05) {
      const at = band.filter((p) => Math.abs(z - p.c[2]) < p.s[2] / 2);
      const west = Math.max(...at.map((p) => p.c[0] + p.s[0] / 2).filter((e) => e <= mid), -Infinity);
      const east = Math.min(...at.map((p) => p.c[0] - p.s[0] / 2).filter((e) => e >= mid), Infinity);
      expect(at.some((p) => Math.abs(mid - p.c[0]) < p.s[0] / 2), `a solid across the strip at z ${z.toFixed(2)}`).toBe(false);
      expect(east - west, `strip width at z ${z.toFixed(2)}`).toBeGreaterThanOrEqual(need);
    }
  });

  it('nothing is a ledge or a lip reachable from the pit floor: no generated ledge and no co-op lip in or on the pit, every liner, the floor, the barrier and the walkway noLedge', () => {
    const anchors = generateLedges(b.boxes, b.anchors);
    const near = anchors.ledges.filter((l) => (l.a.x + l.b.x) / 2 > x0 - 0.5 && (l.a.x + l.b.x) / 2 < 69.8 && l.top > floorY + 0.1 && l.top < 3.5 && (l.a.z + l.b.z) / 2 > 0 && (l.a.z + l.b.z) / 2 < 20);
    // the vans' ends at the near edge are noLedge too: whatever ledges stand there are on the vans' roofs, 3.4 m up, never the pit's
    expect(near.filter((l) => l.top < 3.3)).toEqual([]);
    expect(built.parts.flatMap((x) => x.lips).filter((l) => l.a.x > x0 - 1 && l.a.x < 70 && l.a.z > 0 && l.a.z < 20)).toEqual([]);
    const pieces = mine.filter((p) => p.collide && p.c[0] > x0 - 0.3 && p.c[0] < 69.3 && p.c[2] > 0 && p.c[2] < 20 && bottom(p) < 0.05 && top(p) > floorY - 0.4);
    expect(pieces.length).toBeGreaterThan(6);
    for (const p of pieces) expect(p.noLedge, `piece at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBe(true);
  });

  it('the far wall cannot be mantled from the pit floor at any z: the barrier on the landing (1.1 m) takes the far face to 2.7 m over the floor, over the 1.8 m mantle; at the walkway the way is a closed hoarding box', () => {
    const rise = A2_PIT_BARRIER.h - floorY;
    expect(rise).toBeGreaterThan(MANTLE);
    const w = A2_WALKWAY;
    const faceX = (A2_PIT_BARRIER.x0 + A2_PIT_BARRIER.x1) / 2;
    for (let z = A2_PIT.z0 + 0.05; z < A2_PIT.z1; z += 0.1) {
      const covered = solid.filter((p) => Math.abs(p.c[0] - faceX) < p.s[0] / 2 + 1e-9 && Math.abs(p.c[2] - z) < p.s[2] / 2 && bottom(p) < 0.05);
      const heights = covered.map(top);
      const reach = Math.max(...heights, -Infinity);
      const underWalkway = z > w.z0 - w.board && z < w.z1 + w.board;
      if (underWalkway) continue;
      expect(reach - floorY, `far face over the floor at z ${z.toFixed(2)}`).toBeGreaterThan(MANTLE);
    }
    // under the walkway deck the floor is a closed box: boards from the floor to 2.2 m on both sides, the deck over, the liners at the ends
    const boards = own.filter((p) => p.collide && Math.abs(bottom(p) - floorY) < 1e-6 && top(p) >= w.h - 1e-6 && Math.abs(p.s[0] - (x1 - x0)) < 1e-6);
    expect(boards).toHaveLength(2);
    const deck = own.filter((p) => p.collide && Math.abs(top(p)) < 1e-6 && Math.abs(p.s[0] - (x1 - x0)) < 1e-6 && Math.abs(p.s[2] - (w.z1 - w.z0)) < 1e-6);
    expect(deck).toHaveLength(1);
    // the barrier is wall to wall but for the walkway's width plus its two boards
    const bar = own.filter((p) => p.collide && Math.abs(p.c[0] - (A2_PIT_BARRIER.x0 + A2_PIT_BARRIER.x1) / 2) < 1e-6 && Math.abs(top(p) - A2_PIT_BARRIER.h) < 1e-6);
    expect(bar).toHaveLength(2);
    const sorted = [...bar].sort((p, q) => p.c[2] - q.c[2]);
    expect(sorted[0]!.c[2] - sorted[0]!.s[2] / 2).toBeCloseTo(A2_PIT.z0, 9);
    expect(sorted[0]!.c[2] + sorted[0]!.s[2] / 2).toBeCloseTo(w.z0 - w.board, 9);
    expect(sorted[1]!.c[2] - sorted[1]!.s[2] / 2).toBeCloseTo(w.z1 + w.board, 9);
    expect(sorted[1]!.c[2] + sorted[1]!.s[2] / 2).toBeCloseTo(A2_PIT.z1, 9);
  });

  it('the pit cannot be hopped: a top-gear running jump from the near edge lands short of the far landing, and clears no more than the barrier at the far face', () => {
    // the take-off: the body's centre up to a radius past the edge; the feet are over the floor line again after `t0`, over the barrier's foot when the centre is a radius short of the far face
    const t0 = lastTimeAtOrOver(0, 0)!;
    const range = SOLO_TOP_SPEED * t0 + MOVEMENT.radius;
    expect(range, 'a running jump\'s plan range over level ground').toBeLessThan(x1 - x0);
    const tFace = (x1 - x0 - 2 * MOVEMENT.radius) / SOLO_TOP_SPEED;
    // feet height when the centre touches the barrier: the apex line (up to the last time at or over the barrier top it is over it)
    const tTop = lastTimeAtOrOver(0, A2_PIT_BARRIER.h);
    expect(tTop === null || tTop < tFace).toBe(true);
  });
});

describe('A2 re-plan: the walkway stand-in', () => {
  const w = A2_WALKWAY;
  it('a 1.2 m clear walkway at y 0 over the pit in the lane gap 2/3 (z 11.4-12.6; road 2\'s east van ends on the pit\'s edge at z 8.7-11.3, so the drawn z 9.4-10.6 has no near-side floor), door A2-walkway on the near end', () => {
    expect(w.z1 - w.z0).toBeCloseTo(1.2, 9);
    expect(w.z0).toBeGreaterThan(A2_ROADS[1] + 1.3);
    expect(w.z1).toBeLessThan(A2_ROADS[2] - 1.3);
    const d = b.anchors.doors.find((x) => x.id === part.doors[A2_WALKWAY_DOOR])!;
    expect(d.width).toBeCloseTo(1.2, 9);
    expect(d.hinge.x).toBeCloseTo(A2_PIT.x0, 9);
    expect(d.hinge.y).toBe(0);
    expect(d.hinge.z).toBeCloseTo(w.z0, 9);
    expect(d.breachable).toBe(false);
    // the board stack (dressing, KS5's later): visual only, on the near side at the east end of the lane gap
    const stack = own.filter((p) => !p.collide && p.c[0] > 60.5 && p.c[0] < 65 && p.c[1] < 0.2 && p.s[0] > 3);
    expect(stack).toHaveLength(8);
    // the walkway lands on the far landing, the zone a2-across is the landing in front of the L2 door
    expect(blockedAt(69.4, 12, 0, 0.3)).toEqual([]);
    expect(blockedAt(65.5, 12, 0, 0.3)).toEqual([]);
  });
});

describe('A2 re-plan: cabinet 2, the coat lamp, map data', () => {
  it("cabinet 2's spot (63.5, 11.6): on the pit's near side in the lane gap 2/3, on the van's north face, reachable, clear of station 5's marks (65.5, 12.0 / 13.0) by more than their 0.6 m body clear, inside the shunter's lure range", () => {
    const d = part.devices[A2_ISO_2]!;
    expect([d.x, d.z]).toEqual([63.5, 11.6]);
    expect(d.x).toBeLessThan(A2_PIT.x0);
    // pressed from its front (+z): standing room 0.7 m out, and the device sits on the body's face
    expect(blockedAt(d.x, d.z + 0.7, 0, 0.3)).toEqual([]);
    for (const m of STATIONS_A2[2]!.marks) expect(hyp2(m.x - d.x, m.z - d.z)).toBeGreaterThan(0.6);
    // the body is a 1.6 m noLedge solid on the van's face, none on the east wall any more
    const body = own.filter((p) => p.collide && Math.abs(p.c[0] - d.x) < 1e-6 && Math.abs(top(p) - 1.6) < 1e-6);
    expect(body).toHaveLength(1);
    expect(solid.filter((p) => p.c[0] > 69.4 && p.c[0] < 69.8 && Math.abs(p.c[2] - 13.4) < 0.5 && top(p) > 1)).toEqual([]);
    expect(A2_CAB2_REPLAN).toEqual({ x: 63.5, z: 11.6 });
    // the lure: the circuit table keeps the shunter's post; cabinet 2 reaches every point of his round
    for (const [x, z] of A2_SHUNTER_ROUTE_REPLAN) expect(hyp2(x - d.x, z - d.z)).toBeLessThan(25);
  });

  it("(J14 a2-rows) the re-plan table's cabinet 2 and staging switch are where the part builds them; the built rows keep the built yard's spots", () => {
    const iso2 = MARLOW_CIRCUITS_REPLAN.find((c) => c.group === 21)!.switches.find((s) => s.id === A2_ISO_2)!;
    const dev = part.devices[A2_ISO_2]!;
    expect(Math.abs(iso2.x - dev.x)).toBeLessThan(1e-6);
    expect(Math.abs(iso2.z - dev.z)).toBeLessThan(1e-6);
    const staging = MARLOW_CIRCUITS_REPLAN.find((c) => c.group === 23)!.switches.find((s) => s.id === 'a2-sw-staging')!;
    const swDef = part.switches.find((s) => s.id === 'a2-sw-staging')!;
    expect(Math.abs(staging.x - swDef.pos.x)).toBeLessThan(1e-6);
    expect(Math.abs(staging.z - swDef.pos.z)).toBeLessThan(1e-6);
    // the built table is the built yard's
    const builtIso2 = MARLOW_CIRCUITS.find((c) => c.group === 21)!.switches.find((s) => s.id === A2_ISO_2)!;
    expect([builtIso2.x, builtIso2.z]).toEqual([69.4, 14.2]);
    const builtStaging = MARLOW_CIRCUITS.find((c) => c.group === 23)!.switches.find((s) => s.id === 'a2-sw-staging')!;
    expect([builtStaging.x, builtStaging.z, builtStaging.y]).toEqual([66.5, 18.5, 4.4]);
    // no A2 re-plan row points at the built east door or the removed stair head (A4, A6 and A8 have stair heads of their own)
    for (const c of MARLOW_CIRCUITS_REPLAN.filter((r) => r.room === 'A2')) for (const s of c.switches) expect(s.by, s.id).not.toMatch(/east door|stair head/);
  });

  it('the coat-corner lamp is live on circuit 22: two lamps on 22 in the set (the cabin panel and this one), on and not shot out, at the coat hooks, in the re-plan table; the coat pocket is gone', () => {
    const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && inBox(box, l.x, l.z));
    const on22 = lamps.filter((l) => l.group === 22);
    expect(on22).toHaveLength(2);
    for (const l of on22) {
      expect(l.on).toBe(true);
      expect(l.destroyed).toBe(false);
      expect(l.electric).toBe(true);
      expect(l.destructible).toBe(true);
    }
    const coat = on22.find((l) => Math.abs(l.x - A2_COAT_LAMP.x) < 1e-6)!;
    expect([coat.y, coat.z]).toEqual([A2_COAT_LAMP.y, A2_COAT_LAMP.z]);
    expect(lamps).toHaveLength(17);
    expect(MARLOW_CIRCUITS_REPLAN.find((c) => c.group === 22)!.lamps).toBe(2);
    expect(MARLOW_POCKETS_REPLAN.map((p) => p.id)).not.toContain('a2-coat');
    expect(course.groups!['a2-cabin']).toBe(22);
    expect(marlowCourseGroups(MARLOW_CIRCUITS_REPLAN)['a2-cabin']).toBe(22);
    // its light spots are on the part: lit with the cabin on, dark-cut with 22 off
    expect(part.lightSpots.find((s) => s.name === 'A2 coat corner lamp')).toBeDefined();
    expect(part.lightSpots.find((s) => s.name === 'A2 coat corner cut')!.off).toEqual([22]);
    expect(part.lightSpots.find((s) => s.name === 'A2 coat corner')).toBeUndefined();
    // the hooks the lamp lights are the built coat rail (x 28.4-29.55, north wall z 4.9)
    expect(coat.x).toBeGreaterThan(28.4);
    expect(coat.x).toBeLessThan(29.6);
  });

  it("the stores bay strip (lead answer 4) is the shed general's seventh lamp on circuit 20, over the bay the x 33 wall cuts off; the bay reads 0.30 or more in the tuned light file", () => {
    const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && inBox(box, l.x, l.z));
    const on20 = lamps.filter((l) => l.group === 20);
    expect(on20).toHaveLength(7);
    expect(MARLOW_CIRCUITS_REPLAN.find((c) => c.group === 20)!.lamps).toBe(7);
    const bay = on20.filter((l) => l.x < A2_STORES_WALL.x);
    expect(bay).toHaveLength(1);
    const l = bay[0]!;
    expect([l.x, l.y, l.z]).toEqual([A2_STORES_LAMP.x, A2_STORES_LAMP.y, A2_STORES_LAMP.z]);
    expect(l.on && !l.destroyed && l.electric && l.destructible).toBe(true);
    expect(l.z).toBeGreaterThan(A2_STORES_WALL.z0);
    // the shed's west door switch (a2-sw-shed) darkens it with the rest of the shed
    expect(part.switches.find((x) => x.id === 'a2-sw-shed')!.group).toBe(20);
    const tuned = (JSON.parse(readFileSync('tests/ctcourse/replan/a2CarriageShed.light.json', 'utf8')) as { levels: Record<string, number> }).levels;
    expect(tuned['A2 stores bay']).toBeGreaterThanOrEqual(0.3);
  });

  it("station 3's marks stay out of the shunter's sight: from every point of his round (eye 1.55 m) a visible solid blocks each mark at 0.5, 1.05 and 1.7 m, the roller door open", () => {
    /** Does the segment p to q cross the box (slab method, the box shrunk by 1 mm: the built test's helper)? */
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
    const blockers = solid.filter((p) => p.visible !== false);
    const route = A2_SHUNTER_ROUTE_REPLAN;
    const seen: string[] = [];
    for (let i = 0; i < route.length; i++) {
      const [x0, z0] = route[i]!;
      const [x1, z1] = route[(i + 1) % route.length]!;
      const n = Math.max(1, Math.ceil(hyp2(x1 - x0, z1 - z0) / 0.5));
      for (let k = 0; k < n; k++) {
        const eye = [x0 + ((x1 - x0) * k) / n, 1.55, z0 + ((z1 - z0) * k) / n];
        for (const m of STATIONS_A2[0]!.marks) {
          for (const y of [0.5, 1.05, 1.7]) if (!blockers.some((p) => crosses(eye, [m.x, y, m.z], p))) seen.push(`(${eye[0]!.toFixed(1)}, ${eye[2]!.toFixed(1)}) -> (${m.x}, ${y}, ${m.z})`);
        }
      }
    }
    expect(seen).toEqual([]);
  });

  it('map data: the deck debug point, spot and nav seed are gone; the pit floor and the far landing are nav seeds; the stores bay is a tight camera space; the pit has a shot vantage', () => {
    expect(part.debugPoints.map((d) => d.id)).not.toContain('A2-mark');
    expect(part.debugPoints.map((d) => d.id)).toEqual(expect.arrayContaining(['A2-entry', 'A2-east', 'A2-across']));
    for (const d of part.debugPoints) expect(inBox(box, d.pos.x, d.pos.z), d.id).toBe(true);
    for (const d of part.debugPoints.filter((x) => x.id !== 'A2-cabin')) expect(blockedAt(d.pos.x, d.pos.z, d.pos.y, 0.3), d.id).toEqual([]);
    expect(part.navSeeds.every((s) => s.y < 1)).toBe(true);
    expect(part.navSeeds.some((s) => s.y < -1 && s.x > A2_PIT.x0 && s.x < A2_PIT.x1)).toBe(true);
    expect(part.navSeeds.some((s) => s.x > A2_PIT.x1)).toBe(true);
    expect(part.navSeeds.filter((s) => s.y > -0.5 && s.x > A2_PIT.x0 && s.x < A2_PIT.x1)).toEqual([]);
    expect(part.camSpaces.some((c) => c.box[1] === 17.5)).toBe(false);
    expect(part.camSpaces.some((c) => c.size === 'tight' && c.box[0] === 28 && c.box[2] === 33)).toBe(true);
    expect(part.shotVantages.map((v) => v.name)).toEqual(['a2-vantage', 'a2-pit']);
    expect(part.lightSpots.map((s) => s.name)).not.toContain('A2 deck');
    expect(part.lightSpots.map((s) => s.name)).toContain('A2 cabinet 2');
  });
});

describe('A2 re-plan: the tuned light file', () => {
  it('tests/ctcourse/replan/a2CarriageShed.light.json is present and holds a level for every light spot of the part (the light test runs it green)', () => {
    const tuned = (JSON.parse(readFileSync('tests/ctcourse/replan/a2CarriageShed.light.json', 'utf8')) as { levels: Record<string, number> }).levels;
    const missing = part.lightSpots.map((s) => s.name).filter((n) => !(n in tuned));
    expect(missing).toEqual([]);
    for (const n of Object.keys(tuned)) expect(part.lightSpots.some((s) => s.name === n), `stale level ${n}`).toBe(true);
  });
});

describe('station 5 kit spot (marlow-kit-wire)', () => {
  const saved = flags.kitMoves;
  afterEach(() => {
    flags.kitMoves = saved;
  });
  const objText = (d: typeof def, id: string): string => d.objectives!.find((o) => o.id === id)!.text;

  it('one plankBridge spot, a2-plank, on the board stack (from A2_BOARD_STACK), placed with the id off', () => {
    expect(flags.kitMoves.has('plankBridge')).toBe(false);
    const spots = kitSpotsOf(b, 'plankBridge');
    expect(spots.length).toBe(1);
    const bs = A2_BOARD_STACK;
    expect(spots[0]).toEqual({ id: 'a2-plank', kind: 'plankBridge', x: (bs.x0 + bs.x1) / 2, y: 0, z: (bs.z0 + bs.z1) / 2, yaw: Math.PI / 2, w: bs.x1 - bs.x0 });
    expect(def.bays[1]!.stations!.find((s) => s.kit === 'plankBridge')!.id).toBe('a2-plank');
  });

  it('the PLAN band: the pit gap 1.0-3.3 m, both edges level, the stack within 15 m of the near edge; the dressing boards on the stack', () => {
    const s = kitSpotsOf(b, 'plankBridge')[0]!;
    const gap = A2_PIT.x1 - A2_PIT.x0;
    expect(gap).toBeGreaterThanOrEqual(1.0);
    expect(gap).toBeLessThanOrEqual(3.3);
    expect(s.w!).toBeGreaterThanOrEqual(gap + 0.6 - 1e-9); // 0.3 m bearing each end
    expect(Math.abs(s.y - 0)).toBeLessThanOrEqual(0.3); // near edge floor 0, far landing 0 (the pass zone's floorY)
    expect(A2_PIT.x0 - s.x).toBeLessThanOrEqual(15);
    expect(A2_PIT.x0 - s.x).toBeGreaterThan(0);
    const boards = b.boxes.filter((p) => !p.collide && Math.abs(p.s[0] - (A2_BOARD_STACK.x1 - A2_BOARD_STACK.x0)) < 1e-6 && Math.abs(p.s[2] - 0.22) < 1e-6);
    expect(boards.length).toBe(8);
    for (const p of boards) {
      expect(p.c[2] - 0.11).toBeGreaterThanOrEqual(A2_BOARD_STACK.z0 - 1e-6);
      expect(p.c[2] + 0.11).toBeLessThanOrEqual(A2_BOARD_STACK.z1 + 1e-6);
      expect(p.c[1] + p.s[1] / 2).toBeLessThanOrEqual(A2_BOARD_STACK.top + 1e-6);
    }
  });

  it('kit on: station 5 names the board; off: the walkway line', () => {
    flags.kitMoves = new Set(['plankBridge']);
    const on = buildCtcourse(new LevelBuilder(), { replan: true }).layout.course!.def;
    expect(objText(on, 'a2-plank')).toBe(A2_PLANK_KIT_TEXT);
    expect(A2_PLANK_KIT_TEXT.length).toBeLessThanOrEqual(COURSE_TEXT_MAX);
    flags.kitMoves = new Set();
    const off = buildCtcourse(new LevelBuilder(), { replan: true }).layout.course!.def;
    expect(objText(off, 'a2-plank')).toBe('Cross the pit by the east vans on the hoarded walkway to the L2 door.');
  });

  it.todo('Q1: a laid board has nowhere to bear on the far landing (the barrier runs wall to wall but for the walkway)');
});
