/**
 * (J14 G-A4) The re-planned yard's station tick for A4 Goods Shed: the drill windows of stations 8 and 10 (STATIONS.md
 * section 5; lead decision a: no timer starts from a gate opening, the set's own code runs each window). Host only, once
 * per fixed step while A4 is the current bay (`REPLAN_TICKS`). Station 9 (the grille) has no window.
 * - Station 8, the camera loop (60 s): armed on a step that sees the console's loop flag set while 8 is live; an armed window
 *   that sees the flag clear while 8 is still live (`a4-west` not reached) retries 8 (`timer`). After a retry it waits for
 *   the next press.
 * - Station 10, the synced takedown (`SYNC_WINDOW` 1.5 s): the pair window opens on the step either loader goes down while
 *   10 is live; the other still up `SYNC_WINDOW` later retries 10 (`timer`); both down inside it is the lesson done.
 * Window state is module-level numbers, reset whenever `epoch()` changes (every retry, bay restart and course start; it
 * never repeats across matches). Allocation-free: the ids are module constants, no closure, array or string per call.
 */
import { SYNC_WINDOW } from '../../rating/sectionRating';
import type { StationTick } from './ticks';

/** The loop flag of the console's pickup gate `g-a4-console` (`A4_LOOP_FLAG`), the station 8 done flag (`A4_WEST_FLAG`), the
 *  loaders' squad slots (`A4_DOCK1` / `A4_DOCK2`): the set file's ids (`ctcourseSets/a4GoodsShed.ts`; the unit test pins them). */
export const A4T_LOOP_FLAG = 'a4-loop';
export const A4T_WEST_FLAG = 'a4-west';
export const A4T_DOCK1 = 'a4-dock1';
export const A4T_DOCK2 = 'a4-dock2';
/** The stations whose windows this tick runs. */
export const A4T_LOOP_ST = 8;
export const A4T_PAIR_ST = 10;

/** The last epoch the tick saw (-1: none yet). */
let seenEpoch = -1;
/** Station 8: 1 while a loop is armed (seen running with 8 live). */
let loopArmed = 0;
/** Station 10: each loader's down state on the last step with 10 live (-1: not read since 10 went live or the epoch changed). */
let prev1 = -1;
let prev2 = -1;
/** Station 10: the course clock when the pair window opened; -1 none open, -2 settled (both down, or the retry asked for). */
let pairT0 = -1;

export const a4Tick: StationTick = (h) => {
  const e = h.epoch();
  if (e !== seenEpoch) {
    seenEpoch = e;
    loopArmed = 0;
    prev1 = -1;
    prev2 = -1;
    pairT0 = -1;
  }
  const live = h.live();

  // ---- station 8: the 60 s loop must last until both are west of x 84 ----
  if (live === A4T_LOOP_ST) {
    if (h.flag(A4T_LOOP_FLAG)) loopArmed = 1;
    else if (loopArmed === 1) {
      loopArmed = 0;
      if (!h.flag(A4T_WEST_FLAG)) h.retry(A4T_LOOP_ST, 'timer');
    }
  } else loopArmed = 0;

  // ---- station 10: the second loader down inside SYNC_WINDOW of the first ----
  if (live !== A4T_PAIR_ST) {
    prev1 = -1;
    prev2 = -1;
    if (pairT0 >= 0) pairT0 = -1;
    return;
  }
  const d1 = h.down(A4T_DOCK1) ? 1 : 0;
  const d2 = h.down(A4T_DOCK2) ? 1 : 0;
  if (pairT0 === -1 && prev1 >= 0 && ((d1 === 1 && prev1 === 0) || (d2 === 1 && prev2 === 0))) pairT0 = h.now();
  prev1 = d1;
  prev2 = d2;
  if (pairT0 < 0) return;
  if (d1 === 1 && d2 === 1) {
    pairT0 = -2;
    return;
  }
  if (h.now() - pairT0 > SYNC_WINDOW) {
    pairT0 = -2;
    h.retry(A4T_PAIR_ST, 'timer');
  }
};
