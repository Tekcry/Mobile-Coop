/**
 * Pure stealth-operative movement maths (analog speed bands per stance, direction penalties while
 * aiming, eased velocity, contextual traversal and footstep noise). Unit-tested.
 */
import { MOVEMENT, NOISE_QUIET } from '../config/movement';
import { LANDING_NOISE_RADIUS } from '../config/noise';
import { springStep } from '../anim/rigMath';
import { hyp2 } from '../core/mathx';
import { gearCap, stickCurve } from './speedGears';

/**
 * Movement stance: standing / crouched free movement (the body faces where it goes) and aiming (strafe-
 * locked, standing or crouched). No sprint (CT prototype M1, loco M20 Q8).
 */
export type Stance = 'stand' | 'crouch' | 'ads' | 'adsCrouch';

const band = (m: number, m0: number, m1: number, v0: number, v1: number): number => v0 + (v1 - v0) * ((m - m0) / (m1 - m0));

/**
 * Target ground speed (m/s), analog on stick magnitude. With a speed `gear` (the player, 3.2.0 Chaos Theory gears):
 * the gear's cap for the stance x the stick curve; aiming is capped at `adsSpeed` / `adsCrouchSpeed`; aiming is capped. Without one (the 2.x bands): crouched sneak -> crouch walk -> crouch run; standing walk -> jog.
 * Aiming applies the strafe / backstep penalties relative to the aim (local x right, z forward); otherwise the body
 * faces the travel direction and there is no penalty.
 */
export function targetSpeed(mag: number, stance: Stance, localX = 0, localZ = 1, M = MOVEMENT, gear?: number): number {
  const m = Math.max(0, Math.min(1, mag));
  if (m < 0.05) return 0;
  if (gear !== undefined) {
    const c = stickCurve(m);
    switch (stance) {
      case 'stand':
        return gearCap(gear, false) * c;
      case 'crouch':
        return gearCap(gear, true) * c;
      case 'ads':
        return Math.min(gearCap(gear, false), M.adsSpeed) * c * directionMult(localX, localZ, M);
      case 'adsCrouch':
        return Math.min(gearCap(gear, true), M.adsCrouchSpeed) * c * directionMult(localX, localZ, M);
      default:
        break;
    }
  }
  switch (stance) {
    case 'stand':
      return m < M.walkBand ? band(m, 0, M.walkBand, 0, M.walkSpeed) : band(m, M.walkBand, 1, M.walkSpeed, M.jogSpeed);
    case 'crouch':
      if (m < M.sneakBand) return band(m, 0, M.sneakBand, 0, M.sneakSpeed);
      if (m < M.crouchWalkBand) return band(m, M.sneakBand, M.crouchWalkBand, M.sneakSpeed, M.crouchWalkSpeed);
      return band(m, M.crouchWalkBand, 1, M.crouchWalkSpeed, M.crouchRunSpeed);
    case 'ads':
      return M.adsSpeed * m * directionMult(localX, localZ, M);
    case 'adsCrouch':
      return M.adsCrouchSpeed * m * directionMult(localX, localZ, M);
  }
}

/** Speed multiplier for moving sideways (strafe) or backwards relative to the aim. */
export function directionMult(localX: number, localZ: number, M = MOVEMENT): number {
  const l = hyp2(localX, localZ) || 1;
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

  step(tx: number, tz: number, dt: number): void {
    const speeding = tx * tx + tz * tz > this.x * this.x + this.z * this.z;
    const w = speeding ? 8 : 10;
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
    return hyp2(this.x, this.z);
  }
}

/** (locomotion step 18, D7) Crouch hold / toggle (pure): the stance wanted from the toggle latch or the held button. */
export function crouchWanted(toggle: boolean, toggled: boolean, held: boolean): boolean {
  return toggle ? toggled : held;
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
  if (p.height <= 1.8 && p.topClear) return 'mantle';
  return 'none';
}

/**
 * Footstep noise radius (m) that alerts enemies: a crouched sneak is near silent, crouch walking quiet,
 * standing run audible. Silent up to `NOISE_QUIET` (G40: crouched speeds 1-3, standing speeds 1-2), then rising.
 */
/** (`_sprinting` is kept for `src/editor`, which still passes it; there is no sprint, so it is ignored.) */
export function noiseRadius(speed: number, crouched: boolean, _sprinting = false, M = MOVEMENT): number {
  if (speed < 0.15) return 0;
  // sneaking, crouch walking and a slow walk are silent; a crouch run and a jog carry a few metres
  if (crouched) return speed <= NOISE_QUIET.crouch ? 0 : 1 + (speed - M.crouchWalkSpeed) * 1.5;
  return speed <= NOISE_QUIET.stand ? 0 : 1.2 + (speed - M.walkSpeed) * 1.6;
}

/** Landing bands by fall height (m): under `roll` a soft landing, up to `heavy` a roll that keeps the momentum,
 *  beyond it a heavy landing with a recovery. No fall damage (Blacklist), but every band is louder. */
export const LANDING = { soft: 0.6, roll: 2.5, heavy: 4.5, heavyRecovery: 0.6 } as const;
export type LandingKind = 'none' | 'soft' | 'roll' | 'heavy';

export function landingKind(fall: number): LandingKind {
  if (fall < LANDING.soft) return 'none';
  if (fall < LANDING.roll) return 'soft';
  if (fall <= LANDING.heavy) return 'roll';
  return 'heavy';
}

/** Noise radius of a landing (m): a soft drop is quiet, a heavy landing carries. */
export function landingNoise(kind: LandingKind): number {
  return LANDING_NOISE_RADIUS[kind];
}
