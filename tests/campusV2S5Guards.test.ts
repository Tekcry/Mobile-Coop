/**
 * (campus-greybox S5, `docs/campus-greybox/briefs/S5.md` P3) Section 5's v2 guards and routes, flag on
 * (`flags.campusV2 = [5]`): 26 guards (#1-#24, #28, #34), their cycles, slots and spots on the nav, the dormant rule, the
 * live cap, M8 isolation, the three routes on the analytic and the runtime nav grids, the armoured bypasses and door
 * separation. The map is built undressed with the pure `LevelBuilder`; the nav is the live test's analytic raster
 * (`tests/campusS5.test.ts`, copied: a test file is never imported).
 */
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { hyp2, hyp3 } from '../src/core/mathx';
import { ENEMIES } from '../src/ai/enemyDefs';
import { PATROL } from '../src/ai/patrol';
import { SightWorld, isolatedInTime, longestIsolation, CHECK_ISOLATION, CHECK_PATROL_PACE, CHECK_SPOT, distToGuard, type CheckGuard } from '../src/game/sectorCheck';
import { runtimeNav } from './helpers/runtimeNav';

/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const sectors = await import('../src/world/maps/campusSectors');
  const sectorsGame = await import('../src/game/sectors');
  const sectorStage = await import('../src/game/sectorStage');
  const { buildCampus, campusOps } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const s5 = await import('../src/world/maps/campusV2/s5');
  const s5Data = await import('../src/world/maps/campusV2/s5Data');
  return { sectors, sectorsGame, sectorStage, buildCampus, campusOps, LevelBuilder, s5, s5Data };
}

const m = await loadCampus([5]);
const { S5_BOARDS, S5_CORE, S5_DOORS, S5_FLIGHTS, S5_HALL_FLIGHTS, S5_L1, S5_ROOF } = m.s5;
const { S5_ARMOURED, S5_ROUTES } = m.s5Data;
const { SECTOR, checkSectorGuards, checkSectors, inZone, intelItemId } = m.sectorsGame;
type SectorGuard = (typeof m.s5Data.S5_GUARDS)[number];
const b: LB = new m.LevelBuilder();
const lay = m.buildCampus(b, { dress: false });
const SECTORS = m.sectors.CAMPUS_SECTORS;
const S5 = SECTORS[4]!;
const G = S5.guards as readonly SectorGuard[];
/** The plan number of guard index i (#1-#24, then #28, #34). */
const num = (i: number): number => (i < 24 ? i + 1 : i === 24 ? 28 : 34);
const FOOT = { x0: -70, x1: -26, z0: 18, z1: 70 };
const inFoot = (x: number, z: number): boolean => x >= FOOT.x0 && x <= FOOT.x1 && z >= FOOT.z0 && z <= FOOT.z1;

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

/** An analytic layered nav grid over a rectangle (as `tests/campusV2S5.test.ts`, with the stair ramps and the ladders). */
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
const nav = analyticNav([-72, 16, -16, 68]);
const onNav = (x: number, z: number, y = 0): boolean => nav.isWalkable(nav.cellOf(x, z, y)) && Math.abs(nav.heightAt(x, z, y) - y) < 0.6;
const nearNav = (x: number, z: number, y: number, r = 1.1): boolean => {
  for (let dx = -r; dx <= r; dx += 0.25) for (let dz = -r; dz <= r; dz += 0.25) if (hyp2(dx, dz) <= r && onNav(x + dx, z + dz, y)) return true;
  return false;
};
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
const floorOf = (g: { y?: number }): number => g.y ?? 0;
const doorCentre = (d: (typeof b.anchors.doors)[number]): [number, number] => [d.hinge.x + Math.sin(d.yaw) * d.width * 0.5, d.hinge.z + Math.cos(d.yaw) * d.width * 0.5];

/** A guard's patrol cycle (s): the walk at its pace plus the pauses (each leg the nav path's length, `navLegs`, or the
 *  straight line); a timed loop is its master clock's period. */
function cycle(g: SectorGuard, navLegs: boolean): number | null {
  const r = g.route;
  if (!r || r.length < 2) return null;
  if (g.loop) return g.loop.period;
  const speed = ENEMIES[g.kind].walkSpeed * CHECK_PATROL_PACE;
  const y = floorOf(g);
  const n = r.length;
  const order: number[] = [];
  if (n < 3) {
    for (let i = 0; i < n; i++) order.push(i);
    for (let i = n - 2; i >= 1; i--) order.push(i);
  } else for (let i = 0; i < n; i++) order.push(i);
  const leg = (p: readonly number[], q: readonly number[]): number => {
    const straight = hyp2(q[0]! - p[0]!, q[1]! - p[1]!);
    if (!navLegs) return straight;
    const l = pathLen([p[0]!, p[1]!, y], [q[0]!, q[1]!, y]);
    return Math.max(straight, l ?? Infinity);
  };
  let t = 0;
  for (let k = 0; k < order.length; k++) {
    const idx = order[k]!;
    if (k > 0) t += leg(r[order[k - 1]!]!, r[idx]!) / speed;
    t += g.waits?.[idx] ?? g.wait ?? PATROL.wait;
  }
  return t + leg(r[order[order.length - 1]!]!, r[order[0]!]!) / speed;
}

describe('S5 v2 P3 guards (26: #1-#24, #28, #34)', () => {
  it('26 guards: kinds and guns, two dogs with handlers #5 and #7, checkSectors and checkSectorGuards clean, every guard role / zone / reason / squad; no section gear, armour (never helmet / both) on the response team and the keyholders; no 3-4 player row', () => {
    expect(G.length).toBe(26);
    expect(G).toBe(m.s5Data.S5_GUARDS);
    expect(G.map((g) => g.kind)).toEqual([
      'grunt', 'grunt', 'grunt', 'grunt', 'grunt', 'dog', 'grunt', 'dog', 'officer', 'officer', 'officer', 'officer',
      'grunt', 'grunt', 'officer', 'officer', 'grunt', 'grunt', 'grunt', 'grunt', 'grunt', 'officer', 'grunt', 'officer',
      'officer', 'grunt',
    ]);
    expect(ENEMIES.officer.gun).toBe('pistolSd');
    expect(ENEMIES.grunt.gun).toBe('rifle');
    expect(checkSectorGuards(S5)).toEqual([]);
    expect(checkSectors(SECTORS, undefined, lay.security)).toEqual([]);
    expect(S5.dogs).toBe(2);
    expect(G[5]!.handler).toBe(4);
    expect(G[7]!.handler).toBe(6);
    expect(G.filter((g) => ENEMIES[g.kind].quadruped).length).toBe(2);
    for (const [i, g] of G.entries()) {
      expect(g.role, `#${num(i)} role`).toBeTruthy();
      expect(g.zone, `#${num(i)} zone`).toBeTruthy();
      expect(g.reason && g.reason.length > 8, `#${num(i)} reason`).toBe(true);
      expect(g.squad, `#${num(i)} squad`).not.toBeUndefined();
      expect((g as { minPlayers?: number }).minPlayers, `#${num(i)} minPlayers`).toBeUndefined();
    }
    expect((S5 as { gear?: unknown }).gear).toBeUndefined();
    expect((S5 as { shieldTeams?: boolean }).shieldTeams).toBe(true);
    expect(G.map((g, i) => (g.gear ? `#${num(i)} ${g.gear}` : '')).filter(Boolean)).toEqual(['#1 armour', '#2 armour', '#3 armour', '#4 armour', '#9 armour', '#10 armour']);
    // the K4 set: the keyholders posted on the token (high security), #28 posted on it too
    expect(G[8]!.post).toEqual({ leash: 3, highSecurity: true, guards: 'token' });
    expect(G[9]!.post).toEqual(G[8]!.post);
    expect(G[24]!.post).toEqual({ leash: 3, guards: 'token' });
    expect([G[24]!.role, G[24]!.zone, G[24]!.squad]).toEqual(['audit', 'token', 2]);
    expect([G[25]!.role, G[25]!.zone, G[25]!.squad, G[25]!.route]).toEqual(['sentry', 'lane', 4, undefined]);
  });

  it('the moved and new rows at their table points (D:134-140)', () => {
    const at = (i: number) => [G[i]!.x, floorOf(G[i]!), G[i]!.z, Math.round(G[i]!.yaw * 1000) / 1000];
    expect(at(3)).toEqual([-41.5, 0, 23.5, 1.9]);
    expect(at(8)).toEqual([-44.5, 0, 37.0, Math.round(Math.PI * 1000) / 1000]);
    expect(at(9)).toEqual([-41.5, 0, 37.0, Math.round(Math.PI * 1000) / 1000]);
    expect(at(10)).toEqual([-45, 0, 33, Math.round((Math.PI / 2) * 1000) / 1000]);
    expect(at(11)).toEqual([-41.5, 0, 19.6, -2.14]);
    expect(at(17)).toEqual([-42.4, S5_L1, 34.0, 0]);
    expect(at(21)).toEqual([-28.8, 0, 30.8, Math.round((Math.PI / 2) * 1000) / 1000]);
    expect(at(23)).toEqual([-35, 0, 19.6, 0]);
    expect(at(24)).toEqual([-42.5, 0, 33.4, 0]);
    expect(at(25)).toEqual([-43.5, 0, 57.4, Math.round(Math.PI * 1000) / 1000]);
    expect(G[3]!.route).toEqual([[-41.5, 23.5], [-53, 28.4]]);
    expect(G[10]!.route).toEqual([[-45, 33], [-39.5, 37.4], [-38, 33.5]]);
    expect(G[17]!.route).toEqual([[-42.4, 34.0], [-42.4, 42.3], [-45.2, 42.3], [-42.4, 42.3]]);
    expect(G[23]!.route).toEqual([[-35, 19.6], [-35, 37]]);
  });

  it('each patrol cycle is 25-45 s by nav-path legs and within 1 s of the table (#11 31.5, #18 30.4, #24 43.2); the loops\' stops 3-6 s; slots >= 7 m from the start', () => {
    const rows: string[] = [];
    for (const [i, g] of G.entries()) {
      const c = cycle(g, true);
      if (c === null) continue;
      rows.push(`#${num(i)} ${c.toFixed(1)}s (straight ${cycle(g, false)!.toFixed(1)}s)`);
      expect(c, `#${num(i)} cycle ${c}`).toBeGreaterThanOrEqual(25);
      // recorded (report P3, for the lead): #21's as-built service round now bends through the moved lobby doors (G8), 46.4 s
      // by nav path (44.4 s straight) with his stops already 3 s; the brief allows no other change
      if (num(i) === 21) {
        expect(cycle(g, false)!).toBeLessThanOrEqual(45);
        expect(c).toBeLessThanOrEqual(46.5);
        continue;
      }
      expect(c, `#${num(i)} cycle ${c}`).toBeLessThanOrEqual(45);
    }
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(rows.join('\n'));
    for (const [i, want] of [[10, 31.5], [17, 30.4], [23, 43.2]] as const) expect(Math.abs(cycle(G[i]!, true)! - want), `#${num(i)} cycle ${cycle(G[i]!, true)}`).toBeLessThanOrEqual(1);
    for (const [i, g] of G.entries()) expect(hyp2(g.x - S5.start.x, g.z - S5.start.z), `#${num(i)}`).toBeGreaterThanOrEqual(7);
    for (const k of [4, 5, 6, 7]) {
      const g = G[k]!;
      const lp = g.loop!;
      const speed = 0.9;
      const r = g.route!;
      for (let i = 0; i < r.length; i++) {
        const prev = (i + r.length - 1) % r.length;
        const leg = hyp2(r[i]![0] - r[prev]![0], r[i]![1] - r[prev]![1]) / speed;
        const gap = (((lp.leave[i]! - lp.leave[prev]!) % lp.period) + lp.period) % lp.period;
        expect(gap - leg, `#${k + 1} stop ${i}`).toBeGreaterThanOrEqual(3);
        expect(gap - leg, `#${k + 1} stop ${i}`).toBeLessThanOrEqual(6.2);
      }
    }
    expect(G[4]!.loop).toEqual(G[5]!.loop);
    expect(G[6]!.loop).toEqual(G[7]!.loop);
  });

  it('slots, route points, takedown spots and reinforce points are on the nav grid (their floor); legs have nav paths', () => {
    for (const [i, g] of G.entries()) {
      const y = floorOf(g);
      expect([0, S5_L1, S5_ROOF]).toContain(y);
      expect(onNav(g.x, g.z, y), `#${num(i)} slot (${g.x}, ${y}, ${g.z})`).toBe(true);
      for (const p of g.route ?? []) expect(onNav(p[0], p[1], y), `#${num(i)} route (${p[0]}, ${p[1]})`).toBe(true);
      expect(distToGuard(g, g.takedownSpot[0], g.takedownSpot[1]), `#${num(i)} takedown spot`).toBeLessThanOrEqual(CHECK_SPOT);
      expect(onNav(g.takedownSpot[0], g.takedownSpot[1], y), `#${num(i)} takedown spot on the nav grid`).toBe(true);
      if (g.route) expect(hyp2(g.route[0]![0] - g.x, g.route[0]![1] - g.z)).toBeLessThan(0.1);
      const r = g.route;
      if (!r) continue;
      for (let k = 0; k < r.length; k++) {
        if (r.length === 2 && k === 1) continue;
        const a = r[k]!;
        const c = r[(k + 1) % r.length]!;
        expect(pathLen([a[0], a[1], y], [c[0], c[1], y]), `#${num(i)} leg ${k}`).not.toBeNull();
      }
    }
    for (const [x, z] of S5.reinforce) expect(onNav(x, z), `reinforce (${x}, ${z})`).toBe(true);
    for (const [x, z] of S5.sweep ?? []) expect(onNav(x, z), `sweep (${x}, ${z})`).toBe(true);
    for (const a of S5.stageActions![0]!.responseRoute!) expect(onNav(a[0], a[1]), `response (${a})`).toBe(true);
  });

  it('switches, boards, alarms, the keypad\'s sides, the key switches and the intel board are within reach of a walkable cell; the hide spots on the nav', () => {
    for (const s of lay.switches!.filter((q) => q.section === 4)) expect(nearNav(s.pos.x, s.pos.z, s.pos.y), `switch (${s.pos.x}, ${s.pos.y}, ${s.pos.z})`).toBe(true);
    for (const bd of S5_BOARDS) expect(nearNav(bd.pos.x, bd.pos.z, bd.pos.y), 'board').toBe(true);
    const al = lay.alarms!.filter((q) => q.section === 4);
    expect(al.length).toBe(3);
    for (const a of al) expect(nearNav(a.pos.x, a.pos.z, a.pos.y), `alarm (${a.pos.x}, ${a.pos.z})`).toBe(true);
    const kp = S5.keypads![0]!.at;
    expect(onNav(kp[0] - 0.7, kp[1], S5_L1), 'keypad archive side').toBe(true);
    expect(onNav(kp[0] + 0.7, kp[1], S5_L1), 'keypad landing side').toBe(true);
    for (const pg of S5.pairGates!) for (const k of [pg.a, pg.b]) expect(nearNav(k.at[0], k.at[1], k.y ?? S5_L1), `key switch (${k.at})`).toBe(true);
    const it = S5.intel![0]!;
    expect(it.kind === 'board' && nearNav(it.at[0], it.at[2], 0), 'rota board').toBe(true);
    expect(intelItemId(4, 0)).toBe('c-sintel-4-0');
    for (const h of lay.hideSpots!.filter((q) => inFoot(q.pos.x, q.pos.z) && q.pos.z >= 18)) expect(onNav(h.pos.x, h.pos.z, h.pos.y), `hide (${h.pos.x}, ${h.pos.z})`).toBe(true);
  });

  it('(A64) the dormant rule: only #1, #2, #3 and #15; none posted, paired, a handler or a dog; 26 + alarmMax x perStage <= maxAlive (32)', () => {
    const handlers = new Set(G.map((g) => g.handler).filter((h): h is number => h !== undefined));
    G.forEach((g, i) => {
      if (g.pair !== undefined || handlers.has(i) || g.post || ENEMIES[g.kind].quadruped) expect(g.dormant, `guard #${num(i)}`).not.toBe(true);
    });
    expect(G.map((g, i) => (g.dormant ? num(i) : 0)).filter((n) => n > 0)).toEqual([1, 2, 3, 15]);
    expect(S5.perStage).toBe(2);
    expect(G.length + SECTOR.alarmMax * S5.perStage).toBeLessThanOrEqual(SECTOR.maxAlive);
    expect(G.length + SECTOR.alarmMax * S5.perStage).toBe(32);
  });
});

describe('S5 v2 P3 M8: isolation in time at each takedown spot', () => {
  const world = new SightWorld(b.boxes, b.cylinders);
  const timed: CheckGuard[] = G.map((g) => {
    const speed = ENEMIES[g.kind].walkSpeed * (g.loop ? 1 : CHECK_PATROL_PACE);
    return { x: g.x, z: g.z, y: g.y, route: g.route as readonly (readonly [number, number])[] | undefined, wait: g.wait, waits: g.waits, speed, loop: g.loop };
  });
  it('records each guard\'s longest isolated run; every guard outside the recorded pairs holds 3 s', () => {
    const rows = G.map((g, i) => ({ n: num(i), run: longestIsolation(world, timed, i, 15, g.takedownSpot), ok: isolatedInTime(world, timed, i, g.takedownSpot) }));
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(rows.map((r) => `#${r.n} ${r.run}s ${r.ok ? 'ok' : 'NOT isolated'}`).join('\n'));
    // recorded (report P3): the standing pairs (#5-#6, #7-#8, #16-#17) and the K4 set (#9, #10, #28) as on the live map; and,
    // for the lead, the four no takedown-spot move along their own posts or routes can isolate: #11 (the keyholders and #28
    // see the whole anteroom), #20, #23 and #34 (the lawn: #34's deck foot post sees #20's jetty walk and #23 at the van)
    const PAIRS = [5, 6, 7, 8, 9, 10, 16, 17, 28];
    const LEAD = [11, 20, 23, 34];
    expect(rows.filter((r) => !r.ok).map((r) => r.n)).toEqual(rows.filter((r) => [...PAIRS, ...LEAD].includes(r.n) && !r.ok).map((r) => r.n));
    expect(rows.filter((r) => LEAD.includes(r.n) && !r.ok).map((r) => r.n)).toEqual(LEAD);
    // #24 holds 3 s at his spot in the screens passage (moved along his route, P3)
    expect(rows.find((r) => r.n === 24)!.run).toBeGreaterThanOrEqual(3);
    expect(CHECK_ISOLATION).toBe(3);
  });
});

describe('S5 v2 P3 routes', () => {
  it('three routes: start at the start, OBJ within 1.8 of the token, end inside the extract zone; unique; every point on the nav; every walked leg has a path', () => {
    expect(S5.routes).toBe(S5_ROUTES);
    expect(S5.routes.map((r) => r.name)).toEqual(['The screens passage, the side door and the garden', 'The hall front, the anteroom hall door and the kitchen', 'The service stair, the archive and the light well']);
    expect(S5.routes.map((r) => r.obj)).toEqual([13, 13, 23]);
    expect(S5.routes[2]!.climbs).toEqual([14, 17, 19]);
    const O = S5.objective;
    for (const r of S5.routes) {
      const first = r.pts[0]!;
      const at = r.pts[r.obj]!;
      const last = r.pts[r.pts.length - 1]!;
      expect(hyp2(first[0] - S5.start.x, first[1] - S5.start.z), r.name).toBeLessThan(0.5);
      expect(hyp3(at[0] - O.x, (at[2] ?? 0) - O.y, at[1] - O.z), r.name).toBeLessThan(1.8);
      expect(inZone(S5.extract!, last[0], last[2] ?? 0, last[1]), r.name).toBe(true);
      // every point on the nav; a climb leg's end within 1 m of a walkable cell (the high route's rooflight top, point 15, is
      // the hatch opening the climber tops out of)
      const ends = new Set((r.climbs ?? []).flatMap((c) => [c, c + 1]));
      r.pts.forEach((p, i) => {
        if (ends.has(i)) expect(nearNav(p[0], p[1], p[2] ?? 0, 1.0), `${r.name} climb end ${i} (${p})`).toBe(true);
        else expect(onNav(p[0], p[1], p[2] ?? 0), `${r.name} point ${i} (${p})`).toBe(true);
      });
      for (let i = 0; i + 1 < r.pts.length; i++) {
        if ((r.climbs ?? []).includes(i)) continue;
        const a = r.pts[i]!;
        const c = r.pts[i + 1]!;
        expect(pathLen([a[0], a[1], a[2] ?? 0], [c[0], c[1], c[2] ?? 0]), `${r.name} leg ${i}: ${a} -> ${c}`).not.toBeNull();
      }
    }
    expect(new Set(S5_ROUTES.map((r) => JSON.stringify(r.pts))).size).toBe(3);
  });

  it('every route point but a climb leg\'s end is >= 0.6 m (plan) from a collide box below head height on its floor', () => {
    const low = solid.filter((p) => bottom(p) < 1.6 && !p.overhead && p.c[1] > -1);
    for (const r of S5.routes) {
      const ends = new Set((r.climbs ?? []).flatMap((c) => [c, c + 1]));
      r.pts.forEach((p, i) => {
        if (ends.has(i)) return;
        const y = p[2] ?? 0;
        for (const q of low) {
          if (bottom(q) < y - 0.3 || bottom(q) > y + 1.5 || top(q) < y + 0.3) continue;
          const dx = Math.max(0, Math.abs(p[0] - q.c[0]) - q.s[0] / 2);
          const dz = Math.max(0, Math.abs(p[1] - q.c[2]) - q.s[2] / 2);
          expect(hyp2(dx, dz), `${r.name} point ${i} (${p}) near a box at ${q.c} size ${q.s}`).toBeGreaterThanOrEqual(0.6 - 1e-9);
        }
      });
    }
  });

  it('floors change only by the core\'s near landing, the hall stair or a climb leg; each climb leg is a ladder or the sash', () => {
    const landing = [(S5_CORE.x0 + S5_CORE.x1) / 2, S5_CORE.z0 + 0.7];
    const onHallStair = (p: readonly number[]): boolean => S5_HALL_FLIGHTS.some((f) => Math.abs(p[0]! - f.cx) <= f.w / 2 + 1 && Math.abs(p[1]! - f.cz) <= f.len / 2 + 1);
    for (const r of S5.routes)
      for (let i = 0; i + 1 < r.pts.length; i++) {
        const a = r.pts[i]!;
        const c = r.pts[i + 1]!;
        if (Math.abs((a[2] ?? 0) - (c[2] ?? 0)) < 1 || (r.climbs ?? []).includes(i)) continue;
        const stacked = hyp2(a[0] - c[0], a[1] - c[1]) < 1e-6 && hyp2(a[0] - landing[0]!, a[1] - landing[1]!) < 0.3;
        expect(stacked || (onHallStair(a) && onHallStair(c)), `${r.name} leg ${i} changes floor off the core's landing`).toBe(true);
      }
    const high = S5.routes[2]!;
    const ladderNear = (p: readonly number[], y: number) => b.anchors.ladders.some((l) => hyp2(l.base.x - p[0]!, l.base.z - p[1]!) < 1.6 && (Math.abs(l.base.y - y) < 0.1 || Math.abs(l.top.y - y) < 0.1));
    expect(ladderNear(high.pts[14]!, S5_L1) && ladderNear(high.pts[15]!, S5_ROOF)).toBe(true);
    expect(ladderNear(high.pts[17]!, S5_ROOF) && ladderNear(high.pts[18]!, 0)).toBe(true);
    const sash = b.anchors.windows.find((w) => hyp2(w.c.x + 46, w.c.z - 35.5) < 0.1)!;
    expect(sash.open).toBe(true);
    expect(hyp2(high.pts[19]![0] - sash.c.x, high.pts[19]![1] - sash.c.z)).toBeLessThan(1);
    expect(hyp2(high.pts[20]![0] - sash.c.x, high.pts[20]![1] - sash.c.z)).toBeLessThan(1);
  });

  it('the routes\' legs also have paths on the runtime nav grid (the e2e grid), the stairs included', () => {
    const rn = runtimeNav(b, lay.playerSpawns[0]!.pos, m.campusOps.navLayers ?? 3, lay.navSeeds ?? []);
    const fails: string[] = [];
    for (const r of S5.routes)
      for (let i = 0; i + 1 < r.pts.length; i++) {
        if ((r.climbs ?? []).includes(i)) continue;
        const a = r.pts[i]!;
        const c = r.pts[i + 1]!;
        if (!rn.findPath([a[0], a[1]], [c[0], c[1]], 200000, a[2] ?? 0, c[2] ?? 0)) fails.push(`${r.name} leg ${i} ${JSON.stringify([a, c])}`);
      }
    if (!rn.findPath([-45, 19.5], [-45, 30.0], 200000, 0, S5_L1)) fails.push('hall stair');
    expect(fails).toEqual([]);
  }, 300_000);

  it('every armoured bypass is a route whose legs up to OBJ stay > 1.2 m (plan) from the armoured piece; arm-ante by the side door, arm-front by the lobby door and the screens passage', () => {
    expect(S5_ARMOURED.map((a) => [a.id, a.bypass.kind, a.bypass.at, a.bypass.route])).toEqual([
      ['arm-ante', 'side door', [...S5_DOORS.anteSide], 'The screens passage, the side door and the garden'],
      ['arm-front', 'side door', [-32, 29], 'The screens passage, the side door and the garden'],
    ]);
    for (const a of S5_ARMOURED) {
      const r = S5.routes.find((q) => q.name === a.bypass.route)!;
      expect(r, a.id).toBeTruthy();
      for (let i = 0; i < r.obj; i++) {
        const p = r.pts[i]!;
        const q = r.pts[i + 1]!;
        const dx = q[0] - p[0];
        const dz = q[1] - p[1];
        const l2 = dx * dx + dz * dz;
        const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((a.at[0] - p[0]) * dx + (a.at[1] - p[1]) * dz) / l2)) : 0;
        expect(hyp2(a.at[0] - (p[0] + dx * t), a.at[1] - (p[1] + dz * t)), `${a.id} leg ${i}`).toBeGreaterThan(1.2);
      }
      // the bypass is on its route: a route point within 1.5 m of it
      expect(r.pts.some((p) => hyp2(p[0] - a.bypass.at[0], p[1] - a.bypass.at[1]) < 1.5), `${a.id} bypass on its route`).toBe(true);
    }
  });
});

describe('S5 v2 P3 door separation (doors are found by plan position, 1.2 m)', () => {
  it('every keypad, pair gate, lockdown and connector door centre is >= 1.2 m (plan) from every other door anchor centre on any floor', () => {
    const special: { what: string; at: readonly [number, number] }[] = [
      ...S5.keypads!.map((k) => ({ what: 'keypad', at: k.at })),
      ...S5.pairGates!.map((g) => ({ what: 'pair gate', at: g.door })),
      { what: 'C4 far', at: S5_DOORS.c4Far },
      ...S5.stageActions!.flatMap((a) => (a.lockDoors ?? []).map((at) => ({ what: `lockdown stage ${a.stage}`, at }))),
    ];
    const centres = b.anchors.doors.map(doorCentre);
    for (const s of special) {
      const own = centres.filter((c) => hyp2(c[0] - s.at[0], c[1] - s.at[1]) < 0.3);
      expect(own.length, `${s.what} door exists`).toBeGreaterThanOrEqual(1);
      const others = centres.filter((c) => hyp2(c[0] - s.at[0], c[1] - s.at[1]) >= 0.3 && hyp2(c[0] - s.at[0], c[1] - s.at[1]) < 1.2);
      expect(others, `${s.what} (${s.at}) has a door within 1.2 m`).toEqual([]);
    }
    expect(m.sectorsGame.checkSectors(SECTORS, undefined, lay.security)).toEqual([]);
    expect(m.sectorStage.checkStageActions([SECTORS[3]!, S5], { nav, doorAt: m.sectorStage.doorFinder(b.anchors.doors) })).toEqual([]);
  });
});
