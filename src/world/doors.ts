import {
  Color3,
  CreateBox,
  Matrix,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeBox,
  Quaternion,
  PBRMaterial,
  TransformNode,
  Vector3,
  type Mesh,
  type Scene,
} from '../core/babylon';
import { G } from '../physics/groups';
import type { Door, TraversalAnchors } from './anchors';
import { hyp2 } from '../core/mathx';

/** How a door was opened: quietly by hand, bashed open at a sprint, or by an enemy walking through. */
export type DoorHow = 'quiet' | 'bash' | 'enemy' | 'close';

/** Open angle (rad) and swing times (s). */
export const DOOR = {
  openAngle: 1.75,
  quietTime: 1.1,
  bashTime: 0.22,
  enemyTime: 0.7,
  closeTime: 0.8,
  thickness: 0.05,
  /** Within this of the doorway centre an enemy pushes a closed door open (m). */
  enemyReach: 1.0,
  /** Nobody within this of the doorway for it to close (m). */
  clearance: 0.75,
} as const;

export interface DoorState {
  anchor: Door;
  /** 0 closed .. 1 open. */
  open: number;
  target: 0 | 1;
  rate: number;
  /** Doorway centre (closed leaf middle) on the floor. */
  cx: number;
  cz: number;
  body: PhysicsBody | null;
  node: TransformNode | null;
  index: number;
}

/**
 * Hinged doors (the `Door` anchors): one thin-instanced leaf mesh, a static collision body only while closed
 * (added by `arm`, after the nav grid is built, so doorways stay walkable for the AI). A closed door blocks
 * movement, sight and light; opening removes its body at once and swings the leaf (quietly by hand, fast and
 * loud when bashed at a sprint, briskly when an enemy walks through). `onSound` reports each for noise.
 */
export class Doors {
  readonly list: DoorState[] = [];
  private mesh: Mesh | null = null;
  private buf: Float32Array | null = null;
  private armed = false;
  private m = new Matrix();
  private q = new Quaternion();
  private s = new Vector3();
  private p = new Vector3();
  onSound: ((d: DoorState, how: DoorHow) => void) | null = null;

  constructor(
    private scene: Scene,
    anchors: TraversalAnchors,
  ) {
    const doors = anchors.doors;
    if (!doors.length) return;
    doors.forEach((a, i) => {
      const cx = a.hinge.x + Math.sin(a.yaw) * a.width * 0.5;
      const cz = a.hinge.z + Math.cos(a.yaw) * a.width * 0.5;
      this.list.push({ anchor: a, open: 0, target: 0, rate: 0, cx, cz, body: null, node: null, index: i });
    });
    const mat = new PBRMaterial('doorMat', scene);
    mat.albedoColor = Color3.FromHexString('#6e5a43').toLinearSpace();
    mat.metallic = 0;
    mat.roughness = 0.7;
    mat.usePhysicalLightFalloff = false;
    mat.directIntensity = Math.PI;
    mat.freeze();
    const mesh = CreateBox('doors', { size: 1 }, scene);
    mesh.material = mat;
    mesh.isPickable = false;
    this.buf = new Float32Array(doors.length * 16);
    mesh.thinInstanceSetBuffer('matrix', this.buf, 16, false);
    this.mesh = mesh;
    for (const d of this.list) this.write(d);
    mesh.thinInstanceBufferUpdated('matrix');
    mesh.thinInstanceRefreshBoundingInfo(false);
  }

  /** Leaf matrix at its current swing. */
  private write(d: DoorState): void {
    const a = d.anchor;
    const yaw = a.yaw + a.swing * DOOR.openAngle * smooth(d.open);
    Quaternion.RotationYawPitchRollToRef(yaw, 0, 0, this.q);
    const w = a.width - 0.04;
    this.s.set(DOOR.thickness, a.height, w);
    this.p.set(a.hinge.x + Math.sin(yaw) * (0.02 + w / 2), a.hinge.y + a.height / 2, a.hinge.z + Math.cos(yaw) * (0.02 + w / 2));
    Matrix.ComposeToRef(this.s, this.q, this.p, this.m);
    this.m.copyToArray(this.buf!, d.index * 16);
  }

  /** Collision on: closed doors get their bodies (call once the nav grid is built). */
  arm(): void {
    if (this.armed) return;
    this.armed = true;
    for (const d of this.list) if (d.open === 0) this.addBody(d);
  }

  private addBody(d: DoorState): void {
    if (d.body || !this.armed) return;
    const a = d.anchor;
    const node = new TransformNode(`door-${a.id}`, this.scene);
    node.position.set(d.cx, a.hinge.y + a.height / 2, d.cz);
    node.rotationQuaternion = Quaternion.RotationYawPitchRoll(a.yaw, 0, 0);
    const body = new PhysicsBody(node, PhysicsMotionType.STATIC, false, this.scene);
    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(DOOR.thickness * 2, a.height, a.width - 0.04), this.scene);
    shape.filterMembershipMask = G.STATIC;
    shape.filterCollideMask = 0xffffffff & ~G.STATIC;
    body.shape = shape;
    d.body = body;
    d.node = node;
  }

  private removeBody(d: DoorState): void {
    if (!d.body) return;
    d.body.shape?.dispose();
    d.body.dispose();
    d.node?.dispose();
    d.body = null;
    d.node = null;
  }

  /** Open a door (`how` sets the swing speed and the sound). False when locked or already opening. */
  open(d: DoorState, how: 'quiet' | 'bash' | 'enemy'): boolean {
    if (d.anchor.locked || d.target === 1) return false;
    d.target = 1;
    d.rate = 1 / (how === 'bash' ? DOOR.bashTime : how === 'enemy' ? DOOR.enemyTime : DOOR.quietTime);
    this.removeBody(d);
    this.onSound?.(d, how);
    return true;
  }

  /** Close a door, unless someone stands in the doorway (`occupied`). */
  close(d: DoorState, occupied: (x: number, z: number, r: number) => boolean): boolean {
    if (d.target === 0 || occupied(d.cx, d.cz, DOOR.clearance)) return false;
    d.target = 0;
    d.rate = 1 / DOOR.closeTime;
    this.onSound?.(d, 'close');
    return true;
  }

  /** Force a door's state (co-op clients follow the host): open drops the body and swings, closed restores it. */
  setOpen(d: DoorState, open: boolean): void {
    if ((d.target === 1) === open) return;
    d.target = open ? 1 : 0;
    d.rate = 1 / (open ? DOOR.quietTime : DOOR.closeTime);
    // (closed: the body comes back when the leaf is shut, in `update`)
    if (open) this.removeBody(d);
  }

  /** Every door open, no collision. */
  openAll(): void {
    for (const d of this.list) {
      this.removeBody(d);
      d.open = 1;
      d.target = 1;
      this.write(d);
    }
    this.mesh?.thinInstanceBufferUpdated('matrix');
    this.mesh?.thinInstanceRefreshBoundingInfo(false);
  }

  /** Leaves shown or hidden (the benchmark flight: open doorways, no leaf standing out into a corridor). */
  setVisible(on: boolean): void {
    if (this.mesh) this.mesh.isVisible = on;
  }

  /** Nearest door within `r` of (x, z). */
  nearest(x: number, z: number, r: number): DoorState | null {
    let best: DoorState | null = null;
    let bd = r;
    for (const d of this.list) {
      const k = hyp2(d.cx - x, d.cz - z);
      if (k < bd) {
        bd = k;
        best = d;
      }
    }
    return best;
  }

  /** An enemy at (x, z) pushes open any closed door it walks into. */
  pushOpen(x: number, z: number): void {
    for (let i = 0; i < this.list.length; i++) {
      const d = this.list[i]!;
      if (d.target === 0 && hyp2(d.cx - x, d.cz - z) < DOOR.enemyReach) this.open(d, 'enemy');
    }
  }

  update(dt: number): void {
    if (!this.mesh) return;
    let moved = false;
    for (const d of this.list) {
      if (d.open === d.target) continue;
      d.open = d.target === 1 ? Math.min(1, d.open + d.rate * dt) : Math.max(0, d.open - d.rate * dt);
      this.write(d);
      moved = true;
      if (d.open === 0) this.addBody(d);
    }
    if (moved) {
      this.mesh.thinInstanceBufferUpdated('matrix');
      this.mesh.thinInstanceRefreshBoundingInfo(false);
    }
  }

  dispose(): void {
    for (const d of this.list) this.removeBody(d);
    this.mesh?.material?.dispose();
    this.mesh?.dispose();
  }
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}
