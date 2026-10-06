import {
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeCapsule,
  Quaternion,
  TransformNode,
  Vector3,
  type Scene,
} from '../core/babylon';
import { G } from '../physics/groups';
import { Health } from './health';
import type { DamageRegistry, Damageable, DamageResult, HitInfo } from './damage';
import type { Player } from '../player/player';
import { hitVolumes, proportions } from '../player/proportions';
import { DEBUG_VOLUMES, type DebugVolume } from '../ui/debugVolumes';

interface Volume {
  node: TransformNode;
  body: PhysicsBody;
  shape: PhysicsShapeCapsule;
  dbg: DebugVolume;
}

/** Damage multipliers by volume: head shots hurt more, leg hits less. */
export const PLAYER_PART_MULT = { head: 1.3, torso: 1, legs: 0.75 };

/**
 * Makes the local player damageable: health/shield + split kinematic hit volumes (legs, torso, head)
 * that follow the pose. Crouching lowers them; leaning moves the torso and head out past the edge, so
 * exposure in cover is physical: only what actually sticks out can be hit.
 */
export class PlayerTarget implements Damageable {
  readonly team = 'player' as const;
  readonly health = new Health(100, 50, 4, 30);
  private legs: Volume;
  private torso: Volume;
  private head: Volume;
  /** Damage taken this session (for stats). */
  damageTaken = 0;
  onDamaged: ((h: HitInfo, dealt: number) => void) | null = null;
  onDeath: ((h: HitInfo) => void) | null = null;
  /** Damage multiplier (difficulty, invulnerability during respawn). */
  damageMul = 1;

  constructor(
    private scene: Scene,
    private registry: DamageRegistry,
    private player: Player,
    readonly id = 'local',
  ) {
    const hv = hitVolumes(proportions('average'));
    const r = hv.bodyR;
    this.legs = this.volume('legs', 0.08 + r * 0.8, 0.88 - r * 0.8, r * 0.8, '#5080ff', 'body');
    this.torso = this.volume('torso', r, 0.58 - r * 0.3, r, '#50a0ff', 'body');
    this.head = this.volume('head', -0.03, 0.03, hv.headR, '#80c0ff', 'head');
  }

  private volume(name: string, y0: number, y1: number, r: number, color: string, part: 'head' | 'body'): Volume {
    const scene = this.scene;
    const node = new TransformNode(`player-hit-${name}`, scene);
    const shape = new PhysicsShapeCapsule(new Vector3(0, y0, 0), new Vector3(0, y1, 0), r, scene);
    shape.filterMembershipMask = G.PLAYER_HITBOX;
    shape.filterCollideMask = G.PROJECTILE;
    const body = new PhysicsBody(node, PhysicsMotionType.ANIMATED, false, scene);
    body.shape = shape;
    body.disablePreStep = false;
    this.registry.register(body, this, part);
    const dbg: DebugVolume = { node, kind: 'capsule', y0, y1, r, color };
    DEBUG_VOLUMES.add(dbg);
    return { node, body, shape, dbg };
  }

  get alive(): boolean {
    return this.health.alive;
  }

  center(out: Vector3): Vector3 {
    return out.copyFrom(this.torso.node.position).addInPlaceFromFloats(0, 0.2, 0);
  }

  /** Where enemies aim: the upper chest (follows the pose: a duck behind cover, a lean, a peek). */
  aimPoint(out: Vector3): Vector3 {
    const d = this.spineDir;
    return out.copyFrom(this.torso.node.position).addInPlaceFromFloats(d.x * 0.3, d.y * 0.3, d.z * 0.3);
  }

  /** Head volume centre (exposure sampling, near-miss checks). */
  headPoint(out: Vector3): Vector3 {
    return out.copyFrom(this.head.node.position);
  }

  private spineDir = new Vector3(0, 1, 0);
  private tmpQ = new Quaternion();

  /**
   * Follow the pose itself (the rig's last solved frame): legs up to the pelvis, the torso along the
   * spine from the pelvis to the neck, the head on the head. Ducking below low cover, leaning past an edge
   * or rising to aim over the top moves exactly what is exposed.
   */
  sync(): void {
    const feet = this.player.position;
    const rig = this.player.rig;
    const pelvis = rig.hips.getAbsolutePosition();
    const neck = rig.neck.getAbsolutePosition();
    // legs: sink so their top meets the pelvis
    this.legs.node.position.set(feet.x, pelvis.y - 0.88, feet.z);
    // torso: from the pelvis along the spine
    neck.subtractToRef(pelvis, this.spineDir);
    if (this.spineDir.lengthSquared() < 1e-6) this.spineDir.set(0, 1, 0);
    this.spineDir.normalize();
    this.torso.node.position.copyFrom(pelvis);
    Quaternion.FromUnitVectorsToRef(Vector3.UpReadOnly, this.spineDir, this.tmpQ);
    if (!this.torso.node.rotationQuaternion) this.torso.node.rotationQuaternion = new Quaternion();
    this.torso.node.rotationQuaternion.copyFrom(this.tmpQ);
    // head
    this.head.node.position.copyFrom(rig.headNode.getAbsolutePosition());
  }

  applyDamage(h: HitInfo): DamageResult {
    if (!this.alive || h.attackerTeam === 'player') return { dealt: 0, killed: false };
    const zone = h.part === 'head' ? PLAYER_PART_MULT.head : h.point.y - this.player.position.y < 0.85 - this.player.controller.crouchBlend * 0.35 ? PLAYER_PART_MULT.legs : 1;
    const amount = h.amount * this.damageMul * zone;
    const dealt = this.health.damage(amount);
    this.damageTaken += dealt;
    if (dealt > 0) this.onDamaged?.(h, dealt);
    const killed = !this.health.alive;
    if (killed) {
      this.player.alive = false;
      this.onDeath?.(h);
    }
    return { dealt, killed };
  }

  revive(): void {
    this.health.reset();
    this.player.alive = true;
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
