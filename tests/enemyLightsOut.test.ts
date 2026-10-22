import { describe, expect, it, vi } from 'vitest';
import { EnemyManager, LIGHTS_OUT_FLOOR } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import type { Enemy } from '../src/ai/enemy';
import type { Scene } from '../src/core/babylon';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (sector-redesign part 6) a wall switch going dark sends the nearest calm guard on the switch's own floor: S2's reception
// panel (-8.4, 0, -28.5) lures #1 at the reception desk (G, 12.1 m), not #4 on the L2 balcony (8.4 m up, 7.8 m in plan)

function manager(): EnemyManager {
  const world = { level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1) };
  return new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, {} as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
}

function guard(x: number, y: number, z: number) {
  return { alive: true, alerted: false, def: { melee: false }, pos: { x, y, z }, hear: vi.fn(), notice: vi.fn() };
}

describe('EnemyManager.lightsOut floor', () => {
  it('a switch with a floor sends the nearest guard on that floor, not one storeys above it', () => {
    const em = manager();
    const g1 = guard(-20, 0, -24.9);
    const g4 = guard(-11.5, 8.4, -21.3);
    em.enemies.push(g1 as unknown as Enemy, g4 as unknown as Enemy);
    em.lightsOut(-8.4, -28.5, 0);
    expect(g1.hear).toHaveBeenCalledTimes(1);
    expect(g4.hear).not.toHaveBeenCalled();
    // the other one still turns to look
    expect(g4.notice).toHaveBeenCalledTimes(1);
    expect(LIGHTS_OUT_FLOOR).toBeLessThan(4.4);
  });

  it('without a floor (a shot lamp, an EMP) the nearest in plan comes, as before', () => {
    const em = manager();
    const g1 = guard(-20, 0, -24.9);
    const g4 = guard(-11.5, 8.4, -21.3);
    em.enemies.push(g1 as unknown as Enemy, g4 as unknown as Enemy);
    em.lightsOut(-8.4, -28.5);
    expect(g4.hear).toHaveBeenCalledTimes(1);
    expect(g1.hear).not.toHaveBeenCalled();
  });
});
