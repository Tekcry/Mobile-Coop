import { describe, expect, it } from 'vitest';
import { bakeLamps, BOX_STRIDE, fillLampAtlas, LAMP_CELL, LAMP_STRIDE, lampColumnDist, lampGrid, lampPlanReach, packLampAtlas, type LampJob, type LampResult } from '../src/voxel/lampBake';
import { lampTerm, LAMP_CONE_COS, LAMP_EXP, SPOT_EXP } from '../src/world/lampMath';
import { packShapes, ShapeMode, type VoxelShape } from '../src/voxel/shapes';
import { canonicalLightSet, canonicalLightShapes } from '../src/voxel/lightShapes';
import { lampVolumeGrid, lampVolumeRegion, unionRegion } from '../src/voxel/lampVolume';
import { detailPieces } from '../src/world/detailPass';
import { LevelBuilder, type BoxPiece, type CylPiece } from '../src/world/levelBuilder';
import { MAPS } from '../src/world/maps';

const box = (c: [number, number, number], s: [number, number, number], mode?: ShapeMode): VoxelShape => ({ kind: 'box', c, s, yaw: 0, pitch: 0, mat: 1, mode });
/** A downward lamp at (x, y, z), radius r, fixture sx x sz. */
const lamp = (x: number, y: number, z: number, r = 6, sx = 0, sz = 0): number[] => [x, y, z, r, 0, 0, 0, -2, sx, sz];
const floor = box([0, -0.25, 0], [20, 0.5, 20]);

function bake(shapes: VoxelShape[], lights: number[][]): LampResult {
  const job: LampJob = { kind: 'lamps', id: 0, shapes: packShapes(shapes), lights: new Float32Array(lights.flat()), lo: [-10, -0.5, -10], hi: [10, 6, 10] };
  return bakeLamps(job);
}

/** Visibility (0..1) of light `li` at a world point (the cell containing it). */
function visAt(r: LampResult, li: number, x: number, y: number, z: number): number {
  let at = 0;
  for (let i = 0; i < li; i++) at += r.boxes[i * BOX_STRIDE + 3]! * r.boxes[i * BOX_STRIDE + 4]! * r.boxes[i * BOX_STRIDE + 5]!;
  const b = r.boxes.subarray(li * BOX_STRIDE, li * BOX_STRIDE + BOX_STRIDE);
  const cx = Math.floor((x - b[0]!) / LAMP_CELL);
  const cy = Math.floor((y - b[1]!) / LAMP_CELL);
  const cz = Math.floor((z - b[2]!) / LAMP_CELL);
  return r.vis[at + cx + b[3]! * (cy + b[4]! * cz)]! / 255;
}

describe('baked lamp visibility (3.2)', () => {
  it('an open floor under a lamp is in full view; nothing above a downward lamp is baked', () => {
    const r = bake([floor], [lamp(0, 4, 0)]);
    expect(visAt(r, 0, 0, 0.1, 0)).toBe(1);
    expect(visAt(r, 0, 3, 0.5, -2)).toBe(1);
    // (the box stops a cell above the lamp)
    expect(r.boxes[1]! + r.boxes[4]! * LAMP_CELL).toBeLessThanOrEqual(4 + LAMP_CELL * 2);
  });

  it('a wall hides the far side; a doorway carved through it lets the light through', () => {
    const wall = box([2, 1.5, 0], [0.3, 3, 10]);
    const r = bake([floor, wall], [lamp(0, 2.5, 0)]);
    expect(visAt(r, 0, 1, 0.3, 0)).toBe(1);
    expect(visAt(r, 0, 3.5, 0.3, 0)).toBe(0);
    expect(visAt(r, 0, 3.5, 0.3, 3)).toBe(0);
    const door = box([2, 1.1, 0], [0.6, 2.2, 1.2], ShapeMode.Carve);
    const d = bake([floor, wall, door], [lamp(0, 2.5, 0)]);
    expect(visAt(d, 0, 3.5, 0.3, 0)).toBe(1);
    // (still dark beside the doorway)
    expect(visAt(d, 0, 3.5, 0.3, 3)).toBe(0);
  });

  it('a thin shelf still casts a shadow (conservative occupancy)', () => {
    const shelf = box([0, 1.5, 0], [2, 0.02, 2]);
    const r = bake([floor, shelf], [lamp(0, 4, 0)]);
    expect(visAt(r, 0, 0, 0.3, 0)).toBe(0);
    expect(visAt(r, 0, 0, 2, 0)).toBe(1);
  });

  it('a strip lamp casts a soft edge along its length (part of the fixture in view)', () => {
    // a 3 m strip along x at 4 m; a blocker covering the strip's -x half, seen from a cell below
    const blocker = box([-1, 3, 0], [2, 0.1, 1]);
    const r = bake([floor, blocker], [lamp(0, 4, 0, 7, 3, 0.25)]);
    const v = visAt(r, 0, -0.1, 0.3, 0);
    expect(v).toBeGreaterThan(0.2);
    expect(v).toBeLessThan(0.8);
  });

  it('the atlas holds every light at its tile', () => {
    const r = bake([floor, box([2, 1.5, 0], [0.3, 3, 10])], [lamp(0, 2.5, 0), lamp(-5, 3, -5, 3)]);
    const a = packLampAtlas(r.boxes, 40);
    const data = fillLampAtlas(r, a);
    const [ax, ay] = a.dims;
    for (let li = 0; li < 2; li++) {
      const b = r.boxes.subarray(li * BOX_STRIDE, li * BOX_STRIDE + BOX_STRIDE);
      const tx = a.offsets[li * 2]!;
      const tz = a.offsets[li * 2 + 1]!;
      // tiles stay inside the atlas and never overlap the first
      expect(tx + b[3]!).toBeLessThanOrEqual(ax);
      for (const [x, y, z] of [[0, 0.3, 0], [3.5, 0.3, 0], [-5, 0.3, -5]] as const) {
        const cx = Math.floor((x - b[0]!) / LAMP_CELL);
        const cy = Math.floor((y - b[1]!) / LAMP_CELL);
        const cz = Math.floor((z - b[2]!) / LAMP_CELL);
        if (cx < 0 || cz < 0 || cx >= b[3]! || cz >= b[5]!) continue;
        expect(data[tx + cx + ax * (cy + ay * (tz + cz))]! / 255).toBe(visAt(r, li, x, y, z));
      }
    }
    expect(a.offsets[2]! + a.offsets[3]!).toBeGreaterThan(0);
  });

  it('the light grid lists the lights that reach each column, nearest first', () => {
    const L = new Float32Array([...lamp(0, 4, 0, 5), ...lamp(6, 4, 0, 3), ...lamp(-8, 4, -8, 1)]);
    const g = lampGrid(L, [-10, 0, -10], [10, 6, 10]);
    const ids = (x: number, z: number): number[] => {
      const q = Math.floor((x + 10) / 2);
      const r = Math.floor((z + 10) / 2);
      const o = (r * g.cols * 2 + q * 2) * 4;
      return [...g.data.subarray(o, o + 8)].filter((v) => v > 0).map((v) => v - 1);
    };
    expect(ids(0.5, 0.5)).toEqual([0]);
    expect(ids(4.5, 0.5)).toEqual([1, 0]);
    expect(ids(-9.5, 9.5)).toEqual([]);
    expect(L.length / LAMP_STRIDE).toBe(3);
  });

  it('(sector-fixes L) a cone reaches only as far in plan as its beam: fewer lights per column, none that light it left out', () => {
    const c45 = Math.cos(Math.PI / 4);
    const t = Math.SQRT1_2;
    // a hemisphere lamp, a 45 degree downlight, a 30 degree spot tilted 45 degrees to -z (a wall pack)
    const L = new Float32Array([...lamp(0, 5, 0, 6), 0, 5, 0, 6, 0, -1, 0, c45, 0, 0, 0, 5, 0, 6, 0, -t, -t, Math.cos(Math.PI / 6), 0, 0]);
    const r = [0, 0, 0, 0, 0];
    lampPlanReach(L, 0, r);
    expect(r).toEqual([6, 6, 6, 6, 6]);
    lampPlanReach(L, 1, r);
    expect(r[0]).toBeCloseTo(6 * c45 + 0.01, 4);
    expect(lampColumnDist(L, 0, [6, 6, 6, 6, 6], 5, -1, 2)).toBeGreaterThanOrEqual(0);
    expect(lampColumnDist(L, 1, r, 5, -1, 2)).toBe(-1);
    lampPlanReach(L, 2, r);
    expect(r[4]).toBeLessThan(0.02); // nothing behind the wall pack (+z)
    expect(r[3]).toBeCloseTo(6 * Math.cos(Math.PI / 12) + 0.01, 3);
    expect(lampColumnDist(L, 2, r, -1, 1, 2)).toBe(-1);
    expect(lampColumnDist(L, 2, r, -1, -5, 2)).toBeGreaterThanOrEqual(0);
    // lossless: every point a light reaches lies in a column that lists it
    for (let i = 0; i < 3; i++) {
      const o = i * LAMP_STRIDE;
      const spot = L[o + 7]! > -1.5;
      lampPlanReach(L, i, r);
      for (let x = -7; x <= 7; x += 0.25) for (let z = -7; z <= 7; z += 0.25) for (let y = 0; y <= 5; y += 0.5) {
        const v = lampTerm(x - L[o]!, y - L[o + 1]!, z - L[o + 2]!, L[o + 3]!, L[o + 4]!, L[o + 5]!, L[o + 6]!, spot ? L[o + 7]! : LAMP_CONE_COS, spot ? SPOT_EXP : LAMP_EXP);
        if (v <= 0) continue;
        expect(lampColumnDist(L, i, r, Math.floor(x / 2) * 2, Math.floor(z / 2) * 2, 2), `light ${i} at ${x}, ${y}, ${z}`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('GI circuits mixed into one texture (3.2)', () => {
  it('weights each circuit and sums at half scale', async () => {
    const { mixGiSlots } = await import('../src/voxel/voxelWorld');
    // two cells, two circuits
    const data = new Uint8Array([100, 50, 0, 255, 200, 0, 0, 255, /* slot 1 */ 100, 100, 100, 255, 255, 255, 255, 255]);
    const out = new Uint8Array(8);
    mixGiSlots(data, 2, [1, 1], out);
    expect([...out.subarray(0, 4)]).toEqual([100, 75, 50, 255]);
    expect(out[4]).toBe(228);
    mixGiSlots(data, 2, [0, 0.5], out);
    expect([...out.subarray(0, 3)]).toEqual([25, 25, 25]);
  });
});

describe('canonical light shapes (3.6)', () => {
  const b = (c: [number, number, number], s: [number, number, number], extra: Partial<BoxPiece> = {}): BoxPiece => ({ c, s, yaw: 0, pitch: 0, color: '#888888', collide: true, visible: true, ...extra });

  it('keeps visible pieces at least 5 cm thick; drops invisible and thinner ones', () => {
    const boxes = [b([0, 1, 0], [4, 2, 0.2]), b([0, 1, 5], [4, 2, 0.04]), b([0, 1, 9], [4, 2, 0.3], { visible: false }), b([3, 0.5, 3], [1, 1, 1], { collide: false })];
    const cyls: CylPiece[] = [
      { c: [1, 1, 1], r: 0.3, h: 2, color: '#888888', collide: true },
      { c: [2, 1, 1], r: 0.02, h: 2, color: '#888888', collide: true },
    ];
    const s = canonicalLightShapes(boxes, cyls, 'unit');
    expect(s.filter((x) => x.kind === 'box').length).toBe(2);
    expect(s.filter((x) => x.kind === 'cyl').length).toBe(1);
  });

  it('is the same whatever dressing the renderer added, and with it', () => {
    const wall = b([0, 1.5, 0], [8, 3, 0.2]);
    const base = canonicalLightShapes([wall], [], 'unit');
    for (const tier of ['low', 'medium', 'ultra', 'epic'] as const) {
      const dressed = [wall, ...detailPieces([wall], 'unit', tier)];
      expect(JSON.stringify(canonicalLightShapes(dressed, [], 'unit')), tier).toBe(JSON.stringify(base));
    }
    // (the Medium dressing is part of it: wall dressing that is thick enough)
    expect(base.length).toBeGreaterThan(1);
  });

  it('every shipped map gives one set, bounded, with the tier of the dressing not mattering', () => {
    for (const map of MAPS) {
      const lb = new LevelBuilder();
      map.build(lb, 1);
      const a = canonicalLightSet(lb.boxes, lb.cylinders, map.id);
      const dressed = [...lb.boxes, ...detailPieces(lb.boxes, map.id, 'epic')];
      const c = canonicalLightSet(dressed, lb.cylinders, map.id);
      expect(c.hash, map.id).toBe(a.hash);
      expect(a.lo.every((v, k) => v < a.hi[k]!), map.id).toBe(true);
      // whole metres, so every grid lines up
      expect([...a.lo, ...a.hi].every((v) => Number.isInteger(v)), map.id).toBe(true);
    }
  });
});

describe('the lamp light volume grid (3.3; the editor light view)', () => {
  const boxes = (...b: number[][]): Float32Array => new Float32Array(b.flat());
  it('covers every lamp box on the bake cells, from a cell under the floor', () => {
    // two boxes (origin, cells) - one dipping under the floor
    const b = boxes([-2.1, -1.0, 0.3, 20, 30, 10], [3.05, 0, -4, 10, 10, 10]);
    const g = lampVolumeGrid(b, 0);
    expect(g.cell).toBe(LAMP_CELL);
    expect(g.o[1]).toBeCloseTo(-LAMP_CELL);
    for (let i = 0; i < 2; i++) {
      const o = i * BOX_STRIDE;
      expect(g.o[0]).toBeLessThanOrEqual(b[o]! + 1e-6);
      expect(g.o[2]).toBeLessThanOrEqual(b[o + 2]! + 1e-6);
      expect(g.o[0] + g.dims[0] * g.cell).toBeGreaterThanOrEqual(b[o]! + b[o + 3]! * LAMP_CELL - 1e-6);
      expect(g.o[1] + g.dims[1] * g.cell).toBeGreaterThanOrEqual(b[o + 1]! + b[o + 4]! * LAMP_CELL - 1e-6);
      expect(g.o[2] + g.dims[2] * g.cell).toBeGreaterThanOrEqual(b[o + 2]! + b[o + 5]! * LAMP_CELL - 1e-6);
      const r = lampVolumeRegion(b, i, g);
      for (let k = 0; k < 3; k++) {
        expect(r[k]).toBeGreaterThanOrEqual(0);
        expect(r[k + 3]).toBeLessThanOrEqual(g.dims[k as 0 | 1 | 2]);
        expect(r[k + 3]).toBeGreaterThan(r[k]!);
      }
    }
    expect(unionRegion([lampVolumeRegion(b, 0, g), lampVolumeRegion(b, 1, g)])).toEqual([0, 0, 0, g.dims[0], g.dims[1], g.dims[2]]);
    expect(unionRegion([])).toBeNull();
  });
});
