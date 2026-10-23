import { describe, expect, it } from 'vitest';
import { DOOR_GATE, DoorGate, doorShut } from '../src/ai/doorGate';
import { NavGrid, type NavBlocker } from '../src/ai/navGrid';
import { DOOR } from '../src/world/doors';
import { Vector3, type Scene } from '../src/core/babylon';
import type { Enemy } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import { DIFFICULTY } from '../src/ai/archetypes';

// (guard-ai S20, Michael's walk of 4.72 G4: "guards seem to walk through eachother and sometimes doors.") A guard routed
// through a closed door opens it the player's way and waits for the swing, never inside its leaf while it is shut; a
// locked door is never crossed (he waits at it).

/** A door as `DoorState` holds it, and the bit of `Doors` the manager calls (open: the enemy push's swing). */
type FakeDoor = { cx: number; cz: number; open: number; target: number; anchor: { yaw: number; width: number; locked: boolean; hinge: { x: number; y: number; z: number } } };
function fakeDoors(list: FakeDoor[]) {
  const opened: string[] = [];
  return {
    list,
    opened,
    open(d: FakeDoor, how: string): boolean {
      if (d.anchor.locked || d.target === 1) return false;
      d.target = 1;
      opened.push(how);
      return true;
    },
    step(dt: number): void {
      for (const d of list) d.open = d.target === 1 ? Math.min(1, d.open + dt / DOOR.enemyTime) : Math.max(0, d.open - dt / DOOR.autoCloseTime);
    },
  };
}
/** A 1.2 m door in the wall along x = 0 at z 0: the leaf along z (yaw 0), hinge at z -0.6. */
const door = (locked = false, y = 0): FakeDoor => ({ cx: 0, cz: 0, open: 0, target: 0, anchor: { yaw: 0, width: 1.2, locked, hinge: { x: 0, y, z: -0.6 } } });

describe('doorGate.ts (pure)', () => {
  it('its sizes are the door collider and the nav agent', () => {
    expect(DOOR_GATE.half).toBe(DOOR.thickness);
    expect(DOOR_GATE.r).toBe(0.32);
  });

  it('shut: closed, closing, or opening under `pass`', () => {
    const d = door();
    expect(doorShut(d)).toBe(true);
    d.target = 1;
    d.open = DOOR_GATE.pass - 0.01;
    expect(doorShut(d)).toBe(true);
    d.open = DOOR_GATE.pass;
    expect(doorShut(d)).toBe(false);
    // the player shuts it again: shut at once
    d.target = 0;
    expect(doorShut(d)).toBe(true);
  });

  it('a step into or across a shut leaf is blocked; along it, away from it and through an open door are not', () => {
    const d = door();
    const g = new DoorGate([d]);
    const edge = DOOR_GATE.half + DOOR_GATE.r;
    // walking at the leaf along x: blocked at its edge, clear short of it
    expect(g.blocking(-1, 0, -edge + 0.01, 0, 0)).toBe(0);
    expect(g.blocking(-1, 0, -edge - 0.01, 0, 0)).toBe(-1);
    // a long step straight across (no tunnelling)
    expect(g.blocking(-0.5, 0.1, 0.5, 0.1, 0)).toBe(0);
    // past the door's end (in the wall: the nav grid's) and on another floor: not the gate's
    expect(g.blocking(-1, 2, -0.2, 2, 0)).toBe(-1);
    expect(g.blocking(-1, 0, -0.2, 0, 3.2)).toBe(-1);
    // shut on him (inside the leaf): out is fine, deeper is not
    expect(g.blocking(-0.2, 0, -0.3, 0, 0)).toBe(-1);
    expect(g.blocking(-0.2, 0, -0.1, 0, 0)).toBe(0);
    // open: clear
    d.target = 1;
    d.open = 1;
    expect(g.blocking(-1, 0, 1, 0, 0)).toBe(-1);
  });

  it('random steps round a shut door never end in its leaf or cross it (seeded)', () => {
    const d = door(true);
    const g = new DoorGate([d]);
    let s = 12345;
    const rnd = (): number => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const depth = DOOR_GATE.half + DOOR_GATE.r;
    let x = -1.5;
    let z = 0;
    let crossed = 0;
    for (let i = 0; i < 20000; i++) {
      const nx = x + (rnd() - 0.4) * 0.12;
      const nz = Math.max(-0.55, Math.min(0.55, z + (rnd() - 0.5) * 0.12));
      if (g.blocking(x, z, nx, nz, 0) >= 0) continue;
      if (Math.sign(nx) !== Math.sign(x)) crossed++;
      x = nx;
      z = nz;
      expect(Math.abs(x) >= depth - 1e-9).toBe(true);
    }
    expect(crossed).toBe(0);
    expect(x).toBeLessThan(0);
  });
});

// ----- the manager's gate with the real Enemy walker on a real nav grid (every doorway walkable, as built) -----

/** A wall along x = 0 (z -10..10) with the 1.2 m doorway at z 0 and an open 1.2 m gap at z 8. */
function walled(): NavGrid {
  const wall = (cz: number, hz: number): NavBlocker => ({ cx: 0, cz, hx: 0.1, hz, yaw: 0, bottom: 0, top: 3 });
  return new NavGrid({
    minX: -6, maxX: 6, minZ: -10, maxZ: 10, cell: 0.25,
    sample: () => ({ h: 0, ok: true }),
    // wall z -10..-0.6, 0.6..7.4, 8.6..10
    blockers: [wall(-5.3, 4.7), wall(4, 3.4), wall(9.3, 0.7)],
    agentRadius: 0.32, stepHeight: 0.45, seed: [-5, -5],
  });
}

type Walker = { move(dt: number, goal: [number, number] | null, speed: number, face: number | null): void; pos: Vector3 };

async function setup(locked: boolean) {
  const { EnemyManager } = await import('../src/ai/enemyManager');
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const { MotionDriver, emptyMotionInput } = await import('../src/anim/motion');
  const nav = walled();
  const d = door(locked);
  const doors = fakeDoors([d]);
  const world = { level: { lights: { lights: [] }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav, {} as DamageRegistry, { clear: () => true } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  const mctx = (em as unknown as { ctx: { doorStep(e: Enemy, x0: number, z0: number, x1: number, z1: number, y: number): boolean } }).ctx;
  // the gate the manager builds on its first update with doors
  (em as unknown as { doorGate: DoorGate }).doorGate = new DoorGate(doors.list);
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
  }) as unknown as Walker;
  Object.defineProperty(e, 'aimedMotion', { value: false });
  list.push(e);
  return { em, nav, d, doors, e };
}

describe('a guard at a door (Enemy.move through EnemyManager.doorStep)', () => {
  for (const sp of [0.99, 3.2]) {
    it(`a closed door on his way: he opens it (the enemy push) and waits for the swing, never in the leaf while it is shut (${sp} m/s)`, async () => {
      const { em, d, doors, e } = await setup(false);
      const depth = DOOR_GATE.half + DOOR_GATE.r;
      let inShut = 0;
      for (let i = 0; i < 60 * 12; i++) {
        const there = Math.abs(e.pos.x - 3) < 0.6;
        e.move(1 / 60, there ? null : [3, 0], sp, null);
        doors.step(1 / 60);
        if (doorShut(d) && Math.abs(e.pos.x - d.cx) < depth - 1e-9 && Math.abs(e.pos.z - d.cz) < d.anchor.width / 2) inShut++;
      }
      expect(inShut).toBe(0);
      expect(doors.opened).toEqual(['enemy']);
      expect(em.doorOpens).toBe(1);
      expect(e.pos.x).toBeGreaterThan(2.3);
    });
  }

  for (const sp of [0.99, 3.2]) {
    it(`a locked door: he never crosses it nor enters its leaf, he waits at it; unlocked: he opens it and goes through (${sp} m/s)`, async () => {
      const { em, nav, d, doors, e } = await setup(true);
      const depth = DOOR_GATE.half + DOOR_GATE.r;
      // the doorway is walkable on the grid (as built): only the gate stops him
      expect(nav.lineClear([-3, 0], [3, 0])).toBe(true);
      for (let i = 0; i < 60 * 10; i++) {
        e.move(1 / 60, [3, 0], sp, null);
        doors.step(1 / 60);
        expect(e.pos.x).toBeLessThan(-depth + 1e-9);
      }
      expect(doors.opened).toEqual([]);
      expect(em.doorOpens).toBe(0);
      expect(d.target).toBe(0);
      // waiting at the leaf, not wandering off
      expect(e.pos.x).toBeGreaterThan(-depth - 0.3);
      d.anchor.locked = false;
      for (let i = 0; i < 60 * 8; i++) {
        const there = Math.abs(e.pos.x - 3) < 0.6;
        e.move(1 / 60, there ? null : [3, 0], sp, null);
        doors.step(1 / 60);
      }
      expect(doors.opened).toEqual(['enemy']);
      expect(e.pos.x).toBeGreaterThan(2.3);
    });
  }
});
