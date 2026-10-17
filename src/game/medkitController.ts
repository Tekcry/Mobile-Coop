/**
 * (locomotion step 15) Using a medkit (bible 5.13): the `medkit` action (pad X held 0.4 s while not aiming, KBM H).
 * Standing or crouched, movement locked, the weapon holstered, 1.5 s; aim, jump or sprint cancels without spending.
 * Solo and the co-op host heal their own health here (the host's check runs first, no message); a client asks the
 * host (`cmove {kind: 'medkit'}`), plays the use on `cstart` and stops on `cdeny` (`none`, `full`, `hit`). Health and
 * kit counts are host-authoritative (D8): a client's `kits` come from its snapshot (`mk`).
 */
import { MEDKIT, MedkitUse, medkitCarry, medkitDenial, SELF_TARGET } from './medkit';
import type { CDenyReason } from './committedMoves';
import type { GameState } from './gameState';

export class MedkitController {
  /** Kits held (a client mirrors the host's count). */
  kits: number = MEDKIT.carry;
  /** Carry max for this match's (the host's) difficulty. */
  max: number = MEDKIT.carry;
  readonly use = new MedkitUse();
  /** Request id (wraps at 65536). */
  id = 0;
  approved = false;
  /** False on a co-op client: the host heals and counts. */
  authority = true;
  /** Client: seconds into the predicted use (-1 = none). */
  private ct = -1;
  count = { started: 0, done: 0, hit: 0, cancelled: 0, denied: 0 };
  /** Tests: hold the use at this progress (-1 = off). */
  freezeAt = -1;
  lastDenied = '';

  constructor(private g: GameState) {}

  /** Kits for the match's difficulty (a match start; respawns keep the count). */
  init(def: { medkits?: number } | null | undefined): void {
    this.max = medkitCarry(def);
    this.kits = this.max;
    this.reset();
  }

  get active(): boolean {
    return this.authority ? this.use.active : this.ct >= 0;
  }

  /** Progress 0..1 (MoveState `ph`, the HUD fill). */
  get ph(): number {
    if (this.authority) return this.use.progress;
    return this.ct < 0 ? 0 : Math.min(1, this.ct / MEDKIT.time);
  }

  /** May a use start: alive, hurt, a kit held, grounded and free (not attached, traversing, striking, in a takedown,
   *  a team move, a door peek, carrying). */
  canStart(): boolean {
    const g = this.g;
    const h = g.target.health;
    if (medkitDenial(this.kits, h.hp, h.maxHp, g.player.alive)) return false;
    return (
      g.player.controller.grounded &&
      !g.traversal.attached &&
      !g.traversal.committed &&
      !g.takedown.active &&
      !g.strike.active &&
      !g.team.active &&
      !g.doorPeek.active &&
      !(g.wallCore?.active ?? false) &&
      !(g.stealth?.carrying ?? false)
    );
  }

  begin(): boolean {
    if (this.active || !this.canStart()) return false;
    const g = this.g;
    this.id = (this.id + 1) & 0xffff;
    this.count.started++;
    this.approved = false;
    g.weapons.forceHolster();
    if (this.authority) this.use.start(SELF_TARGET, g.target.health.hp);
    else this.ct = 0;
    if (g.net?.commitRequest) g.net.commitRequest('medkit', this.id, '');
    else this.approved = true;
    return this.active;
  }

  /** Host: approved (`elapsed` = host-now - t0). */
  accepted(id: number, elapsed: number): void {
    if (!this.active || id !== this.id) return;
    this.approved = true;
    if (!this.authority) this.ct = Math.max(0, Math.min(this.ct, elapsed));
  }

  /** Host: refused (`none`, `full`, ...) or interrupted (`hit`). */
  denied(id: number, reason: CDenyReason | string): void {
    if (id !== this.id) return;
    this.lastDenied = reason;
    if (reason === 'hit') this.count.hit++;
    else this.count.denied++;
    this.stop(false);
  }

  private stop(spent: boolean): void {
    if (this.authority && this.use.active) {
      if (spent) this.use.t = -1;
      else this.use.cancel(this.g.target.health);
    }
    this.ct = -1;
  }

  reset(): void {
    this.use.t = -1;
    this.use.healed = 0;
    this.ct = -1;
  }

  /** Fixed step (before the player's movement). `cancel`: aim, jump or sprint this step. */
  fixedUpdate(dt: number, pressed: boolean, cancel: boolean): void {
    const g = this.g;
    if (!this.active) {
      if (pressed && !cancel) this.begin();
      if (!this.active) return;
    }
    if (!g.player.alive) return this.stop(true);
    if (cancel) {
      this.count.cancelled++;
      return this.stop(false);
    }
    // movement locked (stance changes allowed), hands busy (holstered: `weapons.handsBusy`)
    g.player.controller.speedCap = 0;
    const frozen = this.freezeAt >= 0 && this.ph >= this.freezeAt;
    if (!this.authority) {
      if (!frozen) this.ct += dt;
      if (!this.approved && this.ct > MEDKIT.replyTimeout) {
        this.lastDenied = 'timeout';
        this.count.denied++;
        this.ct = -1;
      } else if (this.ct >= MEDKIT.time) this.ct = -1;
      return;
    }
    if (frozen) return;
    const r = this.use.step(dt, g.target.health);
    if (r === 'run') return;
    // spent: done, or interrupted by damage (the heal so far stays)
    this.kits = Math.max(0, this.kits - 1);
    if (r === 'done') this.count.done++;
    else {
      this.count.hit++;
      this.lastDenied = 'hit';
      g.net?.commitCancel?.(this.id, 'hit', 'medkit');
    }
  }
}
