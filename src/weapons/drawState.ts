/**
 * Holstered unless aiming (bible 1.11, 5.6; locomotion step 09). Pure and Babylon-free: aim held draws the weapon,
 * aim released holsters it, in every state (alert and combat too). A release mid-draw reverses from the current
 * progress (and a press mid-holster draws again from where the hand is). The phase rides on the wire as
 * `MoveState.dw` (host-authoritative, D8).
 */
import { CLIP_BASE, clipSpeed } from '../anim/tuneClipSpeed'; // (clip-speed, track A)

export const DRAW_HOLSTERED = 0;
export const DRAW_DRAWING = 1;
export const DRAW_DRAWN = 2;
export const DRAW_HOLSTERING = 3;
export type DrawPhase = 0 | 1 | 2 | 3;

/**
 * Draw (raise) time (s). (CT prototype G2, AUDIT-AIM rows 1 / 7, "Footage wins" over F1a / G103) primary 0.4 -> 0.3: the
 * rifle comes off the back muzzle up at the shoulder and tips onto the line, reach to settled about 0.55 s with the raise
 * (105845 2.77-3.37, 111908 20.62-21.1); sidearm 0.3 -> 0.5: the pistol settles about 0.55 s after the press (111908
 * 0.6-1.17, 051739 0.63-0.73 s). Starting values.
 */
export const DRAW_TIME_SIDEARM = 0.5;
export const DRAW_TIME_PRIMARY = 0.3;
/**
 * Holster (lower) time (s), every class. (G2, AUDIT-AIM row 2) 0.55 -> 0.15: CT's holster is instant (111908 31.9 aimed,
 * 32.0 slung; the pistol gone 15.87 -> 15.93); G103's 0.5-0.6 was the camera pull-out, which keeps its own rate.
 */
export const HOLSTER_TIME = 0.15;

// (clip-speed, track A) the tuner's "today" lines read the durations from here
CLIP_BASE.rifleDraw = DRAW_TIME_PRIMARY;
CLIP_BASE.pistolDraw = DRAW_TIME_SIDEARM;
CLIP_BASE.holster = HOLSTER_TIME;

/** (clip-speed, track A) The holster time with the tuner's holster speed (HOLSTER_TIME at identity). */
export function holsterTime(): number {
  return HOLSTER_TIME / clipSpeed('holster');
}

/** A shot needs the aim this far in (`cam.ads`). */
export const ADS_FIRE = 0.9;

/** No hip fire: the trigger is live only drawn and aimed in (holstered, drawing or holstering: nothing). */
export function fireReady(phase: DrawPhase, ads: number): boolean {
  return phase === DRAW_DRAWN && ads >= ADS_FIRE;
}

/**
 * Draw time for a weapon class. (clip-speed, track A) Divided by the tuner's draw speed (1 at identity): the draw state
 * reaches DRAW_DRAWN, the gate of `fireReady`, over this same time, so the gun can fire when the draw clip ends.
 */
export function drawTimeFor(cls: string): number {
  return cls === 'pistol' ? DRAW_TIME_SIDEARM / clipSpeed('pistolDraw') : DRAW_TIME_PRIMARY / clipSpeed('rifleDraw');
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
      this.progress = Math.max(0, this.progress - dt / holsterTime()); // (clip-speed, track A)
      this.phase = this.progress <= 0 ? DRAW_HOLSTERED : DRAW_HOLSTERING;
    }
    return this.phase;
  }

  /** Seconds left to the current target (drawn while drawing, holstered while holstering; 0 when settled). */
  remaining(drawTime: number): number {
    if (this.phase === DRAW_DRAWING) return (1 - this.progress) * drawTime;
    if (this.phase === DRAW_HOLSTERING) return this.progress * holsterTime(); // (clip-speed, track A)
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
