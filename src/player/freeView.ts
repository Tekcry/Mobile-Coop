import { stickMagFor } from './speedGears';

/**
 * (tuner-camera) The animation tuner's free view (a dev aid; pure, Babylon-free, no DOM). The game keeps running and
 * the animations play; only the rendered view moves. Two modes:
 * - orbit: the view circles the player at a set distance (look rotates and tilts it, zoom sets the distance, a nudge the
 *   height of the point it circles); the player still moves (the left stick / WASD, in the frozen game camera's frame,
 *   so in fixed world directions however the view circles);
 * - fly: a detached view (move, look, rise); the player stands, or walks a demo loop by synthesised input.
 *
 * The follow camera keeps computing the game's view every frame (its `gamePos` is what gameplay reads: aim, ping, the
 * jammer pick); the free view only overrides what is rendered, so turning it off gives the game view back exactly.
 */
export type FreeMode = 'off' | 'orbit' | 'fly';
export const FREE_MODES: readonly FreeMode[] = ['off', 'orbit', 'fly'];
export const FREE_DEMOS = ['idle', 'walk', 'jog', 'run', 'crouchWalk', 'aimStrafe'] as const;
export type FreeDemo = (typeof FREE_DEMOS)[number];
/** (pass 2) The tuner's game speed slider (slow motion through the loop's `timeScale`; the fixed step stays 1/60 s). */
export const GAME_SPEED = { min: 0.1, max: 1, step: 0.05 } as const;

/**
 * What the panel chose (read by the game each frame). (anim-studio) `spin`: the turntable, the orbit's yaw turning at
 * this rate (rad / s, real seconds; 0 off); `snap`: a camera snap the game takes once (front / side / back / top of the
 * player's facing; '' none).
 */
export const FREE_VIEW: { mode: FreeMode; demo: FreeDemo; spin: number; snap: '' | 'front' | 'side' | 'back' | 'top' } = { mode: 'off', demo: 'idle', spin: 0, snap: '' };

/**
 * (anim-studio) A camera snap: the orbit's yaw and pitch to look at the body (facing `bodyYaw`) from its front, its
 * right side, its back, or from above (behind, looking down). Orbit yaw is the view direction (the camera sits `dist`
 * back along it).
 */
export function freeSnap(snap: 'front' | 'side' | 'back' | 'top', bodyYaw: number, out: { yaw: number; pitch: number }): void {
  if (snap === 'front') {
    out.yaw = bodyYaw + Math.PI;
    out.pitch = -0.1;
  } else if (snap === 'side') {
    out.yaw = bodyYaw - Math.PI / 2;
    out.pitch = -0.1;
  } else if (snap === 'back') {
    out.yaw = bodyYaw;
    out.pitch = -0.1;
  } else {
    out.yaw = bodyYaw;
    out.pitch = -FREE_CFG.pitchMax;
  }
}

/**
 * The pad's free-view input, written by the tuner panel while the free view owns the pad (zero otherwise), plus the
 * mouse wheel's steps (consumed by the game). Sticks -1..1 after the dead zone (`ly` / `ry` + = up); `zoom` RT - LT
 * (+ = in); `rise` RB - LB; `nudge` D-pad up - down; `wheel` whole steps (+ = in).
 */
export const FREE_IN = { lx: 0, ly: 0, rx: 0, ry: 0, zoom: 0, rise: 0, nudge: 0, wheel: 0 };

export const FREE_CFG = {
  /** Orbit: distance limits (m), the start height of the circled point over the feet (m) and its limits. */
  distMin: 0.6,
  distMax: 12,
  heightStart: 1.2,
  heightMin: -0.5,
  heightMax: 3,
  /** Orbit: zoom rate (log distance per second at a full trigger) and per wheel step; height nudge (m/s). */
  zoomRate: 1.5,
  zoomStep: 0.12,
  nudgeRate: 1,
  /** Fly: move and rise speeds (m/s). */
  flySpeed: 3,
  riseSpeed: 2,
  /** Pad look rates (rad/s at a full stick). */
  yawRate: 2.6,
  pitchRate: 1.8,
  /** Pitch limits (rad). */
  pitchMax: 1.45,
  /** Pad stick dead zone. */
  dead: 0.15,
  /** Demo loop: the circle's radius (m). */
  demoRadius: 2,
};

/** A game speed clamped to the slider's range (anything not finite: 1). (anim-studio) `max`: the studio allows 2x. */
export function freeTimeScale(v: number, max: number = GAME_SPEED.max): number {
  if (!Number.isFinite(v)) return 1;
  return Math.max(GAME_SPEED.min, Math.min(max, v));
}

/** A stick axis past the dead zone (rescaled to 0..1 past it). */
export function freeAxis(v: number, dead = FREE_CFG.dead): number {
  const a = Math.abs(v);
  if (!(a > dead)) return 0;
  return (v < 0 ? -1 : 1) * Math.min(1, (a - dead) / (1 - dead));
}

/** The orbit camera's position: `dist` back from the target (tx, ty, tz) along the view (yaw, pitch; + pitch looks up). */
export function orbitPlace(tx: number, ty: number, tz: number, yaw: number, pitch: number, dist: number, out: { x: number; y: number; z: number }): void {
  const cp = Math.cos(pitch);
  out.x = tx - Math.sin(yaw) * cp * dist;
  out.y = ty - Math.sin(pitch) * dist;
  out.z = tz - Math.cos(yaw) * cp * dist;
}

/** The demo loop's speeds (m/s), stance and aim. */
export const DEMO_LOOP: Record<Exclude<FreeDemo, 'idle'>, { v: number; crouch: boolean; ads: boolean }> = {
  walk: { v: 1.4, crouch: false, ads: false },
  jog: { v: 3.0, crouch: false, ads: false },
  run: { v: 4.0, crouch: false, ads: false },
  crouchWalk: { v: 1.3, crouch: true, ads: false },
  aimStrafe: { v: 1.4, crouch: false, ads: true },
};

export interface DemoOut {
  /** The synthesised stick (x right, y forward, in the frozen game camera's frame). */
  x: number;
  y: number;
  /** Hold the aim. */
  ads: boolean;
  /** 1 crouched, 0 standing, -1 leave the stance as it is (idle). */
  crouch: number;
}

/**
 * The demo loop's input at time `t` (s): the stick turns at v / radius, so the body walks a circle of `demoRadius` at
 * the loop's speed (the stick magnitude from the speed curve). Idle: no stick. No allocation.
 */
export function demoInput(demo: FreeDemo, t: number, out: DemoOut): DemoOut {
  if (demo === 'idle') {
    out.x = out.y = 0;
    out.ads = false;
    out.crouch = -1;
    return out;
  }
  const d = DEMO_LOOP[demo];
  const mag = stickMagFor(d.v, d.crouch);
  const th = (d.v / FREE_CFG.demoRadius) * t;
  out.x = Math.sin(th) * mag;
  out.y = Math.cos(th) * mag;
  out.ads = d.ads;
  out.crouch = d.crouch ? 1 : 0;
  return out;
}

/**
 * The free view's camera (pure state). The game fills the per-frame input fields, the follow camera calls `place` with
 * the feet after computing the game view, then renders from (x, y, z) looking along (yaw, pitch).
 */
export class FreeViewCore {
  mode: FreeMode = 'off';
  yaw = 0;
  pitch = 0;
  dist = 3;
  height = FREE_CFG.heightStart;
  x = 0;
  y = 0;
  z = 0;
  // per-frame input (real seconds; look in rad; move -1..1; rise / nudge -1..1; zoom in log distance, + = in)
  dt = 0;
  lookX = 0;
  lookY = 0;
  moveX = 0;
  moveY = 0;
  rise = 0;
  zoom = 0;
  nudge = 0;

  /** Start from the game's view: the camera at (cx, cy, cz) looking along (yaw, pitch), the feet at (fx, fy, fz). */
  start(mode: FreeMode, cx: number, cy: number, cz: number, yaw: number, pitch: number, fx: number, fy: number, fz: number): void {
    this.mode = mode;
    this.yaw = yaw;
    this.pitch = Math.max(-FREE_CFG.pitchMax, Math.min(FREE_CFG.pitchMax, pitch));
    this.x = cx;
    this.y = cy;
    this.z = cz;
    this.height = FREE_CFG.heightStart;
    const dx = cx - fx;
    const dy = cy - (fy + this.height);
    const dz = cz - fz;
    this.dist = Math.max(FREE_CFG.distMin, Math.min(FREE_CFG.distMax, Math.sqrt(dx * dx + dy * dy + dz * dz)));
    this.clearInput();
  }

  clearInput(): void {
    this.lookX = this.lookY = this.moveX = this.moveY = this.rise = this.zoom = this.nudge = 0;
  }

  /** One rendered frame: apply the input and place the view around / from the feet. No allocation. */
  place(fx: number, fy: number, fz: number): void {
    const C = FREE_CFG;
    const dt = this.dt;
    this.yaw += this.lookX;
    this.pitch = Math.max(-C.pitchMax, Math.min(C.pitchMax, this.pitch + this.lookY));
    if (this.mode === 'orbit') {
      this.dist = Math.max(C.distMin, Math.min(C.distMax, this.dist * Math.exp(-this.zoom)));
      this.height = Math.max(C.heightMin, Math.min(C.heightMax, this.height + this.nudge * C.nudgeRate * dt));
      orbitPlace(fx, fy + this.height, fz, this.yaw, this.pitch, this.dist, this);
    } else if (this.mode === 'fly') {
      const cp = Math.cos(this.pitch);
      const sy = Math.sin(this.yaw);
      const cy = Math.cos(this.yaw);
      const sp = C.flySpeed * dt;
      // forward along the view (pitch included), right level
      this.x += (sy * cp * this.moveY + cy * this.moveX) * sp;
      this.y += Math.sin(this.pitch) * this.moveY * sp + this.rise * C.riseSpeed * dt;
      this.z += (cy * cp * this.moveY - sy * this.moveX) * sp;
    }
    this.clearInput();
  }
}
