// (map-ready S4) The prebake's shared part: campusOps built in Node the way `World.create` builds its light set
// (`world/world.ts`: the builder, the flicker and sway passes, `prepare`: the light set ignores `detail`), its fixed
// lights and the game's own lamp key (`lampKeyOf`, never a copy), the cache folder, the shard bake. Run through vitest
// (`vitest.prebake.config.ts`: TS in Node, no new package) by `scripts/prebake.mjs`; see its header.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LevelBuilder } from '../../src/world/levelBuilder';
import { campusOps } from '../../src/world/maps/campusOps';
import { applyMapFlicker } from '../../src/world/lampFlicker';
import { applyMapSway } from '../../src/world/lampSway';
import { dressingOn } from '../../src/world/detailPass';
import { bakedLights, lampKeyOf } from '../../src/world/lightBake';
import { fnv } from '../../src/voxel/lightShapes';
import { bakeLamps, LAMP_STRIDE, type LampResult } from '../../src/voxel/lampBake';
import { packLamps, unpackLamps } from '../../src/world/shippedBake';
import { PREVIEW_ON } from '../../src/core/flags';

export const MAP_ID = 'campusOps';
/** The seed the prebake builds with (A16: the key and the bytes are the same for every seed). */
export const PREBAKE_SEED = 1;
/** Shard files (`shard-<i>.prebake.ts`): lamp j goes to shard j % SHARDS. */
export const SHARDS = 8;
/** (prebake-preview) The build variant this prebake is for: the /preview/ build (`PREVIEW_ON`, from the `define` in
 *  `vitest.prebake.config.ts`) bakes its own campus layout; `scripts/prebake.mjs` keeps one cache folder per variant. */
export const VARIANT: 'live' | 'preview' = PREVIEW_ON ? 'preview' : 'live';

/** The repo root (the vitest root) and the cache folder (gitignored; CI keeps it with `actions/cache`). */
export const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const CACHE = join(ROOT, '.prebake-cache');

export interface Campus {
  shapes: Float32Array;
  lo: [number, number, number];
  hi: [number, number, number];
  lights: Float32Array;
  key: string;
  /** The cache folder name: `fnv(key)` in base 36 (a key holds `:`, not a folder name on Windows). */
  h: string;
}

export interface Plan {
  map: string;
  /** (prebake-preview) `VARIANT`. */
  variant: 'live' | 'preview';
  key: string;
  h: string;
  lamps: number;
  lo: [number, number, number];
  hi: [number, number, number];
  /** `<h>/campusOps.json` already holds this key: nothing to bake. */
  cached: boolean;
}

export function folderOf(key: string): string {
  return fnv(new TextEncoder().encode(key)).toString(36);
}

/** campusOps' light set and fixed lights as the game builds them, and the game's lamp key. */
export function buildCampus(): Campus {
  const b = new LevelBuilder();
  campusOps.build(b, PREBAKE_SEED);
  applyMapFlicker(b.lights, MAP_ID, PREBAKE_SEED);
  applyMapSway(b, MAP_ID);
  const { light } = b.prepare(MAP_ID, { dressing: dressingOn(campusOps) });
  const { lights } = bakedLights(b.lights);
  const key = lampKeyOf(MAP_ID, light.hash, lights);
  return { shapes: light.shapes, lo: light.lo, hi: light.hi, lights, key, h: folderOf(key) };
}

/** Phase (a): `.prebake-cache/plan.json`. */
export function writePlan(): Plan {
  const c = buildCampus();
  const man = join(CACHE, c.h, `${MAP_ID}.json`);
  // (cached: the manifest holds this key and every file it names is there; a partial restore bakes again)
  let cached = false;
  if (existsSync(man)) {
    try {
      const m = JSON.parse(readFileSync(man, 'utf8')) as { key?: string; files?: { name: string }[] };
      cached = m.key === c.key && Array.isArray(m.files) && m.files.length > 0 && m.files.every((f) => existsSync(join(CACHE, c.h, f.name)));
    } catch {
      cached = false;
    }
  }
  const plan: Plan = { map: MAP_ID, variant: VARIANT, key: c.key, h: c.h, lamps: c.lights.length / LAMP_STRIDE, lo: c.lo, hi: c.hi, cached };
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(join(CACHE, 'plan.json'), JSON.stringify(plan, null, 2));
  return plan;
}

export function readPlan(): Plan {
  return JSON.parse(readFileSync(join(CACHE, 'plan.json'), 'utf8')) as Plan;
}

/** The campus again, checked against the plan (a shard or the join never bakes another layout). */
export function campusOfPlan(plan: Plan): Campus {
  const c = buildCampus();
  if (c.key !== plan.key) throw new Error(`prebake: the campus key changed since the plan (${plan.key} -> ${c.key})`);
  return c;
}

export function shardPath(h: string, i: number): string {
  return join(CACHE, h, `shard-${i}.bin`);
}

/** The lamps of shard `i` (bake indices j with j % count === i, ascending). */
export function shardIds(i: number, count: number, lamps: number): number[] {
  const ids: number[] = [];
  for (let j = i; j < lamps; j += count) ids.push(j);
  return ids;
}

/**
 * Phase (b): shard `i` of `count`, each lamp baked alone as the workers bake it (`voxel/sectionJobs.ts` `dispatch`),
 * packed to `<h>/shard-<i>.bin`. A shard file already there with the right lamps is kept (a rerun after a cut-off).
 */
export function bakeShard(i: number, count: number): void {
  const plan = readPlan();
  if (plan.cached) return;
  const path = shardPath(plan.h, i);
  const ids = shardIds(i, count, plan.lamps);
  if (existsSync(path)) {
    const u = unpackLamps(new Uint8Array(readFileSync(path)));
    if (u && u.ids.length === ids.length && u.ids.every((id, k) => id === ids[k])) return;
  }
  const c = campusOfPlan(plan);
  const parts: LampResult[] = [];
  for (const j of ids) {
    parts.push(bakeLamps({ kind: 'lamps', id: j, shapes: c.shapes, lights: c.lights.slice(j * LAMP_STRIDE, (j + 1) * LAMP_STRIDE), lo: c.lo, hi: c.hi }));
  }
  mkdirSync(join(CACHE, plan.h), { recursive: true });
  writeFileSync(path, packLamps(ids, parts));
}
