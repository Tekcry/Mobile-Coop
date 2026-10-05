/**
 * Over-the-shoulder camera framing (tunable). Reference: the camera sits just behind and right of the
 * right shoulder at about head height, so the character fills the left third of the screen (head and
 * shoulders upper left, cropped around the hips) with the crosshair clear of the body. The framing never
 * pulls out to a chase camera; states only nudge it.
 */
export const CAMERA = {
  /** Distance behind the shoulder point (m): hip / ADS. */
  boomHip: 1.2,
  boomAds: 0.75,
  /** Lateral offset of the shoulder point from the spine (m): hip / ADS. */
  shoulderHip: 0.5,
  shoulderAds: 0.4,
  /** Pivot (spine top) height above the feet: standing / crouched (m). */
  pivotStand: 1.6,
  pivotCrouch: 1.12,
  /** Camera height relative to the pivot (m): just below the head, so the head and shoulders sit in
   *  the upper left of the frame. */
  height: -0.12,
  /** Dash: slightly wider framing (extra boom, m). */
  dashBoom: 0.25,
  /** Lean: the shoulder point follows the leaning upper body (m at full lean). */
  leanShift: 0.38,
  /** Gap kept between the camera and walls (m); the boom never shrinks below `minBoom`. */
  padding: 0.16,
  minBoom: 0.28,
  /** Hide the head when the camera gets this close to it (m); the whole body below `hideAll`. */
  hideHead: 0.32,
  hideAll: 0.2,
  /** Default horizontal field of view (degrees). */
  fov: 75,
  /** Pitch limits (rad). */
  minPitch: -1.2,
  maxPitch: 1.05,
  /** Weighted bob during a dash (m). */
  dashBob: 0.02,
};

export type CameraKey = keyof typeof CAMERA;

/** Pure framing for a state: boom, shoulder offset and pivot height. Used by the camera and unit tests. */
export function framing(ads: number, crouch: number, dash: number, C = CAMERA): { boom: number; shoulder: number; pivot: number } {
  return {
    boom: C.boomHip + (C.boomAds - C.boomHip) * ads + C.dashBoom * dash * (1 - ads),
    shoulder: C.shoulderHip + (C.shoulderAds - C.shoulderHip) * ads,
    pivot: C.pivotStand + (C.pivotCrouch - C.pivotStand) * crouch,
  };
}
