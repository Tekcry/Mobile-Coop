/**
 * The training course's tutorial HUD (T1c, D18, D30, D37): the current bay's drills in teaching order with a tick
 * column per player (a dash where the drill is not that player's), and this player's current step in large type
 * (LANTERN's line; `{Y}` / `{Y:traverse}` tokens become the prompt glyphs, which follow the input mode through CSS).
 * DOM is written only when the bay, the drill ticks or the course's end change. The objective list (R5, D45) is always on
 * screen from spawn: every drill by its explicit name, ticked per player, the current one highlighted, then the
 * airlock (or the finish) as the last row; it never hides. Under it the airlock status (R6): "Waiting for partner", the
 * refusal naming the open objectives, or the cycle.
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

/** An objective's list name: the drill's explicit name with a capital first letter ("Open your locker"). */
export function objectiveName(name: string): string {
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

export class CourseHud {
  readonly el: HTMLElement;
  private bayEl: HTMLElement;
  private table: HTMLElement;
  private stepEl: HTMLElement;
  private airEl: HTMLElement;
  private airText: string | null = null;
  private seenGen = -1;
  private seenBay = -1;
  private seenOver = false;
  private seenMe = -1;

  constructor(parent: HTMLElement) {
    this.bayEl = h('div', { class: 'ch-bay' });
    this.table = h('table');
    this.stepEl = h('div', { class: 'ch-step' });
    this.airEl = h('div', { class: 'ch-air' });
    this.airEl.hidden = true;
    this.el = h('div', { class: 'course-hud' }, this.bayEl, this.table, this.airEl, this.stepEl);
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
    this.bayEl.textContent = `${bay.id} - objectives`;
    const next = st.nextDrill(me);
    const rows: HTMLElement[] = [h('tr', {}, h('td', { class: 'ch-n', text: '' }), h('td', { class: 'ch-t', text: 'P1' }), h('td', { class: 'ch-t', text: 'P2' }))];
    for (const d of bay.drills) {
      const cell = (p: PlayerIdx): HTMLElement => {
        const mine = st.drillIsFor(d, p);
        const done = mine && !st.drillOpenFor(d, p) && (d.who !== 'either' || st.drillTicks(d.id, p) > 0 || st.drillComplete(d));
        return h('td', { class: `ch-t${done ? ' done' : ''}`, text: !mine ? '-' : done ? '✓' : '·', attrs: { 'data-p': String(p + 1) } });
      };
      rows.push(h('tr', { class: d === next ? 'cur' : '', attrs: { 'data-drill': d.id } }, h('td', { class: 'ch-n', text: objectiveName(d.name ?? d.verb) }), cell(0), cell(1)));
    }
    // the last objective: both onto the airlock pad (or the finish), current once this player's drills are done
    const last = bay.exit === 'end' ? 'Finish the course' : `Both onto the ${bay.exit} airlock pad`;
    const lastDone = st.over || st.done[st.bay] === true;
    const lastCell = (p: PlayerIdx): HTMLElement => h('td', { class: `ch-t${lastDone ? ' done' : ''}`, text: lastDone ? '✓' : '·', attrs: { 'data-p': String(p + 1) } });
    rows.push(h('tr', { class: !next && !lastDone ? 'cur' : '', attrs: { 'data-obj': 'exit' } }, h('td', { class: 'ch-n', text: last }), lastCell(0), lastCell(1)));
    this.table.replaceChildren(...rows);
    const text = st.over ? 'Course complete.' : next ? next.text : bay.drills.length ? 'Objectives done. Both of you onto the airlock pad.' : '';
    this.stepEl.innerHTML = stepHtml(text);
  }

  /** The airlock status line (cached string compare: DOM written only on a change). */
  setStatus(text: string | null): void {
    if (text === this.airText) return;
    this.airText = text;
    this.airEl.textContent = text ?? '';
    this.airEl.hidden = text === null;
  }

  setVisible(on: boolean): void {
    this.el.hidden = !on;
  }

  dispose(): void {
    this.el.remove();
  }
}
