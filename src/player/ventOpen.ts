/**
 * Opening a closed duct grate (pure, no Babylon): the jump / traverse press starts it; a short press kicks it in (quick,
 * loud), a hold unscrews it (slow, quiet), letting go mid-unscrew stops. `AttachController.updateVent` runs it.
 */

/** Unscrewing a grate (s, after the hold delay). */
export const UNSCREW_TIME = 1.2;
/** The press length under which a press is a kick (s). */
export const KICK_TAP = 0.3;

/** A grate being opened: seconds since the start press, the unscrew progress 0..1 (prompt ring), and (vent-kick)
 *  whether the keyboard's start key was held into the vent. */
export interface VentHold {
  t: number;
  progress: number;
  kb: boolean;
}

/** What one step decided: still opening, kicked in, unscrewed, or let go mid-unscrew (stopped, progress lost). */
export type VentResult = 'wait' | 'kick' | 'unscrew' | 'stop';

/**
 * One fixed step. `useHeld` / `useHeldT`: the use control (A / E) is down and for how long. `startHeld` (vent-kick):
 * the keyboard's jump key (Space) that started the vent is still down. The pad passes false (its path is unchanged: A
 * must be down by the second step after the Y press, else it is a kick). On the keyboard a press is not read as a kick
 * while Space is still held; the hold is Space, E, or Space carried into E without a gap, timed from the press (or
 * from E's own press when E went down first), so Space tap = kick, Space (then E) held = unscrew.
 */
export function ventStep(v: VentHold, dt: number, useHeld: boolean, useHeldT: number, startHeld = false): VentResult {
  v.t += dt;
  if (startHeld) v.kb = true;
  const held = useHeld || startHeld;
  const heldT = v.kb && held ? Math.max(useHeldT, v.t) : useHeldT;
  if (!held && v.t > 0.02) {
    // a short press: kick; let go mid-unscrew: stop
    return v.progress <= 0 && v.t < KICK_TAP + 0.1 ? 'kick' : 'stop';
  }
  if (heldT >= KICK_TAP) {
    v.progress = Math.min(1, (heldT - KICK_TAP) / UNSCREW_TIME);
    if (v.progress >= 1) return 'unscrew';
  }
  return 'wait';
}
