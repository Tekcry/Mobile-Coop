import { h } from './dom';
import { icon } from './icons';
import type { NavAdjustDetail } from './focusNav';
import { Screen } from './screen';
import type { Hint } from './prompts';

export interface ButtonOpts {
  icon?: string;
  class?: string;
  autofocus?: boolean;
  disabled?: boolean;
  /** Focusable but inactive; pressing it explains why (locked items, not enough credits). */
  blocked?: string;
  sub?: string;
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
  if (opts.blocked) b.classList.add('blocked');
  b.addEventListener('click', () => {
    if (b.disabled) return;
    if (opts.blocked) {
      uiHooks.blocked(opts.blocked);
      return;
    }
    onClick();
  });
  return b;
}

function row(label: string, control: HTMLElement, rowCls = ''): HTMLElement {
  return h('div', { class: `row ${rowCls}` }, h('span', { class: 'row-label', text: label }), control);
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
  el.addEventListener('nav-adjust', (e) => setV(o.get() + (e as CustomEvent<NavAdjustDetail>).detail.delta * o.step));
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
  render();
  return el;
}

export interface ChoiceOption<T> {
  value: T;
  label: string;
}

export function choice<T>(label: string, options: ChoiceOption<T>[], get: () => T, set: (v: T) => void): HTMLElement {
  const val = h('span', { class: 'choice-val' });
  const prev = h('span', { class: 'choice-arrow', text: '‹' });
  const next = h('span', { class: 'choice-arrow', text: '›' });
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
  render();
  return el;
}

export interface TabDef {
  id: string;
  label: string;
  build: () => HTMLElement;
}

/** Tab strip + panels. Bumpers (LB/RB) cycle; tabs are also tappable/focusable. */
export class TabView {
  readonly el: HTMLElement;
  private headers: HTMLElement[] = [];
  private panels: HTMLElement[] = [];
  private active = 0;
  onChange: ((i: number) => void) | null = null;

  constructor(private tabs: TabDef[]) {
    const strip = h('div', { class: 'tab-strip' });
    const body = h('div', { class: 'tab-body scrollable' });
    tabs.forEach((t, i) => {
      const hd = h('button', { class: 'tab', text: t.label, focus: true, onClick: () => this.select(i) });
      this.headers.push(hd);
      strip.append(hd);
      const panel = h('div', { class: 'tab-panel' });
      panel.dataset.tab = t.id;
      panel.append(t.build());
      this.panels.push(panel);
      body.append(panel);
    });
    strip.insertAdjacentHTML('afterbegin', '<span class="tab-bumper">LB</span>');
    strip.insertAdjacentHTML('beforeend', '<span class="tab-bumper">RB</span>');
    this.el = h('div', { class: 'tabview' }, strip, body);
    this.select(0);
  }

  get index(): number {
    return this.active;
  }

  select(i: number): void {
    this.active = (i + this.tabs.length) % this.tabs.length;
    this.headers.forEach((hd, j) => hd.classList.toggle('active', j === this.active));
    this.panels.forEach((p, j) => p.classList.toggle('active', j === this.active));
    this.onChange?.(this.active);
  }

  cycle(d: -1 | 1): void {
    this.select(this.active + d);
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
    buttons: { label: string; action: () => void; primary?: boolean }[],
    private onCancel?: () => void,
  ) {
    super('dialog-screen');
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
          { class: b.primary ? 'primary' : '', autofocus: b.primary },
        ),
      );
    }
    box.append(bar);
    this.el.append(box);
  }
  override onBack(): boolean {
    this.manager.pop();
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
