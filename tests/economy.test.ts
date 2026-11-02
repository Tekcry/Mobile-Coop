import { describe, expect, it } from 'vitest';
import { canBuyHq, canBuySuit, CHALLENGES, challengeProgress, defaultHq, defaultSuit, hqStats, suitLook, suitStats } from '../src/progression/suit';
import { applyPreset, applySession, buyHq, buySuit, savePreset, wearSuit } from '../src/progression/profile';
import { withAttachments } from '../src/progression/attachments';
import { defaultSave, sanitizeSave, SAVE_VERSION } from '../src/save/schema';
import { migrate } from '../src/save/migrations';
import { emptyStats } from '../src/game/modes/gameMode';
import { WEAPONS, WEAPON_IDS, modelExtents, validateWeaponDefs } from '../src/weapons/weaponDefs';
import { computeStats } from '../src/weapons/weaponStats';
import { defaultLook, HELMETS, sanitizeLook, type AvatarLook } from '../src/cosmetics/avatarLook';
import { PART_OPTIONS } from '../src/cosmetics/catalog';

describe('arsenal', () => {
  it('the CT kit validates: one rifle and one pistol (G76)', () => {
    expect(WEAPON_IDS.length).toBe(2);
    expect(new Set(WEAPON_IDS.map((w) => WEAPONS[w].class))).toEqual(new Set(['rifle', 'pistol']));
    expect(() => validateWeaponDefs({ ...WEAPONS, rifle: { ...WEAPONS.rifle, rpm: 'fast' } })).toThrow(/rifle.rpm/);
  });
  it('an integral suppressor is quiet', () => {
    expect(computeStats(WEAPONS.pistolSd).noise).toBeLessThan(0.5);
    expect(computeStats(WEAPONS.rifle).noise).toBe(1);
  });
});

describe('visible attachments', () => {
  it('a suppressor lengthens the gun and moves the muzzle out; optics, grips and mags change parts', () => {
    const base = WEAPONS.rifle;
    const baseParts = base.model.length;
    const sup = withAttachments(base, ['suppressor']);
    expect(sup.muzzle[2]).toBeCloseTo(base.muzzle[2] + 0.16, 5);
    expect(modelExtents(sup).z1).toBeGreaterThan(modelExtents(base).z1 + 0.1);
    expect(sup.model.some((p) => p.role === 'suppressor')).toBe(true);
    expect(withAttachments(base, ['scope4x']).model.some((p) => p.role === 'scope')).toBe(true);
    expect(withAttachments(base, ['grip']).model.some((p) => p.role === 'vgrip')).toBe(true);
    const ext = withAttachments(base, ['extmag']).model.find((p) => p.role === 'mag')!;
    expect(ext.size[1]).toBeGreaterThan(base.model.find((p) => p.role === 'mag')!.size[1]);
    // incompatible / doubled slots are dropped; the base def is never mutated
    expect(withAttachments(base, ['lethalBolts'])).toBe(base);
    // (feature/weapons: the CT rifle is suppressed itself, so the base has a suppressor part of its own)
    expect(base.model.length).toBe(baseParts);
  });
});

describe('suit', () => {
  it('armour trades for noise; boots quiet; gloves speed hands; pouches carry more', () => {
    const s = defaultSuit();
    expect(suitStats(s)).toMatchObject({ damage: 1, noise: 1, hands: 1, gadgets: 0 });
    s.vest = 3;
    expect(suitStats(s).damage).toBeLessThan(0.6);
    expect(suitStats(s).noise).toBeGreaterThan(1.3);
    s.boots = 3;
    expect(suitStats(s).noise).toBeLessThan(1);
    s.gloves = 2;
    s.pouches = 2;
    expect(suitStats(s).hands).toBeLessThan(0.9);
    expect(suitStats(s).gadgets).toBe(2);
  });
  it('tiers are bought in order, at level, with credits; the look changes', () => {
    const owned = defaultSuit();
    expect(canBuySuit(owned, 'vest', 2, 20, 99999).ok).toBe(false);
    expect(canBuySuit(owned, 'vest', 1, 1, 99999)).toMatchObject({ ok: false, reason: 'level' });
    expect(canBuySuit(owned, 'vest', 1, 5, 10)).toMatchObject({ ok: false, reason: 'credits' });
    expect(canBuySuit(owned, 'vest', 1, 5, 99999).ok).toBe(true);
    const look = suitLook({ ...defaultLook(), torso: 'vest', helmet: 'combat' }, { ...owned, vest: 2, goggles: 1 });
    expect(look.torso).toBe('armor');
    expect(look.helmet).toBe('headset');
    // the operator keeps the suit; goggles show the comms headset; heavy armour plates the legs
    const opLook = suitLook(defaultLook(), { ...owned, vest: 3, goggles: 1 });
    expect(opLook).toMatchObject({ torso: 'operator', helmet: 'headset', legs: 'armored' });
  });

  it('(J19 S4, R17) no three-lens goggle: the default is the comms headset, a stored trilens reads as it', () => {
    expect(defaultLook().helmet).toBe('headset');
    expect(HELMETS as readonly string[]).not.toContain('trilens');
    expect(sanitizeLook({ ...defaultLook(), helmet: 'trilens' as AvatarLook['helmet'] }).helmet).toBe('headset');
    expect(PART_OPTIONS.helmet.some((o) => o.value === 'trilens')).toBe(false);
    expect(PART_OPTIONS.helmet.find((o) => o.value === 'headset')!.req).toBeUndefined();
  });
});

describe('HQ, challenges', () => {
  it('HQ upgrades by level and price; their effects', () => {
    const h = defaultHq();
    expect(canBuyHq(h, 'revive', 1, 99999)).toMatchObject({ ok: false, reason: 'level' });
    expect(canBuyHq(h, 'revive', 10, 99999).ok).toBe(true);
    h.revive = 2;
    h.restock = 1;
    expect(canBuyHq(h, 'revive', 10, 99999)).toMatchObject({ ok: false, reason: 'maxed' });
    expect(hqStats(h)).toMatchObject({ reviveSpeed: 1.6, restock: true });
  });
  it('challenge progress from a session', () => {
    const p = challengeProgress({ takedownsByKind: { above: 3, behind: 2 }, knockouts: 4, headshots: 1, gadgetKos: 1, mode: 'infiltration', won: true, detections: 0, alarms: 0 });
    expect(p).toMatchObject({ aboveTakedowns: 3, knockouts: 4, ghostMissions: 1, hunterNoAlarm: 0 });
    expect(CHALLENGES.length).toBeGreaterThanOrEqual(6);
  });
});

describe('profile ops and save v6', () => {
  it('buy and wear suit tiers, buy HQ, presets, challenge payout', () => {
    const s = defaultSave();
    s.profile.xp = 1e6;
    s.profile.credits = 50000;
    expect(buySuit(s, 'vest', 1).ok).toBe(true);
    expect(s.suit.worn.vest).toBe(1);
    expect(wearSuit(s, 'vest', 0)).toBe(true);
    expect(wearSuit(s, 'vest', 3)).toBe(false);
    expect(buyHq(s, 'restock').ok).toBe(true);
    expect(s.hq.restock).toBe(1);
    s.loadout = { primary: 'rifle', secondary: 'pistolSd' };
    expect(savePreset(s, 2, 'gas')).toBe(true);
    s.loadout = { primary: 'pistolSd', secondary: 'rifle' };
    expect(applyPreset(s, 2)).toBe(true);
    expect(s.loadout.primary).toBe('rifle');
    expect(s.preset).toBe(2);
    const st = emptyStats('course', 'ctcourse');
    st.won = true;
    st.knockouts = 30;
    const c0 = s.profile.credits;
    const rep = applySession(s, st, 'normal');
    expect(rep.challenges).toContain('knockouts');
    expect(s.profile.credits).toBeGreaterThan(c0);
    expect(applySession(s, st, 'normal').challenges).not.toContain('knockouts');
  });
  it('v5 -> v6 keeps everything and issues the kit; v6 fields are sanitised', () => {
    const v5 = { ...defaultSave(), version: 5 } as Record<string, unknown>;
    delete v5.suit;
    delete v5.hq;
    delete v5.challenges;
    delete v5.presets;
    delete v5.preset;
    (v5.profile as { credits: number }).credits = 777;
    const { data, from } = migrate(v5);
    expect(from).toBe(5);
    const s = sanitizeSave(data);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.profile.credits).toBe(777);
    expect(s.suit.owned).toEqual(defaultSuit());
    expect(s.presets.length).toBe(3);
    const bad = sanitizeSave({ ...data, suit: { owned: { vest: 99 }, worn: { vest: 99, boots: 2 } }, hq: { revive: 7, radar: 7 }, preset: 9, presets: [{ name: '<b>x', primary: 'lmg' }] });
    expect(bad.suit.owned.vest).toBe(3);
    expect(bad.suit.worn.boots).toBe(0);
    expect(bad.hq.revive).toBe(2);
    expect('radar' in bad.hq).toBe(false);
    expect(bad.preset).toBe(2);
    expect(bad.presets[0]!.primary).toBe('pistolSd');
    expect(bad.presets[0]!.name).toBe('bx');
  });
});
