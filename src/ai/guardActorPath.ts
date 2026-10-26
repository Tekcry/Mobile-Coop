/**
 * (guard-ai piano GA4) The path a `GuardActor` walks: a polyline of (x, z) points as a flat number array (x0, z0, x1,
 * z1, ...), as the map data writes routes. Pure and Babylon-free.
 *
 * - `actorPath(pts)` measures it once (build time, allocates): the cumulative distance at each point and each leg's
 *   travel heading (yaw, 0 = +Z, `atan2(dx, dz)`, as the motion driver's). A zero-length leg (a repeated point) takes
 *   the heading of the leg before it (the first leg's next real one); a one-point path stands still, heading 0.
 * - `sample(path, dist, out)` writes the point and the travel heading `dist` metres along it into the caller's object:
 *   before the start the first point, past the end the last point with the last leg's heading. No allocation.
 * - `pathLength(path)`: the total length (m).
 *
 * The walk speed and the clock are the actor's (`guardActor.ts`): it advances the distance by its motion driver's
 * speed times its own time (`dt * rate`), so a weighted start and stop stay on the line.
 */

/** A measured path (read only after `actorPath`). */
export interface ActorPath {
  /** The points, flat (x0, z0, x1, z1, ...). */
  readonly pts: readonly number[];
  /** Number of points. */
  readonly n: number;
  /** Distance along the path at each point (cum[0] = 0, cum[n - 1] = the length). */
  readonly cum: Float64Array;
  /** Travel heading of leg i (point i to i + 1), n - 1 entries (none for a one-point path). */
  readonly heading: Float64Array;
  /** Total length (m). */
  readonly length: number;
}

/** What `sample` writes. */
export interface PathSample {
  x: number;
  z: number;
  /** Travel heading (rad, 0 = +Z). */
  heading: number;
}

export function emptyPathSample(): PathSample {
  return { x: 0, z: 0, heading: 0 };
}

/** Measure a path. Throws on an empty or odd-length array (data error at build time). Allocates (build time only). */
export function actorPath(pts: readonly number[]): ActorPath {
  if (pts.length < 2 || pts.length % 2 !== 0) throw new Error(`guardActorPath: need (x, z) pairs, got ${pts.length} numbers`);
  for (let i = 0; i < pts.length; i++) if (!Number.isFinite(pts[i]!)) throw new Error(`guardActorPath: point value ${i} is not finite`);
  const n = pts.length / 2;
  const cum = new Float64Array(n);
  const heading = new Float64Array(Math.max(0, n - 1));
  let last = Number.NaN;
  for (let i = 1; i < n; i++) {
    const dx = pts[i * 2]! - pts[i * 2 - 2]!;
    const dz = pts[i * 2 + 1]! - pts[i * 2 - 1]!;
    const len = Math.sqrt(dx * dx + dz * dz);
    cum[i] = cum[i - 1]! + len;
    if (len > 1e-9) last = Math.atan2(dx, dz);
    heading[i - 1] = last;
  }
  // leading zero-length legs take the first real heading; a path with no real leg faces 0
  let first = 0;
  for (let i = 0; i < heading.length; i++) {
    if (!Number.isNaN(heading[i]!)) {
      first = heading[i]!;
      break;
    }
  }
  for (let i = 0; i < heading.length && Number.isNaN(heading[i]!); i++) heading[i] = first;
  return { pts, n, cum, heading, length: cum[n - 1]! };
}

export function pathLength(path: ActorPath): number {
  return path.length;
}

/** The point and travel heading `dist` metres along `path`, into `out` (returned). No allocation. */
export function sample(path: ActorPath, dist: number, out: PathSample): PathSample {
  const p = path.pts;
  const n = path.n;
  if (n === 1) {
    out.x = p[0]!;
    out.z = p[1]!;
    out.heading = 0;
    return out;
  }
  const cum = path.cum;
  if (!(dist > 0)) {
    out.x = p[0]!;
    out.z = p[1]!;
    out.heading = path.heading[0]!;
    return out;
  }
  if (dist >= path.length) {
    out.x = p[n * 2 - 2]!;
    out.z = p[n * 2 - 1]!;
    out.heading = path.heading[n - 2]!;
    return out;
  }
  // the leg the distance is on (linear: intro paths have a handful of points)
  let i = 0;
  while (i < n - 2 && cum[i + 1]! <= dist) i++;
  const len = cum[i + 1]! - cum[i]!;
  const k = len > 1e-9 ? (dist - cum[i]!) / len : 0;
  out.x = p[i * 2]! + (p[i * 2 + 2]! - p[i * 2]!) * k;
  out.z = p[i * 2 + 1]! + (p[i * 2 + 3]! - p[i * 2 + 1]!) * k;
  out.heading = path.heading[i]!;
  return out;
}
