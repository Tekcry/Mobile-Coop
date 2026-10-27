import { h } from '../dom';
import { icon } from '../icons';
import { GADGETS } from '../../game/gadgets';
import { wheelLabel, type WheelSeg, type WheelVision } from '../../game/selectionWheel';
import { VISION_WHEEL } from '../../game/vision';
import { fitWheel, sectorPath, type WheelLayout } from './wheelLayout';

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
const SVG_NS = 'http://www.w3.org/2000/svg';
/** Ring radii in the SVG's -100..100 box: the segments run from R_IN to R_OUT, items sit at R_ITEM. */
const R_OUT = 97;
const R_IN = 54;
const R_ITEM = 75.5;
/** Half the gap between segments (radians). */
const GAP = 0.022;

/**
 * (CT prototype F1a, G181; layout WHEEL-REF.md; wheel-ui restyle) The selection wheel and the remote feed overlay. A
 * ring of SVG segments over the live game (the game does not slow): the vision slot at the top (the mode it toggles,
 * and the three modes with the carousel's one lit), the guns (loaded / reserve), the kit gadgets (counts); the
 * highlighted segment lifts and lights, the current ones carry an inner bar. The centre disc names the highlighted
 * item and its kind; a hint box left of the ring (under it on narrow screens) names the key. The wheel's size comes
 * from the viewport (`fitWheel`), measured on open, on resize, when the top HUD resizes and on hint changes, clear of the top HUD and the hint.
 * Our own art (inline SVG). DOM is written only when something changes; nothing allocates per frame while unchanged.
 */
export class GadgetWheel {
  readonly el: HTMLElement;
  private ring: HTMLElement;
  private svg: SVGSVGElement;
  private segs: SVGGElement[] = [];
  private tiles: HTMLElement[] = [];
  private glyphs: HTMLElement[] = [];
  private counts: HTMLElement[] = [];
  private glyphKey: string[] = [];
  private stackEl: HTMLElement;
  private stack: HTMLElement[] = [];
  private labelName: HTMLElement;
  private labelMode: HTMLElement;
  private hintEl: HTMLElement;
  private feed: HTMLElement;
  private feedText: HTMLElement;
  private feedKey = '';
  private topEl: HTMLElement | null;
  private nSegs = -1;
  private layoutDirty = true;
  private readonly lay: WheelLayout = { d: 0, cx: 0, cy: 0, hintX: 0, hintY: 0, below: false };
  private readonly onResize = (): void => {
    this.layoutDirty = true;
  };
  // the last drawn view (change detection without building a key string per frame)
  private pOpen = false;
  private pSeg = -2;
  private pMode = '';
  private pSel = '';
  private pOn = false;
  private pGun = -2;
  private pGadget = '';
  private pHint = '';
  // each slot's identity (kind and gun name / gadget id): the ring is updated in place and rebuilt when its shape changes, so compare contents
  private pN = -1;
  private readonly pKinds: string[] = [];
  private readonly pKeys: string[] = [];
  private ro: ResizeObserver | null = null;
  private pCounts = new Int32Array(32);

  constructor(parent: HTMLElement) {
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('class', 'sw-svg');
    this.svg.setAttribute('viewBox', '-100 -100 200 200');
    this.svg.setAttribute('aria-hidden', 'true');
    this.ring = h('div', { class: 'sw-ring' });
    this.ring.appendChild(this.svg);
    this.stackEl = h('div', { class: 'sw-stack' });
    // night, thermal, electro left to right (A / E on the vision slot steps night -> thermal -> electro, nv-pass slice 3)
    for (const m of VISION_WHEEL) {
      const t = h('span', { class: 'sw-vis', data: { mode: m }, text: SHORT[m] });
      this.stackEl.appendChild(t);
      this.stack.push(t);
    }
    this.labelName = h('div', { class: 'sw-label-name' });
    this.labelMode = h('div', { class: 'sw-label-mode' });
    this.ring.appendChild(h('div', { class: 'sw-label' }, this.labelName, this.labelMode));
    this.hintEl = h('div', { class: 'sw-hint' });
    this.el = h('div', { class: 'gadget-wheel selection-wheel' }, this.ring, this.hintEl);
    this.el.hidden = true;
    this.feedText = h('div', { class: 'gf-text' });
    this.feed = h('div', { class: 'gadget-feed' }, h('div', { class: 'gf-corner tl' }), h('div', { class: 'gf-corner tr' }), h('div', { class: 'gf-corner bl' }), h('div', { class: 'gf-corner br' }), h('div', { class: 'gf-cross' }), this.feedText);
    this.feed.hidden = true;
    parent.appendChild(this.feed);
    parent.appendChild(this.el);
    this.topEl = parent.querySelector<HTMLElement>('.hud-top');
    window.addEventListener('resize', this.onResize);
    // a top HUD that grows while the wheel is open (objective text) re-lays it out
    if (this.topEl && typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(this.onResize);
      this.ro.observe(this.topEl);
    }
  }

  /** The segment shapes and item tiles for n segments (rebuilt only when n changes). */
  private build(n: number): void {
    this.nSegs = n;
    let svg = `<circle class="sw-rim" r="${R_OUT + 2}"/><circle class="sw-core" r="${R_IN - 3}"/>`;
    const half = Math.PI / n;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const a0 = a - half + GAP;
      const a1 = a + half - GAP;
      svg +=
        `<g class="sw-seg"><path class="sw-fill" d="${sectorPath(R_IN, R_OUT, a0, a1)}"/>` +
        `<path class="sw-mark" d="${sectorPath(R_IN, R_IN + 4.5, a0, a1)}"/>` +
        `<path class="sw-edge" d="${sectorPath(R_OUT - 2, R_OUT + 2.5, a0, a1)}"/></g>`;
    }
    this.svg.innerHTML = svg;
    this.segs = Array.from(this.svg.querySelectorAll<SVGGElement>('.sw-seg'));
    while (this.tiles.length < n) {
      const g = h('div', { class: 'sw-glyph' });
      const c = h('div', { class: 'sw-count' });
      const t = h('div', { class: 'sw-tile' }, g, c);
      this.ring.appendChild(t);
      this.tiles.push(t);
      this.glyphs.push(g);
      this.counts.push(c);
      this.glyphKey.push('');
    }
    const r = R_ITEM / 2; // % of the ring box
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i]!;
      t.hidden = i >= n;
      const a = (i / n) * Math.PI * 2;
      t.style.left = `${50 + Math.sin(a) * r}%`;
      t.style.top = `${50 - Math.cos(a) * r}%`;
    }
  }

  /** True when the view differs from the last drawn one (and records it). */
  private changed(v: WheelView): boolean {
    let c = v.open !== this.pOpen;
    this.pOpen = v.open;
    if (!v.open) return c;
    if (v.seg !== this.pSeg || v.mode !== this.pMode || v.visionSel !== this.pSel || v.visionOn !== this.pOn || v.gun !== this.pGun || v.gadget !== this.pGadget || v.hint !== this.pHint) c = true;
    this.pSeg = v.seg;
    this.pMode = v.mode;
    this.pSel = v.visionSel;
    this.pOn = v.visionOn;
    this.pGun = v.gun;
    this.pGadget = v.gadget;
    this.pHint = v.hint;
    const n = v.ring.length;
    if (n !== this.pN) {
      this.pN = n;
      c = true;
    }
    for (let i = 0; i < n; i++) {
      const s = v.ring[i]!;
      const k = s.kind === 'gun' ? s.name : s.kind === 'gadget' ? s.id : '';
      if (this.pKinds[i] !== s.kind || this.pKeys[i] !== k) {
        this.pKinds[i] = s.kind;
        this.pKeys[i] = k;
        c = true;
      }
    }
    if (this.pCounts.length < n * 2) {
      this.pCounts = new Int32Array(n * 2);
      c = true;
    }
    const pc = this.pCounts;
    for (let i = 0; i < n; i++) {
      const s = v.ring[i]!;
      const a = s.kind === 'gun' ? s.loaded : s.kind === 'gadget' ? s.count : -1;
      const b = s.kind === 'gun' ? s.reserve : -1;
      if (pc[i * 2] !== a || pc[i * 2 + 1] !== b) {
        pc[i * 2] = a;
        pc[i * 2 + 1] = b;
        c = true;
      }
    }
    return c;
  }

  /** Size and place the wheel and the hint for the current viewport (on open, resize and hint changes only). */
  private layout(): void {
    this.layoutDirty = false;
    const box = this.el.getBoundingClientRect();
    const top = this.topEl?.getBoundingClientRect();
    const hint = this.hintEl.getBoundingClientRect();
    const l = fitWheel({ w: box.width, h: box.height, top: top && top.height > 0 ? top.bottom - box.top : 0, hintW: hint.width, hintH: hint.height }, this.lay);
    const s = this.el.style;
    s.setProperty('--sw-d', `${l.d}px`);
    s.setProperty('--sw-cx', `${l.cx}px`);
    s.setProperty('--sw-cy', `${l.cy}px`);
    s.setProperty('--sw-hx', `${l.hintX}px`);
    s.setProperty('--sw-hy', `${l.hintY}px`);
    this.el.classList.toggle('hint-below', l.below);
  }

  /** Per frame: draw the view (nothing when it has not changed). */
  update(v: WheelView): void {
    if (!this.changed(v)) {
      if (v.open && this.layoutDirty) this.layout();
      return;
    }
    const opening = v.open && this.el.hidden;
    this.el.hidden = !v.open;
    if (!v.open) return;
    const n = v.ring.length;
    if (n !== this.nSegs) this.build(n);
    let visTile = -1;
    for (let i = 0; i < n; i++) {
      const s = v.ring[i]!;
      const t = this.tiles[i]!;
      const hl = i === v.seg;
      let sel: boolean;
      let empty = false;
      let gk: string;
      let count = '';
      if (s.kind === 'vision') {
        visTile = i;
        sel = v.visionOn;
        gk = hl ? v.mode : v.visionSel;
      } else if (s.kind === 'gun') {
        sel = s.index === v.gun;
        empty = s.loaded + s.reserve <= 0;
        gk = s.name;
        count = `${String(s.loaded).padStart(2, '0')}/${String(s.reserve).padStart(3, '0')}`;
      } else {
        sel = s.id === v.gadget;
        empty = s.count <= 0;
        gk = s.id;
        count = `x${s.count}`;
      }
      if (gk !== this.glyphKey[i]) {
        this.glyphKey[i] = gk;
        const g = this.glyphs[i]!;
        if (s.kind === 'vision') g.innerHTML = `${icon('ads', 24)}<span class="sw-sub">${SHORT[gk as WheelVision]}</span>`;
        else if (s.kind === 'gun') g.innerHTML = `${icon('gun', 24)}<span class="sw-sub">${s.name.slice(0, 3).toUpperCase()}</span>`;
        else g.innerHTML = icon(s.id, 24);
        t.style.setProperty('--c', s.kind === 'gadget' ? GADGETS[s.id].color : '');
      }
      t.classList.toggle('hl', hl);
      t.classList.toggle('sel', sel);
      t.classList.toggle('empty', empty);
      const seg = this.segs[i]!;
      seg.classList.toggle('hl', hl);
      seg.classList.toggle('sel', sel);
      seg.classList.toggle('empty', empty);
      const c = this.counts[i]!;
      if (s.kind !== 'vision' && c.textContent !== count) c.textContent = count;
    }
    // the vision slot's mode row: the carousel's mode lit while the slot is highlighted, the toggled mode marked
    if (visTile >= 0) {
      const c = this.counts[visTile]!;
      if (this.stackEl.parentElement !== c) c.replaceChildren(this.stackEl);
    }
    for (const e of this.stack) {
      const m = e.dataset.mode as WheelVision;
      e.classList.toggle('hl', v.seg === visTile && v.mode === m);
      e.classList.toggle('sel', v.visionSel === m);
    }
    const [name, mode] = wheelLabel(v.seg >= 0 ? v.ring[v.seg] : undefined, v.mode);
    this.labelName.textContent = name;
    this.labelMode.textContent = mode;
    if (this.hintEl.textContent !== v.hint) {
      this.hintEl.textContent = v.hint;
      this.layoutDirty = true;
    }
    if (opening || this.layoutDirty) this.layout();
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
    window.removeEventListener('resize', this.onResize);
    this.ro?.disconnect();
    this.el.remove();
    this.feed.remove();
  }

  get open(): boolean {
    return !this.el.hidden;
  }
}
