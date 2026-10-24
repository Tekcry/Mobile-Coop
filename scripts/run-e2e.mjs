// Serves the existing dist/ with `vite preview` and runs the e2e suites, several at a time (one browser per suite).
//
//   node scripts/run-e2e.mjs [suite ...] [--legacy | --audio | --gpu] [--serial] [--jobs=N] [--quick [--since=<ref>]] [--list]
//
//   (no flags)   the REQUIRED suites in parallel (`E2E_JOBS` or --jobs; default: min(5, cores / 3))
//   --serial     one suite at a time with its output streamed live (debugging; same as --jobs=1)
//   --quick      `smoke` + the suites that cover the folders the change touched (`npm run e2e:quick`); a picked suite
//                outside REQUIRED (legacy, audio, anim-audit) is REPORT ONLY
//   --legacy     the parked-content suites (`npm run e2e:legacy`)
//   --audio      the audio suites (`npm run e2e:audio`)
//   --gpu        the visual read-back suites, Michael's PC only with E2E_GPU=1 (`npm run e2e:gpu`)
// Which change runs what (the test tiers): CLAUDE.md "Sessions" and docs/systems/testing-tools.md.
// The slowest suites start first (scripts/e2e-times.json, refreshed by every full run), so the pool stays busy to the end.
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { cpus } from 'node:os';
import { coverFile } from './quick-covers.mjs';

const PORT = Number(process.env.E2E_PORT ?? 4179);
// Windows: `localhost` can resolve to ::1, which a VPN adapter on the PC blocks (EACCES): bind and browse the IPv4 loopback there
const HOST = process.env.E2E_HOST ?? (process.platform === 'win32' ? '127.0.0.1' : 'localhost');
const url = `http://${HOST}:${PORT}/`;
const TIMES_FILE = 'scripts/e2e-times.json';
// no suite may hang a run: past this it is killed (browsers included) and counts as failed (seconds; `E2E_SUITE_TIMEOUT`)
const SUITE_TIMEOUT = Number(process.env.E2E_SUITE_TIMEOUT ?? 600) * 1000;

// (process audit, 2026-10-19, approved by Michael) REQUIRED = what `npm run e2e` runs: the co-op training level
// (Marlow Yard) and the systems it stands on. Everything else has its own list, outside the full run:
// LEGACY = parked content (Hunter / Mission, the economy and cosmetics, Fallow, Kestrel, the Warehouse routes and AI
// archetypes); AUDIO = the sound suites; GPU = visual read-backs (no visual result from SwiftShader).
const REQUIRED = ['smoke', 'e2e-pad', 'e2e-mouse', 'e2e-menus', 'e2e-move', 'e2e-traverse', 'e2e-anchors', 'e2e-stealth', 'e2e-weapons-carry', 'e2e-anim', 'e2e-combat', 'e2e-clip', 'e2e-tactics', 'e2e-wall', 'e2e-stealth-ai', 'e2e-guard-carry', 'e2e-takedown', 'e2e-gadgets', 'e2e-levels', 'e2e-park', 'e2e-coop', 'e2e-netmove', 'e2e-course', 'e2e-ctcourse', 'e2e-sectorops', 'e2e-section-rating', 'e2e-ct', 'e2e-lightbake', 'e2e-feedback', 'e2e-desktop', 'e2e-offline', 'e2e-studio', 'e2e-tuner-phone'];
// e2e-wall:flanker = e2e-wall's Warehouse (Clear) flanker section; e2e-bunker: Fallow, parked behind ?legacy=1 (CT prototype B1)
const LEGACY = ['e2e-progression', 'e2e-cosmetics', 'e2e-clear', 'e2e-bunker', 'e2e-missions', 'e2e-modes', 'e2e-enemies', 'e2e-ct-warehouse', 'e2e-wall:flanker', 'e2e-kestrel', 'e2e-camera-bounds', 'e2e-security'];
// the suites written for `?legacy=1` pages (LEGACY=1 makes e2e-lib add it); the others moved to LEGACY run as they always did
const NEEDS_LEGACY_FLAG = new Set(['e2e-progression', 'e2e-cosmetics', 'e2e-clear', 'e2e-bunker']);
const AUDIO = ['e2e-music', 'e2e-score', 'e2e-foley', 'e2e-weapon-audio'];
// e2e-desktop:3 = the Epic renderer booting in a match; e2e-coop-gpu = the host drawn on the joiner at High / Epic (menu flow)
const GPU = ['e2e-darkness', 'e2e-desktop:3', 'e2e-coop-gpu'];
// REPORT = the animation audit harness: printed as REPORT ONLY, never fails a run. Only a quick run picks it (with
// `--quick`, for `src/anim`, `src/player`, `src/net`); animation jobs run it by name.
const REPORT = ['anim-audit'];
// A suite that is several independent sections (each its own browser) runs as one job per section: `e2e-desktop` =
// `e2e-desktop:1`, `:2`, `:4` (part 3 is in GPU). `node scripts/e2e-desktop.mjs --part=N`; the script run directly with no --part runs whole.
// (marlow-final 0d) e2e-ctcourse = four pairs of sets (A1-A2, A3-A4, A5-A6, A7-A8), each its own pair of pages.
// (sector-fixes-r RE) e2e-sectorops = part 1 (sections, alarms, restarts, nav, the co-op mirror), 2 (solo: co-op lips refused, route links, team doors), 3-5 (co-op routes and team doors of sections 1-3), 6 (campusOps: S1-S3 greybox routes)
const PARTS = { 'e2e-desktop': ['1', '2', '4'], 'e2e-ctcourse': ['1', '2', '3', '4'], 'e2e-sectorops': ['1', '2', '3', '4', '5', '6'] };
const expand = (list) => list.flatMap((s) => (PARTS[s] ? PARTS[s].map((n) => `${s}:${n}`) : [s]));
const REQUIRED_JOBS = new Set(expand(REQUIRED));

// Suites that fail now and then for reasons not yet fixed (docs/backlog.md, "Flaky e2e suites"). They always run and are always reported:
// a failure is printed as KNOWN FLAKY and does not fail the run, a failure of any other suite does. Never skipped.
// (co-op test fix, 2026-10-19) e2e-coop and e2e-netmove left: 3 solo rounds and 2 full runs pass after the fix;
// e2e-weapons-carry left after the same 2 clean full runs (the process audit's rule). e2e-pad stays: it failed full run 2
// in its remap section (docs/backlog.md; parked, not fixed). Add a suite only with its failure written up there.
const KNOWN_FLAKY = new Set(['e2e-pad']);
const flaky = (s) => KNOWN_FLAKY.has(s.split(':')[0]);

// --quick: the folder -> suites map (CORE, COVERS, the suite scripts and helpers) lives in scripts/quick-covers.mjs (pure,
// also read by scripts/auto-train.mjs). Keep it in step with docs/systems/testing-tools.md.

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n) => argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const legacyRun = flag('legacy');
const audioRun = flag('audio');
const gpuRun = flag('gpu');
if (gpuRun && process.env.E2E_GPU !== '1') {
  console.error("E2E ERROR: --gpu reads final pixels: run it on Michael's PC with E2E_GPU=1 (port 4189), never on software GL.");
  process.exit(1);
}
const quick = flag('quick');
const named = argv.filter((a) => !a.startsWith('--'));

function git(...a) {
  try {
    return execFileSync('git', a, { windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').map((s) => s.trim()).filter(Boolean);
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
    const hit = coverFile(f);
    for (const s of hit ?? []) picked.add(s);
    if (hit) why.push(f);
  }
  console.log(`quick: ${files.length} changed file(s), ${why.length} reach the browser`);
  // required suites first; a picked legacy / audio suite runs too, REPORT ONLY (GPU suites never run on software GL)
  return expand(REQUIRED.filter((s) => picked.has(s))).concat(expand([...picked].filter((s) => !REQUIRED.includes(s) && !GPU.includes(s) && existsSync(`scripts/${s}.mjs`))));
}

// (sector-fixes-r e2e fix) a named suite with parts expands too (`e2e-sectorops` -> `:1`-`:5`, one job each); `name:N`
// names one part. Before, a named list ran the suite whole as one job.
const all = named.length ? expand(named) : legacyRun ? LEGACY : audioRun ? AUDIO : gpuRun ? GPU : quick ? quickSuites() : expand(REQUIRED);
const fullRun = !named.length && !quick && !legacyRun && !audioRun && !gpuRun;
// REPORT ONLY: anim-audit always; in a quick run every suite outside REQUIRED
const report = (s) => REPORT.includes(s.split(':')[0]) || (quick && !REQUIRED_JOBS.has(s));
const jobs = flag('serial') ? 1 : Math.max(1, Number(opt('jobs') ?? process.env.E2E_JOBS ?? Math.min(5, Math.floor(cpus().length / 3))) || 1);
if (flag('list')) {
  console.log(all.join('\n'));
  process.exit(0);
}

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', HOST], { windowsHide: true, stdio: 'ignore' });
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
// a suite with no recorded time (new, renamed, newly split) sorts at the median of the known times, not 0:
// at 0 it started last and set the tail
const knownSecs = Object.values(known).filter((v) => typeof v === 'number').sort((a, b) => a - b);
const unknownSec = knownSecs.length ? knownSecs[Math.floor(knownSecs.length / 2)] : 60;
// longest first: the pool ends together instead of waiting on one slow suite started last
const queue = jobs > 1 ? [...all].sort((a, b) => (known[b] ?? unknownSec) - (known[a] ?? unknownSec)) : [...all];
if (process.env.E2E_HEADED === '1') {
  console.error('E2E ERROR: E2E_HEADED=1 is set. The runner never opens headed browsers (they grab the real cursor). Unset it; debug headed with a single suite run directly.');
  process.exit(1);
}
const env = { ...process.env, E2E_RUNNER: '1' };
const results = [];
const t00 = Date.now();

async function runOne(s) {
  const t0 = Date.now();
  const streamed = jobs === 1;
  if (streamed) console.log(`\n=== ${s}${report(s) ? " (REPORT ONLY: never fails the run)" : ""} ===`);
  else console.log(`[start] ${s}`);
  const [script, part] = s.split(':');
  const childEnv = NEEDS_LEGACY_FLAG.has(script) ? { ...env, LEGACY: '1' } : env;
  const child = spawn(process.execPath, [`scripts/${script}.mjs`, url, ...(part ? [`--part=${part}`] : []), ...(quick && script === 'anim-audit' ? ['--quick'] : [])], { windowsHide: true, stdio: streamed ? 'inherit' : ['ignore', 'pipe', 'pipe'], env: childEnv });
  let log = '';
  if (!streamed) {
    child.stdout.on('data', (d) => (log += d));
    child.stderr.on('data', (d) => (log += d));
  }
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    // (the suite's browsers are its children: the whole tree goes)
    if (process.platform === 'win32') spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else child.kill('SIGKILL');
  }, SUITE_TIMEOUT);
  let code = await new Promise((res) => child.on('exit', res));
  clearTimeout(timer);
  if (timedOut) {
    code = 124;
    const killed = `KILLED: ${s} ran past ${SUITE_TIMEOUT / 1000}s`;
    // (test-chores-13) streamed (--serial / --jobs=1): the output went straight to the console, so the KILLED line
    // goes there too (before, a timed-out suite there ended silently, with only FAIL in the times table)
    if (streamed) console.log(`\n${killed}`);
    else log += `\n${killed}\n`;
  }
  const sec = (Date.now() - t0) / 1000;
  results.push({ s, code, sec });
  if (!streamed) {
    // the whole log in one block: parallel suites never interleave
    console.log(`\n=== ${s} (${report(s) ? `REPORT ONLY, exit ${code}` : code === 0 ? 'ok' : 'FAIL'}, ${sec.toFixed(0)}s) ===\n${log.trimEnd()}`);
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

const allFailed = results.filter((r) => r.code !== 0 && !report(r.s));
const failed = allFailed.filter((r) => !flaky(r.s));
const flakyFailed = allFailed.filter((r) => flaky(r.s));
const wall = (Date.now() - t00) / 1000;
const sum = results.reduce((a, r) => a + r.sec, 0);
console.log(`\ntimes (${process.env.E2E_GPU === '1' ? 'GPU' : 'software GL'}, ${jobs} at a time):\n  ${results.sort((a, b) => b.sec - a.sec).map((r) => `${r.s} ${report(r.s) ? `REPORT ONLY (exit ${r.code})` : r.code === 0 ? 'ok' : flaky(r.s) ? 'FAIL (KNOWN FLAKY)' : 'FAIL'} ${r.sec.toFixed(0)}s`).join('\n  ')}`);
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
