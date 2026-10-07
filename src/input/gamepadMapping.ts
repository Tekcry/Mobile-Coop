import type { ButtonAction, Vec2 } from './actions';
import { applyAxisDeadzone, applyCurve, applyRadialDeadzone, type CurveKind } from './stickMath';

/** W3C "standard" gamepad layout indices. */
export const PAD = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  SELECT: 8,
  START: 9,
  LS: 10,
  RS: 11,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
  HOME: 16,
} as const;

export interface PadSnapshot {
  /** Button values 0..1 (pressed digital buttons are 1). */
  buttons: readonly number[];
  axes: readonly number[];
}

export interface PadTuning {
  deadzoneLeft: number;
  deadzoneRight: number;
  triggerDeadzone: number;
  curve: CurveKind;
  invertY: boolean;
}

export interface PadFrame {
  buttons: Partial<Record<ButtonAction, boolean>>;
  move: Vec2;
  /** Look rate -1..1 (x right, y up). Multiply by sensitivity * dt. */
  look: Vec2;
  fireAnalog: number;
  /** True if anything is being actuated (for input-mode switching). */
  active: boolean;
}

const BTN_THRESHOLD = 0.5;

/**
 * Gameplay binding: digital button index -> action (a button may drive several). Triggers handled
 * separately. A cover / cover-to-cover, B crouch (stand / crouch at high cover), Y traverse + interact
 * (contextual), X reload (the source turns a hold into a weapon swap), L3 sprint, R3 shoulder. 3.2.0: D-pad up /
 * down the speed gear, right the gadget (hold to aim), left the gadget wheel (the source: a tap is a co-op ping, a
 * hold opens the wheel); View goggles (the source: a tap is goggles, a hold an emote).
 */
export const GAME_BINDINGS: ReadonlyArray<[number, ButtonAction]> = [
  [PAD.A, 'cover'],
  [PAD.B, 'crouch'],
  [PAD.X, 'reload'],
  [PAD.Y, 'jump'],
  [PAD.Y, 'interact'],
  [PAD.RB, 'swapNext'],
  [PAD.RB, 'mark'],
  [PAD.LB, 'swapPrev'],
  [PAD.START, 'pause'],
  [PAD.SELECT, 'vision'],
  [PAD.LS, 'dash'],
  [PAD.RS, 'shoulderSwap'],
  [PAD.UP, 'speedUp'],
  [PAD.DOWN, 'speedDown'],
  [PAD.RIGHT, 'grenade'],
  [PAD.LEFT, 'gadgetWheel'],
];

/**
 * Tap or hold on one button (pure; times in seconds): released before `hold` is a tap (reported on release), held
 * to `hold` is a hold (reported once per press).
 */
export class TapHold {
  private downAt = -1;
  private fired = false;

  constructor(readonly hold: number) {}

  update(down: boolean, now: number): 'tap' | 'hold' | null {
    if (down) {
      if (this.downAt < 0) {
        this.downAt = now;
        this.fired = false;
      }
      if (!this.fired && now - this.downAt >= this.hold) {
        this.fired = true;
        return 'hold';
      }
      return null;
    }
    const was = this.downAt >= 0 && !this.fired;
    this.downAt = -1;
    this.fired = false;
    return was ? 'tap' : null;
  }
}

/** Menu binding. Directions from the d-pad; the left stick is merged in mapPad. */
export const UI_BINDINGS: ReadonlyArray<[number, ButtonAction]> = [
  [PAD.A, 'uiConfirm'],
  [PAD.B, 'uiBack'],
  [PAD.START, 'uiBack'],
  [PAD.LB, 'uiTabPrev'],
  [PAD.RB, 'uiTabNext'],
  [PAD.Y, 'uiAlt'],
  [PAD.UP, 'uiUp'],
  [PAD.DOWN, 'uiDown'],
  [PAD.LEFT, 'uiLeft'],
  [PAD.RIGHT, 'uiRight'],
];

const STICK_NAV_THRESHOLD = 0.55;

export function mapPad(p: PadSnapshot, t: PadTuning): PadFrame {
  const b = (i: number): number => p.buttons[i] ?? 0;
  const ax = (i: number): number => p.axes[i] ?? 0;
  const out: PadFrame['buttons'] = {};

  for (const [i, a] of GAME_BINDINGS) if (b(i) > BTN_THRESHOLD) out[a] = true;
  for (const [i, a] of UI_BINDINGS) if (b(i) > BTN_THRESHOLD) out[a] = true;

  const lt = applyAxisDeadzone(b(PAD.LT), t.triggerDeadzone);
  const rt = applyAxisDeadzone(b(PAD.RT), t.triggerDeadzone);
  if (rt > 0.35) out.fire = true;
  if (lt > 0.35) out.ads = true;

  // Standard mapping: axis Y is +down. Our move.y is +forward.
  const ls = applyCurve(applyRadialDeadzone(ax(0), ax(1), t.deadzoneLeft), 'linear');
  const rs = applyCurve(applyRadialDeadzone(ax(2), ax(3), t.deadzoneRight), t.curve);
  const move = { x: ls.x, y: -ls.y };
  const look = { x: rs.x, y: t.invertY ? rs.y : -rs.y };

  // Left stick also navigates menus.
  const rawLx = ax(0);
  const rawLy = ax(1);
  if (Math.abs(rawLx) > Math.abs(rawLy)) {
    if (rawLx < -STICK_NAV_THRESHOLD) out.uiLeft = true;
    if (rawLx > STICK_NAV_THRESHOLD) out.uiRight = true;
  } else {
    if (rawLy < -STICK_NAV_THRESHOLD) out.uiUp = true;
    if (rawLy > STICK_NAV_THRESHOLD) out.uiDown = true;
  }

  const active =
    Object.keys(out).length > 0 || move.x !== 0 || move.y !== 0 || look.x !== 0 || look.y !== 0 || lt > 0 || rt > 0;
  return { buttons: out, move, look, fireAnalog: rt, active };
}

export type PadStyle = 'xbox' | 'playstation' | 'nintendo';

export function detectPadStyle(id: string): PadStyle {
  const s = id.toLowerCase();
  if (/dualshock|dualsense|playstation|sony|054c/.test(s)) return 'playstation';
  if (/nintendo|joy-con|pro controller|057e/.test(s)) return 'nintendo';
  return 'xbox';
}

/** Glyph labels for button prompts. */
export const GLYPHS: Record<PadStyle, Record<'A' | 'B' | 'X' | 'Y' | 'LB' | 'RB' | 'LT' | 'RT' | 'LS' | 'START', string>> = {
  xbox: { A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', LS: 'LS', START: '☰' },
  playstation: { A: '✕', B: '○', X: '□', Y: '△', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', LS: 'L3', START: 'OPT' },
  nintendo: { A: 'B', B: 'A', X: 'Y', Y: 'X', LB: 'L', RB: 'R', LT: 'ZL', RT: 'ZR', LS: 'LS', START: '+' },
};
