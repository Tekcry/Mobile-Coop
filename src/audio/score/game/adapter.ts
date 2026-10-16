import type { AlertLevel } from '../../../ai/alertState';
import type { GameAwareness } from '../director';

/**
 * The only place the music reads the game (music-spec Section 2): every guard's alert level, folded into the three
 * states the music director understands. It only reads; gameplay never reads the music. Guard count, distance and
 * direction never count (honest music, docs/music/research.md Section 9).
 *
 * - alert (combat) -> alert
 * - suspicious, investigating, searching -> caution (after combat the director steps down through Evasion first)
 * - unaware, cooldown (back on the route) -> calm
 */
export interface Watcher {
  alive: boolean;
  aware: { level: AlertLevel };
}

/** Indexed loop, no allocation: called every few frames. */
export function awareness(guards: readonly Watcher[] | undefined): GameAwareness {
  if (!guards) return 'calm';
  let caution = false;
  for (let i = 0; i < guards.length; i++) {
    const g = guards[i]!;
    if (!g.alive) continue;
    const l = g.aware.level;
    if (l === 'alert') return 'alert';
    if (l === 'suspicious' || l === 'investigating' || l === 'searching') caution = true;
  }
  return caution ? 'caution' : 'calm';
}
