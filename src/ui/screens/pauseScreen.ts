import type { App } from '../../core/app';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button, Dialog } from '../widgets';
import { SettingsScreen } from './settingsScreen';

export class PauseScreen extends Screen {
  override modal = true;

  constructor(
    app: App,
    private onResume: () => void,
    private onQuit: () => void,
    extra: HTMLElement | null = null,
  ) {
    super('pause-screen');
    const list = h(
      'div',
      { class: 'menu-list', attrs: { 'data-wrap': '' } },
      button('Resume', () => this.resume(), { icon: 'play', autofocus: true, class: 'primary big' }),
      button('Settings', () => this.manager.push(new SettingsScreen(app)), { icon: 'gear', class: 'big' }),
      button(
        'Quit to menu',
        () =>
          this.manager.push(
            new Dialog('Quit match?', 'Progress earned so far in this match is kept.', [
              { label: 'Cancel', action: () => {} },
              { label: 'Quit', action: () => this.onQuit(), primary: true },
            ]),
          ),
        { icon: 'back', class: 'big' },
      ),
    );
    this.el.append(h('div', { class: 'pause-panel' }, h('div', { class: 'screen-title', text: 'Paused' }), extra, list));
  }

  private resume(): void {
    this.manager.pop();
    this.onResume();
  }

  override onBack(): boolean {
    this.resume();
    return true;
  }

  override hints(): Hint[] {
    return [
      { btn: 'A', label: 'Select' },
      { btn: 'B', label: 'Resume' },
    ];
  }
}
