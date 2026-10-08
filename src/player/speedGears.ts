/**
 * Chaos Theory speed gears (3.2.0, pure, unit-tested): six gears stepped up / down by a button, kept through stance
 * changes, reset at spawn and respawn. The target speed is the gear's cap for the stance times the stick curve, so a
 * keyboard or a touch stick pushed to its rim gives exactly the cap.
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

/** Cover strafe pace (m/s) for a gear: the gear's pace, capped along a wall (`GEARS.coverMax`). */
export function coverPace(gear: number, crouched: boolean): number {
  return Math.min(gearCap(gear, crouched), crouched ? GEARS.coverMax.crouch : GEARS.coverMax.stand);
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

/** The player's gear: steps one at a time, remembers when it last changed (HUD pips). */
export class GearState {
  gear: Gear;
  /** Changes so far (a counter the HUD watches). */
  changes = 0;

  constructor(readonly spawnGear: Gear = GEARS.spawn) {
    this.gear = spawnGear;
  }

  /** Step by +1 / -1 (clamped); true when it changed. */
  step(d: number): boolean {
    const g = clampGear(this.gear + Math.sign(d));
    if (g === this.gear) return false;
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
