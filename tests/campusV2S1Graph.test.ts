/**
 * (campus-greybox S1, lane S1, G6) LD 15 tests over the v2 section 1 (`docs/campus-greybox/briefs/S1.md` G6, job PLAN section 7):
 * the plan graph (`graph/v2/campusOps-S1.json`) matches the build (every space has walkable ground on its storey, every door
 * link has its door anchor), the light at each vantage and hide spot is logged (dark asserted only where no fitting is within its radius),
 * and S1 asks nothing of a team: a solo path from the start through the objective into C1 uses no co-op lip.
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { BoxPiece } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { hyp2 } from '../src/core/mathx';
import { LIGHT, contribution } from '../src/world/lights';

vi.resetModules();
const { flags } = await import('../src/core/flags');
flags.campusV2 = [1];
const { LevelBuilder } = await import('../src/world/levelBuilder');
const { campusOps } = await import('../src/world/maps/campusOps');
const { CAMPUS_SECTORS } = await import('../src/world/maps/campusSectors');
const { CAMPUS_COOP_LIPS } = await import('../src/world/maps/campusLips');
const { S1_HIDESPOTS, s1Lamps } = await import('../src/world/maps/campusV2/s1');
const { S1_LIGHTS } = await import('../src/world/maps/campusV2/s1Data');

interface GraphSpace {
  id: string;
  section: string;
  area: [number, number, number, number];
  storey: number;
  vantage?: { from: string; sees_pct: number };
}
interface Graph {
  spaces: GraphSpace[];
  links: { from: string; to: string; kind: string }[];
}
const graph = JSON.parse(readFileSync(new URL('../docs/sector-redesign/graph/v2/campusOps-S1.json', import.meta.url), 'utf8')) as Graph;
const s1Spaces = graph.spaces.filter((s) => s.section === 'S1');

const b = new LevelBuilder();
const lay = campusOps.build(b, 0);
const S1 = CAMPUS_SECTORS[0]!;

const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}

/** The nav grid of a rectangle from the pieces (as `tests/campusS1.test.ts`), every surface kept, 5 layers (every roof). */
function analyticNav(rect: readonly [number, number, number, number], extra: readonly NavBlocker[] = [], cell = 0.5, layers = 5): NavGrid {
  const snap = (v: number, o: number): number => o + Math.floor((v - o) / cell) * cell;
  const minX = snap(rect[0], b.bounds.minX);
  const minZ = snap(rect[1], b.bounds.minZ);
  const maxX = rect[2];
  const maxZ = rect[3];
  const near = solid.filter((p) => p.c[0] + p.s[0] > minX - 1 && p.c[0] - p.s[0] < maxX + 1 && p.c[2] + p.s[2] > minZ - 1 && p.c[2] - p.s[2] < maxZ + 1);
  const B = 4;
  const nbx = Math.ceil((maxX - minX) / B) + 1;
  const nbz = Math.ceil((maxZ - minZ) / B) + 1;
  const buckets: BoxPiece[][] = Array.from({ length: nbx * nbz }, () => []);
  for (const p of near) {
    const rad = hyp2(p.s[0], p.s[2]) / 2 + 0.01;
    const i0 = Math.max(0, Math.floor((p.c[0] - rad - minX) / B));
    const i1 = Math.min(nbx - 1, Math.floor((p.c[0] + rad - minX) / B));
    const k0 = Math.max(0, Math.floor((p.c[2] - rad - minZ) / B));
    const k1 = Math.min(nbz - 1, Math.floor((p.c[2] + rad - minZ) / B));
    for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) buckets[k * nbx + i]!.push(p);
  }
  const surf = (x: number, z: number): { h: number; bottom: number }[] => {
    const out: { h: number; bottom: number }[] = [];
    const i = Math.min(nbx - 1, Math.max(0, Math.floor((x - minX) / B)));
    const k = Math.min(nbz - 1, Math.max(0, Math.floor((z - minZ) / B)));
    for (const p of buckets[k * nbx + i]!) {
      if (Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2) out.push({ h: p.c[1] + p.s[1] / 2, bottom: p.c[1] - p.s[1] / 2 });
    }
    return out.sort((a, q) => q.h - a.h);
  };
  const blockers: NavBlocker[] = near.filter((p) => !p.overhead).map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: p.c[1] - p.s[1] / 2, top: p.c[1] + p.s[1] / 2 }));
  for (const f of b.anchors.fences) blockers.push({ cx: (f.a.x + f.b.x) / 2, cz: (f.a.z + f.b.z) / 2, hx: 0.05, hz: f.len / 2, yaw: Math.atan2(f.tx, f.tz), bottom: f.a.y, top: f.a.y + f.height });
  for (const c of b.cylinders) if (c.collide) blockers.push({ cx: c.c[0], cz: c.c[2], hx: c.r, hz: c.r, yaw: 0, bottom: c.c[1] - c.h / 2, top: c.c[1] + c.h / 2, round: true });
  blockers.push(...extra);
  const links = b.anchors.ladders.map((l) => {
    const fx = Math.sin(l.facing);
    const fz = Math.cos(l.facing);
    const sx = l.base.x - fx * 0.32;
    const sz = l.base.z - fz * 0.32;
    return { kind: 'ladder' as const, twoWay: true, pts: [l.base.x - fx * 0.7, l.base.y, l.base.z - fz * 0.7, sx, l.base.y, sz, sx, l.top.y, sz, l.top.x + fx * 0.3, l.top.y, l.top.z + fz * 0.3] };
  });
  return new NavGrid({
    minX, maxX, minZ, maxZ, cell, agentRadius: 0.32, stepHeight: 0.45, layers, blockers, links,
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

const nav = analyticNav([-42, -82, 28, -28]);

/** The analytic light level at a point (ambient + every lamp, unoccluded). */
const levelAt = (x: number, y: number, z: number): number => {
  let v = b.lights.ambientAt(x, y, z);
  for (const l of b.lights.lights) v += contribution(l, x, y, z);
  return v;
};
/** Is a lit S1 fitting within its own nominal radius `r` (the block's value; the photometric falloff has no hard edge) of the point? */
const LAMPS = s1Lamps(S1_LIGHTS);
const fittingNear = (x: number, y: number, z: number): boolean => LAMPS.some((l) => hyp2(hyp2(l.x - x, l.z - z), l.y - y) <= l.r);
const centre = (a: readonly [number, number, number, number]): [number, number] => [(a[0] + a[2]) / 2, (a[1] + a[3]) / 2];

describe('LD 15: the S1 plan graph matches the build', () => {
  it('graph matches the build: every S1 space\'s area holds a walkable nav cell on its storey', () => {
    const bad: string[] = [];
    for (const s of s1Spaces) {
      const [x0, z0, x1, z1] = s.area;
      let hit = 0;
      for (let x = Math.ceil(x0 / 0.5) * 0.5; x <= x1; x += 0.5) {
        for (let z = Math.ceil(z0 / 0.5) * 0.5; z <= z1; z += 0.5) {
          if (nav.isWalkable(nav.cellOf(x, z, s.storey)) && Math.abs(nav.heightAt(x, z, s.storey) - s.storey) < 0.6) hit++;
        }
      }
      if (hit === 0) bad.push(`${s.id} (storey ${s.storey}, area ${s.area})`);
    }
    expect(bad).toEqual([]);
  });

  it('graph matches the build: every S1 door link has a door anchor within 0.6 m of its point', () => {
    // the links carry no coordinates: the door of each (from -> to) is a plan point (S1-detail, SY:9-10)
    const DOORS: Record<string, readonly [number, number]> = {
      's1-lane>s1-gatehouse': [17, -72.5],
      's1-dyard>s1-plantroom': [-33, -40],
      's1-forecourt>s2-foyer': [-20, -34],
    };
    const doorLinks = graph.links.filter((l) => l.kind === 'door');
    expect(doorLinks.map((l) => `${l.from}>${l.to}`).sort()).toEqual(Object.keys(DOORS).sort());
    const centreOf = (d: (typeof b.anchors.doors)[number]): [number, number] => [d.hinge.x + (Math.sin(d.yaw) * d.width) / 2, d.hinge.z + (Math.cos(d.yaw) * d.width) / 2];
    for (const l of doorLinks) {
      const p = DOORS[`${l.from}>${l.to}`]!;
      const d = b.anchors.doors.find((q) => hyp2(centreOf(q)[0] - p[0], centreOf(q)[1] - p[1]) <= 0.6);
      expect(d, `door of ${l.from} -> ${l.to} at ${p}`).toBeTruthy();
    }
    // every window link has its window anchor too: the reception window (13.5, -76) (S1 v3: the rear pane E2 is fixed glass, no link)
    for (const [x, z] of [[13.5, -76]] as const) {
      expect(b.anchors.windows.some((w) => hyp2(w.c.x - x, w.c.z - z) <= 0.6), `window (${x}, ${z})`).toBe(true);
    }
  });
});

describe('LD 15: light at the vantages and hide spots (logged; dark asserted only where no fitting is within its radius)', () => {
  it('light at vantages: the level at each vantage origin (its space\'s centre on its storey) and each hide spot', () => {
    const pts: { what: string; x: number; y: number; z: number }[] = [];
    for (const s of s1Spaces) {
      if (!s.vantage) continue;
      const from = s1Spaces.find((q) => q.id === s.vantage!.from)!;
      const [x, z] = centre(from.area);
      pts.push({ what: `vantage of ${s.id} from ${from.id}`, x, y: from.storey, z });
    }
    for (const h of S1_HIDESPOTS) pts.push({ what: 'hide spot', x: h.pos.x, y: 0, z: h.pos.z });
    expect(pts.length).toBeGreaterThanOrEqual(7 + 5);
    const lines: string[] = [];
    const bad: string[] = [];
    for (const p of pts) {
      const lv = levelAt(p.x, p.y + 0.9, p.z);
      const near = fittingNear(p.x, p.y + 0.9, p.z);
      lines.push(`${p.what} (${p.x}, ${p.y}, ${p.z}): level ${lv.toFixed(3)}${near ? ' (a fitting within its r)' : ' (no fitting within its r)'}`);
      // dark is asserted only where no fitting reaches (never that a lit point is dark)
      if (!near && !(lv < LIGHT.shadow)) bad.push(`${p.what} (${p.x}, ${p.y}, ${p.z}): level ${lv}`);
    }
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(`LD 15 light (shadow ${LIGHT.shadow}):\n${lines.join('\n')}`);
    expect(bad).toEqual([]);
    // the verge and the plant room have no fitting within a lamp radius (D:174-184: dark by reason); the bin corner has (the two
    // park-W columns at z -55 spill on it, D:105) and the plant roof is under the dock lamp's nominal radius (the slab is the
    // occluder; this analytic level ignores it), so those are logged, not asserted
    for (const [what, x, y, z] of [['verge', 24, 0.9, -68], ['plant room', -38, 0.9, -36]] as const) {
      expect(fittingNear(x, y, z), what).toBe(false);
      expect(levelAt(x, y, z), what).toBeLessThan(LIGHT.shadow);
    }
    expect(pts.filter((p) => !fittingNear(p.x, p.y + 0.9, p.z)).length).toBeGreaterThanOrEqual(3);
  });
});

describe('LD 15: S1 asks nothing of a team', () => {
  it('solo past the team doors: start -> objective -> C1 near door with every co-op lip\'s top blocked as solid', () => {
    // the co-op tops (CR1, CR1-south: the canopy; CR1-yard: the plant roof; CR1-east: the pavilion's east block) as blockers
    // on the standing layer; the ground below them stays open
    const lipTops: NavBlocker[] = CAMPUS_COOP_LIPS.filter((l) => l.section === 0).map((l) => ({
      cx: (l.top.x0 + l.top.x1) / 2,
      cz: (l.top.z0 + l.top.z1) / 2,
      hx: (l.top.x1 - l.top.x0) / 2,
      hz: (l.top.z1 - l.top.z0) / 2,
      yaw: 0,
      bottom: l.top.top - 0.3,
      top: l.top.top + 1.8,
    }));
    expect(CAMPUS_COOP_LIPS.filter((l) => l.section === 0).map((l) => l.id)).toEqual(['CR1', 'CR1-south', 'CR1-yard', 'CR1-east']);
    // (S1 v3) the shut garden gate (a pair gate: two players) is a blocker across its opening too, as `campusV2S2Graph.test.ts`
    const gateShut: NavBlocker = { cx: 23, cz: -58, hx: 0.6, hz: 0.1, yaw: 0, bottom: 0, top: 2.1 };
    const solo = analyticNav([-42, -82, 28, -28], [...lipTops, gateShut]);
    const start: [number, number] = [S1.start.x, S1.start.z];
    // the objective is the courier's van; both solo routes (0, 1) reach it with the gate shut
    const obj = S1.routes[0]!.pts[S1.routes[0]!.obj]!;
    const obj1 = S1.routes[1]!.pts[S1.routes[1]!.obj]!;
    expect(solo.findPath(start, [obj1[0], obj1[1]], 1e6, 0, 0)).not.toBeNull();
    const c1: [number, number] = [-20, -34];
    // the blockers took the tops away (a stand on the canopy / plant roof / pavilion east block is no longer walkable)
    expect(nav.isWalkable(nav.cellOf(-20, -37, 4.4))).toBe(true);
    expect(solo.isWalkable(solo.cellOf(-20, -37, 4.4))).toBe(false);
    expect(solo.isWalkable(solo.cellOf(0, -32, 4.4))).toBe(false);
    // the objective is within 4 m of the route's point, and the way on to C1 is on the ground
    expect(hyp2(obj[0] - S1.objective.x, obj[1] - S1.objective.z)).toBeLessThanOrEqual(4);
    expect(solo.findPath(start, [obj[0], obj[1]], 1e6, 0, 0)).not.toBeNull();
    const onward = solo.findPath([obj[0], obj[1]], c1, 1e6, 0, 0);
    expect(onward).not.toBeNull();
    // and in through the gatehouse door to the desk side of the room, then out the door and on to C1
    expect(solo.findPath(start, [17, -75], 1e6, 0, 0)).not.toBeNull();
    expect(solo.findPath([17, -75], c1, 1e6, 0, 0)).not.toBeNull();
    // the only locked doors in S1 are C1's own two and (S1 v3) the garden gate, the one team door (routes 0 and 1 go round it)
    const locked = b.anchors.doors.filter((d) => d.locked && d.hinge.x > -40 && d.hinge.x < 26 && d.hinge.z > -80 && d.hinge.z < -29).map((d) => [d.hinge.x, d.hinge.z]);
    expect(locked).toEqual([[22.4, -58], [-20.6, -34], [-20.6, -30]]);
    void lay;
  });
});
