import { PhysicsBody, PhysicsMotionType, PhysicsShapeCapsule, Quaternion, TransformNode, Vector3, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import type { DamageRegistry, Damageable } from './damage';
import { hitVolumes, proportions } from '../player/proportions';
import type { PlayerBodyOut, V3 } from '../player/playerVolumes';
import { DEBUG_VOLUMES, type DebugVolume } from '../ui/debugVolumes';

interface Volume {
  node: TransformNode;
  body: PhysicsBody;
  shape: PhysicsShapeCapsule;
  dbg: DebugVolume;
}

/** Damage multipliers by volume: head shots hurt more, leg hits less. */
export const PLAYER_PART_MULT = { head: 1.3, torso: 1, legs: 0.75 };

/** (rig-pose-fix S1) The part a hit at height `dy` over the feet lands on (`h.part` 'head' or not): its multiplier.
 *  Legs below 0.85 m standing, 0.5 m crouched (the volumes' split). */
export function playerPartMult(head: boolean, dy: number, crouch: number): number {
  return head ? PLAYER_PART_MULT.head : dy < 0.85 - crouch * 0.35 ? PLAYER_PART_MULT.legs : PLAYER_PART_MULT.torso;
}

/**
 * (rig-pose-fix S1, G1 / G3) A player's split kinematic hit volumes (legs, torso, head; `G.PLAYER_HITBOX`) placed from
 * the sim body (`playerBody`, src/player/playerVolumes.ts), never from a rig: the legs up to the pelvis, the torso
 * along the pelvis -> neck line, the head sphere on the head. The local player (`PlayerTarget`) and the host's view of a
 * client (`RemotePlayer`) both use it, so both are hit and seen through the same volumes (headshots on either).
 * Sized for Wren's body (`proportions('average', height)`, G72). No allocation per `sync`.
 */
export class PlayerHitVolumes {
  private legs: Volume;
  private torso: Volume;
  private head: Volume;
  private readonly spineDir = new Vector3(0, 1, 0);
  private readonly tmpQ = new Quaternion();
  private enabled = true;

  constructor(
    private scene: Scene,
    private registry: DamageRegistry,
    target: Damageable,
    name: string,
    height: number,
  ) {
    // (operators 11e) fitted to the body shown: Wren's rig (1.68 m, G72 proportions)
    const hv = hitVolumes(proportions('average', height));
    const r = hv.bodyR;
    this.legs = this.volume(target, `${name}-legs`, 0.08 + r * 0.8, 0.88 - r * 0.8, r * 0.8, '#5080ff', 'body');
    this.torso = this.volume(target, `${name}-torso`, r, 0.58 - r * 0.3, r, '#50a0ff', 'body');
    this.head = this.volume(target, `${name}-head`, -0.03, 0.03, hv.headR, '#80c0ff', 'head');
  }

  private volume(target: Damageable, name: string, y0: number, y1: number, r: number, color: string, part: 'head' | 'body'): Volume {
    const scene = this.scene;
    const node = new TransformNode(name, scene);
    const shape = new PhysicsShapeCapsule(new Vector3(0, y0, 0), new Vector3(0, y1, 0), r, scene);
    shape.filterMembershipMask = G.PLAYER_HITBOX;
    shape.filterCollideMask = G.PROJECTILE;
    const body = new PhysicsBody(node, PhysicsMotionType.ANIMATED, false, scene);
    body.shape = shape;
    body.disablePreStep = false;
    this.registry.register(body, target, part);
    const dbg: DebugVolume = { node, kind: 'capsule', y0, y1, r, color };
    DEBUG_VOLUMES.add(dbg);
    return { node, body, shape, dbg };
  }

  /** Place from the sim body `b` over the feet (x, z): the legs sink so their top meets the pelvis, the torso runs from
   *  the pelvis along the spine to the neck, the head on the head. */
  sync(feet: V3, b: PlayerBodyOut): void {
    if (!this.enabled) return;
    const pv = b.pelvis;
    this.legs.node.position.set(feet.x, pv.y - 0.88, feet.z);
    const d = this.spineDir.set(b.neck.x - pv.x, b.neck.y - pv.y, b.neck.z - pv.z);
    if (d.lengthSquared() < 1e-6) d.set(0, 1, 0);
    d.normalize();
    this.torso.node.position.set(pv.x, pv.y, pv.z);
    Quaternion.FromUnitVectorsToRef(Vector3.UpReadOnly, d, this.tmpQ);
    (this.torso.node.rotationQuaternion ??= new Quaternion()).copyFrom(this.tmpQ);
    this.head.node.position.set(b.head.x, b.head.y, b.head.z);
  }

  /** Park the volumes far below the map (dead, held) or bring them back (placed at the next `sync`). */
  setEnabled(on: boolean): void {
    if (on === this.enabled) return;
    this.enabled = on;
    if (!on) for (const v of [this.legs, this.torso, this.head]) v.node.position.set(0, -500, 0);
  }

  /** The torso's centre: the pelvis + 0.2 m up. */
  center(out: Vector3): Vector3 {
    return out.copyFrom(this.torso.node.position).addInPlaceFromFloats(0, 0.2, 0);
  }

  /** Where enemies aim: the upper chest, 0.3 m along the spine from the pelvis (a duck, a lean, a peek). */
  aimPoint(out: Vector3): Vector3 {
    const d = this.spineDir;
    return out.copyFrom(this.torso.node.position).addInPlaceFromFloats(d.x * 0.3, d.y * 0.3, d.z * 0.3);
  }

  /** The head volume's centre (exposure sampling, near-miss checks, the guards' head line). */
  headPoint(out: Vector3): Vector3 {
    return out.copyFrom(this.head.node.position);
  }

  dispose(): void {
    for (const v of [this.legs, this.torso, this.head]) {
      DEBUG_VOLUMES.delete(v.dbg);
      this.registry.unregisterBody(v.body);
      v.body.dispose();
      v.shape.dispose();
      v.node.dispose();
    }
  }
}
