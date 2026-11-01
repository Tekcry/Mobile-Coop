import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN,
  CAMPAIGN_PICK_MISSION,
  CAMPAIGN_TWO_PLAYERS,
  campaignGrant,
  campaignReviveCap,
  campaignResponseKinds,
  campaignStartBlock,
  isCampaignMap,
  isCampaignMission,
  missionSectionLine,
} from '../../src/game/mission/campaign';
import { spookFact, type MissionDef } from '../../src/game/mission/missionDef';
import { MissionRunner } from '../../src/game/mission/missionRunner';
import { REVIVES_PER_MISSION } from '../../src/game/reviveClock';
import { SECTOR_REINFORCE_KIND } from '../../src/game/sectors';
import type { EnemyKind } from '../../src/ai/enemyDefs';
import { MAX_ENEMIES } from '../../src/net/protocol';
import { THREE_GREY_COATS, TWO_KEY_LEDGER, WHARF_MISSIONS } from '../../src/world/maps/tallowWharfMissions';

// (mission-rules R2) the campaign profile: cap 32 (G359), revives 2 (G126), no shield lead (Q12), no grants (Q19),
// exactly two players (G2, G48), the section banner's mission line (G336, A12)

/** A Sector Ops test mission with team steps (each viewer sees his own team's line). */
function teamOp(): MissionDef {
  return {
    id: 'teamOp',
    mode: 'sector',
    players: [2, 3, 4],
    sections: ['S1', 'S2'],
    briefing: ['Two teams in.'],
    steps: [
      { id: 'roof', section: 'S1', team: 'a', kind: 'reach', text: 'reach the roof hatch' },
      { id: 'hut', section: 'S1', team: 'b', kind: 'reach', text: 'reach the guard hut' },
      { id: 'out', section: 'S2', team: 'all', kind: 'extract', after: ['roof', 'hut'], text: 'Out through the loading bay' },
    ],
    rules: [],
  };
}

/** A plain Sector Ops mission (not a campaign one): one rule, a reach and an extract step. */
const SECTOR_TEST_MISSION: MissionDef = {
  id: 'sectorTest',
  mode: 'sector',
  players: [1, 2],
  sections: ['S1', 'S2'],
  briefing: ['A plain Sector Ops mission.'],
  steps: [
    { id: 'dl', section: 'S1', team: 'all', kind: 'reach', text: 'reach the console' },
    { id: 'out', section: 'S2', team: 'all', kind: 'extract', after: ['dl'], text: 'Out' },
  ],
  rules: [{ kind: 'noKills', scope: 'mission', text: 'No kills' }],
};

const idx = (d: MissionDef, id: string): number => d.steps.findIndex((s) => s.id === id);

describe('campaign profile', () => {
  it('the numbers: cap 32 pinned (G359), within the wire; revives 2 (G126); no shield lead (Q12)', () => {
    expect(CAMPAIGN.maxAlive).toBe(32);
    expect(CAMPAIGN.maxAlive).toBeLessThanOrEqual(MAX_ENEMIES);
    expect(CAMPAIGN.revives).toBe(REVIVES_PER_MISSION);
    expect(CAMPAIGN.revives).toBe(2);
    expect(CAMPAIGN.shieldLead).toBe(false);
  });

  it('campaign mission and campaign map', () => {
    expect(isCampaignMission(THREE_GREY_COATS)).toBe(true);
    expect(isCampaignMission(SECTOR_TEST_MISSION)).toBe(false);
    expect(isCampaignMission(null)).toBe(false);
    expect(isCampaignMission(undefined)).toBe(false);
    expect(isCampaignMap(WHARF_MISSIONS)).toBe(true);
    expect(isCampaignMap([SECTOR_TEST_MISSION])).toBe(false);
    expect(isCampaignMap([THREE_GREY_COATS, SECTOR_TEST_MISSION])).toBe(false);
    expect(isCampaignMap([])).toBe(false);
    expect(isCampaignMap(undefined)).toBe(false);
  });

  it('the start gate: exactly two on a campaign mission; a campaign map needs one of its missions', () => {
    const tgc = THREE_GREY_COATS.id;
    expect(campaignStartBlock(WHARF_MISSIONS, tgc, 2)).toBeNull();
    expect(campaignStartBlock(WHARF_MISSIONS, TWO_KEY_LEDGER.id, 2)).toBeNull();
    for (const n of [0, 1, 3, 4]) expect(campaignStartBlock(WHARF_MISSIONS, tgc, n)).toBe(CAMPAIGN_TWO_PLAYERS);
    expect(CAMPAIGN_TWO_PLAYERS).toBe('Campaign missions need exactly two players');
    // no id, an unknown id: a campaign map never runs as plain Sector Ops
    expect(campaignStartBlock(WHARF_MISSIONS, null, 2)).toBe(CAMPAIGN_PICK_MISSION);
    expect(campaignStartBlock(WHARF_MISSIONS, 'nope', 2)).toBe(CAMPAIGN_PICK_MISSION);
    expect(campaignStartBlock(WHARF_MISSIONS, SECTOR_TEST_MISSION.id, 2)).toBe(CAMPAIGN_PICK_MISSION);
    expect(CAMPAIGN_PICK_MISSION).toBe('Pick a campaign mission');
    // a Sector Ops map (with or without a sector mission): never blocked here, any player count
    for (const n of [1, 2, 3, 4]) {
      expect(campaignStartBlock([SECTOR_TEST_MISSION], SECTOR_TEST_MISSION.id, n)).toBeNull();
      expect(campaignStartBlock([SECTOR_TEST_MISSION], null, n)).toBeNull();
      expect(campaignStartBlock(undefined, null, n)).toBeNull();
      expect(campaignStartBlock([], 'x', n)).toBeNull();
    }
    // a campaign mission on a mixed map is still gated
    const mixed = [THREE_GREY_COATS, SECTOR_TEST_MISSION];
    expect(campaignStartBlock(mixed, tgc, 1)).toBe(CAMPAIGN_TWO_PLAYERS);
    expect(campaignStartBlock(mixed, tgc, 2)).toBeNull();
    expect(campaignStartBlock(mixed, SECTOR_TEST_MISSION.id, 1)).toBeNull();
  });

  it('the revive cap: 2 on a campaign mission at every difficulty, the syringes otherwise', () => {
    for (const s of [3, 2, 1, 1]) {
      expect(campaignReviveCap(THREE_GREY_COATS, s)).toBe(2);
      expect(campaignReviveCap(SECTOR_TEST_MISSION, s)).toBe(s);
      expect(campaignReviveCap(null, s)).toBe(s);
    }
  });

  it('the grant: zeroed in place (Q19 "None")', () => {
    const g = { gadget: 2, syringe: 1, medkit: 1, alarmStep: 1 };
    expect(campaignGrant(g)).toBe(g);
    expect(g).toEqual({ gadget: 0, syringe: 0, medkit: 0, alarmStep: 0 });
  });

  it('the response team: the first n become armed guards, no shield lead (Q12)', () => {
    const kinds: EnemyKind[] = ['enforcer', 'grunt', 'grunt', 'enforcer'];
    campaignResponseKinds(kinds, 3);
    expect(kinds).toEqual([SECTOR_REINFORCE_KIND, SECTOR_REINFORCE_KIND, SECTOR_REINFORCE_KIND, 'enforcer']);
    campaignResponseKinds(kinds, 9); // n past the list: clamped, no growth
    expect(kinds.length).toBe(4);
    expect(kinds.includes('enforcer')).toBe(false);
    expect(SECTOR_REINFORCE_KIND).toBe('grunt');
    const none: EnemyKind[] = [];
    campaignResponseKinds(none, 0);
    expect(none).toEqual([]);
  });

  it('the section line on Three Grey Coats: W1 tgc-1, done steps skipped, W2 tgc-3 at begin, W3 none', () => {
    const d = THREE_GREY_COATS;
    const r = new MissionRunner(d, 2);
    r.snapshot('W1', 0);
    expect(missionSectionLine(r, 'all')).toBe(d.steps[idx(d, 'tgc-1')]!.text);
    expect(r.complete(idx(d, 'tgc-1'))).toBe(true);
    r.update(1);
    expect(missionSectionLine(r, 'all')).toBe(d.steps[idx(d, 'tgc-2')]!.text);
    // W2 right after its begin, before any `update`, W1 never finished (tgc-3 still locked): the fallback line, not ''
    const fresh = new MissionRunner(d, 2);
    fresh.snapshot('W2', 0);
    expect(fresh.isOpen(idx(d, 'tgc-3'))).toBe(false);
    expect(missionSectionLine(fresh, 'all')).toBe(d.steps[idx(d, 'tgc-3')]!.text);
    // W2 after W1's work: tgc-3 open (the optional step never shows)
    expect(r.complete(idx(d, 'tgc-2'))).toBe(true);
    r.snapshot('W2', 2);
    expect(missionSectionLine(r, 'all')).toBe(d.steps[idx(d, 'tgc-3')]!.text);
    // the moved line once Teale has bolted (R1's spook fact)
    expect(r.setFlag(spookFact(d.steps[idx(d, 'tgc-3')]!))).toBe(true);
    expect(missionSectionLine(r, 'all')).toBe(d.steps[idx(d, 'tgc-3')]!.boltText);
    expect(missionSectionLine(fresh, 'all')).toBe(d.steps[idx(d, 'tgc-3')]!.text);
    fresh.setFlag(spookFact(d.steps[idx(d, 'tgc-3')]!));
    expect(missionSectionLine(fresh, 'all')).toBe(d.steps[idx(d, 'tgc-3')]!.boltText);
    // W3: TGC has no step there (no "Take the ledger" banner)
    r.snapshot('W3', 3);
    expect(missionSectionLine(r, 'all')).toBe('');
    // a run section the mission does not run in
    r.snapshot(-1, 4);
    expect(missionSectionLine(r, 'all')).toBe('');
  });

  it('the section line on Two-Key Ledger at W3 is its own step, never the other mission', () => {
    const d = TWO_KEY_LEDGER;
    const r = new MissionRunner(d, 2);
    r.snapshot('W3', 0);
    const line = missionSectionLine(r, 'all');
    expect(line).toBe(d.steps[idx(d, 'tkl-2')]!.text);
  });

  it('a Sector Ops mission with team steps: each viewer gets his own team line', () => {
    const d = teamOp();
    const r = new MissionRunner(d, 2);
    r.snapshot('S1', 0);
    expect(missionSectionLine(r, 'a')).toBe('Team A: reach the roof hatch');
    expect(missionSectionLine(r, 'b')).toBe('Team B: reach the guard hut');
    expect(missionSectionLine(r, 'all')).toBe('Team A: reach the roof hatch');
    r.complete(idx(d, 'roof'));
    expect(missionSectionLine(r, 'a')).toBe('');
    expect(missionSectionLine(r, 'b')).toBe('Team B: reach the guard hut');
    expect(missionSectionLine(r, 'all')).toBe('Team B: reach the guard hut');
  });
});
