import type { WeaponDef } from './weaponDefs';

/** Upgrade tracks from the progression upgrade tree (levels 0..MAX_UPGRADE). */
export interface WeaponUpgrades {
  damage: number;
  magazine: number;
  recoil: number;
  reload: number;
}

export const MAX_UPGRADE = 5;
export const NO_UPGRADES: WeaponUpgrades = { damage: 0, magazine: 0, recoil: 0, reload: 0 };

/** Per-level effect of each track. */
export const UPGRADE_EFFECT = {
  damage: 0.06,
  magazine: 0.1,
  recoil: 0.08,
  reload: 0.07,
} as const;

/** Multiplicative modifiers from attachments (all 1 = none). */
export interface StatMods {
  damage: number;
  magSize: number;
  recoil: number;
  spreadHip: number;
  spreadAds: number;
  adsZoom: number;
  reload: number;
  noise: number;
}

export const NO_MODS: StatMods = { damage: 1, magSize: 1, recoil: 1, spreadHip: 1, spreadAds: 1, adsZoom: 1, reload: 1, noise: 1 };

export interface EffectiveStats {
  adsZoom: number;
  /** Gunfire noise radius multiplier (suppressors). */
  noise: number;
  damage: number;
  magSize: number;
  reloadTime: number;
  recoilPitch: number;
  recoilYaw: number;
  fireInterval: number;
  spreadHip: number;
  spreadAds: number;
}

const clampLvl = (n: number): number => Math.max(0, Math.min(MAX_UPGRADE, Math.floor(n || 0)));

/** Base stats with upgrades applied. Pure and deterministic (tested). */
export function computeStats(def: WeaponDef, up: WeaponUpgrades = NO_UPGRADES, mods: StatMods = NO_MODS): EffectiveStats {
  const d = clampLvl(up.damage);
  const m = clampLvl(up.magazine);
  const r = clampLvl(up.recoil);
  const l = clampLvl(up.reload);
  const magBonus = m === 0 ? 0 : Math.max(m, Math.round(def.magSize * UPGRADE_EFFECT.magazine * m));
  return {
    damage: def.damage * (1 + UPGRADE_EFFECT.damage * d) * mods.damage,
    magSize: Math.max(1, Math.round((def.magSize + magBonus) * mods.magSize)),
    reloadTime: def.reloadTime * (1 - UPGRADE_EFFECT.reload * l) * mods.reload,
    recoilPitch: def.recoilPitch * (1 - UPGRADE_EFFECT.recoil * r) * mods.recoil,
    recoilYaw: def.recoilYaw * (1 - UPGRADE_EFFECT.recoil * r) * mods.recoil,
    fireInterval: 60 / def.rpm,
    spreadHip: def.spreadHip * mods.spreadHip,
    spreadAds: def.spreadAds * mods.spreadAds,
    adsZoom: def.adsZoom * mods.adsZoom,
    noise: mods.noise * (def.noise ?? 1),
  };
}

/** Linear damage falloff between falloffStart and falloffEnd, floored at minDamageMult. */
export function falloffMult(def: WeaponDef, distance: number): number {
  if (distance <= def.falloffStart) return 1;
  if (distance >= def.falloffEnd) return def.minDamageMult;
  const t = (distance - def.falloffStart) / (def.falloffEnd - def.falloffStart);
  return 1 + (def.minDamageMult - 1) * t;
}

export function damageAt(def: WeaponDef, stats: EffectiveStats, distance: number, headshot: boolean): number {
  return stats.damage * falloffMult(def, distance) * (headshot ? def.headMult : 1);
}

/** Current cone half-angle in degrees. */
export function spreadDeg(def: WeaponDef, stats: EffectiveStats, ads: number, moving: number, bloom: number): number {
  const base = stats.spreadHip + (stats.spreadAds - stats.spreadHip) * ads;
  return Math.min(def.maxSpread, base + def.spreadMove * moving * (1 - ads * 0.6) + bloom);
}

/** Recoil kick (degrees) for the n-th consecutive shot. */
export function recoilKick(def: WeaponDef, stats: EffectiveStats, shotIndex: number): { pitch: number; yaw: number } {
  const p = def.recoilPattern[shotIndex % def.recoilPattern.length]!;
  return { yaw: p[0] * stats.recoilYaw, pitch: p[1] * stats.recoilPitch };
}

/** Theoretical body-shot DPS at close range (used in the loadout UI). */
export function dps(def: WeaponDef, stats: EffectiveStats): number {
  return (stats.damage * def.pellets) / stats.fireInterval;
}

/**
 * Deterministic spread sample inside a cone: returns (x, y) offsets in units of tan(angle).
 * `r1`, `r2` are uniform [0,1). Square-root keeps the distribution uniform over the disc.
 */
export function sampleSpread(halfAngleDeg: number, r1: number, r2: number): { x: number; y: number } {
  const t = Math.tan((halfAngleDeg * Math.PI) / 180);
  const r = Math.sqrt(r1) * t;
  const a = r2 * Math.PI * 2;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}
