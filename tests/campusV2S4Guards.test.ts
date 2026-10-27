/**
 * (campus-greybox S4, `docs/campus-greybox/briefs/S4.md` G4.6) Section 4's v2 guards, flag on (`flags.campusV2 = [4]`): the 25 base
 * guards, their cycles, posts, loops, slots, devices on the nav grid, the M8 isolation record, the three routes on the analytic and
 * the runtime nav grids, the armoured bypasses and the #20 twist path. Pure geometry (the undressed `LevelBuilder`); the analytic nav
 * is the live test's raster (`tests/campusS4.test.ts`, copied: a test file is never imported), the guards' grid the runtime one.
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { ENEMIES } from '../src/ai/enemyDefs';
import { PATROL } from '../src/ai/patrol';
import { hyp2, hyp3 } from '../src/core/mathx';
import { SECTOR, checkSectorGuards, checkSectors, exitZone, guardForTeam, inZone, type SectorGuard } from '../src/game/sectors';
import { SightWorld, isolatedInTime, longestIsolation, CHECK_ISOLATION, CHECK_PATROL_PACE, CHECK_SPOT, distToGuard, type CheckGuard } from '../src/game/sectorCheck';
import { runtimeNav } from './helpers/runtimeNav';

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
const { S4_BASKET, S4_DECK, S4_DOORS, S4_FLIGHTS, S4_NOC } = m.s4;
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

/** A flight's ramp height at (x, z) (NaN off it). */
function flightH(f: { cx: number; cz: number; w: number; len: number; rise: number; yaw: number; y0: number }, x: number, z: number): number {
  const dx = x - f.cx;
  const dz = z - f.cz;
  const along = dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw);
  const across = dx * Math.cos(f.yaw) - dz * Math.sin(f.yaw);
  if (Math.abs(across) > f.w / 2 || Math.abs(along) > f.len / 2) return Number.NaN;
  return f.y0 + (f.rise * (along + f.len / 2)) / f.len;
}
const FLIGHTS = [...S4_FLIGHTS];

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

/** The base list (1-2 players: the 25 of the table); coop4's two 3-4 player extras (A8) are appended after it. */
const G = S4.guards.filter((g) => g.minPlayers === undefined);
const TAGS = S4.guards.filter((g) => g.minPlayers !== undefined);
/** Every guard a team of 4 spawns: the nav checks take them all. */
const ALL = S4.guards;
const floorOf = (g: { y?: number }): number => g.y ?? 0;
const pathLen = (a: readonly number[], c: readonly number[]): number | null => {
  const path = nav.findPath([a[0]!, a[1]!], [c[0]!, c[1]!], 200000, a[2] ?? 0, c[2] ?? 0);
  if (!path) return null;
  let len = 0;
  let q: [number, number] = [a[0]!, a[1]!];
  for (const w of path) {
    len += hyp2(w[0] - q[0], w[1] - q[1]);
    q = [w[0], w[1]];
  }
  return len;
};

/** A guard's patrol cycle (s): the walk at its pace plus the pauses; a timed loop is its master clock's period (as `tests/campusS4.test.ts`). */
function cycle(g: SectorGuard): number | null {
  const r = g.route;
  if (!r || r.length < 2) return null;
  if (g.loop) return g.loop.period;
  const speed = ENEMIES[g.kind].walkSpeed * CHECK_PATROL_PACE;
  const n = r.length;
  const order: number[] = [];
  if (n < 3) {
    for (let i = 0; i < n; i++) order.push(i);
    for (let i = n - 2; i >= 1; i--) order.push(i);
  } else for (let i = 0; i < n; i++) order.push(i);
  let t = 0;
  for (let k = 0; k < order.length; k++) {
    const idx = order[k]!;
    if (k > 0) {
      const q = r[order[k - 1]!]!;
      t += hyp2(r[idx]![0] - q[0], r[idx]![1] - q[1]) / speed;
    }
    t += g.waits?.[idx] ?? g.wait ?? PATROL.wait;
  }
  const a = r[order[order.length - 1]!]!;
  const f = r[order[0]!]!;
  return t + hyp2(f[0] - a[0], f[1] - a[1]) / speed;
}

describe('G4.6 the 25 guards (brief table, D:103-114)', () => {
  it('twenty-five guards: kinds as listed, all armed, one dog with handler 0, checkSectors / checkSectorGuards pass; 25 + 3 x 2 = 31 <= 32; no minPlayers row, no section gear', () => {
    expect(G.length).toBe(25);
    expect(G.map((g) => g.kind)).toEqual(['grunt', 'dog', 'officer', 'officer', 'officer', 'officer', 'grunt', 'grunt', 'officer', 'grunt', 'grunt', 'grunt', 'grunt', 'officer', 'officer', 'officer', 'grunt', 'grunt', 'grunt', 'officer', 'officer', 'officer', 'grunt', 'grunt', 'officer']);
    expect(checkSectorGuards(S4)).toEqual([]);
    expect(checkSectors(m.sectors.CAMPUS_SECTORS, undefined, lay.security)).toEqual([]);
    expect(G.filter((g) => ENEMIES[g.kind].quadruped).length).toBe(1);
    expect(G[1]!.handler).toBe(0);
    expect(S4.dogs).toBe(1);
    for (const [i, g] of G.entries()) if (!ENEMIES[g.kind].quadruped) expect(ENEMIES[g.kind].weapon, `#${i + 1}`).toBeTruthy();
    expect(G.length + SECTOR.alarmMax * S4.perStage).toBe(31);
    expect(G.length + SECTOR.alarmMax * S4.perStage).toBeLessThanOrEqual(SECTOR.maxAlive);
    expect(ALL.slice(0, 25)).toEqual(G);
    // job BRIEF A27: no section gear, body armour as 'armour' on #6, #14, #15 (no 'helmet' / 'both')
    expect(S4.gear).toBeUndefined();
    expect((S4 as { shieldTeams?: boolean }).shieldTeams).toBe(true);
    const gear = ALL.map((g) => (g as { gear?: string }).gear);
    expect(gear.map((v, i) => (v ? i + 1 : 0)).filter((n) => n > 0)).toEqual([6, 14, 15]);
    expect(gear.filter((v) => v !== undefined && v !== 'armour')).toEqual([]);
  });

  it('every guard has a role, a zone, a reason and a squad; the changed and new rows are as the table; the two pairs (#4 / #21, the dock loop) and #19 posted', () => {
    for (const [i, g] of G.entries()) {
      expect(g.role, `#${i + 1} role`).toBeTruthy();
      expect(g.zone, `#${i + 1} zone`).toBeTruthy();
      expect(g.reason && g.reason.length > 8, `#${i + 1} reason`).toBe(true);
      expect(g.squad, `#${i + 1} squad`).not.toBeUndefined();
    }
    expect(G[3]).toMatchObject({ x: 1.3, z: 20.1, yaw: PI / 2, takedownSpot: [0.8, 20.1], pair: 20, role: 'mantrap', zone: 'lobby' });
    expect(G[11]).toMatchObject({ kind: 'grunt', x: -7.0, z: 21.0, yaw: 0, takedownSpot: [-5.5, 35.4], zone: 'batt', role: 'checker', waits: [3, 0, 0, 0, 3, 0, 0, 0] });
    expect(G[11]!.route).toEqual([[-7.0, 21.0], [-7.4, 26.9], [-8.3, 28.4], [-5.5, 30.0], [-5.5, 37.0], [-5.5, 30.0], [-8.3, 28.4], [-7.4, 26.9]]);
    expect(G[18]).toMatchObject({ x: -8.8, z: 30.0, yaw: PI / 2, role: 'posted', zone: 'c4', post: { leash: 5, guards: 'c4-gate' } });
    expect(G[20]).toMatchObject({ kind: 'officer', x: 12.5, z: 19.6, yaw: PI, takedownSpot: [12.5, 19.6], role: 'goods-in', zone: 'lobby', squad: 1, pair: 3, waits: [4, 0, 0, 6, 0, 0] });
    expect(G[20]!.route).toEqual([[12.5, 19.6], [13.4, 17.4], [6.1, 17.4], [5.0, 19.6], [6.1, 17.4], [13.4, 17.4]]);
    expect(G[21]).toMatchObject({ kind: 'officer', x: 13.5, z: 32.5, yaw: 0, takedownSpot: [22.5, 40.8], role: 'keyholder', zone: 'cage', squad: 3, waits: [1, 1, 1, 1] });
    expect(G[21]!.route).toEqual([[13.5, 32.5], [13.5, 40.8], [22.5, 40.8], [22.5, 32.5]]);
    expect(G[22]).toMatchObject({ kind: 'grunt', x: 38.5, z: 31, yaw: PI, takedownSpot: [38.5, 31.5], role: 'watch', zone: 'yard', squad: 0 });
    expect(G[23]).toMatchObject({ kind: 'grunt', x: 18, y: 7.3, z: 30.0, yaw: PI / 2, takedownSpot: [17.5, 30.0], role: 'watch', zone: 'deck', squad: 5 });
    expect(G[24]).toMatchObject({ kind: 'officer', x: 0, z: 43.2, yaw: PI / 2, takedownSpot: [7, 43.5], role: 'runner', zone: 'sec', squad: 2, waits: [6, 6] });
    expect(G[24]!.route).toEqual([[0, 43.2], [7, 43.5]]);
    expect(G[3]!.pair).toBe(20);
    expect(G[20]!.pair).toBe(3);
    expect(G.map((g) => g.squad)).toEqual([0, 0, 0, 1, 2, 2, 3, 3, 3, 3, 3, 4, 5, 2, 2, 4, 1, 1, 4, 3, 1, 3, 0, 5, 2]);
  });

  it('every cycle is 25-45 s and within 1 s of the table (#12 42.1, #21 36.0, #22 41.0 (41.2 in the brief: its z 32.4 points moved to 32.5), #25 27.0); the posts and the dormant list are as the brief', () => {
    const posts: number[] = [];
    for (const [i, g] of G.entries()) {
      const c = cycle(g);
      if (c === null) {
        posts.push(i + 1);
        continue;
      }
      expect(c, `#${i + 1} cycle ${c}`).toBeGreaterThanOrEqual(25);
      expect(c, `#${i + 1} cycle ${c}`).toBeLessThanOrEqual(45);
    }
    for (const [n, want] of [[12, 42.1], [21, 36.0], [22, 41.0], [25, 27.0]] as const) expect(Math.abs(cycle(G[n - 1]!)! - want), `#${n} cycle ${cycle(G[n - 1]!)}`).toBeLessThanOrEqual(1);
    expect(posts).toEqual([3, 4, 5, 6, 9, 14, 15, 19, 23, 24]);
    expect(G.map((g, i) => (g.dormant ? i + 1 : 0)).filter((n) => n > 0)).toEqual([10, 11, 16]);
    const handlers = new Set(G.map((g) => g.handler).filter((h): h is number => h !== undefined));
    G.forEach((g, i) => {
      if (g.pair !== undefined || handlers.has(i) || g.role === 'posted' || ENEMIES[g.kind].quadruped) expect(g.dormant, `guard #${i + 1}`).not.toBe(true);
    });
  });

  it('the loops (dog and handler, the dock pair): one clock, the slower walker fits every leg with a 3-6 s stop, the faster one at least 3', () => {
    for (const [a, c] of [[0, 1], [16, 17]] as const) {
      expect(G[a]!.loop).toEqual(G[c]!.loop);
      const walkers = [a, c].map((k) => ({ k, speed: ENEMIES[G[k]!.kind].walkSpeed }));
      const slow = Math.min(...walkers.map((w) => w.speed));
      for (const { k, speed } of walkers) {
        const g = G[k]!;
        const lp = g.loop!;
        const r = g.route!;
        for (let i = 0; i < r.length; i++) {
          const prev = (i + r.length - 1) % r.length;
          const leg = hyp2(r[i]![0] - r[prev]![0], r[i]![1] - r[prev]![1]) / speed;
          const gap = (((lp.leave[i]! - lp.leave[prev]!) % lp.period) + lp.period) % lp.period;
          expect(gap - leg, `#${k + 1} stop ${i}`).toBeGreaterThanOrEqual(3);
          if (speed === slow) expect(gap - leg, `#${k + 1} stop ${i}`).toBeLessThanOrEqual(6.2);
        }
      }
    }
  });

  it('every slot is >= 7 m from the start and on the nav grid (its floor); every route point, takedown spot, reinforce and sweep point too; every walked patrol leg has a path (the 3-4 player extras too)', () => {
    for (const [i, g] of ALL.entries()) {
      const y = floorOf(g);
      expect(hyp2(g.x - S4.start.x, g.z - S4.start.z), `#${i + 1}`).toBeGreaterThanOrEqual(7);
      expect(onNav(g.x, g.z, y), `#${i + 1} slot (${g.x}, ${y}, ${g.z})`).toBe(true);
      for (const p of g.route ?? []) expect(onNav(p[0], p[1], y), `#${i + 1} route (${p[0]}, ${p[1]})`).toBe(true);
      expect(distToGuard(g, g.takedownSpot[0], g.takedownSpot[1]), `#${i + 1} takedown spot`).toBeLessThanOrEqual(CHECK_SPOT);
      expect(onNav(g.takedownSpot[0], g.takedownSpot[1], y), `#${i + 1} takedown spot (${g.takedownSpot}) on the nav grid`).toBe(true);
      if (g.route) expect(hyp2(g.route[0]![0] - g.x, g.route[0]![1] - g.z)).toBeLessThan(0.1);
      expect([0, S4_NOC, S4_DECK]).toContain(y);
      for (let k = 0; k < (g.route?.length ?? 0); k++) {
        const r = g.route!;
        if (r.length === 2 && k === 1) continue;
        const a = r[k]!;
        const c = r[(k + 1) % r.length]!;
        expect(pathLen([a[0], a[1], y], [c[0], c[1], y]), `#${i + 1} leg ${k}`).not.toBeNull();
      }
    }
    for (const [x, z] of S4.reinforce) expect(onNav(x, z), `reinforce (${x}, ${z})`).toBe(true);
    for (const [x, z] of S4.sweep ?? []) expect(onNav(x, z) || onNav(x, z, S4_BASKET), `sweep (${x}, ${z})`).toBe(true);
  });

  it('every switch, board, alarm, keypad side, key switch, intel board and the desk console is within 1.1 m of a nav cell on its floor', () => {
    const isS4 = (g: number): boolean => (g >= 70 && g <= 79) || (g >= 140 && g <= 149);
    for (const s of lay.switches!.filter((q) => isS4(q.group))) expect(nearNav(s.pos.x, s.pos.z, s.pos.y), `switch ${s.group} (${s.pos.x}, ${s.pos.z})`).toBe(true);
    for (const bd of lay.boards!.filter((q) => q.groups.some((g) => isS4(g)))) expect(nearNav(bd.pos.x, bd.pos.z, bd.pos.y), `board ${bd.groups}`).toBe(true);
    for (const a of lay.alarms!.filter((q) => q.section === 3)) expect(nearNav(a.pos.x, a.pos.z, a.pos.y), 'alarm').toBe(true);
    for (const k of S4.keypads!) for (const s of [-0.8, 0.8]) expect(nearNav(k.at[0] + s, k.at[1], 0), `keypad ${k.at} side ${s}`).toBe(true);
    for (const g of S4.pairGates!) for (const s of [g.a, g.b]) expect(nearNav(s.at[0], s.at[1], s.y ?? 0), `key switch ${s.at}`).toBe(true);
    for (const n of S4.intel!) if (n.kind === 'board') expect(nearNav(n.at[0], n.at[2], 0), 'intel board').toBe(true);
    for (const d of lay.security!.desks!) expect(nearNav(d.at[0], d.at[1], d.y ?? 0), 'desk').toBe(true);
  });
});

describe('coop4 A8: the two 3-4 player extras (re-placed by merge 7 on the G4.6 layout)', () => {
  it('appended after the 25 (index 25 minPlayers 3, index 26 minPlayers 4): 25 / 25 / 26 / 27 spawned, each list within maxAlive; no post, pair, handler, dormant or desk operator; 25-45 s', () => {
    expect(ALL.length).toBe(27);
    expect(TAGS.map((g) => g.minPlayers)).toEqual([3, 4]);
    expect([1, 2, 3, 4].map((n) => ALL.filter((g) => guardForTeam(g, n)).length)).toEqual([25, 25, 26, 27]);
    expect(ALL.length).toBeLessThanOrEqual(SECTOR.maxAlive);
    for (const [k, g] of TAGS.entries()) {
      const n = `tag ${k + 3}`;
      expect(g.post === undefined && g.pair === undefined && g.handler === undefined && !g.dormant, n).toBe(true);
      expect((g.reason ?? '').length, n).toBeGreaterThan(30);
      expect(g.kind, n).toBe('grunt');
      const c = cycle(g);
      if (c !== null) {
        expect(c, `${n} cycle ${c}`).toBeGreaterThanOrEqual(25);
        expect(c, `${n} cycle ${c}`).toBeLessThanOrEqual(45);
      }
    }
    expect(lay.security!.desks!.filter((d) => d.section === 3).map((d) => d.operator)).toEqual([4]);
    // tag 3 watches the rear gate (pg-cage) from the north strip, facing it; tag 4 walks #12's battery round from the other end
    const [t3, t4] = [TAGS[0]!, TAGS[1]!];
    expect(Math.sin(t3.yaw) * (S4_DOORS.pgCage[0] - t3.x) + Math.cos(t3.yaw) * (S4_DOORS.pgCage[1] - t3.z)).toBeGreaterThan(7);
    expect(t4.route!.length).toBe(G[11]!.route!.length);
    expect(new Set(t4.route!.map((p) => p.join()))).toEqual(new Set(G[11]!.route!.map((p) => p.join())));
    expect(t4.route![0]).toEqual([-5.5, 37.0]);
    expect(cycle(t4)).toBeCloseTo(cycle(G[11]!)!, 6);
  });
});

describe('G4.6 M8: isolation in time at each takedown spot (sectorCheck)', () => {
  const world = new SightWorld(b.boxes, b.cylinders);
  const timed: CheckGuard[] = G.map((g) => {
    const speed = ENEMIES[g.kind].walkSpeed * (g.loop ? 1 : CHECK_PATROL_PACE);
    return { x: g.x, z: g.z, y: g.y, route: g.route as readonly (readonly [number, number])[] | undefined, wait: g.wait, waits: g.waits, speed, loop: g.loop };
  });
  it('records each guard\'s longest isolated run at its spot; every guard outside the recorded overlap pairs holds 3 s', () => {
    const rows = G.map((g, i) => ({ n: i + 1, run: longestIsolation(world, timed, i, 15, g.takedownSpot), ok: isolatedInTime(world, timed, i, g.takedownSpot) }));
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(rows.map((r) => `#${r.n} ${r.run}s ${r.ok ? 'ok' : 'NOT isolated'}`).join('\n'));
    // recorded exceptions (overlap partners, LS 4.5): the dog team #1-#2, the security room #5-#6 and the night runner #25 (the same room: 0 s),
    // the NOC pair #14-#15. #12's spot moved along his route to (-5.5, 35.4) (K3 #19 saw the brief's spot through battCC).
    const must = rows.filter((r) => ![1, 2, 5, 6, 14, 15, 25].includes(r.n));
    expect(must.filter((r) => !r.ok).map((r) => `#${r.n} (${r.run}s)`)).toEqual([]);
    expect(CHECK_ISOLATION).toBe(3);
  });
});

describe('G4.6 routes (AS11, D:216-219)', () => {
  const rt = runtimeNav(b, lay.playerSpawns[0]!.pos, m.campusOps.navLayers ?? 3, lay.navSeeds ?? []);
  it('three named routes; start at the start, OBJ within 1.8 of the objective, end inside the C4 zone; every point on the nav; every walked leg has an analytic and a runtime path', () => {
    expect(S4.routes.length).toBe(3);
    expect(S4.routes.map((r) => r.name)).toEqual(['The goods lane, the battery room and the hot aisles', 'The interlock and the P2|P3 cold aisle', 'The compound, the riser and the cable baskets']);
    expect(S4.routes.map((r) => r.obj)).toEqual([21, 17, 16]);
    expect(S4.routes[2]!.climbs).toEqual([8, 9, 10, 11, 12, 13, 14]);
    const exit = exitZone(S4)!;
    for (const r of S4.routes) {
      const first = r.pts[0]!;
      const at = r.pts[r.obj]!;
      const last = r.pts[r.pts.length - 1]!;
      expect(hyp2(first[0] - S4.start.x, first[1] - S4.start.z), r.name).toBeLessThan(0.5);
      expect(hyp3(at[0] - S4.objective.x, (at[2] ?? 0) - S4.objective.y, at[1] - S4.objective.z), r.name).toBeLessThan(1.8);
      expect(inZone(exit, last[0], last[2] ?? 0, last[1]), r.name).toBe(true);
      r.pts.forEach((p, i) => expect(onNav(p[0], p[1], p[2] ?? 0), `${r.name} point ${i} (${p})`).toBe(true));
      for (let i = 0; i + 1 < r.pts.length; i++) {
        if ((r.climbs ?? []).includes(i)) continue;
        const a = r.pts[i]!;
        const c = r.pts[i + 1]!;
        const len = pathLen([a[0], a[1], a[2] ?? 0], [c[0], c[1], c[2] ?? 0]);
        expect(len, `${r.name} leg ${i}: ${a} -> ${c}`).not.toBeNull();
        expect(len!, `${r.name} leg ${i} detour`).toBeLessThanOrEqual(hyp2(c[0] - a[0], c[1] - a[1]) * 2.5 + 8);
        expect(rt.findPath([a[0], a[1]], [c[0], c[1]], 200000, a[2] ?? 0, c[2] ?? 0), `${r.name} runtime leg ${i}: ${a} -> ${c}`).not.toBeNull();
      }
    }
    expect(new Set(S4.routes.map((r) => JSON.stringify(r.pts))).size).toBe(3);
  }, 600_000);

  it('runtime nav rules (b)-(d): a leg changing floor is a climb or a walk 0.8 m beyond a NOC flight; every raised basket leg is a climb; no point within 0.6 m of a body-height box or rail', () => {
    const onFlightWalk = (x: number, z: number): boolean => S4_FLIGHTS.some((f) => Math.abs(z - f.cz) <= f.w / 2 + 0.8 && Math.abs(x - f.cx) <= f.len / 2 + 1.4 + 0.8);
    for (const r of S4.routes) {
      for (let i = 0; i + 1 < r.pts.length; i++) {
        const a = r.pts[i]!;
        const c = r.pts[i + 1]!;
        const ya = a[2] ?? 0;
        const yc = c[2] ?? 0;
        const climb = (r.climbs ?? []).includes(i);
        if (Math.abs(yc - ya) > 0.5) expect(climb || (onFlightWalk(a[0], a[1]) && onFlightWalk(c[0], c[1])), `${r.name} leg ${i} changes floor`).toBe(true);
        if (ya > 4 && ya < 5 && yc > 4 && yc < 5) expect(climb, `${r.name} basket leg ${i}`).toBe(true);
      }
      r.pts.forEach((p, i) => {
        const y = p[2] ?? 0;
        for (const q of solid) {
          if (top(q) <= y + 0.3 || bottom(q) >= y + 1.7) continue;
          const gx = Math.max(0, Math.abs(p[0] - q.c[0]) - q.s[0] / 2);
          const gz = Math.max(0, Math.abs(p[1] - q.c[2]) - q.s[2] / 2);
          expect(hyp2(gx, gz), `${r.name} point ${i} (${p}) near ${JSON.stringify(q.c)} ${JSON.stringify(q.s)}`).toBeGreaterThanOrEqual(0.6 - 1e-6);
        }
      });
    }
  });

  it('every armoured bypass names an S4 route that stays > 1.2 m from its piece and passes the bypass point within 0.6 m; the loud route passes the door piece; no ground leg passes within 1.2 m of the pg-cage door', () => {
    const near = (a: readonly number[], r: (typeof S4.routes)[number], to: number): number => {
      let best = Infinity;
      for (let i = 0; i < to; i++) {
        const p = r.pts[i]!;
        const q = r.pts[i + 1]!;
        const l2 = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
        const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((a[0]! - p[0]) * (q[0] - p[0]) + (a[1]! - p[1]) * (q[1] - p[1])) / l2)) : 0;
        best = Math.min(best, hyp2(a[0]! - (p[0] + (q[0] - p[0]) * t), a[1]! - (p[1] + (q[1] - p[1]) * t)));
      }
      return best;
    };
    expect(m.s4Data.S4_ARMOURED.map((a) => a.id)).toEqual(['arm-mantrap', 'arm-noc']);
    for (const a of m.s4Data.S4_ARMOURED) {
      const bypass = S4.routes.find((q) => q.name === a.bypass.route);
      const loud = S4.routes.find((q) => q.name === a.loud);
      expect(bypass, a.id).toBeTruthy();
      expect(loud, a.id).toBeTruthy();
      expect(near(a.at, bypass!, bypass!.obj), `${a.id} vs the bypass route`).toBeGreaterThan(1.2);
      expect(near(a.bypass.at, bypass!, bypass!.obj), `${a.id} bypass point on its route`).toBeLessThanOrEqual(0.6);
      if (a.kind === 'door') expect(near(a.at, loud!, loud!.obj), `${a.id} on the loud route`).toBeLessThanOrEqual(1.2);
    }
    const [dx, dz] = S4_DOORS.pgCage;
    for (const r of S4.routes) {
      for (let i = 0; i + 1 < r.pts.length; i++) {
        if ((r.pts[i]![2] ?? 0) > 1 || (r.pts[i + 1]![2] ?? 0) > 1) continue;
        expect(near([dx, dz], { ...r, pts: [r.pts[i]!, r.pts[i + 1]!] }, 1), `${r.name} leg ${i}`).toBeGreaterThan(1.2);
      }
    }
  });

  it('the #20 twist: an analytic path (-2.5, 33) -> (17, 33.5) exists and no box below 2.1 stands within 0.6 m of the line z 33 between x -2 and 13', () => {
    expect(pathLen([-2.5, 33, 0], [17, 33.5, 0])).not.toBeNull();
    expect(inRect(-2, 13, 33 - 0.6, 33 + 0.6, 0, 2.1).map((p) => [p.c, p.s])).toEqual([]);
  });
});
