/**
 * (char-shadow-meter S2c, J16) A co-op client's partners in the character contract: with `charShadowLight` on, the
 * client's meter and round shadows count its partners' capsules. The host fills its remote slots from `RemotePlayer.ref`
 * (`playerRefsInto`); a client holds its partners as `RemoteAvatar`s, so this keeps one `MateLike` per partner, refreshed
 * each sim step from the client's own sim view of them, as the host's `RemotePlayer` builds its ref (feet, crouch flag,
 * the rig's standing height, on a wall the sim body's head: `playerBody`, as `PartnerTarget`). `GameState.fillChars`
 * reads it through `charMatesInto`, which `CoopClient` sets.
 *
 * (player-j16) A partner's carried body goes in too: `loadsInto` (client) and `hostLoadsInto` (host) write each carrier's
 * slot of `GameState.charLoadsInto`'s `lin` for `fillOperator`.
 *
 * Babylon-free. Hot: `into`, `loadsInto` and `hostLoadsInto` run every sim step and allocate nothing (indexed loops,
 * kept records).
 */
import { PF } from './protocol';
import { emptyPlayerBodyIn, emptyPlayerBodyOut, playerBody, type PlayerBodyIn, type PlayerBodyOut } from '../player/playerVolumes';
import { LOAD_IN, slotInto, type MateLike } from '../game/charOccluderFill';

/** A read-only point. */
type V3 = { readonly x: number; readonly y: number; readonly z: number };

/** What a partner entry reads: `RemoteAvatar` fits it. */
export interface MateSource {
  readonly pos: V3;
  readonly flags: number;
  readonly dead: boolean;
  /** A state has been shown (before it, `pos` is not real). */
  readonly shown: boolean;
  readonly rig: { readonly height: number };
  bodyIn(out: PlayerBodyIn): PlayerBodyIn;
  /** (player-j16) The shown yaw (rad, 0 = +Z), the shoulder a carried body is on (1 right, -1 left), and the carry's
   *  body while it shows one lifted (`CarryView` sets it, `clear` drops it). Absent: no load. */
  readonly yaw?: number;
  readonly carrySide?: number;
  readonly carryKnees?: unknown;
}

/** A partner's slot inputs (`slotInto`); `head` points at `headV` on a wall, else null. Peek is always 0 here. */
interface MateRef extends MateLike {
  feet: V3;
  crouched: boolean;
  height: number;
  peekX: number;
  peekZ: number;
  head: { x: number; y: number; z: number } | null;
}

interface Entry {
  readonly src: MateSource;
  readonly ref: MateRef;
  readonly headV: { x: number; y: number; z: number };
  readonly bin: PlayerBodyIn;
  readonly bout: PlayerBodyOut;
}

export class CharMates {
  private entries: Entry[] = [];

  /** The partners in slot order (not hot: on a join, a drop or a lobby change). An entry whose source is the same object
   *  is kept. */
  set(order: readonly MateSource[]): void {
    const old = this.entries;
    const next: Entry[] = [];
    for (let i = 0; i < order.length; i++) {
      const src = order[i]!;
      let e: Entry | undefined;
      for (let j = 0; j < old.length; j++) if (old[j]!.src === src) e = old[j];
      next.push(
        e ?? {
          src,
          ref: { feet: src.pos, crouched: false, height: src.rig.height, peekX: 0, peekZ: 0, head: null },
          headV: { x: 0, y: 0, z: 0 },
          bin: emptyPlayerBodyIn(),
          bout: emptyPlayerBodyOut(),
        },
      );
    }
    this.entries = next;
  }

  /** How many partners are listed (tests). */
  get size(): number {
    return this.entries.length;
  }

  /** Entry `i`'s slot inputs as `into` last refreshed them, or null (tests). */
  refOf(i: number): MateLike | null {
    return this.entries[i]?.ref ?? null;
  }

  /**
   * Every shown partner's slot inputs into `pin` slots from..max-1 (`slotInto`), in list order; returns how many. Each
   * ref is refreshed first: feet, crouch flag, the rig's standing height, and on a wall (alive) the sim body's head.
   */
  into(pin: Float64Array, from: number, max: number): number {
    let s = from;
    const es = this.entries;
    for (let i = 0; i < es.length && s < max; i++) {
      const e = es[i]!;
      const src = e.src;
      if (!src.shown) continue;
      const r = e.ref;
      r.feet = src.pos;
      r.crouched = (src.flags & PF.crouch) !== 0;
      r.height = src.rig.height;
      const b = playerBody(src.bodyIn(e.bin), e.bout);
      if (e.bin.wall && !src.dead) {
        const hv = e.headV;
        hv.x = b.head.x;
        hv.y = b.head.y;
        hv.z = b.head.z;
        r.head = hv;
      } else r.head = null;
      slotInto(pin, s, r);
      s++;
    }
    return s - from;
  }

  /**
   * (player-j16) Every shown partner's load into `lin` slots from..max-1 (`LOAD_IN` each), the same walk as `into` (list
   * order, unshown skipped), so a partner's slot here is its slot there: carrying (`carryKnees` set) writes the side (-1
   * left, else 1) and the yaw; otherwise the slot is left as it is.
   */
  loadsInto(lin: Float64Array, from: number, max: number): void {
    let s = from;
    const es = this.entries;
    for (let i = 0; i < es.length && s < max; i++) {
      const src = es[i]!.src;
      if (!src.shown) continue;
      if (src.carryKnees != null) {
        lin[s * LOAD_IN] = src.carrySide === -1 ? -1 : 1;
        lin[s * LOAD_IN + 1] = src.yaw ?? 0;
      }
      s++;
    }
  }
}

/**
 * (player-j16) The host's remote slots' loads: for each slot s in 1..nr-1 (`refs`, the `charRefs` order) whose player has
 * a carry view, the avatar's side (-1 left, else 1) and yaw into `lin`; other slots left as they are. No allocation.
 */
export function hostLoadsInto(
  lin: Float64Array,
  refs: readonly { readonly id: string }[],
  nr: number,
  carries: ReadonlyMap<string, { readonly avatar: { readonly carrySide: number; readonly yaw: number } }>,
): void {
  for (let s = 1; s < nr; s++) {
    const v = carries.get(refs[s]!.id);
    if (v === undefined) continue;
    const a = v.avatar;
    lin[s * LOAD_IN] = a.carrySide === -1 ? -1 : 1;
    lin[s * LOAD_IN + 1] = a.yaw;
  }
}

/**
 * The contract's partner list into `out` (kept, refilled by index): the players in lobby order, self skipped, a partner
 * the host holds as away skipped (`PlayerInfo.away`: the host's `hold` takes it out of `remoteRefs`, so it counts on
 * neither machine), those with an avatar. Not hot (a join, a drop, a lobby change).
 */
export function mateOrderInto<T>(players: Iterable<{ readonly id: string; readonly away: boolean }>, selfId: string, avatars: ReadonlyMap<string, T>, out: T[]): T[] {
  let k = 0;
  for (const p of players) {
    if (p.id === selfId || p.away) continue;
    const a = avatars.get(p.id);
    if (a !== undefined) out[k++] = a;
  }
  out.length = k;
  return out;
}
