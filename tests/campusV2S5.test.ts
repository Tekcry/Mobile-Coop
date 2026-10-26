/**
 * (campus-greybox S5, `docs/campus-greybox/briefs/S5.md`) Section 5's v2 layout, flag on (`flags.campusV2 = [5]`): the
 * geometry of P1 (the shell re-cut: ground, L1, the low roof, the roof, the grounds), the rooms, the sealed section and
 * the dress check. The map is built undressed with the pure `LevelBuilder` (the `tests/campusV2.test.ts` loader); the nav
 * is the live test's analytic raster (`tests/campusS5.test.ts` `analyticNav`, copied: a test file is never imported).
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { readFileSync } from 'node:fs';
import { hyp2 } from '../src/core/mathx';
import { ropeRoom } from '../src/game/teamMoves';

const PI = Math.PI;

/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const sectors = await import('../src/world/maps/campusSectors');
  const sectorStage = await import('../src/game/sectorStage');
  const { buildCampus, campusOps } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s5 = await import('../src/world/maps/campusV2/s5');
  const s5Data = await import('../src/world/maps/campusV2/s5Data');
  const s5Dress = await import('../src/world/maps/campusV2/s5Dress');
  return { sectors, sectorStage, buildCampus, campusOps, LevelBuilder, s5, s5Data, s5Dress };
}

const m = await loadCampus([5]);
const { S5_BOX, S5_DOORS, S5_FLIGHTS, S5_HALL_FLIGHTS, S5_HALL_LANDING, S5_HALL_RAIL_X, S5_L1, S5_ROOF, S5_ROOMS, S5_BULKHEAD_LIGHTS, S5_ROPE_EDGE } = m.s5;
const b: LB = new m.LevelBuilder();
const lay = m.buildCampus(b, { dress: false });
const S5 = m.sectors.CAMPUS_SECTORS[4]!;
/** The S5 footprint. */
const FOOT = { x0: -70, x1: -26, z0: 18, z1: 70 };
const inFoot = (x: number, z: number): boolean => x >= FOOT.x0 && x <= FOOT.x1 && z >= FOOT.z0 && z <= FOOT.z1;

/** The collision pieces as axis-aligned boxes (every S5 piece is yaw 0 but the pitched rails; quarter turns swapped to plain). */
const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
const x0 = (p: BoxPiece): number => p.c[0] - p.s[0] / 2;
const x1 = (p: BoxPiece): number => p.c[0] + p.s[0] / 2;
const z0 = (p: BoxPiece): number => p.c[2] - p.s[2] / 2;
const z1 = (p: BoxPiece): number => p.c[2] + p.s[2] / 2;
/** Pieces overlapping the plan rect (open, by eps) with a part between y0 and y1. */
const inRect = (ax: number, bx: number, az: number, bz: number, y0 = -1, y1 = 99, eps = 1e-6): BoxPiece[] =>
  solid.filter((p) => x1(p) > ax + eps && x0(p) < bx - eps && z1(p) > az + eps && z0(p) < bz - eps && top(p) > y0 + eps && bottom(p) < y1 - eps);
/** The box with these extents [x0, x1, y0, y1, z0, z1] (1 mm). */
const boxIs = (p: BoxPiece, e: readonly number[]): boolean => [x0(p), x1(p), bottom(p), top(p), z0(p), z1(p)].every((v, k) => Math.abs(v - e[k]!) < 1e-3);
const findBox = (e: readonly number[]): BoxPiece | undefined => solid.find((p) => boxIs(p, e));
/** A solid piece holds the point (x, y, z) (1 mm in). */
const solidAt = (x: number, y: number, z: number): boolean => solid.some((p) => x > x0(p) + 1e-3 && x < x1(p) - 1e-3 && z > z0(p) + 1e-3 && z < z1(p) - 1e-3 && y > bottom(p) + 1e-3 && y < top(p) - 1e-3);
/**
 * A wall line is built: along x at z = `at` (else along z at x = `at`), every 0.1 m from a0 to a1 a solid holds the line
 * (within 0.15 m across it) at height y, except inside the listed gaps (open at y).
 */
function lineBuilt(alongX: boolean, at: number, a0: number, a1: number, y: number, gaps: readonly (readonly [number, number])[] = []): string[] {
  const bad: string[] = [];
  for (let a = a0 + 0.05; a < a1 - 0.04; a += 0.1) {
    const gap = gaps.some(([g0, g1]) => a > g0 + 0.02 && a < g1 - 0.02);
    const edge = gaps.some(([g0, g1]) => Math.abs(a - g0) <= 0.02 || Math.abs(a - g1) <= 0.02);
    if (edge) continue;
    let hit = false;
    for (let d = -0.15; d <= 0.15 + 1e-9 && !hit; d += 0.05) hit = alongX ? solidAt(a, y, at + d) : solidAt(at + d, y, a);
    if (hit === gap) bad.push(`${alongX ? 'x' : 'z'} ${a.toFixed(2)} ${gap ? 'not open' : 'open'}`);
  }
  return bad;
}

/** The stair ramps as surfaces: (x, z) on a flight -> its height. */
function rampAt(x: number, z: number): number[] {
  const out: number[] = [];
  for (const f of S5_FLIGHTS) {
    if (Math.abs(x - f.cx) > f.w / 2 || Math.abs(z - f.cz) > f.len / 2) continue;
    const t = Math.abs(f.yaw) < 1e-6 ? (z - (f.cz - f.len / 2)) / f.len : (f.cz + f.len / 2 - z) / f.len;
    out.push(f.y0 + f.rise * t);
  }
  return out;
}

/** An analytic layered nav grid over a rectangle (as the live test's, with the stair ramps as surfaces). */
function analyticNav(rect: readonly [number, number, number, number], cell = 0.5): NavGrid {
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
      if (Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2) out.push({ h: top(p), bottom: bottom(p) });
    }
    for (const h of rampAt(x, z)) out.push({ h, bottom: h - 0.35 });
    return out.sort((a, q) => q.h - a.h);
  };
  const blockers: NavBlocker[] = near.filter((p) => !p.overhead).map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: bottom(p), top: top(p) }));
  for (const f of b.anchors.fences) blockers.push({ cx: (f.a.x + f.b.x) / 2, cz: (f.a.z + f.b.z) / 2, hx: 0.05, hz: f.len / 2, yaw: Math.atan2(f.tx, f.tz), bottom: f.a.y, top: f.a.y + f.height });
  for (const c of b.cylinders) if (c.collide) blockers.push({ cx: c.c[0], cz: c.c[2], hx: c.r, hz: c.r, yaw: 0, bottom: c.c[1] - c.h / 2, top: c.c[1] + c.h / 2, round: true });
  const links = b.anchors.ladders.map((l) => {
    const fx = Math.sin(l.facing);
    const fz = Math.cos(l.facing);
    const sx = l.base.x - fx * 0.32;
    const sz = l.base.z - fz * 0.32;
    return { kind: 'ladder' as const, twoWay: true, pts: [l.base.x - fx * 0.7, l.base.y, l.base.z - fz * 0.7, sx, l.base.y, sz, sx, l.top.y, sz, l.top.x + fx * 0.3, l.top.y, l.top.z + fz * 0.3] };
  });
  return new NavGrid({
    minX, maxX, minZ, maxZ, cell, agentRadius: 0.32, stepHeight: 0.45, layers: 5, blockers, links,
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
const nav = analyticNav([-72, 16, -16, 68]);
const onNav = (x: number, z: number, y = 0): boolean => nav.isWalkable(nav.cellOf(x, z, y)) && Math.abs(nav.heightAt(x, z, y) - y) < 0.6;
const pathLen = (a: readonly number[], c: readonly number[]): number | null => {
  const path = nav.findPath([a[0]!, a[1]!], [c[0]!, c[1]!], 200000, a[2] ?? 0, c[2] ?? 0);
  if (!path) return null;
  let len = 0;
  let q: [number, number] = [a[0]!, a[1]!];
  for (const w of path) {
    len += hyp2(w[0] - q[0], w[1] - q[1]);
    q = [w[0], w[1]];
  }
  return len;
};
/** A walkable nav cell on floor y within r of (x, z): a switch or key stands on a wall, its user beside it. */
const nearNav = (x: number, z: number, y: number, r = 1.1): boolean => {
  for (let dx = -r; dx <= r; dx += 0.25) for (let dz = -r; dz <= r; dz += 0.25) if (hyp2(dx, dz) <= r && onNav(x + dx, z + dz, y)) return true;
  return false;
};
const doorCentre = (d: (typeof b.anchors.doors)[number]): [number, number] => [d.hinge.x + Math.sin(d.yaw) * d.width * 0.5, d.hinge.z + Math.cos(d.yaw) * d.width * 0.5];
/** The door anchors whose opening centre is within r of (x, z) on floor y. */
const doorsAt = (x: number, z: number, y = 0, r = 0.1) => b.anchors.doors.filter((d) => Math.abs(d.hinge.y - y) < 0.05 && hyp2(doorCentre(d)[0] - x, doorCentre(d)[1] - z) < r);
/** One door anchor at (x, z, y): 1.2 wide, 2.1 high. */
function door12(x: number, z: number, y = 0) {
  const ds = doorsAt(x, z, y);
  expect(ds.length, `door at (${x}, ${y}, ${z})`).toBe(1);
  expect(ds[0]!.width).toBeCloseTo(1.2);
  expect(ds[0]!.height).toBeCloseTo(2.1);
  return ds[0]!;
}
/** The ladder anchor whose base is (x, y, z) (5 cm). */
const ladderAt = (x: number, y: number, z: number) => b.anchors.ladders.find((l) => hyp2(l.base.x - x, l.base.z - z) < 0.05 && Math.abs(l.base.y - y) < 0.05);

describe('S5 v2 P1: the build and the copy marker', () => {
  it('S5_V2_COPY is false; the section is the v2 one; the flag-on campus dresses (dressS5 finds every skinned box)', async () => {
    expect(m.s5Data.S5_V2_COPY).toBe(false);
    expect(S5).toBe(m.s5Data.S5_SECTOR);
    const bd: LB = new m.LevelBuilder();
    expect(() => m.campusOps.build(bd, 0)).not.toThrow();
  });
});

describe('S5 v2 P1 ground (y 0)', () => {
  it('P1 hall and screens passage: no wall at x -38 below 4.0 but the screen (2.2, z 21..29, noLedge); the 3.5 m opening at z 32; two settles 1.2; the alcove open to the hall', () => {
    const onLine = inRect(-38.15, -37.85, 18.3, 31.85, 0, 4.0);
    expect(onLine.length).toBe(1);
    expect(boxIs(onLine[0]!, [-38.1, -37.9, 0, 2.2, 21, 29])).toBe(true);
    expect(onLine[0]!.noLedge).toBe(true);
    // the screen is open 3 m at each end (z 18..21 and 29..32)
    expect(inRect(-38.15, -37.85, 18.2, 21, 0, 2.5)).toEqual([]);
    expect(inRect(-38.15, -37.85, 29, 31.85, 0, 2.5)).toEqual([]);
    // the opening x -36.75..-33.25 on z 32, the stubs either side
    expect(inRect(-36.75, -33.25, 31.8, 32.2, 0, 4.0)).toEqual([]);
    expect(lineBuilt(true, 32, -46, -32, 1.0, [[-43.6, -42.4], [-36.75, -33.25]])).toEqual([]);
    for (const e of [[-32.6, -32.0, 0, 1.2, 22.5, 24], [-32.6, -32.0, 0, 1.2, 26.5, 28]]) expect(findBox(e), `settle ${e}`).toBeTruthy();
    // the alcove (the old west passage): no box on z 32 over x -50..-46 below 2.1; the passage door is gone
    expect(inRect(-49.85, -46.15, 31.8, 32.2, 0, 2.1)).toEqual([]);
    expect(doorsAt(-48, 32, 0, 0.6)).toEqual([]);
    // the drawing-room door (-50, 33) swings into the drawing room (west); the old doors on x -38 are gone
    expect(door12(-50, 33).swing).toBe(-1);
    expect(doorsAt(-38, 22, 0, 0.6)).toEqual([]);
    expect(doorsAt(-38, 33.5, 0, 0.6)).toEqual([]);
    expect(onNav(-35, 25) && onNav(-48, 33)).toBe(true);
    expect(pathLen([-35, 20, 0], [-48, 33, 0])).not.toBeNull();
  });

  it('P1 back hall, anteroom, strongroom, shaft: the walls on their lines; the side, kitchen and shaft doors; the day gate open; the anteroom clear 8.8 x 6.3; the glazed screen; the audit table; the shaft ladder', () => {
    // walls (+-0.15 of the line, at 1.0 over the floor; doors open)
    expect(lineBuilt(false, -37, 32.2, 38.5, 1.0, [[33.4, 34.6]]), 'back hall west x -37').toEqual([]);
    expect(lineBuilt(false, -33, 32.2, 43.85, 1.0, [[35.9, 37.1]]), 'kitchen west x -33').toEqual([]);
    expect(lineBuilt(true, 38.5, -45.9, -37.1, 1.0, [[-43.6, -42.4], [-40.1, -38.9]]), 'anteroom north z 38.5').toEqual([]);
    expect(lineBuilt(false, -40.5, 38.6, 43.85, 1.0), 'strongroom east x -40.5').toEqual([]);
    expect(lineBuilt(false, -38.5, 38.6, 40.4, 1.0), 'shaft east x -38.5').toEqual([]);
    expect(lineBuilt(true, 40.5, -40.4, -38.6, 1.0), 'shaft north z 40.5').toEqual([]);
    // the doors: side door (opens into the anteroom), kitchen door, shaft door (leaf into the anteroom)
    expect(door12(...S5_DOORS.anteSide, 0).swing).toBe(-1);
    door12(...S5_DOORS.kitchenWest, 0);
    door12(...S5_DOORS.anteShaft, 0);
    expect(S5_DOORS.anteSide).toEqual([-37, 34]);
    expect(S5_DOORS.kitchenWest).toEqual([-33, 36.5]);
    expect(S5_DOORS.anteShaft).toEqual([-39.5, 38.5]);
    // the day gate: no door anchor within 0.6 m, the gap open
    expect(S5_DOORS.dayGate).toEqual([-43, 38.5]);
    expect(doorsAt(-43, 38.5, 0, 0.6)).toEqual([]);
    expect(inRect(-43.55, -42.45, 38.3, 38.7, 0, 2.1)).toEqual([]);
    expect(pathLen([-43, 36.5, 0], [-43, 42.2, 0])).not.toBeNull();
    // the anteroom clear 8.8 x 6.3 (D:22): x -45.9..-37.1, z 32.1..38.4, nothing in it but the audit table
    const inside = inRect(-45.9, -37.1, 32.1, 38.4, 0, 4.0);
    expect(inside.length).toBe(1);
    expect(boxIs(inside[0]!, [-43.5, -41.5, 0, 0.9, 34, 35])).toBe(true);
    expect(-37.1 - -45.9).toBeCloseTo(8.8);
    expect(38.4 - 32.1).toBeCloseTo(6.3);
    // the glazed screen z 34.5..37.5 on x -46 (sill 0.5, 1.55 high): two clear panes either side of the kept 1.6 sash
    const panes = b.boxes.filter((p) => p.glass === 'clear' && Math.abs(p.c[0] - -46) < 0.01 && p.c[2] > 34 && p.c[2] < 38 && p.c[1] < 3);
    expect(panes.map((p) => [z0(p), z1(p), bottom(p), top(p)].map((v) => Math.round(v * 100) / 100)).sort((p, q) => p[0]! - q[0]!)).toEqual([
      [34.5, 34.7, 0.5, 2.05],
      [36.3, 37.5, 0.5, 2.05],
    ]);
    expect(inRect(-46.1, -45.9, 34.5, 37.5, 0.55, 2.0).filter((p) => !p.glass)).toEqual([]);
    expect(b.anchors.windows.some((w) => hyp2(w.c.x + 46, w.c.z - 35.5) < 0.1 && w.open && !w.breakable && w.sillHeight === 0.5 && w.w === 1.6)).toBe(true);
    // the shaft ladder: on the shaft's west side, G to L1, onto the cage's west strip; the shaft floor and the archive joined by nav
    const lad = ladderAt(-40.25, 0, 39.6)!;
    expect(lad).toBeTruthy();
    expect(lad.top.y).toBe(S5_L1);
    expect(lad.facing).toBeCloseTo(-PI / 2);
    expect(onNav(-39.5, 39.5, 0)).toBe(true);
    expect(pathLen([-39.5, 39.5, 0], [-41.0, 39.6, S5_L1])).not.toBeNull();
    expect(pathLen([-39.5, 39.5, 0], [-43, 37, S5_L1])).not.toBeNull();
    // the strongroom (-46..-40.5, 38.5..44) and its token
    expect(S5_BOX.strongroom).toEqual([-46, 38.5, -40.5, 44]);
    expect(S5_BOX.anteroom).toEqual([-46, 32, -37, 38.5]);
    expect(S5_BOX.shaft).toEqual([-40.5, 38.5, -38.5, 40.5]);
  });

  it('P1 kitchen and wing: the kitchen clear 6.75 (7 on centre lines); no G box on x -32 for z 32..44; the lobby doors apart and off each other\'s line; the flue ladder links the plant room to the low roof', () => {
    // clear width: the x -33 wall's east face to the x -26 wall's west face
    const west = inRect(-33.05, -32.8, 39, 40, 0, 4.0);
    const east = inRect(-26.3, -25.8, 39, 40, 0, 4.0);
    expect(west.length).toBe(1);
    expect(east.length).toBe(1);
    expect(x0(east[0]!) - x1(west[0]!)).toBeCloseTo(6.75);
    expect(inRect(-32.15, -31.85, 32.2, 43.8, 0, 4.0)).toEqual([]);
    // the lobby's doors on z 26.5 and z 32
    const s = door12(...S5_DOORS.lobbySouth, 0);
    const n = door12(...S5_DOORS.lobbyNorth, 0);
    expect(S5_DOORS.lobbySouth).toEqual([-30.5, 26.5]);
    expect(S5_DOORS.lobbyNorth).toEqual([-27.5, 32]);
    expect(hyp2(doorCentre(s)[0] - doorCentre(n)[0], doorCentre(s)[1] - doorCentre(n)[1])).toBeGreaterThanOrEqual(2.0);
    // not facing: the two openings do not overlap along x
    expect(Math.abs(doorCentre(s)[0] - doorCentre(n)[0])).toBeGreaterThan(1.2);
    expect(lineBuilt(true, 26.5, -31.85, -26.15, 1.0, [[-31.1, -29.9]])).toEqual([]);
    expect(lineBuilt(true, 32, -31.85, -26.15, 1.0, [[-28.1, -26.9]])).toEqual([]);
    // the flue ladder under the plant hatch, G to the low roof
    const lad = ladderAt(-27, 0, 19.85)!;
    expect(lad).toBeTruthy();
    expect(lad.top.y).toBe(S5_L1);
    expect(pathLen([-28.5, 22.5, 0], [-29, 30, S5_L1])).not.toBeNull();
  });

  it('P1 hall stair: two flights of 13 risers (riser 0.15-0.19, going 0.24-0.355), landing top 2.1, the foot 2.2 m inside the front door, rails both sides; the gallery gap x -46.2..-43.8; a nav path hall -> gallery', () => {
    expect(S5_HALL_FLIGHTS.length).toBe(2);
    for (const f of S5_HALL_FLIGHTS) {
      expect(f.steps).toBe(13);
      expect(f.w).toBeCloseTo(2.4);
      const riser = f.rise / f.steps;
      const going = f.len / (f.steps - 1);
      expect(riser).toBeGreaterThanOrEqual(0.15);
      expect(riser).toBeLessThanOrEqual(0.19);
      expect(going).toBeGreaterThanOrEqual(0.24);
      expect(going).toBeLessThanOrEqual(0.355);
      expect(S5_FLIGHTS).toContain(f);
    }
    const [f1, f2] = S5_HALL_FLIGHTS as [(typeof S5_HALL_FLIGHTS)[number], (typeof S5_HALL_FLIGHTS)[number]];
    expect(f1.cz - f1.len / 2 - 18).toBeCloseTo(2.2);
    expect(f1.y0 + f1.rise).toBeCloseTo(S5_HALL_LANDING.top);
    expect(f2.y0).toBeCloseTo(S5_HALL_LANDING.top);
    expect(f2.y0 + f2.rise).toBeCloseTo(S5_L1);
    expect(f1.cz + f1.len / 2).toBeCloseTo(S5_HALL_LANDING.z0);
    expect(f2.cz - f2.len / 2).toBeCloseTo(S5_HALL_LANDING.z1);
    expect(f2.cz + f2.len / 2).toBeCloseTo(29.0);
    expect(findBox([-46.2, -43.8, 1.9, 2.1, 23.6, 25.6])).toBeTruthy();
    // the rails: pitched along each flight and flat on the landing, at x -46.25 and -43.75, 1.1 high, noLedge
    for (const x of S5_HALL_RAIL_X) {
      const rails = b.boxes.filter((p) => Math.abs(p.c[0] - x) < 1e-6 && Math.abs(p.s[0] - 0.1) < 1e-6 && Math.abs(p.s[1] - 1.1) < 1e-6 && p.c[2] > 20 && p.c[2] < 29.5);
      expect(rails.length, `rails at x ${x}`).toBe(3);
      expect(rails.filter((p) => Math.abs(p.pitch) > 1e-3).length).toBe(2);
      expect(rails.every((p) => p.noLedge)).toBe(true);
    }
    // the gallery's rail gap at the stair head
    expect(inRect(-46.2, -43.8, 28.95, 29.15, S5_L1, S5_L1 + 1.1)).toEqual([]);
    expect(findBox([-47, -46.2, S5_L1, S5_L1 + 1.1, 29, 29.1])).toBeTruthy();
    expect(findBox([-43.8, -41, S5_L1, S5_L1 + 1.1, 29, 29.1])).toBeTruthy();
    expect(pathLen([-45, 19.5, 0], [-45, 30.5, S5_L1])).not.toBeNull();
  });

  it('P1 grounds: hedges 1.2, the balustrade 1.2 with its two gaps, the deck top 0.3, the control room\'s garden door', () => {
    for (const z of [26, 34]) {
      const h = findBox([-68, -58, 0, 1.2, z, z + 2])!;
      expect(h, `hedge z ${z}`).toBeTruthy();
      expect(h.noLedge).toBeFalsy();
    }
    for (const [a, c] of [[-70, -64.6], [-63.4, -44.6], [-43.4, -26]] as const) expect(findBox([a, c, 0, 1.2, 49.9, 50.1]), `balustrade ${a}`).toBeTruthy();
    expect(inRect(-64.6, -63.4, 49.8, 50.2, 0, 2)).toEqual([]);
    expect(inRect(-44.6, -43.4, 49.8, 50.2, 0, 2)).toEqual([]);
    expect(S5_BOX.deckTop).toBe(0.3);
    expect(findBox([-47, -43, 0, 0.3, 58, 66])).toBeTruthy();
    expect(lay.navSeeds!.some((v) => Math.abs(v.x + 45) < 1e-6 && Math.abs(v.y - 0.3) < 1e-6 && Math.abs(v.z - 62) < 1e-6)).toBe(true);
    expect(door12(...S5_DOORS.ctlGarden, 0).swing).toBe(-1);
    expect(S5_DOORS.ctlGarden).toEqual([-56, 22]);
    expect(pathLen([-53, 25, 0], [-60, 22, 0])).not.toBeNull();
  });
});

describe('S5 v2 P1 L1 (y 4.2)', () => {
  it('P1 L1: the closed strip; kp-arch at (-38, 35.5, 4.2); the cage walls and pg-arch opening z 39..40.2; the row, the shelving and the chest; the rooflight; the boardroom-CEO door; archive -> roof by the rooflight ladder', () => {
    expect(findBox([-38, -36.5, S5_L1, S5_ROOF, 38, 44])?.noLedge).toBe(true);
    expect(S5_DOORS.kpArch).toEqual([-38, 35.5]);
    door12(-38, 35.5, S5_L1);
    expect(doorsAt(-38, 41, S5_L1, 0.6)).toEqual([]);
    expect(lineBuilt(false, -38, 32.2, 43.85, 5.0, [[34.9, 36.1]]), 'archive east x -38 at L1').toEqual([]);
    // the cage x -41.5..-38, z 38..41: steel walls, the pair gate's opening z 39.0..40.2 in its west face
    expect(S5_BOX.cage).toEqual([-41.5, 38, -38, 41]);
    expect(lineBuilt(false, -41.45, 38.1, 40.9, 5.0, [[39.0, 40.2]]), 'cage west').toEqual([]);
    expect(lineBuilt(true, 38.05, -41.4, -38.1, 5.0), 'cage south').toEqual([]);
    expect(lineBuilt(true, 40.95, -41.4, -38.1, 5.0), 'cage north').toEqual([]);
    door12(-41.45, 39.6, S5_L1);
    expect(hyp2(S5_DOORS.pgArch[0] - -41.45, S5_DOORS.pgArch[1] - 39.6)).toBeLessThan(0.1);
    // the L1 slab's shaft hole follows the shaft
    expect(inRect(-40.45, -38.55, 38.55, 40.45, S5_L1 - 0.15, S5_L1 + 0.1)).toEqual([]);
    // the stacks, the shelving and the chest
    for (const [a, c, d, e] of S5_BOX.stacks) expect(findBox([a, d, S5_L1, S5_L1 + 2.2, c, e])?.noLedge, `stack ${a} ${c}`).toBe(true);
    expect(findBox([-44.5, -43, S5_L1, S5_L1 + 1.2, 34.5, 35.5])).toBeTruthy();
    // the rooflight: no slab over x -45.85..-44.65, z 32.4..33.6 (the open hatch); the north 1.8 m the clear wired glass
    expect(inRect(-45.85, -44.65, 32.4, 33.6, S5_ROOF - 0.15, S5_ROOF + 0.1)).toEqual([]);
    const lid = inRect(-45.85, -44.65, 33.6, 35.4, S5_ROOF - 0.15, S5_ROOF + 0.1);
    expect(lid.length).toBe(1);
    expect(lid[0]!.glass).toBe('clear');
    expect(lid[0]!.overhead && lid[0]!.noLedge).toBe(true);
    expect(boxIs(lid[0]!, [-45.85, -44.65, 8.35, 8.4, 33.6, 35.4])).toBe(true);
    const rl = ladderAt(-45.65, S5_L1, 33.0)!;
    expect(rl).toBeTruthy();
    expect(rl.top.y).toBe(S5_ROOF);
    // the boardroom <-> CEO suite door
    door12(...S5_DOORS.boardCeo, S5_L1);
    expect(pathLen([-53, 25, S5_L1], [-53, 36, S5_L1])).not.toBeNull();
    expect(pathLen([-42, 37, S5_L1], [-44, 30, S5_ROOF])).not.toBeNull();
  });
});

describe('S5 v2 P1 roof and low roof', () => {
  it('P1 roof and low roof: the coping 0.2 at x -32, z 30..33; the parapet elsewhere 1.1; the gutter kerb 0.2 on z 44; both hatch holes; the rim gate and the cleaning ladder; the west rappel; the bulkhead\'s two clear panes', () => {
    const cop = findBox([-32.15, -31.85, S5_ROOF, S5_ROOF + 0.2, 30, 33])!;
    expect(cop).toBeTruthy();
    expect(cop.noLedge).toBeFalsy();
    for (const [a, c] of [[18, 30], [33, 44]] as const) expect(findBox([-32.2, -32, S5_ROOF, S5_ROOF + 1.1, a, c])?.noLedge, `parapet z ${a}`).toBe(true);
    expect(inRect(-32.25, -31.8, 30, 33, S5_ROOF + 0.25, S5_ROOF + 1.2)).toEqual([]);
    const kerb = findBox([-32, -26, S5_L1, S5_L1 + 0.2, 43.85, 44.15])!;
    expect(kerb).toBeTruthy();
    expect(kerb.noLedge).toBeFalsy();
    expect(inRect(-31.8, -26.25, 43.75, 44.2, S5_L1 + 0.25, S5_L1 + 1.2)).toEqual([]);
    // the low roof's two hatch holes; the smoke hatch's kerb (west piece a ledge, the others noLedge)
    expect(inRect(-27.6, -26.4, 18.9, 20.1, S5_L1 - 0.15, S5_L1 + 0.1)).toEqual([]);
    expect(inRect(-28.6, -27.4, 41.4, 42.6, S5_L1 - 0.15, S5_L1 + 0.3)).toEqual([]);
    expect(findBox([-28.7, -28.6, S5_L1, S5_L1 + 0.2, 41.3, 42.7])?.noLedge).toBeFalsy();
    const rim = inRect(-28.75, -27.25, 41.25, 42.75, S5_L1 + 0.01, S5_L1 + 0.3);
    expect(rim.length).toBe(4);
    expect(rim.filter((p) => !p.noLedge).length).toBe(1);
    // the well rim's gate z 35.4..36.6 and the cleaning ladder 0 -> 8.4
    expect(inRect(-50.05, -49.85, 35.4, 36.6, S5_ROOF, S5_ROOF + 1.1)).toEqual([]);
    expect(findBox([-50, -49.9, S5_ROOF, S5_ROOF + 1.1, 34, 35.4])).toBeTruthy();
    expect(findBox([-50, -49.9, S5_ROOF, S5_ROOF + 1.1, 36.6, 38])).toBeTruthy();
    const cl = ladderAt(-49.65, 0, 36)!;
    expect(cl).toBeTruthy();
    expect(cl.top.y).toBe(S5_ROOF);
    expect(pathLen([-48, 36, 0], [-52, 36, S5_ROOF])).not.toBeNull();
    // the west rappel (-56.15, 8.4, 31) facing -x, through a gap in the west parapet
    const rp = b.anchors.rappels.find((r) => hyp2(r.top.x + 56.15, r.top.z - 31) < 0.05)!;
    expect(rp).toBeTruthy();
    expect(rp.top.y).toBe(S5_ROOF);
    expect(rp.nx).toBeCloseTo(-1);
    expect(rp.nz).toBeCloseTo(0, 6);
    expect(inRect(-56.05, -55.75, 30.4, 31.6, S5_ROOF, S5_ROOF + 1.1)).toEqual([]);
    // the bulkhead's two wired-glass lights (clear), 0.6 x 0.9 at y 9.4..10.3
    const wl = S5_BULKHEAD_LIGHTS;
    const panes = b.boxes.filter((p) => p.glass === 'clear' && bottom(p) > 9.3 && top(p) < 10.4);
    expect(panes.length).toBe(2);
    expect(inRect(-36.5, -36.3, wl.west.z0, wl.west.z1, wl.west.y0, wl.west.y1).filter((p) => !p.glass)).toEqual([]);
    // (the roof's 1.1 north parapet runs through the bulkhead's north wall plane up to 9.5, as built: the pane's lowest 0.1 sits behind it)
    expect(inRect(wl.north.x0, wl.north.x1, 43.8, 44.0, S5_ROOF + 1.1, wl.north.y1).filter((p) => !p.glass)).toEqual([]);
  });
});

describe('S5 v2 P1 sealed and rooms', () => {
  it('P1 nav flood stays sealed: a flood from the start never leaves x -70..-26, z 18..70 plus the C4 box; every roof edge over outside ground is >= 1.9 high', () => {
    const front = m.sectorStage.addDoorClosure(nav, { cx: S5_DOORS.front[0], cz: S5_DOORS.front[1], yaw: PI / 2, width: 1.2, y: 0 });
    nav.setClosed(front, true);
    const dist = nav.flowField([[S5.start.x, S5.start.z]], undefined, [0]);
    const [c0, cz0, c1, cz1] = m.sectors.CAMPUS_SECTORS[3]!.connector!.box;
    let cells = 0;
    let out = '';
    for (let i = 0; i < dist.length; i++) {
      if (!Number.isFinite(dist[i]!)) continue;
      cells++;
      const [x, z] = nav.center(i % nav.cols);
      const inC4 = x >= c0 - 0.5 && x <= c1 + 0.5 && z >= cz0 - 0.5 && z <= cz1 + 0.5;
      if (!inFoot(x, z) && !inC4 && !out && x < -16) out = `(${x}, ${z}, ${nav.height[i]})`;
    }
    nav.setClosed(front, false);
    expect(cells).toBeGreaterThan(5000);
    expect(out).toBe('');
    const edge = (a0: number, a1: number, c0z: number, c1z: number, y: number): BoxPiece | undefined =>
      solid.find((p) => x0(p) <= a0 + 1e-6 && x1(p) >= a1 - 1e-6 && z0(p) <= c0z + 1e-6 && z1(p) >= c1z - 1e-6 && Math.abs(bottom(p) - y) < 1e-6 && p.s[1] >= 1.9 - 1e-6);
    expect(edge(-56, -32, 18.05, 18.15, S5_ROOF)).toBeTruthy();
    expect(edge(-26.15, -26.05, 18, 44, S5_L1)).toBeTruthy();
    expect(edge(-32, -26, 18.05, 18.15, S5_L1)).toBeTruthy();
  });

  it('P1 rooms: none overlap (storeys apart), none carries a squad, every id is art-tagged; the vestibule is gone', () => {
    for (let i = 0; i < S5_ROOMS.length; i++)
      for (let j = i + 1; j < S5_ROOMS.length; j++) {
        const a = S5_ROOMS[i]!;
        const c = S5_ROOMS[j]!;
        const ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX);
        const oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
        const oy = Math.min(a.maxY ?? Infinity, c.maxY ?? Infinity) - Math.max(a.minY ?? -Infinity, c.minY ?? -Infinity);
        expect(ox > 0.01 && oz > 0.01 && oy > 0.01, `${a.id} overlaps ${c.id}`).toBe(false);
      }
    expect(S5_ROOMS.every((r) => (r.squad ?? []).length === 0)).toBe(true);
    for (const r of S5_ROOMS) expect(m.s5Dress.S5_ART_TAGS[r.id], `${r.id} art tag`).toBeTruthy();
    expect(S5_ROOMS.some((r) => r.id === 's5-vest')).toBe(false);
    const room = (id: string) => S5_ROOMS.find((r) => r.id === id)!;
    expect([room('s5-hall').minX, room('s5-hall').maxX, room('s5-hall').minZ, room('s5-hall').maxZ]).toEqual([-50, -32, 18, 32]);
    expect([room('s5-ante').minX, room('s5-ante').maxX, room('s5-ante').minZ, room('s5-ante').maxZ]).toEqual([-46, -37, 32, 38.5]);
    expect(room('s5-back').name).toBe('Back Hall');
    expect(room('s5-pass').name).toBe('Stair Hall');
  });
});

describe('S5 v2 P2 CR7 device (job BRIEF A24, A25)', () => {
  it('CR7 device: pg-hoist\'s door is the hoist door on L1; its keys 6-7 m apart on the archive floor and on nav; no rappel anchor near the hoist door; the hang-drop 4.2 <= the safe drop; ropeRoom(4.2, 0) ok; pg-arch keys 7.5-10 m apart', () => {
    const gates = S5.pairGates!;
    expect(gates.length).toBe(2);
    const [arch, hoist] = gates as [(typeof gates)[number], (typeof gates)[number]];
    // pg-hoist: the door the finder picks at its point (plan, as `Doors.nearest`) is the hoist door anchor on L1
    expect(hoist.door).toEqual([...S5_DOORS.hoist]);
    const d = m.sectorStage.doorFinder(b.anchors.doors)(hoist.door[0], hoist.door[1])!;
    expect(d).toBeTruthy();
    expect(d.y).toBe(S5_L1);
    expect(hyp2(d.cx - -46, d.cz - 36)).toBeLessThan(0.05);
    const keyGap = hyp2(hoist.a.at[0] - hoist.b.at[0], hoist.a.at[1] - hoist.b.at[1]);
    expect(keyGap).toBeGreaterThanOrEqual(6);
    expect(keyGap).toBeLessThanOrEqual(7);
    expect(hoist.window).toBe(1.0);
    for (const k of [hoist.a, hoist.b, arch.a, arch.b]) {
      expect(k.y).toBe(S5_L1);
      expect(k.at[0] >= -46 && k.at[0] <= -38 && k.at[1] >= 32 && k.at[1] <= 44, `key ${k.at} in the archive`).toBe(true);
      expect(nearNav(k.at[0], k.at[1], S5_L1), `key ${k.at} on nav`).toBe(true);
    }
    // no rappel anchor at the hoist door (the rappel reach has no door test, A25)
    expect(b.anchors.rappels.filter((r) => Math.abs(r.top.y - S5_L1) < 0.1 && hyp2(r.top.x + 46, r.top.z - 36) < 2.0)).toEqual([]);
    // the way down is the hang-drop off the sill (4.2 <= the safe drop, scale sheet `safe_drop_m`); the way up the rope
    const metrics = JSON.parse(readFileSync(new URL('../docs/design/metrics.json', import.meta.url), 'utf8')) as { sizes?: Record<string, unknown> } & Record<string, unknown>;
    const safe = JSON.stringify(metrics).match(/"safe_drop_m":\s*([0-9.]+)/);
    expect(safe).toBeTruthy();
    expect(S5_ROPE_EDGE.y - S5_ROPE_EDGE.floor).toBeLessThanOrEqual(Number(safe![1]));
    expect(ropeRoom(S5_ROPE_EDGE.y, S5_ROPE_EDGE.floor)).toBe('ok');
    expect(onNav(-48, 36, 0)).toBe(true);
    // pg-arch: the cage's west face over the moved shaft
    expect(arch.door).toEqual([...S5_DOORS.pgArch]);
    const archGap = hyp2(arch.a.at[0] - arch.b.at[0], arch.a.at[1] - arch.b.at[1]);
    expect(archGap).toBeGreaterThanOrEqual(7.5);
    expect(archGap).toBeLessThanOrEqual(10);
    const da = m.sectorStage.doorFinder(b.anchors.doors)(arch.door[0], arch.door[1])!;
    expect(da.y).toBe(S5_L1);
    expect(hyp2(da.cx - arch.door[0], da.cz - arch.door[1])).toBeLessThan(0.1);
  });
});
