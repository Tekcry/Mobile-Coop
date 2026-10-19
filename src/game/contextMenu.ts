/**
 * (CT prototype G5, AUDIT-ACTIONMENU) The Chaos Theory context action menu, Babylon-free. One list for everything in
 * reach (a guard to grab, a held guard, a door, a body, an object), filled each step by providers in CT order:
 *
 * - `none`: nothing in reach, no list.
 * - `passive`: the list shows top right under the header INTERACT, dim rows, no highlight; walking is free.
 * - `active`: A is held. The header turns into BACK TO GAME (a selectable row above row 1, `CTX_BACK`), row 1 is
 *   highlighted in the press step; the stick / D-pad moves the highlight one row per step (no wrap); releasing A runs
 *   the highlighted row, or nothing on BACK TO GAME. A quick tap therefore runs row 1. A row with a hold time
 *   (`hold` > 0: a hack, a medkit station) fills while A stays held on it and runs once full; let go early, nothing.
 *   B closes the list with no action.
 *
 * Scripted taps (`InputState.tap`: a press with no down and no release, from tests and tools) keep the pre-G5
 * one-press controls: on a list with a `latch` row (the door set) the tap opens the list latched (it stays open with
 * A up) and the next tap runs the highlighted row; on any other list the tap runs row 1. `select` opens the list
 * latched on a given row (the grab view's `sel`, tests). A real press on a latched list turns it into the held one.
 *
 * Allocation-free: the rows are fixed slots refilled by `begin` / `add` / `end` every step; `version` bumps only when
 * something the HUD shows changed, so the HUD writes the DOM only then.
 */

export type CtxState = 'none' | 'passive' | 'active';

/** Most rows the list holds (CT: 4 seen, 5 estimated at a locked door with a body). Starting value. */
export const CTX_MAX = 8;
/** The BACK TO GAME row: the header, selectable above row 1. */
export const CTX_BACK = -1;
/** The stick must come back under this (magnitude) after A goes down before it moves the highlight (a walk that
 *  was under way when A was pressed never scrolls the list). Starting value. */
export const CTX_STICK_IDLE = 0.25;

export interface CtxOption {
  /** What runs the row: a constant tag ('td', 'grab', 'door', 'item'). */
  kind: string;
  /** The option within the kind (a constant tag: 'open', 'knockout', ...). */
  opt: string;
  /** A number the kind needs (a door index, a grab option index; -1 none). */
  ref: number;
  /** The text (the HUD writes it uppercase). */
  label: string;
  /** Seconds A must stay held on the row before it runs (0: the release runs it). */
  hold: number;
  /** A scripted tap opens the list instead of running row 1 (see the file comment). */
  latch: boolean;
}

/** What the menu reads each step (a reused object). */
export interface CtxInput {
  /** A (interact): held now, pressed / released since the last step. */
  down: boolean;
  pressed: boolean;
  released: boolean;
  /** -1 up, +1 down, 0 none (one row per step; `CtxNav` makes it). */
  nav: number;
  /** B / back: close the active list with no action. */
  cancel: boolean;
}

export function emptyCtxInput(): CtxInput {
  return { down: false, pressed: false, released: false, nav: 0, cancel: false };
}

export class ContextMenu {
  state: CtxState = 'none';
  /** The highlighted row while active (`CTX_BACK` = BACK TO GAME). */
  sel = 0;
  /** Rows listed this step. */
  count = 0;
  readonly opts: CtxOption[] = [];
  /** Open with A up (a scripted tap or `select`): the next press runs the highlighted row. */
  latched = false;
  /** Seconds A has stayed held on the highlighted hold row. */
  holdT = 0;
  /** Bumped whenever the state, the highlight, a row or a hold fill changes (the HUD redraws on a change only). */
  version = 0;
  /** A press the menu took is still held: the other A readers ignore the button until it is let go. */
  swallow = false;
  /** (Michael 2026-10-20 08:25, "There is no back to game option once the grab is initiated.") This step's list has
   *  no BACK TO GAME row and no B cancel: the highlight stops at row 1. Set by the provider after `begin`. */
  noBack = false;
  private noBackWas = false;
  private building = 0;
  private dirty = false;
  private keyKind = '';
  private keyOpt = '';
  private keyRef = 0;

  constructor() {
    for (let i = 0; i < CTX_MAX; i++) this.opts.push({ kind: '', opt: '', ref: -1, label: '', hold: 0, latch: false });
  }

  /** Start refilling the list (each step, before the providers). */
  begin(): void {
    const o = this.state === 'active' && this.sel >= 0 ? this.opts[this.sel] : undefined;
    this.keyKind = o ? o.kind : '';
    this.keyOpt = o ? o.opt : '';
    this.keyRef = o ? o.ref : 0;
    this.building = 0;
    this.dirty = false;
    this.noBack = false;
  }

  /** Add a row (ignored past `CTX_MAX`). Constant strings only: nothing is allocated. */
  add(kind: string, opt: string, ref: number, label: string, hold = 0, latch = false): void {
    if (this.building >= CTX_MAX) return;
    const o = this.opts[this.building++]!;
    if (o.kind !== kind || o.opt !== opt || o.ref !== ref || o.label !== label || o.hold !== hold || this.building > this.count) this.dirty = true;
    o.kind = kind;
    o.opt = opt;
    o.ref = ref;
    o.label = label;
    o.hold = hold;
    o.latch = latch;
  }

  /** Finish the list: an active highlight follows its row by id; a row that left the list sends it to BACK TO GAME
   *  (never onto another row: a guard turning must not turn KNOCK OUT into KILL under the thumb). */
  end(): void {
    if (this.building !== this.count || this.noBack !== this.noBackWas) this.dirty = true;
    this.noBackWas = this.noBack;
    this.count = this.building;
    if (this.state === 'active' && this.sel >= 0 && this.count > 0) {
      const at = this.find(this.keyKind, this.keyOpt, this.keyRef);
      const next = at >= 0 ? at : this.noBack ? 0 : CTX_BACK;
      if (next !== this.sel) {
        this.sel = next;
        this.holdT = 0;
        this.dirty = true;
      }
    }
    if (this.dirty) this.version++;
  }

  /** The row index of an option, -1 when not listed. */
  find(kind: string, opt: string, ref: number): number {
    for (let i = 0; i < this.count; i++) {
      const o = this.opts[i]!;
      if (o.kind === kind && o.opt === opt && o.ref === ref) return i;
    }
    return -1;
  }

  /** Any row of a kind is listed. */
  has(kind: string): boolean {
    for (let i = 0; i < this.count; i++) if (this.opts[i]!.kind === kind) return true;
    return false;
  }

  /** The highlighted row's fill 0..1 (a hold row while A stays on it), else 0. */
  get holdK(): number {
    const o = this.state === 'active' && this.sel >= 0 ? this.opts[this.sel] : undefined;
    return o && o.hold > 0 ? Math.min(1, this.holdT / o.hold) : 0;
  }

  /** Open the list latched on row `i` (`CTX_BACK` .. count - 1): the grab view's `sel`, tests. */
  select(i: number): void {
    if (this.count === 0 || i < (this.noBack ? 0 : CTX_BACK) || i >= this.count) return;
    this.state = 'active';
    this.latched = true;
    this.sel = i;
    this.holdT = 0;
    this.version++;
  }

  /** Close everything (respawn, mode end). */
  reset(): void {
    this.state = 'none';
    this.count = 0;
    this.sel = 0;
    this.latched = false;
    this.holdT = 0;
    this.swallow = false;
    this.version++;
  }

  /** One step: returns the row to run now (read it from `opts` before the next `begin`), else -1. */
  step(i: CtxInput, dt: number): number {
    if (!i.down) this.swallow = false;
    if (this.count === 0) {
      if (this.state !== 'none') {
        this.state = 'none';
        this.sel = 0;
        this.latched = false;
        this.holdT = 0;
        this.version++;
      }
      return -1;
    }
    if (this.state === 'none') {
      this.state = 'passive';
      this.version++;
    }
    if (this.state === 'passive') {
      if (!i.pressed) return -1;
      this.swallow = i.down;
      // A went down: the list opens on row 1 in the same step (no hold threshold, AUDIT-ACTIONMENU)
      if (i.down) {
        this.open(false);
        return -1;
      }
      // a scripted tap on a door set: the list opens latched
      if (!i.released && this.anyLatch()) {
        this.open(true);
        return -1;
      }
      // a press and release between two steps (a quick tap) or a scripted tap: row 1, unless it is a hold row
      return this.opts[0]!.hold > 0 ? -1 : 0;
    }
    // active
    if (i.cancel && !this.noBack) {
      this.close();
      return -1;
    }
    if (i.nav !== 0) {
      const next = Math.max(this.noBack ? 0 : CTX_BACK, Math.min(this.count - 1, this.sel + (i.nav > 0 ? 1 : -1)));
      if (next !== this.sel) {
        this.sel = next;
        this.holdT = 0;
        this.version++;
      }
    }
    if (this.latched) {
      if (!i.pressed) return -1;
      this.swallow = i.down;
      if (i.down) {
        // a real press on a latched list: from here it is the held list (the release runs the row)
        this.latched = false;
        this.version++;
        return -1;
      }
      return this.runSel();
    }
    const o = this.sel >= 0 ? this.opts[this.sel]! : null;
    if (o && o.hold > 0 && i.down && !i.released) {
      this.holdT += dt;
      this.version++;
      if (this.holdT >= o.hold) {
        // full: it runs; A is still held (swallowed until let go)
        this.swallow = true;
        return this.runSel();
      }
      return -1;
    }
    if (i.down && !i.released) return -1;
    // released: the highlighted row runs (BACK TO GAME and a hold row let go early: nothing)
    if (o && o.hold > 0) {
      this.close();
      return -1;
    }
    return this.runSel();
  }

  private runSel(): number {
    const r = this.sel;
    this.close();
    return r;
  }

  private open(latched: boolean): void {
    this.state = 'active';
    this.latched = latched;
    this.sel = 0;
    this.holdT = 0;
    this.version++;
  }

  private close(): void {
    this.state = 'passive';
    this.sel = 0;
    this.latched = false;
    this.holdT = 0;
    this.version++;
  }

  private anyLatch(): boolean {
    for (let i = 0; i < this.count; i++) if (this.opts[i]!.latch) return true;
    return false;
  }
}

/**
 * The highlight's step from the input (+1 down, -1 up, 0 none). The D-pad / mouse wheel / gear keys (`speedUp` /
 * `speedDown`) always move it; the stick / W S / arrows (`uiUp` / `uiDown`, with the pad's own repeat) only once the
 * stick has been back near the centre since the list opened (`CTX_STICK_IDLE`). Not active: nothing, and it disarms.
 */
export class CtxNav {
  private armed = false;

  dir(active: boolean, speedUp: boolean, speedDown: boolean, uiUp: boolean, uiDown: boolean, moveMag: number): number {
    if (!active) {
      this.armed = false;
      return 0;
    }
    if (moveMag < CTX_STICK_IDLE) this.armed = true;
    if (speedDown || (this.armed && uiDown)) return 1;
    if (speedUp || (this.armed && uiUp)) return -1;
    return 0;
  }
}
