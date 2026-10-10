// Serves the existing dist/ with `vite preview` and runs the e2e suites, several at a time (one browser per suite).
//
//   node scripts/run-e2e.mjs [suite ...] [--legacy] [--serial] [--jobs=N] [--quick [--since=<ref>]] [--list]
//
//   (no flags)   the REQUIRED suites in parallel (`E2E_JOBS` or --jobs; default: min(5, cores / 3))
//   --serial     one suite at a time with its output streamed live (debugging; same as --jobs=1)
//   --quick      `smoke` + the suites that cover the folders the change touched (`npm run e2e:quick`)
//   --legacy     the parked-content suites with LEGACY=1 (report only)
// The slowest suites start first (scripts/e2e-times.json, refreshed by every full run), so the pool stays busy to the end.
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { cpus } from 'node:os';

const PORT = Number(process.env.E2E_PORT ?? 4179);
// Windows: `localhost` can resolve to ::1, which a VPN adapter on the PC blocks (EACCES): bind and browse the IPv4 loopback there
const HOST = process.env.E2E_HOST ?? (process.platform === 'win32' ? '127.0.0.1' : 'localhost');
const url = `http://${HOST}:${PORT}/`;
const TIMES_FILE = 'scripts/e2e-times.json';
// no suite may hang a run: past this it is killed (browsers included) and counts as failed (seconds; `E2E_SUITE_TIMEOUT`)
const SUITE_TIMEOUT = Number(process.env.E2E_SUITE_TIMEOUT ?? 600) * 1000;

// 3.5: REQUIRED = the suites `npm run e2e` runs; LEGACY = suites whose every check is about parked content (Wave, Hunter,
// Mission, PvP, the economy and cosmetics behind `?legacy=1`): `npm run e2e:legacy` runs them with LEGACY=1 (report only).
const REQUIRED = ['smoke', 'e2e-pad', 'e2e-touch', 'e2e-mouse', 'e2e-move', 'e2e-traverse', 'e2e-anchors', 'e2e-stealth', 'e2e-weapons-carry', 'e2e-anim', 'e2e-combat', 'e2e-modes', 'e2e-cover', 'e2e-clip', 'e2e-tactics', 'e2e-stealth-ai', 'e2e-takedown', 'e2e-gadgets', 'e2e-enemies', 'e2e-levels', 'e2e-missions', 'e2e-training', 'e2e-park', 'e2e-coop', 'e2e-netmove', 'e2e-ct', 'e2e-ct-warehouse', 'e2e-lightbake', 'e2e-phonelamps', 'e2e-darkness', 'e2e-feedback', 'e2e-desktop', 'e2e-offline', 'e2e-fp-map', 'e2e-fp-trunk', 'e2e-dead-line', 'e2e-dead-line-menu', 'e2e-dead-line-v2', 'e2e-dead-line-v2-menu', 'e2e-security', 'e2e-kestrel'];
const LEGACY = ['e2e-progression', 'e2e-cosmetics', 'e2e-clear'];
// A suite that is several independent sections (each its own browser) runs as one job per section: `e2e-desktop` = `e2e-desktop:1` .. `:4`
// (`node scripts/e2e-desktop.mjs --part=N`; named alone it still runs whole). The sections' checks are the suite's, none dropped.
const PARTS = { 'e2e-desktop': 4 };
const expand = (list) => list.flatMap((s) => (PARTS[s] ? Array.from({ length: PARTS[s] }, (_, i) => `${s}:${i + 1}`) : [s]));

// Suites that fail now and then for reasons not yet fixed (docs/backlog.md, "Flaky e2e suites"). They always run and are always reported:
// a failure is printed as KNOWN FLAKY and does not fail the run, a failure of any other suite does. Never skipped.
const KNOWN_FLAKY = new Set(['e2e-coop', 'e2e-netmove', 'e2e-darkness', 'e2e-weapons-carry', 'e2e-touch', 'e2e-pad']);
const flaky = (s) => KNOWN_FLAKY.has(s.split(':')[0]);

// --quick: which suites cover which source folder (a path under `src/` not listed here runs CORE). Keep in step with docs/systems/testing-tools.md.
const CORE = ['e2e-pad', 'e2e-touch', 'e2e-move', 'e2e-modes', 'e2e-combat'];
const COVERS = {
  'src/core/': ['e2e-desktop', 'e2e-pad', 'e2e-touch', 'e2e-mouse', 'e2e-anim', 'e2e-offline'],
  'src/input/': ['e2e-pad', 'e2e-touch', 'e2e-mouse', 'e2e-move'],
  'src/ui/': ['e2e-pad', 'e2e-touch', 'e2e-desktop', 'e2e-feedback', 'e2e-park', 'e2e-training'],
  'src/game/': ['e2e-modes', 'e2e-missions', 'e2e-takedown', 'e2e-gadgets', 'e2e-tactics', 'e2e-enemies', 'e2e-training', 'e2e-park', 'e2e-fp-trunk'],
  'src/physics/': ['e2e-move', 'e2e-traverse', 'e2e-anchors', 'e2e-ct'],
  'src/player/': ['e2e-move', 'e2e-traverse', 'e2e-anchors', 'e2e-stealth', 'e2e-anim', 'e2e-ct', 'e2e-ct-warehouse', 'e2e-cover', 'e2e-clip', 'e2e-weapons-carry', 'e2e-mouse'],
  'src/anim/': ['e2e-anim', 'e2e-clip', 'e2e-weapons-carry', 'e2e-move'],
  'src/cover/': ['e2e-cover', 'e2e-stealth', 'e2e-clip', 'e2e-tactics'],
  'src/weapons/': ['e2e-combat', 'e2e-weapons-carry', 'e2e-enemies', 'e2e-gadgets', 'e2e-clip'],
  'src/ai/': ['e2e-stealth-ai', 'e2e-enemies', 'e2e-levels', 'e2e-tactics', 'e2e-missions', 'e2e-takedown', 'e2e-fp-trunk'],
  'src/world/maps/kestrel': ['e2e-kestrel'],
  'src/world/': ['e2e-security', 'e2e-kestrel', 'e2e-lightbake', 'e2e-phonelamps', 'e2e-darkness', 'e2e-levels', 'e2e-anchors', 'e2e-ct-warehouse', 'e2e-desktop', 'e2e-fp-map', 'e2e-fp-trunk', 'e2e-dead-line', 'e2e-dead-line-menu', 'e2e-dead-line-v2', 'e2e-dead-line-v2-menu'],
  'src/voxel/': ['e2e-lightbake', 'e2e-phonelamps', 'e2e-darkness', 'e2e-desktop'],
  'src/vfx/': ['e2e-desktop', 'e2e-darkness', 'e2e-phonelamps'],
  'src/net/': ['e2e-coop', 'e2e-netmove'],
  'src/security/': ['e2e-security'],
  'src/progression/': ['e2e-park'],
  'src/cosmetics/': ['e2e-park'],
  'src/save/': ['e2e-park', 'e2e-offline', 'e2e-feedback'],
  'src/feedback/': ['e2e-feedback'],
  'src/audio/': ['e2e-modes'],
  'src/pwa/': ['e2e-offline'],
  'src/config/': CORE,
};
// outside src/: a suite script or its helper reruns that suite (the helper and this runner rerun CORE); docs and tests need no browser
const SCRIPT = /^scripts\/(smoke|e2e-[\w-]+)\.mjs$/;

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n) => argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const legacyRun = flag('legacy');
const quick = flag('quick');
const named = argv.filter((a) => !a.startsWith('--'));

function git(...a) {
  try {
    return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** Files the change touched: the working tree, plus the commits not on the upstream yet (`--since=<ref>` overrides; a clean tree on the upstream: the last commit). */
function changedFiles() {
  const since = opt('since');
  const out = new Set(git('diff', '--name-only', 'HEAD'));
  for (const f of git('ls-files', '--others', '--exclude-standard')) out.add(f);
  const ahead = since ? git('diff', '--name-only', since) : git('diff', '--name-only', '@{u}...HEAD');
  for (const f of ahead) out.add(f);
  if (!out.size && !since) for (const f of git('diff', '--name-only', 'HEAD~1', 'HEAD')) out.add(f);
  return [...out].map((f) => f.replace(/\\/g, '/'));
}

function quickSuites() {
  const files = changedFiles();
  const picked = new Set(['smoke']);
  const why = [];
  for (const f of files) {
    let hit = null;
    if (f.startsWith('src/')) hit = Object.entries(COVERS).find(([p]) => f.startsWith(p))?.[1] ?? CORE;
    else if (SCRIPT.test(f)) hit = [f.replace(/^scripts\/|\.mjs$/g, '')];
    else if (/^(scripts\/(e2e-lib|run-e2e)\.mjs|package\.json|index\.html|vite\.config\.\w+|public\/)/.test(f)) hit = CORE;
    for (const s of hit ?? []) picked.add(s);
    if (hit) why.push(f);
  }
  console.log(`quick: ${files.length} changed file(s), ${why.length} reach the browser`);
  return REQUIRED.filter((s) => picked.has(s)).concat([...picked].filter((s) => !REQUIRED.includes(s) && existsSync(`scripts/${s}.mjs`)));
}

const all = named.length ? named : expand(legacyRun ? LEGACY : quick ? quickSuites() : REQUIRED);
const fullRun = !named.length && !quick && !legacyRun;
const jobs = flag('serial') ? 1 : Math.max(1, Number(opt('jobs') ?? process.env.E2E_JOBS ?? Math.min(5, Math.floor(cpus().length / 3))) || 1);
if (flag('list')) {
  console.log(all.join('\n'));
  process.exit(0);
}

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', HOST], { stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
process.on('exit', () => server.kill());
let up = false;
for (let i = 0; i < 40 && !up; i++) {
  try {
    up = (await fetch(url)).ok;
  } catch {
    await wait(250);
  }
}
if (!up) {
  server.kill();
  console.error('preview server did not start (run `npm run build` first)');
  process.exit(1);
}

let known = {};
try {
  known = JSON.parse(readFileSync(TIMES_FILE, 'utf8'));
} catch {
  /* first run: the order below is the given one */
}
// longest first: the pool ends together instead of waiting on one slow suite started last
const queue = jobs > 1 ? [...all].sort((a, b) => (known[b] ?? 0) - (known[a] ?? 0)) : [...all];
if (process.env.E2E_HEADED === '1') {
  console.error('E2E ERROR: E2E_HEADED=1 is set. The runner never opens headed browsers (they grab the real cursor). Unset it; debug headed with a single suite run directly.');
  process.exit(1);
}
const env = { ...process.env, E2E_RUNNER: '1', ...(legacyRun ? { LEGACY: '1' } : {}) };
const results = [];
const t00 = Date.now();

async function runOne(s) {
  const t0 = Date.now();
  const streamed = jobs === 1;
  if (streamed) console.log(`\n=== ${s} ===`);
  else console.log(`[start] ${s}`);
  const [script, part] = s.split(':');
  const child = spawn(process.execPath, [`scripts/${script}.mjs`, url, ...(part ? [`--part=${part}`] : [])], { stdio: streamed ? 'inherit' : ['ignore', 'pipe', 'pipe'], env });
  let log = '';
  if (!streamed) {
    child.stdout.on('data', (d) => (log += d));
    child.stderr.on('data', (d) => (log += d));
  }
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    // (the suite's browsers are its children: the whole tree goes)
    if (process.platform === 'win32') spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGKILL');
  }, SUITE_TIMEOUT);
  let code = await new Promise((res) => child.on('exit', res));
  clearTimeout(timer);
  if (timedOut) {
    code = 124;
    log += `
KILLED: ${s} ran past ${SUITE_TIMEOUT / 1000}s
`;
  }
  const sec = (Date.now() - t0) / 1000;
  results.push({ s, code, sec });
  if (!streamed) {
    // the whole log in one block: parallel suites never interleave
    console.log(`\n=== ${s} (${code === 0 ? 'ok' : 'FAIL'}, ${sec.toFixed(0)}s) ===\n${log.trimEnd()}`);
    try {
      mkdirSync('test-results/e2e', { recursive: true });
      writeFileSync(`test-results/e2e/${s.replace(":", "-")}.log`, log);
    } catch {
      /* logs are a convenience */
    }
  }
}

await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => {
  for (let s = queue.shift(); s; s = queue.shift()) await runOne(s);
}));
server.kill();

const allFailed = results.filter((r) => r.code !== 0);
const failed = allFailed.filter((r) => !flaky(r.s));
const flakyFailed = allFailed.filter((r) => flaky(r.s));
const wall = (Date.now() - t00) / 1000;
const sum = results.reduce((a, r) => a + r.sec, 0);
console.log(`\ntimes (${process.env.E2E_GPU === '1' ? 'GPU' : 'software GL'}, ${jobs} at a time):\n  ${results.sort((a, b) => b.sec - a.sec).map((r) => `${r.s} ${r.code === 0 ? 'ok' : flaky(r.s) ? 'FAIL (KNOWN FLAKY)' : 'FAIL'} ${r.sec.toFixed(0)}s`).join('\n  ')}`);
console.log(`\nwall ${wall.toFixed(0)}s, suites summed ${sum.toFixed(0)}s${jobs > 1 ? ` (x${(sum / wall).toFixed(1)})` : ''}`);
if (fullRun && !allFailed.length) {
  // keep the schedule current (the file is committed: a fresh checkout starts with a good order)
  for (const r of results) known[r.s] = Math.round(r.sec);
  writeFileSync(TIMES_FILE, JSON.stringify(Object.fromEntries(Object.entries(known).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
}
if (flakyFailed.length) console.log(`
*** KNOWN FLAKY, failed this run (docs/backlog.md): ${flakyFailed.map((r) => r.s).join(', ')} - rerun them alone before reading anything into it ***`);
console.log(failed.length ? `\n${failed.length} suite(s) failed: ${failed.map((r) => r.s).join(', ')}` : '\nall e2e suites passed');
process.exit(failed.length ? 1 : 0);
