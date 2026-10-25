// (map-ready S4, fix (2)) The campus lamps baked at build time (`npm run build` runs this first; brief
// docs/map-ready/briefs/S4.md, BRIEF A15). Never committed: the files go to `.prebake-cache/` (gitignored; CI keeps it
// with actions/cache) and the build emits them as `bakes/*` (scripts/prebake/emit.ts).
//   PREBAKE=0 node scripts/prebake.mjs     -> "prebake skipped" (and `current.json` removed): the build ships no bake,
//                                             the PC bakes as today
//   PREBAKE_THREADS=<n> node scripts/prebake.mjs  (default: all cores but one, at most 4)
// Phases (vitest runs the TS in Node, scripts/prebake/vitest.prebake.config.ts):
//   (a) plan.prebake: campusOps built as the game builds it, the game's lamp key -> .prebake-cache/plan.json; when
//       .prebake-cache/<h>/campusOps.json already holds that key, nothing is baked;
//   (b) shard-0..7.prebake: lamp j baked alone (as the workers do) in shard j % 8 -> <h>/shard-<i>.bin;
//   (c) join.prebake: one gzip file per section + the manifest <h>/campusOps.json.
// Then here: the caps (16 MB a file, 48 MB the map, compressed: over -> every size printed, exit 1),
// .prebake-cache/current.json ({ h, files }, what the build emits) and the prune (only folder <h> stays).
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.prebake-cache');
const CONFIG = 'scripts/prebake/vitest.prebake.config.ts';
const MAP = 'campusOps';
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
if (!plan.cached) {
  phase(['shard-']);
  phase(['join.prebake']);
}
const dir = join(CACHE, plan.h);
const man = JSON.parse(readFileSync(join(dir, `${MAP}.json`), 'utf8'));
if (man.key !== plan.key) {
  console.error(`prebake: the manifest's key is not the plan's (${man.key} vs ${plan.key})`);
  process.exit(1);
}
let total = 0;
let over = false;
const sizes = man.files.map((f) => {
  const bytes = statSync(join(dir, f.name)).size;
  total += bytes;
  if (bytes > FILE_CAP) over = true;
  return `${f.name} ${(bytes / 1048576).toFixed(2)} MB (${f.lampIds.length} lamps)`;
});
if (over || total > MAP_CAP) {
  console.error(`prebake ${MAP}: over the cap (16 MB a file, 48 MB the map, compressed): ${(total / 1048576).toFixed(2)} MB in all`);
  for (const s of sizes) console.error(`  ${s}`);
  process.exit(1);
}
const files = [`${MAP}.json`, ...man.files.map((f) => f.name)];
writeFileSync(join(CACHE, 'current.json'), JSON.stringify({ h: plan.h, files }, null, 2));
for (const e of readdirSync(CACHE, { withFileTypes: true })) {
  if (e.isDirectory() && e.name !== plan.h) rmSync(join(CACHE, e.name), { recursive: true, force: true });
}
for (const s of sizes) console.log(`  ${s}`);
const s = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`prebake ${MAP}: ${man.lamps} lamps, ${man.files.length} files, ${(total / 1048576).toFixed(2)} MB gz, ${s} s${plan.cached ? ' (cached)' : ''}`);
