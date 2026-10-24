/**
 * Saltmarsh Park (`campusOps`) slice 3: section 3, the lab block (`docs/sector-redesign/SPEC.md` "S3", PLAN "Common to
 * every map slice" and "Slice 3"). Data and geometry only (the pure `LevelBuilder`): the 16 guards, the cameras, the first
 * lasers and their panels (each seen from its near side), the routes on an analytic nav grid (stair ramps included),
 * CR3 (the chamber roof) against a solo player, the gallery -> chamber roof step from above, the light circuits, the M8
 * isolation check, the dormant rule and the A99 screen count (lifts A64). S3 has no choke (A60).
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { buildCampus, campusOps } from '../src/world/maps/campusOps';
import { CAMPUS_COOP_LIPS } from '../src/world/maps/campusLips';
import {
  S3_BOX,
  S3_COOP_LIPS,
  S3_DOORS,
  S3_FLIGHTS,
  S3_GROUPS,
  S3_HIGH_BAYS,
  S3_L1,
  S3_LASERS,
  S3_PANEL_NEAR,
  S3_PANELS,
  S3_ROOMS,
} from '../src/world/maps/campusS3';
import { CAMPUS_ALARMS, CAMPUS_SCREEN_CAP, CAMPUS_SECTORS, CAMPUS_SECURITY } from '../src/world/maps/campusSectors';
import { SECTOR, checkSectorGuards, exitZone, inZone, type SectorGuard } from '../src/game/sectors';
import { validateSecurity } from '../src/security/data';
import { ENEMIES } from '../src/ai/enemyDefs';
import { PATROL } from '../src/ai/patrol';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { HANG, LEDGE } from '../src/world/anchors';
import { hyp2, hyp3 } from '../src/core/mathx';
import { JAMMER } from '../src/game/jammer';
import { CAMERA } from '../src/config/camera';
import { checkPanels, panelTarget } from '../src/game/laserPanels';
import { soloJumpThreats, soloTopLandingThreats, soloTopLandingReach, MANTLE } from './helpers/soloJumpReach';
import { SightWorld, guardPoints, isolatedInTime, longestIsolation, CHECK_ISOLATION, CHECK_PATROL_PACE, CHECK_SPOT, distToGuard, type CheckGuard } from '../src/game/sectorCheck';

const PI = Math.PI;
const b = new LevelBuilder();
const lay = campusOps.build(b, 0);
/** The undressed greybox: the screen count (A99) reads its sight lines here, as invisible dressing (chairs, shelves) must not block them. */
const bG = new LevelBuilder();
buildCampus(bG, { dress: false });
const S3 = CAMPUS_SECTORS[2]!;
/** The base list (the coop4 minPlayers tags are appended and checked in sectorGuardTags.test.ts); ALL = base + tags. */
const G = S3.guards.filter((g) => g.minPlayers === undefined);
const ALL = S3.guards;
/** The S3 footprint. */
const FOOT = { x0: 10, x1: 64, z0: -30, z1: 0 };
const inFoot = (x: number, z: number): boolean => x >= FOOT.x0 && x <= FOOT.x1 && z >= FOOT.z0 && z <= FOOT.z1;

/** The collision pieces as axis-aligned boxes (quarter-turn walls swapped, as in the S1 test; S3's own boxes are all yaw 0). */
const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;

/** The stair ramps as surfaces: (x, z) on a flight -> its height (NaN off it). */
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

/** An analytic layered nav grid over the S3 rectangle (as the S1 test's, with the stair ramps as surfaces). */
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
const nav = analyticNav([3, -32, 71, 18]);
const onNav = (x: number, z: number, y = 0): boolean => nav.isWalkable(nav.cellOf(x, z, y)) && Math.abs(nav.heightAt(x, z, y) - y) < 0.6;
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

/** A guard's patrol cycle (s): the walk at its pace plus the pauses; a timed loop is its master clock's period (the S1 test's). */
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

describe('S3 guards (SPEC "S3" guard table)', () => {
  it('sixteen guards: kinds and weapons as listed, all armed humans (checkSectorGuards), no dogs, the live cap holds', () => {
    expect(G.length).toBe(16);
    expect(G.map((g) => g.kind)).toEqual(['officer', 'officer', 'grunt', 'grunt', 'officer', 'grunt', 'grunt', 'grunt', 'officer', 'grunt', 'officer', 'officer', 'officer', 'grunt', 'officer', 'grunt']);
    expect(G.every((g) => !!ENEMIES[g.kind].weapon && !ENEMIES[g.kind].quadruped)).toBe(true);
    expect(checkSectorGuards(S3)).toEqual([]);
    expect(S3.dogs ?? 0).toBe(0);
    expect(S3.perStage).toBe(2);
    expect(ALL.length + SECTOR.alarmMax * S3.perStage).toBeLessThanOrEqual(SECTOR.maxAlive);
  });

  it('every guard has a role, a zone, a reason and a squad; #2-#3 are a pair; no posted guard and no post block (A60: S3 has no choke)', () => {
    for (const [i, g] of G.entries()) {
      expect(g.role, `#${i + 1} role`).toBeTruthy();
      expect(g.zone, `#${i + 1} zone`).toBeTruthy();
      expect(g.reason && g.reason.length > 8, `#${i + 1} reason`).toBe(true);
      expect(g.squad, `#${i + 1} squad`).not.toBeUndefined();
    }
    expect(G[1]!.pair).toBe(2);
    expect(G[2]!.pair).toBe(1);
    expect(G.some((g) => g.role === 'posted')).toBe(false);
    expect(G.some((g) => g.post !== undefined)).toBe(false);
  });

  it('each patrol cycle is 25-45 s; the posts are #1, #4, #5, #9, #13', () => {
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
    expect(posts).toEqual([1, 4, 5, 9, 13]);
  });

  it('the viewing-corridor pair (#2, #3): one clock, the slower walker fits every leg, stops of 3-6 s', () => {
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
    expect(G[1]!.loop).toEqual(G[2]!.loop);
    // side by side across the corridor, facing each other at the stops
    expect(G[1]!.faces).toEqual([0, 0]);
    expect(G[2]!.faces).toEqual([PI, PI]);
  });

  it('every slot is >= 7 m from the start and on the nav grid (its storey); every route point and takedown spot too', () => {
    for (const [i, g] of ALL.entries()) {
      const y = g.y ?? 0;
      expect(hyp2(g.x - S3.start.x, g.z - S3.start.z), `#${i + 1}`).toBeGreaterThanOrEqual(7);
      expect(onNav(g.x, g.z, y), `#${i + 1} slot (${g.x}, ${y}, ${g.z})`).toBe(true);
      for (const p of g.route ?? []) expect(onNav(p[0], p[1], y), `#${i + 1} route (${p[0]}, ${p[1]})`).toBe(true);
      expect(distToGuard(g, g.takedownSpot[0], g.takedownSpot[1]), `#${i + 1} takedown spot`).toBeLessThanOrEqual(CHECK_SPOT);
      expect(onNav(g.takedownSpot[0], g.takedownSpot[1], y), `#${i + 1} takedown spot on the nav grid`).toBe(true);
      if (g.route) expect(hyp2(g.route[0]![0] - g.x, g.route[0]![1] - g.z)).toBeLessThan(0.1);
      // the L1 guards stand on L1 (4.5), the rest on the ground
      expect([0, S3_L1]).toContain(y);
    }
    // the hall patrols' routes and each walked leg have a nav path (the guards really can walk them)
    for (const [i, g] of ALL.entries()) {
      const r = g.route;
      if (!r) continue;
      const y = g.y ?? 0;
      for (let k = 0; k < r.length; k++) {
        const a = r[k]!;
        const c = r[(k + 1) % r.length]!;
        if (r.length === 2 && k === 1) continue;
        expect(pathLen([a[0], a[1], y], [c[0], c[1], y]), `#${i + 1} leg ${k}`).not.toBeNull();
      }
    }
  });

  it('(A64) the dormant rule: no pair member, handler, posted guard or dog is dormant; #12 and #14 are', () => {
    const handlers = new Set(G.map((g) => g.handler).filter((h): h is number => h !== undefined));
    G.forEach((g, i) => {
      if (g.pair !== undefined || handlers.has(i) || g.role === 'posted' || ENEMIES[g.kind].quadruped) expect(g.dormant, `guard #${i + 1}`).not.toBe(true);
    });
    expect(G.map((g, i) => (g.dormant ? i + 1 : 0)).filter((n) => n > 0)).toEqual([12, 14]);
  });
});

describe('S3 cameras, alarms, objective, routes', () => {
  const cams = CAMPUS_SECURITY.devices.filter((c) => c.section === 2);
  it('cam-view and cam-dock: range 8-12, an aim, a reason, valid security data, section 3', () => {
    expect(cams.map((c) => c.id)).toEqual(['cam-view', 'cam-dock']);
    expect(validateSecurity(CAMPUS_SECURITY)).toEqual([]);
    for (const c of cams) {
      expect(c.range!, c.id).toBeGreaterThanOrEqual(8);
      expect(c.range!, c.id).toBeLessThanOrEqual(12);
      expect(c.aim, c.id).toBeDefined();
      expect(c.reason.length, c.id).toBeGreaterThan(8);
      expect(inFoot(c.at[0], c.at[1]), c.id).toBe(true);
    }
    // cam-view on L1 at the corridor's store end facing west; cam-dock over the C3 door facing in (south)
    expect(cams[0]!.level).toBe('s3-l1');
    expect(CAMPUS_SECURITY.levels!['s3-l1']).toBe(S3_L1);
    expect(cams[0]!.facing).toBe(270);
    expect(cams[1]!.facing).toBe(180);
    expect(hyp2(cams[1]!.at[0] - S3_DOORS.c3Near[0], cams[1]!.at[1] - S3_DOORS.c3Near[1])).toBeLessThan(1);
  });

  it('alarm-dock (G) and alarm-sec (L1) are section 3\'s panels; the layout carries them at their floors', () => {
    const al = CAMPUS_ALARMS.filter((a) => a.section === 2);
    expect(al.length).toBe(2);
    const la = lay.alarms!.filter((a) => a.section === 2);
    expect(la.map((a) => a.pos.y)).toEqual([0, S3_L1]);
    for (const a of la) expect(inFoot(a.pos.x, a.pos.z)).toBe(true);
  });

  it('the objective: a grab at the store shelf (L1); every route starts at the start, reaches it within the interact reach and ends in C3', () => {
    expect(S3.objective).toMatchObject({ kind: 'grab', y: S3_L1 });
    const [sx0, sz0, sx1, sz1] = S3_BOX.store;
    expect(S3.objective.x > sx0 && S3.objective.x < sx1 && S3.objective.z > sz0 && S3.objective.z < sz1).toBe(true);
    expect(S3.routes.length).toBeGreaterThanOrEqual(2);
    const exit = exitZone(S3)!;
    for (const r of S3.routes) {
      const first = r.pts[0]!;
      const at = r.pts[r.obj]!;
      const last = r.pts[r.pts.length - 1]!;
      expect(hyp2(first[0] - S3.start.x, first[1] - S3.start.z), r.name).toBeLessThan(0.5);
      expect(hyp3(at[0] - S3.objective.x, (at[2] ?? 0) - S3.objective.y, at[1] - S3.objective.z), r.name).toBeLessThan(1.8);
      expect(inZone(exit, last[0], last[2] ?? 0, last[1]), r.name).toBe(true);
      // every route crosses las-store's line (the beams guard the shelf)
      const before = r.pts[r.obj - 1]!;
      expect(before[0] < 48.5 && at[0] > 48.5, `${r.name} crosses the beams`).toBe(true);
    }
    expect(new Set(S3.routes.map((r) => JSON.stringify(r.pts))).size).toBe(S3.routes.length);
    for (const [x, z] of S3.reinforce) expect(onNav(x, z), `reinforce (${x}, ${z})`).toBe(true);
    // the start is the S2 stub's C2 checkpoint, the connector C3 the S4 stub's start
    expect(S3.start).toEqual(CAMPUS_SECTORS[1]!.connector!.checkpoint);
    expect(CAMPUS_SECTORS[3]!.start).toEqual(S3.connector!.checkpoint);
  });

  it('every route point is on the nav grid and every walked leg has a nav path (stairs walked; the ladder legs are `climbs`)', () => {
    for (const r of S3.routes) {
      r.pts.forEach((p, i) => expect(onNav(p[0], p[1], p[2] ?? 0), `${r.name} point ${i} (${p})`).toBe(true));
      for (let i = 0; i + 1 < r.pts.length; i++) {
        if ((r.climbs ?? []).includes(i)) continue;
        const a = r.pts[i]!;
        const c = r.pts[i + 1]!;
        const len = pathLen([a[0], a[1], a[2] ?? 0], [c[0], c[1], c[2] ?? 0]);
        expect(len, `${r.name} leg ${i}: ${a} -> ${c}`).not.toBeNull();
        expect(len!, `${r.name} leg ${i} detour`).toBeLessThanOrEqual(hyp2(c[0] - a[0], c[1] - a[1]) * 2.5 + 8);
      }
    }
  });

  it('the hall reaches the walkway by the caged ladders only, L1 by the stairs; the gallery and spur from the north stair', () => {
    const up = nav.findPath([26, -20], [30, -29.25], 200000, 0, 6);
    expect(up).not.toBeNull();
    expect(up!.some((w) => w.link?.kind === 'ladder')).toBe(true);
    expect(pathLen([26, -20, 0], [45.4, -4.2, S3_L1])).not.toBeNull();
    // the gallery spur from the viewing corridor (the north stair's L1 door, the gallery door)
    expect(pathLen([42, -6.6, S3_L1], [33, -12, S3_L1])).not.toBeNull();
    for (const s of lay.hideSpots!.filter((h) => inFoot(h.pos.x, h.pos.z))) expect(onNav(s.pos.x, s.pos.z, s.pos.y), `hide (${s.pos.x}, ${s.pos.z})`).toBe(true);
  });
});

describe('S3 lasers (R5): las-gown and las-store, one panel each, seen from the near side', () => {
  const world = new SightWorld(b.boxes, b.cylinders);
  it('two lasers in section 3 on L1, each with exactly one panel (checkPanels); the layout carries them', () => {
    expect(S3_LASERS.map((l) => l.id)).toEqual(['las-gown', 'las-store']);
    expect(checkPanels(S3_LASERS, S3_PANELS)).toEqual([]);
    expect(checkPanels(lay.lasers ?? [], lay.laserPanels ?? [])).toEqual([]);
    for (const l of S3_LASERS) {
      expect(l.section).toBe(2);
      expect(l.floorY).toBe(S3_L1);
      expect(l.label && l.label.length > 4).toBe(true);
    }
    expect(S3_PANELS.every((p) => p.section === 2 && !!p.label)).toBe(true);
  });

  it('each panel\'s jam point has a clear eye line from every near-side point (on the nav grid, within the jammer\'s range)', () => {
    const t = { x: 0, y: 0, z: 0 };
    for (const p of S3_PANELS) {
      panelTarget(p, t);
      const l = S3_LASERS.find((q) => q.id === p.lasers[0])!;
      const pts = S3_PANEL_NEAR[p.id]!;
      expect(pts.length).toBeGreaterThan(0);
      for (const [x, y, z] of pts) {
        // the near side: the beam line is between this point and the shelf / clean room (x below the band's x)
        expect(x, `${p.id} near point x`).toBeLessThan(l.x1);
        expect(onNav(x, z, y), `${p.id} near point (${x}, ${z})`).toBe(true);
        expect(hyp3(t.x - x, t.y - (y + 1.6), t.z - z)).toBeLessThan(JAMMER.range);
        expect(world.clear(x, y + 1.6, z, t.x, t.y, t.z), `${p.id} seen from (${x}, ${y}, ${z})`).toBe(true);
      }
    }
  });

  it('las-store crosses the store\'s aisle gap: the partition leaves no way round the beams', () => {
    const l = S3_LASERS.find((q) => q.id === 'las-store')!;
    const [, sz0, , sz1] = S3_BOX.store;
    // walk the partition line x 48.5 on L1: the only walkable cells are inside the beam span
    for (let z = sz0 + 0.25; z < sz1; z += 0.5) {
      if (!onNav(48.5, z, S3_L1)) continue;
      expect(z >= Math.min(l.z1, l.z2) - 0.01 && z <= Math.max(l.z1, l.z2) + 0.01, `the aisle at z ${z}`).toBe(true);
    }
    // the pass-through: las-gown spans the 1.2 m gap in the x 33 wall
    const g = S3_LASERS.find((q) => q.id === 'las-gown')!;
    expect(Math.abs(g.z2 - g.z1)).toBeCloseTo(1.2);
  });
});

describe('CR3: the chamber roof against a solo player (SPEC Campus-wide rules 1-6, PLAN slice 3)', () => {
  const cr3 = S3_COOP_LIPS[0]!;
  const [cx0, cz0, cx1, cz1] = S3_BOX.chamber;
  const isChamber = (p: BoxPiece): boolean => Math.abs(p.c[0] - (cx0 + cx1) / 2) < 1e-6 && Math.abs(p.c[2] - (cz0 + cz1) / 2) < 1e-6 && Math.abs(top(p) - S3_BOX.chamberTop) < 1e-6;
  const grips = [
    { name: 'west', y: 4.4, a: { x: cx0, z: cz0 }, b: { x: cx0, z: cz1 }, n: { x: -1, z: 0 } },
    { name: 'east', y: 4.4, a: { x: cx1, z: cz0 }, b: { x: cx1, z: cz1 }, n: { x: 1, z: 0 } },
    { name: 'south', y: 4.4, a: { x: cx0, z: cz0 }, b: { x: cx1, z: cz0 }, n: { x: 0, z: -1 } },
    { name: 'north', y: 4.4, a: { x: cx0, z: cz1 }, b: { x: cx1, z: cz1 }, n: { x: 0, z: 1 } },
  ];

  it('CR3 is the chamber\'s west face: x 30, z -22..-14, 4.4 over a floor-0 boost; a different list from CR1 (campusS1.ts is not this slice\'s)', () => {
    expect(cr3.id).toBe('CR3');
    expect(cr3.section).toBe(2);
    expect(cr3.lip).toMatchObject({ x: 30, z0: -22, z1: -14, y: 4.4 });
    expect(cr3.top).toEqual({ x0: 30, x1: 36, z0: -22, z1: -14, top: 4.4 });
    const ch = solid.find(isChamber)!;
    expect(ch).toBeTruthy();
    expect(top(ch) - cr3.boost.floor).toBeGreaterThanOrEqual(4.3);
    expect(top(ch) - cr3.boost.floor).toBeLessThanOrEqual(4.5);
    expect(ch.noLedge).not.toBe(true);
    expect(onNav(cr3.boost.x, cr3.boost.z)).toBe(true);
    expect(CAMPUS_COOP_LIPS.some((l) => l.id === 'CR3')).toBe(true);
  });

  for (const g of grips) {
    it(`the chamber's ${g.name} face: no solo running jump reaches the 4.4 lip (0.5 m margin)`, () => {
      expect(soloJumpThreats(solid, g, () => false, 0.5)).toEqual([]);
    });
  }

  it('no solo top lands on the chamber roof (rule 4, 0.5 m): the racks, the benches and the EMC room roof cannot reach it', () => {
    expect(soloTopLandingThreats(solid, cr3.top, isChamber, 0.5)).toEqual([]);
    // the named ones: the burn-in racks (2.2) and the EMC room (4.0) are noLedge over the mantle (no top to stand on alone),
    // the benches are under 1.2 (rule 2); the EMC roof would be out of reach even if it were standable
    const racks = solid.filter((p) => Math.abs(top(p) - S3_BOX.racksTop) < 1e-6 && p.c[0] > 50 && p.c[0] < 52);
    expect(racks.length).toBe(S3_BOX.racks.length);
    expect(racks.every((p) => p.noLedge && top(p) > MANTLE)).toBe(true);
    const emc = solid.find((p) => Math.abs(top(p) - S3_BOX.emcTop) < 1e-6 && Math.abs(p.c[0] - 45) < 1e-6)!;
    expect(emc.noLedge && top(emc) > MANTLE).toBe(true);
    expect(S3_BOX.emc[0] - cx1).toBeGreaterThan(soloTopLandingReach(S3_BOX.emcTop, 4.4) + 0.5);
    const benches = solid.filter((p) => Math.abs(top(p) - S3_BOX.benchTop) < 1e-6 && inFoot(p.c[0], p.c[2]) && bottom(p) < 0.01);
    expect(benches.length).toBe(S3_BOX.benches.length);
    for (const r of S3_BOX.racks) expect(r[0] - cx1, 'racks >= 4.5 m from the chamber').toBeGreaterThanOrEqual(4.5);
  });

  it('rule 2: nothing solo-standable at 1.2 m or higher (and under the lip) within 4 m in plan of the chamber roof', () => {
    const bad = solid.filter((p) => {
      const t = top(p);
      if (t < 1.2 || t >= 4.4 - 0.05) return false;
      if (Math.min(p.s[0], p.s[2]) < LEDGE.climbDepth) return false;
      if (p.noLedge && t > MANTLE) return false;
      const gx = Math.max(0, Math.max(cx0 - (p.c[0] + p.s[0] / 2), p.c[0] - p.s[0] / 2 - cx1));
      const gz = Math.max(0, Math.max(cz0 - (p.c[2] + p.s[2] / 2), p.c[2] - p.s[2] / 2 - cz1));
      return hyp2(gx, gz) <= 4;
    });
    expect(bad.map((p) => [p.c, p.s])).toEqual([]);
  });

  it('rule 3: nothing 0.3-4.3 high within 1 m of the chamber\'s west face (no step under the lip)', () => {
    const under = solid.filter((p) => !isChamber(p) && top(p) > 0.3 && bottom(p) < 4.3 && p.c[0] + p.s[0] / 2 > cx0 - 1 && p.c[0] - p.s[0] / 2 < cx0 && p.c[2] + p.s[2] / 2 > cz0 && p.c[2] - p.s[2] / 2 < cz1);
    expect(under.map((p) => [p.c, p.s])).toEqual([]);
  });

  it('rule 5 headroom: clear air from 4.5 to 6.2 over the west lip, 0.45 + HANG.out in and 0.4 out (the plant is set back)', () => {
    const l = cr3.lip;
    const x0 = l.x - 0.4;
    const x1 = l.x + 0.45 + HANG.out;
    const hit = solid.filter((p) => p.c[0] + p.s[0] / 2 > x0 && p.c[0] - p.s[0] / 2 < x1 && p.c[2] + p.s[2] / 2 > l.z0 && p.c[2] - p.s[2] / 2 < l.z1 && top(p) > l.y + 0.1 && bottom(p) < 6.2);
    expect(hit.map((p) => p.c)).toEqual([]);
    expect(b.cylinders.filter((c) => c.collide && c.c[0] + c.r > x0 && c.c[0] - c.r < x1 && c.c[2] + c.r > l.z0 && c.c[2] - c.r < l.z1 && c.c[1] + c.h / 2 > l.y + 0.1).length).toBe(0);
  });

  it('rule 6: S3 ground boxes 1.9-4.2 high are noLedge (the racks, the EMC room, the walls)', () => {
    for (const p of solid) {
      const h = p.s[1];
      if (h < 1.9 || h > 4.2 || !inFoot(p.c[0], p.c[2]) || bottom(p) > 0.01) continue;
      expect(p.noLedge, `${JSON.stringify(p.c)} ${JSON.stringify(p.s)}`).toBe(true);
    }
  });

  it('rule 7, from above: the gallery spur ends 0.5 m off the chamber\'s north face, a solo step down onto the roof (allowed); no rail across its end', () => {
    const [sx0, sz0, sx1] = S3_BOX.spur;
    expect(sz0 - cz1).toBeCloseTo(0.5);
    expect(sz0 - cz1).toBeLessThan(soloTopLandingReach(S3_L1, 4.4));
    // the spur's end: nothing standing on it across x 31.1..34.9 (only its side rails)
    const across = solid.filter((p) => bottom(p) >= S3_L1 - 0.01 && bottom(p) < S3_L1 + 1 && p.c[2] - p.s[2] / 2 < sz0 + 0.3 && p.c[2] + p.s[2] / 2 > sz0 && p.c[0] - p.s[0] / 2 < sx1 - 0.2 && p.c[0] + p.s[0] / 2 > sx0 + 0.2);
    expect(across.map((p) => p.c)).toEqual([]);
  });

  it('the gallery and the spur (4.5) are not solo-reachable from the hall floor either (the chamber top is the planned step from above)', () => {
    const [gx0, gz0, gx1] = S3_BOX.gallery;
    const [sx0, sz0, sx1, sz1] = S3_BOX.spur;
    const spurEnd = { y: S3_L1, a: { x: sx0, z: sz0 }, b: { x: sx1, z: sz0 }, n: { x: 0, z: -1 } };
    expect(soloJumpThreats(solid, spurEnd, isChamber, 0.5)).toEqual([]);
    expect(soloTopLandingThreats(solid, { x0: sx0, x1: sx1, z0: sz0, z1: sz1, top: S3_L1 }, isChamber, 0.5)).toEqual([]);
    expect(soloTopLandingThreats(solid, { x0: gx0, x1: gx1, z0: gz0, z1: S3_BOX.gallery[3], top: S3_L1 }, isChamber, 0.5)).toEqual([]);
    // the gallery's south edge and the spur's sides carry 1.1 rails (noLedge): no 4.5 grip from below
    const rails = solid.filter((p) => Math.abs(bottom(p) - S3_L1) < 1e-6 && Math.abs(p.s[1] - 1.1) < 1e-6 && p.c[2] < -8 && p.c[2] > -14);
    expect(rails.length).toBeGreaterThanOrEqual(6);
    expect(rails.every((p) => p.noLedge)).toBe(true);
  });
});

describe('S3 lighting (SPEC "Lighting")', () => {
  const lights = b.lights.lights;
  const group = (g: number) => lights.filter((l) => l.group === g);
  it('the high bays: three rows at 8.5 (4, 3, 4), shootable and electric; the corridor, burn-in, dock, office and security room circuits', () => {
    expect(group(S3_GROUPS.hb1).length).toBe(4);
    expect(group(S3_GROUPS.hb2).length).toBe(3);
    expect(group(S3_GROUPS.hb3).length).toBe(4);
    expect(S3_HIGH_BAYS.length).toBe(11);
    for (const g of [S3_GROUPS.hb1, S3_GROUPS.hb2, S3_GROUPS.hb3]) expect(group(g).every((l) => l.y === 8.5 && l.destructible && l.electric)).toBe(true);
    for (const g of [S3_GROUPS.view, S3_GROUPS.burn, S3_GROUPS.dock, S3_GROUPS.office, S3_GROUPS.sec]) expect(group(g).length, `group ${g}`).toBeGreaterThan(0);
    for (const l of lights.filter((q) => q.intensity > 0 && inFoot(q.x, q.z))) expect(l.destructible && l.electric, `lamp ${l.id}`).toBe(true);
  });

  it('the switch bank: the three rows by the hall\'s west door, on the lobby side; the corridor has two door switches; every S3 circuit has a switch', () => {
    const sw = lay.switches!;
    for (const g of [S3_GROUPS.hb1, S3_GROUPS.hb2, S3_GROUPS.hb3]) {
      const s = sw.filter((q) => q.group === g);
      expect(s.length).toBe(1);
      expect(hyp2(s[0]!.pos.x - S3_DOORS.hallWest[0], s[0]!.pos.z - S3_DOORS.hallWest[1])).toBeLessThan(2.5);
      expect(s[0]!.pos.x).toBeLessThan(S3_DOORS.hallWest[0]);
    }
    expect(sw.filter((q) => q.group === S3_GROUPS.view).length).toBe(2);
    for (const g of Object.values(S3_GROUPS)) expect(sw.some((q) => q.group === g), `switch for ${g}`).toBe(true);
  });

  it('dark by reason: no fitting over the chamber or the EMC room, none in the gas cage or the east yard; the standby fill 0.14, the stairs 0.30', () => {
    const lit = lights.filter((l) => l.on && l.intensity > 0);
    const over = (box: readonly number[]) => lit.filter((l) => l.x >= box[0]! && l.x <= box[2]! && l.z >= box[1]! && l.z <= box[3]!);
    expect(over(S3_BOX.chamber).length).toBe(0);
    expect(over(S3_BOX.emc).length).toBe(0);
    expect(over(S3_BOX.gasCage).length).toBe(0);
    expect(lit.filter((l) => l.x > 64 && l.x <= 70 && l.z >= -30 && l.z <= 0).length).toBe(0);
    expect(b.lights.zoneAt(26, 1, -20)).toBe(0.14);
    expect(b.lights.zoneAt(30, S3_L1 + 1, -7)).toBe(0.14);
    expect(b.lights.zoneAt(13.3, 1, -25)).toBe(0.3);
    expect(b.lights.zoneAt(41.3, 1, -3)).toBe(0.3);
  });

  it('the rooms (HUD tags) do not overlap (storeys apart) and none carries a squad', () => {
    for (let i = 0; i < S3_ROOMS.length; i++)
      for (let j = i + 1; j < S3_ROOMS.length; j++) {
        const a = S3_ROOMS[i]!;
        const c = S3_ROOMS[j]!;
        const ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX);
        const oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
        const oy = Math.min(a.maxY ?? Infinity, c.maxY ?? Infinity) - Math.max(a.minY ?? -Infinity, c.minY ?? -Infinity);
        expect(ox > 0.01 && oz > 0.01 && oy > 0.01, `${a.id} overlaps ${c.id}`).toBe(false);
      }
    expect(S3_ROOMS.every((r) => (r.squad ?? []).length === 0)).toBe(true);
  });
});

describe('M8: isolation in time at each takedown spot (sectorCheck, as slice 1 runs it)', () => {
  const world = new SightWorld(b.boxes, b.cylinders);
  const timed: CheckGuard[] = G.map((g) => {
    const speed = ENEMIES[g.kind].walkSpeed * (g.loop ? 1 : CHECK_PATROL_PACE);
    return { x: g.x, z: g.z, y: g.y, route: g.route as readonly (readonly [number, number])[] | undefined, wait: g.wait, waits: g.waits, speed, loop: g.loop };
  });
  it('records each guard\'s longest isolated run at its spot; every guard outside the recorded overlap pairs holds 3 s', () => {
    const rows = G.map((g, i) => ({ n: i + 1, run: longestIsolation(world, timed, i, 15, g.takedownSpot), ok: isolatedInTime(world, timed, i, g.takedownSpot) }));
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(rows.map((r) => `#${r.n} ${r.run}s ${r.ok ? 'ok' : 'NOT isolated'}`).join('\n'));
    // recorded exceptions (LS 4.5 overlap partners, their takedowns come by a lure or the split, not by isolation in time):
    // the viewing-corridor pair #2-#3 (walking together)
    const must = rows.filter((r) => ![2, 3].includes(r.n));
    expect(must.filter((r) => !r.ok).map((r) => `#${r.n} (${r.run}s)`)).toEqual([]);
    expect(CHECK_ISOLATION).toBe(3);
  });
});

describe('A99: the screen count (no player point sees more than CAMPUS_SCREEN_CAP guards, every guard counted)', () => {
  /** The gallery door leaf on L1 (x 40.7..41.9 at z -8) counted as shut: a real leaf in play, closed by default. */
  const galleryLeaf: BoxPiece = { c: [41.3, S3_L1 + 1.05, -8], s: [1.2, 2.1, 0.1], yaw: 0, pitch: 0, color: '#000', collide: true };
  /** Only the pieces near the S3 footprint (every awake guard and every sample is inside it): the same sight model, faster. */
  const near = (p: BoxPiece): boolean => p.c[0] + p.s[0] > FOOT.x0 - 2 && p.c[0] - p.s[0] < FOOT.x1 + 2 && p.c[2] + p.s[2] > FOOT.z0 - 2 && p.c[2] - p.s[2] < FOOT.z1 + 2;
  const world = new SightWorld([...bG.boxes.filter(near), galleryLeaf], bG.cylinders);
  /** The camera's horizontal field of view (deg, CT's 86) and the facings sampled at each point (32, every 11.25 deg). */
  const HALF = ((CAMERA.fov / 2) * PI) / 180;
  const YAWS = Array.from({ length: 32 }, (_, k) => (k * PI) / 16);
  it('at every walkable nav cell centre (0.5 m) on every S3 level, 32 facings: at most CAMPUS_SCREEN_CAP guards (dormant too) anywhere on their routes in the 86 deg view with a clear line within 40 m', () => {
    const awake = ALL.map((g, i) => ({ g, i }));
    // every point a guard stands on or walks through (the post, then each route leg every 1 m): guards start out of
    // phase in play, so any combination of positions can line up
    const pts = awake.map(({ g }) => guardPoints({ x: g.x, z: g.z, y: g.y, route: g.route as readonly (readonly [number, number])[] | undefined }).map(([px, py, pz]) => [px, py + 1.2, pz] as const));
    let worst = { n: -1, at: '', who: [] as number[] };
    let samples = 0;
    let walkway = 0;
    let over = 0;
    for (let col = 0; col < nav.cols; col++) {
      const [x, z] = nav.center(col);
      if (!inFoot(x, z)) continue;
      for (let l = 0; l < nav.layers; l++) {
        const i = l * nav.cols + col;
        if (!nav.walk[i]) continue;
        const h = nav.height[i]!;
        if (h > 7) continue;
        samples++;
        if (Math.abs(h - S3_BOX.walkwayTop) < 0.05 && x > 24 && x < 50) walkway++;
        const eye = h + 1.6;
        // each guard's visible points as bearings (yaw: 0 = +z)
        const seen = awake.map(({ i: gi }, k) => ({
          n: gi + 1,
          at: pts[k]!.filter(([px, py, pz]) => hyp2(px - x, pz - z) <= 40 && world.clear(x, eye, z, px, py, pz)).map(([px, , pz]) => Math.atan2(px - x, pz - z)),
        }));
        let best = 0;
        for (const yaw of YAWS) {
          const who = seen.filter((s) => s.at.some((a) => Math.abs(Math.atan2(Math.sin(a - yaw), Math.cos(a - yaw))) <= HALF)).map((s) => s.n);
          if (who.length > best) best = who.length;
          if (who.length > worst.n) worst = { n: who.length, at: `(${x}, ${h.toFixed(2)}, ${z}) facing ${((yaw * 180) / PI).toFixed(0)}`, who };
        }
        if (best > CAMPUS_SCREEN_CAP) over++;
      }
    }
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(`A99 worst ${worst.n} at ${worst.at}: #${worst.who.join(', #')} (${samples} points, ${walkway} on the walkway interior, ${over} over ${CAMPUS_SCREEN_CAP})`);
    expect(samples).toBeGreaterThan(3000);
    // the crane walkway's interior (between its ladders, past the rail's ends) is sampled: the old 2 m grid missed it
    expect(walkway).toBeGreaterThan(50);
    expect(worst.n, `worst ${worst.at}: #${worst.who.join(', #')}`).toBeLessThanOrEqual(CAMPUS_SCREEN_CAP);
  }, 300_000);
});
