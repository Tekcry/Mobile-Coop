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
}
