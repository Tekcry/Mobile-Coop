import { h } from './dom';
import { Screen } from './screen';
import { promptHtml, type PromptButton } from './prompts';

/** A legend action (SPEC 3, step 02). `keys` overrides the keyboard glyph ("A-Z", "Enter"). */
export interface LegendItem {
  act: 'confirm' | 'back' | 'x' | 'y' | 'lb' | 'rb' | 'start' | 'any';
  label: string;
  keys?: string;
}

const ACT_BTN: Record<LegendItem['act'], PromptButton> = {
  confirm: 'A',
  back: 'B',
  x: 'X',
  y: 'Y',
  lb: 'LB',
  rb: 'RB',
  start: 'START',
  any: 'A',
};

const ACT_KEY: Partial<Record<LegendItem['act'], string>> = { any: 'Any key' };

/**
 * One glyph for an action in a fixed-width slot (SPEC 2: 38 px). Every device's glyph is emitted and the body class
 * (`input-gamepad` / `input-kbm`, `pad-ps`, `pad-nin`) shows one, so a device switch never re-renders or moves anything.
 */
export function glyphSlot(act: LegendItem['act'], keys?: string): string {
  return `<span class="gl">${promptHtml(ACT_BTN[act], keys ?? ACT_KEY[act])}</span>`;
}

/**
 * The shared menu template (menu-ui SPEC 3): ghosted two-line title, a body column, the context panel that describes
 * the focused item (`data-ctx`), and the clickable button legend bottom-left. A layer on `Screen`: `ScreenManager` and
 * `FocusNav` are unchanged.
 */
export abstract class MenuScreen extends Screen {
  override readonly showBack: boolean = false;
  readonly body: HTMLElement;
  readonly ctx: HTMLElement;
  readonly legendEl: HTMLElement;

  constructor(cls: string, title: [string, string]) {
    super(`${cls} menu-screen`);
    this.body = h('div', { class: 'ms-body' });
    this.ctx = h('div', { class: 'ms-ctx' });
    this.legendEl = h('div', { class: 'ms-legend' });
    this.el.append(
      h('div', { class: 'ms-ghost', html: `<span>${title[0]}</span><span>${title[1]}</span>` }),
      h('div', { class: 'ms-hair' }),
      this.body,
      this.ctx,
      this.legendEl,
    );
    this.hintsEl.style.display = 'none';
    this.ctx.hidden = true;
    this.el.addEventListener('nav-focus', (e) => this.showContext(e.target as HTMLElement | null));
  }

  /** The legend, Back first (SPEC 7). */
  legend(): LegendItem[] {
    return [
      { act: 'back', label: 'Back' },
      { act: 'confirm', label: 'Select' },
    ];
  }

  /** Context for the focused element: its `data-ctx` html. Empty hides the panel. */
  context(el: HTMLElement): string {
    return el.dataset.ctx ?? '';
  }

  showContext(el: HTMLElement | null): void {
    const html = el ? this.context(el) : '';
    this.ctx.innerHTML = html;
    this.ctx.hidden = !html;
  }

  /** Runs a legend action the same way its button does (the ScreenManager routes, not a synthetic key). */
  runLegend(act: LegendItem['act']): void {
    const m = this.manager;
    if (!m || m.top !== this) return;
    if (act === 'confirm' || act === 'any') m.nav.confirm();
    else if (act === 'back') m.back(this);
    else if (act === 'y') this.onAlt();
    else if (act === 'lb') this.onTab(-1);
    else if (act === 'rb') this.onTab(1);
  }

  override renderHints(): void {
    this.legendEl.replaceChildren(
      ...this.legend().map((it) => {
        const b = h('button', { class: 'ms-lg nofocus', html: `${glyphSlot(it.act, it.keys)}<span class="ms-lg-label">${it.label}</span>` });
        b.type = 'button';
        b.dataset.legend = it.act;
        b.addEventListener('click', () => this.runLegend(it.act));
        return b;
      }),
    );
    const f = this.manager?.nav.focused ?? null;
    this.showContext(f && this.el.contains(f) ? f : null);
  }
}
