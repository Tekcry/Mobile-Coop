import { h } from '../dom';

const MAX = 4;

/**
 * Mark chevrons over marked enemies (Mark & Execute): white while marked, red when the mark can be executed.
 * Positions are percent of the view (projected by the game each frame); DOM is written only on change.
 */
export class Markers {
  readonly el: HTMLElement;
  private items: { el: HTMLElement; key: string }[] = [];
  private used = 0;

  constructor(parent: HTMLElement) {
    this.el = h('div', { class: 'hud-marks' });
    for (let i = 0; i < MAX; i++) {
      const el = h('div', { class: 'mark' }, h('i'));
      el.hidden = true;
      this.el.appendChild(el);
      this.items.push({ el, key: '' });
    }
    parent.appendChild(this.el);
  }

  begin(): void {
    this.used = 0;
  }

  add(xPct: number, yPct: number, ready: boolean): void {
    const it = this.items[this.used];
    if (!it) return;
    this.used++;
    const key = `${xPct.toFixed(1)}|${yPct.toFixed(1)}|${ready}`;
    if (key === it.key) return;
    it.key = key;
    it.el.hidden = false;
    it.el.style.left = `${xPct}%`;
    it.el.style.top = `${yPct}%`;
    it.el.classList.toggle('ready', ready);
  }

  end(): void {
    for (let i = this.used; i < MAX; i++) {
      const it = this.items[i]!;
      if (it.key === '') continue;
      it.key = '';
      it.el.hidden = true;
    }
  }

  /** Marks shown (tests). */
  get shown(): number {
    return this.used;
  }
}
