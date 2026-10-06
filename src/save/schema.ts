import { defaultLook, sanitizeLook, type AvatarLook } from '../cosmetics/avatarLook';
import { WEAPON_IDS, type WeaponId } from '../weapons/weaponDefs';
import { MAX_UPGRADE, type WeaponUpgrades } from '../weapons/weaponStats';
import { MAX_LEVEL, totalXpForLevel } from '../progression/levels';
import { sanitizeAttachments } from '../progression/attachments';
import { STARTER_UNLOCKS } from '../progression/unlocks';

/** Current save schema version. Bump + add a migration in migrations.ts. */
export const SAVE_VERSION = 5;

export interface WeaponProgress {
  upgrades: WeaponUpgrades;
  attachments: string[];
  camo: string;
  kills: number;
}

export interface LifetimeStats {
  matches: number;
  wins: number;
  kills: number;
  headshots: number;
  bestWave: number;
  timePlayed: number;
}

/** Best result per Infiltration mission (rating 0-3 stars, play-style points of that run). */
export interface MissionRecord {
  rating: number;
  score: number;
  ghost: number;
  panther: number;
  assault: number;
  plays: number;
  wins: number;
}

export interface PlayerTag {
  title: string;
  color: string;
  emblem: string;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  createdAt: number;
  updatedAt: number;
  profile: {
    name: string;
    xp: number;
    credits: number;
    tag: PlayerTag;
    stats: LifetimeStats;
  };
  unlocks: string[];
  weapons: Record<WeaponId, WeaponProgress>;
  loadout: { primary: WeaponId; secondary: WeaponId };
  avatar: AvatarLook;
  /** Equipped emotes (4 quick slots). */
  emotes: string[];
  /** Infiltration records by mission id (v5). */
  missions: Record<string, MissionRecord>;
}

export function defaultWeaponProgress(): WeaponProgress {
  return { upgrades: { damage: 0, magazine: 0, recoil: 0, reload: 0 }, attachments: [], camo: 'factory', kills: 0 };
}

export function defaultSave(now = Date.now()): SaveData {
  const weapons = {} as Record<WeaponId, WeaponProgress>;
  for (const w of WEAPON_IDS) weapons[w] = defaultWeaponProgress();
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    profile: {
      name: 'Operator',
      xp: 0,
      credits: 500,
      tag: { title: 'Rookie', color: '#ff8a1e', emblem: 'chevron' },
      stats: { matches: 0, wins: 0, kills: 0, headshots: 0, bestWave: 0, timePlayed: 0 },
    },
    unlocks: [...STARTER_UNLOCKS, 'emote:wave', 'emote:salute', 'tag:Rookie', 'camo:factory', 'pattern:solid'],
    weapons,
    loadout: { primary: 'rifle', secondary: 'pistol' },
    avatar: defaultLook(),
    emotes: ['wave', 'salute', '', ''],
    missions: {},
  };
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const int = (v: unknown, lo: number, hi: number, d: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d;
const str = (v: unknown, max: number, d: string): string => (typeof v === 'string' ? v.slice(0, max) : d);
const HEX = /^#[0-9a-f]{6}$/i;
const isWeapon = (v: unknown): v is WeaponId => WEAPON_IDS.includes(v as WeaponId);

/** Clamp/repair a current-version save (after migration). Never throws. */
export function sanitizeSave(raw: unknown): SaveData {
  const d = defaultSave();
  if (!isObj(raw)) return d;
  const p = isObj(raw.profile) ? raw.profile : {};
  const st = isObj(p.stats) ? p.stats : {};
  const tag = isObj(p.tag) ? p.tag : {};
  const maxXp = totalXpForLevel(MAX_LEVEL) + 1_000_000;
  const weapons = {} as Record<WeaponId, WeaponProgress>;
  const rw = isObj(raw.weapons) ? raw.weapons : {};
  for (const w of WEAPON_IDS) {
    const e = isObj(rw[w]) ? (rw[w] as Obj) : {};
    const u = isObj(e.upgrades) ? e.upgrades : {};
    weapons[w] = {
      upgrades: {
        damage: int(u.damage, 0, MAX_UPGRADE, 0),
        magazine: int(u.magazine, 0, MAX_UPGRADE, 0),
        recoil: int(u.recoil, 0, MAX_UPGRADE, 0),
        reload: int(u.reload, 0, MAX_UPGRADE, 0),
      },
      attachments: sanitizeAttachments(w, Array.isArray(e.attachments) ? e.attachments.filter((x): x is string => typeof x === 'string') : []),
      camo: str(e.camo, 32, 'factory'),
      kills: int(e.kills, 0, 1e9, 0),
    };
  }
  const unlocks = Array.isArray(raw.unlocks) ? [...new Set(raw.unlocks.filter((x): x is string => typeof x === 'string' && x.length < 64))] : [];
  for (const s of d.unlocks) if (!unlocks.includes(s)) unlocks.push(s);
  const lo = isObj(raw.loadout) ? raw.loadout : {};
  let primary: WeaponId = isWeapon(lo.primary) ? lo.primary : 'rifle';
  let secondary: WeaponId = isWeapon(lo.secondary) ? lo.secondary : 'pistol';
  if (!unlocks.includes(`weapon:${primary}`)) primary = 'rifle';
  if (!unlocks.includes(`weapon:${secondary}`) || secondary === primary) secondary = primary === 'pistol' ? 'rifle' : 'pistol';
  const missions: Record<string, MissionRecord> = {};
  if (isObj(raw.missions)) {
    for (const [id, r] of Object.entries(raw.missions).slice(0, 64)) {
      if (!/^[a-z0-9-]{1,48}$/.test(id) || !isObj(r)) continue;
      missions[id] = {
        rating: int(r.rating, 0, 3, 0),
        score: int(r.score, 0, 1e9, 0),
        ghost: int(r.ghost, 0, 1e9, 0),
        panther: int(r.panther, 0, 1e9, 0),
        assault: int(r.assault, 0, 1e9, 0),
        plays: int(r.plays, 0, 1e9, 0),
        wins: int(r.wins, 0, 1e9, 0),
      };
    }
  }
  const emotes = Array.isArray(raw.emotes) ? raw.emotes.slice(0, 4).map((e) => (typeof e === 'string' ? e.slice(0, 24) : '')) : d.emotes;
  while (emotes.length < 4) emotes.push('');
  return {
    version: SAVE_VERSION,
    createdAt: int(raw.createdAt, 0, 8.64e15, d.createdAt),
    updatedAt: int(raw.updatedAt, 0, 8.64e15, d.updatedAt),
    profile: {
      name: str(p.name, 20, d.profile.name).replace(/[<>]/g, '') || d.profile.name,
      xp: int(p.xp, 0, maxXp, 0),
      credits: int(p.credits, 0, 1e9, d.profile.credits),
      tag: {
        title: str(tag.title, 24, d.profile.tag.title),
        color: typeof tag.color === 'string' && HEX.test(tag.color) ? tag.color : d.profile.tag.color,
        emblem: str(tag.emblem, 24, d.profile.tag.emblem),
      },
      stats: {
        matches: int(st.matches, 0, 1e9, 0),
        wins: int(st.wins, 0, 1e9, 0),
        kills: int(st.kills, 0, 1e9, 0),
        headshots: int(st.headshots, 0, 1e9, 0),
        bestWave: int(st.bestWave, 0, 1e6, 0),
        timePlayed: int(st.timePlayed, 0, 1e10, 0),
      },
    },
    unlocks,
    weapons,
    loadout: { primary, secondary },
    avatar: sanitizeLook(raw.avatar),
    emotes,
    missions,
  };
}
