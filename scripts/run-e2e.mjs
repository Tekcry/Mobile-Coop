// Serves the existing dist/ with `vite preview` and runs the e2e suites, several at a time (one browser per suite).
//
//   node scripts/run-e2e.mjs [suite ...] [--legacy | --audio | --gpu] [--serial] [--jobs=N] [--quick [--since=<ref>]] [--affected <base-ref> [--wide] [--affected-max=N]] [--list]
//
//   (no flags)   the REQUIRED suites in parallel (`E2E_JOBS` or --jobs; default: min(5, cores / 3))
//   --serial     one suite at a time with its output streamed live (debugging; same as --jobs=1)
//   --quick      `smoke` + the suites that cover the folders the change touched (`npm run e2e:quick`); a picked suite
//                outside REQUIRED (legacy, audio, anim-audit) is REPORT ONLY
//   --legacy     the parked-content suites (`npm run e2e:legacy`)
//   --audio      the audio suites (`npm run e2e:audio`)
//   --gpu        the visual read-back suites, Michael's PC only with E2E_GPU=1 (`npm run e2e:gpu`)
//   --affected <base-ref>  the suites a PR must pass: `git diff` of the merge-base with <base-ref> to HEAD (committed files only, so it
//                works on a detached commit), the DIRECT tier (the suites that drive the changed area); `--wide` adds the cross-area
//                readers (WIDE_COVERS); `--list` prints them one per line and exits (the laptop queue and leads use it); a change on
//                the wire (src/net, or a file protocol.ts imports, read at HEAD) adds the co-op group (COOP: e2e-coop, e2e-netmove,
//                e2e-ctcourse); GPU, LEGACY and AUDIO suites are gated out; then the cap (e2e-affected affectedPick): at most 3
//                suites, the closest, the co-op group alone for a wire / src/net / src/save change; `--affected-max=N` (else
//                E2E_AFFECTED_MAX) sets another cap, 0 = no cap; `--wide` is uncapped unless one is given; picked suites
//                outside REQUIRED are REPORT ONLY, as in --quick
//   E2E_REPORT   a space or comma list of suites (or parts) that run REPORT ONLY in any run (the laptop queue's report suites)
// Which change runs what (the test tiers): docs/RULES.md "Test tiers" and docs/systems/testing-tools.md.
// The slowest suites start first (scripts/e2e-times.json, refreshed by every full run), so the pool stays busy to the end.
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { cpus } from 'node:os';
import { selectSuites, suitesForFile, affectedPick, parseAffectedMax, QUICK_COVERS, LEGACY, GPU, AUDIO } from './e2e-affected.mjs';
import { classify, status, reportSet, isReport, slowLine } from './e2e-verdict.mjs';

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
// LEGACY, AUDIO and GPU live in scripts/e2e-affected.mjs (the affected requests leave them out: affectedGateSuites)
// the suites written for `?legacy=1` pages (LEGACY=1 makes e2e-lib add it); the others moved to LEGACY run as they always did
const NEEDS_LEGACY_FLAG = new Set(['e2e-progression', 'e2e-cosmetics', 'e2e-clear', 'e2e-bunker']);
// REPORT = the animation audit harness: printed as REPORT ONLY, never fails a run. Only a quick run picks it (with
// `--quick`, for `src/anim`, `src/player`, `src/net`); animation jobs run it by name.
const REPORT = ['anim-audit'];
// A suite that is several independent sections (each its own browser) runs as one job per section: `e2e-desktop` =
// `e2e-desktop:1`, `:2`, `:4` (part 3 is in GPU). `node scripts/e2e-desktop.mjs --part=N`; the script run directly with no --part runs whole.
// (marlow-final 0d) e2e-ctcourse = four pairs of sets (A1-A2, A3-A4, A5-A6, A7-A8), each its own pair of pages. (J14) Parts 5-8
// are the same four pairs on the re-planned yard (map `ctcourseReplan`, `scripts/e2e-ctcourse/replan/`).
// (sector-fixes-r RE) e2e-sectorops = part 1 (sections, alarms, restarts, nav, the co-op mirror), 2 (solo: co-op lips refused, route links, team doors), 3-5 (co-op routes and team doors of sections 1-3), 6-9 (campusOps, solo: 6 S1/S2 + feeder + CR1/CR2 probes, 7 S3 + H8, 8 S4 + CR4 + S16, 9 S5; split in F33 so no part nears the kill)
// (mission-framework EN2) e2e-sectorops:mission = the campus test mission (`scripts/e2e-sectorops-mission.mjs`, its own script: PART_SCRIPT)
// (campaign-mode CM7) e2e-coop = part 1 (the suite as it was: `scripts/e2e-coop.mjs` ignores `--part`) and `campaign` (the campaign in the co-op lobby, three browser contexts: `scripts/e2e-coop-campaign.mjs`, PART_SCRIPT)
// (mission-framework GB6) e2e-sectorops:wharf-tgc / :wharf-tkl = the Tallow Wharf missions in co-op (scripts/e2e-sectorops-wharf.mjs --mission=<id>)
const PARTS = { 'e2e-desktop': ['1', '2', '4'], 'e2e-ctcourse': ['1', '2', '3', '4', '5', '6', '7', '8'], 'e2e-sectorops': ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'mission', 'wharf-tgc', 'wharf-tkl'], 'e2e-coop': ['1', 'campaign'] };
/** A part that lives in its own script (run with no `--part`): the script name, or `[script, ...args]`. */
const PART_SCRIPT = {
  'e2e-sectorops:mission': 'e2e-sectorops-mission',
  'e2e-sectorops:wharf-tgc': ['e2e-sectorops-wharf', '--mission=threeGreyCoats'],
  'e2e-sectorops:wharf-tkl': ['e2e-sectorops-wharf', '--mission=twoKeyLedger'],
  'e2e-coop:campaign': 'e2e-coop-campaign',
};
const expand = (list) => list.flatMap((s) => (PARTS[s] ? PARTS[s].map((n) => `${s}:${n}`) : [s]));
const REQUIRED_JOBS = new Set(expand(REQUIRED));

// Quarantined suites (flake budget, process audit 2026-10-24): scripts/e2e-quarantine.json (committed: suite, owner, expiry,
// reason) plus the laptop queue's automatic list (`E2E_QUARANTINE_FILE`, over-budget suites for 48 h). They always run
// and are always reported: until its expiry a failure prints as KNOWN FLAKY and does not fail the run; a failure of
// any other suite (or of an expired entry) does. An entry names a part (e2e-sectorops:6) or a whole suite. Never skipped.
const QUARANTINE = [];
for (const f of ['scripts/e2e-quarantine.json', process.env.E2E_QUARANTINE_FILE].filter(Boolean)) {
  try {
    const j = JSON.parse(readFileSync(f, 'utf8'));
    const list = Array.isArray(j) ? j : j?.quarantine;
    if (Array.isArray(list)) QUARANTINE.push(...list.filter((q) => q && typeof q.suite === 'string'));
  } catch { /* no file: nothing quarantined from it */ }
}
const quarantineOf = (s) => QUARANTINE.find((q) => (q.suite === s || q.suite === s.split(':')[0]) && Date.parse(q.expiry) > Date.now());
const flaky = (s) => Boolean(quarantineOf(s));

// The folder -> suites maps and the selection live in scripts/e2e-affected.mjs (pure): QUICK_COVERS for `--quick` (master's map
// unchanged), DIRECT_COVERS for `--affected`, WIDE_COVERS for `--affected --wide`.

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
// `--affected <base-ref>` (or `--affected=<base-ref>`): the ref is a value, not a suite name
const affIdx = argv.findIndex((a) => a === '--affected' || a.startsWith('--affected='));
const affected = affIdx >= 0;
const affectedBase = !affected ? '' : argv[affIdx].includes('=') ? argv[affIdx].slice(11) : argv[affIdx + 1] && !argv[affIdx + 1].startsWith('--') ? argv[affIdx + 1] : '';
if (affected && !affectedBase) {
  console.error('E2E ERROR: --affected needs a base ref, e.g. --affected origin/master');
  process.exit(1);
}
const wide = flag('wide');
const selective = quick || affected; // a selected run: suites outside REQUIRED are REPORT ONLY
const named = argv.filter((a, i) => !a.startsWith('--') && !(affected && !argv[affIdx].includes('=') && i === affIdx + 1));

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

// scripts/e2e-<x>.mjs files that are modules, not suites (master's --quick rules pick e2e-affected.mjs by name)
const NOT_SUITES = ['e2e-affected', 'e2e-verdict'];

/** Required suites first, then the rest (a legacy / audio suite runs REPORT ONLY; GPU suites never run on software GL; a suite without a script is dropped). A part token (`e2e-sectorops:1`) stays one job. */
function orderPicked(picked) {
  const base = (s) => s.split(':')[0];
  const reqWhole = REQUIRED.filter((s) => picked.has(s));
  const reqParts = [...picked].filter((s) => s.includes(':') && REQUIRED.includes(base(s)));
  const rest = [...picked].filter((s) => !REQUIRED.includes(base(s)) && !GPU.includes(base(s)) && !GPU.includes(s) && existsSync(`scripts/${base(s)}.mjs`) && !NOT_SUITES.includes(base(s)));
  return [...new Set([...expand(reqWhole), ...reqParts, ...expand(rest)])];
}

function quickSuites() {
  const files = changedFiles();
  const picked = new Set(['smoke', ...selectSuites(files, QUICK_COVERS)]);
  console.log(`quick: ${files.length} changed file(s), ${files.filter((f) => suitesForFile(f, QUICK_COVERS)).length} reach the browser`);
  return orderPicked(picked);
}

/** `--affected <base-ref> [--wide]`: the committed diff from the merge-base to HEAD (works on a detached commit). */
function affectedSuites() {
  let files;
  try {
    const run = (...a) => execFileSync('git', a, { windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    const mb = run('merge-base', affectedBase, 'HEAD');
    files = run('diff', '--name-only', '--no-renames', mb, 'HEAD').split('\n').map((f) => f.trim().replace(/\\/g, '/')).filter(Boolean);
  } catch (e) {
    console.error(`E2E ERROR: --affected ${affectedBase}: ${String(e.stderr || e.message).trim()}`);
    process.exit(1);
  }
  // (J20 T1) the wire rule reads protocol.ts as committed at HEAD (the tested commit), not the working tree
  let protocolTs = '';
  try {
    protocolTs = execFileSync('git', ['show', 'HEAD:src/net/protocol.ts'], { windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    console.error(`affected: no src/net/protocol.ts at HEAD (${String(e.stderr || e.message).trim()}): the wire rule is skipped`);
  }
  // (affected-cap) the pick the laptop queue requests: --affected-max=N, else E2E_AFFECTED_MAX, else AFFECTED_MAX (1, G421); --wide with neither is uncapped
  const given = opt('affected-max') ?? process.env.E2E_AFFECTED_MAX;
  const max = wide && given === undefined ? undefined : parseAffectedMax(given);
  const suites = affectedPick(files, { wide, max, protocolTs });
  console.error(`affected${wide ? ' (wide)' : ''}: ${files.length} changed file(s) vs ${affectedBase}, ${suites.length} suite(s) (${max ? `cap ${max}` : 'no cap'})`);
  return orderPicked(new Set(suites));
}

// (sector-fixes-r e2e fix) a named suite with parts expands too (`e2e-sectorops` -> `:1`-`:5`, one job each); `name:N`
// names one part. Before, a named list ran the suite whole as one job.
const all = named.length ? expand(named) : legacyRun ? LEGACY : audioRun ? AUDIO : gpuRun ? GPU : affected ? affectedSuites() : quick ? quickSuites() : expand(REQUIRED);
const fullRun = !named.length && !selective && !legacyRun && !audioRun && !gpuRun;
// REPORT ONLY: anim-audit always; in a quick / affected run every suite outside REQUIRED; in any run the E2E_REPORT
// suites (J20 T4: the laptop queue names an affected request's LEGACY / AUDIO suites there, so a named run never gates on them)
const REPORT_ENV = reportSet(process.env);
const report = (s) => REPORT.includes(s.split(':')[0]) || (selective && !REQUIRED_JOBS.has(s)) || isReport(s, REPORT_ENV);
const jobs = flag('serial') ? 1 : Math.max(1, Number(opt('jobs') ?? process.env.E2E_JOBS ?? Math.min(5, Math.floor(cpus().length / 3))) || 1);
if (flag('list')) {
  if (all.length) console.log(all.join('\n'));
  process.exit(0);
}
if (!all.length) {
  console.log('no suites to run');
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
  const own = PART_SCRIPT[s];
  const [ownName, ...ownArgs] = Array.isArray(own) ? own : own ? [own] : [];
  const child = spawn(process.execPath, [`scripts/${ownName ?? script}.mjs`, url, ...ownArgs, ...(part && !own ? [`--part=${part}`] : []), ...(selective && script === 'anim-audit' ? ['--quick'] : [])], { windowsHide: true, stdio: streamed ? 'inherit' : ['ignore', 'pipe', 'pipe'], env: childEnv });
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
  // laptop-queue-8 A10: streamed suites print the parallel result line too, so a run cut mid-way (a train preempt)
  // shows which suites finished (laptop-queue lib finishedSuites)
  if (streamed) console.log(`\n=== ${s} (${report(s) ? `REPORT ONLY, exit ${code}` : code === 0 ? 'ok' : 'FAIL'}, ${sec.toFixed(0)}s) ===`);
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

// (J20 T8) a quarantine forgives an assert (exit 1) only: a quarantined suite that timed out (124, KILLED), died on a
// signal or exited with any other code fails the run and prints FAIL (scripts/e2e-verdict.mjs, BRIEF A3)
const verdictOpts = { report, quarantined: flaky };
const { failed, flakyFailed } = classify(results, verdictOpts);
const allFailed = [...failed, ...flakyFailed];
const wall = (Date.now() - t00) / 1000;
const sum = results.reduce((a, r) => a + r.sec, 0);
console.log(`\ntimes (${process.env.E2E_GPU === '1' ? 'GPU' : 'software GL'}, ${jobs} at a time):\n  ${results.sort((a, b) => b.sec - a.sec).map((r) => `${r.s} ${status(r, verdictOpts)} ${r.sec.toFixed(0)}s`).join('\n  ')}`);
console.log(`\nwall ${wall.toFixed(0)}s, suites summed ${sum.toFixed(0)}s${jobs > 1 ? ` (x${(sum / wall).toFixed(1)})` : ''}`);
// (F33-c) a part that passes but used over 75% of the kill limit is drifting toward KILLED: say so before it gets there
for (const r of results) { const slow = slowLine(r, SUITE_TIMEOUT / 1000); if (slow) console.log(slow); }
if (fullRun && !allFailed.length) {
  // keep the schedule current (the file is committed: a fresh checkout starts with a good order)
  for (const r of results) known[r.s] = Math.round(r.sec);
  writeFileSync(TIMES_FILE, JSON.stringify(Object.fromEntries(Object.entries(known).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
}
if (flakyFailed.length) console.log(`
*** KNOWN FLAKY (quarantined), failed this run: ${flakyFailed.map((r) => { const q = quarantineOf(r.s); return `${r.s} (owner ${q?.owner ?? '?'}, until ${q?.expiry ?? 'expired'})`; }).join(', ')} - rerun them alone before reading anything into it ***`);
console.log(failed.length ? `\n${failed.length} suite(s) failed: ${failed.map((r) => r.s).join(', ')}` : '\nall e2e suites passed');
process.exit(failed.length ? 1 : 0);
