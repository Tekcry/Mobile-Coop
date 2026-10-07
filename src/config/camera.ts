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

/** Attached traversal states (ladder, pipe, hang, duct, zipline): framing preset per state. `boom` / `shoulder`
 *  / `pivot` replace the hip framing (pivot above the feet), `pitch` biases the view (rad, + up) and `cone`
 *  bounds the free orbit around the anchor's facing (rad; Math.PI = free). Blended in over `blend` seconds. */
export interface AttachFraming {
  boom: number;
  shoulder: number;
  pivot: number;
  pitch: number;
  cone: number;
  blend: number;
}

export type AttachCamera = 'hang' | 'ladder' | 'pipe' | 'pipeH' | 'duct' | 'zipline' | 'split' | 'pipeLegs' | 'inverted';

export const ATTACH_FRAMING: Record<AttachCamera, AttachFraming> = {
  // hanging: pulled back and lower, showing the drop
  hang: { boom: 2.9, shoulder: 0.5, pivot: 1.35, pitch: -0.25, cone: 2.2, blend: 0.3 },
  // ladder / drainpipe: over the shoulder, looking up or down the climb
  ladder: { boom: 2.0, shoulder: 0.55, pivot: 1.5, pitch: 0.1, cone: 2.4, blend: 0.25 },
  pipe: { boom: 2.0, shoulder: 0.55, pivot: 1.5, pitch: 0.1, cone: 2.4, blend: 0.25 },
  pipeH: { boom: 2.6, shoulder: 0.5, pivot: 1.4, pitch: -0.15, cone: Math.PI, blend: 0.3 },
  // duct: tight, low
  duct: { boom: 0.9, shoulder: 0.22, pivot: 0.55, pitch: -0.05, cone: 1.2, blend: 0.2 },
  zipline: { boom: 2.8, shoulder: 0.45, pivot: 1.2, pitch: -0.2, cone: Math.PI, blend: 0.25 },
  // (3.2.0) split jump: up between the walls, looking down the corridor (the pivot from the feet on the walls)
  split: { boom: 2.0, shoulder: 0.4, pivot: 0.75, pitch: -0.35, cone: Math.PI, blend: 0.3 },
  // pipe, legs up: under the pipe, looking along it
  pipeLegs: { boom: 2.4, shoulder: 0.45, pivot: 1.05, pitch: -0.1, cone: Math.PI, blend: 0.35 },
  // pipe, inverted: the camera stays upright at the hanging head's height
  inverted: { boom: 2.3, shoulder: 0.45, pivot: 0.35, pitch: 0, cone: Math.PI, blend: 0.35 },
};

/** Blend a framing (in place) from the hip framing towards an attached preset by `w` 0..1. */
export function attachFraming<T extends { boom: number; shoulder: number; pivot: number }>(base: T, preset: AttachFraming, w: number): T {
  base.boom += (preset.boom - base.boom) * w;
  base.shoulder += (preset.shoulder - base.shoulder) * w;
  base.pivot += (preset.pivot - base.pivot) * w;
  return base;
}
