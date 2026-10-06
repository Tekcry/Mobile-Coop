import type { WeaponId } from '../weapons/weaponDefs';
import { MAX_UPGRADE, type WeaponUpgrades } from '../weapons/weaponStats';

export type UpgradeTrack = keyof WeaponUpgrades;
export const TRACKS: readonly UpgradeTrack[] = ['damage', 'magazine', 'recoil', 'reload'];
export const TRACK_LABEL: Record<UpgradeTrack, string> = {
  damage: 'Damage',
  magazine: 'Magazine',
  recoil: 'Recoil control',
  reload: 'Reload speed',
};

const TIER: Partial<Record<WeaponId, number>> = { pistol: 0.7, fiveseven: 0.75, pistolSd: 0.75, smg: 1, vector: 1.05, p90: 1.05, rifle: 1.1, ak: 1.1, tavor: 1.15, shotgun: 1.1, semiShotgun: 1.15, breacher: 1, sniper: 1.3, dmr: 1.25, crossbow: 1.2, lmg: 1.3 };

/** Credits to buy the next level of a track (current level -> level + 1). */
export function upgradeCost(weapon: WeaponId, current: number): number {
  return Math.round(((150 * (current + 1) + 50 * current * current) * (TIER[weapon] ?? 1)) / 10) * 10;
}

/** Player level needed before buying track level `next` (1-based). */
export function upgradeLevelGate(next: number): number {
  return Math.max(1, (next - 1) * 3);
}

export type UpgradeCheck = { ok: true; cost: number } | { ok: false; reason: 'maxed' | 'level' | 'credits'; cost: number; needLevel?: number };

export function canUpgrade(weapon: WeaponId, ups: WeaponUpgrades, track: UpgradeTrack, playerLevel: number, credits: number): UpgradeCheck {
  const cur = ups[track];
  if (cur >= MAX_UPGRADE) return { ok: false, reason: 'maxed', cost: 0 };
  const cost = upgradeCost(weapon, cur);
  const gate = upgradeLevelGate(cur + 1);
  if (playerLevel < gate) return { ok: false, reason: 'level', cost, needLevel: gate };
  if (credits < cost) return { ok: false, reason: 'credits', cost };
  return { ok: true, cost };
}
