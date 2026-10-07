import { Color3, CreateCylinder, Matrix, Quaternion, StandardMaterial, Vector3, type Mesh, type Scene } from '../core/babylon';

const MAX_ROPES = 8;

/**
 * Rappel ropes (3.2.0 phase 3): one thin-instanced cylinder per rope from the anchor point to a harness, drawn for
 * the local player and every remote on a rope (no collision). Slots by owner key; a rope not set this frame keeps
 * its last place until `hide`.
 */
export class Ropes {
  private mesh: Mesh | null = null;
  private buf = new Float32Array(MAX_ROPES * 16);
  private keys: (string | null)[] = new Array<string | null>(MAX_ROPES).fill(null);
  private m = new Matrix();
  private q = new Quaternion();
  private s = new Vector3();
  private p = new Vector3();
  private d = new Vector3();
  private dirty = false;

  constructor(private scene: Scene) {}

  private ensure(): Mesh {
    if (this.mesh) return this.mesh;
    const m = CreateCylinder('ropes', { height: 1, diameter: 1, tessellation: 6 }, this.scene);
    const mat = new StandardMaterial('ropeMat', this.scene);
    mat.diffuseColor = Color3.FromHexString('#4a4136');
    mat.specularColor = Color3.Black();
    m.material = mat;
    // every slot starts collapsed (zero scale)
    this.buf.fill(0);
    m.thinInstanceSetBuffer('matrix', this.buf, 16, false);
    m.alwaysSelectAsActiveMesh = true;
    m.isPickable = false;
    this.mesh = m;
    return m;
  }

  /** Place `key`'s rope from (ax, ay, az) to (bx, by, bz). */
  set(key: string, ax: number, ay: number, az: number, bx: number, by: number, bz: number): void {
    let i = this.keys.indexOf(key);
    if (i < 0) i = this.keys.indexOf(null);
    if (i < 0) return;
    this.keys[i] = key;
    this.ensure();
    const d = this.d.set(bx - ax, by - ay, bz - az);
    const len = d.length();
    if (len < 1e-3) return this.hide(key);
    d.scaleInPlace(1 / len);
    // the unit cylinder stands along +Y: turn +Y onto the rope's direction
    if (1 + d.y < 1e-4) this.q.set(1, 0, 0, 0);
    else this.q.set(d.z, 0, -d.x, 1 + d.y).normalize();
    this.s.set(0.022, len, 0.022);
    this.p.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    Matrix.ComposeToRef(this.s, this.q, this.p, this.m);
    this.m.copyToArray(this.buf, i * 16);
    this.dirty = true;
  }

  hide(key: string): void {
    const i = this.keys.indexOf(key);
    if (i < 0) return;
    this.keys[i] = null;
    for (let k = 0; k < 16; k++) this.buf[i * 16 + k] = 0;
    this.dirty = true;
  }

  /** Upload changes (once per frame). */
  flush(): void {
    if (!this.dirty || !this.mesh) return;
    this.dirty = false;
    this.mesh.thinInstanceBufferUpdated('matrix');
  }
}
