/**
 * Thornbeck Mill (piano-escape S1b): the greybox data against PLAN section 3 (the map, the 12 + 4 guards), section 2b (the
 * lightning timetable) and the "S1b Checks": every guard with a takedown spot and a fixed route, every start and route
 * point 0.5 m clear of a collider, every lamp electric with no group, ambient 0 (torch slots), the lightning entries and
 * period, the path walkable start to hoist door in stretch order, no walkable cell, drop or ledge from the path into the
 * machinery floor, the stair gate one-way, `validateGuardAi` clean. Built with the pure `LevelBuilder` (as the campus
 * tests); the nav grid is the guards' runtime grid (`tests/helpers/runtimeNav.ts`).
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import {
  ROOF_BEAM_Y,
  DECK_Y,
  THORNBECK_BOLTS,
  THORNBECK_CAM_SPACES,
  THORNBECK_EXIT_SIGN,
  THORNBECK_EXTRA_GUARDS,
  THORNBECK_FLASH_TIMES,
  THORNBECK_GUARDS,
  THORNBECK_GUARDS_16,
  THORNBECK_GUARD_TAGS,
  THORNBECK_HIDE_SPOTS,
  THORNBECK_HOIST_DOOR,
  THORNBECK_KILL_SPOTS,
  THORNBECK_LADDER,
  THORNBECK_LAMPS,
  THORNBECK_LIGHTNING,
  THORNBECK_LIGHTNING_PERIOD,
  THORNBECK_NOOKS,
  THORNBECK_PATH,
  THORNBECK_PLATFORM,
  THORNBECK_RAIN,
  THORNBECK_DECK,
  THORNBECK_SECTORS,
  THORNBECK_SPACES,
  THORNBECK_STAIR_GATE,
  thornbeckMill,
} from '../src/world/maps/thornbeckMill';
import { MAPS } from '../src/world/maps';
import { flags } from '../src/core/flags';
import { checkSectorGuards, checkSectors, exitZone, inZone, type SectorDef, type SectorGuard } from '../src/game/sectors';
import { NOISY_LIMITS, validateGuardAi } from '../src/ai/guardAiData';
import { sweepPeriod, sweepPlan } from '../src/ai/sceneSweep';
import type { PatrolRoute } from '../src/ai/patrol';
import { LightRegistry } from '../src/world/lights';
import { FLASHLIGHTS, addTorchSlots } from '../src/world/torches';
import { camSpaceAt } from '../src/world/camSpaces';
import { surfaceAt } from '../src/world/surfaces';
import { generateLedges, TraversalAnchors } from '../src/world/anchors';
import { canonicalLightShapes } from '../src/voxel/lightShapes';
import { buildCoverSegments } from '../src/cover/coverData';
import { findSplitGaps } from '../src/player/splitJump';
import { hyp2 } from '../src/core/mathx';
import { runtimeNav } from './helpers/runtimeNav';

const b = new LevelBuilder();
const lay = thornbeckMill.build(b, 0);
const sector = THORNBECK_SECTORS[0] as SectorDef;
const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, thornbeckMill.navLayers ?? 3, lay.navSeeds ?? []);

type Rect = readonly [number, number, number, number];
const inRect = (r: Rect, x: number, z: number, pad = 0): boolean => x >= r[0] - pad && x <= r[2] + pad && z >= r[1] - pad && z <= r[3] + pad;
const GROUND_RECTS: readonly Rect[] = [...Object.values(THORNBECK_SPACES), ...THORNBECK_NOOKS];

/** Plan distance (m) from a point on the floor at height `y` to the nearest collider that stands in its way (floors and heads excluded). */
function clearance(x: number, z: number, y: number): number {
  let best = Infinity;
  for (const p of b.boxes) {
    if (!p.collide || Math.abs(p.pitch) > 1e-3 || Math.abs(Math.sin(p.yaw)) > 1e-3) continue;
    const bottom = p.c[1] - p.s[1] / 2;
    const top = p.c[1] + p.s[1] / 2;
    if (top <= y + 0.15 || bottom >= y + 1.9) continue;
    const dx = Math.max(Math.abs(x - p.c[0]) - p.s[0] / 2, 0);
    const dz = Math.max(Math.abs(z - p.c[2]) - p.s[2] / 2, 0);
    best = Math.min(best, hyp2(dx, dz));
  }
  for (const c of b.cylinders) {
    if (!c.collide) continue;
    if (c.c[1] + c.h / 2 <= y + 0.15 || c.c[1] - c.h / 2 >= y + 1.9) continue;
    best = Math.min(best, Math.max(hyp2(x - c.c[0], z - c.c[2]) - c.r, 0));
  }
  return best;
}

/** Is there a solid collision piece (glass included) at the point? */
const solidAt = (x: number, y: number, z: number): boolean =>
  b.boxes.some((p: BoxPiece) => p.collide && Math.abs(x - p.c[0]) <= p.s[0] / 2 + 1e-9 && Math.abs(y - p.c[1]) <= p.s[1] / 2 + 1e-9 && Math.abs(z - p.c[2]) <= p.s[2] / 2 + 1e-9);

describe('Thornbeck Mill: the map and its registration', () => {
  it('keeps the S1 stub contract: id, scene, sector mode, one clear section, listed only behind the flag', () => {
    expect(thornbeckMill.id).toBe('thornbeckMill');
    expect(thornbeckMill.name).toBe('Thornbeck Mill');
    expect(thornbeckMill.scene).toBe('piano');
    expect(thornbeckMill.modes).toEqual(['sector']);
    expect(thornbeckMill.sectors).toBe(THORNBECK_SECTORS);
    expect(THORNBECK_SECTORS).toHaveLength(1);
    expect(sector.id).toBe('thornbeckMill');
    expect(sector.objective.kind).toBe('clear');
    expect(flags.pianoEscape).toBe(false);
    expect(MAPS.some((m) => m.id === 'thornbeckMill')).toBe(false);
  });

  it('is valid section data, with the start behind W1 and the exit zone on the hoist platform', () => {
    expect(checkSectors(THORNBECK_SECTORS)).toEqual([]);
    expect(sector.start).toMatchObject({ x: 4.0, y: 0, z: 4.6 });
    expect(sector.start2).toMatchObject({ x: 4.0, y: 0, z: 6.0 });
    expect(lay.playerSpawns.map((s) => [s.pos.x, s.pos.z])).toEqual([[4.0, 4.6], [4.0, 6.0]]);
    const zone = exitZone(sector)!;
    // the platform stands at the gallery's height outside the west gable; a player on it is in, one on the floor under it is not
    expect(zone.floorY).toBe(DECK_Y);
    expect(inZone(zone, -1.3, DECK_Y, 16.6)).toBe(true);
    expect(inZone(zone, -1.3, 0, 16.6)).toBe(false);
    expect(zone.box[2]).toBe(0);
  });

  it('the hall is 32 x 18 m: walls, a closed roof, a gallery along the north wall at +4.2 m', () => {
    expect(DECK_Y).toBe(4.2);
    // the roof is one closed slab over the whole hall (the lightning comes in by the openings only)
    for (const [x, z] of [[1, 1], [16, 9], [31, 17], [0.1, 17.9], [31.9, 0.1]] as const) expect(solidAt(x, 9.2, z)).toBe(true);
    // the four walls stand to the roof where they have no opening
    for (const [x, z] of [[16, -0.2], [16, 18.2], [-0.2, 10], [32.2, 14]] as const) expect(solidAt(x, 8, z)).toBe(true);
    expect(solidAt(16, 4.05, 16.5)).toBe(true);
    expect(solidAt(16, 4.05, 14)).toBe(false);
    expect(lay.navSeeds!.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Thornbeck Mill: guards (PLAN section 3)', () => {
  const all: readonly { tag: string; g: SectorGuard }[] = [
    ...THORNBECK_GUARDS.map((g, i) => ({ tag: THORNBECK_GUARD_TAGS[i]!, g })),
    ...THORNBECK_EXTRA_GUARDS.map((e) => ({ tag: e.tag, g: e.guard })),
  ];

  it('12 guards in the section and 4 tagged extras, all armed, valid as a section list', () => {
    expect(THORNBECK_GUARDS).toHaveLength(12);
    expect(sector.guards).toBe(THORNBECK_GUARDS);
    expect(THORNBECK_GUARD_TAGS).toEqual(['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12']);
    expect(THORNBECK_EXTRA_GUARDS.map((e) => e.tag)).toEqual(['G13', 'G14', 'G15', 'G16']);
    expect(THORNBECK_GUARDS_16).toHaveLength(16);
    expect(THORNBECK_GUARDS_16.slice(0, 12)).toEqual(THORNBECK_GUARDS);
    expect(checkSectorGuards({ ...sector, guards: THORNBECK_GUARDS_16 })).toEqual([]);
    for (const { g } of all) expect(g.kind).toBe('grunt');
    expect(all.map((a) => a.tag)).toEqual([...THORNBECK_GUARD_TAGS, 'G13', 'G14', 'G15', 'G16']);
  });

  it('guard-list slots 0-3 are G1, G2, G3, G4, in that order (the intro actors), at the plan starts', () => {
    const starts = THORNBECK_GUARDS.slice(0, 4).map((g) => [g.x, g.z]);
    expect(starts).toEqual([[7.5, 8.9], [8.3, 7.9], [9.0, 2.0], [10.0, 3.4]]);
    const rest = THORNBECK_GUARDS.slice(4).map((g) => [g.x, g.z, g.y ?? 0]);
    expect(rest).toEqual([[20.8, 9.0, 0], [29.0, 9.9, 0], [28.8, 16.2, DECK_Y], [12.5, 15.6, DECK_Y], [12.5, 16.6, DECK_Y], [8.8, 16.2, DECK_Y], [1.5, 15.9, DECK_Y], [1.5, 17.0, DECK_Y]]);
  });

  it('every guard (12 + 4) has a takedown spot and a fixed route of patrol points', () => {
    for (const { tag, g } of all) {
      expect(g.takedownSpot, `${tag} takedown spot`).toHaveLength(2);
      expect(g.takedownSpot.every(Number.isFinite), `${tag} spot finite`).toBe(true);
      expect(g.route, `${tag} route`).toBeDefined();
      expect(g.route!.length, `${tag} route length`).toBeGreaterThanOrEqual(2);
      // a stop's pause per point (and its facing, when given) lines up with the points
      if (g.waits) expect(g.waits, `${tag} waits`).toHaveLength(g.route!.length);
      if (g.faces) expect(g.faces, `${tag} faces`).toHaveLength(g.route!.length);
    }
  });

  it('the takedown spots are the plan\'s K1-K10: one per kill stretch, the pairs sharing theirs', () => {
    expect(THORNBECK_KILL_SPOTS).toEqual({ K1: [6.0, 8.4], K2: [22.8, 7.0], K4: [28.2, 9.9], K5: [25.4, 12.2], K6: [22.8, 16.2], K8: [12.8, 16.1], K9: [8.8, 16.9], K10: [1.6, 16.5] });
    const spot = (i: number): number[] => THORNBECK_GUARDS[i]!.takedownSpot;
    expect([spot(0), spot(1)]).toEqual([[6.0, 8.4], [6.0, 8.4]]); // G1 + G2: K1
    expect(spot(2)).toEqual([22.8, 7.0]); // G3: K2
    expect([spot(3), spot(4)]).toEqual([[25.4, 12.2], [25.4, 12.2]]); // G4 + G5: K5
    expect(spot(5)).toEqual([28.2, 9.9]); // G6: K4
    expect(spot(6)).toEqual([22.8, 16.2]); // G7: K6
    expect([spot(7), spot(8)]).toEqual([[12.8, 16.1], [12.8, 16.1]]); // G8 + G9: K8
    expect(spot(9)).toEqual([8.8, 16.9]); // G10: K9
    expect([spot(10), spot(11)]).toEqual([[1.6, 16.5], [1.6, 16.5]]); // G11 + G12: K10
  });

  it('every start, route point, takedown spot and player start is 0.5 m clear of a collider (G1 + G2 lanes: 0.3 m)', () => {
    const bad: string[] = [];
    const check = (what: string, x: number, z: number, y: number, min = 0.5): void => {
      const c = clearance(x, z, y);
      if (c < min - 1e-6) bad.push(`${what} (${x}, ${z}) y ${y}: ${c.toFixed(3)} m`);
    };
    for (const { tag, g } of all) {
      // GA5 item 5 and PB4 (1 - 1.5 m for the paired kill): G1 + G2 walk lanes z 7.9 / 8.9 (1.0 m apart) between W1's north
      // face (z 7.5) and the sack wall (z 9.2), so their starts and route points are cleared to 0.3 m, these two lanes only
      const min = tag === 'G1' || tag === 'G2' ? 0.3 : 0.5;
      check(`${tag} start`, g.x, g.z, g.y ?? 0, min);
      g.route!.forEach(([x, z], i) => check(`${tag} route ${i}`, x, z, g.y ?? 0, min));
      check(`${tag} takedown spot`, g.takedownSpot[0], g.takedownSpot[1], g.y ?? 0);
    }
    for (const s of lay.playerSpawns) check('player start', s.pos.x, s.pos.z, s.pos.y);
    expect(bad).toEqual([]);
  });

  it('every guard starts on his storey inside a path space (ground) or on the gallery', () => {
    for (const { tag, g } of all) {
      const y = g.y ?? 0;
      if (y === 0) expect(GROUND_RECTS.some((r) => inRect(r, g.x, g.z)), `${tag} start in a path space`).toBe(true);
      else expect(inRect(THORNBECK_DECK, g.x, g.z), `${tag} start on the gallery`).toBe(true);
      for (const [x, z] of g.route!) {
        if (y === 0) expect(GROUND_RECTS.some((r) => inRect(r, x, z)), `${tag} route point (${x}, ${z})`).toBe(true);
        else expect(inRect(THORNBECK_DECK, x, z), `${tag} route point (${x}, ${z}) on the gallery`).toBe(true);
      }
    }
  });

  it('the pairs walk side by side: partners name each other, start 1.0 - 1.1 m apart on parallel lanes', () => {
    // GA5 item 1: `pair` both ways (G15 + G16 by their index in THORNBECK_GUARDS_16)
    const pairs: readonly (readonly [number, number])[] = [[0, 1], [3, 4], [7, 8], [10, 11], [14, 15]];
    for (const [i, j] of pairs) {
      expect(THORNBECK_GUARDS_16[i]!.pair, `slot ${i} names ${j}`).toBe(j);
      expect(THORNBECK_GUARDS_16[j]!.pair, `slot ${j} names ${i}`).toBe(i);
    }
    expect(THORNBECK_GUARDS_16.map((g, i) => (g.pair === undefined ? -1 : i))).toEqual([0, 1, -1, 3, 4, -1, -1, 7, 8, -1, 10, 11, -1, -1, 14, 15]);
    // GA5 item 4: the lanes
    expect([7, 8, 10, 11].map((i) => THORNBECK_GUARDS[i]!.z)).toEqual([15.6, 16.6, 15.9, 17.0]);
    expect([0, 1].map((i) => THORNBECK_GUARDS[i]!.z)).toEqual([8.9, 7.9]);
    for (const [i, j] of [[0, 1], [7, 8], [10, 11]] as const) {
      const a = THORNBECK_GUARDS[i]!;
      const c = THORNBECK_GUARDS[j]!;
      // the lanes are 1.0 - 1.1 m apart (G1 + G2 start staggered in x as well, so the starts are up to 1.3 m apart)
      expect(Math.abs(a.z - c.z), `pair ${i}/${j} lanes`).toBeGreaterThanOrEqual(1.0 - 1e-9);
      expect(Math.abs(a.z - c.z)).toBeLessThanOrEqual(1.1 + 1e-9);
      expect(hyp2(a.x - c.x, a.z - c.z), `pair ${i}/${j} apart`).toBeGreaterThanOrEqual(1.0 - 1e-9);
      expect(hyp2(a.x - c.x, a.z - c.z)).toBeLessThanOrEqual(1.3);
      expect(a.squad).toBe(c.squad);
      expect(a.y ?? 0).toBe(c.y ?? 0);
      // the lanes run the same way: the same x ends, the same pauses, each lane at its own z
      expect(a.route!.map((p) => p[0])).toEqual(c.route!.map((p) => p[0]));
      expect(a.route!.every((p) => p[1] === a.z)).toBe(true);
      expect(c.route!.every((p) => p[1] === c.z)).toBe(true);
      expect(a.waits).toEqual(c.waits);
    }
    // G4 + G5 (GA5 items 2 and 3): per-point waits, no `loop` / `wait`, faces kept, 1.2 m apart at the door, one 50 s lap each
    const g4 = THORNBECK_GUARDS[3]!;
    const g5 = THORNBECK_GUARDS[4]!;
    expect([g4.pair, g5.pair]).toEqual([4, 3]);
    expect([g4.route!.length, g5.route!.length]).toEqual([4, 4]);
    for (const g of [g4, g5]) {
      expect(g.loop).toBeUndefined();
      expect(g.wait).toBeUndefined();
      expect(g.waits).toHaveLength(4);
      expect(g.waits!.slice(1)).toEqual([0, 4, 0]);
      expect(g.faces).toHaveLength(4);
      expect(g.start).toBeDefined();
    }
    const door4 = g4.route![2]!;
    const door5 = g5.route![2]!;
    expect(hyp2(door4[0] - door5[0], door4[1] - door5[1])).toBeCloseTo(1.2, 6);
    // (S4) GA6b's lap: `sweepPeriod` on each guard's route object (the legs at sweep pace, the turns, the waits); equal laps
    // of 50 s (Guard AI's values; 40 s does not fit: G4's lap without its end pause is 46.13 s)
    const route = (g: SectorGuard): PatrolRoute => ({ points: g.route!, waits: g.waits, faces: g.faces, start: g.start });
    const G4 = route(g4);
    const G5 = route(g5);
    expect(sweepPeriod(G4)).toBeCloseTo(sweepPeriod(G5), 6);
    expect(sweepPeriod(G4)).toBeCloseTo(50, 3);
    // the door stops (point 2) coincide: they leave it together every lap (sweep time from the start), after a 4 s stop
    const p4 = sweepPlan(G4, 0, 0, 0);
    const p5 = sweepPlan(G5, 0, 0, 0);
    const doorAt = (p: typeof p4): number => (((p.leave[2]! - p.phase) % p.period) + p.period) % p.period;
    expect(doorAt(p4)).toBeCloseTo(doorAt(p5), 6);
    expect(doorAt(p4)).toBeCloseTo(23.56, 2);
  });

  it('validateGuardAi is clean on all 16 slots', () => {
    const errs = validateGuardAi({}, THORNBECK_GUARDS_16, { section: 0, sections: 1, bounds: { minX: -6, maxX: 34, minZ: -2, maxZ: 20 } });
    expect(errs).toEqual([]);
    expect(validateGuardAi({}, THORNBECK_GUARDS, { section: 0, sections: 1 })).toEqual([]);
  });

  it('the tagged extras sit where the plan puts them: G13 in the office, G14 behind G7, G15 + G16 at the stair head', () => {
    const e = Object.fromEntries(THORNBECK_EXTRA_GUARDS.map((x) => [x.tag, x]));
    expect(inRect(THORNBECK_SPACES.office, e.G13!.guard.x, e.G13!.guard.z)).toBe(true);
    expect(e.G13!.stretch).toBe(4);
    expect(e.G14!.guard.y).toBe(DECK_Y);
    expect(e.G14!.guard.x).toBeGreaterThan(THORNBECK_GUARDS[6]!.x); // behind G7 (east of him: he walks west)
    expect(e.G14!.stretch).toBe(6);
    for (const t of ['G15', 'G16'] as const) {
      expect(e[t]!.stretch).toBe(9);
      expect(Math.abs(e[t]!.guard.x - 8.8)).toBeLessThan(3);
    }
  });
});

describe('Thornbeck Mill: light (PLAN section 2b and "Spaces, levels and lamps")', () => {
  it('16 lamps and the exit sign, every one electric with no switch group', () => {
    const lights = b.lights.lights;
    expect(THORNBECK_LAMPS).toHaveLength(16);
    expect(lights).toHaveLength(17);
    for (const l of lights) {
      expect(l.electric, `light ${l.id} electric`).toBe(true);
      expect(l.group, `light ${l.id} group`).toBe(-1);
      expect(l.kind).toBe('lamp');
    }
    THORNBECK_LAMPS.forEach(([, x, y, z], i) => expect([lights[i]!.x, lights[i]!.y, lights[i]!.z]).toEqual([x, y, z]));
    const sign = lights[16]!;
    expect([sign.x, sign.y, sign.z]).toEqual([THORNBECK_EXIT_SIGN.x, THORNBECK_EXIT_SIGN.y, THORNBECK_EXIT_SIGN.z]);
    // no switches, boards or alarms on the map: nothing but the EMP turns a lamp off
    expect(lay.switches ?? []).toEqual([]);
    expect(lay.boards ?? []).toEqual([]);
  });

  it('the lamps are where the plan puts them: per space 2 / 2 / 1 / 2 / 1 / 1, gallery 5, hoist 1, machinery 1', () => {
    const per: Record<string, number> = {};
    for (const [, , , , sp] of THORNBECK_LAMPS) per[sp] = (per[sp] ?? 0) + 1;
    expect(per).toEqual({ startBay: 2, aisle: 2, millBay: 1, sackBay: 2, office: 1, lobby: 1, machinery: 1, gallery: 5, hoist: 1 });
    for (const [id, x, y, z, sp] of THORNBECK_LAMPS) {
      if (sp === 'machinery' || sp === 'gallery' || sp === 'hoist') continue;
      expect(inRect(THORNBECK_SPACES[sp as keyof typeof THORNBECK_SPACES], x, z), `${id} over its space`).toBe(true);
      expect(y).toBeLessThan(9);
    }
  });

  it('ambient 0: a dark map, so the torch slots exist', () => {
    expect(thornbeckMill.theme.lightLevel).toBe(0);
    expect(thornbeckMill.theme.sunIntensity).toBe(0);
    const reg = new LightRegistry();
    reg.ambient = thornbeckMill.theme.lightLevel ?? 0.75;
    addTorchSlots(reg);
    expect(reg.lights.filter((l) => l.kind === 'flashlight')).toHaveLength(FLASHLIGHTS);
    expect(FLASHLIGHTS).toBeGreaterThan(0);
  });

  it("the lightning timetable is the mission track's: 18 times a loop, 6 doubles on its section changes, 24 entries", () => {
    const times = [6, 18, 28, 36.68, 43, 49.48, 58, 64, 71.88, 80, 89, 97.48, 104, 110.28, 116, 123.08, 131, 148];
    const doubles = [36.68, 49.48, 71.88, 97.48, 110.28, 123.08];
    expect(THORNBECK_FLASH_TIMES.map(([t]) => t)).toEqual(times);
    expect(THORNBECK_FLASH_TIMES.filter(([, d]) => d).map(([t]) => t)).toEqual(doubles);
    const f = THORNBECK_LIGHTNING.flashes;
    expect(f).toHaveLength(24);
    // written out in full: a single is { t, 1, 0.6 }, a double adds { t + 0.45, 0.8, 0.5 }
    const expected: { t: number; peak: number; len: number }[] = [];
    for (const t of times) {
      expected.push({ t, peak: 1, len: 0.6 });
      if (doubles.includes(t)) expected.push({ t: t + 0.45, peak: 0.8, len: 0.5 });
    }
    expect(expected).toHaveLength(24);
    f.forEach((x, i) => {
      expect(x.t, `entry ${i} t`).toBeCloseTo(expected[i]!.t, 9);
      expect(x.peak, `entry ${i} peak`).toBe(expected[i]!.peak);
      expect(x.len, `entry ${i} len`).toBe(expected[i]!.len);
    });
    // sorted, inside the loop; the last flash and its length leave a gap over the seam (148.6 -> 6 + 160.04)
    for (let i = 1; i < f.length; i++) expect(f[i]!.t).toBeGreaterThan(f[i - 1]!.t);
    const P = THORNBECK_LIGHTNING.period;
    for (const x of f) expect(x.t + x.len).toBeLessThan(P);
    const last = f[f.length - 1]!;
    expect(f[0]!.t + P - (last.t + last.len)).toBeGreaterThan(10);
  });

  it('the lightning openings (SO5b): the ten windows and board gap, on the walls, facing in; not the hoist doorway', () => {
    const o = THORNBECK_LIGHTNING.openings;
    expect(o).toHaveLength(10);
    for (const p of o) {
      expect(Math.abs(p.nx) + Math.abs(p.nz)).toBe(1);
      // on a wall's inner face, facing into the hall
      if (p.nz === 1) expect(p.z).toBe(0);
      if (p.nz === -1) expect(p.z).toBe(18);
      if (p.nx === 1) expect(p.x).toBe(0);
      if (p.nx === -1) expect(p.x).toBe(32);
      expect(p.w).toBeGreaterThan(0);
      expect(p.h).toBeGreaterThan(0);
      // the hoist doorway (west gable z 15.8-17.4) is not one
      expect(p.nx === 1 && p.z > 15).toBe(false);
    }
  });

  it("the lightning period is the mission track's loop: 162.04 s whole less the 2 s cross-fade", () => {
    expect(THORNBECK_LIGHTNING.period).toBe(THORNBECK_LIGHTNING_PERIOD);
    expect(THORNBECK_LIGHTNING.period).toBeCloseTo(160.04, 9);
  });

  it('the rain source is present, inside the noisy-source limits (6 dB halves a guard\'s hearing reach)', () => {
    expect(THORNBECK_RAIN).toEqual({ id: 'rain', db: 6, label: 'rain' });
    expect(THORNBECK_RAIN.db).toBeGreaterThanOrEqual(NOISY_LIMITS.dbMin);
    expect(THORNBECK_RAIN.db).toBeLessThanOrEqual(NOISY_LIMITS.dbMax);
    // (S4) on the section as a map-wide source, and validateGuardAi takes it
    const noisy = THORNBECK_SECTORS[0]!.noisy ?? [];
    expect(noisy).toEqual([{ id: THORNBECK_RAIN.id, x: 0, z: 0, radius: Infinity, db: THORNBECK_RAIN.db, label: THORNBECK_RAIN.label }]);
    expect(validateGuardAi({ noisy }, THORNBECK_GUARDS, { section: 0, sections: 1, bounds: { minX: -6, maxX: 34, minZ: -2, maxZ: 20 } })).toEqual([]);
  });

  it('(S4) the map carries the timetable as its lightning (SO5)', () => {
    expect(thornbeckMill.lightning).toBe(THORNBECK_LIGHTNING);
  });

  it('the windows and board gaps are real openings: glass panes (light passes, bodies stop) and a gap in the boards', () => {
    const panes = b.boxes.filter((p) => p.glass);
    // south 3, north gallery 4, west gable 1, office east 1
    expect(panes).toHaveLength(9);
    for (const p of panes) {
      expect(p.collide).toBe(true);
      expect(p.visible).toBe(false);
    }
    // no light shape stops the light in a pane or in the board gap; the roof and the walls do
    const shapes = canonicalLightShapes(b.boxes, b.cylinders, 'thornbeckMill', false);
    const shapeAt = (x: number, y: number, z: number): boolean => shapes.some((s) => s.kind === 'box' && Math.abs(x - s.c[0]) <= s.s[0] / 2 && Math.abs(y - s.c[1]) <= s.s[1] / 2 && Math.abs(z - s.c[2]) <= s.s[2] / 2);
    for (const p of panes) expect(shapeAt(p.c[0], p.c[1], p.c[2]), `pane at ${p.c}`).toBe(false);
    expect(shapeAt(32.2, 2.1, 2.5)).toBe(false); // the board gap, east wall z 2-3
    expect(shapeAt(32.2, 1.0, 2.5)).toBe(true); // the boards under it
    expect(shapeAt(16, 9.2, 9)).toBe(true); // the roof
    expect(shapeAt(16, 4.2 + 1.0, 15)).toBe(false); // the crane-bay bar is no light shape: a torch's light passes it
  });
});

describe('Thornbeck Mill: the path on the guards\' nav grid (runtime grid, the spawn and the map\'s nav seeds)', () => {
  it('the path is walkable start to hoist door in stretch order, every stop on the grid', () => {
    expect(THORNBECK_PATH[0]!.name).toBe('start');
    expect(THORNBECK_PATH[THORNBECK_PATH.length - 1]!.name).toBe('hoist platform');
    // stretches 1..10 in order, each at least once
    const order = THORNBECK_PATH.map((s) => s.stretch);
    for (let i = 1; i < order.length; i++) expect(order[i]!).toBeGreaterThanOrEqual(order[i - 1]!);
    expect([...new Set(order)]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const fails: string[] = [];
    for (let i = 0; i + 1 < THORNBECK_PATH.length; i++) {
      const a = THORNBECK_PATH[i]!;
      const c = THORNBECK_PATH[i + 1]!;
      const p = nav.findPath([a.pt[0], a.pt[1]], [c.pt[0], c.pt[1]], 200000, a.pt[2] ?? 0, c.pt[2] ?? 0);
      if (!p) fails.push(`${a.name} -> ${c.name}`);
      for (const s of [a, c]) {
        const ok = nav.nearestWalkable(s.pt[0], s.pt[1], 2, s.pt[2] ?? 0);
        if (ok < 0 || Math.abs(nav.height[ok]! - (s.pt[2] ?? 0)) > 0.6) fails.push(`${s.name} is off the grid`);
      }
    }
    expect(fails).toEqual([]);
    // the section's route is that path, the ladder leg marked as a climb
    expect(sector.routes[0]!.pts).toHaveLength(THORNBECK_PATH.length);
    expect(sector.routes[0]!.climbs).toEqual([THORNBECK_PATH.findIndex((s) => s.name === 'deck, top of the ladder') - 1]);
  });

  it('every kill spot and every guard start is on the grid of its storey', () => {
    for (const g of THORNBECK_GUARDS_16) {
      const y = g.y ?? 0;
      for (const [x, z] of [[g.x, g.z], g.takedownSpot] as const) {
        const c = nav.nearestWalkable(x, z, 2, y);
        expect(c, `(${x}, ${z})`).toBeGreaterThanOrEqual(0);
        expect(Math.abs(nav.height[c]! - y)).toBeLessThan(0.6);
      }
    }
  });

  it('no walkable cell, drop or ledge leads from the path into the machinery floor', () => {
    // every cell the guards and players can reach lies in a path space, the stair, the gallery or the platform (the roof slab
    // is a surface nobody reaches: the grid keeps it only because the plain spawn seed picks the top surface of its column)
    const outside: string[] = [];
    let reach = 0;
    for (let l = 0; l < nav.layers; l++) {
      for (let col = 0; col < nav.cols; col++) {
        const i = l * nav.cols + col;
        if (!nav.walk[i]) continue;
        const h = nav.height[i]!;
        if (h > 8) continue;
        reach++;
        const x = nav.ox + ((col % nav.w) + 0.5) * nav.cell;
        const z = nav.oz + (Math.floor(col / nav.w) + 0.5) * nav.cell;
        const stair = inRect([8.1, 10.1, 9.5, 15.1], x, z) && h >= -0.1 && h <= DECK_Y + 0.1;
        const ground = h < 0.8 && GROUND_RECTS.some((r) => inRect(r, x, z, 0.01));
        const deck = Math.abs(h - DECK_Y) < 0.1 && (inRect(THORNBECK_DECK, x, z) || inRect(THORNBECK_PLATFORM, x, z));
        if (!(stair || ground || deck)) outside.push(`(${x.toFixed(2)}, ${z.toFixed(2)}) h ${h.toFixed(2)}`);
      }
    }
    expect(reach).toBeGreaterThan(500);
    expect(outside).toEqual([]);
    // the machinery floor itself: no walkable ground there (the sifter, the mills, the open floor under and beside the gallery)
    for (const [x, z] of [[3, 13], [12, 8], [12.5, 12], [8, 14.5], [13, 15], [20, 15.5], [3.5, 11], [16.5, 6.2], [12, 6.2]] as const) {
      expect(nav.isWalkable(nav.cellOf(x, z, 0)), `(${x}, ${z}) ground`).toBe(false);
    }
    // no drop link, no ledge (placed, generated or hung) anywhere: every piece is noLedge
    expect(nav.links.filter((k) => k.kind === 'drop')).toHaveLength(0);
    expect(b.anchors.ledges).toHaveLength(0);
    expect(generateLedges(b.boxes, new TraversalAnchors()).ledges).toHaveLength(0);
    // split jumps only inside the stair housing (two 5.3 m walls 1.2 m apart behind the locked gate)
    for (const g of findSplitGaps(buildCoverSegments(b.boxes, b.cylinders))) {
      expect(inRect([8.1, 10.1, 9.5, 15.1], g.a.x, g.a.z) && inRect([8.1, 10.1, 9.5, 15.1], g.b.x, g.b.z), `split gap (${g.a.x}, ${g.a.z}) - (${g.b.x}, ${g.b.z})`).toBe(true);
    }
  });

  it('the gallery edge holds: the rail, the crane-bay bar and the stair housing leave no way off the deck', () => {
    // south edge z 15: a collider 1.1 m up the length of the deck except the stair head (x 8.2 - 9.4), the bar over the crane bay
    for (let x = 0.05; x < 32; x += 0.1) {
      if (x > 8.15 && x < 9.45) continue;
      expect(solidAt(x, DECK_Y + 0.55, 15), `rail at x ${x.toFixed(2)}`).toBe(true);
    }
    // the crane bay (x 12 - 20): the bar is a collider 2.4 m tall, so no jump clears it
    for (let x = 12.05; x < 20; x += 0.1) expect(solidAt(x, DECK_Y + 2.3, 15), `bar at x ${x.toFixed(2)}`).toBe(true);
    // the stair head: the housing's two walls reach the deck's rail height and run its whole length
    for (let z = 10.25; z < 15; z += 0.25) {
      expect(solidAt(8.15, 2.5, z), `west housing wall z ${z.toFixed(2)}`).toBe(true);
      expect(solidAt(9.45, 2.5, z), `east housing wall z ${z.toFixed(2)}`).toBe(true);
    }
    // the hatch's two sides and the platform's three
    const h = THORNBECK_LADDER;
    expect(solidAt(h.x - 0.45, DECK_Y + 0.55, 15.6)).toBe(true);
    expect(solidAt(h.x + 0.45, DECK_Y + 0.55, 15.6)).toBe(true);
    const [px0, pz0, , pz1] = THORNBECK_PLATFORM;
    for (let x = px0 + 0.05; x < -0.45; x += 0.1) {
      expect(solidAt(x, DECK_Y + 0.55, pz0)).toBe(true);
      expect(solidAt(x, DECK_Y + 0.55, pz1)).toBe(true);
    }
    for (let z = pz0 + 0.05; z < pz1; z += 0.1) expect(solidAt(px0 + 0.05, DECK_Y + 0.55, z)).toBe(true);
    // the deck is a complete slab but for the hatch
    for (let x = 0.25; x < 32; x += 0.5) for (let z = 15.25; z < 18; z += 0.5) expect(solidAt(x, DECK_Y - 0.1, z) || (x > 30.8 && x < 31.6 && z > 15.2 && z < 16), `deck at (${x}, ${z})`).toBe(true);
  });
});

describe('Thornbeck Mill: the stair gate and the hoist door', () => {
  it('the stair foot gate is a locked door bolted from the gallery side: it opens only from the stair head', () => {
    const gate = b.anchors.doors.find((d) => Math.abs(d.hinge.x - 8.2) < 1e-6 && Math.abs(d.hinge.z - THORNBECK_STAIR_GATE.z) < 1e-6)!;
    expect(gate).toBeDefined();
    expect(gate.locked).toBe(true);
    expect(gate.breachable).toBe(false);
    expect(gate.width).toBe(THORNBECK_STAIR_GATE.width);
    const centre = [gate.hinge.x + (Math.sin(gate.yaw) * gate.width) / 2, gate.hinge.z + (Math.cos(gate.yaw) * gate.width) / 2];
    expect(centre[0]).toBeCloseTo(THORNBECK_STAIR_GATE.x, 9);
    expect(centre[1]).toBeCloseTo(THORNBECK_STAIR_GATE.z, 9);
    expect(sector.bolts).toBe(THORNBECK_BOLTS);
    expect(THORNBECK_BOLTS).toHaveLength(1);
    const bolt = THORNBECK_BOLTS[0]!;
    expect(bolt.at).toEqual([8.8, 10.2]);
    // the side that can unbolt it is north: the stair and the gallery, not the start bay (south)
    expect(bolt.side).toEqual([0, 1]);
    expect(bolt.w).toBe(1.2);
  });

  it('with the gate shut a player in the start bay cannot walk up the stair, and one on the stair can reach the foot', () => {
    const open = runtimeNav(b, lay.playerSpawns[0]!.pos, thornbeckMill.navLayers ?? 3, lay.navSeeds ?? []);
    open.walkOnly = true;
    const shut = runtimeNav(b, lay.playerSpawns[0]!.pos, thornbeckMill.navLayers ?? 3, lay.navSeeds ?? []);
    shut.walkOnly = true;
    shut.setClosed(shut.addClosure(THORNBECK_STAIR_GATE.x, THORNBECK_STAIR_GATE.z, THORNBECK_STAIR_GATE.width / 2 + 0.1, 0.4, 0, 0), true);
    const stairMid: [number, number] = [8.8, 12.6];
    // without a gate the stair joins the start bay to the gallery (and the walk on the grid is the stair, not the ladder)
    expect(open.findPath([8.8, 9.6], stairMid, 20000, 0, 2.1)).not.toBeNull();
    expect(open.findPath([8.8, 9.6], [8.8, 16.4], 20000, 0, DECK_Y)).not.toBeNull();
    // gate shut: up from the bay: no; down to the gate from the gallery: yes, as far as the gate
    expect(shut.findPath([8.8, 9.6], stairMid, 20000, 0, 2.1)).toBeNull();
    expect(shut.findPath([8.8, 9.6], [8.8, 16.4], 20000, 0, DECK_Y)).toBeNull();
    expect(shut.findPath([8.8, 16.4], [8.8, 11.4], 20000, DECK_Y, 0.9)).not.toBeNull();
  });

  it('the hoist door is locked, in the west gable at gallery level, 1.6 m wide; the platform is on its far side', () => {
    const door = b.anchors.doors.find((d) => Math.abs(d.hinge.x - THORNBECK_HOIST_DOOR.x) < 1e-6 && Math.abs(d.hinge.y - DECK_Y) < 1e-6)!;
    expect(door).toBeDefined();
    expect(door.locked).toBe(true);
    expect(door.width).toBe(1.6);
    expect(door.hinge.z).toBeCloseTo(15.8, 9);
    expect(door.hinge.z + door.width / 2).toBeCloseTo(THORNBECK_HOIST_DOOR.z, 9);
    // the gap in the wall is the door's: open between z 15.8 and 17.4 at the door's height, solid around it
    expect(solidAt(-0.2, DECK_Y + 1, 16.6)).toBe(false);
    expect(solidAt(-0.2, DECK_Y + 1, 15.6)).toBe(true);
    expect(solidAt(-0.2, DECK_Y + 1, 17.6)).toBe(true);
    expect(solidAt(-0.2, DECK_Y + 2.5, 16.6)).toBe(true); // the head over it
    expect(solidAt(-0.2, DECK_Y - 0.5, 16.6)).toBe(true); // the sill under it
    // the exit zone is the platform's: players on it are in, players in the hall (east of the door) are not
    const zone = exitZone(sector)!;
    expect(inZone(zone, 1.0, DECK_Y, 16.6)).toBe(false);
    expect(inZone(zone, -1.3, DECK_Y, 16.6)).toBe(true);
  });

  it('the ladder L1 stands in the lobby under the deck hatch and tops out on the deck', () => {
    const [l] = b.anchors.ladders;
    expect(b.anchors.ladders).toHaveLength(1);
    expect([l!.base.x, l!.base.z, l!.base.y]).toEqual([31.2, 15.6, 0]);
    expect(l!.top.y).toBe(DECK_Y);
    expect(inRect(THORNBECK_SPACES.lobby, l!.base.x, l!.base.z)).toBe(true);
    // its top lands on solid deck, just north of the hatch
    expect(solidAt(l!.top.x, DECK_Y - 0.1, l!.top.z)).toBe(true);
    expect(solidAt(l!.base.x, DECK_Y - 0.1, l!.base.z)).toBe(false);
    expect(inRect(THORNBECK_SPACES.lobby, l!.base.x, l!.base.z - 0.7)).toBe(true);
  });
});

describe('Thornbeck Mill: floors, camera spaces and hide spots', () => {
  it('boards upstairs, grain and sacking below (quiet): the footstep surface under each path space', () => {
    expect(surfaceAt(b.surfaces, 16, DECK_Y, 16.5, 'concrete')).toBe('wood');
    expect(surfaceAt(b.surfaces, -1.3, DECK_Y, 16.6, 'concrete')).toBe('wood');
    for (const r of Object.values(THORNBECK_SPACES)) expect(surfaceAt(b.surfaces, (r[0] + r[2]) / 2, 0, (r[1] + r[3]) / 2, 'concrete')).toBe('carpet');
    expect(surfaceAt(b.surfaces, 20, 0, 10, 'concrete')).toBe('carpet'); // the sack bay's sacking
    expect(surfaceAt(b.surfaces, 12.5, 0, 12.5, 'concrete')).toBe('concrete'); // the machinery floor: the map default
  });

  it('camera spaces: tight in the start bay, aisle, office, lobby and on the landing; open over the crane bay', () => {
    expect(lay.camSpaces).toEqual([...THORNBECK_CAM_SPACES]);
    const tight = (x: number, y: number, z: number): number => camSpaceAt(lay.camSpaces, lay.camSize, x, y, z);
    expect(tight(4.7, 0, 5)).toBe(0);
    expect(tight(15, 0, 2)).toBe(0);
    expect(tight(29, 0, 9.5)).toBe(0);
    expect(tight(29, 0, 15.5)).toBe(0);
    expect(tight(3, DECK_Y, 16.5)).toBe(0); // the landing
    expect(tight(16, DECK_Y, 16.5)).toBe(1); // over the crane bay
    // the deck over the lobby is not the lobby's tight ground space
    expect(tight(29, DECK_Y, 16.5)).toBeNaN();
  });

  it('a hide spot by every kill stretch: bodies, six in all, each on its storey and clear of the geometry', () => {
    expect(THORNBECK_HIDE_SPOTS).toHaveLength(6);
    expect(lay.hideSpots).toHaveLength(6);
    for (const [what, x, z, y] of THORNBECK_HIDE_SPOTS) {
      expect(clearance(x, z, y), what).toBeGreaterThanOrEqual(0.3);
      const c = nav.nearestWalkable(x, z, 2, y);
      expect(c, what).toBeGreaterThanOrEqual(0);
    }
    expect(lay.debugPoints).toHaveLength(10);
  });
});

describe('(walk ~09:50) the roof reads as a roof', () => {
  it('tie beams under the ceiling above every lamp and the intro camera (7.5 m), drawn only; a chain per lamp', () => {
    const beams = b.boxes.filter((p) => !p.collide && p.c[1] - p.s[1] / 2 >= ROOF_BEAM_Y - 1e-9 && p.c[1] + p.s[1] / 2 <= 9 + 1e-9);
    expect(beams.length).toBeGreaterThanOrEqual(9);
    expect(ROOF_BEAM_Y).toBeGreaterThan(7.5 + 0.5);
    for (const [, , y] of THORNBECK_LAMPS) expect(y).toBeLessThan(ROOF_BEAM_Y);
    const chains = b.cylinders.filter((c) => !c.collide && c.r < 0.015 && Math.abs(c.c[1] + c.h / 2 - 9) < 1e-6);
    expect(chains.length).toBe(THORNBECK_LAMPS.length);
  });
});
