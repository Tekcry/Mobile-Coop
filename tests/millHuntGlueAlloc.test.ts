import { describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { Enemy } from '../src/ai/enemy';
import type { HuntBoard } from '../src/ai/millHunt';
import { flags } from '../src/core/flags';
import { THORNBECK_GUARDS, THORNBECK_SECTORS } from '../src/world/maps/thornbeckMill';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';
import type { Scene } from '../src/core/babylon';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import type { SectorGuard } from '../src/game/sectors';

// (guard-ai mill-hunt H3, update to PR 1's final board) The board tick with the goal hand-off allocates nothing: the
// manager copies each hunt guard's goal from the board's arrays (`gx` / `gz` / `gface` / `gspeed` at his `mhIdx`) into
// his `mhPt` / `mhFace` / `mhSpeed`, with no call per member (the old `out` callback boxed one double per member: 192 B a
// tick for 12). Real `Enemy` objects: a class instance writes a double field in place, where the `Object.assign`
// stand-ins of tests/millHuntGlue.test.ts (dictionary properties) box 16 B for each double written; a file of its own,
// so the stand-ins' feedback (many shapes: the manager's stores go generic and box) does not reach the code measured.

// no physics here: the real guards build no hit boxes
vi.mock('../src/ai/hitboxes', () => ({ Hitboxes: class { sync(): void {} setSolid(): void {} dispose(): void {} } }));

/** A manager on the storm mill (its `map.sectors`: the section's `hunt`) and the section's 12 guards as real `Enemy`
 *  objects (a null-engine scene, no guard models) on their slots, slot and pair tags as `placeSlot` sets them, in its
 *  list before the dark (`sceneDark = true` puts them on the hunt). */
async function realMill(): Promise<{ em: EnemyManager; list: Enemy[] }> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const scene = new B.Scene(new NullEngine());
  const gw = { parts: new PartLibrary(scene), map: { id: 'testmap', theme: { faction: 'urban' } }, addShadowCaster: () => {} };
  const ctx = { scene, world: gw, diff: DIFFICULTY.normal, nav: { heightAt: (_x: number, _z: number, y: number) => y }, registry: { removeTarget: () => {} }, players: () => [], enemies: () => [], releaseCover: () => {} };
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
    lightField: { levelAt: () => 0 },
    map: { id: 'thornbeckMill', sectors: THORNBECK_SECTORS },
  };
  const em = new EnemyManager({} as Scene, world as unknown as World, { walk: new Uint8Array(4), heightAt: () => 0 } as unknown as NavGrid, {} as DamageRegistry, {} as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  const list = em.enemies as Enemy[];
  const models = flags.guardModels;
  flags.guardModels = false;
  try {
    const slots = THORNBECK_GUARDS as readonly SectorGuard[];
    for (let k = 0; k < slots.length; k++) {
      const s = slots[k]!;
      const e = new Enemy(ctx as never, ENEMIES.grunt, new B.Vector3(s.x, s.y ?? 0, s.z), 0);
      e.slotIdx = k;
      e.pairSlot = s.pair ?? -1;
      list.push(e);
    }
  } finally {
    flags.guardModels = models;
  }
  return { em, list };
}

describe('mill-hunt H3: the board tick and the goal hand-off', () => {
  it('re-admission, the board and the goals copied to the 12 guards allocate nothing (under one HeapNumber a tick)', async () => {
    const flag0 = flags.millHunt;
    flags.millHunt = true;
    try {
      const { em, list } = await realMill();
      em.sceneDark = true;
      const hb = em.millHunt!;
      for (const e of list) {
        expect(e.mhOn && e.level === 'searching').toBe(true);
        expect(e.mhIdx).toBe(hb.memberIndex(e));
        expect(hb.mOn[e.mhIdx]).toBe(1);
      }
      const t = em as unknown as { mhTick(hb: HuntBoard<Enemy>): void };
      // 30 s of board ticks, each guard put on his goal after each (the walk without the nav): the start spread,
      // regroups, legs, holds and loops
      for (let k = 0; k < 150; k++) {
        t.mhTick(hb);
        for (const e of list) {
          e.pos.x = e.mhPt[0];
          e.pos.z = e.mhPt[1];
        }
      }
      for (const e of list) {
        expect(e.mhPt[0]).toBe(hb.gx[e.mhIdx]);
        expect(e.mhPt[1]).toBe(hb.gz[e.mhIdx]);
        expect(Object.is(e.mhFace, hb.gface[e.mhIdx])).toBe(true);
        expect(e.mhSpeed).toBe(hb.gspeed[e.mhIdx]);
      }
      const per = await bytesPerCall(
        (n) => {
          for (let k = 0; k < n; k++) t.mhTick(hb);
        },
        0,
        { n: 300, warm: 3000 },
      );
      expect(per).toBeLessThan(HEAP_NUMBER);
    } finally {
      flags.millHunt = flag0;
    }
  }, 120000);
});
