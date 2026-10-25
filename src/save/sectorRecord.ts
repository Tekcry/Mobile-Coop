/**
 * The Sector Ops record (feature/sector-ops M7, A11): difficulty stars per op. One kv record `sector:ops` in IndexedDB,
 * through src/save: per op id (the map id, e.g. `warehouseOps`) the difficulty presets the op was completed on and the
 * best time per preset. The op selector shows a filled star per completed preset. (G331: a harder clear fills the easier stars too, on read in `starsOf`.) Sanitised on read. A new key in the
 * existing `kv` store: no profile shape change, so no SAVE_VERSION bump (the C9 precedent, `courseRecord.ts`).
 */
import { dbGet, dbPut } from './db';
import { DIFFICULTIES, type DifficultyPreset } from '../ai/archetypes';

export const SECTOR_RECORD_KEY = 'sector:ops';
const MAX_OPS = 32;

export interface SectorOpEntry {
  /** Presets the op was completed on (DIFFICULTIES order). */
  done: DifficultyPreset[];
  /** Best run time (s) per completed preset. */
  best: Partial<Record<DifficultyPreset, number>>;
}

export interface SectorRecord {
  v: 1;
  ops: Record<string, SectorOpEntry>;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const id = (v: unknown): string | null => (typeof v === 'string' && /^[\w.-]{1,48}$/.test(v) ? v : null);
const secs = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 1e6 ? v : 0);
const isPreset = (v: unknown): v is DifficultyPreset => DIFFICULTIES.includes(v as DifficultyPreset);

export const emptySectorRecord = (): SectorRecord => ({ v: 1, ops: {} });
export const emptySectorOp = (): SectorOpEntry => ({ done: [], best: {} });

/** Anything to a valid record (unknown ops, presets and keys dropped, times clamped, ops capped). */
export function sanitizeSectorRecord(raw: unknown): SectorRecord {
  const rec = emptySectorRecord();
  if (!isObj(raw) || !isObj(raw.ops)) return rec;
  let n = 0;
  for (const [k, v] of Object.entries(raw.ops)) {
    const op = id(k);
    if (!op || !isObj(v) || n >= MAX_OPS) continue;
    n++;
    const e = emptySectorOp();
    const done = Array.isArray(v.done) ? v.done : [];
    for (const p of DIFFICULTIES) if (done.includes(p)) e.done.push(p);
    if (isObj(v.best)) for (const p of e.done) if (secs(v.best[p]) > 0) e.best[p] = secs(v.best[p]);
    rec.ops[op] = e;
  }
  return rec;
}

/** Fold a completed run (preset, time s) into the op's entry. */
export function markCompletedIn(e: SectorOpEntry, preset: DifficultyPreset, time: number): void {
  if (!isPreset(preset)) return;
  if (!e.done.includes(preset)) e.done = DIFFICULTIES.filter((p) => p === preset || e.done.includes(p));
  const t = secs(time);
  const best = e.best[preset];
  if (t > 0 && (best === undefined || t < best)) e.best[preset] = t;
}

/** Stars as text, one per difficulty in DIFFICULTIES order: filled (★) completed, hollow (☆) not yet. */
export function starsText(stars: readonly boolean[]): string {
  let s = '';
  for (const on of stars) s += on ? '★' : '☆';
  return s;
}

/**
 * The op's stars in DIFFICULTIES order (rookie, normal, realistic, perfectionist): true = completed on it or on a
 * harder tier (G331: "Completing a higher difficulty also considers the lower tiers completed also"). Derived on read
 * from the hardest tier in `done`, so an old save gets the fill too; `done` and the best times stay as cleared.
 */
export function starsOf(rec: SectorRecord, opId: string): boolean[] {
  const e = rec.ops[opId];
  let top = -1;
  if (e) for (const p of e.done) top = Math.max(top, DIFFICULTIES.indexOf(p));
  return DIFFICULTIES.map((_p, i) => i <= top);
}

export async function loadSectorRecord(): Promise<SectorRecord> {
  try {
    return sanitizeSectorRecord(await dbGet('kv', SECTOR_RECORD_KEY));
  } catch (e) {
    console.warn('sector record load failed', e);
    return emptySectorRecord();
  }
}

export async function saveSectorRecord(rec: SectorRecord): Promise<void> {
  try {
    await dbPut('kv', SECTOR_RECORD_KEY, rec);
  } catch (e) {
    console.warn('sector record save failed', e);
  }
}

/** Read, mark the op completed on the preset, write (serialised: one update at a time). */
let chain: Promise<unknown> = Promise.resolve();
export function markCompleted(opId: string, preset: DifficultyPreset, time: number): Promise<void> {
  const next = chain.then(async () => {
    const op = id(opId);
    if (!op) return;
    const rec = await loadSectorRecord();
    const e = rec.ops[op] ?? emptySectorOp();
    markCompletedIn(e, preset, time);
    rec.ops[op] = e;
    await saveSectorRecord(rec);
  });
  chain = next.catch(() => undefined);
  return next;
}

/** The op's stars from the saved record (DIFFICULTIES order). */
export async function starsFor(opId: string): Promise<boolean[]> {
  return starsOf(await loadSectorRecord(), opId);
}
