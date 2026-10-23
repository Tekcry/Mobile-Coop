/**
 * A3 the Office Range (marlow-final slice 3; set doc `docs/marlow-final/sets/a3OfficeRange.md`): the set's own cases. The corridor is
 * the timed jam relay (every hop inside one blind window, the recess hides a body from the camera, a lone jammer cannot cover a
 * hop), the camera sends a seen player back (the hall rule, run against `A3_HALL`), no way from the west lobby to the east lobby
 * skips the camera (the offices route needs the jam too), every lamp is on its circuit and the switches darken their offices (the
 * tuned light levels), the cleaner is an armed `grunt` on a walkable timed loop inside the lure range, the steps validate and read
 * per player, the B claim is the corridor. The map-wide frames (`tests/ctcourse.test.ts`, `tests/ctcourseLight.test.ts`) run the
 * contract, the register and the light bands over this part too. The last block is the dressing (slice 3 step 5): the greybox pinned,
 * hand-built skins out of the light shapes, the budgets, the desk props over the greybox desks, the cleaner's trolley and every route it
 * leaves clear, the corridor's, recess's and posts' widths and sight lines, every kit glow on circuit 34, the lobbies' lifts and the register
 * numbering gap and switch plates from S34-check.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/ai/enemyDefs';
import { PatrolWalker } from '../../src/ai/patrol';
import { generateLedges } from '../../src/world/anchors';
import { LevelBuilder, type BoxPiece } from '../../src/world/levelBuilder';
import { MOVEMENT } from '../../src/config/movement';
import { CAMERA } from '../../src/config/security';
import { COURSE_TEXT_MAX } from '../../src/config/course';
import { layoutKnownIds, validateCourse } from '../../src/game/course/courseDef';
import { CourseState } from '../../src/game/course/courseState';
import { hyp2 } from '../../src/core/mathx';
import { HALL_BACK, HALL_BACK_HOLD, HALL_IDLE, HALL_RUN, HALL_SENT, hallStep, JAMMER, newDevJam, newJam, DEV_IDLE, stepDevJam, stepJam } from '../../src/game/jammer';
import { cameraRate, camPitch, camRange, inFrame, newMeter, stepCamMeter, sweepCycle, sweepYaw } from '../../src/security/camera';
import { validateSecurity } from '../../src/security/data';
import { kitTriangles } from '../../src/world/kit/facilityKit';
import { FacilityProps, propGlows, PROP_OWN_SUPPLY, propCollisionBox, propDraws, propTriangles, PROP_HUNG, PROP_SET_BUDGET, type PropPlacement, type PropReport } from '../../src/world/props/facilityProps';
import { CANON_MIN_THICK } from '../../src/voxel/lightShapes';
import { buildCtcourse, COOP_LIPS, LIGHT_SPOTS } from '../../src/world/maps/ctcourse';
import { JAM_HOP, JAM_WINDOW, jamRelay, SILENT_CROUCH } from '../../src/world/maps/ctcourseGreybox';
import {
  A3_CAMERA,
  A3_CAMERA_RANGE,
  A3_CHAIRS,
  A3_CLEANER,
  A3_CLEANER_FACES,
  A3_CLEANER_ROUTE,
  A3_CLEANER_WAITS,
  A3_COMM_Z,
  A3_CORR_DOOR_X,
  A3_CORRIDOR,
  A3_CUPBOARD_Z,
  A3_DESK_LIFT,
  A3_DESKS,
  A3_DOOR_COMM1,
  A3_DOOR_COMM2,
  A3_DOOR_CORR,
  A3_DOOR_LOBBY,
  A3_DOOR_RECESS,
  A3_FAR1_FLAG,
  A3_FAR_FLAG,
  A3_FAR_ZONE,
  A3_HALL,
  A3_HALL_ID,
  A3_HIDE,
  A3_LIFTS,
  A3_LOBBY_DOOR_Z,
  A3_OFFICE_Z1,
  A3_OFFICES,
  A3_PARTITIONS,
  A3_PASS_WAIT,
  A3_POST_EAST,
  A3_POST_WEST,
  A3_RECESS_DOOR_X,
  A3_RUNS,
  A3_SW_CORR,
  A3_SW_OFFICE,
  A3_TROLLEY,
} from '../../src/world/maps/ctcourseSets/a3OfficeRange';
import { checkSetPart, inBox, OBJECTIVE_ID_MAX, registerSum, SET_BOX, setGroups } from '../../src/world/maps/ctcourseSets/types';
import { circuitOf, LURE_RANGE, marlowCourseGroups } from '../../src/world/lighting/marlowCircuits';
import { MARLOW_LEVEL } from '../../src/world/lighting/levels';

const b = new LevelBuilder();
const built = buildCtcourse(b);
const part = built.parts[2]!;
const lay = built.layout;
const course = lay.course!;
const def = course.def;
const range = built.ranges.a3OfficeRange;
const mine = b.boxes.slice(range.boxes[0], range.boxes[1]);
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
const box = SET_BOX.a3OfficeRange[0]!;
const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && inBox(box, l.x, l.z));
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
const cam = part.cameras[0]!;
/** The greybox as S3 built it (slice 3 steps 2-4): its 33 boxes (30 solids, three floor marks), 14 lamps, 5 doors, no anchor. The dressing is appended after. */
const GREY = { boxes: 33, solids: 30, lights: 14, doors: 5, anchors: 0, checksum: 5583.487499999999 };
const tuned = (JSON.parse(readFileSync('tests/ctcourse/a3OfficeRange.light.json', 'utf8')) as { levels: Record<string, number> }).levels;
const anchors = generateLedges(b.boxes, b.anchors);

/** The solid boxes whose band (floor to 1.7 m) is within `r` of (x, z): what a body walking there touches. */
const blockedAt = (x: number, z: number, r = MOVEMENT.radius): string[] =>
  solid
    .filter((p) => bottom(p) < 1.7 && top(p) > 0.15)
    .filter((p) => Math.hypot(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r)
    .map((p) => `box (${p.c.map((v) => v.toFixed(2)).join(', ')}) size (${p.s.map((v) => v.toFixed(2)).join(', ')})`);
/** A walk from (x0, z0) to (x1, z1) in 0.1 m steps (doors open): the first point a body of radius `r` touches a solid, or null. */
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
const pathLen = (pts: readonly (readonly [number, number])[]): number => pts.slice(1).reduce((a, q, i) => a + hyp2(q[0] - pts[i]![0], q[1] - pts[i]![1]), 0);
const walkPath = (pts: readonly (readonly [number, number])[], r = MOVEMENT.radius): string | null => {
  for (let i = 1; i < pts.length; i++) {
    const hit = walkBlocked(pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1], r);
    if (hit) return `leg ${i}: ${hit}`;
  }
  return null;
};

/** Does the 3D segment a -> c cross the box (strictly inside, a hair of slack)? Slab clip. */
function segHits(a: readonly [number, number, number], c: readonly [number, number, number], p: BoxPiece): boolean {
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 3; i++) {
    const d = c[i]! - a[i]!;
    const lo = p.c[i]! - p.s[i]! / 2 + 1e-6;
    const hi = p.c[i]! + p.s[i]! / 2 - 1e-6;
    if (Math.abs(d) < 1e-12) {
      if (a[i]! < lo || a[i]! > hi) return false;
      continue;
    }
    let u = (lo - a[i]!) / d;
    let v = (hi - a[i]!) / d;
    if (u > v) [u, v] = [v, u];
    t0 = Math.max(t0, u);
    t1 = Math.min(t1, v);
    if (t0 > t1) return false;
  }
  return true;
}

/** The set's six doors' closed leaves as thin boxes (the camera and the cleaner see no further than a shut door) and their footprints. */
const doorAnchor = (id: string) => b.anchors.doors.find((d) => d.id === course.doors[id])!;
const A3_DOORS = [A3_DOOR_LOBBY, A3_DOOR_COMM1, A3_DOOR_COMM2, A3_DOOR_RECESS, A3_DOOR_CORR];
const leaves = A3_DOORS.map((id) => {
  const d = doorAnchor(id);
  const ex = d.hinge.x + Math.sin(d.yaw) * d.width;
  const ez = d.hinge.z + Math.cos(d.yaw) * d.width;
  const leaf: BoxPiece = { c: [(d.hinge.x + ex) / 2, d.height / 2, (d.hinge.z + ez) / 2], s: [Math.max(Math.abs(ex - d.hinge.x), 0.06), d.height, Math.max(Math.abs(ez - d.hinge.z), 0.06)], yaw: 0, pitch: 0, color: '#000', collide: true, visible: true };
  return { id, leaf, foot: [Math.min(d.hinge.x, ex) - 0.5, Math.min(d.hinge.z, ez) - 0.5, Math.max(d.hinge.x, ex) + 0.5, Math.max(d.hinge.z, ez) + 0.5] as [number, number, number, number] };
});
const camPos = [cam.at[0], cam.y, cam.at[1]] as const;
/** The camera's clear line to a point `y` high at (x, z): no static box (a shut door's leaf included, except the doors in `open`) in the way. */
function clearLine(x: number, y: number, z: number, open: readonly string[] = []): boolean {
  const to = [x, y, z] as const;
  if (solid.some((p) => segHits(camPos, to, p))) return false;
  return !leaves.some((l) => !open.includes(l.id) && segHits(camPos, to, l.leaf));
}
const SWEEP_YAWS = [262, 265, 268, 270, 272, 275, 278].map((d) => (d * Math.PI) / 180);
const pitch = camPitch(cam);
const camR = camRange(cam);
/** Is a head `y` high at (x, z) in the camera's frame at any point of its sweep? */
const inSweep = (x: number, y: number, z: number): boolean => SWEEP_YAWS.some((yaw) => inFrame(yaw, cam.at[0], cam.y, cam.at[1], x, y, z, pitch, camR));
const HEADS = [MOVEMENT.crouchHeight - 0.1, 1.6];
/** Can the camera see a body standing at (x, z) (a crouched or standing head, anywhere in the sweep; the doors in `open` open)? */
const seenAt = (x: number, z: number, open: readonly string[] = []): boolean => HEADS.some((y) => inSweep(x, y, z) && clearLine(x, y, z, open));

/** A fresh course at set 3 with the two players at the given feet. */
function runAt(a: [number, number], c: [number, number]): CourseState {
  const s = new CourseState(def, course.consoles);
  s.startAt(3);
  s.setPlayer(0, a[0], 0, a[1], false);
  s.setPlayer(1, c[0], 0, c[1], false);
  s.update(1 / 60);
  return s;
}
const inStep = def.objectives!.find((o) => o.id === 'a3-in')!;
const swapStep = def.objectives!.find((o) => o.id === 'a3-swap')!;

describe('A3 the Office Range: the part', () => {
  it('is built (not the stub) and passes the contract rules', () => {
    expect(part.id).toBe('a3OfficeRange');
    expect(part.stub).toBeUndefined();
    expect(checkSetPart(part)).toEqual([]);
  });

  it("every register row is an A3 row; the lamps, solids, doors and anchors they count are the builder's", () => {
    expect(part.register.every((r) => r.id.startsWith('A3-'))).toBe(true);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A3-1', 'A3-2', 'A3-4', 'A3-5', 'A3-6', 'A3-7', 'A3-8', 'A3-9', 'A3-10', 'A3-11', 'A3-12']));
    const sum = registerSum(part.register);
    expect(sum).toEqual(built.counts.sets.a3OfficeRange);
    // 14 lamps (LIGHTING-PLAN 3: corridor 6, offices 3 x 2, lobbies 2) and the suite's five doors, no other anchor (no lip, no ledge)
    expect(sum.lights).toBe(14);
    expect(sum.doors).toBe(5);
    expect(sum.anchors).toBe(0);
    expect(sum.solids).toBeGreaterThanOrEqual(30);
    for (const r of part.register) expect(/[–—]/.test(r.element), r.id).toBe(false);
  });

  it('everything built lies inside the set box (0.3 m of wall slack) and under the hall roof', () => {
    const [x0, z0, x1, z1] = box;
    expect(mine.length).toBeGreaterThan(30);
    for (const p of mine.filter((q) => Math.abs(q.yaw) < 1e-3 && Math.abs(q.pitch) < 1e-3)) {
      expect(p.c[0] - p.s[0] / 2, 'west').toBeGreaterThanOrEqual(x0 - 0.3);
      expect(p.c[0] + p.s[0] / 2, 'east').toBeLessThanOrEqual(x1 + 0.3);
      expect(p.c[2] - p.s[2] / 2, 'south').toBeGreaterThanOrEqual(z0 - 0.3);
      expect(p.c[2] + p.s[2] / 2, 'north').toBeLessThanOrEqual(z1 + 0.3);
      expect(top(p)).toBeLessThanOrEqual(10 + 1e-6);
    }
  });

  it('no lip anywhere: 3 m rooms under a slab; every block 1.9 m or taller is noLedge; no generated grip above 0.9 m in A3; none planned', () => {
    expect(part.lips).toEqual([]);
    expect(COOP_LIPS.filter((l) => inBox(box, l.a.x, l.a.z))).toEqual([]);
    for (const p of mine.filter((q) => q.collide && top(q) >= 1.9)) expect(p.noLedge, `box at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBe(true);
    const generated = anchors.ledges.filter((l) => inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3) && l.top >= 0.9);
    expect(generated.map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
    expect(Math.max(...mine.filter((p) => p.collide && !p.overhead).map(top))).toBeLessThanOrEqual(3.0 + 1e-6);
    // the slab over the floor is overhead, noLedge, above the lamps and the camera
    const slab = mine.find((p) => p.overhead)!;
    expect(slab.noLedge).toBe(true);
    expect(bottom(slab)).toBeCloseTo(3.0, 9);
    expect(bottom(slab)).toBeGreaterThan(cam.y);
    for (const l of lamps) expect(l.y).toBeLessThan(bottom(slab));
  });
});

describe('A3 the Office Range: the corridor, the recess and the jam relay', () => {
  const g = jamRelay({ id: A3_HALL_ID, at: A3_CORRIDOR.at, facing: '+x', length: A3_CORRIDOR.length, width: A3_CORRIDOR.width, height: A3_CORRIDOR.height, side: -1, recessDepth: A3_CORRIDOR.recessDepth, recessW: A3_CORRIDOR.recessW, camY: A3_CORRIDOR.camY });
  const lane = A3_CORRIDOR.at.z - (A3_CORRIDOR.width / 2 - MOVEMENT.radius);
  /** The first hop: from the west jam post's lobby mouth on the centre line, along the lane off the recess wall, in to the hide spot. */
  const hop1: [number, number][] = [[A3_CORRIDOR.at.x, A3_CORRIDOR.at.z], [A3_HIDE.x, lane], [A3_HIDE.x, A3_HIDE.z]];
  /** The second hop: out of the recess, along the lane, to the east lobby. */
  const hop2: [number, number][] = [[A3_HIDE.x, A3_HIDE.z], [A3_HIDE.x, lane], [97.3, A3_CORRIDOR.at.z]];

  it('the helper puts one recess on the south wall at x 88.25 and the hide spot at (88.6, 8.5) (A3-D1), the posts 1 m outside each end, the camera at the east end', () => {
    const runners = g.spots.filter((s) => s.kind === 'runner');
    expect(runners).toHaveLength(1);
    expect([runners[0]!.x, runners[0]!.z]).toEqual([A3_HIDE.x, A3_HIDE.z]);
    const jam = g.spots.filter((s) => s.kind === 'jam').map((s) => [s.x, s.z]);
    expect(jam).toEqual([[A3_POST_WEST.x, A3_POST_WEST.z], [A3_POST_EAST.x, A3_POST_EAST.z]]);
    expect(g.cameras[0]!.id).toBe(A3_CAMERA);
    expect(g.cameras[0]!.at[0]).toBeCloseTo(96.6, 9);
    expect(g.cameras[0]!.at[1]).toBeCloseTo(A3_CORRIDOR.at.z, 9);
    expect(A3_HALL.camera).toBe(A3_CAMERA);
  });

  it('the recess spacing is one jam hop (JAM_HOP 8.84 m) and the corridor is 3.5 x 17.5 m under the 19 m helper limit', () => {
    expect(A3_CORRIDOR.length / 2).toBeLessThanOrEqual(JAM_HOP + 1e-9);
    expect(A3_CORRIDOR.length).toBeLessThanOrEqual(19);
    expect(A3_CORRIDOR.width).toBeGreaterThanOrEqual(3.5);
    expect(A3_CORRIDOR.width).toBeLessThanOrEqual(4.0);
    expect(A3_CORRIDOR.length / 2).toBeCloseTo(8.75, 9);
  });

  it('both real hops are one blind window or less at the silent crouch: 10.0 m to the hide spot, about 9.6 m out of it; the cooldown leaves the camera live between the jams', () => {
    expect(JAM_WINDOW).toBeCloseTo(JAMMER.useMax + JAMMER.reboot, 9);
    expect(pathLen(hop1)).toBeCloseTo(10.0, 1);
    expect(pathLen(hop1) / SILENT_CROUCH).toBeLessThan(JAM_WINDOW);
    expect(pathLen(hop2) / SILENT_CROUCH).toBeLessThan(JAM_WINDOW);
    expect(pathLen(hop2)).toBeLessThan(10.0);
    // the hops are open floor (a body of radius 0.3 walks them; the recess door is shut but the hide spot is in front of it)
    expect(walkPath(hop1)).toBeNull();
    expect(walkPath(hop2)).toBeNull();
    // the jammer cools down 5 s after his jam ends (the cap); the camera is back 1.5 s after it: it is live for the rest, and the player waits in the recess
    const live = JAMMER.cooldown - JAMMER.reboot;
    expect(live).toBeCloseTo(3.5, 9);
    expect(JAMMER.useMax + JAMMER.cooldown).toBeCloseTo(10, 9);
  });

  it('a lone player cannot jam and cross: a moving jam breaks, a still jammer creeps 2.25 m in a jam, both hops are longer, the whole corridor is far longer', () => {
    const s = newJam();
    expect(stepJam(s, true, SILENT_CROUCH, 1 / 60)).toBe(false);
    expect(stepJam(newJam(), true, 0, 1 / 60)).toBe(true);
    const creep = JAMMER.stillSpeed * JAMMER.useMax;
    expect(creep).toBeCloseTo(2.25, 9);
    expect(pathLen(hop1)).toBeGreaterThan(creep + JAMMER.reboot * SILENT_CROUCH);
    expect(pathLen(hop2)).toBeGreaterThan(creep + JAMMER.reboot * SILENT_CROUCH);
    expect(A3_CORRIDOR.length / JAMMER.stillSpeed).toBeGreaterThan(JAMMER.useMax);
    // the camera's own timeline: jammed while held, rebooting 1.5 s after the release, then idle
    const d = newDevJam();
    for (let t = 0; t < JAMMER.useMax; t += 1 / 60) stepDevJam(d, true, 'camera', 1 / 60);
    let blind = JAMMER.useMax;
    for (let t = 0; t < 3; t += 1 / 60) {
      stepDevJam(d, false, 'camera', 1 / 60);
      if (d.ph !== DEV_IDLE) blind += 1 / 60;
    }
    expect(blind).toBeCloseTo(JAM_WINDOW, 1);
  });

  it('the posts reach the camera (18.1 m west, 1.4 m east, the jammer\'s 20 m) and the camera is valid: mount 2.8 m, range 17, facing west, sweep 262-278, aim 8.75', () => {
    expect(hyp2(A3_POST_WEST.x - cam.at[0], A3_POST_WEST.z - cam.at[1])).toBeCloseTo(18.1, 1);
    expect(hyp2(A3_POST_WEST.x - cam.at[0], A3_POST_WEST.z - cam.at[1])).toBeLessThanOrEqual(JAMMER.range);
    expect(hyp2(A3_POST_EAST.x - cam.at[0], A3_POST_EAST.z - cam.at[1])).toBeCloseTo(1.4, 1);
    expect(part.cameras).toHaveLength(1);
    expect(cam).toMatchObject({ id: A3_CAMERA, kind: 'camera', level: 'ground', y: 2.8, facing: 270, sweep: [262, 278], aim: 8.75, range: A3_CAMERA_RANGE });
    expect(A3_CAMERA_RANGE).toBe(14);
    expect(g.cameras[0]!.range).toBeUndefined();
    expect(cam.y).toBeGreaterThanOrEqual(CAMERA.mountMin);
    expect(cam.y).toBeLessThanOrEqual(CAMERA.mountMax);
    expect(camR).toBe(14);
    expect(validateSecurity({ devices: part.cameras })).toEqual([]);
    expect(lay.security!.devices.filter((d) => d.id === A3_CAMERA)).toHaveLength(1);
  });

  it('the camera sees the corridor along every leg all through its sweep (a crouched head, a clear line); nothing in the corridor line stands in its way', () => {
    const cyc = sweepCycle(cam.sweep);
    for (const pts of [hop1, hop2]) {
      // the run along the lane: from the mouth to the recess (leg 1) and out of it to the lobby (leg 2), by the middle of its straight part
      const [p, q] = pts[0]![0] < A3_HIDE.x - 1 ? [pts[0]!, pts[1]!] : [pts[1]!, pts[2]!];
      const mx = (p[0] + q[0]) / 2;
      const mz = (p[1] + q[1]) / 2;
      if (mx < 95) {
        for (let t = 0; t <= cyc; t += 0.25) expect(inFrame(sweepYaw(cam, t), cam.at[0], cam.y, cam.at[1], mx, MOVEMENT.crouchHeight - 0.1, mz, pitch, camR), `t ${t}`).toBe(true);
        expect(clearLine(mx, MOVEMENT.crouchHeight - 0.1, mz), `line to (${mx}, ${mz})`).toBe(true);
      }
    }
    for (const x of [84, 87, 90, 93]) expect(seenAt(x, A3_CORRIDOR.at.z), `corridor centre x ${x}`).toBe(true);
    // the near zone under the mount is blind to the frame (it looks down 17.7 deg +- 22.5): x past about 95 is not seen, which is why office 3's door is where it is
    expect(seenAt(96, A3_CORRIDOR.at.z)).toBe(false);
  });

  it('the recess hides a crouched and a standing body from the camera (the cheeks and the back; plan circle of radius 0.3, 3D line to the lens), the body fits in it, and the hide spot is outside the send-back box', () => {
    for (const y of HEADS) {
      for (let k = 0; k <= 16; k++) {
        const a = (2 * Math.PI * k) / 16;
        const x = k === 16 ? A3_HIDE.x : A3_HIDE.x + Math.cos(a) * MOVEMENT.radius;
        const z = k === 16 ? A3_HIDE.z : A3_HIDE.z + Math.sin(a) * MOVEMENT.radius;
        expect(clearLine(x, y, z), `head ${y} k ${k}`).toBe(false);
      }
    }
    expect(blockedAt(A3_HIDE.x, A3_HIDE.z, MOVEMENT.radius)).toEqual([]);
    expect(inBox(A3_HALL.box, A3_HIDE.x, A3_HIDE.z)).toBe(false);
    // the recess is 1.4 wide x 1.0 deep, on the south wall, wide enough for one body and its cheeks 0.3 m thick
    expect(A3_CORRIDOR.recessW).toBe(1.4);
    expect(A3_CORRIDOR.recessDepth).toBe(1.0);
  });

  it('the check has teeth: a body one step out of the recess, in the corridor, is seen; the line to the lens opens between the hide spot and the corridor floor', () => {
    expect(clearLine(A3_HIDE.x, 1.05, A3_CORRIDOR.at.z - 0.9)).toBe(true);
    expect(clearLine(A3_HIDE.x, 1.05, 9.5)).toBe(true);
    expect(clearLine(A3_HIDE.x, 1.05, A3_HIDE.z)).toBe(false);
  });

  it('the west lobby, the east lobby and every office are out of the camera\'s sight: the lobbies by range and mount, the offices behind walls and shut doors', () => {
    // the archway line (79.5) is 17.1 m out, the lobby behind it further; the east lobby is behind the mount (x > 96.6)
    expect(hyp2(79.5 - cam.at[0], A3_CORRIDOR.at.z - cam.at[1])).toBeGreaterThan(camR);
    for (let x = 76.4; x <= 79.3; x += 0.3) for (let z = 0.4; z <= 12.6; z += 0.4) expect(seenAt(x, z), `west lobby (${x.toFixed(1)}, ${z.toFixed(1)})`).toBe(false);
    for (let x = 97.2; x <= 99.7; x += 0.25) for (let z = 0.4; z <= 12.6; z += 0.4) expect(seenAt(x, z), `east lobby (${x.toFixed(2)}, ${z.toFixed(1)})`).toBe(false);
    for (let x = 80; x <= 96.8; x += 0.4) for (let z = 0.4; z <= 8.6; z += 0.4) expect(seenAt(x, z), `office (${x.toFixed(1)}, ${z.toFixed(1)})`).toBe(false);
    // teeth: a body in office 3's corridor doorway is seen with the door open and not with it shut (the leaf is in the way)
    expect(seenAt(92.0, 8.85)).toBe(false);
    expect(seenAt(92.0, 8.85, [A3_DOOR_CORR])).toBe(true);
  });
});

describe('A3 the Office Range: no way past the camera without the jam (the corridor and the offices)', () => {
  const X0 = 76.25;
  const Z0 = 0.25;
  const STEP = 0.1;
  const NX = Math.round((99.75 - X0) / STEP);
  const NZ = Math.round((12.75 - Z0) / STEP);
  const idx = (i: number, k: number): number => k * NX + i;
  const cx = (i: number): number => X0 + (i + 0.5) * STEP;
  const cz = (k: number): number => Z0 + (k + 0.5) * STEP;
  /** Free cells: a body of radius 0.3 fits (doors open). */
  const free = new Uint8Array(NX * NZ);
  const bodies = solid.filter((p) => bottom(p) < 1.7 && top(p) > 0.15);
  for (let k = 0; k < NZ; k++) {
    for (let i = 0; i < NX; i++) {
      const x = cx(i);
      const z = cz(k);
      let ok = 1;
      for (const p of bodies) {
        if (Math.hypot(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < MOVEMENT.radius) {
          ok = 0;
          break;
        }
      }
      free[idx(i, k)] = ok;
    }
  }
  /** Cells the camera sees (a standing or crouched head, any sweep angle): a door's footprint is judged with that door open (a player stands in it). */
  const seen = new Uint8Array(NX * NZ);
  for (let k = 0; k < NZ; k++) {
    for (let i = 0; i < NX; i++) {
      if (!free[idx(i, k)]) continue;
      const x = cx(i);
      const z = cz(k);
      const open = leaves.filter((l) => x >= l.foot[0] && x <= l.foot[2] && z >= l.foot[1] && z <= l.foot[3]).map((l) => l.id);
      seen[idx(i, k)] = seenAt(x, z, open) ? 1 : 0;
    }
  }
  const cellOf = (x: number, z: number): number => idx(Math.floor((x - X0) / STEP), Math.floor((z - Z0) / STEP));
  /** Flood fill (4-connected) from (x, z) over free cells that `pass` allows; returns the reached set. */
  function flood(x: number, z: number, pass: (i: number, k: number) => boolean): Uint8Array {
    const got = new Uint8Array(NX * NZ);
    const stack = [cellOf(x, z)];
    got[stack[0]!] = 1;
    while (stack.length) {
      const c = stack.pop()!;
      const i = c % NX;
      const k = Math.floor(c / NX);
      for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const ni = i + di;
        const nk = k + dk;
        if (ni < 0 || nk < 0 || ni >= NX || nk >= NZ) continue;
        const n = idx(ni, nk);
        if (got[n] || !free[n] || !pass(ni, nk)) continue;
        got[n] = 1;
        stack.push(n);
      }
    }
    return got;
  }
  const west = [77.8, A3_CORRIDOR.at.z] as const;
  const east = [98.5, A3_CORRIDOR.at.z] as const;

  it('the two lobbies are joined, but only through the corridor and office 3: geometry alone lets a body walk from the west lobby to the east lobby', () => {
    const all = flood(west[0], west[1], () => true);
    expect(all[cellOf(east[0], east[1])]).toBe(1);
    // the offices alone (the corridor floor shut off, the doorways left): office 3 and its corridor door, never the east lobby
    const offices = flood(west[0], west[1], (i, k) => !(cx(i) > 79.5 && cx(i) < 97 && cz(k) > 9.0 && cz(k) < 12.5));
    expect(offices[cellOf(94.0, 4.3)]).toBe(1);
    expect(offices[cellOf(A3_CORR_DOOR_X[0] + 0.6, 8.55)]).toBe(1);
    expect(offices[cellOf(east[0], east[1])]).toBe(0);
  });

  it('no path between the lobbies avoids the camera: every body walking the corridor, or out of office 3\'s door, crosses cells it sees', () => {
    const unseen = flood(west[0], west[1], (i, k) => !seen[idx(i, k)]);
    expect(unseen[cellOf(east[0], east[1])]).toBe(0);
    for (let k = 0; k < NZ; k++) for (let i = NX - 1; i >= 0 && cx(i) > 97.15; i--) expect(unseen[idx(i, k)], `east lobby cell (${cx(i).toFixed(1)}, ${cz(k).toFixed(1)})`).toBe(0);
    // teeth: an unseen route does exist into every office, and through office 2's door at the recess back to the hide spot (the relay's stepping stone)
    expect(unseen[cellOf(A3_HIDE.x, A3_HIDE.z)]).toBe(1);
    expect(unseen[cellOf(94.0, 4.3)]).toBe(1);
    expect(unseen[cellOf(82.5, 4.3)]).toBe(1);
    // and the flood that cares about the camera has a seen region to be blocked by: a long run of it along the corridor and across office 3's door
    let seenCells = 0;
    for (let n = 0; n < seen.length; n++) seenCells += seen[n]!;
    expect(seenCells * STEP * STEP).toBeGreaterThan(30);
    expect(seen[cellOf(A3_CORR_DOOR_X[0] + 0.6, 8.9)]).toBe(1);
  });

  it('no floor inside the corridor box west of x 94 is hidden from the camera; the recess (outside it) is reached unseen only through office 2\'s door, never along the corridor', () => {
    const [, z0, , z1] = A3_HALL.box;
    const unseenInBox: [number, number][] = [];
    for (let k = 0; k < NZ; k++) {
      for (let i = 0; i < NX; i++) {
        if (!free[idx(i, k)] || seen[idx(i, k)]) continue;
        const x = cx(i);
        const z = cz(k);
        if (x > 83.5 && x < 94.0 && z > z0 && z < z1) unseenInBox.push([x, z]);
      }
    }
    expect(unseenInBox).toEqual([]);
    // the recess floor (z 8.0-9.0) is unseen floor outside the box, joined to the lobby only through the offices
    const recess = flood(A3_HIDE.x, A3_HIDE.z, (i, k) => !seen[idx(i, k)]);
    expect(recess[cellOf(88.25, 8.4)]).toBe(1);
    // (14 m range cut) the corridor west of x 83.5 is past the camera's range (the jam post's floor), so the probe is the first seen metre
    expect(recess[cellOf(84, A3_CORRIDOR.at.z)]).toBe(0);
  });

  it('office 3\'s corridor door is placed so an unjammed player leaving it is caught (A3-D2 moved it to x 91.4-92.6): at every sweep phase a standing mover reaches stage 2, a crouched creep too, and a crouched run still reaches the camera\'s investigate level', () => {
    const doorX = (A3_CORR_DOOR_X[0] + A3_CORR_DOOR_X[1]) / 2;
    const path: [number, number][] = [[doorX, 8.85], [doorX + 0.3, 9.3], [97.5, 9.6]];
    const walk = (v: number, crouched: boolean, t0: number): number => {
      const m = newMeter();
      let t = t0;
      let peak = 0;
      const dt = 0.1;
      for (let i = 1; i < path.length; i++) {
        const [ax, az] = path[i - 1]!;
        const [bx, bz] = path[i]!;
        const L = hyp2(bx - ax, bz - az);
        const n = Math.max(1, Math.ceil(L / v / dt));
        for (let k = 0; k < n; k++) {
          const f = (k + 1) / n;
          const x = ax + (bx - ax) * f;
          const z = az + (bz - az) * f;
          const head = crouched ? 1.05 : 1.6;
          const sees = inFrame(sweepYaw(cam, t), cam.at[0], cam.y, cam.at[1], x, head, z, pitch, camR);
          stepCamMeter(m, sees ? cameraRate(Math.hypot(x - cam.at[0], head - cam.y, z - cam.at[1]), crouched, v, camR) : 0, L / v / n);
          peak = Math.max(peak, m.meter);
          t += L / v / n;
        }
      }
      return peak;
    };
    const worst = (v: number, crouched: boolean): number => {
      let w = Infinity;
      for (let t0 = 0; t0 < 6.2; t0 += 0.2) w = Math.min(w, walk(v, crouched, t0));
      return w;
    };
    for (const v of [0.75, 1.4, 2.1, 3.0, 4.0]) expect(worst(v, false), `standing ${v} m/s`).toBeGreaterThanOrEqual(1 - 1e-9);
    expect(worst(0.85, true)).toBeGreaterThanOrEqual(1 - 1e-9);
    for (const v of [1.3, 1.7, 2.15, 2.6]) expect(worst(v, true), `crouched ${v} m/s`).toBeGreaterThanOrEqual(0.6);
    // teeth: with the door where the doc's first plan put it (x 93.4-94.6) a crouched walker is never caught
    const old: [number, number][] = [[94.0, 8.85], [94.3, 9.3], [97.5, 9.6]];
    path.splice(0, path.length, ...old);
    expect(worst(1.7, true)).toBeLessThan(0.6);
    expect(worst(2.6, true)).toBeLessThan(0.6);
  });
});

describe('A3 the Office Range: the send-back (the one hard rule), run against A3_HALL', () => {
  it('the rule: the hall box is the corridor, the lobby box the west lobby, the send-back spot is clear floor in the lobby facing the corridor, the line is the doc\'s 69 characters', () => {
    expect(A3_HALL.box).toEqual([79.5, 9, 97, 12.5]);
    expect(A3_HALL.lobby).toEqual([76.3, 0.3, 79.5, 12.7]);
    expect(inBox(A3_HALL.lobby, A3_HALL.back[0], A3_HALL.back[1])).toBe(true);
    expect(A3_HALL.back[2]).toBeCloseTo(Math.PI / 2, 9);
    expect(blockedAt(A3_HALL.back[0], A3_HALL.back[1], 0.3)).toEqual([]);
    expect(A3_HALL.say).toBe('The camera had you. Back to the lobby, and jam it properly this time.');
    expect(A3_HALL.say.length).toBe(69);
    expect(A3_HALL.say.length).toBeLessThanOrEqual(COURSE_TEXT_MAX);
    expect(/[–—]/.test(A3_HALL.say)).toBe(false);
  });

  it('both far-lobby pass zones carry the rule and the camera it names exists', () => {
    expect(part.passZones).toHaveLength(2);
    for (const z of part.passZones) {
      expect(z.hall).toBe(A3_HALL);
      expect(z.box).toEqual(A3_FAR_ZONE);
      expect(z.floorY).toBe(0);
      expect(part.cameras.some((c) => c.id === z.hall!.camera)).toBe(true);
      expect(blockedAt((z.box[0] + z.box[2]) / 2, A3_POST_EAST.z, 0.3)).toEqual([]);
    }
    expect(lay.passZones!.filter((z) => z.hall?.camera === A3_CAMERA)).toHaveLength(2);
  });

  it('seen (stage 2) in the corridor sends a player back; a clean run through counts; a sent-back player counts again only once seen in the lobby (the jammer.test.ts hallway cases, on A3_HALL)', () => {
    const inLobby = (x: number, z: number): boolean => inBox(A3_HALL.lobby, x, z);
    const inHall = (x: number, z: number): boolean => inBox(A3_HALL.box, x, z);
    const inFar = (x: number, z: number): boolean => inBox([...A3_FAR_ZONE], x, z);
    // an unjammed runner along the corridor centre line at the standing jog (3.0 m/s): the camera's meter fills; sent back before the far lobby
    let state: number = HALL_IDLE;
    const m = newMeter();
    let back = false;
    let x = 78.5;
    for (let t = 0; t < 12 && !back; t += 0.25) {
      x += 0.75;
      const sees = inFrame(sweepYaw(cam, t), cam.at[0], cam.y, cam.at[1], x, 1.6, A3_CORRIDOR.at.z, pitch, camR);
      stepCamMeter(m, sees ? cameraRate(Math.hypot(x - cam.at[0], 1.6 - cam.y), false, 3.0, camR) : 0, 0.25);
      const n = hallStep(state, inLobby(x, A3_CORRIDOR.at.z), inHall(x, A3_CORRIDOR.at.z), inFar(x, A3_CORRIDOR.at.z), m.stage, false);
      if (n === HALL_BACK) back = true;
      else state = n;
    }
    expect(back).toBe(true);
    expect(x).toBeLessThan(96);
    // the camera blind (a jam: no rate) the whole run: clean through, idle again in the far lobby
    state = HALL_IDLE;
    for (const px of [80, 85, 90, 95, 98.5]) state = hallStep(state, inLobby(px, A3_CORRIDOR.at.z), inHall(px, A3_CORRIDOR.at.z), inFar(px, A3_CORRIDOR.at.z), 0, false);
    expect(state).toBe(HALL_IDLE);
    // a sent-back player stays sent back through the hold, whatever position the host is told, and clears in the lobby
    expect(hallStep(HALL_SENT, false, false, true, 0, true)).toBe(HALL_SENT);
    expect(hallStep(HALL_SENT, false, false, true, 0, false)).toBe(HALL_BACK);
    expect(hallStep(HALL_SENT, true, false, false, 0, false)).toBe(HALL_IDLE);
    expect(hallStep(HALL_SENT, false, true, false, 0, false)).toBe(HALL_RUN);
    expect(HALL_BACK_HOLD).toBe(3);
    // the hide spot is in no box: a runner who waits there neither runs nor is seen
    expect(hallStep(HALL_RUN, inLobby(A3_HIDE.x, A3_HIDE.z), inHall(A3_HIDE.x, A3_HIDE.z), inFar(A3_HIDE.x, A3_HIDE.z), 0, false)).toBe(HALL_RUN);
  });
});

describe('A3 the Office Range: the doors, the offices and the partitions', () => {
  it('five 1.2 x 2.1 swing doors, unlocked, ids A3-*: office 1 (x 79.5, z 4.0-5.2), the two communicating doors (z 1.8-3.0), office 2 at the recess back (x 87.65-88.85), office 3 on the corridor wall (x 91.4-92.6)', () => {
    expect(Object.keys(part.doors)).toEqual([A3_DOOR_LOBBY, A3_DOOR_RECESS, A3_DOOR_CORR, A3_DOOR_COMM1, A3_DOOR_COMM2]);
    for (const id of A3_DOORS) {
      const d = doorAnchor(id);
      expect(id.startsWith('A3-')).toBe(true);
      expect(d.width, id).toBeCloseTo(1.2, 9);
      expect(d.height, id).toBeCloseTo(2.1, 9);
      expect(d.locked, id).toBe(false);
      expect(d.leaf, id).toBeUndefined();
    }
    expect([doorAnchor(A3_DOOR_LOBBY).hinge.x, doorAnchor(A3_DOOR_LOBBY).hinge.z]).toEqual([79.5, A3_LOBBY_DOOR_Z[0]]);
    expect([doorAnchor(A3_DOOR_COMM1).hinge.x, doorAnchor(A3_DOOR_COMM1).hinge.z]).toEqual([A3_PARTITIONS[0], A3_COMM_Z[0]]);
    expect([doorAnchor(A3_DOOR_COMM2).hinge.x, doorAnchor(A3_DOOR_COMM2).hinge.z]).toEqual([A3_PARTITIONS[1], A3_COMM_Z[0]]);
    expect([doorAnchor(A3_DOOR_RECESS).hinge.x, doorAnchor(A3_DOOR_RECESS).hinge.z]).toEqual([A3_RECESS_DOOR_X[0], 7.85]);
    expect([doorAnchor(A3_DOOR_CORR).hinge.x, doorAnchor(A3_DOOR_CORR).hinge.z]).toEqual([A3_CORR_DOOR_X[0], 8.85]);
    // the two corridor doors are 3.75 m apart (3 m or more), the communicating doors 1.8 m from the south wall's corner (1.5 or more)
    const mid = (a: readonly [number, number]): number => (a[0] + a[1]) / 2;
    expect(mid(A3_CORR_DOOR_X) - mid(A3_RECESS_DOOR_X)).toBeGreaterThanOrEqual(3);
    expect(A3_COMM_Z[0] - 0.25).toBeGreaterThanOrEqual(1.5);
  });

  it('each door is a gap in its wall with a lintel over it: open floor at the opening (a body walks through), solid either side, a lintel from 2.1 m', () => {
    // the five openings: [from, to] on a line, and the wall's other coordinate
    const lines: [string, [number, number], [number, number], [number, number]][] = [
      ['lobby', [78.9, 4.6], [80.4, 4.6], [79.5, 4.6]],
      ['recess', [88.25, 8.6], [88.25, 6.5], [88.25, 7.85]],
      ['corridor', [92.0, 9.6], [92.0, 7.6], [92.0, 8.85]],
      ['comm1', [84.6, 2.4], [86.2, 2.4], [85.4, 2.4]],
      ['comm2', [90.4, 2.4], [92.0, 2.4], [91.2, 2.4]],
    ];
    for (const [name, a, c, at] of lines) {
      expect(walkBlocked(a[0], a[1], c[0], c[1]), name).toBeNull();
      // a lintel in the wall line above the door (a box from 2.1 up), and no solid through the door's own height
      const lintel = solid.filter((p) => Math.abs(bottom(p) - 2.1) < 1e-6 && Math.abs(p.c[0] - at[0]) < 0.8 && Math.abs(p.c[2] - at[1]) < 0.8 && top(p) >= 3.0 - 1e-6);
      expect(lintel.length, `${name} lintel`).toBeGreaterThanOrEqual(1);
    }
    // solid beside each: a body cannot pass a metre off the opening
    expect(blockedAt(79.5, 3.3, 0.1).length).toBeGreaterThan(0);
    expect(blockedAt(79.5, 6.2, 0.1).length).toBeGreaterThan(0);
    expect(blockedAt(90.4, 8.85, 0.1).length).toBeGreaterThan(0);
    expect(blockedAt(94.4, 8.85, 0.1).length).toBeGreaterThan(0);
  });

  it('two frosted partitions at x 85.4 and 91.2 split the offices (collision-only glass: stops walking, sight and bullets), each with a 1.2 m communicating door; no door from office 3 to the east lobby (A3-D3)', () => {
    for (const x of A3_PARTITIONS) {
      const glass = mine.filter((p) => p.collide && p.visible === false && Math.abs(p.c[0] - x) < 0.01 && p.s[0] < 0.2);
      expect(glass.length, `partition ${x}`).toBe(3);
      for (const p of glass) expect(p.noLedge).toBe(true);
      // z 0.25-8.7 along its whole run but the door
      const spans = glass.map((p) => [p.c[2] - p.s[2] / 2, p.c[2] + p.s[2] / 2, bottom(p), top(p)].map((v) => Number(v.toFixed(3)))).sort((p, q) => p[0]! - q[0]!);
      expect(spans).toEqual([[0.25, 1.8, 0, 3], [1.8, 3, 2.1, 3], [3, 8.7, 0, 3]]);
      // one cannot walk through it off the door, nor see through it (the cleaner reads no further than his office)
      expect(walkBlocked(x - 0.8, 6, x + 0.8, 6)).not.toBeNull();
      expect(walkBlocked(x - 0.8, 2.4, x + 0.8, 2.4)).toBeNull();
    }
    expect(walkBlocked(96, 2, 98.5, 2)).not.toBeNull();
    expect(walkBlocked(96, 5, 98.5, 5)).not.toBeNull();
    expect(walkBlocked(96, 8.4, 98.5, 8.4)).not.toBeNull();
    expect(b.anchors.doors.filter((d) => d.hinge.x > 96 && d.hinge.x < 99 && d.hinge.z < 13)).toEqual([]);
    expect(A3_OFFICES.map(([x0, x1]) => Number((x1 - x0).toFixed(2)))).toEqual([5.7, 5.7, 5.6]);
  });

  it('the offices have their desks (0.75 m) and desk runs (0.9 m), noLedge, with the three pockets open to the south: office 1\'s desk-run recess, the trolley bay in office 2, office 3\'s door end', () => {
    const desks = mine.filter((p) => p.collide && Math.abs(top(p) - 0.75) < 1e-6);
    const runs = mine.filter((p) => p.collide && Math.abs(top(p) - 0.9) < 1e-6);
    expect(desks.length).toBeGreaterThanOrEqual(5);
    expect(runs.length).toBeGreaterThanOrEqual(4);
    for (const p of [...desks, ...runs]) expect(p.noLedge).toBe(true);
    // office 1's pocket (x 79.8-80.8, z 7.0-8.2 in the doc), office 2's bay (x 90.0-91.0, z 7.0-8.2): a body of radius 0.3 stands in each and walks out to the floor
    for (const [x, z] of [[80.4, 7.8], [90.55, 7.9]] as const) {
      expect(blockedAt(x, z, 0.3), `pocket (${x}, ${z})`).toEqual([]);
      expect(walkBlocked(x, z, x, 5.0), `pocket (${x}, ${z}) out`).toBeNull();
    }
  });
});

describe('A3 the Office Range: the cleaner', () => {
  const slot = part.squads[A3_CLEANER]!;
  const patrolSpeed = ENEMIES.grunt.walkSpeed * 1.1;

  /** Walk the loop on its own pace (0.01 s steps, straight-line moves): the times each stop was left. */
  function walkLoop(waits: number[], seconds: number): { left: [number, number][]; stuck: boolean } {
    const w = new PatrolWalker({ points: A3_CLEANER_ROUTE, waits, faces: A3_CLEANER_FACES }, slot.x, slot.z, slot.yaw);
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

  it('is the bay\'s one guard: an armed kind (grunt) at office 1\'s desk (83, 3) facing south, on the doc\'s loop with its stops and faces, inside the set', () => {
    expect(part.bay.squad).toEqual([A3_CLEANER]);
    expect(Object.keys(part.squads)).toEqual([A3_CLEANER]);
    expect(slot.kind).toBe('grunt');
    expect(['grunt', 'heavy', 'enforcer', 'officer', 'sniper']).toContain(slot.kind);
    expect(slot.passive).toBeUndefined();
    expect([slot.x, slot.z, slot.yaw]).toEqual([83, 3, Math.PI]);
    expect(slot.route).toEqual([[83, 3], [85.4, 2.4], [88.3, 3], [91.2, 2.4], [95.5, 1.5], [91.2, 2.4], [85.4, 2.4]]);
    expect(slot.route![0]).toEqual([slot.x, slot.z]);
    expect(slot.waits).toEqual([5, A3_PASS_WAIT, 5, A3_PASS_WAIT, 5, A3_PASS_WAIT, A3_PASS_WAIT]);
    expect(slot.faces!.map((f) => (Number.isNaN(f) ? 'keep' : f))).toEqual([Math.PI, 'keep', Math.PI, 'keep', Math.PI / 2, 'keep', 'keep']);
    expect(course.squads[A3_CLEANER]).toBe(slot);
    expect(inBox(box, slot.x, slot.z)).toBe(true);
  });

  it('his loop is open floor through the shut communicating doors (a body of radius 0.3 walks every leg) and never leaves the offices: the corridor is the camera\'s', () => {
    for (let i = 0; i < A3_CLEANER_ROUTE.length; i++) {
      const a = A3_CLEANER_ROUTE[i]!;
      const c = A3_CLEANER_ROUTE[(i + 1) % A3_CLEANER_ROUTE.length]!;
      expect(walkBlocked(a[0], a[1], c[0], c[1]), `leg ${i}`).toBeNull();
    }
    for (const [x, z] of A3_CLEANER_ROUTE) {
      expect(z).toBeLessThan(8.7);
      expect(x).toBeGreaterThan(79.65);
      expect(x).toBeLessThan(97);
      expect(blockedAt(x, z, 0.3), `stop (${x}, ${z})`).toEqual([]);
    }
    // each desk stop faces a desk (a 0.75 m box within 2.2 m ahead of him): south at offices 1 and 2, east at the far desk
    const ahead = (i: number, d: number): boolean => {
      const [x, z] = A3_CLEANER_ROUTE[i]!;
      const yaw = A3_CLEANER_FACES[i]!;
      return mine.some((p) => p.collide && Math.abs(top(p) - 0.75) < 1e-6 && Math.abs(p.c[0] - (x + Math.sin(yaw) * d)) < p.s[0] / 2 + 0.05 && Math.abs(p.c[2] - (z + Math.cos(yaw) * d)) < p.s[2] / 2 + 0.05);
    };
    expect(ahead(0, 2.0)).toBe(true);
    expect(ahead(2, 2.0)).toBe(true);
    expect(ahead(4, 1.0)).toBe(true);
  });

  it('the loop takes about 41 s on the walker (25.4 m at his patrol pace plus three 5 s stops; LD 4.3: 25-45 s), with stops of 5 s (LD: 3-6 s); he is in office 3 about 15 s', () => {
    const len = A3_CLEANER_ROUTE.reduce((n, a, i) => n + hyp2(A3_CLEANER_ROUTE[(i + 1) % 7]![0] - a[0], A3_CLEANER_ROUTE[(i + 1) % 7]![1] - a[1]), 0);
    expect(len).toBeCloseTo(25.44, 1);
    const { left } = walkLoop(A3_CLEANER_WAITS, 200);
    const first = left.filter(([, i]) => i === 0).map(([t]) => t);
    expect(first.length).toBeGreaterThanOrEqual(3);
    const cycle = first[2]! - first[1]!;
    expect(cycle).toBeGreaterThan(38);
    expect(cycle).toBeLessThan(45);
    expect(Math.abs(cycle - (len / patrolSpeed + 3 * 5 + 4 * A3_PASS_WAIT))).toBeLessThan(2.5);
    expect(first[0]!).toBeCloseTo(5, 1);
    for (const i of [0, 2, 4]) {
      expect(A3_CLEANER_WAITS[i]).toBeGreaterThanOrEqual(3);
      expect(A3_CLEANER_WAITS[i]).toBeLessThanOrEqual(6);
    }
    // office 3 is his from the second partition door out and back: the walk in (4.4 m), the 5 s stop, the walk out (4.4 m)
    const inThree = (hyp2(95.5 - 91.2, 1.5 - 2.4) * 2) / patrolSpeed + 5;
    expect(inThree).toBeGreaterThan(13);
    expect(inThree).toBeLessThan(18);
  });

  it('the check has teeth: the doc\'s pass-through waits of 0 freeze a PatrolWalker at the first corner, which is why the loop pauses 0.1 s there', () => {
    expect(walkLoop([5, 0, 5, 0, 5, 0, 0], 200).stuck).toBe(false); // (merge) master guard-ai S2 fix: a wait of 0 passes through now; the 0.1 s pause stays
    expect(walkLoop(A3_CLEANER_WAITS, 200).stuck).toBe(false);
    expect(A3_PASS_WAIT).toBeGreaterThan(0);
  });

  it('he reads no further than his office: the frosted partitions, the corridor wall and the shut doors stop his sight from every stop to every other office', () => {
    const eye = 1.6;
    const sees = (a: readonly [number, number], z: readonly [number, number], open: readonly string[] = []): boolean => {
      const from = [a[0], eye, a[1]] as const;
      const to = [z[0], eye, z[1]] as const;
      return !solid.some((p) => segHits(from, to, p)) && !leaves.some((l) => !open.includes(l.id) && segHits(from, to, l.leaf));
    };
    const stops = A3_CLEANER_ROUTE.filter((_, i) => i === 0 || i === 2 || i === 4);
    const rooms = [[82.5, 4.3], [88.3, 4.3], [94.1, 4.3]] as const;
    // from his own office he sees across it; from a stop in another office he sees none of the others (the partitions are glass: solid to sight here)
    expect(sees(stops[0]!, rooms[0])).toBe(true);
    expect(sees(stops[1]!, rooms[1])).toBe(true);
    expect(sees(stops[2]!, rooms[2])).toBe(true);
    for (const [i, room] of rooms.entries()) for (const [k, stop] of stops.entries()) if (i !== k) expect(sees(stop, room), `stop ${k} -> office ${i + 1}`).toBe(false);
    // and none of the corridor, the lobbies or the camera's lane
    for (const stop of stops) for (const spot of [[88.25, 10.75], [78.5, 10.75], [98, 10.75]] as const) expect(sees(stop, spot), `stop (${stop}) -> (${spot})`).toBe(false);
    // teeth: with the first communicating door open he reads office 2 from office 1's doorway line
    expect(sees([83, 2.4], [88.3, 2.4], [A3_DOOR_COMM1])).toBe(true);
  });

  it('the lure (EnemyManager.lightsOut, 25 m): every office switch reaches him on every point of his loop; the circuit table\'s lure stops are his desks; he lands inside an office', () => {
    const switches = [...A3_SW_OFFICE, A3_SW_CORR];
    for (const s of switches) for (const [x, z] of A3_CLEANER_ROUTE) expect(hyp2(x - s.x, z - s.z), `${s.id} from (${x}, ${z})`).toBeLessThan(LURE_RANGE);
    for (const n of [1, 2, 3]) expect(circuitOf(30 + n)!.lure).toEqual({ guard: A3_CLEANER, from: [72 + 7 * n + 4.5, 4] });
    // office 1's switch brings him to the lobby door's wall; the way from there to the switch is open floor
    expect(walkBlocked(83, 3, 80.4, 6.0)).toBeNull();
    // office 3's switch beside its corridor door: he stands at the door with his back to the far desk, walkable from the far desk
    expect(walkBlocked(95.5, 1.5, 93.0, 7.9)).toBeNull();
    // the corridor switch (78.6, 12.7) reaches him from office 1 (about 10 m); he leaves by the lobby door (walkable)
    expect(walkBlocked(83, 3, 80.4, 4.6)).toBeNull();
    expect(walkBlocked(80.4, 4.6, 78.0, 4.6)).toBeNull();
    expect(walkBlocked(78.0, 4.6, 78.6, 11.7)).toBeNull();
  });
});

describe('A3 the Office Range: the steps, the claim, the pass zones and the radio', () => {
  it('three steps in route order: the jam relay (flag a3-far1, A / B lines), the swap (flag a3-far) and one closing line; no timer', () => {
    const steps = def.objectives!.filter((o) => o.bay === 'A3');
    expect(steps.map((o) => o.id)).toEqual(['a3-in', 'a3-swap', 'a3-lock']);
    expect(inStep.done).toEqual({ flag: A3_FAR1_FLAG });
    expect(swapStep.done).toEqual({ flag: A3_FAR_FLAG });
    for (const o of steps.slice(0, 2)) {
      expect(o.a).toBeDefined();
      expect(o.b).toBeDefined();
      expect(o.a).not.toBe(o.b);
      expect(o.timer).toBeUndefined();
    }
    expect(steps[2]!.done).toBeUndefined();
    expect(steps.filter((o) => o.done === undefined)).toHaveLength(1);
    expect(inStep.a).toMatch(/Hold the jammer/);
    expect(inStep.b).toMatch(/recess first/);
    expect(swapStep.b).toMatch(/Jam the camera from the far lobby/);
    expect(steps[2]!.text).toBe('Both of you into holding room three.');
    // the course validates with the set's flags and devices
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
  });

  it('every line fits 90 characters, no em or en dash; ids fit the wire; the radio is the doc\'s three lines', () => {
    for (const o of def.objectives!.filter((x) => x.bay === 'A3')) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(/[–—]/.test(t), t).toBe(false);
      }
      expect(o.id.length).toBeLessThanOrEqual(OBJECTIVE_ID_MAX);
    }
    expect(part.bay.radio.map((r) => r.at)).toEqual(['enter', 'enter', 'a3-in']);
    for (const r of part.bay.radio) {
      expect(r.text.length, r.text).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(r.text), r.text).toBe(false);
    }
    expect(part.bay.radio[0]!.text).toBe('That camera sends you back to the lobby if it sees you. Jam it for each other.');
    expect(part.bay.radio[1]!.text).toBe("It sees in the dark as well, so the light switch won't save you.");
    expect(part.bay.radio[2]!.text).toBe('Good. Now the other way round.');
  });

  it('the first player into the corridor takes B, the other is A; until then the lead (P1 in this odd set) reads A; the first claim stands; the lobby claims nothing', () => {
    let s = runAt([77.8, 10.75], [77.0, 9.0]);
    expect(s.roleClaimed()).toBe(false);
    expect(s.roleOf(0)).toBe('a');
    expect(s.stepLine(inStep, 0)).toBe(inStep.a);
    expect(s.stepLine(inStep, 1)).toBe(inStep.b);
    // P2 walks into the corridor first: P2 is B, P1 is A
    s.setPlayer(1, 82, 0, A3_CORRIDOR.at.z, false);
    s.update(1 / 60);
    expect(s.roleClaimed()).toBe(true);
    expect(s.roleOf(1)).toBe('b');
    expect(s.roleOf(0)).toBe('a');
    expect(s.stepLine(inStep, 1)).toBe(inStep.b);
    expect(s.stepLine(inStep, 0)).toBe(inStep.a);
    // the other walks in later: nothing changes
    s.setPlayer(0, 85, 0, A3_CORRIDOR.at.z, false);
    s.update(1 / 60);
    expect(s.roleOf(1)).toBe('b');
    // P1 first: P1 is B
    s = runAt([77.8, 10.75], [77.0, 9.0]);
    s.setPlayer(0, 80, 0, 11, false);
    s.update(1 / 60);
    expect(s.roleOf(0)).toBe('b');
    expect(s.stepLine(inStep, 0)).toBe(inStep.b);
    expect(s.stepLine(inStep, 1)).toBe(inStep.a);
    // the recess is not the corridor (z 8.5 < 9): nothing claims there
    s = runAt([77.8, 10.75], [A3_HIDE.x, A3_HIDE.z]);
    expect(s.roleClaimed()).toBe(false);
    // the claim is a zone claim of B over the hall box and the floor (y below 1)
    expect(part.bay.roles).toEqual([{ role: 'b', zone: { box: [79.5, 9, 97, 12.5], y1: 1 } }]);
  });

  it('the pass zones: one player in the east lobby ticks the first step, both tick the swap; flags are the set\'s external flags; the east lobby is inside the box', () => {
    const [far1, far] = part.passZones;
    expect(far1).toMatchObject({ flag: A3_FAR1_FLAG, floorY: 0, any: true, box: A3_FAR_ZONE });
    expect(far).toMatchObject({ flag: A3_FAR_FLAG, floorY: 0, box: A3_FAR_ZONE });
    expect(far!.any).toBeUndefined();
    expect(part.externalFlags).toEqual([A3_FAR1_FLAG, A3_FAR_FLAG]);
    expect(A3_FAR_ZONE[0]).toBeGreaterThanOrEqual(97);
    expect(A3_FAR_ZONE[2]).toBeLessThanOrEqual(99.75);
    const s = runAt([77.8, 10.75], [77.0, 9.0]);
    expect(s.isStepDone('a3-in')).toBe(false);
    s.setFlag(A3_FAR1_FLAG);
    s.update(1 / 60);
    expect(s.isStepDone('a3-in')).toBe(true);
    expect(s.isStepDone('a3-swap')).toBe(false);
    s.setFlag(A3_FAR_FLAG);
    s.update(1 / 60);
    expect(s.isStepDone('a3-swap')).toBe(true);
  });
});

describe('A3 the Office Range: the lights (LIGHTING-PLAN 3, A3)', () => {
  const by = (g: number) => lamps.filter((l) => l.group === g);

  it('fourteen lamps on the plan\'s circuits 30-34: corridor 6, offices 2 + 2 + 2, lobbies 2; every one grouped, electric and destructible as its row says', () => {
    expect(lamps).toHaveLength(14);
    expect([30, 31, 32, 33, 34].map((g) => by(g).length)).toEqual([6, 2, 2, 2, 2]);
    for (const l of lamps) {
      const row = circuitOf(l.group);
      expect(row, `lamp ${l.id} group ${l.group}`).toBeDefined();
      expect(row!.room).toBe('A3');
      expect(l.electric).toBe(row!.electric);
      expect(l.destructible).toBe(row!.destructible);
    }
    for (const g of [30, 31, 32, 33, 34]) expect(by(g).length).toBe(circuitOf(g)!.lamps);
    expect(circuitOf(34)!.kind).toBe('house');
    for (const g of [30, 31, 32, 33]) expect(circuitOf(g)!.kind).toBe('switch');
  });

  it('the corridor panels are at x 81-96 on its centre line under the slab; each office\'s two are inside its walls; the lobby downlights are in the lobbies', () => {
    expect(by(30).map((l) => l.x).sort((p, q) => p - q)).toEqual([81, 84, 87, 90, 93, 96]);
    for (const l of by(30)) {
      expect(l.z).toBeCloseTo(A3_CORRIDOR.at.z, 9);
      expect(l.y).toBeCloseTo(2.95, 9);
    }
    for (const [n, [x0, x1]] of A3_OFFICES.entries()) for (const l of by(31 + n)) expect(inBox([x0, 0.25, x1, 8.7], l.x, l.z), `office ${n + 1} lamp (${l.x}, ${l.z})`).toBe(true);
    const [w, e] = by(34).sort((p, q) => p.x - q.x);
    expect(w!.x).toBeLessThan(79.35);
    expect(e!.x).toBeGreaterThan(97.15);
  });

  it('the part\'s groups are exactly the plan\'s A3 rows (so the client hears every switch), and each has a lamp', () => {
    const plan = marlowCourseGroups();
    expect(part.groups).toEqual({ 'a3-corridor': plan['a3-corridor'], 'a3-office1': plan['a3-office1'], 'a3-office2': plan['a3-office2'], 'a3-office3': plan['a3-office3'], 'a3-lobbies': plan['a3-lobbies'] });
    for (const g of Object.values(part.groups)) expect(lamps.some((l) => l.group === g)).toBe(true);
    for (const [k, g] of Object.entries(plan)) if (k.startsWith('a3-')) expect(course.groups![k]).toBe(g);
  });

  it('four wall switches: the corridor\'s in the west lobby, each office\'s inside its door (office 2\'s on the recess back\'s jamb); the lobbies have none', () => {
    expect(part.switches.map((s) => [s.id, s.group])).toEqual([[A3_SW_CORR.id, 30], ['a3-sw-off1', 31], ['a3-sw-off2', 32], ['a3-sw-off3', 33]]);
    const corr = part.switches[0]!;
    expect(inBox([76.25, 0.25, 79.35, 12.75], corr.pos.x, corr.pos.z)).toBe(true);
    expect(hyp2(corr.pos.x - circuitOf(30)!.switches[0]!.x, corr.pos.z - circuitOf(30)!.switches[0]!.z)).toBeLessThanOrEqual(1);
    const doors = [doorAnchor(A3_DOOR_LOBBY), doorAnchor(A3_DOOR_RECESS), doorAnchor(A3_DOOR_CORR)];
    for (const [n, s] of part.switches.slice(1).entries()) {
      expect(s.pos.y).toBeCloseTo(1.2, 9);
      expect(inBox([A3_OFFICES[n]![0], 0.25, A3_OFFICES[n]![1], 8.7], s.pos.x, s.pos.z), s.id).toBe(true);
      expect(hyp2(s.pos.x - doors[n]!.hinge.x, s.pos.z - doors[n]!.hinge.z), `${s.id} by its door`).toBeLessThanOrEqual(2.2);
      expect(circuitOf(s.group)!.switches[0]!.id).toBe(s.id);
    }
    expect(circuitOf(34)!.switches).toEqual([]);
    expect((lay.switches ?? []).filter((s) => s.group === 34)).toEqual([]);
  });

  it('the standby zone: the set at 0.14 under its 3.0 m ceiling (maxY 2.9, ENGINE-ANSWERS Q3)', () => {
    expect(part.ambientZones).toEqual([{ id: 'A3', box: [76, 0, 100, 13], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 2.9 }]);
  });

  it('the corridor stays lit for the meter and the camera agree: the pool reads lit, with 30 off it reads dark (the camera still sees: IR); each office goes dark on its own switch and the next office stays lit (the tuned levels the light frame re-checks)', () => {
    const spots = LIGHT_SPOTS.a3OfficeRange;
    const at = (n: string) => spots.find((s) => s.name === n)!;
    expect(at('A3 corridor centre').band).toBe('pool');
    expect(tuned['A3 corridor centre']!).toBeGreaterThanOrEqual(MARLOW_LEVEL.poolMin);
    expect(at('A3 corridor centre cut')).toMatchObject({ band: 'cut', off: [30], x: 88.25, z: 10.75 });
    expect(tuned['A3 corridor centre cut']!).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
    for (const n of [1, 2, 3]) {
      expect(at(`A3 office ${n} middle`).band).toBe('read');
      expect(tuned[`A3 office ${n} middle`]!).toBeGreaterThanOrEqual(MARLOW_LEVEL.readMin);
      expect(at(`A3 office ${n} cut`)).toMatchObject({ band: 'cut', off: [30 + n] });
      expect(tuned[`A3 office ${n} cut`]!).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
      // sampled 1.5 m or more from the frosted partitions (the neighbour's lamps pass the glass, A3-C6)
      const x = at(`A3 office ${n} middle`).x;
      for (const px of A3_PARTITIONS) expect(Math.abs(x - px)).toBeGreaterThanOrEqual(1.5);
    }
    for (const n of ['A3 west lobby', 'A3 east lobby', 'A3 far desk']) {
      expect(at(n).band, n).toBe('read');
      expect(tuned[n]!, n).toBeGreaterThanOrEqual(MARLOW_LEVEL.readMin);
    }
    expect(Math.abs(tuned['A3 corridor standby']! - MARLOW_LEVEL.standby)).toBeLessThanOrEqual(0.03);
    expect(part.lightSpots.filter((s) => s.band === 'pocket')).toEqual([]);
  });
});

describe('A3 the Office Range: map data the e2e and the modes read', () => {
  it('debug points A3-entry / vantage / recess / mid / east / office2 inside the set on clear floor; camera spaces all tight; nav seeds in the lobbies, the corridor and each office', () => {
    expect(part.debugPoints.map((d) => d.id)).toEqual(['A3-entry', 'A3-vantage', 'A3-recess', 'A3-mid', 'A3-east', 'A3-office2']);
    for (const d of part.debugPoints) {
      expect(inBox(box, d.pos.x, d.pos.z)).toBe(true);
      expect(blockedAt(d.pos.x, d.pos.z, 0.3), d.id).toEqual([]);
    }
    expect(part.camSpaces.every((c) => c.size === 'tight')).toBe(true);
    for (const x of [77.5, 88.25, 98.5, 82.5, 88.3, 94.1]) expect(part.navSeeds.some((s) => Math.abs(s.x - x) < 0.01)).toBe(true);
    for (const s of part.navSeeds) expect(blockedAt(s.x, s.z, 0.3)).toEqual([]);
  });

  it('shot vantages for the west archway and office 2 through its communicating door; no lasers, scanners, consoles or hide objects (a camera and a guard)', () => {
    expect(part.shotVantages.map((v) => v.name)).toEqual(['a3-lobby', 'a3-office2']);
    expect(part.lasers).toEqual([]);
    expect(part.laserPanels).toEqual([]);
    expect(part.scanners).toEqual([]);
    expect(part.consoles).toEqual([]);
    expect(part.hideSpots).toEqual([]);
    expect(part.bay.gates).toEqual([]);
    expect(part.bay.drills).toEqual([]);
  });

  it('the one camera is the set\'s whole camera budget, and the map still holds 12 or fewer', () => {
    expect(part.cameras).toHaveLength(1);
    expect(lay.security!.devices.length).toBeLessThanOrEqual(12);
    expect(JAMMER.useMax).toBe(5);
    expect(JAMMER.cooldown).toBe(5);
    expect(JAMMER.reboot).toBe(1.5);
  });
});

describe('A3 the Office Range: dressing (slice 3 step 5)', () => {
  const kitReport = JSON.parse(readFileSync('src/world/kit/assets/facility-kit.json', 'utf8')) as { pieces: Record<string, { meshes: Record<string, number> }> };
  const propReport = JSON.parse(readFileSync('src/world/props/assets/facility-props.json', 'utf8')) as PropReport;
  const area = { x0: box[0], z0: box[1], x1: box[2], z1: box[3] };
  const own = part.props;
  const grey = mine.slice(0, GREY.boxes);
  const dressing = mine.slice(GREY.boxes);
  const skins = dressing.filter((p) => !p.collide);
  const colliders = dressing.filter((p) => p.collide);
  /** The props' own boxes (only the cleaner's trolley's is written; the desks' lie inside the greybox desks). */
  const propBoxes = own.flatMap((p) => propCollisionBox(p) ?? []);
  const trolleyBox = colliders[0]!;
  const upright = (p: BoxPiece): BoxPiece => (Math.abs(Math.sin(p.yaw)) > 0.5 ? { ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 } : { ...p, yaw: 0 });
  const tb = upright(trolleyBox);
  /** Is (x, z) within `r` of the dressing collider's footprint? */
  const dressNear = (x: number, z: number, r: number): boolean => hyp2(Math.max(Math.abs(x - tb.c[0]) - tb.s[0] / 2, 0), Math.max(Math.abs(z - tb.c[2]) - tb.s[2] / 2, 0)) < r;
  const dressWalk = (x0: number, z0: number, x1: number, z1: number, r = MOVEMENT.radius): string | null => {
    const n = Math.ceil(hyp2(x1 - x0, z1 - z0) / 0.1);
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const z = z0 + ((z1 - z0) * i) / n;
      if (dressNear(x, z, r)) return `(${x.toFixed(2)}, ${z.toFixed(2)})`;
    }
    return null;
  };
  /** The skins whose centre lies in the plan box and under `y1` (what a region is dressed with). */
  const near = (x0: number, x1: number, z0: number, z1: number, y1 = 3.1): number => skins.filter((p) => p.c[0] > x0 && p.c[0] < x1 && p.c[2] > z0 && p.c[2] < z1 && p.c[1] < y1).length;

  it('the greybox is as S3 built it: its 33 boxes (checksum), 14 lamps, 5 doors, no anchor; the only new collision is the trolley\'s one box', () => {
    let sum = 0;
    for (const p of grey) sum += (p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw) * (p.collide ? 1 : 1.5) * (p.visible === false ? 1.25 : 1) * (p.overhead ? 1.1 : 1);
    expect(sum).toBeCloseTo(GREY.checksum, 3);
    expect(grey.filter((p) => p.collide)).toHaveLength(GREY.solids);
    expect(grey.every((p) => p.noLedge || !p.collide)).toBe(true);
    // four desk boxes (inside the greybox desks, not written) and the trolley's (written)
    expect(propBoxes).toHaveLength(5);
    expect(colliders).toHaveLength(1);
    expect(built.counts.sets.a3OfficeRange).toEqual({ lights: GREY.lights, solids: GREY.solids + 1, doors: GREY.doors, anchors: GREY.anchors });
    expect(lamps).toHaveLength(GREY.lights);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A3-3', 'A3-13', 'A3-14', 'A3-15', 'A3-16', 'A3-17', 'A3-18']));
    expect(Object.keys(part.doors)).toHaveLength(GREY.doors);
    // S34-check polish: the register's numbering gap (A3-3, office 2's door reveal) is filled, with no pieces of its own
    expect(part.register.find((r) => r.id === 'A3-3')).toEqual({ id: 'A3-3', element: expect.stringContaining('door reveal') });
  });

  it('every hand-built dressing box is a visual skin: no collision, noLedge, a side under 5 cm (out of the canonical light shapes, so the light is the greybox\'s); the one new collider is invisible and noLedge', () => {
    expect(skins.length).toBeGreaterThan(300);
    for (const p of skins) {
      expect(p.noLedge, `skin at (${p.c.join(', ')})`).toBe(true);
      expect(Math.min(...p.s), `skin at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBeLessThan(CANON_MIN_THICK);
      expect(p.visible).not.toBe(false);
      expect(p.overhead).toBeUndefined();
    }
    expect(dressing.filter((p) => p.visible !== false && Math.min(...p.s) >= CANON_MIN_THICK)).toEqual([]);
    expect(trolleyBox.visible).toBe(false);
    expect(trolleyBox.noLedge).toBe(true);
    expect(top(trolleyBox)).toBeLessThan(1.9);
    // the ceiling skins hang above every lamp's bottom (the lamps and the camera stay below the tile, so no skin is between a lamp and the floor)
    const ceilingSkins = skins.filter((p) => bottom(p) > 2.9);
    expect(ceilingSkins.length).toBeGreaterThan(40);
    for (const l of lamps) for (const p of ceilingSkins) expect(bottom(p), `ceiling skin at (${p.c.join(', ')}) vs lamp at ${l.x}, ${l.z}`).toBeGreaterThanOrEqual(l.y + 0.019);
    for (const p of ceilingSkins) expect(top(p)).toBeLessThanOrEqual(3.0 + 1e-9);
    // the floor paint is under the greybox's floor marks (the hide spot and the jam posts, 2 cm), so those still read
    const floorSkins = skins.filter((p) => top(p) < 0.02);
    expect(floorSkins.length).toBeGreaterThan(40);
    const marks = grey.filter((p) => !p.collide && top(p) > 0.02 && top(p) < 0.03);
    expect(marks).toHaveLength(3);
    for (const p of floorSkins) expect(top(p)).toBeLessThan(top(marks[0]!));
  });

  it('budgets (computed): kit triangles <= 60 k; the props pass FacilityProps.check against the set box at 60 k triangles and 12 draws, with the facility\'s set-side plate in the box counted', () => {
    const kitIn = lay.kit!.instances.filter((i) => inBox(box, i.x, i.z));
    const kitTris = kitTriangles({ instances: kitIn, doors: [] }, kitReport);
    expect(kitIn.some((i) => i.piece === 'wallPanel')).toBe(true);
    expect(kitTris).toBeGreaterThan(0);
    expect(kitTris, `${kitTris} kit triangles`).toBeLessThanOrEqual(60_000);
    // any facility prop in the box (L2's far door's set-side plate) counts against the set's props
    const facilityIn = built.facility.props.filter((p) => inBox(box, p.x, p.z));
    expect(facilityIn.map((p) => p.prop)).toEqual(['signPlate']);
    const counted = [...own, ...facilityIn];
    const checker = (list: readonly PropPlacement[]): FacilityProps => {
      const f = new FacilityProps();
      f.placements.push(...list);
      return f;
    };
    expect(checker(counted).check(area, propReport)).toEqual([]);
    expect(propTriangles(counted, propReport)).toBeLessThanOrEqual(PROP_SET_BUDGET.tris);
    expect(propDraws(counted, propReport)).toBeLessThanOrEqual(PROP_SET_BUDGET.draws);
    // officeDesk 4 (white, steel, plastic, screen) + officeChair 3 + cleanerTrolley 3 + the plates 2 (one draw per prop and material, however many instances)
    expect(propDraws(counted, propReport)).toBe(12);
    expect(own.map((p) => p.prop).sort()).toEqual([...Array<string>(4).fill('officeDesk'), ...Array<string>(5).fill('officeChair'), 'cleanerTrolley', ...Array<string>(5).fill('signPlate')].sort());
  });

  it('every prop with an emissive part carries a circuit group (S3-7 S1, light parity): the five sign plates are on the corridor panels (30, the two in the corridor) and the landlord\'s lobby circuit (34, the three in the lobbies); the desk screens are dark', () => {
    const plan = new Set(Object.values(marlowCourseGroups()));
    const [g0, g1] = setGroups('a3OfficeRange');
    const glowing = own.filter((p) => propGlows(p) && !PROP_OWN_SUPPLY.includes(p.prop));
    expect(glowing.map((p) => p.prop)).toEqual(['signPlate', 'signPlate', 'signPlate', 'signPlate', 'signPlate']);
    for (const p of glowing) {
      expect(p.group, `${p.prop} at ${p.x}, ${p.y}, ${p.z}`).toBeDefined();
      expect(plan.has(p.group!), `${p.prop} group ${p.group}`).toBe(true);
      expect(p.group!).toBeGreaterThanOrEqual(g0);
      expect(p.group!).toBeLessThanOrEqual(g1);
    }
    expect(glowing.filter((p) => p.x >= 79.5 && p.x <= 97).map((p) => p.group)).toEqual([30, 30]);
    expect(glowing.filter((p) => p.x < 79.5 || p.x > 97).map((p) => p.group)).toEqual([34, 34, 34]);
    for (const d of own.filter((p) => p.prop === 'officeDesk')) expect(propGlows(d)).toBe(false);
  });

  it('every kit glow in A3 carries a circuit: the lobby panels, coves and skirting are on the landlord\'s group 34 (a plan row of the set), floor to slab, only in the two lobbies; no lamp was added', () => {
    const plan = new Set(Object.values(marlowCourseGroups()));
    const [g0, g1] = setGroups('a3OfficeRange');
    const kitIn = lay.kit!.instances.filter((i) => inBox(box, i.x, i.z));
    const glowing = kitIn.filter((i) => ['wallPanel', 'skirting', 'column', 'handrail'].includes(i.piece) || (i.piece === 'ledSlot' && !i.noLed));
    expect(glowing.length).toBeGreaterThan(30);
    for (const i of glowing) {
      expect(i.group, `${i.piece} at ${i.x}, ${i.y}, ${i.z}`).toBe(34);
      expect(plan.has(i.group!)).toBe(true);
      expect(i.group!).toBeGreaterThanOrEqual(g0);
      expect(i.group!).toBeLessThanOrEqual(g1);
      expect(i.y).toBeLessThan(3.0);
      // the lobbies only: the corridor (x 79.5-97) and the offices keep their plaster
      expect(i.x < 79.5 || i.x > 97, `${i.piece} at ${i.x}`).toBe(true);
    }
    const panels = glowing.filter((i) => i.piece === 'wallPanel');
    expect(panels.filter((i) => i.x < 79.5).length).toBeGreaterThan(8);
    expect(panels.filter((i) => i.x > 97).length).toBeGreaterThan(8);
    // the hall over the set is a sealed void (slab 3.0-3.2, hall walls to 10 m, roof slab), so no panel there
    const ceilingSlab = mine.find((p) => p.overhead)!;
    expect(top(ceilingSlab)).toBeCloseTo(3.2, 9);
    // the two sliding doors' 1.0 m frames stay clear (L2 on x 76 at z 10, L3 on x 100 at z 10), the corridor switch's plate is clear
    for (const i of panels.filter((q) => Math.abs(q.x - 76.25) < 0.1)) expect(Math.abs(i.z - 10) - 0.6 * i.sx, `L2 panel at z ${i.z}`).toBeGreaterThanOrEqual(1.0 - 1e-6);
    for (const i of panels.filter((q) => Math.abs(q.x - 99.75) < 0.1)) expect(Math.abs(i.z - 10) - 0.6 * i.sx, `L3 panel at z ${i.z}`).toBeGreaterThanOrEqual(1.0 - 1e-6);
    for (const i of panels.filter((q) => Math.abs(q.z - 12.75) < 0.1 && q.x < 79.5)) expect(Math.abs(i.x - A3_SW_CORR.x) - 0.6 * i.sx, 'the corridor switch').toBeGreaterThanOrEqual(0.2);
    // no lamp was added: the fourteen of the plan, each on its row
    expect(lamps).toHaveLength(14);
    for (const l of lamps) expect(l.group).toBeGreaterThanOrEqual(g0);
  });

  it('the four desk props stand over the greybox desks: each one\'s gameplay box (not written) lies inside a greybox desk box, 1 cm up, its front 5 cm inside the box front; screens dark; the far desk has no prop', () => {
    const desks = own.filter((p) => p.prop === 'officeDesk');
    expect(desks).toHaveLength(4);
    const greyDesks = grey.filter((p) => p.collide && Math.abs(top(p) - 0.75) < 1e-6);
    expect(greyDesks).toHaveLength(5);
    expect(PROP_HUNG).not.toContain('officeDesk');
    for (const [k, p] of desks.entries()) {
      const wb = propCollisionBox(p)![0]!;
      expect(p.y).toBeCloseTo(A3_DESK_LIFT, 9);
      expect(p.tint).toEqual([0, 0, 0]);
      const d = A3_DESKS[k]!;
      const host = greyDesks.find((g) => Math.abs(g.c[0] - (d.x0 + d.x1) / 2) < 1e-9 && Math.abs(g.c[2] - (d.z0 + d.z1) / 2) < 1e-9)!;
      expect(host, `greybox desk under desk prop ${k}`).toBeDefined();
      expect(wb.c[0] - wb.s[0] / 2).toBeGreaterThanOrEqual(host.c[0] - host.s[0] / 2 - 1e-9);
      expect(wb.c[0] + wb.s[0] / 2).toBeLessThanOrEqual(host.c[0] + host.s[0] / 2 + 1e-9);
      expect(wb.c[2] - wb.s[2] / 2).toBeGreaterThanOrEqual(host.c[2] - host.s[2] / 2 - 1e-9);
      expect(wb.c[2] + wb.s[2] / 2).toBeLessThanOrEqual(host.c[2] + host.s[2] / 2 - 0.05 + 1e-9);
      expect(wb.c[1] + wb.s[1] / 2, 'the prop box is not above the greybox top').toBeLessThanOrEqual(top(host) + 1e-9);
      // the prop's box was not written (the greybox desk is the collision): no dressing collider stands on it
      expect(colliders.some((c) => Math.abs(c.c[0] - wb.c[0]) < 1e-6 && Math.abs(c.c[2] - wb.c[2]) < 1e-6)).toBe(false);
    }
    // the far desk (96.15-96.85 x 0.5-2.5) is skinned instead: top, panels and a screen on its stand; no desk or chair prop stands within it
    expect(own.some((p) => ['officeDesk', 'officeChair'].includes(p.prop) && p.x > 96.1 && p.z > 0.4 && p.z < 2.6)).toBe(false);
    expect(near(96.1, 96.9, 0.4, 2.6, 1.3)).toBeGreaterThan(8);
    // the chairs have no collision (PROPS: none, small) and sit at the desks' open fronts; the fifth is pushed out, away from the cleaner's far stop
    const chairs = own.filter((p) => p.prop === 'officeChair');
    expect(chairs).toHaveLength(5);
    for (const p of chairs) expect(propCollisionBox(p)).toBeNull();
    for (const c of A3_CHAIRS.slice(0, 4)) expect(c.z).toBeGreaterThan(A3_DESKS.find((d) => Math.abs((d.x0 + d.x1) / 2 - c.x) < 1e-9)!.z1 - 0.2);
    expect(hyp2(A3_CHAIRS[4]!.x - 95.5, A3_CHAIRS[4]!.z - 1.5)).toBeGreaterThan(1.5);
  });

  it('the cleaner\'s trolley is parked in office 2\'s south-west corner: one see-through 1.1 x 0.5 x 1.0 box, noLedge, clear of the communicating door\'s swing, his loop, his lured walks and both hide pockets (the bay stays free)', () => {
    const trolleys = own.filter((p) => p.prop === 'cleanerTrolley');
    expect(trolleys).toHaveLength(1);
    expect(trolleys[0]!.x).toBeCloseTo(A3_TROLLEY.x, 9);
    expect(trolleys[0]!.z).toBeCloseTo(A3_TROLLEY.z, 9);
    // the prop's own box is see-through (collision-only); the builder marks the written copy noLedge (checked above)
    expect(propCollisionBox(trolleys[0]!)).toEqual([expect.objectContaining({ visible: false })]);
    expect(trolleyBox.noLedge).toBe(true);
    expect(tb.s[0]).toBeCloseTo(0.5, 9);
    expect(tb.s[2]).toBeCloseTo(1.1, 9);
    expect(top(tb)).toBeCloseTo(1.0, 9);
    // inside office 2 (x 85.45-91.15), against its south wall and the partition: no body fits in the 0.1 m beside it (so no new pocket)
    const x0 = tb.c[0] - tb.s[0] / 2;
    const z0 = tb.c[2] - tb.s[2] / 2;
    const z1 = tb.c[2] + tb.s[2] / 2;
    expect(x0 - 85.45).toBeLessThan(2 * MOVEMENT.radius);
    expect(z0 - 0.25).toBeLessThan(2 * MOVEMENT.radius);
    // the communicating door at x 85.4, z 1.8-3.0 swings into the room 1.2 m: the trolley ends 0.4 m short of its hinge
    expect(A3_COMM_Z[0] - z1).toBeGreaterThanOrEqual(0.3);
    // the pockets and every route the greybox tests rely on are open floor with the trolley written (the greybox cases above run on all the solids too)
    for (const [x, z] of [[80.4, 7.8], [90.55, 7.9], [A3_HIDE.x, A3_HIDE.z], [83, 3], [88.3, 3], [95.5, 1.5], [88.3, 4.3], [82.5, 4.3], [94.1, 4.3]] as const) expect(dressNear(x, z, MOVEMENT.radius), `spot (${x}, ${z})`).toBe(false);
    for (let i = 1; i < A3_CLEANER_ROUTE.length; i++) expect(dressWalk(A3_CLEANER_ROUTE[i - 1]![0], A3_CLEANER_ROUTE[i - 1]![1], A3_CLEANER_ROUTE[i]![0], A3_CLEANER_ROUTE[i]![1]), `loop leg ${i}`).toBeNull();
    for (const sw of A3_SW_OFFICE) for (const [x, z] of A3_CLEANER_ROUTE) expect(dressWalk(x, z, sw.x, sw.z), `lured walk to ${sw.id} from (${x}, ${z})`).toBeNull();
    // teeth: the same trolley parked in the bay (x 90.0-91.1, z 8.15-8.65) would close the pocket the greybox case stands a body in (0.25 m from its edge, under 0.3)
    const parked = { cx: 90.55, cz: 8.4, w: 1.1, d: 0.5 };
    expect(hyp2(Math.max(Math.abs(90.55 - parked.cx) - parked.w / 2, 0), Math.max(Math.abs(7.9 - parked.cz) - parked.d / 2, 0))).toBeLessThan(MOVEMENT.radius);
    // the trolley bay (x 90.0-91.15, z 7.0-8.7) and the desk-run recess keep their size: the tested bodies still stand and walk out with every solid counted
    for (const [x, z] of [[80.4, 7.8], [90.55, 7.9]] as const) {
      expect(blockedAt(x, z, 0.3), `pocket (${x}, ${z})`).toEqual([]);
      expect(walkBlocked(x, z, x, 5.0), `pocket (${x}, ${z}) out`).toBeNull();
    }
  });

  it('the corridor, the recess, the archways, the doors and the lobbies keep their widths and sight lines: no collider was added there, the hide spot stays hidden, both jam posts keep their clear line to the lens', () => {
    // the only dressing collider is in office 2's corner: nothing in the corridor box, the recess, the lobbies or on any door line
    expect(colliders.every((p) => p.c[2] < 3 && p.c[0] > 85.4 && p.c[0] < 91.2)).toBe(true);
    for (const id of [A3_DOOR_LOBBY, A3_DOOR_COMM1, A3_DOOR_COMM2, A3_DOOR_RECESS, A3_DOOR_CORR]) {
      const d = doorAnchor(id);
      expect(hyp2(d.hinge.x - tb.c[0], d.hinge.z - tb.c[2]), id).toBeGreaterThan(d.width / 2);
    }
    // widths: the corridor 3.5 m, the doors 1.2 m, the lobbies 3.1 and 2.6 m: a body of radius 0.3 walks each line with every solid
    expect(walkBlocked(88.25, 9.3, 88.25, 12.1)).toBeNull();
    expect(walkBlocked(79.0, 10.75, 97.6, 10.75)).toBeNull();
    expect(walkBlocked(76.6, 4.6, 79.1, 4.6)).toBeNull();
    expect(walkBlocked(97.4, 10.75, 99.4, 10.75)).toBeNull();
    for (const [a, c] of [[[78.9, 4.6], [80.4, 4.6]], [[88.25, 8.6], [88.25, 6.5]], [[92.0, 9.6], [92.0, 7.6]], [[84.6, 2.4], [86.2, 2.4]], [[90.4, 2.4], [92.0, 2.4]]] as const) expect(walkBlocked(a[0], a[1], c[0], c[1])).toBeNull();
    // the recess hide spot: still hidden from the lens for a crouched and a standing head, a body of 0.3 stands in it
    for (const y of HEADS) expect(clearLine(A3_HIDE.x, y, A3_HIDE.z), `head ${y}`).toBe(false);
    expect(blockedAt(A3_HIDE.x, A3_HIDE.z, 0.3)).toEqual([]);
    // the west and east jam posts keep a clear line to the lens at head height (no dressing box stands on it)
    for (const post of [A3_POST_WEST, A3_POST_EAST]) {
      for (const y of [1.1, 1.6]) {
        const hit = [...solid, ...leaves.map((l) => l.leaf)].find((p) => segHits([post.x, y, post.z], camPos, p));
        expect(hit, `post (${post.x}, ${post.z}) at ${y}`).toBeUndefined();
      }
    }
    // the camera still sees the corridor from x 84 east (range 14) as the greybox tests say; the offices and lobbies are unseen
    for (const x of [84, 87, 90, 93]) expect(seenAt(x, A3_CORRIDOR.at.z), `corridor x ${x}`).toBe(true);
    for (const [x, z] of [[82.5, 4.3], [88.3, 4.3], [94.1, 4.3], [77.8, 10.75], [98.5, 10.75]] as const) expect(seenAt(x, z), `(${x}, ${z})`).toBe(false);
  });

  it('nothing in the offices gives a new standing top or a solo way past the camera: every dressing box is a skin or the 1.0 m trolley; the desks and runs keep their 0.75 / 0.9 m greybox tops; no generated grip above 0.9 m in A3', () => {
    for (const p of dressing) if (p.collide) expect(top(p) < 1.9 && p.noLedge, `collider at (${p.c.join(', ')})`).toBe(true);
    // the greybox tops are unchanged: the desks and runs are the greybox's boxes, the skins on them stand at most 3 cm over
    const desks = grey.filter((p) => p.collide && Math.abs(top(p) - 0.75) < 1e-6);
    const runs = grey.filter((p) => p.collide && Math.abs(top(p) - 0.9) < 1e-6);
    expect(desks).toHaveLength(5);
    expect(runs).toHaveLength(4);
    for (const p of skins) if (p.c[0] > 80 && p.c[0] < 97 && p.c[2] < 8.7 && top(p) > 0.5 && top(p) < 1.0) expect(top(p), `skin at (${p.c.join(', ')})`).toBeLessThanOrEqual(0.95 + 1e-9);
    const generated = anchors.ledges.filter((l) => inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.3) && l.top >= 0.9);
    expect(generated.map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
    // the offices route still needs the camera's jam: the existing no-way-past cases run on every solid; here the dressing adds nothing beside the corridor doors
    for (const id of [A3_DOOR_RECESS, A3_DOOR_CORR]) {
      const d = doorAnchor(id);
      expect(dressNear(d.hinge.x, d.hinge.z, 3.0), id).toBe(false);
    }
  });

  it('the corridor, recess, offices, desks, runs, lifts, cupboard and switches are dressed: plaster on every face, door surrounds, ceiling tile in each room, floor sheets, the lifts and their plates, a back plate behind each switch', () => {
    // the corridor and the recess
    expect(near(79.5, 97, 9.0, 12.5, 3.05)).toBeGreaterThan(60);
    expect(near(87.55, 88.95, 8.0, 9.0, 3.05)).toBeGreaterThan(8);
    // plaster on the long walls: north face (z 12.47-12.5) and south face (z 9.0-9.03), floor to the slab
    const wallRun = (lo: number, hi: number, zlo: number, zhi: number): number => skins.filter((p) => p.c[2] > zlo && p.c[2] < zhi && p.s[0] > 2 && p.c[0] - p.s[0] / 2 <= lo + 1e-9 && p.c[0] + p.s[0] / 2 >= hi - 1e-9 && top(p) >= 2.99).length;
    expect(wallRun(79.5, 97, 12.46, 12.5)).toBe(1);
    expect(wallRun(79.5, 87.55, 9.0, 9.04)).toBe(1);
    expect(wallRun(92.6, 97, 9.0, 9.04)).toBe(1);
    // each office: carpet sheet, ceiling sheet, plaster and wall furniture
    for (const [x0, x1] of A3_OFFICES) {
      expect(skins.some((p) => Math.abs(p.c[0] - (x0 + x1) / 2) < 1e-6 && Math.abs(p.s[0] - (x1 - x0)) < 1e-6 && Math.abs(p.s[2] - (A3_OFFICE_Z1 - 0.25)) < 1e-6 && top(p) < 0.02), `carpet ${x0}`).toBe(true);
      expect(skins.some((p) => Math.abs(p.c[0] - (x0 + x1) / 2) < 1e-6 && Math.abs(p.s[0] - (x1 - x0)) < 1e-6 && Math.abs(p.s[2] - (A3_OFFICE_Z1 - 0.25)) < 1e-6 && bottom(p) > 2.9), `ceiling ${x0}`).toBe(true);
      expect(near(x0, x1, 0.25, A3_OFFICE_Z1, 3.05), `office ${x0}`).toBeGreaterThan(40);
    }
    // the steel surrounds of the communicating doors (both faces of both partitions: two jambs and a head each)
    for (const xp of A3_PARTITIONS) expect(skins.filter((p) => Math.abs(p.c[0] - xp) < 0.1 && p.c[2] > 1.6 && p.c[2] < 3.2 && p.s[0] < 0.05 && p.c[1] < 2.3).length).toBe(6);
    // the desks and runs
    for (const d of A3_DESKS) expect(near(d.x0 - 0.05, d.x1 + 0.05, d.z0 - 0.05, d.z1 + 0.05, 0.8), `desk x ${d.x0}`).toBeGreaterThanOrEqual(5);
    for (const r of A3_RUNS) expect(near(r.x0 - 0.05, r.x1 + 0.05, r.z0 - 0.05, r.z1 + 0.05, 0.95), `run x ${r.x0}`).toBeGreaterThanOrEqual(r.z0 > 7.5 ? 6 : 8);
    // lifts: two doors on each lobby's outer wall at z 1.4-2.5 and 2.9-4.0, each with its seam, frame and display; the call plates
    for (const [lo, hi] of [[76.28, 76.43], [99.57, 99.72]] as const) {
      for (const [a, e] of A3_LIFTS) expect(skins.filter((p) => p.c[0] > lo && p.c[0] < hi && p.c[2] > a - 0.1 && p.c[2] < e + 0.1 && p.c[1] < 2.5).length, `lift ${a}`).toBeGreaterThanOrEqual(6);
      expect(skins.filter((p) => p.c[0] > lo && p.c[0] < hi && p.c[2] > 4.2 && p.c[2] < 4.6).length, 'call plate').toBeGreaterThanOrEqual(3);
    }
    // the services cupboard on the east lobby's office wall: frame, door, six louvres, lock, label
    expect(skins.filter((p) => p.c[0] > 97.15 && p.c[0] < 97.3 && p.c[2] > A3_CUPBOARD_Z[0] - 0.1 && p.c[2] < A3_CUPBOARD_Z[1] + 0.1 && p.c[1] < 2.2).length).toBeGreaterThanOrEqual(10);
    // S34-check polish: every wall switch has a back plate behind it (0.3 m tall at 1.2 m, centred on the switch)
    const switches = lay.switches!.filter((s) => s.group >= 30 && s.group < 40);
    expect(switches).toHaveLength(4);
    for (const sw of switches) {
      const plate = skins.find((p) => Math.abs(p.c[1] - 1.2) < 1e-9 && Math.abs(p.s[1] - 0.3) < 1e-9 && Math.abs(p.c[0] - sw.pos.x) < 0.06 && Math.abs(p.c[2] - sw.pos.z) < 0.06);
      expect(plate, `back plate behind switch ${sw.group} at (${sw.pos.x}, ${sw.pos.z})`).toBeDefined();
    }
  });

  it('the plates hang where the doors are: over office 3\'s corridor door, office 2\'s recess door and office 1\'s lobby door, 1.2 m wide over 1.2 m doors, and a lift display over each lobby\'s pair; none has a box', () => {
    const plates = own.filter((p) => p.prop === 'signPlate');
    expect(plates).toHaveLength(5);
    expect(PROP_HUNG).toContain('signPlate');
    for (const p of plates) expect(propCollisionBox(p)).toBeNull();
    const at = (x: number, z: number): PropPlacement | undefined => plates.find((p) => hyp2(p.x - x, p.z - z) < 0.2);
    for (const [x, z] of [[92.0, 9.05], [88.25, 8.05], [79.3, 4.6]] as const) expect(at(x, z)!.y, `plate at (${x}, ${z})`).toBeCloseTo(2.55, 9);
    // the plate's top (y + 0.3) is under the 3.0 m slab and over the 2.1 m lintel's soffit
    for (const p of plates) {
      expect(p.y).toBeGreaterThan(2.1);
      expect(p.y + 0.3).toBeLessThan(3.0);
    }
    // the recess plate stands 0.55 m clear of the hide spot's reach (it hangs 2.55 m up on the recess back)
    expect(A3_HIDE.z - at(88.25, 8.05)!.z).toBeGreaterThan(0.3);
  });
});
