import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '../src/core/babylon';
import { PartLibrary } from '../src/world/partLibrary';
import { ENEMIES } from '../src/ai/enemyDefs';
import { buildEnemyRig } from '../src/ai/enemyRig';
import { buildBodyRig } from '../src/ai/body';
import { GUARD_SUN_REACH } from '../src/world/sunCascadeCull';

describe('guard sun reach registration', () => {
  it('guards and guns register once with GUARD_SUN_REACH; bodies with none', () => {
    const scene = new Scene(new NullEngine());
    const parts = new PartLibrary(scene);
    const calls: { m: unknown; reach: unknown }[] = [];
    const world = { parts, map: { theme: { faction: 'urban' } }, addShadowCaster: (m: unknown, reach?: unknown) => { calls.push({ m, reach }); } };
    const random = Math.random;
    let seed = 12345;
    Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    try {
      const { rig, gun } = buildEnemyRig(scene, world as never, ENEMIES.grunt, 'g-grunt');
      expect(gun).not.toBeNull();
      const expected = [...rig.renderMeshes, ...gun!.renderMeshes];
      expect(rig.renderMeshes.length).toBe(2);
      expect(calls.length).toBe(expected.length);
      for (const m of expected) {
        const hits = calls.filter((c) => c.m === m);
        expect(hits.length).toBe(1);
        expect(hits[0]!.reach).toBe(GUARD_SUN_REACH);
      }
      calls.length = 0;
      const body = buildBodyRig(scene, world as never, ENEMIES.grunt, 'b-grunt');
      expect(calls.length).toBe(body.renderMeshes.length);
      expect(calls.length).toBeGreaterThan(0);
      for (const c of calls) expect(c.reach).toBeUndefined();
    } finally {
      Math.random = random;
    }
  });
});
