import type { SaveData } from '../save/schema';
import type { SessionStats } from '../game/modes/gameMode';
import type { Difficulty } from '../ai/enemyDefs';
import { WEAPON_IDS, type WeaponId } from '../weapons/weaponDefs';
import type { LoadoutEntry } from '../weapons/playerWeapons';
import { computeRewards, type SessionRewards } from './rewards';
import { levelFromXp, masteryLevel, type LevelInfo } from './levels';
import { canUpgrade, type UpgradeTrack } from './upgrades';
import { UNLOCKS, unlockById, unlockState, type UnlockContext, type UnlockItem } from './unlocks';
import { combinedMods, sanitizeAttachments } from './attachments';

/** Pure operations on a SaveData (callers clone via SaveManager.update). */

export function levelInfo(s: SaveData): LevelInfo {
  return levelFromXp(s.profile.xp);
}

export function weaponMastery(s: SaveData, w: WeaponId): number {
  return masteryLevel(s.weapons[w].kills);
}

export function unlockContext(s: SaveData): UnlockContext {
  return { level: levelInfo(s).level, credits: s.profile.credits, mastery: (w) => weaponMastery(s, w), owned: new Set(s.unlocks) };
}

export function owns(s: SaveData, id: string): boolean {
  return s.unlocks.includes(id);
}

/** Grant every unlock whose requirements are met and price is 0. Returns what was granted. */
export function autoGrant(s: SaveData): UnlockItem[] {
  const ctx = unlockContext(s);
  const granted: UnlockItem[] = [];
  for (const u of UNLOCKS) {
    if (unlockState(u, ctx) === 'free') {
      s.unlocks.push(u.id);
      granted.push(u);
    }
  }
  return granted;
}

export interface SessionReport {
  rewards: SessionRewards;
  before: LevelInfo;
  after: LevelInfo;
  levelUps: number;
  levelUpCredits: number;
  masteryUps: { weapon: WeaponId; level: number }[];
  granted: UnlockItem[];
  /** Unlocks that became purchasable this session. */
  nowBuyable: UnlockItem[];
}

export const LEVEL_UP_CREDITS = 200;

/** Apply a finished session to the save. Mutates `s`. */
export function applySession(s: SaveData, stats: SessionStats, difficulty: Difficulty): SessionReport {
  const before = levelInfo(s);
  const ctxBefore = unlockContext(s);
  const buyableBefore = new Set(UNLOCKS.filter((u) => unlockState(u, ctxBefore) === 'buyable').map((u) => u.id));
  const rewards = computeRewards(stats, difficulty);
  s.profile.xp += rewards.xp;
  s.profile.credits += rewards.credits;
  const after = levelInfo(s);
  const levelUps = after.level - before.level;
  const levelUpCredits = levelUps * LEVEL_UP_CREDITS;
  s.profile.credits += levelUpCredits;
  // weapon mastery
  const masteryUps: SessionReport['masteryUps'] = [];
  for (const w of WEAPON_IDS) {
    const k = Math.max(0, Math.min(500, Math.floor(stats.weaponKills[w] ?? 0)));
    if (!k) continue;
    const m0 = masteryLevel(s.weapons[w].kills);
    s.weapons[w].kills += k;
    const m1 = masteryLevel(s.weapons[w].kills);
    if (m1 > m0) masteryUps.push({ weapon: w, level: m1 });
  }
  // lifetime stats
  if (stats.mode !== 'sandbox') {
    const st = s.profile.stats;
    st.matches++;
    if (stats.won) st.wins++;
    st.kills += Math.min(5000, stats.kills);
    st.headshots += Math.min(5000, stats.headshots);
    st.bestWave = Math.max(st.bestWave, stats.waves);
    st.timePlayed += Math.min(36000, stats.time);
  }
  const granted = autoGrant(s);
  const ctxAfter = unlockContext(s);
  const nowBuyable = UNLOCKS.filter((u) => unlockState(u, ctxAfter) === 'buyable' && !buyableBefore.has(u.id));
  return { rewards, before, after, levelUps, levelUpCredits, masteryUps, granted, nowBuyable };
}

export type BuyResult = { ok: true; item: UnlockItem } | { ok: false; reason: string };

export function buyUnlock(s: SaveData, id: string): BuyResult {
  const item = unlockById(id);
  if (!item) return { ok: false, reason: 'Unknown item' };
  const st = unlockState(item, unlockContext(s));
  if (st === 'owned') return { ok: false, reason: 'Already owned' };
  if (st === 'locked') return { ok: false, reason: 'Requirements not met' };
  const price = item.req.price ?? 0;
  if (s.profile.credits < price) return { ok: false, reason: 'Not enough credits' };
  s.profile.credits -= price;
  s.unlocks.push(id);
  return { ok: true, item };
}

export function buyUpgrade(s: SaveData, w: WeaponId, track: UpgradeTrack): { ok: boolean; reason?: string } {
  if (!owns(s, `weapon:${w}`)) return { ok: false, reason: 'Weapon locked' };
  const c = canUpgrade(w, s.weapons[w].upgrades, track, levelInfo(s).level, s.profile.credits);
  if (!c.ok) return { ok: false, reason: c.reason === 'level' ? `Requires level ${c.needLevel}` : c.reason === 'credits' ? 'Not enough credits' : 'Maxed' };
  s.profile.credits -= c.cost;
  s.weapons[w].upgrades[track]++;
  return { ok: true };
}

export function setAttachment(s: SaveData, w: WeaponId, attId: string, on: boolean): boolean {
  if (on && !owns(s, `att:${attId}`)) return false;
  const cur = s.weapons[w].attachments.filter((a) => a !== attId);
  const next = on ? [attId, ...cur] : cur;
  s.weapons[w].attachments = sanitizeAttachments(w, next);
  return true;
}

export function setLoadout(s: SaveData, slot: 'primary' | 'secondary', w: WeaponId): boolean {
  if (!owns(s, `weapon:${w}`)) return false;
  const other = slot === 'primary' ? 'secondary' : 'primary';
  if (s.loadout[other] === w) s.loadout[other] = s.loadout[slot];
  s.loadout[slot] = w;
  return true;
}

/** Weapons for a match from the profile (sandbox: every weapon, still with your upgrades). */
export function loadoutEntries(s: SaveData, mode: SessionStats['mode'], skin?: (w: WeaponId, camo: string) => Pick<LoadoutEntry, 'colors' | 'pattern'>): LoadoutEntry[] {
  const ids: WeaponId[] = mode === 'sandbox' ? ['rifle', 'smg', 'shotgun', 'sniper', 'pistol'] : [s.loadout.primary, s.loadout.secondary];
  return ids.map((id) => ({
    id,
    upgrades: s.weapons[id].upgrades,
    mods: combinedMods(s.weapons[id].attachments),
    ...(skin?.(id, s.weapons[id].camo) ?? {}),
  }));
}
