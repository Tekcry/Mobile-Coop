import type { InputMode } from './actions';
import { InputState } from './inputState';
import { GamepadSource } from './gamepadSource';
import { KeyboardMouseSource } from './keyboardMouseSource';
import type { PadStyle } from './gamepadMapping';
import type { SettingsStore } from '../core/settings';
import { EventBus } from '../core/events';
import { playRumble, type RumbleKind } from '../config/rumble';
import { lastTouchAfter, TouchLook, touchLookDelta } from './touchLook';

export interface InputEvents {
  mode: InputMode;
  padConnected: { id: string; style: PadStyle };
  padDisconnected: { id: string };
}

/** (marlow-bays item 29) The input mode a pointer press selects: a mouse press keyboard / mouse; a touch or a pen
 *  nothing (the mode stays: a pad keeps its glyphs). */
export function pointerMode(pointerType: string): InputMode | null {
  return pointerType === 'mouse' ? 'kbm' : null;
}

/**
 * Owns all input sources and the active input mode. Gamepad and keyboard/mouse
 * both write into one InputState; consumers never see which device produced an action.
 */
export class InputManager {
  readonly state = new InputState();
  readonly events = new EventBus<InputEvents>();
  readonly gamepad: GamepadSource;
  readonly kbm: KeyboardMouseSource;
  private _mode: InputMode;
  /** In live gameplay (in game, no menu open). */
  private gameplayActive = false;
  /** (marlow-bays item 29) The last input was a touch (the on-screen pause button shows in play). */
  private lastTouch = false;
  /** (item 29) A finger dragged on the game view in play: the camera only. */
  private readonly touchLook = new TouchLook();
  private readonly lookOut = { yaw: 0, pitch: 0 };
  /** (item 29) The on-screen pause button (shown in play while the last input was a touch). */
  readonly pauseBtn: HTMLButtonElement;

  private readonly getSettings: () => ReturnType<SettingsStore['get']>;
  private readonly sink = (strong: number, weak: number, ms: number): void => this.rumble(strong, weak, ms);
  /** The settings "Test vibration" button: straight to the pad whatever the input mode (a mouse click on the button). */
  private readonly padSink = (strong: number, weak: number, ms: number): void => this.gamepad.rumble(strong, weak, ms);

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement, settings: SettingsStore) {
    const get = (): ReturnType<SettingsStore['get']> => settings.get();
    this.getSettings = get;
    this._mode = 'kbm';
    this.gamepad = new GamepadSource(this.state, get, {
      onConnect: (id, style) => this.events.emit('padConnected', { id, style }),
      onDisconnect: (id) => {
        this.events.emit('padDisconnected', { id });
        if (!this.gamepad.connected && this._mode === 'gamepad') this.setMode('kbm');
      },
      onActive: () => {
        this.setLastTouch(false);
        this.setMode('gamepad');
      },
    });
    this.kbm = new KeyboardMouseSource(this.state, canvas, get, () => {
      this.setLastTouch(false);
      this.setMode('kbm');
    }, uiRoot);
    // the mouse capture lost mid-match (Esc, alt-tab): pause, like a PC game
    this.kbm.onLockLost = () => {
      if (this.gameplayActive && this._mode === 'kbm') this.state.tap('pause');
    };

    // Any mouse press anywhere (menus included) reverts to keyboard / mouse mode. (marlow-bays item 29) A touch never
    // changes the mode (item 26b's touch switch is gone: the tuner has one layout per screen size and the mode only
    // picks the hint glyphs; a tap during pad play on a touchscreen laptop must not flip the prompts).
    window.addEventListener(
      'pointerdown',
      (e) => {
        const m = pointerMode(e.pointerType);
        if (m) this.setMode(m);
        this.setLastTouch(lastTouchAfter(this.lastTouch, e.pointerType));
      },
      { capture: true },
    );
    window.addEventListener('keydown', () => this.setLastTouch(false), { capture: true });
    // (marlow-bays item 29, Michael: "Menus + camera") in play a finger dragged on the game view looks around; no touch
    // movement or combat (M21). Not while the tuner has the pointer (its own touch camera, `mouseFree`).
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' || !this.gameplayActive || this.kbm.mouseFree) return;
      this.touchLook.down(e.pointerId, e.clientX, e.clientY);
    });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'touch' || !this.touchLook.move(e.pointerId, e.clientX, e.clientY)) return;
      if (!this.gameplayActive || this.kbm.mouseFree) return;
      const s = get().mouse;
      touchLookDelta(this.touchLook.dx, this.touchLook.dy, s.sensitivity, s.invertY, this.lookOut);
      this.state.addLook(this.lookOut.yaw, this.lookOut.pitch);
    });
    const lift = (e: PointerEvent): void => {
      if (e.pointerType === 'touch') this.touchLook.up(e.pointerId);
    };
    window.addEventListener('pointerup', lift);
    window.addEventListener('pointercancel', lift);
    window.addEventListener('blur', () => this.touchLook.reset());
    // (item 29) the on-screen pause button: play only, and only while the last input was a touch (CSS: body.touch-play)
    const pb = (this.pauseBtn = document.createElement('button'));
    pb.type = 'button';
    pb.className = 'touch-pause nofocus';
    pb.setAttribute('aria-label', 'Pause');
    pb.textContent = 'II';
    pb.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.gameplayActive) this.state.tap('pause');
    });
    uiRoot.appendChild(pb);
    this.applyModeClass();
  }

  /** (item 29) The last input was a touch or not: the body class that shows the pause button in play. */
  private setLastTouch(v: boolean): void {
    if (v === this.lastTouch) return;
    this.lastTouch = v;
    this.syncTouchPlay();
  }

  private syncTouchPlay(): void {
    document.body.classList.toggle('touch-play', this.lastTouch && this.gameplayActive);
  }

  /** (item 29) The last input was a touch. */
  get lastInputTouch(): boolean {
    return this.lastTouch;
  }

  get mode(): InputMode {
    return this._mode;
  }

  get padStyle(): PadStyle {
    return this.gamepad.style;
  }

  setMode(m: InputMode): void {
    if (m === this._mode) return;
    this._mode = m;
    if (m !== 'kbm') this.kbm.releasePointerLock();
    this.applyModeClass();
    this.kbm.refreshHint();
    this.events.emit('mode', m);
  }

  private applyModeClass(): void {
    const c = document.body.classList;
    c.remove('input-gamepad', 'input-kbm');
    c.add(`input-${this._mode}`);
    c.toggle('pad-ps', this.gamepad?.style === 'playstation');
    c.toggle('pad-nin', this.gamepad?.style === 'nintendo');
  }

  /** Call when entering/leaving live gameplay (no menus). */
  setGameplayActive(active: boolean): void {
    this.gameplayActive = active;
    if (!active) this.touchLook.reset();
    this.syncTouchPlay();
    this.kbm.wantPointerLock = active;
    // starting / resuming a match by mouse or keyboard captures the mouse (that click is the gesture)
    if (active && this._mode === 'kbm') this.kbm.requestLock();
    if (!active) this.kbm.releasePointerLock();
    this.kbm.refreshHint();
    if (!active) this.state.releaseAll();
  }

  setAds(on: boolean): void {
    this.gamepad.adsActive = on;
    this.kbm.adsActive = on;
  }

  /** Poll devices. Call once per render frame before reading input. */
  poll(now: number, dt: number): void {
    const style = this.gamepad.style;
    this.gamepad.poll(now, dt);
    this.state.tick(dt);
    if (style !== this.gamepad.style) this.applyModeClass();
  }

  /** (locomotion step 17) The rumble table (`config/rumble.ts`): an event of the local player (`local`), scaled by
   *  `gameplay.rumble`. Every game rumble goes through here. */
  haptic(kind: RumbleKind, local = true): boolean {
    return playRumble(this.sink, kind, local, this.getSettings().gameplay.rumble);
  }

  /** The settings "Test vibration" button: the table's `test` entry on the pad, at the chosen rumble strength. */
  testHaptic(): boolean {
    return playRumble(this.padSink, 'test', true, this.getSettings().gameplay.rumble);
  }

  rumble(strong: number, weak: number, ms: number): void {
    if (this._mode === 'gamepad') this.gamepad.rumble(strong, weak, ms);
  }
}
