import { Matrix, Mesh, Quaternion, VertexBuffer, type Color4, type InstancedMesh, type Scene } from '../core/babylon';
import { flags } from '../core/flags';
import type { SmoothBodyLibrary } from '../player/smoothBody';
import { mergeParts, type MergedBody, type MergePart } from '../player/smoothBodyMerge';
import type { WeaponModel } from '../weapons/weaponModel';

/**
 * (sector-redesign perfg) A guard's gun as ONE instance of a merged mesh instead of its ~18 part instances (each was
 * evaluated, bounded and instanced per pass, under a hand chain the anim moves every frame). The parts' unit meshes are
 * merged once per (library, gun type, colours, world scale) with `mergeParts` (the merged guard body's pure merge):
 * per-vertex colour, `pattern`, `color2` and the pattern / surface space (`ppos` / `pnrm`, `SmoothBodyPlugin`) are the
 * instance values. The gun parts drew with `partMat` (`partLibrary.ts:103,115`); the merged gun moves them to
 * `partSkinMat` (the same `make()` settings plus the voxel / smooth plugins), as the merged body does, with the
 * ENEMY_GUN colours kept as they were. That the look is unchanged rests on the GPU look shot, not on this code.
 * Hi and low LOD as the part bases had (`trackLod`). Every guard's gun is an instance of that source under his gun
 * node (it follows the hand, holster and travel as the parts did; the node's `setVisible` hides it);
 * the parts stay for what reads them, disabled. `?guardmerge=0`: the parts, as before. Build time only.
 */

/** Merged sources per part library (keyed by the parts' shapes, places and instance values). */
const SOURCES = new WeakMap<SmoothBodyLibrary, Map<string, Mesh>>();

const tmpQ = new Quaternion();

/** Swap `gun`'s parts for one instance of its merged mesh; null (the parts stay) when off, or the gun renders a baked
 *  mesh / voxel model, or a part is not a library instance directly on the gun's node. */
export function mergeGun(scene: Scene, gun: WeaponModel, name: string): InstancedMesh | null {
  if (!flags.guardMerge) return null;
  const parts = gun.parts;
  if (!parts.length || gun.renderMeshes !== parts) return null;
  const src0 = (parts[0] as InstancedMesh).sourceMesh as Mesh | undefined;
  const lib = (src0?.metadata as { library?: SmoothBodyLibrary } | null | undefined)?.library;
  if (!lib || !src0) return null;
  const hiParts: MergePart[] = [];
  const loParts: MergePart[] = [];
  const key: string[] = [];
  for (const p of parts) {
    const part = p as InstancedMesh;
    const src = part.sourceMesh as Mesh | undefined;
    if (!src || part.parent !== gun.node) return null;
    const pos = src.getVerticesData(VertexBuffer.PositionKind);
    const nrm = src.getVerticesData(VertexBuffer.NormalKind);
    const idx = src.getIndices();
    if (!pos || !nrm || !idx) return null;
    const q = part.rotationQuaternion ?? Quaternion.FromEulerVectorToRef(part.rotation, tmpQ);
    const m = Matrix.Compose(part.scaling, q, part.position).m;
    part.computeWorldMatrix(true);
    const w = part.getWorldMatrix().m;
    const patScale = [0, 1, 2].map((r) => Math.sqrt(w[r * 4]! ** 2 + w[r * 4 + 1]! ** 2 + w[r * 4 + 2]! ** 2));
    const c = part.instancedBuffers?.color as Color4 | undefined;
    const pt = part.instancedBuffers?.pattern as { x: number; y: number; z: number; w: number } | undefined;
    const c2 = part.instancedBuffers?.color2 as Color4 | undefined;
    const vals = {
      m,
      bone: 0,
      color: [c?.r ?? 1, c?.g ?? 1, c?.b ?? 1, 1],
      pattern: [pt?.x ?? 0, pt?.y ?? 1, pt?.z ?? 0, pt?.w ?? 0],
      color2: [c2?.r ?? 0, c2?.g ?? 0, c2?.b ?? 0, 1],
      patScale,
    };
    key.push(`${src.name}:${[...m, ...vals.color, ...vals.pattern, ...vals.color2, ...patScale].map((v) => v.toFixed(4)).join(',')}`);
    hiParts.push({ pos, nrm, idx, ...vals });
    const low = lib.low(src);
    loParts.push({ pos: low.getVerticesData(VertexBuffer.PositionKind) ?? [], nrm: low.getVerticesData(VertexBuffer.NormalKind) ?? [], idx: low.getIndices() ?? [], ...vals });
  }
  let per = SOURCES.get(lib);
  if (!per) {
    const map = (per = new Map<string, Mesh>());
    SOURCES.set(lib, per);
    // the sources go with the library (a new world on the same scene builds afresh)
    lib.skinMaterial.onDisposeObservable.addOnce(() => {
      for (const s of map.values()) s.dispose();
      map.clear();
      SOURCES.delete(lib);
    });
  }
  const k = `${gun.def.id};${key.join(';')}`;
  let hi = per.get(k);
  if (!hi || hi.isDisposed()) {
    hi = source(scene, lib, mergeParts(hiParts), `wpn-merged-${gun.def.id}`, src0);
    const lo = source(scene, lib, mergeParts(loParts), `wpn-merged-${gun.def.id}-lod`, src0);
    lib.trackLod(hi, lo);
    hi.onDisposeObservable.addOnce(() => lo.dispose());
    per.set(k, hi);
  }
  const inst = hi.createInstance(`${name}-gun`);
  inst.parent = gun.node;
  inst.isPickable = false;
  for (const p of parts) p.setEnabled(false);
  return inst;
}

/** One merged source (never drawn itself: only its instances, as the part bases). */
function source(scene: Scene, lib: SmoothBodyLibrary, d: MergedBody, name: string, like: Mesh): Mesh {
  const mesh = new Mesh(name, scene);
  mesh.setVerticesData(VertexBuffer.PositionKind, d.positions, false, 3);
  mesh.setVerticesData(VertexBuffer.NormalKind, d.normals, false, 3);
  mesh.setVerticesData(VertexBuffer.ColorKind, d.colors, false, 4);
  mesh.setVerticesData('pattern', d.pattern, false, 4);
  mesh.setVerticesData('color2', d.color2, false, 4);
  mesh.setVerticesData('ppos', d.ppos, false, 3);
  mesh.setVerticesData('pnrm', d.pnrm, false, 3);
  mesh.setIndices(d.indices);
  mesh.material = lib.skinMaterial;
  mesh.isPickable = false;
  mesh.receiveShadows = like.receiveShadows;
  mesh.layerMask = like.layerMask;
  mesh.isVisible = false;
  return mesh;
}
