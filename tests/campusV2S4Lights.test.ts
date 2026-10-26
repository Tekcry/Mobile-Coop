/**
 * (campus-greybox S4, `docs/campus-greybox/briefs/S4.md` 0.5) Section 4's v2 light circuits, flag on (`flags.campusV2 = [4]`):
 * the essential-lighting board, the battery lamp (G4.3). The map is built undressed with the pure `LevelBuilder`; the nav is the
 * live test's analytic raster (`tests/campusS4.test.ts`, copied: a test file is never imported).
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { hyp2 } from '../src/core/mathx';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LevelBuilder as LiveBuilder } from '../src/world/levelBuilder';
import { buildCampusS4 as buildLiveS4 } from '../src/world/maps/campusS4';
import { lampReach } from '../src/world/lampMath';

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

describe('G4.4 console lamp and north corridor lights (D:35, 0.5 rule 4)', () => {
  it('G4.4 console lamp: (-2.0, 2.4, 44.6) warm (1, 0.72, 0.38) on 77; the as-built NOC and security room lamps stay', () => {
    const c = s4Lights.find((q) => q.x === -2.0 && q.y === 2.4 && q.z === 44.6)!;
    expect(c).toBeTruthy();
    expect(c.group).toBe(77);
    expect(c.color).toEqual([1, 0.72, 0.38]);
    expect(c.intensity).toBe(0.8);
    expect(c.cone).not.toBeNull();
    for (const [x, y, z, g] of [[0, 6.4, 45, 76], [5, 6.4, 45, 76], [0, 3.1, 44.5, 77], [5, 3.1, 44.5, 77]] as const) {
      expect(s4Lights.some((q) => q.x === x && q.y === y && q.z === z && q.group === g), `kept (${x}, ${y}, ${z})`).toBe(true);
    }
  });

  it('G4.4 north corridor: three lamps (11.75 / 19.25 / 26.75, 3.5, 45) on 140, one switch within 1.5 m of ncDoor on nav; every S4 lamp on, lit, shootable, electric and from S4_LIGHTS', () => {
    const nc = s4Lights.filter((q) => q.group === 140);
    expect(nc.map((q) => [q.x, q.y, q.z]).sort((p, q) => p[0]! - q[0]!)).toEqual([[11.75, 3.5, 45], [19.25, 3.5, 45], [26.75, 3.5, 45]]);
    for (const l of nc) expect(l.radius).toBeCloseTo(lampReach(5));
    const sw = S4_SWITCHES.filter((s) => s.group === 140);
    expect(sw.length).toBe(1);
    expect([sw[0]!.pos.x, sw[0]!.pos.z]).toEqual([21.2, 42.3]);
    expect(sw[0]!.yaw).toBeCloseTo(0);
    expect(nearNav(21.2, 42.3, 0), 'corridor switch on nav').toBe(true);
    expect(hyp2(sw[0]!.pos.x - S4_DOORS.ncDoor[0], sw[0]!.pos.z - S4_DOORS.ncDoor[1])).toBeLessThanOrEqual(1.5);
    const all = Object.values(S4_LIGHTS).flat();
    expect(s4Lights.length).toBe(all.length);
    for (const l of s4Lights) {
      expect(all.some((q) => q.x === l.x && q.y === l.y && q.z === l.z && q.group === l.group && q.i === l.intensity), `light ${l.id}`).toBe(true);
      expect(l.on && l.intensity > 0 && l.destructible && l.electric, `light ${l.id}`).toBe(true);
    }
  });
});

describe('G4.5 deck lights and the riser lamp (D:40, 0.5 rule 4)', () => {
  it('G4.5 deck lights: group 79 = 4 task lights + 4 pole floods, no switch; group 75 still the board\'s two floods (window 20); the riser lamp on 141 with one switch on nav within 1.5 m of kpDeck', () => {
    const deck = s4Lights.filter((q) => q.group === 79);
    expect(deck.length).toBe(8);
    expect(deck.filter((q) => q.y === 8.8).length).toBe(4);
    const floods = deck.filter((q) => q.y === 12.3);
    expect(floods.map((q) => [q.x, q.z]).sort((p, q) => p[0]! - q[0]!)).toEqual([[-3, 24], [8, 36], [20, 24], [24, 38]]);
    for (const f of floods) {
      expect(f.radius).toBeCloseTo(lampReach(7.5));
      expect(f.intensity).toBe(0.9);
    }
    expect(S4_SWITCHES.some((s) => s.group === 79)).toBe(false);
    expect(lay.switches!.some((s) => s.group === 79)).toBe(false);
    expect(lay.boards!.some((q) => q.groups.includes(79))).toBe(false);
    const yardLamps = s4Lights.filter((q) => q.group === 75);
    expect(yardLamps.length).toBe(2);
    const yard = lay.boards!.find((q) => q.groups.includes(75))!;
    expect(yard.groups).toEqual([75]);
    expect(yard.window).toBe(20);
    const riser = s4Lights.filter((q) => q.group === 141);
    expect(riser.length).toBe(1);
    expect([riser[0]!.x, riser[0]!.y, riser[0]!.z]).toEqual([31.2, 3.5, 47.2]);
    expect(riser[0]!.cone).toBeNull();
    expect(riser[0]!.intensity).toBe(0.7);
    const sw = S4_SWITCHES.filter((s) => s.group === 141);
    expect(sw.length).toBe(1);
    expect([sw[0]!.pos.x, sw[0]!.pos.z]).toEqual([30.75, 46.2]);
    expect(sw[0]!.yaw).toBeCloseTo(PI / 2);
    expect(nearNav(30.75, 46.2, 0), 'riser switch on nav').toBe(true);
    expect(hyp2(sw[0]!.pos.x - S4_DOORS.kpDeck[0], sw[0]!.pos.z - S4_DOORS.kpDeck[1])).toBeLessThanOrEqual(1.5);
    expect(s4Lights.length).toBe(Object.values(S4_LIGHTS).flat().length);
  });
});

describe('G4.6 final light rules (job BRIEF A19, S4.md 0.5)', () => {
  it('every S4 lamp comes from S4_LIGHTS, on, lit, shootable and electric; the block carries the PROVISIONAL / TODO(light-realism) header', () => {
    const all = Object.values(S4_LIGHTS).flat();
    expect(s4Lights.length).toBe(all.length);
    for (const l of s4Lights) {
      expect(all.some((q) => q.x === l.x && q.y === l.y && q.z === l.z && q.group === l.group && q.i === l.intensity), `light ${l.id}`).toBe(true);
      expect(l.on && l.intensity > 0 && l.destructible && l.electric, `light ${l.id}`).toBe(true);
    }
    const src = readFileSync(fileURLToPath(new URL('../src/world/maps/campusV2/s4.ts', import.meta.url)), 'utf8');
    expect(src).toContain('// PROVISIONAL - light-realism (J10) retunes these values (AS/NZS 1680 / 1158 bands). TODO(light-realism): replace with calibrated values.');
    expect(src.indexOf('TODO(light-realism)')).toBeLessThan(src.indexOf('export const S4_LIGHTS'));
  });

  it('no as-built lamp is below its as-built value (position, radius, intensity, group), none removed or dimmed; the 30 as-built lamps are all there', () => {
    const live = new LiveBuilder();
    buildLiveS4(live);
    const built = live.lights.lights.filter((l) => isS4Group(l.group));
    expect(built.length).toBe(30);
    for (const l of built) {
      const q = s4Lights.find((v) => v.x === l.x && v.y === l.y && v.z === l.z && v.group === l.group);
      expect(q, `as-built (${l.x}, ${l.y}, ${l.z})`).toBeTruthy();
      expect(q!.radius).toBeGreaterThanOrEqual(l.radius);
      expect(q!.intensity).toBeGreaterThanOrEqual(l.intensity);
    }
  });

  it('every lit group has a switch or a board except 79 (the deck: external plant lighting on a photocell, the LD 5.1 named reason)', () => {
    const groups = [...new Set(s4Lights.map((l) => l.group))].sort((p, q) => p - q);
    expect(groups).toEqual([70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 140, 141, 142]);
    for (const g of groups) {
      const sw = (lay.switches ?? []).some((s) => s.group === g);
      const bd = (lay.boards ?? []).some((q) => q.groups.includes(g));
      if (g === 79) expect(sw || bd, 'group 79 has no switch or board').toBe(false);
      else expect(sw || bd, `group ${g} has a switch or a board`).toBe(true);
    }
  });

  it('dark by reason: no lamp in the plenum, over the baskets above 4.4 or inside a pod (the hot aisles are behind the pod roofs)', () => {
    const { S4_BOX, S4_PODS } = m.s4;
    const inBox = (l: { x: number; z: number }, a: number, c: number, z0: number, z1: number): boolean => l.x >= a && l.x <= c && l.z >= z0 && l.z <= z1;
    expect(s4Lights.filter((l) => l.y > 3.1 && l.y < 7.2 && inBox(l, -4, 14, 16, 22)).map((l) => l.id)).toEqual([]);
    for (const q of [S4_BOX.b1, S4_BOX.b2, S4_BOX.b3, S4_BOX.bN, S4_BOX.bCage]) expect(s4Lights.filter((l) => l.y > 4.4 && inBox(l, q[0], q[2], q[1], q[3])).map((l) => l.id), `over basket ${q}`).toEqual([]);
    for (const x0 of S4_PODS) expect(s4Lights.filter((l) => inBox(l, x0, x0 + 3.6, 24, 32) && l.y < 3.1).map((l) => l.id), `pod ${x0}`).toEqual([]);
  });
});
