/** (sd-rounds) Limited suppressor ammo: a count of quiet (subsonic) rounds per suppressed gun, separate from the magazine.
 *  Pure logic, no Babylon. A suppressed shot spends one; at 0 the gun still fires but at its open noise. */
import type { WeaponId } from './weaponDefs';

/** Same threshold as gameState SUPPRESSED_NOISE: a noise stat at or under this is a quiet shot. */
export const SUPPRESSED_NOISE = 0.6;
/** Quiet rounds a suppressed gun starts with (absent: unlimited). */
export const SD_ROUNDS: Partial<Record<WeaponId, number>> = { rifle: 60, pistolSd: 45 };
/** Noise stat of a shot once the quiet rounds are spent (absent: 1). */
export const SD_OPEN_NOISE: Partial<Record<WeaponId, number>> = { rifle: 1, pistolSd: 0.8 };
/** The HUD count turns red at this many quiet rounds or fewer. */
export const SD_LOW = 5;

export interface SdSlot {
  readonly def: { readonly id: WeaponId };
  readonly stats: { readonly noise: number };
  sd: number;
}

export function sdStart(id: WeaponId): number {
  return SD_ROUNDS[id] ?? Infinity;
}

export function sdOpenNoise(id: WeaponId): number {
  return SD_OPEN_NOISE[id] ?? 1;
}

/** This shot's noise stat; spends one quiet round (not when `infinite`). Open gun (noise > SUPPRESSED_NOISE): its
 *  noise, nothing spent. Suppressed with sd > 0: its noise, sd - 1. Suppressed with sd 0: sdOpenNoise(id). */
export function spendShot(s: SdSlot, infinite: boolean): number {
  const n = s.stats.noise;
  if (n > SUPPRESSED_NOISE) return n;
  if (s.sd > 0) {
    if (!infinite) s.sd--;
    return n;
  }
  return sdOpenNoise(s.def.id);
}

/** Ammo pickup: sd = min(sdStart, sd + ceil(sdStart * fraction)); no-op when sdStart or sd is Infinity. */
export function addSd(s: SdSlot, fraction: number): void {
  const start = sdStart(s.def.id);
  if (!Number.isFinite(start) || !Number.isFinite(s.sd)) return;
  s.sd = Math.min(start, s.sd + Math.ceil(start * fraction));
}

/** HUD count: -1 when infinite, sd not finite, or the gun is open; else sd. */
export function sdHud(s: SdSlot, infinite: boolean): number {
  if (infinite || !Number.isFinite(s.sd) || s.stats.noise > SUPPRESSED_NOISE) return -1;
  return s.sd;
}
