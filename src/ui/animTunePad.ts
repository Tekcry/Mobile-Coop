import { PAD } from '../input/gamepadMapping';
import { NavRepeater } from '../input/navRepeat';

/**
 * (tuner-pad; pass 2 tuner-camera: the streamlined map) Pad control of the animation tuner, the pure part (no DOM, no
 * Babylon; unit-tested). The panel feeds it the active pad's buttons as a bit mask (bit i = W3C standard button i held,
 * a trigger past half way counts as held) and the left stick X once per frame; it says whether the pad is the tuner's
 * this frame (`consume`: the game sees none of it) and what to do. The panel tells it when a slider or dropdown is in
 * edit mode (`editing`).
 *
 * Modes: `off` (panel closed), `tuner` (the pad drives the panel), `game` (the pad plays), `free` (the free view runs and
 * owns the pad; the panel reads its sticks, triggers, bumpers and D-pad itself). View moves the pad from the tuner to the
 * game (or to the free view while it is on) and back. After opening, closing or switching, every press is swallowed
 * until all buttons are up (`quiet`), so the press that opened the panel never selects and the B that ends an edit never
 * crouches. The map is in `docs/anim-tuner/STATE.md` ("Pad map").
 */
export type TunePadMode = 'off' | 'tuner' | 'game' | 'free';

export interface TunePadOut {
  /** The pad is the tuner's this frame: the game gets none of it. */
  consume: boolean;
  /** Not editing: D-pad up / left -1 (the previous control), down / right +1 (the next); first press, then repeats. */
  nav: number;
  /** Editing: D-pad left / right in whole steps (first press, then repeats while held; x5 after `NUDGE_FAST_S`). */
  adjust: number;
  /** Editing: left stick X, a signed fraction of the control's range to add this frame (analogue). */
  stick: number;
  /** Editing: LT held (fine steps). */
  fine: boolean;
  /** LB / RB (edge): the previous / next section. */
  section: number;
  /** Not editing, LT / RT (edge): the focused section's previous / next state group. */
  group: number;
  /** A (edge): select (press a button, tick a box, start or confirm an edit). */
  select: boolean;
  /** B (edge): back (cancel an edit, close the context menu). */
  back: boolean;
  /** X (edge): reset the focused row. */
  reset: boolean;
  /** Y (edge): the context menu. */
  menu: boolean;
  /** Menu / Start (edge): close the panel. */
  close: boolean;
  /** View (edge): the pad moved between the tuner and the game (or the free view) this frame. */
  toggled: boolean;
  /** B (edge) while the free view has the pad: turn the free view off (the pad goes back to the panel). */
  freeOff: boolean;
  /** (pass 2) R3 held (the tuner or the free view has the pad): the bypass, the untuned animation and camera. */
  bypass: boolean;
  /** (marlow-bays item 13) L3 (edge, the tuner or the free view has the pad): "Loop on the spot" on / off (the studio). */
  spot: boolean;
}

const bit = (i: number): number => 1 << i;
/** Left / right held this long (s) while editing: each repeat steps x5. */
export const NUDGE_FAST_S = 1.0;
/** Left stick: deadzone, and the seconds a full deflection takes to cross a control's whole range. */
export const STICK_DZ = 0.2;
export const STICK_FULL_S = 2.0;
/** The fine-step share (LT held while editing). */
export const FINE_STEP = 0.2;
/** The button that moves the pad between the tuner and the game (View / Back / Select; unbound in play by default). */
export const TUNE_PAD_TOGGLE = PAD.SELECT;

export class TunePadCtl {
  mode: TunePadMode = 'off';
  /** Set by the panel: a slider or dropdown is in edit mode. */
  editing = false;
  readonly out: TunePadOut = {
    consume: false,
    nav: 0,
    adjust: 0,
    stick: 0,
    fine: false,
    section: 0,
    group: 0,
    select: false,
    back: false,
    reset: false,
    menu: false,
    close: false,
    toggled: false,
    freeOff: false,
    bypass: false,
    spot: false,
  };
  private prev = 0;
  private quiet = false;
  private vDir = 0;
  private hDir = 0;
  private hStart = 0;
  private readonly vRep = new NavRepeater(0.35, 0.06);
  private readonly hRep = new NavRepeater(0.35, 0.06);
  /** The free view is on: View alternates the panel and the free view. */
  private freeOn = false;

  /** The panel opened: the pad is the tuner's (once every button is up). */
  open(): void {
    this.mode = 'tuner';
    this.quiet = true;
    this.editing = false;
    this.vDir = this.hDir = 0;
  }

  /** The panel closed: held pad buttons stay swallowed until released. */
  close(): void {
    if (this.mode === 'tuner' || this.mode === 'free') this.quiet = true;
    this.mode = 'off';
    this.freeOn = false;
    this.editing = false;
  }

  /** (tuner-ui) The pause menu has the pad: every button held now stays swallowed once the tuner gets it back. */
  hold(): void {
    this.quiet = true;
  }

  /** The free view turned on (the pad goes to it, unless `take` is false: a held camera snap keeps the pad on the panel)
   *  or off (the pad comes back to the panel). */
  setFree(on: boolean, take = true): void {
    this.freeOn = on;
    if (this.mode === 'off' || (on && !take)) return;
    const next = on ? 'free' : this.mode === 'free' ? 'tuner' : this.mode;
    if (next !== this.mode) {
      this.mode = next;
      this.quiet = true;
      this.editing = false;
      this.vDir = this.hDir = 0;
    }
  }

  /** One frame. `mask`: buttons held (bit per W3C index); `lx`: left stick X -1..1; `now`, `dt` in seconds. Returns the
   *  reused `out` (read it before the next call). No allocation. */
  update(mask: number, lx: number, now: number, dt: number): TunePadOut {
    const o = this.out;
    o.consume = false;
    o.nav = o.adjust = o.stick = o.section = o.group = 0;
    o.fine = o.select = o.back = o.reset = o.menu = o.close = o.toggled = o.freeOff = o.bypass = o.spot = false;
    const pressed = mask & ~this.prev;
    this.prev = mask;
    if (this.quiet) {
      if (mask !== 0) {
        o.consume = true;
        return o;
      }
      this.quiet = false;
    }
    if (this.mode === 'off') return o;
    if (pressed & bit(TUNE_PAD_TOGGLE)) {
      this.mode = this.mode === 'tuner' ? (this.freeOn ? 'free' : 'game') : 'tuner';
      // either way the rest of this press (and anything held with it) reaches nobody
      this.quiet = true;
      this.editing = false;
      this.vDir = this.hDir = 0;
      this.vRep.update(false, now);
      this.hRep.update(false, now);
      o.toggled = true;
      o.consume = true;
      return o;
    }
    if (this.mode === 'game') return o;
    o.consume = true;
    o.bypass = (mask & bit(PAD.RS)) !== 0;
    if (pressed & bit(PAD.START)) {
      o.close = true;
      return o;
    }
    o.spot = (pressed & bit(PAD.LS)) !== 0;
    if (this.mode === 'free') {
      if (pressed & bit(PAD.B)) o.freeOff = true;
      return o;
    }
    if (pressed & bit(PAD.A)) o.select = true;
    if (pressed & bit(PAD.B)) o.back = true;
    if (pressed & bit(PAD.X)) o.reset = true;
    if (pressed & bit(PAD.Y)) o.menu = true;
    if (pressed & bit(PAD.LB)) o.section = -1;
    else if (pressed & bit(PAD.RB)) o.section = 1;
    const v = mask & bit(PAD.UP) ? -1 : mask & bit(PAD.DOWN) ? 1 : 0;
    const h = mask & bit(PAD.LEFT) ? -1 : mask & bit(PAD.RIGHT) ? 1 : 0;
    if (v !== this.vDir) {
      this.vDir = v;
      this.vRep.update(false, now);
    }
    if (h !== this.hDir) {
      this.hDir = h;
      this.hStart = now;
      this.hRep.update(false, now);
    }
    const vStep = v !== 0 && this.vRep.update(true, now);
    const hStep = h !== 0 && this.hRep.update(true, now);
    if (this.editing) {
      if (hStep) o.adjust = now - this.hStart >= NUDGE_FAST_S ? h * 5 : h;
      o.fine = (mask & bit(PAD.LT)) !== 0;
      const ax = Math.abs(lx);
      if (ax > STICK_DZ) {
        const t = (Math.min(1, ax) - STICK_DZ) / (1 - STICK_DZ);
        o.stick = (lx < 0 ? -1 : 1) * t * t * (dt / STICK_FULL_S);
      }
      return o;
    }
    if (vStep) o.nav = v;
    else if (hStep) o.nav = h;
    if (pressed & bit(PAD.LT)) o.group = -1;
    else if (pressed & bit(PAD.RT)) o.group = 1;
    return o;
  }
}
