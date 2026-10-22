import { describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { Interactables, type Interactable } from '../src/game/interactables';
import { BOLT_DEPTH, BOLT_DOOR_W, BOLT_REACH, BOLT_SIDE_MARGIN, SectorBolts, boltById, boltHalfSpan, boltItemId, checkSectors, inBoltReach, onBoltSide, type SectorBolt, type SectorDef } from '../src/game/sectors';
import { WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';
import { LevelBuilder } from '../src/world/levelBuilder';
import { warehouseOps } from '../src/world/maps/warehouseOps';

/** (sector-fixes-r RT) Team doors in Sector Ops: the course's B2 bolt rule, host-authoritative. */

const pose = { x: 0, y: 0, z: 0, yaw: 0 };
const sec = (id: string, bolts?: SectorDef['bolts']): SectorDef => ({
  id,
  name: id,
  start: pose,
  objective: { kind: 'hack', label: 'x', x: 0, y: 0, z: 0, yaw: 0 },
  guards: [],
  reinforce: [],
  perStage: 2,
  routes: [],
  bolts,
});
// section 0: one door at (10, 5) unbolted from +x; section 1: two doors, from -z and +z
const DEFS: SectorDef[] = [
  sec('a', [{ at: [10, 5], side: [1, 0] }]),
  sec('b', [
    { at: [0, 0], side: [0, -1] },
    { at: [4, 4], side: [0, 1] },
  ]),
  sec('c'),
];

describe('side test (course F7: feet past the door plane)', () => {
  const b = { at: [10, 5] as const, side: [1, 0] as const };
  it('any feet past the plane count, the plane and the near side do not', () => {
    expect(onBoltSide(b, 10.05, 5)).toBe(true);
    expect(onBoltSide(b, 11.2, 3)).toBe(true);
    expect(onBoltSide(b, 10, 5)).toBe(false);
    expect(onBoltSide(b, 9.9, 5)).toBe(false);
  });
});

describe('SectorBolts', () => {
  it('starts shut; the near side cannot unbolt, the bolt side can, once', () => {
    const s = new SectorBolts(DEFS);
    expect(s.shut).toEqual([[true], [true, true], []]);
    expect(s.use(0, 0, 9.2, 5)).toBe(false);
    expect(s.isShut(0, 0)).toBe(true);
    expect(s.use(0, 0, 10.8, 5)).toBe(true);
    expect(s.isShut(0, 0)).toBe(false);
    expect(s.use(0, 0, 10.8, 5)).toBe(false);
  });

  it('a bad index is refused', () => {
    const s = new SectorBolts(DEFS);
    expect(s.use(2, 0, 0, 0)).toBe(false);
    expect(s.use(5, 0, 0, 0)).toBe(false);
    expect(s.use(1, 7, 0, 0)).toBe(false);
  });

  it('a section restart bolts its doors again (only its own)', () => {
    const s = new SectorBolts(DEFS);
    expect(s.use(0, 0, 11, 5)).toBe(true);
    expect(s.use(1, 1, 4, 5)).toBe(true);
    expect(s.use(1, 0, 0, 1)).toBe(false);
    expect(s.rebolt(1)).toEqual([1]);
    expect(s.isShut(1, 1)).toBe(true);
    expect(s.isShut(0, 0)).toBe(false);
    expect(s.rebolt(1)).toEqual([]);
    expect(s.rebolt(9)).toEqual([]);
  });
});

describe('the client request path (mirrored item -> use -> host side test)', () => {
  it('the item id names the bolt both ways; it sorts with the course devices (c-)', () => {
    const id = boltItemId(1, 1);
    expect(id.startsWith('c-')).toBe(true);
    expect(boltById(DEFS, id)).toEqual({ sec: 1, k: 1, bolt: DEFS[1]!.bolts![1] });
    expect(boltById(DEFS, boltItemId(0, 3))).toBeNull();
    expect(boltById(DEFS, 'c-g-s2')).toBeNull();
    expect(boltById(undefined, id)).toBeNull();
  });

  it("the host unbolts on a client's use only with the client's feet on the bolt side", () => {
    const s = new SectorBolts(DEFS);
    // the client's `use` arrives with an item id; the host resolves it and tests the client's feet (host authority)
    const hostUse = (id: string, x: number, z: number): boolean => {
      const b = boltById(DEFS, id);
      return !!b && s.use(b.sec, b.k, x, z);
    };
    const id = boltItemId(1, 0);
    expect(hostUse(id, 0, 0.8)).toBe(false);
    expect(s.isShut(1, 0)).toBe(true);
    expect(hostUse(id, 0.3, -0.6)).toBe(true);
    expect(s.isShut(1, 0)).toBe(false);
  });

  it('the item is offered on the bolt side only (Interactables.nearest, host and client mirror alike)', () => {
    const ints = new Interactables(null as never, null as never);
    const b = DEFS[0]!.bolts![0]!;
    const item: Interactable = { id: boltItemId(0, 0), kind: 'door', pos: new Vector3(b.at[0], 0, b.at[1]), label: 'Unbolt', holdTime: 0, enabled: true, done: false, progress: 0, node: null as never, parts: [], light: null, reach: BOLT_REACH, side: b.side };
    ints.items.push(item);
    expect(ints.nearest(new Vector3(10.8, 0, 5))).toBe(item);
    expect(ints.nearest(new Vector3(9.2, 0, 5))).toBeNull();
    expect(ints.nearest(new Vector3(10 + BOLT_REACH + 0.2, 0, 5))).toBeNull();
    // the side the client mirror gets from its own map data
    expect(boltById(DEFS, item.id)?.bolt.side).toEqual(b.side);
    item.enabled = false;
    expect(ints.nearest(new Vector3(10.8, 0, 5))).toBeNull();
  });
});

describe('data', () => {
  it('a zero side is refused', () => {
    expect(checkSectors([sec('x', [{ at: [0, 0], side: [0, 0] }])])).toEqual(['x: the last section has no extraction', 'x: bolt 0 side is zero']);
  });

  /** Plan distance from p to the segment a-b. */
  const segDist = (p: readonly [number, number], a: readonly [number, number], b: readonly [number, number]): number => {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const l2 = dx * dx + dz * dz;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
  };

  it('the Warehouse team doors: unit sides, and no guard post or route goes through one (guards never need them)', () => {
    expect(checkSectors(WAREHOUSE_SECTORS)).toEqual([]);
    for (const s of WAREHOUSE_SECTORS) {
      for (const b of s.bolts ?? []) {
        expect(Math.hypot(b.side[0], b.side[1])).toBeCloseTo(1, 3);
        for (const g of s.guards) {
          expect(Math.hypot(g.x - b.at[0], g.z - b.at[1]), `${s.id}: a guard post at a team door`).toBeGreaterThan(1);
          const r = g.route ?? [];
          for (let i = 0; i < r.length; i++) {
            const a = r[i]!;
            const c = r[(i + 1) % r.length]!;
            expect(segDist(b.at, a, c), `${s.id}: a guard route through the team door at ${b.at.join(', ')}`).toBeGreaterThan(0.6);
          }
        }
      }
    }
  });
});

describe('(sector-fixes-r2) the unbolt reach spans the door only, not the wall beside it', () => {
  const built = new LevelBuilder();
  warehouseOps.build(built, 0);
  const centre = (d: (typeof built.anchors.doors)[number]): [number, number] => [d.hinge.x + (Math.sin(d.yaw) * d.width) / 2, d.hinge.z + (Math.cos(d.yaw) * d.width) / 2];
  const all: { s: number; k: number; b: SectorBolt }[] = [];
  WAREHOUSE_SECTORS.forEach((d, s) => d.bolts?.forEach((b, k) => all.push({ s, k, b })));
  /** The item the mode builds (findBolts) and the client mirrors (syncItems): side, span and depth from the bolt. */
  const itemFor = (s: number, k: number, b: SectorBolt): Interactable => ({ id: boltItemId(s, k), kind: 'door', pos: new Vector3(b.at[0], 0, b.at[1]), label: 'Unbolt', holdTime: 0, enabled: true, done: false, progress: 0, node: null as never, parts: [], light: null, reach: BOLT_REACH, side: b.side, sideHalf: boltHalfSpan(b), sideDepth: BOLT_DEPTH });
  /** Host and prompt agree at (x, z): both accept or both refuse; returns the verdict. */
  const verdict = (s: number, k: number, b: SectorBolt, x: number, z: number): boolean => {
    const host = new SectorBolts(WAREHOUSE_SECTORS).use(s, k, x, z);
    const ints = new Interactables(null as never, null as never);
    const it = itemFor(s, k, b);
    ints.items.push(it);
    expect(ints.nearest(new Vector3(x, 0, z)) === it, `prompt and host disagree at (${x}, ${z})`).toBe(host);
    expect(inBoltReach(b, x, z)).toBe(host);
    return host;
  };

  it('every Warehouse team door has three bolts in all, and each w is the built door width', () => {
    expect(all.length).toBe(3);
    for (const { b } of all) {
      const door = built.anchors.doors.find((d) => Math.hypot(centre(d)[0] - b.at[0], centre(d)[1] - b.at[1]) < 0.05);
      expect(door, `door at ${b.at.join(', ')}`).toBeTruthy();
      expect(b.w, `bolt at ${b.at.join(', ')} has a width`).toBeDefined();
      expect(b.w!).toBeCloseTo(door!.width, 6);
    }
  });

  it('S1: the corridor past the mess door (through the z -10.8 wall) cannot unbolt it', () => {
    const { s, k, b } = all.find((q) => q.s === 0)!;
    expect(onBoltSide(b, 7.55, -11.15)).toBe(true);
    expect(verdict(s, k, b, 7.55, -11.15)).toBe(false);
  });

  it('each door: straight in front unbolts; just past half the door + the margin does not; nor too far out', () => {
    for (const { s, k, b } of all) {
      const tx = -b.side[1];
      const tz = b.side[0];
      const half = boltHalfSpan(b);
      expect(half).toBeCloseTo((b.w ?? BOLT_DOOR_W) / 2 + BOLT_SIDE_MARGIN, 9);
      const at = (depth: number, along: number): [number, number] => [b.at[0] + b.side[0] * depth + tx * along, b.at[1] + b.side[1] * depth + tz * along];
      expect(verdict(s, k, b, ...at(0.6, 0))).toBe(true);
      expect(verdict(s, k, b, ...at(0.6, half - 0.05))).toBe(true);
      expect(verdict(s, k, b, ...at(0.6, -(half - 0.05)))).toBe(true);
      expect(verdict(s, k, b, ...at(0.6, half + 0.05))).toBe(false);
      expect(verdict(s, k, b, ...at(0.6, -(half + 0.05)))).toBe(false);
      expect(verdict(s, k, b, ...at(BOLT_DEPTH + 0.05, 0))).toBe(false);
      expect(verdict(s, k, b, ...at(-0.6, 0))).toBe(false);
    }
  });
});
