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
 *
 * (anim-skeleton S2) The skin's T3 joints are driven: the clavicles from the rig's clavicle nodes (readRig undoes the
 * clavicle's carry of the shoulder, which the skin's own clavicle joint gives), the finger joints from the rig's
 * per-finger curl / spread (`rig.fingers`, anim/fingers.ts; the hero's grip morphs are left at 0 where the bones close
 * the hand, A9), the goggle joints by the gear offset of this body's goggle pose (`rig.goggleOff`, read in the rig's own
 * animate window).
 */
import {
  Bone, Color3, Matrix, Mesh, MorphTarget, MorphTargetManager, PBRMaterial, Quaternion, Skeleton, Texture, TransformNode,
  Vector3, VertexData, type Camera, type Scene,
} from '../../core/babylon';
import { hyp3 } from '../../core/mathx';
import { parseGlb, type GlbImage, type GlbMaterial, type GlbModel } from '../lab/glb';
import { ktx2Abandoned, ktx2Setup } from '../lab/ktx2';
import { GOGGLE_OFFSET, GoggleState, goggleRange, partitionGoggle, type GogglePartition, type GogglePose } from './goggle';
import { FING_LEN, fingerPose, fingerRig, handGripShape, type FingerRig } from '../../anim/fingers';
import { eulerQuat } from '../../anim/tuneJoints';
import { CLOSE_CAMERAS, pickLod } from './lodPick';
import { flags } from '../../core/flags';
import { LOD_0, LOD_2, LOD_HERO, LOD_NAMES, sameOrigin, validateModel, type OperatorManifest } from './manifest';
import { OperatorPoser, poserSetup, RIG_JOINTS, RIG_T3, TRS, type PoserSetup } from './pose';
import { pageLeaving } from './offline';

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
  /** (anim-rig) The toe joints at the ball of each foot (pitched up as the planted foot rolls onto its ball). */
  readonly toeL: TransformNode;
  readonly toeR: TransformNode;
  /** (feature/weapons) How closed each hand is round a grip, 0..1 (CharacterRig: the weapon grips, world grips). */
  readonly handGrip?: { readonly l: number; readonly r: number };
  /** (anim-cleanup) The right hand is on a weapon's trigger grip (the trigger shape; else a full wrap). */
  readonly rightTrigger?: boolean;
  /** (anim-skeleton S2) The clavicle nodes (under the chest at the SC points, identity rest). */
  readonly clavL?: TransformNode;
  readonly clavR?: TransformNode;
  /** (S2) Per-finger curl / spread (anim/fingers.ts layout, FING_LEN); absent: from `handGrip`. */
  readonly fingers?: ArrayLike<number>;
  /** (S2) The goggle gear offsets read in the rig's animate window: stowed (x y z pitch yaw roll) then in use. */
  readonly goggleOff?: ArrayLike<number>;
}

/** The rig's joint nodes in RIG_JOINTS order (a rig without clavicle nodes: the pre-T3 joints only). */
export function rigNodes(r: RigLike): TransformNode[] {
  const out = [
    r.root, r.body, r.hips, r.spine, r.torso, r.neck, r.headNode, r.shoulderL, r.elbowL, r.wristL, r.shoulderR,
    r.elbowR, r.wristR, r.hipL, r.kneeL, r.ankleL, r.hipR, r.kneeR, r.ankleR, r.toeL, r.toeR,
  ];
  if (r.clavL && r.clavR) out.push(r.clavL, r.clavR);
  return out;
}

const SH_L = RIG_JOINTS.indexOf('shL');
const SH_R = RIG_JOINTS.indexOf('shR');
const CLAV_L = RIG_JOINTS.indexOf('clavL');
const CLAV_R = RIG_JOINTS.indexOf('clavR');

/**
 * Copies the rig's local transforms into `out` (RIG_JOINTS order, TRS each; the root is the frame: zero; joints the
 * rig lacks: identity). (anim-skeleton S2) A turned clavicle has carried its shoulder about the SC point in the rig;
 * the skin's shoulder follows its own clavicle joint, so the shoulder's position goes in as before that carry (an
 * identity clavicle: untouched, bit for bit). No allocation.
 */
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
  for (let j = Math.max(nodes.length, RIG_T3); j < RIG_JOINTS.length; j++) {
    const o = j * TRS;
    out[o] = 0; out[o + 1] = 0; out[o + 2] = 0; out[o + 3] = 0; out[o + 4] = 0; out[o + 5] = 0; out[o + 6] = 1;
  }
  unclav(out, CLAV_L, SH_L);
  unclav(out, CLAV_R, SH_R);
}

/** The shoulder's chest-frame position before its clavicle's turn about the SC point (identity: nothing). */
function unclav(out: Float64Array, c: number, sh: number): void {
  const o = c * TRS;
  const qx = -out[o + 3]!, qy = -out[o + 4]!, qz = -out[o + 5]!, qw = out[o + 6]!;
  if (qx === 0 && qy === 0 && qz === 0 && qw === 1) return;
  const s = sh * TRS;
  const x = out[s]! - out[o]!, y = out[s + 1]! - out[o + 1]!, z = out[s + 2]! - out[o + 2]!;
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  out[s] = out[o]! + x + qw * tx + (qy * tz - qz * ty);
  out[s + 1] = out[o + 1]! + y + qw * ty + (qz * tx - qx * tz);
  out[s + 2] = out[o + 2]! + z + qw * tz + (qx * ty - qy * tx);
}

// ---- files: fetched and parsed once per URL (CPU side, shared by every scene) ----

const MODELS = new Map<string, Promise<GlbModel>>();

/** (menu-notes note 2) Operator file bytes received so far, counted as they stream in (not from Content-Length): the
 *  menu's load screen keeps waiting while this grows. */
export const operatorBytes = { received: 0 };

/** A response body read to the end, counting the bytes into `operatorBytes` as they arrive. */
async function readCounted(r: Response): Promise<ArrayBuffer> {
  const reader = r.body?.getReader();
  if (!reader) {
    const b = await r.arrayBuffer();
    operatorBytes.received += b.byteLength;
    return b;
  }
  const chunks: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    n += value.byteLength;
    operatorBytes.received += value.byteLength;
  }
  const out = new Uint8Array(n);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.byteLength;
  }
  return out.buffer as ArrayBuffer;
}

/** Fetches and parses a LOD file (same origin only). A failed load is not cached, so a retry fetches again. */
export function loadModel(url: string): Promise<GlbModel> {
  let p = MODELS.get(url);
  if (!p) {
    if (!sameOrigin(url, typeof location !== 'undefined' ? location.origin : undefined)) return Promise.reject(new Error(`operator asset leaves the origin: ${url}`));
    p = fetch(url).then(async (r) => {
      if (!r.ok) throw new Error(`operator asset ${url}: HTTP ${r.status}`);
      return parseGlb(await readCounted(r));
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
  /** (feature/weapons) Per source mesh: its morph targets as absolute positions / normals (shared), or null. */
  morphs: (MorphData | null)[];
  /** (anim-skeleton S2) The file's finger joints and axes (null: none, LOD2), and its goggle joints' slots. */
  fingers: FingerRig | null;
  goggleSlots: Int32Array;
}

interface MorphData {
  names: string[];
  positions: Float32Array[];
  normals: (Float32Array | null)[];
}

const GLOW_DEFAULT: readonly [number, number, number] = [0.3, 0.85, 0.16];

/** KTX2 (KHR_texture_basisu) through the bundled transcoder, or PNG / WebP; flips KTX2 in the texture matrix (A79). */
export function texture(scene: Scene, im: GlbImage | undefined, srgb: boolean): Texture | null {
  if (!im) return null;
  const isKtx2 = im.mime === 'image/ktx2';
  if (isKtx2) ktx2Setup(scene.getEngine() as Parameters<typeof ktx2Setup>[0]);
  const url = URL.createObjectURL(new Blob([im.data as BlobPart], { type: im.mime }));
  let settled = false;
  const settle = (): void => {
    settled = true;
    URL.revokeObjectURL(url);
  };
  const t = new Texture(url, scene, false, !isKtx2, Texture.TRILINEAR_SAMPLINGMODE, settle, settle, null, false, undefined, im.mime, undefined, undefined, isKtx2 ? '.ktx2' : undefined);
  // (11e fix r1, A110) disposed mid-transcode (the scene went away): an abandoned load, not a failure
  if (isKtx2) t.onDisposeObservable.addOnce(() => { if (!settled) ktx2Abandoned(); });
  // the reader v-flips the UVs; a compressed KTX2 cannot be flipped at upload (Babylon 9 does not compensate)
  if (isKtx2) { t.vScale = -1; t.vOffset = 1; }
  t.gammaSpace = srgb;
  return t;
}

/**
 * One file material as the operator PBR (Operator Lab settings, step 10-11): albedo / ORM / normal maps, environment and
 * direct intensities, two-sided. (guard-models G5) Shared with the guard figure's library; no glow handling here.
 */
export function operatorMaterial(scene: Scene, m: GlbMaterial, label: string): PBRMaterial {
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
  return p;
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
    const p = operatorMaterial(scene, m, label);
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
  const morphs: (MorphData | null)[] = [];
  for (const g of model.meshes) {
    // (feature/weapons) Babylon's morph targets take absolute positions: base + delta, once per file
    morphs.push(g.targets?.length ? {
      names: g.targets.map((t) => t.name),
      positions: g.targets.map((t) => { const a = new Float32Array(g.positions.length); for (let i = 0; i < a.length; i++) a[i] = g.positions[i]! + t.positions[i]!; return a; }),
      normals: g.targets.map((t) => {
        if (!t.normals) return null;
        const a = new Float32Array(g.normals.length);
        for (let i = 0; i < a.length; i += 3) {
          const x = g.normals[i]! + t.normals[i]!, y = g.normals[i + 1]! + t.normals[i + 1]!, z = g.normals[i + 2]! + t.normals[i + 2]!;
          const l = hyp3(x, y, z) || 1;
          a[i] = x / l; a[i + 1] = y / l; a[i + 2] = z / l;
        }
        return a;
      }),
    } : null);
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
  const fingers = fingerRig(setup.names, setup.bindPos, setup.bindRot);
  const goggleSlots = Int32Array.from(setup.names.flatMap((nm, s) => (nm === 'goggleUse' || nm === 'goggleStow' ? [s] : [])));
  return { lod, setup, sources, materialOf, parts, materials, glow, glowBase, morphs, fingers, goggleSlots };
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
  /** (feature/weapons) The grip morph targets of this body's meshes, by hand. */
  gripR: MorphTarget[];
  gripL: MorphTarget[];
  /** (anim-cleanup) The right hand's full wrap (world grips, a knife) and both hands' relaxed shape. */
  wrapR: MorphTarget[];
  relaxR: MorphTarget[];
  relaxL: MorphTarget[];
  /** (anim-skeleton S2) The finger values the poser's finger rotations were last built from (NaN: never). */
  fingIn: Float64Array;
}

const RANGE: [number, number] = [0, 0];
const D2R = Math.PI / 180;

/** (anim-cleanup) One influence on every target of a list (no allocation). */
function setInfluence(ts: MorphTarget[], v: number): void {
  for (let k = 0; k < ts.length; k++) ts[k]!.influence = v;
}

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
      (e: unknown) => {
        if (!pageLeaving() && !f.isDisposed) console.warn('[operators] close-up LOD failed', e);
      },
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
  private readonly rigLike: RigLike;
  private readonly rigBuf = new Float64Array(RIG_JOINTS.length * TRS);
  private readonly rigRest = new Float64Array(RIG_JOINTS.length * TRS);
  private have = 0;
  private headVisible = true;
  private enabled = true;
  private glowShown = -1;
  /** (G135) This player's goggle colour at the full glow (linear RGB); null: the lens asset's own (Wren's green). */
  private glowTint: Color3 | null = null;
  private disposed = false;
  /** Called with each LOD's meshes as they are built (shadow casters, 11e). */
  onMeshes: ((meshes: readonly Mesh[]) => void) | null = null;
  /** (anim-skeleton S2) The hands' per-finger values when the rig gives none (from its grip closures). */
  private readonly fingBuf = new Float64Array(FING_LEN);

  /** Build it right after the rig, before the rig's first pose: the rig's translations are measured from here. */
  constructor(private readonly lib: OperatorLibrary, rig: RigLike, readonly manifest: OperatorManifest, readonly name: string) {
    this.rigLike = rig;
    this.rig = rigNodes(rig);
    this.root = new TransformNode(`${name}-operator`, lib.scene);
    this.root.parent = rig.root;
    readRig(this.rig, this.rigRest);
    LIVE_FIGURES.add(this);
  }

  /** The close-up LOD (menu, photo mode): the hero when it is in the build and switched on, else LOD0; `?gfx=min`
   *  (tests, software GL): LOD2, never the hero (A102; a photo-mode e2e fetched 55 MB). */
  loadCloseUp(): Promise<void> {
    return this.load(this.closeUpLod);
  }

  /** (menu-notes note 4) The LOD a close-up camera draws once it is loaded (`loadCloseUp`): the hero, else LOD0 when
   *  the hero is not in the build; `?gfx=min`: LOD2. */
  get closeUpLod(): number {
    if (flags.gfx === 'min') return LOD_2;
    return HERO_CLOSE_UPS && this.manifest.urls[LOD_HERO] ? LOD_HERO : LOD_0;
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
    const gripR: MorphTarget[] = [];
    const gripL: MorphTarget[] = [];
    const wrapR: MorphTarget[] = [];
    const relaxR: MorphTarget[] = [];
    const relaxL: MorphTarget[] = [];
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
      // (feature/weapons) the finger grips: this body's own influences over the file's shared target data
      const md = a.morphs[i];
      if (md) {
        const mgr = new MorphTargetManager(scene);
        md.names.forEach((nm, k) => {
          const t = new MorphTarget(`${label}-${nm}`, 0, scene);
          t.setPositions(md.positions[k]!);
          const nn = md.normals[k];
          if (nn) t.setNormals(nn);
          mgr.addTarget(t);
          if (nm === 'gripR') gripR.push(t);
          else if (nm === 'gripL') gripL.push(t);
          else if (nm === 'wrapR') wrapR.push(t);
          else if (nm === 'relaxR') relaxR.push(t);
          else if (nm === 'relaxL') relaxL.push(t);
        });
        m.morphTargetManager = mgr;
      }
      meshes.push(m);
    });
    const poser = new OperatorPoser(S);
    poser.setRest(this.rigRest);
    const inst: LodInstance = { asset: a, root, nodes, skeleton, meshes, poser, glowMat, head, gripR, gripL, wrapR, relaxR, relaxL, fingIn: new Float64Array(FING_LEN).fill(Number.NaN) };
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
    // (anim-skeleton S2) the fingers (A9: the hands close on the grips through the bones) and the goggle's gear offset
    const fr = l.asset.fingers;
    if (fr) {
      // rebuilt only when a value moved (a held grip or an open hand costs a 20-value compare)
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
    if (l.asset.goggleSlots.length) this.goggleOffset(l);
    const out = l.poser.solve(this.rigBuf);
    for (let s = 0; s < l.nodes.length; s++) {
      const t = l.nodes[s]!;
      const o = s * TRS;
      t.position.set(out[o]!, out[o + 1]!, out[o + 2]!);
      t.rotationQuaternion!.set(out[o + 3]!, out[o + 4]!, out[o + 5]!, out[o + 6]!);
    }
    // (feature/weapons) the fingers close round what the hands hold; (anim-skeleton S2) a file with finger joints closes
    // them through the bones and keeps its grip morphs at 0 (A9: not twice)
    const hg = this.rigLike.handGrip;
    if (hg && !fr) {
      // (anim-cleanup) the right hand: the trigger shape on a weapon's grip, a full wrap on anything else it holds; both
      // hands relaxed (lightly curled) when free; a file without the wrap / relax targets keeps the trigger shape
      const trig = this.rigLike.rightTrigger !== false || l.wrapR.length === 0 ? 1 : 0;
      setInfluence(l.gripR, hg.r * trig);
      setInfluence(l.wrapR, hg.r * (1 - trig));
      setInfluence(l.gripL, hg.l);
      setInfluence(l.relaxR, 1 - hg.r);
      setInfluence(l.relaxL, 1 - hg.l);
    }
    if (l.glowMat && this.glowShown !== this.goggle.glow) {
      const k = this.goggle.glow;
      const b = this.glowTint ?? l.asset.glowBase;
      l.glowMat.emissiveColor.set(b.r * k, b.g * k, b.b * k);
      this.glowShown = k;
    }
  }

  /** (S2) The hands' shape from the rig's grip closures (a rig without per-finger values). */
  private gripShape(): Float64Array {
    const hg = this.rigLike.handGrip;
    handGripShape(hg ? hg.l : 0, hg ? hg.r : 0, this.rigLike.rightTrigger !== false, this.fingBuf);
    return this.fingBuf;
  }

  /**
   * (S2) The goggle joints take this body's goggle pose's gear offset (head frame, about the pivot): the rig's copy made
   * inside its own animate window (`goggleOff`), else the table (a rig without one). No allocation.
   */
  private goggleOffset(l: LodInstance): void {
    const src = this.rigLike.goggleOff;
    const pose = this.goggle.pose;
    let x: number, y: number, z: number, p: number, yw: number, r: number;
    if (src) {
      const k = pose === 'stowed' ? 0 : 6;
      x = src[k]!; y = src[k + 1]!; z = src[k + 2]!; p = src[k + 3]!; yw = src[k + 4]!; r = src[k + 5]!;
    } else {
      const g = GOGGLE_OFFSET[pose];
      x = g.x; y = g.y; z = g.z; p = g.pitch; yw = g.yaw; r = g.roll;
    }
    const on = x !== 0 || y !== 0 || z !== 0 || p !== 0 || yw !== 0 || r !== 0 ? 1 : 0;
    const P = l.poser;
    const gs = l.asset.goggleSlots;
    for (let i = 0; i < gs.length; i++) {
      const s = gs[i]!;
      P.extraOn[s] = on;
      if (!on) continue;
      eulerQuat(p * D2R, yw * D2R, r * D2R, P.extraQ, s * 4);
      P.extraT[s * 3] = x;
      P.extraT[s * 3 + 1] = y;
      P.extraT[s * 3 + 2] = z;
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

  /**
   * (G135) The goggle colour for this body's player (the partner beacon; `goggleColour` per player slot), or null for
   * the lens asset's own. Render only; the LOD shown takes it on its next update.
   */
  setGlowColour(rgb: readonly [number, number, number] | null): void {
    if (rgb) {
      if (this.glowTint) this.glowTint.set(rgb[0], rgb[1], rgb[2]);
      else this.glowTint = new Color3(rgb[0], rgb[1], rgb[2]);
    } else this.glowTint = null;
    this.glowShown = -1;
  }

  /** The goggle colour at the full glow now (tests): this body's own or the lens asset's; null before a LOD loads. */
  get glowColour(): [number, number, number] | null {
    const l = this.current >= 0 ? this.lods[this.current] : null;
    const c = this.glowTint ?? l?.asset.glowBase ?? null;
    return c ? [c.r, c.g, c.b] : null;
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
      for (const m of l.meshes) {
        // (feature/weapons) the grip morph manager is the body's own: Mesh.dispose only drops the reference, and the
        // scene keeps the manager (and its target textures) until it is disposed itself
        m.morphTargetManager?.dispose();
        m.dispose(false, false);
      }
      l.skeleton.dispose();
      l.glowMat?.dispose();
      this.lods[i] = null;
    }
    this.root.dispose();
    this.have = 0;
    this.current = -1;
  }
}
