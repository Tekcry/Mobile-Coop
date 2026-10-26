/**
 * Alarm panels (pure data + rules), unit-tested: an alerted enemy within reach of a working panel runs to it and
 * holds it for a moment to call reinforcements. The player can disable a panel first, or drop the runner.
 */

import { hyp2 } from '../core/mathx';

export const ALARM = {
  /** Furthest panel an alerted enemy will run to (m, straight line). */
  range: 30,
  /** Seconds at the panel to raise it. */
  holdTime: 1.6,
  /** Seconds the player holds to disable a panel. */
  disableTime: 1.2,
  /** Reinforcements per alarm. */
  squad: 3,
  /** Stand-off from the wall to use it (m). */
  standoff: 0.6,
} as const;

export interface AlarmPanel {
  id: string;
  x: number;
  y: number;
  z: number;
  /** Facing (out of the wall). */
  yaw: number;
  disabled: boolean;
  /** (Sector Ops) The section the panel belongs to: it works only while that section is live. */
  section?: number;
}

/** Where a user stands to work the panel (writes `out`). */
export function alarmStandPoint(p: AlarmPanel, out: [number, number]): [number, number] {
  out[0] = p.x + Math.sin(p.yaw) * ALARM.standoff;
  out[1] = p.z + Math.cos(p.yaw) * ALARM.standoff;
  return out;
}

/** Nearest working panel within `ALARM.range` of (x, z), or null. */
export function nearestPanel(panels: readonly AlarmPanel[], x: number, z: number, maxDy = 2, y = 0): AlarmPanel | null {
  let best: AlarmPanel | null = null;
  let bd: number = ALARM.range;
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i]!;
    if (p.disabled || Math.abs(p.y - y) > maxDy) continue;
    const d = hyp2(p.x - x, p.z - z);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

/** (locomotion step 19) Seconds at a panel to raise it: `holdTime` x the difficulty's alarm tolerance (`DifficultyDef.reaction`). */
export function raiseTime(tolerance: number): number {
  return ALARM.holdTime * tolerance;
}

/**
 * (guard-rules S5, D5, A7; bible 5.7 "Each raised alarm adds one level") Repeat guard alarms, where the mode asks for them
 * (`EnemyManager.alarmRepeat`: Sector Ops and the campaign; Marlow Yard keeps one guard alarm per load, Q11). After a
 * guard alarm the next may be raised once its response is in: a member of a response team it brought is searching, or
 * `rearm` s after it, whichever is first; at most `max` guard alarms per section load. Undo: `enabled` false (one guard
 * alarm per load everywhere).
 */
export const ALARM_REPEAT = {
  enabled: true,
  /** Most guard alarms per section load (the Sector Ops stage cap is 3 anyway). */
  max: 3,
  /** Seconds after a guard alarm before the next may be raised when no team member is searching yet. */
  rearm: 60,
} as const;

/** (guard-ai S6, design 7, M4) The command call that raises the alarm by radio. */
export const ALARM_CALL = {
  /** Seconds after the command caller is cut (down, grabbed, blinded) before the next guard in combat takes the call. */
  retry: 3,
} as const;

/**
 * (guard-ai S6, design 7, M4 "After a raised alarm (alarm panel hit or a radio report that gets through; killing the caller
 * first stops it)") The section's command call, as a small state machine (pure; the manager picks the guards and runs
 * the radio net). Once a contact call gets through (`owe`), the alarm is owed: one guard at a time holds the `command`
 * call (`RADIO.report` x reaction; its completion raises the alarm). Cut before it completes: after `ALARM_CALL.retry`
 * s `tick` asks for the next caller (a guard still in the fight); none left: `lapse` (no alarm). A raised alarm (panel
 * or radio) settles it (`raised`). One per section: Sector Ops loads one section at a time (`clear` on every load).
 */
export class CommandCall {
  /** A contact got through and the alarm is not raised yet. */
  owed = false;
  /** Who holds the command call now (stable guard id, `Enemy.num`), -1 none. */
  caller = -1;
  /** Seconds until the next guard takes the call (after a cut or a refused call); 0 none. */
  retryT = 0;
  /** Counters (tests / debug): calls started, calls lost (cut), debts that lapsed (nobody left to call). */
  started = 0;
  lost = 0;
  lapsed = 0;

  /** A contact call got through. True when a command call should start now (nobody holds one, no retry pending). */
  owe(): boolean {
    this.owed = true;
    return this.caller < 0 && this.retryT <= 0;
  }

  /** `caller` started the command call. */
  start(caller: number): void {
    this.caller = caller;
    this.retryT = 0;
    this.started++;
  }

  /** The net refused the call (its pool full): try again after the retry wait. */
  refused(): void {
    this.caller = -1;
    this.retryT = ALARM_CALL.retry;
  }

  /**
   * Per radio tick (after the net's own tick). `open`: a command call is still open on the net. A held call that is no
   * longer open without the alarm raised (`raised` clears the debt first) was cut: the retry wait starts. Returns true
   * when the next caller should be picked now.
   */
  tick(dt: number, open: boolean): boolean {
    if (!this.owed) return false;
    if (this.caller >= 0) {
      if (open) return false;
      this.caller = -1;
      this.lost++;
      this.retryT = ALARM_CALL.retry;
      return false;
    }
    if (this.retryT > 0) {
      this.retryT -= dt;
      if (this.retryT > 1e-6) return false;
      this.retryT = 0;
    }
    return true;
  }

  /** Nobody left in the fight to make the call: the debt lapses (no alarm until another contact gets through). */
  lapse(): void {
    if (this.owed) this.lapsed++;
    this.owed = false;
    this.caller = -1;
    this.retryT = 0;
  }

  /** The alarm went off (a panel or this call): settled. */
  raised(): void {
    this.owed = false;
    this.caller = -1;
    this.retryT = 0;
  }

  /** A section load or restart. */
  clear(): void {
    this.raised();
  }
}
