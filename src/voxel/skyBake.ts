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
  /** GI (Epic): the map's lights, `GI_STRIDE` floats each (x, y, z, radius, cone dx, dy, dz, cos outer or -2, r, g, b
   *  x intensity, group slot), and how many group slots. */
  lights?: Float32Array;
  groups?: number;
}

export const GI_STRIDE = 12;
/** Irradiance stored per byte: 255 = this much. */
export const GI_MAX = 1.5;

export interface SkyResult {
  kind: 'sky';
  id: number;
  /** n[0] * n[1] * n[2] bytes, x fastest: visibility x 255. */
  vis: Uint8Array;
  /** Per column (x + n[0] * z): the height (m) of the highest solid cell's top (rain stops there), or -1e9. */
  roof: Float32Array;
  /** GI (with lights): per group slot a block of n[0] * n[1] * n[2] RGBA texels (x fastest, slots stacked along z):
   *  the one-bounce light that group's lamps throw into each air cell, / GI_MAX x 255. */
  gi?: Uint8Array;
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

/** Conservative occupancy in the job's cells (a cell touched by any filling shape is solid). */
function occupancy(job: SkyJob): Uint8Array {
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
  return occ;
}

export function bakeSky(job: SkyJob, rays = 16, maxDist = 18): SkyResult {
  const [nx, ny, nz] = job.n;
  const c = job.cell;
  const o = job.origin;
  const occ = occupancy(job);
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
  const gi = job.lights && job.groups ? bakeGi(job, occ) : undefined;
  return { kind: 'sky', id: job.id, vis, roof, gi };
}

/**
 * One-bounce GI per light group (pure): for every air cell near a light, rays in 12 directions find the surfaces
 * around it; each surface's direct light from that lamp (falloff, cone, facing, a visibility march through the
 * occupancy) bounces back at a grey albedo. The results go to the light's group slot, so a switched-off or shot-out
 * circuit takes its bounce light with it (the material weights the slots).
 */
export function bakeGi(job: SkyJob, occ: Uint8Array, rays = 12, reach = 6): Uint8Array {
  const [nx, ny, nz] = job.n;
  const c = job.cell;
  const o = job.origin;
  const L = job.lights!;
  const G = job.groups!;
  const cells = nx * ny * nz;
  const acc = new Float32Array(cells * G * 3);
  const dirs: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < rays; i++) {
    const y = 1 - ((i + 0.5) / rays) * 2;
    const r = Math.sqrt(1 - y * y);
    dirs.push([Math.cos(i * golden) * r, y, Math.sin(i * golden) * r]);
  }
  const solid = (x: number, y: number, z: number): boolean => x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz || occ[x + nx * (y + ny * z)] === 1;
  // per light: the direct light reaching a surface cell, computed once (NaN = not yet)
  const direct = new Float32Array(cells);
  const step = c * 0.5;
  const BOUNCE = 0.45;
  for (let li = 0; li < L.length; li += GI_STRIDE) {
    const lx = L[li]!;
    const ly = L[li + 1]!;
    const lz = L[li + 2]!;
    const lr = L[li + 3]!;
    const cdx = L[li + 4]!;
    const cdy = L[li + 5]!;
    const cdz = L[li + 6]!;
    const cos = L[li + 7]!;
    const slot = Math.min(G - 1, Math.max(0, Math.round(L[li + 11]!)));
    const span = lr + reach * 0.5;
    const x0 = Math.max(0, Math.floor((lx - span - o[0]) / c));
    const x1 = Math.min(nx - 1, Math.floor((lx + span - o[0]) / c));
    const y0 = Math.max(0, Math.floor((ly - span - o[1]) / c));
    const y1 = Math.min(ny - 1, Math.floor((ly + span - o[1]) / c));
    const z0 = Math.max(0, Math.floor((lz - span - o[2]) / c));
    const z1 = Math.min(nz - 1, Math.floor((lz + span - o[2]) / c));
    direct.fill(Number.NaN);
    // the direct light on the face of surface cell (sx, sy, sz) looking along (nx_, ny_, nz_)
    const lit = (sx: number, sy: number, sz: number, fx: number, fy: number, fz: number): number => {
      const si = sx + nx * (sy + ny * sz);
      const hit = direct[si]!;
      if (!Number.isNaN(hit)) return hit;
      const px = o[0] + (sx + 0.5) * c;
      const py = o[1] + (sy + 0.5) * c;
      const pz = o[2] + (sz + 0.5) * c;
      let dx = lx - px;
      let dy = ly - py;
      let dz = lz - pz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      let v = 0;
      if (d < lr && d > 1e-3) {
        dx /= d;
        dy /= d;
        dz /= d;
        const ndl = dx * fx + dy * fy + dz * fz;
        const cone = cos > -1.5 ? Math.max(0, Math.min(1, (-(dx * cdx + dy * cdy + dz * cdz) - cos) / Math.max(1e-3, (1 - cos) * 0.3))) : 1;
        if (ndl > 0 && cone > 0) {
          const att = (1 - d / lr) * (1 - d / lr);
          // visibility: march to the light (the lamp's own cell is open air)
          let seen = true;
          for (let t = c; t < d - c * 0.75; t += step) {
            if (solid(Math.floor((px + dx * t - o[0]) / c), Math.floor((py + dy * t - o[1]) / c), Math.floor((pz + dz * t - o[2]) / c))) {
              seen = false;
              break;
            }
          }
          if (seen) v = att * ndl * cone;
        }
      }
      direct[si] = v;
      return v;
    };
    const lrC = L[li + 8]!;
    const lgC = L[li + 9]!;
    const lbC = L[li + 10]!;
    for (let z = z0; z <= z1; z++) {
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const ci = x + nx * (y + ny * z);
          if (occ[ci]) continue;
          const px = o[0] + (x + 0.5) * c;
          const py = o[1] + (y + 0.5) * c;
          const pz = o[2] + (z + 0.5) * c;
          let sum = 0;
          for (let k = 0; k < rays; k++) {
            const d = dirs[k]!;
            let ax = x;
            let ay = y;
            let az = z;
            for (let t = step; t <= reach; t += step) {
              const qx = Math.floor((px + d[0] * t - o[0]) / c);
              const qy = Math.floor((py + d[1] * t - o[1]) / c);
              const qz = Math.floor((pz + d[2] * t - o[2]) / c);
              if (qx === ax && qy === ay && qz === az) continue;
              if (solid(qx, qy, qz)) {
                if (qx < 0 || qy < 0 || qz < 0 || qx >= nx || qy >= ny || qz >= nz) break;
                // the surface: the solid cell's face towards the last air cell
                sum += lit(qx, qy, qz, Math.sign(ax - qx), Math.sign(ay - qy), Math.sign(az - qz));
                break;
              }
              ax = qx;
              ay = qy;
              az = qz;
            }
          }
          const irr = (sum / rays) * BOUNCE;
          if (irr <= 0) continue;
          const gi = (ci + slot * cells) * 3;
          acc[gi] = acc[gi]! + irr * lrC;
          acc[gi + 1] = acc[gi + 1]! + irr * lgC;
          acc[gi + 2] = acc[gi + 2]! + irr * lbC;
        }
      }
    }
  }
  const out = new Uint8Array(cells * G * 4);
  for (let i = 0; i < cells * G; i++) {
    out[i * 4] = Math.min(255, Math.round((acc[i * 3]! / GI_MAX) * 255));
    out[i * 4 + 1] = Math.min(255, Math.round((acc[i * 3 + 1]! / GI_MAX) * 255));
    out[i * 4 + 2] = Math.min(255, Math.round((acc[i * 3 + 2]! / GI_MAX) * 255));
    out[i * 4 + 3] = 255;
  }
  return out;
}
