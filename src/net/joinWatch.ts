import { hyp2 } from '../core/mathx';
import { joinIsReload, type SlotPoint } from '../game/spawnSlots';

/**
 * (coop-rejoin fix round, check A B1) The host's watch over a client the match went to again (`late`: a late join, a
 * rejoin, a reconnect) and the `restore` it repeats to a client until it stands there (marlow-bays R2). Pure: CoopHost
 * feeds it the client's states and the teleports it sends, and acts on what it returns.
 *
 * A client's first states after `late` can come from its OLD match: its page stays open while it waits for the host and
 * reloads only when the `start` reaches it. So the watch stays open (`JOIN_WATCH_S` from the last load gap) and places
 * the client on the first state that is its reload (`joinIsReload`: a jump of 3 m or more from the previous accepted
 * state, into its start area, not onto a restore the host sent), never while a teleport the host sent it (a `back`, a
 * revive) is in flight unless it is the watch's first state or follows a load gap that began before that teleport went
 * out. It ends when the restore that placement set is met or runs out, after the watch time, or when the client drops
 * again.
 */

/** A spot the host keeps sending a client to (`restore` event) until it stands there. */
export interface RestoreSpot {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Host time the last `restore` went out (-1: not yet). */
  sent: number;
  /** Host time the repeat stops (0: held, not started). */
  until: number;
}

/** How long the watch looks for a client's reload after its last load gap (s). */
export const JOIN_WATCH_S = 30;
/** No state for this long (s): the client is loading its match; its next state restarts the watch time. */
export const JOIN_GAP_S = 1;
/** How long a revive's teleport is in flight (s): states from before it are not a reload. */
export const JOIN_REVIVE_QUIET_S = 2;
/** The restore repeat: every this many seconds (s), for `RESTORE_S`, until the client stands within `RESTORE_MET_M`. */
export const RESTORE_REPEAT_S = 0.5;
export const RESTORE_S = 30;
export const RESTORE_MET_M = 1;

/** `JoinWatch.state` result bits: send the section state at once; place the client (`joinSpawn`). */
export const JOIN_RESYNC = 1;
export const JOIN_PLACE = 2;

interface Pending {
  /** Where its slot was held (R2) when the match went to it again, else null. */
  held: SlotPoint | null;
  /** The slot points its match loads at (`startSlotPoints` at the bay its `start` carried). */
  start: readonly SlotPoint[];
  resynced: boolean;
  placed: boolean;
  /** Host time of its last state (-1: none yet). */
  lastT: number;
  until: number;
  /** No reload check before this host time (a teleport the host sent it is in flight). */
  quietUntil: number;
  /** Host time the host last moved it (`moved`; 0: never). */
  movedT: number;
}

export class JoinWatch {
  readonly restores = new Map<string, RestoreSpot>();
  private readonly pending = new Map<string, Pending>();

  /** (R2) Client `id` dropped: where it stood comes back on its rejoin (the repeat starts at `resume`). An open watch
   *  ends (coop-rejoin-2): its next rejoin's `late` opens a fresh one, so a placement still unmet at the drop cannot
   *  close that watch when the old match meets the new held restore. */
  hold(id: string, at: SlotPoint): void {
    this.restores.set(id, { x: at.x, y: at.y, z: at.z, yaw: at.yaw, sent: -1, until: 0 });
    this.pending.delete(id);
  }

  /** (coop4 round fix) Held client `id`'s place moved while it was away (an OUT return at the connector): the held
   *  restore and an open watch's held spot point at `at`. Unlike `hold`, a watch its rejoin already opened stays open
   *  (its first state still resyncs the section). */
  rehold(id: string, at: SlotPoint): void {
    const r = this.restores.get(id);
    this.restores.set(id, { x: at.x, y: at.y, z: at.z, yaw: at.yaw, sent: -1, until: r?.until ?? 0 });
    const p = this.pending.get(id);
    if (p) p.held = { x: at.x, y: at.y, z: at.z, yaw: at.yaw };
  }

  /** (R2) The held client's first state: its restore repeats from now. */
  resume(id: string, now: number): void {
    const at = this.restores.get(id);
    if (at) at.until = now + RESTORE_S;
  }

  /** The match went to client `id` again; `start` is where its match loads. A repeat (`late` comes once per hello)
   *  keeps the open watch. */
  late(id: string, start: readonly SlotPoint[], now: number): void {
    const p = this.pending.get(id);
    if (p) {
      p.start = start;
      p.until = now + JOIN_WATCH_S;
      return;
    }
    const h = this.restores.get(id);
    this.pending.set(id, {
      held: h ? { x: h.x, y: h.y, z: h.z, yaw: h.yaw } : null,
      start,
      resynced: false,
      placed: false,
      lastT: -1,
      until: now + JOIN_WATCH_S,
      quietUntil: 0,
      movedT: 0,
    });
  }

  watching(id: string): boolean {
    return this.pending.has(id);
  }

  /** Where client `id`'s slot was held when the match went to it again (null: not held). */
  heldSpot(id: string): SlotPoint | null {
    return this.pending.get(id)?.held ?? null;
  }

  /** The host moved client `id` itself (a camera hallway `back`, a revive): no reload check for `s` seconds. */
  moved(id: string, now: number, s: number): void {
    const p = this.pending.get(id);
    if (!p) return;
    p.quietUntil = Math.max(p.quietUntil, now + s);
    p.movedT = now;
  }

  /** (check A P2) A checkpoint restart put client `id` on its slot: a restore still repeating (its join or held spot)
   *  stops, so it cannot pull the client back afterwards; the revive's teleport is in flight. */
  respawned(id: string, now: number): void {
    this.restores.delete(id);
    this.moved(id, now, JOIN_REVIVE_QUIET_S);
  }

  /**
   * A state from client `id` at (x, z), before the host accepts it; `prev` is its previous accepted state (null: none).
   * Returns `JOIN_RESYNC` on the first state of a watch, `JOIN_PLACE` on its reload, else 0.
   */
  state(id: string, prev: { x: number; z: number } | null, x: number, z: number, now: number): number {
    const p = this.pending.get(id);
    if (!p) return 0;
    let out = 0;
    if (!p.resynced) {
      p.resynced = true;
      out |= JOIN_RESYNC;
    }
    // its first state, or the first after a load gap: the watch time starts again
    const lastT = p.lastT;
    const gap = lastT < 0 || now - lastT > JOIN_GAP_S;
    if (gap) p.until = now + JOIN_WATCH_S;
    p.lastT = now;
    if (now > p.until) {
      this.pending.delete(id);
      return out;
    }
    // (coop-rejoin-2) a running match never goes 1 s+ without a state, so a state after a load gap that began before
    // the teleport went out (or the watch's first) is never a stale pre-teleport one: it is checked even while that
    // teleport is in flight (a restart during the load: its revive is lost). (check A1) A gap after a state that came
    // once the teleport was out is a stall, not a load: the in-flight skip holds.
    if (now < p.quietUntil && !(gap && lastT < p.movedT)) return out;
    if (joinIsReload(prev, x, z, p.start, this.restores.get(id) ?? null)) out |= JOIN_PLACE;
    return out;
  }

  /** The host placed client `id` at `at`: the restore repeats until it stands there (the watch stays open for a later
   *  reload until then). */
  place(id: string, at: SlotPoint, now: number): void {
    this.restores.set(id, { x: at.x, y: at.y, z: at.z, yaw: at.yaw, sent: -1, until: now + RESTORE_S });
    const p = this.pending.get(id);
    if (p) p.placed = true;
  }

  /** A restore is repeating to client `id` (its states may jump there: a teleport is allowed). */
  restoring(id: string): boolean {
    return this.restores.has(id);
  }

  /**
   * Each state from client `id` (accepted, at (x, z)): the restore to send now, or null. A restore met (the client
   * within `RESTORE_MET_M`) or run out ends, and with it a watch whose placement set it.
   */
  restoreStep(id: string, x: number, z: number, now: number): RestoreSpot | null {
    const at = this.restores.get(id);
    if (!at) return null;
    if (now > at.until || hyp2(x - at.x, z - at.z) < RESTORE_MET_M) {
      this.restores.delete(id);
      if (this.pending.get(id)?.placed) this.pending.delete(id);
      return null;
    }
    if (at.sent >= 0 && now - at.sent < RESTORE_REPEAT_S) return null;
    at.sent = now;
    return at;
  }

  /** Client `id` left for good. */
  drop(id: string): void {
    this.restores.delete(id);
    this.pending.delete(id);
  }
}
