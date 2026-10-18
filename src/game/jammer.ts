/**
 * The held pistol jammer, the laser device and the camera pocket (CT prototype B3, DECISIONS G152 / G125). Pure (no
 * Babylon / DOM), unit-tested. Every number is a prototype starting value (G10).
 *
 * The jammer: drawn pistol, hold the secondary trigger on one camera, laser or light. While held, charged and the
 * player stands still the target is blind / off. The charge drains while jamming and refills when released.
 */
import { hyp2, hyp3 } from '../core/mathx';

export const JAMMER = {
  /** Charge (s of jamming) from full; one report of CT's gives about 20 s on a drone. */
  chargeMax: 20,
  /** Charge lost per second of jamming. */
  drain: 1,
  /** Charge regained per second while not jamming. */
  refill: 1.5,
  /** Charge needed to start (or restart after running dry): no stuttering on the last drop. */
  minStart: 1.5,
  /** Horizontal speed (m/s) above which the player is moving and the jam breaks. */
  stillSpeed: 0.45,
  /** Reach to a target (m). */
  range: 20,
  /** Aim cone half-angle (rad) a target must sit inside to be picked (about 9 deg). */
  cone: 0.16,
  /** A client's intent is dropped after this long without a heartbeat (s); the client sends every `heartbeat`. */
  stale: 0.7,
  heartbeat: 0.25,
} as const;

/** One player's jammer. */
export interface JamState {
  charge: number;
  active: boolean;
}

export function newJam(): JamState {
  return { charge: JAMMER.chargeMax, active: false };
}

/**
 * One step: `want` = the trigger is held on a valid target, `speed` the player's horizontal speed (m/s). Returns true
 * while the jam is on. Moving, releasing or running dry ends it; starting needs `minStart` charge.
 */
export function stepJam(s: JamState, want: boolean, speed: number, dt: number): boolean {
  const still = speed <= JAMMER.stillSpeed;
  const ok = want && still && (s.active ? s.charge > 0 : s.charge >= JAMMER.minStart);
  if (ok) {
    s.active = true;
    s.charge = Math.max(0, s.charge - JAMMER.drain * dt);
    if (s.charge <= 0) s.active = false;
  } else {
    s.active = false;
    s.charge = Math.min(JAMMER.chargeMax, s.charge + JAMMER.refill * dt);
  }
  return s.active;
}

/** A thing the jammer can be pointed at. */
export interface JamTarget {
  id: string;
  kind: 'camera' | 'laser' | 'light';
  x: number;
  y: number;
  z: number;
}

/**
 * The target nearest the aim line: inside `range` and the `cone` around the unit direction (dx, dy, dz) from the eye
 * (ox, oy, oz). Returns its index in `targets`, or -1.
 */
export function pickJamTarget(
  targets: readonly JamTarget[],
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  range: number = JAMMER.range,
  cone: number = JAMMER.cone,
): number {
  let best = -1;
  let bestA = cone;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]!;
    const vx = t.x - ox;
    const vy = t.y - oy;
    const vz = t.z - oz;
    const d = hyp3(vx, vy, vz);
    if (d > range || d < 0.05) continue;
    const dot = (vx * dx + vy * dy + vz * dz) / d;
    const a = Math.acos(Math.max(-1, Math.min(1, dot)));
    if (a < bestA) {
      bestA = a;
      best = i;
    }
  }
  return best;
}

/** A laser device: beams across a plan segment (x1, z1) - (x2, z2) at the listed heights above `floorY`. */
export interface LaserDef {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  /** Beam heights above the floor (m). */
  ys: number[];
  floorY?: number;
  /** Label for the radio line when it is touched. */
  label?: string;
}

export const LASER = {
  /** Health cost of one touch (of 100). Michael's pick: "Health hit (CT)". */
  damage: 15,
  /** Seconds before the same player can be hit again. */
  cooldown: 2,
  /** Beam thickness plus body radius (m): a body within this of the beam line touches it. */
  reach: 0.3,
  /** A touch never takes a player below this: it costs health and a radio line, it never ends the run. */
  floorHp: 1,
  /** Body height (m) standing / crouched (the beams it can touch). */
  standHeight: 1.75,
  crouchHeight: 1.1,
} as const;

/** Distance in plan from a point to the segment (x1, z1) - (x2, z2). */
export function distToSegment(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const sx = x2 - x1;
  const sz = z2 - z1;
  const len2 = sx * sx + sz * sz;
  let t = len2 > 1e-9 ? ((px - x1) * sx + (pz - z1) * sz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return hyp2(px - (x1 + sx * t), pz - (z1 + sz * t));
}

/**
 * Does a body (feet at (px, py, pz), `height` tall) touch the laser's beams? In plan it must be within `LASER.reach` of
 * the beam line, and one beam height must fall inside the body (a body over every beam, or under all of them, is clear).
 */
export function laserTouch(def: LaserDef, px: number, py: number, pz: number, height: number): boolean {
  if (distToSegment(px, pz, def.x1, def.z1, def.x2, def.z2) > LASER.reach) return false;
  const base = def.floorY ?? 0;
  for (let i = 0; i < def.ys.length; i++) {
    const y = base + def.ys[i]!;
    if (y >= py && y <= py + height) return true;
  }
  return false;
}

/** Health a touch takes from a player at `hp`: `LASER.damage`, never below `LASER.floorHp` left. */
export function laserDamage(hp: number): number {
  return Math.max(0, Math.min(LASER.damage, hp - LASER.floorHp));
}

/** Per-player touch cooldown: true when a touch lands now (and arms the cooldown), false while it is cooling. */
export function laserCooldown(cool: { t: number }, dt: number, touching: boolean): boolean {
  cool.t = Math.max(0, cool.t - dt);
  if (!touching || cool.t > 0) return false;
  cool.t = LASER.cooldown;
  return true;
}

/** Alarm stages (G125: escalating, never ends the run). */
export const ALARM_MAX = 3;
/** Minimum seconds between two escalations by cameras. */
export const ALARM_GAP = 5;

/** Next alarm stage after a camera has someone (capped at `ALARM_MAX`). */
export function nextAlarm(stage: number): number {
  return Math.min(ALARM_MAX, stage + 1);
}

/** Is the foot point inside the plan box [x0, z0, x1, z1]? (the camera pocket, the pass zone) */
export function inBox(box: readonly [number, number, number, number], x: number, z: number): boolean {
  return x >= Math.min(box[0], box[2]) && x <= Math.max(box[0], box[2]) && z >= Math.min(box[1], box[3]) && z <= Math.max(box[1], box[3]);
}
