/**
 * (campus-greybox S3 R3) The v2 lab block's three fire stairs (`docs/campus-greybox/briefs/S3.md` section 4 "R3"): the
 * flights (27 risers of 0.1667, 13 + 14, len 3.4, 1.4 wide), the NCC numbers (SS 6), the core walls and their stair doors,
 * the north and east cores' north walls on the shell's inner face (no 0.2 m slot), the landings and rails, the part-6 nav
 * lips, the north core's lid, the cores' ambient and HUD rooms, the door rule (SS 4) and the three-stairs reach on an
 * analytic nav grid (each core alone joins G and L1). The stairs are built alone (`buildS3Stairs`) on a fresh builder; the
 * L1 floor round the cores is a test scaffold standing in for R2's slab. The dressed S3 page is never built here.
 */
import { describe, expect, it, vi } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { hyp2 } from '../src/core/mathx';
import { roomAt } from '../src/world/rooms';
import { CAMPUS_BOUNDS } from '../src/world/maps/campusOps';
import { S3_BOX, S3_DOOR_SWING, S3_DOORS, S3_L1, S3_ROOF } from '../src/world/maps/campusV2/s3Kit';
import type { S3DoorId } from '../src/world/maps/campusV2/s3Kit';
import {
  buildS3Stairs,
  S3_CORE_GEOMETRY,
  S3_CORES,
  S3_FLIGHTS,
  S3_HALF_TOP,
  S3_NCORE_LID_TOP,
  S3_ROOMS_STAIRS,
  S3_STAIR_AMBIENT,
  S3_STAIR_RISE1,
  S3_STAIR_RISE2,
} from '../src/world/maps/campusV2/s3Stairs';
import type { S3Flight } from '../src/world/maps/campusV2/s3Stairs';

const b = new LevelBuilder();
buildS3Stairs(b);

const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
/** Every collision piece of the stairs is axis-aligned (yaw 0, flat); ramps (pitched) are read from `S3_FLIGHTS`. */
const solid: BoxPiece[] = b.boxes.filter((p) => p.collide && Math.abs(p.pitch) < 1e-3);
const inside = (p: BoxPiece, x: number, y: number, z: number): boolean =>
  Math.abs(x - p.c[0]) < p.s[0] / 2 - 1e-6 && Math.abs(y - p.c[1]) < p.s[1] / 2 - 1e-6 && Math.abs(z - p.c[2]) < p.s[2] / 2 - 1e-6;
const solidAt = (x: number, y: number, z: number): boolean => solid.some((p) => inside(p, x, y, z));

/** The stair ramps as surfaces: (x, z) on a flight -> its height. */
function rampAt(x: number, z: number): number[] {
  const out: number[] = [];
  for (const f of S3_FLIGHTS) {
    if (Math.abs(x - f.x) > f.w / 2 || Math.abs(z - f.z) > f.len / 2) continue;
    // yaw 0 rises toward +z, yaw PI toward -z
    const t = Math.abs(f.yaw) < 1e-6 ? (z - (f.z - f.len / 2)) / f.len : (f.z + f.len / 2 - z) / f.len;
    out.push(f.y + f.rise * t);
  }
  return out;
}

const CORE_BY_ID = Object.fromEntries(S3_CORE_GEOMETRY.map((g) => [g.core.id, g]));

describe('S3 stairs: the flights (R3)', () => {
  it('six flights, two per core, 13 + 14 risers of 4.5 / 27, both 1.4 wide and len 3.4', () => {
    expect(S3_FLIGHTS.length).toBe(6);
    for (const g of S3_CORE_GEOMETRY) {
      const { flight1: f1, flight2: f2 } = g;
      expect(f1.steps, g.core.id).toBe(13);
      expect(f2.steps, g.core.id).toBe(14);
      expect(f1.steps + f2.steps).toBe(27);
      expect(f1.rise).toBeCloseTo((13 * 4.5) / 27, 9);
      expect(f2.rise).toBeCloseTo((14 * 4.5) / 27, 9);
      expect(f1.rise).toBeCloseTo(2.1667, 4);
      expect(f2.rise).toBeCloseTo(2.3333, 4);
      expect(f1.rise + f2.rise).toBeCloseTo(S3_L1, 9);
      expect(f1.y).toBe(0);
      expect(f2.y).toBeCloseTo(S3_STAIR_RISE1, 9);
      expect(f2.y + f2.rise).toBeCloseTo(S3_L1, 9);
      for (const f of [f1, f2]) {
        expect(f.w).toBe(1.4);
        expect(f.len).toBe(3.4);
      }
      expect(f1.yaw).toBe(0);
      expect(f2.yaw).toBeCloseTo(Math.PI, 9);
    }
    expect(S3_STAIR_RISE1 + S3_STAIR_RISE2).toBeCloseTo(S3_L1, 9);
    expect(S3_HALF_TOP).toBeCloseTo(2.1667, 4);
  });

  it('the brief table: flight centres and yaws, landings and the half landing boxes', () => {
    const want = {
      w: { f1: [16.65, -17.75], f2: [14.85, -17.75], half: [14.15, -16.05, 17.35, -14.65], l1: [14.15, -20.85, 17.35, -19.45] },
      n: { f1: [30.85, -3.75], f2: [32.65, -3.75], half: [30.15, -2.05, 33.35, -0.3], l1: [30.15, -6.85, 33.35, -5.45] },
      e: { f1: [58.85, -3.75], f2: [60.65, -3.75], half: [58.15, -2.05, 61.35, -0.3], l1: [58.15, -6.85, 61.35, -5.45] },
    } as const;
    for (const id of ['w', 'n', 'e'] as const) {
      const g = CORE_BY_ID[id]!;
      const w = want[id];
      expect([g.flight1.x, g.flight1.z].map((v) => +v.toFixed(4))).toEqual(w.f1);
      expect([g.flight2.x, g.flight2.z].map((v) => +v.toFixed(4))).toEqual(w.f2);
      expect([...g.halfLanding].map((v) => +v.toFixed(4))).toEqual(w.half);
      expect([...g.l1Landing].map((v) => +v.toFixed(4))).toEqual(w.l1);
      // landings 1.4 at the south end and the run 3.4 in front of it: the clear 6.2 (west) = 1.4 + 3.4 + 1.4
      expect(g.flight1.z - g.flight1.len / 2 - g.l1Landing[3]).toBeCloseTo(0, 9);
      expect(g.l1Landing[3] - g.l1Landing[1]).toBeCloseTo(1.4, 9);
    }
    const wc = CORE_BY_ID.w!;
    expect(wc.halfLanding[3] - wc.halfLanding[1]).toBeCloseTo(1.4, 9);
  });

  it('every flight slope clears the nav (normal.y > 0.65, navBuild.ts:88)', () => {
    for (const f of S3_FLIGHTS) {
      const ny = f.len / hyp2(f.len, f.rise);
      expect(ny, `${f.x},${f.z}`).toBeGreaterThan(0.65);
    }
  });

  it('NCC (SS 6): risers 0.115-0.19, goings 0.24-0.355, 2R + G 0.55-0.70', () => {
    for (const f of S3_FLIGHTS) {
      const r = f.rise / f.steps;
      const g = f.len / f.steps;
      expect(r).toBeGreaterThanOrEqual(0.115);
      expect(r).toBeLessThanOrEqual(0.19);
      expect(g).toBeGreaterThanOrEqual(0.24);
      expect(g).toBeLessThanOrEqual(0.355);
      expect(2 * r + g).toBeGreaterThanOrEqual(0.55);
      expect(2 * r + g).toBeLessThanOrEqual(0.7);
    }
    // P1: the going is 0.262 (13 steps) and 0.243 (14), not the plan's 0.28
    expect(3.4 / 13).toBeCloseTo(0.262, 3);
    expect(3.4 / 14).toBeCloseTo(0.243, 3);
  });

  it('the build emits the ramp collider and the steps of each flight (stairs()): 13 + 14 step boxes and two ramps per core', () => {
    const ramps = b.boxes.filter((p) => p.collide && Math.abs(p.pitch) > 1e-3);
    expect(ramps.length).toBe(6);
    const steps = b.boxes.filter((p) => !p.collide);
    expect(steps.length).toBe(3 * 27);
  });

  it('the spine wall between the flights: 0.4 wide, 0 to 5.4, noLedge, over both runs', () => {
    for (const g of S3_CORE_GEOMETRY) {
      const [x0, z0, x1, z1] = g.spine;
      expect(x1 - x0).toBeCloseTo(0.4, 9);
      expect(z1 - z0).toBeCloseTo(3.4, 9);
      const p = b.boxes.find((q) => q.collide && Math.abs(q.c[0] - (x0 + x1) / 2) < 1e-6 && Math.abs(q.c[2] - (z0 + z1) / 2) < 1e-6 && Math.abs(q.s[1] - 5.4) < 1e-6);
      expect(p, g.core.id).toBeDefined();
      expect(p!.noLedge).toBe(true);
      expect(bottom(p!)).toBeCloseTo(0, 9);
      // it sits exactly between the two flights
      expect(Math.abs(g.flight1.x - g.flight2.x) - 1.4).toBeCloseTo(0.4, 9);
    }
  });
});

describe('S3 stairs: walls, doors, the north wall on the shell (R3)', () => {
  const holeCentre = (id: S3DoorId): { alongX: boolean; at: number; c: number; y: number } => {
    const [x, z, y] = S3_DOORS[id];
    // stair doors on z walls (-7) run along x; the rest on x walls run along z
    const alongX = z === -7;
    return { alongX, at: alongX ? z : x, c: alongX ? x : z, y };
  };

  it('every core is walled on four sides to its top (9.0; the north core 7.5): no gap along the ring but the doors', () => {
    for (const g of S3_CORE_GEOMETRY) {
      const [x0, z0, x1] = g.core.box;
      const zn = g.core.northWallZ;
      const doors = g.core.doors.map(holeCentre);
      const inDoor = (alongX: boolean, at: number, c: number, y: number): boolean => doors.some((d) => d.alongX === alongX && Math.abs(d.at - at) < 1e-6 && Math.abs(c - d.c) < 0.6 + 1e-6 && y > d.y && y < d.y + 2.1);
      const sides: { alongX: boolean; at: number; a0: number; a1: number }[] = [
        { alongX: false, at: x0, a0: z0 - 0.15, a1: zn + 0.15 },
        { alongX: false, at: x1, a0: z0 - 0.15, a1: zn + 0.15 },
        { alongX: true, at: z0, a0: x0 - 0.15, a1: x1 + 0.15 },
        { alongX: true, at: zn, a0: x0 - 0.15, a1: x1 + 0.15 },
      ];
      for (const s of sides) {
        for (let c = s.a0 + 0.037; c < s.a1; c += 0.1) {
          for (let y = 0.13; y < g.core.top; y += 0.2) {
            const open = inDoor(s.alongX, s.at, c, y);
            const px = s.alongX ? c : s.at;
            const pz = s.alongX ? s.at : c;
            expect(solidAt(px, y, pz), `${g.core.id} wall ${s.alongX ? 'z' : 'x'} ${s.at} at ${c.toFixed(2)}, y ${y.toFixed(1)}`).toBe(!open);
          }
        }
      }
      // above the top there is no wall piece of this core (the north core stops at its lid)
      const maxTop = Math.max(...solid.filter((p) => p.c[0] > x0 && p.c[0] < x1 && p.c[2] > z0 - 1 && p.c[2] < zn + 1 && p.s[1] > 1.5).map(top));
      expect(maxTop, g.core.id).toBeCloseTo(g.core.top, 9);
    }
    expect(S3_CORES.find((c) => c.id === 'n')!.top).toBe(S3_NCORE_LID_TOP);
    expect(S3_CORES.find((c) => c.id === 'w')!.top).toBe(S3_ROOF);
    expect(S3_CORES.find((c) => c.id === 'e')!.top).toBe(S3_ROOF);
  });

  it('the stair doors: a 1.2 x 2.1 hole each (lintel solid, 0.7 off the centre solid), one anchor each with the kit swing, hinge at centre - 0.6', () => {
    const ids: S3DoorId[] = ['wStairG', 'wStairL1', 'nStairW', 'nStairE', 'nStairL1', 'eStairG', 'eStairL1', 'staff'];
    expect(S3_CORES.flatMap((c) => [...c.doors]).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      const d = holeCentre(id);
      const px = (c: number): number => (d.alongX ? c : d.at);
      const pz = (c: number): number => (d.alongX ? d.at : c);
      for (const off of [-0.55, 0, 0.55]) for (const y of [d.y + 0.1, d.y + 1.0, d.y + 2.0]) expect(solidAt(px(d.c + off), y, pz(d.c + off)), `${id} open at ${off}, y ${y}`).toBe(false);
      expect(solidAt(px(d.c), d.y + 2.2, pz(d.c)), `${id} lintel`).toBe(true);
      expect(solidAt(px(d.c - 0.7), d.y + 1.0, pz(d.c - 0.7)), `${id} jamb -`).toBe(true);
      expect(solidAt(px(d.c + 0.7), d.y + 1.0, pz(d.c + 0.7)), `${id} jamb +`).toBe(true);
      const hinge = d.alongX ? { x: d.c - 0.6, z: d.at } : { x: d.at, z: d.c - 0.6 };
      const anchors = b.anchors.doors.filter((a) => Math.abs(a.hinge.x - hinge.x) < 1e-6 && Math.abs(a.hinge.z - hinge.z) < 1e-6 && Math.abs(a.hinge.y - d.y) < 1e-6);
      expect(anchors.length, `${id} anchors`).toBe(1);
      expect(anchors[0]!.width).toBe(1.2);
      expect(anchors[0]!.height).toBe(2.1);
      expect(anchors[0]!.swing, `${id} swing`).toBe(S3_DOOR_SWING[id]);
      expect(anchors[0]!.yaw).toBeCloseTo(d.alongX ? Math.PI / 2 : 0, 9);
    }
    expect(b.anchors.doors.length).toBe(ids.length);
  });

  it('every stair door opens into its core (the leaf sweeps the core side, B4)', () => {
    for (const g of S3_CORE_GEOMETRY) {
      const [cx0, cz0, cx1, cz1] = g.clear;
      for (const id of g.core.doors) {
        const d = holeCentre(id);
        const a = b.anchors.doors.find((q) => Math.abs(q.hinge.y - d.y) < 1e-6 && (d.alongX ? Math.abs(q.hinge.z - d.at) < 1e-6 && Math.abs(q.hinge.x - (d.c - 0.6)) < 1e-6 : Math.abs(q.hinge.x - d.at) < 1e-6 && Math.abs(q.hinge.z - (d.c - 0.6)) < 1e-6))!;
        // the open leaf's free end: yaw + swing x PI / 2 (doors.ts:163), 1.2 from the hinge along (sin, cos)
        const open = a.yaw + a.swing * (Math.PI / 2);
        const ex = a.hinge.x + Math.sin(open) * a.width;
        const ez = a.hinge.z + Math.cos(open) * a.width;
        expect(ex >= cx0 - 0.2 && ex <= cx1 + 0.2 && ez >= cz0 - 0.2 && ez <= cz1 + 0.2, `${id} leaf end (${ex.toFixed(2)}, ${ez.toFixed(2)})`).toBe(true);
      }
    }
  });

  it('A-J17-S3-2 (a): no 0.2 m slot behind the north and east cores - their north wall runs to the shell inner face z -0.15', () => {
    for (const id of ['n', 'e'] as const) {
      const g = CORE_BY_ID[id]!;
      const [x0, , x1] = g.core.box;
      expect(g.core.northWallZ).toBeCloseTo(-0.15, 9);
      const north = solid.filter((p) => p.s[1] >= 2 && p.c[0] > x0 && p.c[0] < x1 && Math.abs(p.c[2] - -0.15) < 0.01 && p.s[0] > 1);
      expect(north.length, id).toBeGreaterThan(0);
      // wall faces: inner face -0.3, outer face on the shell's inner face -0.15 or beyond it (0)
      for (const p of north) expect(p.c[2] + p.s[2] / 2, id).toBeGreaterThanOrEqual(-0.15 - 1e-6);
      // no sight / light gap from the core's inside to the next room: the slot band z -0.35..-0.15 is solid at every x from the west to the east wall
      for (let x = x0 - 0.07; x <= x1 + 0.1; x += 0.1) for (const y of [0.5, 2.3, 4.3, 6.3]) for (const z of [-0.29, -0.25, -0.2, -0.16]) expect(solidAt(x, y, z), `${id} slot ${x.toFixed(1)}, ${y}, ${z}`).toBe(true);
    }
  });

  it('the cores keep clear of the room beside them: no piece of a core pokes past its wall line plus half a wall', () => {
    for (const g of S3_CORE_GEOMETRY) {
      const [x0, z0, x1] = g.core.box;
      const zn = g.core.northWallZ;
      for (const p of solid) {
        if (!(p.c[0] > x0 - 0.2 && p.c[0] < x1 + 0.2 && p.c[2] > z0 - 0.2 && p.c[2] < zn + 0.2)) continue;
        expect(p.c[0] - p.s[0] / 2, g.core.id).toBeGreaterThanOrEqual(x0 - 0.15 - 1e-6);
        expect(p.c[0] + p.s[0] / 2, g.core.id).toBeLessThanOrEqual(x1 + 0.15 + 1e-6);
        expect(p.c[2] - p.s[2] / 2, g.core.id).toBeGreaterThanOrEqual(z0 - 0.15 - 1e-6);
        expect(p.c[2] + p.s[2] / 2, g.core.id).toBeLessThanOrEqual(zn + 0.15 + 1e-6);
      }
    }
  });

  it('door rule (SS 4): the floor rises < 0.4 across each door opening and 0.6 either side of its wall; the flat landing behind every door is 1.4 (P2: the west doors, 0.6 off the flight foot; the north core x walls 0.55)', () => {
    const ids = S3_CORES.flatMap((c) => [...c.doors]);
    for (const id of ids) {
      const d = holeCentre(id);
      let rise = 0;
      for (let c = d.c - 0.6; c <= d.c + 0.6 + 1e-9; c += 0.05) {
        for (let t = -0.6; t <= 0.6 + 1e-9; t += 0.05) {
          const x = d.alongX ? c : d.at + t;
          const z = d.alongX ? d.at + t : c;
          for (const h of rampAt(x, z)) if (h - d.y < 2.1) rise = Math.max(rise, h - d.y);
        }
      }
      expect(rise, id).toBeLessThan(0.4);
    }
    // recorded distances from a door's centre to the near flight foot along its wall (x-wall doors; z-wall doors have the 1.4 landing in front)
    const foot = (g: (typeof S3_CORE_GEOMETRY)[number]): number => g.flight1.z - g.flight1.len / 2;
    expect(Math.abs(S3_DOORS.wStairG[1] - foot(CORE_BY_ID.w!))).toBeCloseTo(0.6, 9);
    expect(Math.abs(S3_DOORS.wStairL1[1] - foot(CORE_BY_ID.w!))).toBeCloseTo(0.6, 9);
    expect(Math.abs(S3_DOORS.nStairW[1] - foot(CORE_BY_ID.n!))).toBeCloseTo(0.55, 9);
    expect(Math.abs(S3_DOORS.nStairE[1] - foot(CORE_BY_ID.n!))).toBeCloseTo(0.55, 9);
    expect(Math.abs(S3_DOORS.staff[1] - foot(CORE_BY_ID.e!))).toBeCloseTo(0.55, 9);
    for (const id of ['n', 'e'] as const) {
      const g = CORE_BY_ID[id]!;
      expect(foot(g) - (g.core.box[1] + 0.15)).toBeCloseTo(1.4, 9);
    }
  });
});

describe('S3 stairs: landings, rails, lips, lid, ambient and rooms (R3)', () => {
  it('the L1 landing (top 4.5) and the half landing (top 2.1667) are slabs wall to wall, overhead and noLedge', () => {
    for (const g of S3_CORE_GEOMETRY) {
      for (const [box, tp] of [[g.l1Landing, S3_L1], [g.halfLanding, S3_HALF_TOP]] as const) {
        const [x0, z0, x1, z1] = box;
        const p = solid.find((q) => Math.abs(q.c[0] - (x0 + x1) / 2) < 1e-6 && Math.abs(q.c[2] - (z0 + z1) / 2) < 1e-6 && Math.abs(q.s[0] - (x1 - x0)) < 1e-6 && Math.abs(q.s[2] - (z1 - z0)) < 1e-6 && Math.abs(top(q) - tp) < 1e-6);
        expect(p, `${g.core.id} ${tp}`).toBeDefined();
        expect(p!.overhead).toBe(true);
        expect(p!.noLedge).toBe(true);
        // wall to wall: the slab's edges are the core's inner faces
        expect(x0).toBeCloseTo(g.core.box[0] + 0.15, 9);
        expect(x1).toBeCloseTo(g.core.box[2] - 0.15, 9);
      }
      // the half landing meets the north wall's inner face and the L1 landing the south wall's: no gap to the wall
      expect(g.halfLanding[3]).toBeCloseTo(g.core.northWallZ - 0.15, 9);
      expect(g.l1Landing[1]).toBeCloseTo(g.core.box[1] + 0.15, 9);
    }
  });

  it('rails 1.1 on the L1 landing edge over flight 1 (west 15.95..17.35 at z -19.45; north 30.15..31.55 and east 58.15..59.55 at z -5.45)', () => {
    const want = { w: [15.95, 17.35, -19.45], n: [30.15, 31.55, -5.45], e: [58.15, 59.55, -5.45] } as const;
    for (const id of ['w', 'n', 'e'] as const) {
      const g = CORE_BY_ID[id]!;
      const [x0, x1, z] = want[id];
      expect(g.railX[0]).toBeCloseTo(x0, 9);
      expect(g.railX[1]).toBeCloseTo(x1, 9);
      expect(g.railZ).toBeCloseTo(z, 9);
      const p = solid.find((q) => Math.abs(q.s[1] - 1.1) < 1e-6 && Math.abs(q.c[2] - z) < 1e-6 && Math.abs(q.c[0] - (x0 + x1) / 2) < 1e-6);
      expect(p, id).toBeDefined();
      expect(bottom(p!)).toBeCloseTo(S3_L1, 9);
      expect(p!.s[0]).toBeCloseTo(x1 - x0, 9);
      expect(p!.noLedge).toBe(true);
      // the edge of the landing over flight 1 is the only open side: rail + flight 2 side (the stair itself) + spine close it
      expect(g.flight1.x - g.flight1.w / 2).toBeCloseTo(x0, 9);
      expect(g.flight1.x + g.flight1.w / 2).toBeCloseTo(x1, 9);
    }
  });

  it('the part-6 nav lip at every flight top: 0.2 high, 0.15 deep (the grid puts a cell centre 0.2 from each end), w wide, overhead, noLedge, invisible, top at the flight top', () => {
    for (const f of S3_FLIGHTS) {
      const d = f.len / 2 - 0.075;
      const cz = f.z + Math.cos(f.yaw) * d;
      const cy = f.y + f.rise - 0.1;
      const p = b.boxes.find((q) => q.collide && !q.visible && Math.abs(q.pitch) < 1e-3 && Math.abs(q.c[0] - f.x) < 1e-6 && Math.abs(q.c[1] - cy) < 1e-6 && Math.abs(q.c[2] - cz) < 1e-6);
      expect(p, `lip at ${f.x}, ${f.z}`).toBeDefined();
      expect(p!.s[0]).toBeCloseTo(f.w, 9);
      expect(p!.s[1]).toBeCloseTo(0.2, 9);
      expect(p!.s[2]).toBeCloseTo(0.15, 9);
      expect(p!.overhead).toBe(true);
      expect(p!.noLedge).toBe(true);
      expect(top(p!)).toBeCloseTo(f.y + f.rise, 9);
    }
    expect(b.boxes.filter((q) => q.collide && !q.visible && Math.abs(q.pitch) < 1e-3).length).toBe(6);
  });

  it('the north core has a 7.5 lid (0.1 thick, wall line to the shell), the others none', () => {
    const lid = solid.filter((p) => Math.abs(top(p) - 7.5) < 1e-6 && Math.abs(p.s[1] - 0.1) < 1e-6);
    expect(lid.length).toBe(1);
    const p = lid[0]!;
    expect(p.c[0] - p.s[0] / 2).toBeCloseTo(30, 9);
    expect(p.c[0] + p.s[0] / 2).toBeCloseTo(33.5, 9);
    expect(p.c[2] - p.s[2] / 2).toBeCloseTo(-7, 9);
    expect(p.c[2] + p.s[2] / 2).toBeCloseTo(0, 9);
    expect(p.noLedge).toBe(true);
  });

  it('ambient 0.30 in each core (the north core below its lid), none elsewhere in this build', () => {
    for (const g of S3_CORE_GEOMETRY) {
      const [cx0, cz0, cx1, cz1] = g.clear;
      const mx = (cx0 + cx1) / 2;
      const mz = (cz0 + cz1) / 2;
      expect(b.lights.zoneAt(mx, 1, mz), g.core.id).toBe(S3_STAIR_AMBIENT);
      expect(b.lights.zoneAt(mx, S3_L1 + 1, mz), g.core.id).toBe(S3_STAIR_AMBIENT);
    }
    expect(b.lights.zoneAt(31.5, 8.5, -3)).not.toBe(S3_STAIR_AMBIENT);
    expect(b.lights.zoneAt(59.8, 8.5, -3)).toBe(S3_STAIR_AMBIENT);
    expect(Number.isNaN(b.lights.zoneAt(40, 1, -3))).toBe(true);
  });

  it('HUD rooms s3-wstair / s3-nstair / s3-estair: the core boxes, no squad, no overlap, and the smallest room wins over the hall, dock and control boxes', () => {
    expect(S3_ROOMS_STAIRS.map((r) => r.id)).toEqual(['s3-wstair', 's3-nstair', 's3-estair']);
    for (const r of S3_ROOMS_STAIRS) expect(r.squad ?? []).toEqual([]);
    expect([S3_ROOMS_STAIRS[0]!.minX, S3_ROOMS_STAIRS[0]!.maxX, S3_ROOMS_STAIRS[0]!.minZ, S3_ROOMS_STAIRS[0]!.maxZ]).toEqual([...[S3_BOX.wCore[0], S3_BOX.wCore[2], S3_BOX.wCore[1], S3_BOX.wCore[3]]]);
    for (let i = 0; i < S3_ROOMS_STAIRS.length; i++)
      for (let j = i + 1; j < S3_ROOMS_STAIRS.length; j++) {
        const a = S3_ROOMS_STAIRS[i]!;
        const c = S3_ROOMS_STAIRS[j]!;
        const ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX);
        const oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
        expect(ox > 0.01 && oz > 0.01, `${a.id} overlaps ${c.id}`).toBe(false);
      }
    // R1's G rooms (copied from its box table): the core points read the stair room, not the hall, dock or control room
    const g = [
      { id: 's3-hall', minX: 14, maxX: 52, minZ: -30, maxZ: -11 },
      { id: 's3-dock', minX: 10, maxX: 30, minZ: -11, maxZ: 0, maxY: 4.4 },
      { id: 's3-control', minX: 30, maxX: 52, minZ: -11, maxZ: 0, maxY: 4.4 },
      { id: 's3-plant', minX: 52, maxX: 64, minZ: -30, maxZ: -7, maxY: 4.4 },
    ].map((r) => ({ ...r, name: r.id }));
    const rooms = [...g, ...S3_ROOMS_STAIRS];
    const at = (x: number, y: number, z: number): string | undefined => rooms[roomAt(rooms, x, z, y)]?.id;
    for (const y of [0, 2.2, 4.5, 6.9]) {
      expect(at(15.75, y, -17.75), `west y ${y}`).toBe('s3-wstair');
      expect(at(31.75, y, -3.75), `north y ${y}`).toBe('s3-nstair');
      expect(at(31.75, y, -0.4), `north y ${y} behind the half landing`).toBe('s3-nstair');
      expect(at(59.75, y, -3.75), `east y ${y}`).toBe('s3-estair');
    }
    expect(at(20, 0, -17.75)).toBe('s3-hall');
    expect(at(40, 0, -5)).toBe('s3-control');
    expect(at(25, 0, -5)).toBe('s3-dock');
  });
});

/** An analytic layered nav grid over the stairs (the pattern of `tests/campusS3.test.ts`), with a scaffold L1 floor and optional blocked cores. */
function analyticNav(blockedCores: readonly (readonly [number, number, number, number])[]): NavGrid {
  const cell = 0.5;
  const snap = (v: number, o: number): number => o + Math.floor((v - o) / cell) * cell;
  // the campus's own grid phase (cell centres at x.25 / x.75), as the runtime nav builds it
  const minX = snap(8, CAMPUS_BOUNDS.minX);
  const minZ = snap(-32, CAMPUS_BOUNDS.minZ);
  const maxX = 66;
  const maxZ = 2;
  const sb = new LevelBuilder();
  // the L1 floor round the cores, standing in for R2's slab (x 10..64, z -30..0, 0.2 thick, top 4.5), cut at the core boxes
  const xs = [10, 14, 17.5, 30, 33.5, 58, 61.5, 64];
  const zs = [-30, -21, -14.5, -7, -0.5, 0];
  const cores = S3_CORES.map((c) => c.box);
  for (let i = 0; i + 1 < xs.length; i++)
    for (let k = 0; k + 1 < zs.length; k++) {
      const mx = (xs[i]! + xs[i + 1]!) / 2;
      const mz = (zs[k]! + zs[k + 1]!) / 2;
      if (cores.some((c) => mx > c[0] && mx < c[2] && mz > c[1] && mz < c[3])) continue;
      sb.box(mx, S3_L1 - 0.1, mz, xs[i + 1]! - xs[i]!, 0.2, zs[k + 1]! - zs[k]!, '#888');
    }
  const pieces = [...solid, ...sb.boxes.filter((p) => p.collide)];
  const surf = (x: number, z: number): { h: number; bottom: number }[] => {
    const out: { h: number; bottom: number }[] = [];
    for (const p of pieces) if (Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2) out.push({ h: top(p), bottom: bottom(p) });
    for (const h of rampAt(x, z)) out.push({ h, bottom: h - 0.35 });
    return out.sort((a, q) => q.h - a.h);
  };
  const blockers: NavBlocker[] = pieces.filter((p) => !p.overhead).map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: bottom(p), top: top(p) }));
  for (const [x0, z0, x1, z1] of blockedCores) blockers.push({ cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, hx: (x1 - x0) / 2 + 0.2, hz: (z1 - z0) / 2 + 0.2, yaw: 0, bottom: -1, top: 10 });
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

describe('S3 stairs: headroom and the three-stairs reach (R3)', () => {
  it('headroom under each L1 landing and half landing is >= 1.7 over every point under it (nothing rises under it)', () => {
    for (const g of S3_CORE_GEOMETRY) {
      for (const [box, tp] of [[g.l1Landing, S3_L1], [g.halfLanding, S3_HALF_TOP]] as const) {
        const [x0, z0, x1, z1] = box;
        const under = tp - 0.2;
        let worst = Infinity;
        for (let x = x0 + 0.05; x < x1; x += 0.1)
          for (let z = z0 + 0.05; z < z1; z += 0.1) {
            let floor = 0;
            for (const p of solid) if (top(p) <= under + 1e-6 && Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2) floor = Math.max(floor, top(p));
            for (const h of rampAt(x, z)) if (h <= under + 1e-6) floor = Math.max(floor, h);
            worst = Math.min(worst, under - floor);
          }
        expect(worst, `${g.core.id} under ${tp}`).toBeGreaterThanOrEqual(1.7);
      }
    }
  });

  const open = analyticNav([]);
  const onNav = (nav: NavGrid, x: number, z: number, y: number): boolean => nav.isWalkable(nav.cellOf(x, z, y)) && Math.abs(nav.heightAt(x, z, y) - y) < 0.6;

  it('the landings and the half landings are on the nav at their heights (flight tops and bottoms too)', () => {
    for (const g of S3_CORE_GEOMETRY) {
      const [l0, l1z, l2, l3] = g.l1Landing;
      expect(onNav(open, (l0 + l2) / 2, (l1z + l3) / 2, S3_L1), `${g.core.id} L1 landing`).toBe(true);
      const [h0, h1z, h2, h3] = g.halfLanding;
      expect(onNav(open, (h0 + h2) / 2, (h1z + h3) / 2, S3_HALF_TOP), `${g.core.id} half landing`).toBe(true);
      expect(onNav(open, g.flight1.x, g.l1Landing[3] - 0.1 - 0.5, 0), `${g.core.id} G foot`).toBe(true);
    }
  });

  it('with every core open there is a G <-> L1 path; with all three blocked there is none (the scaffold joins the storeys only by the cores)', () => {
    expect(open.findPath([12, -20], [13, -20.05], 200000, S3_L1, 0)).not.toBeNull();
    const shut = analyticNav(S3_CORES.map((c) => c.box));
    for (const [x, z] of [[13, -20.05], [28.5, -6], [59.7, -8.5]] as const) expect(shut.findPath([12, -20], [x, z], 200000, S3_L1, 0), `shut ${x}, ${z}`).toBeNull();
  });

  const from: [number, number] = [12, -20];
  const targets: Record<'w' | 'n' | 'e', [number, number]> = {
    // a G point just outside each core's ground door: west of wStairG, west of nStairW (dock side), south of eStairG
    w: [13, -20.05],
    n: [28.5, -6],
    e: [59.7, -8.5],
  };
  for (const id of ['w', 'n', 'e'] as const) {
    it(`three-stairs reach: G <-> L1 connects through the ${id === 'w' ? 'west' : id === 'n' ? 'north' : 'east'} core alone (the other two cores blocked), both ways`, () => {
      const others = S3_CORES.filter((c) => c.id !== id).map((c) => c.box);
      const nav = analyticNav(others);
      const [tx, tz] = targets[id];
      const down = nav.findPath(from, [tx, tz], 200000, S3_L1, 0);
      expect(down, `${id}: L1 landing -> G`).not.toBeNull();
      // it passed through the core: a waypoint inside the core box on the half landing's storey
      const box = S3_CORES.find((c) => c.id === id)!.box;
      expect(down!.some((w) => w[0] > box[0] && w[0] < box[2] && w[1] > box[1] && w[1] < box[3]), `${id}: path crosses the core`).toBe(true);
      const up = nav.findPath([tx, tz], from, 200000, 0, S3_L1);
      expect(up, `${id}: G -> L1 landing`).not.toBeNull();
    });
  }
});

describe('S3 stairs: the campus builds with section 3 on (R3)', () => {
  it('flags.campusV2 = [3]: the campus builds (dress false) and carries one anchor per stair door, six flights of ramps and the HUD rooms live in s3Stairs', async () => {
    vi.resetModules();
    const { flags } = await import('../src/core/flags');
    flags.campusV2 = [3];
    const { buildCampus } = await import('../src/world/maps/campusOps');
    const { LevelBuilder: LB } = await import('../src/world/levelBuilder');
    const s3 = await import('../src/world/maps/campusV2/s3');
    const lb = new LB();
    expect(() => buildCampus(lb, { dress: false })).not.toThrow();
    expect(s3.S3_FLIGHTS.length).toBe(6);
    for (const id of S3_CORES.flatMap((c) => [...c.doors])) {
      const d = S3_DOORS[id];
      const alongX = d[1] === -7;
      const hx = alongX ? d[0] - 0.6 : d[0];
      const hz = alongX ? d[1] : d[1] - 0.6;
      const n = lb.anchors.doors.filter((a) => Math.abs(a.hinge.x - hx) < 1e-6 && Math.abs(a.hinge.z - hz) < 1e-6 && Math.abs(a.hinge.y - d[2]) < 1e-6).length;
      expect(n, `${id} anchors in the campus build`).toBe(1);
    }
    const ramps = lb.boxes.filter((p) => p.collide && Math.abs(p.pitch) > 1e-3 && p.c[0] >= 14 && p.c[0] <= 62 && p.c[2] >= -21 && p.c[2] <= 0);
    expect(ramps.length).toBe(6);
  });
});

// type check helper: the flights are plain data
const _typed: readonly S3Flight[] = S3_FLIGHTS;
void _typed;
void S3_STAIR_RISE2;
