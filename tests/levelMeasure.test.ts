/**
 * (level-validator V6b, docs/level-validator/V6-PLAN.md "Measurement definitions") The greybox measurement core on
 * synthetic LevelBuilder rooms (12 x 8 m inside, x -6..6, z -4..4): the light field baked in node (`nodeLightField`),
 * the runtime nav grid (`tests/helpers/runtimeNav.ts`), the static sight lines (`SightWorld`). Pins each measurement:
 * one lamp lighting half the room -> shadow 0.5; a 2 m wall -> the sees % its plan shadow gives; doors 6 m from the
 * worst floor point -> LOS break 2 s; a 20 m corridor link -> 15.4 s at the split speed. Speeds from metrics.json.
 * (validator-port S1) The A25 kinds, the campaign way backs (timed and null) and `resolvePoints` (declared, one-gap
 * edge, two-gap null, merged-index links, `geom` and points as `measureGraph`'s).
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import type { MapDef } from '../src/world/mapDef';
import { SightWorld } from '../src/game/sectorCheck';
import { measureGraph, nodeLightField, resolvePoints, type AreaBox, type MeasureGraphInput, type MeasureGuard, type MeasureMetrics } from '../src/world/levelMeasure';
import { hyp2 } from '../src/core/mathx';
import { runtimeNav } from './helpers/runtimeNav';
import metricsJson from '../docs/design/metrics.json';
// @ts-expect-error plain .mjs process script without types
import { mergeGraphs } from '../scripts/level-validate.mjs';

const metrics = metricsJson as unknown as MeasureMetrics;
const R = metrics.rules;

/** A night map: `lightLevel` the ambient everywhere outside the zones, no moon (sunIntensity 0), no detail pass. */
function mapOf(lightLevel: number): Pick<MapDef, 'id' | 'theme' | 'detail'> {
  return {
    id: 'levelMeasureTest',
    detail: false,
    theme: { sky: '#000', horizon: '#000', ground: '#000', fogStart: 50, fogEnd: 100, sunDir: [0.3, -1, 0.2], sunIntensity: 0, ambient: 0.2, lightLevel },
  };
}

const ROOM: [number, number, number, number] = [-6, -4, 6, 4];

/** Build, bake, nav, sight and measure. */
function run(b: LevelBuilder, lightLevel: number, seeds: { x: number; y: number; z: number }[], graph: MeasureGraphInput, guards: MeasureGuard[] = []) {
  const field = nodeLightField(b, mapOf(lightLevel));
  const nav = runtimeNav(b, seeds[0]!, 3, seeds.slice(1));
  const sight = new SightWorld(b.boxes, b.cylinders);
  return { nav, res: measureGraph(graph, { builder: b, field, nav, sight, guards, metrics, map: mapOf(lightLevel), date: '2026-10-24' }) };
}

/** Walkable nav cells inside a box at the floor (the test's own count, independent of the module). */
function floorCells(nav: ReturnType<typeof runtimeNav>, box: readonly number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < nav.walk.length; i++) {
    if (!nav.walk[i] || Math.abs(nav.height[i]!) > 1) continue;
    const [x, z] = nav.center(i);
    if (x >= box[0]! && x <= box[2]! && z >= box[1]! && z <= box[3]!) out.push([x, z]);
  }
  return out;
}

describe('levelMeasure (V6b)', () => {
  it('one lamp over half the room: shadow 0.5', () => {
    const b = new LevelBuilder();
    b.floor(0, 0, 14, 10, '#555');
    b.perimeter(-6, 6, -4, 4, 3, '#777');
    // a full-height partition down the middle: the lamp's half lit, the other dark
    b.wall(0, -4, 0, 4, 3, '#777', 0.3);
    b.light({ x: 3, y: 2.6, z: 0, radius: 10, intensity: 1 });
    const graph: MeasureGraphInput = { meta: { map: 'levelMeasureTest' }, spaces: [{ id: 'room', type: 'encounter', storey: 0, area: [ROOM] }], links: [] };
    const { res } = run(b, 0.1, [{ x: 3, y: 0, z: 0 }, { x: -3, y: 0, z: 0 }], graph);
    const m = res.spaces.room!;
    expect(m.cells).toBeGreaterThan(200);
    expect(m.shadow_pct).toBeGreaterThan(0.45);
    expect(m.shadow_pct).toBeLessThan(0.55);
  });

  it('a 2 m wall: sees % = the floor outside its plan shadow from the vantage', () => {
    const b = new LevelBuilder();
    b.floor(0, 0, 14, 10, '#555');
    b.perimeter(-6, 6, -4, 4, 3, '#777');
    // a free-standing 2 m wall x 0.85..1.15, z -2..2 (higher than the eye 1.55 and the 1.0 target: a plan shadow)
    b.wall(1, -2, 1, 2, 2, '#777', 0.3);
    const V: [number, number, number] = [-5, 0, 0];
    const graph: MeasureGraphInput = {
      meta: { map: 'levelMeasureTest' },
      spaces: [
        { id: 'room', type: 'encounter', storey: 0, area: [ROOM], vantage: { from: 'room', at: V } },
        { id: 'auto', type: 'encounter', storey: 0, area: [ROOM], vantage: { from: 'room' } },
        // no vantage: a guard posted at the vantage point is the one observer, so the LOS break is the same
        { id: 'guarded', type: 'encounter', storey: 0, area: [ROOM] },
      ],
      links: [],
    };
    const { nav, res } = run(b, 0.75, [{ x: -3, y: 0, z: 0 }], graph, [{ x: V[0], z: V[2] }]);
    const m = res.spaces.room!;
    // the plan shadow: a cell is hidden when the segment vantage -> cell crosses the wall's footprint
    const cells = floorCells(nav, ROOM);
    const hidden = cells.filter(([x, z]) => segHitsRect(V[0], V[2], x, z, 0.85, -2, 1.15, 2)).length;
    const want = 1 - hidden / cells.length;
    // 'auto' sees the room the wall hides from the guard's post: every cell exposed, no break cell -> null and an ERR
    expect(res.errors).toEqual(['ERR auto: an exposed floor cell has no break cell it can reach within 6 m of the area']);
    expect(res.spaces.auto!.los_break_s).toBeNull();
    expect(m.cells).toBe(cells.length);
    expect(m.vantage_at).toEqual(V);
    expect(m.sees_pct).toBeCloseTo(want, 6);
    expect(want).toBeGreaterThan(0.6);
    expect(want).toBeLessThan(0.75);
    // no vantage.at: the best 1 m stride cell of the from space, written to measured.vantage_at
    expect(res.spaces.auto!.sees_pct!).toBeGreaterThan(m.sees_pct!);
    expect(res.spaces.auto!.vantage_at).not.toBeNull();
    // the guard's post is in the area: it observes the room as the vantage eye does
    expect(res.spaces.guarded!.sees_pct).toBeNull();
    expect(res.spaces.guarded!.los_break_s).toBeCloseTo(m.los_break_s!, 6);
  });

  /** The room lit (an ambient zone), the yard round it dark: every floor cell is exposed, the openings lead to dark. */
  function losRoom(doors: 'open-ends' | 'long-walls'): LevelBuilder {
    const b = new LevelBuilder();
    b.floor(0, 0, 20, 16, '#555');
    b.bounds = { minX: -10, maxX: 10, minZ: -8, maxZ: 8 };
    // walls with inner faces on the 12 x 8 box
    const gap: [number, number][] = doors === 'long-walls' ? [[-0.6, 0.6]] : [];
    b.wallX(4.15, -6, 6, gap, 3, '#777');
    b.wallX(-4.15, -6, 6, gap, 3, '#777');
    if (doors === 'long-walls') {
      b.wallZ(-6.15, -4.3, 4.3, [], 3, '#777');
      b.wallZ(6.15, -4.3, 4.3, [], 3, '#777');
      b.door(-0.6, 0, 4.15, 1.2, Math.PI / 2);
      b.door(-0.6, 0, -4.15, 1.2, Math.PI / 2);
    }
    b.ambientZone(-6, 6, -4, 4, 0.8);
    return b;
  }
  const losGraph: MeasureGraphInput = {
    meta: { map: 'levelMeasureTest' },
    spaces: [{ id: 'room', type: 'encounter', storey: 0, area: [ROOM], vantage: { from: 'room', at: [-5, 0, 0] } }],
    links: [],
  };

  it('doorways 6 m from the worst floor point: LOS break 2 s', () => {
    // both short ends open onto the dark: the worst cells are mid-room, 12 cells (6 m) from the first dark cell
    // (a single 1.2 m door in a wall cannot be within 6 m of every point of a 12 x 8 room)
    const { res } = run(losRoom('open-ends'), 0.05, [{ x: 0, y: 0, z: 0 }], losGraph);
    const m = res.spaces.room!;
    expect(res.errors).toEqual([]);
    expect(m.shadow_pct).toBe(0);
    expect(m.sees_pct).toBe(1);
    expect(m.los_break_s!).toBeCloseTo(6 / R.reach_speed_mps, 3);
    expect(Math.abs(m.los_break_s! - 2)).toBeLessThan(0.2);
  });

  it('1.2 m doors mid long walls: LOS break from the mid short wall, round the jamb', () => {
    // worst cell (-5.25, 0.25): 6 diagonal + 4 straight cells to the doorway's foot (-0.25, 3.25), 2 through it
    const { res } = run(losRoom('long-walls'), 0.05, [{ x: 0, y: 0, z: 0 }], losGraph);
    const m = res.spaces.room!;
    expect(res.errors).toEqual([]);
    expect(m.los_break_s!).toBeCloseTo(((6 * Math.SQRT2 + 6) * 0.5) / R.reach_speed_mps, 3);
  });

  it('a 20 m corridor link: 15.4 s at the split speed; edge point, off-nav kinds, unlinked drop / ladder, partner reach', () => {
    const b = corridorLevel();
    const graph: MeasureGraphInput = {
      meta: { map: 'levelMeasureTest' },
      spaces: [
        { id: 'a', storey: 0, area: [[-14.25, -4.25, -6, 4.25]], tags: ['split:x:a'] },
        { id: 'hall', storey: 0, area: [[-6, -1.75, 6, 1.75]], tags: ['split:x:a'] },
        { id: 'b', storey: 0, area: [[6, -4.25, 14.25, 4.25]], tags: ['split:x:b'] },
        // the fork and the rejoin: no area (their links fall back to the declared length / split speed)
        { id: 'f', storey: 0 },
        { id: 'r', storey: 0 },
      ],
      links: [
        { from: 'a', to: 'b', kind: 'corridor', at: [0, 0, 0] },
        { from: 'a', to: 'hall', kind: 'opening', length: 50 },
        { from: 'a', to: 'b', kind: 'duct' },
        { from: 'f', to: 'a', kind: 'door', length: 13 },
        { from: 'f', to: 'b', kind: 'door', length: 13 },
        { from: 'hall', to: 'r', kind: 'door', length: 13 },
        { from: 'b', to: 'r', kind: 'door', length: 13 },
        // a drop / ladder whose nav path takes no link of its kind is a walk round, not its time
        { from: 'a', to: 'b', kind: 'drop', at: [0, 0, 0] },
        { from: 'a', to: 'b', kind: 'ladder', at: [0, 0, 0] },
        // (validator-port S1, A25) a new move off the nav; a vent unlock measured as a door; two new co-op kinds with
        // a fast declared time into the legs that the leg times must skip (a split leg is walked alone)
        { from: 'a', to: 'b', kind: 'plank_bridge' },
        { from: 'a', to: 'b', kind: 'vent_unlock', at: [0, 0, 0] },
        { from: 'f', to: 'a', kind: 'swing_pass', time_s: 1 },
        { from: 'f', to: 'b', kind: 'drop_catch', time_s: 1 },
      ],
    };
    const { res } = run(b, 0.75, [{ x: 0, y: 0, z: 0 }], graph);
    expect(res.errors).toEqual([]);
    const l0 = res.links[0]!;
    expect(l0).toMatchObject({ path_m: 20 });
    expect(l0.time_s!).toBeCloseTo(20 / R.split_speed_mps, 6);
    expect(Math.abs(l0.time_s! - 15.4)).toBeLessThan(0.5);
    // no `at`: the shared edge of the two areas (one gap, x -6) on the straight line between the centres
    expect(res.links[1]).toMatchObject({ path_m: 10 });
    expect(res.links[2]).toMatchObject({ time_s: null });
    // reach: A's far corner (-13.5, +-3.5) to B's nearest cell (6, +-1), in its doorway: 39 cells along x, 5 of them diagonal
    expect(res.meta.splits.x!.reach_s!).toBeCloseTo(((34 + 5 * Math.SQRT2) * 0.5) / R.reach_speed_mps, 3);
    expect(res.meta).toMatchObject({ tool: 'level-measure 1', date: '2026-10-24' });
    // leg times as the validator composes them (fork f, rejoin r), the measured a -> hall (10 m) before its declared 50 m
    const s = R.split_speed_mps;
    expect(res.meta.splits.x!.a_s!).toBeCloseTo(13 / s + 10 / s + 13 / s, 6);
    expect(res.meta.splits.x!.b_s!).toBeCloseTo(26 / s, 6);
    expect(res.links[3]).toMatchObject({ time_s: null, why: 'no area / floor cells on f' });
    expect(res.links[7]).toEqual({ time_s: null, why: 'drop not on the guard nav (1.0-2.2 m only)' });
    expect(res.links[8]).toEqual({ time_s: null, why: 'ladder not on the guard nav (no ladder link on its path)' });
    expect(res.links[9]).toEqual({ time_s: null, why: 'plank_bridge is not on the nav grid (walks, ladders and drops only)' });
    expect(res.links[10]).toMatchObject({ path_m: 20 });
    // no mode: no way backs
    expect(res.meta.ways_back).toBeUndefined();
  });
});

/** Rooms A (x -14.25..-6) and B (6..14.25), a 3.5 m corridor between them (open at both ends); with the grid on these
 *  bounds each room's floor-cell centroid is a cell centre, (-10, 0) and (10, 0). */
function corridorLevel(): LevelBuilder {
  const b = new LevelBuilder();
  b.floor(0, 0, 30, 10, '#555');
  b.perimeter(-14.25, 14.25, -4.25, 4.25, 3, '#777');
  b.wallZ(-6, -4.25, 4.25, [[-1.75, 1.75]], 3, '#777');
  b.wallZ(6, -4.25, 4.25, [[-1.75, 1.75]], 3, '#777');
  b.wall(-6, -1.9, 6, -1.9, 3, '#777', 0.3);
  b.wall(-6, 1.9, 6, 1.9, 3, '#777', 0.3);
  return b;
}
const A_BOX: AreaBox = [-14.25, -4.25, -6, 4.25];
const HALL_BOX: AreaBox = [-6, -1.75, 6, 1.75];
const B_BOX: AreaBox = [6, -4.25, 14.25, 4.25];

/** West (x -6..0) and east (0..7) joined by a partition at x 0 with two 1.6 m doorways; a sealed room (7..14) east of a
 *  full wall at x 7, on the nav (seeded) but with no way in or out. */
function twoGapLevel(): LevelBuilder {
  const b = new LevelBuilder();
  b.floor(4, 0, 22, 10, '#555');
  b.perimeter(-6, 14, -4, 4, 3, '#777');
  b.wallZ(0, -4, 4, [[-3.4, -1.8], [1.8, 3.4]], 3, '#777');
  b.wallZ(7, -4, 4, [], 3, '#777');
  return b;
}
const TWO_GAP_SEEDS = [{ x: -3, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }];

describe('levelMeasure way backs and resolvePoints (validator-port S1)', () => {
  it('campaign way back: worst to-cell back to the from floor at the reach speed; null with no area; none off campaign', () => {
    const b = corridorLevel();
    const graph: MeasureGraphInput = {
      meta: { map: 'levelMeasureTest', mode: 'campaign' },
      spaces: [
        { id: 'a', storey: 0, area: [A_BOX] },
        { id: 'hall', storey: 0, area: [HALL_BOX] },
        { id: 'b', storey: 0, area: [B_BOX] },
        { id: 'ghost', storey: 0 },
      ],
      links: [
        { from: 'a', to: 'b', kind: 'coop_boost' },
        { from: 'a', to: 'hall', kind: 'opening' },
        { from: 'a', to: 'ghost', kind: 'team_hang' },
      ],
    };
    const { res } = run(b, 0.75, [{ x: 0, y: 0, z: 0 }], graph);
    const wb = res.meta.ways_back!;
    // one per co-op link, graph order (the opening is not one)
    expect(wb.map((w) => w.kind)).toEqual(['coop_boost', 'team_hang']);
    // B's far corner (13.5, +-3.5) back to A's nearest cell (-6, +-1), in its doorway: 39 cells along x, 5 of them
    // diagonal (the corridor test's partner reach, mirrored)
    const w0 = wb[0]!;
    expect(w0).toMatchObject({ from: 'a', to: 'b' });
    if (w0.back_s === null) throw new Error(w0.why);
    expect(w0.path_m).toBeCloseTo((34 + 5 * Math.SQRT2) * 0.5, 3);
    expect(w0.back_s).toBeCloseTo(w0.path_m / R.reach_speed_mps, 6);
    expect(wb[1]).toEqual({ from: 'a', to: 'ghost', kind: 'team_hang', back_s: null, why: 'no area / floor cells on ghost' });
    // the same graph as Sector Ops: no way backs
    const sector = run(b, 0.75, [{ x: 0, y: 0, z: 0 }], { ...graph, meta: { map: 'levelMeasureTest', mode: 'sector' } });
    expect(sector.res.meta.ways_back).toBeUndefined();
  });

  it('campaign way back with no nav path: null and why (a sealed room)', () => {
    const graph: MeasureGraphInput = {
      meta: { map: 'levelMeasureTest', mode: 'campaign' },
      spaces: [
        { id: 'west', storey: 0, area: [[-6, -4, 0, 4]] },
        { id: 'sealed', storey: 0, area: [[7, -4, 14, 4]] },
      ],
      links: [{ from: 'west', to: 'sealed', kind: 'coop_boost' }],
    };
    const { res } = run(twoGapLevel(), 0.75, TWO_GAP_SEEDS, graph);
    expect(res.meta.ways_back).toEqual([{ from: 'west', to: 'sealed', kind: 'coop_boost', back_s: null, why: 'no nav path from every sealed floor cell to west (a drop, ladder or move off the nav)' }]);
  });

  it('resolvePoints: a declared at, a one-gap edge point, no area; floors; geom and points as measureGraph', () => {
    const b = corridorLevel();
    const graph: MeasureGraphInput = {
      meta: { map: 'levelMeasureTest' },
      spaces: [
        { id: 'a', section: 's1', storey: 0, area: [A_BOX] },
        { id: 'hall', section: 's1', storey: 0, area: [HALL_BOX] },
        { id: 'b', section: 's1', storey: 0, area: [B_BOX] },
        { id: 'f', storey: 0 },
      ],
      links: [
        { from: 'a', to: 'b', kind: 'corridor', at: [0, 0, 0], route: 'spine', measured: { time_s: 9, path_m: 12 } },
        { from: 'a', to: 'hall', kind: 'opening' },
        { from: 'f', to: 'a', kind: 'door', length: 13 },
        { from: 'a', to: 'hall', kind: 'coop_boost' },
      ],
    };
    const { nav, res } = run(b, 0.75, [{ x: 0, y: 0, z: 0 }], graph);
    const pts = resolvePoints(graph, nav, { builder: b, map: mapOf(0.75) });
    expect(pts.errors).toEqual([]);
    expect(pts.geom).toBe(res.meta.geom);
    expect(pts.spaces.map((s) => s.id)).toEqual(['a', 'hall', 'b', 'f']);
    expect(pts.links).toHaveLength(4);
    // declared: as written, not searched; the stored measured and the route pass through
    expect(pts.links[0]).toEqual({ from: 'a', to: 'b', kind: 'corridor', route: 'spine', at: [0, 0, 0], atFrom: 'declared', gaps: null, measured: { time_s: 9, path_m: 12 } });
    // one gap on A's doorway (x -6): on the straight line between the centres, as measureGraph walks it
    const l1 = pts.links[1]!;
    expect(l1).toMatchObject({ atFrom: 'edge', gaps: 1, route: null, measured: null });
    const at = l1.at!;
    expect(Math.abs(at[0] + 6)).toBeLessThanOrEqual(nav.cell);
    expect(at[1]).toBeCloseTo(0, 1);
    expect(at[2]).toBeCloseTo(0, 6);
    const ca = pts.spaces[0]!.centre!;
    const ch = pts.spaces[1]!.centre!;
    expect(ca[0]).toBeCloseTo(-10, 6);
    expect(ca[2]).toBeCloseTo(0, 6);
    expect(res.links[1]).toMatchObject({ path_m: hyp2(at[0] - ca[0], at[2] - ca[2]) + hyp2(ch[0] - at[0], ch[2] - at[2]) });
    // no area on f: no point, no edge searched; an off-nav kind still gets its point (route-runs walk every link)
    expect(pts.links[2]).toMatchObject({ at: null, atFrom: 'none', gaps: 0 });
    expect(pts.links[3]).toMatchObject({ at, atFrom: 'edge', gaps: 1 });
    // floors: boxes, cell count as measureGraph's, floor height
    const a = pts.spaces[0]!;
    expect(a).toMatchObject({ id: 'a', section: 's1', storey: 0, boxes: [A_BOX], cells: res.spaces.a!.cells });
    expect(Math.abs(a.floorY!)).toBeLessThan(0.5);
    expect(pts.spaces[3]).toEqual({ id: 'f', section: null, storey: 0, floorY: null, boxes: null, centre: null, cells: 0 });
  });

  it('a two-gap shared edge: no point (resolvePoints) and no time (measureGraph), an ERR from both', () => {
    const b = twoGapLevel();
    const graph: MeasureGraphInput = {
      meta: { map: 'levelMeasureTest' },
      spaces: [
        { id: 'west', storey: 0, area: [[-6, -4, 0, 4]] },
        { id: 'east', storey: 0, area: [[0, -4, 7, 4]] },
        { id: 'sealed', storey: 0, area: [[7, -4, 14, 4]] },
      ],
      links: [
        { from: 'west', to: 'east', kind: 'opening' },
        { from: 'east', to: 'sealed', kind: 'door' },
      ],
    };
    const { nav, res } = run(b, 0.75, TWO_GAP_SEEDS, graph);
    const err = "ERR link 0 west -> east (opening): the shared edge has 2 gaps; set the link's at";
    const pts = resolvePoints(graph, nav, { builder: b, map: mapOf(0.75) });
    expect(pts.links[0]).toMatchObject({ at: null, atFrom: 'none', gaps: 2 });
    // a full wall: no gap
    expect(pts.links[1]).toMatchObject({ at: null, atFrom: 'none', gaps: 0 });
    expect(pts.errors).toEqual([err]);
    expect(res.links[0]).toEqual({ time_s: null, why: 'the shared edge of west and east has 2 gaps (set at)' });
    expect(res.links[1]).toEqual({ time_s: null, why: 'no walkable cell on the shared edge of east and sealed (set at)' });
    expect(res.errors).toEqual([err]);
  });

  it('a link between two section files resolves on the merged graph, keyed by merged index', () => {
    const b = corridorLevel();
    const s1 = {
      meta: { map: 'levelMeasureTest', sections: ['s1'] },
      spaces: [{ id: 'f', section: 's1', storey: 0 }, { id: 'a', section: 's1', storey: 0, area: [A_BOX] }],
      links: [{ from: 'f', to: 'a', kind: 'door', length: 13 }],
    };
    const s2 = {
      meta: { map: 'levelMeasureTest', sections: ['s2'] },
      spaces: [{ id: 'hall', section: 's2', storey: 0, area: [HALL_BOX] }],
      links: [{ from: 'a', to: 'hall', kind: 'opening', route: 'spine' }],
    };
    const nav = runtimeNav(b, { x: 0, z: 0 }, 3, []);
    const opts = { builder: b, map: mapOf(0.75) };
    // the second file alone: `a` is in the other file, so no point
    const alone = resolvePoints(s2 as MeasureGraphInput, nav, opts);
    expect(alone.links[0]).toMatchObject({ at: null, atFrom: 'none', gaps: 0 });
    // merged (the validator's mergeGraphs, file order): the link is index 1 and finds A's doorway
    const merged = mergeGraphs([s1, s2]) as MeasureGraphInput;
    const pts = resolvePoints(merged, nav, opts);
    expect(pts.links.map((l) => `${l.from}>${l.to}`)).toEqual(['f>a', 'a>hall']);
    expect(pts.links[1]).toMatchObject({ atFrom: 'edge', gaps: 1, route: 'spine' });
    expect(Math.abs(pts.links[1]!.at![0] + 6)).toBeLessThanOrEqual(nav.cell);
    expect(pts.spaces.map((s) => s.section)).toEqual(['s1', 's1', 's2']);
  });
});

/** Does the plan segment (ax, az) -> (bx, bz) cross the rectangle [x0, x1] x [z0, z1] (slab test)? */
function segHitsRect(ax: number, az: number, bx: number, bz: number, x0: number, z0: number, x1: number, z1: number): boolean {
  let t0 = 0;
  let t1 = 1;
  for (const [p, d, lo, hi] of [[ax, bx - ax, x0, x1], [az, bz - az, z0, z1]] as const) {
    if (Math.abs(d) < 1e-12) {
      if (p < lo || p > hi) return false;
      continue;
    }
    let ta = (lo - p) / d;
    let tb = (hi - p) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}
