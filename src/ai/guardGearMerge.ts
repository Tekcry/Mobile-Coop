import { BoundingInfo, Matrix, Mesh, Quaternion, TransformNode, VertexBuffer, type Color4, type InstancedMesh, type Scene } from '../core/babylon';
import { flags } from '../core/flags';
import type { CharacterRig } from '../player/characterRig';
import type { SmoothBodyLibrary } from '../player/smoothBody';
import { mergeParts, type MergedBody, type MergePart } from '../player/smoothBodyMerge';

/**
 * (guard-models perf S13) A guard's multi-part static gear as one mesh, as perfg did for his gun (`enemyGunMerge.ts`):
 * - The S1 body's armour (two plates on the chest, two shoulder caps: 4 part instances, each evaluated, bounded and
 *   instanced per pass under a joint the anim moves) becomes ONE mesh skinned rigidly on the merged body's own
 *   skeleton (`SmoothBody`: one bone per joint, bind = identity, vertices in the joint's space), as the body's parts
 *   are: the same joints move it, the body's per-render bone pose already computes those bones, nothing new runs per
 *   frame. Culled with the body's rest box; a ragdoll frees it with the body (`SmoothBody.extras`).
 * - The enforcer's placeholder shield and its visor (2 instances on his root) become one instance of a merged source.
 * Per-vertex colour, `pattern`, `color2`, `ppos` / `pnrm` are the instance values (`mergeParts`); the parts drew with
 * `partMat`, the merged meshes with `partSkinMat` (the same `make()` settings plus the voxel / smooth plugins, frozen),
 * as the merged body and gun do. Heat and flash: the gear parts had none (pattern.w 0, no flash) and still have none.
 * Hi and low LOD as the part bases had (`trackLod`). Geometry is built once per (library, parts, joints) and shared by
 * every guard that matches (Babylon geometry sharing); each guard's mesh is its own (his skeleton). A part's place is
 * its local chain up to the merge parent (never world x inverse world: the key is the same wherever and however he
 * stands), and the merged meshes receive shadows as the merged body does (gm-perf polish). `?guardmerge=0`, no
 * merged body, or a part not a library instance on one of the body's joints: null, the parts stay as before.
 * Build time only (gear is built the first time a guard needs it); render only (gameplay reads the gear flags).
 */

interface Built {
  hi: Mesh;
  lo: Mesh;
}
/** Merged sources per part library (never drawn themselves: they hold the shared geometry). */
const SOURCES = new WeakMap<SmoothBodyLibrary, Map<string, Built>>();

const tmpQ = new Quaternion();
const tmpL = new Matrix();
const tmpC = new Matrix();

/** `n`'s local matrix (scaling, rotation, position) into `out`. */
function localOf(n: TransformNode, out: Matrix): void {
  const q = n.rotationQuaternion ?? Quaternion.FromEulerVectorToRef(n.rotation, tmpQ);
  Matrix.ComposeToRef(n.scaling, q, n.position, out);
}

/**
 * `node`'s matrix in `ancestor`'s space into `out`: its local matrix, then each parent's up to `ancestor` (row vectors:
 * child first). Independent of where `ancestor` stands; false when the parent chain does not reach `ancestor`.
 */
function localTo(node: TransformNode, ancestor: TransformNode, out: Matrix): boolean {
  localOf(node, out);
  for (let p = node.parent; p !== ancestor; p = p.parent) {
    if (!(p instanceof TransformNode)) return false;
    localOf(p, tmpL);
    out.multiplyToRef(tmpL, tmpC);
    out.copyFrom(tmpC);
  }
  return true;
}

function libraryOf(part: InstancedMesh | undefined): { lib: SmoothBodyLibrary; src: Mesh } | null {
  const src = part?.sourceMesh as Mesh | undefined;
  const lib = (src?.metadata as { library?: SmoothBodyLibrary } | null | undefined)?.library;
  return lib && src ? { lib, src } : null;
}

/** One part's merge input against matrix `m` (part -> merged space) and `bone`; null when it has no geometry. */
function partInput(lib: SmoothBodyLibrary, part: InstancedMesh, m: ArrayLike<number>, bone: number): { hi: MergePart; lo: MergePart; key: string } | null {
  const src = part.sourceMesh as Mesh | undefined;
  const pos = src?.getVerticesData(VertexBuffer.PositionKind);
  const nrm = src?.getVerticesData(VertexBuffer.NormalKind);
  const idx = src?.getIndices();
  if (!src || !pos || !nrm || !idx) return null;
  part.computeWorldMatrix(true);
  const w = part.getWorldMatrix().m;
  const patScale = [0, 1, 2].map((r) => Math.sqrt(w[r * 4]! ** 2 + w[r * 4 + 1]! ** 2 + w[r * 4 + 2]! ** 2));
  const c = part.instancedBuffers?.color as Color4 | undefined;
  const pt = part.instancedBuffers?.pattern as { x: number; y: number; z: number; w: number } | undefined;
  const c2 = part.instancedBuffers?.color2 as Color4 | undefined;
  const vals = {
    m,
    bone,
    color: [c?.r ?? 1, c?.g ?? 1, c?.b ?? 1, 1],
    pattern: [pt?.x ?? 0, pt?.y ?? 1, pt?.z ?? 0, pt?.w ?? 0],
    color2: [c2?.r ?? 0, c2?.g ?? 0, c2?.b ?? 0, 1],
    patScale,
  };
  const key = `${src.name}:${bone}:${[...Array.from(m), ...vals.color, ...vals.pattern, ...vals.color2, ...patScale].map((v) => v.toFixed(4)).join(',')}`;
  const low = lib.low(src);
  return {
    hi: { pos, nrm, idx, ...vals },
    lo: { pos: low.getVerticesData(VertexBuffer.PositionKind) ?? [], nrm: low.getVerticesData(VertexBuffer.NormalKind) ?? [], idx: low.getIndices() ?? [], ...vals },
    key,
  };
}

function sourcesOf(lib: SmoothBodyLibrary): Map<string, Built> {
  let per = SOURCES.get(lib);
  if (!per) {
    const map = (per = new Map<string, Built>());
    SOURCES.set(lib, per);
    // the sources go with the library (a new world on the same scene builds afresh)
    lib.skinMaterial.onDisposeObservable.addOnce(() => {
      for (const s of map.values()) s.hi.dispose();
      map.clear();
      SOURCES.delete(lib);
    });
  }
  return per;
}

/** A hidden source mesh holding merged geometry (with bone indices when `skinned`). */
function source(scene: Scene, lib: SmoothBodyLibrary, d: MergedBody, name: string, like: Mesh, skinned: boolean): Mesh {
  const mesh = new Mesh(name, scene);
  mesh.setVerticesData(VertexBuffer.PositionKind, d.positions, false, 3);
  mesh.setVerticesData(VertexBuffer.NormalKind, d.normals, false, 3);
  mesh.setVerticesData(VertexBuffer.ColorKind, d.colors, false, 4);
  mesh.setVerticesData('pattern', d.pattern, false, 4);
  mesh.setVerticesData('color2', d.color2, false, 4);
  mesh.setVerticesData('ppos', d.ppos, false, 3);
  mesh.setVerticesData('pnrm', d.pnrm, false, 3);
  if (skinned) {
    mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, d.matricesIndices, false, 4);
    mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, d.matricesWeights, false, 4);
  }
  mesh.setIndices(d.indices);
  mesh.material = lib.skinMaterial;
  mesh.isPickable = false;
  mesh.receiveShadows = true; // as the merged body (`smoothBody.ts`): one rule for all merged gear
  mesh.layerMask = like.layerMask;
  mesh.isVisible = false;
  // (a skinned source never draws: only meshes that share its geometry; disabled so it is never evaluated)
  if (skinned) mesh.setEnabled(false);
  return mesh;
}

/**
 * The armour `parts` (library instances on the rig's joints) as one mesh skinned on his S1 body's skeleton (its low
 * LOD tracked), the parts disposed; null (the parts stay) when off or anything does not fit.
 */
export function mergeRigGear(rig: CharacterRig, parts: readonly InstancedMesh[], name: string): Mesh | null {
  const body = rig.voxel;
  if (!flags.guardMerge || !body || !parts.length) return null;
  const from = libraryOf(parts[0]);
  if (!from) return null;
  const { lib, src: src0 } = from;
  const scene = src0.getScene();
  const hiParts: MergePart[] = [];
  const loParts: MergePart[] = [];
  const key: string[] = [];
  for (const part of parts) {
    const joint = part.parent as TransformNode;
    const bone = body.nodes.indexOf(joint);
    if (bone < 0 || libraryOf(part)?.lib !== lib) return null;
    const m = new Matrix(); // its own (kept in the merge input)
    if (!localTo(part, joint, m)) return null;
    const inp = partInput(lib, part, m.m, bone);
    if (!inp) return null;
    hiParts.push(inp.hi);
    loParts.push(inp.lo);
    key.push(inp.key);
  }
  const per = sourcesOf(lib);
  const k = `rig;${key.join(';')}`;
  let s = per.get(k);
  if (!s || s.hi.isDisposed()) {
    const hi = source(scene, lib, mergeParts(hiParts), 'gear-merged', src0, true);
    const lo = source(scene, lib, mergeParts(loParts), 'gear-merged-lod', src0, true);
    hi.onDisposeObservable.addOnce(() => lo.dispose());
    per.set(k, (s = { hi, lo }));
  }
  const bodyMesh = body.meshes[0]!;
  const box = bodyMesh.getBoundingInfo();
  const own = (src: Mesh, nm: string): Mesh => {
    const m = new Mesh(nm, scene);
    src.geometry!.applyToMesh(m);
    m.parent = bodyMesh.parent;
    m.skeleton = body.skeleton;
    m.numBoneInfluencers = 1;
    m.material = lib.skinMaterial;
    m.isPickable = false;
    m.receiveShadows = true;
    m.layerMask = src0.layerMask;
    // the body's rest box (plus its margins): culled with him (the skinned bounds never refresh)
    m.setBoundingInfo(new BoundingInfo(box.minimum.clone(), box.maximum.clone()));
    return m;
  };
  const hi = own(s.hi, name);
  const lo = own(s.lo, `${name}-lod`);
  lib.trackLod(hi, lo);
  hi.onDisposeObservable.addOnce(() => lo.dispose());
  body.extras.push(hi, lo);
  if (body.loose) hi.alwaysSelectAsActiveMesh = lo.alwaysSelectAsActiveMesh = true;
  disposeAll(parts);
  return hi;
}

/**
 * Static `parts` (library instances under `parent`, at any depth through each other) as one instance of a merged
 * source under `parent`, the parts disposed; null (the parts stay) when off or a part does not fit. `id` keys the
 * shared source with the parts' places and instance values.
 */
export function mergeStaticParts(parent: TransformNode, parts: readonly InstancedMesh[], id: string, name: string): InstancedMesh | null {
  if (!flags.guardMerge || !parts.length) return null;
  const from = libraryOf(parts[0]);
  if (!from) return null;
  const { lib, src: src0 } = from;
  const scene = src0.getScene();
  const hiParts: MergePart[] = [];
  const loParts: MergePart[] = [];
  const key: string[] = [];
  for (const part of parts) {
    if (libraryOf(part)?.lib !== lib) return null;
    const m = new Matrix(); // its own (kept in the merge input)
    if (!localTo(part, parent, m)) return null;
    const inp = partInput(lib, part, m.m, 0);
    if (!inp) return null;
    hiParts.push(inp.hi);
    loParts.push(inp.lo);
    key.push(inp.key);
  }
  const per = sourcesOf(lib);
  const k = `static;${id};${key.join(';')}`;
  let s = per.get(k);
  if (!s || s.hi.isDisposed()) {
    const hi = source(scene, lib, mergeParts(hiParts), `merged-${id}`, src0, false);
    const lo = source(scene, lib, mergeParts(loParts), `merged-${id}-lod`, src0, false);
    lib.trackLod(hi, lo);
    hi.onDisposeObservable.addOnce(() => lo.dispose());
    per.set(k, (s = { hi, lo }));
  }
  const inst = s.hi.createInstance(name);
  inst.parent = parent;
  inst.isPickable = false;
  disposeAll(parts);
  return inst;
}

/** The merged parts go (children before parents: a parent's dispose takes its children with it). */
function disposeAll(parts: readonly InstancedMesh[]): void {
  for (let i = parts.length - 1; i >= 0; i--) if (!parts[i]!.isDisposed()) parts[i]!.dispose();
}
