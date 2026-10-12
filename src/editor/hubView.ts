/**
 * The level editor's hub on screen (ED3-2): a full-screen pause-style overlay with tabs (Menu on the pad, H on the
 * keyboard opens it on Help). Rows and words come from hub.ts; this file draws them and runs them. While it is open,
 * nothing else reads the pad.
 */
import type { PadStyle } from '../input/gamepadMapping';
import { fmt } from './geometry';
import { changeSetting, controllerLabels, HUB_TABS, hubRows, PICTURE_BUTTONS, stepLayout, stepTab } from './hub';
import type { HubInput, HubRow, HubTab } from './hub';
import type { Editor } from './main';
import { PAD } from './pad';
import type { PadState } from './pad';
import type { PadControl } from './padControl';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Left / right on a panel field: a number by one grid step, a slider by its step, a list by one entry. */
export function stepField(f: HTMLElement, step: number, grid: number, fine: boolean): void {
  if (!step) return;
  if (f instanceof HTMLInputElement && f.type === 'number') {
    f.value = String(+(Number(f.value) + step * grid).toFixed(3));
    f.dispatchEvent(new Event('change'));
  } else if (f instanceof HTMLInputElement && f.type === 'range') {
    f.value = String(+(Number(f.value) + step * Number(f.step || 1) * (fine ? 1 : 2)).toFixed(3));
    f.dispatchEvent(new Event('input'));
  } else if (f instanceof HTMLSelectElement) {
    f.selectedIndex = (f.selectedIndex + step + f.options.length) % f.options.length;
    f.dispatchEvent(new Event('change'));
  }
}

/** Marks one field of a list as the pad's focus and scrolls it into view. */
export function focusField(fields: readonly HTMLElement[], i: number, root: HTMLElement): void {
  const f = fields[i];
  for (const x of root.querySelectorAll('.padfocus')) if (x !== f) x.classList.remove('padfocus');
  if (f && !f.classList.contains('padfocus')) {
    f.classList.add('padfocus');
    f.scrollIntoView({ block: 'nearest' });
  }
}

/** Button spots on the help picture (viewBox 1500 x 640; the outline is centred on x 750). */
const SPOTS: Record<string, [number, number]> = {
  LT: [640, 62], LB: [652, 108], RT: [860, 62], RB: [848, 108],
  LS: [650, 215], L3: [650, 215], RS: [800, 300], R3: [800, 300],
  'D-pad up': [700, 276], 'D-pad down': [700, 324], 'D-pad left': [676, 300], 'D-pad right': [724, 300],
  View: [715, 196], Menu: [785, 196], Y: [850, 172], X: [820, 202], B: [880, 202], A: [850, 232],
};

/** Words cut into at most two lines of about `n` characters. */
function twoLines(s: string, n: number): string[] {
  if (s.length <= n) return [s];
  const cut = s.lastIndexOf(' ', n);
  const a = s.slice(0, cut > 0 ? cut : n);
  const rest = s.slice(a.length).trim();
  return [a, rest.length > n ? `${rest.slice(0, n - 3)}...` : rest];
}

/** The controller picture: an outline with every button labelled with its building-state words. */
export function controllerSvg(style: PadStyle): string {
  const labels = controllerLabels(style);
  const out: string[] = [
    '<path d="M640 120 Q750 100 860 120 Q920 130 940 220 L980 420 Q990 480 940 490 Q900 495 870 440 L830 380 L670 380 L630 440 Q600 495 560 490 Q510 480 520 420 L560 220 Q580 130 640 120 Z" fill="#2a2f36" stroke="#9aa4b1" stroke-width="4"/>',
    '<circle cx="650" cy="215" r="26" fill="#1b1f24" stroke="#9aa4b1" stroke-width="3"/><circle cx="800" cy="300" r="26" fill="#1b1f24" stroke="#9aa4b1" stroke-width="3"/>',
    '<path d="M688 264h24v24h24v24h-24v24h-24v-24h-24v-24h24z" fill="#1b1f24" stroke="#9aa4b1" stroke-width="3"/>',
  ];
  for (const b of ['Y', 'X', 'B', 'A']) {
    const [x, y] = SPOTS[b]!;
    out.push(`<circle cx="${x}" cy="${y}" r="15" fill="#1b1f24" stroke="#9aa4b1" stroke-width="3"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="17" fill="#fff">${esc(labels.find((l) => l.button === b)?.name ?? b)}</text>`);
  }
  const rows = (side: readonly string[], left: boolean): void => {
    side.forEach((button, i) => {
      const l = labels.find((q) => q.button === button);
      if (!l) return;
      const y = 40 + i * 66;
      const [bx, by] = SPOTS[button]!;
      const tx = left ? 490 : 1010;
      const anchor = left ? 'end' : 'start';
      const lines = twoLines(l.words || '(not used while building)', 46);
      out.push(`<line x1="${left ? 498 : 1002}" y1="${y + 8}" x2="${bx}" y2="${by}" stroke="#5f6b7a" stroke-width="2"/><circle cx="${bx}" cy="${by}" r="5" fill="#ffd166"/>`);
      out.push(`<text x="${tx}" y="${y}" text-anchor="${anchor}" font-size="20" fill="#ffd166" font-weight="700">${esc(l.name)}</text>`);
      lines.forEach((t, k) => out.push(`<text x="${tx}" y="${y + 22 + k * 21}" text-anchor="${anchor}" font-size="19" fill="#e6e6e6">${esc(t)}</text>`));
    });
  };
  rows(PICTURE_BUTTONS.left, true);
  rows(PICTURE_BUTTONS.right, false);
  return `<svg id="padPicture" viewBox="0 0 1500 640" role="img" aria-label="Controller buttons">${out.join('')}</svg>`;
}

export class HubView {
  tab: HubTab = 'Play';
  private index = 0;
  /** The last problem line gone to (Checks, "Next problem"). */
  private lastProblem = -1;
  private rows: HubRow[] = [];

  constructor(
    private readonly ed: Editor,
    private readonly pad: PadControl,
  ) {
    const el = $('hub');
    el.addEventListener('click', (e) => {
      const t = e.target as Element;
      const tab = t.closest('[data-tab]')?.getAttribute('data-tab') as HubTab | null;
      if (tab) return this.setTab(tab);
      const row = t.closest('[data-row]');
      if (row) {
        this.index = this.fields().indexOf(row as HTMLElement);
        void this.runRow(row.getAttribute('data-row')!, 1, true);
      }
    });
  }

  get isOpen(): boolean {
    return !$('hub').classList.contains('hidden');
  }

  open(tab?: HubTab): void {
    const ed = this.ed;
    if (ed.drag) ed.endDrag(true);
    this.pad.closeMenu();
    if (tab) this.tab = tab;
    this.index = 0;
    $('hub').classList.remove('hidden');
    this.render();
    ed.updateHint();
  }

  close(): void {
    $('hub').classList.add('hidden');
    this.pad.latchSticks();
    this.ed.updateHint();
  }

  toggle(tab: HubTab): void {
    if (this.isOpen && this.tab === tab) this.close();
    else this.open(tab);
  }

  setTab(t: HubTab): void {
    this.tab = t;
    this.index = 0;
    this.render();
  }

  private input(): HubInput {
    const ed = this.ed;
    const levels = ed.model.data.levels.slice().sort((a, b) => b.floor - a.floor);
    return {
      unsaved: ed.model.dirty,
      changes: ed.model.history.map((e) => e.text).reverse(),
      problems: ed.problemLines(),
      levels: levels.map((l) => ({ id: l.id, name: l.name, floor: fmt(l.floor), editing: l.id === ed.view.level })),
      layout: ed.prefs.layout,
      labels: !$('planSvg').classList.contains('nolabels'),
      minimap: ed.prefs.minimap,
      underlay: ed.view.vis.underlay,
      settings: this.pad.settings,
    };
  }

  /** Redraws the open hub (after any change it makes). */
  render(): void {
    if (!this.isOpen) return;
    const style = this.pad.style;
    this.rows = hubRows(this.tab, this.input());
    const tabs = HUB_TABS.map((t) => `<button data-tab="${t}" class="${t === this.tab ? 'on' : ''}">${t}</button>`).join('');
    const rows = this.rows
      .map((r) => `<div class="hub-row ${r.kind}${r.disabled ? ' off' : ''}${r.fresh ? ' bad' : ''}" data-row="${esc(r.id)}"><span>${esc(r.text)}</span>${r.value ? `<b>${esc(r.value)}</b>` : ''}${r.note ? `<small>${esc(r.note)}</small>` : ''}</div>`)
      .join('');
    let extra = '';
    if (this.tab === 'Help') extra = controllerSvg(style) + this.ed.helpTableHtml();
    else if (this.tab === 'Levels') extra = '<h4>Levels shown</h4><div id="hubPanel"></div>';
    else if (this.tab === 'File' && !this.ed.model.history.length) extra = '<p class="dim">No changes to undo.</p>';
    else if (this.tab === 'Checks' && !this.ed.lastChecks) extra = '<p class="dim">Running the checks...</p>';
    const keys = this.pad.device === 'pad' ? 'LB / RB change tabs, D-pad picks, left / right changes, A does it, B closes' : 'Click a tab or a row; Esc or H closes';
    $('hub').innerHTML = `<div id="hubInner"><div class="hub-tabs">${tabs}</div><div class="dim hub-keys">${keys}</div><div class="hub-body">${rows}${extra}</div></div>`;
    const panel = document.getElementById('hubPanel');
    if (panel) this.pad.renderPanel(panel);
    const fs = this.fields();
    this.index = Math.min(this.index, Math.max(0, fs.length - 1));
    if (this.pad.device === 'pad') focusField(fs, this.index, $('hub'));
  }

  private fields(): HTMLElement[] {
    return [...$('hub').querySelectorAll<HTMLElement>('[data-row], .hub-body [data-k], .hub-body button[data-pv]')];
  }

  /** One pad frame while the hub is open. */
  frame(st: PadState): void {
    if (st.pressed(PAD.B) || st.pressed(PAD.START)) return this.close();
    if (st.pressed(PAD.LB)) return this.setTab(stepTab(this.tab, -1));
    if (st.pressed(PAD.RB)) return this.setTab(stepTab(this.tab, 1));
    const fs = this.fields();
    if (!fs.length) return;
    if (st.repeat(PAD.DOWN)) this.index = (this.index + 1) % fs.length;
    if (st.repeat(PAD.UP)) this.index = (this.index - 1 + fs.length) % fs.length;
    this.index = Math.min(this.index, fs.length - 1);
    focusField(fs, this.index, $('hub'));
    const f = fs[this.index]!;
    const step = st.repeat(PAD.RIGHT) ? 1 : st.repeat(PAD.LEFT) ? -1 : 0;
    const row = f.dataset.row;
    if (row) {
      if (step && this.rows.find((r) => r.id === row)?.kind === 'step') void this.runRow(row, step as 1 | -1, false);
      else if (st.pressed(PAD.A)) void this.runRow(row, 1, true);
      return;
    }
    stepField(f, step, this.ed.grid, st.down(PAD.LB));
    if (st.pressed(PAD.A) && (f instanceof HTMLButtonElement || (f instanceof HTMLInputElement && f.type === 'checkbox'))) f.click();
  }

  /** Runs a row: A (or a click) does it; left / right steps a value. */
  async runRow(id: string, dir: 1 | -1, press: boolean): Promise<void> {
    const ed = this.ed;
    const pad = this.pad;
    const r = this.rows.find((q) => q.id === id);
    if (!r || r.disabled) return;
    if (id === 'play.quick') {
      this.close();
      return ed.quickWalk();
    }
    if (id === 'play.walk') {
      this.close();
      return ed.gameWalk();
    }
    if (id === 'file.save') await ed.save();
    else if (id === 'file.revert') await ed.revert();
    else if (id.startsWith('undo.') && press) {
      const n = Number(id.slice(5)) + 1;
      if (await ed.ask(`Undo back to here? That undoes ${n} change${n === 1 ? '' : 's'}: "${r.text}"${n > 1 ? ' and the newer ones' : ''}.`, 'Undo', 'Keep')) for (let i = 0; i < n; i++) ed.undo();
    } else if (id === 'checks.next' || id.startsWith('prob.')) {
      const ps = ed.problemLines();
      const i = id === 'checks.next' ? (this.lastProblem + 1) % ps.length : Number(id.slice(5));
      const p = ps[i];
      if (!p) return;
      this.lastProblem = i;
      this.close();
      return pad.goToProblem(p.text);
    } else if (id.startsWith('level.')) ed.setLevel(id.slice(6));
    else if (id === 'view.layout') ed.setLayout(stepLayout(ed.prefs.layout, dir));
    else if (id === 'view.labels') $('planSvg').classList.toggle('nolabels');
    else if (id === 'view.minimap') ed.run('minimap');
    else if (id === 'view.underlay') {
      ed.view.vis.underlay = !ed.view.vis.underlay;
      ed.applyVis();
    } else if (id.startsWith('set.')) {
      pad.settings = changeSetting(pad.settings, id, dir);
      pad.applySettings();
      pad.savePrefs();
      if (id === 'set.rumble') pad.rumble('drop');
    }
    this.render();
  }
}
