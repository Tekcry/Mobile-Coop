/**
 * (campus-fence-s2s5) Saltmarsh Park, every section v2 (the /preview/ build: `CAMPUS_V2_ALL`, the art dressing on): no
 * player leaves the playable area of the campus. Michael's walk of S1 ("you can also walk straight out of the fence and
 * out of the playable area") was fixed by S1's anti-climb cap (`campusV2S1Fence.test.ts`); this test holds every section
 * to it, from the collision pieces alone (Babylon-free, `tests/helpers/campusPerimeter.ts`):
 *  - a ground flood from every nav seed and start on the ground (doors open but the locked, unbreachable ones) stays in
 *    the playable area;
 *  - no top a player reaches (the nav seeds' floors, ladders, then every mantle, lip, step, jump and walk-off) is a
 *    mantle or a jump / walk-off over a perimeter line: S2's roof edges and the sunshade under the davit, S3's outer
 *    walls (the ceiling void reads the roof's 9.2 top through its 1.5 m crawl space), S4's compound and the plant deck's
 *    corners, S5's south line (the garden wall, the main roof's kit boxes, the wing's) and the wing's east side;
 *  - the S2-S5 caps are collision only: not drawn, noLedge, no lip along them.
 * The playable area: the five sections' plan boxes (S3 without its sealed east yard), the connectors' rooms (C2 on L1)
 * and the S2 sunshade with its catch. Section-to-section moves are not checked (a landing in another section counts as in).
 */
import { describe, expect, it, vi } from 'vitest';
import { generateLedges } from '../src/world/anchors';
import { collisionPieces, covers, groundFlood, perimeterLaunches, type PerimeterLine } from './helpers/campusPerimeter';

vi.resetModules();
const { flags, CAMPUS_V2_ALL } = await import('../src/core/flags');
flags.campusV2 = CAMPUS_V2_ALL;
const { LevelBuilder } = await import('../src/world/levelBuilder');
const { campusOps } = await import('../src/world/maps/campusOps');
const { CAMPUS_PARTS, CAMPUS_V2_PARTS } = await import('../src/world/maps/campusSections');

const b = new LevelBuilder();
const layout = campusOps.build(b, 0);
const pieces = collisionPieces(b);
const navSeeds = layout.navSeeds ?? [];

/** The playable area: plan boxes x0, x1, z0, z1 and the heights a stand spot in them may have. */
const AREA: readonly (readonly [number, number, number, number, number, number])[] = [
  [-40, 26, -80, -34, -1, 99], // S1
  [-40, 3.7, -34, -30, -1, 99], // S1 by C1 and the pavilion
  [-44, 4, -30, 6, -1, 99], // S2
  [-7.05, -0.95, 6, 8.05, 4.3, 99], // the S2 sunshade (4.4) and its catch
  [4, 10, -16, -12, 4.3, 7.45], // C2, the L1 bridge (not its roof)
  [10, 64, -30, 0, -1, 99], // S3 (the east yard x 64..70 is sealed)
  [22, 26, 0, 16, -1, 3.05], // C3 (not its roof)
  [-10, 40, 16, 48, -1, 99], // S4 with the compound
  [-26, -10, 26, 32, -1, 3.05], // C4 (not its roof)
  [-70, -26, 18, 70, -1, 99], // S5 with its grounds
];
const inside = (x: number, z: number, y: number): boolean => AREA.some(([x0, x1, z0, z1, y0, y1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1 && y >= y0 && y <= y1);

const line = (id: string, a: readonly [number, number], bb: readonly [number, number], out: readonly [number, number]): PerimeterLine => ({ id, a, b: bb, out });
/** The perimeter lines (where the playable area meets ground outside every section, or the map's edge). */
const LINES: readonly PerimeterLine[] = [
  line('S1 south', [-40, -80], [26, -80], [0, -1]),
  line('S1 east', [26, -80], [26, -34], [1, 0]),
  line('S1 west', [-40, -80], [-40, -30], [-1, 0]),
  line('S1 north-east', [4, -34], [26, -34], [0, 1]),
  line('S1 pavilion east', [3.7, -34], [3.7, -30], [1, 0]),
  line('S2 west', [-44, -30], [-44, 6], [-1, 0]),
  line('S2 north', [-44, 6], [4, 6], [0, 1]),
  line('S2 east', [4, -30], [4, 6], [1, 0]),
  line('S2 south', [-44, -30], [4, -30], [0, -1]),
  line('S2 sunshade north', [-7.05, 8.05], [-0.95, 8.05], [0, 1]),
  line('S2 sunshade west', [-7.05, 6], [-7.05, 8.05], [-1, 0]),
  line('S2 sunshade east', [-0.95, 6], [-0.95, 8.05], [1, 0]),
  line('C2 south', [4, -16], [10, -16], [0, -1]),
  line('C2 north', [4, -12], [10, -12], [0, 1]),
  line('S3 west', [10, -30], [10, 0], [-1, 0]),
  line('S3 north', [10, 0], [64, 0], [0, 1]),
  line('S3 south', [10, -30], [64, -30], [0, -1]),
  line('S3 east (the sealed yard)', [64, -30], [64, 0], [1, 0]),
  line('C3 west', [22, 0], [22, 16], [-1, 0]),
  line('C3 east', [26, 0], [26, 16], [1, 0]),
  line('S4 west', [-10, 16], [-10, 48], [-1, 0]),
  line('S4 north', [-10, 48], [40, 48], [0, 1]),
  line('S4 east', [40, 16], [40, 48], [1, 0]),
  line('S4 south', [-10, 16], [40, 16], [0, -1]),
  line('C4 south', [-26, 26], [-10, 26], [0, -1]),
  line('C4 north', [-26, 32], [-10, 32], [0, 1]),
  line('S5 south', [-70, 18], [-26, 18], [0, -1]),
  line('S5 east', [-26, 18], [-26, 70], [1, 0]),
  line('S5 north (the map edge)', [-70, 70], [-26, 70], [0, 1]),
  line('S5 west (the map edge)', [-70, 18], [-70, 70], [-1, 0]),
];

describe('campus v2 perimeter closed, every section (campus-fence-s2s5)', () => {
  it('the preview build: every section comes from campusV2', () => {
    for (let k = 0; k < 5; k++) expect(CAMPUS_PARTS[k]).toBe(CAMPUS_V2_PARTS[k]);
  });

  it('walking: a ground flood from every nav seed and start on the ground stays in the playable area', () => {
    const seeds = [...navSeeds.filter((v) => v.y < 0.5).map((v) => [v.x, v.z] as const), ...layout.playerSpawns.map((s) => [s.pos.x, s.pos.z] as const)];
    const r = groundFlood(b, pieces, { x0: -71, x1: 71, z0: -85, z1: 71, cell: 0.1, seeds, inside: (x, z) => inside(x, z, 0) });
    // the flood fills the five sections' ground floors and the connectors
    expect(r.count).toBeGreaterThan(500000);
    expect(r.outside.slice(0, 5), `${r.outside.length} ground cells outside the playable area reached`).toEqual([]);
  });

  it('over the top: no top a player reaches is a mantle or a jump over a perimeter line', () => {
    const launches = perimeterLaunches(pieces, {
      lines: LINES,
      inside,
      seeds: navSeeds.map((v) => [v.x, v.y, v.z] as const),
      ladderTops: b.anchors.ladders.map((l) => [l.top.x, l.top.y, l.top.z] as const),
    });
    expect(launches).toEqual([]);
  });

  it('the S2-S5 caps are collision only: not drawn, noLedge, no lip along them', async () => {
    const { S2_EDGE_CAPS } = await import('../src/world/maps/campusV2/s2');
    const { S3_EDGE_CAPS } = await import('../src/world/maps/campusV2/s3Shell');
    const { S4_EDGE_CAPS } = await import('../src/world/maps/campusV2/s4');
    const { S5_EDGE_CAPS } = await import('../src/world/maps/campusV2/s5');
    const lines = [...S2_EDGE_CAPS, ...S3_EDGE_CAPS, ...S4_EDGE_CAPS, ...S5_EDGE_CAPS];
    const caps = b.boxes.filter((p) => p.collide && p.visible === false && lines.some(([x0, z0, x1, z1, y0, y1]) => Math.abs(p.c[0] - (x0 + x1) / 2) < 0.06 && Math.abs(p.c[2] - (z0 + z1) / 2) < 0.06 && Math.abs(p.c[1] - (y0 + y1) / 2) < 1e-6));
    expect(caps.length).toBe(lines.length);
    for (const p of caps) expect(p.noLedge, `${p.c}`).toBe(true);
    const led = generateLedges(b.boxes).ledges;
    for (const p of caps) expect(led.filter((l) => covers(p, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.01) && l.top > p.c[1] - p.s[1] / 2 - 1e-3).length, `${p.c} lips`).toBe(0);
  });
});
