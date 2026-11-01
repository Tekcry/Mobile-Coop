import { describe, expect, it } from 'vitest';
import { arsenalSlot, CAMPAIGN_ARSENAL, campaignAttachments, campaignKit, campaignList, campaignLoadout, inCampaignArsenal } from '../src/config/arsenal';
import { WEAPONS, WEAPON_IDS } from '../src/weapons/weaponDefs';
import { attachmentsFor } from '../src/progression/attachments';
import { defaultSave } from '../src/save/schema';
import { loadoutEntries, lobbyLoadout } from '../src/progression/profile';
import { computeStats } from '../src/weapons/weaponStats';

describe('campaign arsenal (G76: the CT kit)', () => {
  it('one rifle and one pistol, and they are every gun in weapons.json (G115)', () => {
    expect(CAMPAIGN_ARSENAL.primary).toEqual(['rifle']);
    expect(CAMPAIGN_ARSENAL.sidearm).toEqual(['pistolSd']);
    expect([...WEAPON_IDS].sort()).toEqual(['pistolSd', 'rifle']);
    for (const w of [...CAMPAIGN_ARSENAL.primary, ...CAMPAIGN_ARSENAL.sidearm]) expect(WEAPONS[w]).toBeDefined();
    expect(WEAPONS.rifle.slot).toBe('primary');
    expect(WEAPONS.pistolSd.class).toBe('pistol');
    expect(campaignList('primary')).toBe(CAMPAIGN_ARSENAL.primary);
    expect(campaignList('sidearm')).toBe(CAMPAIGN_ARSENAL.sidearm);
    for (const w of WEAPON_IDS) expect(inCampaignArsenal(w)).toBe(true);
    expect(arsenalSlot('rifle')).toBe('primary');
    expect(arsenalSlot('pistolSd')).toBe('sidearm');
  });

  it('defaults: the suppressed rifle and the suppressed pistol (it ships suppressed)', () => {
    expect(CAMPAIGN_ARSENAL.defaults).toEqual({ primary: 'rifle', sidearm: 'pistolSd' });
    expect(WEAPONS.pistolSd.noise ?? 1).toBeLessThan(0.6);
    // the issued kit is already the campaign default (no save change)
    const lo = defaultSave().loadout;
    expect(campaignLoadout(lo)).toEqual(lo);
  });

  it('campaignLoadout keeps one primary + one sidearm in the save order', () => {
    expect(campaignLoadout({ primary: 'pistolSd', secondary: 'rifle' })).toEqual({ primary: 'pistolSd', secondary: 'rifle' });
    expect(campaignLoadout({ primary: 'rifle', secondary: 'pistolSd' })).toEqual({ primary: 'rifle', secondary: 'pistolSd' });
    // two of a slot: the second becomes the other slot's default
    expect(campaignLoadout({ primary: 'rifle', secondary: 'rifle' })).toEqual({ primary: 'rifle', secondary: 'pistolSd' });
    expect(campaignLoadout({ primary: 'pistolSd', secondary: 'pistolSd' })).toEqual({ primary: 'pistolSd', secondary: 'rifle' });
  });

  it('applied at use: Sector Ops and other modes issue the save loadout; sandbox issues both guns', () => {
    const s = defaultSave();
    s.loadout = { primary: 'rifle', secondary: 'pistolSd' };
    expect(loadoutEntries(s, 'sector', true).map((e) => e.id)).toEqual(['rifle', 'pistolSd']);
    expect(loadoutEntries(s, 'course', true).map((e) => e.id)).toEqual(['rifle', 'pistolSd']);
    expect(loadoutEntries(s, 'sandbox', true).map((e) => e.id)).toEqual(['rifle', 'pistolSd']);
  });

  it('co-op (D8): the lobby loadout is the loadout Sector Ops issues', () => {
    const s = defaultSave();
    const issued = loadoutEntries(s, 'sector', true).map((e) => e.id);
    expect(lobbyLoadout(s, true)).toEqual(issued);
    expect(lobbyLoadout(s, false)).toEqual([s.loadout.primary, s.loadout.secondary]);
    expect(campaignKit({ primary: 'pistolSd', secondary: 'rifle' })).toEqual({ primary: 'rifle', sidearm: 'pistolSd' });
    expect(campaignKit({ primary: 'rifle', secondary: 'pistolSd' })).toEqual({ primary: 'rifle', sidearm: 'pistolSd' });
  });

  it('A62: the campaign rifle is issued suppressed unless another barrel part is fitted; nothing is written', () => {
    expect(campaignAttachments('rifle', [])).toEqual(['suppressor']);
    expect(campaignAttachments('rifle', ['comp'])).toEqual(['comp']);
    expect(campaignAttachments('rifle', ['suppressor'])).toEqual(['suppressor']);
    expect(campaignAttachments('pistolSd', [])).toEqual([]);
    const s = defaultSave();
    s.loadout = { primary: 'pistolSd', secondary: 'rifle' };
    const rifle = loadoutEntries(s, 'sector', true).find((e) => e.id === 'rifle')!;
    expect(rifle.attachments).toContain('suppressor');
    expect(rifle.mods?.noise).toBeLessThan(1);
    expect(s.weapons.rifle.attachments).toEqual([]);
    expect(loadoutEntries(s, 'course', true).find((e) => e.id === 'rifle')!.attachments).toEqual([]);
    // pistolSd keeps its integral suppressor (quiet with no part fitted)
    expect(computeStats(WEAPONS.pistolSd, s.weapons.pistolSd.upgrades, loadoutEntries(s, 'sector', true).find((e) => e.id === 'pistolSd')!.mods).noise).toBeLessThan(1);
  });

  it('with campaignOpen off nothing is issued: no suppressor, the same as the lobby loadout (D8)', () => {
    const s = defaultSave();
    s.loadout = { primary: 'rifle', secondary: 'pistolSd' };
    expect(loadoutEntries(s, 'sector', false).map((e) => e.id)).toEqual(lobbyLoadout(s, false));
    expect(loadoutEntries(s, 'sector', false).find((e) => e.id === 'rifle')!.attachments).toEqual([]);
    expect(loadoutEntries(s, 'sector', true).find((e) => e.id === 'rifle')!.attachments).toContain('suppressor');
  });

  it('both CT kit guns take the suppressor', () => {
    for (const w of WEAPON_IDS) expect(attachmentsFor(w).some((a) => a.id === 'suppressor')).toBe(true);
  });
});
