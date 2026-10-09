import { describe, expect, it } from 'vitest';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { LevelBuilder } from '../src/world/levelBuilder';
import { exchange, EXCHANGE_Y } from '../src/world/maps/exchange';
import { roomAt, roomCentre } from '../src/world/rooms';

/** Standing room a guard needs over a surface (`navBuild.ts`). */
const HEADROOM = 1.7;
const CELL = 0.5;

interface Piece {
  bottom: number;
  top: number;
  ramp: boolean;
}

/** The solid pieces over (x, z): flat boxes by footprint, ramps (pitched boxes, as `LevelBuilder.ramp` builds them) by slope. */
function piecesAt(b: LevelBuilder, x: number, z: number): Piece[] {
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
function surfacesAt(b: LevelBuilder, x: number, z: number): { h: number; ramp: boolean }[] {
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
function navFor(b: LevelBuilder, seed: [number, number]): NavGrid {
  const blockers: NavBlocker[] = [];
  for (const p of b.boxes) {
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
    seed,
    sample: () => ({ h: 0, ok: false }),
    sampleLayers: (x, z): NavSample[] => surfacesAt(b, x, z).map((s) => ({ h: s.h, ok: true })),
  });
}

describe('Kestrel Exchange S1a: cable tunnel, ground floor, stair core', () => {
  const { b, layout } = build();
  const spawn = layout.playerSpawns[0]!.pos;
  const rooms = layout.rooms ?? [];
  const room = (id: string) => rooms.find((r) => r.id === id)!;

  it('lists the four rooms and the operator starts in the cable room', () => {
    for (const id of ['cable', 'mdf', 'power', 'well']) expect(room(id), id).toBeDefined();
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

  const grid = navFor(b, [spawn.x, spawn.z]);
  const floors: Record<string, number> = { cable: EXCHANGE_Y.basement, mdf: EXCHANGE_Y.ground, power: EXCHANGE_Y.ground, well: EXCHANGE_Y.ground };

  it('every room centre is reachable from the first spawn over the nav grid', () => {
    for (const id of Object.keys(floors)) {
      const [cx, cz] = roomCentre(room(id));
      const y = floors[id]!;
      const i = grid.nearestWalkable(cx, cz, 6, y);
      expect(i, `${id} has a walkable cell near its centre`).toBeGreaterThanOrEqual(0);
      const [x, z] = grid.center(i);
      expect(Math.hypot(x - cx, z - cz), `${id}: walkable cell within 3 m of the centre`).toBeLessThan(3);
      expect(Math.abs(grid.height[i]! - y), `${id}: on its own storey`).toBeLessThan(0.6);
      const path = grid.findPath([spawn.x, spawn.z], [x, z], 60000, spawn.y, y);
      expect(path, `${id} reachable`).not.toBeNull();
    }
  });

  it('the main stair reaches the first floor (y 4.5) and the basement stair joins the chamber to the fire door', () => {
    const landing: [number, number] = [9, -7.3];
    const i = grid.nearestWalkable(landing[0], landing[1], 4, EXCHANGE_Y.first);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(Math.abs(grid.height[i]! - EXCHANGE_Y.first)).toBeLessThan(0.1);
    expect(grid.findPath([spawn.x, spawn.z], landing, 60000, spawn.y, EXCHANGE_Y.first)).not.toBeNull();
    // the fire door's threshold at ground, reached from the tunnel
    const door = grid.nearestWalkable(-23, 5.2, 3, EXCHANGE_Y.ground);
    expect(Math.abs(grid.height[door]!)).toBeLessThan(0.1);
    expect(grid.findPath([spawn.x, spawn.z], grid.center(door), 60000, spawn.y, EXCHANGE_Y.ground)).not.toBeNull();
  });

  it('MDF hall: two aisles and the cross aisle stay open (the guard-free routes of the playtest)', () => {
    // west aisle (x -22.5), the 2.4 m aisle at x -16.5 and the north cross aisle (z 16.2)
    for (const [x, z] of [[-22.5, 8], [-16.5, 10], [-13.5, 10], [-16, 16.2], [-9, 16.2]] as const) {
      const i = grid.nearestWalkable(x, z, 1, EXCHANGE_Y.ground);
      expect(i, `aisle point ${x},${z}`).toBeGreaterThanOrEqual(0);
    }
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
    expect(b.anchors.doors.length).toBeGreaterThanOrEqual(20);
    for (const d of b.anchors.doors) {
      expect(d.width).toBe(1);
      expect(d.height).toBe(2.1);
      const centre = Math.abs(Math.sin(d.yaw)) > 0.5 ? d.hinge.x + d.width / 2 : d.hinge.z + d.width / 2;
      expect(Math.abs(centre * 2 - Math.round(centre * 2)), `door at ${d.hinge.x},${d.hinge.z}`).toBeLessThan(1e-6);
    }
  });
});
