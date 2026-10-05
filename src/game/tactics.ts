/**
 * Combat-around-cover maths (pure, unit-tested): exposure sampling, cover quality, suppression and
 * near-miss geometry. Shared by the player (HUD, effects) and the AI (cover choice, flanking).
 */

export interface P3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Exposure 0..1: the largest fraction of the sample points (head, chest, hips, knees) that any one
 * threat can see. `blocked(eye, point)` reports whether the line between them is obstructed.
 */
export function exposureFraction(points: readonly P3[], eyes: readonly P3[], blocked: (a: P3, b: P3) => boolean): number {
  if (!points.length || !eyes.length) return 0;
  let best = 0;
  for (const e of eyes) {
    let seen = 0;
    for (const p of points) if (!blocked(e, p)) seen++;
    best = Math.max(best, seen / points.length);
    if (best >= 1) break;
  }
  return best;
}

/** Sample points on a character's hit volumes (feet position, crouch 0..1, lean offset along its right). */
export function exposurePoints(feet: P3, crouch: number, rightX: number, rightZ: number, lean: number, out: P3[]): P3[] {
  const k = 1 - crouch * 0.4;
  const set = (i: number, y: number, side: number): void => {
    const p = out[i] ?? (out[i] = { x: 0, y: 0, z: 0 });
    p.x = feet.x + rightX * side;
    p.y = feet.y + y;
    p.z = feet.z + rightZ * side;
  };
  set(0, 1.62 * k, lean * 0.38); // head
  set(1, 1.3 * k, lean * 0.24); // chest
  set(2, 0.95 * k, lean * 0.08); // hips
  set(3, 0.5 * k, 0.1); // knees
  set(4, 0.5 * k, -0.1);
  out.length = 5;
  return out;
}

export interface CoverSpot {
  /** Outward normal of the cover face (towards where the user stands). */
  nx: number;
  nz: number;
  low: boolean;
  x: number;
  z: number;
}

/**
 * Cover quality 0..1 against a set of threat positions: how squarely the face sits between the
 * user and every threat (the worst threat counts most), with high cover slightly better than low.
 * A threat on the user's own side of the face (flanking) scores 0 for that threat.
 */
export function coverQuality(c: CoverSpot, threats: readonly { x: number; z: number }[]): number {
  if (!threats.length) return 1;
  let worst = 1;
  let sum = 0;
  for (const t of threats) {
    const dx = t.x - c.x;
    const dz = t.z - c.z;
    const d = Math.hypot(dx, dz) || 1;
    // threat should be behind the face: direction to it opposite the outward normal
    const facing = -(c.nx * dx + c.nz * dz) / d;
    const q = Math.max(0, Math.min(1, (facing - 0.2) / 0.6));
    worst = Math.min(worst, q);
    sum += q;
  }
  const mean = sum / threats.length;
  return (0.65 * worst + 0.35 * mean) * (c.low ? 0.85 : 1);
}

/** Is a position flanking someone in cover (on their side of the face, or well off to the side)? */
export function flanks(c: CoverSpot, x: number, z: number): boolean {
  const dx = x - c.x;
  const dz = z - c.z;
  const d = Math.hypot(dx, dz) || 1;
  return -(c.nx * dx + c.nz * dz) / d < 0.25;
}

/** Shortest distance from point p to segment a-b. */
export function segPointDist(a: P3, b: P3, p: P3): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const l2 = abx * abx + aby * aby + abz * abz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / l2));
  return Math.hypot(a.x + abx * t - p.x, a.y + aby * t - p.y, a.z + abz * t - p.z);
}

export const SUPPRESS = {
  /** Near-miss radius (m) and the suppression a miss at zero distance adds. */
  radius: 1.6,
  perMiss: 0.22,
  /** Impacts on the user's cover within this distance also count (smaller). */
  impactRadius: 1.2,
  perImpact: 0.1,
  /** Hold before decaying, and decay per second. */
  hold: 0.9,
  decay: 0.45,
};

/**
 * Suppression 0..1: near misses and impacts close by build it up; it holds briefly, then decays.
 * Effects scale with it: spread, aim sway, vignette, flinch.
 */
export class Suppression {
  value = 0;
  private holdT = 0;
  /** Flinch impulse 0..1 for the animation (decays fast). */
  flinch = 0;

  nearMiss(dist: number, S = SUPPRESS): void {
    if (dist >= S.radius) return;
    this.add(S.perMiss * (1 - dist / S.radius));
  }

  impact(dist: number, S = SUPPRESS): void {
    if (dist >= S.impactRadius) return;
    this.add(S.perImpact * (1 - dist / S.impactRadius));
  }

  add(v: number, S = SUPPRESS): void {
    this.value = Math.min(1, this.value + v);
    this.holdT = S.hold;
    this.flinch = Math.min(1, this.flinch + v * 3);
  }

  update(dt: number, S = SUPPRESS): void {
    this.flinch = Math.max(0, this.flinch - dt * 4);
    if (this.holdT > 0) {
      this.holdT -= dt;
      return;
    }
    this.value = Math.max(0, this.value - S.decay * dt);
  }

  /** Weapon spread multiplier. */
  get spreadMul(): number {
    return 1 + this.value * 0.8;
  }

  /** Aim sway amplitude (rad). */
  get sway(): number {
    return this.value * 0.012;
  }

  reset(): void {
    this.value = 0;
    this.holdT = 0;
    this.flinch = 0;
  }
}
