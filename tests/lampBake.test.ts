import { describe, expect, it } from 'vitest';
import { bakeLamps, BOX_STRIDE, fillLampAtlas, LAMP_CELL, LAMP_STRIDE, lampGrid, packLampAtlas, type LampJob, type LampResult } from '../src/voxel/lampBake';
import { packShapes, ShapeMode, type VoxelShape } from '../src/voxel/shapes';

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
});
