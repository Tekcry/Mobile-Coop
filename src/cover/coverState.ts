/**
 * Cover state machine. Pure, unit-tested; the CoverController supplies inputs and acts on states.
 *
 *   none --snap--> enter (eased move, ~250 ms) --> in (low | high)
 *   in --aim--> peek (pop up / lean out at the edge) --release--> in
 *   in --fire, no aim--> blind (inaccurate, minimal exposure) --stop--> in
 *   in --push past an outside corner--> corner (pivot round it) --> in
 *   in --jump at low cover (landing clear)--> vault --> none
 *   in --dash, or cover + push towards a marked cover--> dash (run, or SWAT turn, to it) --> enter
 *   in --cover/crouch again, dash with no target, jump at high cover, back away, cover gone, death--> none
 */
export type CoverStateName = 'none' | 'enter' | 'in' | 'peek' | 'blind' | 'corner' | 'vault' | 'dash';

export interface CoverInput {
  alive: boolean;
  /** The surface is still there (probe each step). */
  valid: boolean;
  coverPressed: boolean;
  crouchPressed: boolean;
  jumpPressed: boolean;
  sprint: boolean;
  ads: boolean;
  fire: boolean;
  /** Input pushing away from the cover, 0..1. */
  away: number;
  /** Pressed against an edge with an outside corner beyond it (-1 / 1), else 0. */
  cornerPush: number;
  low: boolean;
  canVault: boolean;
  /** A dash target exists (setting on, cover in the push / look direction). */
  canDash: boolean;
  /** Dash pressed (or a swipe on the touch cover button) this step. */
  dashPressed: boolean;
  /** Dash arrived at its target. */
  arrived: boolean;
}

/** Default cover entry time (s); the controller scales it by the approach distance. */
export const ENTER_TIME = 0.8;
export const CORNER_TIME = 0.35;
export const VAULT_TIME = 0.55;
export const AWAY_TIME = 0.3;
export const CORNER_HOLD = 0.25;
export const BLIND_RELEASE = 0.25;
export const DASH_TIMEOUT = 2.5;

export function emptyCoverInput(): CoverInput {
  return {
    alive: true,
    valid: true,
    coverPressed: false,
    crouchPressed: false,
    jumpPressed: false,
    sprint: false,
    ads: false,
    fire: false,
    away: 0,
    cornerPush: 0,
    low: true,
    canVault: false,
    canDash: false,
    dashPressed: false,
    arrived: false,
  };
}

export class CoverStateMachine {
  state: CoverStateName = 'none';
  /** Time in the current state. */
  t = 0;
  private awayT = 0;
  private cornerT = 0;
  private noFireT = 0;
  /** Which corner is being pivoted (-1 / 1) while in 'corner'. */
  cornerSide = 0;
  /** Entry duration for the current snap (s). */
  enterTime = ENTER_TIME;
  /** Last transition reason (debug/tests). */
  reason = '';

  get inCover(): boolean {
    return this.state === 'enter' || this.state === 'in' || this.state === 'peek' || this.state === 'blind' || this.state === 'corner';
  }

  /** Begin snapping into cover (caller has checked eligibility). */
  snap(): void {
    this.go('enter', 'snap');
  }

  /** Begin a dash towards another cover. */
  dash(): void {
    this.go('dash', 'dash');
  }

  /** Forced exit (teleport, respawn, state reset). */
  reset(): void {
    this.go('none', 'reset');
  }

  private go(s: CoverStateName, why: string): void {
    this.state = s;
    this.t = 0;
    this.reason = why;
    this.awayT = 0;
    this.cornerT = 0;
    this.noFireT = 0;
  }

  step(dt: number, i: CoverInput): CoverStateName {
    this.t += dt;
    if (this.state === 'none') return this.state;
    if (!i.alive) {
      this.go('none', 'dead');
      return this.state;
    }
    switch (this.state) {
      case 'enter':
        if (!i.valid) this.go('none', 'gone');
        else if (i.sprint || i.coverPressed) this.go('none', 'cancel');
        else if (this.t >= this.enterTime) this.go('in', 'entered');
        break;
      case 'dash':
        if (i.arrived) this.go('enter', 'arrived');
        else if (this.t > DASH_TIMEOUT || i.crouchPressed || i.jumpPressed) this.go('none', 'dash-cancel');
        break;
      case 'vault':
        if (this.t >= VAULT_TIME) this.go('none', 'vaulted');
        break;
      case 'corner':
        if (!i.valid) this.go('none', 'gone');
        else if (this.t >= CORNER_TIME) this.go('in', 'cornered');
        break;
      case 'in':
      case 'peek':
      case 'blind': {
        if (!i.valid) {
          this.go('none', 'gone');
          break;
        }
        if (i.canDash && (i.dashPressed || (i.coverPressed && i.away > 0.5))) {
          this.go('dash', 'dash');
          break;
        }
        if (i.coverPressed || i.crouchPressed) {
          this.go('none', 'released');
          break;
        }
        if (i.sprint) {
          this.go('none', 'sprint');
          break;
        }
        if (i.jumpPressed) {
          if (i.low && i.canVault) this.go('vault', 'vault');
          else this.go('none', 'jump');
          break;
        }
        // sticky but not trapping: a firm push away for a moment leaves cover
        this.awayT = i.away > 0.75 && !i.ads ? this.awayT + dt : 0;
        if (this.awayT >= AWAY_TIME) {
          this.go('none', 'backed-off');
          break;
        }
        if (this.state === 'in') {
          this.cornerT = i.cornerPush !== 0 && !i.ads ? this.cornerT + dt : 0;
          if (this.cornerT >= CORNER_HOLD) {
            this.cornerSide = i.cornerPush;
            this.go('corner', 'corner');
          } else if (i.ads) this.go('peek', 'aim');
          else if (i.fire) this.go('blind', 'blind');
        } else if (this.state === 'peek') {
          if (!i.ads) this.go('in', 'aim-release');
        } else {
          if (i.ads) this.go('peek', 'aim');
          else {
            this.noFireT = i.fire ? 0 : this.noFireT + dt;
            if (this.noFireT >= BLIND_RELEASE) this.go('in', 'blind-release');
          }
        }
        break;
      }
    }
    return this.state;
  }
}
