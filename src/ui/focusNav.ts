import { pickSpatial, pickWrap, type Dir, type Rect } from './spatial';

export const FOCUS_SELECTOR = '[data-focus]';

/** Dispatched on a focused element when left/right is pressed and it opted into adjusting. */
export interface NavAdjustDetail {
  delta: -1 | 1;
}

/**
 * One focus system for every menu. Works on any DOM subtree: elements marked
 * `data-focus` are focusable. Elements with `data-adjust` receive left/right as
 * 'nav-adjust' events (sliders, choice pickers) instead of moving focus.
 * The highlight is CSS (`.focused`), only drawn when using a controller/keyboard.
 */
export class FocusNav {
  private root: HTMLElement | null = null;
  private current: HTMLElement | null = null;

  constructor() {
    // Touch/mouse selects too, so returning to the controller continues from where you tapped.
    window.addEventListener(
      'pointerdown',
      (e) => {
        const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(FOCUS_SELECTOR);
        if (el && this.root?.contains(el)) this.focus(el, false);
      },
      { capture: true },
    );
  }

  get focused(): HTMLElement | null {
    return this.current;
  }

  setRoot(root: HTMLElement | null, initial?: HTMLElement | null): void {
    this.root = root;
    if (!root) {
      this.focus(null);
      return;
    }
    const target = initial && root.contains(initial) && this.isFocusable(initial) ? initial : this.first();
    this.focus(target);
  }

  /** Re-validate after DOM changes (e.g. tab switch). */
  refresh(): void {
    if (!this.root) return;
    if (!this.current || !this.root.contains(this.current) || !this.isFocusable(this.current)) {
      this.focus(this.first());
    }
  }

  focusables(): HTMLElement[] {
    if (!this.root) return [];
    return Array.from(this.root.querySelectorAll<HTMLElement>(FOCUS_SELECTOR)).filter((el) => this.isFocusable(el));
  }

  private isFocusable(el: HTMLElement): boolean {
    if (el.hasAttribute('disabled') || el.closest('[hidden]') || el.classList.contains('nofocus')) return false;
    if (el.closest('.tab-panel:not(.active)')) return false;
    return el.getClientRects().length > 0;
  }

  private first(): HTMLElement | null {
    const all = this.focusables();
    return all.find((e) => e.hasAttribute('data-autofocus')) ?? all[0] ?? null;
  }

  focus(el: HTMLElement | null, scroll = true): void {
    if (this.current === el) return;
    this.current?.classList.remove('focused');
    this.current = el;
    if (!el) return;
    el.classList.add('focused');
    if (scroll) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    el.dispatchEvent(new CustomEvent('nav-focus', { bubbles: true }));
  }

  move(dir: Dir): void {
    const cur = this.current;
    if (cur && (dir === 'left' || dir === 'right') && cur.hasAttribute('data-adjust')) {
      cur.dispatchEvent(new CustomEvent<NavAdjustDetail>('nav-adjust', { detail: { delta: dir === 'left' ? -1 : 1 } }));
      return;
    }
    // Let a widget (e.g. layout editor) consume movement.
    if (cur?.hasAttribute('data-capture-nav')) {
      cur.dispatchEvent(new CustomEvent('nav-dir', { detail: { dir } }));
      return;
    }
    const all = this.focusables();
    if (!cur) {
      this.focus(all[0] ?? null);
      return;
    }
    const others = all.filter((e) => e !== cur);
    const rects = others.map(rectOf);
    const from = rectOf(cur);
    let i = pickSpatial(from, rects, dir);
    if (i < 0 && cur.closest('[data-wrap]')) i = pickWrap(from, rects, dir);
    if (i >= 0) this.focus(others[i]!);
  }

  confirm(): void {
    const cur = this.current;
    if (!cur) return;
    cur.dispatchEvent(new CustomEvent('nav-confirm', { bubbles: true }));
    cur.click();
  }
}

function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}
