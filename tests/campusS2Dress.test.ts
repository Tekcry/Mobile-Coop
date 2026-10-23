import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { S2_DRESS_LOG } from '../src/world/maps/campusS2Dress';

describe('explore', () => {
  it('prints', () => {
    const b = new LevelBuilder();
    const lay = campusOps.build(b, 0);
    const ps = (lay.campusArt?.placements ?? []).filter((p) => p.section === 1);
    const by: Record<string, number> = {};
    for (const p of ps) by[`${p.cat}:${p.prop}`] = (by[`${p.cat}:${p.prop}`] ?? 0) + 1;
    writeFileSync('C:/NightShift/scratch/s2-explore.txt', JSON.stringify(by) + '\nLOG\n' + S2_DRESS_LOG.join('\n'));
    expect(1).toBe(1);
  });
});
