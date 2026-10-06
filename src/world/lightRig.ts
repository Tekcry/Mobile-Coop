import { Color3, CreateBox, CreateCylinder, CreateSphere, Matrix, Quaternion, SpotLight, StandardMaterial, Vector3, VertexBuffer, type Mesh, type Scene } from '../core/babylon';
import { nearestLights, type LightDef, type LightRegistry } from './lights';

/** Real lights the pool holds (quality decides how many are used, `QualityLevel.realLights`). */
export const MAX_REAL_LIGHTS = 4;
/** How often the nearest set is re-picked (s). */
const PICK_INTERVAL = 0.25;
/** Sun + hemisphere already light every material. */
const BASE_LIGHTS = 2;
/** Omni lamps render as a spot pointing down with this cone (rad): everything below the lamp is lit, and one
 *  light type keeps the per-pixel light loop short. */
const LAMP_CONE = Math.PI * 0.97;
/** Visible light cones (cheap additive meshes): a lamp's shade half-angle (rad), the longest cone (m) and how
 *  bright the haze is. */
const CONE_HALF = 0.5;
const CONE_LEN = 3.6;
const CONE_GLOW = 0.075;

/**
 * Renders the level's `LightRegistry`: every light gets an emissive bulb (one thin-instanced mesh, dark when
 * off or shot out), and the few nearest the camera get a real Babylon light from a fixed pool of spot
 * lights (lamps as a wide downward cone). The pool's lights are created once and never enabled / disabled
 * (that would change shader defines and recompile mid-match): unused ones sit at zero intensity. Every fixed
 * light also gets a faint additive cone (one thin-instanced mesh, vertex alpha fading to the floor) so lamps read
 * as volumes of light in the dark; it goes out with the light. A level without lights creates nothing.
 */
export class LightRig {
  private pool: SpotLight[] = [];
  private bulbs: Mesh | null = null;
  private fixtures: Mesh | null = null;
  private cones: Mesh | null = null;
  private coneColors: Float32Array | null = null;
  private bulbColors: Float32Array | null = null;
  private ids = new Int32Array(MAX_REAL_LIGHTS);
  private dist = new Float32Array(MAX_REAL_LIGHTS);
  private pickT = 0;
  private version = -1;
  /** Real lights in use (from quality). */
  active = MAX_REAL_LIGHTS;
  /** Pool slots placed at the last pick. */
  private used = 0;
  private bulbCount = 0;

  constructor(
    scene: Scene,
    readonly reg: LightRegistry,
  ) {
    const n = reg.lights.length;
    if (n === 0) return;
    for (let i = 0; i < MAX_REAL_LIGHTS; i++) {
      const s = new SpotLight(`maplight-${i}`, new Vector3(0, -50, 0), new Vector3(0, -1, 0), LAMP_CONE, 1, scene);
      s.intensity = 0;
      s.specular = Color3.Black();
      this.pool.push(s);
    }
    // every lit material takes the pool on top of the sun and sky
    for (const m of scene.materials) {
      if (!(m instanceof StandardMaterial) || m.disableLighting) continue;
      const frozen = m.isFrozen;
      if (frozen) m.unfreeze();
      m.maxSimultaneousLights = BASE_LIGHTS + MAX_REAL_LIGHTS;
      if (frozen) m.freeze();
    }
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

  /** Per render frame: re-pick the nearest lights to the camera a few times a second, and on any change. */
  update(dt: number, cx: number, cy: number, cz: number): void {
    if (!this.bulbs) return;
    // the haze goes with the real lights (the lowest quality has none)
    if (this.cones) this.cones.isVisible = this.active > 0;
    this.pickT -= dt;
    const changed = this.version !== this.reg.version;
    if (!changed && this.pickT > 0) {
      // moving lights follow every frame between picks
      for (let i = 0; i < this.used; i++) {
        const l = this.reg.lights[this.ids[i]!]!;
        if (l.kind === 'flashlight') this.place(this.pool[i]!, l);
      }
      return;
    }
    this.pickT = PICK_INTERVAL;
    if (changed) {
      this.version = this.reg.version;
      this.paintBulbs();
    }
    const n = nearestLights(this.reg, cx, cy, cz, this.ids, this.dist);
    const use = Math.min(n, this.active);
    this.used = use;
    for (let i = 0; i < MAX_REAL_LIGHTS; i++) {
      const s = this.pool[i]!;
      if (i < use) this.place(s, this.reg.lights[this.ids[i]!]!);
      else s.intensity = 0;
    }
  }

  private place(s: SpotLight, l: LightDef): void {
    s.position.set(l.x, l.y, l.z);
    s.range = l.reach ?? l.radius;
    s.intensity = l.intensity * 1.6;
    s.diffuse.set(l.color[0], l.color[1], l.color[2]);
    if (l.cone) {
      s.direction.set(l.cone.dx, l.cone.dy, l.cone.dz);
      s.angle = Math.acos(l.cone.cosOuter) * 2;
      s.exponent = 2;
    } else {
      s.direction.set(0, -1, 0);
      s.angle = LAMP_CONE;
      s.exponent = 1;
    }
  }

  private paintBulbs(): void {
    const c = this.bulbColors;
    if (!c || !this.bulbs) return;
    for (let i = 0; i < this.bulbCount; i++) {
      const l = this.reg.lights[i]!;
      const k = l.on && !l.destroyed ? 1 : 0.08;
      c[i * 4] = l.color[0] * k;
      c[i * 4 + 1] = l.color[1] * k;
      c[i * 4 + 2] = l.color[2] * k;
      c[i * 4 + 3] = 1;
      const cc = this.coneColors;
      if (cc) {
        const g = l.on && !l.destroyed && l.kind !== 'flashlight' ? CONE_GLOW * Math.min(1.5, l.intensity) : 0;
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
    for (const s of this.pool) s.dispose();
    this.bulbs?.material?.dispose();
    this.bulbs?.dispose();
    this.fixtures?.dispose();
    this.cones?.material?.dispose();
    this.cones?.dispose();
    this.pool.length = 0;
    this.bulbs = null;
  }
}
