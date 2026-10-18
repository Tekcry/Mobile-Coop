import type { EnemyKind } from '../../ai/enemyDefs';

const KILL_BASE: Partial<Record<EnemyKind, number>> = { heavy: 300, runner: 120, enforcer: 260, sniper: 220, dog: 120, officer: 250, droneOp: 180 };

/** Score for a kill; `tier` scales it (+10% per tier above 1). Mission and Infiltration score at tier 2. */
export function killScore(kind: EnemyKind, headshot: boolean, tier: number): number {
  const base = KILL_BASE[kind] ?? 100;
  return Math.round(base * (headshot ? 1.5 : 1) * (1 + (tier - 1) * 0.1));
}
