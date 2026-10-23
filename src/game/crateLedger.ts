/**
 * (sector-redesign E9-crate) The between-section weapons crate: pure rules, Babylon-free and net-free.
 * One crate per section start; each player uses each crate once; a use tops gun ammo up to the starting loadout and
 * never above (A99-A109, `docs/sector-redesign/briefs/E9-CRATE.md`).
 */

export const CRATE_LABEL = 'Weapons crate';
/** Hold to use (s). */
export const CRATE_HOLD = 1.0;
/** Reach from the feet (m). */
export const CRATE_REACH = 1.8;
/** The indicator strip once this machine's player has used the crate. */
export const CRATE_DARK = '#2a2f36';

/** The interactable id of a section's crate. */
export function crateItemId(sectionId: string): string {
  return `${sectionId}-crate`;
}

/**
 * A102: the reserve after a crate top-up. Raises the reserve so that mag + reserve reaches the start total
 * (`magSize + startReserve`); never lowers it and never touches the magazine.
 */
export function crateReserve(mag: number, reserve: number, magSize: number, startReserve: number): number {
  return Math.max(reserve, magSize + startReserve - mag);
}

/** The host's (and solo's) record of who used which crate. Keys: `'local'` for the host/solo player, else the player id. */
export class CrateLedger {
  private readonly pairs = new Set<string>();

  /** Records the use; false when this player already used this crate. */
  use(crate: string, who: string): boolean {
    const k = `${crate}|${who}`;
    if (this.pairs.has(k)) return false;
    this.pairs.add(k);
    return true;
  }

  has(crate: string, who: string): boolean {
    return this.pairs.has(`${crate}|${who}`);
  }

  /** The crate ids this player used. */
  usedBy(who: string): string[] {
    const out: string[] = [];
    const tail = `|${who}`;
    for (const k of this.pairs) if (k.endsWith(tail)) out.push(k.slice(0, k.length - tail.length));
    return out;
  }

  /** The player keys that used `crate` (the debug hook). */
  usersOf(crate: string): string[] {
    const out: string[] = [];
    const head = `${crate}|`;
    for (const k of this.pairs) if (k.startsWith(head)) out.push(k.slice(head.length));
    return out;
  }

  /** A105: a section restart makes every crate usable again. */
  reset(): void {
    this.pairs.clear();
  }
}

/**
 * A client's handling of a `crate` event. Null when the event is for another player or the crate is already spent here
 * (a duplicate or late event never fills twice); otherwise marks it spent and says whether to top up ('fill') or only
 * hide the prompt ('mark', a rejoin re-send).
 */
export function applyCrateEvent(spent: Set<string>, me: string, ev: { player: string; id: string; fill: boolean }): 'fill' | 'mark' | null {
  if (ev.player !== me || spent.has(ev.id)) return null;
  spent.add(ev.id);
  return ev.fill ? 'fill' : 'mark';
}
