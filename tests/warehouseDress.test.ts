/**
 * Sector Ops Warehouse roof sheets and dressing (warehouse-lamps; Michael 2026-10-20: the open roof sections become "a
 * opaque type of corrugated plastic sheet that allow light in but cant be passed through"; "Walls + ceiling + dead-space
 * clutter"). The real warehouseOps build, checked here without `warehouseDress.ts`'s own helpers: the hall roofs are
 * closed but for the listed route openings, the sheets are solid; the dressing stays out of the light bake (the light
 * shapes are the same as without it), cuts no solid piece, keeps 1.8 m over every walkable top it hangs over; each floor
 * item stands clear of every section route and guard patrol, on the floor, with its collision.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';
import { dressReport, PATROL_CLEAR, ROOF_OPENINGS, ROUTE_CLEAR, ROUTE_OPENINGS } from '../src/world/maps/warehouseDress';
import { canonicalLightShapes } from '../src/voxel/lightShapes';
import { packShapes } from '../src/voxel/shapes';

const b = new LevelBuilder();
warehouseOps.build(b, 0);
const rep = dressReport.last!;
const before = b.boxes.slice(0, rep.firstBox);
const added = b.boxes.slice(rep.firstBox);

interface R {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}
function rect(p: BoxPiece): R {
  const c = Math.abs(Math.cos(p.yaw));
  const s = Math.abs(Math.sin(p.yaw));
  const hx = (c * p.s[0] + s * p.s[2]) / 2;
  const hz = (s * p.s[0] + c * p.s[2]) / 2;
  return { x0: p.c[0] - hx, x1: p.c[0] + hx, y0: p.c[1] - p.s[1] / 2, y1: p.c[1] + p.s[1] / 2, z0: p.c[2] - hz, z1: p.c[2] + hz };
}
const overlap = (a: R, c: R, e: number): boolean => a.x0 < c.x1 - e && a.x1 > c.x0 + e && a.y0 < c.y1 - e && a.y1 > c.y0 + e && a.z0 < c.z1 - e && a.z1 > c.z0 + e;
/** Plan distance from a point to a segment. */
function ptSeg(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)) : 0;
  return Math.sqrt((px - ax - dx * t) ** 2 + (pz - az - dz * t) ** 2);
}
/** Plan distance from a segment to a rectangle, sampled (5 cm): the nearest sample of the segment to the rectangle. */
function segToRect(ax: number, az: number, bx: number, bz: number, r: R): number {
  const n = Math.max(1, Math.ceil(Math.sqrt((bx - ax) ** 2 + (bz - az) ** 2) / 0.05));
  let d = Infinity;
  for (let k = 0; k <= n; k++) {
    const x = ax + ((bx - ax) * k) / n;
    const z = az + ((bz - az) * k) / n;
    d = Math.min(d, Math.sqrt(Math.max(r.x0 - x, 0, x - r.x1) ** 2 + Math.max(r.z0 - z, 0, z - r.z1) ** 2));
  }
  return d;
}

const solid = b.boxes.filter((p) => p.collide && !p.detail);
const visibleSolid = solid.filter((p) => p.visible !== false);

describe('roof sheets', () => {
  it('the hall roofs are closed but for the route openings (0.25 m grid at the roof line)', () => {
    const open: string[] = [];
    for (let x = -23.875; x < 24; x += 0.25) {
      for (let z = -17.875; z < 18; z += 0.25) {
        const covered = b.boxes.some((p) => {
          if (p.detail) return false;
          const r = rect(p);
          return r.y0 >= 5.7 && r.y0 <= 6.35 && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
        });
        if (covered) continue;
        if (ROUTE_OPENINGS.some(([x0, x1, z0, z1]) => x >= x0 - 0.15 && x <= x1 + 0.15 && z >= z0 - 0.15 && z <= z1 + 0.15)) continue;
        open.push(`(${x}, ${z})`);
      }
    }
    expect(open.slice(0, 20)).toEqual([]);
  });

  it('each opening has a solid, unbaked sheet (collision only, no ledge)', () => {
    for (const [x0, x1, z0, z1] of ROOF_OPENINGS) {
      const s = added.find((p) => p.collide && p.visible === false && Math.abs(p.c[0] - (x0 + x1) / 2) < 1e-6 && Math.abs(p.c[2] - (z0 + z1) / 2) < 1e-6);
      expect(s, `sheet ${x0}..${x1}, ${z0}..${z1}`).toBeDefined();
      expect(s!.noLedge && s!.overhead).toBe(true);
    }
    expect(b.sheets.length).toBe(ROOF_OPENINGS.length);
  });
});

describe('dressing', () => {
  it('stays out of the light bake: the light shapes are those of the level without it', () => {
    const a = packShapes(canonicalLightShapes(b.boxes, b.cylinders, 'warehouseOps'));
    const c = packShapes(canonicalLightShapes(before, b.cylinders, 'warehouseOps'));
    expect(a.length).toBe(c.length);
    expect(Array.from(a).every((v, i) => v === c[i])).toBe(true);
    expect(added.every((p) => p.detail || p.visible === false)).toBe(true);
  });

  it('no detail piece cuts a solid piece; every overhead one keeps 1.8 m over the walkable tops under it', () => {
    const bad: string[] = [];
    for (const p of added) {
      if (!p.detail) continue;
      const r = rect(p);
      const hit = visibleSolid.find((q) => overlap(r, rect(q), 0.003));
      if (hit) bad.push(`${p.color} at (${p.c.map((v) => v.toFixed(2)).join(', ')}) cuts a piece at (${hit.c.join(', ')})`);
      if (r.y0 < 2.4) continue;
      let top = 0;
      for (const q of visibleSolid) {
        const t = rect(q);
        if (t.y1 <= r.y0 + 0.01 && t.x0 < r.x1 && t.x1 > r.x0 && t.z0 < r.z1 && t.z1 > r.z0) top = Math.max(top, t.y1);
      }
      if (r.y0 - top < 1.8 - 1e-6) bad.push(`${p.color} at (${p.c.map((v) => v.toFixed(2)).join(', ')}): ${(r.y0 - top).toFixed(2)} m over a top at ${top.toFixed(2)}`);
    }
    expect(bad).toEqual([]);
  });

  it('floor clutter: dead space only (clear of every route and patrol), on the floor, with its collision', () => {
    expect(rep.clutter.length).toBeGreaterThan(0);
    const routes = WAREHOUSE_SECTORS.flatMap((s) => s.routes.flatMap((r) => r.pts.slice(1).map((q, k) => [r.pts[k]![0], r.pts[k]![1], q[0], q[1]] as const)));
    const patrols = WAREHOUSE_SECTORS.flatMap((s) =>
      s.guards.flatMap((g) => {
        const rt = g.route ?? [[g.x, g.z]];
        return rt.map((p, k) => [p[0], p[1], rt[(k + 1) % rt.length]![0], rt[(k + 1) % rt.length]![1]] as const);
      }),
    );
    const bad: string[] = [];
    for (const c of rep.clutter) {
      const r: R = { x0: c.x - c.w / 2, x1: c.x + c.w / 2, y0: 0.03, y1: c.h, z0: c.z - c.d / 2, z1: c.z + c.d / 2 };
      const at = `${c.kind} (${c.x}, ${c.z})`;
      const route = Math.min(...routes.map(([ax, az, bx, bz]) => segToRect(ax, az, bx, bz, r)));
      const patrol = Math.min(...patrols.map(([ax, az, bx, bz]) => segToRect(ax, az, bx, bz, r)));
      if (route < ROUTE_CLEAR) bad.push(`${at}: ${route.toFixed(2)} m from a route`);
      if (patrol < PATROL_CLEAR) bad.push(`${at}: ${patrol.toFixed(2)} m from a patrol`);
      const col = added.find((p) => p.collide && p.visible === false && Math.abs(p.c[0] - c.x) < 1e-6 && Math.abs(p.c[2] - c.z) < 1e-6);
      if (!col || !col.noLedge) bad.push(`${at}: no collision box`);
      if (visibleSolid.some((q) => overlap(r, rect(q), 0.003))) bad.push(`${at}: cuts a piece`);
      const floor = visibleSolid.some((q) => {
        const t = rect(q);
        return t.y1 > 0 && t.y1 <= 0.035 && t.x0 <= r.x0 && t.x1 >= r.x1 && t.z0 <= r.z0 && t.z1 >= r.z1;
      });
      if (!floor) bad.push(`${at}: no floor under it`);
      // and no guard's post sits on it
      for (const s of WAREHOUSE_SECTORS) for (const g of s.guards) if (ptSeg(g.x, g.z, c.x, c.z, c.x, c.z) < PATROL_CLEAR) bad.push(`${at}: on a guard's post`);
    }
    expect(bad).toEqual([]);
    if (process.env.DRESS_PRINT) console.info(JSON.stringify({ pieces: rep.pieces, dropped: rep.dropped, clutter: rep.clutter }, null, 1));
  });

  it('wall, ceiling and floor detail of each kind went in', () => {
    for (const k of ['pipe run', 'cable tray', 'sign', 'fire point', 'hazard stripe', 'roller door', 'truss', 'duct', 'floor lane', 'bay plate']) expect(rep.pieces[k] ?? 0, k).toBeGreaterThan(0);
  });
});
