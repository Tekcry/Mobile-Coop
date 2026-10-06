import { h } from '../dom';
import { BARK } from '../../ai/barks';

interface Item {
  el: HTMLElement;
  /** Speaker id; seconds left on screen. */
  who: string;
  t: number;
  key: string;
}

/**
 * Enemy callouts: short lines over the speaker's head, positioned by the game each frame (percent of the view),
 * fading out after `BARK.show` seconds. A fixed pool; DOM written only on change.
 */
export class BarkView {
  readonly el: HTMLElement;
  private items: Item[] = [];

  constructor(parent: HTMLElement) {
    this.el = h('div', { class: 'hud-barks' });
    for (let i = 0; i < BARK.max; i++) {
      const el = h('div', { class: 'bark' });
      el.hidden = true;
      this.el.appendChild(el);
      this.items.push({ el, who: '', t: 0, key: '' });
    }
    parent.appendChild(this.el);
  }

  /** A new line from `who` (replaces that speaker's line, else the oldest). */
  say(who: string, line: string, radio: boolean): void {
    let it = this.items.find((x) => x.who === who && x.t > 0);
    if (!it) it = this.items.reduce((a, b) => (a.t <= b.t ? a : b));
    it.who = who;
    it.t = BARK.show;
    it.el.textContent = line;
    it.el.classList.toggle('radio', radio);
    it.el.hidden = false;
    it.key = '';
  }

  /** Lines showing (tests). */
  get shown(): string[] {
    return this.items.filter((x) => x.t > 0).map((x) => x.el.textContent ?? '');
  }

  /** Per frame: age the lines, and place each over its speaker (`place` returns false when off screen). */
  update(dt: number, place: (who: string, out: { x: number; y: number }) => boolean): void {
    const p = this.pt;
    for (const it of this.items) {
      if (it.t <= 0) continue;
      it.t -= dt;
      if (it.t <= 0 || !place(it.who, p)) {
        if (it.t <= 0) it.who = '';
        if (!it.el.hidden) it.el.hidden = true;
        it.key = '';
        continue;
      }
      const key = `${p.x.toFixed(1)}|${p.y.toFixed(1)}|${it.t < 0.4 ? 1 : 0}`;
      if (key === it.key) continue;
      it.key = key;
      it.el.hidden = false;
      it.el.style.left = `${p.x}%`;
      it.el.style.top = `${p.y}%`;
      it.el.classList.toggle('fade', it.t < 0.4);
    }
  }
  private pt = { x: 0, y: 0 };

  clear(): void {
    for (const it of this.items) {
      it.t = 0;
      it.who = '';
      it.el.hidden = true;
    }
  }
}
