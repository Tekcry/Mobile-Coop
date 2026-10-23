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
  /** (marlow-bays A1) Solo or the co-op host (default true); false: the co-op client, whose host-only rows are disabled. */
  host?: boolean;
  /** (marlow-bays item 3) "Restart at checkpoint" (Sector Ops, the course); absent: no row. Returns false when the mode
   *  cannot restart now. */
  restartCheckpoint?: () => boolean;
  /** (marlow-bays item 4) Co-op: "Return to lobby", ending the match for every connected player. */
  lobby?: () => void;
  /** (marlow-bays R1) Co-op: the room code (the main menu offers it again if either player drops). */
  roomCode?: string;
}

/** (marlow-bays A1) The line a co-op client sees on a host-only row. */
export const HOST_ONLY = 'Host only';

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
    );
    // (marlow-bays items 3-4, A1-A2) host actions: a confirm opening on Stay; the co-op client sees them disabled
    const host = opts.host ?? true;
    const hostItem = (label: string, key: string, desc: string, title: string, msg: string, go: string, act: () => void): HTMLButtonElement => {
      if (!host) {
        const b = button(label, () => {}, { class: 'ms-item host-only', key, sub: HOST_ONLY, blocked: HOST_ONLY, desc: `${desc} Only the host can do this.` });
        b.setAttribute('aria-disabled', 'true');
        return b;
      }
      return item(
        label,
        () =>
          this.manager.push(
            new Dialog(title, msg, [
              { label: 'Stay', action: () => {}, safe: true },
              { label: go, action: act },
            ]),
          ),
        desc,
        key,
      );
    };
    const restart = opts.restartCheckpoint;
    if (restart) {
      list.append(
        hostItem(
          'Restart at checkpoint',
          'restart-checkpoint',
          opts.coop ? 'Both players go back to the last checkpoint and the area starts again.' : 'Back to the last checkpoint; the area starts again.',
          'Restart at checkpoint?',
          opts.coop ? 'Both players go back to the last checkpoint. Progress since it is lost.' : 'Progress since the last checkpoint is lost.',
          'Restart',
          () => {
            this.resume();
            restart();
          },
        ),
      );
    }
    if (opts.lobby) {
      const lobby = opts.lobby;
      list.append(
        hostItem(
          'Return to lobby',
          'return-lobby',
          'End the match and take every connected player back to the room lobby.',
          'Return to lobby?',
          'The match ends for both players. Everyone returns to the room lobby.',
          'Return',
          () => lobby(),
        ),
      );
    }
    list.append(
      item('Settings', () => this.manager.push(new SettingsScreen(app)), 'Controls, gameplay, graphics, audio and accessibility.', 'settings'),
      item('Report feedback', () => this.manager.push(new FeedbackFormScreen(app, null)), 'Write a note about this moment. It is saved with the map and position.', 'report-feedback'),
      // (anim-tuner pass 2-3) the animation tuner without F3 (pad, phone): opens the panel and resumes, so you can move and
      // tune; before Quit, so Up from Resume still wraps to Quit
      item(
        'Animation tuner (dev)',
        () => {
          app.debug.animTune.show();
          this.resume();
        },
        'Developer tool: sliders for the animation, live while you move. Opens over the game; close it with its x.',
        'anim-tuner',
      ),
    );
    list.append(
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
    // (marlow-bays R1) the room code for a rejoin (Main menu > Rejoin / Resume hosting, or Co-op > Join with code)
    if (opts.roomCode) this.body.append(h('div', { class: 'ms-note ps-room', text: `Room ${opts.roomCode}. If either player drops, rejoin from the main menu with this code.` }));
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
