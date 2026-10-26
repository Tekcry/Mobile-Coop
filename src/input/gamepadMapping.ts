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
  /** (sector-fixes W) Right stick position after the dead zone, no curve, no invert (x right, y up): the selection
   *  wheel's cursor (absolute: let go and it is back on the vision slot). */
  stick: Vec2;
  fireAnalog: number;
  /** True if anything is being actuated (for input-mode switching). */
  active: boolean;
}

const BTN_THRESHOLD = 0.5;

/**
 * Gameplay binding: digital button index -> action (a button may drive several). Triggers handled separately. The pad
 * (F1a, G96, G181; anim-rework S1): A interact / context in every weapon state (Michael 14:55 "Interact always"), B
 * crouch, Y jump, X holster / draw (tap) and reload (held while drawn; `Player.stance`), L3 back-to-wall (and shoulder swap: the player
 * only swaps while aiming, the wall only enters while not), R3 zoom, RB co-op action (Black), LB selection wheel (hold) /
 * switch weapon (tap), D-pad left the selected vision mode on / off, right quick-use of the selected gadget, View show
 * the current objective (tap, ~5 s; G343, held does nothing more, G24), Start pause. D-pad up / down are free in play (no speed gears: the stick sets the speed); they
 * step the held context menu's highlight (`CTX_BINDINGS`). LT = `ads` (the held aim), RT = `fire` (analog, below).
 */
export const GAME_BINDINGS: ReadonlyArray<[number, ButtonAction]> = [
  [PAD.A, 'interact'],
  [PAD.B, 'crouch'],
  [PAD.X, 'draw'],
  [PAD.Y, 'jump'],
  [PAD.RB, 'coop'],
  [PAD.LB, 'gadgetWheel'],
  [PAD.START, 'pause'],
  [PAD.SELECT, 'objective'],
  [PAD.LS, 'cover'],
  [PAD.LS, 'shoulderSwap'],
  [PAD.RS, 'zoom'],
  // (optic-coop M2, Michael 2026-10-24 "contextual") R3 also pings: Zoom only while aiming a scoped weapon, Ping
  // otherwise (`contextPing`; an allowed pair, not a conflict)
  [PAD.RS, 'ping'],
  [PAD.LEFT, 'vision'],
  [PAD.RIGHT, 'grenade'],
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

/** (anim-rework S1) Fixed: the held context menu's highlight on D-pad up / down (read only while the list is held). */
export const CTX_BINDINGS: ReadonlyArray<[number, ButtonAction]> = [
  [PAD.UP, 'ctxUp'],
  [PAD.DOWN, 'ctxDown'],
];

/** Menu binding. Directions from the d-pad; the left stick is merged in mapPad. */
export const UI_BINDINGS: ReadonlyArray<[number, ButtonAction]> = [
  [PAD.A, 'uiConfirm'],
  [PAD.B, 'uiBack'],
  [PAD.START, 'uiStart'],
  [PAD.X, 'uiX'],
  [PAD.LB, 'uiTabPrev'],
  [PAD.RB, 'uiTabNext'],
  [PAD.Y, 'uiAlt'],
  [PAD.UP, 'uiUp'],
  [PAD.DOWN, 'uiDown'],
  [PAD.LEFT, 'uiLeft'],
  [PAD.RIGHT, 'uiRight'],
];

const STICK_NAV_THRESHOLD = 0.55;

/** `table`: the active gameplay bindings (locomotion step 18: `padBindTable(settings.pad)`, rebuilt only when the
 *  bindings change); the defaults are GAME_BINDINGS. */
export function mapPad(p: PadSnapshot, t: PadTuning, table: ReadonlyArray<readonly [number, ButtonAction]> = GAME_BINDINGS): PadFrame {
  const b = (i: number): number => p.buttons[i] ?? 0;
  const ax = (i: number): number => p.axes[i] ?? 0;
  const out: PadFrame['buttons'] = {};

  for (const [i, a] of table) if (b(i) > BTN_THRESHOLD) out[a] = true;
  for (const [i, a] of UI_BINDINGS) if (b(i) > BTN_THRESHOLD) out[a] = true;
  for (const [i, a] of CTX_BINDINGS) if (b(i) > BTN_THRESHOLD) out[a] = true;

  const lt = applyAxisDeadzone(b(PAD.LT), t.triggerDeadzone);
  const rt = applyAxisDeadzone(b(PAD.RT), t.triggerDeadzone);
  if (rt > 0.35) out.fire = true;
  // (anim-rework S1) LT is the aim, held
  if (lt > 0.35) out.ads = true;

  // Standard mapping: axis Y is +down. Our move.y is +forward.
  const ls = applyCurve(applyRadialDeadzone(ax(0), ax(1), t.deadzoneLeft), 'linear');
  const rsd = applyRadialDeadzone(ax(2), ax(3), t.deadzoneRight);
  const rs = applyCurve(rsd, t.curve);
  const move = { x: ls.x, y: -ls.y };
  const look = { x: rs.x, y: t.invertY ? rs.y : -rs.y };
  const stick = { x: rsd.x, y: -rsd.y };

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
  return { buttons: out, move, look, stick, fireAnalog: rt, active };
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
