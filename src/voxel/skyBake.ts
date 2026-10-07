/**
 * Sky visibility bake (3.0, pure; runs in a worker): how much open sky each 0.5 m cell of the map sees (0 = none,
 * 1 = open). Indoors under the roof it is dark but for the skylights and doorways; the yard is open. The voxel
 * material scales its ambient (sky / ground fill) and reflections by it, rain wets only what the sky reaches, and
 * the fog's light shafts fall where it is high. Occupancy is conservative (a cell touched by any shape is solid,
 * so thin roof sheets still block the sky).
 */
import { SHAPE_STRIDE, shapeBounds } from './shapes';

export interface SkyJob {
  kind: 'sky';
  id: number;
  origin: [number, number, number];
  cell: number;
  n: [number, number, number];
  shapes: Float32Array;
}

export interface SkyResult {
  kind: 'sky';
  id: number;
  /** n[0] * n[1] * n[2] bytes, x fastest: visibility x 255. */
  vis: Uint8Array;
  /** Per column (x + n[0] * z): the height (m) of the highest solid cell's top (rain stops there), or -1e9. */
  roof: Float32Array;
}

/** Fixed sample directions: the upper hemisphere, cosine weighted (deterministic). */
export function skyDirections(count = 16): [number, number, number][] {
  const out: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const u = (i + 0.5) / count;
    const r = Math.sqrt(u);
    const a = i * golden;
    out.push([Math.cos(a) * r, Math.sqrt(1 - u), Math.sin(a) * r]);
  }
  return out;
}

export function bakeSky(job: SkyJob, rays = 16, maxDist = 18): SkyResult {
  const [nx, ny, nz] = job.n;
  const c = job.cell;
  const o = job.origin;
  const occ = new Uint8Array(nx * ny * nz);
  const bb = [0, 0, 0, 0, 0, 0];
  const shapes = job.shapes;
  const count = shapes.length / SHAPE_STRIDE;
  for (let i = 0; i < count; i++) {
    // (carve and paint shapes never block)
    if (shapes[i * SHAPE_STRIDE + 1] !== 0) continue;
    shapeBounds(shapes, i, bb);
    const x0 = Math.max(0, Math.floor((bb[0]! - o[0]) / c));
    const x1 = Math.min(nx - 1, Math.floor((bb[3]! - o[0]) / c - 1e-6));
    const y0 = Math.max(0, Math.floor((bb[1]! - o[1]) / c));
    const y1 = Math.min(ny - 1, Math.floor((bb[4]! - o[1]) / c - 1e-6));
    const z0 = Math.max(0, Math.floor((bb[2]! - o[2]) / c));
    const z1 = Math.min(nz - 1, Math.floor((bb[5]! - o[2]) / c - 1e-6));
    for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) occ[x + nx * (y + ny * z)] = 1;
  }
  const roof = new Float32Array(nx * nz).fill(-1e9);
  for (let z = 0; z < nz; z++) {
    for (let x = 0; x < nx; x++) {
      for (let y = ny - 1; y >= 0; y--) {
        if (occ[x + nx * (y + ny * z)]) {
          roof[x + nx * z] = o[1] + (y + 1) * c;
          break;
        }
      }
    }
  }
  const dirs = skyDirections(rays);
  const vis = new Uint8Array(nx * ny * nz);
  const step = c * 0.5;
  const steps = Math.ceil(maxDist / step);
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const ci = x + nx * (y + ny * z);
        if (occ[ci]) continue;
        // a cell above every roof in its column sees the whole sky
        if (o[1] + y * c >= roof[x + nx * z]!) {
          let open = true;
          // (columns beside it can still shade it: sample the rays as below only when a neighbour is taller)
          for (let dz = -1; dz <= 1 && open; dz++) for (let dx = -1; dx <= 1 && open; dx++) {
            const xx = x + dx;
            const zz = z + dz;
            if (xx >= 0 && zz >= 0 && xx < nx && zz < nz && roof[xx + nx * zz]! > o[1] + y * c) open = false;
          }
          if (open) {
            vis[ci] = 255;
            continue;
          }
        }
        const px = o[0] + (x + 0.5) * c;
        const py = o[1] + (y + 0.5) * c;
        const pz = o[2] + (z + 0.5) * c;
        let seen = 0;
        for (const d of dirs) {
          let hit = false;
          for (let s = 1; s <= steps; s++) {
            const qx = Math.floor((px + d[0] * s * step - o[0]) / c);
            const qy = Math.floor((py + d[1] * s * step - o[1]) / c);
            const qz = Math.floor((pz + d[2] * s * step - o[2]) / c);
            if (qy >= ny) break;
            if (qx < 0 || qz < 0 || qx >= nx || qz >= nz || qy < 0) break;
            if (occ[qx + nx * (qy + ny * qz)]) {
              hit = true;
              break;
            }
          }
          if (!hit) seen++;
        }
        vis[ci] = Math.round((seen / dirs.length) * 255);
      }
    }
  }
  return { kind: 'sky', id: job.id, vis, roof };
}
