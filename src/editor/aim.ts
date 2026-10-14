/**
 * Surface aiming (Michael 2026-10-14): the aim ray (the mouse cursor's, or the screen centre's on the pad in Free fly)
 * meets the real surfaces of the editing level - ceiling undersides, wall faces, object tops and sides, floors - not
 * only the floor plane. Every tool still places by a plan point, so this turns the hit into the plan point the tools
 * read: a wall face hit stands just out of that face (so wall fittings mount on it, facing out), a ceiling hit is the
 * point under it (ceiling fittings go there). A ray that meets nothing falls to the floor plane, or, looking up, to the
 * ceiling above. Pure and Babylon-free (tests/editor/aim.test.ts).
 */
import { snap } from './geometry';
import type { Pt } from './types';

/** Aim numbers, editor defaults. */
export const AIM = {
  /** A wall face hit stands this far out of the face (inside the wall fittings' reach, never behind the face). */
  OUT: 0.05,
  /** A hit whose normal has |y| below this is a vertical face (a wall or an object's side). */
  VERTICAL: 0.5,
  /** Looking up at nothing: the ceiling plane is found again this many times from the point it gives. */
  CEIL_PASSES: 3,
} as const;

export type V3 = readonly [number, number, number];

export interface AimRay {
  o: V3;
  d: V3;
}

/** A picked surface: the point and the surface normal (any sense; it is turned to face the ray). */
export interface SurfaceHit {
  x: number;
  y: number;
  z: number;
  n: V3;
}

export type Surface = 'floor' | 'ceiling' | 'wall' | 'top';

export interface Aim {
  /** The plan point the tools read (on the grid; a wall face hit keeps its distance out of the face exactly). */
  p: Pt;
  surf: Surface;
  /** The height of the surface aimed at (the floor plane, the ceiling, the hit). */
  y: number;
  /** The ceiling over the point (world y): where a ceiling fitting goes, also when the ray met the floor from above. */
  ceil: number;
  /** A wall face hit: the face's outward plan normal. */
  face?: Pt;
}

/** Where the ray meets the horizontal plane at height y (ahead of it only). */
export function rayPlane(r: AimRay, y: number): Pt | null {
  if (Math.abs(r.d[1]) < 1e-9) return null;
  const t = (y - r.o[1]) / r.d[1];
  if (t <= 0) return null;
  return [r.o[0] + r.d[0] * t, r.o[2] + r.d[2] * t];
}

/**
 * Looking up at no surface: the ceiling plane above the editing floor. `ceilAt` gives the ceiling height (world y) over
 * a plan point (its room's ceiling, else the storey); the plane is found again from each point it gives, so the point
 * lands under the ceiling of the room it is in.
 */
export function rayToCeiling(r: AimRay, ceilAt: (x: number, z: number) => number): { p: Pt; y: number } | null {
  let y = ceilAt(r.o[0], r.o[2]);
  let p = rayPlane(r, y);
  for (let i = 0; p && i < AIM.CEIL_PASSES; i++) {
    const y2 = ceilAt(p[0], p[1]);
    if (Math.abs(y2 - y) < 1e-6) break;
    const q = rayPlane(r, y2);
    if (!q) break;
    y = y2;
    p = q;
  }
  return p ? { p, y } : null;
}

/**
 * The aim from a ray and what it hit (null: nothing on the editing level), on the plan grid `grid`. A vertical face hit
 * snaps along the face only, so the point never ends behind it; anything else snaps both ways.
 */
export function aimPoint(r: AimRay, hit: SurfaceHit | null, floorY: number, ceilAt: (x: number, z: number) => number, grid: number): Aim | null {
  const a = aimRaw(r, hit, floorY, ceilAt, grid);
  return a ? { ...a, ceil: a.surf === 'ceiling' ? a.y : ceilAt(a.p[0], a.p[1]) } : null;
}

function aimRaw(r: AimRay, hit: SurfaceHit | null, floorY: number, ceilAt: (x: number, z: number) => number, grid: number): Omit<Aim, 'ceil'> | null {
  if (hit) {
    let [nx, ny, nz] = hit.n;
    // the side the ray came from
    if (nx * r.d[0] + ny * r.d[1] + nz * r.d[2] > 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    if (Math.abs(ny) < AIM.VERTICAL) {
      const h = Math.sqrt(nx * nx + nz * nz) || 1;
      const fx = nx / h + 0;
      const fz = nz / h + 0;
      const x = hit.x + fx * AIM.OUT;
      const z = hit.z + fz * AIM.OUT;
      // an axis-aligned face keeps its across coordinate exactly; a turned one snaps both (OUT covers half a grid step)
      const p: Pt = Math.abs(fx) > 0.999 ? [+x.toFixed(3), snap(z, grid)] : Math.abs(fz) > 0.999 ? [snap(x, grid), +z.toFixed(3)] : [snap(x, grid), snap(z, grid)];
      return { p, surf: 'wall', y: hit.y, face: [fx, fz] };
    }
    return { p: [snap(hit.x, grid), snap(hit.z, grid)], surf: ny < 0 ? 'ceiling' : Math.abs(hit.y - floorY) < 0.05 ? 'floor' : 'top', y: hit.y };
  }
  const f = rayPlane(r, floorY);
  if (f) return { p: [snap(f[0], grid), snap(f[1], grid)], surf: 'floor', y: floorY };
  const c = rayToCeiling(r, ceilAt);
  return c ? { p: [snap(c.p[0], grid), snap(c.p[1], grid)], surf: 'ceiling', y: c.y } : null;
}
