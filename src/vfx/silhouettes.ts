import { Color3, CreateCylinder, CreateSphere, Matrix, Quaternion, StandardMaterial, Vector3, type Mesh, type Scene, type TransformNode } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';

/** Limb segments per figure (joint pairs) and their radii (m). */
const SEGS = 11;
const RADII = [0.15, 0.06, 0.05, 0.06, 0.05, 0.085, 0.06, 0.085, 0.06, 0.07, 0.07];
/** WebGL depth function ALWAYS (draw over everything). */
const DEPTH_ALWAYS = 519;

/**
 * Frozen silhouettes of rigs (the LKP ghost, sonar marks): a pose captured from a `CharacterRig` drawn as
 * capsule-ish limbs and a head, unlit and translucent. One thin-instanced cylinder mesh for every limb of
 * every figure plus one for the heads: 2 draw calls whatever the count. `overlay` draws them over the world
 * (seen through walls).
 */
export class Silhouettes {
  private limbs: Mesh;
  private heads: Mesh;
  private mat: StandardMaterial;
  private limbBuf: Float32Array;
  private headBuf: Float32Array;
  private n = 0;
  private pts: Vector3[] = [];
  private m = new Matrix();
  private q = new Quaternion();
  private s = new Vector3();
  private c = new Vector3();
  private d = new Vector3();
  private enabled = false;

  constructor(
    scene: Scene,
    name: string,
    readonly max: number,
    color: Color3,
    overlay = false,
  ) {
    const mat = new StandardMaterial(`${name}Mat`, scene);
    mat.disableLighting = true;
    mat.emissiveColor = color;
    mat.diffuseColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.alpha = 0;
    if (overlay) {
      mat.depthFunction = DEPTH_ALWAYS;
      mat.disableDepthWrite = true;
    }
    this.mat = mat;
    this.limbBuf = new Float32Array(max * SEGS * 16);
    this.headBuf = new Float32Array(max * 16);
    this.limbs = CreateCylinder(`${name}Limbs`, { diameter: 2, height: 1, tessellation: 10 }, scene);
    this.limbs.material = mat;
    this.limbs.isPickable = false;
    this.limbs.thinInstanceSetBuffer('matrix', this.limbBuf, 16, false);
    this.heads = CreateSphere(`${name}Heads`, { diameter: 1, segments: 8 }, scene);
    this.heads.material = mat;
    this.heads.isPickable = false;
    this.heads.thinInstanceSetBuffer('matrix', this.headBuf, 16, false);
    for (let i = 0; i < SEGS * 2; i++) this.pts.push(new Vector3());
    this.setEnabled(false);
  }

  private setEnabled(v: boolean): void {
    if (this.enabled === v) return;
    this.enabled = v;
    this.limbs.setEnabled(v);
    this.heads.setEnabled(v);
  }

  /** Start a new set of figures (clears the previous ones). */
  begin(): void {
    this.n = 0;
  }

  /** Capture a rig's current pose as the next figure. Returns false when full. */
  add(rig: CharacterRig): boolean {
    if (this.n >= this.max) return false;
    const j: TransformNode[] = [rig.hips, rig.neck, rig.shoulderL, rig.elbowL, rig.elbowL, rig.wristL, rig.shoulderR, rig.elbowR, rig.elbowR, rig.wristR, rig.hipL, rig.kneeL, rig.kneeL, rig.ankleL, rig.hipR, rig.kneeR, rig.kneeR, rig.ankleR, rig.shoulderL, rig.shoulderR, rig.hipL, rig.hipR];
    for (let i = 0; i < SEGS * 2; i++) this.pts[i]!.copyFrom(j[i]!.getAbsolutePosition());
    const f = this.n;
    for (let k = 0; k < SEGS; k++) {
      const a = this.pts[k * 2]!;
      const b = this.pts[k * 2 + 1]!;
      b.subtractToRef(a, this.d);
      const len = Math.max(0.02, this.d.length());
      this.d.scaleInPlace(1 / len);
      Vector3.LerpToRef(a, b, 0.5, this.c);
      // rotate +Y onto the segment
      const dot = this.d.y;
      if (dot < -0.9999) Quaternion.RotationAxisToRef(Vector3.RightReadOnly, Math.PI, this.q);
      else {
        this.q.set(this.d.z, 0, -this.d.x, 1 + dot);
        this.q.normalize();
      }
      const r = RADII[k]! * (rig.height / 1.75);
      this.s.set(r, len + r * 0.6, r);
      Matrix.ComposeToRef(this.s, this.q, this.c, this.m);
      this.m.copyToArray(this.limbBuf, (f * SEGS + k) * 16);
    }
    const h = rig.headNode.getAbsolutePosition();
    const hk = rig.height / 1.75;
    this.s.set(0.2 * hk, 0.24 * hk, 0.21 * hk);
    this.q.set(0, 0, 0, 1);
    Matrix.ComposeToRef(this.s, this.q, h, this.m);
    this.m.copyToArray(this.headBuf, f * 16);
    this.n++;
    return true;
  }

  /** Upload the captured figures. */
  end(): void {
    this.limbs.thinInstanceCount = this.n * SEGS;
    this.heads.thinInstanceCount = this.n;
    this.limbs.thinInstanceBufferUpdated('matrix');
    this.heads.thinInstanceBufferUpdated('matrix');
    this.limbs.thinInstanceRefreshBoundingInfo(false);
    this.heads.thinInstanceRefreshBoundingInfo(false);
  }

  get count(): number {
    return this.n;
  }

  /** Opacity 0..1 (0 hides the meshes). */
  setAlpha(a: number): void {
    this.mat.alpha = a;
    this.setEnabled(a > 0.005 && this.n > 0);
  }

  dispose(): void {
    this.limbs.dispose();
    this.heads.dispose();
    this.mat.dispose();
  }
}
