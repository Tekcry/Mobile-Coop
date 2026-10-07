/**
 * Mesh voxelizer (3.0 voxel characters / weapons, pure): a closed triangle mesh -> solid voxels by scanline parity
 * (a ray along x per (y, z) row; the crossings sorted, inside between pairs), voxel centres inside. Cells may be
 * anisotropic (`voxeliseMesh`: a unit mesh in cells of `size / scale` per axis). `fillMesh` writes one mesh into a
 * shared grid as a value (characters: every part hanging from one joint in one grid, a later part over an earlier one).
 */
export interface GridSpec {
  /** Cell counts and the minimum corner / cell size per axis (in the mesh's own units). */
  nx: number;
  ny: number;
  nz: number;
  origin: [number, number, number];
  cell: [number, number, number];
}

export interface VoxelGrid extends GridSpec {
  /** nx * ny * nz, x fastest: 1 = solid. */
  solid: Uint8Array;
}

/** Bounds of a position list: [x0, y0, z0, x1, y1, z1]. */
export function boundsOf(positions: ArrayLike<number>): [number, number, number, number, number, number] {
  const b: [number, number, number, number, number, number] = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      const v = positions[i + a]!;
      if (v < b[a]!) b[a] = v;
      if (v > b[a + 3]!) b[a + 3] = v;
    }
  }
  return b;
}

/**
 * Fill `out` (the grid's cells) with `value` where the mesh is solid. A part thinner than a voxel (a strap, a ring's
 * tube) misses every centre: a surface vertex with none of the part's cells next to it keeps its own cell, so nothing
 * vanishes and the surface stays within a voxel.
 */
export function fillMesh(positions: ArrayLike<number>, indices: ArrayLike<number>, g: GridSpec, out: Uint8Array, value: number): void {
  const { nx, ny, nz, origin } = g;
  const [cx, cy, cz] = g.cell;
  const own = new Uint8Array(nx * ny * nz);
  const tri = indices.length / 3;
  const hits: number[] = [];
  const xs: number[] = [];
  for (let k = 0; k < nz; k++) {
    const pz = origin[2] + (k + 0.5) * cz;
    for (let j = 0; j < ny; j++) {
      const py = origin[1] + (j + 0.5) * cy;
      hits.length = 0;
      // crossings of the row's line (y = py, z = pz) with every triangle (2D test in y-z, then x)
      for (let t = 0; t < tri; t++) {
        const a = indices[t * 3]! * 3;
        const b = indices[t * 3 + 1]! * 3;
        const c = indices[t * 3 + 2]! * 3;
        const ay = positions[a + 1]!;
        const az = positions[a + 2]!;
        const by = positions[b + 1]!;
        const bz = positions[b + 2]!;
        const cy2 = positions[c + 1]!;
        const cz2 = positions[c + 2]!;
        if ((py < ay && py < by && py < cy2) || (py > ay && py > by && py > cy2) || (pz < az && pz < bz && pz < cz2) || (pz > az && pz > bz && pz > cz2)) continue;
        // barycentrics of (py, pz) in the triangle's y-z projection
        const d = (by - ay) * (cz2 - az) - (bz - az) * (cy2 - ay);
        if (Math.abs(d) < 1e-12) continue;
        const u = ((py - ay) * (cz2 - az) - (pz - az) * (cy2 - ay)) / d;
        const v = ((by - ay) * (pz - az) - (bz - az) * (py - ay)) / d;
        if (u < 0 || v < 0 || u + v > 1) continue;
        hits.push(positions[a]! + u * (positions[b]! - positions[a]!) + v * (positions[c]! - positions[a]!));
      }
      if (hits.length < 2) continue;
      hits.sort((p, q) => p - q);
      // de-duplicate crossings on shared edges (a ray through an edge hits both triangles)
      xs.length = 0;
      for (const h of hits) if (!xs.length || Math.abs(h - xs[xs.length - 1]!) > 1e-7) xs.push(h);
      for (let q = 0; q + 1 < xs.length; q += 2) {
        const from = Math.max(0, Math.ceil((xs[q]! - origin[0]) / cx - 0.5));
        const to = Math.min(nx - 1, Math.floor((xs[q + 1]! - origin[0]) / cx - 0.5));
        const row = (j + ny * k) * nx;
        for (let i = from; i <= to; i++) own[row + i] = 1;
      }
    }
  }
  const at = (i: number, j: number, k: number): number => (i >= 0 && j >= 0 && k >= 0 && i < nx && j < ny && k < nz ? own[i + nx * (j + ny * k)]! : 0);
  for (let v = 0; v < positions.length; v += 3) {
    const i = Math.floor((positions[v]! - origin[0]) / cx);
    const j = Math.floor((positions[v + 1]! - origin[1]) / cy);
    const k = Math.floor((positions[v + 2]! - origin[2]) / cz);
    if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) continue;
    if (at(i, j, k) || at(i - 1, j, k) || at(i + 1, j, k) || at(i, j - 1, k) || at(i, j + 1, k) || at(i, j, k - 1) || at(i, j, k + 1)) continue;
    own[i + nx * (j + ny * k)] = 1;
  }
  for (let n = 0; n < own.length; n++) if (own[n]) out[n] = value;
}

/** Voxelise `positions` / `indices` (a closed mesh) with cells `cell` (per axis), centred on its bounds. */
export function voxeliseMesh(positions: ArrayLike<number>, indices: ArrayLike<number>, cell: readonly [number, number, number]): VoxelGrid {
  const [x0, y0, z0, x1, y1, z1] = boundsOf(positions);
  const [cx, cy, cz] = cell;
  // cells centred on the mesh's bounds (at least one cell per axis)
  const nx = Math.max(1, Math.round((x1 - x0) / cx));
  const ny = Math.max(1, Math.round((y1 - y0) / cy));
  const nz = Math.max(1, Math.round((z1 - z0) / cz));
  const g: VoxelGrid = { nx, ny, nz, origin: [(x0 + x1) / 2 - (nx * cx) / 2, (y0 + y1) / 2 - (ny * cy) / 2, (z0 + z1) / 2 - (nz * cz) / 2], cell: [cx, cy, cz], solid: new Uint8Array(nx * ny * nz) };
  fillMesh(positions, indices, g, g.solid, 1);
  return g;
}

/** The grid padded with an empty one-cell apron (the greedy mesher's input). */
export function withApron(g: GridSpec, cells: Uint8Array): Uint8Array {
  const X = g.nx + 2;
  const Y = g.ny + 2;
  const out = new Uint8Array(X * Y * (g.nz + 2));
  for (let z = 0; z < g.nz; z++) for (let y = 0; y < g.ny; y++) for (let x = 0; x < g.nx; x++) out[x + 1 + X * (y + 1 + Y * (z + 1))] = cells[x + g.nx * (y + g.ny * z)]!;
  return out;
}
