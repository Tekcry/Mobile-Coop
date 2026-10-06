import { Color3, CreateCylinder, CreateSphere, Matrix, Quaternion, StandardMaterial, Vector3, type Mesh, type Scene, type TransformNode } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';

/** Limb segments of the silhouette (joint pairs) and their radii (m). */
const SEGS = 11;
const RADII = [0.15, 0.06, 0.05, 0.06, 0.05, 0.085, 0.06, 0.085, 0.06, 0.07, 0.07];

/**
 * Last Known Position ghost (Blacklist): a pale silhouette of the player frozen in the pose they were last
 * seen in, where the enemies think they are. One thin-instanced cylinder mesh for the limbs plus a sphere
 * for the head (2 draw calls), unlit and translucent; fades in and out.
 */
export class LkpGhost {
  private limbs: Mesh;
  private head: Mesh;
  private mat: StandardMaterial;
  private buf = new Float32Array(SEGS * 16);
  private pts: Vector3[] = [];
  private headPt = new Vector3();
  private alpha = 0;
  /** Wanted visibility (fades towards it). */
  show = false;
  /** Has a captured pose. */
  captured = false;
  /** Where it stands (feet). */
  readonly at = new Vector3();
  private m = new Matrix();
  private q = new Quaternion();
  private s = new Vector3();
  private c = new Vector3();
  private d = new Vector3();

  constructor(scene: Scene) {
    const mat = new StandardMaterial('lkpGhostMat', scene);
    mat.disableLighting = true;
    mat.emissiveColor = new Color3(0.92, 0.96, 1);
    mat.diffuseColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.alpha = 0;
    mat.backFaceCulling = true;
    this.mat = mat;
    this.limbs = CreateCylinder('lkpGhostLimbs', { diameter: 2, height: 1, tessellation: 10 }, scene);
    this.limbs.material = mat;
    this.limbs.isPickable = false;
    this.limbs.thinInstanceSetBuffer('matrix', this.buf, 16, false);
    this.head = CreateSphere('lkpGhostHead', { diameter: 1, segments: 8 }, scene);
    this.head.material = mat;
    this.head.isPickable = false;
    this.limbs.setEnabled(false);
    this.head.setEnabled(false);
    for (let i = 0; i < SEGS * 2; i++) this.pts.push(new Vector3());
  }

  /** Freeze the rig's current pose as the ghost (called while the player is in sight). */
  capture(rig: CharacterRig, feet: Vector3): void {
    const j: TransformNode[] = [rig.hips, rig.neck, rig.shoulderL, rig.elbowL, rig.elbowL, rig.wristL, rig.shoulderR, rig.elbowR, rig.elbowR, rig.wristR, rig.hipL, rig.kneeL, rig.kneeL, rig.ankleL, rig.hipR, rig.kneeR, rig.kneeR, rig.ankleR, rig.shoulderL, rig.shoulderR, rig.hipL, rig.hipR];
    for (let i = 0; i < SEGS * 2; i++) this.pts[i]!.copyFrom(j[i]!.getAbsolutePosition());
    this.headPt.copyFrom(rig.headNode.getAbsolutePosition());
    this.at.copyFrom(feet);
    // limbs: a cylinder from each joint to the next
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
      const r = RADII[k]!;
      this.s.set(r, len + r * 0.6, r);
      Matrix.ComposeToRef(this.s, this.q, this.c, this.m);
      this.m.copyToArray(this.buf, k * 16);
    }
    this.limbs.thinInstanceBufferUpdated('matrix');
    this.limbs.thinInstanceRefreshBoundingInfo(false);
    this.head.position.copyFrom(this.headPt);
    this.head.scaling.set(0.2, 0.24, 0.21);
    this.captured = true;
  }

  /** Per render frame: fade towards `show`. */
  update(dt: number): void {
    const want = this.show && this.captured ? 0.3 : 0;
    const k = Math.min(1, dt * (want > this.alpha ? 4 : 2.5));
    this.alpha += (want - this.alpha) * k;
    if (this.alpha < 0.01 && want === 0) {
      if (this.limbs.isEnabled()) {
        this.limbs.setEnabled(false);
        this.head.setEnabled(false);
      }
      this.alpha = 0;
      return;
    }
    if (!this.limbs.isEnabled()) {
      this.limbs.setEnabled(true);
      this.head.setEnabled(true);
    }
    this.mat.alpha = this.alpha;
  }

  get visible(): boolean {
    return this.alpha > 0.05;
  }

  dispose(): void {
    this.limbs.dispose();
    this.head.dispose();
    this.mat.dispose();
  }
}
