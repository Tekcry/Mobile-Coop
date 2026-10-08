/**
 * Phone lamp light volume (3.3, pure parts): the baked lamps (`lampBake.ts`) mixed into one light volume over the
 * cells the lamps reach, at the bake's own cell size - per cell the lamps' light (falloff x cone x baked visibility x
 * colour) and the direction it comes from - so a phone pixel takes two texture taps instead of looping over up to
 * eight lamps. The mix runs on the GPU (`BakedLamps`), over the cells of the lamps that changed (a switch, a shot, an
 * EMP), from the same lamp data the per-lamp loop reads.
 *
 *   A (RGBA8): rgb = sqrt(light / LAMP_VOL_MAX) (more precision in the dark)
 *   B (RGBA8): rgb = the light-weighted mean direction to the lamps (0.5 + 0.5 d), a = how much one way it is (0..1)
 */
import { BOX_STRIDE, LAMP_CELL } from './lampBake';

/** Light (linear, colour x intensity) at which the volume saturates. */
export const LAMP_VOL_MAX = 4;

export interface LampVolumeGrid {
  /** Minimum corner (m), cell size (m) and cells per axis. */
  o: [number, number, number];
  cell: number;
  dims: [number, number, number];
}

/** The volume over every lamp's box (snapped to the bake's cells), not below `floorY` less a cell. */
export function lampVolumeGrid(boxes: Float32Array, floorY = -Infinity, cell = LAMP_CELL): LampVolumeGrid {
  const n = boxes.length / BOX_STRIDE;
  if (!n) return { o: [0, 0, 0], cell, dims: [1, 1, 1] };
  let x0 = Infinity;
  let y0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let z1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const b = i * BOX_STRIDE;
    x0 = Math.min(x0, boxes[b]!);
    y0 = Math.min(y0, boxes[b + 1]!);
    z0 = Math.min(z0, boxes[b + 2]!);
    x1 = Math.max(x1, boxes[b]! + boxes[b + 3]! * LAMP_CELL);
    y1 = Math.max(y1, boxes[b + 1]! + boxes[b + 4]! * LAMP_CELL);
    z1 = Math.max(z1, boxes[b + 2]! + boxes[b + 5]! * LAMP_CELL);
  }
  // (nothing is lit under the lowest floor: the cells below it are memory for nothing)
  y0 = Math.max(y0, floorY - cell);
  const o: [number, number, number] = [Math.floor(x0 / cell) * cell, Math.floor(y0 / cell) * cell, Math.floor(z0 / cell) * cell];
  return { o, cell, dims: [Math.max(1, Math.ceil((x1 - o[0]) / cell)), Math.max(1, Math.ceil((y1 - o[1]) / cell)), Math.max(1, Math.ceil((z1 - o[2]) / cell))] };
}

/** Lamp `i`'s box in volume cells as a region (i0, j0, k0, i1, j1, k1; exclusive ends, clipped to the volume). */
export function lampVolumeRegion(boxes: Float32Array, i: number, g: LampVolumeGrid): [number, number, number, number, number, number] {
  const b = i * BOX_STRIDE;
  const lo = (v: number, k: 0 | 1 | 2): number => Math.max(0, Math.min(g.dims[k], Math.floor((v - g.o[k]) / g.cell)));
  const hi = (v: number, k: 0 | 1 | 2): number => Math.max(0, Math.min(g.dims[k], Math.ceil((v - g.o[k]) / g.cell)));
  return [lo(boxes[b]!, 0), lo(boxes[b + 1]!, 1), lo(boxes[b + 2]!, 2), hi(boxes[b]! + boxes[b + 3]! * LAMP_CELL, 0), hi(boxes[b + 1]! + boxes[b + 4]! * LAMP_CELL, 1), hi(boxes[b + 2]! + boxes[b + 5]! * LAMP_CELL, 2)];
}

/** The union of regions (null: none). */
export function unionRegion(regs: readonly (readonly number[])[]): [number, number, number, number, number, number] | null {
  if (!regs.length) return null;
  const u: [number, number, number, number, number, number] = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const r of regs) {
    for (let k = 0; k < 3; k++) {
      u[k] = Math.min(u[k]!, r[k]!);
      u[k + 3] = Math.max(u[k + 3]!, r[k + 3]!);
    }
  }
  return u[3] > u[0] && u[4] > u[1] && u[5] > u[2] ? u : null;
}
