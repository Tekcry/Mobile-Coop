import { h } from '../dom';
import { icon } from '../icons';
import { GADGETS } from '../../game/gadgets';
import { wheelLabel, type WheelSeg, type WheelVision } from '../../game/selectionWheel';
import { VISION_WHEEL, visionLabel } from '../../game/vision';

/** What the wheel draws (the game fills one reused object per frame). */
export interface WheelView {
  open: boolean;
  ring: readonly WheelSeg[];
  /** Highlighted segment (-1 none) and the vision mode under the cursor (vision segment). */
  seg: number;
  mode: WheelVision;
  /** What is current: the vision mode the button toggles and whether the goggles are on, the held gun, the gadget. */
  visionSel: WheelVision;
  visionOn: boolean;
  gun: number;
  gadget: string;
  /** Key hint for the input mode. */
  hint: string;
}

const SHORT: Record<WheelVision, string> = { night: 'NV', thermal: 'TH', electro: 'EM' };

/**
 * (CT prototype F1a, G181; layout WHEEL-REF.md) The selection wheel and the remote feed overlay. A ring of teal
 * translucent tiles over the live game (the game does not slow): the vision slot at the top with its three-mode stack
 * above it, the guns (loaded / reserve), the kit gadgets (counts); a label right of the ring names the highlighted item
 * and its kind, a hint box at the left names the key. The tile art is our own (glyphs and the gadget icons). DOM is
 * written only when something changes.
 */
export class GadgetWheel {
  readonly el: HTMLElement;
  private ring: HTMLElement;
  private tiles: HTMLElement[] = [];
  private stack: HTMLElement[] = [];
  private labelName: HTMLElement;
  private labelMode: HTMLElement;
  private hintEl: HTMLElement;
  private feed: HTMLElement;
  private feedText: HTMLElement;
  private feedKey = '';
  private key = '';

  constructor(parent: HTMLElement) {
    this.ring = h('div', { class: 'sw-ring' });
    const stackEl = h('div', { class: 'sw-stack' });
    // top to bottom: electro, thermal, night (A / E on the vision slot steps night -> thermal -> electro, nv-pass slice 3)
    for (const m of [...VISION_WHEEL].reverse()) {
      const t = h('div', { class: 'sw-vis', data: { mode: m }, text: visionLabel(m) });
      stackEl.appendChild(t);
      this.stack.push(t);
    }
    this.ring.appendChild(stackEl);
    this.labelName = h('div', { class: 'sw-label-name' });
    this.labelMode = h('div', { class: 'sw-label-mode' });
    this.hintEl = h('div', { class: 'sw-hint' });
    this.el = h('div', { class: 'gadget-wheel selection-wheel' }, this.ring, h('div', { class: 'sw-label' }, this.labelName, this.labelMode), this.hintEl);
    this.el.hidden = true;
    this.feedText = h('div', { class: 'gf-text' });
    this.feed = h('div', { class: 'gadget-feed' }, h('div', { class: 'gf-corner tl' }), h('div', { class: 'gf-corner tr' }), h('div', { class: 'gf-corner bl' }), h('div', { class: 'gf-corner br' }), h('div', { class: 'gf-cross' }), this.feedText);
    this.feed.hidden = true;
    parent.appendChild(this.feed);
    parent.appendChild(this.el);
  }

  private ensureTiles(n: number): void {
    while (this.tiles.length < n) {
      const t = h('div', { class: 'sw-tile' }, h('div', { class: 'sw-glyph' }), h('div', { class: 'sw-count' }));
      this.ring.appendChild(t);
      this.tiles.push(t);
    }
    for (let i = 0; i < this.tiles.length; i++) this.tiles[i]!.hidden = i >= n;
  }

  /** Per frame: draw the view (nothing when it has not changed). */
  update(v: WheelView): void {
    let k = v.open ? `${v.seg}|${v.mode}|${v.visionSel}|${v.visionOn}|${v.gun}|${v.gadget}|${v.hint}` : '';
    if (v.open) for (const s of v.ring) k += s.kind === 'gun' ? `|${s.loaded}/${s.reserve}` : s.kind === 'gadget' ? `|${s.count}` : '|v';
    if (k === this.key) return;
    this.key = k;
    this.el.hidden = !v.open;
    if (!v.open) return;
    const n = v.ring.length;
    this.ensureTiles(n);
    for (let i = 0; i < n; i++) {
      const s = v.ring[i]!;
      const t = this.tiles[i]!;
      const a = (i / n) * Math.PI * 2;
      t.style.left = `${50 + Math.sin(a) * 41}%`;
      t.style.top = `${50 - Math.cos(a) * 41}%`;
      t.classList.toggle('hl', i === v.seg);
      let sel: boolean;
      let empty = false;
      let glyph: string;
      let count = '';
      let color = '';
      if (s.kind === 'vision') {
        sel = v.visionOn;
        glyph = `<span class="sw-eye">&#9673;</span><span class="sw-sub">${SHORT[v.visionSel]}</span>`;
      } else if (s.kind === 'gun') {
        sel = s.index === v.gun;
        empty = s.loaded + s.reserve <= 0;
        glyph = `<span class="sw-gun">${s.name.slice(0, 3).toUpperCase()}</span>`;
        count = `${String(s.loaded).padStart(2, '0')}/${String(s.reserve).padStart(3, '0')}`;
      } else {
        sel = s.id === v.gadget;
        empty = s.count <= 0;
        glyph = icon(s.id, 26);
        count = `x${s.count}`;
        color = GADGETS[s.id].color;
      }
      t.classList.toggle('sel', sel);
      t.classList.toggle('empty', empty);
      t.style.setProperty('--c', color || '#7fe8e0');
      (t.firstElementChild as HTMLElement).innerHTML = glyph;
      (t.lastElementChild as HTMLElement).textContent = count;
    }
    // the vision stack: above the top tile; the carousel's current mode lit while that tile is highlighted
    for (const e of this.stack) {
      const m = e.dataset.mode as WheelVision;
      e.classList.toggle('hl', v.seg === 0 && v.mode === m);
      e.classList.toggle('sel', v.visionSel === m);
    }
    const [name, mode] = wheelLabel(v.seg >= 0 ? v.ring[v.seg] : undefined, v.mode);
    this.labelName.textContent = name;
    this.labelMode.textContent = mode;
    this.hintEl.textContent = v.hint;
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
