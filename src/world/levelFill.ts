/**
 * The level's fill light and image-based light response (smooth-world fix round 2, pure, rendering only): one set of
 * numbers both level renderers use, so the smooth walls answer light by one rule.
 * - Fill: the hemisphere's sky / ground colour x its PBR intensity (`hemi.intensity` x pi = the theme's `ambient`), mixed
 *   by the normal, x (`SKY_FILL_FLOOR` + (1 - floor) x sky visibility). `LampPlugin`
 *   `LAMP_LEVEL` (the smooth level) applies it in place of the hemisphere light.
 * - Image-based light: the probe's irradiance and reflections x (`ENV_FLOOR` + (1 - floor) x sky visibility).
 * - Sky visibility: `voxel/skyBake.ts` `bakeSky` in `SKY_CELL` cells, sampled `SKY_OFFSET` cells off the face. It is baked
 *   from the canonical light shapes.
 * Gameplay never reads any of it (the light meter and perception read the light field).
 */

/** The fill a fully hidden spot keeps (share of the open-sky fill). */
export const SKY_FILL_FLOOR = 0.12;
/** The probe light a fully hidden spot keeps. */
export const ENV_FLOOR = 0.35;
/** Sky visibility is read this many cells off the face. */
export const SKY_OFFSET = 0.6;

export type Rgb = [number, number, number];

/** The fill's sky and ground colours x intensity, as `World` gives the hemisphere (white sky, ground x 0.6). */
export function levelFillColors(ambient: number, groundSrgb: Rgb, sky: Rgb = [1, 1, 1]): { sky: Rgb; ground: Rgb } {
  return { sky: [sky[0] * ambient, sky[1] * ambient, sky[2] * ambient], ground: [groundSrgb[0] * 0.6 * ambient, groundSrgb[1] * 0.6 * ambient, groundSrgb[2] * 0.6 * ambient] };
}

/** The fill light (before the albedo) for a normal's y and a sky visibility. */
export function levelFill(c: { sky: Rgb; ground: Rgb }, ny: number, vis: number, out: Rgb = [0, 0, 0]): Rgb {
  const t = ny * 0.5 + 0.5;
  const k = SKY_FILL_FLOOR + (1 - SKY_FILL_FLOOR) * vis;
  for (let i = 0; i < 3; i++) out[i] = (c.ground[i]! + (c.sky[i]! - c.ground[i]!) * t) * k;
  return out;
}

/** The image-based light's scale for a sky visibility. */
export const envScale = (vis: number): number => ENV_FLOOR + (1 - ENV_FLOOR) * vis;

/** GLSL constants (`levelFill`, `envScale` as the shaders write them). */
export const LEVEL_FILL_GLSL = {
  floor: SKY_FILL_FLOOR.toFixed(3),
  open: (1 - SKY_FILL_FLOOR).toFixed(3),
  envFloor: ENV_FLOOR.toFixed(3),
  envOpen: (1 - ENV_FLOOR).toFixed(3),
  offset: SKY_OFFSET.toFixed(3),
};

/** A sky visibility bake's grid (bytes x 255, x fastest), sampled as the GPU's linear 3D texture with clamped edges
 *  (texel centres at half cells); outside the grid: 1 (as `nsGrid`). */
export function sampleSky(g: { origin: readonly number[]; cell: number; n: readonly number[]; vis: Uint8Array }, x: number, y: number, z: number): number {
  const p = [x, y, z];
  const f: number[] = [];
  const i0: number[] = [];
  for (let a = 0; a < 3; a++) {
    const q = (p[a]! - g.origin[a]!) / g.cell;
    if (q < 0 || q > g.n[a]!) return 1;
    const t = Math.min(Math.max(q - 0.5, 0), g.n[a]! - 1);
    i0[a] = Math.min(Math.floor(t), g.n[a]! - 2 < 0 ? 0 : g.n[a]! - 2);
    f[a] = g.n[a]! < 2 ? 0 : t - i0[a]!;
  }
  const at = (ix: number, iy: number, iz: number): number => g.vis[Math.min(ix, g.n[0]! - 1) + g.n[0]! * (Math.min(iy, g.n[1]! - 1) + g.n[1]! * Math.min(iz, g.n[2]! - 1))]! / 255;
  let v = 0;
  for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const w = (dx ? f[0]! : 1 - f[0]!) * (dy ? f[1]! : 1 - f[1]!) * (dz ? f[2]! : 1 - f[2]!);
    if (w > 0) v += w * at(i0[0]! + dx, i0[1]! + dy, i0[2]! + dz);
  }
  return v;
}

/**
 * The smooth level's sky grid (the old voxel structure grid kept): the origin
 * on the brick grid (`brick` m) under the filling shapes' minimum, whole chunks (`chunk` m) up to their maximum, in
 * `cell` cells. The same cell boundaries give the same conservative occupancy, so floors and wall faces read the same
 * sky either way. `bounds(i, out)` writes shape i's bounds (min xyz, max xyz); `fill(i)` says whether it adds solid.
 */
export function skyGridFor(count: number, bounds: (i: number, out: number[]) => void, fill: (i: number) => boolean, brick: number, chunk: number, cell: number): { origin: [number, number, number]; n: [number, number, number] } {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  const bb = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < count; i++) {
    if (!fill(i)) continue;
    bounds(i, bb);
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a]!, bb[a]!);
      hi[a] = Math.max(hi[a]!, bb[a + 3]!);
    }
  }
  if (lo[0] === Infinity) return { origin: [0, 0, 0], n: [1, 1, 1] };
  // (packed shapes are float32: -0.4 reads a hair under, which must not drop the origin a whole brick)
  const origin = [0, 1, 2].map((a) => Math.floor(lo[a]! / brick + 1e-4) * brick) as [number, number, number];
  const n = [0, 1, 2].map((a) => Math.ceil((Math.max(1, Math.ceil((hi[a]! - origin[a]!) / chunk - 1e-4)) * chunk) / cell - 1e-4)) as [number, number, number];
  return { origin, n };
}

/**
 * The shapes the voxel path's sky bake sees, from packed canonical shapes: only the filling pieces at least `minThick`
 * thick on every side (`MIN_VOXELS` x the voxel size: thinner ones stay meshes or go to the fine layer, which bakes no
 * sky). `stride` is `SHAPE_STRIDE` (box: half sizes at 6..8; cylinder, kind 2: radius at 6, half height at 7).
 */
export function skyShapes(packed: Float32Array, stride: number, minThick: number): Float32Array {
  const n = packed.length / stride;
  const keep: number[] = [];
  for (let i = 0; i < n; i++) {
    const o = i * stride;
    if (packed[o + 1] !== 0) continue;
    const t = packed[o] === 2 ? Math.min(packed[o + 6]! * 2, packed[o + 7]! * 2) : Math.min(packed[o + 6]!, packed[o + 7]!, packed[o + 8]!) * 2;
    if (t >= minThick - 1e-6) keep.push(i);
  }
  const out = new Float32Array(keep.length * stride);
  keep.forEach((i, k) => out.set(packed.subarray(i * stride, (i + 1) * stride), k * stride));
  return out;
}

/** The smooth sky bake's grid (voxel-retire: the old 5 cm structure grid kept, so the sky cells are unchanged). */
export const SKY_CELL = 0.5;
export const SKY_GRID = { size: 0.05, brick: 8, chunk: 128, minThick: 1.5 } as const;
