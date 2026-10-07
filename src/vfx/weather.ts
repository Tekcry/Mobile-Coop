import { Color3, CreateBox, Matrix, Quaternion, StandardMaterial, Vector3, type Mesh, type Scene } from '../core/babylon';

/** Drops / motes per effects tier (Effects and weather: high / ultra / epic as a density 1 / 1.5 / 2). */
const RAIN_BASE = 900;
const DUST_BASE = 260;
/** The box of air round the camera that the particles live in (m). */
const BOX = { x: 16, y: 10, z: 16 };

/**
 * Weather (3.0, visual only): rain streaks (thin-instanced, recycled round the camera, angled by a light wind)
 * or blown dust motes, all updated in place (no allocations). The wet floor look (darker, glossy) is the surface
 * plugin's `wet`; heat haze is the volumetric pass's shimmer. Nothing here touches gameplay.
 */
export class Weather {
  private mesh: Mesh | null = null;
  private mtx: Float32Array = new Float32Array(0);
  private pos: Float32Array = new Float32Array(0);
  private n = 0;
  private readonly m = new Matrix();
  private readonly q = new Quaternion();
  private readonly s = new Vector3();
  private readonly p = new Vector3();
  private t = 0;
  private placed = false;
  /** Wind (m/s, x / z). */
  wind = { x: 1.6, z: 0.6 };
  /** Roofs (3.0 voxels: the sky bake's height per column): rain below it is hidden (none: open sky). */
  occluder: ((x: number, z: number) => number) | null = null;

  constructor(
    private scene: Scene,
    readonly kind: 'rain' | 'dust' | 'haze' | null,
  ) {}

  /** (Re)build for an effects density (the Effects setting); 0 = off. */
  setDensity(density: number): void {
    const want = this.kind === 'rain' ? Math.round(RAIN_BASE * density) : this.kind === 'dust' ? Math.round(DUST_BASE * density) : 0;
    if (want === this.n) return;
    this.dispose();
    this.n = want;
    this.placed = false;
    if (!want) return;
    const mesh = CreateBox(`weather-${this.kind}`, { size: 1 }, this.scene);
    const mat = new StandardMaterial(`weatherMat-${this.kind}`, this.scene);
    mat.disableLighting = true;
    mat.diffuseColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.emissiveColor = this.kind === 'rain' ? new Color3(0.42, 0.48, 0.55) : new Color3(0.55, 0.47, 0.36);
    mat.alpha = this.kind === 'rain' ? 0.32 : 0.45;
    mat.disableDepthWrite = true;
    mat.freeze();
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    this.mtx = new Float32Array(want * 16);
    this.pos = new Float32Array(want * 4);
    for (let i = 0; i < want; i++) {
      this.pos[i * 4] = (Math.random() - 0.5) * BOX.x;
      this.pos[i * 4 + 1] = Math.random() * BOX.y;
      this.pos[i * 4 + 2] = (Math.random() - 0.5) * BOX.z;
      this.pos[i * 4 + 3] = Math.random();
    }
    mesh.thinInstanceSetBuffer('matrix', this.mtx, 16, false);
    this.mesh = mesh;
  }

  /** Per render frame: fall / drift, wrapped round the camera. */
  frame(dt: number, cx: number, cy: number, cz: number): void {
    const mesh = this.mesh;
    if (!mesh || dt <= 0) return;
    if (!this.placed) {
      // the first frame: the random offsets become positions round the camera
      this.placed = true;
      for (let i = 0; i < this.n; i++) {
        this.pos[i * 4] = this.pos[i * 4]! + cx;
        this.pos[i * 4 + 1] = this.pos[i * 4 + 1]! + cy - 3;
        this.pos[i * 4 + 2] = this.pos[i * 4 + 2]! + cz;
      }
    }
    this.t += dt;
    const rain = this.kind === 'rain';
    const fall = rain ? 11 : 0.25;
    const wx = this.wind.x * (rain ? 1 : 1.8);
    const wz = this.wind.z * (rain ? 1 : 1.8);
    // rain leans into the wind
    if (rain) Quaternion.FromEulerAnglesToRef(Math.atan2(wz, fall), 0, -Math.atan2(wx, fall), this.q);
    else this.q.set(0, 0, 0, 1);
    const hx = BOX.x / 2;
    const hz = BOX.z / 2;
    const floorY = cy - 3;
    for (let i = 0; i < this.n; i++) {
      const o = i * 4;
      const ph = this.pos[o + 3]!;
      // world positions, kept within the box round the camera (a particle leaving one side comes in the other)
      let x = this.pos[o]! + wx * dt + (rain ? 0 : Math.sin(this.t * 0.7 + ph * 40) * 0.3 * dt);
      let y = this.pos[o + 1]! - fall * dt * (rain ? 0.85 + ph * 0.3 : 1) + (rain ? 0 : Math.cos(this.t * 0.9 + ph * 30) * 0.2 * dt);
      let z = this.pos[o + 2]! + wz * dt;
      if (x - cx > hx) x -= BOX.x;
      else if (x - cx < -hx) x += BOX.x;
      if (z - cz > hz) z -= BOX.z;
      else if (z - cz < -hz) z += BOX.z;
      if (y < floorY) y += BOX.y;
      else if (y > floorY + BOX.y) y -= BOX.y;
      this.pos[o] = x;
      this.pos[o + 1] = y;
      this.pos[o + 2] = z;
      this.p.set(x, y, z);
      // under a roof: hidden (it falls on through skylights, doorways and the yard)
      if (rain && this.occluder && y < this.occluder(x, z)) this.s.set(0, 0, 0);
      else if (rain) this.s.set(0.012, 0.55, 0.012);
      else this.s.set(0.02 + ph * 0.02, 0.02 + ph * 0.02, 0.02 + ph * 0.02);
      Matrix.ComposeToRef(this.s, this.q, this.p, this.m);
      this.m.copyToArray(this.mtx, i * 16);
    }
    mesh.thinInstanceBufferUpdated('matrix');
  }

  /** Floors look wet (rain) 0..1. */
  get wetness(): number {
    return this.kind === 'rain' ? 1 : 0;
  }

  /** Heat shimmer strength for the volumetric pass (haze). */
  get shimmer(): number {
    return this.kind === 'haze' ? 1 : 0;
  }

  dispose(): void {
    this.mesh?.material?.dispose();
    this.mesh?.dispose();
    this.mesh = null;
    this.n = 0;
  }
}
