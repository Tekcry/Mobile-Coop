import { BUTTON_ACTIONS, type ButtonAction, type Vec2 } from './actions';
import { applyAxisDeadzone, applyCurveTo, applyRadialDeadzoneTo, RADIAL_OUTER, type CurveKind } from './stickMath';

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
 *  bindings change); the defaults are GAME_BINDINGS. A fresh frame per call (tests and cold callers); the pad poll
 *  reuses one through `mapPadInto` (player-hygiene S2). */
export function mapPad(p: PadSnapshot, t: PadTuning, table: ReadonlyArray<readonly [number, ButtonAction]> = GAME_BINDINGS): PadFrame {
  const f = newPadFrame();
  mapPadInto(p, t, table, f);
  // only the actions that are down, in the order they were set (the record `mapPad` has always returned)
  const buttons: PadFrame['buttons'] = {};
  for (let k = 0; k < f.setCount; k++) buttons[f.setList[k]!] = true;
  return { buttons, move: f.move, look: f.look, stick: f.stick, fireAnalog: f.fireAnalog, active: f.active };
}

/**
 * (player-hygiene S2) A reusable pad frame: `buttons` holds every action (false when up; `mapPadInto` clears only what
 * the last call set, listed in `setList[0 .. setCount)`), plus the stick scratch the mapping writes through.
 */
export interface PadFrameBuf extends PadFrame {
  readonly buttons: Record<ButtonAction, boolean>;
  /** The actions set this frame, in the order they were set (capacity `BUTTON_ACTIONS.length`). */
  readonly setList: ButtonAction[];
  setCount: number;
  /** Scratch: the left stick after its dead zone and curve, the right stick after its dead zone, and after its curve. */
  readonly ls: Vec2;
  readonly rsd: Vec2;
  readonly rs: Vec2;
}

export function newPadFrame(): PadFrameBuf {
  const buttons = {} as Record<ButtonAction, boolean>;
  for (let i = 0; i < BUTTON_ACTIONS.length; i++) buttons[BUTTON_ACTIONS[i]!] = false;
  const setList: ButtonAction[] = [];
  for (let i = 0; i < BUTTON_ACTIONS.length; i++) setList.push(BUTTON_ACTIONS[0]);
  return {
    buttons,
    setList,
    setCount: 0,
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    stick: { x: 0, y: 0 },
    fireAnalog: 0,
    active: false,
    ls: { x: 0, y: 0 },
    rsd: { x: 0, y: 0 },
    rs: { x: 0, y: 0 },
  };
}

/** The three binding tables `mapPadInto` reads in order: the gameplay table (`table`), the menus, the context menu. */
const TABLE_COUNT = 3;

/**
 * (player-hygiene S2) `mapPad` into a reused frame (the pad poll: no allocation); the same arithmetic in the same order.
 * The actions the last call set are cleared first, so a rebinding between calls leaves nothing stale. An action is set
 * once (`buttons[a]` true, appended to `setList`), written inline at its four places: V8 inlines the dead zone calls
 * here only while the inlined total stays small (a double passed to or returned from a call it does not inline is boxed,
 * 16 B), so the frame keeps no helper call of its own.
 */
export function mapPadInto(p: PadSnapshot, t: PadTuning, table: ReadonlyArray<readonly [number, ButtonAction]>, f: PadFrameBuf): PadFrameBuf {
  const on = f.buttons;
  const list = f.setList;
  for (let k = 0; k < f.setCount; k++) on[list[k]!] = false;
  f.setCount = 0;
  // `p.buttons[i] ?? 0` / `p.axes[i] ?? 0`, read in bounds only: a read past the end makes V8 box every value it loads
  // there (16 B each) once it has seen one
  const btn = p.buttons;
  const nb = btn.length;
  const axes = p.axes;
  const na = axes.length;
  const ax0 = 0 < na ? (axes[0] ?? 0) : 0;
  const ax1 = 1 < na ? (axes[1] ?? 0) : 0;
  const ax2 = 2 < na ? (axes[2] ?? 0) : 0;
  const ax3 = 3 < na ? (axes[3] ?? 0) : 0;

  // the gameplay table, then UI_BINDINGS, then CTX_BINDINGS
  for (let w = 0; w < TABLE_COUNT; w++) {
    const tb = w === 0 ? table : w === 1 ? UI_BINDINGS : CTX_BINDINGS;
    for (let k = 0; k < tb.length; k++) {
      const e = tb[k]!;
      const i = e[0];
      const a = e[1];
      if ((i < nb ? (btn[i] ?? 0) : 0) > BTN_THRESHOLD && on[a] !== true) {
        on[a] = true;
        list[f.setCount++] = a;
      }
    }
  }

  const lt = applyAxisDeadzone(PAD.LT < nb ? (btn[PAD.LT] ?? 0) : 0, t.triggerDeadzone);
  const rt = applyAxisDeadzone(PAD.RT < nb ? (btn[PAD.RT] ?? 0) : 0, t.triggerDeadzone);
  if (rt > 0.35 && on.fire !== true) {
    on.fire = true;
    list[f.setCount++] = 'fire';
  }
  // (anim-rework S1) LT is the aim, held
  if (lt > 0.35 && on.ads !== true) {
    on.ads = true;
    list[f.setCount++] = 'ads';
  }

  // Standard mapping: axis Y is +down. Our move.y is +forward.
  const ls = applyCurveTo(applyRadialDeadzoneTo(ax0, ax1, t.deadzoneLeft, RADIAL_OUTER, f.ls), 'linear', f.ls);
  const rsd = applyRadialDeadzoneTo(ax2, ax3, t.deadzoneRight, RADIAL_OUTER, f.rsd);
  const rs = applyCurveTo(rsd, t.curve, f.rs);
  f.move.x = ls.x;
  f.move.y = -ls.y;
  f.look.x = rs.x;
  f.look.y = t.invertY ? rs.y : -rs.y;
  f.stick.x = rsd.x;
  f.stick.y = -rsd.y;

  // Left stick also navigates menus (one direction at most: the larger axis past the threshold).
  const rawLx = ax0;
  const rawLy = ax1;
  const nav: ButtonAction | null =
    Math.abs(rawLx) > Math.abs(rawLy)
      ? rawLx < -STICK_NAV_THRESHOLD ? 'uiLeft' : rawLx > STICK_NAV_THRESHOLD ? 'uiRight' : null
      : rawLy < -STICK_NAV_THRESHOLD ? 'uiUp' : rawLy > STICK_NAV_THRESHOLD ? 'uiDown' : null;
  if (nav !== null && on[nav] !== true) {
    on[nav] = true;
    list[f.setCount++] = nav;
  }

  f.fireAnalog = rt;
  f.active = f.setCount > 0 || f.move.x !== 0 || f.move.y !== 0 || f.look.x !== 0 || f.look.y !== 0 || lt > 0 || rt > 0;
  return f;
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
