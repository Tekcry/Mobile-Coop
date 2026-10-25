/**
 * (campus-greybox S5 P4, `docs/campus-greybox/briefs/S5.md` P4; D:62-76, D:167-188) Section 5's v2 co-op lips and team moves,
 * flag on (`flags.campusV2 = [5]`):
 * - the lips CR8-s5 (the low roof's gutter kerb over the lawn), CR9-s5 (the roof's coping over the low roof) and CR10-s5 (the
 *   smoke hatch's kerb over the kitchen) against a solo player (LD 11.8 rules 1-5; T4:480-536, `briefs/S1.md` G4-G5);
 * - `LD 11.8 unplanned lips` (replaces T5:600's "no leg-up lip");
 * - `CR7 two players only` (the shut pg-hoist leaf, the solo's roof route to the well, the well -> anteroom line);
 * - `K4` (T5:523-580, SP:525: the keyholders #9, #10 and the audit officer #28 close the anteroom).
 * Built undressed with the pure `LevelBuilder`; the nav is the live test's analytic raster (`tests/campusS5.test.ts`
 * `analyticNav`, copied: a test file is never imported).
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { HANG, LEDGE, closestOn, generateLedges, reach, suppressLedgesNear } from '../src/world/anchors';
import { PERCEPTION } from '../src/ai/perception';
import { MOVEMENT } from '../src/config/movement';
import { LANDING_NOISE_RADIUS } from '../src/config/noise';
import { hyp2, hyp3 } from '../src/core/mathx';
import { SightWorld } from '../src/game/sectorCheck';
import type { SectorGuard } from '../src/game/sectors';
import { soloJumpThreats, soloTopLandingThreats, MANTLE, type CoopGrip } from './helpers/soloJumpReach';

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
  const { CAMPUS_COOP_LIPS } = await import('../src/world/maps/campusLips');
  return { sectors, sectorStage, buildCampus, campusOps, LevelBuilder, s5, s5Data, CAMPUS_COOP_LIPS };
}

const m = await loadCampus([5]);
const { S5_BOX, S5_COOP_LIPS, S5_DOORS, S5_FLIGHTS, S5_L1, S5_LIP_SEGMENTS, S5_ROOF } = m.s5;
const b: LB = new m.LevelBuilder();
m.buildCampus(b, { dress: false });
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

const S5_GUARDS = S5.guards;
/** A guard by plan number (#1-#24, then #28 = index 24, #34 = index 25). */
const guard = (n: number): SectorGuard => S5_GUARDS[n <= 24 ? n - 1 : n === 28 ? 24 : 25]!;

type Lip = (typeof S5_COOP_LIPS)[number];
const lipOf = (id: string): Lip => S5_COOP_LIPS.find((l) => l.id === id)!;
/** A lip's grip as the solo helpers take it: CR8-s5 as its true segment (`S5_LIP_SEGMENTS`, A17), the others z-running. */
const grip = (l: Lip): CoopGrip => {
  const seg = S5_LIP_SEGMENTS[l.id];
  if (seg) return { y: l.lip.y, a: { x: seg.a[0], z: seg.a[1] }, b: { x: seg.b[0], z: seg.b[1] }, n: l.lip.n };
  return { y: l.lip.y, a: { x: l.lip.x, z: l.lip.z0 }, b: { x: l.lip.x, z: l.lip.z1 }, n: l.lip.n };
};
/** A lip's plan run: [x0, x1, z0, z1] (a line: one pair equal). */
const run = (l: Lip): [number, number, number, number] => {
  const g = grip(l);
  return [Math.min(g.a.x, g.b.x), Math.max(g.a.x, g.b.x), Math.min(g.a.z, g.b.z), Math.max(g.a.z, g.b.z)];
};
/** The plan gap from a piece to a lip's run. */
const gapTo = (l: Lip, p: BoxPiece): number => {
  const [ax, bx, az, bz] = run(l);
  return hyp2(Math.max(0, ax - x1(p), x0(p) - bx), Math.max(0, az - z1(p), z0(p) - bz));
};
/** The lip's own piece: the box whose face carries the lip, its top at the lip (0.2 kerb or coping). */
const PIECES: Record<string, readonly number[]> = {
  // [x0, x1, y0, y1, z0, z1]
  // (fix 1) each 0.40 deep, the lip face kept
  'CR8-s5': [-32, -26, 4.2, 4.4, 43.75, 44.15],
  'CR9-s5': [-32.25, -31.85, 8.4, 8.6, 30, 33],
  'CR10-s5': [-29.0, -28.6, 4.2, 4.4, 41.3, 42.7],
};
const pieceOf = (l: Lip): BoxPiece => solid.find((p) => [x0(p), x1(p), bottom(p), top(p), z0(p), z1(p)].every((v, k) => Math.abs(v - PIECES[l.id]![k]!) < 1e-3))!;
/** On the lip's boost side (the side its normal points to). */
const boostSide = (l: Lip, p: BoxPiece): boolean => {
  const [ax, bx, az, bz] = run(l);
  return l.lip.n.x !== 0 ? (l.lip.n.x > 0 ? x0(p) >= bx - 1e-6 : x1(p) <= ax + 1e-6) : l.lip.n.z > 0 ? z0(p) >= bz - 1e-6 : z1(p) <= az + 1e-6;
};
/** The ledges as the build makes them: generated, then the build's `noLedge(x, z, r)` points applied (`LevelBuilder.build`). */
const anchors = generateLedges(b.boxes);
for (const [x, z, r] of (b as unknown as { noLedgeAt: [number, number, number][] }).noLedgeAt) suppressLedgesNear(anchors, x, z, r);
const ledges = anchors.ledges;
/** The canHang ledges along a lip (on its line, at its height, inside its run). */
const lipLedges = (l: Lip) => {
  const [ax, bx, az, bz] = run(l);
  return ledges.filter((e) => {
    if (!e.canHang || Math.abs(e.top - l.lip.y) > 0.05) return false;
    const ex0 = Math.min(e.a.x, e.b.x);
    const ex1 = Math.max(e.a.x, e.b.x);
    const ez0 = Math.min(e.a.z, e.b.z);
    const ez1 = Math.max(e.a.z, e.b.z);
    return ex0 >= ax - 0.05 && ex1 <= bx + 0.05 && ez0 >= az - 0.05 && ez1 <= bz + 0.05 && (e.nx * l.lip.n.x + e.nz * l.lip.n.z) > 0.9;
  });
};

describe('P4 the co-op lips CR8-s5, CR9-s5, CR10-s5 (D:167-188)', () => {
  it('as briefed: three lips, ids -s5, section 4; S5_PARTS.coopLips is the list and the campus list holds each once; each lip 4.3-4.5 over its boost floor; boosts on nav; each lip on its own piece, not noLedge', () => {
    expect(S5_COOP_LIPS.map((l) => l.id)).toEqual(['CR8-s5', 'CR9-s5', 'CR10-s5']);
    expect(m.s5Data.S5_PARTS.coopLips).toBe(S5_COOP_LIPS);
    expect(lipOf('CR8-s5')).toMatchObject({ section: 4, lip: { x: -27.5, z0: 44.15, z1: 44.15, y: 4.4, n: { x: 0, z: 1 } }, top: { x0: -32, x1: -26, z0: 18, z1: 44, top: 4.2 }, boost: { floor: 0, x: -27.5, z: 44.75 } });
    expect(lipOf('CR9-s5')).toMatchObject({ section: 4, lip: { x: -31.85, z0: 30, z1: 33, y: 8.6, n: { x: 1, z: 0 } }, top: { x0: -56, x1: -32, z0: 18, z1: 44, top: 8.4 }, boost: { floor: 4.2, x: -31.25, z: 31.5 } });
    expect(lipOf('CR10-s5')).toMatchObject({ section: 4, lip: { x: -28.6, z0: 41.4, z1: 42.6, y: 4.4, n: { x: 1, z: 0 } }, top: { x0: -32, x1: -26, z0: 18, z1: 44, top: 4.2 }, boost: { floor: 0, x: -28.0, z: 42.0 } });
    expect(S5_LIP_SEGMENTS).toEqual({ 'CR8-s5': { a: [-32, 44.15], b: [-26, 44.15] } });
    for (const l of S5_COOP_LIPS) {
      expect(m.CAMPUS_COOP_LIPS.filter((q) => q.id === l.id).length, l.id).toBe(1);
      expect(m.CAMPUS_COOP_LIPS.includes(l)).toBe(true);
      expect(l.solo.length).toBeGreaterThan(10);
      expect(l.lip.y - l.boost.floor, l.id).toBeGreaterThanOrEqual(4.3);
      expect(l.lip.y - l.boost.floor, l.id).toBeLessThanOrEqual(4.5);
      expect(onNav(l.boost.x, l.boost.z, l.boost.floor), `${l.id} boost`).toBe(true);
      const p = pieceOf(l);
      expect(p, `${l.id} piece`).toBeTruthy();
      expect(p.noLedge, l.id).not.toBe(true);
      expect(top(p)).toBeCloseTo(l.lip.y);
      // the lip is the piece's face on the boost side
      if (l.lip.n.z !== 0) expect(z1(p)).toBeCloseTo(l.lip.z0);
      else expect(l.lip.n.x > 0 ? x1(p) : x0(p)).toBeCloseTo(l.lip.x);
    }
    // P11: CR8-s5's boost is 1.5 m east of the kitchen back door, out of its leaf (1.2 wide)
    expect(lipOf('CR8-s5').boost.x - S5_DOORS.kitchenBack[0]).toBeCloseTo(1.5);
  });

  for (const id of ['CR8-s5', 'CR9-s5', 'CR10-s5']) {
    const l = lipOf(id);
    it(`${id} rule 1: no solo running jump reaches the ${l.lip.y} lip (0.5 m margin) and none lands on its top`, () => {
      const own = pieceOf(l);
      expect(soloJumpThreats(solid, grip(l), (p) => p === own, 0.5)).toEqual([]);
      expect(soloTopLandingThreats(solid, l.top, (p) => p === own, 0.5)).toEqual([]);
    });

    it(`${id} rule 2: nothing solo-standable 1.2 or higher over the boost floor (and under the lip) within 4 m in plan`, () => {
      const f = l.boost.floor;
      const bad = solid.filter((p) => {
        const t = top(p);
        if (t - f < 1.2 || t >= l.lip.y - 0.05) return false;
        if (Math.min(p.s[0], p.s[2]) < LEDGE.climbDepth) return false;
        if (p.noLedge && t > MANTLE) return false;
        return gapTo(l, p) <= 4;
      });
      expect(bad.map((p) => [p.c, p.s])).toEqual([]);
    });

    it(`${id} rule 3: nothing 0.3-1.7 over the boost floor within 1 m of the wall under the lip, on the boost side`, () => {
      const f = l.boost.floor;
      const [ax, bx, az, bz] = run(l);
      const own = pieceOf(l);
      const zone = l.lip.n.x !== 0 ? [l.lip.n.x > 0 ? bx : ax - 1, l.lip.n.x > 0 ? bx + 1 : ax, az, bz] : [ax, bx, l.lip.n.z > 0 ? bz : az - 1, l.lip.n.z > 0 ? bz + 1 : az];
      const under = inRect(zone[0]!, zone[1]!, zone[2]!, zone[3]!, f + 0.3, f + 1.7).filter((p) => p !== own && boostSide(l, p) && top(p) - f <= 1.7 && top(p) - f >= 0.3);
      expect(under.map((p) => [p.c, p.s])).toEqual([]);
    });

    it(`${id} rule 5: open sky over the lip's hangable run (its ledge less the edge margins; HANG.out + 0.45 out, 0.4 in, to 1.8 over the lip)`, () => {
      const e = lipLedges(l)[0]!;
      const m0 = LEDGE.edgeMargin;
      const ax = Math.min(e.a.x, e.b.x) + (l.lip.n.z !== 0 ? m0 : 0);
      const bx = Math.max(e.a.x, e.b.x) - (l.lip.n.z !== 0 ? m0 : 0);
      const az = Math.min(e.a.z, e.b.z) + (l.lip.n.x !== 0 ? m0 : 0);
      const bz = Math.max(e.a.z, e.b.z) - (l.lip.n.x !== 0 ? m0 : 0);
      expect(Math.max(bx - ax, bz - az), `${id} hangable run`).toBeGreaterThan(0.5);
      const o = 0.45 + HANG.out;
      const zone = l.lip.n.x !== 0 ? (l.lip.n.x > 0 ? [ax - 0.4, bx + o, az, bz] : [ax - o, bx + 0.4, az, bz]) : l.lip.n.z > 0 ? [ax, bx, az - 0.4, bz + o] : [ax, bx, az - o, bz + 0.4];
      const hit = inRect(zone[0]!, zone[1]!, zone[2]!, zone[3]!, l.lip.y + 0.1, l.lip.y + 1.8);
      expect(hit.map((p) => [p.c, p.s])).toEqual([]);
    });
  }

  it('fix 1: each lip climbs, not only hangs: its ledge has canClimbUp (the piece 0.40 deep >= LEDGE.climbDepth) and the body fits 0.6 m inside the lip at lip + 0.05 (climbRoom)', () => {
    const inside: Record<string, readonly [number, number]> = { 'CR8-s5': [-27.5, 43.55], 'CR9-s5': [-32.45, 31.5], 'CR10-s5': [-29.2, 42.0] };
    for (const l of S5_COOP_LIPS) {
      const e = lipLedges(l)[0];
      expect(e, `${l.id} ledge`).toBeTruthy();
      expect(e!.canClimbUp, `${l.id} canClimbUp`).toBe(true);
      // the stand point 0.6 m in from the lip, against its normal (CR8 z 43.55, CR9 x -32.45, CR10 x -29.2)
      const [cx, cz] = inside[l.id]!;
      expect(l.lip.n.x !== 0 ? cx : cz).toBeCloseTo((l.lip.n.x !== 0 ? l.lip.x : l.lip.z0) - 0.6 * (l.lip.n.x || l.lip.n.z), 6);
      const r = MOVEMENT.radius;
      expect(inRect(cx - r, cx + r, cz - r, cz + r, l.lip.y + 0.05, l.lip.y + 0.05 + MOVEMENT.standHeight).map((p) => [p.c, p.s]), `${l.id} climb room`).toEqual([]);
    }
  });

  it('CR10-s5: the smoke hatch is open from the kitchen floor to the sky (1.2 x 1.2), the boost spot under it', () => {
    const [hx0, hz0, hx1, hz1] = S5_BOX.smokeHatch;
    expect(inRect(hx0, hx1, hz0, hz1, 0.3, 6.2).map((p) => [p.c, p.s])).toEqual([]);
    const l = lipOf('CR10-s5');
    expect(l.boost.x > hx0 && l.boost.x < hx1 && l.boost.z > hz0 && l.boost.z < hz1).toBe(true);
  });

  /** A ledge's true drop: its top over the highest surface (box top or stair ramp) under the point 0.4 m out from its middle. */
  const trueDrop = (e: (typeof ledges)[number]): number => {
    const x = (e.a.x + e.b.x) / 2 + e.nx * 0.4;
    const z = (e.a.z + e.b.z) / 2 + e.nz * 0.4;
    let floor = 0;
    for (const p of solid) if (x > x0(p) && x < x1(p) && z > z0(p) && z < z1(p) && top(p) < e.top - 0.1 && top(p) > floor) floor = top(p);
    for (const h of rampAt(x, z)) if (h < e.top - 0.1 && h > floor) floor = h;
    return e.top - floor;
  };

  it('exactly one canHang ledge per lip, and none elsewhere on the kerbs, the coping and the hatch rims', () => {
    for (const l of S5_COOP_LIPS) expect(lipLedges(l).length, `${l.id} canHang ledges`).toBe(1);
    const own = new Set(S5_COOP_LIPS.flatMap((l) => lipLedges(l)));
    // the kerbs and coping (top 4.4 over the low roof, 8.6 over the roof) and the hatch rims (the low roof 4.2, the roof 8.4)
    const zones: [number, number, number, number, number][] = [
      [-32.2, -25.8, 43.7, 44.3, 4.4],
      [-28.8, -27.2, 41.2, 42.8, 4.4],
      [-32.3, -31.7, 29.8, 33.2, 8.6],
      [-28.8, -27.2, 41.2, 42.8, 4.2],
      [-27.8, -26.2, 18.7, 20.3, 4.2],
      [-46.0, -44.5, 32.2, 35.6, 8.4],
    ];
    // (fix 1) a lip piece's back face (a 0.2 drop to its roof) is no lip: counted by the true drop, as the LD 11.8 test does
    const extra = ledges.filter((e) => e.canHang && !own.has(e) && trueDrop(e) > 1.9 && zones.some(([ax, bx, az, bz, t]) => Math.abs(e.top - t) < 0.05 && Math.min(e.a.x, e.b.x) >= ax && Math.max(e.a.x, e.b.x) <= bx && Math.min(e.a.z, e.b.z) >= az && Math.max(e.a.z, e.b.z) <= bz));
    expect(extra.map((e) => [e.a, e.b, e.top])).toEqual([]);
  });

  it('LD 11.8 unplanned lips: every canHang ledge with a drop of 2.6-4.6 m in the footprint is CR8-s5, CR9-s5, CR10-s5 or on a solo-reached surface; the low roof, garden walls, boathouse, van and chimneys stay noLedge', () => {
    const own = new Map(S5_COOP_LIPS.flatMap((l) => lipLedges(l).map((e) => [e, l.id] as const)));
    const seen = new Set<string>();
    const unplanned: string[] = [];
    for (const e of ledges) {
      if (!e.canHang || !inFoot((e.a.x + e.b.x) / 2, (e.a.z + e.b.z) / 2)) continue;
      const drop = trueDrop(e);
      if (drop < 2.6 || drop > 4.6) continue;
      const id = own.get(e);
      if (id) {
        seen.add(id);
        continue;
      }
      // a solo-reached surface: a nav path from the start to a cell on the ledge's top, just inside the lip
      const mx = (e.a.x + e.b.x) / 2 - e.nx * 0.5;
      const mz = (e.a.z + e.b.z) / 2 - e.nz * 0.5;
      if (nav.findPath([S5.start.x, S5.start.z], [mx, mz], 400000, 0, e.top) === null) unplanned.push(`(${e.a.x.toFixed(2)}, ${e.a.z.toFixed(2)}) - (${e.b.x.toFixed(2)}, ${e.b.z.toFixed(2)}) top ${e.top.toFixed(2)} drop ${drop.toFixed(2)}`);
    }
    expect(unplanned).toEqual([]);
    expect([...seen].sort()).toEqual(['CR10-s5', 'CR8-s5', 'CR9-s5']);
    // the low roof slab, the garden walls, the boathouse, the van and the chimneys
    const low = solid.filter((p) => p.overhead && Math.abs(top(p) - S5_L1) < 1e-6 && x0(p) >= -32 - 1e-6 && x1(p) <= -26 + 1e-6 && z0(p) >= 18 - 1e-6 && z1(p) <= 44 + 1e-6);
    expect(low.length).toBeGreaterThan(0);
    for (const p of low) expect(p.noLedge, `low roof ${p.c}`).toBe(true);
    const named: [string, (p: BoxPiece) => boolean][] = [
      ['garden wall', (p) => x0(p) >= -70.2 && x1(p) <= -55.8 && (Math.abs(p.c[2] - 18) < 0.2 || Math.abs(p.c[2] - 44) < 0.2) && Math.abs(top(p) - 2.8) < 1e-6],
      ['boathouse', (p) => Math.abs(x0(p) - S5_BOX.boathouse[0]) < 1e-6 && Math.abs(top(p) - 3.0) < 1e-6],
      ['van', (p) => Math.abs(x0(p) - S5_BOX.van[0]) < 1e-6 && Math.abs(top(p) - 2.4) < 1e-6],
      ['chimney', (p) => S5_BOX.chimneys.some(([x, z]) => Math.abs(p.c[0] - x) < 1e-6 && Math.abs(p.c[2] - z) < 1e-6) && Math.abs(bottom(p) - S5_ROOF) < 1e-6],
    ];
    for (const [name, is] of named) {
      const ps = solid.filter(is);
      expect(ps.length, name).toBeGreaterThan(0);
      for (const p of ps) expect(p.noLedge, `${name} ${p.c}`).toBe(true);
    }
    expect(solid.filter((p) => S5_BOX.chimneys.some(([x, z]) => Math.abs(p.c[0] - x) < 1e-6 && Math.abs(p.c[2] - z) < 1e-6)).length).toBe(4);
  });
});

/** Shuts a door leaf on the nav (a closure at its opening): pg-hoist, pg-arch, a plain door. */
const shut = (at: readonly [number, number], y: number, alongX: boolean): number =>
  m.sectorStage.addDoorClosure(nav, { cx: at[0], cz: at[1], yaw: alongX ? PI / 2 : 0, width: 1.2, y });

describe('P4 CR7 two players only (D:62-72, job BRIEF A24, A25)', () => {
  it('with pg-hoist shut no anchor at the hoist door is in reach from any archive nav cell (the door\'s own leaf aside); archive -> well only over the roof; the solo route archive -> rooflight ladder -> roof -> rim gate -> cleaning ladder -> well floor', () => {
    const hoist = shut(S5_DOORS.hoist, S5_L1, false);
    nav.setClosed(hoist, true);
    const masked: number[] = [];
    try {
      // every traversal anchor at the hoist door (its nearest point within 1.5 m of the sill, 4.2..6.3; the door's own leaf
      // aside), against every archive cell within 2.5 m, 16 facings
      const sill = { x: -46, y: S5_L1, z: 36 };
      const all = [...b.anchors.all.filter((a) => a.kind !== 'door' && a.kind !== 'ledge'), ...ledges].filter((a) => {
        const q = closestOn(a, sill.x, sill.y, sill.z);
        return hyp2(q.x - sill.x, q.z - sill.z) <= 1.5 && q.y > sill.y - 0.5 && q.y < sill.y + 2.1;
      });
      console.info(`CR7 anchors at the hoist door: ${all.map((a) => a.kind).join(', ') || 'none'}`);
      let cells = 0;
      const hits: string[] = [];
      for (let x = -45.75; x <= -43.5; x += 0.25) {
        for (let z = 33.5; z <= 38.5; z += 0.25) {
          if (hyp2(x - sill.x, z - sill.z) > 2.5 || !onNav(x, z, S5_L1)) continue;
          cells++;
          for (let k = 0; k < 16; k++) {
            const a = (k * PI) / 8;
            for (const an of all) {
              const r = reach(an, x, S5_L1, z, Math.sin(a), Math.cos(a));
              if (r) hits.push(`${an.kind} from (${x}, ${z}) facing ${k * 22.5}`);
            }
          }
        }
      }
      expect(cells).toBeGreaterThan(20);
      expect(hits.slice(0, 5), `${hits.length} reaches`).toEqual([]);
      // archive -> well: a path exists (the solo roof route); masking the roof storey removes it
      const from: [number, number] = [-44.5, 36];
      const to: [number, number] = [-48, 36];
      const path = nav.findPath(from, to, 400000, S5_L1, 0);
      expect(path, 'archive -> well with pg-hoist shut').not.toBeNull();
      // the solo route passes the rooflight ladder and the cleaning ladder (their nav links)
      const near = (x: number, z: number): boolean => path!.some((w) => hyp2(w[0] - x, w[1] - z) < 1.2);
      expect(near(-45.65, 33.0), 'by the rooflight ladder').toBe(true);
      expect(near(-49.65, 36), 'by the cleaning ladder').toBe(true);
      let len = 0;
      let q: [number, number] = from;
      for (const w of path!) {
        len += hyp2(w[0] - q[0], w[1] - q[1]);
        q = [w[0], w[1]];
      }
      // time: the plan walk at 1.3 m/s plus the two climbs (4.2 up, 8.4 down) at ~1 s/m (D:70-72: ~29 s against the rope's ~6 s)
      const solo = len / 1.3 + 4.2 + 8.4;
      console.info(`CR7 solo route archive -> well: ${len.toFixed(1)} m plan, ~${solo.toFixed(1)} s (D:70-72 ~29 s; the rope ~6 s)`);
      expect(solo).toBeGreaterThan(20);
      for (let i = 0; i < nav.walk.length; i++) {
        if (nav.walk[i] && nav.height[i]! > S5_ROOF - 0.5) {
          nav.walk[i] = 0;
          masked.push(i);
        }
      }
      expect(masked.length).toBeGreaterThan(500);
      expect(nav.findPath(from, to, 400000, S5_L1, 0), 'archive -> well with the roof masked').toBeNull();
    } finally {
      for (const i of masked) nav.walk[i] = 1;
      nav.setClosed(hoist, false);
    }
  });

  it('the well -> anteroom line through the sash is clear (T5:583 port): the well floor reaches nothing on foot but the cleaning ladder; the sash open, unbreakable, sill over the nav step; the well -> #9 sight line clear', () => {
    for (const to of [[-48, 33], [-44.5, 36], [-43, 33], [-43, 40]] as const) {
      const path = nav.findPath([-48, 36], [to[0], to[1]], 200000, 0, 0);
      expect(path === null || path.some((w) => w.link), `well -> ${to} only by a ladder`).toBe(true);
    }
    expect(onNav(-44.5, 36, 0)).toBe(true);
    expect(b.anchors.windows.some((w) => hyp2(w.c.x + 46, w.c.z - 35.5) < 0.1 && w.open && !w.breakable && w.sillHeight > 0.45)).toBe(true);
    const world = new SightWorld(b.boxes, b.cylinders);
    const nine = guard(9);
    expect(world.clear(-48, 0.3, 36, nine.x, 1.6, nine.z), 'well -> #9').toBe(true);
    const d = hyp3(nine.x + 48, 1.6 - 0.3, nine.z - 36);
    console.info(`CR7 well -> #9 (${nine.x}, ${nine.z}): ${d.toFixed(2)} m (a roll landing's noise ${LANDING_NOISE_RADIUS.roll} m)`);
  });
});

describe('P4 K4 (T5:523-580, SP:525): the keyholders #9, #10 and #28 close the anteroom', () => {
  const posts = [guard(9), guard(10), guard(28)];
  const inCone = (p: SectorGuard, x: number, z: number): boolean => {
    const fx = Math.sin(p.yaw);
    const fz = Math.cos(p.yaw);
    const dx = x - p.x;
    const dz = z - p.z;
    const d = hyp2(dx, dz);
    if (d < 1e-6) return true;
    const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d)));
    return (d <= PERCEPTION.focusRange && ang <= PERCEPTION.focusHalf) || (d <= PERCEPTION.periphRange && ang <= PERCEPTION.periphHalf);
  };
  const angOff = (p: SectorGuard, x: number, z: number): number => {
    const fx = Math.sin(p.yaw);
    const fz = Math.cos(p.yaw);
    const dx = x - p.x;
    const dz = z - p.z;
    return (Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / hyp2(dx, dz)))) * 180) / PI;
  };
  /** The token: the table's south side, where the grab is worked from. */
  const token: [number, number] = [-43, 42.6];

  it('with the three cones (ground storey) and the shut pg-arch and pg-hoist leaves as nav blockers no path joins the start to the token; without the cones one does', () => {
    const from: [number, number] = [S5.start.x, S5.start.z];
    expect(onNav(token[0], token[1], 0)).toBe(true);
    expect(nav.findPath(from, token, 1e7, 0, 0)).not.toBeNull();
    const leaves = [shut(S5_DOORS.pgArch, S5_L1, false), shut(S5_DOORS.hoist, S5_L1, false)];
    for (const id of leaves) nav.setClosed(id, true);
    const blocked: number[] = [];
    try {
      expect(nav.findPath(from, token, 1e7, 0, 0)).not.toBeNull();
      for (let i = 0; i < nav.walk.length; i++) {
        if (!nav.walk[i] || Math.abs(nav.height[i]!) > 0.6) continue;
        const [x, z] = nav.center(i % nav.cols);
        if (posts.some((p) => inCone(p, x, z))) {
          blocked.push(i);
          nav.walk[i] = 0;
        }
      }
      expect(blocked.length).toBeGreaterThan(50);
      expect(nav.findPath(from, token, 1e7, 0, 0)).toBeNull();
    } finally {
      for (const i of blocked) nav.walk[i] = 1;
      for (const id of leaves) nav.setClosed(id, false);
    }
    expect(nav.findPath(from, token, 1e7, 0, 0)).not.toBeNull();
  });

  it('the hall door and the side door cells are inside a cone; the sash centre\'s and the shaft door\'s angles off each facing are recorded (R1)', () => {
    const cell = (x: number, z: number): [number, number] => nav.center(nav.cellOf(x, z, 0));
    for (const door of [S5_DOORS.anteHall, S5_DOORS.anteSide]) {
      const [x, z] = cell(door[0], door[1]);
      expect(posts.some((p) => inCone(p, x, z)), `door ${door}`).toBe(true);
    }
    const rows: string[] = [];
    for (const [name, at] of [['sash', [-46, 35.5]], ['shaft door', S5_DOORS.anteShaft]] as const)
      for (const [n, p] of [[9, posts[0]!], [10, posts[1]!], [28, posts[2]!]] as const) rows.push(`${name} (${at[0]}, ${at[1]}) off #${n}'s facing (${p.x}, ${p.z}, yaw ${((p.yaw * 180) / PI).toFixed(0)}): ${angOff(p, at[0], at[1]).toFixed(0)} deg`);
    console.info(`K4 approaches (R1; J13 / V6 measure them):\n${rows.join('\n')}`);
    expect(rows.length).toBe(6);
  });
});
