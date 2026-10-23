/**
 * Section alert (guard-ai S14, stealth over shooting items 6 and 7; pure: no Babylon / DOM), unit-tested
 * (`tests/sectionAlert.test.ts`).
 *
 * Two radio calls raise the section's caution without an alarm (A2, A40, A41; M4: only a panel or a command call
 * raises it):
 * - `missing`: a radio-check caller who missed a squad member (S5b; one call per check), or the one left of a talking
 *   pair whose partner never came (S10), radios it ("Unit three, report... Unit three? Nothing."). The call is
 *   `RADIO.callIn` x his reaction and cuttable (take him during it and nobody else hears). Once it gets through every
 *   receiver is cautious `MISSING.cautious` s (`Awareness.timedHold`), staggered as S3 delivers it. The S5b / S10 pair
 *   search is unchanged. The pair lead's own S2 `missing` report is not the alert: only a call this module logged
 *   counts (so cutting the caller leaves the section calm even when another guard leads the search).
 * - `shots`: the nearest calm guard (not fighting, not sent to combat by it) who hears a loud shot at hearing tier 1 or
 *   more radios it, one call per shots incident: a later loud shot while the call is open joins it (the spot moves to
 *   the newest shot); once the call is done or lost, the next loud shot heard is a new incident and a new call (its
 *   delivery refreshes the caution). Delivered: the section is cautious `SHOTS.cautious` s, and the board sends a pair
 *   (lead + cover, G11) to the spot. Suppressed shots never call (they are ordinary noises, `EnemyManager.hear`).
 *
 * An alert call has its own incident id (negative, from `EnemyManager.alertInc`), so the radio net never merges its
 * receivers with another call of the same kind. `AlertCallLog` remembers the last `ALERT_LOG` alert calls (kind,
 * incident, caller, spot) so the manager can tell an alert call's delivery from another call of the same kind.
 * `SectionCounters` are the read-only per-section tallies the section rating reads (reset with the section). No
 * allocation per call (fixed typed arrays).
 */
import { ALERT_MISSING, ALERT_SHOTS } from './awareness';

export { ALERT_MISSING, ALERT_SHOTS };

/** Alert calls remembered (a ring; the oldest is overwritten). */
export const ALERT_LOG = 8;

export class AlertCallLog {
  readonly kind = new Uint8Array(ALERT_LOG);
  readonly inc = new Int32Array(ALERT_LOG);
  readonly caller = new Int32Array(ALERT_LOG).fill(-1);
  readonly x = new Float32Array(ALERT_LOG);
  readonly y = new Float32Array(ALERT_LOG);
  readonly z = new Float32Array(ALERT_LOG);
  private k = 0;

  /** Forget every call (a section load, a restart). */
  clear(): void {
    this.kind.fill(0);
    this.caller.fill(-1);
    this.k = 0;
  }

  /** Log an alert call: `kind` (`ALERT_MISSING` / `ALERT_SHOTS`), its incident, its caller (stable id) and the spot.
   *  The same (kind, incident, caller) again only moves its spot. Returns the slot. */
  add(kind: number, inc: number, caller: number, x: number, y: number, z: number): number {
    let s = this.find(kind, inc, caller);
    if (s < 0) {
      s = this.k;
      this.k = (s + 1) % ALERT_LOG;
      this.kind[s] = kind;
      this.inc[s] = inc;
      this.caller[s] = caller;
    }
    this.x[s] = x;
    this.y[s] = y;
    this.z[s] = z;
    return s;
  }

  /** The slot of the logged call (kind, incident, caller), -1 when it is not an alert call. */
  find(kind: number, inc: number, caller: number): number {
    if (caller < 0 || kind === 0) return -1;
    for (let s = 0; s < ALERT_LOG; s++) if (this.kind[s] === kind && this.inc[s] === inc && this.caller[s] === caller) return s;
    return -1;
  }
}

/** Per-section tallies for the section rating (read-only outside `EnemyManager`, reset with the section). */
export class SectionCounters {
  /** Bodies a guard found (dead or knocked out; a camera's report counts once a guard reaches the body). */
  bodiesFound = 0;
  /** Missed check-ins: each member a radio check missed (S5b), each talking-pair partner who never came (S10). */
  missedChecks = 0;
  /** `shots` calls that got through (the section heard them; a cut call is not counted). */
  shotsCalls = 0;
  /** Alarms raised by radio (a `command` call that got through; panels are `EnemyManager.alarmBy`). */
  radioAlarms = 0;

  reset(): void {
    this.bodiesFound = 0;
    this.missedChecks = 0;
    this.shotsCalls = 0;
    this.radioAlarms = 0;
  }
}

/** The read-only view the section rating gets. */
export type SectionCounts = Readonly<Pick<SectionCounters, 'bodiesFound' | 'missedChecks' | 'shotsCalls' | 'radioAlarms'>>;

/** The radio number of a guard: his section slot + 1, else his guard key + 1, else 0 (none). */
export function unitOf(slotIdx: number, key: number): number {
  return slotIdx >= 0 ? slotIdx + 1 : key >= 0 ? key + 1 : 0;
}
