import {
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeCapsule,
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

/** Makes the local player damageable: health/shield + a kinematic hit capsule. */
export class PlayerTarget implements Damageable {
  readonly team = 'player' as const;
  readonly health = new Health(100, 50, 4, 30);
  private node: TransformNode;
  private body: PhysicsBody;
  private shape: PhysicsShapeCapsule;
  /** Damage taken this session (for stats). */
  damageTaken = 0;
  onDamaged: ((h: HitInfo, dealt: number) => void) | null = null;
  onDeath: ((h: HitInfo) => void) | null = null;
  /** Damage multiplier (difficulty, invulnerability during respawn). */
  damageMul = 1;

  constructor(
    scene: Scene,
    private registry: DamageRegistry,
    private player: Player,
    readonly id = 'local',
  ) {
    this.node = new TransformNode('player-hitbox', scene);
    const hv = hitVolumes(proportions('average'));
    // one capsule incl. the head (players have no separate headshot volume)
    this.shape = new PhysicsShapeCapsule(new Vector3(0, hv.bodyY0, 0), new Vector3(0, hv.headY - hv.bodyR * 0.5, 0), hv.bodyR, scene);
    this.shape.filterMembershipMask = G.PLAYER_HITBOX;
    this.shape.filterCollideMask = G.PROJECTILE;
    this.body = new PhysicsBody(this.node, PhysicsMotionType.ANIMATED, false, scene);
    this.body.shape = this.shape;
    this.body.disablePreStep = false;
    registry.register(this.body, this, 'body');
    this.dbg = { node: this.node, kind: 'capsule', y0: hv.bodyY0, y1: hv.headY - hv.bodyR * 0.5, r: hv.bodyR, color: '#50a0ff' };
    DEBUG_VOLUMES.add(this.dbg);
  }

  private dbg: DebugVolume;

  get alive(): boolean {
    return this.health.alive;
  }

  center(out: Vector3): Vector3 {
    return out.copyFrom(this.player.position).addInPlaceFromFloats(0, this.player.controller.crouched ? 0.7 : 1.0, 0);
  }

  aimPoint(out: Vector3): Vector3 {
    return out.copyFrom(this.player.position).addInPlaceFromFloats(0, this.player.controller.crouched ? 0.85 : 1.3, 0);
  }

  /** Follow the controller. Crouch/roll shrink the target by lowering it. */
  sync(): void {
    this.node.position.copyFrom(this.player.position);
    // crouching (incl. low cover) lowers the whole volume: only the top of the head clears waist-high cover
    if (this.player.controller.crouched) this.node.position.y -= 0.65;
  }

  applyDamage(h: HitInfo): DamageResult {
    if (!this.alive || h.attackerTeam === 'player') return { dealt: 0, killed: false };
    const amount = h.amount * this.damageMul * (this.player.controller.isRolling ? 0.5 : 1);
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
    DEBUG_VOLUMES.delete(this.dbg);
    this.registry.unregisterBody(this.body);
    this.body.dispose();
    this.shape.dispose();
    this.node.dispose();
  }
}
