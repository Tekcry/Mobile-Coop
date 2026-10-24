/**
 * (level-validator V6b, docs/level-validator/V6-PLAN.md "Measurement definitions") The greybox measurement core on
 * synthetic LevelBuilder rooms (12 x 8 m inside, x -6..6, z -4..4): the light field baked in node (`nodeLightField`),
 * the runtime nav grid (`tests/helpers/runtimeNav.ts`), the static sight lines (`SightWorld`). Pins each measurement:
 * one lamp lighting half the room -> shadow 0.5; a 2 m wall -> the sees % its plan shadow gives; doors 6 m from the
 * worst floor point -> LOS break 2 s; a 20 m corridor link -> 15.4 s at the split speed. Speeds from metrics.json.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import type { MapDef } from '../src/world/mapDef';
import { SightWorld } from '../src/game/sectorCheck';
import { measureGraph, nodeLightField, type MeasureGraphInput, type MeasureGuard, type MeasureMetrics } from '../src/world/levelMeasure';
import { runtimeNav } from './helpers/runtimeNav';
import metricsJson from '../docs/design/metrics.json';

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

  it('a 20 m corridor link: 15.4 s at the split speed; edge point, off-nav kinds, partner reach', () => {
    const b = new LevelBuilder();
    b.floor(0, 0, 30, 10, '#555');
    // rooms A (x -14.25..-6) and B (6..14.25), a 3.5 m corridor between them (open at both ends); with the grid on
    // these bounds each room's floor-cell centroid is a cell centre, (-10, 0) and (10, 0)
    b.perimeter(-14.25, 14.25, -4.25, 4.25, 3, '#777');
    b.wallZ(-6, -4.25, 4.25, [[-1.75, 1.75]], 3, '#777');
    b.wallZ(6, -4.25, 4.25, [[-1.75, 1.75]], 3, '#777');
    b.wall(-6, -1.9, 6, -1.9, 3, '#777', 0.3);
    b.wall(-6, 1.9, 6, 1.9, 3, '#777', 0.3);
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
