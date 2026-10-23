import { it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { MAPS } from '../src/world/maps';
import { dressingOn } from '../src/world/detailPass';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps, fitLampAtlas } from '../src/voxel/lampBake';
import { bakeLamps as oldBake } from '../src/voxel/zzOldLampBake';
import { bakedLights } from '../src/world/lightBake';
it('perf', () => {
  const out: string[] = [];
  for (const map of MAPS) {
    if (!['warehouseOps', 'campusOps', 'ctcourse'].includes(map.id)) continue;
    const b = new LevelBuilder(); map.build(b, 0);
    const set = canonicalLightSet(b.boxes, b.cylinders, map.id, dressingOn(map));
    const { lights } = bakedLights(b.lights);
    const job = { kind: 'lamps' as const, id: 0, shapes: set.shapes, lights, lo: set.lo, hi: set.hi };
    for (const [name, fn] of [['old', oldBake], ['new', bakeLamps], ['old', oldBake], ['new', bakeLamps]] as const) {
      const t0 = performance.now();
      const r = fn(job);
      const ms = performance.now() - t0;
      const a = fitLampAtlas(r.boxes, 2048);
      out.push(`PERF ${map.id} ${name}: total ${ms.toFixed(0)} ms (vis ${r.ms!.vis.toFixed(0)}, bounce ${r.ms!.bounce.toFixed(0)}), cells ${r.vis.length}, atlas ${a.dims.join(' x ')} (${(a.dims[0] * a.dims[1] * a.dims[2] / 1e6).toFixed(2)} M texels), bounce cells ${r.bounce!.data.length}`);
    }
  }
  console.info(out.join('\n'));
}, 1_200_000);
