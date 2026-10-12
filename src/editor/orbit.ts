/**
 * The level editor's builder (orbit) camera for the controller (ED3-1): the camera circles a target point on the
 * editing floor. The target is the pad's dot. Pure and Babylon-free (tests/editor/orbit.test.ts); controls.ts sets the
 * camera from it each frame. Angles follow controls.ts: yaw 0 looks north (+z), pitch > 0 looks down.
 */
import { hyp2, hyp3 } from '../core/mathx';

/**
 * Editor defaults, every camera-feel number in one place (ON0b decision 1); Michael tunes them after his pad test.
 * The field of view is 1.0 rad, so at 16:9 the screen is about 1.94 x the distance across: PAN 1.3 pans one screen
 * width in about 1.5 s at full stick.
 */
export const ORBIT = {
  /** Zoom distance, metres: 25 is the old overlook default, 140 sees the whole 110 x 80 m site. */
  DIST_MIN: 4,
  DIST_MAX: 140,
  DIST_START: 25,
  /** Tilt limits, radians (about 20 to 89 degrees); the top is the fly camera's pitch clamp. */
  PITCH_MIN: 0.35,
  PITCH_MAX: 1.55,
  /** Pan speed at full stick: this many times the distance, per second. */
  PAN: 1.3,
  /** Orbit (turn) and tilt, radians per second at full stick: separate from the pan. */
  ORBIT_RATE: 1.8,
  TILT_RATE: 1.1,
  /** Zoom: the distance changes by this fraction per second at full trigger. */
  ZOOM_RATE: 1.5,
  /** LB + right stick up / down: the camera rises or drops this many times the distance per second, no tilt. */
  RISE: 0.6,
  /** Radial dead zone on both sticks (Settings > Dead zone changes it), then an exponent-2 response curve. */
  DEAD: 0.15,
  CURVE: 2,
  /** Pan, orbit, tilt, zoom and rise ease in over this many seconds per Smoothing setting... */
  EASE: { low: 0.12, medium: 0.25, high: 0.4 },
  /** ...and stop in this share of it (never past zero, so no overshoot). */
  STOP_SHARE: 0.5,
  /** LB held: pan, orbit and zoom at this share of their speed. */
  PRECISION: 0.3,
  /** Eases, seconds. */
  EASE_LEVEL: 0.25,
  EASE_TOP: 0.3,
  EASE_GO: 0.3,
  /** Entering: a centre ray that misses, or hits further than this, uses the point AHEAD metres along the yaw. */
  FAR: 140,
  AHEAD: 25,
} as const;

export type Smoothing = keyof typeof ORBIT.EASE;

/** The pad settings the orbit camera reads (padControl copies them in from Hub > Settings). */
export interface OrbitTune {
  dead: number;
  smoothing: Smoothing;
  /** Pan and orbit speed multipliers (Settings > Pan speed, Orbit speed). */
  pan: number;
  orbit: number;
}

/** A stick after the radial dead zone and the response curve: 0 inside the dead zone, full at the rim, direction kept. */
export function shapeStick(x: number, y: number, dead: number, curve: number = ORBIT.CURVE): [number, number] {
  const m = hyp2(x, y);
  if (m <= dead || m < 1e-9) return [0, 0];
  const n = Math.min(1, (m - dead) / (1 - dead));
  const k = n ** curve / m;
  return [x * k, y * k];
}

/** Moves v toward target: up to full in `ease` seconds, back toward zero in STOP_SHARE of that; never past target. */
export function approach(v: number, target: number, dt: number, ease: number): number {
  if (ease <= 0) return target;
  const stopping = Math.abs(target) < Math.abs(v) || Math.sign(target) * Math.sign(v) < 0;
  const step = dt / (ease * (stopping ? ORBIT.STOP_SHARE : 1));
  return v < target ? Math.min(target, v + step) : Math.max(target, v - step);
}

export interface OrbitState {
  tx: number;
  tz: number;
  floorY: number;
  dist: number;
  yaw: number;
  pitch: number;
}

export interface OrbitInput {
  /** Left stick: x right, y forward (-1..1). */
  panX: number;
  panY: number;
  /** Right stick: x orbits right, y tilts (up looks up, as the fly camera). */
  orbitX: number;
  tiltY: number;
  /** RT minus LT: positive zooms in. */
  zoom: number;
  precision: boolean;
  /** LB + right stick y: positive raises the camera (no tilt). */
  rise?: number;
  /** Pan scale (the magnet slows the pan near a snap point). */
  panScale?: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
/** The shortest signed turn from a to b. */
const turn = (a: number, b: number): number => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const smooth = (t: number): number => t * t * (3 - 2 * t);

export const clampDist = (d: number): number => clamp(d, ORBIT.DIST_MIN, ORBIT.DIST_MAX);
export const clampPitch = (p: number): number => clamp(p, ORBIT.PITCH_MIN, ORBIT.PITCH_MAX);

/** Camera position for an orbit state: back from the target along the view direction. */
export function orbitPosition(s: OrbitState): [number, number, number] {
  const c = Math.cos(s.pitch);
  return [s.tx - Math.sin(s.yaw) * c * s.dist, s.floorY + Math.sin(s.pitch) * s.dist, s.tz - Math.cos(s.yaw) * c * s.dist];
}

/**
 * Orbit state from a fly pose (decision 2): the target is the centre ray's hit on the editing floor, or AHEAD metres
 * along the yaw when it misses or is too far. Yaw and pitch stay (pitch within its limits).
 */
export function orbitFromPose(pos: readonly [number, number, number], yaw: number, pitch: number, floorY: number, hit: readonly [number, number] | null): OrbitState {
  const far = !hit || hyp3(hit[0] - pos[0], floorY - pos[1], hit[1] - pos[2]) > ORBIT.FAR;
  const [tx, tz] = far ? [pos[0] + Math.sin(yaw) * ORBIT.AHEAD, pos[2] + Math.cos(yaw) * ORBIT.AHEAD] : hit;
  const dist = clampDist(hyp3(tx - pos[0], floorY - pos[1], tz - pos[2]));
  return { tx, tz, floorY, dist, yaw, pitch: clampPitch(pitch) };
}

/** Raises (dh > 0) or lowers the camera by dh metres without tilting: the camera keeps its x, z and the target slides along the view. */
export function raiseCamera(s: OrbitState, dh: number): void {
  const sp = Math.sin(s.pitch);
  if (sp < 1e-6) return;
  const d1 = clampDist(s.dist + dh / sp);
  const along = Math.cos(s.pitch) * (d1 - s.dist);
  s.tx += Math.sin(s.yaw) * along;
  s.tz += Math.cos(s.yaw) * along;
  s.dist = d1;
}

/**
 * One frame of shaped, eased input (decision 4; ON0b: linear here, the curve and the ease are in OrbitCam.input);
 * mutates s. `pan` and `orbit` are the Settings speed multipliers.
 */
export function orbitInput(s: OrbitState, i: OrbitInput, dt: number, pan = 1, orbit = 1): void {
  const k = i.precision ? ORBIT.PRECISION : 1;
  const v = ORBIT.PAN * s.dist * k * pan * dt;
  const fx = Math.sin(s.yaw);
  const fz = Math.cos(s.yaw);
  // forward on the floor is (fx, fz); right is (fz, -fx)
  s.tx += (fx * i.panY + fz * i.panX) * v;
  s.tz += (fz * i.panY - fx * i.panX) * v;
  s.yaw += i.orbitX * ORBIT.ORBIT_RATE * k * orbit * dt;
  s.pitch = clampPitch(s.pitch - i.tiltY * ORBIT.TILT_RATE * k * orbit * dt);
  s.dist = clampDist(s.dist * Math.exp(-i.zoom * ORBIT.ZOOM_RATE * k * dt));
  if (i.rise) raiseCamera(s, i.rise * ORBIT.RISE * s.dist * dt);
}

type Field = 'tx' | 'tz' | 'floorY' | 'yaw' | 'pitch';
interface Ease {
  field: Field;
  from: number;
  to: number;
  t: number;
  dur: number;
}

/** The orbit camera: state, its eases and the top-down swap. */
export class OrbitCam {
  s: OrbitState = { tx: 0, tz: 0, floorY: 0, dist: ORBIT.DIST_START, yaw: 0, pitch: 0.9 };
  /** The view before the top-down swap; null when not top-down. */
  saved: { yaw: number; pitch: number } | null = null;
  private eases: Ease[] = [];
  /** Dead zone, smoothing and speeds (Hub > Settings). */
  tune: OrbitTune = { dead: ORBIT.DEAD, smoothing: 'medium', pan: 1, orbit: 1 };
  /** The eased input now (stick units after the curve). */
  readonly vel = { panX: 0, panY: 0, orbitX: 0, tiltY: 0, zoom: 0, rise: 0 };

  get topDown(): boolean {
    return this.saved !== null;
  }

  enter(s: OrbitState): void {
    this.s = { ...s };
    this.saved = null;
    this.eases = [];
    this.stop();
  }

  /** Drops the eased input at once (a walk, a swap). */
  stop(): void {
    const v = this.vel;
    v.panX = v.panY = v.orbitX = v.tiltY = v.zoom = v.rise = 0;
  }

  snapshot(): OrbitState {
    return { ...this.s };
  }

  private ease(field: Field, to: number, dur: number): void {
    this.eases = this.eases.filter((e) => e.field !== field);
    const from = field === 'yaw' ? to - turn(this.s.yaw, to) : this.s[field];
    this.eases.push({ field, from, to, t: 0, dur });
  }

  /**
   * Raw stick input (ON0b): radial dead zone and response curve, then eased toward (no overshoot). Moving the right
   * stick while top-down forgets the saved view; panning stops a go-to ease.
   */
  input(i: OrbitInput, dt: number): void {
    const t = this.tune;
    const ease = ORBIT.EASE[t.smoothing];
    const [px, py] = shapeStick(i.panX, i.panY, t.dead);
    const [ox, oy] = shapeStick(i.orbitX, i.tiltY, t.dead);
    const rise = shapeStick(0, i.rise ?? 0, t.dead)[1];
    const zoom = Math.sign(i.zoom) * i.zoom * i.zoom;
    const ps = i.panScale ?? 1;
    const v = this.vel;
    v.panX = approach(v.panX, px * ps, dt, ease);
    v.panY = approach(v.panY, py * ps, dt, ease);
    v.orbitX = approach(v.orbitX, ox, dt, ease);
    v.tiltY = approach(v.tiltY, oy, dt, ease);
    v.zoom = approach(v.zoom, zoom, dt, ease);
    v.rise = approach(v.rise, rise, dt, ease);
    if (px || py || rise) this.eases = this.eases.filter((e) => e.field !== 'tx' && e.field !== 'tz');
    if (ox || oy || rise) {
      this.saved = null;
      this.eases = this.eases.filter((e) => e.field !== 'yaw' && e.field !== 'pitch');
    }
    orbitInput(this.s, { panX: v.panX, panY: v.panY, orbitX: v.orbitX, tiltY: v.tiltY, zoom: v.zoom, rise: v.rise, precision: i.precision }, dt, t.pan, t.orbit);
  }

  /** Level change: the floor eases to the new level's view floor (decision 6). */
  setFloor(y: number): void {
    this.ease('floorY', y, ORBIT.EASE_LEVEL);
  }

  /** Go to a point (decision 12), keeping yaw, pitch and zoom. */
  goTo(x: number, z: number, floorY: number): void {
    this.ease('tx', x, ORBIT.EASE_GO);
    this.ease('tz', z, ORBIT.EASE_GO);
    this.ease('floorY', floorY, ORBIT.EASE_GO);
  }

  /** Top-down swap (decision 7): ease to straight down, north up; again restores the view before. */
  toggleTopDown(): void {
    const back = this.saved;
    if (back) {
      this.saved = null;
      this.ease('yaw', back.yaw, ORBIT.EASE_TOP);
      this.ease('pitch', back.pitch, ORBIT.EASE_TOP);
      return;
    }
    this.saved = { yaw: this.s.yaw, pitch: this.s.pitch };
    this.ease('yaw', 0, ORBIT.EASE_TOP);
    this.ease('pitch', ORBIT.PITCH_MAX, ORBIT.EASE_TOP);
  }

  /** Advances the eases. */
  update(dt: number): void {
    for (const e of this.eases) {
      e.t = Math.min(e.dur, e.t + dt);
      this.s[e.field] = e.from + (e.to - e.from) * smooth(e.dur > 0 ? e.t / e.dur : 1);
    }
    this.eases = this.eases.filter((e) => e.t < e.dur);
  }

  position(): [number, number, number] {
    return orbitPosition(this.s);
  }
}

/** A camera pose for the walk test's swap (ED2 Part B): position, angles as controls.ts, field of view. */
export interface CamPose {
  pos: [number, number, number];
  yaw: number;
  pitch: number;
  fov: number;
}

/** Yaw and pitch (controls.ts convention) of a camera at `pos` looking at `target`. */
export function poseAngles(pos: readonly number[], target: readonly number[]): [yaw: number, pitch: number] {
  const dx = target[0]! - pos[0]!;
  const dy = target[1]! - pos[1]!;
  const dz = target[2]! - pos[2]!;
  return [Math.atan2(dx, dz), Math.atan2(-dy, Math.sqrt(dx * dx + dz * dz))];
}

/** The pose `t` (0..1, eased) of the way from a to b; yaw takes the short way round. */
export function blendPose(a: CamPose, b: CamPose, t: number): CamPose {
  const k = smooth(clamp(t, 0, 1));
  const lerp = (p: number, q: number): number => p + (q - p) * k;
  return { pos: [lerp(a.pos[0], b.pos[0]), lerp(a.pos[1], b.pos[1]), lerp(a.pos[2], b.pos[2])], yaw: a.yaw + turn(a.yaw, b.yaw) * k, pitch: lerp(a.pitch, b.pitch), fov: lerp(a.fov, b.fov) };
}
