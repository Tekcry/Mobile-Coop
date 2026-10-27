/**
 * (coop-kit K5a, K5b) Plank Bridge's world piece: one scaffold board mesh per plank spot (one thin-instanced box), drawn
 * from its kit device (`game/kit/plankBridge.ts` `PlankDevice`): on its stack or the floor where it lies, while carried
 * between the two carriers' hand points (the device's ends, set each fixed step on every page from the drawn bodies: no
 * board pose on the wire), sliding out while it is laid. (K5b) A laid, settled board (`laid`) gets a static collider
 * (width x thickness x length, at its pose) so both players walk across it at any pace; it goes when the board is lifted
 * or reset. Not a nav link: guards do not path over it (PLAN).
 *
 * The world (`world.ts`) builds `PlankBoards(scene, level)` when the level has plank spots (`kitSpotsOf`, every spot
 * whatever the flags, as the devices: inert while the id is off, the live board lies on its stack); the move's `tick`
 * calls `update(devices.list)` each fixed step after it set the ends, on host and client. Babylon only through
 * `core/babylon`.
 */
import { Color3, CreateBox, Matrix, PBRMaterial, PhysicsBody, PhysicsMotionType, PhysicsShapeBox, Quaternion, TransformNode, Vector3, type Mesh, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import type { KitDevice } from '../game/kit/registry';
import { kitSpotsOf } from '../game/kit/kitApi';
import { isPlankDevice, newPlankDevice, plankPose, PLANK, type PlankDevice, type PlankPose } from '../game/kit/plankBridge';

/** The board's colour (weathered scaffold pine). */
export const PLANK_PIECE = { color: '#8a7350' } as const;

interface Slot {
  id: string;
  len: number;
  index: number;
  /** The pose last written (a redraw only when it moved). */
  readonly pose: PlankPose;
  /** (K5b) The laid board's static body (null when not laid). */
  body: PhysicsBody | null;
  node: TransformNode | null;
}

/** The level's live scaffold boards (render, and (K5b) a laid board's collider). */
export class PlankBoards {
  private readonly slots: Slot[] = [];
  private readonly byId = new Map<string, Slot>();
  private mesh: Mesh | null = null;
  private buf: Float32Array | null = null;
  private readonly m = new Matrix();
  private readonly q = new Quaternion();
  private readonly sc = new Vector3();
  private readonly p = new Vector3();
  private readonly at: PlankPose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };

  constructor(
    private readonly scene: Scene,
    level: unknown,
  ) {
    const spots = kitSpotsOf(level, 'plankBridge');
    if (!spots.length) return;
    const mat = new PBRMaterial('plankMat', scene);
    mat.albedoColor = Color3.FromHexString(PLANK_PIECE.color).toLinearSpace();
    mat.metallic = 0;
    mat.roughness = 0.85;
    mat.usePhysicalLightFalloff = false;
    mat.directIntensity = Math.PI;
    mat.freeze();
    const mesh = CreateBox('plankBoards', { size: 1 }, scene);
    mesh.material = mat;
    mesh.isPickable = false;
    this.buf = new Float32Array(spots.length * 16);
    mesh.thinInstanceSetBuffer('matrix', this.buf, 16, false);
    this.mesh = mesh;
    for (let i = 0; i < spots.length; i++) {
      // the board on its stack until the devices exist (the same pose a fresh device has)
      const d = newPlankDevice(spots[i]!);
      const slot: Slot = { id: d.id, len: d.len, index: i, pose: { x: NaN, y: 0, z: 0, yaw: 0, pitch: 0 }, body: null, node: null };
      this.slots.push(slot);
      this.byId.set(slot.id, slot);
      this.write(slot, plankPose(d, this.at));
    }
    mesh.thinInstanceBufferUpdated('matrix');
    mesh.thinInstanceRefreshBoundingInfo(false);
  }

  /** The boards' mesh (null without plank spots). */
  get boardMesh(): Mesh | null {
    return this.mesh;
  }

  /** (K5b, tests) How many laid boards have a collider now. */
  get colliders(): number {
    let n = 0;
    for (const s of this.slots) if (s.body) n++;
    return n;
  }

  private write(s: Slot, at: PlankPose): void {
    const o = s.pose;
    o.x = at.x;
    o.y = at.y;
    o.z = at.z;
    o.yaw = at.yaw;
    o.pitch = at.pitch;
    Quaternion.RotationYawPitchRollToRef(at.yaw, at.pitch, 0, this.q);
    this.sc.set(PLANK.width, PLANK.thick, s.len);
    this.p.set(at.x, at.y, at.z);
    Matrix.ComposeToRef(this.sc, this.q, this.p, this.m);
    this.m.copyToArray(this.buf!, s.index * 16);
  }

  /** (K5b) The laid board's static box at its pose (the shutter curtain's filter: a level static the bodies stand on). */
  private addBody(s: Slot, at: PlankPose): void {
    if (s.body) return;
    const node = new TransformNode(`plank-${s.id}`, this.scene);
    node.position.set(at.x, at.y, at.z);
    node.rotationQuaternion = Quaternion.RotationYawPitchRoll(at.yaw, at.pitch, 0);
    const body = new PhysicsBody(node, PhysicsMotionType.STATIC, false, this.scene);
    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(PLANK.width, PLANK.thick, s.len), this.scene);
    shape.filterMembershipMask = G.STATIC;
    shape.filterCollideMask = 0xffffffff & ~G.STATIC;
    body.shape = shape;
    s.body = body;
    s.node = node;
  }

  private removeBody(s: Slot): void {
    if (!s.body) return;
    s.body.shape?.dispose();
    s.body.dispose();
    s.node?.dispose();
    s.body = null;
    s.node = null;
  }

  /** Follow the kit devices (`TeamController.devices.list`): each board at its device's pose; (K5b) a laid one's collider
   *  on, any other's off. Allocation-free while nothing is laid or lifted. */
  update(devices: readonly KitDevice[]): void {
    if (!this.mesh) return;
    let moved = false;
    for (let i = 0; i < devices.length; i++) {
      const d0 = devices[i]!;
      if (!isPlankDevice(d0)) continue;
      const d: PlankDevice = d0;
      const s = this.byId.get(d.id);
      if (!s) continue;
      const at = plankPose(d, this.at);
      if (d.laid && !s.body) this.addBody(s, at);
      else if (!d.laid && s.body) this.removeBody(s);
      const o = s.pose;
      if (at.x === o.x && at.y === o.y && at.z === o.z && at.yaw === o.yaw && at.pitch === o.pitch) continue;
      this.write(s, at);
      moved = true;
    }
    if (moved) {
      this.mesh.thinInstanceBufferUpdated('matrix');
      this.mesh.thinInstanceRefreshBoundingInfo(false);
    }
  }

  dispose(): void {
    for (const s of this.slots) this.removeBody(s);
    this.mesh?.material?.dispose();
    this.mesh?.dispose();
    this.mesh = null;
  }
}
