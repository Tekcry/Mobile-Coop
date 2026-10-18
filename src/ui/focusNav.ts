import { pickSpatial, pickWrap, type Dir, type Rect } from './spatial';

export const FOCUS_SELECTOR = '[data-focus]';

/** Dispatched on a focused element when left/right is pressed and it opted into adjusting. */
export interface NavAdjustDetail {
  delta: -1 | 1;
  /** Held past `ADJUST_FAST_S` (menu-ui SPEC 4.2): sliders step x5. */
  fast?: boolean;
}

/** Hold left / right this long (s) and a slider steps x5 (repeats closer than `ADJUST_CHAIN_S` count as one hold). */
export const ADJUST_FAST_S = 1.0;
export const ADJUST_CHAIN_S = 0.5;

/** Pure: the running hold of repeated adjusts. Returns the new start time and whether the step is fast. */
export function adjustHold(prevDir: number, prevAt: number, start: number, dir: number, now: number): { start: number; fast: boolean } {
  const chained = prevDir === dir && now - prevAt <= ADJUST_CHAIN_S;
  const s = chained ? start : now;
  return { start: s, fast: now - s >= ADJUST_FAST_S };
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
  private adjDir = 0;
  private adjAt = -1;
  private adjStart = 0;

  constructor() {
    // (menu-ui SPEC 4.1) a real mouse movement focuses the item under the pointer; a scroll that slides an item under a
    // still cursor does not (no movement), and touch never hovers
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || (e.movementX === 0 && e.movementY === 0) || document.pointerLockElement) return;
      const el = (e.target as HTMLElement | null)?.closest?.<HTMLElement>(FOCUS_SELECTOR);
      if (el && el !== this.current && this.root?.contains(el) && this.isFocusable(el)) this.focus(el, false);
    });
    // Mouse selects too, so returning to the controller continues from where you tapped.
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
      const delta = dir === 'left' ? -1 : 1;
      const now = performance.now() / 1000;
      const hold = adjustHold(this.adjDir, this.adjAt, this.adjStart, delta, now);
      this.adjDir = delta;
      this.adjAt = now;
      this.adjStart = hold.start;
      cur.dispatchEvent(new CustomEvent<NavAdjustDetail>('nav-adjust', { detail: { delta, fast: hold.fast } }));
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
    // (menu-ui SPEC 4.3) up / down wrap inside a `data-wrap` list; left / right never wrap; grids never wrap
    const wrapIn = dir === 'up' || dir === 'down' ? cur.closest('[data-wrap]') : null;
    if (i < 0 && wrapIn) {
      const j = pickWrap(from, rects.map((r, k) => (wrapIn.contains(others[k]!) ? r : OFF)), dir);
      if (j >= 0) i = j;
    }
    if (i >= 0) this.focus(others[i]!);
  }

  confirm(): void {
    const cur = this.current;
    if (!cur) return;
    cur.dispatchEvent(new CustomEvent('nav-confirm', { bubbles: true }));
    cur.click();
  }
}

/** A rect no column lines up with (wrap candidates outside the list). */
const OFF: Rect = { x: -1e6, y: -1e6, w: 0, h: 0 };

function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}
