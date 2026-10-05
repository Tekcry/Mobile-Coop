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

  /** Where enemies aim: the torso (follows a lean / peek). */
  aimPoint(out: Vector3): Vector3 {
    return out.copyFrom(this.torso.node.position).addInPlaceFromFloats(0, 0.3, 0);
  }

  /** Head volume centre (exposure sampling, near-miss checks). */
  headPoint(out: Vector3): Vector3 {
    return out.copyFrom(this.head.node.position);
  }

  /** Follow the controller and the pose (crouch, lean). */
  sync(): void {
    const p = this.player;
    const c = p.controller;
    const feet = p.position;
    const crouch = c.crouchBlend;
    const lean = p.coverPose.lean;
    const rx = Math.cos(c.yaw);
    const rz = -Math.sin(c.yaw);
    // legs: shorten by sinking into the floor when crouched
    this.legs.node.position.set(feet.x, feet.y - crouch * 0.38, feet.z);
    // torso: hips at ~0.88 m standing, ~0.55 m crouched; leans out with the upper body
    const ty = 0.88 - crouch * 0.33;
    this.torso.node.position.set(feet.x + rx * lean * 0.2, feet.y + ty, feet.z + rz * lean * 0.2);
    // head: above the shoulders, further out on a lean
    const hy = 1.62 - crouch * 0.52;
    this.head.node.position.set(feet.x + rx * lean * 0.36, feet.y + hy, feet.z + rz * lean * 0.36);
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
