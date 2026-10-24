import { ClusteredLightContainer, Color3, CreateBox, CreateSphere, Matrix, Mesh, PBRMaterial, Quaternion, ShadowGenerator, SpotLight, StandardMaterial, Vector3, VertexData, type AbstractMesh, type Material, type Scene } from '../core/babylon';
import { LAMP_CONE as LAMP_CONE_MATH, LAMP_EXP, LIGHT_GAIN, SPOT_EXP } from './lampMath';
import type { ShadowSpec } from '../core/quality';
import { nearestLights, type FittingModel, type LightDef, type LightRegistry } from './lights';
import { fittingMesh, type MeshArrays } from './fixtureModels';
import { mountLinks } from './lampMount';
import { HANGER_STRIDE } from './lampSway';
import { gameLightFalloff, TORCH_DRAW_SLOTS, torchShadowPass, writeTorchDraw } from './shadowAccuracy';
import { registryHasTorch } from './torchShadows';
import { flags } from '../core/flags';

/** (warehouse-lamps) One fitting model's draws: the body (shared dark material) and the glowing face, and the lights they show. */
interface FittingDraw {
  body: Mesh;
  face: Mesh;
  /** Registry ids, one per instance. */
  ids: Int32Array;
  colors: Float32Array;
}
const MODELS: readonly FittingModel[] = ['panel', 'strip', 'bulkhead'];

/** Most real lights the rig can hold (`QualityLevel.realLights`, Settings > Graphics). */
export const MAX_REAL_LIGHTS = 48;
/** Without clustered lighting (an old GPU) plain per-pixel lights cap at this. */
const PLAIN_LIGHTS = 6;
/** Lamps given a shadow map use this cone (a perspective shadow map cannot cover the 175 deg lamp cone). */
const SHADOW_LAMP_CONE = Math.PI * 0.8;
/** How often the nearest set is re-picked (s). */
const PICK_INTERVAL = 0.25;
/** With baked lamps (3.2): the moving lights the pools hold, and how many cast shadows. */
const BAKED_POOL = 4;
const BAKED_SHADOWS = 2;
/**
 * (PC1 fix) Shadowed spots the voxel level's micro-detail shader has texture units for (micro detail: Textures above Low).
 * Measured at Epic, that shader takes 15 of WebGL's 16 without a spot shadow: environment BRDF, the moon's cascades, the cluster's two, the voxel
 * plugin's 7 (micro detail and normals among them) and the lamp bake's (`e2e-desktop` measures it). A spot's shadow
 * joins a material's shader only once its map has casters - when a guard's flashlight takes the slot - so the second
 * one took the shader to 17 and the level's near chunks stopped drawing as guards alerted.
 */
const MICRO_SHADOWS = 1;
/** Sun + hemisphere already light every material. */
const BASE_LIGHTS = 2;
/** Omni lamps render as a spot pointing down with this cone (rad): everything below the lamp is lit, and one
 *  light type keeps the per-pixel light loop short. */
/** (= `lampMath.LAMP_CONE`.) */
const LAMP_CONE = LAMP_CONE_MATH;
/** (Step 4b fix) night vision's gain on the fixtures at full goggles (rendering only): a lamp is the brightest thing in
 *  the tube. (The additive light cones are gone, Michael 2026-10-09: in clean indoor air a lamp's beam is not seen, only
 *  the light where it lands; desktop's volumetric haze stays.) (nv-pass slice 1: 2.5 -> 8, so a fixture clears the
 *  tube's bloom threshold - `BLOOM.bright`, compressed 0.8 = linear 4 - while a lit wall under the lower gain does not.) */
const NV_BULB = 8;
/** (nv-pass slice 1) Electro's boost on the fixtures, as a share of night vision's: kept at the old x2.5. */
export const ELECTRO_BULB = (2.5 - 1) / (NV_BULB - 1);
/** (lr16pol E) `LightRig.drawBits`: a light's texel is drawn by the bulb spheres / the fixture boxes. */
const DRAW_BULB = 1;
const DRAW_BOX = 2;

/** What the rig is asked to render (from the graphics settings). */
export interface LightRigConfig {
  /** Real lights (clustered; a plain-light fallback caps lower). */
  lights: number;
  shadow: ShadowSpec;
  /** Volumetric lighting on (the post stack's haze; the rig itself no longer draws light cones). */
  volumetric: boolean;
  /** Tests (`?gfx=min`): a short plain pool, no clustering. */
  minimal?: boolean;
  /** A level that draws micro detail: the shadow pool shrinks to `MICRO_SHADOWS`. */
  micro?: boolean;
}

/** One pool slot: a Babylon spot light and, for the shadow pool, its generator. */
interface Slot {
  light: SpotLight;
  sg: ShadowGenerator | null;
  /** Registry light placed here (-1 = idle). */
  id: number;
  /** Shadow pool: the casters within this light's reach (its shadow map's render list; refilled on each pick). */
  list: AbstractMesh[];
}

/**
 * Renders the level's `LightRegistry`: every light gets an emissive bulb (one thin-instanced mesh, dark when
 * off or shot out), and the few nearest the camera get a real Babylon light from a fixed pool of spot
 * lights (lamps as a wide downward cone). The pool's lights are created once and never enabled / disabled
 * (that would change shader defines and recompile mid-match): unused ones sit at zero intensity. Every fixed
 * light used to get a faint additive cone mesh as well; Step 4b's fix took it out (a beam is not seen in clean air)
 * A level without lights creates nothing.
 */
export class LightRig {
  /** Unshadowed lights (inside the clustered container when the GPU has it). */
  private pool: Slot[] = [];
  /** Shadow-casting lights (flashlights first, then the nearest lamps). */
  private shadowPool: Slot[] = [];
  private cluster: ClusteredLightContainer | null = null;
  /** Meshes that cast shadows (shared by every shadow map; static level + characters + props). */
  readonly casters: AbstractMesh[] = [];
  private casterSet = new Set<AbstractMesh>();
  private cfg: LightRigConfig = { lights: 8, shadow: { sun: false, cascades: 0, sunSize: 0, casters: 0, size: 0, soft: false, charLamps: 0, charTile: 0 }, volumetric: false };
  private matObs: { remove(): void } | null = null;
  private readonly scene: Scene;
  private bulbs: Mesh | null = null;
  private fixtures: Mesh | null = null;
  /** (warehouse-lamps) The fitting models (built once at load) and their mounts' links (one box mesh). */
  private fittings: FittingDraw[] = [];
  private links: Mesh | null = null;
  private bodyMat: PBRMaterial | null = null;
  private bulbColors: Float32Array | null = null;
  private ids = new Int32Array(MAX_REAL_LIGHTS + 16);
  private dist = new Float32Array(MAX_REAL_LIGHTS + 16);
  private pickT = 0;
  private version = -1;
  /** (LR16-5) The registry's `flickerVersion` the bulbs were painted at (a stuttering tube's fitting goes dark with it). */
  private flickV = -1;
  /** 3.1 frame governor: the share of the light pool lit, shadow maps re-rendered every N frames. */
  private litScale = 1;
  private shadowEvery = 1;
  /** 3.2: lights drawn by `BakedLamps` (every fixed one): the pools only take the rest (flashlights). */
  private baked: Set<number> | null = null;
  setBaked(ids: Set<number>): void {
    this.baked = ids;
    this.pickT = 0;
  }
  /** (LR15) The baked lamps' torch uniforms (`BakedLamps.torchDraw`): the flashlights that get no shadow map
   *  are drawn there with the light field's formula x their beam's cut, not as the pool's Babylon lights. */
  private torchBuf: Float32Array | null = null;
  /** Registry ids in the drawn torch slots (-1: empty). */
  private readonly torchIds = new Int32Array(TORCH_DRAW_SLOTS).fill(-1);
  private readonly torchKeep = new Uint8Array(TORCH_DRAW_SLOTS);
  setTorchDraw(buf: Float32Array | null): void {
    this.torchBuf = buf;
    this.pickT = 0;
  }
  /** Flashlights drawn by the baked lamps now (tests / debug). */
  get drawnTorches(): number {
    let n = 0;
    for (let k = 0; k < TORCH_DRAW_SLOTS; k++) if (this.torchIds[k]! >= 0) n++;
    return n;
  }
  /** (LR16t) Registry id per drawn torch slot (-1: empty); `TorchShadows` gives slot k atlas tile k. Read only. */
  get torchSlotIds(): Int32Array {
    return this.torchIds;
  }
  /** (LR16t) The torch shadow atlas is on (`TorchShadows`): no flashlight gets a Babylon light - the shadow pool holds
   *  none (its casters capped at 0) and the clustered pool skips them; every torch is drawn by the baked lamps. */
  private tsOn = false;
  /** The last `configure` input, before the caps (a `setTorchShadows` change re-applies it). */
  private cfgIn: LightRigConfig | null = null;
  setTorchShadows(on: boolean): void {
    if (on === this.tsOn) return;
    this.tsOn = on;
    this.pickT = 0;
    if (this.cfgIn) this.configure(this.cfgIn);
  }
  get torchShadowsOn(): boolean {
    return this.tsOn;
  }
  /** Shadow-mapped spot lights in the pool (tests: 0 while the torch atlas is on). */
  get shadowSlots(): number {
    return this.shadowPool.length;
  }

  /** Real lights in use (clustered + shadowed). */
  get active(): number {
    return this.pool.length + this.shadowPool.length;
  }
  private bulbCount = 0;
  /** (lr16pol E, lr16-5 A5) Per registry id, which meshes draw its colour texel, made at load: `DRAW_BULB` the bulb
   *  spheres, `DRAW_BOX` the fixture boxes (both read `bulbColors`); its fitting (index into `fittings`, -1 none) and
   *  instance there; its swinging pendant (index into `reg.sway`, -1 none). `paintFlicker` writes only these. */
  private drawBits = new Uint8Array(0);
  private fitOf = new Int32Array(0);
  private fitK = new Int32Array(0);
  private swayOf = new Int32Array(0);
  /** Scratch: per fitting model, a flickering lamp's texel was written this move (re-upload that face only). */
  private readonly fitDirty = new Uint8Array(MODELS.length);

  constructor(
    scene: Scene,
    readonly reg: LightRegistry,
  ) {
    this.scene = scene;
    const n = reg.lights.length;
    if (n === 0) return;
    // bulbs
    const mesh = CreateSphere('lightBulbs', { diameter: 0.18, segments: 6 }, scene);
    const mat = new StandardMaterial('lightBulbMat', scene);
    mat.disableLighting = true;
    mat.diffuseColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.emissiveColor = Color3.White();
    // (warehouse-lamps) the fitting faces are flat lenses seen from either side
    mat.backFaceCulling = false;
    mat.freeze();
    mesh.material = mat;
    mesh.isPickable = false;
    const mtx = new Float32Array(n * 16);
    const fmtx = new Float32Array(n * 16);
    const m = new Matrix();
    let fixtures = 0;
    this.drawBits = new Uint8Array(n);
    this.fitOf = new Int32Array(n).fill(-1);
    this.fitK = new Int32Array(n);
    this.swayOf = new Int32Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const l = reg.lights[i]!;
      // moving lights (enemy flashlights) have no fixed bulb
      if (l.kind === 'flashlight') continue;
      // (LR16-5b) a swinging pendant's fitting is drawn by `buildSway` (a zero matrix here)
      if (reg.sway && reg.sway.indexOf(i) >= 0) continue;
      const f = l.fixture;
      // a fitting model (drawn by `buildFittings`) has no bulb and no box
      if (f?.model) continue;
      if (f) {
        // a fixture box instead of a bulb (it goes dark with the light)
        Matrix.ComposeToRef(new Vector3(f.sx, f.sy, f.sz), Quaternion.Identity(), new Vector3(l.x, l.y + f.oy, l.z), m);
        m.copyToArray(fmtx, i * 16);
        fixtures++;
        this.drawBits[i] = DRAW_BOX;
        continue;
      }
      Matrix.TranslationToRef(l.x, l.y, l.z, m);
      m.copyToArray(mtx, i * 16);
      this.drawBits[i] = DRAW_BULB;
    }
    this.bulbCount = n;
    this.bulbColors = new Float32Array(n * 4);
    if (fixtures) {
      const fm = CreateBox('lightFixtures', { size: 1 }, scene);
      fm.material = mat;
      fm.isPickable = false;
      fm.thinInstanceSetBuffer('matrix', fmtx, 16, true);
      fm.thinInstanceSetBuffer('color', this.bulbColors, 4, false);
      fm.thinInstanceRefreshBoundingInfo(false);
      fm.freezeWorldMatrix();
      this.fixtures = fm;
    }
    mesh.thinInstanceSetBuffer('matrix', mtx, 16, true);
    mesh.thinInstanceSetBuffer('color', this.bulbColors, 4, false);
    mesh.thinInstanceRefreshBoundingInfo(false);
    mesh.freezeWorldMatrix();
    this.bulbs = mesh;
    this.buildFittings(scene, mat);
    this.buildSway(scene, mat);
  }

  /** (LR16-5b) The swinging pendants: their fitting boxes (glowing, as `lightFixtures`) and their hangers (the fittings'
   *  body material), each one thin-instanced box mesh with dynamic matrices. */
  private swayBodies: Mesh | null = null;
  private swayLinks: Mesh | null = null;
  private swayBodyMtx: Float32Array | null = null;
  private swayLinkMtx: Float32Array | null = null;
  private swayColors: Float32Array | null = null;
  private swayV = -1;
  private readonly swM = new Matrix();
  private readonly swQ = new Quaternion();
  private readonly swS = new Vector3();
  private readonly swP = new Vector3();

  /** (LR16-5b) Load time: the pendants' two meshes (at most 9 bodies, 18 hangers on Marlow Yard). */
  private buildSway(scene: Scene, faceMat: StandardMaterial): void {
    const s = this.reg.sway;
    if (!s || !s.n) return;
    const bodies = CreateBox('swayFittings', { size: 1 }, scene);
    bodies.material = faceMat;
    bodies.isPickable = false;
    this.swayBodyMtx = new Float32Array(s.n * 16);
    this.swayColors = new Float32Array(s.n * 4);
    bodies.thinInstanceSetBuffer('matrix', this.swayBodyMtx, 16, false);
    bodies.thinInstanceSetBuffer('color', this.swayColors, 4, false);
    bodies.alwaysSelectAsActiveMesh = true;
    bodies.freezeWorldMatrix();
    this.swayBodies = bodies;
    for (let k = 0; k < s.n; k++) {
      const id = s.ids[k]!;
      if (id < this.swayOf.length) this.swayOf[id] = k;
    }
    if (s.hangerCount) {
      const links = CreateBox('swayHangers', { size: 1 }, scene);
      links.material = this.bodyMaterial(scene);
      links.isPickable = false;
      this.swayLinkMtx = new Float32Array(s.hangerCount * 16);
      links.thinInstanceSetBuffer('matrix', this.swayLinkMtx, 16, false);
      links.alwaysSelectAsActiveMesh = true;
      links.freezeWorldMatrix();
      this.swayLinks = links;
    }
    this.drawSway();
  }

  /** (LR16-5b) The pendants where they hang now: each body at rest + its offset, each hanger from its fixed top to its
   *  bottom + the offset (the links' maths in `buildFittings`). On a `swayVersion` move only. No allocation. */
  private drawSway(): void {
    const s = this.reg.sway;
    const bm = this.swayBodyMtx;
    if (!s || !bm || !this.swayBodies) return;
    this.swayV = this.reg.swayVersion;
    const ls = this.reg.lights;
    const m = this.swM;
    const q = this.swQ;
    const sc = this.swS;
    const pos = this.swP;
    for (let k = 0; k < s.n; k++) {
      const l = ls[s.ids[k]!]!;
      const f = l.fixture!;
      sc.set(f.sx, f.sy, f.sz);
      q.set(0, 0, 0, 1);
      pos.set(l.x + l.swx, l.y + f.oy + l.swy, l.z + l.swz);
      Matrix.ComposeToRef(sc, q, pos, m);
      m.copyToArray(bm, k * 16);
    }
    this.swayBodies.thinInstanceBufferUpdated('matrix');
    const lm = this.swayLinkMtx;
    if (!lm || !this.swayLinks) return;
    const H = s.hangers;
    for (let j = 0; j < s.hangerCount; j++) {
      const o = j * HANGER_STRIDE;
      const k = H[o]!;
      const ox = s.off[k * 3]!;
      const oy = s.off[k * 3 + 1]!;
      const oz = s.off[k * 3 + 2]!;
      const ax = H[o + 1]!;
      const az = H[o + 2]!;
      const ay = H[o + 3]!;
      const dx = ox;
      const dy = H[o + 4]! + oy - ay;
      const dz = oz;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      // local +z along the hanger: yaw about y, then pitch about x (as the strip wires)
      Quaternion.RotationYawPitchRollToRef(Math.atan2(dx, dz), -Math.asin(len > 1e-6 ? dy / len : 0), 0, q);
      sc.set(H[o + 5]!, H[o + 6]!, len);
      pos.set(ax + dx / 2, ay + dy / 2, az + dz / 2);
      Matrix.ComposeToRef(sc, q, pos, m);
      m.copyToArray(lm, j * 16);
    }
    this.swayLinks.thinInstanceBufferUpdated('matrix');
  }

  /** (warehouse-lamps; the LED family since sector-fixes L) The three fitting models, merged per type and thin-instanced, and every mount's links (strip wires, bulkhead stand-offs) as one box mesh. Load time only. */
  private buildFittings(scene: Scene, faceMat: StandardMaterial): void {
    const ls = this.reg.lights;
    const segs: number[] = [];
    const m = new Matrix();
    const q = new Quaternion();
    const pos = new Vector3();
    const one = new Vector3(1, 1, 1);
    for (const model of MODELS) {
      const ids: number[] = [];
      for (const l of ls) {
        if (l.kind === 'flashlight' || l.fixture?.model !== model) continue;
        ids.push(l.id);
        mountLinks(l, segs);
      }
      if (!ids.length) continue;
      const mtx = new Float32Array(ids.length * 16);
      ids.forEach((id, k) => {
        const l = ls[id]!;
        Quaternion.RotationYawPitchRollToRef(l.fixture!.yaw ?? 0, 0, 0, q);
        pos.set(l.x, l.y, l.z);
        Matrix.ComposeToRef(one, q, pos, m);
        m.copyToArray(mtx, k * 16);
      });
      const geo = fittingMesh(model);
      const body = this.meshOf('lampBody-' + model, geo.body, scene, this.bodyMaterial(scene), mtx);
      const colors = new Float32Array(ids.length * 4);
      const face = this.meshOf('lampFace-' + model, geo.face, scene, faceMat, mtx);
      face.thinInstanceSetBuffer('color', colors, 4, false);
      for (let k = 0; k < ids.length; k++) {
        this.fitOf[ids[k]!] = this.fittings.length;
        this.fitK[ids[k]!] = k;
      }
      this.fittings.push({ body, face, ids: Int32Array.from(ids), colors });
    }
    const n = segs.length / 7;
    if (!n) return;
    const lm = new Float32Array(n * 16);
    const sc = new Vector3();
    for (let k = 0; k < n; k++) {
      const o = k * 7;
      const dx = segs[o + 3]! - segs[o]!;
      const dy = segs[o + 4]! - segs[o + 1]!;
      const dz = segs[o + 5]! - segs[o + 2]!;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const t = segs[o + 6]!;
      // local +z along the link: yaw about y, then pitch about x (Babylon's yaw-pitch-roll order)
      Quaternion.RotationYawPitchRollToRef(Math.atan2(dx, dz), -Math.asin(len > 1e-6 ? dy / len : 0), 0, q);
      sc.set(t, t, len);
      pos.set(segs[o]! + dx / 2, segs[o + 1]! + dy / 2, segs[o + 2]! + dz / 2);
      Matrix.ComposeToRef(sc, q, pos, m);
      m.copyToArray(lm, k * 16);
    }
    const links = CreateBox('lampLinks', { size: 1 }, scene);
    links.material = this.bodyMaterial(scene);
    links.isPickable = false;
    links.thinInstanceSetBuffer('matrix', lm, 16, true);
    links.thinInstanceRefreshBoundingInfo(false);
    links.freezeWorldMatrix();
    this.links = links;
  }

  /** The fittings' one body material: pale powder-coated aluminium (LED housings), lit like the level (the lamp bake attaches to every PBR material). */
  private bodyMaterial(scene: Scene): PBRMaterial {
    if (this.bodyMat) return this.bodyMat;
    const bm = new PBRMaterial('lampBodyMat', scene);
    bm.albedoColor = Color3.FromHexString('#b4b8bc').toLinearSpace();
    bm.metallic = 0.2;
    bm.roughness = 0.45;
    bm.usePhysicalLightFalloff = false;
    bm.directIntensity = Math.PI;
    // thin frames and wires are seen edge-on and from below: both sides lit
    bm.backFaceCulling = false;
    bm.twoSidedLighting = true;
    bm.freeze();
    this.bodyMat = bm;
    return bm;
  }

  private meshOf(name: string, a: MeshArrays, scene: Scene, mat: Material, mtx: Float32Array): Mesh {
    const mesh = new Mesh(name, scene);
    const vd = new VertexData();
    vd.positions = a.positions;
    vd.normals = a.normals;
    vd.indices = a.indices;
    vd.applyToMesh(mesh, false);
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.thinInstanceSetBuffer('matrix', mtx, 16, true);
    mesh.thinInstanceRefreshBoundingInfo(false);
    mesh.freezeWorldMatrix();
    return mesh;
  }

  /** Lights the materials must take: sky + sun, the cluster (or the plain pool) and the shadow pool. */
  private get materialLights(): number {
    return BASE_LIGHTS + (this.cluster ? 1 : this.pool.length) + this.shadowPool.length + 1;
  }

  private fitMaterial(m: Material): void {
    const lit = m as Material & { maxSimultaneousLights?: number; disableLighting?: boolean; usePhysicalLightFalloff?: boolean };
    if (typeof lit.maxSimultaneousLights !== 'number' || lit.disableLighting) return;
    const want = this.materialLights;
    // (shadow audit) the flashlights light a figure or a weapon with the field's falloff, as they light the level
    const physical = lit.usePhysicalLightFalloff === true;
    if (lit.maxSimultaneousLights >= want && !physical) return;
    const frozen = m.isFrozen;
    if (frozen) m.unfreeze();
    if (lit.maxSimultaneousLights < want) lit.maxSimultaneousLights = want;
    gameLightFalloff(lit);
    if (frozen) m.freeze();
  }

  /** No longer a caster (3.1: the voxels hand over to the shadow proxy below Epic). */
  removeCaster(m: AbstractMesh): void {
    if (!this.casterSet.delete(m)) return;
    m.onEffectiveEnabledStateChangedObservable.removeCallback(this.markCasters);
    const i = this.casters.indexOf(m);
    if (i >= 0) this.casters.splice(i, 1);
    this.pickT = 0;
    this.version = -1;
  }

  /**
   * (G8 cull) A caster was enabled or disabled (a figure's LOD switch, the merged body giving way to the figure): the
   * placed shadow maps refill their lists on the next frame, so a disabled mesh never sits in one and a newly shown one
   * casts at once (not at the next pick). One closure per rig.
   */
  private castersDirty = false;
  private readonly markCasters = (): void => {
    this.castersDirty = true;
  };

  /** A mesh that casts shadows (level geometry, characters, props); deduplicated. */
  addCaster(m: AbstractMesh): void {
    if (this.casterSet.has(m)) return;
    this.casterSet.add(m);
    this.casters.push(m);
    // (gm-mc-polish L1) the G8 cull only with guard models on: flag off, a freeze toggle costs no refill (as before G8)
    if (flags.guardModels) m.onEffectiveEnabledStateChangedObservable.add(this.markCasters);
    m.onDisposeObservable.addOnce(() => {
      this.casterSet.delete(m);
      const i = this.casters.indexOf(m);
      if (i >= 0) this.casters.splice(i, 1);
    });
  }

  /**
   * Rebuild the pools for the graphics settings (Settings > Graphics; recompiles shaders, so only on a change).
   * Clustered lighting holds up to `lights` unshadowed lights in one container; `shadow.casters` spot lights with
   * shadow maps take the flashlights and the nearest lamps.
   */
  configure(cfg: LightRigConfig, force = false): void {
    this.cfgIn = cfg;
    // (baked lamps: the pools only hold the moving lights - flashlights - and at most two of them cast shadows)
    if (this.baked) cfg = { ...cfg, lights: Math.min(cfg.lights, BAKED_POOL), shadow: { ...cfg.shadow, casters: Math.min(cfg.shadow.casters, BAKED_SHADOWS) } };
    // (LR16t) the torch shadow atlas shadows every torch: no Babylon shadow map (2 samplers less in every lit shader)
    // (lr16pol E, lr16t check A 6) baked lamps on a map with no torch slot (a bright map: every light is baked, nothing
    // moves): no shadow map either - the torch atlas is off there (`TorchShadows`), and no spot sampler takes its place
    if (this.tsOn || (this.baked && !registryHasTorch(this.reg))) cfg = { ...cfg, shadow: { ...cfg.shadow, casters: 0 } };
    // (every shadowed spot is a texture unit in every lit shader, used or idle: the largest one sets the pool)
    if (cfg.micro) cfg = { ...cfg, shadow: { ...cfg.shadow, casters: Math.min(cfg.shadow.casters, MICRO_SHADOWS) } };
    const same = !force && cfg.minimal === this.cfg.minimal && cfg.lights === this.cfg.lights && cfg.shadow.casters === this.cfg.shadow.casters && cfg.shadow.size === this.cfg.shadow.size && cfg.shadow.soft === this.cfg.shadow.soft;
    this.cfg = cfg;
    if (!this.bulbs || (same && this.pool.length + this.shadowPool.length > 0)) return;
    this.disposePools();
    const scene = this.scene;
    const make = (name: string): SpotLight => {
      const s = new SpotLight(name, new Vector3(0, -50, 0), new Vector3(0, -1, 0), LAMP_CONE, 1, scene);
      s.intensity = 0;
      s.specular = Color3.Black();
      return s;
    };
    for (let i = 0; i < cfg.shadow.casters; i++) {
      const l = make(`maplight-shadow-${i}`);
      l.shadowMinZ = 0.15;
      l.shadowMaxZ = 30;
      const sg = new ShadowGenerator(cfg.shadow.size, l);
      // (PCF on every preset: contact hardening takes a second texture per light, past WebGL's 16 per shader)
      sg.usePercentageCloserFiltering = true;
      sg.filteringQuality = ShadowGenerator.QUALITY_HIGH;
      sg.bias = 0.0006;
      sg.normalBias = 0.012;
      sg.darkness = 0;
      sg.transparencyShadow = false;
      const list: AbstractMesh[] = [];
      const sm = sg.getShadowMap();
      if (sm) sm.renderList = list;
      this.shadowPool.push({ light: l, sg, id: -1, list });
    }
    // clustered lighting when the GPU has it, else a short plain pool
    const probe = make('maplight-probe');
    const clustered = !cfg.minimal && ClusteredLightContainer.IsLightSupported(probe);
    probe.dispose();
    const n = clustered ? cfg.lights : Math.min(cfg.lights, cfg.minimal ? 4 : PLAIN_LIGHTS);
    const lights: SpotLight[] = [];
    for (let i = 0; i < n; i++) {
      const l = make(`maplight-${i}`);
      lights.push(l);
      this.pool.push({ light: l, sg: null, id: -1, list: [] });
    }
    if (clustered && lights.length) this.cluster = new ClusteredLightContainer('maplights', lights, scene);
    for (const m of scene.materials) this.fitMaterial(m);
    this.matObs?.remove();
    const obs = scene.onNewMaterialAddedObservable.add((m) => this.fitMaterial(m));
    this.matObs = { remove: () => scene.onNewMaterialAddedObservable.remove(obs) };
    this.pickT = 0;
  }

  /** Per render frame: re-pick the nearest lights to the camera a few times a second, and on any change. */
  update(dt: number, cx: number, cy: number, cz: number): void {
    if (!this.bulbs) return;
    // (LR16-5b) the swinging pendants' fittings and hangers follow their light on the frames it moves
    if (this.swayV !== this.reg.swayVersion) this.drawSway();
    this.pickT -= dt;
    const changed = this.version !== this.reg.version;
    // (LR16-5) a flickering lamp's fitting follows its light on the frames it moves (no re-pick); (lr16pol E) only the
    // flickering lamps' texels are written - a `version` move below repaints every bulb
    if (this.flickV !== this.reg.flickerVersion) {
      this.flickV = this.reg.flickerVersion;
      if (!changed) this.paintFlicker();
    }
    if (!changed && this.pickT > 0) {
      // moving lights follow every frame between picks
      this.follow(this.pool);
      this.follow(this.shadowPool);
      if (this.castersDirty) this.refillCasters();
      this.followTorches();
      return;
    }
    this.castersDirty = false;
    this.pickT = PICK_INTERVAL;
    if (changed) {
      this.version = this.reg.version;
      this.paintBulbs();
    }
    const total = this.pool.length + this.shadowPool.length;
    const ids = this.ids;
    const n = nearestLights(this.reg, cx, cy, cz, ids, this.dist);
    // (baked lamps fill the nearest list but are skipped: look through all of it for the flashlights)
    const use = Math.min(n, this.baked ? ids.length : total, ids.length);
    // shadow maps first to flashlights (the drama), then the nearest lamps; everything else is clustered
    let sh = 0;
    const taken = this.dist; // (reused as a flag array: 1 = placed)
    for (let i = 0; i < use; i++) taken[i] = 0;
    // (shadow audit, `torchShadowPass`: the flashlights whose beam a wall cuts come first)
    for (let pass = 0; pass < 3 && sh < this.shadowPool.length; pass++) {
      for (let i = 0; i < use && sh < this.shadowPool.length; i++) {
        if (taken[i]) continue;
        const l = this.reg.lights[ids[i]!]!;
        if (torchShadowPass(l) > pass) continue;
        if (this.baked?.has(l.id)) continue;
        this.put(this.shadowPool[sh++]!, l);
        taken[i] = 1;
      }
    }
    for (let i = sh; i < this.shadowPool.length; i++) this.idle(this.shadowPool[i]!);
    // (LR15) the flashlights left without a shadow map: drawn by the baked lamps (`writeTorchDraw`), not the pool
    const tb = this.torchBuf;
    if (tb) {
      // (LR16t) a torch still drawn keeps its slot (its shadow atlas tile stays valid); the rest fill the free slots,
      // nearest first. Allocation-free: `torchKeep` marks the kept slots.
      const keep = this.torchKeep;
      keep.fill(0);
      for (let i = 0; i < use; i++) {
        if (taken[i]) continue;
        const l = this.reg.lights[ids[i]!]!;
        if (l.kind !== 'flashlight' || this.baked?.has(l.id)) continue;
        for (let k = 0; k < TORCH_DRAW_SLOTS; k++) {
          if (this.torchIds[k] !== l.id) continue;
          keep[k] = 1;
          taken[i] = 1;
          writeTorchDraw(tb, k, l);
          break;
        }
      }
      for (let k = 0; k < TORCH_DRAW_SLOTS; k++) if (!keep[k]) this.torchIds[k] = -1;
      let tk = 0;
      for (let i = 0; i < use; i++) {
        if (taken[i]) continue;
        const l = this.reg.lights[ids[i]!]!;
        if (l.kind !== 'flashlight' || this.baked?.has(l.id)) continue;
        while (tk < TORCH_DRAW_SLOTS && keep[tk]) tk++;
        if (tk >= TORCH_DRAW_SLOTS) break;
        this.torchIds[tk] = l.id;
        keep[tk] = 1;
        writeTorchDraw(tb, tk++, l);
        taken[i] = 1;
      }
      for (let k = 0; k < TORCH_DRAW_SLOTS; k++) {
        if (keep[k]) continue;
        writeTorchDraw(tb, k, null);
      }
    }
    let k = 0;
    const lit = Math.max(1, Math.ceil(this.pool.length * this.litScale));
    for (let i = 0; i < use && k < lit; i++) {
      if (taken[i] || this.baked?.has(ids[i]!)) continue;
      const l = this.reg.lights[ids[i]!]!;
      // (LR16t) with the torch atlas no flashlight is a Babylon light (one torch formula, no hard cone)
      if (this.tsOn && l.kind === 'flashlight') continue;
      this.put(this.pool[k++]!, l);
    }
    for (let i = k; i < this.pool.length; i++) this.idle(this.pool[i]!);
  }

  /** (G8 cull) The placed shadow maps' lists again (a caster's enabled state changed since the pick). No allocation
   *  unless a list changes. */
  private refillCasters(): void {
    this.castersDirty = false;
    for (let i = 0; i < this.shadowPool.length; i++) {
      const s = this.shadowPool[i]!;
      if (s.id >= 0 && s.sg) this.fillCasters(s, this.reg.lights[s.id]!);
    }
  }

  /** (LR15) The drawn torches follow their guards every frame (and their beam's reach). Allocation-free. */
  private followTorches(): void {
    const tb = this.torchBuf;
    if (!tb) return;
    for (let k = 0; k < TORCH_DRAW_SLOTS; k++) {
      const id = this.torchIds[k]!;
      if (id >= 0) writeTorchDraw(tb, k, this.reg.lights[id]!);
    }
  }

  private follow(pool: Slot[]): void {
    for (let i = 0; i < pool.length; i++) {
      const s = pool[i]!;
      if (s.id < 0) continue;
      const l = this.reg.lights[s.id]!;
      if (l.kind === 'flashlight') this.place(s, l);
      // (LR16-5) a pooled fire / failing tube follows its live flicker between picks (as `place`)
      else s.light.intensity = l.intensity * l.flicker * LIGHT_GAIN;
    }
  }

  private put(s: Slot, l: LightDef): void {
    s.id = l.id;
    this.place(s, l);
    if (s.sg) {
      s.light.shadowMaxZ = Math.max(4, l.reach ?? l.radius);
      this.fillCasters(s, l);
      // (shadows stay enabled - toggling recompiles every material - an idle map just stops refreshing)
      const sm = s.sg.getShadowMap();
      if (sm) sm.refreshRate = this.shadowEvery;
    }
  }

  /** The frame governor (3.1): fewer lights lit (no recompiles: the rest of the pool goes idle), shadows refreshed less. */
  setAdaptive(litScale: number, shadowEvery: number): void {
    if (litScale === this.litScale && shadowEvery === this.shadowEvery) return;
    this.litScale = litScale;
    this.shadowEvery = shadowEvery;
    for (const s of this.shadowPool) {
      const sm = s.id >= 0 ? s.sg?.getShadowMap() : null;
      if (sm) sm.refreshRate = shadowEvery;
    }
    this.pickT = 0;
  }

  /**
   * Shadow maps draw every caster in their list (no culling): keep only what this light can reach - its sphere
   * (+ a margin for moving characters) against each caster's world bounds. Disabled meshes are left out (G8 cull: a
   * guard figure's other LODs and the merged body it replaced draw nothing, and their world boxes are stale), so a
   * guard is one mesh in each list. Allocation-free.
   */
  private fillCasters(s: Slot, l: LightDef): void {
    // (built in a scratch array; the shadow map's list - an observed array - only changes when the set does)
    const tmp = this.tmpList;
    tmp.length = 0;
    const r = (l.reach ?? l.radius) + 1.5;
    const cs = this.casters;
    // (gm-mc-polish L1) flag off: disabled meshes stay listed (the RTT skips them while disabled), as before G8, so a
    // guard thawed between picks casts at once
    const cull = flags.guardModels;
    for (let i = 0; i < cs.length; i++) {
      const m = cs[i]!;
      if (cull && !m.isEnabled()) continue;
      // (small things - pickups, switches, mags - are not worth a draw per shadow map)
      if (m.getBoundingInfo().boundingSphere.radiusWorld < 0.3) continue;
      const b = m.getBoundingInfo().boundingBox;
      const mn = b.minimumWorld;
      const mx = b.maximumWorld;
      const dx = Math.max(mn.x - l.x, 0, l.x - mx.x);
      const dy = Math.max(mn.y - l.y, 0, l.y - mx.y);
      const dz = Math.max(mn.z - l.z, 0, l.z - mx.z);
      if (dx * dx + dy * dy + dz * dz <= r * r) tmp.push(m);
    }
    const list = s.list;
    let same = list.length === tmp.length;
    for (let i = 0; same && i < tmp.length; i++) same = list[i] === tmp[i];
    if (same) return;
    s.list = tmp.slice();
    const sm = s.sg?.getShadowMap();
    if (sm) sm.renderList = s.list;
  }
  private tmpList: AbstractMesh[] = [];

  private idle(s: Slot): void {
    s.id = -1;
    s.light.intensity = 0;
    s.light.position.set(0, -50, 0);
    const sm = s.sg?.getShadowMap();
    if (sm) sm.refreshRate = 0;
  }

  private place(s: Slot, l: LightDef): void {
    const sp = s.light;
    // (LR16-5b: + a swinging pendant's offset, 0 for every other light)
    sp.position.set(l.x + l.swx, l.y + l.swy, l.z + l.swz);
    // (3.6: a shadowed light draws its whole radius - its shadow map stops it at the wall, and the falloff stays the
    // light field's; an unshadowed one still ends at the first wall, `reach`)
    sp.range = s.sg ? l.radius : (l.reach ?? l.radius);
    sp.intensity = l.intensity * l.flicker * LIGHT_GAIN;
    sp.diffuse.set(l.color[0], l.color[1], l.color[2]);
    if (l.cone) {
      sp.direction.set(l.cone.dx, l.cone.dy, l.cone.dz);
      // (the cut at the meter's cos outer, cos^SPOT_EXP; the lamp plugin swaps Babylon's hard cut for the meter's
      // feathered `nsLampCone`: `bakedLamps.SPOT_FALLOFF_GLSL`, LR16 fix)
      sp.angle = Math.acos(l.cone.cosOuter) * 2;
      sp.exponent = SPOT_EXP;
    } else {
      sp.direction.set(0, -1, 0);
      sp.angle = s.sg ? SHADOW_LAMP_CONE : LAMP_CONE;
      sp.exponent = LAMP_EXP;
    }
  }

  /** Lights placed now (tests / debug). */
  get placed(): number {
    let n = 0;
    for (const s of this.pool) if (s.id >= 0) n++;
    for (const s of this.shadowPool) if (s.id >= 0) n++;
    return n;
  }

  get shadowed(): number {
    let n = 0;
    for (const s of this.shadowPool) if (s.id >= 0) n++;
    return n;
  }

  get clustered(): boolean {
    return this.cluster !== null;
  }

  private disposePools(): void {
    for (const s of this.shadowPool) {
      s.sg?.dispose();
      s.light.dispose();
    }
    this.cluster?.dispose(false);
    for (const s of this.pool) s.light.dispose();
    this.cluster = null;
    this.pool.length = 0;
    this.shadowPool.length = 0;
  }

  /** Night vision's blend 0..1 (Step 4b fix): the fixtures brighten with the goggles' gain. */
  private vision = 0;
  setVisionBoost(k: number): void {
    if (Math.abs(k - this.vision) < 0.01 && !(k === 0 && this.vision !== 0) && !(k === 1 && this.vision !== 1)) return;
    this.vision = k;
    this.paintBulbs();
  }

  /** (lr16pol E) Light `i`'s colour texel in `bulbColors`: off / shot out 0.08, else x night vision's gain x (LR16-5) the
   *  live flicker, so a stuttering tube's fitting goes dark with its light. */
  private bulbTexel(c: Float32Array, i: number): void {
    const l = this.reg.lights[i]!;
    const k = l.on && !l.destroyed ? Math.max(0.08, (1 + (NV_BULB - 1) * this.vision) * l.flicker) : 0.08;
    c[i * 4] = l.color[0] * k;
    c[i * 4 + 1] = l.color[1] * k;
    c[i * 4 + 2] = l.color[2] * k;
    c[i * 4 + 3] = 1;
  }

  /** (lr16pol E) `flickering.length` at the last paint: a light leaving the list (`setFlicker` NONE, load time) is back
   *  at 1 but no longer listed, so a length change repaints every bulb. */
  private flickLen = -1;

  /**
   * (lr16pol E, lr16-5 A5) A `flickerVersion`-only move: the flickering lamps' texels only (`LightRegistry.flickering`,
   * as `BakedLamps.writeFlicker`), copied to their fitting / pendant instance; only the meshes holding one re-upload.
   * Indexed loops, no allocation. Every other change (`version`, night vision) takes `paintBulbs`.
   */
  private paintFlicker(): void {
    const c = this.bulbColors;
    if (!c || !this.bulbs) return;
    const ids = this.reg.flickering;
    if (ids.length !== this.flickLen) {
      this.paintBulbs();
      return;
    }
    const fd = this.fitDirty;
    fd.fill(0);
    let draw = 0;
    let sway = false;
    const sc = this.swayColors;
    for (let k = 0; k < ids.length; k++) {
      const i = ids[k]!;
      if (i >= this.bulbCount) continue;
      this.bulbTexel(c, i);
      draw |= this.drawBits[i]!;
      const f = this.fitOf[i]!;
      if (f >= 0) {
        const fc = this.fittings[f]!.colors;
        const o = this.fitK[i]! * 4;
        fc[o] = c[i * 4]!;
        fc[o + 1] = c[i * 4 + 1]!;
        fc[o + 2] = c[i * 4 + 2]!;
        fc[o + 3] = 1;
        fd[f] = 1;
      }
      const s = this.swayOf[i]!;
      if (s >= 0 && sc) {
        sc[s * 4] = c[i * 4]!;
        sc[s * 4 + 1] = c[i * 4 + 1]!;
        sc[s * 4 + 2] = c[i * 4 + 2]!;
        sc[s * 4 + 3] = 1;
        sway = true;
      }
    }
    if (draw & DRAW_BULB) this.bulbs.thinInstanceBufferUpdated('color');
    if (draw & DRAW_BOX) this.fixtures?.thinInstanceBufferUpdated('color');
    const fs = this.fittings;
    for (let f = 0; f < fs.length; f++) if (fd[f]) fs[f]!.face.thinInstanceBufferUpdated('color');
    if (sway) this.swayBodies?.thinInstanceBufferUpdated('color');
  }

  private paintBulbs(): void {
    const c = this.bulbColors;
    if (!c || !this.bulbs) return;
    this.flickLen = this.reg.flickering.length;
    for (let i = 0; i < this.bulbCount; i++) this.bulbTexel(c, i);
    this.bulbs.thinInstanceBufferUpdated('color');
    this.fixtures?.thinInstanceBufferUpdated('color');
    const fs = this.fittings;
    for (let f = 0; f < fs.length; f++) {
      const fd = fs[f]!;
      const fc = fd.colors;
      for (let k = 0; k < fd.ids.length; k++) {
        const i = fd.ids[k]!;
        fc[k * 4] = c[i * 4]!;
        fc[k * 4 + 1] = c[i * 4 + 1]!;
        fc[k * 4 + 2] = c[i * 4 + 2]!;
        fc[k * 4 + 3] = 1;
      }
      fd.face.thinInstanceBufferUpdated('color');
    }
    // (LR16-5b) the swinging pendants' fittings: dark with their light, as the static ones
    const sc = this.swayColors;
    const sw = this.reg.sway;
    if (sc && sw && this.swayBodies) {
      for (let k = 0; k < sw.n; k++) {
        const i = sw.ids[k]!;
        sc[k * 4] = c[i * 4]!;
        sc[k * 4 + 1] = c[i * 4 + 1]!;
        sc[k * 4 + 2] = c[i * 4 + 2]!;
        sc[k * 4 + 3] = 1;
      }
      this.swayBodies.thinInstanceBufferUpdated('color');
    }
  }

  dispose(): void {
    this.matObs?.remove();
    this.disposePools();
    this.bulbs?.material?.dispose();
    this.bulbs?.dispose();
    this.fixtures?.dispose();
    for (const fd of this.fittings) {
      fd.body.dispose();
      fd.face.dispose();
    }
    this.fittings = [];
    this.links?.dispose();
    this.links = null;
    this.swayBodies?.dispose();
    this.swayBodies = null;
    this.swayLinks?.dispose();
    this.swayLinks = null;
    this.bodyMat?.dispose();
    this.bodyMat = null;
    this.bulbs = null;
  }
}
