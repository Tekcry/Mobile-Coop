import type { App } from '../../core/app';
import type { SessionStats } from '../../game/modes/gameMode';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button } from '../widgets';

const fmtTime = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export class ResultsScreen extends Screen {
  override readonly root = true;

  constructor(
    _app: App,
    stats: SessionStats,
    won: boolean,
    subtitle: string,
    rewards: HTMLElement | null,
    private onRestart: () => void,
    private onQuit: () => void,
  ) {
    super('results-screen');
    const acc = stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) : 0;
    const row = (k: string, v: string | number): HTMLElement => h('div', { class: 'stat' }, h('span', { text: k }), h('b', { text: String(v) }));
    const grid = h(
      'div',
      { class: 'stat-grid' },
      row('Score', stats.score),
      row('Kills', stats.kills),
      row('Headshots', stats.headshots),
      row('Accuracy', `${acc}%`),
      stats.mode === 'wave' ? row('Waves survived', stats.waves) : stats.mode === 'clear' ? null : row('Objectives', stats.objectives),
      row('Time', fmtTime(stats.time)),
      stats.mode === 'clear' || stats.mode === 'infiltration' ? row('Detected', stats.detections) : null,
    );
    // play style (stealth modes): Ghost / Panther / Assault bars
    const st = stats.style;
    const tot = st.ghost + st.panther + st.assault;
    const styleEl =
      (stats.mode === 'clear' || stats.mode === 'infiltration') && tot > 0
        ? h(
            'div',
            { class: 'style-bars' },
            ...(['ghost', 'panther', 'assault'] as const).map((k) =>
              h(
                'div',
                { class: `style-bar ${k}` },
                h('span', { text: k === 'ghost' ? 'Ghost' : k === 'panther' ? 'Panther' : 'Assault' }),
                h('i', { attrs: { style: `--w:${Math.round((st[k] / tot) * 100)}%` } }),
                h('b', { text: `${st[k]}` }),
              ),
            ),
          )
        : null;
    const rating =
      stats.mode === 'infiltration' && stats.rating !== undefined
        ? h('div', { class: 'mission-rating', text: `${'\u2605'.repeat(stats.rating)}${'\u2606'.repeat(3 - stats.rating)}${stats.bonuses?.length ? '  ' + stats.bonuses.join(' / ') : ''}` })
        : null;
    const list = h(
      'div',
      { class: 'menu-list row-dir', attrs: { 'data-wrap': '' } },
      button('Play again', () => this.onRestart(), { icon: 'play', class: 'primary', autofocus: true }),
      button('Main menu', () => this.onQuit(), { icon: 'back' }),
    );
    this.el.append(
      h(
        'div',
        { class: 'results-panel' },
        h('div', { class: `results-title ${won ? 'won' : 'lost'}`, text: won ? 'VICTORY' : 'DEFEAT' }),
        h('div', { class: 'results-sub', text: subtitle }),
        grid,
        rating,
        styleEl,
        rewards,
        list,
      ),
    );
  }

  override onBack(): boolean {
    this.onQuit();
    return true;
  }

  override hints(): Hint[] {
    return [
      { btn: 'A', label: 'Select' },
      { btn: 'B', label: 'Main menu' },
    ];
  }
}
