import type { GameState } from '../game/gameState';

/**
 * (coop-fix) A live co-op session keeps its sim running while its page is hidden (core/bgTick.ts): the host's
 * snapshots and the client's states keep flowing when the other player's window covers this one. Returns the release
 * (the session's dispose). Every transport takes it, `?net=local` two-tab play too (one tab is always hidden). Automated
 * browsers (`navigator.webdriver`, the e2e suites) are left out: they pump a background page's sim themselves.
 */
export function keepSimInBackground(g: GameState): () => void {
  if (typeof navigator !== 'undefined' && navigator.webdriver) return () => undefined;
  return g.app.loop.holdBackgroundTicks();
}
