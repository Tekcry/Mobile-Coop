import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCampus } from '../src/world/maps/campusOps';
import { sectionCatalogues, sectionContext } from '../src/world/maps/campusDress';
import { CampusDresser } from '../src/world/campusArt/dresser';

describe('probe', () => {
  it('seating and vitrine spots', () => {
    const b = new LevelBuilder();
    const lay = buildCampus(b, { dress: false });
    const d = new CampusDresser(b, sectionContext(b, lay, 1, () => []), sectionCatalogues(1));
    type P = [string, number, number, number, 'solid' | 'visual'];
    const group = (ps: P[]): string | null => {
      let n = 0;
      try {
        for (const [piece, x, z, yaw, cls] of ps) { d.add(piece, x, 0, z, yaw, { cls, why: 'probe' }); n++; }
        const c = d.check();
        return c.length ? c[0]! : null;
      } catch (e) { return (e as Error).message; } finally { while (n-- > 0) d.placements.pop(); }
    };
    const out: string[] = [];
    for (const yaw of [-Math.PI / 2, Math.PI / 2])
      for (let x = -29.5; x <= -9; x += 0.5) for (let z = -29; z <= 5; z += 0.5) if (group([['F:modelVitrine', x, z, yaw, 'solid']]) === null) out.push(`vit ${x} ${z} ${yaw.toFixed(2)}`);
    for (let cx = -29; cx <= -9; cx += 0.5) for (let cz = -22.5; cz <= 5; cz += 0.5) {
      if (group([['H2:lowTable', cx, cz, 0, 'solid'], ['F:loungeSeat', cx - 1, cz, Math.PI / 2, 'solid'], ['F:loungeSeat', cx + 1, cz, -Math.PI / 2, 'solid']]) === null) out.push(`seatX ${cx} ${cz}`);
      if (group([['H2:lowTable', cx, cz, Math.PI / 2, 'solid'], ['F:loungeSeat', cx, cz - 1, 0, 'solid'], ['F:loungeSeat', cx, cz + 1, Math.PI, 'solid']]) === null) out.push(`seatZ ${cx} ${cz}`);
    }
    writeFileSync('C:/NightShift/scratch/s2-probe.txt', out.join('\n'));
    expect(1).toBe(1);
  });
});
