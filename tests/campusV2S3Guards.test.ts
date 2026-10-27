/**
 * (campus-greybox S3 R5) Section 3's v2 guards, routes and sector, flag on (`flags.campusV2 = [3]`; brief
 * `docs/campus-greybox/briefs/S3.md` section 4 "R5"). Data first: the 20 guards (kinds, weapons, the live cap, the one posted
 * choke, the #2-#3 pair on one clock, cycles 25-45 s and within 1 s of the table, no dormant guard, takedown spots beside or
 * behind their guard), the sector (start, crate, connector, grab, keypads and intel, reinforcements, `checkSectorCodes`), the
 * parts wiring (R4's devices and boards by reference) and the four routes (start, grab, beams, C3).
 * The nav half (posts, routes, takedown spots and reinforcements on the nav grid, every walked leg, #11's cycle by his nav
 * path, M8 isolation in time, the A99 screen count, `checkSectors` with the desk) needs the lane's geometry: it runs only once
 * the lead has merged r1-r4 into r5 (R1's rooms, R2's L1, R3's flights, R4's devices) and is skipped before ("pending lead
 * merge"). The analytic nav is the live test's raster (`tests/campusS3.test.ts`, copied: a test file is never imported).
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { ENEMIES } from '../src/ai/enemyDefs';
import { PATROL } from '../src/ai/patrol';
import { hyp2, hyp3 } from '../src/core/mathx';
import { CAMERA } from '../src/config/camera';
import { SECTOR, checkSectorCodes, checkSectorGuards, checkSectors, exitZone, guardForTeam, inZone, type SectorGuard } from '../src/game/sectors';
import { SightWorld, guardPoints, isolatedInTime, longestIsolation, CHECK_ISOLATION, CHECK_PATROL_PACE, CHECK_SPOT, distToGuard, type CheckGuard } from '../src/game/sectorCheck';

const PI = Math.PI;

/** Loads the campus modules fresh with `flags.campusV2 = [3]` (the selection is made at load, as on a page). */
async function loadV2S3() {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = [3];
  const sectors = await import('../src/world/maps/campusSectors');
  const sections = await import('../src/world/maps/campusSections');
  const { buildCampus } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s3 = await import('../src/world/maps/campusV2/s3');
  const s3Data = await import('../src/world/maps/campusV2/s3Data');
  const s3Devices = await import('../src/world/maps/campusV2/s3Devices');
  const s3Lights = await import('../src/world/maps/campusV2/s3Lights');
  return { sectors, sections, buildCampus, LevelBuilder, s3, s3Data, s3Devices, s3Lights };
}

const m = await loadV2S3();
const { S3_BOX, S3_DOORS, S3_FLIGHTS, S3_L1, S3_ROOMS } = m.s3;
const S3 = m.sectors.CAMPUS_SECTORS[2]!;
/** The base list (1-2 players: the 20 of the R5 table); coop4's two 3-4 player extras (A8) are appended after it. */
const G = S3.guards.filter((g) => g.minPlayers === undefined);
const TAGS = S3.guards.filter((g) => g.minPlayers !== undefined);
/** Every guard a team of 4 spawns: the nav and screen checks take them all. */
const ALL = S3.guards;
const Y1 = S3_L1;
/** The S3 footprint. */
const FOOT = { x0: 10, x1: 64, z0: -30, z1: 0 };
const inFoot = (x: number, z: number): boolean => x >= FOOT.x0 && x <= FOOT.x1 && z >= FOOT.z0 && z <= FOOT.z1;

/**
 * The lane's geometry is merged into r5 (the lead merges r1-r4 before R5's nav tests, brief section 2): R1's G rooms, R2's L1
 * rooms, R3's six flights and R4's cameras are all present. Until then the nav half below is skipped ("pending lead merge").
 */
const MERGED = S3_FLIGHTS.length === 6 && S3_ROOMS.some((r) => r.id === 's3-hall') && S3_ROOMS.some((r) => r.id === 's3-view') && m.s3Devices.S3_CAMERAS.length > 0;

/** The brief's R5 table, row by row: kind, space, slot (x, y, z), yaw (posts) and the table cycle (s; null = a post). */
const TABLE: readonly { kind: 'officer' | 'grunt'; zone: string; at: readonly [number, number, number]; yaw: number; cycle: number | null }[] = [
  { kind: 'officer', zone: 's3-c2', at: [12.8, Y1, -17], yaw: -0.751, cycle: null },
  { kind: 'officer', zone: 's3-view', at: [32, Y1, -8.6], yaw: PI, cycle: 40 },
  { kind: 'grunt', zone: 's3-view', at: [32, Y1, -9.6], yaw: 0, cycle: 40 },
  { kind: 'grunt', zone: 's3-gown', at: [36.7, Y1, -1.0], yaw: 2.761, cycle: null },
  { kind: 'officer', zone: 's3-view', at: [49.6, Y1, -8.3], yaw: -PI / 2, cycle: null },
  { kind: 'grunt', zone: 's3-hall', at: [28, 0, -23], yaw: 0, cycle: 42.0 },
  { kind: 'grunt', zone: 's3-hall', at: [37, 0, -13], yaw: PI, cycle: 42.0 },
  { kind: 'grunt', zone: 's3-hall', at: [49.4, 0, -20], yaw: PI / 2, cycle: 43.2 },
  // R5-A2: #9 0.5 m off the desk (z -3.1, the table -3), #12's kettle stop 0.5 m off the counter (z -12.7, the table -12.5)
  { kind: 'officer', zone: 's3-dock', at: [24.5, 0, -3.1], yaw: PI, cycle: null },
  { kind: 'grunt', zone: 's3-dock', at: [21.5, 0, -8.5], yaw: PI, cycle: 36.0 },
  { kind: 'officer', zone: 's3-hall', at: [13, 0, -20.05], yaw: 0, cycle: 40 },
  { kind: 'officer', zone: 's3-sec', at: [58, Y1, -15], yaw: PI / 2, cycle: 41.4 },
  { kind: 'officer', zone: 's3-writeup', at: [24.6, Y1, -4.2], yaw: PI, cycle: null },
  { kind: 'grunt', zone: 's3-plant', at: [56, 0, -27], yaw: PI, cycle: 38.0 },
  { kind: 'officer', zone: 's3-east', at: [44, Y1, -9.8], yaw: -PI / 2, cycle: 40.0 },
  { kind: 'grunt', zone: 's3-hall', at: [20, 0, -17], yaw: PI / 2 - 0.87, cycle: 28.0 },
  { kind: 'grunt', zone: 's3-hall', at: [45, 0, -15], yaw: 0, cycle: null },
  { kind: 'grunt', zone: 's3-dock', at: [22.5, 0, -9.6], yaw: PI, cycle: null },
  { kind: 'officer', zone: 's3-control', at: [41, 0, -9.6], yaw: PI, cycle: null },
  { kind: 'officer', zone: 's3-dock', at: [26, 0, -2.2], yaw: -2.06, cycle: 40.0 },
];

/** A guard's patrol cycle (s) on straight legs: the walk at its pace plus the pauses; a timed loop is its master clock's period (the live test's). */
function cycle(g: SectorGuard, legLen: (a: readonly number[], c: readonly number[], y: number) => number = (a, c) => hyp2(c[0]! - a[0]!, c[1]! - a[1]!)): number | null {
  const r = g.route;
  if (!r || r.length < 2) return null;
  if (g.loop) return g.loop.period;
  const speed = ENEMIES[g.kind].walkSpeed * CHECK_PATROL_PACE;
  const y = g.y ?? 0;
  const n = r.length;
  const order: number[] = [];
  if (n < 3) {
    for (let i = 0; i < n; i++) order.push(i);
    for (let i = n - 2; i >= 1; i--) order.push(i);
  } else for (let i = 0; i < n; i++) order.push(i);
  let t = 0;
  for (let k = 0; k < order.length; k++) {
    const idx = order[k]!;
    if (k > 0) t += legLen(r[order[k - 1]!]!, r[idx]!, y) / speed;
    t += g.waits?.[idx] ?? g.wait ?? PATROL.wait;
  }
  return t + legLen(r[order[order.length - 1]!]!, r[order[0]!]!, y) / speed;
}

describe('R5 the 20 guards (brief R5 table, D:167-191)', () => {
  it('twenty guards: kinds as listed, all armed humans (checkSectorGuards), no dogs, no enforcers; 20 + 2 x 3 = 26 <= 32; no gear, no 3-4 player extras', () => {
    expect(G.length).toBe(20);
    expect(G.map((g) => g.kind)).toEqual(TABLE.map((t) => t.kind));
    expect(G.every((g) => !!ENEMIES[g.kind].weapon && !ENEMIES[g.kind].quadruped)).toBe(true);
    expect(checkSectorGuards(S3)).toEqual([]);
    expect(S3.dogs).toBe(0);
    expect(S3.perStage).toBe(2);
    expect(G.length + SECTOR.alarmMax * S3.perStage).toBe(26);
    expect(G.length + SECTOR.alarmMax * S3.perStage).toBeLessThanOrEqual(SECTOR.maxAlive);
    // job BRIEF A27: no section gear tags (J15 PR1 is not on master); coop4's two 3-4 player extras follow the 20 (merge 7)
    expect(S3.gear).toBeUndefined();
    expect(ALL.some((g) => (g as { gear?: string }).gear !== undefined)).toBe(false);
    expect(ALL.slice(0, 20)).toEqual(G);
  });

  it('coop4 A8: two 3-4 player extras appended (index 20 minPlayers 3, index 21 minPlayers 4): 20 / 20 / 21 / 22 spawned; no post, pair, dormant; 25-45 s; spots beside or behind them; >= 7 m from the start', () => {
    expect(ALL.length).toBe(22);
    expect(TAGS.map((g) => g.minPlayers)).toEqual([3, 4]);
    expect([1, 2, 3, 4].map((n) => ALL.filter((g) => guardForTeam(g, n)).length)).toEqual([20, 20, 21, 22]);
    expect(ALL.length + SECTOR.alarmMax * S3.perStage).toBeLessThanOrEqual(SECTOR.maxAlive);
    // tag 3 walks #6's chamber round from the fourth corner (his stops); tag 4 walks the dock's north strip from the gas cage (#10's stops)
    expect(TAGS[0]!.route).toEqual([[37, -23], [28, -23], [28, -13], [37, -13]]);
    expect(TAGS[0]!.waits).toEqual([G[5]!.waits![3], ...G[5]!.waits!.slice(0, 3)]);
    expect(TAGS[1]!.waits).toEqual(G[9]!.waits);
    expect(hyp2(TAGS[1]!.x - G[9]!.route![1]![0], TAGS[1]!.z - G[9]!.route![1]![1])).toBeLessThanOrEqual(1);
    for (const [k, g] of TAGS.entries()) {
      const n = `tag ${k + 3}`;
      expect(g.post === undefined && g.pair === undefined && g.handler === undefined && !g.dormant, n).toBe(true);
      expect((g.reason ?? '').length, n).toBeGreaterThan(30);
      expect(hyp2(g.x - S3.start.x, g.z - S3.start.z), n).toBeGreaterThanOrEqual(7);
      expect(hyp2(g.route![0]![0] - g.x, g.route![0]![1] - g.z), `${n} starts on his route`).toBeLessThan(0.1);
      expect(g.y ?? 0, n).toBe(0);
      const c = cycle(g)!;
      expect(c, `${n} cycle ${c}`).toBeGreaterThanOrEqual(25);
      expect(c, `${n} cycle ${c}`).toBeLessThanOrEqual(45);
      const [sx, sz] = g.takedownSpot;
      const ok = g.route!.some((p, i) => {
        const yaw = g.faces?.[i] ?? g.yaw;
        const d = hyp2(sx - p[0], sz - p[1]);
        return d <= 1.0 + 1e-9 && (d < 1e-9 || (Math.sin(yaw) * (sx - p[0]) + Math.cos(yaw) * (sz - p[1])) / d <= 1e-9);
      });
      expect(ok, `${n} takedown spot (${sx}, ${sz})`).toBe(true);
      expect(inFoot(sx, sz) && inFoot(g.x, g.z), n).toBe(true);
    }
    expect(checkSectorGuards(S3)).toEqual([]);
  });

  it('every slot, yaw and space is the table row; each guard has a role, a reason and a squad (hall 2, dock 3, L1 1, #12 / #14 / #19 4)', () => {
    for (const [i, g] of G.entries()) {
      const t = TABLE[i]!;
      expect([g.x, g.y ?? 0, g.z], `#${i + 1} slot`).toEqual([...t.at]);
      expect(g.yaw, `#${i + 1} yaw`).toBeCloseTo(t.yaw, 9);
      expect(g.zone, `#${i + 1} zone`).toBe(t.zone);
      expect(g.role, `#${i + 1} role`).toBeTruthy();
      expect(g.reason && g.reason.length > 8, `#${i + 1} reason`).toBe(true);
      if (g.route) expect(hyp2(g.route[0]![0] - g.x, g.route[0]![1] - g.z), `#${i + 1} starts on his route`).toBeLessThan(0.1);
      expect([0, Y1], `#${i + 1} storey`).toContain(g.y ?? 0);
    }
    expect(G.map((g) => g.squad)).toEqual([1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 2, 4, 1, 4, 1, 2, 2, 3, 4, 3]);
    // the routes, waits and facings of the table
    const rows: [number, [number, number][], number[] | undefined, number[]][] = [
      [6, [[28, -23], [28, -13], [37, -13], [37, -23]], [0.3, 0.3, 1.5, 1.5], [0, PI / 2, PI, -PI / 2]],
      [7, [[37, -13], [37, -23], [28, -23], [28, -13]], [1.5, 1.5, 0.3, 0.3], [PI, -PI / 2, 0, PI / 2]],
      // R5-A1: the log-desk stop on the desk's south side (the table's (47.5, -11.2) is off the nav grid), racks 24 s
      [8, [[49.4, -20], [47.5, -13.25]], [24, 5], [PI / 2, 0]],
      [10, [[21.5, -8.5], [14.5, -4.5]], [9.85, 9.85], [PI, -0.785]],
      [11, [[13, -20.05], [21.5, -11.6]], [4, 4], [0, PI]],
      [12, [[58, -15], [62.8, -12.7]], [26, 4], [PI / 2, 0]],
      [14, [[56, -27], [56, -12]], [3.85, 3.85], [PI, 0]],
      [15, [[44, -9.8], [58.6, -9.8]], [4, 4.8], [-PI / 2, PI]],
      [16, [[20, -17], [20, -19]], [12, 12], [PI / 2 - 0.87, PI / 2 + 0.87]],
      [20, [[26, -2.2], [24, -0.6]], [28.5, 6], [-2.06, 0]],
      [2, [[32, -8.6], [46, -8.6]], undefined, [PI, PI]],
      [3, [[32, -9.6], [46, -9.6]], undefined, [0, 0]],
    ];
    for (const [n, route, waits, faces] of rows) {
      const g = G[n - 1]!;
      expect(g.route, `#${n} route`).toEqual(route);
      expect(g.waits, `#${n} waits`).toEqual(waits);
      expect(g.faces, `#${n} faces`).toEqual(faces);
    }
  });

  it('one posted choke: #9 at the dock desk, leash 5, guarding c3-door, the C3 door 2.5 m or more behind him; no other post block', () => {
    expect(G.map((g, i) => (g.post ? i + 1 : 0)).filter((n) => n > 0)).toEqual([9]);
    expect(G[8]!.post).toEqual({ leash: 5, guards: 'c3-door' });
    expect(G[8]!.role).toBe('posted');
    const [dx, dz] = [S3_DOORS.c3Near[0], S3_DOORS.c3Near[1]];
    // the door is behind him: he faces south (yaw PI), the door is north
    expect(Math.sin(G[8]!.yaw) * (dx - G[8]!.x) + Math.cos(G[8]!.yaw) * (dz - G[8]!.z)).toBeLessThan(-2.5 + 1e-9);
  });

  it('every cycle is 25-45 s and within 1 s of the table (straight legs; #11 by his nav path in the merged half); the posts are #1, #4, #5, #9, #13, #17, #18, #19', () => {
    const posts: number[] = [];
    for (const [i, g] of G.entries()) {
      const c = cycle(g);
      if (c === null) {
        posts.push(i + 1);
        continue;
      }
      expect(c, `#${i + 1} cycle ${c}`).toBeGreaterThanOrEqual(25);
      expect(c, `#${i + 1} cycle ${c}`).toBeLessThanOrEqual(45);
      // #11 (P4) bends round the west core: the straight line under-reads it; his nav-path cycle is checked below
      if (i !== 10) expect(Math.abs(c - TABLE[i]!.cycle!), `#${i + 1} cycle ${c.toFixed(2)} vs ${TABLE[i]!.cycle}`).toBeLessThanOrEqual(1);
    }
    expect(posts).toEqual([1, 4, 5, 9, 13, 17, 18, 19]);
    expect(TABLE.map((t, i) => (t.cycle === null ? i + 1 : 0)).filter((n) => n > 0)).toEqual(posts);
  });

  it('the viewing-corridor pair (#2, #3): one clock, the slower walker fits every leg, stops of 3-6.2 s, facing each other at the stops', () => {
    expect(G[1]!.pair).toBe(2);
    expect(G[2]!.pair).toBe(1);
    expect(G.filter((g) => g.pair !== undefined).length).toBe(2);
    expect(G[1]!.loop).toEqual({ period: 40, leave: [3.5, 23.5], t0: 0 });
    expect(G[2]!.loop).toEqual(G[1]!.loop);
    for (const k of [1, 2]) {
      const g = G[k]!;
      const lp = g.loop!;
      const speed = ENEMIES[g.kind].walkSpeed;
      const r = g.route!;
      for (let i = 0; i < r.length; i++) {
        const prev = (i + r.length - 1) % r.length;
        const leg = hyp2(r[i]![0] - r[prev]![0], r[i]![1] - r[prev]![1]) / speed;
        const gap = (((lp.leave[i]! - lp.leave[prev]!) % lp.period) + lp.period) % lp.period;
        expect(gap - leg, `#${k + 1} stop ${i}`).toBeGreaterThanOrEqual(3);
        expect(gap - leg, `#${k + 1} stop ${i}`).toBeLessThanOrEqual(6.2);
      }
    }
    // #2 on the north line faces south at #3, #3 on the south line faces north at #2
    expect(G[1]!.z).toBeGreaterThan(G[2]!.z);
  });

  it('no guard is dormant (AS4); every takedown spot is within 1.0 m of the post or a route point and never in front of the guard there', () => {
    expect(G.some((g) => g.dormant)).toBe(false);
    for (const [i, g] of G.entries()) {
      const stops: [number, number, number][] = g.route ? g.route.map((p, k) => [p[0], p[1], g.faces?.[k] ?? g.yaw]) : [[g.x, g.z, g.yaw]];
      const [sx, sz] = g.takedownSpot;
      const ok = stops.some(([x, z, yaw]) => {
        const d = hyp2(sx - x, sz - z);
        // in front = the spot ahead of his facing (a positive component along it)
        return d <= 1.0 + 1e-9 && (d < 1e-9 || (Math.sin(yaw) * (sx - x) + Math.cos(yaw) * (sz - z)) / d <= 1e-9);
      });
      expect(ok, `#${i + 1} takedown spot (${sx}, ${sz})`).toBe(true);
      expect(distToGuard(g, sx, sz), `#${i + 1}`).toBeLessThanOrEqual(CHECK_SPOT);
      expect(inFoot(sx, sz), `#${i + 1} spot in the block`).toBe(true);
      expect(inFoot(g.x, g.z), `#${i + 1} slot in the block`).toBe(true);
      for (const p of g.route ?? []) expect(inFoot(p[0], p[1]), `#${i + 1} route (${p})`).toBe(true);
    }
  });
});

describe('R5 the sector, the parts wiring and the routes (data)', () => {
  it('start, crate and connector as built; the grab at the board shelf on L1 in the store; keypads and intel are R4\'s; reinforcements; checkSectorCodes empty', () => {
    expect(S3.id).toBe('s3');
    expect(S3.start).toEqual({ x: 7, y: 4.4, z: -14, yaw: PI / 2 });
    expect(S3.crate).toEqual({ at: [7, 4.4, -15.3], yaw: 0 });
    expect(S3.connector).toMatchObject({ box: [22, 0, 26, 16], nearAt: [24, 0], farAt: [24, 16], checkpoint: { x: 24, y: 0, z: 8, yaw: 0 } });
    expect(S3.objective).toMatchObject({ kind: 'grab', x: 57.0, y: Y1, z: -3.8, yaw: PI / 2 });
    const [sx0, sz0, sx1, sz1] = S3_BOX.store;
    expect(S3.objective.x > sx0 && S3.objective.x < sx1 && S3.objective.z > sz0 && S3.objective.z < sz1).toBe(true);
    expect(S3.keypads).toBe(m.s3Devices.S3_KEYPADS);
    expect(S3.intel).toBe(m.s3Devices.S3_INTEL);
    expect(S3.reinforce).toEqual([[15, -8], [12, -20.05]]);
    expect(checkSectorCodes(m.sectors.CAMPUS_SECTORS)).toEqual([]);
    // the start is the S2 checkpoint, the connector C3 the S4 start
    expect(S3.start).toEqual(m.sectors.CAMPUS_SECTORS[1]!.connector!.checkpoint);
    expect(m.sectors.CAMPUS_SECTORS[3]!.start).toEqual(S3.connector!.checkpoint);
  });

  it('the section\'s parts read R4\'s devices and boards by reference (cameras, alarms, desks, boards), the v2 parts are selected', () => {
    const parts = m.s3Data.S3_PARTS;
    expect(m.sections.CAMPUS_PARTS[2]).toBe(parts);
    expect(parts.sector).toBe(S3);
    expect(parts.cameras).toBe(m.s3Devices.S3_CAMERAS);
    expect(parts.alarms).toBe(m.s3Devices.S3_ALARMS);
    expect(parts.desks).toBe(m.s3Devices.S3_DESKS);
    expect(parts.boards).toBe(m.s3Lights.S3_BOARDS);
    expect(parts.levels).toEqual({ 's3-l1': Y1 });
  });

  it('four routes (shadow, loud, high, secret): each starts at the start, reaches the grab within the interact reach past las-store, and ends in C3', () => {
    expect(S3.routes.map((r) => r.name)).toEqual(['The south strip and the clean suite', 'The hatch', 'The crane walkway', 'The ceiling void']);
    const exit = exitZone(S3)!;
    for (const r of S3.routes) {
      const first = r.pts[0]!;
      const at = r.pts[r.obj]!;
      const last = r.pts[r.pts.length - 1]!;
      expect(hyp2(first[0] - S3.start.x, first[1] - S3.start.z), r.name).toBeLessThan(0.5);
      expect(hyp3(at[0] - S3.objective.x, (at[2] ?? 0) - S3.objective.y, at[1] - S3.objective.z), r.name).toBeLessThan(1.8);
      expect(inZone(exit, last[0], last[2] ?? 0, last[1]), r.name).toBe(true);
      // every route crosses las-store's line (x 53, the store's partition) into the inner bay to the grab
      const before = r.pts[r.obj - 1]!;
      expect(before[0] < 53 && at[0] > 53, `${r.name} crosses the beams`).toBe(true);
      for (const c of r.climbs ?? []) expect(c >= 0 && c + 1 < r.pts.length, `${r.name} climb ${c}`).toBe(true);
      // the route leaves through the C3 near door
      expect(r.pts.some((p) => hyp2(p[0] - S3_DOORS.c3Near[0], p[1] - S3_DOORS.c3Near[1]) <= 1.05 && (p[2] ?? 0) === 0), r.name).toBe(true);
    }
    expect(new Set(S3.routes.map((r) => JSON.stringify(r.pts))).size).toBe(S3.routes.length);
    // the walkway route takes the ship ladder and the SE caged ladder; the void route its ladder, crawl and drop
    expect(S3.routes[2]!.climbs!.length).toBe(2);
    expect(S3.routes[3]!.climbs!.length).toBe(3);
    expect(S3.routes[0]!.climbs).toBeUndefined();
    expect(S3.routes[1]!.climbs).toBeUndefined();
  });
});

// ---- the nav half: needs the lane's geometry (the lead merges r1-r4 into r5) -----------------------------------------

/** The undressed greybox (built only once the geometry is merged). */
const b: LB = new m.LevelBuilder();
const lay = MERGED ? m.buildCampus(b, { dress: false }) : null;
/** The collision pieces as axis-aligned boxes (quarter-turn walls swapped, as the live test). */
const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;

/** The stair ramps as surfaces: (x, z) on a flight -> its height (yaw 0 rises toward +z, yaw PI toward -z). */
function rampAt(x: number, z: number): number[] {
  const out: number[] = [];
  for (const f of S3_FLIGHTS) {
    if (Math.abs(x - f.x) > f.w / 2 || Math.abs(z - f.z) > f.len / 2) continue;
    const t = Math.abs(f.yaw) < 1e-6 ? (z - (f.z - f.len / 2)) / f.len : (f.z + f.len / 2 - z) / f.len;
    out.push(f.y + f.rise * t);
  }
  return out;
}

/** An analytic layered nav grid over a rectangle (the live test's: blockers, fences, cylinders, the flights as ramps, the ladders as links). */
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
const nav = MERGED ? analyticNav([3, -32, 71, 18]) : null;
const onNav = (x: number, z: number, y = 0): boolean => nav!.isWalkable(nav!.cellOf(x, z, y)) && Math.abs(nav!.heightAt(x, z, y) - y) < 0.6;
const pathLen = (a: readonly number[], c: readonly number[]): number | null => {
  const path = nav!.findPath([a[0]!, a[1]!], [c[0]!, c[1]!], 200000, a[2] ?? 0, c[2] ?? 0);
  if (!path) return null;
  let len = 0;
  let q: [number, number] = [a[0]!, a[1]!];
  for (const w of path) {
    len += hyp2(w[0] - q[0], w[1] - q[1]);
    q = [w[0], w[1]];
  }
  return len;
};

describe.skipIf(!MERGED)('R5 on the merged lane (pending lead merge of r1-r4 into r5)', () => {
  it('every slot, route point and takedown spot is on the nav grid of its storey, and every walked leg has a nav path (the 3-4 player extras too)', () => {
    for (const [i, g] of ALL.entries()) {
      const y = g.y ?? 0;
      expect(onNav(g.x, g.z, y), `#${i + 1} slot (${g.x}, ${y}, ${g.z})`).toBe(true);
      for (const p of g.route ?? []) expect(onNav(p[0], p[1], y), `#${i + 1} route (${p[0]}, ${p[1]})`).toBe(true);
      expect(onNav(g.takedownSpot[0], g.takedownSpot[1], y), `#${i + 1} takedown spot (${g.takedownSpot})`).toBe(true);
      const r = g.route;
      if (!r) continue;
      for (let k = 0; k < r.length; k++) {
        if (r.length === 2 && k === 1) continue;
        const a = r[k]!;
        const c = r[(k + 1) % r.length]!;
        expect(pathLen([a[0], a[1], y], [c[0], c[1], y]), `#${i + 1} leg ${k}`).not.toBeNull();
      }
    }
  });

  it('(s3 join) no guard slot or route point stands in a stair core (s3-wstair / s3-nstair / s3-estair, J1)', () => {
    const cores = S3_ROOMS.filter((r) => ['s3-wstair', 's3-nstair', 's3-estair'].includes(r.id));
    expect(cores.map((r) => r.id)).toEqual(['s3-wstair', 's3-nstair', 's3-estair']);
    const inCore = (x: number, z: number): string | undefined => cores.find((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ)?.id;
    for (const [i, g] of ALL.entries()) {
      expect(inCore(g.x, g.z), `#${i + 1} slot (${g.x}, ${g.z})`).toBeUndefined();
      for (const p of g.route ?? []) expect(inCore(p[0], p[1]), `#${i + 1} route (${p[0]}, ${p[1]})`).toBeUndefined();
    }
  });

  it('#11 (P4): his cycle by the nav path round the west core is 25-45 s and within 1 s of ~40', () => {
    const c = cycle(G[10]!, (a, q, y) => pathLen([a[0]!, a[1]!, y], [q[0]!, q[1]!, y])!);
    expect(c, `#11 nav cycle ${c}`).not.toBeNull();
    expect(Math.abs(c! - 40), `#11 nav cycle ${c!.toFixed(2)}`).toBeLessThanOrEqual(1);
  });

  it('every route point is on the nav grid (but the void crawl) and every walked leg has a nav path (stairs walked; the ladder, crawl and drop legs are `climbs`); reinforcements on nav', () => {
    for (const r of S3.routes) {
      const climbs = r.climbs ?? [];
      r.pts.forEach((p, i) => {
        // a point between two climb legs is the void crawl (headroom 1.5, off the guards' grid)
        if (climbs.includes(i - 1) && climbs.includes(i)) return;
        expect(onNav(p[0], p[1], p[2] ?? 0), `${r.name} point ${i} (${p})`).toBe(true);
      });
      for (let i = 0; i + 1 < r.pts.length; i++) {
        if (climbs.includes(i)) continue;
        const a = r.pts[i]!;
        const c = r.pts[i + 1]!;
        const len = pathLen([a[0], a[1], a[2] ?? 0], [c[0], c[1], c[2] ?? 0]);
        expect(len, `${r.name} leg ${i}: ${a} -> ${c}`).not.toBeNull();
        expect(len!, `${r.name} leg ${i} detour`).toBeLessThanOrEqual(hyp2(c[0] - a[0], c[1] - a[1]) * 2.5 + 8);
      }
    }
    for (const [x, z] of S3.reinforce) expect(onNav(x, z), `reinforce (${x}, ${z})`).toBe(true);
  });

  it('checkSectors passes on the whole campus with the layout\'s security (the desk loops cam-view and cam-dock, operator #12)', () => {
    expect(checkSectors(m.sectors.CAMPUS_SECTORS, undefined, lay!.security)).toEqual([]);
  });

  it('M8: records each guard\'s longest isolated run at its spot; every guard but the recorded overlaps holds 3 s', () => {
    const world = new SightWorld(b.boxes, b.cylinders);
    const timed: CheckGuard[] = G.map((g) => {
      const speed = ENEMIES[g.kind].walkSpeed * (g.loop ? 1 : CHECK_PATROL_PACE);
      return { x: g.x, z: g.z, y: g.y, route: g.route as readonly (readonly [number, number])[] | undefined, wait: g.wait, waits: g.waits, speed, loop: g.loop };
    });
    const rows = G.map((g, i) => ({ n: i + 1, run: longestIsolation(world, timed, i, 15, g.takedownSpot), ok: isolatedInTime(world, timed, i, g.takedownSpot) }));
    console.info(`S3 v2 M8 isolation:\n${rows.map((r) => `#${r.n} ${r.run}s ${r.ok ? 'ok' : 'NOT isolated'}`).join('\n')}`);
    // recorded overlaps (D:193-196; their takedowns come by a lure, the split or the dual takedown, not isolation in time):
    // the corridor pair #2-#3 with #5 at the hatch end; #9 / #18 / #20 in the dock; #6 / #7 at the chamber corners
    const overlaps = [2, 3, 5, 6, 7, 9, 18, 20];
    // recorded for the lead (R5 report, findings): the table's slots leave these with no 3 s alone at their spot in this
    // model (sight by line within 15 m, any facing): #10 (the dock posts #9 and #18 and #20 see the cage corner), #15 (#5's
    // post stands in his beat, P7), #16 (the open hall's west end: #6 / #7 and #11). Moving them is the lead's call (V6)
    const recorded = [10, 15, 16];
    expect(rows.filter((r) => !overlaps.includes(r.n) && !r.ok).map((r) => r.n)).toEqual(recorded);
    expect(CHECK_ISOLATION).toBe(3);
  }, 120_000);

  it('A99: no walkable S3 point at 32 facings sees more than CAMPUS_SCREEN_CAP guards (every guard a team of 4 spawns on its post and route, 86 deg, clear line within 40 m)', () => {
    const near = (p: BoxPiece): boolean => p.c[0] + p.s[0] > FOOT.x0 - 2 && p.c[0] - p.s[0] < FOOT.x1 + 2 && p.c[2] + p.s[2] > FOOT.z0 - 2 && p.c[2] - p.s[2] < FOOT.z1 + 2;
    const world = new SightWorld(b.boxes.filter(near), b.cylinders);
    const HALF_FOV = ((CAMERA.fov / 2) * PI) / 180;
    const YAWS = Array.from({ length: 32 }, (_, k) => (k * PI) / 16);
    const pts = ALL.map((g) => guardPoints({ x: g.x, z: g.z, y: g.y, route: g.route as readonly (readonly [number, number])[] | undefined }).map(([px, py, pz]) => [px, py + 1.2, pz] as const));
    let worst = { n: -1, at: '', who: [] as number[] };
    let samples = 0;
    for (let col = 0; col < nav!.cols; col++) {
      const [x, z] = nav!.center(col);
      if (!inFoot(x, z)) continue;
      for (let l = 0; l < nav!.layers; l++) {
        const i = l * nav!.cols + col;
        if (!nav!.walk[i]) continue;
        const h = nav!.height[i]!;
        if (h > 7) continue;
        samples++;
        const eye = h + 1.6;
        const seen = ALL.map((_, k) => ({
          n: k + 1,
          at: pts[k]!.filter(([px, py, pz]) => hyp2(px - x, pz - z) <= 40 && world.clear(x, eye, z, px, py, pz)).map(([px, , pz]) => Math.atan2(px - x, pz - z)),
        }));
        for (const yaw of YAWS) {
          const who = seen.filter((s) => s.at.some((a) => Math.abs(Math.atan2(Math.sin(a - yaw), Math.cos(a - yaw))) <= HALF_FOV)).map((s) => s.n);
          if (who.length > worst.n) worst = { n: who.length, at: `(${x}, ${h.toFixed(2)}, ${z}) facing ${((yaw * 180) / PI).toFixed(0)}`, who };
        }
      }
    }
    console.info(`S3 v2 A99 worst ${worst.n} at ${worst.at}: #${worst.who.join(', #')} (${samples} points)`);
    expect(samples).toBeGreaterThan(3000);
    expect(worst.n, `worst ${worst.at}: #${worst.who.join(', #')}`).toBeLessThanOrEqual(m.sectors.CAMPUS_SCREEN_CAP);
  }, 600_000);
});
