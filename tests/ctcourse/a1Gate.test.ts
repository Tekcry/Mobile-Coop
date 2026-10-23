/**
 * A1 the Gate (marlow-final slice 1; set doc `docs/marlow-final/sets/a1Gate.md`): the set's own cases. The co-op lip is in
 * the band and no player alone reaches it (the cabin and the lounge are `noLedge`; nothing else stands within the 4.7 m
 * keep-clear), the leg-up from the striped mark takes the near lip (the relay works), the wicket bolts open from the yard
 * side only, the circuits and lamps are the plan's, the steps validate and read per player, the role claim is the mark,
 * the checker is armed and passive and can be grabbed from behind. The map-wide frames (`tests/ctcourse.test.ts`,
 * `tests/ctcourseLight.test.ts`) run the contract, the register and the light bands over this part too. The last block is the
 * dressing (slice 1 step 5): the greybox pinned, hand-built skins out of the light shapes, the props' budgets, boxes and keep-clear
 * rules, every kit glow on its circuit.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateLedges, findJumpTarget, type Ledge } from '../../src/world/anchors';
import { LevelBuilder, type BoxPiece } from '../../src/world/levelBuilder';
import { MOVEMENT, TEAM } from '../../src/config/movement';
import { COURSE_TEXT_MAX } from '../../src/config/course';
import { GUARD_INFO_LINE_MAX } from '../../src/ai/guardInfo';
import { layoutKnownIds, validateCourse } from '../../src/game/course/courseDef';
import { CourseState, REFUSE_BOLT } from '../../src/game/course/courseState';
import { hyp2 } from '../../src/core/mathx';
import { buildCtcourse, COOP_LIPS, LIGHT_SPOTS } from '../../src/world/maps/ctcourse';
import { boostWall, COOP_BAND, GREY_KEEP_CLEAR, WALL_STANDOFF, type CoopLip } from '../../src/world/maps/ctcourseGreybox';
import { A1_CHECKER, A1_CHECKER_INFO, A1_LOUNGE_DOOR, A1_MARK, A1_MARK_ZONE, A1_WALL, A1_WICKET_DOOR, A1_WICKET_GATE, A1_YARD_FLAG, A1_YARD_ZONE } from '../../src/world/maps/ctcourseSets/a1Gate';
import { checkSetPart, inBox, LOUNGE_BOX, OBJECTIVE_ID_MAX, SET_BOX, setGroups, SPAWNS } from '../../src/world/maps/ctcourseSets/types';
import { circuitOf, marlowCourseGroups } from '../../src/world/lighting/marlowCircuits';
import { MARLOW_LEVEL } from '../../src/world/lighting/levels';
import { kitTriangles } from '../../src/world/kit/facilityKit';
import { FacilityProps, propGlows, PROP_OWN_SUPPLY, propCollisionBox, propDraws, propToWorld, propTriangles, PROP_FOOTPRINT, PROP_HUNG, PROP_SET_BUDGET, type PropPlacement, type PropReport } from '../../src/world/props/facilityProps';
import { CANON_MIN_THICK } from '../../src/voxel/lightShapes';
import { soloJumpThreats } from '../helpers/soloJumpReach';

const b = new LevelBuilder();
const built = buildCtcourse(b);
const part = built.parts[0]!;
const lay = built.layout;
const course = lay.course!;
const def = course.def;
const range = built.ranges.a1Gate;
const mine = b.boxes.slice(range.boxes[0], range.boxes[1]);
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && inBox(SET_BOX.a1Gate[0]!, l.x, l.z));
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const NEAR = part.lips.find((l) => l.id === 'a1-wall-near')!;
const FAR = part.lips.find((l) => l.id === 'a1-wall-far')!;
/** The solid boxes (a body's height band, centre line to the wall: the plan distance from a point to each box). */
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
/** A fresh course at set 1 with the two players at the given feet. */
function runAt(a: [number, number], c: [number, number]): CourseState {
  const s = new CourseState(def, course.consoles);
  s.startAt(1);
  s.setPlayer(0, a[0], 0, a[1], false);
  s.setPlayer(1, c[0], 0, c[1], false);
  s.update(1 / 60);
  return s;
}
const overStep = def.objectives!.find((o) => o.id === 'a1-over')!;

describe('A1 the Gate: the part', () => {
  it('is built (not the stub) and passes the contract rules', () => {
    expect(part.id).toBe('a1Gate');
    expect(part.stub).toBeUndefined();
    expect(checkSetPart(part)).toEqual([]);
  });

  it('every register row is an A1 row; the lights, solids, doors and anchors it counts are the builder\'s', () => {
    expect(part.register.every((r) => r.id.startsWith('A1-'))).toBe(true);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A1-1', 'A1-2', 'A1-3', 'A1-4', 'A1-5', 'A1-6', 'A1-7', 'A1-8', 'A1-9', 'A1-10']));
    // 9 lamps (LIGHTING-PLAN 3: lounge 4, apron 1, yard 3, cabin 1), the wicket and the two sliding / swing doors
    expect(part.register.reduce((n, r) => n + (r.lights ?? 0), 0)).toBe(9);
    expect(part.register.reduce((n, r) => n + (r.doors ?? 0), 0)).toBe(3);
  });

  it('everything built lies inside the set box and under the hall roof (the map-wide frame holds it too)', () => {
    const [x0, z0, x1, z1] = SET_BOX.a1Gate[0]!;
    for (const p of mine) {
      expect(p.c[0] - p.s[0] / 2, 'west').toBeGreaterThanOrEqual(x0 - 0.3);
      expect(p.c[0] + p.s[0] / 2, 'east').toBeLessThanOrEqual(x1 + 0.3);
      expect(p.c[2] - p.s[2] / 2, 'south').toBeGreaterThanOrEqual(z0 - 0.3);
      expect(p.c[2] + p.s[2] / 2, 'north').toBeLessThanOrEqual(z1 + 0.3);
      expect(top(p)).toBeLessThanOrEqual(10 + 1e-6);
    }
  });
});

describe('A1 the Gate: the co-op lip (leg-up and relay)', () => {
  it('both planned lips are 4.4 m over the floor, in COOP_BAND, on the map\'s COOP_LIPS, one per face', () => {
    expect(part.lips.map((l) => l.id).sort()).toEqual(['a1-wall-far', 'a1-wall-near']);
    for (const l of part.lips) {
      expect(l.y - l.floor).toBeCloseTo(A1_WALL.lip, 9);
      expect(l.y - l.floor).toBeGreaterThanOrEqual(COOP_BAND.min);
      expect(l.y - l.floor).toBeLessThanOrEqual(COOP_BAND.max);
      expect(COOP_LIPS).toContainEqual(l);
    }
    expect([NEAR.n.x, Math.abs(NEAR.n.z)]).toEqual([-1, 0]);
    expect([FAR.n.x, Math.abs(FAR.n.z)]).toEqual([1, 0]);
    // the relay hangs the booster at the lip: within the relay's reach
    expect(A1_WALL.lip).toBeLessThanOrEqual(TEAM.relayMax);
    // the wall top is deep enough to stand on (the relay climbs onto it)
    expect(A1_WALL.thick).toBeGreaterThanOrEqual(0.38);
  });

  it('no solo jump reaches either lip: soloJumpThreats is empty over every solid in the map (the cabin and the lounge included)', () => {
    expect(soloJumpThreats(solid, NEAR)).toEqual([]);
    expect(soloJumpThreats(solid, FAR)).toEqual([]);
  });

  it('the check has teeth: a 1.8 m crate on the apron within the running jump threatens the near lip, one at GREY_KEEP_CLEAR does not', () => {
    const crate = (gap: number): BoxPiece => ({ c: [A1_WALL.near - gap - 0.5, 0.9, 5], s: [1, 1.8, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true });
    expect(soloJumpThreats([...solid, crate(2.5)], NEAR).length).toBeGreaterThan(0);
    expect(soloJumpThreats([...solid, crate(GREY_KEEP_CLEAR)], NEAR)).toEqual([]);
  });

  it('every block 1.9 m or taller in A1 that is not the wall is noLedge; every cabin and lounge piece too', () => {
    for (const p of mine) {
      const wall = Math.abs(p.c[0] - A1_WALL.x) < 0.01 && Math.abs(p.s[0] - A1_WALL.thick) < 1e-6;
      if (top(p) >= 1.9 && !wall) expect(p.noLedge, `box at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBe(true);
      const cabin = p.c[0] > 6.8 && p.c[0] < 10.2 && p.c[2] > 14.8 && p.c[2] < 18.2;
      const lounge = p.c[0] < 6.3 && p.c[2] > 7.8 && p.c[2] < 14.2;
      if (cabin || lounge) expect(p.noLedge, `box at (${p.c.join(', ')})`).toBe(true);
    }
    // the wall itself is the only thing offering a lip: its three pieces (south, north, wicket head), none noLedge
    const wallPieces = mine.filter((p) => p.collide && Math.abs(p.c[0] - A1_WALL.x) < 0.01 && Math.abs(p.s[0] - A1_WALL.thick) < 1e-6);
    expect(wallPieces).toHaveLength(3);
    for (const p of wallPieces) expect(p.noLedge).toBeUndefined();
  });

  it('the lips the game generates in A1 over a body\'s reach are the two planned ones: nothing runs past the wall\'s ends', () => {
    const anchors = generateLedges(b.boxes);
    const inA1 = anchors.ledges.filter((l) => inBox(SET_BOX.a1Gate[0]!, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3));
    const bad: string[] = [];
    for (const l of inA1) {
      if (l.drop < 1.9) continue;
      const planned = part.lips.some((p) => Math.abs(l.top - p.y) < 1e-3 && l.nx * p.n.x + l.nz * p.n.z > 0.99 && [l.a, l.b].every((q) => Math.abs(q.x - p.a.x) < 0.05 && q.z >= p.a.z - 0.3 && q.z <= p.b.z + 0.3));
      if (!planned) bad.push(`(${l.a.x.toFixed(2)}, ${l.a.z.toFixed(2)}) -> (${l.b.x.toFixed(2)}, ${l.b.z.toFixed(2)}) top ${l.top} drop ${l.drop}`);
    }
    expect(bad).toEqual([]);
    // (the wall's ends meet the facility's south wall and the gallery's glazed wall, both noLedge: no other lip, top or sill, exists there)
    const ends = anchors.ledges.filter((l) => l.top > 1.9 && [l.a, l.b].some((q) => Math.abs(q.x - A1_WALL.x) < 1 && (q.z < 2.1 || q.z > 19.9)));
    for (const l of ends) expect(l.top, `lip at (${l.a.x}, ${l.a.z})`).toBeCloseTo(A1_WALL.lip, 6);
  });

  it('the leg-up from the striped mark (0.9 m off the apron face) takes the near lip: a booster hangs there, so the relay works', () => {
    const w = boostWall({ id: 'a1-wall', at: { x: A1_WALL.x, z: A1_WALL.z }, facing: '+x', span: A1_WALL.span, lip: A1_WALL.lip, thick: A1_WALL.thick, wicket: 0, wicketW: 1.2, spot: -5 });
    const spot = w.spots.find((s) => s.kind === 'legUp')!;
    expect(spot.x).toBeCloseTo(A1_MARK.x, 9);
    expect(spot.z).toBeCloseTo(A1_MARK.z, 9);
    expect(A1_WALL.near - A1_MARK.x).toBeCloseTo(WALL_STANDOFF, 9);
    const anchors = generateLedges(b.boxes);
    const t = findJumpTarget(anchors, { x: A1_MARK.x, y: TEAM.boostMax - 1.15, z: A1_MARK.z }, -1, 1, 0, 1, 2.2, 0.2);
    expect(t).not.toBeNull();
    const l = t!.anchor as Ledge;
    expect(l.kind).toBe('ledge');
    expect(l.canClimbUp).toBe(true);
    expect(l.nx).toBeLessThan(-0.99);
    expect(l.top).toBeCloseTo(A1_WALL.lip, 6);
    // room beside the booster (TEAM.roomSide along the wall: the apron is open both sides of the mark) and over it
    for (const dz of [-TEAM.roomSide, TEAM.roomSide]) expect(blockedAt(A1_MARK.x, A1_MARK.z + dz, MOVEMENT.radius)).toEqual([]);
    expect(solid.filter((p) => top(p) > 0.15 && p.c[1] - p.s[1] / 2 < TEAM.roomUp && Math.abs(p.c[0] - A1_MARK.x) < p.s[0] / 2 && Math.abs(p.c[2] - A1_MARK.z) < p.s[2] / 2)).toEqual([]);
  });

  it('the mark is on the map: a paint square (no collision) and the role claim\'s zone round it', () => {
    const paint = mine.find((p) => !p.collide && Math.abs(p.c[0] - A1_MARK.x) < 0.01 && Math.abs(p.c[2] - A1_MARK.z) < 0.01);
    expect(paint).toBeDefined();
    expect(A1_MARK_ZONE).toEqual([10.3, 5.5, 11.3, 6.5]);
    expect(inBox(A1_MARK_ZONE, A1_MARK.x, A1_MARK.z)).toBe(true);
  });
});

describe('A1 the Gate: the wicket (the bolt)', () => {
  const doorAnchor = b.anchors.doors.find((d) => d.id === course.doors[A1_WICKET_DOOR]);

  it('the wicket is a 1.2 x 2.1 door in the wall, centred on z 11, locked, 8.4 m from either end; its ids are the SPEC\'s', () => {
    expect(doorAnchor).toBeDefined();
    expect(doorAnchor!.width).toBeCloseTo(1.2, 9);
    expect(doorAnchor!.height).toBeCloseTo(2.1, 9);
    expect(doorAnchor!.locked).toBe(true);
    expect(doorAnchor!.hinge.x).toBeCloseTo(A1_WALL.x, 9);
    expect(doorAnchor!.hinge.z + doorAnchor!.width / 2).toBeCloseTo(A1_WALL.z, 9);
    const gate = part.bay.gates.find((g) => g.id === A1_WICKET_GATE);
    expect(gate).toBeDefined();
    expect(gate).toMatchObject({ kind: 'bolt', doorId: A1_WICKET_DOOR, side: [1, 0], at: [12, 11] });
    expect(part.bay.gates).toHaveLength(1);
    expect(A1_WICKET_DOOR.startsWith('A1-')).toBe(true);
    expect(11 - 0.6 - 2).toBeGreaterThanOrEqual(1.5);
    expect(20 - (11 + 0.6)).toBeGreaterThanOrEqual(1.5);
  });

  it('the bolt opens only from the far (yard) side: an apron press is refused, a yard press opens it for good', () => {
    const s = runAt([11.2, 11], [12.8, 11]);
    expect(s.locked(A1_WICKET_DOOR)).toBe(true);
    expect(s.boltUsable(A1_WICKET_GATE)).toBe(true);
    // P1 on the apron side
    expect(s.press(A1_WICKET_DOOR, 0)).toBe(REFUSE_BOLT);
    expect(s.locked(A1_WICKET_DOOR)).toBe(true);
    expect(s.isStepDone('a1-over')).toBe(false);
    // P2 in the yard
    expect(s.press(A1_WICKET_DOOR, 1)).toBeNull();
    expect(s.locked(A1_WICKET_DOOR)).toBe(false);
    s.update(1 / 60);
    expect(s.isStepDone('a1-over')).toBe(true);
    expect(s.boltUsable(A1_WICKET_GATE)).toBe(false);
  });

  it('the wicket is a way back for a lone player: unbolted, it stays open for the run', () => {
    const s = runAt([13.5, 11], [3, 11]);
    expect(s.press(A1_WICKET_DOOR, 0)).toBeNull();
    s.update(1 / 60);
    s.setPlayer(0, 11.0, 0, 11, false);
    s.update(1 / 60);
    expect(s.locked(A1_WICKET_DOOR)).toBe(false);
  });
});

describe('A1 the Gate: objective steps, the claim, the radio', () => {
  const steps = def.objectives!.filter((o) => o.bay === 'A1');

  it('two steps in route order: the handshake (with per-player lines, done by the gate or both in the yard), then one closing line', () => {
    expect(steps.map((o) => o.id)).toEqual(['a1-over', 'a1-lock']);
    const over = steps[0]!;
    expect(over.a).toBeDefined();
    expect(over.b).toBeDefined();
    expect(over.done).toEqual([{ gate: A1_WICKET_GATE }, { flag: A1_YARD_FLAG }]);
    expect(steps[1]!.done).toBeUndefined();
    expect(steps.filter((o) => o.done === undefined)).toHaveLength(1);
  });

  it('every line fits 90 characters, no em or en dash; ids fit the wire; the course validates', () => {
    for (const o of steps) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(/[–—]/.test(t), t).toBe(false);
      }
      expect(o.id.length).toBeLessThanOrEqual(OBJECTIVE_ID_MAX);
    }
    for (const r of part.bay.radio) {
      expect(r.text.length, r.text).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(r.text), r.text).toBe(false);
    }
    expect(part.bay.radio.map((r) => r.at)).toEqual(['enter', 'a1-over']);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
  });

  it('the first player on the striped mark takes the A job (the booster); the other reads the B line', () => {
    // nobody on the mark: the lead (P1) is A
    let s = runAt([2, 10], [2, 12]);
    expect(s.roleClaimed()).toBe(false);
    expect(s.roleOf(0)).toBe('a');
    expect(s.stepLine(overStep, 0)).toBe(overStep.a);
    expect(s.stepLine(overStep, 1)).toBe(overStep.b);
    // P2 on the mark: P2 is A, P1 B
    s = runAt([2, 10], [A1_MARK.x, A1_MARK.z]);
    expect(s.roleClaimed()).toBe(true);
    expect(s.roleOf(1)).toBe('a');
    expect(s.stepLine(overStep, 1)).toBe(overStep.a);
    expect(s.stepLine(overStep, 0)).toBe(overStep.b);
    // the first claim stands: P1 on the mark afterwards does not swap it back
    s.setPlayer(0, A1_MARK.x, 0, A1_MARK.z, false);
    s.setPlayer(1, 3, 0, 3, false);
    s.update(1 / 60);
    expect(s.roleOf(1)).toBe('a');
    // standing on the wall top over the mark (4.4 m) is not on the mark
    s = runAt([A1_MARK.x, A1_MARK.z], [2, 12]);
    expect(s.roleOf(0)).toBe('a');
  });

  it('the yard pass zone: both players on the yard floor (not the wall top) sets a1-yard, which ticks the step with the wicket still shut', () => {
    const zone = part.passZones[0]!;
    expect(zone.flag).toBe(A1_YARD_FLAG);
    expect(zone.floorY).toBe(0);
    expect(zone.any).toBeUndefined();
    expect(zone.box).toEqual(A1_YARD_ZONE);
    // x 12.6 on: clear of the wall's yard face (12.3), up to the L1 wall (22); z inside the north and south walls
    expect(zone.box[0]).toBeGreaterThanOrEqual(A1_WALL.far + 0.3 - 1e-9);
    expect(zone.box[1]).toBeGreaterThan(2);
    expect(zone.box[3]).toBeLessThan(20);
    expect(part.externalFlags).toEqual([A1_YARD_FLAG]);
    // the step is done by the flag alone (the relay variant: the wicket stays bolted)
    const s = runAt([11.2, 11], [3, 11]);
    expect(s.isStepDone('a1-over')).toBe(false);
    s.setFlag(A1_YARD_FLAG);
    s.update(1 / 60);
    expect(s.isStepDone('a1-over')).toBe(true);
    expect(s.locked(A1_WICKET_DOOR)).toBe(true);
  });
});

describe('A1 the Gate: the gate checker', () => {
  const slot = part.squads[A1_CHECKER]!;
  const cabin = [7, 15, 10, 18] as const;

  it('is the bay\'s one guard: an armed kind (grunt), passive, at his desk inside the cabin facing east through the window', () => {
    expect(part.bay.squad).toEqual([A1_CHECKER]);
    expect(Object.keys(part.squads)).toEqual([A1_CHECKER]);
    expect(slot.kind).toBe('grunt');
    expect(['grunt', 'heavy', 'enforcer', 'officer', 'sniper']).toContain(slot.kind);
    expect(slot.passive).toBe(true);
    expect(slot.route).toBeUndefined();
    expect(slot.x).toBeCloseTo(9.0, 9);
    expect(slot.z).toBeCloseTo(16.5, 9);
    expect(slot.yaw).toBeCloseTo(Math.PI / 2, 9);
    expect(inBox([...cabin], slot.x, slot.z, -0.3)).toBe(true);
    expect(course.squads[A1_CHECKER]).toBe(slot);
  });

  it('holds two information lines for the interrogation (G206 / P14), each within the radio', () => {
    expect(slot.info).toBe(A1_CHECKER_INFO);
    expect(A1_CHECKER_INFO.lines).toHaveLength(2);
    for (const l of A1_CHECKER_INFO.lines) {
      expect(l.length).toBeLessThanOrEqual(GUARD_INFO_LINE_MAX);
      expect(/[–—]/.test(l)).toBe(false);
    }
  });

  it('can be grabbed from behind: the spot 1.1 m behind him (e2e-coop) is clear floor, and so is his own', () => {
    expect(blockedAt(slot.x - 1.1, slot.z)).toEqual([]);
    expect(blockedAt(slot.x, slot.z, 0.3)).toEqual([]);
    // inside the cabin; the door (south face x 8.0-9.2) is on the way in
    expect(inBox([...cabin], slot.x - 1.1, slot.z, -0.2)).toBe(true);
  });

  it('the cabin: a door on its south face, a clear window on its east face (sight and bullets stop at the glass)', () => {
    const door = b.anchors.doors.find((d) => Math.abs(d.hinge.x - 8.0) < 1e-6 && Math.abs(d.hinge.z - 15) < 1e-6)!;
    expect(door).toBeDefined();
    expect(door.width).toBeCloseTo(1.2, 9);
    expect(door.locked).toBe(false);
    const glass = mine.find((p) => p.collide && p.visible === false && Math.abs(p.c[0] - 10) < 1e-6 && p.c[1] > 1 && p.c[1] < 2);
    expect(glass).toBeDefined();
    expect(glass!.noLedge).toBe(true);
    // the cabin roof is 2.6 m
    const roof = mine.find((p) => p.overhead && Math.abs(top(p) - 2.6) < 1e-6 && Math.abs(p.c[0] - 8.5) < 0.01);
    expect(roof).toBeDefined();
  });
});

describe('A1 the Gate: the lounge', () => {
  it('a 1.8 m sliding door on the lounge\'s east flat at (6, 11) (a course door, house, unlocked); the spawns face it', () => {
    const d = b.anchors.doors.find((x) => x.id === course.doors[A1_LOUNGE_DOOR])!;
    expect(d).toBeDefined();
    expect(d.leaf).toBe('slide');
    expect(d.width).toBeCloseTo(1.8, 9);
    expect(d.hinge.x).toBeCloseTo(6, 6);
    expect(d.hinge.z + d.width / 2).toBeCloseTo(11, 6);
    expect(d.locked).toBe(false);
    for (const sp of SPAWNS) expect(sp.yaw).toBeCloseTo(Math.PI / 2, 9);
    expect(lay.playerSpawns).toHaveLength(2);
  });

  it('from each spawn the way to the door, and from the door to the mark and to the wicket, is open floor (no locker, bench or flat in the way)', () => {
    for (const sp of SPAWNS) expect(walkBlocked(sp.x, sp.z, 5.0, 11), `spawn ${sp.x}, ${sp.z} to the door`).toBeNull();
    expect(walkBlocked(5.0, 11, 7.0, 11)).toBeNull();
    expect(walkBlocked(7.0, 11, A1_MARK.x, A1_MARK.z)).toBeNull();
    expect(walkBlocked(7.0, 11, 11.2, 11)).toBeNull();
    // the apron is open both ways round the cabin
    expect(walkBlocked(6.7, 14.5, 6.7, 3)).toBeNull();
    expect(walkBlocked(10.6, 14.5, 10.6, 3)).toBeNull();
    // the wicket's two sides and the way on to the L1 door
    expect(walkBlocked(13.2, 11, 21, 11)).toBeNull();
  });

  it('the lounge is closed to the hall roof (noLedge flats and a ceiling): nothing there to stand on over the mantle', () => {
    const flats = mine.filter((p) => p.collide && top(p) >= 9.99);
    expect(flats.length).toBeGreaterThanOrEqual(4);
    for (const p of flats) expect(p.noLedge).toBe(true);
    const ceiling = mine.find((p) => p.overhead && Math.abs(p.c[1] - 3.3) < 1e-6)!;
    expect(ceiling).toBeDefined();
    expect(ceiling.noLedge).toBe(true);
    // 3.2 m under it: the cove lamps hang at 3.17
    expect(ceiling.c[1] - ceiling.s[1] / 2).toBeCloseTo(3.2, 9);
  });
});

describe('A1 the Gate: the lights (LIGHTING-PLAN 3, A1)', () => {
  const rowOf = (g: number) => circuitOf(g)!;

  it('nine lamps on the plan\'s circuits 10-13: the lounge four (warm, house), the apron flood, the yard three, the cabin panel', () => {
    expect(lamps).toHaveLength(9);
    const by = (g: number) => lamps.filter((l) => l.group === g);
    expect(by(10)).toHaveLength(4);
    expect(by(11)).toHaveLength(1);
    expect(by(12)).toHaveLength(3);
    expect(by(13)).toHaveLength(1);
    for (const l of by(10)) expect(inBox(LOUNGE_BOX, l.x, l.z)).toBe(true);
    for (const l of by(10)) expect(l.y).toBeCloseTo(3.17, 2);
    // the apron flood stands on the cabin's south-east corner (A1-D6: one flood holds the mark, so no second bulkhead)
    const flood = by(11)[0]!;
    expect(hyp2(flood.x - 10.1, flood.z - 14.9)).toBeLessThan(1);
    expect(flood.cone).not.toBeNull();
    expect(flood.cone!.dz).toBeLessThan(-0.9);
    // the yard bulkheads on the wall's yard face at z 5 / 11 / 17, 3.6 m up; the panel inside the cabin
    expect(by(12).map((l) => l.z).sort((p, q) => p - q)).toEqual([5, 11, 17]);
    for (const l of by(12)) {
      expect(l.x).toBeGreaterThan(A1_WALL.far);
      expect(l.x).toBeLessThan(A1_WALL.far + 1);
      expect(l.y).toBeCloseTo(3.6, 9);
    }
    expect(inBox([7, 15, 10, 18], by(13)[0]!.x, by(13)[0]!.z, -0.3)).toBe(true);
  });

  it('every lamp is grouped, electric (jam target) and destructible, as its circuit row says; none is a house lamp outside the lounge', () => {
    for (const l of lamps) {
      const row = rowOf(l.group);
      expect(row, `lamp ${l.id} group ${l.group}`).toBeDefined();
      expect(row.room).toBe('A1');
      expect(l.electric).toBe(row.electric);
      expect(l.destructible).toBe(row.destructible);
      expect(row.kind === 'house' ? inBox(LOUNGE_BOX, l.x, l.z) : true).toBe(true);
    }
  });

  it('the part\'s groups are exactly the plan\'s A1 rows (so the client hears every switch), and each has a lamp', () => {
    const plan = marlowCourseGroups();
    expect(part.groups).toEqual({ 'a1-lounge': plan['a1-lounge'], 'a1-apron': plan['a1-apron'], 'a1-yard': plan['a1-yard'], 'a1-cabin': plan['a1-cabin'] });
    for (const g of Object.values(part.groups)) expect(lamps.some((l) => l.group === g)).toBe(true);
    for (const [k, g] of Object.entries(plan)) if (k.startsWith('a1-')) expect(course.groups![k]).toBe(g);
  });

  it('two wall switches in the cabin by its door: yard (12) and cabin (13), within a metre of the plan; the apron and lounge have none', () => {
    expect(part.switches.map((s) => [s.id, s.group])).toEqual([['a1-sw-yard', 12], ['a1-sw-cabin', 13]]);
    for (const s of part.switches) {
      const row = rowOf(s.group);
      const spot = row.switches.find((x) => x.id === s.id)!;
      expect(hyp2(s.pos.x - spot.x, s.pos.z - spot.z)).toBeLessThanOrEqual(1);
      expect(inBox([7, 15, 10, 18], s.pos.x, s.pos.z, 0.2)).toBe(true);
    }
    expect(lay.switches!.map((s) => s.group)).toEqual(expect.arrayContaining([12, 13]));
    expect(rowOf(10).switches).toHaveLength(0);
    expect(rowOf(11).switches).toHaveLength(0);
  });

  it('the standby zone is the set\'s 0.14 over the whole hall and the lounge keeps the house 0.30 under its ceiling', () => {
    const zones = Object.fromEntries(part.ambientZones.map((z) => [z.id, z]));
    expect(zones.A1).toMatchObject({ box: [0, 2, 22, 20], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 9.9 });
    expect(zones.lounge).toMatchObject({ box: [0, 8, 6, 14], ambient: MARLOW_LEVEL.house, minY: -1, maxY: 3.1 });
    expect(part.ambientZones).toHaveLength(2);
  });

  it('the light spots cover the doc\'s reads: the wicket both sides, the mark, the apron, the yard on and cut, the lounge', () => {
    const spots = LIGHT_SPOTS.a1Gate;
    const at = (n: string) => spots.find((s) => s.name === n)!;
    expect(at('A1 wicket apron')).toMatchObject({ x: 11.2, z: 11, band: 'pool' });
    expect(at('A1 wicket yard')).toMatchObject({ x: 12.8, z: 11, band: 'pool' });
    expect(at('A1 mark')).toMatchObject({ x: A1_MARK.x, z: A1_MARK.z, band: 'pool' });
    expect(at('A1 apron centre')).toMatchObject({ x: 9, z: 10, band: 'read' });
    expect(at('A1 yard centre')).toMatchObject({ x: 17, z: 11, band: 'read' });
    expect(at('A1 yard cut')).toMatchObject({ x: 17, z: 11, band: 'cut', off: [12] });
    expect(at('A1 lounge house')).toMatchObject({ x: 3, z: 11, band: 'house' });
  });
});

describe('A1 the Gate: map data the e2e and the modes read', () => {
  it('debug points A1-entry / A1-mid / A1-mark / A1-yard, camera spaces (hall open, lounge and cabin tight), a nav seed in the yard', () => {
    const ids = part.debugPoints.map((d) => d.id);
    expect(ids).toEqual(['A1-entry', 'A1-mid', 'A1-mark', 'A1-yard']);
    for (const d of part.debugPoints) expect(inBox(SET_BOX.a1Gate[0]!, d.pos.x, d.pos.z)).toBe(true);
    expect(part.camSpaces.map((c) => c.size)).toEqual(['open', 'tight', 'tight']);
    expect(part.navSeeds.some((s) => s.x > 13)).toBe(true);
  });

  it('shot vantages for the lounge door and the yard; no cameras, lasers, scanners or hide spots (the unguarded teach set)', () => {
    expect(part.shotVantages.map((v) => v.name)).toEqual(['a1-lounge-door', 'a1-yard-wicket']);
    expect(part.cameras).toEqual([]);
    expect(part.lasers).toEqual([]);
    expect(part.scanners).toEqual([]);
    expect(part.hideSpots).toEqual([]);
    expect(part.consoles).toEqual([]);
  });
});

describe('A1 the Gate: dressing (slice 1 step 5)', () => {
  /** The greybox as S1 left it: 22 boxes (21 solids and the mark's paint), 9 lamps, 3 doors, no other anchor. */
  const GREY = { boxes: 22, solids: 21, lights: 9, doors: 3, anchors: 0, checksum: 2456.795 };
  const kitReport = JSON.parse(readFileSync('src/world/kit/assets/facility-kit.json', 'utf8')) as { pieces: Record<string, { meshes: Record<string, number> }> };
  const propReport = JSON.parse(readFileSync('src/world/props/assets/facility-props.json', 'utf8')) as PropReport;
  const box = SET_BOX.a1Gate[0]!;
  const area = { x0: box[0], z0: box[1], x1: box[2], z1: box[3] };
  const own = part.props;
  const dressing = mine.slice(GREY.boxes);
  /** The props' own boxes as written (matched by centre and size), a quarter-turn prop folded to the axis-aligned box `soloJumpThreats` reads. */
  const propBoxes = own.flatMap((p) => propCollisionBox(p) ?? []);
  const written = propBoxes.map((w) => mine.find((p) => p.collide && p.c.every((v, k) => Math.abs(v - w.c[k]!) < 1e-6) && p.s.every((v, k) => Math.abs(v - w.s[k]!) < 1e-6) && Math.abs(p.yaw - w.yaw) < 1e-6)!);
  const upright = (p: BoxPiece): BoxPiece => (Math.abs(Math.sin(p.yaw)) > 0.5 ? { ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 } : { ...p, yaw: 0 });
  /** Plan gap (m) from an axis-aligned piece to a lip's run (the lips run along z). */
  const gapTo = (p: BoxPiece, l: CoopLip): number => {
    const dx = Math.max(Math.abs(l.a.x - p.c[0]) - p.s[0] / 2, 0);
    const dz = Math.max(Math.min(l.a.z, l.b.z) - (p.c[2] + p.s[2] / 2), p.c[2] - p.s[2] / 2 - Math.max(l.a.z, l.b.z), 0);
    return hyp2(dx, dz);
  };
  const gap = (p: BoxPiece): number => Math.min(gapTo(p, NEAR), gapTo(p, FAR));

  it('the greybox is as S1 built it: its 22 boxes (checksum), 9 lamps, 3 doors, no anchor; the only new collision is the props\' own boxes', () => {
    let sum = 0;
    for (const p of mine.slice(0, GREY.boxes)) sum += (p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw) * (p.collide ? 1 : 1.5) * (p.visible === false ? 1.25 : 1) * (p.overhead ? 1.1 : 1);
    expect(sum).toBeCloseTo(GREY.checksum, 3);
    expect(mine.slice(0, GREY.boxes).filter((p) => p.collide)).toHaveLength(GREY.solids);
    expect(propBoxes.length).toBeGreaterThan(0);
    expect(written.every((p) => p !== undefined)).toBe(true);
    expect(built.counts.sets.a1Gate).toEqual({ lights: GREY.lights, solids: GREY.solids + propBoxes.length, doors: GREY.doors, anchors: GREY.anchors });
    // after the greybox: the props' boxes and visual skins, nothing else collides
    expect(dressing.filter((p) => p.collide)).toHaveLength(propBoxes.length);
    expect(lamps).toHaveLength(GREY.lights);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A1-3', 'A1-11', 'A1-12', 'A1-13', 'A1-14', 'A1-15']));
    for (const r of part.register) expect(/[–—]/.test(r.element), r.id).toBe(false);
  });

  it('every hand-built dressing box is a visual skin: no collision, noLedge, a side under 5 cm (out of the canonical light shapes, so the light is the greybox\'s)', () => {
    const skins = dressing.filter((p) => !p.collide);
    expect(skins.length).toBeGreaterThan(100);
    for (const p of skins) {
      expect(p.noLedge, `skin at (${p.c.join(', ')})`).toBe(true);
      expect(Math.min(...p.s), `skin at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBeLessThan(CANON_MIN_THICK);
      expect(p.visible).not.toBe(false);
    }
    // the mark's paint is thin too; no visible box that is not solid reaches the light shapes
    expect(mine.filter((p) => !p.collide && p.visible !== false && Math.min(...p.s) >= CANON_MIN_THICK)).toEqual([]);
  });

  it('the chained vehicle gate is dressing on the solid wall (A1-D3): skins on the apron face over z 4-7, up to 3.0 m with the lintel and sign, no opening', () => {
    const gate = dressing.filter((p) => !p.collide && p.c[0] > A1_WALL.near - 0.13 && p.c[0] < A1_WALL.near && p.c[2] > 3.7 && p.c[2] < 7.3);
    expect(gate.length).toBeGreaterThan(20);
    // flat on the face: nothing stands more than 0.12 m off it, and the leaves cover z 4-7 from the floor to 3.0 m
    for (const p of gate) expect(p.c[0] + p.s[0] / 2).toBeLessThanOrEqual(A1_WALL.near + 1e-9);
    for (const p of gate) expect(p.c[0] - p.s[0] / 2).toBeGreaterThanOrEqual(A1_WALL.near - 0.12 - 1e-9);
    const leaves = gate.filter((p) => p.s[2] > 1.4 && p.s[1] > 2.5);
    expect(leaves).toHaveLength(2);
    expect(Math.max(...gate.map(top))).toBeGreaterThanOrEqual(3.3);
    // the wall itself is the greybox's three pieces, unchanged
    expect(mine.filter((p) => p.collide && Math.abs(p.c[0] - A1_WALL.x) < 0.01 && Math.abs(p.s[0] - A1_WALL.thick) < 1e-6)).toHaveLength(3);
  });

  it('budgets (computed): kit triangles <= 60 k; props pass FacilityProps.check against the set box at 60 k triangles and 12 draws, with the facility\'s plates in the box counted', () => {
    const kitIn = lay.kit!.instances.filter((i) => inBox(box, i.x, i.z));
    const kitTris = kitTriangles({ instances: kitIn, doors: [] }, kitReport);
    expect(kitIn.some((i) => i.piece === 'wallPanel')).toBe(true);
    expect(kitTris).toBeGreaterThan(0);
    expect(kitTris, `${kitTris} kit triangles`).toBeLessThanOrEqual(60_000);
    // the arrival lounge's furniture is the facility dresser's and has its own area budget (S0e); any other facility prop in the box (a set-side plate) counts here
    const facilityIn = built.facility.props.filter((p) => inBox(box, p.x, p.z));
    const counted = [...own, ...facilityIn.filter((p) => !inBox(LOUNGE_BOX, p.x, p.z))];
    const checker = (list: readonly PropPlacement[]): FacilityProps => {
      const f = new FacilityProps();
      f.placements.push(...list);
      return f;
    };
    expect(checker(counted).check(area, propReport)).toEqual([]);
    expect(propTriangles(counted, propReport)).toBeLessThanOrEqual(PROP_SET_BUDGET.tris);
    expect(propDraws(counted, propReport)).toBeLessThanOrEqual(PROP_SET_BUDGET.draws);
    // footprints inside the box and no two gameplay boxes overlapping, the lounge's props too
    expect(checker([...own, ...facilityIn]).check(area)).toEqual([]);
    expect(own.map((p) => p.prop).sort()).toEqual(['barrierPost', 'bollard', 'bollard', 'bollard', 'bollard', 'checkerDesk', 'wicketBolt']);
  });

  it('every prop with an emissive part carries a circuit group (S3-7 S1, light parity): A1 places no lit one (the checker\'s screen is dark), and every lit prop of the facility (lounge desk and cases, gallery screens, holding-room and dock plates) is on a house circuit of the plan', () => {
    const plan = new Set(Object.values(marlowCourseGroups()));
    const [g0, g1] = setGroups('a1Gate');
    const glowing = own.filter((p) => propGlows(p) && !PROP_OWN_SUPPLY.includes(p.prop));
    // A1's own: the counter's screen is dark (no light to cut); an ungrouped lit one would be found (teeth)
    expect(glowing).toEqual([]);
    expect(own.filter((p) => p.prop === 'checkerDesk').every((p) => p.tint![0] === 0 && p.tint![1] === 0 && p.tint![2] === 0)).toBe(true);
    expect(propGlows({ prop: 'checkerDesk' })).toBe(true);
    // the facility's (built in A1's file: the lounge is A1's): every lit prop is on a house circuit 10 or 90-98
    const fac = built.facility.props.filter((p) => propGlows(p) && !PROP_OWN_SUPPLY.includes(p.prop));
    expect(fac.length).toBeGreaterThan(30);
    const houses = new Set([10, 90, 91, 92, 93, 94, 95, 96, 97, 98]);
    for (const p of fac) {
      expect(p.group, `${p.prop} at ${p.x}, ${p.y}, ${p.z}`).toBeDefined();
      expect(plan.has(p.group!), `${p.prop} group ${p.group}`).toBe(true);
      expect(houses.has(p.group!), `${p.prop} group ${p.group}`).toBe(true);
    }
    expect(fac.filter((p) => p.prop === 'receptionDesk' || p.prop === 'kitCaseWall').every((p) => p.group === 10)).toBe(true);
    expect(fac.filter((p) => p.prop === 'galleryConsole' || p.prop === 'galleryScreen' || p.prop === 'monitorWall').every((p) => p.group === 90)).toBe(true);
    expect(g0).toBe(10);
    expect(g1).toBe(19);
  });

  it('every kit glow in A1 carries a circuit: panels, skirting and unlit slots are grouped on the plan\'s A1 rows (10 the lounge, 12 the hall coves, never 10 above the wall); no lamp was added', () => {
    const plan = new Set(Object.values(marlowCourseGroups()));
    const [g0, g1] = setGroups('a1Gate');
    const kitIn = lay.kit!.instances.filter((i) => inBox(box, i.x, i.z));
    const glowing = kitIn.filter((i) => ['wallPanel', 'skirting', 'column', 'handrail'].includes(i.piece) || (i.piece === 'ledSlot' && !i.noLed));
    expect(glowing.length).toBeGreaterThan(40);
    for (const i of glowing) {
      expect(i.group, `${i.piece} at ${i.x}, ${i.y}, ${i.z}`).toBeDefined();
      expect(plan.has(i.group!), `${i.piece} group ${i.group}`).toBe(true);
      expect(i.group!, `${i.piece} group ${i.group}`).toBeGreaterThanOrEqual(g0);
      expect(i.group!, `${i.piece} group ${i.group}`).toBeLessThanOrEqual(g1);
    }
    // the hall's coves over the boundary wall (the south wall's and the L1 wall's faces): the yard circuit
    const coves = glowing.filter((i) => i.piece === 'wallPanel' && (Math.abs(i.z - 2.25) < 0.1 || Math.abs(i.x - 21.75) < 0.1));
    expect(coves.length).toBeGreaterThan(20);
    for (const i of coves) expect(i.group).toBe(12);
    // the lounge's panels and toe-kick lines: its house circuit, inside the lounge
    const lounge = glowing.filter((i) => inBox(LOUNGE_BOX, i.x, i.z, 0.2));
    expect(lounge.some((i) => i.piece === 'skirting')).toBe(true);
    for (const i of lounge) expect(i.group).toBe(10);
    // no lamp was added: the nine of the plan, each on its row
    expect(lamps).toHaveLength(9);
    for (const l of lamps) expect(l.group).toBeGreaterThanOrEqual(g0);
  });

  it('the lounge panels leave the sliding door\'s architrave clear and the hall coves stay above the 4.4 m wall', () => {
    const kitIn = lay.kit!.instances.filter((i) => inBox(box, i.x, i.z));
    const onDoorWall = kitIn.filter((i) => i.piece === 'wallPanel' && Math.abs(i.x - 5.85) < 0.1 && i.z > 8 && i.z < 14);
    expect(onDoorWall.length).toBeGreaterThan(0);
    for (const i of onDoorWall) expect(Math.abs(i.z - 11) - 0.6 * i.sx, `panel at z ${i.z}`).toBeGreaterThanOrEqual(1.0 - 1e-6);
    const hall = kitIn.filter((i) => i.piece === 'wallPanel' && (Math.abs(i.z - 2.25) < 0.1 || Math.abs(i.x - 21.75) < 0.1));
    for (const i of hall) expect(i.y, `hall panel at ${i.x}, ${i.z}`).toBeGreaterThanOrEqual(A1_WALL.lip - 1e-9);
  });

  it('props inside the set box: every drawn footprint and every gameplay box; the arm and the bolt are drawn only', () => {
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
    // the wall-hung bolt has no box, the post's 6 m arm none beyond the post's own
    expect(own.filter((p) => propCollisionBox(p) === null).map((p) => p.prop)).toEqual(['wicketBolt']);
    expect(propBoxes).toHaveLength(6);
  });

  it('props that collide are noLedge; none within 4.7 m of a 4.4 m lip tops out at 1.0 m or more unless noLedge, and with the props written no solo jump reaches either lip', () => {
    for (const p of written) expect(p.noLedge, `prop box at (${p.c.join(', ')})`).toBe(true);
    for (const p of written) if (top(p) >= 1.9) expect(p.noLedge).toBe(true);
    const near = written.filter((p) => gap(upright(p)) <= GREY_KEEP_CLEAR);
    // (the cabin's counter and the gate's bollards stand inside the radius, so the rule has something to bite on)
    expect(near.length).toBeGreaterThanOrEqual(3);
    for (const p of near) expect(top(p) < 1.0 || p.noLedge, `prop box at (${p.c.join(', ')}) tops out at ${top(p).toFixed(2)}`).toBe(true);
    // the file's soloJumpThreats setup, rerun over every solid in the map with the props written (quarter-turn boxes folded upright)
    const withProps = [...solid, ...written.filter((p) => !solid.includes(p)).map(upright)];
    expect(withProps.length).toBeGreaterThan(solid.length);
    expect(soloJumpThreats(withProps, NEAR)).toEqual([]);
    expect(soloJumpThreats(withProps, FAR)).toEqual([]);
    // teeth: the same call flags a 1.3 m crate with no noLedge 2.5 m off the near lip
    const crate: BoxPiece = { c: [A1_WALL.near - 2.5 - 0.5, 0.65, 5], s: [1, 1.3, 1], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true };
    expect(soloJumpThreats([...withProps, crate], NEAR).length).toBeGreaterThan(0);
  });

  it('props stand clear of the leg-up mark and its room, the wicket\'s swing and bolt spot, the checker\'s grab spot and the ways to L1', () => {
    const boxes = written.map(upright);
    const dist = (p: BoxPiece, x: number, z: number): number => hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0));
    for (const p of boxes) {
      expect(dist(p, A1_MARK.x, A1_MARK.z), 'the mark').toBeGreaterThanOrEqual(TEAM.roomSide + MOVEMENT.radius);
      expect(dist(p, A1_WALL.x, 10.4), 'the wicket\'s hinge (the leaf swings 1.2 m)').toBeGreaterThanOrEqual(1.2 + MOVEMENT.radius);
      expect(dist(p, A1_WALL.x, A1_WALL.z), 'the bolt spot').toBeGreaterThanOrEqual(1.2 + MOVEMENT.radius);
      expect(dist(p, 7.9, 16.5), 'the checker\'s grab spot (1.1 m behind him)').toBeGreaterThanOrEqual(MOVEMENT.radius);
    }
    for (const d of [10.4, 11, 11.6]) expect(walkBlocked(13.2, d, 21.4, d), `yard to the L1 door at z ${d}`).toBeNull();
    expect(walkBlocked(7.0, 11, 11.2, 11)).toBeNull();
    expect(walkBlocked(7.0, 11, A1_MARK.x, A1_MARK.z)).toBeNull();
    expect(walkBlocked(7.5, A1_MARK.z, A1_MARK.x - 0.5, A1_MARK.z)).toBeNull();
    // the checker's slot and the spot behind him are clear of the counter
    expect(blockedAt(9.0, 16.5, 0.3)).toEqual([]);
    expect(blockedAt(7.9, 16.5, 0.3)).toEqual([]);
  });

  it('the wicket\'s bolt hangs on the wall\'s yard face beside the opening, 1.0 m or more up; the checker\'s counter stands inside the cabin with its monitor dark', () => {
    const bolt = own.find((p) => p.prop === 'wicketBolt')!;
    expect(PROP_HUNG).toContain('wicketBolt');
    expect(bolt.x).toBeCloseTo(A1_WALL.far, 9);
    expect(bolt.y).toBeGreaterThanOrEqual(1.0);
    expect(bolt.y).toBeLessThanOrEqual(1.4);
    const f = PROP_FOOTPRINT.wicketBolt;
    const zs = [f[0], f[2]].map((lx) => propToWorld(bolt, lx, 0, 0)[2]);
    expect(Math.min(...zs)).toBeGreaterThanOrEqual(A1_WALL.z + 0.6 - 1e-6);
    const desk = own.find((p) => p.prop === 'checkerDesk')!;
    expect(inBox([7, 15, 10, 18], desk.x, desk.z, -0.3)).toBe(true);
    expect(desk.tint).toEqual([0, 0, 0]);
  });
});
