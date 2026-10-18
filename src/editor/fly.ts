/**
 * The level editor's free-fly camera (Michael 2026-10-14, Hub > Settings > Camera: Free fly, the default; Orbit is the
 * ground-target builder camera of orbit.ts). Mouse and keys: right button held looks, W A S D move along the view, Q / E
 * down / up, Shift fast, the wheel sets the fly speed. Pad: the left stick moves, the right stick looks, RT / LT up /
 * down, LB slow, with the camera table's dead zone, curve, smoothing and rates (ORBIT in orbit.ts). Pure and
 * Babylon-free (tests/editor/fly.test.ts). Angles as controls.ts: yaw 0 looks north (+z), pitch > 0 looks down.
 */
import { approach, ORBIT, shapeStick } from './orbit';
import type { OrbitTune } from './orbit';

/** Fly numbers, editor defaults (Michael tunes them). */
export const FLY = {
  /** Fly speed, m/s: the start, the wheel's limits and its step (a factor per notch). */
  SPEED: 10,
  SPEED_MIN: 2,
  SPEED_MAX: 60,
  WHEEL: 1.25,
  /** Shift held (keys): this many times the speed. */
  FAST: 3.5,
  /** Look limit, radians (straight down is the plan view). */
  PITCH: 1.55,
  /** Mouse look, radians per pixel. */
  MOUSE: 0.004,
} as const;

export interface FlyPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

/** Raw pad input for one frame. */
export interface FlyPadIn {
  /** Left stick: x right, y forward (-1..1). */
  moveX: number;
  moveY: number;
  /** Right stick: x turns right, y looks up. */
  lookX: number;
  lookY: number;
  /** RT minus LT: positive rises. */
  rise: number;
  /** LB held: everything at ORBIT.PRECISION. */
  slow: boolean;
}

/** The eased pad input (stick units after the dead zone and the curve). */
export interface FlyVel {
  mx: number;
  my: number;
  lx: number;
  ly: number;
  up: number;
}

export const flyVel = (): FlyVel => ({ mx: 0, my: 0, lx: 0, ly: 0, up: 0 });

const clampPitch = (p: number): number => Math.max(-FLY.PITCH, Math.min(FLY.PITCH, p));

/** Unit view direction [x, y, z] for yaw and pitch. */
export function flyForward(yaw: number, pitch: number): [number, number, number] {
  const c = Math.cos(pitch);
  return [Math.sin(yaw) * c, -Math.sin(pitch), Math.cos(yaw) * c];
}

/**
 * One move: `fwd` along the view (pitch included, as W), `side` to the right on the level, `up` straight up, each -1..1,
 * at `speed` m/s for dt seconds. Mutates p.
 */
export function flyMove(p: FlyPose, fwd: number, side: number, up: number, speed: number, dt: number): void {
  const v = speed * dt;
  const f = flyForward(p.yaw, p.pitch);
  const rx = Math.cos(p.yaw);
  const rz = -Math.sin(p.yaw);
  p.x += (f[0] * fwd + rx * side) * v;
  p.y += (f[1] * fwd + up) * v;
  p.z += (f[2] * fwd + rz * side) * v;
}

/** Mouse look by a pixel drag. Mutates p. */
export function flyLook(p: FlyPose, dxPx: number, dyPx: number): void {
  p.yaw += dxPx * FLY.MOUSE;
  p.pitch = clampPitch(p.pitch + dyPx * FLY.MOUSE);
}

/** The fly speed after a wheel turn (deltaY < 0 is away from the user: faster), within its limits. */
export function wheelSpeed(speed: number, deltaY: number): number {
  if (!deltaY) return speed;
  const k = deltaY < 0 ? FLY.WHEEL : 1 / FLY.WHEEL;
  return Math.max(FLY.SPEED_MIN, Math.min(FLY.SPEED_MAX, +(speed * k).toFixed(2)));
}

/**
 * One pad frame: the radial dead zone and the response curve (ORBIT.DEAD, CURVE; Settings > Dead zone), eased toward
 * (Settings > Smoothing, never past zero), then the move at `speed` x Pan speed and the look at the orbit camera's turn
 * and tilt rates x Orbit speed. LB slows all of it to ORBIT.PRECISION. `invert` flips the look's up / down. Mutates p, v.
 */
export function flyPad(p: FlyPose, v: FlyVel, i: FlyPadIn, dt: number, tune: OrbitTune, speed: number, invert = false): void {
  const ease = ORBIT.EASE[tune.smoothing];
  const [mx, my] = shapeStick(i.moveX, i.moveY, tune.dead);
  const [lx, ly] = shapeStick(i.lookX, i.lookY, tune.dead);
  const up = Math.sign(i.rise) * i.rise * i.rise;
  v.mx = approach(v.mx, mx, dt, ease);
  v.my = approach(v.my, my, dt, ease);
  v.lx = approach(v.lx, lx, dt, ease);
  v.ly = approach(v.ly, invert ? -ly : ly, dt, ease);
  v.up = approach(v.up, up, dt, ease);
  const k = i.slow ? ORBIT.PRECISION : 1;
  p.yaw += v.lx * ORBIT.ORBIT_RATE * k * tune.orbit * dt;
  p.pitch = clampPitch(p.pitch - v.ly * ORBIT.TILT_RATE * k * tune.orbit * dt);
  flyMove(p, v.my, v.mx, v.up, speed * k * tune.pan, dt);
}

/**
 * Go to a point (RB, bookmarks' neighbours, Find, the problem list): the camera keeps its yaw, looks down at least
 * `minPitch`, and stands back `dist` metres from the point along the view, so the aim lands on it.
 */
export function flyGoTo(from: FlyPose, x: number, y: number, z: number, dist: number, minPitch = ORBIT.PITCH_MIN): FlyPose {
  const pitch = Math.max(minPitch, Math.min(ORBIT.PITCH_MAX, from.pitch));
  const f = flyForward(from.yaw, pitch);
  return { x: x - f[0] * dist, y: y - f[1] * dist, z: z - f[2] * dist, yaw: from.yaw, pitch };
}
