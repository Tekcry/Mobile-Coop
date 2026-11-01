import { describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { Interactables, type Interactable } from '../src/game/interactables';
import { BOLT_DEPTH, BOLT_DOOR_W, BOLT_REACH, BOLT_SIDE_MARGIN, SectorBolts, boltById, boltHalfSpan, boltItemId, checkSectors, inBoltReach, onBoltSide, type SectorBolt, type SectorDef } from '../src/game/sectors';
import { SectorTeamDoors, type TeamDoorHost } from '../src/game/sectorTeamDoors';
import type { DoorState } from '../src/world/doors';
import type { PlayerRef } from '../src/ai/enemy';
import { WHARF_SECTORS } from '../src/world/maps/tallowWharfSectors';
import { LevelBuilder } from '../src/world/levelBuilder';
import { tallowWharf } from '../src/world/maps/tallowWharf';

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

  it('the Tallow Wharf team doors: unit sides, and no guard post or route goes through one (guards never need them)', () => {
    expect(checkSectors(WHARF_SECTORS)).toEqual([]);
    for (const s of WHARF_SECTORS) {
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
  tallowWharf.build(built, 0);
  const centre = (d: (typeof built.anchors.doors)[number]): [number, number] => [d.hinge.x + (Math.sin(d.yaw) * d.width) / 2, d.hinge.z + (Math.cos(d.yaw) * d.width) / 2];
  const all: { s: number; k: number; b: SectorBolt }[] = [];
  WHARF_SECTORS.forEach((d, s) => d.bolts?.forEach((b, k) => all.push({ s, k, b })));
  /** The item the mode builds (findBolts) and the client mirrors (syncItems): side, span and depth from the bolt. */
  const itemFor = (s: number, k: number, b: SectorBolt): Interactable => ({ id: boltItemId(s, k), kind: 'door', pos: new Vector3(b.at[0], 0, b.at[1]), label: 'Unbolt', holdTime: 0, enabled: true, done: false, progress: 0, node: null as never, parts: [], light: null, reach: BOLT_REACH, side: b.side, sideHalf: boltHalfSpan(b), sideDepth: BOLT_DEPTH });
  /** Host and prompt agree at (x, z): both accept or both refuse; returns the verdict. */
  const verdict = (s: number, k: number, b: SectorBolt, x: number, z: number): boolean => {
    const host = new SectorBolts(WHARF_SECTORS).use(s, k, x, z);
    const ints = new Interactables(null as never, null as never);
    const it = itemFor(s, k, b);
    ints.items.push(it);
    expect(ints.nearest(new Vector3(x, 0, z)) === it, `prompt and host disagree at (${x}, ${z})`).toBe(host);
    expect(inBoltReach(b, x, z)).toBe(host);
    return host;
  };

  it('every Tallow Wharf team door has bolts, and each w is the built door width', () => {
    expect(all.length).toBeGreaterThan(0);
    for (const { b } of all) {
      const door = built.anchors.doors.find((d) => Math.hypot(centre(d)[0] - b.at[0], centre(d)[1] - b.at[1]) < 0.05);
      expect(door, `door at ${b.at.join(', ')}`).toBeTruthy();
      // a bolt that states its width matches the built door (one with none uses BOLT_DOOR_W)
      if (b.w !== undefined) expect(b.w).toBeCloseTo(door!.width, 6);
    }
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

describe('mission-scoped bolt (J8 A30)', () => {
  // section 0: a bolt fitted in mission m1 only (10, 5) and a plain bolt (20, 5); section 1: a plain bolt (0, 0) and
  // one fitted in m1 and m3 (4, 4)
  const SCOPED: SectorDef[] = [
    sec('s0', [
      { at: [10, 5], side: [1, 0], missions: ['m1'] },
      { at: [20, 5], side: [1, 0] },
    ]),
    sec('s1', [
      { at: [0, 0], side: [0, -1] },
      { at: [4, 4], side: [0, 1], missions: ['m1', 'm3'] },
    ]),
  ];

  /** One fake door per bolt (its leaf along z, centred on the bolt), fake items, a nav that records its closures. */
  const world = (missionId?: string) => {
    const doors: DoorState[] = [];
    SCOPED.forEach((s) => s.bolts?.forEach((b) => doors.push({ index: doors.length, anchor: { width: 1, yaw: 0, hinge: { x: b.at[0], y: 0, z: b.at[1] - 0.5 }, locked: false } } as unknown as DoorState)));
    const doorAt = (x: number, z: number): DoorState | undefined => doors.find((d) => Math.abs(d.anchor.hinge.x - x) < 1e-6 && Math.abs(d.anchor.hinge.z + 0.5 - z) < 1e-6);
    const items: Interactable[] = [];
    const closures: { cx: number; cz: number; closed: boolean }[] = [];
    const refs: PlayerRef[] = [];
    const host: TeamDoorHost = {
      doors: { nearest: (x, z, r) => doors.find((d) => Math.hypot(d.anchor.hinge.x - x, d.anchor.hinge.z + 0.5 - z) <= r) ?? null },
      ints: {
        add: (id, kind, pos, label, holdTime, yaw = 0) => {
          const it = { id, kind, pos, label, holdTime, yaw, enabled: false, done: false, progress: 0 } as unknown as Interactable;
          items.push(it);
          return it;
        },
        setEnabled: (it, on) => {
          it.enabled = on;
        },
      },
      nav: {
        addClosure: (cx, cz) => closures.push({ cx, cz, closed: false }) - 1,
        setClosed: (id, on) => {
          closures[id]!.closed = on;
        },
      },
      lockDoor: (d, on) => {
        (d.anchor as { locked: boolean }).locked = on;
      },
      refs: () => refs,
      feed: () => undefined,
      changed: () => undefined,
    };
    const team = new SectorTeamDoors(SCOPED, host);
    team.build(missionId);
    const item = (s: number, k: number): Interactable | undefined => items.find((q) => q.id === boltItemId(s, k));
    const closure = (x: number, z: number) => closures.find((c) => c.cx === x && c.cz === z);
    /** The local player's feet at (x, z). */
    const stand = (x: number, z: number): void => {
      refs.length = 0;
      refs.push({ id: 'local', target: { alive: true } as PlayerRef['target'], feet: new Vector3(x, 0, z), speed: 0, crouched: false });
    };
    return { team, doorAt, item, closure, closures, items, stand };
  };

  it("built for its mission the bolt is fitted: door locked, an Unbolt item, a shut nav closure; a restart bolts it again", () => {
    const w = world('m1');
    expect(w.doorAt(10, 5)!.anchor.locked).toBe(true);
    expect(w.item(0, 0)?.label).toBe('Unbolt');
    expect(w.item(0, 0)?.enabled).toBe(true);
    expect(w.closure(10, 5)?.closed).toBe(true);
    expect(w.team.bolts.isShut(0, 0)).toBe(true);
    expect(w.team.bolts.isFitted(0, 0)).toBe(true);
    // m1 is one of section 1's bolt 1 missions too
    expect(w.doorAt(4, 4)!.anchor.locked).toBe(true);
    expect(w.team.boltInfo().map((b) => b.id)).toEqual([boltItemId(0, 0), boltItemId(0, 1), boltItemId(1, 0), boltItemId(1, 1)]);
    w.stand(10.8, 5);
    expect(w.team.unbolt(0, 0)).toBe(true);
    expect(w.doorAt(10, 5)!.anchor.locked).toBe(false);
    expect(w.closure(10, 5)?.closed).toBe(false);
    w.team.reset(0);
    expect(w.doorAt(10, 5)!.anchor.locked).toBe(true);
    expect(w.closure(10, 5)?.closed).toBe(true);
    expect(w.item(0, 0)?.enabled).toBe(true);
    expect(w.team.bolts.isShut(0, 0)).toBe(true);
  });

  for (const [name, id] of [
    ['another mission', 'm2'],
    ['no mission bound', undefined],
  ] as const) {
    it(`built for ${name} it is a plain door: unlocked, no item, no closure, not shut, left out of boltInfo, and a restart keeps it so`, () => {
      const w = world(id);
      for (const [s, k, x, z] of [
        [0, 0, 10, 5],
        [1, 1, 4, 4],
      ] as const) {
        expect(w.doorAt(x, z)!.anchor.locked).toBe(false);
        expect(w.item(s, k)).toBeUndefined();
        expect(w.closure(x, z)).toBeUndefined();
        expect(w.team.bolts.isShut(s, k)).toBe(false);
        expect(w.team.bolts.isFitted(s, k)).toBe(false);
      }
      expect(w.items.length).toBe(2);
      expect(w.closures.length).toBe(2);
      expect(w.team.boltInfo().map((b) => b.id)).toEqual([boltItemId(0, 1), boltItemId(1, 0)]);
      // a use or press of it is refused as for a drawn bolt; the door is not touched
      w.stand(10.8, 5);
      expect(w.team.unbolt(0, 0)).toBe(false);
      expect(w.team.bolts.use(0, 0, 10.8, 5)).toBe(false);
      expect(w.team.bolts.press(0, 0, { x: 10.8, y: 0, z: 5 }, [])).toBe('shut');
      w.team.reset(0);
      w.team.reset(1);
      expect(w.doorAt(10, 5)!.anchor.locked).toBe(false);
      expect(w.doorAt(4, 4)!.anchor.locked).toBe(false);
      expect(w.team.bolts.isShut(0, 0)).toBe(false);
      expect(w.team.bolts.isShut(1, 1)).toBe(false);
      expect(w.items.length).toBe(2);
      expect(w.closures.length).toBe(2);
    });
  }

  for (const id of ['m1', 'm2', undefined]) {
    it(`a bolt with no missions behaves as before A30 (built for ${id ?? 'no mission'})`, () => {
      const w = world(id);
      for (const [s, k, x, z] of [
        [0, 1, 20, 5],
        [1, 0, 0, 0],
      ] as const) {
        expect(w.doorAt(x, z)!.anchor.locked).toBe(true);
        expect(w.item(s, k)?.enabled).toBe(true);
        expect(w.closure(x, z)?.closed).toBe(true);
        expect(w.team.bolts.isShut(s, k)).toBe(true);
        expect(w.team.bolts.isFitted(s, k)).toBe(true);
      }
      w.stand(20.8, 5);
      expect(w.team.unbolt(0, 1)).toBe(true);
      expect(w.doorAt(20, 5)!.anchor.locked).toBe(false);
      expect(w.item(0, 1)?.enabled).toBe(false);
      w.team.reset(0);
      expect(w.doorAt(20, 5)!.anchor.locked).toBe(true);
      expect(w.item(0, 1)?.enabled).toBe(true);
      expect(w.closure(20, 5)?.closed).toBe(true);
      expect(w.team.bolts.isShut(0, 1)).toBe(true);
    });
  }

  it('SectorBolts: rebolt skips an unfitted bolt; unfit ignores a bad index', () => {
    const s = new SectorBolts(SCOPED);
    s.unfit(0, 0);
    s.unfit(0, 9);
    s.unfit(7, 0);
    expect(s.shut).toEqual([[false, true], [true, true]]);
    expect(s.fitted).toEqual([[false, true], [true, true]]);
    expect(s.use(0, 1, 20.8, 5)).toBe(true);
    expect(s.rebolt(0)).toEqual([1]);
    expect(s.shut[0]).toEqual([false, true]);
    expect(s.isShut(0, 0)).toBe(false);
    expect(s.rebolt(0)).toEqual([]);
  });

  it('a fresh SectorBolts fits every bolt (no build: the state before A30)', () => {
    const s = new SectorBolts(SCOPED);
    expect(s.shut).toEqual([[true, true], [true, true]]);
    expect(s.fitted).toEqual([[true, true], [true, true]]);
  });
});
