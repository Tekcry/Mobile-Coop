import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrate, detectVersion, MIGRATIONS, SaveVersionError } from '../src/save/migrations';
import { defaultSave, sanitizeSave, SAVE_VERSION } from '../src/save/schema';
import { SaveManager, parseExport, serializeExport, loadRaw } from '../src/save/saveManager';
import { dbGet, dbKeys, dbPut, resetDbCache } from '../src/save/db';
import { loadAnimTunePresets, saveAnimTunePresets } from '../src/save/animTuneStore';
import { loadCampaignProgress, recordFinish } from '../src/save/campaignRecord';
import { loadCourseRecord, recordBay, updateCourseRecord } from '../src/save/courseRecord';
import { loadRatingRecord, updateRatingRecord } from '../src/save/ratingRecord';
import { loadSectorRecord, markCompleted } from '../src/save/sectorRecord';

type Raw = Record<string, unknown>;

/** The steps from the save's own version up to (not including) `stop`: what the data looked like on the way. */
function upTo(raw: Raw, stop: number): Raw {
  let cur = structuredClone(raw);
  for (let v = detectVersion(cur); v < stop; v++) cur = MIGRATIONS[v]!(cur);
  return cur;
}

/** The only keys a v11 save has. */
const V11_KEYS = ['createdAt', 'loadout', 'preset', 'presets', 'profile', 'updatedAt', 'version', 'weapons'];

const V1 = {
  version: 1,
  name: 'OldTimer',
  xp: 4321,
  money: 950,
  unlocked: ['weapon:rifle', 'weapon:pistol', 'weapon:smg'],
  upgrades: { rifle: { damage: 2, magazine: 1, recoil: 0, reload: 3 }, smg: { damage: 9 }, pistolSd: { damage: 9 } },
};

/** A full v10 save: progression, cosmetics, records of the removed systems, and the gear that stays. */
const V10: Raw = {
  version: 10,
  createdAt: 1111,
  updatedAt: 2222,
  profile: { name: 'Ten', xp: 90_000, credits: 4321, tag: { title: 'Veteran', color: '#ff0000', emblem: 'star' }, stats: { matches: 9, wins: 4, kills: 77, headshots: 12, bestWave: 3, timePlayed: 4000 } },
  unlocks: ['weapon:rifle', 'weapon:pistolSd', 'att:suppressor', 'att:reddot', 'camo:factory', 'camo:rifle:gold', 'tag:Rookie', 'tag:Veteran', 'part:hair:mohawk', 'pattern:stripes'],
  weapons: {
    rifle: { upgrades: { damage: 3, magazine: 2, recoil: 1, reload: 5 }, attachments: ['suppressor', 'reddot'], camo: 'gold', kills: 480 },
    pistolSd: { upgrades: { damage: 1, magazine: 0, recoil: 0, reload: 0 }, attachments: [], camo: 'factory', kills: 33 },
  },
  loadout: { primary: 'rifle', secondary: 'pistolSd' },
  avatar: { body: 'broad', head: 'oval', hair: 'mohawk', torso: 'vest', legs: 'cargo', backpack: 'pack', helmet: 'cap', pattern: 'stripes', colors: { skin: '#c68a5e', pattern: '#112233' } },
  missions: { 'embassy-pouch': { rating: 2, score: 1200, plays: 3, wins: 2 } },
  suit: { owned: { vest: 2, gloves: 1, boots: 0, goggles: 0, pouches: 1 }, worn: { vest: 1, gloves: 1, boots: 0, goggles: 0, pouches: 1 } },
  hq: { restock: 1, revive: 2 },
  challenges: { progress: { knockouts: 11, ghostMissions: 2 }, done: ['headshots'] },
  presets: [
    { name: 'Quiet', primary: 'pistolSd', secondary: 'rifle', gadget: 'gas' },
    { name: 'Bright', primary: 'rifle', secondary: 'pistolSd', gadget: 'flash' },
    { name: 'Loud', primary: 'rifle', secondary: 'pistolSd', gadget: 'frag' },
  ],
  preset: 1,
};

describe('save migrations', () => {
  it('detects versions', () => {
    expect(detectVersion(V1)).toBe(1);
    expect(detectVersion({ money: 1 })).toBe(1);
    expect(detectVersion(defaultSave())).toBe(SAVE_VERSION);
    expect(detectVersion('nope')).toBe(0);
  });
  it('v1 -> current: the old steps still run, and the result is a v11 save without progression', () => {
    const { data, from, steps } = migrate(V1);
    expect(from).toBe(1);
    expect(steps).toBe(SAVE_VERSION - 1);
    // on the way (v10): the renames and the deleted gun
    const v10 = upTo(V1, 10);
    expect(v10.profile).toMatchObject({ name: 'OldTimer', xp: 4321, credits: 950 });
    expect(v10.unlocks).not.toContain('weapon:smg');
    expect('smg' in (v10.weapons as Raw)).toBe(false);
    expect((v10.weapons as Record<string, Raw>).rifle!.upgrades).toEqual({ damage: 2, magazine: 1, recoil: 0, reload: 3 });
    // at v11: only the name and the gear
    const s = sanitizeSave(data);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.profile).toEqual({ name: 'OldTimer' });
    expect(Object.keys(s).sort()).toEqual(V11_KEYS);
    expect(s.weapons.rifle).toEqual({ attachments: [] });
    expect('smg' in s.weapons).toBe(false);
    expect('emotes' in s).toBe(false);
  });
  it('v2 -> v3 adds the look, tag and camo without losing data (checked on the way, at v10)', () => {
    const v10 = upTo(MIGRATE_TO_V2(), 10);
    expect((v10.profile as Raw).name).toBe('Two');
    const rifle = (v10.weapons as Record<string, Raw>).rifle!;
    expect(rifle.kills).toBe(12);
    expect(rifle.camo).toBe('factory');
    expect((v10.profile as { tag: { title: string } }).tag.title).toBe('Rookie');
    expect(loadRaw(MIGRATE_TO_V2()).save.profile.name).toBe('Two');
  });
  it('v3 -> v4 renames avatar options and owned part unlocks (at v10)', () => {
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
    const { from, steps } = migrate(V3);
    expect(from).toBe(3);
    expect(steps).toBe(SAVE_VERSION - 3);
    const v10 = upTo(V3, 10);
    expect(v10.avatar).toMatchObject({ body: 'broad', head: 'oval', hair: 'swept', backpack: 'bedroll', helmet: 'headset', torso: 'vest' });
    expect(v10.unlocks as string[]).toEqual(expect.arrayContaining(['part:body:broad', 'part:head:oval', 'part:helmet:headset', 'part:backpack:bedroll', 'part:hair:swept', 'weapon:rifle']));
    expect(v10.unlocks).not.toContain('part:helmet:horns');
    expect((v10.profile as Raw).xp).toBe(900);
    expect(sanitizeSave(migrate(V3).data).profile.name).toBe('Vet');
  });

  it('v4 -> v5 adds empty mission records (at v10); v11 has no mission records at all', () => {
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
    const { from } = migrate(V4);
    expect(from).toBe(4);
    expect(upTo(V4, 10).missions).toEqual({});
    expect('missions' in sanitizeSave({ ...migrate(V4).data, missions: { 'embassy-pouch': { rating: 9 } } })).toBe(false);
  });

  it('every old version (v1 .. v5 literal saves) reaches the current one with the 2.0 kit', () => {
    const base = { createdAt: 1, updatedAt: 2, profile: { name: 'Old', xp: 500, credits: 77, tag: { title: 'Rookie', color: '#ff8a1e', emblem: 'chevron' }, stats: { matches: 1, wins: 0, kills: 3, headshots: 1, bestWave: 1, timePlayed: 60 } }, unlocks: ['weapon:rifle', 'weapon:pistol'], weapons: { rifle: { upgrades: { damage: 1, magazine: 0, recoil: 0, reload: 0 }, kills: 2 } }, loadout: { primary: 'rifle', secondary: 'pistol' } };
    const olds: Raw[] = [V1, { ...base, version: 2 }, { ...base, version: 3, emotes: ['wave', '', '', ''] }, { ...base, version: 4, emotes: ['wave', '', '', ''] }, { ...base, version: 5, emotes: ['wave', '', '', ''], missions: {} }];
    for (const o of olds) {
      const { data, from } = migrate(o);
      expect(from).toBe(o.version);
      const sv = sanitizeSave(data);
      expect(sv.version).toBe(SAVE_VERSION);
      expect(Object.keys(sv).sort()).toEqual(V11_KEYS);
      expect(sv.presets).toHaveLength(3);
      // the 2.0 kit: the suppressed pistol first, the rifle second
      expect(sv.loadout).toEqual({ primary: 'pistolSd', secondary: 'rifle' });
    }
  });

  it('v8 -> v9 drops the emote slots and unlocks (G24), the guns outside the CT kit (G115) and the drone gadget (G7); the kit it leaves is what v11 keeps', () => {
    const V8 = {
      version: 8,
      createdAt: 1,
      updatedAt: 2,
      profile: { name: 'Eight', xp: 1200, credits: 340, tag: { title: 'Rookie', color: '#ff8a1e', emblem: 'chevron' }, stats: { matches: 5, wins: 2, kills: 30, headshots: 4, bestWave: 0, timePlayed: 1800 } },
      unlocks: ['weapon:rifle', 'weapon:pistol', 'weapon:smg', 'weapon:crossbow', 'att:lethalBolts', 'att:suppressor', 'camo:smg:gold', 'camo:rifle:gold', 'emote:wave', 'emote:salute', 'emote:point', 'tag:Rookie', 'camo:factory'],
      weapons: {
        rifle: { upgrades: { damage: 1, magazine: 0, recoil: 0, reload: 0 }, kills: 12, attachments: ['suppressor'], camo: 'factory' },
        smg: { upgrades: { damage: 3, magazine: 0, recoil: 0, reload: 0 }, kills: 40, attachments: ['suppressor'], camo: 'gold' },
      },
      loadout: { primary: 'smg', secondary: 'pistol' },
      avatar: { body: 'broad', head: 'oval', hair: 'swept', torso: 'vest', legs: 'cargo', backpack: 'bedroll', helmet: 'headset', pattern: 'solid', colors: { skin: '#c68a5e' } },
      emotes: ['wave', 'point', '', ''],
      missions: {},
      suit: { owned: { vest: 1, gloves: 0, boots: 0, goggles: 0, pouches: 0 }, worn: { vest: 1, gloves: 0, boots: 0, goggles: 0, pouches: 0 } },
      hq: { radar: 1, restock: 0, revive: 0 },
      challenges: { progress: {}, done: [] },
      presets: [
        { name: 'Silent', primary: 'pistolSd', secondary: 'rifle', gadget: 'gas' },
        { name: 'Close', primary: 'shotgun', secondary: 'fiveseven', gadget: 'drone' },
        { name: 'Loud', primary: 'rifle', secondary: 'pistol', gadget: 'frag' },
      ],
      preset: 0,
    };
    const { from, steps } = migrate(V8);
    expect(from).toBe(8);
    expect(steps).toBe(SAVE_VERSION - 8);
    const v9 = MIGRATIONS[8]!(structuredClone(V8));
    expect('emotes' in v9).toBe(false);
    expect((v9.unlocks as string[]).some((u) => u.startsWith('emote:'))).toBe(false);
    expect(v9.unlocks).toEqual(expect.arrayContaining(['weapon:rifle', 'tag:Rookie', 'camo:factory', 'att:suppressor', 'camo:rifle:gold']));
    for (const u of ['weapon:pistol', 'weapon:smg', 'weapon:crossbow', 'att:lethalBolts', 'camo:smg:gold']) expect(v9.unlocks).not.toContain(u);
    // G115: a deleted gun becomes the kept gun of its slot; its progress is dropped
    expect(v9.loadout).toEqual({ primary: 'rifle', secondary: 'pistolSd' });
    expect(Object.keys(v9.weapons as object)).toEqual(['rifle']);
    // G7: the drone preset gadget is dropped
    expect('gadget' in ((v9.presets as Raw[])[1] as object)).toBe(false);
    const s = sanitizeSave(migrate(V8).data);
    expect(s.loadout).toEqual({ primary: 'rifle', secondary: 'pistolSd' });
    expect(Object.keys(s.weapons).sort()).toEqual(['pistolSd', 'rifle']);
    expect(s.weapons.rifle.attachments).toEqual(['suppressor']);
    // the sanitiser gives the preset its default gadget back
    expect(s.presets.map((p) => p.gadget)).toEqual(['gas', 'flash', 'frag']);
    expect(s.presets.map((p) => [p.primary, p.secondary])).toEqual([
      ['pistolSd', 'rifle'],
      ['rifle', 'pistolSd'],
      ['rifle', 'pistolSd'],
    ]);
  });

  it('current saves pass through untouched', () => {
    const d = defaultSave(123);
    d.profile.name = 'Kept';
    const r = loadRaw(d);
    expect(r.migratedFrom).toBe(SAVE_VERSION);
    expect(r.save.profile.name).toBe('Kept');
    expect(r.save.createdAt).toBe(123);
  });
  it('rejects future versions and garbage', () => {
    expect(() => migrate({ version: SAVE_VERSION + 1 })).toThrow(SaveVersionError);
    expect(() => migrate(42)).toThrow(SaveVersionError);
  });
  it('sanitiser repairs tampered values', () => {
    const d = defaultSave() as unknown as Raw;
    (d.profile as Raw).name = '<script>x</script>';
    d.loadout = { primary: 'sniper', secondary: 'sniper' };
    d.weapons = { rifle: { attachments: ['suppressor', 'comp', 'reddot', 'bogus', 7] }, pistolSd: { attachments: ['scope4x'] } };
    d.presets = [{ name: '<b>x</b>', primary: 'lmg', secondary: 'rifle', gadget: 'drone' }];
    d.preset = 9;
    const s = sanitizeSave(d);
    expect(s.profile.name).not.toMatch(/[<>]/);
    // an unknown gun falls back to the issued kit
    expect(s.loadout).toEqual({ primary: 'pistolSd', secondary: 'rifle' });
    // one attachment per slot (the first wins), only ones the gun takes, only strings
    expect(s.weapons.rifle.attachments).toEqual(['suppressor', 'reddot']);
    expect(s.weapons.pistolSd.attachments).toEqual([]);
    expect(s.presets[0]).toEqual({ name: 'bx/b', primary: 'pistolSd', secondary: 'rifle', gadget: 'gas' });
    expect(s.presets).toHaveLength(3);
    expect(s.preset).toBe(2);
  });
  it('v6 -> v7: the issued rifle + pistol becomes the suppressed pistol + rifle; a chosen kit stays', () => {
    const v6 = { ...defaultSave(5), version: 6, loadout: { primary: 'rifle', secondary: 'pistol' }, presets: [{ name: 'Ghost', primary: 'rifle', secondary: 'pistol', gadget: 'gas' }, { name: 'Panther', primary: 'rifle', secondary: 'pistol', gadget: 'flash' }, { name: 'Assault', primary: 'rifle', secondary: 'pistol', gadget: 'frag' }], unlocks: ['weapon:rifle', 'weapon:pistol'] } as unknown as Raw;
    const s = sanitizeSave(migrate(v6).data);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.loadout).toEqual({ primary: 'pistolSd', secondary: 'rifle' });
    expect(s.presets[0]!.primary).toBe('pistolSd');
    expect(s.presets[2]!.primary).toBe('rifle');
    const chosenV6 = { ...v6, unlocks: ['weapon:rifle', 'weapon:pistol', 'weapon:smg'], loadout: { primary: 'smg', secondary: 'pistol' } };
    expect(MIGRATIONS[6]!(chosenV6).loadout).toEqual({ primary: 'smg', secondary: 'pistol' });
    // v8 -> v9 then maps the deleted guns onto the CT kit (G115)
    const chosen = sanitizeSave(migrate(chosenV6).data);
    expect(chosen.loadout).toEqual({ primary: 'rifle', secondary: 'pistolSd' });
  });
});

function MIGRATE_TO_V2(): Raw {
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

describe('v7 -> v8', () => {
  it('drops style points, sonar / marks and executes (checked at v8)', () => {
    const V7 = {
      ...defaultSave(),
      version: 7,
      missions: { 'embassy-pouch': { rating: 2, score: 1200, ghost: 800, panther: 300, assault: 100, plays: 3, wins: 2 } },
      hq: { radar: 1, sonar: 2, marks: 1, restock: 0, revive: 0 },
      challenges: { progress: { executes: 4, knockouts: 3 }, done: ['executes'] },
    } as unknown as Raw;
    const { from, steps } = migrate(V7);
    expect(from).toBe(7);
    expect(steps).toBe(SAVE_VERSION - 7);
    const v8 = MIGRATIONS[7]!(structuredClone(V7));
    expect(v8.version).toBe(8);
    expect((v8.missions as Record<string, Raw>)['embassy-pouch']).toEqual({ rating: 2, score: 1200, plays: 3, wins: 2 });
    expect(v8.hq).toEqual({ radar: 1, restock: 0, revive: 0 });
    expect(v8.challenges).toEqual({ progress: { knockouts: 3 }, done: [] });
  });
  it('does not throw on missing fields', () => {
    expect(migrate({ version: 7 }).data.version).toBe(SAVE_VERSION);
  });
});

describe('v9 -> v10', () => {
  it('drops the HQ radar and keeps the rest (checked at v10)', () => {
    const profile = { ...defaultSave().profile, credits: 4321 };
    const V9 = { ...defaultSave(), version: 9, profile, hq: { radar: 2, restock: 1, revive: 1 } } as unknown as Raw;
    const { from, steps } = migrate(V9);
    expect(from).toBe(9);
    expect(steps).toBe(2);
    const v10 = MIGRATIONS[9]!(structuredClone(V9));
    expect(v10.version).toBe(10);
    expect(v10.hq).toEqual({ restock: 1, revive: 1 });
    expect((v10.profile as { credits: number }).credits).toBe(4321);
  });
});

describe('v10 -> v11 (clean-up I: progression and cosmetics removed)', () => {
  it('drops the removed fields and keeps the name, the times, the attachments, the loadout and the presets', () => {
    const { data, from, steps } = migrate(V10);
    expect(from).toBe(10);
    expect(steps).toBe(1);
    expect(data.version).toBe(11);
    expect(Object.keys(data).sort()).toEqual(V11_KEYS);
    expect(data.profile).toEqual({ name: 'Ten' });
    expect(data.createdAt).toBe(1111);
    expect(data.updatedAt).toBe(2222);
    expect(data.weapons).toEqual({ rifle: { attachments: ['suppressor', 'reddot'] }, pistolSd: { attachments: [] } });
    expect(data.loadout).toEqual({ primary: 'rifle', secondary: 'pistolSd' });
    expect(data.presets).toEqual(V10.presets);
    expect(data.preset).toBe(1);
  });
  it('the loaded v11 save has none of the removed systems, and loads without errors', () => {
    const { save, migratedFrom } = loadRaw(V10);
    expect(migratedFrom).toBe(10);
    expect(save.version).toBe(SAVE_VERSION);
    expect(Object.keys(save).sort()).toEqual(V11_KEYS);
    expect(save.profile).toEqual({ name: 'Ten' });
    expect(save.weapons.rifle).toEqual({ attachments: ['suppressor', 'reddot'] });
    expect(save.preset).toBe(1);
    expect(save.presets.map((p) => p.gadget)).toEqual(['gas', 'flash', 'frag']);
    const text = JSON.stringify(save);
    for (const gone of ['xp', 'credits', 'unlocks', 'upgrades', 'kills', 'camo', 'avatar', 'missions', 'suit', 'hq', 'challenges', 'tag', 'stats']) expect(text, gone).not.toContain(`"${gone}"`);
  });
  it('a v10 save with missing or odd parts still loads', () => {
    expect(loadRaw({ version: 10 }).save).toMatchObject({ version: SAVE_VERSION, profile: { name: 'Operator' }, loadout: { primary: 'pistolSd', secondary: 'rifle' }, preset: 0 });
    const odd = loadRaw({ version: 10, profile: 'x', weapons: { rifle: 3, smg: { attachments: ['suppressor'] } }, presets: 'no' }).save;
    expect(odd.weapons.rifle).toEqual({ attachments: [] });
    expect('smg' in odd.weapons).toBe(false);
    expect(odd.presets).toHaveLength(3);
  });
});

describe('export / import', () => {
  it('round-trips through the export format', () => {
    const d = defaultSave();
    d.profile.name = 'Exported';
    d.weapons.rifle.attachments = ['suppressor'];
    const text = serializeExport(d);
    expect(parseExport(text).profile.name).toBe('Exported');
    expect(parseExport(text).weapons.rifle.attachments).toEqual(['suppressor']);
    expect(Object.keys((JSON.parse(text) as { data: Raw }).data).sort()).toEqual(V11_KEYS);
  });
  it('imports bare old saves and an old export file, and rejects junk', () => {
    expect(parseExport(JSON.stringify(V1)).profile.name).toBe('OldTimer');
    const old = JSON.stringify({ magic: 'shoulder-strike-save', exportedAt: 5, version: 10, data: V10 });
    const s = parseExport(old);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.profile.name).toBe('Ten');
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
    expect(m.get().profile.name).toBe('Operator');
    m.update((s) => void (s.profile.name = 'Persisted'));
    await m.flush();
    const raw = await dbGet<{ profile: { name: string } }>('profile', 'main');
    expect(raw?.profile.name).toBe('Persisted');
  });
  it('migrates an old stored save, keeping a backup', async () => {
    await dbPut('profile', 'main', V1);
    const m = new SaveManager();
    await m.load();
    expect(m.get().version).toBe(SAVE_VERSION);
    expect(m.get().profile.name).toBe('OldTimer');
    const backups = await dbKeys('backups');
    expect(backups.some((k) => k.includes('pre-migration-v1'))).toBe(true);
    const stored = await dbGet<{ version: number }>('profile', 'main');
    expect(stored?.version).toBe(SAVE_VERSION);
  });
  it('a stored v10 save becomes v11; the settings, every record and the anim tune presets are left as they were', async () => {
    // what the other stores held (the settings, the campaign / course / sector / rating records, the tuner's presets)
    const settings = { version: 3, video: { brightness: 1.2, brightnessSet: true }, audio: { master: 0.7 } };
    await dbPut('kv', 'settings', settings);
    await recordFinish('threeGreyCoats', 80, 1);
    await updateCourseRecord('marlow', (e) => recordBay(e, ['b1', 'b2'], 'b1', 42.5));
    await updateRatingRecord('tallow', 'dock', 7, 1);
    await markCompleted('tallow', 'normal', 300);
    const tune = { version: 1, presets: [{ name: 'mine', at: 5, values: { a: 1 } }] };
    await saveAnimTunePresets(tune);
    const kvKeys = ['settings', 'campaign:progress', 'course:fallow', 'sector:ops', 'rating:sections'];
    const before = await Promise.all(kvKeys.map((k) => dbGet('kv', k)));
    for (const b of before) expect(b).toBeDefined();
    // load the v10 profile
    await dbPut('profile', 'main', V10);
    const m = new SaveManager();
    await m.load();
    expect(m.readOnly).toBe(false);
    expect(m.get().version).toBe(SAVE_VERSION);
    expect(m.get().profile).toEqual({ name: 'Ten' });
    expect((await dbKeys('backups')).some((k) => k.includes('pre-migration-v10'))).toBe(true);
    const stored = await dbGet<Raw>('profile', 'main');
    expect(stored?.version).toBe(SAVE_VERSION);
    expect(Object.keys(stored!).sort()).toEqual(V11_KEYS);
    // the rest is what it was, and still reads
    expect(await Promise.all(kvKeys.map((k) => dbGet('kv', k)))).toEqual(before);
    expect(await loadAnimTunePresets()).toEqual(tune);
    expect((await loadCampaignProgress()).done.threeGreyCoats?.best).toBe(80);
    expect((await loadCourseRecord()).courses.marlow?.bestBay.b1).toBe(42.5);
    expect(Object.keys((await loadRatingRecord()).maps.tallow ?? {})).toEqual(['dock']);
    expect(Object.keys((await loadSectorRecord()).ops)).toEqual(['tallow']);
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
    const future = { ...defaultSave(), version: SAVE_VERSION + 5, profile: { name: 'Future' } };
    await dbPut('profile', 'main', future);
    const m = new SaveManager();
    await m.load();
    expect(m.readOnly).toBe(true);
    expect(m.storageError).toMatch(/newer/);
    m.update((s) => void (s.profile.name = 'Changed'));
    await m.flush();
    const stored = await dbGet<{ version: number; profile: { name: string } }>('profile', 'main');
    expect(stored?.version).toBe(SAVE_VERSION + 5);
    expect(stored?.profile.name).toBe('Future');
    await m.importText(serializeExport(defaultSave()));
    expect(m.readOnly).toBe(false);
    expect((await dbKeys('backups')).some((k) => k.includes('unreadable'))).toBe(true);
    expect((await dbGet<{ version: number }>('profile', 'main'))?.version).toBe(SAVE_VERSION);
  });
});
