import { describe, expect, it } from 'vitest';
import { campaignUnlocked, defaultMode, isParkedMode, PARKED_MODES, showEconomy, visibleModes } from '../src/core/legacy';
import { applyPreset, ownsOrOpen, setAttachment, setLoadout } from '../src/progression/profile';
import { defaultSave, sanitizeSave } from '../src/save/schema';

const PLAY = [{ id: 'wave' }, { id: 'mission' }, { id: 'clear' }, { id: 'infiltration' }, { id: 'training' }, { id: 'sandbox' }];
const LOBBY = [{ value: 'wave' }, { value: 'clear' }, { value: 'infiltration' }, { value: 'sandbox' }, { value: 'tdm' }, { value: 'ffa' }];

describe('legacy (3.5 parked content)', () => {
  it('parks Wave, Mission, Hunter, TDM and FFA only', () => {
    expect([...PARKED_MODES].sort()).toEqual(['clear', 'ffa', 'mission', 'tdm', 'wave']);
    for (const m of ['infiltration', 'training', 'sandbox']) expect(isParkedMode(m)).toBe(false);
  });
  it('the Play screen lists Infiltration, Training and Free Roam without legacy', () => {
    expect(visibleModes(PLAY, false).map((m) => m.id)).toEqual(['infiltration', 'training', 'sandbox']);
    expect(visibleModes(PLAY, true)).toHaveLength(6);
  });
  it('the co-op lobby lists Infiltration and Free Roam without legacy (4 players max stays elsewhere)', () => {
    expect(visibleModes(LOBBY, false).map((m) => m.value)).toEqual(['infiltration', 'sandbox']);
    expect(visibleModes(LOBBY, true)).toHaveLength(6);
  });
  it('the default mode is Infiltration, or Wave with legacy', () => {
    expect(defaultMode(false)).toBe('infiltration');
    expect(defaultMode(true)).toBe('wave');
  });
  it('the campaign is unlocked and the economy hidden when legacy is off, and the reverse with it', () => {
    expect(campaignUnlocked(false)).toBe(true);
    expect(campaignUnlocked(true)).toBe(false);
    expect(showEconomy(false)).toBe(false);
    expect(showEconomy(true)).toBe(true);
  });
});

describe('campaign loadout (nothing bought, nothing saved as unlocked)', () => {
  it('opens weapons and attachments only', () => {
    const s = defaultSave();
    expect(ownsOrOpen(s, 'weapon:sniper', false)).toBe(false);
    expect(ownsOrOpen(s, 'weapon:sniper', true)).toBe(true);
    expect(ownsOrOpen(s, 'att:suppressor', true)).toBe(true);
    expect(ownsOrOpen(s, 'camo:gold', true)).toBe(false);
    expect(ownsOrOpen(s, 'part:anything', true)).toBe(false);
  });
  it('setLoadout / applyPreset / setAttachment take a locked choice only in the campaign, and unlock nothing', () => {
    const s = defaultSave();
    const unlocks = [...s.unlocks];
    const credits = s.profile.credits;
    expect(setLoadout(s, 'primary', 'sniper')).toBe(false);
    expect(setLoadout(s, 'primary', 'sniper', true)).toBe(true);
    expect(s.loadout.primary).toBe('sniper');
    s.presets[1]!.primary = 'shotgun';
    expect(applyPreset(s, 1, true)).toBe(true);
    expect(s.loadout.primary).toBe('shotgun');
    expect(setAttachment(s, 'rifle', 'zzz-unknown', true, true)).toBe(true);
    expect(s.unlocks).toEqual(unlocks);
    expect(s.profile.credits).toBe(credits);
  });
  it('the sanitiser keeps a campaign loadout only when asked, and the default sanitising is unchanged', () => {
    const d = defaultSave() as unknown as Record<string, unknown>;
    d.loadout = { primary: 'sniper', secondary: 'shotgun' };
    expect(sanitizeSave(d).loadout).toEqual({ primary: 'pistolSd', secondary: 'rifle' });
    expect(sanitizeSave(d, true).loadout).toEqual({ primary: 'sniper', secondary: 'shotgun' });
    expect(sanitizeSave(d, true).unlocks).not.toContain('weapon:sniper');
    d.loadout = { primary: 'sniper', secondary: 'sniper' };
    expect(sanitizeSave(d, true).loadout.secondary).not.toBe('sniper');
  });
});
