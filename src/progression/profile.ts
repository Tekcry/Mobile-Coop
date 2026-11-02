import type { SaveData } from '../save/schema';
import { practiceMode, type SessionStats } from '../game/modes/gameMode';
import type { DifficultyPreset } from '../ai/archetypes';
import { WEAPON_IDS, type WeaponId } from '../weapons/weaponDefs';
import type { LoadoutEntry } from '../weapons/playerWeapons';
import { computeRewards, type SessionRewards } from './rewards';
import { levelFromXp, masteryLevel, type LevelInfo } from './levels';
import { canUpgrade, type UpgradeTrack } from './upgrades';
import { UNLOCKS, unlockById, unlockState, type UnlockContext, type UnlockItem } from './unlocks';
import { combinedMods, sanitizeAttachments } from './attachments';
import { campaignAttachments, issuedLoadout } from '../config/arsenal';
import { canBuyHq, canBuySuit, CHALLENGES, challengeProgress, PRESETS, type HqId, type SuitPiece } from './suit';

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

/** 3.5: what the campaign opens without buying (weapons and attachments; `SaveManager.openLoadout`). Nothing is written to the save. */
export const campaignOpens = (id: string): boolean => id.startsWith('weapon:') || id.startsWith('att:');

/** `owns`, or opened by the campaign. */
export function ownsOrOpen(s: SaveData, id: string, campaign: boolean): boolean {
  return s.unlocks.includes(id) || (campaign && campaignOpens(id));
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
  /** Challenges completed this session (paid). */
  challenges: string[];
}

export const LEVEL_UP_CREDITS = 200;

/** Apply a finished session to the save. Mutates `s`. */
export function applySession(s: SaveData, stats: SessionStats, difficulty: DifficultyPreset): SessionReport {
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
  if (!practiceMode(stats.mode)) {
    const st = s.profile.stats;
    st.matches++;
    if (stats.won) st.wins++;
    st.kills += Math.min(5000, stats.kills);
    st.headshots += Math.min(5000, stats.headshots);
    st.timePlayed += Math.min(36000, stats.time);
  }
  // challenges: progress, paid once on completion
  const challenges: string[] = [];
  const add = challengeProgress({
    takedownsByKind: stats.takedownsByKind ?? {},
    knockouts: stats.knockouts,
    headshots: stats.headshots,
    gadgetKos: stats.gadgetKos ?? 0,
    mode: stats.mode,
    won: stats.won,
    detections: stats.detections,
    alarms: stats.alarms ?? 0,
  });
  if (!practiceMode(stats.mode)) {
    for (const c of CHALLENGES) {
      if (s.challenges.done.includes(c.id)) continue;
      s.challenges.progress[c.id] = Math.min(1e6, (s.challenges.progress[c.id] ?? 0) + (add[c.id] ?? 0));
      if (s.challenges.progress[c.id]! >= c.goal) {
        s.challenges.done.push(c.id);
        s.profile.credits += c.credits;
        s.profile.xp += c.xp;
        challenges.push(c.id);
      }
    }
  }
  const granted = autoGrant(s);
  const ctxAfter = unlockContext(s);
  const nowBuyable = UNLOCKS.filter((u) => unlockState(u, ctxAfter) === 'buyable' && !buyableBefore.has(u.id));
  return { rewards, before, after, levelUps, levelUpCredits, masteryUps, granted, nowBuyable, challenges };
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

export function setAttachment(s: SaveData, w: WeaponId, attId: string, on: boolean, campaign = false): boolean {
  if (on && !ownsOrOpen(s, `att:${attId}`, campaign)) return false;
  const cur = s.weapons[w].attachments.filter((a) => a !== attId);
  const next = on ? [attId, ...cur] : cur;
  s.weapons[w].attachments = sanitizeAttachments(w, next);
  return true;
}

/** Buy the next tier of a suit piece (tiers are bought in order) and wear it. */
export function buySuit(s: SaveData, piece: SuitPiece, tier: number): { ok: boolean; reason?: string } {
  const c = canBuySuit(s.suit.owned, piece, tier, levelInfo(s).level, s.profile.credits);
  if (!c.ok) return { ok: false, reason: c.reason };
  s.profile.credits -= c.price;
  s.suit.owned[piece] = tier;
  s.suit.worn[piece] = tier;
  return { ok: true };
}

/** Wear an owned tier (lighter armour is a choice too). */
export function wearSuit(s: SaveData, piece: SuitPiece, tier: number): boolean {
  if (tier < 0 || tier > s.suit.owned[piece]) return false;
  s.suit.worn[piece] = tier;
  return true;
}

export function buyHq(s: SaveData, id: HqId): { ok: boolean; reason?: string } {
  const c = canBuyHq(s.hq, id, levelInfo(s).level, s.profile.credits);
  if (!c.ok) return { ok: false, reason: c.reason };
  s.profile.credits -= c.price;
  s.hq[id]++;
  return { ok: true };
}

/** Store the current loadout (and gadget) into preset `i`. */
export function savePreset(s: SaveData, i: number, gadget?: string): boolean {
  const p = s.presets[i];
  if (!p || i >= PRESETS) return false;
  p.primary = s.loadout.primary;
  p.secondary = s.loadout.secondary;
  if (gadget) p.gadget = gadget.slice(0, 16);
  s.preset = i;
  return true;
}

/** Use preset `i`: its weapons become the loadout (if still owned). */
export function applyPreset(s: SaveData, i: number, campaign = false): boolean {
  const p = s.presets[i];
  if (!p) return false;
  const ok = (w: string): w is WeaponId => (WEAPON_IDS as readonly string[]).includes(w) && ownsOrOpen(s, `weapon:${w}`, campaign);
  if (ok(p.primary)) s.loadout.primary = p.primary;
  if (ok(p.secondary) && p.secondary !== s.loadout.primary) s.loadout.secondary = p.secondary;
  s.preset = i;
  return true;
}

export function setLoadout(s: SaveData, slot: 'primary' | 'secondary', w: WeaponId, campaign = false): boolean {
  if (!ownsOrOpen(s, `weapon:${w}`, campaign)) return false;
  const other = slot === 'primary' ? 'secondary' : 'primary';
  if (s.loadout[other] === w) s.loadout[other] = s.loadout[slot];
  s.loadout[slot] = w;
  return true;
}

/**
 * Weapons for a match from the profile (the practice modes: a fixed set, still with your upgrades; the campaign:
 * the loadout mapped onto the curated arsenal at use, `config/arsenal.ts`, bible 5.6). `campaignOpen`: always true now.
 * (sector-restart, M9, A2) Sector Ops issues the campaign kit too: its rifle comes suppressed (A62), as the Kit screen
 * and the co-op lobby loadout already show it.
 */
export function loadoutEntries(
  s: SaveData,
  mode: SessionStats['mode'],
  campaignOpen: boolean,
  skin?: (w: WeaponId, camo: string) => Pick<LoadoutEntry, 'colors' | 'pattern'>,
): LoadoutEntry[] {
  const campaign = mode === 'sector' && campaignOpen;
  const ids: WeaponId[] = practiceMode(mode) ? ['rifle', 'pistolSd'] : lobbyLoadout(s, campaign);
  return ids.map((id) => {
    const att = campaign ? campaignAttachments(id, s.weapons[id].attachments) : [...s.weapons[id].attachments];
    return { id, upgrades: s.weapons[id].upgrades, mods: combinedMods(att), attachments: att, ...(skin?.(id, s.weapons[id].camo) ?? {}) };
  });
}

/**
 * The two weapon ids a match issues, in hand first (pure). Co-op sends this as the lobby loadout (`main.ts`, with
 * `campaignUnlocked`), so the host's weapon checks (`hostWeapon`, `hostShotWeapon`) and remote avatars see the
 * guns the campaign issues (D8).
 */
export function lobbyLoadout(s: SaveData, campaign: boolean): WeaponId[] {
  const lo = issuedLoadout(s.loadout, campaign);
  return [lo.primary, lo.secondary];
}
