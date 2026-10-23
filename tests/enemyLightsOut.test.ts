import { describe, expect, it, vi } from 'vitest';
import { EnemyManager, LIGHTS_OUT_BELOW } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import type { Enemy } from '../src/ai/enemy';
import type { Scene } from '../src/core/babylon';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (sector-redesign part 6) uncoordinated modes: a light going dark at fixture height y (a lamp, or a wall switch + 2.5)
// sends the nearest calm guard on its floor: feet not above y and at most LIGHTS_OUT_BELOW under it. S2's reception panel
// (-8.4, 0, -28.5) lures #1 at the reception desk (G, 12.1 m), not #4 on the L2 balcony (8.4 m up, 7.8 m in plan).

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
    em.coordinated = false;
    em.lightsOut(-8.4, -28.5, 0 + 2.5);
    expect(g1.hear).toHaveBeenCalledTimes(1);
    expect(g4.hear).not.toHaveBeenCalled();
    // the other one still turns to look
    expect(g4.notice).toHaveBeenCalledTimes(1);
  });

  it('an L2 switch (8.4 + 2.5) sends the guard on L2, never the nearer one two floors below it', () => {
    const em = manager();
    const gG = guard(-38.8, 0, -24.6);
    const gL2 = guard(-30, 8.4, -24.6);
    em.enemies.push(gG as unknown as Enemy, gL2 as unknown as Enemy);
    em.coordinated = false;
    em.lightsOut(-38.8, -24.6, 8.4 + 2.5);
    expect(8.4 + 2.5 - 0).toBeGreaterThan(LIGHTS_OUT_BELOW);
    expect(gL2.hear).toHaveBeenCalledTimes(1);
    expect(gG.hear).not.toHaveBeenCalled();
    // alone two floors down: nobody is sent
    const em2 = manager();
    const g = guard(-38.8, 0, -24.6);
    em2.enemies.push(g as unknown as Enemy);
    em2.coordinated = false;
    em2.lightsOut(-38.8, -24.6, 8.4 + 2.5);
    expect(g.hear).not.toHaveBeenCalled();
  });

  it('a lamp up to LIGHTS_OUT_BELOW over the floor still sends the guard under it', () => {
    const em = manager();
    const g = guard(2, 0, -12);
    em.enemies.push(g as unknown as Enemy);
    em.coordinated = false;
    em.lightsOut(0, 0, 5);
    expect(g.hear).toHaveBeenCalledTimes(1);
  });

  it('without a floor (a shot lamp, an EMP) the nearest in plan comes, as before', () => {
    const em = manager();
    const g1 = guard(-20, 0, -24.9);
    const g4 = guard(-11.5, 8.4, -21.3);
    em.enemies.push(g1 as unknown as Enemy, g4 as unknown as Enemy);
    em.coordinated = false;
    em.lightsOut(-8.4, -28.5);
    expect(g4.hear).toHaveBeenCalledTimes(1);
    expect(g1.hear).not.toHaveBeenCalled();
  });
});
