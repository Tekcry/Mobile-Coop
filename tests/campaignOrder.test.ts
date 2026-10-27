import { describe, expect, it } from 'vitest';
import { CAMPAIGN_KEYS, CAMPAIGN_ORDER, campaignEntries, campaignEntry, entryForRoom, spoiler } from '../src/game/mission/campaignOrder';
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
    expect(entryForRoom('sector', 'warehouseOps', 'threeGreyCoats')).toBeNull();
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
