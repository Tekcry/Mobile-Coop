/**
 * Chaos Theory speed gears (3.2.0, pure, unit-tested): six gears stepped up / down by a button, kept through stance
 * changes, reset at spawn and respawn. The target speed is the gear's cap for the stance times the stick curve, so a
 * keyboard or a stick pushed to its rim gives exactly the cap.
 */
import { CT, GEARS } from '../config/movement';
import { hyp2 } from '../core/mathx';

/** Gear 1..6 (an integer). */
export type Gear = 1 | 2 | 3 | 4 | 5 | 6;

export function clampGear(g: number): Gear {
  const n = Math.round(Number.isFinite(g) ? g : GEARS.spawn);
  return Math.max(1, Math.min(GEARS.count, n)) as Gear;
}

/** Speed cap (m/s) of a gear in a stance. */
export function gearCap(gear: number, crouched: boolean): number {
  const t = crouched ? GEARS.crouch : GEARS.stand;
  return t[clampGear(gear) - 1]!;
}

/** Stick response: 0 inside the dead zone, then linear to 1 at the rim. */
export function stickCurve(mag: number, dead: number = GEARS.deadZone): number {
  const m = Math.max(0, Math.min(1, mag));
  if (m <= dead) return 0;
  return (m - dead) / (1 - dead);
}

/** Target speed (m/s) for a gear, stance and stick magnitude. */
export function gearSpeed(gear: number, crouched: boolean, mag: number): number {
  return gearCap(gear, crouched) * stickCurve(mag);
}

/**
 * Stick release detection (pure): while the stick drops fast (`CT.releaseRate`) from a real deflection, the last
 * deflection is kept (up to `CT.releaseWindow` s); reaching the dead zone in that time reads as a release straight
 * from the full pace, settling or rising ends the latch. Writes the stick to use into `x`, `y`.
 */
export class StickRelease {
  x = 0;
  y = 0;
  private px = 0;
  private py = 0;
  private pm = 0;
  private lx = 0;
  private ly = 0;
  private latchT = -1;

  get latched(): boolean {
    return this.latchT >= 0;
  }

  update(x: number, y: number, dt: number): void {
    const m = Math.min(1, hyp2(x, y));
    const dropping = dt > 0 && (this.pm - m) / dt > CT.releaseRate;
    if (this.latchT < 0 && dropping && this.pm >= CT.releaseFrom && m > GEARS.deadZone) {
      this.latchT = 0;
      this.lx = this.px;
      this.ly = this.py;
    }
    if (this.latchT >= 0) {
      this.latchT += dt;
      if (m <= GEARS.deadZone || !dropping || this.latchT > CT.releaseWindow) this.latchT = -1;
    }
    if (this.latchT >= 0) {
      this.x = this.lx;
      this.y = this.ly;
    } else {
      this.x = x;
      this.y = y;
    }
    // (the latched deflection stays the reference while it holds, so a slow spring-back keeps reading as a drop)
    if (this.latchT < 0) {
      this.px = x;
      this.py = y;
    }
    this.pm = m;
  }

  reset(): void {
    this.x = this.y = this.px = this.py = this.pm = 0;
    this.latchT = -1;
  }
}

/** The player's maximum gear (step 17; the stick snaps within it, `AnalogGear`): steps one at a time, remembers when it last changed (HUD pips). */
export class GearState {
  gear: Gear;
  /** Changes so far (a counter the HUD watches). */
  changes = 0;

  constructor(readonly spawnGear: Gear = GEARS.spawn) {
    this.gear = spawnGear;
  }

  /** Step by +1 / -1, clamped to 1..MAX_ROCKER_GEAR (step 17: the rocker sets the maximum gear; gear 6 is the
   *  sprint); true when it changed. */
  step(d: number): boolean {
    const g = Math.max(1, Math.min(MAX_ROCKER_GEAR, this.gear + Math.sign(d))) as Gear;
    if (g === this.gear || (d > 0 && g < this.gear)) return false;
    this.gear = g;
    this.changes++;
    return true;
  }

  set(g: number): void {
    const n = clampGear(g);
    if (n === this.gear) return;
    this.gear = n;
    this.changes++;
  }

  /** Spawn / respawn: back to the spawn gear. */
  reset(): void {
    this.set(this.spawnGear);
  }
}

/** The rocker / wheel sets the maximum gear 1..`MAX_ROCKER_GEAR` (locomotion step 17, D5.12); gear 6 is the sprint. */
export const MAX_ROCKER_GEAR = 5;
/** Hysteresis half-width as a share of the gap between adjacent gear caps (step 17). */
export const GEAR_HYSTERESIS = 0.15;

/** Up / down thresholds (m/s) of the boundary g -> g + 1 (index g - 1), derived from `GEARS` (step 17). */
function thresholds(caps: readonly number[], up: boolean): Float64Array {
  const out = new Float64Array(caps.length - 1);
  for (let i = 0; i < out.length; i++) {
    const a = caps[i]!;
    const b = caps[i + 1]!;
    const k = GEAR_HYSTERESIS * (b - a);
    out[i] = (a + b) / 2 + (up ? k : -k);
  }
  return out;
}
export const GEAR_UP = { stand: thresholds(GEARS.stand, true), crouch: thresholds(GEARS.crouch, true) } as const;
export const GEAR_DOWN = { stand: thresholds(GEARS.stand, false), crouch: thresholds(GEARS.crouch, false) } as const;

/**
 * Analog speed with gear snapping (pure, allocation-free; locomotion step 17, D5.12): v = cap(maxGear) x
 * stickCurve(mag); the snapped gear is the highest g <= maxGear whose up threshold v has passed, kept until v drops
 * under its down threshold; the speed is cap(g). Any tilt past the dead zone gives gear 1; the sprint is gear 6.
 */
export class AnalogGear {
  /** Snapped gear (valid while `moving`). */
  gear: Gear = 1;
  /** The stick is past the dead zone (or sprinting). */
  moving = false;

  /** Returns the snapped gear (0 inside the dead zone). */
  update(maxGear: number, crouched: boolean, mag: number, sprint = false): number {
    const c = stickCurve(mag);
    if (c <= 0) {
      this.moving = false;
      this.gear = 1;
      return 0;
    }
    this.moving = true;
    if (sprint) {
      this.gear = 6;
      return 6;
    }
    // gear 6 only with sprint held: a maximum of 6 (`?gear=6`) caps the stick at the rocker's top gear
    const max = Math.min(MAX_ROCKER_GEAR, clampGear(maxGear));
    const v = gearCap(max, crouched) * c;
    const up = crouched ? GEAR_UP.crouch : GEAR_UP.stand;
    const down = crouched ? GEAR_DOWN.crouch : GEAR_DOWN.stand;
    let g: number = Math.min(this.gear, max);
    while (g < max && v >= up[g - 1]!) g++;
    while (g > 1 && v < down[g - 2]!) g--;
    this.gear = g as Gear;
    return g;
  }

  /** Speed (m/s) of the snapped gear. */
  speed(crouched: boolean): number {
    return this.moving ? gearCap(this.gear, crouched) : 0;
  }

  reset(): void {
    this.gear = 1;
    this.moving = false;
  }
}
