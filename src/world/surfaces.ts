/**
 * Floor surfaces (pure), unit-tested: what the player is standing on decides how loud footsteps are and how
 * they sound. Maps mark areas (boxes in plan with a top height); anything unmarked is the map's default.
 */

export type Surface = 'concrete' | 'metal' | 'grate' | 'wood' | 'gravel' | 'carpet';

/** Footstep noise radius multiplier per surface. */
export const SURFACE_NOISE: Record<Surface, number> = {
  concrete: 1,
  metal: 1.6,
  grate: 1.4,
  wood: 1.15,
  gravel: 1.3,
  carpet: 0.6,
};

export interface SurfaceArea {
  kind: Surface;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Walking height of the area's top (m). */
  top: number;
}

/** Feet within this of an area's top count as standing on it (m). */
const ON_TOP = 0.35;

/** The surface under feet at (x, y, z): the highest marked area whose top is at the feet, else `fallback`. */
export function surfaceAt(areas: readonly SurfaceArea[], x: number, y: number, z: number, fallback: Surface): Surface {
  let best: Surface = fallback;
  let bestTop = -Infinity;
  for (let i = 0; i < areas.length; i++) {
    const a = areas[i]!;
    if (x < a.minX || x > a.maxX || z < a.minZ || z > a.maxZ) continue;
    if (Math.abs(y - a.top) > ON_TOP || a.top <= bestTop) continue;
    bestTop = a.top;
    best = a.kind;
  }
  return best;
}
