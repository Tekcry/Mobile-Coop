/**
 * (guard-ai S18, S19, Michael's walk of 4.72) How a calm search runs and who hurries to it (pure: no Babylon / DOM),
 * unit-tested (`tests/bodySearch.test.ts`, `tests/urgency.test.ts`). `Enemy` reads the tables: his paces (`PACE`, the
 * rush: `urgentKind`, `paceSpeed`), how long he searches and the ring of points he walks.
 *
 * A search (searching, not after combat) walks from its centre out over a widening ring of points (`ringPoint`: the
 * k-th point `r0 + k x step` m out, capped at `max`, a golden-angle bearing per searcher so a pair fans out), looks round
 * `look` s at each, and ends after `time` s (then the cooldown; cautious guards stay on edge). Three kinds:
 * - plain (a call, a pair, the knockout search, a light cut): `ALERT.searchTime` and `PATROL`'s ring, as before;
 * - body (G2 "guards investigating dead bodies give up too easily"): a dead body found, `BODY_SEARCH` (`gear.ts`):
 *   `ALERT.searchTime` x `timeMul`, a denser ring out to a wider radius, so more points round the body;
 * - device (S17): a tripped device's spot, the plain numbers inside the device's room.
 * Allocation-free: `ringPoint` writes the caller's `out`; the table is built once.
 */
import { ALERT } from './alertState';
import { PATROL } from './patrol';
import { BODY_SEARCH, URGENT } from './gear';
import type { IncidentKind } from './incidents';

/**
 * Calm paces (x the combat walk, which is a slow aimed walk). (guard-ai S2, A9) Coordinated guards investigate at 0.85
 * and search at 0.75 (they were faster than the patrol: backwards); the parked modes (Hunter, Mission) keep the old
 * 1.2 / 1.3. Patrol 1.1 is unchanged (the Sector pace checks, `CHECK_PATROL_PACE`). Walking to wake a knocked-out
 * squadmate keeps 1.3 (he hurries to a man down). (guard-ai S4, A9) A cautious guard patrols at 0.95 (not on a timed
 * loop: its schedule is the map's). (guard-ai S19, walk 4.72 G3) `rush` is x the RUN speed, not the walk: a jog (as
 * the aggressive jog, `AGGRESSIVE_JOG` in `enemy.ts`) for a guard hurrying to an alarm, a reported body, shots or a
 * missing man, until he first gets there (`paceSpeed`). (Moved here from `enemy.ts` in S19: pure; `enemy.ts`
 * re-exports it.)
 */
export const PACE = {
  patrol: 1.1,
  cautious: 0.95,
  investigate: 0.85,
  search: 0.75,
  revive: 1.3,
  oldInvestigate: 1.2,
  oldSearch: 1.3,
  rush: 0.75,
} as const;

/**
 * (guard-ai S19, G3: "guards should rush to any triggered alarms or bodies reported, they need a sense of urgency when
 * it makes logical sense") Does a guard sent to an incident of `kind` hurry? A tripped device (an alarm), a body (a
 * camera's, a radio report's, a kill seen), shots, a missing man, a contact: yes. A noise, a lure, a light gone out, a
 * breaker fault: no, they keep their calm pace. `URGENT.enabled` false: never.
 */
export function urgentKind(kind: IncidentKind): boolean {
  if (!URGENT.enabled) return false;
  switch (kind) {
    case 'noise':
    case 'distraction':
    case 'light':
    case 'breaker':
      return false;
    default:
      return true;
  }
}

/** (guard-ai S19) A calm-level move's speed (m/s): hurrying (`rush`), `run` x `PACE.rush`; else `walk` x `calm` (his
 *  pace multiplier: investigate, search, ...). */
export function paceSpeed(rush: boolean, calm: number, walk: number, run: number): number {
  return rush && URGENT.enabled ? run * PACE.rush : walk * calm;
}

export const SEARCH_PLAIN = 0;
export const SEARCH_BODY = 1;
export const SEARCH_DEVICE = 2;
export type SearchKind = typeof SEARCH_PLAIN | typeof SEARCH_BODY | typeof SEARCH_DEVICE;

/** One kind of search: its length (s), the ring's first radius, growth per point and cap (m), the look at each point (s). */
export interface SearchSpec {
  readonly time: number;
  readonly r0: number;
  readonly step: number;
  readonly max: number;
  readonly look: number;
}

const PLAIN: SearchSpec = { time: ALERT.searchTime, r0: PATROL.searchR0, step: PATROL.searchStep, max: PATROL.searchMax, look: PATROL.searchLook };

/** The search kinds' numbers, by `SEARCH_*`. */
export const SEARCH: readonly SearchSpec[] = [
  PLAIN,
  { time: ALERT.searchTime * BODY_SEARCH.timeMul, r0: BODY_SEARCH.r0, step: BODY_SEARCH.step, max: BODY_SEARCH.max, look: BODY_SEARCH.look },
  PLAIN,
];

/** The numbers of search kind `kind` (an unknown kind: plain). */
export function searchSpec(kind: number): SearchSpec {
  return SEARCH[kind] ?? PLAIN;
}

/**
 * The k-th ring point (k from 0) round (cx, cz) for searcher `slot` under `s`: `min(max, r0 + k x step)` m out, at a
 * bearing of `slot x 2.39996 + k x 1.9` rad (the golden angle between searchers). With `PATROL`'s numbers this is
 * `patrol.ts` `searchPoint` exactly. Writes and returns `out`.
 */
export function ringPoint(cx: number, cz: number, k: number, slot: number, s: SearchSpec, out: [number, number]): [number, number] {
  const r = Math.min(s.max, s.r0 + k * s.step);
  const a = slot * 2.39996 + k * 1.9;
  out[0] = cx + Math.sin(a) * r;
  out[1] = cz + Math.cos(a) * r;
  return out;
}

/** What one searcher covers in a search (`searchCoverage`): stops made (the centre counts) and the furthest (m). */
export interface SearchCover {
  points: number;
  reach: number;
}

const cov: [number, number] = [0, 0];

/**
 * A model of one search under `s` at `speed` m/s (straight lines, open floor): from the centre (the first stop) out
 * over the ring, `look` s at each stop, until `time` runs out; a stop still on its way when time is up does not count.
 * Docs and tests (how much more a body search covers); the guard walks the same points on the nav grid. Writes `out`.
 */
export function searchCoverage(s: SearchSpec, speed: number, out: SearchCover): SearchCover {
  let t = 0;
  let x = 0;
  let z = 0;
  let k = -1;
  out.points = 0;
  out.reach = 0;
  while (k < 1000) {
    let nx = 0;
    let nz = 0;
    if (k >= 0) {
      ringPoint(0, 0, k, 0, s, cov);
      nx = cov[0];
      nz = cov[1];
    }
    const walk = Math.sqrt((nx - x) * (nx - x) + (nz - z) * (nz - z)) / Math.max(speed, 1e-6);
    if (t + walk > s.time) break;
    t += walk + s.look;
    x = nx;
    z = nz;
    out.points++;
    const r = Math.sqrt(x * x + z * z);
    if (r > out.reach) out.reach = r;
    k++;
  }
  return out;
}
