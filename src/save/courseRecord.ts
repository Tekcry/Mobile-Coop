/**
 * The course record (training bunker, DECISIONS C9, D20): one kv record `course:fallow` in IndexedDB, through src/save.
 * Per course id: the bays the host has finished (in order), the best time per bay, the best total and the finale's
 * best rating. Read at the lobby (bay select), written at each airlock and at the course's end; sanitised on read.
 * A new key in the existing `kv` store: no profile shape change, so no SAVE_VERSION bump (C9).
 */
import { dbGet, dbPut } from './db';
import type { FinaleRating, GhostTier } from '../game/course/courseRating';
import { compareRatings } from '../game/course/courseRating';

export const COURSE_RECORD_KEY = 'course:fallow';
const MAX_BAYS = 64;
const MAX_COURSES = 16;

export interface CourseEntry {
  /** Bay ids in course order, as last seen. */
  bays: string[];
  /** Bay ids the host has finished. */
  finished: string[];
  /** Best time (s) per bay id. */
  bestBay: Record<string, number>;
  /** Best whole-course time (s), 0 = none. */
  bestTotal: number;
  /** The finale's best run. */
  bestRating: FinaleRating | null;
}

export interface CourseRecord {
  v: 1;
  courses: Record<string, CourseEntry>;
}

const TIERS: readonly GhostTier[] = ['ghost', 'silent', 'loud'];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const id = (v: unknown): string | null => (typeof v === 'string' && /^[\w.-]{1,48}$/.test(v) ? v : null);
const secs = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1e6 ? v : 0);
const ids = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v.slice(0, MAX_BAYS)) {
    const s = id(x);
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
};

export const emptyCourseRecord = (): CourseRecord => ({ v: 1, courses: {} });
export const emptyCourseEntry = (): CourseEntry => ({ bays: [], finished: [], bestBay: {}, bestTotal: 0, bestRating: null });

/** Anything to a valid record (unknown keys dropped, numbers clamped, lists capped). */
export function sanitizeCourseRecord(raw: unknown): CourseRecord {
  const rec = emptyCourseRecord();
  if (!isObj(raw) || !isObj(raw.courses)) return rec;
  let n = 0;
  for (const [k, v] of Object.entries(raw.courses)) {
    const cid = id(k);
    if (!cid || !isObj(v) || n >= MAX_COURSES) continue;
    n++;
    const e = emptyCourseEntry();
    e.bays = ids(v.bays);
    e.finished = ids(v.finished);
    if (isObj(v.bestBay)) for (const [b, t] of Object.entries(v.bestBay)) if (id(b) && secs(t) > 0 && Object.keys(e.bestBay).length < MAX_BAYS) e.bestBay[b] = secs(t);
    e.bestTotal = secs(v.bestTotal);
    const r = v.bestRating;
    if (isObj(r) && TIERS.includes(r.tier as GhostTier)) e.bestRating = { tier: r.tier as GhostTier, points: Math.round(Math.min(1e4, secs(r.points))), time: secs(r.time) };
    rec.courses[cid] = e;
  }
  return rec;
}

/** Bays (1-based) the lobby may start at: bay 1, and every bay after one the host has finished (all with `all`). */
export function startableBays(e: CourseEntry | undefined, all = false, fallbackCount = 0): number[] {
  const out = [1];
  const n = e?.bays.length || fallbackCount;
  for (let i = 1; i < n; i++) if (all || (e && e.finished.includes(e.bays[i - 1]!))) out.push(i + 1);
  return out;
}

/** (marlow-play B4) The lobby's "Start at" bay: clamped to `bays` only once the record has loaded, so a resumed host
 * (or the lobby after the results) keeps its bay while `startableBays(undefined)` is still just [1]. */
export function lobbyStartBay(bay: number, bays: readonly number[], loaded: boolean): number {
  return !loaded || bays.includes(bay) ? bay : 1;
}

/** Fold a bay finished (time s) into the entry. */
export function recordBay(e: CourseEntry, bays: readonly string[], bay: string, time: number): void {
  e.bays = bays.slice(0, MAX_BAYS);
  if (!e.finished.includes(bay)) e.finished.push(bay);
  const best = e.bestBay[bay];
  if (time > 0 && (best === undefined || time < best)) e.bestBay[bay] = time;
}

/** Fold a finished run into the entry (total time when the whole course was run; the finale's rating). */
export function recordRun(e: CourseEntry, total: number | null, rating: FinaleRating | null): void {
  if (total !== null && total > 0 && (e.bestTotal === 0 || total < e.bestTotal)) e.bestTotal = total;
  if (rating && (!e.bestRating || compareRatings(rating, e.bestRating) > 0)) e.bestRating = { ...rating };
}

export async function loadCourseRecord(): Promise<CourseRecord> {
  try {
    return sanitizeCourseRecord(await dbGet('kv', COURSE_RECORD_KEY));
  } catch (e) {
    console.warn('course record load failed', e);
    return emptyCourseRecord();
  }
}

export async function saveCourseRecord(rec: CourseRecord): Promise<void> {
  try {
    await dbPut('kv', COURSE_RECORD_KEY, rec);
  } catch (e) {
    console.warn('course record save failed', e);
  }
}

/** Read, change one course's entry, write (serialised: one update at a time). */
let chain: Promise<unknown> = Promise.resolve();
export function updateCourseRecord(courseId: string, fn: (e: CourseEntry) => void): Promise<void> {
  const next = chain.then(async () => {
    const rec = await loadCourseRecord();
    const e = rec.courses[courseId] ?? emptyCourseEntry();
    fn(e);
    rec.courses[courseId] = e;
    await saveCourseRecord(rec);
  });
  chain = next.catch(() => undefined);
  return next;
}
