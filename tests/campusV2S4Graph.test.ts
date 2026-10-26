/**
 * (campus-greybox S4, `docs/campus-greybox/briefs/S4.md` G4.6, job PLAN section 7 "LD 15") Section 4's v2 graph against the build, flag
 * on (`flags.campusV2 = [4]`): `graph/v2/campusOps-S4.json` matches the greybox (areas, doors, guard sums per key), a solo player gets
 * past the team doors, the light at the vantages, and no unplanned co-op lip. Pure geometry (the undressed `LevelBuilder`); the nav is the
 * live test's analytic raster (copied: a test file is never imported).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import type { BoxPiece, LevelBuilder as LB } from '../src/world/levelBuilder';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { TraversalAnchors, generateLedges, suppressLedgesNear, type Ledge } from '../src/world/anchors';
import { LIGHT, contribution } from '../src/world/lights';
import { hyp2 } from '../src/core/mathx';
import { addDoorClosure, doorFinder } from '../src/game/sectorStage';


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
const { S4_COOP_LIPS, S4_DOORS, S4_FLIGHTS, S4_HIDESPOTS } = m.s4;
const b: LB = new m.LevelBuilder();
m.buildCampus(b, { dress: false });
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
/** The door anchor whose opening centre is (x, z) on floor y (5 cm). */
const doorAt = (x: number, z: number, y = 0) =>
  b.anchors.doors.find((d) => Math.abs(d.hinge.y - y) < 0.05 && hyp2(d.hinge.x + (Math.sin(d.yaw) * d.width) / 2 - x, d.hinge.z + (Math.cos(d.yaw) * d.width) / 2 - z) < 0.05);

interface GSpace {
  id: string;
  area: [number, number, number, number];
  storey: number;
  guards?: Record<string, number>;
  tags: string[];
  vantage?: { from: string; sees_pct: number };
}
interface GLink {
  from: string;
  to: string;
  kind: string;
}
const graph = JSON.parse(readFileSync(fileURLToPath(new URL('../docs/sector-redesign/graph/v2/campusOps-S4.json', import.meta.url)), 'utf8')) as { spaces: GSpace[]; links: GLink[]; meta: { players: number[] } };
const G = S4.guards;
const space = (id: string): GSpace => graph.spaces.find((s) => s.id === id)!;

describe('G4.6 graph matches the build (LD 15)', () => {
  it('every S4 space area holds a walkable nav cell on its storey', () => {
    for (const s of graph.spaces) {
      const [ax0, az0, ax1, az1] = s.area;
      let found = false;
      for (let x = ax0 + 0.25; x < ax1 && !found; x += 0.25) for (let z = az0 + 0.25; z < az1 && !found; z += 0.25) if (onNav(x, z, s.storey)) found = true;
      expect(found, `${s.id} (${s.area}) at storey ${s.storey}`).toBe(true);
    }
  });

  it('every door / pair_gate link has a door anchor within 0.6 m of its point, on the shared edge of its two areas', () => {
    // the door point of each door link (S4_DOORS / the sector's keypads and pair gates), keyed from > to
    const D = S4_DOORS;
    const pts: Record<string, readonly [number, number]> = {
      's4-dock>s4-lobby': D.dockWest,
      's4-dock>s4-yard': D.dockEast,
      's4-mantrap>s4-hall': D.mantrapInner,
      's4-lobby>s4-batt': D.kpBatt,
      's4-batt>s4-hall': D.hallBatt,
      's4-batt>s4-cc': D.battCC,
      's4-cc>s4-ups': D.ccUps,
      's4-ups>s4-hall': D.hallUps,
      's4-ups>s4-sec': D.upsSec,
      's4-hall>s4-sec': D.secDoor,
      's4-hall>s4-nc': D.ncDoor,
      's4-sec>s4-nc': D.secNc,
      's4-nc>s4-riser': D.kpDeck,
      's4-yard>s4-hall': D.hallEast,
      's4-yard>s4-riser': D.kpRiser,
      's4-hall>s4-cage': D.cageFront,
      's4-lobby>s4-mantrap': D.mantrapOuter,
    };
    const gatePts: Record<string, readonly [number, number]> = { 's4-hall>s4-cage': D.pgCage };
    const touch = (a: GSpace, c: GSpace, p: readonly [number, number]): boolean => {
      const lo = [Math.max(a.area[0], c.area[0]) - 0.6, Math.max(a.area[1], c.area[1]) - 0.6];
      const hi = [Math.min(a.area[2], c.area[2]) + 0.6, Math.min(a.area[3], c.area[3]) + 0.6];
      return lo[0]! <= hi[0]! && lo[1]! <= hi[1]! && p[0] >= lo[0]! - 0.6 && p[0] <= hi[0]! + 0.6 && p[1] >= lo[1]! - 0.6 && p[1] <= hi[1]! + 0.6;
    };
    let n = 0;
    for (const l of graph.links) {
      if (l.kind !== 'door' && l.kind !== 'pair_gate') continue;
      const key = `${l.from}>${l.to}`;
      const p = (l.kind === 'pair_gate' && key === 's4-hall>s4-cage' ? gatePts : pts)[key];
      expect(p, `a door point for the ${l.kind} link ${key}`).toBeTruthy();
      const door = b.anchors.doors.find((d) => hyp2(d.hinge.x + (Math.sin(d.yaw) * d.width) / 2 - p![0], d.hinge.z + (Math.cos(d.yaw) * d.width) / 2 - p![1]) <= 0.6);
      expect(door, `${l.kind} ${key} at ${p}`).toBeTruthy();
      expect(touch(space(l.from), space(l.to), p!), `${key} door ${p} on the shared edge of the two areas`).toBe(true);
      n++;
    }
    expect(n).toBe(18);
    // the sector's keypad and pair-gate doors are the same anchors
    for (const k of S4.keypads!) expect(doorAt(k.at[0], k.at[1]), `keypad ${k.at}`).toBeTruthy();
    for (const g of S4.pairGates!) expect(doorAt(g.door[0], g.door[1]), `pair gate ${g.door}`).toBeTruthy();
  });

  it('the guard sums per key, computed from S4_GUARDS (a guard counts in the smaller area holding his slot on his storey), equal the graph at every key (25 / 25 / 25 / 25: no tagged rows yet)', () => {
    const sums = new Map<string, number>();
    G.forEach((g, i) => {
      const y = g.y ?? 0;
      const hit = graph.spaces
        .filter((s) => Math.abs(s.storey - y) < 0.05 && g.x >= s.area[0] && g.x <= s.area[2] && g.z >= s.area[1] && g.z <= s.area[3])
        .sort((p, q) => (p.area[2] - p.area[0]) * (p.area[3] - p.area[1]) - (q.area[2] - q.area[0]) * (q.area[3] - q.area[1]));
      expect(hit.length, `#${i + 1} (${g.x}, ${g.z}, ${y}) in a space`).toBeGreaterThan(0);
      sums.set(hit[0]!.id, (sums.get(hit[0]!.id) ?? 0) + 1);
    });
    expect([...sums.values()].reduce((p, q) => p + q, 0)).toBe(25);
    expect(graph.meta.players).toEqual([1, 2, 3, 4]);
    for (const s of graph.spaces) {
      const want = sums.get(s.id) ?? 0;
      if (want === 0) expect(s.guards, s.id).toBeUndefined();
      else expect(s.guards, s.id).toEqual({ '1': want, '2': want, '3': want, '4': want });
    }
    expect(Object.fromEntries([...sums.entries()].sort())).toEqual({ 's4-batt': 1, 's4-cc': 1, 's4-deck': 2, 's4-dock': 2, 's4-hall': 7, 's4-lobby': 2, 's4-nc': 1, 's4-noc': 2, 's4-sec': 3, 's4-yard': 4 });
    // A18: K3 #19's space is a connector, tagged unavoidable
    expect(space('s4-cc').tags).toContain('unavoidable');
    expect(space('s4-cc').tags).toContain('exit');
  });
});

describe('G4.6 solo past the team doors (LD 15)', () => {
  it('with pg-cage and the CR9 door shut as nav blockers and every co-op lip box solid (CR4, CR4-west, CR8, CR8-west, CR10), keypad doors open: start -> the terminal -> the C4 zone', () => {
    let shutLen: number;
    const len = (a: readonly [number, number], c: readonly [number, number]): number => {
      const path = nav.findPath([a[0], a[1]], [c[0], c[1]], 400000, 0, 0);
      expect(path, `path ${a} -> ${c}`).not.toBeNull();
      let sum = 0;
      let q: readonly [number, number] = a;
      for (const w of path!) {
        sum += hyp2(w[0] - q[0], w[1] - q[1]);
        q = [w[0], w[1]];
      }
      return sum;
    };
    const find = doorFinder(b.anchors.doors);
    const shut = [S4_DOORS.pgCage, S4_DOORS.mantrapOuter].map((p) => addDoorClosure(nav, find(p[0], p[1])!));
    for (const id of shut) nav.setClosed(id, true);
    // every co-op lip's top is solid: no cell on a lip box is walkable (the plenum floor included)
    const blocked: number[] = [];
    for (const l of S4_COOP_LIPS) {
      for (let col = 0; col < nav.cols; col++) {
        const [x, z] = nav.center(col);
        if (x < l.top.x0 || x > l.top.x1 || z < l.top.z0 || z > l.top.z1) continue;
        for (let k = 0; k < nav.layers; k++) {
          const i = k * nav.cols + col;
          if (nav.walk[i] && Math.abs(nav.height[i]! - l.top.top) < 0.3) {
            nav.walk[i] = 0;
            blocked.push(i);
          }
        }
      }
    }
    try {
      expect(S4_COOP_LIPS.map((l) => l.id)).toEqual(['CR4', 'CR4-west', 'CR8', 'CR8-west', 'CR10']);
      expect(blocked.length).toBeGreaterThan(100);
      // the terminal's desk (z 38.2..38.8) stands on the objective point: the player works it from 1 m south, on the routes' own point (18, 37.3)
      const terminal: [number, number] = [S4.objective.x, S4.objective.z - 1];
      const start: [number, number] = [S4.start.x, S4.start.z];
      const exit = S4.connector!.checkpoint;
      expect(nav.findPath(start, terminal, 400000, 0, 0), 'start -> the terminal').not.toBeNull();
      expect(nav.findPath(terminal, [exit.x, exit.z], 400000, 0, 0), 'the terminal -> the C4 zone').not.toBeNull();
      // the closure bites: the lobby -> the mantrap by its outer door is a long way round (the hall and the inner door) while it is shut
      shutLen = len([5, 20.5], [9.5, 20.5]);
    } finally {
      for (const i of blocked) nav.walk[i] = 1;
      for (const id of shut) nav.setClosed(id, false);
    }
    const openLen = len([5, 20.5], [9.5, 20.5]);
    expect(openLen).toBeLessThan(8);
    expect(shutLen, 'the way round the shut mantrap door').toBeGreaterThan(openLen + 20);
  });
});

describe('G4.6 light at the vantages (LD 15)', () => {
  /** The unoccluded registry level at (x, y, z): the standby ambient plus every lamp (the light meter's CPU term; the baked LightField needs a scene). */
  const levelAt = (x: number, y: number, z: number): number => {
    let level = b.lights.ambientAt(x, y, z);
    for (const li of b.lights.lights) level += contribution(li, x, y, z);
    return level;
  };
  const centre = (s: GSpace): [number, number, number] => [(s.area[0] + s.area[2]) / 2, s.storey + 0.9, (s.area[1] + s.area[3]) / 2];

  it('the level is logged at each graph vantage `from` point (its space\'s centre) and each hide spot; dark where no fitting lights the point: the plenum, the baskets', () => {
    const rows: string[] = [];
    for (const s of graph.spaces.filter((q) => q.vantage)) {
      const f = space(s.vantage!.from);
      const [x, y, z] = centre(f);
      rows.push(`vantage ${s.id} from ${f.id} (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}): ${levelAt(x, y, z).toFixed(2)}`);
    }
    for (const h of S4_HIDESPOTS) rows.push(`hide spot (${h.pos.x}, ${h.pos.z}): ${levelAt(h.pos.x, 0.9, h.pos.z).toFixed(2)}`);
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(rows.join('\n'));
    expect(rows.length).toBeGreaterThan(8);
    for (const id of ['s4-plenum', 's4-baskets']) {
      const [x, y, z] = centre(space(id));
      expect(levelAt(x, y, z), `${id} is dark (no fitting)`).toBeLessThan(LIGHT.shadow);
    }
    // the plenum floor over the whole lobby, and the baskets' run along the hall: no lamp up there
    for (const [x, z] of [[-2, 17], [5, 19], [12, 21]] as const) expect(levelAt(x, 4.1, z), `plenum (${x}, ${z})`).toBeLessThan(LIGHT.shadow);
    // B-N over the NOC window: the as-built NOC lamps (0 and 5, 6.4, 45) light it through the clear window (x < ~8: reported, never dimmed, A19)
    for (const x of [12, 20, 28]) expect(levelAt(x, 5.3, 41.3), `basket B-N x ${x}`).toBeLessThan(LIGHT.shadow);
    // eslint-disable-next-line no-console
    if (process.env.CAMPUS_PRINT) console.log(`B-N x 5: ${levelAt(5, 5.3, 41.3).toFixed(2)} (the NOC lamps through the window)`);
  });
});

describe('G4.6 unplanned lips (LD 11.8)', () => {
  it('every canHang ledge 3.8-4.5 over its floor in S4 is a planned lip (CR4, CR4-west, CR8, CR8-west, CR10) or stands on a surface a solo player reaches', () => {
    // the build's ledges: the map's manual ones (`b.ledge`) then the generated ones, in one list as `LevelBuilder.build`
    // makes it (copies: `b.anchors` stays as built); its `noLedge(x, z, r)` points apply after that
    const anchors = new TraversalAnchors();
    for (const l of b.anchors.ledges) anchors.add<Ledge>({ ...l });
    generateLedges(b.boxes, anchors);
    for (const [x, z, r] of (b as unknown as { noLedgeAt: [number, number, number][] }).noLedgeAt) suppressLedgesNear(anchors, x, z, r);
    const inS4 = (x: number, z: number): boolean => x >= -10.5 && x <= 40.5 && z >= 15.5 && z <= 48.5;
    const planned = (e: (typeof anchors.ledges)[number]): string | null => {
      for (const l of S4_COOP_LIPS) {
        if (Math.abs(e.top - l.lip.y) > 0.05) continue;
        if (Math.abs(e.a.x - l.lip.x) > 0.4 || Math.abs(e.b.x - l.lip.x) > 0.4) continue;
        if (Math.min(e.a.z, e.b.z) < l.lip.z0 - 0.05 || Math.max(e.a.z, e.b.z) > l.lip.z1 + 0.05) continue;
        return l.id;
      }
      return null;
    };
    const seen: string[] = [];
    const unplanned: string[] = [];
    for (const e of anchors.ledges) {
      if (!e.canHang || e.drop < 3.8 || e.drop > 4.5 || !inS4(e.a.x, e.a.z)) continue;
      const id = planned(e);
      if (id) {
        seen.push(id);
        continue;
      }
      // a solo-reached surface: a nav path from the start to a cell on the ledge's top, just inside the lip
      const mx = (e.a.x + e.b.x) / 2 - e.nx * 0.5;
      const mz = (e.a.z + e.b.z) / 2 - e.nz * 0.5;
      const reached = nav.findPath([S4.start.x, S4.start.z], [mx, mz], 400000, 0, e.top) !== null;
      if (!reached) unplanned.push(`(${e.a.x.toFixed(2)}, ${e.a.z.toFixed(2)}) - (${e.b.x.toFixed(2)}, ${e.b.z.toFixed(2)}) top ${e.top.toFixed(2)} drop ${e.drop.toFixed(2)}`);
    }
    expect(unplanned).toEqual([]);
    // all five planned lips show up as hangable ledges
    for (const id of ['CR4', 'CR4-west', 'CR8', 'CR8-west', 'CR10']) expect(seen.includes(id), `${id} has a hangable ledge`).toBe(true);
  });
});
