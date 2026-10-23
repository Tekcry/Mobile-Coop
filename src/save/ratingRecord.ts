/**
 * The section rating record (section-rating S5): one kv record `rating:sections` in IndexedDB, through src/save.
 * Per map id and section id: the best marks (4-bit mask from game/rating/sectionRating) and the synced-takedown count
 * of that best run. Best = more marks, then more synced. Sanitised on read; written by the host only.
 * A new key in the existing `kv` store (the `course:fallow` pattern): no profile shape change, no SAVE_VERSION bump.
 */
import { dbGet, dbPut } from './db';
import { ALL_MARKS } from '../game/rating/sectionRating';

export const RATING_RECORD_KEY = 'rating:sections';
const MAX_MAPS = 32;
const MAX_SECTIONS = 64;
const MAX_SYNCED = 1e4;

export interface SectionBest {
  /** Marks bitmask, 0-15. */
  marks: number;
  synced: number;
}

export interface RatingRecord {
  v: 1;
  maps: Record<string, Record<string, SectionBest>>;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const id = (v: unknown): string | null => (typeof v === 'string' && /^[\w.-]{1,48}$/.test(v) ? v : null);
const num = (v: unknown, max: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);
const bits = (m: number): number => {
  let n = 0;
  for (let b = m & ALL_MARKS; b; b &= b - 1) n++;
  return n;
};

export const emptyRatingRecord = (): RatingRecord => ({ v: 1, maps: {} });

/** Anything to a valid record (junk dropped, marks clamped to the 4 bits, synced to an int 0-1e4). */
export function sanitiseRatingRecord(raw: unknown): RatingRecord {
  const rec = emptyRatingRecord();
  if (!isObj(raw) || !isObj(raw.maps)) return rec;
  let nm = 0;
  for (const [mk, mv] of Object.entries(raw.maps)) {
    const mid = id(mk);
    if (!mid || !isObj(mv) || nm >= MAX_MAPS) continue;
    const secs: Record<string, SectionBest> = {};
    let ns = 0;
    for (const [sk, sv] of Object.entries(mv)) {
      const sid = id(sk);
      if (!sid || !isObj(sv) || ns >= MAX_SECTIONS) continue;
      secs[sid] = { marks: num(sv.marks, 1e6) & ALL_MARKS, synced: num(sv.synced, MAX_SYNCED) };
      ns++;
    }
    rec.maps[mid] = secs;
    nm++;
  }
  return rec;
}

/** > 0 when `a` is the better result: more marks, then more synced. */
export function compareBest(a: SectionBest, b: SectionBest): number {
  return bits(a.marks) - bits(b.marks) || a.synced - b.synced;
}

export async function loadRatingRecord(): Promise<RatingRecord> {
  try {
    return sanitiseRatingRecord(await dbGet('kv', RATING_RECORD_KEY));
  } catch (e) {
    console.warn('rating record load failed', e);
    return emptyRatingRecord();
  }
}

/** Read, fold one section's result in (kept only if better), write. Serialised: one update at a time. */
let chain: Promise<unknown> = Promise.resolve();
export async function updateRatingRecord(mapId: string, sectionId: string, marks: number, synced: number): Promise<void> {
  const mid = id(mapId);
  const sid = id(sectionId);
  if (!mid || !sid) return;
  const next: SectionBest = { marks: num(marks, 1e6) & ALL_MARKS, synced: num(synced, MAX_SYNCED) };
  const run = chain.then(async () => {
    const rec = await loadRatingRecord();
    const sections = rec.maps[mid] ?? (rec.maps[mid] = {});
    const cur = sections[sid];
    if (cur && compareBest(next, cur) <= 0) return;
    sections[sid] = next;
    try {
      await dbPut('kv', RATING_RECORD_KEY, rec);
    } catch (e) {
      console.warn('rating record save failed', e);
    }
  });
  chain = run.catch(() => undefined);
  return run;
}
