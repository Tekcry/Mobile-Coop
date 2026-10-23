/**
 * (guard-ai S10, "S6 close-on fix") The e2e-sectorops S6 layout on the real Warehouse geometry (`warehouseOps`, built
 * with the pure `LevelBuilder`; nav rastered from its pieces as in `tests/campusS1.test.ts`, seeded at the gate so
 * unreachable tops drop out as in `navBuild`): the last known position is the floor by the security office's DVR,
 * the two aggressive reinforcements come in at section 1's vehicle gate. The office's only way in is ~20 m round by
 * the workshop door and the office corridor, and from 4 to 10 m along it the straight line to the LKP stays at
 * 6.5-7.5 m. So "they close on it" is measured along the route (the flow field), never as a straight line.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, COVER_STANDOFF, type BoxPiece } from '../src/world/levelBuilder';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { hyp2 } from '../src/core/mathx';
import { buildCoverSegments, coverPointsFromSegments } from '../src/cover/coverData';
import { CoverGrid, coverSetFrom } from '../src/ai/coverGrid';
import { assignRoles, P_AGGRESSIVE, P_STANDARD, R_FLANK, R_POINT, R_REPORTER, RoleInput, RoleOutput, SQUAD } from '../src/ai/squadRoles';

const b = new LevelBuilder();
warehouseOps.build(b, 0);
const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}

/** Section 1's south half (yard, offices, workshop) as a nav grid built from the pieces, kept from `seed` as `navBuild` does. */
function sectionNav(rect: readonly [number, number, number, number], seed: [number, number], cell = 0.5): NavGrid {
  const snap = (v: number, o: number): number => o + Math.floor((v - o) / cell) * cell;
  const minX = snap(rect[0], b.bounds.minX);
  const minZ = snap(rect[1], b.bounds.minZ);
  const maxX = rect[2];
  const maxZ = rect[3];
  const near = solid.filter((p) => p.c[0] + p.s[0] > minX - 1 && p.c[0] - p.s[0] < maxX + 1 && p.c[2] + p.s[2] > minZ - 1 && p.c[2] - p.s[2] < maxZ + 1);
  const surf = (x: number, z: number): { h: number; bottom: number }[] => {
    const out: { h: number; bottom: number }[] = [];
    for (const p of near) if (Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2) out.push({ h: p.c[1] + p.s[1] / 2, bottom: p.c[1] - p.s[1] / 2 });
    return out.sort((a, q) => q.h - a.h);
  };
  const blockers: NavBlocker[] = near.filter((p) => !p.overhead).map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: p.c[1] - p.s[1] / 2, top: p.c[1] + p.s[1] / 2 }));
  return new NavGrid({
    minX, maxX, minZ, maxZ, cell, agentRadius: 0.32, stepHeight: 0.45, layers: 3, blockers, links: [], seed,
    sample: () => ({ h: 0, ok: false }),
    sampleLayers: (x, z) => {
      const out: NavSample[] = [];
      let ceiling = Infinity;
      for (const s of surf(x, z)) {
        if (s.h > ceiling) continue;
        if (ceiling - s.h >= 1.7) out.push({ h: s.h, ok: true });
        ceiling = Math.min(ceiling, s.bottom);
      }
      if (!out.some((o) => o.h === 0) && ceiling >= 1.7) out.push({ h: 0, ok: true });
      return out.sort((a, q) => a.h - q.h);
    },
  });
}

const S1 = WAREHOUSE_SECTORS[0]!;
const gate = S1.reinforce[0]!;
const nav = sectionNav([-6, -28, 26, -6], [gate[0], gate[1]]);
const cell = (x: number, z: number): [number, number] => nav.center(nav.nearestWalkable(x, z, 8, 0)) as [number, number];
// the e2e: the LKP on the walkable cell nearest the objective; the reinforcements at the reinforce points, the second
// 1.3 m along (`SectorMode.raised`), on their spawn cells (`EnemyManager.spawn`)
const L = cell(S1.objective.x, S1.objective.z);
const R1 = cell(gate[0], gate[1]);
const R2 = cell(S1.reinforce[1]![0] + 1.3, S1.reinforce[1]![1]);
const flow = nav.flowField([L], undefined, [0]);
/** Route metres to the LKP (the flow field the guards steer by). */
const route = (x: number, z: number): number => flow[nav.cellOf(x, z, 0)]! * nav.cell;
const straight = (x: number, z: number): number => hyp2(x - L[0], z - L[1]);

describe('S6 close-on: the e2e layout at section 1 (aggressive reinforcements, LKP in the security office)', () => {
  it('the layout matches the e2e (LKP 9.06 / 10.30 m from the spawn cells) and the way in is the long way round', () => {
    expect(straight(R1[0], R1[1])).toBeCloseTo(9.06, 1);
    expect(straight(R2[0], R2[1])).toBeCloseTo(10.3, 1);
    // ~20 m by the workshop door (x 10.4 - 11.6 in the z -18 facade), the corridor and the office door
    expect(route(R1[0], R1[1])).toBeGreaterThan(18);
    expect(route(R1[0], R1[1])).toBeLessThan(23);
  });

  it('on the route in, the straight line gains nothing from 4 to 10 m along and is 4 m nearer only after 11 m', () => {
    // follow the flow field (as `Enemy.chasePoint` does out of sight beyond 18 m of the player)
    let x = R1[0];
    let z = R1[1];
    let walked = 0;
    let lo = Infinity;
    let hi = -Infinity;
    let routeAt4 = -1;
    let routeAt10 = -1;
    let fourCloser = -1;
    const d0 = straight(x, z);
    for (let k = 0; k < 200 && route(x, z) > 0; k++) {
      const p = nav.flowNext(flow, x, z, 0);
      if (!p) break;
      const before = route(x, z);
      walked += hyp2(p[0] - x, p[1] - z);
      x = p[0];
      z = p[1];
      // every step leads in along the route
      expect(route(x, z)).toBeLessThan(before);
      const s = straight(x, z);
      if (walked >= 4 && walked <= 10) {
        lo = Math.min(lo, s);
        hi = Math.max(hi, s);
        if (routeAt4 < 0) routeAt4 = route(x, z);
        routeAt10 = route(x, z);
      }
      if (fourCloser < 0 && d0 - s > 4) fourCloser = walked;
    }
    expect(route(x, z)).toBe(0);
    // the yard by the facade, the workshop door, the workshop: 6.5 - 7.5 m in a straight line all the way, while the
    // route distance falls by ~5.5 m
    expect(lo).toBeGreaterThan(6.5);
    expect(hi).toBeLessThan(7.5);
    expect(routeAt4 - routeAt10).toBeGreaterThan(5);
    // the old straight-line bound (4 m nearer by 8 s after the spawn) needs >= 11 m of the route walked
    expect(fourCloser).toBeGreaterThan(11);
  });

  it('roles: the nearer reinforcement takes point (moving, running) to cover ahead on the route; the other flanks', () => {
    const segs = buildCoverSegments(b.boxes, b.cylinders);
    const set = coverSetFrom(coverPointsFromSegments(segs, COVER_STANDOFF).map((p) => ({ pos: { x: p.x, y: p.y, z: p.z }, normal: { x: p.nx, z: p.nz }, low: p.low })));
    const grid = CoverGrid.fromSet(set);
    const inp = new RoleInput();
    const out = new RoleOutput();
    const g = [L, R1, R2];
    const prof = [P_STANDARD, P_AGGRESSIVE, P_AGGRESSIVE];
    inp.n = 3;
    for (let i = 0; i < 3; i++) {
      inp.slot[i] = 10 + i;
      inp.x[i] = g[i]![0];
      inp.y[i] = 0;
      inp.z[i] = g[i]![1];
      inp.profile[i] = prof[i]!;
    }
    inp.lkpX = L[0];
    inp.lkpZ = L[1];
    inp.callerSlot = 10;
    inp.cover = set;
    inp.grid = grid;
    assignRoles(inp, out);
    expect(out.role[0]).toBe(R_REPORTER);
    expect(out.role[1]).toBe(R_POINT);
    expect(out.moving[1]).toBe(1);
    expect(out.run[1]).toBe(1);
    const pc = out.cover[1]!;
    expect(pc).toBeGreaterThanOrEqual(0);
    // the point's bound: in its band, at least advanceGain nearer in a straight line, and ahead on the route in
    const ds = straight(set.x[pc]!, set.z[pc]!);
    expect(ds).toBeGreaterThanOrEqual(SQUAD.pointMin);
    expect(ds).toBeLessThanOrEqual(straight(R1[0], R1[1]) - SQUAD.advanceGain);
    expect(route(set.x[pc]!, set.z[pc]!)).toBeLessThan(route(R1[0], R1[1]) - 4);
    // the other aggressive reinforcement flanks (a cover >= 60 deg off the point's bearing): it does not close in a
    // straight line, so the e2e asserts that one of them closes, not both
    expect(out.role[2]).toBe(R_FLANK);
    // in his cover he keeps it (stayBonus), so after advanceHold he walks the last stretch (`closing`)
    inp.x[1] = set.x[pc]!;
    inp.z[1] = set.z[pc]!;
    inp.inCover[1] = 1;
    inp.coverIdx[1] = pc;
    set.owner[pc] = 11;
    assignRoles(inp, out);
    expect(out.role[1]).toBe(R_POINT);
    expect(out.cover[1]).toBe(pc);
  });
});
