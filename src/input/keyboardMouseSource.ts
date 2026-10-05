import type { ButtonAction } from './actions';
import type { InputState } from './inputState';
import type { Settings } from '../core/settings';

const SRC = 'kbm';

/** Desktop testing only. */
const KEYMAP: Record<string, ButtonAction[]> = {
  Space: ['jump'],
  KeyC: ['crouch'],
  ControlLeft: ['crouch'],
  KeyR: ['reload'],
  KeyE: ['swapNext', 'uiTabNext'],
  KeyQ: ['swapPrev', 'uiTabPrev'],
  KeyF: ['interact'],
  KeyG: ['grenade'],
  KeyV: ['shoulderSwap'],
  ShiftLeft: ['sprint'],
  KeyP: ['pause'],
  Escape: ['pause', 'uiBack'],
  Backspace: ['uiBack'],
  Enter: ['uiConfirm'],
  Digit1: ['quick1'],
  Digit2: ['quick2'],
  Digit3: ['quick3'],
  Digit4: ['quick4'],
};

const UI_TAPS: Record<string, ButtonAction> = {
  ArrowUp: 'uiUp',
  ArrowDown: 'uiDown',
  ArrowLeft: 'uiLeft',
  ArrowRight: 'uiRight',
};

const MOUSE_RAD_PER_PX = 0.0024;

export class KeyboardMouseSource {
  private keys = new Set<string>();
  /** Set by the game when it wants pointer lock (in gameplay, no menu). */
  wantPointerLock = false;
  adsActive = false;

  constructor(
    private state: InputState,
    canvas: HTMLCanvasElement,
    private getSettings: () => Settings,
    private onActive: () => void,
  ) {
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.state.releaseSource(SRC);
    });
    canvas.addEventListener('mousedown', (e) => {
      this.onActive();
      if (this.wantPointerLock && document.pointerLockElement !== canvas) {
        void canvas.requestPointerLock?.();
        return;
      }
      if (e.button === 0) this.state.set(SRC + 'm', 'fire', true);
      if (e.button === 2) this.state.set(SRC + 'm', 'ads', true);
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.state.set(SRC + 'm', 'fire', false);
      if (e.button === 2) this.state.set(SRC + 'm', 'ads', false);
    });
    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== canvas) return;
      const s = this.getSettings().mouse;
      const k = MOUSE_RAD_PER_PX * s.sensitivity * (this.adsActive ? 0.6 : 1);
      this.state.addLook(e.movementX * k, (s.invertY ? 1 : -1) * e.movementY * k);
    });
  }

  releasePointerLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      if (e.code !== 'Escape' && e.code !== 'Enter') return;
    }
    if (e.code === 'F3') return;
    this.onActive();
    if (down) this.keys.add(e.code);
    else this.keys.delete(e.code);
    const ui = UI_TAPS[e.code];
    if (ui && down) {
      this.state.tap(ui);
      e.preventDefault();
    }
    for (const a of KEYMAP[e.code] ?? []) this.state.set(SRC, a, down);
    const x = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const y = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const len = Math.hypot(x, y) || 1;
    this.state.setMove(SRC, x / len, y / len);
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  }
}
