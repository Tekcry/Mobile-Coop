/**
 * (campus-greybox S5, `docs/campus-greybox/briefs/S5.md` 0.5 and P2) Section 5's v2 light, flag on (`flags.campusV2 = [5]`):
 * every lamp from the one `S5_LIGHTS` block, the as-built lamps kept, the plan's additions, a fitting in every room, the new
 * circuits 150-157 with their switches, the house and garden boards, and the places dark by reason. The map is built
 * undressed with the pure `LevelBuilder`; the nav is the live test's analytic raster (`tests/campusS5.test.ts`, copied: a
 * test file is never imported).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { hyp2 } from '../src/core/mathx';
import { lampReach } from '../src/world/lampMath';
import { LevelBuilder as LiveBuilder } from '../src/world/levelBuilder';
import { buildCampusS5 as buildLiveS5 } from '../src/world/maps/campusS5';

/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const { buildCampus } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s5 = await import('../src/world/maps/campusV2/s5');
  return { buildCampus, LevelBuilder, s5 };
}

const m = await loadCampus([5]);
const { S5_LIGHTS, S5_GROUPS, S5_ROOMS, S5_SWITCHES, S5_BOARDS, S5_FLIGHTS, S5_CORE, S5_DOORS, S5_L1, S5_ROOF } = m.s5;
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

/** An analytic layered nav grid over a rectangle (as `tests/campusV2S5.test.ts`, the stair ramps as surfaces, no links). */
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
    for (const h of rampAt(x, z)) out.push({ h, bottom: h - 0.35 });
    return out.sort((a, q) => q.h - a.h);
  };
  const blockers: NavBlocker[] = near.filter((p) => !p.overhead).map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: bottom(p), top: top(p) }));
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
const nav = analyticNav([-58, 16, -24, 46]);
const onNav = (x: number, z: number, y = 0): boolean => nav.isWalkable(nav.cellOf(x, z, y)) && Math.abs(nav.heightAt(x, z, y) - y) < 0.6;
/** A walkable nav cell on floor y within r of (x, z): a switch or board stands on a wall, its user beside it. */
const nearNav = (x: number, z: number, y: number, r = 1.1): boolean => {
  for (let dx = -r; dx <= r; dx += 0.25) for (let dz = -r; dz <= r; dz += 0.25) if (hyp2(dx, dz) <= r && onNav(x + dx, z + dz, y)) return true;
  return false;
};
const doorCentre = (d: (typeof b.anchors.doors)[number]): [number, number] => [d.hinge.x + Math.sin(d.yaw) * d.width * 0.5, d.hinge.z + Math.cos(d.yaw) * d.width * 0.5];

/** The S5 circuits (as built 80-89, the J17 band 150-159). */
const isS5Group = (g: number): boolean => (g >= 80 && g <= 89) || (g >= 150 && g <= 159);
const s5Lights = b.lights.lights.filter((l) => isS5Group(l.group));
const block = Object.values(S5_LIGHTS).flat();
const same = (l: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }): boolean => Math.abs(l.x - q.x) < 1e-6 && Math.abs(l.y - q.y) < 1e-6 && Math.abs(l.z - q.z) < 1e-6;
type RoomBox = (typeof S5_ROOMS)[number];
const inRoom = (r: RoomBox, l: { x: number; y: number; z: number }): boolean =>
  l.x >= r.minX && l.x <= r.maxX && l.z >= r.minZ && l.z <= r.maxZ && l.y >= (r.minY ?? -1) && l.y <= (r.maxY ?? 99);
const room = (id: string): RoomBox => S5_ROOMS.find((r) => r.id === id)!;
/** The new circuits (P2) and the room each one lights; the service stair's is the core. */
const CORE_ROOM: RoomBox = { id: 's5-core', name: 'Service Stair', minX: S5_CORE.x0, maxX: S5_CORE.x1, minZ: S5_CORE.z0, maxZ: S5_CORE.z1, minY: 0, maxY: 11 };
const NEW: { g: number; room: RoomBox }[] = [
  { g: S5_GROUPS.draw, room: room('s5-draw') },
  { g: S5_GROUPS.back, room: room('s5-back') },
  { g: S5_GROUPS.plant, room: room('s5-plant') },
  { g: S5_GROUPS.lobby, room: room('s5-lobby') },
  { g: S5_GROUPS.arch, room: room('s5-arch') },
  { g: S5_GROUPS.landing, room: room('s5-landing') },
  { g: S5_GROUPS.stair, room: CORE_ROOM },
];

describe('S5 v2 lights: the S5_LIGHTS block (section 0.5, job BRIEF A19)', () => {
  it('every S5 lamp comes from S5_LIGHTS, on, intensity > 0, destructible and electric; the block carries the PROVISIONAL / TODO(light-realism) header', () => {
    expect(s5Lights.length).toBe(block.length);
    for (const q of block) {
      const l = s5Lights.filter((x) => same(x, q));
      expect(l.length, `lamp (${q.x}, ${q.y}, ${q.z})`).toBe(1);
      expect(l[0]!.radius).toBeCloseTo(lampReach(q.r), 6);
      expect(l[0]!.intensity).toBe(q.i);
      expect(l[0]!.group).toBe(q.group);
    }
    for (const l of s5Lights) expect(l.on && l.intensity > 0 && l.destructible && l.electric, `lamp ${l.id}`).toBe(true);
    const src = readFileSync(new URL('../src/world/maps/campusV2/s5.ts', import.meta.url), 'utf8');
    const at = src.indexOf('export const S5_LIGHTS');
    const head = src.lastIndexOf('// PROVISIONAL - light-realism (J10) retunes these values. TODO(light-realism): replace with calibrated values.', at);
    expect(head).toBeGreaterThan(0);
    // the header sits right above the block (only its doc comment between)
    expect(src.slice(head, at).split('\n').length).toBeLessThan(10);
    // the block is drawn from one place
    expect(src.match(/\blamp\(b, /g)!.length).toBe(1);
  });

  it('no as-built lamp is removed, dimmed, shrunk or moved (Q2 "Never"); the strongroom lamp moved 1 m north with its room, warm', () => {
    const live = new LiveBuilder();
    buildLiveS5(live);
    const was = live.lights.lights.filter((l) => isS5Group(l.group));
    expect(was.length).toBe(32);
    for (const l of was) {
      const strong = l.x === -43 && l.z === 40.5;
      const want = strong ? { x: -43, y: 3.4, z: 41.5 } : l;
      const now = s5Lights.find((q) => same(q, want));
      expect(now, `as-built lamp (${l.x}, ${l.y}, ${l.z})`).toBeTruthy();
      expect(now!.radius, `r (${l.x}, ${l.z})`).toBeGreaterThanOrEqual(l.radius);
      expect(now!.intensity, `i (${l.x}, ${l.z})`).toBeGreaterThanOrEqual(l.intensity);
      expect(now!.group).toBe(l.group);
      expect(now!.kind).toBe(l.kind);
      if (strong) expect([...now!.color]).toEqual([1, 0.72, 0.38]);
    }
    // the warm lamps: the strongroom, the audit desk, the reading lamp, the jetty lantern
    for (const q of [S5_LIGHTS.strong[0]!, S5_LIGHTS.audit[0]!, S5_LIGHTS.reading[0]!, S5_LIGHTS.lantern[0]!]) expect(q.color).toEqual([1, 0.72, 0.38]);
  });

  it('the plan\'s additions are built at their points (G14, L3, R4) and every room but the hall\'s alcove and the low roof holds a lit fitting', () => {
    const add: [number, number, number, number, number][] = [
      [-42.5, 1.3, 34.5, 3, S5_GROUPS.ante],
      [-42.2, 6.6, 39.5, 4, S5_GROUPS.arch],
      [-45, 2.5, 62, 6, S5_GROUPS.garden],
      [-36, 4.0, 56, 6, S5_GROUPS.garden],
      [-29, 2.7, 52, 6, S5_GROUPS.van],
      [-50, 10.4, 42, 6, S5_GROUPS.roof],
      [-40, 10.4, 42, 6, S5_GROUPS.roof],
      [-35, 10.6, 37.6, 6, S5_GROUPS.roof],
    ];
    for (const [x, y, z, r, g] of add) {
      const l = s5Lights.find((q) => same(q, { x, y, z }));
      expect(l, `lamp (${x}, ${y}, ${z})`).toBeTruthy();
      expect(l!.radius).toBeCloseTo(lampReach(r), 6);
      expect(l!.group).toBe(g);
    }
    const lit = s5Lights.filter((l) => l.on && l.intensity > 0);
    for (const r of S5_ROOMS) {
      if (r.id === 's5-pass' || r.id === 's5-low') continue;
      expect(lit.some((l) => inRoom(r, l)), `${r.id} has a lit fitting`).toBe(true);
    }
  });

  it('every lit group has a switch or a board but the van (157); 17 switches; each new circuit\'s switch is on nav on its floor within 1.5 m of a door of its room; switching a new circuit off darkens only its room', () => {
    expect(S5_SWITCHES.length).toBe(17);
    const groups = new Set(s5Lights.map((l) => l.group));
    for (const g of groups) {
      if (g === S5_GROUPS.van) continue;
      expect(S5_SWITCHES.some((q) => q.group === g) || S5_BOARDS.some((q) => q.groups.includes(g)), `switch or board for ${g}`).toBe(true);
    }
    expect(S5_SWITCHES.some((q) => q.group === S5_GROUPS.van) || S5_BOARDS.some((q) => q.groups.includes(S5_GROUPS.van))).toBe(false);
    expect(lay.switches!.filter((q) => isS5Group(q.group)).length).toBe(17);
    // the doors of each room, and the back hall's 3.5 m opening onto the screens passage (its east edge at (-33.25, 32))
    const doors = b.anchors.doors.map((d) => ({ y: d.hinge.y, c: doorCentre(d) }));
    for (const { g, room: r } of NEW) {
      const sw = S5_SWITCHES.filter((q) => q.group === g);
      expect(sw.length, `group ${g} switch`).toBe(1);
      const s = sw[0]!;
      expect(nearNav(s.pos.x, s.pos.z, s.pos.y), `group ${g} switch on nav`).toBe(true);
      const d = Math.min(...doors.filter((q) => Math.abs(q.y - s.pos.y) < 0.05 && q.c[0] >= r.minX - 0.3 && q.c[0] <= r.maxX + 0.3 && q.c[1] >= r.minZ - 0.3 && q.c[1] <= r.maxZ + 0.3).map((q) => hyp2(q.c[0] - s.pos.x, q.c[1] - s.pos.z)));
      if (g === S5_GROUPS.back) {
        // recorded (report P2): the brief's point (-33.25, 33.6) stands 1.60 m from the opening's east edge and 2.9 m from
        // the kitchen door; the hall wall-lamp switch below it holds 1.2 m. The lead's to move (0.1 m north of 1.5).
        expect(hyp2(s.pos.x - -33.25, s.pos.z - 32)).toBeCloseTo(1.6, 6);
        continue;
      }
      expect(d, `group ${g} switch ${d.toFixed(2)} m from a door of ${r.id}`).toBeLessThanOrEqual(1.5);
    }
    for (const { g, room: r } of NEW) {
      const mine = s5Lights.filter((l) => l.group === g);
      expect(mine.length, `group ${g} lamps`).toBeGreaterThanOrEqual(1);
      b.lights.setGroup(g, false);
      try {
        const dark = s5Lights.filter((l) => !l.on);
        expect(dark.map((l) => l.id).sort()).toEqual(mine.map((l) => l.id).sort());
        for (const l of dark) expect(inRoom(r, l), `group ${g} lamp (${l.x}, ${l.y}, ${l.z}) in ${r.id}`).toBe(true);
      } finally {
        b.lights.setGroup(g, true);
      }
    }
    // the moved switches: the hall wall lamps in the back hall, the kitchen's by its lobby door
    expect(S5_SWITCHES.filter((q) => q.group === S5_GROUPS.hall).map((q) => [q.pos.x, q.pos.y, q.pos.z])).toEqual([[-33.25, 0, 33.2]]);
    expect(S5_SWITCHES.filter((q) => q.group === S5_GROUPS.kitchen).map((q) => [q.pos.x, q.pos.y, q.pos.z])).toEqual([[-28.6, 0, 32.15]]);
    expect(hyp2(-28.6 - S5_DOORS.lobbyNorth[0], 32.15 - S5_DOORS.lobbyNorth[1])).toBeLessThanOrEqual(1.5);
    for (const s of S5_SWITCHES) expect(nearNav(s.pos.x, s.pos.z, s.pos.y), `switch (${s.pos.x}, ${s.pos.y}, ${s.pos.z}) on nav`).toBe(true);
  });

  it('the house board cuts exactly the anteroom, strongroom, audit and hall wall lamps (83 + 88), window 45; the garden board the uplights, bollards, lantern and lane lamp (84), window 30', () => {
    expect(S5_BOARDS.length).toBe(2);
    const house = lay.boards!.find((q) => q.groups.includes(S5_GROUPS.hall))!;
    expect(house.groups).toEqual([83, 88]);
    expect(house.window).toBe(45);
    expect([house.pos.x, house.pos.y, house.pos.z]).toEqual([-32.15, S5_L1, 35]);
    const garden = lay.boards!.find((q) => q.groups.includes(S5_GROUPS.garden))!;
    expect(garden.groups).toEqual([84]);
    expect(garden.window).toBe(30);
    expect([garden.pos.x, garden.pos.y, garden.pos.z]).toEqual([-32.85, 0, 40]);
    for (const bd of [house, garden]) expect(nearNav(bd.pos.x, bd.pos.z, bd.pos.y), 'board on nav').toBe(true);
    const cut = (gs: readonly number[]) => {
      for (const g of gs) b.lights.setGroup(g, false);
      try {
        return s5Lights.filter((l) => !l.on).map((l) => `${l.x},${l.y},${l.z}`).sort();
      } finally {
        for (const g of gs) b.lights.setGroup(g, true);
      }
    };
    const key = (q: { x: number; y: number; z: number }) => `${q.x},${q.y},${q.z}`;
    expect(cut(house.groups)).toEqual([...S5_LIGHTS.ante, ...S5_LIGHTS.strong, ...S5_LIGHTS.audit, ...S5_LIGHTS.hallWall].map(key).sort());
    expect(cut(garden.groups)).toEqual([...S5_LIGHTS.garden, ...S5_LIGHTS.bollards, ...S5_LIGHTS.lantern, ...S5_LIGHTS.lane].map(key).sort());
  });

  it('dark by reason: no lamp in the light well, the shaft, on the low roof or on the roof west of x -52 behind the chimneys', () => {
    const over = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number) => s5Lights.filter((l) => l.x >= x0 && l.x <= x1 && l.z >= z0 && l.z <= z1 && l.y >= y0 && l.y <= y1);
    expect(over(-50, -46, 34, 38, 0, S5_ROOF).length, 'well').toBe(0);
    expect(over(-40.5, -38.5, 38.5, 40.5, 0, S5_L1).length, 'shaft').toBe(0);
    expect(over(-32, -26, 18, 44, S5_L1, S5_ROOF).length, 'low roof').toBe(0);
    expect(over(-56, -52, 18, 44, S5_ROOF, 20).length, 'roof behind the chimneys').toBe(0);
  });
});
