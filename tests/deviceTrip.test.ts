import { describe, expect, it, vi } from 'vitest';
import { CMD_SEND, GuardView, IncidentBoard, KIND, LEVEL, MODE_DEVICE, type PathLen } from '../src/ai/incidents';
import { DEVICE } from '../src/ai/gear';
import { beamSpot, type LaserDef } from '../src/game/jammer';
import { AlertMachine, type AlertLevel } from '../src/ai/alertState';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { Vector3, type Scene } from '../src/core/babylon';
import type { Enemy, PlayerRef } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { RoomRect } from '../src/world/rooms';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai S17, Michael's walk of 4.72 G1: "when guards alerted when i cross laser, they somehow know ive climbed
// elsewhere. theres no way they could no that unless they saw me. change it so they come to look where the laser is and
// search the room.") A laser trip is a device incident at the beam, never the player's live position: the board sends
// calm guards to the beam's spot, they search the room it is in, and the alarm's reinforcements search there too instead
// of going to combat on the player.

const LAB: RoomRect = { id: 'lab', name: 'Lab', minX: 0, maxX: 12, minZ: 0, maxZ: 8 };
const ROOF: RoomRect = { id: 'roof', name: 'Roof', minX: 30, maxX: 50, minZ: 30, maxZ: 50 };
/** The beam runs across the lab; the player broke it, then climbed out to the roof (40, 40). */
const BEAM: LaserDef = { id: 'las-lab', x1: 2, z1: 4, x2: 10, z2: 4, ys: [0.4, 1.0] };
const PLAYER_AT: [number, number] = [40, 40];

describe('beamSpot (A100)', () => {
  it("is the middle of the beam line at the laser's floor: not where the body broke it, nor where it went", () => {
    const out = { x: 0, y: 0, z: 0 };
    expect(beamSpot(BEAM, out)).toEqual({ x: 6, y: Number.NaN, z: 4 });
    expect(beamSpot({ ...BEAM, floorY: 4.5 }, out).y).toBe(4.5);
  });
});

// ----- the board -----

function straight(): PathLen {
  return { len: (ax, ay, az, bx, by, bz) => Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2) };
}

function view(gs: [number, number, number, number?][]): GuardView {
  const v = new GuardView(8);
  v.n = gs.length;
  gs.forEach(([id, x, z, level], i) => v.set(i, id, x, 0, z, level ?? LEVEL.unaware, 0, -1));
  return v;
}

describe('the device incident (board)', () => {
  it('is its own kind, after the S15 breaker', () => {
    expect(KIND.indexOf('device')).toBe(11);
  });

  it(`sends the ${DEVICE.want} nearest calm guards within DEVICE.callR (${DEVICE.callR} m) to the beam spot, nobody to the player`, () => {
    const b = new IncidentBoard(straight());
    const v = view([
      [1, 6, 20], // 16 m
      [2, 6, -4], // 8 m
      [3, 40, 40, LEVEL.alert], // in combat: never sent
      [4, 6, 50], // 46 m: out of range
      [5, 14, 4], // 8 m
    ]);
    const id = b.reportDevice(6, 4, 0, 0);
    b.tick(0, v);
    const sent: [number, number, number, number][] = [];
    for (let k = 0; k < b.out.n; k++) if (b.out.cmd[k] === CMD_SEND) sent.push([b.out.guard[k]!, b.out.mode[k]!, b.out.x[k]!, b.out.z[k]!]);
    expect(sent).toEqual([
      [2, MODE_DEVICE, 6, 4],
      [5, MODE_DEVICE, 6, 4],
    ]);
    expect(b.kindOf(id)).toBe('device');
  });

  it('a second trip of the same beam while it is open merges (no third guard); another device is its own incident', () => {
    const b = new IncidentBoard(straight());
    const v = view([
      [1, 6, 0],
      [2, 6, 8],
      [3, 0, 4],
    ]);
    const a = b.reportDevice(6, 4, 0, 0);
    b.tick(0, v);
    b.out.n = 0;
    expect(b.reportDevice(6, 4, 0, 0)).toBe(a);
    const c = b.reportDevice(30, 30, 0, 1);
    expect(c).not.toBe(a);
  });

  it(`nobody in range: it waits DEVICE.wait (${DEVICE.wait} s) for one, then lapses`, () => {
    const b = new IncidentBoard(straight());
    const id = b.reportDevice(6, 4, 0, 0);
    const far = view([[1, 100, 100]]);
    for (let t = 0; t < DEVICE.wait - 1; t += 0.2) b.tick(0.2, far);
    expect(b.kindOf(id)).toBe('device');
    for (let t = 0; t < 2; t += 0.2) b.tick(0.2, far);
    expect(b.kindOf(id)).toBeNull();
  });
});

// ----- the manager: a trip while the player is elsewhere -----

interface FakeGuard {
  num: number;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  taken: boolean;
  runningAlarm: boolean;
  dog: object | null;
  level: string;
  incident: number;
  def: { melee: object | null; kind: string; scale: number };
  pos: Vector3;
  respondDevice: ReturnType<typeof vi.fn>;
  joinAsResponder: ReturnType<typeof vi.fn>;
  joinAsReinforcement: ReturnType<typeof vi.fn>;
  bark: ReturnType<typeof vi.fn>;
}

let gn = 7100;
function guard(x: number, z: number, o: Partial<FakeGuard> = {}): FakeGuard {
  const g: FakeGuard = {
    num: gn++,
    alive: true,
    alerted: false,
    passive: false,
    taken: false,
    runningAlarm: false,
    dog: null,
    level: 'unaware',
    incident: -1,
    def: { melee: null, kind: 'grunt', scale: 1 },
    pos: new Vector3(x, 0, z),
    respondDevice: vi.fn(),
    joinAsResponder: vi.fn(),
    joinAsReinforcement: vi.fn(),
    bark: vi.fn(),
    ...o,
  };
  g.respondDevice.mockImplementation((_x: number, _z: number, inc: number) => {
    g.incident = inc;
  });
  return g;
}

function manager(gs: FakeGuard[]) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [LAB, ROOF] },
    doors: { list: [] },
  };
  const nav = {
    walk: new Uint8Array(4),
    nearestWalkable: vi.fn(() => -1),
    lineClear: vi.fn(() => true),
    findPath: vi.fn(() => []),
    heightAt: vi.fn(() => 0),
    flowField: vi.fn(),
    version: 0,
  };
  const player = { id: 'p1', feet: new Vector3(PLAYER_AT[0], 6, PLAYER_AT[1]), target: { alive: true } } as unknown as PlayerRef;
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: () => true } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => [player]);
  em.stealth = true;
  for (const g of gs) em.enemies.push(g as unknown as Enemy);
  return em;
}

describe('a laser trip, wired (EnemyManager.deviceAlert)', () => {
  it("the sent guards go to the beam and search its room; the player's position (on the roof) is never handed over", () => {
    const gs = [guard(3, 1), guard(11, 7), guard(20, 4)];
    const em = manager(gs);
    const s = beamSpot(BEAM, { x: 0, y: 0, z: 0 });
    const inc = em.deviceAlert(s.x, s.y, s.z, 0);
    expect(em.board.kindOf(inc)).toBe('device');
    const calls = gs.flatMap((g) => g.respondDevice.mock.calls);
    expect(calls).toHaveLength(2);
    for (const c of calls) {
      expect([c[0], c[1]]).toEqual([6, 4]);
      expect(c[3]).toBe(LAB);
    }
    // no last known position from a beam
    expect(em.lkpValid).toBe(false);
  });

  it('a reinforcement the trip brings searches the beam spot (a responder), not combat; after a sighting, combat as before', () => {
    const em = manager([]);
    em.deviceAlert(6, Number.NaN, 4, 0);
    const r = guard(-20, 0);
    em.joinReinforcement(r as unknown as Enemy, 0, null);
    expect(r.joinAsReinforcement).not.toHaveBeenCalled();
    expect(r.joinAsResponder).toHaveBeenCalledWith(null, 6, 4, LAB);
    // someone saw the player: the last known position is the lead now
    em.lkp.set(40, 6, 40);
    em.lkpValid = true;
    const r2 = guard(-20, 2);
    em.joinReinforcement(r2 as unknown as Enemy, 0, null);
    expect(r2.joinAsReinforcement).toHaveBeenCalled();
    expect(r2.joinAsResponder).not.toHaveBeenCalled();
  });

  it(`an alarm more than DEVICE.fresh (${DEVICE.fresh} s) after the trip: the reinforcement is not sent to the old spot`, () => {
    const em = manager([]);
    em.deviceAlert(6, 0, 4, 0);
    const priv = em as unknown as { boardStep(dt: number): void };
    for (let t = 0; t < DEVICE.fresh + 1; t += 0.2) priv.boardStep(0.2);
    const r = guard(-20, 0);
    em.joinReinforcement(r as unknown as Enemy, 0, null);
    expect(r.joinAsResponder).not.toHaveBeenCalled();
    expect(r.joinAsReinforcement).toHaveBeenCalled();
  });

  it('the parked modes (uncoordinated): no incident', () => {
    const gs = [guard(3, 1)];
    const em = manager(gs);
    em.coordinated = false;
    expect(em.deviceAlert(6, 0, 4, 0)).toBe(-1);
    expect(gs[0]!.respondDevice).not.toHaveBeenCalled();
  });
});

// ----- the guard's own search (Enemy.respondDevice on the real code) -----

type Goal = { point: [number, number] | null; speed: number; face: number | null };
type Searcher = {
  respondDevice(x: number, z: number, inc: number, room: RoomRect | null): void;
  calmDecide(dt: number): Goal;
  onLevel(a: AlertLevel, b: AlertLevel): void;
  aware: AlertMachine;
  incident: number;
  pos: Vector3;
  searchRoomId: string | null;
};

async function searcher(at: [number, number]): Promise<Searcher> {
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
    aware: new AlertMachine(),
    health: { alive: true },
    passive: false,
    taken: false,
    incident: -1,
    incMode: 0,
    turnT: 0,
    caution: 0,
    brkGroup: -1,
    stimulus: [0, 0],
    hasStimulus: false,
    searchReq: false,
    searchOwn: false,
    searchRoom: null,
    reviving: null,
    camBody: null,
    combatSearch: false,
    spot: [0, 0],
    spotSet: false,
    spotArrived: false,
    spotLookT: 0,
    lookBase: 0,
    searchK: 0,
    routePath: [],
    entry: null,
    crew: null,
    hold: null,
    postDef: null,
    post: [0, 0],
    yaw: 0,
    pos: new Vector3(at[0], 0, at[1]),
    def: { walkSpeed: 0.9, runSpeed: 3.2, kind: 'grunt', scale: 1 },
    ctx: {
      coordinated: () => true,
      stealth: () => true,
      // the shared last known position sits on the player on the roof: a device search must never use it
      lkpValid: () => true,
      lkp: new Vector3(PLAYER_AT[0], 6, PLAYER_AT[1]),
      searchSlot: () => 0,
      nav: { nearestWalkable: () => -1 },
    },
    lc: { active: false, stop() {} },
    lure: { cancel() {}, active: false },
    walker: { rejoin() {} },
    alertIn: { called: false },
    bark() {},
    setState() {},
    goTo: (p: [number, number]) => p,
  });
  return e as unknown as Searcher;
}

describe('Enemy.respondDevice: to the beam, then round it inside its room', () => {
  it('first stop the beam spot, every search point inside the lab, none near the player; he keeps the task while searching', async () => {
    const e = await searcher([20, 4]);
    e.respondDevice(6, 4, 9, LAB);
    expect(e.searchRoomId).toBe('lab');
    e.aware.set('searching');
    e.onLevel('unaware', 'searching');
    expect(e.incident).toBe(9);
    const stops: [number, number][] = [];
    const dt = 1 / 30;
    let wasThere = false;
    for (let t = 0; t < 50; t += dt) {
      const g = e.calmDecide(dt);
      if (g.point) {
        const dx = g.point[0] - e.pos.x;
        const dz = g.point[1] - e.pos.z;
        const d = Math.hypot(dx, dz);
        const s = Math.min(d, g.speed * dt);
        if (d > 1e-6) e.pos.addInPlaceFromFloats((dx / d) * s, 0, (dz / d) * s);
        wasThere = false;
      } else if (!wasThere) {
        stops.push([e.pos.x, e.pos.z]);
        wasThere = true;
      }
    }
    expect(stops.length).toBeGreaterThanOrEqual(3);
    // (he stops within the 1.1 m arrival radius of each point)
    expect(Math.hypot(stops[0]![0] - 6, stops[0]![1] - 4)).toBeLessThan(1.15);
    for (const [x, z] of stops) {
      expect(x).toBeGreaterThanOrEqual(LAB.minX - 1.2);
      expect(x).toBeLessThanOrEqual(LAB.maxX + 1.2);
      expect(z).toBeGreaterThanOrEqual(LAB.minZ - 1.2);
      expect(z).toBeLessThanOrEqual(LAB.maxZ + 1.2);
      expect(Math.hypot(x - PLAYER_AT[0], z - PLAYER_AT[1])).toBeGreaterThan(30);
    }
    expect(e.incident).toBe(9);
  });

  it('a spot outside the room it was given keeps to no room (searches round the spot)', async () => {
    const e = await searcher([0, 0]);
    e.respondDevice(40, 40, 3, LAB);
    expect(e.searchRoomId).toBeNull();
  });
});
