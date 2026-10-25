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
import { bayObjective, timerLabel, type GateDef, type PlayerIdx } from '../../game/course/courseDef';

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

const ROOM_WORDS: readonly string[] = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'];

/** (marlow-objective-place) The bay's closing place in words, never its code: "holding room two", or the cash dock for the finish. Other maps on this HUD keep their airlock pad. */
export function exitPlace(exit: string): string {
  const n = /^L(\d)$/.exec(exit);
  const word = n ? ROOM_WORDS[Number(n[1]) - 1] : undefined;
  if (word) return `holding room ${word}`;
  return exit === 'end' ? 'the cash dock' : `the ${exit} airlock pad`;
}

/** The closing line when the bay has none of its own: both players, into the holding room (or out to the cash dock). */
export function exitLine(exit: string): string {
  return exit === 'end' ? 'Both of you out to the cash dock.' : `Both of you into ${exitPlace(exit)}.`;
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
  /** The step timer's whole seconds last written (0: none). */
  private seenSecs = 0;

  constructor(parent: HTMLElement) {
    this.bayEl = h('div', { class: 'ch-bay' });
    this.table = h('table');
    this.stepEl = h('div', { class: 'ch-step' });
    this.airEl = h('div', { class: 'ch-air' });
    this.airEl.hidden = true;
    this.el = h('div', { class: 'course-hud' }, this.bayEl, this.table, this.airEl, this.stepEl);
    parent.appendChild(this.el);
  }

  /**
   * Per frame: cheap unless the course changed. (marlow-final N1) The bay's objective steps follow its drills in the
   * table (the shared line, ticked for both once done); the step line shows this player's line for the current step (the
   * A or B line by their job, `CourseState.stepLine`) and, while the step's timed gate runs, its seconds left.
   */
  update(st: CourseState, me: PlayerIdx): void {
    const step = st.over || st.nextDrill(me) ? null : st.currentStep();
    const secs = step ? Math.ceil(st.stepTimer(step) - 1e-6) : 0;
    if (st.gen === this.seenGen && st.bay === this.seenBay && st.over === this.seenOver && me === this.seenMe) {
      if (secs !== this.seenSecs) this.writeStep(st, me);
      return;
    }
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
    // (N1) the steps with a done condition, in route order (the bay's last line stays the exit row below)
    for (const o of st.stepsOf()) {
      if (o.done === undefined) continue;
      const done = st.stepDone(o);
      const cell = (p: PlayerIdx): HTMLElement => h('td', { class: `ch-t${done ? ' done' : ''}`, text: done ? '✓' : '·', attrs: { 'data-p': String(p + 1) } });
      rows.push(h('tr', { class: o === step ? 'cur' : '', attrs: { 'data-step': o.id } }, h('td', { class: 'ch-n', text: o.text }), cell(0), cell(1)));
    }
    // the last objective: the bay's closing line (both into the holding room, or out to the cash dock), current once this player's drills are done
    const last = bayObjective(st.def, bay.id) ?? exitLine(bay.exit);
    const lastDone = st.over || st.done[st.bay] === true;
    const lastCell = (p: PlayerIdx): HTMLElement => h('td', { class: `ch-t${lastDone ? ' done' : ''}`, text: lastDone ? '✓' : '·', attrs: { 'data-p': String(p + 1) } });
    rows.push(h('tr', { class: !next && !step && !lastDone ? 'cur' : '', attrs: { 'data-obj': 'exit' } }, h('td', { class: 'ch-n', text: last }), lastCell(0), lastCell(1)));
    this.table.replaceChildren(...rows);
    this.writeStep(st, me);
  }

  /** The step line (written on a change of the course or of the timer's whole seconds). */
  private writeStep(st: CourseState, me: PlayerIdx): void {
    const bay = st.currentBay;
    const next = st.over ? null : st.nextDrill(me);
    const step = st.over || next ? null : st.currentStep();
    const secs = step ? Math.ceil(st.stepTimer(step) - 1e-6) : 0;
    this.seenSecs = secs;
    let text: string;
    if (st.over) text = 'Course complete.';
    else if (next) text = next.text;
    else if (step) {
      text = st.stepLine(step, me);
      if (secs > 0) text += ` - ${timerLabel(step.timer !== undefined ? this.gateOf(st, step.timer) : undefined)} ${secs} s`;
    } else if (bay.drills.length) text = `Objectives done. ${exitLine(bay.exit)}`;
    // (course-ready F1) the bay's last line (its step without a done condition), or the airlock once its steps are done
    else text = bayObjective(st.def, bay.id) ?? (st.stepsOf().length ? exitLine(bay.exit) : '');
    this.stepEl.innerHTML = stepHtml(text);
  }

  private gateOf(st: CourseState, id: string): GateDef | undefined {
    const bays = st.def.bays;
    for (let i = 0; i < bays.length; i++) {
      const gates = bays[i]!.gates;
      for (let j = 0; j < gates.length; j++) if (gates[j]!.id === id) return gates[j];
    }
    return undefined;
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
