import { MOVEMENT } from './movement';

/**
 * Third-person camera framing (tunable), Chaos Theory style (CT prototype A2.1; numbers from
 * `docs/research/ct-movement/ct-measure-camera.md`, every one a starting value, G10). The camera is rigid: it sits at a fixed
 * offset from the head, behind and a little to the right, aimed at the head, so the head sits near screen centre and the
 * legs are partly out of frame. It moves only by right stick / mouse. Aiming moves it in to just over the firing shoulder
 * with no FOV change (G29; only a marksman scope zooms).
 */
export const CAMERA = {
  /** Distance behind the pivot (m): explore in a tight space (rooms, corridors; measured 1.8 +- 0.25) / aim (G3: 0.40,
   *  AUDIT-CAMERA row 2: the head 0.27-0.33 of the width puts the camera 0.40 m from it; was 0.35). */
  boomHip: 1.8,
  boomAds: 0.4,
  /** (G3, AUDIT-CAMERA rows 1 and 7) Explore in an open space (yards, outdoors): the whole body in frame, the hero 0.50-0.52
   *  of the frame height (the audit's 3.3 m for a 1.8 m hero; 3.1-3.5 m running), crouched 2.2 m (CT 2.1-2.6). G3 render
   *  check (shots/g3/yard-ctcourse, in game at the 12 deg start pitch): 3.3 m framed Wren at 0.43 of the height, so 2.8
   *  (Wren is shorter than the audit's 1.8 m hero; CT 111908 @18.5 reads 0.50). A tight space keeps `boomHip` both ways.
   *  Open or tight comes from the map's camera spaces (`world/camSpaces.ts`), else from the probes below. */
  boomOpen: 2.8,
  boomCrouchOpen: 2.2,
  /** (G3 fix round) In an open space the look-at point drops this far (m) under the head top (holstered), so the whole
   *  body is in frame with the feet clear of the bottom edge: CT 111908 @18.5, head top at y 0.42, feet at 0.92 (at 2.8 m
   *  and the 12 deg start pitch the feet sat at the frame edge). Starting value. */
  openDrop: 0.25,
  /** Open-space weight rates (1/s, critically damped): into tight (about 0.8 s) and out to open (about 1.2 s). A 1.5 m
   *  step at the wall pull-in rate (`boomIn` 40) reads as a cut, so the space blends on its own spring; walls still pull
   *  the boom in at once through the sphere cast. Starting values. */
  toTight: 6,
  toOpen: 4,
  /** Probe fallback (maps without camera spaces): open when the ray back from the head is clear past `openBack` (m) and
   *  both side rays past `openSide` (m) (AUDIT-CAMERA row 1). */
  openBack: 3.5,
  openSide: 2.0,
  /** Lateral offset of the camera from the head (m), towards the shoulder side. (G3, Michael 2026-10-20 "Match CT
   *  (0.15 m)", replaces F1a 0.32) explore 0.15: the spine at x 0.45-0.48. (G3, "Footage wins", replaces F1a 0.42) aim
   *  0.30 at the 0.40 boom (job lead, after the G3 render: at 0.17 the head, which moves onto the stock when aiming, sat at
   *  x 0.5 over the reticle; 0.42 put it at x ~0.1; CT has its centre near x 0.3, 105845 @ 36.5). G3 fix-round render:
   *  head centre x 0.27 rifle, 0.28 pistol (settled), 0.30 crouched, the reticle clear; kept. */
  shoulderHip: 0.15,
  shoulderAds: 0.3,
  /** Pivot (look-at) height above the feet (m): the head top, one value for every operator (G38). (G3, AUDIT-CAMERA row 6)
   *  1.68, the operators' shared head top (`operatorRig`), was the capsule's 1.75 (the head rendered low, y 0.55-0.62
   *  against CT's 0.42-0.51); crouched the same 0.07 m under the crouch capsule, so the crouch drop stays 0.6 m and
   *  `aimCrouchShare` keeps its calibration. */
  pivotStand: MOVEMENT.standHeight - 0.07,
  pivotCrouch: MOVEMENT.crouchHeight - 0.07,
  /** Aim: the pivot drops to eye height (m below the head top). (G3, row 10; F1a had 0.24 from the 1.75 pivot) 0.16 from
   *  1.68: the camera stays at 1.52 m, the head centre about 7 deg above the screen centre (CT 4-10 deg). */
  aimEyeDrop: 0.16,
  /** (F2) Aiming crouched, the share of the crouch drop the pivot follows: from the kneel (F3) the aiming upper body is
   *  upright, the head about 0.41 m below standing against the 0.6 m crouch drop (shots/f/aimcrouch-side); the full drop put
   *  the camera behind her shoulder. Starting value (G10). */
  aimCrouchShare: 0.68,
  /** Camera height relative to the pivot (m): 0, the camera orbits the head (the measured ~2.3 m height at the default ~17 deg down pitch comes from the pitch). */
  height: 0,
  /** Default pitch at spawn (rad, negative = looking down). (G3, row 4) 12 deg down, the horizon at y 0.30 as in CT at
   *  FOV 86 (was -0.3, 17 deg, which at 86 put it at y 0.21). The player controls it after that. */
  startPitch: -0.21,
  /** Aim blend: seconds in (the camera leads the weapon; per-weapon value set from the draw time), and the fast-out rate (1/s,
   *  exponential: about half way in 0.1 s, settled in about 0.5 s; measured 0.5-0.6 s out). */
  adsInTime: 0.6,
  adsOutRate: 7,
  /** (G3, row 13) Aiming off a wall (the aim starts on the wall or within 0.8 s of leaving it): the camera dollies to the
   *  shoulder in this time at most (CT 052059: most of the move in 0.23 s, settled by 0.4 s). */
  adsInWall: 0.35,
  /** Shoulder swap while aiming: spring rate (1/s, critically damped: about 0.4 s to settle; measured 0.40 pistol / 0.43 rifle)
   *  and the pull-back at the mid-point (m; measured ~0.85 m behind at mid-swap against 0.4 at rest). */
  swapRate: 13,
  /** (G3, row 9) 0.4 (was 0.3): 0.8 m behind at mid-swap with the 0.40 aim boom (CT 0.7-0.8 m). */
  swapArc: 0.4,
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
   *  (about 0.055 m at `near` 0.05 m, 86 deg, 16:9; 0.07 m at 21:9), so no surface can cut the near plane while the camera sits at a hit. */
  castRadius: 0.12,
  /** Extra gap along the boom after a sphere hit (m): with `castRadius`, a head-on wall keeps the old 0.16 m `padding`. */
  castPad: 0.04,
  /** Radius of the casts from the head to the pivot and from the pivot to the shoulder point (m). */
  pivotRadius: 0.12,
  /** Those casts stop this far short of a hit (m), so the next cast starts clear of the wall rather than touching it. */
  castSkin: 0.03,
  /** Boom follow rates (1/s, critically damped): pull in fast towards a nearer wall, ease back out slowly. (G3,
   *  AUDIT-EXTRA-OLD row 7, CT 053437: in about 0.25 s, out about 1.2 s; was 40 / 7) 16 / 4. The sphere cast's stop
   *  still clamps the boom the same frame (`boomActual` = min(spring, cast)), so the camera is never behind a wall. */
  boomIn: 16,
  boomOut: 4,
  /** (G3, AUDIT-EXTRA-NEW row 19, CT 110818) Through an open door: passing through its frame (`world/camSpaces.ts`
   *  `doorPassing`: within 1 m of the doorway plane, across it at 0.3 m/s or more; the door looked up within
   *  `doorPassReach` m of its centre) the boom pushes in to `doorPassBoom` (m) over `doorPassIn` (s), holds while passing,
   *  and returns over `doorPassOut` (s). Prototype, starting values. */
  doorPassBoom: 0.8,
  doorPassReach: 1.2,
  doorPassIn: 0.4,
  doorPassOut: 0.7,
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
  /** Default horizontal field of view (degrees, at 16:9). (G3, Michael 2026-10-20 "Match CT (86)", was 75) 86 gives a
   *  55.3 deg vertical FOV, CT's 55.7, so CT's vertical framing carries over 1:1. The settings default follows it
   *  (`video.fovH`, the `camV` migration). */
  fov: 86,
  /** Pitch limits (rad). */
  minPitch: -1.2,
  maxPitch: 1.05,
};

export type CameraKey = keyof typeof CAMERA;

/** The explore boom (m) for an open-space weight `open` 0 (tight) .. 1 (open) and `crouch` 0..1 (G3, rows 1 and 7). */
export function exploreBoom(open: number, crouch: number, C = CAMERA): number {
  const o = C.boomOpen + (C.boomCrouchOpen - C.boomOpen) * crouch;
  return C.boomHip + (o - C.boomHip) * open;
}

/** Pure framing for a state: boom, shoulder offset and pivot height. Used by the camera and unit tests. `ads` 0..1,
 *  `crouch` 0..1, `open` 0 tight .. 1 open space (G3; default tight). */
export function framing(ads: number, crouch: number, C = CAMERA, open = 0): { boom: number; shoulder: number; pivot: number } {
  const hip = exploreBoom(open, crouch, C);
  return {
    boom: hip + (C.boomAds - hip) * ads,
    shoulder: C.shoulderHip + (C.shoulderAds - C.shoulderHip) * ads,
    // (F2, playtest 2 "aiming camera doesn't follow body when crouching") the pivot follows the body down crouched, aiming
    // or not; the framing relative to the body (eye drop, boom, shoulder) is the same standing and crouched (BC note 1);
    // aiming, it follows the kneel's upright aim (`aimCrouchShare` of the crouch drop)
    // (G3) in the open the look-at point drops under the head (holstered), the whole body in frame
    pivot: C.pivotStand + (C.pivotCrouch - C.pivotStand) * crouch * (1 - ads * (1 - C.aimCrouchShare)) - C.aimEyeDrop * ads - C.openDrop * open * (1 - ads),
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
  // hanging (and the hang shimmy): (G3, AUDIT-CAMERA rows 14 and 30; was boom 2.9, shoulder 0.5, pivot 1.35, pitch -0.25)
  // behind and centred, the middle of the hanging body at the frame centre, 3.5 m (CT 3.3-3.7), nearly level
  hang: { boom: 3.5, shoulder: 0.05, pivot: 1.1, pitch: -0.1, cone: 2.2, blend: 0.3 },
  // ladder / drainpipe: behind, looking up or down the climb. (G3, rows 15 and 29) centred (shoulder 0.55 -> 0.05);
  // the drainpipe further back (2.0 -> 2.8, CT about 3 m)
  ladder: { boom: 2.0, shoulder: 0.05, pivot: 1.5, pitch: 0.1, cone: 2.4, blend: 0.25 },
  pipe: { boom: 2.8, shoulder: 0.05, pivot: 1.5, pitch: 0.1, cone: 2.4, blend: 0.25 },
  pipeH: { boom: 2.6, shoulder: 0.5, pivot: 1.4, pitch: -0.15, cone: Math.PI, blend: 0.3 },
  // duct: (G3, row 17; was boom 0.9, shoulder 0.22, pivot 0.55, pitch -0.05) just behind and above the head (CT 0.25-0.7 m,
  // typical 0.45), centred, the view level along the duct with the head and shoulders at the frame bottom
  // (G3, AUDIT-EXTRA-NEW row 11) blend 0.2 -> 0.4: the camera swings in behind the head over 0.4 s (CT 110714)
  duct: { boom: 0.45, shoulder: 0, pivot: 0.65, pitch: 0.08, cone: 1.2, blend: 0.4 },
  zipline: { boom: 2.8, shoulder: 0.45, pivot: 1.2, pitch: -0.2, cone: Math.PI, blend: 0.25 },
  // (3.2.0) split jump: up between the walls, looking down the corridor (the pivot from the feet on the walls)
  split: { boom: 2.0, shoulder: 0.4, pivot: 0.75, pitch: -0.35, cone: Math.PI, blend: 0.3 },
  // pipe, legs up: under the pipe, looking along it
  pipeLegs: { boom: 2.4, shoulder: 0.45, pivot: 0.55, pitch: -0.1, cone: Math.PI, blend: 0.35 },
  // pipe, inverted: the camera stays upright at the hanging head's height
  inverted: { boom: 2.3, shoulder: 0.45, pivot: -0.3, pitch: 0, cone: Math.PI, blend: 0.35 },
  // (3.2.0 phase 3) rappel: out from the wall, looking down the drop; fence: over the shoulder up the mesh
  // (G3, row 16; was boom 2.8, shoulder 0.5) the hero centred, 3.0 m (CT 3.0-3.1)
  rappel: { boom: 3.0, shoulder: 0.05, pivot: 1.2, pitch: -0.3, cone: Math.PI, blend: 0.3 },
  fence: { boom: 2.2, shoulder: 0.5, pivot: 1.4, pitch: 0.05, cone: 2.4, blend: 0.25 },
  // (locomotion step 11) back to a wall: pulled back to show the room, over the open-side shoulder (local only). (G3,
  // row 12; was boom 2.6, shoulder 0.55) the whole body from about 2 m, the hero at x 0.41-0.46 (CT 052021, 051917)
  wall: { boom: 2.0, shoulder: 0.15, pivot: 1.45, pitch: -0.05, cone: Math.PI, blend: 0.25 },
};

/**
 * (locomotion step 12) Back-to-wall edge cameras (`wall.peek`, `wall.lean`): the pivot swings out toward the edge by
 * `offset` (m) and the view turns toward it by up to `yaw` (rad), at a capped rate over `blend` (s). Local only (never
 * sent; bible "guards detect the body, never the camera"); the camera's pivot safety keeps it out of geometry.
 */
export const WALL_CAMERA = {
  /** (A3, G137) Strict peek: the camera pivot swings past the body (`offset`; the head itself goes out `WALL.peekOut`,
   *  0.36 since G6) and the view turns `yaw` (18 deg since G3; was 12, then 25), so the camera sees only a small slice past
   *  the corner. Starting values (G10). In over `blend`, out over `out` (G3 below). (G6, AUDIT-WALLS row 10: comment only;
   *  the in / out times stay the camera audit's, AUDIT-CAMERA row 11.) */
  // (F4, playtest 2 "the camera needs to slide sideways") the camera slides toward the open side by how far the player
  // looks / pushes past the edge (`WallCore.peekView`): the pivot up to `offset` past the body, the shoulder offset
  // giving way to it and the boom in to `boom` (CT: 1.0-1.5 m from the head, ct-measure-walls-doors-combat-vision.md)
  // (F4) blend 0.55 (was 0.3): the slide moves the pivot, boom and shoulder together, so a 0.3 s ease stepped the
  // camera ~10 cm a frame (e2e-wall caps it at 6)
  // (G3, AUDIT-CAMERA row 11; replaces slice F's 0.55 s) CT 052021: in over 0.2 s, back in 0.17 s. In over `blend` 0.35,
  // back over `out` 0.3, on the soft-linear `peekEase` (peak speed 1.25x the mean, a smoothstep's 1.5x): about the
  // fastest that keeps the per-frame step at slice F's (unit model, step input: 5.3-8.0 cm by view yaw against slice F's
  // 3.5-8.8; e2e-wall caps it at 6 cm in its run).
  // `boom` 1.4 and `yaw` 18 deg kept (the yaw is the middle of the two clips, under 10 and 40-60 deg)
  // `shoulder`: the open-side offset at full peek (slice F's wall 0.55, which framed the hero at x 0.28-0.30 as CT)
  peek: { offset: 0.75, yaw: (18 * Math.PI) / 180, blend: 0.35, out: 0.3, boom: 1.4, shoulder: 0.55 },
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

/**
 * (G3, AUDIT-CAMERA row 11) The edge peek's ease from its linear ramp `p` 0..1: constant speed with soft ends (`ramp` of
 * the move at each end), so CT's fast 0.2 s slide moves the camera at the lowest peak speed (1 / (1 - ramp) of the mean;
 * a smoothstep's is 1.5).
 */
export function peekEase(p: number, ramp = 0.2): number {
  const x = Math.max(0, Math.min(1, p));
  const k = 1 / (2 * ramp * (1 - ramp));
  if (x < ramp) return x * x * k;
  if (x > 1 - ramp) return 1 - (1 - x) * (1 - x) * k;
  return (x - ramp / 2) / (1 - ramp);
}
