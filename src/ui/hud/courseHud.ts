/**
 * The training course's tutorial HUD (T1c, D18, D30, D37): the current bay's drills in teaching order with a tick
 * column per player (a dash where the drill is not that player's), and this player's current step in large type
 * (LANTERN's line; `{Y}` / `{Y:traverse}` tokens become the prompt glyphs, which follow the input mode through CSS).
 * DOM is written only when the bay, the drill ticks or the course's end change.
 */
import { h } from '../dom';
import { keyLabels, promptHtml, type PromptButton } from '../prompts';
import type { CourseState } from '../../game/course/courseState';
import type { PlayerIdx } from '../../game/course/courseDef';

const BUTTONS: readonly string[] = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'LS', 'START'];
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'));

/** A step text with `{BTN}` / `{BTN:keyLabel}` glyph tokens as HTML (the rest escaped). */
export function stepHtml(text: string): string {
  return esc(text).replace(/\{([A-Z]+)(?::(\w+))?\}/g, (all, btn: string, key?: string) => {
    if (!BUTTONS.includes(btn)) return all;
    const k = key ? (keyLabels as Record<string, string>)[key] : undefined;
    return promptHtml(btn as PromptButton, k);
  });
}

export class CourseHud {
  readonly el: HTMLElement;
  private bayEl: HTMLElement;
  private table: HTMLElement;
  private stepEl: HTMLElement;
  private seenGen = -1;
  private seenBay = -1;
  private seenOver = false;
  private seenMe = -1;

  constructor(parent: HTMLElement) {
    this.bayEl = h('div', { class: 'ch-bay' });
    this.table = h('table');
    this.stepEl = h('div', { class: 'ch-step' });
    this.el = h('div', { class: 'course-hud' }, this.bayEl, this.table, this.stepEl);
    parent.appendChild(this.el);
  }

  /** Per frame: cheap unless the course changed. */
  update(st: CourseState, me: PlayerIdx): void {
    if (st.gen === this.seenGen && st.bay === this.seenBay && st.over === this.seenOver && me === this.seenMe) return;
    this.seenGen = st.gen;
    this.seenBay = st.bay;
    this.seenOver = st.over;
    this.seenMe = me;
    const bay = st.currentBay;
    this.bayEl.textContent = `${bay.id} - drills`;
    const next = st.nextDrill(me);
    const rows: HTMLElement[] = [h('tr', {}, h('td', { class: 'ch-n', text: '' }), h('td', { class: 'ch-t', text: 'P1' }), h('td', { class: 'ch-t', text: 'P2' }))];
    for (const d of bay.drills) {
      const cell = (p: PlayerIdx): HTMLElement => {
        const mine = st.drillIsFor(d, p);
        const done = mine && !st.drillOpenFor(d, p) && (d.who !== 'either' || st.drillTicks(d.id, p) > 0 || st.drillComplete(d));
        return h('td', { class: `ch-t${done ? ' done' : ''}`, text: !mine ? '-' : done ? '✓' : '·', attrs: { 'data-p': String(p + 1) } });
      };
      rows.push(h('tr', { class: d === next ? 'cur' : '', attrs: { 'data-drill': d.id } }, h('td', { class: 'ch-n', text: d.name ?? d.verb }), cell(0), cell(1)));
    }
    this.table.replaceChildren(...rows);
    this.table.hidden = bay.drills.length === 0;
    const text = st.over ? 'Course complete.' : next ? next.text : bay.drills.length ? 'Drills done. Into the airlock, both of you.' : '';
    this.stepEl.innerHTML = stepHtml(text);
  }

  setVisible(on: boolean): void {
    this.el.hidden = !on;
  }

  dispose(): void {
    this.el.remove();
  }
}
