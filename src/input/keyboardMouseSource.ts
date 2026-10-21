import type { ButtonAction } from './actions';
import type { InputState } from './inputState';
import type { Settings } from '../core/settings';
import { hyp2 } from '../core/mathx';
import { keyActionMap, menuNavTap, type KeyBinds } from './keyBindings';
import { KBM_PACE } from '../config/movement';

const SRC = 'kbm';

const MOUSE_RAD_PER_PX = 0.0024;
/** Mouse wheel steps (the held context menu's highlight) are spaced at least this far apart (ms): one notch, one row. */
const WHEEL_GAP = 140;

/**
 * Keyboard and mouse (PC browsers). In gameplay the mouse is captured with pointer lock: the click that
 * starts or resumes a match captures it, so does any click on the game while it is free (that click
 * never fires). Captured: move = look, left = fire (aiming; holstered: click the knockout, hold the kill), right = aim
 * (held; anim-rework S1), wheel = the held context menu's highlight (the speed gear is gone: WASD walk, Left Shift
 * held runs, Left Alt held creeps, A1). Losing the capture in
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
  /** (marlow-bays item 9) Asked first when the capture is lost in play: true = handled (the animation tuner's game
   *  camera drops back to its drag view), so `onLockLost` (the pause) is skipped. */
  lockLostHook: (() => boolean) | null = null;
  /** (marlow-bays item 9) The tuner's drag view: the pointer stays free in play (`setFreeMouse`). */
  private freeMouse = false;
  /** The pointer dragging the view (-1 none). */
  private dragId = -1;
  /** (marlow-bays item 29) The button that started the view drag (left, middle or right). */
  private dragBtn = 0;
  private releasing = false;
  private wheelT = 0;
  private hint: HTMLElement;
  /** Bindings in use (rebuilt when the settings' `keys` change). */
  private binds: KeyBinds | null = null;
  private map = new Map<string, ButtonAction[]>();
  private moveCodes = { f: 'KeyW', b: 'KeyS', l: 'KeyA', r: 'KeyD' };
  private moveAlt = { f: '', b: '', l: '', r: '' };
  /** (anim-rework S1, A1) The run / creep keys (held): the move's magnitude (`KBM_PACE`). */
  private paceCodes = { run: 'ShiftLeft', run2: '', creep: 'AltLeft', creep2: '' };
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
      this.dragId = -1;
      this.keys.clear();
      this.state.releaseSource(SRC);
      this.state.releaseSource(SRC + 'm');
    });
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        // (menu-ui SPEC 4.2) mouse button 4 is Back in menus (not while the game has the mouse)
        if (!this.capture) {
          if (e.button === 3 && !this.locked) {
            e.preventDefault();
            this.state.tap('uiBack');
          }
          return;
        }
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
      // (marlow-bays item 9) the tuner's drag view: a left press on the scene starts a view drag; no button fires,
      // aims or captures the mouse
      if (this.freeMouse) {
        // (marlow-bays item 29) the left, middle or right button drags the view (the panel stays usable meanwhile)
        if (e.button <= 2 && this.dragId < 0) {
          if (e.button === 1) e.preventDefault();
          this.dragId = e.pointerId;
          this.dragBtn = e.button;
          try {
            canvas.setPointerCapture(e.pointerId);
          } catch {
            /* the drag still runs while the pointer stays over the canvas */
          }
        }
        return;
      }
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
      // (anim-rework S1) the right button is the aim, held
      if (e.button === 2) this.state.set(SRC + 'm', 'ads', true);
    });
    window.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (e.pointerId === this.dragId && e.button === this.dragBtn) {
        this.dragId = -1;
        return;
      }
      const extra = e.button === 1 ? 'Mouse1' : e.button === 3 ? 'Mouse3' : e.button === 4 ? 'Mouse4' : '';
      if (extra) for (const a of this.map.get(extra) ?? []) this.state.set(SRC + 'm', a, false);
      if (e.button === 0) this.state.set(SRC + 'm', 'fire', false);
      if (e.button === 2) this.state.set(SRC + 'm', 'ads', false);
    });
    // (step 09) a second button pressed or released while another is held fires no pointerdown / pointerup
    // (chorded buttons arrive as a pointermove with `button` set): RMB held to aim, then LMB to fire
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      // (marlow-bays item 9) the tuner's view drag reads pointer events: the engine cancels the canvas pointerdown, and a
      // cancelled pointerdown stops the browser's compatibility mouse events (mousemove too) until the button is up
      if (this.freeMouse && e.pointerId === this.dragId && !this.locked) {
        this.mouseLook(e.movementX, e.movementY);
        return;
      }
      if (e.button < 0 || !this.locked) return;
      const bit = e.button === 0 ? 1 : e.button === 1 ? 4 : e.button === 2 ? 2 : 1 << e.button;
      const down = (e.buttons & bit) !== 0;
      const extra = e.button === 1 ? 'Mouse1' : e.button === 3 ? 'Mouse3' : e.button === 4 ? 'Mouse4' : '';
      if (extra) {
        this.syncBinds();
        for (const a of this.map.get(extra) ?? []) this.state.set(SRC + 'm', a, down);
      }
      if (e.button === 0) this.state.set(SRC + 'm', 'fire', down);
      if (e.button === 2) this.state.set(SRC + 'm', 'ads', down);
    });
    canvas.addEventListener('lostpointercapture', () => (this.dragId = -1));
    window.addEventListener('mousemove', (e) => {
      if (this.locked) this.mouseLook(e.movementX, e.movementY);
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.locked) return;
        e.preventDefault();
        const now = performance.now();
        if (now - this.wheelT < WHEEL_GAP || e.deltaY === 0) return;
        this.wheelT = now;
        // (anim-rework S1) the held context menu's highlight: wheel up a row up, down a row down (no speed gear)
        this.state.tap(e.deltaY > 0 ? 'ctxDown' : 'ctxUp');
      },
      { passive: false },
    );
    document.addEventListener('pointerlockchange', () => {
      const locked = this.locked;
      if (!locked) {
        // buttons held through the capture loss are let go
        this.state.releaseSource(SRC + 'm');
        if (this.wantPointerLock && !this.releasing && !this.lockLostHook?.()) this.onLockLost?.();
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
    if (this.locked || this.freeMouse) return;
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
    this.hint.hidden = !(this.wantPointerLock && !this.freeMouse && !this.locked && document.body.classList.contains('input-kbm'));
  }

  /**
   * (marlow-bays item 9) The animation tuner's drag view on / off. On: the capture is released and never requested, the
   * hint stays hidden, the buttons on the scene neither fire nor aim, and a left drag on the canvas is the look. Off:
   * play's own locking again (requested now in a match by keyboard and mouse: the key or click that turned it off is the
   * gesture; a refusal leaves the "click to capture" hint).
   */
  setFreeMouse(on: boolean): void {
    if (on === this.freeMouse) return;
    this.freeMouse = on;
    this.dragId = -1;
    if (on) {
      this.state.releaseSource(SRC + 'm');
      this.releasePointerLock();
    } else if (this.wantPointerLock && document.body.classList.contains('input-kbm')) this.requestLock();
    this.refreshHint();
  }

  /** Mouse pixels to the look (the settings' sensitivity, the aim multiplier, invert Y): the captured look and the
   *  tuner's view drag. */
  private mouseLook(dx: number, dy: number): void {
    const s = this.getSettings().mouse;
    const k = MOUSE_RAD_PER_PX * s.sensitivity * (this.adsActive ? s.adsMultiplier : 1);
    this.state.addLook(dx * k, (s.invertY ? 1 : -1) * dy * k);
  }

  /** The pointer is free for the tuner (drag view), and a view drag is held. */
  get mouseFree(): boolean {
    return this.freeMouse;
  }

  get dragging(): boolean {
    return this.dragId >= 0;
  }

  /** Rebinding: hand the next key or extra mouse button to `cb` (Esc: null, Backspace / Delete: ''). */
  captureNext(cb: (code: string | null) => void): void {
    this.capture = cb;
  }

  get capturing(): boolean {
    return this.capture !== null;
  }

  /** (locomotion step 18) Give up a capture (the controls screen's 5 s timeout). */
  cancelCapture(): void {
    if (this.capture) this.finishCapture(null);
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
    this.paceCodes = { run: b.run[0] ?? '', run2: b.run[1] ?? '', creep: b.creep[0] ?? '', creep2: b.creep[1] ?? '' };
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
      // (anim-tuner pass 3) a key released there still releases: one held as focus landed on a slider never sticks
      if (down && e.code !== 'Escape' && (e.code !== 'Enter' || tag === 'TEXTAREA')) return;
    }
    if (e.code === 'F3') return;
    this.onActive();
    if (down) this.keys.add(e.code);
    else this.keys.delete(e.code);
    // (menu-ui MD11) arrows and WASD move menu focus; not during live play (WASD walk there), except (G5) a fresh W / S
    // press, which also steps the held context menu's highlight (the walk is blocked while it is held)
    const live = down && (e.code.startsWith('Arrow') || (!e.repeat && (e.code === 'KeyW' || e.code === 'KeyS')));
    const ui = down && !this.locked && !this.wantPointerLock ? menuNavTap(e.code, false) : live ? menuNavTap(e.code, false) : null;
    if (ui) {
      this.state.tap(ui);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    }
    this.syncBinds();
    for (const a of this.map.get(e.code) ?? []) {
      this.state.set(SRC, a, down);
      // (F1a, B3) the secondary-fire key is the held pistol jammer while the pistol is drawn (read as `altFire`)
    }
    // 1-7 pick a gadget (wheel order)
    if (down && e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 7) this.state.gadgetPick = n - 1;
    }
    const m = this.moveCodes;
    const alt = this.moveAlt;
    const x = (this.held(m.r, alt.r) ? 1 : 0) - (this.held(m.l, alt.l) ? 1 : 0);
    const y = (this.held(m.f, alt.f) ? 1 : 0) - (this.held(m.b, alt.b) ? 1 : 0);
    // (anim-rework S1, A1) WASD walk; Left Shift held runs, Left Alt held creeps (both: the creep)
    const pc = this.paceCodes;
    const pace = this.held(pc.creep, pc.creep2) ? KBM_PACE.creep : this.held(pc.run, pc.run2) ? KBM_PACE.run : KBM_PACE.walk;
    const len = (hyp2(x, y) || 1) / pace;
    this.state.setMove(SRC, x / len, y / len);
    const paceKey = e.code !== '' && (e.code === pc.run || e.code === pc.run2 || e.code === pc.creep || e.code === pc.creep2);
    // (Alt alone would focus the browser's menu; the run / creep keys never reach the page while captured)
    if (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow') || (this.locked && (paceKey || (this.map.has(e.code) && !e.code.startsWith('F'))))) e.preventDefault();
  }
}
