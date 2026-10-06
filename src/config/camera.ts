/**
 * Over-the-shoulder camera framing (tunable), Splinter Cell: Blacklist style: the camera sits a couple of
 * metres behind and well right of the shoulder at about shoulder height, so the whole operative stands
 * small in the left third of the screen (head to knees, crouched: low in the lower left) and most of the
 * frame is the room ahead. Aiming pushes in over the shoulder; states only nudge it.
 */
export const CAMERA = {
  /** Distance behind the shoulder point (m): hip / ADS. */
  boomHip: 2.2,
  boomAds: 1.5,
  /** Lateral offset of the shoulder point from the spine (m): hip / ADS. */
  shoulderHip: 0.62,
  shoulderAds: 0.58,
  /** Pivot (spine top) height above the feet: standing / crouched (m). */
  pivotStand: 1.62,
  pivotCrouch: 1.18,
  /** Camera height relative to the pivot (m): about shoulder height, looking over the operative. */
  height: -0.08,
  /** Dash: slightly wider framing (extra boom, m). */
  dashBoom: 0.3,
  /** In cover: the camera pulls back a little to show the room (m). */
  coverBoom: 0.2,
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
