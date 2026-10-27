/**
 * (campus-greybox S1, lane S1) Saltmarsh Park section 1 built from its v2 layout (`src/world/maps/campusV2/s1*.ts`, the
 * signed-off plan `S1-detail.md`, Michael's "Go as drawn (15 guards)"), switched on as `tests/campusV2.test.ts` does
 * (`flags.campusV2 = [1]`, the modules loaded fresh: the selection is made at load). The whole map is built with S1 on, so
 * the S2 shell, the ground and the C1 far door are real. Slices G1-G6 (`docs/campus-greybox/briefs/S1.md`).
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { hyp2 } from '../src/core/mathx';
import { lampReach } from '../src/world/lampMath';
import { soloJumpThreats, soloTopLandingThreats, MANTLE } from './helpers/soloJumpReach';
import { HANG, LEDGE, generateLedges, suppressLedgesNear, type Ledge } from '../src/world/anchors';
import { PERCEPTION } from '../src/ai/perception';
import { MOVEMENT } from '../src/config/movement';
import { ENEMIES } from '../src/ai/enemyDefs';
import { PATROL } from '../src/ai/patrol';
import { LIGHT, contribution } from '../src/world/lights';
import { CHECK_ISOLATION, CHECK_PATROL_PACE, CHECK_SPOT, SightWorld, distToGuard, isolatedInTime, longestIsolation, type CheckGuard } from '../src/game/sectorCheck';
import { SECTOR, SectorPairGates, checkSectorGuards, checkSectors, exitZone, inZone, type SectorGuard } from '../src/game/sectors';
import { doorFinder } from '../src/game/sectorStage';
import { checkSoloRoutes, legCrossesDoor } from '../src/game/sectorSolo';
import { inRoom } from '../src/world/rooms';
import { runtimeNav } from './helpers/runtimeNav';
import { readFileSync } from 'node:fs';
import { DESK_POST_RADIUS } from '../src/game/sectorDesks';

vi.resetModules();
const { flags } = await import('../src/core/flags');
flags.campusV2 = [1];
const { LevelBuilder } = await import('../src/world/levelBuilder');
const { campusOps } = await import('../src/world/maps/campusOps');
const { CAMPUS_PARTS, CAMPUS_V2_PARTS } = await import('../src/world/maps/campusSections');
const { CAMPUS_SECTORS, CAMPUS_SECURITY } = await import('../src/world/maps/campusSectors');
const { CAMPUS_COOP_LIPS } = await import('../src/world/maps/campusLips');
const { S1_FENCE_CAP_LINES, S1_ROOMS, s1Lamps, S1_DOORS, S1_GROUPS, S1_HIDESPOTS, S1_LIP_SEGMENTS, PARK_COLUMNS_E, PARK_COLUMNS_W, BOLLARD_XS, CANOPY_LAMPS, C1_BOX } = await import('../src/world/maps/campusV2/s1');
const { S1_LIGHTS, S1_DESKS } = await import('../src/world/maps/campusV2/s1Data');
const { S1_ART_TAGS } = await import('../src/world/maps/campusV2/s1Dress');

const b = new LevelBuilder();
const lay = campusOps.build(b, 0);
const S1 = CAMPUS_SECTORS[0]!;
// (coop4 A8, campus-greybox TAG-1) the base list (1-2 players): the two 3-4 player extras are appended after it
const G = S1.guards.filter((g) => g.minPlayers === undefined);
/** A guard by its plan number (#1-#9, then #11-#16: no #10). */
const guard = (n: number): SectorGuard => G[n <= 9 ? n - 1 : n - 2]!;

/**
 * The collision pieces as axis-aligned boxes: `LevelBuilder.wallX / wallZ` make a wall along x as a box turned a quarter
 * turn (yaw PI / 2, depth along its length), so the quarter-turn pieces are swapped to plain boxes. Any other yaw is left out.
 */
const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}

/**
 * The nav grid of a rectangle, built from the pieces as `navBuild` does (blockers, fences, cylinders, ladder links); copied
 * from `tests/campusS1.test.ts` (a test file is not imported). `seed` keeps only the region joined to it (no seed: every
 * surface); `extra` adds blockers (a shut door).
 */
function analyticNav(rect: readonly [number, number, number, number], o: { cell?: number; layers?: number; seed?: [number, number]; extra?: readonly NavBlocker[] } = {}): NavGrid {
  const cell = o.cell ?? 0.5;
  const snap = (v: number, org: number): number => org + Math.floor((v - org) / cell) * cell;
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
  blockers.push(...(o.extra ?? []));
  // ladders join the storeys both ways (the nav build's own links)
  const links = b.anchors.ladders.map((l) => {
    const fx = Math.sin(l.facing);
    const fz = Math.cos(l.facing);
    const sx = l.base.x - fx * 0.32;
    const sz = l.base.z - fz * 0.32;
    return { kind: 'ladder' as const, twoWay: true, pts: [l.base.x - fx * 0.7, l.base.y, l.base.z - fz * 0.7, sx, l.base.y, sz, sx, l.top.y, sz, l.top.x + fx * 0.3, l.top.y, l.top.z + fz * 0.3] };
  });
  return new NavGrid({
    minX, maxX, minZ, maxZ, cell, agentRadius: 0.32, stepHeight: 0.45, layers: o.layers ?? 5, blockers, links,
    ...(o.seed ? { seed: o.seed } : {}),
    sample: () => ({ h: 0, ok: false }),
    sampleLayers: (x, z) => {
      const out: NavSample[] = [];
      let ceiling = Infinity;
      for (const s of surf(x, z)) {
        if (s.h > ceiling) continue;
        if (ceiling - s.h >= 1.7) out.push({ h: s.h, ok: true });
        ceiling = Math.min(ceiling, s.bottom);
      }
      // the open ground: nothing above it
      if (!out.some((q) => q.h === 0) && ceiling >= 1.7) out.push({ h: 0, ok: true });
      return out.sort((a, q) => a.h - q.h);
    },
  });
}

/** The lit lamps in S1's plan box (x -40..26, z -80..-30). */
const litS1 = () => b.lights.lights.filter((l) => l.intensity > 0 && l.x >= -40 && l.x <= 26 && l.z >= -80 && l.z <= -30);
/** The lit S1 lamp count after the slices built so far (lead note (3)); (light-realism L1 v2 port) 32 -> 44: the car park's
 *  10 single columns became 11 twin-head columns (22 heads); (S1 v3) 45 with the garden gate's lamp. */
const S1_LIT_NOW = 45;
/** The ledges the level build makes (`LevelBuilder.build`: generated from the box tops, lips off the play area dropped, the
 *  map's `noLedge` points applied). */
function builtLedges(): Ledge[] {
  const a = generateLedges(b.boxes);
  const bd = b.bounds;
  for (const l of a.ledges) {
    if (l.piece === 0) continue;
    const mx = (l.a.x + l.b.x) / 2 + l.nx * 0.5;
    const mz = (l.a.z + l.b.z) / 2 + l.nz * 0.5;
    if (mx < bd.minX || mx > bd.maxX || mz < bd.minZ || mz > bd.maxZ) l.canHang = l.canClimbUp = false;
  }
  for (const [x, z, r] of (b as unknown as { noLedgeAt: [number, number, number][] }).noLedgeAt) suppressLedgesNear(a, x, z, r);
  return a.ledges;
}
const ledges = builtLedges();
const nav = analyticNav([-42, -82, 28, -28]);
const onNav = (x: number, z: number, y = 0): boolean => nav.isWalkable(nav.cellOf(x, z, y)) && Math.abs(nav.heightAt(x, z, y) - y) < 0.6;
/** The analytic light level at a point (ambient + every lamp, unoccluded), as `tests/campusS1.test.ts`. */
const levelAt = (x: number, y: number, z: number): number => {
  let v = b.lights.ambientAt(x, y, z);
  for (const l of b.lights.lights) v += contribution(l, x, y, z);
  return v;
};
/** A guard's patrol cycle (s): the walk at its pace plus the pauses; a timed loop is its master clock's period (`tests/campusS1.test.ts`). */
function cycle(g: SectorGuard): number | null {
  const r = g.route;
  if (!r || r.length < 2) return null;
  if (g.loop) return g.loop.period;
  const speed = ENEMIES[g.kind].walkSpeed * CHECK_PATROL_PACE;
  const n = r.length;
  const order: number[] = [];
  if (n < 3) {
    for (let i = 0; i < n; i++) order.push(i);
    for (let i = n - 2; i >= 1; i--) order.push(i);
  } else for (let i = 0; i < n; i++) order.push(i);
  let t = 0;
  for (let k = 0; k < order.length; k++) {
    const idx = order[k]!;
    if (k > 0) {
      const q = r[order[k - 1]!]!;
      t += hyp2(r[idx]![0] - q[0], r[idx]![1] - q[1]) / speed;
    }
    t += g.waits?.[idx] ?? g.wait ?? PATROL.wait;
  }
  const a = r[order[order.length - 1]!]!;
  const f = r[order[0]!]!;
  return t + hyp2(f[0] - a[0], f[1] - a[1]) / speed;
}
/** Slot, route and takedown spot on the nav grid, the spot within CHECK_SPOT of the guard, the cycle 25-45 s (or a post). */
function guardChecks(n: number, want: number | null): void {
  const g = guard(n);
  expect(onNav(g.x, g.z), `#${n} slot (${g.x}, ${g.z})`).toBe(true);
  for (const p of g.route ?? []) expect(onNav(p[0], p[1]), `#${n} route (${p[0]}, ${p[1]})`).toBe(true);
  expect(onNav(g.takedownSpot[0], g.takedownSpot[1]), `#${n} takedown spot`).toBe(true);
  expect(distToGuard(g, g.takedownSpot[0], g.takedownSpot[1]), `#${n} takedown spot`).toBeLessThanOrEqual(CHECK_SPOT);
  if (g.route) expect(hyp2(g.route[0]![0] - g.x, g.route[0]![1] - g.z)).toBeLessThan(0.1);
  const c = cycle(g);
  if (want === null) expect(c, `#${n} is a post`).toBeNull();
  else {
    expect(c!, `#${n} cycle`).toBeCloseTo(want, 1);
    expect(c!).toBeGreaterThanOrEqual(25);
    expect(c!).toBeLessThanOrEqual(45);
  }
}
const covers = (p: BoxPiece, x: number, y: number, z: number): boolean => Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(y - p.c[1]) <= p.s[1] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2;
/** A segment co-op lip against a solo player (LD 11.8 rules 1-5): the jump and landing helpers (0.5 m margin), rule 2
 *  (nothing solo-standable 1.2 or higher within 4 m in plan), rule 3 (no box 0.6-1.7 high within 1 m of the wall below), rule
 *  5 (headroom over the lip to `head`, over `headX` when given: the lip's hangable run). Returns the failures. */
function segmentLipFailures(id: string, head: number, headX?: readonly [number, number]): string[] {
  const lip = CAMPUS_COOP_LIPS.find((l) => l.id === id)!;
  const seg = S1_LIP_SEGMENTS[id]!;
  const g = { y: lip.lip.y, a: { x: seg.a[0], z: seg.a[1] }, b: { x: seg.b[0], z: seg.b[1] }, n: lip.lip.n };
  const out: string[] = [];
  out.push(...soloJumpThreats(solid, g, () => false, 0.5).map((t) => `jump: ${t}`));
  out.push(...soloTopLandingThreats(solid, lip.top, () => false, 0.5).map((t) => `landing: ${t}`));
  const x0 = Math.min(seg.a[0], seg.b[0]);
  const x1 = Math.max(seg.a[0], seg.b[0]);
  const zl = seg.a[1];
  const n = lip.lip.n.z;
  for (const p of solid) {
    const t = top(p);
    const gx = Math.max(0, x0 - (p.c[0] + p.s[0] / 2), p.c[0] - p.s[0] / 2 - x1);
    const gz = Math.max(0, zl - (p.c[2] + p.s[2] / 2), p.c[2] - p.s[2] / 2 - zl);
    // rule 2
    if (t >= 1.2 && t < lip.lip.y - 0.05 && Math.min(p.s[0], p.s[2]) >= LEDGE.climbDepth && !(p.noLedge && t > MANTLE) && hyp2(gx, gz) <= 4) out.push(`rule 2: top ${t} at ${p.c}`);
    // rule 3: on the lip's outer side, within 1 m of the wall below it
    const outer = n < 0 ? p.c[2] - p.s[2] / 2 < zl && p.c[2] + p.s[2] / 2 > zl - 1 : p.c[2] + p.s[2] / 2 > zl && p.c[2] - p.s[2] / 2 < zl + 1;
    if (outer && p.c[0] + p.s[0] / 2 > x0 && p.c[0] - p.s[0] / 2 < x1 && t >= 0.6 && t <= 1.7 && p.c[1] - p.s[1] / 2 < 0.05) out.push(`rule 3: ${p.c} top ${t}`);
    // rule 5: headroom
    const zIn = n < 0 ? [zl - 0.9, zl + 0.4] : [zl - 0.4, zl + 0.9];
    const [h0, h1] = headX ?? [x0, x1];
    if (p.c[0] + p.s[0] / 2 > h0 && p.c[0] - p.s[0] / 2 < h1 && p.c[2] + p.s[2] / 2 > zIn[0]! && p.c[2] - p.s[2] / 2 < zIn[1]! && t > lip.lip.y + 0.1 && p.c[1] - p.s[1] / 2 < head) out.push(`rule 5: ${p.c} ${p.s}`);
  }
  return out;
}
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const near = (a: number, c: number, e = 1e-6): boolean => Math.abs(a - c) < e;
/** The solid box with this centre and size (plain axes). */
const boxWith = (c: readonly [number, number, number], s: readonly [number, number, number]): BoxPiece | undefined =>
  solid.find((p) => near(p.c[0], c[0]) && near(p.c[1], c[1]) && near(p.c[2], c[2]) && near(p.s[0], s[0]) && near(p.s[1], s[1]) && near(p.s[2], s[2]));

describe('campus v2 S1 is on', () => {
  it('section 1 comes from campusV2 (the others stay live)', () => {
    expect(CAMPUS_PARTS[0]).toBe(CAMPUS_V2_PARTS[0]);
  });
});

describe('G1 perimeter (S1-detail C1)', () => {
  /** The palisade lines: centre, size. */
  const PALISADE: readonly [readonly [number, number, number], readonly [number, number, number]][] = [
    [[-16, 1.2, -80], [48, 2.4, 0.1]],
    [[11, 1.2, -80], [6, 2.4, 0.1]],
    [[18.7, 1.2, -80], [9.4, 2.4, 0.1]],
    [[24, 1.2, -80], [1.2, 2.4, 0.1]],
    [[25.3, 1.2, -80], [1.4, 2.4, 0.1]],
    [[26, 1.2, -57], [0.1, 2.4, 46]],
    [[-40, 1.2, -60], [0.1, 2.4, 40]],
    [[15, 1.2, -34], [22, 2.4, 0.1]],
    // (S1 v3) the garden-gate fence on z -58 (x 6..22.4 and 23.6..26; the gate gap between)
    [[14.2, 1.2, -58], [16.4, 2.4, 0.1]],
    [[24.8, 1.2, -58], [2.4, 2.4, 0.1]],
  ];
  const SCREENS: readonly [readonly [number, number, number], readonly [number, number, number]][] = [
    [[16.75, 4.5, -79], [6.5, 2.4, 0.1]],
    [[-40, 5.6, -37], [0.1, 2.4, 6]],
    [[-40, 5.6, -32], [0.1, 2.4, 4]],
    [[3.7, 5.6, -32], [0.1, 2.4, 4]],
    // (S1 v3) the garden gate's head over the gap (2.1..2.4)
    [[23, 2.25, -58], [1.2, 0.3, 0.1]],
  ];

  it('G1 nav flood: no walkable cell outside S1 before C1 opens', () => {
    // the shut C1 near door (B:42, B:277): a nav blocker in its gap
    const door: NavBlocker = { cx: -20, cz: -34, hx: 0.6, hz: 0.15, yaw: 0, bottom: 0, top: 2.1 };
    const nav = analyticNav([-46, -86, 32, -26], { seed: [24, -79], extra: [door] });
    const out: string[] = [];
    let count = 0;
    for (let i = 0; i < nav.walk.length; i++) {
      if (!nav.walk[i]) continue;
      count++;
      const [x, z] = nav.center(i % nav.cols);
      if (x < -40 || x > 26 || z < -80 || z > -30) out.push(`(${x}, ${nav.height[i]!.toFixed(2)}, ${z})`);
    }
    expect(count).toBeGreaterThan(1000);
    expect(out.slice(0, 1), `${out.length} cells outside S1; first`).toEqual([]);
  });

  it('G1 the palisade is closed and anti-climb', () => {
    for (const [c, s] of PALISADE) {
      const p = boxWith(c, s);
      expect(p, `palisade ${c}`).toBeTruthy();
      expect(p!.noLedge, `palisade ${c}`).toBe(true);
      expect(p!.c[1] - p!.s[1] / 2).toBeCloseTo(0);
      expect(Math.min(p!.s[0], p!.s[2])).toBeCloseTo(0.1);
    }
    // the south line covers x -40..26 with no gap wider than 0.05
    const south = PALISADE.filter(([c]) => c[2] === -80)
      .map(([c, s]) => [c[0] - s[0] / 2, c[0] + s[0] / 2] as const)
      .sort((p, q) => p[0] - q[0]);
    expect(south[0]![0]).toBeCloseTo(-40);
    expect(south[south.length - 1]![1]).toBeCloseTo(26);
    for (let i = 1; i < south.length; i++) expect(south[i]![0] - south[i - 1]![1], `gap at x ${south[i]![0]}`).toBeLessThanOrEqual(0.05);
    // no fence anchor in S1 (the weldmesh is gone)
    expect(b.anchors.fences.filter((f) => f.a.z < -30 || f.b.z < -30).length).toBe(0);
  });

  it('G1 roof screens: four 2.4 noLedge screens and the gate head; no plant-roof parapet at x -39.85', () => {
    for (const [c, s] of SCREENS) {
      const p = boxWith(c, s);
      expect(p, `screen ${c}`).toBeTruthy();
      expect(p!.noLedge).toBe(true);
    }
    expect(solid.filter((p) => near(p.c[0], -39.85) && near(p.s[1], 1.1)).map((p) => p.c)).toEqual([]);
  });

  it('G1 out of reach: no palisade or screen is a take-off, a grip or a foothold for a solo player', () => {
    // each piece is noLedge (no lip to hang from or mantle onto) and 0.1 thick (narrower than the body, so no top to stand
    // on). The helpers skip such a piece as a take-off; their landing test reads only the target's plan box, not its depth,
    // so the raw landing list is printed (CAMPUS_PRINT) for the report and the foothold is asserted on the depth.
    const all = [...PALISADE, ...SCREENS].map(([c, s]) => boxWith(c, s)!);
    const led = generateLedges(b.boxes).ledges;
    const raw: string[] = [];
    for (const p of all) {
      expect(p.noLedge, `${p.c}`).toBe(true);
      expect(Math.min(p.s[0], p.s[2]), `${p.c} depth`).toBeLessThan(2 * MOVEMENT.radius);
      // not a take-off: neither helper lists it for a grip or a top just above it
      const q = { x0: p.c[0] - p.s[0] / 2, x1: p.c[0] + p.s[0] / 2, z0: p.c[2] - p.s[2] / 2, z1: p.c[2] + p.s[2] / 2, top: top(p) };
      const over = { y: top(p) + 1.0, a: { x: q.x0, z: q.z0 }, b: { x: q.x1, z: q.z1 } };
      expect(soloJumpThreats(all, over).length, `${p.c} as a take-off`).toBe(0);
      expect(soloTopLandingThreats(all, { ...q, top: top(p) + 1.0 }).length, `${p.c} as a take-off`).toBe(0);
      // not a grip: no generated lip runs along its top
      const lips = led.filter((l) => near(l.top, top(p), 1e-3) && Math.min(l.a.x, l.b.x) >= q.x0 - 0.01 && Math.max(l.a.x, l.b.x) <= q.x1 + 0.01 && Math.min(l.a.z, l.b.z) >= q.z0 - 0.01 && Math.max(l.a.z, l.b.z) <= q.z1 + 0.01);
      expect(lips.length, `${p.c} lips`).toBe(0);
      for (const t of soloTopLandingThreats(solid, q, (o) => o === p, 0.5)) raw.push(`${p.c}: ${t}`);
    }
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(`G1 raw landing list (target depth not read):\n${raw.join('\n')}`);
  });

  it('G1 bin store west wall gone', () => {
    expect(solid.filter((p) => near(p.s[1], 3.0) && near(p.c[0], -40, 0.2) && p.c[2] > -52.01 && p.c[2] < -44.99).map((p) => p.c)).toEqual([]);
  });

  it('G1 S1_LIGHTS is the one source: every lit S1 lamp matches a block entry; the as-built lamps keep their intensity', () => {
    const lamps = s1Lamps(S1_LIGHTS);
    const lit = litS1();
    const bad: string[] = [];
    for (const l of lit) {
      const m = lamps.find((q) => near(q.x, l.x) && near(q.y, l.y) && near(q.z, l.z) && near(lampReach(q.r), l.radius) && near(q.i, l.intensity) && q.group === l.group);
      if (!m) bad.push(`lamp ${l.id} (${l.x}, ${l.y}, ${l.z}) r ${l.radius} i ${l.intensity} g ${l.group}`);
    }
    expect(bad).toEqual([]);
    // 29 as built (G1), 30 with the G2 desk lamp, 31 with G3's carport luminaires and bike-shelter lamp, 32 with G5's smoke lamp,
    // 44 with light-realism L1's twin-head columns, 45 with S1 v3's garden-gate lamp
    expect(lit.length).toBe(lamps.length);
    expect(lit.length).toBe(S1_LIT_NOW);
    // the as-built intensities (B:214-314): bollards 0.5, canopy 0.85, dock 0.8, gate tube 0.9; (light-realism L1, P11a) the
    // columns 2.0 and the lane flood 0.5
    expect([S1_LIGHTS.column.i, S1_LIGHTS.bollards.i, S1_LIGHTS.canopy.i, S1_LIGHTS.dock.i, S1_LIGHTS.laneFlood.i, S1_LIGHTS.gate.i]).toEqual([2.0, 0.5, 0.85, 0.8, 0.5, 0.9]);
  });
});

describe('G2 gatehouse (S1-detail C2)', () => {
  const doorCentre = (d: (typeof b.anchors.doors)[number]): [number, number] => [d.hinge.x + (Math.sin(d.yaw) * d.width) / 2, d.hinge.z + (Math.cos(d.yaw) * d.width) / 2];

  it('G2 gatehouse box 6.5 x 6.5, clear 6.2, door 1.2 x 2.1 at (17, -72.5) opening north', () => {
    // the four wall lines (3.0 high): S z -79 and N z -72.5 along x 13.5..20, W x 13.5 and E x 20 along z -79..-72.5
    const walls = solid.filter((p) => near(p.s[1], 3.0) && p.c[0] > 13 && p.c[0] < 20.5 && p.c[2] > -79.5 && p.c[2] < -72);
    const onLine = (axis: 0 | 2, v: number): BoxPiece[] => walls.filter((p) => near(p.c[axis], v) && near(p.s[axis], 0.3));
    expect(onLine(2, -79).length).toBe(1);
    expect(onLine(2, -72.5).length).toBe(3);
    expect(onLine(0, 13.5).length).toBe(2);
    expect(onLine(0, 20).length).toBe(3);
    // clear 6.2 between the inner faces
    expect(13.5 + 0.15 + 6.2).toBeCloseTo(20 - 0.15);
    expect(-79 + 0.15 + 6.2).toBeCloseTo(-72.5 - 0.15);
    const d = b.anchors.doors.find((q) => near(q.hinge.x, 16.4) && near(q.hinge.z, -72.5))!;
    expect(d).toBeTruthy();
    expect(d.width).toBe(1.2);
    expect(d.height).toBe(2.1);
    expect(d.swing).toBe(-1);
    expect(doorCentre(d)[0]).toBeCloseTo(17);
    expect(doorCentre(d)[1]).toBeCloseTo(-72.5);
    expect(S1_DOORS.gatehouse).toEqual([17, -72.5]);
    // no door within 1.5 m of a corner (SS:70): 3.5 from the W corner, 3.0 from the E corner
    expect(17 - 13.5).toBeGreaterThanOrEqual(1.5);
    expect(20 - 17).toBeGreaterThanOrEqual(1.5);
  });

  it('G2 glazing band: E2 and the two other panes fixed (closed, unbreakable), the reception window closed and breakable', () => {
    const win = (x: number, z: number) => b.anchors.windows.find((w) => near(w.c.x, x) && near(w.c.z, z));
    // (S1 v3) E2 is fixed glass now (Michael: no rear window)
    expect(win(20, -76)).toMatchObject({ open: false, breakable: false, sillHeight: 0.9 });
    expect(win(20, -73.8)).toMatchObject({ open: false, breakable: false, sillHeight: 0.9 });
    expect(win(19.2, -72.5)).toMatchObject({ open: false, breakable: false, sillHeight: 0.9 });
    expect(win(13.5, -76)).toMatchObject({ open: false, breakable: true, sillHeight: 0.9 });
  });

  it('G2 roof: east lip only, hatch open', () => {
    const hang = ledges.filter((l) => l.canHang && near(l.top, 3.3, 1e-3) && Math.min(l.a.x, l.b.x) > 13 && Math.max(l.a.x, l.b.x) < 20.5 && Math.min(l.a.z, l.b.z) > -79.5 && Math.max(l.a.z, l.b.z) < -72);
    expect(hang.length).toBeGreaterThan(0);
    expect(hang.filter((l) => !(near(l.a.x, 20.15, 1e-3) && near(l.b.x, 20.15, 1e-3))).map((l) => [l.a, l.b])).toEqual([]);
    // the hatch x 17.8..19.0, z -78.4..-77.2 at slab height: no collision box over its centre or its corners inset 0.1
    for (const [x, z] of [[18.4, -77.8], [17.9, -78.3], [18.9, -78.3], [17.9, -77.3], [18.9, -77.3]] as const)
      expect(solid.filter((p) => covers(p, x, 3.15, z)).map((p) => p.c), `hatch (${x}, ${z})`).toEqual([]);
  });

  it('G2 the SE climb is solo: condenser top 2.0, the east lip 3.3 within the 3.8 solo reach, the condenser not noLedge', () => {
    const con = boxWith([20.4, 1.6, -78.4], [0.5, 0.8, 0.9])!;
    expect(con).toBeTruthy();
    expect(top(con)).toBeCloseTo(2.0);
    expect(con.noLedge).toBeFalsy();
    expect(3.3 - 0).toBeLessThanOrEqual(3.8);
  });

  it('G2 light: the tube and the desk lamp on the gate circuit; cut, the PC desk reads under the shadow line', () => {
    const gate = b.lights.lights.filter((l) => l.group === S1_GROUPS.gate);
    // (S1 v3) the tube, the desk lamp and the garden gate's lamp
    expect(gate.length).toBe(3);
    const tube = gate.find((l) => near(l.x, 17) && near(l.y, 2.9) && near(l.z, -76))!;
    const desk = gate.find((l) => near(l.x, 18.6) && near(l.y, 1.2) && near(l.z, -73.4))!;
    expect(tube.radius).toBeCloseTo(lampReach(5.5));
    expect(desk.radius).toBeCloseTo(lampReach(2.5));
    for (const l of gate) {
      expect(l.on).toBe(true);
      expect(l.intensity).toBeGreaterThan(0);
      expect(l.destructible && l.electric).toBe(true);
    }
    // the PC desk point (19.35, -77.75)
    const lit = levelAt(19.35, 0.9, -77.75);
    for (const l of gate) l.on = false;
    const cut = levelAt(19.35, 0.9, -77.75);
    for (const l of gate) l.on = true;
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(`G2 PC desk (19.35, 0.9, -77.75): lit ${lit.toFixed(3)}, gate cut ${cut.toFixed(3)}`);
    expect(cut).toBeLessThan(LIGHT.shadow);
  });

  it('G2 desk-gate (SY:9): the desk data, valid sectors; #2 at his desk is at his post, at the kettle he is not', () => {
    const desk = CAMPUS_SECURITY.desks!.find((d) => d.id === 'desk-gate')!;
    expect(desk).toEqual({ id: 'desk-gate', section: 0, at: [18.8, -73.2], yaw: 0, cameras: ['cam-gate', 'cam-walk'], operator: 1 });
    expect(checkSectors(CAMPUS_SECTORS, undefined, CAMPUS_SECURITY)).toEqual([]);
    const g2 = guard(2);
    expect(desk.operator).toBe(1);
    expect(G[desk.operator!]).toBe(g2);
    expect(hyp2(g2.route![0]![0] - desk.at[0], g2.route![0]![1] - desk.at[1])).toBeLessThanOrEqual(DESK_POST_RADIUS);
    expect(hyp2(g2.route![1]![0] - desk.at[0], g2.route![1]![1] - desk.at[1])).toBeGreaterThan(DESK_POST_RADIUS);
  });

  it('G2 alarm and switch: the alarm at (15.0, -72.8), the gate switch at (15.7, -72.8) within 2.5 m of the door', () => {
    const al = lay.alarms!.filter((a) => a.section === 0);
    expect(al.length).toBe(1);
    expect(al[0]!.pos.x).toBeCloseTo(15.0);
    expect(al[0]!.pos.z).toBeCloseTo(-72.8);
    const sw = lay.switches!.filter((q) => q.group === S1_GROUPS.gate);
    expect(sw.length).toBe(1);
    expect(sw[0]!.pos.x).toBeCloseTo(15.7);
    expect(sw[0]!.pos.z).toBeCloseTo(-72.8);
    expect(hyp2(sw[0]!.pos.x - S1_DOORS.gatehouse[0], sw[0]!.pos.z - S1_DOORS.gatehouse[1])).toBeLessThan(2.5);
  });

  it('G2 #1, #2, #9 on nav, cycles 25-45 s (#1 a post; #2 41.7 s, #9 30.8 s)', () => {
    guardChecks(1, null);
    guardChecks(2, 41.7);
    guardChecks(9, 30.8);
  });
});

describe('G3 car park and carport (S1-detail C3)', () => {
  const lit = (g: number) => b.lights.lights.filter((l) => l.group === g && l.on && l.intensity > 0);
  const slab = boxWith([-12, 2.8, -58.5], [24, 0.4, 9])!;

  it('G3 rows and columns: 14 cars at the new row z; (light-realism L1 v2 port) 6 + 5 twin-head columns, parkW 14 and parkE 12 lamps', () => {
    const cars = solid.filter((p) => near(p.s[0], 1.8) && near(p.s[1], 1.5) && near(p.s[2], 4.2));
    expect(cars.length).toBe(14);
    expect([...new Set(cars.map((p) => p.c[2]))].sort((p, q) => p - q)).toEqual([-75.75, -71.25, -60.75, -56.25]);
    // the poles (x, z) per circuit: north row z -55, aisle row z -64, south row z -73.5 (S1-carpark.md "v2 port")
    const poles = (cols: typeof PARK_COLUMNS_W): number[][] => [...new Set(cols.map(([x, z]) => `${x},${z}`))].map((k) => k.split(',').map(Number));
    expect(poles(PARK_COLUMNS_W)).toEqual([[-30.4, -55], [-33, -64], [-21, -64], [-36, -73.5], [-24.8, -73.5], [-13.6, -73.5]]);
    expect(poles(PARK_COLUMNS_E)).toEqual([[3.2, -55], [-9, -64], [3, -64], [-2.4, -73.5], [6, -73.5]]);
    for (const [x, z] of [...poles(PARK_COLUMNS_W), ...poles(PARK_COLUMNS_E)]) expect(b.cylinders.some((c) => near(c.c[0], x!) && near(c.c[2], z!) && near(c.h, 6.2) && near(c.r, 0.15)), `column (${x}, ${z})`).toBe(true);
    expect(b.cylinders.filter((c) => near(c.h, 6.2) && near(c.r, 0.15) && c.c[2] > -80 && c.c[2] < -50 && c.c[0] < 7).length).toBe(11);
    // every west pole west of every east pole (one breaker each half)
    expect(Math.max(...PARK_COLUMNS_W.map((p) => p[0]))).toBeLessThan(Math.min(...PARK_COLUMNS_E.map((p) => p[0])));
    // 22 heads plus the carport's two downlights per half
    expect(lit(S1_GROUPS.parkW).length).toBe(14);
    expect(lit(S1_GROUPS.parkE).length).toBe(12);
  });

  it('(light-realism L1 v2 port) the car-park columns are twin-head arm columns: a -x and a +x head per pole, each light point 0.8 m out at y 6.0 under its 0.6 m arm', () => {
    for (const [cols, group] of [[PARK_COLUMNS_W, S1_GROUPS.parkW], [PARK_COLUMNS_E, S1_GROUPS.parkE]] as const) {
      const byPole = new Map<string, number[]>();
      for (const [x, z, ax, az] of cols) {
        expect(az, `head (${x}, ${z}) arm along x`).toBe(0);
        byPole.set(`${x},${z}`, [...(byPole.get(`${x},${z}`) ?? []), ax]);
        // the light point hangs 0.8 m out along the arm, not on top of the pole
        const l = b.lights.lights.find((q) => q.group === group && near(q.x, x + 0.8 * ax) && near(q.z, z) && near(q.y, 6.0));
        expect(l, `light point (${x + 0.8 * ax}, ${z})`).toBeTruthy();
        expect(b.lights.lights.some((q) => q.group === group && near(q.x, x) && near(q.z, z))).toBe(false);
        // the arm: from the pole's axis to 0.6 m out at y 6.10-6.20
        expect(boxWith([x + 0.3 * ax, 6.15, z], [0.6, 0.1, 0.1]), `arm (${x}, ${z}) ${ax}`).toBeTruthy();
      }
      for (const [k, arms] of byPole) expect(arms.sort(), `twin ${k}`).toEqual([-1, 1]);
    }
  });

  it('G3 carport: top 3.0 / underside 2.6 over x -24..0, z -63..-54; 5 posts; four lit downlights under it, two per half', () => {
    expect(slab).toBeTruthy();
    expect(top(slab)).toBeCloseTo(3.0);
    expect(slab.c[1] - slab.s[1] / 2).toBeCloseTo(2.6);
    expect(slab.noLedge).toBeFalsy();
    const posts = b.cylinders.filter((c) => near(c.c[2], -58.5) && near(c.r, 0.15) && near(c.h, 2.6));
    expect(posts.map((c) => c.c[0]).sort((p, q) => p - q)).toEqual([-24, -18, -12, -6, 0]);
    const under = b.lights.lights.filter((l) => near(l.z, -58.5) && near(l.y, 2.5) && l.x > -24 && l.x < 0);
    expect(under.map((l) => l.x).sort((p, q) => p - q)).toEqual([-21, -15, -9, -3]);
    for (const l of under) {
      expect(l.on && l.intensity > 0 && l.destructible && l.electric, `carport lamp ${l.x}`).toBe(true);
      expect(l.y).toBeLessThan(2.6);
      expect(l.group).toBe(l.x < -12 ? S1_GROUPS.parkW : S1_GROUPS.parkE);
    }
  });

  it('G3 no lamp lost: at least 29 lit S1 lamps; the kept as-built lamps at their as-built intensity', () => {
    expect(litS1().length).toBeGreaterThanOrEqual(29);
    // (light-realism L1) the column heads at P11a's 2.0, the carport downlights as built
    for (const l of [...lit(S1_GROUPS.parkW), ...lit(S1_GROUPS.parkE)]) expect(l.intensity, `lamp (${l.x}, ${l.z})`).toBe(near(l.y, 6.0) ? 2.0 : 0.85);
    for (const l of lit(S1_GROUPS.fore)) expect(l.intensity).toBe(near(l.y, 0.85) ? 0.5 : 0.8);
    for (const l of lit(S1_GROUPS.canopy)) expect(l.intensity).toBe(0.85);
    // the bike shelter fitting is lit now (Q2 "Never"): one lamp on its own circuit and a switch
    const bk = lit(S1_GROUPS.bikes);
    expect(bk.length).toBe(1);
    expect([bk[0]!.x, bk[0]!.y, bk[0]!.z]).toEqual([-7, 2.2, -52]);
    expect(lay.switches!.filter((q) => q.group === S1_GROUPS.bikes).length).toBe(1);
    // no dead or off fitting anywhere in S1
    expect(b.lights.lights.filter((l) => l.x >= -40 && l.x <= 26 && l.z >= -80 && l.z <= -30 && (!l.on || l.intensity <= 0)).length).toBe(0);
  });

  it('G3 van chain and shelter chain are solo climbs (each step under 3.8, none noLedge)', () => {
    // (S1 v3) the courier's van: bonnet 1.1, cab 2.0, box body 2.8
    const bonnet = boxWith([-26.2, 0.55, -62.85], [2.0, 1.1, 0.8])!;
    const cab = boxWith([-26.2, 1.0, -61.95], [2.0, 2.0, 1.0])!;
    const body = boxWith([-26.2, 1.4, -59.85], [2.2, 2.8, 3.2])!;
    const lockers = boxWith([-9, 0.6, -49.5], [6, 1.2, 1])!;
    const roof = boxWith([-7, 2.3, -52], [10, 0.2, 4])!;
    for (const chain of [[bonnet, cab, body, slab], [lockers, roof, slab]]) {
      let floor = 0;
      for (const p of chain) {
        expect(p, 'piece').toBeTruthy();
        expect(p.noLedge, `${p.c}`).toBeFalsy();
        expect(top(p) - floor).toBeLessThan(3.8);
        floor = top(p);
      }
    }
    expect([top(bonnet), top(cab), top(body), top(lockers), top(roof), top(slab)].map((v) => +v.toFixed(2))).toEqual([1.1, 2.0, 2.8, 1.2, 2.4, 3.0]);
  });

  it('G3 clearances (D:88-92): carport 14 m from the CR1 lip, bike shelter 10.2 m from the canopy lips; both clear of CR1-east', () => {
    // plan gap of a box to a segment
    const gap = (x0: number, x1: number, z0: number, z1: number, ax: number, az: number, bx: number, bz: number): number => {
      let best = Infinity;
      for (let t = 0; t <= 1.0001; t += 0.01) {
        const x = ax + (bx - ax) * t;
        const z = az + (bz - az) * t;
        best = Math.min(best, hyp2(Math.max(0, x0 - x, x - x1), Math.max(0, z0 - z, z - z1)));
      }
      return best;
    };
    const carport = [-24, 0, -63, -54] as const;
    const shelter = [-12, -2, -54, -50] as const;
    expect(gap(...carport, -14, -40, -14, -34)).toBeGreaterThanOrEqual(14 - 0.05);
    expect(gap(...shelter, -14, -40, -14, -34)).toBeGreaterThanOrEqual(10.2 - 0.05);
    expect(gap(...shelter, -26, -40, -14, -40)).toBeGreaterThanOrEqual(10.2 - 0.05);
    expect(gap(...carport, -6, -34, 4, -34)).toBeGreaterThanOrEqual(20 - 0.05);
    // (D-G3-1) the shelter is 16 m from CR1-east (x -6..4, z -34), not the plan's 20: its north edge is z -50; rules 2 and 4
    // (nothing solo-standable within 4 m of a co-op lip) hold with 12 m to spare
    const sh = gap(...shelter, -6, -34, 4, -34);
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(`G3 bike shelter to CR1-east: ${sh.toFixed(2)} m`);
    expect(sh).toBeCloseTo(16, 1);
    expect(sh).toBeGreaterThan(4);
  });

  it('G3 pair north stop under the carport edge: #4 at z -64.8 is 1.8 m south of z -63', () => {
    expect(-63 - guard(4).route![2]![1]).toBeCloseTo(1.8);
    expect(slab.c[2] - slab.s[2] / 2).toBeCloseTo(-63);
  });

  it('G3 hide spots: between the cars, the bike shelter, the carport west end; all on nav', () => {
    const hs = S1_HIDESPOTS.map((h) => [h.pos.x, h.pos.z]);
    for (const p of [[-33.4, -60.75], [-7, -51.2], [-25, -62]]) expect(hs).toContainEqual(p);
    for (const [x, z] of hs) expect(onNav(x!, z!), `hide (${x}, ${z})`).toBe(true);
  });

  it('G3 #3, #4, #11 on nav, cycles 25-45 s (#3 / #4 the 42 s loop, #11 42.2 s), pair loop legs', () => {
    guardChecks(3, 42);
    guardChecks(4, 42);
    guardChecks(11, 42.2);
    for (const n of [3, 4]) {
      const g = guard(n);
      const lp = g.loop!;
      const speed = ENEMIES[g.kind].walkSpeed;
      const r = g.route!;
      for (let i = 0; i < r.length; i++) {
        const prev = (i + r.length - 1) % r.length;
        const leg = hyp2(r[i]![0] - r[prev]![0], r[i]![1] - r[prev]![1]) / speed;
        const gp = (((lp.leave[i]! - lp.leave[prev]!) % lp.period) + lp.period) % lp.period;
        expect(gp - leg, `#${n} stop ${i}`).toBeGreaterThanOrEqual(3);
        expect(gp - leg, `#${n} stop ${i}`).toBeLessThanOrEqual(6.2);
      }
    }
    expect(guard(3).loop).toEqual(guard(4).loop);
    expect([guard(3).pair, guard(4).pair]).toEqual([3, 2]);
  });
});

describe('G4 service yard and plant room (S1-detail C4, C5)', () => {
  const lit = (g: number) => b.lights.lights.filter((l) => l.group === g && l.on && l.intensity > 0);

  it('G4 yard 14 x 14, no bin store walls, bin screen 1.5 noLedge', () => {
    expect(solid.filter((p) => near(p.s[1], 3.0) && p.c[0] > -40.2 && p.c[0] < -29.8 && p.c[2] > -52.2 && p.c[2] < -44.8).map((p) => p.c)).toEqual([]);
    const screen = solid.filter((p) => near(p.s[1], 1.5) && p.c[0] > -40.5 && p.c[0] < -34.5 && p.c[2] > -54.5 && p.c[2] < -48.5 && near(Math.min(p.s[0], p.s[2]), 0.3));
    expect(screen.length).toBe(2);
    expect(screen.every((p) => p.noLedge)).toBe(true);
    // the three bins behind it (A12), the trolley and the roll cage at z -46 (A13)
    for (const [x, z] of [[-39.25, -53.2], [-39.25, -51.8], [-36.6, -49.8]]) expect(boxWith([x!, 0.6, z!], [1.4, 1.2, 1.1]), `bin (${x}, ${z})`).toBeTruthy();
    expect(boxWith([-30.5, 0.6, -46], [1.0, 1.2, 0.8])).toBeTruthy();
    expect(boxWith([-29.2, 0.6, -46], [1.0, 1.2, 0.8])).toBeTruthy();
  });

  it('G4 plant room clear 13.7 x 6.7, two ways out (the goods door and the hatch ladder)', () => {
    expect(solid.some((p) => near(p.c[2], -33) && near(p.s[2], 0.3) && near(p.s[1], 4.2) && near(p.s[0], 14))).toBe(true);
    expect(-26 - 0.15 - (-40 + 0.15)).toBeCloseTo(13.7);
    expect(-33 - 0.15 - (-40 + 0.15)).toBeCloseTo(6.7);
    const d = b.anchors.doors.find((q) => near(q.hinge.x, -33.6) && near(q.hinge.z, -40))!;
    expect(d).toBeTruthy();
    expect(d.locked).toBe(false);
    const lad = b.anchors.ladders.find((l) => near(l.base.x, -30) && near(l.base.z, -36.15))!;
    expect(lad).toBeTruthy();
    expect(lad.top.y).toBe(4.4);
    const up = nav.findPath([-30, -37], [-33, -38], 100000, 0, 4.4);
    expect(up, 'plant room floor -> plant roof').not.toBeNull();
    expect(up!.some((w) => w.link?.kind === 'ladder')).toBe(true);
    const into = nav.findPath([-33, -42], [-38, -36], 100000, 0, 0);
    expect(into, 'yard -> plant room').not.toBeNull();
    // through the door gap x -33.6..-32.4: where the (string-pulled) path crosses the wall line z -40
    const pts: [number, number][] = [[-33, -42], ...into!.map((w): [number, number] => [w[0], w[1]])];
    const cross: number[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [p, q] = [pts[i]!, pts[i + 1]!];
      if ((p[1] + 40) * (q[1] + 40) <= 0 && p[1] !== q[1]) cross.push(p[0] + ((q[0] - p[0]) * (-40 - p[1])) / (q[1] - p[1]));
    }
    expect(cross.length).toBe(1);
    expect(cross[0]!).toBeGreaterThan(-33.6);
    expect(cross[0]!).toBeLessThan(-32.4);
  });

  it('G4 roof hatch open, roof otherwise covered (LD 16.5.1)', () => {
    for (const [x, z] of [[-30, -36.5], [-30.5, -37], [-29.5, -37], [-30.5, -36], [-29.5, -36]] as const) expect(solid.filter((p) => covers(p, x, 4.3, z)).map((p) => p.c), `hatch (${x}, ${z})`).toEqual([]);
    for (const [x, z] of [[-35, -33.5], [-27, -33.5], [-35, -38], [-27, -38], [-35, -36.5], [-27, -36.5]] as const) expect(solid.some((p) => covers(p, x, 4.3, z)), `roof (${x}, ${z})`).toBe(true);
  });

  it('G4 CR1-yard lip: a canHang 4.4 ledge along z -40 over x -31..-27; no other hang on the south strip; the boost on nav', () => {
    const strip = ledges.filter((l) => l.canHang && near(l.top, 4.4, 1e-3) && Math.min(l.a.x, l.b.x) >= -40.01 && Math.max(l.a.x, l.b.x) <= -25.99 && Math.min(l.a.z, l.b.z) >= -40.01 && Math.max(l.a.z, l.b.z) <= -37.09);
    const lip = strip.filter((l) => near(l.a.z, -40, 1e-3) && near(l.b.z, -40, 1e-3));
    expect(lip.length).toBe(1);
    // (D-G4-1) the generator samples a lip every LEDGE.sample (0.2) and stops a sample short of the parapet ends: the lip runs
    // x -30.8..-27.2 for the bay x -31..-27
    expect(Math.min(lip[0]!.a.x, lip[0]!.b.x)).toBeLessThanOrEqual(-31 + LEDGE.sample + 1e-3);
    expect(Math.max(lip[0]!.a.x, lip[0]!.b.x)).toBeGreaterThanOrEqual(-27 - LEDGE.sample - 1e-3);
    expect(strip.filter((l) => !lip.includes(l)).map((l) => [l.a, l.b])).toEqual([]);
    expect(S1_LIP_SEGMENTS['CR1-yard']).toEqual({ a: [-31, -40], b: [-27, -40] });
    const cr = CAMPUS_COOP_LIPS.find((l) => l.id === 'CR1-yard')!;
    expect(onNav(cr.boost.x, cr.boost.z)).toBe(true);
    expect(cr.lip.y - cr.boost.floor).toBeGreaterThanOrEqual(4.3);
    expect(cr.lip.y - cr.boost.floor).toBeLessThanOrEqual(4.5);
  });

  it('G4 CR1-yard against a solo player (rules 1-5, LD 11.8)', () => {
    expect(segmentLipFailures('CR1-yard', 6.2)).toEqual([]);
    // the roll cage, the nearest 1.2 top, is 5.6 m off the lip (D:107)
    const cage = boxWith([-29.2, 0.6, -46], [1.0, 1.2, 0.8])!;
    expect(-40 - (cage.c[2] + cage.s[2] / 2)).toBeCloseTo(5.6);
  });

  it('G4 sync node A (SY:10): the fore and canopy switches on the yard board, none inside C1; their circuits', () => {
    const sw = lay.switches!;
    const fore = sw.filter((q) => q.group === S1_GROUPS.fore);
    const can = sw.filter((q) => q.group === S1_GROUPS.canopy);
    expect(fore.map((q) => [q.pos.x, q.pos.z])).toEqual([[-29.5, -40.3]]);
    expect(can.map((q) => [q.pos.x, q.pos.z])).toEqual([[-29.0, -40.3]]);
    expect(sw.filter((q) => inZone({ label: 'c1', box: [C1_BOX[0], C1_BOX[1], C1_BOX[2], C1_BOX[3]] }, q.pos.x, 0, q.pos.z)).length).toBe(0);
    expect(lit(S1_GROUPS.fore).length).toBe(BOLLARD_XS.length + 1);
    expect(lit(S1_GROUPS.fore).filter((l) => near(l.x, -33) && near(l.z, -40.4)).length).toBe(1);
    expect(lit(S1_GROUPS.canopy).length).toBe(CANOPY_LAMPS.length);
    expect(CANOPY_LAMPS.length).toBe(4);
  });

  it('G4 #7, #8, #12 on nav, cycles 25-45 s; #8 clear of the goods door swing', () => {
    guardChecks(7, 44.4);
    guardChecks(8, 28.0);
    guardChecks(12, 25.4);
    // the leaf sweeps z -40..-41.2 at x -33.6..-32.4: #8's stops 0.5 m or more south of it
    for (const p of guard(8).route!) expect(-41.2 - p[1]).toBeGreaterThanOrEqual(0.5);
  });

  it('G4 hide spot in the plant room (-38, -36) and the bin corner (-38, -50.4), on nav', () => {
    for (const [x, z] of [[-38, -36], [-38, -50.4]] as const) {
      expect(S1_HIDESPOTS.some((h) => near(h.pos.x, x) && near(h.pos.z, z))).toBe(true);
      expect(onNav(x, z), `hide (${x}, ${z})`).toBe(true);
    }
  });
});

describe('G5 forecourt, lawn, pavilion (S1-detail C6, C7)', () => {
  const lips = (): string[] => CAMPUS_COOP_LIPS.filter((l) => l.section === 0).map((l) => l.id);

  it('G5 CR1-east against a solo player (rules 1-5): helpers [], nothing standable >= 1.2 within 4 m, planters >= 1.0 m off, headroom to 6.3', () => {
    // (D-G5-1) headroom over the hangable run x -6..3.65: the G1 pavilion screen (x 3.65..3.75, y 4.4..6.8) ends the lip there
    expect(segmentLipFailures('CR1-east', 6.3, [-6, 3.65])).toEqual([]);
    // the planters (0.7) stay 1.2 m off the facade (D:123)
    const planters = solid.filter((p) => near(p.s[1], 0.7) && near(p.c[2], -35.6));
    expect(planters.length).toBe(3);
    for (const p of planters) expect(-34 - (p.c[2] + p.s[2] / 2)).toBeGreaterThanOrEqual(1.0);
    const cr = CAMPUS_COOP_LIPS.find((l) => l.id === 'CR1-east')!;
    expect(onNav(cr.boost.x, cr.boost.z)).toBe(true);
    expect(S1_LIP_SEGMENTS['CR1-east']).toEqual({ a: [-6, -34], b: [4, -34] });
    // the trees and the lockers are far off (D:123: trees 10 m, lockers 15 m)
    expect(hyp2(0 - 0, -44 + 34)).toBeGreaterThanOrEqual(10);
    expect(-34 - -49).toBeGreaterThanOrEqual(15);
  });

  it('G5 ledges on the pavilion: only the CR1-east lip hangs on the east block', () => {
    const east = ledges.filter((l) => l.canHang && near(l.top, 4.4, 1e-3) && Math.min(l.a.x, l.b.x) >= -16.01 && Math.max(l.a.x, l.b.x) <= 4.01 && Math.min(l.a.z, l.b.z) >= -34.01 && Math.max(l.a.z, l.b.z) <= -29.99);
    const lip = east.filter((l) => near(l.a.z, -34, 1e-3) && near(l.b.z, -34, 1e-3));
    expect(lip.length).toBe(1);
    // x -6..4 minus the screen's cut at x 3.7 (and the generator's 0.2 sampling at the ends, D-G4-1)
    expect(Math.min(lip[0]!.a.x, lip[0]!.b.x)).toBeLessThanOrEqual(-6 + LEDGE.sample + 1e-3);
    expect(Math.max(lip[0]!.a.x, lip[0]!.b.x)).toBeGreaterThanOrEqual(3.6 - LEDGE.sample - 1e-3);
    expect(Math.max(lip[0]!.a.x, lip[0]!.b.x)).toBeLessThanOrEqual(4 + 1e-3);
    expect(east.filter((l) => !lip.includes(l)).map((l) => [l.a, l.b])).toEqual([]);
    const west = boxWith([-11, 2.2, -32], [10, 4.4, 4])!;
    expect(west.noLedge).toBe(true);
    expect(boxWith([-1, 2.2, -32], [10, 4.4, 4])!.noLedge).toBeFalsy();
  });

  it('G5 every S1 lip (CR1, CR1-south, CR1-yard, CR1-east): data and solo checks; CAMPUS_COOP_LIPS in that order', () => {
    expect(lips()).toEqual(['CR1', 'CR1-south', 'CR1-yard', 'CR1-east']);
    for (const l of CAMPUS_COOP_LIPS.filter((q) => q.section === 0)) {
      expect(l.lip.y - l.boost.floor, l.id).toBeGreaterThanOrEqual(4.3);
      expect(l.lip.y - l.boost.floor, l.id).toBeLessThanOrEqual(4.5);
      expect(onNav(l.boost.x, l.boost.z), `${l.id} boost`).toBe(true);
    }
    // CR1 and CR1-south point-style, as tests/campusS1.test.ts:334-389
    const cr1 = CAMPUS_COOP_LIPS.find((l) => l.id === 'CR1')!;
    expect(cr1.lip).toMatchObject({ x: -14, z0: -40, z1: -34, y: 4.4 });
    expect(cr1.boost).toEqual({ floor: 0, x: -13.5, z: -38 });
    for (const id of ['CR1', 'CR1-south']) {
      const l = CAMPUS_COOP_LIPS.find((q) => q.id === id)!;
      const g = { y: l.lip.y, a: { x: l.lip.x, z: l.lip.z0 }, b: { x: l.lip.x, z: l.lip.z1 }, n: l.lip.n };
      expect(soloJumpThreats(solid, g, () => false, 0.5), id).toEqual([]);
      expect(soloTopLandingThreats(solid, l.top, () => false, 0.5), id).toEqual([]);
    }
    // CR1 headroom (rule 5) over its face
    const l = cr1.lip;
    const x0 = l.x - (0.45 + HANG.out);
    const x1 = l.x + 0.4;
    expect(solid.filter((p) => p.c[0] + p.s[0] / 2 > x0 && p.c[0] - p.s[0] / 2 < x1 && p.c[2] + p.s[2] / 2 > l.z0 && p.c[2] - p.s[2] / 2 < l.z1 && top(p) > l.y + 0.1 && p.c[1] - p.s[1] / 2 < 6.2).map((p) => p.c)).toEqual([]);
    // rule 2 for CR1 / CR1-south: nothing solo-standable >= 1.2 within 4 m in plan
    for (const id of ['CR1', 'CR1-south']) {
      const q = CAMPUS_COOP_LIPS.find((r) => r.id === id)!.lip;
      const bad = solid.filter((p) => {
        const t = top(p);
        if (t < 1.2 || t >= q.y - 0.05) return false;
        if (Math.min(p.s[0], p.s[2]) < LEDGE.climbDepth) return false;
        if (p.noLedge && t > MANTLE) return false;
        const gx = Math.max(0, Math.abs(p.c[0] - q.x) - p.s[0] / 2);
        const gz = Math.max(0, Math.max(q.z0 - (p.c[2] + p.s[2] / 2), p.c[2] - p.s[2] / 2 - q.z1));
        return hyp2(gx, gz) <= 4;
      });
      expect(bad.map((p) => [p.c, p.s]), id).toEqual([]);
    }
    // rule 3: nothing under the canopy east and south edges
    const under = solid.filter((p) => {
      const t = top(p);
      const bottom = p.c[1] - p.s[1] / 2;
      if (t < 0.3 || bottom > 4.1 || t > 4.19) return false;
      const eastEdge = p.c[0] + p.s[0] / 2 > -15 && p.c[0] - p.s[0] / 2 < -13 && p.c[2] + p.s[2] / 2 > -40.8 && p.c[2] - p.s[2] / 2 < -34.3;
      const southEdge = p.c[0] + p.s[0] / 2 > -25.8 && p.c[0] - p.s[0] / 2 < -14.2 && p.c[2] + p.s[2] / 2 > -41 && p.c[2] - p.s[2] / 2 < -39;
      return eastEdge || southEdge;
    });
    expect(under.map((p) => [p.c, p.s])).toEqual([]);
    // the canopy's CR1 and CR1-south lips still hang (A28-cloud's point is 1.45 m off them)
    expect(ledges.some((q) => q.canHang && near(q.top, 4.4, 1e-3) && near(q.a.x, -14, 1e-3) && near(q.b.x, -14, 1e-3))).toBe(true);
    expect(ledges.some((q) => q.canHang && near(q.top, 4.4, 1e-3) && near(q.a.z, -40, 1e-3) && near(q.b.z, -40, 1e-3) && q.a.x > -26.01 && q.a.x < -13.99)).toBe(true);
  });

  it('G5 lights: the smoke circuit (45) one lamp at (8, 2.2, -48.5) r 3 and one switch; the CR1 boost level logged', () => {
    const sm = b.lights.lights.filter((l) => l.group === S1_GROUPS.smoke);
    expect(S1_GROUPS.smoke).toBe(45);
    expect(sm.length).toBe(1);
    expect([sm[0]!.x, sm[0]!.y, sm[0]!.z]).toEqual([8, 2.2, -48.5]);
    expect(sm[0]!.radius).toBeCloseTo(lampReach(3));
    expect(sm[0]!.on && sm[0]!.destructible && sm[0]!.electric).toBe(true);
    expect(lay.switches!.filter((q) => q.group === S1_GROUPS.smoke).map((q) => [q.pos.x, q.pos.z])).toEqual([[6.2, -49.8]]);
    // (L6) no dark assert at the CR1 boost point: J10 lights the forecourt to its band, the boost gets a real gap
    const cr1 = CAMPUS_COOP_LIPS.find((l) => l.id === 'CR1')!;
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(`G5 CR1 boost (${cr1.boost.x}, 0.9, ${cr1.boost.z}): level ${levelAt(cr1.boost.x, 0.9, cr1.boost.z).toFixed(3)} (shadow ${LIGHT.shadow})`);
  });

  it('G5 K1 doorman choke: with #5\'s cone blocked no path verge -> C1 near door; without it one exists', () => {
    const post = guard(5);
    const from: [number, number] = [S1.start.x, S1.start.z];
    const to: [number, number] = [S1_DOORS.c1Near[0], S1_DOORS.c1Near[1]];
    expect(nav.findPath(from, to, 1e6, 0, 0)).not.toBeNull();
    const fx = Math.sin(post.yaw);
    const fz = Math.cos(post.yaw);
    const inCone = (x: number, z: number): boolean => {
      const dx = x - post.x;
      const dz = z - post.z;
      const d = hyp2(dx, dz);
      if (d < 1e-6) return true;
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d)));
      return (d <= PERCEPTION.focusRange && ang <= PERCEPTION.focusHalf) || (d <= PERCEPTION.periphRange && ang <= PERCEPTION.periphHalf);
    };
    const blocked: number[] = [];
    for (let i = 0; i < nav.walk.length; i++) {
      if (!nav.walk[i]) continue;
      if (Math.abs(nav.height[i]! - 0) > 1.7) continue;
      const [x, z] = nav.center(i % nav.cols);
      if (inCone(x, z)) {
        blocked.push(i);
        nav.walk[i] = 0;
      }
    }
    try {
      expect(blocked.length).toBeGreaterThan(50);
      expect(nav.findPath(from, to, 1e6, 0, 0)).toBeNull();
      expect(nav.isWalkable(nav.cellOf(post.x, post.z + 0.75, 0))).toBe(true);
    } finally {
      for (const i of blocked) nav.walk[i] = 1;
    }
    expect(nav.findPath(from, to, 1e6, 0, 0)).not.toBeNull();
  });

  it('G5 #13, #14, #15, #16 on nav, cycles 25-45 s; #6 / #16 pair indices 14 / 5; the grit bins and trees', () => {
    guardChecks(13, 44.4);
    guardChecks(14, null);
    guardChecks(15, 40.8);
    guardChecks(16, 30.3);
    expect(guard(6).pair).toBe(14);
    expect(guard(16).pair).toBe(5);
    expect(G[14]).toBe(guard(16));
    expect(G[5]).toBe(guard(6));
    for (const [x, z] of [[-24, -48], [-10, -47.5]]) expect(boxWith([x!, 0.6, z!], [0.8, 1.2, 0.8]), `grit bin (${x}, ${z})`).toBeTruthy();
    for (const [x, z] of [[0, -44], [16, -40]]) expect(b.cylinders.some((c) => near(c.c[0], x!) && near(c.c[2], z!) && near(c.r, 0.3) && near(c.h, 5)), `tree (${x}, ${z})`).toBe(true);
  });
});

describe('G6 data, routes, rooms, final tests (S1-detail D:136-140, D:147, D:239-257)', () => {
  it('G6 guard count 15: kinds, guns, valid data, 15 + alarm reinforcements within maxAlive, none dormant', () => {
    expect(G.length).toBe(15);
    expect(G.map((g) => g.kind)).toEqual(['officer', 'officer', 'grunt', 'officer', 'officer', 'grunt', 'grunt', 'grunt', 'officer', 'officer', 'grunt', 'grunt', 'officer', 'grunt', 'officer']);
    expect(G.map((g) => ENEMIES[g.kind].gun)).toEqual(['pistolSd', 'pistolSd', 'rifle', 'pistolSd', 'pistolSd', 'rifle', 'rifle', 'rifle', 'pistolSd', 'pistolSd', 'rifle', 'rifle', 'pistolSd', 'rifle', 'pistolSd']);
    expect(checkSectorGuards(S1)).toEqual([]);
    expect(checkSectors(CAMPUS_SECTORS)).toEqual([]);
    expect(S1.dogs ?? 0).toBe(0);
    expect(S1.perStage).toBe(2);
    expect(G.length + SECTOR.alarmMax * S1.perStage).toBe(21);
    // with 4 players (the extras in): still within the cap
    expect(S1.guards.length).toBe(17);
    expect(S1.guards.length + SECTOR.alarmMax * S1.perStage).toBeLessThanOrEqual(SECTOR.maxAlive);
    for (const [i, g] of G.entries()) {
      expect((g as { dormant?: unknown }).dormant, `guard ${i}`).toBeUndefined();
      expect(g.role, `guard ${i} role`).toBeTruthy();
      expect(g.zone, `guard ${i} zone`).toBeTruthy();
      expect(g.reason && g.reason.length > 8, `guard ${i} reason`).toBe(true);
      expect(hyp2(g.x - S1.start.x, g.z - S1.start.z), `guard ${i} from the start`).toBeGreaterThanOrEqual(7);
    }
  });

  it('G6 cycles: every patrol 25-45 s by the formula; the posts are #1, #5, #6, #14 only; the planned values to 0.1 s', () => {
    const posts: number[] = [];
    const out = new Map<number, number>();
    for (let n = 1; n <= 16; n++) {
      if (n === 10) continue;
      const c = cycle(guard(n));
      if (c === null) {
        posts.push(n);
        continue;
      }
      out.set(n, c);
      expect(c, `#${n} cycle`).toBeGreaterThanOrEqual(25);
      expect(c, `#${n} cycle`).toBeLessThanOrEqual(45);
    }
    expect(posts).toEqual([1, 5, 6, 14]);
    const want: [number, number][] = [[2, 41.7], [3, 42], [4, 42], [7, 44.4], [8, 28.0], [9, 30.8], [11, 42.2], [12, 25.4], [13, 44.4], [15, 40.8], [16, 30.3]];
    for (const [n, c] of want) expect(out.get(n)!, `#${n}`).toBeCloseTo(c, 1);
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(`G6 cycles ${[...out.entries()].map(([n, c]) => `#${n} ${c.toFixed(1)}`).join(', ')}`);
  });

  it('G6 pairs and operator: #3 / #4 pair 3 / 2 on one loop clock; #6 / #16 pair 14 / 5; desk operator 1 is #2 (CCTV)', () => {
    expect(guard(3).pair).toBe(3);
    expect(guard(4).pair).toBe(2);
    expect(guard(3).loop).toEqual(guard(4).loop);
    expect(guard(6).pair).toBe(14);
    expect(guard(16).pair).toBe(5);
    expect(S1_DESKS.length).toBe(1);
    expect(S1_DESKS[0]!.operator).toBe(1);
    expect(G[S1_DESKS[0]!.operator!]).toBe(guard(2));
    expect(guard(2).role).toBe('cctv');
    expect(G[4]!.role).toBe('posted');
    expect(G[4]!.post).toEqual({ leash: 5, guards: 'c1-door' });
  });

  it('G6 M8 isolation: #7 and the rest of the loners hold their 3 s; the dual-takedown pairs #1-#4, #6, #16 are exempt; the recorded design findings (F8) are exactly #5, #8, #9, #12, #14', () => {
    const world = new SightWorld(b.boxes, b.cylinders);
    // (TAG-1) measured on the base list: the 3-4 player extras spawn only for a team of 3 / 4
    const timed: CheckGuard[] = G.map((g) => {
      const speed = ENEMIES[g.kind].walkSpeed * (g.loop ? 1 : CHECK_PATROL_PACE);
      return { x: g.x, z: g.z, route: g.route as readonly (readonly [number, number])[] | undefined, wait: g.wait, waits: g.waits, speed, loop: g.loop };
    });
    const rows = G.map((g, i) => ({ n: i < 9 ? i + 1 : i + 2, run: longestIsolation(world, timed, i, 15, g.takedownSpot), ok: isolatedInTime(world, timed, i, g.takedownSpot) }));
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(rows.map((r) => `#${r.n} ${r.run}s ${r.ok ? 'ok' : 'NOT isolated'}`).join('\n'));
    // D:214: the pairs are each other's overlap partner, their takedowns come by a lure; every other guard must have his
    // isolation moment. Not so for #5, #8, #9, #12, #14 (F8 in s1-build.md: 0 s, #9 0.5 s; no spot along their own routes
    // is unseen): the section's 15 guards in the open see each other. Recorded here so a change turns the test red: when the
    // lead moves a route or a post and one of these gains 3 s, drop it from FINDING.
    // (S1 v3) #13's longer walk (x -22..-2) now has a 3.5 s unseen stretch: off the findings; #15's new gate-fence walk stays isolated (12.75 s)
    const FINDING = [5, 8, 9, 12, 14];
    const must = rows.filter((r) => ![1, 2, 3, 4, 6, 16].includes(r.n));
    expect(must.filter((r) => !r.ok).map((r) => r.n)).toEqual(FINDING);
    for (const r of must) if (FINDING.includes(r.n)) expect(r.run, `#${r.n}`).toBeLessThan(CHECK_ISOLATION);
    expect(must.filter((r) => r.ok).map((r) => r.n)).toEqual([7, 11, 13, 15]);
    expect(CHECK_ISOLATION).toBe(3);
  });

  it('G6 routes: three, each from the start through the objective (4 m) into C1; every point on nav; the climbs are the planned ones', () => {
    expect(S1.routes.length).toBe(3);
    // (S1 v3) the lit lane (solo), the dark south and west fences with the plant roof (solo), the garden gate (two players)
    expect(S1.routes.map((r) => r.name)).toEqual([
      'The lane under the floodlight, the aisle and the carport',
      'The south footway, the west fence and the plant roof',
      'The garden gate, the bike shelter and the carport roof',
    ]);
    expect(S1.routes.map((r) => r.obj)).toEqual([8, 6, 11]);
    const exit = exitZone(S1)!;
    for (const r of S1.routes) {
      const first = r.pts[0]!;
      const at = r.pts[r.obj]!;
      const last = r.pts[r.pts.length - 1]!;
      expect(hyp2(first[0] - S1.start.x, first[1] - S1.start.z), r.name).toBeLessThan(0.5);
      expect(hyp2(at[0] - S1.objective.x, at[1] - S1.objective.z), r.name).toBeLessThanOrEqual(SECTOR.downloadRange);
      expect(inZone(exit, last[0], last[2] ?? 0, last[1]), r.name).toBe(true);
      r.pts.forEach((p, i) => expect(onNav(p[0], p[1], p[2] ?? 0), `${r.name} point ${i} (${p})`).toBe(true));
    }
    expect(new Set(S1.routes.map((r) => JSON.stringify(r.pts))).size).toBe(3);
    expect(S1.routes.map((r) => r.climbs ?? [])).toEqual([[], [10, 13], [7, 8, 10, 11, 13]]);
    expect(S1.reinforce).toEqual([[11, -79], [-33, -41]]);
    for (const [x, z] of S1.reinforce) expect(onNav(x, z), `reinforce (${x}, ${z})`).toBe(true);
    // the ladder leg climbs the caged ladder at (-38, -40.4); the drop leg is the canopy hatch (A65)
    expect(b.anchors.ladders.some((l) => near(l.base.x, -38) && near(l.top.y, 4.4))).toBe(true);
  });

  it('G6 routes: every walked leg has an analyticNav path within 2.5 x its length + 6', () => {
    for (const r of S1.routes) {
      for (let i = 0; i + 1 < r.pts.length; i++) {
        if ((r.climbs ?? []).includes(i)) continue;
        const a = r.pts[i]!;
        const c = r.pts[i + 1]!;
        const path = nav.findPath([a[0], a[1]], [c[0], c[1]], 100000, a[2] ?? 0, c[2] ?? 0);
        expect(path, `${r.name} leg ${i}: ${a} -> ${c}`).not.toBeNull();
        let len = 0;
        let q: [number, number] = [a[0], a[1]];
        for (const w of path!) {
          len += hyp2(w[0] - q[0], w[1] - q[1]);
          q = [w[0], w[1]];
        }
        expect(len, `${r.name} leg ${i} detour`).toBeLessThanOrEqual(hyp2(c[0] - a[0], c[1] - a[1]) * 2.5 + 6);
      }
    }
    // the ladder leg of the high route: the ground reaches the plant roof by the ladder link
    const up = nav.findPath([-38, -41.3], [-38, -39.2], 100000, 0, 4.4);
    expect(up).not.toBeNull();
    expect(up!.some((w) => w.link?.kind === 'ladder')).toBe(true);
  });

  it('G6 runtime nav: every walked leg of the three v2 routes has a path on the guards\' runtime grid (the e2e\'s budget 60000)', () => {
    const rn = runtimeNav(b, lay.playerSpawns[0]!.pos, campusOps.navLayers ?? 3, lay.navSeeds ?? []);
    const fails: string[] = [];
    for (const r of S1.routes) {
      for (let i = 0; i + 1 < r.pts.length; i++) {
        if ((r.climbs ?? []).includes(i)) continue;
        const a = r.pts[i]!;
        const c = r.pts[i + 1]!;
        if (!rn.findPath([a[0], a[1]], [c[0], c[1]], 60000, a[2] ?? 0, c[2] ?? 0)) fails.push(`${r.name} leg ${i} ${JSON.stringify([a, c])}`);
      }
    }
    expect(fails).toEqual([]);
  });

  it('G6 hide spots: the final seven, all on nav', () => {
    expect(S1_HIDESPOTS.map((h) => [h.pos.x, h.pos.z])).toEqual([[-38, -50.4], [-33.4, -60.75], [24.2, -68], [-7, -51.2], [9.3, -48.2], [-38, -36], [-25, -62]]);
    expect(lay.hideSpots!.filter((h) => h.pos.z < -32).length).toBeGreaterThanOrEqual(7);
    for (const h of S1_HIDESPOTS) expect(onNav(h.pos.x, h.pos.z), `hide (${h.pos.x}, ${h.pos.z})`).toBe(true);
  });

  it('G6 rooms: the 14 rooms, none overlap, no squad, every id has an art tag, start / objective / C1 each in their room', () => {
    expect(S1_ROOMS.map((r) => r.id)).toEqual(['verge', 'gatehouse', 'gateroof', 'lane', 'apron', 'park', 'carport', 'dyard', 'plantroom', 'plantroof', 'forecourt', 'lawn', 'pavilion', 'c1']);
    expect(S1_ROOMS.every((r) => (r.squad ?? []).length === 0)).toBe(true);
    for (let i = 0; i < S1_ROOMS.length; i++) {
      for (let j = i + 1; j < S1_ROOMS.length; j++) {
        const a = S1_ROOMS[i]!;
        const c = S1_ROOMS[j]!;
        const ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX);
        const oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
        const oy = Math.min(a.maxY ?? Infinity, c.maxY ?? Infinity) - Math.max(a.minY ?? -Infinity, c.minY ?? -Infinity);
        expect(ox > 0.01 && oz > 0.01 && oy > 0.01, `${a.id} overlaps ${c.id}`).toBe(false);
      }
    }
    for (const r of S1_ROOMS) expect(S1_ART_TAGS[r.id], `art tag of ${r.id}`).toBeTruthy();
    expect(Object.keys(S1_ART_TAGS).sort()).toEqual(S1_ROOMS.map((r) => r.id).sort());
    // the pieces of S1 stand in the room the plan names
    const roomOf = (x: number, z: number, y = 0): string[] => S1_ROOMS.filter((r) => inRoom(r, x, z, 0, y)).map((r) => r.id);
    expect(roomOf(S1.start.x, S1.start.z)).toEqual(['verge']);
    // (S1 v3) the objective is the courier's van, in the car park
    expect(roomOf(S1.objective.x, S1.objective.z)).toEqual(['park']);
    expect(roomOf(17, -76, 3.3)).toEqual(['gateroof']);
    expect(roomOf(-20, -32)).toEqual(['c1']);
    expect(roomOf(-30, -64)).toEqual(['park']);
    expect(roomOf(-12, -58, 3.0)).toEqual(['carport']);
    expect(roomOf(-36, -36)).toEqual(['plantroom']);
    expect(roomOf(-36, -36, 4.4)).toEqual(['plantroof']);
    // the canopy top (y 4.4) has no room of its own in D:136-140: the forecourt box (no y bounds) holds it
    expect(roomOf(-20, -37, 4.4)).toEqual(['forecourt']);
    expect(roomOf(-20, -32, 4.4)).toEqual(['pavilion']);
  });

  it('G6 rule 6: boxes 1.9-4.2 high standing on the ground in S1 are noLedge, except the planned van cab and body', () => {
    // (S1 v3) the cab (2.0) and the box body (2.8) are the solo van climb
    const van = (p: BoxPiece): boolean => near(p.c[0], -26.2) && ((near(p.c[1], 1.0) && near(p.c[2], -61.95) && near(p.s[1], 2.0)) || (near(p.c[1], 1.4) && near(p.c[2], -59.85) && near(p.s[1], 2.8)));
    const bad: string[] = [];
    let n = 0;
    for (const p of solid) {
      const h = p.s[1];
      if (h < 1.9 || h > 4.2 || p.c[2] < -80 || p.c[2] > -30 || p.c[0] < -45 || p.c[0] > 30) continue;
      if (p.c[1] - p.s[1] / 2 > 0.01) continue;
      if (van(p)) continue;
      n++;
      if (!p.noLedge) bad.push(`${JSON.stringify(p.c)} ${JSON.stringify(p.s)}`);
    }
    expect(n).toBeGreaterThan(10);
    expect(bad).toEqual([]);
    expect(solid.filter(van).length).toBe(2);
  });

  it('G6 dark by reason: no lit lamp on the verge, in the bin corner, on any roof top or in the plant room', () => {
    const lit = litS1();
    const where: string[] = [];
    for (const l of lit) {
      const at = `lamp ${l.id} (${l.x}, ${l.y}, ${l.z})`;
      // (S1 v3, A4) the garden gate's lamp is the verge's one lamp: lit by reason (a real site lights its pedestrian gate), cut
      // at the gatehouse switch or shot; the rest of the verge and the start stay dark
      if (near(l.x, 23) && near(l.z, -58.45)) continue;
      if (l.x >= 20 && l.x <= 26 && l.z >= -80 && l.z <= -54) where.push(`${at} on the verge`);
      if (l.x >= -40 && l.x <= -35 && l.z >= -54 && l.z <= -49) where.push(`${at} in the bin corner`);
      if (l.x >= 13.5 && l.x <= 20 && l.z >= -79 && l.z <= -72.5 && l.y >= 3.3) where.push(`${at} on the gatehouse roof`);
      if (l.x >= -40 && l.x <= 3.7 && l.z >= -40 && l.z <= -30 && l.y >= 4.3) where.push(`${at} on the plant roof / pavilion / canopy`);
      if (l.x >= -24 && l.x <= 0 && l.z >= -63 && l.z <= -54 && l.y >= 3) where.push(`${at} on the carport roof`);
      if (l.x >= -40 && l.x <= -26 && l.z >= -40 && l.z <= -33 && l.y < 4) where.push(`${at} in the plant room`);
    }
    expect(where).toEqual([]);
  });

  it('G6 lights: 45 lit lamps, all from S1_LIGHTS, destructible and electric, no fitting off or dead; none below its as-built intensity but the lane flood (L1); the block carries the PROVISIONAL / TODO(light-realism) header', () => {
    const lit = litS1();
    const lamps = s1Lamps(S1_LIGHTS);
    expect(lit.length).toBe(S1_LIT_NOW);
    expect(lamps.length).toBe(S1_LIT_NOW);
    for (const l of lit) {
      const m = lamps.find((q) => near(q.x, l.x) && near(q.y, l.y) && near(q.z, l.z) && near(q.i, l.intensity) && q.group === l.group);
      expect(m, `lamp ${l.id} (${l.x}, ${l.y}, ${l.z}) is not in S1_LIGHTS`).toBeTruthy();
      expect(l.destructible, `lamp ${l.id} destructible`).toBe(true);
      expect(l.electric, `lamp ${l.id} electric`).toBe(true);
      expect(l.destroyed, `lamp ${l.id} dead`).toBeFalsy();
    }
    // no S1 fitting is built off: every S1 lamp of the registry (lit or not) is lit
    const all = b.lights.lights.filter((l) => l.x >= -40 && l.x <= 26 && l.z >= -80 && l.z <= -30);
    expect(all.filter((l) => !(l.intensity > 0)).map((l) => l.id)).toEqual([]);
    // the as-built intensities (B:214-314) are the floor: columns 0.9, bollards 0.5, canopy 0.85, dock 0.8, gate tube 0.9; the
    // lane flood is light-realism L1's calibrated 0.5 (0.8 over-lit the lane past P2 with the east twin's spill)
    const floor: [number, number][] = [[S1_LIGHTS.column.i, 0.9], [S1_LIGHTS.bollards.i, 0.5], [S1_LIGHTS.canopy.i, 0.85], [S1_LIGHTS.dock.i, 0.8], [S1_LIGHTS.gate.i, 0.9]];
    for (const [got, asBuilt] of floor) expect(got).toBeGreaterThanOrEqual(asBuilt);
    expect(S1_LIGHTS.laneFlood.i).toBe(0.5);
    // the lane flood is a photocell lamp: electric, on its own circuit, no switch
    const lane = lit.find((l) => l.group === S1_GROUPS.lane)!;
    expect(lane).toBeTruthy();
    expect(lane.electric).toBe(true);
    expect(lay.switches!.some((sw) => sw.group === S1_GROUPS.lane)).toBe(false);
    // the header
    const src = readFileSync(new URL('../src/world/maps/campusV2/s1Data.ts', import.meta.url), 'utf8');
    // (light-realism L1 v2 port) the car park and the lane are out of it (L1 calibrated them); the other S1 lamps stay in
    expect(src).toContain('// PROVISIONAL - light-realism retunes these (docs/light-realism/PLAN.md, AS/NZS 1158.3.1), except the car-park columns and');
    expect(src).toContain('// TODO(light-realism): replace the other S1 lamps with calibrated values.');
    expect(src.indexOf('PROVISIONAL - light-realism')).toBeLessThan(src.indexOf('export const S1_LIGHTS'));
  });
});


describe('S1 v3: the courier van, the garden gate and its lamp (campus v2)', () => {
  const gate = (): ReturnType<typeof b.anchors.doors.find> => b.anchors.doors.find((d) => near(d.hinge.x, 22.4) && near(d.hinge.z, -58));

  it('the objective is the courier van, at least 40 m from the start, label exact', () => {
    expect(S1.objective).toMatchObject({ kind: 'download', label: "Clone the courier's badge at his van, west end of the solar carport", x: -26.2, y: 0, z: -57.8 });
    expect(hyp2(S1.objective.x - S1.start.x, S1.objective.z - S1.start.z)).toBeGreaterThanOrEqual(40);
    // the clone point is behind the van (the body's rear face z -58.25) and on nav
    expect(onNav(S1.objective.x, S1.objective.z)).toBe(true);
  });

  it('solo routes: checkSoloRoutes passes; routes 0 and 1 cross no team door, route 2 crosses the garden gate', () => {
    const doorAt = doorFinder(b.anchors.doors);
    expect(checkSoloRoutes([S1], doorAt)).toEqual([]);
    const d = doorAt(S1_DOORS.gardenGate[0], S1_DOORS.gardenGate[1])!;
    expect(d).toBeTruthy();
    const crosses = S1.routes.map((r) => r.pts.some((p, i) => i + 1 < r.pts.length && legCrossesDoor(p, r.pts[i + 1]!, d)));
    expect(crosses).toEqual([false, false, true]);
  });

  it('the garden gate: a locked, unbreachable door at (23, -58) opened by two players on the verge side within 1 s', () => {
    const d = gate()!;
    expect(d).toBeTruthy();
    expect(d.locked).toBe(true);
    expect(d.breachable).toBe(false);
    expect(d.width).toBe(1.2);
    expect(S1_DOORS.gardenGate).toEqual([23, -58]);
    const pg = S1.pairGates!;
    expect(pg.length).toBe(1);
    expect(pg[0]!.door).toEqual([23, -58]);
    expect([pg[0]!.a.label, pg[0]!.b.label]).toEqual(['Hold the gate', 'Draw the bolt']);
    // both keys on nav, on the verge side (south, z < -58) of the fence
    for (const k of [pg[0]!.a, pg[0]!.b]) {
      expect(onNav(k.at[0], k.at[1]), `key (${k.at})`).toBe(true);
      expect(k.at[1]).toBeLessThan(-58);
    }
    // the window rule: one player cannot do both keys; a second player on the other key within 1 s opens it
    const g = new SectorPairGates([S1]);
    expect(g.press(0, 0, true, 0, 10)).toBe('wait');
    expect(g.press(0, 0, false, 0, 10.3)).toBe('wait');
    expect(g.isOpen(0, 0)).toBe(false);
    expect(g.press(0, 0, false, 1, 10.6)).toBe('open');
    expect(g.isOpen(0, 0)).toBe(true);
    // a partner that is too late does not open it
    const late = new SectorPairGates([S1]);
    expect(late.press(0, 0, true, 0, 10)).toBe('wait');
    expect(late.press(0, 0, false, 1, 12)).toBe('wait');
  });

  it('the garden-gate fence: the cap line is declared, no ledge within 1 m of the gate above y 2, the shut gate forces the long way round', () => {
    expect(S1_FENCE_CAP_LINES).toContainEqual([6, -58, 26, -58, 2.4]);
    const high = ledges.filter((l) => l.top > 2 && Math.min(hyp2(l.a.x - 23, l.a.z + 58), hyp2(l.b.x - 23, l.b.z + 58), hyp2((l.a.x + l.b.x) / 2 - 23, (l.a.z + l.b.z) / 2 + 58)) < 1);
    expect(high.map((l) => [l.a, l.b, l.top])).toEqual([]);
    // shut, the gate gap is closed to the ground: the verge reaches the lawn only round the fence's west end (x 6), through
    // the car park; open (the gate in the nav), the way is the few metres through the gap
    const shut: NavBlocker = { cx: 23, cz: -58, hx: 0.6, hz: 0.1, yaw: 0, bottom: 0, top: 2.1 };
    const closed = analyticNav([-42, -82, 28, -28], { extra: [shut] });
    const len = (path: ReturnType<NavGrid['findPath']>, a: [number, number]): number => {
      let t = 0;
      let q = a;
      for (const w of path!) {
        t += hyp2(w[0] - q[0], w[1] - q[1]);
        q = [w[0], w[1]];
      }
      return t;
    };
    const way = closed.findPath([24, -62], [23, -55], 1e6, 0, 0);
    expect(way).not.toBeNull();
    expect(len(way, [24, -62])).toBeGreaterThan(30);
    expect(len(nav.findPath([24, -62], [23, -55], 1e6, 0, 0), [24, -62])).toBeLessThan(12);
  });

  it('the van is a step onto the carport: a hangable 3.0 ledge on x -24 within the body length, its east face 1.1 m from it', () => {
    const lip = ledges.filter((l) => l.canHang && near(l.top, 3.0, 1e-3) && near(l.a.x, -24, 1e-3) && near(l.b.x, -24, 1e-3) && Math.min(l.a.z, l.b.z) <= -58.25 && Math.max(l.a.z, l.b.z) >= -61.45);
    expect(lip.length).toBeGreaterThan(0);
    const body = boxWith([-26.2, 1.4, -59.85], [2.2, 2.8, 3.2])!;
    expect(-24 - (body.c[0] + body.s[0] / 2)).toBeCloseTo(1.1);
    expect(body.c[2] - body.s[2] / 2).toBeCloseTo(-61.45);
    expect(body.c[2] + body.s[2] / 2).toBeCloseTo(-58.25);
    // visual only: the livery, the windscreen, the load space and the open rear doors do not collide
    const VAN_VISUAL = b.boxes.filter((p) => p.c[0] < -24.9 && p.c[0] > -27.5 && p.c[2] > -63 && p.c[2] < -57.5 && !p.collide);
    expect(VAN_VISUAL.length).toBe(6);
  });

  it('the garden gate lamp: on the gatehouse circuit, last in s1Lamps, outside the cap; it lights the gate, and with the circuit off the gate is dark', () => {
    const lamps = s1Lamps(S1_LIGHTS);
    expect(lamps[lamps.length - 1]).toBe(S1_LIGHTS.gateLamp);
    expect(S1_LIGHTS.gateLamp).toMatchObject({ x: 23, y: 2.8, z: -58.45, r: 4.5, i: 0.8, group: S1_GROUPS.gate });
    const l = b.lights.lights.find((q) => near(q.x, 23) && near(q.y, 2.8) && near(q.z, -58.45))!;
    expect(l).toBeTruthy();
    expect(l.group).toBe(43);
    expect(l.destructible && l.electric).toBe(true);
    // 0.45 m south of the fence line (the cap sits on z -58 +- 0.05): shootable from the verge
    expect(-58 - l.z).toBeGreaterThan(0.3);
    const at = [23, 0.9, -59.5] as const;
    const lit = levelAt(...at);
    for (const q of b.lights.lights) if (q.group === 43) q.on = false;
    const cut = levelAt(...at);
    for (const q of b.lights.lights) if (q.group === 43) q.on = true;
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(`gate lamp (23, 0.9, -59.5): lit ${lit.toFixed(3)}, gate circuit cut ${cut.toFixed(3)}, shadow ${LIGHT.shadow}`);
    expect(lit).toBeGreaterThan(LIGHT.shadow);
    expect(cut).toBeLessThan(LIGHT.shadow);
  });
});
