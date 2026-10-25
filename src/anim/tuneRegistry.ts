/**
 * (tuner-camera) The animation tuner's section registry (pure, Babylon-free, no DOM). A section is a set of sliders
 * over a set of state groups: Body, Gun and Camera (`anim/tune.ts`) and any section another job registers from its own
 * file. Every registered section gets the panel's group picker, follow, reset (slider / group / all), the save, the
 * export, the change log and pad control, with no code of its own. Sections show in registration order.
 *
 * Group ids are global (the save and the export key values by group id), so they must be unique across sections; a
 * slider id is unique within its section. Defaults are identity (a `mul` 1, an `add` 0).
 *
 * Hot paths read a section's preallocated objects: `eff[group][field]`, or `cur[field]` after `tuneSectionLoad`
 * (a copy loop, no allocation). The API is documented in `docs/archive/anim-tuner/STATE.md` ("Section registry").
 *
 * (anim-bake-all, BA-A1) `values` holds the tuner's own values (the panel, the save and the export: deltas). `base` holds
 * the generated base table's `sections` key for the section (`animBase.ts`; identity where unset), and `eff` the two
 * composed (a mul slider multiplies, an add slider adds): what every consumer reads. `eff` is rebuilt on an edit, a load,
 * an import or a base load, never per frame. With no base value `eff` equals `values` exactly (1 x v, 0 + v). The bypass
 * reads `base` (the code defaults, as every baked constant).
 */
import { ANIM_BASE } from './animBase';
import { aliasTuneChanged, aliasTuneValues, migrateTuneChanged, migrateTuneRows, TUNE_ROWS_VERSION } from './tuneRows';
import { isRemovedTuneGroup } from './tuneMoveRows';

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

/**
 * (pass 2) Registry-wide switches: `bypass` (held: every section reads its base, the untuned animation and camera: identity, or (anim-bake-all) the baked generic values);
 * `wide` (every slider's range doubled around its default). Never saved.
 */
export const TUNE_FLAGS = { bypass: false, wide: false };

/** What the game is doing now, per section key (`body`, `gun`, `cam`, or a key a new section writes); '' = none. */
export type TuneStateBag = Record<string, string>;
/** The live state bag the selection writes and the panel's follow reads. */
export const TUNE_STATE_BAG: TuneStateBag = { body: '', gun: '', cam: '' };

export interface TuneSectionDef<V extends Record<string, number> = Record<string, number>> {
  /** Unique id (the panel's class names: `anim-tune-pick-<id>`, `anim-tune-rows-<id>`). */
  id: string;
  /** The panel heading. */
  label: string;
  /** A grey line under the heading (optional). */
  note?: string;
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
  /** (pass 2) The ease time constant (s) `tuneSectionEase` moves `cur` with on a state change or a slider move; 0 = at once. */
  tau?: number;
}

export interface TuneSection<V extends Record<string, number> = Record<string, number>> {
  readonly id: string;
  readonly label: string;
  readonly note: string;
  readonly groups: readonly string[];
  readonly tunables: readonly TuneTunable[];
  readonly select: ((state: Readonly<TuneStateBag>) => string | null) | null;
  readonly notes: ((group: string, id: string) => readonly string[]) | null;
  /** The tuner's values per group (every field of the section in each, preallocated): the panel, save and export. */
  readonly values: Record<string, V>;
  /** (anim-bake-all) The base table's values per group (`ANIM_BASE.sections[id]`; identity where unset). */
  readonly base: Record<string, V>;
  /** (anim-bake-all) The effective values per group: `base` composed with `values` (mul x, add +). Consumers read these. */
  readonly eff: Record<string, V>;
  /** The current values a hot path reads (`tuneSectionLoad`, or the section's own step). */
  readonly cur: V;
  /** The defaults (never written). */
  readonly identity: Readonly<V>;
  /** The field ids (copy loops). */
  readonly keys: readonly string[];
  readonly byId: ReadonlyMap<string, TuneTunable>;
  /** The ease time constant (s); 0 = at once. */
  readonly tau: number;
}

/** Every registered section, in registration order. */
export const TUNE_SECTIONS: TuneSection[] = [];
const OWNER = new Map<string, TuneSection>();
/** Told when a section registers (the panel adds it). */
export const TUNE_REGISTRY_HOOKS: { added: ((s: TuneSection) => void) | null } = { added: null };
/** Saved values for groups not registered yet (a section from a file loaded after the save). */
let pending: Record<string, Record<string, number>> = Object.create(null) as Record<string, Record<string, number>>;

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
  const base = {} as Record<string, V>;
  const eff = {} as Record<string, V>;
  for (const g of def.groups) {
    values[g] = defaults();
    base[g] = defaults();
    eff[g] = defaults();
  }
  const sec: TuneSection<V> = {
    id: def.id,
    label: def.label,
    note: def.note ?? '',
    groups: def.groups,
    tunables: def.tunables,
    select: def.select ?? null,
    notes: def.notes ?? null,
    values,
    base,
    eff,
    cur: def.cur ?? defaults(),
    identity: Object.freeze(defaults()),
    keys,
    byId,
    tau: Math.max(0, def.tau ?? 0),
  };
  TUNE_SECTIONS.push(sec as unknown as TuneSection);
  for (const g of def.groups) OWNER.set(g, sec as unknown as TuneSection);
  // a save loaded before this section registered
  for (const g of def.groups) {
    const vals = pending[g];
    if (!vals) continue;
    for (const [id, v] of Object.entries(vals)) {
      if (unsafeKey(id)) continue;
      const t = byId.get(id);
      if (t && t.groups.includes(g)) (values[g] as Record<string, number>)[id] = clamp(t, v);
    }
    delete pending[g];
  }
  // (anim-bake-all) the base table's values for this section (a table loaded before it registered), then eff
  baseFill(sec as unknown as TuneSection);
  effAll(sec as unknown as TuneSection);
  TUNE_REGISTRY_HOOKS.added?.(sec as unknown as TuneSection);
  return sec;
}

// ------------------------------------------------------------------------------------------
// (anim-bake-all, BA-A1) The base table's `sections` key: section id -> group -> slider id -> value
// ------------------------------------------------------------------------------------------

/** The generic base table: section id -> group -> slider id -> value (mul multiplies, add adds). */
export type TuneBaseSections = Record<string, Record<string, Record<string, number>>>;

const copyTable = (t: Readonly<TuneBaseSections> | undefined): TuneBaseSections => {
  const out: TuneBaseSections = {};
  for (const [s, rows] of Object.entries(t ?? {})) {
    if (unsafeKey(s) || !rows || typeof rows !== 'object') continue;
    const o: Record<string, Record<string, number>> = {};
    for (const [g, row] of Object.entries(rows)) {
      if (unsafeKey(g) || !row || typeof row !== 'object') continue;
      const r: Record<string, number> = {};
      for (const [id, v] of Object.entries(row)) if (!unsafeKey(id)) r[id] = v;
      o[g] = r;
    }
    out[s] = o;
  }
  return out;
};
/** The table in use (the generated `ANIM_BASE.sections` at start; `tuneBaseLoad` replaces it). */
let BASE_TABLE: TuneBaseSections = copyTable(ANIM_BASE.sections);
/** Told after a base load (tables that compose the base themselves, `tuneStep.ts`, rebuild). */
export const TUNE_BASE_HOOKS: (() => void)[] = [];

/** A slider's base value from the table (undefined: none). Not hot (a load). */
export function tuneBaseValue(section: string, group: string, id: string): number | undefined {
  const v = BASE_TABLE[section]?.[group]?.[id];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** The table in use (a copy). */
export function tuneBaseNow(): TuneBaseSections {
  return copyTable(BASE_TABLE);
}

/** A slider whose default is its op's identity (mul 1, add 0): only these take a base value. */
const identityDef = (t: TuneTunable): boolean => t.def === (t.kind === 'mul' ? 1 : 0);

/**
 * A section's `base` from the table: the effective value at the tuner's default (what the bypass reads; the slider's
 * default where unset, and always for a slider whose default is not its op's identity, the Keys Mirror box, which takes
 * no base value). Returns the names it skipped (`<section>.<group>.<id>`).
 */
function baseFill(sec: TuneSection): string[] {
  const skipped: string[] = [];
  for (const g of sec.groups) {
    const b = sec.base[g] as Record<string, number>;
    for (const t of sec.tunables) b[t.id] = t.def;
  }
  for (const [g, row] of Object.entries(BASE_TABLE[sec.id] ?? {})) {
    for (const [id, v] of Object.entries(row)) {
      if (OWNER.get(g) !== sec || !hasTunable(g, id) || !identityDef(sec.byId.get(id)!) || typeof v !== 'number' || !Number.isFinite(v)) {
        skipped.push(`${sec.id}.${g}.${id}`);
        continue;
      }
      (sec.base[g] as Record<string, number>)[id] = v;
    }
  }
  return skipped;
}

/** A slider's effective value from its base and the tuner's value (a slider with a non-identity default: the tuner's). */
function effOf(t: TuneTunable, b: number, v: number): number {
  return identityDef(t) ? tuneCompose(t.kind, b, v) : v;
}

/** Compose a base value with a tuner value (mul multiplies, add adds); the bake composes the same way. */
export function tuneCompose(kind: 'mul' | 'add', base: number, v: number): number {
  return kind === 'mul' ? base * v : base + v;
}

/** One group's `eff` from its `base` and `values`. Not hot (an edit or a load). */
function effGroup(sec: TuneSection, g: string): void {
  const b = sec.base[g] as Record<string, number> | undefined;
  const v = sec.values[g] as Record<string, number> | undefined;
  const e = sec.eff[g] as Record<string, number> | undefined;
  if (!b || !v || !e) return;
  for (const t of sec.tunables) e[t.id] = effOf(t, b[t.id]!, v[t.id]!);
}

function effAll(sec: TuneSection): void {
  for (const g of sec.groups) effGroup(sec, g);
}

/**
 * Load a base table's `sections` key (the dev hook `__animBase`, tests): every registered section's `base` and `eff`
 * rebuilt; a section that registers later picks it up. Returns the names it skipped (an unknown group or slider of a
 * registered section). Not hot.
 */
export function tuneBaseLoad(t: Readonly<TuneBaseSections> | undefined): string[] {
  BASE_TABLE = copyTable(t);
  const skipped: string[] = [];
  for (const s of TUNE_SECTIONS) {
    skipped.push(...baseFill(s));
    effAll(s);
  }
  for (const h of TUNE_BASE_HOOKS) h();
  return skipped;
}

/** An effective value (base composed with the tuner's), NaN when not a slider of that group. */
export function tuneEffGet(group: string, id: string): number {
  return (OWNER.get(group)?.eff[group] as Record<string, number> | undefined)?.[id] ?? Number.NaN;
}

/** Copy a group's effective values (null: the defaults; the bypass held: its base) into the section's `cur`. No allocation. */
export function tuneSectionLoad(sec: TuneSection, group: string | null): void {
  const src = group ? (TUNE_FLAGS.bypass ? sec.base[group] : sec.eff[group]) : undefined;
  const from = (src ?? sec.identity) as Record<string, number>;
  const cur = sec.cur as Record<string, number>;
  const keys = sec.keys;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]!;
    cur[k] = from[k]!;
  }
}

/**
 * (pass 2) Ease the section's `cur` toward a group's effective values (null: the defaults; the bypass held: its base)
 * with its `tau` over `dt` s (`tau` 0, `dt` 0 or the bypass: at once). A value equal to its target is never touched, and
 * a value within 1e-6 of it lands on it exactly, so identity stays bit-exact. No allocation.
 */
export function tuneSectionEase(sec: TuneSection, group: string | null, dt: number): void {
  const by = TUNE_FLAGS.bypass;
  const src = group ? (by ? sec.base[group] : sec.eff[group]) : undefined;
  const to = (src ?? sec.identity) as Record<string, number>;
  const cur = sec.cur as Record<string, number>;
  const k = sec.tau > 0 && dt > 0 && !by ? 1 - Math.exp(-dt / sec.tau) : 1;
  const keys = sec.keys;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    const t = to[key]!;
    const c = cur[key]!;
    if (c === t) continue;
    const d = t - c;
    cur[key] = k >= 1 || Math.abs(d) < 1e-6 ? t : c + d * k;
  }
}

/** (fix round) The lowest a multiplier may go with the wide ranges: never negative; a small positive floor (0.05, or its own
 *  minimum when that is lower but above 0); 0 only when its own range already allows 0. */
export const WIDE_MUL_FLOOR = 0.05;
function mulFloor(t: TuneTunable): number {
  return t.min > 0 ? Math.min(WIDE_MUL_FLOOR, t.min) : Math.max(0, t.min);
}

/** (pass 2) A slider's active range: its own, or doubled around its default while `TUNE_FLAGS.wide` is on (a multiplier
 *  never below its floor). */
export function tuneMin(t: TuneTunable): number {
  if (!TUNE_FLAGS.wide) return t.min;
  const lo = t.def - 2 * (t.def - t.min);
  return t.kind === 'mul' ? Math.max(mulFloor(t), lo) : lo;
}
export function tuneMax(t: TuneTunable): number {
  return TUNE_FLAGS.wide ? t.def + 2 * (t.max - t.def) : t.max;
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

/** Clamp to the active range: a slider move, and (fix round) a load or an import too, so a bad saved value never
 *  survives a reload with the wide ranges off. */
function clamp(t: TuneTunable, v: number): number {
  return Math.max(tuneMin(t), Math.min(tuneMax(t), v));
}

/** (fix round) Keys a file must never write through (prototype pollution). */
function unsafeKey(k: string): boolean {
  return k === '__proto__' || k === 'constructor' || k === 'prototype';
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
  // (anim-bake-all) the effective value follows
  (sec.eff[group] as Record<string, number>)[id] = effOf(t, (sec.base[group] as Record<string, number>)[id]!, v);
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
  /** (marlow-bays T1a) 2: the rows of tuneRows.ts; a version 1 file is read with its old rows migrated. */
  version: 1 | 2;
  exported: string;
  changed: TuneValue[];
  log: TuneChange[];
}

/** The export: every changed value with its default, and the change log. */
export function tuneExport(now = new Date()): TuneExport {
  return { magic: TUNE_EXPORT_MAGIC, version: TUNE_ROWS_VERSION, exported: now.toISOString(), changed: tuneChanged(), log: TUNE_LOG.slice() };
}

/** `anim-tune-YYYY-MM-DD.json` (local date). */
export function tuneExportName(now = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `anim-tune-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

/** What the store keeps: the changed values per group, and the log. */
export interface TuneSnapshot {
  /** (marlow-bays T1a) 2: the rows of tuneRows.ts; a version 1 (or unversioned) save loads with its old rows migrated. */
  version: 1 | 2;
  values: Record<string, Record<string, number>>;
  log: TuneChange[];
  /**
   * (anim-bake-1022) The ledger bakes whose baked sliders were reset (`tuneBakedReset.ts`): `hash@at` ids; a bare hash
   * (4.46.x saves) stands for the first ledger bake with that hash only. Absent: none.
   */
  baked?: string[];
}

/** (anim-bake-1022) The applied bake ids (`hash@at`; a 4.46.x save may hold a bare hash) (loaded and saved with the snapshot; an import or a reset keeps them). */
let bakedApplied: string[] = [];

export function tuneBakedApplied(): readonly string[] {
  return bakedApplied;
}

export function tuneSetBakedApplied(ids: readonly string[]): void {
  bakedApplied = ids.filter((h) => typeof h === 'string');
}

export function tuneSnapshot(): TuneSnapshot {
  const values: Record<string, Record<string, number>> = {};
  for (const c of tuneChanged()) (values[c.group] ??= {})[c.id] = c.value;
  // a saved section that has not registered yet keeps its values
  for (const [g, vals] of Object.entries(pending)) if (!values[g]) values[g] = { ...vals };
  const snap: TuneSnapshot = { version: TUNE_ROWS_VERSION, values, log: TUNE_LOG.slice() };
  if (bakedApplied.length) snap.baked = bakedApplied.slice();
  return snap;
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
    pending = Object.create(null) as Record<string, Record<string, number>>;
    // (marlow-bays T1a) a save from before the own rows of the shared states: each new row takes its old row's values
    const raw = snap.values && typeof snap.values === 'object' ? snap.values : {};
    const saved = aliasTuneValues(snap.version === TUNE_ROWS_VERSION ? raw : migrateTuneRows(raw)); // (anim-natural N3) split sliders
    for (const [g, vals] of Object.entries(saved)) {
      // (anim-n3b) a deleted move's rows (the dash-in slide) are dropped, not kept for a section that never registers
      if (unsafeKey(g) || isRemovedTuneGroup(g)) continue;
      if (!vals || typeof vals !== 'object') continue;
      const sec = OWNER.get(g);
      if (!sec) {
        const keep: Record<string, number> = {};
        for (const [id, v] of Object.entries(vals)) if (!unsafeKey(id) && typeof v === 'number' && Number.isFinite(v)) keep[id] = v;
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
    bakedApplied = Array.isArray(snap.baked) ? (snap.baked as unknown[]).filter((h): h is string => typeof h === 'string') : [];
  } finally {
    TUNE_HOOKS.changed = hook;
    for (const sec of TUNE_SECTIONS) effAll(sec); // (anim-bake-all) the effective values follow the load
  }
}

export interface TuneImportResult {
  ok: boolean;
  /** Why it was refused ('' when ok). */
  error: string;
  /** Values applied to registered sections, and values kept for sections not registered yet. */
  applied: number;
  pending: number;
}

/**
 * (pass 2) Import an export (`tuneExport`, the parsed JSON of `anim-tune-<date>.json`): every value goes back to its
 * default, then each exported value is applied (clamped to the active range; a section not registered yet keeps its
 * values until it registers, as with saves; clamped to the active range). The log gains one "import" entry (group `import`, id the file name, `to`
 * the count). Wrong magic or version is refused and changes nothing.
 */
export function tuneImport(data: unknown, name = 'import', now = Date.now()): TuneImportResult {
  const res: TuneImportResult = { ok: false, error: '', applied: 0, pending: 0 };
  if (!data || typeof data !== 'object') {
    res.error = 'not an animation tuner export';
    return res;
  }
  const e = data as Partial<TuneExport>;
  if (e.magic !== TUNE_EXPORT_MAGIC) {
    res.error = `wrong file (magic ${String(e.magic)})`;
    return res;
  }
  if (e.version !== 1 && e.version !== TUNE_ROWS_VERSION) {
    res.error = `unsupported version ${String(e.version)}`;
    return res;
  }
  if (!Array.isArray(e.changed)) {
    res.error = 'no values in the file';
    return res;
  }
  const hook = TUNE_HOOKS.changed;
  TUNE_HOOKS.changed = null;
  try {
    for (const sec of TUNE_SECTIONS) for (const g of sec.groups) for (const t of sec.tunables) (sec.values[g] as Record<string, number>)[t.id] = t.def;
    pending = Object.create(null) as Record<string, Record<string, number>>;
    // (marlow-bays T1a) an export from before the own rows: each new row takes its old row's values
    const list = (e.changed as unknown[]).filter((c): c is { group: string } => !!c && typeof c === 'object' && typeof (c as { group?: unknown }).group === 'string');
    for (const c of aliasTuneChanged(e.version === 1 ? migrateTuneChanged(list) : list)) { // (anim-natural N3) split sliders
      const { group, id, value } = c as Partial<TuneValue>;
      if (typeof group !== 'string' || typeof id !== 'string' || typeof value !== 'number' || !Number.isFinite(value)) continue;
      if (unsafeKey(group) || unsafeKey(id) || isRemovedTuneGroup(group)) continue;
      const sec = OWNER.get(group);
      if (!sec) {
        (pending[group] ??= {})[id] = value;
        res.pending++;
        continue;
      }
      if (!hasTunable(group, id)) continue;
      (sec.values[group] as Record<string, number>)[id] = clamp(sec.byId.get(id)!, value);
      res.applied++;
    }
    TUNE_LOG.push({ t: new Date(now).toISOString(), group: 'import', id: name, from: 0, to: res.applied + res.pending });
    if (TUNE_LOG.length > LOG_MAX) TUNE_LOG.splice(0, TUNE_LOG.length - LOG_MAX);
    lastLogAt = 0;
  } finally {
    TUNE_HOOKS.changed = hook;
    for (const sec of TUNE_SECTIONS) effAll(sec); // (anim-bake-all) the effective values follow the import
  }
  res.ok = true;
  TUNE_HOOKS.changed?.();
  return res;
}

/** Clear the change log (keeps the values). */
export function tuneClearLog(): void {
  TUNE_LOG.length = 0;
  lastLogAt = 0;
  TUNE_HOOKS.changed?.();
}
