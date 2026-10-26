/**
 * (J14 R1 fix round; G-A2) The re-planned yard's station tick for A2 Carriage Shed: station 4's neck windows (STATIONS.md
 * section 5, `a2-neck` drill_s 15). No timer starts from a gate opening (lead decision a): the window is the isolator's own
 * dark. `g-a2-neck` (an isolator: `gate()` is true while the neck is dark) opens a window on its shut -> dark edge; the
 * window closes on the step the gate reads lit again. Closing with a player in the neck (`NECK`, x 46-56, z 0.3-19.7) is a
 * timer retry of station 4; closing with nobody there is no fail. Two crossings, one window each (the isolator's 3 s re-arm
 * between): each window is judged on its own. An `epoch()` change (a retry, a bay restart, a course start) forgets the
 * window under way (a gate still dark then is not a window until it has been seen shut). Acts only while station 4 is live.
 * Host only, allocation-free: module-level numbers, module constant zone and ids.
 */
import type { StationTick, TickZone } from './ticks';

/** Station 4 (`a2-lights`, `timed_light_cut`). */
export const A2_NECK_STATION = 4;
/** The neck isolator's gate (`A2_GATE` in the set file). */
export const A2_NECK_GATE = 'g-a2-neck';
/** The neck (STATIONS section 5): a player's feet here when the lights come back fails the window. */
export const A2_NECK_ZONE: TickZone = [46, 0.3, 56, 19.7];

/** The epoch the window state belongs to (NaN: none seen yet). */
let seenEpoch = Number.NaN;
/** The gate read dark on the last step. */
let wasDark = false;
/** A window opened (shut -> dark) under the current epoch and has not closed yet. */
let inWindow = false;

export const a2Tick: StationTick = (h) => {
  const dark = h.gate(A2_NECK_GATE);
  const e = h.epoch();
  if (e !== seenEpoch) {
    // a new epoch: forget the window under way; a gate still dark is not a window until it has been seen shut
    seenEpoch = e;
    wasDark = dark;
    inWindow = false;
    return;
  }
  if (!wasDark && dark) inWindow = true;
  else if (wasDark && !dark) {
    if (inWindow && h.live() === A2_NECK_STATION && h.playersIn(A2_NECK_ZONE) > 0) h.retry(A2_NECK_STATION, 'timer');
    inWindow = false;
  }
  wasDark = dark;
};
