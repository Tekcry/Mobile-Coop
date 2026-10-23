/**
 * (guard-models G7, A6) The dropped helmet's mesh with the guard figures: helmet_std's own triangles cut out of a guard
 * base's LOD1 file (the average base, else the lean one: broad has helmet_heavy only, which has no drop anchor, so every
 * kind drops helmet_std), centred on its box, in the faction's helmet colour (vertex colour over the base's shared
 * material: one faction per map), drawn as instances by `HelmetDrops`. Built once per scene on the first drop (load
 * time); null until it is in, and while Wren stands in (no helmet_std piece): `HelmetDrops` keeps its box then.
 */
import { Mesh, VertexBuffer, VertexData, type PBRMaterial, type Scene } from '../core/babylon';
import type { GlbModel } from '../operators/lab/glb';
import { loadModel } from '../operators/runtime/figure';
import { guardLibrary, type GuardGlbMesh } from '../operators/runtime/guardFigure';
import { LOD_1 } from '../operators/runtime/manifest';
import { guardAsset } from '../operators/guards/guardAssets';
import type { GuardBase, GuardManifest } from '../operators/guards/gearMask';
import { srgbToLinear } from '../operators/guards/guardTints';

/** A drop mesh and its own box size (m): `HelmetDrops` scales each drop to the box it is asked for. */
export interface HelmetMeshSource {
  mesh: Mesh;
  w: number;
  h: number;
  d: number;
}

const HELMET = 'helmet_std';
const HELMET_BASES: readonly GuardBase[] = ['average', 'lean'];
/** The fabric slots' neutral (SPEC 8): the helmet shell sits on the neutral grey; the colour over it is its tint. */
const FABRIC_NEUTRAL = 0.4;

interface Entry {
  src: HelmetMeshSource | null;
}
const BY_SCENE = new WeakMap<Scene, Entry>();

/** The first guard base in this build whose files hold helmet_std (null: Wren stands in, or none has it). */
export function helmetManifest(): GuardManifest | null {
  for (const b of HELMET_BASES) {
    const a = guardAsset(b);
    if (!a.standIn && a.manifest.pieces.includes(HELMET)) return a.manifest;
  }
  return null;
}

/** The scene's helmet drop mesh, or null (loading, or none in the build). The first call starts the load. */
export function helmetDropSource(scene: Scene, hex: string): HelmetMeshSource | null {
  let e = BY_SCENE.get(scene);
  if (!e) {
    e = { src: null };
    BY_SCENE.set(scene, e);
    const m = helmetManifest();
    const url = m?.urls[LOD_1];
    if (m && url) {
      const entry = e;
      Promise.all([guardLibrary(scene).load(m, LOD_1), loadModel(url)])
        .then(([asset, model]) => {
          if (!scene.isDisposed) entry.src = buildHelmetDropMesh(scene, model, m, asset.materials[0] ?? null, hex);
        })
        .catch((err: unknown) => console.warn('[guards] helmet drop mesh not built (the box stays)', err));
    }
  }
  if (e.src?.mesh.isDisposed()) e.src = null;
  return e.src;
}

/**
 * helmet_std's triangles from `model` (a guard base's LOD file; `_PIECE` per vertex) as one static mesh centred on its
 * box, coloured `hex` (sRGB, the faction's helmet) over `material`, hidden itself (its instances draw). Null when the
 * file has no helmet_std piece. Load time (allocates).
 */
export function buildHelmetDropMesh(scene: Scene, model: GlbModel, manifest: GuardManifest, material: PBRMaterial | null, hex: string): HelmetMeshSource | null {
  const pi = manifest.pieces.indexOf(HELMET);
  const g = model.meshes[0] as GuardGlbMesh | undefined;
  if (pi < 0 || !g?.piece) return null;
  const piece = g.piece;
  const remap = new Int32Array(piece.length).fill(-1);
  const idx: number[] = [];
  let nv = 0;
  for (let t = 0; t + 2 < g.indices.length; t += 3) {
    if (piece[g.indices[t]!] !== pi) continue;
    for (let k = 0; k < 3; k++) {
      const v = g.indices[t + k]!;
      if (remap[v]! < 0) remap[v] = nv++;
      idx.push(remap[v]!);
    }
  }
  if (!nv) return null;
  const pos = new Float32Array(nv * 3);
  const nrm = new Float32Array(nv * 3);
  const uv = new Float32Array(nv * 2);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < piece.length; v++) {
    const o = remap[v]!;
    if (o < 0) continue;
    for (let a = 0; a < 3; a++) {
      const x = g.positions[v * 3 + a]!;
      pos[o * 3 + a] = x;
      nrm[o * 3 + a] = g.normals[v * 3 + a]!;
      if (x < lo[a]!) lo[a] = x;
      if (x > hi[a]!) hi[a] = x;
    }
    uv[o * 2] = g.uvs[v * 2]!;
    uv[o * 2 + 1] = g.uvs[v * 2 + 1]!;
  }
  for (let o = 0; o < nv; o++) for (let a = 0; a < 3; a++) pos[o * 3 + a] = pos[o * 3 + a]! - (lo[a]! + hi[a]!) / 2;
  const col = new Float32Array(nv * 4);
  const tint = [0, 1, 2].map((i) => Math.min(1, srgbToLinear(parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255) / FABRIC_NEUTRAL));
  for (let o = 0; o < nv; o++) {
    col[o * 4] = tint[0]!;
    col[o * 4 + 1] = tint[1]!;
    col[o * 4 + 2] = tint[2]!;
    col[o * 4 + 3] = 1;
  }
  const mesh = new Mesh('helmet-drop-src', scene);
  const vd = new VertexData();
  vd.positions = pos;
  vd.normals = nrm;
  vd.uvs = uv;
  vd.indices = idx;
  vd.applyToMesh(mesh, false);
  mesh.setVerticesData(VertexBuffer.ColorKind, col, false, 4);
  mesh.hasVertexAlpha = false;
  if (material) mesh.material = material;
  mesh.isPickable = false;
  mesh.receiveShadows = true;
  mesh.isVisible = false; // the source: its instances draw
  return { mesh, w: hi[0]! - lo[0]!, h: hi[1]! - lo[1]!, d: hi[2]! - lo[2]! };
}
