import type { App } from '../../core/app';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button } from '../widgets';

export interface MenuEntry {
  label: string;
  icon: string;
  sub?: string;
  order: number;
  action: () => void;
  disabled?: () => boolean;
}

/** Root menu. Systems register entries so the menu grows with each phase without edits here. */
export class MainMenuScreen extends Screen {
  override readonly root = true;
  static entries: ((app: App) => MenuEntry)[] = [];
  private list: HTMLElement;
  readonly badge: HTMLElement;

  constructor(private app: App) {
    super('main-menu');
    this.list = h('div', { class: 'menu-list', attrs: { 'data-wrap': '' } });
    this.badge = h('div', { class: 'profile-badge' });
    this.el.append(
      h(
        'div',
        { class: 'menu-left' },
        h('div', { class: 'game-title', html: 'SHOULDER<br><span>STRIKE</span>' }),
        this.list,
        h('div', { class: 'version', text: `v${__APP_VERSION__}${__PREVIEW__ ? ' PREVIEW' : ''}` }),
      ),
      this.badge,
    );
    this.build();
  }

  private build(): void {
    // Rebuilding replaces the buttons; keep focus on the same slot.
    const prevIdx = this.lastFocus ? Array.from(this.list.children).indexOf(this.lastFocus) : -1;
    this.list.replaceChildren();
    const entries = MainMenuScreen.entries.map((f) => f(this.app)).sort((a, b) => a.order - b.order);
    entries.forEach((e, i) => {
      this.list.append(
        button(e.label, e.action, {
          icon: e.icon,
          sub: e.sub,
          autofocus: i === 0,
          disabled: e.disabled?.() ?? false,
          class: i === 0 ? 'primary big' : 'big',
        }),
      );
    });
    if (prevIdx >= 0) this.lastFocus = (this.list.children[prevIdx] as HTMLElement | undefined) ?? null;
  }

  override onShow(): void {
    this.build();
  }

  override hints(): Hint[] {
    return [{ btn: 'A', label: 'Select' }];
  }
}
