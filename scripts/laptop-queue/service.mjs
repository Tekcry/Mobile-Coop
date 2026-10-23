// Laptop queue service (docs/laptop-queue/PLAN.md): picks requests (branch laptop-queue) and train heads, runs them on the
// two laptop slots (4189, 4192), posts the verdict as a commit status. Pure logic is in lib.mjs.
//   node scripts/laptop-queue/service.mjs [--once] [--dry-run]
// --once: one pass, then exit when its runs finish. --dry-run: prints what it would pick, the shard bins and the gh
// commands; posts, pushes, builds, runs and locks nothing. Env: LQ_STATE (state dir), LQ_TRAIN_JOBS (default 3),
// LQ_FOLLOW (ref to fast-forward to when idle, default origin/master).
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, failureExcerpt, lockChanged, mergeTimes, parseRun, pick, requestProblem, contextName, shard } from './lib.mjs';

const REPO = 'Tekcry/Mobile-Coop';
const STATE_DIR = process.env.LQ_STATE ?? 'C:/NightShift/scratch/laptop-queue';
const SLOTS = {
  4189: { dir: 'C:/NightShift/Mobile-Coop-testrun-4189', lock: 'C:/NightShift/heavy-4189.lock' },
  4192: { dir: 'C:/NightShift/Mobile-Coop-testrun-4192', lock: 'C:/NightShift/heavy-4192.lock' },
};
const PORTS = Object.keys(SLOTS);
const TRAIN_JOBS = process.env.LQ_TRAIN_JOBS ?? '3';
const POLL_MS = 30_000;
const FLAKE_WINDOW_MS = 24 * 3600_000;
const argv = process.argv.slice(2);
const ONCE = argv.includes('--once');
const DRY = argv.includes('--dry-run');
const HERE = process.cwd();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const file = (name) => path.join(STATE_DIR, name);

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}`;
  console.info(line);
  if (!DRY) { try { fs.mkdirSync(STATE_DIR, { recursive: true }); fs.appendFileSync(file('log.txt'), `${line}\n`); } catch { /* console only */ } }
}

function readJson(name, fallback) {
  try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch { return fallback; }
}
function writeJson(name, data) {
  if (DRY) return;
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(file(name), JSON.stringify(data, null, 2));
}

const state = readJson('state.json', {});
state.done ??= {};
state.trains ??= {};
state.flakes ??= [];
// times.json (refreshed from real runs) over the repo's scripts/e2e-times.json as the seed
let seed = {};
try { seed = JSON.parse(fs.readFileSync(path.join(HERE, 'scripts/e2e-times.json'), 'utf8')); } catch { /* no seed */ }
let times = { ...seed, ...readJson('times.json', {}) };

// ---------- git, gh ----------

/** Runs a command, returns stdout ('' and no throw on failure when soft). */
function cmd(exe, args, { cwd = HERE, soft = false, input } = {}) {
  try {
    return execFileSync(exe, args, { cwd, encoding: 'utf8', timeout: 120_000, windowsHide: true, input, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 << 20 }).trim();
  } catch (e) {
    if (soft) return '';
    throw e;
  }
}
const git = (args, opts) => cmd('git', args, opts);
const gh = (args, opts) => cmd('gh', args, opts);

/** Posts a commit status (dry run: prints the gh command). */
function postStatus(sha, status, context, description) {
  const args = ['api', `repos/${REPO}/statuses/${sha}`, '-f', `state=${status}`, '-f', `context=${context}`, '-f', `description=${description}`];
  if (DRY) { log(`dry-run: gh ${args.join(' ')}`); return; }
  try { gh(args); log(`status ${context} ${status} on ${sha.slice(0, 8)}: ${description}`); } catch (e) { log(`status post failed: ${String(e.message).split('\n')[0]}`); }
}

function postComment(pr, body) {
  const args = ['api', `repos/${REPO}/issues/${pr}/comments`, '-f', `body=${body}`];
  if (DRY) { log(`dry-run: gh api repos/${REPO}/issues/${pr}/comments -f body=<${body.split('\n').length} lines>`); return; }
  try { gh(args); log(`comment on #${pr}`); } catch (e) { log(`comment failed: ${String(e.message).split('\n')[0]}`); }
}

// ---------- queue sources ----------

const badSeen = new Set();

function listRequests() {
  git(['fetch', '-q', 'origin'], { soft: true });
  const names = git(['ls-tree', '--name-only', 'origin/laptop-queue', 'requests/'], { soft: true }).split('\n').filter((n) => n.endsWith('.json'));
  const out = [];
  for (const n of names) {
    const id = path.basename(n, '.json');
    if (state.done[id] || badSeen.has(id)) continue;
    let r;
    try { r = JSON.parse(git(['show', `origin/laptop-queue:${n}`])); } catch { r = null; }
    const problem = requestProblem(r);
    if (problem) { badSeen.add(id); log(`bad request ${id}: ${problem}`); continue; }
    out.push(r);
  }
  return out;
}

/** Train heads with no laptop-e2e status; merged heads and heads older than LQ_TRAIN_MAX_AGE_H (default 24) are skipped. */
function pendingTrains() {
  const out = [];
  const maxAge = Number(process.env.LQ_TRAIN_MAX_AGE_H ?? 24) * 3600;
  git(['fetch', '-q', 'origin', '+refs/heads/train/*:refs/remotes/origin/train/*'], { soft: true });
  for (const line of git(['ls-remote', 'origin', 'refs/heads/train/*'], { soft: true }).split('\n')) {
    const m = /^([0-9a-f]{40})\trefs\/heads\/train\/(\S+)$/.exec(line);
    if (!m || state.trains[m[1]]) continue;
    const age = Date.now() / 1000 - Number(git(['show', '-s', '--format=%ct', m[1]], { soft: true }));
    if (!(age < maxAge)) continue;
    try { git(['merge-base', '--is-ancestor', m[1], 'origin/master']); continue; } catch { /* not merged */ }
    const have = gh(['api', `repos/${REPO}/commits/${m[1]}/statuses`, '--jq', '.[].context'], { soft: true }).split('\n');
    if (!have.includes('laptop-e2e')) out.push({ sha: m[1], n: m[2] });
  }
  return out;
}

// ---------- processes, locks, ports ----------

/** Runs a shell command line, output appended to logFile; resolves with the exit code (124 on timeout). */
function sh(line, { cwd, env = {}, logFile, timeoutMs = 3600_000 }) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const fd = fs.openSync(logFile, 'a');
  fs.writeSync(fd, `\n$ ${line}\n`);
  return new Promise((resolve) => {
    const child = spawn(line, { cwd, env: { ...process.env, ...env }, shell: true, windowsHide: true, stdio: ['ignore', fd, fd] });
    const timer = setTimeout(() => {
      try { cmd('taskkill', ['/pid', String(child.pid), '/t', '/f'], { soft: true }); } catch { /* gone */ }
      resolve(124);
    }, timeoutMs);
    child.on('exit', (code) => { clearTimeout(timer); resolve(code ?? 1); });
    child.on('error', () => { clearTimeout(timer); resolve(1); });
  }).finally(() => fs.closeSync(fd));
}

/** Kills whatever listens on the port (a server left by a killed run). */
function freePort(port) {
  for (const l of cmd('netstat', ['-ano', '-p', 'tcp'], { soft: true }).split('\n')) {
    const m = new RegExp(`:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`).exec(l);
    if (m) cmd('taskkill', ['/pid', m[1], '/t', '/f'], { soft: true });
  }
}

async function takeLock(port, label, sha) {
  const line = `laptop-queue | ${label} ${sha.slice(0, 8)} | ${new Date().toISOString()}`;
  for (;;) {
    try { fs.writeFileSync(SLOTS[port].lock, `${line}\n`, { flag: 'wx' }); return line; } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      await sleep(15_000);
    }
  }
}
function releaseLock(port, line) {
  try { if (fs.readFileSync(SLOTS[port].lock, 'utf8').trim() === line) fs.unlinkSync(SLOTS[port].lock); } catch { /* gone */ }
}

/** Fetch, clean, detach at sha, npm ci when needed, build. Returns 'ok' | 'nosha' | 'build'. */
async function prepare(port, sha, logFile) {
  const cwd = SLOTS[port].dir;
  git(['fetch', '-q', 'origin'], { cwd, soft: true });
  git(['checkout', '-q', '--', '.'], { cwd, soft: true });
  git(['clean', '-fdq'], { cwd, soft: true });
  const before = git(['show', 'HEAD:package-lock.json'], { cwd, soft: true });
  try { git(['checkout', '-q', '--detach', sha], { cwd }); } catch { return 'nosha'; }
  const after = fs.readFileSync(path.join(cwd, 'package-lock.json'), 'utf8');
  if (!fs.existsSync(path.join(cwd, 'node_modules')) || lockChanged(before, after)) {
    if (await sh('npm ci', { cwd, logFile }) !== 0) return 'build';
  }
  return (await sh('npm run build', { cwd, logFile })) === 0 ? 'ok' : 'build';
}

/** One run-e2e call on a slot; returns the parsed run. */
async function e2e(port, suites, jobs, logFile) {
  freePort(port);
  const env = { E2E_PORT: port, E2E_JOBS: String(jobs), E2E_GPU: '1', E2E_SUITE_TIMEOUT: '900' };
  await sh(`node scripts/run-e2e.mjs ${suites.join(' ')}`, { cwd: SLOTS[port].dir, env, logFile });
  freePort(port);
  const run = parseRun(fs.readFileSync(logFile, 'utf8').split(/^\$ node scripts\/run-e2e.mjs /m).pop() ?? '');
  return run;
}

// ---------- results ----------

/** Reruns each failed (non-known-flaky) suite once alone; a pass is a flake. Mutates result.suites, returns flake names. */
async function rerunFlakes(result, slotOf, job, runDir) {
  const flakes = [];
  const now = Date.now();
  for (const x of result.suites.filter((s) => !s.ok && !s.flaky && !s.report)) {
    if (state.flakes.some((f) => f.suite === x.s && now - Date.parse(f.date) < FLAKE_WINDOW_MS)) { log(`${x.s} flaked within 24 h, failure stands`); continue; }
    if (DRY) continue;
    const port = slotOf[x.s] ?? PORTS[0];
    log(`rerun ${x.s} alone on ${port}`);
    const run = await e2e(port, [x.s], 1, path.join(runDir, `rerun-${x.s.replace(/\W/g, '_')}.log`));
    if (run.suites.length && run.suites.every((s) => s.ok)) {
      x.ok = true;
      flakes.push(x.s);
      state.flakes.push({ suite: x.s, sha: job.sha, ref: job.ref, date: new Date().toISOString() });
    }
  }
  return flakes;
}

function failureComment(job, result, runDir) {
  const parts = [`laptop-e2e failed on ${job.sha.slice(0, 8)} (${job.ref}).`];
  for (const x of result.suites.filter((s) => !s.ok && !s.flaky && !s.report)) {
    let ex = '';
    for (const f of fs.existsSync(runDir) ? fs.readdirSync(runDir) : []) {
      if (!f.endsWith('.log') || f.startsWith('rerun-')) continue;
      ex = failureExcerpt(fs.readFileSync(path.join(runDir, f), 'utf8'), x.s);
      if (ex) break;
    }
    parts.push(`\n**${x.s}**\n\`\`\`\n${ex || '(no failing line found)'}\n\`\`\`\nLog on the laptop: ${runDir}`);
  }
  return parts.join('\n');
}

function finish(job, ctx, result, runDir, prNumber) {
  const bad = result.suites.filter((s) => !s.ok && !s.flaky && !s.report);
  const ok = result.suites.length > 0 && bad.length === 0;
  const desc = result.suites.length ? describe(result) : 'no result parsed, see log';
  postStatus(job.sha, ok ? 'success' : 'failure', ctx, desc);
  if (!ok && prNumber && !DRY) postComment(prNumber, failureComment(job, result, runDir));
  times = mergeTimes(times, result.suites);
  writeJson('times.json', times);
  return ok;
}

// ---------- the runs ----------

const claimed = new Set();

async function runTrain(train) {
  const id = `train-${train.n}-${train.sha.slice(0, 8)}`;
  const job = { sha: train.sha, ref: `train/${train.n}` };
  const runDir = path.join(STATE_DIR, 'runs', id);
  log(`train ${train.n} ${train.sha.slice(0, 8)}: start`);
  const locks = {};
  try {
    for (const p of PORTS) locks[p] = await takeLock(p, `train ${train.n}`, train.sha);
    postStatus(train.sha, 'pending', 'laptop-e2e', 'sharded 4189+4192');
    const prep = await Promise.all(PORTS.map((p) => prepare(p, train.sha, path.join(runDir, `${p}.log`))));
    if (prep.some((r) => r !== 'ok')) {
      const nosha = prep.includes('nosha');
      postStatus(train.sha, nosha ? 'error' : 'failure', 'laptop-e2e', nosha ? 'sha not found' : 'build failed');
      state.trains[train.sha] = { result: nosha ? 'nosha' : 'build', date: new Date().toISOString() };
      return;
    }
    const list = cmd('node', ['scripts/run-e2e.mjs', '--list'], { cwd: SLOTS[PORTS[0]].dir }).split('\n').map((x) => x.trim()).filter(Boolean);
    const bins = shard(list, times, PORTS.length);
    bins.forEach((b, i) => log(`bin ${PORTS[i]}: ${b.suites.length} suites, weight ${Math.round(b.weight)} s`));
    const t0 = Date.now();
    const runs = await Promise.all(PORTS.map((p, i) => e2e(p, bins[i].suites, TRAIN_JOBS, path.join(runDir, `${p}.log`))));
    const slotOf = {};
    runs.forEach((r, i) => r.suites.forEach((s) => { slotOf[s.s] = PORTS[i]; }));
    const result = { suites: runs.flatMap((r) => r.suites), wall: 0, flakes: [] };
    result.flakes = await rerunFlakes(result, slotOf, job, runDir);
    result.wall = (Date.now() - t0) / 1000;
    const prNumber = Number(gh(['pr', 'list', '-R', REPO, '--head', `train/${train.n}`, '--json', 'number', '--jq', '.[0].number'], { soft: true })) || 0;
    const ok = finish(job, 'laptop-e2e', result, runDir, prNumber);
    state.trains[train.sha] = { result: ok ? 'success' : 'failure', wall: result.wall, date: new Date().toISOString() };
  } finally {
    for (const p of PORTS) { if (locks[p]) releaseLock(p, locks[p]); freePort(p); }
    writeJson('state.json', state);
    log(`train ${train.n}: done`);
  }
}

async function runRequest(r, port) {
  const runDir = path.join(STATE_DIR, 'runs', r.id);
  const ctx = contextName(r.kind, r.set, r.suites);
  const job = { sha: r.sha, ref: r.branch || r.sha.slice(0, 8) };
  log(`${r.id}: ${r.kind} on ${port}`);
  const ports = r.kind === 'alone' ? PORTS : [port];
  const locks = {};
  try {
    for (const p of ports) locks[p] = await takeLock(p, r.id, r.sha);
    postStatus(r.sha, 'pending', ctx, 'running');
    const prep = await prepare(ports[0], r.sha, path.join(runDir, 'prepare.log'));
    if (prep !== 'ok') {
      postStatus(r.sha, prep === 'nosha' ? 'error' : 'failure', ctx, prep === 'nosha' ? 'sha not found' : 'build failed');
      state.done[r.id] = { result: prep, date: new Date().toISOString() };
      return;
    }
    if (r.kind === 'alone') {
      const t0 = Date.now();
      let okSteps = 0;
      for (const [i, step] of r.steps.entries()) {
        const line = step.startsWith('serve ') ? `node scripts/laptop-queue/serve.mjs ${step.slice(6)}` : step;
        freePort(ports[0]);
        const code = await sh(line, { cwd: SLOTS[ports[0]].dir, env: { ...r.env, E2E_PORT: ports[0], E2E_GPU: '1' }, logFile: path.join(runDir, `step${i + 1}.log`) });
        if (code === 0) okSteps++;
        freePort(ports[0]);
      }
      const good = okSteps === r.steps.length;
      postStatus(r.sha, good ? 'success' : 'failure', ctx, `${okSteps}/${r.steps.length} steps ok, ${Math.round((Date.now() - t0) / 1000)} s`);
      state.done[r.id] = { result: good ? 'success' : 'failure', date: new Date().toISOString() };
      return;
    }
    const list = r.kind === 'full' ? cmd('node', ['scripts/run-e2e.mjs', '--list'], { cwd: SLOTS[port].dir }).split('\n').map((x) => x.trim()).filter(Boolean) : r.suites;
    const jobs = r.jobs ?? (r.kind === 'full' ? 3 : 2);
    const t0 = Date.now();
    const run = await e2e(port, list, jobs, path.join(runDir, `${port}.log`));
    const result = { suites: run.suites, wall: 0, flakes: [] };
    result.flakes = await rerunFlakes(result, {}, job, runDir);
    result.wall = (Date.now() - t0) / 1000;
    const ok = finish(job, ctx, result, runDir, r.pr);
    state.done[r.id] = { result: ok ? 'success' : 'failure', wall: result.wall, date: new Date().toISOString() };
  } finally {
    for (const p of ports) { if (locks[p]) releaseLock(p, locks[p]); freePort(p); }
    writeJson('state.json', state);
    log(`${r.id}: done`);
  }
}

// ---------- the loop ----------

const busy = Object.fromEntries(PORTS.map((p) => [p, null]));

function dispatch(p) {
  if (p.kind === 'train') {
    claimed.add(p.train.sha);
    if (DRY) { log(`dry-run: would run train ${p.train.n} ${p.train.sha.slice(0, 8)} on both slots`); return planTrain(p.train.sha); }
    const run = runTrain(p.train).catch((e) => log(`train failed: ${e.message}`));
    PORTS.forEach((x) => { busy[x] = run; });
    return run;
  }
  claimed.add(p.request.id);
  const ports = p.kind === 'alone' ? PORTS : [p.slot];
  if (DRY) { log(`dry-run: would run ${p.request.id} (${p.request.kind}, ${p.request.suites ?? p.request.steps ?? 'full'}) on ${ports.join('+')}`); return Promise.resolve(); }
  const run = runRequest(p.request, p.slot ?? PORTS[0]).catch((e) => log(`${p.request.id} failed: ${e.message}`));
  ports.forEach((x) => { busy[x] = run; });
  return run;
}

/** Dry run: the shard bins for the current full list and the gh commands a train would run. */
let previewed = false;
function planTrain(sha = '<train sha>') {
  previewed = true;
  const list = cmd('node', ['scripts/run-e2e.mjs', '--list'], { soft: true }).split('\n').map((x) => x.trim()).filter(Boolean);
  const bins = shard(list, times, PORTS.length);
  bins.forEach((b, i) => log(`dry-run: bin ${PORTS[i]} (weight ${Math.round(b.weight)} s): ${b.suites.map((s) => `${s}=${Math.round(times[s] ?? 0) || 'median'}`).join(' ')}`));
  postStatus(sha, 'pending', 'laptop-e2e', 'sharded 4189+4192');
  postStatus(sha, 'success', 'laptop-e2e', `${list.length}/${list.length} pass, <wall> s`);
  return Promise.resolve();
}

async function pass() {
  const queue = { trains: pendingTrains().filter((t) => !claimed.has(t.sha)), requests: listRequests().filter((r) => !claimed.has(r.id)) };
  log(`queue: ${queue.trains.length} train(s), ${queue.requests.length} request(s)`);
  const virtual = {};
  for (let i = 0; i < 4; i++) {
    const slots = PORTS.map((port) => ({ port, busy: Boolean(busy[port] || virtual[port]) }));
    const p = pick(queue, Date.now(), slots);
    if (!p) break;
    if (p.kind === 'train') queue.trains = queue.trains.filter((t) => t !== p.train);
    else queue.requests = queue.requests.filter((r) => r !== p.request);
    const run = dispatch(p);
    if (DRY) (p.kind === 'request' ? [p.slot] : PORTS).forEach((x) => { virtual[x] = true; });
    else run.finally(() => PORTS.forEach((x) => { if (busy[x] === run) busy[x] = null; }));
  }
  if (DRY && !previewed) { log('dry-run: no train pending; shard preview of the current list:'); await planTrain(); }
}

/** Single instance: exit 0 at once when service.pid names a live node process. */
function takePidLock() {
  try {
    const pid = Number(fs.readFileSync(file('service.pid'), 'utf8'));
    if (pid && pid !== process.pid && cmd('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { soft: true }).toLowerCase().includes('node')) {
      console.info(`service already running (pid ${pid})`);
      process.exit(0);
    }
  } catch { /* no lock */ }
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(file('service.pid'), String(process.pid));
  process.on('exit', () => { try { if (fs.readFileSync(file('service.pid'), 'utf8') === String(process.pid)) fs.unlinkSync(file('service.pid')); } catch { /* gone */ } });
}

/** When idle: fast-forward this checkout to LQ_FOLLOW; exit (the 5-min task restarts us) if the service files changed. */
function selfUpdate() {
  const follow = process.env.LQ_FOLLOW ?? 'origin/master';
  const head = git(['rev-parse', 'HEAD'], { soft: true });
  const target = git(['rev-parse', follow], { soft: true });
  if (!head || !target || head === target) return;
  try { git(['merge-base', '--is-ancestor', head, target]); } catch { return; }
  const changed = git(['diff', '--name-only', head, target, '--', 'scripts/laptop-queue', 'scripts/run-e2e.mjs']) !== '';
  git(['checkout', '-q', '--detach', target]);
  log(`fast-forwarded to ${target.slice(0, 8)}${changed ? ', restarting' : ''}`);
  if (changed) process.exit(0);
}

async function main() {
  if (!DRY) takePidLock();
  log(`service start${ONCE ? ' --once' : ''}${DRY ? ' --dry-run' : ''} in ${HERE}`);
  if (ONCE || DRY) {
    await pass();
    await Promise.all(Object.values(busy).filter(Boolean));
    return;
  }
  for (;;) {
    try {
      await pass();
      if (!Object.values(busy).some(Boolean)) selfUpdate();
    } catch (e) { log(`pass failed: ${e.message}`); }
    await sleep(POLL_MS);
  }
}

await main();
