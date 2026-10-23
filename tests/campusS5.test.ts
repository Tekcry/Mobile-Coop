/**
 * Saltmarsh Park (`campusOps`) slice 5: section 5, the Old House and the extraction (`docs/sector-redesign/briefs/SLICE5.md`).
 * Data and geometry only (the pure `LevelBuilder`): 24 guards (two dogs), three cameras, the shaft beams and their panel,
 * the three routes on an analytic nav grid (stair ramps included) and on the runtime grid, K4 (the keyholders), CR6 (the
 * pair gate), CR7 (the rope well), no leg-up lip, the light circuits, sealing, door separation, M8 isolation, the dormant
 * rule and the A99 screen count (lifts A64).
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { buildCampus, campusOps } from '../src/world/maps/campusOps';
import {
  S5_AMMO_CRATE,
  S5_ARMOURED,
  S5_ROUTES,
  S5_SECTOR,
} from '../src/world/maps/campusS5Data';
import {
  S5_BOARDS,
  S5_CORE,
  S5_DOORS,
  S5_FLIGHTS,
  S5_GROUPS,
  S5_HALL_STAIR,
  S5_L1,
  S5_LASERS,
  S5_PANEL_NEAR,
  S5_PANELS,
  S5_ROOMS,
  S5_ROPE_EDGE,
  S5_BULKHEAD_TOP,
  coreFlights,
} from '../src/world/maps/campusS5';
import { CAMPUS_ALARMS, CAMPUS_SCREEN_CAP, CAMPUS_SECTORS, CAMPUS_SECURITY } from '../src/world/maps/campusSectors';
import { SECTOR, checkSectorGuards, checkSectors, inZone, intelItemId, type SectorGuard } from '../src/game/sectors';
import { addDoorClosure, checkStageActions, doorFinder } from '../src/game/sectorStage';
import { validateSecurity, WIRE_CAMERAS } from '../src/security/data';
import { ENEMIES } from '../src/ai/enemyDefs';
import { PATROL } from '../src/ai/patrol';
import { PERCEPTION } from '../src/ai/perception';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { generateLedges } from '../src/world/anchors';
import { hyp2, hyp3 } from '../src/core/mathx';
import { JAMMER } from '../src/game/jammer';
import { CAMERA } from '../src/config/security';
import { CAMERA as CAMERA_VIEW } from '../src/config/camera';
import { LANDING_NOISE_RADIUS } from '../src/config/noise';
import { ropeRoom } from '../src/game/teamMoves';
import { checkPanels, panelTarget } from '../src/game/laserPanels';
import { SightWorld, guardPoints, isolatedInTime, longestIsolation, CHECK_ISOLATION, CHECK_PATROL_PACE, CHECK_SPOT, distToGuard, type CheckGuard } from '../src/game/sectorCheck';
import { runtimeNav } from './helpers/runtimeNav';

const PI = Math.PI;
const b = new LevelBuilder();
const lay = campusOps.build(b, 0);
/** The undressed greybox: the screen count (A99) reads its sight lines here, as invisible dressing (chairs, shelves) must not block them. */
const bG = new LevelBuilder();
buildCampus(bG, { dress: false });
const S5 = CAMPUS_SECTORS[4]!;
const G = S5.guards;
/** The S5 footprint and the C4 box. */
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

/** An analytic layered nav grid over a rectangle (as S3's, with the stair ramps as surfaces). */
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
/** A walkable nav cell on floor y within r of (x, z): a switch or panel stands on a wall, its user beside it. */
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

const doorCentre = (d: (typeof b.anchors.doors)[number]): [number, number] => [d.hinge.x + Math.sin(d.yaw) * d.width * 0.5, d.hinge.z + Math.cos(d.yaw) * d.width * 0.5];

describe('S5 registration, shape and the shared blocks', () => {
  it('the S5 entry: grab, 24 guards, two dogs, perStage 2, the C4 checkpoint as the start, the extract box, no connector, the live cap', () => {
    expect(CAMPUS_SECTORS.length).toBe(5);
    expect(S5).toBe(S5_SECTOR);
    expect(S5.id).toBe('s5');
    expect(S5.objective.kind).toBe('grab');
    expect(G.length).toBe(24);
    expect(S5.dogs).toBe(2);
    expect(S5.perStage).toBe(2);
    expect(S5.start).toEqual(CAMPUS_SECTORS[3]!.connector!.checkpoint);
    expect(S5.extract!.box).toEqual([-50, 60, -40, 66]);
    expect(S5.connector).toBeUndefined();
    expect(G.length + SECTOR.alarmMax * S5.perStage).toBeLessThanOrEqual(SECTOR.maxAlive);
  });

  it('checkSectors and checkStageActions are clean (the kitchen and the hall stay open)', () => {
    expect(checkSectors(CAMPUS_SECTORS, undefined, lay.security)).toEqual([]);
    expect(checkStageActions([CAMPUS_SECTORS[3]!, S5], { nav, doorAt: doorFinder(b.anchors.doors) })).toEqual([]);
  });

  it('the layout carries S5: rooms, the nine switches, the board, the laser and panel, the hide spots, the nav seeds, the alarms (C4\'s door is built)', () => {
    expect(lay.switches!.length).toBeGreaterThanOrEqual(9 + 9 + 7 + 5);
    // (cap fix) the layout tags each section's board with its section
    expect(lay.boards).toContainEqual({ ...S5_BOARDS[0]!, section: 4 });
    expect(lay.lasers!.some((l) => l.id === 'las-shaft')).toBe(true);
    expect(lay.laserPanels!.some((p) => p.id === 'panel-shaft')).toBe(true);
    const al = lay.alarms!.filter((a) => a.section === 4);
    expect(al.length).toBe(3);
    for (const a of al) expect(inFoot(a.pos.x, a.pos.z)).toBe(true);
    expect(CAMPUS_ALARMS.filter((a) => a.section === 4).length).toBe(3);
    const door = b.anchors.doors.find((d) => hyp2(doorCentre(d)[0] - S5_DOORS.c4Far[0], doorCentre(d)[1] - S5_DOORS.c4Far[1]) < 0.3);
    expect(door).toBeTruthy();
    expect(CAMPUS_SECTORS[3]!.connector!.farAt).toEqual([...S5_DOORS.c4Far]);
  });
});

describe('S5 guards (brief table)', () => {
  it('24 guards: kinds as listed, `checkSectorGuards` clean, two dogs with handlers #5 and #7, every guard role / zone / reason / squad', () => {
    expect(G.map((g) => g.kind)).toEqual([
      'grunt', 'grunt', 'grunt', 'grunt', 'grunt', 'dog', 'grunt', 'dog', 'officer', 'officer', 'officer', 'officer',
      'grunt', 'grunt', 'officer', 'officer', 'grunt', 'grunt', 'grunt', 'grunt', 'grunt', 'officer', 'grunt', 'officer',
    ]);
    expect(checkSectorGuards(S5)).toEqual([]);
    expect(G[5]!.handler).toBe(4);
    expect(G[7]!.handler).toBe(6);
    expect(G.filter((g) => ENEMIES[g.kind].quadruped).length).toBe(2);
    for (const [i, g] of G.entries()) {
      expect(g.role, `#${i + 1} role`).toBeTruthy();
      expect(g.zone, `#${i + 1} zone`).toBeTruthy();
      expect(g.reason && g.reason.length > 8, `#${i + 1} reason`).toBe(true);
      expect(g.squad, `#${i + 1} squad`).not.toBeUndefined();
    }
    expect(G[8]!.pair).toBeUndefined(); // a standing pair, not a guard-ai S10 talking pair (needs timed loops)
    expect(G[9]!.pair).toBeUndefined(); // a standing pair, not a guard-ai S10 talking pair (needs timed loops)
    expect(G[15]!.pair).toBeUndefined(); // a standing pair, not a guard-ai S10 talking pair (needs timed loops)
    expect(G[16]!.pair).toBeUndefined(); // a standing pair, not a guard-ai S10 talking pair (needs timed loops)
    expect(G[8]!.role).toBe('posted');
    expect(G[9]!.role).toBe('posted');
    expect(G[8]!.post).toEqual({ leash: 3, highSecurity: true, guards: 'token' });
    expect(G[9]!.post).toEqual(G[8]!.post);
  });

  it('each patrol cycle is 25-45 s, stops 3-6 s on the loops (the slower walker fits every leg); slots >= 7 m from the start', () => {
    for (const [i, g] of G.entries()) {
      const c = cycle(g);
      if (c !== null) {
        expect(c, `#${i + 1} cycle ${c}`).toBeGreaterThanOrEqual(25);
        expect(c, `#${i + 1} cycle ${c}`).toBeLessThanOrEqual(45);
      }
      expect(hyp2(g.x - S5.start.x, g.z - S5.start.z), `#${i + 1}`).toBeGreaterThanOrEqual(7);
    }
    for (const k of [4, 5, 6, 7]) {
      const g = G[k]!;
      const lp = g.loop!;
      // the slower walker (the handler, 0.9 m/s) sets the stop; a dog is faster
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
      expect([0, S5_L1, 8.4]).toContain(y);
      expect(onNav(g.x, g.z, y), `#${i + 1} slot (${g.x}, ${y}, ${g.z})`).toBe(true);
      for (const p of g.route ?? []) expect(onNav(p[0], p[1], y), `#${i + 1} route (${p[0]}, ${p[1]})`).toBe(true);
      expect(distToGuard(g, g.takedownSpot[0], g.takedownSpot[1]), `#${i + 1} takedown spot`).toBeLessThanOrEqual(CHECK_SPOT);
      expect(onNav(g.takedownSpot[0], g.takedownSpot[1], y), `#${i + 1} takedown spot on the nav grid`).toBe(true);
      if (g.route) expect(hyp2(g.route[0]![0] - g.x, g.route[0]![1] - g.z)).toBeLessThan(0.1);
      const r = g.route;
      if (!r) continue;
      for (let k = 0; k < r.length; k++) {
        if (r.length === 2 && k === 1) continue;
        const a = r[k]!;
        const c = r[(k + 1) % r.length]!;
        expect(pathLen([a[0], a[1], y], [c[0], c[1], y]), `#${i + 1} leg ${k}`).not.toBeNull();
      }
    }
    for (const [x, z] of S5.reinforce) expect(onNav(x, z), `reinforce (${x}, ${z})`).toBe(true);
    for (const a of S5.stageActions![0]!.responseRoute!) expect(onNav(a[0], a[1]), `response (${a})`).toBe(true);
  });

  it('switches, the board, alarms, the keypad\'s sides, the key switches and the intel board are within reach of a walkable cell', () => {
    for (const s of lay.switches!.filter((q) => inFoot(q.pos.x, q.pos.z) && q.pos.z >= 18)) expect(nearNav(s.pos.x, s.pos.z, s.pos.y), `switch (${s.pos.x}, ${s.pos.y}, ${s.pos.z})`).toBe(true);
    for (const bd of S5_BOARDS) expect(nearNav(bd.pos.x, bd.pos.z, bd.pos.y), 'board').toBe(true);
    for (const a of lay.alarms!.filter((q) => q.section === 4)) expect(nearNav(a.pos.x, a.pos.z, a.pos.y), `alarm (${a.pos.x}, ${a.pos.z})`).toBe(true);
    const kp = S5.keypads![0]!.at;
    expect(onNav(kp[0] - 0.7, kp[1], S5_L1), 'keypad archive side').toBe(true);
    expect(onNav(kp[0] + 0.7, kp[1], S5_L1), 'keypad landing side').toBe(true);
    const pg = S5.pairGates![0]!;
    for (const k of [pg.a, pg.b]) expect(nearNav(k.at[0], k.at[1], k.y ?? S5_L1), `key switch (${k.at})`).toBe(true);
    const it = S5.intel![0]!;
    expect(it.kind === 'board' && nearNav(it.at[0], it.at[2], 0), 'rota board').toBe(true);
    expect(intelItemId(4, 0)).toBe('c-sintel-4-0');
    for (const h of lay.hideSpots!.filter((q) => inFoot(q.pos.x, q.pos.z))) expect(onNav(h.pos.x, h.pos.z, h.pos.y), `hide (${h.pos.x}, ${h.pos.z})`).toBe(true);
  });

  it('(A64) the dormant rule: only #1, #2, #3 and #15; none posted, paired, a handler or a dog', () => {
    const handlers = new Set(G.map((g) => g.handler).filter((h): h is number => h !== undefined));
    G.forEach((g, i) => {
      if (g.pair !== undefined || handlers.has(i) || g.role === 'posted' || ENEMIES[g.kind].quadruped) expect(g.dormant, `guard #${i + 1}`).not.toBe(true);
    });
    expect(G.map((g, i) => (g.dormant ? i + 1 : 0)).filter((n) => n > 0)).toEqual([1, 2, 3, 15]);
  });
});

describe('S5 cameras, flags, armoured routes, the ammo crate', () => {
  const cams = CAMPUS_SECURITY.devices.filter((c) => c.section === 4);
  it('three cameras: range 8-12, aim, reason, valid security data, within the wire cap, mounts not inside a solid; cam-terrace does not see (-62, 53)', () => {
    expect(cams.map((c) => c.id).sort()).toEqual(['cam-gallery', 'cam-hall', 'cam-terrace']);
    expect(validateSecurity(CAMPUS_SECURITY)).toEqual([]);
    expect(CAMPUS_SECURITY.devices.length).toBeLessThanOrEqual(WIRE_CAMERAS);
    expect(CAMPUS_SECURITY.levels!['s5-l1']).toBe(S5_L1);
    for (const c of cams) {
      expect(c.range!, c.id).toBeGreaterThanOrEqual(8);
      expect(c.range!, c.id).toBeLessThanOrEqual(12);
      expect(c.aim, c.id).toBeDefined();
      expect(c.reason.length, c.id).toBeGreaterThan(8);
      const y = (CAMPUS_SECURITY.levels![c.level] ?? 0) + c.y;
      const inside = solid.some((p) => Math.abs(c.at[0] - p.c[0]) < p.s[0] / 2 && Math.abs(c.at[1] - p.c[2]) < p.s[2] / 2 && y > bottom(p) && y < top(p));
      expect(inside, `${c.id} mount inside a solid`).toBe(false);
    }
    const t = cams.find((c) => c.id === 'cam-terrace')!;
    const bearing = (Math.atan2(-62 - t.at[0], 53 - t.at[1]) * 180) / PI;
    const off = Math.abs(((bearing - t.facing + 540) % 360) - 180);
    expect((off * PI) / 180).toBeGreaterThan(CAMERA.hFov / 2);
    expect(CAMERA_VIEW.fov).toBeGreaterThan(0);
  });

  it('every S5 camera is bulletproof and thermal (E8); every armoured bypass is a route whose legs up to OBJ stay > 1.2 m (plan) from the entry; no pickup in S5; the crate slot is in C4 on the nav', () => {
    expect(cams.length).toBe(3);
    for (const c of cams) expect([c.bulletproof, c.thermal], c.id).toEqual([true, true]);
    for (const a of S5_ARMOURED) {
      const r = S5.routes.find((q) => q.name === a.bypass.route);
      expect(r, a.id).toBeTruthy();
      for (let i = 0; i < r!.obj; i++) {
        const p = r!.pts[i]!;
        const q = r!.pts[i + 1]!;
        const dx = q[0] - p[0];
        const dz = q[1] - p[1];
        const l2 = dx * dx + dz * dz;
        const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((a.at[0] - p[0]) * dx + (a.at[1] - p[1]) * dz) / l2)) : 0;
        expect(hyp2(a.at[0] - (p[0] + dx * t), a.at[1] - (p[1] + dz * t)), `${a.id} leg ${i}`).toBeGreaterThan(1.2);
      }
    }
    expect((lay.pickups ?? []).filter((p) => inFoot(p.pos.x, p.pos.z)).length).toBe(0);
    const [cx0, cz0, cx1, cz1] = CAMPUS_SECTORS[3]!.connector!.box;
    expect(S5_AMMO_CRATE.x > cx0 && S5_AMMO_CRATE.x < cx1 && S5_AMMO_CRATE.z > cz0 && S5_AMMO_CRATE.z < cz1).toBe(true);
    expect(nearNav(S5_AMMO_CRATE.x, S5_AMMO_CRATE.z, 0, 0.8)).toBe(true);
    // the anteroom hall door is built unbreachable (armoured); the front door locked and unbreachable
    const d = (c: readonly [number, number]) => b.anchors.doors.find((q) => hyp2(doorCentre(q)[0] - c[0], doorCentre(q)[1] - c[1]) < 0.2)!;
    expect(d(S5_DOORS.anteHall).breachable).toBe(false);
    expect(d(S5_DOORS.front)).toMatchObject({ locked: true, breachable: false });
  });
});

describe('S5 codes, the rota board, the pair gate', () => {
  it('the rota board is reachable from the start with kp-arch blocked; the key switches are 8.5-10 m apart, in the archive, on the nav grid', () => {
    const it = S5.intel![0]!;
    expect(it.kind).toBe('board');
    if (it.kind === 'board') {
      // the board's reading point in the kitchen is reachable from the start on G
      expect(pathLen([S5.start.x, S5.start.z, 0], [it.at[0] - 0.9, it.at[2], 0])).not.toBeNull();
    }
    const pg = S5.pairGates![0]!;
    const d = hyp2(pg.a.at[0] - pg.b.at[0], pg.a.at[1] - pg.b.at[1]);
    expect(d).toBeGreaterThanOrEqual(8.5);
    expect(d).toBeLessThanOrEqual(10);
    for (const k of [pg.a, pg.b]) {
      expect(k.at[0] > -46 && k.at[0] < -38 && k.at[1] > 32 && k.at[1] < 44).toBe(true);
      expect(k.y).toBe(S5_L1);
    }
    expect(pg.window).toBe(1.0);
    expect(S5.keypads![0]).toEqual({ at: [-38, 41.0], code: 's5-arch' });
  });

  it('no route leg passes within 1.2 m (plan) of the pg-arch door', () => {
    const [px, pz] = S5_DOORS.pgArch;
    for (const r of S5.routes)
      for (let i = 0; i + 1 < r.pts.length; i++) {
        const p = r.pts[i]!;
        const q = r.pts[i + 1]!;
        const dx = q[0] - p[0];
        const dz = q[1] - p[1];
        const l2 = dx * dx + dz * dz;
        const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((px - p[0]) * dx + (pz - p[1]) * dz) / l2)) : 0;
        expect(hyp2(px - (p[0] + dx * t), pz - (p[1] + dz * t)), `${r.name} leg ${i}`).toBeGreaterThanOrEqual(1.2);
      }
  });
});

describe('S5 laser (R5): las-shaft with one panel, seen from the near side', () => {
  const world = new SightWorld(b.boxes, b.cylinders);
  it('one laser with exactly one panel (checkPanels); the layout carries them; the beams span the shaft door (z 35.4..36.6)', () => {
    expect(S5_LASERS.map((l) => l.id)).toEqual(['las-shaft']);
    expect(checkPanels(S5_LASERS, S5_PANELS)).toEqual([]);
    expect(checkPanels(lay.lasers ?? [], lay.laserPanels ?? [])).toEqual([]);
    const l = S5_LASERS[0]!;
    expect(l.section).toBe(4);
    expect(Math.min(l.z1, l.z2)).toBeLessThanOrEqual(35.4 + 1e-9);
    expect(Math.max(l.z1, l.z2)).toBeGreaterThanOrEqual(36.6 - 1e-9);
    const door = b.anchors.doors.find((q) => hyp2(doorCentre(q)[0] - S5_DOORS.anteShaft[0], doorCentre(q)[1] - S5_DOORS.anteShaft[1]) < 0.2)!;
    expect(Math.abs(doorCentre(door)[1] - (l.z1 + l.z2) / 2)).toBeLessThan(0.1);
    expect(S5_PANELS.every((p) => p.section === 4 && !!p.label)).toBe(true);
  });

  it('the panel\'s jam point has a clear eye line from every near point (on the nav grid, within the jammer range)', () => {
    const t = { x: 0, y: 0, z: 0 };
    for (const p of S5_PANELS) {
      panelTarget(p, t);
      const pts = S5_PANEL_NEAR[p.id]!;
      for (const [x, y, z] of pts) {
        expect(onNav(x, z, y), `${p.id} near point (${x}, ${z})`).toBe(true);
        expect(hyp3(t.x - x, t.y - (y + 1.6), t.z - z)).toBeLessThan(JAMMER.range);
        expect(world.clear(x, y + 1.6, z, t.x, t.y, t.z), `${p.id} seen from (${x}, ${y}, ${z})`).toBe(true);
      }
    }
  });
});

describe('S5 routes', () => {
  it('start at the start, OBJ within 1.8 of the token, end inside the extract zone; unique; every point on the nav; every walked leg has a path', () => {
    const O = S5.objective;
    for (const r of S5.routes) {
      const first = r.pts[0]!;
      const at = r.pts[r.obj]!;
      const last = r.pts[r.pts.length - 1]!;
      expect(hyp2(first[0] - S5.start.x, first[1] - S5.start.z), r.name).toBeLessThan(0.5);
      expect(hyp3(at[0] - O.x, (at[2] ?? 0) - O.y, at[1] - O.z), r.name).toBeLessThan(1.8);
      expect(inZone(S5.extract!, last[0], last[2] ?? 0, last[1]), r.name).toBe(true);
      r.pts.forEach((p, i) => expect(onNav(p[0], p[1], p[2] ?? 0), `${r.name} point ${i} (${p})`).toBe(true));
      for (let i = 0; i + 1 < r.pts.length; i++) {
        if ((r.climbs ?? []).includes(i)) continue;
        const a = r.pts[i]!;
        const c = r.pts[i + 1]!;
        const len = pathLen([a[0], a[1], a[2] ?? 0], [c[0], c[1], c[2] ?? 0]);
        expect(len, `${r.name} leg ${i}: ${a} -> ${c}`).not.toBeNull();
      }
    }
    expect(S5.routes.length).toBe(3);
    expect(new Set(S5_ROUTES.map((r) => JSON.stringify(r.pts))).size).toBe(3);
  });

  it('every route point is >= 0.6 m (plan) from a collide box below head height, a rail and a flight side; floors change only by the core\'s near landing or the hall stair', () => {
    const low = solid.filter((p) => bottom(p) < 1.6 && !p.overhead && p.c[1] > -1);
    for (const r of S5.routes)
      r.pts.forEach((p, i) => {
        const y = p[2] ?? 0;
        for (const q of low) {
          // only boxes standing on this floor
          if (bottom(q) < y - 0.3 || bottom(q) > y + 1.5 || top(q) < y + 0.3) continue;
          const dx = Math.max(0, Math.abs(p[0] - q.c[0]) - q.s[0] / 2);
          const dz = Math.max(0, Math.abs(p[1] - q.c[2]) - q.s[2] / 2);
          expect(hyp2(dx, dz), `${r.name} point ${i} (${p}) near a box at ${q.c} size ${q.s}`).toBeGreaterThanOrEqual(0.6 - 1e-9);
        }
      });
    const core = S5_CORE;
    const landing = [(core.x0 + core.x1) / 2, core.z0 + 0.7];
    for (const r of S5.routes)
      for (let i = 0; i + 1 < r.pts.length; i++) {
        const a = r.pts[i]!;
        const c = r.pts[i + 1]!;
        if (Math.abs((a[2] ?? 0) - (c[2] ?? 0)) < 1 || (r.climbs ?? []).includes(i)) continue;
        const stacked = hyp2(a[0] - c[0], a[1] - c[1]) < 1e-6 && hyp2(a[0] - landing[0]!, a[1] - landing[1]!) < 0.3;
        expect(stacked, `${r.name} leg ${i} changes floor off the core's landing`).toBe(true);
      }
  });

  it('the service stair is the S2 shape: four flights (two storeys), rise 2.1, slope <= 0.61, doors at G / L1 / roof, bulkhead top 11.0', () => {
    const fl = coreFlights(S5_CORE);
    expect(fl.length).toBe(4);
    for (const f of fl) {
      expect(f.rise).toBeCloseTo(2.1);
      expect(f.rise / f.len).toBeLessThanOrEqual(0.61);
      expect((f.rise / f.len) * 0.5).toBeLessThan(0.45);
      expect(f.len).toBeCloseTo(3.6);
    }
    expect(Math.abs(fl[0]!.yaw - fl[1]!.yaw)).toBeCloseTo(PI);
    const floors = b.anchors.doors.filter((d) => hyp2(doorCentre(d)[0] - S5_DOORS.core[0], doorCentre(d)[1] - S5_DOORS.core[1]) < 0.2).map((d) => d.hinge.y).sort((p, q) => p - q);
    expect(floors).toEqual([0, 4.2, 8.4]);
    expect(S5_BULKHEAD_TOP).toBe(11);
    expect(solid.some((p) => Math.abs(top(p) - 11) < 1e-6 && Math.abs(p.c[0] - -35) < 1e-6)).toBe(true);
    // the hall stair: z 21.6 at 0 to z 29.0 at 4.2
    expect(S5_HALL_STAIR.cz - S5_HALL_STAIR.len / 2).toBeCloseTo(21.6);
    expect(S5_HALL_STAIR.cz + S5_HALL_STAIR.len / 2).toBeCloseTo(29.0);
    expect(pathLen([-45, 20.8, 0], [-45, 29.8, S5_L1])).not.toBeNull();
    expect(pathLen([-35, 38.8, 0], [-35, 38.8, 8.4])).not.toBeNull();
  });

  it('the routes\' legs also have paths on the runtime nav grid (the e2e grid), the stairs included', () => {
    const rn = runtimeNav(b, lay.playerSpawns[0]!.pos, campusOps.navLayers ?? 3, lay.navSeeds ?? []);
    const fails: string[] = [];
    for (const r of S5.routes)
      for (let i = 0; i + 1 < r.pts.length; i++) {
        if ((r.climbs ?? []).includes(i)) continue;
        const a = r.pts[i]!;
        const c = r.pts[i + 1]!;
        if (!rn.findPath([a[0], a[1]], [c[0], c[1]], 200000, a[2] ?? 0, c[2] ?? 0)) fails.push(`${r.name} leg ${i} ${JSON.stringify([a, c])}`);
      }
    // the hall stair, 0.8 m beyond the foot to 0.8 m beyond the head
    if (!rn.findPath([-45, 20.8], [-45, 29.8], 200000, 0, S5_L1)) fails.push('hall stair');
    expect(fails).toEqual([]);
  }, 120_000);
});

describe('K4 (M12): the two keyholders are an unavoidable posted pair at the token room', () => {
  const posts = [G[8]!, G[9]!];
  const inCone = (p: SectorGuard, x: number, z: number): boolean => {
    const fx = Math.sin(p.yaw);
    const fz = Math.cos(p.yaw);
    const dx = x - p.x;
    const dz = z - p.z;
    const d = hyp2(dx, dz);
    if (d < 1e-6) return true;
    const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d)));
    return (d <= PERCEPTION.focusRange && ang <= PERCEPTION.focusHalf) || (d <= PERCEPTION.periphRange && ang <= PERCEPTION.periphHalf);
  };
  const angOff = (p: SectorGuard, x: number, z: number): number => {
    const fx = Math.sin(p.yaw);
    const fz = Math.cos(p.yaw);
    const dx = x - p.x;
    const dz = z - p.z;
    return (Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / hyp2(dx, dz)))) * 180) / PI;
  };

  it('with both cones (ground storey) and a shut leaf in the pg-arch door as nav blockers no path joins the start to the token; without the cones one does', () => {
    const from: [number, number] = [S5.start.x, S5.start.z];
    const to: [number, number] = [-43, 42.2];
    expect(nav.findPath(from, to, 1e7, 0, 0)).not.toBeNull();
    const pg = S5_DOORS.pgArch;
    const leaf = addDoorClosure(nav, { cx: pg[0], cz: pg[1], yaw: 0, width: 1.2, y: S5_L1 });
    nav.setClosed(leaf, true);
    const blocked: number[] = [];
    try {
      expect(nav.findPath(from, to, 1e7, 0, 0)).not.toBeNull();
      for (let i = 0; i < nav.walk.length; i++) {
        if (!nav.walk[i] || Math.abs(nav.height[i]!) > 0.6) continue;
        const [x, z] = nav.center(i % nav.cols);
        if (posts.some((p) => inCone(p, x, z))) {
          blocked.push(i);
          nav.walk[i] = 0;
        }
      }
      expect(blocked.length).toBeGreaterThan(50);
      expect(nav.findPath(from, to, 1e7, 0, 0)).toBeNull();
    } finally {
      for (const i of blocked) nav.walk[i] = 1;
      nav.setClosed(leaf, false);
    }
    expect(nav.findPath(from, to, 1e7, 0, 0)).not.toBeNull();
  });

  it('the hall door and the side door cells are inside a cone; the window and the shaft door are > 100 deg off both facings (behind them: CR6 / CR7)', () => {
    const cell = (x: number, z: number): [number, number] => nav.center(nav.cellOf(x, z, 0));
    for (const door of [S5_DOORS.anteHall, S5_DOORS.anteSide]) {
      const [x, z] = cell(door[0], door[1]);
      expect(posts.some((p) => inCone(p, x, z)), `door ${door}`).toBe(true);
    }
    for (const at of [[-46, 35.5], [S5_DOORS.anteShaft[0], S5_DOORS.anteShaft[1]]] as const)
      for (const p of posts) expect(angOff(p, at[0], at[1]), `${at} vs #${G.indexOf(p) + 1}`).toBeGreaterThan(100);
    expect(posts.every((p) => Math.abs(p.yaw - PI) < 1e-9)).toBe(true);
  });
});

describe('CR7: the two-person rope into the well (A85)', () => {
  it('ropeRoom(4.2, 0) is ok; the rope edge is the hoist door\'s sill; the well\'s cells reach nothing else; the well to #9 line is clear through the window and shorter than a roll landing\'s noise', () => {
    expect(ropeRoom(S5_ROPE_EDGE.y, S5_ROPE_EDGE.floor)).toBe('ok');
    expect(onNav(-48, 36, 0)).toBe(true);
    // (polish 6, L11) the open window's sill is 0.5, over the nav step (0.45): the guards' grid no longer steps through the
    // sash (it was closed on the grid here), and the player vaults it (step 0.42)
    for (const to of [[-48, 33], [-44.5, 36], [-48, 40], [-43, 33], [-43, 40]] as const) expect(nav.findPath([-48, 36], [to[0], to[1]], 200000, 0, 0), `well -> ${to}`).toBeNull();
    expect(onNav(-44.5, 36, 0)).toBe(true);
    const world = new SightWorld(b.boxes, b.cylinders);
    const nine = G[8]!;
    expect(world.clear(-48, 0.3, 36, nine.x, 1.6, nine.z)).toBe(true);
    expect(hyp3(nine.x + 48, 1.6 - 0.3, nine.z - 36)).toBeLessThan(LANDING_NOISE_RADIUS.roll);
    const hoist = b.anchors.doors.find((d) => hyp2(doorCentre(d)[0] - S5_DOORS.hoist[0], doorCentre(d)[1] - S5_DOORS.hoist[1]) < 0.2)!;
    expect(hoist.hinge.y).toBe(S5_L1);
    expect(b.anchors.windows.some((w) => hyp2(w.c.x + 46, w.c.z - 35.5) < 0.1 && w.open && !w.breakable && w.sillHeight > 0.45)).toBe(true);
  });
});

describe('no leg-up lip in S5 and the sealed section', () => {
  it('no ledge anchor in the footprint has a drop of 2.6-4.6 m; the low roof, garden walls, boathouse, van, chimneys are noLedge', () => {
    const led = generateLedges(solid.filter((p) => p.visible !== false)).ledges.filter((l) => inFoot((l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2));
    expect(led.filter((l) => l.drop >= 2.6 && l.drop <= 4.6).map((l) => [l.a, l.b, l.drop])).toEqual([]);
    for (const p of solid) {
      const h = p.s[1];
      if (h < 1.9 || h > 4.2 || !inFoot(p.c[0], p.c[2]) || bottom(p) > 0.01) continue;
      expect(p.noLedge, `${JSON.stringify(p.c)} ${JSON.stringify(p.s)}`).toBe(true);
    }
    for (const p of solid.filter((q) => inFoot(q.c[0], q.c[2]) && top(q) > 1.2 && bottom(q) > 4 && q.s[1] >= 1.1)) expect(p.noLedge, `${JSON.stringify(p.c)}`).toBe(true);
  });

  it('a flood from the start (doors open, ladders as links) never leaves x -70..-26, z 18..70 plus the C4 box; every roof edge over outside ground is >= 1.9 high', () => {
    // the front door is locked and unbreachable: shut on the grid
    const front = addDoorClosure(nav, { cx: S5_DOORS.front[0], cz: S5_DOORS.front[1], yaw: PI / 2, width: 1.2, y: 0 });
    nav.setClosed(front, true);
    const dist = nav.flowField([[S5.start.x, S5.start.z]], undefined, [0]);
    const [c0, cz0, c1, cz1] = CAMPUS_SECTORS[3]!.connector!.box;
    let cells = 0;
    let out = '';
    for (let i = 0; i < dist.length; i++) {
      if (!Number.isFinite(dist[i]!)) continue;
      cells++;
      const [x, z] = nav.center(i % nav.cols);
      const inC4 = x >= c0 - 0.5 && x <= c1 + 0.5 && z >= cz0 - 0.5 && z <= cz1 + 0.5;
      if (!inFoot(x, z) && !inC4 && !out && x < -16) out = `(${x}, ${z}, ${nav.height[i]})`;
    }
    nav.setClosed(front, false);
    expect(cells).toBeGreaterThan(5000);
    expect(out).toBe('');
    // the main roof's south edge and the wing's east and south edges
    const near = (x0: number, x1: number, z0: number, z1: number, y: number): BoxPiece | undefined => solid.find((p) => p.c[0] - p.s[0] / 2 <= x0 + 1e-6 && p.c[0] + p.s[0] / 2 >= x1 - 1e-6 && p.c[2] - p.s[2] / 2 <= z0 + 1e-6 && p.c[2] + p.s[2] / 2 >= z1 - 1e-6 && Math.abs(bottom(p) - y) < 1e-6 && p.s[1] >= 1.9 - 1e-6);
    expect(near(-56, -32, 18.05, 18.15, 8.4)).toBeTruthy();
    expect(near(-26.15, -26.05, 18, 44, 4.2)).toBeTruthy();
    expect(near(-32, -26, 18.05, 18.15, 4.2)).toBeTruthy();
  });
});

describe('S5 lighting (brief "Lighting")', () => {
  const lights = b.lights.lights;
  const group = (g: number) => lights.filter((l) => l.group === g);
  it('group counts, a switch or the board for every lit group but 87, the board timed (window 20), every lamp shootable and electric', () => {
    const counts: Record<number, number> = { 80: 1, 81: 6, 82: 2, 83: 2, 84: 10, 85: 2, 86: 2, 87: 1, 88: 4, 89: 2 };
    for (const [g, n] of Object.entries(counts)) expect(group(Number(g)).length, `group ${g}`).toBe(n);
    const sw = lay.switches!;
    for (const g of Object.values(S5_GROUPS)) {
      if (g === S5_GROUPS.roof) continue;
      expect(sw.some((q) => q.group === g) || S5_BOARDS.some((q) => q.groups.includes(g)), `switch or board for ${g}`).toBe(true);
    }
    expect(S5_BOARDS.length).toBe(1);
    expect(S5_BOARDS[0]!.groups).toEqual([S5_GROUPS.garden]);
    expect(S5_BOARDS[0]!.window).toBe(20);
    for (const l of lights.filter((q) => q.intensity > 0 && inFoot(q.x, q.z))) expect(l.destructible && l.electric, `lamp ${l.id}`).toBe(true);
    expect(group(S5_GROUPS.chand)[0]).toMatchObject({ x: -44, y: 6.5, z: 23.5 });
  });

  it('dark by reason: no lamp in the archive, drawing room, passage, well, back corridor, service lobby or plant room; ambient 0.14, the core 0.30', () => {
    const lit = lights.filter((l) => l.on && l.intensity > 0);
    const over = (box: readonly number[], y0: number, y1: number) => lit.filter((l) => l.x >= box[0]! && l.x <= box[2]! && l.z >= box[1]! && l.z <= box[3]! && l.y >= y0 && l.y <= y1);
    expect(over([-46, 32, -38, 44], 4.2, 8.4).length, 'archive').toBe(0);
    expect(over([-56, 30, -50, 44], 0, 4.1).length, 'drawing room').toBe(0);
    expect(over([-50, 32, -46, 34], 0, 4.1).length, 'passage').toBe(0);
    expect(over([-50, 34, -46, 38], 0, 8.4).length, 'well').toBe(0);
    expect(over([-38, 18, -32, 38], 0, 4.1).length, 'back corridor').toBe(0);
    expect(over([-32, 26, -26, 32], 0, 4.1).length, 'lobby').toBe(0);
    expect(over([-32, 18, -26, 26], 0, 4.1).length, 'plant room').toBe(0);
    expect(b.lights.zoneAt(-44, 1, 25)).toBe(0.14);
    expect(b.lights.zoneAt(-35, 1, 40)).toBe(0.3);
    expect(b.lights.zoneAt(-35, 9, 40)).toBe(0.3);
  });

  it('the rooms (HUD tags) do not overlap (storeys apart) and none carries a squad', () => {
    for (let i = 0; i < S5_ROOMS.length; i++)
      for (let j = i + 1; j < S5_ROOMS.length; j++) {
        const a = S5_ROOMS[i]!;
        const c = S5_ROOMS[j]!;
        const ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX);
        const oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
        const oy = Math.min(a.maxY ?? Infinity, c.maxY ?? Infinity) - Math.max(a.minY ?? -Infinity, c.minY ?? -Infinity);
        expect(ox > 0.01 && oz > 0.01 && oy > 0.01, `${a.id} overlaps ${c.id}`).toBe(false);
      }
    expect(S5_ROOMS.every((r) => (r.squad ?? []).length === 0)).toBe(true);
  });
});

describe('door separation (doors are found by plan position, 1.2 m)', () => {
  it('every keypad, pair gate, lockdown and connector door centre is >= 1.2 m (plan) from every other door anchor centre on any floor', () => {
    const special: { what: string; at: readonly [number, number] }[] = [
      { what: 'keypad', at: S5.keypads![0]!.at },
      { what: 'pair gate', at: S5.pairGates![0]!.door },
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
  });
});

describe('M8: isolation in time at each takedown spot', () => {
  const world = new SightWorld(b.boxes, b.cylinders);
  const timed: CheckGuard[] = G.map((g) => {
    const speed = ENEMIES[g.kind].walkSpeed * (g.loop ? 1 : CHECK_PATROL_PACE);
    return { x: g.x, z: g.z, y: g.y, route: g.route as readonly (readonly [number, number])[] | undefined, wait: g.wait, waits: g.waits, speed, loop: g.loop };
  });
  it('records each guard\'s longest isolated run; every guard outside the recorded overlap pairs holds 3 s', () => {
    const rows = G.map((g, i) => ({ n: i + 1, run: longestIsolation(world, timed, i, 15, g.takedownSpot), ok: isolatedInTime(world, timed, i, g.takedownSpot) }));
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(rows.map((r) => `#${r.n} ${r.run}s ${r.ok ? 'ok' : 'NOT isolated'}`).join('\n'));
    // recorded exceptions (brief): the pairs #5-#6, #7-#8, #9-#10, #16-#17 only; the other 16 guards hold 3 s (fix round: the
    // control room's rack bays, the gallery screens, #11's vestibule stop, #20's walk to the jetty; `slice5-build.md` L17)
    const must = rows.filter((r) => ![5, 6, 7, 8, 9, 10, 16, 17].includes(r.n));
    expect(must).toHaveLength(16);
    expect(must.filter((r) => !r.ok).map((r) => `#${r.n} (${r.run}s)`)).toEqual([]);
    expect(CHECK_ISOLATION).toBe(3);
  });
});

describe('A99: the screen count (no player point sees more than CAMPUS_SCREEN_CAP guards, every guard counted)', () => {
  /** Shut leaves on every door no guard route passes (open: the control room door, the side door, the kitchen and plant doors). */
  const open = [S5_DOORS.hallWest, S5_DOORS.anteSide, S5_DOORS.lobbyNorth, S5_DOORS.lobbySouth];
  const routePasses = (cx: number, cz: number, y: number): boolean =>
    G.some((g) => {
      if (Math.abs(floorOf(g) - y) > 1) return false;
      const pts = [[g.x, g.z], ...(g.route ?? []), ...(g.route ? [g.route[0]!] : [])];
      for (let i = 0; i + 1 < pts.length; i++) {
        const p = pts[i]!;
        const q = pts[i + 1]!;
        const dx = q[0]! - p[0]!;
        const dz = q[1]! - p[1]!;
        const l2 = dx * dx + dz * dz;
        const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((cx - p[0]!) * dx + (cz - p[1]!) * dz) / l2)) : 0;
        if (hyp2(cx - (p[0]! + dx * t), cz - (p[1]! + dz * t)) < 0.8) return true;
      }
      return false;
    });
  const leaves: BoxPiece[] = [];
  for (const d of b.anchors.doors) {
    const [cx, cz] = doorCentre(d);
    if (!inFoot(cx, cz) || open.some((o) => hyp2(o[0] - cx, o[1] - cz) < 0.3 && Math.abs(d.hinge.y) < 0.1) || routePasses(cx, cz, d.hinge.y)) continue;
    const alongX = Math.abs(Math.sin(d.yaw)) > 0.5;
    leaves.push({ c: [cx, d.hinge.y + d.height / 2, cz], s: alongX ? [d.width, d.height, 0.1] : [0.1, d.height, d.width], yaw: 0, pitch: 0, color: '#000', collide: true });
  }
  const near = (p: BoxPiece): boolean => p.c[0] + p.s[0] > FOOT.x0 - 2 && p.c[0] - p.s[0] < FOOT.x1 + 8 && p.c[2] + p.s[2] > FOOT.z0 - 2 && p.c[2] - p.s[2] < FOOT.z1 + 2;
  const world = new SightWorld([...bG.boxes.filter(near), ...leaves], bG.cylinders);
  const HALF = ((CAMERA_VIEW.fov / 2) * PI) / 180;
  const YAWS = Array.from({ length: 32 }, (_, k) => (k * PI) / 16);
  it('at every walkable nav cell (0.5 m) on every S5 level, 32 facings: at most CAMPUS_SCREEN_CAP guards (dogs and dormant guards count) in the 86 deg view with a clear line within 40 m', () => {
    const awake = G.map((g, i) => ({ g, i }));
    const pts = awake.map(({ g }) => guardPoints({ x: g.x, z: g.z, y: g.y, route: g.route as readonly (readonly [number, number])[] | undefined }).map(([px, py, pz]) => [px, py + 1.2, pz] as const));
    let worst = { n: -1, at: '', who: [] as number[] };
    let samples = 0;
    let l1 = 0;
    let roof = 0;
    let over = 0;
    const hist = new Map<number, number>();
    for (let col = 0; col < nav.cols; col++) {
      const [x, z] = nav.center(col);
      if (!inFoot(x, z) || z > 66) continue;
      for (let l = 0; l < nav.layers; l++) {
        const i = l * nav.cols + col;
        if (!nav.walk[i]) continue;
        const h = nav.height[i]!;
        if (h > 12) continue;
        samples++;
        if (Math.abs(h - 4.2) < 0.05) l1++;
        if (Math.abs(h - 8.4) < 0.05) roof++;
        const eye = h + 1.6;
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
        hist.set(best, (hist.get(best) ?? 0) + 1);
        if (best > CAMPUS_SCREEN_CAP) over++;
      }
    }
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(`A99 worst ${worst.n} at ${worst.at}: #${worst.who.join(', #')} (${samples} points, ${l1} on L1, ${roof} on the roof, ${over} over ${CAMPUS_SCREEN_CAP}) histogram ${JSON.stringify([...hist.entries()].sort((p, q) => p[0] - q[0]))}`);
    expect(samples).toBeGreaterThan(8000);
    expect(l1).toBeGreaterThan(300);
    expect(roof).toBeGreaterThan(300);
    expect(worst.n, `worst ${worst.at}: #${worst.who.join(', #')}`).toBeLessThanOrEqual(CAMPUS_SCREEN_CAP);
  }, 600_000);
});
