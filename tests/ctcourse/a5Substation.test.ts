/**
 * A5 the Substation (marlow-final slice 5; set doc `docs/marlow-final/sets/a5Substation.md`): the set's own cases. The throw is
 * the only way a player alone gets past the beams (the inner wall gives no grip, every beam gap is under a crouched body, no
 * solo-standable top on the apron is within a beam-clearing running jump of the line, with a failing case), the throw itself
 * clears the beams under the header onto the dark landing, and the far-side release is out of reach from the near side. The
 * jammer reaches the flood and the beam panel through the gateway on a clear line, the jammed flood darkens the strip in the
 * field (the tuned levels), every lamp is on its circuit, the patrol is an armed `grunt` on a walkable timed loop, the steps
 * validate and read per player, the claim is the inner zone. The map-wide frames (`tests/ctcourse.test.ts`,
 * `tests/ctcourseLight.test.ts`) run the contract, the register and the light bands over this part too. The last block is the
 * dressing (slice 5 step 5): the greybox pinned (with its one deliberate edit, the switchgear run's end), hand-built skins out of
 * the light shapes, the end filler as the only new collision (the two beam towers are visual props), the open door leaves clear of every visible
 * piece, the openings and the panel left clear, the budgets, every kit glow on its circuit, the e2e polish items.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/ai/enemyDefs';
import { NavGrid, type NavBlocker } from '../../src/ai/navGrid';
import { PatrolWalker } from '../../src/ai/patrol';
import { LEAP, MOVEMENT, TEAM } from '../../src/config/movement';
import { COURSE_TEXT_MAX } from '../../src/config/course';
import { hyp2, hyp3 } from '../../src/core/mathx';
import { DOOR } from '../../src/world/doors';
import { KIT_BOX_COLOR, kitTriangles } from '../../src/world/kit/facilityKit';
import { FacilityProps, propGlows, PROP_OWN_SUPPLY, propCollisionBox, propDraws, propToWorld, propTriangles, PROP_FOOTPRINT, PROP_HUNG, PROP_SET_BUDGET, type PropReport } from '../../src/world/props/facilityProps';
import { CANON_MIN_THICK } from '../../src/voxel/lightShapes';
import { layoutKnownIds, validateCourse } from '../../src/game/course/courseDef';
import { CourseState } from '../../src/game/course/courseState';
import { applyJamLight, DEV_IDLE, DEV_JAMMED, DEV_RECOVER, JAM_LIGHT, JAMMER, LASER, laserTouch, lightLit, newDevJam, pickJamTarget, stepDevJam, type DevPhase, type JamTarget } from '../../src/game/jammer';
import { laserLive, panelFor, panelTarget } from '../../src/game/laserPanels';
import { throwArc, throwLanding, throwLandingOk, throwRoom } from '../../src/game/teamMoves';
import { GRAVITY } from '../../src/physics/havok';
import { generateLedges, LEDGE, type Door } from '../../src/world/anchors';
import { LevelBuilder, type BoxPiece } from '../../src/world/levelBuilder';
import { contribution } from '../../src/world/lights';
import { lampReach } from '../../src/world/lampMath';
import { MARLOW_LEVEL } from '../../src/world/lighting/levels';
import { circuitOf, LURE_RANGE, marlowCourseGroups, SILENT_PACE } from '../../src/world/lighting/marlowCircuits';
import { surfaceAt } from '../../src/world/surfaces';
import { buildCtcourse, COOP_LIPS, LIGHT_SPOTS } from '../../src/world/maps/ctcourse';
import { BEAM_KEEP_CLEAR, COOP_BAND, INTERACT_REACH, JAM_WINDOW, throwGateway } from '../../src/world/maps/ctcourseGreybox';
import {
  A5_BACK_DOOR,
  A5_BULKHEADS,
  A5_BUND,
  A5_CABLE,
  A5_DRUM_ROWS,
  A5_DRUMS,
  A5_FLOOD,
  A5_FLOOD_JAM,
  A5_FRONT_DOOR,
  A5_GATEWAY,
  A5_GEAR,
  A5_HIDE,
  A5_IN1_FLAG,
  A5_INNER_ZONE,
  A5_KIOSK,
  A5_KIOSK_LAMP,
  A5_L5_GATE,
  A5_LANDING,
  A5_LASER,
  A5_MAT,
  A5_PANEL,
  A5_PANEL_JAM,
  A5_PASS_WAIT,
  A5_PATROL,
  A5_PATROL_FACES,
  A5_PATROL_ROUTE,
  A5_PATROL_WAITS,
  A5_PENS,
  A5_PRESS,
  A5_RELEASE,
  A5_RELEASE_FLAG,
  A5_RELEASE_GATE,
  A5_ROOM,
  A5_RUNNER,
  A5_SHELL,
  A5_THROW,
  A5_TOWERS,
  A5_TRAY,
  A5_TRENCH,
  A5_UNIT_H,
  A5_WALL,
} from '../../src/world/maps/ctcourseSets/a5Substation';
import { HALL_H, checkSetPart, holdDoorId, inBox, OBJECTIVE_ID_MAX, registerSum, SET_BOX, setGroups } from '../../src/world/maps/ctcourseSets/types';
import { GAL_TOP } from '../../src/world/maps/ctcourseSets/facility';
import { lastTimeAtOrOver, LEAP_APEX, MANTLE, SOLO_TOP_SPEED } from '../helpers/soloJumpReach';

const b = new LevelBuilder();
const built = buildCtcourse(b);
const part = built.parts[4]!;
const lay = built.layout;
const course = lay.course!;
const def = course.def;
const range = built.ranges.a5Substation;
const mine = b.boxes.slice(range.boxes[0], range.boxes[1]);
/** The greybox as S5 built it (slice 5 steps 2-4), bar the switchgear run's end (S567-check polish 3: it stops at z 44.6, the old end is the
 *  dressing's invisible filler): its 25 boxes (24 solids and the throw mark), 9 lamps, 2 doors, no anchor. The dressing is appended after. */
const GREY = { boxes: 25, solids: 24, lights: 9, doors: 2, anchors: 0, checksum: 5871.785 };
const grey = mine.slice(0, GREY.boxes);
const dressing = mine.slice(GREY.boxes);
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
const box = SET_BOX.a5Substation[0]!;
/** The set's lamps: inside the box and under the gallery's floor (the gallery's decor lamps hang over the box edges). */
const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight' && inBox(box, l.x, l.z, -0.2) && l.y < 4.5);
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
const tuned = (JSON.parse(readFileSync('tests/ctcourse/a5Substation.light.json', 'utf8')) as { levels: Record<string, number> }).levels;
const anchors = generateLedges(b.boxes, b.anchors);
const laser = part.lasers[0]!;
const BEAM_TOP = Math.max(...laser.ys);
const HEADER = A5_GATEWAY.header!;

/** The solid boxes whose band (floor to 1.7 m) is within `r` of (x, z): what a body walking there touches. */
const blockedAt = (x: number, z: number, r = MOVEMENT.radius): string[] =>
  solid
    .filter((p) => bottom(p) < 1.7 && top(p) > 0.15)
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
const walkPath = (pts: readonly (readonly [number, number])[], r = MOVEMENT.radius): string | null => {
  for (let i = 1; i < pts.length; i++) {
    const hit = walkBlocked(pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1], r);
    if (hit) return `leg ${i}: ${hit}`;
  }
  return null;
};
const pathLen = (pts: readonly (readonly [number, number])[]): number => pts.reduce((n, p, i) => (i === 0 ? 0 : n + hyp2(p[0] - pts[i - 1]![0], p[1] - pts[i - 1]![1])), 0);

/** The first static hit (m) along the segment a -> b through the boxes (slab test), or Infinity: the jammer's line of sight. */
function hitDistance(pieces: readonly BoxPiece[], a: readonly [number, number, number], q: readonly [number, number, number]): number {
  const d = [q[0] - a[0], q[1] - a[1], q[2] - a[2]];
  const len = hyp3(d[0]!, d[1]!, d[2]!);
  let best = Infinity;
  for (const p of pieces) {
    let t0 = 0;
    let t1 = 1;
    let ok = true;
    for (let k = 0; k < 3 && ok; k++) {
      const lo = p.c[k]! - p.s[k]! / 2;
      const hi = p.c[k]! + p.s[k]! / 2;
      const dk = d[k]!;
      if (Math.abs(dk) < 1e-12) {
        if (a[k]! < lo || a[k]! > hi) ok = false;
        continue;
      }
      let u0 = (lo - a[k]!) / dk;
      let u1 = (hi - a[k]!) / dk;
      if (u0 > u1) [u0, u1] = [u1, u0];
      t0 = Math.max(t0, u0);
      t1 = Math.min(t1, u1);
      if (t0 > t1) ok = false;
    }
    if (ok) best = Math.min(best, t0 * len);
  }
  return best;
}
/** `CtDevices.clearFrom`: a static hit closer than `JAMMER.losSlack` to the target still counts as clear. */
const clearLine = (pieces: readonly BoxPiece[], eye: readonly [number, number, number], t: { x: number; y: number; z: number }): boolean =>
  hitDistance(pieces, eye, [t.x, t.y, t.z]) >= hyp3(t.x - eye[0], t.y - eye[1], t.z - eye[2]) - JAMMER.losSlack;
/** The aiming camera's eyes round a jammer standing at (x, z) facing west through the gateway: behind and beside the
 *  shoulder, 1.5-1.9 m up (the third-person aim camera sits about 0.5 m off the head). */
const eyeCloud = (x: number, z: number): [number, number, number][] => {
  const out: [number, number, number][] = [];
  for (const dx of [0, 0.25, 0.5]) for (const dz of [-0.3, 0, 0.3]) for (const y of [1.5, 1.7, 1.9]) out.push([x + dx, y, z + dz]);
  return out;
};
/** The jam targets `CtDevices` builds: every fixed electric lamp (kinds lamp and spot) and every laser panel's face. */
const jamTargets: JamTarget[] = [
  ...b.lights.lights.filter((l) => l.electric && (l.kind === 'lamp' || l.kind === 'spot')).map((l): JamTarget => ({ id: `lt-${l.id}`, kind: 'light', x: l.x, y: l.y, z: l.z })),
  ...(lay.laserPanels ?? []).map((p): JamTarget => {
    const at = panelTarget(p, { x: 0, y: 0, z: 0 });
    return { id: p.id, kind: 'panel', x: at.x, y: at.y, z: at.z };
  }),
];
const flood = lamps.find((l) => l.group === 52)!;
const panelAt = panelTarget(A5_PANEL, { x: 0, y: 0, z: 0 });

/** The furthest (m, plan) from a top at `from` to a beam line that a top-gear running jump carries the feet over the top beam
 *  at `beam` across the beams' touch band (`LASER.reach` each side), or 0 (`tests/ctcourseGreybox.test.ts`'s own formula). */
function beamJumpReach(from: number, beam: number): number {
  const t2 = lastTimeAtOrOver(from, beam);
  if (t2 === null) return 0;
  const t1 = from >= beam ? 0 : (2 * LEAP.vy) / -GRAVITY.y - t2;
  if (SOLO_TOP_SPEED * (t2 - t1) < 2 * LASER.reach) return 0;
  return SOLO_TOP_SPEED * t2 + MOVEMENT.radius - LASER.reach;
}
/** The solo-standable tops on the gateway's approach side (x past the wall's near face) from which a running jump carries a
 *  player alone over the beams: a top over 0.3 m and under the header, wide enough to stand on, not a `noLedge` piece over the
 *  mantle, with a point of it within `beamJumpReach` of the beam line. */
function beamThreats(pieces: readonly BoxPiece[]): string[] {
  const out: string[] = [];
  for (const p of pieces) {
    const t = top(p);
    if (t <= 0.3 || t >= HEADER || Math.min(p.s[0], p.s[2]) < LEDGE.climbDepth || (p.noLedge && t > MANTLE)) continue;
    const reach = beamJumpReach(t, BEAM_TOP);
    if (reach <= 0) continue;
    const x0 = Math.max(p.c[0] - p.s[0] / 2, A5_WALL.near);
    const x1 = p.c[0] + p.s[0] / 2;
    if (x1 <= x0) continue;
    // broad phase, then 0.1 m samples of the top's approach-side part
    if (hyp2(Math.max(0, x0 - laser.x1), Math.max(0, Math.abs(p.c[2] - 36) - p.s[2] / 2 - 3)) > reach) continue;
    const z0 = p.c[2] - p.s[2] / 2;
    const nx = Math.max(1, Math.ceil((x1 - x0) / 0.1));
    const nz = Math.max(1, Math.ceil(p.s[2] / 0.1));
    let near = Infinity;
    for (let i = 0; i <= nx; i++) for (let k = 0; k <= nz; k++) near = Math.min(near, distSeg(x0 + ((x1 - x0) * i) / nx, z0 + (p.s[2] * k) / nz));
    if (near < reach) out.push(`top ${t.toFixed(2)} at (${p.c[0].toFixed(2)}, ${p.c[2].toFixed(2)}): ${near.toFixed(2)} m < ${reach.toFixed(2)} m`);
  }
  return out;
}
/** Plan distance from (x, z) to the beam line. */
function distSeg(x: number, z: number): number {
  const sx = laser.x2 - laser.x1;
  const sz = laser.z2 - laser.z1;
  const t = Math.max(0, Math.min(1, ((x - laser.x1) * sx + (z - laser.z1) * sz) / (sx * sx + sz * sz)));
  return hyp2(x - (laser.x1 + sx * t), z - (laser.z1 + sz * t));
}

/** A fresh course at set 5 with the two players at the given feet. */
function runAt(a: [number, number], c: [number, number]): CourseState {
  const s = new CourseState(def, course.consoles);
  s.startAt(5);
  s.setPlayer(0, a[0], 0, a[1], false);
  s.setPlayer(1, c[0], 0, c[1], false);
  s.update(1 / 60);
  return s;
}
const throwStep = def.objectives!.find((o) => o.id === 'a5-throw')!;
const kioskStep = def.objectives!.find((o) => o.id === 'a5-kiosk')!;

/** A nav grid over the set the way the game builds one (cell 0.5, agent radius 0.32, step 0.45; solids not overhead block). */
function setNav(): NavGrid {
  const blockers: NavBlocker[] = solid
    .filter((p) => !p.overhead && p.c[0] + p.s[0] / 2 > 39 && p.c[0] - p.s[0] / 2 < 71 && p.c[2] + p.s[2] / 2 > 23 && p.c[2] - p.s[2] / 2 < 49)
    .map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: 0, bottom: bottom(p), top: top(p) }));
  return new NavGrid({ minX: 40, maxX: 70, minZ: 24, maxZ: 48, cell: 0.5, agentRadius: 0.32, stepHeight: 0.45, blockers, sample: () => ({ h: 0, ok: true }), seed: [51, 29] });
}
const nav = setNav();
/** The guard's A* walk from a to b (as `Enemy.goTo` takes it): its length, or null when the grid has no path. */
const navLen = (a: readonly [number, number], q: readonly [number, number]): number | null => {
  const path = nav.findPath([a[0], a[1]], [q[0], q[1]], 1e6);
  if (!path) return null;
  return pathLen([a, ...path.map((w) => [w[0], w[1]] as const), q]);
};

describe('A5 the Substation: the part', () => {
  it('is built (not the stub) and passes the contract rules', () => {
    expect(part.id).toBe('a5Substation');
    expect(part.stub).toBeUndefined();
    expect(checkSetPart(part)).toEqual([]);
  });

  it("every register row is an A5 row; the lamps, solids, doors and anchors they count are the builder's", () => {
    expect(part.register.every((r) => r.id.startsWith('A5-'))).toBe(true);
    expect(part.register.map((r) => r.id).sort()).toEqual(['A5-1', 'A5-10', 'A5-11', 'A5-12', ...Array.from({ length: 10 }, (_, i) => `A5-${13 + i}`), 'A5-2', 'A5-3', 'A5-4', 'A5-5', 'A5-6', 'A5-7', 'A5-8', 'A5-9'].sort());
    const sum = registerSum(part.register);
    expect(sum).toEqual(built.counts.sets.a5Substation);
    // 9 lamps (LIGHTING-PLAN 3: apron 3, inner 4, flood 1, kiosk 1), the switchroom's two doors, no anchor; 24 greybox solids: the wall's
    // two runs and the header, the drums, two pens of four bund walls and a unit, the switchroom's nine pieces, the kiosk; plus the
    // dressing's one collider (the switchgear run's invisible end filler; the beam towers are visual)
    expect(sum.lights).toBe(9);
    expect(sum.solids).toBe(GREY.solids + dressing.filter((p) => p.collide).length);
    expect(sum.doors).toBe(2);
    expect(sum.anchors).toBe(0);
    for (const r of part.register) expect(/[–—]/.test(r.element), r.id).toBe(false);
  });

  it('everything built lies inside the set box (0.3 m of wall slack) and under the hall roof', () => {
    const [x0, z0, x1, z1] = box;
    expect(mine.length).toBeGreaterThan(20);
    for (const p of mine) {
      expect(p.c[0] - p.s[0] / 2, 'west').toBeGreaterThanOrEqual(x0 - 0.3);
      expect(p.c[0] + p.s[0] / 2, 'east').toBeLessThanOrEqual(x1 + 0.3);
      expect(p.c[2] - p.s[2] / 2, 'south').toBeGreaterThanOrEqual(z0 - 0.3);
      expect(p.c[2] + p.s[2] / 2, 'north').toBeLessThanOrEqual(z1 + 0.3);
      expect(top(p)).toBeLessThanOrEqual(10 + 1e-6);
    }
    for (const l of lamps) expect(inBox(box, l.x, l.z, -0.1), `lamp ${l.id}`).toBe(true);
  });

  it('the plan: drums 1.8 m at x 62.1-64.3, z 29.4-33.0; pens 1 and 2 (1.2 m bunds round 3.5 m noLedge units); a 1.5 m noLedge kiosk with 1.0 m clear in front', () => {
    const drums = mine.find((p) => p.collide && Math.abs(top(p) - A5_DRUMS.h) < 1e-6)!;
    expect([drums.c[0] - drums.s[0] / 2, drums.c[0] + drums.s[0] / 2, drums.c[2] - drums.s[2] / 2, drums.c[2] + drums.s[2] / 2].map((v) => Number(v.toFixed(3)))).toEqual([A5_DRUMS.x0, A5_DRUMS.x1, A5_DRUMS.z0, A5_DRUMS.z1]);
    const bunds = mine.filter((p) => p.collide && Math.abs(top(p) - A5_BUND.h) < 1e-6);
    expect(bunds).toHaveLength(8);
    const units = mine.filter((p) => p.collide && Math.abs(top(p) - A5_UNIT_H) < 1e-6);
    expect(units).toHaveLength(2);
    for (const u of units) expect(u.noLedge).toBe(true);
    for (const [i, { unit }] of A5_PENS.entries()) {
      const u = units[i]!;
      expect([u.c[0] - u.s[0] / 2, u.c[2] - u.s[2] / 2, u.c[0] + u.s[0] / 2, u.c[2] + u.s[2] / 2].map((v) => Number(v.toFixed(3)))).toEqual([...unit]);
    }
    // pen 1's south bund wall stands against the set wall (A5-D4): no slot behind it
    expect(A5_PENS[0].bund[1] - 24.25).toBeLessThan(MOVEMENT.radius * 2);
    const kiosk = mine.find((p) => p.collide && Math.abs(top(p) - A5_KIOSK.h) < 1e-6)!;
    expect(kiosk.noLedge).toBe(true);
    expect(blockedAt(A5_KIOSK.x1 + 0.5, 33.0, 0.45)).toEqual([]);
    expect(blockedAt(A5_PRESS.x, A5_PRESS.z, MOVEMENT.radius)).toEqual([]);
    // surfaces: gravel in the bunds, the trench lids metal, the floor concrete
    expect(surfaceAt(b.surfaces, 45, 0, 24.9, 'concrete')).toBe('gravel');
    expect(surfaceAt(b.surfaces, 53, 0, 45.0, 'concrete')).toBe('gravel');
    expect(surfaceAt(b.surfaces, 52, 0, 47.2, 'concrete')).toBe('metal');
    expect(surfaceAt(b.surfaces, 51, 0, 33.5, 'concrete')).toBe('concrete');
    expect(A5_TRENCH[3]).toBeLessThanOrEqual(47.75);
  });

  it('every block 1.9 m or taller is noLedge; no lip in the co-op band and no manual ledge in A5 (none on COOP_LIPS)', () => {
    for (const p of mine) if (top(p) >= 1.9 && p.collide) expect(p.noLedge, `box at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBe(true);
    expect(part.lips).toEqual([]);
    expect(COOP_LIPS.some((l) => inBox(box, l.a.x, l.a.z))).toBe(false);
    const inA5 = anchors.ledges.filter((l) => inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, -0.3));
    expect(inA5.filter((l) => l.top >= COOP_BAND.min - 0.5).map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
    expect(inA5.filter((l) => l.piece === 0)).toEqual([]);
  });
});

describe('A5 the Substation: the throw gateway (the only way past the beams)', () => {
  const g = throwGateway(A5_GATEWAY);
  const thrower = g.spots.find((s) => s.kind === 'throw')!;
  const runner = g.spots.find((s) => s.kind === 'runner')!;
  const landing = g.spots.find((s) => s.kind === 'landing')!;

  it('the inner wall runs wall to wall at x 58, 6 m, noLedge, with the 4.8 m header over the 6 m gateway; the marks are the helper\'s', () => {
    const walls = mine.filter((p) => p.collide && Math.abs(p.c[0] - A5_WALL.x) < 1e-6 && Math.abs(p.s[0] - 0.3) < 1e-6);
    expect(walls).toHaveLength(3);
    for (const w of walls) {
      expect(w.noLedge).toBe(true);
      expect(top(w)).toBeCloseTo(6, 9);
    }
    const runs = walls.filter((w) => bottom(w) < 1e-6).map((w) => [w.c[2] - w.s[2] / 2, w.c[2] + w.s[2] / 2]).sort((p, q) => p[0]! - q[0]!);
    expect(runs).toEqual([[24, 33], [39, 48]]);
    // the runs meet the facility's shell walls (faces 24.25 / 47.75): no gap at either end
    expect(runs[0]![0]).toBeLessThanOrEqual(24.25);
    expect(runs[1]![1]).toBeGreaterThanOrEqual(47.75);
    const header = walls.find((w) => bottom(w) > 1)!;
    expect(bottom(header)).toBeCloseTo(HEADER, 9);
    expect(header.overhead).toBe(true);
    expect([thrower.x, thrower.z, runner.x, runner.z, landing.x, landing.z]).toEqual([A5_THROW.x, A5_THROW.z, A5_RUNNER.x, A5_RUNNER.z, A5_LANDING.x, A5_LANDING.z]);
    expect(mine.some((p) => !p.collide && Math.abs(p.c[0] - A5_THROW.x) < 0.01 && Math.abs(p.c[2] - A5_THROW.z) < 0.01)).toBe(true);
  });

  it('one laser across the gateway: laser-a5, beams 0.35 / 0.9 / 1.45, offFlag a5-release, its one power panel panel-a5', () => {
    expect(part.lasers).toHaveLength(1);
    expect(laser).toMatchObject({ id: A5_LASER, x1: 58, z1: 33, x2: 58, z2: 39, ys: [0.35, 0.9, 1.45], offFlag: A5_RELEASE_FLAG });
    expect(lay.lasers?.filter((l) => l.id === A5_LASER)).toHaveLength(1);
    expect(part.laserPanels).toEqual([A5_PANEL]);
    expect(panelFor(lay.laserPanels ?? [], A5_LASER)).toBeGreaterThanOrEqual(0);
    expect((lay.laserPanels ?? [])[panelFor(lay.laserPanels ?? [], A5_LASER)]!.id).toBe(A5_PANEL.id);
  });

  it('nobody walks, crouches or jumps from the floor through: every beam gap is under a crouched body, the floor jump peaks under the top beam', () => {
    const ys = [0, ...laser.ys].sort((p, q) => p - q);
    for (let i = 1; i < ys.length; i++) expect(ys[i]! - ys[i - 1]!).toBeLessThan(LASER.crouchHeight);
    expect(LEAP_APEX).toBeLessThan(BEAM_TOP);
    for (let z = 33 + MOVEMENT.radius; z <= 39 - MOVEMENT.radius; z += 0.25) {
      for (let py = 0; py <= BEAM_TOP; py += 0.05) expect(laserTouch(laser, 58, py, z, LASER.crouchHeight), `${z}, ${py}`).toBe(true);
      expect(laserTouch(laser, 58, LEAP_APEX, z, LASER.standHeight)).toBe(true);
    }
    // the band covers the whole opening: the wall's faces stand inside the touch band at both ends
    expect(distSeg(58, 33 + MOVEMENT.radius)).toBeLessThanOrEqual(LASER.reach);
  });

  it('no player alone climbs the inner wall: no generated or manual grip on it or its header', () => {
    const onWall = anchors.ledges.filter((l) => Math.abs((l.a.x + l.b.x) / 2 - A5_WALL.x) < 0.5 && inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2));
    expect(onWall.map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
  });

  it('no solo-standable top on the apron is within a beam-clearing running jump of the line (every solid in the map; the drums 4.1 m off)', () => {
    expect(beamThreats(solid)).toEqual([]);
    expect(A5_DRUMS.x0 - A5_WALL.x).toBeGreaterThanOrEqual(BEAM_KEEP_CLEAR);
    // the drums are a real solo top (1.8 m, under the mantle, not noLedge): the keep-clear is what keeps them harmless
    const drums = mine.find((p) => p.collide && Math.abs(top(p) - A5_DRUMS.h) < 1e-6)!;
    expect(drums.noLedge).toBeFalsy();
    expect(beamJumpReach(A5_DRUMS.h, BEAM_TOP)).toBeGreaterThan(2.5);
  });

  it('the check has teeth: SPEC\'s drum stack (x 60-63, z 29-33) and a 1.8 m crate 2 m off the line are threats; one at BEAM_KEEP_CLEAR is not', () => {
    const crate = (x0: number, z: number, sx = 1, h = 1.8, sz = 1): BoxPiece => ({ c: [x0 + sx / 2, h / 2, z], s: [sx, h, sz], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true });
    expect(beamThreats([...solid, crate(60, 31, 3, 1.8, 4)]).length).toBeGreaterThan(0);
    expect(beamThreats([...solid, crate(A5_WALL.x + 2, 36)]).length).toBeGreaterThan(0);
    expect(beamThreats([...solid, crate(A5_WALL.x + BEAM_KEEP_CLEAR, 36)])).toEqual([]);
    // a top just under the header right by the line: the worst case BEAM_KEEP_CLEAR is sized for
    expect(beamThreats([...solid, crate(A5_WALL.x + 3.5, 36, 1, HEADER - 0.05)]).length).toBeGreaterThan(0);
  });

  it('the throw from the mark carries the runner (0.3-1.6 m behind) over the beams, under the header, inside the gap, onto the landing', () => {
    const o = { x: 0, y: 0, z: 0 };
    const land = { x: 0, z: 0, dx: 0, dz: 0 };
    for (let d = 0.3; d <= 1.6 + 1e-9; d += 0.05) {
      throwLanding(A5_THROW.x + d, A5_THROW.z, A5_THROW.x, A5_THROW.z, -Math.PI / 2, land);
      expect(throwLandingOk(A5_THROW.x, 0, A5_THROW.z, land.x, 0, land.z)).toBe(true);
      for (let k = 0; k <= 200; k++) {
        throwArc((TEAM.throwTime * k) / 200, A5_THROW.x + d, 0, A5_THROW.z, land.x, 0, land.z, o);
        expect(laserTouch(laser, o.x, o.y, o.z, LASER.standHeight), `d ${d.toFixed(2)} k ${k}`).toBe(false);
        if (Math.abs(o.x - A5_WALL.x) < 0.15 + MOVEMENT.radius) expect(o.y + MOVEMENT.standHeight).toBeLessThan(HEADER);
        expect(Math.abs(o.z - 36) + MOVEMENT.radius).toBeLessThan(3);
      }
    }
    // from the runner's spot the landing is the marked one, in the dark landing pocket and in the inner zone (the claim)
    throwLanding(A5_RUNNER.x, A5_RUNNER.z, A5_THROW.x, A5_THROW.z, -Math.PI / 2, land);
    expect(hyp2(land.x - A5_LANDING.x, land.z - A5_LANDING.z)).toBeLessThan(1e-6);
    expect(inBox([53.5, 34, 57.7, 39.5], land.x, land.z)).toBe(true);
    expect(inBox(A5_INNER_ZONE, land.x, land.z)).toBe(true);
  });

  it('room for the throw in the built map: free air over the thrower, nothing solid along the arc, a floor and head room at the landing', () => {
    const inside = (x: number, y: number, z: number): boolean => solid.some((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2);
    for (let y = 1.0; y <= 1.0 + TEAM.throwUp; y += 0.05) expect(inside(A5_THROW.x, y, A5_THROW.z), `over the thrower at ${y.toFixed(2)}`).toBe(false);
    const o = { x: 0, y: 0, z: 0 };
    let clear = true;
    for (let k = 0; k <= 100; k++) {
      throwArc((TEAM.throwTime * k) / 100, A5_RUNNER.x, 0, A5_RUNNER.z, A5_LANDING.x, 0, A5_LANDING.z, o);
      for (const off of [0.3, 1.0, 1.6]) if (inside(o.x, o.y + off, o.z)) clear = false;
    }
    let head = 10;
    for (const p of solid) if (Math.abs(A5_LANDING.x - p.c[0]) < p.s[0] / 2 && Math.abs(A5_LANDING.z - p.c[2]) < p.s[2] / 2 && bottom(p) > 0) head = Math.min(head, bottom(p));
    expect(throwRoom(clear, 0, Math.min(head, 1.8))).toBe('ok');
    expect(blockedAt(A5_LANDING.x, A5_LANDING.z)).toEqual([]);
    expect(blockedAt(A5_THROW.x, A5_THROW.z)).toEqual([]);
    expect(blockedAt(A5_RUNNER.x, A5_RUNNER.z)).toEqual([]);
  });

  it('the release (the kiosk) is out of reach from every near-side spot, in reach from its press spot, and a release by the line would throw', () => {
    const dv = part.devices[A5_RELEASE]!;
    expect([dv.x, dv.z, dv.yaw]).toEqual([47, 33, Math.PI / 2]);
    // feet just off the beams' touch band on the apron side: 11 m short; the host's client slack (reach + 0.75) too
    expect(A5_WALL.x + LASER.reach - dv.x).toBeGreaterThan(INTERACT_REACH + 0.75);
    for (let z = 24.5; z <= 47.5; z += 0.5) expect(hyp2(A5_WALL.near + MOVEMENT.radius - dv.x, z - dv.z)).toBeGreaterThan(INTERACT_REACH + 0.75);
    expect(hyp2(A5_PRESS.x - dv.x, A5_PRESS.z - dv.z)).toBeLessThanOrEqual(1.4);
    expect(() => throwGateway({ ...A5_GATEWAY, release: { u: 1.2, v: 0 } })).toThrow(/reach/);
  });

  it('the release turns the beams off for good and unlocks the L5 door: the pickup gate sets a5-release, the L5 near door is a flag gate on it', () => {
    expect(part.bay.gates).toEqual([
      { kind: 'pickup', id: A5_RELEASE_GATE, switchId: A5_RELEASE, flag: A5_RELEASE_FLAG, perPlayer: false },
      { kind: 'flag', id: A5_L5_GATE, flag: A5_RELEASE_FLAG, doorId: holdDoorId('L5', 'near') },
    ]);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
    const s = runAt([A5_THROW.x, A5_THROW.z], [A5_LANDING.x, A5_LANDING.z]);
    expect(s.locked('L5-near')).toBe(true);
    expect(s.hasFlag(A5_RELEASE_FLAG)).toBe(false);
    s.setPlayer(1, A5_PRESS.x, 0, A5_PRESS.z, false);
    expect(s.press(A5_RELEASE, 1)).toBeNull();
    s.update(1 / 60);
    expect(s.hasFlag(A5_RELEASE_FLAG)).toBe(true);
    expect(s.isGateOpen(A5_RELEASE_GATE)).toBe(true);
    expect(s.locked('L5-near')).toBe(false);
    expect(laser.offFlag).toBe(A5_RELEASE_FLAG);
    // for good: still set a minute later
    for (let t = 0; t < 60; t += 1 / 10) s.update(1 / 10);
    expect(s.hasFlag(A5_RELEASE_FLAG)).toBe(true);
  });
});

describe('A5 the Substation: the jammer (the flood through the gateway; the beam panel, route 2)', () => {
  it('the flood is one group-52 cone on the switchroom\'s south face aimed at the strip, electric and destructible: a jam target', () => {
    expect(lamps.filter((l) => l.group === 52)).toHaveLength(1);
    expect(flood.kind).toBe('spot');
    expect(flood.electric).toBe(true);
    expect(flood.destructible).toBe(true);
    expect(flood.cone).not.toBeNull();
    expect([flood.x, flood.y, flood.z]).toEqual([A5_FLOOD.x, A5_FLOOD.y, A5_FLOOD.z]);
    expect(flood.z).toBeLessThan(A5_ROOM.z0 - A5_ROOM.t / 2);
    // its axis falls on the strip in front of the kiosk
    const c = flood.cone!;
    const t = -flood.y / c.dy;
    expect(inBox([46, 30.5, 54, 36], flood.x + c.dx * t, flood.z + c.dz * t)).toBe(true);
    expect(jamTargets.some((j) => j.id === `lt-${flood.id}`)).toBe(true);
  });

  it('from the jam spot through the gateway the flood is in range, on a clear line from every aiming eye, and the aim picks it', () => {
    for (const eye of eyeCloud(A5_FLOOD_JAM.x, A5_FLOOD_JAM.z)) {
      const d = hyp3(flood.x - eye[0], flood.y - eye[1], flood.z - eye[2]);
      expect(d).toBeLessThanOrEqual(JAMMER.range);
      expect(clearLine(solid, eye, flood), `eye ${eye.join(', ')}`).toBe(true);
      const i = pickJamTarget(jamTargets, eye[0], eye[1], eye[2], (flood.x - eye[0]) / d, (flood.y - eye[1]) / d, (flood.z - eye[2]) / d);
      expect(jamTargets[i]?.id).toBe(`lt-${flood.id}`);
    }
    // the spot stands on the apron, clear, out of the beams' band
    expect(blockedAt(A5_FLOOD_JAM.x, A5_FLOOD_JAM.z)).toEqual([]);
    expect(distSeg(A5_FLOOD_JAM.x, A5_FLOOD_JAM.z)).toBeGreaterThan(LASER.reach);
  });

  it('the hidden-box case: a box on the line hides the flood (the line test bites)', () => {
    const eye: [number, number, number] = [A5_FLOOD_JAM.x, 1.7, A5_FLOOD_JAM.z];
    const mid = [(eye[0] + flood.x) / 2, (eye[1] + flood.y) / 2, (eye[2] + flood.z) / 2];
    const hide: BoxPiece = { c: [mid[0]!, mid[1]!, mid[2]!], s: [0.4, 0.4, 0.4], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true };
    expect(clearLine([...solid, hide], eye, flood)).toBe(false);
  });

  it('a jam takes the flood out in the light registry the field reads (contribution 0 on the strip) and gives it back after', () => {
    const reg = b.lights;
    const d = newDevJam();
    let was: DevPhase = DEV_IDLE;
    const step = (jammed: boolean, sec: number): void => {
      for (let t = 0; t < sec - 1e-9; t += 1 / 60) {
        stepDevJam(d, jammed, 'light', 1 / 60);
        applyJamLight(reg, flood.id, d, was);
        was = d.ph;
      }
    };
    expect(contribution(flood, 50.5, 1.6, 33.5)).toBeGreaterThan(0.3);
    step(true, JAM_LIGHT.flickerOff + 0.1);
    expect(d.ph).toBe(DEV_JAMMED);
    expect(flood.on).toBe(false);
    expect(contribution(flood, 50.5, 1.6, 33.5)).toBe(0);
    step(false, 1);
    expect(d.ph).toBe(DEV_RECOVER);
    expect(flood.on).toBe(false);
    step(false, JAM_LIGHT.offHold + JAM_LIGHT.flickerOn);
    expect(d.ph).toBe(DEV_IDLE);
    expect(flood.on).toBe(true);
  });

  it('the jammed flood darkens the strip and the kiosk in the field (the tuned cut levels, the kiosk light on) and the dark covers B\'s crossing', () => {
    const spots = LIGHT_SPOTS.a5Substation;
    const at = (n: string) => spots.find((s) => s.name === n)!;
    for (const n of ['A5 strip centre', 'A5 kiosk']) {
      expect(at(n).band, n).toBe('pool');
      expect(tuned[n]!, n).toBeGreaterThanOrEqual(MARLOW_LEVEL.poolMin);
    }
    for (const n of ['A5 strip centre cut', 'A5 strip east cut', 'A5 kiosk cut']) {
      expect(at(n), n).toMatchObject({ band: 'cut', off: [52] });
      expect(tuned[n]!, n).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
    }
    expect(tuned['A5 strip centre']! - tuned['A5 strip centre cut']!).toBeGreaterThan(0.4);
    expect(at('A5 kiosk')).toMatchObject({ x: A5_PRESS.x, z: A5_PRESS.z });
    // one held jam (5 s, then the release): the seconds the flood is dark, against B's walk landing -> kiosk press spot
    const d = newDevJam();
    let dark = 0;
    for (let t = 0; t < 15; t += 1 / 60) {
      stepDevJam(d, t < JAMMER.useMax, 'light', 1 / 60);
      if (!lightLit(d)) dark += 1 / 60;
    }
    const walk = hyp2(A5_LANDING.x - A5_PRESS.x, A5_LANDING.z - A5_PRESS.z) / SILENT_PACE;
    expect(walk).toBeGreaterThan(5);
    expect(walk).toBeLessThan(5.5);
    expect(dark).toBeGreaterThan(walk + 3);
  });

  it('a jammed flood lures nobody: no switch, no lure on its circuit (ENGINE-ANSWERS Q2)', () => {
    const row = circuitOf(52)!;
    expect(row.kind).toBe('photocell');
    expect(row.switches).toEqual([]);
    expect(row.lure).toBeUndefined();
    expect(part.switches.some((s) => s.group === 52 || s.group === 53)).toBe(false);
  });

  it('the beam panel: on the switchroom\'s south face, in range from its jam spot through the gateway on a clear line, and picked by the aim', () => {
    expect(A5_PANEL).toMatchObject({ id: 'panel-a5', lasers: [A5_LASER], x: 43.0, y: 3.2, z: 35.85, yaw: Math.PI });
    expect(panelAt.z).toBeLessThan(A5_PANEL.z);
    for (const eye of eyeCloud(A5_PANEL_JAM.x, A5_PANEL_JAM.z)) {
      const d = hyp3(panelAt.x - eye[0], panelAt.y - eye[1], panelAt.z - eye[2]);
      expect(d).toBeLessThanOrEqual(JAMMER.range);
      expect(clearLine(solid, eye, panelAt), `eye ${eye.join(', ')}`).toBe(true);
      const i = pickJamTarget(jamTargets, eye[0], eye[1], eye[2], (panelAt.x - eye[0]) / d, (panelAt.y - eye[1]) / d, (panelAt.z - eye[2]) / d);
      expect(jamTargets[i]?.id).toBe(A5_PANEL.id);
    }
    expect(blockedAt(A5_PANEL_JAM.x, A5_PANEL_JAM.z)).toEqual([]);
    // the doc's spot (60.5, 36.5) grazes the switchroom's east end: some aiming eyes there lose the panel (why the spot moved)
    expect(eyeCloud(60.5, 36.5).some((eye) => !clearLine(solid, eye, panelAt))).toBe(true);
  });

  it('a panel jam cuts the beams for the hold and the reboot (6.5 s) and the gateway crossing fits in it; they come back', () => {
    expect(laserLive(DEV_JAMMED, false, false)).toBe(false);
    expect(laserLive(DEV_RECOVER, false, false)).toBe(false);
    expect(laserLive(DEV_IDLE, false, false)).toBe(true);
    expect(laserLive(DEV_IDLE, false, true)).toBe(false);
    expect(JAM_WINDOW).toBeCloseTo(6.5, 9);
    // B walks from beside A through the gateway to the landing: about 4.5 m crouched
    expect(hyp2(A5_PANEL_JAM.x - A5_LANDING.x, A5_PANEL_JAM.z - A5_LANDING.z) / SILENT_PACE).toBeLessThan(JAM_WINDOW - 2);
    expect(walkBlocked(A5_PANEL_JAM.x - 0.8, A5_PANEL_JAM.z, A5_LANDING.x, A5_LANDING.z)).toBeNull();
  });
});

describe('A5 the Substation: the lights (LIGHTING-PLAN 3, A5)', () => {
  const by = (g: number) => lamps.filter((l) => l.group === g);

  it('nine lamps on the plan\'s circuits 50-53 (apron 3, inner 4, flood 1, kiosk 1); every one grouped, electric and destructible as its row says', () => {
    expect(lamps).toHaveLength(9);
    expect([50, 51, 52, 53].map((g) => by(g).length)).toEqual([3, 4, 1, 1]);
    for (const l of lamps) {
      const row = circuitOf(l.group);
      expect(row, `lamp ${l.id} group ${l.group}`).toBeDefined();
      expect(row!.room).toBe('A5');
      expect(l.electric).toBe(row!.electric);
      expect(l.destructible).toBe(row!.destructible);
      expect(row!.kind).not.toBe('house');
    }
    for (const g of [50, 51, 52, 53]) expect(by(g).length).toBe(circuitOf(g)!.lamps);
  });

  it('the apron lamps stand east of the wall, the inner zone\'s west of it (the 6 m wall splits the circuits); the switchroom panel is under its roof', () => {
    for (const l of by(50)) expect(l.x).toBeGreaterThan(A5_WALL.near);
    for (const l of [...by(51), ...by(52), ...by(53)]) expect(l.x).toBeLessThan(A5_WALL.far);
    const panel = by(51).find((l) => inBox([A5_ROOM.x0, A5_ROOM.z0, A5_ROOM.x1, A5_ROOM.z1], l.x, l.z, -0.3))!;
    expect(panel).toBeDefined();
    expect(panel.y).toBeLessThan(A5_ROOM.wallH);
    // the kiosk light is a small fitting by its keypad (a body beside it stays in the cut band)
    const k = by(53)[0]!;
    // (LR16 train entry) the registry holds the photometric reach (`lampReach`: the authored 1.2 m x `PHOTO.reach`)
    expect(k.radius).toBeLessThanOrEqual(lampReach(1.2) + 1e-9);
    expect(hyp2(k.x - 47, k.z - 33)).toBeLessThan(0.6);
  });

  it('the part\'s groups are exactly the plan\'s A5 rows, and each has a lamp', () => {
    const plan = marlowCourseGroups();
    expect(part.groups).toEqual({ 'a5-apron': plan['a5-apron'], 'a5-inner': plan['a5-inner'], 'a5-flood': plan['a5-flood'], 'a5-kiosk': plan['a5-kiosk'] });
    for (const g of Object.values(part.groups)) expect(lamps.some((l) => l.group === g)).toBe(true);
    for (const [k, g] of Object.entries(plan)) if (k.startsWith('a5-')) expect(course.groups![k]).toBe(g);
  });

  it('two wall switches within a metre of the plan: the apron (50) by the L4 door clear of its glass slot, the inner zone (51) inside the front door', () => {
    expect(part.switches.map((s) => [s.id, s.group])).toEqual([['a5-sw-apron', 50], ['a5-sw-inner', 51]]);
    for (const s of part.switches) {
      const spot = circuitOf(s.group)!.switches.find((x) => x.id === s.id)!;
      expect(hyp2(s.pos.x - spot.x, s.pos.z - spot.z), s.id).toBeLessThanOrEqual(1);
    }
    // the L4 slot is z 34.95-35.45 (1.0-2.2 m up): the apron switch stands past it
    expect(part.switches[0]!.pos.z).toBeGreaterThan(35.45 + 0.3);
    const inner = part.switches[1]!;
    expect(inBox([A5_ROOM.x0, A5_ROOM.z0, A5_ROOM.x1, A5_ROOM.z1], inner.pos.x, inner.pos.z)).toBe(true);
    expect(inner.pos.z).toBeLessThan(41.0);
  });

  it('the standby zone: the set at 0.14 to the hall roof', () => {
    expect(part.ambientZones).toEqual([{ id: 'A5', box: [40, 24, 70, 48], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 9.9 }]);
  });

  it('the tuned levels hold the doc\'s states: pockets at the landing and behind pen 1, the inner zone and switchroom lit and cut by 51, the apron, the vantage mid', () => {
    const spots = LIGHT_SPOTS.a5Substation;
    const at = (n: string) => spots.find((s) => s.name === n)!;
    for (const n of ['A5 landing', 'A5 landing mark', 'A5 pen 1 gap']) {
      expect(at(n).band, n).toBe('pocket');
      expect(tuned[n]!, n).toBeLessThanOrEqual(MARLOW_LEVEL.pocketMax);
    }
    expect(at('A5 pen 1 gap')).toMatchObject({ x: A5_PATROL_ROUTE[1]![0], z: A5_PATROL_ROUTE[1]![1] });
    for (const n of ['A5 inner zone', 'A5 switchroom', 'A5 apron']) {
      expect(at(n).band, n).toBe('read');
      expect(tuned[n]!, n).toBeGreaterThanOrEqual(MARLOW_LEVEL.readMin);
    }
    for (const [n, g] of [['A5 inner zone cut', 51], ['A5 switchroom cut', 51], ['A5 apron cut', 50]] as const) {
      expect(at(n).off, n).toEqual([g]);
      expect(tuned[n]!, n).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
    }
    // the switchroom with 51 off is a dark takedown spot for the lured patrol (his torch comes on under 0.35)
    expect(tuned['A5 switchroom cut']!).toBeLessThan(MARLOW_LEVEL.torchDark);
    // the vantage: concealed by stance and distance (P1), between the pocket and the read band
    expect(tuned['A5 vantage']!).toBeGreaterThan(0.22);
    expect(tuned['A5 vantage']!).toBeLessThanOrEqual(0.45);
    expect(Math.abs(tuned['A5 strip standby']! - MARLOW_LEVEL.standby)).toBeLessThanOrEqual(0.03);
  });
});

describe('A5 the Substation: the patrol', () => {
  const slot = part.squads[A5_PATROL]!;
  const patrolSpeed = ENEMIES.grunt.walkSpeed * 1.1;

  /** Walk the loop on its own pace (0.01 s steps, straight-line moves): the times each stop was left. */
  function walkLoop(waits: number[], seconds: number): { left: [number, number][]; stuck: boolean } {
    const w = new PatrolWalker({ points: A5_PATROL_ROUTE, waits, faces: A5_PATROL_FACES }, slot.x, slot.z, slot.yaw);
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

  it('is the bay\'s one guard: an armed grunt on the doc\'s loop from the kiosk (47.9, 33.4) facing west, inside the set', () => {
    expect(part.bay.squad).toEqual([A5_PATROL]);
    expect(Object.keys(part.squads)).toEqual([A5_PATROL]);
    expect(slot.kind).toBe('grunt');
    expect(['grunt', 'heavy', 'enforcer', 'officer', 'sniper']).toContain(slot.kind);
    expect(slot.passive).toBeUndefined();
    expect([slot.x, slot.z, slot.yaw]).toEqual([47.9, 33.4, -Math.PI / 2]);
    expect(slot.route).toEqual([[47.9, 33.4], [41.3, 31.0], [47.0, 34.6], [56.5, 37.6]]);
    expect(slot.route![0]).toEqual([slot.x, slot.z]);
    expect(slot.waits).toEqual([4, 3, A5_PASS_WAIT, 3]);
    expect(slot.faces!.slice(0, 2)).toEqual([-Math.PI / 2, Math.PI]);
    expect(Number.isNaN(slot.faces![2]!)).toBe(true);
    expect(slot.faces![3]).toBe(Math.PI / 2);
    expect(course.squads[A5_PATROL]).toBe(slot);
    expect(part.cameras).toEqual([]);
    for (const p of A5_PATROL_ROUTE) expect(inBox(A5_INNER_ZONE, p[0], p[1]), `${p.join(', ')}`).toBe(true);
  });

  it('every stop is clear floor and every leg is walkable on the guards\' nav grid (A* round the kiosk on K -> R2: under 1 m longer)', () => {
    for (const p of A5_PATROL_ROUTE) expect(blockedAt(p[0], p[1], 0.3), `${p.join(', ')}`).toEqual([]);
    for (let i = 0; i < A5_PATROL_ROUTE.length; i++) {
      const a = A5_PATROL_ROUTE[i]!;
      const c = A5_PATROL_ROUTE[(i + 1) % A5_PATROL_ROUTE.length]!;
      const len = navLen(a, c);
      expect(len, `leg ${i}`).not.toBeNull();
      expect(len!, `leg ${i}`).toBeLessThan(hyp2(c[0] - a[0], c[1] - a[1]) * 1.15 + 1);
    }
    // the straight K -> R2 line clips the kiosk (the guard's A* goes round it); the other legs are straight open floor
    expect(walkBlocked(47.9, 33.4, 41.3, 31.0, 0.3)).not.toBeNull();
    for (const i of [1, 2, 3]) {
      const a = A5_PATROL_ROUTE[i]!;
      const c = A5_PATROL_ROUTE[(i + 1) % 4]!;
      expect(walkBlocked(a[0], a[1], c[0], c[1], 0.3), `leg ${i}`).toBeNull();
    }
  });

  it('the loop takes about 42 s on the walker (doc 43.6 s; LD 4.3: 25-45 s) with stops of 4 / 3 / 3 s; the walk is 33.3 m', () => {
    const len = A5_PATROL_ROUTE.reduce((n, a, i) => n + hyp2(A5_PATROL_ROUTE[(i + 1) % 4]![0] - a[0], A5_PATROL_ROUTE[(i + 1) % 4]![1] - a[1]), 0);
    expect(len).toBeCloseTo(33.3, 1);
    const { left } = walkLoop(A5_PATROL_WAITS, 150);
    const post = left.filter(([, i]) => i === 0).map(([t]) => t);
    expect(post.length).toBeGreaterThanOrEqual(3);
    const cycle = post[2]! - post[1]!;
    expect(cycle).toBeGreaterThanOrEqual(38);
    expect(cycle).toBeLessThanOrEqual(45);
    expect(Math.abs(cycle - (len / patrolSpeed + 4 + 3 + 3 + A5_PASS_WAIT))).toBeLessThan(2.5);
    expect(post[0]!).toBeCloseTo(4, 1);
    for (const w of [A5_PATROL_WAITS[0]!, A5_PATROL_WAITS[1]!, A5_PATROL_WAITS[3]!]) {
      expect(w).toBeGreaterThanOrEqual(3);
      expect(w).toBeLessThanOrEqual(6);
    }
  });

  it('the check has teeth: the doc\'s pass-through wait of 0 ([4, 3, 0, 3]) freezes a PatrolWalker at W, which is why it pauses 0.1 s', () => {
    expect(walkLoop([4, 3, 0, 3], 150).stuck).toBe(false); // (merge) master guard-ai S2 fix: a wait of 0 passes through now; the 0.1 s pause stays
    expect(walkLoop(A5_PATROL_WAITS, 150).stuck).toBe(false);
    expect(A5_PASS_WAIT).toBeGreaterThan(0);
  });

  it('his isolation moment: R2 behind pen 1 is in the a5-pen1 pocket (z >= 28, 4 m off the south wall), the dark light spot; a takedown walk there is open floor', () => {
    const r2 = A5_PATROL_ROUTE[1]!;
    expect(inBox([40.3, 28, 42.5, 31.5], r2[0], r2[1])).toBe(true);
    expect(r2[1] - 24.25).toBeGreaterThanOrEqual(4);
    expect(walkPath([[49.4, 41], [48.5, 36.5], [47.6, 35.0], [44, 34.5], [42.5, 32.2], [r2[0], r2[1] + 0.8]])).toBeNull();
  });

  it('the lures (EnemyManager.lightsOut, 25 m): the inner switch reaches every loop point and he can walk into the switchroom to it; the apron switch from R4, W and K, not R2', () => {
    const inner = part.switches.find((s) => s.group === 51)!;
    const apron = part.switches.find((s) => s.group === 50)!;
    for (const p of A5_PATROL_ROUTE) expect(hyp2(p[0] - inner.pos.x, p[1] - inner.pos.z), `inner from ${p.join(', ')}`).toBeLessThan(LURE_RANGE);
    const d = (p: readonly [number, number]): number => hyp2(p[0] - apron.pos.x, p[1] - apron.pos.z);
    for (const i of [0, 2, 3]) expect(d(A5_PATROL_ROUTE[i]!)).toBeLessThan(LURE_RANGE);
    expect(d(A5_PATROL_ROUTE[1]!)).toBeGreaterThan(LURE_RANGE);
    // the walk to the inner switch: through the front door (a door is no nav blocker: guards push doors open)
    expect(navLen(A5_PATROL_ROUTE[0]!, [inner.pos.x - 0.6, inner.pos.z])).not.toBeNull();
    expect(walkPath([[47.9, 34.6], [47.2, 41.6], [45.2, 41.6], [inner.pos.x - 0.6, inner.pos.z]], 0.3)).toBeNull();
    expect(circuitOf(51)!.lure?.guard).toBe(A5_PATROL);
  });
});

describe('A5 the Substation: the steps, the claim, the pass zone, the radio', () => {
  it('three steps in route order: the throw (one player in the inner zone), the kiosk (the release flag) and one closing line', () => {
    const steps = def.objectives!.filter((o) => o.bay === 'A5');
    expect(steps.map((o) => o.id)).toEqual(['a5-throw', 'a5-kiosk', 'a5-lock']);
    expect(throwStep.done).toEqual({ flag: A5_IN1_FLAG });
    expect(kioskStep.done).toEqual({ flag: A5_RELEASE_FLAG });
    for (const o of steps.slice(0, 2)) {
      expect(o.a).toBeDefined();
      expect(o.b).toBeDefined();
      expect(o.a).not.toBe(o.b);
      expect(o.timer).toBeUndefined();
    }
    expect(steps[2]!.done).toBeUndefined();
    expect(steps.filter((o) => o.done === undefined)).toHaveLength(1);
    expect(throwStep.a).toMatch(/throw your partner/);
    expect(kioskStep.a).toMatch(/Jam the floodlight/);
    expect(kioskStep.b).toMatch(/key the release/);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
  });

  it('every line fits 90 characters, no em or en dash; ids fit the wire; the radio is the doc\'s three lines', () => {
    for (const o of def.objectives!.filter((x) => x.bay === 'A5')) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(/[–—]/.test(t), t).toBe(false);
      }
      expect(o.id.length).toBeLessThanOrEqual(OBJECTIVE_ID_MAX);
    }
    expect(part.bay.radio.map((r) => r.at)).toEqual(['enter', 'enter', A5_RELEASE_GATE]);
    for (const r of part.bay.radio) {
      expect(r.text.length, r.text).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(r.text), r.text).toBe(false);
    }
  });

  it('the claim: until somebody is in the inner zone the lead (P1 in this odd set) reads A; the first one in (the thrown player) takes B; it stands', () => {
    let s = runAt([A5_THROW.x, A5_THROW.z], [A5_RUNNER.x, A5_RUNNER.z]);
    expect(s.roleClaimed()).toBe(false);
    expect(s.roleOf(0)).toBe('a');
    expect(s.stepLine(throwStep, 0)).toBe(throwStep.a);
    expect(s.stepLine(throwStep, 1)).toBe(throwStep.b);
    // the client is thrown: P2 lands in the inner zone and takes B (the swap rule's own answer, now claimed)
    s.setPlayer(1, A5_LANDING.x, 0, A5_LANDING.z, false);
    s.update(1 / 60);
    expect(s.roleClaimed()).toBe(true);
    expect(s.roleOf(1)).toBe('b');
    expect(s.roleOf(0)).toBe('a');
    // the thrower walking through after the release does not swap it
    s.setPlayer(0, 57, 0, 46.5, false);
    s.update(1 / 60);
    expect(s.roleOf(0)).toBe('a');
    // the host thrown instead: P1 takes B, the client reads the A lines (the claim against the lead)
    s = runAt([A5_RUNNER.x, A5_RUNNER.z], [A5_THROW.x, A5_THROW.z]);
    s.setPlayer(0, A5_LANDING.x, 0, A5_LANDING.z, false);
    s.update(1 / 60);
    expect(s.roleOf(0)).toBe('b');
    expect(s.roleOf(1)).toBe('a');
    expect(s.stepLine(kioskStep, 1)).toBe(kioskStep.a);
    expect(s.stepLine(kioskStep, 0)).toBe(kioskStep.b);
    // standing on the apron claims nothing (the zone stops at the wall's west face)
    s = runAt([A5_WALL.near + 0.4, 36], [66, 36]);
    expect(s.roleClaimed()).toBe(false);
  });

  it('the pass zone: one player in the inner zone on the floor ticks the throw step; the release ticks the kiosk step; the flag is the set\'s external flag', () => {
    expect(part.passZones).toEqual([{ id: 'a5-p-in1', box: A5_INNER_ZONE, flag: A5_IN1_FLAG, floorY: 0, any: true }]);
    expect(part.externalFlags).toEqual([A5_IN1_FLAG]);
    expect(A5_INNER_ZONE[2]).toBeLessThan(A5_WALL.far);
    expect(inBox(A5_INNER_ZONE, A5_THROW.x, A5_THROW.z)).toBe(false);
    const s = runAt([A5_THROW.x, A5_THROW.z], [A5_LANDING.x, A5_LANDING.z]);
    expect(s.isStepDone('a5-throw')).toBe(false);
    s.setFlag(A5_IN1_FLAG);
    s.update(1 / 60);
    expect(s.isStepDone('a5-throw')).toBe(true);
    expect(s.isStepDone('a5-kiosk')).toBe(false);
    s.setPlayer(1, A5_PRESS.x, 0, A5_PRESS.z, false);
    expect(s.press(A5_RELEASE, 1)).toBeNull();
    s.update(1 / 60);
    expect(s.isStepDone('a5-kiosk')).toBe(true);
  });
});

describe('A5 the Substation: the switchroom, the routes and map data', () => {
  const doorAt = (id: string) => b.anchors.doors.find((d) => d.id === course.doors[id])!;

  it('the switchroom: two 1.2 x 2.1 doors, unlocked (front on the east face z 41.0-42.2, back on the north face x 41.0-42.2); the roof at 4.0, overhead, noLedge', () => {
    const f = doorAt(A5_FRONT_DOOR);
    const k = doorAt(A5_BACK_DOOR);
    for (const d of [f, k]) {
      expect(d.width).toBeCloseTo(1.2, 9);
      expect(d.height).toBeCloseTo(2.1, 9);
      expect(d.locked).toBe(false);
    }
    expect([f.hinge.x, f.hinge.z]).toEqual([46, 41.0]);
    expect([k.hinge.x, k.hinge.z]).toEqual([41.0, 46]);
    expect(Object.keys(part.doors)).toEqual([A5_FRONT_DOOR, A5_BACK_DOOR]);
    const roof = mine.find((p) => p.overhead && Math.abs(top(p) - 4.0) < 1e-6)!;
    expect(roof).toBeDefined();
    expect(roof.noLedge).toBe(true);
    // the doors are 6.2 m apart; the room is 6 x 10 inside the walls' centre lines
    expect(hyp2(46 - 41.6, 41.6 - 46)).toBeGreaterThan(5);
    expect(A5_ROOM.x1 - A5_ROOM.x0).toBeCloseTo(5.75, 9);
    expect(A5_ROOM.z1 - A5_ROOM.z0).toBe(10);
  });

  it('the routes are open floor: the trench path from the landing round pen 2 to the L5 door, the secret route through the switchroom to the kiosk, A through the gateway', () => {
    // the gaps round pen 2: 1.85 m to the inner wall, about 4 m to the switchroom
    expect(A5_WALL.far - A5_PENS[1].bund[2]).toBeCloseTo(1.85, 9);
    expect(A5_PENS[1].bund[0] - (A5_ROOM.x1 + A5_ROOM.t / 2)).toBeGreaterThan(3.8);
    expect(walkPath([[A5_LANDING.x, A5_LANDING.z], [56.9, 39.5], [56.9, 46.9], [53, 46.9], [53, 47.4]])).toBeNull();
    expect(walkPath([[56.9, 46.9], [42.2, 46.95], [41.6, 46.95], [41.6, 45.2], [43.5, 43], [45.2, 41.6], [47.4, 41.6], [47.8, 34.2]])).toBeNull();
    expect(walkPath([[A5_THROW.x, A5_THROW.z], [57.2, 36], [56.9, 39.5], [56.9, 46.5]])).toBeNull();
    // B's shadow route: landing -> the press spot (9 m) -> pen 2's west face (7.6 m)
    expect(walkPath([[A5_LANDING.x, A5_LANDING.z], [A5_PRESS.x, A5_PRESS.z], [49.4, 41]])).toBeNull();
    expect(hyp2(A5_LANDING.x - A5_PRESS.x, A5_LANDING.z - A5_PRESS.z)).toBeCloseTo(8.92, 1);
    // the bund gap behind pen 1 (x 40.25-42, a 1.75 m slot) is a hide spot a body fits in
    expect(blockedAt(41.1, 26.5)).toEqual([]);
    // the hide spot both wait in on the apron is clear floor
    expect(blockedAt(A5_HIDE.x, A5_HIDE.z)).toEqual([]);
    expect(blockedAt(A5_HIDE.x + 1, A5_HIDE.z)).toEqual([]);
  });

  it('the apron hide spot is out of sight from every point of his loop (the inner wall is in the way: the e2e waits there)', () => {
    for (const p of A5_PATROL_ROUTE) {
      for (const dx of [0, 1]) {
        const eye: [number, number, number] = [p[0], 1.6, p[1]];
        const t = { x: A5_HIDE.x + dx, y: 1.2, z: A5_HIDE.z };
        expect(hitDistance(solid, eye, [t.x, t.y, t.z]), `from ${p.join(', ')}`).toBeLessThan(hyp3(t.x - eye[0], t.y - eye[1], t.z - eye[2]) - 1);
      }
    }
  });

  it('debug points A5-entry / -vantage / -throw / -landing / -mid / -kiosk / -switchroom / -exit inside the set on clear floor; camera spaces; nav seeds', () => {
    expect(part.debugPoints.map((d) => d.id)).toEqual(['A5-entry', 'A5-vantage', 'A5-throw', 'A5-landing', 'A5-mid', 'A5-kiosk', 'A5-switchroom', 'A5-exit']);
    for (const d of part.debugPoints) {
      expect(inBox(box, d.pos.x, d.pos.z), d.id).toBe(true);
      expect(blockedAt(d.pos.x, d.pos.z, 0.3), d.id).toEqual([]);
    }
    expect(part.camSpaces.map((c) => c.size)).toEqual(['open', 'tight']);
    expect(part.navSeeds.some((s) => s.x > A5_WALL.near)).toBe(true);
    expect(part.navSeeds.some((s) => s.x < A5_WALL.far)).toBe(true);
    for (const s of part.navSeeds) expect(blockedAt(s.x, s.z, 0.3)).toEqual([]);
  });

  it('shot vantages for the drums, the kiosk and the trench; no cameras, scanners, consoles or hide objects', () => {
    expect(part.shotVantages.map((v) => v.name)).toEqual(['a5-vantage', 'a5-kiosk', 'a5-trench']);
    expect(part.cameras).toEqual([]);
    expect(part.scanners).toEqual([]);
    expect(part.consoles).toEqual([]);
    expect(part.hideSpots).toEqual([]);
  });
});

describe('A5 the Substation: dressing (slice 5 step 5)', () => {
  const kitReport = JSON.parse(readFileSync('src/world/kit/assets/facility-kit.json', 'utf8')) as { pieces: Record<string, { meshes: Record<string, number> }> };
  const propReport = JSON.parse(readFileSync('src/world/props/assets/facility-props.json', 'utf8')) as PropReport;
  const area = { x0: box[0], z0: box[1], x1: box[2], z1: box[3] };
  const own = part.props;
  /** The props write no boxes (the beam towers are visual; the trays hang): the dressing's only collider is the end filler. */
  const filler = dressing.filter((p) => p.collide);
  /** The towers' footprints as virtual boxes (the prop's 0.26 m skin, `PROP_FOOTPRINT`) for the clearance checks below. */
  const towerSkins = own.filter((p) => p.prop === 'beamTower').map((t) => ({ x0: t.x - 0.13, x1: t.x + 0.13, z0: t.z - 0.13, z1: t.z + 0.13 }));
  const skins = dressing.filter((p) => !p.collide);
  const doorOf = (id: string): Door => b.anchors.doors.find((d) => d.id === course.doors[id])!;
  const lo = (p: BoxPiece, k: 0 | 1 | 2): number => p.c[k] - p.s[k] / 2;
  const hi = (p: BoxPiece, k: 0 | 1 | 2): number => p.c[k] + p.s[k] / 2;
  /** The skins whose box overlaps [x0, x1] x [y0, y1] x [z0, z1] (touching faces do not count). */
  const skinsIn = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): string[] =>
    skins
      .filter((p) => lo(p, 0) < x1 - 1e-6 && hi(p, 0) > x0 + 1e-6 && lo(p, 1) < y1 - 1e-6 && hi(p, 1) > y0 + 1e-6 && lo(p, 2) < z1 - 1e-6 && hi(p, 2) > z0 + 1e-6)
      .map((p) => `skin (${p.c.map((v) => v.toFixed(3)).join(', ')}) size (${p.s.map((v) => v.toFixed(3)).join(', ')})`);
  /** The visible pieces a hinged door's leaf touches in plan at any point of its swing (the leaf is `DOOR.thickness` thick, from 0.02 m off the hinge to 0.02 m short of
   *  the far jamb, as `Doors` draws it; the kit's charcoal walls and the floor paint are not counted: the leaf stands in the wall's gap, over the paint). */
  const leafHits = (d: Door, pieces: readonly BoxPiece[]): string[] => {
    const out = new Set<string>();
    const cand = pieces.filter((p) => p.visible !== false && top(p) > 0.03 && bottom(p) < d.height - 1e-3 && p.color !== KIT_BOX_COLOR && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
    for (let f = 0.05; f <= 1.0001; f += 0.05) {
      const yaw = d.yaw + d.swing * DOOR.openAngle * f;
      const dx = Math.sin(yaw);
      const dz = Math.cos(yaw);
      for (let t = 0.02; t <= d.width - 0.02 + 1e-9; t += 0.05) {
        for (const side of [-1, 0, 1]) {
          const x = d.hinge.x + dx * t + dz * side * (DOOR.thickness / 2);
          const z = d.hinge.z + dz * t - dx * side * (DOOR.thickness / 2);
          for (const p of cand) if (Math.abs(x - p.c[0]) < p.s[0] / 2 - 1e-4 && Math.abs(z - p.c[2]) < p.s[2] / 2 - 1e-4) out.add(`piece (${p.c.map((v) => v.toFixed(2)).join(', ')}) size (${p.s.map((v) => v.toFixed(2)).join(', ')}) at swing ${f.toFixed(2)}`);
        }
      }
    }
    return [...out];
  };

  it("the greybox is as S5 built it (25 boxes by checksum, 9 lamps, 2 doors, no anchor) bar the switchgear run's end; the only new collision is the end filler (the two beam towers write no box)", () => {
    let sum = 0;
    for (const p of grey) sum += (p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw) * (p.collide ? 1 : 1.5) * (p.visible === false ? 1.25 : 1) * (p.overhead ? 1.1 : 1);
    expect(sum).toBeCloseTo(GREY.checksum, 3);
    expect(grey.filter((p) => p.collide)).toHaveLength(GREY.solids);
    expect(filler).toHaveLength(1);
    expect(built.counts.sets.a5Substation).toEqual({ lights: GREY.lights, solids: GREY.solids + filler.length, doors: GREY.doors, anchors: GREY.anchors });
    // after the greybox: the filler and visual skins; nothing else collides
    expect(dressing.filter((p) => p.collide)).toHaveLength(filler.length);
    expect(lamps).toHaveLength(GREY.lights);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(Array.from({ length: 10 }, (_, i) => `A5-${13 + i}`)));
    expect(part.doors).toEqual({ [A5_FRONT_DOOR]: expect.any(Number), [A5_BACK_DOOR]: expect.any(Number) });
    // per row: only A5-22 (the filler) holds a dressing solid; no new lamp, door or anchor
    for (const r of part.register.filter((x) => Number(x.id.slice(3)) >= 13)) expect([r.id, r.solids, r.lights, r.doors, r.anchors]).toEqual([r.id, r.id === 'A5-22' ? 1 : 0, 0, 0, 0]);
  });

  it("every hand-built dressing box is a visual skin: no collision, noLedge, a side under 5 cm (out of the canonical light shapes, so the light is the greybox's); no visible box is over 5 cm, the filler is invisible", () => {
    expect(skins.length).toBeGreaterThan(600);
    for (const p of skins) {
      expect(p.noLedge, `skin at (${p.c.join(', ')})`).toBe(true);
      expect(Math.min(...p.s), `skin at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBeLessThan(CANON_MIN_THICK);
      expect(p.visible).not.toBe(false);
      expect(p.overhead).toBeFalsy();
    }
    expect(dressing.filter((p) => p.visible !== false && Math.min(...p.s) >= CANON_MIN_THICK)).toEqual([]);
    for (const p of filler) {
      expect(p.visible).toBe(false);
      expect(p.noLedge).toBe(true);
    }
    for (const p of filler) expect(p.noLedge, `collider at (${p.c.join(', ')})`).toBe(true);
  });

  it("S567-check polish 3: the switchgear run ends at z 44.6, so the back door's open leaf clears every visible piece (the front door's too); the old footprint to z 45 keeps its collision as an invisible filler (teeth: the old end clips the leaf)", () => {
    const g0 = A5_GEAR;
    const gear = grey.find((p) => p.collide && Math.abs(p.s[1] - g0.h) < 1e-9 && Math.abs(p.c[0] - (g0.x0 + g0.x1) / 2) < 1e-9)!;
    expect([lo(gear, 0), hi(gear, 0), lo(gear, 2), hi(gear, 2), top(gear)].map((v) => Number(v.toFixed(3)))).toEqual([40.3, 41.1, 37, 44.6, 2.3]);
    expect(gear.noLedge).toBe(true);
    const f = filler[0]!;
    expect([lo(f, 0), hi(f, 0), lo(f, 2), hi(f, 2), top(f)].map((v) => Number(v.toFixed(3)))).toEqual([40.3, 41.1, 44.6, 45, 2.3]);
    expect(f.visible).toBe(false);
    // run and filler together are the old run (x 40.3-41.1, z 37-45, 2.3 m): a body stands where it stood
    expect(hi(gear, 2)).toBeCloseTo(lo(f, 2), 9);
    const back = doorOf(A5_BACK_DOOR);
    const front = doorOf(A5_FRONT_DOOR);
    const pieces = [...grey, ...dressing];
    expect(leafHits(back, pieces)).toEqual([]);
    expect(leafHits(front, pieces)).toEqual([]);
    // the open back leaf lies along x 41.0 down to z 44.8: the visible run stops 0.2 m short of it
    const openYaw = back.yaw + back.swing * DOOR.openAngle;
    const tip = { x: back.hinge.x + Math.sin(openYaw) * (back.width - 0.02), z: back.hinge.z + Math.cos(openYaw) * (back.width - 0.02) };
    expect(tip.x).toBeCloseTo(41.0, 1);
    expect(tip.z).toBeCloseTo(44.84, 1);
    expect(tip.z - hi(gear, 2)).toBeGreaterThan(0.2);
    // teeth: the run as S5 built it (to z 45) is hit by the open leaf, and so is a skin dropped on its line
    const oldRun: BoxPiece = { ...gear, c: [gear.c[0], gear.c[1], (37 + 45) / 2], s: [gear.s[0], gear.s[1], 8] };
    expect(leafHits(back, [oldRun]).length).toBeGreaterThan(0);
    const clip: BoxPiece = { c: [41.0, 1, 45.2], s: [0.1, 2, 0.1], yaw: 0, pitch: 0, color: '#888', collide: false, visible: true };
    expect(leafHits(back, [clip]).length).toBeGreaterThan(0);
  });

  it("the openings and fixtures stay clear of skins: the L4 far door, its glass slot and the sign plate over it, the L5 near door, the beam panel's face, the flood's fixture box, the kiosk lamp's fixture", () => {
    expect(skinsIn(69.6, 69.76, 0.05, 2.45, 32.0, 34.0)).toEqual([]);
    expect(skinsIn(69.6, 69.76, 1.0, 2.2, 34.9, 35.5)).toEqual([]);
    expect(skinsIn(69.65, 69.76, 2.5, 2.9, 32.3, 33.7)).toEqual([]);
    expect(skinsIn(52.0, 54.0, 0.05, 2.45, 47.6, 47.76)).toEqual([]);
    // (the render's own skin lies on the wall face, 3 cm: the panel's back sinks into it, its face stands clear)
    expect(skinsIn(42.79, 43.21, 2.92, 3.48, 35.7, 35.82)).toEqual([]);
    // the flood's fixture (x 44.3-44.7, y 4.18-4.34, z 35.45-35.75): the outrigger carries it, nothing sits inside it
    expect(skinsIn(44.3, 44.7, 4.19, 4.33, 35.46, 35.74)).toEqual([]);
    // the kiosk lamp's fixture (x 47.47-47.53, y 1.41-1.49, z 32.9-33.1) is reached by the gooseneck, not covered
    expect(skinsIn(47.48, 47.52, 1.42, 1.48, 32.91, 33.09)).toEqual([]);
    const neck = skins.find((p) => Math.abs(hi(p, 0) - (A5_KIOSK_LAMP.x - 0.03)) < 1e-6 && p.c[1] > 1.43 && p.c[1] < 1.48 && Math.abs(p.c[2] - 33) < 0.02)!;
    expect(neck).toBeDefined();
    expect(lo(neck, 0)).toBeGreaterThan(A5_KIOSK.x1);
  });

  it("budgets (computed): kit triangles <= 60 k in the set box; the props pass FacilityProps.check against the set box at 60 k triangles and 12 draws, the facility's set-side plates in the box counted", () => {
    const kitIn = lay.kit!.instances.filter((i) => inBox(box, i.x, i.z));
    const kitTris = kitTriangles({ instances: kitIn, doors: [] }, kitReport);
    expect(kitIn.filter((i) => i.piece === 'wallPanel').length).toBeGreaterThan(60);
    expect(kitTris, `${kitTris} kit triangles`).toBeLessThanOrEqual(60_000);
    const facilityIn = built.facility.props.filter((p) => inBox(box, p.x, p.z));
    expect(facilityIn.some((p) => p.prop === 'signPlate')).toBe(true);
    const counted = [...own, ...facilityIn];
    const checker = new FacilityProps();
    checker.placements.push(...counted);
    expect(checker.check(area, propReport)).toEqual([]);
    expect(propTriangles(counted, propReport)).toBeLessThanOrEqual(PROP_SET_BUDGET.tris);
    expect(propDraws(counted, propReport)).toBeLessThanOrEqual(PROP_SET_BUDGET.draws);
    expect(propDraws(counted, propReport)).toBeGreaterThan(4);
    expect(own.map((p) => p.prop).sort()).toEqual([...Array<string>(2).fill('beamTower'), ...Array<string>(11).fill('cableTray')].sort());
  });

  it('every prop with an emissive part follows its power (S3-7 S1, light parity): the two beam towers\' lenses are the beams\' emitters, so each names the A5 laser as its device (dark while the panel is jammed or the beams are off) and carries no lighting group; the cable trays have no emissive', () => {
    const plan = new Set(Object.values(marlowCourseGroups()));
    const [g0, g1] = setGroups('a5Substation');
    const glowing = own.filter((p) => propGlows(p) && !PROP_OWN_SUPPLY.includes(p.prop));
    expect(glowing.map((p) => p.prop)).toEqual(['beamTower', 'beamTower']);
    expect(A5_PANEL.lasers).toContain(A5_LASER);
    for (const p of glowing) {
      expect(p.device).toBe(A5_LASER);
      expect(p.group).toBeUndefined();
    }
    expect(plan.size).toBeGreaterThan(0);
    expect(g1 - g0).toBe(9);
    expect(own.filter((p) => p.prop === 'cableTray').some((p) => propGlows(p))).toBe(false);
  });

  it("every kit glow in A5 carries a circuit: the hall panels are on the plan's A5 rows (inner zone 51 west of the security wall and on the west wall, apron 50 east of it and on the east wall); never 52 or 53, no lamp added", () => {
    const plan = new Set(Object.values(marlowCourseGroups()));
    const [g0, g1] = setGroups('a5Substation');
    const kitIn = lay.kit!.instances.filter((i) => inBox(box, i.x, i.z));
    // (the facility's own L4 / L5 door panels, outside the walls' faces, are the facility's)
    const glowing = kitIn.filter((i) => ['wallPanel', 'skirting', 'column', 'handrail'].includes(i.piece) && Math.abs(i.x - 70.25) > 0.1 && Math.abs(i.z - 48.25) > 0.1);
    expect(glowing.length).toBeGreaterThan(60);
    for (const i of glowing) {
      expect(i.group, `${i.piece} at ${i.x}, ${i.y}, ${i.z}`).toBeDefined();
      expect(plan.has(i.group!), `${i.piece} group ${i.group}`).toBe(true);
      expect(i.group!).toBeGreaterThanOrEqual(g0);
      expect(i.group!).toBeLessThanOrEqual(g1);
      expect([50, 51]).toContain(i.group);
    }
    const panels = glowing.filter((i) => i.piece === 'wallPanel');
    // the south and north walls over the glazing (7.5 m up): 51 west of x 58, 50 east of it; the east wall 50; the west wall from 4.4 m, 51
    for (const i of panels) {
      if (Math.abs(i.x - A5_SHELL.west) < 0.1) {
        expect(i.y).toBeCloseTo(4.4, 9);
        expect(i.group).toBe(51);
      } else if (Math.abs(i.x - A5_SHELL.east) < 0.1) {
        expect(i.y).toBeCloseTo(GAL_TOP, 9);
        expect(i.group).toBe(50);
      } else {
        expect(Math.abs(i.z - A5_SHELL.south) < 0.1 || Math.abs(i.z - A5_SHELL.north) < 0.1, `panel at ${i.x}, ${i.z}`).toBe(true);
        expect(i.y).toBeCloseTo(GAL_TOP, 9);
        expect(i.group, `panel at x ${i.x}`).toBe(i.x < A5_WALL.x ? 51 : 50);
      }
    }
    for (const g of [50, 51]) expect(panels.some((i) => i.group === g)).toBe(true);
    // all four walls are covered, corner to corner
    expect(panels.filter((i) => Math.abs(i.z - A5_SHELL.south) < 0.1).length).toBeGreaterThan(20);
    expect(panels.filter((i) => Math.abs(i.z - A5_SHELL.north) < 0.1).length).toBeGreaterThan(20);
    expect(panels.filter((i) => Math.abs(i.x - A5_SHELL.east) < 0.1).length).toBeGreaterThan(15);
    expect(panels.filter((i) => Math.abs(i.x - A5_SHELL.west) < 0.1).length).toBeGreaterThan(15);
    // no lamp was added: the nine of the plan, each on its row
    expect(lamps).toHaveLength(9);
    for (const l of lamps) expect(l.group).toBeGreaterThanOrEqual(g0);
    expect(HALL_H).toBe(10);
  });

  it("the two beam towers (props): visual only, no box written, standing 0.07 m off the gateway posts' end faces and facing each other across the opening; the throw, the jam lines and the gap's clearance are the greybox's", () => {
    const towers = own.filter((p) => p.prop === 'beamTower');
    expect(towers).toHaveLength(2);
    towers.forEach((p, i) => {
      expect(p.x).toBeCloseTo(A5_TOWERS[i]!.x, 9);
      expect(p.z).toBeCloseTo(A5_TOWERS[i]!.z, 9);
      // on the beam line (the wall's centre line)
      expect(Math.abs(p.x - A5_WALL.x)).toBeLessThan(1e-6);
    });
    // each tower's front (+z) looks across the gap: the first north, the second south
    for (const t of towers) {
      const front = propToWorld(t, 0, 0, 1);
      expect(Math.sign(front[2] - t.z)).toBe(Math.sign(A5_GATEWAY.at.z - t.z));
    }
    // no collision is written for them: nothing in the dressing collides inside the gateway's strip (x 57-59, z 33-39) but the greybox
    expect(dressing.filter((p) => p.collide && lo(p, 0) < 59 && hi(p, 0) > 57 && lo(p, 2) < 39 && hi(p, 2) > 33)).toEqual([]);
    expect(solid.filter((p) => lo(p, 0) < 59 && hi(p, 0) > 57 && lo(p, 2) < 38.99 && hi(p, 2) > 33.01 && hi(p, 1) > 0.2 && lo(p, 1) < 2.4).map((p) => [lo(p, 2), hi(p, 2)])).toEqual([]);
    // the skin stands clear of the posts' end faces (z 33 and 39) by over 0.06 m: the voxel fit probes 3 cm off a cover face, and that air must stay air
    const zs = towerSkins.map((t) => [t.z0, t.z1] as const).sort((p, q) => p[0] - q[0]);
    expect(zs[0]![0] - 33).toBeGreaterThan(0.06);
    expect(zs[0]![0] - 33).toBeLessThan(0.1);
    expect(39 - zs[1]![1]).toBeGreaterThan(0.06);
    expect(39 - zs[1]![1]).toBeLessThan(0.1);
    // the gap's clear width is the greybox's (the full 6 m between the posts' ends), and the beam line's ends are still the wall's
    expect(laser).toMatchObject({ z1: 33, z2: 39 });
    expect(beamThreats(solid)).toEqual([]);
    expect(anchors.ledges.filter((l) => Math.abs((l.a.x + l.b.x) / 2 - A5_WALL.x) < 0.5 && inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2))).toEqual([]);
    // the throw's arc from every start passes the towers' skins by over 0.5 m (the arc tests above read the same solids)
    const o = { x: 0, y: 0, z: 0 };
    const land = { x: 0, z: 0, dx: 0, dz: 0 };
    for (let d = 0.3; d <= 1.6 + 1e-9; d += 0.1) {
      throwLanding(A5_THROW.x + d, A5_THROW.z, A5_THROW.x, A5_THROW.z, -Math.PI / 2, land);
      for (let k = 0; k <= 100; k++) {
        throwArc((TEAM.throwTime * k) / 100, A5_THROW.x + d, 0, A5_THROW.z, land.x, 0, land.z, o);
        for (const w of towerSkins) expect(hyp2(Math.max(w.x0 - o.x, o.x - w.x1, 0), Math.max(w.z0 - o.z, o.z - w.z1, 0)), `d ${d.toFixed(1)} k ${k}`).toBeGreaterThan(0.5);
      }
    }
  });

  it('the cable trays (props): eleven 1 m modules hung 3.0 m up on the north wall over the trench, no collision, above head height, inside the set box', () => {
    const trays = own.filter((p) => p.prop === 'cableTray');
    expect(trays).toHaveLength(11);
    expect(PROP_HUNG).toContain('cableTray');
    for (const t of trays) {
      expect(propCollisionBox(t)).toBeNull();
      expect(t.y).toBeCloseTo(A5_TRAY.y, 9);
      expect(t.z).toBeCloseTo(A5_TRAY.z, 9);
      expect(t.x).toBeGreaterThan(A5_TRENCH[0]);
      expect(t.x).toBeLessThan(A5_TRENCH[2]);
      const f = PROP_FOOTPRINT.cableTray;
      for (const [lx, lz] of [[f[0], f[1]], [f[2], f[3]]] as const) {
        const w = propToWorld(t, lx, 0, lz);
        expect(inBox(box, w[0], w[2], 1e-6), `tray at ${t.x}`).toBe(true);
        // over the trench path (z 46.6-47.75), against the north wall
        expect(w[2]).toBeGreaterThan(A5_TRENCH[1] - 0.3);
        expect(w[2]).toBeLessThan(A5_SHELL.north + 1e-6);
      }
    }
    expect(trays[0]!.y).toBeGreaterThan(2.6);
  });

  it("the hall's walls are dressed on every run: plinth, blockwork, pilasters under the 4.4 m cap; the L4 and L5 door gaps and the glass slot are left clear, the lintels filled", () => {
    const cover = (x: number, y: number, z: number, side: 'x' | 'z'): boolean => skins.some((p) => Math.abs(p.c[0] - x) <= p.s[0] / 2 + 1e-6 && Math.abs(p.c[1] - y) <= p.s[1] / 2 + 1e-6 && Math.abs(p.c[2] - z) <= p.s[2] / 2 + 1e-6 && (side === 'x' ? p.s[0] < 0.1 : p.s[2] < 0.1));
    // east wall (x 69.75), coverage at 2.0 m up: the runs round the door and the slot
    for (const z of [25, 28, 31.5, 34.3, 36, 40, 44, 47]) expect(cover(69.74, 2.0, z, 'x'), `east wall at z ${z}`).toBe(true);
    for (const z of [32.5, 33.5, 35.2]) expect(cover(69.74, 2.0, z, 'x'), `east wall gap at z ${z}`).toBe(false);
    // over the door (above the 2.9 m sill of the plate) the wall is filled
    expect(cover(69.74, 3.5, 33.0, 'x')).toBe(true);
    // south and north walls and the west wall's outer runs
    for (const x of [42, 45, 50, 55, 60, 66, 69]) {
      expect(cover(x, 2.0, 24.27, 'z'), `south wall at x ${x}`).toBe(true);
      expect(cover(x, 2.0, 47.73, 'z'), `north wall at x ${x}`).toBe(true);
    }
    // the L5 near door's gap (x 52.1-53.9) is left clear up to the frame's 2.42 m, the lintel over it is filled
    for (const x of [52.5, 53, 53.5]) expect(cover(x, 2.0, 47.73, 'z'), `north wall gap at x ${x}`).toBe(false);
    expect(cover(53, 3.5, 47.73, 'z')).toBe(true);
    for (const z of [25, 30, 35, 46.6, 47.5]) expect(cover(40.26, 2.0, z, 'x'), `west wall at z ${z}`).toBe(true);
    // every dressing wall skin on the south and east walls stays under the 4.4 m cap (the hall's panels take it above)
    for (const p of skins.filter((q) => Math.abs(q.c[0] - 69.735) < 0.03 || Math.abs(q.c[2] - 24.265) < 0.03)) expect(top(p)).toBeLessThanOrEqual(4.4 + 1e-6);
  });

  it('each of the six wall bulkheads has its bracket (a plate on the wall and two arms to the fixture 0.1 m off it), the switchroom panel light its four hangers, the flood its outrigger on the roof edge', () => {
    const fixtures = lamps.filter((l) => l.kind !== 'spot' && Math.abs(l.y - 3.5) < 1e-6);
    expect(fixtures).toHaveLength(6);
    for (const bh of A5_BULKHEADS) {
      const alongX = bh.side === 'n' || bh.side === 's';
      const lamp = fixtures.find((l) => (alongX ? Math.abs(l.x - bh.c) < 1e-6 && Math.abs(l.z - bh.at) < 0.4 : Math.abs(l.z - bh.c) < 1e-6 && Math.abs(l.x - bh.at) < 0.4));
      expect(lamp, `bulkhead on ${bh.side} ${bh.at}, ${bh.c}`).toBeDefined();
      // the plate and the arms: skins on the wall side of the fixture, within its y band, between the wall's paint and the fixture's back
      const near = skins.filter((p) => Math.abs((alongX ? p.c[0] : p.c[2]) - bh.c) < 0.2 && p.c[1] > 3.3 && p.c[1] < 3.75 && Math.abs((alongX ? p.c[2] : p.c[0]) - bh.at) < 0.13);
      expect(near.length, `bracket skins at ${bh.at}, ${bh.c}`).toBeGreaterThanOrEqual(3);
    }
    // the panel light (43.1, 3.7, 41.0, 0.6 x 0.05 x 0.6) hangs on four rods from the roof's underside (3.9)
    const rods = skins.filter((p) => p.s[1] > 0.1 && p.s[1] < 0.2 && Math.abs(top(p) - A5_ROOM.wallH) < 1e-6 && p.s[0] < 0.05 && p.s[2] < 0.05 && Math.abs(p.c[0] - 43.1) < 0.4 && Math.abs(p.c[2] - 41) < 0.4);
    expect(rods).toHaveLength(4);
    // the flood's outrigger: two uprights from the roof (4.0) to arms at 4.14-4.18 that run under its fixture
    const arms = skins.filter((p) => Math.abs(bottom(p) - 4.14) < 1e-6 && Math.abs(top(p) - 4.18) < 1e-6 && lo(p, 2) < A5_FLOOD.z && hi(p, 2) > A5_FLOOD.z);
    expect(arms).toHaveLength(2);
    for (const a of arms) expect(a.c[0]).toBeGreaterThan(A5_FLOOD.x - 0.3);
    const uprights = skins.filter((p) => Math.abs(bottom(p) - 4.0) < 1e-6 && Math.abs(top(p) - 4.14) < 1e-6);
    expect(uprights).toHaveLength(2);
  });

  it("the drum stack: four drums with octagonal flanges on the two end faces (bars turned in steps of 45 degrees), lagging and cable lines on the sides; the stack's box is the greybox's and keeps its 4.0 m off the beam line", () => {
    const turned = skins.filter((p) => Math.abs(p.pitch) > 1e-6);
    // two end faces x two rows x (four flange bars + four cable bars) = 32 minus the bars at 0 degrees (pitch 0 is no pitch): 24
    expect(turned.length).toBeGreaterThanOrEqual(24);
    for (const p of turned) {
      const k = p.pitch / (Math.PI / 4);
      expect(Math.abs(k - Math.round(k)), `pitch ${p.pitch}`).toBeLessThan(1e-9);
      expect(p.s[0]).toBeLessThan(0.05);
    }
    const bars = skins.filter((p) => A5_DRUM_ROWS.some((zc) => Math.abs(p.c[2] - zc) < 1e-6 && Math.abs(p.c[1] - 0.9) < 1e-6) && (Math.abs(p.c[0] - (A5_DRUMS.x1 + 0.015)) < 1e-6 || Math.abs(p.c[0] - (A5_DRUMS.x0 - 0.015)) < 1e-6));
    // four flange bars at each of the 4 discs
    expect(bars.filter((p) => p.color === '#8d6e47')).toHaveLength(16);
    expect(bars.filter((p) => p.color === '#8d6e47').every((p) => Math.abs(p.s[2] - 1.8) < 1e-9 && Math.abs(p.s[2] / 2) <= 0.9 + 1e-9)).toBe(true);
    // the stack's own box and the keep-clear are unchanged
    const drums = grey.find((p) => p.collide && Math.abs(top(p) - A5_DRUMS.h) < 1e-6)!;
    expect(drums.c[0] - drums.s[0] / 2).toBeCloseTo(A5_DRUMS.x0, 9);
    expect(A5_DRUMS.x0 - A5_WALL.x).toBeGreaterThanOrEqual(BEAM_KEEP_CLEAR);
    // the cable: floor-level strips from the stack's west face through the gateway into the landing pocket (4 cm, never over a beam height)
    expect(A5_CABLE[0]).toEqual([A5_DRUMS.x0, 32.1]);
    const end = A5_CABLE[A5_CABLE.length - 1]!;
    expect(inBox([53.5, 34, 57.7, 39.5], end[0], end[1])).toBe(true);
    const run = skins.filter((p) => Math.abs(p.yaw) > 1e-6 && Math.abs(p.s[0] - 0.04) < 1e-9 && Math.abs(p.s[1] - 0.04) < 1e-9);
    expect(run).toHaveLength(A5_CABLE.length - 1);
    for (const p of run) expect(top(p)).toBeLessThan(0.05);
    // it crosses the wall's line inside the gateway, clear of the beam ends (z 33 and 39)
    const cross = A5_CABLE.findIndex((c, i) => i > 0 && (A5_CABLE[i - 1]![0] - 58) * (c[0] - 58) < 0);
    expect(cross).toBeGreaterThan(0);
    expect(A5_CABLE[cross]![1]).toBeGreaterThan(33.5);
    expect(A5_CABLE[cross]![1]).toBeLessThan(38.5);
  });

  it("both transformer units are dressed: tank paint and plinth on four faces, twelve-fin radiator banks on the long faces, six porcelain bushings, a conservator, lifting lugs; the bunds get copings, bitumen and a band; pen 1's sump gauge is on the bund's west end in the patrol's view from R2", () => {
    for (const { unit, bund } of A5_PENS) {
      const [ux0, uz0, ux1, uz1] = unit;
      const onUnit = skins.filter((p) => p.c[0] > ux0 - 0.15 && p.c[0] < ux1 + 0.15 && p.c[2] > uz0 - 0.15 && p.c[2] < uz1 + 0.15 && p.c[1] > 0.1);
      expect(onUnit.length, `unit at ${ux0}, ${uz0}`).toBeGreaterThan(80);
      expect(onUnit.filter((p) => p.color === '#7b4b2a')).toHaveLength(6);
      expect(onUnit.filter((p) => p.color === '#71806a')).toHaveLength(24);
      expect(Math.max(...onUnit.map(top))).toBeCloseTo(4.35, 2);
      // the bund's four copings stand on the 1.2 m walls
      const copings = skins.filter((p) => p.color === '#9a9a92' && p.c[0] > bund[0] - 0.01 && p.c[0] < bund[2] + 0.01 && p.c[2] > bund[1] - 0.01 && p.c[2] < bund[3] + 0.01);
      expect(copings).toHaveLength(4);
      for (const p of copings) expect(bottom(p)).toBeCloseTo(A5_BUND.h, 9);
    }
    // the sump gauge on the west face (x 42.0), seen from R2 (41.3, 31.0) at 1.6 m
    const gauge = skins.filter((p) => p.c[0] > 41.85 && p.c[0] < 42.0 && p.c[2] > 28.4 && p.c[2] < 29.0 && p.c[1] > 0.5 && p.c[1] < 1.2);
    expect(gauge.length).toBeGreaterThanOrEqual(3);
    const r2 = A5_PATROL_ROUTE[1]!;
    expect(hitDistance(solid, [r2[0], 1.6, r2[1]], [41.95, 0.9, 28.7])).toBeGreaterThanOrEqual(hyp3(41.95 - r2[0], 0.9 - 1.6, 28.7 - r2[1]) - 0.05);
  });

  it("the switchroom: nine switchgear fronts on the run's east face (three doors, a relay window, three lamps, a mimic line, a nameplate each), a blank end cubicle, an end panel at z 44.6, a rubber mat 1.0 m deep in front with a yellow edge, door trims off the open leaves' lines, a felt roof with upstands and a finial", () => {
    const gx = A5_GEAR.x1;
    const fronts = skins.filter((p) => p.c[0] > gx && p.c[0] < gx + 0.2 && p.c[2] > A5_GEAR.z0 && p.c[2] < A5_GEAR.z1 && p.c[1] > 0.04);
    expect(fronts.filter((p) => p.color === '#78808a')).toHaveLength(27);
    expect(fronts.filter((p) => p.color === '#1c3a4a')).toHaveLength(9);
    expect(fronts.filter((p) => p.color === '#3f9b5a' || p.color === '#d99a2b' || p.color === '#c4393a')).toHaveLength(27);
    expect(fronts.filter((p) => p.color === '#b5282d')).toHaveLength(9);
    expect(fronts.filter((p) => p.color === '#4c535a')).toHaveLength(1);
    const endPanel = skins.filter((p) => lo(p, 2) > A5_GEAR.z1 - 1e-6 && lo(p, 2) < A5_GEAR.z1 + 0.1 && p.c[0] > A5_GEAR.x0 && p.c[0] < A5_GEAR.x1 && p.c[1] > 0.04);
    expect(endPanel.length).toBeGreaterThanOrEqual(3);
    // the mat: the floor skin 1.0 m deep in front of the run
    const mat = skins.find((p) => p.color === '#222527' && Math.abs(lo(p, 0) - gx) < 1e-6 && Math.abs(p.s[0] - 1.0) < 1e-6)!;
    expect(mat).toBeDefined();
    expect(top(mat)).toBeLessThan(0.02);
    expect(lo(mat, 2)).toBeCloseTo(A5_GEAR.z0, 9);
    expect(hi(mat, 2)).toBeCloseTo(A5_GEAR.z1, 9);
    // the roof: felt over the slab, four upstand pieces (the flood's span open on the south edge), a finial over 1 m tall
    const roofTop = A5_ROOM.wallH + A5_ROOM.roofT;
    expect(skins.some((p) => Math.abs(bottom(p) - roofTop) < 1e-6 && Math.abs(p.s[0] - (A5_ROOM.x1 + A5_ROOM.t / 2 - A5_ROOM.x0)) < 1e-6)).toBe(true);
    expect(skins.filter((p) => Math.abs(bottom(p) - roofTop) < 1e-6 && Math.abs(p.s[1] - 0.2) < 1e-6)).toHaveLength(4);
    expect(Math.max(...skins.filter((p) => p.c[0] < 41 && p.c[2] > 45).map(top))).toBeGreaterThan(5);
    // nothing of the dressing stands in the doorways: the front door gap (x 45.85-46.15, z 41.0-42.2) and the back door gap (x 41.0-42.2, z 45.85-46.15) above the sills
    expect(skinsIn(45.85, 46.15, 0.05, 2.1, 41.0, 42.2)).toEqual([]);
    expect(skinsIn(41.0, 42.2, 0.05, 2.1, 45.85, 46.15)).toEqual([]);
  });

  it("the kiosk: plinth, cap, keypad, display, lamps, label on the body; the operator's mat holds the press spot with a yellow outline; none of it is collision, so the 1.0 m clear in front is the greybox's", () => {
    const onKiosk = skins.filter((p) => p.c[0] > A5_KIOSK.x0 - 0.05 && p.c[0] < A5_KIOSK.x1 + 0.1 && p.c[2] > A5_KIOSK.z0 - 0.05 && p.c[2] < A5_KIOSK.z1 + 0.05 && p.c[1] > 0.05);
    expect(onKiosk.length).toBeGreaterThan(20);
    expect(onKiosk.filter((p) => p.color === '#1c3a4a')).toHaveLength(1);
    expect(onKiosk.filter((p) => p.color === '#3f9b5a' || p.color === '#d99a2b' || p.color === '#c4393a')).toHaveLength(3);
    const mat = skins.find((p) => Math.abs(lo(p, 0) - A5_MAT.x0) < 1e-6 && Math.abs(hi(p, 0) - A5_MAT.x1) < 1e-6 && Math.abs(lo(p, 2) - A5_MAT.z0) < 1e-6)!;
    expect(mat).toBeDefined();
    expect(top(mat)).toBeLessThan(0.02);
    expect(A5_PRESS.x).toBeGreaterThan(lo(mat, 0));
    expect(A5_PRESS.x).toBeLessThan(hi(mat, 0));
    expect(A5_PRESS.z).toBeGreaterThan(lo(mat, 2));
    expect(A5_PRESS.z).toBeLessThan(hi(mat, 2));
    expect(blockedAt(A5_PRESS.x, A5_PRESS.z, MOVEMENT.radius)).toEqual([]);
    expect(blockedAt(A5_KIOSK.x1 + 0.5, 33.0, 0.45)).toEqual([]);
  });

  it('the trench has ten chequer-plate lids between angle frames, flush (under 2 cm), in the metal strip along the north wall; the floor seams and stains are paint', () => {
    const lids = skins.filter((p) => p.c[0] > A5_TRENCH[0] && p.c[0] < A5_TRENCH[2] && p.c[2] > A5_TRENCH[1] + 0.05 && p.c[2] < A5_SHELL.north - 0.05 && Math.abs(p.s[1] - 0.01) < 1e-9 && p.s[0] > 1.0);
    expect(lids).toHaveLength(10);
    expect(new Set(lids.map((p) => p.color)).size).toBe(2);
    const floor = skins.filter((p) => p.c[0] > A5_TRENCH[0] && p.c[0] < A5_TRENCH[2] && p.c[2] > A5_TRENCH[1] && p.c[2] < A5_SHELL.north - 0.02 && p.c[1] < 0.1);
    expect(floor.length).toBeGreaterThan(60);
    for (const p of floor) expect(top(p)).toBeLessThanOrEqual(0.02);
    expect(surfaceAt(b.surfaces, 52, 0, 47.2, 'concrete')).toBe('metal');
    // every floor skin in the set is under 2 cm: paint, never a step
    for (const p of skins.filter((q) => bottom(q) < 0.001 && q.s[1] < 0.03)) expect(top(p)).toBeLessThanOrEqual(0.02);
  });

  it("the e2e polish (S567-check): the variant's kiosk press waits for the patrol on his K -> R2 leg and the client is damage-proof; the throw arc assert needs a sample in the beam band", () => {
    const src = readFileSync('scripts/e2e-ctcourse/a5Substation.mjs', 'utf8');
    // 2: before the variant's press, the walker index 1 wait and the client's damage switch
    const press = src.indexOf("A5 variant: the client keys the release'");
    const from = src.indexOf('A5 variant: the client in the inner zone sets a5-in1');
    expect(press).toBeGreaterThan(from);
    expect(src.lastIndexOf("await leftKiosk('A5 variant: the patrol is on his K -> R2 leg before the press')", press)).toBeGreaterThan(from);
    expect(src.lastIndexOf('await noDamageClient();', press)).toBeGreaterThan(from);
    expect(src).toContain('const noDamageClient = async');
    expect(src).toContain('window.__app.current.target.damageMul = 0');
    expect(src).toContain('r.damageMul = 0');
    expect(src).toMatch(/net\.remotes\.values\(\)/);
    // 3: the height at the line is interpolated at the crossing, so an arc never measured there leaves ownMax 0 and fails
    // (S3-7-dress-check S2: no separate band-sample count, which could miss under load)
    expect(src).toMatch(/ownMax = Math\.max\(ownMax, prev\[1\] \+/);
    expect(src).toMatch(/assert\(ownMax > 1\.45,/);
    expect(src).not.toContain('ownMax === 0');
  });
});
