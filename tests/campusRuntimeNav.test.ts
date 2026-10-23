// (sector-redesign part-6 fix) The campus route legs on the guards' runtime nav grid: `navGridFromLevel` (what
// `buildNavGrid` runs in the game) over the built campus with an analytic down-cast in place of Havok's, the map's
// nav layers, the player spawn as the seed and the map's nav seeds. The same check as e2e-sectorops (every walked leg of
// every route has a path, the climbs skipped, the same search budgets), so a leg the e2e would fail fails here first.
// The per-section tests' `analyticNav` (smooth ramps, no seeds) stays for their reach checks.
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { runtimeNav } from './helpers/runtimeNav';

const b = new LevelBuilder();
const lay = campusOps.build(b, 0);
const spawn = lay.playerSpawns[0]!.pos;
const nav = runtimeNav(b, spawn, campusOps.navLayers ?? 3, lay.navSeeds ?? []);
const sectors = campusOps.sectors ?? [];

/** The e2e's search budget per section (e2e-sectorops: S1 60000, S2 200000, S3 60000). */
const BUDGET = [60000, 200000, 60000];

describe('campus routes on the runtime nav grid (e2e-sectorops part 6 nav check)', () => {
  for (let s = 0; s < 3; s++) {
    it(`every walked leg of the S${s + 1} routes has a path`, () => {
      const sec = sectors[s]!;
      const fails: string[] = [];
      for (const r of sec.routes) {
        for (let i = 0; i + 1 < r.pts.length; i++) {
          if ((r.climbs ?? []).includes(i)) continue;
          const a = r.pts[i]!;
          const c = r.pts[i + 1]!;
          if (!nav.findPath([a[0], a[1]], [c[0], c[1]], BUDGET[s]!, a[2] ?? 0, c[2] ?? 0)) fails.push(`${r.name} leg ${i} ${JSON.stringify([a, c])}`);
        }
      }
      expect(fails).toEqual([]);
    });
  }
});
