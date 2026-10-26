/**
 * (guard-ai play pass) Shared by `tests/guardPlayProbe.test.ts` (the report) and `tests/guardPlaySpawns.test.ts` (the
 * asserting guard): a guard slot's spawn, post and route checks on the guards' runtime nav grid (`runtimeNav.ts`).
 */
import type { NavGrid } from '../../src/ai/navGrid';
import type { LevelBuilder } from '../../src/world/levelBuilder';
import { hyp2 } from '../../src/core/mathx';
import { STAGE_NAV_ACROSS, STAGE_NAV_ALONG } from '../../src/game/sectorStage';

/** A path search budget well past any leg on these maps (the reachability question, not `Enemy.goTo`'s budget). */
export const SLOT_BUDGET = 60000;
/** The furthest `EnemyManager.spawn` may snap a guard from his authored point before it reads as a data fault. */
export const SLOT_SNAP_MAX = 0.75;

export interface GuardSlotLike {
  kind: string;
  x: number;
  z: number;
  y?: number;
  route?: readonly (readonly [number, number])[];
}

/** The first collide box (not glass, not overhead) that holds the point 0.9 m over the floor at (x, z); its index or -1. */
export function solidAt(b: LevelBuilder, x: number, z: number, floorY: number): number {
  const y = floorY + 0.9;
  for (let i = 0; i < b.boxes.length; i++) {
    const p = b.boxes[i]!;
    if (!p.collide || p.glass || p.overhead || Math.abs(p.pitch) > 1e-3) continue;
    const c = Math.cos(-p.yaw);
    const s = Math.sin(-p.yaw);
    const dx = x - p.c[0];
    const dz = z - p.c[2];
    const lx = c * dx + s * dz;
    const lz = -s * dx + c * dz;
    if (Math.abs(lx) <= p.s[0] / 2 && Math.abs(lz) <= p.s[2] / 2 && Math.abs(y - p.c[1]) <= p.s[1] / 2) return i;
  }
  return -1;
}

/** Shut every door in `ids` (anchor ids into `b.anchors.all`) on `nav` as `LockedDoorNav` does; the count shut. */
export function closeDoors(b: LevelBuilder, nav: NavGrid, ids: Iterable<number>): number {
  let n = 0;
  for (const id of ids) {
    const a = b.anchors.all[id];
    if (!a || a.kind !== 'door') continue;
    const cx = a.hinge.x + Math.sin(a.yaw) * a.width * 0.5;
    const cz = a.hinge.z + Math.cos(a.yaw) * a.width * 0.5;
    nav.setClosed(nav.addClosure(cx, cz, STAGE_NAV_ACROSS, (a.width + STAGE_NAV_ALONG) / 2, a.yaw, a.hinge.y), true);
    n++;
  }
  return n;
}

/**
 * The data faults of one slot (empty = clean): no spawn cell (`EnemyManager.spawn`: `nearestWalkable` ring 8 on his
 * storey), a snap over `SLOT_SNAP_MAX`, the post point inside a solid, no path from the spawn to route[0], a route point
 * with no walkable cell, or a route leg with no path (a 3+ point route loops, 2 points ping-pong).
 */
export function slotFaults(b: LevelBuilder, nav: NavGrid, s: GuardSlotLike): string[] {
  const out: string[] = [];
  const y = s.y ?? Number.NaN;
  const c = nav.nearestWalkable(s.x, s.z, 8, y);
  if (c < 0) return ['NO SPAWN CELL within ring 8 (spawn returns null)'];
  const [cx, cz] = nav.center(c);
  const snap = hyp2(cx - s.x, cz - s.z);
  const fy = nav.height[c]!;
  if (snap > SLOT_SNAP_MAX) out.push(`spawn snaps ${snap.toFixed(2)} m to (${cx.toFixed(2)}, ${cz.toFixed(2)}) y ${fy.toFixed(2)}`);
  const si = solidAt(b, s.x, s.z, Number.isFinite(y) ? y : fy);
  if (si >= 0) {
    const p = b.boxes[si]!;
    out.push(`post point inside solid box #${si} c=(${p.c.map((v) => v.toFixed(2)).join(',')}) s=(${p.s.map((v) => v.toFixed(2)).join(',')})`);
  }
  const r = s.route;
  if (r?.length) {
    const r0 = r[0]!;
    if (hyp2(r0[0] - s.x, r0[1] - s.z) > 0.6 && !nav.findPath([cx, cz], [r0[0], r0[1]], SLOT_BUDGET, fy, y)) out.push(`no path spawn -> route[0] (${r0[0]}, ${r0[1]})`);
    const n = r.length;
    const legs = n >= 3 ? n : n - 1;
    for (let i = 0; i < legs; i++) {
      const a = r[i]!;
      const d = r[(i + 1) % n]!;
      if (nav.nearestWalkable(a[0], a[1], 2, y) < 0) out.push(`route[${i}] (${a[0]}, ${a[1]}) has no walkable cell within ring 2`);
      if (!nav.findPath([a[0], a[1]], [d[0], d[1]], SLOT_BUDGET, y, y)) out.push(`no path route[${i}] (${a[0]}, ${a[1]}) -> route[${(i + 1) % n}] (${d[0]}, ${d[1]})`);
    }
  }
  return out;
}
