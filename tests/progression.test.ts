import { describe, expect, it } from 'vitest';
import { levelFromXp, masteryLevel, MAX_LEVEL, totalXpForLevel, xpToNext } from '../src/progression/levels';
import { computeRewards } from '../src/progression/rewards';
import { canUpgrade, upgradeCost, upgradeLevelGate } from '../src/progression/upgrades';
import { describeReq, unlockById, unlockState, UNLOCKS } from '../src/progression/unlocks';
import { combinedMods, sanitizeAttachments } from '../src/progression/attachments';
import { emptyStats } from '../src/game/modes/gameMode';

describe('levels', () => {
  it('curve is increasing and consistent', () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(xpToNext(1));
    for (let l = 2; l < MAX_LEVEL; l++) {
      expect(totalXpForLevel(l + 1) - totalXpForLevel(l)).toBe(xpToNext(l));
      expect(xpToNext(l)).toBeGreaterThan(xpToNext(l - 1));
    }
  });
  it('levelFromXp inverts the curve', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, need: 500 });
    expect(levelFromXp(499).level).toBe(1);
    expect(levelFromXp(500)).toEqual({ level: 2, into: 0, need: 750 });
    const l10 = totalXpForLevel(10);
    expect(levelFromXp(l10 + 5)).toMatchObject({ level: 10, into: 5 });
    expect(levelFromXp(1e12).level).toBe(MAX_LEVEL);
    expect(levelFromXp(-5).level).toBe(1);
  });
  it('mastery thresholds', () => {
    expect(masteryLevel(0)).toBe(0);
    expect(masteryLevel(10)).toBe(1);
    expect(masteryLevel(159)).toBe(4);
    expect(masteryLevel(10_000)).toBe(5);
  });
});

describe('rewards', () => {
  const s = emptyStats('wave', 'depot');
  s.byKind = { grunt: 10, runner: 4, heavy: 1 };
  s.kills = 15;
  s.headshots = 3;
  s.waves = 3;
  s.shots = 100;
  s.hits = 50;
  it('sums kill, headshot, wave and accuracy rewards', () => {
    const r = computeRewards(s, 'normal');
    const kills = 10 * 100 + 4 * 80 + 260;
    expect(r.lines.find((l) => l.label === 'Kills')?.xp).toBe(kills);
    expect(r.lines.find((l) => l.label === 'Headshots')?.xp).toBe(75);
    expect(r.lines.find((l) => l.label.startsWith('Waves'))?.xp).toBe(150 * 3 + 25 * 9);
    expect(r.lines.some((l) => l.label.startsWith('Accuracy'))).toBe(true);
    expect(r.xp).toBe(r.lines.reduce((a, l) => a + l.xp, 0));
    expect(r.credits).toBeGreaterThan(0);
  });
  it('Clear mode: no per-room rewards, a single completion reward', () => {
    const c = emptyStats('clear', 'warehouse');
    c.objectives = 9;
    c.won = true;
    const r = computeRewards(c, 'normal');
    expect(r.lines.map((l) => l.label)).toEqual(['Operation complete']);
    c.won = false;
    expect(computeRewards(c, 'normal').lines).toEqual([]);
  });
  it('hard pays more than normal, easy less', () => {
    expect(computeRewards(s, 'hard').xp).toBeGreaterThan(computeRewards(s, 'normal').xp);
    expect(computeRewards(s, 'easy').xp).toBeLessThan(computeRewards(s, 'normal').xp);
  });
  it('sandbox pays nothing; nonsense input is clamped', () => {
    expect(computeRewards(emptyStats('sandbox', 'proving'), 'normal').xp).toBe(0);
    const bad = emptyStats('mission', 'depot');
    bad.byKind = { grunt: -5, runner: Number.NaN, heavy: 1e9 };
    bad.objectives = 1e6;
    const r = computeRewards(bad, 'normal');
    expect(r.lines.find((l) => l.label === 'Kills')?.xp).toBe(500 * 260);
    expect(r.lines.find((l) => l.label.startsWith('Objectives'))?.xp).toBe(3000);
  });
});

describe('upgrade trees', () => {
  const ups = { damage: 0, magazine: 0, recoil: 0, reload: 0 };
  it('costs rise per level and per weapon tier', () => {
    expect(upgradeCost('rifle', 1)).toBeGreaterThan(upgradeCost('rifle', 0));
    expect(upgradeCost('sniper', 2)).toBeGreaterThan(upgradeCost('pistol', 2));
    expect(upgradeCost('rifle', 0) % 10).toBe(0);
  });
  it('gates by player level and credits, stops at max', () => {
    expect(canUpgrade('rifle', ups, 'damage', 1, 99999)).toMatchObject({ ok: true });
    expect(canUpgrade('rifle', { ...ups, damage: 2 }, 'damage', 2, 99999)).toMatchObject({ ok: false, reason: 'level', needLevel: upgradeLevelGate(3) });
    expect(canUpgrade('rifle', ups, 'damage', 50, 0)).toMatchObject({ ok: false, reason: 'credits' });
    expect(canUpgrade('rifle', { ...ups, damage: 5 }, 'damage', 50, 1e9)).toMatchObject({ ok: false, reason: 'maxed' });
  });
});

describe('unlock tables', () => {
  const ctx = (level: number, owned: string[] = []) => ({ level, credits: 0, mastery: () => 0, owned: new Set(owned) });
  it('ids are unique', () => {
    expect(new Set(UNLOCKS.map((u) => u.id)).size).toBe(UNLOCKS.length);
  });
  it('states: locked by level, buyable when met, owned', () => {
    const sniper = unlockById('weapon:sniper')!;
    expect(unlockState(sniper, ctx(1))).toBe('locked');
    expect(unlockState(sniper, ctx(6))).toBe('buyable');
    expect(unlockState(sniper, ctx(6, ['weapon:sniper']))).toBe('owned');
    expect(describeReq(sniper)).toMatch(/Level 6/);
  });
  it('mastery requirements', () => {
    const item = { id: 'camo:test', kind: 'camo' as const, name: 'T', req: { mastery: { weapon: 'smg' as const, level: 2 } } };
    expect(unlockState(item, { ...ctx(50), mastery: () => 1 })).toBe('locked');
    expect(unlockState(item, { ...ctx(50), mastery: () => 2 })).toBe('free');
  });
});

describe('attachments', () => {
  it('one per slot and only compatible ones', () => {
    expect(sanitizeAttachments('rifle', ['reddot', 'scope4x', 'grip', 'nope'])).toEqual(['reddot', 'grip']);
    expect(sanitizeAttachments('pistol', ['scope4x', 'grip', 'laser'])).toEqual(['laser']);
  });
  it('modifiers multiply', () => {
    const m = combinedMods(['comp', 'grip']);
    expect(m.recoil).toBeCloseTo(0.85 * 0.88);
    expect(m.damage).toBe(1);
  });
});

import { defaultSave } from '../src/save/schema';
import { applySession, buyUnlock, buyUpgrade, loadoutEntries, setAttachment, setLoadout, LEVEL_UP_CREDITS } from '../src/progression/profile';

describe('profile operations', () => {
  it('applySession awards xp/credits, level-ups, mastery and lifetime stats', () => {
    const s = defaultSave();
    const st = emptyStats('wave', 'depot');
    st.byKind = { grunt: 12, runner: 0, heavy: 0 };
    st.kills = 12;
    st.waves = 2;
    st.weaponKills = { rifle: 12 };
    const credits0 = s.profile.credits;
    const r = applySession(s, st, 'normal');
    expect(r.rewards.xp).toBeGreaterThan(1000);
    expect(r.after.level).toBeGreaterThan(r.before.level);
    expect(s.profile.credits).toBe(credits0 + r.rewards.credits + r.levelUps * LEVEL_UP_CREDITS);
    expect(r.masteryUps).toEqual([{ weapon: 'rifle', level: 1 }]);
    expect(s.profile.stats.matches).toBe(1);
    expect(s.profile.stats.bestWave).toBe(2);
    // smg becomes buyable at level 2
    expect(r.nowBuyable.some((u) => u.id === 'weapon:smg')).toBe(true);
  });
  it('buying spends credits and respects requirements', () => {
    const s = defaultSave();
    expect(buyUnlock(s, 'weapon:sniper')).toMatchObject({ ok: false });
    s.profile.xp = 1e6;
    s.profile.credits = 2500;
    expect(buyUnlock(s, 'weapon:sniper')).toMatchObject({ ok: true });
    expect(s.profile.credits).toBe(500);
    expect(buyUnlock(s, 'weapon:sniper')).toMatchObject({ ok: false, reason: 'Already owned' });
    expect(buyUnlock(s, 'weapon:shotgun')).toMatchObject({ ok: false, reason: 'Not enough credits' });
  });
  it('upgrades and attachments feed into the match loadout', () => {
    const s = defaultSave();
    s.profile.credits = 10000;
    s.profile.xp = 1e6;
    expect(buyUpgrade(s, 'rifle', 'damage').ok).toBe(true);
    expect(s.weapons.rifle.upgrades.damage).toBe(1);
    expect(setAttachment(s, 'rifle', 'grip', true)).toBe(false); // not owned
    buyUnlock(s, 'att:grip');
    expect(setAttachment(s, 'rifle', 'grip', true)).toBe(true);
    const lo = loadoutEntries(s, 'wave');
    expect(lo.map((e) => e.id)).toEqual(['rifle', 'pistol']);
    expect(lo[0]!.mods!.recoil).toBeCloseTo(0.88);
    expect(buyUpgrade(s, 'smg', 'damage').ok).toBe(false); // smg locked
  });
  it('setLoadout swaps instead of duplicating', () => {
    const s = defaultSave();
    expect(setLoadout(s, 'primary', 'pistol')).toBe(true);
    expect(s.loadout).toEqual({ primary: 'pistol', secondary: 'rifle' });
    expect(setLoadout(s, 'primary', 'sniper')).toBe(false);
  });
});
