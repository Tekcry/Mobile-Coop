/**
 * One chunk job (3.0 voxels, pure; runs in a worker or inline): rasterise the shapes that touch a chunk (plus a
 * one-voxel apron), mesh it and, for the detail level the GPU reads materials from, cut it into bricks.
 */
import { BRICK, BRICK_VOXELS, EMPTY, UNIFORM_BASE } from './brickmap';
import { greedyMesh, type MeshData } from './mesher';
import { rasterise } from './shapes';

export interface ChunkJob {
  id: number;
  /** World position of the chunk's inner voxel (0, 0, 0) minimum corner. */
  origin: [number, number, number];
  size: number;
  /** Inner voxel counts (multiples of BRICK when bricks are wanted). */
  n: [number, number, number];
  /** Packed shapes touching the chunk (in order). */
  shapes: Float32Array;
  /** Cut the inner voxels into bricks (the material level). */
  bricks: boolean;
}

export interface ChunkResult {
  id: number;
  mesh: MeshData;
  /** Per brick in the chunk (x fastest): EMPTY, a uniform code (<= UNIFORM_BASE) or an index into `data`. */
  codes: Int32Array | null;
  data: Uint8Array | null;
  /** Solid voxels (stats). */
  solid: number;
}

export function buildChunk(job: ChunkJob): ChunkResult {
  const [nx, ny, nz] = job.n;
  const X = nx + 2;
  const Y = ny + 2;
  const Z = nz + 2;
  const grid = new Uint8Array(X * Y * Z);
  const s = job.size;
  const o = job.origin;
  rasterise(job.shapes, grid, [o[0] - s, o[1] - s, o[2] - s], s, X, Y, Z);
  const mesh = greedyMesh(grid, nx, ny, nz, o, s);
  let solid = 0;
  for (let z = 1; z <= nz; z++) for (let y = 1; y <= ny; y++) for (let x = 1; x <= nx; x++) if (grid[x + X * (y + Y * z)]) solid++;
  if (!job.bricks) return { id: job.id, mesh, codes: null, data: null, solid };
  const bx = Math.ceil(nx / BRICK);
  const by = Math.ceil(ny / BRICK);
  const bz = Math.ceil(nz / BRICK);
  const codes = new Int32Array(bx * by * bz);
  const tmp = new Uint8Array(BRICK_VOXELS);
  const out: Uint8Array[] = [];
  for (let cz = 0; cz < bz; cz++) {
    for (let cy = 0; cy < by; cy++) {
      for (let cx = 0; cx < bx; cx++) {
        let first = -1;
        let same = true;
        for (let k = 0; k < BRICK_VOXELS; k++) {
          const lx = cx * BRICK + (k & 7);
          const ly = cy * BRICK + ((k >> 3) & 7);
          const lz = cz * BRICK + (k >> 6);
          const v = lx < nx && ly < ny && lz < nz ? grid[lx + 1 + X * (ly + 1 + Y * (lz + 1))]! : 0;
          tmp[k] = v;
          if (first < 0) first = v;
          else if (v !== first) same = false;
        }
        const ci = cx + bx * (cy + by * cz);
        if (same) codes[ci] = first === 0 ? EMPTY : UNIFORM_BASE - first;
        else {
          codes[ci] = out.length;
          out.push(tmp.slice());
        }
      }
    }
  }
  const data = new Uint8Array(out.length * BRICK_VOXELS);
  out.forEach((b, i) => data.set(b, i * BRICK_VOXELS));
  return { id: job.id, mesh, codes, data, solid };
}

/** Transferable buffers of a result (worker -> main). */
export function transferables(r: ChunkResult): ArrayBuffer[] {
  const t = [r.mesh.positions.buffer, r.mesh.normals.buffer, r.mesh.indices.buffer] as ArrayBuffer[];
  if (r.codes) t.push(r.codes.buffer as ArrayBuffer);
  if (r.data) t.push(r.data.buffer as ArrayBuffer);
  return t;
}
