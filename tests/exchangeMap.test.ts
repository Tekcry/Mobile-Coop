import { describe, expect, it } from 'vitest';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { navLinks } from '../src/ai/navBuild';
import { LevelBuilder } from '../src/world/levelBuilder';
import { exchange, EXCHANGE_Y } from '../src/world/maps/exchange';
import { roomAt, roomCentre } from '../src/world/rooms';

/** Standing room a guard needs over a surface (`navBuild.ts`). */
const HEADROOM = 1.7;
const CELL = 0.5;
/** Expansions the nav search may use: the heuristic ignores storeys, so a path over a stair and a roof needs far more than the default. */
const SEARCH = 3000000;

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
  // overlapping pieces with one top (a wall corner, a lintel) are one surface
  return out.filter((s, k) => k === 0 || s.h - out[k - 1]!.h > 0.05);
}

function build(): { b: LevelBuilder; layout: ReturnType<typeof exchange.build> } {
  const b = new LevelBuilder();
  const layout = exchange.build(b, 1);
  return { b, layout };
}

/** The nav grid `navBuild.ts` makes (same cell, radius, step and blockers), with the surfaces sampled analytically. */
function navFor(b: LevelBuilder, seed: [number, number], skip: (p: LevelBuilder['boxes'][number]) => boolean = () => false): NavGrid {
  const view: Boxes = { boxes: b.boxes.filter((p) => !skip(p)) };
  const blockers: NavBlocker[] = [];
  for (const p of view.boxes) {
    if (!p.collide || Math.abs(p.pitch) > 1e-3 || p.overhead) continue;
    blockers.push({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: p.c[1] - p.s[1] / 2, top: p.c[1] + p.s[1] / 2 });
  }
  for (const c of b.cylinders) {
    if (c.collide) blockers.push({ cx: c.c[0], cz: c.c[2], hx: c.r, hz: c.r, yaw: 0, bottom: c.c[1] - c.h / 2, top: c.c[1] + c.h / 2, round: true });
  }
  return new NavGrid({
    minX: b.bounds.minX,
    maxX: b.bounds.maxX,
    minZ: b.bounds.minZ,
    maxZ: b.bounds.maxZ,
    cell: CELL,
    agentRadius: 0.32,
    stepHeight: 0.45,
    blockers,
    links: navLinks(b),
    seed,
    sample: () => ({ h: 0, ok: false }),
    sampleLayers: (x, z): NavSample[] => surfacesAt(view, x, z).map((s) => ({ h: s.h, ok: true })),
  });
}

describe('Kestrel Exchange layout v2 R1: basement and ground floor', () => {
  const { b, layout } = build();
  const spawn = layout.playerSpawns[0]!.pos;
  const rooms = layout.rooms ?? [];
  const room = (id: string) => rooms.find((r) => r.id === id)!;
  const grid = navFor(b, [spawn.x, spawn.z]);
  const BASEMENT = ['cable', 'rectifier', 'battery', 'genroom', 'boiler', 'riserbase'];
  const GROUND = ['mdf', 'test', 'transmission', 'foyer', 'security', 'canteen', 'meeting', 'cleaners', 'goodsin', 'workshop', 'well'];
  const reach = (from: [number, number, number], to: [number, number, number], label: string): void => {
    const a = grid.nearestWalkable(from[0], from[1], 1, from[2]);
    const i = grid.nearestWalkable(to[0], to[1], 1, to[2]);
    expect(a, `${label}: walkable at ${from}`).toBeGreaterThanOrEqual(0);
    expect(i, `${label}: walkable at ${to}`).toBeGreaterThanOrEqual(0);
    expect(Math.abs(grid.height[i]! - to[2]), `${label}: on its storey at ${to}`).toBeLessThan(0.3);
    expect(grid.findPath(grid.center(a), grid.center(i), SEARCH, grid.height[a]!, to[2]), `${label}: ${from} to ${to}`).not.toBeNull();
  };
  const route = (label: string, pts: [number, number, number][]): void => {
    for (let k = 1; k < pts.length; k++) reach(pts[k - 1]!, pts[k]!, `${label} hop ${k}`);
  };

  it('lists the basement, ground and yard rooms; the operator starts in the cable room', () => {
    for (const id of [...BASEMENT, ...GROUND, 'yard']) expect(room(id), id).toBeDefined();
    expect(rooms[roomAt(rooms, spawn.x, spawn.z, spawn.y)]?.id).toBe('cable');
    expect(exchange.modes).toEqual(['infiltration', 'sandbox']);
    expect(exchange.theme.lightLevel).toBe(0.1);
    expect(layout.playerSpawns.length).toBe(4);
  });

  it('every player spawn has a floor under it and standing room', () => {
    for (const s of layout.playerSpawns) {
      const surf = surfacesAt(b, s.pos.x, s.pos.z).map((q) => q.h);
      expect(surf.some((h) => Math.abs(h - s.pos.y) < 0.05), `spawn ${s.pos.x},${s.pos.z}`).toBe(true);
    }
  });

  it('every basement and ground room centre is reachable from the first spawn', () => {
    for (const id of [...BASEMENT, ...GROUND]) {
      const y = BASEMENT.includes(id) ? EXCHANGE_Y.basement : EXCHANGE_Y.ground;
      const [cx, cz] = roomCentre(room(id));
      const i = grid.nearestWalkable(cx, cz, 6, y);
      expect(i, `${id} has a walkable cell near its centre`).toBeGreaterThanOrEqual(0);
      const [x, z] = grid.center(i);
      expect(Math.hypot(x - cx, z - cz), `${id}: walkable cell within 3 m of the centre`).toBeLessThan(3);
      expect(Math.abs(grid.height[i]! - y), `${id}: on its own storey`).toBeLessThan(0.6);
      expect(grid.findPath([spawn.x, spawn.z], [x, z], SEARCH, spawn.y, y), `${id} reachable`).not.toBeNull();
    }
  });

  const BY = EXCHANGE_Y.basement;
  const GY = EXCHANGE_Y.ground;
  const S: [number, number, number] = [spawn.x, spawn.z, BY];

  it('route A1 holds hop by hop: spawn, C shaft, MDF hall, test room', () => {
    route('A1', [S, [-18, 7.5, BY], [-22.6, 2.2, BY], [-22.6, 0.6, GY], [-15, 9, GY], [-15, -3, GY]]);
  });

  it('route A2 holds hop by hop: spawn, chamber, basement spine, B stair, ground spine, test room', () => {
    route('A2', [S, [-18, 7.5, BY], [-4.75, 6, BY], [-4.75, -10.5, BY], [-3, -10.8, BY], [-3, -16.9, GY], [-4.75, -12, GY], [-4.75, -4, GY], [-15, -3, GY]]);
  });

  it('route A3 holds hop by hop: spawn, chamber, rectifier, battery hall, V up to the transmission room, test room', () => {
    route('A3', [S, [-18, 7.5, BY], [-15, -3, BY], [-15, -12, BY], [-7.0, -17.0, BY], [-7.0, -11.5, GY], [-9, -12, GY], [-15, -7, GY], [-15, -3, GY]]);
  });

  it('the ground floor links: cross corridor, ring, foyer, security, canteen, goods-in, M hall, workshop, court, riser strip, yard doors', () => {
    route('ground', [[-4.75, -4, GY], [-4.75, 0, GY], [0, 0, GY], [4.5, 0, GY], [4.5, 7.5, GY], [5, 10, GY], [8, 10, GY], [8, 7.5, GY], [14, 7.5, GY], [14, 10, GY], [19.5, 7.5, GY], [19.5, 0, GY], [19.5, -7, GY], [19.5, -10, GY], [19.5, -16.5, GY], [20.5, -19, GY]]);
    route('ring', [[4.5, 0, GY], [8, 0, GY], [4.5, -7, GY], [12.5, -7, GY], [13.5, -10, GY], [15, -16, GY], [13, -13.5, GY], [8, -13.5, GY], [9.5, -19, GY]]);
    route('misc', [[0, 1, GY], [0, 4, GY], [-2.5, 10, GY], [-2.5, 5.5, GY], [0.5, 12, GY], [21.5, -3, GY], [22.5, 5.5, GY]]);
  });

  it('the basement links: genroom, boiler, service tunnel, riser base, plant ramp, coke stair, R riser up to ground', () => {
    route('basement', [[-4.75, -10.5, BY], [-4.75, -0.5, BY], [10, 0, BY], [21.5, 0, BY], [22, 0.2, BY], [22, 5.5, GY], [20, 5.5, GY]]);
    route('plant', [[-3, -10, BY], [0, -13, BY], [8, -10.5, BY], [4, -17, BY], [4, -24, -1.5], [4, -29.8, GY]]);
    route('coke', [[14, -10.5, BY], [15.5, -17, BY], [15.5, -21, -1.5], [15.5, -23, GY]]);
  });

  it('MDF hall: three lanes stay open', () => {
    for (const [x, z] of [[-16, 3], [-16, 9], [-16, 15]] as const) expect(grid.nearestWalkable(x, z, 0.6, GY), `lane at ${x},${z}`).toBeGreaterThanOrEqual(0);
  });

  it('no two walkable surfaces closer than 2.4 m in one column, except under and over stair runs', () => {
    const bad: string[] = [];
    const ramps = b.boxes.filter((p) => p.collide && Math.abs(p.pitch) > 1e-3);
    const nearRamp = (x: number, z: number): boolean =>
      ramps.some((p) => {
        const dx = x - p.c[0];
        const dz = z - p.c[2];
        const fx = Math.sin(p.yaw);
        const fz = Math.cos(p.yaw);
        const a = dx * fx + dz * fz;
        const l = dx * fz - dz * fx;
        return Math.abs(l) <= p.s[0] / 2 + 0.3 && Math.abs(a) <= (p.s[2] * Math.cos(Math.abs(p.pitch))) / 2 + 0.3;
      });
    let columns = 0;
    for (let x = b.bounds.minX + CELL / 2; x < b.bounds.maxX; x += CELL) {
      for (let z = b.bounds.minZ + CELL / 2; z < b.bounds.maxZ; z += CELL) {
        const s = surfacesAt(b, x, z);
        columns++;
        for (let k = 1; k < s.length; k++) {
          if (s[k]!.h - s[k - 1]!.h < 2.4 && !s[k]!.ramp && !s[k - 1]!.ramp && !nearRamp(x, z)) bad.push(`${x.toFixed(2)},${z.toFixed(2)}: ${s[k - 1]!.h.toFixed(2)} -> ${s[k]!.h.toFixed(2)}`);
        }
        // at most three surfaces per column (the nav grid keeps three)
        expect(s.length, `column ${x},${z}`).toBeLessThanOrEqual(3);
      }
    }
    expect(columns).toBeGreaterThan(1000);
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it('doors are 1.0 x 2.1 and sit on half-metre centres (they line up with the nav cells)', () => {
    expect(b.anchors.doors.length).toBeGreaterThanOrEqual(45);
    for (const d of b.anchors.doors) {
      expect(d.width).toBe(1);
      expect(d.height).toBe(2.1);
      const centre = Math.abs(Math.sin(d.yaw)) > 0.5 ? d.hinge.x + d.width / 2 : d.hinge.z + d.width / 2;
      expect(Math.abs(centre * 2 - Math.round(centre * 2)), `door at ${d.hinge.x},${d.hinge.z}`).toBeLessThan(1e-6);
    }
  });
});
