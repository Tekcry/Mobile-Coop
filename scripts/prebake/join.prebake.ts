// (map-ready S4) Prebake phase (c): the shards joined into one gzip file per section (each lamp in the file of the
// lowest section it counts for, `lampSectionMasks`; lamps of no section in `s<sections>`) and the manifest
// `<h>/campusOps.json`; the shard files go. The caps, `current.json` and the prune are `scripts/prebake.mjs`'s.
import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { expect, test } from 'vitest';
import { CAMPUS_BAKE } from '../../src/world/maps/campusBake';
import { lampSectionMasks } from '../../src/world/sectionBake';
import { LAMP_VERSION } from '../../src/voxel/lampJobs';
import { CANON_VERSION } from '../../src/voxel/lightShapes';
import type { LampResult } from '../../src/voxel/lampBake';
import { joinShipped, packLamps, unpackLamps, type ShippedFile, type ShippedManifest } from '../../src/world/shippedBake';
import { CACHE, campusOfPlan, MAP_ID, readPlan, SHARDS, shardPath } from './plan';

const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');

test('prebake join', () => {
  const plan = readPlan();
  if (plan.cached) return;
  const c = campusOfPlan(plan);
  const n = plan.lamps;
  const byId: (LampResult | null)[] = new Array<LampResult | null>(n).fill(null);
  for (let i = 0; i < SHARDS; i++) {
    const u = unpackLamps(new Uint8Array(readFileSync(shardPath(plan.h, i))));
    if (!u) throw new Error(`prebake: shard ${i} unreadable`);
    u.ids.forEach((id, k) => {
      byId[id] = u.parts[k]!;
    });
  }
  const missing = byId.findIndex((p) => !p);
  if (missing >= 0) throw new Error(`prebake: lamp ${missing} missing from the shards`);
  const parts = byId as LampResult[];
  // (the files' lamps, joined, are a whole result: every lamp once, the layout's boxes)
  const all = Int32Array.from({ length: n }, (_, i) => i);
  expect(joinShipped(c.lights, c.lo, c.hi, all, parts), 'joined shards').not.toBeNull();
  const sections = CAMPUS_BAKE.regions.length;
  const masks = lampSectionMasks(c.lights, CAMPUS_BAKE);
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
    const name = `${MAP_ID}-${plan.h}-s${k}.bin.gz`;
    writeFileSync(join(CACHE, plan.h, name), gz);
    files.push({ name, bytes: gz.length, sha256: sha(gz), rawBytes: raw.length, rawSha256: sha(raw), lampIds: ids });
  });
  const man: ShippedManifest = { map: MAP_ID, key: plan.key, lampVersion: LAMP_VERSION, canonVersion: CANON_VERSION, lamps: n, files };
  writeFileSync(join(CACHE, plan.h, `${MAP_ID}.json`), JSON.stringify(man));
  for (let i = 0; i < SHARDS; i++) rmSync(shardPath(plan.h, i), { force: true });
});
