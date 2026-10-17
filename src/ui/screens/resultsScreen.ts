import type { App } from '../../core/app';
import type { SessionStats } from '../../game/modes/gameMode';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button } from '../widgets';
import { fmtCourseTime, TIER_LABEL, type CourseSummary } from '../../game/course/courseRating';

/** The course panel (T1c, D31 / D32 / D23): per-bay times, team and per-player numbers, the finale's tier. */
function coursePanel(c: CourseSummary): HTMLElement {
  const cell = (t: string | number, tag: 'td' | 'th' = 'td'): HTMLElement => h(tag, { text: String(t) });
  const keys = [
    ['Detections', 'detections'],
    ['Alarms', 'alarms'],
    ['Knock-outs', 'knockouts'],
    ['Kills', 'kills'],
    ['Revives', 'revives'],
    ['Team moves', 'teamMoves'],
  ] as const;
  const table = h(
    'table',
    { class: 'course-stats' },
    h('tr', {}, cell('', 'th'), cell('Team', 'th'), cell('P1', 'th'), cell('P2', 'th')),
    h('tr', {}, cell('Time'), cell(fmtCourseTime(c.team.time)), cell(''), cell('')),
    ...keys.map(([label, k]) => h('tr', {}, cell(label), cell(c.team[k]), cell(c.players[0][k]), cell(c.players[1][k]))),
  );
  const bays = h('div', { class: 'course-bays' }, ...c.bays.map((b) => h('span', { text: `${b.id} ${fmtCourseTime(b.time)}` })));
  const finale = c.finale
    ? h('div', { class: `course-tier tier-${c.finale.tier}`, text: `${c.finale.bay}: ${TIER_LABEL[c.finale.tier]} (${c.finale.points}, ${fmtCourseTime(c.finale.time)})` })
    : null;
  return h('div', { class: 'course-panel' }, h('div', { class: 'course-note', text: 'No penalty in the drill bays.' }), finale, bays, table);
}

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
    const pvp = stats.mode === 'tdm' || stats.mode === 'ffa';
    const grid = pvp
      ? h('div', { class: 'stat-grid' }, row('Eliminations', stats.kills), row('Deaths', stats.deaths ?? 0), row('Headshots', stats.headshots), row('Accuracy', `${acc}%`), row('Time', fmtTime(stats.time)))
      : h(
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
    const rating =
      stats.mode === 'infiltration' && stats.rating !== undefined
        ? h('div', { class: 'mission-rating', text: `${'\u2605'.repeat(stats.rating)}${'\u2606'.repeat(3 - stats.rating)}${stats.bonuses?.length ? '  ' + stats.bonuses.join(' / ') : ''}` })
        : null;
    const course = stats.course ? coursePanel(stats.course) : null;
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
        course ?? grid,
        rating,
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
