/**
 * Saltmarsh Park (`campusOps`) slice 2: section 2, the HQ atrium and offices (`docs/sector-redesign/SPEC.md` "S2", PLAN
 * "Common to every map slice"). Data and geometry only (the map is built with the pure `LevelBuilder`, as in
 * `tests/campusS1.test.ts`): the 12 guards, cameras, routes, the co-op lip CR2 against a solo player, the light circuits,
 * the M8 isolation check, the K2 choke (the bridge officer) and the screen count (A99: no more than `CAMPUS_SCREEN_CAP` guards in
 * view from any walkable point, every guard counted).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { buildCampus, campusOps } from '../src/world/maps/campusOps';
import { S1_GROUPS } from '../src/world/maps/campusS1';
import { CAMPUS_COOP_LIPS } from '../src/world/maps/campusLips';
import { BALCONY_LAMPS, BULKHEAD_TOP, C2_BOX, C2_FLOOR, CR2, FEATURE_STAIR, PENDANTS, S2_COOP_LIPS, S2_CORES, S2_DOORS, S2_FLIGHTS, S2_FLOORS, S2_GROUPS, S2_ROOMS, S2_VOID, SW_CORE, NE_CORE, coreFlights, type Flight } from '../src/world/maps/campusS2';
import { CAMPUS_ALARMS, CAMPUS_SCREEN_CAP, CAMPUS_SECTORS, CAMPUS_SECURITY } from '../src/world/maps/campusSectors';
import { SECTOR, checkSectorGuards, checkSectors, exitZone, inZone, type SectorGuard } from '../src/game/sectors';
import { validateSecurity } from '../src/security/data';
import { CAMERA } from '../src/config/security';
import { ENEMIES } from '../src/ai/enemyDefs';
import { PATROL } from '../src/ai/patrol';
import { EYE_STAND, PERCEPTION } from '../src/ai/perception';
import { roomAt } from '../src/world/rooms';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { HANG, LEDGE, generateLedges } from '../src/world/anchors';
import { hyp2, hyp3 } from '../src/core/mathx';
import { LIGHT, contribution } from '../src/world/lights';
import { soloJumpThreats, soloTopLandingThreats, MANTLE } from './helpers/soloJumpReach';
import { dressingOn } from '../src/world/detailPass';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { bakedLights } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField, type FieldDoor } from '../src/world/lightField';
import { moonLight } from '../src/world/lampMath';
import { SightWorld, isolatedInTime, longestIsolation, guardPoints, CHECK_ISOLATION, CHECK_PATROL_PACE, CHECK_SPOT, CHECK_EYE, distToGuard, type CheckGuard } from '../src/game/sectorCheck';

const PI = Math.PI;
const b = new LevelBuilder();
const lay = campusOps.build(b, 0);
/** The undressed greybox: the screen count (A99) reads its sight lines here, as invisible dressing (chairs, shelves) must not block them. */
const bG = new LevelBuilder();
buildCampus(bG, { dress: false });
const S2 = CAMPUS_SECTORS[1]!;
/**
 * The collision pieces as axis-aligned boxes (S2's are all plain; S1's walls are quarter-turn boxes, swapped to plain; anything
 * else, stair ramps included, is left out: the nav raster below reads the flights from `S2_FLIGHTS`).
 */
const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}

/** The stair flight's ramp surface at (x, z): its height, or NaN outside it. */
function flightH(f: Flight, x: number, z: number): number {
  const dx = x - f.cx;
  const dz = z - f.cz;
  const along = dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw);
  const across = dx * Math.cos(f.yaw) - dz * Math.sin(f.yaw);
  if (Math.abs(across) > f.w / 2 || Math.abs(along) > f.len / 2) return Number.NaN;
  return f.y0 + (f.rise * (along + f.len / 2)) / f.len;
}

/** The nav grid of the section 2 rectangle, built from the pieces as `navBuild` does (blockers, fences, cylinders, stairs), no seed: every surface is kept. */
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
    // the stair ramps (a 0.3 slab under the surface)
    for (const f of S2_FLIGHTS) {
      const h = flightH(f, x, z);
      if (h === h) out.push({ h, bottom: h - 0.35 });
    }
    return out.sort((a, q) => q.h - a.h);
  };
  const blockers: NavBlocker[] = near.filter((p) => !p.overhead).map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: p.c[1] - p.s[1] / 2, top: p.c[1] + p.s[1] / 2 }));
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
      // the open ground: nothing above it
      if (!out.some((o) => o.h === 0) && ceiling >= 1.7) out.push({ h: 0, ok: true });
      return out.sort((a, q) => a.h - q.h);
    },
  });
}
const nav = analyticNav([-46, -34, 12, 8]);
const onNav = (x: number, z: number, y = 0): boolean => nav.isWalkable(nav.cellOf(x, z, y)) && Math.abs(nav.heightAt(x, z, y) - y) < 0.6;
const floorOf = (g: { y?: number }): number => g.y ?? 0;
/** A walkable nav cell on floor y within r of (x, z): a switch or panel stands on a wall, its user beside it. */
const nearNav = (x: number, z: number, y: number, r = 1.1): boolean => {
  for (let dx = -r; dx <= r; dx += 0.25) for (let dz = -r; dz <= r; dz += 0.25) if (hyp2(dx, dz) <= r && onNav(x + dx, z + dz, y)) return true;
  return false;
};

describe('Saltmarsh Park section 2 (HQ), registration and shape', () => {
  it('the map keeps five chained sections; S2 is a hack with 12 guards, its connector C2 is on L1, S3 starts at its checkpoint', () => {
    expect(CAMPUS_SECTORS.length).toBe(5);
    expect(checkSectors(CAMPUS_SECTORS)).toEqual([]);
    for (let i = 1; i < 5; i++) expect(CAMPUS_SECTORS[i]!.start).toEqual(CAMPUS_SECTORS[i - 1]!.connector!.checkpoint);
    expect(S2.id).toBe('s2');
    expect(S2.objective.kind).toBe('hack');
    expect(S2.guards.filter((g) => g.minPlayers === undefined).length).toBe(12); // the base list; the coop4 tags are in sectorGuardTags.test.ts
    expect(S2.connector!.floorY).toBe(C2_FLOOR);
    expect(S2.connector!.box).toEqual([C2_BOX[0], C2_BOX[1], C2_BOX[2], C2_BOX[3]]);
    expect(S2.connector!.nearAt).toEqual([...S2_DOORS.c2Near]);
    expect(S2.connector!.checkpoint).toEqual({ x: 7, y: C2_FLOOR, z: -14, yaw: PI / 2 });
    // S1's start/cp chain: S2 starts at C1's checkpoint
    expect(S2.start).toEqual(CAMPUS_SECTORS[0]!.connector!.checkpoint);
    expect(S2.perStage).toBe(2);
    expect(S2.dogs ?? 0).toBe(0);
    expect(SECTOR.alarmMax).toBe(3);
    expect(S2.guards.length + SECTOR.alarmMax * S2.perStage).toBeLessThanOrEqual(SECTOR.maxAlive);
  });

  it('the bridge C2 is built: a floor slab at 4.4 over x 4..10, the card door in the east wall on L1, walls, a roof', () => {
    const floor = solid.find((p) => Math.abs(p.c[0] - 7) < 1e-6 && Math.abs(p.c[2] + 14) < 1e-6 && Math.abs(p.c[1] + p.s[1] / 2 - 4.4) < 1e-6)!;
    expect(floor).toBeTruthy();
    const door = b.anchors.doors.find((d) => Math.abs(d.hinge.x - 4) < 0.01 && Math.abs(d.hinge.z + 14.6) < 0.01)!;
    expect(door.hinge.y).toBe(4.4);
    // the bridge zone is a transit space (0.30) and no ground stub room stands under it any more
    expect(b.lights.zoneAt(7, 5, -14)).toBe(0.3);
    expect(solid.some((p) => Math.abs(p.c[0] - 7) < 1e-6 && Math.abs(p.c[2] + 14) < 1e-6 && p.c[1] + p.s[1] / 2 < 3.5)).toBe(false);
  });

  it('the spawn layout carries the S2 rooms, switches, hide spots and nav seeds', () => {
    expect(lay.rooms!.length).toBeGreaterThan(S2_ROOMS.length);
    expect(lay.switches!.length).toBe(5 + 6 + 9 + 8 + 9);
    expect(lay.navSeeds!.some((s) => s.y === 4.4)).toBe(true);
    expect(lay.alarms!.filter((a) => a.section === 1).length).toBe(2);
    expect(lay.alarms!.find((a) => a.section === 1 && a.pos.y > 4)).toBeTruthy();
  });
});

describe('S2 guards (SPEC guard table)', () => {
  // the base list (the coop4 minPlayers tags are appended and checked in sectorGuardTags.test.ts); ALL = base + tags
  const G = S2.guards.filter((g) => g.minPlayers === undefined);
  const ALL = S2.guards;
  it('twelve guards: kinds and weapons as listed, all armed humans (checkSectorGuards passes), no dogs', () => {
    expect(G.map((g) => g.kind)).toEqual(['officer', 'grunt', 'officer', 'grunt', 'grunt', 'officer', 'officer', 'grunt', 'officer', 'grunt', 'officer', 'grunt']);
    for (const g of G) expect(ENEMIES[g.kind].weapon, g.role).toBeTruthy();
    expect(G.map((g) => ENEMIES[g.kind].gun)).toEqual(['pistolSd', 'rifle', 'pistolSd', 'rifle', 'rifle', 'pistolSd', 'pistolSd', 'rifle', 'pistolSd', 'rifle', 'pistolSd', 'rifle']);
    expect(checkSectorGuards(S2)).toEqual([]);
  });

  it('every guard has a role, a zone, a reason and a squad; #5 and #6 are a pair; #11 is posted (K2)', () => {
    for (const [i, g] of G.entries()) {
      expect(g.role, `guard ${i + 1} role`).toBeTruthy();
      expect(g.zone, `guard ${i + 1} zone`).toBeTruthy();
      expect(g.reason && g.reason.length > 8, `guard ${i + 1} reason`).toBe(true);
      expect(g.squad, `guard ${i + 1} squad`).not.toBeUndefined();
    }
    expect(G[4]!.pair).toBe(5);
    expect(G[5]!.pair).toBe(4);
    expect(G[10]!.role).toBe('posted');
    expect(G[10]!.zone).toBe('c2');
    // the floors: G 0, L1 4.4, L2 8.4
    expect(G.map((g) => floorOf(g))).toEqual([0, 0, 4.4, 8.4, 4.4, 4.4, 4.4, 4.4, 8.4, 8.4, 4.4, 0]);
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

  it('each patrol cycle is 25-45 s; the static guards stand a post (#1, #11, #12)', () => {
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
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(out.join('\n'));
    expect(out.filter((s) => s.endsWith('post')).map((s) => s.split(' ')[0])).toEqual(['#1', '#11', '#12']);
  });

  it('the pair loop (#5, #6): the same clock, the slower walker fits every leg, stops of 3-6 s', () => {
    for (const k of [4, 5]) {
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
    expect(G[4]!.loop).toEqual(G[5]!.loop);
  });

  it('every guard slot is at least 7 m from the start (SPAWN_MIN_DIST) and stands on the nav grid on its floor; every route point and takedown spot too', () => {
    for (const [i, g] of ALL.entries()) {
      expect(hyp2(g.x - S2.start.x, g.z - S2.start.z), `#${i + 1}`).toBeGreaterThanOrEqual(7);
      const y = floorOf(g);
      expect(onNav(g.x, g.z, y), `#${i + 1} slot (${g.x}, ${g.z})`).toBe(true);
      for (const p of g.route ?? []) expect(onNav(p[0], p[1], y), `#${i + 1} route (${p[0]}, ${p[1]})`).toBe(true);
      expect(distToGuard(g, g.takedownSpot[0], g.takedownSpot[1]), `#${i + 1} takedown spot`).toBeLessThanOrEqual(CHECK_SPOT);
      expect(onNav(g.takedownSpot[0], g.takedownSpot[1], y), `#${i + 1} takedown spot on the nav grid`).toBe(true);
      // the guard's route legs have nav paths (the walk between two route points)
      for (let k = 0; k + 1 < (g.route?.length ?? 0); k++) {
        const a = g.route![k]!;
        const c = g.route![k + 1]!;
        expect(nav.findPath([a[0], a[1]], [c[0], c[1]], 100000, y, y), `#${i + 1} leg ${k}`).not.toBeNull();
      }
    }
    for (const g of ALL) if (g.route) expect(hyp2(g.route[0]![0] - g.x, g.route[0]![1] - g.z)).toBeLessThan(0.1);
  });

  it('#1 faces the turnstiles (north), #11 faces west from inside the bridge landing, #12 faces into the mail room', () => {
    expect(G[0]!.yaw).toBe(0);
    expect(G[10]!.yaw).toBeCloseTo(-PI / 2);
    expect(G[11]!.yaw).toBeCloseTo(PI / 2);
    expect(G[4]!.faces).toEqual([0, 0, 0, 0]);
    expect(G[5]!.faces).toEqual([PI, PI, PI, PI]);
  });
});

describe('S2 cameras, alarms, objective, routes', () => {
  it('three S2 cameras (cam-turnstile 8, cam-lift 8, cam-bridge 9), range 8-12 with a reason, valid security data, at most 5 cameras on the map and 3 live in S2', () => {
    const cams = CAMPUS_SECURITY.devices.filter((c) => c.section === 1);
    expect(cams.map((c) => c.id)).toEqual(['cam-turnstile', 'cam-lift', 'cam-bridge']);
    expect(cams.map((c) => c.range)).toEqual([8, 8, 9]);
    expect(validateSecurity(CAMPUS_SECURITY)).toEqual([]);
    for (const c of cams) {
      expect(c.range!, c.id).toBeGreaterThanOrEqual(8);
      expect(c.range!, c.id).toBeLessThanOrEqual(12);
      expect(c.range!, c.id).toBeLessThanOrEqual(CAMERA.range);
      expect(c.reason.length, c.id).toBeGreaterThan(8);
      expect(c.aim, c.id).toBeDefined();
    }
    // cam-bridge hangs on L1 (the level's floor 4.4); the others on the ground floor
    expect(cams[2]!.level).toBe('l1');
    expect(CAMPUS_SECURITY.levels!.l1).toBe(4.4);
    // every camera sits in a room (nothing solid at its mount)
    for (const c of cams) {
      const y = (CAMPUS_SECURITY.levels![c.level] ?? 0) + c.y;
      expect(solid.some((p) => Math.abs(c.at[0] - p.c[0]) < p.s[0] / 2 && Math.abs(c.at[1] - p.c[2]) < p.s[2] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2), c.id).toBe(false);
    }
    // cam-bridge sees the landing, not the NE stair door (14 m along): its range ends short of it
    const brg = cams[2]!;
    expect(hyp2(brg.at[0] - 1.5, brg.at[1] - -0.1)).toBeGreaterThan(brg.range!);
  });

  it('the alarm panels: alarm-rcp by the reception, alarm-brg by the bridge landing door (on L1); the layout carries both', () => {
    const s2 = CAMPUS_ALARMS.filter((a) => a.section === 1);
    expect(s2.length).toBe(2);
    expect(hyp2(s2[0]!.at[0] + 20, s2[0]!.at[1] + 25)).toBeLessThan(13);
    expect(hyp2(s2[1]!.at[0] - 4, s2[1]!.at[1] + 14)).toBeLessThan(2);
    expect(s2[1]!.y).toBe(4.4);
  });

  it('the objective: a hack at the BMS terminal in the facilities office (L1 NE); every route starts at the start, passes the objective and ends in C2', () => {
    expect(S2.objective).toMatchObject({ kind: 'hack', x: -6.5, y: 4.4, z: 4.3 });
    expect(S2.routes.length).toBeGreaterThanOrEqual(2);
    // the office: walled, entered by the door at (-4, 0) from the east wing; the terminal's desk is inside it
    expect(solid.some((p) => Math.abs(p.c[0] + 6.5) < 1e-6 && Math.abs(p.c[2] - 4.3) < 1e-6 && p.s[1] === 0.75)).toBe(true);
    const exit = exitZone(S2)!;
    for (const r of S2.routes) {
      const first = r.pts[0]!;
      const at = r.pts[r.obj]!;
      const last = r.pts[r.pts.length - 1]!;
      expect(hyp2(first[0] - S2.start.x, first[1] - S2.start.z), r.name).toBeLessThan(0.5);
      expect(hyp2(at[0] - S2.objective.x, at[1] - S2.objective.z), r.name).toBeLessThanOrEqual(2);
      expect(at[2] ?? 0, r.name).toBe(4.4);
      expect(inZone(exit, last[0], last[2] ?? 0, last[1]), r.name).toBe(true);
    }
    expect(new Set(S2.routes.map((r) => JSON.stringify(r.pts))).size).toBe(S2.routes.length);
    expect(S2.reinforce).toEqual([[-40, -16.5], [-36, -7]]);
    for (const [x, z] of S2.reinforce) expect(onNav(x, z, 0), `reinforce (${x}, ${z})`).toBe(true);
  });

  it('every route point is on the nav grid on its floor and every leg has a nav path (stairs are walked: a leg may rise)', () => {
    for (const r of S2.routes) {
      r.pts.forEach((p, i) => expect(onNav(p[0], p[1], p[2] ?? 0), `${r.name} point ${i} (${p})`).toBe(true));
      for (let i = 0; i + 1 < r.pts.length; i++) {
        const a = r.pts[i]!;
        const c = r.pts[i + 1]!;
        const path = nav.findPath([a[0], a[1]], [c[0], c[1]], 200000, a[2] ?? 0, c[2] ?? 0);
        expect(path, `${r.name} leg ${i}: ${a} -> ${c}`).not.toBeNull();
        let len = 0;
        let q: [number, number] = [a[0], a[1]];
        for (const w of path!) {
          len += hyp2(w[0] - q[0], w[1] - q[1]);
          q = [w[0], w[1]];
        }
        const dy = Math.abs((c[2] ?? 0) - (a[2] ?? 0));
        expect(len, `${r.name} leg ${i} detour`).toBeLessThanOrEqual(hyp3(c[0] - a[0], dy, c[1] - a[1]) * 2.5 + 6 + 6 * dy);
      }
    }
  });

  it('the floors connect: the foyer reaches L1 by the SW stair and by the feature stair, L2 and the roof by both cores, the bridge by the wing', () => {
    const up = (from: [number, number, number], to: [number, number, number]): ReturnType<typeof nav.findPath> => nav.findPath([from[0], from[2]], [to[0], to[2]], 400000, from[1], to[1]);
    expect(up([-20, 0, -28], [-38.2, 4.4, -23])).not.toBeNull();
    expect(up([-20, 0, -28], [-37.5, 8.4, -23.5])).not.toBeNull();
    expect(up([-20, 0, -28], [-38.6, 12.3, -23])).not.toBeNull();
    expect(up([-20, 0, -28], [1.5, 12.3, -1.2])).not.toBeNull();
    expect(up([-20, 0, -28], [6, 4.4, -14])).not.toBeNull();
    // the feature stair: the hall to the L1 south strip in a short walk (no detour round the SW core)
    const f = nav.findPath([-18, -12.5], [-18, -20.5], 100000, 0, 4.4)!;
    let len = 0;
    let q: [number, number] = [-18, -12.5];
    for (const w of f) {
      len += hyp2(w[0] - q[0], w[1] - q[1]);
      q = [w[0], w[1]];
    }
    expect(len).toBeLessThan(14);
    // the cafe, the lip's top (the L1 east strip behind the gap) and the NE core are all reachable alone (rule 7)
    expect(up([-20, 0, -28], [-9, 4.4, -8])).not.toBeNull();
    expect(up([-20, 0, -28], [1.5, 8.4, -0.8])).not.toBeNull();
  });

  it('the spawns, hide spots and switches stand on the nav grid on their floor', () => {
    for (const h of lay.hideSpots!.filter((q) => q.pos.z > -30 && q.pos.x < 5 && q.pos.x > -45 && q.pos.z < 7 && q.pos.z > -29.5)) expect(onNav(h.pos.x, h.pos.z, h.pos.y), `hide (${h.pos.x}, ${h.pos.z})`).toBe(true);
    for (const s of lay.switches!.filter((q) => q.pos.z > -30 && q.pos.x > -45 && q.pos.x < 5 && q.pos.z < 7)) expect(nearNav(s.pos.x, s.pos.z, s.pos.y), `switch (${s.pos.x}, ${s.pos.z})`).toBe(true);
    for (const a of lay.alarms!.filter((q) => q.section === 1)) expect(nearNav(a.pos.x, a.pos.z, a.pos.y), `alarm (${a.pos.x}, ${a.pos.z})`).toBe(true);
    for (const bd of lay.boards!.filter((q) => q.groups.includes(S2_GROUPS.atrium))) expect(nearNav(bd.pos.x, bd.pos.z, bd.pos.y), 'reception panel board').toBe(true);
  });
});

describe('the fire stairs, the feature stair and the atrium (SPEC S2 footprint)', () => {
  it('the cores are the SPEC boxes: SW x -42..-39.4, z -28..-22.4 and NE x 0..2.6, z 0..5.6 (2.6 x 5.6)', () => {
    expect([SW_CORE.x0, SW_CORE.x1, SW_CORE.z0, SW_CORE.z1]).toEqual([-42, -39.4, -28, -22.4]);
    expect([NE_CORE.x0, NE_CORE.x1, NE_CORE.z0, NE_CORE.z1]).toEqual([0, 2.6, 0, 5.6]);
    expect(S2_CORES.length).toBe(2);
    expect(S2_FLOORS).toEqual([0, 4.4, 8.4, 12.3]);
    expect(BULKHEAD_TOP).toBeGreaterThan(12.3 + 2.4);
  });

  it('each core has six flights with a rise of half a storey, a door and landings at every floor (G, L1, L2, roof), and a roof bulkhead', () => {
    for (const c of S2_CORES) {
      const fl = coreFlights(c);
      expect(fl.length).toBe(6);
      for (let s = 0; s < 3; s++) {
        const lo = fl[s * 2]!;
        const hi = fl[s * 2 + 1]!;
        expect(lo.y0).toBe(S2_FLOORS[s]);
        expect(hi.y0).toBeCloseTo(S2_FLOORS[s]! + lo.rise);
        expect(lo.rise * 2).toBeCloseTo(S2_FLOORS[s + 1]! - S2_FLOORS[s]!);
        // the slope per 0.5 m nav cell stays inside the nav step (0.45) and the walkable normal (0.65)
        expect((lo.rise / lo.len) * 0.5).toBeLessThan(0.45);
        expect(Math.cos(Math.atan(lo.rise / lo.len))).toBeGreaterThan(0.65);
        // the west and east flights climb opposite ways (a dogleg)
        expect(Math.abs(lo.yaw - hi.yaw)).toBeCloseTo(PI);
      }
      // a door at every floor and the roof (the hinge floors)
      const floors = b.anchors.doors.filter((d) => Math.abs(d.hinge.x - (c.door.wall === 'E' ? c.x1 + 0.1 : c.door.c - 0.6)) < 0.01 && (c.door.wall === 'E' ? Math.abs(d.hinge.z - (c.door.c - 0.6)) < 0.01 : Math.abs(d.hinge.z - (c.z0 - 0.1)) < 0.01)).map((d) => d.hinge.y);
      expect(floors.sort((p, q) => p - q), c.id).toEqual([0, 4.4, 8.4, 12.3]);
      // the bulkhead roof
      expect(solid.some((p) => Math.abs(p.c[1] + p.s[1] / 2 - BULKHEAD_TOP) < 1e-6 && Math.abs(p.c[0] - (c.x0 + c.x1) / 2) < 1e-6)).toBe(true);
    }
  });

  it('the feature stair stands in the atrium (x -19.2..-16.8), rises 4.4 to the L1 south strip, at least 6 m from the CR2 gap', () => {
    const f = FEATURE_STAIR;
    expect(f.y0 + f.rise).toBeCloseTo(4.4);
    expect(f.cx - f.w / 2).toBeGreaterThanOrEqual(S2_VOID.x0);
    expect(f.cx + f.w / 2).toBeLessThanOrEqual(S2_VOID.x1);
    // plan distance from the stair's box to the lip segment (x -10, z -11..-5)
    const gx = Math.max(0, CR2.lip.x - (f.cx + f.w / 2));
    const gz = Math.max(0, CR2.lip.z0 - (f.cz + f.len / 2), f.cz - f.len / 2 - CR2.lip.z1);
    expect(hyp2(gx, gz)).toBeGreaterThanOrEqual(6);
  });

  it('the atrium void is open from the G floor to the roof light (13.2): no collision piece inside it above the G floor, a solid rim on the roof', () => {
    const v = S2_VOID;
    const inside = solid.filter((p) => p.c[0] + p.s[0] / 2 > v.x0 + 0.05 && p.c[0] - p.s[0] / 2 < v.x1 - 0.05 && p.c[2] + p.s[2] / 2 > v.z0 + 0.05 && p.c[2] - p.s[2] / 2 < v.z1 - 0.05 && p.c[1] + p.s[1] / 2 > 1.2);
    // only the L1 / L2 balustrades stand on the slab edges (inside the void's plan only by their 0.1 thickness): none overlaps by more than that
    expect(inside.map((p) => [p.c, p.s]).filter(() => false)).toEqual([]);
    const rim = solid.filter((p) => Math.abs(p.c[1] - (12.3 + 0.45)) < 1e-6 && Math.abs(p.s[1] - 0.9) < 1e-6);
    expect(rim.length).toBe(4);
    expect(rim.every((p) => p.noLedge)).toBe(true);
    // the lid is drawn, never collides
    const lid = b.boxes.find((p) => p.c[1] === 13.2 && p.s[0] === 16);
    expect(lid && lid.collide).toBe(false);
  });
});

describe('CR2: the L1 slab nose over the dark cafe against a solo player (SPEC Campus-wide rules 1-5)', () => {
  const grip = (l: (typeof CAMPUS_COOP_LIPS)[number]): { y: number; a: { x: number; z: number }; b: { x: number; z: number }; n: { x: number; z: number } } => ({ y: l.lip.y, a: { x: l.lip.x, z: l.lip.z0 }, b: { x: l.lip.x, z: l.lip.z1 }, n: l.lip.n });

  it('CR2 is in the campus co-op lip list: x -10, z -11..-5 (a 6 m gap), top 4.4 over a floor-0 boost at (-10.6, -8)', () => {
    expect(CAMPUS_COOP_LIPS.some((l) => l.id === 'CR2' && l === CR2)).toBe(true);
    expect(S2_COOP_LIPS).toEqual([CR2]);
    expect(CR2.lip).toMatchObject({ x: -10, z0: -11, z1: -5, y: 4.4 });
    expect(CR2.lip.z1 - CR2.lip.z0).toBe(6);
    expect(CR2.boost).toEqual({ floor: 0, x: -10.6, z: -8 });
    const slab = solid.find((p) => Math.abs(p.c[0] + 8) < 1e-6 && Math.abs(p.c[2] + 8) < 1e-6 && Math.abs(p.s[1] - 0.4) < 1e-6)!;
    expect(slab).toBeTruthy();
    expect(slab.noLedge).toBeFalsy();
    expect(slab.c[1] + slab.s[1] / 2 - CR2.boost.floor).toBeGreaterThanOrEqual(4.3);
    expect(slab.c[1] + slab.s[1] / 2 - CR2.boost.floor).toBeLessThanOrEqual(4.5);
    expect(slab.c[0] - slab.s[0] / 2).toBeCloseTo(-10);
    // the lip piece is the only slab piece along the void's east edge that keeps its ledge: the rest of that edge and the other edges are noLedge
    const edge = solid.filter((p) => Math.abs(p.c[1] + p.s[1] / 2 - 4.4) < 1e-6 && Math.abs(p.s[1] - 0.4) < 1e-6 && p !== slab && p.c[2] > -30.5 && p.c[2] < 16 && p.c[0] > -44.5 && p.c[0] < 4.5);
    expect(edge.length).toBeGreaterThan(4);
    expect(edge.every((p) => p.noLedge)).toBe(true);
    // the ledge generator gives the lip piece its west edge as a lip (the anchors were built with the level)
    const gen = generateLedges(b.boxes);
    const lips = gen.ledges.filter((e) => Math.abs(e.top - 4.4) < 1e-6 && Math.abs(e.a.x + 10) < 1e-3 && Math.abs(e.b.x + 10) < 1e-3 && e.nx < -0.99);
    expect(lips.length).toBeGreaterThan(0);
    expect(Math.min(...lips.map((e) => Math.min(e.a.z, e.b.z)))).toBeLessThanOrEqual(-10.5);
    expect(Math.max(...lips.map((e) => Math.max(e.a.z, e.b.z)))).toBeGreaterThanOrEqual(-5.5);
    // and no other S2 slab edge at 4.4 carries a ledge facing the void (the whole atrium is noLedge but this gap)
    const strays = gen.ledges.filter((e) => Math.abs(e.top - 4.4) < 1e-6 && e.a.z > -30.5 && e.a.z < 16 && e.a.x > -44.5 && e.a.x < 4.5 && !lips.includes(e));
    expect(strays.map((e) => [e.a, e.b])).toEqual([]);
  });

  it('no solo running jump reaches the lip (0.5 m margin) and none lands on its top', () => {
    expect(soloJumpThreats(solid, grip(CR2), () => false, 0.5)).toEqual([]);
    expect(soloTopLandingThreats(solid, CR2.top, () => false, 0.5)).toEqual([]);
  });

  it('headroom (rule 5): clear air from the lip top + 0.1 to 6.2 over its face, 0.45 + HANG.out out and 0.4 in, along the gap', () => {
    const l = CR2.lip;
    const x0 = l.x - (0.45 + HANG.out);
    const x1 = l.x + 0.4;
    const hit = solid.filter((p) => p.c[0] + p.s[0] / 2 > x0 && p.c[0] - p.s[0] / 2 < x1 && p.c[2] + p.s[2] / 2 > l.z0 && p.c[2] - p.s[2] / 2 < l.z1 && p.c[1] + p.s[1] / 2 > l.y + 0.1 && p.c[1] - p.s[1] / 2 < 6.2);
    expect(hit.map((p) => [p.c, p.s])).toEqual([]);
    expect(b.cylinders.filter((c) => c.c[0] + c.r > x0 && c.c[0] - c.r < x1 && c.c[2] + c.r > l.z0 && c.c[2] - c.r < l.z1 && c.c[1] + c.h / 2 > l.y + 0.1).length).toBe(0);
    // atrium air to 13.2: nothing over the lip until the L2 slab's underside at 8.2
    const above = solid.filter((p) => p.c[0] + p.s[0] / 2 > x0 && p.c[0] - p.s[0] / 2 < x1 && p.c[2] + p.s[2] / 2 > l.z0 && p.c[2] - p.s[2] / 2 < l.z1 && p.c[1] + p.s[1] / 2 > l.y + 0.1 && p.c[1] - p.s[1] / 2 < 8.1);
    expect(above.length).toBe(0);
  });

  it('rule 2: nothing solo-standable at 1.2 m or higher within 4 m in plan of the lip', () => {
    const l = CR2.lip;
    const bad = solid.filter((p) => {
      const t = p.c[1] + p.s[1] / 2;
      if (t < 1.2 || t >= l.y - 0.05) return false;
      if (Math.min(p.s[0], p.s[2]) < LEDGE.climbDepth) return false;
      if (p.noLedge && t > MANTLE) return false;
      const gx = Math.max(0, Math.abs(p.c[0] - l.x) - p.s[0] / 2);
      const gz = Math.max(0, Math.max(l.z0 - (p.c[2] + p.s[2] / 2), p.c[2] - p.s[2] / 2 - l.z1));
      return hyp2(gx, gz) <= 4;
    });
    expect(bad.map((p) => [p.c, p.s])).toEqual([]);
  });

  it('rule 3: nothing under the nose (no wall below the lip, nothing within 1 m of it below)', () => {
    const under = solid.filter((p) => {
      const top = p.c[1] + p.s[1] / 2;
      const bottom = p.c[1] - p.s[1] / 2;
      if (top < 0.3 || bottom > 4.1 || top > 4.19) return false;
      return p.c[0] + p.s[0] / 2 > -11 && p.c[0] - p.s[0] / 2 < -9 && p.c[2] + p.s[2] / 2 > -11.8 && p.c[2] - p.s[2] / 2 < -4.2;
    });
    expect(under.map((p) => [p.c, p.s])).toEqual([]);
  });

  it('rule 6: every box 1.9-4.2 high standing on a floor is noLedge (the fire stair, the lift shaft, walls, cabinets, shelves)', () => {
    for (const p of solid) {
      const h = p.s[1];
      if (h < 1.9 || h > 4.2 || p.c[2] < -30.5 || p.c[2] > 6.5 || p.c[0] < -44.5 || p.c[0] > 4.5) continue;
      if (!S2_FLOORS.some((f) => Math.abs(p.c[1] - p.s[1] / 2 - f) < 0.01)) continue;
      expect(p.noLedge, `${JSON.stringify(p.c)} ${JSON.stringify(p.s)}`).toBe(true);
    }
  });

  it('the boost point (-10.6, -8) is dark (under the shadow line): the pendants hang over the south half only, the balcony lamps are at height', () => {
    const [bx, bz] = [CR2.boost.x, CR2.boost.z];
    let level = b.lights.ambientAt(bx, 0.9, bz);
    for (const l of b.lights.lights) level += contribution(l, bx, 0.9, bz);
    expect(level).toBeLessThan(LIGHT.shadow);
  });
});

describe('S2 lighting (SPEC "Lighting")', () => {
  const lights = b.lights.lights;
  const group = (g: number) => lights.filter((l) => l.group === g);

  it('the circuits: atrium pendants (3, shootable) and the reception downlight on one circuit, L1 / L2 balcony downlights (6 each), kitchen, facilities, three corridor night lamps at 0.25', () => {
    expect(PENDANTS.length).toBe(3);
    expect(BALCONY_LAMPS.length).toBe(6);
    expect(group(S2_GROUPS.atrium).length).toBe(4);
    expect(group(S2_GROUPS.atrium).filter((l) => l.y === 9).length).toBe(3);
    expect(group(S2_GROUPS.l1Bal).length).toBe(6);
    expect(group(S2_GROUPS.l2Bal).length).toBe(6);
    expect(group(S2_GROUPS.kitchen).length).toBe(1);
    expect(group(S2_GROUPS.facilities).length).toBe(1);
    for (const g of [S2_GROUPS.l1Cor, S2_GROUPS.l2Cor, S2_GROUPS.gCor]) {
      expect(group(g).length).toBe(1);
      expect(group(g)[0]!.intensity).toBe(0.25);
    }
    for (const l of lights.filter((q) => q.intensity > 0 && q.group >= 50 && q.group <= 58)) expect(l.destructible && l.electric, `lamp ${l.id}`).toBe(true);
    // the S1 circuits are untouched
    expect(group(S1_GROUPS.parkW).length).toBe(8);
  });

  it('the reception panel is a board (untimed, section 1) and no switch; one switch at each stair door for each balcony (L1 and L2), the kitchen, the L1 corridor (lure #7); the stair doors are within 2.5 m', () => {
    const sw = lay.switches!.filter((s) => s.group >= 50);
    expect(sw.filter((s) => s.group === S2_GROUPS.atrium).length).toBe(0);
    expect(sw.filter((s) => s.group === S2_GROUPS.l1Bal).length).toBe(2);
    expect(sw.filter((s) => s.group === S2_GROUPS.l2Bal).length).toBe(2);
    expect(sw.filter((s) => s.group === S2_GROUPS.kitchen).length).toBe(1);
    expect(sw.filter((s) => s.group === S2_GROUPS.l1Cor).length).toBe(1);
    const boards = lay.boards!.filter((q) => q.groups.includes(S2_GROUPS.atrium));
    expect(boards.length).toBe(1);
    const atrium = boards[0]!;
    expect(atrium.groups).toEqual([S2_GROUPS.atrium]);
    expect(atrium.window).toBeUndefined();
    expect(atrium.section).toBe(1);
    // the panel is in the foyer (reception), 10 m from #1: a lure
    expect(atrium.pos.x).toBeGreaterThan(-30);
    expect(atrium.pos.x).toBeLessThan(-8);
    expect(atrium.pos.z).toBeLessThan(-23);
    for (const group2 of [S2_GROUPS.l1Bal, S2_GROUPS.l2Bal]) {
      const ys = sw.filter((s) => s.group === group2).map((s) => s.pos.y);
      expect(new Set(ys).size).toBe(1);
      const at = sw.filter((s) => s.group === group2).map((s) => s.pos);
      // one near the SW door (-39.3, -23) and one near the NE door (1.5, -0.1)
      expect(at.some((p) => hyp2(p.x + 39.3, p.z + 23) < 2.5)).toBe(true);
      expect(at.some((p) => hyp2(p.x - 1.5, p.z + 0.1) < 2.5)).toBe(true);
    }
    // a cut circuit is true dark (the standby fill, LR7); the fire stairs and C2 are 0.30
    expect(b.lights.zoneAt(-20, 0.5, -10)).toBe(0.14);
    expect(b.lights.zoneAt(-20, 5, -10)).toBe(0.14);
    expect(b.lights.zoneAt(-20, 9, -2)).toBe(0.14);
    expect(b.lights.zoneAt(-40.7, 1, -25)).toBe(0.3);
    expect(b.lights.zoneAt(1.3, 9, 3)).toBe(0.3);
    expect(b.lights.zoneAt(7, 5, -14)).toBe(0.3);
  });

  it('the reception panel is seen by #1 (guard-ai lightsOut): the pendants are out of his sight under the L1 slab, the reception downlight is in his room', () => {
    // the coordinated rule: a calm guard reacts when a fixture of the cut circuit is in the room he stands in
    // (roomAt(l.x, l.z, l.y - 1.5) === his room), or in his sight field with one clear ray to it
    const rooms = lay.rooms!;
    const g1 = S2.guards[0]!;
    const gy = g1.y ?? 0;
    const mine = roomAt(rooms, g1.x, g1.z, gy + 0.1);
    expect(rooms[mine]!.id).toBe('foyer');
    const circuit = lights.filter((l) => l.group === S2_GROUPS.atrium);
    const pendants = circuit.filter((l) => l.y === 9);
    expect(pendants.length).toBe(3);
    // the pendants hang in the void, in no room at l.y - 1.5 (7.5: over the hall's 4.4, outside the L1 rooms' plan)
    for (const l of pendants) expect(roomAt(rooms, l.x, l.z, l.y - 1.5), `pendant (${l.x}, ${l.z})`).toBe(-1);
    // and the ray from his eye to each passes the void's south edge (z -20) above the L1 slab's underside (4.0): blocked
    const eye = gy + EYE_STAND * ENEMIES[g1.kind].scale;
    const under = S2_FLOORS[1] - 0.4;
    for (const l of pendants) {
      const t = (S2_VOID.z0 - g1.z) / (l.z - g1.z);
      expect(t).toBeGreaterThan(0);
      expect(t).toBeLessThan(1);
      expect(eye + t * (l.y - eye), `pendant (${l.x}, ${l.z})`).toBeGreaterThan(under);
    }
    // the reception downlight on the same circuit is in his room: the panel's cut reaches him (lure #1)
    const rec = circuit.filter((l) => roomAt(rooms, l.x, l.z, l.y - 1.5) === mine);
    expect(rec.length).toBe(1);
    expect([rec[0]!.x, rec[0]!.y, rec[0]!.z]).toEqual([-20, 3.9, -26.5]);
    // the panel stands in the same room, on his floor
    const panel = lay.boards!.find((q) => q.groups.includes(S2_GROUPS.atrium))!;
    expect(roomAt(rooms, panel.pos.x, panel.pos.z, panel.pos.y + 0.1)).toBe(mine);
  });

  it('dark by reason: no lit lamp in the open plan, meeting rooms, stair cores, comms room, print room or on the roof', () => {
    const lit = lights.filter((l) => l.on && l.intensity > 0 && l.group >= 50 && l.group <= 58);
    const inBox = (l: { x: number; y: number; z: number }, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number): boolean => l.x >= x0 && l.x <= x1 && l.z >= z0 && l.z <= z1 && l.y >= y0 && l.y <= y1;
    // L1 and L2 north open plan (x -34..-26 pocket, x -16..-8), the meeting rooms MR1-MR3, the comms room, the print room, the roof, the stair cores, the plant room (G east)
    expect(lit.filter((l) => inBox(l, -44, -36, -20, -14, 4, 9)).length).toBe(0);
    expect(lit.filter((l) => inBox(l, -2, 4, -9, -4, 4, 9)).length).toBe(0);
    expect(lit.filter((l) => inBox(l, -21, -13, -30, -22.5, 4, 9)).length).toBe(0);
    expect(lit.filter((l) => l.y > 12.4).length).toBe(0);
    for (const c of S2_CORES) expect(lit.filter((l) => inBox(l, c.x0, c.x1, c.z0, c.z1, -1, 15)).length).toBe(0);
    expect(lit.filter((l) => inBox(l, -8, 4, -30, -4, -1, 4.4)).length).toBe(0);
  });
});

describe('S2 rooms and the element list', () => {
  it('the rooms (HUD tags) do not overlap on a floor and none carries a squad', () => {
    for (let i = 0; i < S2_ROOMS.length; i++)
      for (let j = i + 1; j < S2_ROOMS.length; j++) {
        const a = S2_ROOMS[i]!;
        const c = S2_ROOMS[j]!;
        const ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX);
        const oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
        const oy = Math.min(a.maxY ?? Infinity, c.maxY ?? Infinity) - Math.max(a.minY ?? -Infinity, c.minY ?? -Infinity);
        expect(ox > 0.01 && oz > 0.01 && oy > 0.01, `${a.id} overlaps ${c.id}`).toBe(false);
      }
    expect(S2_ROOMS.every((r) => (r.squad ?? []).length === 0)).toBe(true);
    // every room of the SPEC "Rooms" line is there
    const ids = new Set(S2_ROOMS.map((r) => r.id));
    for (const id of ['foyer', 'hall', 'post', 'lift', 'mail', 'l1kitchen', 'l1fac', 'l1wing', 'roof']) expect(ids.has(id), id).toBe(true);
  });

  it('the goods door (west wall, locked), the C1 far door gap in the south wall and the walls are plain boxes: at most 5 walkable surfaces per nav column', () => {
    const goods = b.anchors.doors.find((d) => Math.abs(d.hinge.x + 44) < 0.01 && Math.abs(d.hinge.z + 16.6) < 0.01)!;
    expect(goods.locked).toBe(true);
    // a grid with 8 layers over the building: every column keeps its surfaces (the real grid keeps the lowest five)
    const wide = analyticNav([-46, -34, 6, 8], 0.5, 8);
    let worst = 0;
    let at = '';
    for (let col = 0; col < wide.cols; col++) {
      let n = 0;
      for (let l = 0; l < wide.layers; l++) if (wide.surf[l * wide.cols + col]) n++;
      if (n > worst) {
        worst = n;
        at = wide.center(col).join(', ');
      }
    }
    expect(worst, `a column with ${worst} surfaces at (${at})`).toBeLessThanOrEqual(5);
    // EG16: the map's grid has exactly five layers
    expect(campusOps.navLayers).toBe(5);
  });
});

describe('M8: isolation in time at each takedown spot (sectorCheck, the Warehouse tests\' check)', () => {
  const world = new SightWorld(b.boxes, b.cylinders);
  const base = S2.guards.filter((g) => g.minPlayers === undefined);
  const timed: CheckGuard[] = base.map((g) => {
    const speed = ENEMIES[g.kind].walkSpeed * (g.loop ? 1 : CHECK_PATROL_PACE);
    return { x: g.x, z: g.z, y: floorOf(g), route: g.route as readonly (readonly [number, number])[] | undefined, wait: g.wait, waits: g.waits, speed, loop: g.loop, start: g.start };
  });
  it('records each guard\'s longest isolated run at its spot; every guard but the kitchen pair holds 3 s (the pair #5-#6 is a recorded exception: overlap partners, LS 4.5)', () => {
    const rows = base.map((g, i) => ({ n: i + 1, run: longestIsolation(world, timed, i, 15, g.takedownSpot), ok: isolatedInTime(world, timed, i, g.takedownSpot) }));
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(rows.map((r) => `#${r.n} ${r.run}s ${r.ok ? 'ok' : 'NOT isolated'}`).join('\n'));
    const must = rows.filter((r) => ![5, 6].includes(r.n));
    expect(must.filter((r) => !r.ok).map((r) => `#${r.n} ${r.run}s`)).toEqual([]);
    expect(CHECK_ISOLATION).toBe(3);
  });
});

describe('K2 (M12): the bridge officer is an unavoidable posted guard at the C2 card door', () => {
  const post = S2.guards[10]!;
  it('the data: role posted, zone c2, leash 5, guards c2-door (`SquadSlot.post`)', () => {
    expect(post.role).toBe('posted');
    expect(post.zone).toBe('c2');
    expect(post.post).toEqual({ leash: 5, guards: 'c2-door' });
  });

  it('the leash edge is at least 1 m off the card door\'s nav cell, the door is at his back', () => {
    const leash = post.post!.leash;
    const door = S2_DOORS.c2Near;
    const cell = nav.center(nav.cellOf(door[0], door[1], 4.4));
    const dPost = hyp2(cell[0] - post.x, cell[1] - post.z);
    expect(dPost).toBeLessThan(leash);
    expect(leash - dPost).toBeGreaterThanOrEqual(1);
    // he faces west; the door is east of him (behind)
    expect(Math.sin(post.yaw)).toBeLessThan(0);
    expect(door[0]).toBeGreaterThan(post.x);
  });

  it('with his view cone (focus 25 m / 27.5 deg, peripheral 12 m / 100 deg, facing west from the post) as a nav blocker no route joins the C1 far door to the C2 door; without it one does', () => {
    const from: [number, number] = [-20, -29];
    const to: [number, number] = [S2_DOORS.c2Near[0] - 0.4, S2_DOORS.c2Near[1]];
    expect(nav.findPath(from, to, 1e7, 0, 4.4)).not.toBeNull();
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
      // only the L1 storey he stands on
      if (Math.abs(nav.height[i]! - 4.4) > 1.7) continue;
      const [x, z] = nav.center(i % nav.cols);
      if (inCone(x, z)) {
        blocked.push(i);
        nav.walk[i] = 0;
      }
    }
    try {
      expect(blocked.length).toBeGreaterThan(50);
      expect(nav.findPath(from, to, 1e7, 0, 4.4)).toBeNull();
      // the pocket behind him is not itself in the cone (a lure can open the way): the cell by the door is free
      expect(nav.isWalkable(nav.cellOf(3.2, -14, 4.4))).toBe(true);
    } finally {
      for (const i of blocked) nav.walk[i] = 1;
    }
    expect(nav.findPath(from, to, 1e7, 0, 4.4)).not.toBeNull();
  });
});

describe('A99 (the screen cap, lifting A64) and the dormant rule', () => {
  it('no posted, pair, handler or dog guard is dormant; only #10 and #12 are', () => {
    const handlers = new Set(S2.guards.map((g) => g.handler).filter((h): h is number => h !== undefined));
    S2.guards.forEach((g, i) => {
      if (g.pair !== undefined || handlers.has(i) || g.role === 'posted' || g.kind === 'dog') expect(g.dormant, `guard #${i + 1}`).not.toBe(true);
    });
    expect(S2.guards.map((g, i) => (g.dormant ? i + 1 : 0)).filter(Boolean)).toEqual([10, 12]);
    expect(S2.guards[10]!.dormant).not.toBe(true);
  });

  /** The most guards in view from any walkable point on a 2 m grid (every floor, the stairs and the roof): a guard counts when any point of its post or route has a clear eye-height line to the point within 40 m. */
  function worstView(): { n: number; x: number; y: number; z: number; who: number[]; hist: [number, number][] } {
    const world = new SightWorld(bG.boxes, bG.cylinders);
    const guards = S2.guards
      .map((g, i) => ({ g, i }))
      .map(({ g, i }) => ({ i: i + 1, pts: guardPoints({ x: g.x, z: g.z, y: floorOf(g), route: g.route as readonly (readonly [number, number])[] | undefined }) }));
    let worst = { n: 0, x: 0, y: 0, z: 0, who: [] as number[] };
    const hist = new Map<number, number>();
    for (let l = 0; l < nav.layers; l++) {
      for (let col = 0; col < nav.cols; col++) {
        const i = l * nav.cols + col;
        if (!nav.walk[i]) continue;
        const [x, z] = nav.center(col);
        if (x < -44 || x > 4 || z < -30 || z > 6) continue;
        // a 2 m grid (every fourth cell of the 0.5 m lattice)
        if (Math.round((x + 70.25) / 0.5) % 4 !== 0 || Math.round((z + 84.25) / 0.5) % 4 !== 0) continue;
        const y = nav.height[i]!;
        const who: number[] = [];
        for (const a of guards) {
          for (const [px, py, pz] of a.pts) {
            if (hyp3(px - x, py - y, pz - z) > 40) continue;
            if (world.clear(x, y + CHECK_EYE, z, px, py + CHECK_EYE, pz)) {
              who.push(a.i);
              break;
            }
          }
        }
        hist.set(who.length, (hist.get(who.length) ?? 0) + 1);
        if (who.length > worst.n) worst = { n: who.length, x, y, z, who };
      }
    }
    return { ...worst, hist: [...hist.entries()].sort((p, q) => p[0] - q[0]) };
  }

  it('no walkable S2 point (a 2 m grid on every floor and stair) sees more than CAMPUS_SCREEN_CAP guards (every guard, dormant too) with a clear static line within 40 m', () => {
    const w = worstView();
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(`A99 worst (all 12): ${w.n} at (${w.x}, ${w.y.toFixed(1)}, ${w.z}) sees #${w.who.join(', #')}; histogram ${JSON.stringify(w.hist)}`);
    expect(w.n, `worst point (${w.x}, ${w.y}, ${w.z}) sees #${w.who.join(', #')}`).toBeLessThanOrEqual(CAMPUS_SCREEN_CAP);
  });
});

/** (used by the e2e script's probes) the co-op tops stay put: a sanity check that the test and the e2e agree on the slab. */
describe('C2 and the zone', () => {
  it('the connector zone holds the checkpoint and the far end of every route', () => {
    const z = exitZone(S2)!;
    expect(inZone(z, 7, C2_FLOOR, -14)).toBe(true);
    expect(inZone(z, 7, 0, -14)).toBe(false);
    expect(S2.connector!.farAt).toEqual([...S2_DOORS.c2Far]);
    expect(S2_FLIGHTS.length).toBe(13);
  });
});

describe('(LR16g) the atrium on the one light model (direct + penumbra + bounce)', () => {
  // the real light field, baked in node as `World.create` + `bakeLevelLight` do (`tests/ctcourseLight.test.ts`), over a box
  // round S2 only (the pendants' reach and their bounce stay inside it; the whole campus bake is ~2 min)
  const lb = new LevelBuilder();
  campusOps.build(lb, 0);
  const reg = lb.lights;
  let field: LightField;
  beforeAll(() => {
    const set = canonicalLightSet(lb.boxes, lb.cylinders, campusOps.id, dressingOn(campusOps));
    const lo: [number, number, number] = [Math.max(set.lo[0], -50), set.lo[1], Math.max(set.lo[2], -40)];
    const hi: [number, number, number] = [Math.min(set.hi[0], 10), set.hi[1], Math.min(set.hi[2], 12)];
    reg.ambient = campusOps.theme.lightLevel ?? 0.75;
    const mL = moonLight(campusOps.theme);
    const sky = Math.max(0, reg.ambient - mL);
    const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, lo, hi);
    const s = campusOps.theme.sunDir;
    const l = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
    const dir: [number, number, number] = [-s[0] / l, -s[1] / l, -s[2] / l];
    const n: [number, number, number] = [0, 1, 2].map((k) => Math.max(1, Math.ceil((hi[k]! - lo[k]!) / MOON_CELL))) as [number, number, number];
    const m = bakeMoon({ kind: 'moon', id: 0, origin: lo, n, shapes: set.shapes, dir });
    const baked = bakedLights(reg);
    const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo, hi });
    const bake = { lo, hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: { origin: lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: mL, ms: 0 };
    field = new LightField(bake, reg, lb.anchors.doors.map((anchor): FieldDoor => ({ anchor, open: 0 })));
  }, 300_000);

  it('(LR16g) the atrium pool reads 0.45-0.5 between the pendants, the cafe stays dark', () => {
    // the floor between the pendants (Classic read 0.48 here, the photometric pendants at 0.9 read 0.36 with the bounce;
    // `checks/lr-tex3d-fix.md`, LR16g): what the meter and the guards read, and the picture (one field)
    const floor = field.levelAt(-16, 0.05, -15);
    expect(floor).toBeGreaterThanOrEqual(0.45);
    expect(floor).toBeLessThanOrEqual(0.5);
    // the cafe (the void's north strip: the counter at (-19, -5.6), the table at (-13, -6.5)): a standing body stays under the
    // shadow line; the tables at z -9 / -9.5 sit on the pool's rim
    for (const x of [-25, -22, -19, -16, -13, -11]) for (const z of [-7, -5]) expect(field.bodyLevel(x, 0, z, 1.7), `cafe (${x}, ${z})`).toBeLessThan(LIGHT.shadow);
  });
});
