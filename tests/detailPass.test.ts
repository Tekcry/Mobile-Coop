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
      expect(detailPieces(before, map.id, 'ultra').length).toBeLessThanOrEqual(added.length);
    }
  });
});
