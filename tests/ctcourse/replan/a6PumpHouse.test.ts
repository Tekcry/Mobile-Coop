/**
 * Marlow re-plan, A6 the Pump House (J14 slice G-A6; PLAN section 2, STATIONS.md sections 3, 6, 8, 9; BRIEF A6): the set on
 * `ctcourseReplan`. Step 1, the noise case: does an uncaught 6 m drop into the drive pit reach the attendant's re-routed
 * round, through the game's own hearing rule (`EnemyManager.hear` / `tierOf`: the landing band's radius, the 3D distance,
 * the wall ray over the hearing mask's collision pieces only where a wall changes the tier, `hearTier`)? Then the build:
 * the re-plan's collision (`GREY`) and the contract; one guard, his round walkable and clear of the housing; the stations as
 * STATIONS section 3 has them, standing room at every mark (B of 16 on the pit floor); on the guards' runtime nav, the pump
 * floor reaches neither the pit nor the L6 door, the pit reaches L6 only through the outfall, the stair is closed; the drop
 * opening and the 6 m fall through it; the drive panel out of reach from the pit, the exit release in reach from the
 * landing only; the stand-in ladder; the self-closing edge gate (the lip locked once one player is up, no other grip at the
 * loading edge, a station 14 retry reopening it); circuit 69 live with its three lamps and its switch at the sump bay; LANTERN's lines
 * and the objective lines. The built A6 is `tests/ctcourse/a6PumpHouse.test.ts` (its `GREY` proves the flag-off build
 * unchanged).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { hyp2, hyp3 } from '../../../src/core/mathx';
import { effectiveReach, hearTier, wallMatters, WALL_FACTOR, ambientDb, type HearTier } from '../../../src/ai/hearing';
import { LANDING, landingKind, landingNoise } from '../../../src/player/movement';
import { LANDING_NOISE_RADIUS } from '../../../src/config/noise';
import { COURSE_TEXT_MAX } from '../../../src/config/course';
import { MOVEMENT, TEAM } from '../../../src/config/movement';
import { layoutKnownIds, retryKey, validateCourse } from '../../../src/game/course/courseDef';
import { CourseState } from '../../../src/game/course/courseState';
import { hangDepthMax, hangReaches } from '../../../src/game/teamMoves';
import { findJumpTarget, generateLedges } from '../../../src/world/anchors';
import { LevelBuilder, type BoxPiece } from '../../../src/world/levelBuilder';
import { MARLOW_CIRCUITS_REPLAN } from '../../../src/world/lighting/marlowCircuits';
import { buildCtcourse } from '../../../src/world/maps/ctcourse';
import { INTERACT_DY, INTERACT_REACH } from '../../../src/world/maps/ctcourseGreybox';
import { A6_ATTENDANT, A6_CAGE, A6_CAGE_DOOR, A6_DEAD_FITTINGS, A6_DECK, A6_EXIT, A6_GALLERY_LIP, A6_HANG, A6_LIP_X, A6_MARK, A6_OUTFALL_DOOR, A6_PANEL, A6_SHELL, A6_SUMP } from '../../../src/world/maps/ctcourseSets/a6PumpHouse';
import {
  A6_ATTENDANT_FACES_REPLAN,
  A6_ATTENDANT_ROUTE_REPLAN,
  A6_ATTENDANT_WAITS_REPLAN,
  A6_BALUSTRADE,
  A6_CULVERT_1,
  A6_CULVERT_2,
  A6_DROP,
  A6_EDGE_GATE,
  A6_GAL1_FLAG,
  A6_GAL1_ZONE,
  A6_GAUGE_REPLAN,
  A6_HOUSING,
  A6_LANDING,
  A6_OBJECTIVES,
  A6_PIT,
  A6_PIT_LADDER,
  A6_PIT_LADDER_GATE,
  A6_PIT_LANDING,
  A6_PIT_ZONE,
  A6_PUMP_HOUSE_STATIONS,
  A6_RETRY_LINES,
  FLOOR_HOLES,
  A6_DROP_CATCH,
  A6_PIT_Y,
  A6_PIT_LADDER_AT,
  A6_DROP_KIT_OBJECTIVE,
  A6_DROPCATCH_KIT_RETRY,
} from '../../../src/world/maps/ctcourseSets/replan/a6PumpHouse';
import { kitSpotsOf } from '../../../src/game/kit/kitApi';
import { flags } from '../../../src/core/flags';
import { checkSetPart, inBox, SET_GUARDS_MAX } from '../../../src/world/maps/ctcourseSets/types';
import { downCast, runtimeNav } from '../../helpers/runtimeNav';

const b = new LevelBuilder();
const built = buildCtcourse(b, { replan: true });
const lay = built.layout;

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
/** The hearing mask's pieces (`MASK.HEARING` = G.STATIC | G.GLASS: every collision box, a quarter-turned one folded; doors and fences are no box). */
const hearingSolids = b.boxes.filter((p) => p.collide && Math.abs(p.pitch) < 1e-3).map((p) => (Math.abs(Math.sin(p.yaw)) > 0.5 ? { ...p, s: [p.s[2], p.s[1], p.s[0]] as [number, number, number], yaw: 0 } : p));
/** `ballistics.clear(earA, earB, MASK.HEARING)` on these pieces. */
const clear = (a: V3, c: V3): boolean => !hearingSolids.some((o) => segHits(a, c, o));
/**
 * `EnemyManager.tierOf` for an unalerted, coordinated guard whose feet are at (x, 0, z) and a noise of `reach` at `pos`:
 * the map's noisy things mask at the guard, the wall ray (noise + 1.5 -> guard + 1.6) only where one wall changes the tier.
 */
function tierAt(pos: V3, reach: number, x: number, z: number): { d: number; reachEff: number; wall: boolean; tier: HearTier } {
  const d = hyp3(x - pos[0], 0 - pos[1], z - pos[2]);
  const noisy = lay.guardAi?.noisy ?? [];
  let r = effectiveReach(reach, 0, noisy.length ? ambientDb(noisy, x, z, 0) : 0);
  let wall = false;
  if (d < reach && wallMatters(d, r, false) && !clear([pos[0], pos[1] + 1.5, pos[2]], [x, 1.6, z])) {
    r *= WALL_FACTOR;
    wall = true;
  }
  return { d, reachEff: r, wall, tier: d < reach ? hearTier(d, r, false) : 0 };
}
/** The round's points, its legs sampled every 0.25 m. */
function roundSamples(route: readonly [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < route.length; i++) {
    const a = route[i]!;
    const c = route[(i + 1) % route.length]!;
    const n = Math.max(1, Math.ceil(hyp3(c[0] - a[0], 0, c[1] - a[1]) / 0.25));
    for (let k = 0; k < n; k++) out.push([a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]);
  }
  return out;
}

describe('Marlow re-plan A6 (G-A6) step 1: the 6 m landing in the drive pit and the attendant (BRIEF A6)', () => {
  const fall = 4.4 - A6_PIT_LANDING.y;
  const reach = landingNoise(landingKind(fall));
  const pos: V3 = [A6_PIT_LANDING.x, A6_PIT_LANDING.y, A6_PIT_LANDING.z];

  it('the drop from the bridge deck (4.4) to the pit floor (-1.6) is 6.0 m: a heavy landing, radius 11 m', () => {
    expect(fall).toBeCloseTo(6.0, 9);
    expect(fall).toBeGreaterThan(LANDING.heavy);
    expect(landingKind(fall)).toBe('heavy');
    expect(reach).toBe(LANDING_NOISE_RADIUS.heavy);
    expect(reach).toBe(11);
    // the landing spot is in the pit, inside the cage footprint (the cage's walls stand between it and the floor)
    expect(pos[0] > A6_CAGE[0] && pos[0] < A6_CAGE[2] && pos[2] > A6_CAGE[1] && pos[2] < A6_CAGE[3]).toBe(true);
  });

  it('heard from part of his round (tier 1: he turns to look, never sent): pump 3 and the leg north of the cage; silent at the desk, the gauge board and the round east of x 54', () => {
    const at = (x: number, z: number) => tierAt(pos, reach, x, z);
    // the stops
    const [D, , G, N1, N2, P3] = A6_ATTENDANT_ROUTE_REPLAN;
    expect(at(D![0], D![1]).tier).toBe(0);
    expect(at(G![0], G![1]).tier).toBe(0);
    expect(at(N1![0], N1![1]).tier).toBe(0);
    expect(at(N2![0], N2![1]).tier).toBe(0);
    const p3 = at(P3![0], P3![1]);
    expect(p3.tier).toBe(1);
    expect(p3.wall).toBe(true);
    expect(p3.d).toBeCloseTo(4.44, 2);
    // every sample of the round: never tier 2 or more (nobody is sent to the pit by the sound alone); the heard samples
    const samples = roundSamples(A6_ATTENDANT_ROUTE_REPLAN).map(([x, z]) => ({ x, z, ...at(x, z) }));
    expect(samples.length).toBeGreaterThan(100);
    expect(samples.filter((s) => s.tier >= 2)).toEqual([]);
    const heard = samples.filter((s) => s.tier === 1);
    expect(heard.length).toBeGreaterThan(0);
    for (const s of heard) {
      // through the cage's walls (one wall: reach 11 x 0.45 = 4.95 m), within it in 3D
      expect(s.wall).toBe(true);
      expect(s.d).toBeLessThan(11 * WALL_FACTOR);
      expect(s.x).toBeLessThan(54);
    }
    // the north leg's heard stretch and the pump-3 leg's
    const north = heard.filter((s) => Math.abs(s.z - 67.5) < 1e-6).map((s) => s.x);
    expect(Math.min(...north)).toBeGreaterThan(48.5);
    expect(Math.max(...north)).toBeLessThan(54.5);
    expect(heard.some((s) => s.x < 48.6 && s.z < 64)).toBe(true);
  });

  it('the check has teeth: with no wall between (the cage gone from the ray), pump 3 would send him to investigate (tier 2)', () => {
    const d = hyp3(48.2 - pos[0], -pos[1], 61.0 - pos[2]);
    expect(hearTier(d, reach, false)).toBe(2);
    expect(hearTier(d, reach * WALL_FACTOR, false)).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------------- the build

const part = built.parts[5]!;
const course = lay.course!;
const def = course.def;
const range = built.ranges.a6PumpHouse;
const mine = b.boxes.slice(range.boxes[0], range.boxes[1]);
/** The set's collision on the re-plan: the built set less the stair's flight and fillers, the stair rail, the gauge board, the
 *  bridge slab round the plate and the cage's east wall; plus the pit (floor, lining, the east wall round the mouth), the landing,
 *  its upstand, the steps, the balustrade, the plinth, the culvert and its housing, the moved board, the slab round the opening,
 *  its two rails and the stair-head screen. One more anchor: the stand-in ladder; three more lamps: circuit 69. */
const GREY = { solids: 70, checksum: 19931.913, lights: 11, doors: 1, anchors: 2 };
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
/** Every collision box of the map, a quarter-turned one folded to its axis-aligned footprint (pitched ramps kept as they are). */
const solid = b.boxes.filter((p) => p.collide).map((p) => (Math.abs(p.pitch) < 1e-3 && Math.abs(Math.sin(p.yaw)) > 0.5 ? { ...p, s: [p.s[2], p.s[1], p.s[0]] as [number, number, number], yaw: 0 } : p));
const flat = solid.filter((p) => Math.abs(p.pitch) < 1e-3);
/** The flat solid boxes in a body's band (feet `y` + 0.15 to + 1.7) within `r` of (x, z). */
const blockedAt = (x: number, z: number, y = 0, r = MOVEMENT.radius): BoxPiece[] =>
  flat.filter((p) => bottom(p) < y + 1.7 && top(p) > y + 0.15).filter((p) => hyp2(Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0)) < r);
/** A walk from (x0, z0) to (x1, z1) at feet `y` in 0.1 m steps: the first point a body touches a flat solid, or null. */
const walkBlocked = (x0: number, z0: number, x1: number, z1: number, y = 0): string | null => {
  const n = Math.ceil(hyp2(x1 - x0, z1 - z0) / 0.1);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const z = z0 + ((z1 - z0) * i) / n;
    const hit = blockedAt(x, z, y)[0];
    if (hit) return `(${x.toFixed(2)}, ${z.toFixed(2)}): box (${hit.c.map((v) => v.toFixed(2)).join(', ')})`;
  }
  return null;
};
const down = downCast(b);
/** The floor under (x, z) from height `y` (the first collision top below, the game's down-cast). */
const floorAt = (x: number, z: number, y: number): number => down(x, y, z)?.y ?? Number.NaN;
const panel = part.devices[A6_PANEL]!;
const exit = part.devices[A6_EXIT]!;
/** The course devices' own reach (`CourseMode.device`: `it.reach = 1.4`) and the height band (`Interactables.nearest`). */
const DEVICE_REACH = 1.4;
const deviceReaches = (fx: number, fy: number, fz: number, d: { x: number; y: number; z: number }): boolean => hyp2(d.x - fx, d.z - fz) < DEVICE_REACH && Math.abs(d.y - fy) < INTERACT_DY;

describe('Marlow re-plan A6 (G-A6): the part', () => {
  it('passes the set-part contract; the re-plan course validates', () => {
    expect(part.id).toBe('a6PumpHouse');
    expect(checkSetPart(part)).toEqual([]);
    expect(() => validateCourse(def, layoutKnownIds(course))).not.toThrow();
  });

  it('GREY: the re-plan collision, lamps, doors and anchors', () => {
    const mineSolid = mine.filter((p) => p.collide);
    let sum = 0;
    for (const p of mineSolid) sum += p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw + 13 * p.pitch;
    expect(mineSolid).toHaveLength(GREY.solids);
    expect(sum).toBeCloseTo(GREY.checksum, 2);
    expect(built.counts.sets.a6PumpHouse).toEqual({ lights: GREY.lights, solids: GREY.solids, doors: GREY.doors, anchors: GREY.anchors });
    // the register: the removed rows are gone, the new ones counted
    const row = (id: string) => part.register.find((r) => r.id === id);
    expect(row('A6-9')).toBeUndefined();
    expect(row('A6-12')).toMatchObject({ solids: 1 });
    expect(row('A6-R5')).toMatchObject({ anchors: 1, solids: 0 });
    expect(row('A6-R7')).toMatchObject({ lights: 3, solids: 0 });
  });

  it('the slab holes: the pit (the cage footprint) and the culvert\'s two runs', () => {
    expect(FLOOR_HOLES).toEqual([[49.4, 62.0, 53.6, 66.2], [53.6, 62.5, 61.5, 63.7], [61.5, 61.1, 64.0, 63.7]]);
    expect([A6_PIT.x0, A6_PIT.z0, A6_PIT.x1, A6_PIT.z1]).toEqual([...A6_CAGE]);
  });
});

describe('Marlow re-plan A6: the guard and the stations (STATIONS sections 3, 6, 8, 9)', () => {
  it('one guard, the attendant, on his re-routed round (the noise test\'s route); no listener (the lead\'s default)', () => {
    expect(part.bay.squad).toEqual([A6_ATTENDANT]);
    expect(part.bay.squad.length).toBeLessThanOrEqual(SET_GUARDS_MAX);
    const s = part.squads[A6_ATTENDANT]!;
    expect(s.route).toBe(A6_ATTENDANT_ROUTE_REPLAN);
    expect(s.waits).toBe(A6_ATTENDANT_WAITS_REPLAN);
    expect(s.faces).toBe(A6_ATTENDANT_FACES_REPLAN);
    expect([s.x, s.z]).toEqual([...A6_ATTENDANT_ROUTE_REPLAN[0]!]);
  });

  it('his round is walkable on the guards\' nav and clear of the housing, the board, the desk, the cage and the pit', () => {
    const route = A6_ATTENDANT_ROUTE_REPLAN;
    for (let i = 0; i < route.length; i++) {
      const [x0, z0] = route[i]!;
      const [x1, z1] = route[(i + 1) % route.length]!;
      expect(walkBlocked(x0, z0, x1, z1), `leg ${i}`).toBeNull();
      // never over a hole
      for (let k = 0; k <= 20; k++) expect(floorAt(x0 + ((x1 - x0) * k) / 20, z0 + ((z1 - z0) * k) / 20, 1), `leg ${i}`).toBeCloseTo(0, 6);
    }
    const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, 3, lay.navSeeds ?? []);
    for (const [x, z] of route) expect(nav.isWalkable(nav.cellOf(x, z, 0)), `${x}, ${z}`).toBe(true);
    for (let i = 0; i + 1 < route.length; i++) expect(nav.findPath(route[i]!, route[i + 1]!, 50_000, 0, 0), `leg ${i}`).not.toBeNull();
    // he reads the gauge board at G: facing south, the board's north face in front of him
    expect(route[2]).toEqual([A6_GAUGE_REPLAN.x, 64.6]);
    expect(route[2]![1] - MOVEMENT.radius).toBeGreaterThanOrEqual(A6_GAUGE_REPLAN.z + A6_GAUGE_REPLAN.t / 2);
  });

  it('the stations are STATIONS section 3\'s A6 block verbatim', () => {
    expect(part.bay.stations).toBe(A6_PUMP_HOUSE_STATIONS);
    expect(A6_PUMP_HOUSE_STATIONS).toEqual([
      { n: 14, id: 'a6-rope', lesson: 'rope', retry: 'station', doneFlag: 'a6-gal',
        marks: [{ x: 51.0, z: 56.5, y: 0, yaw: 0 }, { x: 52.5, z: 56.5, y: 0, yaw: 0 }],
        guards: ['a6-attendant'], gates: ['g-a6-edge'] },
      { n: 15, id: 'a6-hangdown', lesson: 'hang_down', retry: 'station', doneFlag: 'a6-drive',
        marks: [{ x: 50.5, z: 68.5, y: 4.4, yaw: Math.PI }, { x: 52.5, z: 68.5, y: 4.4, yaw: Math.PI }],
        guards: ['a6-attendant'], gates: ['g-a6-panel'] },
      { n: 16, id: 'a6-dropcatch', lesson: 'drop_catch', retry: 'station', doneFlag: 'a6-pit', kit: 'dropCatch', standIn: 'g-a6-pit-ladder',
        marks: [{ x: 51.5, z: 65.5, y: 4.4, yaw: Math.PI }, { x: 51.5, z: 63.5, y: -1.6, yaw: 0 }],
        guards: ['a6-attendant'], gates: ['g-a6-pit-ladder'] },
    ]);
    for (const st of A6_PUMP_HOUSE_STATIONS) expect(st.drillS).toBeUndefined();
  });

  it('every mark has standing room on its floor: B of 16 on the pit floor, the bridge marks on the deck', () => {
    for (const st of A6_PUMP_HOUSE_STATIONS) {
      for (const m of st.marks) {
        expect(floorAt(m.x, m.z, m.y + 0.5), `${st.id} (${m.x}, ${m.z})`).toBeCloseTo(m.y, 6);
        // (B of 16 stands a body's radius off the drive cabinet's plinth and body, z 63.8: touching, never inside)
        expect(blockedAt(m.x, m.z, m.y, MOVEMENT.radius - 1e-3), `${st.id} (${m.x}, ${m.z})`).toEqual([]);
      }
    }
    const b16 = A6_PUMP_HOUSE_STATIONS[2]!.marks[1];
    expect([b16.x, b16.y, b16.z]).toEqual([A6_PIT_LANDING.x, A6_PIT_LANDING.y, A6_PIT_LANDING.z]);
  });

  it('done flags: a6-gal (built), a6-drive (the panel), a6-pit the new pass zone, both players, on the pit floor', () => {
    const z = part.passZones.find((q) => q.flag === 'a6-pit')!;
    expect(z).toEqual({ id: 'a6-p-pit', box: A6_PIT_ZONE, flag: 'a6-pit', floorY: -1.6 });
    expect(A6_PIT_ZONE).toEqual([49.55, 62.15, 53.45, 66.05]);
    expect(z.any).toBeUndefined();
    expect(part.passZones.some((q) => q.flag === 'a6-gal')).toBe(true);
    expect(part.bay.gates.some((g) => g.kind === 'pickup' && g.flag === 'a6-drive')).toBe(true);
    expect(part.externalFlags).toContain('a6-pit');
  });

  it("LANTERN's retry lines (section 6) at their keys, each within COURSE_TEXT_MAX; the objective lines name what and where, one per station and the outfall", () => {
    for (const r of A6_RETRY_LINES) {
      const row = part.bay.radio.find((q) => q.at === retryKey(r.id));
      expect(row?.text, r.id).toBe(r.text);
      expect(r.text.length).toBeLessThanOrEqual(COURSE_TEXT_MAX);
    }
    expect(A6_RETRY_LINES.map((r) => r.id)).toEqual(['a6-rope', 'a6-hangdown', 'a6-dropcatch']);
    expect(part.objectives.map((o) => o.id)).toEqual(A6_OBJECTIVES.map((o) => o.id));
    expect(part.objectives.map((o) => o.done)).toEqual([{ flag: 'a6-gal' }, { flag: 'a6-drive' }, { flag: 'a6-pit' }, undefined]);
    for (const o of part.objectives) {
      for (const t of [o.text, o.a, o.b]) {
        if (t === undefined) continue;
        expect(t.length, o.id).toBeLessThanOrEqual(COURSE_TEXT_MAX);
        expect(t.toLowerCase()).not.toContain('fail');
      }
    }
    // (marlow-play C8) station 14's B line: the leg-up first, then the rope offered standing at the open edge (never "brace":
    // crouched it is a hang-down offer)
    expect(part.objectives[0]!.b).toBe('Take the leg-up, then at the open edge face the drop and press Co-op standing.');
    expect(part.objectives[0]!.b!.toLowerCase()).not.toMatch(/brace|crouch/);
    expect(part.objectives[3]!.text).toMatch(/outfall culvert/);
    expect(part.objectives[3]!.text).toMatch(/holding room six/);
    // (fix 1) until `dropCatch` ships station 16's way down is the stand-in ladder: the drop step's lines name it through the
    // bridge opening into the drive pit (both go down it), never a catch; the retry line sends them to it too
    const drop = part.objectives[2]!;
    expect(drop.id).toBe('a6-drop');
    for (const t of [drop.text, drop.a!, drop.b!]) {
      expect(t, t).toMatch(/cage ladder/);
      expect(t, t).toMatch(/bridge opening/);
      expect(t, t).toMatch(/drive pit/);
      expect(t.toLowerCase(), t).not.toMatch(/catch|drop/);
      expect(/[–—]/.test(t), t).toBe(false);
    }
    expect(drop.text).toMatch(/^Both of you/);
    const dropRetry = A6_RETRY_LINES.find((r) => r.id === 'a6-dropcatch')!.text;
    expect(dropRetry).toMatch(/cage ladder/);
    expect(dropRetry.toLowerCase()).not.toContain('catch');
  });
});

describe('Marlow re-plan A6: the pit, the outfall and the closed routes on the guards\' runtime nav (doors shut as closures)', () => {
  const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, 3, lay.navSeeds ?? []);
  // the cage door (x 50.9-52.1 on z 62.05) and the L6 near door (z 61.1-62.9 on x 64)
  const cageDoor = nav.addClosure(51.5, 62.05, 0.65, 0.3, 0, 0);
  const l6 = nav.addClosure(64.0, 62.0, 0.35, 0.95, 0, 0);
  const mouth = nav.addClosure(54.0, 63.1, 0.45, 0.65, 0, -1.5, 0.4);
  const FLOOR: [number, number] = [50.0, 60.0];
  const PIT: [number, number] = [52.5, 65.0];
  const L6_FACE: [number, number] = [63.3, 62.0];
  const path = (a: [number, number], ay: number, c: [number, number], cy: number) => nav.findPath(a, c, 200_000, ay, cy);
  const shut = (cage: boolean, door6: boolean, culvert: boolean): void => {
    nav.setClosed(cageDoor, cage);
    nav.setClosed(l6, door6);
    nav.setClosed(mouth, culvert);
  };

  /** The landing inside the cage door (its one walkable nav row; the steps are too narrow for a guard's cell, a player's ramp). */
  const LANDING: [number, number] = [51.5, 62.4];

  it('the pit floor, the landing, the culvert and the L6 door\'s face are walkable', () => {
    for (const [x, z, y] of [[PIT[0], PIT[1], -1.6], [LANDING[0], LANDING[1], 0], [57.5, 63.1, -0.82], [L6_FACE[0], L6_FACE[1], 0]] as const) {
      expect(nav.isWalkable(nav.cellOf(x, z, y)), `${x}, ${z}`).toBe(true);
    }
  });

  it('cage door shut: the pump floor reaches neither the pit nor the L6 door; the pit reaches the L6 door by the outfall', () => {
    shut(true, true, false);
    expect(path(FLOOR, 0, PIT, -1.6)).toBeNull();
    expect(path(FLOOR, 0, L6_FACE, 0)).toBeNull();
    expect(path(PIT, -1.6, L6_FACE, 0)).not.toBeNull();
    // the door open, the floor walks onto the landing (its nav row is the door's: the steps below it are no guard's way)
    shut(false, true, false);
    expect(path(FLOOR, 0, LANDING, 0)).not.toBeNull();
  });

  it('the pit reaches L6 only through the outfall: with the culvert mouth shut, no way from the pit to the door, even with the cage door open', () => {
    shut(false, true, true);
    expect(path(PIT, -1.6, L6_FACE, 0)).toBeNull();
    shut(false, false, false);
  });

  it('a player walks up from the pit floor to the landing: the steps\' ramp from -1.6 at their foot to 0 at the landing, nothing in the way', () => {
    const ramp = solid.filter((p) => Math.abs(p.pitch) > 1e-3 && Math.abs(p.c[0] - 50.0) < 0.01 && p.c[2] > 62.9 && p.c[2] < 65.9);
    expect(ramp.length).toBe(1);
    expect(floorAt(50.0, 65.7, 1)).toBeCloseTo(-1.6 + (1.6 * 0.1) / 2.85, 1);
    expect(floorAt(50.0, 63.05, 1)).toBeCloseTo(-0.06, 1);
    expect(floorAt(50.0, 62.5, 1)).toBeCloseTo(0, 6);
    for (let z = 63.0; z <= 65.7; z += 0.1) {
      const y = floorAt(50.0, z, 1);
      expect(blockedAt(50.0, z, y), `z ${z.toFixed(2)}`).toEqual([]);
    }
    expect(walkBlocked(50.0, 62.5, 51.5, 62.4)).toBeNull();
    // and out of the door (the door is no box here)
    expect(walkBlocked(51.5, 62.4, 51.5, 61.2)).toBeNull();
  });

  it('the staff stair is closed: the gallery and the bridge are off the floor\'s nav (only the team moves reach them)', () => {
    shut(false, false, false);
    expect(nav.findPath(FLOOR, [47.0, 70.6], 200_000, 0, 4.4)).toBeNull();
    expect(nav.findPath(FLOOR, [51.5, 67.5], 200_000, 0, 4.4)).toBeNull();
    // no flight or filler left at the old stair (x 56-63.7 along the north wall): open floor
    expect(blockedAt(60.0, 71.0)).toEqual([]);
    expect(floorAt(60.0, 71.0, 3)).toBeCloseTo(0, 6);
    // the gallery's east end is screened (1.2 m over the deck): a body on the deck cannot step off it there
    expect(blockedAt(55.95, 70.6, A6_DECK.lip).length).toBeGreaterThan(0);
  });
});

describe('Marlow re-plan A6: the housing and the culvert', () => {
  const H = A6_HOUSING;
  it('walls 0.2 m outside the holes, clear of the pump plinths (z 62.2, pump 1 x 61.2), roof at least 2.1 m over the culvert floor; every piece noLedge', () => {
    const [c1x0, c1z0, , c1z1] = A6_CULVERT_1;
    const [c2x0, c2z0] = A6_CULVERT_2;
    expect(c1z0 - (H.south1 + H.t)).toBeCloseTo(0, 6);
    expect(H.south1 - 62.2).toBeGreaterThan(0.05);
    expect(c2z0 - (H.south2 + H.t)).toBeCloseTo(0, 6);
    expect(H.jog - 61.2).toBeGreaterThan(0.05);
    expect(H.north - H.t - c1z1).toBeCloseTo(0, 6);
    expect(c1x0).toBe(A6_PIT.x1);
    expect(c2x0).toBe(61.5);
    // the floor: -1.6 at the pit, 0 from x 61.5 to the door; the roof's underside 2.1
    expect(floorAt(53.7, 63.1, 1)).toBeCloseTo(-1.6, 1);
    expect(floorAt(61.4, 63.1, 1)).toBeCloseTo(-0.02, 1);
    expect(floorAt(62.5, 62.0, 1)).toBeCloseTo(0, 6);
    const roof = flat.filter((p) => p.overhead && bottom(p) > 2.05 && bottom(p) < 2.15 && p.c[0] > 53.5 && p.c[2] > 60.8 && p.c[2] < 64);
    expect(roof.length).toBe(2);
    for (const r of roof) expect(bottom(r) - Math.max(0, -1.6)).toBeGreaterThanOrEqual(2.1 - 1e-6);
    const housing = flat.filter((p) => p.c[0] > 53.6 && p.c[0] < 63.8 && p.c[2] > 60.8 && p.c[2] < 64 && top(p) > 0.1 && top(p) <= 2.31);
    for (const p of housing) expect(p.noLedge, `(${p.c.join(', ')})`).toBe(true);
    // the plinths stand clear of the housing
    for (const [x, z] of [[60, 61], [56, 61]] as const) expect(blockedAt(x, z + 1.2 + 0.05, 0, 0.04).filter((p) => top(p) > 1.3)).toEqual([]);
  });

  it('the L6 door (the outfall gate\'s, as built) opens into the housing only; the gate stays the flag gate on a6-drive', () => {
    const door = b.anchors.doors.find((d) => d.id === course.doors[A6_OUTFALL_DOOR])!;
    expect(door.hinge.x).toBeCloseTo(64, 6);
    expect(door.hinge.z).toBeGreaterThanOrEqual(A6_CULVERT_2[1] - 1e-6);
    expect(door.hinge.z + door.width).toBeLessThanOrEqual(A6_CULVERT_2[3] + 1e-6);
    expect(part.bay.gates).toContainEqual({ kind: 'flag', id: 'g-a6-outfall', flag: 'a6-drive', doorId: A6_OUTFALL_DOOR });
  });

  it('the gauge board is on the housing\'s north face; the built stand between pumps 1 and 2 is gone', () => {
    const G = A6_GAUGE_REPLAN;
    expect(G.z - G.t / 2).toBeCloseTo(H.north, 6);
    expect(blockedAt(G.x, 62.4, 0, 0.05).filter((p) => top(p) < 1.6)).toEqual([]);
    expect(blockedAt(G.x, G.z, 0, 0.05).some((p) => Math.abs(top(p) - G.h) < 1e-6)).toBe(true);
  });
});

describe('Marlow re-plan A6: the drop opening, the panel, the exit release, the stand-in ladder', () => {
  const [dx0, dz0, dx1, dz1] = A6_DROP;
  const cx = (dx0 + dx1) / 2;
  const cz = (dz0 + dz1) / 2;

  it('a 1.0 x 1.0 m opening at x 52-53, z 65-66 through the deck; a 6.0 m fall through it lands on the pit floor (a heavy landing)', () => {
    expect([dx1 - dx0, dz1 - dz0]).toEqual([1, 1]);
    expect(dx1 - dx0).toBeGreaterThan(2 * MOVEMENT.radius);
    // the deck round it is at 4.4, the opening falls to the pit floor
    expect(floorAt(cx, cz, 5)).toBeCloseTo(-1.6, 6);
    for (const [x, z] of [[dx0 - 0.3, cz], [cx, dz0 - 0.3], [cx, dz1 + 0.3]] as const) expect(floorAt(x, z, 5), `${x}, ${z}`).toBeCloseTo(4.4, 6);
    // nothing in the column a falling body (radius 0.3) passes through, from the deck to the pit floor
    for (let y = -1.45; y < 4.4; y += 0.25) expect(blockedAt(cx, cz, y), `y ${y}`).toEqual([]);
    const fall = 4.4 - floorAt(cx, cz, 5);
    expect(fall).toBeCloseTo(6.0, 6);
    expect(landingKind(fall)).toBe('heavy');
    // clear of the gland plate (0.55 m at 51.5, 64.9)
    expect(dx0 - (51.5 + 0.275)).toBeGreaterThan(0.2);
  });

  it('the drive panel: out of reach from the pit floor, the steps\' high end and the landing; still in the hanger\'s reach through the plate', () => {
    expect(panel.y - A6_PIT.y).toBeGreaterThan(INTERACT_DY);
    // every feet point on the landing (bodies inside its upstand) and on the steps where the panel's height band begins
    const L = A6_LANDING;
    for (let x = L.x0 + MOVEMENT.radius; x <= L.x1 - MOVEMENT.radius + 1e-6; x += 0.05) {
      for (let z = L.z0 + MOVEMENT.radius; z <= L.z1 - MOVEMENT.radius + 1e-6; z += 0.05) expect(deviceReaches(x, 0, z, panel), `landing ${x}, ${z}`).toBe(false);
    }
    for (let z = L.z1; z <= A6_BALUSTRADE.z1; z += 0.05) {
      const y = A6_PIT.y + (-A6_PIT.y * (L.z1 + 2.85 - z)) / 2.85;
      expect(deviceReaches(A6_BALUSTRADE.x0 - MOVEMENT.radius, y, z, panel), `steps z ${z}`).toBe(false);
    }
    // the hanger through the gland plate (the hang point as the built test finds it, 51.5, 64.75) reaches it at some depth
    const max = hangDepthMax(4.4, -1.6);
    let reached = false;
    for (let d = TEAM.hangMin; d <= max + 1e-9; d += 0.05) if (hangReaches(51.5, 64.75, 4.4, d, panel.x, panel.y, panel.z)) reached = true;
    expect(reached).toBe(true);
  });

  it('the exit release: in reach from the landing inside the door, out of reach from every body outside the cage and from the pit floor', () => {
    expect(deviceReaches(51.5, 0, 62.5, exit)).toBe(true);
    expect(Math.abs(exit.y - A6_PIT.y)).toBeGreaterThan(INTERACT_DY);
    const ring: [number, number][] = [];
    const [x0, z0, x1, z1] = A6_CAGE;
    for (let t = 0; t <= 1; t += 0.02) ring.push([x0 + (x1 - x0) * t, z0 - MOVEMENT.radius], [x0 - MOVEMENT.radius, z0 + (z1 - z0) * t], [x1 + MOVEMENT.radius, z0 + (z1 - z0) * t], [x0 + (x1 - x0) * t, z1 + MOVEMENT.radius]);
    for (const [x, z] of ring) expect(hyp2(exit.x - x, exit.z - z)).toBeGreaterThanOrEqual(INTERACT_REACH);
    // the egress gate still frees the cage door
    expect(part.bay.gates).toContainEqual({ kind: 'egress', id: 'g-a6-exit', switchId: A6_EXIT, doorIds: [A6_CAGE_DOOR] });
  });

  it('station 16\'s stand-in: the ladder a6-pit-ladder from the pit floor to the deck through the opening, behind its anchorLock gate', () => {
    const id = part.anchors[A6_PIT_LADDER]!;
    const ladder = b.anchors.all.find((a) => a.id === id)!;
    expect(ladder.kind).toBe('ladder');
    if (ladder.kind !== 'ladder') return;
    expect(ladder.base.y).toBeCloseTo(-1.6, 6);
    expect(ladder.top.y).toBeCloseTo(4.4, 6);
    expect(inBox([dx0, dz0, dx1, dz1], ladder.base.x, ladder.base.z)).toBe(true);
    expect(floorAt(ladder.top.x, ladder.top.z, 5)).toBeCloseTo(4.4, 6);
    expect(part.bay.gates).toContainEqual({ kind: 'anchorLock', id: A6_PIT_LADDER_GATE, anchorId: A6_PIT_LADDER, flag: A6_PIT_LADDER });
    expect(course.anchors?.[A6_PIT_LADDER]).toBe(id);
  });

  it('the ladder is locked through stations 14 and 15 and opens as station 16 goes live (dropCatch not playable): the base\'s stand-in rule', () => {
    const s = new CourseState(def, course.consoles);
    s.startAt(6);
    s.setPlayer(0, 51.0, 0, 56.5, false);
    s.setPlayer(1, 52.5, 0, 56.5, false);
    s.update(1 / 60);
    expect(s.liveStation()?.n).toBe(14);
    expect(s.anchorLocked(A6_PIT_LADDER)).toBe(true);
    s.setFlag('a6-gal');
    s.update(1 / 60);
    expect(s.liveStation()?.n).toBe(15);
    expect(s.anchorLocked(A6_PIT_LADDER)).toBe(true);
    s.setFlag('a6-drive');
    s.update(1 / 60);
    expect(s.liveStation()?.n).toBe(16);
    expect(s.anchorLocked(A6_PIT_LADDER)).toBe(false);
  });
});

describe('Marlow re-plan A6: the self-closing edge gate g-a6-edge (SA11)', () => {
  /** The whole map's grips as the game has them (its generated lips over the helpers' manual ledges), on a builder of its own. */
  const lb = new LevelBuilder();
  const lbPart = buildCtcourse(lb, { replan: true }).parts[5]!;
  const grips = generateLedges(lb.boxes, lb.anchors);
  const lipId = lbPart.anchors[A6_GALLERY_LIP]!;
  /** The floor side of the loading edge (the built test's 4.7 m keep-clear) and the gallery over it. */
  const edge: [number, number, number, number] = [36, A6_DECK.z - 4.7, 50, A6_SHELL.north];

  it('the set file names the loading edge\'s lip; the gate is a lockOn anchorLock on it, set by an any-player zone on the gallery; station 14 lists it', () => {
    const id = part.anchors[A6_GALLERY_LIP]!;
    const lip = b.anchors.all.find((a) => a.id === id)!;
    expect(lip.kind).toBe('ledge');
    if (lip.kind !== 'ledge') return;
    expect(lip.piece).toBe(0);
    expect(lip.top).toBeCloseTo(A6_DECK.lip, 9);
    expect([lip.a.x, lip.b.x].sort((p, q) => p - q)).toEqual(A6_LIP_X);
    expect(lip.a.z).toBeCloseTo(A6_DECK.z, 9);
    expect(course.anchors?.[A6_GALLERY_LIP]).toBe(id);
    expect(part.bay.gates).toContainEqual({ kind: 'anchorLock', id: A6_EDGE_GATE, anchorId: A6_GALLERY_LIP, flag: A6_GAL1_FLAG, lockOn: true });
    expect(part.passZones).toContainEqual({ id: 'a6-p-gal1', box: A6_GAL1_ZONE, flag: A6_GAL1_FLAG, floorY: A6_DECK.lip, any: true });
    expect(part.externalFlags).toContain(A6_GAL1_FLAG);
    expect(A6_PUMP_HOUSE_STATIONS[0]!.gates).toEqual([A6_EDGE_GATE]);
    // the zone is the gallery deck: its floor is 4.4 everywhere sampled; the lip, a body hanging on it and the leg-up mark are outside
    const [zx0, zz0, zx1, zz1] = A6_GAL1_ZONE;
    for (let x = zx0 + 0.3; x < zx1; x += 1) for (const z of [zz0 + 0.05, (zz0 + zz1) / 2, zz1 - 0.3]) expect(floorAt(x, z, 6), `(${x}, ${z})`).toBeCloseTo(A6_DECK.lip, 6);
    expect(zz0).toBeGreaterThanOrEqual(A6_DECK.z + MOVEMENT.radius);
    expect(inBox(A6_GAL1_ZONE, A6_MARK.x, A6_MARK.z)).toBe(false);
  });

  it('with the edge gate shut no ledge or lip at the loading edge is reachable from the floor', () => {
    // the named lip is the one grip over 0.9 m at the loading edge (no generated lip, no ladder, pipe or rappel point there)
    const near = grips.all.filter((a) => {
      if (a.kind === 'ledge') return a.top >= 0.9 && inBox(edge, (a.a.x + a.b.x) / 2, (a.a.z + a.b.z) / 2, 0.3);
      if (a.kind === 'ladder' || a.kind === 'pipeV' || a.kind === 'rappel') return inBox(edge, a.kind === 'rappel' ? a.top.x : a.base.x, a.kind === 'rappel' ? a.top.z : a.base.z, 0.3);
      if (a.kind === 'pipeH') return inBox(edge, (a.a.x + a.b.x) / 2, (a.a.z + a.b.z) / 2, 0.3);
      return false;
    });
    expect(near.map((a) => a.id)).toEqual([lipId]);
    // the game's jump search along the edge, from a body on the floor and from a boosted one: the lip or nothing; locked, the
    // attach is refused (`AttachController`: a disabled anchor gives no grip), so the floor reaches nothing at the edge
    let found = 0;
    for (let x = A6_LIP_X[0] - 1; x <= A6_LIP_X[1] + 1 + 1e-9; x += 0.25) {
      for (const y of [0, MOVEMENT.radius, TEAM.boostMax - 1.15]) {
        const t = findJumpTarget(grips, { x, y, z: A6_MARK.z }, -1, 0, 1, 1, 2.5, 0.2);
        if (!t) continue;
        expect(t.anchor.id, `(${x}, ${y})`).toBe(lipId);
        found++;
      }
    }
    expect(found).toBeGreaterThan(0);
    const s = new CourseState(def, course.consoles);
    s.startAt(6);
    s.setFlag(A6_GAL1_FLAG);
    s.update(1 / 60);
    expect(s.isGateOpen(A6_EDGE_GATE)).toBe(false);
    expect(s.anchorLocked(A6_GALLERY_LIP)).toBe(true);
    expect(s.lockedAnchors()).toContain(A6_GALLERY_LIP);
  });

  it('the lip is open for the first leg-up, locks once one player is on the gallery, and a station 14 retry reopens it', () => {
    const s = new CourseState(def, course.consoles);
    s.startAt(6);
    s.setPlayer(0, 51.0, 0, 56.5, false);
    s.setPlayer(1, 52.5, 0, 56.5, false);
    s.update(1 / 60);
    expect(s.liveStation()?.n).toBe(14);
    expect(s.isGateOpen(A6_EDGE_GATE)).toBe(true);
    expect(s.anchorLocked(A6_GALLERY_LIP)).toBe(false);
    // one player up (the any-player zone sets the flag): the lip locks, station 14 still live (the rope is to come)
    s.setFlag(A6_GAL1_FLAG);
    s.update(1 / 60);
    expect(s.liveStation()?.n).toBe(14);
    expect(s.anchorLocked(A6_GALLERY_LIP)).toBe(true);
    // seen: the retry drops the flag, the lip opens again for the next leg-up
    expect(s.retryStation('seen')).toBe(true);
    s.update(1 / 60);
    expect(s.liveStation()?.n).toBe(14);
    expect(s.anchorLocked(A6_GALLERY_LIP)).toBe(false);
    expect(s.isGateOpen(A6_EDGE_GATE)).toBe(true);
    // up again, then both (station 14 done): the lip stays locked through station 15's retry (its gates do not list it)
    s.setFlag(A6_GAL1_FLAG);
    s.setFlag('a6-gal');
    s.update(1 / 60);
    expect(s.liveStation()?.n).toBe(15);
    expect(s.anchorLocked(A6_GALLERY_LIP)).toBe(true);
    expect(s.retryStation('seen')).toBe(true);
    s.update(1 / 60);
    expect(s.anchorLocked(A6_GALLERY_LIP)).toBe(true);
  });
});

describe('Marlow re-plan A6: circuit 69 (Q2) and the sump switch', () => {
  it('group 69 is live with 3 lamps (the table\'s budget) at the built tagged-out fittings', () => {
    const c = MARLOW_CIRCUITS_REPLAN.find((q) => q.group === 69)!;
    const lamps = b.lights.lights.filter((l) => l.group === 69);
    expect(lamps.length).toBe(c.lamps);
    expect(c.lamps).toBe(3);
    for (const f of A6_DEAD_FITTINGS) expect(lamps.some((l) => hyp2(l.x - f.x, l.z - f.z) < 1e-6), `${f.x}, ${f.z}`).toBe(true);
    for (const l of lamps) expect([l.electric, l.destructible]).toEqual([true, true]);
    expect(course.groups?.['a6-sump']).toBe(69);
  });

  it('a6-sw-sump is on the sump bay\'s south wall by the L5 door, the table\'s spot, reached from the floor on the route', () => {
    const sw = part.switches.find((q) => q.id === 'a6-sw-sump')!;
    expect(sw.group).toBe(69);
    expect(sw.pos.x).toBeGreaterThan(A6_SUMP[0]);
    expect(sw.pos.x).toBeLessThan(A6_SUMP[2]);
    expect(sw.pos.z).toBeCloseTo(A6_SHELL.south + 0.05, 6);
    const spot = MARLOW_CIRCUITS_REPLAN.find((q) => q.group === 69)!.switches[0]!;
    expect(spot.id).toBe('a6-sw-sump');
    expect(hyp2(spot.x - sw.pos.x, spot.z - sw.pos.z)).toBeLessThan(0.1);
    // a body on the floor in front of it (the L5 door is at x 52.1-53.9: the entry)
    expect(blockedAt(sw.pos.x, A6_SHELL.south + 0.4)).toEqual([]);
    expect(hyp2(sw.pos.x - sw.pos.x, sw.pos.z - (A6_SHELL.south + 0.4))).toBeLessThan(DEVICE_REACH);
  });
});

describe('station 16 kit spot (marlow-kit-wire)', () => {
  const saved = flags.kitMoves;
  afterEach(() => {
    flags.kitMoves = saved;
  });

  it('one dropCatch spot, a6-dropcatch, in the drop opening at the deck (from A6_DROP_CATCH), placed with the id off', () => {
    expect(flags.kitMoves.has('dropCatch')).toBe(false);
    const spots = kitSpotsOf(b, 'dropCatch');
    expect(spots.length).toBe(1);
    expect(spots[0]).toEqual({ id: 'a6-dropcatch', kind: 'dropCatch', x: A6_DROP_CATCH.x, y: A6_HANG.deck, z: A6_DROP_CATCH.z, yaw: Math.PI / 2 });
    expect(def.bays[5]!.stations!.find((s) => s.kit === 'dropCatch')!.id).toBe('a6-dropcatch');
  });

  it('the PLAN band: the drop 2.5-6.5 m; the point 0.3 m clear of the opening\'s edges and of the stand-in ladder\'s rails', () => {
    const s = kitSpotsOf(b, 'dropCatch')[0]!;
    const h = s.y - A6_PIT_Y;
    expect(h).toBeGreaterThanOrEqual(2.5);
    expect(h).toBeLessThanOrEqual(6.5);
    const [x0, z0, x1, z1] = A6_DROP;
    for (const d of [s.x - x0, x1 - s.x, s.z - z0, z1 - s.z]) expect(d).toBeGreaterThanOrEqual(0.3);
    // the ladder's rails stand 0.06 m off its line toward -z, 0.05 m thick
    expect(A6_PIT_LADDER_AT.z - 0.06 - 0.025 - s.z).toBeGreaterThanOrEqual(0.3);
  });

  it('kit on: station 16 is the drop and the catch (objective, a / b lines, retry line); off: the cage ladder lines', () => {
    flags.kitMoves = new Set(['dropCatch']);
    const on = buildCtcourse(new LevelBuilder(), { replan: true }).layout.course!.def;
    const o = on.objectives!.find((q) => q.id === 'a6-drop')!;
    expect({ text: o.text, a: o.a, b: o.b }).toEqual({ ...A6_DROP_KIT_OBJECTIVE });
    expect(on.bays[5]!.radio.find((r) => r.at === retryKey('a6-dropcatch'))!.text).toBe(A6_DROPCATCH_KIT_RETRY);
    for (const t of [A6_DROPCATCH_KIT_RETRY, ...Object.values(A6_DROP_KIT_OBJECTIVE)]) expect(t.length).toBeLessThanOrEqual(COURSE_TEXT_MAX);
    flags.kitMoves = new Set();
    const off = buildCtcourse(new LevelBuilder(), { replan: true }).layout.course!.def;
    expect(off.objectives!.find((q) => q.id === 'a6-drop')!.text).toBe('Both of you down the cage ladder through the bridge opening into the drive pit.');
    expect(off.bays[5]!.radio.find((r) => r.at === retryKey('a6-dropcatch'))!.text).toBe('The attendant heard the landing. Back to the bridge; take the cage ladder down.');
  });
});
