import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_KEYS,
  CAMPAIGN_ORDER,
  CONTINUE_VALUE,
  PROLOGUE_BRIEFING,
  SPOILER_LINE,
  TWO_PLAYERS_LINE,
  briefingPanel,
  briefingPanelLines,
  campaignEntries,
  campaignEntry,
  continueRowText,
  entryForRoom,
  entryRowText,
  lobbyRows,
  lockedDifficulty,
  missionRowOptions,
  spoiler,
} from '../src/game/mission/campaignOrder';
import { briefingLines, rulesLine } from '../src/game/mission/missionText';
import { MAPS } from '../src/world/maps';

// (campaign-mode CM1, PLAN 3.1) the campaign order: prologue, then Mission 1's two Tallow missions (A1)

const keys = (es: readonly { key: string }[]): string[] => es.map((e) => e.key);
const MAPS_LIKE = [
  { id: 'ctcourse' },
  { id: 'tallowWharf', missions: [{ id: 'threeGreyCoats' }, { id: 'twoKeyLedger' }] },
];

describe('campaign order', () => {
  it('is the prologue then both Mission 1 entries (A1)', () => {
    expect(CAMPAIGN_KEYS).toEqual(['prologue', 'threeGreyCoats', 'twoKeyLedger']);
    expect(CAMPAIGN_ORDER.map((e) => `${e.label}: ${e.title}`)).toEqual([
      'Prologue: Marlow Yard (training)',
      'Mission 1: Three Grey Coats',
      'Mission 1: Two-Key Ledger',
    ]);
    expect(CAMPAIGN_ORDER[0]).toMatchObject({ map: 'ctcourse', mode: 'course' });
    expect(CAMPAIGN_ORDER[0]!.mission).toBeUndefined();
    expect(CAMPAIGN_ORDER[1]).toMatchObject({ map: 'tallowWharf', mode: 'sector', mission: 'threeGreyCoats' });
    expect(CAMPAIGN_ORDER[2]).toMatchObject({ map: 'tallowWharf', mode: 'sector', mission: 'twoKeyLedger' });
    expect(campaignEntry('twoKeyLedger')?.title).toBe('Two-Key Ledger');
    expect(campaignEntry('nope')).toBeNull();
  });

  it('lists every entry with missions on and the maps present', () => {
    expect(keys(campaignEntries(MAPS_LIKE, true))).toEqual(['prologue', 'threeGreyCoats', 'twoKeyLedger']);
  });

  it('flag filter: missions off lists the prologue only (A10)', () => {
    expect(keys(campaignEntries(MAPS_LIKE, false))).toEqual(['prologue']);
  });

  it('map filter: an entry whose map is missing is dropped', () => {
    expect(keys(campaignEntries([{ id: 'ctcourse' }], true))).toEqual(['prologue']);
    expect(keys(campaignEntries([MAPS_LIKE[1]!], true))).toEqual(['threeGreyCoats', 'twoKeyLedger']);
    expect(campaignEntries([], true)).toEqual([]);
  });

  it('mission filter: an entry whose mission the map does not define is dropped', () => {
    const one = [{ id: 'ctcourse' }, { id: 'tallowWharf', missions: [{ id: 'threeGreyCoats' }] }];
    expect(keys(campaignEntries(one, true))).toEqual(['prologue', 'threeGreyCoats']);
    expect(keys(campaignEntries([{ id: 'ctcourse' }, { id: 'tallowWharf' }], true))).toEqual(['prologue']);
  });

  it('the real MAPS hold every entry (Tallow Wharf is on master)', () => {
    expect(keys(campaignEntries(MAPS, true))).toEqual(['prologue', 'threeGreyCoats', 'twoKeyLedger']);
    expect(keys(campaignEntries(MAPS, false))).toEqual(['prologue']);
  });

  it('entryForRoom maps a room back to its entry', () => {
    expect(entryForRoom('course', 'ctcourse', null)?.key).toBe('prologue');
    expect(entryForRoom('course', 'ctcourseReplan', '')?.key).toBe('prologue');
    expect(entryForRoom('sector', 'tallowWharf', 'threeGreyCoats')?.key).toBe('threeGreyCoats');
    expect(entryForRoom('sector', 'tallowWharf', 'twoKeyLedger')?.key).toBe('twoKeyLedger');
    // not a campaign room
    expect(entryForRoom('course', 'courselab', null)).toBeNull();
    expect(entryForRoom('sector', 'tallowWharf', null)).toBeNull();
    expect(entryForRoom('sector', 'tallowWharf', 'bogus')).toBeNull();
    expect(entryForRoom('sector', 'kestrel', 'threeGreyCoats')).toBeNull();
    expect(entryForRoom('sandbox', 'ctcourse', null)).toBeNull();
  });

  it('spoilers: past the first entry not done in the given progress (A3)', () => {
    const none = { done: {} };
    expect(spoiler('prologue', none)).toBe(false);
    expect(spoiler('threeGreyCoats', none)).toBe(true);
    expect(spoiler('twoKeyLedger', none)).toBe(true);
    const pro = { done: { prologue: { best: -1 } } };
    expect(spoiler('prologue', pro)).toBe(false);
    expect(spoiler('threeGreyCoats', pro)).toBe(false);
    expect(spoiler('twoKeyLedger', pro)).toBe(true);
    const all = { done: { prologue: {}, threeGreyCoats: {}, twoKeyLedger: {} } };
    for (const k of CAMPAIGN_KEYS) expect(spoiler(k, all)).toBe(false);
    // a gap: the first entry not done decides
    expect(spoiler('threeGreyCoats', { done: { twoKeyLedger: {} } })).toBe(true);
    expect(spoiler('bogus', none)).toBe(false);
  });
});

// (campaign-mode CM4, PLAN 3.5) the lobby's Mission row, Continue, the locked difficulty, the briefing panel, the rows
const TALLOW = MAPS.find((m) => m.id === 'tallowWharf')!;
const SAVE = { key: 'threeGreyCoats', section: 1, difficulty: 'hard' };

describe('lobby Mission row (CM4)', () => {
  it('row text is "<label>: <title>"', () => {
    expect(CAMPAIGN_ORDER.map(entryRowText)).toEqual(['Prologue: Marlow Yard (training)', 'Mission 1: Three Grey Coats', 'Mission 1: Two-Key Ledger']);
  });

  it('Continue row names the mission and the save section (a run index into the map sections)', () => {
    expect(continueRowText(SAVE, TALLOW.sectors)).toBe('Continue: Three Grey Coats, Arcade lofts');
    expect(continueRowText({ ...SAVE, key: 'twoKeyLedger', section: 2 }, TALLOW.sectors)).toBe('Continue: Two-Key Ledger, Counting house');
    expect(continueRowText({ ...SAVE, section: 9 }, TALLOW.sectors)).toBe('Continue: Three Grey Coats, Section 10');
    expect(continueRowText(SAVE, undefined)).toBe('Continue: Three Grey Coats, Section 2');
  });

  it('options: the Continue row first with a listed save, then the entries in order', () => {
    const all = campaignEntries(MAPS, true);
    expect(missionRowOptions(all, null, TALLOW.sectors).map((o) => o.value)).toEqual(['prologue', 'threeGreyCoats', 'twoKeyLedger']);
    const withSave = missionRowOptions(all, SAVE, TALLOW.sectors);
    expect(withSave.map((o) => o.value)).toEqual([CONTINUE_VALUE, 'prologue', 'threeGreyCoats', 'twoKeyLedger']);
    expect(withSave[0]!.label).toBe('Continue: Three Grey Coats, Arcade lofts');
    // missions off: the prologue only, and a save of a Mission 1 entry is not offered
    expect(missionRowOptions(campaignEntries(MAPS, false), SAVE, TALLOW.sectors).map((o) => o.value)).toEqual(['prologue']);
  });

  it('a Continue locks the difficulty to the save (A9)', () => {
    expect(lockedDifficulty(SAVE)).toBe('hard');
    expect(lockedDifficulty(null)).toBeNull();
    expect(lockedDifficulty(undefined)).toBeNull();
  });
});

describe('briefing panel (CM4, A4)', () => {
  const tgc = campaignEntry('threeGreyCoats')!;
  const def = TALLOW.missions!.find((d) => d.id === 'threeGreyCoats')!;
  const text = { lines: briefingLines(def), rules: rulesLine(def) };

  it('a mission: its briefing lines, rules line, "Needs exactly two players" and the difficulty', () => {
    const p = briefingPanel(tgc, text, { done: { prologue: {} } }, 'Normal');
    expect(p.title).toBe('Mission 1: Three Grey Coats');
    expect(p.lines).toEqual(briefingLines(def));
    expect(p.lines[0]).toBe(def.briefing[0]);
    expect(p.rules).toBe(rulesLine(def));
    expect(p.players).toBe(TWO_PLAYERS_LINE);
    expect(p.players).toBe('Needs exactly two players');
    expect(p.difficulty).toBe('Difficulty: Normal');
    expect(p.spoiler).toBeNull();
    expect(briefingPanelLines(p)).toEqual([...briefingLines(def), ...(p.rules ? [p.rules] : []), 'Needs exactly two players', 'Difficulty: Normal']);
  });

  it('the prologue: its own lines, no rules', () => {
    const p = briefingPanel(campaignEntry('prologue')!, null, { done: {} }, 'Easy');
    expect(p.title).toBe('Prologue: Marlow Yard (training)');
    expect(p.lines).toEqual([...PROLOGUE_BRIEFING]);
    expect(p.rules).toBe('');
    expect(p.spoiler).toBeNull();
  });

  it('spoilers come from the reader own progress, never the host (plan check polish 5)', () => {
    const hostProgress = { done: { prologue: {}, threeGreyCoats: {} } };
    const clientProgress = { done: {} };
    expect(briefingPanel(tgc, text, hostProgress, 'Normal').spoiler).toBeNull();
    // the same pick on the client: its own (empty) progress shows the spoiler line, first in the panel
    const c = briefingPanel(tgc, text, clientProgress, 'Normal');
    expect(c.spoiler).toBe(SPOILER_LINE);
    expect(briefingPanelLines(c)[0]).toBe('Story spoilers ahead');
    // still loading: no spoiler line yet
    expect(briefingPanel(tgc, text, null, 'Normal').spoiler).toBeNull();
  });

  it('a Continue titles the panel with the Continue row and marks the difficulty as the save', () => {
    const p = briefingPanel(tgc, text, { done: {} }, 'Hard', continueRowText(SAVE, TALLOW.sectors));
    expect(p.title).toBe('Continue: Three Grey Coats, Arcade lofts');
    expect(p.difficulty).toBe('Difficulty: Hard (kept from the save)');
  });
});

describe('lobby rows (CM4)', () => {
  const pro = campaignEntry('prologue')!;
  const tgc = campaignEntry('threeGreyCoats')!;
  const base = { host: true, continued: false, weather: false };

  it('flag off: the rows are exactly today (host and client, every mode)', () => {
    for (const entry of [null, pro, tgc]) {
      expect(lobbyRows({ ...base, campaign: false, mode: 'course', entry })).toEqual(['mode', 'map', 'difficulty', 'bay', 'room']);
      expect(lobbyRows({ ...base, campaign: false, mode: 'sector', entry, continued: true, weather: true })).toEqual(['mode', 'map', 'difficulty', 'weather', 'room']);
      expect(lobbyRows({ ...base, campaign: false, host: false, mode: 'course', entry, weather: true })).toEqual(['mode', 'map', 'difficulty', 'weather']);
    }
  });

  it('flag on, a campaign entry: the Mission row replaces Map; the prologue keeps its bay row', () => {
    expect(lobbyRows({ ...base, campaign: true, mode: 'course', entry: pro })).toEqual(['mode', 'campaign', 'difficulty', 'bay', 'room']);
    expect(lobbyRows({ ...base, campaign: true, mode: 'sector', entry: tgc })).toEqual(['mode', 'campaign', 'difficulty', 'room']);
    expect(lobbyRows({ ...base, campaign: true, host: false, mode: 'sector', entry: tgc })).toEqual(['mode', 'campaign', 'difficulty']);
    // no entry (plain Sector Ops): as today
    expect(lobbyRows({ ...base, campaign: true, mode: 'sector', entry: null })).toEqual(['mode', 'map', 'difficulty', 'room']);
  });

  it('a Continue locks the host difficulty row (the client row is locked anyway)', () => {
    expect(lobbyRows({ ...base, campaign: true, mode: 'sector', entry: tgc, continued: true })).toEqual(['mode', 'campaign', 'difficultyLocked', 'room']);
    expect(lobbyRows({ ...base, campaign: true, host: false, mode: 'sector', entry: tgc, continued: true })).toEqual(['mode', 'campaign', 'difficulty']);
  });
});
