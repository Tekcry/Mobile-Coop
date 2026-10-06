import type { ButtonAction } from './actions';
import type { InputState } from './inputState';
import type { Settings } from '../core/settings';
import { hyp2 } from '../core/mathx';

const SRC = 'kbm';

/** Keyboard bindings (PC browsers). */
const KEYMAP: Record<string, ButtonAction[]> = {
  // Space cover, C crouch, Shift sprint, E traverse / interact (contextual)
  Space: ['cover'],
  KeyC: ['crouch'],
  ControlLeft: ['crouch'],
  KeyR: ['reload'],
  KeyE: ['jump', 'interact', 'uiTabNext', 'uiAlt'],
  KeyX: ['swapNext'],
  KeyQ: ['swapPrev', 'uiTabPrev'],
  KeyF: ['interact'],
  KeyG: ['grenade'],
  Tab: ['gadgetWheel'],
  KeyV: ['shoulderSwap'],
  KeyN: ['vision'],
  KeyT: ['mark'],
  KeyY: ['execute'],
  ShiftLeft: ['dash'],
  KeyP: ['pause'],
  Escape: ['pause', 'uiBack'],
  Backspace: ['uiBack'],
  Enter: ['uiConfirm'],
  KeyJ: ['quick2'],
  KeyK: ['quick3'],
  KeyL: ['quick4'],
  KeyZ: ['ping'],
};

const UI_TAPS: Record<string, ButtonAction> = {
  ArrowUp: 'uiUp',
  ArrowDown: 'uiDown',
  ArrowLeft: 'uiLeft',
  ArrowRight: 'uiRight',
};

const MOUSE_RAD_PER_PX = 0.0024;
/** Mouse wheel weapon swaps are spaced at least this far apart (ms): one notch, one swap. */
const WHEEL_GAP = 140;

/**
 * Keyboard and mouse (PC browsers). In gameplay the mouse is captured with pointer lock: the click that
 * starts or resumes a match captures it, so does any click on the game while it is free (that click
 * never fires). Captured: move = look, left = fire, right = aim, wheel = weapons. Losing the capture in
 * a match (Esc, alt-tab) opens the pause menu. Mouse buttons use pointer events: the engine cancels
 * pointerdown on the canvas, which suppresses the legacy mousedown.
 */
export class KeyboardMouseSource {
  private keys = new Set<string>();
  /** Set by the game when it wants pointer lock (in gameplay, no menu). */
  wantPointerLock = false;
  adsActive = false;
  /** Called when the capture is lost during gameplay (not when the game released it). */
  onLockLost: (() => void) | null = null;
  private releasing = false;
  private wheelT = 0;
  private hint: HTMLElement;

  constructor(
    private state: InputState,
    private canvas: HTMLCanvasElement,
    private getSettings: () => Settings,
    private onActive: () => void,
    parent: HTMLElement,
  ) {
    this.hint = document.createElement('div');
    this.hint.className = 'mouse-capture-hint';
    this.hint.textContent = 'Click to capture the mouse';
    this.hint.hidden = true;
    parent.appendChild(this.hint);
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.state.releaseSource(SRC);
      this.state.releaseSource(SRC + 'm');
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.onActive();
      if (this.wantPointerLock && !this.locked) {
        // this click only captures the mouse
        this.requestLock();
        return;
      }
      if (e.button === 0) this.state.set(SRC + 'm', 'fire', true);
      if (e.button === 2) this.state.set(SRC + 'm', 'ads', true);
    });
    window.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (e.button === 0) this.state.set(SRC + 'm', 'fire', false);
      if (e.button === 2) this.state.set(SRC + 'm', 'ads', false);
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      const s = this.getSettings().mouse;
      const k = MOUSE_RAD_PER_PX * s.sensitivity * (this.adsActive ? 0.6 : 1);
      this.state.addLook(e.movementX * k, (s.invertY ? 1 : -1) * e.movementY * k);
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.locked) return;
        e.preventDefault();
        const now = performance.now();
        if (now - this.wheelT < WHEEL_GAP || e.deltaY === 0) return;
        this.wheelT = now;
        this.state.tap(e.deltaY > 0 ? 'swapNext' : 'swapPrev');
      },
      { passive: false },
    );
    document.addEventListener('pointerlockchange', () => {
      const locked = this.locked;
      if (!locked) {
        // buttons held through the capture loss are let go
        this.state.releaseSource(SRC + 'm');
        if (this.wantPointerLock && !this.releasing) this.onLockLost?.();
      }
      this.releasing = false;
      this.refreshHint();
    });
    document.addEventListener('pointerlockerror', () => this.refreshHint());
  }

  get locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  /**
   * Capture the mouse. Browsers allow it only right after a user gesture (a click or key press), and not
   * for a moment after the user released it with Esc; a refusal just leaves the hint up.
   */
  requestLock(): void {
    if (this.locked) return;
    try {
      const p = this.canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
      p?.catch?.(() => this.refreshHint());
    } catch {
      /* not allowed now: the hint asks for a click */
    }
    this.refreshHint();
  }

  releasePointerLock(): void {
    if (document.pointerLockElement) {
      this.releasing = true;
      document.exitPointerLock();
    }
    this.refreshHint();
  }

  /** "Click to capture the mouse" while a match wants the mouse and it is free (keyboard / mouse only). */
  refreshHint(): void {
    this.hint.hidden = !(this.wantPointerLock && !this.locked && document.body.classList.contains('input-kbm'));
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
    // 1-8 pick a gadget (wheel order)
    if (down && e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 8) this.state.gadgetPick = n - 1;
    }
    const x = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const y = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const len = hyp2(x, y) || 1;
    this.state.setMove(SRC, x / len, y / len);
    if (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow')) e.preventDefault();
  }
}
