/**
 * (G2c, decision N17) The Test Chamber's passive practice guards: the respawn rule (pure; `TestMode` runs it).
 *
 * A guard that is down (knocked out, killed or carried off) comes back at his spot `PRACTICE_RESPAWN_S` seconds later, but
 * only once nobody stands within `PRACTICE_CLEAR_M` of the spot, so he never appears on top of a player.
 */

/** Seconds a downed practice guard stays down before he may come back. */
export const PRACTICE_RESPAWN_S = 10;
/** A player closer than this (m, on the floor plan) to a spot keeps its guard from coming back. */
export const PRACTICE_CLEAR_M = 2.5;

/** The seconds a spot's guard has been down: the clock runs while he is down and starts over once he stands again. */
export function practiceDownTime(prev: number, dt: number, down: boolean): number {
  return down ? prev + dt : 0;
}

/** Does the guard come back now: down long enough, and no player within `PRACTICE_CLEAR_M` of his spot (`nearest`, m). */
export function practiceDue(downTime: number, nearest: number): boolean {
  return downTime >= PRACTICE_RESPAWN_S && nearest >= PRACTICE_CLEAR_M;
}
