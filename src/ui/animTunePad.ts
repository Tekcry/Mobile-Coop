import { PAD } from '../input/gamepadMapping';
import { NavRepeater } from '../input/navRepeat';

/**
 * (tuner-pad; marlow-bays item 29: tuner v3, the simpler map) Pad control of the animation tuner, the pure part (no DOM,
 * no Babylon; unit-tested in `tests/animTunePad.test.ts`). The panel feeds it the active pad's buttons as a bit mask (bit
 * i = W3C standard button i held, a trigger past half way counts as held) and the left stick once per frame; it says
 * whether the pad is the tuner's this frame (`consume`: the game sees none of it) and what to do.
 *
 * The v3 map (item 29, Michael: "scroll the menus with an analogue stick, and easily swap between adjusting camera and
 * adjusting sliders"): the left stick up / down moves through the list (analogue: the further and the longer it is held,
 * the faster it repeats), the left stick left / right changes the focused value (analogue; held, it speeds up), A opens /
 * picks, B backs out, X resets, Y the quick menu, LB / RB the tabs. The right stick and the triggers are ALWAYS the
 * camera (the panel reads them straight from the pad; no camera mode to switch). The D-pad still works (up / down rows,
 * left / right one step of the value) but is optional. View hands the pad to the game and back; Menu closes the panel.
 * There is no edit mode: the focused slider is the one the stick changes.
 *
 * Modes: `off` (panel closed), `tuner` (the pad drives the panel), `game` (the pad plays). After opening, closing or
 * switching, every press is swallowed until all buttons are up (`quiet`), so the press that opened the panel never selects
 * and the B that backs out never crouches. The map is in `docs/archive/anim-tuner/STATE.md` ("Pad map").
 */
export type TunePadMode = 'off' | 'tuner' | 'game';

export interface TunePadOut {
  /** The pad is the tuner's this frame: the game gets none of it. */
  consume: boolean;
  /** Up / down through the list (-1 / +1): the D-pad (first press, then repeats) or the left stick (analogue repeat). */
  nav: number;
  /** D-pad left / right (-1 / +1, repeats while held; x5 after `NUDGE_FAST_S`): one step of the focused value. */
  side: number;
  /** Left stick X: a signed share of the focused control's range to add this frame (analogue; held, it accelerates). */
  stick: number;
  /** LB / RB (edge): the previous / next tab. */
  section: number;
  /** A (edge): open a list, pick, press a button, tick a box. */
  select: boolean;
  /** B (edge): back out (close a list or the quick menu; from a slider to its state list). */
  back: boolean;
  /** X (edge): reset the focused slider. */
  reset: boolean;
  /** Y (edge): the quick menu. */
  menu: boolean;
  /** Menu / Start (edge): close the panel. */
  close: boolean;
  /** View (edge): the pad moved between the tuner and the game this frame. */
  toggled: boolean;
  /** R3 held (the tuner has the pad): the bypass, the untuned animation and camera. */
  bypass: boolean;
  /** (marlow-bays item 13) L3 (edge, the tuner has the pad): "Loop on the spot" on / off (the chamber). */
  spot: boolean;
}

const bit = (i: number): number => 1 << i;
/** D-pad left / right held this long (s): each repeat steps x5. */
export const NUDGE_FAST_S = 1.0;
/** Left stick: deadzone; a full deflection crosses a control's whole range in this many seconds (before the speed-up). */
export const STICK_DZ = 0.2;
export const STICK_FULL_S = 2.0;
/** Left stick X held: the speed-up grows by this per second held, up to `STICK_ACCEL_MAX` times. */
export const STICK_ACCEL = 2;
export const STICK_ACCEL_MAX = 4;
/** Left stick Y: past this it scrolls; the repeat interval (s) at the threshold and at full deflection; held longer than
 *  `SCROLL_FAST_S` the interval halves. */
export const SCROLL_DZ = 0.35;
export const SCROLL_SLOW_S = 0.32;
export const SCROLL_FULL_S = 0.07;
export const SCROLL_FAST_S = 1.0;
/** The button that moves the pad between the tuner and the game (View / Back / Select; also the game's show-objective tap, G343: the tuner consumes it while it is open). */
export const TUNE_PAD_TOGGLE = PAD.SELECT;

/** The left stick's scroll repeat interval (s) for a deflection `t` (0 at the threshold .. 1 full) held `heldS` seconds. */
export function scrollInterval(t: number, heldS: number): number {
  const c = Math.max(0, Math.min(1, t));
  const base = SCROLL_SLOW_S + (SCROLL_FULL_S - SCROLL_SLOW_S) * c;
  return heldS >= SCROLL_FAST_S ? base * 0.5 : base;
}

export class TunePadCtl {
  mode: TunePadMode = 'off';
  readonly out: TunePadOut = {
    consume: false,
    nav: 0,
    side: 0,
    stick: 0,
    section: 0,
    select: false,
    back: false,
    reset: false,
    menu: false,
    close: false,
    toggled: false,
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
  /** The left stick's scroll: the held direction, since when, the last step. */
  private sDir = 0;
  private sStart = 0;
  private sLast = 0;
  /** The left stick X held since (s; -1 not held). */
  private xStart = -1;

  /** The panel opened: the pad is the tuner's (once every button is up). */
  open(): void {
    this.mode = 'tuner';
    this.reset();
  }

  /** The panel closed: held pad buttons stay swallowed until released. */
  close(): void {
    if (this.mode === 'tuner') this.quiet = true;
    this.mode = 'off';
  }

  /** (tuner-ui) The pause menu has the pad: every button held now stays swallowed once the tuner gets it back. */
  hold(): void {
    this.quiet = true;
  }

  private reset(): void {
    this.quiet = true;
    this.vDir = this.hDir = this.sDir = 0;
    this.xStart = -1;
  }

  /** One frame. `mask`: buttons held (bit per W3C index); `lx`, `ly`: the left stick -1..1 (y down +); `now`, `dt` in
   *  seconds. Returns the reused `out` (read it before the next call). No allocation. */
  update(mask: number, lx: number, ly: number, now: number, dt: number): TunePadOut {
    const o = this.out;
    o.consume = false;
    o.nav = o.side = o.stick = o.section = 0;
    o.select = o.back = o.reset = o.menu = o.close = o.toggled = o.bypass = o.spot = false;
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
      this.mode = this.mode === 'tuner' ? 'game' : 'tuner';
      // either way the rest of this press (and anything held with it) reaches nobody
      this.reset();
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
    if (pressed & bit(PAD.A)) o.select = true;
    if (pressed & bit(PAD.B)) o.back = true;
    if (pressed & bit(PAD.X)) o.reset = true;
    if (pressed & bit(PAD.Y)) o.menu = true;
    if (pressed & bit(PAD.LB)) o.section = -1;
    else if (pressed & bit(PAD.RB)) o.section = 1;
    // the D-pad: up / down rows, left / right one step (both repeat while held)
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
    if (v !== 0 && this.vRep.update(true, now)) o.nav = v;
    if (h !== 0 && this.hRep.update(true, now)) o.side = now - this.hStart >= NUDGE_FAST_S ? h * 5 : h;
    // the left stick: the axis it leans on most decides (a scroll never nudges the value, a nudge never scrolls)
    const ax = Math.abs(lx);
    const ay = Math.abs(ly);
    const sy = ay > ax && ay > SCROLL_DZ ? (ly < 0 ? -1 : 1) : 0;
    if (sy !== this.sDir) {
      this.sDir = sy;
      this.sStart = now;
      if (sy !== 0) {
        // the first lean steps at once
        this.sLast = now;
        if (o.nav === 0) o.nav = sy;
      }
    } else if (sy !== 0) {
      const t = (ay - SCROLL_DZ) / (1 - SCROLL_DZ);
      if (now - this.sLast >= scrollInterval(t, now - this.sStart)) {
        this.sLast = now;
        if (o.nav === 0) o.nav = sy;
      }
    }
    if (ax > STICK_DZ && ax >= ay) {
      if (this.xStart < 0) this.xStart = now;
      const t = (Math.min(1, ax) - STICK_DZ) / (1 - STICK_DZ);
      const accel = Math.min(STICK_ACCEL_MAX, 1 + (now - this.xStart) * STICK_ACCEL);
      o.stick = (lx < 0 ? -1 : 1) * t * t * accel * (dt / STICK_FULL_S);
    } else this.xStart = -1;
    return o;
  }
}
