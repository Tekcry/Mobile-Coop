/** Pure movement maths (speed curves, eased acceleration, sprint/roll gates). Unit-tested. */
import { MOVEMENT } from '../config/movement';
import { springStep } from '../anim/rigMath';

export type Stance = 'stand' | 'crouch' | 'ads' | 'sprint' | 'cover';

/** Target ground speed from stick magnitude: a walk band, then a jog band; stances cap it. */
export function targetSpeed(mag: number, stance: Stance, M = MOVEMENT): number {
  const m = Math.max(0, Math.min(1, mag));
  if (m < 0.05) return 0;
  const walk = m < M.walkBand ? M.walkSpeed * (m / M.walkBand) : M.walkSpeed + (M.jogSpeed - M.walkSpeed) * ((m - M.walkBand) / (1 - M.walkBand));
  switch (stance) {
    case 'crouch':
      return Math.min(walk, M.crouchSpeed * m);
    case 'ads':
      return Math.min(walk, M.adsSpeed * Math.max(m, 0.6));
    case 'cover':
      return M.coverSpeed * m;
    case 'sprint':
      return M.sprintSpeed;
    default:
      return walk;
  }
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

/** Sprint commitment: wind-up before full speed, recovery before firing/ADS after it ends. */
export class SprintGate {
  state: 'off' | 'windup' | 'on' | 'recover' = 'off';
  t = 0;

  update(want: boolean, dt: number, M = MOVEMENT): void {
    this.t += dt;
    switch (this.state) {
      case 'off':
        if (want) this.go('windup');
        break;
      case 'windup':
        if (!want) this.go('recover');
        else if (this.t >= M.sprintWindup) this.go('on');
        break;
      case 'on':
        if (!want) this.go('recover');
        break;
      case 'recover':
        if (want) this.go('windup');
        else if (this.t >= M.sprintRecovery) this.go('off');
        break;
    }
  }

  private go(s: SprintGate['state']): void {
    this.state = s;
    this.t = 0;
  }

  /** 0..1 blend from jog to sprint speed. */
  get blend(): number {
    if (this.state === 'on') return 1;
    if (this.state === 'windup') return Math.min(1, this.t / Math.max(1e-3, MOVEMENT.sprintWindup));
    return 0;
  }

  /** Weapon is lowered: no firing or aiming. */
  get blocksWeapon(): boolean {
    return this.state !== 'off';
  }

  get sprinting(): boolean {
    return this.state === 'windup' || this.state === 'on';
  }

  cancel(): void {
    if (this.sprinting) this.go('recover');
  }
}

/** Roll: fixed duration, then a short recovery (no fire/ADS) and a cooldown before the next. */
export class RollGate {
  t = -1;
  private cd = 0;
  private rec = 0;

  get active(): boolean {
    return this.t >= 0;
  }

  /** 0..1 progress while rolling, else -1. */
  get progress(): number {
    return this.t;
  }

  get blocksWeapon(): boolean {
    return this.active || this.rec > 0;
  }

  canStart(): boolean {
    return !this.active && this.cd <= 0;
  }

  start(): boolean {
    if (!this.canStart()) return false;
    this.t = 0;
    return true;
  }

  update(dt: number, M = MOVEMENT): void {
    this.cd = Math.max(0, this.cd - dt);
    this.rec = Math.max(0, this.rec - dt);
    if (this.t < 0) return;
    this.t += dt / M.rollTime;
    if (this.t >= 1) {
      this.t = -1;
      this.cd = M.rollCooldown;
      this.rec = M.rollRecovery;
    }
  }

  /** Speed profile over the roll: quick push, glide, slow at the end. */
  speedAt(M = MOVEMENT): number {
    if (this.t < 0) return 0;
    const t = this.t;
    return M.rollSpeed * (t < 0.15 ? 0.6 + (t / 0.15) * 0.4 : 1 - Math.max(0, t - 0.55) * 1.4);
  }
}
