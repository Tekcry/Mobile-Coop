/**
 * The Operator Lab scene (dev-only, never in the game bundle): loads an operator's glTF (`export_gltf.py`), links its
 * bones to nodes driven by a CharacterRig built read-only (`retarget.ts`), and shows it under the lighting rigs,
 * quality presets, poses and debug views of `labData.ts`. The sheet script drives it through `window.__lab`.
 * Babylon only through `core/babylon.ts`.
 */
import {
  ArcRotateCamera, Bone, Camera, Color3, Color4, Constants, CreateBox, CreateDisc, DefaultRenderingPipeline, DirectionalLight,
  CreateSphere, Effect, Engine, HemisphericLight, ImageProcessingConfiguration, Matrix, Mesh, PBRMaterial, PointLight, PostProcess, Quaternion, ReflectionProbe, Scene,
  ShadowGenerator, Skeleton, SSAO2RenderingPipeline, StandardMaterial, Texture, TransformNode, Vector3, VertexData, VertexBuffer,
} from '../../core/babylon';
import type { AbstractMesh, BaseTexture } from '../../core/babylon';
import { defaultLook } from '../../cosmetics/avatarLook';
import { CharacterRig } from '../../player/characterRig';
import { ktx2Setup } from './ktx2';
import { bindWorld, parseGlb, type GlbImage, type GlbModel, type Quat, type V3 } from './glb';
import { CLOSEUPS, LIGHT_RIGS, POSES, PRESETS, type CamView, type LightRig, type PoseDef, type QualityPreset } from './labData';
import { buildRetarget, JOINT_TO_RIG, poseSkeleton, type Retarget, type RigJoint } from './retarget';

export type DebugView = 'none' | 'wire' | 'normals' | 'uv' | 'matid';

export interface LabState {
  operator: string;
  pose: string;
  rig: string;
  preset: string;
  lod: string;
  debug: DebugView;
  turntable: boolean;
  ortho: boolean;
  silhouette: boolean;
  gameRig: boolean;
  weapon: boolean;
  /** KTX2 textures: Babylon's transcoder (default) or the reference transcoder's decode (comparison). */
  ktx2: 'babylon' | 'decoded';
}

interface Loaded {
  id: string;
  root: TransformNode;
  model: GlbModel;
  nodes: TransformNode[];
  meshes: Mesh[];
  materials: PBRMaterial[];
  bindPos: V3[];
  bindRot: Quat[];
  retarget: Retarget;
  height: number;
  triangles: number;
}

Effect.ShadersStore['nvFragmentShader'] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform float time;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(void){
  vec3 c = texture2D(textureSampler, vUV).rgb;
  float l = dot(c, vec3(0.3, 0.59, 0.11));
  l = pow(clamp(l * 1.8, 0.0, 1.0), 0.8);
  l += (h(vUV * 900.0 + time) - 0.5) * 0.10;
  float vig = 1.0 - 0.55 * pow(length(vUV - 0.5) * 1.5, 2.0);
  gl_FragColor = vec4(vec3(0.15, 1.0, 0.25) * l * vig, 1.0);
}`;

const FOV_50MM = 2 * Math.atan(12 / 50);

export class Lab {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly camera: ArcRotateCamera;
  readonly state: LabState = {
    operator: 'wren', pose: 'apose', rig: 'studio', preset: 'epic', lod: 'source', debug: 'none',
    turntable: false, ortho: false, silhouette: false, gameRig: false, weapon: true, ktx2: 'babylon',
  };
  /** Operators with a built glTF. */
  available: string[] = [];
  /** LODs found for the loaded operator (hero first). */
  lods: string[] = ['source'];
  /** How the loaded file's KTX2 textures reached the GPU (step 11): none, Babylon's transcoder, or the decoded stand-ins. */
  ktx2Path: 'none' | 'babylon' | 'decoded' = 'none';
  private loaded: Loaded | null = null;
  private rig!: CharacterRig;
  private rigRest = new Map<string, { pos: Vector3 }>();
  private rigNodes = new Map<string, TransformNode>();
  private hemi: HemisphericLight;
  private lights: (DirectionalLight | PointLight)[] = [];
  private shadow: ShadowGenerator | null = null;
  private ground: Mesh;
  private glow: Mesh;
  private glowLight: PointLight;
  /** Step 11 (A78): a generated studio environment (no file, no network) the metals reflect; built on first use. */
  private env: BaseTexture | null = null;
  private weapon: TransformNode;
  private silMesh: Mesh | null = null;
  private scaleBar: TransformNode;
  private pipeline: DefaultRenderingPipeline | null = null;
  private ssao: SSAO2RenderingPipeline | null = null;
  private nv: PostProcess | null = null;
  private debugMat: PBRMaterial;
  /** Fix round 3 (item 1): the wire view's solid underlay (clones sharing geometry and skeleton) and its material. */
  private wireUnder: Mesh[] = [];
  private wireSolidMat: PBRMaterial;
  private colourCache = new Map<string, Float32Array>();
  private posePos: V3[] = [];
  private poseRot: Quat[] = [];
  private poseFrames = 0;
  private poseDef: PoseDef = POSES[0]!;
  private time = 0;
  /** Step 11 fix round 2 (item 6): exposure lift in EV on top of the rig's (the close-ups' detail-read panel). */
  private evBoost = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialias: false }, false);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0, 0, 0, 1);
    this.scene.ambientColor = new Color3(0, 0, 0);
    this.camera = new ArcRotateCamera('cam', Math.PI / 2, Math.PI / 2, 3.2, new Vector3(0, 0.9, 0), this.scene);
    this.camera.minZ = 0.02;
    this.camera.maxZ = 80;
    this.camera.fov = FOV_50MM;
    this.camera.wheelDeltaPercentage = 0.01;
    this.camera.lowerRadiusLimit = 0.15;
    this.camera.attachControl(canvas, true);
    this.camera.panningSensibility = 1500;
    this.hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    this.ground = CreateDisc('ground', { radius: 40, tessellation: 64 }, this.scene);
    this.ground.rotation.x = Math.PI / 2;
    this.ground.receiveShadows = true;
    const gm = new StandardMaterial('groundMat', this.scene);
    gm.diffuseColor = new Color3(0.07, 0.07, 0.075);
    gm.specularColor = new Color3(0.02, 0.02, 0.02);
    this.ground.material = gm;
    this.debugMat = new PBRMaterial('debug', this.scene);
    this.debugMat.unlit = true;
    this.debugMat.albedoColor = Color3.White();
    this.debugMat.backFaceCulling = false;
    // WebGL does not cull lines, so a bare wire shows every layer through the figure; the underlay draws her as a flat
    // near-black solid pushed back in depth (zOffset), so only the edges of the surfaces facing the camera stay visible
    this.wireSolidMat = new PBRMaterial('wireSolid', this.scene);
    this.wireSolidMat.unlit = true;
    this.wireSolidMat.albedoColor = new Color3(0.012, 0.013, 0.015);
    this.wireSolidMat.backFaceCulling = false;
    this.wireSolidMat.zOffset = 2;
    this.glow = CreateBox('glow', { width: 0.095, height: 0.032, depth: 0.02 }, this.scene);
    const glowMat = new StandardMaterial('glowMat', this.scene);
    glowMat.disableLighting = true;
    glowMat.emissiveColor = new Color3(0.3, 0.85, 0.16);
    this.glow.material = glowMat;
    this.glowLight = new PointLight('glowLight', Vector3.Zero(), this.scene);
    this.glowLight.diffuse = new Color3(0.35, 1, 0.19);
    this.glowLight.range = 3;
    this.weapon = new TransformNode('weapon', this.scene);
    this.scaleBar = this.makeScaleBar();
    this.scaleBar.setEnabled(false);
    this.engine.runRenderLoop(() => this.frame());
    window.addEventListener('resize', () => this.engine.resize());
  }

  /** Builds the rig, probes which operators are built and loads the first. Call once. */
  async init(): Promise<void> {
    const make = (_shape: unknown, hex: string, slot: string): AbstractMesh => {
      const b = CreateBox(`part-${slot}`, { size: 1 }, this.scene);
      const m = new StandardMaterial(`pm-${slot}`, this.scene);
      m.diffuseColor = Color3.FromHexString(hex.length === 7 ? hex : '#556655');
      m.specularColor = Color3.Black();
      b.material = m;
      return b;
    };
    this.rig = this.buildRig(1.75, 'lab', make);
    this.rig.setEnabled(false);
    this.attachWeapon();
    this.available = [];
    for (const id of ['wren', 'moth']) {
      const r = await fetch(`/__operators/${id}/${id}-lab.glb`, { method: 'HEAD' });
      if (r.ok) this.available.push(id);
    }
    if (this.available.length) await this.load(this.available.includes(this.state.operator) ? this.state.operator : this.available[0]!);
    this.apply();
  }

  private buildRig(height: number, name: string, make: (s: unknown, h: string, slot: string) => AbstractMesh): CharacterRig {
    const rig = new CharacterRig(this.scene, make as never, defaultLook(), height, name, { build: 'lean', style: 'detailed' });
    return rig;
  }

  private makeScaleBar(): TransformNode {
    const root = new TransformNode('scaleBar', this.scene);
    const mat = new StandardMaterial('scaleMat', this.scene);
    mat.disableLighting = true;
    mat.emissiveColor = new Color3(0.9, 0.9, 0.9);
    const post = CreateBox('bar', { width: 0.012, height: 1.75, depth: 0.012 }, this.scene);
    post.position.y = 0.875;
    post.material = mat;
    post.parent = root;
    for (let i = 0; i <= 7; i++) {
      const t = CreateBox(`tick${i}`, { width: i % 2 === 0 ? 0.12 : 0.07, height: 0.008, depth: 0.012 }, this.scene);
      t.position.set(i % 2 === 0 ? 0.06 : 0.035, i * 0.25, 0);
      t.material = mat;
      t.parent = root;
    }
    return root;
  }

  private attachWeapon(): void {
    const rig = this.rig;
    this.weapon.parent = rig.weaponPivot;
    const body = CreateBox('gun', { width: 0.05, height: 0.1, depth: 0.7 }, this.scene);
    body.parent = this.weapon;
    body.position.set(0, 0.01, 0.15);
    const gm = new StandardMaterial('gunMat', this.scene);
    gm.diffuseColor = new Color3(0.08, 0.08, 0.09);
    body.material = gm;
    rig.heldWeapon = this.weapon;
    for (const n of rig.root.getChildTransformNodes(false)) this.rigNodes.set(n.name.replace(/^lab-/, ''), n);
    this.rigNodes.set('root', rig.root);
    for (const k of ['root', 'body', 'pelvis']) {
      const n = this.rigNodes.get(k);
      if (n) {
        n.computeWorldMatrix(true);
        this.rigRest.set(k, { pos: n.getAbsolutePosition().clone() });
      }
    }
  }

  /** Loads an operator's glTF into a skinned, retargeted figure. */
  async load(id: string): Promise<void> {
    if (this.loaded) this.unload();
    // 'source': the unbaked build (every triangle, procedural factors); the rest are step 10's baked LODs
    const file = this.state.lod === 'source' ? `${id}-lab.glb` : `${id}-lab-${this.state.lod}.glb`;
    this.ktx2Path = 'none';
    const buf = await (await fetch(`/__operators/${id}/${file}`)).arrayBuffer();
    const model = parseGlb(buf);
    let height = 1.68;
    try {
      height = ((await (await fetch(`/__operators/${id}/${id}-body.json`)).json()) as { height: number }).height;
    } catch { /* keep the default */ }
    const root = new TransformNode(`op-${id}`, this.scene);
    const w = bindWorld(model.nodes);
    const nodes = model.nodes.map((n, i) => {
      const t = new TransformNode(`${id}-${n.name}`, this.scene);
      t.rotationQuaternion = new Quaternion(...n.r);
      t.position.set(...n.t);
      t.parent = n.parent >= 0 ? null : root;
      void i;
      return t;
    });
    model.nodes.forEach((n, i) => { if (n.parent >= 0) nodes[i]!.parent = nodes[n.parent]!; });
    // bones: parents first, bind pose from the glTF node tree
    const skeleton = new Skeleton(`${id}-skel`, `${id}-skel`, this.scene);
    const bones = new Map<number, Bone>();
    const order: number[] = [];
    const seen = new Set<number>();
    const want = new Set(model.joints);
    const visit = (i: number): void => {
      if (seen.has(i)) return;
      seen.add(i);
      const p = model.nodes[i]!.parent;
      if (p >= 0 && want.has(p)) visit(p);
      order.push(i);
    };
    for (const j of model.joints) visit(j);
    for (const i of order) {
      const n = model.nodes[i]!;
      const local = Matrix.Compose(Vector3.One(), new Quaternion(...n.r), new Vector3(...n.t));
      const parent = n.parent >= 0 && bones.has(n.parent) ? bones.get(n.parent)! : null;
      const b = new Bone(n.name, skeleton, parent, local);
      bones.set(i, b);
    }
    const slot = new Map<number, number>();
    model.joints.forEach((nodeIdx, s) => slot.set(s, skeleton.bones.indexOf(bones.get(nodeIdx)!)));
    for (const [i, b] of bones) b.linkTransformNode(nodes[i]!);

    const tex = (im: GlbImage | undefined, srgb: boolean): Texture | null => {
      if (!im) return null;
      // step 11 (D27): KTX2 (KHR_texture_basisu) through Babylon's own transcoder from the bundled decoder (ktx2.ts), on
      // the GPU as BC7 / ASTC. `ktx2: 'decoded'` instead draws the reference transcoder's level-0 decode (written beside
      // the KTX2 by scripts/operators/ktx2.mjs), the comparison the lods sheet makes.
      if (im.mime === 'image/ktx2') this.ktx2Path = this.state.ktx2;
      if (im.mime === 'image/ktx2' && this.state.ktx2 === 'decoded') {
        const t = new Texture(`/__operators/${id}/export/textures/${this.state.lod}/ktx2-decoded/${im.name}.png`, this.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
        t.gammaSpace = srgb;
        return t;
      }
      if (im.mime === 'image/ktx2') ktx2Setup(this.engine);
      const url = URL.createObjectURL(new Blob([im.data as BlobPart], { type: im.mime }));
      const ext = im.mime === 'image/ktx2' ? '.ktx2' : undefined;
      // The reader v-flips the UVs and relies on the upload flip (invertY). A compressed KTX2 cannot be flipped at
      // upload and Babylon 9.29 does not compensate for KTX2 (it does for KTX1), so the Lab flips it in the texture
      // matrix (vScale -1, vOffset 1): measured against the reference decode, mean abs difference 3.20 -> 0.09 / 255.
      const isKtx2 = im.mime === 'image/ktx2';
      const t = new Texture(url, this.scene, false, !isKtx2, Texture.TRILINEAR_SAMPLINGMODE, () => URL.revokeObjectURL(url), null, null, false, undefined, im.mime, undefined, undefined, ext);
      if (isKtx2) { t.vScale = -1; t.vOffset = 1; }
      t.gammaSpace = srgb;
      return t;
    };
    const materials = model.materials.map((m) => {
      const p = new PBRMaterial(`${id}-${m.name}`, this.scene);
      p.albedoColor = new Color3(...m.base);
      p.metallic = m.metallic > 0.5 ? 0.9 : 0;
      p.roughness = m.roughness;
      // Step 10 baked sets: base colour, packed occlusion / roughness / metal (glTF channels), tangent normal. With the
      // file's tangents (every baked LOD) Babylon uses them and ignores the invert flags; without them it derives a
      // frame from the mirrored, v-flipped reader, so both normal-map axes are inverted relative to the file.
      const albedo = tex(m.baseTex, true);
      if (albedo) p.albedoTexture = albedo;
      const orm = tex(m.ormTex, false);
      if (orm) {
        p.metallicTexture = orm;
        p.useAmbientOcclusionFromMetallicTextureRed = true;
        p.useRoughnessFromMetallicTextureGreen = true;
        p.useMetallnessFromMetallicTextureBlue = true;
        p.metallic = m.metallic;
        p.roughness = m.roughness;
      }
      const nrm = tex(m.normalTex, false);
      if (nrm) {
        p.bumpTexture = nrm;
        p.invertNormalMapX = true;
        p.invertNormalMapY = true;
      }
      // Step 11 fix round 2 (item 5, A78): the metals (gunmetal, anodised, hardware sets) take the full environment, so the
      // studio env's soft boxes give their satin highlight; everything else keeps the quarter fill.
      p.environmentIntensity = /metal|aluminium|hardware/.test(m.name) ? 1 : 0.25;
      p.directIntensity = Math.PI; // as the game's parts: PBR divides diffuse by pi
      p.backFaceCulling = false;
      p.twoSidedLighting = true;
      // Step 07: the built goggle's lenses carry the glow (D13); the stand-in box is then hidden.
      if (m.name === 'goggle lens' || m.name.endsWith('-glow')) p.emissiveColor = new Color3(0.3, 0.85, 0.16);
      return p;
    });
    const meshes: Mesh[] = [];
    let triangles = 0;
    for (const g of model.meshes) {
      const mesh = new Mesh(`${id}-${g.name}`, this.scene);
      const vd = new VertexData();
      vd.positions = g.positions;
      vd.normals = g.normals;
      vd.uvs = g.uvs;
      if (g.tangents) vd.tangents = g.tangents;
      vd.indices = g.indices as unknown as number[];
      const idx = new Float32Array(g.joints.length);
      for (let i = 0; i < idx.length; i++) idx[i] = g.weights[i]! > 0 ? slot.get(g.joints[i]!) ?? 0 : 0;
      vd.matricesIndices = idx;
      vd.matricesWeights = g.weights;
      vd.applyToMesh(mesh, true);
      mesh.skeleton = skeleton;
      mesh.numBoneInfluencers = 4;
      mesh.material = materials[g.material] ?? materials[0]!;
      mesh.alwaysSelectAsActiveMesh = true;
      mesh.metadata = { material: g.material };
      mesh.receiveShadows = true;
      meshes.push(mesh);
      triangles += g.indices.length / 3;
    }
    // Step 11 fix round 2 (item 1): the goggle's spill light reaches the scene ahead of her, never her own meshes (it sits
    // a few cm in front of the housing: it flooded her face, hood and chest green and blew the housing out to white).
    this.glowLight.excludedMeshes = [...meshes];
    const retarget = buildRetarget(model.nodes, w.pos, model.joints);
    this.loaded = { id, root, model, nodes, meshes, materials, bindPos: w.pos, bindRot: w.rot, retarget, height, triangles };
    this.state.operator = id;
    this.posePos = w.pos.map((p) => [...p] as V3);
    this.poseRot = w.rot.map((r) => [...r] as Quat);
    const found: string[] = ['source'];
    for (const l of ['hero', 'lod0', 'lod1', 'lod2', 'phone']) {
      const r = await fetch(`/__operators/${id}/${id}-lab-${l}.glb`, { method: 'HEAD' });
      if (r.ok) found.push(l);
    }
    this.lods = found;
    this.rebuildShadows();
    this.setPose(this.state.pose);
    // Step 11 fix round 3 (item 1): the new materials start solid; re-apply the current debug view, or a LOD switch
    // while 'wire' (or a colour view) is on draws shaded (the sheet's LOD strip only calls setDebug when it changes).
    this.setDebug(this.state.debug);
  }

  private unload(): void {
    const l = this.loaded;
    if (!l) return;
    this.silMesh?.dispose();
    this.silMesh = null;
    this.setWireUnderlay(false);
    for (const m of l.meshes) m.dispose();
    for (const m of l.materials) m.dispose();
    l.meshes[0]?.skeleton?.dispose();
    for (const n of l.nodes) n.dispose();
    l.root.dispose();
    this.loaded = null;
  }

  // ---- state ----

  setPose(id: string): void {
    const def = POSES.find((p) => p.id === id) ?? POSES[0]!;
    this.state.pose = def.id;
    this.poseDef = def;
    this.poseFrames = 0;
    const r = this.rig;
    r.input.speed = 0;
    for (let i = 0; i < def.settle; i++) this.stepRig(1 / 60);
    this.updateOperator();
  }

  private stepRig(dt: number): void {
    const d = this.poseDef.rig;
    if (!d) return;
    this.rig.animate(dt, { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, ...d });
    this.poseFrames++;
  }

  setDebug(v: DebugView): void {
    this.state.debug = v;
    const l = this.loaded;
    if (!l) return;
    for (const m of l.meshes) {
      if (v === 'normals' || v === 'uv' || v === 'matid') {
        this.setColours(m, v);
        m.useVertexColors = true;
        m.material = this.debugMat;
      } else {
        m.material = l.materials[(m.metadata as { material: number }).material] ?? l.materials[0]!;
        m.useVertexColors = false;
      }
    }
    for (const mat of l.materials) mat.wireframe = v === 'wire';
    this.setWireUnderlay(v === 'wire');
    this.applyExposure();
  }

  private setWireUnderlay(on: boolean): void {
    for (const u of this.wireUnder) u.dispose();
    this.wireUnder = [];
    const l = this.loaded;
    if (!on || !l) return;
    for (const m of l.meshes) {
      const u = m.clone(`${m.name}-wireSolid`, m.parent, true);
      u.material = this.wireSolidMat;
      u.receiveShadows = false;
      this.wireUnder.push(u);
    }
  }

  /** Colour debug views are unlit data: no key-light exposure, no bloom. */
  private applyExposure(): void {
    const r = LIGHT_RIGS.find((x) => x.id === this.state.rig) ?? LIGHT_RIGS[0]!;
    const data = this.state.debug === 'normals' || this.state.debug === 'uv' || this.state.debug === 'matid';
    if (!this.pipeline) return;
    this.pipeline.imageProcessing.exposure = data ? 0.35 : r.exposure * 2 ** this.evBoost;
    this.pipeline.bloomEnabled = !data && r.bloom !== false && (PRESETS.find((p) => p.id === this.state.preset)?.bloom ?? false);
  }

  /**
   * Step 11 (A78): a studio environment generated in the scene, never a file: a dark room with a broad soft box
   * overhead in front, a strip on each side and a dim floor bounce, captured once into a cube by a reflection probe.
   * The metals (gunmetal buckles, closures, anodised mounts: base colour 0.02-0.05, metallic) have nothing to reflect
   * without it and draw as flat black; with it their bevels and split lines carry a satin highlight.
   */
  private studioEnv(): BaseTexture {
    if (this.env) return this.env;
    const probe = new ReflectionProbe('studioEnv', 128, this.scene, true, true);
    probe.position.set(0, 1.2, 0);
    probe.refreshRate = 1; // RENDER_ONCE after the first frame
    const parts: Mesh[] = [];
    const panel = (name: string, w: number, h: number, pos: V3, rotX: number, rotY: number, lum: number): void => {
      const b = CreateBox(name, { width: w, height: h, depth: 0.01 }, this.scene);
      b.position.set(...pos);
      b.rotation.set(rotX, rotY, 0);
      const m = new StandardMaterial(`${name}Mat`, this.scene);
      m.disableLighting = true;
      m.emissiveColor = new Color3(lum, lum, lum * 1.02);
      m.backFaceCulling = false;
      b.material = m;
      b.setEnabled(false);
      parts.push(b);
    };
    panel('envRoom', 30, 30, [0, 1.2, 12], 0, 0, 0.012);
    panel('envRoomB', 30, 30, [0, 1.2, -12], 0, 0, 0.012);
    panel('envRoomL', 30, 30, [12, 1.2, 0], 0, Math.PI / 2, 0.012);
    panel('envRoomR', 30, 30, [-12, 1.2, 0], 0, Math.PI / 2, 0.012);
    panel('envFloor', 30, 30, [0, -2, 0], Math.PI / 2, 0, 0.02);
    panel('envTop', 30, 30, [0, 9, 0], Math.PI / 2, 0, 0.02);
    panel('envSoftbox', 4, 2.5, [0, 4.2, 2.8], Math.PI / 3, 0, 3);
    panel('envStripR', 0.8, 4, [3.2, 1.6, 1.2], 0, Math.PI / 2.6, 1.6);
    panel('envStripL', 0.8, 4, [-3.2, 1.6, -1.2], 0, -Math.PI / 2.6, 1.2);
    // fix round 2 (item 5): a soft panel in front of the figure, above the camera line, so metal facing the camera
    // (belt closure, leg-band and strap buckles) reflects a satin highlight instead of the dark room
    panel('envFront', 6, 4, [0, 1.6, 4.5], 0, 0, 1.2);
    for (const m of parts) probe.renderList!.push(m);
    probe.cubeTexture.onBeforeRenderObservable.add(() => { for (const m of parts) m.setEnabled(true); });
    probe.cubeTexture.onAfterRenderObservable.add(() => { for (const m of parts) m.setEnabled(false); });
    this.env = probe.cubeTexture;
    return this.env;
  }

  /**
   * Step 11 (A78): the sRGB value an 18 % grey Lambert card facing the current rig's key light renders at (the rig's
   * exposure, tone mapping and ambient), so a sheet can print its calibration instead of a remembered number.
   */
  async greyCard(): Promise<number> {
    const r = LIGHT_RIGS.find((x) => x.id === this.state.rig) ?? LIGHT_RIGS[0]!;
    const key = r.lights.find((l) => l.kind === 'dir');
    if (!key) return 0;
    const v = new Vector3(...key.v).normalize();
    const card = CreateBox('greyCard', { width: 0.6, height: 0.6, depth: 0.002 }, this.scene);
    const m = new PBRMaterial('greyCardMat', this.scene);
    m.albedoColor = new Color3(0.18, 0.18, 0.18);
    m.metallic = 0;
    m.roughness = 1;
    m.environmentIntensity = 0.25;
    m.directIntensity = Math.PI;
    card.material = m;
    const at = new Vector3(0, 1.1, 0).subtract(v.scale(2));
    card.position.copyFrom(at);
    card.lookAt(at.add(v)); // +Z of the box along the light's travel: its -Z face looks at the light
    const saved = { a: this.camera.alpha, b: this.camera.beta, r: this.camera.radius, t: this.camera.target.clone() };
    const camPos = at.subtract(v.scale(0.5));
    this.camera.setTarget(at);
    this.camera.setPosition(camPos);
    await this.frames(12);
    const px = await this.engine.readPixels(Math.floor(this.engine.getRenderWidth() / 2), Math.floor(this.engine.getRenderHeight() / 2), 1, 1);
    card.dispose();
    m.dispose();
    this.camera.setTarget(saved.t);
    this.camera.alpha = saved.a; this.camera.beta = saved.b; this.camera.radius = saved.r;
    const d = px as Uint8Array;
    return (0.2126 * d[0]! + 0.7152 * d[1]! + 0.0722 * d[2]!) / 255;
  }

  private setColours(m: Mesh, v: 'normals' | 'uv' | 'matid'): void {
    const pos = m.getVerticesData(VertexBuffer.PositionKind);
    if (!pos) return;
    const n = pos.length / 3;
    const key = `${m.name}-${v}`;
    let c = this.colourCache.get(key);
    if (!c) {
      c = new Float32Array(n * 4);
      if (v === 'normals') {
        const nor = m.getVerticesData(VertexBuffer.NormalKind) ?? [];
        for (let i = 0; i < n; i++) {
          c[i * 4] = (nor[i * 3] ?? 0) * 0.5 + 0.5;
          c[i * 4 + 1] = (nor[i * 3 + 1] ?? 0) * 0.5 + 0.5;
          c[i * 4 + 2] = (nor[i * 3 + 2] ?? 0) * 0.5 + 0.5;
          c[i * 4 + 3] = 1;
        }
      } else if (v === 'uv') {
        const uv = m.getVerticesData(VertexBuffer.UVKind) ?? [];
        for (let i = 0; i < n; i++) {
          c[i * 4] = (uv[i * 2] ?? 0) % 1;
          c[i * 4 + 1] = (uv[i * 2 + 1] ?? 0) % 1;
          c[i * 4 + 2] = 0.25;
          c[i * 4 + 3] = 1;
        }
      } else {
        const id = (m.metadata as { material: number }).material;
        const hue = (id * 0.618034) % 1;
        const [r, g, b] = hsv(hue, 0.65, 0.95);
        for (let i = 0; i < n; i++) { c[i * 4] = r; c[i * 4 + 1] = g; c[i * 4 + 2] = b; c[i * 4 + 3] = 1; }
      }
      this.colourCache.set(key, c);
    }
    m.setVerticesData(VertexBuffer.ColorKind, c, false);
  }

  /** Step 11 fix round 2 (item 6): lift the exposure by `ev` stops over the rig's (0 = the calibrated value). */
  setExposureBoost(ev: number): void {
    this.evBoost = ev;
    this.applyExposure();
  }

  /**
   * Step 11 fix round 2 (item 4): a mask of the operator alone in the current view (unlit material-id colours on black;
   * floor, backdrop, grey human, scale bar, glow stand-in and the game rig hidden), so a sheet measures her pixels only.
   */
  async maskShot(): Promise<string> {
    const prevDebug = this.state.debug;
    const r = LIGHT_RIGS.find((x) => x.id === this.state.rig) ?? LIGHT_RIGS[0]!;
    this.ground.setEnabled(false);
    this.scaleBar.setEnabled(false);
    this.silMesh?.setEnabled(false);
    this.glow.setEnabled(false);
    this.rig.setEnabled(false);
    this.weapon.setEnabled(false);
    const nv = this.nv;
    if (nv) nv.dispose(this.camera);
    this.nv = null;
    this.scene.clearColor = new Color4(0, 0, 0, 1);
    this.setDebug('matid');
    if (this.ssao) this.scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline('ssao', this.camera);
    await this.frames(4);
    const url = this.canvas.toDataURL('image/png');
    if (this.ssao) this.scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline('ssao', this.camera);
    this.setDebug(prevDebug);
    this.scene.clearColor = new Color4(...r.background, 1);
    this.ground.setEnabled(!this.state.ortho);
    this.setSilhouette(this.state.silhouette);
    this.setGameRig(this.state.gameRig);
    this.glow.setEnabled(r.glow && !this.hasLens());
    if (r.nightVision) this.setRig(r.id);
    return url;
  }

  /**
   * Step 11 fix round 2 (item 7): an 18 % grey Lambert sphere alone at chest height in the operator's place (operator
   * hidden), to show which side the current rig lights brighter. Off restores the operator.
   */
  probeSphere(on: boolean): void {
    const l = this.loaded;
    if (l) for (const m of l.meshes) m.setEnabled(!on);
    this.silMesh?.setEnabled(!on && this.state.silhouette);
    this.scaleBar.setEnabled(!on && this.state.silhouette);
    let s = this.scene.getMeshByName('probeSphere') as Mesh | null;
    if (on && !s) {
      s = CreateSphere('probeSphere', { diameter: 0.4, segments: 48 }, this.scene);
      const m = new PBRMaterial('probeSphereMat', this.scene);
      m.albedoColor = new Color3(0.18, 0.18, 0.18);
      m.metallic = 0;
      m.roughness = 1;
      m.environmentIntensity = 0.25;
      m.directIntensity = Math.PI;
      s.material = m;
      s.receiveShadows = true;
    }
    if (s) { s.position.set(this.offsetX, 1.1, 0); s.setEnabled(on); }
  }

  setPreset(id: string): void {
    const p: QualityPreset = PRESETS.find((q) => q.id === id) ?? PRESETS[2]!;
    this.state.preset = p.id;
    this.engine.setHardwareScalingLevel(1 / p.scale);
    this.pipeline?.dispose();
    this.pipeline = null;
    this.ssao?.dispose();
    this.ssao = null;
    this.pipeline = new DefaultRenderingPipeline('lab', true, this.scene, [this.camera]);
    this.pipeline.samples = p.msaa;
    this.pipeline.fxaaEnabled = p.fxaa;
    this.pipeline.bloomEnabled = p.bloom;
    this.pipeline.bloomThreshold = 0.8;
    this.pipeline.bloomWeight = 0.35;
    this.pipeline.imageProcessingEnabled = true;
    if (p.ssao) {
      try {
        this.ssao = new SSAO2RenderingPipeline('ssao', this.scene, { ssaoRatio: 0.5, blurRatio: 1 }, [this.camera]);
        this.ssao.radius = 0.35;
        this.ssao.totalStrength = 0.9;
        this.ssao.samples = 16;
      } catch { this.ssao = null; }
    }
    const l = this.loaded;
    if (l) {
      for (const m of l.model.materials.keys()) {
        const mat = l.materials[m]!;
        const fabric = l.model.materials[m]!.roughness > 0.75 && (mat.metallic ?? 0) < 0.5;
        mat.sheen.isEnabled = fabric && !p.phoneLook;
        if (mat.sheen.isEnabled) { mat.sheen.intensity = 0.35; mat.sheen.color = new Color3(0.5, 0.52, 0.55); }
      }
    }
    this.rebuildShadows();
    this.setRig(this.state.rig);
  }

  setRig(id: string): void {
    const r: LightRig = LIGHT_RIGS.find((x) => x.id === id) ?? LIGHT_RIGS[0]!;
    this.state.rig = r.id;
    for (const l of this.lights) l.dispose();
    this.lights = [];
    this.shadow?.dispose();
    this.shadow = null;
    this.scene.clearColor = new Color4(...r.background, 1);
    this.hemi.diffuse = new Color3(...r.ambient.sky);
    this.hemi.groundColor = new Color3(...r.ambient.ground);
    this.hemi.intensity = r.ambient.intensity;
    const preset = PRESETS.find((p) => p.id === this.state.preset)!;
    for (const l of r.lights) {
      const light = l.kind === 'dir'
        ? new DirectionalLight('dir', new Vector3(...l.v).normalize(), this.scene)
        : new PointLight('pt', new Vector3(...l.v), this.scene);
      light.diffuse = new Color3(...l.color);
      light.specular = new Color3(...l.color);
      light.intensity = l.intensity;
      if (light instanceof PointLight) light.range = 14;
      if (light instanceof DirectionalLight) { light.position = new Vector3(...l.v).normalize().scale(-6).add(new Vector3(0, 1, 0)); light.shadowMinZ = 1; light.shadowMaxZ = 14; }
      this.lights.push(light);
      if (l.shadows && !this.shadow && light instanceof DirectionalLight) {
        const g = new ShadowGenerator(preset.shadowMap, light);
        g.usePercentageCloserFiltering = true;
        g.filteringQuality = preset.shadowMap > 1024 ? ShadowGenerator.QUALITY_HIGH : ShadowGenerator.QUALITY_LOW;
        // fix round 2 (item 7): shadow acne. At bias 0.0008 every face turned to the key shadowed itself (two-sided
        // materials put both faces in the map): the turnaround's front legs read sRGB 0.02 under the key, 0.08 with
        // shadows off, while the back under the weaker rim read 0.07. Bias 0.004 (about 5 cm over the 13 m depth range)
        // gives 0.08, the no-shadow value; a larger normal bias made it worse (0.01), back-faces-only had no effect.
        g.bias = 0.004;
        g.normalBias = 0.01;
        this.shadow = g;
        this.registerCasters();
      }
    }
    this.glow.setEnabled(r.glow && !this.hasLens());
    this.glowLight.setEnabled(r.glow && r.glowLight !== false);
    this.scene.environmentTexture = r.env ? this.studioEnv() : null;
    if (this.pipeline) {
      this.applyExposure();
      this.pipeline.imageProcessing.contrast = r.contrast;
      this.pipeline.imageProcessing.toneMappingEnabled = true;
      this.pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    }
    if (r.nightVision && !this.nv) {
      this.nv = new PostProcess('nv', 'nv', ['time'], null, 1, this.camera, Constants.TEXTURE_BILINEAR_SAMPLINGMODE, this.engine);
      this.nv.onApply = (e) => e.setFloat('time', this.time);
    } else if (!r.nightVision && this.nv) {
      this.nv.dispose(this.camera);
      this.nv = null;
    }
  }

  private rebuildShadows(): void {
    if (this.lights.length) this.setRig(this.state.rig);
  }

  private registerCasters(): void {
    const l = this.loaded;
    if (!this.shadow || !l) return;
    for (const m of l.meshes) this.shadow.addShadowCaster(m);
  }

  /** Applies every state field at once (after load). */
  apply(): void {
    this.setPreset(this.state.preset);
    this.setDebug(this.state.debug);
    this.setSilhouette(this.state.silhouette);
    this.setGameRig(this.state.gameRig);
    this.setOrtho(this.state.ortho);
  }

  setGameRig(on: boolean): void {
    this.state.gameRig = on;
    this.rig.setEnabled(on);
    this.weapon.setEnabled(this.state.weapon && (this.poseDef.id === 'aimPistol' || this.poseDef.id === 'aimRifle'));
  }

  /** Where the figure stands (m along X): side-by-side and before / after frames. */
  setOffsets(operatorX: number, rigX: number): void {
    if (this.loaded) for (const m of this.loaded.meshes) m.position.x = operatorX;
    this.rig.root.position.x = rigX;
    this.offsetX = operatorX;
    this.setPose(this.state.pose); // the rig's foot planner saw a jump: settle it again
  }
  private offsetX = 0;

  setSilhouette(on: boolean): void {
    this.state.silhouette = on;
    this.scaleBar.setEnabled(on);
    const l = this.loaded;
    if (on && l && !this.silMesh) {
      const body = l.meshes.find((m) => m.name.endsWith('-body'));
      if (body) {
        const mat = new StandardMaterial('sil', this.scene);
        mat.disableLighting = true;
        mat.emissiveColor = new Color3(0.2, 0.21, 0.23);
        const c = body.clone('silhouette');
        this.glowLight.excludedMeshes.push(c);
        c.material = mat;
        c.skeleton = body.skeleton;
        c.scaling.setAll(1.75 / l.height);
        this.silMesh = c;
      }
    }
    this.silMesh?.setEnabled(on);
  }

  setOrtho(on: boolean): void {
    this.state.ortho = on;
    this.ground.setEnabled(!on);
    if (on) {
      this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
      this.fitOrtho();
    } else {
      this.camera.mode = Camera.PERSPECTIVE_CAMERA;
    }
  }

  private fitOrtho(): void {
    const half = this.camera.radius * Math.tan(this.camera.fov / 2);
    const a = this.engine.getRenderWidth() / this.engine.getRenderHeight();
    this.camera.orthoTop = half;
    this.camera.orthoBottom = -half;
    this.camera.orthoLeft = -half * a;
    this.camera.orthoRight = half * a;
  }

  // ---- camera ----

  /** World position of a joint of the operator's posed skeleton. */
  jointPos(name: string): V3 | null {
    const l = this.loaded;
    if (!l) return null;
    const i = l.model.nodes.findIndex((n) => n.name === name);
    if (i < 0) return null;
    const p = this.posePos[i]!;
    return [p[0] + this.offsetX, p[1], p[2]];
  }

  /** Aims the camera: a target point, distance, azimuth (0 = in front of the figure) and elevation. */
  look(target: V3, radius: number, yaw: number, pitch: number): void {
    this.camera.target.set(target[0], target[1], target[2]);
    this.camera.radius = radius;
    this.camera.alpha = Math.PI / 2 + yaw;
    this.camera.beta = Math.PI / 2 - pitch;
    if (this.state.ortho) this.fitOrtho();
    this.placeSilhouette(yaw);
  }

  turnaround(v: CamView, radius = 6.5): void {
    const h = this.loaded?.height ?? 1.7;
    this.look([this.offsetX, h * 0.53, 0], radius, v.yaw, v.pitch);
  }

  closeUp(id: string): void {
    const c = CLOSEUPS.find((x) => x.id === id);
    const l = this.loaded;
    if (!c || !l) return;
    const j = this.jointPos(c.joint) ?? [0, 1.4, 0];
    this.look([j[0] + c.offset[0], j[1] + c.offset[1], j[2] + c.offset[2]], c.distance, c.yaw, c.pitch);
  }

  /** The grey silhouette stands 0.5 m behind the figure along the view axis. */
  private placeSilhouette(yaw: number): void {
    if (this.silMesh) this.silMesh.position.set(Math.sin(yaw) * 0.6 + this.offsetX, 0, -Math.cos(yaw) * 0.6);
    this.scaleBar.position.set(this.offsetX + Math.cos(yaw) * 0.75 + Math.sin(yaw) * 0.6, 0, Math.sin(yaw) * 0.75 - Math.cos(yaw) * 0.6);
    this.scaleBar.rotation.y = yaw;
  }

  // ---- loop ----

  private frame(fixedDt?: number): void {
    const dt = fixedDt ?? Math.min(this.engine.getDeltaTime() / 1000, 0.1);
    this.time += dt;
    if (this.state.turntable) this.camera.alpha += dt * 0.6;
    if (this.poseDef.rig && this.state.pose !== 'apose' && this.poseFrames > 0) this.stepRig(dt);
    this.updateOperator();
    const r = LIGHT_RIGS.find((x) => x.id === this.state.rig);
    if (r?.glow && this.loaded) {
      const h = this.jointPos('head');
      if (h) {
        this.glow.position.set(h[0], h[1] + 0.02, h[2] + 0.115);
        this.glowLight.position.set(h[0], h[1] + 0.02, h[2] + 0.2);
      }
    }
    this.scene.render();
  }

  /** The loaded model has the built goggle (step 07): its lens material glows, no stand-in needed. */
  private hasLens(): boolean {
    return !!this.loaded?.model.materials.some((m) => m.name === 'goggle lens' || m.name.endsWith('-glow'));
  }

  private readonly riggers = new Map<string, RigJoint>();

  private updateOperator(): void {
    const l = this.loaded;
    if (!l) return;
    if (this.poseDef.rig === null) {
      // A-pose: the bind pose itself
      for (let i = 0; i < l.nodes.length; i++) {
        this.posePos[i] = [...l.bindPos[i]!] as V3;
        this.poseRot[i] = [...l.bindRot[i]!] as Quat;
      }
    } else {
      this.rig.root.computeWorldMatrix(true);
      for (const k of Object.keys(JOINT_TO_RIG)) {
        const rigName = JOINT_TO_RIG[k]!;
        const n = this.rigNodes.get(rigName);
        if (!n) continue;
        n.computeWorldMatrix(true);
        const q = n.absoluteRotationQuaternion;
        const rest = this.rigRest.get(rigName);
        const p = n.getAbsolutePosition();
        const move: V3 = rest ? [p.x - rest.pos.x, p.y - rest.pos.y, p.z - rest.pos.z] : [0, 0, 0];
        this.riggers.set(rigName, { rot: [q.x, q.y, q.z, q.w], move });
      }
      poseSkeleton(l.model.nodes, l.bindPos, l.bindRot, l.retarget, (n) => this.riggers.get(n) ?? null, this.posePos, this.poseRot);
    }
    // world to local down the tree
    for (const i of l.retarget.order) {
      const n = l.model.nodes[i]!;
      const t = l.nodes[i]!;
      const p = n.parent;
      const q = this.poseRot[i]!;
      if (p < 0) {
        t.position.set(...this.posePos[i]!);
        t.rotationQuaternion!.set(q[0], q[1], q[2], q[3]);
      } else {
        const pq = this.poseRot[p]!;
        const pp = this.posePos[p]!;
        const inv = new Quaternion(-pq[0], -pq[1], -pq[2], pq[3]);
        const off = new Vector3(this.posePos[i]![0] - pp[0], this.posePos[i]![1] - pp[1], this.posePos[i]![2] - pp[2]);
        off.rotateByQuaternionToRef(inv, off);
        t.position.copyFrom(off);
        t.rotationQuaternion!.copyFrom(inv.multiply(new Quaternion(q[0], q[1], q[2], q[3])));
      }
    }
  }

  // ---- reports ----

  stats(): { operator: string; lod: string; triangles: number; meshes: number; materials: number; textures: string; drawCalls?: number } {
    const l = this.loaded;
    // fix round 2 (item 8): the textures the loaded file really carries (the sheet prints the measured sizes and VRAM)
    const imgs = new Set<string>();
    for (const m of l?.model.materials ?? []) for (const t of [m.baseTex, m.ormTex, m.normalTex]) if (t) imgs.add(`${t.name} (${t.mime.replace('image/', '')})`);
    return {
      operator: l?.id ?? '', lod: this.state.lod, triangles: l?.triangles ?? 0, meshes: l?.meshes.length ?? 0,
      materials: l?.materials.length ?? 0, textures: imgs.size ? `${imgs.size} maps` : 'none (flat material factors)',
    };
  }

  get height(): number { return this.loaded?.height ?? 1.7; }
  get loadedId(): string { return this.loaded?.id ?? ''; }

  /** Renders `n` frames now, synchronously, 1/60 s apart (deterministic; works with the browser pane hidden). */
  async frames(n: number): Promise<void> {
    // shaders compile in the background: render, wait until everything is ready, then render the frames that count
    for (let k = 0; k < 3; k++) this.frame(1 / 60);
    await this.scene.whenReadyAsync();
    await new Promise((r) => setTimeout(r, 120));
    for (let k = 0; k < 3; k++) this.frame(1 / 60);
    await this.scene.whenReadyAsync();
    for (let k = 0; k < n; k++) this.frame(1 / 60);
  }
}

function hsv(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const m = i % 6;
  return [[v, q, p, p, t, v][m]!, [t, v, v, q, p, p][m]!, [p, p, t, v, v, q][m]!];
}
