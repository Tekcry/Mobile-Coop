import { describe, expect, it, vi } from 'vitest';
import { EnemyManager, MAX_ALIVE } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import type { Enemy } from '../src/ai/enemy';
import type { Body } from '../src/ai/body';
import type { ReconDrone } from '../src/ai/reconDrone';
import type { Scene } from '../src/core/babylon';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (feature/sector-ops slice 2 step 1) the per-mode live cap and despawn, on a manager with stub world and nav and
// stand-in guards (no scene: real guards need meshes, so the e2e covers them)

function manager() {
  const setOn = vi.fn();
  const world = {
    level: { lights: { lights: [{ id: 'torch-0', kind: 'flashlight' }], setOn }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
  };
  const nearestWalkable = vi.fn(() => -1);
  const nav = { walk: new Uint8Array(4), nearestWalkable };
  const em = new EnemyManager(
    {} as Scene,
    world as unknown as World,
    nav as unknown as NavGrid,
    {} as DamageRegistry,
    {} as Ballistics,
    {} as Vfx,
    DIFFICULTY.normal,
    () => [],
  );
  return { em, setOn, nearestWalkable };
}

let n = 0;
function guard(alive = true): Enemy & { dispose: ReturnType<typeof vi.fn> } {
  return { id: `t${n++}`, alive, dog: null, coverIdx: -1, dispose: vi.fn() } as unknown as Enemy & { dispose: ReturnType<typeof vi.fn> };
}

describe('EnemyManager live cap (M6)', () => {
  it('defaults to MAX_ALIVE (12, every mode) and a mode can raise it', () => {
    const { em, nearestWalkable } = manager();
    expect(MAX_ALIVE).toBe(12);
    expect(em.maxAlive).toBe(MAX_ALIVE);
    em.maxAlive = 2;
    em.enemies.push(guard(), guard(), guard(false));
    // at the cap: refused before the nav is asked
    expect(em.spawn('grunt', { x: 0, y: 0, z: 0 } as never)).toBeNull();
    expect(nearestWalkable).not.toHaveBeenCalled();
    em.maxAlive = 3;
    em.spawn('grunt', { x: 0, y: 0, z: 0 } as never);
    expect(nearestWalkable).toHaveBeenCalledTimes(1);
  });
});

describe('EnemyManager.despawn', () => {
  it('removes a guard and everything of it: lists, body, drone, squad, jobs, flashlight', () => {
    const { em, setOn } = manager();
    const a = guard();
    const b = guard();
    em.enemies.push(a, b);
    em.joinSquad(a, 1);
    em.joinSquad(b, 1);
    const removed = vi.fn();
    em.onBodyRemoved = removed;
    const body = { enemyId: a.id, dispose: vi.fn() } as unknown as Body;
    const other = { enemyId: b.id, dispose: vi.fn() } as unknown as Body;
    em.bodies.push(body, other);
    const drone = { operator: a, dispose: vi.fn() } as unknown as ReconDrone;
    em.drones.push(drone);
    em.flanker = a;
    (em as unknown as { torchOwner: (Enemy | null)[] }).torchOwner[0] = a;
    const before = em.alive;
    em.despawn(a);
    expect(em.enemies).toEqual([b]);
    expect(em.alive).toBe(before - 1);
    expect(a.dispose).toHaveBeenCalledTimes(1);
    expect(em.bodies).toEqual([other]);
    expect(removed).toHaveBeenCalledWith(body);
    expect(em.drones).toEqual([]);
    expect(em.flanker).toBeNull();
    expect(setOn).toHaveBeenCalledWith('torch-0', false);
    expect(em.torchesOn).toBe(0);
    expect((em as unknown as { squads: Map<number, Enemy[]> }).squads.get(1)).toEqual([b]);
  });

  it('a downed guard (already off the live list) loses its body; despawnAll empties everything', () => {
    const { em } = manager();
    const dead = guard(false);
    const body = { enemyId: dead.id, dispose: vi.fn() } as unknown as Body;
    em.bodies.push(body);
    em.despawn(dead);
    expect(em.bodies).toEqual([]);
    expect(dead.dispose).toHaveBeenCalledTimes(1);
    const c = guard();
    em.enemies.push(c, guard());
    em.bodies.push({ enemyId: 'x', dispose: vi.fn() } as unknown as Body);
    em.lkpValid = true;
    em.despawnAll();
    expect(em.enemies).toEqual([]);
    expect(em.bodies).toEqual([]);
    expect(em.alive).toBe(0);
    expect(em.lkpValid).toBe(false);
    expect(c.dispose).toHaveBeenCalledTimes(1);
  });
});

describe('EnemyManager flashlights (warehouse-redesign M1)', () => {
  it('a searching guard in the dark takes a torch; a searching dog in the dark never does', async () => {
    const { Enemy: EnemyClass } = await import('../src/ai/enemy');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    const setOn = vi.fn();
    const torches = [
      { id: 'torch-0', kind: 'flashlight', x: 0, y: -50, z: 0, radius: 13, on: false },
      { id: 'torch-1', kind: 'flashlight', x: 0, y: -50, z: 0, radius: 13, on: false },
    ];
    const world = {
      level: { lights: { lights: torches, setOn }, cover: [], coverSegments: [] },
      layout: { rooms: [] },
      doors: { list: [] },
      // pitch dark everywhere
      lightField: { levelAt: () => 0 },
    };
    const em = new EnemyManager({} as Scene, world as unknown as World, { walk: new Uint8Array(4) } as unknown as NavGrid, {} as DamageRegistry, {} as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
    // stand-ins on the real class (its torch rule and torch placement), no meshes
    const mk = (kind: 'grunt' | 'dog'): Enemy => Object.assign(Object.create(EnemyClass.prototype) as Enemy, { id: kind, health: { alive: true }, def: ENEMIES[kind], aware: { level: 'searching' }, los: false, pos: { x: 0, y: 0, z: 0 }, yaw: 0, crouch: 0 });
    const dog = mk('dog');
    const grunt = mk('grunt');
    em.enemies.push(dog, grunt);
    (em as unknown as { updateTorches(): void }).updateTorches();
    const owner = (em as unknown as { torchOwner: (Enemy | null)[] }).torchOwner;
    expect(owner).not.toContain(dog);
    expect(owner).toContain(grunt);
    expect(em.torchesOn).toBe(1);
    // a torch a dog somehow held is released at once
    owner[1] = dog;
    (em as unknown as { updateTorches(): void }).updateTorches();
    expect(owner).not.toContain(dog);
    expect(setOn).toHaveBeenCalledWith('torch-1', false);
    expect(em.torchesOn).toBe(1);
  });
});
