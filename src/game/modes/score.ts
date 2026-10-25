import type { EnemyKind } from '../../ai/enemyDefs';

/** Base score per kind. (guard-rules S1, A5, M1) A killed dog costs `dog` (negative: G348's penalty for killing); undo:
 *  `dog` back to 120. A knocked-out dog (gas, G348) scores `DOG_KO` as before. */
const KILL_BASE: Partial<Record<EnemyKind, number>> = { heavy: 300, runner: 120, enforcer: 260, sniper: 220, dog: -120, officer: 250, droneOp: 180 };
/** (guard-rules S1, A5) A dog knocked out (not killed): today's reward, unchanged. */
const DOG_KO = 120;

/**
 * Score for a kill; `tier` scales it (+10% per tier above 1). Mission and Infiltration score at tier 2. (guard-rules S1,
 * A5) `killed` false = a knock-out (Sector Ops passes `!e.ko`; default true: the parked modes and co-op validation): a
 * killed dog scores `KILL_BASE.dog` (negative) with no headshot bonus, a knocked-out dog `DOG_KO`; other kinds as before.
 */
export function killScore(kind: EnemyKind, headshot: boolean, tier: number, killed = true): number {
  const dog = kind === 'dog';
  const base = dog ? (killed ? (KILL_BASE.dog ?? 0) : DOG_KO) : (KILL_BASE[kind] ?? 100);
  return Math.round(base * (headshot && !(dog && killed) ? 1.5 : 1) * (1 + (tier - 1) * 0.1));
}
