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
import { generateLedges } from '../src/world/anchors';
import { MOVEMENT } from '../src/config/movement';

vi.resetModules();
const { flags } = await import('../src/core/flags');
flags.campusV2 = [1];
const { LevelBuilder } = await import('../src/world/levelBuilder');
const { campusOps } = await import('../src/world/maps/campusOps');
const { CAMPUS_PARTS, CAMPUS_V2_PARTS } = await import('../src/world/maps/campusSections');
const { s1Lamps } = await import('../src/world/maps/campusV2/s1');
const { S1_LIGHTS } = await import('../src/world/maps/campusV2/s1Data');

const b = new LevelBuilder();
campusOps.build(b, 0);

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

  it('G1 S1_LIGHTS is the one source: every lit S1 lamp matches a block entry; 29 lit lamps at their as-built intensity', () => {
    const lamps = s1Lamps(S1_LIGHTS);
    const lit = b.lights.lights.filter((l) => l.intensity > 0 && l.x >= -40 && l.x <= 26 && l.z >= -80 && l.z <= -30);
    const bad: string[] = [];
    for (const l of lit) {
      const m = lamps.find((q) => near(q.x, l.x) && near(q.y, l.y) && near(q.z, l.z) && near(lampReach(q.r), l.radius) && near(q.i, l.intensity) && q.group === l.group);
      if (!m) bad.push(`lamp ${l.id} (${l.x}, ${l.y}, ${l.z}) r ${l.radius} i ${l.intensity} g ${l.group}`);
    }
    expect(bad).toEqual([]);
    expect(lit.length).toBe(29);
    expect(lamps.length).toBe(29);
    // the as-built intensities (B:214-314): columns 0.9, bollards 0.5, canopy 0.85, dock 0.8, lane 0.8, gate 0.9
    const asBuilt = (g: number): number[] => lit.filter((l) => l.group === g).map((l) => l.intensity);
    expect(asBuilt(40)).toEqual(Array(8).fill(0.9));
    expect(asBuilt(41)).toEqual(Array(6).fill(0.9));
    expect(asBuilt(42).sort()).toEqual([...Array(8).fill(0.5), 0.8]);
    expect(asBuilt(44)).toEqual(Array(4).fill(0.85));
    expect(asBuilt(49)).toEqual([0.8]);
    expect(asBuilt(43)).toEqual([0.9]);
  });
});
