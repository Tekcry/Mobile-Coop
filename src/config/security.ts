/**
 * Security device numbers (Kestrel S1, docs/kestrel/S0-security-spec.md section 5). Each carries its SN id. The desk
 * numbers join this file in S1 Part B; S2-S3 add access, beams and PIR.
 */

const DEG = Math.PI / 180;

/** CCTV camera (S0 sections 2.1 and 3). */
export const CAMERA = {
  /** SN01 horizontal field of view (rad). */
  hFov: 70 * DEG,
  /** SN02 vertical field of view (rad). Centred on the camera's pitch (sector-fixes C: `aim` in the map data pitches it down
   *  to a floor patch; none looks level, so a body under the mount is out of frame, SN04). */
  vFov: 45 * DEG,
  /** SN03 range (m) of a camera with neither `range` nor `aim` in its map data. (camera-range, Michael 2026-10-23:
   *  "cameras need to have less range") 18 -> 12: the Security Lab and Kestrel cameras. `camRange` has the whole rule. */
  range: 12,
  /** (camera-range) The most any camera's range may be (m): the longest Sector Ops zone (cam-floor). */
  rangeMax: 14,
  /** (camera-range) An aimed camera with no `range` of its own watches the floor patch centred on its aim point: its range
   *  is this times `aim` (the rule the Sector Ops ranges already follow: 5 / 10, 6 / 12, 7 / 14; Marlow Yard 6.5 / 13). */
  aimReach: 2,
  /** (camera-range) Distance falloff over the camera's own range: rate x (1 - (d / range)^edgePow). Close to the guard
   *  curve inside the zone (the fill times there hold), down to 0 at its edge: no full-rate pick-up at the range cut. */
  edgePow: 2,
  /** (sector-fixes C) Shortest per-camera range and nearest aim point (m) the map data may set. */
  rangeMin: 4,
  aimMin: 2,
  /** SN04 mount height above the floor: lowest and highest (m). */
  mountMin: 2.4,
  mountMax: 3.5,
  /** SN05 housing (shot target box): length, width, height (m). */
  housing: { len: 0.35, w: 0.15, h: 0.15 },
  /** SN06 status LED size (m). */
  ledSize: 0.04,
  /** SN07 think rate (Hz). */
  thinkHz: 4,
  /** SN11 seconds in frame after meter 1 before the operator gets `alert()` (desk, Part B). */
  fullFrameTime: 2.0,
  /** SN12 seconds a lit body must stay on a feed before it is reported (desk, Part B). */
  bodySeenTime: 2.0,
  /** SN13 widest sweep (deg). */
  sweepMaxDeg: 120,
  /** SN14 sweep speed (rad/s): 15 deg/s. */
  sweepSpeed: 15 * DEG,
  /** SN15 pause at each end of a sweep (s). */
  sweepPause: 2.0,
  /**
   * (marlow-jammer, Michael M3) The camera's own IR illuminator: inside its range and cone it reads every body at this
   * light level, whatever the lamps do (jammed, shot or dark corners). 1 = fully lit: the lit detection rates are
   * unchanged (the perception light factor is already 1 at `LIGHT.lit` 0.6 and above). Guards and the light meter still
   * read the lamps.
   */
  irLight: 1,
} as const;

/** SN60 limits per map. */
export const SECURITY_LIMITS = {
  cameras: 12,
} as const;
