import { type Scene, type Vector3 } from '../core/babylon';
import { Health } from './health';
import type { DamageRegistry, Damageable, DamageResult, HitInfo } from './damage';
import type { Player } from '../player/player';
import { emptyPlayerBodyIn, emptyPlayerBodyOut, localBodyIn, playerBody, PLAYER_OPERATOR_HEIGHT } from '../player/playerVolumes';
import { WALL } from '../player/wallController';
import { PlayerHitVolumes, playerPartMult } from './playerHitVolumes';

export { PLAYER_PART_MULT } from './playerHitVolumes';

/**
 * Makes the local player damageable: health + split kinematic hit volumes (legs, torso, head). (rig-pose-fix S1, G1 /
 * G2) The volumes and the perception points (`center`, `aimPoint`, `headPoint`) come from the sim body model
 * (`src/player/playerVolumes.ts`, fitted to Wren's rig), never from the rendered rig: crouching lowers them, a peek moves
 * the head and torso out past the edge, so exposure in cover is physical, and the host sees a client the same way.
 */
export class PlayerTarget implements Damageable {
  readonly team = 'player' as const;
  readonly health = new Health(100);
  private vols: PlayerHitVolumes;
  /** The sim body's input and joint centres this step (read by the light meter's wall head sample and the HUD). */
  readonly bodyIn = emptyPlayerBodyIn();
  readonly body = emptyPlayerBodyOut();
  /** Damage taken this session (for stats). */
  damageTaken = 0;
  onDamaged: ((h: HitInfo, dealt: number) => void) | null = null;
  onDeath: ((h: HitInfo) => void) | null = null;
  /** Damage multiplier (difficulty, invulnerability during respawn). */
  damageMul = 1;
  /** Suit armour (damage taken multiplier; stays on through spawn protection). */
  armorMul = 1;

  constructor(
    scene: Scene,
    registry: DamageRegistry,
    private player: Player,
    readonly id = 'local',
  ) {
    this.bodyIn.height = PLAYER_OPERATOR_HEIGHT;
    this.vols = new PlayerHitVolumes(scene, registry, this, 'player-hit', PLAYER_OPERATOR_HEIGHT);
    this.sync(false);
  }

  get alive(): boolean {
    return this.health.alive;
  }

  center(out: Vector3): Vector3 {
    return this.vols.center(out);
  }

  /** Where enemies aim: the upper chest (follows the body: a duck behind cover, a peek). */
  aimPoint(out: Vector3): Vector3 {
    return this.vols.aimPoint(out);
  }

  /** Head volume centre (exposure sampling, near-miss checks). */
  headPoint(out: Vector3): Vector3 {
    return this.vols.headPoint(out);
  }

  /**
   * (fixed step) The sim body from the controller and the move state (the same fields a remote copy gets from the
   * wire `MoveState`, `bodyFromMoveState`), then the volumes on it. `drawn`: a weapon in the hand (draw phase not
   * holstered). No allocation.
   */
  sync(drawn: boolean): void {
    playerBody(localBodyIn(this.player, drawn, WALL.peekLean, this.bodyIn), this.body);
    this.vols.sync(this.player.position, this.body);
  }

  /** Hits that do not hurt (team-mates); course friendly fire (D38) replaces it. */
  friendly: (h: HitInfo) => boolean = (h) => h.attackerTeam === 'player';

  applyDamage(h: HitInfo): DamageResult {
    if (!this.alive || this.friendly(h)) return { dealt: 0, killed: false };
    const zone = playerPartMult(h.part === 'head', h.point.y - this.player.position.y, this.player.controller.crouchBlend);
    const amount = h.amount * this.damageMul * this.armorMul * zone;
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
    this.vols.dispose();
  }
}
