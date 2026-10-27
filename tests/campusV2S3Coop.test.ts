/**
 * (campus-greybox S3 R6) Section 3's v2 co-op lips and nav reach, flag on (`flags.campusV2 = [3]`; brief
 * `docs/campus-greybox/briefs/S3.md` section 4 "R6", the cloud brief `campus-greybox-s3-r6`). The lips CR3 (the chamber's
 * west face) and CR3b (the goods landing's hatch edge): their data and wiring, the ledge each one is (hang and climb up,
 * the climb room), the lift out of solo reach, no solo way up (running jumps, landings, standables, steps under the lip),
 * the headroom; the chamber roof reached from the gallery over the spur, the gallery not from the hall floor; the hatch
 * drop; three-stairs reach on the full build; the nav flood from the landing; the panels seen from their near side. The
 * analytic nav is the live test's raster (`tests/campusS3.test.ts`, copied as `tests/campusV2S3Guards.test.ts` has it: a
 * test file is never imported).
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { generateLedges, HANG, LEDGE, TraversalAnchors, type Ledge } from '../src/world/anchors';
import { MOVEMENT, WALL_JUMP } from '../src/config/movement';
import { hyp2, hyp3 } from '../src/core/mathx';
import { JAMMER } from '../src/game/jammer';
import { checkPanels, panelTarget } from '../src/game/laserPanels';
import { SightWorld } from '../src/game/sectorCheck';
import { soloJumpThreats, soloTopLandingThreats, MANTLE } from './helpers/soloJumpReach';

/** Loads the campus modules fresh with `flags.campusV2 = [3]` (the selection is made at load, as on a page). */
async function loadV2S3() {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = [3];
  const { buildCampus } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const lips = await import('../src/world/maps/campusLips');
  const s3 = await import('../src/world/maps/campusV2/s3');
  const s3Lights = await import('../src/world/maps/campusV2/s3Lights');
  return { buildCampus, LevelBuilder, lips, s3, s3Lights };
}

const m = await loadV2S3();
const { S3_BOX, S3_COOP_LIPS, S3_FLIGHTS, S3_L1 } = m.s3;
const { S3_LASERS, S3_PANELS, S3_PANEL_NEAR } = m.s3Lights;
const CR3 = S3_COOP_LIPS.find((l) => l.id === 'CR3')!;
const CR3B = S3_COOP_LIPS.find((l) => l.id === 'CR3b')!;
/** safe_drop_m (`docs/design/scale-sheet.md` section 8): a drop above this ends in a heavy landing. */
const SAFE_DROP = 4.5;
/** The S3 footprint. */
const FOOT = { x0: 10, x1: 64, z0: -30, z1: 0 };
const inFoot = (x: number, z: number): boolean => x >= FOOT.x0 && x <= FOOT.x1 && z >= FOOT.z0 && z <= FOOT.z1;

/** The undressed campus with S3 v2 on. */
const b: LB = new m.LevelBuilder();
m.buildCampus(b, { dress: false });
/** The collision pieces as axis-aligned boxes (quarter-turn walls swapped, as the live test). */
const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
/** The solid piece holding (x, y, z), if any (glass panes too). */
const pieceAt = (x: number, y: number, z: number): BoxPiece | undefined =>
  solid.find((p) => Math.abs(x - p.c[0]) <= p.s[0] / 2 + 1e-6 && Math.abs(y - p.c[1]) <= p.s[1] / 2 + 1e-6 && Math.abs(z - p.c[2]) <= p.s[2] / 2 + 1e-6);

/**
 * Every ledge the level has at run time: the generated ones (`generateLedges` over the boxes, as `LevelBuilder.prepare`
 * makes them) and the manual ones the build added (`b.ledge`, already in `b.anchors`; never in `generateLedges`).
 */
const gen = generateLedges(b.boxes, new TraversalAnchors());
const allLedges: readonly Ledge[] = [...gen.ledges, ...b.anchors.ledges];

/** The stair ramps as surfaces: (x, z) on a flight -> its height (yaw 0 rises toward +z, yaw PI toward -z). */
function rampAt(x: number, z: number): number[] {
  const out: number[] = [];
  for (const f of S3_FLIGHTS) {
    if (Math.abs(x - f.x) > f.w / 2 || Math.abs(z - f.z) > f.len / 2) continue;
    const t = Math.abs(f.yaw) < 1e-6 ? (z - (f.z - f.len / 2)) / f.len : (f.z + f.len / 2 - z) / f.len;
    out.push(f.y + f.rise * t);
  }
  return out;
}

/**
 * An analytic layered nav grid over a rectangle (the live test's: blockers, fences, cylinders, the flights as ramps, the
 * ladders as links). `extra`: boxes [x0, z0, x1, z1, bottom, top] blocked solid (a core, the spur); `links` false: no
 * ladder links (the stairs alone join the storeys).
 */
function analyticNav(rect: readonly [number, number, number, number], extra: readonly (readonly number[])[] = [], links = true, cell = 0.5): NavGrid {
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
  for (const [x0, z0, x1, z1, y0, y1] of extra) blockers.push({ cx: (x0! + x1!) / 2, cz: (z0! + z1!) / 2, hx: (x1! - x0!) / 2, hz: (z1! - z0!) / 2, yaw: 0, bottom: y0!, top: y1! });
  const ladderLinks = links
    ? b.anchors.ladders.map((l) => {
        const fx = Math.sin(l.facing);
        const fz = Math.cos(l.facing);
        const sx = l.base.x - fx * 0.32;
        const sz = l.base.z - fz * 0.32;
        return { kind: 'ladder' as const, twoWay: true, pts: [l.base.x - fx * 0.7, l.base.y, l.base.z - fz * 0.7, sx, l.base.y, sz, sx, l.top.y, sz, l.top.x + fx * 0.3, l.top.y, l.top.z + fz * 0.3] };
      })
    : [];
  return new NavGrid({
    minX, maxX, minZ, maxZ, cell, agentRadius: 0.32, stepHeight: 0.45, layers: 5, blockers, links: ladderLinks,
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
/** The S3 block and its yard (x 3..71), the C2 bridge west of it and the C3 lane north of it. */
const RECT = [3, -32, 71, 4] as const;
const nav = analyticNav(RECT);
const onNav = (n: NavGrid, x: number, z: number, y = 0): boolean => n.isWalkable(n.cellOf(x, z, y)) && Math.abs(n.heightAt(x, z, y) - y) < 0.6;
/** The landing (L1) the section starts on: the guards' and the flood's origin. */
const LANDING: readonly [number, number, number] = [12, S3_L1, -20];
const reach = (n: NavGrid, x: number, z: number, y: number): boolean => n.findPath([LANDING[0], LANDING[2]], [x, z], 400000, LANDING[1], y) !== null;

describe('R6 the lips: data and wiring', () => {
  it('CR3 is the chamber\'s west face (x 30, z -22..-14, 4.4 over a floor-0 boost); CR3b the goods landing\'s hatch edge (x 18, z -6..-3, 4.5 over the pad at 0.1)', () => {
    expect(S3_COOP_LIPS.map((l) => l.id)).toEqual(['CR3', 'CR3b']);
    expect(CR3).toMatchObject({ section: 2, lip: { x: 30, z0: -22, z1: -14, y: 4.4, n: { x: -1, z: 0 } }, top: { x0: 30, x1: 36, z0: -22, z1: -14, top: 4.4 }, boost: { floor: 0, x: 29.2, z: -18 } });
    expect(CR3B).toMatchObject({ section: 2, lip: { x: 18, z0: -6, z1: -3, y: 4.5, n: { x: 1, z: 0 } }, top: { x0: 10, x1: 18, z0: -7, z1: 0, top: 4.5 }, boost: { floor: 0.1, x: 18.8, z: -4.5 } });
    // the top boxes are the plan's: the chamber; the goods landing over the hoist room (its west part, to the hatch edge)
    expect(CR3.top).toEqual({ x0: S3_BOX.chamber[0], x1: S3_BOX.chamber[2], z0: S3_BOX.chamber[1], z1: S3_BOX.chamber[3], top: S3_BOX.chamberTop });
    expect([CR3B.top.x0, CR3B.top.z0, CR3B.top.z1]).toEqual([S3_BOX.hoist[0], S3_BOX.hoist[1], S3_BOX.hoist[3]]);
    expect(CR3B.lip.x).toBe(S3_BOX.hoistHatch[0]);
    for (const l of S3_COOP_LIPS) expect(l.solo.length, `${l.id} solo text`).toBeGreaterThan(10);
  });

  it('CAMPUS_COOP_LIPS (P0\'s wiring) holds CR3 and CR3b once each, the v2 objects', () => {
    const list = m.lips.CAMPUS_COOP_LIPS;
    expect(list.filter((l) => l.id === 'CR3')).toEqual([CR3]);
    expect(list.filter((l) => l.id === 'CR3b')).toEqual([CR3B]);
  });
});

describe('R6 the lips: the ledge each one is (hang, climb up, climb room)', () => {
  const cases = [
    { lip: () => CR3, generated: true },
    { lip: () => CR3B, generated: false },
  ];
  for (const c of cases) {
    it(`${c.generated ? 'CR3: the chamber\'s generated' : 'CR3b: the manual (s3 join J8)'} ledge: one lip run, hang and climb up, its normal toward the boost side, the climb room clear`, () => {
      const l = c.lip().lip;
      const runs = allLedges.filter((q) => Math.abs(q.a.x - l.x) < 1e-6 && Math.abs(q.b.x - l.x) < 1e-6 && Math.abs(q.top - l.y) < 1e-6 && Math.min(q.a.z, q.b.z) < l.z1 - 0.1 && Math.max(q.a.z, q.b.z) > l.z0 + 0.1);
      expect(runs.length, 'one lip run').toBe(1);
      const e = runs[0]!;
      expect(e.piece === 0, 'generated or manual').toBe(!c.generated);
      expect([Math.min(e.a.z, e.b.z), Math.max(e.a.z, e.b.z)]).toEqual([l.z0, l.z1]);
      expect(e.nx).toBeCloseTo(l.n.x, 9);
      expect(Math.abs(e.nz)).toBeLessThan(1e-9);
      expect(e.canHang && e.canClimbUp).toBe(true);
      // climbRoom (attachController): the stand point HANG.out + 0.45 inboard of the lip at top + 0.05, a standable top under
      // it, one body radius round it clear to standing height (CR3 x 30.67, CR3b x 17.33)
      const cx = l.x - l.n.x * (HANG.out + 0.45);
      expect(cx).toBeCloseTo(c.generated ? 30.67 : 17.33, 6);
      for (let z = l.z0 + 0.1; z <= l.z1 - 0.1 + 1e-9; z += 0.2) {
        const under = pieceAt(cx, l.y - 0.02, z);
        expect(under && Math.abs(top(under) - l.y) < 0.05, `a top to stand on at ${cx}, ${z}`).toBe(true);
        for (const dx of [-MOVEMENT.radius, 0, MOVEMENT.radius]) {
          for (const y of [l.y + 0.05, l.y + 0.9, l.y + 1.75]) expect(pieceAt(cx + dx, y, z), `climb room at ${cx + dx}, ${y}, ${z}`).toBeUndefined();
        }
      }
    });
  }
});

describe('R6 the lips against a solo player (as built rules, tests/campusS3.test.ts:385-487)', () => {
  const [cx0, cz0, cx1, cz1] = S3_BOX.chamber;
  const isChamber = (p: BoxPiece): boolean => Math.abs(p.c[0] - (cx0 + cx1) / 2) < 1e-6 && Math.abs(p.c[2] - (cz0 + cz1) / 2) < 1e-6 && Math.abs(top(p) - S3_BOX.chamberTop) < 1e-6;
  /** The goods landing's own pieces: L1 tops (4.5) over the CR3b top box. */
  const isLanding = (p: BoxPiece): boolean => Math.abs(top(p) - S3_L1) < 0.05 && p.c[0] - p.s[0] / 2 < CR3B.top.x1 && p.c[0] + p.s[0] / 2 > CR3B.top.x0 && p.c[2] - p.s[2] / 2 < CR3B.top.z1 && p.c[2] + p.s[2] / 2 > CR3B.top.z0;

  it('the lift: lip less boost floor is 4.3-4.5 (4.4 each), over WALL_JUMP.maxUp; the boost spots on nav at their floor', () => {
    for (const l of [CR3, CR3B]) {
      const lift = l.lip.y - l.boost.floor;
      expect(lift, `${l.id}`).toBeGreaterThanOrEqual(4.3);
      expect(lift, `${l.id}`).toBeLessThanOrEqual(4.5);
      expect(lift).toBeCloseTo(4.4, 9);
      expect(lift).toBeGreaterThan(WALL_JUMP.maxUp);
      expect(onNav(nav, l.boost.x, l.boost.z, l.boost.floor), `${l.id} boost spot`).toBe(true);
    }
    // the chamber is a plain box (its lip is generated); the pad is the CR3b boost floor
    const ch = solid.find(isChamber)!;
    expect(ch.noLedge).not.toBe(true);
    const pad = pieceAt(CR3B.boost.x, 0.05, CR3B.boost.z)!;
    expect(pad && Math.abs(top(pad) - S3_BOX.loadingPadTop) < 1e-6).toBe(true);
  });

  const grips = [
    { name: 'CR3 (the chamber west face)', y: 4.4, a: { x: cx0, z: cz0 }, b: { x: cx0, z: cz1 }, n: { x: -1, z: 0 } },
    { name: 'the chamber east face', y: 4.4, a: { x: cx1, z: cz0 }, b: { x: cx1, z: cz1 }, n: { x: 1, z: 0 } },
    { name: 'the chamber south face', y: 4.4, a: { x: cx0, z: cz0 }, b: { x: cx1, z: cz0 }, n: { x: 0, z: -1 } },
    { name: 'CR3b (the hatch edge)', y: 4.5, a: { x: 18, z: -6 }, b: { x: 18, z: -3 }, n: { x: 1, z: 0 } },
  ];
  for (const g of grips) {
    it(`${g.name}: no solo running jump reaches the lip (0.5 m margin)`, () => {
      expect(soloJumpThreats(solid, g, () => false, 0.5)).toEqual([]);
    });
  }

  it('no solo top lands on the chamber roof or the goods landing (0.5 m): racks, benches, the EMC roof, the gas cage cannot reach them', () => {
    expect(soloTopLandingThreats(solid, CR3.top, isChamber, 0.5)).toEqual([]);
    expect(soloTopLandingThreats(solid, CR3B.top, isLanding, 0.5)).toEqual([]);
    const racks = solid.filter((p) => Math.abs(top(p) - S3_BOX.racksTop) < 1e-6 && p.c[0] > 50 && p.c[0] < 52);
    expect(racks.length).toBe(S3_BOX.racks.length);
    expect(racks.every((p) => p.noLedge && top(p) > MANTLE)).toBe(true);
  });

  it('nothing solo-standable >= 1.2 within 4 m of the chamber roof and >= 1.0 within 4 m of the CR3b lip (the gas cage 4.5 m off), under the lip', () => {
    const standable = (p: BoxPiece, lo: number, hiTop: number): boolean => {
      const t = top(p);
      if (t < lo || t >= hiTop - 0.05) return false;
      if (Math.min(p.s[0], p.s[2]) < LEDGE.climbDepth) return false;
      return !(p.noLedge && t > MANTLE);
    };
    const gap = (p: BoxPiece, x0: number, z0: number, x1: number, z1: number): number =>
      hyp2(Math.max(0, x0 - (p.c[0] + p.s[0] / 2), p.c[0] - p.s[0] / 2 - x1), Math.max(0, z0 - (p.c[2] + p.s[2] / 2), p.c[2] - p.s[2] / 2 - z1));
    const nearCr3 = solid.filter((p) => standable(p, 1.2, 4.4) && gap(p, cx0, cz0, cx1, cz1) <= 4);
    expect(nearCr3.map((p) => [p.c, p.s])).toEqual([]);
    // CR3b: within 4 m in plan of the lip segment, on the floors under it (G)
    const l = CR3B.lip;
    const nearCr3b = solid.filter((p) => standable(p, 1.0, l.y) && bottom(p) < 1 && gap(p, l.x, l.z0, l.x, l.z1) <= 4);
    expect(nearCr3b.map((p) => [p.c, p.s])).toEqual([]);
    const cage = solid.filter((p) => inFoot(p.c[0], p.c[2]) && p.c[0] < S3_BOX.gasCage[2] + 0.2 && p.c[2] > S3_BOX.gasCage[1] - 0.2 && bottom(p) < 0.1 && top(p) > 1);
    for (const p of cage) expect(gap(p, l.x, l.z0, l.x, l.z1), 'the gas cage').toBeGreaterThanOrEqual(4.5 - 0.2);
  });

  it('no step 0.3-4.3 within 1 m under either lip on its boost side', () => {
    for (const lp of [CR3, CR3B]) {
      const l = lp.lip;
      const xa = Math.min(l.x, l.x + l.n.x);
      const xb = Math.max(l.x, l.x + l.n.x);
      const under = solid.filter((p) => top(p) > lp.boost.floor + 0.3 && bottom(p) < l.y - 0.1 && top(p) <= l.y - 0.1 && p.c[0] + p.s[0] / 2 > xa + 1e-6 && p.c[0] - p.s[0] / 2 < xb - 1e-6 && p.c[2] + p.s[2] / 2 > l.z0 && p.c[2] - p.s[2] / 2 < l.z1);
      expect(under.map((p) => [p.c, p.s]), lp.id).toEqual([]);
    }
  });

  it('headroom: CR3 clear 4.5-6.2 over the west lip (0.45 + HANG.out in, 0.4 out); CR3b clear to the 7.5 ceiling (as far in and out)', () => {
    for (const [lp, y1] of [[CR3, 6.2], [CR3B, 7.4]] as const) {
      const l = lp.lip;
      const xIn = l.x - l.n.x * (0.45 + HANG.out);
      const xOut = l.x + l.n.x * 0.4;
      const x0 = Math.min(xIn, xOut);
      const x1 = Math.max(xIn, xOut);
      const hit = solid.filter((p) => p.c[0] + p.s[0] / 2 > x0 && p.c[0] - p.s[0] / 2 < x1 && p.c[2] + p.s[2] / 2 > l.z0 && p.c[2] - p.s[2] / 2 < l.z1 && top(p) > l.y + 0.1 && bottom(p) < y1);
      expect(hit.map((p) => [p.c, p.s]), lp.id).toEqual([]);
      expect(b.cylinders.filter((c) => c.collide && c.c[0] + c.r > x0 && c.c[0] - c.r < x1 && c.c[2] + c.r > l.z0 && c.c[2] - c.r < l.z1 && c.c[1] + c.h / 2 > l.y + 0.1 && c.c[1] - c.h / 2 < y1).length, lp.id).toBe(0);
    }
    // CR3b: the 7.5 ceiling over the hoist room is there (the room has its lid)
    const lid = pieceAt(15, 7.45, -4.5);
    expect(lid && lid.overhead).toBe(true);
  });

  it('the chamber roof is reached solo from the gallery over the spur (it meets the roof: no hop), and only so: with the spur blocked there is no way up', () => {
    const [sx0, sz0, sx1, sz1] = S3_BOX.spur;
    expect(sz0).toBeCloseTo(cz1, 9);
    // (x 32: the roof plant stands at x 33.5..35.5, the seed's spot, s3 join)
    const roof: readonly [number, number] = [32, -18];
    expect(onNav(nav, roof[0], roof[1], S3_BOX.chamberTop)).toBe(true);
    expect(nav.findPath([36, -11.75], [roof[0], roof[1]], 400000, S3_BOX.galleryTop, S3_BOX.chamberTop), 'gallery -> roof').not.toBeNull();
    const shut = analyticNav(RECT, [[sx0 - 0.2, sz0 - 0.2, sx1 + 0.2, sz1 + 0.2, S3_L1 - 0.5, S3_L1 + 3]]);
    expect(reach(shut, roof[0], roof[1], S3_BOX.chamberTop), 'roof without the spur').toBe(false);
  });

  it('the gallery and the spur (4.5) are not solo-reachable from the hall floor (rails noLedge, no landing from below)', () => {
    const [gx0, gz0, gx1, gz1] = S3_BOX.gallery;
    const [sx0, sz0, sx1, sz1] = S3_BOX.spur;
    const deck = (p: BoxPiece): boolean => isChamber(p) || (Math.abs(top(p) - S3_L1) < 0.05 && p.c[2] < -10.9 && p.c[2] > -14.1 && p.c[0] > gx0 - 0.5 && p.c[0] < gx1 + 0.5);
    expect(soloTopLandingThreats(solid, { x0: sx0, x1: sx1, z0: sz0, z1: sz1, top: S3_L1 }, deck, 0.5)).toEqual([]);
    expect(soloTopLandingThreats(solid, { x0: gx0, x1: gx1, z0: gz0, z1: gz1, top: S3_L1 }, deck, 0.5)).toEqual([]);
    const galleryEdge = { y: S3_L1, a: { x: gx0, z: gz0 }, b: { x: sx0, z: gz0 }, n: { x: 0, z: -1 } };
    // (the chamber roof is the planned step from above: a jump off it is not from the hall floor)
    expect(soloJumpThreats(solid, galleryEdge, isChamber, 0.5)).toEqual([]);
    // the gallery's south edge and the spur's sides carry 1.1 rails, noLedge
    const rails = solid.filter((p) => Math.abs(bottom(p) - S3_L1) < 1e-6 && Math.abs(p.s[1] - 1.1) < 1e-6 && p.c[2] < -11 && p.c[2] > -14.1 && p.c[0] > gx0 - 0.5 && p.c[0] < gx1 + 0.5);
    expect(rails.length).toBeGreaterThanOrEqual(3);
    expect(rails.every((p) => p.noLedge)).toBe(true);
  });

  it('the hatch drop: from the hatch edge a 4.4 fall lands on the loading pad, on nav, within safe_drop_m 4.5', () => {
    const [hx0, hz0, hx1, hz1] = S3_BOX.hoistHatch;
    const x = hx0 + 0.6;
    const z = (hz0 + hz1) / 2;
    // the hole is open from the slab down to the pad
    for (let y = S3_L1 + 0.5; y > S3_BOX.loadingPadTop + 0.05; y -= 0.25) expect(pieceAt(x, y, z), `open at ${y}`).toBeUndefined();
    const pad = pieceAt(x, S3_BOX.loadingPadTop - 0.02, z)!;
    expect(pad).toBeDefined();
    const drop = S3_L1 - top(pad);
    expect(drop).toBeCloseTo(4.4, 6);
    expect(drop).toBeLessThanOrEqual(SAFE_DROP);
    expect(onNav(nav, (hx0 + hx1) / 2 - 0.3, z, S3_BOX.loadingPadTop)).toBe(true);
  });
});

describe('R6 nav reach on the full build (flag on, every lane merged)', () => {
  const cores = { w: S3_BOX.wCore, n: S3_BOX.nCore, e: S3_BOX.eCore } as const;
  const feet: Record<'w' | 'n' | 'e', readonly [number, number]> = { w: [13, -20.05], n: [28.5, -6], e: [59.7, -8.5] };
  for (const id of ['w', 'n', 'e'] as const) {
    it(`three-stairs reach: G <-> L1 through the ${id === 'w' ? 'west' : id === 'n' ? 'north' : 'east'} core alone (the other two blocked, no ladder links), both ways`, () => {
      const others = (Object.keys(cores) as ('w' | 'n' | 'e')[]).filter((k) => k !== id).map((k) => {
        const [x0, z0, x1, z1] = cores[k];
        return [x0 - 0.2, z0 - 0.2, x1 + 0.2, z1 + 0.2, -1, 10];
      });
      const n = analyticNav(RECT, others, false);
      const [tx, tz] = feet[id];
      const down = n.findPath([LANDING[0], LANDING[2]], [tx, tz], 400000, LANDING[1], 0);
      expect(down, `${id}: landing -> G`).not.toBeNull();
      const [x0, z0, x1, z1] = cores[id];
      expect(down!.some((w) => w[0] > x0 && w[0] < x1 && w[1] > z0 && w[1] < z1), `${id}: the path crosses the core`).toBe(true);
      expect(n.findPath([tx, tz], [LANDING[0], LANDING[2]], 400000, 0, LANDING[1]), `${id}: G -> landing`).not.toBeNull();
    });
  }

  it('the flood from the landing reaches every graph space with a floor on the guards\' grid (the walkway by the ladders\' links, the chamber roof by the spur)', () => {
    const at: readonly (readonly [string, number, number, number])[] = [
      ['s3-hall', 25, -20, 0], ['s3-hall (low aisle)', 12, -25, 0], ['s3-dock', 16, -8, 0], ['s3-control', 41, -6, 0], ['s3-plant', 58, -24, 0],
      ['s3-view', 30, -9, S3_L1], ['s3-east', 58, -9, S3_L1], ['s3-hoist', 15, -2, S3_L1], ['s3-writeup', 25.5, -2, S3_L1], ['s3-gown', 35.5, -3.5, S3_L1],
      ['s3-clean', 42, -3.5, S3_L1], ['s3-store', 52, -3.5, S3_L1], ['s3-sec', 60, -14.5, S3_L1], ['s3-walkway', 30, -29.1, S3_BOX.walkwayTop],
      ['s3-gallery', 36, -11.75, S3_BOX.galleryTop], ['s3-chamber', 32, -18, S3_BOX.chamberTop], ['s3-nstair', 31.75, -1.2, 0], ['s3-estair', 59.75, -1.2, 0],
    ];
    for (const [id, x, z, y] of at) {
      expect(onNav(nav, x, z, y), `${id} at (${x}, ${y}, ${z}) on nav`).toBe(true);
      expect(reach(nav, x, z, y), `${id} reached from the landing`).toBe(true);
    }
  });

  it('nothing east of x 64 is reached; the void deck (7.5, 1.5 m crawl) is not on the guards\' grid; the trench is not built (P14)', () => {
    for (const [x, z] of [[66, -20], [68, -5], [69.5, -28]] as const) expect(reach(nav, x, z, 0), `east of 64 at ${x}, ${z}`).toBe(false);
    for (const [x, z] of [[25, -3.5], [40, -3.5], [55, -3.5]] as const) expect(onNav(nav, x, z, 7.5), `void at ${x}, ${z}`).toBe(false);
  });
});

describe('R6 the panels seen from their near side (tests/campusS3.test.ts:354-369)', () => {
  const world = new SightWorld(b.boxes, b.cylinders);
  it('each panel\'s jam point has a clear eye line from every near point (on the nav grid, within the jammer\'s range); one panel per laser', () => {
    expect(checkPanels(S3_LASERS, S3_PANELS)).toEqual([]);
    const t = { x: 0, y: 0, z: 0 };
    expect(S3_PANELS.length).toBeGreaterThan(0);
    for (const p of S3_PANELS) {
      panelTarget(p, t);
      const pts = S3_PANEL_NEAR[p.id]!;
      expect(pts && pts.length, `${p.id} near points`).toBeGreaterThan(0);
      for (const [x, y, z] of pts) {
        expect(onNav(nav, x, z, y), `${p.id} near point (${x}, ${y}, ${z})`).toBe(true);
        expect(hyp3(t.x - x, t.y - (y + 1.6), t.z - z)).toBeLessThan(JAMMER.range);
        expect(world.clear(x, y + 1.6, z, t.x, t.y, t.z), `${p.id} seen from (${x}, ${y}, ${z})`).toBe(true);
      }
    }
  });
});
