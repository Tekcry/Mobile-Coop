import {
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

/** Flashlight slots on dark maps (enemies searching / investigating in the dark). */
export const FLASHLIGHTS = 4;

export interface WorldOptions {
  shadows: boolean;
  shadowMapSize: number;
  seed: number;
}

/** Scene + lighting + level geometry + props for one map. */
export class World {
  readonly parts: PartLibrary;
  readonly props: PropSystem;
  shadow: ShadowGenerator | null = null;
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
    opts: WorldOptions,
  ) {
    const th = map.theme;
    scene.clearColor = Color4.FromHexString(th.horizon + 'ff');
    scene.fogMode = Scene.FOGMODE_LINEAR;
    scene.fogColor = Color3.FromHexString(th.horizon);
    scene.fogStart = th.fogStart;
    scene.fogEnd = th.fogEnd;
    this.hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, 0.1), scene);
    this.hemi.intensity = th.ambient;
    this.hemi.groundColor = Color3.FromHexString(th.ground).scale(0.6);
    this.sun = new DirectionalLight('sun', new Vector3(...th.sunDir).normalize(), scene);
    this.sun.intensity = th.sunIntensity;
    this.sun.position = this.sun.direction.scale(-40);
    this.sky = makeSky(scene, th.sky, th.horizon);

    this.parts = new PartLibrary(scene);
    if (opts.shadows) {
      const sg = new ShadowGenerator(opts.shadowMapSize, this.sun);
      sg.usePercentageCloserFiltering = false;
      sg.useBlurExponentialShadowMap = false;
      sg.bias = 0.002;
      sg.normalBias = 0.02;
      sg.darkness = 0.35;
      this.sun.shadowMinZ = 1;
      this.sun.shadowMaxZ = 90;
      this.sun.autoUpdateExtends = false;
      this.sun.orthoLeft = -24;
      this.sun.orthoRight = 24;
      this.sun.orthoTop = 24;
      this.sun.orthoBottom = -24;
      this.shadow = sg;
    }
    this.props = new PropSystem(scene, this.parts, (m) => this.addShadowCaster(m));
    for (const p of layout.props) this.props.spawn(p.kind, p.pos, p.yaw ?? 0);
    // gameplay light level everywhere (moonlight / daylight); after the props so their materials take the pool
    level.lights.ambient = th.lightLevel ?? 0.75;
    // dark maps: a few flashlight slots enemies switch on to search (moving cone lights, off until used)
    const reg = level.lights;
    if (reg.ambient < 0.5 || reg.zones.some((z) => z.ambient < 0.5)) {
      for (let i = 0; i < FLASHLIGHTS; i++) {
        reg.add({ kind: 'flashlight', x: 0, y: -50, z: 0, radius: 13, intensity: 0.85, color: [0.95, 0.96, 1], cone: makeCone(0, 0, 1, 0.34, 0.2), on: false, destructible: false, electric: false });
      }
    }
    this.lightRig = new LightRig(scene, level.lights);
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
    const level = b.build(scene, map.id);
    return new World(scene, map, level, layout, opts);
  }

  addShadowCaster(m: AbstractMesh): void {
    this.shadow?.addShadowCaster(m, false);
  }

  /** Live quality toggle: shadows on/off and shadow map refresh rate. */
  setShadows(enabled: boolean, refreshRate: number): void {
    this.sun.shadowEnabled = enabled && !!this.shadow;
    const map = this.shadow?.getShadowMap();
    if (map) map.refreshRate = refreshRate;
  }

  /** Keep the sun's shadow frustum centred on the player. */
  frame(focus: Vector3, dt = 0): void {
    const cam = this.scene.activeCamera;
    if (cam) this.lightRig.update(dt, cam.globalPosition.x, cam.globalPosition.y, cam.globalPosition.z);
    if (this.shadow) {
      this.sun.position.copyFrom(focus).subtractInPlace(this.sun.direction.scale(40));
    }
  }

  dispose(): void {
    this.lightRig.dispose();
    this.breakables.dispose();
    this.doors.dispose();
    this.props.dispose();
    this.level.dispose();
    this.parts.dispose();
    this.scene.dispose();
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
