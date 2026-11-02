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

// ---- (campaign-mode CM4, PLAN 3.5) the lobby's Mission row and briefing panel: pure helpers for coopUi and the tests ----

/** The Mission row's value for a Continue (A9); every other value is an entry key. */
export const CONTINUE_VALUE = 'continue';
/** The briefing panel's players line (G2). */
export const TWO_PLAYERS_LINE = 'Needs exactly two players';
/** The spoiler line of an entry past the reader's own progress (bible 5.8, A3). */
export const SPOILER_LINE = 'Story spoilers ahead';
/**
 * The prologue's briefing (Marlow Yard has no `MissionDef`): written to be voiced later (G82). A6: no percent, finishing
 * it records it as completed.
 */
export const PROLOGUE_BRIEFING: readonly string[] = [
  'Marlow Yard. The training yard, bay by bay, the two of you together.',
  'Every move the missions ask for is learned here first.',
  'Training: no rating. Finishing it records it as completed.',
];

/** An entry's row text ("Mission 1: Three Grey Coats"). */
export function entryRowText(e: CampaignEntry): string {
  return `${e.label}: ${e.title}`;
}

/** The save shape the lobby helpers read (`CampaignSave` fits). */
export interface CampaignSaveLike {
  key: string;
  section: number;
  difficulty: string;
}

/** The section names the Continue row reads (a map's `sectors`, in run order: the save's `section` is a run index). */
export type SectionNames = readonly { name: string }[] | undefined;

/** The Continue row ("Continue: Three Grey Coats, Arcade lofts"); a section the map does not name reads "Section N". */
export function continueRowText(save: CampaignSaveLike, sections: SectionNames): string {
  const title = campaignEntry(save.key)?.title ?? save.key;
  return `Continue: ${title}, ${sections?.[save.section]?.name ?? `Section ${save.section + 1}`}`;
}

/**
 * The host's Mission row options: the Continue row first when there is a save whose entry is listed (A9), then every
 * listed entry in order.
 */
export function missionRowOptions(entries: readonly CampaignEntry[], save: CampaignSaveLike | null, sections: SectionNames): { value: string; label: string }[] {
  const out = entries.map((e) => ({ value: e.key as string, label: entryRowText(e) }));
  if (save && entries.some((e) => e.key === save.key)) out.unshift({ value: CONTINUE_VALUE, label: continueRowText(save, sections) });
  return out;
}

/** (A9) The difficulty a Continue locks the room to (the save's), or null (not a Continue: the row is the host's). */
export function lockedDifficulty(resume: { difficulty: string } | null | undefined): string | null {
  return resume ? resume.difficulty : null;
}

/** The briefing panel (A4): what both peers read in the context panel for the picked entry. */
export interface BriefingPanel {
  /** The entry's row text, or the Continue row's. */
  title: string;
  /** "Story spoilers ahead" past the reader's own progress, else null (A3, plan check polish 5). */
  spoiler: string | null;
  /** The briefing lines (a mission's `briefingLines()`, the prologue's `PROLOGUE_BRIEFING`). */
  lines: string[];
  /** The rules line ("Rules: No kills"), '' with none. */
  rules: string;
  /** "Needs exactly two players" (G2). */
  players: string;
  /** "Difficulty: Normal", "(kept from the save)" on a Continue. */
  difficulty: string;
}

/**
 * The briefing panel of `e`. `text` is the mission's (`briefingLines`, `rulesLine`; the caller reads the `MissionDef`, so
 * this module keeps no mission imports); null or absent for the prologue. `progress` is the reader's OWN
 * `campaign:progress` (each peer passes its own; a client never takes the host's), null while it loads (no spoiler line
 * yet). `cont`: the Continue row's text when the room continues a save (the difficulty is the save's).
 */
export function briefingPanel(
  e: CampaignEntry,
  text: { lines: readonly string[]; rules: string } | null,
  progress: CampaignProgressLike | null,
  difficultyLabel: string,
  cont: string | null = null,
): BriefingPanel {
  return {
    title: cont ?? entryRowText(e),
    spoiler: progress && spoiler(e.key, progress) ? SPOILER_LINE : null,
    lines: e.mission !== undefined && text ? text.lines.slice() : PROLOGUE_BRIEFING.slice(),
    rules: e.mission !== undefined && text ? text.rules : '',
    players: TWO_PLAYERS_LINE,
    difficulty: `Difficulty: ${difficultyLabel}${cont ? ' (kept from the save)' : ''}`,
  };
}

/** The panel's lines in reading order: the spoiler line first, the briefing, the rules, the players, the difficulty. */
export function briefingPanelLines(p: BriefingPanel): string[] {
  return [...(p.spoiler ? [p.spoiler] : []), ...p.lines, ...(p.rules ? [p.rules] : []), p.players, p.difficulty];
}

/** A lobby options row (`coopUi` builds them in this order). */
export type LobbyRow = 'mode' | 'map' | 'campaign' | 'difficulty' | 'difficultyLocked' | 'weather' | 'bay' | 'room';

/**
 * The lobby's option rows, in order. With `campaign` off (`flags.campaign`) the rows are exactly today's: host Mode,
 * Map, Difficulty, Weather (a map with weathers), Start at (Course mode), Room; client the
 * same as locked rows without Start at and Room. With it on and the room on a campaign entry (`entry`) the Map row is
 * the campaign's Mission row ('campaign'), and a Continue (`continued`, host) locks the difficulty (A9).
 */
export function lobbyRows(o: { campaign: boolean; host: boolean; mode: string; entry: CampaignEntry | null; continued: boolean; weather: boolean }): LobbyRow[] {
  const camp = o.campaign && o.entry !== null;
  const rows: LobbyRow[] = ['mode', camp ? 'campaign' : 'map'];
  rows.push(camp && o.host && o.continued ? 'difficultyLocked' : 'difficulty');
  if (o.weather) rows.push('weather');
  if (!o.host) return rows;
  if (o.mode === 'course') rows.push('bay');
  rows.push('room');
  return rows;
}

/**
 * (campaign-mode CM5, A7, CM4 check note) The host's match start empties `campaign:save` when it starts a campaign entry
 * (`entryForRoom`) that is not a Continue: another entry ends the saved run (a fresh start of the same entry writes its
 * own save at its first section's begin). Plain Sector Ops or any other room keeps the save.
 */
export function startClearsSave(mode: string, map: string, sm: string | null | undefined, continued: boolean): boolean {
  return !continued && entryForRoom(mode, map, sm) !== null;
}

/** The prologue's record: finished, no percent (A6: training). */
export const PROLOGUE_PCT = -1;

/**
 * (campaign-mode CM5, A6) A won course records the prologue (`PROLOGUE_PCT`) on this page: `flags.campaign` on, a co-op
 * match (the lobby's Campaign: a solo course run is training only, never the campaign, G2) on Marlow Yard or its re-plan.
 */
export function prologueFinish(on: boolean, coop: boolean, map: string): boolean {
  return on && coop && entryForRoom('course', map, null)?.key === 'prologue';
}
