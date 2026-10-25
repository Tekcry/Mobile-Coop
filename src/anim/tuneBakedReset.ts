/**
 * (anim-bake-1022) Reset baked: after a bake merges, the code holds each baked value and the tuner's save still holds
 * the same value as a delta on top, so it would apply twice. This finds the sliders whose saved value equals exactly a
 * ledger entry (`src/anim/tuneBakeLog.json`, `group|id=value` as `tuneBake.ts` writes it) and resets them to their
 * defaults through the registry (the save and the change log follow); every other change is kept.
 *
 * Automatic once per bake: the ids of the bakes applied are kept in the tuner's save (`TuneSnapshot.baked`), so a bake
 * resets its sliders on the first load after its merge and a later deliberate re-tune to the same value is never wiped.
 * A bake's id is `hash@at` (`bakeAppliedIds`): the hash is the export's, so two bakes of one export (a re-bake after new
 * code targets) share it and only the time tells them apart. A bare hash (saves from 4.46.x, before the ids) counts as
 * applied for the first ledger bake with that hash only, so a later bake of the same export still resets once.
 * The panel's Y menu "Reset baked" runs it again ignoring that record. Not hot (a load-time step).
 * Docs: `docs/archive/anim-tuner/BAKE.md` step 7.
 */
import { aliasTuneValues, migrateTuneRows, TUNE_ROWS_VERSION } from './tuneRows';
import { sectionOf, tuneBakedApplied, tuneReset, tuneSetBakedApplied, tuneSnapshot } from './tuneRegistry';

/** One bake of the ledger (the fields this step reads). */
export interface BakedLedgerEntry {
  hash: string;
  at: string;
  baked: readonly string[];
}

/** The ledger's bakes, tolerant of a missing or malformed file (an entry without a hash or a list is skipped). */
export function readBakedLedger(raw: unknown): BakedLedgerEntry[] {
  const bakes = raw && typeof raw === 'object' ? (raw as { bakes?: unknown }).bakes : undefined;
  if (!Array.isArray(bakes)) return [];
  const out: BakedLedgerEntry[] = [];
  for (const b of bakes as unknown[]) {
    if (!b || typeof b !== 'object') continue;
    const x = b as { hash?: unknown; at?: unknown; baked?: unknown };
    if (typeof x.hash !== 'string' || !Array.isArray(x.baked)) continue;
    out.push({ hash: x.hash, at: typeof x.at === 'string' ? x.at : '', baked: (x.baked as unknown[]).filter((k): k is string => typeof k === 'string') });
  }
  return out;
}

/**
 * Each bake's applied id, in ledger order: `hash@at` (unique per bake run; the ledger files are never edited), with
 * `#n` (the entry's index) added only if two entries would share one (a hand-made ledger with equal or missing times).
 */
export function bakeAppliedIds(bakes: readonly BakedLedgerEntry[]): string[] {
  const seen = new Set<string>();
  return bakes.map((b, i) => {
    let id = `${b.hash}@${b.at}`;
    if (seen.has(id)) id = `${id}#${i}`;
    seen.add(id);
    return id;
  });
}

/**
 * Which bakes `applied` covers: a bake's own id, or (a save from before the ids) its bare hash, which stands for the
 * first ledger bake with that hash only.
 */
export function bakesApplied(bakes: readonly BakedLedgerEntry[], ids: readonly string[], applied: readonly string[]): boolean[] {
  const done = new Set(applied);
  const firstOfHash = new Set<string>();
  return bakes.map((b, i) => {
    const first = !firstOfHash.has(b.hash);
    firstOfHash.add(b.hash);
    return done.has(ids[i]!) || (first && done.has(b.hash));
  });
}

/** The ledger's key for a value: exactly as `tuneBake.ts` formats it (`${group}|${id}=${value}`). */
export function bakedKey(group: string, id: string, value: number): string {
  return `${group}|${id}=${value}`;
}

export interface BakedResetSlider {
  group: string;
  id: string;
  value: number;
  def: number;
}

export interface BakedResetPlan {
  /** The sliders to reset (their value is a baked value of a bake not applied yet). */
  reset: BakedResetSlider[];
  /** The other values off their default (kept). */
  kept: number;
  /** The ids of the bakes compared (the ledger's, less the applied ones). */
  fresh: string[];
  /** Every ledger bake's id (`bakeAppliedIds`; recorded as applied after a run). */
  ids: string[];
}

/**
 * The plan for a saved tuner record (`{ version, values: group -> slider -> value }`, as the store saves it): a version
 * 1 (or unversioned) record has its old rows migrated first (`tuneRows.ts`), as `tuneLoad` does. `defaultOf` gives a
 * slider's default (undefined: not a registered slider, e.g. a section not registered yet: never reset, counted kept).
 * Values at their default are left out. Bakes `applied` covers (`bakesApplied`: their id, or a bare hash for the first
 * bake with it) are not compared.
 */
export function bakedResetPlan(
  ledger: unknown,
  saved: unknown,
  defaultOf: (group: string, id: string) => number | undefined,
  applied: readonly string[] = [],
  rangeOf?: (group: string, id: string) => readonly [number, number] | undefined,
): BakedResetPlan {
  const bakes = readBakedLedger(ledger);
  const ids = bakeAppliedIds(bakes);
  const done = bakesApplied(bakes, ids, applied);
  const keys = new Set<string>();
  const fresh: string[] = [];
  bakes.forEach((b, i) => {
    if (done[i]) return;
    fresh.push(ids[i]!);
    for (const k of b.baked) {
      keys.add(k);
      // (anim-bake-targets) a baked value past its slider's normal range (tuned with the wide ranges on) is stored
      // clamped once the tuner re-saves (`tuneLoad` clamps; 4.46.x re-saved after its own reset): match that too
      if (!rangeOf) continue;
      const bar = k.indexOf('|');
      const eq = k.lastIndexOf('=');
      if (bar <= 0 || eq <= bar) continue;
      const group = k.slice(0, bar);
      const id = k.slice(bar + 1, eq);
      const v = Number(k.slice(eq + 1));
      const r = rangeOf(group, id);
      if (!r || !Number.isFinite(v)) continue;
      if (v < r[0]) keys.add(bakedKey(group, id, r[0]));
      else if (v > r[1]) keys.add(bakedKey(group, id, r[1]));
    }
  });
  const plan: BakedResetPlan = { reset: [], kept: 0, fresh, ids };
  const snap = saved && typeof saved === 'object' ? (saved as { version?: unknown; values?: unknown }) : {};
  const raw = snap.values && typeof snap.values === 'object' ? (snap.values as Record<string, Record<string, number>>) : {};
  const values = aliasTuneValues(snap.version === TUNE_ROWS_VERSION ? raw : migrateTuneRows(raw)); // (anim-natural N3) split sliders
  for (const [group, vals] of Object.entries(values)) {
    if (!vals || typeof vals !== 'object') continue;
    for (const [id, value] of Object.entries(vals)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      const def = defaultOf(group, id);
      if (def === undefined) {
        plan.kept++;
        continue;
      }
      if (value === def) continue;
      if (keys.has(bakedKey(group, id, value))) plan.reset.push({ group, id, value, def });
      else plan.kept++;
    }
  }
  return plan;
}

/** The panel's one-line notice for a run ('' when nothing was compared and nothing reset). */
export function bakedResetNotice(reset: number, kept: number): string {
  const s = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
  const keptText = kept === 0 ? 'no other changes' : `your other ${s(kept, 'change is', 'changes are')} kept`;
  if (reset === 0) return kept === 0 ? 'Reset baked: no tuned values.' : `Reset baked: no tuned value matches a bake; your ${s(kept, 'change is', 'changes are')} kept.`;
  return `${s(reset, 'value is', 'values are')} now built in; ${keptText}.`;
}

export interface BakedResetResult {
  reset: number;
  kept: number;
  /** Whether any bake was compared (false: every ledger bake already applied, or no ledger). */
  ran: boolean;
  notice: string;
}

/** A registered slider's default (undefined: not a slider of a registered group). */
function registryDefault(group: string, id: string): number | undefined {
  const t = sectionOf(group)?.byId.get(id);
  return t && t.groups.includes(group) ? t.def : undefined;
}

/** A registered slider's normal range (the one `tuneLoad` clamps to), undefined: not a slider of a registered group. */
function registryRange(group: string, id: string): readonly [number, number] | undefined {
  const t = sectionOf(group)?.byId.get(id);
  return t && t.groups.includes(group) ? [t.min, t.max] : undefined;
}

export interface BakedResetOptions {
  /** The panel's "Reset baked": compare every bake, applied or not. */
  force?: boolean;
  /**
   * The saved record as the store returned it (the load's auto step), compared instead of the registry's values:
   * `tuneLoad` clamps a value past its slider's normal range (one tuned with the wide ranges on, e.g. a Keys twist past
   * 90), and the ledger holds the unclamped value. Omitted: the registry's values (`tuneSnapshot`).
   */
  saved?: unknown;
  now?: number;
}

/**
 * Run it: resets the planned sliders through `tuneReset` (the change log and the panel's save hook follow) and records
 * every ledger bake's id as applied (saved with the next snapshot; a bare hash already there stays, harmless).
 */
export function tuneBakedReset(ledger: unknown, opts: BakedResetOptions = {}): BakedResetResult {
  const force = !!opts.force;
  const now = opts.now ?? Date.now();
  const applied = tuneBakedApplied();
  const plan = bakedResetPlan(ledger, opts.saved !== undefined ? opts.saved : tuneSnapshot(), registryDefault, force ? [] : applied, registryRange);
  for (const r of plan.reset) tuneReset(r.group, r.id, now);
  const all = applied.slice();
  for (const id of plan.ids) if (!all.includes(id)) all.push(id);
  tuneSetBakedApplied(all);
  const ran = plan.fresh.length > 0;
  return { reset: plan.reset.length, kept: plan.kept, ran, notice: ran || force ? bakedResetNotice(plan.reset.length, plan.kept) : '' };
}
