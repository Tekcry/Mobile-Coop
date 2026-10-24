import { describe, expect, it } from 'vitest';
import { LockedDoorNav, lockedShut } from '../src/ai/lockedDoors';
import { DoorGate } from '../src/ai/doorGate';
import { NavGrid, type NavBlocker, type P2 } from '../src/ai/navGrid';
import { STAGE_NAV_ACROSS, STAGE_NAV_ALONG } from '../src/game/sectorStage';
import { DOOR, Doors, type DoorState } from '../src/world/doors';
import { Vector3, type Scene } from '../src/core/babylon';
import type { Enemy } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import { DIFFICULTY } from '../src/ai/archetypes';
import { bytesPerCall, HEAP_NUMBER, sink } from './helpers/allocPerCall';

// (guard-ai S28, Marlow Yard A7 "A7-cage-w") A guard's path never goes through a door he cannot open: a locked shut door
// is a wall on the nav grid (a closure per door, `ai/lockedDoors.ts`), so A* goes round it; unlocking opens the route.
// No guard has a key (the sector `keyholder` is a fixed-post role): every guard treats a locked door as a wall.

type FakeDoor = { cx: number; cz: number; open: number; target: number; anchor: { yaw: number; width: number; locked: boolean; hinge: { x: number; y: number; z: number } } };
/** A 1.2 m door in the wall along x = 0 at z 0: the leaf along z (yaw 0), hinge at z -0.6. */
const door = (locked: boolean): FakeDoor => ({ cx: 0, cz: 0, open: 0, target: 0, anchor: { yaw: 0, width: 1.2, locked, hinge: { x: 0, y: 0, z: -0.6 } } });

/** A wall along x = 0 (z -10..10) with the 1.2 m doorway at z 0 and (gap) an open 1.2 m gap at z 8. */
function walled(gap = true): NavGrid {
  const wall = (cz: number, hz: number): NavBlocker => ({ cx: 0, cz, hx: 0.1, hz, yaw: 0, bottom: 0, top: 3 });
  return new NavGrid({
    minX: -6, maxX: 6, minZ: -10, maxZ: 10, cell: 0.25,
    sample: () => ({ h: 0, ok: true }),
    blockers: gap ? [wall(-5.3, 4.7), wall(4, 3.4), wall(9.3, 0.7)] : [wall(-5.3, 4.7), wall(5.3, 4.7)],
    agentRadius: 0.32, stepHeight: 0.45, seed: [-5, -5],
  });
}

/** The highest z a path reaches (it went round by the gap at z 8 when > 6). */
function maxZ(p: readonly P2[] | null): number {
  let m = -Infinity;
  for (const w of p ?? []) m = Math.max(m, w[1]);
  return m;
}

describe('lockedDoors.ts (pure)', () => {
  it('a locked shut door is a wall to A*: the path goes round by the gap; unlocked, straight through', () => {
    const nav = walled();
    const d = door(true);
    const ln = new LockedDoorNav(nav, [d]);
    // built: every doorway still walkable until the first sync
    expect(nav.lineClear([-3, 0], [3, 0])).toBe(true);
    const v0 = nav.version;
    expect(ln.sync()).toBe(1);
    expect(ln.isShut(0)).toBe(true);
    expect(nav.version).toBe(v0 + 1);
    expect(nav.lineClear([-3, 0], [3, 0])).toBe(false);
    const round = nav.findPath([-3, 0], [3, 0]);
    expect(round).not.toBeNull();
    expect(maxZ(round)).toBeGreaterThan(6);
    // no change: nothing toggles, the version holds (no replan)
    expect(ln.sync()).toBe(0);
    expect(nav.version).toBe(v0 + 1);
    // unlocked (a script, the course gate): the doorway opens on the next sync
    d.anchor.locked = false;
    expect(ln.sync()).toBe(1);
    expect(nav.version).toBe(v0 + 2);
    expect(nav.lineClear([-3, 0], [3, 0])).toBe(true);
    expect(maxZ(nav.findPath([-3, -2], [3, 2]))).toBeLessThan(3);
  });

  it('only the locked door between: no path (and the flow field does not reach through); unlocked: the path is back', () => {
    const nav = walled(false);
    const d = door(true);
    const ln = new LockedDoorNav(nav, [d]);
    ln.sync();
    expect(nav.findPath([-3, 0], [3, 0])).toBeNull();
    expect(nav.flowField([[3, 0]])[nav.cellOf(-3, 0)]).toBe(Infinity);
    d.anchor.locked = false;
    ln.sync();
    expect(nav.findPath([-3, 0], [3, 0])).not.toBeNull();
  });

  it('a locked door standing open stays walkable; it shuts on the grid when its leaf shuts', () => {
    const nav = walled(false);
    const d = door(true);
    d.target = 1;
    d.open = 1;
    expect(lockedShut(d)).toBe(false);
    const ln = new LockedDoorNav(nav, [d]);
    expect(ln.sync()).toBe(0);
    expect(nav.findPath([-3, 0], [3, 0])).not.toBeNull();
    d.target = 0;
    expect(ln.sync()).toBe(1);
    expect(nav.findPath([-3, 0], [3, 0])).toBeNull();
  });

  it('the closure is the Sector Ops door size, and overlapping a Sector Ops bolt closure both must open', () => {
    const nav = walled(false);
    const d = door(true);
    const bolt = nav.addClosure(0, 0, STAGE_NAV_ACROSS, (1.2 + STAGE_NAV_ALONG) / 2, 0, 0);
    const ln = new LockedDoorNav(nav, [d]);
    expect(nav.closureSize(bolt)).toBeGreaterThan(0);
    ln.sync();
    nav.setClosed(bolt, true);
    d.anchor.locked = false;
    ln.sync();
    // still bolted
    expect(nav.findPath([-3, 0], [3, 0])).toBeNull();
    nav.setClosed(bolt, false);
    expect(nav.findPath([-3, 0], [3, 0])).not.toBeNull();
  });

  it('sync never allocates (steady and toggling)', async () => {
    const nav = walled();
    const doors: FakeDoor[] = [];
    for (let k = 0; k < 24; k++) doors.push(door(false));
    const d = doors[0]!;
    const ln = new LockedDoorNav(nav, doors);
    const per = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) {
        d.anchor.locked = (i & 1) === 0;
        sink[0]! += ln.sync();
      }
    }, HEAP_NUMBER);
    console.info(`bytes per LockedDoorNav.sync: ${per.toFixed(1)}`);
    expect(sink[0]!).toBeGreaterThan(0);
    expect(per).toBeLessThanOrEqual(HEAP_NUMBER);
  });
});

describe('EnemyManager wiring', () => {
  it('builds the closures on its first update; a lock set between updates (Doors.setLocked) reaches the grid at once', async () => {
    const { EnemyManager } = await import('../src/ai/enemyManager');
    const nav = walled(false);
    // Doors without a scene (no leaf mesh): the state rules only (tests/doors.test.ts)
    const ds = Object.create(Doors.prototype) as Doors;
    const d = door(false) as unknown as DoorState;
    Object.assign(ds, { list: [d], onSound: null, onLocked: null, armed: true, mesh: null });
    const world = { level: { lights: { lights: [] }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: ds };
    const em = new EnemyManager({} as Scene, world as unknown as World, nav, {} as DamageRegistry, { clear: () => true } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
    em.update(1 / 60);
    expect(em.lockedDoors).not.toBeNull();
    expect(nav.findPath([-3, 0], [3, 0])).not.toBeNull();
    const v0 = nav.version;
    // no update between: the hook shuts the doorway
    ds.setLocked(d, true);
    expect(nav.version).toBe(v0 + 1);
    expect(nav.findPath([-3, 0], [3, 0])).toBeNull();
    // setting the same lock again changes nothing
    ds.setLocked(d, true);
    expect(nav.version).toBe(v0 + 1);
    ds.setLocked(d, false);
    expect(nav.findPath([-3, 0], [3, 0])).not.toBeNull();
    em.update(1 / 60);
    expect(nav.version).toBe(v0 + 2);
    // lock then shut (courseMode.applyLocks, sectorMode.lockDoor): locked while open the doorway stays walkable; the
    // shut (Doors.setOpen) closes it on the grid at once, no update between
    d.target = 1;
    d.open = 1;
    ds.setLocked(d, true);
    expect(nav.findPath([-3, 0], [3, 0])).not.toBeNull();
    ds.setOpen(d, false);
    expect(nav.findPath([-3, 0], [3, 0])).toBeNull();
    // (polish C2) the still-locked shut door forced open (a script, a client mirror): walkable at once, no update between
    const v1 = nav.version;
    ds.setOpen(d, true);
    expect(d.anchor.locked).toBe(true);
    expect(nav.version).toBe(v1 + 1);
    expect(nav.findPath([-3, 0], [3, 0])).not.toBeNull();
    // the manager's own sync on the next update has nothing left to do (no second replan)
    em.update(1 / 60);
    expect(nav.version).toBe(v1 + 1);
    // an unlocked door's setOpen does not call the hook
    let calls = 0;
    ds.onLocked = () => void calls++;
    ds.setLocked(d, false);
    calls = 0;
    ds.setOpen(d, false);
    ds.setOpen(d, true);
    expect(calls).toBe(0);
  });
});

// ----- the real Enemy walker (goTo + move) with the manager's door gate and the lock closures -----

type Walker = {
  move(dt: number, goal: P2 | null, speed: number, face: number | null): void;
  goTo(p: P2, dt: number, near?: number, y?: number): P2 | null;
  pos: Vector3;
};

async function setup(gap: boolean, locked: boolean) {
  const { EnemyManager } = await import('../src/ai/enemyManager');
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const { MotionDriver, emptyMotionInput } = await import('../src/anim/motion');
  const nav = walled(gap);
  let finds = 0;
  const findPath = nav.findPath.bind(nav);
  nav.findPath = (...a: Parameters<NavGrid['findPath']>) => {
    finds++;
    return findPath(...a);
  };
  const d = door(locked);
  const doors = {
    list: [d],
    open(x: FakeDoor): boolean {
      if (x.anchor.locked || x.target === 1) return false;
      x.target = 1;
      return true;
    },
    step(dt: number): void {
      d.open = d.target === 1 ? Math.min(1, d.open + dt / DOOR.enemyTime) : Math.max(0, d.open - dt / DOOR.autoCloseTime);
    },
  };
  const world = { level: { lights: { lights: [] }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav, {} as DamageRegistry, { clear: () => true } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  const mctx = (em as unknown as { ctx: { doorStep(e: Enemy, x0: number, z0: number, x1: number, z1: number, y: number): boolean } }).ctx;
  // what the manager builds on its first update with doors
  (em as unknown as { doorGate: DoorGate }).doorGate = new DoorGate(doors.list);
  const ln = new LockedDoorNav(nav, doors.list);
  em.lockedDoors = ln;
  const list: Walker[] = [];
  const ctx = { nav, enemies: () => list, players: () => [], doorStep: mctx.doorStep };
  const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
    health: { alive: true },
    taken: false,
    pos: new Vector3(-3, 0, 0),
    vel: new Vector3(),
    desired: new Vector3(),
    tmp: new Vector3(),
    sepOut: { x: 0, z: 0 },
    motion: new MotionDriver(Math.PI / 2),
    motionIn: emptyMotionInput(),
    navCell: -1,
    yaw: Math.PI / 2,
    target: null,
    def: { walkSpeed: 0.9, runSpeed: 3.2, kind: 'grunt', scale: 1, quadruped: false },
    ctx,
    meP: [0, 0],
    routePath: [],
    routeGoal: [NaN, NaN],
    routeT: 0,
    routeVer: -1,
    routeMiss: false,
  }) as unknown as Walker;
  Object.defineProperty(e, 'aimedMotion', { value: false });
  list.push(e);
  return { nav, d, doors, e, ln, finds: () => finds };
}

const GOAL: P2 = [3, 0];

/** One 60 Hz tick of a guard walking to GOAL: the manager's lock sync, his route, his step, the doors' swing. */
function tick(s: Awaited<ReturnType<typeof setup>>, speed: number): void {
  s.ln.sync();
  const there = Math.abs(s.e.pos.x - GOAL[0]) < 0.6 && Math.abs(s.e.pos.z - GOAL[1]) < 0.6;
  s.e.move(1 / 60, there ? null : (s.e.goTo(GOAL, 1 / 60, 0.3) ?? null), speed, null);
  s.doors.step(1 / 60);
}

describe('a guard routed past a locked door (Enemy.goTo + LockedDoorNav)', () => {
  it('locked: he goes round by the gap and arrives, never waiting at the leaf', async () => {
    const s = await setup(true, true);
    let nearLeaf = 0;
    for (let i = 0; i < 60 * 30; i++) {
      tick(s, 3.2);
      if (Math.abs(s.e.pos.x) < 0.8 && Math.abs(s.e.pos.z) < 1) nearLeaf++;
    }
    expect(s.e.pos.x).toBeGreaterThan(2.3);
    expect(Math.abs(s.e.pos.z)).toBeLessThan(0.7);
    expect(nearLeaf).toBe(0);
    expect(s.d.target).toBe(0);
    // a handful of plans, not one a frame
    expect(s.finds()).toBeLessThan(10);
  });

  it('locked while he walks the doorway line: he replans once round; unlocked again: back through the door', async () => {
    const s = await setup(true, false);
    s.d.anchor.locked = true;
    // a few steps in, then the door opens (unlocked): the next sync opens the grid and he replans through it
    for (let i = 0; i < 60; i++) tick(s, 0.99);
    const f0 = s.finds();
    expect(f0).toBeGreaterThan(0);
    expect(f0).toBeLessThan(4);
    s.d.anchor.locked = false;
    for (let i = 0; i < 60 * 15; i++) tick(s, 0.99);
    expect(s.e.pos.x).toBeGreaterThan(2.3);
    // went through the door (opened it the enemy way), not round by the gap at z 8
    expect(s.d.target).toBe(1);
  });

  it('unreachable (only the locked door): he waits short of it and replans about once a second, not every frame', async () => {
    const s = await setup(false, true);
    for (let i = 0; i < 60 * 5; i++) tick(s, 3.2);
    expect(s.e.pos.x).toBeLessThan(0);
    expect(s.finds()).toBeLessThanOrEqual(7);
    // unlocked: he opens it and goes through
    s.d.anchor.locked = false;
    for (let i = 0; i < 60 * 10; i++) tick(s, 3.2);
    expect(s.e.pos.x).toBeGreaterThan(2.3);
  });
});

describe('(guard-ai sweep fix) a guard standing in a blocked cell walks out of it', () => {
  it('pressed into the wall margin (a blocked cell), he steps out towards the nearest walkable cell, never deeper', async () => {
    const st = await setup(true, false);
    const { nav, e } = st;
    // the wall along x = 0 blocks cells within its half thickness + the agent radius: (-0.3, -5) is such a cell
    e.pos.x = -0.3;
    e.pos.z = -5;
    (e as unknown as { outP: [number, number] }).outP = [0, 0];
    expect(nav.isWalkable(nav.cellOf(-0.3, -5))).toBe(false);
    // asked along the wall (mostly +z, a little -x): before the fix every step inside his blocked cell was refused
    for (let i = 0; i < 60 * 3; i++) e.move(1 / 60, [-1.2, 3], 1.4, null);
    expect(nav.isWalkable(nav.cellOf(e.pos.x, e.pos.z))).toBe(true);
    expect(e.pos.z).toBeGreaterThan(-4);
    expect(e.pos.x).toBeLessThan(-0.3);
  });
});

describe('(guard-ai sweep fix round) out of a blocked cell a thin wall splits: his own side, never through it', () => {
  it('warehouseOps 0.1 m panel at (-13.5, -21.2): a guard in its cell walks out on the side he stands, whichever way he is sent', async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { warehouseOps } = await import('../src/world/maps/warehouseOps');
    const { runtimeNav } = await import('./helpers/runtimeNav');
    const { Enemy: EnemyClass } = await import('../src/ai/enemy');
    const { MotionDriver, emptyMotionInput } = await import('../src/anim/motion');
    const b = new LevelBuilder();
    const lay = warehouseOps.build(b, 0);
    const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, warehouseOps.navLayers ?? 3, lay.navSeeds ?? []);
    // the panel's cell (blocked) with walkable cells north and south of it
    expect(nav.isWalkable(nav.cellOf(-13.5, -21.25, 0))).toBe(false);
    expect(nav.isWalkable(nav.cellOf(-13.5, -20.75, 0))).toBe(true);
    expect(nav.isWalkable(nav.cellOf(-13.5, -21.75, 0))).toBe(true);
    const walker = (x: number, z: number) => {
      const list: unknown[] = [];
      const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
        health: { alive: true }, taken: false, pos: new Vector3(x, 0, z), vel: new Vector3(), desired: new Vector3(), tmp: new Vector3(),
        sepOut: { x: 0, z: 0 }, motion: new MotionDriver(0), motionIn: emptyMotionInput(), navCell: -1, yaw: 0, target: null,
        def: { walkSpeed: 0.9, runSpeed: 3.2, kind: 'grunt', scale: 1, quadruped: false },
        ctx: { nav, enemies: () => list, players: () => [] }, outP: [0, 0],
      }) as unknown as { move(dt: number, goal: P2 | null, speed: number, face: number | null): void; pos: Vector3 };
      Object.defineProperty(e, 'aimedMotion', { value: false });
      list.push(e);
      return e;
    };
    // the panel's faces: z -21.25 .. -21.15
    for (const [z0, north] of [[-21.05, true], [-21.4, false]] as const) {
      for (const goal of [[-13.5, -25], [-13.5, -17]] as P2[]) {
        const e = walker(-13.5, z0);
        let crossed = false;
        for (let i = 0; i < 60 * 3; i++) {
          e.move(1 / 60, goal, 1.4, null);
          if (north ? e.pos.z < -21.15 : e.pos.z > -21.25) crossed = true;
        }
        expect(crossed, `from z ${z0} towards ${goal[1]}`).toBe(false);
        // sent his own way he is out on walkable ground; sent across he stays on his side
        const out = nav.isWalkable(nav.cellOf(e.pos.x, e.pos.z, 0));
        if ((goal[1] > z0) === north) expect(out, `from z ${z0} towards ${goal[1]}`).toBe(true);
      }
    }
  });
});
