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

  /** Keep the sun's shadow frustum centred on the player. */
  frame(focus: Vector3): void {
    if (this.shadow) {
      this.sun.position.copyFrom(focus).subtractInPlace(this.sun.direction.scale(40));
    }
  }

  dispose(): void {
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
