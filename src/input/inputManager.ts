import type { InputMode } from './actions';
import { InputState } from './inputState';
import { GamepadSource } from './gamepadSource';
import { KeyboardMouseSource } from './keyboardMouseSource';
import { TouchControls } from './touchControls';
import type { PadStyle } from './gamepadMapping';
import type { SettingsStore } from '../core/settings';
import { EventBus } from '../core/events';

export interface InputEvents {
  mode: InputMode;
  padConnected: { id: string; style: PadStyle };
  padDisconnected: { id: string };
}

/**
 * Owns all input sources and the active input mode. Touch, gamepad and keyboard/mouse
 * all write into one InputState; consumers never see which device produced an action.
 */
export class InputManager {
  readonly state = new InputState();
  readonly events = new EventBus<InputEvents>();
  readonly gamepad: GamepadSource;
  readonly kbm: KeyboardMouseSource;
  readonly touch: TouchControls;
  private _mode: InputMode;
  /** Gameplay wants touch controls shown (in game, no menu open). */
  private gameplayActive = false;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement, settings: SettingsStore) {
    const get = (): ReturnType<SettingsStore['get']> => settings.get();
    this._mode = matchMedia('(pointer: coarse)').matches ? 'touch' : 'kbm';
    this.gamepad = new GamepadSource(this.state, get, {
      onConnect: (id, style) => this.events.emit('padConnected', { id, style }),
      onDisconnect: (id) => {
        this.events.emit('padDisconnected', { id });
        if (!this.gamepad.connected && this._mode === 'gamepad') {
          this.setMode(matchMedia('(pointer: coarse)').matches ? 'touch' : 'kbm');
        }
      },
      onActive: () => this.setMode('gamepad'),
    });
    this.kbm = new KeyboardMouseSource(this.state, canvas, get, () => this.setMode('kbm'));
    this.touch = new TouchControls(this.state, get, uiRoot, () => this.setMode('touch'));
    settings.subscribe(() => this.touch.applyLayout());

    // Any touch anywhere (menus included) reverts to touch mode.
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType === 'touch') this.setMode('touch');
        else if (e.pointerType === 'mouse') this.setMode('kbm');
      },
      { capture: true },
    );
    this.applyModeClass();
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
    this.refreshTouchVisibility();
    this.events.emit('mode', m);
  }

  private applyModeClass(): void {
    const c = document.body.classList;
    c.remove('input-touch', 'input-gamepad', 'input-kbm');
    c.add(`input-${this._mode}`);
    c.toggle('pad-ps', this.gamepad?.style === 'playstation');
  }

  /** Call when entering/leaving live gameplay (no menus). */
  setGameplayActive(active: boolean): void {
    this.gameplayActive = active;
    this.kbm.wantPointerLock = active;
    if (!active) this.kbm.releasePointerLock();
    this.refreshTouchVisibility();
    if (!active) this.state.releaseAll();
  }

  private refreshTouchVisibility(): void {
    this.touch.setVisible(this.gameplayActive && this._mode === 'touch');
  }

  setAds(on: boolean): void {
    this.gamepad.adsActive = on;
    this.kbm.adsActive = on;
    this.touch.adsActive = on;
  }

  /** Poll devices. Call once per render frame before reading input. */
  poll(now: number, dt: number): void {
    const style = this.gamepad.style;
    this.gamepad.poll(now, dt);
    this.touch.update(dt);
    if (style !== this.gamepad.style) this.applyModeClass();
  }

  rumble(strong: number, weak: number, ms: number): void {
    if (this._mode === 'gamepad') this.gamepad.rumble(strong, weak, ms);
    else if (this._mode === 'touch') navigator.vibrate?.(Math.min(ms, 40));
  }
}
