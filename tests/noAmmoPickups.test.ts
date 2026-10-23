import { describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { checkMapLayout } from '../src/world/mapCheck';

describe('no ammo pickups inside sections (Michael, 2026-10-23)', () => {
  it('every map in MAPS builds with zero pickups and passes the layout check', async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { MAPS } = await import('../src/world/maps');
    for (const map of MAPS) {
      const layout = map.build(new LevelBuilder(), 1);
      expect(layout.pickups, map.id).toEqual([]);
      expect(checkMapLayout(map.id, layout), map.id).toEqual([]);
    }
  });
  it('the check rejects a literal layout with an ammo pickup', () => {
    const bad = { pickups: [{ pos: new Vector3(1, 0, 2), kind: 'ammo' as const }] };
    expect(checkMapLayout('x', bad)).toEqual(['x: ammo pickup 0 at (1, 2) inside a section: no ammo within sections']);
    expect(checkMapLayout('x', { pickups: [] })).toEqual([]);
  });
});
