/**
 * (locomotion step 22, D8, D5.2 / D5.3 on remotes) Motion derived from a body's velocity alone (pure,
 * allocation-free): a remote copy has no motion driver, only MoveState and the velocity it measures from its
 * interpolated root, so its acceleration (for the lean spring) and its motion state (`move` / `stop` / `idle`, for the
 * stop settle) are derived here from the same speed edges the owner's driver produces. No extra bandwidth.
 */
import { hyp2 } from '../core/mathx';
import type { MotionState } from './motion';

/** Acceleration smoothing (s): calms the snapshot interpolation's speed ripple (the stride swell) before the lean. */
export const DERIVE_TAU = 0.12;
/** Braking along the travel (m/s^2) that reads as a stop, and the pace (m/s) under which a stop has ended. */
export const DERIVE_STOP_DECEL = 1.5;
export const DERIVE_STILL = 0.03;

export class MotionDerive {
  accelFwd = 0;
  accelSide = 0;
  motion: MotionState = 'idle';
  motionT = 0;
  private pvx = 0;
  private pvz = 0;
  private ax = 0;
  private az = 0;
  private init = false;

  reset(): void {
    this.init = false;
    this.ax = this.az = this.accelFwd = this.accelSide = 0;
    this.motion = 'idle';
    this.motionT = 0;
  }

  /** One frame: the measured velocity (m/s, world) and the body yaw (rad). */
  update(dt: number, vx: number, vz: number, yaw: number): void {
    if (!(dt > 0)) return;
    if (!this.init) {
      this.pvx = vx;
      this.pvz = vz;
      this.init = true;
    }
    const k = 1 - Math.exp(-dt / DERIVE_TAU);
    this.ax += ((vx - this.pvx) / dt - this.ax) * k;
    this.az += ((vz - this.pvz) / dt - this.az) * k;
    this.pvx = vx;
    this.pvz = vz;
    const s = Math.sin(yaw);
    const c = Math.cos(yaw);
    this.accelFwd = this.ax * s + this.az * c;
    this.accelSide = this.ax * c - this.az * s;
    const sp = hyp2(vx, vz);
    const along = sp > 1e-3 ? (this.ax * vx + this.az * vz) / sp : 0;
    let next = this.motion;
    if (this.motion === 'stop') {
      if (sp < DERIVE_STILL) next = 'idle';
      else if (along > 0) next = 'move';
    } else if (this.motion === 'move') {
      if (sp < DERIVE_STILL) next = 'idle';
      else if (along < -DERIVE_STOP_DECEL) next = 'stop';
    } else if (sp > 0.05) next = 'move';
    if (next !== this.motion) {
      this.motion = next;
      this.motionT = 0;
    } else this.motionT += dt;
  }
}
