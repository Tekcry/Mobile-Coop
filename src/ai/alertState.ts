/**
 * Enemy alert states (pure), unit-tested.
 *
 * unaware (patrol / post) -> suspicious (stops, looks at the stimulus) -> investigating (walks over and looks
 * round) -> alert (combat) -> searching (sweeps out from the last known position) -> cooldown (back to the
 * route, still jumpy: "I'm sure I saw something") -> unaware. Detection (meter 1), damage, gunfire nearby or
 * a squadmate's call go straight to alert. Searches end, but after combat a guard never goes back to unaware: the
 * cooldown (on edge, looking harder) is where they stay.
 */
import { PERCEPTION } from './perception';

export type AlertLevel = 'unaware' | 'suspicious' | 'investigating' | 'searching' | 'alert' | 'cooldown';

export const ALERT = {
  /** Seconds suspicious with a sound to place before walking over to it. */
  hearLook: 2.4,
  /** Seconds suspicious with the meter still above `lingerMeter` before investigating anyway. */
  lingerLook: 3.2,
  lingerMeter: 0.15,
  /** Seconds suspicious with nothing more before calming down. */
  suspiciousTime: 3.5,
  /** Seconds looking round at the investigated spot. */
  investigateLook: 4,
  /** Investigating gives up after this long even if the spot was never reached. */
  investigateMax: 20,
  /** Seconds in combat without sight before searching. */
  lostSight: 12,
  /** (guard-ai walk 4.82 item 2) Seconds in combat without sight before searching while he is closing on the last known
   *  position (`AlertInput.closing`): arriving there with nothing to see starts the search (`Enemy.updateAwareness`); this
   *  only caps a walk that never gets there. */
  lostSightClosing: 30,
  /** Search length (s). */
  searchTime: 60,
  /** Back to normal after (s) - only after an investigation; never after combat. */
  cooldownTime: 45,
  /** A spotter radios the sighting in after this (s); guards within `shout` (m) hear the shout at once. (guard-ai S3)
   *  The parked modes only (`coordinated = false`); the live modes use the radio net (`radioNet.ts` `RADIO`: the same
   *  2.5 s call, voice by the hearing model, the section staggered). */
  callIn: 2.5,
  shout: 8,
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
  /** A sound was heard this step that he is to check (has a place to look at): suspicious, then he walks over after
   *  `hearLook`. (guard-ai S1) With coordinated hearing only the guard sent to the noise gets it (`Enemy.hear`); the
   *  others only turn (`Enemy.hearTurn`: a meter floor below `investigate`, no `heard`). */
  heard: boolean;
  /** Hard triggers: shot at / hit, gunfire close by, a squadmate's alert call, a body found (search). */
  damaged: boolean;
  gunfire: boolean;
  called: boolean;
  /** Something that warrants a search without a sighting (a body found, lights cut). */
  search: boolean;
  /** (guard-ai S2) An incident task runs its own clock (the light check): investigating does not time out or end on
   *  arrival; the task ends it. */
  hold: boolean;
  /** (guard-ai S2) Looking towards a sound he was not sent to (`Enemy.hearTurn`): the linger rule waits, so a player
   *  walking close by does not pull every guard who turns to his steps (the board sends one). */
  turning: boolean;
  /** (guard-ai S3, S2 check polish 2) Sent by the board to a plain noise or a lure (not gunfire): an investigation that
   *  finds nothing ends back to normal (unaware), not in the cooldown (design 3 "return back to normal"). A guard who
   *  has fought keeps his cooldown. */
  calmEnd: boolean;
  /** (guard-ai S4, design 4) Cautious (`awareness.ts`: he knows of a death, or found / was woken from a knockout):
   *  calm, he stays on edge (cooldown: `SENSITIVITY.cooldown` 1.3 = `CAUTION.sens`) and never goes unaware until it
   *  clears; then the cooldown ends as usual (`cooldownTime` from when he went on edge, so at once after a long
   *  caution; never if he has fought). */
  cautious: boolean;
  /** (guard-ai S6, design 7, M1 "any reinforcements must be aggressive") An aggressive guard who has fought
   *  (`BEHAVIOUR.aggressive.neverCautious`): his search never ends (no cooldown, never calm again). */
  hunting: boolean;
  /** (guard-ai S18) This search's length (s; `response.ts` `searchSpec`: a dead body's is longer); absent or 0:
   *  `ALERT.searchTime`. */
  searchFor?: number;
  /** (guard-ai walk 4.82 item 2) In combat, out of sight, moving up on the last known position (coordinated modes): the
   *  lost-sight timer is `ALERT.lostSightClosing`, so he keeps the fight (and the position) until he gets there. */
  closing?: boolean;
}

export function emptyAlertInput(): AlertInput {
  return { meter: 0, seeing: false, arrived: false, sinceSeen: 99, heard: false, damaged: false, gunfire: false, called: false, search: false, hold: false, turning: false, calmEnd: false, cautious: false, hunting: false, searchFor: 0, closing: false };
}

export class AlertMachine {
  level: AlertLevel = 'unaware';
  /** Seconds in the current level. */
  t = 0;
  /** Seconds since arriving at the investigate spot (investigating). */
  lookT = 0;
  /** Calm level to return to after a suspicious moment / investigation. */
  private calm: 'unaware' | 'cooldown' = 'unaware';
  /** Has been in combat: stays on edge (cooldown) for good. */
  fought = false;
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
    if (level === 'alert') this.fought = true;
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
        // (guard-ai S4) cautious: on edge while it lasts
        else if (this.level === 'unaware' && i.cautious) this.set('cooldown');
        else if (this.level === 'cooldown' && !this.fought && !i.cautious && this.t >= ALERT.cooldownTime) this.set('unaware');
        break;
      case 'suspicious':
        if (i.heard) this.sound = true;
        if (i.search) this.set('searching');
        else if (i.meter >= P.investigate) this.set('investigating');
        else if (this.sound && this.t >= ALERT.hearLook) this.set('investigating');
        else if (!i.turning && i.meter >= ALERT.lingerMeter && this.t >= ALERT.lingerLook) this.set('investigating');
        else if (i.heard || i.meter >= P.suspicious) {
          // still something there: keep looking (the timers above decide when to walk over)
        } else if (this.t >= ALERT.suspiciousTime && i.meter < ALERT.lingerMeter) this.set(this.calm);
        break;
      case 'investigating':
        if (i.search) this.set('searching');
        else if (i.hold) {
          // the task's own clock (the light check) ends it
        } else {
          if (i.arrived) this.lookT += dt;
          if (i.heard || i.meter >= P.investigate) {
            // fresh evidence: keep at it
            this.lookT = 0;
            if (this.t > 1) this.t = 1;
          }
          if (this.lookT >= ALERT.investigateLook || this.t >= ALERT.investigateMax) this.set(i.calmEnd && !this.fought ? 'unaware' : this.calm === 'unaware' ? 'cooldown' : this.calm);
        }
        break;
      case 'alert':
        // (alerted by a noise or a call without a sighting: counted from the alert itself)
        // (walk 4.82 item 2) closing on the last known position: the longer cap (arriving starts the search)
        if (!i.seeing && Math.min(i.sinceSeen, this.t) >= (i.closing ? ALERT.lostSightClosing : ALERT.lostSight)) this.set('searching');
        break;
      case 'searching':
        // (guard-ai S6) a hunting (aggressive) guard keeps searching: never calm
        // (guard-ai S18) a body's search runs longer (`searchFor`)
        if (this.t >= (i.searchFor ? i.searchFor : ALERT.searchTime) && !i.hunting) this.set('cooldown');
        break;
    }
    return this.changes !== before;
  }
}

/** (locomotion step 19) The radio call-in delay: `ALERT.callIn` x the difficulty's alarm tolerance (`DifficultyDef.reaction`). */
export function callInDelay(tolerance: number): number {
  return ALERT.callIn * tolerance;
}
