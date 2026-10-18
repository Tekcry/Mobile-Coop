import { h } from '../dom';

/** Pings on screen at once. */
export const PING_MAX = 6;
/** Seconds a ping stays. */
export const PING_LIFE = 6;

/**
 * Co-op pings: a coloured diamond with the distance at a world spot (or over a pinged guard), placed by the game
 * each frame in percent of the view; off screen it sits on the edge. A fixed pool; DOM written only on change.
 */
export class PingView {
  readonly el: HTMLElement;
  private items: { el: HTMLElement; label: HTMLElement; key: string }[] = [];
  private used = 0;
  /** The course's next-drill marker (D19): one more diamond, drawn the same way (on screen or on the edge). */
  private mk: { el: HTMLElement; label: HTMLElement; key: string };

  constructor(parent: HTMLElement) {
    this.el = h('div', { class: 'hud-pings' });
    for (let i = 0; i < PING_MAX; i++) {
      const label = h('span');
      const el = h('div', { class: 'ping' }, h('i'), label);
      el.hidden = true;
      this.el.appendChild(el);
      this.items.push({ el, label, key: '' });
    }
    const ml = h('span');
    const mel = h('div', { class: 'ping course-marker' }, h('i'), ml);
    mel.hidden = true;
    this.el.appendChild(mel);
    this.mk = { el: mel, label: ml, key: '' };
    parent.appendChild(this.el);
  }

  /** Place the course marker (percent of the view; `edge` = off screen, on the edge towards it). */
  marker(xPct: number, yPct: number, metres: number, edge: boolean): void {
    const it = this.mk;
    const m = Math.round(metres);
    const x = Math.round(xPct * 10);
    const y = Math.round(yPct * 10);
    // integer key parts: compared without building a string unless something moved
    if (it.key !== '' && this.mx === x && this.my === y && this.mm === m && this.me === edge) return;
    this.mx = x;
    this.my = y;
    this.mm = m;
    this.me = edge;
    it.key = 'on';
    it.el.hidden = false;
    it.el.style.left = `${xPct}%`;
    it.el.style.top = `${yPct}%`;
    it.el.classList.toggle('edge', edge);
    it.label.textContent = `${m} m`;
  }

  hideMarker(): void {
    if (this.mk.key === '') return;
    this.mk.key = '';
    this.mk.el.hidden = true;
  }

  /** The course marker is showing (tests). */
  get markerShown(): boolean {
    return this.mk.key !== '';
  }

  private mx = 0;
  private my = 0;
  private mm = 0;
  private me = false;

  begin(): void {
    this.used = 0;
  }

  add(xPct: number, yPct: number, color: string, metres: number, enemy: boolean, edge: boolean, fade: number): void {
    const it = this.items[this.used];
    if (!it) return;
    this.used++;
    const m = Math.round(metres);
    const key = `${xPct.toFixed(1)}|${yPct.toFixed(1)}|${color}|${m}|${enemy}|${edge}|${fade.toFixed(1)}`;
    if (key === it.key) return;
    it.key = key;
    it.el.hidden = false;
    it.el.style.left = `${xPct}%`;
    it.el.style.top = `${yPct}%`;
    it.el.style.setProperty('--c', color);
    it.el.style.opacity = String(fade);
    it.el.classList.toggle('enemy', enemy);
    it.el.classList.toggle('edge', edge);
    it.label.textContent = `${m} m`;
  }

  end(): void {
    for (let i = this.used; i < PING_MAX; i++) {
      const it = this.items[i]!;
      if (it.key === '') continue;
      it.key = '';
      it.el.hidden = true;
    }
  }

  /** Pings showing (tests). */
  get shown(): number {
    return this.used;
  }
}
