import { Color3, CreateCylinder, CreateSphere, Matrix, Quaternion, StandardMaterial, Vector3, type Mesh, type Scene, type TransformNode } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';

/** Limb segments per figure (joint pairs) and their radii (m). */
const SEGS = 11;
const RADII = [0.15, 0.06, 0.05, 0.06, 0.05, 0.085, 0.06, 0.085, 0.06, 0.07, 0.07];
/** WebGL depth function ALWAYS (draw over everything). */
const DEPTH_ALWAYS = 519;

/** (LR16-6) Moves a captured point in place (along its camera ray) and returns its scale; sizes follow it. */
export interface PointWarp {
  warp(p: Vector3): number;
}

/**
 * Frozen silhouettes of rigs (the LKP ghost): a pose captured from a `CharacterRig` drawn as
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
  /** (LR16-6) The joints of the figure being captured (reused: `add` runs every frame for thermal's door silhouettes). */
  private readonly jn: TransformNode[] = [];
  /** (LR16-6) Each captured point's warp scale (1 without a warp). */
  private readonly sc = new Float32Array(SEGS * 2);
  private readonly hp = new Vector3();

  constructor(
    scene: Scene,
    name: string,
    readonly max: number,
    color: Color3,
    overlay = false,
    fog = true,
  ) {
    const mat = new StandardMaterial(`${name}Mat`, scene);
    mat.disableLighting = true;
    mat.emissiveColor = color;
    mat.diffuseColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.alpha = 0;
    mat.fogEnabled = fog;
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

  /** Capture a rig's current pose as the next figure. Returns false when full. `warp` (LR16-6) moves each captured point
   *  and scales the limb and head sizes with it. No allocation. */
  add(rig: CharacterRig, warp?: PointWarp): boolean {
    if (this.n >= this.max) return false;
    const j = this.jn;
    j[0] = rig.hips; j[1] = rig.neck;
    j[2] = rig.shoulderL; j[3] = rig.elbowL; j[4] = rig.elbowL; j[5] = rig.wristL;
    j[6] = rig.shoulderR; j[7] = rig.elbowR; j[8] = rig.elbowR; j[9] = rig.wristR;
    j[10] = rig.hipL; j[11] = rig.kneeL; j[12] = rig.kneeL; j[13] = rig.ankleL;
    j[14] = rig.hipR; j[15] = rig.kneeR; j[16] = rig.kneeR; j[17] = rig.ankleR;
    j[18] = rig.shoulderL; j[19] = rig.shoulderR; j[20] = rig.hipL; j[21] = rig.hipR;
    for (let i = 0; i < SEGS * 2; i++) {
      this.pts[i]!.copyFrom(j[i]!.getAbsolutePosition());
      this.sc[i] = warp ? warp.warp(this.pts[i]!) : 1;
    }
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
      const r = RADII[k]! * (rig.height / 1.75) * (this.sc[k * 2]! + this.sc[k * 2 + 1]!) * 0.5;
      this.s.set(r, len + r * 0.6, r);
      Matrix.ComposeToRef(this.s, this.q, this.c, this.m);
      this.m.copyToArray(this.limbBuf, (f * SEGS + k) * 16);
    }
    // (LR16-6) a copy: the warp must not move the rig's own cached position
    const h = this.hp.copyFrom(rig.headNode.getAbsolutePosition());
    const hk = (rig.height / 1.75) * (warp ? warp.warp(h) : 1);
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

  /** (LR16-6) The figures' emissive grey (a uniform: no shader rebuild). */
  setGrey(k: number): void {
    const c = this.mat.emissiveColor;
    if (c.r !== k || c.g !== k || c.b !== k) c.set(k, k, k);
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
