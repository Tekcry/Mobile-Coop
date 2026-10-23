import type { Vector3 } from '../core/babylon';
import type { GameState } from './gameState';
import { KIND_COLOR, type Interactable } from './interactables';
import { CRATE_DARK, CRATE_HOLD, CRATE_LABEL, CRATE_REACH, CrateLedger } from './crateLedger';

/**
 * (sector-redesign E9-crate) The host's / solo's weapons crates: one per section start, live only while its section is
 * the current one, used once per player (the ledger, keyed `'local'` or the client's player id). The crate stays
 * `enabled` for everyone; this machine's player's use only marks it `spent` here. A client's use reaches the host as
 * `use` and is answered with the `crate` event (`NetAttachment.crateUsed`); never imports `src/net`.
 */
export class WeaponCrates {
  readonly ledger = new CrateLedger();
  private readonly list: Interactable[] = [];

  constructor(private g: GameState) {}

  /** Adds a crate (disabled until `setLive`). */
  add(id: string, pos: Vector3, yaw: number): Interactable {
    const ints = this.g.interactables;
    if (!ints) throw new Error('WeaponCrates.add: no interactables');
    const it = ints.add(id, 'crate', pos, CRATE_LABEL, CRATE_HOLD, yaw);
    it.reach = CRATE_REACH;
    it.onUse = (x, who) => this.use(x, who ?? 'local');
    this.list.push(it);
    return it;
  }

  /** Enables crate `id` (null: none) and disables the others (A100). */
  setLive(id: string | null): void {
    const ints = this.g.interactables;
    if (!ints) return;
    for (const it of this.list) {
      ints.setEnabled(it, it.id === id);
      if (it.spent && it.enabled) ints.setIndicator(it, CRATE_DARK);
    }
  }

  /** A use by `who` (`'local'` or a client's player id on the host). */
  use(it: Interactable, who: string): void {
    if (who === 'local') {
      if (this.ledger.has(it.id, 'local')) {
        it.progress = 0;
        return;
      }
      if (this.g.weapons.atLoadout()) {
        this.g.hud.feedItem('Ammo full');
        it.progress = 0;
        return;
      }
      this.ledger.use(it.id, 'local');
      this.g.weapons.crateTopUp();
      this.g.events.emit('pickup', { kind: 'ammo' });
      this.g.hud.feedItem('Weapons refilled');
      this.markSpent(it);
      return;
    }
    // remote (host only): the host does not hold the client's ammo, so every first use counts (A103)
    if (this.ledger.use(it.id, who)) this.g.net?.crateUsed?.(who, it.id);
    it.progress = 0;
  }

  /** This machine's player used `it`: hide its prompt here and darken its strip (A104). */
  markSpent(it: Interactable): void {
    it.spent = true;
    it.progress = 0;
    this.g.interactables?.setIndicator(it, CRATE_DARK);
  }

  /** A105: a section restart; every crate usable again by everyone. */
  resetAll(): void {
    this.ledger.reset();
    const ints = this.g.interactables;
    for (const it of this.list) {
      it.spent = false;
      it.progress = 0;
      if (it.enabled) ints?.setIndicator(it, KIND_COLOR.crate);
    }
  }

  /** The crate ids player `who` used (the rejoin re-send, A106). */
  usedBy(who: string): string[] {
    return this.ledger.usedBy(who);
  }

  /** (e2e) Each crate: live, spent here, and the player keys that used it. */
  debug(): { id: string; live: boolean; spent: boolean; used: string[] }[] {
    return this.list.map((it) => ({ id: it.id, live: it.enabled, spent: it.spent === true, used: this.ledger.usersOf(it.id) }));
  }
}
