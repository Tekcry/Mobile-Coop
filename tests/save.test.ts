import { defaultLook } from '../src/cosmetics/avatarLook';
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrate, detectVersion, SaveVersionError } from '../src/save/migrations';
import { defaultSave, sanitizeSave, SAVE_VERSION } from '../src/save/schema';
import { SaveManager, parseExport, serializeExport, loadRaw } from '../src/save/saveManager';
import { dbGet, dbKeys, dbPut, resetDbCache } from '../src/save/db';

const V1 = {
  version: 1,
  name: 'OldTimer',
  xp: 4321,
  money: 950,
  unlocked: ['weapon:rifle', 'weapon:pistol', 'weapon:smg'],
  upgrades: { rifle: { damage: 2, magazine: 1, recoil: 0, reload: 3 }, smg: { damage: 9 } },
};

describe('save migrations', () => {
  it('detects versions', () => {
    expect(detectVersion(V1)).toBe(1);
    expect(detectVersion({ money: 1 })).toBe(1);
    expect(detectVersion(defaultSave())).toBe(SAVE_VERSION);
    expect(detectVersion('nope')).toBe(0);
  });
  it('v1 -> current keeps progress and renames fields', () => {
    const { data, from, steps } = migrate(V1);
    expect(from).toBe(1);
    expect(steps).toBe(SAVE_VERSION - 1);
    const s = sanitizeSave(data);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.profile.name).toBe('OldTimer');
    expect(s.profile.xp).toBe(4321);
    expect(s.profile.credits).toBe(950);
    expect(s.unlocks).toContain('weapon:smg');
    expect(s.weapons.rifle.upgrades).toEqual({ damage: 2, magazine: 1, recoil: 0, reload: 3 });
    // out-of-range upgrade clamped
    expect(s.weapons.smg.upgrades.damage).toBe(5);
    expect(s.avatar.body).toBe(defaultLook().body);
    expect(s.emotes).toHaveLength(4);
  });
  it('v2 -> v3 adds cosmetics without losing data', () => {
    const s = loadRaw(MIGRATE_TO_V2()).save;
    expect(s.profile.name).toBe('Two');
    expect(s.weapons.rifle.kills).toBe(12);
    expect(s.weapons.rifle.upgrades.damage).toBe(1);
    expect(s.profile.tag.title).toBe('Rookie');
    expect(s.weapons.rifle.camo).toBe('factory');
  });
  it('v3 -> v4 renames avatar options and owned part unlocks', () => {
    const V3 = {
      version: 3,
      createdAt: 1,
      updatedAt: 2,
      profile: { name: 'Vet', xp: 900, credits: 120, tag: { title: 'Rookie', color: '#ff8a1e', emblem: 'chevron' }, stats: { matches: 3, wins: 0, kills: 40, headshots: 9, bestWave: 4, timePlayed: 900 } },
      unlocks: ['weapon:rifle', 'weapon:pistol', 'part:body:heavy', 'part:head:hex', 'part:helmet:horns', 'part:backpack:blade', 'part:hair:spikes', 'camo:factory'],
      weapons: { rifle: { upgrades: { damage: 1, magazine: 0, recoil: 0, reload: 0 }, kills: 12, attachments: [], camo: 'factory' } },
      loadout: { primary: 'rifle', secondary: 'pistol' },
      avatar: { body: 'heavy', head: 'hex', hair: 'spikes', torso: 'vest', legs: 'cargo', backpack: 'blade', helmet: 'horns', pattern: 'solid', colors: { skin: '#c68a5e' } },
      emotes: ['wave', 'salute', '', ''],
    };
    const { data, from, steps } = migrate(V3);
    expect(from).toBe(3);
    expect(steps).toBe(SAVE_VERSION - 3);
    const s = sanitizeSave(data);
    expect(s.avatar).toMatchObject({ body: 'broad', head: 'oval', hair: 'swept', backpack: 'bedroll', helmet: 'headset', torso: 'vest' });
    expect(s.avatar.colors.skin).toBe('#c68a5e');
    expect(s.unlocks).toEqual(expect.arrayContaining(['part:body:broad', 'part:head:oval', 'part:helmet:headset', 'part:backpack:bedroll', 'part:hair:swept', 'weapon:rifle']));
    expect(s.unlocks).not.toContain('part:helmet:horns');
    expect(s.profile.xp).toBe(900);
    expect(s.weapons.rifle.kills).toBe(12);
  });

  it('v4 -> v5 adds empty mission records; records are sanitised', () => {
    const V4 = {
      version: 4,
      createdAt: 1,
      updatedAt: 2,
      profile: { name: 'Vet', xp: 900, credits: 120, tag: { title: 'Rookie', color: '#ff8a1e', emblem: 'chevron' }, stats: { matches: 3, wins: 0, kills: 40, headshots: 9, bestWave: 4, timePlayed: 900 } },
      unlocks: ['weapon:rifle', 'weapon:pistol', 'camo:factory'],
      weapons: { rifle: { upgrades: { damage: 1, magazine: 0, recoil: 0, reload: 0 }, kills: 12, attachments: [], camo: 'factory' } },
      loadout: { primary: 'rifle', secondary: 'pistol' },
      avatar: { body: 'broad', head: 'oval', hair: 'swept', torso: 'vest', legs: 'cargo', backpack: 'bedroll', helmet: 'headset', pattern: 'solid', colors: { skin: '#c68a5e' } },
      emotes: ['wave', 'salute', '', ''],
    };
    const { data, from } = migrate(V4);
    expect(from).toBe(4);
    const s = sanitizeSave(data);
    expect(s.missions).toEqual({});
    expect(s.profile.xp).toBe(900);
    const bad = sanitizeSave({ ...data, missions: { 'embassy-pouch': { rating: 9, score: -5, ghost: 10 }, 'BAD ID!': { rating: 1 } } });
    expect(bad.missions['embassy-pouch']).toMatchObject({ rating: 3, score: 0, ghost: 10, plays: 0 });
    expect(bad.missions['BAD ID!']).toBeUndefined();
  });

  it('every old version (v1 .. v5 literal saves) reaches the current one with the 2.0 kit', () => {
    const base = { createdAt: 1, updatedAt: 2, profile: { name: 'Old', xp: 500, credits: 77, tag: { title: 'Rookie', color: '#ff8a1e', emblem: 'chevron' }, stats: { matches: 1, wins: 0, kills: 3, headshots: 1, bestWave: 1, timePlayed: 60 } }, unlocks: ['weapon:rifle', 'weapon:pistol'], weapons: { rifle: { upgrades: { damage: 1, magazine: 0, recoil: 0, reload: 0 }, kills: 2 } }, loadout: { primary: 'rifle', secondary: 'pistol' } };
    const olds: Record<string, unknown>[] = [V1, { ...base, version: 2 }, { ...base, version: 3, emotes: ['wave', '', '', ''] }, { ...base, version: 4, emotes: ['wave', '', '', ''] }, { ...base, version: 5, emotes: ['wave', '', '', ''], missions: {} }];
    for (const o of olds) {
      const { data, from } = migrate(o);
      expect(from).toBe(o.version);
      const sv = sanitizeSave(data);
      expect(sv.version).toBe(SAVE_VERSION);
      expect(sv.profile.xp).toBeGreaterThan(0);
      expect(sv.suit.owned).toBeDefined();
      expect(sv.hq).toBeDefined();
      expect(sv.presets).toHaveLength(3);
      expect(sv.missions).toEqual({});
      expect(sv.unlocks).toContain('weapon:rifle');
    }
  });

  it('current saves pass through untouched', () => {
    const d = defaultSave(123);
    d.profile.xp = 777;
    const r = loadRaw(d);
    expect(r.migratedFrom).toBe(SAVE_VERSION);
    expect(r.save.profile.xp).toBe(777);
  });
  it('rejects future versions and garbage', () => {
    expect(() => migrate({ version: SAVE_VERSION + 1 })).toThrow(SaveVersionError);
    expect(() => migrate(42)).toThrow(SaveVersionError);
  });
  it('sanitiser repairs tampered values', () => {
    const d = defaultSave() as unknown as Record<string, unknown>;
    const p = d.profile as Record<string, unknown>;
    p.credits = -50;
    p.xp = Number.POSITIVE_INFINITY;
    p.name = '<script>x</script>';
    (d as { loadout: unknown }).loadout = { primary: 'sniper', secondary: 'sniper' };
    const s = sanitizeSave(d);
    expect(s.profile.credits).toBe(0);
    expect(s.profile.xp).toBe(0);
    expect(s.profile.name).not.toMatch(/[<>]/);
    // sniper not unlocked -> falls back
    expect(s.loadout.primary).toBe('rifle');
    expect(s.loadout.secondary).toBe('pistol');
  });
});

function MIGRATE_TO_V2(): Record<string, unknown> {
  // what a real v2 save looked like
  return {
    version: 2,
    createdAt: 1,
    updatedAt: 2,
    profile: { name: 'Two', xp: 100, credits: 20 },
    unlocks: ['weapon:rifle'],
    weapons: { rifle: { upgrades: { damage: 1 }, kills: 12 } },
    loadout: { primary: 'rifle', secondary: 'pistol' },
  };
}

describe('export / import', () => {
  it('round-trips through the export format', () => {
    const d = defaultSave();
    d.profile.credits = 4242;
    const text = serializeExport(d);
    expect(parseExport(text).profile.credits).toBe(4242);
  });
  it('imports bare old saves and rejects junk', () => {
    expect(parseExport(JSON.stringify(V1)).profile.credits).toBe(950);
    expect(() => parseExport('{not json')).toThrow(/JSON/);
    expect(() => parseExport('{"hello":1}')).toThrow(SaveVersionError);
  });
});

describe('SaveManager + IndexedDB', () => {
  beforeEach(async () => {
    resetDbCache();
    indexedDB.deleteDatabase('shoulder-strike');
  });
  it('creates a default profile on first run and persists updates', async () => {
    const m = new SaveManager();
    await m.load();
    expect(m.get().profile.credits).toBe(500);
    m.update((s) => void (s.profile.credits = 1234));
    await m.flush();
    const raw = await dbGet<{ profile: { credits: number } }>('profile', 'main');
    expect(raw?.profile.credits).toBe(1234);
  });
  it('migrates an old stored save, keeping a backup', async () => {
    await dbPut('profile', 'main', V1);
    const m = new SaveManager();
    await m.load();
    expect(m.get().version).toBe(SAVE_VERSION);
    expect(m.get().profile.credits).toBe(950);
    const backups = await dbKeys('backups');
    expect(backups.some((k) => k.includes('pre-migration-v1'))).toBe(true);
    const stored = await dbGet<{ version: number }>('profile', 'main');
    expect(stored?.version).toBe(SAVE_VERSION);
  });
  it('import replaces the profile and backs up the old one', async () => {
    const m = new SaveManager();
    await m.load();
    const other = defaultSave();
    other.profile.name = 'Imported';
    await m.importText(serializeExport(other));
    expect(m.get().profile.name).toBe('Imported');
    expect((await dbKeys('backups')).some((k) => k.includes('pre-import'))).toBe(true);
  });
  it('never overwrites a save it cannot read (newer version); an explicit import backs it up first', async () => {
    const future = { ...defaultSave(), version: SAVE_VERSION + 5, profile: { ...defaultSave().profile, credits: 99999 } };
    await dbPut('profile', 'main', future);
    const m = new SaveManager();
    await m.load();
    expect(m.readOnly).toBe(true);
    expect(m.storageError).toMatch(/newer/);
    m.update((s) => void (s.profile.credits = 1));
    await m.flush();
    const stored = await dbGet<{ version: number; profile: { credits: number } }>('profile', 'main');
    expect(stored?.version).toBe(SAVE_VERSION + 5);
    expect(stored?.profile.credits).toBe(99999);
    await m.importText(serializeExport(defaultSave()));
    expect(m.readOnly).toBe(false);
    expect((await dbKeys('backups')).some((k) => k.includes('unreadable'))).toBe(true);
    expect((await dbGet<{ version: number }>('profile', 'main'))?.version).toBe(SAVE_VERSION);
  });
});
