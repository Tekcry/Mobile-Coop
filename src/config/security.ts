/**
 * Security device numbers (Kestrel S1, docs/kestrel/S0-security-spec.md section 5). Each carries its SN id. The desk
 * numbers join this file in S1 Part B; S2-S3 add access, beams and PIR.
 */

const DEG = Math.PI / 180;

/** CCTV camera (S0 sections 2.1 and 3). */
export const CAMERA = {
  /** SN01 horizontal field of view (rad). */
  hFov: 70 * DEG,
  /** SN02 vertical field of view (rad). The camera looks level (no tilt number in S0), so a body under the mount is out of frame (SN04). */
  vFov: 45 * DEG,
  /** SN03 range (m). */
  range: 18,
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
} as const;

/** SN60 limits per map. */
export const SECURITY_LIMITS = {
  cameras: 12,
} as const;
