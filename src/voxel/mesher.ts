/**
 * Greedy voxel mesher (3.0, pure): faces between solid and air, merged into the largest rectangles by occupancy
 * only (the material is looked up per pixel on the GPU, so colour variation never splits a quad). Input is a dense
 * grid with a one-voxel apron (the neighbours across the chunk's sides, so faces between chunks are culled);
 * output is world-space quads (positions, flat normals, indices) with Babylon's winding.
 */
export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  quads: number;
  /** `byValue` only: each quad's voxel value. */
  values?: Uint8Array;
}

class Grow {
  f: Float32Array;
  n = 0;
  constructor(cap: number) {
    this.f = new Float32Array(cap);
  }
  push3(a: number, b: number, c: number): void {
    if (this.n + 3 > this.f.length) {
      const g = new Float32Array(this.f.length * 2);
      g.set(this.f);
      this.f = g;
    }
    this.f[this.n++] = a;
    this.f[this.n++] = b;
    this.f[this.n++] = c;
  }
}

/**
 * @param grid (nx + 2) * (ny + 2) * (nz + 2) palette bytes, x fastest; index 0 = the apron voxel at (-1, -1, -1)
 * @param origin world position of inner voxel (0, 0, 0)'s minimum corner
 * @param byValue merge only faces of equal voxel values (characters / weapons: a colour per part); faces between two
 *   solid voxels of different values are still culled
 */
export function greedyMesh(grid: Uint8Array, nx: number, ny: number, nz: number, origin: readonly [number, number, number], size: number, byValue = false): MeshData {
  const X = nx + 2;
  const Y = ny + 2;
  const at = (x: number, y: number, z: number): number => grid[x + 1 + X * (y + 1 + Y * (z + 1))]!;
  const N = [nx, ny, nz];
  const pos = new Grow(4096);
  const nrm = new Grow(4096);
  let quads = 0;
  const vals: number[] = [];
  const p = [0, 0, 0];
  const q = [0, 0, 0];
  const corner = (a: number[], out: (x: number, y: number, z: number) => void): void => out(origin[0] + a[0]! * size, origin[1] + a[1]! * size, origin[2] + a[2]! * size);
  const vert = (x: number, y: number, z: number): void => pos.push3(x, y, z);
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3;
    const v = (d + 2) % 3;
    const nu = N[u]!;
    const nv = N[v]!;
    const mask = new Int16Array(nu * nv);
    for (let i = 0; i <= N[d]!; i++) {
      // faces on the plane between voxel i - 1 and voxel i along d (only those belonging to inner voxels)
      let any = false;
      for (let b = 0; b < nv; b++) {
        for (let a = 0; a < nu; a++) {
          p[d] = i - 1;
          p[u] = a;
          p[v] = b;
          const g0 = at(p[0]!, p[1]!, p[2]!);
          p[d] = i;
          const g1 = at(p[0]!, p[1]!, p[2]!);
          const s0 = g0 !== 0;
          const s1 = g1 !== 0;
          let m = 0;
          if (s0 && !s1 && i >= 1) m = byValue ? g0 : 1;
          else if (s1 && !s0 && i < N[d]!) m = byValue ? -g1 : -1;
          mask[a + b * nu] = m;
          if (m) any = true;
        }
      }
      if (!any) continue;
      // greedy: grow along u, then along v
      for (let b = 0; b < nv; b++) {
        for (let a = 0; a < nu; ) {
          const m = mask[a + b * nu]!;
          if (!m) {
            a++;
            continue;
          }
          let w = 1;
          while (a + w < nu && mask[a + w + b * nu] === m) w++;
          let h = 1;
          grow: while (b + h < nv) {
            for (let k = 0; k < w; k++) if (mask[a + k + (b + h) * nu] !== m) break grow;
            h++;
          }
          for (let hb = 0; hb < h; hb++) for (let k = 0; k < w; k++) mask[a + k + (b + hb) * nu] = 0;
          // the quad's corners on plane i: (a, b) .. (a + w, b + h)
          p[d] = i;
          p[u] = a;
          p[v] = b;
          q[d] = i;
          // + faces: (a,b) (a+w,b) (a+w,b+h) (a,b+h) wound so Babylon's front side faces +d; - faces reversed
          const order = m > 0 ? [0, 1, 2, 3] : [0, 3, 2, 1];
          const sg = m > 0 ? 1 : -1;
          if (byValue) vals.push(m * sg);
          for (const c of order) {
            q[u] = a + (c === 1 || c === 2 ? w : 0);
            q[v] = b + (c === 2 || c === 3 ? h : 0);
            corner(q, vert);
            nrm.push3(d === 0 ? sg : 0, d === 1 ? sg : 0, d === 2 ? sg : 0);
          }
          quads++;
          a += w;
        }
      }
    }
  }
  const indices = new Uint32Array(quads * 6);
  for (let k = 0; k < quads; k++) {
    const o = k * 4;
    // two triangles per quad (Babylon: clockwise is the front face in its left-handed space)
    indices.set([o, o + 2, o + 1, o, o + 3, o + 2], k * 6);
  }
  return { positions: pos.f.slice(0, pos.n), normals: nrm.f.slice(0, nrm.n), indices, quads, values: byValue ? Uint8Array.from(vals) : undefined };
}
