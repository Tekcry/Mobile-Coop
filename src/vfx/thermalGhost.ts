/**
 * (LR16-6, G102) Thermal through a shut door, the pure rules (no Babylon; `tests/thermalThroughDoor.test.ts`). CT shows a
 * person behind a closed wooden door as a dim blue silhouette, never through a wall or glass. Render only: `DoorGhosts`
 * reads positions, door state and each rig's thermal heat to draw a figure and writes nothing back; perception, the light
 * meter and the light field never see it. No allocation: results go to caller-owned objects.
 */
import { THERMAL } from './visionLook';

/** The door fields the thermal rule reads. */
export interface GhostDoor {
  open: number;
  anchor: { yaw: number; width: number; hinge: { x: number; z: number } };
}

/**
 * The first closed door leaf crossing the floor segment (cx, cz) -> (gx, gz): its index in `list` and the crossing
 * point in `out` (x, z), or -1. A door counts as closed only fully shut (`open` 0): a cracked door shows the real body.
 */
export function closedDoorIndex(list: readonly GhostDoor[], cx: number, cz: number, gx: number, gz: number, out: { x: number; z: number }): number {
  const dx = gx - cx;
  const dz = gz - cz;
  for (let i = 0; i < list.length; i++) {
    const d = list[i]!;
    if (d.open > 0) continue;
    const a = d.anchor;
    const ex = Math.sin(a.yaw) * a.width;
    const ez = Math.cos(a.yaw) * a.width;
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-6) continue;
    const hx = a.hinge.x - cx;
    const hz = a.hinge.z - cz;
    const t = (hx * ez - hz * ex) / den;
    const u = (hx * dz - hz * dx) / den;
    if (t > 0.02 && t < 0.98 && u > 0 && u < 1) {
      out.x = cx + dx * t;
      out.z = cz + dz * t;
      return i;
    }
  }
  return -1;
}

/** (G102) A closed door leaf crossing the floor segment? True and the crossing point in `out` (x, z). */
export function closedDoorCrossing(list: readonly GhostDoor[], cx: number, cz: number, gx: number, gz: number, out: { x: number; z: number }): boolean {
  return closedDoorIndex(list, cx, cz, gx, gz, out) >= 0;
}

/** Within thermal's door range of the camera (horizontal)? */
export function inGhostRange(cx: number, cz: number, x: number, z: number): boolean {
  const dx = x - cx;
  const dz = z - cz;
  return dx * dx + dz * dz <= THERMAL.doorRange * THERMAL.doorRange;
}

/** Warm enough to show through a shut door: a rig's thermal heat (`CharacterRig.heat`, 0 with thermal off). */
export function ghostWarm(heat: number): boolean {
  return heat >= THERMAL.doorMinHeat * THERMAL.bodyEmit - 1e-6;
}

/**
 * The factor f that slides a point p along its camera ray (p' = c + (p - c) * f) onto the camera side of the door's
 * leaf line, `front` m in front of it (horizontal measure). Moving a point along its own ray keeps its place on screen,
 * so the figure drawn there looks exactly like the body behind the leaf, and the leaf no longer hides it. A point
 * already in front of that plane (or a ray parallel to the leaf) keeps f = 1; f never drops under 0.02.
 */
export function doorPlaneFactor(d: GhostDoor, cx: number, cz: number, px: number, pz: number, front: number): number {
  const dx = px - cx;
  const dz = pz - cz;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 1e-4) return 1;
  const a = d.anchor;
  const ex = Math.sin(a.yaw);
  const ez = Math.cos(a.yaw);
  const den = dx * ez - dz * ex;
  if (Math.abs(den) < 1e-6 * len) return 1;
  const t = ((a.hinge.x - cx) * ez - (a.hinge.z - cz) * ex) / den;
  // the ray meets the line at t; a step ds along it moves |den| * ds off the line (|den| = len x the sine of the ray's
  // angle to the leaf), so `front` in front of the line is ds = front / |den| before t
  const f = t - front / Math.abs(den);
  if (!(f < 1)) return 1;
  return f < 0.02 ? 0.02 : f;
}
