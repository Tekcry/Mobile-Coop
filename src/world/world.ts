import {
  ReflectionProbe,
  CascadedShadowGenerator,
  Color3,
  CreatePlane,
  PBRMaterial,
  Material,
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
import { dressingOn } from './detailPass';
import type { MapDef, MapLayout } from './mapDef';
import { PartLibrary } from './partLibrary';
import { PropSystem } from './props';
import { LightRig } from './lightRig';
import { CampusArtRender } from './campusArt/campusArtRender';
import { Breakables } from './breakables';
import { Doors } from './doors';
import { ShutterDoors, shutterLightLeaves, type ShutterNav } from './shutterDoor';
import { PlankBoards } from './plankBridge';
import { kitSpotsOf } from '../game/kit/kitApi';
import { Ropes } from './ropes';
import { addTorchSlots, torchShadowCount, torchSlotCount } from './torches';
import { buildMapLights } from './mapLights';
import { TEXTURE_ANISO, TEXTURE_SIZE, type QualityLevel, type ShadowSpec, type TierQuality } from '../core/quality';
import type { Adaptive } from '../core/governor';
import { SurfaceAtlas } from './surfaceAtlas';
import { setAnimLodScale } from '../player/characterRig';
import { WorkerPool } from '../voxel/workerPool';
import { SHAPE_STRIDE, shapeBounds } from '../voxel/shapes';
import { SKY_CELL, SKY_GRID, skyGridFor, skyShapes } from './levelFill';
import { flags } from '../core/flags';
import { BakedLamps } from './bakedLamps';
import { CharShadows } from './charShadows';
import { TorchShadows } from './torchShadows';
import { torchShadowSpec } from './torchShadowSet';
import { bakeLevelLight, lightBakeHash, type LightBake } from './lightBake';
import { LightField, type FieldDoor } from './lightField';
import { moonLight } from './lampMath';
import { LEVEL_TO_RENDER } from './darkCurve';
import { DEMO_LIGHTNING, FLASH_GAIN, Lightning } from './lightning';
import { roofAt, roofGrid, type RoofGrid } from './roofGrid';
import { KitRender } from './kit/kitRender';
import { PropRender } from './props/propRender';
import { SunCascadeLists, csmSplitLen, csmSplitZ, keepNearCamera, sunCasterDrawn, useCascadeLists } from './sunCascadeCull';

/** Flashlight slots on dark maps (enemies searching / investigating in the dark): `torches.ts`. */
export { FLASHLIGHTS } from './torches';

export interface WorldOptions {
  seed: number;
  /** `?gfx=min` (tests): the 2.x standard materials (no PBR, no surface textures) - cheap under software GL. */
  cheap?: boolean;
  /** Detail tier for the visual-only dressing pass (none for `?gfx=min`). */
  detail?: TierQuality;
}

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
  /** 3.2: the fixed lights, baked (null: real lights - the `?gfx=min` path, `?baked=0`, maps without lights). */
  lamps: BakedLamps | null = null;
  /** (LR14) Character silhouette shadow maps from the nearest baked lamps (null without baked lamps). Rendering only. */
  charShadows: CharShadows | null = null;
  /** (LR16t) Guard torch shadow maps, one atlas (null without baked lamps or drawn torches). Rendering only. */
  torchShadows: TorchShadows | null = null;
  /** (piano SO3) The map's guard torch slots (`MapDef.torchSlots`, `?torchSlots=N`: 4 / 8 / 12 / 16) and how many of
   *  them get a shadow map (`MapDef.torchShadows`, `?torchShadows=N`; the rest `beamCut`). Map data: both pages. */
  readonly torchSlots: number;
  readonly torchShadowed: number;
  /** (LR14) The character casters (players, guards, bodies, weapons and gear: `addShadowCaster` without props). */
  readonly charCasters: AbstractMesh[] = [];
  private readonly charSet = new Set<AbstractMesh>();
  /** 3.6: gameplay light (`LightField`): the canonical bake + the registry's state + closed doors. */
  readonly lightField: LightField;
  /** (piano SO5) The map's lightning (`MapDef.lightning`, or the `?lightning=1` demo loop); null without. `GameState`
   *  sets its level each sim step through `setFlash`. */
  readonly lightning: Lightning | null;
  /** (piano SO5) The sun / moon light's own intensity, and its intensity per gameplay level (the flash's share). */
  private readonly sunBase: number;
  private readonly sunPerLevel: number;
  /** Window glass and duct grates (separate bodies that open). */
  readonly breakables: Breakables;
  /** Hinged doors (collision while closed, armed once the nav grid is built). */
  readonly doors: Doors;
  /** (J9 S1) The roller shutters' curtains (`shutterDoor.ts`; null: the map places none). Armed with the doors
   *  (`armDoors`); the team controller moves them after the kit ticks. */
  readonly shutters: ShutterDoors | null;
  /** (coop-kit K5a) The Plank Bridge boards (`plankBridge.ts`; null: the map places no plank spot). Render only; the
   *  plank move's tick moves them from its kit devices. */
  readonly planks: PlankBoards | null;
  /**
   * (J9 S1, A16) The doors light tests (the gameplay field, the baked lamps on screen, the torch shadows): the door
   * leaves, then each shutter as an always-shut leaf. The same array as `doors.list` on a map without shutters.
   */
  readonly lightDoors: readonly FieldDoor[];
  /** (sector-redesign ART-KIT) The campus art (render only; null: no art, `?gfx=min`, or a failed load: the greybox shows). */
  campusArt: CampusArtRender | null = null;
  /** (marlow-final M5) The facility kit's meshes over the level (null: the map places none, `?gfx=min`, or the GLB
   *  failed to load - the greybox boxes under it then show). Render only. */
  kit: KitRender | null = null;
  /** (marlow-final M5) The props kit's meshes (null: the map places none, `?gfx=min`, or the GLB failed to load - the
   *  prop boxes under them then show). Render only: gameplay reads the boxes `props.write(b)` put in the level. */
  facilityProps: PropRender | null = null;
  private _ropes: Ropes | null = null;
  /** (3.2.0) Rappel ropes (the local player's and remotes'), created on first use. */
  get ropes(): Ropes {
    return (this._ropes ??= new Ropes(this.scene));
  }

  private constructor(
    readonly scene: Scene,
    readonly map: MapDef,
    readonly level: BuiltLevel,
    readonly layout: MapLayout,
    atlas: SurfaceAtlas | null,
    /** 3.6: the canonical light bake (lamp and moon visibility, ambient grid). */
    readonly lightBake: LightBake | null = null,
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

    this.parts = new PartLibrary(scene, atlas);
    // gameplay light level everywhere (moonlight / daylight)
    level.lights.ambient = th.lightLevel ?? 0.75;
    // dark maps: a few flashlight slots enemies switch on to search (moving cone lights, off until used); the co-op
    // client builds the same slots and mirrors them (`torches.ts`, coop-torches)
    this.torchSlots = torchSlotCount(flags.torchSlots ?? map.torchSlots);
    this.torchShadowed = torchShadowCount(flags.torchShadows ?? map.torchShadows, this.torchSlots);
    addTorchSlots(level.lights, this.torchSlots, this.torchShadowed);
    this.lightRig = new LightRig(scene, level.lights);
    // the level itself casts shadows (walls stop lamp light and the sun)
    for (const m of level.meshes) this.addStatic(m);
    this.props = new PropSystem(scene, this.parts, (m) => this.addShadowCaster(m, Infinity, false));
    for (const p of layout.props) this.props.spawn(p.kind, p.pos, p.yaw ?? 0);
    // image-based light for the PBR surfaces: the level and sky seen from the middle, captured once
    const bd = level.bounds;
    const probe = new ReflectionProbe('envProbe', 128, scene, true, true);
    probe.position.set((bd.minX + bd.maxX) / 2, 2.2, (bd.minZ + bd.maxZ) / 2);
    probe.refreshRate = 0;
    for (const m of level.meshes) probe.renderList?.push(m);
    probe.renderList?.push(this.sky);
    // (assigned after the capture: a material sampling the cube while it renders into it is a feedback loop)
    probe.cubeTexture.onAfterRenderObservable.addOnce(() => {
      if (scene.isDisposed) return;
      this.probeCaptured = true;
      scene.environmentTexture = probe.cubeTexture;
      // night maps: the captured room is mostly dark - keep its reflections faint
      scene.environmentIntensity = (th.lightLevel ?? 0.75) < 0.5 ? 0.25 : 0.7;
    });
    this.probe = probe;
    this.breakables = new Breakables(scene, level.anchors);
    this.doors = new Doors(scene, level.anchors);
    // (3.6: flashlights draw their whole radius and their shadow maps stop them - at closed doors too)
    if (this.doors.leafMesh) this.lightRig.addCaster(this.doors.leafMesh);
    // (J9 S1) the shutters' curtains (only where the map places one), shadow casters for the flashlights as the leaves
    const shutterLeaves = shutterLightLeaves(level);
    this.shutters = shutterLeaves.length ? new ShutterDoors(scene, level) : null;
    if (this.shutters?.curtainMesh) this.lightRig.addCaster(this.shutters.curtainMesh);
    // (coop-kit K5a) the plank spots' live boards (every spot, whatever the flags: inert on its stack while the id is off)
    this.planks = kitSpotsOf(level, 'plankBridge').length ? new PlankBoards(scene, level) : null;
    // (A16) a shut curtain stops lamp light as a closed door: one list for the field and the screen
    this.lightDoors = shutterLeaves.length ? [...this.doors.list, ...shutterLeaves] : this.doors.list;
    // 3.6: the one light function every gameplay light query goes through (closed doors cut lamps)
    this.lightField = new LightField(lightBake, level.lights, this.lightDoors);
    // (piano SO5) lightning: the map's strikes, or the dev demo loop; the sun / moon light carries its share on screen
    // at the map's own intensity per gameplay level (no moon: the curve's level-to-render gain)
    const lt = map.lightning ?? (flags.lightning ? DEMO_LIGHTNING : null);
    this.lightning = lt ? new Lightning(lt) : null;
    const mL = moonLight(th);
    this.sunBase = th.sunIntensity;
    this.sunPerLevel = mL > 0 ? th.sunIntensity / mL : LEVEL_TO_RENDER;
  }

  /**
   * (piano SO5) This sim step's lightning level (`Lightning.levelAt`): the light field (the meter, guard sight) and the
   * picture (the baked lamps' moon term, the sun / moon light's intensity) take the one value, so a lit window pool and
   * the meter agree. Allocation-free.
   */
  setFlash(level: number): void {
    const f = this.lightField;
    f.setFlash(level);
    const v = f.flashLevel;
    // (piano SO5b) the openings' flash lights: intensity x the flash (the field's level / FLASH_GAIN), the same value
    // for the field and the baked lamps' texels (`flickering`); a map without openings returns at once
    this.level.lights.setSkyFlash(v / FLASH_GAIN);
    if (this.lamps) this.lamps.skyFlash = v;
    this.sun.intensity = this.sunBase + v * this.sunPerLevel;
  }

  static async create(engine: Engine, mapIn: MapDef, opts: WorldOptions): Promise<World> {
    // `?fullbright=1` (hand checks): the same map under a day theme, with its own bake key. Nothing changes without it.
    const map: MapDef = flags.fullbright ? { ...mapIn, theme: { ...mapIn.theme, lightLevel: 0.95, ambient: 0.9, sunIntensity: 0.5 } } : mapIn;
    const bakeId = flags.fullbright ? `${map.id}:fullbright` : map.id;
    const scene = new Scene(engine);
    scene.skipPointerMovePicking = true;
    scene.autoClear = true;
    scene.autoClearDepthAndStencil = true;
    await enablePhysics(scene);
    const b = new LevelBuilder();
    // the map, its flicker, the lightning openings' flash lights and the sway pendants, in the one order the prebake
    // shares (`mapLights.ts`: its lamp key is always this one); before the build, so the hangers the sway claims (drawn
    // by the light rig, with the swing) never mesh
    const layout = buildMapLights(b, map, opts.seed);
    // procedural surfaces: drawn small here, sized by the Textures setting in applyQuality
    const atlas = opts.cheap ? null : new SurfaceAtlas(scene, 256, 4);
    const level = b.build(scene, map.id, { atlas: atlas ?? undefined, floor: map.theme.floor ?? 'concrete', detail: opts.detail, dressing: dressingOn(map) });
    // 3.6 the canonical light bake: the same on every device, preset and tier (the shapes come from the level's own
    // pieces, never from what a renderer draws); gameplay's light field and every renderer read it
    level.lights.ambient = map.theme.lightLevel ?? 0.75;
    // (rendering only) the smooth level's sky visibility: its fill and image-based light follow it
    // (`world/levelFill.ts`); a worker job beside the light bake
    const skyJob = atlas && flags.baked ? smoothSky(level.light).catch(() => null) : null;
    const bake = await bakeLevelLight({ mapId: bakeId, seed: opts.seed, shapes: level.light.shapes, shapesHash: level.light.hash, lo: level.light.lo, hi: level.light.hi, reg: level.lights, sunDir: map.theme.sunDir, moonLight: moonLight(map.theme) });
    const w = new World(scene, map, level, layout, atlas, bake);
    // (marlow-final M5) the facility kit: skins over the level's own boxes (gameplay reads the boxes), made before the
    // lamp bake's plugin attaches so its materials are lit as level
    if (layout.kit?.instances.length && atlas && !opts.cheap) {
      try {
        w.kit = await KitRender.create(scene, layout.kit, w.doors.list, level.lights, (m) => w.lightRig.addCaster(m));
      } catch (e) {
        console.warn('[kit] the facility kit failed to load; the greybox shows', e);
      }
    }
    // (marlow-final M5) the props kit: drawn over the boxes the map builder wrote for them (the kit's rules)
    if (layout.facilityProps?.length && atlas && !opts.cheap) {
      try {
        w.facilityProps = await PropRender.create(scene, layout.facilityProps, w.doors.list, level.lights);
      } catch (e) {
        console.warn('[props] the props kit failed to load; the greybox shows', e);
      }
    }
    // 3.2 baked lamps: drawn from the bake on every PBR path, so the picture
    // matches the light meter (smooth-world); not the cheap test path; `?baked=0` off
    if (bake.lamps && flags.baked && atlas && !opts.cheap) {
      // 3.6: the baked moon and closed doors (Michael, 2026-10-09). Step 4b: the
      // darkness curve reads the ambient grid everywhere, and it fills the surfaces (characters, props, and on
      // the smooth path the level's own boxes) in place of the hemisphere, which lit them as if under open sky indoors.
      const fill = { grid: bake.ambient, color: [w.hemi.diffuse.r, w.hemi.diffuse.g, w.hemi.diffuse.b] as [number, number, number] };
      // (smooth-world fix round 2) the smooth level's own fill (the hemisphere's colours x sky visibility)
      const sky = skyJob ? await skyJob : null;
      const gr = w.hemi.groundColor;
      const k = w.hemi.intensity * Math.PI;
      const sk = w.hemi.diffuse;
      const lvl = sky ? { sky: [sk.r * k, sk.g * k, sk.b * k] as [number, number, number], ground: [gr.r * k, gr.g * k, gr.b * k] as [number, number, number], vis: sky } : null;
      w.lamps = new BakedLamps(scene, level.lights, bake.lamps.baked, bake.lamps.r, bake.lo, bake.hi, null, { moon: bake.moon, doors: w.lightDoors, fill, bounce: w.lightField.bounce, moonLight: bake.moonLight, level: lvl, torchSlots: w.torchSlots, torchCut: w.torchShadowed < w.torchSlots });
      w.lamps.bakeMs = bake.ms;
      w.lamps.attachAll();
      w.lightRig.setBaked(w.lamps.ids);
      // (LR15, shadow-accuracy fixes on) the unshadowed flashlights drawn by the baked lamps
      w.lightRig.setTorchDraw(w.lamps.torchDraw);
      // (LR16t) every drawn torch shadowed from one atlas, its shut doors tested exactly (configured in `applyQuality`)
      if (w.lamps.torchDraw) {
        const charSet = w.charSet;
        w.torchShadows = new TorchShadows(scene, level.lights, w.lightRig, w.lamps.torchDraw, w.lightDoors, (m) => charSet.has(m));
        w.lamps.torchShadows = w.torchShadows;
      }
      w.charShadows = new CharShadows(scene, w.lamps, w.charCasters);
      w.lamps.charShadows = w.charShadows;
      // (LR16-3) open door leaves and props (a pushed or carried crate) cast into the lamps' character shadow maps
      w.charShadows.setDynamic(w.doors, w.props);
      w.useBakedMoon();
    }
    // (sector-redesign ART-KIT) the campus art over the greybox: PBR path only; a failed load leaves the boxes drawn
    if (layout.campusArt?.placements.length && atlas && !opts.cheap) {
      try {
        w.campusArt = await CampusArtRender.create(scene, layout.campusArt, level.lights, level, (m) => w.lightRig.addCaster(m));
      } catch (e) {
        console.warn('[campus-art] failed to load; the greybox shows', e);
      }
    }
    return w;
  }

  /**
   * Collision on for the doors and (J9 S1) the shutters, once the guards' nav grid is built (it walks every doorway):
   * the shutters' openings are shut on that grid for good (A15; `nav` null on a co-op client or without guards).
   */
  armDoors(nav: ShutterNav | null = null): void {
    this.doors.arm();
    this.shutters?.arm(nav);
  }

  /**
   * Tests (3.6 Step 4b, the brightness probes): a matte 50% grey card (display grey) at a point, its face towards
   * (nx, ny, nz), in the material the look lights (standard on the cheap path, else PBR) -
   * the lamp plugin attaches to it as to any surface. Not a shadow caster; gameplay never sees it.
   */
  addLightProbe(x: number, y: number, z: number, nx: number, ny: number, nz: number, size = 0.3): Mesh {
    const m = CreatePlane('lightProbe', { size, sideOrientation: 2 }, this.scene);
    m.position.set(x, y, z);
    // (a plane's front faces -z: look along -n)
    m.lookAt(new Vector3(x - nx, y - ny, z - nz));
    m.isPickable = false;
    if (!this.surfaces) {
      const mat = new StandardMaterial('lightProbe', this.scene);
      mat.diffuseColor = new Color3(0.5, 0.5, 0.5);
      mat.specularColor = Color3.Black();
      m.material = mat;
    } else {
      const mat = new PBRMaterial('lightProbe', this.scene);
      const g = Math.pow(0.5, 2.2);
      mat.albedoColor = new Color3(g, g, g);
      mat.metallic = 0;
      mat.roughness = 1;
      m.material = mat;
    }
    return m;
  }

  /** What the canonical light bake is made of (tests compare it across renderers; computed on demand). */
  lightInfo(): { shapes: string; lampKey: string | null; moonKey: string | null; hash: string; ms: number; lights: number; lampBytes: number; moonCells: number } {
    const b = this.lightBake;
    return { shapes: this.level.light.hash, lampKey: b?.lampKey ?? null, moonKey: b?.moonKey ?? null, hash: b ? lightBakeHash(b) : '', ms: b?.ms ?? 0, lights: b?.lamps?.baked.ids.length ?? 0, lampBytes: b?.lamps?.r.vis.length ?? 0, moonCells: b?.moon?.vis.length ?? 0 };
  }

  private roofs: RoofGrid | null = null;

  /**
   * Rendering only (the rain's occluder): the roof height over (x, z) - the canonical light shapes' tops (built on
   * first use). Gameplay never reads it.
   */
  roofAt(x: number, z: number): number {
    const l = this.level.light;
    this.roofs ??= roofGrid(l.shapes, l.lo, l.hi);
    return roofAt(this.roofs, x, z);
  }

  /**
   * The moon's cascades (every cascade draws its whole list): moving casters, and static ones the moon can reach -
   * under a roof only the roof itself matters, so indoor props and walls stay out (the sky bake says where).
   */
  readonly sunCasters: AbstractMesh[] = [];
  private sunStatic: AbstractMesh[] = [];
  /** Characters, weapons, props: in the moon's list only while the moon can reach them (3.1, 4 Hz). */
  private sunMoving: AbstractMesh[] = [];
  private sunTmp: AbstractMesh[] = [];
  private sunT = 0;
  /** Low: the moon shades only the level (`ShadowSpec.staticSun`). */
  private staticSun = false;
  private readonly cascadeLists = new SunCascadeLists();
  private readonly sunReach: number[] = [];
  private readonly sunNear: boolean[] = [];
  /** (guard-render S6) Each cascade draws only the casters over its square (`sunCascadeCull.ts`; exact); (S9) and only
   *  those whose shadow can land at a view depth that samples the cascade (split + blend band). Under the baked moon
   *  (the only time these lists run) the list holds moving casters only: the static level is not in this path. */
  private readonly cascadeList = (layer: number): AbstractMesh[] | null => {
    const g = this.shadow;
    if (!(g instanceof CascadedShadowGenerator)) return null;
    const cam = this.scene.activeCamera;
    const d = this.sun.direction;
    this.cascadeLists.setDepth(cam ? cam.getViewMatrix().m : null, csmSplitZ(g), csmSplitLen(g), g.cascadeBlendPercentage, d.x, d.y, d.z);
    return this.cascadeLists.fill(layer, this.sunCasters, g.getCascadeTransformMatrix(layer)?.m ?? null);
  };

  /** (guard-render S9b) A moving caster was enabled or disabled (itself or an ancestor): the moon's list refills on the
   *  next frame (as `LightRig.fillCasters`), so a newly shown mesh casts at once, not at the next 4 Hz pass. One closure. */
  private readonly markSun = (): void => {
    this.sunT = 0;
    this.sunDirty = true;
  };
  /** (S9b checker fix) A caster enabled after `frame()` (the freeze's thaw in onBeforeActiveMeshesEvaluation, a LOD
   *  switch in the player's update) must cast this frame: refill once after active-mesh evaluation, before the shadow
   *  maps render. One closure, registered once on the scene. */
  private sunDirty = false;
  private sunFocus: Vector3 | null = null;
  private sunRefillOn = false;
  private readonly sunRefill = (): void => {
    if (!this.sunDirty || !this.sunFocus) return;
    this.sunT = 0;
    this.updateSunCasters(0, this.sunFocus);
  };

  /** The moon's list: the static casters + the moving ones under open sky (indoors the roof shades them anyway). */
  private updateSunCasters(dt: number, focus: Vector3): void {
    this.sunT -= dt;
    if (this.sunT > 0) return;
    this.sunT = 0.25;
    this.sunDirty = false;
    const tmp = this.sunTmp;
    tmp.length = 0;
    for (let i = 0; i < this.sunStatic.length; i++) tmp.push(this.sunStatic[i]!);
    const cp = focus; // (the player, not the orbit camera: the boom would flip guards at the edge)
    for (let i = 0; i < this.sunMoving.length && !this.staticSun; i++) {
      const m = this.sunMoving[i]!;
      // (guard-render S9b) only what Babylon would draw from this entry: not a disabled mesh (a figure's other LODs, the
      // merged body it replaced, a frozen guard) nor a LOD level (its master's entry draws it); `markSun` refills on an
      // enabled change
      if (!sunCasterDrawn(m)) continue;
      // (small things - pickups, switches, mags - cast nothing worth a draw per cascade; lamps still take them)
      if (m.getBoundingInfo().boundingSphere.radiusWorld < 0.3) continue;
      // (guard-render S6) guards: in the moon's list only near the player (`GUARD_SUN_REACH`, hysteresis)
      const reach = this.sunReach[i]!;
      if (reach !== Infinity) {
        const c = m.getBoundingInfo().boundingSphere.centerWorld;
        const dx = c.x - cp.x;
        const dy = c.y - cp.y;
        const dz = c.z - cp.z;
        const near = keepNearCamera(this.sunNear[i]!, dx * dx + dy * dy + dz * dz, reach);
        this.sunNear[i] = near;
        if (!near) continue;
      }
      if (this.bakedMoon) {
        // (smooth-world: no sky bake - the roof grid; under the baked moon a caster indoors shades nothing the bake
        // has not already darkened)
        const b = m.getBoundingInfo().boundingBox;
        const x = (b.minimumWorld.x + b.maximumWorld.x) / 2;
        const z = (b.minimumWorld.z + b.maximumWorld.z) / 2;
        const top = b.maximumWorld.y + 0.3;
        if (this.roofAt(x, z) > top && this.roofAt(x + 1.5, z) > top && this.roofAt(x - 1.5, z) > top && this.roofAt(x, z + 1.5) > top && this.roofAt(x, z - 1.5) > top) continue;
      }
      tmp.push(m);
    }
    const list = this.sunCasters;
    let same = list.length === tmp.length;
    for (let i = 0; same && i < tmp.length; i++) if (list[i] !== tmp[i]) same = false;
    if (same) return;
    list.length = 0;
    for (let i = 0; i < tmp.length; i++) list.push(tmp[i]!);
  }

  /** 3.6: static moon shadows come from the bake (`BakedLamps` multiplies the sun by the moon's visibility): the
   *  cascades draw moving casters only, and none at all where they drew only the level (`ShadowSpec.staticSun`). */
  private bakedMoon = false;

  /** Switch to the baked moon (desktop with baked lamps). */
  private useBakedMoon(): void {
    this.bakedMoon = true;
    this.sunStatic.length = 0;
    this.sunT = 0;
    this.sunSpec = '';
  }

  /** Static level geometry: every lamp's list (filtered by reach) and the moon's. */
  private addStatic(m: AbstractMesh): void {
    this.lightRig.addCaster(m);
    this.sunStatic.push(m);
  }

  /** Characters, weapons and props cast shadows (one shared list for the sun and every lamp). `sunReach`: the moon's
   *  cascades drop it beyond this distance from the player (`sunCascadeCull.ts`; no caller passes one yet: guards with
   *  GUARD_SUN_REACH, S6d, wait on Michael's look check); lamps and flashlights always take it. */
  addShadowCaster(m: AbstractMesh, sunReach = Infinity, character = true): void {
    this.lightRig.addCaster(m);
    // (LR14) characters (not props) also go into the nearest lamps' character shadow maps
    if (character && !this.charSet.has(m)) {
      this.charSet.add(m);
      this.charCasters.push(m);
      m.onDisposeObservable.addOnce(() => {
        this.charSet.delete(m);
        const i = this.charCasters.indexOf(m);
        if (i >= 0) this.charCasters.splice(i, 1);
      });
    }
    if (!this.sunMoving.includes(m)) {
      this.sunMoving.push(m);
      this.sunReach.push(flags.guardSun ? sunReach : Infinity);
      this.sunNear.push(true);
      this.sunT = 0;
      m.onEffectiveEnabledStateChangedObservable.add(this.markSun);
      m.onDisposeObservable.addOnce(() => {
        const i = this.sunMoving.indexOf(m);
        if (i >= 0) {
          this.sunMoving.splice(i, 1);
          this.sunReach.splice(i, 1);
          this.sunNear.splice(i, 1);
        }
        const j = this.sunCasters.indexOf(m);
        if (j >= 0) this.sunCasters.splice(j, 1);
      });
    }
    // (an instance takes its source mesh's setting)
    const src = (m as AbstractMesh & { sourceMesh?: AbstractMesh }).sourceMesh ?? m;
    src.receiveShadows = true;
  }

  private probe: ReflectionProbe | null = null;
  /** (map-ready S2) The environment probe has captured (the load gate's `probe` step). Render side only. */
  probeCaptured = false;
  /** The level's procedural surface textures. */
  surfaces: SurfaceAtlas | null = null;

  /** Graphics settings: the light pools, lamp / flashlight shadows, the sun's cascades, the surface textures. */
  /** `rebuildShadows`: new shadow generators even with the same settings (3.1.4 benchmark diagnosis). */
  applyQuality(q: QualityLevel, rebuildShadows = false): void {
    // (3.2.3: always drawn anew on the first apply - the atlas made while the map loads came out empty, and at Low the
    // size never changed, so the floors and crate tops drew as flat haze)
    const first = !this.atlasDrawn;
    this.atlasDrawn = true;
    if (this.surfaces?.setSize(q.minimal ? 256 : TEXTURE_SIZE[q.features.textures], q.minimal ? 4 : TEXTURE_ANISO[q.features.textures], first)) {
      // (the level material is frozen: re-bind the new atlas)
      const m = this.level.meshes[0]?.material;
      if (m) {
        m.unfreeze();
        m.markAsDirty(1);
        m.freeze();
      }
    }
    const shadowKey = JSON.stringify(q.shadow);
    const shadowChanged = rebuildShadows || (this.shadowKey !== '' && shadowKey !== this.shadowKey);
    this.shadowKey = shadowKey;
    // (LR16t) the torch shadow atlas, every tier (`q.minimal` none); before the rig, whose shadow pool then takes no
    // flashlight (its spot shadow samplers go). The plugin's LAMP_TSHADOW define follows the on-state (`tsChanged`)
    const tsWas = !!this.torchShadows?.on;
    if (this.torchShadows) {
      const ts = torchShadowSpec(q.features.shadows, !!q.minimal);
      this.torchShadows.configure(ts.tile, ts.taps);
    }
    const tsChanged = !!this.torchShadows && this.torchShadows.on !== tsWas;
    this.lightRig.setTorchShadows(!!this.torchShadows?.on);
    this.lightRig.configure({ lights: q.realLights, shadow: q.shadow, volumetric: q.features.volumetrics, minimal: q.minimal }, rebuildShadows);
    // (LR14) the nearest lamps' character shadow maps (the shadow key above re-reads the materials' defines on a change).
    // Their atlas is one more texture in every lit shader (`?gfx=min` keeps the capsules)
    const csWas = !!this.charShadows?.on;
    this.charShadows?.configure(q.minimal ? 0 : q.shadow.charLamps, q.shadow.charTile);
    // (the lamp plugin's LAMP_CSHADOW define follows it: on the first apply too, the materials may have compiled already)
    const csChanged = !!this.charShadows && this.charShadows.on !== csWas;
    if (rebuildShadows) this.sunSpec = '';
    if (this.staticSun !== !!q.shadow.staticSun) {
      this.staticSun = !!q.shadow.staticSun;
      this.sunT = 0;
    }
    const k = q.minimal ? 1 : q.detailScale;
    this.parts.setLodScale(k);
    setAnimLodScale(k);
    this.setSunShadows(q.shadow);
    // (frozen materials keep the shader built for the old shadow maps - a stale light setup draws with unbound
    // uniform buffers: let every one re-read its lights once, then freeze it again)
    if (shadowChanged || csChanged || tsChanged) this.refreshMaterials();
  }

  private shadowKey = '';
  private atlasDrawn = false;

  /**
   * Frozen materials re-read their whole setup (lights, shadow maps, the post stack's image processing) for two frames,
   * then freeze again: after a shadow change or a post stack rebuild in a match (3.1.3: a rebuilt stack left every
   * frame ~4x slower until this ran).
   */
  refreshMaterials(): void {
    const frozen: Material[] = [];
    for (const m of this.scene.materials) {
      if (m.isFrozen) {
        m.unfreeze();
        frozen.push(m);
      }
      m.markAsDirty(Material.AllDirtyFlag);
    }
    // (two frames: compiled and drawn with the new setup before freezing again)
    let n = 0;
    const obs = this.scene.onAfterRenderObservable.add(() => {
      if (++n < 2) return;
      this.scene.onAfterRenderObservable.remove(obs);
      for (const m of frozen) m.freeze();
    });
  }

  /** The frame governor's detail (3.1): run-time only, nothing recompiles. */
  applyAdaptive(a: Readonly<Adaptive>, q: QualityLevel): void {
    this.lightRig.setAdaptive(a.lights, a.shadowEvery);
    this.charShadows?.setAdaptive(a.shadowEvery);
    this.torchShadows?.setAdaptive(a.shadowEvery);
    const sm = this.shadow?.getShadowMap();
    if (sm) sm.refreshRate = a.shadowEvery;
    const k = (q.minimal ? 1 : q.detailScale) * a.partLod;
    this.parts.setLodScale(k);
    setAnimLodScale(k);
  }

  private setSunShadows(spec: ShadowSpec): void {
    // (3.6: with the baked moon, a level-only moon - Low - has nothing left to draw)
    const on = spec.sun && !(this.bakedMoon && spec.staticSun);
    const key = on ? `${spec.cascades}:${spec.sunSize}:${spec.soft}` : 'off';
    if (key === this.sunSpec) return;
    this.sunSpec = key;
    this.shadow?.dispose();
    this.shadow = null;
    if (!on) {
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
    if (sm) {
      sm.renderList = this.sunCasters;
      if (useCascadeLists(flags.guardSun, this.bakedMoon)) sm.getCustomRenderList = this.cascadeList;
    }
    if (!this.sunRefillOn) {
      this.sunRefillOn = true;
      this.scene.onAfterActiveMeshesEvaluationObservable.add(this.sunRefill);
    }
    this.shadow = csm;
  }

  /** Keep the sun's shadow frustum centred on the player. */
  frame(focus: Vector3, dt = 0): void {
    const cam = this.scene.activeCamera;
    // (LR16-5b) the swinging pendants' positions first: the shadow slots below fit and render from where they hang now
    this.lamps?.writeSway();
    // (LR14) the character shadow slots before the lamps write their texels (which lamp reads which tile)
    if (this.charShadows) {
      const c = cam ? cam.globalPosition : focus;
      this.charShadows.frame(focus.x, focus.y, focus.z, c.x, c.y, c.z, dt);
    }
    this.lamps?.frame();
    this.sunFocus = focus;
    this.updateSunCasters(dt, focus);
    if (cam) {
      this.lightRig.update(dt, cam.globalPosition.x, cam.globalPosition.y, cam.globalPosition.z);
      // (LR16t) after the rig fills the torch slots: each slot's map follows its torch, its shut doors picked
      this.torchShadows?.frame(cam.globalPosition.x, cam.globalPosition.y, cam.globalPosition.z);
    }
    this.sun.position.copyFrom(focus).subtractInPlace(this.sun.direction.scale(40));
  }

  dispose(): void {
    this.kit?.dispose();
    this.facilityProps?.dispose();
    this.shadow?.dispose();
    this.surfaces?.dispose();
    this.probe?.dispose();
    this.lightRig.dispose();
    this.charShadows?.dispose();
    this.torchShadows?.dispose();
    this.lamps?.dispose();
    this.breakables.dispose();
    this.campusArt?.dispose();
    this.doors.dispose();
    this.shutters?.dispose();
    this.planks?.dispose();
    this.props.dispose();
    this.level.dispose();
    this.parts.dispose();
    this.scene.dispose();
  }
}

/** The smooth level's sky visibility (rendering only): `bakeSky` over the canonical light shapes in `SKY_CELL` cells on `SKY_GRID`. */
async function smoothSky(l: BuiltLevel['light']): Promise<{ origin: [number, number, number]; cell: number; n: [number, number, number]; vis: Uint8Array }> {
  const shapes = skyShapes(l.shapes, SHAPE_STRIDE, SKY_GRID.size * SKY_GRID.minThick);
  const { origin, n } = skyGridFor(shapes.length / SHAPE_STRIDE, (i, out) => shapeBounds(shapes, i, out), () => true, SKY_GRID.brick * SKY_GRID.size, SKY_GRID.chunk * SKY_GRID.size, SKY_CELL);
  const pool = new WorkerPool(1);
  try {
    const r = await pool.sky({ kind: 'sky', id: -1, origin, cell: SKY_CELL, n, shapes });
    return { origin, cell: SKY_CELL, n, vis: r.vis };
  } finally {
    pool.dispose();
  }
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
