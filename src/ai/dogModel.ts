import { TransformNode, Vector3, type InstancedMesh, type Scene } from '../core/babylon';
import type { PartLibrary } from '../world/partLibrary';

/** Body sizes (m): shoulder height, body length, leg length. */
const SHOULDER = 0.62;
const LEG = 0.5;
const BODY = 0.78;

/**
 * The guard dog's body (procedural, smooth parts): a trotting quadruped driven by the shared enemy brain (it
 * replaces the humanoid rig's look). Diagonal leg pairs swing with the gait phase, the head comes up when alert
 * and snaps forward on a bite; dead or knocked out it lies on its side.
 */
export class DogModel {
  readonly root: TransformNode;
  private body: TransformNode;
  private headPivot: TransformNode;
  private legs: TransformNode[] = [];
  private tail: TransformNode;
  private parts: InstancedMesh[] = [];
  private phase = 0;
  private down = 0;
  private downTarget = 0;
  /** World position of the head (hit volume, sonar). */
  readonly head = new Vector3();

  constructor(scene: Scene, lib: PartLibrary, color: string, dark: string) {
    this.root = new TransformNode('dog', scene);
    this.body = new TransformNode('dog-body', scene);
    this.body.parent = this.root;
    this.body.position.y = SHOULDER - 0.1;
    const add = (shape: Parameters<PartLibrary['instance']>[0], hex: string, parent: TransformNode, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0, rx = 0): InstancedMesh => {
      const m = lib.instance(shape, hex, 'dog-part');
      m.parent = parent;
      m.scaling.set(sx, sy, sz);
      m.position.set(x, y, z);
      m.rotation.x = rx;
      this.parts.push(m);
      return m;
    };
    // trunk: a long pill, a deeper chest at the front
    add('pill', color, this.body, 0.3, 0.3, BODY);
    add('sphere', color, this.body, 0.34, 0.36, 0.36, 0, 0.02, BODY * 0.32);
    // head on a neck pivot: skull, snout, nose, ears
    this.headPivot = new TransformNode('dog-head', scene);
    this.headPivot.parent = this.body;
    this.headPivot.position.set(0, 0.14, BODY * 0.48);
    add('capsule', color, this.headPivot, 0.18, 0.3, 0.18, 0, 0.06, 0.04, -0.9);
    add('sphere', color, this.headPivot, 0.22, 0.2, 0.24, 0, 0.16, 0.14);
    add('pill', dark, this.headPivot, 0.11, 0.1, 0.2, 0, 0.12, 0.3);
    add('sphere', '#101010', this.headPivot, 0.05, 0.04, 0.04, 0, 0.14, 0.4);
    add('pill', dark, this.headPivot, 0.05, 0.12, 0.08, 0.07, 0.29, 0.1);
    add('pill', dark, this.headPivot, 0.05, 0.12, 0.08, -0.07, 0.29, 0.1);
    // legs from shoulder / hip pivots (front left, front right, back left, back right)
    const lx = 0.1;
    const fz = BODY * 0.3;
    const bz = -BODY * 0.34;
    for (const [x, z] of [
      [-lx, fz],
      [lx, fz],
      [-lx, bz],
      [lx, bz],
    ] as const) {
      const p = new TransformNode('dog-leg', scene);
      p.parent = this.body;
      p.position.set(x, -0.04, z);
      add('capsule', color, p, 0.1, LEG, 0.1, 0, -LEG / 2, 0);
      add('sphere', dark, p, 0.09, 0.06, 0.12, 0, -LEG + 0.02, 0.03);
      this.legs.push(p);
    }
    this.tail = new TransformNode('dog-tail', scene);
    this.tail.parent = this.body;
    this.tail.position.set(0, 0.1, -BODY * 0.48);
    add('capsule', color, this.tail, 0.06, 0.32, 0.06, 0, 0.14, -0.04, -0.5);
  }

  /** Per render frame: place it, trot by speed, head up by `alert` 0..1, a bite lunge by `bite` 0..1. */
  update(dt: number, x: number, y: number, z: number, yaw: number, speed: number, alert: number, bite: number): void {
    const r = this.root;
    r.position.set(x, y, z);
    r.rotation.y = yaw;
    this.down += (this.downTarget - this.down) * Math.min(1, dt * 5);
    if (this.down > 0.01) {
      // on its side, legs out
      r.rotation.z = this.down * 1.45;
      this.body.position.y = (SHOULDER - 0.1) * (1 - this.down) + 0.18 * this.down;
      for (let i = 0; i < 4; i++) this.legs[i]!.rotation.x = 0;
      this.headPivot.rotation.x = 0.2;
    } else {
      r.rotation.z = 0;
      // trot: stride rate from speed, diagonal pairs (FL + BR, FR + BL)
      const rate = speed < 0.05 ? 0 : 1.6 + speed * 0.55;
      this.phase += dt * rate * Math.PI * 2;
      const amp = Math.min(0.75, speed * 0.22);
      const s = Math.sin(this.phase) * amp;
      this.legs[0]!.rotation.x = s;
      this.legs[3]!.rotation.x = s;
      this.legs[1]!.rotation.x = -s;
      this.legs[2]!.rotation.x = -s;
      this.body.position.y = SHOULDER - 0.1 + Math.abs(Math.cos(this.phase)) * amp * 0.04;
      this.headPivot.rotation.x = -0.25 * alert + 0.35 * bite + Math.sin(this.phase * 0.5) * 0.04;
      this.headPivot.position.z = BODY * 0.48 + bite * 0.12;
    }
    this.tail.rotation.y = Math.sin(this.phase * 1.3 + 1) * (0.25 + 0.3 * alert);
    this.headPivot.computeWorldMatrix(true);
    this.head.copyFrom(this.headPivot.getAbsolutePosition());
    this.head.y += 0.14;
  }

  /** Lying down (dead / knocked out) or back up. */
  layDown(on = true): void {
    this.downTarget = on ? 1 : 0;
  }

  setVisible(on: boolean): void {
    this.root.setEnabled(on);
  }

  dispose(): void {
    for (const p of this.parts) p.dispose();
    this.parts.length = 0;
    this.root.dispose();
  }
}
