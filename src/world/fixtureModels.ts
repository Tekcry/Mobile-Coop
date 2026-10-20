import type { FittingModel } from './lights';

/**
 * The three prototype light fittings (warehouse-lamps; pure: no Babylon / DOM), built from simple primitives in the
 * fitting's frame: the light at the origin on the emitting face, y up, a bulkhead facing +z with its back on the wall
 * side. Each model is two meshes: the body (one shared dark material, `LightRig`) and the face that glows (the bulbs'
 * emissive material, dark when the light is out). Michael (2026-10-20): "can we create prototype rough quick 3d models
 * for each?" Sizes match `FITTING` in `lampMount.ts` (the mounts and the shot boxes).
 * - dome: an industrial high-bay for the halls: a cap, a shallow cone, the lens recessed inside it.
 * - batten: a fluorescent batten for rooms and corridors: a long housing, a diffuser strip under it.
 * - bulkhead: a caged bulkhead for walls and doors: an oval body, an oval lens, three cage bars across it.
 */

export interface MeshArrays {
  positions: number[];
  normals: number[];
  indices: number[];
}

const empty = (): MeshArrays => ({ positions: [], normals: [], indices: [] });

/** One quad (a, b, c, d counter-clockwise seen from outside) with a flat normal. */
function quad(o: MeshArrays, a: readonly number[], b: readonly number[], c: readonly number[], d: readonly number[], n: readonly number[]): void {
  const i = o.positions.length / 3;
  for (const p of [a, b, c, d]) {
    o.positions.push(p[0]!, p[1]!, p[2]!);
    o.normals.push(n[0]!, n[1]!, n[2]!);
  }
  // Babylon's default winding (clockwise front faces, left-handed): a, c, b / a, d, c
  o.indices.push(i, i + 2, i + 1, i, i + 3, i + 2);
}

/** An axis-aligned box centred on (cx, cy, cz). */
export function boxInto(o: MeshArrays, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): void {
  const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
  quad(o, [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0]);
  quad(o, [x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [0, -1, 0]);
  quad(o, [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]);
  quad(o, [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], [-1, 0, 0]);
  quad(o, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
  quad(o, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]);
}

/**
 * A frustum along y from (h0, r0) to (h1, r1), `seg` sides, elliptical by `ex` (x radius share) and `ez`; capped at
 * the ends asked for. `axisZ` lays it along +z instead (y becomes z: a bulkhead's body and lens).
 */
export function frustumInto(o: MeshArrays, h0: number, h1: number, r0: number, r1: number, seg: number, cap0: boolean, cap1: boolean, ex = 1, ez = 1, axisZ = false): void {
  // in the frustum's own frame (u, h, w): u = x, h along the axis, w = z (or -y when along z)
  const put = (u: number, h: number, w: number): [number, number, number] => (axisZ ? [u, -w, h] : [u, h, w]);
  const slope = (r0 - r1) / Math.max(1e-6, h1 - h0);
  for (let k = 0; k < seg; k++) {
    const a0 = (k / seg) * Math.PI * 2;
    const a1 = ((k + 1) / seg) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    // flat side normal (outward, tilted by the slope)
    const nu = Math.cos(am) / ex, nw = Math.sin(am) / ez;
    const nl = Math.sqrt(nu * nu + slope * slope + nw * nw) || 1;
    const n = put(nu / nl, slope / nl, nw / nl);
    quad(o, put(c0 * r0 * ex, h0, s0 * r0 * ez), put(c0 * r1 * ex, h1, s0 * r1 * ez), put(c1 * r1 * ex, h1, s1 * r1 * ez), put(c1 * r0 * ex, h0, s1 * r0 * ez), n);
  }
  const cap = (h: number, r: number, up: boolean): void => {
    if (r <= 0) return;
    const i = o.positions.length / 3;
    const n = put(0, up ? 1 : -1, 0);
    o.positions.push(...put(0, h, 0));
    o.normals.push(...n);
    for (let k = 0; k <= seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      o.positions.push(...put(Math.cos(a) * r * ex, h, Math.sin(a) * r * ez));
      o.normals.push(...n);
    }
    for (let k = 0; k < seg; k++) {
      if (up) o.indices.push(i, i + 1 + k, i + 2 + k);
      else o.indices.push(i, i + 2 + k, i + 1 + k);
    }
  };
  if (cap0) cap(h0, r0, false);
  if (cap1) cap(h1, r1, true);
}

/** The body and the glowing face of a model, in the fitting's frame (see the module note). */
export function fittingMesh(model: FittingModel): { body: MeshArrays; face: MeshArrays } {
  const body = empty();
  const face = empty();
  if (model === 'dome') {
    frustumInto(body, 0, 0.17, 0.28, 0.09, 20, false, true); // the shade (two-sided: its inside shows from below)
    frustumInto(body, 0.17, 0.26, 0.075, 0.07, 12, false, true); // the driver cap
    frustumInto(face, 0.035, 0.04, 0.22, 0.22, 20, true, false); // the lens, recessed in the shade
  } else if (model === 'batten') {
    boxInto(body, 0, 0.045, 0, 1.25, 0.05, 0.13); // the housing
    boxInto(body, -0.61, 0.012, 0, 0.03, 0.035, 0.11); // end caps
    boxInto(body, 0.61, 0.012, 0, 0.03, 0.035, 0.11);
    boxInto(face, 0, 0.005, 0, 1.19, 0.03, 0.09); // the diffuser
  } else {
    frustumInto(body, -0.1, -0.03, 0.15, 0.14, 16, true, true, 1, 0.66, true); // the oval body (wide, short, on the wall)
    for (const y of [-0.045, 0, 0.045]) boxInto(body, 0, y, 0.015, 0.27, 0.014, 0.014); // the cage bars
    for (const x of [-0.13, 0.13]) boxInto(body, x, 0, -0.01, 0.014, 0.1, 0.05); // the bars' end posts
    frustumInto(face, -0.03, 0.0, 0.12, 0.11, 16, false, true, 1, 0.62, true); // the lens
  }
  return { body, face };
}
