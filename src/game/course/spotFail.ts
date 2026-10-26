/**
 * (marlow-walk482 X2a) The per-set "spotted fails the set" rule (pure, Babylon-free). A bay with `spotFail` restarts from
 * its start the moment one of its own squad's guards is in combat (`alerted`): a live, non-passive guard (A1's passive
 * checker never counts). `CourseMode.fixedUpdate` (host) says the line and runs the full set restart.
 *
 * (J14 R1) Generalised for the re-planned yard's stations (`StationDef.retry`): `stationRetryCause` names why the live
 * station retries this step. A bay with stations never runs `spotFail` (the station rule replaces it).
 */
import type { BayDef } from './courseDef';
import type { StationDef } from './stationDef';

/** What the rule reads of a squad guard (an `Enemy` fits it). */
export interface SpotGuard {
  readonly alive: boolean;
  readonly alerted: boolean;
  readonly passive: boolean;
}

/** (J14 A14) Seconds a guard must hold combat on the players before an A8 (`retry: 'caught'`) station retries. */
export const CAUGHT_HOLD = 2;

/** Is a live, non-passive guard in combat? No allocation. */
export function inCombat(squad: readonly SpotGuard[]): boolean {
  for (let i = 0; i < squad.length; i++) {
    const e = squad[i]!;
    if (e.alive && !e.passive && e.alerted) return true;
  }
  return false;
}

/** Has the bay's squad spotted the players (the bay has the rule and a live, non-passive guard is alerted)? No allocation. */
export function spotFailed(bay: Pick<BayDef, 'spotFail'>, squad: readonly SpotGuard[]): boolean {
  if (!bay.spotFail) return false;
  return inCombat(squad);
}

/** (J14 A14) The combat time an A8 station has counted (reset when nobody is in combat). */
export interface CaughtClock {
  t: number;
}

/**
 * (J14 R1; BRIEF A1, A2; PLAN A14, A22) Why the live station retries this fixed step, or null:
 * - `'station'` (A1-A7): a guard in combat (`combat`) or a camera's full detection of a player (`camFull`): `'seen'`.
 * - `'caught'` (A8): a guard holding combat for CAUGHT_HOLD s: `'caught'`; cameras and shorter combat play out.
 * - `'none'` (or a station whose retry is switched off): never.
 * A drill window running out (`'timer'`) is the set's station tick's call (`replan/<set>Ticks.ts`, through the hooks'
 * `retry` -> `CourseMode.stationRetry`), never this rule's. `clock` runs only while combat holds. No allocation.
 */
export function stationRetryCause(retry: StationDef['retry'], combat: boolean, camFull: boolean, clock: CaughtClock, dt: number): 'seen' | 'caught' | null {
  if (retry !== 'caught' || !combat) clock.t = 0;
  switch (retry) {
    case 'station':
      return combat || camFull ? 'seen' : null;
    case 'caught':
      if (!combat) return null;
      clock.t += dt;
      return clock.t >= CAUGHT_HOLD - 1e-9 ? 'caught' : null;
    default:
      return null;
  }
}
