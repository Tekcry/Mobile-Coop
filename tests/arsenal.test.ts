import { describe, expect, it } from 'vitest';
import { arsenalSlot, CAMPAIGN_ARSENAL, campaignAttachments, campaignKit, campaignList, campaignLoadout, inCampaignArsenal } from '../src/config/arsenal';
import { WEAPONS, WEAPON_IDS } from '../src/weapons/weaponDefs';
import { attachmentsFor } from '../src/progression/attachments';
import { defaultSave } from '../src/save/schema';
import { loadoutEntries, lobbyLoadout } from '../src/progression/profile';
import { computeStats } from '../src/weapons/weaponStats';

describe('campaign arsenal (bible 5.6, locomotion step 16)', () => {
  it('4 primaries and 2 built sidearms, in menu order; every id exists in weapons.json', () => {
    expect(CAMPAIGN_ARSENAL.primary).toEqual(['rifle', 'smg', 'shotgun', 'dmr']);
    expect(CAMPAIGN_ARSENAL.sidearm).toEqual(['pistolSd', 'pistol']);
    for (const w of [...CAMPAIGN_ARSENAL.primary, ...CAMPAIGN_ARSENAL.sidearm]) {
      expect(WEAPON_IDS).toContain(w);
      expect(WEAPONS[w]).toBeDefined();
    }
    for (const w of CAMPAIGN_ARSENAL.primary) expect(WEAPONS[w].slot).toBe('primary');
    for (const w of CAMPAIGN_ARSENAL.sidearm) expect(WEAPONS[w].class).toBe('pistol');
    expect(campaignList('primary')).toBe(CAMPAIGN_ARSENAL.primary);
    expect(campaignList('sidearm')).toBe(CAMPAIGN_ARSENAL.sidearm);
  });

  it('defaults: the suppressed rifle and the suppressed pistol (it ships suppressed)', () => {
    expect(CAMPAIGN_ARSENAL.defaults).toEqual({ primary: 'rifle', sidearm: 'pistolSd' });
    expect(WEAPONS.pistolSd.noise ?? 1).toBeLessThan(0.6);
    // the issued kit is already the campaign default (no save change)
    const lo = defaultSave().loadout;
    expect(campaignLoadout(lo)).toEqual(lo);
  });

  it('the other ten stay in code, outside the set; slots follow the data', () => {
    const out = WEAPON_IDS.filter((w) => !inCampaignArsenal(w));
    expect(out).toHaveLength(10);
    expect(arsenalSlot('fiveseven')).toBe('sidearm');
    expect(arsenalSlot('p90')).toBe('primary');
    expect(arsenalSlot('pistol')).toBe('sidearm');
    expect(arsenalSlot('dmr')).toBe('primary');
  });

  it('campaignLoadout replaces an off-set id with its slot default and keeps one primary + one sidearm', () => {
    expect(campaignLoadout({ primary: 'fiveseven', secondary: 'smg' })).toEqual({ primary: 'pistolSd', secondary: 'smg' });
    expect(campaignLoadout({ primary: 'p90', secondary: 'pistol' })).toEqual({ primary: 'rifle', secondary: 'pistol' });
    expect(campaignLoadout({ primary: 'pistolSd', secondary: 'lmg' })).toEqual({ primary: 'pistolSd', secondary: 'rifle' });
    // two long guns (or two sidearms): the second becomes the other slot's default; order is kept
    expect(campaignLoadout({ primary: 'p90', secondary: 'sniper' })).toEqual({ primary: 'rifle', secondary: 'pistolSd' });
    expect(campaignLoadout({ primary: 'shotgun', secondary: 'dmr' })).toEqual({ primary: 'shotgun', secondary: 'pistolSd' });
    expect(campaignLoadout({ primary: 'pistol', secondary: 'pistolSd' })).toEqual({ primary: 'pistol', secondary: 'rifle' });
    // in-set kits pass through
    expect(campaignLoadout({ primary: 'pistol', secondary: 'dmr' })).toEqual({ primary: 'pistol', secondary: 'dmr' });
  });

  it('applied at use: Infiltration maps the save onto the set, sandbox and other modes do not', () => {
    const s = defaultSave();
    s.loadout = { primary: 'p90', secondary: 'sniper' };
    expect(loadoutEntries(s, 'infiltration', true).map((e) => e.id)).toEqual(['rifle', 'pistolSd']);
    expect(loadoutEntries(s, 'mission', true).map((e) => e.id)).toEqual(['p90', 'sniper']);
    expect(s.loadout).toEqual({ primary: 'p90', secondary: 'sniper' });
  });

  it('co-op (D8): an old save with an off-set gun sends the loadout Infiltration issues as its lobby loadout', () => {
    const s = defaultSave();
    s.loadout = { primary: 'p90', secondary: 'sniper' };
    const issued = loadoutEntries(s, 'infiltration', true).map((e) => e.id);
    expect(lobbyLoadout(s, true)).toEqual(issued);
    expect(lobbyLoadout(s, true)).toEqual(['rifle', 'pistolSd']);
    // ?legacy=1: the save as is
    expect(lobbyLoadout(s, false)).toEqual(['p90', 'sniper']);
    expect(campaignKit(s.loadout)).toEqual({ primary: 'rifle', sidearm: 'pistolSd' });
    expect(campaignKit({ primary: 'pistolSd', secondary: 'rifle' })).toEqual({ primary: 'rifle', sidearm: 'pistolSd' });
  });

  it('A62: the campaign rifle is issued suppressed unless another barrel part is fitted; nothing is written', () => {
    expect(campaignAttachments('rifle', [])).toEqual(['suppressor']);
    expect(campaignAttachments('rifle', ['comp'])).toEqual(['comp']);
    expect(campaignAttachments('rifle', ['suppressor'])).toEqual(['suppressor']);
    expect(campaignAttachments('smg', [])).toEqual([]);
    const s = defaultSave();
    s.loadout = { primary: 'pistolSd', secondary: 'rifle' };
    const rifle = loadoutEntries(s, 'infiltration', true).find((e) => e.id === 'rifle')!;
    expect(rifle.attachments).toContain('suppressor');
    expect(rifle.mods?.noise).toBeLessThan(1);
    expect(s.weapons.rifle.attachments).toEqual([]);
    expect(loadoutEntries(s, 'mission', true).find((e) => e.id === 'rifle')!.attachments).toEqual([]);
    // pistolSd keeps its integral suppressor (quiet with no part fitted)
    expect(computeStats(WEAPONS.pistolSd, s.weapons.pistolSd.upgrades, loadoutEntries(s, 'infiltration', true).find((e) => e.id === 'pistolSd')!.mods).noise).toBeLessThan(1);
  });

  it('?legacy=1 Infiltration is not the campaign: raw ids, no issued suppressor, the same as its lobby loadout (D8)', () => {
    const s = defaultSave();
    s.loadout = { primary: 'p90', secondary: 'sniper' };
    expect(loadoutEntries(s, 'infiltration', false).map((e) => e.id)).toEqual(['p90', 'sniper']);
    expect(loadoutEntries(s, 'infiltration', false).map((e) => e.id)).toEqual(lobbyLoadout(s, false));
    s.loadout = { primary: 'rifle', secondary: 'pistolSd' };
    expect(loadoutEntries(s, 'infiltration', false).find((e) => e.id === 'rifle')!.attachments).toEqual([]);
    // non-legacy unchanged: mapped ids, the issued suppressor
    s.loadout = { primary: 'p90', secondary: 'sniper' };
    expect(loadoutEntries(s, 'infiltration', true).map((e) => e.id)).toEqual(['rifle', 'pistolSd']);
    expect(loadoutEntries(s, 'infiltration', true).find((e) => e.id === 'rifle')!.attachments).toContain('suppressor');
  });

  it('suppressible where it makes sense: the campaign guns but the shotgun take the suppressor', () => {
    const sup = (w: (typeof WEAPON_IDS)[number]): boolean => attachmentsFor(w).some((a) => a.id === 'suppressor');
    for (const w of ['rifle', 'smg', 'dmr', 'pistolSd', 'pistol'] as const) expect(sup(w)).toBe(true);
    for (const w of ['shotgun', 'semiShotgun', 'breacher', 'crossbow'] as const) expect(sup(w)).toBe(false);
  });
});
