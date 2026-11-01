import { CHAMBER } from '../anim/chamber';
import { KEY_FIELDS, KEY_FIELD_INDEX } from '../anim/tuneKeysFile';
import { KEY_CLIPS } from '../anim/tuneKeysMeta';
import { tuneKeysApply, tuneKeysDiff, tuneKeysLoadFile, tuneKeysPose, tuneKeysSmooth, tuneKeysToolKeys, tuneKeysWave, type KeyToolKey } from '../anim/tuneKeys';
import { keyDiffLine, keyWaveValue, type KeyDiffField } from '../anim/tuneKeysTools';
import { tuneGet } from '../anim/tuneRegistry';
import type { PanelKit } from './tuneSnapshots';

/** The panel's control makers plus a drop-down refresh (its button shows the choice). */
export interface KeyToolsKit extends PanelKit {
  refresh(sel: HTMLSelectElement): void;
}

/** What the key tools need of the panel. */
export interface KeyToolsApi {
  /** The clip and key id the Keys tab shows (the chamber's key when it stands on one), or null. */
  shown(): [string, number] | null;
  /** The Keys slider selected in the list ('' none). */
  selField(): string;
  /** A plain name of a key field. */
  fieldName(id: string): string;
  info(text: string): void;
  /** Close the open run of changes as one undo step (before and after a tool). */
  settle(): void;
  /** The slider rows show the new values. */
  rebuild(): void;
  /** The chamber paused on key `k` of `clip` (the compare ghost's one visit). */
  showKey(clip: string, k: number): void;
  /** The compare ghost is recorded for the compared key. */
  ghostReady(): boolean;
  frozen(): boolean;
}

type Tool = 'wave' | 'apply' | 'smooth';
const TOOLS: readonly [Tool, string][] = [
  ['wave', 'Wave'],
  ['apply', 'Apply to keys'],
  ['smooth', 'Smooth between'],
];
/** The compare ghost's visit gives up after this many ticks (100 ms each). */
const PRIME_TICKS = 15;

/**
 * (marlow-bays item 30, track A) The Keys tab's key tools (Michael: "I was adjusting the body to twist realistically
 * while running but I had to adjust each key manually"). A "Key tools" fold under the key buttons holds the edit tools,
 * one shown at a time:
 * - Wave: a channel (any key slider, by its plain name; the selected slider by default), an amount and a timing (a share
 *   of the cycle); "Fill keys" sets that slider on every key to amount x sin(cycle + timing) (Mirror on: the mirrored
 *   half follows the mirror rule).
 * - Apply to keys: the selected slider's value on this key given to the ticked keys ("All" / "None").
 * - Smooth between: two keys; the keys between them eased from one pose to the other, every slider or the selected one.
 * The Compare row is always shown: "Compare" (off by default) draws a light ghost of the previous (or a picked) key over
 * her in the chamber and a one-line values diff. Each tool is one undo step and bakes through the key sliders. Pad, keys
 * and touch reach every control (`data-pad`); the panel calls `frame` every 100 ms with the Keys tab open.
 */
export class TunerKeyTools {
  readonly el: HTMLDivElement;
  private readonly fold: HTMLButtonElement;
  private readonly body: HTMLDivElement;
  private readonly toolSel: HTMLSelectElement;
  private readonly panes = new Map<Tool, HTMLDivElement>();
  // wave
  private readonly chanSel: HTMLSelectElement;
  private readonly ampRange: HTMLInputElement;
  private readonly ampNum: HTMLInputElement;
  private readonly timRange: HTMLInputElement;
  private readonly timNum: HTMLInputElement;
  private readonly waveNote: HTMLDivElement;
  // apply
  private readonly applyNote: HTMLDivElement;
  private readonly ticks: HTMLDivElement;
  private tickSig = '';
  // smooth
  private readonly fromSel: HTMLSelectElement;
  private readonly toSel: HTMLSelectElement;
  private readonly fieldsSel: HTMLSelectElement;
  private readonly smoothNote: HTMLDivElement;
  private keySig = '';
  // compare
  private readonly cmpBox: HTMLInputElement;
  private readonly cmpSel: HTMLSelectElement;
  private readonly cmpLine: HTMLDivElement;
  private cmpSig = '';
  private cmpPose = '';
  private prime: { clip: string; back: number; to: number; ticks: number } | null = null;
  private primed = '';
  private lastSel = '';
  private clip = '';
  private keys: KeyToolKey[] = [];
  private readonly diffFields: KeyDiffField[];
  private readonly poseBuf = new Float64Array(KEY_FIELDS.length);

  constructor(
    private readonly kit: KeyToolsKit,
    private readonly api: KeyToolsApi,
  ) {
    const el = (this.el = document.createElement('div'));
    el.className = 'anim-tune-keytools';
    this.diffFields = KEY_FIELDS.map((f) => ({ name: api.fieldName(f.id), unit: f.unit }));
    // the compare row (always shown)
    const cb = kit.bar();
    cb.classList.add('anim-tune-kt-cmpbar');
    this.cmpBox = kit.check(cb, 'Compare', false, (v) => this.setCompare(v), 'kt:cmp', 'anim-tune-kt-cmp');
    this.cmpBox.title = 'A light ghost of another key over her (the chamber), and how this key differs from it';
    this.cmpSel = kit.sel(cb, 'with', ['prev'], () => this.cmpChanged(), 'kt:cmpkey', 'anim-tune-kt-cmpkey');
    const cl = (this.cmpLine = document.createElement('div'));
    cl.className = 'anim-tune-kt-diff tt-note';
    cl.hidden = true;
    // the fold
    this.fold = kit.btn('Key tools ▸', () => this.setOpen(this.body.hidden === true), 'kt:fold', 'anim-tune-kt-fold');
    this.fold.title = 'Wave, Apply to keys, Smooth between: change many keys at once (one undo step each)';
    const body = (this.body = document.createElement('div'));
    body.className = 'anim-tune-kt-body';
    body.hidden = true;
    const tb = kit.bar();
    this.toolSel = kit.sel(
      tb,
      'Tool',
      TOOLS.map((t) => t[0]),
      () => this.showTool(),
      'kt:tool',
      'anim-tune-kt-tool',
    );
    Array.from(this.toolSel.options).forEach((o, i) => (o.textContent = TOOLS[i]![1]));
    kit.refresh(this.toolSel);
    body.append(tb);
    // --- wave
    const wv = this.pane('wave');
    const wb = kit.bar();
    this.chanSel = kit.sel(
      wb,
      'Channel',
      KEY_FIELDS.map((f) => f.id),
      () => {
        this.chanChanged();
      },
      'kt:chan',
      'anim-tune-kt-chan',
    );
    Array.from(this.chanSel.options).forEach((o) => (o.textContent = api.fieldName(o.value)));
    kit.refresh(this.chanSel);
    [this.ampRange, this.ampNum] = this.rangeRow(wv, 'Amount', 'kt:amp', 'anim-tune-kt-amp', -30, 30, 0.5, 10);
    [this.timRange, this.timNum] = this.rangeRow(wv, 'Timing (share of the cycle)', 'kt:tim', 'anim-tune-kt-tim', 0, 1, 0.01, 0);
    const wb2 = kit.bar();
    wb2.append(kit.btn('Fill keys', () => this.wave(), 'kt:wave', 'anim-tune-kt-wave'));
    const wn = (this.waveNote = document.createElement('div'));
    wn.className = 'tt-note anim-tune-kt-wavenote';
    wv.append(wb, wb2, wn);
    wv.insertBefore(wb, wv.firstChild);
    this.chanChanged();
    // --- apply
    const ap = this.pane('apply');
    const an = (this.applyNote = document.createElement('div'));
    an.className = 'tt-note anim-tune-kt-applynote';
    const tk = (this.ticks = document.createElement('div'));
    tk.className = 'tt-bar anim-tune-kt-ticks';
    const ab = kit.bar();
    ab.append(kit.btn('All', () => this.tickAll(true), 'kt:all', 'anim-tune-kt-all'), kit.btn('None', () => this.tickAll(false), 'kt:none', 'anim-tune-kt-none'), kit.btn('Apply', () => this.apply(), 'kt:apply', 'anim-tune-kt-apply'));
    ap.append(an, tk, ab);
    // --- smooth
    const sm = this.pane('smooth');
    const sb = kit.bar();
    this.fromSel = kit.sel(sb, 'From', [], () => this.notesSoon(), 'kt:from', 'anim-tune-kt-from');
    this.toSel = kit.sel(sb, 'to', [], () => this.notesSoon(), 'kt:to', 'anim-tune-kt-to');
    const sb2 = kit.bar();
    this.fieldsSel = kit.sel(sb2, 'Sliders', ['all', 'one'], () => this.notesSoon(), 'kt:fields', 'anim-tune-kt-fields');
    const fo = this.fieldsSel.options;
    fo[0]!.textContent = 'Every slider';
    fo[1]!.textContent = 'The selected slider';
    kit.refresh(this.fieldsSel);
    sb2.append(kit.btn('Smooth', () => this.smooth(), 'kt:smooth', 'anim-tune-kt-smooth'));
    const snn = (this.smoothNote = document.createElement('div'));
    snn.className = 'tt-note anim-tune-kt-smoothnote';
    sm.append(sb, sb2, snn);
    el.append(cb, cl, this.fold, body);
    this.showTool();
  }

  /** The tools are reached (the Keys tab shown). Every 100 ms. */
  frame(): void {
    // (the ghost's visit moves the chamber: the key it came from stays the current one)
    const pr = this.prime;
    // (another tab shown and no ghost: nothing to follow)
    if (!pr && !this.cmpBox.checked && this.el.offsetParent === null) return;
    const k = pr ? ([pr.clip, pr.back >= 0 ? pr.back : pr.to] as [string, number]) : this.api.shown();
    if (!k) return;
    const [clip, cur] = k;
    if (clip !== this.clip) {
      this.clip = clip;
      this.cmpPose = '';
      void tuneKeysLoadFile(clip).then(() => (this.cmpPose = ''));
    }
    this.keys = tuneKeysToolKeys(clip);
    this.syncLists();
    // the selected slider: the wave's channel follows a newly selected key slider (another can be picked in the list)
    const sel = this.api.selField();
    if (sel !== this.lastSel) {
      this.lastSel = sel;
      if (sel && sel in KEY_FIELD_INDEX && this.chanSel.value !== sel) {
        this.chanSel.value = sel;
        this.kit.refresh(this.chanSel);
        this.chanChanged();
      }
    }
    if (!this.body.hidden) this.notes(clip, cur);
    this.compareFrame(clip, cur);
  }

  /** Whether the compare ghost's visit is moving the chamber (the panel's key follow waits). */
  get priming(): boolean {
    return this.prime !== null;
  }

  /** (tests) The tools' state. */
  state(): { open: boolean; tool: string; chan: string; amount: number; timing: number; ticked: number[]; from: number; to: number; fields: string; compare: boolean; cmpKey: string; diff: string; ghost: boolean; comparePhase: number; notes: string[] } {
    return {
      open: !this.body.hidden,
      tool: this.toolSel.value,
      chan: this.chanSel.value,
      amount: Number(this.ampNum.value),
      timing: Number(this.timNum.value),
      ticked: this.ticked(),
      from: Number(this.fromSel.value),
      to: Number(this.toSel.value),
      fields: this.fieldsSel.value,
      compare: this.cmpBox.checked,
      cmpKey: this.cmpSel.value,
      diff: this.cmpLine.hidden ? '' : (this.cmpLine.textContent ?? ''),
      ghost: this.api.ghostReady(),
      comparePhase: CHAMBER.comparePhase,
      notes: [this.waveNote.textContent ?? '', this.applyNote.textContent ?? '', this.smoothNote.textContent ?? ''],
    };
  }

  /** (tests) Set the tools as the controls would. */
  set(o: { open?: boolean; tool?: Tool; chan?: string; amount?: number; timing?: number; ticked?: number[] | 'all' | 'none'; from?: number; to?: number; fields?: 'all' | 'one'; compare?: boolean; cmpKey?: string }): void {
    if (o.open !== undefined) this.setOpen(o.open);
    if (o.tool) {
      this.toolSel.value = o.tool;
      this.kit.refresh(this.toolSel);
      this.showTool();
    }
    if (o.chan) {
      this.chanSel.value = o.chan;
      this.kit.refresh(this.chanSel);
      this.chanChanged();
    }
    if (o.amount !== undefined) this.setNum(this.ampRange, this.ampNum, o.amount);
    if (o.timing !== undefined) this.setNum(this.timRange, this.timNum, o.timing);
    this.frame();
    if (o.ticked === 'all' || o.ticked === 'none') this.tickAll(o.ticked === 'all');
    else if (o.ticked) for (const c of Array.from(this.ticks.querySelectorAll<HTMLInputElement>('input[type=checkbox]'))) c.checked = o.ticked.includes(Number(c.dataset.id));
    if (o.from !== undefined) this.fromSel.value = String(o.from);
    if (o.to !== undefined) this.toSel.value = String(o.to);
    if (o.fields) this.fieldsSel.value = o.fields;
    for (const s of [this.fromSel, this.toSel, this.fieldsSel]) this.kit.refresh(s);
    if (o.cmpKey !== undefined) {
      this.cmpSel.value = o.cmpKey;
      this.kit.refresh(this.cmpSel);
      this.cmpChanged();
    }
    if (o.compare !== undefined && o.compare !== this.cmpBox.checked) {
      this.cmpBox.checked = o.compare;
      this.setCompare(o.compare);
    }
    this.frame();
  }

  /** (tests) Press a tool's button (Fill keys, Apply, Smooth). */
  run(t: Tool): void {
    if (t === 'wave') this.wave();
    else if (t === 'apply') this.apply();
    else this.smooth();
  }

  // ------------------------------------------------------------------------------------------

  private pane(t: Tool): HTMLDivElement {
    const d = document.createElement('div');
    d.className = `anim-tune-kt-pane anim-tune-kt-${t}`;
    this.panes.set(t, d);
    this.body.append(d);
    return d;
  }

  /** A labelled range (pad: left / right) and its number box (type a value, Enter). */
  private rangeRow(parent: HTMLElement, label: string, key: string, cls: string, min: number, max: number, step: number, v: number): [HTMLInputElement, HTMLInputElement] {
    const b = this.kit.bar();
    const l = document.createElement('label');
    l.className = 'tt-field';
    const r = document.createElement('input');
    r.type = 'range';
    r.className = cls;
    r.min = String(min);
    r.max = String(max);
    r.step = String(step);
    r.value = String(v);
    r.dataset.pad = key;
    const n = document.createElement('input');
    n.type = 'number';
    n.step = 'any';
    n.className = `anim-tune-num ${cls}-num`;
    n.value = String(v);
    r.addEventListener('input', () => {
      n.value = r.value;
      this.notesSoon();
    });
    r.addEventListener('change', () => r.blur());
    n.addEventListener('change', () => {
      this.setNum(r, n, Number(n.value));
      this.notesSoon();
    });
    n.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') n.blur();
    });
    l.append(label, r);
    b.append(l, n);
    parent.append(b);
    return [r, n];
  }

  private setNum(r: HTMLInputElement, n: HTMLInputElement, v: number): void {
    if (!Number.isFinite(v)) {
      n.value = r.value;
      return;
    }
    const c = Math.max(Number(r.min), Math.min(Number(r.max), v));
    r.value = String(c);
    n.value = String(c);
  }

  private notesSoon(): void {
    const k = this.api.shown();
    if (k) this.notes(k[0], k[1]);
  }

  private setOpen(open: boolean): void {
    this.body.hidden = !open;
    this.fold.textContent = open ? 'Key tools ▾' : 'Key tools ▸';
    if (open) this.frame();
  }

  private showTool(): void {
    const t = this.toolSel.value as Tool;
    for (const [id, p] of this.panes) p.hidden = id !== t;
  }

  /** The wave's amount range follows the channel's unit (deg, cm, a plain number). */
  private chanChanged(): void {
    const f = KEY_FIELDS[KEY_FIELD_INDEX[this.chanSel.value] ?? -1];
    if (!f) return;
    const span = f.unit === 'cm' ? 10 : f.unit === '' ? 1 : 45;
    const step = f.unit === 'deg' ? 0.5 : f.unit === 'cm' ? 0.1 : 0.01;
    this.ampRange.min = String(-span);
    this.ampRange.max = String(span);
    this.ampRange.step = String(step);
    const v = Number(this.ampNum.value);
    this.setNum(this.ampRange, this.ampNum, Math.abs(v) > span ? Math.sign(v) * span : v);
    this.notesSoon();
  }

  /** The key lists (ticks, From / to, compare with) follow the clip's keys. */
  private syncLists(): void {
    const sig = `${this.clip}|${this.keys.map((k) => `${k.id}:${k.editable ? 1 : 0}`).join(',')}`;
    if (sig === this.keySig) return;
    this.keySig = sig;
    const ed = this.keys.filter((k) => k.editable);
    const fill = (s: HTMLSelectElement, list: KeyToolKey[], keep: string, extra: [string, string] | null): void => {
      s.replaceChildren();
      if (extra) s.append(new Option(extra[1], extra[0]));
      for (const k of list) s.append(new Option(`Key ${k.num}${k.id >= keyT(this.clip) ? ' (added)' : ''}`, String(k.id)));
      if (Array.from(s.options).some((o) => o.value === keep)) s.value = keep;
      this.kit.refresh(s);
    };
    const from = this.fromSel.value;
    const to = this.toSel.value;
    fill(this.fromSel, ed, from, null);
    fill(this.toSel, ed, to, null);
    if (!ed.some((k) => String(k.id) === to) && ed.length > 2) {
      this.toSel.value = String(ed[Math.min(ed.length - 1, 2)]!.id);
      this.kit.refresh(this.toSel);
    }
    fill(this.cmpSel, this.keys, this.cmpSel.value, ['prev', 'Previous key']);
    // the tick list: every key with its own sliders, ticked as before (new keys ticked)
    if (sig !== this.tickSig) {
      const was = new Map<number, boolean>();
      for (const c of Array.from(this.ticks.querySelectorAll<HTMLInputElement>('input[type=checkbox]'))) was.set(Number(c.dataset.id), c.checked);
      this.ticks.replaceChildren();
      for (const k of ed) {
        const c = this.kit.check(this.ticks, `Key ${k.num}`, was.get(k.id) ?? true, () => this.notesSoon(), `kt:tick:${k.id}`, 'anim-tune-kt-tick');
        c.dataset.id = String(k.id);
      }
      this.tickSig = sig;
    }
  }

  private ticked(): number[] {
    return Array.from(this.ticks.querySelectorAll<HTMLInputElement>('input[type=checkbox]'))
      .filter((c) => c.checked)
      .map((c) => Number(c.dataset.id));
  }

  private tickAll(on: boolean): void {
    for (const c of Array.from(this.ticks.querySelectorAll<HTMLInputElement>('input[type=checkbox]'))) c.checked = on;
    this.notesSoon();
  }

  /** The shown tool's line: what it will do. */
  private notes(clip: string, cur: number): void {
    const t = this.toolSel.value as Tool;
    const ed = this.keys.filter((k) => k.editable);
    const meta = KEY_CLIPS.find((c) => c.name === clip);
    const mirrorNote = meta?.mirror && ed.length < this.keys.length ? ' (Mirror on: the mirrored keys follow)' : '';
    if (t === 'wave') {
      const name = this.api.fieldName(this.chanSel.value);
      const a = Number(this.ampNum.value);
      const tm = Number(this.timNum.value);
      const f = KEY_FIELDS[KEY_FIELD_INDEX[this.chanSel.value] ?? -1];
      const u = f?.unit === 'deg' ? '°' : f?.unit === 'cm' ? ' cm' : '';
      const first = ed[0] ? keyWaveValue(a, ed[0].phase, tm) : 0;
      set(this.waveNote, `Sets ${name} on ${ed.length} keys to ${a}${u} x a sine over the cycle (key 1: ${round2(first)}${u})${mirrorNote}.`);
    } else if (t === 'apply') {
      const id = this.api.selField();
      const g = this.groupOf(cur);
      if (!id || !g) set(this.applyNote, 'Pick a slider in the list below first: Apply gives its value on this key to the ticked keys.');
      else {
        const f = KEY_FIELDS[KEY_FIELD_INDEX[id] ?? -1];
        const u = f?.unit === 'deg' ? '°' : f?.unit === 'cm' ? ' cm' : '';
        set(this.applyNote, `Gives the ticked keys this key's ${this.api.fieldName(id)} (${round2(tuneGet(g, id))}${u})${mirrorNote}.`);
      }
    } else {
      const one = this.fieldsSel.value === 'one';
      const id = this.api.selField();
      const a = this.keys.find((k) => String(k.id) === this.fromSel.value);
      const b = this.keys.find((k) => String(k.id) === this.toSel.value);
      const n = a && b ? this.between(a, b).length : 0;
      set(
        this.smoothNote,
        one && !id
          ? 'Pick a slider in the list below first (or smooth every slider).'
          : `Eases ${n} key${n === 1 ? '' : 's'} between key ${a?.num ?? '?'} and key ${b?.num ?? '?'} from one pose to the other (${one ? this.api.fieldName(id) : 'every slider'})${mirrorNote}.`,
      );
    }
  }

  private between(a: KeyToolKey, b: KeyToolKey): KeyToolKey[] {
    const ed = this.keys.filter((k) => k.editable);
    const ia = ed.indexOf(a);
    const ib = ed.indexOf(b);
    if (ia < 0 || ib < 0 || ia === ib) return [];
    const out: KeyToolKey[] = [];
    for (let i = (ia + 1) % ed.length; i !== ib; i = (i + 1) % ed.length) out.push(ed[i]!);
    return out;
  }

  private groupOf(id: number): string {
    const k = this.keys.find((x) => x.id === id);
    if (k?.group) return k.group;
    // a mirrored key with the Mirror box on: its own key's sliders
    const meta = KEY_CLIPS.find((c) => c.name === this.clip);
    if (!meta) return '';
    const n = meta.phases.length;
    const own = this.keys.find((x) => x.id === id - n);
    return own?.group ?? '';
  }

  /** A tool's changes as one undo step: the open run closed before and after. */
  private oneStep(fn: () => number, done: (n: number) => string): void {
    this.api.settle();
    const n = fn();
    this.api.settle();
    this.api.rebuild();
    this.api.info(done(n));
    this.notesSoon();
  }

  private wave(): void {
    const clip = this.clip;
    const id = this.chanSel.value;
    const a = Number(this.ampNum.value);
    const t = Number(this.timNum.value);
    this.oneStep(
      () => tuneKeysWave(clip, id, a, t),
      (n) => (n < 0 ? 'Wave: pick a channel' : `${clip}: ${this.api.fieldName(id)} waved over ${n} keys (Undo takes it back)`),
    );
  }

  private apply(): void {
    const k = this.api.shown();
    const id = this.api.selField();
    if (!k || !id) {
      this.api.info('Apply to keys: pick a slider in the list first');
      return;
    }
    const ids = this.ticked();
    this.oneStep(
      () => tuneKeysApply(k[0], k[1], id, ids),
      (n) => (n < 0 ? 'Apply to keys: not a key slider' : `${k[0]}: ${this.api.fieldName(id)} given to ${n} key${n === 1 ? '' : 's'} (Undo takes it back)`),
    );
  }

  private smooth(): void {
    const clip = this.clip;
    const a = Number(this.fromSel.value);
    const b = Number(this.toSel.value);
    const one = this.fieldsSel.value === 'one';
    const id = this.api.selField();
    if (one && !id) {
      this.api.info('Smooth between: pick a slider in the list first');
      return;
    }
    const run = (): void =>
      this.oneStep(
        () => tuneKeysSmooth(clip, a, b, one ? id : null),
        (n) => (n < 0 ? 'Smooth between: pick two different keys' : `${clip}: ${n} key${n === 1 ? '' : 's'} eased between the two (Undo takes it back)`),
      );
    // (the poses are the bake's: the key file's values first)
    void tuneKeysLoadFile(clip).then(run);
  }

  // --- compare

  private setCompare(on: boolean): void {
    CHAMBER.compare = on;
    this.cmpLine.hidden = !on;
    this.primed = '';
    if (!on) {
      CHAMBER.comparePhase = Number.NaN;
      this.prime = null;
    }
    this.cmpSig = '';
    this.frame();
  }

  private cmpChanged(): void {
    this.primed = '';
    this.cmpSig = '';
    this.frame();
  }

  /** The compared key: the one picked, else the live key before `cur` (wrapping). */
  private cmpKey(cur: number): KeyToolKey | null {
    const v = this.cmpSel.value;
    if (v !== 'prev') return this.keys.find((k) => String(k.id) === v) ?? null;
    const i = this.keys.findIndex((k) => k.id === cur);
    if (i < 0 || this.keys.length < 2) return null;
    return this.keys[(i - 1 + this.keys.length) % this.keys.length]!;
  }

  private compareFrame(clip: string, cur: number): void {
    if (!this.cmpBox.checked) return;
    const ck = this.cmpKey(cur);
    const ce = this.keys.find((k) => k.id === cur);
    if (!ck || !ce) {
      CHAMBER.comparePhase = Number.NaN;
      set(this.cmpLine, 'Compare: pick a key');
      return;
    }
    CHAMBER.comparePhase = ck.phase;
    const { d, abs } = tuneKeysDiff(clip, cur, ck.id);
    // the compared key's pose changed: the ghost records again
    tuneKeysPose(clip, ck.id, this.poseBuf);
    const pose = `${clip}:${ck.id}:${Array.from(this.poseBuf, (x) => x.toFixed(3)).join(',')}`;
    if (pose !== this.cmpPose) {
      if (this.cmpPose) CHAMBER.compareVer++;
      this.cmpPose = pose;
      this.primed = '';
    }
    const line = `Key ${ce.num} vs key ${ck.num}: ${keyDiffLine(this.diffFields, d, new Float64Array(d.length), 4, 'the same pose')}${abs ? '' : ' (slider changes only: the key file is loading)'}`;
    if (line !== this.cmpSig) {
      this.cmpSig = line;
      set(this.cmpLine, line);
    }
    this.primeGhost(clip, cur, ck.id);
  }

  /**
   * The ghost is recorded while she stands on the compared key: paused in the chamber on this clip, it visits that key
   * once (a few frames) and comes back.
   */
  private primeGhost(clip: string, cur: number, to: number): void {
    const p = this.prime;
    if (p) {
      p.ticks++;
      if (p.back < 0) {
        // on the way back: done once the chamber stands on the key it came from (the panel's follow waits till then)
        if ((CHAMBER.key === p.to && CHAMBER.onKey) || p.ticks > PRIME_TICKS) this.prime = null;
        return;
      }
      if (this.api.ghostReady() || p.ticks > PRIME_TICKS) {
        this.primed = `${clip}:${to}:${CHAMBER.compareVer}`;
        this.api.showKey(p.clip, p.back);
        this.prime = { clip: p.clip, back: -1, to: p.back, ticks: 0 };
      }
      return;
    }
    if (!CHAMBER.active || CHAMBER.entry !== `keyed:${clip}` || !this.api.frozen() || this.api.ghostReady() || to === cur) return;
    const tag = `${clip}:${to}:${CHAMBER.compareVer}`;
    if (this.primed === tag) return;
    this.prime = { clip, back: cur, to, ticks: 0 };
    this.api.showKey(clip, to);
  }
}

function set(el: HTMLElement, t: string): void {
  if (el.textContent !== t) el.textContent = t;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Every key the bake poses (added keys' ids from here). */
function keyT(clip: string): number {
  const c = KEY_CLIPS.find((x) => x.name === clip);
  return c ? (c.mirror ? c.phases.length * 2 : c.phases.length) : 0;
}
