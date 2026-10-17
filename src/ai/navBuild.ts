import { PhysicsRaycastResult, Vector3, type PhysicsEngine, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import type { BuiltLevel } from '../world/levelBuilder';
import { NavGrid, type NavBlocker, type NavLinkInput, type NavSample } from './navGrid';
import { insideBox } from '../world/anchors';
import { hyp2 } from '../core/mathx';

/** Standing room an enemy needs over a surface (m). */
const HEADROOM = 1.7;
/** Ledge drops enemies take (m): above the lower bound it is a link, beyond the upper they go round. */
const DROP_MIN = 1.0;
const DROP_MAX = 2.2;
/** Walkable surfaces kept per column unless the map asks for more (`MapDef.navLayers`). */
export const DEFAULT_NAV_LAYERS = 3;

/**
 * Builds the nav grid for a level: every standing surface per column via Havok raycasts (a floor, a storey
 * over it, a roof), blockers from level pieces, links for ladders (both ways) and drops off ledges (down).
 */
export function buildNavGrid(scene: Scene, level: BuiltLevel, seed: Vector3, layers = DEFAULT_NAV_LAYERS): NavGrid {
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
  // (3.2.0) fences stop guards on foot (they are not level pieces)
  for (const f of level.anchors.fences) blockers.push({ cx: (f.a.x + f.b.x) / 2, cz: (f.a.z + f.b.z) / 2, hx: 0.05, hz: f.len / 2, yaw: Math.atan2(f.tx, f.tz), bottom: f.a.y, top: f.a.y + f.height });
  for (const c of level.cylinders) {
    if (!c.collide) continue;
    blockers.push({ cx: c.c[0], cz: c.c[2], hx: c.r, hz: c.r, yaw: 0, bottom: c.c[1] - c.h / 2, top: c.c[1] + c.h / 2, round: true });
  }
  const bd = level.bounds;
  // solids bucketed on a coarse grid by their footprint circle (a lookup per ray hit stays cheap)
  const BUCKET = 4;
  const bw = Math.max(1, Math.ceil((bd.maxX - bd.minX) / BUCKET));
  const bh = Math.max(1, Math.ceil((bd.maxZ - bd.minZ) / BUCKET));
  const buckets: (typeof level.boxes)[] = Array.from({ length: bw * bh }, () => []);
  for (const o of level.boxes) {
    if (!o.collide || Math.abs(o.pitch) > 1e-3) continue;
    const r = hyp2(o.s[0], o.s[2]) / 2;
    const x0 = Math.max(0, Math.floor((o.c[0] - r - bd.minX) / BUCKET));
    const x1 = Math.min(bw - 1, Math.floor((o.c[0] + r - bd.minX) / BUCKET));
    const z0 = Math.max(0, Math.floor((o.c[2] - r - bd.minZ) / BUCKET));
    const z1 = Math.min(bh - 1, Math.floor((o.c[2] + r - bd.minZ) / BUCKET));
    for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) buckets[iz * bw + ix]!.push(o);
  }
  const cyls = level.cylinders.filter((c) => c.collide);
  /** Bottom of the solid piece just under a hit at (x, y, z) (to cast on below it), or NaN. */
  const pieceBottom = (x: number, y: number, z: number): number => {
    let bottom = Number.NaN;
    const ix = Math.min(bw - 1, Math.max(0, Math.floor((x - bd.minX) / BUCKET)));
    const iz = Math.min(bh - 1, Math.max(0, Math.floor((z - bd.minZ) / BUCKET)));
    for (const o of buckets[iz * bw + ix]!) if (insideBox(o, x, y, z, 0.01)) bottom = Math.min(bottom === bottom ? bottom : Infinity, o.c[1] - o.s[1] / 2);
    for (const c of cyls) {
      if (Math.abs(y - c.c[1]) <= c.h / 2 + 0.01 && hyp2(x - c.c[0], z - c.c[2]) <= c.r + 0.01) bottom = Math.min(bottom === bottom ? bottom : Infinity, c.c[1] - c.h / 2);
    }
    return bottom;
  };
  let top = 14;
  for (const b of level.boxes) top = Math.max(top, b.c[1] + b.s[1] / 2 + 1);
  return new NavGrid({
    minX: bd.minX,
    maxX: bd.maxX,
    minZ: bd.minZ,
    maxZ: bd.maxZ,
    cell: 0.5,
    agentRadius: 0.32,
    stepHeight: 0.45,
    layers,
    blockers,
    links: navLinks(level),
    seed: [seed.x, seed.z],
    sample: () => ({ h: 0, ok: false }),
    sampleLayers: (x, z) => {
      const out: NavSample[] = [];
      let y = top;
      let ceiling = Infinity;
      for (let k = 0; k < 8 && y > -1.5; k++) {
        from.set(x, y, z);
        to.set(x, -2, z);
        res.reset();
        eng.raycastToRef(from, to, res, { membership: G.PROJECTILE, collideWith: G.STATIC });
        if (!res.hasHit) break;
        const hy = res.hitPoint.y;
        if (ceiling - hy >= HEADROOM) out.push({ h: hy, ok: res.hitNormal.y > 0.65 });
        // cast on from under the piece hit (a ray starting inside a solid would miss it)
        const b = pieceBottom(x, hy - 0.02, z);
        ceiling = b === b ? b : hy - 0.35;
        y = ceiling - 0.02;
      }
      out.reverse();
      return out;
    },
  });
}

/** Ladders (climbed both ways) and drops off generated / placed ledges, as routes for the grid to resolve. */
export function navLinks(level: Pick<BuiltLevel, 'anchors'>): NavLinkInput[] {
  const links: NavLinkInput[] = [];
  for (const l of level.anchors.ladders) {
    const fx = Math.sin(l.facing);
    const fz = Math.cos(l.facing);
    const sx = l.base.x - fx * 0.32;
    const sz = l.base.z - fz * 0.32;
    links.push({
      kind: 'ladder',
      twoWay: true,
      pts: [l.base.x - fx * 0.7, l.base.y, l.base.z - fz * 0.7, sx, l.base.y, sz, sx, l.top.y, sz, l.top.x + fx * 0.3, l.top.y, l.top.z + fz * 0.3],
    });
  }
  for (const e of level.anchors.ledges) {
    if (e.drop < DROP_MIN || e.drop > DROP_MAX || e.len < 0.8) continue;
    const n = Math.max(1, Math.floor(e.len / 1.6));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = e.a.x + (e.b.x - e.a.x) * t;
      const z = e.a.z + (e.b.z - e.a.z) * t;
      const low = e.top - e.drop;
      links.push({
        kind: 'drop',
        twoWay: false,
        pts: [x - e.nx * 0.45, e.top, z - e.nz * 0.45, x + e.nx * 0.2, e.top, z + e.nz * 0.2, x + e.nx * 0.65, low, z + e.nz * 0.65],
      });
    }
  }
  return links;
}
