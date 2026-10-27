/**
 * (campaign-mode CM1, PLAN 3.1) The campaign order: the entries the co-op lobby's Mission row lists, in play order (G371:
 * Marlow Yard is the prologue, then Mission 1 on Tallow Wharf; A1: both Tallow missions are "Mission 1"). Pure: no
 * Babylon, no net, no save imports (the lobby, the session, the records and the tests read it). Dark behind
 * `flags.campaign` at its callers.
 */

/** An entry's key: the `campaign:progress` record's key and the lobby row's value. */
export type CampaignKey = 'prologue' | 'threeGreyCoats' | 'twoKeyLedger';

export interface CampaignEntry {
  key: CampaignKey;
  /** The row's label ("Prologue", "Mission 1"). */
  label: string;
  /** The row's title ("Marlow Yard (training)", the mission's name). */
  title: string;
  /** The map id (the prologue's is `ctcourse`; a host's room opens it through `roomMap`, so `ctcourseReplan` too). */
  map: string;
  /** The room's mode: the prologue runs as Course mode, a mission as Sector Ops with the mission bound. */
  mode: 'course' | 'sector';
  /** The `MissionDef` id on `map` (sector entries only). */
  mission?: string;
}

/** The order (A1: undo by renaming the second "Mission 1" or dropping its row). */
export const CAMPAIGN_ORDER: readonly CampaignEntry[] = [
  { key: 'prologue', label: 'Prologue', title: 'Marlow Yard (training)', map: 'ctcourse', mode: 'course' },
  { key: 'threeGreyCoats', label: 'Mission 1', title: 'Three Grey Coats', map: 'tallowWharf', mode: 'sector', mission: 'threeGreyCoats' },
  { key: 'twoKeyLedger', label: 'Mission 1', title: 'Two-Key Ledger', map: 'tallowWharf', mode: 'sector', mission: 'twoKeyLedger' },
];

/** Every entry key in order (the records sanitise unknown keys away against it). */
export const CAMPAIGN_KEYS: readonly CampaignKey[] = CAMPAIGN_ORDER.map((e) => e.key);

/** The maps a prologue room may name: Marlow Yard and its re-plan (`roomMap` with `?marlowreplan=1`, J14). */
const PROLOGUE_MAPS: readonly string[] = ['ctcourse', 'ctcourseReplan'];

/** The map shape this module reads (a `MapDef` fits): its id and its missions' ids. */
export interface CampaignMapLike {
  id: string;
  missions?: readonly { id: string }[];
}

/** The entry with this key, or null (a string from a record or a lobby value). */
export function campaignEntry(key: string): CampaignEntry | null {
  return CAMPAIGN_ORDER.find((e) => e.key === key) ?? null;
}

/**
 * The entries the lobby lists, in order: an entry whose map is not in `maps` or whose mission that map does not define
 * is dropped, and every sector entry while `missionsOn` (`flags.missions`) is off (A10: then the prologue only).
 */
export function campaignEntries(maps: readonly CampaignMapLike[], missionsOn: boolean): CampaignEntry[] {
  const out: CampaignEntry[] = [];
  for (const e of CAMPAIGN_ORDER) {
    if (e.mode === 'sector' && !missionsOn) continue;
    const map = maps.find((m) => m.id === e.map);
    if (!map) continue;
    if (e.mission !== undefined && !map.missions?.some((m) => m.id === e.mission)) continue;
    out.push(e);
  }
  return out;
}

/**
 * The entry a room is on (the lobby's selected row, the records): Course mode on Marlow Yard (or its re-plan) is the
 * prologue; Sector Ops on an entry's map with its mission (`sm`) is that entry; anything else null.
 */
export function entryForRoom(mode: string, map: string, sm: string | null | undefined): CampaignEntry | null {
  if (mode === 'course') return PROLOGUE_MAPS.includes(map) ? CAMPAIGN_ORDER[0]! : null;
  if (mode !== 'sector' || !sm) return null;
  return CAMPAIGN_ORDER.find((e) => e.mode === 'sector' && e.map === map && e.mission === sm) ?? null;
}

/** The progress shape `spoiler` reads (`CampaignProgress` fits): the keys of the entries done. */
export interface CampaignProgressLike {
  done: Readonly<Partial<Record<string, unknown>>>;
}

/**
 * (A3, bible 5.8 "beyond your own progress") The entry is past the first entry not done in `progress`: its row shows
 * "Story spoilers ahead". `progress` is the reader's own (each peer passes its own `campaign:progress`, plan check
 * polish 5). An unknown key: false. Nothing is locked.
 */
export function spoiler(key: string, progress: CampaignProgressLike): boolean {
  const i = CAMPAIGN_ORDER.findIndex((e) => e.key === key);
  if (i < 0) return false;
  const next = CAMPAIGN_ORDER.findIndex((e) => progress.done[e.key] === undefined);
  return next >= 0 && i > next;
}
