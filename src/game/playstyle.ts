/** Stealth rating hook (bible 6); scoring is Phase 4. Counts only. */
export type StealthEvent = 'knockout' | 'kill' | 'takedownLethal' | 'takedownNonLethal' | 'objective' | 'detected' | 'alarm';

export class StealthRating {
  /** Times the operator was detected (an enemy went to combat on them) and alarms raised. */
  detections = 0;
  alarms = 0;
  kills = 0;
  knockouts = 0;

  record(ev: StealthEvent, _detected: boolean): void {
    if (ev === 'detected') this.detections++;
    if (ev === 'alarm') this.alarms++;
    if (ev === 'kill' || ev === 'takedownLethal') this.kills++;
    if (ev === 'knockout' || ev === 'takedownNonLethal') this.knockouts++;
  }
}
