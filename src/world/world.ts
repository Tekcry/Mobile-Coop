import {
  ReflectionProbe,
  CascadedShadowGenerator,
  Color3,
  Color4,
  CreateSphere,
  DirectionalLight,
  HemisphericLight,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Vector3,
  VertexBuffer,
  type AbstractMesh,
  type Engine,
  type Mesh,
} from '../core/babylon';
import { enablePhysics } from '../physics/havok';
import { LevelBuilder, type BuiltLevel } from './levelBuilder';
import type { MapDef, MapLayout } from './mapDef';
import { PartLibrary } from './partLibrary';
import { PropSystem } from './props';
import { LightRig } from './lightRig';
import { Breakables } from './breakables';
import { Doors } from './doors';
import { makeCone, type LightRegistry } from './lights';
import { GI_STRIDE } from '../voxel/skyBake';
import { TEXTURE_ANISO, TEXTURE_SIZE, type QualityLevel, type ShadowSpec, type TierQuality } from '../core/quality';
import type { Adaptive } from '../core/governor';
import { SurfaceAtlas } from './surfaceAtlas';
import { setAnimLodScale } from '../player/characterRig';
import { VoxelWorld } from '../voxel/voxelWorld';
import { VOXEL_VERSION } from '../voxel/levelVoxels';
import { packShapes } from '../voxel/shapes';

/** Flashlight slots on dark maps (enemies searching / investigating in the dark). */
export const FLASHLIGHTS = 4;

export interface WorldOptions {
  seed: number;
  /** `?gfx=min` (tests): the 2.x standard materials (no PBR, no surface textures) - cheap under software GL. */
  cheap?: boolean;
  /** Detail tier for the visual-only dressing pass (none for `?gfx=min`). */
  detail?: TierQuality;
  /** 3.0 voxels (null / absent: the blockout's boxes as before). */
  voxel?: VoxelOptions | null;
}

export interface VoxelOptions {
  /** Finest voxel edge (m). */
  size: number;
  /** The fine layer's edge (props, furniture, machines, vehicles; 0: none). */
  fineSize: number;
  /** Levels of detail (1..3). */
  levels: number;
  lodDist: [number, number];
  ao: boolean;
  micro: boolean;
  /** One-bounce GI per light group (Epic). */
  gi?: boolean;
}

/** GI group slots the voxel material weighs (lamp circuits; more circuits share the last). */
export const GI_SLOTS = 12;

/** The map's fixed lights packed for the GI bake, and each light's group slot (-1: not baked). */
export function giLights(reg: LightRegistry): { lights: Float32Array; groups: number; slotOf: Int8Array } {
  const ids: number[] = [];
  const slotOf = new Int8Array(reg.lights.length).fill(-1);
  const baked = reg.lights.filter((l) => l.kind !== 'flashlight');
  for (const l of baked) if (!ids.includes(l.group)) ids.push(l.group);
  ids.sort((a, b) => a - b);
  const lights = new Float32Array(baked.length * GI_STRIDE);
  baked.forEach((l, i) => {
    const slot = Math.min(GI_SLOTS - 1, ids.indexOf(l.group));
    slotOf[reg.lights.indexOf(l)] = slot;
    lights.set([l.x, l.y, l.z, l.radius, l.cone?.dx ?? 0, l.cone?.dy ?? 0, l.cone?.dz ?? 0, l.cone ? l.cone.cosOuter : -2, l.color[0] * l.intensity, l.color[1] * l.intensity, l.color[2] * l.intensity, slot], i * GI_STRIDE);
  });
  return { lights, groups: Math.max(1, Math.min(GI_SLOTS, ids.length)), slotOf };
}

/** Level-of-detail distances (m) per Detail tier: Epic keeps 5 cm voxels to 30 m. */
export const VOXEL_LOD: Record<TierQuality, [number, number]> = { low: [8, 16], medium: [10, 20], high: [15, 30], ultra: [20, 40], epic: [30, 60] };

/** Scene + lighting + level geometry + props for one map. */
export class World {
  readonly parts: PartLibrary;
  readonly props: PropSystem;
  /** The sun / moon's shadows: cascaded over the view (null while shadows are off). */
  shadow: ShadowGenerator | CascadedShadowGenerator | null = null;
  private sunSpec = '';
  readonly sun: DirectionalLight;
  readonly hemi: HemisphericLight;
  readonly sky: Mesh;
  /** Map lights (bulbs + the capped real-light pool); idle on maps without lights. */
  readonly lightRig: LightRig;
  /** Window glass and duct grates (separate bodies that open). */
  readonly breakables: Breakables;
  /** Hinged doors (collision while closed, armed once the nav grid is built). */
  readonly doors: Doors;

  private constructor(
    readonly scene: Scene,
    readonly map: MapDef,
    readonly level: BuiltLevel,
    readonly layout: MapLayout,
    atlas: SurfaceAtlas | null,
    /** The level's voxels (3.0; null: blockout boxes): the structure layer, then the fine layer. */
    readonly voxels: VoxelWorld | null = null,
    readonly voxelsFine: VoxelWorld | null = null,
  ) {
    this.surfaces = atlas;
    const th = map.theme;
    scene.clearColor = Color4.FromHexString(th.horizon + 'ff');
    scene.fogMode = Scene.FOGMODE_LINEAR;
    scene.fogColor = Color3.FromHexString(th.horizon);
    scene.fogStart = th.fogStart;
    scene.fogEnd = th.fogEnd;
    this.hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, 0.1), scene);
    // (PBR: the hemisphere is not divided by pi, the materials' directIntensity = pi would triple it; the cheap
    // standard materials take it as authored)
    this.hemi.intensity = atlas ? th.ambient / Math.PI : th.ambient;
    this.hemi.groundColor = Color3.FromHexString(th.ground).scale(0.6);
    this.sun = new DirectionalLight('sun', new Vector3(...th.sunDir).normalize(), scene);
    this.sun.intensity = th.sunIntensity;
    this.sun.position = this.sun.direction.scale(-40);
    this.sky = makeSky(scene, th.sky, th.horizon);
    for (const v of atlas ? this.voxelLayers : []) {
      // the voxels take the hemisphere's fill themselves, scaled by how much sky each spot sees (dark under the roof;
      // the cheap standard path keeps the hemisphere)
      this.hemi.excludedMeshes.push(...v.meshes);
      const k = this.hemi.intensity * Math.PI;
      const sk = this.hemi.diffuse;
      const gr = this.hemi.groundColor;
      v.setFill([sk.r * k, sk.g * k, sk.b * k], [gr.r * k, gr.g * k, gr.b * k]);
    }

    this.parts = new PartLibrary(scene, atlas);
    // gameplay light level everywhere (moonlight / daylight)
    level.lights.ambient = th.lightLevel ?? 0.75;
    // dark maps: a few flashlight slots enemies switch on to search (moving cone lights, off until used)
    const reg = level.lights;
    if (reg.ambient < 0.5 || reg.zones.some((z) => z.ambient < 0.5)) {
      for (let i = 0; i < FLASHLIGHTS; i++) {
        reg.add({ kind: 'flashlight', x: 0, y: -50, z: 0, radius: 13, intensity: 0.85, color: [0.95, 0.96, 1], cone: makeCone(0, 0, 1, 0.34, 0.2), on: false, destructible: false, electric: false });
      }
    }
    this.lightRig = new LightRig(scene, level.lights);
    // the level itself casts shadows (walls stop lamp light and the sun)
    for (const m of level.meshes) this.addStatic(m);
    for (const v of this.voxelLayers) for (const m of v.meshes) this.addStatic(m);
    this.props = new PropSystem(scene, this.parts, (m) => this.addShadowCaster(m));
    for (const p of layout.props) this.props.spawn(p.kind, p.pos, p.yaw ?? 0);
    // image-based light for the PBR surfaces: the level and sky seen from the middle, captured once
    const bd = level.bounds;
    const probe = new ReflectionProbe('envProbe', 128, scene, true, true);
    probe.position.set((bd.minX + bd.maxX) / 2, 2.2, (bd.minZ + bd.maxZ) / 2);
    probe.refreshRate = 0;
    for (const m of level.meshes) probe.renderList?.push(m);
    for (const v of this.voxelLayers) for (const m of v.meshes) probe.renderList?.push(m);
    probe.renderList?.push(this.sky);
    // (assigned after the capture: a material sampling the cube while it renders into it is a feedback loop)
    probe.cubeTexture.onAfterRenderObservable.addOnce(() => {
      if (scene.isDisposed) return;
      scene.environmentTexture = probe.cubeTexture;
      // night maps: the captured room is mostly dark - keep its reflections faint
      scene.environmentIntensity = (th.lightLevel ?? 0.75) < 0.5 ? 0.25 : 0.7;
    });
    this.probe = probe;
    this.breakables = new Breakables(scene, level.anchors);
    this.doors = new Doors(scene, level.anchors);
  }

  static async create(engine: Engine, map: MapDef, opts: WorldOptions): Promise<World> {
    const scene = new Scene(engine);
    scene.skipPointerMovePicking = true;
    scene.autoClear = true;
    scene.autoClearDepthAndStencil = true;
    await enablePhysics(scene);
    const b = new LevelBuilder();
    const layout = map.build(b, opts.seed);
    // procedural surfaces: drawn small here, sized by the Textures setting in applyQuality
    const atlas = opts.cheap ? null : new SurfaceAtlas(scene, 256, 4);
    const vo = opts.voxel ?? null;
    const level = b.build(scene, map.id, { atlas: atlas ?? undefined, floor: map.theme.floor ?? 'concrete', detail: opts.detail, voxelSize: vo?.size, fineSize: vo?.fineSize ?? 0, art: map.art ?? null });
    let voxels: VoxelWorld | null = null;
    let fine: VoxelWorld | null = null;
    if (vo && level.voxels) {
      const lv = level.voxels;
      const key = (l: typeof lv): string => `voxel:${map.id}:${opts.seed}:${l.size}:${vo.levels}:v${VOXEL_VERSION}:${contentHash(packShapes(l.shapes), l.palette.map((p) => `${p.color}${p.kind}${p.emissive}`).join())}`;
      // GI (Epic): the lamps' bounce light per circuit, baked with the sky
      const gi = vo.gi && atlas && level.lights.lights.length ? giLights(level.lights) : null;
      const giKey = gi ? `:gi${contentHash(gi.lights, '')}` : '';
      voxels = await VoxelWorld.build(scene, lv, { name: map.id, atlas, levels: vo.levels, lodDist: vo.lodDist, ao: vo.ao, micro: vo.micro, cacheKey: key(lv) + giKey, gi, group: 2 });
      // the fine layer: half the size, levels of detail at half the distances, lit by the structure's sky bake
      if (lv.fine) fine = await VoxelWorld.build(scene, lv.fine, { name: `${map.id}-fine`, atlas, levels: vo.levels, lodDist: [vo.lodDist[0] / 2, vo.lodDist[1] / 2], ao: vo.ao, micro: vo.micro, cacheKey: key(lv.fine), bakeSky: false, skyFrom: voxels, group: 4 });
    }
    const w = new World(scene, map, level, layout, atlas, voxels, fine);
    if (voxels?.giGroups) w.giSlotOf = giLights(level.lights).slotOf;
    return w;
  }

  /** The voxel layers present (structure, fine). */
  get voxelLayers(): VoxelWorld[] {
    return [this.voxels, this.voxelsFine].filter((v): v is VoxelWorld => !!v);
  }

  /**
   * The moon's cascades (every cascade draws its whole list): moving casters, and static ones the moon can reach -
   * under a roof only the roof itself matters, so indoor props and walls stay out (the sky bake says where).
   */
  readonly sunCasters: AbstractMesh[] = [];

  /** Static level / voxel geometry: every lamp's list (filtered by reach), the moon's only where open to the sky. */
  private addStatic(m: AbstractMesh): void {
    this.lightRig.addCaster(m);
    const vx = this.voxels;
    if (vx?.sky) {
      m.computeWorldMatrix(true);
      const b = m.getBoundingInfo().boundingBox;
      const mn = b.minimumWorld;
      const mx = b.maximumWorld;
      let open = false;
      // the top's corners and centre: open sky above, or nothing higher in that column (a roof is its own top)
      for (let i = 0; i < 5 && !open; i++) {
        const x = i === 4 ? (mn.x + mx.x) / 2 : i & 1 ? mx.x - 0.05 : mn.x + 0.05;
        const z = i === 4 ? (mn.z + mx.z) / 2 : i & 2 ? mx.z - 0.05 : mn.z + 0.05;
        if (vx.roofAt(x, z) <= mx.y + 0.3 || vx.skyAt(x, mx.y + 0.3, z) > 0.05) open = true;
      }
      if (!open) return;
    }
    this.sunCasters.push(m);
  }

  /** Characters, weapons and props cast shadows (one shared list for the sun and every lamp). */
  addShadowCaster(m: AbstractMesh): void {
    this.lightRig.addCaster(m);
    if (!this.sunCasters.includes(m)) {
      this.sunCasters.push(m);
      m.onDisposeObservable.addOnce(() => {
        const i = this.sunCasters.indexOf(m);
        if (i >= 0) this.sunCasters.splice(i, 1);
      });
    }
    // (an instance takes its source mesh's setting)
    const src = (m as AbstractMesh & { sourceMesh?: AbstractMesh }).sourceMesh ?? m;
    src.receiveShadows = true;
  }

  private probe: ReflectionProbe | null = null;
  /** The level's procedural surface textures. */
  surfaces: SurfaceAtlas | null = null;

  /** Graphics settings: the light pools, lamp / flashlight shadows, the sun's cascades, the surface textures. */
  applyQuality(q: QualityLevel): void {
    if (this.surfaces?.setSize(q.minimal ? 256 : TEXTURE_SIZE[q.features.textures], q.minimal ? 4 : TEXTURE_ANISO[q.features.textures])) {
      // (the level material is frozen: re-bind the new atlas)
      const m = this.level.meshes[0]?.material;
      if (m) {
        m.unfreeze();
        m.markAsDirty(1);
        m.freeze();
      }
      for (const v of this.voxelLayers) v.refresh();
    }
    if (!q.minimal) {
      const [d1, d2] = VOXEL_LOD[q.features.detail];
      this.voxels?.setLodDistances(d1, d2);
      this.voxelsFine?.setLodDistances(d1 / 2, d2 / 2);
    }
    this.lightRig.configure({ lights: q.realLights, shadow: q.shadow, volumetric: q.features.volumetrics, minimal: q.minimal });
    const k = q.minimal ? 1 : q.detailScale;
    this.parts.setLodScale(k);
    setAnimLodScale(k);
    this.setSunShadows(q.shadow);
  }

  /** The frame governor's detail (3.1): run-time only, nothing recompiles. */
  applyAdaptive(a: Readonly<Adaptive>, q: QualityLevel): void {
    this.lightRig.setAdaptive(a.lights, a.shadowEvery);
    const sm = this.shadow?.getShadowMap();
    if (sm) sm.refreshRate = a.shadowEvery;
    if (!q.minimal) {
      const [d1, d2] = VOXEL_LOD[q.features.detail];
      this.voxels?.setLodDistances(d1 * a.voxelLod, d2 * a.voxelLod);
      this.voxelsFine?.setLodDistances((d1 / 2) * a.voxelLod, (d2 / 2) * a.voxelLod);
    }
    const k = (q.minimal ? 1 : q.detailScale) * a.partLod;
    this.parts.setLodScale(k);
    setAnimLodScale(k);
  }

  private setSunShadows(spec: ShadowSpec): void {
    const key = spec.sun ? `${spec.cascades}:${spec.sunSize}:${spec.soft}` : 'off';
    if (key === this.sunSpec) return;
    this.sunSpec = key;
    this.shadow?.dispose();
    this.shadow = null;
    if (!spec.sun) {
      this.sun.shadowEnabled = false;
      return;
    }
    this.sun.shadowEnabled = true;
    const csm = new CascadedShadowGenerator(spec.sunSize, this.sun);
    csm.numCascades = spec.cascades;
    csm.lambda = 0.75;
    csm.stabilizeCascades = true;
    csm.shadowMaxZ = 90;
    csm.cascadeBlendPercentage = 0.08;
    csm.usePercentageCloserFiltering = true;
    csm.filteringQuality = spec.soft ? ShadowGenerator.QUALITY_HIGH : ShadowGenerator.QUALITY_MEDIUM;
    csm.bias = 0.002;
    csm.normalBias = 0.02;
    csm.darkness = 0.35;
    csm.depthClamp = true;
    const sm = csm.getShadowMap();
    if (sm) sm.renderList = this.sunCasters;
    this.shadow = csm;
  }

  /** Keep the sun's shadow frustum centred on the player. */
  /** GI: each map light's group slot (null: no GI). */
  giSlotOf: Int8Array | null = null;
  private giVersion = -1;
  private readonly giOn = new Float32Array(GI_SLOTS);
  private readonly giAll = new Float32Array(GI_SLOTS);

  /** GI: how much of each circuit is lit now (switches, shot-out lamps, EMP) - the voxels weigh their slots by it. */
  private updateGi(): void {
    const reg = this.level.lights;
    const slots = this.giSlotOf;
    if (!slots || reg.version === this.giVersion) return;
    this.giVersion = reg.version;
    this.giOn.fill(0);
    this.giAll.fill(0);
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]!;
      if (s < 0) continue;
      const l = reg.lights[i]!;
      this.giAll[s] = this.giAll[s]! + l.intensity;
      if (l.on && !l.destroyed) this.giOn[s] = this.giOn[s]! + l.intensity;
    }
    for (const v of this.voxelLayers) {
      for (const p of v.plugins) for (let s = 0; s < GI_SLOTS; s++) p.giWeights[s] = this.giAll[s]! > 0 ? this.giOn[s]! / this.giAll[s]! : 0;
      v.refresh();
    }
  }

  frame(focus: Vector3, dt = 0): void {
    this.updateGi();
    const cam = this.scene.activeCamera;
    if (cam) {
      this.lightRig.update(dt, cam.globalPosition.x, cam.globalPosition.y, cam.globalPosition.z);
      for (const v of this.voxelLayers) v.frame(dt, cam.globalPosition.x, cam.globalPosition.y, cam.globalPosition.z);
    }
    this.sun.position.copyFrom(focus).subtractInPlace(this.sun.direction.scale(40));
  }

  dispose(): void {
    this.shadow?.dispose();
    this.surfaces?.dispose();
    this.probe?.dispose();
    this.lightRig.dispose();
    this.breakables.dispose();
    this.doors.dispose();
    this.props.dispose();
    this.level.dispose();
    this.voxelsFine?.dispose();
    this.voxels?.dispose();
    this.parts.dispose();
    this.scene.dispose();
  }
}

/** FNV-1a over the shapes' bytes and the palette (the voxel cache key). */
function contentHash(shapes: Float32Array, palette: string): string {
  let h = 2166136261;
  const b = new Uint8Array(shapes.buffer, shapes.byteOffset, shapes.byteLength);
  for (let i = 0; i < b.length; i++) h = Math.imul(h ^ b[i]!, 16777619);
  for (let i = 0; i < palette.length; i++) h = Math.imul(h ^ palette.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

function makeSky(scene: Scene, top: string, horizon: string): Mesh {
  const sky = CreateSphere('sky', { diameter: 400, segments: 8, sideOrientation: 1 }, scene);
  const pos = sky.getVerticesData(VertexBuffer.PositionKind)!;
  const cols: number[] = [];
  const t = Color3.FromHexString(top);
  const h = Color3.FromHexString(horizon);
  for (let i = 0; i < pos.length; i += 3) {
    const y = Math.max(0, pos[i + 1]! / 200);
    const k = Math.pow(y, 0.6);
    cols.push(h.r + (t.r - h.r) * k, h.g + (t.g - h.g) * k, h.b + (t.b - h.b) * k, 1);
  }
  sky.setVerticesData(VertexBuffer.ColorKind, cols);
  const m = new StandardMaterial('skyMat', scene);
  m.disableLighting = true;
  m.emissiveColor = Color3.White();
  m.diffuseColor = Color3.Black();
  m.specularColor = Color3.Black();
  m.fogEnabled = false;
  m.backFaceCulling = false;
  m.freeze();
  sky.material = m;
  sky.useVertexColors = true;
  sky.isPickable = false;
  sky.infiniteDistance = true;
  return sky;
}
