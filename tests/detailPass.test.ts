import { describe, expect, it } from 'vitest';
import { detailPieces, shade } from '../src/world/detailPass';
import { generateLedges } from '../src/world/anchors';
import { buildCoverSegments } from '../src/cover/coverData';

describe('map detail pass (3.0)', () => {
  it('shade', () => {
    expect(shade('#808080', 0.5)).toBe('#404040');
    expect(shade('#ff0000', 2)).toBe('#ff0000');
  });
  it('every map: the dressing never collides, and cover faces, ledges and the solid set are unchanged', async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { MAPS } = await import('../src/world/maps');
    for (const map of MAPS) {
      const b = new LevelBuilder();
      map.build(b, 1);
      const before = [...b.boxes];
      const added = detailPieces(before, map.id, 'epic');
      expect(added.length, map.id).toBeGreaterThan(20);
      expect(added.every((p) => !p.collide && p.noLedge && p.detail)).toBe(true);
      const after = [...before, ...added];
      // (piece ids of the cylinders shift past the added boxes; the faces themselves must match)
      const faces = (segs: ReturnType<typeof buildCoverSegments>): string => JSON.stringify(segs.map(({ piece: _p, ...f }) => f));
      expect(faces(buildCoverSegments(after, b.cylinders)), map.id).toBe(faces(buildCoverSegments(before, b.cylinders)));
      const la = generateLedges(before).ledges.map((l) => [l.a, l.b, l.top]);
      const lb = generateLedges(after).ledges.map((l) => [l.a, l.b, l.top]);
      expect(JSON.stringify(lb), map.id).toBe(JSON.stringify(la));
      expect(after.filter((p) => p.collide).length).toBe(before.filter((p) => p.collide).length);
      // deterministic, and nothing at 'high'
      expect(detailPieces(before, map.id, 'epic').length).toBe(added.length);
      expect(detailPieces(before, map.id, 'high').length).toBe(0);
      // (sector-redesign slice 1) only for maps that are dressed: the tiers draw from one random stream, so on a map that opts out
      // (`detail: false`, nothing is built) the ultra count is not bound by the epic one
      if (map.detail !== false || map.id === 'kestrel') expect(detailPieces(before, map.id, 'ultra').length).toBeLessThanOrEqual(added.length);
    }
  });
});

describe('MapDef detail opt-out (ON0b)', () => {
  it('Kestrel builds no dressing and bakes none; the warehouse keeps its usual count', async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { MAPS } = await import('../src/world/maps');
    const { dressingOn } = await import('../src/world/detailPass');
    const { canonicalLightShapes } = await import('../src/voxel/lightShapes');
    const kestrel = MAPS.find((m) => m.id === 'kestrel')!;
    const warehouse = MAPS.find((m) => m.id === 'warehouse')!;
    expect(kestrel.detail).toBe(false);
    expect(dressingOn(kestrel)).toBe(false);
    expect(dressingOn(warehouse)).toBe(true);
    // (sector-redesign slice 1) Saltmarsh Park is a greybox: no dressing either; (marlow-final 0e) Marlow Yard's kit
    // dresses every wall itself
    expect(MAPS.filter((m) => !dressingOn(m)).map((m) => m.id)).toEqual(['campusOps', 'kestrel', 'ctcourse', 'tallowWharf']);
    const count = (map: typeof kestrel): { dressing: number; shapes: number; plain: number } => {
      const b = new LevelBuilder();
      map.build(b, 1);
      const dressing = dressingOn(map) ? detailPieces(b.boxes, map.id, 'epic').length : 0;
      return { dressing, shapes: canonicalLightShapes(b.boxes, b.cylinders, map.id, dressingOn(map)).length, plain: canonicalLightShapes(b.boxes, b.cylinders, map.id, false).length };
    };
    const k = count(kestrel);
    expect(k.dressing).toBe(0);
    expect(k.shapes).toBe(k.plain);
    const w = count(warehouse);
    expect(w.dressing).toBeGreaterThan(20);
    expect(w.shapes).toBeGreaterThan(w.plain);
  });
});
