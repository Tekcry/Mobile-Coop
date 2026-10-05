import type { EnemyKind } from '../../ai/enemyDefs';

/** Enemies in wave n (1-based). Pure + deterministic for a given rng. */
export function waveComposition(n: number, rng: () => number = Math.random): EnemyKind[] {
  const total = Math.min(28, 4 + n * 2);
  const heavies = n >= 3 ? Math.min(4, 1 + Math.floor((n - 3) / 2)) : 0;
  const runnerShare = n >= 2 ? Math.min(0.45, 0.2 + n * 0.03) : 0;
  const out: EnemyKind[] = [];
  for (let i = 0; i < heavies; i++) out.push('heavy');
  const rest = total - heavies;
  const runners = Math.round(rest * runnerShare);
  for (let i = 0; i < runners; i++) out.push('runner');
  while (out.length < total) out.push('grunt');
  // shuffle so heavies are not always first
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Score for a kill. */
export function killScore(kind: EnemyKind, headshot: boolean, wave: number): number {
  const base = kind === 'heavy' ? 300 : kind === 'runner' ? 120 : 100;
  return Math.round(base * (headshot ? 1.5 : 1) * (1 + (wave - 1) * 0.1));
}

export function waveClearBonus(wave: number): number {
  return 250 * wave;
}

/** Maximum concurrent enemies for a wave (keeps CPU bounded and fights readable). */
export function waveMaxAlive(n: number): number {
  return Math.min(10, 4 + n);
}
