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
import { MAX_INTRUDERS } from './targetPick';

/** `split` false: every report writes slot 0 (today's one shared position). `forget`: s after the last sighting with
 *  nobody hunting that intruder. `noFeet` (A148): no position for his intruder = no walk to the real feet. */
export const INTRUDERS = { split: true, forget: 2, noFeet: true } as const;

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
  private readonly ids: string[] = ['', '', '', ''];
  /** Report order per slot (the freshest valid one takes over when the freshest is forgotten). */
  private readonly stamp = new Float64Array(MAX_INTRUDERS);
  private seq = 0;
  /** The slot most recently reported (the solo mirror and the response teams), -1 none. */
  freshest = -1;

  constructor(readonly split: boolean = INTRUDERS.split) {}

  /** The slot of player `id` (assigns a free one on first use); -1 when all are taken. `split` false: always 0. No
   *  allocation (a linear compare over the slots). */
  slotFor(id: string): number {
    if (!this.split) return 0;
    const ids = this.ids;
    let free = -1;
    for (let i = 0; i < MAX_INTRUDERS; i++) {
      const s = ids[i]!;
      if (s === id) return i;
      if (free < 0 && s === '') free = i;
    }
    if (free >= 0) ids[free] = id;
    return free;
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
