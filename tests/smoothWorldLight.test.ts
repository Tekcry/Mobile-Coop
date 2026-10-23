/**
 * Smooth world light parity (smooth-world scope 3): the gameplay light bake is the same on every smooth path (Epic, Low,
 * `?gfx=min`). Each map is prepared each way through `LevelBuilder.prepare` - the Babylon-free part of
 * `build` that `World.create` runs (the dressing pass, the canonical light shapes) - and the light
 * shapes, their bounds and hash, and the light registry must match. Marlow Yard (ctcourse) is then baked in node twice, once
 * from each path's builder, as `World.create` + `bakeLevelLight` do: the bake hashes match, and the `LightField` built
 * from each path's own bake, registry and doors reads the same
 * level at lit, mid, dark and roofed points. Also: the smooth path's rain roof grid (`roofGrid`) stops rain under the
 * station 5 back room's roof and lets it fall in the open yard.
 * (marlow-final 0d) Marlow Yard is the indoor rehearsal centre: a hall roof over every set, a lid over every holding room,
 * no moon; the sets' standby zones (0.14) are the darkest reading, and the rain roof covers every set and holding room.
 * The points are the facility's (holding rooms, the dock) and each set box's middle, so the set slices never edit this file.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder, type LevelBuildOptions } from '../src/world/levelBuilder';
import { ctcourse } from '../src/world/maps/ctcourse';
import { EXIT_ZONE, HALL_H, HOLD_BOX, HOLD_H, HOLD_IDS, SET_BOX, SET_IDS } from '../src/world/maps/ctcourseSets/types';
import { MARLOW_LEVEL } from '../src/world/lighting/levels';
import { warehouse } from '../src/world/maps/warehouse';
import type { MapDef } from '../src/world/mapDef';
import { dressingOn } from '../src/world/detailPass';
import { bakeLamps } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { bakedLights, lightBakeHash, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField, type FieldDoor } from '../src/world/lightField';
import { moonLight } from '../src/world/lampMath';
import { LIGHT } from '../src/world/lights';
import { roofAt, roofGrid } from '../src/world/roofGrid';

type Mode = 'smooth' | 'smoothLow' | 'cheap';

/** The options `World.create` passes for each path (`GameState.create`: Epic, a Low
 *  match, and `?gfx=min` - no dressing). */
function opts(map: MapDef, mode: Mode): LevelBuildOptions {
  const base: LevelBuildOptions = { floor: map.theme.floor ?? 'concrete', dressing: dressingOn(map) };
  if (mode === 'smooth') return { ...base, detail: 'epic' };
  if (mode === 'smoothLow') return { ...base, detail: 'low' };
  return base;
}

function prepared(map: MapDef, mode: Mode): { b: LevelBuilder; light: ReturnType<LevelBuilder['prepare']>['light'] } {
  const b = new LevelBuilder();
  map.build(b, 0);
  const r = b.prepare(map.id, opts(map, mode));
  return { b, light: r.light };
}

const MODES: Mode[] = ['smooth', 'smoothLow', 'cheap'];

describe('smooth world: the light shapes are the same on every path', () => {
  for (const map of [ctcourse, warehouse]) {
    it(`${map.id}: shapes, bounds, hash and lights match on every path`, () => {
      const ref = prepared(map, 'smooth');
      for (const mode of MODES) {
        const p = prepared(map, mode);
        expect(p.light.hash, `${map.id} ${mode} hash`).toBe(ref.light.hash);
        expect(p.light.lo, `${map.id} ${mode} lo`).toEqual(ref.light.lo);
        expect(p.light.hi, `${map.id} ${mode} hi`).toEqual(ref.light.hi);
        expect(Array.from(p.light.shapes), `${map.id} ${mode} shapes`).toEqual(Array.from(ref.light.shapes));
        expect(JSON.stringify(p.b.lights.lights), `${map.id} ${mode} lights`).toBe(JSON.stringify(ref.b.lights.lights));
        expect(JSON.stringify(p.b.lights.zones), `${map.id} ${mode} zones`).toBe(JSON.stringify(ref.b.lights.zones));
      }
    });
  }
});

describe('smooth world: Marlow Yard light field, Epic vs Low smooth', () => {
  const on = prepared(ctcourse, 'smooth');
  const off = prepared(ctcourse, 'smoothLow');
  const fields: Record<'on' | 'off', { open: LightField; shut: LightField }> = {} as never;

  /** The bake as `World.create` + `bakeLevelLight` make it, from one prepared builder's own shapes and registry. */
  const bakeFrom = (p: typeof on): LightBake => {
    const set = p.light;
    const reg = p.b.lights;
    reg.ambient = ctcourse.theme.lightLevel ?? 0.75;
    const mL = moonLight(ctcourse.theme);
    const sky = Math.max(0, reg.ambient - mL);
    const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, set.lo, set.hi);
    const s = ctcourse.theme.sunDir;
    const l = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
    const dir: [number, number, number] = [-s[0] / l, -s[1] / l, -s[2] / l];
    const n = [0, 1, 2].map((k) => Math.max(1, Math.ceil((set.hi[k]! - set.lo[k]!) / MOON_CELL))) as [number, number, number];
    const m = bakeMoon({ kind: 'moon', id: 0, origin: set.lo, n, shapes: set.shapes, dir });
    const baked = bakedLights(reg);
    const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
    return { lo: set.lo, hi: set.hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: { origin: set.lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: mL, ms: 0 };
  };
  const bakes: Record<'on' | 'off', LightBake> = {} as never;

  beforeAll(() => {
    // (fix round) two bakes, one per path, each from its own builder: the fields below read different bake objects
    for (const [k, p] of [['on', on], ['off', off]] as const) {
      const bake = (bakes[k] = bakeFrom(p));
      const doors = (o: number): FieldDoor[] => p.b.anchors.doors.map((anchor) => ({ anchor, open: o }));
      fields[k] = { open: new LightField(bake, p.b.lights, doors(1)), shut: new LightField(bake, p.b.lights, doors(0)) };
    }
  }, 120_000);

  it('the two bakes (Epic, Low) are byte-identical (lamps, moon, ambient grid)', () => {
    expect(bakes.on === bakes.off).toBe(false);
    expect(lightBakeHash(bakes.off)).toBe(lightBakeHash(bakes.on));
    expect(bakes.off.lamps!.baked.ids).toEqual(bakes.on.lamps!.baked.ids);
  });

  const mid = (b: readonly number[]): [number, number] => [(b[0]! + b[2]!) / 2, (b[1]! + b[3]!) / 2];
  /** Named points: feet / surface positions read as a standing body or a surface level. */
  const POINTS: { name: string; x: number; y: number; z: number; body: boolean; shut?: boolean }[] = [
    { name: 'dock exit zone', x: mid(EXIT_ZONE)[0], y: 0, z: mid(EXIT_ZONE)[1], body: true },
    ...HOLD_IDS.map((h) => ({ name: `${h} centre, doors shut`, x: mid(HOLD_BOX[h])[0], y: 0, z: mid(HOLD_BOX[h])[1], body: true, shut: true })),
    ...HOLD_IDS.map((h) => ({ name: `${h} corner`, x: HOLD_BOX[h][0] + 0.6, y: 0, z: HOLD_BOX[h][1] + 0.6, body: true })),
    ...SET_IDS.map((id) => ({ name: `${id} middle`, x: mid(SET_BOX[id][SET_BOX[id].length - 1]!)[0], y: 0, z: mid(SET_BOX[id][SET_BOX[id].length - 1]!)[1], body: true })),
    ...SET_IDS.map((id) => ({ name: `${id} corner`, x: SET_BOX[id][0]![0] + 0.6, y: 0, z: SET_BOX[id][0]![1] + 0.6, body: true })),
    { name: 'L4 floor (under the bridge)', x: 73, y: 0.05, z: 33, body: false },
  ];
  const read = (f: { open: LightField; shut: LightField }, p: (typeof POINTS)[number]): number => {
    const lf = p.shut ? f.shut : f.open;
    return p.body ? lf.bodyLevel(p.x, p.y, p.z, 1.7) : lf.levelAt(p.x, p.y, p.z);
  };

  /** The sweep's readings (Low) (the coverage check below). */
  const sweep: number[] = [];

  it('the light field reads the same level at every point', () => {
    for (const p of POINTS) expect(read(fields.off, p), p.name).toBe(read(fields.on, p));
    // a sweep over the course, three heights, doors open and shut
    for (let x = 0.3; x < 160; x += 1.3) {
      for (let z = 0.3; z < 78; z += 1.7) {
        for (const y of [0.05, 0.9, 1.6]) {
          const v = fields.off.open.levelAt(x, y, z);
          sweep.push(v);
          expect(v, `${x}, ${y}, ${z}`).toBe(fields.on.open.levelAt(x, y, z));
          expect(fields.off.shut.levelAt(x, y, z), `${x}, ${y}, ${z} shut`).toBe(fields.on.shut.levelAt(x, y, z));
        }
      }
    }
  });

  it('the samples cover lit and mid readings down to the course darkest (the sets 0.14 standby), and a roofed holding room', () => {
    expect(sweep.length).toBeGreaterThan(1000);
    expect(sweep.some((v) => v >= LIGHT.lit), 'lit').toBe(true);
    expect(sweep.some((v) => v >= LIGHT.shadow && v < LIGHT.lit), 'mid').toBe(true);
    // (marlow-final 0d) nothing reads under a set's standby fill (0.14: the floor of `visibilityFromLight`)
    expect(Math.min(...sweep), 'darkest').toBeGreaterThanOrEqual(MARLOW_LEVEL.standby - 0.01);
    // a holding room is under its lid (the rain grid below agrees)
    const g = roofGrid(off.light.shapes, off.light.lo, off.light.hi);
    expect(roofAt(g, 73, 10)).toBeGreaterThan(2.2);
  });

  it('the smooth path rain roof: a roof over every set (the hall roofs) and every holding room (its lid)', () => {
    const g = roofGrid(off.light.shapes, off.light.lo, off.light.hi);
    for (const id of SET_IDS) for (const b of SET_BOX[id]) if (b[1] !== 19.6) expect(roofAt(g, mid(b)[0], mid(b)[1]), id).toBeGreaterThan(HALL_H);
    for (const h of HOLD_IDS) expect(roofAt(g, mid(HOLD_BOX[h])[0], mid(HOLD_BOX[h])[1]), h).toBeGreaterThan(HOLD_H);
    // outside the grid: open
    expect(roofAt(g, -1e4, -1e4)).toBe(-1e9);
  });
});
