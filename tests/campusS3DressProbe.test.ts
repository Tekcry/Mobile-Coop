import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { S3_HERO_LOG } from '../src/world/maps/campusS3Dress';

it('probe', () => {
  const b = new LevelBuilder();
  const lay = campusOps.build(b, 0);
  const ps = (lay.campusArt?.placements ?? []).filter((p) => p.section === 2);
  const by: Record<string, number> = {};
  for (const p of ps) by[`${p.cat}:${p.prop}`] = (by[`${p.cat}:${p.prop}`] ?? 0) + 1;
  writeFileSync('C:/NightShift/scratch/s3w/probe.txt', S3_HERO_LOG.join('\n') + '\n' + JSON.stringify(by) + '\n');
}, 300000);
