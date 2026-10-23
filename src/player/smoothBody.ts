import { Bone, BoundingInfo, GpuBuffer, Matrix, Mesh, Quaternion, Skeleton, Vector3, VertexBuffer, type AbstractMesh, type Color4, type DataBuffer, type InstancedMesh, type Material, type Observer, type Scene, type TransformNode } from '../core/babylon';
import { flags } from '../core/flags';
import { flashColors, heatPattern, mergeParts, paintPart, restBox, type MergedBody, type MergePart } from './smoothBodyMerge';
import { newEffectWatch, watchBodyEffect, type EffectWatch } from './bodyEffectRecovery';

/**
 * (guard-render S1) A rig's smooth parts merged into one mesh (and its low-LOD twin
 * from the part bases' 16 m LOD) skinned rigidly to one bone per joint, on the frozen `partSkinMat`, so a guard costs
 * two meshes in the scene's evaluation instead of ~50 instances. Same pixels: per-vertex colour / pattern / `color2`
 * are the instance values, `ppos` / `pnrm` the instances' pattern and surface space (`SmoothBodyPlugin`). The parts
 * stay for what reads them, disabled (no evaluation). A fixed root-local box (rest pose plus stand / crouch / lean
 * margins) lets camera and cascade culling work; a ragdoll re-parenting the joints makes the body always active.
 */

/** What the part library gives a smooth body (the bases' `metadata.library`). */
export interface SmoothBodyLibrary {
  readonly skinMaterial: Material;
  /** A base's low-LOD mesh (the base itself when it has none). */
  low(base: Mesh): Mesh;
  /** Add `lo` as `hi`'s LOD at the part distance x the Detail scale, and move it with `setLodScale`. */
  trackLod(hi: Mesh, lo: Mesh): void;
}

/** Root-local margins around the rest box (min x, y, z, max x, y, z; m): lean, crouch, reach, arms up. */
const PAD = [1, 0.3, 1, 1, 0.3, 1] as const;

interface Merged {
  hi: MergedBody;
  lo: MergedBody;
  box: Float32Array;
}
/** Merged geometry per (look, build): the guards of one look share it (colour / pattern copied per body). */
const CACHE = new Map<string, Merged>();
const CACHE_MAX = 64;

/** (guard-render S7) The static vertex kinds (same for every body of a cache entry): field and floats per vertex. */
const STATIC: readonly (readonly [string, 'positions' | 'normals' | 'matricesIndices' | 'matricesWeights' | 'color2' | 'ppos' | 'pnrm', number])[] = [
  [VertexBuffer.PositionKind, 'positions', 3],
  [VertexBuffer.NormalKind, 'normals', 3],
  [VertexBuffer.MatricesIndicesKind, 'matricesIndices', 4],
  [VertexBuffer.MatricesWeightsKind, 'matricesWeights', 4],
  ['color2', 'color2', 4],
  ['ppos', 'ppos', 3],
  ['pnrm', 'pnrm', 3],
];
/**
 * (guard-render S7) One cache entry's static GPU buffers in a scene, shared by every body built from it: each body's
 * mesh wraps them in its own `VertexBuffer`s (Babylon's buffer reference count: the GPU buffer goes with the last
 * mesh) and shares the index buffer (its count raised per user). Colour (flash, lens glow) and `pattern` (heat) stay
 * per body, as do the skeleton and the bounding box. `users` mirrors the counts so a later body after the last
 * dispose uploads afresh; the scene's map goes with the scene.
 *
 * WebGL context restore: every Geometry rebuilds the shared `GpuBuffer` (one live GL buffer kept, references back to
 * 1) and makes its own index buffer from its CPU indices, so the entry's `index` is dead. `restored` then sets each
 * live entry's vertex buffer references to its users and empties the lookup, so later spawns upload fresh; the
 * entries already in use stay in `live` (a later restore fixes them again). The rebuild's extra GL buffers
 * (users - 1 per kind) leak once per restore: Babylon gives no handle to them.
 */
interface Shared {
  body: MergedBody;
  vbs: GpuBuffer[];
  index: DataBuffer;
  users: number;
}
interface SceneShared {
  /** The lookup for new spawns (emptied on a context restore). */
  map: Map<MergedBody, Shared>;
  /** Every entry with users, mapped or not. */
  live: Set<Shared>;
}
const SHARED = new Map<Scene, SceneShared>();

/** Test hook: the live shared entries of a scene (the lookup's). */
export function sharedBufferCount(scene: Scene): number {
  return SHARED.get(scene)?.map.size ?? 0;
}

const tmpQ = new Quaternion();

function partLocal(part: AbstractMesh): Matrix {
  const q = part.rotationQuaternion ?? Quaternion.FromEulerVectorToRef(part.rotation, tmpQ);
  return Matrix.Compose(part.scaling, q, part.position);
}

/** The merged body of `parts` (all on nodes under `root`), or null when off (`?guardmerge=0`) or they come from no smooth library. */
export function buildSmoothBody(scene: Scene, root: TransformNode, parts: readonly AbstractMesh[], name: string): SmoothBody | null {
  if (!flags.guardMerge) return null;
  const src = (parts[0] as InstancedMesh | undefined)?.sourceMesh;
  const lib = (src?.metadata as { library?: SmoothBodyLibrary } | null | undefined)?.library;
  if (!lib) return null;
  return new SmoothBody(scene, root, parts, lib, name);
}

/** Every live smooth body per scene, and the one observer that marks their skeletons dirty. */
const LIVE = new Map<Scene, { bodies: SmoothBody[]; obs: Observer<Scene> }>();

export class SmoothBody {
  readonly skeleton: Skeleton;
  /** [full, low LOD] (both shadow casters; the scene draws the one `getLOD` picks). */
  readonly meshes: Mesh[] = [];
  /** The nodes the parts hang from and their bones (same order). */
  readonly nodes: TransformNode[] = [];
  readonly bones: Bone[] = [];
  /** Each node's parent at build: a change (a ragdoll) makes the body always active. */
  private parents: unknown[] = [];
  /** Sticky: the rest box no longer bounds the body. */
  loose = false;
  private ranges: Uint32Array[] = [];
  /** Per mesh: the vertex colours as built (lens glow writes them), the flash buffer and `pattern` (w = heat). */
  private baseColors: Float32Array[] = [];
  private flashBufs: Float32Array[] = [];
  private patterns: Float32Array[] = [];
  /** Per mesh: the merged body its shared GPU buffers belong to (null when empty). */
  private shared: (Shared | null)[] = [];
  private flashK = 0;
  private heat = 0;
  private rootInv = new Matrix();
  /** (guard-ai carry fix) Per mesh: its unready effect, timed (`watchBodyEffect`). */
  private readonly watches: EffectWatch[] = [newEffectWatch(), newEffectWatch()];
  private readonly poseFn = (): void => this.pose();

  constructor(
    private scene: Scene,
    private root: TransformNode,
    parts: readonly AbstractMesh[],
    lib: SmoothBodyLibrary,
    name: string,
  ) {
    this.skeleton = new Skeleton(`${name}-smooth`, `${name}-smooth`, scene);
    root.computeWorldMatrix(true);
    const toRoot = root.getWorldMatrix().clone().invert();
    const boneOf = new Map<TransformNode, number>();
    const bonePerPart: number[] = [];
    for (const part of parts) {
      const n = part.parent as TransformNode | null;
      if (!n || !(part as InstancedMesh).sourceMesh) {
        bonePerPart.push(-1);
        continue;
      }
      let bi = boneOf.get(n);
      if (bi === undefined) {
        bi = this.bones.length;
        boneOf.set(n, bi);
        n.computeWorldMatrix(true);
        const rel = n.getWorldMatrix().multiply(toRoot);
        // bind = identity: the vertices sit in the joint's space, the bone matrix is the joint relative to the root
        this.bones.push(new Bone(`${name}-${n.name}`, this.skeleton, null, rel, null, Matrix.Identity()));
        this.nodes.push(n);
        this.parents.push(n.parent);
      }
      bonePerPart.push(bi);
    }
    const merged = this.merge(parts, bonePerPart, lib);
    // (in `meshes` order: the per-mesh buffers follow it)
    const hi = this.mesh(`${name}-smooth`, merged.hi, lib.skinMaterial, merged.box);
    const lo = this.mesh(`${name}-smooth-lod`, merged.lo, lib.skinMaterial, merged.box);
    lib.trackLod(hi, lo);
    this.meshes.push(hi, lo);
    // the smooth parts stay for what reads them, out of the scene's evaluation
    for (let i = 0; i < parts.length; i++) if (bonePerPart[i]! >= 0) parts[i]!.setEnabled(false);
    this.skeleton.onBeforeComputeObservable.add(this.poseFn);
    let live = LIVE.get(scene);
    if (!live) {
      const bodies: SmoothBody[] = [];
      LIVE.set(scene, (live = { bodies, obs: scene.onBeforeRenderObservable.add(() => SmoothBody.frame(bodies)) }));
      // (checker S1) a body left undisposed must not keep a disposed scene alive
      scene.onDisposeObservable.addOnce(() => LIVE.delete(scene));
    }
    live.bodies.push(this);
  }

  /** The merged hi / lo geometry and rest box (cached per look and build). */
  private merge(parts: readonly AbstractMesh[], bonePerPart: readonly number[], lib: SmoothBodyLibrary): Merged {
    const hiParts: MergePart[] = [];
    const loParts: MergePart[] = [];
    const key: string[] = [];
    for (let pi = 0; pi < parts.length; pi++) {
      const part = parts[pi]! as InstancedMesh;
      const bone = bonePerPart[pi]!;
      const src = part.sourceMesh as Mesh | undefined;
      const hiPos = bone >= 0 ? src?.getVerticesData(VertexBuffer.PositionKind) : null;
      const hiIdx = bone >= 0 ? src?.getIndices() : null;
      const hiNrm = bone >= 0 ? src?.getVerticesData(VertexBuffer.NormalKind) : null;
      const m = partLocal(part).m;
      part.computeWorldMatrix(true);
      const w = part.getWorldMatrix().m;
      const patScale = [0, 1, 2].map((r) => Math.sqrt(w[r * 4]! ** 2 + w[r * 4 + 1]! ** 2 + w[r * 4 + 2]! ** 2));
      const c = part.instancedBuffers?.color as Color4 | undefined;
      const pt = part.instancedBuffers?.pattern as { x: number; y: number; z: number } | undefined;
      const c2 = part.instancedBuffers?.color2 as Color4 | undefined;
      // (heat starts cold: `setHeat` writes pattern.w)
      const vals = {
        m,
        bone: Math.max(0, bone),
        color: [c?.r ?? 1, c?.g ?? 1, c?.b ?? 1, 1],
        pattern: [pt?.x ?? 0, pt?.y ?? 1, pt?.z ?? 0, 0],
        color2: [c2?.r ?? 0, c2?.g ?? 0, c2?.b ?? 0, 1],
        patScale,
      };
      key.push(`${src?.name}:${bone}:${[...m, ...vals.color, ...vals.pattern, ...vals.color2, ...patScale].map((v) => v.toFixed(4)).join(',')}`);
      if (!hiPos || !hiIdx || !hiNrm || !src) {
        hiParts.push({ pos: [], nrm: [], idx: [], ...vals });
        loParts.push({ pos: [], nrm: [], idx: [], ...vals });
        continue;
      }
      hiParts.push({ pos: hiPos, nrm: hiNrm, idx: hiIdx, ...vals });
      const low = lib.low(src);
      loParts.push({ pos: low.getVerticesData(VertexBuffer.PositionKind) ?? [], nrm: low.getVerticesData(VertexBuffer.NormalKind) ?? [], idx: low.getIndices() ?? [], ...vals });
    }
    const bones = new Float32Array(this.bones.length * 16);
    this.bones.forEach((b, i) => bones.set(b.getLocalMatrix().m, i * 16));
    // (the rest box reads the joints: the build and height are in the key through them)
    const k = `${Array.from(bones, (v) => v.toFixed(4)).join(',')};${key.join(';')}`;
    const hit = CACHE.get(k);
    if (hit) return hit;
    const hi = mergeParts(hiParts);
    const out = { hi, lo: mergeParts(loParts), box: restBox(hi.positions, hi.matricesIndices, bones, PAD) };
    if (CACHE.size >= CACHE_MAX) CACHE.clear();
    CACHE.set(k, out);
    return out;
  }

  private mesh(name: string, d: MergedBody, material: Material, box: Float32Array): Mesh {
    const mesh = new Mesh(name, this.scene);
    const colors = d.colors.slice();
    const pattern = d.pattern.slice();
    if (d.positions.length) {
      // (S7) the static kinds and the indices from the cache entry's shared GPU buffers; colour / pattern per body
      const sh = this.share(d);
      this.shared.push(sh);
      const engine = this.scene.getEngine();
      for (let k = 0; k < STATIC.length; k++) {
        const [kind, , size] = STATIC[k]!;
        mesh.setVerticesBuffer(new VertexBuffer(engine, sh.vbs[k]!, kind, { updatable: false, stride: size, size, takeBufferOwnership: true }));
      }
      mesh.setVerticesData(VertexBuffer.ColorKind, colors, true, 4);
      mesh.setVerticesData('pattern', pattern, true, 4);
      const geo = mesh.geometry!;
      geo.setIndexBuffer(sh.index, d.positions.length / 3, d.indices.length, sh.index.is32Bits);
      // (setIndexBuffer leaves no CPU indices: keep `getIndices` answering for CPU readers)
      (geo as unknown as { _indices: Uint32Array })._indices = d.indices;
    }
    else this.shared.push(null);
    mesh.parent = this.root;
    mesh.skeleton = this.skeleton;
    mesh.numBoneInfluencers = 1;
    mesh.material = material;
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    // the rest pose's root-local box plus margins: culled like any mesh (the skinned bounds never refresh)
    mesh.setBoundingInfo(new BoundingInfo(new Vector3(box[0], box[1], box[2]), new Vector3(box[3], box[4], box[5])));
    this.ranges.push(d.ranges);
    this.baseColors.push(colors);
    this.flashBufs.push(new Float32Array(colors.length));
    this.patterns.push(pattern);
    return mesh;
  }

  /** The shared GPU buffers of `d` in this scene (uploaded by the first user), one more user counted. */
  private share(d: MergedBody): Shared {
    const scene = this.scene;
    const engine = scene.getEngine();
    let per = SHARED.get(scene);
    if (!per) {
      const ss: SceneShared = (per = { map: new Map(), live: new Set() });
      SHARED.set(scene, ss);
      // (fires after the engine's _rebuildBuffers)
      const obs = engine.onContextRestoredObservable.add(() => SmoothBody.restored(ss));
      scene.onDisposeObservable.addOnce(() => {
        SHARED.delete(scene);
        engine.onContextRestoredObservable.remove(obs);
      });
    }
    let sh = per.map.get(d);
    if (sh) {
      sh.users++;
      // (the creator's reference is the first user's; setVerticesBuffer counts the vertex buffers itself)
      sh.index.references++;
      return sh;
    }
    // (WebGL verified; WebGPU unverified until a GPU run)
    sh = {
      body: d,
      vbs: STATIC.map(([kind, field, size]) => new GpuBuffer(engine, d[field], false, size, false, false, false, undefined, `smooth-${kind}`)),
      index: engine.createIndexBuffer(d.indices, false, 'smooth-indices'),
      users: 1,
    };
    per.map.set(d, sh);
    per.live.add(sh);
    return sh;
  }

  /** After a context restore: references match the users again; new spawns upload fresh (see `Shared`). */
  private static restored(ss: SceneShared): void {
    for (const sh of ss.live) {
      for (const vb of sh.vbs) {
        const buf = vb.getBuffer();
        if (buf) buf.references = sh.users;
      }
    }
    ss.map.clear();
  }

  /**
   * Once per render, for every body of a scene: the bones re-read their nodes; a re-parented joint (ragdoll) frees the
   * box; (guard-ai carry fix) a body effect that will not finish compiling is recompiled (`bodyEffectRecovery`).
   */
  private static frame(bodies: readonly SmoothBody[]): void {
    const now = performance.now();
    for (let b = 0; b < bodies.length; b++) {
      const body = bodies[b]!;
      body.bones[0]?.markAsDirty();
      for (let i = 0; i < body.meshes.length; i++) watchBodyEffect(body.meshes[i]!, body.watches[i]!, now);
      if (body.loose) continue;
      const nodes = body.nodes;
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i]!.parent === body.parents[i]) continue;
        body.loose = true;
        for (const m of body.meshes) m.alwaysSelectAsActiveMesh = true;
        break;
      }
    }
  }

  /** Each bone = its node's world transform relative to the root (no allocation). */
  private pose(): void {
    this.root.getWorldMatrix().invertToRef(this.rootInv);
    for (let i = 0; i < this.bones.length; i++) this.nodes[i]!.getWorldMatrix().multiplyToRef(this.rootInv, this.bones[i]!.getLocalMatrix());
  }

  /** One mesh (no head of its own: only the player's camera fades a head, and the player keeps its own figure). */
  setHeadVisible(_v: boolean): void {}

  /** Tint every vertex towards white (hit feedback), 0..1. */
  setFlash(k: number): void {
    this.flashK = k;
    for (let i = 0; i < this.meshes.length; i++) this.upload(i);
  }

  private upload(i: number): void {
    const mesh = this.meshes[i]!;
    if (!mesh.isVerticesDataPresent(VertexBuffer.ColorKind)) return;
    if (this.flashK > 0) {
      flashColors(this.baseColors[i]!, this.flashK, this.flashBufs[i]!);
      mesh.updateVerticesData(VertexBuffer.ColorKind, this.flashBufs[i]!);
    } else mesh.updateVerticesData(VertexBuffer.ColorKind, this.baseColors[i]!);
  }

  /** Thermal vision's warmth 0..1 as the render-only `pattern.w` glow; only touches buffers on a change. */
  setHeat(k: number): void {
    if (k === this.heat) return;
    this.heat = k;
    for (let i = 0; i < this.meshes.length; i++) {
      const pt = this.patterns[i]!;
      if (!pt.length) continue;
      heatPattern(pt, k);
      this.meshes[i]!.updateVerticesData('pattern', pt);
    }
  }

  /** A smooth part's colour changed (lens glow): its vertices follow (both levels of detail). */
  setPartColor(part: number, c: Color4): void {
    for (let i = 0; i < this.meshes.length; i++) if (paintPart(this.baseColors[i]!, this.ranges[i]!, part, c.r, c.g, c.b)) this.upload(i);
  }

  dispose(): void {
    const live = LIVE.get(this.scene);
    if (live) {
      const i = live.bodies.indexOf(this);
      if (i >= 0) live.bodies.splice(i, 1);
      if (!live.bodies.length) {
        live.obs.remove();
        LIVE.delete(this.scene);
      }
    }
    this.skeleton.onBeforeComputeObservable.removeCallback(this.poseFn);
    // (S7) the meshes' geometries release the shared GPU buffers (reference counts); the last user drops the entry
    const per = SHARED.get(this.scene);
    for (const sh of this.shared) {
      if (!sh || --sh.users > 0) continue;
      per?.live.delete(sh);
      if (per?.map.get(sh.body) === sh) per.map.delete(sh.body);
    }
    this.shared.length = 0;
    for (const m of this.meshes) m.dispose();
    this.skeleton.dispose();
  }
}
