import { TransformNode, Vector3, type InstancedMesh, type Scene, type Vector4 } from '../core/babylon';
import type { PartLibrary } from '../world/partLibrary';
import { DOG_BODY as BODY, DOG_BODY_Y, DOG_HEAD_UP, DOG_HEAD_Z, DOG_LEG as LEG, dogGaitStep, dogHead, dogPose, type DogPose } from './dogHead';

/** (Step 14) every dog body not yet disposed (local enemies and co-op puppets): thermal vision paints them. */
export const LIVE_DOGS: DogModel[] = [];

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
  private readonly pose: DogPose = { bodyY: DOG_BODY_Y, swing: 0, headPitch: 0, headZ: DOG_HEAD_Z, tail: 0 };
  /** (rig-pose-fix S6) The drawn head centre standing (`dogHead` at the drawn root): presentation only. The host's hit
   *  volume is `dogHead` on the sim state (`Enemy.syncHitboxes`); nothing reads the scene graph for it. */
  readonly head = new Vector3();
  /** (Step 14) thermal vision's warmth on this body, 0..1 (render-only `pattern.w` glow). */
  private heatK = 0;
  /** (Step 14) seconds since it was laid down (dead): thermal cools it like a humanoid body. */
  downAge = 0;

  constructor(scene: Scene, lib: PartLibrary, color: string, dark: string) {
    this.root = new TransformNode('dog', scene);
    this.body = new TransformNode('dog-body', scene);
    this.body.parent = this.root;
    this.body.position.y = DOG_BODY_Y;
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
    this.headPivot.position.set(0, DOG_HEAD_UP, DOG_HEAD_Z);
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
    LIVE_DOGS.push(this);
  }

  /** Per render frame: place it, trot by speed, head up by `alert` 0..1, a bite lunge by `bite` 0..1. The standing pose
   *  is `dogPose` / `dogHead` (src/ai/dogHead.ts), the hit volume's model. `phase`: the sim's gait clock (the host's
   *  `Enemy`); omitted (the co-op puppet, the lying body), the model steps its own clock from `speed`. */
  update(dt: number, x: number, y: number, z: number, yaw: number, speed: number, alert: number, bite: number, phase?: number): void {
    const r = this.root;
    r.position.set(x, y, z);
    r.rotation.y = yaw;
    if (this.downTarget > 0) this.downAge += dt;
    this.down += (this.downTarget - this.down) * Math.min(1, dt * 5);
    this.phase = phase ?? dogGaitStep(this.phase, speed, dt);
    const pose = dogPose(speed, this.phase, alert, bite, this.pose);
    if (this.down > 0.01) {
      // on its side, legs out
      r.rotation.z = this.down * 1.45;
      this.body.position.y = DOG_BODY_Y * (1 - this.down) + 0.18 * this.down;
      for (let i = 0; i < 4; i++) this.legs[i]!.rotation.x = 0;
      this.headPivot.rotation.x = 0.2;
    } else {
      r.rotation.z = 0;
      // trot: diagonal pairs (FL + BR, FR + BL)
      const s = pose.swing;
      this.legs[0]!.rotation.x = s;
      this.legs[3]!.rotation.x = s;
      this.legs[1]!.rotation.x = -s;
      this.legs[2]!.rotation.x = -s;
      this.body.position.y = pose.bodyY;
      this.headPivot.rotation.x = pose.headPitch;
      this.headPivot.position.z = pose.headZ;
      dogHead(r.position, yaw, speed, this.phase, alert, bite, this.head);
    }
    this.tail.rotation.y = pose.tail;
  }

  /** Lying down (dead / knocked out) or back up. */
  layDown(on = true): void {
    this.downTarget = on ? 1 : 0;
    this.downAge = 0;
  }

  /** Lying down (dead) for thermal's cooling. */
  get isDown(): boolean {
    return this.downTarget > 0;
  }

  /** (Step 14) thermal vision's warmth (render only; nothing in gameplay reads it). Only touches buffers on a change. */
  setHeat(k: number): void {
    if (k === this.heatK) return;
    this.heatK = k;
    const parts = this.parts;
    for (let i = 0; i < parts.length; i++) {
      const pt = parts[i]!.instancedBuffers?.pattern as Vector4 | undefined;
      if (pt) pt.w = k;
    }
  }

  get heat(): number {
    return this.heatK;
  }

  /** (Step 14, tests) the first part's `pattern.w` (the value the shader reads). */
  partHeat(): number {
    const pt = this.parts[0]?.instancedBuffers?.pattern as Vector4 | undefined;
    return pt ? pt.w : 0;
  }

  setVisible(on: boolean): void {
    this.root.setEnabled(on);
  }

  dispose(): void {
    for (const p of this.parts) p.dispose();
    this.parts.length = 0;
    this.root.dispose();
    const li = LIVE_DOGS.indexOf(this);
    if (li >= 0) LIVE_DOGS.splice(li, 1);
  }
}
