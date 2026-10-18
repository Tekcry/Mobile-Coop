/**
 * Holstered unless aiming (bible 1.11, 5.6; locomotion step 09). Pure and Babylon-free: aim held draws the weapon,
 * aim released holsters it, in every state (alert and combat too). A release mid-draw reverses from the current
 * progress (and a press mid-holster draws again from where the hand is). The phase rides on the wire as
 * `MoveState.dw` (host-authoritative, D8).
 */

export const DRAW_HOLSTERED = 0;
export const DRAW_DRAWING = 1;
export const DRAW_DRAWN = 2;
export const DRAW_HOLSTERING = 3;
export type DrawPhase = 0 | 1 | 2 | 3;

/** Draw (raise) time (s): pistol / sidearm 0.6, primary 0.75 (G103, measured from the footage; starting values). */
export const DRAW_TIME_SIDEARM = 0.6;
export const DRAW_TIME_PRIMARY = 0.75;
/** Holster (lower) time (s), every class: 0.55 (G103: 0.5-0.6). */
export const HOLSTER_TIME = 0.55;

/** A shot needs the aim this far in (`cam.ads`). */
export const ADS_FIRE = 0.9;

/** No hip fire: the trigger is live only drawn and aimed in (holstered, drawing or holstering: nothing). */
export function fireReady(phase: DrawPhase, ads: number): boolean {
  return phase === DRAW_DRAWN && ads >= ADS_FIRE;
}

/** Draw time for a weapon class. */
export function drawTimeFor(cls: string): number {
  return cls === 'pistol' ? DRAW_TIME_SIDEARM : DRAW_TIME_PRIMARY;
}

export class DrawState {
  /** 0 holstered .. 1 drawn. */
  progress = 0;
  phase: DrawPhase = DRAW_HOLSTERED;

  /** Advance one step: `aim` held draws (over `drawTime`), released holsters (over HOLSTER_TIME). */
  update(dt: number, aim: boolean, drawTime: number): DrawPhase {
    if (aim) {
      this.progress = Math.min(1, this.progress + dt / Math.max(1e-3, drawTime));
      this.phase = this.progress >= 1 ? DRAW_DRAWN : DRAW_DRAWING;
    } else {
      this.progress = Math.max(0, this.progress - dt / HOLSTER_TIME);
      this.phase = this.progress <= 0 ? DRAW_HOLSTERED : DRAW_HOLSTERING;
    }
    return this.phase;
  }

  /** Seconds left to the current target (drawn while drawing, holstered while holstering; 0 when settled). */
  remaining(drawTime: number): number {
    if (this.phase === DRAW_DRAWING) return (1 - this.progress) * drawTime;
    if (this.phase === DRAW_HOLSTERING) return this.progress * HOLSTER_TIME;
    return 0;
  }

  /** Snap to holstered (hands busy, or the host forced it). */
  holster(): void {
    this.progress = 0;
    this.phase = DRAW_HOLSTERED;
  }

  /** Snap to drawn (the one-handed sidearm from an attach, which keeps its own rules). */
  drawn(): void {
    this.progress = 1;
    this.phase = DRAW_DRAWN;
  }
}
