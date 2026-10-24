/**
 * (marlow-walk482 X2a) The per-set "spotted fails the set" rule (pure, Babylon-free). A bay with `spotFail` restarts from
 * its start the moment one of its own squad's guards is in combat (`alerted`): a live, non-passive guard (A1's passive
 * checker never counts). `CourseMode.fixedUpdate` (host) says the line and runs the full set restart.
 */
import type { BayDef } from './courseDef';

/** What the rule reads of a squad guard (an `Enemy` fits it). */
export interface SpotGuard {
  readonly alive: boolean;
  readonly alerted: boolean;
  readonly passive: boolean;
}

/** Has the bay's squad spotted the players (the bay has the rule and a live, non-passive guard is alerted)? No allocation. */
export function spotFailed(bay: Pick<BayDef, 'spotFail'>, squad: readonly SpotGuard[]): boolean {
  if (!bay.spotFail) return false;
  for (let i = 0; i < squad.length; i++) {
    const e = squad[i]!;
    if (e.alive && !e.passive && e.alerted) return true;
  }
  return false;
}
