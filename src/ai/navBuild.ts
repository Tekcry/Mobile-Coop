import { PhysicsRaycastResult, Vector3, type PhysicsEngine, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import type { BuiltLevel } from '../world/levelBuilder';
import { NavGrid, type NavBlocker } from './navGrid';
import { insideBox } from '../world/anchors';

/** Builds the nav grid for a level: heights via Havok raycasts, blockers from level pieces. */
export function buildNavGrid(scene: Scene, level: BuiltLevel, seed: Vector3): NavGrid {
  const eng = scene.getPhysicsEngine() as PhysicsEngine;
  const res = new PhysicsRaycastResult();
  const from = new Vector3();
  const to = new Vector3();
  const blockers: NavBlocker[] = [];
  for (const b of level.boxes) {
    if (!b.collide || Math.abs(b.pitch) > 1e-3) continue;
    // overhead pieces sit above head height: never in the way on the floor below
    if (b.overhead) continue;
    blockers.push({ cx: b.c[0], cz: b.c[2], hx: b.s[0] / 2, hz: b.s[2] / 2, yaw: b.yaw, bottom: b.c[1] - b.s[1] / 2, top: b.c[1] + b.s[1] / 2 });
  }
  for (const c of level.cylinders) {
    if (!c.collide) continue;
    blockers.push({ cx: c.c[0], cz: c.c[2], hx: c.r, hz: c.r, yaw: 0, bottom: c.c[1] - c.h / 2, top: c.c[1] + c.h / 2, round: true });
  }
  // overhead pieces (ceiling slabs, ducts, catwalks over rooms): the floor under them is what the nav walks on
  const overhead = level.boxes.filter((b) => b.overhead && b.collide);
  const bd = level.bounds;
  return new NavGrid({
    minX: bd.minX,
    maxX: bd.maxX,
    minZ: bd.minZ,
    maxZ: bd.maxZ,
    cell: 0.5,
    agentRadius: 0.32,
    stepHeight: 0.45,
    blockers,
    seed: [seed.x, seed.z],
    sample: (x, z) => {
      let y = 12;
      for (let k = 0; k < 4; k++) {
        from.set(x, y, z);
        to.set(x, -2, z);
        res.reset();
        eng.raycastToRef(from, to, res, { membership: G.PROJECTILE, collideWith: G.STATIC });
        if (!res.hasHit) return { h: 0, ok: false };
        const hy = res.hitPoint.y;
        let skip = false;
        for (let i = 0; i < overhead.length && !skip; i++) skip = insideBox(overhead[i]!, x, hy - 0.02, z, 0.01);
        if (!skip) return { h: hy, ok: res.hitNormal.y > 0.65 };
        // look through it: continue from just under the piece
        let bottom = hy;
        for (const o of overhead) if (insideBox(o, x, hy - 0.02, z, 0.01)) bottom = Math.min(bottom, o.c[1] - o.s[1] / 2);
        y = bottom - 0.02;
      }
      return { h: 0, ok: false };
    },
  });
}
