/**
 * Smooth bodies from a voxel field (3.2, pure). A model is a list of rounded primitives (ellipsoids, round cones,
 * rounded boxes), each authored in the space of the joint it belongs to and blended into its neighbours with a smooth
 * minimum. The builder samples the blended signed distance into a voxel grid (in the root space of the bind pose),
 * extracts one continuous surface from it (surface nets: a vertex per surface cell, projected onto the true surface,
 * quads across every sign change), shades it with the field's gradient (smooth normals, no voxel steps), and weights
 * every vertex to up to four joints by how close it lies to each joint's primitives, so the skin bends smoothly at
 * the shoulders, elbows, hips and knees. Colour regions ("paint": suit panels, gloves, boots, the eye opening) are
 * more primitives: a vertex inside one takes its colour.
 */

export type V3 = readonly [number, number, number];

export type PrimShape =
  /** Ellipsoid: centre and radii. */
  | { kind: 'ellipsoid'; c: V3; r: V3 }
  /** Round cone (a capsule when the radii match): end points and their radii. */
  | { kind: 'cone'; a: V3; b: V3; ra: number; rb: number }
  /** Rounded box: centre, half extents, edge radius. */
  | { kind: 'box'; c: V3; h: V3; round: number };

export interface Prim {
  shape: PrimShape;
  /** Index of the joint whose space it is authored in (and which it follows). */
  joint: number;
  /** Colour slot (palette index) where it shows. */
  color: number;
  /** Smooth-union radius with what came before (m). */
  blend: number;
  /** Keep only y >= this in joint space (a flat boot sole). */
  clipBelow?: number;
}

export interface Paint {
  shape: PrimShape;
  joint: number;
  color: number;
}

export interface ModelDef {
  prims: readonly Prim[];
  paints: readonly Paint[];
  /** Per joint: its bind-pose transform into root space (Babylon `Matrix.m` layout, rigid). */
  joints: readonly Float32Array[];
}

export interface BodyMesh {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  /** Per vertex: colour slot. */
  colors: Uint8Array;
  /** Per vertex: four joint indices and weights (summing to 1). */
  boneIdx: Uint8Array;
  boneW: Float32Array;
  /** Per vertex: the joint with the largest weight. */
  dominant: Uint8Array;
  /** Root-space bounds: min x y z, max x y z. */
  bounds: [number, number, number, number, number, number];
}

// ---------------------------------------------------------------------------------------------- maths (no allocation)

/** p * M (Babylon row-vector convention), into `o`. */
function xform(m: Float32Array, x: number, y: number, z: number, o: number[]): void {
  o[0] = x * m[0]! + y * m[4]! + z * m[8]! + m[12]!;
  o[1] = x * m[1]! + y * m[5]! + z * m[9]! + m[13]!;
  o[2] = x * m[2]! + y * m[6]! + z * m[10]! + m[14]!;
}

/** Inverse of a rigid transform (rotation + translation). */
export function rigidInverse(m: Float32Array): Float32Array {
  const o = new Float32Array(16);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 4 + c] = m[c * 4 + r]!;
  const tx = m[12]!;
  const ty = m[13]!;
  const tz = m[14]!;
  o[12] = -(tx * o[0]! + ty * o[4]! + tz * o[8]!);
  o[13] = -(tx * o[1]! + ty * o[5]! + tz * o[9]!);
  o[14] = -(tx * o[2]! + ty * o[6]! + tz * o[10]!);
  o[15] = 1;
  return o;
}

/** Signed distance of a shape at a local point (an ellipsoid's is the usual first-order bound). */
export function shapeDistance(s: PrimShape, x: number, y: number, z: number): number {
  switch (s.kind) {
    case 'ellipsoid': {
      const px = (x - s.c[0]) / s.r[0];
      const py = (y - s.c[1]) / s.r[1];
      const pz = (z - s.c[2]) / s.r[2];
      const k0 = Math.sqrt(px * px + py * py + pz * pz);
      const qx = px / s.r[0];
      const qy = py / s.r[1];
      const qz = pz / s.r[2];
      const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz);
      return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(s.r[0], s.r[1], s.r[2]);
    }
    case 'cone': {
      // round cone (sphere-swept segment with linearly varying radius)
      const bax = s.b[0] - s.a[0];
      const bay = s.b[1] - s.a[1];
      const baz = s.b[2] - s.a[2];
      const pax = x - s.a[0];
      const pay = y - s.a[1];
      const paz = z - s.a[2];
      const l2 = bax * bax + bay * bay + baz * baz;
      const rr = s.ra - s.rb;
      const a2 = l2 - rr * rr;
      const il2 = 1 / l2;
      const yy = pax * bax + pay * bay + paz * baz;
      const zz = yy - l2;
      const cx = pax * l2 - bax * yy;
      const cy = pay * l2 - bay * yy;
      const cz = paz * l2 - baz * yy;
      const x2 = cx * cx + cy * cy + cz * cz;
      const y2 = yy * yy * l2;
      const z2 = zz * zz * l2;
      const k = Math.sign(rr) * rr * rr * x2;
      if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - s.rb;
      if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - s.ra;
      return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - s.ra;
    }
    case 'box': {
      const qx = Math.abs(x - s.c[0]) - s.h[0] + s.round;
      const qy = Math.abs(y - s.c[1]) - s.h[1] + s.round;
      const qz = Math.abs(z - s.c[2]) - s.h[2] + s.round;
      const ox = Math.max(qx, 0);
      const oy = Math.max(qy, 0);
      const oz = Math.max(qz, 0);
      return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - s.round;
    }
  }
}

/** Polynomial smooth minimum (radius k; k = 0 is a plain union). */
export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Local bounding box of a shape: min x y z, max x y z. */
function shapeBox(s: PrimShape): number[] {
  switch (s.kind) {
    case 'ellipsoid':
      return [s.c[0] - s.r[0], s.c[1] - s.r[1], s.c[2] - s.r[2], s.c[0] + s.r[0], s.c[1] + s.r[1], s.c[2] + s.r[2]];
    case 'cone': {
      const r = Math.max(s.ra, s.rb);
      return [Math.min(s.a[0], s.b[0]) - r, Math.min(s.a[1], s.b[1]) - r, Math.min(s.a[2], s.b[2]) - r, Math.max(s.a[0], s.b[0]) + r, Math.max(s.a[1], s.b[1]) + r, Math.max(s.a[2], s.b[2]) + r];
    }
    case 'box':
      return [s.c[0] - s.h[0], s.c[1] - s.h[1], s.c[2] - s.h[2], s.c[0] + s.h[0], s.c[1] + s.h[1], s.c[2] + s.h[2]];
  }
}

// --------------------------------------------------------------------------------------------------------- builder

const BIG = 1e3;

export class VoxelModelBuilder {
  constructor(
    /** Voxel edge of the sampled field (m). */
    readonly size: number,
    /** How far (m) a joint's primitives pull on the skin around them (weights fade to 0 at this distance). */
    readonly weightReach = 0.035,
  ) {}

  build(def: ModelDef): BodyMesh {
    const inv = def.joints.map(rigidInverse);
    const n = def.prims.length;
    // each primitive's root-space box (its local box's corners transformed), grown by its blend
    const boxes = new Float32Array(n * 6);
    const o = [0, 0, 0];
    const lo = [BIG, BIG, BIG];
    const hi = [-BIG, -BIG, -BIG];
    def.prims.forEach((p, i) => {
      const b = shapeBox(p.shape);
      const g = p.blend + this.size;
      const m = def.joints[p.joint]!;
      for (let a = 0; a < 3; a++) {
        boxes[i * 6 + a] = BIG;
        boxes[i * 6 + 3 + a] = -BIG;
      }
      for (let c = 0; c < 8; c++) {
        xform(m, b[c & 1 ? 3 : 0]!, b[c & 2 ? 4 : 1]!, b[c & 4 ? 5 : 2]!, o);
        for (let a = 0; a < 3; a++) {
          boxes[i * 6 + a] = Math.min(boxes[i * 6 + a]!, o[a]! - g);
          boxes[i * 6 + 3 + a] = Math.max(boxes[i * 6 + 3 + a]!, o[a]! + g);
        }
      }
      for (let a = 0; a < 3; a++) {
        lo[a] = Math.min(lo[a]!, boxes[i * 6 + a]!);
        hi[a] = Math.max(hi[a]!, boxes[i * 6 + 3 + a]!);
      }
    });
    const prim = (i: number, x: number, y: number, z: number): number => {
      const p = def.prims[i]!;
      xform(inv[p.joint]!, x, y, z, o);
      let d = shapeDistance(p.shape, o[0]!, o[1]!, o[2]!);
      if (p.clipBelow !== undefined) d = Math.max(d, p.clipBelow - o[1]!);
      return d;
    };
    const inBox = (i: number, x: number, y: number, z: number): boolean =>
      x >= boxes[i * 6]! && y >= boxes[i * 6 + 1]! && z >= boxes[i * 6 + 2]! && x <= boxes[i * 6 + 3]! && y <= boxes[i * 6 + 4]! && z <= boxes[i * 6 + 5]!;
    /** The blended field at a point (the same chain the grid ran). */
    const field = (x: number, y: number, z: number): number => {
      let f = BIG;
      for (let i = 0; i < n; i++) if (inBox(i, x, y, z)) f = smin(f, prim(i, x, y, z), def.prims[i]!.blend);
      return f;
    };

    // ---- sample the field on the grid's points (each primitive only over its own box)
    const h = this.size;
    const ox = lo[0]! - h;
    const oy = lo[1]! - h;
    const oz = lo[2]! - h;
    const nx = Math.ceil((hi[0]! - lo[0]!) / h) + 3;
    const ny = Math.ceil((hi[1]! - lo[1]!) / h) + 3;
    const nz = Math.ceil((hi[2]! - lo[2]!) / h) + 3;
    const F = new Float32Array(nx * ny * nz).fill(BIG);
    for (let i = 0; i < n; i++) {
      const k = def.prims[i]!.blend;
      const i0 = Math.max(0, Math.floor((boxes[i * 6]! - ox) / h));
      const j0 = Math.max(0, Math.floor((boxes[i * 6 + 1]! - oy) / h));
      const k0 = Math.max(0, Math.floor((boxes[i * 6 + 2]! - oz) / h));
      const i1 = Math.min(nx - 1, Math.ceil((boxes[i * 6 + 3]! - ox) / h));
      const j1 = Math.min(ny - 1, Math.ceil((boxes[i * 6 + 4]! - oy) / h));
      const k1 = Math.min(nz - 1, Math.ceil((boxes[i * 6 + 5]! - oz) / h));
      for (let kz = k0; kz <= k1; kz++)
        for (let jy = j0; jy <= j1; jy++)
          for (let ix = i0; ix <= i1; ix++) {
            const g = ix + nx * (jy + ny * kz);
            F[g] = smin(F[g]!, prim(i, ox + ix * h, oy + jy * h, oz + kz * h), k);
          }
    }

    // ---- surface nets: a vertex in every cell the surface crosses
    const cellV = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
    const P: number[] = [];
    const at = (i: number, j: number, k: number): number => F[i + nx * (j + ny * k)]!;
    for (let k = 0; k < nz - 1; k++)
      for (let j = 0; j < ny - 1; j++)
        for (let i = 0; i < nx - 1; i++) {
          let inside = 0;
          for (let c = 0; c < 8; c++) if (at(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1)) < 0) inside++;
          if (inside === 0 || inside === 8) continue;
          // average of the edge crossings
          let sx = 0;
          let sy = 0;
          let sz = 0;
          let cnt = 0;
          for (let e = 0; e < 12; e++) {
            const ax = e >> 2;
            const u = e & 1;
            const v = (e >> 1) & 1;
            const c0 = ax === 0 ? [0, u, v] : ax === 1 ? [u, 0, v] : [u, v, 0];
            const c1 = [c0[0]! + (ax === 0 ? 1 : 0), c0[1]! + (ax === 1 ? 1 : 0), c0[2]! + (ax === 2 ? 1 : 0)];
            const f0 = at(i + c0[0]!, j + c0[1]!, k + c0[2]!);
            const f1 = at(i + c1[0]!, j + c1[1]!, k + c1[2]!);
            if (f0 < 0 === f1 < 0) continue;
            const t = f0 / (f0 - f1);
            sx += c0[0]! + (c1[0]! - c0[0]!) * t;
            sy += c0[1]! + (c1[1]! - c0[1]!) * t;
            sz += c0[2]! + (c1[2]! - c0[2]!) * t;
            cnt++;
          }
          cellV[i + (nx - 1) * (j + (ny - 1) * k)] = P.length / 3;
          P.push(ox + (i + sx / cnt) * h, oy + (j + sy / cnt) * h, oz + (k + sz / cnt) * h);
        }
    const nv = P.length / 3;
    const positions = new Float32Array(P);
    const normals = new Float32Array(nv * 3);
    // project onto the true surface along the gradient (two Newton steps), then the gradient is the normal
    const e = h * 0.25;
    const grad = (x: number, y: number, z: number, out: number[]): void => {
      out[0] = field(x + e, y, z) - field(x - e, y, z);
      out[1] = field(x, y + e, z) - field(x, y - e, z);
      out[2] = field(x, y, z + e) - field(x, y, z - e);
      const l = Math.sqrt(out[0]! * out[0]! + out[1]! * out[1]! + out[2]! * out[2]!) || 1;
      out[0]! /= l;
      out[1]! /= l;
      out[2]! /= l;
    };
    const gv = [0, 0, 0];
    for (let v = 0; v < nv; v++) {
      let x = positions[v * 3]!;
      let y = positions[v * 3 + 1]!;
      let z = positions[v * 3 + 2]!;
      for (let it = 0; it < 2; it++) {
        const f = field(x, y, z);
        if (Math.abs(f) > h) break;
        grad(x, y, z, gv);
        x -= gv[0]! * f;
        y -= gv[1]! * f;
        z -= gv[2]! * f;
      }
      positions[v * 3] = x;
      positions[v * 3 + 1] = y;
      positions[v * 3 + 2] = z;
      grad(x, y, z, gv);
      normals[v * 3] = gv[0]!;
      normals[v * 3 + 1] = gv[1]!;
      normals[v * 3 + 2] = gv[2]!;
    }

    // ---- quads across every grid edge with a sign change (the four cells round it), wound to face outward
    const I: number[] = [];
    const cv = (i: number, j: number, k: number): number => cellV[i + (nx - 1) * (j + (ny - 1) * k)]!;
    const quad = (a: number, b: number, c: number, d: number): void => {
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      // Babylon's front face: (B - A) x (C - A) points against the outward normal
      const ax = positions[a * 3]!;
      const ay = positions[a * 3 + 1]!;
      const az = positions[a * 3 + 2]!;
      const ux = positions[b * 3]! - ax;
      const uy = positions[b * 3 + 1]! - ay;
      const uz = positions[b * 3 + 2]! - az;
      const vx = positions[c * 3]! - ax;
      const vy = positions[c * 3 + 1]! - ay;
      const vz = positions[c * 3 + 2]! - az;
      const cx = uy * vz - uz * vy;
      const cy = uz * vx - ux * vz;
      const cz = ux * vy - uy * vx;
      const nxs = normals[a * 3]! + normals[b * 3]! + normals[c * 3]! + normals[d * 3]!;
      const nys = normals[a * 3 + 1]! + normals[b * 3 + 1]! + normals[c * 3 + 1]! + normals[d * 3 + 1]!;
      const nzs = normals[a * 3 + 2]! + normals[b * 3 + 2]! + normals[c * 3 + 2]! + normals[d * 3 + 2]!;
      if (cx * nxs + cy * nys + cz * nzs > 0) I.push(a, c, b, a, d, c);
      else I.push(a, b, c, a, c, d);
    };
    for (let k = 1; k < nz - 1; k++)
      for (let j = 1; j < ny - 1; j++)
        for (let i = 1; i < nx - 1; i++) {
          const f0 = at(i, j, k) < 0;
          if (f0 !== at(i + 1, j, k) < 0 && i < nx - 1) quad(cv(i, j - 1, k - 1), cv(i, j, k - 1), cv(i, j, k), cv(i, j - 1, k));
          if (f0 !== at(i, j + 1, k) < 0 && j < ny - 1) quad(cv(i - 1, j, k - 1), cv(i, j, k - 1), cv(i, j, k), cv(i - 1, j, k));
          if (f0 !== at(i, j, k + 1) < 0 && k < nz - 1) quad(cv(i - 1, j - 1, k), cv(i, j - 1, k), cv(i, j, k), cv(i - 1, j, k));
        }

    // ---- skin weights, colour
    const colors = new Uint8Array(nv);
    const boneIdx = new Uint8Array(nv * 4);
    const boneW = new Float32Array(nv * 4);
    const dominant = new Uint8Array(nv);
    const nj = def.joints.length;
    const wj = new Float32Array(nj);
    const R = this.weightReach;
    const bounds: BodyMesh['bounds'] = [BIG, BIG, BIG, -BIG, -BIG, -BIG];
    for (let v = 0; v < nv; v++) {
      const x = positions[v * 3]!;
      const y = positions[v * 3 + 1]!;
      const z = positions[v * 3 + 2]!;
      for (let a = 0; a < 3; a++) {
        bounds[a] = Math.min(bounds[a]!, positions[v * 3 + a]!);
        bounds[a + 3] = Math.max(bounds[a + 3]!, positions[v * 3 + a]!);
      }
      wj.fill(0);
      let best = BIG;
      let bestP = 0;
      for (let i = 0; i < n; i++) {
        if (!inBox(i, x, y, z)) continue;
        const d = prim(i, x, y, z);
        if (d < best) {
          best = d;
          bestP = i;
        }
        const t = 1 - Math.max(0, d) / R;
        if (t > 0) {
          const j = def.prims[i]!.joint;
          wj[j] = Math.max(wj[j]!, t * t);
        }
      }
      const bp = def.prims[bestP]!;
      wj[bp.joint] = Math.max(wj[bp.joint]!, 1e-3);
      // the four strongest, normalised
      let sum = 0;
      for (let s = 0; s < 4; s++) {
        let bj = -1;
        let bw = 0;
        for (let j = 0; j < nj; j++)
          if (wj[j]! > bw) {
            bw = wj[j]!;
            bj = j;
          }
        if (bj < 0) break;
        boneIdx[v * 4 + s] = bj;
        boneW[v * 4 + s] = bw;
        sum += bw;
        wj[bj] = 0;
      }
      for (let s = 0; s < 4; s++) boneW[v * 4 + s] = boneW[v * 4 + s]! / sum;
      dominant[v] = boneIdx[v * 4]!;
      // colour: the nearest primitive's, then any paint the vertex lies in
      let col = bp.color;
      for (const p of def.paints) {
        xform(inv[p.joint]!, x, y, z, o);
        if (shapeDistance(p.shape, o[0]!, o[1]!, o[2]!) <= 0) col = p.color;
      }
      colors[v] = col;
    }
    return { positions, normals, indices: Uint32Array.from(I), colors, boneIdx, boneW, dominant, bounds };
  }
}
