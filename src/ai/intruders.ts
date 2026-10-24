/**
 * (guard-ai S24, G139) One last known position per intruder (pure: no Babylon / DOM), unit-tested.
 *
 * Two players apart are two fights: each player who has been seen or located has his own slot (his last known
 * position, whether it is still valid and the time since he was last seen), keyed by player id so a slot stays his when
 * the players list reorders (a rejoin). Each guard hunts one slot at a time (`Enemy.hunt`: his own sighting, the call
 * or shout that told him, a located shot, the alarm caller's for reinforcements). `EnemyManager` mirrors the freshest
 * slot into its old shared fields (`lkp`, `lkpValid`, `sightT`), so solo reads exactly as before (one intruder, slot 0).
 * A146: undo with `INTRUDERS.split = false` (every report writes slot 0, today's one shared position).
 */
import type { PlayerRef } from './enemy';
import type { TeamFields } from '../game/playerSlots';
import { MAX_INTRUDERS } from './targetPick';

/** `split` false: every report writes slot 0 (today's one shared position). `forget`: s after the last sighting with
 *  nobody hunting that intruder. `noFeet` (A148): no position for his intruder = no walk to the real feet. (coop4 AI1,
 *  A171) `reuse` false: a new id with no free slot gets -1 (before AI1: a fifth distinct id is never reported). */
export const INTRUDERS = { split: true, forget: 2, noFeet: true, reuse: true } as const;

/** (coop4 A170) The coop4 rules apply only while at least `from` players are live (`players().length`); 1-2 players
 *  (solo, Marlow Yard, 2-player Sector Ops) are bit-for-bit as before. Undo: `from: Infinity`. */
export const COOP4: { readonly from: number } = { from: 3 };

/**
 * (coop4 AI1) THE seam where src/ai reads a player's fixed team slot (coop4 N0 `TeamRef.slot`, 0 = the host / solo):
 * `ref.slot` when the ref carries one (N1 fills it), else the index in `players()` (host first, then the remotes:
 * today, where nothing sets it). Used for the per-player sight bit (`Enemy.seesIndex`). The intruder board keys by
 * player id, not by this slot (a rejoin keeps its id). No allocation.
 */
export function slotOf(ref: PlayerRef, index: number): number {
  const s = (ref as Partial<TeamFields>).slot;
  return s !== undefined ? s : index;
}

/** (coop4 AI4, A174) `split`: from 3 live players (A170) the alarm's reinforcements are spread over every known
 *  intruder (`alarmHunts`, `EnemyManager.nextAlarmHunt`); false: all hunt the alarm's (today). */
export const ALARM_HUNT = { split: true } as const;

/**
 * (coop4 AI4, A174) The order the alarm's reinforcements hunt the known intruders in, into `out` (length >=
 * `MAX_INTRUDERS`); returns how many. The alarm's slot first (when valid), then every other valid slot by smallest
 * `seenT` (the freshest sighting first; ties: the lower slot). `gone` (the board's, optional): a slot whose player left
 * is skipped (nobody to hunt there). None valid: 0 (the caller keeps today's rule). Pure, no allocation (an insertion
 * into `out`, at most 4 entries).
 */
export function alarmHunts(alarm: number, valid: Uint8Array, seenT: Float32Array, out: Int8Array, gone: Uint8Array | null = null): number {
  let n = 0;
  const first = alarm >= 0 && alarm < MAX_INTRUDERS && valid[alarm] === 1 && !(gone !== null && gone[alarm] === 1);
  if (first) out[n++] = alarm;
  const from = n;
  for (let s = 0; s < MAX_INTRUDERS; s++) {
    if (s === alarm || valid[s] !== 1 || (gone !== null && gone[s] === 1)) continue;
    const t = seenT[s]!;
    let k = n;
    // ascending seenT; slots come in ascending order, so a tie stays behind the lower slot
    while (k > from && seenT[out[k - 1]!]! > t) {
      out[k] = out[k - 1]!;
      k--;
    }
    out[k] = s;
    n++;
  }
  return n;
}

/** `slotFor`'s "is anybody hunting slot s" (the manager's `huntingOf`, bound once). */
export type SlotHunted = (slot: number) => boolean;

/** Seconds since a sighting for a slot never seen. */
const NEVER = 99;

export class IntruderBoard {
  readonly x = new Float32Array(MAX_INTRUDERS);
  readonly y = new Float32Array(MAX_INTRUDERS);
  readonly z = new Float32Array(MAX_INTRUDERS);
  readonly valid = new Uint8Array(MAX_INTRUDERS);
  /** Seconds since slot i was last seen (99 = never). */
  readonly seenT = new Float32Array(MAX_INTRUDERS).fill(NEVER);
  /** (guard-ai S26, A157) Seconds since slot i was last seen OR located (a heard footstep, a located shot); 99 never.
   *  `report` resets it always (`seenT` only when `seen`). S25's probable area grows from it. */
  readonly locT = new Float32Array(MAX_INTRUDERS).fill(NEVER);
  /** Player id per slot ('' = free): stable when the players list reorders (a rejoin, coop4). */
  private readonly ids: string[] = Array.from({ length: MAX_INTRUDERS }, () => '');
  /** (coop4 AI1, A171) 1: slot i's player left (`leave`): kept for his rejoin until a new id needs a slot. */
  readonly gone = new Uint8Array(MAX_INTRUDERS);
  /** (coop4 AI1) The slot the last `slotFor` took from a gone player (-1 none): the manager reads it and releases the
   *  slot's plan, caller, chase field and hunters (`EnemyManager.releaseSlot`), then sets it back to -1. */
  reused = -1;
  /** Report order per slot (the freshest valid one takes over when the freshest is forgotten). */
  private readonly stamp = new Float64Array(MAX_INTRUDERS);
  private seq = 0;
  /** The slot most recently reported (the solo mirror and the response teams), -1 none. */
  freshest = -1;

  constructor(readonly split: boolean = INTRUDERS.split) {}

  /**
   * The slot of player `id` (assigns a free one on first use; his own slot again after a leave, `gone` cleared); -1
   * when all are taken. `split` false: always 0. No allocation (a linear compare over the slots).
   * (coop4 AI1, A171) No free slot and `reuse`: a gone player's slot is taken over: first a gone slot not valid and
   * not hunted (`hunted`, the manager's `huntingOf`; null: nobody hunts), else the gone slot unseen longest (largest
   * `seenT`, ties: the lower slot). Its position and clocks are dropped and `reused` names it (the manager releases
   * the rest). No gone slot: -1 (never a live player's slot). `reuse` is off by default: only the manager turns it
   * on (`EnemyManager.slotForId`: `INTRUDERS.reuse` and 3+ players), so no other caller takes a slot unreleased.
   */
  slotFor(id: string, hunted: SlotHunted | null = null, reuse = false): number {
    if (!this.split) return 0;
    const ids = this.ids;
    let free = -1;
    for (let i = 0; i < MAX_INTRUDERS; i++) {
      const s = ids[i]!;
      if (s === id) {
        this.gone[i] = 0;
        return i;
      }
      if (free < 0 && s === '') free = i;
    }
    if (free >= 0) {
      ids[free] = id;
      return free;
    }
    if (!reuse) return -1;
    const r = this.reuseSlot(hunted);
    if (r < 0) return -1;
    ids[r] = id;
    this.gone[r] = 0;
    this.seenT[r] = NEVER;
    this.locT[r] = NEVER;
    this.forget(r);
    this.stamp[r] = 0;
    this.x[r] = 0;
    this.y[r] = 0;
    this.z[r] = 0;
    this.reused = r;
    return r;
  }

  /** (coop4 AI1, A171) The gone slot a new id takes (-1 none): idle first, else the one unseen longest. */
  private reuseSlot(hunted: SlotHunted | null): number {
    let idle = -1;
    let old = -1;
    for (let i = 0; i < MAX_INTRUDERS; i++) {
      if (this.gone[i] !== 1) continue;
      if (idle < 0 && this.valid[i] !== 1 && !(hunted !== null && hunted(i))) idle = i;
      if (old < 0 || this.seenT[i]! > this.seenT[old]!) old = i;
    }
    return idle >= 0 ? idle : old;
  }

  /** (coop4 AI1) The slot of player `id`, or -1: a read, never assigns (the ghost, the e2e). `split` false: 0. */
  find(id: string): number {
    if (!this.split) return 0;
    for (let i = 0; i < MAX_INTRUDERS; i++) if (this.ids[i] === id) return i;
    return -1;
  }

  /** (coop4 AI1, A171) Player `id` left the run: his slot is marked gone (its position kept for his rejoin, which
   *  clears the mark in `slotFor`). Unknown id, `split` false: nothing. */
  leave(id: string): void {
    if (!this.split || id === '') return;
    const s = this.find(id);
    if (s >= 0) this.gone[s] = 1;
  }

  /** The player id that owns `slot` ('' none). */
  idOf(slot: number): string {
    return slot >= 0 && slot < MAX_INTRUDERS ? this.ids[slot]! : '';
  }

  /** Slot `slot` was seen (`seen`) or located at (x, y, z): its position, valid, the freshest. Out of range: ignored. */
  report(slot: number, x: number, y: number, z: number, seen: boolean): void {
    const s = this.split ? slot : 0;
    if (s < 0 || s >= MAX_INTRUDERS) return;
    this.x[s] = x;
    this.y[s] = y;
    this.z[s] = z;
    this.valid[s] = 1;
    if (seen) this.seenT[s] = 0;
    this.locT[s] = 0;
    this.stamp[s] = ++this.seq;
    this.freshest = s;
  }

  /** Slot `slot` is forgotten; the freshest moves to the latest reported slot still valid (-1 none). */
  forget(slot: number): void {
    if (slot < 0 || slot >= MAX_INTRUDERS) return;
    this.valid[slot] = 0;
    if (this.freshest !== slot) return;
    let f = -1;
    for (let i = 0; i < MAX_INTRUDERS; i++) if (this.valid[i] === 1 && (f < 0 || this.stamp[i]! > this.stamp[f]!)) f = i;
    this.freshest = f;
  }

  step(dt: number): void {
    for (let i = 0; i < MAX_INTRUDERS; i++) {
      this.seenT[i] = this.seenT[i]! + dt;
      this.locT[i] = this.locT[i]! + dt;
    }
  }

  /** Positions dropped (a section unload, a restart); the ids are kept (the same players keep their slots). */
  clear(): void {
    this.valid.fill(0);
    this.seenT.fill(NEVER);
    this.locT.fill(NEVER);
    this.stamp.fill(0);
    this.x.fill(0);
    this.y.fill(0);
    this.z.fill(0);
    this.freshest = -1;
  }
}
