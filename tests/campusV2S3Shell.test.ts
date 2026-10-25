/**
 * (campus-greybox S3 R1) The v2 lab block's shell and ground floor (`docs/campus-greybox/briefs/S3.md` section 4 "R1";
 * pattern `tests/campusS3.test.ts`). With section 3's v2 flag on: the footprint and the G walls on the plan lines, the
 * roller gap, the observation glass, every G door hole 1.2 x 2.1, the G rooms, the yard walls (nothing east of x 64 on the
 * guards' nav), the nav seeds and hide spots, rule 6 (ground boxes 1.9-4.2 high are noLedge). The trench waits on P14.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder } from '../src/world/levelBuilder';
import type { NavBlocker, NavGrid, NavSample } from '../src/ai/navGrid';
import type { RoomDef } from '../src/world/rooms';
import { hyp2 } from '../src/core/mathx';
import type * as KitM from '../src/world/maps/campusV2/s3Kit';
import type * as ShellM from '../src/world/maps/campusV2/s3Shell';
import type * as S3M from '../src/world/maps/campusV2/s3';

type Kit = typeof KitM;
type Shell = typeof ShellM;
type S3 = typeof S3M;

let kit: Kit;
let shell: Shell;
let s3: S3;
/** The whole campus with S3 v2 on (undressed). */
let bAll: LevelBuilder;
/** The shell alone (this lane's pieces only). */
let bS: LevelBuilder;
let allSolid: BoxPiece[];
let shellSolid: BoxPiece[];
let nav: NavGrid;

const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;

/** The collision pieces as axis-aligned boxes (quarter-turn pieces swapped, as in the S3 test). */
function solidOf(b: LevelBuilder): BoxPiece[] {
  const out: BoxPiece[] = [];
  for (const p of b.boxes) {
    if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
    const q = Math.abs(Math.sin(p.yaw));
    if (q < 1e-3) out.push(p);
    else if (Math.abs(q - 1) < 1e-3) out.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
  }
  return out;
}

/** The solid piece holding (x, y, z), if any (`glass` false: panes do not count). */
function pieceAt(ps: readonly BoxPiece[], x: number, y: number, z: number, glass = true): BoxPiece | undefined {
  return ps.find((p) => (glass || !p.glass) && Math.abs(x - p.c[0]) <= p.s[0] / 2 + 1e-6 && Math.abs(y - p.c[1]) <= p.s[1] / 2 + 1e-6 && Math.abs(z - p.c[2]) <= p.s[2] / 2 + 1e-6);
}

/** The stair ramps (R3's flights) as surfaces: (x, z) -> heights. */
function rampAt(x: number, z: number): number[] {
  const out: number[] = [];
  for (const f of s3.S3_FLIGHTS) {
    if (Math.abs(x - f.x) > f.w / 2 || Math.abs(z - f.z) > f.len / 2) continue;
    const t = Math.abs(f.yaw) < 1e-6 ? (z - (f.z - f.len / 2)) / f.len : (f.z + f.len / 2 - z) / f.len;
    out.push(f.y + f.rise * t);
  }
  return out;
}

/** An analytic layered nav grid over a rectangle (`tests/campusS3.test.ts` `analyticNav`, headroom 1.7). */
function analyticNav(NavGridCtor: typeof NavGrid, b: LevelBuilder, solid: BoxPiece[], rect: readonly [number, number, number, number], cell = 0.5): NavGrid {
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
  return new NavGridCtor({
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

const onNav = (x: number, z: number, y = 0): boolean => nav.isWalkable(nav.cellOf(x, z, y)) && Math.abs(nav.heightAt(x, z, y) - y) < 0.6;

beforeAll(async () => {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = [3];
  kit = await import('../src/world/maps/campusV2/s3Kit');
  shell = await import('../src/world/maps/campusV2/s3Shell');
  s3 = await import('../src/world/maps/campusV2/s3');
  const { buildCampus } = await import('../src/world/maps/campusOps');
  const lb = await import('../src/world/levelBuilder');
  const { NavGrid: NavGridCtor } = await import('../src/ai/navGrid');
  bAll = new lb.LevelBuilder();
  buildCampus(bAll, { dress: false });
  bS = new lb.LevelBuilder();
  shell.buildS3Shell(bS);
  allSolid = solidOf(bAll);
  shellSolid = solidOf(bS);
  nav = analyticNav(NavGridCtor, bAll, allSolid, [3, -32, 71, 18]);
}, 120_000);

/** The plan's G wall lines (brief R1 steps 1-7; D:46-55): along x at z (`alongX`) or along z at x, from a0 to a1; `y` a
 *  height where the line is solid end to end (above every door and the roller gap). */
const LINES: readonly { name: string; alongX: boolean; at: number; a0: number; a1: number; y: number }[] = [
  { name: 'shell south z -30', alongX: true, at: -30, a0: 10, a1: 64, y: 3.5 },
  { name: 'shell north z 0', alongX: true, at: 0, a0: 10, a1: 64, y: 3.5 },
  { name: 'shell west x 10', alongX: false, at: 10, a0: -30, a1: 0, y: 3.5 },
  { name: 'shell east x 64', alongX: false, at: 64, a0: -30, a1: 0, y: 3.5 },
  { name: 'hall north wall z -11', alongX: true, at: -11, a0: 10, a1: 52, y: 3.5 },
  { name: 'dock east wall x 30', alongX: false, at: 30, a0: -11, a1: -7, y: 3.5 },
  { name: 'x 52 (hall east, control east, LV west)', alongX: false, at: 52, a0: -30, a1: 0, y: 3.5 },
  { name: 'LV room south z -7', alongX: true, at: -7, a0: 52, a1: 58, y: 3.5 },
  { name: 'riser south z -7', alongX: true, at: -7, a0: 61.5, a1: 64, y: 3.5 },
  { name: 'yard wall z 0', alongX: true, at: 0, a0: 64, a1: 70, y: 3.5 },
  { name: 'yard wall z -30', alongX: true, at: -30, a0: 64, a1: 70, y: 3.5 },
  { name: 'gas cage blast wall x 13.5', alongX: false, at: 13.5, a0: -3.5, a1: -0.15, y: 1.2 },
];

/** The G door holes this lane cuts (the cores' doors are R3's), and C2's far door on L1 in the shell. */
const MY_DOORS = ['c3Near', 'c2Far', 'ctlHall', 'ctlPlant', 'plantHall'] as const;
const ALONG_X: Record<(typeof MY_DOORS)[number], boolean> = { c3Near: true, c2Far: false, ctlHall: true, ctlPlant: false, plantHall: false };

describe('campus v2 S3 shell and G (R1)', () => {
  it('the footprint and the G walls sit on the plan lines (each wall piece centred on its line +-0.15, solid end to end)', () => {
    const walls = shellSolid.filter((p) => !p.glass && (p.color === kit.WALL || p.color === kit.WALL_DARK) && (Math.abs(p.s[0] - kit.T) < 1e-6 || Math.abs(p.s[2] - kit.T) < 1e-6));
    const [sx0, sz0, sx1, sz1] = kit.S3_BOX.screen;
    let onLines = 0;
    for (const p of walls) {
      // the crane bay's board screen is 0.3 thick too: a hall piece, not a wall
      if (Math.abs(p.c[0] - (sx0 + sx1) / 2) < 1e-6 && Math.abs(p.c[2] - (sz0 + sz1) / 2) < 1e-6) continue;
      const thinX = Math.abs(p.s[0] - kit.T) < 1e-6 && p.s[2] > kit.T + 1e-6;
      const line = LINES.find((l) =>
        l.alongX
          ? !thinX && Math.abs(p.c[2] - l.at) <= 0.15 && p.c[0] - p.s[0] / 2 >= l.a0 - 0.15 && p.c[0] + p.s[0] / 2 <= l.a1 + 0.15
          : thinX && Math.abs(p.c[0] - l.at) <= 0.15 && p.c[2] - p.s[2] / 2 >= l.a0 - 0.15 && p.c[2] + p.s[2] / 2 <= l.a1 + 0.15,
      );
      expect(line, `wall piece at ${JSON.stringify(p.c)} size ${JSON.stringify(p.s)} on no plan line`).toBeDefined();
      onLines++;
    }
    expect(onLines).toBeGreaterThan(LINES.length);
    for (const l of LINES) {
      for (let a = l.a0 + 0.2; a <= l.a1 - 0.2; a += 0.25) {
        const [x, z] = l.alongX ? [a, l.at] : [l.at, a];
        expect(pieceAt(shellSolid, x, l.y, z, false), `${l.name} open at ${a} (y ${l.y})`).toBeDefined();
      }
    }
    // the lobby is gone: no wall at x 22 (D:46)
    for (let z = -29.5; z <= -11.5; z += 0.5) expect(pieceAt(shellSolid, 22, 1.0, z), `x 22 at z ${z}`).toBeUndefined();
    // the G walls under L1 stop at its underside 4.3; the hall's east wall and the shell run on up
    expect(pieceAt(shellSolid, 30, 4.25, -9)).toBeDefined();
    expect(pieceAt(shellSolid, 30, 4.35, -9)).toBeUndefined();
    expect(pieceAt(shellSolid, 25, 4.35, -11)).toBeUndefined();
    expect(pieceAt(shellSolid, 52, 8.9, -20)).toBeDefined();
    expect(pieceAt(shellSolid, 52, 4.35, -9)).toBeUndefined();
    // the roof slab 9.0..9.2 over the whole footprint
    const roof = shellSolid.find((p) => p.overhead && Math.abs(bottom(p) - kit.S3_ROOF) < 1e-6 && Math.abs(top(p) - 9.2) < 1e-6)!;
    expect(roof).toBeDefined();
    expect([roof.c[0] - roof.s[0] / 2, roof.c[2] - roof.s[2] / 2, roof.c[0] + roof.s[0] / 2, roof.c[2] + roof.s[2] / 2]).toEqual([10, -30, 64, 0]);
  });

  it('the goods roller door is an open gap 3.0 x 3.0 (x 20..23 on z -11) with the wall over it, no leaf', () => {
    for (let x = 20.1; x <= 22.9; x += 0.2) for (let y = 0.1; y <= 2.9; y += 0.4) expect(pieceAt(shellSolid, x, y, -11), `${x}, ${y}`).toBeUndefined();
    expect(pieceAt(shellSolid, 19.9, 1.5, -11)).toBeDefined();
    expect(pieceAt(shellSolid, 23.1, 1.5, -11)).toBeDefined();
    expect(pieceAt(shellSolid, 21.5, 3.1, -11)).toBeDefined();
    expect(bAll.anchors.doors.some((d) => Math.abs(d.hinge.z + 11) < 0.2 && d.hinge.x > 19 && d.hinge.x < 23 && Math.abs(d.hinge.y) < 0.1)).toBe(false);
  });

  it('the observation glass spans x 34..39 and 44..50 on z -11, 1.0..2.1 high, the wall solid below and above', () => {
    const panes = shellSolid.filter((p) => p.glass && Math.abs(p.c[2] + 11) < 1e-6).map((p) => [p.c[0] - p.s[0] / 2, p.c[0] + p.s[0] / 2, bottom(p), top(p), p.glass] as const);
    expect(panes.length).toBe(2);
    const want = [[34, 39], [44, 50]];
    panes.forEach((g, k) => {
      expect(g[0]).toBeCloseTo(want[k]![0]!, 6);
      expect(g[1]).toBeCloseTo(want[k]![1]!, 6);
      expect(g[2]).toBeCloseTo(1.0, 6);
      expect(g[3]).toBeCloseTo(2.1, 6);
      expect(g[4]).toBe('clear');
    });
    for (const x of [34.2, 36.5, 38.8, 44.2, 47, 49.8]) {
      expect(pieceAt(shellSolid, x, 1.5, -11, false), `${x} open`).toBeUndefined();
      expect(pieceAt(shellSolid, x, 0.5, -11, false), `${x} sill`).toBeDefined();
      expect(pieceAt(shellSolid, x, 2.5, -11, false), `${x} head`).toBeDefined();
    }
  });

  it('every G door hole of this lane (and C2 on L1) is 1.2 x 2.1, with its door anchor (hinge, width, height, swing of brief 3.2)', () => {
    for (const id of MY_DOORS) {
      const [cx, cz, y] = kit.S3_DOORS[id];
      const ax = ALONG_X[id];
      const at = (a: number, h: number): [number, number, number] => (ax ? [cx + a, y + h, cz] : [cx, y + h, cz + a]);
      for (let a = -0.55; a <= 0.55; a += 0.11) for (let h = 0.05; h <= 2.05; h += 0.25) expect(pieceAt(shellSolid, ...at(a, h)), `${id} hole at ${a}, ${h}`).toBeUndefined();
      expect(pieceAt(shellSolid, ...at(-0.65, 0.5)), `${id} jamb -`).toBeDefined();
      expect(pieceAt(shellSolid, ...at(0.65, 0.5)), `${id} jamb +`).toBeDefined();
      expect(pieceAt(shellSolid, ...at(0, 2.15)), `${id} head`).toBeDefined();
      const d = bS.anchors.doors.find((q) => hyp2(q.hinge.x + Math.sin(q.yaw) * 0.6 - cx, q.hinge.z + Math.cos(q.yaw) * 0.6 - cz) < 0.01 && Math.abs(q.hinge.y - y) < 0.01);
      expect(d, id).toBeDefined();
      expect(d!.width).toBe(1.2);
      expect(d!.height).toBe(2.1);
      expect(d!.swing).toBe(kit.S3_DOOR_SWING[id]);
      expect(d!.locked).toBe(false);
    }
    // the LV room and the riser are sealed: no door on their walls (D:53)
    for (const d of bS.anchors.doors) {
      const c: [number, number] = [d.hinge.x + Math.sin(d.yaw) * 0.6, d.hinge.z + Math.cos(d.yaw) * 0.6];
      const inLv = c[0] >= 51.8 && c[0] <= 58.2 && c[1] >= -7.2 && c[1] <= 0;
      const inRiser = c[0] >= 61.3 && c[0] <= 64.2 && c[1] >= -7.2 && c[1] <= 0;
      expect(inLv || inRiser, `door at ${c}`).toBe(false);
    }
  });

  it('the G rooms: the graph ids, maxY 4.4 under L1, no two S3 rooms overlap (storeys apart), none with a squad', () => {
    const g = shell.S3_ROOMS_G;
    expect(g.map((r) => r.id)).toEqual(['s3-hall', 's3-hall-aisle', 's3-dock', 's3-control', 's3-plant']);
    expect(g.find((r) => r.id === 's3-hall')!.maxY).toBeUndefined();
    for (const r of g) if (r.id !== 's3-hall') expect(r.maxY, r.id).toBe(4.4);
    expect(g.find((r) => r.id === 's3-hall-aisle')!.name).toBe(g.find((r) => r.id === 's3-hall')!.name);
    const rooms: RoomDef[] = s3.S3_ROOMS;
    for (const r of g) expect(rooms).toContain(r);
    for (let i = 0; i < rooms.length; i++) {
      for (let k = i + 1; k < rooms.length; k++) {
        const a = rooms[i]!;
        const c = rooms[k]!;
        const ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX);
        const oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
        const oy = Math.min(a.maxY ?? 99, c.maxY ?? 99) - Math.max(a.minY ?? -99, c.minY ?? -99);
        expect(ox > 0.01 && oz > 0.01 && oy > 0.01, `${a.id} overlaps ${c.id}`).toBe(false);
      }
    }
    for (const r of rooms) expect(r.squad ?? [], r.id).toEqual([]);
    expect(rooms.some((r) => r.id === 's3-yard' || r.id === 's3-lobby')).toBe(false);
  });

  it('the yard walls stand (6 m, noLedge, x 64..70 at z 0 and z -30); nothing east of x 64 is on the guards\' nav from the hall', () => {
    for (const z of [0, -30]) {
      const ps = shellSolid.filter((p) => Math.abs(p.c[2] - z) <= 0.15 && p.c[0] - p.s[0] / 2 >= 64 - 1e-6);
      expect(ps.length, `z ${z}`).toBeGreaterThan(0);
      for (const p of ps) {
        expect(p.noLedge).toBe(true);
        expect(top(p)).toBeCloseTo(6, 6);
      }
      expect(Math.min(...ps.map((p) => p.c[0] - p.s[0] / 2))).toBeCloseTo(64, 6);
      expect(Math.max(...ps.map((p) => p.c[0] + p.s[0] / 2))).toBeCloseTo(70, 6);
    }
    const dist = nav.flowField([[31, -25.5]], undefined, [0]);
    const reached = (x: number, z: number, y = 0): boolean => dist[nav.cellOf(x, z, y)]! < Infinity;
    // G is one connected floor: the roller door, the control-room door and the plant doors
    for (const v of shell.S3_NAV_SEEDS_G) expect(reached(v.x, v.z), `seed ${v.x}, ${v.z}`).toBe(true);
    let yard = 0;
    for (let i = 0; i < dist.length; i++) {
      if (dist[i]! === Infinity) continue;
      const [x, z] = nav.center(i % nav.cols);
      if (x > 64.3 && x < 69.7 && z > -29.7 && z < -0.3) yard++;
    }
    expect(yard).toBe(0);
    // and the yard is sealed: from inside it nothing outside x 64..70, z -30..0 is reached (the shell, the perimeter at
    // x 70 and the two yard walls close it)
    const fromYard = nav.flowField([[67, -15]], undefined, [0]);
    expect(fromYard[nav.cellOf(67, -15, 0)]).toBe(0);
    let out = 0;
    for (let i = 0; i < fromYard.length; i++) {
      if (fromYard[i]! === Infinity || nav.cellHeight(i) > 1) continue;
      const [x, z] = nav.center(i % nav.cols);
      if (x < 63.8 || x > 70.2 || z < -30.2 || z > 0.2) out++;
    }
    expect(out).toBe(0);
  });

  it('the G nav seeds and hide spots are on nav; every hide spot is >= 1.5 m from a door on its floor', () => {
    for (const v of shell.S3_NAV_SEEDS_G) expect(onNav(v.x, v.z, v.y), `seed ${v.x}, ${v.z}`).toBe(true);
    for (const v of s3.S3_NAV_SEEDS) expect(onNav(v.x, v.z, v.y), `seed ${v.x}, ${v.y}, ${v.z}`).toBe(true);
    const doors = bAll.anchors.doors.map((d) => ({ x: d.hinge.x + (Math.sin(d.yaw) * d.width) / 2, y: d.hinge.y, z: d.hinge.z + (Math.cos(d.yaw) * d.width) / 2 }));
    for (const h of shell.S3_HIDESPOTS_G) {
      const p = h.pos;
      expect(onNav(p.x, p.z, p.y), `hide ${p.x}, ${p.z}`).toBe(true);
      for (const d of doors) if (Math.abs(d.y - p.y) < 1) expect(hyp2(d.x - p.x, d.z - p.z), `hide ${p.x}, ${p.z} vs door ${d.x}, ${d.z}`).toBeGreaterThanOrEqual(1.5);
    }
    expect(shell.S3_HIDESPOTS_G.length).toBe(5);
  });

  it('rule 6: S3 ground boxes 1.9-4.2 high are noLedge (walls, the blast wall, the racks, the EMC room, the screen)', () => {
    let n = 0;
    for (const p of allSolid) {
      const h = p.s[1];
      const inFoot = p.c[0] >= 10 && p.c[0] <= 70 && p.c[2] >= -30 && p.c[2] <= 0;
      if (h < 1.9 || h > 4.2 || !inFoot || bottom(p) > 0.01) continue;
      expect(p.noLedge, `${JSON.stringify(p.c)} ${JSON.stringify(p.s)}`).toBe(true);
      n++;
    }
    expect(n).toBeGreaterThanOrEqual(6);
    // the kept hall contents (D:56): the chamber 4.4 (CR3's face, not noLedge) with its plant, the EMC room 4.0, the racks 2.2
    const chamber = pieceAt(shellSolid, 33, 2, -18)!;
    expect(chamber.color).toBe(kit.PANEL_WHITE);
    expect(top(chamber)).toBeCloseTo(4.4, 6);
    expect(chamber.noLedge).not.toBe(true);
    expect(top(pieceAt(shellSolid, 45, 2, -20)!)).toBeCloseTo(4.0, 6);
    for (const [x0, z0, x1, z1] of kit.S3_BOX.racks) expect(top(pieceAt(shellSolid, (x0 + x1) / 2, 1, (z0 + z1) / 2)!)).toBeCloseTo(2.2, 6);
    // the loading pad (0.1, noLedge) under the hatch; the dock desk (0.75)
    const pad = pieceAt(shellSolid, 19.5, 0.05, -4.5)!;
    expect(pad.noLedge).toBe(true);
    expect(top(pad)).toBeCloseTo(0.1, 6);
    expect(top(pieceAt(shellSolid, 24.5, 0.3, -2.2)!)).toBeCloseTo(0.75, 6);
  });

  it('the trench is not built yet (P14: the campus ground box under S3 is not split; brief R1 step 8)', () => {
    // when the lead splits the ground, R1's trench lands and this test becomes its clearance check (1.2 x 1.5, off the
    // guards' grid: headroom < 1.7)
    expect(shellSolid.some((p) => bottom(p) < -0.01)).toBe(false);
  });
});
