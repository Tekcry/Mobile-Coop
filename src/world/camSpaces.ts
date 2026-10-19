/**
 * (CT prototype G3, AUDIT-CAMERA rows 1 and 7) Camera spaces, Babylon-free: CT frames the explore camera by the space the
 * hero is in, about 2.8 m back in an open yard (the whole body in frame, 0.5 of the height) and about 1.8 m in rooms
 * and corridors. A map marks its spaces as floor-plan boxes (`MapLayout.camSpaces`) over a map-wide default (`MapLayout.camSize`); a map
 * with neither falls back to the camera's own probes (`probeOpen`). Local only: the camera never reaches gameplay.
 */

export type CamSize = 'open' | 'tight';

export interface CamSpace {
  /** Floor-plan box [minX, minZ, maxX, maxZ] (m). */
  box: readonly [number, number, number, number];
  /** Feet height range [min, max) (m; default every height): a roofed room under a roof that is open on top. */
  y?: readonly [number, number];
  size: CamSize;
}

/**
 * The open-space weight at the feet (x, y, z): 1 open, 0 tight, NaN when the map gives no data (the probes decide).
 * The smallest box holding the point wins (a room inside a yard); outside every box the map default.
 */
export function camSpaceAt(spaces: readonly CamSpace[] | undefined, def: CamSize | undefined, x: number, y: number, z: number): number {
  let best: CamSpace | null = null;
  let bestArea = Infinity;
  if (spaces) {
    for (let i = 0; i < spaces.length; i++) {
      const s = spaces[i]!;
      const b = s.box;
      if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) continue;
      if (s.y && (y < s.y[0] || y >= s.y[1])) continue;
      const a = (b[2] - b[0]) * (b[3] - b[1]);
      if (a < bestArea) {
        bestArea = a;
        best = s;
      }
    }
  }
  const size = best ? best.size : def;
  return size === 'open' ? 1 : size === 'tight' ? 0 : Number.NaN;
}

/**
 * The probe fallback: open (1) when the clear distance straight back from the head reaches `back` (m) and both side
 * distances reach `side` (m), else tight (0). Distances are the ray lengths to the first hit (the probe length when
 * clear). Hysteresis: once open (`wasOpen`) it stays open down to `hold` of those distances, so a space near the
 * thresholds does not make the boom breathe.
 */
export function probeOpen(backClear: number, leftClear: number, rightClear: number, back: number, side: number, wasOpen = false, hold = 0.8): number {
  const k = wasOpen ? hold : 1;
  return backClear >= back * k && leftClear >= side * k && rightClear >= side * k ? 1 : 0;
}

/**
 * (G3 fix round, AUDIT-EXTRA-NEW row 19) Passing through a doorway: the feet within `reach` (m) of the doorway's plane
 * and within its width (plus `margin`) along it, moving across the plane at `minSpeed` (m/s) or more (vx, vz: the feet
 * velocity). Standing still or walking past beside the door is not a passage. The door: its hinge (hx, hz), `yaw`
 * (the leaf runs along (sin yaw, cos yaw)) and `width`.
 */
export function doorPassing(px: number, pz: number, vx: number, vz: number, hx: number, hz: number, yaw: number, width: number, reach = 1.0, margin = 0.2, minSpeed = 0.3): boolean {
  const tx = Math.sin(yaw);
  const tz = Math.cos(yaw);
  const along = (px - hx) * tx + (pz - hz) * tz;
  if (along < -margin || along > width + margin) return false;
  const across = (px - hx) * tz - (pz - hz) * tx;
  if (Math.abs(across) > reach) return false;
  return Math.abs(vx * tz - vz * tx) >= minSpeed;
}
