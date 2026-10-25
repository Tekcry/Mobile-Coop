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
import { soloJumpThreats, soloTopLandingThreats } from './helpers/soloJumpReach';
import { generateLedges, suppressLedgesNear, type Ledge } from '../src/world/anchors';
import { MOVEMENT } from '../src/config/movement';
import { ENEMIES } from '../src/ai/enemyDefs';
import { PATROL } from '../src/ai/patrol';
import { LIGHT, contribution } from '../src/world/lights';
import { CHECK_PATROL_PACE, CHECK_SPOT, distToGuard } from '../src/game/sectorCheck';
import { checkSectors, type SectorGuard } from '../src/game/sectors';
import { DESK_POST_RADIUS } from '../src/game/sectorDesks';

vi.resetModules();
const { flags } = await import('../src/core/flags');
flags.campusV2 = [1];
const { LevelBuilder } = await import('../src/world/levelBuilder');
const { campusOps } = await import('../src/world/maps/campusOps');
const { CAMPUS_PARTS, CAMPUS_V2_PARTS } = await import('../src/world/maps/campusSections');
const { CAMPUS_SECTORS, CAMPUS_SECURITY } = await import('../src/world/maps/campusSectors');
const { s1Lamps, S1_DOORS, S1_GROUPS } = await import('../src/world/maps/campusV2/s1');
const { S1_LIGHTS } = await import('../src/world/maps/campusV2/s1Data');

const b = new LevelBuilder();
const lay = campusOps.build(b, 0);
const S1 = CAMPUS_SECTORS[0]!;
const G = S1.guards;
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
/** The lit S1 lamp count after the slices built so far (lead note (3)). */
const S1_LIT_NOW = 30;
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
  ];
  const SCREENS: readonly [readonly [number, number, number], readonly [number, number, number]][] = [
    [[16.75, 4.5, -79], [6.5, 2.4, 0.1]],
    [[-40, 5.6, -37], [0.1, 2.4, 6]],
    [[-40, 5.6, -32], [0.1, 2.4, 4]],
    [[3.7, 5.6, -32], [0.1, 2.4, 4]],
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

  it('G1 roof screens: four 2.4 noLedge screens; no plant-roof parapet at x -39.85', () => {
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
    // 29 as built (G1), 30 with the G2 desk lamp, 31 with G3's carport luminaires and bike-shelter lamp, 32 with G5's smoke lamp
    expect(lit.length).toBe(lamps.length);
    expect(lit.length).toBe(S1_LIT_NOW);
    // the as-built intensities (B:214-314): columns 0.9, bollards 0.5, canopy 0.85, dock 0.8, lane 0.8, gate tube 0.9
    expect([S1_LIGHTS.column.i, S1_LIGHTS.bollards.i, S1_LIGHTS.canopy.i, S1_LIGHTS.dock.i, S1_LIGHTS.laneFlood.i, S1_LIGHTS.gate.i]).toEqual([0.9, 0.5, 0.85, 0.8, 0.8, 0.9]);
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

  it('G2 glazing band: E2 open, two fixed panes closed and unbreakable, the reception window closed and breakable', () => {
    const win = (x: number, z: number) => b.anchors.windows.find((w) => near(w.c.x, x) && near(w.c.z, z));
    expect(win(20, -76)).toMatchObject({ open: true, breakable: true, sillHeight: 0.9 });
    expect(win(20, -73.8)).toMatchObject({ open: false, breakable: false, sillHeight: 0.9 });
    expect(win(19.2, -72.5)).toMatchObject({ open: false, breakable: false, sillHeight: 0.9 });
    expect(win(13.5, -76)).toMatchObject({ open: false, breakable: true, sillHeight: 0.9 });
    // the objective PC is still 1.15 m from the open pane (SEC:315)
    expect(hyp2(S1.objective.x - 20.45, S1.objective.z + 76)).toBeCloseTo(1.15);
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
    expect(gate.length).toBe(2);
    const tube = gate.find((l) => near(l.x, 17) && near(l.y, 2.9) && near(l.z, -76))!;
    const desk = gate.find((l) => near(l.x, 18.6) && near(l.y, 1.2) && near(l.z, -73.4))!;
    expect(tube.radius).toBeCloseTo(lampReach(5.5));
    expect(desk.radius).toBeCloseTo(lampReach(2.5));
    for (const l of gate) {
      expect(l.on).toBe(true);
      expect(l.intensity).toBeGreaterThan(0);
      expect(l.destructible && l.electric).toBe(true);
    }
    const lit = levelAt(19.35, 0.9, -76);
    for (const l of gate) l.on = false;
    const cut = levelAt(19.35, 0.9, -76);
    for (const l of gate) l.on = true;
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(`G2 PC desk (19.35, 0.9, -76): lit ${lit.toFixed(3)}, gate cut ${cut.toFixed(3)}`);
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
