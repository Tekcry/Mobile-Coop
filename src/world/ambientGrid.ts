/**
 * The ambient grid (3.6, pure): `LightRegistry.zones` (the map's per-room ambient boxes) sampled once at load into
 * 1 m cells, one byte each. Gameplay (`LightField`) and the phone's lamp volume read this grid and nothing else,
 * so the number a guard sees and the number the shader draws are the same byte. A lookup takes the nearest cell
 * (clamped to the grid); zone edges are therefore as sharp as a 1 m cell.
 */
import type { LightRegistry } from './lights';

export const AMBIENT_CELL = 1;

export interface AmbientGrid {
  /** Minimum corner of cell (0, 0, 0): a whole metre. */
  origin: [number, number, number];
  /** Cell counts. */
  n: [number, number, number];
  /** n[0] * n[1] * n[2] bytes, x fastest: ambient x 255. */
  data: Uint8Array;
}

/** Sample the registry's zones (and the global ambient) at every cell centre inside [lo, hi]. */
export function buildAmbientGrid(reg: Pick<LightRegistry, 'ambientAt'>, lo: readonly number[], hi: readonly number[]): AmbientGrid {
  const origin: [number, number, number] = [Math.floor(lo[0]!), Math.floor(lo[1]!), Math.floor(lo[2]!)];
  const n: [number, number, number] = [Math.max(1, Math.ceil(hi[0]! - origin[0])), Math.max(1, Math.ceil(hi[1]! - origin[1])), Math.max(1, Math.ceil(hi[2]! - origin[2]))];
  const data = new Uint8Array(n[0] * n[1] * n[2]);
  for (let z = 0; z < n[2]; z++) {
    for (let y = 0; y < n[1]; y++) {
      for (let x = 0; x < n[0]; x++) {
        const v = reg.ambientAt(origin[0] + (x + 0.5) * AMBIENT_CELL, origin[1] + (y + 0.5) * AMBIENT_CELL, origin[2] + (z + 0.5) * AMBIENT_CELL);
        data[x + n[0] * (y + n[1] * z)] = Math.round(Math.max(0, Math.min(1, v)) * 255);
      }
    }
  }
  return { origin, n, data };
}

/** Ambient (0..1) at a point: the nearest cell, clamped to the grid. Allocation-free. */
export function ambientFromGrid(g: AmbientGrid, x: number, y: number, z: number): number {
  const nx = g.n[0];
  const ny = g.n[1];
  const cx = Math.min(nx - 1, Math.max(0, Math.floor((x - g.origin[0]) / AMBIENT_CELL)));
  const cy = Math.min(ny - 1, Math.max(0, Math.floor((y - g.origin[1]) / AMBIENT_CELL)));
  const cz = Math.min(g.n[2] - 1, Math.max(0, Math.floor((z - g.origin[2]) / AMBIENT_CELL)));
  return g.data[cx + nx * (cy + ny * cz)]! / 255;
}
