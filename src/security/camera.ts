/**
 * CCTV camera logic (pure: no Babylon / DOM), unit-tested. S0 section 2.1.
 *
 * A camera sees the way a guard does (`sightRate` / `stepMeter`) but with one fixed cone: no peripheral field and no
 * close-range term. (marlow-jammer, M3) It sees by its own IR illuminator (`CAMERA.irLight`), not by the lamps: lamp
 * light (and its loss to a jam, an EMP or a shot) changes nothing for a camera. The sweep is a pure function of the camera's clock, so every tick rate
 * gives the same angles.
 */
import { CAMERA } from '../config/security';
import { SENSITIVITY } from '../ai/alertState';
import { PERCEPTION, seenAt, sightRate, stepMeter } from '../ai/perception';
import { hyp2, hyp3 } from '../core/mathx';
import type { CameraDevice } from './data';

const DEG = Math.PI / 180;

/** online: sees. looped: shows recorded footage (desk). off: switched off at the panel. destroyed: shot. */
export type CameraMode = 'online' | 'looped' | 'off' | 'destroyed';

function wrap(a: number): number {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
}

/** Seconds for one full pan out and back, pauses included (0 for a fixed camera). */
export function sweepCycle(sweep: readonly [number, number] | undefined): number {
  if (!sweep) return 0;
  const travel = (Math.abs(sweep[1] - sweep[0]) * DEG) / CAMERA.sweepSpeed;
  return 2 * CAMERA.sweepPause + 2 * travel;
}

/**
 * Yaw (rad, 0 faces +Z) at clock time `t` s. A fixed camera holds `facing`. A sweep starts at its first angle, waits
 * `sweepPause`, pans to the second at `sweepSpeed`, waits, and pans back.
 */
export function sweepYaw(def: Pick<CameraDevice, 'facing' | 'sweep'>, t: number): number {
  if (!def.sweep) return def.facing * DEG;
  const a = def.sweep[0] * DEG;
  const b = def.sweep[1] * DEG;
  const travel = Math.abs(b - a) / CAMERA.sweepSpeed;
  const cycle = 2 * CAMERA.sweepPause + 2 * travel;
  const u = ((t % cycle) + cycle) % cycle;
  if (u < CAMERA.sweepPause) return a;
  if (u < CAMERA.sweepPause + travel) return a + (b - a) * ((u - CAMERA.sweepPause) / travel);
  if (u < 2 * CAMERA.sweepPause + travel) return b;
  return b + (a - b) * ((u - 2 * CAMERA.sweepPause - travel) / travel);
}

/**
 * (sector-fixes C, item 3) The camera's pitch (rad, + = down): it looks at the floor point `aim` m in front of its mount
 * (`y` above its level's floor), so its frame covers a patch of floor and route, not the ceiling. No `aim`: level (0).
 */
export function camPitch(def: Pick<CameraDevice, 'y' | 'aim'>): number {
  return def.aim !== undefined && def.aim > 0 ? Math.atan2(def.y, def.aim) : 0;
}

/** (sector-fixes C, item 3) The camera's detection range (m): its own `range`, else `CAMERA.range`, never more. */
export function camRange(def: Pick<CameraDevice, 'range'>): number {
  return Math.min(CAMERA.range, def.range ?? CAMERA.range);
}

/**
 * True when the point is inside the camera's field of view and range: within half the horizontal field of its yaw, half
 * the vertical field of its `pitch` (rad, + = down; sector-fixes C) and `range` (m). The cue's `cueEdge` is the same test.
 */
export function inFrame(yaw: number, cx: number, cy: number, cz: number, px: number, py: number, pz: number, pitch = 0, range: number = CAMERA.range): boolean {
  const dx = px - cx;
  const dz = pz - cz;
  const dy = py - cy;
  if (hyp3(dx, dy, dz) > range) return false;
  const h = hyp2(dx, dz);
  if (h < 1e-6) return false;
  if (Math.abs(wrap(Math.atan2(dx, dz) - yaw)) > CAMERA.hFov / 2) return false;
  return Math.abs(Math.atan2(dy, h) + pitch) <= CAMERA.vFov / 2;
}

/**
 * Meter fill rate (/s) for a body the camera has a clear ray to: the guard formula with the camera's fixed cone, at the
 * camera's own IR light (`CAMERA.irLight`; marlow-jammer M3: the lamps do not matter to a camera).
 */
export function cameraRate(dist: number, crouched: boolean, speed: number, exposure = 1): number {
  return sightRate({ dist, angle: 0, light: CAMERA.irLight, crouched, speed, exposure, sensitivity: SENSITIVITY.unaware });
}

/** One player's awareness meter on one camera. */
export interface CamMeter {
  meter: number;
  /** Seconds since the camera last saw this player. */
  sinceSeen: number;
  /** Seconds in frame since the meter reached 1 (the desk's `alert()` stage, Part B). */
  full: number;
  /** 0 nothing, 1 suspicious (meter 0.3), 2 full (meter 1): the highest stage reached since the meter last emptied. */
  stage: 0 | 1 | 2;
}

export function newMeter(): CamMeter {
  return { meter: 0, sinceSeen: 99, full: 0, stage: 0 };
}

/** Advance a meter by one think of `dt` s at fill rate `rate` (0 = not seen). Returns the new stage when it rose, else 0. */
export function stepCamMeter(m: CamMeter, rate: number, dt: number): 0 | 1 | 2 {
  m.sinceSeen = seenAt(rate) ? 0 : m.sinceSeen + dt;
  m.meter = stepMeter(m.meter, rate, dt, m.sinceSeen);
  m.full = m.meter >= 1 && rate > 0 ? m.full + dt : 0;
  const now = m.meter >= 1 ? 2 : m.meter >= PERCEPTION.suspicious ? 1 : 0;
  const rose = now > m.stage ? now : 0;
  m.stage = now === 0 ? 0 : (Math.max(m.stage, now) as 1 | 2);
  return rose;
}

/**
 * True when the segment a -> b passes through the camera's housing box (SN05: `len` along its facing, `w` across,
 * `h` high, centred on the lens position). Slab test in the housing's own frame.
 */
export function segmentHitsHousing(c: { x: number; y: number; z: number; yaw: number }, ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
  const s = Math.sin(c.yaw);
  const co = Math.cos(c.yaw);
  const ox = ax - c.x;
  const oy = ay - c.y;
  const oz = az - c.z;
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  // local axes: right (co, 0, -s), up, forward (s, 0, co)
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 3; i++) {
    const o = i === 0 ? ox * co - oz * s : i === 1 ? oy : ox * s + oz * co;
    const d = i === 0 ? dx * co - dz * s : i === 1 ? dy : dx * s + dz * co;
    const h = (i === 0 ? CAMERA.housing.w : i === 1 ? CAMERA.housing.h : CAMERA.housing.len) / 2;
    if (Math.abs(d) < 1e-9) {
      if (o < -h || o > h) return false;
      continue;
    }
    let a = (-h - o) / d;
    let b = (h - o) / d;
    if (a > b) {
      const t = a;
      a = b;
      b = t;
    }
    if (a > t0) t0 = a;
    if (b < t1) t1 = b;
    if (t0 > t1) return false;
  }
  return true;
}

/** Runtime state of one camera. */
export class CameraUnit {
  mode: CameraMode = 'online';
  /** The camera's own clock (s): the sweep is a function of it. */
  clock = 0;
  yaw: number;
  /** World position of the lens. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** (sector-fixes C) Pitch down to its floor patch (rad, `camPitch`) and detection range (m, `camRange`): the one source
   *  of truth for detection (`covers`) and the cue (`CameraCueView`). */
  readonly pitch: number;
  readonly range: number;
  readonly meters = new Map<string, CamMeter>();
  /** (marlow-jammer) Jammed or rebooting: the sweep stops where it is (its clock does not run). */
  frozen = false;
  /** (marlow-jammer) The jam phase (0 working, 1 jammed: the LED flashes, 2 rebooting) and seconds in it (render only). */
  jam = 0;
  jamT = 0;

  constructor(
    readonly def: CameraDevice,
    /** World height of the floor this camera's level stands on. */
    floorY: number,
  ) {
    this.x = def.at[0];
    this.z = def.at[1];
    this.y = floorY + def.y;
    this.yaw = sweepYaw(def, 0);
    this.pitch = camPitch(def);
    this.range = camRange(def);
  }

  get sees(): boolean {
    return this.mode === 'online';
  }

  /** Advance the clock (every fixed step; the sweep keeps turning while off or looped, it is only blind; a jammed or
   *  rebooting camera is frozen: its clock stops, so the sweep resumes where it stopped). */
  advance(dt: number): void {
    if (this.mode === 'destroyed' || this.frozen) return;
    this.clock += dt;
    this.yaw = sweepYaw(this.def, this.clock);
  }

  /** The point is inside the frame now. */
  covers(px: number, py: number, pz: number): boolean {
    return this.sees && inFrame(this.yaw, this.x, this.y, this.z, px, py, pz, this.pitch, this.range);
  }

  meter(id: string): CamMeter {
    let m = this.meters.get(id);
    if (!m) {
      m = newMeter();
      this.meters.set(id, m);
    }
    return m;
  }

  /** Shot: broken for good, and nothing is seen again. */
  destroy(): void {
    this.mode = 'destroyed';
    for (const m of this.meters.values()) m.meter = m.sinceSeen = m.full = m.stage = 0;
  }

  /** (Sector Ops restart) A shot camera back in service, seeing, its meters at zero. */
  repair(): void {
    if (this.mode !== 'destroyed') return;
    this.mode = 'online';
    for (const m of this.meters.values()) m.meter = m.sinceSeen = m.full = m.stage = 0;
  }

  setMode(mode: Exclude<CameraMode, 'destroyed'>): void {
    if (this.mode === 'destroyed') return;
    this.mode = mode;
    if (mode !== 'online') for (const m of this.meters.values()) m.meter = m.full = m.stage = 0;
  }
}
