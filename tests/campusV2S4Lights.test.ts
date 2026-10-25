/**
 * (campus-greybox S4, `docs/campus-greybox/briefs/S4.md` 0.5) Section 4's v2 light circuits, flag on (`flags.campusV2 = [4]`):
 * the essential-lighting board, the battery lamp (G4.3). The map is built undressed with the pure `LevelBuilder`; the nav is the
 * live test's analytic raster (`tests/campusS4.test.ts`, copied: a test file is never imported).
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { hyp2 } from '../src/core/mathx';

const PI = Math.PI;

/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const { buildCampus } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s4 = await import('../src/world/maps/campusV2/s4');
  return { buildCampus, LevelBuilder, s4 };
}

const m = await loadCampus([4]);
const { S4_DOORS, S4_LIGHTS, S4_SWITCHES, S4_GROUPS } = m.s4;
const b: LB = new m.LevelBuilder();
const lay = m.buildCampus(b, { dress: false });

const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;

/** An analytic layered nav grid over a rectangle (as `tests/campusV2S4.test.ts`; the flights and ladders as in the build). */
function analyticNav(rect: readonly [number, number, number, number], cell = 0.5): NavGrid {
  const snap = (v: number, o: number): number => o + Math.floor((v - o) / cell) * cell;
  const minX = snap(rect[0], b.bounds.minX);
  const minZ = snap(rect[1], b.bounds.minZ);
  const maxX = rect[2];
  const maxZ = rect[3];
  const near = solid.filter((p) => p.c[0] + p.s[0] > minX - 1 && p.c[0] - p.s[0] < maxX + 1 && p.c[2] + p.s[2] > minZ - 1 && p.c[2] - p.s[2] < maxZ + 1);
  const surf = (x: number, z: number): { h: number; bottom: number }[] => {
    const out: { h: number; bottom: number }[] = [];
    for (const p of near) if (Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2) out.push({ h: top(p), bottom: bottom(p) });
    return out.sort((a, q) => q.h - a.h);
  };
  const blockers: NavBlocker[] = near.filter((p) => !p.overhead).map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: bottom(p), top: top(p) }));
  for (const f of b.anchors.fences) blockers.push({ cx: (f.a.x + f.b.x) / 2, cz: (f.a.z + f.b.z) / 2, hx: 0.05, hz: f.len / 2, yaw: Math.atan2(f.tx, f.tz), bottom: f.a.y, top: f.a.y + f.height });
  for (const c of b.cylinders) if (c.collide) blockers.push({ cx: c.c[0], cz: c.c[2], hx: c.r, hz: c.r, yaw: 0, bottom: c.c[1] - c.h / 2, top: c.c[1] + c.h / 2, round: true });
  return new NavGrid({
    minX, maxX, minZ, maxZ, cell, agentRadius: 0.32, stepHeight: 0.45, layers: 5, blockers, links: [],
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
/** A walkable nav cell on floor y within r of (x, z): a switch or board stands on a wall, its user beside it. */
const nearNav = (x: number, z: number, y: number, r = 1.1): boolean => {
  for (let dx = -r; dx <= r; dx += 0.25) for (let dz = -r; dz <= r; dz += 0.25) if (hyp2(dx, dz) <= r && onNav(x + dx, z + dz, y)) return true;
  return false;
};

/** The S4 circuits (as built 70-79, the J17 band 140-149). */
const isS4Group = (g: number): boolean => (g >= 70 && g <= 79) || (g >= 140 && g <= 149);
const s4Lights = b.lights.lights.filter((l) => isS4Group(l.group));

describe('G4.3 ess board and battery lamp (D:27, C12)', () => {
  it('G4.3 ess board: groups [76, 77], window 25, yaw PI, at (-5.5, 0, 27.3), within 1.1 m of a nav cell; switching 76 and 77 off darkens exactly the NOC and security room lamps', () => {
    const board = lay.boards!.find((q) => q.groups.includes(S4_GROUPS.noc));
    expect(board).toBeTruthy();
    expect(board!.groups).toEqual([76, 77]);
    expect(board!.window).toBe(25);
    expect(board!.yaw).toBeCloseTo(PI);
    expect([board!.pos.x, board!.pos.y, board!.pos.z]).toEqual([-5.5, 0, 27.3]);
    expect(nearNav(board!.pos.x, board!.pos.z, board!.pos.y), 'ess board on nav').toBe(true);
    // the yard board is still the compound's (75, 20 s)
    const yard = lay.boards!.find((q) => q.groups.includes(S4_GROUPS.yard))!;
    expect(yard.groups).toEqual([75]);
    expect(yard.window).toBe(20);
    expect(lay.boards!.filter((q) => q.pos.x > -11 && q.pos.x < 41 && q.pos.z > 16 && q.pos.z < 48 && (q.groups.includes(75) || q.groups.includes(76))).length).toBe(2);
    // the lamps the board darkens: group 76 and 77 only
    const want = s4Lights.filter((l) => l.group === 76 || l.group === 77);
    expect(want.length).toBe(Object.values(S4_LIGHTS).flat().filter((q) => q.group === 76 || q.group === 77).length);
    expect(want.length).toBeGreaterThanOrEqual(4);
    b.lights.setGroup(76, false);
    b.lights.setGroup(77, false);
    try {
      const dark = s4Lights.filter((l) => !l.on);
      expect(dark.map((l) => l.id).sort()).toEqual(want.map((l) => l.id).sort());
    } finally {
      b.lights.setGroup(76, true);
      b.lights.setGroup(77, true);
    }
    expect(s4Lights.every((l) => l.on)).toBe(true);
  });

  it('G4.3 battery lamp: (-7, 2.4, 24) on circuit 142, one switch on nav within 1.5 m of hallBatt', () => {
    const l = s4Lights.find((q) => q.x === -7 && q.y === 2.4 && q.z === 24);
    expect(l).toBeTruthy();
    expect(l!.group).toBe(142);
    expect(l!.on && l!.intensity > 0 && l!.destructible && l!.electric).toBe(true);
    expect(s4Lights.filter((q) => q.group === 142).length).toBe(1);
    const sw = S4_SWITCHES.filter((s) => s.group === 142);
    expect(sw.length).toBe(1);
    expect([sw[0]!.pos.x, sw[0]!.pos.z]).toEqual([-4.3, 26.2]);
    expect(sw[0]!.yaw).toBeCloseTo(-PI / 2);
    expect(nearNav(sw[0]!.pos.x, sw[0]!.pos.z, 0), 'battery switch on nav').toBe(true);
    expect(hyp2(sw[0]!.pos.x - S4_DOORS.hallBatt[0], sw[0]!.pos.z - S4_DOORS.hallBatt[1])).toBeLessThanOrEqual(1.5);
    expect(lay.switches!.some((s) => s.group === 142)).toBe(true);
  });
});
