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
import { makeCone } from './lights';
import { TEXTURE_ANISO, TEXTURE_SIZE, type QualityLevel, type ShadowSpec, type TierQuality } from '../core/quality';
import { SurfaceAtlas } from './surfaceAtlas';
import { setAnimLodScale } from '../player/characterRig';
import { VoxelWorld } from '../voxel/voxelWorld';
import { VOXEL_VERSION } from '../voxel/levelVoxels';
import { packShapes } from '../voxel/shapes';

/** Flashlight slots on dark maps (enemies searching / investigating in the dark). */
export const FLASHLIGHTS = 4;

export interface WorldOptions {
  seed: number;
  /** Detail tier for the visual-only dressing pass (none for `?gfx=min`). */
  detail?: TierQuality;
  /** 3.0 voxels (null / absent: the blockout's boxes as before). */
  voxel?: VoxelOptions | null;
}

export interface VoxelOptions {
  /** Finest voxel edge (m). */
  size: number;
  /** Levels of detail (1..3). */
  levels: number;
  lodDist: [number, number];
  ao: boolean;
  micro: boolean;
}

/** Level-of-detail distances (m) per Detail tier: Epic keeps 5 cm voxels to 30 m. */
export const VOXEL_LOD: Record<TierQuality, [number, number]> = { high: [15, 30], ultra: [22, 45], epic: [30, 60] };

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
    atlas: SurfaceAtlas,
    /** The level's voxels (3.0; null: blockout boxes). */
    readonly voxels: VoxelWorld | null = null,
  ) {
    this.surfaces = atlas;
    const th = map.theme;
    scene.clearColor = Color4.FromHexString(th.horizon + 'ff');
    scene.fogMode = Scene.FOGMODE_LINEAR;
    scene.fogColor = Color3.FromHexString(th.horizon);
    scene.fogStart = th.fogStart;
    scene.fogEnd = th.fogEnd;
    this.hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, 0.1), scene);
    // (PBR: the hemisphere is not divided by pi, the materials' directIntensity = pi would triple it)
    this.hemi.intensity = th.ambient / Math.PI;
    this.hemi.groundColor = Color3.FromHexString(th.ground).scale(0.6);
    this.sun = new DirectionalLight('sun', new Vector3(...th.sunDir).normalize(), scene);
    this.sun.intensity = th.sunIntensity;
    this.sun.position = this.sun.direction.scale(-40);
    this.sky = makeSky(scene, th.sky, th.horizon);

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
    for (const m of level.meshes) this.lightRig.addCaster(m);
    for (const m of voxels?.meshes ?? []) this.lightRig.addCaster(m);
    this.props = new PropSystem(scene, this.parts, (m) => this.addShadowCaster(m));
    for (const p of layout.props) this.props.spawn(p.kind, p.pos, p.yaw ?? 0);
    // image-based light for the PBR surfaces: the level and sky seen from the middle, captured once
    const bd = level.bounds;
    const probe = new ReflectionProbe('envProbe', 128, scene, true, true);
    probe.position.set((bd.minX + bd.maxX) / 2, 2.2, (bd.minZ + bd.maxZ) / 2);
    probe.refreshRate = 0;
    for (const m of level.meshes) probe.renderList?.push(m);
    for (const m of voxels?.meshes ?? []) probe.renderList?.push(m);
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
    const atlas = new SurfaceAtlas(scene, 256, 4);
    const vo = opts.voxel ?? null;
    const level = b.build(scene, map.id, { atlas, floor: map.theme.floor ?? 'concrete', detail: opts.detail, voxelSize: vo?.size, art: map.art ?? null });
    let voxels: VoxelWorld | null = null;
    if (vo && level.voxels) {
      const lv = level.voxels;
      const key = `voxel:${map.id}:${opts.seed}:${vo.size}:${vo.levels}:v${VOXEL_VERSION}:${contentHash(packShapes(lv.shapes), lv.palette.map((p) => `${p.color}${p.kind}${p.emissive}`).join())}`;
      voxels = await VoxelWorld.build(scene, lv, { name: map.id, atlas, levels: vo.levels, lodDist: vo.lodDist, ao: vo.ao, micro: vo.micro, cacheKey: key });
    }
    return new World(scene, map, level, layout, atlas, voxels);
  }

  /** Characters, weapons and props cast shadows (one shared list for the sun and every lamp). */
  addShadowCaster(m: AbstractMesh): void {
    this.lightRig.addCaster(m);
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
      this.voxels?.refresh();
    }
    if (!q.minimal) this.voxels?.setLodDistances(...VOXEL_LOD[q.features.detail]);
    this.lightRig.configure({ lights: q.realLights, shadow: q.shadow, volumetric: q.features.volumetrics, minimal: q.minimal });
    const k = q.minimal ? 1 : q.detailScale;
    this.parts.setLodScale(k);
    setAnimLodScale(k);
    this.setSunShadows(q.shadow);
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
    if (sm) sm.renderList = this.lightRig.casters;
    this.shadow = csm;
  }

  /** Keep the sun's shadow frustum centred on the player. */
  frame(focus: Vector3, dt = 0): void {
    const cam = this.scene.activeCamera;
    if (cam) {
      this.lightRig.update(dt, cam.globalPosition.x, cam.globalPosition.y, cam.globalPosition.z);
      this.voxels?.frame(dt, cam.globalPosition.x, cam.globalPosition.y, cam.globalPosition.z);
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
