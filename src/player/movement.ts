/**
 * Pure tactical movement maths (speed curves, direction penalties, eased acceleration, turn and look
 * rates, the bounding dash with stamina, contextual traversal and footstep noise). Unit-tested.
 */
import { MOVEMENT } from '../config/movement';
import { springStep } from '../anim/rigMath';

export type Stance = 'stand' | 'crouch' | 'ads' | 'cover' | 'reload';

/**
 * Target ground speed (m/s). Light stick creeps, full stick walks, holding full stick for `briskDelay`
 * eases up to the brisk move. Movement relative to the aim (local x right, z forward, unit) applies the
 * strafe/backstep penalties. Stances cap the result.
 */
export function targetSpeed(mag: number, stance: Stance, localX = 0, localZ = 1, briskK = 0, M = MOVEMENT): number {
  const m = Math.max(0, Math.min(1, mag));
  if (m < 0.05) return 0;
  let v = m < M.creepBand ? M.creepSpeed * (m / M.creepBand) : M.creepSpeed + (M.walkSpeed - M.creepSpeed) * ((m - M.creepBand) / (1 - M.creepBand));
  // the brisk move is forward only (strafing and backstepping stay at walk pace)
  const fwd = Math.max(0, Math.min(1, (localZ / (Math.hypot(localX, localZ) || 1) - 0.6) / 0.35));
  if (stance === 'stand' && m > 0.95) v += (M.briskSpeed - M.walkSpeed) * Math.max(0, Math.min(1, briskK)) * fwd;
  if (stance === 'crouch') v = Math.min(v, M.crouchSpeed * m);
  if (stance === 'ads') v = Math.min(v, M.adsSpeed * Math.max(m, 0.6));
  if (stance === 'cover') v = M.coverSpeed * m;
  if (stance === 'reload') v = Math.min(v, M.reloadSpeed);
  return v * directionMult(localX, localZ, M);
}

/** Speed multiplier for moving sideways (strafe) or backwards relative to where the body faces. */
export function directionMult(localX: number, localZ: number, M = MOVEMENT): number {
  const l = Math.hypot(localX, localZ) || 1;
  const x = Math.abs(localX) / l;
  const z = localZ / l;
  const fwd = Math.max(0, z);
  const back = Math.max(0, -z);
  // blend: forward 1, sideways strafeMult, backwards backMult (weights sum to ~1 on the unit circle)
  const w = fwd + x + back || 1;
  return (fwd * 1 + x * M.strafeMult + back * M.backMult) / w;
}

/**
 * Eased velocity: each horizontal component follows its target through a critically damped spring,
 * so starts ease in, stops ease out, and there is no overshoot (no sliding past the stop).
 */
export class EasedVelocity {
  x = 0;
  z = 0;
  private ax = 0;
  private az = 0;

  step(tx: number, tz: number, dt: number, M = MOVEMENT): void {
    const speeding = tx * tx + tz * tz > this.x * this.x + this.z * this.z;
    const w = speeding ? M.accel : M.decel;
    [this.x, this.ax] = springStep(this.x, this.ax, tx, w, dt);
    [this.z, this.az] = springStep(this.z, this.az, tz, w, dt);
    if (Math.abs(this.x) < 1e-3 && tx === 0) this.x = this.ax = 0;
    if (Math.abs(this.z) < 1e-3 && tz === 0) this.z = this.az = 0;
  }

  reset(x = 0, z = 0): void {
    this.x = x;
    this.z = z;
    this.ax = this.az = 0;
  }

  get speed(): number {
    return Math.hypot(this.x, this.z);
  }
}

/** Body turn rate (rad/s) for a stance. Slowest while aiming. */
export function turnRate(aiming: boolean, speed: number, dashing: boolean, M = MOVEMENT): number {
  if (dashing) return M.turnDash;
  if (aiming) return M.turnAim;
  return speed > 0.3 ? M.turnMoving : M.turnStand;
}

/** Camera look-rate cap (rad/s): the view never turns faster than the body can follow. */
export function lookCap(aiming: boolean, dashing: boolean, M = MOVEMENT): number {
  if (dashing) return M.lookDash;
  return aiming ? M.lookAim : M.lookStand;
}

/** A reversal big enough (and fast enough) to need a controlled pivot rather than a turn. */
export function needsPivot(yaw: number, target: number, speed: number, M = MOVEMENT): boolean {
  let d = (target - yaw) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d) > M.pivotAngle && speed > M.walkSpeed * 0.8;
}

/**
 * Bounding dash: wind-up (lean in, weapon compressed), committed rush up to `dashMax`, braking
 * recovery. Weapons are blocked from wind-up to the end of recovery. Each dash costs stamina; running
 * dry starts a cooldown during which no dash can start.
 */
export class DashGate {
  state: 'off' | 'windup' | 'rush' | 'recover' = 'off';
  t = 0;
  stamina = 1;
  private cooldown = 0;

  get canStart(): boolean {
    return this.state === 'off' && this.cooldown <= 0 && this.stamina >= MOVEMENT.dashCost * 0.5;
  }

  /** Try to start a dash (press edge). */
  start(): boolean {
    if (!this.canStart) return false;
    this.go('windup');
    return true;
  }

  /** End the rush early (stick released, reached cover, blocked). */
  stop(): void {
    if (this.state === 'windup' || this.state === 'rush') this.go('recover');
  }

  update(dt: number, M = MOVEMENT): void {
    this.t += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    switch (this.state) {
      case 'windup':
        this.drain(dt / (M.dashWindup + M.dashMax), M);
        if (this.t >= M.dashWindup) this.go('rush');
        break;
      case 'rush':
        this.drain(dt / (M.dashWindup + M.dashMax), M);
        if (this.t >= M.dashMax || this.stamina <= 0) this.go('recover');
        break;
      case 'recover':
        if (this.t >= M.dashRecovery) this.go('off');
        break;
      case 'off':
        if (this.cooldown <= 0) this.stamina = Math.min(1, this.stamina + M.staminaRegen * dt);
        break;
    }
  }

  private drain(frac: number, M: typeof MOVEMENT): void {
    this.stamina = Math.max(0, this.stamina - frac * M.dashCost);
    if (this.stamina <= 0) this.cooldown = M.staminaCooldown;
  }

  private go(s: DashGate['state']): void {
    this.state = s;
    this.t = 0;
  }

  /** 0..1 speed blend towards dash speed (eases in over the wind-up). */
  get blend(): number {
    if (this.state === 'rush') return 1;
    if (this.state === 'windup') return Math.min(1, this.t / Math.max(1e-3, MOVEMENT.dashWindup)) * 0.5;
    return 0;
  }

  get dashing(): boolean {
    return this.state === 'windup' || this.state === 'rush';
  }

  /** Weapon lowered/compressed: no firing or aiming. */
  get blocksWeapon(): boolean {
    return this.state !== 'off';
  }

  get exhausted(): boolean {
    return this.cooldown > 0;
  }
}

/** What the contextual jump does with the obstacle in front (heights relative to the feet, m). */
export type Traversal = 'vault' | 'mantle' | 'step' | 'none';

export interface TraversalProbe {
  /** Height of the obstacle top in front (0 = nothing). */
  height: number;
  /** Depth of the obstacle (m) along the move direction. */
  depth: number;
  /** Floor found on the far side within a step of the feet. */
  landingClear: boolean;
  /** Room to stand on top (mantle). */
  topClear: boolean;
}

export function pickTraversal(p: TraversalProbe): Traversal {
  if (p.height < 0.2) return 'none';
  if (p.height <= 0.65 && p.topClear) return 'step';
  if (p.height <= 1.25 && p.depth <= 1.0 && p.landingClear) return 'vault';
  if (p.height <= 1.7 && p.topClear) return 'mantle';
  return 'none';
}

/** Footstep noise radius (m) that alerts enemies: quiet when creeping or crouched, loud when dashing. */
export function noiseRadius(speed: number, crouched: boolean, dashing: boolean): number {
  if (speed < 0.15) return 0;
  const base = dashing ? 16 : speed < 0.8 ? 1.5 + speed * 2.5 : speed < 1.5 ? 4 + (speed - 0.8) * 4 : 7 + (speed - 1.5) * 3;
  return base * (crouched ? 0.6 : 1);
}
