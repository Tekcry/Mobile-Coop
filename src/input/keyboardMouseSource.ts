import type { ButtonAction } from './actions';
import type { InputState } from './inputState';
import type { Settings } from '../core/settings';
import { hyp2 } from '../core/mathx';
import { keyActionMap, type KeyBinds } from './keyBindings';

const SRC = 'kbm';

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
  /** Bindings in use (rebuilt when the settings' `keys` change). */
  private binds: KeyBinds | null = null;
  private map = new Map<string, ButtonAction[]>();
  private moveCodes = { f: 'KeyW', b: 'KeyS', l: 'KeyA', r: 'KeyD' };
  private moveAlt = { f: '', b: '', l: '', r: '' };
  /** Rebinding: the next key / mouse button goes here (null = Esc cancelled, '' = cleared). */
  private capture: ((code: string | null) => void) | null = null;
  /** Raw input refused once: plain pointer lock from then on. */
  private rawUnsupported = false;

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
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.capture || e.pointerType !== 'mouse') return;
        const code = e.button === 1 ? 'Mouse1' : e.button === 3 ? 'Mouse3' : e.button === 4 ? 'Mouse4' : '';
        if (!code) return;
        e.preventDefault();
        e.stopPropagation();
        this.finishCapture(code);
      },
      { capture: true },
    );
    // (back / forward mouse buttons never navigate the page)
    window.addEventListener('mouseup', (e) => {
      if (e.button === 3 || e.button === 4) e.preventDefault();
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.onActive();
      const extra = e.button === 1 ? 'Mouse1' : e.button === 3 ? 'Mouse3' : e.button === 4 ? 'Mouse4' : '';
      if (extra && this.locked) {
        this.syncBinds();
        for (const a of this.map.get(extra) ?? []) this.state.set(SRC + 'm', a, true);
        return;
      }
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
      const extra = e.button === 1 ? 'Mouse1' : e.button === 3 ? 'Mouse3' : e.button === 4 ? 'Mouse4' : '';
      if (extra) for (const a of this.map.get(extra) ?? []) this.state.set(SRC + 'm', a, false);
      if (e.button === 0) this.state.set(SRC + 'm', 'fire', false);
      if (e.button === 2) this.state.set(SRC + 'm', 'ads', false);
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      const s = this.getSettings().mouse;
      const k = MOUSE_RAD_PER_PX * s.sensitivity * (this.adsActive ? s.adsMultiplier : 1);
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
      // raw input (no OS pointer acceleration) where the browser has it; a refusal falls back to plain capture
      const raw = this.getSettings().mouse.raw && !this.rawUnsupported;
      const req = this.canvas.requestPointerLock as unknown as (o?: { unadjustedMovement?: boolean }) => Promise<void> | undefined;
      const p = raw ? req.call(this.canvas, { unadjustedMovement: true }) : req.call(this.canvas);
      p?.catch?.((err: unknown) => {
        if (raw && (err as { name?: string })?.name === 'NotSupportedError') {
          this.rawUnsupported = true;
          (req.call(this.canvas) as Promise<void> | undefined)?.catch?.(() => this.refreshHint());
        }
        this.refreshHint();
      });
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

  /** Rebinding: hand the next key or extra mouse button to `cb` (Esc: null, Backspace / Delete: ''). */
  captureNext(cb: (code: string | null) => void): void {
    this.capture = cb;
  }

  get capturing(): boolean {
    return this.capture !== null;
  }

  private finishCapture(code: string | null): void {
    const cb = this.capture;
    this.capture = null;
    // (the key that ended the capture is not also a menu press)
    this.state.releaseAll();
    cb?.(code);
  }

  private syncBinds(): void {
    const b = this.getSettings().keys;
    if (b === this.binds) return;
    this.binds = b;
    this.map = keyActionMap(b);
    this.moveCodes = { f: b.forward[0] ?? '', b: b.back[0] ?? '', l: b.left[0] ?? '', r: b.right[0] ?? '' };
    this.moveAlt = { f: b.forward[1] ?? '', b: b.back[1] ?? '', l: b.left[1] ?? '', r: b.right[1] ?? '' };
  }

  private held(a: string, b: string): boolean {
    return (a !== '' && this.keys.has(a)) || (b !== '' && this.keys.has(b));
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    if (this.capture) {
      if (!down || e.repeat) return;
      e.preventDefault();
      e.stopPropagation();
      this.finishCapture(e.code === 'Escape' ? null : e.code === 'Backspace' || e.code === 'Delete' ? '' : e.code);
      return;
    }
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      // (Enter in a text box is a new line, not a menu confirm)
      if (e.code !== 'Escape' && (e.code !== 'Enter' || tag === 'TEXTAREA')) return;
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
    this.syncBinds();
    for (const a of this.map.get(e.code) ?? []) this.state.set(SRC, a, down);
    // 1-8 pick a gadget (wheel order)
    if (down && e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 8) this.state.gadgetPick = n - 1;
    }
    const m = this.moveCodes;
    const alt = this.moveAlt;
    const x = (this.held(m.r, alt.r) ? 1 : 0) - (this.held(m.l, alt.l) ? 1 : 0);
    const y = (this.held(m.f, alt.f) ? 1 : 0) - (this.held(m.b, alt.b) ? 1 : 0);
    const len = hyp2(x, y) || 1;
    this.state.setMove(SRC, x / len, y / len);
    if (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow') || (this.locked && this.map.has(e.code) && !e.code.startsWith('F'))) e.preventDefault();
  }
}
