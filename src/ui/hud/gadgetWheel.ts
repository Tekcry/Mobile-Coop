import { h } from '../dom';
import { icon } from '../icons';
import { GADGET_IDS, GADGETS, type GadgetId } from '../../game/gadgets';

/**
 * The gadget wheel (eight slots clockwise from the top; the highlighted one is selected on release, or tapped by
 * touch) and the remote feed overlay (sticky cam / drone: a label, the controls, battery). DOM is written only
 * when something changes.
 */
export class GadgetWheel {
  readonly el: HTMLElement;
  private slots: HTMLElement[] = [];
  private counts: HTMLElement[] = [];
  private name: HTMLElement;
  private feed: HTMLElement;
  private feedText: HTMLElement;
  private feedKey = '';
  private key = '';
  /** Touch: a slot was tapped. */
  onPick: ((id: GadgetId) => void) | null = null;
  /** Touch: tapped outside the slots. */
  onClose: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.name = h('div', { class: 'gw-name' });
    const ring = h('div', { class: 'gw-ring' });
    for (let i = 0; i < GADGET_IDS.length; i++) {
      const id = GADGET_IDS[i]!;
      const a = (i / GADGET_IDS.length) * Math.PI * 2;
      const count = h('span', { class: 'gw-count' });
      const el = h('button', { class: 'gw-slot', data: { id }, html: icon(id, 28) }, count);
      el.style.left = `${50 + Math.sin(a) * 38}%`;
      el.style.top = `${50 - Math.cos(a) * 38}%`;
      el.style.setProperty('--c', GADGETS[id].color);
      el.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        this.onPick?.(id);
      });
      ring.appendChild(el);
      this.slots.push(el);
      this.counts.push(count);
    }
    ring.appendChild(this.name);
    this.el = h('div', { class: 'gadget-wheel' }, ring);
    this.el.hidden = true;
    this.el.addEventListener('pointerup', () => this.onClose?.());
    this.feedText = h('div', { class: 'gf-text' });
    this.feed = h('div', { class: 'gadget-feed' }, h('div', { class: 'gf-corner tl' }), h('div', { class: 'gf-corner tr' }), h('div', { class: 'gf-corner bl' }), h('div', { class: 'gf-corner br' }), h('div', { class: 'gf-cross' }), this.feedText);
    this.feed.hidden = true;
    parent.appendChild(this.feed);
    parent.appendChild(this.el);
  }

  /** Per frame: open state, highlighted slot, counts, selected. */
  update(open: boolean, slot: number, counts: Record<GadgetId, number>, selected: GadgetId): void {
    let k = open ? `${slot}|${selected}` : '';
    if (open) for (const id of GADGET_IDS) k += `|${counts[id]}`;
    if (k === this.key) return;
    this.key = k;
    this.el.hidden = !open;
    if (!open) return;
    for (let i = 0; i < GADGET_IDS.length; i++) {
      const id = GADGET_IDS[i]!;
      this.slots[i]!.classList.toggle('hl', i === slot);
      this.slots[i]!.classList.toggle('sel', id === selected);
      this.slots[i]!.classList.toggle('empty', counts[id] <= 0);
      this.counts[i]!.textContent = String(counts[id]);
    }
    const id = slot >= 0 ? GADGET_IDS[slot]! : selected;
    this.name.textContent = GADGETS[id].name;
  }

  /** Remote feed overlay text (null hides it). */
  setFeed(text: string | null): void {
    const k = text ?? '';
    if (k === this.feedKey) return;
    this.feedKey = k;
    this.feed.hidden = text === null;
    this.feedText.textContent = k;
  }

  dispose(): void {
    this.el.remove();
    this.feed.remove();
  }

  get open(): boolean {
    return !this.el.hidden;
  }
}
