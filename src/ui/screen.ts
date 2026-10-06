import { h } from './dom';
import type { FocusNav } from './focusNav';
import type { InputState } from '../input/inputState';
import { hintsHtml, type Hint } from './prompts';
import { icon } from './icons';

export abstract class Screen {
  readonly el: HTMLElement;
  /** Modal screens overlay the screen beneath instead of hiding it. */
  modal = false;
  lastFocus: HTMLElement | null = null;
  manager!: ScreenManager;
  readonly hintsEl: HTMLElement;

  constructor(cls: string) {
    this.el = h('div', { class: `screen ${cls}` });
    this.hintsEl = h('div', { class: 'hints' });
  }

  /** Default footer hints. Override per screen. */
  hints(): Hint[] {
    return [
      { btn: 'A', label: 'Select' },
      { btn: 'B', label: 'Back' },
    ];
  }

  renderHints(): void {
    this.hintsEl.innerHTML = hintsHtml(this.hints());
  }

  /** Element to focus when the screen is first shown (default: first focusable). */
  initialFocus(): HTMLElement | null {
    return null;
  }
  onShow(): void {}
  onHide(): void {}
  /** Return true if handled; otherwise the manager pops this screen. */
  onBack(): boolean {
    return false;
  }
  onTab(_dir: -1 | 1): void {}
  update(_dt: number): void {}
  /** Screens that cannot be dismissed with B (e.g. the root main menu). */
  readonly root: boolean = false;
  /** Show the on-screen back button (touch users have no B button). */
  readonly showBack: boolean = true;
  private backBtn: HTMLElement | null = null;

  /** Adds the touch back button once. Called by the manager. */
  attachChrome(): void {
    if (this.root || !this.showBack || this.backBtn) return;
    // top left, beside the title (the top right holds profile badges and tab strips that used to cover it); acts
    // on pointer up inside it so a thumb that drifts a little still counts, never twice
    const b = (this.backBtn = h('button', { class: 'screen-back nofocus', html: icon('back', 24), attrs: { 'aria-label': 'Back' } }));
    let down = false;
    b.addEventListener('pointerdown', (e) => {
      down = true;
      b.classList.add('pressed');
      b.setPointerCapture?.(e.pointerId);
    });
    const done = (): void => {
      down = false;
      b.classList.remove('pressed');
    };
    b.addEventListener('pointerup', (e) => {
      if (!down) return;
      done();
      e.preventDefault();
      this.manager.back(this);
    });
    b.addEventListener('pointercancel', done);
    // keyboard / assistive activation
    b.addEventListener('click', (e) => {
      if ((e as MouseEvent).detail === 0) this.manager.back(this);
    });
    this.el.classList.add('with-back');
    this.el.prepend(b);
  }
}

/** Stack of screens. Owns UI input routing and the shared FocusNav. */
export class ScreenManager {
  private stack: Screen[] = [];
  /** Sound hook for back/close. */
  onBack: (() => void) | null = null;
  private listeners = new Set<(open: boolean) => void>();

  constructor(
    private container: HTMLElement,
    readonly nav: FocusNav,
  ) {}

  get top(): Screen | undefined {
    return this.stack[this.stack.length - 1];
  }

  get isOpen(): boolean {
    return this.stack.length > 0;
  }

  get depth(): number {
    return this.stack.length;
  }

  onChange(fn: (open: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  push(s: Screen): void {
    const prev = this.top;
    if (prev) {
      prev.lastFocus = this.nav.focused;
      if (!s.modal) prev.el.hidden = true;
      prev.el.classList.add('under');
    }
    s.manager = this;
    this.stack.push(s);
    if (!s.el.contains(s.hintsEl)) s.el.appendChild(s.hintsEl);
    s.attachChrome();
    s.renderHints();
    s.el.hidden = false;
    this.container.appendChild(s.el);
    s.onShow();
    this.nav.setRoot(s.el, s.lastFocus ?? s.initialFocus());
    this.emit();
  }

  pop(): void {
    const s = this.stack.pop();
    if (!s) return;
    s.onHide();
    s.el.remove();
    const next = this.top;
    if (next) {
      next.el.hidden = false;
      next.el.classList.remove('under');
      next.onShow();
      this.nav.setRoot(next.el, next.lastFocus);
    } else {
      this.nav.setRoot(null);
    }
    this.emit();
  }

  replace(s: Screen): void {
    const old = this.stack.pop();
    if (old) {
      old.onHide();
      old.el.remove();
    }
    this.push(s);
  }

  clear(): void {
    while (this.stack.length) {
      const s = this.stack.pop()!;
      s.onHide();
      s.el.remove();
    }
    this.nav.setRoot(null);
    this.emit();
  }

  /** Same as pressing B on screen `s`. */
  back(s: Screen): void {
    if (this.top !== s) return;
    if (!s.root) this.onBack?.();
    if (!s.onBack() && !s.root) this.pop();
  }

  /** Pop until `s` is on top (or the stack is empty). */
  popTo(s: Screen): void {
    while (this.top && this.top !== s) this.pop();
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.isOpen);
  }

  /** Route UI actions to the top screen. Consumes all input edges while a menu is open. */
  update(input: InputState, dt: number): void {
    const s = this.top;
    if (!s) return;
    if (input.pressed('uiUp')) this.nav.move('up');
    if (input.pressed('uiDown')) this.nav.move('down');
    if (input.pressed('uiLeft')) this.nav.move('left');
    if (input.pressed('uiRight')) this.nav.move('right');
    if (input.pressed('uiTabPrev')) s.onTab(-1);
    if (input.pressed('uiTabNext')) s.onTab(1);
    if (input.pressed('uiConfirm')) this.nav.confirm();
    else if (input.pressed('uiBack')) this.back(s);
    this.top?.update(dt);
    input.consumeEdges();
  }
}
