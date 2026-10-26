/**
 * (J14 G-A5) The re-planned yard's station tick for A5 Substation: station 13's flood window and its beam trip (STATIONS
 * section 5, `a5-inner`; lead decisions ~23:05 (a), ~23:55, D1 / OQ4). Host only, called once per fixed step while A5 is
 * the current bay (`REPLAN_TICKS` in `./ticks.ts`). Allocation-free: no closures, arrays, objects or template strings per
 * call; the window state is module-level numbers, reset whenever `epoch()` changes (a retry, a bay restart, a course
 * start: the epoch never repeats, so nothing survives a match).
 * - Beam trip: `laser-a5` broken while station 13 is live -> `retry(13, 'seen')` (checked first in a step).
 * - Flood window: station 13 live and the kiosk flood (light group 52, jam or shot only) going from lit to dark within the
 *   current attempt (the epoch) arms it; an armed window that sees the flood lit again before the release (`a5-release`) ->
 *   `retry(13, 'timer')`. No guessed "5 s held + 4 s off" timer: the light registry's own state is the window, so a flood
 *   shot out stays dark and never fails it. (fix 1) A retry leaves a jam running, so a flood still dark at a new attempt's
 *   start never arms it (only a lit-to-dark change seen in the attempt does), and the attempt's one retry counts as used
 *   only when `retry()` takes it (a call refused inside the hold after an earlier retry spends nothing).
 */
import type { StationTick } from './ticks';

/** Station 13 (the throw), its done flag, the kiosk flood's light group and the gateway's beams (`A5_LASER`). */
export const A5_THROW_N = 13;
export const A5_THROW_DONE = 'a5-release';
export const A5_FLOOD_GROUP = 52;
export const A5_BEAMS = 'laser-a5';

/** The last epoch the tick saw; the flood as last seen in this attempt (-1 not yet, 0 dark, 1 lit); the window (1 armed);
 *  the epoch whose one retry `retry()` took. */
let lastEpoch = Number.NaN;
let floodWas = -1;
let armed = 0;
let calledIn = Number.NaN;

export const a5Tick: StationTick = (h) => {
  const ep = h.epoch();
  if (ep !== lastEpoch) {
    lastEpoch = ep;
    floodWas = -1;
    armed = 0;
    calledIn = Number.NaN;
  }
  if (h.live() !== A5_THROW_N) {
    floodWas = -1;
    armed = 0;
    return;
  }
  if (calledIn === ep) return;
  // a beam broken on station 13 is a `seen` retry (before the flood rule in the same step); refused, it is asked again
  // next step while the trip stands (the hook clears it with the epoch)
  if (h.tripped(A5_BEAMS)) {
    armed = 0;
    if (h.retry(A5_THROW_N, 'seen')) calledIn = ep;
    return;
  }
  const lit = h.lit(A5_FLOOD_GROUP);
  const was = floodWas;
  floodWas = lit ? 1 : 0;
  if (!lit) {
    // only the flood going dark in this attempt opens the window
    if (was === 1) armed = 1;
    return;
  }
  if (armed === 1 && !h.flag(A5_THROW_DONE)) {
    armed = 0;
    if (h.retry(A5_THROW_N, 'timer')) calledIn = ep;
  }
};
