import { Color3, CreateSphere, Matrix, SpotLight, StandardMaterial, Vector3, type Mesh, type Scene } from '../core/babylon';
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

/**
 * Renders the level's `LightRegistry`: every light gets an emissive bulb (one thin-instanced mesh, dark when
 * off or shot out), and the few nearest the camera get a real Babylon light from a fixed pool of spot
 * lights (lamps as a wide downward cone). The pool's lights are created once and never enabled / disabled
 * (that would change shader defines and recompile mid-match): unused ones sit at zero intensity. A level
 * without lights creates nothing.
 */
export class LightRig {
  private pool: SpotLight[] = [];
  private bulbs: Mesh | null = null;
  private bulbColors: Float32Array | null = null;
  private ids = new Int32Array(MAX_REAL_LIGHTS);
  private dist = new Float32Array(MAX_REAL_LIGHTS);
  private pickT = 0;
  private version = -1;
  /** Real lights in use (from quality). */
  active = MAX_REAL_LIGHTS;

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
    const m = new Matrix();
    for (let i = 0; i < n; i++) {
      const l = reg.lights[i]!;
      Matrix.TranslationToRef(l.x, l.y, l.z, m);
      m.copyToArray(mtx, i * 16);
    }
    this.bulbColors = new Float32Array(n * 4);
    mesh.thinInstanceSetBuffer('matrix', mtx, 16, true);
    mesh.thinInstanceSetBuffer('color', this.bulbColors, 4, false);
    mesh.thinInstanceRefreshBoundingInfo(false);
    mesh.freezeWorldMatrix();
    this.bulbs = mesh;
  }

  /** Per render frame: re-pick the nearest lights to the camera a few times a second, and on any change. */
  update(dt: number, cx: number, cy: number, cz: number): void {
    if (!this.bulbs) return;
    this.pickT -= dt;
    const changed = this.version !== this.reg.version;
    if (!changed && this.pickT > 0) return;
    this.pickT = PICK_INTERVAL;
    if (changed) {
      this.version = this.reg.version;
      this.paintBulbs();
    }
    const n = nearestLights(this.reg, cx, cy, cz, this.ids, this.dist);
    const use = Math.min(n, this.active);
    for (let i = 0; i < MAX_REAL_LIGHTS; i++) {
      const s = this.pool[i]!;
      if (i < use) this.place(s, this.reg.lights[this.ids[i]!]!);
      else s.intensity = 0;
    }
  }

  private place(s: SpotLight, l: LightDef): void {
    s.position.set(l.x, l.y, l.z);
    s.range = l.radius;
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
    for (let i = 0; i < this.reg.lights.length; i++) {
      const l = this.reg.lights[i]!;
      const k = l.on && !l.destroyed ? 1 : 0.08;
      c[i * 4] = l.color[0] * k;
      c[i * 4 + 1] = l.color[1] * k;
      c[i * 4 + 2] = l.color[2] * k;
      c[i * 4 + 3] = 1;
    }
    this.bulbs.thinInstanceBufferUpdated('color');
  }

  dispose(): void {
    for (const s of this.pool) s.dispose();
    this.bulbs?.material?.dispose();
    this.bulbs?.dispose();
    this.pool.length = 0;
    this.bulbs = null;
  }
}
