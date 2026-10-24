/**
 * (marlow-final S9 perf, render only) Static batching for the facility kit and the props kit: every placement of every
 * (piece, material) pair that never moves and is not tinted per instance is baked into ONE mesh per material
 * (`bakeParts`), instead of one thin-instanced draw per (piece, material). Same triangles, same look (normals go
 * through the instance matrix exactly as Babylon's instanced vertex shader does: its 3 x 3 part, renormalised), far
 * fewer draws per pass (the scene pass and the G-buffer). Pure: no Babylon at run time.
 *
 * The draw order (`skinsFirst`): the kit's and props' opaque materials are drawn before the rest of the opaque queue,
 * so the level boxes under a skin (a clad wall's box, a prop's box 1 cm inside it) fail the depth test instead of
 * running the level's whole lit shader (lamp loop, triplanar surfaces) and then being drawn over.
 */
import type { Material, Scene, SubMesh } from '../../core/babylon';

/** One GLB mesh's arrays (positions and normals xyz, triangle indices). */
export interface BakeGeo {
  positions: ArrayLike<number>;
  normals: ArrayLike<number>;
  indices: ArrayLike<number>;
}

/** A mesh and the instance matrices to bake it at (16 floats each, Babylon's layout as `kitMatrix` / `propMatrix` write). */
export interface BakePart {
  geo: BakeGeo;
  matrices: Float32Array;
  count: number;
}

export interface Baked {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

/** Bakes every instance of every part into one vertex / index set (world space). Load time only. */
export function bakeParts(parts: readonly BakePart[]): Baked {
  let nv = 0;
  let ni = 0;
  for (const p of parts) {
    nv += (p.geo.positions.length / 3) * p.count;
    ni += p.geo.indices.length * p.count;
  }
  const pos = new Float32Array(nv * 3);
  const nrm = new Float32Array(nv * 3);
  const idx = new Uint32Array(ni);
  let base = 0;
  let k = 0;
  for (const p of parts) {
    const P = p.geo.positions;
    const N = p.geo.normals;
    const I = p.geo.indices;
    const gv = P.length / 3;
    const M = p.matrices;
    for (let n = 0; n < p.count; n++) {
      const o = n * 16;
      const m0 = M[o]!, m1 = M[o + 1]!, m2 = M[o + 2]!;
      const m4 = M[o + 4]!, m5 = M[o + 5]!, m6 = M[o + 6]!;
      const m8 = M[o + 8]!, m9 = M[o + 9]!, m10 = M[o + 10]!;
      const tx = M[o + 12]!, ty = M[o + 13]!, tz = M[o + 14]!;
      for (let i = 0; i < gv; i++) {
        const s = i * 3;
        const d = (base + i) * 3;
        const x = P[s]!, y = P[s + 1]!, z = P[s + 2]!;
        pos[d] = x * m0 + y * m4 + z * m8 + tx;
        pos[d + 1] = x * m1 + y * m5 + z * m9 + ty;
        pos[d + 2] = x * m2 + y * m6 + z * m10 + tz;
        const a = N[s]!, b = N[s + 1]!, c = N[s + 2]!;
        let nx = a * m0 + b * m4 + c * m8;
        let ny = a * m1 + b * m5 + c * m9;
        let nz = a * m2 + b * m6 + c * m10;
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (l > 0) {
          nx /= l;
          ny /= l;
          nz /= l;
        }
        nrm[d] = nx;
        nrm[d + 1] = ny;
        nrm[d + 2] = nz;
      }
      for (let i = 0; i < I.length; i++) idx[k++] = I[i]! + base;
      base += gv;
    }
  }
  return { positions: pos, normals: nrm, indices: idx };
}

/** Marks a kit / props opaque material: drawn ahead of the rest of the opaque queue (`skinsFirst`). */
export function markDrawFirst(m: Material): void {
  m.metadata = { ...(m.metadata as object | null), drawFirst: true };
}

const rank = (s: SubMesh): number => ((s.getMesh().material?.metadata as { drawFirst?: boolean } | null | undefined)?.drawFirst ? 0 : 1);

/** Babylon's default opaque order (`RenderingGroup.PainterSortCompare`: by material, then mesh) with the skins first. */
export function skinsFirst(a: SubMesh, b: SubMesh): number {
  const d = rank(a) - rank(b);
  if (d !== 0) return d;
  const ma = a.getMesh();
  const mb = b.getMesh();
  if (ma.material && mb.material) return ma.material.uniqueId - mb.material.uniqueId;
  return ma.uniqueId - mb.uniqueId;
}

/** The scene's main opaque queue (rendering group 0) in `skinsFirst` order; the alpha-test and transparent queues keep
 *  Babylon's defaults. Idempotent (the kit and the props both call it). */
export function useSkinsFirst(scene: Scene): void {
  scene.setRenderingOrder(0, skinsFirst);
}
