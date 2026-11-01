// (map-ready S4) Prebake phase (c), per map not cached: the shards joined into one gzip file per section (each lamp in
// the file of the lowest section it counts for, `lampSectionMasks`; lamps of no section in `s<sections>`; a map with
// no section split ships every lamp in `s0`) and the manifest `<h>/<map>.json`; the shard files go.
// The caps, `current.json` and the prune are `scripts/prebake.mjs`'s.
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { expect, test } from 'vitest';
import { lampSectionMasks, sectionBakeFor } from '../../src/world/sectionBake';
import { LAMP_VERSION } from '../../src/voxel/lampJobs';
import { CANON_VERSION } from '../../src/voxel/lightShapes';
import type { LampResult } from '../../src/voxel/lampBake';
import { joinShipped, packLamps, unpackLamps, type ShippedFile, type ShippedManifest } from '../../src/world/shippedBake';
import { CACHE, mapOfPlan, readPlan, SHARDS, shardPath, type MapPlan } from './plan';

const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');

function joinMap(p: MapPlan): void {
  const c = mapOfPlan(p);
  const n = p.lamps;
  const byId: (LampResult | null)[] = new Array<LampResult | null>(n).fill(null);
  for (let i = 0; i < SHARDS; i++) {
    const u = unpackLamps(new Uint8Array(readFileSync(shardPath(p.h, i))));
    if (!u) throw new Error(`prebake: ${p.map} shard ${i} unreadable`);
    u.ids.forEach((id, k) => {
      byId[id] = u.parts[k]!;
    });
  }
  const missing = byId.findIndex((x) => !x);
  if (missing >= 0) throw new Error(`prebake: ${p.map} lamp ${missing} missing from the shards`);
  const parts = byId as LampResult[];
  // (the files' lamps, joined, are a whole result: every lamp once, the layout's boxes)
  const all = Int32Array.from({ length: n }, (_, i) => i);
  expect(joinShipped(c.lights, c.lo, c.hi, all, parts), `${p.map} joined shards`).not.toBeNull();
  const def = sectionBakeFor(p.map);
  const sections = def ? def.regions.length : 0;
  const masks = def ? lampSectionMasks(c.lights, def) : new Int32Array(n);
  const groups: number[][] = Array.from({ length: sections + 1 }, () => []);
  for (let i = 0; i < n; i++) {
    const m = masks[i]!;
    groups[m ? 31 - Math.clz32(m & -m) : sections]!.push(i);
  }
  const files: ShippedFile[] = [];
  groups.forEach((ids, k) => {
    if (!ids.length) return;
    const raw = packLamps(ids, ids.map((i) => parts[i]!));
    const gz = gzipSync(raw, { level: 9 });
    const name = `${p.map}-${p.h}-s${k}.bin.gz`;
    writeFileSync(join(CACHE, p.h, name), gz);
    files.push({ name, bytes: gz.length, sha256: sha(gz), rawBytes: raw.length, rawSha256: sha(raw), lampIds: ids });
  });
  const man: ShippedManifest = { map: p.map, key: p.key, lampVersion: LAMP_VERSION, canonVersion: CANON_VERSION, lamps: n, files };
  writeFileSync(join(CACHE, p.h, `${p.map}.json`), JSON.stringify(man));
  for (let i = 0; i < SHARDS; i++) rmSync(shardPath(p.h, i), { force: true });
}

test('prebake join', () => {
  for (const p of readPlan().maps) if (!p.cached) joinMap(p);
});
