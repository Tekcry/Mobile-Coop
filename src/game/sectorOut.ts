/**
 * (coop4 OUT, M1 b, A5 / A16) Sector Ops at 3-4 players: an operator who is out (down with no syringe left, or the
 * revive window over) waits for the team's next connector instead of restarting the section. Pure rules (no Babylon,
 * no src/net): who waits, who the player list leaves out, the slot mask on the wire and the follow view's pick.
 */
import { SECTOR } from './sectors';
import { PLAYER_SLOTS } from './playerSlots';

/** The out player's HUD line (host and client). */
export const OUT_LINE = 'Out - you rejoin at the next connector';

/** Does an out operator wait for the connector at this team size (else the section restarts, as at 1-2 players)? */
export function outWaits(team: number): boolean {
  return Number.isFinite(team) && team >= SECTOR.outWaitsMin;
}

/** Is a player-list entry left out as OUT: marked and still down (a marked player who is up again, e.g. a rejoin, counts). */
export function isOutRef(out: ReadonlySet<string>, id: string, alive: boolean): boolean {
  return !alive && out.size > 0 && out.has(id);
}

/** The OUT slots as a bitmask (bit s = slot s) for the `sector` wire's `ot`; 0 = none. */
export function outMask(slots: Iterable<number>): number {
  let m = 0;
  for (const s of slots) if (Number.isInteger(s) && s >= 0 && s < PLAYER_SLOTS) m |= 1 << s;
  return m;
}

/** Is slot `slot` in OUT mask `mask`? */
export function slotOut(mask: number, slot: number): boolean {
  return slot >= 0 && slot < PLAYER_SLOTS && ((mask >> slot) & 1) === 1;
}

/**
 * The follow view's target slot: `up[s]` true for a teammate on slot s who is alive and in the game. Keeps `cur` while
 * it is up and `step` is 0; otherwise the next slot up after `cur` (wrapping; `cur` -1 starts at slot 0). -1 = nobody.
 * No allocation.
 */
export function followPick(up: readonly boolean[], cur: number, step: number): number {
  const n = up.length;
  if (n === 0) return -1;
  if (step === 0 && cur >= 0 && cur < n && up[cur]) return cur;
  const base = cur >= 0 && cur < n ? cur : n - 1;
  for (let i = 1; i <= n; i++) {
    const s = (base + i) % n;
    if (up[s]) return s;
  }
  return -1;
}

/** A point the follow view can track (an avatar's position, read live each frame). */
export interface FollowPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * (coop4 OUT, A16) The OUT player's follow view: each fixed step the net layer lists the teammates up by slot
 * (`begin`, then `set` per teammate), then `pick` keeps the followed one or moves on (`step` 1: the switch-target press;
 * the followed one down or out: the next one up). Fixed arrays, no allocation.
 */
export class OutFollow {
  /** The followed slot, -1 = none. */
  slot = -1;
  private readonly up: boolean[] = [];
  private readonly at: (FollowPoint | null)[] = [];

  constructor() {
    for (let i = 0; i < PLAYER_SLOTS; i++) {
      this.up.push(false);
      this.at.push(null);
    }
  }

  begin(): void {
    for (let i = 0; i < PLAYER_SLOTS; i++) {
      this.up[i] = false;
      this.at[i] = null;
    }
  }

  /** Teammate on `slot` is up (alive, connected, not out) at `pos`. */
  set(slot: number, pos: FollowPoint): void {
    if (slot < 0 || slot >= PLAYER_SLOTS) return;
    this.up[slot] = true;
    this.at[slot] = pos;
  }

  /** The point to follow (null: nobody up). */
  pick(step: number): FollowPoint | null {
    this.slot = followPick(this.up, this.slot, step);
    return this.slot >= 0 ? (this.at[this.slot] ?? null) : null;
  }

  reset(): void {
    this.slot = -1;
    this.begin();
  }
}

/**
 * (coop4 pol, round-check-A P5) The OUT player's loadout restore, once per OUT spell, whichever arrives first: the
 * `ot` mask naming our slot or our down state (a rejoin can get the `sector` message before the snapshot that downs
 * it). `due` is true on the first call that sees out and down since we were last not out; not out re-arms it.
 */
export class OutRestoreLatch {
  private done = false;

  due(out: boolean, down: boolean): boolean {
    if (!out) {
      this.done = false;
      return false;
    }
    if (!down || this.done) return false;
    this.done = true;
    return true;
  }
}
