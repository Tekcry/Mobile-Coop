import { TuneAB, TuneHistory, presetAutoName, presetDelete, presetFile, presetName, presetParse, presetPut, tuneApplyValues, tuneValues, type TunePreset } from '../anim/tuneHistory';
import { loadAnimTunePresets, saveAnimTunePresets } from '../save/animTuneStore';

/** The panel's control makers (`AnimTunePanel`): buttons, boxes and pickers that carry a `data-pad` key. */
export interface PanelKit {
  btn(label: string, fn: () => void, key: string, cls?: string): HTMLButtonElement;
  check(parent: HTMLElement, label: string, on: boolean, fn: (v: boolean) => void, key: string, cls: string): HTMLInputElement;
  sel(parent: HTMLElement, label: string, opts: readonly (string | number)[], fn: (v: string) => void, key: string, cls: string): HTMLSelectElement;
  bar(): HTMLDivElement;
}

export interface SnapshotsApi {
  /** Rebuild the slider rows (values changed under them). */
  rebuild(): void;
  /** A line in the panel's info row. */
  info(text: string): void;
}

/**
 * (anim-studio) The tuner's snapshots, two bars in the tools: Undo / Redo (every tuner change; a drag is one step),
 * A/B (store A, store B, flip between them) and named presets (a picker, a name box for the keyboard, Save / Load /
 * Delete; stored in the tuner's own IndexedDB store, key `presets`, never the main save). Pure logic in
 * `anim/tuneHistory.ts`. Delete by pad takes A twice.
 */
export class TuneSnapshotsUi {
  readonly bar: HTMLDivElement;
  readonly pbar: HTMLDivElement;
  readonly history = new TuneHistory();
  readonly ab = new TuneAB();
  presets: TunePreset[] = [];
  private undoBtn: HTMLButtonElement;
  private redoBtn: HTMLButtonElement;
  private abBtn: HTMLButtonElement;
  private pick: HTMLSelectElement;
  private nameIn: HTMLInputElement;
  private delBtn: HTMLButtonElement;
  private delArmed = false;
  private nextLabel = 0;
  /** Resolves once the stored presets were read (tests). */
  readonly loaded: Promise<void>;

  constructor(kit: PanelKit, private readonly api: SnapshotsApi) {
    const bar = (this.bar = kit.bar());
    bar.dataset.snapshots = '1';
    this.undoBtn = kit.btn('Undo', () => this.undo(), 'undo', 'anim-tune-undo');
    this.redoBtn = kit.btn('Redo', () => this.redo(), 'redo', 'anim-tune-redo');
    this.undoBtn.title = 'Ctrl+Z (panel open)';
    this.redoBtn.title = 'Ctrl+Y or Ctrl+Shift+Z (panel open)';
    this.abBtn = kit.btn('A/B', () => this.abToggle(), 'ab', 'anim-tune-ab');
    bar.append(this.undoBtn, this.redoBtn, kit.btn('Store A', () => this.abStore('A'), 'abA', 'anim-tune-aba'), kit.btn('Store B', () => this.abStore('B'), 'abB', 'anim-tune-abb'), this.abBtn);
    const pbar = (this.pbar = kit.bar());
    this.pick = kit.sel(pbar, 'preset', [], () => this.disarm(), 'preset', 'anim-tune-preset');
    // (the keyboard's name box: the pad skips it; Save by pad with it empty takes the next free "preset N")
    const name = (this.nameIn = document.createElement('input'));
    name.type = 'text';
    name.placeholder = 'name';
    name.maxLength = 40;
    name.className = 'anim-tune-preset-name';
    name.style.cssText = 'font:inherit;color:#cfe;background:#123;border:1px solid rgba(255,255,255,0.25);min-height:24px;width:80px;';
    name.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.save();
        name.blur();
      }
    });
    this.delBtn = kit.btn('Delete', () => this.del(), 'pdel', 'anim-tune-pdel');
    pbar.append(name, kit.btn('Save', () => this.save(), 'psave', 'anim-tune-psave'), kit.btn('Load', () => this.load(), 'pload', 'anim-tune-pload'), this.delBtn);
    this.fillPick();
    this.loaded = loadAnimTunePresets().then((d) => {
      // (a preset saved before the store answered is kept)
      const stored = presetParse(d);
      for (const p of this.presets) if (!stored.some((q) => q.name === p.name)) stored.push(p);
      this.presets = stored;
      this.fillPick();
    });
  }

  /** A tuner change (the registry's changed hook). */
  note(now: number): void {
    this.history.note(now);
  }

  /** Start the history over from the values now (after the saved values load). */
  reset(): void {
    this.history.reset();
  }

  /** Every frame: a quiet run of changes becomes one undo step; the labels a few times a second. */
  frame(nowMs: number): void {
    this.history.settle(nowMs);
    if (nowMs < this.nextLabel) return;
    this.nextLabel = nowMs + 200;
    const u = `Undo${this.history.undoCount ? ` (${this.history.undoCount})` : ''}`;
    if (this.undoBtn.textContent !== u) this.undoBtn.textContent = u;
    const r = `Redo${this.history.redoCount ? ` (${this.history.redoCount})` : ''}`;
    if (this.redoBtn.textContent !== r) this.redoBtn.textContent = r;
    const ab = `A/B${this.ab.active ? ` (${this.ab.active})` : ''}`;
    if (this.abBtn.textContent !== ab) this.abBtn.textContent = ab;
  }

  undo(): boolean {
    const ok = this.history.undo(performance.now());
    this.api.rebuild();
    this.api.info(ok ? 'undo' : 'nothing to undo');
    this.nextLabel = 0;
    return ok;
  }

  redo(): boolean {
    const ok = this.history.redo(performance.now());
    this.api.rebuild();
    this.api.info(ok ? 'redo' : 'nothing to redo');
    this.nextLabel = 0;
    return ok;
  }

  abStore(slot: 'A' | 'B'): void {
    this.ab.store(slot);
    this.api.info(`stored ${slot}`);
    this.nextLabel = 0;
  }

  /** Flip A / B (the values shown now stay in the slot shown). */
  abToggle(): string {
    const to = this.ab.toggle();
    this.api.rebuild();
    this.api.info(to ? `showing ${to}` : 'A/B: store A and B first');
    this.nextLabel = 0;
    return to;
  }

  /** Save the values now as a preset (`name`, else the name box, else the next "preset N"). */
  save(name?: string): string {
    const n = presetName(name ?? this.nameIn.value) || presetAutoName(this.presets);
    this.presets = presetPut(this.presets, n, tuneValues());
    void saveAnimTunePresets(presetFile(this.presets));
    this.nameIn.value = '';
    this.fillPick(n);
    this.api.info(`preset saved: ${n}`);
    return n;
  }

  /** Load a preset (`name`, else the picked one): every value to the preset's (undoable). */
  load(name?: string): boolean {
    const n = name ?? this.pick.value;
    const p = this.presets.find((x) => x.name === n);
    this.disarm();
    if (!p) {
      this.api.info('no preset picked');
      return false;
    }
    tuneApplyValues(p.values);
    this.api.rebuild();
    this.api.info(`preset loaded: ${n}`);
    return true;
  }

  /** Delete a preset (`name`: at once; the button: A twice / two clicks). */
  del(name?: string): boolean {
    const n = name ?? this.pick.value;
    if (!n || !this.presets.some((p) => p.name === n)) return false;
    if (name === undefined && !this.delArmed) {
      this.delArmed = true;
      this.delBtn.textContent = 'Delete? (again)';
      return false;
    }
    this.disarm();
    this.presets = presetDelete(this.presets, n);
    void saveAnimTunePresets(presetFile(this.presets));
    this.fillPick();
    this.api.info(`preset deleted: ${n}`);
    return true;
  }

  private disarm(): void {
    this.delArmed = false;
    this.delBtn.textContent = 'Delete';
  }

  private fillPick(select?: string): void {
    const s = this.pick;
    const keep = select ?? s.value;
    s.replaceChildren();
    if (!this.presets.length) {
      const o = document.createElement('option');
      o.value = '';
      o.textContent = '(none)';
      s.append(o);
    }
    for (const p of this.presets) {
      const o = document.createElement('option');
      o.value = p.name;
      o.textContent = p.name;
      s.append(o);
    }
    if (this.presets.some((p) => p.name === keep)) s.value = keep;
  }
}
