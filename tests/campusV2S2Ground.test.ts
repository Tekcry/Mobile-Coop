/**
 * (campus-greybox S2-G1, `docs/campus-greybox/briefs/S2.md` section 1) Section 2's G floor in its v2 layout, flag on
 * (`flags.campusV2 = [2]`): the one lobby (C1, BA1), the two-flight feature stair with its landing and rails (C3), the
 * plant room's locked north door (C5), the back-of-house doors (C6), the mail-lift shaft and ladder (C16, BA8) and the post
 * cages (BA15). The map is built undressed with the pure `LevelBuilder` (the `tests/campusV2.test.ts` loader); the G nav
 * is the live test's analytic raster (`tests/campusS2.test.ts` `analyticNav`) over the v2 pieces.
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavSample } from '../src/ai/navGrid';
import { hyp2 } from '../src/core/mathx';
import type { Flight } from '../src/world/maps/campusV2/s2';

const PI = Math.PI;

/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const sections = await import('../src/world/maps/campusSections');
  const { buildCampus } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s2 = await import('../src/world/maps/campusV2/s2');
  const s2Dress = await import('../src/world/maps/campusV2/s2Dress');
  const live2Dress = await import('../src/world/maps/campusS2Dress');
  const dress = await import('../src/world/maps/campusDress');
  const { CampusDresser } = await import('../src/world/campusArt/dresser');
  return { sections, buildCampus, LevelBuilder, s2, s2Dress, live2Dress, dress, CampusDresser };
}

const m = await loadCampus([2]);
const S2 = m.s2;
const b: LB = new m.LevelBuilder();
const lay = m.buildCampus(b, { dress: false });

/** The plain collision boxes (quarter turns swapped to plain; pitched pieces, the stair ramps and rails, left out). */
const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}

/** A flight's ramp surface at (x, z): its height, or NaN outside it. */
function flightH(f: Flight, x: number, z: number): number {
  const dx = x - f.cx;
  const dz = z - f.cz;
  const along = dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw);
  const across = dx * Math.cos(f.yaw) - dz * Math.sin(f.yaw);
  if (Math.abs(across) > f.w / 2 || Math.abs(along) > f.len / 2) return Number.NaN;
  return f.y0 + (f.rise * (along + f.len / 2)) / f.len;
}

/** The analytic nav grid of a rectangle (the live S2 test's raster): blockers, fences, cylinders, the flights, ladder links. */
function analyticNav(rect: readonly [number, number, number, number], cell = 0.5, layers = 5): NavGrid {
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
    for (const f of S2.S2_FLIGHTS) {
      const h = flightH(f, x, z);
      if (h === h) out.push({ h, bottom: h - 0.35 });
    }
    return out.sort((a, q) => q.h - a.h);
  };
  const blockers = near.filter((p) => !p.overhead).map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: p.c[1] - p.s[1] / 2, top: p.c[1] + p.s[1] / 2 }));
  for (const f of b.anchors.fences) blockers.push({ cx: (f.a.x + f.b.x) / 2, cz: (f.a.z + f.b.z) / 2, hx: 0.05, hz: f.len / 2, yaw: Math.atan2(f.tx, f.tz), bottom: f.a.y, top: f.a.y + f.height });
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

const nav = analyticNav([-46, -34, 12, 8]);
const onNav = (x: number, z: number, y = 0): boolean => nav.isWalkable(nav.cellOf(x, z, y)) && Math.abs(nav.heightAt(x, z, y) - y) < 0.6;
/** The path length of a nav path from (x, z). */
const pathLen = (from: readonly [number, number], path: readonly (readonly number[])[]): number => {
  let len = 0;
  let q: readonly number[] = from;
  for (const w of path) {
    len += hyp2(w[0]! - q[0]!, w[1]! - q[1]!);
    q = w;
  }
  return len;
};
/** Shuts the cells of a doorway (a plan box) on floor y for the body of `fn`, as a locked door does for a guard. */
function shut<T>(boxes: readonly (readonly [number, number, number, number])[], y: number, fn: () => T): T {
  const off: number[] = [];
  for (let i = 0; i < nav.walk.length; i++) {
    if (!nav.walk[i] || Math.abs(nav.height[i]! - y) > 1) continue;
    const [x, z] = nav.center(i % nav.cols);
    if (boxes.some(([x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1)) {
      nav.walk[i] = 0;
      off.push(i);
    }
  }
  try {
    return fn();
  } finally {
    for (const i of off) nav.walk[i] = 1;
  }
}
/** The door anchor whose plan centre is (x, z) on floor y (the centre `Doors` computes from the hinge). */
const doorAt = (x: number, z: number, y: number) =>
  b.anchors.doors.find((d) => Math.abs(d.hinge.y - y) < 0.01 && hyp2(d.hinge.x + Math.sin(d.yaw) * d.width * 0.5 - x, d.hinge.z + Math.cos(d.yaw) * d.width * 0.5 - z) < 0.05);

describe('S2-G1 one lobby (C1, BA1)', () => {
  it('the reception and the hall are one room: foyer x -30..-8, z -30..6, named Reception and Atrium; hall gone, hallne kept', () => {
    const ids = S2.S2_ROOMS.map((r) => r.id);
    expect(ids).not.toContain('hall');
    const f = S2.S2_ROOMS.find((r) => r.id === 'foyer')!;
    expect([f.minX, f.maxX, f.minZ, f.maxZ, f.maxY]).toEqual([-30, -8, -30, 6, 4.4]);
    expect(f.name).toBe('Reception and Atrium');
    const ne = S2.S2_ROOMS.find((r) => r.id === 'hallne')!;
    expect([ne.minX, ne.maxX, ne.minZ, ne.maxZ]).toEqual([-8, 4, -4, 6]);
    // the turnstile barrier at z -23 stays (four waist-high segments), inside the one room
    const bar = solid.filter((p) => Math.abs(p.c[2] + 23) < 1e-6 && Math.abs(p.s[1] - 1.1) < 1e-6 && p.c[0] > -30 && p.c[0] < -8);
    expect(bar.length).toBe(4);
  });

  it('the G rooms do not overlap', () => {
    const g = S2.S2_ROOMS.filter((r) => (r.minY ?? 0) < 4.4 && (r.maxY ?? Infinity) <= 4.4);
    expect(g.length).toBeGreaterThanOrEqual(7);
    for (let i = 0; i < g.length; i++)
      for (let j = i + 1; j < g.length; j++) {
        const a = g[i]!;
        const c = g[j]!;
        const ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX);
        const oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
        expect(ox > 0.01 && oz > 0.01, `${a.id} overlaps ${c.id}`).toBe(false);
      }
  });
});

describe('S2-G1 the feature stair (C3)', () => {
  it('two flights of 13 risers (0.169 x 0.283, 2R + G 0.62) with a 2.0 m mid landing; the 24-step flight is gone', () => {
    const fl = S2.FEATURE_FLIGHTS;
    expect(fl.length).toBe(2);
    for (const f of fl) {
      expect(f.steps).toBe(13);
      expect(f.rise).toBeCloseTo(2.2);
      expect(f.len).toBeCloseTo(3.4);
      expect(f.w).toBeCloseTo(2.4);
      const R = f.rise / f.steps;
      const G = f.len / (f.steps - 1);
      expect(R).toBeCloseTo(0.169, 3);
      expect(G).toBeCloseTo(0.283, 3);
      expect(2 * R + G).toBeCloseTo(0.62, 2);
    }
    // flight A from the G floor at z -9.7 to the landing at z -13.1; flight B from the landing (2.2) at z -15.1 to the L1 strip at z -18.5
    expect(flightH(fl[0]!, -18, -9.71)).toBeCloseTo(0, 1);
    expect(flightH(fl[0]!, -18, -13.09)).toBeCloseTo(2.2, 1);
    expect(flightH(fl[1]!, -18, -15.11)).toBeCloseTo(2.2, 1);
    expect(flightH(fl[1]!, -18, -18.49)).toBeCloseTo(4.4, 1);
    expect(S2.S2_FLIGHTS.filter((f) => f.steps === 24).length).toBe(0);
    expect(S2.S2_FLIGHTS.length).toBe(14);
    expect(S2.S2_FLIGHTS).toContain(fl[0]);
    expect(S2.S2_FLIGHTS).toContain(fl[1]);
  });

  it('the landing: x -19.2..-16.8, z -15.1..-13.1, top 2.2, 0.2 thick, noLedge, a slab G walks under', () => {
    const L = S2.FEATURE_LANDING;
    expect(L.z0 - L.z1).toBeCloseTo(-2.0);
    const p = solid.find((q) => Math.abs(q.c[0] + 18) < 1e-6 && Math.abs(q.c[2] + 14.1) < 1e-6 && Math.abs(q.c[1] + q.s[1] / 2 - 2.2) < 1e-6)!;
    expect(p).toBeTruthy();
    [2.4, 0.2, 2.0].forEach((v, k) => expect(p.s[k]).toBeCloseTo(v, 6));
    expect(p.noLedge).toBe(true);
    expect(p.overhead).toBe(true);
  });

  it('rails 1.1 high, 0.1 thick, noLedge, on both sides (x -19.25 and -16.75) of both flights (pitched along the slope) and of the landing', () => {
    for (const x of [-19.25, -16.75]) {
      const rails = b.boxes.filter((p) => Math.abs(p.c[0] - x) < 1e-6 && Math.abs(p.s[0] - 0.1) < 1e-6 && Math.abs(p.s[1] - 1.1) < 1e-6 && p.c[2] < -9 && p.c[2] > -19);
      expect(rails.length, `rails at x ${x}`).toBe(3);
      expect(rails.every((p) => p.noLedge && p.collide)).toBe(true);
      const pitched = rails.filter((p) => Math.abs(p.pitch) > 1e-3);
      expect(pitched.length).toBe(2);
      for (const p of pitched) expect(p.pitch).toBeCloseTo(-Math.atan2(2.2, 3.4));
      const flat = rails.find((p) => Math.abs(p.pitch) < 1e-3)!;
      expect(flat.c[1] - flat.s[1] / 2).toBeCloseTo(2.2);
      expect(flat.s[2]).toBeCloseTo(2.0);
    }
  });

  it('the stair stands inside the G1 lobby room and the new void plan (x -26..-11.5, z -18.5..-4): nothing hangs over it', () => {
    for (const f of S2.FEATURE_FLIGHTS) {
      expect(f.cx - f.w / 2).toBeGreaterThanOrEqual(-26);
      expect(f.cx + f.w / 2).toBeLessThanOrEqual(-11.5);
      expect(f.cz - f.len / 2).toBeGreaterThanOrEqual(-18.5 - 1e-9);
      expect(f.cz + f.len / 2).toBeLessThanOrEqual(-4);
    }
  });
});

describe('S2-G1 doors (C5, C6)', () => {
  it('every new door is 1.2 x 2.1; the plant room north door (-5, -4) is locked and breachable; the C6 doors (-36, -12) and (-36, -4)', () => {
    const north = doorAt(-5, -4, 0)!;
    expect(north, 'plant north door').toBeTruthy();
    expect(north.locked).toBe(true);
    expect(north.breachable).toBe(true);
    for (const [x, z] of [[-5, -4], [-36, -12], [-36, -4]] as const) {
      const d = doorAt(x, z, 0)!;
      expect(d, `door (${x}, ${z})`).toBeTruthy();
      expect(d.width).toBeCloseTo(1.2);
      expect(d.height).toBeCloseTo(2.1);
    }
    expect(doorAt(-36, -12, 0)!.locked).toBe(false);
    expect(doorAt(-36, -4, 0)!.locked).toBe(false);
    // the C6 doors are 6 m from the x -30 corner, the plant north door 3 m from the x -8 corner
    expect(-30 - -36).toBe(6);
    expect(-5 - -8).toBe(3);
  });

  it('nav: with the north door locked the plant room reaches the lobby only by its door (-8, -26)', () => {
    const plant: [number, number] = [-2, -18];
    const lobby: [number, number] = [-20, -12];
    const north: [number, number, number, number] = [-5.6, -4.4, -4.4, -3.6];
    const west: [number, number, number, number] = [-8.4, -26.6, -7.6, -25.4];
    expect(nav.findPath(plant, lobby, 200000, 0, 0), 'north door open').not.toBeNull();
    shut([north], 0, () => {
      expect(nav.findPath(plant, lobby, 200000, 0, 0), 'by the (-8, -26) door').not.toBeNull();
      shut([west], 0, () => expect(nav.findPath(plant, lobby, 400000, 0, 0), 'no other way').toBeNull());
    });
    // with the (-8, -26) door shut the north door is the way
    shut([west], 0, () => expect(nav.findPath(plant, lobby, 200000, 0, 0)).not.toBeNull());
  });

  it('nav: the lift lobby reaches the mail room and the store by the C6 doors (the hall doors shut)', () => {
    const lift: [number, number] = [-36, -8];
    const hallDoors: [number, number, number, number][] = [-16, -8, 1].map((z) => [-30.4, z - 0.6, -29.6, z + 0.6]);
    shut(hallDoors, 0, () => {
      expect(nav.findPath(lift, [-36, -15], 200000, 0, 0), 'mail room').not.toBeNull();
      expect(nav.findPath(lift, [-36, 0], 200000, 0, 0), 'store').not.toBeNull();
      // and through the C6 doors only: shut them too and both are cut off
      shut([[-36.6, -12.4, -35.4, -11.6], [-36.6, -4.4, -35.4, -3.6]], 0, () => {
        expect(nav.findPath(lift, [-36, -15], 400000, 0, 0)).toBeNull();
        expect(nav.findPath(lift, [-36, 0], 400000, 0, 0)).toBeNull();
      });
    });
  });
});

describe('S2-G1 the mail-lift shaft (C16, BA8) and the post cages (BA15)', () => {
  const M = S2.MAIL_SHAFT;
  it('the shaft: x -34..-32.8, z -19.5..-18, walls on N, E and S from G to 4.4, the W face open, everything noLedge', () => {
    expect([M.x0, M.x1, M.z0, M.z1]).toEqual([-34, -32.8, -19.5, -18]);
    const walls = solid.filter((p) => Math.abs(p.c[1] - 2.2) < 1e-6 && Math.abs(p.s[1] - 4.4) < 1e-6 && p.c[0] > -34.1 && p.c[0] < -32.5 && p.c[2] > -19.8 && p.c[2] < -17.7);
    expect(walls.length).toBe(3);
    expect(walls.every((p) => p.noLedge)).toBe(true);
    // the W face (x -34, z -19.5..-18) is open at G: no piece stands in it below 2.1
    const west = solid.filter((p) => Math.abs(p.c[0] - p.s[0] / 2 - -34) < 0.15 && p.c[2] > -19.4 && p.c[2] < -18.1 && p.c[1] - p.s[1] / 2 < 2.1);
    expect(west.length).toBe(0);
  });

  it('the service ladder inside the east face (x -32.8), from G to L1 (4.4), facing PI / 2; no stair beside it between the same floors', () => {
    const l = b.anchors.ladders.filter((a) => Math.abs(a.base.x - M.x1) < 1e-6 && a.base.z > M.z0 && a.base.z < M.z1);
    expect(l.length).toBe(1);
    expect(l[0]!.base.y).toBe(0);
    expect(l[0]!.top.y).toBeCloseTo(4.4);
    expect(l[0]!.facing).toBeCloseTo(PI / 2);
    // 0.6 m clear in front of the rungs (SS:46): the shaft is 1.2 deep behind the climber
    expect(M.x1 - M.x0).toBeGreaterThanOrEqual(0.6);
    // the nearest stair (the SW core) is in another room, over 5 m away
    expect(hyp2(-39.4 - M.x0, -22.4 - M.z0)).toBeGreaterThan(5);
  });

  it('the L1 slab has the shaft box as a hole, with a 1.1 rail round it (noLedge) leaving the ladder top-out side open', () => {
    const slabOver = solid.filter((p) => Math.abs(p.c[1] + p.s[1] / 2 - 4.4) < 1e-6 && p.s[1] >= 0.2 && Math.abs(p.c[0] - -33.4) < p.s[0] / 2 - 0.05 && Math.abs(p.c[2] - -18.75) < p.s[2] / 2 - 0.05);
    expect(slabOver.length).toBe(0);
    const rails = solid.filter((p) => Math.abs(p.c[1] - 4.95) < 1e-6 && Math.abs(p.s[1] - 1.1) < 1e-6 && p.c[0] > -34.2 && p.c[0] < -32.6 && p.c[2] > -19.7 && p.c[2] < -17.8);
    expect(rails.length).toBe(3);
    expect(rails.every((p) => p.noLedge)).toBe(true);
    // the ladder's top-out point (0.85 m forward of the base, east) is on the slab and clear of every rail
    const tx = M.x1 + 0.85;
    expect(rails.some((p) => Math.abs(tx - p.c[0]) < p.s[0] / 2 + 0.3 && Math.abs(-18.75 - p.c[2]) < p.s[2] / 2)).toBe(false);
  });

  it('nav: the ladder links G (the mail room, behind the cages) to L1 by a short climb', () => {
    const from: [number, number] = [-33.6, -18.75];
    const to: [number, number] = [-31.6, -18.75];
    expect(onNav(from[0], from[1], 0)).toBe(true);
    expect(onNav(to[0], to[1], 4.4)).toBe(true);
    const p = nav.findPath(from, to, 400000, 0, 4.4)!;
    expect(p).not.toBeNull();
    // the SW fire stair is the only other way up from here: a long walk; the ladder is a few metres
    expect(pathLen(from, p)).toBeLessThan(6);
  });

  it('the post cages (2.2 x 1.8 x 0.9 steel) stand on the post room north wall at (-41.5, -20.6) and (-38, -20.6), clear of the SW core and the door leaves; the hide spot between them is on the nav', () => {
    expect(S2.POST_CAGES).toEqual([[-41.5, -20.6], [-38.0, -20.6]]);
    for (const [x, z] of S2.POST_CAGES) {
      const c = solid.find((p) => Math.abs(p.c[0] - x) < 1e-6 && Math.abs(p.c[2] - z) < 1e-6 && Math.abs(p.s[1] - 1.8) < 1e-6)!;
      expect(c, `cage (${x}, ${z})`).toBeTruthy();
      expect([c.s[0], c.s[2]]).toEqual([2.2, 0.9]);
      expect(c.noLedge).toBe(true);
      // against the north wall (its face at z -20.1), clear of the SW core's walls (z -22.2 and south)
      expect(z + 0.45).toBeLessThanOrEqual(-20.1 + 1e-9);
      expect(z - 0.45).toBeGreaterThan(-22.2);
    }
    // no door leaf sweeps a cage: the post / mail door (-36, -20) opens into x -36.6..-35.4, the SW core door (z -23) south of the cages
    for (const d of b.anchors.doors.filter((q) => q.hinge.y === 0 && q.hinge.x > -45 && q.hinge.x < -30 && q.hinge.z > -24 && q.hinge.z < -19)) {
      const yaw = d.yaw + d.swing * 1.53;
      for (let t = 0; t <= 1.0001; t += 0.1) {
        for (const a of [d.yaw, (d.yaw + yaw) / 2, yaw]) {
          const x = d.hinge.x + Math.sin(a) * d.width * t;
          const z = d.hinge.z + Math.cos(a) * d.width * t;
          for (const [cx, cz] of S2.POST_CAGES) expect(Math.abs(x - cx) < 1.1 && Math.abs(z - cz) < 0.45, `door at (${d.hinge.x}, ${d.hinge.z}) sweeps the cage at ${cx}`).toBe(false);
        }
      }
    }
    expect(S2.S2_HIDESPOTS.some((h) => h.pos.x === -39.75 && h.pos.y === 0 && h.pos.z === -21.6)).toBe(true);
    expect(onNav(-39.75, -21.6, 0)).toBe(true);
  });
});

describe('S2-G1 kept items, ids and the dressing', () => {
  it('the switchgear block (the sync-s2-power board stands on it, G5a) and the plant hide spot stay; the reception board (sync-s2-atrium) is unchanged', () => {
    expect(solid.some((p) => Math.abs(p.c[0] - 1.5) < 1e-6 && Math.abs(p.c[2] + 22) < 1e-6 && Math.abs(p.s[1] - 1.8) < 1e-6)).toBe(true);
    expect(S2.S2_HIDESPOTS.some((h) => h.pos.x === 2.5 && h.pos.y === 0 && h.pos.z === -24)).toBe(true);
    const atrium = S2.S2_BOARDS.find((q) => q.groups.includes(S2.S2_GROUPS.atrium))!;
    expect([atrium.pos.x, atrium.pos.y, atrium.pos.z]).toEqual([-8.4, 0, -28.5]);
    expect(lay.boards!.some((q) => q.pos.x === -8.4 && q.pos.z === -28.5)).toBe(true);
  });

  it('the art tags: every S2 room has one, foyer is atrium, hall is gone', () => {
    const tags = m.s2Dress.S2_ART_TAGS;
    expect(Object.keys(tags).sort()).toEqual(S2.S2_ROOMS.map((r) => r.id).sort());
    expect(tags.foyer).toBe('atrium');
    expect('hall' in tags).toBe(false);
  });

  it('the dress log gains no line: every v2 S2 dress log line is one the live S2 dressing logs too', async () => {
    const run = (mm: typeof m, bb: LB, ll: typeof lay): string[] => {
      const ctx = mm.dress.sectionContext(bb, ll, 1, () => []);
      const d = new mm.CampusDresser(bb, ctx, mm.dress.sectionCatalogues(1));
      mm.sections.CAMPUS_PARTS[1]!.dress(d);
      return [...(mm.sections.CAMPUS_PARTS[1] === mm.sections.CAMPUS_V2_PARTS[1] ? mm.s2Dress.S2_DRESS_LOG : mm.live2Dress.S2_DRESS_LOG)];
    };
    const v2log = run(m, b, lay);
    const m0 = await loadCampus([]);
    const b0 = new m0.LevelBuilder();
    const live = run(m0, b0, m0.buildCampus(b0, { dress: false }));
    // a line names greybox boxes by index, which moves with every piece added before it: compared without the index
    const norm = (l: string): string => l.replace(/box \d+/g, 'box #');
    const known = new Set(live.map(norm));
    expect(v2log.filter((l) => !known.has(norm(l)))).toEqual([]);
  }, 120_000);
});
