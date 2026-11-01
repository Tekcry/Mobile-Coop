/**
 * (sector-fixes L, checker) `lampGrid` lists a cone light only in the 2 m columns its beam can reach (`lampPlanReach` /
 * `lampColumnDist`). This proves on real maps that the listing drops no light: for Marlow Yard (ctcourse),
 * the base Warehouse and Sector Ops (warehouseOps, all three sections), the lamp light the field sums from the
 * new listing equals, at every sample point, the sum over a reference listing of every light whose falloff radius
 * touches the column, uncapped (each lamp's term is exactly 0 outside its radius, so that reference holds every term).
 * It also reports where the old listing (the same radius rule, capped at `LAMP_GRID_SLOTS`) differed: only columns
 * the old rule overfilled can change. Samples: every 0.5 m over the bake box, at 0.05, 1.0, 1.7 m and every 0.5 m up.
 * The comparison is on the current maps: the point is the listing, not the layout.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import type { MapDef } from '../src/world/mapDef';
import { ctcourse } from '../src/world/maps/ctcourse';
import { warehouse } from '../src/world/maps/warehouse';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { dressingOn } from '../src/world/detailPass';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps, LAMP_GRID, LAMP_GRID_MAX_LIGHTS, LAMP_GRID_SLOTS, LAMP_STRIDE, lampColumnDist, lampGrid, lampGridBase, lampPlanReach } from '../src/voxel/lampBake';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField } from '../src/world/lightField';

/** The pre-change `lampGrid` rule (radius only, nearest first), capped at `cap` slots per column. */
function radiusGrid(L: Float32Array, lo: readonly number[], hi: readonly number[], cap: number): { lists: number[][]; cols: number; rows: number } {
  const g = LAMP_GRID;
  const cols = Math.max(1, Math.ceil((hi[0]! - lo[0]!) / g));
  const rows = Math.max(1, Math.ceil((hi[2]! - lo[2]!) / g));
  const n = Math.min(LAMP_GRID_MAX_LIGHTS, L.length / LAMP_STRIDE);
  const lists: number[][] = [];
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      const x0 = lo[0]! + q * g;
      const z0 = lo[2]! + r * g;
      const near: { id: number; d: number }[] = [];
      for (let i = 0; i < n; i++) {
        const o = i * LAMP_STRIDE;
        const dx = Math.max(x0 - L[o]!, 0, L[o]! - (x0 + g));
        const dz = Math.max(z0 - L[o + 2]!, 0, L[o + 2]! - (z0 + g));
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < L[o + 3]!) near.push({ id: i, d });
      }
      near.sort((a, b) => a.d - b.d);
      lists.push(near.slice(0, cap).map((e) => e.id));
    }
  }
  return { lists, cols, rows };
}

interface Result { map: string; lights: number; samples: number; maxNewVsRef: number; maxOldVsNew: number; oldChanged: number; oldOverfull: number; worstOld: number; worstNew: number; ms: number }

function check(map: MapDef, id: string): Result {
  const t0 = performance.now();
  const b = new LevelBuilder();
  map.build(b, 0);
  const reg = b.lights;
  const set = canonicalLightSet(b.boxes, b.cylinders, id, dressingOn(map));
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  // lamps only: no fill, no moon (the listing is all this compares)
  const ambient = buildAmbientGrid({ ambientAt: () => 0 }, set.lo, set.hi);
  const moon = { origin: set.lo, n: [1, 1, 1] as [number, number, number], cell: 1, vis: new Uint8Array(1), dir: [0, 1, 0] as [number, number, number] };
  const bake: LightBake = { lo: set.lo, hi: set.hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon, ambient, moonLight: 0, ms: 0 };
  const field = new LightField(bake, reg, []);
  const L = baked.lights;
  const grid = lampGrid(L, set.lo, set.hi);
  const ref = radiusGrid(L, set.lo, set.hi, Infinity);
  const old = radiusGrid(L, set.lo, set.hi, LAMP_GRID_SLOTS);
  expect(grid.cols).toBe(ref.cols);
  expect(grid.rows).toBe(ref.rows);
  const reach = [0, 0, 0, 0, 0];
  let worstOld = 0;
  let worstNew = 0;
  let oldOverfull = 0;
  for (let k = 0; k < ref.lists.length; k++) {
    const m = ref.lists[k]!.length;
    if (m > worstOld) worstOld = m;
    if (m > LAMP_GRID_SLOTS) oldOverfull++;
    // the reach listing uncapped (the grid itself holds at most LAMP_GRID_SLOTS)
    const q = k % ref.cols;
    const rw = Math.floor(k / ref.cols);
    let c = 0;
    for (const i of ref.lists[k]!) {
      lampPlanReach(L, i, reach);
      if (lampColumnDist(L, i, reach, set.lo[0] + q * LAMP_GRID, set.lo[2] + rw * LAMP_GRID, LAMP_GRID) >= 0) c++;
    }
    if (c > worstNew) worstNew = c;
  }
  const ys: number[] = [0.05, 1.0, 1.7];
  for (let y = set.lo[1] + 0.25; y <= set.hi[1]; y += 0.5) ys.push(y);
  let samples = 0;
  let maxNewVsRef = 0;
  let maxOldVsNew = 0;
  let oldChanged = 0;
  for (let x = set.lo[0] + 0.01; x < set.hi[0]; x += 0.5) {
    for (let z = set.lo[2] + 0.01; z < set.hi[2]; z += 0.5) {
      const q = Math.floor((x - set.lo[0]) / LAMP_GRID);
      const rr = Math.floor((z - set.lo[2]) / LAMP_GRID);
      const k = rr * grid.cols + q;
      const refList = ref.lists[k]!;
      const oldList = old.lists[k]!;
      const base = lampGridBase(grid.cols, q, rr);
      for (const y of ys) {
        let sNew = 0;
        for (let s = 0; s < LAMP_GRID_SLOTS; s++) {
          const fid = grid.data[base + s]!;
          if (fid === 0) break;
          sNew += field.lampAt(fid - 1, x, y, z);
        }
        let sRef = 0;
        for (const i of refList) sRef += field.lampAt(i, x, y, z);
        let sOld = 0;
        for (const i of oldList) sOld += field.lampAt(i, x, y, z);
        const dRef = Math.abs(sNew - sRef);
        if (dRef > maxNewVsRef) maxNewVsRef = dRef;
        const dOld = Math.abs(sNew - sOld);
        if (dOld > maxOldVsNew) maxOldVsNew = dOld;
        if (dOld > 1e-9) oldChanged++;
        // the field reads the same listing: its level (lamps and, LR16-1, their bounce here) is the new sum, clamped
        const lv = field.levelAt(x, y, z);
        const want = Math.min(1, sNew + field.bounceAt(x, y, z));
        if (Math.abs(lv - want) > 1e-9) expect.fail(`${id}: levelAt ${lv} != listed sum ${want} at ${x}, ${y}, ${z}`);
        samples++;
      }
    }
  }
  return { map: id, lights: L.length / LAMP_STRIDE, samples, maxNewVsRef, maxOldVsNew, oldChanged, oldOverfull, worstOld, worstNew, ms: Math.round(performance.now() - t0) };
}

describe('(sector-fixes L) lampGrid reach listing is lossless on real maps', () => {
  const maps: [MapDef, string][] = [[ctcourse, 'ctcourse'], [warehouse, 'warehouse'], [warehouseOps, 'warehouseOps']];
  for (const [map, id] of maps) {
    it(`${id}: the reach listing sums every light the radius listing does`, () => {
      const res = check(map, id);
      console.info(`[lampGridLossless] ${JSON.stringify(res)}`);
      expect(res.samples).toBeGreaterThan(1000);
      expect(res.maxNewVsRef).toBeLessThanOrEqual(1e-9);
      // the reach listing never overfills a column (else the cap would drop a light)
      expect(res.worstNew).toBeLessThanOrEqual(LAMP_GRID_SLOTS);
    }, 600_000);
  }
});
