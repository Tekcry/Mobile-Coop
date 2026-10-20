/**
 * Smooth world light parity (smooth-world scope 3): the gameplay light bake is the same with voxels on (`?voxels=1`)
 * or off (the smooth default). Each map is prepared both ways through `LevelBuilder.prepare` - the Babylon-free part of
 * `build` that `World.create` runs (the dressing pass, the voxel split, the canonical light shapes) - and the light
 * shapes, their bounds and hash, and the light registry must match. Marlow Yard (ctcourse) is then baked in node twice, once
 * from each path's builder, as `World.create` + `bakeLevelLight` do: the bake hashes match, and the `LightField` built
 * from each path's own bake, registry and doors reads the same
 * level at lit, mid, dark and roofed points. Also: the smooth path's rain roof grid (`roofGrid`) stops rain under the
 * station 5 back room's roof and lets it fall in the open yard.
 * (marlow-bunker) Marlow Yard is underground now: a ceiling over every cell, no moon, the open floor held at 0.30 by the
 * fill (Michael), so its darkest reading is that floor (no dark band) and the rain roof covers every cell.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder, type LevelBuildOptions } from '../src/world/levelBuilder';
import { bayX, ctcourse, CT_BAY, CT_CEIL } from '../src/world/maps/ctcourse';
import { warehouse } from '../src/world/maps/warehouse';
import type { MapDef } from '../src/world/mapDef';
import { dressingOn } from '../src/world/detailPass';
import { VOXEL_TIER } from '../src/core/quality';
import { bakeLamps } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { bakedLights, lightBakeHash, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField, type FieldDoor } from '../src/world/lightField';
import { moonLight } from '../src/world/lampMath';
import { LIGHT } from '../src/world/lights';
import { roofAt, roofGrid } from '../src/world/roofGrid';

type Mode = 'voxels' | 'smooth' | 'smoothLow' | 'cheap';

/** The options `World.create` passes for each path (`GameState.create`: Epic with and without `?voxels=1`, a Low
 *  smooth match, and `?gfx=min` - no dressing, no voxels). */
function opts(map: MapDef, mode: Mode): LevelBuildOptions {
  const t = VOXEL_TIER.epic;
  const base: LevelBuildOptions = { floor: map.theme.floor ?? 'concrete', dressing: dressingOn(map), art: map.art ?? null };
  if (mode === 'voxels') return { ...base, detail: 'epic', voxelSize: t.size, fineSize: t.fine };
  if (mode === 'smooth') return { ...base, detail: 'epic' };
  if (mode === 'smoothLow') return { ...base, detail: 'low' };
  return base;
}

function prepared(map: MapDef, mode: Mode): { b: LevelBuilder; light: ReturnType<LevelBuilder['prepare']>['light']; voxels: boolean } {
  const b = new LevelBuilder();
  map.build(b, 0);
  const r = b.prepare(map.id, opts(map, mode));
  return { b, light: r.light, voxels: !!r.voxels };
}

const MODES: Mode[] = ['voxels', 'smooth', 'smoothLow', 'cheap'];

describe('smooth world: the light shapes are the same with voxels on or off', () => {
  for (const map of [ctcourse, warehouse]) {
    it(`${map.id}: shapes, bounds, hash and lights match on every path`, () => {
      const ref = prepared(map, 'voxels');
      expect(ref.voxels).toBe(true);
      for (const mode of MODES) {
        const p = prepared(map, mode);
        expect(p.voxels, `${map.id} ${mode} voxels`).toBe(mode === 'voxels');
        expect(p.light.hash, `${map.id} ${mode} hash`).toBe(ref.light.hash);
        expect(p.light.lo, `${map.id} ${mode} lo`).toEqual(ref.light.lo);
        expect(p.light.hi, `${map.id} ${mode} hi`).toEqual(ref.light.hi);
        expect(Array.from(p.light.shapes), `${map.id} ${mode} shapes`).toEqual(Array.from(ref.light.shapes));
        expect(JSON.stringify(p.b.lights.lights), `${map.id} ${mode} lights`).toBe(JSON.stringify(ref.b.lights.lights));
        expect(JSON.stringify(p.b.lights.zones), `${map.id} ${mode} zones`).toBe(JSON.stringify(ref.b.lights.zones));
      }
    });
  }

  it('the Warehouse (an art layer) draws the box dressing on the smooth path only (the light shapes ignore it)', () => {
    const on = prepared(warehouse, 'voxels');
    const off = prepared(warehouse, 'smooth');
    expect(on.b.boxes.some((x) => x.detail)).toBe(false);
    expect(off.b.boxes.some((x) => x.detail)).toBe(true);
    expect(off.light.hash).toBe(on.light.hash);
  });
});

describe('smooth world: Marlow Yard light field, voxels on vs off', () => {
  const on = prepared(ctcourse, 'voxels');
  const off = prepared(ctcourse, 'smooth');
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

  it('the two bakes (voxels on, voxels off) are byte-identical (lamps, moon, ambient grid)', () => {
    expect(bakes.on === bakes.off).toBe(false);
    expect(lightBakeHash(bakes.off)).toBe(lightBakeHash(bakes.on));
    expect(bakes.off.lamps!.baked.ids).toEqual(bakes.on.lamps!.baked.ids);
  });

  const MID = 7;
  /** Named points: feet / surface positions read as a standing body or a surface level. */
  const POINTS: { name: string; x: number; y: number; z: number; body: boolean; shut?: boolean }[] = [
    { name: 'S8 exit centre (lit)', x: 167.5, y: 0, z: MID, body: true },
    { name: 'S1 route x0+4', x: bayX(0) + 4, y: 0, z: MID, body: true },
    { name: 'S3 route x0+9.8', x: bayX(2) + 9.8, y: 0, z: MID, body: true },
    { name: 'S1 corner (dark)', x: bayX(0) + 0.6, y: 0, z: 0.6, body: true },
    { name: 'S3 corner (dark)', x: bayX(2) + 15.4, y: 0, z: 13.4, body: true },
    { name: 'A1 centre, doors shut', x: bayX(0) + 19, y: 0, z: MID, body: true, shut: true },
    { name: 'A3 corner, doors shut', x: bayX(2) + 16.6, y: 0, z: 4.6, body: true, shut: true },
    { name: 'S5 back room (under the roof)', x: 102.3, y: 0, z: MID, body: true },
    { name: 'S2 wall top surface', x: 31, y: 4.45, z: 4, body: false },
    { name: 'S5 medkit face', x: 103, y: 1.2, z: 13.5, body: false },
  ];
  const read = (f: { open: LightField; shut: LightField }, p: (typeof POINTS)[number]): number => {
    const lf = p.shut ? f.shut : f.open;
    return p.body ? lf.bodyLevel(p.x, p.y, p.z, 1.7) : lf.levelAt(p.x, p.y, p.z);
  };

  /** The sweep's readings with voxels off (the coverage check below). */
  const sweep: number[] = [];

  it('the light field reads the same level at every point', () => {
    for (const p of POINTS) expect(read(fields.off, p), p.name).toBe(read(fields.on, p));
    // a sweep over the course, three heights, doors open and shut
    for (let x = bayX(0); x < bayX(7) + CT_BAY + 6; x += 0.9) {
      for (let z = 0.3; z < 14; z += 1.1) {
        for (const y of [0.05, 0.9, 1.6]) {
          const v = fields.off.open.levelAt(x, y, z);
          sweep.push(v);
          expect(v, `${x}, ${y}, ${z}`).toBe(fields.on.open.levelAt(x, y, z));
          expect(fields.off.shut.levelAt(x, y, z), `${x}, ${y}, ${z} shut`).toBe(fields.on.shut.levelAt(x, y, z));
        }
      }
    }
  });

  it('the samples cover lit and mid readings down to the course darkest (the 0.30 fill), and the roofed back room', () => {
    expect(sweep.length).toBeGreaterThan(1000);
    expect(sweep.some((v) => v >= LIGHT.lit), 'lit').toBe(true);
    expect(sweep.some((v) => v >= LIGHT.shadow && v < LIGHT.lit), 'mid').toBe(true);
    // (marlow-bunker) no dark band in the bunker: the darkest reading is the fill floor (0.30, just over LIGHT.shadow)
    expect(Math.min(...sweep), 'darkest').toBeCloseTo(ctcourse.theme.lightLevel ?? 0.75, 2);
    // the station 5 back room is under a roof (the rain grid below agrees)
    const g = roofGrid(off.light.shapes, off.light.lo, off.light.hi);
    expect(roofAt(g, 102.3, MID)).toBeGreaterThan(2.2);
  });

  it('the smooth path rain roof: a roof over every cell (the ceilings), and over the station 5 back room', () => {
    const g = roofGrid(off.light.shapes, off.light.lo, off.light.hi);
    // (marlow-bunker) every cell: no rain under its ceiling slab (0.4 m, top at the ceiling + 0.4)
    for (let i = 0; i < 8; i++) expect(roofAt(g, bayX(i) + 4, MID), `S${i + 1}`).toBeGreaterThan(CT_CEIL[i]!);
    // the back room: covered well above head height
    expect(roofAt(g, 102.3, MID)).toBeGreaterThan(2.2);
    // outside the grid: open
    expect(roofAt(g, -1e4, -1e4)).toBe(-1e9);
  });
});
