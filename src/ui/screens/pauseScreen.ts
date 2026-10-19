import type { App } from '../../core/app';
import { h } from '../dom';
import { MenuScreen, type LegendItem } from '../menuScreen';
import { button, Dialog } from '../widgets';
import { SettingsScreen } from './settingsScreen';
import { FeedbackFormScreen } from './feedbackScreen';

/** Extra pause-menu rows added at run time (dev tools: the level editor's walk test adds "Back to editor"). Empty in play. */
export const pauseExtraRows: { label: string; act: () => void }[] = [];

/** One mission objective and its state (G108: the objectives live in the menu). */
export interface ObjectiveLine {
  label: string;
  done: boolean;
  current: boolean;
}

export interface PauseOpts {
  /** Co-op: the mission keeps running (the menu only takes this player's input). */
  coop?: boolean;
  /** The mission's objectives (empty: free roam or no objectives). */
  objectives?: () => ObjectiveLine[];
  /** Depth of field is on (the pause look blurs the game); false: a plain dark overlay (Low preset). */
  dof?: boolean;
  /** A controller dropped out: a line with the way back. */
  notice?: string;
}

/** Objectives (menu-ui step 10, G108): each objective with done / current / to do. Read only. */
export class ObjectivesScreen extends MenuScreen {
  constructor(lines: ObjectiveLine[]) {
    super('objectives-screen', ['Mission', 'Objectives']);
    const list = h('div', { class: 'ms-list', attrs: { 'data-wrap': '' } });
    if (!lines.length) {
      list.append(button('No objectives', () => {}, { class: 'ms-item', key: 'none', autofocus: true, desc: 'Free roam has no objectives. Explore the map.' }));
    }
    lines.forEach((o, i) => {
      const state = o.done ? 'Done' : o.current ? 'Current' : 'To do';
      const b = button(o.label, () => {}, {
        class: `ms-item obj-${o.done ? 'done' : o.current ? 'current' : 'todo'}`,
        key: `obj-${i}`,
        autofocus: o.current || (i === 0 && !lines.some((x) => x.current)),
        desc: `${state}. ${o.done ? 'Completed.' : o.current ? 'Do this next.' : 'Comes after the current objective.'}`,
      });
      b.append(h('span', { class: 'ms-ctr', text: state }));
      list.append(b);
    });
    this.body.append(list);
  }
}

/** The field terminal pause menu on the MenuScreen template (menu-ui step 10, MD7). */
export class PauseScreen extends MenuScreen {
  override modal = true;
  private noticeEl: HTMLElement;
  private noticeOff: (() => void) | null = null;

  constructor(
    app: App,
    private onResume: () => void,
    private onQuit: () => void,
    opts: PauseOpts = {},
  ) {
    super(`pause-screen${opts.dof ? '' : ' no-dof'}`, ['Field', 'Terminal']);
    const list = h('div', { class: 'ms-list', attrs: { 'data-wrap': '' } });
    const item = (label: string, act: () => void, desc: string, key?: string, autofocus = false): HTMLButtonElement =>
      button(label, act, { class: 'ms-item', desc, autofocus, ...(key ? { key } : {}) });
    list.append(
      item('Resume', () => this.resume(), opts.coop ? 'Back to the mission. It kept running while you were here.' : 'Back to the mission.', 'resume', true),
      item('Objectives', () => this.manager.push(new ObjectivesScreen(opts.objectives?.() ?? [])), 'The mission objectives and where each one stands.', 'objectives'),
      // (menu-notes A2, Michael's note 7) one place for controls: Settings > Controls (hold / toggle, sensitivities and
      // Remap controls); the separate Controls item is gone
      item('Settings', () => this.manager.push(new SettingsScreen(app)), 'Controls, gameplay, graphics, audio and accessibility.', 'settings'),
      item('Report feedback', () => this.manager.push(new FeedbackFormScreen(app, null)), 'Write a note about this moment. It is saved with the map and position.', 'report-feedback'),
      item(
        'Quit to menu',
        () =>
          this.manager.push(
            new Dialog('Quit to menu?', 'Progress earned so far in this match is kept.', [
              { label: 'Stay', action: () => {}, safe: true },
              { label: 'Quit', action: () => this.onQuit() },
            ]),
          ),
        'Leave the mission and return to the main menu.',
        'quit',
      ),
    );
    for (const r of pauseExtraRows) list.append(item(r.label, r.act, 'Developer tool.'));
    this.body.append(list);
    this.noticeEl = h('div', { class: 'ps-notice', attrs: { role: 'status' } });
    this.noticeEl.hidden = true;
    this.body.prepend(this.noticeEl);
    if (opts.coop) this.body.append(h('div', { class: 'ms-note dim ps-coop', text: 'The mission keeps running.' }));
    if (opts.notice) this.setNotice(opts.notice);
    // a reconnect clears the line; a key or click does too (MD12)
    this.noticeOff = app.input.events.on('padConnected', () => this.setNotice(''));
    this.el.addEventListener('pointerdown', () => this.setNotice(''));
    document.addEventListener('keydown', this.clearOnKey, { once: true });
  }

  private clearOnKey = (): void => this.setNotice('');

  /** The controller-disconnect line (empty hides it). */
  setNotice(text: string): void {
    this.noticeEl.textContent = text;
    this.noticeEl.hidden = !text;
  }

  /** Closes the menu and resumes (B, Resume, or a dev tool resuming the match from outside). */
  resume(): void {
    this.noticeOff?.();
    document.removeEventListener('keydown', this.clearOnKey);
    this.manager.pop();
    this.onResume();
  }

  /** (MD11) Menu / Start resumes in the pause menu (it is not a Back anywhere else). */
  override onStart(): void {
    this.resume();
  }

  override onBack(): boolean {
    this.resume();
    return true;
  }

  override legend(): LegendItem[] {
    return [
      { act: 'back', label: 'Resume' },
      { act: 'confirm', label: 'Select' },
    ];
  }
}
