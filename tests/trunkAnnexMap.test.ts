import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NavGrid, type NavBlocker, type NavSample, type Waypoint } from '../src/ai/navGrid';
import { navLinks } from '../src/ai/navBuild';
import { loopArrivals, loopPeriod, loopStateAt } from '../src/ai/loopSchedule';
import { PatrolWalker } from '../src/ai/patrol';
import { LevelBuilder } from '../src/world/levelBuilder';
import { guardLoops, guardSlot, loopLeave, trunkAnnex, TRUNK_Y } from '../src/world/maps/trunkAnnex';
import data from '../src/world/maps/trunkAnnex.data.json';
import { MISSIONS, missionById } from '../src/game/missions';
import { isListedMap } from '../src/world/maps/listed';
import { MAPS } from '../src/world/maps';

/** Standing room a guard needs over a surface (`navBuild.ts`). */
const HEADROOM = 1.7;
const CELL = 0.5;
const RADIUS = 0.32;
const SEARCH = 3000000;
const Y: Record<string, number> = { G: TRUNK_Y.ground, U: TRUNK_Y.upper, R: TRUNK_Y.roof };

type Boxes = Pick<LevelBuilder, 'boxes'>;
interface Piece {
  bottom: number;
  top: number;
  ramp: boolean;
}

/** The solid pieces over (x, z): flat boxes by footprint, ramps (pitched boxes, as `LevelBuilder.ramp` builds them) by slope. */
function piecesAt(b: Boxes, x: number, z: number): Piece[] {
  const out: Piece[] = [];
  for (const p of b.boxes) {
    if (!p.collide) continue;
    const dx = x - p.c[0];
    const dz = z - p.c[2];
    if (Math.abs(p.pitch) < 1e-3) {
      const c = Math.cos(-p.yaw);
      const s = Math.sin(-p.yaw);
      const lx = c * dx + s * dz;
      const lz = -s * dx + c * dz;
      if (Math.abs(lx) <= p.s[0] / 2 && Math.abs(lz) <= p.s[2] / 2) out.push({ bottom: p.c[1] - p.s[1] / 2, top: p.c[1] + p.s[1] / 2, ramp: false });
    } else {
      const th = Math.abs(p.pitch);
      const fx = Math.sin(p.yaw);
      const fz = Math.cos(p.yaw);
      const a = dx * fx + dz * fz;
      const l = dx * fz - dz * fx;
      if (Math.abs(l) > p.s[0] / 2 || Math.abs(a) > (p.s[2] * Math.cos(th)) / 2) continue;
      const top = p.c[1] + p.s[1] / 2 / Math.cos(th) + Math.tan(th) * a;
      out.push({ bottom: top - p.s[1] / Math.cos(th), top, ramp: true });
    }
  }
  return out;
}

/** Walkable surfaces in a column, lowest first: the top of a piece with nothing over it and standing room above. */
function surfacesAt(b: Boxes, x: number, z: number): { h: number; ramp: boolean }[] {
  const ps = piecesAt(b, x, z);
  const out: { h: number; ramp: boolean }[] = [];
  for (const p of ps) {
    const at = p.top + 0.02;
    if (ps.some((q) => q !== p && q.bottom < at && q.top > at)) continue;
    let ceiling = Infinity;
    for (const q of ps) if (q !== p && q.bottom >= at) ceiling = Math.min(ceiling, q.bottom);
    if (ceiling - p.top >= HEADROOM) out.push({ h: p.top, ramp: p.ramp });
  }
  out.sort((m, n) => m.h - n.h);
  return out.filter((s, k) => k === 0 || s.h - out[k - 1]!.h > 0.05);
}

/** The nav grid `navBuild.ts` makes (same cell, radius, step, blockers, fences and links), the surfaces sampled analytically. */
function navFor(b: LevelBuilder, seed: [number, number]): NavGrid {
  const blockers: NavBlocker[] = [];
  for (const p of b.boxes) {
    if (!p.collide || Math.abs(p.pitch) > 1e-3 || p.overhead) continue;
    blockers.push({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: p.c[1] - p.s[1] / 2, top: p.c[1] + p.s[1] / 2 });
  }
  for (const f of b.anchors.fences) blockers.push({ cx: (f.a.x + f.b.x) / 2, cz: (f.a.z + f.b.z) / 2, hx: 0.05, hz: f.len / 2, yaw: Math.atan2(f.tx, f.tz), bottom: f.a.y, top: f.a.y + f.height });
  for (const c of b.cylinders) {
    if (c.collide) blockers.push({ cx: c.c[0], cz: c.c[2], hx: c.r, hz: c.r, yaw: 0, bottom: c.c[1] - c.h / 2, top: c.c[1] + c.h / 2, round: true });
  }
  return new NavGrid({
    minX: b.bounds.minX,
    maxX: b.bounds.maxX,
    minZ: b.bounds.minZ,
    maxZ: b.bounds.maxZ,
    cell: CELL,
    agentRadius: RADIUS,
    stepHeight: 0.45,
    blockers,
    links: navLinks(b),
    seed,
    sample: () => ({ h: 0, ok: false }),
    sampleLayers: (x, z): NavSample[] => surfacesAt(b, x, z).map((s) => ({ h: s.h, ok: true })),
  });
}

const b = new LevelBuilder();
const layout = trunkAnnex.build(b, 1);
const spawns = layout.playerSpawns;
const s2 = spawns[1]!.pos;
const grid = navFor(b, [s2.x, s2.z]);

const pathLen = (p: Waypoint[], from: [number, number]): number => {
  let len = 0;
  let [px, pz] = from;
  for (const w of p) {
    len += Math.hypot(w[0] - px, w[1] - pz);
    px = w[0];
    pz = w[1];
  }
  return len;
};

/** A walkable cell near (x, y, z) on the storey at y (NaN: any), or -1. */
const cellAt = (x: number, z: number, y: number, ring = 2): number => grid.nearestWalkable(x, z, ring, y);

/** Path from A to B on the grid (null when none), each end on its own storey. */
function pathBetween(from: [number, number, number], to: [number, number, number], g: NavGrid = grid, max = SEARCH): { path: Waypoint[]; len: number } | null {
  const a = g.nearestWalkable(from[0], from[1], 2, from[2]);
  const i = g.nearestWalkable(to[0], to[1], 2, to[2]);
  if (a < 0 || i < 0) return null;
  const p = g.findPath(g.center(a), g.center(i), max, g.height[a]!, g.height[i]!);
  return p ? { path: p, len: pathLen(p, g.center(a)) } : null;
}

const reach = (from: [number, number, number], to: [number, number, number], label: string): void => {
  const a = cellAt(from[0], from[1], from[2]);
  const i = cellAt(to[0], to[1], to[2]);
  expect(a, `${label}: walkable at ${from}`).toBeGreaterThanOrEqual(0);
  expect(i, `${label}: walkable at ${to}`).toBeGreaterThanOrEqual(0);
  expect(Math.abs(grid.height[i]! - to[2]), `${label}: on its storey at ${to}`).toBeLessThan(0.45);
  expect(grid.findPath(grid.center(a), grid.center(i), SEARCH, grid.height[a]!, to[2]), `${label}: ${from} to ${to}`).not.toBeNull();
};
const route = (label: string, pts: [number, number, number][]): void => {
  for (let k = 1; k < pts.length; k++) reach(pts[k - 1]!, pts[k]!, `${label} hop ${k}`);
};

interface Opening { id: string; type: string; level: string; axis: string; at: number; c: number; w: number }
const OPENINGS = data.openings as unknown as Opening[];

describe('Trunk Annex T1: registration and data', () => {
  it('is a listed map with infiltration and sandbox, four player spawns and a mission', () => {
    expect(MAPS.some((m) => m.id === 'trunk-annex')).toBe(true);
    expect(isListedMap('trunk-annex')).toBe(true);
    expect(trunkAnnex.modes).toEqual(['infiltration', 'sandbox']);
    expect(trunkAnnex.theme.lightLevel).toBe(0.1);
    expect(spawns.length).toBe(4);
    const m = missionById('trunk-annex')!;
    expect(m.map).toBe('trunk-annex');
    expect(m.insertions.map((i) => [i.x, i.z])).toEqual(data.spawns.map((s) => [s.x, s.z]));
    expect(m.objectives.map((o) => o.id)).toEqual(['o1', 'o2', 'e1']);
    expect(m.objectives.map((o) => [o.x, o.y, o.z])).toEqual([
      [data.objectives[0]!.x, 3.3, data.objectives[0]!.z],
      [data.objectives[1]!.x, 0, data.objectives[1]!.z],
      [data.extraction[0]!.x, 0, data.extraction[0]!.z],
    ]);
    expect(m.objectives[2]!.alt).toEqual([{ x: data.extraction[1]!.x, y: 0, z: data.extraction[1]!.z, radius: data.extraction[1]!.r }]);
    expect(MISSIONS.some((x) => x.id === 'exchange-greybox')).toBe(true);
  });

  it('the map data is a copy of the design JSON (they cannot drift)', () => {
    const design = JSON.parse(readFileSync(new URL('../docs/design/map-trunk-annex.json', import.meta.url), 'utf8')) as unknown;
    expect(data).toEqual(design);
  });

  it('builds 12 doors from the design openings, with their widths and centres', () => {
    const want = OPENINGS.filter((o) => o.type === 'door1' || o.type === 'door2' || o.type === 'gate');
    expect(want.length).toBe(12);
    expect(b.anchors.doors.length).toBe(12);
    for (const o of want) {
      const d = b.anchors.doors.find((q) => q.width === o.w && Math.abs((Math.abs(Math.sin(q.yaw)) > 0.5 ? q.hinge.x : q.hinge.z) + q.width / 2 - o.c) < 1e-6);
      expect(d, `door ${o.id}`).toBeDefined();
      expect(d!.height).toBe(2.1);
    }
  });
});

describe('Trunk Annex T1: doors on the nav grid', { timeout: 60000 }, () => {
  // probe distance and storey for the openings whose far side is a stair (the fire stair's treads, the S1 top)
  const PROBE: Record<string, { d?: number; yIn?: number; yOut?: number }> = {
    FD1: { d: 0.9, yIn: Number.NaN },
    FD3: { d: 0.9, yIn: TRUNK_Y.roof },
    SO: { d: 0.3 },
  };
  for (const o of OPENINGS.filter((p) => ['door1', 'door2', 'wide', 'gate'].includes(p.type))) {
    it(`${o.id} (${o.type}, ${o.w} m) joins the cells on both sides, straight through`, () => {
      const pr = PROBE[o.id] ?? {};
      const d = pr.d ?? 1.6;
      const y = Y[o.level]!;
      const [a, c]: [[number, number], [number, number]] = o.axis === 'z' ? [[o.c, o.at - d], [o.c, o.at + d]] : [[o.at - d, o.c], [o.at + d, o.c]];
      // SO: the far side is the stair's top landing, the near side the Test room floor
      const west = o.id === 'SO' ? [-6 - 1.6, o.c] as [number, number] : a;
      const east = o.id === 'SO' ? [-5.75, o.c] as [number, number] : c;
      const r = pathBetween([west[0], west[1], y], [east[0], east[1], pr.yIn ?? y], grid, 20000);
      expect(r, `${o.id}: path from ${west} to ${east}`).not.toBeNull();
      expect(r!.len, `${o.id}: the path goes through the opening, not round`).toBeLessThan(Math.hypot(east[0] - west[0], east[1] - west[1]) * 1.6 + 1.5);
    });
  }

  it('a 1.2 m door at an odd centre (x = 12.3, 3.7, -7.1, ...) is reachable from both sides', () => {
    for (const cx of [12.3, 3.7, -7.1, 0.1, -13.9, 17.05]) {
      const m = new LevelBuilder();
      m.perimeter(-18.5, 18.5, -17.5, 14.5, 8, '#777');
      m.floor(0, -1.5, 37, 32, '#666', 0, 0.3);
      const t = 0.3;
      const x0 = cx - 0.6;
      const x1 = cx + 0.6;
      m.box((-18.5 + x0) / 2, 1.5, 0, x0 + 18.5, 3, t, '#888');
      m.box((x1 + 18.5) / 2, 1.5, 0, 18.5 - x1, 3, t, '#888');
      const g = navFor(m, [cx, -3]);
      const r = pathBetween([cx, -3, 0], [cx, 3, 0], g, 20000);
      expect(r, `door centre ${cx}`).not.toBeNull();
      expect(r!.len).toBeLessThan(8);
    }
  });

  it('door spacing (scale sheet 5): no door within 1.5 m of a wall corner, 3.0 m between door centres on one wall', () => {
    // wall corners and T-junctions along each wall line (the sealed roller door RD counts as a corner pair)
    const J: Record<string, number[]> = {
      'G:z:-14': [-18, 18],
      'G:z:-7': [-18, -14, -11, -6, 6, 13, 18],
      'G:x:-6': [-7, 2.5, 14],
      'G:x:6': [-7, 4, 14],
      'G:z:4': [6, 18],
      'U:x:-6': [-7, 2.5, 14],
      'R:z:-2.5': [13, 18],
    };
    const doors = OPENINGS.filter((o) => ['door1', 'door2', 'gate'].includes(o.type));
    for (const o of doors) {
      const js = J[`${o.level}:${o.axis}:${o.at}`];
      expect(js, `${o.id}: wall ${o.level}:${o.axis}:${o.at}`).toBeDefined();
      const lo = o.c - o.w / 2;
      const hi = o.c + o.w / 2;
      for (const j of js!) {
        const gapToCorner = j <= lo ? lo - j : j >= hi ? j - hi : 0;
        expect(gapToCorner, `${o.id} to the corner at ${j}`).toBeGreaterThanOrEqual(1.5 - 1e-9);
      }
    }
    const walls = new Map<string, Opening[]>();
    for (const o of OPENINGS.filter((p) => !['sealed', 'mesh'].includes(p.type))) {
      const k = `${o.level}:${o.axis}:${o.at}`;
      walls.set(k, [...(walls.get(k) ?? []), o]);
    }
    for (const [k, list] of walls) {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) expect(Math.abs(list[i]!.c - list[j]!.c), `${k}: ${list[i]!.id} / ${list[j]!.id}`).toBeGreaterThanOrEqual(3.0 - 1e-9);
    }
  });
});

describe('Trunk Annex T1: reachability from spawn 2', { timeout: 60000 }, () => {
  const rooms = layout.rooms ?? [];
  const room = (id: string) => rooms.find((r) => r.id === id)!;

  it('lists the twelve spaces (the generator room and the roof also get a room for the part the fire stair carve leaves)', () => {
    for (const s of data.spaces) expect(room(s.id), s.id).toBeDefined();
    expect(rooms.length).toBe(14);
    expect(rooms.map((r) => r.id).filter((id) => id.endsWith('-e'))).toEqual(['gen-e', 'roof-e']);
  });

  it('every player spawn has a floor under it', () => {
    for (const s of spawns) expect(surfacesAt(b, s.pos.x, s.pos.z).some((q) => Math.abs(q.h - s.pos.y) < 0.05), `spawn ${s.pos.x},${s.pos.z}`).toBe(true);
  });

  it('every space centre is reachable from spawn 2 (ES, GL, R1, RL, S1 and FS included; D1 is not built)', () => {
    for (const s of data.spaces) {
      const r = room(s.id);
      const y = Y[s.level]!;
      const cx = (r.minX + r.maxX) / 2;
      const cz = (r.minZ + r.maxZ) / 2;
      const i = grid.nearestWalkable(cx, cz, 6, y);
      expect(i, `${s.id} has a walkable cell near its centre`).toBeGreaterThanOrEqual(0);
      const [x, z] = grid.center(i);
      expect(Math.hypot(x - cx, z - cz), `${s.id}: walkable cell within 3 m of the centre`).toBeLessThan(3);
      // the fire stair's ground-level centre is on a flight: anywhere from the foot to the first landing
      expect(Math.abs(grid.height[i]! - y), `${s.id}: on its own storey`).toBeLessThan(s.id === 'fs' ? 2.3 : 0.45);
      expect(grid.findPath([s2.x, s2.z], [x, z], SEARCH, s2.y, grid.height[i]!), `${s.id} reachable`).not.toBeNull();
    }
  });

  it('both objectives, both exits and all four spawns are reachable from spawn 2', () => {
    const targets: [string, [number, number, number]][] = [
      ['O1', [data.objectives[0]!.x, data.objectives[0]!.z, 3.3]],
      ['O2', [data.objectives[1]!.x, data.objectives[1]!.z, 0]],
      ['E1', [data.extraction[0]!.x, data.extraction[0]!.z, 0]],
      ['E2', [data.extraction[1]!.x, data.extraction[1]!.z, 0]],
      ...spawns.map((s, k): [string, [number, number, number]] => [`S${k + 1}`, [s.pos.x, s.pos.z, 0]]),
    ];
    for (const [id, [x, z, y]] of targets) reach([s2.x, s2.z, 0], [x, z, y], id);
  });

  it('every spawn reaches both objectives and both exits (any player can start anywhere)', () => {
    for (const [k, s] of spawns.entries()) {
      reach([s.pos.x, s.pos.z, 0], [data.objectives[0]!.x, data.objectives[0]!.z, 3.3], `S${k + 1} to O1`);
      reach([s.pos.x, s.pos.z, 0], [data.objectives[1]!.x, data.objectives[1]!.z, 0], `S${k + 1} to O2`);
      reach([s.pos.x, s.pos.z, 0], [data.extraction[0]!.x, data.extraction[0]!.z, 0], `S${k + 1} to E1`);
      reach([s.pos.x, s.pos.z, 0], [data.extraction[1]!.x, data.extraction[1]!.z, 0], `S${k + 1} to E2`);
    }
  });

  it('both objectives reach both exits (the run can end from either site)', () => {
    for (const o of [[data.objectives[0]!.x, data.objectives[0]!.z, 3.3], [data.objectives[1]!.x, data.objectives[1]!.z, 0]] as [number, number, number][]) {
      for (const e of data.extraction) reach(o, [e.x, e.z, 0], `${o} to ${e.id}`);
    }
    reach([data.objectives[0]!.x, data.objectives[0]!.z, 3.3], [data.objectives[1]!.x, data.objectives[1]!.z, 0], 'O1 to O2');
  });

  // walkthrough routes from `map-trunk-annex.md` section m, hop by hop (waypoints are floor points on a storey)
  const G = TRUNK_Y.ground;
  const U = TRUNK_Y.upper;
  const R = TRUNK_Y.roof;
  const S2: [number, number, number] = [s2.x, s2.z, G];
  const O1: [number, number, number] = [data.objectives[0]!.x, data.objectives[0]!.z, U];
  const O2: [number, number, number] = [data.objectives[1]!.x, data.objectives[1]!.z, G];

  it('route O1-A (stair): PD, Goods-in, WO1, hall, S1 up, SO, O1', () => {
    route('O1-A', [S2, [-8.5, -5.5, G], [-4, 0.5, G], [-4, -2.5, G], [3.2, -5.75, G], [-1.85, -5.75, 1.65], [-7.5, -5.75, U], O1]);
  });
  it('route O1-B (roof and gallery): RL up, the roof, GL down, the gallery, DT2, O1', () => {
    route('O1-B', [[spawns[0]!.pos.x, spawns[0]!.pos.z, G], [-16.5, -9, G], [-16.5, -6.4, R], [-10, 0, R], [-5, 13.7, R], [-5, 12.2, U], [-4.25, 4, U], [-4.25, 0, U], [-8, 0, U], O1]);
  });
  it('route O1-C (riser R1, hidden): PD, the Goods-in south-west corner, R1 up, O1', () => {
    route('O1-C', [S2, [-8.5, -5.5, G], [-13, -6, G], [-15.1, -6, G], [-16.2, -6, U], O1]);
  });
  it('route O2-A (hall and cage door): O1, S1 down, the hall, CH, the apron, O2', () => {
    route('O2-A', [O1, [-7.5, -5.75, U], [-1.85, -5.75, 1.65], [3.2, -5.75, G], [3, -2.5, G], [3, 7.5, G], [8, 7.5, G], [12, 6, G], O2]);
  });
  it('route O2-B (yard and generator room): the south wall, GD, the generator room, GCd, the east aisle, O2', () => {
    route('O2-B', [[spawns[2]!.pos.x, spawns[2]!.pos.z, G], [4, -9, G], [10.5, -9, G], [10.5, -5.75, G], [8, -5.75, G], [8, -0.5, G], [14.5, -0.5, G], [15, 2.5, G], [15, 5.5, G], [16.5, 8, G], O2]);
  });
  it('route O2-C (roof and exhaust shaft): RL, the roof, ES down, the east aisle, O2', () => {
    route('O2-C', [[spawns[0]!.pos.x, spawns[0]!.pos.z, G], [-16.5, -9, G], [-16.5, -6.4, R], [0, -3, R], [14, 11, R], [16.5, 13.7, R], [16.5, 12.2, G], [16.5, 9, G], O2]);
  });
  it('exits EX-1 (generator room to the van) and EX-2 (hall, Goods-in, back out the lane gate side)', () => {
    route('EX-1', [O2, [16.5, 8, G], [15, 5.5, G], [15, 2.5, G], [14.5, -0.5, G], [8, -0.5, G], [8, -5.75, G], [10.5, -5.75, G], [10.5, -9, G], [data.extraction[0]!.x, data.extraction[0]!.z, G]]);
    route('EX-2', [O2, [12, 6, G], [8, 7.5, G], [3, 7.5, G], [-3, 0.5, G], [-9, 0.5, G], [-8.5, -5.5, G], [-8.5, -9, G], [data.extraction[1]!.x, data.extraction[1]!.z, G]]);
  });
  it('the fire stair: FD1, the three flights, FD3 on the roof', () => {
    // heights on the ramps: A 0.75 (z + 7), B 2.2 + 0.75 (-4.07 - z), C 4.4 + 0.75 (z + 7)
    route('FS', [[15.5, -9, G], [15.5, -6.3, 0.5], [15.5, -5.3, 1.3], [16.75, -3.5, 2.2], [16.8, -5.5, 3.3], [16.8, -6.4, 4.0], [15.5, -6.4, 4.8], [15.5, -4.6, 6.1], [15.5, -3.5, R], [15.5, -1.5, R]]);
  });

  it('every column keeps at most three surfaces (the nav grid keeps three)', () => {
    let columns = 0;
    for (let x = b.bounds.minX + CELL / 2; x < b.bounds.maxX; x += CELL) {
      for (let z = b.bounds.minZ + CELL / 2; z < b.bounds.maxZ; z += CELL) {
        const s = surfacesAt(b, x, z);
        columns++;
        expect(s.length, `column ${x},${z}`).toBeLessThanOrEqual(3);
      }
    }
    expect(columns).toBeGreaterThan(2000);
  });
});

describe('Trunk Annex T1: corridors, lanes and wall clearance', { timeout: 60000 }, () => {
  interface Seg {
    cx: number;
    cz: number;
    hx: number;
    hz: number;
    yaw: number;
    bottom: number;
    top: number;
  }
  const solids: Seg[] = [
    ...b.boxes
      .filter((p) => p.collide && Math.abs(p.pitch) < 1e-3)
      .map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: p.c[1] - p.s[1] / 2, top: p.c[1] + p.s[1] / 2 })),
    ...b.anchors.fences.map((f) => ({ cx: (f.a.x + f.b.x) / 2, cz: (f.a.z + f.b.z) / 2, hx: 0.03, hz: f.len / 2, yaw: Math.atan2(f.tx, f.tz), bottom: f.a.y, top: f.a.y + f.height })),
  ];
  const inside = (s: Seg, x: number, z: number): boolean => {
    const dx = x - s.cx;
    const dz = z - s.cz;
    const c = Math.cos(-s.yaw);
    const sn = Math.sin(-s.yaw);
    return Math.abs(c * dx + sn * dz) <= s.hx && Math.abs(-sn * dx + c * dz) <= s.hz;
  };
  /** Is something standing-high over the floor at height y in the way at (x, z)? (steps up to 0.45 m and overhead pieces are not.) */
  const blocked = (x: number, z: number, y: number): boolean => solids.some((s) => s.top > y + 0.45 && s.bottom < y + 1.6 && inside(s, x, z));

  it('every corridor and lane is at least 3.0 m wide across its short side (1.5 m at each end excluded: shafts, jambs, junctions)', () => {
    const STEP = 0.02;
    for (const c of data.corridors) {
      const [x0, z0, x1, z1] = c.rect as [number, number, number, number];
      const y = Y[c.level]!;
      const alongX = x1 - x0 >= z1 - z0;
      const [lo, hi, a0, a1] = alongX ? [z0, z1, x0, x1] : [x0, x1, z0, z1];
      expect(hi - lo, `${c.id}: designed width`).toBeGreaterThanOrEqual(3.0);
      let worst = Infinity;
      for (let a = a0 + 1.5; a <= a1 - 1.5 + 1e-9; a += 0.5) {
        let run = 0;
        let best = 0;
        for (let t = lo + STEP / 2; t < hi; t += STEP) {
          const x = alongX ? a : t;
          const z = alongX ? t : a;
          if (blocked(x, z, y)) run = 0;
          else {
            run += STEP;
            best = Math.max(best, run);
          }
        }
        worst = Math.min(worst, best);
      }
      expect(worst, `${c.id}: narrowest free run across the short side`).toBeGreaterThanOrEqual(3.0 - 2 * STEP);
    }
  });

  it('no walkable cell is closer than 0.32 m to a wall (a standing-height solid)', () => {
    let cells = 0;
    for (let i = 0; i < grid.walk.length; i++) {
      if (!grid.walk[i]) continue;
      const [x, z] = grid.center(i % grid.cols);
      const h = grid.height[i]!;
      cells++;
      for (const s of solids) {
        if (s.top <= h + 0.45 || s.bottom >= h + 1.6) continue;
        const dx = x - s.cx;
        const dz = z - s.cz;
        const c = Math.cos(-s.yaw);
        const sn = Math.sin(-s.yaw);
        const ex = Math.max(0, Math.abs(c * dx + sn * dz) - s.hx);
        const ez = Math.max(0, Math.abs(-sn * dx + c * dz) - s.hz);
        expect(Math.hypot(ex, ez), `cell ${x},${z} at ${h.toFixed(2)}`).toBeGreaterThanOrEqual(RADIUS - 1e-6);
      }
    }
    expect(cells).toBeGreaterThan(5000);
  });
});

describe('Trunk Annex T1: guards on the master clock', { timeout: 60000 }, () => {
  const loops = guardLoops();

  it('six guards: three grunts, an officer, a heavy and a sniper, at the design speeds', () => {
    expect(loops.map((g) => [g.id, g.kind, g.speed])).toEqual([['G1', 'grunt', 0.9], ['G2', 'grunt', 0.9], ['G3', 'grunt', 0.9], ['G4', 'officer', 0.85], ['G5', 'heavy', 0.75], ['G6', 'sniper', 0.85]]);
    const slots = (layout.rooms ?? []).flatMap((r) => r.squad ?? []);
    expect(slots.length).toBe(6);
  });

  it('every loop takes 40 s (within 0.3 s), the sniper included', () => {
    for (const g of loops) expect(Math.abs(g.period - 40), `${g.id} period ${g.period}`).toBeLessThan(0.3);
    expect(Math.abs(loopPeriod(loops[5]!.wps, loops[5]!.speed) - 40)).toBeLessThan(0.3);
  });

  it('arrival times match the design tables', () => {
    const want: Record<string, number[]> = {
      G1: [0, 19.6],
      G2: [0, 6.2, 18.3, 27.2],
      G3: [0, 6.2, 18.3, 27.2],
      G4: [0, 10.3, 13.7, 20.1, 29.5, 32.9],
      G5: [0, 10.8, 17.3, 26.1],
      G6: [0, 12.5, 23.0],
    };
    for (const g of loops) {
      const got = loopArrivals(g.wps, g.speed);
      want[g.id]!.forEach((t, i) => expect(Math.abs(got[i]! - t), `${g.id} waypoint ${i}`).toBeLessThan(0.1));
    }
  });

  it('every waypoint and every start position is a walkable cell on the guard\'s storey', () => {
    for (const g of loops) {
      const y = TRUNK_Y[g.level];
      for (const [i, w] of g.wps.entries()) {
        const c = cellAt(w.x, w.z, y, 1);
        expect(c, `${g.id} wp ${i} at ${w.x},${w.z}`).toBeGreaterThanOrEqual(0);
        const [cx, cz] = grid.center(c);
        expect(Math.hypot(cx - w.x, cz - w.z), `${g.id} wp ${i}: cell centre close`).toBeLessThan(0.75);
        expect(Math.abs(grid.height[c]! - y)).toBeLessThan(0.3);
      }
      const s = guardSlot(g);
      const c = cellAt(s.x, s.z, y, 1);
      expect(c, `${g.id} start ${s.x},${s.z}`).toBeGreaterThanOrEqual(0);
    }
  });

  it('every leg between waypoints is walkable on the grid, without a detour', () => {
    for (const g of loops) {
      const y = TRUNK_Y[g.level];
      const n = g.wps.length;
      const legs = n === 2 ? [[0, 1]] : g.wps.map((_, i) => [i, (i + 1) % n]);
      for (const [a, c] of legs as [number, number][]) {
        const p = g.wps[a]!;
        const q = g.wps[c]!;
        if (Math.hypot(q.x - p.x, q.z - p.z) < 0.01) continue;
        const r = pathBetween([p.x, p.z, y], [q.x, q.z, y], grid, 20000);
        expect(r, `${g.id} leg ${a} -> ${c}`).not.toBeNull();
        expect(r!.len, `${g.id} leg ${a} -> ${c}: no detour`).toBeLessThan(Math.hypot(q.x - p.x, q.z - p.z) * 1.35 + 1.5);
      }
    }
  });

  it('a guard starts where its loop is when the clock starts (arrives at waypoint 0 at master time = phase)', () => {
    const g2 = loops[1]!;
    const s = guardSlot(g2);
    const st = loopStateAt(g2.wps, g2.speed, -g2.phase);
    expect([s.x, s.z]).toEqual([st.x, st.z]);
    expect(s.start).toEqual({ idx: st.idx, wait: st.wait });
    const at = loopStateAt(g2.wps, g2.speed, g2.phase - g2.phase);
    expect(at.idx).toBe(0);
    // G1 (phase 0) is at its door check at master time 0, facing north
    const s1 = guardSlot(loops[0]!);
    expect([s1.x, s1.z]).toEqual([-7.5, -8.5]);
    expect(s1.yaw).toBeCloseTo(0, 6);
  });

  it('the patrol walker follows the schedule: pauses until the planned departure, loops on the clock (no drift)', () => {
    for (const g of loops) {
      const s = guardSlot(g);
      const w = new PatrolWalker({ points: s.route!, waits: s.waits, faces: s.faces, start: s.start, loop: s.loop }, s.x, s.z, s.yaw);
      // a point-mass guard at the design speed, driven by the walker for 5 loops; record arrivals at waypoint 0
      let x = s.x;
      let z = s.z;
      const dt = 0.05;
      const arrivals: number[] = [];
      // a waypoint no other waypoint shares (G2 and G3 pass the break-room door twice a loop)
      const u = Math.max(0, g.wps.findIndex((w, i) => g.wps.every((o, j) => j === i || Math.hypot(o.x - w.x, o.z - w.z) > 1)));
      let atZero = false;
      for (let t = 0; t < g.period * 5; t += dt) {
        w.tick(dt);
        const tgt = w.step(dt, x, z);
        if (tgt) {
          const d = Math.hypot(tgt[0] - x, tgt[1] - z);
          const m = Math.min(d, g.speed * dt);
          x += ((tgt[0] - x) / d) * m;
          z += ((tgt[1] - z) / d) * m;
        }
        const near = Math.hypot(g.wps[u]!.x - x, g.wps[u]!.z - z) < 0.5;
        if (near && !atZero) arrivals.push(t);
        atZero = near;
      }
      // G6 stands still at one point: every waypoint is the same place
      if (g.id === 'G6') continue;
      expect(arrivals.length, `${g.id} reaches a waypoint once a loop`).toBeGreaterThanOrEqual(4);
      // (the first "arrival" is the start itself; later ones repeat every period)
      for (let i = 2; i < arrivals.length; i++) expect(Math.abs(arrivals[i]! - arrivals[i - 1]! - g.period), `${g.id} loop ${i}`).toBeLessThan(0.3);
      const mean = (arrivals[arrivals.length - 1]! - arrivals[1]!) / (arrivals.length - 2);
      expect(Math.abs(mean - g.period), `${g.id} mean loop`).toBeLessThan(0.15);
    }
  });

  it('planned departures are arrival plus pause', () => {
    const g = loops[0]!;
    expect(loopLeave(g).map((t) => +t.toFixed(1))).toEqual([4.5, 24.9]);
  });
});
