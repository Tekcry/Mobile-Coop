/**
 * (anim-bake-1022) Reset baked: after a bake merges, the code holds each baked value and the tuner's save still holds
 * the same value as a delta on top, so it would apply twice. This finds the sliders whose saved value equals exactly a
 * ledger entry (`src/anim/tuneBakeLog.json`, `group|id=value` as `tuneBake.ts` writes it) and resets them to their
 * defaults through the registry (the save and the change log follow); every other change is kept.
 *
 * Automatic once per bake: the ledger hashes applied are kept in the tuner's save (`TuneSnapshot.baked`), so a bake
 * resets its sliders on the first load after its merge and a later deliberate re-tune to the same value is never wiped.
 * The panel's Y menu "Reset baked" runs it again ignoring that record. Not hot (a load-time step).
 * Docs: `docs/anim-tuner/BAKE.md` step 7.
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
  /** The bakes compared (the ledger's, less the applied ones). */
  fresh: string[];
  /** Every ledger hash (recorded as applied after a run). */
  hashes: string[];
}

/**
 * The plan for a saved tuner record (`{ version, values: group -> slider -> value }`, as the store saves it): a version
 * 1 (or unversioned) record has its old rows migrated first (`tuneRows.ts`), as `tuneLoad` does. `defaultOf` gives a
 * slider's default (undefined: not a registered slider, e.g. a section not registered yet: never reset, counted kept).
 * Values at their default are left out. Bakes whose hash is in `applied` are not compared.
 */
export function bakedResetPlan(ledger: unknown, saved: unknown, defaultOf: (group: string, id: string) => number | undefined, applied: readonly string[] = []): BakedResetPlan {
  const bakes = readBakedLedger(ledger);
  const done = new Set(applied);
  const keys = new Set<string>();
  const fresh: string[] = [];
  for (const b of bakes) {
    if (done.has(b.hash)) continue;
    fresh.push(b.hash);
    for (const k of b.baked) keys.add(k);
  }
  const plan: BakedResetPlan = { reset: [], kept: 0, fresh, hashes: bakes.map((b) => b.hash) };
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
 * every ledger hash as applied (saved with the next snapshot).
 */
export function tuneBakedReset(ledger: unknown, opts: BakedResetOptions = {}): BakedResetResult {
  const force = !!opts.force;
  const now = opts.now ?? Date.now();
  const applied = tuneBakedApplied();
  const plan = bakedResetPlan(ledger, opts.saved !== undefined ? opts.saved : tuneSnapshot(), registryDefault, force ? [] : applied);
  for (const r of plan.reset) tuneReset(r.group, r.id, now);
  const all = applied.slice();
  for (const h of plan.hashes) if (!all.includes(h)) all.push(h);
  tuneSetBakedApplied(all);
  const ran = plan.fresh.length > 0;
  return { reset: plan.reset.length, kept: plan.kept, ran, notice: ran || force ? bakedResetNotice(plan.reset.length, plan.kept) : '' };
}
