import { SAVE_VERSION } from './schema';
import { LEGACY_LOOK_IDS } from '../cosmetics/avatarLook';

/**
 * Versioned migrations. Each step takes the previous version's raw object and returns the next.
 * History:
 *  v1 (prototype): { version: 1, xp, money, unlocked: string[], upgrades: { [weapon]: {damage,...} } }
 *  v2: renamed money -> credits, nested under profile; per-weapon { upgrades, kills }; loadout
 *  v3: avatar look, emotes, player tag, weapon attachments + camo, lifetime stats
 *  v4: avatar overhaul - renamed look options (slim/regular/heavy -> lean/average/broad, square/hex/tall
 *      heads -> strong/oval/long, spikes -> swept, blade -> bedroll, horns -> headset) in the look and
 *      in owned `part:` unlock ids
 */
type Raw = Record<string, unknown>;
type Migration = (s: Raw) => Raw;

const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);

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
  // P45 / MP5 / 552 / M870 / M700, so unlocks and upgrades carry over as they are)
  5: (s) => ({ ...s, version: 6 }),
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
  if (from === 0) throw new SaveVersionError('Not a Shoulder Strike save');
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
