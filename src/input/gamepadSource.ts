import type { ButtonAction } from './actions';
import { detectPadStyle, mapPad, type PadStyle } from './gamepadMapping';
import type { InputState } from './inputState';
import { NavRepeater } from './navRepeat';
import type { Settings } from '../core/settings';

/** How long B must be held to take cover (seconds; `now` is the app clock in seconds). */
export const COVER_HOLD = 0.28;
const SRC = 'pad';
const NAV_DIRS: ButtonAction[] = ['uiUp', 'uiDown', 'uiLeft', 'uiRight'];
/** Radians per second at sensitivity 1, full deflection. */
const BASE_YAW_RATE = 3.6;
const BASE_PITCH_RATE = 2.4;

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
  private bDownAt = -1;
  private activeIndex = -1;
  private repeaters = new Map<ButtonAction, NavRepeater>(NAV_DIRS.map((d) => [d, new NavRepeater()]));
  private lastTimestamps = new Map<number, number>();
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

    const s = this.getSettings().gamepad;
    const frame = mapPad({ buttons: pad.buttons.map((b) => b.value || (b.pressed ? 1 : 0)), axes: pad.axes }, s);

    if (frame.active) this.events.onActive();

    for (const a of [
      'fire', 'ads', 'reload', 'jump', 'crouch', 'swapNext', 'swapPrev', 'interact', 'pause',
      'shoulderSwap', 'sprint', 'quick1', 'quick2', 'quick3', 'quick4',
      'uiConfirm', 'uiBack', 'uiTabPrev', 'uiTabNext',
    ] as const) {
      this.state.set(SRC, a, frame.buttons[a] === true);
    }
    for (const d of NAV_DIRS) {
      if (this.repeaters.get(d)!.update(frame.buttons[d] === true, now)) this.state.tap(d);
    }
    // B held = take cover (B tap stays crouch/roll); fires once per hold
    const b = frame.buttons.crouch === true;
    if (b && this.bDownAt < 0) this.bDownAt = now;
    if (!b) this.bDownAt = -1;
    if (b && this.bDownAt >= 0 && now - this.bDownAt >= COVER_HOLD) {
      this.state.tap('cover');
      this.bDownAt = Number.POSITIVE_INFINITY;
    }
    this.state.setMove(SRC, frame.move.x, frame.move.y);
    const ads = this.adsActive ? s.adsMultiplier : 1;
    this.state.addLook(
      frame.look.x * BASE_YAW_RATE * s.lookSensitivityX * ads * dt,
      frame.look.y * BASE_PITCH_RATE * s.lookSensitivityY * ads * dt,
    );
    this.state.fireAnalog = frame.fireAnalog;
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
