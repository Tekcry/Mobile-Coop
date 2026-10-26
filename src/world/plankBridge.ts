/**
 * (coop-kit K5a) Plank Bridge's world piece: one scaffold board mesh per plank spot (one thin-instanced box), drawn from
 * its kit device (`game/kit/plankBridge.ts` `PlankDevice`): on its stack or the floor where it lies, and while carried
 * between the two carriers' hand points (the device's ends, set each fixed step on every page from the drawn bodies:
 * no board pose on the wire). No collider yet (the laid board's static collider is K5b).
 *
 * The world (`world.ts`) builds `PlankBoards(scene, level)` when the level has plank spots (`kitSpotsOf`, every spot
 * whatever the flags, as the devices: inert while the id is off, the live board lies on its stack); the move's `tick`
 * calls `update(devices.list)` each fixed step after it set the ends, on host and client. Babylon only through
 * `core/babylon`.
 */
import { Color3, CreateBox, Matrix, PBRMaterial, Quaternion, Vector3, type Mesh, type Scene } from '../core/babylon';
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
}

/** The level's live scaffold boards (render only). */
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

  constructor(scene: Scene, level: unknown) {
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
      const slot: Slot = { id: d.id, len: d.len, index: i, pose: { x: NaN, y: 0, z: 0, yaw: 0, pitch: 0 } };
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

  /** Follow the kit devices (`TeamController.devices.list`): each board at its device's pose. Allocation-free. */
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
    this.mesh?.material?.dispose();
    this.mesh?.dispose();
    this.mesh = null;
  }
}
