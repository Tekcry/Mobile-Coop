/**
 * (anim-studio) Snapshots of the animation tuner (pure, Babylon-free, no DOM): undo / redo of every tuner change, A/B
 * compare of two settings and named presets. Built on the section registry (`tuneRegistry.ts`): a snapshot is the map
 * of every value off its default (`tuneValues`), applied back through `tuneSet` (so the change log, the save and the
 * export see it as any change). Not hot: the panel calls these on a press or once per frame (`settle`, a time check).
 */
import { TUNE_SECTIONS, tuneChanged, tuneGet, tuneSet, tunablesFor } from './tuneRegistry';

/** Values off their default: group -> slider -> value. */
export type TuneValueMap = Record<string, Record<string, number>>;

/** Every registered value off its default. */
export function tuneValues(): TuneValueMap {
  const out: TuneValueMap = {};
  for (const c of tuneChanged()) (out[c.group] ??= {})[c.id] = c.value;
  return out;
}

export function tuneValuesEqual(a: TuneValueMap, b: TuneValueMap): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const g of ka) {
    const x = a[g]!;
    const y = b[g];
    if (!y) return false;
    const ia = Object.keys(x);
    if (ia.length !== Object.keys(y).length) return false;
    for (const id of ia) if (x[id] !== y[id]) return false;
  }
  return true;
}

/** Set every registered value to the map's (its default when the map has none). Returns how many changed. */
export function tuneApplyValues(m: TuneValueMap, now = Date.now()): number {
  let n = 0;
  for (const s of TUNE_SECTIONS) {
    for (const g of s.groups) {
      const vals = Object.prototype.hasOwnProperty.call(m, g) ? m[g] : undefined;
      for (const t of tunablesFor(g)) {
        const v = vals && Object.prototype.hasOwnProperty.call(vals, t.id) && typeof vals[t.id] === 'number' ? vals[t.id]! : t.def;
        if (tuneGet(g, t.id) !== v) {
          tuneSet(g, t.id, v, now);
          n++;
        }
      }
    }
  }
  return n;
}

/** A run of changes closer than this (ms) is one undo step (a slider drag). */
export const HISTORY_MERGE_MS = 600;
/** The most undo steps kept. */
export const HISTORY_MAX = 200;

/**
 * Undo / redo: `note` on every change, `settle` once per frame (a run of changes becomes one step once it has been
 * quiet for HISTORY_MERGE_MS), `undo` / `redo` (a run still open is settled first). Undo and redo apply through
 * `tuneSet`, and the changes they make are not noted again.
 */
export class TuneHistory {
  private committed: TuneValueMap = {};
  private readonly undos: TuneValueMap[] = [];
  private readonly redos: TuneValueMap[] = [];
  private pending = false;
  private lastAt = 0;
  private applying = false;

  /** Start over from the values now (after a load). */
  reset(): void {
    this.committed = tuneValues();
    this.undos.length = 0;
    this.redos.length = 0;
    this.pending = false;
  }

  /** A change happened (the registry's changed hook). */
  note(now: number): void {
    if (this.applying) return;
    this.pending = true;
    this.lastAt = now;
  }

  /** Close a quiet run of changes as one step (`force`: now). */
  settle(now: number, force = false): void {
    if (!this.pending || (!force && now - this.lastAt < HISTORY_MERGE_MS)) return;
    this.pending = false;
    const cur = tuneValues();
    if (tuneValuesEqual(cur, this.committed)) return;
    this.undos.push(this.committed);
    if (this.undos.length > HISTORY_MAX) this.undos.splice(0, this.undos.length - HISTORY_MAX);
    this.committed = cur;
    this.redos.length = 0;
  }

  undo(now: number): boolean {
    this.settle(now, true);
    const prev = this.undos.pop();
    if (!prev) return false;
    this.redos.push(this.committed);
    this.apply(prev, now);
    this.committed = prev;
    return true;
  }

  redo(now: number): boolean {
    this.settle(now, true);
    const next = this.redos.pop();
    if (!next) return false;
    this.undos.push(this.committed);
    this.apply(next, now);
    this.committed = next;
    return true;
  }

  get undoCount(): number {
    return this.undos.length + (this.pending ? 1 : 0);
  }

  get redoCount(): number {
    return this.redos.length;
  }

  private apply(m: TuneValueMap, _now: number): void {
    this.applying = true;
    try {
      // the change log keeps wall-clock times (tuneSet's default Date.now()); `now` is the history's own clock only
      tuneApplyValues(m);
    } finally {
      this.applying = false;
    }
  }
}

export type AbSlot = 'A' | 'B';

/**
 * A/B compare: `store` keeps the values now in a slot (and shows it); `toggle` keeps the values now in the slot shown
 * (edits made while looking at A stay in A) and applies the other one. Nothing happens until both are stored.
 */
export class TuneAB {
  A: TuneValueMap | null = null;
  B: TuneValueMap | null = null;
  active: AbSlot | '' = '';

  store(slot: AbSlot): void {
    this[slot] = tuneValues();
    this.active = slot;
  }

  /** The slot shown after the toggle ('' : not both stored, nothing changed). */
  toggle(now = Date.now()): AbSlot | '' {
    if (!this.A || !this.B) return '';
    const from: AbSlot = this.active || 'A';
    const to: AbSlot = from === 'A' ? 'B' : 'A';
    this[from] = tuneValues();
    tuneApplyValues(this[to]!, now);
    this.active = to;
    return to;
  }

  clear(): void {
    this.A = this.B = null;
    this.active = '';
  }
}

/** A named preset (the tuner's IndexedDB store, key `presets`). */
export interface TunePreset {
  name: string;
  /** ISO time saved. */
  saved: string;
  values: TuneValueMap;
}

export interface TunePresetFile {
  version: 1;
  presets: TunePreset[];
}

const PRESET_NAME_MAX = 40;

function unsafeKey(k: string): boolean {
  return k === '__proto__' || k === 'constructor' || k === 'prototype';
}

/** A preset name trimmed to PRESET_NAME_MAX ('' when empty). */
export function presetName(s: string): string {
  return s.trim().replace(/\s+/g, ' ').slice(0, PRESET_NAME_MAX);
}

/** The first free `preset N`. */
export function presetAutoName(list: readonly TunePreset[]): string {
  for (let n = 1; ; n++) {
    const name = `preset ${n}`;
    if (!list.some((p) => p.name === name)) return name;
  }
}

/** The list with `values` saved under `name` (replacing a preset of that name in place, else added at the end). */
export function presetPut(list: readonly TunePreset[], name: string, values: TuneValueMap, now = new Date()): TunePreset[] {
  const n = presetName(name);
  if (!n) return list.slice();
  const p: TunePreset = { name: n, saved: now.toISOString(), values: JSON.parse(JSON.stringify(values)) as TuneValueMap };
  const out = list.slice();
  const i = out.findIndex((x) => x.name === n);
  if (i >= 0) out[i] = p;
  else out.push(p);
  return out;
}

export function presetDelete(list: readonly TunePreset[], name: string): TunePreset[] {
  return list.filter((p) => p.name !== name);
}

export function presetFile(list: readonly TunePreset[]): TunePresetFile {
  return { version: 1, presets: list.map((p) => ({ name: p.name, saved: p.saved, values: p.values })) };
}

/** The presets of a stored file: anything malformed is skipped (unsafe keys too); a wrong version reads as none. */
export function presetParse(data: unknown): TunePreset[] {
  if (!data || typeof data !== 'object') return [];
  const f = data as Partial<TunePresetFile>;
  if (f.version !== 1 || !Array.isArray(f.presets)) return [];
  const out: TunePreset[] = [];
  for (const p of f.presets as unknown[]) {
    if (!p || typeof p !== 'object') continue;
    const x = p as Partial<TunePreset>;
    const name = typeof x.name === 'string' ? presetName(x.name) : '';
    if (!name || out.some((q) => q.name === name) || !x.values || typeof x.values !== 'object') continue;
    const values: TuneValueMap = {};
    for (const [g, vals] of Object.entries(x.values)) {
      if (unsafeKey(g) || !vals || typeof vals !== 'object') continue;
      for (const [id, v] of Object.entries(vals as Record<string, unknown>)) {
        if (unsafeKey(id) || typeof v !== 'number' || !Number.isFinite(v)) continue;
        (values[g] ??= {})[id] = v;
      }
    }
    out.push({ name, saved: typeof x.saved === 'string' ? x.saved : '', values });
  }
  return out;
}
