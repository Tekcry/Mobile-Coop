/**
 * Roof heights without voxels (smooth-world, pure, rendering only): per 0.5 m column the top of the highest canonical
 * light shape over it (`level.light.shapes`), from each shape's bounds. The rain stops there (`Weather.occluder`), as
 * the old voxel sky bake's `roofAt` did. Gameplay never reads it.
 */
import { SHAPE_STRIDE, shapeBounds } from '../voxel/shapes';

export const ROOF_CELL = 0.5;

export interface RoofGrid {
  ox: number;
  oz: number;
  nx: number;
  nz: number;
  cell: number;
  /** Per column (x + nx * z): the highest top (m), or -1e9 (open). */
  top: Float32Array;
}

/** Build the grid over [lo, hi] (the canonical bounds) from packed shapes (filling shapes only). */
export function roofGrid(shapes: Float32Array, lo: readonly number[], hi: readonly number[], cell = ROOF_CELL): RoofGrid {
  const ox = lo[0]!;
  const oz = lo[2]!;
  const nx = Math.max(1, Math.ceil((hi[0]! - ox) / cell));
  const nz = Math.max(1, Math.ceil((hi[2]! - oz) / cell));
  const top = new Float32Array(nx * nz).fill(-1e9);
  const bb = [0, 0, 0, 0, 0, 0];
  const n = shapes.length / SHAPE_STRIDE;
  for (let i = 0; i < n; i++) {
    // (carve and paint shapes never block)
    if (shapes[i * SHAPE_STRIDE + 1] !== 0) continue;
    shapeBounds(shapes, i, bb);
    // columns whose centre the shape's bounds cover (a rotated piece covers a little more: rain stops a little early)
    const x0 = Math.max(0, Math.ceil((bb[0]! - ox) / cell - 0.5));
    const x1 = Math.min(nx - 1, Math.floor((bb[3]! - ox) / cell - 0.5));
    const z0 = Math.max(0, Math.ceil((bb[2]! - oz) / cell - 0.5));
    const z1 = Math.min(nz - 1, Math.floor((bb[5]! - oz) / cell - 0.5));
    const y = bb[4]!;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (top[x + nx * z]! < y) top[x + nx * z] = y;
  }
  return { ox, oz, nx, nz, cell, top };
}

/** The roof height over (x, z); -1e9 outside the grid or under open sky. */
export function roofAt(g: RoofGrid, x: number, z: number): number {
  const cx = Math.floor((x - g.ox) / g.cell);
  const cz = Math.floor((z - g.oz) / g.cell);
  if (cx < 0 || cz < 0 || cx >= g.nx || cz >= g.nz) return -1e9;
  return g.top[cx + g.nx * cz]!;
}
