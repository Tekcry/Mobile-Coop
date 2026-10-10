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
  /** Gap kept between the camera and walls (m), measured along the view ray (old single-ray rule; the e2e camera checks use it). */
  padding: 0.16,
  /** Shortest boom the framing asks for (m). A wall nearer than this still wins: the camera never sits behind a wall (CAM). */
  minBoom: 0.28,
  // --- wall and low-space safety (CAM, 2026-10-11): sphere casts head -> pivot -> shoulder -> camera, probes up and down
  /** Radius of the sphere cast from the shoulder point back to the camera (m). Larger than the near plane's half-diagonal
   *  (about 0.07 m at `near` 0.05 m, 75 deg, 16:9 to 21:9), so no surface can cut the near plane while the camera sits at a hit. */
  castRadius: 0.12,
  /** Extra gap along the boom after a sphere hit (m): with `castRadius`, a head-on wall keeps the old 0.16 m `padding`. */
  castPad: 0.04,
  /** Radius of the casts from the head to the pivot and from the pivot to the shoulder point (m). */
  pivotRadius: 0.12,
  /** Those casts stop this far short of a hit (m), so the next cast starts clear of the wall rather than touching it. */
  castSkin: 0.03,
  /** Boom follow rates (1/s, critically damped): pull in fast towards a nearer wall, ease back out slowly. */
  boomIn: 40,
  boomOut: 7,
  /** Low spaces (crawl voids, ducts, low ceilings): clear height over the head (m) where the camera starts to adapt, and
   *  where it is fully adapted (F32: a 1.5 m crouch duct works). Above `lowStart` the framing is exactly the normal one. */
  lowStart: 1.9,
  lowFull: 1.5,
  /** Low space: the longest boom (m), and the gaps kept between the shoulder point and the ceiling / floor (m). */
  lowBoom: 1.4,
  lowCeilGap: 0.32,
  lowFloorGap: 0.3,
  /** Low space: share of the boom's vertical swing with pitch that is kept (1 = all, as in the open; 0 = level). */
  lowSwing: 0.3,
  /** Low space blend rates (1/s): adapt fast when the space closes in, ease back out slowly when it opens up. */
  lowIn: 10,
  lowOut: 2.5,
  /** Length of the up and down probes from the head (m): past `lowStart`, so a normal ceiling reads as open. */
  probeUp: 2.2,
  probeDown: 2.2,
  /** Near plane (m): `near` normally, down to `nearClose` while the boom is pulled in to `nearCloseBoom` (m) or less;
   *  blended up to `nearFarBoom` (m). */
  near: 0.05,
  nearClose: 0.02,
  nearCloseBoom: 0.3,
  nearFarBoom: 0.8,
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

export type AttachCamera = 'hang' | 'ladder' | 'pipe' | 'pipeH' | 'duct' | 'zipline' | 'split' | 'pipeLegs' | 'inverted' | 'rappel' | 'fence';

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
  pipeLegs: { boom: 2.4, shoulder: 0.45, pivot: 0.55, pitch: -0.1, cone: Math.PI, blend: 0.35 },
  // pipe, inverted: the camera stays upright at the hanging head's height
  inverted: { boom: 2.3, shoulder: 0.45, pivot: -0.3, pitch: 0, cone: Math.PI, blend: 0.35 },
  // (3.2.0 phase 3) rappel: out from the wall, looking down the drop; fence: over the shoulder up the mesh
  rappel: { boom: 2.8, shoulder: 0.5, pivot: 1.2, pitch: -0.3, cone: Math.PI, blend: 0.3 },
  fence: { boom: 2.2, shoulder: 0.5, pivot: 1.4, pitch: 0.05, cone: 2.4, blend: 0.25 },
};

/** Blend a framing (in place) from the hip framing towards an attached preset by `w` 0..1. */
export function attachFraming<T extends { boom: number; shoulder: number; pivot: number }>(base: T, preset: AttachFraming, w: number): T {
  base.boom += (preset.boom - base.boom) * w;
  base.shoulder += (preset.shoulder - base.shoulder) * w;
  base.pivot += (preset.pivot - base.pivot) * w;
  return base;
}
