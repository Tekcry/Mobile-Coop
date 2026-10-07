/**
 * Chaos Theory speed gears (3.2.0, pure, unit-tested): six gears stepped up / down by a button, kept through stance
 * changes, reset at spawn and respawn. The target speed is the gear's cap for the stance times the stick curve, so a
 * keyboard or a touch stick pushed to its rim gives exactly the cap.
 */
import { GEARS } from '../config/movement';

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
