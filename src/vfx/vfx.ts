import {
  Color3,
  Color4,
  CreateBox,
  CreatePlane,
  CreateSphere,
  Quaternion,
  StandardMaterial,
  Vector3,
  type InstancedMesh,
  type Mesh,
  type Scene,
} from '../core/babylon';

interface Particle {
  m: InstancedMesh;
  vel: Vector3;
  life: number;
  max: number;
  size: number;
  grow: number;
  gravity: number;
  active: boolean;
}

interface Tracer {
  m: InstancedMesh;
  life: number;
  max: number;
  active: boolean;
  width: number;
}

const UP = new Vector3(0, 1, 0);

/**
 * Pooled, instanced, unlit effects: tracers, muzzle flashes, sparks, smoke, decals,
 * explosions. Nothing is allocated per shot. Instance colour = output colour.
 */
export class Vfx {
  private mat: StandardMaterial;
  private decalMat: StandardMaterial;
  private boxBase: Mesh;
  private sphereBase: Mesh;
  private planeBase: Mesh;
  private particles: Particle[] = [];
  private tracers: Tracer[] = [];
  private flashes: Tracer[] = [];
  private decals: InstancedMesh[] = [];
  private decalIdx = 0;
  private pIdx = 0;
  private tIdx = 0;
  private fIdx = 0;
  /** Quality scaling for particle counts (adaptive quality). */
  density = 1;

  constructor(private scene: Scene) {
    const m = new StandardMaterial('vfxMat', scene);
    m.disableLighting = true;
    m.diffuseColor = Color3.White();
    m.emissiveColor = Color3.Black();
    m.specularColor = Color3.Black();
    m.fogEnabled = true;
    m.freeze();
    this.mat = m;
    const dm = new StandardMaterial('decalMat', scene);
    dm.diffuseColor = new Color3(0.08, 0.08, 0.09);
    dm.specularColor = Color3.Black();
    dm.zOffset = -2;
    dm.freeze();
    this.decalMat = dm;
    const prep = (mesh: Mesh, mat: StandardMaterial): Mesh => {
      mesh.material = mat;
      mesh.isPickable = false;
      mesh.isVisible = false;
      mesh.registerInstancedBuffer('color', 4);
      mesh.instancedBuffers.color = new Color4(1, 1, 1, 1);
      return mesh;
    };
    this.boxBase = prep(CreateBox('vfx-box', { size: 1 }, scene), m);
    this.sphereBase = prep(CreateSphere('vfx-sph', { diameter: 1, segments: 4 }, scene), m);
    this.planeBase = prep(CreatePlane('vfx-decal', { size: 1 }, scene), dm);
    for (let i = 0; i < 120; i++) {
      const base = i < 90 ? this.boxBase : this.sphereBase;
      const inst = base.createInstance('fx-p');
      inst.isVisible = false;
      inst.isPickable = false;
      inst.rotationQuaternion = new Quaternion();
      this.particles.push({ m: inst, vel: new Vector3(), life: 0, max: 1, size: 0.05, grow: 0, gravity: 0, active: false });
    }
    for (let i = 0; i < 32; i++) {
      const inst = this.boxBase.createInstance('fx-tracer');
      inst.isVisible = false;
      inst.isPickable = false;
      inst.rotationQuaternion = new Quaternion();
      this.tracers.push({ m: inst, life: 0, max: 0.06, active: false, width: 0.02 });
    }
    for (let i = 0; i < 6; i++) {
      const inst = this.sphereBase.createInstance('fx-flash');
      inst.isVisible = false;
      inst.isPickable = false;
      this.flashes.push({ m: inst, life: 0, max: 0.05, active: false, width: 0.2 });
    }
    for (let i = 0; i < 48; i++) {
      const inst = this.planeBase.createInstance('fx-decal');
      inst.isVisible = false;
      inst.isPickable = false;
      inst.rotationQuaternion = new Quaternion();
      this.decals.push(inst);
    }
  }

  private nextParticle(sphere: boolean): Particle {
    // boxes live in [0, 90), spheres in [90, 120)
    const lo = sphere ? 90 : 0;
    const n = sphere ? 30 : 90;
    this.pIdx = (this.pIdx + 1) % n;
    return this.particles[lo + this.pIdx]!;
  }

  private emit(sphere: boolean, pos: Vector3, vel: Vector3, color: Color4, life: number, size: number, grow: number, gravity: number): void {
    const p = this.nextParticle(sphere);
    p.active = true;
    p.life = 0;
    p.max = life;
    p.size = size;
    p.grow = grow;
    p.gravity = gravity;
    p.vel.copyFrom(vel);
    p.m.position.copyFrom(pos);
    p.m.scaling.setAll(size);
    p.m.instancedBuffers.color = color;
    p.m.isVisible = true;
  }

  tracer(from: Vector3, to: Vector3, hex: string, width = 0.025): void {
    const t = this.tracers[(this.tIdx = (this.tIdx + 1) % this.tracers.length)]!;
    const d = to.subtract(from);
    const len = d.length();
    if (len < 0.3) return;
    t.active = true;
    t.life = 0;
    t.max = 0.07;
    t.width = width;
    // draw only the front part of the path so it reads as a streak
    const seg = Math.min(len, 6 + len * 0.25);
    const mid = to.subtract(d.scale(seg / len / 2));
    t.m.position.copyFrom(mid);
    t.m.scaling.set(width, width, seg);
    Quaternion.FromLookDirectionLHToRef(d.normalize(), UP, t.m.rotationQuaternion!);
    t.m.instancedBuffers.color = Color4.FromHexString(hex + 'ff');
    t.m.isVisible = true;
  }

  muzzleFlash(pos: Vector3, size = 0.22): void {
    const f = this.flashes[(this.fIdx = (this.fIdx + 1) % this.flashes.length)]!;
    f.active = true;
    f.life = 0;
    f.max = 0.05;
    f.width = size;
    f.m.position.copyFrom(pos);
    f.m.scaling.setAll(size * (0.8 + Math.random() * 0.4));
    f.m.instancedBuffers.color = new Color4(1, 0.85, 0.45, 1);
    f.m.isVisible = true;
  }

  sparks(pos: Vector3, normal: Vector3, count: number, hex = '#ffd27a'): void {
    const c = Color4.FromHexString(hex + 'ff');
    const n = Math.max(1, Math.round(count * this.density));
    for (let i = 0; i < n; i++) {
      const v = normal.scale(1.5 + Math.random() * 2.5);
      v.x += (Math.random() - 0.5) * 3;
      v.y += Math.random() * 2;
      v.z += (Math.random() - 0.5) * 3;
      this.emit(false, pos, v, c, 0.25 + Math.random() * 0.2, 0.035, -0.08, 14);
    }
  }

  /** Dust puff for impacts on world geometry. */
  dust(pos: Vector3, normal: Vector3, hex = '#b8b0a0'): void {
    const c = Color4.FromHexString(hex + 'ff');
    for (let i = 0; i < Math.max(1, Math.round(2 * this.density)); i++) {
      const v = normal.scale(0.6 + Math.random() * 0.6);
      v.y += 0.3;
      this.emit(true, pos.add(normal.scale(0.05)), v, c, 0.45, 0.08, 0.5, -0.5);
    }
  }

  decal(pos: Vector3, normal: Vector3): void {
    const d = this.decals[(this.decalIdx = (this.decalIdx + 1) % this.decals.length)]!;
    d.position.copyFrom(pos).addInPlace(normal.scale(0.012));
    Quaternion.FromLookDirectionLHToRef(normal.scale(-1), Math.abs(normal.y) > 0.9 ? new Vector3(1, 0, 0) : UP, d.rotationQuaternion!);
    d.scaling.setAll(0.09 + Math.random() * 0.04);
    d.isVisible = true;
  }

  explosion(pos: Vector3, radius: number): void {
    const fire = [new Color4(1, 0.75, 0.3, 1), new Color4(1, 0.45, 0.12, 1), new Color4(0.95, 0.3, 0.1, 1)];
    const k = Math.max(4, Math.round(10 * this.density));
    for (let i = 0; i < k; i++) {
      const v = new Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).scaleInPlace(radius * 1.4);
      this.emit(true, pos, v, fire[i % 3]!, 0.35 + Math.random() * 0.2, radius * 0.25, radius * 1.2, -1);
    }
    const smoke = new Color4(0.25, 0.24, 0.23, 1);
    for (let i = 0; i < Math.round(k * 0.6); i++) {
      const v = new Vector3(Math.random() - 0.5, 1 + Math.random(), Math.random() - 0.5).scaleInPlace(radius * 0.5);
      this.emit(true, pos.add(new Vector3(0, 0.3, 0)), v, smoke, 1.1 + Math.random() * 0.5, radius * 0.2, radius * 0.5, -1.5);
    }
    this.sparks(pos, UP, 14, '#ffb347');
  }

  /** Coloured burst for character hits. */
  hit(pos: Vector3, dir: Vector3, hex: string, count = 5): void {
    this.sparks(pos, dir.scale(-1), count, hex);
  }

  update(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.max) {
        p.active = false;
        p.m.isVisible = false;
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.vel.scaleAndAddToRef(dt, p.m.position);
      const t = p.life / p.max;
      const s = Math.max(0.001, p.size + p.grow * t);
      p.m.scaling.setAll(s * (1 - t * 0.5));
    }
    for (const t of this.tracers) {
      if (!t.active) continue;
      t.life += dt;
      if (t.life >= t.max) {
        t.active = false;
        t.m.isVisible = false;
        continue;
      }
      const w = t.width * (1 - t.life / t.max);
      t.m.scaling.x = w;
      t.m.scaling.y = w;
    }
    for (const f of this.flashes) {
      if (!f.active) continue;
      f.life += dt;
      if (f.life >= f.max) {
        f.active = false;
        f.m.isVisible = false;
      }
    }
  }

  dispose(): void {
    for (const m of [this.boxBase, this.sphereBase, this.planeBase]) m.dispose();
    this.mat.dispose();
    this.decalMat.dispose();
    void this.scene;
  }
}
