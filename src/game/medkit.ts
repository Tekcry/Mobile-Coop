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

/**
 * (CT prototype, G162) The share of max health a station restores by difficulty (starting values): full on Normal (and
 * Rookie), 50% on Hard (Realistic), 25% on Expert (Perfectionist).
 */
export const MEDKIT_FRACTION: Record<string, number> = { rookie: 1, normal: 1, realistic: 0.5, perfectionist: 0.25 };

/** Share of max health a station restores on `difficulty` (unknown: Normal). */
export function medkitFraction(difficulty: string | undefined): number {
  return MEDKIT_FRACTION[difficulty ?? 'normal'] ?? 1;
}

/** A station's heal on `hp` of `maxHp`: the health after it, or null when it cannot be used (down, or at full health). */
export function stationHeal(hp: number, maxHp: number, alive: boolean, difficulty?: string): number | null {
  if (!alive || hp >= maxHp) return null;
  const amount = difficulty === undefined ? MEDKIT.heal : Math.ceil(maxHp * medkitFraction(difficulty));
  return Math.min(maxHp, hp + amount);
}
