/**
 * Operator bodies in the game (step 11d; wired in 11e). Babylon only through core/babylon.ts.
 *
 * - `OperatorLibrary` (one per Scene): loads a LOD file once (same-origin fetch of a build URL, the pure GLB reader),
 *   builds its geometry, bone order and materials once, and shares them between every body of that operator (co-op:
 *   both players are Wren, D31). KTX2 textures go through Babylon's bundled transcoder (D27, lab/ktx2.ts).
 * - `OperatorFigure` (one per body): its own TransformNodes and Skeleton per loaded LOD, bones linked to those nodes
 *   (Bone.linkTransformNode), posed every frame from the CharacterRig by the non-allocating `OperatorPoser` (the rig
 *   stays the pose authority). LOD by camera distance with hysteresis, hero for registered close-up cameras (D21),
 *   goggle stowed / in use with a dim / full glow (G73), head hiding for the camera fade, dispose.
 *
 * Render side only: nothing here is read by gameplay (light meter, perception and hit volumes read the rig's joints and
 * the controller; SURVEY.md). The goggle glow is emissive, not a light, so it cannot change what the light meter or a
 * guard measures (light parity).
 */
import {
  Bone, Color3, Matrix, Mesh, PBRMaterial, Quaternion, Skeleton, Texture, TransformNode, Vector3, VertexData,
  type Camera, type Scene,
} from '../../core/babylon';
import { hyp3 } from '../../core/mathx';
import { parseGlb, type GlbImage, type GlbModel } from '../lab/glb';
import { ktx2Setup } from '../lab/ktx2';
import { GoggleState, goggleRange, partitionGoggle, type GogglePartition, type GogglePose } from './goggle';
import { CLOSE_CAMERAS, pickLod } from './lodPick';
import { flags } from '../../core/flags';
import { LOD_0, LOD_2, LOD_HERO, LOD_NAMES, sameOrigin, validateModel, type OperatorManifest } from './manifest';
import { OperatorPoser, poserSetup, RIG_JOINTS, TRS, type PoserSetup } from './pose';

/** The CharacterRig fields the figure reads (CharacterRig satisfies this structurally; no import of its internals). */
export interface RigLike {
  readonly root: TransformNode;
  readonly body: TransformNode;
  readonly hips: TransformNode;
  readonly spine: TransformNode;
  readonly torso: TransformNode;
  readonly neck: TransformNode;
  readonly headNode: TransformNode;
  readonly shoulderL: TransformNode;
  readonly elbowL: TransformNode;
  readonly wristL: TransformNode;
  readonly shoulderR: TransformNode;
  readonly elbowR: TransformNode;
  readonly wristR: TransformNode;
  readonly hipL: TransformNode;
  readonly kneeL: TransformNode;
  readonly ankleL: TransformNode;
  readonly hipR: TransformNode;
  readonly kneeR: TransformNode;
  readonly ankleR: TransformNode;
}

/** The rig's joint nodes in RIG_JOINTS order. */
export function rigNodes(r: RigLike): TransformNode[] {
  return [
    r.root, r.body, r.hips, r.spine, r.torso, r.neck, r.headNode, r.shoulderL, r.elbowL, r.wristL, r.shoulderR,
    r.elbowR, r.wristR, r.hipL, r.kneeL, r.ankleL, r.hipR, r.kneeR, r.ankleR,
  ];
}

/** Copies the rig's local transforms into `out` (RIG_JOINTS order, TRS each; the root is the frame: zero). No allocation. */
export function readRig(nodes: readonly TransformNode[], out: Float64Array): void {
  out[0] = 0; out[1] = 0; out[2] = 0; out[3] = 0; out[4] = 0; out[5] = 0; out[6] = 1;
  for (let j = 1; j < nodes.length; j++) {
    const n = nodes[j]!;
    const o = j * TRS;
    out[o] = n.position.x; out[o + 1] = n.position.y; out[o + 2] = n.position.z;
    const q = n.rotationQuaternion;
    if (q) { out[o + 3] = q.x; out[o + 4] = q.y; out[o + 5] = q.z; out[o + 6] = q.w; }
    else { out[o + 3] = 0; out[o + 4] = 0; out[o + 5] = 0; out[o + 6] = 1; }
  }
}

// ---- files: fetched and parsed once per URL (CPU side, shared by every scene) ----

const MODELS = new Map<string, Promise<GlbModel>>();

/** Fetches and parses a LOD file (same origin only). A failed load is not cached, so a retry fetches again. */
export function loadModel(url: string): Promise<GlbModel> {
  let p = MODELS.get(url);
  if (!p) {
    if (!sameOrigin(url, typeof location !== 'undefined' ? location.origin : undefined)) return Promise.reject(new Error(`operator asset leaves the origin: ${url}`));
    p = fetch(url).then(async (r) => {
      if (!r.ok) throw new Error(`operator asset ${url}: HTTP ${r.status}`);
      return parseGlb(await r.arrayBuffer());
    });
    p.catch(() => MODELS.delete(url));
    MODELS.set(url, p);
  }
  return p;
}

/** Drops the parsed files (frees their buffers; the GPU copies stay with their scene). */
export function forgetModels(): void {
  MODELS.clear();
}

/** Drops one parsed file (the menu drops the 55 MB hero when it closes; a later close-up reads it from the cache). */
export function forgetModel(url: string): void {
  MODELS.delete(url);
}

/**
 * (11e, D33: Michael "Yes use hero for menu") The hero LOD for the main menu and registered close-up cameras (photo
 * mode). Loaded only when such a camera asks for it, never on the way into play; gameplay cameras keep LOD0-2. False:
 * close-ups use LOD0 (the hero file can then leave the build: src/operators/assets/wren/wren-hero.glb).
 */
export const HERO_CLOSE_UPS = true;

// ---- per-scene GPU resources ----

/** One LOD file's shared GPU side. */
export interface LodAsset {
  lod: number;
  setup: PoserSetup;
  /** Hidden source meshes: their geometry is shared by every body. */
  sources: Mesh[];
  /** Material index per source mesh. */
  materialOf: number[];
  parts: GogglePartition[];
  materials: PBRMaterial[];
  /** Index of the lens material (cloned per body: each body has its own glow level), -1 if none. */
  glow: number;
  glowBase: Color3;
}

const GLOW_DEFAULT: readonly [number, number, number] = [0.3, 0.85, 0.16];

/** KTX2 (KHR_texture_basisu) through the bundled transcoder, or PNG / WebP; flips KTX2 in the texture matrix (A79). */
function texture(scene: Scene, im: GlbImage | undefined, srgb: boolean): Texture | null {
  if (!im) return null;
  const isKtx2 = im.mime === 'image/ktx2';
  if (isKtx2) ktx2Setup(scene.getEngine() as Parameters<typeof ktx2Setup>[0]);
  const url = URL.createObjectURL(new Blob([im.data as BlobPart], { type: im.mime }));
  const t = new Texture(url, scene, false, !isKtx2, Texture.TRILINEAR_SAMPLINGMODE, () => URL.revokeObjectURL(url), () => URL.revokeObjectURL(url), null, false, undefined, im.mime, undefined, undefined, isKtx2 ? '.ktx2' : undefined);
  // the reader v-flips the UVs; a compressed KTX2 cannot be flipped at upload (Babylon 9 does not compensate)
  if (isKtx2) { t.vScale = -1; t.vOffset = 1; }
  t.gammaSpace = srgb;
  return t;
}

/** Builds a LOD file's shared GPU side (load time). Material settings as the Operator Lab's (step 10-11). */
export function buildLodAsset(scene: Scene, model: GlbModel, lod: number, label: string): LodAsset {
  const problems = validateModel(model, label);
  if (problems.length) throw new Error(problems.join('; '));
  const setup = poserSetup(model.nodes, model.joints);
  const slotOfNode = new Map<number, number>();
  for (let s = 0; s < setup.node.length; s++) slotOfNode.set(setup.node[s]!, s);
  const boneOfSkin = model.joints.map((nd) => slotOfNode.get(nd) ?? 0);
  let glow = -1;
  let glowBase = new Color3(...GLOW_DEFAULT);
  const materials = model.materials.map((m, i) => {
    const p = new PBRMaterial(`${label}-${m.name}`, scene);
    p.albedoColor = new Color3(...m.base);
    p.metallic = m.metallic > 0.5 ? 0.9 : 0;
    p.roughness = m.roughness;
    const albedo = texture(scene, m.baseTex, true);
    if (albedo) p.albedoTexture = albedo;
    const orm = texture(scene, m.ormTex, false);
    if (orm) {
      p.metallicTexture = orm;
      p.useAmbientOcclusionFromMetallicTextureRed = true;
      p.useRoughnessFromMetallicTextureGreen = true;
      p.useMetallnessFromMetallicTextureBlue = true;
      p.metallic = m.metallic;
      p.roughness = m.roughness;
    }
    const nrm = texture(scene, m.normalTex, false);
    if (nrm) {
      p.bumpTexture = nrm;
      p.invertNormalMapX = true;
      p.invertNormalMapY = true;
    }
    p.environmentIntensity = /metal|aluminium|hardware/.test(m.name) ? 1 : 0.25;
    p.directIntensity = Math.PI; // as the game's parts: PBR divides diffuse by pi
    p.backFaceCulling = false;
    p.twoSidedLighting = true;
    if (m.name.endsWith('-glow')) {
      glow = i;
      if (m.emissive[0] + m.emissive[1] + m.emissive[2] > 0) glowBase = new Color3(...m.emissive);
      p.emissiveColor = glowBase.clone();
    }
    return p;
  });
  const sources: Mesh[] = [];
  const parts: GogglePartition[] = [];
  const materialOf: number[] = [];
  for (const g of model.meshes) {
    const part = partitionGoggle(g.indices, g.goggle);
    const mesh = new Mesh(`${label}-src-${g.name}-${sources.length}`, scene);
    const vd = new VertexData();
    vd.positions = g.positions;
    vd.normals = g.normals;
    vd.uvs = g.uvs;
    if (g.tangents) vd.tangents = g.tangents;
    vd.indices = part.indices as unknown as number[];
    const idx = new Float32Array(g.joints.length);
    for (let i = 0; i < idx.length; i++) idx[i] = g.weights[i]! > 0 ? boneOfSkin[g.joints[i]!] ?? 0 : 0;
    vd.matricesIndices = idx;
    vd.matricesWeights = g.weights;
    vd.applyToMesh(mesh, false);
    mesh.setEnabled(false);
    mesh.isPickable = false;
    sources.push(mesh);
    parts.push(part);
    materialOf.push(g.material);
  }
  return { lod, setup, sources, materialOf, parts, materials, glow, glowBase };
}

export function disposeLodAsset(a: LodAsset): void {
  for (const m of a.sources) m.dispose();
  for (const m of a.materials) m.dispose(false, true);
}

/** Every operator LOD loaded into one scene, shared by the bodies in it. Disposed with the scene. */
export class OperatorLibrary {
  private readonly assets = new Map<string, Promise<LodAsset>>();
  private readonly built: LodAsset[] = [];

  constructor(readonly scene: Scene) {
    scene.onDisposeObservable.addOnce(() => this.dispose());
  }

  load(manifest: OperatorManifest, lod: number): Promise<LodAsset> {
    const url = manifest.urls[lod];
    if (!url) return Promise.reject(new Error(`${manifest.id}: ${LOD_NAMES[lod] ?? lod} not in the build`));
    const key = `${manifest.id}:${lod}`;
    let p = this.assets.get(key);
    if (!p) {
      p = loadModel(url).then((model) => {
        const a = buildLodAsset(this.scene, model, lod, `${manifest.id}-${LOD_NAMES[lod]}`);
        this.built.push(a);
        return a;
      });
      p.catch(() => this.assets.delete(key));
      this.assets.set(key, p);
    }
    return p;
  }

  dispose(): void {
    for (const a of this.built) disposeLodAsset(a);
    this.built.length = 0;
    this.assets.clear();
  }
}

// ---- one body ----

interface LodInstance {
  asset: LodAsset;
  root: TransformNode;
  nodes: TransformNode[];
  skeleton: Skeleton;
  meshes: Mesh[];
  poser: OperatorPoser;
  glowMat: PBRMaterial | null;
  head: number;
}

const RANGE: [number, number] = [0, 0];

/** Every operator body alive (close-up cameras switch them to the hero, `setCloseCamera`). */
export const LIVE_FIGURES = new Set<OperatorFigure>();

/**
 * Registers (`on`) or drops a close-up camera (D21: main menu, photo mode). Bodies in its scene load their close-up LOD
 * and re-pick at once, so a frozen game (photo mode) still swaps to the hero. Render side only.
 */
export function setCloseCamera(camera: Camera, on: boolean): void {
  if (on) CLOSE_CAMERAS.add(camera.uniqueId);
  else CLOSE_CAMERAS.remove(camera.uniqueId);
  const scene = camera.getScene();
  for (const f of LIVE_FIGURES) {
    if (f.root.getScene() !== scene) continue;
    f.update(scene.activeCamera);
    if (!on) continue;
    f.loadCloseUp().then(
      () => f.update(scene.activeCamera),
      (e: unknown) => console.warn('[operators] close-up LOD failed', e),
    );
  }
}

/** One operator body on a CharacterRig. */
export class OperatorFigure {
  /** Under `rig.root`: position and yaw come from the rig. */
  readonly root: TransformNode;
  readonly goggle = new GoggleState();
  /** LOD index shown (-1: none loaded yet). */
  current = -1;
  private readonly lods: (LodInstance | null)[] = [null, null, null, null];
  private readonly rig: TransformNode[];
  private readonly rigBuf = new Float64Array(RIG_JOINTS.length * TRS);
  private readonly rigRest = new Float64Array(RIG_JOINTS.length * TRS);
  private have = 0;
  private headVisible = true;
  private enabled = true;
  private glowShown = -1;
  private disposed = false;
  /** Called with each LOD's meshes as they are built (shadow casters, 11e). */
  onMeshes: ((meshes: readonly Mesh[]) => void) | null = null;

  /** Build it right after the rig, before the rig's first pose: the rig's translations are measured from here. */
  constructor(private readonly lib: OperatorLibrary, rig: RigLike, readonly manifest: OperatorManifest, readonly name: string) {
    this.rig = rigNodes(rig);
    this.root = new TransformNode(`${name}-operator`, lib.scene);
    this.root.parent = rig.root;
    readRig(this.rig, this.rigRest);
    LIVE_FIGURES.add(this);
  }

  /** The close-up LOD (menu, photo mode): the hero when it is in the build and switched on, else LOD0; `?gfx=min`
   *  (tests, software GL): LOD2, never the hero (A102; a photo-mode e2e fetched 55 MB). */
  loadCloseUp(): Promise<void> {
    if (flags.gfx === 'min') return this.load(LOD_2);
    return this.load(HERO_CLOSE_UPS && this.manifest.urls[LOD_HERO] ? LOD_HERO : LOD_0);
  }

  /** Thermal warmth 0..1 (render only; the rig's `heat`): a white overlay per mesh, as the old body's emissive flag. */
  setHeat(k: number): void {
    if (k === this.heatK) return;
    this.heatK = k;
    for (const l of this.lods) if (l) this.applyHeat(l);
  }

  private heatK = 0;

  private applyHeat(l: LodInstance): void {
    const k = this.heatK;
    for (const m of l.meshes) {
      m.renderOverlay = k > 0;
      m.overlayAlpha = k;
      m.overlayColor.set(1, 1, 1);
    }
  }

  /** Loads one LOD into this body (shared asset, own skeleton). Resolves when it can be shown. */
  async load(lod: number): Promise<void> {
    if (this.lods[lod]) return;
    const asset = await this.lib.load(this.manifest, lod);
    if (this.disposed || this.lods[lod]) return;
    this.lods[lod] = this.instance(asset);
    this.have |= 1 << lod;
    this.onMeshes?.(this.lods[lod]!.meshes);
  }

  /** Progressive start: the far level first (smallest file, visible soonest), then LOD0, then LOD1. */
  async loadGameLods(): Promise<void> {
    await this.load(3);
    await Promise.all([this.load(1), this.load(2)]);
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

  private instance(a: LodAsset): LodInstance {
    const scene = this.lib.scene;
    const label = `${this.name}-${LOD_NAMES[a.lod]}`;
    const root = new TransformNode(`${label}-skel-root`, scene);
    root.parent = this.root;
    const S = a.setup;
    const n = S.node.length;
    const nodes: TransformNode[] = [];
    const skeleton = new Skeleton(`${label}-skel`, `${label}-skel`, scene);
    const bones: Bone[] = [];
    let head = -1;
    for (let s = 0; s < n; s++) {
      const o = s * TRS;
      const b = S.bindLocal;
      const t = new TransformNode(`${label}-${S.names[s]}`, scene);
      t.parent = S.parent[s]! >= 0 ? nodes[S.parent[s]!]! : root;
      t.position.set(b[o]!, b[o + 1]!, b[o + 2]!);
      t.rotationQuaternion = new Quaternion(b[o + 3]!, b[o + 4]!, b[o + 5]!, b[o + 6]!);
      nodes.push(t);
      const local = Matrix.Compose(Vector3.One(), t.rotationQuaternion, t.position);
      const bone = new Bone(S.names[s]!, skeleton, S.parent[s]! >= 0 ? bones[S.parent[s]!]! : null, local);
      bone.linkTransformNode(t);
      bones.push(bone);
      if (S.names[s] === 'head') head = s;
    }
    let glowMat: PBRMaterial | null = null;
    if (a.glow >= 0) {
      glowMat = a.materials[a.glow]!.clone(`${label}-glow`);
    }
    const meshes: Mesh[] = [];
    a.sources.forEach((src, i) => {
      const m = new Mesh(`${label}-${i}`, scene);
      src.geometry!.applyToMesh(m);
      m.parent = root;
      m.skeleton = skeleton;
      m.numBoneInfluencers = 4;
      const mi = a.materialOf[i]!;
      m.material = mi === a.glow && glowMat ? glowMat : a.materials[mi] ?? a.materials[0]!;
      m.alwaysSelectAsActiveMesh = true; // skinned: bind-pose bounds lie (as the voxel body)
      m.isPickable = false;
      m.receiveShadows = true;
      m.setEnabled(false);
      meshes.push(m);
    });
    const poser = new OperatorPoser(S);
    poser.setRest(this.rigRest);
    const inst: LodInstance = { asset: a, root, nodes, skeleton, meshes, poser, glowMat, head };
    this.applyGoggle(inst, this.goggle.pose);
    this.applyHead(inst);
    if (this.heatK > 0) this.applyHeat(inst);
    return inst;
  }

  private applyGoggle(l: LodInstance, pose: GogglePose): void {
    for (let i = 0; i < l.meshes.length; i++) {
      const sm = l.meshes[i]!.subMeshes?.[0];
      if (!sm) continue;
      goggleRange(l.asset.parts[i]!, pose, RANGE);
      sm.indexStart = RANGE[0];
      sm.indexCount = RANGE[1];
    }
  }

  private applyHead(l: LodInstance): void {
    if (l.head >= 0) l.nodes[l.head]!.scaling.setAll(this.headVisible ? 1 : 0);
  }

  /**
   * Per frame, after the rig's update: choose the LOD for `camera` (distance with hysteresis; hero for a registered
   * close-up camera) and pose it from the rig. No allocation.
   */
  update(camera: Camera | null): void {
    if (this.disposed) return;
    let dist = 0;
    let close = false;
    if (camera) {
      const c = camera.globalPosition;
      const p = this.rig[0]!.position;
      dist = hyp3(c.x - p.x, c.y - p.y, c.z - p.z);
      close = CLOSE_CAMERAS.has(camera.uniqueId);
    }
    const want = pickLod(this.current, dist, close, this.have);
    if (want !== this.current) {
      const old = this.current >= 0 ? this.lods[this.current] : null;
      if (old) for (const m of old.meshes) m.setEnabled(false);
      this.current = want;
      this.glowShown = -1;
      const now = want >= 0 ? this.lods[want] : null;
      if (now) for (const m of now.meshes) m.setEnabled(this.enabled);
    }
    const l = this.current >= 0 ? this.lods[this.current] : null;
    if (!l || !this.enabled) return;
    readRig(this.rig, this.rigBuf);
    const out = l.poser.solve(this.rigBuf);
    for (let s = 0; s < l.nodes.length; s++) {
      const t = l.nodes[s]!;
      const o = s * TRS;
      t.position.set(out[o]!, out[o + 1]!, out[o + 2]!);
      t.rotationQuaternion!.set(out[o + 3]!, out[o + 4]!, out[o + 5]!, out[o + 6]!);
    }
    if (l.glowMat && this.glowShown !== this.goggle.glow) {
      const k = this.goggle.glow;
      const b = l.asset.glowBase;
      l.glowMat.emissiveColor.set(b.r * k, b.g * k, b.b * k);
      this.glowShown = k;
    }
  }

  /** The vision mode on screen (`VisionState.shown`; a remote body: 'off'). Swaps the goggle at the flip's middle. */
  setVision(shown: string, dt: number): void {
    if (this.goggle.update(shown, dt)) for (const l of this.lods) if (l) this.applyGoggle(l, this.goggle.pose);
  }

  /** Respawn / new match: stowed and dim at once. */
  resetGoggle(): void {
    this.goggle.reset();
    for (const l of this.lods) if (l) this.applyGoggle(l, 'stowed');
    this.glowShown = -1;
  }

  /** The camera fade's head hide (the head joint scaled to zero: no extra draw, the goggle goes with it). */
  setHeadVisible(v: boolean): void {
    if (v === this.headVisible) return;
    this.headVisible = v;
    for (const l of this.lods) if (l) this.applyHead(l);
  }

  setEnabled(v: boolean): void {
    if (v === this.enabled) return;
    this.enabled = v;
    const l = this.current >= 0 ? this.lods[this.current] : null;
    if (l) for (const m of l.meshes) m.setEnabled(v);
  }

  /** Frees this body (its meshes, skeletons, nodes, glow); the shared files stay in the library. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    LIVE_FIGURES.delete(this);
    for (let i = 0; i < this.lods.length; i++) {
      const l = this.lods[i];
      if (!l) continue;
      for (const m of l.meshes) m.dispose(false, false);
      l.skeleton.dispose();
      l.glowMat?.dispose();
      this.lods[i] = null;
    }
    this.root.dispose();
    this.have = 0;
    this.current = -1;
  }
}
