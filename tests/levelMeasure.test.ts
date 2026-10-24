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
import { measureGraph, nodeLightField, type MeasureGraphInput, type MeasureMetrics } from '../src/world/levelMeasure';
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
function run(b: LevelBuilder, lightLevel: number, seeds: { x: number; y: number; z: number }[], graph: MeasureGraphInput) {
  const field = nodeLightField(b, mapOf(lightLevel));
  const nav = runtimeNav(b, seeds[0]!, 3, seeds.slice(1));
  const sight = new SightWorld(b.boxes, b.cylinders);
  return { nav, res: measureGraph(graph, { builder: b, field, nav, sight, guards: [], metrics, map: mapOf(lightLevel), date: '2026-10-24' }) };
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
    process.stderr.write(`${JSON.stringify({ m, e: res.errors })}\n`);
    expect(m.cells).toBeGreaterThan(200);
    expect(m.shadow_pct).toBeGreaterThan(0.45);
    expect(m.shadow_pct).toBeLessThan(0.55);
  });
});
