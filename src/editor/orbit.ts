/**
 * The level editor's builder (orbit) camera for the controller (ED3-1): the camera circles a target point on the
 * editing floor. The target is the pad's dot. Pure and Babylon-free (tests/editor/orbit.test.ts); controls.ts sets the
 * camera from it each frame. Angles follow controls.ts: yaw 0 looks north (+z), pitch > 0 looks down.
 */
import { hyp3 } from '../core/mathx';

/** Editor defaults; Michael tunes them after his pad test (docs/kestrel/prompts/ED3-1.md section 2). */
export const ORBIT = {
  /** Zoom distance, metres: 25 is the old overlook default, 140 sees the whole 110 x 80 m site. */
  DIST_MIN: 4,
  DIST_MAX: 140,
  DIST_START: 25,
  /** Tilt limits, radians (about 20 to 89 degrees); the top is the fly camera's pitch clamp. */
  PITCH_MIN: 0.35,
  PITCH_MAX: 1.55,
  /** Pan speed at full stick: this many times the distance, per second. */
  PAN: 0.9,
  /** Orbit and tilt, radians per second at full stick (squared), as the fly camera's look rate. */
  ORBIT_RATE: 2.4,
  /** Zoom: the distance changes by this fraction per second at full trigger (squared). */
  ZOOM_RATE: 1.5,
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
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const sq = (v: number): number => Math.sign(v) * v * v;
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

/** One frame of stick and trigger input (decision 4); mutates s. */
export function orbitInput(s: OrbitState, i: OrbitInput, dt: number): void {
  const k = i.precision ? ORBIT.PRECISION : 1;
  const v = ORBIT.PAN * s.dist * k * dt;
  const fx = Math.sin(s.yaw);
  const fz = Math.cos(s.yaw);
  // forward on the floor is (fx, fz); right is (fz, -fx)
  s.tx += (fx * i.panY + fz * i.panX) * v;
  s.tz += (fz * i.panY - fx * i.panX) * v;
  s.yaw += sq(i.orbitX) * ORBIT.ORBIT_RATE * k * dt;
  s.pitch = clampPitch(s.pitch - sq(i.tiltY) * ORBIT.ORBIT_RATE * 0.7 * k * dt);
  s.dist = clampDist(s.dist * Math.exp(-sq(i.zoom) * ORBIT.ZOOM_RATE * k * dt));
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

  get topDown(): boolean {
    return this.saved !== null;
  }

  enter(s: OrbitState): void {
    this.s = { ...s };
    this.saved = null;
    this.eases = [];
  }

  snapshot(): OrbitState {
    return { ...this.s };
  }

  private ease(field: Field, to: number, dur: number): void {
    this.eases = this.eases.filter((e) => e.field !== field);
    const from = field === 'yaw' ? to - turn(this.s.yaw, to) : this.s[field];
    this.eases.push({ field, from, to, t: 0, dur });
  }

  /** Stick input; moving the right stick while top-down forgets the saved view; panning stops a go-to ease. */
  input(i: OrbitInput, dt: number): void {
    if (i.panX || i.panY) this.eases = this.eases.filter((e) => e.field !== 'tx' && e.field !== 'tz');
    if (i.orbitX || i.tiltY) {
      this.saved = null;
      this.eases = this.eases.filter((e) => e.field !== 'yaw' && e.field !== 'pitch');
    }
    orbitInput(this.s, i, dt);
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
