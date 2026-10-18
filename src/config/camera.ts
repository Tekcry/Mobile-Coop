import { MOVEMENT } from './movement';

/**
 * Third-person camera framing (tunable), Chaos Theory style (CT prototype A2.1; numbers from
 * `docs/locomotion/research/ct-measure-camera.md`, every one a starting value, G10). The camera is rigid: it sits at a fixed
 * offset from the head, behind and a little to the right, aimed at the head, so the head sits near screen centre and the
 * legs are partly out of frame. It moves only by right stick / mouse. Aiming moves it in to just over the firing shoulder
 * with no FOV change (G29; only a marksman scope zooms).
 */
export const CAMERA = {
  /** Distance behind the pivot (m): explore (measured 1.8 +- 0.25) / aim (measured 0.4 +- 0.1, 0.35-0.45 behind the head). */
  boomHip: 1.8,
  boomAds: 0.35,
  /** Lateral offset of the camera from the head (m), towards the shoulder side: explore 0.1-0.2 (measured) / aim 0.16 +- 0.05 (measured). */
  // (F1a, playtest 1: cam-2 "too centered", cam-3 "too high and not over shoulder enough") the explore camera sits further
  // over the right shoulder (0.15 -> 0.32), the aim camera well over it (0.16 -> 0.42) and lower (eye drop 0.08 -> 0.24). Starting values.
  shoulderHip: 0.32,
  shoulderAds: 0.42,
  /** Pivot (look-at) height above the feet (m): the head top, tied to the shared capsule (G38: same for every operator). */
  pivotStand: MOVEMENT.standHeight,
  pivotCrouch: MOVEMENT.crouchHeight,
  /** Aim: the pivot drops to eye height (m below the head top; measured: camera at eye height to head top). Starting value. */
  aimEyeDrop: 0.24,
  /** Camera height relative to the pivot (m): 0, the camera orbits the head (the measured ~2.3 m height at the default ~17 deg down pitch comes from the pitch). */
  height: 0,
  /** Default pitch at spawn (rad, negative = looking down): about 17 deg down (measured). The player controls it after that. */
  startPitch: -0.3,
  /** Aim blend: seconds in (the camera leads the weapon; per-weapon value set from the draw time), and the fast-out rate (1/s,
   *  exponential: about half way in 0.1 s, settled in about 0.5 s; measured 0.5-0.6 s out). */
  adsInTime: 0.6,
  adsOutRate: 7,
  /** Shoulder swap while aiming: spring rate (1/s, critically damped: about 0.4 s to settle; measured 0.40 pistol / 0.43 rifle)
   *  and the pull-back at the mid-point (m; measured ~0.85 m behind at mid-swap against 0.4 at rest). */
  swapRate: 13,
  swapArc: 0.45,
  /** Stairs only: the vertical follow of the feet is low-passed at this rate (1/s) so steps do not shake the view; XZ is rigid. */
  stairRate: 14,
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
};

export type CameraKey = keyof typeof CAMERA;

/** Pure framing for a state: boom, shoulder offset and pivot height. Used by the camera and unit tests. `ads` 0..1, `crouch` 0..1. */
export function framing(ads: number, crouch: number, C = CAMERA): { boom: number; shoulder: number; pivot: number } {
  return {
    boom: C.boomHip + (C.boomAds - C.boomHip) * ads,
    shoulder: C.shoulderHip + (C.shoulderAds - C.shoulderHip) * ads,
    pivot: C.pivotStand + (C.pivotCrouch - C.pivotStand) * crouch - C.aimEyeDrop * ads,
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

export type AttachCamera = 'hang' | 'ladder' | 'pipe' | 'pipeH' | 'duct' | 'zipline' | 'split' | 'pipeLegs' | 'inverted' | 'rappel' | 'fence' | 'wall';

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
  // (locomotion step 11) back to a wall: pulled back to show the room, over the open-side shoulder (local only)
  wall: { boom: 2.6, shoulder: 0.55, pivot: 1.45, pitch: -0.05, cone: Math.PI, blend: 0.25 },
};

/**
 * (locomotion step 12) Back-to-wall edge cameras (`wall.peek`, `wall.lean`): the pivot swings out toward the edge by
 * `offset` (m) and the view turns toward it by up to `yaw` (rad), at a capped rate over `blend` (s). Local only (never
 * sent; bible "guards detect the body, never the camera"); the camera's pivot safety keeps it out of geometry.
 */
export const WALL_CAMERA = {
  /** (A3, G137) Strict peek: the camera pivot swings only 0.4 m past the body (was 0.6; the head itself goes out 0.35,
   *  `WALL.peekOut`) and the view turns 12 deg (was 25), so the camera sees only a small slice past the corner. Starting
   *  values (G10). Eases over 0.3 s. */
  peek: { offset: 0.4, yaw: (12 * Math.PI) / 180, blend: 0.3 },
  /** (21w) The shoulder swap on a wall (the slide reversing, an edge's open side): a slower critically damped rate
   *  (1/s) than the free camera's `camShoulder` 15.5, so the swap is an ease, never a 10 cm per-frame whip. */
  side: 5,
} as const;

/** Blend a framing (in place) from the hip framing towards an attached preset by `w` 0..1. */
export function attachFraming<T extends { boom: number; shoulder: number; pivot: number }>(base: T, preset: AttachFraming, w: number): T {
  base.boom += (preset.boom - base.boom) * w;
  base.shoulder += (preset.shoulder - base.shoulder) * w;
  base.pivot += (preset.pivot - base.pivot) * w;
  return base;
}
