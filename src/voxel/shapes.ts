/**
 * Voxel shapes (3.0, pure): what a map's voxels are made of - the blockout's boxes and cylinders plus the art
 * layer's stamps - packed into a Float32Array so a chunk job can cross to a worker cheaply. Rasterised by voxel
 * centre (a voxel is solid when its centre is inside), so a surface lands within half a voxel of the shape's.
 *
 * Rotation matches Babylon's `RotationYawPitchRoll(yaw, pitch, 0)` (left-handed, row vectors: local -> world =
 * pitch about X, then yaw about Y).
 */
import { runProgram } from './programs';

export const SHAPE_STRIDE = 16;

export const enum ShapeKind {
  Box = 1,
  Cylinder = 2,
}

export const enum ShapeMode {
  /** Solid with the material. */
  Fill = 0,
  /** Air (doorways, recesses). */
  Carve = 1,
  /** Only voxels already solid take the material (stains, lines, signs on a surface). */
  Paint = 2,
}

export interface BoxShape {
  kind: 'box';
  c: readonly [number, number, number];
  /** Full size (m). */
  s: readonly [number, number, number];
  yaw: number;
  pitch: number;
  mat: number;
  mode?: ShapeMode;
  /** Material program (phase 2 art layer: brick courses, rust, grime...; 0 = plain) and its parameters. */
  prog?: number;
  params?: readonly number[];
  /** Art dressing: on the fine layer. */
  fine?: boolean;
}

export interface CylShape {
  kind: 'cyl';
  c: readonly [number, number, number];
  r: number;
  h: number;
  mat: number;
  mode?: ShapeMode;
  prog?: number;
  params?: readonly number[];
  fine?: boolean;
}

export type VoxelShape = BoxShape | CylShape;

/** Pack shapes (stride `SHAPE_STRIDE`). */
export function packShapes(shapes: readonly VoxelShape[]): Float32Array {
  const out = new Float32Array(shapes.length * SHAPE_STRIDE);
  shapes.forEach((s, i) => {
    const o = i * SHAPE_STRIDE;
    out[o + 1] = s.mode ?? ShapeMode.Fill;
    out[o + 2] = s.mat;
    out[o + 3] = s.c[0];
    out[o + 4] = s.c[1];
    out[o + 5] = s.c[2];
    if (s.kind === 'box') {
      out[o] = ShapeKind.Box;
      out[o + 6] = s.s[0] / 2;
      out[o + 7] = s.s[1] / 2;
      out[o + 8] = s.s[2] / 2;
      out[o + 9] = s.yaw;
      out[o + 10] = s.pitch;
    } else {
      out[o] = ShapeKind.Cylinder;
      out[o + 6] = s.r;
      out[o + 7] = s.h / 2;
    }
    out[o + 11] = s.prog ?? 0;
    const p = s.params ?? [];
    for (let k = 0; k < 4; k++) out[o + 12 + k] = p[k] ?? 0;
  });
  return out;
}

/** World AABB of packed shape `i`: [minX, minY, minZ, maxX, maxY, maxZ]. */
export function shapeBounds(sh: Float32Array, i: number, out: number[] = [0, 0, 0, 0, 0, 0]): number[] {
  const o = i * SHAPE_STRIDE;
  const cx = sh[o + 3]!;
  const cy = sh[o + 4]!;
  const cz = sh[o + 5]!;
  if (sh[o] === ShapeKind.Cylinder) {
    const r = sh[o + 6]!;
    const hh = sh[o + 7]!;
    out[0] = cx - r;
    out[1] = cy - hh;
    out[2] = cz - r;
    out[3] = cx + r;
    out[4] = cy + hh;
    out[5] = cz + r;
    return out;
  }
  const hx = sh[o + 6]!;
  const hy = sh[o + 7]!;
  const hz = sh[o + 8]!;
  const cyw = Math.cos(sh[o + 9]!);
  const syw = Math.sin(sh[o + 9]!);
  const cp = Math.cos(sh[o + 10]!);
  const sp = Math.sin(sh[o + 10]!);
  // |local -> world| per axis: pitch (X) then yaw (Y)
  // world = ((lx, ly cp - lz sp, ly sp + lz cp)) then yaw: wx = ax cy + az sy, wz = -ax sy + az cy
  const ex = Math.abs(cyw) * hx + Math.abs(syw * sp) * hy + Math.abs(syw * cp) * hz;
  const ey = Math.abs(cp) * hy + Math.abs(sp) * hz;
  const ez = Math.abs(syw) * hx + Math.abs(cyw * sp) * hy + Math.abs(cyw * cp) * hz;
  out[0] = cx - ex;
  out[1] = cy - ey;
  out[2] = cz - ez;
  out[3] = cx + ex;
  out[4] = cy + ey;
  out[5] = cz + ez;
  return out;
}

/**
 * Rasterise packed shapes into a dense grid: `grid` is nx * ny * nz palette bytes, voxel (0,0,0)'s minimum
 * corner at `origin`, edge `size`. Shapes apply in order (later wins). `pick` limits to shape indices (a chunk's).
 */
export function rasterise(
  sh: Float32Array,
  grid: Uint8Array,
  origin: readonly [number, number, number],
  size: number,
  nx: number,
  ny: number,
  nz: number,
  pick: ArrayLike<number> | null = null,
): void {
  const n = pick ? pick.length : sh.length / SHAPE_STRIDE;
  const bb = [0, 0, 0, 0, 0, 0];
  const inv = 1 / size;
  for (let q = 0; q < n; q++) {
    const i = pick ? pick[q]! : q;
    const o = i * SHAPE_STRIDE;
    shapeBounds(sh, i, bb);
    // voxels whose centres can be inside: centre = origin + (k + 0.5) * size
    const x0 = Math.max(0, Math.ceil((bb[0]! - origin[0]) * inv - 0.5));
    const x1 = Math.min(nx - 1, Math.floor((bb[3]! - origin[0]) * inv - 0.5));
    const y0 = Math.max(0, Math.ceil((bb[1]! - origin[1]) * inv - 0.5));
    const y1 = Math.min(ny - 1, Math.floor((bb[4]! - origin[1]) * inv - 0.5));
    const z0 = Math.max(0, Math.ceil((bb[2]! - origin[2]) * inv - 0.5));
    const z1 = Math.min(nz - 1, Math.floor((bb[5]! - origin[2]) * inv - 0.5));
    if (x0 > x1 || y0 > y1 || z0 > z1) continue;
    const mode = sh[o + 1]!;
    const mat = sh[o + 2]!;
    const cx = sh[o + 3]!;
    const cy = sh[o + 4]!;
    const cz = sh[o + 5]!;
    const h0 = sh[o + 6]!;
    const h1 = sh[o + 7]!;
    const h2 = sh[o + 8]!;
    const cyl = sh[o] === ShapeKind.Cylinder;
    const cyw = Math.cos(sh[o + 9]!);
    const syw = Math.sin(sh[o + 9]!);
    const cp = Math.cos(sh[o + 10]!);
    const sp = Math.sin(sh[o + 10]!);
    const r2 = h0 * h0;
    const eps = 1e-6;
    const prog = sh[o + 11]!;
    const q0 = sh[o + 12]!;
    const q1 = sh[o + 13]!;
    const q2 = sh[o + 14]!;
    const q3 = sh[o + 15]!;
    for (let z = z0; z <= z1; z++) {
      const dz = origin[2] + (z + 0.5) * size - cz;
      for (let y = y0; y <= y1; y++) {
        const dy = origin[1] + (y + 0.5) * size - cy;
        const row = (y + ny * z) * nx;
        for (let x = x0; x <= x1; x++) {
          const dx = origin[0] + (x + 0.5) * size - cx;
          let inside: boolean;
          let lx = dx;
          let ly = dy;
          let lz = dz;
          if (cyl) inside = dx * dx + dz * dz <= r2 + eps && Math.abs(dy) <= h1 + eps;
          else {
            // undo yaw, then pitch
            lx = dx * cyw - dz * syw;
            const az = dx * syw + dz * cyw;
            ly = dy * cp + az * sp;
            lz = -dy * sp + az * cp;
            inside = Math.abs(lx) <= h0 + eps && Math.abs(ly) <= h1 + eps && Math.abs(lz) <= h2 + eps;
          }
          if (!inside) continue;
          const k = row + x;
          if (mode === ShapeMode.Carve) {
            grid[k] = 0;
            continue;
          }
          let m = mat;
          if (prog) {
            if (mode === ShapeMode.Paint && !grid[k]) continue;
            m = runProgram(prog, mat, q0, q1, q2, q3, lx, ly, lz, h0, h1, cyl ? h0 : h2, cx + dx, cy + dy, cz + dz, size, grid[k]!);
            if (m < 0) continue;
          }
          if (mode === ShapeMode.Fill) grid[k] = m;
          else if (grid[k]) grid[k] = m;
        }
      }
    }
  }
}
