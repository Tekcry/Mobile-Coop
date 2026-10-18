import { describe, expect, it } from 'vitest';
import { campaignUnlocked, defaultMode, isParkedMode, PARKED_MODES, showEconomy, visibleModes } from '../src/core/legacy';
import { applyPreset, ownsOrOpen, setAttachment, setLoadout } from '../src/progression/profile';
import { defaultSave, sanitizeSave } from '../src/save/schema';

const PLAY = [{ id: 'mission' }, { id: 'clear' }, { id: 'infiltration' }, { id: 'sandbox' }];
const LOBBY = [{ value: 'clear' }, { value: 'infiltration' }, { value: 'sandbox' }, { value: 'course' }];

describe('legacy (3.5 parked content)', () => {
  it('parks Mission and Hunter only', () => {
    expect([...PARKED_MODES].sort()).toEqual(['clear', 'mission']);
    for (const m of ['infiltration', 'sandbox', 'course']) expect(isParkedMode(m)).toBe(false);
  });
  it('the Play screen lists Infiltration and Free Roam without legacy', () => {
    expect(visibleModes(PLAY, false).map((m) => m.id)).toEqual(['infiltration', 'sandbox']);
    expect(visibleModes(PLAY, true)).toHaveLength(4);
  });
  it('the co-op lobby lists Infiltration and Free Roam without legacy (4 players max stays elsewhere)', () => {
    expect(visibleModes(LOBBY, false).map((m) => m.value)).toEqual(['infiltration', 'sandbox', 'course']);
    expect(visibleModes(LOBBY, true)).toHaveLength(4);
  });
  it('the default mode is Infiltration, or Hunter with legacy', () => {
    expect(defaultMode(false)).toBe('infiltration');
    expect(defaultMode(true)).toBe('clear');
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
    // both CT kit guns are issued (G76): the locked choice is an attachment
    expect(setAttachment(s, 'rifle', 'scope4x', true)).toBe(false);
    expect(setAttachment(s, 'rifle', 'scope4x', true, true)).toBe(true);
    expect(setLoadout(s, 'primary', 'rifle', true)).toBe(true);
    expect(s.loadout.primary).toBe('rifle');
    s.presets[1]!.primary = 'pistolSd';
    s.presets[1]!.secondary = 'rifle';
    expect(applyPreset(s, 1, true)).toBe(true);
    expect(s.loadout.primary).toBe('pistolSd');
    expect(setAttachment(s, 'rifle', 'zzz-unknown', true, true)).toBe(true);
    expect(s.unlocks).toEqual(unlocks);
    expect(s.profile.credits).toBe(credits);
  });
  it('the sanitiser keeps the CT kit loadout and repairs unknown or doubled guns in both modes', () => {
    const d = defaultSave() as unknown as Record<string, unknown>;
    d.loadout = { primary: 'rifle', secondary: 'pistolSd' };
    expect(sanitizeSave(d).loadout).toEqual({ primary: 'rifle', secondary: 'pistolSd' });
    expect(sanitizeSave(d, true).loadout).toEqual({ primary: 'rifle', secondary: 'pistolSd' });
    d.loadout = { primary: 'sniper', secondary: 'shotgun' };
    expect(sanitizeSave(d).loadout).toEqual({ primary: 'pistolSd', secondary: 'rifle' });
    expect(sanitizeSave(d, true).loadout).toEqual({ primary: 'pistolSd', secondary: 'rifle' });
    d.loadout = { primary: 'rifle', secondary: 'rifle' };
    expect(sanitizeSave(d, true).loadout.secondary).toBe('pistolSd');
  });
});
