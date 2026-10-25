/**
 * (campus-greybox S2-G5c, `docs/campus-greybox/briefs/S2.md` section 5c, Q2 "Never"; the room list is the G5c-0 re-cut) Every room
 * lit on its own cuttable circuit, flag on: the rule is recomputed here (which rooms, how many fittings and where, the circuit
 * numbers, the switch beside the main door, the fire stairs' riser circuits) and checked against the built `S2_LIGHTS` /
 * `S2_SWITCHES`; every new circuit has one switch on the nav; cutting a circuit darkens exactly its fittings; the switchgear
 * board still cuts exactly 55 + 56; nothing hangs over the void or in the open roof.
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavSample } from '../src/ai/navGrid';
import { hyp2 } from '../src/core/mathx';
import { roomAt } from '../src/world/rooms';
import type { Flight } from '../src/world/maps/campusV2/s2';


/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const sections = await import('../src/world/maps/campusSections');
  const { buildCampus } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s2 = await import('../src/world/maps/campusV2/s2');
  return { sections, buildCampus, LevelBuilder, s2 };
}

const m = await loadCampus([2]);
const S2 = m.s2;
const b: LB = new m.LevelBuilder();
m.buildCampus(b, { dress: false });

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

const L1 = 4.4;
const L2 = 8.4;
const FR = 12.3;
const rooms = S2.S2_ROOMS;
const roomById = (id: string) => rooms.find((r) => r.id === id)!;
const lamps = S2.S2_LIGHTS;
const regLights = b.lights.lights.filter((l) => l.x > -44.5 && l.x < 4.5 && l.z > -30.5 && l.z < 6.5);
/** The room a point is in (the engine's `roomAt`: the smallest box; y = a fitting's height minus 1.5 as `lightsOut` reads it). */
const roomOf = (x: number, z: number, y: number): string => rooms[roomAt(rooms, x, z, y)]?.id ?? '';
const fitRoom = (l: { x: number; y: number; z: number }): string => roomOf(l.x, l.z, l.y - 1.5);
/** The step 1 exceptions: the balcony strips (lit by 51 / 52) and the open roof (exterior: no fitting hangs there). */
const EXEMPT = new Set(['l1west', 'l1south', 'l1east', 's2-l2-west', 's2-l2-south', 's2-l2-east', 'roof']);
const roomGroup = S2.S2_ROOM_GROUPS;
const coreGroup = S2.S2_CORE_GROUPS;
const NEW_GROUPS = [...Object.values(roomGroup), ...Object.values(coreGroup)];
const fittingsOf = (g: number) => lamps.filter((l) => l.group === g);

/** The rectangle the fittings of a room are laid in (x0, x1, z0, z1): the box, or the free part of it where a core, the lift block or a nested room stands (A-G5c-2). */
const FREE: Record<string, [number, number, number, number]> = {
  post: [-39.2, -30, -30, -20], // the SW core's foot (x -42.2..-39.2) cut off (9.2 x 10: the long axis is z)
  lift: [-41, -30, -12, -4], // the lift block (x -44..-41) cut off
  store: [-44, -30, -4, 6],
  hallne: [-8, -0.2, -4, 6], // the NE core's foot (x -0.2..2.8) cut off
  plant: [-8, 4, -30, -4],
  l1sw: [-32.8, -30, -30, 0], // meeting rooms 1 and 2, the mail-lift shaft's L1 hole (x -34..-32.8) cut off: the strip east of it, z -30..0
  l1project: [-21, -7.5, -30, -22.5],
  l1ne: [-0.2, 4, -1, -0.2], // the NE core (z -0.2..5.8) cut off
  l1wingn: [-2.5, 4, -4.5, -1],
  l1wings: [-2.5, 4, -23, -17.5],
  l1comms: [-2.5, 4, -10.5, -4.5],
  l1semeet: [-7.5, 4, -30, -23],
  's2-l1-mr1': [-44, -35.5, -20, -14],
  's2-l1-mr2': [-44, -34, 0, 6],
  's2-l1-mr3': [-26, -16, 0, 6],
  l2wing: [-7.5, 4, -30, -2.5], // the board room (z -2.5..6) cut off
  's2-l2-exec': [-44, -30, -4, 6],
  's2-l2-offa': [-28.5, -13, -30, -22.5],
  's2-l2-offb': [-13, -7.5, -30, -22.5],
  's2-l2-board': [-7.5, -0.2, -2.5, 6],
  's2-roof-plant': [-20.5, -12, 0, 6],
};
/** The fitting height per room: its floor + 3.5 (G 3.9, L1 7.9, L2 11.9, the roof plant room 15.9: the brief's table). */
const fitY = (id: string): number => {
  const r = roomById(id);
  if (id === 's2-roof-plant') return 15.9;
  return r.minY === undefined ? 3.9 : r.minY === L1 ? 7.9 : 11.9;
};
/** A room's main door (floor y; wall along x at z = at when `alongX`, else along z at x = at; its centre c; the room's side of the wall) and the switch the rule puts by it. */
interface Main { alongX: boolean; at: number; c: number; side: 1 | -1; y: number; hinge?: true; shift?: number }
const MAIN: Record<string, Main | null> = {
  post: { alongX: false, at: -30, c: -27, side: -1, y: 0 },
  lift: { alongX: false, at: -30, c: -8, side: -1, y: 0 },
  store: { alongX: false, at: -30, c: 1, side: -1, y: 0 },
  hallne: { alongX: true, at: -0.1, c: 1.5, side: -1, y: 0 }, // the open NE lobby: the NE core's ground-floor door
  plant: { alongX: false, at: -8, c: -26, side: 1, y: 0 },
  l1sw: { alongX: false, at: -39.3, c: -23, side: 1, y: L1 }, // the open plan: the SW core's L1 door
  l1project: { alongX: true, at: -22.5, c: -17, side: -1, y: L1 },
  l1ne: { alongX: true, at: -0.1, c: 1.5, side: -1, y: L1, hinge: true, shift: 0.2 }, // the away side holds the l1Bal switch 0.3 m off: the hinge side, 0.2 m along the wall off the x -0.1 wall's margin
  l1wingn: null, // the wing hall's north and south ends have no door of their own
  l1wings: null,
  l1comms: { alongX: false, at: -2.5, c: -7.5, side: 1, y: L1 },
  l1semeet: { alongX: true, at: -23, c: -4.5, side: -1, y: L1 },
  's2-l1-mr1': { alongX: true, at: -14, c: -40, side: -1, y: L1 }, // the north door in the solid wall (a switch cannot stand on the glass front)
  's2-l1-mr2': { alongX: false, at: -34, c: 3, side: -1, y: L1 },
  's2-l1-mr3': { alongX: false, at: -16, c: 3, side: -1, y: L1 },
  l2wing: { alongX: true, at: -0.1, c: 1.5, side: -1, y: L2, hinge: true, shift: 0.2 }, // the open wing hall: the NE core's L2 door, hinge side, shifted as l1ne
  's2-l2-exec': { alongX: false, at: -30, c: 1, side: -1, y: L2 },
  's2-l2-offa': { alongX: true, at: -22.5, c: -20, side: -1, y: L2 },
  's2-l2-offb': { alongX: true, at: -22.5, c: -10, side: -1, y: L2 },
  's2-l2-board': { alongX: true, at: -2.5, c: -4, side: 1, y: L2 },
  's2-roof-plant': { alongX: true, at: 0, c: -16, side: 1, y: FR },
};
/** The switch the rule puts by a door: 0.4 m off the wall face (the wall is 0.2 thick), 0.6 m past the opening's edge on the side away from the hinge (the hinge is at the opening's low end). */
function ruleSwitch(d: Main): { x: number; z: number; yaw: number } {
  const along = (d.hinge ? d.c - 1.2 : d.c + 1.2) + (d.shift ?? 0);
  const off = d.at + d.side * 0.5;
  return d.alongX ? { x: along, z: off, yaw: d.side > 0 ? 0 : Math.PI } : { x: off, z: along, yaw: d.side > 0 ? Math.PI / 2 : -Math.PI / 2 };
}
const doorList = b.anchors.doors.map((d) => ({ d, cx: d.hinge.x + Math.sin(d.yaw) * d.width * 0.5, cz: d.hinge.z + Math.cos(d.yaw) * d.width * 0.5 }));
const doorAnchor = (d: Main) => doorList.find((q) => Math.abs(q.d.hinge.y - d.y) < 0.01 && (d.alongX ? Math.abs(q.d.hinge.z - d.at) < 0.01 && Math.abs(q.cx - d.c) < 0.05 : Math.abs(q.d.hinge.x - d.at) < 0.01 && Math.abs(q.cz - d.c) < 0.05));
const inRect = (r: readonly [number, number, number, number], x: number, z: number, m = 0): boolean => x >= r[0] - m && x <= r[1] + m && z >= r[2] - m && z <= r[3] + m;
const VOID: [number, number, number, number] = [S2.S2_VOID.x0, S2.S2_VOID.x1, S2.S2_VOID.z0, S2.S2_VOID.z1];
const SHAFT: [number, number, number, number] = [S2.MAIL_SHAFT.x0, S2.MAIL_SHAFT.x1, S2.MAIL_SHAFT.z0, S2.MAIL_SHAFT.z1];
const coreRect = (c: { x0: number; x1: number; z0: number; z1: number }): [number, number, number, number] => [c.x0, c.x1, c.z0, c.z1];
const coreFootR = (c: Parameters<typeof S2.coreFoot>[0]): [number, number, number, number] => {
  const f = S2.coreFoot(c);
  return [f[0], f[1], f[2], f[3]];
};

describe('S2-G5c which rooms and which circuits (rule steps 1 and 3)', () => {
  it('the rooms the rule lights are recomputed from the as-built lamps (roomAt), in S2_ROOMS order, numbered from 100: the table equals S2_ROOM_GROUPS', () => {
    const prior = lamps.filter((l) => l.group < 100);
    const lit = new Set(prior.map((l) => fitRoom(l)));
    const want = rooms.filter((r) => !EXEMPT.has(r.id) && !lit.has(r.id)).map((r) => r.id);
    expect(want.length).toBe(21);
    expect(Object.keys(roomGroup)).toEqual(want);
    want.forEach((id, i) => expect(roomGroup[id], id).toBe(100 + i));
    expect(coreGroup).toEqual({ sw: 121, ne: 122 });
    // S2's range 100-139 (job PLAN section 2), every number once
    expect(new Set(NEW_GROUPS).size).toBe(NEW_GROUPS.length);
    for (const g of NEW_GROUPS) expect(g >= 100 && g <= 139, `group ${g}`).toBe(true);
    // what the as-built lamps already light (the report's "skipped as already lit"): the foyer, the mail room, the kitchen, the facilities office, the wing, the landing, the open plan north, the L2 gallery and L2 offices
    for (const id of ['foyer', 'mail', 'l1kitchen', 'l1fac', 'l1wing', 'l1landing', 'l1north', 'l2sw', 'l2north']) expect(lit.has(id), id).toBe(true);
    // the rooms the Answer names are all in the table or the exemption (MR1-MR3, exec, offices A / B, the board room, the roof plant room, the strips)
    for (const id of ['s2-l1-mr1', 's2-l1-mr2', 's2-l1-mr3', 's2-l2-exec', 's2-l2-offa', 's2-l2-offb', 's2-l2-board', 's2-roof-plant']) expect(roomGroup[id], id).toBeTruthy();
    expect(EXEMPT.has('roof')).toBe(true);
    expect(roomGroup.roof).toBeUndefined();
  });

  it('every room but the strips and the open roof holds a lit fitting in it (roomAt); the strips hold one too (51 / 52); the roof holds none', () => {
    for (const r of rooms) {
      const inside = regLights.filter((l) => l.on && l.intensity > 0 && l.group !== coreGroup.sw && l.group !== coreGroup.ne && roomOf(l.x, l.z, l.y - 1.5) === r.id);
      // (the cores' roof landing lights hang inside the stair bulkheads, which stand in the roof's box: not the open roof)
      if (r.id === 'roof') expect(inside.length, r.id).toBe(0);
      else expect(inside.length, `${r.id} holds no lit fitting`).toBeGreaterThan(0);
    }
  });

  it('every S2 lamp is on, intensity > 0, destructible, electric and comes from S2_LIGHTS (one block; the registry holds exactly its entries)', () => {
    expect(regLights.length).toBe(lamps.length);
    for (const l of regLights) {
      expect(l.on && l.intensity > 0 && l.destructible && l.electric, `lamp (${l.x}, ${l.y}, ${l.z})`).toBe(true);
      expect(lamps.some((q) => q.x === l.x && q.y === l.y && q.z === l.z && q.group === l.group), `lamp (${l.x}, ${l.y}, ${l.z}) is not in S2_LIGHTS`).toBe(true);
    }
  });
});

describe('S2-G5c the fittings (rule step 2)', () => {
  it('n = ceil(L / 8) fittings per room along the long axis of its free rectangle, evenly spaced on the centre line, at the floor + 3.5, the balcony downlight spec', () => {
    for (const id of Object.keys(roomGroup)) {
      const f = FREE[id]!;
      expect(f, `${id} has a free rectangle`).toBeTruthy();
      const lx = f[1] - f[0];
      const lz = f[3] - f[2];
      const alongX = lx >= lz;
      const L = alongX ? lx : lz;
      const n = Math.ceil(L / 8);
      const got = fittingsOf(roomGroup[id]!);
      expect(got.length, `${id} n`).toBe(n);
      got.forEach((l, k) => {
        const t = (k + 0.5) / n;
        const x = alongX ? f[0] + lx * t : (f[0] + f[1]) / 2;
        const z = alongX ? (f[2] + f[3]) / 2 : f[2] + lz * t;
        expect([l.x, l.z], `${id} fitting ${k}`).toEqual([expect.closeTo(x, 5), expect.closeTo(z, 5)]);
        expect(l.y, id).toBeCloseTo(fitY(id), 5);
        expect([l.r, l.i, l.w, l.colour], id).toEqual([5, 0.8, 0.4, [1, 0.95, 0.88]]);
        expect(l.cone, id).toEqual([0, -1, 0, 1.2]);
        // the free rectangle sits inside the room's box
        const r = roomById(id);
        expect(f[0] >= r.minX - 1e-9 && f[1] <= r.maxX + 1e-9 && f[2] >= r.minZ - 1e-9 && f[3] <= r.maxZ + 1e-9, `${id} free rect in its box`).toBe(true);
      });
    }
  });

  it('every fitting stands in its own room (roomAt), not over the void, the shaft or a core, and inside no collision box', () => {
    for (const id of Object.keys(roomGroup)) {
      for (const l of fittingsOf(roomGroup[id]!)) {
        expect(fitRoom(l), `${id} fitting (${l.x}, ${l.z})`).toBe(id);
        expect(inRect(VOID, l.x, l.z), `${id} fitting over the void`).toBe(false);
        expect(inRect(SHAFT, l.x, l.z, 0.2), `${id} fitting over the shaft`).toBe(false);
        for (const c of S2.S2_CORES) expect(inRect(coreFootR(c), l.x, l.z), `${id} fitting in core ${c.id}`).toBe(false);
        const w = l.w ?? 0.5;
        const hit = solid.find((p) => Math.abs(p.c[0] - l.x) < p.s[0] / 2 + w / 2 && Math.abs(p.c[1] - l.y) < p.s[1] / 2 + 0.05 && Math.abs(p.c[2] - l.z) < p.s[2] / 2 + w / 4);
        expect(hit, `${id} fitting (${l.x}, ${l.y}, ${l.z}) inside a box`).toBeUndefined();
      }
    }
  });

  it('no fitting above 13.2 hangs in the open roof: those above it are in the roof plant room or a core\'s bulkhead; none of the new fittings is over the void', () => {
    for (const l of lamps) {
      if (l.y > 13.2) {
        const inPlant = inRect([S2.ROOF_PLANT.x0, S2.ROOF_PLANT.x1, S2.ROOF_PLANT.z0, S2.ROOF_PLANT.z1], l.x, l.z) && l.y < FR + S2.ROOF_PLANT.h;
        const inCore = S2.S2_CORES.some((c) => inRect(coreRect(c), l.x, l.z)) && l.y < S2.BULKHEAD_TOP;
        expect(inPlant || inCore, `lamp (${l.x}, ${l.y}, ${l.z}) in the open roof`).toBe(true);
      }
      if (l.group >= 100) expect(inRect(VOID, l.x, l.z), `lamp (${l.x}, ${l.z}) over the void`).toBe(false);
    }
  });

  it('the fire stairs (step 4): one fitting per landing (the ground-floor door landing and the six landing slabs) at landing + 2.4, r 4, i 0.7, no cone, w 0.3, on the core\'s own circuit, inside the core', () => {
    for (const c of S2.S2_CORES) {
      const g = coreGroup[c.id]!;
      const got = fittingsOf(g);
      expect(got.length, c.id).toBe(7);
      const dir = c.near === 'N' ? -1 : 1;
      const nearZ = c.near === 'N' ? c.z1 : c.z0;
      const nearMid = nearZ + dir * (S2.NEAR_D / 2);
      const farMid = nearZ + dir * (c.z1 - c.z0 - S2.FAR_D / 2);
      const tops: [number, number][] = [[0, nearMid], [2.2, farMid], [4.4, nearMid], [6.4, farMid], [8.4, nearMid], [10.4, farMid], [12.3, nearMid]];
      got.forEach((l, k) => {
        const [top, z] = tops[k]!;
        expect([l.x, l.z], `${c.id} landing ${k}`).toEqual([expect.closeTo((c.x0 + c.x1) / 2, 5), expect.closeTo(z, 5)]);
        // landing + 2.4 (the roof landing's 14.7 is 14.6: the bulkhead roof's underside is 14.7)
        expect(l.y, `${c.id} landing ${k}`).toBeCloseTo(top === 12.3 ? 14.6 : top + 2.4, 5);
        expect([l.r, l.i, l.w, l.cone], c.id).toEqual([4, 0.7, 0.3, undefined]);
        expect(inRect(coreRect(c), l.x, l.z), `${c.id} fitting ${k} in the core`).toBe(true);
        const w = l.w ?? 0.5;
        const hit = solid.find((p) => Math.abs(p.c[0] - l.x) < p.s[0] / 2 + w / 2 && Math.abs(p.c[1] - l.y) < p.s[1] / 2 + 0.05 && Math.abs(p.c[2] - l.z) < p.s[2] / 2 + w / 4);
        expect(hit, `${c.id} fitting ${k} (${l.x}, ${l.y}, ${l.z}) inside a box`).toBeUndefined();
      });
    }
  });
});

describe('S2-G5c the switches (rule step 3 and 4)', () => {
  /** A walkable nav cell on floor y within r of the switch (the G5a convention: a switch stands 0.4 m off its wall, inside the agent's 0.32 + 0.1 wall margin, so its user stands on the grid beside it). */
  const nearNav = (x: number, z: number, y: number, r = 1.1): boolean => {
    for (let dx = -r; dx <= r; dx += 0.25) for (let dz = -r; dz <= r; dz += 0.25) if (hyp2(dx, dz) <= r && onNav(x + dx, z + dz, y)) return true;
    return false;
  };

  it('every new circuit has exactly one switch; no other switch is on a new circuit', () => {
    for (const g of NEW_GROUPS) expect(S2.S2_SWITCHES.filter((q) => q.group === g).length, `group ${g}`).toBe(1);
    expect(S2.S2_SWITCHES.filter((q) => q.group >= 100).length).toBe(NEW_GROUPS.length);
  });

  it('each room switch is the rule\'s: by the main door, 0.4 m off the wall face, 0.6 m past the opening on the side away from the hinge, facing into the room (the hinge side for the NE lobby / wing hall, see A-G5c-3); the main door exists on that floor', () => {
    for (const [id, main] of Object.entries(MAIN)) {
      const sw = S2.S2_SWITCHES.find((q) => q.group === roomGroup[id])!;
      const r = roomById(id);
      // inside the room, on its floor, facing into it
      expect(roomOf(sw.pos.x, sw.pos.z, sw.pos.y + 0.1), `${id} switch in its room`).toBe(id);
      const fx = sw.pos.x + 0.3 * Math.sin(sw.yaw);
      const fz = sw.pos.z + 0.3 * Math.cos(sw.yaw);
      expect(roomOf(fx, fz, sw.pos.y + 0.1), `${id} switch faces into the room`).toBe(id);
      expect(sw.pos.y, id).toBeCloseTo(main ? main.y : r.minY ?? 0, 5);
      if (main) {
        expect(doorAnchor(main), `${id} main door`).toBeTruthy();
        const want = ruleSwitch(main);
        expect([sw.pos.x, sw.pos.z, sw.yaw], id).toEqual([expect.closeTo(want.x, 5), expect.closeTo(want.z, 5), expect.closeTo(want.yaw, 5)]);
        const d = doorAnchor(main)!;
        expect(hyp2(d.cx - sw.pos.x, d.cz - sw.pos.z), `${id} switch within 1.5 m of its door`).toBeLessThan(1.5);
      }
    }
  });

  it('the door-less hall pieces (l1wingn, l1wings): the switch stands on a wall of the room (0.5 m from its centre line) at its floor', () => {
    const n = S2.S2_SWITCHES.find((q) => q.group === roomGroup.l1wingn)!;
    expect([n.pos.x, n.pos.y, n.pos.z, n.yaw]).toEqual([2.7, L1, -4.0, 0]); // the z -4.5 wall's north face
    const s = S2.S2_SWITCHES.find((q) => q.group === roomGroup.l1wings)!;
    expect([s.pos.x, s.pos.y, s.pos.z, s.yaw]).toEqual([-1.5, L1, -18.0, Math.PI]); // the z -17.5 wall's south face
  });

  it('the fire stairs\' riser switches stand inside each core by its ground-floor door (the hinge side), facing into the core', () => {
    for (const c of S2.S2_CORES) {
      const sw = S2.S2_SWITCHES.find((q) => q.group === coreGroup[c.id])!;
      expect(sw.pos.y, c.id).toBe(0);
      expect(inRect(coreRect(c), sw.pos.x, sw.pos.z), `${c.id} switch inside the core`).toBe(true);
      expect(inRect(coreRect(c), sw.pos.x + 0.3 * Math.sin(sw.yaw), sw.pos.z + 0.3 * Math.cos(sw.yaw)), `${c.id} switch faces into the core`).toBe(true);
      const door: Main = c.door.wall === 'E' ? { alongX: false, at: c.x1 + 0.1, c: c.door.c, side: -1 as const, y: 0, hinge: true as const } : { alongX: true, at: c.z0 - 0.1, c: c.door.c, side: 1 as const, y: 0, hinge: true as const, shift: 0.2 };
      expect(doorAnchor(door), `${c.id} ground door`).toBeTruthy();
      const want = ruleSwitch(door);
      expect([sw.pos.x, sw.pos.z, sw.yaw], c.id).toEqual([expect.closeTo(want.x, 5), expect.closeTo(want.z, 5), expect.closeTo(want.yaw, 5)]);
    }
  });

  it('every new switch stands on the nav grid on its floor (a walkable cell within 1.1 m on that floor, as the G5a switches; the cell under the wall-mounted spot itself is inside the wall margin)', () => {
    for (const q of S2.S2_SWITCHES.filter((s) => s.group >= 100)) {
      expect(nearNav(q.pos.x, q.pos.z, q.pos.y), `switch (${q.pos.x}, ${q.pos.y}, ${q.pos.z}) group ${q.group}`).toBe(true);
      // and the user's spot 1.0 m in front of it (into the room) is a walkable cell
      expect(onNav(q.pos.x + Math.sin(q.yaw), q.pos.z + Math.cos(q.yaw), q.pos.y), `the spot in front of switch group ${q.group}`).toBe(true);
    }
  });

  it('no two switches on a floor are closer than 0.5 m (the NE core door\'s l1Bal / l2Bal switches stay 0.3 m clear of the new ones\' away side)', () => {
    const all = S2.S2_SWITCHES;
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i]!;
        const c = all[j]!;
        if (Math.abs(a.pos.y - c.pos.y) > 0.5) continue;
        expect(hyp2(a.pos.x - c.pos.x, a.pos.z - c.pos.z), `switches ${i} and ${j}`).toBeGreaterThanOrEqual(0.5);
      }
  });
});

describe('S2-G5c the circuits cut', () => {
  it('switching each new group off darkens exactly its own fittings (all in its room, or in its core) and touches no other circuit', () => {
    const reg = b.lights;
    const before = reg.lights.map((l) => l.on);
    for (const g of NEW_GROUPS) {
      try {
        reg.setGroup(g, false);
        const off = reg.lights.filter((l, i) => before[i] && !l.on);
        expect(off.length, `group ${g}`).toBe(fittingsOf(g).length);
        for (const l of off) {
          expect(l.group, `group ${g}`).toBe(g);
          const id = Object.keys(roomGroup).find((k) => roomGroup[k] === g);
          if (id) expect(fitRoom(l), `group ${g}`).toBe(id);
        }
        // the other new rooms' fittings stay lit
        for (const l of reg.lights) if (l.group >= 100 && l.group !== g) expect(l.on, `group ${l.group} while ${g} is cut`).toBe(true);
      } finally {
        reg.setGroup(g, true);
      }
    }
    expect(reg.lights.map((l) => l.on)).toEqual(before);
  });

  it('the switchgear board still cuts exactly groups 55 + 56 (sync-s2-power unchanged): the facilities lamp and the two wing downlights, nothing of the new circuits', () => {
    const sg = S2.S2_BOARDS.find((q) => q.pos.x === 0.3)!;
    expect(sg.groups).toEqual([55, 56]);
    expect(sg.window).toBeUndefined();
    const reg = b.lights;
    const before = reg.lights.map((l) => l.on);
    try {
      for (const g of sg.groups) reg.setGroup(g, false);
      const off = reg.lights.filter((l, i) => before[i] && !l.on).map((l) => [l.x, l.y, l.z]);
      expect(off.sort()).toEqual([[-3.5, 7.9, -16], [-4, 7.9, -2], [-4, 7.9, 3]].sort());
    } finally {
      for (const g of sg.groups) reg.setGroup(g, true);
    }
    expect(reg.lights.map((l) => l.on)).toEqual(before);
    // the reception board is still group 50 only
    expect(S2.S2_BOARDS.find((q) => q.groups.includes(50))!.groups).toEqual([50]);
  });
});
