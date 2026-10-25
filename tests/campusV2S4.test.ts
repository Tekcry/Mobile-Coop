/**
 * (campus-greybox S4, `docs/campus-greybox/briefs/S4.md`) Section 4's v2 layout, flag on (`flags.campusV2 = [4]`): the
 * geometry of each slice (G4.1 the south band, G4.3 the west strip, G4.4 the NOC block, G4.5 the riser), the rooms and the
 * dress check. The map is built undressed with the pure `LevelBuilder` (the `tests/campusV2.test.ts` loader); the nav is the
 * live test's analytic raster (`tests/campusS4.test.ts` `analyticNav`, copied: a test file is never imported).
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { hyp2 } from '../src/core/mathx';
import { PERCEPTION } from '../src/ai/perception';
import { lampReach } from '../src/world/lampMath';
import { LevelBuilder as LiveBuilder } from '../src/world/levelBuilder';
import { buildCampusS4 as buildLiveS4 } from '../src/world/maps/campusS4';

const PI = Math.PI;

/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const sectors = await import('../src/world/maps/campusSectors');
  const { buildCampus, campusOps } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s4 = await import('../src/world/maps/campusV2/s4');
  const s4Data = await import('../src/world/maps/campusV2/s4Data');
  const s4Dress = await import('../src/world/maps/campusV2/s4Dress');
  const security = await import('../src/security/data');
  return { sectors, buildCampus, campusOps, LevelBuilder, s4, s4Data, s4Dress, security };
}

const m = await loadCampus([4]);
const { S4_DOORS, S4_FLIGHT, S4_LIGHTS, S4_ROOMS, S4_SWITCHES, S4_HIDESPOTS } = m.s4;
const b: LB = new m.LevelBuilder();
const lay = m.buildCampus(b, { dress: false });
const S4 = m.sectors.CAMPUS_SECTORS[3]!;

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
/** The box with these extents (1 mm). */
const boxIs = (p: BoxPiece, e: readonly number[]): boolean => [x0(p), x1(p), bottom(p), top(p), z0(p), z1(p)].every((v, k) => Math.abs(v - e[k]!) < 1e-3);
const findBox = (e: readonly number[]): BoxPiece | undefined => solid.find((p) => boxIs(p, e));

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

/** An analytic layered nav grid over a rectangle: the pieces as `navBuild` does (blockers, fences, cylinders), the flights as ramps, the ladders as links. */
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
/** A walkable nav cell on floor y within r of (x, z): a switch or panel stands on a wall, its user beside it. */
const nearNav = (x: number, z: number, y: number, r = 1.1): boolean => {
  for (let dx = -r; dx <= r; dx += 0.25) for (let dz = -r; dz <= r; dz += 0.25) if (hyp2(dx, dz) <= r && onNav(x + dx, z + dz, y)) return true;
  return false;
};
/** The door anchor whose opening centre is (x, z) on floor y (5 cm). */
const doorAt = (x: number, z: number, y = 0) =>
  b.anchors.doors.find((d) => Math.abs(d.hinge.y - y) < 0.05 && hyp2(d.hinge.x + (Math.sin(d.yaw) * d.width) / 2 - x, d.hinge.z + (Math.cos(d.yaw) * d.width) / 2 - z) < 0.05);

/** The S4 circuits (as built 70-79, the J17 band 140-149). */
const isS4Group = (g: number): boolean => (g >= 70 && g <= 79) || (g >= 140 && g <= 149);
const s4Lights = b.lights.lights.filter((l) => isS4Group(l.group));
const allLamps = Object.values(S4_LIGHTS).flat();

describe('G4.1 south band (D:16-23, C1-C8)', () => {
  it('G4.1 one goods-in lobby: no box across the old z 18 line below 3.0 but the parcel cages; clear width 5.7 at x -3, 1, 5; one slab top 3.2 over x -4..14, z 16..22', () => {
    const across = inRect(-3.85, 8, 17.5, 18.5, 0, 3.0).filter((p) => !(Math.abs(top(p) - 1.2) < 1e-6 && Math.abs(bottom(p)) < 1e-6 && Math.abs(z0(p) - 18.0) < 1e-6 && Math.abs(z1(p) - 18.8) < 1e-6));
    expect(across.map((p) => [p.c, p.s])).toEqual([]);
    for (const x of [-3, 1, 5]) {
      const walls = inRect(x - 0.01, x + 0.01, 16.15, 21.85, 0, 2.0).filter((p) => top(p) >= 2.0);
      expect(walls.map((p) => [p.c, p.s]), `x ${x}`).toEqual([]);
      expect(solid.some((p) => Math.abs(z1(p) - 16.15) < 1e-6 && x0(p) <= x && x1(p) >= x && bottom(p) <= 0), `south face at x ${x}`).toBe(true);
      expect(solid.some((p) => Math.abs(z0(p) - 21.85) < 1e-6 && x0(p) <= x && x1(p) >= x && bottom(p) <= 0), `north face at x ${x}`).toBe(true);
    }
    // one slab over the whole lobby, cut only round the G4.2 ceiling hatch (x -2.6..-1.4, z 16.4..17.6): four pieces
    const slabs = solid.filter((p) => p.overhead && Math.abs(top(p) - 3.2) < 1e-6 && x1(p) > -4 && x0(p) < 14 && z1(p) > 16 && z0(p) < 22);
    expect(slabs.length).toBe(4);
    for (const e of [[-4, 14, 3.0, 3.2, 16, 16.4], [-4, 14, 3.0, 3.2, 17.6, 22], [-4, -2.6, 3.0, 3.2, 16.4, 17.6], [-1.4, 14, 3.0, 3.2, 16.4, 17.6]]) expect(slabs.some((p) => boxIs(p, e)), JSON.stringify(e)).toBe(true);
    expect(S4_DOORS).not.toHaveProperty('scLobby');
    expect(doorAt(4, 18)).toBeUndefined();
  });

  it('G4.1 mantrap x 8..11, z 19..22: three 3.0 walls and the lid; the outer door hinge (8, 19.9), 1.2, not breachable; the inner door hinge (8.9, 22), armoured; 3.1 / 2.5 m from the pod doors', () => {
    expect(findBox([8, 11, 3.0, 3.1, 19, 22])?.overhead).toBe(true);
    // the south wall z 19 (x 8..11), the east wall x 11 (z 19..22), the west wall x 8 with the outer door (P 0.2)
    expect(inRect(8, 11, 18.95, 19.05, 0, 3.0).filter((p) => Math.abs(top(p) - 3.0) < 1e-6).length).toBeGreaterThan(0);
    expect(findBox([10.9, 11.1, 0, 3.0, 19, 22])).toBeTruthy();
    expect(findBox([8, 11, 0, 3.0, 18.9, 19.1])).toBeTruthy();
    expect(solid.filter((p) => Math.abs(p.c[0] - 8) < 1e-6 && Math.abs(p.s[0] - 0.2) < 1e-6 && z0(p) >= 19 - 1e-6 && z1(p) <= 22 + 1e-6).every((p) => top(p) <= 3.0 + 1e-6)).toBe(true);
    const outer = doorAt(8, 20.5)!;
    expect(outer).toBeTruthy();
    expect(outer.hinge.x).toBeCloseTo(8);
    expect(outer.hinge.z).toBeCloseTo(19.9);
    expect(outer.width).toBeCloseTo(1.2);
    expect(outer.breachable).toBe(false);
    const inner = doorAt(9.5, 22)!;
    expect(inner).toBeTruthy();
    expect(inner.hinge.x).toBeCloseTo(8.9);
    expect(inner.hinge.z).toBeCloseTo(22);
    expect(inner.armoured).toBe(true);
    expect(inner.breachable).toBe(false);
    expect(doorAt(6.4, 24)).toBeTruthy();
    expect(doorAt(12.0, 24)).toBeTruthy();
    expect(9.5 - 6.4).toBeCloseTo(3.1);
    expect(12.0 - 9.5).toBeCloseTo(2.5);
    expect(S4_DOORS.mantrapOuter).toEqual([8, 20.5]);
    expect(S4_DOORS.mantrapInner).toEqual([9.5, 22]);
    expect(S4_DOORS.dockWest).toEqual([14, 17.5]);
    expect(S4_DOORS.kpBatt).toEqual([-4, 18.5]);
  });

  it('G4.1 desk, cages, alcove: the desk box; three 1.2 cages, not noLedge; the trolley alcove clear below 2.1; the alcove hide spot on nav', () => {
    expect(findBox([0.5, 2.1, 0, 0.75, 20.6, 21.4])).toBeTruthy();
    for (const [a, c] of [[2.0, 3.2], [7.0, 8.2], [11.5, 12.7]] as const) {
      const cage = findBox([a, c, 0, 1.2, 18.0, 18.8]);
      expect(cage, `cage x ${a}`).toBeTruthy();
      expect(cage!.noLedge, `cage x ${a}`).not.toBe(true);
    }
    expect(inRect(11.2, 13.8, 19.2, 21.8, 0, 2.1).map((p) => [p.c, p.s])).toEqual([]);
    const spot = S4_HIDESPOTS.find((h) => hyp2(h.pos.x - 12.6, h.pos.z - 21.3) < 1e-6);
    expect(spot).toBeTruthy();
    expect(onNav(12.6, 21.3)).toBe(true);
  });

  it('G4.1 doors 1.5 m off corners (SS:69-70): dockWest and kpBatt centres >= 1.5 m from their walls\' corners', () => {
    // dockWest on the dock west wall x 14 (z 16..22, the lobby / dock corners at z 16 and the hall wall z 22)
    const dw = S4_DOORS.dockWest;
    expect(doorAt(dw[0], dw[1])).toBeTruthy();
    for (const c of [16, 19, 22]) if (c !== 19) expect(Math.abs(dw[1] - c), `dockWest to z ${c}`).toBeGreaterThanOrEqual(1.5 - 1e-6);
    // kpBatt on the hall west wall x -4 (the lobby z 16..22, the battery room from z 16)
    const kb = S4_DOORS.kpBatt;
    expect(doorAt(kb[0], kb[1])).toBeTruthy();
    for (const c of [16, 22]) expect(Math.abs(kb[1] - c), `kpBatt to z ${c}`).toBeGreaterThanOrEqual(1.5 - 1e-6);
    expect(doorAt(14, 17)).toBeUndefined();
    expect(doorAt(-4, 17)).toBeUndefined();
  });

  it('G4.1 lights: every S4 registry light from S4_LIGHTS; the as-built lamps kept; the four new lamps; all on, lit, shootable, electric; the four moved switches on nav', () => {
    expect(s4Lights.length).toBe(allLamps.length);
    for (const l of s4Lights) {
      const hit = allLamps.find((q) => Math.abs(q.x - l.x) < 1e-6 && Math.abs(q.y - l.y) < 1e-6 && Math.abs(q.z - l.z) < 1e-6 && Math.abs(lampReach(q.r) - l.radius) < 1e-9 && q.i === l.intensity && q.group === l.group);
      expect(hit, `light ${l.id} (${l.x}, ${l.y}, ${l.z}) g ${l.group}`).toBeTruthy();
      expect(l.on && l.intensity > 0 && l.destructible && l.electric, `light ${l.id}`).toBe(true);
    }
    // the as-built lamps (the live campusS4.ts): each kept at its position, radius, intensity and group
    const live = new LiveBuilder();
    buildLiveS4(live);
    const built = live.lights.lights.filter((l) => isS4Group(l.group));
    expect(built.length).toBe(30);
    for (const l of built) {
      expect(s4Lights.some((q) => q.x === l.x && q.y === l.y && q.z === l.z && q.radius === l.radius && q.intensity === l.intensity && q.group === l.group), `as-built (${l.x}, ${l.y}, ${l.z})`).toBe(true);
    }
    const want = [
      [2.0, 2.8, 21.2, 4.2, 73],
      [6.5, 2.8, 21.2, 4.2, 73],
      [9.5, 2.9, 20.5, 3, 73],
      [16, 2.4, 21.5, 3.6, 74],
    ] as const;
    for (const [x, y, z, r, g] of want) {
      const l = s4Lights.find((q) => q.x === x && q.y === y && q.z === z);
      expect(l, `new lamp (${x}, ${y}, ${z})`).toBeTruthy();
      expect(l!.radius).toBeCloseTo(lampReach(r));
      expect(l!.intensity).toBe(0.8);
      expect(l!.group).toBe(g);
      expect(l!.cone).not.toBeNull();
    }
    const sw = (x: number, z: number, g: number, yaw: number) => {
      const s = S4_SWITCHES.find((q) => Math.abs(q.pos.x - x) < 1e-6 && Math.abs(q.pos.z - z) < 1e-6);
      expect(s, `switch (${x}, ${z})`).toBeTruthy();
      expect(s!.group).toBe(g);
      expect(s!.yaw).toBeCloseTo(yaw);
      expect(nearNav(x, z, 0), `switch (${x}, ${z}) on nav`).toBe(true);
    };
    sw(13.85, 18.6, 73, -PI / 2);
    sw(-1.4, 16.15, 70, 0);
    sw(-1.0, 16.15, 71, 0);
    sw(-0.6, 16.15, 72, 0);
  });

  it('G4.1 cam-mantrap at (10.8, 21.8), inside the mantrap; validateSecurity passes; #4 at the desk facing the interlock', () => {
    const cam = m.sectors.CAMPUS_SECURITY.devices.find((d) => d.id === 'cam-mantrap')!;
    expect(cam.at).toEqual([10.8, 21.8]);
    expect(cam.facing).toBe(225);
    expect(cam.aim).toBe(3);
    expect(cam.at[0] > 8 && cam.at[0] < 11 && cam.at[1] > 19 && cam.at[1] < 22).toBe(true);
    expect(m.security.validateSecurity(m.sectors.CAMPUS_SECURITY)).toEqual([]);
    const g4 = S4.guards[3]!;
    expect(g4).toMatchObject({ x: 1.3, z: 20.1, yaw: PI / 2, takedownSpot: [0.8, 20.1] });
    expect(m.s4Data.S4_ARMOURED.find((a) => a.id === 'arm-mantrap')!.at).toEqual([9.5, 22]);
    expect(m.s4Data.S4_ARMOURED.find((a) => a.id === 'arm-mantrap')!.bypass.at).toEqual([-4, 18.5]);
  });
});

describe('G4.3 west strip (D:27-30, C12-C15)', () => {
  /** A door anchor's opening centre in plan. */
  const centre = (d: (typeof b.anchors.doors)[number]): [number, number] => [d.hinge.x + (Math.sin(d.yaw) * d.width) / 2, d.hinge.z + (Math.cos(d.yaw) * d.width) / 2];

  it('G4.3 colonnade z 27.5..31: 3.3 clear between the wall faces, a 3.0-3.2 slab over it, battCC and ccUps 3.0 m apart in x, no door at (-4, 29), no two doors within 2.0 m across it', () => {
    // the two walls (P 0.2) at x -7: faces z 27.6 and 30.9
    const south = solid.find((p) => x0(p) <= -7 && x1(p) >= -7 && Math.abs(z0(p) - 27.4) < 1e-6 && top(p) > 6);
    const north = solid.find((p) => x0(p) <= -7 && x1(p) >= -7 && Math.abs(z1(p) - 31.1) < 1e-6 && top(p) > 6);
    expect(south, 'south wall z 27.5').toBeTruthy();
    expect(north, 'north wall z 31').toBeTruthy();
    expect(z1(south!)).toBeCloseTo(27.6);
    expect(z0(north!)).toBeCloseTo(30.9);
    expect(z0(north!) - z1(south!)).toBeCloseTo(3.3);
    const slab = findBox([-10, -4, 3.0, 3.2, 27.5, 31]);
    expect(slab?.overhead).toBe(true);
    expect(S4_DOORS.battCC).toEqual([-8.5, 27.5]);
    expect(S4_DOORS.ccUps).toEqual([-5.5, 31]);
    expect(S4_DOORS.ccUps[0] - S4_DOORS.battCC[0]).toBeCloseTo(3.0);
    expect(S4_DOORS).not.toHaveProperty('hallCC');
    expect(doorAt(-8.5, 27.5), 'battCC').toBeTruthy();
    expect(doorAt(-5.5, 31), 'ccUps').toBeTruthy();
    // battCC opens north into the colonnade (P2), ccUps into it (south)
    expect(doorAt(-8.5, 27.5)!.swing).toBe(-1);
    expect(doorAt(-5.5, 31)!.swing).toBe(1);
    // hallCC is walled: no door anchor within 0.6 m of (-4, 29), the wall is solid there up to the roof
    expect(b.anchors.doors.filter((d) => d.hinge.y < 0.05).every((d) => hyp2(...centre(d).map((v, k) => v - [-4, 29][k]!) as [number, number]) > 0.6)).toBe(true);
    expect(inRect(-4.05, -3.95, 28.9, 29.1, 0, 2.1).length).toBeGreaterThan(0);
    // no two door centres within 2.0 m facing each other across the colonnade (one on z 27.5, one on z 31), nor the C4 near door and a colonnade door
    const ds = b.anchors.doors.filter((d) => d.hinge.y < 0.05 && centre(d)[0] < -4 && centre(d)[0] > -10.1 && centre(d)[1] > 27 && centre(d)[1] < 31.5).map(centre);
    expect(ds.length).toBe(3);
    for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) expect(hyp2(ds[i]![0] - ds[j]![0], ds[i]![1] - ds[j]![1]), `doors ${i}/${j}`).toBeGreaterThanOrEqual(2.0);
    // the S4 box list and the rooms follow
    expect(m.s4.S4_BOX.battery).toEqual([-10, 16, -4, 27.5]);
    expect(m.s4.S4_BOX.ups).toEqual([-10, 31, -4, 48]);
    const room = (id: string) => S4_ROOMS.find((r) => r.id === id)!;
    expect(room('s4-batt')).toMatchObject({ minZ: 16, maxZ: 27.5 });
    expect(room('s4-cc')).toMatchObject({ minZ: 27.5, maxZ: 31, maxY: 3.1 });
    expect(room('s4-ups')).toMatchObject({ minZ: 31, maxZ: 48 });
  });

  it('G4.3 UPS door and console: the door anchor at (-4, 46.5) on floor 0 opens into the security room; the console box z 43.2..45.6; alarm-sec4 at (-3.85, 43.0)', () => {
    const d = doorAt(-4, 46.5)!;
    expect(d).toBeTruthy();
    expect(d.hinge.x).toBeCloseTo(-4);
    expect(d.hinge.z).toBeCloseTo(45.9);
    expect(d.swing).toBe(1);
    expect(S4_DOORS.upsSec).toEqual([-4, 46.5]);
    expect(findBox([-3.9, -3.3, 0, 0.75, 43.2, 45.6])).toBeTruthy();
    // the leaf (1.2 into +x) sweeps x -4..-2.8: the console (x -3.9..-3.3) ends at z 45.6, where the leaf's hinge side starts
    expect(inRect(-4, -2.8, 45.9, 47.1, 0, 2.1).filter((p) => !(top(p) > 6)).map((p) => [p.c, p.s])).toEqual([]);
    const alarm = lay.alarms!.filter((a) => a.section === 3).find((a) => Math.abs(a.pos.x + 3.85) < 1e-6);
    expect(alarm).toBeTruthy();
    expect(alarm!.pos.z).toBeCloseTo(43.0);
    expect(nearNav(-3.85, 43.0, 0)).toBe(true);
  });

  it('G4.3 K3 (M12): #19 at (-8.8, 30.0); with his cone as a nav blocker no path from the start to the cell 0.6 m east of the C4 near door, without it one; the leash edge is >= 1 m beyond the door cell', () => {
    const post = S4.guards[18]!;
    expect(post).toMatchObject({ x: -8.8, z: 30.0, yaw: PI / 2, takedownSpot: [-9.3, 30.0], role: 'posted', zone: 'c4' });
    expect(post.post).toEqual({ leash: 5, guards: 'c4-gate' });
    const door = S4_DOORS.c4Near;
    const from: [number, number] = [S4.start.x, S4.start.z];
    const to: [number, number] = [door[0] + 0.6, door[1]];
    expect(nav.findPath(from, to, 1e7, 0, 0)).not.toBeNull();
    const fx = Math.sin(post.yaw);
    const fz = Math.cos(post.yaw);
    const inCone = (x: number, z: number): boolean => {
      const dx = x - post.x;
      const dz = z - post.z;
      const dd = hyp2(dx, dz);
      if (dd < 1e-6) return true;
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / dd)));
      return (dd <= PERCEPTION.focusRange && ang <= PERCEPTION.focusHalf) || (dd <= PERCEPTION.periphRange && ang <= PERCEPTION.periphHalf);
    };
    const doorCell = nav.center(nav.cellOf(door[0], door[1], 0));
    expect(inCone(doorCell[0], doorCell[1]), 'the C4 door cell is not in the cone').toBe(false);
    expect(post.post!.leash - hyp2(doorCell[0] - post.x, doorCell[1] - post.z)).toBeGreaterThanOrEqual(1);
    const blocked: number[] = [];
    for (let i = 0; i < nav.walk.length; i++) {
      if (!nav.walk[i]) continue;
      if (Math.abs(nav.height[i]!) > 1.7) continue;
      const [x, z] = nav.center(i % nav.cols);
      if (inCone(x, z)) {
        blocked.push(i);
        nav.walk[i] = 0;
      }
    }
    try {
      expect(blocked.length).toBeGreaterThan(50);
      expect(nav.findPath(from, to, 1e7, 0, 0)).toBeNull();
    } finally {
      for (const i of blocked) nav.walk[i] = 1;
    }
    expect(nav.findPath(from, to, 1e7, 0, 0)).not.toBeNull();
    expect(door[0]).toBeLessThan(post.x);
  });
});

describe('S4 v2 rooms and dress', () => {
  it('the rooms do not overlap (storeys apart), carry no squad, and each has an art tag', () => {
    for (let i = 0; i < S4_ROOMS.length; i++)
      for (let j = i + 1; j < S4_ROOMS.length; j++) {
        const a = S4_ROOMS[i]!;
        const c = S4_ROOMS[j]!;
        const ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX);
        const oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
        const oy = Math.min(a.maxY ?? Infinity, c.maxY ?? Infinity) - Math.max(a.minY ?? -Infinity, c.minY ?? -Infinity);
        expect(ox > 0.01 && oz > 0.01 && oy > 0.01, `${a.id} overlaps ${c.id}`).toBe(false);
      }
    expect(S4_ROOMS.every((r) => (r.squad ?? []).length === 0)).toBe(true);
    for (const r of S4_ROOMS) expect(m.s4Dress.S4_ART_TAGS[r.id], r.id).toBeTruthy();
    expect(Object.keys(m.s4Dress.S4_ART_TAGS).sort()).toEqual(S4_ROOMS.map((r) => r.id).sort());
    expect(S4_ROOMS.map((r) => r.id)).toEqual(expect.arrayContaining(['s4-lobby', 's4-lobby-e', 's4-lobby-a', 's4-mantrap', 's4-plenum']));
    expect(S4_ROOMS.some((r) => ['s4-sc', 's4-lobby-b', 's4-lobby-c'].includes(r.id))).toBe(false);
    expect(lay.rooms!.filter((r) => r.id.startsWith('s4-')).length).toBe(S4_ROOMS.length);
  });

  it('the build dresses with the flag on: campusOps.build does not throw (job brief 0.6)', { timeout: 600_000 }, () => {
    const bd = new m.LevelBuilder();
    expect(() => m.campusOps.build(bd, 0)).not.toThrow();
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(m.s4Dress.S4_HERO_LOG.join('\n'));
  });
});
