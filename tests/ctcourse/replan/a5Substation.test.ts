/**
 * Marlow re-plan, A5 the Substation (J14 slice G-A5; PLAN section 2 and A19, STATIONS.md sections 3, 5, 6, 8, 9, 10): the set on
 * `ctcourseReplan`. Pins: the re-plan's collision (`GREY`), the contract, the squad (patrol + watcher), stations 11-13 as
 * STATIONS section 3 has them with standing room at their marks, the 6 m perimeter wall with its 1.4 m gap and wicket, the 3.5 m
 * trench at x 62.35-65.85 (a way west only by the footbridge or the plates, no lip or ledge on its west face, irons on the east
 * face), the moved drums, bulkheads and switch, the closed routes (the back door, the north trench path, the beam panel out of
 * jam reach), the watcher's sight with the flood on and jammed, the station flow with its stand-ins, the pass zones, the retry
 * and objective lines. The built A5 is `tests/ctcourse/a5Substation.test.ts` (unchanged); the tick is `a5Ticks.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../../src/ai/enemyDefs';
import { NavGrid, type NavBlocker } from '../../../src/ai/navGrid';
import { seenAt, sightRate, EYE_STAND, PERCEPTION } from '../../../src/ai/perception';
import { COURSE_TEXT_MAX } from '../../../src/config/course';
import { LEAP, MOVEMENT, TEAM } from '../../../src/config/movement';
import { hyp2, hyp3 } from '../../../src/core/mathx';
import { layoutKnownIds, retryKey, validateCourse } from '../../../src/game/course/courseDef';
import { CourseState } from '../../../src/game/course/courseState';
import type { StationDef } from '../../../src/game/course/stationDef';
import { JAMMER, LASER, laserTouch, pickJamTarget, type JamTarget } from '../../../src/game/jammer';
import { panelFor, panelTarget } from '../../../src/game/laserPanels';
import { throwArc, throwLanding, throwLandingOk, throwRoom } from '../../../src/game/teamMoves';
import { GRAVITY } from '../../../src/physics/havok';
import { generateLedges, LEDGE } from '../../../src/world/anchors';
import { LevelBuilder, type BoxPiece } from '../../../src/world/levelBuilder';
import { MARLOW_LEVEL } from '../../../src/world/lighting/levels';
import { MARLOW_CIRCUITS, MARLOW_CIRCUITS_REPLAN, SILENT_PACE } from '../../../src/world/lighting/marlowCircuits';
import { buildCtcourse, COOP_LIPS, lightSpotsReplan } from '../../../src/world/maps/ctcourse';
import { BEAM_KEEP_CLEAR, COOP_BAND, throwGateway } from '../../../src/world/maps/ctcourseGreybox';
import {
  A5_BACK_DOOR,
  A5_BULKHEADS,
  A5_DRUMS,
  A5_FLOOD_JAM,
  A5_FRONT_DOOR,
  A5_GATEWAY,
  A5_HIDE,
  A5_IN1_FLAG,
  A5_INNER_ZONE,
  A5_KIOSK,
  A5_LANDING,
  A5_LASER,
  A5_PANEL,
  A5_PANEL_JAM,
  A5_PATROL,
  A5_PATROL_ROUTE,
  A5_PRESS,
  A5_RELEASE_FLAG,
  A5_ROOM,
  A5_RUNNER,
  A5_SHELL,
  A5_THROW,
  A5_WALL,
} from '../../../src/world/maps/ctcourseSets/a5Substation';
import {
  A5_APRON_E,
  A5_APRON_E_FLAG,
  A5_APRON_W,
  A5_APRON_W_FLAG,
  A5_BACK_GATE,
  A5_BULKHEADS_RP,
  A5_CABLE_TRENCH,
  A5_CLOSERS,
  A5_DRUMS_RP,
  A5_FOOTBRIDGE,
  A5_HOARD,
  A5_FOOTBRIDGE_DOOR,
  A5_FOOTBRIDGE_FLAG,
  A5_FOOTBRIDGE_GATE,
  A5_GANTRY,
  A5_GANTRY_PIPE_Y,
  A5_GAP,
  A5_IRONS,
  A5_LADDER,
  A5_NEVER_FLAG,
  A5_OBJECTIVES,
  A5_PANEL_RP,
  A5_PERIM,
  A5_PLATES,
  A5_PLATES_DOOR,
  A5_PLATES_GATE,
  A5_RETRY_SEEN,
  A5_RETRY_TIMER,
  A5_SUBSTATION_STATIONS,
  A5_SW_APRON_RP,
  A5_SWING_BAR,
  A5_WALLTOP,
  A5_WATCHER,
  A5_WATCHER_POST,
  A5_WICKET,
  A5_WICKET_DOOR,
  A5_WICKET_FLAG,
  A5_WICKET_GATE,
  FLOOR_HOLES,
} from '../../../src/world/maps/ctcourseSets/replan/a5Substation';
import { checkSetPart, inBox, OBJECTIVE_ID_MAX, registerSum, SET_BOX } from '../../../src/world/maps/ctcourseSets/types';
import { lastTimeAtOrOver, LEAP_APEX, MANTLE, SOLO_TOP_SPEED } from '../../helpers/soloJumpReach';

const b = new LevelBuilder();
const built = buildCtcourse(b, { replan: true });
const part = built.parts[4]!;
const lay = built.layout;
const course = lay.course!;
const def = course.def;
const range = built.ranges.a5Substation;
const mine = b.boxes.slice(range.boxes[0], range.boxes[1]);
const box = SET_BOX.a5Substation[0]!;
/** The set's collision on the re-plan: the built set's 24 solids less the drum stack, plus the wall, the gap's walls and lids,
 *  the trench, the crossings, the gantry, the moved drums and the closers; nine lamps (two moved), five doors, four ladders (marlow-play-2 C18: the middle step iron).
 *  (marlow-kit-geo Q2) The swing bar's two posts: 54 solids, the checksum + 438.65. */
const GREY = { solids: 54, checksum: 13236.75, lights: 9, doors: 5, anchors: 4 };
const solid = b.boxes.filter((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3);
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
const T = A5_CABLE_TRENCH;
const tuned = (JSON.parse(readFileSync('tests/ctcourse/replan/a5Substation.light.json', 'utf8')) as { levels: Record<string, number> }).levels;
const anchors = generateLedges(b.boxes, b.anchors);
const laser = part.lasers[0]!;
const BEAM_TOP = Math.max(...laser.ys);
const HEADER = A5_GATEWAY.header!;
const doorAnchor = (cid: string) => b.anchors.doors.find((d) => d.id === course.doors[cid])!;
/** A course door's shut leaf as a thin box (sight and bodies stop on it). */
const leafOf = (cid: string): BoxPiece => {
  const d = doorAnchor(cid);
  const ex = d.hinge.x + Math.sin(d.yaw) * d.width;
  const ez = d.hinge.z + Math.cos(d.yaw) * d.width;
  return { c: [(d.hinge.x + ex) / 2, d.height / 2, (d.hinge.z + ez) / 2], s: [Math.max(Math.abs(ex - d.hinge.x), 0.06), d.height, Math.max(Math.abs(ez - d.hinge.z), 0.06)], yaw: 0, pitch: 0, color: '#000', collide: true, visible: true };
};

/** The solid boxes whose band (floor to 1.7 m) is within `r` of (x, z), the shut leaves `shut` too: what a body there touches. */
const blockedAt = (x: number, z: number, r = MOVEMENT.radius, shut: readonly string[] = []): string[] =>
  [...solid, ...shut.map(leafOf)]
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

/** The first static hit (m) along the segment a -> b through the boxes (slab test), or Infinity: the jammer's / a guard's line of sight. */
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
/** The aiming camera's eyes round a jammer standing at (x, z) facing west: behind and beside the shoulder, 1.5-1.9 m up. */
const eyeCloud = (x: number, z: number): [number, number, number][] => {
  const out: [number, number, number][] = [];
  for (const dx of [0, 0.25, 0.5]) for (const dz of [-0.3, 0, 0.3]) for (const y of [1.5, 1.7, 1.9]) out.push([x + dx, y, z + dz]);
  return out;
};
const jamTargets: JamTarget[] = [
  ...b.lights.lights.filter((l) => l.electric && (l.kind === 'lamp' || l.kind === 'spot')).map((l): JamTarget => ({ id: `lt-${l.id}`, kind: 'light', x: l.x, y: l.y, z: l.z })),
  ...(lay.laserPanels ?? []).map((p): JamTarget => {
    const at = panelTarget(p, { x: 0, y: 0, z: 0 });
    return { id: p.id, kind: 'panel', x: at.x, y: at.y, z: at.z };
  }),
];
const panelAt = panelTarget(A5_PANEL_RP, { x: 0, y: 0, z: 0 });

/** Plan distance from (x, z) to the beam line. */
function distSeg(x: number, z: number): number {
  const sx = laser.x2 - laser.x1;
  const sz = laser.z2 - laser.z1;
  const t = Math.max(0, Math.min(1, ((x - laser.x1) * sx + (z - laser.z1) * sz) / (sx * sx + sz * sz)));
  return hyp2(x - (laser.x1 + sx * t), z - (laser.z1 + sz * t));
}
/** The furthest (m, plan) from a top at `from` to a beam line that a top-gear running jump carries the feet over the top beam. */
function beamJumpReach(from: number, beam: number): number {
  const t2 = lastTimeAtOrOver(from, beam);
  if (t2 === null) return 0;
  const t1 = from >= beam ? 0 : (2 * LEAP.vy) / -GRAVITY.y - t2;
  if (SOLO_TOP_SPEED * (t2 - t1) < 2 * LASER.reach) return 0;
  return SOLO_TOP_SPEED * t2 + MOVEMENT.radius - LASER.reach;
}
/** The solo-standable tops on the gateway's approach side from which a running jump carries a player alone over the beams. */
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

/** The standing surface at (x, z): the highest collidable top at or under 0.1 m (the slab, the trench floor, a crossing's deck). */
const floorAt = (x: number, z: number): number => {
  let h = -Infinity;
  for (const p of solid) if (top(p) <= 0.1 && Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2) h = Math.max(h, top(p));
  return h;
};
const NAV_BOX = [39, 23, 71, 49] as const;
/**
 * A nav grid over the set the way the game builds one (cell 0.25, a player's radius, step 0.45), the heights from the boxes (the
 * trench floor is 1.6 m down: no step), the shut course doors `shut` standing as thin leaves, the pieces `drop` left out (a check's teeth); no flood seed (every cell stays).
 */
function setNav(shut: readonly string[], drop: readonly BoxPiece[] = []): NavGrid {
  const pieces = [...solid.filter((p) => !p.overhead && !drop.includes(p)), ...shut.map(leafOf)];
  const blockers: NavBlocker[] = pieces
    .filter((p) => p.c[0] + p.s[0] / 2 > NAV_BOX[0] && p.c[0] - p.s[0] / 2 < NAV_BOX[2] && p.c[2] + p.s[2] / 2 > NAV_BOX[1] && p.c[2] - p.s[2] / 2 < NAV_BOX[3])
    .map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: 0, bottom: bottom(p), top: top(p) }));
  return new NavGrid({
    minX: 40,
    maxX: 70,
    minZ: 24,
    maxZ: 48,
    cell: 0.25,
    agentRadius: MOVEMENT.radius,
    stepHeight: 0.45,
    blockers,
    sample: (x, z) => {
      const h = floorAt(x, z);
      return { h: h === -Infinity ? 0 : h, ok: h !== -Infinity };
    },
  });
}
const ALL_SHUT = [A5_WICKET_DOOR, A5_FOOTBRIDGE_DOOR, A5_PLATES_DOOR];
const without = (...open: string[]): string[] => ALL_SHUT.filter((d) => !open.includes(d));
const reaches = (nav: NavGrid, a: readonly [number, number], c: readonly [number, number], ya = 0, yc = 0): boolean => nav.findPath([a[0], a[1]], [c[0], c[1]], 1e6, ya, yc) !== null;
const GAP_AT: [number, number] = [69.05, 33.0];
const EAST_STRIP: [number, number] = [66.85, 33.0];
const WEST_STRIP: [number, number] = [60.5, 37.0];
const THROW_MARK: [number, number] = [A5_THROW.x, A5_THROW.z];

/** A fresh course at set 5 (station 11 live) with the two players at the given feet. */
function runAt(a: [number, number], c: [number, number]): CourseState {
  const s = new CourseState(def, course.consoles);
  s.startAt(5);
  s.setPlayer(0, a[0], 0, a[1], false);
  s.setPlayer(1, c[0], 0, c[1], false);
  s.update(1 / 60);
  return s;
}
const plainB = new LevelBuilder();
const plain = buildCtcourse(plainB);
const plainPart = plain.parts[4]!;

/** The sheet (STATIONS.md section 3, the A5 block), verbatim. */
const SHEET: StationDef[] = [
  { n: 11, id: 'a5-chimney', lesson: 'chimney_pair', retry: 'none', doneFlag: 'a5-apron-e', kit: 'chimneyPair', standIn: 'g-a5-wicket',
    marks: [{ x: 69.0, z: 32.0, y: 0, yaw: -Math.PI / 2 }, { x: 69.0, z: 34.0, y: 0, yaw: -Math.PI / 2 }],
    guards: [], gates: ['g-a5-wicket'] },
  { n: 12, id: 'a5-swing', lesson: 'swing_pass', retry: 'none', doneFlag: 'a5-apron-w', kit: 'swingPass', standIn: 'g-a5-footbridge',
    marks: [{ x: 67.0, z: 33.0, y: 0, yaw: -Math.PI / 2 }, { x: 67.0, z: 34.5, y: 0, yaw: -Math.PI / 2 }],
    guards: [], gates: ['g-a5-footbridge', 'g-a5-plates'] },
  { n: 13, id: 'a5-throw', lesson: 'throw', retry: 'station', doneFlag: 'a5-release', drillS: 9,
    marks: [{ x: 59.0, z: 36.0, y: 0, yaw: -Math.PI / 2 }, { x: 56.0, z: 36.0, y: 0, yaw: -Math.PI / 2 }],
    guards: ['a5-patrol', 'a5-watcher'], gates: ['g-a5-release', 'laser-a5'] },
];

describe('Marlow re-plan A5 the Substation (G-A5): the part', () => {
  it('passes the set-part contract; the re-plan course validates; every register row is an A5 row and counts the builder', () => {
    expect(part.id).toBe('a5Substation');
    expect(part.stub).toBeUndefined();
    expect(checkSetPart(part)).toEqual([]);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
    expect(part.register.every((r) => r.id.startsWith('A5-'))).toBe(true);
    expect(part.register.map((r) => r.id)).toEqual(expect.arrayContaining(['A5-3', 'A5-10', ...Array.from({ length: 9 }, (_, i) => `A5-R${i + 1}`)]));
    expect(registerSum(part.register)).toEqual(built.counts.sets.a5Substation);
    for (const r of part.register) expect(/[–—]/.test(r.element), r.id).toBe(false);
  });

  it('GREY: the re-plan collision (solids, checksum), nine lamps (two moved), five doors (wicket, footbridge, plates added), four ladders', () => {
    const mineSolid = mine.filter((p) => p.collide);
    let sum = 0;
    for (const p of mineSolid) sum += p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw;
    expect(mineSolid).toHaveLength(GREY.solids);
    expect(sum).toBeCloseTo(GREY.checksum, 2);
    const c = built.counts.sets.a5Substation;
    expect(c.solids).toBe(GREY.solids);
    expect(c.lights).toBe(GREY.lights);
    expect(c.doors).toBe(GREY.doors);
    expect(c.anchors).toBe(GREY.anchors);
  });

  it('flag off: the built yard keeps its A5 (one guard, the drums, the panel and the apron switch where they were, no wall, no stations, no trench hole)', () => {
    expect(plainPart.bay.squad).toEqual([A5_PATROL]);
    expect(plainPart.bay.stations).toBeUndefined();
    expect(plainPart.laserPanels).toEqual([A5_PANEL]);
    expect(plainPart.switches.find((s) => s.id === 'a5-sw-apron')!.pos).toEqual({ x: 69.7, y: 1.2, z: 36.0 });
    expect(Object.keys(plainPart.doors)).toEqual([A5_FRONT_DOOR, A5_BACK_DOOR]);
    expect(plainPart.bay.gates.some((g) => g.id === A5_BACK_GATE)).toBe(false);
    expect(plain.layout.course!.def.bays[4]!.stations).toBeUndefined();
    const drums = plainB.boxes.find((p) => p.collide && Math.abs(p.c[0] - 63.2) < 1e-6 && Math.abs(p.s[1] - A5_DRUMS.h) < 1e-6);
    expect(drums).toBeDefined();
    expect(plainB.boxes.some((p) => p.collide && Math.abs(p.c[0] - (A5_PERIM.x0 + A5_PERIM.x1) / 2) < 1e-6 && p.s[1] >= 6)).toBe(false);
  });

  it('everything built lies inside the set box (0.3 m of wall slack) and under the hall roof; every block 1.9 m or taller is noLedge', () => {
    const [x0, z0, x1, z1] = box;
    for (const p of mine) {
      expect(p.c[0] - p.s[0] / 2, 'west').toBeGreaterThanOrEqual(x0 - 0.3);
      expect(p.c[0] + p.s[0] / 2, 'east').toBeLessThanOrEqual(x1 + 0.3);
      expect(p.c[2] - p.s[2] / 2, 'south').toBeGreaterThanOrEqual(z0 - 0.3);
      expect(p.c[2] + p.s[2] / 2, 'north').toBeLessThanOrEqual(z1 + 0.3);
      expect(top(p)).toBeLessThanOrEqual(10 + 1e-6);
    }
    for (const p of mine) if (top(p) >= 1.9 && p.collide) expect(p.noLedge, `box at (${p.c.join(', ')}) size (${p.s.join(', ')})`).toBe(true);
  });

  it('no lip in the co-op band and no manual ledge in A5: no lips, none on COOP_LIPS, no generated lip at the band or on a new wall', () => {
    expect(part.lips).toEqual([]);
    expect(COOP_LIPS.some((l) => inBox(box, l.a.x, l.a.z))).toBe(false);
    const inA5 = anchors.ledges.filter((l) => inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, -0.3));
    expect(inA5.filter((l) => l.top >= COOP_BAND.min - 0.5).map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
    expect(inA5.filter((l) => l.piece === 0)).toEqual([]);
    // the perimeter wall, its cross walls, the trench and the crossings carry no grip at all
    const near = inA5.filter((l) => (l.a.x + l.b.x) / 2 > 61.5 && (l.a.x + l.b.x) / 2 < 70 && l.top > 0.5 && (l.a.z + l.b.z) / 2 < 47);
    expect(near.map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
  });
});

describe('Marlow re-plan A5: the perimeter wall, the 1.4 m gap and the wicket (station 11)', () => {
  const wallPieces = mine.filter((p) => p.collide && Math.abs(p.c[0] - (A5_PERIM.x0 + A5_PERIM.x1) / 2) < 1e-6 && Math.abs(p.s[0] - 0.5) < 1e-6);

  it('the wall is 6 m, x 67.85-68.35, z 24.25-47.75 wall to wall, noLedge on every piece, with the wicket gap z 32.4-33.6 under a header to the top', () => {
    const runs = wallPieces.filter((w) => bottom(w) < 1e-6).map((w) => [w.c[2] - w.s[2] / 2, w.c[2] + w.s[2] / 2]).sort((p, q) => p[0]! - q[0]!);
    expect(runs.map((r) => r.map((v) => Number(v.toFixed(3))))).toEqual([[24.25, 32.4], [33.6, 47.75]]);
    for (const w of wallPieces) {
      expect(w.noLedge).toBe(true);
      expect(top(w)).toBeCloseTo(6, 9);
    }
    const header = wallPieces.find((w) => bottom(w) > 1)!;
    expect(bottom(header)).toBeCloseTo(A5_WICKET.h, 9);
    expect(header.overhead).toBe(true);
    // wall to wall: the runs meet the shell walls' faces (24.25 / 47.75)
    expect(runs[0]![0]).toBeLessThanOrEqual(A5_SHELL.south + 1e-9);
    expect(runs[1]![1]).toBeGreaterThanOrEqual(A5_SHELL.north - 1e-9);
    expect(A5_PERIM.x0).toBe(67.85);
    expect(A5_PERIM.x1).toBe(68.35);
  });

  it('the gap is 1.4 m clear (wall face 68.35 to L4\'s outer face 69.75) and z 30.25-35.75, closed by 6 m cross walls at z 30 and 36; nothing stands in it', () => {
    expect(A5_GAP.x1 - A5_GAP.x0).toBeCloseTo(1.4, 9);
    expect(A5_GAP.x1).toBe(A5_SHELL.east);
    expect(A5_GAP.z1 - A5_GAP.z0).toBeCloseTo(5.5, 9);
    const crosses = solid.filter((p) => Math.abs(p.c[0] - (A5_GAP.x0 + A5_GAP.x1) / 2) < 1e-6 && Math.abs(p.s[0] - 1.4) < 1e-6 && top(p) >= 6 - 1e-6 && bottom(p) < 1e-6);
    expect(crosses.map((p) => [Number((p.c[2] - p.s[2] / 2).toFixed(3)), Number((p.c[2] + p.s[2] / 2).toFixed(3))])).toEqual([[29.75, 30.25], [35.75, 36.25]]);
    for (const p of crosses) expect(p.noLedge).toBe(true);
    const overlaps = (p: BoxPiece): boolean => p.c[0] - p.s[0] / 2 < A5_GAP.x1 - 1e-6 && p.c[0] + p.s[0] / 2 > A5_GAP.x0 + 1e-6 && p.c[2] - p.s[2] / 2 < A5_GAP.z1 - 1e-6 && p.c[2] + p.s[2] / 2 > A5_GAP.z0 + 1e-6 && bottom(p) < 2.1 && top(p) > 0.05;
    expect(solid.filter(overlaps).map((p) => `(${p.c.join(', ')})`)).toEqual([]);
    // a body of 0.65 m radius fits on the middle line the whole way
    for (let z = A5_GAP.z0 + 0.7; z <= A5_GAP.z1 - 0.7 + 1e-9; z += 0.25) expect(blockedAt(69.05, z, 0.65), `z ${z}`).toEqual([]);
  });

  it('the strips x 68.35-69.75 north and south of the gap are sealed dead space: the cross walls, the wall and L4\'s face close them, lids at the wall top, no lamp or switch inside', () => {
    const lids = solid.filter((p) => p.overhead && Math.abs(top(p) - 6) < 1e-6 && Math.abs(p.c[0] - 69.05) < 1e-6);
    expect(lids.map((p) => [Number((p.c[2] - p.s[2] / 2).toFixed(3)), Number((p.c[2] + p.s[2] / 2).toFixed(3))])).toEqual([[24.25, 29.75], [36.25, 47.75]]);
    for (const l of lids) expect(l.noLedge).toBe(true);
    const nav = setNav(ALL_SHUT);
    for (const z of [26, 28.5, 38, 44]) expect(reaches(nav, GAP_AT, [69.05, z]), `z ${z}`).toBe(false);
    for (const l of b.lights.lights) expect(l.x > A5_GAP.x0 && l.x < A5_GAP.x1 && l.z > 24 && l.z < 48 && l.kind !== 'flashlight', `lamp ${l.id}`).toBe(false);
    for (const s of part.switches) expect(s.pos.x < A5_GAP.x0, s.id).toBe(true);
  });

  it('the wicket: a 1.2 x 2.1 door in the wall at z 32.4-33.6 facing L4\'s far door (z 33), built locked and unbreachable, opening west onto the apron', () => {
    const d = doorAnchor(A5_WICKET_DOOR);
    expect(d.width).toBeCloseTo(1.2, 9);
    expect(d.height).toBeCloseTo(2.1, 9);
    expect(d.locked).toBe(true);
    expect(d.breachable).toBe(false);
    expect([d.hinge.x, d.hinge.z]).toEqual([(A5_PERIM.x0 + A5_PERIM.x1) / 2, A5_WICKET.z0]);
    expect(A5_WICKET.z0 + (A5_WICKET.z1 - A5_WICKET.z0) / 2).toBeCloseTo(33, 9);
    // the open leaf points west (yaw -PI/2 from +z): onto the apron, never into the gap
    expect(d.yaw + d.swing * 1.5).toBeLessThan(0);
    expect(Object.keys(part.doors)).toEqual([A5_FRONT_DOOR, A5_BACK_DOOR, A5_WICKET_DOOR, A5_FOOTBRIDGE_DOOR, A5_PLATES_DOOR]);
  });

  it('the wicket gate is a latching flag gate (never hold, timedHold or mains), its flag an external flag; the footbridge\'s the same', () => {
    for (const [id, flag, doorId] of [[A5_WICKET_GATE, A5_WICKET_FLAG, A5_WICKET_DOOR], [A5_FOOTBRIDGE_GATE, A5_FOOTBRIDGE_FLAG, A5_FOOTBRIDGE_DOOR]] as const) {
      const g = part.bay.gates.find((x) => x.id === id)!;
      expect(g).toEqual({ kind: 'flag', id, flag, doorId });
      expect(['hold', 'timedHold', 'mains']).not.toContain(g.kind);
      expect(part.externalFlags).toContain(flag);
    }
  });

  it('the fixed access ladder on the wall\'s inside face runs from the apron to the wall top a5-walltop (6 m, x 67.85-68.35, z 30.25-35.75)', () => {
    const l = b.anchors.ladders.find((q) => Math.abs(q.base.x - A5_LADDER.x) < 1e-6 && Math.abs(q.base.z - A5_LADDER.z) < 1e-6)!;
    expect(l).toBeDefined();
    expect(l.base.y).toBe(0);
    expect(l.top.y).toBe(6);
    expect(l.facing).toBeCloseTo(Math.PI / 2, 9);
    expect(A5_PERIM.x0 - l.base.x).toBeLessThan(0.25);
    expect(inBox([A5_WALLTOP.x0, A5_WALLTOP.z0, A5_WALLTOP.x1, A5_WALLTOP.z1], l.top.x, l.top.z)).toBe(true);
    expect(A5_WALLTOP.y).toBe(6);
    expect(A5_LADDER.z).toBeGreaterThanOrEqual(30);
    expect(A5_LADDER.z).toBeLessThanOrEqual(36);
    expect(blockedAt(l.base.x - 0.5, l.base.z)).toEqual([]);
  });
});

describe('Marlow re-plan A5: the cable trench, the footbridge, the plates and the gantry (station 12)', () => {
  const inTrench = (p: BoxPiece): boolean => p.c[0] > T.x0 && p.c[0] < T.x1 && p.c[2] > T.z0 && p.c[2] < T.z1;

  it('the trench is 3.5 m wide at x 62.35-65.85, z 24.25-47.75, floor -1.6, cut in the site slab (FLOOR_HOLES); the apron\'s east strip is 2.0 m and its west strip 4.2 m', () => {
    expect(FLOOR_HOLES).toEqual([[62.35, 24.25, 65.85, 47.75]]);
    expect(T.x1 - T.x0).toBeCloseTo(3.5, 9);
    expect(T.floor).toBe(-1.6);
    expect(A5_PERIM.x0 - T.x1).toBeCloseTo(2.0, 9);
    expect(T.x0 - A5_WALL.near).toBeCloseTo(4.2, 9);
    // no slab piece over the hole but the crossings' decks; the floor under it is the trench floor
    const slabs = b.boxes.filter((p) => p.collide && Math.abs(top(p)) < 1e-6 && inTrench(p));
    expect(slabs.every((p) => Math.abs(p.s[1] - 0.15) < 1e-6)).toBe(true);
    expect(floorAt(64.1, 28)).toBeCloseTo(-1.6, 9);
    expect(floorAt(64.1, 33)).toBeCloseTo(-1.6, 9);
    expect(floorAt(61.9, 33)).toBe(0);
    expect(floorAt(66.3, 33)).toBe(0);
  });

  it('a solo running jump does not clear the trench (reach plus a body radius each side is under 3.5 m)', () => {
    const reach = SOLO_TOP_SPEED * ((2 * LEAP.vy) / -GRAVITY.y);
    expect(reach + 2 * MOVEMENT.radius).toBeLessThan(T.x1 - T.x0);
  });

  it('on the nav, from the gap with every gate shut nothing west of the wall is reachable; the open wicket gives the east strip and no more', () => {
    const shut = setNav(ALL_SHUT);
    for (const to of [EAST_STRIP, WEST_STRIP, THROW_MARK, [A5_LANDING.x, A5_LANDING.z] as const]) expect(reaches(shut, GAP_AT, to), `shut -> ${to}`).toBe(false);
    const wicket = setNav(without(A5_WICKET_DOOR));
    expect(reaches(wicket, GAP_AT, EAST_STRIP)).toBe(true);
    expect(reaches(wicket, GAP_AT, [66.3, 25.5])).toBe(true);
    expect(reaches(wicket, GAP_AT, [66.3, 46.5])).toBe(true);
    for (const to of [WEST_STRIP, THROW_MARK, [A5_LANDING.x, A5_LANDING.z] as const]) expect(reaches(wicket, GAP_AT, to), `wicket -> ${to}`).toBe(false);
    // the check bites: without the wall the gap walks straight onto the apron
    const noWall = setNav(ALL_SHUT, wallPieces());
    expect(reaches(noWall, GAP_AT, EAST_STRIP)).toBe(true);
  });

  it('with the wicket open the only way west of the trench is the footbridge (open) or the plates (open), each both ways', () => {
    const bridge = setNav(without(A5_WICKET_DOOR, A5_FOOTBRIDGE_DOOR));
    expect(reaches(bridge, GAP_AT, WEST_STRIP)).toBe(true);
    expect(reaches(bridge, GAP_AT, THROW_MARK)).toBe(true);
    expect(reaches(bridge, WEST_STRIP, EAST_STRIP)).toBe(true);
    const plates = setNav(without(A5_WICKET_DOOR, A5_PLATES_DOOR));
    expect(reaches(plates, GAP_AT, WEST_STRIP)).toBe(true);
    expect(reaches(plates, WEST_STRIP, EAST_STRIP)).toBe(true);
    // each alone with the other shut, and neither with both shut
    expect(reaches(setNav(without(A5_FOOTBRIDGE_DOOR)), GAP_AT, WEST_STRIP)).toBe(false);
    expect(reaches(setNav(without(A5_WICKET_DOOR)), EAST_STRIP, WEST_STRIP)).toBe(false);
    // the trench floor is no way across: nothing on the trench floor walks to the west strip
    expect(reaches(setNav(ALL_SHUT), [64.1, 30], WEST_STRIP, -1.6, 0)).toBe(false);
    expect(reaches(setNav(ALL_SHUT), [64.1, 30], EAST_STRIP, -1.6, 0)).toBe(false);
  });

  it('nothing on the trench\'s west face is a ledge, lip or ladder reachable from its floor (no grip in 61.5-62.6, none on the walls, no west irons)', () => {
    const west = anchors.ledges.filter((l) => (l.a.x + l.b.x) / 2 > 61 && (l.a.x + l.b.x) / 2 < 63 && (l.a.z + l.b.z) / 2 > 24 && (l.a.z + l.b.z) / 2 < 48);
    expect(west.map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
    const walls = solid.filter((p) => p.c[0] + p.s[0] / 2 > T.x0 - 0.4 && p.c[0] - p.s[0] / 2 < T.x1 + 0.4 && top(p) <= 0.01 && bottom(p) < -0.3 && bottom(p) > -2.5);
    expect(walls.length).toBeGreaterThanOrEqual(5);
    for (const p of walls) expect(p.noLedge, `(${p.c.join(', ')})`).toBe(true);
    const lads = b.anchors.ladders.filter((l) => inBox(box, l.base.x, l.base.z) && l.base.y < -1);
    expect(lads).toHaveLength(3);
    for (const l of lads) expect(l.base.x).toBeGreaterThan((T.x0 + T.x1) / 2);
    expect(part.lips).toEqual([]);
  });

  it('step irons on the east face at both ends and between the decks: ladders from the trench floor to the apron at z 25.0, 38.3 and 47.0 (a fall is a walk back)', () => {
    const lads = b.anchors.ladders.filter((l) => inBox(box, l.base.x, l.base.z) && l.base.y < -1).sort((p, q) => p.base.z - q.base.z);
    expect(lads.map((l) => [l.base.x, l.base.z])).toEqual(A5_IRONS.map((i) => [i.x, i.z]));
    for (const l of lads) {
      expect(l.base.y).toBeCloseTo(-1.6, 9);
      expect(l.top.y).toBe(0);
      expect(l.facing).toBeCloseTo(Math.PI / 2, 9);
      expect(T.x1 - l.base.x).toBeLessThan(0.25);
      expect(l.top.x).toBeGreaterThan(T.x1);
      expect(blockedAt(l.top.x + 0.3, l.top.z)).toEqual([]);
    }
    expect(lads[0]!.base.z - T.z0).toBeLessThan(1);
    expect(T.z1 - lads[2]!.base.z).toBeLessThan(1);
    // (marlow-play-2 C18) the middle iron stands in the open slot between the footbridge's deck and the plates' (no deck over it)
    const mid = lads[1]!;
    expect(mid.base.z - 0.2).toBeGreaterThan(A5_FOOTBRIDGE.z1 + A5_HOARD.t);
    expect(mid.base.z + 0.2).toBeLessThan(A5_PLATES.z0 - A5_HOARD.t);
  });

  it('the footbridge is 1.2 m clear at z 36.4-37.6 (deck flush, 2.4 m hoarding, noLedge), its door A5-footbridge at the east end; the plates are 3 m (z 39.0-42.0) with a bolt door at the west end', () => {
    expect(A5_FOOTBRIDGE.z1 - A5_FOOTBRIDGE.z0).toBeCloseTo(1.2, 9);
    expect(A5_PLATES.z1 - A5_PLATES.z0).toBeCloseTo(3, 9);
    const hoard = solid.filter((p) => inTrenchSpan(p) && Math.abs(top(p) - 2.4) < 1e-6 && Math.abs(p.s[0] - 3.5) < 1e-6);
    expect(hoard).toHaveLength(4);
    for (const p of hoard) expect(p.noLedge).toBe(true);
    const faces = hoard.map((p) => [p.c[2] - p.s[2] / 2, p.c[2] + p.s[2] / 2]).sort((p, q) => p[0]! - q[0]!);
    expect([faces[0]![1], faces[1]![0], faces[2]![1], faces[3]![0]].map((v) => Number(v!.toFixed(3)))).toEqual([A5_FOOTBRIDGE.z0, A5_FOOTBRIDGE.z1, A5_PLATES.z0, A5_PLATES.z1]);
    for (const z of [36.75, 37.0, 37.25]) expect(floorAt(64.1, z)).toBe(0);
    for (const z of [39.5, 40.5, 41.5]) expect(floorAt(64.1, z)).toBe(0);
    expect(floorAt(64.1, 38.5)).toBeCloseTo(-1.6, 9);
    const fb = doorAnchor(A5_FOOTBRIDGE_DOOR);
    const pl = doorAnchor(A5_PLATES_DOOR);
    for (const d of [fb, pl]) {
      expect(d.locked).toBe(true);
      expect(d.breachable).toBe(false);
      expect(d.width).toBeCloseTo(1.2, 9);
    }
    expect(fb.hinge.x).toBeCloseTo(T.x1, 9);
    expect(pl.hinge.x).toBeCloseTo(T.x0, 9);
    expect(part.bay.gates.find((g) => g.id === A5_PLATES_GATE)).toMatchObject({ kind: 'bolt', doorId: A5_PLATES_DOOR, side: [-1, 0] });
  });

  it('the plates open only from the west side: the bolt gate takes a press on the door from the west, never from the apron\'s east strip', () => {
    const g = part.bay.gates.find((x) => x.id === A5_PLATES_GATE);
    if (g?.kind !== 'bolt') throw new Error('the plates gate is not a bolt');
    // the bolt's side is a press from the west (-x) of the door's centre on the trench's west edge; the east strip and the deck are on the other side
    const side = (x: number, z: number): number => (x - g.at[0]) * g.side[0] + (z - g.at[1]) * g.side[1];
    expect(side(60.5, 40.5)).toBeGreaterThan(0.5);
    expect(side(59.0, 36.0)).toBeGreaterThan(0.5);
    for (const [x, z] of [[66.8, 40.5], [64.1, 40.5], [63.0, 40.5]] as const) expect(side(x, z), `(${x}, ${z})`).toBeLessThan(0);
    expect(g.at[0]).toBeCloseTo(T.x0, 9);
    expect(g.at[1]).toBeCloseTo(40.5, 9);
    const s = runAt([60.5, 40.5], [66.8, 41.0]);
    expect(s.locked(A5_PLATES_DOOR)).toBe(true);
    expect(s.boltUsable(A5_PLATES_GATE)).toBe(true);
    expect(s.isGateOpen(A5_PLATES_GATE)).toBe(false);
  });

  it('the cable-tray gantry stands over the trench at z 44.6 (a steel frame on the trench edges, its pipe at a named height KS4 sets)', () => {
    expect(A5_GANTRY.z).toBe(44.6);
    expect(A5_GANTRY.xw + A5_GANTRY.post).toBeCloseTo(T.x0, 9);
    expect(A5_GANTRY.xe - A5_GANTRY.post).toBeCloseTo(T.x1, 9);
    expect(A5_GANTRY_PIPE_Y).toBeGreaterThan(MOVEMENT.standHeight);
    expect(A5_GANTRY_PIPE_Y).toBeLessThan(A5_GANTRY.top - A5_GANTRY.beam);
    const posts = mine.filter((p) => p.collide && Math.abs(p.c[2] - 44.6) < 1e-6 && Math.abs(top(p) - A5_GANTRY.top) < 1e-6);
    expect(posts).toHaveLength(3);
    for (const p of posts) expect(p.noLedge).toBe(true);
    const pipe = mine.find((p) => !p.collide && Math.abs(p.c[1] - A5_GANTRY_PIPE_Y) < 1e-6 && Math.abs(p.c[2] - 44.6) < 1e-6)!;
    expect(pipe).toBeDefined();
    expect(pipe.s[0]).toBeCloseTo(T.x1 - T.x0, 6);
    // the gantry is no solo way across: no solo-standable top near it
    expect(beamThreats(solid)).toEqual([]);
  });

  it('no floor paint or skin floats over the open trench (the seams and stains that crossed it are left out; the crossings, gantry and fences are the only pieces over it)', () => {
    const floating = (p: BoxPiece): boolean => !p.collide && p.visible !== false && bottom(p) > -0.05 && top(p) < 0.05 && p.c[0] + p.s[0] / 2 > T.x0 + 0.01 && p.c[0] - p.s[0] / 2 < T.x1 - 0.01 && p.c[2] > 24.3 && p.c[2] < 47.7;
    const over = mine.filter(floating);
    const onCrossing = (p: BoxPiece): boolean => [[A5_FOOTBRIDGE.z0, A5_FOOTBRIDGE.z1], [A5_PLATES.z0, A5_PLATES.z1]].some(([z0, z1]) => p.c[2] > z0! && p.c[2] < z1!);
    expect(over.filter((p) => !onCrossing(p)).map((p) => `(${p.c.join(', ')}) size (${p.s.join(', ')})`)).toEqual([]);
    // the check bites: the built yard's A5 paints its seams and stains across the same footprint
    expect(plainB.boxes.slice(plain.ranges.a5Substation.boxes[0], plain.ranges.a5Substation.boxes[1]).filter(floating).length).toBeGreaterThan(3);
  });

  /** The footbridge / plates span: pieces over the trench's x range. */
  function inTrenchSpan(p: BoxPiece): boolean {
    return p.c[0] > T.x0 && p.c[0] < T.x1;
  }
  function wallPieces(): BoxPiece[] {
    return solid.filter((p) => Math.abs(p.c[0] - (A5_PERIM.x0 + A5_PERIM.x1) / 2) < 1e-6 && Math.abs(p.s[0] - 0.5) < 1e-6);
  }
});

/**
 * (marlow-kit-geo Q2) The swing bar: Swing Pass's anchor. The band (coop-kit PLAN "Swing Pass", K4 not built yet): gap
 * 2.0-3.5 m, bar 2.2-2.8 m over the near floor, far floor within 0.4 m of the near one, a far landing at least 0.75 m deep,
 * the anchor within 0.8 m of the near edge point.
 */
describe('Marlow re-plan A5: the swing bar (station 12, marlow-kit-geo Q2)', () => {
  const SWING = { gapMin: 2.0, gapMax: 3.5, barMin: 2.2, barMax: 2.8, level: 0.4, landing: 0.75, anchorReach: 0.8 } as const;
  const S = A5_SWING_BAR;
  const r = MOVEMENT.radius;
  const posts = mine.filter((p) => p.collide && Math.abs(p.c[0] - (S.x0 + S.x1) / 2) < 1e-6 && Math.abs(top(p) - S.top) < 1e-6 && S.posts.some((z) => Math.abs(p.c[2] - z) < 1e-6));
  /** The floor top under (x, z): the highest collider top at or under y 0.05 there. */
  const floorAt = (x: number, z: number): number =>
    Math.max(...solid.filter((p) => top(p) <= 0.05 && Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2).map(top), -Infinity);

  it('two noLedge posts on the trench\'s east edge at z 42.4 and 43.6, the bar between them along the edge at the pipe height (visual: no pipe anchor anywhere near it)', () => {
    expect(posts).toHaveLength(2);
    for (const p of posts) {
      expect(p.noLedge).toBe(true);
      expect(bottom(p)).toBeCloseTo(0, 9);
      expect(top(p)).toBeGreaterThan(A5_GANTRY_PIPE_Y);
    }
    expect(S.x0).toBe(T.x1);
    const bar = mine.find((p) => !p.collide && Math.abs(p.c[1] - A5_GANTRY_PIPE_Y) < 1e-6 && Math.abs(p.c[2] - S.z) < 1e-6)!;
    expect(bar).toBeDefined();
    expect(bar.s[2]).toBeCloseTo(S.posts[1] - S.posts[0] - S.post, 6);
    const near = (a: { x: number; y: number; z: number }): boolean => Math.abs(a.x - S.x0) < 1.5 && Math.abs(a.z - S.z) < 2 && Math.abs(a.y - A5_GANTRY_PIPE_Y) < 1.5;
    expect(b.anchors.pipesH.filter((a) => near(a.a) || near(a.b))).toEqual([]);
    expect(b.anchors.pipesV.filter((a) => near(a.base))).toEqual([]);
  });

  it('inside Swing Pass\'s band: bar 2.6 m over the near floor (0.2 m inside both ends), gap 3.5 m (the band\'s top), both floors at 0', () => {
    expect(A5_GANTRY_PIPE_Y - floorAt(S.x1 + 0.3, S.z)).toBeGreaterThanOrEqual(SWING.barMin + 0.2 - 1e-9);
    expect(A5_GANTRY_PIPE_Y - floorAt(S.x1 + 0.3, S.z)).toBeLessThanOrEqual(SWING.barMax - 0.2 + 1e-9);
    const gap = T.x1 - T.x0;
    expect(gap).toBeGreaterThanOrEqual(SWING.gapMin);
    expect(gap).toBeLessThanOrEqual(SWING.gapMax);
    expect(floorAt(S.x1 + 0.3, S.z)).toBeCloseTo(0, 9);
    expect(Math.abs(floorAt(T.x0 - 0.5, S.z) - floorAt(S.x1 + 0.3, S.z))).toBeLessThanOrEqual(SWING.level - 0.3);
  });

  it('nothing stands on the swing line: from the anchor\'s spot over the trench to past the landing, a body-wide strip on z 43.0 has no collider between the floor and the bar; the gantry\'s and the bar\'s posts are off it', () => {
    const x0 = T.x0 - SWING.landing - r;
    const x1 = S.x1 + SWING.anchorReach;
    const half = r + 0.1;
    const hit = solid.filter((p) => top(p) > 0.01 && bottom(p) < A5_GANTRY_PIPE_Y && p.c[0] - p.s[0] / 2 < x1 && p.c[0] + p.s[0] / 2 > x0 && Math.abs(p.c[2] - S.z) < p.s[2] / 2 + half);
    expect(hit.map((p) => `(${p.c.join(', ')}) size (${p.s.join(', ')})`)).toEqual([]);
    for (const z of S.posts) expect(Math.abs(z - S.z) - S.post / 2).toBeGreaterThanOrEqual(r + 0.2);
    expect(Math.abs(A5_GANTRY.z - S.z) - A5_GANTRY.post / 2).toBeGreaterThanOrEqual(r + 0.2);
    // the hoarding of the plates (z 42.1) and the drums (z 43.9) stand 0.9 m off the line
    expect(S.z - (A5_PLATES.z1 + A5_HOARD.t)).toBeCloseTo(0.9, 9);
    expect(A5_DRUMS_RP.z0 - S.z).toBeCloseTo(0.9, 9);
  });

  it('the far landing on the line is the west strip to its wall, 4.2 m deep (the band\'s 0.75 m), and a body stands anywhere on it; the anchor and the rider have room on the east strip', () => {
    const depth = T.x0 - A5_WALL.near;
    expect(depth).toBeCloseTo(4.2, 9);
    expect(depth).toBeGreaterThanOrEqual(SWING.landing + 1);
    for (let x = T.x0 - r - 0.05; x >= A5_WALL.near + r + 0.05 - 1e-9; x -= 0.1) {
      expect(blockedAt(x, S.z), `landing x ${x.toFixed(2)}`).toEqual([]);
      expect(floorAt(x, S.z)).toBeCloseTo(0, 9);
    }
    for (const x of [S.x1 + r + 0.05, S.x1 + SWING.anchorReach, A5_PERIM.x0 - r - 0.05]) expect(blockedAt(x, S.z), `east strip x ${x.toFixed(2)}`).toEqual([]);
  });
});

describe('Marlow re-plan A5: the moved pieces (drums, bulkheads, apron switch)', () => {
  const drums = mine.find((p) => p.collide && Math.abs(top(p) - A5_DRUMS_RP.h) < 1e-6 && Math.abs(p.c[0] - (A5_DRUMS_RP.x0 + A5_DRUMS_RP.x1) / 2) < 1e-6)!;

  it('the drum stack moved to the west strip (x 59.6-61.8, z 43.9-47.5), 4 m and more off the beam line, nothing left at its old spot, and no solo-standable top within a beam-clearing jump', () => {
    expect(drums).toBeDefined();
    expect([drums.c[0] - drums.s[0] / 2, drums.c[0] + drums.s[0] / 2, drums.c[2] - drums.s[2] / 2, drums.c[2] + drums.s[2] / 2].map((v) => Number(v.toFixed(3)))).toEqual([A5_DRUMS_RP.x0, A5_DRUMS_RP.x1, A5_DRUMS_RP.z0, A5_DRUMS_RP.z1]);
    expect(drums.noLedge).toBeFalsy();
    expect(solid.some((p) => Math.abs(p.c[0] - (A5_DRUMS.x0 + A5_DRUMS.x1) / 2) < 1e-6 && Math.abs(p.s[1] - A5_DRUMS.h) < 1e-6)).toBe(false);
    let near = Infinity;
    for (let x = A5_DRUMS_RP.x0; x <= A5_DRUMS_RP.x1; x += 0.1) for (let z = A5_DRUMS_RP.z0; z <= A5_DRUMS_RP.z1; z += 0.1) near = Math.min(near, distSeg(x, z));
    expect(near).toBeGreaterThanOrEqual(BEAM_KEEP_CLEAR);
    expect(beamThreats(solid)).toEqual([]);
    // teeth: the built stack's spot (x 62.1-64.3) and a crate 2 m off the line are threats; one at BEAM_KEEP_CLEAR is not
    const crate = (x0: number, z: number, sx = 1, h = 1.8, sz = 1): BoxPiece => ({ c: [x0 + sx / 2, h / 2, z], s: [sx, h, sz], yaw: 0, pitch: 0, color: '#888', collide: true, visible: true });
    expect(beamThreats([...solid, crate(60, 31, 3, 1.8, 4)]).length).toBeGreaterThan(0);
    expect(beamThreats([...solid, crate(A5_WALL.x + 2, 36)]).length).toBeGreaterThan(0);
    expect(beamThreats([...solid, crate(A5_WALL.x + BEAM_KEEP_CLEAR, 36)])).toEqual([]);
  });

  it('the stack is clear of the walk from the plates\' west door to the throw mark and of the hide spot, and the way is open floor', () => {
    expect(walkPath([[61.9, 40.5], [60.5, 38.5], [THROW_MARK[0], THROW_MARK[1]]])).toBeNull();
    expect(walkPath([[61.9, 40.5], [60.0, 33], [A5_HIDE.x, A5_HIDE.z + 1]])).toBeNull();
    expect(blockedAt(A5_HIDE.x, A5_HIDE.z)).toEqual([]);
    expect(blockedAt(A5_HIDE.x + 1, A5_HIDE.z)).toEqual([]);
    expect(blockedAt(A5_FLOOD_JAM.x, A5_FLOOD_JAM.z)).toEqual([]);
    expect(blockedAt(THROW_MARK[0], THROW_MARK[1])).toEqual([]);
    expect(blockedAt(A5_RUNNER.x, A5_RUNNER.z)).toEqual([]);
    const nav = setNav(without(A5_WICKET_DOOR, A5_FOOTBRIDGE_DOOR));
    expect(reaches(nav, [61.5, 40.5], THROW_MARK)).toBe(true);
    expect(hyp2((A5_DRUMS_RP.x0 + A5_DRUMS_RP.x1) / 2 - A5_HIDE.x, (A5_DRUMS_RP.z0 + A5_DRUMS_RP.z1) / 2 - A5_HIDE.z)).toBeGreaterThan(15);
    // the cable dressing follows the stack: its first point is on the stack's end face
    expect(mine.some((p) => !p.collide && Math.abs(p.c[0] - 59.25) < 0.01 && Math.abs(p.s[1] - 0.04) < 1e-6)).toBe(true);
  });

  it('the two apron bulkheads hang on the new wall\'s inside face at their old z (29.5, 38.5), the apron switch beside them at z 36.0; nothing is left in the gap or its dead space', () => {
    const apron = b.lights.lights.filter((l) => l.group === 50);
    expect(apron).toHaveLength(3);
    const east = apron.filter((l) => l.x > 60);
    expect(east.map((l) => [Number(l.x.toFixed(2)), l.z]).sort((p, q) => p[1]! - q[1]!)).toEqual([[67.65, 29.5], [67.65, 38.5], [64, 47.55]]);
    for (const l of apron) expect(l.x, `lamp ${l.id}`).toBeLessThan(A5_PERIM.x0);
    for (const l of A5_BULKHEADS_RP) expect(A5_PERIM.x0 - l.x).toBeCloseTo(0.2, 9);
    expect(A5_BULKHEADS_RP.map((l) => l.z)).toEqual(A5_BULKHEADS.filter((q) => q.side === 'w' && q.at === 69.75).map((q) => q.c));
    const sw = part.switches.find((s) => s.id === 'a5-sw-apron')!;
    expect(sw).toMatchObject({ group: 50, pos: { x: 67.8, y: 1.2, z: 36.0 }, yaw: -Math.PI / 2 });
    expect(A5_SW_APRON_RP).toEqual(sw.pos);
    expect(A5_PERIM.x0 - sw.pos.x).toBeCloseTo(0.05, 9);
    expect(part.switches.map((s) => [s.id, s.group])).toEqual([['a5-sw-inner', 51], ['a5-sw-apron', 50]]);
    // (fix 2) the re-plan circuit table names the moved switch; the built table keeps the built yard's spot at the L4 door
    const row = MARLOW_CIRCUITS_REPLAN.find((c) => c.group === 50)!;
    expect(row.switches).toHaveLength(1);
    expect(row.switches[0]).toMatchObject({ id: 'a5-sw-apron', kind: 'wall', x: sw.pos.x, z: sw.pos.z });
    expect(row.switches[0]!.by).toMatch(/perimeter wall/);
    expect(MARLOW_CIRCUITS.find((c) => c.group === 50)!.switches[0]).toMatchObject({ id: 'a5-sw-apron', x: 69.7, z: 36.0, by: 'at the L4 door' });
    // the fixture boxes clear the wall and the reach of a body on the east strip's lamp spacing
    for (const l of east) expect(A5_PERIM.x0 - (l.x + 0.1)).toBeGreaterThan(0);
  });
});

describe('Marlow re-plan A5: the closed routes (Q24)', () => {
  it('the switchroom back door A5-back is locked for good: built locked and unbreachable, held shut by a flag gate on a flag nothing sets', () => {
    const d = doorAnchor(A5_BACK_DOOR);
    expect(d.locked).toBe(true);
    expect(d.breachable).toBe(false);
    expect(part.bay.gates.find((g) => g.id === A5_BACK_GATE)).toEqual({ kind: 'flag', id: A5_BACK_GATE, flag: A5_NEVER_FLAG, doorId: A5_BACK_DOOR });
    expect(part.externalFlags).toContain(A5_NEVER_FLAG);
    expect(part.passZones.some((z) => z.flag === A5_NEVER_FLAG)).toBe(false);
    for (const g of def.bays.flatMap((x) => x.gates)) if (g.kind === 'pickup' || g.kind === 'pair') expect(g.flag).not.toBe(A5_NEVER_FLAG);
    const s = runAt([69, 32], [69, 34]);
    expect(s.locked(A5_BACK_DOOR)).toBe(true);
    for (const f of [A5_APRON_E_FLAG, A5_APRON_W_FLAG, A5_RELEASE_FLAG]) s.setFlag(f);
    s.update(1 / 60);
    expect(s.locked(A5_BACK_DOOR)).toBe(true);
    expect(s.locked(A5_FRONT_DOOR)).toBe(false);
  });

  it('the north trench path is closed at both ends with 6 m fencing; the way to the L5 door by the kiosk and pen 2\'s west gap stays open', () => {
    const fences = A5_CLOSERS.map((c) => solid.find((p) => Math.abs(p.c[0] - (c.x0 + c.x1) / 2) < 1e-6 && Math.abs(p.c[2] - (c.z0 + c.z1) / 2) < 1e-6 && Math.abs(top(p) - 6) < 1e-6)!);
    for (const f of fences) {
      expect(f).toBeDefined();
      expect(f.noLedge).toBe(true);
    }
    // the east end: the 1.85 m gap between pen 2 and the inner wall is shut at z 45.5; the west end: the strip behind the switchroom at x 46.15
    expect(walkBlocked(56.9, 44.4, 56.9, 46.9)).not.toBeNull();
    expect(walkBlocked(47.5, 46.9, 44.0, 46.9)).not.toBeNull();
    const nav = setNav([A5_BACK_DOOR, ...ALL_SHUT]);
    const droppedFences = setNav([A5_BACK_DOOR, ...ALL_SHUT], fences);
    const lids: [number, number] = [53, 47.1];
    const back: [number, number] = [43.5, 47.0];
    expect(reaches(nav, lids, back)).toBe(false);
    expect(reaches(droppedFences, lids, back)).toBe(true);
    // the exit: from the kiosk's press spot round pen 2 to the L5 door's foot, and from the landing to the press spot
    expect(reaches(nav, [A5_PRESS.x, A5_PRESS.z], [53, 47.2])).toBe(true);
    expect(reaches(nav, [A5_LANDING.x, A5_LANDING.z], [A5_PRESS.x, A5_PRESS.z])).toBe(true);
    expect(reaches(nav, [56.9, 40], [56.9, 46.9])).toBe(true);
  });

  it('the beam panel moved into the switchroom (south wall, inner face, facing into the room): the one panel of laser-a5, out of reach of the jammer', () => {
    expect(part.laserPanels).toEqual([A5_PANEL_RP]);
    expect(A5_PANEL_RP).toMatchObject({ id: 'panel-a5', lasers: [A5_LASER], yaw: 0 });
    expect(A5_PANEL_RP.x).toBeGreaterThan(A5_ROOM.x0);
    expect(A5_PANEL_RP.x).toBeLessThan(A5_ROOM.x1);
    expect(A5_PANEL_RP.z).toBeCloseTo(A5_ROOM.z0 + A5_ROOM.t / 2, 9);
    expect(panelFor(lay.laserPanels ?? [], A5_LASER)).toBeGreaterThanOrEqual(0);
    expect((lay.laserPanels ?? [])[panelFor(lay.laserPanels ?? [], A5_LASER)]!.id).toBe('panel-a5');
    expect(part.register.find((r) => r.id === 'A5-3')!.element).toMatch(/inside the switchroom/);
  });

  it('no line from A5_PANEL_JAM or from any apron spot (the whole floor x 58.2-67.85, the wall top, the wall\'s gap) reaches the panel; the built panel spot is reached (the check bites)', () => {
    for (const eye of eyeCloud(A5_PANEL_JAM.x, A5_PANEL_JAM.z)) expect(clearLine(solid, eye, panelAt), `jam spot eye ${eye.join(', ')}`).toBe(false);
    const bad: string[] = [];
    const spots: [number, number, number][] = [];
    for (let x = 58.2; x <= 67.85; x += 0.35) for (let z = 24.3; z <= 47.7; z += 0.35) if (floorAt(x, z) === 0 && blockedAt(x, z, 0.3).length === 0) spots.push([x, 0, z]);
    for (const z of [30.5, 32, 33.5, 35]) spots.push([68.1, 6, z]);
    for (const z of [31, 33, 35]) spots.push([69.05, 0, z]);
    for (const [x, y, z] of spots) {
      for (const eye of eyeCloud(x, z)) {
        const e: [number, number, number] = [eye[0], y + eye[1], eye[2]];
        if (clearLine(solid, e, panelAt)) bad.push(`(${x.toFixed(2)}, ${y}, ${z.toFixed(2)})`);
      }
    }
    expect([...new Set(bad)]).toEqual([]);
    expect(spots.length).toBeGreaterThan(500);
    // the built panel (outer face of the switchroom's south wall) is on a clear line from the jam spot through the gateway
    const builtAt = panelTarget(A5_PANEL, { x: 0, y: 0, z: 0 });
    for (const eye of eyeCloud(A5_PANEL_JAM.x, A5_PANEL_JAM.z)) expect(clearLine(solid, eye, builtAt), `built panel, eye ${eye.join(', ')}`).toBe(true);
    // from inside the switchroom it is in reach (the panel is still a jam target for whoever is in the inner zone)
    expect(clearLine(solid, [43.0, 1.6, 40.0], panelAt)).toBe(true);
    expect(jamTargets.some((j) => j.id === 'panel-a5')).toBe(true);
  });

  it('the flood is still a jam target from the throw side through the gateway (station 13\'s jam): in range, on a clear line from every aiming eye, picked by the aim', () => {
    const flood = b.lights.lights.find((l) => l.group === 52)!;
    for (const eye of eyeCloud(A5_FLOOD_JAM.x, A5_FLOOD_JAM.z)) {
      const d = hyp3(flood.x - eye[0], flood.y - eye[1], flood.z - eye[2]);
      expect(d).toBeLessThanOrEqual(JAMMER.range);
      expect(clearLine(solid, eye, flood), `eye ${eye.join(', ')}`).toBe(true);
      const i = pickJamTarget(jamTargets, eye[0], eye[1], eye[2], (flood.x - eye[0]) / d, (flood.y - eye[1]) / d, (flood.z - eye[2]) / d);
      expect(jamTargets[i]?.id).toBe(`lt-${flood.id}`);
    }
  });
});

describe('Marlow re-plan A5: the guards (the patrol and the kiosk watcher)', () => {
  const watcher = part.squads[A5_WATCHER]!;
  const grunt = ENEMIES.grunt;
  const SPOT = (n: string) => lightSpotsReplan().a5Substation.find((s) => s.name === n)!;

  /** Does the watcher's eye take a body at (x, z) with the light `level` on it, moving at `speed`, as `sightRate` has it? */
  function sees(x: number, z: number, level: number, crouched: boolean, speed: number): boolean {
    const eye: [number, number, number] = [A5_WATCHER_POST.x, EYE_STAND * grunt.scale, A5_WATCHER_POST.z];
    const ys = crouched ? [0.25, 0.55, 0.85] : [0.3, 0.9, 1.5];
    let clear = 0;
    for (const y of ys) {
      const q: [number, number, number] = [x, y, z];
      if (hitDistance(solid, eye, q) > hyp3(x - eye[0], y - eye[1], z - eye[2]) - 0.3) clear++;
    }
    const dx = x - eye[0];
    const dz = z - eye[2];
    let angle = Math.abs(Math.atan2(dx, dz) - A5_WATCHER_POST.yaw);
    if (angle > Math.PI) angle = 2 * Math.PI - angle;
    const dist = hyp3(dx, 0, dz);
    return seenAt(sightRate({ dist, angle, light: level, crouched, speed, exposure: clear / ys.length, sensitivity: 1, pitch: Math.atan2((crouched ? 0.55 : 0.9) - eye[1], dist) }));
  }

  it('the squad is the patrol plus the watcher, both ordinary armed grunts in the bay; the patrol is as built', () => {
    expect(part.bay.squad).toEqual([A5_PATROL, A5_WATCHER]);
    expect(def.bays[4]!.squad).toEqual([A5_PATROL, A5_WATCHER]);
    expect(Object.keys(part.squads)).toEqual([A5_PATROL, A5_WATCHER]);
    expect(part.squads[A5_PATROL]).toEqual(plainPart.squads[A5_PATROL]);
    expect(watcher.kind).toBe('grunt');
    expect(watcher.passive).toBeUndefined();
    expect(['grunt', 'heavy', 'enforcer', 'officer', 'sniper']).toContain(watcher.kind);
    expect(course.squads[A5_WATCHER]).toBe(watcher);
    expect(watcher.route).toBeUndefined();
    expect(watcher.waits).toBeUndefined();
    expect([watcher.x, watcher.z, watcher.yaw]).toEqual([A5_WATCHER_POST.x, A5_WATCHER_POST.z, Math.PI / 2]);
    expect(def.bays[4]!.squad.length).toBeLessThanOrEqual(3);
  });

  it('the watcher stands beside the release kiosk (47, 33), facing east down the floodlit strip, on clear floor in the inner zone, 1.8 m and more from the press spot (no close notice) and off the patrol\'s legs', () => {
    expect(hyp2(A5_WATCHER_POST.x - A5_KIOSK.x1, A5_WATCHER_POST.z - 33)).toBeLessThan(3);
    expect(blockedAt(A5_WATCHER_POST.x, A5_WATCHER_POST.z, 0.4)).toEqual([]);
    expect(inBox([40.3, 24.3, 57.8, 47.7], A5_WATCHER_POST.x, A5_WATCHER_POST.z)).toBe(true);
    expect(hyp2(A5_WATCHER_POST.x - A5_PRESS.x, A5_WATCHER_POST.z - A5_PRESS.z)).toBeGreaterThan(PERCEPTION.closeRange);
    // the patrol's legs on the guards' grid keep a body's width off him
    const nav = setNav([]);
    for (let i = 0; i < A5_PATROL_ROUTE.length; i++) {
      const a = A5_PATROL_ROUTE[i]!;
      const c = A5_PATROL_ROUTE[(i + 1) % A5_PATROL_ROUTE.length]!;
      const path = nav.findPath([a[0], a[1]], [c[0], c[1]], 1e6)!;
      expect(path, `leg ${i}`).not.toBeNull();
      let from: readonly [number, number] = a;
      for (const w of [...path.map((q) => [q[0], q[1]] as const), c]) {
        // the distance from the post to the segment from -> w
        const sx = w[0] - from[0];
        const sz = w[1] - from[1];
        const t = sx === 0 && sz === 0 ? 0 : Math.max(0, Math.min(1, ((A5_WATCHER_POST.x - from[0]) * sx + (A5_WATCHER_POST.z - from[1]) * sz) / (sx * sx + sz * sz)));
        expect(hyp2(A5_WATCHER_POST.x - (from[0] + sx * t), A5_WATCHER_POST.z - (from[1] + sz * t)), `leg ${i}`).toBeGreaterThan(0.9);
        from = w;
      }
    }
  });

  it('with the flood on he sees a player crossing the strip in front of the kiosk (the crouched silent pace and a walk); with the flood jammed he does not', () => {
    const lit = (n: string): number => tuned[n]!;
    for (const [at, on, off] of [
      [SPOT('A5 strip centre'), lit('A5 strip centre'), lit('A5 strip centre cut')],
      [SPOT('A5 kiosk'), lit('A5 kiosk'), lit('A5 kiosk cut')],
    ] as const) {
      expect(on, at.name).toBeGreaterThanOrEqual(MARLOW_LEVEL.poolMin);
      expect(off, at.name).toBeLessThanOrEqual(MARLOW_LEVEL.cutMax);
      for (const [crouched, speed] of [[true, SILENT_PACE], [false, 2.0]] as const) {
        expect(sees(at.x, at.z, on, crouched, speed), `${at.name} lit, crouched ${crouched}`).toBe(true);
        expect(sees(at.x, at.z, off, crouched, speed), `${at.name} jammed, crouched ${crouched}`).toBe(false);
      }
    }
    // the flood stops short of the strip's east end (x 54): that spot reads dark on or off, so nobody there is his to see
    expect(tuned['A5 strip east']!).toBeLessThanOrEqual(MARLOW_LEVEL.pocketMax);
    const east = SPOT('A5 strip east');
    expect(sees(east.x, east.z, tuned['A5 strip east']!, false, 2.0)).toBe(false);
  });

  it('the landing (56, 36) in pen 2\'s lee stays dark to him, flood on or off, crouched or standing; and the sight test bites (a lit landing would be seen)', () => {
    expect(SPOT('A5 landing mark')).toMatchObject({ x: A5_LANDING.x, z: A5_LANDING.z, band: 'pocket' });
    const dark = tuned['A5 landing mark']!;
    expect(dark).toBeLessThanOrEqual(MARLOW_LEVEL.pocketMax);
    for (const [crouched, speed] of [[true, 0], [true, SILENT_PACE], [false, 0], [false, 2.0]] as const) expect(sees(A5_LANDING.x, A5_LANDING.z, dark, crouched, speed), `crouched ${crouched} speed ${speed}`).toBe(false);
    expect(sees(A5_LANDING.x, A5_LANDING.z, 0.9, false, 2.0)).toBe(true);
    // a post 1 m closer to the strip's middle (the brief's (46.5, 32.0)) is inside the close-notice reach of the press spot
    expect(hyp2(46.5 - A5_PRESS.x, 32.0 - A5_PRESS.z)).toBeLessThan(PERCEPTION.closeRange);
  });
});

describe('Marlow re-plan A5: the throw (station 13) on the re-plan, the lee and the stations', () => {
  it('the throw from the mark carries the runner over the beams, under the header, onto the landing in the lee; the landing and the marks have room', () => {
    const o = { x: 0, y: 0, z: 0 };
    const land = { x: 0, z: 0, dx: 0, dz: 0 };
    for (let d = 0.3; d <= 1.6 + 1e-9; d += 0.1) {
      throwLanding(A5_THROW.x + d, A5_THROW.z, A5_THROW.x, A5_THROW.z, -Math.PI / 2, land);
      expect(throwLandingOk(A5_THROW.x, 0, A5_THROW.z, land.x, 0, land.z)).toBe(true);
      for (let k = 0; k <= 100; k++) {
        throwArc((TEAM.throwTime * k) / 100, A5_THROW.x + d, 0, A5_THROW.z, land.x, 0, land.z, o);
        expect(laserTouch(laser, o.x, o.y, o.z, LASER.standHeight), `d ${d.toFixed(2)} k ${k}`).toBe(false);
        if (Math.abs(o.x - A5_WALL.x) < 0.15 + MOVEMENT.radius) expect(o.y + MOVEMENT.standHeight).toBeLessThan(HEADER);
      }
    }
    throwLanding(A5_RUNNER.x, A5_RUNNER.z, A5_THROW.x, A5_THROW.z, -Math.PI / 2, land);
    expect(hyp2(land.x - A5_LANDING.x, land.z - A5_LANDING.z)).toBeLessThan(1e-6);
    expect(inBox(A5_INNER_ZONE, land.x, land.z)).toBe(true);
    const inside = (x: number, y: number, z: number): boolean => solid.some((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2);
    let clear = true;
    for (let k = 0; k <= 100; k++) {
      throwArc((TEAM.throwTime * k) / 100, A5_RUNNER.x, 0, A5_RUNNER.z, A5_LANDING.x, 0, A5_LANDING.z, o);
      for (const off of [0.3, 1.0, 1.6]) if (inside(o.x, o.y + off, o.z)) clear = false;
    }
    let head = 10;
    for (const p of solid) if (Math.abs(A5_LANDING.x - p.c[0]) < p.s[0] / 2 && Math.abs(A5_LANDING.z - p.c[2]) < p.s[2] / 2 && bottom(p) > 0) head = Math.min(head, bottom(p));
    expect(throwRoom(clear, 0, Math.min(head, 1.8))).toBe('ok');
    for (let y = 1.0; y <= 1.0 + TEAM.throwUp; y += 0.05) expect(inside(A5_THROW.x, y, A5_THROW.z), `over the thrower at ${y.toFixed(2)}`).toBe(false);
  });

  it('station 13\'s beams are the one laser laser-a5, off for good by the release; the throw is the only way past (no top within a beam jump, the wall gives no grip)', () => {
    expect(part.lasers).toHaveLength(1);
    expect(laser).toMatchObject({ id: A5_LASER, x1: 58, z1: 33, x2: 58, z2: 39, ys: [0.35, 0.9, 1.45], offFlag: A5_RELEASE_FLAG });
    const onWall = anchors.ledges.filter((l) => Math.abs((l.a.x + l.b.x) / 2 - A5_WALL.x) < 0.5 && inBox(box, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2));
    expect(onWall.map((l) => `(${l.a.x}, ${l.a.z}) top ${l.top}`)).toEqual([]);
    expect(LEAP_APEX).toBeLessThan(BEAM_TOP);
    expect(beamThreats(solid)).toEqual([]);
    expect(() => throwGateway({ ...A5_GATEWAY, release: { u: 1.2, v: 0 } })).toThrow(/reach/);
  });

  it('the lee (G0\'s box x 54.35-57.85, z 34.5-40.5) is free floor for a body (0.3 m clear of every solid) over x 54.35-57.5, z 34.5-40.15: the landing and station 13\'s mark B stand in it', () => {
    for (let x = 54.35; x <= 57.5 + 1e-9; x += 0.05) for (let z = 34.5; z <= 40.15 + 1e-9; z += 0.05) expect(blockedAt(x, z, 0.3), `(${x.toFixed(2)}, ${z.toFixed(2)})`).toEqual([]);
    expect(inBox([54.35, 34.5, 57.5, 40.15], A5_LANDING.x, A5_LANDING.z)).toBe(true);
    // its edges are real: pen 2's bund to the north (z 40.5) and the inner wall to the east (x 57.85, outside the gateway)
    expect(blockedAt(56, 40.3, 0.3)).not.toEqual([]);
    expect(blockedAt(57.65, 40.0, 0.3)).not.toEqual([]);
  });

  it('stations 11-13 are the sheet\'s A5 block verbatim, on the bay; only station 13 has a retry and a drill', () => {
    expect(part.bay.stations).toEqual(SHEET);
    expect(A5_SUBSTATION_STATIONS).toEqual(SHEET);
    expect(def.bays[4]!.stations).toEqual(SHEET);
    expect(SHEET.map((s) => s.retry)).toEqual(['none', 'none', 'station']);
    expect(SHEET.map((s) => s.drillS)).toEqual([undefined, undefined, 9]);
    for (const s of SHEET) {
      for (const g of s.gates) expect(part.bay.gates.some((x) => x.id === g) || g === A5_LASER, g).toBe(true);
      for (const g of s.guards) expect(part.bay.squad).toContain(g);
    }
    expect(SHEET[0]!.standIn).toBe(A5_WICKET_GATE);
    expect(SHEET[1]!.standIn).toBe(A5_FOOTBRIDGE_GATE);
  });

  it('the marks have standing room (a body of 0.3 m, shut gates included) on the floor inside the set; station 12\'s are 0.85 m off the wall face; station 11\'s in the 1.4 m gap', () => {
    for (const s of SHEET) {
      for (const m of s.marks) {
        expect(m.y).toBe(0);
        expect(inBox(box, m.x, m.z), `${s.id} (${m.x}, ${m.z})`).toBe(true);
        expect(blockedAt(m.x, m.z, 0.3, ALL_SHUT), `${s.id} (${m.x}, ${m.z})`).toEqual([]);
        expect(floorAt(m.x, m.z), `${s.id} (${m.x}, ${m.z})`).toBe(0);
      }
    }
    for (const m of SHEET[1]!.marks) expect(A5_PERIM.x0 - m.x).toBeCloseTo(0.85, 9);
    for (const m of SHEET[0]!.marks) {
      expect(m.x).toBeGreaterThan(A5_GAP.x0 + 0.3);
      expect(m.x).toBeLessThan(A5_GAP.x1 - 0.3);
      expect(m.z).toBeGreaterThan(A5_GAP.z0);
      expect(m.z).toBeLessThan(A5_GAP.z1);
    }
    // station 12's marks stand in station 11's done zone; A's mark of 13 on the apron's west strip, B's in the lee
    for (const m of SHEET[1]!.marks) expect(inBox(A5_APRON_E, m.x, m.z)).toBe(true);
    expect(inBox(A5_APRON_W, SHEET[2]!.marks[0].x, SHEET[2]!.marks[0].z)).toBe(true);
    expect(inBox(A5_INNER_ZONE, SHEET[2]!.marks[1].x, SHEET[2]!.marks[1].z)).toBe(true);
    expect(hyp2(SHEET[2]!.marks[1].x - A5_LANDING.x, SHEET[2]!.marks[1].z - A5_LANDING.z)).toBe(0);
  });
});

describe('Marlow re-plan A5: flags, stations in play, lines', () => {
  it('the pass zones: both players on the apron\'s east strip (a5-apron-e) and its west strip (a5-apron-w), floor 0, not "any"; the trench and the crossings are in neither', () => {
    expect(part.passZones).toEqual([
      { id: 'a5-p-in1', box: A5_INNER_ZONE, flag: A5_IN1_FLAG, floorY: 0, any: true },
      { id: 'a5-p-apron-e', box: [65.85, 24.3, 67.85, 47.7], flag: 'a5-apron-e', floorY: 0 },
      { id: 'a5-p-apron-w', box: [58.2, 24.3, 62.35, 47.7], flag: 'a5-apron-w', floorY: 0 },
    ]);
    for (const f of [A5_APRON_E_FLAG, A5_APRON_W_FLAG]) expect(part.externalFlags).toContain(f);
    expect(A5_APRON_E[0]).toBe(T.x1);
    expect(A5_APRON_E[2]).toBe(A5_PERIM.x0);
    expect(A5_APRON_W[2]).toBe(T.x0);
    expect(A5_APRON_W[0]).toBeGreaterThanOrEqual(A5_WALL.near);
    expect(SHEET.map((s) => s.doneFlag)).toEqual([A5_APRON_E_FLAG, A5_APRON_W_FLAG, A5_RELEASE_FLAG]);
    expect(def.bays[4]!.gates.some((g) => g.kind === 'pickup' && g.flag === A5_RELEASE_FLAG)).toBe(true);
  });

  it('station 11 is live at the bay start with the wicket stand-in open (the base opens it: no opener of ours); the footbridge opens as 12 goes live, the plates stay bolted', () => {
    const s = runAt([69.0, 32.0], [69.0, 34.0]);
    expect(s.station()).toBe(11);
    expect(s.liveStation()!.id).toBe('a5-chimney');
    expect(s.isGateOpen(A5_WICKET_GATE)).toBe(true);
    expect(s.hasFlag(A5_WICKET_FLAG)).toBe(true);
    expect(s.locked(A5_WICKET_DOOR)).toBe(false);
    expect(s.locked(A5_FOOTBRIDGE_DOOR)).toBe(true);
    expect(s.isGateOpen(A5_FOOTBRIDGE_GATE)).toBe(false);
    s.setFlag(A5_APRON_E_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(12);
    expect(s.isGateOpen(A5_FOOTBRIDGE_GATE)).toBe(true);
    expect(s.locked(A5_FOOTBRIDGE_DOOR)).toBe(false);
    expect(s.locked(A5_PLATES_DOOR)).toBe(true);
    // the wicket stays open once opened (it latches on its flag)
    expect(s.locked(A5_WICKET_DOOR)).toBe(false);
    s.setFlag(A5_APRON_W_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(13);
    expect(s.liveStation()!.id).toBe('a5-throw');
    expect(s.locked(A5_FOOTBRIDGE_DOOR)).toBe(false);
  });

  it('11 and 12 cannot fail (no retry); a retry of 13 keeps both done, resets only its own gates and flags, and counts', () => {
    const s = runAt([59.0, 36.0], [56.0, 36.0]);
    s.setFlag(A5_APRON_E_FLAG);
    s.setFlag(A5_APRON_W_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(13);
    expect(s.retryStation('timer', 11)).toBe(false);
    expect(s.retryStation('timer', 12)).toBe(false);
    expect(s.retryStation('timer', 13)).toBe(true);
    expect(s.lastRetry).toEqual({ st: 13, cause: 'timer' });
    expect(s.station()).toBe(13);
    expect(s.hasFlag(A5_APRON_E_FLAG)).toBe(true);
    expect(s.hasFlag(A5_APRON_W_FLAG)).toBe(true);
    expect(s.isGateOpen(A5_WICKET_GATE)).toBe(true);
    expect(s.retryStation('seen', 13)).toBe(true);
    expect(s.lastRetry).toEqual({ st: 13, cause: 'seen' });
    expect(s.restarts).toBe(2);
    // the release ends the station
    s.setFlag(A5_RELEASE_FLAG);
    s.update(1 / 60);
    expect(s.station()).toBe(0);
    expect(s.retryStation('timer', 13)).toBe(false);
  });

  it('LANTERN\'s lines for station 13 are the sheet\'s two (seen, timer), in the bay\'s radio under retry:a5-throw and :timer; every radio line fits and has no dash', () => {
    const rows = part.bay.radio;
    expect(rows.find((r) => r.at === retryKey('a5-throw'))!.text).toBe('Seen in the floodlight. Back behind the transformer.');
    expect(rows.find((r) => r.at === retryKey('a5-throw', true))!.text).toBe('The floodlight came back. Back behind the transformer.');
    expect(A5_RETRY_SEEN).toBe('Seen in the floodlight. Back behind the transformer.');
    expect(A5_RETRY_TIMER).toBe('The floodlight came back. Back behind the transformer.');
    expect(rows.some((r) => r.at === retryKey('a5-chimney') || r.at === retryKey('a5-swing'))).toBe(false);
    for (const r of rows) {
      expect(r.text.length, r.text).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[–—]/.test(r.text), r.text).toBe(false);
      expect(/fail/i.test(r.text), r.text).toBe(false);
    }
  });

  it('the objective lines: one per station plus the holding-room line, each naming what and where, at most 90 characters, no "fail"; the throw step ends on the release', () => {
    const steps = def.objectives!.filter((o) => o.bay === 'A5');
    expect(steps.map((o) => o.id)).toEqual(['a5-wall', 'a5-trench', 'a5-throw', 'a5-lock']);
    expect(steps.map((o) => o.done)).toEqual([{ flag: A5_APRON_E_FLAG }, { flag: A5_APRON_W_FLAG }, { flag: A5_RELEASE_FLAG }, undefined]);
    expect(A5_OBJECTIVES.map((o) => o.id)).toEqual(steps.map((o) => o.id));
    expect(steps[0]!.text).toMatch(/wall/);
    expect(steps[0]!.text).toMatch(/wicket door/);
    expect(steps[1]!.text).toMatch(/trench/);
    expect(steps[1]!.text).toMatch(/footbridge|plates/);
    expect(steps[2]!.text).toMatch(/beams/);
    expect(steps[2]!.text).toMatch(/kiosk/);
    expect(steps[3]!.text).toMatch(/holding room five/);
    for (const o of steps) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(/[–—]/.test(t), t).toBe(false);
        expect(/fail/i.test(t), t).toBe(false);
      }
      expect(o.id.length).toBeLessThanOrEqual(OBJECTIVE_ID_MAX);
    }
    expect(steps[2]!.a).toBeDefined();
    expect(steps[2]!.b).toBeDefined();
    expect(steps[2]!.a).not.toBe(steps[2]!.b);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
  });

  it('the claim: B is the first player into the inner zone (the thrown one), as built; station 13\'s marks give A the apron and B the lee', () => {
    expect(part.bay.roles).toEqual([{ role: 'b', zone: { box: A5_INNER_ZONE } }]);
    const s = runAt([59.0, 36.0], [56.0, 36.0]);
    expect(s.roleClaimed()).toBe(true);
    expect(s.roleOf(1)).toBe('b');
    expect(s.roleOf(0)).toBe('a');
  });

  it('debug points, nav seeds and camera spaces sit on clear floor inside the set (the trench seed on its floor, the wall-top seed on the top)', () => {
    for (const d of part.debugPoints) {
      expect(inBox(box, d.pos.x, d.pos.z), d.id).toBe(true);
      if (d.pos.y === 0) expect(blockedAt(d.pos.x, d.pos.z, 0.3, ALL_SHUT), d.id).toEqual([]);
    }
    expect(part.debugPoints.map((d) => d.id)).toEqual(expect.arrayContaining(['A5-entry', 'A5-apron-e', 'A5-walltop', 'A5-apron-w', 'A5-watcher']));
    expect(part.debugPoints.find((d) => d.id === 'A5-entry')!.pos).toMatchObject({ x: 69.0, z: 33.0 });
    for (const s of part.navSeeds) if (s.y === 0) expect(blockedAt(s.x, s.z, 0.3, ALL_SHUT), `seed ${s.x}, ${s.z}`).toEqual([]);
    expect(part.navSeeds.some((s) => s.y < -1)).toBe(true);
    expect(part.navSeeds.some((s) => s.y > 5)).toBe(true);
    expect(part.camSpaces.map((c) => c.size)).toEqual(['open', 'tight', 'tight']);
  });
});
