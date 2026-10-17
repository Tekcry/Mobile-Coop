/**
 * Wall medkit stations (DECISIONS G20 / G98): the only way health comes back (no carried kits, Chaos Theory). Health
 * 100; a station heals 40 on use and is single use (shown spent). Pure and unit-tested: the game (`gameState.ts`) and
 * the co-op host (`coopHost.ts`, for clients) run on it.
 */

export const MEDKIT = {
  /** Health a station restores (hp, of 100). */
  heal: 40,
  /** Hold to use a station (s). */
  wallHold: 0.6,
} as const;

/** A station's heal on `hp` of `maxHp`: the health after it, or null when it cannot be used (down, or at full health). */
export function stationHeal(hp: number, maxHp: number, alive: boolean): number | null {
  if (!alive || hp >= maxHp) return null;
  return Math.min(maxHp, hp + MEDKIT.heal);
}
