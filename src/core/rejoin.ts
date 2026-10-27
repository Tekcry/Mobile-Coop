/**
 * (marlow-bays R1-R3) The co-op rejoin record: the room a player was last in while a match ran, so the main menu can
 * offer "Rejoin <code>" (the joiner) or "Resume hosting <code>" (the host) for `REJOIN_HOLD_S` after it was last seen
 * live, and the joiner's rejoin token for that room (the host gives a token's held slot back). Single player reads it
 * without importing `src/net`. Kept in the tab's `sessionStorage` (it survives a reload of the tab, not a closed tab;
 * a joiner without its token still takes the only held slot of a full room): never a save, so not IndexedDB.
 */
import type { Difficulty } from '../ai/archetypes';
import type { WeatherChoice } from '../world/mapDef';

/** How long the host holds a dropped joiner's slot and the menu offers the room again (s). */
export const REJOIN_HOLD_S = 600;

export type RejoinMode = 'sandbox' | 'clear' | 'infiltration' | 'course' | 'sector';

export interface RejoinRecord {
  code: string;
  role: 'host' | 'client';
  /** Last seen live (ms since the epoch). */
  at: number;
  mode: RejoinMode;
  map: string;
  difficulty: Difficulty;
  mission: string;
  weather: WeatherChoice;
  /** The checkpoint to restart from on "Resume hosting" (course: the bay, 1-based; (campaign-mode CM3, A11) Sector Ops
   *  with `flags.campaign`: the section, 1-based). */
  bay: number;
  /** (campaign-mode CM3, A11) Sector Ops: the host's campaign mission (`MissionDef.id`; absent: none). */
  sm?: string;
}

/** A mission id as the wire takes it (`sectorMissionId`; this module never imports `src/net`). */
const SM = /^[A-Za-z0-9_-]{1,64}$/;

const KEY = 'ns-rejoin';
const TOK = 'ns-rejoin-tok-';
let mem: RejoinRecord | null = null;
const memTok = new Map<string, string>();

function store(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Is a record still offered at `now` (ms)? */
export function rejoinLive(r: RejoinRecord | null, now: number): r is RejoinRecord {
  return !!r && now - r.at >= -60_000 && now - r.at <= REJOIN_HOLD_S * 1000;
}

export function saveRejoin(r: RejoinRecord): void {
  mem = { ...r };
  try {
    store()?.setItem(KEY, JSON.stringify(r));
  } catch {
    /* storage full or blocked: the memory copy holds */
  }
}

const CODE = /^[A-Z0-9]{5}$/;
const ROLES = ['host', 'client'] as const;

function parse(raw: string | null): RejoinRecord | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<RejoinRecord>;
    if (!v || typeof v.code !== 'string' || !CODE.test(v.code) || !ROLES.includes(v.role as 'host') || typeof v.at !== 'number' || typeof v.map !== 'string') return null;
    return { code: v.code, role: v.role!, at: v.at, mode: (v.mode ?? 'course') as RejoinMode, map: v.map, difficulty: (v.difficulty ?? 'normal') as Difficulty, mission: v.mission ?? '', weather: (v.weather ?? 'clear') as WeatherChoice, bay: Math.max(1, Math.floor(Number(v.bay) || 1)), ...(typeof v.sm === 'string' && SM.test(v.sm) ? { sm: v.sm } : {}) };
  } catch {
    return null;
  }
}

/** The record, if one is still live (an expired or malformed one reads as none). The tab's storage is the truth; the
 *  memory copy stands in only where storage is blocked. */
export function loadRejoin(now = Date.now()): RejoinRecord | null {
  const st = store();
  let r: RejoinRecord | null;
  try {
    r = st ? parse(st.getItem(KEY)) : mem;
  } catch {
    r = mem;
  }
  return rejoinLive(r, now) ? r : null;
}

export function clearRejoin(): void {
  mem = null;
  try {
    store()?.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

/** This tab's rejoin token for a room (made once, kept for the tab). */
export function rejoinToken(code: string): string {
  let t = memTok.get(code);
  if (t) return t;
  try {
    t = store()?.getItem(TOK + code) ?? undefined;
  } catch {
    t = undefined;
  }
  if (!t || !/^[A-Za-z0-9]{8,24}$/.test(t)) {
    t = `r${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`;
    try {
      store()?.setItem(TOK + code, t);
    } catch {
      /* memory only */
    }
  }
  memTok.set(code, t);
  return t;
}
