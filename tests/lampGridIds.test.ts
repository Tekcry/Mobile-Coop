/**
 * (F56) The lamp grid lists lights by id + 1 in a `Uint16Array` (`LAMP_GRID_MAX_LIGHTS`, 65535; was 255 in a
 * `Uint8Array`). Saltmarsh Park with every section v2 (the /preview/ build) has more than 255 lamps: the ones past the
 * 255th (the S5 service stair) got no id, dark in the picture and the meter. Here: a map of 300 lamps lists every lamp
 * under its own id, the field (meter and guards) reads light from lamp 256+, the data texture (the picture) carries ids
 * past 255, and the all-v2 campus lists every lamp.
 */
import { describe, expect, it, vi } from 'vitest';
import { bakeLamps, LAMP_GRID, LAMP_GRID_MAX_LIGHTS, LAMP_GRID_SLOTS, LAMP_GRID_TEXELS, LAMP_STRIDE, lampGrid, lampGridBase } from '../src/voxel/lampBake';
import { packShapes, type VoxelShape } from '../src/voxel/shapes';
import { LightRegistry } from '../src/world/lights';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField } from '../src/world/lightField';

const N = 300;
const COLS = 20;
const lo: [number, number, number] = [0, -0.5, 0];
const hi: [number, number, number] = [80, 3, 60];
/** Lamp k: low and short-reach, in the middle of its own 2 m column, 4 m from the next (no column lists two). */
const at = (k: number): [number, number, number] => [4 * (k % COLS) + 1, 1.2, 4 * Math.floor(k / COLS) + 1];

function build(): { reg: LightRegistry; baked: ReturnType<typeof bakedLights>; r: ReturnType<typeof bakeLamps> } {
  const reg = new LightRegistry();
  for (let k = 0; k < N; k++) {
    const [x, y, z] = at(k);
    reg.add({ x, y, z, radius: 1.5, intensity: 1 });
  }
  const baked = bakedLights(reg);
  const floor: VoxelShape = { kind: 'box', c: [40, -0.25, 30], s: [80, 0.5, 60], yaw: 0, pitch: 0, mat: 1 };
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: packShapes([floor]), lights: baked.lights, lo, hi });
  return { reg, baked, r };
}

/** Column (q, r)'s listed lamp indices. */
function listed(g: { data: Uint16Array; cols: number }, q: number, r: number): number[] {
  const o = lampGridBase(g.cols, q, r);
  return [...g.data.subarray(o, o + LAMP_GRID_SLOTS)].filter((v) => v > 0).map((v) => v - 1);
}

describe('(F56) more than 255 lamps', () => {
  const { reg, baked, r } = build();

  it('the grid lists every lamp under its own id (16-bit), none dropped', () => {
    expect(LAMP_GRID_MAX_LIGHTS).toBeGreaterThanOrEqual(65535);
    const g = lampGrid(baked.lights, lo, hi);
    expect(g.data).toBeInstanceOf(Uint16Array);
    expect(g.dropped).toBe(0);
    const seen = new Set<number>();
    for (let v = 0; v < g.data.length; v++) if (g.data[v]! > 0) seen.add(g.data[v]! - 1);
    expect(seen.size).toBe(N);
    for (let k = 0; k < N; k++) {
      const [x, , z] = at(k);
      expect(listed(g, Math.floor((x - lo[0]) / LAMP_GRID), Math.floor((z - lo[2]) / LAMP_GRID)), `lamp ${k}`).toEqual([k]);
    }
  });

  it('the meter and the guards (LightField) read light from lamp 256 and past', () => {
    const ambient = buildAmbientGrid({ ambientAt: () => 0 }, lo, hi);
    const moon = { origin: lo, n: [1, 1, 1] as [number, number, number], cell: 1, vis: new Uint8Array(1), dir: [0, 1, 0] as [number, number, number] };
    const bake: LightBake = { lo, hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon, ambient, moonLight: 0, ms: 0 };
    const field = new LightField(bake, reg, []);
    for (const k of [0, 254, 255, 256, 280, N - 1]) {
      const [x, , z] = at(k);
      const own = field.lampAt(k, x, 0.3, z);
      expect(own, `lamp ${k}`).toBeGreaterThan(0.05);
      expect(field.levelAt(x, 0.3, z), `levelAt under lamp ${k}`).toBeGreaterThanOrEqual(Math.min(1, own) - 1e-9);
      expect(field.totalAt(x, 0.3, z), `totalAt under lamp ${k}`).toBeGreaterThanOrEqual(Math.min(1, own) - 1e-9);
      expect(field.bodyLevel(x, 0, z, 1.7), `bodyLevel under lamp ${k}`).toBeGreaterThan(0);
    }
  });

  it('the picture: the data texture grid carries ids past 255 to the lamps\' own texels', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { BakedLamps } = await import('../src/world/bakedLamps');
    const { InternalTexture, InternalTextureSource } = await import('@babylonjs/core/Materials/Textures/internalTexture');
    const engine = new NullEngine();
    const scene = new Scene(engine);
    // (NullEngine has no 3D textures: the atlas is a bare internal texture, never read here)
    vi.spyOn(engine as unknown as { createRawTexture3D: () => unknown }, 'createRawTexture3D').mockImplementation(() => new InternalTexture(engine, InternalTextureSource.Raw3D));
    const lamps = new BakedLamps(scene, reg, baked, r, lo, hi, null, { doors: [] });
    const buf = (lamps as unknown as { buf: Float32Array }).buf;
    const texels = (lamps.capBase - lamps.lampBase) / N;
    expect(lamps.gridInfo.cols * LAMP_GRID_TEXELS * lamps.gridInfo.rows).toBe(lamps.lampBase);
    for (const k of [255, 256, N - 1]) {
      const [x, y, z] = at(k);
      const q = Math.floor((x - lo[0]) / LAMP_GRID);
      const rr = Math.floor((z - lo[2]) / LAMP_GRID);
      // the column's first slot: id + 1 as a float; its lamp texel t0 holds the lamp's position
      const fid = buf[lampGridBase(lamps.gridInfo.cols, q, rr)]!;
      expect(fid, `lamp ${k}`).toBe(k + 1);
      const o = (lamps.lampBase + (fid - 1) * texels) * 4;
      expect([buf[o], buf[o + 1], buf[o + 2]]).toEqual([x, Math.fround(y), z]);
    }
    lamps.dispose?.();
    scene.dispose();
    engine.dispose();
  });
});

describe('(F56) Saltmarsh Park, every section v2 (the /preview/ build)', () => {
  it('has more than 255 lamps and the grid lists every one; no 2 m column past its slots', async () => {
    vi.resetModules();
    const { flags, CAMPUS_V2_ALL } = await import('../src/core/flags');
    flags.campusV2 = CAMPUS_V2_ALL;
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { campusOps } = await import('../src/world/maps/campusOps');
    const { canonicalLightSet } = await import('../src/voxel/lightShapes');
    const { dressingOn } = await import('../src/world/detailPass');
    const lb = new LevelBuilder();
    campusOps.build(lb, 0);
    const set = canonicalLightSet(lb.boxes, lb.cylinders, campusOps.id, dressingOn(campusOps));
    const L = bakedLights(lb.lights).lights;
    const n = L.length / LAMP_STRIDE;
    const g = lampGrid(L, set.lo, set.hi);
    const seen = new Uint8Array(n);
    for (let v = 0; v < g.data.length; v++) if (g.data[v]! > 0) seen[g.data[v]! - 1] = 1;
    const missing: number[] = [];
    for (let i = 0; i < n; i++) if (!seen[i]) missing.push(i);
    console.info(`[lampGridIds] campusOps all-v2: ${n} lamps, ${g.cols} x ${g.rows} columns (grid ${g.data.byteLength} B), worst column ${g.worst} of ${LAMP_GRID_SLOTS} slots`);
    expect(n).toBeGreaterThan(255);
    expect(g.dropped).toBe(0);
    expect(missing, 'lamps listed in no column').toEqual([]);
    expect(g.worst).toBeLessThanOrEqual(LAMP_GRID_SLOTS);
  }, 300_000);
});
