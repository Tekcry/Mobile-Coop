import { describe, expect, it } from 'vitest';
import { LockedDoorNav, type LockDoor } from '../../src/ai/lockedDoors';
import type { NavGrid, P2 } from '../../src/ai/navGrid';
import { LevelBuilder } from '../../src/world/levelBuilder';
import { buildCtcourse, ctcourse } from '../../src/world/maps/ctcourse';
import { A7_CAGE_E, A7_CAGE_W, A7_EAST_DOOR, A7_T2_SPOT, A7_TECH_ROUTE } from '../../src/world/maps/ctcourseSets/a7DataHall';
import { runtimeNav } from '../helpers/runtimeNav';

// (guard-ai S28, check F3) Marlow A7 with the cage doors locked (before `a7-sync`): the technician's way from his round to
// T2's spot (the pod side) goes round the cage by the plant corridor. `Enemy.goTo` plans with a 3000-pop A* budget
// (`enemy.ts` goTo); this pins that the detour fits it, so a locked cage never reads as "no path" to him.

const b = new LevelBuilder();
const built = buildCtcourse(b);
const lay = built.layout;
const course = lay.course!;
const GOTO_BUDGET = 3000;

/** The fewest A* pops (to 50) that find a path a -> c, or Infinity past `max`. */
function popsNeeded(nav: NavGrid, a: P2, c: P2, max: number): number {
  if (!nav.findPath(a, c, max)) return Infinity;
  let lo = 1;
  let hi = max;
  while (hi - lo > 50) {
    const m = (lo + hi) >> 1;
    if (nav.findPath(a, c, m)) hi = m;
    else lo = m;
  }
  return hi;
}

describe('A7 the Data Hall: the locked cage on the guards grid (S28)', () => {
  it("cage locked: R0 -> T2's spot goes round within goTo's A* budget; unlocked: through the cage", () => {
    const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, ctcourse.navLayers ?? 3, lay.navSeeds ?? []);
    const ids = new Set([course.doors[A7_CAGE_W], course.doors[A7_CAGE_E], course.doors[A7_EAST_DOOR]]);
    const doors: (LockDoor & { anchor: { locked: boolean } })[] = b.anchors.doors.map((a) => ({
      cx: a.hinge.x + Math.sin(a.yaw) * a.width * 0.5,
      cz: a.hinge.z + Math.cos(a.yaw) * a.width * 0.5,
      target: 0,
      anchor: { yaw: a.yaw, width: a.width, locked: ids.has(a.id), hinge: { y: a.hinge.y } },
    }));
    expect(doors.filter((d) => d.anchor.locked).length).toBe(3);
    const ld = new LockedDoorNav(nav, doors);
    const r0 = A7_TECH_ROUTE[0]!;
    const open = popsNeeded(nav, r0, A7_T2_SPOT, 200000);
    ld.sync();
    const round = nav.findPath(r0, A7_T2_SPOT, GOTO_BUDGET);
    const pops = popsNeeded(nav, r0, A7_T2_SPOT, 200000);
    let len = 0;
    let p: P2 = r0;
    for (const w of round ?? []) {
      len += Math.hypot(w[0] - p[0], w[1] - p[1]);
      p = w;
    }
    console.info(`A7 R0 -> T2 spot: through the cage ${open} pops; cage locked ${pops} pops, ${len.toFixed(1)} m`);
    expect(round).not.toBeNull();
    // round the cage, not through it: longer than the straight 12.3 m
    expect(len).toBeGreaterThan(20);
    expect(pops).toBeLessThanOrEqual(GOTO_BUDGET);
    for (const d of doors) d.anchor.locked = false;
    ld.sync();
    expect(popsNeeded(nav, r0, A7_T2_SPOT, 200000)).toBe(open);
  });
});
