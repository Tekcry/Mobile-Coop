/**
 * Saltmarsh Park (`campusOps`) slice 4: section 4, the data hall (`docs/sector-redesign/briefs/SLICE4.md`). Data and geometry
 * only (the pure `LevelBuilder`): the 20 guards incl. the first dog, the three cameras and the security desk, the dock board
 * and the keypads, the cage's pair gate, las-tray and its panel, the routes on an analytic nav grid (the NOC flight as the one
 * ramp), CR4 (the cable basket) against a solo player, the light circuits, the M8 isolation check, the K3 choke, the dormant
 * rule and the A99 screen count (lifts A64).
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { buildCampus, campusOps } from '../src/world/maps/campusOps';
import { CAMPUS_COOP_LIPS } from '../src/world/maps/campusLips';
import { S3_DOORS } from '../src/world/maps/campusS3';
import { S4_BASKET, S4_BOX, S4_DECK, S4_DOORS, S4_FLIGHT, S4_GROUPS, S4_NOC, S4_PANEL_NEAR, S4_PANELS, S4_LASERS, S4_ROOMS, S4_COOP_LIPS, S4_PODS, S4_BOARDS } from '../src/world/maps/campusS4';
import { S4_AMMO_CRATE, S4_ARMOURED } from '../src/world/maps/campusS4Data';
import { CAMPUS_SCREEN_CAP, CAMPUS_SECTORS, CAMPUS_SECURITY } from '../src/world/maps/campusSectors';
import { SECTOR, checkSectorGuards, checkSectors, exitZone, inZone, type SectorGuard } from '../src/game/sectors';
import { checkStageActions, doorFinder, addDoorClosure } from '../src/game/sectorStage';
import { DESK_POST_RADIUS } from '../src/game/sectorDesks';
import { WIRE_CAMERAS, liveCameraPeak, validateSecurity } from '../src/security/data';
import { ENEMIES } from '../src/ai/enemyDefs';
import { PATROL } from '../src/ai/patrol';
import { PERCEPTION } from '../src/ai/perception';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { HANG, LEDGE, generateLedges } from '../src/world/anchors';
import { LIGHT, contribution } from '../src/world/lights';
import { hyp2, hyp3 } from '../src/core/mathx';
import { JAMMER } from '../src/game/jammer';
import { CAMERA } from '../src/config/security';
import { CAMERA as PLAYER_CAMERA } from '../src/config/camera';
import { checkPanels, panelTarget } from '../src/game/laserPanels';
import { soloJumpThreats, soloTopLandingThreats, MANTLE } from './helpers/soloJumpReach';
import { SightWorld, guardPoints, isolatedInTime, longestIsolation, CHECK_ISOLATION, CHECK_PATROL_PACE, CHECK_SPOT, distToGuard, type CheckGuard } from '../src/game/sectorCheck';

const PI = Math.PI;
const b = new LevelBuilder();
const lay = campusOps.build(b, 0);
/** The undressed greybox: the screen count (A99) reads its sight lines here, as invisible dressing (chairs, shelves) must not block them. */
const bG = new LevelBuilder();
buildCampus(bG, { dress: false });
const S4 = CAMPUS_SECTORS[3]!;
/** The base list (the coop4 minPlayers tags are appended and checked in sectorGuardTags.test.ts); ALL = base + tags. */
const G = S4.guards.filter((g) => g.minPlayers === undefined);
const ALL = S4.guards;
const FOOT = { x0: -10, x1: 40, z0: 16, z1: 48 };
const inFoot = (x: number, z: number): boolean => x >= FOOT.x0 && x <= FOOT.x1 && z >= FOOT.z0 && z <= FOOT.z1;
const floorOf = (g: { y?: number }): number => g.y ?? 0;

/** The collision pieces as axis-aligned boxes (every S4 piece is yaw 0; S1's quarter-turn walls are swapped to plain). */
const solid: BoxPiece[] = [];
for (const p of b.boxes) {
  if (!p.collide || Math.abs(p.pitch) > 1e-3) continue;
  const q = Math.abs(Math.sin(p.yaw));
  if (q < 1e-3) solid.push(p);
  else if (Math.abs(q - 1) < 1e-3) solid.push({ ...p, s: [p.s[2], p.s[1], p.s[0]], yaw: 0 });
}
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;

/** The NOC flight's ramp height at (x, z) (NaN off it). yaw PI / 2 rises toward +x. */
function flightH(x: number, z: number): number {
  const f = S4_FLIGHT;
  if (Math.abs(z - f.cz) > f.w / 2 || Math.abs(x - f.cx) > f.len / 2) return Number.NaN;
  return f.y0 + (f.rise * (x - (f.cx - f.len / 2))) / f.len;
}

/** An analytic layered nav grid over a rectangle: the pieces as `navBuild` does (blockers, fences, cylinders), the NOC flight as the one ramp, the ladders as links. */
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
    const h = flightH(x, z);
    if (h === h) out.push({ h, bottom: h - 0.35 });
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

describe('S4 shape and registration', () => {
  it('the map keeps five chained sections; S4 is a download with 20 guards incl. one dog, start = C3\'s checkpoint, C4 as the stub; the live cap holds', () => {
    expect(CAMPUS_SECTORS.length).toBe(5);
    expect(S4.id).toBe('s4');
    expect(S4.objective).toMatchObject({ kind: 'download', x: 18, y: 0, z: 38.3 });
    expect(G.length).toBe(20);
    expect(S4.dogs).toBe(1);
    expect(S4.perStage).toBe(2);
    expect(S4.start).toEqual(CAMPUS_SECTORS[2]!.connector!.checkpoint);
    expect(CAMPUS_SECTORS[4]!.start).toEqual(S4.connector!.checkpoint);
    expect(S4.connector).toMatchObject({ box: [-26, 26, -10, 32], nearAt: [-10, 29], farAt: [-26, 29], checkpoint: { x: -18, y: 0, z: 29, yaw: -PI / 2 } });
    expect(S4.reinforce).toEqual([[28, 20.5], [-7, 40]]);
    expect(ALL.length + SECTOR.alarmMax * S4.perStage).toBeLessThanOrEqual(SECTOR.maxAlive);
    expect(checkSectors(CAMPUS_SECTORS, undefined, lay.security)).toEqual([]);
    const s3 = CAMPUS_SECTORS[2]!;
    expect(checkStageActions([s3, S4], { nav, doorAt: doorFinder(b.anchors.doors) })).toEqual([]);
  });

  it('the spawn layout carries the S4 rooms, switches (8), board, hide spots, nav seeds, laser and panel; the S1 test\'s door anchors stay', () => {
    expect(lay.switches!.filter((s) => s.group >= 70 && s.group <= 79).length).toBe(8);
    expect(lay.boards!.filter((q) => q.groups.includes(75)).length).toBe(1);
    expect(lay.lasers!.some((l) => l.id === 'las-tray')).toBe(true);
    expect(lay.laserPanels!.some((p) => p.id === 'panel-tray')).toBe(true);
    expect(lay.rooms!.filter((r) => r.id.startsWith('s4-')).length).toBe(S4_ROOMS.length);
    expect(lay.alarms!.filter((a) => a.section === 3).length).toBe(3);
    const door = (x: number, z: number) => b.anchors.doors.find((d) => hyp2(d.hinge.x + Math.sin(d.yaw) * d.width / 2 - x, d.hinge.z + Math.cos(d.yaw) * d.width / 2 - z) < 0.01);
    expect(door(24, 16)).toBeTruthy();
    expect(door(-10, 29)).toBeTruthy();
    expect(door(37.5, 16)).toMatchObject({ locked: true, breachable: false });
    expect(door(10.5, 22)).toMatchObject({ breachable: false });
    expect(door(9, 20.5)).toMatchObject({ breachable: false });
  });
});

describe('S4 guards (brief table)', () => {
  it('twenty guards: kinds as listed, one dog with handler 0, checkSectorGuards passes', () => {
    expect(G.map((g) => g.kind)).toEqual(['grunt', 'dog', 'officer', 'officer', 'officer', 'officer', 'grunt', 'grunt', 'officer', 'grunt', 'grunt', 'grunt', 'grunt', 'officer', 'officer', 'officer', 'grunt', 'grunt', 'grunt', 'officer']);
    expect(checkSectorGuards(S4)).toEqual([]);
    expect(G.filter((g) => ENEMIES[g.kind].quadruped).length).toBe(1);
    expect(G[1]!.handler).toBe(0);
    expect(ENEMIES[G[0]!.kind].weapon).toBeTruthy();
  });

  it('every guard has a role, a zone, a reason and a squad; pairs #5-#6 and #14-#15; #19 is posted with its post data', () => {
    for (const [i, g] of G.entries()) {
      expect(g.role, `#${i + 1} role`).toBeTruthy();
      expect(g.zone, `#${i + 1} zone`).toBeTruthy();
      expect(g.reason && g.reason.length > 8, `#${i + 1} reason`).toBe(true);
      expect(g.squad, `#${i + 1} squad`).not.toBeUndefined();
    }
    expect(G[4]!.pair).toBeUndefined(); // a standing pair, not a guard-ai S10 talking pair (needs timed loops)
    expect(G[5]!.pair).toBeUndefined(); // a standing pair, not a guard-ai S10 talking pair (needs timed loops)
    expect(G[13]!.pair).toBeUndefined(); // a standing pair, not a guard-ai S10 talking pair (needs timed loops)
    expect(G[14]!.pair).toBeUndefined(); // a standing pair, not a guard-ai S10 talking pair (needs timed loops)
    expect(G[18]!.role).toBe('posted');
    expect(G[18]!.zone).toBe('c4');
    expect(G[18]!.post).toEqual({ leash: 5, guards: 'c4-gate' });
    expect(G.map((g) => g.squad)).toEqual([0, 0, 0, 1, 2, 2, 3, 3, 3, 3, 3, 4, 5, 2, 2, 4, 1, 1, 4, 3]);
  });

  it('each patrol cycle is 25-45 s with stops of 3-6 s; the posts are #3, #4, #5, #6, #9, #14, #15, #19', () => {
    const posts: number[] = [];
    for (const [i, g] of G.entries()) {
      const c = cycle(g);
      if (c === null) {
        posts.push(i + 1);
        continue;
      }
      expect(c, `#${i + 1} cycle ${c}`).toBeGreaterThanOrEqual(25);
      expect(c, `#${i + 1} cycle ${c}`).toBeLessThanOrEqual(45);
      if (!g.loop) {
        const ws = g.waits ?? [];
        expect(Math.max(...ws), `#${i + 1} longest stop`).toBeGreaterThanOrEqual(3);
        expect(Math.max(...ws), `#${i + 1} longest stop`).toBeLessThanOrEqual(6);
      }
    }
    expect(posts).toEqual([3, 4, 5, 6, 9, 14, 15, 19]);
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

  it('every slot is >= 7 m from the start and on the nav grid (its floor); every route point, takedown spot and reinforce point too', () => {
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
  });

  it('every switch, board, alarm, keypad side, pair key switch, the intel board and the desk console is within 1.1 m of a nav cell on its floor', () => {
    for (const s of lay.switches!.filter((q) => q.group >= 70 && q.group <= 79)) expect(nearNav(s.pos.x, s.pos.z, s.pos.y), `switch ${s.group}`).toBe(true);
    for (const bd of lay.boards!.filter((q) => q.groups.includes(75))) expect(nearNav(bd.pos.x, bd.pos.z, bd.pos.y), 'board').toBe(true);
    for (const a of lay.alarms!.filter((q) => q.section === 3)) expect(nearNav(a.pos.x, a.pos.z, a.pos.y), 'alarm').toBe(true);
    for (const k of S4.keypads!) for (const s of [-0.8, 0.8]) expect(nearNav(k.at[0] + s, k.at[1], 0), `keypad ${k.at} side ${s}`).toBe(true);
    for (const g of S4.pairGates!) for (const s of [g.a, g.b]) expect(nearNav(s.at[0], s.at[1], s.y ?? 0), `key switch ${s.at}`).toBe(true);
    for (const n of S4.intel!) if (n.kind === 'board') expect(nearNav(n.at[0], n.at[2], 0), 'intel board').toBe(true);
    for (const d of lay.security!.desks!) expect(nearNav(d.at[0], d.at[1], d.y ?? 0), 'desk').toBe(true);
  });
});

describe('S4 cameras, desk, codes, gates', () => {
  const cams = CAMPUS_SECURITY.devices.filter((c) => c.section === 3);
  it('three cameras: range 8-12, an aim, a reason, valid security data, section 3, in the footprint; the live peak and the wire hold', () => {
    expect(cams.map((c) => c.id).sort()).toEqual(['cam-cage', 'cam-dock4', 'cam-mantrap']);
    expect(validateSecurity(CAMPUS_SECURITY)).toEqual([]);
    for (const c of cams) {
      expect(c.range!, c.id).toBeGreaterThanOrEqual(8);
      expect(c.range!, c.id).toBeLessThanOrEqual(12);
      expect(c.aim, c.id).toBeDefined();
      expect(c.reason.length, c.id).toBeGreaterThan(8);
      expect(inFoot(c.at[0], c.at[1]), c.id).toBe(true);
      expect(c.level).toBe('ground');
    }
    expect(liveCameraPeak(CAMPUS_SECURITY.devices)).toBeLessThanOrEqual(12);
    expect(CAMPUS_SECURITY.devices.length).toBeLessThanOrEqual(WIRE_CAMERAS);
  });

  it('the C3 door (24, 16.3) is outside cam-dock4\'s 70 deg view (more than half the field + 5 deg off its facing)', () => {
    const c = cams.find((q) => q.id === 'cam-dock4')!;
    const bearing = (Math.atan2(24 - c.at[0], 16.3 - c.at[1]) * 180) / PI;
    let off = Math.abs((((bearing - c.facing) % 360) + 540) % 360 - 180);
    off = Math.abs(off);
    expect(off).toBeGreaterThan((CAMERA.hFov * 180) / PI / 2 + 5);
    expect(PLAYER_CAMERA).toBeTruthy();
  });

  it('the desk: three cameras, operator index 4 is #5, within DESK_POST_RADIUS of the console, whose slot is >= 7 m from the start', () => {
    const d = lay.security!.desks!;
    expect(d.length).toBe(1);
    expect(d[0]).toMatchObject({ id: 'desk-sec4', section: 3, operator: 4 });
    expect([...d[0]!.cameras].sort()).toEqual(['cam-cage', 'cam-dock4', 'cam-mantrap']);
    const op = G[d[0]!.operator!]!;
    expect(hyp2(op.x - d[0]!.at[0], op.z - d[0]!.at[1])).toBeLessThanOrEqual(DESK_POST_RADIUS);
    expect(hyp2(op.x - S4.start.x, op.z - S4.start.z)).toBeGreaterThanOrEqual(7);
    expect(op.role).toBe('operator');
  });

  it('the dock board is reachable from the start with both keypad doors blocked; the keypads share one code and the intel line fits', () => {
    const ids: number[] = [];
    const find = doorFinder(b.anchors.doors);
    for (const k of S4.keypads!) {
      const info = find(k.at[0], k.at[1]);
      expect(info, `keypad door ${k.at}`).toBeTruthy();
      ids.push(addDoorClosure(nav, info!));
    }
    for (const id of ids) nav.setClosed(id, true);
    try {
      const board = S4.intel!.find((n) => n.kind === 'board')!;
      expect(board.kind === 'board' && pathLen([S4.start.x, S4.start.z, 0], [board.at[0], board.at[2] - 0.6, 0])).not.toBeNull();
    } finally {
      for (const id of ids) nav.setClosed(id, false);
    }
    expect(new Set(S4.keypads!.map((k) => k.code)).size).toBe(1);
    expect(S4.intel![0]!.grants).toBe(S4.keypads![0]!.code);
    expect(S4.intel![0]!.line.length).toBeLessThanOrEqual(60);
  });

  it('no ground route leg passes within 1.2 m of the pg-cage door; the key switches are 7.5-9 m apart and both outside the cage on the nav grid', () => {
    const [dx, dz] = S4_DOORS.pgCage;
    for (const r of S4.routes) {
      for (let i = 0; i + 1 < r.pts.length; i++) {
        const a = r.pts[i]!;
        const c = r.pts[i + 1]!;
        if ((a[2] ?? 0) > 1 || (c[2] ?? 0) > 1) continue;
        const l2 = (c[0] - a[0]) ** 2 + (c[1] - a[1]) ** 2;
        const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((dx - a[0]) * (c[0] - a[0]) + (dz - a[1]) * (c[1] - a[1])) / l2)) : 0;
        expect(hyp2(dx - (a[0] + (c[0] - a[0]) * t), dz - (a[1] + (c[1] - a[1]) * t)), `${r.name} leg ${i}`).toBeGreaterThan(1.2);
      }
    }
    const g = S4.pairGates![0]!;
    expect(g.door).toEqual([18, 40]);
    const sep = hyp2(g.a.at[0] - g.b.at[0], g.a.at[1] - g.b.at[1]);
    expect(sep).toBeGreaterThanOrEqual(7.5);
    expect(sep).toBeLessThanOrEqual(9);
    const [cx0, cz0, cx1, cz1] = S4_BOX.cage;
    for (const s of [g.a, g.b]) {
      expect(s.at[0] > cx0 && s.at[0] < cx1 && s.at[1] > cz0 && s.at[1] < cz1, `key switch ${s.at} outside the cage`).toBe(false);
      expect(nearNav(s.at[0], s.at[1], 0), `key switch ${s.at}`).toBe(true);
    }
  });
});

describe('S4 laser: las-tray and its panel', () => {
  const world = new SightWorld(b.boxes, b.cylinders);
  it('one laser with exactly one panel (checkPanels); the layout carries them; the beams span cable basket B-cage\'s full width', () => {
    expect(S4_LASERS.map((l) => l.id)).toEqual(['las-tray']);
    expect(checkPanels(S4_LASERS, S4_PANELS)).toEqual([]);
    expect(checkPanels(lay.lasers ?? [], lay.laserPanels ?? [])).toEqual([]);
    const l = S4_LASERS[0]!;
    expect(l.section).toBe(3);
    expect(l.floorY).toBe(S4_BASKET);
    expect(Math.min(l.x1, l.x2)).toBe(S4_BOX.bCage[0]);
    expect(Math.max(l.x1, l.x2)).toBe(S4_BOX.bCage[2]);
    expect(S4_PANELS.every((p) => p.section === 3 && !!p.label)).toBe(true);
  });

  it('the panel\'s jam point has a clear eye line from every near point (on a basket, within the jammer\'s range)', () => {
    const t = { x: 0, y: 0, z: 0 };
    for (const p of S4_PANELS) {
      panelTarget(p, t);
      const pts = S4_PANEL_NEAR[p.id]!;
      expect(pts.length).toBeGreaterThan(0);
      for (const [x, y, z] of pts) {
        expect(onNav(x, z, y), `${p.id} near point (${x}, ${z})`).toBe(true);
        expect(hyp3(t.x - x, t.y - (y + 1.6), t.z - z)).toBeLessThan(JAMMER.range);
        expect(world.clear(x, y + 1.6, z, t.x, t.y, t.z), `${p.id} seen from (${x}, ${y}, ${z})`).toBe(true);
      }
    }
  });
});

describe('S4 routes', () => {
  it('start at the start, OBJ within 1.8 of the objective, end inside the C4 zone; every point on the nav; every walked leg has a nav path', () => {
    expect(S4.routes.length).toBe(3);
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
      }
    }
    expect(new Set(S4.routes.map((r) => JSON.stringify(r.pts))).size).toBe(3);
  });

  it('runtime nav rules (b)-(d): a leg changing floor is a climb or a walk 0.8 m beyond the NOC flight; every raised basket leg is a climb; no point within 0.6 m of a body-height box or rail', () => {
    const f = S4_FLIGHT;
    const onFlightWalk = (x: number, z: number): boolean => Math.abs(z - f.cz) <= f.w / 2 + 0.8 && x >= f.cx - f.len / 2 - 0.8 && x <= f.cx + f.len / 2 + 0.8;
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

  it('no pickup inside the section; the ammo crate slot is inside C3 and near the nav; every armoured bypass names an S4 route that stays > 1.2 m from it; every camera flag is an S4 camera', () => {
    for (const p of lay.pickups) expect(p.pos.x >= -10 && p.pos.x <= 40 && p.pos.z >= 16 && p.pos.z <= 48, `pickup ${p.pos.x}, ${p.pos.z}`).toBe(false);
    const [c0, z0, c1, z1] = S4_BOX.c3;
    expect(S4_AMMO_CRATE.x > c0 && S4_AMMO_CRATE.x < c1 && S4_AMMO_CRATE.z > z0 && S4_AMMO_CRATE.z < z1).toBe(true);
    expect(nearNav(S4_AMMO_CRATE.x, S4_AMMO_CRATE.z, 0)).toBe(true);
    expect(S4_AMMO_CRATE.section).toBe(3);
    for (const a of S4_ARMOURED) {
      const r = S4.routes.find((q) => q.name === a.bypass.route);
      expect(r, a.id).toBeTruthy();
      for (let i = 0; i < r!.obj; i++) {
        const p = r!.pts[i]!;
        const q = r!.pts[i + 1]!;
        const l2 = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
        const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((a.at[0] - p[0]) * (q[0] - p[0]) + (a.at[1] - p[1]) * (q[1] - p[1])) / l2)) : 0;
        expect(hyp2(a.at[0] - (p[0] + (q[0] - p[0]) * t), a.at[1] - (p[1] + (q[1] - p[1]) * t)), `${a.id} leg ${i}`).toBeGreaterThan(1.2);
      }
    }
    // (E8) every S4 camera is bulletproof (the flags moved onto the devices at the S4 / S5 join)
    for (const c of CAMPUS_SECURITY.devices.filter((q) => q.kind === 'camera' && q.section === 3)) expect(c.bulletproof, c.id).toBe(true);
    expect(S3_DOORS.c3Near).toEqual([24, 0]);
  });
});

describe('CR4: the cable basket B1 against a solo player (SPEC Campus-wide rules 1-7)', () => {
  const cr4 = S4_COOP_LIPS[0]!;
  const west = S4_COOP_LIPS[1]!;
  const isBasket = (p: BoxPiece): boolean => Math.abs(top(p) - S4_BASKET) < 1e-6 && Math.abs(p.s[1] - 0.4) < 1e-6;
  const grip = (l: (typeof S4_COOP_LIPS)[number]) => ({ y: l.lip.y, a: { x: l.lip.x, z: l.lip.z0 }, b: { x: l.lip.x, z: l.lip.z1 }, n: l.lip.n });

  it('CR4 and CR4-west: the CR4 box x 3.1..4.1, z 32.4..35.6, top 4.4 over floor-0 boosts at (4.8, 34) and (2.4, 34); both in the campus lip list', () => {
    expect(S4_COOP_LIPS.map((l) => l.id)).toEqual(['CR4', 'CR4-west']);
    expect(cr4.lip).toMatchObject({ x: 4.1, z0: 32.4, z1: 35.6, y: 4.4, n: { x: 1, z: 0 } });
    expect(west.lip).toMatchObject({ x: 3.1, z0: 32.4, z1: 35.6, y: 4.4, n: { x: -1, z: 0 } });
    expect(cr4.boost).toEqual({ floor: 0, x: 4.8, z: 34.0 });
    expect(west.boost).toEqual({ floor: 0, x: 2.4, z: 34.0 });
    const box = solid.find((p) => Math.abs(p.c[0] - 3.6) < 1e-6 && Math.abs(p.c[2] - 34) < 1e-6 && isBasket(p))!;
    expect(box).toBeTruthy();
    expect(box.noLedge).not.toBe(true);
    expect(top(box) - cr4.boost.floor).toBeGreaterThanOrEqual(4.3);
    expect(top(box) - cr4.boost.floor).toBeLessThanOrEqual(4.5);
    expect(onNav(cr4.boost.x, cr4.boost.z)).toBe(true);
    expect(onNav(west.boost.x, west.boost.z)).toBe(true);
    for (const l of S4_COOP_LIPS) expect(CAMPUS_COOP_LIPS.includes(l)).toBe(true);
  });

  for (const l of [cr4, west]) {
    it(`${l.id}: no solo running jump reaches the 4.4 lip (0.5 m margin) and none lands on its top`, () => {
      expect(soloJumpThreats(solid, grip(l), isBasket, 0.5)).toEqual([]);
      expect(soloTopLandingThreats(solid, l.top, isBasket, 0.5)).toEqual([]);
    });

    it(`${l.id} headroom (rule 5): clear air from 4.5 to 6.2 over the lip, 0.45 + HANG.out out and 0.4 in`, () => {
      const g = l.lip;
      const out = g.n.x > 0 ? [g.x - 0.4, g.x + 0.45 + HANG.out] : [g.x - (0.45 + HANG.out), g.x + 0.4];
      const hit = solid.filter((p) => p.c[0] + p.s[0] / 2 > out[0]! && p.c[0] - p.s[0] / 2 < out[1]! && p.c[2] + p.s[2] / 2 > g.z0 && p.c[2] - p.s[2] / 2 < g.z1 && top(p) > g.y + 0.1 && bottom(p) < 6.2);
      expect(hit.map((p) => [p.c, p.s])).toEqual([]);
      expect(b.cylinders.filter((c) => c.collide && c.c[0] + c.r > out[0]! && c.c[0] - c.r < out[1]! && c.c[2] + c.r > g.z0 && c.c[2] - c.r < g.z1 && c.c[1] + c.h / 2 > g.y + 0.1).length).toBe(0);
    });

    it(`${l.id} rule 2: nothing solo-standable at 1.2 m or higher (and under the lip) within 4 m in plan of the lip (the S3 filter)`, () => {
      const g = l.lip;
      const bad = solid.filter((p) => {
        const t = top(p);
        if (t < 1.2 || t >= g.y - 0.05) return false;
        if (Math.min(p.s[0], p.s[2]) < LEDGE.climbDepth) return false;
        if (p.noLedge && t > MANTLE) return false;
        const gx = Math.max(0, Math.abs(p.c[0] - g.x) - p.s[0] / 2);
        const gz = Math.max(0, Math.max(g.z0 - (p.c[2] + p.s[2] / 2), p.c[2] - p.s[2] / 2 - g.z1));
        return hyp2(gx, gz) <= 4;
      });
      expect(bad.map((p) => [p.c, p.s])).toEqual([]);
    });

    it(`${l.id} rule 3: nothing 0.3-4.3 high within 1 m of the lip's face (no step under the nose)`, () => {
      const g = l.lip;
      const under = solid.filter((p) => !isBasket(p) && top(p) > 0.3 && bottom(p) < 4.3 && p.c[0] + p.s[0] / 2 > g.x - 1 && p.c[0] - p.s[0] / 2 < g.x + 1 && p.c[2] + p.s[2] / 2 > g.z0 && p.c[2] - p.s[2] / 2 < g.z1);
      expect(under.map((p) => [p.c, p.s])).toEqual([]);
    });
  }

  it('rule 6: every S4 box 1.9-4.2 high standing on a floor is noLedge', () => {
    for (const p of solid) {
      const h = p.s[1];
      if (h < 1.9 || h > 4.2 || !inFoot(p.c[0], p.c[2])) continue;
      if (![0, S4_NOC, S4_BASKET, S4_DECK].some((f) => Math.abs(bottom(p) - f) < 0.01)) continue;
      expect(p.noLedge, `${JSON.stringify(p.c)} ${JSON.stringify(p.s)}`).toBe(true);
    }
  });

  it('(polish 1, L6) the fuel tanks are 2.0 noLedge: no tank-top step onto the 2.8 compound wall 0.85 m east', () => {
    const [tx0, tz0, tx1, tz1] = S4_BOX.tanks;
    const tank = solid.find((p) => Math.abs(p.c[0] - (tx0 + tx1) / 2) < 1e-6 && Math.abs(p.c[2] - (tz0 + tz1) / 2) < 1e-6 && Math.abs(bottom(p)) < 1e-6);
    expect(tank).toBeDefined();
    expect(top(tank!)).toBeCloseTo(2.0);
    expect(tank!.noLedge).toBe(true);
  });

  it('ledges among the baskets only on the CR4 box (its two long faces); every other basket piece and the landing is noLedge', () => {
    const gen = generateLedges(b.boxes);
    const among = gen.ledges.filter((e) => Math.abs(e.top - S4_BASKET) < 1e-6 && e.a.x > 3 && e.a.x < 33 && e.a.z > 24 && e.a.z < 45);
    expect(among.length).toBeGreaterThan(0);
    for (const e of among) {
      expect([3.1, 4.1].some((x) => Math.abs(e.a.x - x) < 1e-3 && Math.abs(e.b.x - x) < 1e-3), `ledge x ${e.a.x}`).toBe(true);
      expect(Math.min(e.a.z, e.b.z)).toBeGreaterThanOrEqual(32.4 - 1e-3);
      expect(Math.max(e.a.z, e.b.z)).toBeLessThanOrEqual(35.6 + 1e-3);
    }
    const baskets = solid.filter((p) => isBasket(p) && inFoot(p.c[0], p.c[2]));
    expect(baskets.filter((p) => !p.noLedge).length).toBe(1);
  });

  it('rule 7: the basket landing has a nav path to B1 (solo reaches the baskets from the riser); both boost points are under the shadow line', () => {
    expect(pathLen([32.2, 43.4, S4_BASKET], [3.6, 30, S4_BASKET])).not.toBeNull();
    for (const [bx, bz] of [[cr4.boost.x, cr4.boost.z], [west.boost.x, west.boost.z]] as const) {
      let level = b.lights.ambientAt(bx, 0.9, bz);
      for (const li of b.lights.lights) level += contribution(li, bx, 0.9, bz);
      expect(level, `boost (${bx}, ${bz})`).toBeLessThan(LIGHT.shadow);
    }
  });
});

describe('S4 lighting', () => {
  const lights = b.lights.lights;
  const group = (g: number) => lights.filter((l) => l.group === g);
  const inBox = (l: { x: number; y: number; z: number }, x0: number, x1: number, z0: number, z1: number): boolean => l.x >= x0 && l.x <= x1 && l.z >= z0 && l.z <= z1;
  it('the circuits: group counts as the table, every lamp shootable and electric', () => {
    const counts: Record<number, number> = { 70: 6, 71: 4, 72: 4, 73: 1, 74: 2, 75: 2, 76: 2, 77: 2, 78: 3, 79: 4 };
    for (const [g, n] of Object.entries(counts)) expect(group(Number(g)).length, `group ${g}`).toBe(n);
    for (const l of lights.filter((q) => q.intensity > 0 && q.group >= 70 && q.group <= 79)) expect(l.destructible && l.electric, `lamp ${l.id}`).toBe(true);
    expect(Object.values(S4_GROUPS).sort()).toEqual([70, 71, 72, 73, 74, 75, 76, 77, 78, 79]);
  });

  it('every lit group but 79 has a switch or the board; the board is a timed isolator (window 20) on group 75; the hall panel has three switches in the service corridor', () => {
    const sw = lay.switches!;
    for (const g of Object.values(S4_GROUPS)) {
      if (g === 79) continue;
      expect(sw.some((s) => s.group === g) || lay.boards!.some((bd) => bd.groups.includes(g)), `group ${g}`).toBe(true);
    }
    expect(S4_BOARDS[0]!.window).toBe(20);
    expect(S4_BOARDS[0]!.groups).toEqual([75]);
    expect(sw.some((s) => s.group === 79)).toBe(false);
    const panel = sw.filter((s) => s.group >= 70 && s.group <= 72);
    expect(panel.length).toBe(3);
    for (const s of panel) expect(inBox({ x: s.pos.x, y: 0, z: s.pos.z }, -4, 14, 16, 18)).toBe(true);
  });

  it('dark by reason: no lamp in the battery room, the service corridor, the north corridor, the riser, the hot aisles or the build-out area; ambient 0.14, C3 and C4 keep 0.30', () => {
    const lit = lights.filter((l) => l.on && l.intensity > 0 && l.group >= 70 && l.group <= 79);
    expect(lit.filter((l) => inBox(l, -10, -4, 16, 27.8)).length).toBe(0);
    expect(lit.filter((l) => inBox(l, -4, 14, 16, 18)).length).toBe(0);
    expect(lit.filter((l) => inBox(l, 8, 30.6, 42, 48)).length).toBe(0);
    expect(lit.filter((l) => inBox(l, 30.6, 34, 42, 48)).length).toBe(0);
    for (const x0 of S4_PODS) expect(lit.filter((l) => inBox(l, x0 + 1.2, x0 + 2.4, 24, 32)).length, `hot aisle ${x0}`).toBe(0);
    // the build-out area east of the west aisle (the W aisle lamp at (-2.5, 34) is in the brief's lamp list: L5)
    expect(lit.filter((l) => l.y < 7 && inBox(l, 0, 13.8, 33, 42)).length).toBe(0);
    expect(b.lights.zoneAt(6.4, 1, 33)).toBe(0.14);
    expect(b.lights.zoneAt(36, 1, 20)).toBe(0.14);
    expect(b.lights.zoneAt(24, 1, 8)).toBe(0.3);
    expect(b.lights.zoneAt(-18, 1, 29)).toBe(0.3);
  });
});

describe('S4 rooms, sealing, door separation', () => {
  it('the rooms (HUD tags) do not overlap (storeys apart) and none carries a squad', () => {
    for (let i = 0; i < S4_ROOMS.length; i++)
      for (let j = i + 1; j < S4_ROOMS.length; j++) {
        const a = S4_ROOMS[i]!;
        const c = S4_ROOMS[j]!;
        const ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX);
        const oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
        const oy = Math.min(a.maxY ?? Infinity, c.maxY ?? Infinity) - Math.max(a.minY ?? -Infinity, c.minY ?? -Infinity);
        expect(ox > 0.01 && oz > 0.01 && oy > 0.01, `${a.id} overlaps ${c.id}`).toBe(false);
      }
    expect(S4_ROOMS.every((r) => (r.squad ?? []).length === 0)).toBe(true);
  });

  it('sealing: a flood from the start on the nav (doors open, ladders as links) never leaves the S4 footprint plus the C3 and C4 boxes; every deck edge over outside ground stands >= 1.9 high', () => {
    // C3's near door (into S3) and C4's far door (into S5) are the section's ends: shut them on the grid
    const find = doorFinder(b.anchors.doors);
    const ends = [find(24, 0), find(-26, 29), find(37.5, 16)].map((d) => addDoorClosure(nav, d!));
    for (const id of ends) nav.setClosed(id, true);
    const seen = new Uint8Array(nav.walk.length);
    const start = nav.cellOf(S4.start.x, S4.start.z, 0);
    const queue = [start];
    seen[start] = 1;
    const linksFrom = new Map<number, number[]>();
    for (const l of nav.links) {
      (linksFrom.get(l.a) ?? linksFrom.set(l.a, []).get(l.a)!).push(l.b);
      if (l.kind === 'ladder') (linksFrom.get(l.b) ?? linksFrom.set(l.b, []).get(l.b)!).push(l.a);
    }
    const outside: string[] = [];
    const allowed = (x: number, z: number): boolean => inFoot(x, z) || (x >= S4_BOX.c3[0] - 0.5 && x <= S4_BOX.c3[2] + 0.5 && z >= S4_BOX.c3[1] - 0.5 && z <= S4_BOX.c3[3] + 0.5) || (x >= S4_BOX.c4[0] - 0.5 && x <= S4_BOX.c4[2] + 0.5 && z >= S4_BOX.c4[1] - 0.5 && z <= S4_BOX.c4[3] + 0.5);
    let count = 0;
    while (queue.length) {
      const i = queue.pop()!;
      count++;
      const [x, z] = nav.center(i % nav.cols);
      if (!allowed(x, z)) outside.push(`(${x}, ${z}, ${nav.height[i]!.toFixed(1)})`);
      for (const j of [...nav.neighbours(i), ...(linksFrom.get(i) ?? [])]) if (!seen[j] && nav.walk[j]) {
        seen[j] = 1;
        queue.push(j);
      }
    }
    for (const id of ends) nav.setClosed(id, false);
    expect(count).toBeGreaterThan(2000);
    expect(outside.slice(0, 5)).toEqual([]);
    // the deck's north, south and west edges carry 2.0 screens (7.3-9.3); the east parapet (inside S4, over the compound) 1.1 with the ladder gap
    const screens = solid.filter((p) => Math.abs(bottom(p) - S4_DECK) < 1e-6 && Math.abs(p.s[1] - 2.0) < 1e-6 && (p.c[2] > 47.5 || p.c[2] < 16.5 || p.c[0] < -9.5));
    expect(screens.length).toBe(3);
    expect(screens.every((p) => p.noLedge)).toBe(true);
    const parapet = solid.filter((p) => Math.abs(bottom(p) - S4_DECK) < 1e-6 && Math.abs(p.s[1] - 1.1) < 1e-6 && Math.abs(p.c[0] - 34) < 1e-6);
    expect(parapet.length).toBe(2);
    expect(parapet.some((p) => p.c[2] + p.s[2] / 2 > 22.4 && p.c[2] - p.s[2] / 2 < 23.6)).toBe(false);
  });

  it('door separation: every keypad, pair gate, lockdown and connector door centre is >= 1.2 m (plan) from every other door anchor centre on any floor', () => {
    const centres = b.anchors.doors.map((d) => [d.hinge.x + (Math.sin(d.yaw) * d.width) / 2, d.hinge.z + (Math.cos(d.yaw) * d.width) / 2] as const);
    const special: (readonly [number, number])[] = [S4_DOORS.c3Far, S4_DOORS.c4Near, ...S4.keypads!.map((k) => k.at), ...S4.pairGates!.map((g) => g.door)];
    for (const a of S4.stageActions!) for (const d of a.lockDoors ?? []) special.push(d);
    for (const s of special) {
      const same = centres.filter((c) => hyp2(c[0] - s[0], c[1] - s[1]) < 0.05);
      expect(same.length, `door at ${s}`).toBe(1);
      for (const c of centres) {
        if (hyp2(c[0] - s[0], c[1] - s[1]) < 0.05) continue;
        expect(hyp2(c[0] - s[0], c[1] - s[1]), `door ${s} vs door ${c}`).toBeGreaterThanOrEqual(1.2);
      }
    }
  });
});

describe('M8: isolation in time at each takedown spot (sectorCheck)', () => {
  const world = new SightWorld(b.boxes, b.cylinders);
  const timed: CheckGuard[] = G.map((g) => {
    const speed = ENEMIES[g.kind].walkSpeed * (g.loop ? 1 : CHECK_PATROL_PACE);
    return { x: g.x, z: g.z, y: g.y, route: g.route as readonly (readonly [number, number])[] | undefined, wait: g.wait, waits: g.waits, speed, loop: g.loop };
  });
  it('records each guard\'s longest isolated run at its spot; every guard outside the recorded overlap pairs holds 3 s', () => {
    const rows = G.map((g, i) => ({ n: i + 1, run: longestIsolation(world, timed, i, 15, g.takedownSpot), ok: isolatedInTime(world, timed, i, g.takedownSpot) }));
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(rows.map((r) => `#${r.n} ${r.run}s ${r.ok ? 'ok' : 'NOT isolated'}`).join('\n'));
    // recorded exceptions (overlap partners, LS 4.5): the dog team #1-#2, the security room pair #5-#6, the NOC pair #14-#15
    const must = rows.filter((r) => ![1, 2, 5, 6, 14, 15].includes(r.n));
    expect(must.filter((r) => !r.ok).map((r) => `#${r.n} (${r.run}s)`)).toEqual([]);
    expect(CHECK_ISOLATION).toBe(3);
  });
});

describe('K3 (M12): the colonnade sentry is an unavoidable posted guard at the C4 gate', () => {
  const post = G[18]!;
  it('the cone as a nav blocker: no path from the start to the cell 0.6 m east of the C4 near door; without it one; the door cell is in the pocket behind him, the leash edge is >= 1 m beyond it, the colonnade doors are inside the cone', () => {
    const door = S4_DOORS.c4Near;
    const from: [number, number] = [S4.start.x, S4.start.z];
    const to: [number, number] = [door[0] + 0.6, door[1]];
    expect(nav.findPath(from, to, 1e7, 0, 0)).not.toBeNull();
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
    const doorCell = nav.center(nav.cellOf(door[0], door[1], 0));
    const leash = post.post!.leash;
    expect(inCone(doorCell[0], doorCell[1]), 'the C4 door cell is not in the cone').toBe(false);
    expect(leash - hyp2(doorCell[0] - post.x, doorCell[1] - post.z)).toBeGreaterThanOrEqual(1);
    for (const [x, z] of [S4_DOORS.ccUps, S4_DOORS.battCC, S4_DOORS.hallCC]) {
      const c = nav.center(nav.cellOf(x, z, 0));
      expect(inCone(c[0], c[1]), `door cell (${x}, ${z}) in the cone`).toBe(true);
    }
    const blocked: number[] = [];
    for (let i = 0; i < nav.walk.length; i++) {
      if (!nav.walk[i]) continue;
      if (Math.abs(nav.height[i]!) > 1.7) continue;
      const [x, z] = nav.center(i % nav.cols);
      if (inCone(x, z)) {
        blocked.push(i);
        nav.walk[i] = 0;
      }
    }
    try {
      expect(blocked.length).toBeGreaterThan(50);
      expect(nav.findPath(from, to, 1e7, 0, 0)).toBeNull();
    } finally {
      for (const i of blocked) nav.walk[i] = 1;
    }
    expect(nav.findPath(from, to, 1e7, 0, 0)).not.toBeNull();
    expect(Math.sin(post.yaw)).toBeGreaterThan(0);
    expect(door[0]).toBeLessThan(post.x);
  });

  it('the dormant rule: only #10, #11 and #16; none is posted, a pair member, a handler or a dog', () => {
    const handlers = new Set(G.map((g) => g.handler).filter((h): h is number => h !== undefined));
    G.forEach((g, i) => {
      if (g.pair !== undefined || handlers.has(i) || g.role === 'posted' || ENEMIES[g.kind].quadruped) expect(g.dormant, `guard #${i + 1}`).not.toBe(true);
    });
    expect(G.map((g, i) => (g.dormant ? i + 1 : 0)).filter((n) => n > 0)).toEqual([10, 11, 16]);
  });
});

describe('A99: the screen count (no player point sees more than CAMPUS_SCREEN_CAP guards, every guard counted)', () => {
  const near = (p: BoxPiece): boolean => p.c[0] + p.s[0] > FOOT.x0 - 2 && p.c[0] - p.s[0] < FOOT.x1 + 2 && p.c[2] + p.s[2] > FOOT.z0 - 2 && p.c[2] - p.s[2] < FOOT.z1 + 2;
  const awake = ALL.map((g, i) => ({ g, i }));
  /** A shut leaf for every door no guard route passes (the pod end doors of P1 and P4 and the doors (-7, 30.2) / (-7, 27.8) stay open). */
  const leaves: BoxPiece[] = [];
  for (const d of b.anchors.doors) {
    const cx = d.hinge.x + (Math.sin(d.yaw) * d.width) / 2;
    const cz = d.hinge.z + (Math.cos(d.yaw) * d.width) / 2;
    if (!inFoot(cx, cz)) continue;
    const forced = (S4_PODS[0]! + 1.8 === cx || S4_PODS[3]! + 1.8 === cx) && (cz === 24 || cz === 32);
    const forcedCC = cx === -7 && (cz === 30.2 || cz === 27.8);
    const passed = awake.some(({ g }) => guardPoints({ x: g.x, z: g.z, y: g.y, route: g.route as readonly (readonly [number, number])[] | undefined }).some((p) => hyp2(p[0] - cx, p[2] - cz) < 0.7 && Math.abs(p[1] - d.hinge.y) < 1));
    if (forced || forcedCC || passed) continue;
    const alongX = Math.abs(Math.sin(d.yaw)) > 0.5;
    leaves.push({ c: [cx, d.hinge.y + 1.05, cz], s: alongX ? [d.width, 2.1, 0.1] : [0.1, 2.1, d.width], yaw: 0, pitch: 0, color: '#000', collide: true });
  }
  const world = new SightWorld([...bG.boxes.filter(near), ...leaves], bG.cylinders);
  const HALF = ((PLAYER_CAMERA.fov / 2) * PI) / 180;
  const YAWS = Array.from({ length: 32 }, (_, k) => (k * PI) / 16);
  it('at every walkable nav cell centre (0.5 m) of the section, 32 facings: at most CAMPUS_SCREEN_CAP guards (dormant too) on their routes in the view with a clear line within 40 m', () => {
    const pts = awake.map(({ g }) => guardPoints({ x: g.x, z: g.z, y: g.y, route: g.route as readonly (readonly [number, number])[] | undefined }).map(([px, py, pz]) => [px, py + 1.2, pz] as const));
    let worst = { n: -1, at: '', who: [] as number[] };
    let samples = 0;
    let baskets = 0;
    let deck = 0;
    let over = 0;
    const hist = new Map<number, number>();
    for (let col = 0; col < nav.cols; col++) {
      const [x, z] = nav.center(col);
      if (!inFoot(x, z)) continue;
      for (let l = 0; l < nav.layers; l++) {
        const i = l * nav.cols + col;
        if (!nav.walk[i]) continue;
        const h = nav.height[i]!;
        if (h > 9) continue;
        samples++;
        if (Math.abs(h - S4_BASKET) < 0.05) baskets++;
        if (Math.abs(h - S4_DECK) < 0.05) deck++;
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
    if (process.env.CAMPUS_PRINT) console.log(`A99 worst ${worst.n} at ${worst.at}: #${worst.who.join(', #')} (${samples} points, ${baskets} on the baskets, ${deck} on the deck, ${over} over ${CAMPUS_SCREEN_CAP}); histogram ${JSON.stringify([...hist.entries()].sort((p, q) => p[0] - q[0]))}`);
    expect(samples).toBeGreaterThan(4000);
    expect(baskets).toBeGreaterThan(50);
    expect(deck).toBeGreaterThan(200);
    expect(worst.n, `worst ${worst.at}: #${worst.who.join(', #')}`).toBeLessThanOrEqual(CAMPUS_SCREEN_CAP);
  }, 600_000);
});
