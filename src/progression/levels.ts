/** XP curve and level maths. Pure. */
export const MAX_LEVEL = 50;

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return 500 + 250 * (Math.max(1, level) - 1);
}

/** Total XP required to reach `level` from level 1. */
export function totalXpForLevel(level: number): number {
  const L = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  // sum_{k=1}^{L-1} (500 + 250(k-1)) = 500(L-1) + 125(L-1)(L-2)
  const n = L - 1;
  return 500 * n + 125 * n * (n - 1);
}

export interface LevelInfo {
  level: number;
  /** XP into the current level. */
  into: number;
  /** XP needed for the next level (0 at max). */
  need: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (level < MAX_LEVEL && totalXpForLevel(level + 1) <= xp) level++;
  if (level >= MAX_LEVEL) return { level: MAX_LEVEL, into: 0, need: 0 };
  return { level, into: xp - totalXpForLevel(level), need: xpToNext(level) };
}

/** Mastery thresholds (kills with a weapon). Mastery level 0..5. */
export const MASTERY_KILLS = [10, 30, 60, 100, 160] as const;

export function masteryLevel(kills: number): number {
  let m = 0;
  for (const t of MASTERY_KILLS) if (kills >= t) m++;
  return m;
}
