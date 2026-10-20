import { flags } from '../core/flags';
import type { GameState } from '../game/gameState';

/**
 * (coop-fix) A live co-op session keeps its sim running while its page is hidden (core/bgTick.ts): the host's
 * snapshots and the client's states keep flowing when the other player's window covers this one. Returns the release
 * (the session's dispose). `?net=local` (the same-device test transport) is left out: the two-page e2e suites pump a
 * background page's sim themselves, and a second stepper would run it at twice the speed.
 */
export function keepSimInBackground(g: GameState): () => void {
  if (flags.net === 'local') return () => undefined;
  return g.app.loop.holdBackgroundTicks();
}
