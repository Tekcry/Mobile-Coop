/**
 * Sliding a mounted piece across its surface (Michael 2026-10-14), pure and Babylon-free (tests/editor/mount.test.ts):
 * a held lamp, security device or sign moves with the left stick (camera-relative, facts light.slideSpeed at a full
 * stick) and the D-pad (0.1 m); on a ceiling or roof underside it snaps to the surface's centre line and quarter lines
 * in both directions (x and z) within facts light.snapMagnet, LB held turning the snap off. The numbers come in as
 * arguments (the editor reads them from scripts/kestrel/facts.json).
 */

/** The lines a ceiling snaps to, as fractions of its width and depth: the quarter lines and the centre line. */
export const SNAP_FRACTIONS: readonly number[] = [0.25, 0.5, 0.75];

/** A snapped point and the lines it took (null: free on that axis). */
export interface SlideSnap {
  x: number;
  z: number;
  /** The x of the north-south line it snapped to. */
  lx: number | null;
  /** The z of the east-west line it snapped to. */
  lz: number | null;
}

const r3 = (v: number): number => Math.round(v * 1000) / 1000;

/** The snap lines across a span lo..hi (centre and quarter lines). */
export function snapLines(lo: number, hi: number): number[] {
  return SNAP_FRACTIONS.map((f) => r3(lo + (hi - lo) * f));
}

/** One coordinate onto the nearest line of lo..hi within `magnet` (strictly nearest; null when none is that near). */
export function snapAxis(v: number, lo: number, hi: number, magnet: number): number | null {
  let best: number | null = null;
  let bd = magnet + 1e-9;
  for (const l of snapLines(lo, hi)) {
    const d = Math.abs(v - l);
    if (d <= bd) {
      bd = d;
      best = l;
    }
  }
  return best;
}

/**
 * A point on a ceiling outline `rect` [x0, z0, x1, z1] snapped to its centre and quarter lines within `magnet`, each
 * axis on its own; `off` (LB held) leaves it free.
 */
export function snapSlide(x: number, z: number, rect: readonly number[], magnet: number, off = false): SlideSnap {
  if (off) return { x, z, lx: null, lz: null };
  const lx = snapAxis(x, rect[0]!, rect[2]!, magnet);
  const lz = snapAxis(z, rect[1]!, rect[3]!, magnet);
  return { x: lx ?? x, z: lz ?? z, lx, lz };
}

/** A point kept inside `rect` (inset by `inset`, never past its middle). */
export function clampToRect(x: number, z: number, rect: readonly number[], inset = 0): [number, number] {
  const ix = Math.min(inset, (rect[2]! - rect[0]!) / 2);
  const iz = Math.min(inset, (rect[3]! - rect[1]!) / 2);
  return [Math.min(rect[2]! - ix, Math.max(rect[0]! + ix, x)), Math.min(rect[3]! - iz, Math.max(rect[1]! + iz, z))];
}

/** Whether a point is inside `rect` (with a small tolerance). */
export const inRectTol = (rect: readonly number[], x: number, z: number, tol = 1e-6): boolean => x >= rect[0]! - tol && x <= rect[2]! + tol && z >= rect[1]! - tol && z <= rect[3]! + tol;

/**
 * The plan move of one frame of the left stick (sx right, sy up; already past the dead zone) for a camera facing `yaw`
 * (forward is (sin yaw, cos yaw), as the D-pad nudges read it): `speed` m/s at a full stick.
 */
export function stickMove(sx: number, sy: number, yaw: number, speed: number, dt: number): [number, number] {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  // right of forward (fx, fz) is (fz, -fx)
  const k = speed * dt;
  return [(fz * sx + fx * sy) * k, (-fx * sx + fz * sy) * k];
}

/** A stick value past a dead zone, rescaled to 0..1 (sign kept). */
export function deadZone(v: number, dead: number): number {
  const a = Math.abs(v);
  if (a <= dead) return 0;
  return (Math.sign(v) * (a - dead)) / (1 - dead);
}

/** A move along a wall direction (unit dx, dz): the plan move projected onto it. */
export function alongWall(mx: number, mz: number, dx: number, dz: number): number {
  return mx * dx + mz * dz;
}
