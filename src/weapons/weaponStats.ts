import type { WeaponDef } from './weaponDefs';

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

/** Base stats with the attachments' modifiers applied. Pure and deterministic (tested). */
export function computeStats(def: WeaponDef, mods: StatMods = NO_MODS): EffectiveStats {
  return {
    damage: def.damage * mods.damage,
    magSize: Math.max(1, Math.round(def.magSize * mods.magSize)),
    reloadTime: def.reloadTime * mods.reload,
    recoilPitch: def.recoilPitch * mods.recoil,
    recoilYaw: def.recoilYaw * mods.recoil,
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

/** (step 09) Speed (m/s) at which the moving spread term is full: the standing gear-4 cap (`GEARS.stand[3]`). */
export const SPREAD_SPEED_CAP = 2.8;
/** Below this speed (m/s) the shooter counts as still. */
export const SPREAD_STILL_SPEED = 0.15;
/** Crouched and still: the ADS cone narrows to this. */
export const SPREAD_CROUCH_STILL = 0.7;

/**
 * (step 09) The player's cone half-angle in degrees: no hip fire, so always the ADS base (`spreadAds`); crouched and
 * still x0.7, standing still x1, moving adds `spreadMove x speed / 2.8` (capped at gear 4's pace); bloom on top.
 * `spreadHip` (and the hip-fire attachment mods) stay for guards and parked modes only.
 */
export function playerSpreadDeg(def: WeaponDef, stats: EffectiveStats, crouched: boolean, speed: number, bloom: number): number {
  const still = speed < SPREAD_STILL_SPEED;
  const base = stats.spreadAds * (still && crouched ? SPREAD_CROUCH_STILL : 1);
  const move = still ? 0 : (def.spreadMove * Math.min(speed, SPREAD_SPEED_CAP)) / SPREAD_SPEED_CAP;
  return Math.min(def.maxSpread, base + move + bloom);
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
