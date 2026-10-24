/**
 * Saltmarsh Park (`campusOps`) slice 1: section 1, the gatehouse, car park and forecourt (`docs/sector-redesign/SPEC.md`
 * "S1", PLAN "Common to every map slice"). Data and geometry only (the map is built with the pure `LevelBuilder`, as in
 * `tests/sectors.test.ts`): the guards, cameras and routes, the co-op lip CR1 against a solo player (`tests/helpers/
 * soloJumpReach.ts`), the light circuits, the element register E1-E12, the M8 isolation check and the K1 choke.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { MAPS, getMap } from '../src/world/maps';
import { isListedMap } from '../src/world/maps/listed';
import { campusOps, CAMPUS_BOUNDS } from '../src/world/maps/campusOps';
import { CAMPUS_COOP_LIPS } from '../src/world/maps/campusLips';
import { C1_BOX, S1_DOORS, S1_GROUPS, S1_ROOMS, BOLLARD_XS, CANOPY_LAMPS, PARK_COLUMNS_E, PARK_COLUMNS_W } from '../src/world/maps/campusS1';
import { CAMPUS_ALARMS, CAMPUS_SCREEN_CAP, CAMPUS_SECTORS, CAMPUS_SECURITY } from '../src/world/maps/campusSectors';
import { SECTOR, checkSectorGuards, checkSectors, exitZone, inZone, type SectorGuard } from '../src/game/sectors';
import { validateSecurity } from '../src/security/data';
import { CAMERA } from '../src/config/security';
import { ENEMIES } from '../src/ai/enemyDefs';
import { PATROL } from '../src/ai/patrol';
import { PERCEPTION } from '../src/ai/perception';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { HANG, LEDGE } from '../src/world/anchors';
import { hyp2 } from '../src/core/mathx';
import { LIGHT, contribution } from '../src/world/lights';
import { soloJumpThreats, soloTopLandingThreats, MANTLE } from './helpers/soloJumpReach';
import { SightWorld, isolatedInTime, longestIsolation, CHECK_ISOLATION, CHECK_PATROL_PACE, CHECK_SPOT, distToGuard, type CheckGuard } from '../src/game/sectorCheck';

const PI = Math.PI;
const b = new LevelBuilder();
const lay = campusOps.build(b, 0);
const S1 = CAMPUS_SECTORS[0]!;
/**
 * The collision pieces as axis-aligned boxes: `LevelBuilder.wallX / wallZ` make a wall along x as a box turned a quarter
 * turn (yaw PI / 2, depth along its length), so the quarter-turn pieces are swapped to plain boxes (the jump helper and the
 * nav raster below read plain boxes). Any other yaw is left out.
 */
const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}

/** The nav grid of the section 1 rectangle, built from the pieces as `navBuild` does (blockers, fences, cylinders), no seed: every surface is kept. */
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
      if (Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2) out.push({ h: p.c[1] + p.s[1] / 2, bottom: p.c[1] - p.s[1] / 2 });
    }
    return out.sort((a, q) => q.h - a.h);
  };
  const blockers: NavBlocker[] = near.filter((p) => !p.overhead).map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: p.c[1] - p.s[1] / 2, top: p.c[1] + p.s[1] / 2 }));
  for (const f of b.anchors.fences) blockers.push({ cx: (f.a.x + f.b.x) / 2, cz: (f.a.z + f.b.z) / 2, hx: 0.05, hz: f.len / 2, yaw: Math.atan2(f.tx, f.tz), bottom: f.a.y, top: f.a.y + f.height });
  for (const c of b.cylinders) if (c.collide) blockers.push({ cx: c.c[0], cz: c.c[2], hx: c.r, hz: c.r, yaw: 0, bottom: c.c[1] - c.h / 2, top: c.c[1] + c.h / 2, round: true });
  // ladders join the storeys both ways (the nav build's own links)
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
      // the open ground: nothing above it
      if (!out.some((o) => o.h === 0) && ceiling >= 1.7) out.push({ h: 0, ok: true });
      return out.sort((a, q) => a.h - q.h);
    },
  });
}
const nav = analyticNav([-42, -82, 28, -28]);
const onNav = (x: number, z: number, y = 0): boolean => nav.isWalkable(nav.cellOf(x, z, y)) && Math.abs(nav.heightAt(x, z, y) - y) < 0.6;

describe('Saltmarsh Park (campusOps), registration and shape', () => {
  it('is registered, sector only, five nav layers, the SPEC bounds, listed (slice 3)', () => {
    expect(MAPS.some((m) => m.id === 'campusOps')).toBe(true);
    expect(getMap('campusOps')).toBe(campusOps);
    expect(campusOps.modes).toEqual(['sector']);
    expect(campusOps.navLayers).toBe(5);
    expect(isListedMap('campusOps')).toBe(true);
    expect(b.bounds).toEqual({ minX: -70, maxX: 70, minZ: -84, maxZ: 70 });
    expect(CAMPUS_BOUNDS.maxX - CAMPUS_BOUNDS.minX).toBe(140);
    // Warehouse Ops stays as it is: the first sector map (the default)
    expect(MAPS.filter((m) => m.modes.includes('sector')).map((m) => m.id)).toEqual(['warehouseOps', 'campusOps', 'tallowWharf']);
  });

  it('five sections chain (S3-S5 stubs: no guards; S2 is slice 2), valid data, each later one starting at the previous checkpoint', () => {
    expect(CAMPUS_SECTORS.length).toBe(5);
    expect(checkSectors(CAMPUS_SECTORS)).toEqual([]);
    for (let i = 1; i < 5; i++) expect(CAMPUS_SECTORS[i]!.start).toEqual(CAMPUS_SECTORS[i - 1]!.connector!.checkpoint);
    // (slice 3) the stubs have none; S3 is built in full (tests/campusS3.test.ts)
    for (const s of CAMPUS_SECTORS.filter((q) => q.name.endsWith('(stub)'))) expect(s.guards.length, s.id).toBe(0);
    expect(CAMPUS_SECTORS[4]!.extract).toBeTruthy();
    // every stub and S1 connector's near / far doorway and the objective stand on the nav grid (S1 only: the stubs are outside this rectangle)
    expect(lay.playerSpawns.length).toBe(4);
    expect(lay.navSeeds!.length).toBeGreaterThanOrEqual(5);
  });

  it('every doorway of the five connectors has a door anchor at its centre (found by position)', () => {
    const centre = (d: (typeof b.anchors.doors)[number]): [number, number] => [d.hinge.x + (Math.sin(d.yaw) * d.width) / 2, d.hinge.z + (Math.cos(d.yaw) * d.width) / 2];
    const at = (p: readonly [number, number]): boolean => b.anchors.doors.some((d) => hyp2(centre(d)[0] - p[0], centre(d)[1] - p[1]) < 0.3);
    for (const s of CAMPUS_SECTORS) {
      if (!s.connector) continue;
      expect(at(s.connector.nearAt!), `${s.id} near`).toBe(true);
      expect(at(s.connector.farAt!), `${s.id} far`).toBe(true);
      for (const p of s.connector.sealUnlocks ?? []) expect(at(p), `${s.id} seal`).toBe(true);
    }
  });
});

describe('S1 guards (SPEC guard table)', () => {
  const G = S1.guards;
  it('eight guards: kinds and weapons as listed, all armed humans (checkSectorGuards passes), no dogs', () => {
    expect(G.length).toBe(8);
    expect(G.map((g) => g.kind)).toEqual(['officer', 'officer', 'grunt', 'officer', 'officer', 'grunt', 'grunt', 'grunt']);
    expect(G.map((g) => ENEMIES[g.kind].gun)).toEqual(['pistolSd', 'pistolSd', 'rifle', 'pistolSd', 'pistolSd', 'rifle', 'rifle', 'rifle']);
    expect(checkSectorGuards(S1)).toEqual([]);
    expect(S1.dogs ?? 0).toBe(0);
    expect(S1.perStage).toBe(2);
    expect(SECTOR.alarmMax).toBe(3);
    expect(S1.guards.length + SECTOR.alarmMax * S1.perStage).toBeLessThanOrEqual(SECTOR.maxAlive);
  });

  it('every guard has a role, a zone, a reason and a squad; #3 and #4 are a pair; #5 is posted (K1)', () => {
    for (const [i, g] of G.entries()) {
      expect(g.role, `guard ${i + 1} role`).toBeTruthy();
      expect(g.zone, `guard ${i + 1} zone`).toBeTruthy();
      expect(g.reason && g.reason.length > 8, `guard ${i + 1} reason`).toBe(true);
      expect(g.squad, `guard ${i + 1} squad`).not.toBeUndefined();
    }
    expect(G[2]!.pair).toBe(3);
    expect(G[3]!.pair).toBe(2);
    expect(G[4]!.role).toBe('posted');
    expect(G[4]!.zone).toBe('c1');
  });

  /** A guard's patrol cycle (s): the walk at its pace plus the pauses; a timed loop is its master clock's period. */
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

  it('each patrol cycle is 25-45 s; the static guards stand a post', () => {
    const out: string[] = [];
    for (const [i, g] of G.entries()) {
      const c = cycle(g);
      if (c === null) {
        out.push(`#${i + 1} post`);
        continue;
      }
      out.push(`#${i + 1} ${c.toFixed(1)}`);
      expect(c, `#${i + 1} cycle ${c}`).toBeGreaterThanOrEqual(25);
      expect(c, `#${i + 1} cycle ${c}`).toBeLessThanOrEqual(45);
    }
    // the posts: #1 gate officer, #5 doorman, #6 smoker
    expect(out.filter((s) => s.endsWith('post')).map((s) => s.slice(0, 2))).toEqual(['#1', '#5', '#6']);
  });

  it('the pair loop (#3, #4): the same clock, the slower walker fits every leg, stops of 3-6 s', () => {
    for (const k of [2, 3]) {
      const g = G[k]!;
      const lp = g.loop!;
      expect(lp.period).toBe(42);
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
    expect(G[2]!.loop).toEqual(G[3]!.loop);
  });

  it('every guard slot is at least 7 m from the start (SPAWN_MIN_DIST) and stands on the nav grid; every route point too', () => {
    for (const [i, g] of G.entries()) {
      expect(hyp2(g.x - S1.start.x, g.z - S1.start.z), `#${i + 1}`).toBeGreaterThanOrEqual(7);
      expect(onNav(g.x, g.z), `#${i + 1} slot (${g.x}, ${g.z})`).toBe(true);
      for (const p of g.route ?? []) expect(onNav(p[0], p[1]), `#${i + 1} route (${p[0]}, ${p[1]})`).toBe(true);
      expect(distToGuard(g, g.takedownSpot[0], g.takedownSpot[1]), `#${i + 1} takedown spot`).toBeLessThanOrEqual(CHECK_SPOT);
      expect(onNav(g.takedownSpot[0], g.takedownSpot[1]), `#${i + 1} takedown spot on the nav grid`).toBe(true);
    }
    // the first guard of a route starts where its route starts
    for (const g of G) if (g.route) expect(hyp2(g.route[0]![0] - g.x, g.route[0]![1] - g.z)).toBeLessThan(0.1);
  });

  it('the loop pair and the dock sentry turn the way their data says; the doorman faces south (K1)', () => {
    expect(G[4]!.yaw).toBeCloseTo(PI);
    expect(G[4]!.x).toBe(-20);
    expect(G[4]!.z).toBe(-35);
    expect(G[2]!.faces).toEqual([0, 0, 0, 0]);
    expect(G[3]!.faces).toEqual([PI, PI, PI, PI]);
  });
});

describe('S1 cameras, alarm, objective, routes', () => {
  it('two cameras, range 8-12 with a reason, valid security data, both in section 1', () => {
    const cams = CAMPUS_SECURITY.devices.filter((c) => c.section === 0);
    expect(cams.map((c) => c.id)).toEqual(['cam-gate', 'cam-walk']);
    expect(validateSecurity(CAMPUS_SECURITY)).toEqual([]);
    for (const c of cams) {
      expect(c.range!, c.id).toBeGreaterThanOrEqual(8);
      expect(c.range!, c.id).toBeLessThanOrEqual(12);
      expect(c.range!, c.id).toBeLessThanOrEqual(CAMERA.range);
      expect(c.reason.length, c.id).toBeGreaterThan(8);
      expect(c.aim, c.id).toBeDefined();
      expect(c.section, c.id).toBe(0);
    }
    // cam-gate fixed, faces south on its island; cam-walk sweeps 40 degrees south-west to south under the soffit
    expect(cams[0]!.sweep).toBeUndefined();
    expect(cams[0]!.facing).toBe(180);
    expect(cams[1]!.sweep).toEqual([185, 225]);
    expect(lay.security).toBe(CAMPUS_SECURITY);
    // cam-walk hangs under the canopy soffit (4.2), not above it
    expect(cams[1]!.y).toBeLessThan(4.2);
  });

  it('the alarm panel is in the gatehouse by its door; the layout carries it', () => {
    expect(CAMPUS_ALARMS.filter((q) => q.section === 0).length).toBe(1);
    const a = lay.alarms!.filter((q) => q.section === 0)[0]!;
    expect(a.section).toBe(0);
    expect(a.pos.x).toBeGreaterThan(14);
    expect(a.pos.x).toBeLessThan(20);
    expect(a.pos.z).toBeGreaterThan(-79);
    expect(a.pos.z).toBeLessThan(-73);
  });

  it('the objective: a download at the gatehouse PC (19.3, -76), reachable from the window; every route starts at the start, passes the objective and ends in C1', () => {
    expect(S1.objective).toMatchObject({ kind: 'download', x: 19.3, z: -76 });
    // (L2) a player at the open window (the wall face 20.15 + the 0.3 body) is inside the default interact reach 1.8
    expect(hyp2(S1.objective.x - 20.45, S1.objective.z + 76)).toBeLessThan(1.8);
    expect(SECTOR.downloadTime).toBe(10);
    expect(SECTOR.downloadRange).toBe(4);
    expect(S1.routes.length).toBeGreaterThanOrEqual(2);
    const exit = exitZone(S1)!;
    for (const r of S1.routes) {
      const first = r.pts[0]!;
      const at = r.pts[r.obj]!;
      const last = r.pts[r.pts.length - 1]!;
      expect(hyp2(first[0] - S1.start.x, first[1] - S1.start.z), r.name).toBeLessThan(0.5);
      expect(hyp2(at[0] - S1.objective.x, at[1] - S1.objective.z), r.name).toBeLessThanOrEqual(SECTOR.downloadRange);
      expect(inZone(exit, last[0], last[2] ?? 0, last[1]), r.name).toBe(true);
    }
    expect(new Set(S1.routes.map((r) => JSON.stringify(r.pts))).size).toBe(S1.routes.length);
    expect(S1.reinforce).toEqual([[11, -79], [-33, -41]]);
    for (const [x, z] of S1.reinforce) expect(onNav(x, z), `reinforce (${x}, ${z})`).toBe(true);
  });

  it('every route point is on the nav grid and every walked leg has a nav path (ladder and drop legs are the route\'s `climbs`)', () => {
    for (const r of S1.routes) {
      r.pts.forEach((p, i) => expect(onNav(p[0], p[1], p[2] ?? 0), `${r.name} point ${i} (${p})`).toBe(true));
      for (let i = 0; i + 1 < r.pts.length; i++) {
        if ((r.climbs ?? []).includes(i)) continue;
        const a = r.pts[i]!;
        const c = r.pts[i + 1]!;
        const path = nav.findPath([a[0], a[1]], [c[0], c[1]], 100000, a[2] ?? 0, c[2] ?? 0);
        expect(path, `${r.name} leg ${i}: ${a} -> ${c}`).not.toBeNull();
        let len = 0;
        let q: [number, number] = [a[0], a[1]];
        for (const w of path!) {
          len += hyp2(w[0] - q[0], w[1] - q[1]);
          q = [w[0], w[1]];
        }
        expect(len, `${r.name} leg ${i} detour`).toBeLessThanOrEqual(hyp2(c[0] - a[0], c[1] - a[1]) * 2.5 + 6);
      }
    }
  });

  it('the spawns and hide spots stand on the nav grid; the ground reaches the plant roof by the ladder only', () => {
    for (const s of lay.playerSpawns) expect(onNav(s.pos.x, s.pos.z), `spawn ${s.pos.x}`).toBe(true);
    for (const h of lay.hideSpots!.filter((q) => q.pos.z < -32)) expect(onNav(h.pos.x, h.pos.z), `hide (${h.pos.x}, ${h.pos.z})`).toBe(true);
    const up = nav.findPath([24, -79], [-33, -37], 100000, 0, 4.4);
    expect(up).not.toBeNull();
    expect(up!.some((w) => w.link?.kind === 'ladder')).toBe(true);
  });
});

describe('CR1: the canopy east lip against a solo player (SPEC Campus-wide rules 1-5)', () => {
  const cr1 = CAMPUS_COOP_LIPS[0]!;
  const grip = (l: (typeof CAMPUS_COOP_LIPS)[number]): { y: number; a: { x: number; z: number }; b: { x: number; z: number }; n: { x: number; z: number } } => ({ y: l.lip.y, a: { x: l.lip.x, z: l.lip.z0 }, b: { x: l.lip.x, z: l.lip.z1 }, n: l.lip.n });
  it('CR1 is the canopy east edge: x -14, z -40..-34, top 4.4 over a floor-0 boost at (-13.5, -38)', () => {
    expect(cr1.id).toBe('CR1');
    expect(cr1.lip).toMatchObject({ x: -14, z0: -40, z1: -34, y: 4.4 });
    expect(cr1.boost).toEqual({ floor: 0, x: -13.5, z: -38 });
    // the canopy slab: top 4.4 (rule 1: 4.3-4.5 over the floor it is boosted from)
    const slab = solid.find((p) => Math.abs(p.c[1] + p.s[1] / 2 - 4.4) < 1e-6 && Math.abs(p.c[0] + 16.7) < 1e-6 && Math.abs(p.c[2] + 37) < 1e-6)!; // (A65) the east piece of the slab around the hatch
    expect(slab).toBeTruthy();
    expect(slab.c[1] + slab.s[1] / 2 - cr1.boost.floor).toBeGreaterThanOrEqual(4.3);
    expect(slab.c[1] + slab.s[1] / 2 - cr1.boost.floor).toBeLessThanOrEqual(4.5);
    expect(slab.c[0] + slab.s[0] / 2).toBeCloseTo(-14);
  });

  for (const l of CAMPUS_COOP_LIPS) {
    it(`${l.id}: no solo running jump reaches the lip (0.5 m margin) and none lands on the canopy top`, () => {
      expect(soloJumpThreats(solid, grip(l), () => false, 0.5)).toEqual([]);
      expect(soloTopLandingThreats(solid, l.top, () => false, 0.5)).toEqual([]);
    });
  }

  it('headroom (rule 5): clear air from the lip top + 0.1 to 6.2 over its face, 0.45 + HANG.out in and out to the lip', () => {
    const l = cr1.lip;
    const x0 = l.x - (0.45 + HANG.out);
    const x1 = l.x + 0.4;
    const hit = solid.filter((p) => p.c[0] + p.s[0] / 2 > x0 && p.c[0] - p.s[0] / 2 < x1 && p.c[2] + p.s[2] / 2 > l.z0 && p.c[2] - p.s[2] / 2 < l.z1 && p.c[1] + p.s[1] / 2 > l.y + 0.1 && p.c[1] - p.s[1] / 2 < 6.2);
    expect(hit.map((p) => p.c)).toEqual([]);
    expect(b.cylinders.filter((c) => c.c[0] + c.r > x0 && c.c[0] - c.r < x1 && c.c[2] + c.r > l.z0 && c.c[2] - c.r < l.z1 && c.c[1] + c.h / 2 > l.y + 0.1).length).toBe(0);
  });

  it('rule 2: nothing solo-standable at 1.2 m or higher within 4 m in plan of either lip', () => {
    for (const l of CAMPUS_COOP_LIPS) {
      const x0 = Math.min(l.lip.x, l.lip.x) - 4;
      const bad = solid.filter((p) => {
        const t = p.c[1] + p.s[1] / 2;
        if (t < 1.2 || t >= l.lip.y - 0.05) return false;
        if (Math.min(p.s[0], p.s[2]) < LEDGE.climbDepth) return false;
        if (p.noLedge && t > MANTLE) return false;
        const gx = Math.max(0, Math.abs(p.c[0] - l.lip.x) - p.s[0] / 2);
        const gz = Math.max(0, Math.max(l.lip.z0 - (p.c[2] + p.s[2] / 2), p.c[2] - p.s[2] / 2 - l.lip.z1));
        return hyp2(gx, gz) <= 4 && x0 < 1e9;
      });
      expect(bad.map((p) => [p.c, p.s]), l.id).toEqual([]);
    }
  });

  it('rule 3: nothing under the canopy east and south edges (no wall below the lip, nothing within 1 m of it below)', () => {
    // the strips along the E edge (x -15..-13, z -40.8..-34.3) and the S edge (x -25.8..-14.2, z -41..-39), below the soffit
    const under = solid.filter((p) => {
      const top = p.c[1] + p.s[1] / 2;
      const bottom = p.c[1] - p.s[1] / 2;
      if (top < 0.3 || bottom > 4.1 || top > 4.19) return false;
      const eastEdge = p.c[0] + p.s[0] / 2 > -15 && p.c[0] - p.s[0] / 2 < -13 && p.c[2] + p.s[2] / 2 > -40.8 && p.c[2] - p.s[2] / 2 < -34.3;
      const southEdge = p.c[0] + p.s[0] / 2 > -25.8 && p.c[0] - p.s[0] / 2 < -14.2 && p.c[2] + p.s[2] / 2 > -41 && p.c[2] - p.s[2] / 2 < -39;
      return eastEdge || southEdge;
    });
    expect(under.map((p) => [p.c, p.s])).toEqual([]);
  });

  it('rule 6: boxes 1.9-4.2 high that are not planned routes are noLedge (the bin store, plant room ladder and gatehouse are the planned ones)', () => {
    const planned = (p: BoxPiece): boolean => {
      // the bin store's 3.0 walls (the wall-jump corner, E4)
      if (Math.abs(p.s[1] - 3.0) < 1e-6 && p.c[0] > -40.2 && p.c[0] < -29.8 && p.c[2] > -52.2 && p.c[2] < -44.8) return true;
      return false;
    };
    for (const p of solid) {
      const h = p.s[1];
      if (h < 1.9 || h > 4.2 || p.c[2] < -80 || p.c[2] > -30 || p.c[0] < -45 || p.c[0] > 30) continue;
      if (p.c[1] - p.s[1] / 2 > 0.01) continue;
      if (planned(p)) continue;
      // fences are not pieces; the perimeter walls are the map's edge; the car boxes are 1.5
      expect(p.noLedge, `${JSON.stringify(p.c)} ${JSON.stringify(p.s)}`).toBe(true);
    }
  });

  it('rule 7: the canopy top is also reached alone by the plant-roof ladder (the high route), and the ladder is caged', () => {
    const lad = b.anchors.ladders.find((l) => Math.abs(l.base.x + 38) < 0.1)!;
    expect(lad).toBeTruthy();
    expect(lad.top.y).toBe(4.4);
    const high = S1.routes.find((r) => r.climbs && r.climbs.length > 0)!;
    expect(high.pts.some((p) => (p[2] ?? 0) === 4.4 && p[0] > -26)).toBe(true);
    // the parapets on the plant roof's S and W edges are 1.1 and noLedge
    const parapets = solid.filter((p) => Math.abs(p.s[1] - 1.1) < 1e-6 && Math.abs(p.c[1] - 4.95) < 1e-6 && p.c[2] < -32);
    expect(parapets.length).toBe(3);
    expect(parapets.every((p) => p.noLedge)).toBe(true);
  });
});

describe('S1 lighting (SPEC "Lighting")', () => {
  const lights = b.lights.lights;
  const group = (g: number) => lights.filter((l) => l.group === g);

  it('the circuits: s1-park-w 8 columns, s1-park-e 6, the bollards, the gatehouse, 4 canopy downlights, a lane floodlight with no switch', () => {
    expect(PARK_COLUMNS_W.length).toBe(8);
    expect(PARK_COLUMNS_E.length).toBe(6);
    expect(group(S1_GROUPS.parkW).length).toBe(8);
    expect(group(S1_GROUPS.parkE).length).toBe(6);
    expect(group(S1_GROUPS.parkW).every((l) => l.y === 6.0)).toBe(true);
    expect(group(S1_GROUPS.fore).filter((l) => l.y < 1).length).toBe(BOLLARD_XS.length);
    expect(group(S1_GROUPS.gate).length).toBe(1);
    expect(group(S1_GROUPS.canopy).length).toBe(CANOPY_LAMPS.length);
    expect(group(S1_GROUPS.lane).length).toBe(1);
    expect(lay.switches!.some((s) => s.group === S1_GROUPS.lane)).toBe(false);
    // every lit lamp is shootable and electric (cut, shot or jammed)
    for (const l of lights.filter((q) => q.intensity > 0)) {
      expect(l.destructible && l.electric, `lamp ${l.id}`).toBe(true);
    }
  });

  it('the switches: the feeder pillar board cuts the west and east halves (E5), the yard board the forecourt, the gatehouse by its door, the canopy inside C1', () => {
    const sw = lay.switches!;
    const west = sw.find((s) => s.group === S1_GROUPS.parkW)!;
    const east = sw.find((s) => s.group === S1_GROUPS.parkE)!;
    expect(hyp2(west.pos.x + 31, west.pos.z + 47)).toBeLessThan(1.5);
    expect(hyp2(east.pos.x + 31, east.pos.z + 47)).toBeLessThan(1.5);
    const fore = sw.find((s) => s.group === S1_GROUPS.fore)!;
    expect(fore.pos.z).toBeCloseTo(-40.3);
    const gate = sw.find((s) => s.group === S1_GROUPS.gate)!;
    expect(hyp2(gate.pos.x - S1_DOORS.gatehouse[0], gate.pos.z - S1_DOORS.gatehouse[1])).toBeLessThan(2.5);
    const can = sw.find((s) => s.group === S1_GROUPS.canopy)!;
    expect(inZone({ label: 'c1', box: [C1_BOX[0], C1_BOX[1], C1_BOX[2], C1_BOX[3]] }, can.pos.x, 0, can.pos.z)).toBe(true);
    // the west columns sit west of the east columns (one board cuts one half)
    expect(Math.max(...PARK_COLUMNS_W.map((p) => p[0]))).toBeLessThan(Math.min(...PARK_COLUMNS_E.map((p) => p[0])));
    // a cut circuit is true dark: the standby fill under the shadow line (LS: ambientZone 0.14, LR7)
    expect(b.lights.zoneAt(-28, 0, -58)).toBe(0.14);
    expect(b.lights.zoneAt(-28, 0, -58)).toBeLessThan(0.28);
    expect(b.lights.zoneAt(-20, 0, -32)).toBe(0.3);
  });

  it('dark by reason: no lit lamp on the verge, in the bin store, under the bike shelter, on the plant roof or the canopy top', () => {
    const lit = lights.filter((l) => l.on && l.intensity > 0);
    const inBox = (l: { x: number; y: number; z: number }, x0: number, x1: number, z0: number, z1: number, y0 = -1, y1 = 9): boolean => l.x >= x0 && l.x <= x1 && l.z >= z0 && l.z <= z1 && l.y >= y0 && l.y <= y1;
    expect(lit.filter((l) => inBox(l, 20, 26, -80, -56)).length).toBe(0);
    expect(lit.filter((l) => inBox(l, -40, -30, -52, -45)).length).toBe(0);
    expect(lit.filter((l) => inBox(l, -10, 0, -50, -46)).length).toBe(0);
    expect(lit.filter((l) => inBox(l, -40, -26, -40, -34, 4)).length).toBe(0);
    expect(lit.filter((l) => inBox(l, -26, -14, -40, -34, 4.3)).length).toBe(0);
    // the bike shelter's fitting is tagged out: a dead lamp is there
    expect(lights.some((l) => inBox(l, -10, 0, -50, -46, 1, 3) && l.intensity === 0 && !l.on)).toBe(true);
  });

  it('(the co-op east end of the kerb) the boost point (-13.5, -38) is dark: no bollard or column within its radius, the canopy lamps stop short of it', () => {
    const [bx, bz] = [CAMPUS_COOP_LIPS[0]!.boost.x, CAMPUS_COOP_LIPS[0]!.boost.z];
    for (const l of lights.filter((q) => q.on && q.intensity > 0 && q.group !== S1_GROUPS.canopy)) expect(hyp2(l.x - bx, l.z - bz) > l.radius || l.y > 5, `lamp ${l.id} (${l.x}, ${l.z})`).toBe(true);
  });
});

describe('S1 element register E1-E12 (SPEC)', () => {
  it('E1 the cut fence panel (24, -80): the south fence has a 1.2 m gap there', () => {
    const f = b.anchors.fences.filter((q) => Math.abs(q.a.z + 80) < 0.01 && Math.abs(q.b.z + 80) < 0.01);
    const ends = f.flatMap((q) => [q.a.x, q.b.x]);
    expect(ends).toContain(23.4);
    expect(ends).toContain(24.6);
    expect(f.some((q) => Math.min(q.a.x, q.b.x) < 24 && Math.max(q.a.x, q.b.x) > 24)).toBe(false);
  });
  it('E2 the gatehouse rear window is open (20, -76) and the PC desk is behind it', () => {
    const w = b.anchors.all.find((a) => a.kind === 'window' && Math.abs(a.c.x - 20) < 0.01 && Math.abs(a.c.z + 76) < 0.01);
    expect(w && 'open' in w && w.open).toBe(true);
    expect(hyp2(S1.objective.x - 20, S1.objective.z + 76)).toBeLessThan(2);
  });
  it('E3 weldmesh fences 2.4 round the site', () => {
    expect(b.anchors.fences.length).toBeGreaterThanOrEqual(7);
    expect(b.anchors.fences.filter((f) => f.a.z < -30).every((f) => f.height === 2.4)).toBe(true);
  });
  it('E4 the bin-store walls 3.0 (west, north, east; open south)', () => {
    const walls = solid.filter((p) => Math.abs(p.s[1] - 3.0) < 1e-6 && p.c[0] > -40.2 && p.c[0] < -29.8 && p.c[2] > -52.2 && p.c[2] < -44.8);
    expect(walls.length).toBe(3);
  });
  it('E5 the feeder pillar and its two breakers (-31, -47)', () => {
    expect(solid.some((p) => Math.abs(p.c[0] + 31.4) < 0.01 && Math.abs(p.s[1] - 1.5) < 0.01)).toBe(true);
    expect(lay.switches!.filter((s) => hyp2(s.pos.x + 31, s.pos.z + 47) < 1.5).map((s) => s.group).sort()).toEqual([S1_GROUPS.parkW, S1_GROUPS.parkE]);
  });
  it('E6 fourteen parked cars (roofs 1.5), none within 4 m in plan of the canopy lip', () => {
    const cars = solid.filter((p) => Math.abs(p.s[0] - 1.8) < 1e-6 && Math.abs(p.s[1] - 1.5) < 1e-6 && Math.abs(p.s[2] - 4.2) < 1e-6);
    expect(cars.length).toBe(14);
    for (const c of cars) {
      const gx = Math.max(0, Math.abs(c.c[0] + 14) - c.s[0] / 2);
      const gz = Math.max(0, Math.max(-40 - (c.c[2] + c.s[2] / 2), c.c[2] - c.s[2] / 2 + 34));
      expect(hyp2(gx, gz)).toBeGreaterThan(4);
    }
  });
  it('E7 the bike and smoking shelters (roofs 2.4), at least 4 m from the lip', () => {
    const roofs = solid.filter((p) => Math.abs(p.c[1] + p.s[1] / 2 - 2.4) < 1e-6 && p.c[2] > -51 && p.c[2] < -45);
    expect(roofs.length).toBe(2);
    for (const r of roofs) {
      const gx = Math.max(0, Math.abs(r.c[0] + 14) - r.s[0] / 2);
      const gz = Math.max(0, Math.max(-40 - (r.c[2] + r.s[2] / 2), r.c[2] - r.s[2] / 2 + 34));
      expect(hyp2(gx, gz)).toBeGreaterThan(4);
    }
  });
  it('E8 the entrance canopy: a free-standing top 4.4 (soffit 4.2) on four columns', () => {
    const slab = solid.find((p) => Math.abs(p.c[0] + 16.7) < 1e-6 && Math.abs(p.c[2] + 37) < 1e-6 && Math.abs(p.s[0] - 5.4) < 1e-6)!; // (A65) a slab piece beside the hatch
    expect(slab.c[1] + slab.s[1] / 2).toBeCloseTo(4.4);
    expect(slab.c[1] - slab.s[1] / 2).toBeCloseTo(4.2);
    expect(b.cylinders.filter((c) => c.h === 4.2 && c.r === 0.15).length).toBe(4);
  });
  it('E9 the plant roof 4.4 with its parapets and the caged ladder (-38, -41)', () => {
    expect(solid.some((p) => Math.abs(p.c[0] + 33) < 1e-6 && Math.abs(p.c[2] + 37) < 1e-6 && Math.abs(p.c[1] + p.s[1] / 2 - 4.4) < 1e-6)).toBe(true);
    expect(b.anchors.ladders.some((l) => Math.abs(l.base.x + 38) < 0.1 && l.top.y === 4.4)).toBe(true);
  });
  it('E10 the kerb and the facade planters (0.7, under rule 2)', () => {
    expect(solid.some((p) => Math.abs(p.s[1] - 0.15) < 1e-6 && Math.abs(p.c[2] + 46.15) < 1e-6)).toBe(true);
    const planters = solid.filter((p) => Math.abs(p.s[1] - 0.7) < 1e-6 && Math.abs(p.c[2] + 35.6) < 1e-6);
    expect(planters.length).toBe(3);
  });
  it('E11 the column lamps, the bollards and the lane floodlight are real registry lights', () => {
    expect(b.lights.lights.filter((l) => l.group >= 40 && l.group <= 49).length).toBeGreaterThanOrEqual(8 + 6 + BOLLARD_XS.length + 1 + 4 + 1);
  });
  it('E12 the dock door (-33, -40) is locked and opens when C1 seals (the connector\'s sealUnlocks)', () => {
    const d = b.anchors.doors.find((q) => Math.abs(q.hinge.x + 33.6) < 0.01 && Math.abs(q.hinge.z + 40) < 0.01)!;
    expect(d.locked).toBe(true);
    expect(S1.connector!.sealUnlocks).toEqual([[-33, -40]]);
    expect(b.anchors.doors.find((q) => Math.abs(q.hinge.x - C1_BOX[0] - 3.4) < 0.01 && Math.abs(q.hinge.z + 34) < 0.01)?.locked).toBe(true);
  });
  it('the rooms (HUD tags) do not overlap and none carries a squad', () => {
    for (let i = 0; i < S1_ROOMS.length; i++)
      for (let j = i + 1; j < S1_ROOMS.length; j++) {
        const a = S1_ROOMS[i]!;
        const c = S1_ROOMS[j]!;
        const ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX);
        const oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
        const oy = Math.min(a.maxY ?? Infinity, c.maxY ?? Infinity) - Math.max(a.minY ?? -Infinity, c.minY ?? -Infinity);
        expect(ox > 0.01 && oz > 0.01 && oy > 0.01, `${a.id} overlaps ${c.id}`).toBe(false);
      }
    expect(S1_ROOMS.every((r) => (r.squad ?? []).length === 0)).toBe(true);
  });
});

describe('M8: isolation in time at each takedown spot (sectorCheck, the Warehouse tests\' check)', () => {
  const world = new SightWorld(b.boxes, b.cylinders);
  const timed: CheckGuard[] = S1.guards.map((g) => {
    const speed = ENEMIES[g.kind].walkSpeed * (g.loop ? 1 : CHECK_PATROL_PACE);
    return { x: g.x, z: g.z, route: g.route as readonly (readonly [number, number])[] | undefined, wait: g.wait, waits: g.waits, speed, loop: g.loop };
  });
  /** (A2) A spot is isolated when no other guard sees it within 15 m for CHECK_ISOLATION s in a row on their timed patrols. */
  it('records each guard\'s longest isolated run at its spot; the loners (#5 behind the doorman, #6, #7 at the bin store, #8) hold 3 s', () => {
    const rows = S1.guards.map((g, i) => ({ n: i + 1, run: longestIsolation(world, timed, i, 15, g.takedownSpot), ok: isolatedInTime(world, timed, i, g.takedownSpot) }));
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(rows.map((r) => `#${r.n} ${r.run}s ${r.ok ? 'ok' : 'NOT isolated'}`).join('\n'));
    // the two pairs (the gatehouse's #1 and #2 in one lit room, the car park's #3 and #4 walking together) are each other's
    // overlap partner (LS 4.5): their takedowns come by a lure, not by isolation in time (recorded exceptions); every
    // other guard must have its isolation moment
    const must = rows.filter((r) => ![1, 2, 3, 4].includes(r.n));
    expect(must.filter((r) => !r.ok).map((r) => `#${r.n}`)).toEqual([]);
    expect(CHECK_ISOLATION).toBe(3);
  });
});

describe('K1 (M12): the doorman is an unavoidable posted guard at the C1 near door', () => {
  const post = S1.guards[4]!;
  it('the data: role posted, zone c1, leash 5, guards c1-door (`SquadSlot.post`)', () => {
    expect(post.role).toBe('posted');
    expect(post.zone).toBe('c1');
    expect(post.post).toEqual({ leash: 5, guards: 'c1-door' });
  });

  it('the leash edge is at least 1 m off the near door\'s nav cell, so a lure opens the way', () => {
    const leash = post.post!.leash;
    const door = S1_DOORS.c1Near;
    const cell = nav.center(nav.cellOf(door[0], door[1], 0));
    const dPost = hyp2(cell[0] - post.x, cell[1] - post.z);
    // the door is inside the leash circle, 1 m behind him (he faces south): the lure draws him away from it, never onto it
    expect(dPost).toBeLessThan(leash);
    expect(leash - dPost).toBeGreaterThanOrEqual(1);
    // and the door lies behind his facing (north of the post)
    expect(door[1]).toBeGreaterThan(post.z);
  });

  it('with his view cone (focus 25 m / 27.5 deg, peripheral 12 m / 100 deg, facing south from the post) as a nav blocker no route joins the verge to the C1 near door; without it one does', () => {
    const from: [number, number] = [S1.start.x, S1.start.z];
    const to: [number, number] = [S1_DOORS.c1Near[0], S1_DOORS.c1Near[1]];
    expect(nav.findPath(from, to, 1e6, 0, 0)).not.toBeNull();
    const fx = Math.sin(post.yaw);
    const fz = Math.cos(post.yaw);
    const inCone = (x: number, z: number): boolean => {
      const dx = x - post.x;
      const dz = z - post.z;
      const d = hyp2(dx, dz);
      if (d < 1e-6) return true;
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d)));
      return (d <= PERCEPTION.focusRange && ang <= PERCEPTION.focusHalf) || (d <= PERCEPTION.periphRange && ang <= PERCEPTION.periphHalf);
    };
    const blocked: number[] = [];
    for (let i = 0; i < nav.walk.length; i++) {
      if (!nav.walk[i]) continue;
      // only the ground storey he stands on (the canopy top is over his head)
      if (Math.abs(nav.height[i]! - 0) > 1.7) continue;
      const [x, z] = nav.center(i % nav.cols);
      if (inCone(x, z)) {
        blocked.push(i);
        nav.walk[i] = 0;
      }
    }
    try {
      expect(blocked.length).toBeGreaterThan(50);
      expect(nav.findPath(from, to, 1e6, 0, 0)).toBeNull();
      // the door's pocket is not itself in the cone (a lure can open it): the cell behind him is free
      const behind = nav.cellOf(post.x, post.z + 0.75, 0);
      expect(nav.isWalkable(behind)).toBe(true);
    } finally {
      for (const i of blocked) nav.walk[i] = 1;
    }
    expect(nav.findPath(from, to, 1e6, 0, 0)).not.toBeNull();
  });
});

describe('CR1 hatch and A68 margin (sector-redesign fix round)', () => {
  const post = S1.guards[4]!;
  const covers = (p: BoxPiece, x: number, y: number, z: number): boolean => Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(y - p.c[1]) <= p.s[1] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2;

  it('(A65) the canopy hatch x -20.6..-19.4, z -36.4..-35.3 is open: no collision box covers its centre or corners at slab height', () => {
    for (const [x, z] of [[-20, -35.85], [-20.5, -36.3], [-19.5, -36.3], [-20.5, -35.4], [-19.5, -35.4]] as const)
      expect(solid.some((p) => covers(p, x, 4.3, z)), `hatch point ${x}, ${z}`).toBe(false);
    // the slab is still there around it
    expect(solid.some((p) => covers(p, -21, 4.3, -35.85))).toBe(true);
    expect(solid.some((p) => covers(p, -20, 4.3, -37.5))).toBe(true);
    expect(solid.some((p) => covers(p, -20, 4.3, -34.8))).toBe(true);
  });

  it('(A65) the takedown spot (-20, 4.4, -36.7) is on the canopy top, within 2.2 m of the doorman (plan), a 1.1-4.6 m drop, with a clear eye ray through the hatch', () => {
    const [sx, sy, sz] = [-20, 4.4, -36.7];
    expect(solid.some((p) => covers(p, sx, 4.3, sz))).toBe(true);
    expect(hyp2(sx - post.x, sz - post.z)).toBeLessThanOrEqual(2.2);
    expect(sy - 0).toBeGreaterThanOrEqual(1.1);
    expect(sy - 0).toBeLessThanOrEqual(4.6);
    // eye (1.6 m up) to the guard's chest (1.2 m): sample the ray against the collision boxes
    const [ey, gy] = [sy + 1.6, 1.2];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const [x, y, z] = [sx + (post.x - sx) * t, ey + (gy - ey) * t, sz + (post.z - sz) * t];
      expect(solid.some((p) => covers(p, x, y, z)), `ray at t=${t}`).toBe(false);
    }
  });

  it('(A65) the east downlights moved to x -18.5, radius 4.5: the boost point (-13.5, -38) reads under the shadow line', () => {
    expect(CANOPY_LAMPS.map((l) => l[0]).sort((p, q) => p - q)).toEqual([-23, -23, -18.5, -18.5]);
    const [bx, bz] = [CAMPUS_COOP_LIPS[0]!.boost.x, CAMPUS_COOP_LIPS[0]!.boost.z];
    let level = b.lights.ambientAt(bx, 0.9, bz);
    for (const l of b.lights.lights) level += contribution(l, bx, 0.9, bz);
    expect(level).toBeLessThan(LIGHT.shadow);
  });

  it('(A99) no S1 guard is dormant: the fence patrol (#7) was tagged only for A64 margin (A68), and S1 has 8 guards (under the screen cap)', () => {
    expect(S1.guards.map((g, i) => (g.dormant ? i + 1 : 0)).filter((n) => n > 0)).toEqual([]);
    expect(S1.guards.length).toBeLessThanOrEqual(CAMPUS_SCREEN_CAP);
  });
});
