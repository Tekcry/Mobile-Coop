import { Vector3 } from '../core/babylon';
import { ENEMIES, type EnemyDef } from '../ai/enemyDefs';
import type { CharacterRig } from '../player/characterRig';
import type { DamageResult, HitInfo } from '../game/damage';
import type { TakedownVictim } from '../game/takedownController';

/** PvP takedown kinds (3.2.0 phase 4): a drop, a ledge pull and the inverted choke; never a grab. */
export const PVP_TAKEDOWNS: readonly string[] = ['drop', 'below', 'inverted'];

/**
 * An opponent as a takedown victim (3.2.0 phase 4, PvP): another player cannot be seized (no hold, no pull), so the
 * takedown plays out on the attacker's side and its end is a kill the host validates (`ptd`) and applies.
 */
export class PvpVictim implements TakedownVictim {
  readonly pvp = true;
  readonly def: EnemyDef = ENEMIES.grunt;
  readonly alerted = false;
  readonly level = 'unaware' as const;
  taken = false;
  readonly pos = new Vector3();
  yaw = 0;

  constructor(
    readonly id: string,
    private avatar: { readonly pos: Vector3; readonly yaw: number; readonly dead: boolean; readonly rig: CharacterRig },
    /** The takedown's end: kill `id` (the host validates it). */
    private kill: (id: string, kind: string) => void,
  ) {}

  /** Refresh from the avatar (each step before the takedown looks at it). */
  sync(): this {
    this.pos.copyFrom(this.avatar.pos);
    this.yaw = this.avatar.yaw;
    return this;
  }

  get alive(): boolean {
    return !this.avatar.dead;
  }

  get bodyRig(): CharacterRig {
    return this.avatar.rig;
  }

  beginTakedown(): void {
    this.taken = true;
  }

  holdAt(): void {}

  releaseTakedown(): void {
    this.taken = false;
  }

  applyDamage(h: HitInfo): DamageResult {
    this.taken = false;
    this.kill(this.id, h.takedown ?? 'drop');
    return { dealt: 100, killed: true };
  }

  knockOut(h: HitInfo): void {
    this.applyDamage(h);
  }
}
