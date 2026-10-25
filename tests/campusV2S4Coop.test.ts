/**
 * (campus-greybox S4, `docs/campus-greybox/briefs/S4.md` G4.2 / G4.5) Section 4's v2 co-op lips against a solo player, flag on
 * (`flags.campusV2 = [4]`): CR4 / CR4-west unchanged (the live `tests/campusS4.test.ts` cases on the v2 build), CR8 / CR8-west
 * (the return-air grilles' sills into the plenum), the plenum itself, the baskets' run-on to the hall wall and the battery
 * racks. Built undressed with the pure `LevelBuilder`; the nav is the live test's analytic raster (copied, never imported),
 * the guards' grid the runtime one (`tests/helpers/runtimeNav.ts`).
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { HANG, LEDGE, generateLedges } from '../src/world/anchors';
import { LIGHT, contribution } from '../src/world/lights';
import { MOVEMENT } from '../src/config/movement';
import { hyp2 } from '../src/core/mathx';
import { soloJumpThreats, soloTopLandingThreats, MANTLE } from './helpers/soloJumpReach';
import { runtimeNav } from './helpers/runtimeNav';

/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const { buildCampus, campusOps } = await import('../src/world/maps/campusOps');
  const { CAMPUS_COOP_LIPS } = await import('../src/world/maps/campusLips');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s4 = await import('../src/world/maps/campusV2/s4');
  return { buildCampus, campusOps, CAMPUS_COOP_LIPS, LevelBuilder, s4 };
}

const m = await loadCampus([4]);
const { S4_BASKET, S4_BOX, S4_COOP_LIPS, S4_FLIGHT } = m.s4;
const b: LB = new m.LevelBuilder();
const lay = m.buildCampus(b, { dress: false });
const FOOT = { x0: -10, x1: 40, z0: 16, z1: 48 };
const inFoot = (x: number, z: number): boolean => x >= FOOT.x0 && x <= FOOT.x1 && z >= FOOT.z0 && z <= FOOT.z1;

/** The collision pieces as axis-aligned boxes (every S4 piece is yaw 0; quarter turns swapped to plain). */
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

/** A flight's ramp height at (x, z) (NaN off it). */
function flightH(f: { cx: number; cz: number; w: number; len: number; rise: number; yaw: number; y0: number }, x: number, z: number): number {
  const dx = x - f.cx;
  const dz = z - f.cz;
  const along = dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw);
  const across = dx * Math.cos(f.yaw) - dz * Math.sin(f.yaw);
  if (Math.abs(across) > f.w / 2 || Math.abs(along) > f.len / 2) return Number.NaN;
  return f.y0 + (f.rise * (along + f.len / 2)) / f.len;
}
const FLIGHTS = [S4_FLIGHT];

/** An analytic layered nav grid over a rectangle (the live S4 test's raster): blockers, fences, cylinders, the flights, ladder links. */
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
    for (const f of FLIGHTS) {
      const h = flightH(f, x, z);
      if (h === h) out.push({ h, bottom: h - 0.35 });
    }
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
const nav = analyticNav([-28, -2, 42, 50]);
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
const ledges = generateLedges(b.boxes).ledges;

type Lip = (typeof S4_COOP_LIPS)[number];
const lipOf = (id: string): Lip => S4_COOP_LIPS.find((l) => l.id === id)!;
const isBasket = (p: BoxPiece): boolean => Math.abs(top(p) - S4_BASKET) < 1e-6 && Math.abs(p.s[1] - 0.4) < 1e-6;
const grip = (l: Lip) => ({ y: l.lip.y, a: { x: l.lip.x, z: l.lip.z0 }, b: { x: l.lip.x, z: l.lip.z1 }, n: l.lip.n });
/** The light level at (x, 0.9, z) (ambient plus every lamp). */
const levelAt = (x: number, z: number): number => {
  let level = b.lights.ambientAt(x, 0.9, z);
  for (const li of b.lights.lights) level += contribution(li, x, 0.9, z);
  return level;
};

describe('G4.2 CR4 / CR4-west unchanged (the live T4:486-536 cases on the v2 build)', () => {
  const cr4 = lipOf('CR4');
  const west = lipOf('CR4-west');
  it('CR4 and CR4-west: the CR4 box x 3.1..4.1, z 32.4..35.6, top 4.4 over floor-0 boosts at (4.8, 34) and (2.4, 34); the campus list holds CR4, CR4-west, CR8, CR8-west once each', () => {
    expect(cr4.lip).toMatchObject({ x: 4.1, z0: 32.4, z1: 35.6, y: 4.4, n: { x: 1, z: 0 } });
    expect(west.lip).toMatchObject({ x: 3.1, z0: 32.4, z1: 35.6, y: 4.4, n: { x: -1, z: 0 } });
    expect(cr4.boost).toEqual({ floor: 0, x: 4.8, z: 34.0 });
    expect(west.boost).toEqual({ floor: 0, x: 2.4, z: 34.0 });
    const box = solid.find((p) => Math.abs(p.c[0] - 3.6) < 1e-6 && Math.abs(p.c[2] - 34) < 1e-6 && isBasket(p))!;
    expect(box).toBeTruthy();
    expect(box.noLedge).not.toBe(true);
    expect(top(box) - cr4.boost.floor).toBeGreaterThanOrEqual(4.3);
    expect(top(box) - cr4.boost.floor).toBeLessThanOrEqual(4.5);
    expect(onNav(cr4.boost.x, cr4.boost.z)).toBe(true);
    expect(onNav(west.boost.x, west.boost.z)).toBe(true);
    const s4Ids = m.CAMPUS_COOP_LIPS.filter((l) => S4_COOP_LIPS.includes(l)).map((l) => l.id);
    for (const id of ['CR4', 'CR4-west', 'CR8', 'CR8-west']) expect(s4Ids.filter((q) => q === id).length, id).toBe(1);
    for (const l of S4_COOP_LIPS) expect(m.CAMPUS_COOP_LIPS.includes(l)).toBe(true);
  });

  for (const l of [cr4, west]) {
    it(`${l.id}: no solo running jump reaches the 4.4 lip (0.5 m margin) and none lands on its top`, () => {
      expect(soloJumpThreats(solid, grip(l), isBasket, 0.5)).toEqual([]);
      expect(soloTopLandingThreats(solid, l.top, isBasket, 0.5)).toEqual([]);
    });
    it(`${l.id} headroom (rule 5): clear air from 4.5 to 6.2 over the lip, 0.45 + HANG.out out and 0.4 in`, () => {
      const g = l.lip;
      const out = g.n.x > 0 ? [g.x - 0.4, g.x + 0.45 + HANG.out] : [g.x - (0.45 + HANG.out), g.x + 0.4];
      const hit = solid.filter((p) => x1(p) > out[0]! && x0(p) < out[1]! && z1(p) > g.z0 && z0(p) < g.z1 && top(p) > g.y + 0.1 && bottom(p) < 6.2);
      expect(hit.map((p) => [p.c, p.s])).toEqual([]);
    });
    it(`${l.id} rule 2: nothing solo-standable at 1.2 m or higher (and under the lip) within 4 m in plan`, () => {
      const g = l.lip;
      const bad = solid.filter((p) => {
        const t = top(p);
        if (t < 1.2 || t >= g.y - 0.05) return false;
        if (Math.min(p.s[0], p.s[2]) < LEDGE.climbDepth) return false;
        if (p.noLedge && t > MANTLE) return false;
        const gx = Math.max(0, Math.abs(p.c[0] - g.x) - p.s[0] / 2);
        const gz = Math.max(0, Math.max(g.z0 - z1(p), z0(p) - g.z1));
        return hyp2(gx, gz) <= 4;
      });
      expect(bad.map((p) => [p.c, p.s])).toEqual([]);
    });
    it(`${l.id} rule 3: nothing 0.3-4.3 high within 1 m of the lip's face`, () => {
      const g = l.lip;
      const under = solid.filter((p) => !isBasket(p) && top(p) > 0.3 && bottom(p) < 4.3 && x1(p) > g.x - 1 && x0(p) < g.x + 1 && z1(p) > g.z0 && z0(p) < g.z1);
      expect(under.map((p) => [p.c, p.s])).toEqual([]);
    });
  }

  it('ledges among the baskets only on the CR4 box (its two long faces); every other basket piece and the landing is noLedge', () => {
    const among = ledges.filter((e) => Math.abs(e.top - S4_BASKET) < 1e-6 && e.a.x > 3 && e.a.x < 33 && e.a.z > 24 && e.a.z < 45);
    expect(among.length).toBeGreaterThan(0);
    for (const e of among) {
      expect([3.1, 4.1].some((x) => Math.abs(e.a.x - x) < 1e-3 && Math.abs(e.b.x - x) < 1e-3), `ledge x ${e.a.x}`).toBe(true);
      expect(Math.min(e.a.z, e.b.z)).toBeGreaterThanOrEqual(32.4 - 1e-3);
      expect(Math.max(e.a.z, e.b.z)).toBeLessThanOrEqual(35.6 + 1e-3);
    }
    expect(solid.filter((p) => isBasket(p) && inFoot(p.c[0], p.c[2]) && !p.noLedge).length).toBe(1);
  });

  it('rule 7: the basket landing has a nav path to B1; both CR4 boost points are under the shadow line', () => {
    expect(pathLen([32.2, 43.4, S4_BASKET], [3.6, 30, S4_BASKET])).not.toBeNull();
    for (const l of [cr4, west]) expect(levelAt(l.boost.x, l.boost.z), `boost (${l.boost.x}, ${l.boost.z})`).toBeLessThan(LIGHT.shadow);
  });
});

describe('G4.2 CR8 / CR8-west: the return-air grille sills (D:24, GR s4-dock / s4-batt -> s4-plenum)', () => {
  const cr8 = lipOf('CR8');
  const west = lipOf('CR8-west');
  /** The sill strip under a side grille (the lip's own piece). */
  const sillOf = (l: Lip): BoxPiece => solid.find((p) => Math.abs(top(p) - 4.4) < 1e-6 && Math.abs(bottom(p)) < 1e-6 && Math.abs(z0(p) - 19.5) < 1e-6 && Math.abs(z1(p) - 21.0) < 1e-6 && x0(p) <= l.lip.x + 1e-6 && x1(p) >= l.lip.x - 1e-6)!;
  /** A piece on the lip's boost side of its wall (the other side is the lobby under its 3.0-3.2 slab: no way to the lip from there). */
  const boostSide = (l: Lip, p: BoxPiece): boolean => (p.c[0] - l.lip.x) * l.lip.n.x > 0;

  it('CR8 and CR8-west as briefed: lips x 14.1 / -4.15, z 19.5..21.0 at 4.4 over floor 0 (4.3-4.5, SS:49); boosts (14.6, 20.2) / (-4.8, 20.2) on nav; the sills are not noLedge', () => {
    expect(S4_COOP_LIPS.map((l) => l.id)).toEqual(['CR4', 'CR4-west', 'CR8', 'CR8-west']);
    expect(cr8).toMatchObject({ section: 3, lip: { x: 14.1, z0: 19.5, z1: 21.0, y: 4.4, n: { x: 1, z: 0 } }, top: { x0: -4, x1: 14, z0: 16, z1: 22, top: 3.2 }, boost: { floor: 0, x: 14.6, z: 20.2 } });
    expect(west).toMatchObject({ section: 3, lip: { x: -4.15, z0: 19.5, z1: 21.0, y: 4.4, n: { x: -1, z: 0 } }, top: { x0: -4, x1: 14, z0: 16, z1: 22, top: 3.2 }, boost: { floor: 0, x: -4.8, z: 20.2 } });
    for (const l of [cr8, west]) {
      const sill = sillOf(l);
      expect(sill, l.id).toBeTruthy();
      expect(sill.noLedge, l.id).not.toBe(true);
      expect(Math.abs((l.lip.n.x > 0 ? x1(sill) : x0(sill)) - l.lip.x), `${l.id} lip on the wall face`).toBeLessThan(1e-6);
      expect(l.lip.y - l.boost.floor).toBeGreaterThanOrEqual(4.3);
      expect(l.lip.y - l.boost.floor).toBeLessThanOrEqual(4.5);
      expect(onNav(l.boost.x, l.boost.z), `${l.id} boost`).toBe(true);
    }
  });

  for (const l of [cr8, west]) {
    it(`${l.id}: no solo running jump reaches the 4.4 lip (0.5 m margin) and none lands on the plenum floor`, () => {
      const own = sillOf(l);
      expect(soloJumpThreats(solid, grip(l), (p) => p === own, 0.5)).toEqual([]);
      expect(soloTopLandingThreats(solid, l.top, (p) => p === own, 0.5)).toEqual([]);
    });

    it(`${l.id} rule 2: nothing solo-standable 1.2 or higher within 4 m in plan on the boost side (the 2.0 noLedge racks are not standable)`, () => {
      const g = l.lip;
      const bad = solid.filter((p) => {
        const t = top(p);
        if (t < 1.2 || t >= g.y - 0.05 || !boostSide(l, p)) return false;
        if (Math.min(p.s[0], p.s[2]) < LEDGE.climbDepth) return false;
        if (p.noLedge && t > MANTLE) return false;
        const gx = Math.max(0, Math.abs(p.c[0] - g.x) - p.s[0] / 2);
        const gz = Math.max(0, Math.max(g.z0 - z1(p), z0(p) - g.z1));
        return hyp2(gx, gz) <= 4;
      });
      expect(bad.map((p) => [p.c, p.s])).toEqual([]);
      if (l.id === 'CR8') {
        // the dock crates (1.0) are the nearest tops: under 1.2, 3.4 m off (D:24)
        const crate = solid.find((p) => Math.abs(x0(p) - 17.4) < 1e-6 && Math.abs(top(p) - 1.0) < 1e-6)!;
        expect(crate).toBeTruthy();
        expect(x0(crate) - l.lip.x).toBeCloseTo(3.3, 1);
      } else {
        for (const [ax, az, bx2, bz] of S4_BOX.batteryRacks) {
          const rack = solid.find((p) => Math.abs(x0(p) - ax) < 1e-6 && Math.abs(z0(p) - az) < 1e-6 && Math.abs(x1(p) - bx2) < 1e-6 && Math.abs(z1(p) - bz) < 1e-6)!;
          expect(rack).toBeTruthy();
          expect(top(rack)).toBeCloseTo(2.0);
          expect(rack.noLedge).toBe(true);
          expect(top(rack)).toBeGreaterThan(MANTLE);
        }
      }
    });

    it(`${l.id} rule 3: nothing 0.3-4.3 high within 1 m of the wall under the lip (alarm-dk is a wall device, not a box)`, () => {
      const g = l.lip;
      const own = sillOf(l);
      const under = solid.filter((p) => p !== own && boostSide(l, p) && top(p) > 0.3 && bottom(p) < 4.3 && x1(p) > g.x - 1 && x0(p) < g.x + 1 && z1(p) > g.z0 && z0(p) < g.z1);
      expect(under.map((p) => [p.c, p.s])).toEqual([]);
    });

    it(`${l.id} rule 5: the stand capsule HANG.out + 0.45 inside the lip (in the plenum, y 4.45..6.2) is clear; the opening is 1.5 high`, () => {
      const g = l.lip;
      const cx = g.x - g.n.x * (HANG.out + 0.45);
      const r = MOVEMENT.radius;
      expect(cx > -4 && cx < 14, `${l.id} capsule over the plenum`).toBe(true);
      const hit = inRect(cx - r, cx + r, g.z0, g.z1, 4.45, 6.2);
      expect(hit.map((p) => [p.c, p.s])).toEqual([]);
      // the grille: open 4.4..5.9 through the wall, the wall head over it
      const own = sillOf(l);
      expect(inRect(x0(own), x1(own), g.z0, g.z1, 4.4, 5.9).map((p) => [p.c, p.s])).toEqual([]);
      const head = solid.find((p) => Math.abs(bottom(p) - 5.9) < 1e-6 && Math.abs(z0(p) - 19.5) < 1e-6 && Math.abs(z1(p) - 21.0) < 1e-6 && Math.abs(p.c[0] - own.c[0]) < 1e-6);
      expect(head, `${l.id} wall head`).toBeTruthy();
      // eslint-disable-next-line no-console
      if (process.env.CAMPUS_PRINT) console.log(`${l.id}: opening ${(bottom(head!) - top(own)).toFixed(2)} m high (E2E-1 proves the climb engages); sill depth ${own.s[0].toFixed(2)} m`);
      expect(bottom(head!) - top(own)).toBeCloseTo(1.5);
    });
  }

  it('G4.2 exactly the planned ledges on the grille walls: a canHang ledge at 4.4 along each side grille, none on the hall grilles, the hatch rim or the lobby slab', () => {
    for (const l of [cr8, west]) {
      for (const face of [l.lip.x, l.lip.x - l.lip.n.x * sillOf(l).s[0]]) {
        const e = ledges.find((q) => q.canHang && Math.abs(q.top - 4.4) < 1e-6 && Math.abs(q.a.x - face) < 1e-3 && Math.abs(q.b.x - face) < 1e-3 && Math.min(q.a.z, q.b.z) >= 19.5 - 1e-3 && Math.max(q.a.z, q.b.z) <= 21.0 + 1e-3);
        expect(e, `${l.id} ledge on face x ${face}`).toBeTruthy();
      }
    }
    // the hall grilles (z 22, x 3.0..4.2 and 8.6..9.8): no ledge on the wall under or around them
    expect(ledges.filter((q) => Math.abs(q.a.z - q.b.z) < 1e-6 && Math.abs(q.a.z - 22) < 0.2 && q.a.x > -4 && q.a.x < 14 && q.top < 6).map((q) => [q.a, q.b])).toEqual([]);
    // the lobby slab and the hatch rim (top 3.2 over x -4..14, z 16..22)
    expect(ledges.filter((q) => Math.abs(q.top - 3.2) < 1e-6 && Math.min(q.a.x, q.b.x) >= -4.2 && Math.max(q.a.x, q.b.x) <= 14.2 && Math.min(q.a.z, q.b.z) >= 15.8 && Math.max(q.a.z, q.b.z) <= 22.2).map((q) => [q.a, q.b])).toEqual([]);
  });
});

describe('G4.2 plenum, baskets, racks (D:24-26, C9-C11)', () => {
  it('G4.2 plenum: floor top 3.2 over x -4..14, z 16..22 but the hatch; the hatch open; the drop to the lobby 3.2 <= safe drop 4.5; no plenum cell joins the guards\' runtime nav grid', () => {
    for (let x = -3.75; x < 14; x += 0.5)
      for (let z = 16.25; z < 22; z += 0.5) {
        const inHatch = x > -2.6 && x < -1.4 && z > 16.4 && z < 17.6;
        const cover = solid.some((p) => p.overhead && Math.abs(top(p) - 3.2) < 1e-6 && x >= x0(p) && x <= x1(p) && z >= z0(p) && z <= z1(p));
        expect(cover, `(${x}, ${z})`).toBe(!inHatch);
      }
    for (const [x, z] of [[-2.0, 17.0], [-2.5, 16.5], [-1.5, 16.5], [-2.5, 17.5], [-1.5, 17.5]] as const) {
      expect(solid.some((p) => x > x0(p) && x < x1(p) && z > z0(p) && z < z1(p) && 3.1 > bottom(p) && 3.1 < top(p)), `hatch (${x}, ${z})`).toBe(false);
    }
    expect(3.2).toBeLessThanOrEqual(4.5);
    expect(onNav(5, 19, 3.2)).toBe(true);
    expect(onNav(-2.0, 17.0, 0)).toBe(true);
    const rt = runtimeNav(b, lay.playerSpawns[0]!.pos, m.campusOps.navLayers ?? 3, lay.navSeeds ?? []);
    const plenum = rt.cellOf(5, 19, 3.2);
    expect(rt.isWalkable(plenum) && Math.abs(rt.heightAt(5, 19, 3.2) - 3.2) < 0.3, 'the plenum seed is on the runtime grid').toBe(true);
    for (const [x, y, z] of [[4, 0, 17], [6.4, 0, 23], [3.6, 4.4, 30], [24, 0, 19], [-7, 0, 20]] as const) {
      expect(rt.findPath([x, z], [5, 19], 200000, y, 3.2), `runtime path (${x}, ${y}, ${z}) -> the plenum`).toBeNull();
    }
  }, 600_000);

  it('G4.2 baskets B1 / B2 end at the hall wall: south ends at z 22.15 under the grilles; no box over either basket top between 4.4 and 5.9 along its length', () => {
    expect(S4_BOX.b1).toEqual([3.1, 22.15, 4.1, 40.8]);
    expect(S4_BOX.b2).toEqual([8.7, 22.15, 9.7, 40.8]);
    for (const [q, gx0, gx1] of [[S4_BOX.b1, 3.0, 4.2], [S4_BOX.b2, 8.6, 9.8]] as const) {
      const south = solid.find((p) => isBasket(p) && Math.abs(z0(p) - 22.15) < 1e-6 && Math.abs(x0(p) - q[0]) < 1e-6);
      expect(south, `basket x ${q[0]}`).toBeTruthy();
      expect(gx0 <= q[0] && gx1 >= q[2]).toBe(true);
      expect(inRect(q[0], q[2], q[1], q[3], 4.4, 5.9).map((p) => [p.c, p.s]), `over basket x ${q[0]}`).toEqual([]);
      // the grille over the basket's end: the hall wall is open 4.4..5.9 across the basket's width
      expect(inRect(q[0], q[2], 21.85, 22.15, 4.4, 5.9).map((p) => [p.c, p.s])).toEqual([]);
    }
    // B1's south box runs z 22.15..32.4; the CR4 box unchanged
    expect(solid.some((p) => isBasket(p) && Math.abs(x0(p) - 3.1) < 1e-6 && Math.abs(z0(p) - 22.15) < 1e-6 && Math.abs(z1(p) - 32.4) < 1e-6)).toBe(true);
    expect(solid.some((p) => isBasket(p) && Math.abs(x0(p) - 3.1) < 1e-6 && Math.abs(z0(p) - 32.4) < 1e-6 && Math.abs(z1(p) - 35.6) < 1e-6 && !p.noLedge)).toBe(true);
    expect(pathLen([3.6, 30, S4_BASKET], [3.6, 22.5, S4_BASKET])).not.toBeNull();
  });

  it('G4.2 racks: both rows 2.0 high, noLedge; the CR8-west boost spot (-4.8, 20.2) on nav and >= 0.6 m from the east row', () => {
    expect(S4_BOX.batteryRacks).toEqual([[-9.4, 18.0, -8.4, 26.5], [-5.6, 21.0, -4.6, 23.5]]);
    for (const [ax, az, bx2, bz] of S4_BOX.batteryRacks) {
      const rack = solid.find((p) => Math.abs(x0(p) - ax) < 1e-6 && Math.abs(z0(p) - az) < 1e-6 && Math.abs(x1(p) - bx2) < 1e-6 && Math.abs(z1(p) - bz) < 1e-6)!;
      expect(rack).toBeTruthy();
      expect(bottom(rack)).toBeCloseTo(0);
      expect(top(rack)).toBeCloseTo(2.0);
      expect(rack.noLedge).toBe(true);
    }
    expect(onNav(-4.8, 20.2)).toBe(true);
    const [ex0, ez0, ex1, ez1] = S4_BOX.batteryRacks[1];
    const gx = Math.max(0, ex0 - -4.8, -4.8 - ex1);
    const gz = Math.max(0, ez0 - 20.2, 20.2 - ez1);
    expect(hyp2(gx, gz)).toBeGreaterThanOrEqual(0.6);
  });
});
