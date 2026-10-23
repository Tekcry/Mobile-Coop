// Laptop queue service (docs/laptop-queue/PLAN.md): picks requests (branch laptop-queue) and train heads, runs them on the
// two laptop slots (4189, 4192), posts the verdict as a commit status. Pure logic is in lib.mjs.
//   node scripts/laptop-queue/service.mjs [--once] [--dry-run]
// --once: one pass, then exit when its runs finish. --dry-run: prints what it would pick, the shard bins and the gh
// commands; posts, pushes, builds, runs and locks nothing. Env: LQ_STATE (state dir), LQ_TRAIN_JOBS (default 3),
// LQ_FOLLOW (ref to fast-forward to when idle, default origin/master).
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { capTail, describe, failureExcerpt, lockChanged, mergeTimes, parseRun, pick, requestProblem, contextName, runComplete, shard, suiteSection } from './lib.mjs';

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

const COMMENT_MAX = 60_000;

/** Posts a PR comment, the JSON body through stdin (no argv length limit), body capped at COMMENT_MAX chars. */
function postComment(pr, body) {
  const text = body.length > COMMENT_MAX ? `${body.slice(0, COMMENT_MAX - 20)}\n...(comment cut)` : body;
  const args = ['api', `repos/${REPO}/issues/${pr}/comments`, '--input', '-'];
  if (DRY) { log(`dry-run: gh ${args.join(' ')} <body: ${text.split('\n').length} lines>`); return; }
  try { gh(args, { input: JSON.stringify({ body: text }) }); log(`comment on #${pr}`); } catch (e) { log(`comment failed: ${String(e.message).split('\n')[0]}`); }
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

/**
 * Train heads still to run: no laptop-e2e status, or a stale `pending` one (not claimed by this process; the pid lock
 * means no other service can be running it). Read from the combined status (latest state per context). A gh / network
 * error skips the head this pass (never read as "no status"). Merged heads and heads older than LQ_TRAIN_MAX_AGE_H
 * (default 24) are skipped.
 */
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
    let st;
    try {
      st = gh(['api', `repos/${REPO}/commits/${m[1]}/status`, '--jq', '[.statuses[] | select(.context == "laptop-e2e") | .state] | first // ""']);
    } catch (e) { log(`train ${m[2]} ${m[1].slice(0, 8)}: status read failed, skipped this pass: ${String(e.message).split('\n')[0]}`); continue; }
    if (st === '' || (st === 'pending' && !claimed.has(m[1]))) out.push({ sha: m[1], n: m[2], stale: st === 'pending' });
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

/** Lock lines this process holds. */
const heldLocks = new Set();

/**
 * Takes a slot lock (exclusive create). A `laptop-queue |` line this process does not hold is stale (the pid lock means
 * no other service runs) and is deleted; any other holder (a manual run) is waited on.
 */
async function takeLock(port, label, sha) {
  const line = `laptop-queue | ${label} ${sha.slice(0, 8)} pid ${process.pid} | ${new Date().toISOString()}`;
  for (;;) {
    try { fs.writeFileSync(SLOTS[port].lock, `${line}\n`, { flag: 'wx' }); heldLocks.add(line); return line; } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let have = '';
      try { have = fs.readFileSync(SLOTS[port].lock, 'utf8').trim(); } catch { continue; /* gone: retry at once */ }
      if (have.startsWith('laptop-queue |') && !heldLocks.has(have)) {
        log(`stale lock on ${port} removed: ${have}`);
        try { fs.unlinkSync(SLOTS[port].lock); } catch { /* gone */ }
        continue;
      }
      await sleep(15_000);
    }
  }
}
function releaseLock(port, line) {
  heldLocks.delete(line);
  try { if (fs.readFileSync(SLOTS[port].lock, 'utf8').trim() === line) fs.unlinkSync(SLOTS[port].lock); } catch { /* gone */ }
}

/**
 * Fetch (one retry), clean, detach at sha, npm ci when needed, build. Returns 'ok' | 'fetch' (fetch failed twice: skip
 * this pass, not a verdict) | 'nosha' | 'build'. npm ci runs when node_modules is missing or package-lock.json differs
 * (beyond its version lines) from the text saved after this slot's last SUCCESSFUL npm ci, so a failed one is retried.
 */
async function prepare(port, sha, logFile) {
  const cwd = SLOTS[port].dir;
  let fetched = false;
  for (let i = 0; i < 2 && !fetched; i++) {
    try { git(['fetch', '-q', 'origin'], { cwd }); fetched = true; } catch (e) { log(`fetch in ${port} failed (try ${i + 1}): ${String(e.message).split('\n')[0]}`); }
  }
  if (!fetched) return 'fetch';
  git(['checkout', '-q', '--', '.'], { cwd, soft: true });
  git(['clean', '-fdq'], { cwd, soft: true });
  try { git(['checkout', '-q', '--detach', sha], { cwd }); } catch { return 'nosha'; }
  const lockNow = fs.readFileSync(path.join(cwd, 'package-lock.json'), 'utf8');
  let lockInstalled = null;
  try { lockInstalled = fs.readFileSync(file(`npm-ci-${port}.lock.json`), 'utf8'); } catch { /* never installed by the service */ }
  if (!fs.existsSync(path.join(cwd, 'node_modules')) || lockInstalled === null || lockChanged(lockInstalled, lockNow)) {
    if (await sh('npm ci', { cwd, logFile }) !== 0) return 'build';
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(file(`npm-ci-${port}.lock.json`), lockNow);
  }
  return (await sh('npm run build', { cwd, logFile })) === 0 ? 'ok' : 'build';
}

/** One run-e2e call on a slot; returns the parsed run plus its exit code and the last 40 lines of its output. */
async function e2e(port, suites, jobs, logFile) {
  freePort(port);
  const env = { E2E_PORT: port, E2E_JOBS: String(jobs), E2E_GPU: '1', E2E_SUITE_TIMEOUT: '900' };
  const code = await sh(`node scripts/run-e2e.mjs ${suites.join(' ')}`, { cwd: SLOTS[port].dir, env, logFile });
  freePort(port);
  const text = fs.readFileSync(logFile, 'utf8').split(/^\$ node scripts\/run-e2e.mjs /m).pop() ?? '';
  return { ...parseRun(text), code, tail40: failureExcerpt(text).tail40 };
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
    if (runComplete(run, 1) && run.suites.every((s) => s.ok)) {
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
    let sec = '';
    for (const f of fs.existsSync(runDir) ? fs.readdirSync(runDir) : []) {
      if (!f.endsWith('.log') || f.startsWith('rerun-')) continue;
      sec = suiteSection(fs.readFileSync(path.join(runDir, f), 'utf8'), x.s);
      if (sec) break;
    }
    const { assert, tail40 } = failureExcerpt(sec);
    parts.push(`\n**${x.s}**\nFailing assert: \`${capTail(assert || 'none found', 500)}\`\nLog on the laptop: ${runDir}\n\`\`\`\n${capTail(tail40 || '(no log section)', 8_000)}\n\`\`\``);
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
    if (prep.includes('fetch')) {
      // not a verdict: the pending status is now unclaimed (stale) and the next pass picks the train again
      log(`train ${train.n}: fetch failed, retried next pass`);
      claimed.delete(train.sha);
      return;
    }
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
    const prNumber = Number(gh(['pr', 'list', '-R', REPO, '--head', `train/${train.n}`, '--json', 'number', '--jq', '.[0].number'], { soft: true })) || 0;
    // a shard that died before its summary (or lost suites) is a failure, never a partial success
    const broken = PORTS.findIndex((p, i) => !runComplete(runs[i], bins[i].suites.length, true));
    if (broken >= 0) {
      const p = PORTS[broken];
      const r = runs[broken];
      log(`train ${train.n}: shard ${p} incomplete (exit ${r.code}, ${r.suites.length}/${bins[broken].suites.length} suites, summary ${r.complete ? 'seen' : 'missing'})`);
      postStatus(train.sha, 'failure', 'laptop-e2e', `shard ${p} gave no result`);
      if (prNumber) postComment(prNumber, `laptop-e2e failed on ${train.sha.slice(0, 8)} (${job.ref}): shard ${p} gave no result (exit ${r.code}, ${r.suites.length}/${bins[broken].suites.length} suites).\nLog on the laptop: ${path.join(runDir, `${p}.log`)}\n\`\`\`\n${capTail(r.tail40 || '(empty log)', 8_000)}\n\`\`\``);
      state.trains[train.sha] = { result: 'incomplete', shard: p, date: new Date().toISOString() };
      return;
    }
    const slotOf = {};
    runs.forEach((r, i) => r.suites.forEach((s) => { slotOf[s.s] = PORTS[i]; }));
    const result = { suites: runs.flatMap((r) => r.suites), wall: 0, flakes: [] };
    result.flakes = await rerunFlakes(result, slotOf, job, runDir);
    result.wall = (Date.now() - t0) / 1000;
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
    if (prep === 'fetch') {
      // not a verdict and not done: the claim is dropped and the next pass takes it again
      postStatus(r.sha, 'pending', ctx, 'fetch failed, retrying');
      log(`${r.id}: fetch failed, retried next pass`);
      claimed.delete(r.id);
      return;
    }
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
    // same completeness rule as a train shard; at least the listed suites (a named suite may expand into parts)
    if (!runComplete(run, list.length)) {
      log(`${r.id}: run incomplete (exit ${run.code}, ${run.suites.length}/${list.length} suites, summary ${run.complete ? 'seen' : 'missing'})`);
      postStatus(r.sha, 'failure', ctx, `slot ${port} gave no result`);
      if (r.pr) postComment(r.pr, `${ctx} failed on ${r.sha.slice(0, 8)} (${job.ref}): slot ${port} gave no result (exit ${run.code}, ${run.suites.length}/${list.length} suites).\nLog on the laptop: ${path.join(runDir, `${port}.log`)}\n\`\`\`\n${capTail(run.tail40 || '(empty log)', 8_000)}\n\`\`\``);
      state.done[r.id] = { result: 'incomplete', date: new Date().toISOString() };
      return;
    }
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
    const run = runTrain(p.train).catch((e) => {
      log(`train ${p.train.n} service error: ${e.stack ?? e.message}`);
      postStatus(p.train.sha, 'error', 'laptop-e2e', 'service error, see log');
      claimed.delete(p.train.sha);
    });
    PORTS.forEach((x) => { busy[x] = run; });
    return run;
  }
  claimed.add(p.request.id);
  const ports = p.kind === 'alone' ? PORTS : [p.slot];
  if (DRY) { log(`dry-run: would run ${p.request.id} (${p.request.kind}, ${p.request.suites ?? p.request.steps ?? 'full'}) on ${ports.join('+')}`); return Promise.resolve(); }
  const run = runRequest(p.request, p.slot ?? PORTS[0]).catch((e) => {
    log(`${p.request.id} service error: ${e.stack ?? e.message}`);
    postStatus(p.request.sha, 'error', contextName(p.request.kind, p.request.set, p.request.suites), 'service error, see log');
    claimed.delete(p.request.id);
  });
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
