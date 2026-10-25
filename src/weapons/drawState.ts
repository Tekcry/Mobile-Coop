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
 * Draw (raise) time (s): the press to the gun settled at low ready (hand movement only; the LT sling draw is
 * `STANCE.slingDrawMult` / `slingDrawLong` x it). History: F1a 0.3 / 0.4; (CT prototype G2, AUDIT-AIM rows 1 / 7) primary
 * 0.3, sidearm 0.5 from the footage.
 * (anim-natural N3, Michael 2026-10-22: "Research what is believable and realistic") real-world times, derived with their
 * sources in `docs/archive/anim-natural/n3/DRAW-TIMES.md`: pistol 0.75 s (the holster adds 0.75 s over low ready to the first
 * shot), rifle 1.1 s (a slung rifle on target in ~2 s, minus the raise to fire and the reaction). One move (reach, grip,
 * lift / clear, present, settle: `anim/drawMotion.ts`) whose phases scale with the time. Undo: primary 0.3, sidearm 0.5
 * (or the tuner's Clip speed rifle / pistol draw sliders).
 */
export const DRAW_TIME_SIDEARM = 0.75;
export const DRAW_TIME_PRIMARY = 1.1;
/**
 * Holster (lower) time (s), per class: the gun guided in, seated, then the hand lets go. History: (G2, AUDIT-AIM row 2)
 * 0.55 -> 0.15 both (CT's holster is instant).
 * (anim-natural N3, Michael 2026-10-22, `docs/archive/anim-natural/n3/DRAW-TIMES.md`) pistol 0.9 s, rifle 1.0 s: no timed standard
 * exists and instructors teach it slow and deliberate, so slower than the draw. Undo: 0.15 both (or the tuner's Clip speed
 * holster time multiplier, down to 0.15x). A traversal's or a busy move's holster keeps 0.15 s (`HOLSTER_TIME_MOVE`).
 */
export const HOLSTER_TIME_PRIMARY = 1.0;
export const HOLSTER_TIME_SIDEARM = 0.9;
/** The long gun's holster time (`DrawState.update`'s default, for callers with no class). */
export const HOLSTER_TIME = HOLSTER_TIME_PRIMARY;
/**
 * (anim-natural N3) The holster for a traversal or a busy move (`WeaponStance.suspended`: a vault, a mantle, a drop, a
 * team move): the gun goes away as fast as before N3 (G2's 0.15 s), so no move gets slower or carries the gun through it.
 */
export const HOLSTER_TIME_MOVE = 0.15;
/**
 * (anim-natural N3) The aim camera's blend in from low ready (the gun drawn), per class: the pre-N3 draw times. The camera
 * blended over 0.9 x the draw time drawn or not, and the shot waits on it (`ADS_FIRE`), so the longer draws would have
 * slowed every aim from low ready; a draw from holstered still blends over 0.9 x its own draw time.
 */
export const AIM_IN_PRIMARY = 0.3;
export const AIM_IN_SIDEARM = 0.5;

// (clip-speed, track A) the tuner's "today" lines read the durations from here
CLIP_BASE.rifleDraw = DRAW_TIME_PRIMARY;
CLIP_BASE.pistolDraw = DRAW_TIME_SIDEARM;
CLIP_BASE.holsterPrimary = HOLSTER_TIME_PRIMARY;
CLIP_BASE.holsterSidearm = HOLSTER_TIME_SIDEARM;

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

/**
 * (anim-natural N3) The deliberate (X) holster time for a weapon class, divided by the tuner's rifle / pistol holster
 * speed (Clip speed; 1 at identity). A traversal's or a busy move's HOLSTER_TIME_MOVE is not scaled.
 */
export function holsterTimeFor(cls: string): number {
  return cls === 'pistol' ? HOLSTER_TIME_SIDEARM / clipSpeed('holsterSidearm') : HOLSTER_TIME_PRIMARY / clipSpeed('holsterPrimary');
}

export class DrawState {
  /** 0 holstered .. 1 drawn. */
  progress = 0;
  phase: DrawPhase = DRAW_HOLSTERED;

  /** Advance one step: `aim` held draws (over `drawTime`), released holsters (over `holsterTime`). */
  update(dt: number, aim: boolean, drawTime: number, holsterTime = HOLSTER_TIME): DrawPhase {
    if (aim) {
      this.progress = Math.min(1, this.progress + dt / Math.max(1e-3, drawTime));
      this.phase = this.progress >= 1 ? DRAW_DRAWN : DRAW_DRAWING;
    } else {
      this.progress = Math.max(0, this.progress - dt / Math.max(1e-3, holsterTime));
      this.phase = this.progress <= 0 ? DRAW_HOLSTERED : DRAW_HOLSTERING;
    }
    return this.phase;
  }

  /** Seconds left to the current target (drawn while drawing, holstered while holstering; 0 when settled). */
  remaining(drawTime: number, holsterTime = HOLSTER_TIME): number {
    if (this.phase === DRAW_DRAWING) return (1 - this.progress) * drawTime;
    if (this.phase === DRAW_HOLSTERING) return this.progress * holsterTime;
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
