/**
 * The weapon meshes (feature/weapons; pure, no Babylon). One GLB per kit item, built offline by scripts/weapons/
 * (Blender 5.2.2, baked PBR, KTX2) into src/weapons/assets/<id>.glb with its build report <id>.json. The game reads
 * nothing from them: the weapon's data (`weapons.json`: hand points, muzzle, proxy parts and their extents) stays the
 * gameplay and carry authority; the mesh is what renders in its place (render side only, CLAUDE.md).
 */
import type { ModelExtents } from './weaponDefs';

/** Kit items with a built mesh: the rifle, the pistol and the knife (G76). */
export const MESH_IDS = ['rifle', 'pistolSd', 'knife'] as const;
export type MeshId = (typeof MESH_IDS)[number];

/** The build report fields the game and its tests read (scripts/weapons/py/build_weapon.py). */
export interface WeaponMeshReport {
  id: string;
  triangles: number;
  textureSize: number;
  /** Weapon-frame bounds of the mesh (m). */
  bounds: { min: [number, number, number]; max: [number, number, number] };
  /** The hand points, muzzle and magazine point the mesh was built around (weapons.json). */
  points: Record<string, [number, number, number]>;
  /** Per point: the part it lies inside (null: outside every part) and its distance to the nearest part surface (mm). */
  surface: Record<string, { inside: string | null; mm: number }>;
}

/** Triangle budget per item (desktop; a gun is seen at arm's length in third person). */
export const TRI_BUDGET: Record<MeshId, number> = { rifle: 20000, pistolSd: 10000, knife: 3000 };

/** Same-origin URL of an item's GLB from an `import.meta.glob('./assets/*.glb', { query: '?url' })` record ('' = none). */
export function meshUrl(id: string, files: Readonly<Record<string, string>>): string {
  for (const [path, url] of Object.entries(files)) if (path.slice(path.lastIndexOf('/') + 1) === `${id}.glb`) return url;
  return '';
}

/**
 * Problems between a mesh's report and its weapon data (empty = fits): the proxy extents (what the carry slots and clip
 * checks use) must hold the mesh within `tol` (m) on every side, and the mesh must reach them (no proxy far bigger).
 */
export function meshFitsProxy(r: Pick<WeaponMeshReport, 'bounds'>, e: ModelExtents, tol = 0.012): string[] {
  const out: string[] = [];
  const axes = ['x', 'y', 'z'] as const;
  axes.forEach((a, i) => {
    const lo = e[`${a}0`];
    const hi = e[`${a}1`];
    const mlo = r.bounds.min[i]!;
    const mhi = r.bounds.max[i]!;
    if (Math.abs(mlo - lo) > tol) out.push(`${a} min: mesh ${mlo.toFixed(3)} vs proxy ${lo.toFixed(3)}`);
    if (Math.abs(mhi - hi) > tol) out.push(`${a} max: mesh ${mhi.toFixed(3)} vs proxy ${hi.toFixed(3)}`);
  });
  return out;
}
