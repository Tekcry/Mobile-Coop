// (map-ready S4, fix (2)) The shipped maps' lamps baked at build time (`npm run build` runs this first; brief
// docs/map-ready/briefs/S4.md, BRIEF A15; piano SO2: every map in `SHIPPED_BAKE_MAPS`, src/world/shippedBake.ts:
// campusOps). Never committed: the files go to `.prebake-cache/` (gitignored; CI keeps it with
// actions/cache) and the build emits them as `bakes/*` (scripts/prebake/emit.ts).
//   PREBAKE=0 node scripts/prebake.mjs     -> "prebake skipped" (and `current.json` removed): the build ships no bake,
//                                             the PC bakes as today
//   PREBAKE_THREADS=<n> node scripts/prebake.mjs  (default: all cores but one, at most 4)
// Phases (vitest runs the TS in Node, scripts/prebake/vitest.prebake.config.ts):
//   (a) plan.prebake: each map built as the game builds it, the game's lamp key -> .prebake-cache/plan.json; a map
//       whose .prebake-cache/<h>/<map>.json already holds that key is not baked (all cached: the next phases skip);
//   (b) shard-0..7.prebake: lamp j of each map baked alone (as the workers do) in shard j % 8 -> <h>/shard-<i>.bin;
//   (c) join.prebake: per map one gzip file per section (one file for a map with no section split) + the manifest
//       <h>/<map>.json.
// Then here, per map: the caps (16 MB a file, 48 MB the map, compressed: over -> every size printed, exit 1); then
// .prebake-cache/current.json ({ maps: [{ map, h, files }] }, what the build emits) and the prune (only the maps'
// folders stay, and the other build variant's: `variants.json`).
// (prebake-preview) The /preview/ build (`VITE_PREVIEW=1`) bakes the preview's own campus layout: the prebake's vitest
// config defines `__PREVIEW__` / `__PREVIEW_ID__` from the same env as vite.config.ts, so `flags` (campusV2 every
// section) and the lamp key match what /preview/ computes. The live game and the named slots (/ct/) bake the live layout.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.prebake-cache');
const CONFIG = 'scripts/prebake/vitest.prebake.config.ts';
const FILE_CAP = 16 * 1024 * 1024;
const MAP_CAP = 48 * 1024 * 1024;

if (process.env.PREBAKE === '0') {
  // (an earlier run's `current.json` would still be emitted: the build ships no bake, so it goes)
  rmSync(join(CACHE, 'current.json'), { force: true });
  console.log('prebake skipped');
  process.exit(0);
}

const t0 = Date.now();

/** One vitest phase; a failure stops the build. */
function phase(filters) {
  const r = spawnSync('npx', ['vitest', 'run', '--config', CONFIG, ...filters], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`prebake: phase ${filters.join(' ')} failed (exit ${r.status ?? r.signal})`);
    process.exit(1);
  }
}

phase(['plan.prebake']);
const plan = JSON.parse(readFileSync(join(CACHE, 'plan.json'), 'utf8'));
const variant = plan.variant ?? 'live';
if (plan.maps.some((p) => !p.cached)) {
  phase(['shard-']);
  phase(['join.prebake']);
}
const MB = (b) => (b / 1048576).toFixed(2);
const current = [];
const lines = [];
let fail = false;
for (const p of plan.maps) {
  const dir = join(CACHE, p.h);
  const man = JSON.parse(readFileSync(join(dir, `${p.map}.json`), 'utf8'));
  if (man.key !== p.key) {
    console.error(`prebake ${p.map}: the manifest's key is not the plan's (${man.key} vs ${p.key})`);
    process.exit(1);
  }
  let total = 0;
  let over = false;
  const sizes = man.files.map((f) => {
    const bytes = statSync(join(dir, f.name)).size;
    total += bytes;
    if (bytes > FILE_CAP) over = true;
    return `${f.name} ${MB(bytes)} MB (${f.lampIds.length} lamps)`;
  });
  if (over || total > MAP_CAP) {
    console.error(`prebake ${p.map}: over the cap (16 MB a file, 48 MB the map, compressed): ${MB(total)} MB in all`);
    for (const s of sizes) console.error(`  ${s}`);
    fail = true;
    continue;
  }
  current.push({ map: p.map, h: p.h, files: [`${p.map}.json`, ...man.files.map((f) => f.name)] });
  lines.push({ sizes, line: `prebake ${p.map} (${variant}): ${man.lamps} lamps, ${man.files.length} files, ${MB(total)} MB gz, key ${p.key}${p.cached ? ' (cached)' : ''}` });
}
if (fail) process.exit(1);
writeFileSync(join(CACHE, 'current.json'), JSON.stringify({ maps: current }, null, 2));
// (prebake-preview) the maps' folders per build variant (`variants.json`: { live: [h...], preview: [h...] }; a string
// is the one-map shape before piano SO2), so a live and a /preview/ build on one machine never prune each other's bake
const VARIANTS = join(CACHE, 'variants.json');
let variants = {};
try {
  variants = JSON.parse(readFileSync(VARIANTS, 'utf8'));
} catch {
  variants = {};
}
variants[variant] = plan.maps.map((p) => p.h);
writeFileSync(VARIANTS, JSON.stringify(variants, null, 2));
const keep = new Set(Object.values(variants).flatMap((v) => (Array.isArray(v) ? v : [v])));
for (const e of readdirSync(CACHE, { withFileTypes: true })) {
  if (e.isDirectory() && !keep.has(e.name)) rmSync(join(CACHE, e.name), { recursive: true, force: true });
}
for (const { sizes, line } of lines) {
  for (const s of sizes) console.log(`  ${s}`);
  console.log(line);
}
console.log(`prebake: ${plan.maps.length} maps, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
