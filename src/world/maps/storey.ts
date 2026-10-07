import type { LevelBuilder } from '../levelBuilder';

/**
 * Walls and windows on any storey (the builder's `wallX / wallZ` stand on the ground): upper floors, ship decks,
 * mezzanine offices. Gaps are sorted, increasing.
 */
const T = 0.3;

/** A wall along X at height y (z, x0 -> x1, door / window gaps). */
export function wallXAt(b: LevelBuilder, z: number, x0: number, x1: number, gaps: readonly (readonly [number, number])[], y: number, h: number, color: string, thick = T): void {
  let x = x0;
  for (const [a, e] of gaps) {
    if (a > x) b.wall(x, z, a, z, h, color, thick, y);
    x = e;
  }
  if (x1 > x) b.wall(x, z, x1, z, h, color, thick, y);
}

/** A wall along Z at height y. */
export function wallZAt(b: LevelBuilder, x: number, z0: number, z1: number, gaps: readonly (readonly [number, number])[], y: number, h: number, color: string, thick = T): void {
  let z = z0;
  for (const [a, e] of gaps) {
    if (a > z) b.wall(x, z, x, a, h, color, thick, y);
    z = e;
  }
  if (z1 > z) b.wall(x, z, x, z1, h, color, thick, y);
}

/** Sill, header and the window anchor in a 1.2 m gap centred at c in a wall along X (storey from y, h tall). */
export function windowX(b: LevelBuilder, c: number, z: number, y: number, h: number, color: string, opts: { open?: boolean; breakable?: boolean }): void {
  b.box(c, y + 0.45, z, 1.2, 0.9, T, color).box(c, y + (2.1 + h) / 2, z, 1.2, h - 2.1, T, color);
  b.windowAt(c, y + 1.5, z, 1.2, 1.2, 0, { sill: y + 0.9, ...opts });
}

/** The same in a wall along Z. */
export function windowZ(b: LevelBuilder, x: number, c: number, y: number, h: number, color: string, opts: { open?: boolean; breakable?: boolean }): void {
  b.box(x, y + 0.45, c, T, 0.9, 1.2, color).box(x, y + (2.1 + h) / 2, c, T, h - 2.1, 1.2, color);
  b.windowAt(x, y + 1.5, c, 1.2, 1.2, Math.PI / 2, { sill: y + 0.9, ...opts });
}

const GLASS = '#5d7387';

/** A fixed pane (no traversal anchor) for a window with nothing to stand on outside (upper storeys). */
export function glassX(b: LevelBuilder, c: number, z: number, y: number, h: number, color: string): void {
  b.box(c, y + 0.45, z, 1.2, 0.9, T, color).box(c, y + (2.1 + h) / 2, z, 1.2, h - 2.1, T, color);
  b.box(c, y + 1.5, z, 1.2, 1.2, 0.05, GLASS);
}

export function glassZ(b: LevelBuilder, x: number, c: number, y: number, h: number, color: string): void {
  b.box(x, y + 0.45, c, T, 0.9, 1.2, color).box(x, y + (2.1 + h) / 2, c, T, h - 2.1, 1.2, color);
  b.box(x, y + 1.5, c, 0.05, 1.2, 1.2, GLASS);
}
