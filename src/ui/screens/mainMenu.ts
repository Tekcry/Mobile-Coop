import type { App } from '../../core/app';
import { h } from '../dom';
import { MenuScreen, type LegendItem } from '../menuScreen';
import { button } from '../widgets';

export interface MenuEntry {
  /** Stable id for focus memory and tests (`data-key`): continue, missions, coop, training, freeroam, ... */
  key: string;
  label: string;
  order: number;
  action: () => void;
  /** Small counter beside the label (42%, 1 / 8, Offline). */
  counter?: () => string;
  /** Context panel html for the focused item. */
  ctx?: string;
  /** Hidden this time (Continue without a checkpoint). */
  hidden?: () => boolean;
  /** Locked: still focusable, the reason shows in the context and toasts on confirm (MD18). */
  locked?: () => string | null;
}

/** (G183) `v4.6.2 · a1b2c3d`, plus the preview slot on a preview build: the version names the master release, the hash the exact build. */
export const versionText = (): string =>
  `v${__APP_VERSION__}${__PREVIEW__ ? ' PREVIEW' + (__PREVIEW_ID__ ? ' ' + __PREVIEW_ID__.toUpperCase() : '') : ''}${__BUILD_SHA__ ? ' · ' + __BUILD_SHA__ : ''}`;

/** Root menu (menu-ui MD6: a flat list). Systems register entries so the menu grows without edits here. */
export class MainMenuScreen extends MenuScreen {
  override readonly root = true;
  static entries: ((app: App) => MenuEntry)[] = [];
  private list: HTMLElement;

  constructor(private app: App) {
    super('main-menu', ['Main', 'Menu']);
    this.list = h('div', { class: 'menu-list ms-list', attrs: { 'data-wrap': '' } });
    this.body.append(this.list);
    this.el.append(
      h('div', { class: 'tagline', text: 'Observe  /  Infiltrate  /  Complete' }),
      h('div', { class: 'version', text: versionText() }),
    );
    this.build();
  }

  private build(): void {
    // Rebuilding replaces the buttons; keep focus on the same entry.
    const prevKey = this.lastFocus?.dataset.key ?? null;
    this.list.replaceChildren();
    const entries = MainMenuScreen.entries
      .map((f) => f(this.app))
      .filter((e) => !(e.hidden?.() ?? false))
      .sort((a, b) => a.order - b.order);
    entries.forEach((e, i) => {
      const lock = e.locked?.() ?? null;
      const b = button(e.label, e.action, { autofocus: i === 0, class: 'menu-item ms-item', ...(lock ? { blocked: lock } : {}) });
      b.dataset.key = e.key;
      if (lock) b.dataset.locked = lock;
      b.append(h('span', { class: 'ms-ctr', text: e.counter?.() ?? '' }));
      const ctx = (e.ctx ? `<p>${e.ctx}</p>` : '') + (lock ? `<p class="why">${lock}</p>` : '');
      if (ctx) b.dataset.ctx = ctx;
      this.list.append(b);
    });
    if (prevKey) this.lastFocus = this.list.querySelector<HTMLElement>(`[data-key="${prevKey}"]`);
  }

  /** Updates one entry's counter (async counts: open feedback notes). */
  setCounter(key: string, text: string): void {
    const c = this.list.querySelector(`[data-key="${key}"] .ms-ctr`);
    if (c) c.textContent = text;
  }

  override onShow(): void {
    this.build();
  }

  /** (menu-notes A1, Michael's note 3) Back on the main menu does nothing: no way back to the title screen. */
  override onBack(): boolean {
    return true;
  }

  /** No Back item: the root menu has nowhere to go back to. */
  override legend(): LegendItem[] {
    return [{ act: 'confirm', label: 'Select' }];
  }
}
