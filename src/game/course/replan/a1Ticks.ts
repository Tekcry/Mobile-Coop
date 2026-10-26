/**
 * (J14 R1 fix round) The re-planned yard's station tick for A1 Gate (stations 1-2: no drill window).
 *
 * (J14 A26, Q5 / G370 "every failure is a retry") The pair is never trapped: the wicket stays shut until both have been
 * on the wall top (`a1-top`, `replan/a1Gate.ts`) and the yard has nothing to climb back up, so a player who drops into
 * the yard before the human ladder is done (station 1 or 2 live) could only be freed by the pause menu's bay restart.
 * While station 1 or 2 is live, a player stands on the yard floor and nobody is on or climbing the wall (feet at lip,
 * hang or ladder height by either face), for `A1_TRAP_GRACE` s, the live station retries with cause `other`: both back
 * on its marks (station 2: A at the striped mark, B on the wall top), its gates reset, `a1-top1` kept. A partner on the
 * wall top can still hang off the yard face for a ladder, so while anyone is up there the clock waits.
 * Host only (`CourseMode` runs the ticks); `retryOff(n)` turns it off like any station retry. Allocation-free: no
 * closures, arrays or vectors per call; the state is two module-level numbers.
 */
import type { StationTick, TickZone } from './ticks';

/** s a player stands on the yard floor with nobody on or climbing the wall before the station retries (A26). */
export const A1_TRAP_GRACE = 5;
/** The yard floor: `A1_YARD_ZONE` (`ctcourseSets/a1Gate.ts`) but from the yard face (`A1_WALL.far` 12.3, not the pass
 *  zone's 12.6: a let-go off the yard-face lip lands a hang's 0.22 m out, feet about x 12.5-12.6) with the feet on the
 *  ground (a hop's 0.8 m apex counts). */
export const A1_TRAP_YARD: TickZone = [12.3, 2.3, 22, 19.7, -0.5, 1.0];
/** On or climbing the wall: either face's 0.7 m strip and the 0.6 m top (`A1_WALL` 11.7-12.3), feet 1.2-6 m up (a
 *  hang, a ladder climb, a boost in the air, the 4.4 m top). */
export const A1_TRAP_CLIMB: TickZone = [11.0, 2.3, 13.0, 19.7, 1.2, 6.0];
/** The flag that ends station 2 and opens the wicket's flag gate (`A1_TOP_FLAG`). */
const TOP_FLAG = 'a1-top';

let ep = 0;
let trapT = 0;

export const a1Tick: StationTick = (h, dt) => {
  const e = h.epoch();
  if (e !== ep) {
    ep = e;
    trapT = 0;
  }
  const n = h.live();
  if ((n !== 1 && n !== 2) || h.flag(TOP_FLAG) || h.playersIn(A1_TRAP_YARD) === 0 || h.playersIn(A1_TRAP_CLIMB) > 0) {
    trapT = 0;
    return;
  }
  trapT += dt;
  if (trapT >= A1_TRAP_GRACE && h.retry(n, 'other')) trapT = 0;
};
