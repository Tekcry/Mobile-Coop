/**
 * (guard-models G7, A6) The dropped helmet's mesh with the guard figures: helmet_std's own triangles cut out of a guard
 * base's LOD1 file (the average base, else the lean one: broad has helmet_heavy only, which has no drop anchor, so every
 * kind drops helmet_std), centred on its box, over the base's shared material, drawn as instances by `HelmetDrops`.
 * (G7b) The colour is per instance (`registerInstancedBuffer('color')`, `helmetDropColour`): a heavy's or enforcer's
 * dark helmet and the faction helmet of the rest never bleed into each other through the shared source mesh. Built once
 * per scene on the first drop (load time); null until it is in, and while Wren stands in (no helmet_std piece):
 * `HelmetDrops` keeps its box then.
 */
import { Color4, Mesh, VertexData, type InstancedMesh, type PBRMaterial, type Scene } from '../core/babylon';
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
  /** (map-ready S3) The load started by the first call: true once `src` is built, false with none or on a failure. */
  ready: Promise<boolean>;
  /** (map-ready S3) `helmetDropReady`'s one disabled instance (kept for the scene's life). */
  warm: InstancedMesh | null;
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
export function helmetDropSource(scene: Scene): HelmetMeshSource | null {
  let e = BY_SCENE.get(scene);
  if (!e) {
    const entry: Entry = { src: null, ready: Promise.resolve(false), warm: null };
    e = entry;
    BY_SCENE.set(scene, e);
    const m = helmetManifest();
    const url = m?.urls[LOD_1];
    if (m && url) {
      entry.ready = Promise.all([guardLibrary(scene).load(m, LOD_1), loadModel(url)])
        .then(([asset, model]) => {
          if (!scene.isDisposed) entry.src = buildHelmetDropMesh(scene, model, m, asset.materials[0] ?? null);
          return entry.src !== null;
        })
        .catch((err: unknown) => {
          console.warn('[guards] helmet drop mesh not built (the box stays)', err);
          return false;
        });
    }
  }
  if (e.src?.mesh.isDisposed()) e.src = null;
  return e.src;
}

/** (map-ready S3) Starts the helmet_std drop mesh's load now (as the first drop would) and resolves true once it is built
 *  with one disabled warm instance (the drop's instanced variant compiles in the gate), false when the build has no
 *  helmet_std file or the load failed. Never rejects. */
export function helmetDropReady(scene: Scene): Promise<boolean> {
  // (the same entry and load as `helmetDropSource`: one load per scene, a later first drop takes its mesh)
  helmetDropSource(scene);
  const e = BY_SCENE.get(scene)!;
  return e.ready.then(
    (ok) => {
      const src = e.src;
      if (!ok || !src || src.mesh.isDisposed() || scene.isDisposed) return false;
      if (!e.warm) {
        // never drawn, never picked; with it the source draws through instances, so the gate's sweep compiles that variant
        const w = helmetDropInstance(src, '#808080', 'helmet-drop-warm');
        w.setEnabled(false);
        w.isPickable = false;
        e.warm = w;
      }
      return true;
    },
    () => false,
  );
}

function nibble(c: number): number {
  return c <= 57 ? c - 48 : (c | 32) - 87;
}

/**
 * A drop's colour from its helmet hex (`#rrggbb`, sRGB): over the fabric neutral the helmet shell sits on, linear,
 * clamped to 1 (the instance colour multiplies the albedo). Into `out`; no allocation (a drop reuses its instance).
 */
export function helmetDropColour(hex: string, out: Color4): Color4 {
  for (let i = 0; i < 3; i++) {
    const b = (nibble(hex.charCodeAt(1 + i * 2)) << 4) | nibble(hex.charCodeAt(2 + i * 2));
    const v = srgbToLinear(b / 255) / FABRIC_NEUTRAL;
    const c = v < 1 ? v : 1;
    if (i === 0) out.r = c;
    else if (i === 1) out.g = c;
    else out.b = c;
  }
  out.a = 1;
  return out;
}

/** One drop: an instance of `src` with its own colour (`hex`). Load / pool-growth time (allocates). */
export function helmetDropInstance(src: HelmetMeshSource, hex: string, name: string): InstancedMesh {
  const m = src.mesh.createInstance(name);
  m.instancedBuffers.color = helmetDropColour(hex, new Color4());
  return m;
}

/** Recolours a drop made by `helmetDropInstance` in place (a reused drop of another guard). No allocation. */
export function setHelmetDropColour(m: InstancedMesh, hex: string): void {
  const c = m.instancedBuffers.color as Color4 | undefined;
  if (c) helmetDropColour(hex, c);
}

/**
 * helmet_std's triangles from `model` (a guard base's LOD file; `_PIECE` per vertex) as one static mesh centred on its
 * box over `material`, coloured per instance (`helmetDropInstance`), hidden itself (its instances draw). Null when the
 * file has no helmet_std piece. Load time (allocates).
 */
export function buildHelmetDropMesh(scene: Scene, model: GlbModel, manifest: GuardManifest, material: PBRMaterial | null): HelmetMeshSource | null {
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
  const mesh = new Mesh('helmet-drop-src', scene);
  const vd = new VertexData();
  vd.positions = pos;
  vd.normals = nrm;
  vd.uvs = uv;
  vd.indices = idx;
  vd.applyToMesh(mesh, false);
  // (G7b) no vertex colour: each drop carries its own (one shared colour per source would bleed between kinds)
  mesh.registerInstancedBuffer('color', 4);
  mesh.instancedBuffers.color = new Color4(1, 1, 1, 1);
  mesh.hasVertexAlpha = false;
  if (material) mesh.material = material;
  mesh.isPickable = false;
  mesh.receiveShadows = true;
  mesh.isVisible = false; // the source: its instances draw
  return { mesh, w: hi[0]! - lo[0]!, h: hi[1]! - lo[1]!, d: hi[2]! - lo[2]! };
}
