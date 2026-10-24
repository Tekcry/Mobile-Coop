/**
 * (mission-framework EN3) The mission objective list HUD (PLAN section 3): the title, the rules line under it, then one
 * row per listed step (`objectiveRows`), done rows ticked, the viewer's current row carrying its hint line only when
 * the hint setting is on. DOM only (no Babylon). `update` is safe to call every frame: it compares a cheap numeric key
 * (`missionHudKey`) and returns before touching the DOM or allocating when nothing changed. Not wired into the game
 * yet (EN2 / a later slice owns that); the course HUD and its drill markers are separate and untouched.
 */
import { h } from '../dom';
import type { MissionDef, TeamId } from '../../game/mission/missionDef';
import type { MissionRunner } from '../../game/mission/missionRunner';
import { objectiveRows, rulesLine } from '../../game/mission/missionText';

const VIEWER_IDX: Readonly<Record<TeamId, number>> = { a: 0, b: 1, all: 2 };

/**
 * A cheap change key for the list: the runner's `version` (bumped on every step open / done and fact change, so it covers
 * the done bits), its section (the list shows one section), the viewer and the hint flag. A number, so a per-frame
 * compare allocates nothing.
 */
export function missionHudKey(runner: MissionRunner, viewer: TeamId, hints: boolean): number {
  return (((runner.version * 64 + (runner.section + 1)) * 2 + (hints ? 1 : 0)) * 4) + VIEWER_IDX[viewer];
}

const STYLE_ID = 'mission-hud-style';
const CSS = `
.mission-hud { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 72px); left: 16px; max-width: min(380px, 44vw); pointer-events: none; font-size: 13px; color: #e8ecef; }
.mission-hud[hidden] { display: none; }
.mission-hud .mh-title { font-weight: 700; letter-spacing: 0.08em; opacity: 0.8; margin-bottom: 2px; }
.mission-hud .mh-rules { opacity: 0.7; margin-bottom: 4px; }
.mission-hud .mh-rules:empty { display: none; }
.mission-hud .mh-list { background: rgba(10, 14, 18, 0.55); border-radius: 6px; padding: 4px 8px; }
.mission-hud .mh-row { display: flex; gap: 8px; padding: 2px 0; white-space: normal; }
.mission-hud .mh-tick { width: 14px; flex: none; text-align: center; opacity: 0.6; }
.mission-hud .mh-row.done .mh-tick { color: #4fdc7c; opacity: 1; }
.mission-hud .mh-row.cur .mh-text { color: #f2c14e; }
.mission-hud .mh-row.opt .mh-text { font-style: italic; }
.mission-hud .mh-hint { margin: 0 0 2px 22px; font-size: 12px; opacity: 0.75; }
`;

export class MissionHud {
  readonly el: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly rulesEl: HTMLElement;
  private readonly listEl: HTMLElement;
  private seenKey = -1;
  private seenRunner: MissionRunner | null = null;

  constructor(root: HTMLElement) {
    if (!document.getElementById(STYLE_ID)) {
      const st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    this.titleEl = h('div', { class: 'mh-title', text: 'Objectives' });
    this.rulesEl = h('div', { class: 'mh-rules' });
    this.listEl = h('div', { class: 'mh-list' });
    this.el = h('div', { class: 'mission-hud' }, this.titleEl, this.rulesEl, this.listEl);
    this.el.hidden = true;
    root.appendChild(this.el);
  }

  /** A mission starts: write the title and the rules line, clear the rows (the next `update` fills them) and show. */
  show(def: MissionDef): void {
    this.titleEl.textContent = 'Objectives';
    this.rulesEl.textContent = rulesLine(def);
    this.listEl.replaceChildren();
    this.seenKey = -1;
    this.seenRunner = null;
    this.el.hidden = false;
  }

  /** Per frame: cheap unless the runner's list, the viewer or the hint flag changed. */
  update(runner: MissionRunner, viewer: TeamId, hints: boolean): void {
    const key = missionHudKey(runner, viewer, hints);
    if (key === this.seenKey && runner === this.seenRunner) return;
    this.seenKey = key;
    this.seenRunner = runner;
    const rows = objectiveRows(runner, viewer, hints);
    const out: HTMLElement[] = [];
    let cur = true;
    for (const r of rows) {
      const isCur = cur && !r.done && !r.optional;
      if (isCur) cur = false;
      const cls = `mh-row${r.done ? ' done' : ''}${isCur ? ' cur' : ''}${r.optional ? ' opt' : ''}`;
      out.push(h('div', { class: cls, attrs: { 'data-step': String(r.step) } }, h('span', { class: 'mh-tick', text: r.done ? '✓' : '·' }), h('span', { class: 'mh-text', text: r.text })));
      if (r.hint !== null) out.push(h('div', { class: 'mh-hint', text: r.hint }));
    }
    this.listEl.replaceChildren(...out);
  }

  hide(): void {
    this.el.hidden = true;
  }

  dispose(): void {
    this.el.remove();
  }
}
