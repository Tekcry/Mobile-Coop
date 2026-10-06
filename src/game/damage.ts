import type { PhysicsBody, Vector3 } from '../core/babylon';
import type { WeaponId } from '../weapons/weaponDefs';

export type Team = 'player' | 'enemy' | 'neutral';
export type HitPart = 'head' | 'body';

export interface HitInfo {
  amount: number;
  point: Vector3;
  dir: Vector3;
  part: HitPart;
  kind: 'bullet' | 'explosion' | 'melee';
  attackerTeam: Team;
  /** Network/player id of the attacker (coop credit). */
  attackerId: string;
  weapon?: WeaponId;
  sourcePos: Vector3;
  impulse: number;
}

export interface DamageResult {
  dealt: number;
  killed: boolean;
}

export interface Damageable {
  readonly id: string;
  readonly team: Team;
  readonly alive: boolean;
  /** World position used for explosions, aim assist and radar. */
  center(out: Vector3): Vector3;
  /** Where aim assist should pull (usually chest). */
  aimPoint(out: Vector3): Vector3;
  /** Head position, when it can be seen on its own (a player ducked behind low cover but peeking). */
  headPoint?(out: Vector3): Vector3;
  applyDamage(h: HitInfo): DamageResult;
}

/** Maps physics bodies (hit volumes) to the damageable they belong to. */
export class DamageRegistry {
  private bodies = new Map<PhysicsBody, { target: Damageable; part: HitPart }>();
  readonly targets = new Set<Damageable>();

  register(body: PhysicsBody, target: Damageable, part: HitPart): void {
    this.bodies.set(body, { target, part });
    this.targets.add(target);
  }

  unregisterBody(body: PhysicsBody): void {
    this.bodies.delete(body);
  }

  removeTarget(t: Damageable): void {
    this.targets.delete(t);
    for (const [b, v] of this.bodies) if (v.target === t) this.bodies.delete(b);
  }

  lookup(body: PhysicsBody | undefined): { target: Damageable; part: HitPart } | undefined {
    return body ? this.bodies.get(body) : undefined;
  }

  /** Hostile, living targets for a team. */
  *hostiles(team: Team): Iterable<Damageable> {
    for (const t of this.targets) if (t.alive && t.team !== team && t.team !== 'neutral') yield t;
  }

  clear(): void {
    this.bodies.clear();
    this.targets.clear();
  }
}

