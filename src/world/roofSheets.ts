import type { MeshArrays } from './fixtureModels';

/**
 * Translucent corrugated roof sheets (warehouse-lamps; pure: no Babylon / DOM). Michael (2026-10-20): "the open sections
 * are unusual, they are usually a opaque type of corrugated plastic sheet that allow light in but cant be passed
 * through." A sheet fills a rectangular roof opening: a ridged surface (a triangle wave across its short side, the
 * ridges along its long side) at the roof line. `LevelBuilder.sheet` adds its collision; the level draws them all as
 * one pale see-through mesh.
 */
export interface SheetPiece {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** The sheet's mid height (m). */
  y: number;
  /** Its collision box's bottom and top (m). */
  y0: number;
  y1: number;
}

/** Margin (m) round a sheet's box for the see-through test (a ray's hit point sits on the box face). */
const SHEET_PAD = 0.05;

/**
 * (sector-redesign perf, render only: the guard freeze's occlusion rays) Is the point on / in a roof sheet's collision
 * box? The sheets are collision-only boxes in the level's static container (one body), so a hit is told by its point.
 * Allocation-free.
 */
export function inSheet(sheets: readonly SheetPiece[], x: number, y: number, z: number): boolean {
  for (let i = 0; i < sheets.length; i++) {
    const s = sheets[i]!;
    if (x >= s.x0 - SHEET_PAD && x <= s.x1 + SHEET_PAD && z >= s.z0 - SHEET_PAD && z <= s.z1 + SHEET_PAD && y >= s.y0 - SHEET_PAD && y <= s.y1 + SHEET_PAD) return true;
  }
  return false;
}

/** Ridge pitch and height (m): a deep-profile sheet, simplified. */
export const RIDGE_PITCH = 0.2;
export const RIDGE_DEPTH = 0.04;

/** One merged mesh for every sheet (flat-shaded ridges, seen from both sides). */
export function sheetMesh(sheets: readonly SheetPiece[]): MeshArrays {
  const o: MeshArrays = { positions: [], normals: [], indices: [] };
  for (const s of sheets) {
    const alongX = s.x1 - s.x0 >= s.z1 - s.z0;
    // u across (the profile), v along (the ridges)
    const u0 = alongX ? s.z0 : s.x0;
    const u1 = alongX ? s.z1 : s.x1;
    const v0 = alongX ? s.x0 : s.z0;
    const v1 = alongX ? s.x1 : s.z1;
    const half = RIDGE_PITCH / 2;
    const n = Math.max(1, Math.round((u1 - u0) / half));
    const du = (u1 - u0) / n;
    const put = (u: number, y: number, v: number): [number, number, number] => (alongX ? [v, y, u] : [u, y, v]);
    for (let k = 0; k < n; k++) {
      const ua = u0 + k * du;
      const ub = ua + du;
      const ya = s.y + (k % 2 === 0 ? -1 : 1) * RIDGE_DEPTH / 2;
      const yb = s.y + (k % 2 === 0 ? 1 : -1) * RIDGE_DEPTH / 2;
      // the facet's normal: up, tilted across the slope
      const ny = du;
      const nu = -(yb - ya);
      const nl = Math.sqrt(ny * ny + nu * nu) || 1;
      const nrm = put(nu / nl, ny / nl, 0);
      const i = o.positions.length / 3;
      for (const p of [put(ua, ya, v0), put(ua, ya, v1), put(ub, yb, v1), put(ub, yb, v0)]) {
        o.positions.push(p[0], p[1], p[2]);
        o.normals.push(nrm[0], nrm[1], nrm[2]);
      }
      o.indices.push(i, i + 2, i + 1, i, i + 3, i + 2);
    }
  }
  return o;
}
