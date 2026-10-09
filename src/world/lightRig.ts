import { ClusteredLightContainer, Color3, CreateBox, CreateCylinder, CreateSphere, Matrix, Quaternion, ShadowGenerator, SpotLight, StandardMaterial, Vector3, VertexBuffer, type AbstractMesh, type Material, type Mesh, type Scene } from '../core/babylon';
import { LAMP_CONE as LAMP_CONE_MATH, LIGHT_GAIN } from './lampMath';
import type { ShadowSpec } from '../core/quality';
import { nearestLights, type LightDef, type LightRegistry } from './lights';

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
/** 3.6 the phone light look with baked lamps: plain pool lights for the flashlights only. */
const BAKED_PLAIN_POOL = 2;
/** Sun + hemisphere already light every material. */
const BASE_LIGHTS = 2;
/** Omni lamps render as a spot pointing down with this cone (rad): everything below the lamp is lit, and one
 *  light type keeps the per-pixel light loop short. */
/** (= `lampMath.LAMP_CONE`.) */
const LAMP_CONE = LAMP_CONE_MATH;
/** Visible light cones (cheap additive meshes): a lamp's shade half-angle (rad), the longest cone (m) and how
 *  bright the haze is. */
const CONE_HALF = 0.5;
const CONE_LEN = 3.6;
const CONE_GLOW = 0.075;
/** (Step 4b fix) night vision's gain on the fixtures and the cones' haze at full goggles (rendering only): a lamp is the
 *  brightest thing in the tube and its beam reads as a shaft. */
const NV_BULB = 2.5;
const NV_CONE = 4;

/** What the rig is asked to render (from the graphics settings). */
export interface LightRigConfig {
  /** Real lights (clustered; a plain-light fallback caps lower). */
  lights: number;
  shadow: ShadowSpec;
  /** Volumetric lighting on: the additive cone meshes step aside. */
  volumetric: boolean;
  /** Tests (`?gfx=min`): a short plain pool, no clustering. */
  minimal?: boolean;
  /** 3.4 phones' light look: plain per-pixel lights (no clustering: a few lights, no light texture per pixel). */
  plain?: boolean;
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
 * light also gets a faint additive cone (one thin-instanced mesh, vertex alpha fading to the floor) so lamps read
 * as volumes of light in the dark; it goes out with the light. A level without lights creates nothing.
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
  private cfg: LightRigConfig = { lights: 8, shadow: { sun: false, cascades: 0, sunSize: 0, casters: 0, size: 0, soft: false }, volumetric: false };
  private matObs: { remove(): void } | null = null;
  private readonly scene: Scene;
  private bulbs: Mesh | null = null;
  private fixtures: Mesh | null = null;
  private cones: Mesh | null = null;
  private coneColors: Float32Array | null = null;
  private bulbColors: Float32Array | null = null;
  private ids = new Int32Array(MAX_REAL_LIGHTS + 16);
  private dist = new Float32Array(MAX_REAL_LIGHTS + 16);
  private pickT = 0;
  private version = -1;
  /** 3.1 frame governor: the share of the light pool lit, shadow maps re-rendered every N frames. */
  private litScale = 1;
  private shadowEvery = 1;
  /** 3.2: lights drawn by `BakedLamps` (every fixed one): the pools only take the rest (flashlights). */
  private baked: Set<number> | null = null;
  setBaked(ids: Set<number>): void {
    this.baked = ids;
    this.pickT = 0;
  }

  /** Real lights in use (clustered + shadowed). */
  get active(): number {
    return this.pool.length + this.shadowPool.length;
  }
  private bulbCount = 0;

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
    mat.freeze();
    mesh.material = mat;
    mesh.isPickable = false;
    const mtx = new Float32Array(n * 16);
    const fmtx = new Float32Array(n * 16);
    const m = new Matrix();
    let fixtures = 0;
    for (let i = 0; i < n; i++) {
      const l = reg.lights[i]!;
      // moving lights (enemy flashlights) have no fixed bulb
      if (l.kind === 'flashlight') continue;
      const f = l.fixture;
      if (f) {
        // a fixture box instead of a bulb (it goes dark with the light)
        Matrix.ComposeToRef(new Vector3(f.sx, f.sy, f.sz), Quaternion.Identity(), new Vector3(l.x, l.y + f.oy, l.z), m);
        m.copyToArray(fmtx, i * 16);
        fixtures++;
        continue;
      }
      Matrix.TranslationToRef(l.x, l.y, l.z, m);
      m.copyToArray(mtx, i * 16);
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
    this.buildCones(scene);
  }

  /** One cone per fixed light: from the light along its direction (lamps straight down), fading out. */
  private buildCones(scene: Scene): void {
    const n = this.reg.lights.length;
    const cone = CreateCylinder('lightCones', { height: 1, diameterTop: 0.3, diameterBottom: 2, tessellation: 18, cap: 0 }, scene);
    // apex at the origin, opening along -Y; alpha from 1 at the light to 0 at the far end
    cone.bakeTransformIntoVertices(Matrix.Translation(0, -0.5, 0));
    const pos = cone.getVerticesData(VertexBuffer.PositionKind)!;
    const cols = new Float32Array((pos.length / 3) * 4);
    for (let i = 0; i < pos.length / 3; i++) {
      const a = Math.pow(Math.max(0, 1 + pos[i * 3 + 1]!), 1.6);
      cols.set([1, 1, 1, a], i * 4);
    }
    cone.setVerticesData(VertexBuffer.ColorKind, cols);
    cone.hasVertexAlpha = true;
    const mat = new StandardMaterial('lightConeMat', scene);
    mat.disableLighting = true;
    mat.diffuseColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.emissiveColor = Color3.White();
    mat.alphaMode = 1; // ALPHA_ADD
    mat.disableDepthWrite = true;
    mat.backFaceCulling = false;
    mat.freeze();
    cone.material = mat;
    cone.isPickable = false;
    const mtx = new Float32Array(n * 16);
    const m = new Matrix();
    const q = new Quaternion();
    const down = new Vector3(0, -1, 0);
    const dir = new Vector3();
    for (let i = 0; i < n; i++) {
      const l = this.reg.lights[i]!;
      if (l.kind === 'flashlight') {
        Matrix.ScalingToRef(0, 0, 0, m);
        m.copyToArray(mtx, i * 16);
        continue;
      }
      const half = l.cone ? Math.min(0.7, Math.acos(l.cone.cosOuter)) : CONE_HALF;
      if (l.cone) dir.set(l.cone.dx, l.cone.dy, l.cone.dz).normalize();
      else dir.copyFrom(down);
      const len = Math.max(0.8, Math.min(CONE_LEN, l.radius * 0.6, dir.y < -0.5 ? l.y - 0.05 : CONE_LEN));
      const r = len * Math.tan(half);
      Quaternion.FromUnitVectorsToRef(down, dir, q);
      Matrix.ComposeToRef(new Vector3(r, len, r), q, new Vector3(l.x, l.y, l.z), m);
      m.copyToArray(mtx, i * 16);
    }
    this.coneColors = new Float32Array(n * 4);
    cone.thinInstanceSetBuffer('matrix', mtx, 16, true);
    cone.thinInstanceSetBuffer('color', this.coneColors, 4, false);
    cone.thinInstanceRefreshBoundingInfo(false);
    cone.freezeWorldMatrix();
    this.cones = cone;
  }

  /** Lights the materials must take: sky + sun, the cluster (or the plain pool) and the shadow pool. */
  private get materialLights(): number {
    return BASE_LIGHTS + (this.cluster ? 1 : this.pool.length) + this.shadowPool.length + 1;
  }

  private fitMaterial(m: Material): void {
    const lit = m as Material & { maxSimultaneousLights?: number; disableLighting?: boolean };
    if (typeof lit.maxSimultaneousLights !== 'number' || lit.disableLighting) return;
    const want = this.materialLights;
    if (lit.maxSimultaneousLights >= want) return;
    const frozen = m.isFrozen;
    if (frozen) m.unfreeze();
    lit.maxSimultaneousLights = want;
    if (frozen) m.freeze();
  }

  /** No longer a caster (3.1: the voxels hand over to the shadow proxy below Epic). */
  removeCaster(m: AbstractMesh): void {
    if (!this.casterSet.delete(m)) return;
    const i = this.casters.indexOf(m);
    if (i >= 0) this.casters.splice(i, 1);
    this.pickT = 0;
    this.version = -1;
  }

  /** A mesh that casts shadows (level geometry, characters, props); deduplicated. */
  addCaster(m: AbstractMesh): void {
    if (this.casterSet.has(m)) return;
    this.casterSet.add(m);
    this.casters.push(m);
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
    // (baked lamps: the pools only hold the moving lights - flashlights - and at most two of them cast shadows)
    if (this.baked) cfg = { ...cfg, lights: Math.min(cfg.lights, cfg.plain ? BAKED_PLAIN_POOL : BAKED_POOL), shadow: { ...cfg.shadow, casters: Math.min(cfg.shadow.casters, BAKED_SHADOWS) } };
    const same = !force && cfg.minimal === this.cfg.minimal && cfg.plain === this.cfg.plain && cfg.lights === this.cfg.lights && cfg.shadow.casters === this.cfg.shadow.casters && cfg.shadow.size === this.cfg.shadow.size && cfg.shadow.soft === this.cfg.shadow.soft;
    this.cfg = cfg;
    if (this.cones) this.cones.isVisible = !cfg.volumetric;
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
    const clustered = !cfg.minimal && !cfg.plain && ClusteredLightContainer.IsLightSupported(probe);
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
    this.pickT -= dt;
    const changed = this.version !== this.reg.version;
    if (!changed && this.pickT > 0) {
      // moving lights follow every frame between picks
      this.follow(this.pool);
      this.follow(this.shadowPool);
      return;
    }
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
    for (let pass = 0; pass < 2 && sh < this.shadowPool.length; pass++) {
      for (let i = 0; i < use && sh < this.shadowPool.length; i++) {
        if (taken[i]) continue;
        const l = this.reg.lights[ids[i]!]!;
        if (pass === 0 && l.kind !== 'flashlight') continue;
        if (this.baked?.has(l.id)) continue;
        this.put(this.shadowPool[sh++]!, l);
        taken[i] = 1;
      }
    }
    for (let i = sh; i < this.shadowPool.length; i++) this.idle(this.shadowPool[i]!);
    let k = 0;
    const lit = Math.max(1, Math.ceil(this.pool.length * this.litScale));
    for (let i = 0; i < use && k < lit; i++) {
      if (taken[i] || this.baked?.has(ids[i]!)) continue;
      this.put(this.pool[k++]!, this.reg.lights[ids[i]!]!);
    }
    for (let i = k; i < this.pool.length; i++) this.idle(this.pool[i]!);
  }

  private follow(pool: Slot[]): void {
    for (let i = 0; i < pool.length; i++) {
      const s = pool[i]!;
      if (s.id < 0) continue;
      const l = this.reg.lights[s.id]!;
      if (l.kind === 'flashlight') this.place(s, l);
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
   * (+ a margin for moving characters) against each caster's world bounds. Allocation-free.
   */
  private fillCasters(s: Slot, l: LightDef): void {
    // (built in a scratch array; the shadow map's list - an observed array - only changes when the set does)
    const tmp = this.tmpList;
    tmp.length = 0;
    const r = (l.reach ?? l.radius) + 1.5;
    const cs = this.casters;
    for (let i = 0; i < cs.length; i++) {
      const m = cs[i]!;
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
    sp.position.set(l.x, l.y, l.z);
    // (3.6: a shadowed light draws its whole radius - its shadow map stops it at the wall, and the falloff stays the
    // light field's; an unshadowed one still ends at the first wall, `reach`)
    sp.range = s.sg ? l.radius : (l.reach ?? l.radius);
    sp.intensity = l.intensity * LIGHT_GAIN;
    sp.diffuse.set(l.color[0], l.color[1], l.color[2]);
    if (l.cone) {
      sp.direction.set(l.cone.dx, l.cone.dy, l.cone.dz);
      sp.angle = Math.acos(l.cone.cosOuter) * 2;
      sp.exponent = 2;
    } else {
      sp.direction.set(0, -1, 0);
      sp.angle = s.sg ? SHADOW_LAMP_CONE : LAMP_CONE;
      sp.exponent = 1;
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

  /** Night vision's blend 0..1 (Step 4b fix): the fixtures and cones brighten with the goggles' gain. */
  private vision = 0;
  setVisionBoost(k: number): void {
    if (Math.abs(k - this.vision) < 0.01 && !(k === 0 && this.vision !== 0) && !(k === 1 && this.vision !== 1)) return;
    this.vision = k;
    this.paintBulbs();
  }

  private paintBulbs(): void {
    const c = this.bulbColors;
    if (!c || !this.bulbs) return;
    const bulbNv = 1 + (NV_BULB - 1) * this.vision;
    const coneNv = 1 + (NV_CONE - 1) * this.vision;
    for (let i = 0; i < this.bulbCount; i++) {
      const l = this.reg.lights[i]!;
      const k = l.on && !l.destroyed ? bulbNv : 0.08;
      c[i * 4] = l.color[0] * k;
      c[i * 4 + 1] = l.color[1] * k;
      c[i * 4 + 2] = l.color[2] * k;
      c[i * 4 + 3] = 1;
      const cc = this.coneColors;
      if (cc) {
        const g = l.on && !l.destroyed && l.kind !== 'flashlight' ? CONE_GLOW * Math.min(1.5, l.intensity) * coneNv : 0;
        cc[i * 4] = l.color[0] * g;
        cc[i * 4 + 1] = l.color[1] * g;
        cc[i * 4 + 2] = l.color[2] * g;
        cc[i * 4 + 3] = 1;
      }
    }
    this.cones?.thinInstanceBufferUpdated('color');
    this.bulbs.thinInstanceBufferUpdated('color');
    this.fixtures?.thinInstanceBufferUpdated('color');
  }

  dispose(): void {
    this.matObs?.remove();
    this.disposePools();
    this.bulbs?.material?.dispose();
    this.bulbs?.dispose();
    this.fixtures?.dispose();
    this.cones?.material?.dispose();
    this.cones?.dispose();
    this.bulbs = null;
  }
}
