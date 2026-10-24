/**
 * (rig-pose-fix S6, audit G10) The guard dog's head hit volume from the SIM, not from the drawn model.
 *
 * The head sphere used to follow `DogModel.head`: the model's `headPivot` world position, read through the scene graph
 * once per render frame at the render-interpolated root, with the model's own render-rate gait clock, and copied into
 * the next fixed step (gameplay read graphics state, one frame late, frame-rate dependent). This module gives the same
 * point from the dog's sim state alone (feet, yaw, speed, the gait clock, alert, bite). `DogModel` draws its standing
 * pose from the same functions (`dogPose`), so the drawn head and the hit volume are one model.
 *
 * Not a fit: the dog's body is procedural, so the head is the model's own transform chain written out
 * (root -> yaw -> body at `dogPose().bodyY` -> head pivot at (0, `HEAD_UP`, `headZ`), centre `HEAD_LIFT` above the
 * pivot in world y, as the old `DogModel.head`). The pivot's pitch (`alert`, `bite`, the nod on the gait) turns the
 * skull about the pivot and does not move the pivot, so it does not move the centre (as before). `tests/dogHead.test.ts`
 * holds it to the model's scene graph on a NullEngine (tolerance 1 mm, float rounding only).
 *
 * Down (dead / knocked out) has no head volume (the hit volumes are disposed at death); the lying pose stays the
 * model's presentation.
 *
 * Pure: no Babylon. `dogHead` / `dogPose` write `out` in place; nothing allocates.
 */

/** Body sizes (m): shoulder height, body length, leg length (the model's build). */
export const DOG_SHOULDER = 0.62;
export const DOG_BODY = 0.78;
export const DOG_LEG = 0.5;
/** The body node's height above the feet standing still. */
export const DOG_BODY_Y = DOG_SHOULDER - 0.1;
/** The head pivot in the body's frame: up, forward (standing, no bite). */
export const DOG_HEAD_UP = 0.14;
export const DOG_HEAD_Z = DOG_BODY * 0.48;
/** The bite's forward reach of the head pivot at `bite` 1. */
export const DOG_BITE_REACH = 0.12;
/** The hit volume's centre above the head pivot (world y). */
export const DOG_HEAD_LIFT = 0.14;
/** The bite pose decays at this rate per second from 1 (the shared `kick` rate). */
export const DOG_BITE_DECAY = 8;
/** The gait clock wraps here: every term of the pose (sin phase, |cos phase|, sin phase / 2, sin 1.3 phase) has a
 *  period that divides 20 pi, so the wrap is seamless. */
export const DOG_PHASE_WRAP = 20 * Math.PI;
/** A gait clock where the trot's body bob |cos phase| sits at its mean (2 / pi): for a caller with no gait clock (the
 *  co-op puppet), at most 1.9 cm from any phase. */
export const DOG_MEAN_PHASE = Math.acos(2 / Math.PI);

/** Stride rate (cycles per second) at `speed` (m/s): still below 5 cm/s. */
export function dogGaitRate(speed: number): number {
  return speed < 0.05 ? 0 : 1.6 + speed * 0.55;
}

/** The trot's leg swing amplitude (rad) at `speed`; the body bob is 4 % of it (m). */
export function dogGaitAmp(speed: number): number {
  return Math.min(0.75, speed * 0.22);
}

/** The gait clock after `dt` seconds at `speed` (wrapped at `DOG_PHASE_WRAP`). */
export function dogGaitStep(phase: number, speed: number, dt: number): number {
  const p = phase + dt * dogGaitRate(speed) * Math.PI * 2;
  return p >= DOG_PHASE_WRAP ? p - DOG_PHASE_WRAP : p;
}

/** The gait clock `back` seconds before `phase` at `speed` (the drawn root lags the sim by (1 - alpha) steps). May
 *  be negative right after a wrap: every pose term is continuous across it. */
export function dogPhaseBack(phase: number, speed: number, back: number): number {
  return phase - back * dogGaitRate(speed) * Math.PI * 2;
}

/** The standing pose the model draws (body-local). */
export interface DogPose {
  /** Body node height above the feet (m). */
  bodyY: number;
  /** Leg swing (rad): front left + back right take +swing, the other pair -swing. */
  swing: number;
  /** Head pivot pitch (rad, Babylon rotation.x: negative lifts the head). */
  headPitch: number;
  /** Head pivot forward offset in the body (m). */
  headZ: number;
  /** Tail wag (rad, rotation.y). */
  tail: number;
}

/** The standing pose at `speed`, gait clock `phase`, `alert` 0..1 (head up), `bite` 0..1 (lunge). */
export function dogPose(speed: number, phase: number, alert: number, bite: number, out: DogPose): DogPose {
  const amp = dogGaitAmp(speed);
  out.bodyY = DOG_BODY_Y + Math.abs(Math.cos(phase)) * amp * 0.04;
  out.swing = Math.sin(phase) * amp;
  out.headPitch = -0.25 * alert + 0.35 * bite + Math.sin(phase * 0.5) * 0.04;
  out.headZ = DOG_HEAD_Z + bite * DOG_BITE_REACH;
  out.tail = Math.sin(phase * 1.3 + 1) * (0.25 + 0.3 * alert);
  return out;
}

export interface DogHeadOut {
  x: number;
  y: number;
  z: number;
}

/**
 * The dog's head hit volume centre (world) standing at feet `pos`, facing `yaw` (Babylon rotation.y: forward is
 * (sin yaw, 0, cos yaw)), moving at `speed` m/s, gait clock `phase`, `alert` 0..1, `bite` 0..1. Writes and returns
 * `out` (no allocation). `alert` only pitches the skull about the pivot: kept as an input so the drawn pose and the
 * volume take the same arguments.
 */
export function dogHead<T extends DogHeadOut>(pos: Readonly<DogHeadOut>, yaw: number, speed: number, phase: number, alert: number, bite: number, out: T): T {
  void alert;
  const bodyY = DOG_BODY_Y + Math.abs(Math.cos(phase)) * dogGaitAmp(speed) * 0.04;
  const fwd = DOG_HEAD_Z + bite * DOG_BITE_REACH;
  const x = pos.x + Math.sin(yaw) * fwd;
  const y = pos.y + bodyY + DOG_HEAD_UP + DOG_HEAD_LIFT;
  const z = pos.z + Math.cos(yaw) * fwd;
  out.x = x;
  out.y = y;
  out.z = z;
  return out;
}
