/**
 * (sector-batch, G280, CONFORMANCE M17) Solo play past team doors: "true 2-player pathways that cannot be used solo, but
 * doesnt break solo play" (Michael, 2026-10-23). A section with team doors (pair gates, bolts) passes when at least one
 * of its declared routes (M8) has no leg crossing a team door's leaf. Geometric over the data as it is (BRIEF A6): the
 * leaf comes from the map's door anchors (`doorFinder`), widened `SOLO_DOOR_PAD` each side, and a leg counts only at
 * the leaf's floor (`ZONE_Y_TOL`). Co-op traversal moves on a route are not judged here (BRIEF A9). Pure, Babylon-free;
 * tests only (campusOps: `tests/campusSoloRoute.test.ts`; campus v2 lanes call it too).
 */
import type { RoutePt, SectorDef } from './sectors';
import type { StageDoorInfo } from './sectorStage';

/** Metres added to each end of a team door's leaf (the frame and a body squeezing past). */
export const SOLO_DOOR_PAD = 0.3;
/** A leg is at a door's floor when its height there is within this of the leaf's (m; `ZONE_Y_TOL` of sectors.ts). */
export const SOLO_DOOR_DY = 1.5;

/** A team door's point in plan: every pair gate's `door` and every bolt's `at` (a plain bolt counts too). */
export function teamDoorPoints(d: SectorDef): (readonly [number, number])[] {
  const out: (readonly [number, number])[] = [];
  for (const g of d.pairGates ?? []) out.push(g.door);
  for (const b of d.bolts ?? []) out.push(b.at);
  return out;
}

const ptY = (p: RoutePt): number => (p.length > 2 ? (p as readonly [number, number, number])[2] : 0);

/**
 * Does the leg a -> b cross the door's leaf (widened by `SOLO_DOOR_PAD` at each end) at the leaf's floor? The leaf runs
 * through the door centre along (sin yaw, cos yaw), `width` long (`doorFinder`'s convention).
 */
export function legCrossesDoor(a: RoutePt, b: RoutePt, door: StageDoorInfo): boolean {
  const ux = Math.sin(door.yaw);
  const uz = Math.cos(door.yaw);
  const h = door.width / 2 + SOLO_DOOR_PAD;
  const px = door.cx - ux * h;
  const pz = door.cz - uz * h;
  const qx = door.cx + ux * h;
  const qz = door.cz + uz * h;
  const rx = b[0] - a[0];
  const rz = b[1] - a[1];
  const sx = qx - px;
  const sz = qz - pz;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return false; // parallel: a leg along the wall does not pass through the door
  const t = ((px - a[0]) * sz - (pz - a[1]) * sx) / den;
  const u = ((px - a[0]) * rz - (pz - a[1]) * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return false;
  const y = ptY(a) + (ptY(b) - ptY(a)) * t;
  return Math.abs(y - door.y) <= SOLO_DOOR_DY;
}

/**
 * Problems (empty when fine): per section with team doors, a team door with no door anchor near it, or no route that
 * avoids every team door. `doorAt` is `doorFinder(anchors.doors)` of the built map.
 */
export function checkSoloRoutes(defs: readonly SectorDef[], doorAt: (x: number, z: number) => StageDoorInfo | null): string[] {
  const out: string[] = [];
  for (const d of defs) {
    const pts = teamDoorPoints(d);
    if (!pts.length) continue;
    const doors: StageDoorInfo[] = [];
    for (const p of pts) {
      const info = doorAt(p[0], p[1]);
      if (info) doors.push(info);
      else out.push(`${d.id}: no door at team door (${p[0]}, ${p[1]})`);
    }
    if (doors.length < pts.length) continue;
    const routes = d.routes;
    const clear = routes.filter((r) => {
      for (let i = 0; i + 1 < r.pts.length; i++) for (const door of doors) if (legCrossesDoor(r.pts[i]!, r.pts[i + 1]!, door)) return false;
      return true;
    });
    if (!clear.length) {
      const where = doors.map((q) => `(${q.cx.toFixed(1)}, ${q.cz.toFixed(1)})`).join(', ');
      out.push(`${d.id}: no route avoids the team doors at ${where} (routes: ${routes.map((r) => r.name).join(' / ') || 'none'})`);
    }
  }
  return out;
}
