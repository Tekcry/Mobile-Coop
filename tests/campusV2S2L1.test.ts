/**
 * (campus-greybox S2-G3, `docs/campus-greybox/briefs/S2.md` section 3) Section 2's L1 rooms in the v2 layout, flag on: the
 * kitchen and the project room (C8), the meeting rooms' glass doors (C9), the east wing re-cut (C10: facilities, comms,
 * landing), the sunshade ledge and the facilities window (C12, BA7), the cores' 1.3 m landings (C15, Q3 / Q4 defaults), the
 * door swings, the re-cut L1 RoomDefs (C17, BA2; F3 closed) and the door spacing rules (SS:69-70).
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavSample } from '../src/ai/navGrid';
import { hyp2 } from '../src/core/mathx';
import { readFileSync } from 'node:fs';
import path from 'node:path';
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
/** The door anchor whose plan centre is (x, z) on floor y (the centre `Doors` computes from the hinge). */
const doorAt = (x: number, z: number, y: number) =>
  b.anchors.doors.find((d) => Math.abs(d.hinge.y - y) < 0.01 && hyp2(d.hinge.x + Math.sin(d.yaw) * d.width * 0.5 - x, d.hinge.z + Math.cos(d.yaw) * d.width * 0.5 - z) < 0.05);

const L1 = 4.4;
const rooms = S2.S2_ROOMS;
const room = (id: string) => rooms.find((r) => r.id === id)!;
/** The v2 S2 graph's spaces (`area` [x0, z0, x1, z1]). */
const graph = JSON.parse(readFileSync(path.resolve(__dirname, '../docs/sector-redesign/graph/v2/campusOps-S2.json'), 'utf8')) as { spaces: { id: string; area: [number, number, number, number] }[] };
const area = (id: string): [number, number, number, number] => graph.spaces.find((q) => q.id === id)!.area;
/** The open leaf's far end of a door anchor (its yaw turned by `swing` x the open angle 1.53). */
const leafEnd = (d: { hinge: { x: number; z: number }; yaw: number; swing: number; width: number }): [number, number] => {
  const a = d.yaw + d.swing * 1.53;
  return [d.hinge.x + Math.sin(a) * d.width, d.hinge.z + Math.cos(a) * d.width];
};
const inBox = (r: { minX: number; maxX: number; minZ: number; maxZ: number }, x: number, z: number): boolean => x >= r.minX - 1e-6 && x <= r.maxX + 1e-6 && z >= r.minZ - 1e-6 && z <= r.maxZ + 1e-6;
/** A wall or glass piece whose plan box runs along the line (along x at z = at, or along z at x = at) over [a, e]. */
const lineCovered = (alongX: boolean, at: number, a: number, e: number, y: number): boolean => {
  // plain boxes, quarter turns swapped to plain (glass panes along x are yawed PI / 2)
  const plain = b.boxes.filter((p) => p.collide && Math.abs(p.pitch) < 1e-3).map((p) => (Math.abs(Math.abs(Math.sin(p.yaw)) - 1) < 1e-3 ? { ...p, s: [p.s[2], p.s[1], p.s[0]] as [number, number, number] } : p));
  const pieces = plain.filter((p) => p.c[1] - p.s[1] / 2 < y + 1 && p.c[1] + p.s[1] / 2 > y + 1 && (alongX ? Math.abs(p.c[2] - at) < p.s[2] / 2 + 0.01 : Math.abs(p.c[0] - at) < p.s[0] / 2 + 0.01));
  for (let t = a + 0.05; t < e; t += 0.1) {
    const hit = pieces.some((p) => (alongX ? Math.abs(t - p.c[0]) <= p.s[0] / 2 + 1e-6 : Math.abs(t - p.c[2]) <= p.s[2] / 2 + 1e-6));
    const door = b.anchors.doors.some((d) => Math.abs(d.hinge.y - y) < 0.01 && (alongX ? Math.abs(d.hinge.z - at) < 0.01 && t >= d.hinge.x - 0.01 && t <= d.hinge.x + d.width + 0.01 : Math.abs(d.hinge.x - at) < 0.01 && t >= d.hinge.z - 0.01 && t <= d.hinge.z + d.width + 0.01));
    if (!hit && !door) return false;
  }
  return true;
};

describe('S2-G3 the L1 RoomDefs (C17, BA2)', () => {
  it('the BA2 table: fifteen L1 boxes, floor 4.4..8.4, none overlapping', () => {
    const want: Record<string, [number, number, number, number]> = {
      l1sw: [-44, -30, -30, 6], l1kitchen: [-30, -21, -30, -22.5], l1project: [-21, -7.5, -30, -22.5], l1west: [-30, -26, -22.5, -4], l1south: [-26, -7.5, -22.5, -18.5],
      l1east: [-11.5, -7.5, -18.5, -4], l1north: [-30, -7.5, -4, 6], l1fac: [-7.5, -0.2, -1, 6], l1ne: [-0.2, 4, -1, 6], l1wing: [-7.5, -2.5, -23, -1], l1wingn: [-2.5, 4, -4.5, -1],
      l1wings: [-2.5, 4, -23, -17.5], l1comms: [-2.5, 4, -10.5, -4.5], l1landing: [-2.5, 4, -17.5, -10.5], l1semeet: [-7.5, 4, -30, -23],
    };
    const l1 = rooms.filter((r) => r.minY === L1);
    expect(l1.map((r) => r.id).sort()).toEqual(Object.keys(want).sort());
    for (const r of l1) {
      expect([r.minX, r.maxX, r.minZ, r.maxZ], r.id).toEqual(want[r.id]);
      expect(r.maxY).toBe(8.4);
    }
    for (let i = 0; i < l1.length; i++)
      for (let j = i + 1; j < l1.length; j++) {
        const a = l1[i]!;
        const c = l1[j]!;
        const ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX);
        const oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
        expect(ox > 0.01 && oz > 0.01, `${a.id} overlaps ${c.id}`).toBe(false);
      }
    // the dress tags cover every room
    expect(Object.keys(m.s2Dress.S2_ART_TAGS).sort()).toEqual(rooms.map((r) => r.id).sort());
  });

  it('each room box matches the plan graph area: kitchen, project, facilities, comms, landing, SE meeting room', () => {
    const pairs: [string, string][] = [['l1kitchen', 's2-l1-kitchen'], ['l1project', 's2-l1-project'], ['l1fac', 's2-l1-facilities'], ['l1comms', 's2-l1-comms'], ['l1landing', 's2-l1-landing'], ['l1semeet', 's2-l1-se-meet']];
    for (const [id, sp] of pairs) {
      const r = room(id);
      expect([r.minX, r.minZ, r.maxX, r.maxZ], `${id} = ${sp}`).toEqual(area(sp));
    }
  });

  it('MR1-MR3 are enclosed on their plan graph areas (walls or glass on every inner side, the shell on the outer)', () => {
    // MR1 x -44..-35.5, z -20..-14; MR2 x -44..-34, z 0..6; MR3 x -26..-16, z 0..6
    expect(area('s2-l1-mr1')).toEqual([-44, -20, -35.5, -14]);
    expect(area('s2-l1-mr2')).toEqual([-44, 0, -34, 6]);
    expect(area('s2-l1-mr3')).toEqual([-26, 0, -16, 6]);
    expect(lineCovered(true, -20, -44, -35.5, L1)).toBe(true);
    expect(lineCovered(true, -14, -44, -35.5, L1)).toBe(true);
    expect(lineCovered(false, -35.5, -20, -14, L1)).toBe(true);
    expect(lineCovered(true, 0, -44, -34, L1)).toBe(true);
    expect(lineCovered(false, -34, 0, 6, L1)).toBe(true);
    expect(lineCovered(true, 0, -26, -16, L1)).toBe(true);
    expect(lineCovered(false, -26, 0, 6, L1)).toBe(true);
    expect(lineCovered(false, -16, 0, 6, L1)).toBe(true);
    // the fronts are glass, frosted to the band (1.2), clear above
    for (const [ax, az, bx, bz] of [[-35.5, -20, -35.5, -14], [-44, 0, -34, 0], [-26, 0, -16, 0]] as const) {
      const g = b.boxes.filter((p) => p.glass && Math.abs(p.c[1] - p.s[1] / 2 - L1) < 1e-6 && p.c[0] >= Math.min(ax, bx) - 0.1 && p.c[0] <= Math.max(ax, bx) + 0.1 && p.c[2] >= Math.min(az, bz) - 0.1 && p.c[2] <= Math.max(az, bz) + 0.1);
      expect(g.length, `front ${ax},${az}`).toBeGreaterThan(0);
      expect(g.every((p) => Math.abs(p.s[1] - S2.S2_FROSTED_BAND) < 1e-6)).toBe(true);
    }
  });

  it('class checks (SS:110-127): kitchen 7.5 x 9 break_room, facilities 7 x 7.3 security_room over the 6.0 floor, landing 6.5 x 7 security_room, comms 6 x 6.5 storage', () => {
    // [game min w, min l, max w, max l] per class
    const cls: Record<string, [number, number, number, number]> = { break_room: [7, 8.5, 11, 14], security_room: [5.5, 7, 8.5, 11], storage: [4, 4, 14, 25] };
    const check = (id: string, c: string, floor = 0): void => {
      const r = room(id);
      const w = Math.min(r.maxX - r.minX, r.maxZ - r.minZ);
      const l = Math.max(r.maxX - r.minX, r.maxZ - r.minZ);
      const [w0, l0, w1, l1] = cls[c]!;
      expect(w, `${id} w`).toBeGreaterThanOrEqual(w0);
      expect(l, `${id} l`).toBeGreaterThanOrEqual(l0);
      expect(w, `${id} w`).toBeLessThanOrEqual(w1);
      expect(l, `${id} l`).toBeLessThanOrEqual(l1);
      expect(w, `${id} camera floor`).toBeGreaterThanOrEqual(floor);
    };
    check('l1kitchen', 'break_room');
    check('l1fac', 'security_room', 6.0);
    check('l1landing', 'security_room');
    check('l1comms', 'storage');
    expect([room('l1kitchen').maxX - room('l1kitchen').minX, room('l1kitchen').maxZ - room('l1kitchen').minZ]).toEqual([9, 7.5]);
    expect([room('l1landing').maxX - room('l1landing').minX, room('l1landing').maxZ - room('l1landing').minZ]).toEqual([6.5, 7]);
    expect([room('l1comms').maxX - room('l1comms').minX, room('l1comms').maxZ - room('l1comms').minZ]).toEqual([6.5, 6]);
    // the facilities office's clear size: x -7.4 (the glazed line's face) .. -0.2 (the core wall's face), z -0.9 .. 5.85 (the shell's face)
    expect(-0.2 - -7.4).toBeGreaterThanOrEqual(7.1);
    expect(5.85 - -0.9).toBeCloseTo(6.75);
  });

  it('every walkable L1 nav cell in the footprint lies in an L1 room (F3 closed)', () => {
    const out: string[] = [];
    for (let i = 0; i < nav.walk.length; i++) {
      if (!nav.walk[i] || Math.abs(nav.height[i]! - L1) > 0.05) continue;
      const [x, z] = nav.center(i % nav.cols);
      if (x < -44 || x > 4 || z < -30 || z > 6) continue;
      if (roomAt(rooms, x, z, L1 + 0.1) < 0) out.push(`(${x}, ${z})`);
    }
    expect(out).toEqual([]);
  });
});

describe('S2-G3 doors (C8, C9, C10), swings and spacing', () => {
  const L1_DOORS: [number, number][] = [
    [-30, -26], [-25, -22.5], [-17, -22.5], [-10, -22.5], [-7.5, -27], [-7.5, -21], [-7.5, -3], [-7.5, 3],
    [-40, -14], [-35.5, -17], [-39, 0], [-34, 3], [-21, 0], [-16, 3],
    [-4.5, -23], [-2.5, -16], [-2.5, -7.5], [1, -10.5], [-4, -1],
  ];
  it('every listed L1 door exists, 1.2 x 2.1, on floor 4.4; the old landing / comms doors are gone', () => {
    for (const [x, z] of L1_DOORS) {
      const d = doorAt(x, z, L1)!;
      expect(d, `door (${x}, ${z})`).toBeTruthy();
      expect(d.width).toBeCloseTo(1.2);
      expect(d.height).toBeCloseTo(2.1);
    }
    expect(doorAt(-2, -6.5, L1)).toBeUndefined();
    expect(doorAt(-4, 0, L1)).toBeUndefined();
  });

  it('swings: the wing hall doors (-4, -1), (-2.5, -7.5), (-2.5, -16), (-4.5, -23) and the south ring doors x -25 / -17 / -10 open into their rooms', () => {
    const into: [number, number, string][] = [[-4, -1, 'l1fac'], [-2.5, -7.5, 'l1comms'], [-2.5, -16, 'l1landing'], [-4.5, -23, 'l1semeet'], [-25, -22.5, 'l1kitchen'], [-17, -22.5, 'l1project'], [-10, -22.5, 'l1project']];
    for (const [x, z, id] of into) {
      const d = doorAt(x, z, L1)!;
      const [ex, ez] = leafEnd(d);
      expect(inBox(room(id), ex, ez) && inBox(room(id), (ex + d.hinge.x) / 2, (ez + d.hinge.z) / 2), `door (${x}, ${z}) opens into ${id}: leaf end (${ex.toFixed(2)}, ${ez.toFixed(2)})`).toBe(true);
    }
    // the 5 m hall stays at least 3.8 m clear with the wing doors open (none swings into it)
    for (const [x, z] of [[-4, -1], [-2.5, -7.5], [-2.5, -16], [-4.5, -23]] as const) {
      const [ex, ez] = leafEnd(doorAt(x, z, L1)!);
      expect(inBox(room('l1wing'), ex, ez) && ex > -7.5 + 0.01 && ex < -2.5 - 0.01 && ez > -23 + 0.01 && ez < -1 - 0.01, `door (${x}, ${z})`).toBe(false);
    }
  });

  it('door spacing (SS:69-70): on each wall the door centres are 3.0 m or more apart and 1.5 m or more from a corner (the cores are Q3)', () => {
    // [wall, along x?, line, door centres, corners along the wall]
    const walls: [string, boolean, number, number[], number[]][] = [
      ['x -7.5', false, -7.5, [-27, -21, -3, 3], [-30, -23, -22.5, -1, 0.5, 5.5, 6]],
      ['z -22.5', true, -22.5, [-25, -17, -10], [-30, -21, -7.5]],
      ['x -30 (kitchen)', false, -30, [-26], [-30, -22.5]],
      ['z -14 (MR1)', true, -14, [-40], [-44, -35.5]],
      ['x -35.5 (MR1)', false, -35.5, [-17], [-20, -14]],
      ['z 0 (MR2)', true, 0, [-39], [-44, -34]],
      ['x -34 (MR2)', false, -34, [3], [0, 6]],
      ['z 0 (MR3)', true, 0, [-21], [-26, -16]],
      ['x -16 (MR3)', false, -16, [3], [0, 6]],
      ['x -2.5', false, -2.5, [-16, -7.5], [-17.5, -10.5, -4.5]],
      ['z -10.5', true, -10.5, [1], [-2.5, 4]],
      ['z -1', true, -1, [-4], [-7.5, -0.2]],
      ['z -23', true, -23, [-4.5], [-7.5, -2.5, 4]],
    ];
    for (const [name, , , doors, corners] of walls) {
      for (let i = 0; i < doors.length; i++) for (let j = i + 1; j < doors.length; j++) expect(Math.abs(doors[i]! - doors[j]!), `${name}: ${doors[i]} / ${doors[j]}`).toBeGreaterThanOrEqual(3);
      for (const d of doors) for (const c of corners) expect(Math.abs(d - c), `${name}: door ${d} to corner ${c}`).toBeGreaterThanOrEqual(1.5);
    }
    for (const [name, alongX, at, doors] of walls) for (const c of doors) expect(doorAt(alongX ? c : at, alongX ? at : c, L1), `${name} door ${c}`).toBeTruthy();
  });

  it('Doors.nearest(-7.5, 3, 1.2) is the L1 facilities west door (hinge y 4.4): L1 doors are built before L2 doors', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { Doors } = await import('../src/world/doors');
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const doors = new Doors(scene, b.anchors);
    const d = doors.nearest(-7.5, 3, 1.2)!;
    expect(d).toBeTruthy();
    expect(d.anchor.hinge.y).toBe(L1);
    expect(hyp2(d.cx + 7.5, d.cz - 3)).toBeLessThan(0.05);
    scene.dispose();
    engine.dispose();
  });
});

describe('S2-G3 the east wing (C10), the sunshade and window (C12), the cores (C15)', () => {
  it('the wing walls: x -2.5 (z -17.5..-4.5), z -17.5 / -10.5 / -4.5 (x -2.5..4); the facilities south wall at z -1 shut to the core line; the glazed partition x -7.5 z 0.5..5.5', () => {
    expect(lineCovered(false, -2.5, -17.5, -4.5, L1)).toBe(true);
    for (const z of [-17.5, -10.5, -4.5]) expect(lineCovered(true, z, -2.5, 4 - 0.15, L1), `z ${z}`).toBe(true);
    expect(lineCovered(true, -1, -7.5, -0.2, L1)).toBe(true);
    expect(lineCovered(false, -0.1, -1, 0, L1)).toBe(true);
    expect(lineCovered(false, -7.5, -30, 6, L1)).toBe(true);
    const glass = b.boxes.filter((p) => p.glass && Math.abs(p.c[0] + 7.5) < 0.1 && p.c[2] > 0.5 && p.c[2] < 5.5 && Math.abs(p.c[1] - p.s[1] / 2 - L1) < 1e-6);
    expect(glass.length).toBe(2);
    expect(glass.every((p) => p.glass === 'clear')).toBe(true);
    // the old landing and comms walls are gone (x -2 at L1)
    expect(b.boxes.some((p) => p.collide && Math.abs(p.c[0] + 2) < 1e-6 && Math.abs(p.c[1] - p.s[1] / 2 - L1) < 1e-6 && p.s[0] < 0.25)).toBe(false);
  });

  it('the UPS cabinets: (2.9, -8.3) and (2.9, -5.2) (0.2 off the z -4.5 wall), the panel spot (3.6, -6.5) and #8 stop (2.2, -6.5) clear; switch 56 at (-5.6, 4.4, -1.5)', () => {
    for (const z of [-8.3, -5.2]) expect(solid.some((p) => Math.abs(p.c[0] - 2.9) < 1e-6 && Math.abs(p.c[2] - z) < 1e-6 && Math.abs(p.s[1] - 1.8) < 1e-6 && Math.abs(p.c[1] - p.s[1] / 2 - L1) < 1e-6), `cabinet z ${z}`).toBe(true);
    expect(solid.some((p) => Math.abs(p.c[0] - 2.9) < 1e-6 && Math.abs(p.c[2] + 4.8) < 1e-6 && Math.abs(p.c[1] - p.s[1] / 2 - L1) < 1e-6)).toBe(false);
    for (const [x, z] of [[3.6, -6.5], [2.2, -6.5]] as const) expect(solid.some((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2 && p.c[1] - p.s[1] / 2 < L1 + 1 && p.c[1] + p.s[1] / 2 > L1 + 0.1), `(${x}, ${z})`).toBe(false);
    expect(onNav(2.2, -6.5, L1)).toBe(true);
    const sw = S2.S2_SWITCHES.filter((q) => q.group === S2.S2_GROUPS.l1Cor);
    expect(sw.length).toBe(1);
    expect([sw[0]!.pos.x, sw[0]!.pos.y, sw[0]!.pos.z]).toEqual([-5.6, 4.4, -1.5]);
  });

  it('C12: the steel sunshade x -7..-1, z 6..7.2, top 4.4, 0.2 thick, with a hang ledge on its north edge; the facilities window (BA7) over it in a gap of the north wall', () => {
    const sh = solid.find((p) => Math.abs(p.c[0] + 4) < 1e-6 && Math.abs(p.c[2] - 6.6) < 1e-6 && Math.abs(p.c[1] + p.s[1] / 2 - L1) < 1e-6)!;
    expect(sh).toBeTruthy();
    [6, 0.2, 1.2].forEach((v, k) => expect(sh.s[k]).toBeCloseTo(v, 6));
    const led = b.anchors.ledges.filter((l) => Math.abs(l.top - L1) < 1e-6 && Math.abs(l.a.z - 7.2) < 1e-6 && Math.abs(l.b.z - 7.2) < 1e-6);
    expect(led.length).toBe(1);
    expect(led[0]!.nz).toBeCloseTo(1);
    expect(Math.min(led[0]!.a.x, led[0]!.b.x)).toBeCloseTo(-7);
    expect(Math.max(led[0]!.a.x, led[0]!.b.x)).toBeCloseTo(-1);
    const w = b.anchors.windows.filter((q) => Math.abs(q.c.x + 4) < 1e-6 && Math.abs(q.c.z - 6) < 1e-6);
    expect(w.length).toBe(1);
    expect(w[0]!).toMatchObject({ w: 1.2, h: 1.2, yaw: 0, sillHeight: 5.3, open: true, breakable: true });
    expect(w[0]!.c.y).toBeCloseTo(5.9);
    // the wall has the gap: nothing solid in the window opening (x -4.6..-3.4, y 5.3..6.5) on the z 6 line
    expect(solid.some((p) => Math.abs(p.c[2] - 6) < p.s[2] / 2 && Math.abs(p.c[0] + 4) < p.s[0] / 2 && Math.abs(p.c[1] - 5.9) < p.s[1] / 2)).toBe(false);
    // and the wall stands round it (below the sill and above the head)
    expect(solid.some((p) => Math.abs(p.c[2] - 6) < 1e-6 && Math.abs(p.c[0] + 4) < 1e-6 && p.c[1] + p.s[1] / 2 <= 5.3 + 1e-6 && p.c[1] - p.s[1] / 2 >= L1 - 1e-6)).toBe(true);
  });

  it('C15: the cores near landing is 1.3; the flights G-L1 12 x 0.183 over 3.5 (0.29), L1-L2 and L2-roof 11 x 0.18 / 0.177 (0.32); each door on its 1.3 landing (doors as built, Q3)', () => {
    for (const c of S2.S2_CORES) {
      const fl = S2.coreFlights(c);
      for (const f of fl) expect(f.len).toBeCloseTo(c.z1 - c.z0 - 1.3 - 0.8);
      expect(fl[0]!.steps).toBe(12);
      expect(fl[0]!.rise / fl[0]!.steps).toBeCloseTo(0.183, 3);
      expect(fl[0]!.len / fl[0]!.steps).toBeCloseTo(0.29, 2);
      for (const k of [2, 4]) {
        expect(fl[k]!.steps).toBe(11);
        expect(fl[k]!.len / fl[k]!.steps).toBeCloseTo(0.32, 2);
      }
      expect(fl[2]!.rise / fl[2]!.steps).toBeCloseTo(0.18, 2);
      expect(fl[4]!.rise / fl[4]!.steps).toBeCloseTo(0.177, 3);
      for (const f of fl) expect(f.rise / f.steps, 'NCC riser').toBeLessThanOrEqual(0.19);
    }
    // SW door in the east wall at z -23 (z -23.6..-22.4) on the near landing z -23.7..-22.4; NE door in the south wall at x 1.5
    expect(S2.SW_CORE.door).toEqual({ wall: 'E', c: -23 });
    expect(S2.NE_CORE.door).toEqual({ wall: 'S', c: 1.5 });
    expect(S2.SW_CORE.z1 - 1.3).toBeLessThanOrEqual(-23 - 0.6 + 1e-9);
  });
});

describe('S2-G3 the dressing', () => {
  it('the dress log gains no line (the kitchen counter and the BMS desk boxes are unchanged)', async () => {
    const run = (mm: typeof m, bb: LB, ll: typeof lay): string[] => {
      const ctx = mm.dress.sectionContext(bb, ll, 1, () => []);
      const d = new mm.CampusDresser(bb, ctx, mm.dress.sectionCatalogues(1));
      mm.sections.CAMPUS_PARTS[1]!.dress(d);
      return [...(mm.sections.CAMPUS_PARTS[1] === mm.sections.CAMPUS_V2_PARTS[1] ? mm.s2Dress.S2_DRESS_LOG : mm.live2Dress.S2_DRESS_LOG)];
    };
    const v2log = run(m, b, lay);
    expect(v2log.some((l) => l.startsWith('L1 kitchen counter') || l.startsWith('L1 BMS desk'))).toBe(false);
    const m0 = await loadCampus([]);
    const b0 = new m0.LevelBuilder();
    const live = run(m0, b0, m0.buildCampus(b0, { dress: false }));
    // a line names greybox boxes by index, which moves with every piece added before it: compared without the index
    const norm = (l: string): string => l.replace(/box \d+/g, 'box #');
    const known = new Set(live.map(norm));
    expect(v2log.filter((l) => !known.has(norm(l)))).toEqual([]);
  }, 120_000);
});
