import type { App } from '../../core/app';
import type { SessionStats } from '../../game/modes/gameMode';
import { h } from '../dom';
import { MenuScreen, type LegendItem } from '../menuScreen';
import { button } from '../widgets';
import { sectionLine, type RatingView } from '../hud/ratingCard';
import { fmtCourseTime, TIER_LABEL, type CourseSummary } from '../../game/course/courseRating';
import { campaignHeadline, continuedLine, type CampaignResultView } from '../../game/mission/campaignRating';

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

/** What the results screen can do beyond Retry / Main menu (menu-ui step 10). */
export interface ResultsNav {
  /** The kit the operator carried (weapons and gadget names). */
  kit?: string;
  /** Co-op: Play again returns to the lobby. */
  coop?: boolean;
  /** Section ratings of the op / course, one line each (section-rating S4). */
  ratings?: readonly RatingView[];
  /** (campaign-mode CM6, bible 5.8 "Results") A campaign mission's end: the percent, PERFECT at 100, each category row;
   *  its Next goes to the lobby (`onRestart`: co-op's way back to the room, where the next entry is picked). */
  campaign?: CampaignResultView;
}

/**
 * MISSION / RESULTS on the MenuScreen template (menu-ui step 10, SPEC 7.21): the outcome, the time, the kit used and
 * the stat rows on the right; Next (a campaign mission's) / Retry / Main menu on the left. Kept for the suites:
 * `.results-title`, `.stat-grid`, `.mission-rating`, `.course-panel`, "Play again".
 */
export class ResultsScreen extends MenuScreen {
  override readonly root = true;

  constructor(
    _app: App,
    stats: SessionStats,
    won: boolean,
    subtitle: string,
    private onRestart: () => void,
    private onQuit: () => void,
    nav: ResultsNav = {},
  ) {
    super('results-screen', ['Mission', 'Results']);
    const acc = stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) : 0;
    const row = (k: string, v: string | number): HTMLElement => h('div', { class: 'stat' }, h('span', { text: k }), h('b', { text: String(v) }));
    const grid = h(
      'div',
      { class: 'stat-grid' },
      row('Score', stats.score),
      row('Kills', stats.kills),
      row('Headshots', stats.headshots),
      row('Accuracy', `${acc}%`),
      row('Objectives', stats.objectives),
      row('Time', fmtTime(stats.time)),
    );
    const course = stats.course ? coursePanel(stats.course) : null;
    // (campaign-mode CM6) the campaign panel: the percent under the title, the category rows in the stats panel
    const camp = won ? nav.campaign : undefined;
    const campRows = camp ? h('div', { class: 'stat-grid campaign-rows' }, ...camp.rows.map((r) => row(r.label, r.value))) : null;
    const cont = camp ? continuedLine(camp) : null;
    this.el.classList.add(won ? 'rs-won' : 'rs-lost');
    this.ctx.hidden = true;
    this.body.append(
      h(
        'div',
        { class: 'rs-panel' },
        h('div', { class: `results-title ${won ? 'won' : 'lost'}`, text: camp ? 'MISSION COMPLETE' : won ? 'VICTORY' : 'DEFEAT' }),
        h('div', { class: 'results-sub', text: camp ? camp.title : subtitle }),
        camp ? h('div', { class: `mission-rating campaign-pct${camp.perfect ? ' perfect' : ''}`, text: campaignHeadline(camp) }) : null,
        cont ? h('div', { class: 'rs-kit rs-continued', text: cont }) : null,
        h('div', { class: 'rs-time', text: `Time ${fmtTime(stats.time)}` }),
        nav.ratings?.length ? h('ul', { class: 'rs-sections' }, ...nav.ratings.map((r) => h('li', { text: sectionLine(r) }))) : null,
        nav.kit ? h('div', { class: 'rs-kit', text: `Kit: ${nav.kit}` }) : null,
      ),
    );
    const list = h('div', { class: 'ms-list rs-list', attrs: { 'data-wrap': '' } });
    const item = (label: string, key: string, act: () => void, focus: boolean): void => {
      list.append(button(label, act, { class: 'ms-item', key, autofocus: focus }));
    };
    // (campaign-mode CM6) a campaign mission's Next goes to the lobby (the next entry is picked there)
    if (camp) item('Next', 'next', () => this.onRestart(), true);
    else item(nav.coop ? 'Play again' : 'Retry', 'retry', () => this.onRestart(), true);
    item('Main menu', 'quit', () => this.onQuit(), false);
    this.body.append(list);
    this.el.append(h('div', { class: 'rs-stats' }, course ?? campRows ?? grid));
  }

  override onBack(): boolean {
    this.onQuit();
    return true;
  }

  override legend(): LegendItem[] {
    return [
      { act: 'back', label: 'Main menu' },
      { act: 'confirm', label: 'Select' },
    ];
  }
}
