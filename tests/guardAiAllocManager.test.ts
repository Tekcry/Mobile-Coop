import { describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import type { Enemy, PlayerRef } from '../src/ai/enemy';
import type { NavGrid } from '../src/ai/navGrid';
import { DIFFICULTY } from '../src/ai/archetypes';
import { Vector3, type Scene } from '../src/core/babylon';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import type { World } from '../src/world/world';
import { bytesPerCall } from './helpers/allocPerCall';

// (guard-ai-alloc D2) The manager's 0.5 s tick (the flow field's goals, the flanker's held-cover check) and the
// `searchSlot` callback (per search ring point) run index loops into kept buffers: no closures, iterators or arrays.

type FakePlayer = { id: string; target: { alive: boolean }; feet: Vector3; speed: number; crouched: boolean; cover: object | null; coverT: number };
const player = (id: string, x: number, y: number, z: number, alive = true): FakePlayer => ({ id, target: { alive }, feet: new Vector3(x, y, z), speed: 0, crouched: false, cover: null, coverT: 0 });

function manager(ps: FakePlayer[]) {
  const world = { level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] } };
  const calls: { goals: unknown; pts: number[][]; ys: number[] }[] = [];
  const nav = {
    walk: new Uint8Array(4),
    version: 0,
    nearestWalkable: vi.fn(() => -1),
    lineClear: vi.fn(() => true),
    findPath: vi.fn(() => null),
    heightAt: vi.fn(() => 0),
    flowField: (goals: [number, number][], out: Float32Array, ys: number[]) => {
      calls.push({ goals, pts: goals.map((g) => [g[0], g[1]]), ys: ys.slice() });
      return out;
    },
  };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, {} as Ballistics, {} as Vfx, DIFFICULTY.normal, () => ps as unknown as readonly PlayerRef[]);
  em.stealth = false;
  const p = em as unknown as { refreshFlow(): void; assignFlanker(): void; ctx: { searchSlot(e: Enemy): number } };
  return { em, p, calls, nav };
}

describe('guard-ai-alloc D2: the flow field goals', () => {
  it('passes the live players in order, with their heights, from kept buffers', () => {
    const ps = [player('a', 1, 0, 2), player('b', 3, 4, 5, false), player('c', 6, 7, 8)];
    const m = manager(ps);
    m.calls.length = 0;
    m.p.refreshFlow();
    ps[0]!.feet.set(9, 1, 9);
    ps[1]!.target.alive = true;
    m.p.refreshFlow();
    ps[0]!.target.alive = false;
    ps[1]!.target.alive = false;
    ps[2]!.target.alive = false;
    m.p.refreshFlow();
    expect(m.calls.length).toBe(2);
    expect(m.calls[0]!.pts).toEqual([
      [1, 2],
      [6, 8],
    ]);
    expect(m.calls[0]!.ys).toEqual([0, 7]);
    expect(m.calls[1]!.pts).toEqual([
      [9, 9],
      [3, 5],
      [6, 8],
    ]);
    expect(m.calls[1]!.ys).toEqual([1, 4, 7]);
    // the same goals array both times
    expect(m.calls[0]!.goals).toBe(m.calls[1]!.goals);
  });

  it('allocates nothing per refresh once its buffers are made', async () => {
    const ps = [player('a', 1, 0, 2), player('b', 3, 4, 5)];
    const m = manager(ps);
    (m.nav as { flowField: unknown }).flowField = (_g: unknown, out: Float32Array) => out;
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) m.p.refreshFlow();
    }, 0);
    expect(per).toBeLessThan(16);
  });
});

describe('guard-ai-alloc D2: the flanker check and the search slot', () => {
  it('picks a flanker only while a live player has held cover over 4 s', () => {
    const ps = [player('a', 0, 0, 0), player('b', 0, 0, 0)];
    const m = manager(ps);
    const g = { alive: true, alerted: true, def: { melee: null, usesCover: true }, hold: null, targetDist: 5 } as unknown as Enemy;
    m.em.enemies.push(g);
    m.p.assignFlanker();
    expect(m.em.flanker).toBeNull();
    ps[1]!.cover = {};
    ps[1]!.coverT = 4.5;
    ps[1]!.target.alive = false;
    m.p.assignFlanker();
    expect(m.em.flanker).toBeNull();
    ps[1]!.target.alive = true;
    m.p.assignFlanker();
    expect(m.em.flanker).toBe(g);
  });

  it('counts the searching guards numbered before him, and allocates nothing', async () => {
    const m = manager([]);
    const mk = (num: number, level: string, alive = true) => ({ num, level, alive }) as unknown as Enemy;
    const me = mk(5, 'searching');
    m.em.enemies.push(mk(1, 'searching'), mk(2, 'alert'), mk(3, 'searching', false), me, mk(4, 'searching'), mk(7, 'searching'));
    expect(m.p.ctx.searchSlot(me)).toBe(2);
    const ctx = m.p.ctx;
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) ctx.searchSlot(me);
    }, 0);
    expect(per).toBeLessThan(16);
  });
});
