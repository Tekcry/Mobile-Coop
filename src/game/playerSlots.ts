/**
 * (coop4 N0, A19) Player slots: the fixed 0..3 place each player has in a match (pure: no Babylon, no src/net; single
 * player uses it too). Slot 0 is the host (or the solo player); a joiner takes the lowest free slot; a dropped player's
 * slot is held for their rejoin; slots never move during a match and are compacted only at a match start.
 *
 * `TeamRef` is the player list the game and the guards share (Guard AI reads it: `slot` for its intruder buffers,
 * `mv` for what the player is doing). `SlotTable` holds the rules; `NetSession` owns one (N1).
 */
import type { PlayerRef } from '../ai/enemy';
import type { GameState } from './gameState';
import type { MoveState } from '../player/moveState';

/** Players a match can have (= MAX_PLAYERS in net/protocol.ts = MAX_INTRUDERS in ai/targetPick.ts; a test keeps them equal). */
export const PLAYER_SLOTS = 4;
export type PlayerSlot = 0 | 1 | 2 | 3;

/** A player as the game and the guards see it: its fixed slot this match (0 = the host / solo) and its movement state. */
export interface TeamFields {
  slot: PlayerSlot;
  mv: MoveState | null;
}
export type TeamRef = PlayerRef & TeamFields;

/** One occupied slot (`entries()`): the player's id, its slot and whether it is held for a rejoin. */
export interface SlotEntry {
  id: string;
  slot: PlayerSlot;
  held: boolean;
}

/** Is `n` a valid slot number (an integer 0..PLAYER_SLOTS-1)? */
export function isPlayerSlot(n: unknown): n is PlayerSlot {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < PLAYER_SLOTS;
}

/**
 * The list-order fallback (a lobby message without slots): the same rule as `goggleSlot` (operators/runtime/goggle.ts):
 * the host is 0, the others 1, 2, ... in list order; an id not in the list is 0. Clamped to the last slot (lists are at
 * most `PLAYER_SLOTS` long, so it never clamps in practice).
 */
export function slotFromList(players: readonly { readonly id: string; readonly host: boolean }[], id: string): PlayerSlot {
  let k = 0;
  for (const p of players) {
    if (p.host) {
      if (p.id === id) return 0;
      continue;
    }
    k++;
    if (p.id === id) return (k < PLAYER_SLOTS ? k : PLAYER_SLOTS - 1) as PlayerSlot;
  }
  return 0;
}

/**
 * The slot rules (A19). Slot 0 belongs to the host (`host`); `assign` gives a joiner the lowest free slot 1..cap-1;
 * `hold` / `unhold` keep a dropped player's slot for their rejoin; `release` frees it (lobby leave, hold end);
 * `compact` renumbers at a match start. `slotOf` scans a fixed array and allocates nothing (per frame safe).
 */
export class SlotTable {
  /** Slots this table hands out (the mode's cap, 1..PLAYER_SLOTS: Sector Ops 4, the campaign 2). */
  readonly cap: number;
  private readonly ids: (string | null)[] = [];
  private readonly held: boolean[] = [];

  constructor(cap: number = PLAYER_SLOTS) {
    this.cap = Number.isInteger(cap) ? Math.max(1, Math.min(PLAYER_SLOTS, cap)) : PLAYER_SLOTS;
    for (let s = 0; s < PLAYER_SLOTS; s++) {
      this.ids.push(null);
      this.held.push(false);
    }
  }

  /** The host takes slot 0 (it leaves any other slot it had; a different player on slot 0 loses its slot). */
  host(id: string): PlayerSlot {
    const old = this.slotOf(id);
    if (old > 0) this.clearSlot(old);
    this.ids[0] = id;
    this.held[0] = false;
    return 0;
  }

  /** A joiner's slot: the one it already has (held or not), else the lowest free 1..cap-1; -1 when full. */
  assign(id: string): PlayerSlot | -1 {
    const have = this.slotOf(id);
    if (have >= 0) return have;
    for (let s = 1; s < this.cap; s++) {
      if (this.ids[s] === null) {
        this.ids[s] = id;
        this.held[s] = false;
        return s as PlayerSlot;
      }
    }
    return -1;
  }

  /** A dropped player keeps its slot, marked held, until `unhold` (rejoin) or `release` (hold end). False: no slot. */
  hold(id: string): boolean {
    const s = this.slotOf(id);
    if (s < 0) return false;
    this.held[s] = true;
    return true;
  }

  /** A held player is back: its slot, no longer held; -1 when it has none. */
  unhold(id: string): PlayerSlot | -1 {
    const s = this.slotOf(id);
    if (s >= 0) this.held[s] = false;
    return s;
  }

  /** Frees the player's slot (lobby leave, drop with no hold, hold end): the slot it had, or -1. */
  release(id: string): PlayerSlot | -1 {
    const s = this.slotOf(id);
    if (s >= 0) this.clearSlot(s);
    return s;
  }

  /** The player's slot, or -1. Allocates nothing. */
  slotOf(id: string): PlayerSlot | -1 {
    for (let s = 0; s < PLAYER_SLOTS; s++) if (this.ids[s] === id) return s as PlayerSlot;
    return -1;
  }

  /** Is this player's slot held for a rejoin? */
  isHeld(id: string): boolean {
    const s = this.slotOf(id);
    return s >= 0 && this.held[s] === true;
  }

  /** Slots held for a rejoin (a tokenless hello in a full room with two or more held is refused, A18). */
  heldCount(): number {
    let n = 0;
    for (let s = 0; s < PLAYER_SLOTS; s++) if (this.ids[s] !== null && this.held[s]) n++;
    return n;
  }

  /** Occupied slots, held ones included. */
  count(): number {
    let n = 0;
    for (let s = 0; s < PLAYER_SLOTS; s++) if (this.ids[s] !== null) n++;
    return n;
  }

  /**
   * At a match start: the host stays 0; every other player is renumbered 1, 2, ... in `order` (the session's player
   * list), players missing from `order` after them in their current slot order. Held flags go with the player. Ids in
   * `order` without a slot are ignored. True when any slot changed.
   */
  compact(order: readonly string[]): boolean {
    const rest: { id: string; held: boolean; rank: number; slot: number }[] = [];
    for (let s = 1; s < PLAYER_SLOTS; s++) {
      const id = this.ids[s];
      if (id === null || id === undefined) continue;
      const i = order.indexOf(id);
      rest.push({ id, held: this.held[s] === true, rank: i < 0 ? order.length + s : i, slot: s });
    }
    rest.sort((a, b) => a.rank - b.rank);
    let changed = false;
    for (let s = 1; s < PLAYER_SLOTS; s++) {
      this.ids[s] = null;
      this.held[s] = false;
    }
    for (let k = 0; k < rest.length; k++) {
      const e = rest[k]!;
      const s = k + 1;
      if (e.slot !== s) changed = true;
      this.ids[s] = e.id;
      this.held[s] = e.held;
    }
    return changed;
  }

  /** The occupied slots in slot order (a new array; lobby and debug use, not per frame). */
  entries(): SlotEntry[] {
    const out: SlotEntry[] = [];
    for (let s = 0; s < PLAYER_SLOTS; s++) {
      const id = this.ids[s];
      if (id !== null && id !== undefined) out.push({ id, slot: s as PlayerSlot, held: this.held[s] === true });
    }
    return out;
  }

  private clearSlot(s: number): void {
    this.ids[s] = null;
    this.held[s] = false;
  }
}

/**
 * (coop4 SM, until N1) The team size: `GameState.teamSize()` (connected + held, N1) when it exists, else the players
 * listed now. TODO(coop4 N1): replace with `g.teamSize()` once gameState.ts has it.
 */
export function teamSizeOf(g: GameState, refs: PlayerRef[]): number {
  return (g as { teamSize?(): number }).teamSize?.() ?? g.playerRefsInto(refs).length;
}

/** (coop4 SM, until N1) A listed player's slot: `TeamRef.slot` (N1) when set, else its list index. */
export function refSlot(r: PlayerRef, index: number): number {
  return (r as Partial<TeamFields>).slot ?? index;
}

/**
 * (coop4 SM) The slot of player `id` ('local' or '' = this machine's player: `g.localSlot`, listed or not, so an OUT
 * host's own live gadget still reads his slot; merge 9 re-check), or `none` when another id is not listed. No allocation.
 */
export function slotOfId(g: GameState, refs: PlayerRef[], id: string, none: number): number {
  if (id === '' || id === 'local') return (g as { localSlot?: number }).localSlot ?? 0;
  const rs = g.playerRefsInto(refs);
  for (let i = 0; i < rs.length; i++) if (rs[i]!.id === id) return refSlot(rs[i]!, i);
  return none;
}
