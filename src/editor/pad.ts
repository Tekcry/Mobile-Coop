/**
 * Controller reading for the level editor (ED2 Part C), pure: button edges, taps and holds, D-pad repeat, sticks with
 * the game's radial dead zone, and button names for the controller style. DOM-free
 * (tests/editor/editorPad.test.ts); padControl.ts feeds it `navigator.getGamepads()` once per frame.
 */
import { GLYPHS, PAD, TapHold } from '../input/gamepadMapping';
import type { PadStyle } from '../input/gamepadMapping';
import { applyAxisDeadzone, applyRadialDeadzone } from '../input/stickMath';

export { PAD };

export interface PadSnap {
  buttons: readonly number[];
  axes: readonly number[];
}

const DOWN = 0.5;
export const STICK_DEAD = 0.18;
export const TRIGGER_DEAD = 0.08;
/** Hold times (seconds): X held redoes, View held changes the layout, RB held is free (ON0a: Y is a plain press), L3 held starts the walk test (ON0b). */
export const HOLD = { X: 0.5, Y: 0.2, VIEW: 0.4, RB: 0.3, L3: 0.6 } as const;
/** D-pad repeat while held: first repeat, then every. */
export const REPEAT_FIRST = 0.35;
export const REPEAT_EVERY = 0.12;

/** One pad frame: what changed since the last frame. */
export class PadState {
  private prev: boolean[] = [];
  private cur: boolean[] = [];
  private downAt: number[] = [];
  private repeatAt: number[] = [];
  private readonly x = new TapHold(HOLD.X);
  private readonly y = new TapHold(HOLD.Y);
  private readonly view = new TapHold(HOLD.VIEW);
  private readonly rb = new TapHold(HOLD.RB);
  private readonly l3 = new TapHold(HOLD.L3);
  /** Tap or hold of X, Y, View and RB this frame. */
  xTap: 'tap' | 'hold' | null = null;
  yTap: 'tap' | 'hold' | null = null;
  viewTap: 'tap' | 'hold' | null = null;
  rbTap: 'tap' | 'hold' | null = null;
  /** L3: a tap is the quick walk, a hold the walk test (ON0b decision 4). */
  l3Tap: 'tap' | 'hold' | null = null;
  ls = { x: 0, y: 0 };
  rs = { x: 0, y: 0 };
  /** Raw left and right stick (menus apply their own dead zone, stickSteps.ts). */
  rawL = { x: 0, y: 0 };
  rawR = { x: 0, y: 0 };
  lt = 0;
  rt = 0;
  /** Anything pressed or pushed this frame (the hint bar's last device). */
  active = false;
  private now = 0;

  update(s: PadSnap, now: number): void {
    this.now = now;
    this.prev = this.cur;
    this.cur = [];
    for (let i = 0; i < 17; i++) {
      const d = (s.buttons[i] ?? 0) > DOWN;
      this.cur.push(d);
      if (d && !this.prev[i]) {
        this.downAt[i] = now;
        this.repeatAt[i] = now + REPEAT_FIRST;
      }
    }
    const ax = (i: number): number => s.axes[i] ?? 0;
    this.rawL = { x: ax(0), y: ax(1) };
    this.rawR = { x: ax(2), y: ax(3) };
    this.ls = applyRadialDeadzone(ax(0), ax(1), STICK_DEAD);
    this.rs = applyRadialDeadzone(ax(2), ax(3), STICK_DEAD);
    this.lt = applyAxisDeadzone(s.buttons[PAD.LT] ?? 0, TRIGGER_DEAD);
    this.rt = applyAxisDeadzone(s.buttons[PAD.RT] ?? 0, TRIGGER_DEAD);
    this.xTap = this.x.update(this.down(PAD.X), now);
    this.yTap = this.y.update(this.down(PAD.Y), now);
    this.viewTap = this.view.update(this.down(PAD.SELECT), now);
    this.rbTap = this.rb.update(this.down(PAD.RB), now);
    this.l3Tap = this.l3.update(this.down(PAD.LS), now);
    this.active = this.cur.some(Boolean) || this.ls.x !== 0 || this.ls.y !== 0 || this.rs.x !== 0 || this.rs.y !== 0 || this.lt > 0 || this.rt > 0;
  }

  down(i: number): boolean {
    return this.cur[i] ?? false;
  }

  pressed(i: number): boolean {
    return (this.cur[i] ?? false) && !(this.prev[i] ?? false);
  }

  released(i: number): boolean {
    return !(this.cur[i] ?? false) && (this.prev[i] ?? false);
  }

  /** Pressed now, or held long enough for the next repeat (D-pad steps). */
  repeat(i: number): boolean {
    if (this.pressed(i)) return true;
    if (!this.down(i) || this.now < (this.repeatAt[i] ?? Infinity)) return false;
    this.repeatAt[i] = this.now + REPEAT_EVERY;
    return true;
  }

  /** Seconds the button has been down (0 when up). */
  heldFor(i: number): number {
    return this.down(i) ? this.now - (this.downAt[i] ?? this.now) : 0;
  }
}

const EXTRA: Record<PadStyle, Record<string, string>> = {
  xbox: { RS: 'RS', L3: 'LS click', R3: 'RS click', View: 'View', Menu: 'Menu' },
  playstation: { RS: 'R stick', L3: 'L3', R3: 'R3', View: 'Create', Menu: 'Options' },
  nintendo: { RS: 'R stick', L3: 'L stick click', R3: 'R stick click', View: '-', Menu: '+' },
};

/** A pad binding in the controller's own names: "Y hold" -> "△ hold" on a PlayStation pad. */
export function padWords(binding: string, style: PadStyle): string {
  const g = GLYPHS[style] as Record<string, string>;
  return binding
    .split(' ')
    .map((w) => {
      if (w.includes('/')) return w.split('/').map((x) => padWords(x, style)).join('/');
      if (w === 'LS') return style === 'xbox' ? 'LS' : 'L stick';
      if (w === 'Menu') return EXTRA[style].Menu!;
      return EXTRA[style][w] ?? g[w] ?? w;
    })
    .join(' ');
}
