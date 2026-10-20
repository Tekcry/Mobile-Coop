/**
 * (tuner-camera) The animation tuner's section registry (pure, Babylon-free, no DOM). A section is a set of sliders
 * over a set of state groups: Body, Gun and Camera (`anim/tune.ts`) and any section another job registers from its own
 * file. Every registered section gets the panel's group picker, follow, reset (slider / group / all), the save, the
 * export, the change log and pad control, with no code of its own. Sections show in registration order.
 *
 * Group ids are global (the save and the export key values by group id), so they must be unique across sections; a
 * slider id is unique within its section. Defaults are identity (a `mul` 1, an `add` 0).
 *
 * Hot paths read a section's preallocated objects: `values[group][field]`, or `cur[field]` after `tuneSectionLoad`
 * (a copy loop, no allocation). The API is documented in `docs/anim-tuner/STATE.md` ("Section registry").
 */

export interface TuneTunable {
  id: string;
  label: string;
  kind: 'mul' | 'add';
  def: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  groups: readonly string[];
  /** What code value it scales or offsets (the report and the panel tooltip). */
  hook: string;
}

/** What the game is doing now, per section key (`body`, `gun`, `cam`, or a key a new section writes); '' = none. */
export type TuneStateBag = Record<string, string>;
/** The live state bag the selection writes and the panel's follow reads. */
export const TUNE_STATE_BAG: TuneStateBag = { body: '', gun: '', cam: '' };

export interface TuneSectionDef<V extends Record<string, number> = Record<string, number>> {
  /** Unique id (the panel's class names: `anim-tune-pick-<id>`, `anim-tune-rows-<id>`). */
  id: string;
  /** The panel heading. */
  label: string;
  /** The state groups, in picker order (ids unique across every section). */
  groups: readonly string[];
  /** The sliders (each names the groups it shows in). */
  tunables: readonly TuneTunable[];
  /** Follow: the group the game is in now (null: none, the picker stays). Usually reads its key of the state bag. */
  select?: (state: Readonly<TuneStateBag>) => string | null;
  /** Grey lines under a slider (targets, today's value). Panel only. */
  notes?: (group: string, id: string) => readonly string[];
  /** The current-values object to use (else one is made at defaults). */
  cur?: V;
}

export interface TuneSection<V extends Record<string, number> = Record<string, number>> {
  readonly id: string;
  readonly label: string;
  readonly groups: readonly string[];
  readonly tunables: readonly TuneTunable[];
  readonly select: ((state: Readonly<TuneStateBag>) => string | null) | null;
  readonly notes: ((group: string, id: string) => readonly string[]) | null;
  /** The live values per group (every field of the section in each, preallocated). */
  readonly values: Record<string, V>;
  /** The current values a hot path reads (`tuneSectionLoad`, or the section's own step). */
  readonly cur: V;
  /** The defaults (never written). */
  readonly identity: Readonly<V>;
  /** The field ids (copy loops). */
  readonly keys: readonly string[];
  readonly byId: ReadonlyMap<string, TuneTunable>;
}

/** Every registered section, in registration order. */
export const TUNE_SECTIONS: TuneSection[] = [];
const OWNER = new Map<string, TuneSection>();
/** Told when a section registers (the panel adds it). */
export const TUNE_REGISTRY_HOOKS: { added: ((s: TuneSection) => void) | null } = { added: null };
/** Saved values for groups not registered yet (a section from a file loaded after the save). */
let pending: Record<string, Record<string, number>> = {};

const EMPTY: readonly string[] = [];

/** Register a section; returns its preallocated values and current-values object. Throws on a duplicate id or group. */
export function registerTuneSection<V extends Record<string, number> = Record<string, number>>(def: TuneSectionDef<V>): TuneSection<V> {
  if (TUNE_SECTIONS.some((s) => s.id === def.id)) throw new Error(`tune section ${def.id} already registered`);
  for (const g of def.groups) if (OWNER.has(g)) throw new Error(`tune group ${g} already registered`);
  const byId = new Map<string, TuneTunable>();
  for (const t of def.tunables) {
    if (byId.has(t.id)) throw new Error(`tune slider ${t.id} twice in ${def.id}`);
    for (const g of t.groups) if (!def.groups.includes(g)) throw new Error(`tune slider ${t.id} names ${g}, not a group of ${def.id}`);
    byId.set(t.id, t);
  }
  const keys = def.tunables.map((t) => t.id);
  const defaults = (): V => {
    const o = {} as Record<string, number>;
    for (const t of def.tunables) o[t.id] = t.def;
    return o as V;
  };
  const values = {} as Record<string, V>;
  for (const g of def.groups) values[g] = defaults();
  const sec: TuneSection<V> = {
    id: def.id,
    label: def.label,
    groups: def.groups,
    tunables: def.tunables,
    select: def.select ?? null,
    notes: def.notes ?? null,
    values,
    cur: def.cur ?? defaults(),
    identity: Object.freeze(defaults()),
    keys,
    byId,
  };
  TUNE_SECTIONS.push(sec as unknown as TuneSection);
  for (const g of def.groups) OWNER.set(g, sec as unknown as TuneSection);
  // a save loaded before this section registered
  for (const g of def.groups) {
    const vals = pending[g];
    if (!vals) continue;
    for (const [id, v] of Object.entries(vals)) {
      const t = byId.get(id);
      if (t && t.groups.includes(g)) (values[g] as Record<string, number>)[id] = clamp(t, v);
    }
    delete pending[g];
  }
  TUNE_REGISTRY_HOOKS.added?.(sec as unknown as TuneSection);
  return sec;
}

/** Copy a group's values (null: the defaults) into the section's `cur`. No allocation. */
export function tuneSectionLoad(sec: TuneSection, group: string | null): void {
  const src = group ? sec.values[group] : undefined;
  const from = (src ?? sec.identity) as Record<string, number>;
  const cur = sec.cur as Record<string, number>;
  const keys = sec.keys;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]!;
    cur[k] = from[k]!;
  }
}

export function sectionOf(group: string): TuneSection | undefined {
  return OWNER.get(group);
}

export function isTuneGroup(g: string): boolean {
  return OWNER.has(g);
}

/** The sliders a group shows (registration order). */
export function tunablesFor(group: string): TuneTunable[] {
  const s = OWNER.get(group);
  return s ? s.tunables.filter((t) => t.groups.includes(group)) : [];
}

/** Whether `id` is a slider of `group`. */
export function hasTunable(group: string, id: string): boolean {
  const t = OWNER.get(group)?.byId.get(id);
  return !!t && t.groups.includes(group);
}

/** The grey lines under a slider. */
export function tuneNotes(group: string, id: string): readonly string[] {
  return OWNER.get(group)?.notes?.(group, id) ?? EMPTY;
}

function clamp(t: TuneTunable, v: number): number {
  return Math.max(t.min, Math.min(t.max, v));
}

function round(v: number, step: number): number {
  const d = Math.max(0, Math.min(6, Math.ceil(-Math.log10(step)) + 1));
  return Number(v.toFixed(d));
}

// ------------------------------------------------------------------------------------------
// Edit, reset, change log, export, save (the panel; not hot)
// ------------------------------------------------------------------------------------------

export interface TuneChange {
  /** ISO time of the first move in this entry. */
  t: string;
  group: string;
  id: string;
  from: number;
  to: number;
}

/** The change log (oldest first). A run of moves of one slider within `LOG_MERGE_MS` is one entry. */
export const TUNE_LOG: TuneChange[] = [];
const LOG_MAX = 5000;
const LOG_MERGE_MS = 1500;
let lastLogAt = 0;

/** Called after every change (the panel's debounced save). */
export const TUNE_HOOKS: { changed: (() => void) | null } = { changed: null };

export function tuneGet(group: string, id: string): number {
  return (OWNER.get(group)?.values[group] as Record<string, number> | undefined)?.[id] ?? Number.NaN;
}

/** Set one value (clamped to the slider's range); logs the change. False: not a slider of that group. */
export function tuneSet(group: string, id: string, value: number, now = Date.now()): boolean {
  if (!hasTunable(group, id) || !Number.isFinite(value)) return false;
  const sec = OWNER.get(group)!;
  const t = sec.byId.get(id)!;
  const v = round(clamp(t, value), t.step);
  const vals = sec.values[group] as Record<string, number>;
  const from = vals[id]!;
  if (v === from) return true;
  vals[id] = v;
  const last = TUNE_LOG[TUNE_LOG.length - 1];
  if (last && last.group === group && last.id === id && now - lastLogAt < LOG_MERGE_MS) last.to = v;
  else {
    TUNE_LOG.push({ t: new Date(now).toISOString(), group, id, from, to: v });
    if (TUNE_LOG.length > LOG_MAX) TUNE_LOG.splice(0, TUNE_LOG.length - LOG_MAX);
  }
  lastLogAt = now;
  TUNE_HOOKS.changed?.();
  return true;
}

export function tuneReset(group: string, id: string, now = Date.now()): void {
  const t = OWNER.get(group)?.byId.get(id);
  if (t && t.groups.includes(group)) tuneSet(group, id, t.def, now);
}

export function tuneResetGroup(group: string, now = Date.now()): void {
  for (const t of tunablesFor(group)) tuneSet(group, t.id, t.def, now);
}

export function tuneResetAll(now = Date.now()): void {
  for (const s of TUNE_SECTIONS) for (const g of s.groups) tuneResetGroup(g, now);
}

/** Whether a group has any value off its default. */
export function tuneGroupChanged(group: string): boolean {
  return tunablesFor(group).some((t) => tuneGet(group, t.id) !== t.def);
}

export interface TuneValue {
  group: string;
  id: string;
  label: string;
  kind: 'mul' | 'add';
  unit: string;
  value: number;
  default: number;
}

/** Every value off its default (section, group and slider order). */
export function tuneChanged(): TuneValue[] {
  const out: TuneValue[] = [];
  for (const s of TUNE_SECTIONS) {
    for (const g of s.groups) {
      for (const t of tunablesFor(g)) {
        const v = tuneGet(g, t.id);
        if (v !== t.def) out.push({ group: g, id: t.id, label: t.label, kind: t.kind, unit: t.unit, value: v, default: t.def });
      }
    }
  }
  return out;
}

export const TUNE_EXPORT_MAGIC = 'night-shift-anim-tune';

export interface TuneExport {
  magic: typeof TUNE_EXPORT_MAGIC;
  version: 1;
  exported: string;
  changed: TuneValue[];
  log: TuneChange[];
}

/** The export: every changed value with its default, and the change log. */
export function tuneExport(now = new Date()): TuneExport {
  return { magic: TUNE_EXPORT_MAGIC, version: 1, exported: now.toISOString(), changed: tuneChanged(), log: TUNE_LOG.slice() };
}

/** `anim-tune-YYYY-MM-DD.json` (local date). */
export function tuneExportName(now = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `anim-tune-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

/** What the store keeps: the changed values per group, and the log. */
export interface TuneSnapshot {
  version: 1;
  values: Record<string, Record<string, number>>;
  log: TuneChange[];
}

export function tuneSnapshot(): TuneSnapshot {
  const values: Record<string, Record<string, number>> = {};
  for (const c of tuneChanged()) (values[c.group] ??= {})[c.id] = c.value;
  // a saved section that has not registered yet keeps its values
  for (const [g, vals] of Object.entries(pending)) if (!values[g]) values[g] = { ...vals };
  return { version: 1, values, log: TUNE_LOG.slice() };
}

function validChange(c: unknown): c is TuneChange {
  if (!c || typeof c !== 'object') return false;
  const x = c as Partial<TuneChange>;
  if (typeof x.group !== 'string' || typeof x.id !== 'string') return false;
  if (OWNER.has(x.group)) return hasTunable(x.group, x.id);
  // a section not registered (yet): kept when well formed
  return typeof x.t === 'string' && typeof x.from === 'number' && typeof x.to === 'number';
}

/** Load a saved snapshot (no log entries for the load; unknown ids are skipped; unknown groups wait for their section). */
export function tuneLoad(s: unknown): void {
  if (!s || typeof s !== 'object') return;
  const snap = s as Partial<TuneSnapshot>;
  const hook = TUNE_HOOKS.changed;
  TUNE_HOOKS.changed = null;
  try {
    for (const sec of TUNE_SECTIONS) for (const g of sec.groups) for (const t of sec.tunables) (sec.values[g] as Record<string, number>)[t.id] = t.def;
    pending = {};
    for (const [g, vals] of Object.entries(snap.values ?? {})) {
      if (!vals || typeof vals !== 'object') continue;
      const sec = OWNER.get(g);
      if (!sec) {
        const keep: Record<string, number> = {};
        for (const [id, v] of Object.entries(vals)) if (typeof v === 'number' && Number.isFinite(v)) keep[id] = v;
        pending[g] = keep;
        continue;
      }
      for (const [id, v] of Object.entries(vals)) {
        if (!hasTunable(g, id) || typeof v !== 'number' || !Number.isFinite(v)) continue;
        (sec.values[g] as Record<string, number>)[id] = clamp(sec.byId.get(id)!, v);
      }
    }
    TUNE_LOG.length = 0;
    if (Array.isArray(snap.log)) for (const c of snap.log.slice(-LOG_MAX)) if (validChange(c)) TUNE_LOG.push(c);
    lastLogAt = 0;
  } finally {
    TUNE_HOOKS.changed = hook;
  }
}

/** Clear the change log (keeps the values). */
export function tuneClearLog(): void {
  TUNE_LOG.length = 0;
  lastLogAt = 0;
  TUNE_HOOKS.changed?.();
}
