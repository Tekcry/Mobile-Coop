import { PAD } from '../input/gamepadMapping';
import { NavRepeater } from '../input/navRepeat';

/**
 * (tuner-pad) Pad control of the animation tuner, the pure part (no DOM, no Babylon; unit-tested). The panel feeds it the
 * active pad's buttons as a bit mask (bit i = W3C standard button i held) and the left stick X once per frame; it says
 * whether the pad is the tuner's this frame (`consume`: the game sees none of it) and what to do.
 *
 * Modes: `off` (panel closed), `tuner` (the pad drives the panel), `game` (the pad plays; View hands it back).
 * After opening, closing or giving the pad back, every press is swallowed until all buttons are up (`quiet`), so the press
 * that opened the panel never exports and the B that closed it never crouches.
 */
export type TunePadMode = 'off' | 'tuner' | 'game';

export interface TunePadOut {
  /** The pad is the tuner's this frame: the game gets none of it. */
  consume: boolean;
  /** D-pad up / down (edge): -1 the slider above, +1 the one below. */
  move: number;
  /** D-pad left / right: signed whole steps (first press, then repeats while held; x5 after `NUDGE_FAST_S`). */
  nudge: number;
  /** Left stick X: signed fraction of the slider's range to add this frame (analogue, before snapping to steps). */
  stick: number;
  /** LB / RB (edge): -1 the previous state group, +1 the next. */
  group: number;
  /** Y (edge): reset the focused slider. */
  reset: boolean;
  /** A (edge): export. */
  exportNow: boolean;
  /** B (edge): close the panel. */
  close: boolean;
  /** View (edge): the pad moved between the tuner and the game this frame. */
  toggled: boolean;
}

const bit = (i: number): number => 1 << i;
/** Left / right held this long (s): each repeat steps x5. */
export const NUDGE_FAST_S = 1.0;
/** Left stick: deadzone, and the seconds a full deflection takes to cross a slider's whole range. */
export const STICK_DZ = 0.2;
export const STICK_FULL_S = 2.0;
/** The button that moves the pad between the tuner and the game (View / Back / Select; unbound in play by default). */
export const TUNE_PAD_TOGGLE = PAD.SELECT;

export class TunePadCtl {
  mode: TunePadMode = 'off';
  readonly out: TunePadOut = { consume: false, move: 0, nudge: 0, stick: 0, group: 0, reset: false, exportNow: false, close: false, toggled: false };
  private prev = 0;
  private quiet = false;
  private nudgeDir = 0;
  private nudgeStart = 0;
  private readonly rep = new NavRepeater(0.35, 0.06);

  /** The panel opened: the pad is the tuner's (once every button is up). */
  open(): void {
    this.mode = 'tuner';
    this.quiet = true;
    this.nudgeDir = 0;
  }

  /** The panel closed: held pad buttons stay swallowed until released. */
  close(): void {
    if (this.mode === 'tuner') this.quiet = true;
    this.mode = 'off';
  }

  /** One frame. `mask`: buttons held (bit per W3C index); `lx`: left stick X -1..1; `now`, `dt` in seconds. Returns the
   *  reused `out` (read it before the next call). No allocation. */
  update(mask: number, lx: number, now: number, dt: number): TunePadOut {
    const o = this.out;
    o.consume = false;
    o.move = 0;
    o.nudge = 0;
    o.stick = 0;
    o.group = 0;
    o.reset = false;
    o.exportNow = false;
    o.close = false;
    o.toggled = false;
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
      this.quiet = true;
      this.nudgeDir = 0;
      this.rep.update(false, now);
      o.toggled = true;
      o.consume = true;
      return o;
    }
    if (this.mode === 'game') return o;
    o.consume = true;
    if (pressed & bit(PAD.B)) {
      o.close = true;
      return o;
    }
    if (pressed & bit(PAD.UP)) o.move = -1;
    else if (pressed & bit(PAD.DOWN)) o.move = 1;
    if (pressed & bit(PAD.LB)) o.group = -1;
    else if (pressed & bit(PAD.RB)) o.group = 1;
    if (pressed & bit(PAD.Y)) o.reset = true;
    if (pressed & bit(PAD.A)) o.exportNow = true;
    const dir = mask & bit(PAD.RIGHT) ? 1 : mask & bit(PAD.LEFT) ? -1 : 0;
    if (dir !== this.nudgeDir) {
      this.nudgeDir = dir;
      this.nudgeStart = now;
      this.rep.update(false, now);
    }
    if (dir !== 0 && this.rep.update(true, now)) o.nudge = now - this.nudgeStart >= NUDGE_FAST_S ? dir * 5 : dir;
    const ax = Math.abs(lx);
    if (ax > STICK_DZ) {
      const t = (Math.min(1, ax) - STICK_DZ) / (1 - STICK_DZ);
      o.stick = (lx < 0 ? -1 : 1) * t * t * (dt / STICK_FULL_S);
    }
    return o;
  }
}
