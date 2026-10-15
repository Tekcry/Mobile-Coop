import type { ButtonAction } from './actions';
import { detectPadStyle, GAME_BINDINGS, mapPad, PAD, TapHold, type PadStyle } from './gamepadMapping';
import { PAD_BUTTON_COUNT, padBindTable, type PadBinds } from './padBinds';
import { WHEEL_HOLD, type InputState } from './inputState';
import { NavRepeater } from './navRepeat';
import type { Settings } from '../core/settings';

/** (locomotion step 18) Holding B this long (s) while a button is being captured cancels the capture. */
export const CAPTURE_CANCEL_HOLD = 1;
/** How long X must be held to swap weapons instead of reloading (seconds, app clock). */
export const SWAP_HOLD = 0.35;
/** (locomotion step 15) X held this long (s) while not aiming uses a medkit (`MEDKIT.padHold`). */
export const MEDKIT_HOLD = 0.4;
const SRC = 'pad';
const NAV_DIRS: ButtonAction[] = ['uiUp', 'uiDown', 'uiLeft', 'uiRight'];
/** Radians per second at sensitivity 1, full deflection. */
const BASE_YAW_RATE = 3.6;
const BASE_PITCH_RATE = 2.4;
/** Look smoothing time constant (s). */
const LOOK_SMOOTH = 0.03;

export interface PadEvents {
  onConnect(id: string, style: PadStyle): void;
  onDisconnect(id: string): void;
  onActive(): void;
}

/**
 * Polls the Gamepad API each frame. Handles hot-plug via both events and polling
 * (iOS only exposes a controller after its first button press, sometimes without
 * an event), picks the most recently used pad, and drives haptics.
 */
export class GamepadSource {
  private known = new Map<number, string>();
  /** X: tap reload / hold a medkit (aiming: swap, A55); D-pad left: tap ping / hold the gadget wheel; View: tap goggles / hold an emote. */
  private xBtn = new TapHold(MEDKIT_HOLD);
  private leftBtn = new TapHold(WHEEL_HOLD);
  private viewBtn = new TapHold(SWAP_HOLD);
  private activeIndex = -1;
  private repeaters = new Map<ButtonAction, NavRepeater>(NAV_DIRS.map((d) => [d, new NavRepeater()]));
  private lastTimestamps = new Map<number, number>();
  /** Look: the stick deflection through a 30 ms smoothing (a touch of rotation inertia that still
   *  responds on the first frame) and a gentle acceleration while held near full deflection. */
  private lookX = 0;
  private lookY = 0;
  private heldT = 0;
  /** (step 18) The active bindings and their flat table (rebuilt when `settings.pad` changes, never per frame). */
  private bindsRef: PadBinds | null = null;
  private table: ReadonlyArray<readonly [number, ButtonAction]> = GAME_BINDINGS;
  /** (step 18) "Press a button": armed once every button is up; binds on the release of the next one. */
  private capture: ((btn: number | null) => void) | null = null;
  private capArmed = false;
  private capBtn = -1;
  private capAt = 0;
  /** After a capture: the pad is ignored until every button is up (the press never reaches the menus). */
  private capQuiet = false;
  style: PadStyle = 'xbox';
  /** Multiplier applied to look rate while aiming down sights. */
  adsActive = false;

  constructor(
    private state: InputState,
    private getSettings: () => Settings,
    private events: PadEvents,
  ) {
    window.addEventListener('gamepadconnected', () => this.scan());
    window.addEventListener('gamepaddisconnected', () => this.scan());
  }

  get connected(): boolean {
    return this.known.size > 0;
  }

  private pads(): (Gamepad | null)[] {
    try {
      return navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    } catch {
      return [];
    }
  }

  private scan(): void {
    const seen = new Set<number>();
    for (const p of this.pads()) {
      if (!p || !p.connected) continue;
      seen.add(p.index);
      if (!this.known.has(p.index)) {
        this.known.set(p.index, p.id);
        this.style = detectPadStyle(p.id);
        this.events.onConnect(p.id, this.style);
      }
    }
    for (const [i, id] of this.known) {
      if (!seen.has(i)) {
        this.known.delete(i);
        if (i === this.activeIndex) {
          this.activeIndex = -1;
          this.state.releaseSource(SRC);
        }
        this.events.onDisconnect(id);
      }
    }
  }

  poll(now: number, dt: number): void {
    this.scan();
    const pads = this.pads();
    // Choose the pad with the newest input timestamp.
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const last = this.lastTimestamps.get(p.index) ?? 0;
      if (p.timestamp > last) {
        this.lastTimestamps.set(p.index, p.timestamp);
        if (p.index !== this.activeIndex && p.buttons.some((b) => b.pressed)) {
          this.activeIndex = p.index;
          this.style = detectPadStyle(p.id);
        }
      }
    }
    if (this.activeIndex < 0) {
      const first = pads.find((p) => p?.connected);
      if (!first) return;
      this.activeIndex = first.index;
    }
    const pad = pads[this.activeIndex];
    if (!pad || !pad.connected) return;

    const all = this.getSettings();
    const s = all.gamepad;
    if (all.pad !== this.bindsRef) {
      this.bindsRef = all.pad;
      this.table = padBindTable(all.pad);
    }
    if (this.capture || this.capQuiet) {
      this.pollCapture(pad, now);
      return;
    }
    const frame = mapPad({ buttons: pad.buttons.map((b) => b.value || (b.pressed ? 1 : 0)), axes: pad.axes }, s, this.table);

    if (frame.active) this.events.onActive();

    for (const a of [
      'fire', 'ads', 'jump', 'crouch', 'cover', 'swapNext', 'swapPrev', 'interact', 'pause',
      'shoulderSwap', 'dash', 'grenade', 'gadgetWheel', 'speedUp', 'speedDown',
      'uiConfirm', 'uiBack', 'uiTabPrev', 'uiTabNext', 'uiAlt',
    ] as const) {
      this.state.set(SRC, a, frame.buttons[a] === true);
    }
    for (const d of NAV_DIRS) {
      if (this.repeaters.get(d)!.update(frame.buttons[d] === true, now)) this.state.tap(d);
    }
    // X: tap = reload (on release); hold = a medkit (locomotion step 15), or while aiming the next weapon (A55)
    const x = this.xBtn.update(frame.buttons.reload === true, now);
    if (x === 'hold') this.state.tap(this.adsActive ? 'swapNext' : 'medkit');
    else if (x === 'tap') this.state.tap('reload');
    // D-pad left: held, the gadget wheel opens after WHEEL_HOLD (gadget system); let go sooner, a co-op ping
    if (this.leftBtn.update(frame.buttons.gadgetWheel === true, now) === 'tap') this.state.tap('ping');
    // View: tap = goggles (on release), hold = the first emote
    const view = this.viewBtn.update(frame.buttons.vision === true, now);
    if (view === 'tap') this.state.tap('vision');
    else if (view === 'hold') this.state.tap('quick2');
    this.state.setMove(SRC, frame.move.x, frame.move.y);
    const ads = this.adsActive ? s.adsMultiplier : 1;
    const k = 1 - Math.exp(-dt / LOOK_SMOOTH);
    this.heldT = Math.abs(frame.look.x) > 0.92 ? this.heldT + dt : 0;
    // the acceleration goes through the same smoothing, so releasing the stick never steps the rate
    const accel = 1 + Math.min(0.4, Math.max(0, this.heldT - 0.3) * 0.8);
    this.lookX += (frame.look.x * accel - this.lookX) * k;
    this.lookY += (frame.look.y - this.lookY) * k;
    if (Math.abs(this.lookX) < 1e-4) this.lookX = 0;
    if (Math.abs(this.lookY) < 1e-4) this.lookY = 0;
    this.state.addLook(
      this.lookX * BASE_YAW_RATE * s.lookSensitivityX * ads * dt,
      this.lookY * BASE_PITCH_RATE * s.lookSensitivityY * ads * dt,
    );
    this.state.fireAnalog = frame.fireAnalog;
  }

  /** (step 18) Capture the next button (its index, on release); null = cancelled (B held `CAPTURE_CANCEL_HOLD` s,
   *  or `cancelCapture`: Esc, the 5 s timeout). */
  captureNext(cb: (btn: number | null) => void): void {
    this.capture = cb;
    this.capArmed = false;
    this.capBtn = -1;
  }

  get capturing(): boolean {
    return this.capture !== null;
  }

  cancelCapture(): void {
    if (this.capture) this.finishCapture(null);
  }

  private finishCapture(btn: number | null): void {
    const cb = this.capture;
    this.capture = null;
    this.capQuiet = true;
    this.state.releaseSource(SRC);
    cb?.(btn);
  }

  private pollCapture(pad: Gamepad, now: number): void {
    this.state.releaseSource(SRC);
    const down = (i: number): boolean => {
      const b = pad.buttons[i];
      return !!b && (b.pressed || b.value > 0.5);
    };
    let any = -1;
    for (let i = 0; i < PAD_BUTTON_COUNT && any < 0; i++) if (down(i)) any = i;
    if (!this.capture) {
      if (any < 0) this.capQuiet = false;
      return;
    }
    if (!this.capArmed) {
      if (any < 0) this.capArmed = true;
      return;
    }
    if (this.capBtn < 0) {
      if (any >= 0) {
        this.capBtn = any;
        this.capAt = now;
      }
      return;
    }
    if (!down(this.capBtn)) this.finishCapture(this.capBtn);
    else if (this.capBtn === PAD.B && now - this.capAt >= CAPTURE_CANCEL_HOLD) this.finishCapture(null);
  }

  rumble(strong: number, weak: number, ms: number): void {
    if (!this.getSettings().gamepad.vibration) return;
    const pad = this.pads()[this.activeIndex];
    const act = (pad as (Gamepad & { vibrationActuator?: GamepadHapticActuator | null }) | null | undefined)
      ?.vibrationActuator;
    try {
      void act?.playEffect?.('dual-rumble', {
        startDelay: 0,
        duration: ms,
        strongMagnitude: Math.min(1, strong),
        weakMagnitude: Math.min(1, weak),
      });
    } catch {
      /* unsupported */
    }
  }
}
