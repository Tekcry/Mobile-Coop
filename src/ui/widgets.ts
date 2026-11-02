import { h } from './dom';
import { icon } from './icons';
import type { NavAdjustDetail } from './focusNav';
import { Screen } from './screen';
import type { Hint } from './prompts';
import { glyphSlot } from './menuScreen';

export interface ButtonOpts {
  icon?: string;
  class?: string;
  autofocus?: boolean;
  disabled?: boolean;
  /** Focusable but inactive; pressing it explains why (a locked item). */
  blocked?: string;
  sub?: string;
  /** Stable id (`data-key`, menu-ui SPEC 3); default: the label's slug. */
  key?: string;
  /** Context panel text (the description of the item, MD9). */
  desc?: string;
}

/** "Look sensitivity (horizontal)" -> "look-sensitivity-horizontal". */
export function slug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** The context panel html of a row: its name and description (and a locked reason). */
export function ctxHtml(label: string, desc?: string, locked?: string): string {
  return `<h3>${label}</h3>${desc ? `<p>${desc}</p>` : ''}${locked ? `<p class="why">${locked}</p>` : ''}`;
}

/** Sets an element's key and description (rows built by the helpers below, or any focusable). */
export function describe<T extends HTMLElement>(el: T, label: string, desc?: string, key?: string): T {
  el.dataset.key = key ?? slug(label);
  if (desc) el.dataset.ctx = ctxHtml(label, desc, el.dataset.locked);
  return el;
}

/** App-level hooks for widgets (set once by the app). */
export const uiHooks = { blocked: (_msg: string): void => {} };

export function button(label: string, onClick: () => void, opts: ButtonOpts = {}): HTMLButtonElement {
  const b = h('button', { class: `btn ${opts.class ?? ''}`, focus: true });
  b.type = 'button';
  if (opts.icon) b.insertAdjacentHTML('beforeend', `<span class="btn-icon">${icon(opts.icon, 22)}</span>`);
  b.append(h('span', { class: 'btn-label', text: label }));
  if (opts.sub) b.append(h('span', { class: 'btn-sub', text: opts.sub }));
  if (opts.autofocus) b.dataset.autofocus = '';
  if (opts.disabled) b.disabled = true;
  if (opts.blocked) {
    b.classList.add('blocked');
    b.dataset.locked = opts.blocked;
  }
  b.dataset.key = opts.key ?? slug(label);
  if (opts.desc || opts.blocked) b.dataset.ctx = ctxHtml(label, opts.desc, opts.blocked);
  b.addEventListener('click', () => {
    if (b.disabled) return;
    if (opts.blocked) {
      // (MD18) locked: a 5 px shake and the reason
      b.classList.remove('shake');
      void b.offsetWidth;
      b.classList.add('shake');
      uiHooks.blocked(opts.blocked);
      return;
    }
    onClick();
  });
  return b;
}

function row(label: string, control: HTMLElement, rowCls = ''): HTMLElement {
  const el = h('div', { class: `row ${rowCls}` }, h('span', { class: 'row-label', text: label }), control);
  el.dataset.key = slug(label);
  return el;
}

/** A locked row (menu-ui SPEC 4.3): focusable, shows a fixed value, confirm toasts the reason. */
export function lockedRow(label: string, value: string, reason: string, desc?: string): HTMLElement {
  const el = row(label, h('span', { class: 'locked-val', text: value }), 'row-locked blocked');
  el.dataset.focus = '';
  el.dataset.locked = reason;
  el.dataset.ctx = ctxHtml(label, desc, reason);
  el.addEventListener('click', () => {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    uiHooks.blocked(reason);
  });
  return el;
}

export function toggle(label: string, get: () => boolean, set: (v: boolean) => void): HTMLElement {
  const sw = h('span', { class: 'switch' }, h('span', { class: 'knob' }));
  const el = row(label, sw, 'row-toggle');
  el.dataset.focus = '';
  el.dataset.adjust = '';
  const render = (): void => {
    sw.classList.toggle('on', get());
  };
  el.addEventListener('click', () => {
    set(!get());
    render();
  });
  el.addEventListener('nav-adjust', () => {
    set(!get());
    render();
  });
  el.addEventListener('widget-refresh', render);
  render();
  return el;
}

export interface SliderOpts {
  min: number;
  max: number;
  step: number;
  get: () => number;
  set: (v: number) => void;
  format?: (v: number) => string;
}

export function slider(label: string, o: SliderOpts): HTMLElement {
  const fill = h('span', { class: 'slider-fill' });
  const thumb = h('span', { class: 'slider-thumb' });
  const track = h('span', { class: 'slider-track' }, fill, thumb);
  const val = h('span', { class: 'slider-val' });
  const el = row(label, h('span', { class: 'slider' }, track, val), 'row-slider');
  el.dataset.focus = '';
  el.dataset.adjust = '';
  const fmt = o.format ?? ((v: number) => (o.step < 1 ? v.toFixed(2) : String(v)));
  const render = (): void => {
    const v = o.get();
    const t = (v - o.min) / (o.max - o.min);
    fill.style.width = `${t * 100}%`;
    thumb.style.left = `${t * 100}%`;
    val.textContent = fmt(v);
  };
  const setV = (v: number): void => {
    const snapped = Math.round((Math.min(o.max, Math.max(o.min, v)) - o.min) / o.step) * o.step + o.min;
    o.set(Number(snapped.toFixed(4)));
    render();
  };
  el.addEventListener('nav-adjust', (e) => {
    const d = (e as CustomEvent<NavAdjustDetail>).detail;
    setV(o.get() + d.delta * o.step * (d.fast ? 5 : 1));
  });
  const fromPointer = (e: PointerEvent): void => {
    const r = track.getBoundingClientRect();
    setV(o.min + ((e.clientX - r.left) / r.width) * (o.max - o.min));
  };
  track.addEventListener('pointerdown', (e) => {
    track.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  track.addEventListener('pointermove', (e) => {
    if (track.hasPointerCapture(e.pointerId)) fromPointer(e);
  });
  el.addEventListener('widget-refresh', render);
  render();
  return el;
}

export interface ChoiceOption<T> {
  value: T;
  label: string;
}

export function choice<T>(label: string, options: ChoiceOption<T>[], get: () => T, set: (v: T) => void): HTMLElement {
  const val = h('span', { class: 'choice-val' });
  const prev = h('span', { class: 'choice-arrow', text: '◀' });
  const next = h('span', { class: 'choice-arrow', text: '▶' });
  const el = row(label, h('span', { class: 'choice' }, prev, val, next), 'row-choice');
  el.dataset.focus = '';
  el.dataset.adjust = '';
  const idx = (): number => Math.max(0, options.findIndex((o) => o.value === get()));
  const render = (): void => {
    val.textContent = options[idx()]?.label ?? '';
  };
  const step = (d: number): void => {
    const i = (idx() + d + options.length) % options.length;
    set(options[i]!.value);
    render();
  };
  prev.addEventListener('click', (e) => {
    e.stopPropagation();
    step(-1);
  });
  next.addEventListener('click', (e) => {
    e.stopPropagation();
    step(1);
  });
  el.addEventListener('click', () => step(1));
  el.addEventListener('nav-adjust', (e) => step((e as CustomEvent<NavAdjustDetail>).detail.delta));
  el.addEventListener('widget-refresh', render);
  render();
  return el;
}

/** Re-read every widget's value under `root` (after a change that moves others: a graphics preset). */
export function refreshWidgets(root: HTMLElement): void {
  for (const el of root.querySelectorAll<HTMLElement>('.row')) el.dispatchEvent(new Event('widget-refresh'));
}

export interface TabDef {
  id: string;
  label: string;
  /** Icon for the side navigation. */
  icon?: string;
  build: () => HTMLElement;
}

/**
 * Tab strip + panels. Bumpers (LB/RB) cycle; tabs are also tappable/focusable. `side`: a vertical category list
 * (icon, label, a chevron on the active one) beside the panels; `strip` / `body` can be placed apart (a 3D stage
 * between them).
 */
export class TabView {
  readonly el: HTMLElement;
  readonly strip: HTMLElement;
  readonly body: HTMLElement;
  private headers: HTMLElement[] = [];
  private panels: HTMLElement[] = [];
  private active = 0;
  /** (menu-ui SPEC 4.3) the last focused element per tab. */
  private mem: (HTMLElement | null)[] = [];
  onChange: ((i: number) => void) | null = null;
  /** Reads the focused element (focus memory per tab); set by the screen. */
  focused: (() => HTMLElement | null) | null = null;

  constructor(
    private tabs: TabDef[],
    opts: { side?: boolean; menu?: boolean } = {},
  ) {
    const strip = (this.strip = h('div', { class: `tab-strip scrollable${opts.side ? ' side-nav' : ''}` }));
    const body = (this.body = h('div', { class: 'tab-body scrollable' }));
    tabs.forEach((t, i) => {
      // (menu-ui MD9) on the menu template the headers are clicked, not focused: LB / RB, Q / E and clicks switch tabs
      const hd = h('button', { class: `tab${opts.menu ? ' nofocus' : ''}`, focus: !opts.menu, onClick: () => this.select(i) });
      hd.type = 'button';
      if (t.icon && opts.side) hd.insertAdjacentHTML('beforeend', `<span class="tab-icon">${icon(t.icon, 20)}</span>`);
      hd.append(h('span', { class: 'tab-label', text: t.label }));
      if (opts.side) hd.insertAdjacentHTML('beforeend', `<span class="tab-chev">${icon('chevron', 16)}</span>`);
      hd.dataset.tab = t.id;
      this.headers.push(hd);
      strip.append(hd);
      const panel = h('div', { class: 'tab-panel' });
      panel.dataset.tab = t.id;
      panel.append(t.build());
      this.panels.push(panel);
      body.append(panel);
    });
    if (opts.menu) {
      // the LB / RB glyphs at both ends of the strip, clickable (SPEC 7.11)
      const bump = (act: 'lb' | 'rb', d: -1 | 1): HTMLElement => {
        const b = h('button', { class: `tab-bumper ms-bump nofocus`, html: glyphSlot(act, act === 'lb' ? 'Q' : 'E') });
        b.type = 'button';
        b.dataset.bump = act;
        b.addEventListener('click', () => this.cycle(d));
        return b;
      };
      strip.prepend(bump('lb', -1));
      strip.append(bump('rb', 1));
    } else if (!opts.side) {
      strip.insertAdjacentHTML('afterbegin', '<span class="tab-bumper">LB</span>');
      strip.insertAdjacentHTML('beforeend', '<span class="tab-bumper">RB</span>');
    }
    this.el = h('div', { class: `tabview${opts.side ? ' side' : ''}` }, strip, body);
    this.select(0);
  }

  get index(): number {
    return this.active;
  }

  select(i: number): void {
    const f = this.focused?.() ?? null;
    if (f && this.panels[this.active]?.contains(f)) this.mem[this.active] = f;
    this.active = (i + this.tabs.length) % this.tabs.length;
    this.headers.forEach((hd, j) => hd.classList.toggle('active', j === this.active));
    this.panels.forEach((p, j) => p.classList.toggle('active', j === this.active));
    this.onChange?.(this.active);
  }

  cycle(d: -1 | 1): void {
    this.select(this.active + d);
  }

  /** The active tab's remembered focus (still in its panel), else its first focusable. */
  recall(): HTMLElement | null {
    const p = this.panels[this.active];
    const m = this.mem[this.active];
    if (p && m && p.contains(m)) return m;
    return p?.querySelector<HTMLElement>('[data-focus]:not(.grp)') ?? null;
  }

  get activeId(): string {
    return this.tabs[this.active]?.id ?? '';
  }

  get activeLabel(): string {
    return this.tabs[this.active]?.label ?? '';
  }

  /** Rebuild a tab's contents (e.g. after reset to defaults). */
  rebuild(id: string): void {
    const i = this.tabs.findIndex((t) => t.id === id);
    if (i < 0) return;
    const p = this.panels[i]!;
    p.replaceChildren(this.tabs[i]!.build());
  }
}

export function section(title: string, ...children: HTMLElement[]): HTMLElement {
  return h('div', { class: 'section' }, h('div', { class: 'section-title', text: title }), ...children);
}

/** Modal confirm / message dialog. */
export class Dialog extends Screen {
  override modal = true;
  override readonly showBack = false;
  constructor(
    title: string,
    message: string,
    buttons: { label: string; action: () => void; primary?: boolean; safe?: boolean }[],
    private onCancel?: () => void,
  ) {
    super('dialog-screen');
    this.safeAction = buttons.find((b) => b.safe)?.action;
    const box = h(
      'div',
      { class: 'dialog' },
      h('div', { class: 'dialog-title', text: title }),
      h('div', { class: 'dialog-msg', text: message }),
    );
    const bar = h('div', { class: 'dialog-buttons', attrs: { 'data-wrap': '' } });
    for (const b of buttons) {
      bar.append(
        button(
          b.label,
          () => {
            this.manager.pop();
            b.action();
          },
          // (MD18) a dialog with a safe option opens on it (it is listed first); otherwise on the primary
          { class: b.primary ? 'primary' : b.safe ? 'safe' : '', autofocus: buttons.some((x) => x.safe) ? b.safe : b.primary },
        ),
      );
    }
    box.append(bar);
    this.el.append(box);
  }
  /** Back / B / Esc pick the safe option (MD18). */
  private safeAction: (() => void) | undefined;
  override onBack(): boolean {
    this.manager.pop();
    this.safeAction?.();
    this.onCancel?.();
    return true;
  }
  override hints(): Hint[] {
    return [
      { btn: 'A', label: 'Select' },
      { btn: 'B', label: 'Cancel' },
    ];
  }
}
