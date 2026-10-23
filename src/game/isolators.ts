import type { Vector3 } from '../core/babylon';
import { hyp2 } from '../core/mathx';
import { groupBaseOn, type LightRegistry } from '../world/lights';

/**
 * (sector-redesign E4, EW8, A11 / A37 / A38) Breaker and timed isolator boards: a board interactable that cuts one or
 * more light circuits (`LightDef.group`). A breaker (`window` unset or 0) stays cut until a player switches it back; a
 * timed isolator (`window` > 0 s) cuts for that window, then the circuit comes back on its own with a cue (the switch
 * click, the board's indicator lit again, a feed line). A player-started window, never an area clock (A38).
 *
 * It drives the lamps only through `LightRegistry.setGroup`, the same path a wall switch takes, so the light field,
 * the meter and the guards read the cut alike (light parity), a cut calls the sink's `cut` (the game reports it through
 * `EnemyManager.lightsOut`; guard-ai LR16-4: a breaker board's cut is a fault as a wall switch's, a witness walks over
 * and `switchBack`s it; a timed window is the player's, the S2 look only), and the co-op client's lamps follow
 * through slice L's `lamps` message (the registry's base state; no wire change). Host / solo only: the client never
 * builds boards (it mirrors the board items and sends `use`). Pure (no Babylon at runtime); `update` allocates nothing.
 */

/** A timed isolator's default window (s): data that wants a timed board without naming one uses this. */
export const ISOLATOR_WINDOW = 20;
/** Board reach from the feet (m): the wall switch's reach (`stealthSystems.ts`). */
export const BOARD_REACH = 1.3;

/** A board on a wall (facing `yaw`) in `MapLayout.boards` (what a map's `build` returns, next to `switches`). */
export interface BoardDef {
  pos: Vector3;
  yaw: number;
  /** The light circuits it cuts (`LightDef.group`), at least one. */
  groups: readonly number[];
  /** Seconds a timed isolator keeps them cut (> 0); unset or 0: a breaker (cut until switched back). */
  window?: number;
  /** (sector-redesign cap fix) Sector Ops section (co-op mirrors its item only while it is live); none: always. */
  section?: number;
}

/** What `use` did. */
export const BOARD_NONE = 0;
export const BOARD_CUT = 1;
export const BOARD_BACK = 2;

/** How a circuit came back (`BoardSink.back`). */
export const BACK_HAND = 0;
export const BACK_TIMER = 1;

/** The game side of a board (labels, indicator, cue, the guards). */
export interface BoardSink {
  /** Board `i` cut its circuits (at x, z: the guards' `lightsOut`). */
  cut(i: number, x: number, z: number): void;
  /** Board `i` put its circuits back (`BACK_HAND` a player or a guard's switch-back, `BACK_TIMER` a window's end). */
  back(i: number, how: number): void;
}

export class IsolatorBoards {
  /** Per board: 1 its circuits are cut. */
  readonly cut: Uint8Array;
  /** Per board: seconds of a running window left (0: none). */
  readonly left: Float64Array;
  /** Windows that ran out and brought their circuits back (tests). */
  returns = 0;
  private running = 0;

  constructor(
    readonly defs: readonly BoardDef[],
    private readonly reg: LightRegistry,
    private readonly sink: BoardSink | null = null,
  ) {
    this.cut = new Uint8Array(defs.length);
    this.left = new Float64Array(defs.length);
    this.follow();
  }

  /** Board `i` is a timed isolator. */
  timed(i: number): boolean {
    return (this.defs[i]?.window ?? 0) > 0;
  }

  /** A player used board `i` (host: the local player or a client's checked `use`): cut, or (a breaker) switch back. */
  use(i: number): number {
    const d = this.defs[i];
    if (!d) return BOARD_NONE;
    if (!this.cut[i]) {
      this.cut[i] = 1;
      for (let k = 0; k < d.groups.length; k++) this.reg.setGroup(d.groups[k]!, false);
      const w = d.window ?? 0;
      if (w > 0) {
        this.left[i] = w;
        this.running++;
      }
      this.sink?.cut(i, d.pos.x, d.pos.z);
      return BOARD_CUT;
    }
    // a running window is the player's: the board does nothing until it runs out
    if (this.left[i]! > 0) return BOARD_NONE;
    this.restore(i, BACK_HAND);
    return BOARD_BACK;
  }

  /**
   * (guard-ai LR16-4) A guard who reached a cut board switches it back: its circuits on (`setGroup` skips shot lamps),
   * the sink's `back(i, BACK_HAND)` as for a player's switch-back. Called by `StealthSystems`' breaker host at the end of
   * the S15 reset walk. A running timed window is the player's (the board is off-use for everyone until it runs out),
   * so the guard never fights the timer: false then, and false when the board is not cut.
   */
  switchBack(i: number): boolean {
    if (!this.cut[i] || this.left[i]! > 0) return false;
    this.restore(i, BACK_HAND);
    return true;
  }

  /** (guard-ai LR16-4) A running timed window holds circuit `group` (the player's: no guard turns it back on). */
  holding(group: number): boolean {
    if (this.running === 0) return false;
    for (let i = 0; i < this.defs.length; i++) {
      if (this.left[i]! > 0 && this.defs[i]!.groups.includes(group)) return true;
    }
    return false;
  }

  /** (guard-ai LR16-4) The cut board with no running window that holds circuit `group`, nearest (x, z); -1 none. A
   *  guard's reset walk goes to it and `switchBack` puts every circuit of it back. No allocation. */
  cutBoard(group: number, x: number, z: number): number {
    let best = -1;
    let bd = Infinity;
    for (let i = 0; i < this.defs.length; i++) {
      if (!this.cut[i] || this.left[i]! > 0) continue;
      const d = this.defs[i]!;
      if (!d.groups.includes(group)) continue;
      const dd = hyp2(d.pos.x - x, d.pos.z - z);
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    }
    return best;
  }

  /** (guard-ai LR16-4) Board `i`'s first circuit with a lamp not shot out (the circuit its cut is reported on); -1 none. */
  liveGroup(i: number): number {
    const gs = this.defs[i]?.groups;
    if (!gs) return -1;
    for (let k = 0; k < gs.length; k++) if (groupHasLive(this.reg, gs[k]!)) return gs[k]!;
    return -1;
  }

  /** Fixed step: running windows count down; one that runs out brings its circuits back exactly once. Returns how many
   *  came back this step. No allocation. */
  update(dt: number): number {
    if (this.running === 0) return 0;
    let n = 0;
    const left = this.left;
    for (let i = 0; i < left.length; i++) {
      const t = left[i]!;
      if (t <= 0) continue;
      const r = t - dt;
      if (r > 0) {
        left[i] = r;
        continue;
      }
      this.restore(i, BACK_TIMER);
      this.returns++;
      n++;
    }
    return n;
  }

  /** (A50) A section restart, before the lamps are put back: every running window is dropped (nothing relit by it). */
  cancel(): void {
    // a running window's circuits come back silently (no cue, no feed, no lightsOut), so a later `take` records them on
    if (this.running > 0) {
      for (let i = 0; i < this.left.length; i++) {
        if (this.left[i]! <= 0) continue;
        const gs = this.defs[i]!.groups;
        for (let k = 0; k < gs.length; k++) this.reg.setGroup(gs[k]!, true);
      }
    }
    this.left.fill(0);
    this.running = 0;
  }

  /** Each idle board reads its circuits again (cut while none of its groups is on by its switches): after a restart's
   *  lamps were put back, or a wall switch moved a shared circuit. A running window keeps its board cut. */
  follow(): void {
    for (let i = 0; i < this.defs.length; i++) {
      if (this.left[i]! > 0) continue;
      const gs = this.defs[i]!.groups;
      let on = false;
      let live = false;
      for (let k = 0; k < gs.length; k++) {
        if (!on) on = groupBaseOn(this.reg, gs[k]!);
        if (!live) live = groupHasLive(this.reg, gs[k]!);
      }
      // every lamp of its circuits shot out: the board keeps its place
      if (!live) continue;
      this.cut[i] = on ? 0 : 1;
    }
  }

  private restore(i: number, how: number): void {
    const d = this.defs[i]!;
    if (this.left[i]! > 0) {
      this.left[i] = 0;
      this.running--;
    }
    this.cut[i] = 0;
    for (let k = 0; k < d.groups.length; k++) this.reg.setGroup(d.groups[k]!, true);
    this.sink?.back(i, how);
  }
}

/** A group has a lamp that is not shot out (a shot lamp never relights). No allocation. */
function groupHasLive(reg: LightRegistry, group: number): boolean {
  const ls = reg.lights;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i]!;
    if (l.group === group && !l.destroyed) return true;
  }
  return false;
}
