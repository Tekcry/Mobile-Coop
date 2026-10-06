/**
 * Enemy alert states (pure), unit-tested.
 *
 * unaware (patrol / post) -> suspicious (stops, looks at the stimulus) -> investigating (walks over and looks
 * round) -> alert (combat) -> searching (sweeps out from the last known position) -> cooldown (back to the
 * route, still jumpy: "I'm sure I saw something") -> unaware. Detection (meter 1), damage, gunfire nearby or
 * a squadmate's call go straight to alert. Searches always end.
 */
import { PERCEPTION } from './perception';

export type AlertLevel = 'unaware' | 'suspicious' | 'investigating' | 'searching' | 'alert' | 'cooldown';

export const ALERT = {
  /** Seconds suspicious with a sound to place before walking over to it. */
  hearLook: 1.0,
  /** Seconds suspicious with the meter still above `lingerMeter` before investigating anyway. */
  lingerLook: 2.5,
  lingerMeter: 0.15,
  /** Seconds suspicious with nothing more before calming down. */
  suspiciousTime: 3.5,
  /** Seconds looking round at the investigated spot. */
  investigateLook: 4,
  /** Investigating gives up after this long even if the spot was never reached. */
  investigateMax: 20,
  /** Seconds in combat without sight before searching. */
  lostSight: 6,
  /** Search length (s). */
  searchTime: 25,
  /** Back to normal after (s). */
  cooldownTime: 45,
} as const;

/** How hard each state looks (sight-rate multiplier). */
export const SENSITIVITY: Record<AlertLevel, number> = {
  unaware: 1,
  suspicious: 1.15,
  investigating: 1.3,
  searching: 1.6,
  alert: 2,
  cooldown: 1.3,
};

export interface AlertInput {
  /** Awareness meter 0..1. */
  meter: number;
  /** The target is in sight now. */
  seeing: boolean;
  /** Reached the investigate spot (investigating) or the last known position (searching). */
  arrived: boolean;
  /** Seconds since the target was last seen. */
  sinceSeen: number;
  /** A sound was heard this step (has a place to look at). */
  heard: boolean;
  /** Hard triggers: shot at / hit, gunfire close by, a squadmate's alert call, a body found (search). */
  damaged: boolean;
  gunfire: boolean;
  called: boolean;
  /** Something that warrants a search without a sighting (a body found, lights cut). */
  search: boolean;
}

export function emptyAlertInput(): AlertInput {
  return { meter: 0, seeing: false, arrived: false, sinceSeen: 99, heard: false, damaged: false, gunfire: false, called: false, search: false };
}

export class AlertMachine {
  level: AlertLevel = 'unaware';
  /** Seconds in the current level. */
  t = 0;
  /** Seconds since arriving at the investigate spot (investigating). */
  lookT = 0;
  /** Calm level to return to after a suspicious moment / investigation. */
  private calm: 'unaware' | 'cooldown' = 'unaware';
  /** Transitions so far (tests / debug). */
  changes = 0;
  /** A sound was heard during this suspicious moment (one is enough to go and look). */
  private sound = false;

  get sensitivity(): number {
    return SENSITIVITY[this.level];
  }

  /** In combat. */
  get alert(): boolean {
    return this.level === 'alert';
  }

  /** Not yet aware anything is wrong (patrol / post / cooldown). */
  get calmNow(): boolean {
    return this.level === 'unaware' || this.level === 'cooldown';
  }

  set(level: AlertLevel): void {
    if (this.level === level) return;
    if (level === 'cooldown') this.calm = 'cooldown';
    if (level === 'unaware') this.calm = 'unaware';
    this.level = level;
    this.t = 0;
    this.lookT = 0;
    this.sound = false;
    this.changes++;
  }

  /** Advance one step; returns true when the level changed. */
  step(dt: number, i: AlertInput): boolean {
    const before = this.changes;
    this.t += dt;
    const P = PERCEPTION;
    if (this.level !== 'alert' && (i.damaged || i.gunfire || i.called || i.meter >= 1)) {
      this.set('alert');
      return true;
    }
    switch (this.level) {
      case 'unaware':
      case 'cooldown':
        if (i.search) this.set('searching');
        else if (i.meter >= P.investigate) this.set('investigating');
        else if (i.meter >= P.suspicious || i.heard) {
          this.set('suspicious');
          this.sound = i.heard;
        }
        else if (this.level === 'cooldown' && this.t >= ALERT.cooldownTime) this.set('unaware');
        break;
      case 'suspicious':
        if (i.heard) this.sound = true;
        if (i.search) this.set('searching');
        else if (i.meter >= P.investigate) this.set('investigating');
        else if (this.sound && this.t >= ALERT.hearLook) this.set('investigating');
        else if (i.meter >= ALERT.lingerMeter && this.t >= ALERT.lingerLook) this.set('investigating');
        else if (i.heard || i.meter >= P.suspicious) {
          // still something there: keep looking (the timers above decide when to walk over)
        } else if (this.t >= ALERT.suspiciousTime && i.meter < ALERT.lingerMeter) this.set(this.calm);
        break;
      case 'investigating':
        if (i.search) this.set('searching');
        else {
          if (i.arrived) this.lookT += dt;
          if (i.heard || i.meter >= P.investigate) {
            // fresh evidence: keep at it
            this.lookT = 0;
            if (this.t > 1) this.t = 1;
          }
          if (this.lookT >= ALERT.investigateLook || this.t >= ALERT.investigateMax) this.set(this.calm === 'unaware' ? 'cooldown' : this.calm);
        }
        break;
      case 'alert':
        // (alerted by a noise or a call without a sighting: counted from the alert itself)
        if (!i.seeing && Math.min(i.sinceSeen, this.t) >= ALERT.lostSight) this.set('searching');
        break;
      case 'searching':
        if (this.t >= ALERT.searchTime) this.set('cooldown');
        break;
    }
    return this.changes !== before;
  }
}
