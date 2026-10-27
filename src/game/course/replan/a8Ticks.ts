/**
 * (J14 G-A8) The re-planned yard's station tick for A8 the Strongroom: the windows of stations 20 and 21 (STATIONS.md section
 * 5; lead decision a: no timer starts from a gate opening, the set's own code runs each window). Host only, once per fixed
 * step while A8 is the current bay (`REPLAN_TICKS`). Stations 18 and 19 have no window (a `caught` hold is R1's).
 * - Station 20, the lighting board's dark (25 s): the window runs while the isolator `g-a8-night` is open (the hall is dark and
 *   the grille unlocked). The dark ending while 20 is still live (`a8-grille-in` not set: nobody through the grille) retries
 *   20 (`timer`). After a retry the gate is closed again: it waits for the next press.
 * - Station 21, the console's loop (60 s): the loop runs while `a8-loop` is set (the shared flag of the pickup gate
 *   `g-a8-console`, pressed in 19). The flag clearing while 21 is live (`a8-sync` not set) retries 21 (`timer`). If 21 turns
 *   live from 20 in the same epoch with the flag already clear, it retries at once. After a retry (A back at the console, the
 *   loop off) it waits for the next press: no instant fail.
 * Window state is module-level numbers, reset whenever `epoch()` changes (every retry, bay restart and course start; it never
 * repeats across matches). Allocation-free: the ids are module constants, no closure, array or string per call.
 */
import type { StationTick } from './ticks';

/** The set file's ids (`ctcourseSets/a8Strongroom.ts`: `A8_NIGHT_GATE`, `A8_LOOP_FLAG`, `A8_SYNC_FLAG`; `a8-grille-in` is the re-plan's
 *  pass zone flag, `replan/a8Strongroom.ts`; the unit test pins them). */
export const A8T_NIGHT_GATE = 'g-a8-night';
export const A8T_LOOP_FLAG = 'a8-loop';
export const A8T_GRILLE_FLAG = 'a8-grille-in';
export const A8T_SYNC_FLAG = 'a8-sync';
/** The stations whose windows this tick runs. */
export const A8T_DARK_ST = 20;
export const A8T_LOOP_ST = 21;

/** The last epoch the tick saw (-1: none yet). */
let seenEpoch = -1;
/** The live station on the last step of this epoch (0: none, or not read yet). */
let prevLive = 0;
/** Station 20: 1 once the board's dark was seen with 20 live. */
let darkSeen = 0;
/** Station 21: 1 once the loop was seen running with 21 live (or it had already ended when 21 went live from 20). */
let loopSeen = 0;

export const a8Tick: StationTick = (h) => {
  const e = h.epoch();
  if (e !== seenEpoch) {
    seenEpoch = e;
    prevLive = 0;
    darkSeen = 0;
    loopSeen = 0;
  }
  const live = h.live();

  if (live === A8T_DARK_ST) {
    loopSeen = 0;
    if (h.gate(A8T_NIGHT_GATE)) darkSeen = 1;
    else if (darkSeen === 1 && !h.flag(A8T_GRILLE_FLAG)) {
      // the lights are back and nobody is through the grille: retry (a refused ask, none under way yet, is made again next step)
      darkSeen = h.retry(A8T_DARK_ST, 'timer') ? 0 : 1;
    }
  } else if (live === A8T_LOOP_ST) {
    darkSeen = 0;
    if (h.flag(A8T_LOOP_FLAG)) loopSeen = 1;
    else {
      // 21 went live from 20 with the loop already over counts as a loop seen to end
      if (prevLive === A8T_DARK_ST) loopSeen = 1;
      if (loopSeen === 1 && !h.flag(A8T_SYNC_FLAG)) loopSeen = h.retry(A8T_LOOP_ST, 'timer') ? 0 : 1;
    }
  } else {
    darkSeen = 0;
    loopSeen = 0;
  }
  prevLive = live;
};
