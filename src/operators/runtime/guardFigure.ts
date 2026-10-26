/**
 * (guard-models G5) Guard bodies from the operator pipeline (PLAN G5). Babylon only through core/babylon.ts.
 *
 * - `GuardLibrary` (one per Scene): a guard base's LOD files (one skinned mesh, one material, `_PIECE` / `_TINT` per
 *   vertex; G4) loaded once through the operator file cache (`loadModel`), each (base, LOD) built once into static GPU
 *   vertex buffers shared by every guard of that base in the scene (guard-render S7 style), its material (the operator
 *   PBR, `operatorMaterial`, plus `GuardFigurePlugin`) and its poser setup.
 * - `GuardFigure` (one per guard): over a CharacterRig, as Wren's `OperatorFigure` minus the hero and the goggle: per
 *   loaded LOD its own skeleton posed by the non-allocating `OperatorPoser` (the rig stays the pose authority), (perf
 *   F2) lazily: `update` picks the LOD and marks the skeleton, the pose runs in the skeleton's compute, so only for a
 *   guard some pass draws this frame; LOD0 / 1 / 2 by camera distance (`pickLod` on the guards' own bands, `GUARD_LOD` in guardLod.ts: 6 /
 *   25 m, S11; Wren's hysteresis, A8), LOD2 loaded first. (S11) LOD1 / LOD2 fold the fingers (LOD2 also toes and
 *   clavicles) at load, and LOD2 poses every other frame, staggered per guard.
 *   Per guard only the skeleton, one RGBA8 `gvis` vertex buffer per LOD primitive (tint rgb, a = piece visible with
 *   the flash folded in, `gearMask.ts`) and one index buffer of the visible pieces (rewritten on a gear change), so a
 *   hidden piece is drawn by no pass. `gvis` is rewritten only on a spawn, gear, tint, flash or thermal heat change
 *   (heat is in gvis, not an overlay: one draw per guard in every vision mode).
 * - Culling: guard-render S1's fixed root-local box (the bind pose plus S1's margins), not `alwaysSelectAsActiveMesh`,
 *   so camera and cascade culling work; in the game it is the merged S1 body's own box (`box`, G8 cull), so the figure
 *   joins exactly the shadow lists that body did. While any rig joint is re-parented (a ragdoll) the box no longer bounds the
 *   body: the meshes go always-active, and a world-matrix path poses the bones (each operator joint rides its rig
 *   joint's world matrix with its rest offset) because the rig's local transforms no longer chain.
 *
 * Bones are written directly (no linked TransformNodes): fewer scene nodes per guard than Wren's figure.
 * Render side only: nothing here is read by gameplay (hit volumes, perception and the light meter read the rig).
 * Until G4's files exist, `guardStandInManifest` (gearMask.ts) draws Wren's LOD files as one body piece.
 */
import {
  Bone, BoundingInfo, GpuBuffer, Matrix, Mesh, Quaternion, Skeleton, TransformNode, Vector3, VertexBuffer,
  type Camera, type DataBuffer, type Observer, type PBRMaterial, type Scene,
} from '../../core/babylon';
import { hyp3 } from '../../core/mathx';
import { FING_LEN, fingerPose, fingerRig, handGripShape, type FingerRig } from '../../anim/fingers';
import type { GlbMesh, GlbModel } from '../lab/glb';
import {
  fillGvis, FX_LEVELS, fxLevel, groupByPiece, MAX_PIECES, pieceMask, STAND_IN_PREFIX, validateGuardManifest, visibleIndices,
  type GuardManifest, type PieceGroups,
} from '../guards/gearMask';
import { loadModel, operatorMaterial, readRig, rigNodes, type RigLike } from './figure';
import { GuardFigurePlugin } from './guardFigurePlugin';
import { GUARD_LOD, guardFolds, guardPosesNow } from './guardLod';
import { pickLod } from './lodPick';
import { newEffectWatch, watchBodyEffect, type EffectWatch } from '../../player/bodyEffectRecovery';
import { LOD_0, LOD_1, LOD_2, LOD_NAMES, REQUIRED_JOINTS } from './manifest';
import { OperatorPoser, poserSetup, RIG_JOINTS, RIG_PARENT, TRS, type PoserSetup } from './pose';

/** A parsed LOD primitive with the guard attributes (G4: the GLB reader fills them from `_PIECE` / `_TINT`). */
export type GuardGlbMesh = GlbMesh & { piece?: Uint8Array; tint?: Uint8Array };

/** guard-render S1's root-local margins round the rest box (min x y z, max x y z; m): lean, crouch, reach, arms up. */
const PAD = [1, 0.3, 1, 1, 0.3, 1] as const;

/** One static vertex buffer of a primitive (shared by every guard of the base in the scene). */
interface StaticVb {
  kind: string;
  size: number;
  buf: GpuBuffer;
}

/** One primitive of a (base, LOD): shared GPU and CPU data. */
export interface GuardPrim {
  vertexCount: number;
  vbs: StaticVb[];
  material: PBRMaterial;
  /** Per vertex: piece index, tint slot. */
  piece: Uint8Array;
  tint: Uint8Array;
  /** Triangles grouped by piece. */
  groups: PieceGroups;
  /** Compaction scratch (same type and length as the groups; used synchronously, so one per primitive serves all). */
  scratch: Uint16Array | Uint32Array;
}

/** A (base, LOD)'s shared side in one scene. */
export interface GuardLodAsset {
  key: string;
  lod: number;
  setup: PoserSetup;
  prims: GuardPrim[];
  materials: PBRMaterial[];
  /** Root-local rest box plus margins (min x y z, max x y z). */
  box: Float32Array;
  fingers: FingerRig | null;
}

/** Problems that stop a guard LOD file from being used (empty = usable). */
export function validateGuardModel(model: GlbModel, manifest: GuardManifest, label: string): string[] {
  const out: string[] = [];
  if (!model.joints.length) out.push(`${label}: no skin`);
  const names = new Set(model.joints.map((j) => model.nodes[j]?.name ?? ''));
  for (const j of REQUIRED_JOINTS) if (!names.has(j)) out.push(`${label}: joint ${j} missing`);
  if (!model.materials.length) out.push(`${label}: no material`);
  if (!model.meshes.length) out.push(`${label}: no mesh`);
  // (A3) a guard file is ONE skinned mesh with ONE primitive; only the stand-in draws Wren's multi-primitive files
  if (model.meshes.length > 1 && !manifest.id.startsWith(STAND_IN_PREFIX)) out.push(`${label}: ${model.meshes.length} primitives (a guard file has one)`);
  for (const g of model.meshes as GuardGlbMesh[]) {
    const n = g.positions.length / 3;
    if (g.joints.length !== n * 4) out.push(`${label}: ${g.name} is not 4-influence skinned`);
    if (g.piece && g.piece.length !== n) out.push(`${label}: ${g.name} _PIECE length`);
    if (g.tint && g.tint.length !== n) out.push(`${label}: ${g.name} _TINT length`);
    if (g.piece?.some((p) => p >= manifest.pieces.length)) out.push(`${label}: ${g.name} _PIECE past the piece list`);
    if (g.tint?.some((t) => t >= manifest.tintSlots)) out.push(`${label}: ${g.name} _TINT past the tint slots`);
  }
  return out;
}

/** Builds a (base, LOD)'s shared side (load time). */
export function buildGuardLod(scene: Scene, model: GlbModel, manifest: GuardManifest, lod: number, label: string): GuardLodAsset {
  const problems = validateGuardModel(model, manifest, label);
  if (problems.length) throw new Error(problems.join('; '));
  const engine = scene.getEngine();
  // (S11) the LOD's folded joints (`GUARD_LOD`: fingers at LOD1 / LOD2, toes and clavicles at LOD2) get no bone: their
  // vertices ride the nearest kept ancestor, so they are never posed or uploaded
  let kept = model.joints.filter((nd) => !guardFolds(lod, model.nodes[nd]?.name ?? ''));
  if (!kept.length) kept = model.joints;
  const setup = poserSetup(model.nodes, kept);
  const slotOfNode = new Map<number, number>();
  for (let s = 0; s < setup.node.length; s++) slotOfNode.set(setup.node[s]!, s);
  const boneOfSkin = model.joints.map((nd) => {
    let k = nd;
    while (k >= 0 && !slotOfNode.has(k)) k = model.nodes[k]?.parent ?? -1;
    return k >= 0 ? slotOfNode.get(k)! : 0;
  });
  const materials = model.materials.map((m) => {
    const p = operatorMaterial(scene, m, label);
    // the albedo atlas's alpha is the tint mask, never transparency (opaque, no alpha test)
    if (p.albedoTexture) p.albedoTexture.hasAlpha = false;
    p.useAlphaFromAlbedoTexture = false;
    new GuardFigurePlugin(p);
    // (perf F1) frozen, as the S1 body's skin material (partLibrary): an unfrozen PBR re-runs its whole define
    // preparation (every plugin's prepareDefines, the light defines) for every guard mesh in every pass, every frame -
    // CPU and garbage. Frozen, each submesh is checked until its first ready frame, then never again. Nothing in the
    // figure changes a define at run time (GUARDFIG follows the mesh's gvis buffer, fixed per mesh; tint, flash and
    // heat are vertex data); the game's define changes go through an unfreeze / mark / freeze (`World.refreshMaterials`
    // on shadow / post changes, `LightRig.fitMaterial`, `BakedLamps.attach`), and freeze / unfreeze reset every
    // submesh's ready state. Uniform plugins (the lamps' night-vision gain) still bind once per pass.
    p.freeze();
    return p;
  });
  const box = new Float32Array([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
  const prims: GuardPrim[] = [];
  for (const g of model.meshes as GuardGlbMesh[]) {
    const n = g.positions.length / 3;
    const piece = g.piece ?? new Uint8Array(n);
    const tint = g.tint ?? new Uint8Array(n);
    const idx = new Float32Array(g.joints.length);
    for (let i = 0; i < idx.length; i++) idx[i] = g.weights[i]! > 0 ? boneOfSkin[g.joints[i]!] ?? 0 : 0;
    const data: [string, Float32Array, number][] = [
      [VertexBuffer.PositionKind, g.positions, 3],
      [VertexBuffer.NormalKind, g.normals, 3],
      [VertexBuffer.UVKind, g.uvs, 2],
    ];
    if (g.tangents) data.push([VertexBuffer.TangentKind, g.tangents, 4]);
    data.push([VertexBuffer.MatricesIndicesKind, idx, 4], [VertexBuffer.MatricesWeightsKind, g.weights, 4]);
    const vbs = data.map(([kind, d, size]) => ({ kind, size, buf: new GpuBuffer(engine, d, false, size, false, false, false, undefined, `${label}-${kind}`) }));
    for (let v = 0; v < n; v++) {
      for (let a = 0; a < 3; a++) {
        const x = g.positions[v * 3 + a]!;
        if (x < box[a]!) box[a] = x;
        if (x > box[a + 3]!) box[a + 3] = x;
      }
    }
    const groups = groupByPiece(g.indices, piece, manifest.pieces.length);
    const scratch = groups.indices instanceof Uint32Array ? new Uint32Array(groups.indices.length) : new Uint16Array(groups.indices.length);
    prims.push({ vertexCount: n, vbs, material: materials[g.material] ?? materials[0]!, piece, tint, groups, scratch });
  }
  for (let a = 0; a < 3; a++) {
    box[a] = box[a]! - PAD[a]!;
    box[a + 3] = box[a + 3]! + PAD[a + 3]!;
  }
  const fingers = fingerRig(setup.names, setup.bindPos, setup.bindRot);
  return { key: `${manifest.id}:${lod}`, lod, setup, prims, materials, box, fingers };
}

function disposeGuardLod(a: GuardLodAsset): void {
  for (const p of a.prims) for (const vb of p.vbs) vb.buf.dispose();
  for (const m of a.materials) m.dispose(false, true);
}

/** Every guard base LOD loaded into one scene, shared by its guards. Disposed with the scene. */
export class GuardLibrary {
  private readonly assets = new Map<string, Promise<GuardLodAsset>>();
  private readonly built: GuardLodAsset[] = [];
  /** Live figures (a WebGL context restore rebuilds their index buffers). */
  readonly figures = new Set<GuardFigure>();
  private readonly restoreObs: Observer<unknown> | null;

  constructor(readonly scene: Scene) {
    scene.onDisposeObservable.addOnce(() => this.dispose());
    // (fires after the engine rebuilt every geometry's buffers: each guard's index buffer came back with every piece)
    this.restoreObs = scene.getEngine().onContextRestoredObservable.add(() => {
      for (const f of this.figures) f.restored();
    }) as Observer<unknown> | null;
  }

  load(manifest: GuardManifest, lod: number): Promise<GuardLodAsset> {
    const url = lod >= LOD_0 && lod <= LOD_2 ? manifest.urls[lod] : '';
    if (!url) return Promise.reject(new Error(`${manifest.id}: ${LOD_NAMES[lod] ?? lod} not in the build`));
    const key = `${manifest.id}:${lod}`;
    let p = this.assets.get(key);
    if (!p) {
      p = loadModel(url).then((model) => {
        // (a load finishing after the scene went away builds nothing into the dead scene)
        if (this.scene.isDisposed) throw new Error(`${manifest.id}: scene disposed`);
        const a = buildGuardLod(this.scene, model, manifest, lod, `${manifest.id}-${LOD_NAMES[lod]}`);
        this.built.push(a);
        return a;
      });
      p.catch(() => this.assets.delete(key));
      this.assets.set(key, p);
    }
    return p;
  }

  /** (tests) The (base, LOD) entries built in this scene. */
  get sharedCount(): number {
    return this.built.length;
  }

  dispose(): void {
    if (this.restoreObs) this.scene.getEngine().onContextRestoredObservable.remove(this.restoreObs as never);
    for (const a of this.built) disposeGuardLod(a);
    this.built.length = 0;
    this.assets.clear();
  }
}

const LIBRARIES = new WeakMap<Scene, GuardLibrary>();

/** The scene's guard library (made on first use). */
export function guardLibrary(scene: Scene): GuardLibrary {
  let lib = LIBRARIES.get(scene);
  if (!lib) {
    lib = new GuardLibrary(scene);
    LIBRARIES.set(scene, lib);
    scene.onDisposeObservable.addOnce(() => LIBRARIES.delete(scene));
  }
  return lib;
}

// ---- one guard ----

interface GuardPart {
  prim: GuardPrim;
  mesh: Mesh;
  gvis: Uint8Array;
  gvisVb: VertexBuffer;
  /** Visible index count now. */
  count: number;
  /** The rest box for the submesh (its own: `setIndexBuffer` rebuilds the submesh). */
  subBox: BoundingInfo;
  /** (gm-watchdog) Its main-pass effect, timed while unready (`drawState`, the S1 body's watchdog). */
  watch: EffectWatch;
}

interface GuardLod {
  asset: GuardLodAsset;
  root: TransformNode;
  skeleton: Skeleton;
  bones: Bone[];
  parts: GuardPart[];
  meshes: Mesh[];
  poser: OperatorPoser;
  /** World path: per slot the rest offset from its rig joint, the rig node index, and the absolute matrix. */
  off: Matrix[];
  drv: Int32Array;
  abs: Matrix[];
  fingIn: Float64Array;
  /** The figure state its gvis / indices were last written from (flash and heat as levels 0..FX_LEVELS). */
  visVer: number;
  tintVer: number;
  flash: number;
  heat: number;
  /** (perf F2) `update` asked for a pose this frame: the skeleton's next compute runs it (`posePending`). */
  pending: boolean;
}

export interface GuardFigureOptions {
  /**
   * Uniform scale from the base's reference height to the guard's (A2: def height / `manifest.refHeight`); 1 by
   * default. Fixed at construction (the world path's offsets are measured with it): do not rescale `root` later.
   */
  scale?: number;
  /** Visible pieces at spawn (contract ids; the body piece is always shown; default: the body only). */
  pieces?: readonly string[];
  /** Tint table, rgb bytes per slot (default: white). */
  tints?: ArrayLike<number>;
  /**
   * (G8 cull) The culling box in the rig root's space (min x y z, max x y z; m): the merged S1 body's (its rest box plus
   * S1's margins, `SmoothBody`), so the figure is culled by the camera and the cascades and joins the lamp, torch and
   * character shadow lists exactly as the body it replaces. Default: the LOD's bind box plus the same margins (the
   * bind pose's A-pose arms make that 0.34 m wider each side than the body at rest).
   */
  box?: ArrayLike<number>;
  /** (S11) Stagger of the half-rate LODs (`GUARD_LOD.halfRateFrom`): odd and even slots pose on alternate frames.
   *  Default: spawn order (one more per figure built). */
  slot?: number;
}

/** (S11) The next default stagger slot (spawn order). */
let nextSlot = 0;

const ONE = new Vector3(1, 1, 1);
const TV = new Vector3();
const TQ = new Quaternion();
const TM = new Matrix();
const TM2 = new Matrix();
const INV = new Matrix();
/** Scratch per-piece mask (a gear change compares it against the figure's own). */
const VIS = new Uint8Array(MAX_PIECES);
const NO_PIECES: readonly string[] = [];

/** One guard body on a CharacterRig. */
export class GuardFigure {
  /** Under `rig.root`: position and yaw come from the rig. */
  readonly root: TransformNode;
  /** LOD index shown (-1: none loaded yet). */
  current = -1;
  /** A rig joint is re-parented (a ragdoll): world-matrix posing, meshes always active. */
  loose = false;
  /** Called with each LOD's meshes as they are built (shadow casters). */
  onMeshes: ((meshes: readonly Mesh[]) => void) | null = null;
  private readonly lods: (GuardLod | null)[] = [null, null, null, null];
  private readonly rig: TransformNode[];
  private readonly rigLike: RigLike;
  private readonly parents: unknown[];
  /** The rig joints' rest transforms relative to the rig root (world path offsets). */
  private readonly rigRestRel: Matrix[];
  private readonly rigBuf = new Float64Array(RIG_JOINTS.length * TRS);
  private readonly rigRest = new Float64Array(RIG_JOINTS.length * TRS);
  private readonly fingBuf = new Float64Array(FING_LEN);
  private readonly vis: Uint8Array;
  private readonly tints: Uint8Array;
  private visVer = 0;
  private tintVer = 0;
  /** Flash and heat as levels 0..FX_LEVELS (gearMask `fxLevel`): only a level change rewrites gvis. */
  private flashLv = 0;
  private heatLv = 0;
  private have = 0;
  private enabled = true;
  private disposed = false;
  /** (G8 cull) The culling box in this figure's root space (null: each LOD's bind box plus margins). */
  private readonly cullBox: Float32Array | null = null;
  /** (S11) Half-rate stagger slot, and the render frame of the last pose (-Infinity: never posed). */
  readonly slot: number;
  private posedAt = Number.NEGATIVE_INFINITY;
  /** (S11, tests) Poses written so far (local or world path). */
  poses = 0;

  /** Build it right after the rig, before the rig's first pose: the rig's rest is measured here. */
  constructor(private readonly lib: GuardLibrary, rig: RigLike, readonly manifest: GuardManifest, readonly name: string, opts: GuardFigureOptions = {}) {
    const problems = validateGuardManifest(manifest);
    if (problems.length) throw new Error(problems.join('; '));
    this.rigLike = rig;
    this.rig = rigNodes(rig);
    this.root = new TransformNode(`${name}-guard`, lib.scene);
    this.root.parent = rig.root;
    this.root.scaling.setAll(opts.scale ?? 1);
    this.slot = opts.slot ?? nextSlot++;
    // (G8 cull) the rig root's box into the figure root's space (the figure root only scales)
    if (opts.box && opts.box.length >= 6) {
      const k = 1 / (opts.scale ?? 1);
      this.cullBox = new Float32Array(6);
      for (let i = 0; i < 6; i++) this.cullBox[i] = opts.box[i]! * k;
    }
    readRig(this.rig, this.rigRest);
    this.parents = this.rig.map((n) => n.parent);
    rig.root.computeWorldMatrix(true);
    const toRoot = rig.root.getWorldMatrix().clone().invert();
    this.rigRestRel = this.rig.map((n) => n.computeWorldMatrix(true).multiply(toRoot));
    this.vis = new Uint8Array(manifest.pieces.length);
    this.tints = new Uint8Array(manifest.tintSlots * 3).fill(255);
    this.setPieces(opts.pieces ?? NO_PIECES);
    if (opts.tints) this.setTints(opts.tints);
    lib.figures.add(this);
  }

  /** Disposed (its body or scene went away): a load still in flight is abandoned, not failed. */
  get isDisposed(): boolean {
    return this.disposed || this.lib.scene.isDisposed;
  }

  /** Bit i = LOD i ready. */
  get loaded(): number {
    return this.have;
  }

  /** Every mesh this body has built (all LODs; only the shown one is enabled). */
  get renderMeshes(): Mesh[] {
    const out: Mesh[] = [];
    for (const l of this.lods) if (l) out.push(...l.meshes);
    return out;
  }

  /** The shown LOD's mesh (else the first built): what an anim tier watches (`GuardAnimTier`, G7). */
  get mesh(): Mesh | null {
    const l = this.current >= 0 ? this.lods[this.current] : null;
    if (l) return l.meshes[0] ?? null;
    for (const k of this.lods) if (k?.meshes[0]) return k.meshes[0];
    return null;
  }

  /** The meshes of one LOD (tests, tools); empty when not loaded. */
  lodMeshes(lod: number): readonly Mesh[] {
    return this.lods[lod]?.meshes ?? [];
  }

  /** The skeleton of one LOD (tests, tools). */
  lodSkeleton(lod: number): Skeleton | null {
    return this.lods[lod]?.skeleton ?? null;
  }

  /** Is piece `id` shown now (the body piece always is)? False for an id not in this base's file. */
  pieceShown(id: string): boolean {
    const i = this.manifest.pieces.indexOf(id);
    return i >= 0 && this.vis[i] === 1;
  }

  /** Loads one game LOD into this body (shared asset, own skeleton and buffers). Resolves when it can be shown. */
  async load(lod: number): Promise<void> {
    if (this.lods[lod]) return;
    let asset: GuardLodAsset;
    try {
      asset = await this.lib.load(this.manifest, lod);
    } catch (e) {
      if (this.isDisposed) return; // the scene went away mid-load: abandoned, not failed
      throw e;
    }
    if (this.disposed || this.lods[lod]) return;
    this.lods[lod] = this.instance(asset);
    this.have |= 1 << lod;
    this.onMeshes?.(this.lods[lod]!.meshes);
  }

  /** Progressive start: the far level first (smallest file, visible soonest), then LOD0 and LOD1. */
  async loadGameLods(): Promise<void> {
    await this.load(LOD_2);
    await Promise.all([this.load(LOD_0), this.load(LOD_1)]);
  }

  private instance(a: GuardLodAsset): GuardLod {
    const scene = this.lib.scene;
    const engine = scene.getEngine();
    const label = `${this.name}-${LOD_NAMES[a.lod]}`;
    const root = new TransformNode(`${label}-skel-root`, scene);
    root.parent = this.root;
    const S = a.setup;
    const n = S.node.length;
    const skeleton = new Skeleton(`${label}-skel`, `${label}-skel`, scene);
    const bones: Bone[] = [];
    for (let s = 0; s < n; s++) {
      const o = s * TRS;
      const b = S.bindLocal;
      const local = Matrix.Compose(ONE, new Quaternion(b[o + 3]!, b[o + 4]!, b[o + 5]!, b[o + 6]!), new Vector3(b[o]!, b[o + 1]!, b[o + 2]!));
      bones.push(new Bone(S.names[s]!, skeleton, S.parent[s]! >= 0 ? bones[S.parent[s]!]! : null, local));
    }
    const poser = new OperatorPoser(S);
    poser.setRest(this.rigRest);
    // world path: each slot's rest pose under the rig's rest, as an offset from its rig joint (rig-root space)
    const rest = poser.solve(this.rigRest);
    const abs: Matrix[] = [];
    const off: Matrix[] = [];
    const drv = new Int32Array(n);
    const scale = Matrix.Scaling(this.root.scaling.x, this.root.scaling.y, this.root.scaling.z);
    for (let s = 0; s < n; s++) {
      const o = s * TRS;
      const local = Matrix.Compose(ONE, new Quaternion(rest[o + 3]!, rest[o + 4]!, rest[o + 5]!, rest[o + 6]!), new Vector3(rest[o]!, rest[o + 1]!, rest[o + 2]!));
      const p = S.parent[s]!;
      const m = p >= 0 ? local.multiply(abs[p]!) : local;
      abs.push(m);
      let k = S.driver[s]! >= 0 ? S.driver[s]! : 0;
      while (k >= this.rig.length) k = RIG_PARENT[k]!; // a rig without clavicle nodes: the chest drives
      drv[s] = k;
      off.push(m.multiply(scale).multiply(this.rigRestRel[k]!.clone().invert()));
    }
    const parts: GuardPart[] = [];
    const meshes: Mesh[] = [];
    const box = this.cullBox ?? a.box;
    const bmin = new Vector3(box[0], box[1], box[2]);
    const bmax = new Vector3(box[3], box[4], box[5]);
    a.prims.forEach((prim, i) => {
      const m = new Mesh(`${label}-${i}`, scene);
      for (const vb of prim.vbs) {
        m.setVerticesBuffer(new VertexBuffer(engine, vb.buf, vb.kind, { updatable: false, stride: vb.size, size: vb.size, takeBufferOwnership: false }));
      }
      const gvis = new Uint8Array(prim.vertexCount * 4);
      const gvisVb = new VertexBuffer(engine, gvis, 'gvis', { updatable: true, stride: 4, size: 4, type: VertexBuffer.UNSIGNED_BYTE, normalized: true });
      m.setVerticesBuffer(gvisVb);
      m.parent = root;
      m.skeleton = skeleton;
      m.numBoneInfluencers = 4;
      m.material = prim.material;
      m.isPickable = false;
      m.receiveShadows = true;
      m.alwaysSelectAsActiveMesh = this.loose;
      m.setEnabled(false);
      parts.push({ prim, mesh: m, gvis, gvisVb, count: -1, subBox: new BoundingInfo(bmin, bmax), watch: newEffectWatch() });
      meshes.push(m);
    });
    const inst: GuardLod = {
      asset: a, root, skeleton, bones, parts, meshes, poser, off, drv, abs,
      fingIn: new Float64Array(FING_LEN).fill(Number.NaN), visVer: -1, tintVer: -1, flash: -1, heat: -1, pending: false,
    };
    // (perf F2) the pose runs where Babylon computes this skeleton (as the S1 body's, smoothBody.ts): only when a mesh
    // on it is drawn by some pass this frame (camera, cascade, lamp or torch list), never for a culled guard. One
    // closure per guard LOD, made at load
    skeleton.onBeforeComputeObservable.add(() => this.posePending(inst));
    this.sync(inst);
    // the rest box plus margins, root-local (the S1 body's when given): culled like any mesh (skinned bounds never refresh)
    for (const m of meshes) m.setBoundingInfo(new BoundingInfo(bmin, bmax));
    return inst;
  }

  /** Brings a LOD's gvis and indices up to the figure's pieces, tints, flash and heat (writes only what changed). */
  private sync(l: GuardLod): void {
    const visDirty = l.visVer !== this.visVer;
    if (visDirty || l.tintVer !== this.tintVer || l.flash !== this.flashLv || l.heat !== this.heatLv) {
      const flash = this.flashLv / FX_LEVELS, heat = this.heatLv / FX_LEVELS;
      for (let i = 0; i < l.parts.length; i++) {
        const p = l.parts[i]!;
        if (fillGvis(p.prim.piece, p.prim.tint, this.vis, this.tints, flash, p.gvis, heat) || p.count < 0) p.gvisVb.updateDirectly(p.gvis, 0);
      }
    }
    if (visDirty) for (let i = 0; i < l.parts.length; i++) this.uploadIndices(l.parts[i]!);
    l.visVer = this.visVer;
    l.tintVer = this.tintVer;
    l.flash = this.flashLv;
    l.heat = this.heatLv;
  }

  /** The visible pieces' triangles as this guard's index buffer (a gear change, not per frame). */
  private uploadIndices(p: GuardPart): void {
    const prim = p.prim;
    const n = visibleIndices(prim.groups, this.vis, prim.scratch);
    const geo = p.mesh.geometry;
    if (!geo) return;
    const old = geo.getIndexBuffer();
    const engine = this.lib.scene.getEngine();
    const ib: DataBuffer = engine.createIndexBuffer(prim.scratch.subarray(0, n), false, `${p.mesh.name}-indices`);
    geo.setIndexBuffer(ib, prim.vertexCount, n, ib.is32Bits ?? prim.scratch instanceof Uint32Array);
    if (old) engine._releaseBuffer(old);
    p.count = n;
    p.mesh.isVisible = n > 0;
    p.mesh.subMeshes?.[0]?.setBoundingInfo(p.subBox);
  }

  /** After a WebGL context restore: every guard's index buffer back to its visible pieces. */
  restored(): void {
    for (const l of this.lods) {
      if (!l) continue;
      // a LOD behind the figure's pieces rewrites everything when it is next shown
      if (l.visVer !== this.visVer) l.visVer = -1;
      else for (let i = 0; i < l.parts.length; i++) this.uploadIndices(l.parts[i]!);
    }
  }

  /**
   * The visible pieces, a spawn or gear change: G6's reused `GuardPieces` as `applyGear` leaves it
   * (`setPieces(p.ids, p.count)`; entries past `count` are stale and ignored). Contract ids; ids not in this base's
   * file are ignored; the body piece (the base id: skin, neck, wrists) is always shown, listed or not. No allocation.
   */
  setPieces(ids: readonly string[], count = ids.length): void {
    pieceMask(this.manifest.pieces, ids, count, VIS);
    let same = true;
    for (let i = 0; i < this.vis.length; i++) {
      if (this.vis[i] !== VIS[i]) {
        same = false;
        this.vis[i] = VIS[i]!;
      }
    }
    // (the first call always counts: nothing written yet)
    if (same && this.visVer > 0) return;
    this.visVer++;
    const l = this.current >= 0 ? this.lods[this.current] : null;
    if (l) this.sync(l);
  }

  /** The tint table: rgb bytes (sRGB) per tint slot, `manifest.tintSlots` x 3. */
  setTints(rgb: ArrayLike<number>): void {
    const t = this.tints;
    let same = true;
    for (let i = 0; i < t.length; i++) {
      const v = rgb[i] ?? 255;
      if (t[i] !== v) {
        same = false;
        t[i] = v;
      }
    }
    if (same) return;
    this.tintVer++;
    const l = this.current >= 0 ? this.lods[this.current] : null;
    if (l) this.sync(l);
  }

  /**
   * Hit flash 0..1 (towards white, as `SmoothBody.setFlash`), in FX_LEVELS steps: the shown LOD's gvis now, the others
   * when shown.
   */
  setFlash(k: number): void {
    const lv = fxLevel(k);
    if (lv === this.flashLv) return;
    this.flashLv = lv;
    const l = this.current >= 0 ? this.lods[this.current] : null;
    if (l) this.sync(l);
  }

  /**
   * Thermal warmth 0..1 (render only), in FX_LEVELS steps folded into gvis like the flash (gameState moves it in 1/16
   * steps): the final colour towards white in the guard's own draw. Not Wren's overlay, which is a second draw per
   * mesh (24 guards in thermal would add 24 draws). The shown LOD now, the others when shown.
   */
  setHeat(k: number): void {
    const lv = fxLevel(k);
    if (lv === this.heatLv) return;
    this.heatLv = lv;
    const l = this.current >= 0 ? this.lods[this.current] : null;
    if (l) this.sync(l);
  }

  /** Guards keep their heads (the camera fade is the player's); present for the body interface. */
  setHeadVisible(_v: boolean): void {}

  setEnabled(v: boolean): void {
    if (v === this.enabled) return;
    this.enabled = v;
    const l = this.current >= 0 ? this.lods[this.current] : null;
    if (l) for (const m of l.meshes) m.setEnabled(v);
  }

  /**
   * Per frame, after the rig's update: the LOD for `camera` (distance with hysteresis, `GUARD_LOD.edges`), the culling
   * mode, and whether to pose this frame: (S11) from `GUARD_LOD.halfRateFrom` every other frame, staggered by `slot` (a
   * LOD switch and a ragdoll pose at once). (perf F2) The pose itself (local retarget, or the world path while a joint
   * is re-parented) runs in the skeleton's compute (`posePending`), only if a pass draws the guard. No allocation.
   */
  update(camera: Camera | null): void {
    if (this.disposed) return;
    let dist = 0;
    if (camera) {
      const c = camera.globalPosition;
      const p = this.rig[0]!.getAbsolutePosition();
      dist = hyp3(c.x - p.x, c.y - p.y, c.z - p.z);
    }
    const want = pickLod(this.current, dist, false, this.have, GUARD_LOD.edges);
    const switched = want !== this.current;
    if (switched) {
      const old = this.current >= 0 ? this.lods[this.current] : null;
      if (old) for (let i = 0; i < old.meshes.length; i++) old.meshes[i]!.setEnabled(false);
      this.current = want;
      const now = want >= 0 ? this.lods[want] : null;
      if (now) {
        this.sync(now);
        for (let i = 0; i < now.meshes.length; i++) now.meshes[i]!.setEnabled(this.enabled);
      }
    }
    // (S1) a re-parented joint (ragdoll): the rest box no longer bounds the body, the local chain no longer holds
    let loose = false;
    for (let i = 1; i < this.rig.length; i++) {
      if (this.rig[i]!.parent !== this.parents[i]) {
        loose = true;
        break;
      }
    }
    if (loose !== this.loose) {
      this.loose = loose;
      for (const l of this.lods) if (l) for (let i = 0; i < l.meshes.length; i++) l.meshes[i]!.alwaysSelectAsActiveMesh = loose;
    }
    const l = this.current >= 0 ? this.lods[this.current] : null;
    if (!l || !this.enabled) return;
    // (S11) half rate far away: the skipped frame keeps last frame's bones (the skeleton is not marked, so nothing is
    // recomputed or uploaded); a LOD just shown has stale bones and always poses
    const frame = this.lib.scene.getFrameId();
    if (!loose && !switched && !guardPosesNow(this.current, this.slot, frame, this.posedAt)) return;
    this.posedAt = frame;
    // (perf F2) lazy: mark the skeleton and leave the joint read and the solve to its compute (`posePending`), which
    // Babylon runs only if a pass draws this guard this frame. Off screen and in no shadow list: no pose, no upload.
    // A pending pose left over (not drawn) runs from the rig as it is when the guard is next drawn
    l.pending = true;
    l.bones[0]?.markAsDirty();
  }

  /**
   * (gm-watchdog) Once per render, after `update`: the shown LOD's main-pass effects. Each drawn part's effect is
   * watched (`watchBodyEffect`, logged as 'guard figure': a timed-out, failed or disposed compile is recompiled at once,
   * one that never finishes after STUCK_MS and STUCK_FRAMES, at most MAX_RECOMPILES per variant). 1: every drawn
   * part's effect is ready; -1: one is unready; 0: nothing to judge (disposed, disabled, no LOD shown, or no effect
   * asked for yet: culled since it was shown, or just dropped by a recompile). No allocation.
   * An effect the watch recompiles this render counts as unready (it was; the drop leaves the sub-mesh without one).
   */
  drawState(now: number): number {
    if (this.disposed || !this.enabled) return 0;
    const l = this.current >= 0 ? this.lods[this.current] : null;
    if (!l) return 0;
    let unready = false;
    let ready = false;
    for (let i = 0; i < l.parts.length; i++) {
      const p = l.parts[i]!;
      if (p.count === 0) continue; // no visible piece: never drawn
      if (watchBodyEffect(p.mesh, p.watch, now, 'guard figure')) {
        unready = true;
        continue;
      }
      const e = p.mesh.subMeshes?.[0]?.effect;
      if (!e || e.isDisposed) continue;
      if (e.isReady()) ready = true;
      else unready = true;
    }
    return unready ? -1 : ready ? 1 : 0;
  }

  /**
   * (GM-PERF-CHECK 6, S11-CHECK P2) Runs the pose `update` asked for now, not at the skeleton's next compute: Babylon
   * computes a skeleton once per render id, so a pose asked for after this render's compute (a thaw, a death while
   * frozen) would draw a frame late. For those rare events only (one compute; the render's own compute then finds the
   * skeleton clean). No allocation.
   */
  poseNow(): void {
    if (this.disposed) return;
    const l = this.current >= 0 ? this.lods[this.current] : null;
    if (!l || !l.pending) return;
    l.skeleton.prepare(true);
  }

  /**
   * (perf F2) The skeleton's compute (`onBeforeComputeObservable`, during the active-mesh evaluation or a shadow pass):
   * the pose `update` asked for, from the rig now (local retarget, or the world path while a joint is re-parented).
   * Nothing when no pose is pending. No allocation.
   */
  private posePending(l: GuardLod): void {
    if (!l.pending || this.disposed) return;
    l.pending = false;
    this.poses++;
    if (this.loose) this.poseWorld(l);
    else this.poseLocal(l);
  }

  /** (S11, tests) The bone count of LOD `lod` (0 when not loaded): what is posed and uploaded per posed frame. */
  lodBoneCount(lod: number): number {
    return this.lods[lod]?.bones.length ?? 0;
  }

  /** The retarget: the rig's local transforms through the poser into the bones' local matrices. */
  private poseLocal(l: GuardLod): void {
    readRig(this.rig, this.rigBuf);
    const fr = l.asset.fingers;
    if (fr) {
      // rebuilt only when a value moved (as Wren's figure)
      const fv = this.rigLike.fingers ?? this.gripShape();
      const last = l.fingIn;
      let moved = false;
      for (let i = 0; i < FING_LEN; i++) {
        if (fv[i] !== last[i]) {
          moved = true;
          last[i] = fv[i]!;
        }
      }
      if (moved) fingerPose(fr, fv, l.poser.extraQ, l.poser.extraOn);
    }
    const out = l.poser.solve(this.rigBuf);
    for (let s = 0; s < l.bones.length; s++) {
      const o = s * TRS;
      TV.set(out[o]!, out[o + 1]!, out[o + 2]!);
      TQ.set(out[o + 3]!, out[o + 4]!, out[o + 5]!, out[o + 6]!);
      Matrix.ComposeToRef(ONE, TQ, TV, l.bones[s]!.getLocalMatrix());
    }
  }

  /** (S2) The hands' shape from the rig's grip closures (a rig without per-finger values). */
  private gripShape(): Float64Array {
    const hg = this.rigLike.handGrip;
    handGripShape(hg ? hg.l : 0, hg ? hg.r : 0, this.rigLike.rightTrigger !== false, this.fingBuf);
    return this.fingBuf;
  }

  /**
   * Ragdoll / re-parented joints: each bone = its rest offset x its rig joint's world matrix, in skeleton space
   * (bone local = absolute x inverse parent absolute). No allocation.
   */
  private poseWorld(l: GuardLod): void {
    const rig = this.rig;
    for (let j = 0; j < rig.length; j++) rig[j]!.computeWorldMatrix();
    l.root.computeWorldMatrix().invertToRef(INV);
    const parent = l.asset.setup.parent;
    for (let s = 0; s < l.bones.length; s++) {
      l.off[s]!.multiplyToRef(rig[l.drv[s]!]!.getWorldMatrix(), TM);
      TM.multiplyToRef(INV, l.abs[s]!);
      const local = l.bones[s]!.getLocalMatrix();
      const p = parent[s]!;
      if (p < 0) local.copyFrom(l.abs[s]!);
      else {
        l.abs[p]!.invertToRef(TM2);
        l.abs[s]!.multiplyToRef(TM2, local);
      }
    }
  }

  /** Frees this body (its meshes, skeletons, gvis and index buffers); the shared (base, LOD) data stays. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.lib.figures.delete(this);
    for (let i = 0; i < this.lods.length; i++) {
      const l = this.lods[i];
      if (!l) continue;
      // the geometry releases the gvis buffer it owns and this guard's index buffer; the static buffers are the
      // library's (not owned by the meshes' vertex buffers)
      for (const m of l.meshes) m.dispose(false, false);
      l.skeleton.dispose();
      this.lods[i] = null;
    }
    this.root.dispose();
    this.have = 0;
    this.current = -1;
  }
}
