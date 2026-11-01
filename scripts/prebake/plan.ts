// (map-ready S4) The prebake's shared part: each shipped map (`SHIPPED_BAKE_MAPS`: campusOps; piano SO2 made it a list)
// built in Node the way `World.create` builds its light set (the shared `buildMapLights` in
// `world/mapLights.ts`: the builder, the flicker pass, the sway pass; then
// `prepare`: the light set ignores `detail`), its fixed lights and the game's own lamp key
// (`lampKeyOf`, never a copy), the cache folder (one `<h>` folder per map), the shard bake. Run through vitest
// (`vitest.prebake.config.ts`: TS in Node, no new package) by `scripts/prebake.mjs`; see its header.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LevelBuilder } from '../../src/world/levelBuilder';
import type { MapDef } from '../../src/world/mapDef';
import { campusOps } from '../../src/world/maps/campusOps';
import { buildMapLights } from '../../src/world/mapLights';
import { dressingOn } from '../../src/world/detailPass';
import { bakedLights, lampKeyOf } from '../../src/world/lightBake';
import { fnv } from '../../src/voxel/lightShapes';
import { bakeLamps, LAMP_STRIDE, type LampResult } from '../../src/voxel/lampBake';
import { packLamps, SHIPPED_BAKE_MAPS, unpackLamps } from '../../src/world/shippedBake';
import { PREVIEW_ON } from '../../src/core/flags';

/** The seed the prebake builds with (A16: the key and the bytes are the same for every seed). */
export const PREBAKE_SEED = 1;
/** Shard files (`shard-<i>.prebake.ts`): lamp j of every map goes to shard j % SHARDS. */
export const SHARDS = 8;
/** (prebake-preview) The build variant this prebake is for: the /preview/ build (`PREVIEW_ON`, from the `define` in
 *  `vitest.prebake.config.ts`) bakes its own campus layout; `scripts/prebake.mjs` keeps one cache folder per variant. */
export const VARIANT: 'live' | 'preview' = PREVIEW_ON ? 'preview' : 'live';

/** The map definitions the prebake can build, by id. */
const MAP_DEFS: Readonly<Record<string, MapDef>> = { campusOps };

/** The maps the prebake bakes, in `SHIPPED_BAKE_MAPS` order (the game reads `bakes/<id>.json` for exactly these). */
export const PREBAKE_MAPS: readonly MapDef[] = SHIPPED_BAKE_MAPS.map((id) => {
  const d = MAP_DEFS[id];
  if (!d) throw new Error(`prebake: no map definition for shipped map ${id}`);
  return d;
});

/** The repo root (the vitest root) and the cache folder (gitignored; CI keeps it with `actions/cache`). */
export const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const CACHE = join(ROOT, '.prebake-cache');

export interface BuiltMap {
  map: string;
  shapes: Float32Array;
  lo: [number, number, number];
  hi: [number, number, number];
  lights: Float32Array;
  key: string;
  /** The cache folder name: `fnv(key)` in base 36 (a key holds `:`, not a folder name on Windows). */
  h: string;
}

/** One map's part of the plan. */
export interface MapPlan {
  map: string;
  key: string;
  h: string;
  lamps: number;
  lo: [number, number, number];
  hi: [number, number, number];
  /** `<h>/<map>.json` already holds this key: nothing to bake for this map. */
  cached: boolean;
}

export interface Plan {
  /** (prebake-preview) `VARIANT`. */
  variant: 'live' | 'preview';
  maps: MapPlan[];
}

export function folderOf(key: string): string {
  return fnv(new TextEncoder().encode(key)).toString(36);
}

function defOf(id: string): MapDef {
  const d = MAP_DEFS[id];
  if (!d) throw new Error(`prebake: unknown map ${id}`);
  return d;
}

/** A map's light set and fixed lights as the game builds them, and the game's lamp key. */
export function buildMap(def: MapDef): BuiltMap {
  const id = def.id;
  const b = new LevelBuilder();
  buildMapLights(b, def, PREBAKE_SEED);
  const { light } = b.prepare(id, { dressing: dressingOn(def) });
  const { lights } = bakedLights(b.lights);
  const key = lampKeyOf(id, light.hash, lights);
  return { map: id, shapes: light.shapes, lo: light.lo, hi: light.hi, lights, key, h: folderOf(key) };
}

/** campusOps' light set (the campus tests and `prebakePreview.test.ts` read it). */
export function buildCampus(): BuiltMap {
  return buildMap(campusOps);
}

/** `<h>/<map>.json` holds `key` and every file it names is there (a partial restore bakes again). */
function cachedAt(map: string, h: string, key: string): boolean {
  const man = join(CACHE, h, `${map}.json`);
  if (!existsSync(man)) return false;
  try {
    const m = JSON.parse(readFileSync(man, 'utf8')) as { key?: string; files?: { name: string }[] };
    return m.key === key && Array.isArray(m.files) && m.files.length > 0 && m.files.every((f) => existsSync(join(CACHE, h, f.name)));
  } catch {
    return false;
  }
}

/** Phase (a): `.prebake-cache/plan.json`, one entry per shipped map. */
export function writePlan(): Plan {
  const maps = PREBAKE_MAPS.map((def): MapPlan => {
    const c = buildMap(def);
    return { map: c.map, key: c.key, h: c.h, lamps: c.lights.length / LAMP_STRIDE, lo: c.lo, hi: c.hi, cached: cachedAt(c.map, c.h, c.key) };
  });
  const plan: Plan = { variant: VARIANT, maps };
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(join(CACHE, 'plan.json'), JSON.stringify(plan, null, 2));
  return plan;
}

export function readPlan(): Plan {
  return JSON.parse(readFileSync(join(CACHE, 'plan.json'), 'utf8')) as Plan;
}

/** The map again, checked against its plan (a shard or the join never bakes another layout). */
export function mapOfPlan(p: MapPlan): BuiltMap {
  const c = buildMap(defOf(p.map));
  if (c.key !== p.key) throw new Error(`prebake: the ${p.map} key changed since the plan (${p.key} -> ${c.key})`);
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
 * Phase (b): shard `i` of `count` for every map not cached, each lamp baked alone as the workers bake it
 * (`voxel/sectionJobs.ts` `dispatch`), packed to `<h>/shard-<i>.bin`. A shard file already there with the right lamps
 * is kept (a rerun after a cut-off).
 */
export function bakeShard(i: number, count: number): void {
  for (const p of readPlan().maps) {
    if (p.cached) continue;
    const path = shardPath(p.h, i);
    const ids = shardIds(i, count, p.lamps);
    if (existsSync(path)) {
      const u = unpackLamps(new Uint8Array(readFileSync(path)));
      if (u && u.ids.length === ids.length && u.ids.every((id, k) => id === ids[k])) continue;
    }
    const c = mapOfPlan(p);
    const parts: LampResult[] = [];
    for (const j of ids) {
      parts.push(bakeLamps({ kind: 'lamps', id: j, shapes: c.shapes, lights: c.lights.slice(j * LAMP_STRIDE, (j + 1) * LAMP_STRIDE), lo: c.lo, hi: c.hi }));
    }
    mkdirSync(join(CACHE, p.h), { recursive: true });
    writeFileSync(path, packLamps(ids, parts));
  }
}
