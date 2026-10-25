/**
 * (mission-rules R2) The campaign profile: the rules a campaign mission (`MissionDef.mode === 'campaign'`) plays by
 * where they differ from Sector Ops. Pure and Babylon-free, no net imports (SectorMode, `main.ts` and the co-op session
 * read it).
 * - G2 "2 player coop campaign only, unable to be completed solo." and G48 "No bot anywhere": a campaign mission starts
 *   with exactly two players (`campaignStartBlock`).
 * - G126 "30-second revive, 2 per mission": the revive cap is `CAMPAIGN.revives` at every difficulty, never the Sector
 *   Ops syringes (`campaignReviveCap`).
 * - G155 "Adopt CT's way" (no heavies or dogs, narrowed to the campaign by G297 / G307) and Q12 "No, armed only
 *   (Recommended)": an alarm stage's response team is all armed guards, no riot-shield lead (`campaignResponseKinds`).
 * - G359 "32 alive": the campaign's live guard cap (`CAMPAIGN.maxAlive`).
 * - Q19 "None (Recommended)": a campaign section's rating grants nothing (`campaignGrant`); the card still shows the marks.
 * - G336 / G351 "What and where": a section's banner names the mission's step there (`missionSectionLine`).
 * A campaign map (Tallow Wharf) is one whose missions are all campaign (BRIEF A8); no new `MapDef` field.
 */
import type { EnemyKind } from '../../ai/enemyDefs';
import type { Grant } from '../rating/sectionRating';
import { REVIVES_PER_MISSION } from '../reviveClock';
import { SECTOR_REINFORCE_KIND } from '../sectors';
import { spookFact, type MissionDef, type TeamId } from './missionDef';
import type { MissionRunner } from './missionRunner';
import { objectiveRows, stepLine } from './missionText';

/**
 * The campaign's numbers. `maxAlive` (G359 "32 alive"): a ceiling, not a target (a section's guards plus its alarm
 * reinforcements stay under it); named here, pinned to 32, so a campaign entry outside SectorMode keeps it and a Sector
 * Ops cap change never moves it. `revives` (G126): per mission, every difficulty. `shieldLead` (Q12): never.
 */
export const CAMPAIGN = { maxAlive: 32, revives: REVIVES_PER_MISSION, shieldLead: false } as const;

/** The start refusals (the lobby, the autostart toast). */
export const CAMPAIGN_PICK_MISSION = 'Pick a campaign mission';
export const CAMPAIGN_TWO_PLAYERS = 'Campaign missions need exactly two players';

/** The mission is a campaign mission (null / undefined: none bound, Sector Ops). */
export function isCampaignMission(def: MissionDef | null | undefined): boolean {
  return def?.mode === 'campaign';
}

/** Every mission of the map is a campaign mission (A8; a map with none is not a campaign map). */
export function isCampaignMap(missions: readonly MissionDef[] | undefined): boolean {
  if (!missions || missions.length === 0) return false;
  for (const m of missions) if (m.mode !== 'campaign') return false;
  return true;
}

/**
 * Why a match on a map with `missions` cannot start with mission `missionId` and `players` in the room, or null when it
 * can. Null when neither the map is a campaign map nor the picked mission is a campaign one (Sector Ops as before);
 * else `CAMPAIGN_PICK_MISSION` when none of the map's campaign missions has that id (a campaign map never runs as plain
 * Sector Ops), `CAMPAIGN_TWO_PLAYERS` when the room does not hold exactly two (G2, G48), else null. No flag argument:
 * both callers sit behind FLG's gates (`mapBootAllowed` in `main.ts`, the session's `sectorMission`).
 */
export function campaignStartBlock(missions: readonly MissionDef[] | undefined, missionId: string | null, players: number): string | null {
  const picked = missionId && missions ? missions.find((m) => m.id === missionId) : undefined;
  if (!isCampaignMap(missions) && !isCampaignMission(picked)) return null;
  if (!isCampaignMission(picked)) return CAMPAIGN_PICK_MISSION;
  if (players !== 2) return CAMPAIGN_TWO_PLAYERS;
  return null;
}

/** The revive cap: `CAMPAIGN.revives` for a campaign mission (G126, every difficulty), else the Sector Ops `syringes`. */
export function campaignReviveCap(def: MissionDef | null | undefined, syringes: number): number {
  return isCampaignMission(def) ? CAMPAIGN.revives : syringes;
}

/** (Q19 "None") A campaign section's rating grants nothing: zeroes `g` in place and returns it. */
export function campaignGrant(g: Grant): Grant {
  g.gadget = 0;
  g.syringe = 0;
  g.medkit = 0;
  g.alarmStep = 0;
  return g;
}

/**
 * (Q12 "No, armed only", G155) The response team's first `n` kinds become armed guards (`SECTOR_REINFORCE_KIND`): no
 * riot-shield lead in a campaign mission. In place, no allocation (it runs at an alarm stage).
 */
export function campaignResponseKinds(kinds: EnemyKind[], n: number): void {
  const m = Math.min(n, kinds.length);
  for (let i = 0; i < m; i++) kinds[i] = SECTOR_REINFORCE_KIND;
}

/**
 * (G336 / G351, BRIEF A12) The section banner's line in a mission: the viewer's first open required step of the
 * runner's section (R1's moved line when the step's target has bolted). At a section's begin the steps may still be
 * locked (`begin` snapshots without `runner.update`), so then the first required, not done step of the section the
 * viewer sees (team 'all' or his own). '' when the section is not the mission's or has no such step (the banner then
 * shows only its title). Called once per section start: it allocates (the rows), which is fine there.
 */
export function missionSectionLine(runner: MissionRunner, viewer: TeamId): string {
  const si = runner.section;
  if (si < 0) return '';
  for (const r of objectiveRows(runner, viewer, false)) {
    if (r.done || r.optional) continue;
    if (viewer !== 'all' && r.team !== 'all' && r.team !== viewer) continue;
    return r.text;
  }
  const d = runner.def;
  const sec = d.sections[si];
  for (let i = 0; i < d.steps.length; i++) {
    const s = d.steps[i]!;
    if (s.section !== sec || s.optional || runner.isDone(i)) continue;
    if (viewer !== 'all' && s.team !== 'all' && s.team !== viewer) continue;
    return stepLine(d, i, s.kind === 'interrogate' && !!s.bolt && runner.hasFlag(spookFact(s)));
  }
  return '';
}
