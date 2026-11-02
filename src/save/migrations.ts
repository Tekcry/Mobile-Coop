import { SAVE_VERSION } from './schema';

/**
 * Versioned migrations. Each step takes the previous version's raw object and returns the next.
 * History:
 *  v1 (prototype): { version: 1, xp, money, unlocked: string[], upgrades: { [weapon]: {damage,...} } }
 *  v2: renamed money -> credits, nested under profile; per-weapon { upgrades, kills }; loadout
 *  v3: avatar look, emotes, player tag, weapon attachments + camo, lifetime stats
 *  v4: avatar overhaul - renamed look options (slim/regular/heavy -> lean/average/broad, square/hex/tall
 *      heads -> strong/oval/long, spikes -> swept, blade -> bedroll, horns -> headset) in the look and
 *      in owned `part:` unlock ids
 *  v5-v10: records, suit / HQ / challenges / presets, the 2.0 kit, removed systems (see each step below)
 *  v11 (clean-up I): progression and cosmetics are gone - the profile keeps the name, the attachments per weapon, the
 *      loadout and the presets (see `MIGRATIONS[10]`)
 */
type Raw = Record<string, unknown>;
type Migration = (s: Raw) => Raw;

const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Option ids renamed by the v4 avatar overhaul (hard-edged/cartoon parts became smooth, realistic ones); read by the v3 -> v4 step. */
const LEGACY_LOOK_IDS: Record<string, Record<string, string>> = {
  body: { slim: 'lean', regular: 'average', heavy: 'broad' },
  head: { square: 'strong', hex: 'oval', tall: 'long' },
  hair: { spikes: 'swept' },
  backpack: { blade: 'bedroll' },
  helmet: { horns: 'headset', trilens: 'headset' },
};

/**
 * The guns deleted with the CT kit (G76 / G115), each to the kept gun of its slot: sidearms to the suppressed pistol,
 * long guns to the rifle. Literal ids: the deleted guns are no longer `WeaponId`s.
 */
export const DELETED_GUNS: Readonly<Record<string, 'rifle' | 'pistolSd'>> = {
  pistol: 'pistolSd',
  fiveseven: 'pistolSd',
  smg: 'rifle',
  shotgun: 'rifle',
  sniper: 'rifle',
  vector: 'rifle',
  p90: 'rifle',
  ak: 'rifle',
  tavor: 'rifle',
  semiShotgun: 'rifle',
  breacher: 'rifle',
  dmr: 'rifle',
  crossbow: 'rifle',
  lmg: 'rifle',
};
const gunUnlock = (u: unknown): boolean => {
  if (typeof u !== 'string') return false;
  if (u === 'att:lethalBolts') return true;
  const m = /^(?:weapon|camo):([A-Za-z0-9]+)/.exec(u);
  return !!m && m[1]! in DELETED_GUNS;
};

export const MIGRATIONS: Record<number, Migration> = {
  1: (s) => {
    const ups = isObj(s.upgrades) ? s.upgrades : {};
    const weapons: Raw = {};
    for (const [w, u] of Object.entries(ups)) weapons[w] = { upgrades: u, kills: 0 };
    return {
      version: 2,
      createdAt: s.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      profile: { name: s.name ?? 'Operator', xp: s.xp ?? 0, credits: s.money ?? 0 },
      unlocks: Array.isArray(s.unlocked) ? s.unlocked : [],
      weapons,
      loadout: { primary: 'rifle', secondary: 'pistol' },
    };
  },
  2: (s) => {
    const prof = isObj(s.profile) ? s.profile : {};
    const weapons: Raw = {};
    for (const [w, e] of Object.entries(isObj(s.weapons) ? s.weapons : {})) {
      weapons[w] = { ...(isObj(e) ? e : {}), attachments: [], camo: 'factory' };
    }
    return {
      ...s,
      version: 3,
      profile: {
        ...prof,
        tag: { title: 'Rookie', color: '#ff8a1e', emblem: 'chevron' },
        stats: { matches: 0, wins: 0, kills: 0, headshots: 0, bestWave: 0, timePlayed: 0 },
      },
      weapons,
      avatar: undefined,
      emotes: ['wave', 'salute', '', ''],
    };
  },
  3: (s) => {
    const look = isObj(s.avatar) ? { ...s.avatar } : s.avatar;
    if (isObj(look)) {
      for (const [cat, map] of Object.entries(LEGACY_LOOK_IDS)) {
        const v = look[cat];
        if (typeof v === 'string' && map[v]) look[cat] = map[v];
      }
    }
    const unlocks = Array.isArray(s.unlocks)
      ? s.unlocks.map((u: unknown) => {
          if (typeof u !== 'string') return u;
          const m = /^part:([a-z]+):([a-z]+)$/.exec(u);
          const to = m ? LEGACY_LOOK_IDS[m[1]!]?.[m[2]!] : undefined;
          return to ? `part:${m![1]}:${to}` : u;
        })
      : s.unlocks;
    return { ...s, version: 4, avatar: look, unlocks };
  },
  // v4 -> v5: Infiltration mission records (none yet)
  4: (s) => ({ ...s, version: 5, missions: isObj(s.missions) ? s.missions : {} }),
  // v5 -> v6: suit, HQ upgrades, challenges, loadout presets (issued kit; the 1.x weapons keep their ids, now the
  // pistol / smg / rifle / shotgun / sniper ids, so unlocks and upgrades carry over as they are)
  5: (s) => ({ ...s, version: 6 }),
  // v6 -> v7: the suppressed pistol (pistolSd) is issued and is the primary of the issued kit (a loadout or preset still on the old
  // issue, rifle + pistol, moves to pistolSd + rifle; chosen kit stays)
  6: (s) => {
    const issue = (p: unknown): boolean => isObj(p) && p.primary === 'rifle' && p.secondary === 'pistol';
    const sd = (p: Raw): Raw => ({ ...p, primary: 'pistolSd', secondary: 'rifle' });
    const loadout = issue(s.loadout) ? sd(s.loadout as Raw) : s.loadout;
    const presets = Array.isArray(s.presets) ? s.presets.map((p, i) => (i < 2 && issue(p) ? sd(p as Raw) : p)) : s.presets;
    return { ...s, version: 7, loadout, presets };
  },
  // v7 -> v8: the style tracker and its cash, sonar and Mark & Execute are gone: mission records lose
  // ghost / panther / assault, HQ loses sonar / marks (spent credits are not refunded), challenges lose executes
  7: (s) => {
    const missions: Raw = {};
    if (isObj(s.missions)) {
      for (const [id, r] of Object.entries(s.missions)) {
        if (!isObj(r)) {
          missions[id] = r;
          continue;
        }
        const { ghost: _g, panther: _p, assault: _a, ...rest } = r;
        missions[id] = rest;
      }
    }
    let hq = s.hq;
    if (isObj(hq)) {
      const { sonar: _s, marks: _m, ...rest } = hq;
      hq = rest;
    }
    let challenges = s.challenges;
    if (isObj(challenges)) {
      const prog = isObj(challenges.progress) ? challenges.progress : challenges.progress;
      let progress = prog;
      if (isObj(prog)) {
        const { executes: _e, ...rest } = prog;
        progress = rest;
      }
      const done = Array.isArray(challenges.done) ? challenges.done.filter((d) => d !== 'executes') : challenges.done;
      challenges = { ...challenges, progress, done };
    }
    return { ...s, version: 8, missions: 'missions' in s ? missions : s.missions, hq, challenges };
  },
  // v8 -> v9: emotes are gone (DECISIONS G24 / G116): the equipped slots and every owned `emote:` unlock are dropped.
  // The guns outside the CT kit are gone (G76 / G115): a deleted gun in the loadout or a preset becomes the kept gun
  // of its slot (`DELETED_GUNS`), its progress entry and its unlocks (`weapon:`, its mastery `camo:<gun>:` ids, the
  // crossbow's `att:lethalBolts`) are dropped. Spent credits are not refunded.
  // The tri-rotor drone is gone (G7 / G115): a preset's `drone` gadget is dropped (the sanitizer gives the preset's default).
  8: (s) => {
    const { emotes: _e, ...rest } = s;
    const unlocks = Array.isArray(s.unlocks) ? s.unlocks.filter((u) => !(typeof u === 'string' && u.startsWith('emote:')) && !gunUnlock(u)) : s.unlocks;
    const gun = (w: unknown): unknown => (typeof w === 'string' && w in DELETED_GUNS ? DELETED_GUNS[w] : w);
    const kit = (p: unknown): unknown => (isObj(p) ? { ...p, primary: gun(p.primary), secondary: gun(p.secondary) } : p);
    const preset = (p: unknown): unknown => {
      const k = kit(p);
      if (!isObj(k) || k.gadget !== 'drone') return k;
      const { gadget: _g, ...rest } = k;
      return rest;
    };
    let weapons = s.weapons;
    if (isObj(weapons)) weapons = Object.fromEntries(Object.entries(weapons).filter(([w]) => !(w in DELETED_GUNS)));
    const presets = Array.isArray(s.presets) ? s.presets.map(preset) : s.presets;
    return { ...rest, version: 9, unlocks, weapons, loadout: kit(s.loadout), presets };
  },
  // v9 -> v10: the minimap is gone (G339): HQ loses the Minimap radar (spent credits are not refunded)
  9: (s) => {
    let hq = s.hq;
    if (isObj(hq)) {
      const { radar: _r, ...rest } = hq;
      hq = rest;
    }
    return { ...s, version: 10, hq };
  },
  // v10 -> v11 (clean-up I): XP, credits, unlocks, weapon upgrades / camos / kill counts, the suit, HQ upgrades, challenges, the
  // saved look, the player tag, lifetime stats and the per-mission best results (`missions`) are gone. Kept: the creation
  // and update times, the player's name, each weapon's attachments, the loadout, the presets and the preset in use.
  // Nothing is refunded. (The records in the `kv` store and the settings are not part of this object.)
  10: (s) => {
    const profile = isObj(s.profile) ? s.profile : {};
    const weapons: Raw = {};
    if (isObj(s.weapons)) {
      for (const [w, e] of Object.entries(s.weapons)) weapons[w] = { attachments: isObj(e) && Array.isArray(e.attachments) ? e.attachments : [] };
    }
    return {
      version: 11,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      profile: { name: profile.name },
      weapons,
      loadout: s.loadout,
      presets: s.presets,
      preset: s.preset,
    };
  },
};

export class SaveVersionError extends Error {}

/** Detect the version of a raw save (v1 had no nested profile). */
export function detectVersion(raw: unknown): number {
  if (!isObj(raw)) return 0;
  if (typeof raw.version === 'number' && Number.isInteger(raw.version)) return raw.version;
  if ('money' in raw || 'unlocked' in raw) return 1;
  return 0;
}

/** Run every migration from the save's version up to SAVE_VERSION. Throws on future versions. */
export function migrate(raw: unknown): { data: Raw; from: number; steps: number } {
  const from = detectVersion(raw);
  if (from === 0) throw new SaveVersionError('Not a Silent But Deadly save');
  if (from > SAVE_VERSION) throw new SaveVersionError(`Save is from a newer version (v${from}); update the app first`);
  let cur = structuredClone(raw) as Raw;
  let steps = 0;
  for (let v = from; v < SAVE_VERSION; v++) {
    const m = MIGRATIONS[v];
    if (!m) throw new SaveVersionError(`No migration from v${v}`);
    cur = m(cur);
    steps++;
  }
  return { data: cur, from, steps };
}
