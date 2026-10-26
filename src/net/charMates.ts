/**
 * (char-shadow-meter S2c, J16) A co-op client's partners in the character contract: with `charShadowLight` on, the
 * client's meter and round shadows count its partners' capsules. The host fills its remote slots from `RemotePlayer.ref`
 * (`playerRefsInto`); a client holds its partners as `RemoteAvatar`s, so this keeps one `MateLike` per partner, refreshed
 * each sim step from the client's own sim view of them, as the host's `RemotePlayer` builds its ref (feet, crouch flag,
 * the rig's standing height, on a wall the sim body's head: `playerBody`, as `PartnerTarget`). `GameState.fillChars`
 * reads it through `charMatesInto`, which `CoopClient` sets.
 *
 * Babylon-free. Hot: `into` runs every sim step and allocates nothing (indexed loops, kept records).
 */
import { PF } from './protocol';
import { emptyPlayerBodyIn, emptyPlayerBodyOut, playerBody, type PlayerBodyIn, type PlayerBodyOut } from '../player/playerVolumes';
import { slotInto, type MateLike } from '../game/charOccluderFill';

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
}

/** `mateOrderInto`'s default: nobody is out (Marlow Yard, 1-2 player Sector Ops). */
const NEVER_OUT = (): boolean => false;

/**
 * The contract's partner list into `out` (kept, refilled by index): the players in lobby order, self skipped, a partner
 * the host holds as away skipped (`PlayerInfo.away`: the host's `hold` takes it out of `remoteRefs`, so it counts on
 * neither machine), a partner `isOut` names skipped (coop4 OUT: the host leaves him out of `playerRefsInto`), those
 * with an avatar. Not hot (a join, a drop, a lobby change, an OUT change).
 */
export function mateOrderInto<T>(
  players: Iterable<{ readonly id: string; readonly away: boolean }>,
  selfId: string,
  avatars: ReadonlyMap<string, T>,
  out: T[],
  isOut: (id: string) => boolean = NEVER_OUT,
): T[] {
  let k = 0;
  for (const p of players) {
    if (p.id === selfId || p.away || isOut(p.id)) continue;
    const a = avatars.get(p.id);
    if (a !== undefined) out[k++] = a;
  }
  out.length = k;
  return out;
}
