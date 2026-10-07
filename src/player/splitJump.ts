/**
 * Chaos Theory moves found in the level geometry (3.2.0 phase 2; pure: no Babylon / DOM, unit-tested):
 * - split jump gaps: two tall walls facing each other a body's span apart (from the cover faces, `coverData`);
 * - wall jumps: a hangable lip 2.7-3.8 m up a wall the player faces (too high for a standing grab);
 * - the horizontal pipe's sub-states (hands -> legs up -> inverted) as a small timed state machine.
 */
import { hyp2 } from '../core/mathx';
import type { CoverSegment } from '../cover/coverData';
import { closestOnSegment, HANG, REACH, type Ledge, type P3 } from '../world/anchors';

export const SPLIT = {
  /** Faces this close to opposed (normal dot) count as the two sides of a gap. */
  opposed: -0.95,
  /** Gap between the faces (m). */
  minWidth: 0.9,
  maxWidth: 1.7,
  /** Both walls at least this tall over the floor (m). */
  minHeight: 2.6,
  /** Shortest usable stretch of corridor (m) and the margin kept from its ends. */
  minLen: 0.8,
  endMargin: 0.3,
  /** The two faces' bases within this of each other (m): the same floor. */
  floorTol: 0.3,
  /** The player faces within this of the corridor axis (rad, either way along it). */
  facing: (40 * Math.PI) / 180,
  /** Feet planted on the walls this high over the floor (m). */
  feetHeight: 1.9,
  /** The committed jump into the split (s). */
  jumpTime: 0.45,
  /** Aiming from the split: body yaw within this of the corridor axis, pitch band (rad). */
  aimYaw: (100 * Math.PI) / 180,
  pitchMin: (-85 * Math.PI) / 180,
  pitchMax: (30 * Math.PI) / 180,
} as const;

export const WALL_JUMP = {
  /** Lip height over the feet (m): above a standing grab (`REACH.grabMax`). */
  minUp: REACH.grabMax,
  maxUp: 3.8,
  /** Facing a wall within this (m). */
  wallReach: 1.0,
  /** Facing the lip's wall: cos of the angle between the facing and into the wall. */
  faceCos: 0.7,
  /** Inside corner: facing the adjoining wall, the lip's face then side-on (|cos| under this). */
  cornerCos: 0.4,
  /** Lip within this (m, horizontal from the feet) for a corner kick. */
  cornerReach: 1.4,
  /** The committed run-up kick (s). */
  time: 0.6,
} as const;

/** The horizontal pipe's sub-states and their timing. */
export const PIPE = {
  /** Shimmy speed with the legs crossed over the pipe (m/s). */
  legsUpSpeed: 0.5,
  /** Transitions (s). */
  toLegsUp: 0.5,
  toInverted: 0.55,
  toHands: 0.45,
  /** Inverted: aim band (rad) round the body facing, spread multiplier. */
  aimYaw: (120 * Math.PI) / 180,
  pitchMin: (-80 * Math.PI) / 180,
  pitchMax: (30 * Math.PI) / 180,
  spreadMul: 1.3,
  /** Legs up: the feet ride this much higher than hanging by the hands (m). */
  legsUpLift: 0.6,
} as const;

/** A split jump gap: the corridor's centre line on the floor (`a` -> `b`), its width and the walls' height. */
export interface SplitGap {
  a: P3;
  b: P3;
  /** Unit corridor axis a -> b and the normal of the first wall (pointing across the gap to the second). */
  tx: number;
  tz: number;
  nx: number;
  nz: number;
  len: number;
  width: number;
  /** The lower of the two walls' tops over the floor (m). */
  height: number;
}

/**
 * Every split gap in a set of cover faces: pairs of high faces with opposed normals facing each other
 * `SPLIT.minWidth .. maxWidth` apart on the same floor, both at least `SPLIT.minHeight` tall, overlapping along the
 * corridor by `SPLIT.minLen` or more. Each pair gives one gap (the overlapping stretch).
 */
export function findSplitGaps(segs: readonly CoverSegment[]): SplitGap[] {
  const out: SplitGap[] = [];
  for (let i = 0; i < segs.length; i++) {
    const A = segs[i]!;
    if (A.low || A.height < SPLIT.minHeight) continue;
    for (let j = i + 1; j < segs.length; j++) {
      const B = segs[j]!;
      if (B.low || B.height < SPLIT.minHeight || B.piece === A.piece) continue;
      if (A.nx * B.nx + A.nz * B.nz > SPLIT.opposed) continue;
      if (Math.abs(A.y - B.y) > SPLIT.floorTol) continue;
      const floor = Math.max(A.y, B.y);
      // both walls tall enough over the higher of the two bases
      const h = Math.min(A.y + A.height, B.y + B.height) - floor;
      if (h < SPLIT.minHeight) continue;
      // facing each other: B in front of A (along A's normal) at the width
      const w = (B.ax - A.ax) * A.nx + (B.az - A.az) * A.nz;
      if (w < SPLIT.minWidth || w > SPLIT.maxWidth) continue;
      // B's face is parallel: both its ends at the same distance
      const wb = (B.bx - A.ax) * A.nx + (B.bz - A.az) * A.nz;
      if (Math.abs(wb - w) > 0.05) continue;
      // overlap along A's tangent
      const b0 = (B.ax - A.ax) * A.tx + (B.az - A.az) * A.tz;
      const b1 = (B.bx - A.ax) * A.tx + (B.bz - A.az) * A.tz;
      const lo = Math.max(0, Math.min(b0, b1)) + SPLIT.endMargin;
      const hi = Math.min(A.len, Math.max(b0, b1)) - SPLIT.endMargin;
      if (hi - lo < SPLIT.minLen) continue;
      const cx = A.ax + A.nx * (w / 2);
      const cz = A.az + A.nz * (w / 2);
      out.push({
        a: { x: cx + A.tx * lo, y: floor, z: cz + A.tz * lo },
        b: { x: cx + A.tx * hi, y: floor, z: cz + A.tz * hi },
        tx: A.tx,
        tz: A.tz,
        nx: A.nx,
        nz: A.nz,
        len: hi - lo,
        width: w,
        height: h,
      });
    }
  }
  return out;
}

/**
 * Can a player standing at (x, y, z), facing (dirX, dirZ), split jump in this gap? Between the walls (clear of
 * them by a body half-width), on its floor, facing along the corridor. Returns the parameter along it and which
 * way the body faces (+1 towards b, -1 towards a), or null.
 */
export function splitReach(g: SplitGap, x: number, y: number, z: number, dirX: number, dirZ: number): { s: number; face: 1 | -1; dist: number } | null {
  if (Math.abs(y - g.a.y) > 0.4) return null;
  const q = closestOnSegment(g.a.x, g.a.z, g.b.x, g.b.z, x, z);
  const along = (x - g.a.x) * g.tx + (z - g.a.z) * g.tz;
  if (along < -0.05 || along > g.len + 0.05) return null;
  const lat = Math.abs((x - g.a.x) * g.nx + (z - g.a.z) * g.nz);
  if (lat > g.width / 2 - 0.15) return null;
  const l = hyp2(dirX, dirZ);
  if (l < 1e-4) return null;
  const c = (dirX * g.tx + dirZ * g.tz) / l;
  if (Math.abs(c) < Math.cos(SPLIT.facing)) return null;
  return { s: Math.max(0, Math.min(g.len, q.s)), face: c >= 0 ? 1 : -1, dist: lat };
}

/**
 * A wall jump onto a lip from the floor: the lip 2.7-3.8 m above the feet and hangable, the player on its drop side,
 * either facing its wall within reach (a kick straight up it) or facing the adjoining wall of an inside corner with
 * the lip side-on beside it (a kick off that wall across to the lip). Returns the parameter along the lip and the
 * kind, or null. The run-time controller still checks the wall in front (a ray) and the flight.
 */
export function wallJumpReach(l: Ledge, x: number, y: number, z: number, dirX: number, dirZ: number): { s: number; corner: boolean; dist: number } | null {
  if (!l.canHang) return null;
  const up = l.top - y;
  if (up < WALL_JUMP.minUp || up > WALL_JUMP.maxUp) return null;
  const q = closestOnSegment(l.a.x, l.a.z, l.b.x, l.b.z, x, z);
  if (q.s < 0.3 || q.s > l.len - 0.3) return null;
  const side = (x - q.x) * l.nx + (z - q.z) * l.nz;
  if (side < 0.05) return null;
  const d = hyp2(x - q.x, z - q.z);
  const into = -(dirX * l.nx + dirZ * l.nz);
  if (into >= WALL_JUMP.faceCos && d <= WALL_JUMP.wallReach + HANG.out) return { s: q.s, corner: false, dist: d };
  if (Math.abs(into) <= WALL_JUMP.cornerCos && d <= WALL_JUMP.cornerReach) return { s: q.s, corner: true, dist: d };
  return null;
}

export type PipeMode = 'hands' | 'legsUp' | 'inverted';

/**
 * Horizontal pipe sub-states: hanging by the hands (shimmy as before), legs crossed over the pipe (a slow shimmy,
 * the feet up out of the way), hanging inverted by the knees (no travel; a one-handed sidearm). Y steps up a state,
 * B steps down (from inverted: drop and flip to the feet); transitions take `PIPE.to*` and only damage interrupts
 * them (falling back to the hands).
 */
export class PipeHang {
  mode: PipeMode = 'hands';
  /** A transition under way: from / to and progress (s); `to` null when settled. */
  from: PipeMode = 'hands';
  to: PipeMode | null = null;
  t = 0;
  dur = 0;

  reset(): void {
    this.mode = this.from = 'hands';
    this.to = null;
    this.t = this.dur = 0;
  }

  get busy(): boolean {
    return this.to !== null;
  }

  /** Transition progress 0..1 (1 when settled). */
  get progress(): number {
    return this.to ? Math.min(1, this.t / this.dur) : 1;
  }

  /** Y: hands -> legs up -> inverted. Returns true when a transition started. */
  up(): boolean {
    if (this.to) return false;
    if (this.mode === 'hands') return this.begin('legsUp', PIPE.toLegsUp);
    if (this.mode === 'legsUp') return this.begin('inverted', PIPE.toInverted);
    if (this.mode === 'inverted') return this.begin('legsUp', PIPE.toLegsUp);
    return false;
  }

  /** B: legs up -> hands. (Inverted: the caller drops and flips to the feet.) Returns true when it started. */
  down(): boolean {
    if (this.to || this.mode !== 'legsUp') return false;
    return this.begin('hands', PIPE.toHands);
  }

  /** Hit: back to hanging by the hands at once. */
  damage(): void {
    this.reset();
  }

  update(dt: number): void {
    if (!this.to) return;
    this.t += dt;
    if (this.t >= this.dur) {
      this.mode = this.to;
      this.to = null;
      this.t = this.dur = 0;
    }
  }

  /** Travel speed along the pipe in the current state (m/s; none mid-transition or inverted). */
  speed(handsSpeed: number): number {
    if (this.to || this.mode === 'inverted') return 0;
    return this.mode === 'legsUp' ? PIPE.legsUpSpeed : handsSpeed;
  }

  private begin(to: PipeMode, dur: number): boolean {
    this.from = this.mode;
    this.to = to;
    this.t = 0;
    this.dur = dur;
    return true;
  }
}
