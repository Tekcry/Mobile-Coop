/**
 * (campaign-mode CM2, PLAN 3.3, A7 / A8) The campaign records: two kv records in IndexedDB through src/save, each with
 * its own `v` and sanitised on read, never throwing (the `sectorRecord.ts` pattern). New keys in the existing `kv`
 * store: the profile shape (`SaveData`) does not change, so no SAVE_VERSION bump (G189, like `sector:ops`,
 * `course:fallow` and `rating:sections`).
 * - `campaign:progress` (bible 5.8 "saved per player, per mission: completed, best rating, intel found"): per campaign
 *   entry (`CAMPAIGN_KEYS`) the best rating (-1: no percent, the prologue, A6), the plays, the most intel found and when.
 *   Each peer keeps its own (the client records from the host's `pc`, CM5).
 * - `campaign:save` (A7): one slot per host, the sector mission in progress, written at each section's begin and cleared
 *   at the mission's end or when the host starts another entry. A record that does not match a sector entry, or holds
 *   any field out of range, reads as no save.
 * Dark behind `flags.campaign` at its callers (CM3+); nothing reads these yet.
 */
import { dbDelete, dbGet, dbPut } from './db';
import { DIFFICULTIES, type DifficultyPreset } from '../ai/archetypes';
import { CAMPAIGN_KEYS, campaignEntry, type CampaignKey } from '../game/mission/campaignOrder';
import type { CampaignTally } from '../game/mission/campaignRating';
import { MISSION } from '../game/mission/missionDef';
import { REVIVES_PER_MISSION } from '../game/reviveClock';
import { SECTOR } from '../game/sectors';

export const CAMPAIGN_PROGRESS_KEY = 'campaign:progress';
export const CAMPAIGN_SAVE_KEY = 'campaign:save';

/** One entry's record. */
export interface CampaignDone {
  /** Best rating 0-100; -1: finished with no percent (the prologue, A6). */
  best: number;
  /** Times finished. */
  plays: number;
  /** The most intel steps done in one finish (`kind: 'intel'` steps, `intelDone`). */
  intel: number;
  /** When it was last finished (ms since the epoch). */
  at: number;
}

export interface CampaignProgress {
  v: 1;
  done: Partial<Record<CampaignKey, CampaignDone>>;
}

/** The host's mission in progress (PLAN 3.3). */
export interface CampaignSave {
  v: 1;
  /** The campaign entry (a sector entry: one with a mission). */
  key: CampaignKey;
  /** The entry's map and mission (must match the entry). */
  map: string;
  mission: string;
  /** Locked for a Continue (A9). */
  difficulty: DifficultyPreset;
  /** The run index of the section to resume at (0-based). */
  section: number;
  /** The runner's done bits per team [a, b, all] and fact bits, packed as `MissionWire` `st` / `f`. */
  st: number[];
  f: number;
  /** Revives used this mission (G126: per mission, a Continue does not refill them). */
  revivesUsed: number;
  /** The rule tracker's breaks. */
  breaks: number;
  /** The alarm stage carried into the section (`SectorRun.alarm` / `alarmAtStart`). */
  alarm: number;
  /** The op-wide tallies so far (the rating adds the live counts to these on a Continue). */
  tally: CampaignTally;
  /** Mission time so far (s). */
  time: number;
  /** When it was written (ms since the epoch). */
  at: number;
}

/** Caps: anything past them is junk (the record or entry reads as absent). */
const LIMIT = { plays: 1e6, intel: 30, section: 63, breaks: 1e4, count: 1e4, time: 1e6, at: 1e13, bits: 2 ** 30 } as const;
const TALLY_KEYS: readonly (keyof CampaignTally)[] = ['kills', 'knockouts', 'alarms', 'spotted', 'bodies', 'optional'];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
/** A whole number in [lo, hi], or null. */
const int = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null);
/** A finite number in [lo, hi], or null. */
const num = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null);
const isKey = (v: unknown): v is CampaignKey => CAMPAIGN_KEYS.includes(v as CampaignKey);

export const emptyCampaignProgress = (): CampaignProgress => ({ v: 1, done: {} });

function sanitizeDone(v: unknown): CampaignDone | null {
  if (!isObj(v)) return null;
  const best = int(v.best, -1, 100);
  const plays = int(v.plays, 0, LIMIT.plays);
  const intel = int(v.intel, 0, LIMIT.intel);
  const at = num(v.at, 0, LIMIT.at);
  if (best === null || plays === null || intel === null || at === null) return null;
  return { best, plays, intel, at };
}

/** Anything to a valid progress record: another `v`, unknown entry keys and entries with a field out of range dropped. */
export function sanitizeCampaignProgress(raw: unknown): CampaignProgress {
  const rec = emptyCampaignProgress();
  if (!isObj(raw) || raw.v !== 1 || !isObj(raw.done)) return rec;
  for (const k of CAMPAIGN_KEYS) {
    const d = Object.hasOwn(raw.done, k) ? sanitizeDone(raw.done[k]) : null;
    if (d) rec.done[k] = d;
  }
  return rec;
}

/** Anything to a valid save, or null (another `v`, not a sector entry, a map / mission that is not the entry's, or a field out of range). */
export function sanitizeCampaignSave(raw: unknown): CampaignSave | null {
  if (!isObj(raw) || raw.v !== 1 || !isKey(raw.key)) return null;
  const e = campaignEntry(raw.key);
  if (!e || e.mode !== 'sector' || e.mission === undefined || raw.map !== e.map || raw.mission !== e.mission) return null;
  if (!DIFFICULTIES.includes(raw.difficulty as DifficultyPreset)) return null;
  const section = int(raw.section, 0, LIMIT.section);
  const f = int(raw.f, 0, LIMIT.bits - 1);
  const revivesUsed = int(raw.revivesUsed, 0, REVIVES_PER_MISSION);
  const breaks = int(raw.breaks, 0, LIMIT.breaks);
  const alarm = int(raw.alarm, 0, SECTOR.alarmMax);
  const time = num(raw.time, 0, LIMIT.time);
  const at = num(raw.at, 0, LIMIT.at);
  if (section === null || f === null || revivesUsed === null || breaks === null || alarm === null || time === null || at === null) return null;
  if (!Array.isArray(raw.st) || raw.st.length !== 3) return null;
  const st: number[] = [];
  for (const b of raw.st as unknown[]) {
    const n = int(b, 0, LIMIT.bits - 1);
    if (n === null) return null;
    st.push(n);
  }
  if (!isObj(raw.tally)) return null;
  const tally: CampaignTally = { kills: 0, knockouts: 0, alarms: 0, spotted: 0, bodies: 0, optional: 0 };
  for (const k of TALLY_KEYS) {
    const n = int(raw.tally[k], 0, LIMIT.count);
    if (n === null) return null;
    tally[k] = n;
  }
  return { v: 1, key: e.key, map: e.map, mission: e.mission, difficulty: raw.difficulty as DifficultyPreset, section, st, f, revivesUsed, breaks, alarm, tally, time, at };
}

/**
 * Fold a finish into `rec`: the best rating kept (`pct` 0-100 rounded, or -1 for no percent), the plays counted, the
 * most intel kept, `at` stamped. An unknown key or a `pct` that is not a number is ignored.
 */
export function recordFinishIn(rec: CampaignProgress, key: string, pct: number, intel: number, at: number): void {
  if (!isKey(key) || !Number.isFinite(pct)) return;
  const p = pct < 0 ? -1 : Math.min(100, Math.round(pct));
  const n = Number.isFinite(intel) && intel > 0 ? Math.min(LIMIT.intel, Math.floor(intel)) : 0;
  const prev = rec.done[key];
  rec.done[key] = {
    best: prev ? Math.max(prev.best, p) : p,
    plays: Math.min(LIMIT.plays, (prev?.plays ?? 0) + 1),
    intel: Math.max(prev?.intel ?? 0, n),
    at: num(at, 0, LIMIT.at) ?? prev?.at ?? 0,
  };
}

/** (plan check polish 6, `intel`) How many of the mission's intel steps (`kind: 'intel'`) are done, from the runner's done bits by step index. */
export function intelDone(steps: readonly { kind: string }[], doneBits: number): number {
  let n = 0;
  for (let i = 0; i < steps.length && i < MISSION.stepsWireMax; i++) if (steps[i]!.kind === 'intel' && (doneBits >>> i) & 1) n++;
  return n;
}

export async function loadCampaignProgress(): Promise<CampaignProgress> {
  try {
    return sanitizeCampaignProgress(await dbGet('kv', CAMPAIGN_PROGRESS_KEY));
  } catch (e) {
    console.warn('campaign progress load failed', e);
    return emptyCampaignProgress();
  }
}

export async function saveCampaignProgress(rec: CampaignProgress): Promise<void> {
  try {
    await dbPut('kv', CAMPAIGN_PROGRESS_KEY, rec);
  } catch (e) {
    console.warn('campaign progress save failed', e);
  }
}

/** Read, fold the finish in (`recordFinishIn`), write (serialised: one update at a time). Never throws. */
let chain: Promise<unknown> = Promise.resolve();
export function recordFinish(key: string, pct: number, intel: number): Promise<void> {
  const next = chain.then(async () => {
    if (!isKey(key)) return;
    const rec = await loadCampaignProgress();
    recordFinishIn(rec, key, pct, intel, Date.now());
    await saveCampaignProgress(rec);
  });
  chain = next.catch(() => undefined);
  return next;
}

/** The host's save slot, or null (none, or junk). Never throws. (CM5) Read after any write or clear still pending. */
export function loadCampaignSave(): Promise<CampaignSave | null> {
  return onSlot(async () => {
    try {
      return sanitizeCampaignSave(await dbGet('kv', CAMPAIGN_SAVE_KEY));
    } catch (e) {
      console.warn('campaign save load failed', e);
      return null;
    }
  });
}

/** (campaign-mode CM5) The slot's writes and clears run one at a time, in call order: a clear at a match start (another
 *  entry) never lands after the new run's first autosave, and the end's clear never before the last section's save. */
let slotChain: Promise<unknown> = Promise.resolve();
function onSlot<T>(job: () => Promise<T>): Promise<T> {
  const next = slotChain.then(job);
  slotChain = next.catch(() => undefined);
  return next;
}

/** Write the save slot (sanitised first: a record that would read back as no save is not written). True when written. */
export function writeCampaignSave(s: CampaignSave): Promise<boolean> {
  const clean = sanitizeCampaignSave(s);
  if (!clean) return Promise.resolve(false);
  return onSlot(async () => {
    try {
      await dbPut('kv', CAMPAIGN_SAVE_KEY, clean);
      return true;
    } catch (e) {
      console.warn('campaign save write failed', e);
      return false;
    }
  });
}

/** Empty the save slot (the mission's end, or the host starts another entry). Never throws. */
export function clearCampaignSave(): Promise<void> {
  return onSlot(async () => {
    try {
      await dbDelete('kv', CAMPAIGN_SAVE_KEY);
    } catch (e) {
      console.warn('campaign save clear failed', e);
    }
  });
}
