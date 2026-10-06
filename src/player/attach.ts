import type { AttachCamera } from '../config/camera';
import { anchorLength, ductPoint, hangPoint, HANG, type Anchor, type AttachEntry, type Duct, type Ledge, type P3 } from '../world/anchors';
import { hyp2 } from '../core/mathx';
/**
 * Attached locomotion (pure: no Babylon/DOM), unit-tested.
 *
 * The state machine for moving while attached to a traversal anchor: on a ladder, on a vertical or
 * horizontal pipe, hanging from a ledge, crawling in a duct, riding a zipline. It sits alongside the
 * committed moves in `TraversalController` (step, vault, mantle, drop, hop). Each state owns its input
 * mapping (the stick along the anchor's axis), its root-motion path (`attachPose`), a camera framing preset,
 * its enter / exit transition times and which actions are allowed (sidearm aim, takedowns, drop, gadgets).
 *
 * Phases: enter (blend from where the body was onto the anchor) -> on (moving along it) -> exit (blend off,
 * to the floor / the top / a drop / another anchor). Moving is velocity based with a capped acceleration
 * and a first-frame response, so pushing the stick moves the body on the very next step.
 */

export type AttachKind = 'ladder' | 'pipeV' | 'pipeH' | 'ledge' | 'duct' | 'zipline';
export type AttachPhase = 'enter' | 'on' | 'exit';
/** Why an attached state ended: stepped off the bottom / top, climbed up, dropped, jumped to another anchor,
 *  reached the end (duct / zipline), was hit, or the anchor went away. */
export type ExitReason = 'bottom' | 'top' | 'climb' | 'drop' | 'jump' | 'end' | 'damage' | 'gone';

export interface AttachAllow {
  /** Aim and fire a sidearm one-handed. */
  sidearm: boolean;
  takedown: boolean;
  drop: boolean;
  /** Traverse (climb up / jump across) while attached. */
  traverse: boolean;
  gadgets: boolean;
}

export interface AttachSpec {
  /** How the stick maps onto the anchor: up/down the climb, along the anchor's tangent (camera relative),
   *  forward along a path, or no input (zipline). */
  axis: 'vertical' | 'along' | 'path' | 'auto';
  /** Top speed along the axis at full input (m/s) and its acceleration (m/s^2). */
  speed: number;
  accel: number;
  /** Input below this is ignored (prevents creeping). */
  dead: number;
  /** Enter / exit transition times (s). */
  enter: number;
  exit: number;
  camera: AttachCamera;
  allow: AttachAllow;
  /** The weapon goes to its carry slot (both hands busy). */
  holster: boolean;
}

/** Ladders climb at this many rungs per second (the hand / foot cadence matches it). */
export const LADDER_RUNG_RATE = 1.6;
/** Ladders: hold drop to slide down this fast (m/s). */
export const LADDER_SLIDE = 4.5;
/** Vertical pipe: hold down + traverse to slide (m/s). */
export const PIPE_SLIDE = 3.2;
/** Zipline top speed (m/s) and how fast it builds. */
export const ZIP_SPEED = 6;
export const ZIP_ACCEL = 2.4;

const NO: AttachAllow = { sidearm: false, takedown: false, drop: true, traverse: true, gadgets: false };

export const ATTACH: Record<AttachKind, AttachSpec> = {
  ladder: { axis: 'vertical', speed: LADDER_RUNG_RATE * 0.3, accel: 6, dead: 0.25, enter: 0.35, exit: 0.45, camera: 'ladder', allow: { ...NO }, holster: true },
  pipeV: { axis: 'vertical', speed: 0.9, accel: 6, dead: 0.25, enter: 0.35, exit: 0.45, camera: 'pipe', allow: { ...NO, takedown: true }, holster: true },
  pipeH: { axis: 'along', speed: 1.0, accel: 6, dead: 0.25, enter: 0.3, exit: 0.35, camera: 'pipeH', allow: { ...NO, sidearm: true, takedown: true }, holster: true },
  ledge: { axis: 'along', speed: 1.2, accel: 8, dead: 0.25, enter: 0.3, exit: 0.4, camera: 'hang', allow: { ...NO, sidearm: true, takedown: true }, holster: true },
  duct: { axis: 'path', speed: 0.9, accel: 6, dead: 0.2, enter: 0.45, exit: 0.45, camera: 'duct', allow: { ...NO, takedown: true, gadgets: true }, holster: true },
  zipline: { axis: 'auto', speed: ZIP_SPEED, accel: ZIP_ACCEL, dead: 0, enter: 0.3, exit: 0.3, camera: 'zipline', allow: { ...NO, sidearm: true, takedown: true, traverse: false }, holster: true },
};

/** Which attached state an anchor puts the player in (null: not an attached anchor). */
export function attachKindOf(a: Anchor): AttachKind | null {
  switch (a.kind) {
    case 'ladder':
    case 'pipeV':
    case 'pipeH':
    case 'ledge':
    case 'duct':
    case 'zipline':
      return a.kind;
    default:
      return null;
  }
}

/** Travel range along an anchor (m): feet height above the base for climbs, span otherwise. */
export function attachRange(a: Anchor, height = 1.75): { min: number; max: number } {
  const len = anchorLength(a);
  switch (a.kind) {
    case 'ladder':
      // feet from the floor up until the hands reach over the top (then it steps off)
      return { min: 0, max: Math.max(0, len - height * 0.55) };
    case 'pipeV':
      return { min: 0, max: Math.max(0, len - height * 1.05) };
    case 'ledge': {
      const m = Math.min(0.25, len / 2);
      return { min: m, max: len - m };
    }
    case 'pipeH':
      // the hands stay clear of whatever holds the pipe up at its ends
      return { min: Math.min(0.45, len / 2), max: Math.max(Math.min(0.45, len / 2), len - 0.45) };
    default:
      return { min: 0, max: len };
  }
}

/**
 * Stick -> signed input along the anchor (-1..1). `stickX/stickY` are the move stick (x right, y forward)
 * and `camYaw` the camera heading: 'vertical' climbs with the stick forward (up) / back (down); 'along'
 * projects the camera-relative stick onto the anchor's tangent; 'path' onto the duct's travel direction
 * at `s`; 'auto' ignores it.
 */
export function axisInput(a: Anchor, spec: AttachSpec, stickX: number, stickY: number, camYaw: number, s = 0): number {
  if (spec.axis === 'auto') return 0;
  const mag = hyp2(stickX, stickY);
  if (mag < spec.dead) return 0;
  if (spec.axis === 'vertical') return Math.max(-1, Math.min(1, stickY));
  // camera-relative world wish direction (forward = (sin yaw, cos yaw), right = (cos yaw, -sin yaw))
  const c = Math.cos(camYaw);
  const sn = Math.sin(camYaw);
  const wx = stickX * c + stickY * sn;
  const wz = -stickX * sn + stickY * c;
  let tx = 0;
  let tz = 0;
  if (a.kind === 'ledge') {
    tx = a.tx;
    tz = a.tz;
  } else if (a.kind === 'pipeH' || a.kind === 'zipline') {
    const l = hyp2(a.b.x - a.a.x, a.b.z - a.a.z) || 1;
    tx = (a.b.x - a.a.x) / l;
    tz = (a.b.z - a.a.z) / l;
  } else if (a.kind === 'duct') {
    const p = ductPoint(a, s, tmpDuct);
    tx = p.dx;
    tz = p.dz;
  }
  const v = wx * tx + wz * tz;
  return Math.max(-1, Math.min(1, v));
}
const tmpDuct: P3 & { dx: number; dz: number } = { x: 0, y: 0, z: 0, dx: 0, dz: 1 };

export interface AttachPose {
  /** Feet position and body facing. */
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/** Ladder / pipe standoff from the climbing line to the body's root (m): a drainpipe hugs the wall, so the body
 *  keeps a little further off it (bent knees clear the face). */
export const CLIMB_STANDOFF = 0.28;
export const PIPE_STANDOFF = 0.34;

/** Root-motion path: feet and facing at parameter `s` along the anchor. `face` (+1 / -1) picks which way a
 *  body faces along a pipe / zipline / duct (set at entry). Writes into `out`. */
export function attachPose(a: Anchor, s: number, face: number, height: number, out: AttachPose): AttachPose {
  const k = height / 1.75;
  switch (a.kind) {
    case 'ladder':
    case 'pipeV': {
      const yaw = a.kind === 'ladder' ? a.facing : a.side;
      out.yaw = yaw;
      const off = a.kind === 'ladder' ? CLIMB_STANDOFF : PIPE_STANDOFF;
      out.x = a.base.x - Math.sin(yaw) * off * k;
      out.z = a.base.z - Math.cos(yaw) * off * k;
      out.y = a.base.y + s;
      return out;
    }
    case 'ledge':
      hangPoint(a as Ledge, s, height, out);
      return out;
    case 'pipeH': {
      const l = hyp2(a.b.x - a.a.x, a.b.z - a.a.z) || 1;
      const tx = (a.b.x - a.a.x) / l;
      const tz = (a.b.z - a.a.z) / l;
      out.x = a.a.x + tx * s;
      out.z = a.a.z + tz * s;
      out.y = a.hangHeight - HANG.drop * k;
      // hanging side-on to the pipe: facing across it (moving along it is a sideways shimmy)
      out.yaw = Math.atan2(tz * face, -tx * face);
      return out;
    }
    case 'zipline': {
      const l = hyp2(a.b.x - a.a.x, a.b.z - a.a.z) || 1;
      const t = Math.max(0, Math.min(1, s / l));
      out.x = a.a.x + (a.b.x - a.a.x) * t;
      out.z = a.a.z + (a.b.z - a.a.z) * t;
      out.y = a.a.y + (a.b.y - a.a.y) * t - HANG.drop * k;
      out.yaw = Math.atan2(a.b.x - a.a.x, a.b.z - a.a.z);
      return out;
    }
    case 'duct': {
      const p = ductPoint(a as Duct, s, tmpDuct);
      out.x = p.x;
      out.y = p.y;
      out.z = p.z;
      out.yaw = Math.atan2(p.dx * face, p.dz * face);
      return out;
    }
    default:
      out.x = out.y = out.z = out.yaw = 0;
      return out;
  }
}

/** Events from one update: reached an end of the travel range while pushing past it. */
export type AttachEdge = 'none' | 'min' | 'max';

/**
 * Attached-state machine. `enter` starts the blend onto an anchor, `update` moves along it from the axis
 * input, `beginExit` blends off. The caller (TraversalController) turns its state into a kinematic path,
 * rig hand / foot targets, camera framing and the action gates.
 */
export class AttachMachine {
  kind: AttachKind | 'none' = 'none';
  phase: AttachPhase = 'on';
  anchor: Anchor | null = null;
  entry: AttachEntry = 'side';
  /** Time in the current phase (s) and its progress 0..1 (enter / exit). */
  t = 0;
  /** Parameter along the anchor (m) and its rate (m/s). */
  s = 0;
  v = 0;
  /** Facing sign along pipes / ziplines / ducts. */
  face = 1;
  /** Signed input along the axis last step (-1..1). */
  input = 0;
  exitReason: ExitReason | null = null;
  /** Distance travelled since entering (m): clocks the climb cadence (rungs, hand-over-hand). */
  travelled = 0;
  /** Body height (m) for the travel range. */
  height = 1.75;
  /** This entry's blend time (s): the spec's, or longer for a jump / lowering in from above. */
  enterDur = 0.3;
  /** This exit's blend time (s): the spec's, or a drop's fall time. */
  exitDur = 0.3;
  /** Steps spent at a range end while pushing past it (the caller exits on it). */
  edge: AttachEdge = 'none';
  private range = { min: 0, max: 0 };

  get active(): boolean {
    return this.kind !== 'none';
  }

  get spec(): AttachSpec | null {
    return this.kind === 'none' ? null : ATTACH[this.kind];
  }

  /** Enter progress 0..1 while entering, 1 after. Exit progress 0..1 while exiting. */
  get progress(): number {
    const sp = this.spec;
    if (!sp) return 0;
    if (this.phase === 'enter') return Math.min(1, this.t / this.enterDur);
    if (this.phase === 'exit') return Math.min(1, this.t / this.exitDur);
    return 1;
  }

  enter(a: Anchor, s0: number, entry: AttachEntry, face = 1, height = 1.75, speed = 0, enterTime?: number): boolean {
    const kind = attachKindOf(a);
    if (!kind) return false;
    this.enterDur = enterTime ?? ATTACH[kind].enter;
    this.kind = kind;
    this.anchor = a;
    this.entry = entry;
    this.phase = 'enter';
    this.t = 0;
    this.height = height;
    this.range = attachRange(a, height);
    this.s = Math.max(this.range.min, Math.min(this.range.max, s0));
    // a zipline keeps the run-up speed; everything else starts from rest
    this.v = kind === 'zipline' ? Math.min(ZIP_SPEED, Math.max(0, speed)) : 0;
    this.face = face >= 0 ? 1 : -1;
    this.input = 0;
    this.exitReason = null;
    this.travelled = 0;
    this.edge = 'none';
    return true;
  }

  /** Start blending off the anchor. */
  beginExit(reason: ExitReason, time?: number): void {
    if (this.kind === 'none' || this.phase === 'exit') return;
    this.exitDur = time ?? ATTACH[this.kind].exit;
    this.phase = 'exit';
    this.t = 0;
    this.exitReason = reason;
    this.v = reason === 'damage' ? 0 : this.v;
  }

  /** Done exiting: back to none. Returns the reason it ended. */
  finish(): ExitReason | null {
    const r = this.exitReason;
    this.kind = 'none';
    this.anchor = null;
    this.phase = 'on';
    this.t = 0;
    this.v = 0;
    this.edge = 'none';
    return r;
  }

  /**
   * Fixed step. `axis` is the signed input along the anchor (-1..1); `rate` overrides the top speed (a
   * slide). Moves `s`, clamps it to the travel range and reports when it is pressed against an end.
   */
  update(dt: number, axis: number, rate?: number): AttachEdge {
    const sp = this.spec;
    if (!sp || !this.anchor) return 'none';
    this.t += dt;
    if (this.phase === 'enter' && this.t >= this.enterDur) {
      this.phase = 'on';
      this.t = 0;
    }
    this.input = axis;
    let target: number;
    let accel = sp.accel;
    if (sp.axis === 'auto') {
      // zipline: gravity along the cable, capped
      target = this.phase === 'exit' ? this.v : ZIP_SPEED;
    } else {
      // a slight hold while still settling onto the anchor (the hands find their grips first)
      const gate = this.phase === 'enter' ? Math.min(1, this.t / (this.enterDur * 0.5)) : this.phase === 'exit' ? 0 : 1;
      target = axis * (rate ?? sp.speed) * gate;
      if (rate !== undefined) accel = Math.max(accel, rate * 6);
    }
    const dv = target - this.v;
    const maxDv = accel * dt;
    this.v += dv > maxDv ? maxDv : dv < -maxDv ? -maxDv : dv;
    const before = this.s;
    this.s += this.v * dt;
    this.edge = 'none';
    if (this.s <= this.range.min) {
      this.s = this.range.min;
      if (this.v < 0) this.v = 0;
      if (axis < -0.25 || (sp.axis === 'auto' && this.v < 0)) this.edge = 'min';
    } else if (this.s >= this.range.max) {
      this.s = this.range.max;
      if (sp.axis === 'auto') this.edge = 'max';
      else {
        if (this.v > 0) this.v = 0;
        if (axis > 0.25) this.edge = 'max';
      }
    }
    this.travelled += Math.abs(this.s - before);
    return this.edge;
  }

  /** Travel range of the current anchor. */
  get limits(): { min: number; max: number } {
    return this.range;
  }

  reset(): void {
    this.finish();
    this.exitReason = null;
  }
}

/** Climb cadence: which hand leads at a distance travelled (alternates every `stride` m) and the swing
 *  progress 0..1 within the current reach. */
export function climbCadence(travelled: number, stride: number): { lead: -1 | 1; swing: number } {
  const k = travelled / Math.max(1e-3, stride);
  const i = Math.floor(k);
  return { lead: i % 2 === 0 ? 1 : -1, swing: k - i };
}

/** Distance between two anchors' nearest points (m, 3D): ledge-to-ledge / pipe jumps pick targets within
 *  reach (<= 2.5 m) of the current grip. */
export function gapBetween(from: P3, to: Anchor, out: P3 = { x: 0, y: 0, z: 0 }): number {
  switch (to.kind) {
    case 'ledge': {
      const dx = to.b.x - to.a.x;
      const dz = to.b.z - to.a.z;
      const l2 = dx * dx + dz * dz;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((from.x - to.a.x) * dx + (from.z - to.a.z) * dz) / l2)) : 0;
      out.x = to.a.x + dx * t;
      out.z = to.a.z + dz * t;
      out.y = to.top;
      break;
    }
    case 'pipeV':
    case 'ladder':
      out.x = to.base.x;
      out.z = to.base.z;
      out.y = Math.max(to.base.y, Math.min(to.top.y, from.y));
      break;
    case 'pipeH': {
      const dx = to.b.x - to.a.x;
      const dz = to.b.z - to.a.z;
      const l2 = dx * dx + dz * dz;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((from.x - to.a.x) * dx + (from.z - to.a.z) * dz) / l2)) : 0;
      out.x = to.a.x + dx * t;
      out.z = to.a.z + dz * t;
      out.y = to.hangHeight;
      break;
    }
    default:
      return Infinity;
  }
  const dx = out.x - from.x;
  const dy = out.y - from.y;
  const dz = out.z - from.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
