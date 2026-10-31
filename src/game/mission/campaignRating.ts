/**
 * (campaign-mode CM1, PLAN 3.2) The campaign mission's 0-100% rating (bible 5.8 "Results"). Pure: no Babylon, no net
 * imports. A5's starting values (G422: Michael tunes after he plays): 100, minus 10 per kill and 15 per alarm, plus 5 per
 * optional objective done, clamped 0-100; any kill or alarm caps it at 99, so 100% (PERFECT) is exactly G146 "No kills +
 * no alarms + all primary objectives" (a mission only ends with every required step done). Knock-outs are not kills;
 * times spotted and bodies found are shown, not scored. The counts are op-wide (a section restart keeps them; a Continue
 * adds the saved tally, PLAN 3.4).
 */

/** A5's numbers (undo: change them here and in the test). */
export const CAMPAIGN_RATING = { base: 100, perKill: 10, perAlarm: 15, perOptional: 5, capFlawed: 99 } as const;

/** The op-wide counts a campaign mission keeps (the rating reads kills, alarms and optional; the results show all). */
export interface CampaignTally {
  kills: number;
  knockouts: number;
  alarms: number;
  spotted: number;
  bodies: number;
  optional: number;
}

export interface CampaignRating {
  /** 0-100, a whole number. */
  pct: number;
  /** 100%: no kills and no alarms (G146). */
  perfect: boolean;
}

/** A count as a whole number >= 0 (junk: 0). */
const count = (v: number): number => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/** The rating from the op-wide kills, alarms and optional objectives done (A5). */
export function campaignRating(t: Pick<CampaignTally, 'kills' | 'alarms' | 'optional'>): CampaignRating {
  const R = CAMPAIGN_RATING;
  const kills = count(t.kills);
  const alarms = count(t.alarms);
  const clean = kills === 0 && alarms === 0;
  let pct = R.base - R.perKill * kills - R.perAlarm * alarms + R.perOptional * count(t.optional);
  if (!clean) pct = Math.min(pct, R.capFlawed);
  pct = Math.max(0, Math.min(R.base, pct));
  return { pct, perfect: clean };
}

/** A results row's category (bible 5.8 "Each category is shown"). */
export type CampaignRowKey = 'kills' | 'knockouts' | 'alarms' | 'spotted' | 'bodies' | 'optional' | 'rules';

export interface CampaignResultRow {
  key: CampaignRowKey;
  /** The row's label ("Kills", "Times spotted"). */
  label: string;
  /** The row's value as shown ("0", "1 / 2"). */
  value: string;
}

/** (PLAN 3.2) The results screen's campaign panel (CM5 builds it at the end, CM6 draws it). */
export interface CampaignResultView {
  /** The mission's title. */
  title: string;
  pct: number;
  perfect: boolean;
  /** Kills, knock-outs, alarms, times spotted, bodies found, optional objectives, rules kept. */
  rows: CampaignResultRow[];
  /** (CM5) A Continue: the section number (1-based) the run resumed at; its earlier sections have no section rating. */
  continuedFrom?: number;
}

// ---- (campaign-mode CM5 / CM6) the end's counts and the results panel's rows (pure) ----

/** The step shape these read (a `MissionStep` fits). */
export interface RatedStep {
  optional?: unknown;
}

/** (CM5) Optional steps done (from the runner's done bits by step index, `wireDoneBits`) and how many the mission has. */
export function optionalDone(steps: readonly RatedStep[], doneBits: number): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (let i = 0; i < steps.length; i++) {
    if (!steps[i]!.optional) continue;
    total++;
    if (i < 31 && (doneBits >>> i) & 1) done++;
  }
  return { done, total };
}

/** What the rows show beyond the tally: optional objectives and rules kept, each as done of total. */
export interface CampaignRowsInput {
  /** The op-wide tally (null: not known here, the co-op client: only the optional and rules rows). */
  tally: CampaignTally | null;
  optional: { done: number; total: number };
  rules: { kept: number; total: number };
}

const ofTotal = (n: number, total: number): string => `${count(n)} / ${count(total)}`;

/**
 * (CM6, bible 5.8 "Each category is shown") The results panel's rows, in order: kills, knock-outs, alarms raised, times
 * spotted, bodies found (from the tally), then optional objectives and rules kept ("1 / 2"; a mission with no optional
 * step or no rule has no such row).
 */
export function campaignResultRows(o: CampaignRowsInput): CampaignResultRow[] {
  const rows: CampaignResultRow[] = [];
  const t = o.tally;
  if (t) {
    rows.push(
      { key: 'kills', label: 'Kills', value: String(count(t.kills)) },
      { key: 'knockouts', label: 'Knock-outs', value: String(count(t.knockouts)) },
      { key: 'alarms', label: 'Alarms raised', value: String(count(t.alarms)) },
      { key: 'spotted', label: 'Times spotted', value: String(count(t.spotted)) },
      { key: 'bodies', label: 'Bodies found', value: String(count(t.bodies)) },
    );
  }
  if (o.optional.total > 0) rows.push({ key: 'optional', label: 'Optional objectives', value: ofTotal(o.optional.done, o.optional.total) });
  if (o.rules.total > 0) rows.push({ key: 'rules', label: 'Rules kept', value: ofTotal(o.rules.kept, o.rules.total) });
  return rows;
}

/** (CM6) The panel: the title, the rating and the rows; `continuedFrom` only for a Continue (a section number >= 1). */
export function campaignResultView(title: string, r: CampaignRating, rows: CampaignResultRow[], continuedFrom?: number): CampaignResultView {
  const v: CampaignResultView = { title, pct: r.pct, perfect: r.perfect, rows };
  if (continuedFrom !== undefined && Number.isInteger(continuedFrom) && continuedFrom >= 1) v.continuedFrom = continuedFrom;
  return v;
}

/** (CM6) The panel's headline ("87%", "100%  PERFECT") and the Continue line ("Continued from section 3: ..."). */
export function campaignHeadline(v: CampaignResultView): string {
  return v.perfect ? `${v.pct}%  PERFECT` : `${v.pct}%`;
}
export function continuedLine(v: CampaignResultView): string | null {
  return v.continuedFrom ? `Continued from section ${v.continuedFrom}: the sections before it have no section rating` : null;
}

/**
 * (CM5) The wire's `pc` (`MissionWire.pc`, the host's campaign percent at the end): a whole number 0-100, else null
 * (absent or junk: no percent, the old behaviour).
 */
export function parsePct(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 100 ? v : null;
}
