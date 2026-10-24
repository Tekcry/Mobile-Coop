// Laptop queue service (docs/laptop-queue/PLAN.md): picks requests (branch laptop-queue) and train heads, runs them on the
// two laptop slots (4189, 4192), posts the verdict as a commit status. Pure logic is in lib.mjs.
//   node scripts/laptop-queue/service.mjs [--once] [--dry-run]
// --once: one pass, then exit when its runs finish. --dry-run: prints what it would pick, the shard bins and the gh
// commands; posts, pushes, builds, runs and locks nothing. Env: LQ_STATE (state dir), LQ_TRAIN_JOBS (default 3),
// LQ_FOLLOW (ref to fast-forward to when idle, default origin/master), LQ_CLAIM_MAX_H (default 3), LQ_TRAIN_SOLO_MIN
// (default 10: a train holding some slots that long while the rest stay locked runs unsharded on the ones it holds).
// LQ_WORKER=desktop: the desktop overflow lane (Michael ~20:45): pr requests only, two GPU slots at E2E_JOBS=1, each only
// while the backlog is over LQ_DESKTOP_BACKLOG (3) requests, its lock is free and CPU is under its limit at the start:
// 4191 (LQ_DESKTOP_DIR, default C:/NightShift/Mobile-Coop-testrun-4191) under C:/NightShift/heavy.lock, CPU < LQ_DESKTOP_CPU (80) %;
// 4192 (LQ_DESKTOP_DIR2, default ...-testrun-4192) under heavy2.lock, CPU < LQ_DESKTOP_CPU2 (80) %, and its dir must exist
// (both 80 since the Orchestrator audit 2026-10-24: the queue's own 4191 run kept 4192 under the old 50 % gate for ~8 min).
// At most one new start per pass, so CPU is re-read before the second slot. No alone. Trains only while the laptop is
// silent: no claim / done push by 'laptop' on the branch for LQ_LAPTOP_SILENT_MIN (10) min, the laptop service claims
// trains itself and the head is over 2 min old; then the backlog gate is dropped (lock, dir and CPU gates stay) and the
// train runs sharded on the desktop slots whose dir exists (4191+4192), E2E_JOBS=LQ_TRAIN_JOBS (desktop default 1).
// Build marker (desktop): while <AUTO_TRAIN_SCRATCH or C:/NightShift/scratch>/auto-train-building.json (auto-train writes
// it during `merge-train build`, in the same folder; LQ_BUILD_MARKER overrides the path) exists and is younger than LQ_BUILD_MARKER_MAX_MIN (30) min,
// the desktop starts no new request or train; runs already going continue. An older marker is ignored (logged once).
// Every request and train is claimed (claims/<id>.json, a train: claims/<sha>.json, on the laptop-queue branch, an
// atomic push) before it runs and marked done after, so the two workers never run the same request or train.
// Train reruns (request.mjs --train-rerun, from auto-train): kind pr, picked right after trains on one slot at E2E_JOBS=1
// (laptop only); its context is laptop-e2e/<set> like any request (auto-train's: laptop-e2e/train<n>-rerun), and
// laptop-e2e/rerun-<suites> only when it has no set; a full pass also posts laptop-e2e success on the sha.
// Supersede: an open pr / full request is marked done unrun when the same requester has a newer one (same set, or an
// ancestor sha with overlapping suites); pick runs a requester's newest request first (lib.mjs superseded, pick).
// Duplicates (Orchestrator audit 2026-10-24): an open request that runs exactly what another request runs (lib dupKey:
// sha, kind, suites or steps, env, set, jobs, pr; any requester) is marked done unrun as "duplicate of <id>" when that
// one is open (older), claimed or running, or done here with result success within LQ_DUP_WINDOW_MIN (60) min (never
// against a failure, error, build, nosha or incomplete result: a rerun of a failure runs). state.done entries older
// than 7 days (done claim pushed) are pruned on every state save.
// Yield: a pr / full / alone run that has not started its suites or steps (lock wait, fetch, npm ci, build) while a train
// head is pending gives its slot back (locks released, claim dropped, request stays queued; lib yieldTo).
// Cut short (Orchestrator audit 2026-10-24, lib cutShort): a running request whose requests/<id>.json left the branch
// (withdrawn; missing from two listings in a row) has its command tree killed, posts error "withdrawn" and is done; a
// plain pr request already in its suites when a train head is pending is killed and queued again (claim released,
// status "queued, preempted by train <n>"). Train reruns and full runs are never preempted; an alone run only in its first 10 min (below).
// Pinned requests (request.mjs --pin, "pin": true; A/B and baseline runs) are never superseded.
// Train soon (laptop, lib trainSoon): no new non-train claim (train reruns still start) while an open train PR has no
// version head yet (building, up to LQ_TRAIN_BUILD_MAX_MIN 20 min) or for LQ_TRAIN_GAP_MIN (3) min after a train PR
// merged while train-ready PRs with a green check wait. Manual locks (lib manualLocks): a slot whose lock is not the
// service's takes no new request claim (logged once per holder); trains still wait on it as before.
// Task guard (Michael 2026-10-24 07:13, after 87 stale NightShift-chain-* one-shots fired at 23:59 and held the slot
// locks): at start and every LQ_TASK_GUARD_MIN (10; 0 = off) min, disables (never stops, kills or deletes) each stale
// scheduled task (lib staleTasks; allowlist + env LQ_TASK_ALLOW, a comma list) and pushes alerts/<ts>-<worker>-tasks.json to the
// laptop-queue branch. --dry-run only logs what it would disable.
// Overlapping trains (Michael 2026-10-24 ~21:00, docs/orchestrator/overlap-trains-PLAN.md section 3; inert while no
// stacked trains exist): pending trains run lowest number first and a lower train's rerun goes before a higher train
// (lib pick); the desktop takes a second, different train while the laptop runs one (lib workerActivity openTrain,
// desktopTrainGate); auto-train's build marker holds back only trains at or above the one being built (lib
// trainsUnderMarker); a running train whose head is no longer an open train PR head (closed, voided or rebuilt; two
// checks LQ_TRAIN_VOID_POLL_S (60) s apart, lib voidMisses) is killed, posts laptop-e2e error "train closed" and
// releases its claim. A pending train also cuts an alone run whose steps started under 10 min ago (lib cutShort
// ALONE_PREEMPT_MIN); it is queued again at the head of the alone queue (lib pick queue.front).
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ALONE_AGE_MIN, agedAlone, assertKey, holdClears, manualLocks, trainSoon, buildMarker, cutShort, trainHold, capTail, claimBlocks, describe, desktopSlotGate, desktopTrainGate, dupKey, duplicates, failureExcerpt, flakeStands, lockChanged, mergeTimes, parseClaim, parseRun, pick, pruneDone, requestProblem, contextName, rerunPassed, runComplete, shard, staleTasks, superseded, suiteSection, trainBuildFailed, workerActivity, yieldTo, sortTrains, trainsUnderMarker, voidMisses, VOID_MISSES } from './lib.mjs';

const REPO = 'Tekcry/Mobile-Coop';
const DESKTOP = process.env.LQ_WORKER === 'desktop';
const WORKER = DESKTOP ? 'desktop' : 'laptop';
const STATE_DIR = process.env.LQ_STATE ?? `C:/NightShift/scratch/laptop-queue${DESKTOP ? '-desktop' : ''}`;
const SLOTS = DESKTOP
  ? {
      4191: { dir: process.env.LQ_DESKTOP_DIR ?? 'C:/NightShift/Mobile-Coop-testrun-4191', lock: 'C:/NightShift/heavy.lock' },
      4192: { dir: process.env.LQ_DESKTOP_DIR2 ?? 'C:/NightShift/Mobile-Coop-testrun-4192', lock: 'C:/NightShift/heavy2.lock' },
    }
  : {
      4189: { dir: 'C:/NightShift/Mobile-Coop-testrun-4189', lock: 'C:/NightShift/heavy-4189.lock' },
      4192: { dir: 'C:/NightShift/Mobile-Coop-testrun-4192', lock: 'C:/NightShift/heavy-4192.lock' },
    };
const DESKTOP_BACKLOG = Number(process.env.LQ_DESKTOP_BACKLOG ?? 3);
const DESKTOP_CPU = { 4191: Number(process.env.LQ_DESKTOP_CPU ?? 80), 4192: Number(process.env.LQ_DESKTOP_CPU2 ?? 80) };
const CLAIM_MAX_MS = Number(process.env.LQ_CLAIM_MAX_H ?? 3) * 3600_000;
const PORTS = Object.keys(SLOTS);
const TRAIN_JOBS = process.env.LQ_TRAIN_JOBS ?? (DESKTOP ? '1' : '3');
const LAPTOP_SILENT_MS = Number(process.env.LQ_LAPTOP_SILENT_MIN ?? 10) * 60_000;
const TRAIN_GRACE_MS = 2 * 60_000; // a live idle laptop claims a new train head within one pass (30 s)
const TRAIN_VOID_POLL_MS = Number(process.env.LQ_TRAIN_VOID_POLL_S ?? 60) * 1000;
// a train that has held some slots this long while another stays locked (a manual run) runs unsharded on the ones it holds
const TRAIN_SOLO_MS = Number(process.env.LQ_TRAIN_SOLO_MIN ?? 10) * 60_000;
const TRAIN_GAP_MS = Number(process.env.LQ_TRAIN_GAP_MIN ?? 3) * 60_000;
const TRAIN_BUILD_MAX_MS = Number(process.env.LQ_TRAIN_BUILD_MAX_MIN ?? 20) * 60_000;
const POLL_MS = 30_000;
const FLAKE_WINDOW_MS = 24 * 3600_000;
const DUP_WINDOW_MS = Number(process.env.LQ_DUP_WINDOW_MIN ?? 60) * 60_000;
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
const DONE_KEEP_MS = 7 * 24 * 3600_000;
/** Saves state.json, first dropping state.done entries over 7 days old whose done claim is on the branch (lib pruneDone). */
function saveState() {
  state.done = pruneDone(state.done, Date.now(), DONE_KEEP_MS, (id) => doneSynced.has(id));
  writeJson('state.json', state);
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
function cmd(exe, args, { cwd = HERE, soft = false, input, env } = {}) {
  try {
    return execFileSync(exe, args, { cwd, encoding: 'utf8', timeout: 120_000, windowsHide: true, input, env: env ? { ...process.env, ...env } : undefined, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 << 20 }).trim();
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
/** Requests the other worker finished (a done claim): never read again. */
const doneElsewhere = new Set();
/** claims/ files on the branch at the last listRequests (0: the laptop has not marked its old requests done yet). */
let claimCount = 0;
/** Requests the other worker holds an open claim on (claimed or running there), from the last listRequests. */
let otherActive = [];
/** Running request id -> listings in a row it was missing from; ids missing from two are withdrawn (lib cutShort). */
const missing = new Map();
const withdrawnIds = new Set();

function listRequests() {
  git(['fetch', '-q', 'origin'], { soft: true });
  const names = git(['ls-tree', '--name-only', 'origin/laptop-queue', 'requests/'], { soft: true }).split('\n').filter((n) => n.endsWith('.json'));
  const claims = new Set(git(['ls-tree', '--name-only', 'origin/laptop-queue', 'claims/'], { soft: true }).split('\n').filter(Boolean).map((n) => path.basename(n, '.json')));
  claimCount = claims.size;
  // a request running here whose file left the branch on two listings in a row was withdrawn (an empty listing, e.g. a
  // failed ls-tree, counts for nothing)
  if (names.length > 0) {
    const listed = new Set(names.map((n) => path.basename(n, '.json')));
    for (const id of activeReqs.keys()) {
      if (listed.has(id)) { missing.delete(id); continue; }
      const n = (missing.get(id) ?? 0) + 1;
      missing.set(id, n);
      if (n >= 2) withdrawnIds.add(id);
    }
  }
  const out = [];
  otherActive = [];
  for (const n of names) {
    const id = path.basename(n, '.json');
    if (state.done[id] || badSeen.has(id) || doneElsewhere.has(id)) continue;
    if (claims.has(id) && !claimed.has(id)) {
      const c = parseClaim(git(['show', `origin/laptop-queue:claims/${id}.json`], { soft: true }));
      if (c?.done) { doneElsewhere.add(id); continue; }
      if (claimBlocks(c, WORKER, Date.now(), CLAIM_MAX_MS)) {
        // kept for the duplicate check only (a new request equal to a run on the other worker never runs twice)
        try { const o = JSON.parse(git(['show', `origin/laptop-queue:${n}`])); if (!requestProblem(o)) otherActive.push(o); } catch { /* unreadable */ }
        continue;
      }
    }
    let r;
    try { r = JSON.parse(git(['show', `origin/laptop-queue:${n}`])); } catch { r = null; }
    // the id must be the file name: a running request's file is matched by name for the withdrawal check (checker FIX)
    const problem = requestProblem(r) || (r.id !== id ? `id ${r.id} does not match the file name` : '');
    if (problem) { badSeen.add(id); log(`bad request ${id}: ${problem}`); continue; }
    out.push(r);
  }
  return out;
}

// ---------- claims (laptop-queue branch) ----------

const QREF = 'refs/remotes/origin/laptop-queue';
const gitIdEnv = () => (git(['config', 'user.email'], { soft: true }) ? {} : { GIT_AUTHOR_NAME: 'laptop-queue', GIT_AUTHOR_EMAIL: 'laptop-queue@localhost', GIT_COMMITTER_NAME: 'laptop-queue', GIT_COMMITTER_EMAIL: 'laptop-queue@localhost' });

/**
 * Changes claims/<id>.json for each id in one commit on top of origin/laptop-queue and pushes it (index in a temp file,
 * the checkout untouched); a lost push race refetches and retries (5 tries). mode 'claim' (open; also refreshes this
 * worker's own `at`) is refused when the fresh parent holds a claim that blocks this worker; 'done' marks finished;
 * 'release' removes the claim (the run gave up). Returns true when pushed, 'blocked' when another worker holds the
 * claim, false when the push failed.
 */
function writeClaims(ids, mode, label) {
  if (ids.length === 0) return true;
  if (DRY) { log(`dry-run: would push ${mode} ${ids.length === 1 ? ids[0] : `${ids.length} ids`} (${WORKER})`); return true; }
  const tmpIndex = path.join(os.tmpdir(), `lq-claim-${process.pid}`);
  const env = { GIT_INDEX_FILE: tmpIndex, ...gitIdEnv() };
  try {
    for (let attempt = 1; attempt <= 5; attempt++) {
      git(['fetch', '-q', 'origin', `+refs/heads/laptop-queue:${QREF}`], { soft: true });
      const parent = git(['rev-parse', '--verify', '-q', QREF], { soft: true });
      if (!parent) return false;
      if (mode === 'claim') {
        const have = parseClaim(git(['show', `${parent}:claims/${ids[0]}.json`], { soft: true }));
        if (claimBlocks(have, WORKER, Date.now(), CLAIM_MAX_MS)) { log(`${ids[0]}: claimed by ${have.worker}, skipped`); return 'blocked'; }
      }
      fs.rmSync(tmpIndex, { force: true });
      git(['read-tree', parent], { env });
      if (mode === 'release') {
        for (const id of ids) git(['update-index', '--force-remove', `claims/${id}.json`], { env });
      } else {
        const blob = git(['hash-object', '-w', '--stdin'], { input: `${JSON.stringify({ worker: WORKER, pid: process.pid, at: new Date().toISOString(), done: mode === 'done' })}\n` });
        git(['update-index', '--add', '--index-info'], { env, input: ids.map((id) => `100644 ${blob}\tclaims/${id}.json\n`).join('') });
      }
      const tree = git(['write-tree'], { env });
      const commit = git(['commit-tree', tree, '-p', parent, '-m', `${label} (${WORKER})`], { env });
      try { git(['push', '-q', 'origin', `${commit}:refs/heads/laptop-queue`]); return true; } catch { /* lost the race: retry */ }
    }
    log(`${label}: push failed 5 times`);
    return false;
  } catch (e) {
    log(`${label}: ${String(e.message).split('\n')[0]}`);
    return false;
  } finally { fs.rmSync(tmpIndex, { force: true }); }
}

/** Adds or replaces one file (rel path) on the laptop-queue branch in one commit, writeClaims' plumbing; true when pushed. */
function pushFile(rel, text, label) {
  const tmpIndex = path.join(os.tmpdir(), `lq-file-${process.pid}`);
  const env = { GIT_INDEX_FILE: tmpIndex, ...gitIdEnv() };
  try {
    for (let attempt = 1; attempt <= 5; attempt++) {
      git(['fetch', '-q', 'origin', `+refs/heads/laptop-queue:${QREF}`], { soft: true });
      const parent = git(['rev-parse', '--verify', '-q', QREF], { soft: true });
      if (!parent) return false;
      fs.rmSync(tmpIndex, { force: true });
      git(['read-tree', parent], { env });
      const blob = git(['hash-object', '-w', '--stdin'], { input: text });
      git(['update-index', '--add', '--index-info'], { env, input: `100644 ${blob}\t${rel}\n` });
      const commit = git(['commit-tree', git(['write-tree'], { env }), '-p', parent, '-m', `${label} (${WORKER})`], { env });
      try { git(['push', '-q', 'origin', `${commit}:refs/heads/laptop-queue`]); return true; } catch { /* lost the race: retry */ }
    }
    log(`${label}: push failed 5 times`);
    return false;
  } catch (e) {
    log(`${label}: ${String(e.message).split('\n')[0]}`);
    return false;
  } finally { fs.rmSync(tmpIndex, { force: true }); }
}

// ---------- task guard ----------

const TASK_GUARD_MS = Number(process.env.LQ_TASK_GUARD_MIN ?? 10) * 60_000;
// exact names; NightShift-run-* one-shots with an EndBoundary are allowed in staleTasks
const TASK_ALLOW = ['NightShift-laptop-queue', 'NightShift-desktop-queue', 'NightShift auto-train',
  ...String(process.env.LQ_TASK_ALLOW ?? '').split(',').map((s) => s.trim()).filter(Boolean)];
// every scheduled task as JSON: { name, path, state, actions: [{ execute, args }], ends: [trigger EndBoundary] }
const TASK_LIST_PS = "$ErrorActionPreference = 'Stop'; $o = @(Get-ScheduledTask | ForEach-Object { [pscustomobject]@{ name = $_.TaskName; path = $_.TaskPath; state = [string]$_.State; "
  + 'actions = @($_.Actions | ForEach-Object { [pscustomobject]@{ execute = [string]$_.Execute; args = [string]$_.Arguments } }); '
  + 'ends = @($_.Triggers | ForEach-Object { [string]$_.EndBoundary }) } }); ConvertTo-Json -InputObject $o -Depth 4 -Compress';
// Disable-ScheduledTask only (a running instance keeps running); tasks from env LQ_GUARD_TASKS, [{ name, ok, err }] back
const TASK_DISABLE_PS = '$r = @(); $list = ConvertFrom-Json $env:LQ_GUARD_TASKS; foreach ($t in $list) { try { Disable-ScheduledTask -TaskPath $t.path -TaskName $t.name -ErrorAction Stop | Out-Null; '
  + '$r += [pscustomobject]@{ name = $t.name; ok = $true; err = \'\' } } catch { $r += [pscustomobject]@{ name = $t.name; ok = $false; err = [string]$_.Exception.Message } } }; ConvertTo-Json -InputObject @($r) -Compress';
const ps = (script, env) => cmd('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { env });
/** Disabled by the guard, alert push not landed yet: [{ name, why }], retried at the next guard pass. */
const alertPending = [];
let lastGuard = 0;

/** One guard pass: disable stale tasks, push one alert when anything is (or was) disabled. Never throws. */
function taskGuard() {
  lastGuard = Date.now();
  try {
    const tasks = JSON.parse(ps(TASK_LIST_PS) || '[]');
    const stale = staleTasks(tasks, TASK_ALLOW);
    if (DRY) {
      for (const t of stale) log(`dry-run: task guard would disable ${t.name} (${t.state}, ${t.why})`);
      const staleNames = new Set(stale.map((t) => t.name));
      const kept = tasks.filter((t) => !staleNames.has(t.name) && (String(t.name).startsWith('NightShift') || /nightshift[\\/]+scratch|laptop-runner/i.test(JSON.stringify(t.actions ?? []))));
      for (const t of kept) log(`dry-run: task guard keeps ${t.name} (${t.state}, ${t.state === 'Disabled' ? 'already disabled' : 'allowed'})`);
      log(`dry-run: task guard: ${tasks.length} task(s), ${tasks.filter((t) => String(t.name).startsWith('NightShift')).length} NightShift*, ${stale.length} stale`);
      return;
    }
    if (stale.length) {
      const res = JSON.parse(ps(TASK_DISABLE_PS, { LQ_GUARD_TASKS: JSON.stringify(stale.map(({ name, path: p }) => ({ name, path: p }))) }) || '[]');
      const byName = new Map((Array.isArray(res) ? res : [res]).map((r) => [r.name, r]));
      for (const t of stale) {
        const r = byName.get(t.name);
        if (!r?.ok) { log(`task guard: disable failed for ${t.name} (${t.state}, ${t.why}): ${r?.err || 'no result'}`); continue; }
        log(`task guard: disabled ${t.name} (${t.state}, ${t.why})`);
        if (t.state === 'Running') log(`task guard: ${t.name} is still running (its run is left alone)`);
        alertPending.push({ name: t.name, why: `${t.state}, ${t.why}` });
      }
    }
    if (alertPending.length === 0) return;
    const at = new Date().toISOString();
    const rel = `alerts/${at.replace(/[-:]/g, '').replace(/\.\d+/, '')}-${WORKER}-tasks.json`; // 20261024T071300Z: no ':' in a path; per worker
    const body = `${JSON.stringify({ worker: WORKER, disabled: alertPending, at }, null, 2)}\n`;
    if (pushFile(rel, body, `task guard disabled ${alertPending.length} task(s)`)) { log(`task guard: alert pushed ${rel}`); alertPending.length = 0; }
    else log(`task guard: alert push failed for ${alertPending.length} task(s), retried at the next guard pass`);
  } catch (e) { log(`task guard failed: ${String(e.message).split('\n')[0]}`); }
}

/** Ids whose done claim is confirmed on the branch. */
const doneSynced = new Set();

/**
 * Every pass: a done claim for each request in state.done whose claim is missing or still open (a failed done push,
 * or requests finished before claims existed), all in one commit; retried next pass when the push fails.
 */
function syncDone() {
  const todo = [];
  for (const id of Object.keys(state.done)) {
    if (doneSynced.has(id)) continue;
    const c = parseClaim(git(['show', `${QREF}:claims/${id}.json`], { soft: true }));
    if (c?.done) doneSynced.add(id); else todo.push(id);
  }
  if (todo.length === 0) return true;
  if (writeClaims(todo, 'done', `done ${todo.length === 1 ? todo[0] : `${todo.length} requests`}`) !== true) return false;
  todo.forEach((id) => doneSynced.add(id));
  log(`done claim(s) pushed: ${todo.length}`);
  return true;
}

/**
 * Train heads still to run: no laptop-e2e status, or a stale `pending` one (not claimed by this process; the pid lock
 * means no other service can be running it). Read from the combined status (latest state per context). A gh / network
 * error skips the head this pass (never read as "no status"). Merged heads and heads older than LQ_TRAIN_MAX_AGE_H
 * (default 24) are skipped. Only the head of an open train/<n> PR whose subject is the train's version commit runs:
 * a closed train, a PR not open yet or a pre-version head is never run; a failed PR list skips every train this pass.
 * A head whose auto-train/* status is failure or error is skipped (logged once per head per process), and so is one
 * the other worker claimed (claims/<sha>.json; claimBlocks). The stale-pending rule needs that claim check: a train
 * the other worker runs is `pending` too.
 */
const buildFailLogged = new Set();
/** The open train holding alone requests back this pass (lib trainHold), or null; a failed PR list holds them too. */
let aloneHold = null;
let aloneHoldLogged = '';
/** Why no new non-train work starts this pass (lib trainSoon), '' when it may; set by pendingTrains (laptop). */
let soon = '';
let soonLogged = '';
let manualLogged = '';
/** lib trainSoon from GitHub: a building train PR (no version head yet), else the last train release and its candidates. */
function trainSoonNow(openPrs) {
  const isVersion = (p) => new RegExp(`^\\d+\\.\\d+\\.\\d+: version at merge, train ${p.n} \\(G183\\)$`).test(git(['show', '-s', '--format=%s', p.sha], { soft: true }));
  const b = openPrs.find((p) => !isVersion(p));
  if (b) return trainSoon({ building: { n: b.n, ageMs: Date.now() - Date.parse(b.createdAt) } }, { gapMs: TRAIN_GAP_MS, buildMaxMs: TRAIN_BUILD_MAX_MS });
  if (openPrs.length) return '';
  try {
    const last = JSON.parse(gh(['pr', 'list', '-R', REPO, '--state', 'merged', '--limit', '30', '--json', 'headRefName,mergedAt', '--jq', '[.[] | select(.headRefName | startswith("train/"))][0] // null']) || 'null');
    const ageMs = last ? Date.now() - Date.parse(last.mergedAt) : Infinity;
    if (!(ageMs < TRAIN_GAP_MS)) return '';
    const candidates = Number(gh(['pr', 'list', '-R', REPO, '--state', 'open', '--label', 'train-ready', '--json', 'statusCheckRollup', '--jq', '[.[] | select([.statusCheckRollup[]? | select(.name == "check") | .conclusion] | first == "SUCCESS")] | length']) || 0);
    return trainSoon({ release: { n: String(last.headRefName).replace(/^train\//, ''), ageMs }, candidates }, { gapMs: TRAIN_GAP_MS, buildMaxMs: TRAIN_BUILD_MAX_MS });
  } catch { return ''; /* unreadable: no hold (never block on a GitHub error) */ }
}

function pendingTrains() {
  const out = [];
  const maxAge = Number(process.env.LQ_TRAIN_MAX_AGE_H ?? 24) * 3600;
  let open;
  let openPrs;
  try {
    openPrs = JSON.parse(gh(['pr', 'list', '-R', REPO, '--state', 'open', '--limit', '200', '--json', 'number,headRefName,headRefOid,createdAt', '--jq', '[.[] | select(.headRefName | startswith("train/")) | {n: (.headRefName | ltrimstr("train/")), sha: .headRefOid, pr: .number, createdAt}]']) || '[]');
    open = new Set(openPrs.map((p) => p.sha));
  } catch (e) {
    log(`train PR list failed, trains skipped this pass: ${String(e.message).split('\n')[0]}`);
    aloneHold = { n: '?', sha: '', laptop: 'unknown' };
    soon = ''; // never hold new claims on a GitHub error (checker FIX)
    return out;
  }
  git(['fetch', '-q', 'origin', '+refs/heads/train/*:refs/remotes/origin/train/*'], { soft: true });
  if (!DESKTOP) soon = trainSoonNow(openPrs);
  // every open train PR head without a laptop-e2e success holds alone requests (a status read error counts as none),
  // except heads that can never get one here: older than LQ_TRAIN_MAX_AGE_H or a failed auto-train/* build (as below)
  aloneHold = trainHold(openPrs.flatMap((p) => {
    const ct = Number(git(['show', '-s', '--format=%ct', p.sha], { soft: true }));
    if (ct && !(Date.now() / 1000 - ct < maxAge)) return [];
    let sts = null;
    try { sts = JSON.parse(gh(['api', `repos/${REPO}/commits/${p.sha}/status`, '--jq', '[.statuses[] | {context, state}]']) || '[]'); } catch { /* unknown: holds */ }
    if (sts && trainBuildFailed(sts)) return [];
    return [{ ...p, laptop: sts ? (sts.find((s) => s.context === 'laptop-e2e')?.state ?? '') : 'unknown' }];
  }));
  for (const line of git(['ls-remote', 'origin', 'refs/heads/train/*'], { soft: true }).split('\n')) {
    const m = /^([0-9a-f]{40})\trefs\/heads\/train\/(\S+)$/.exec(line);
    if (!m || state.trains[m[1]] || !open.has(m[1])) continue;
    // merge-train `build` opens the PR before it pushes the version commit: run only the version head (versionSubject)
    const subject = git(['show', '-s', '--format=%s', m[1]], { soft: true });
    if (!new RegExp(`^\\d+\\.\\d+\\.\\d+: version at merge, train ${m[2]} \\(G183\\)$`).test(subject)) continue;
    const age = Date.now() / 1000 - Number(git(['show', '-s', '--format=%ct', m[1]], { soft: true }));
    if (!(age < maxAge)) continue;
    try { git(['merge-base', '--is-ancestor', m[1], 'origin/master']); continue; } catch { /* not merged */ }
    // the other worker's open claim (or a done one) keeps it off; origin/laptop-queue was fetched by listRequests
    if (!claimed.has(m[1]) && claimBlocks(parseClaim(git(['show', `origin/laptop-queue:claims/${m[1]}.json`], { soft: true })), WORKER, Date.now(), CLAIM_MAX_MS)) continue;
    let sts;
    try {
      sts = JSON.parse(gh(['api', `repos/${REPO}/commits/${m[1]}/status`, '--jq', '[.statuses[] | {context, state}]']) || '[]');
    } catch (e) { log(`train ${m[2]} ${m[1].slice(0, 8)}: status read failed, skipped this pass: ${String(e.message).split('\n')[0]}`); continue; }
    // its build already failed (auto-train/vitest, ...): never take both slots for it (train 37: 18 min after vitest failed)
    const bad = trainBuildFailed(sts);
    if (bad) {
      if (!buildFailLogged.has(m[1])) { buildFailLogged.add(m[1]); log(`train ${m[2]} ${m[1].slice(0, 8)}: skipped, ${bad.context} ${bad.state}`); }
      continue;
    }
    const st = sts.find((s) => s.context === 'laptop-e2e')?.state ?? '';
    if (st === '' || (st === 'pending' && !claimed.has(m[1]))) out.push({ sha: m[1], n: m[2], stale: st === 'pending', ageMs: age * 1000 });
  }
  return sortTrains(out); // ls-remote order is text order; the lowest train runs first (overlap plan section 3)
}

/** The head shas of the open train/<n> PRs, or null when the listing failed (the void-train watch then waits). */
function openTrainHeads() {
  try {
    return new Set(JSON.parse(gh(['pr', 'list', '-R', REPO, '--state', 'open', '--limit', '200', '--json', 'headRefName,headRefOid', '--jq', '[.[] | select(.headRefName | startswith("train/")) | .headRefOid]']) || '[]'));
  } catch { return null; }
}

// ---------- processes, locks, ports ----------

/**
 * Runs a shell command line, output appended to logFile; resolves with the exit code (124 on timeout). ctl (a request
 * run): ctl.child is the running command for cut(); once ctl.why is set nothing new starts (125).
 */
function sh(line, { cwd, env = {}, logFile, timeoutMs = 3600_000, ctl }) {
  if (ctl?.why) return Promise.resolve(125);
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const fd = fs.openSync(logFile, 'a');
  fs.writeSync(fd, `\n$ ${line}\n`);
  return new Promise((resolve) => {
    const child = spawn(line, { cwd, env: { ...process.env, ...env }, shell: true, windowsHide: true, stdio: ['ignore', fd, fd] });
    if (ctl) ctl.child = child;
    const timer = setTimeout(() => {
      try { cmd('taskkill', ['/pid', String(child.pid), '/t', '/f'], { soft: true }); } catch { /* gone */ }
      resolve(124);
    }, timeoutMs);
    const end = (code) => { clearTimeout(timer); if (ctl?.child === child) ctl.child = null; resolve(code); };
    child.on('exit', (code) => end(code ?? 1));
    child.on('error', () => end(1));
  }).finally(() => fs.closeSync(fd));
}

/** Stops a request run: kills its running command tree (as the sh timeout does); later commands do not start. */
function cut(ctl, why) {
  if (ctl.why) return;
  ctl.why = why;
  if (ctl.child) cmd('taskkill', ['/pid', String(ctl.child.pid), '/t', '/f'], { soft: true });
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
 * no other service runs) and is deleted; any other holder (a manual run) is waited on, logged once per holder line,
 * and the wait in minutes is logged when the lock is finally taken (a long wait on a stale manual lock looked hung).
 * `once`: a single try, null when the slot is held (the wait log state carries over between tries, per port).
 * `stop`: checked during a wait; when it returns truthy the wait ends with null (the run yields to a train).
 */
const lockWait = {}; // port -> { from, on }: the current wait, kept across `once` tries
async function takeLock(port, label, sha, { once = false, stop } = {}) {
  const line = `laptop-queue | ${label} ${sha.slice(0, 8)} pid ${process.pid} | ${new Date().toISOString()}`;
  const w = (lockWait[port] ??= { from: 0, on: '' });
  for (;;) {
    try {
      fs.writeFileSync(SLOTS[port].lock, `${line}\n`, { flag: 'wx' });
      heldLocks.add(line);
      if (w.from) log(`${port} lock taken after a ${((Date.now() - w.from) / 60_000).toFixed(1)} min wait`);
      delete lockWait[port];
      return line;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let have = '';
      try { have = fs.readFileSync(SLOTS[port].lock, 'utf8').trim(); } catch { continue; /* gone: retry at once */ }
      if (have.startsWith('laptop-queue |') && !heldLocks.has(have)) {
        log(`stale lock on ${port} removed: ${have}`);
        try { fs.unlinkSync(SLOTS[port].lock); } catch { /* gone */ }
        continue;
      }
      if (have !== w.on) { w.on = have; log(`${port} waiting on ${have.startsWith('laptop-queue |') ? 'own run' : 'manual lock'}: ${have}`); }
      w.from ||= Date.now();
      if (once) return null;
      if (stop?.()) { delete lockWait[port]; return null; }
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
 * `stop` (a request run): checked before npm ci and before the build; truthy returns 'yield'. ctl: see sh.
 */
async function prepare(port, sha, logFile, stop, ctl) {
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
    if (stop?.()) return 'yield';
    if (await sh('npm ci', { cwd, logFile, ctl }) !== 0) return 'build';
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(file(`npm-ci-${port}.lock.json`), lockNow);
  }
  if (stop?.()) return 'yield';
  return (await sh('npm run build', { cwd, logFile, ctl })) === 0 ? 'ok' : 'build';
}

/** One run-e2e call on a slot; returns the parsed run plus its exit code and the last 40 lines of its output. */
async function e2e(port, suites, jobs, logFile, ctl) {
  freePort(port);
  const env = { E2E_PORT: port, E2E_JOBS: String(jobs), E2E_GPU: '1', E2E_SUITE_TIMEOUT: '900' };
  const code = await sh(`node scripts/run-e2e.mjs ${suites.join(' ')}`, { cwd: SLOTS[port].dir, env, logFile, ctl });
  freePort(port);
  const text = fs.readFileSync(logFile, 'utf8').split(/^\$ node scripts\/run-e2e.mjs /m).pop() ?? '';
  return { ...parseRun(text), code, tail40: failureExcerpt(text).tail40 };
}

// ---------- results ----------

/** A suite's section in the run's own logs (not the reruns), '' when none. */
function sectionOf(runDir, suite) {
  for (const f of fs.existsSync(runDir) ? fs.readdirSync(runDir) : []) {
    if (!f.endsWith('.log') || f.startsWith('rerun-')) continue;
    const sec = suiteSection(fs.readFileSync(path.join(runDir, f), 'utf8'), suite);
    if (sec) return sec;
  }
  return '';
}

/**
 * Reruns each failed (non-known-flaky) suite once alone; a pass is a flake. Mutates result.suites, returns flake names.
 * The failure stands unrerun only when the same suite flaked within 24 h on the same assert (assertKey): a new assert
 * on a suite that flaked before is rerun (train 40 ctcourse:4, 2026-10-24).
 */
async function rerunFlakes(result, slotOf, job, runDir, fallback = PORTS[0], ctl) {
  const flakes = [];
  const now = Date.now();
  for (const x of result.suites.filter((s) => !s.ok && !s.flaky && !s.report)) {
    const key = assertKey(failureExcerpt(sectionOf(runDir, x.s)).assert);
    if (flakeStands(state.flakes, x.s, key, now, FLAKE_WINDOW_MS)) { log(`${x.s} flaked within 24 h on the same assert, failure stands`); continue; }
    if (DRY || ctl?.why) continue;
    const port = slotOf[x.s] ?? fallback;
    log(`rerun ${x.s} alone on ${port}`);
    const run = await e2e(port, [x.s], 1, path.join(runDir, `rerun-${x.s.replace(/\W/g, '_')}.log`), ctl);
    if (runComplete(run, 1) && run.suites.every((s) => s.ok)) {
      x.ok = true;
      flakes.push(x.s);
      state.flakes.push({ suite: x.s, key, sha: job.sha, ref: job.ref, date: new Date().toISOString() });
    }
  }
  return flakes;
}

function failureComment(job, result, runDir) {
  const parts = [`laptop-e2e failed on ${job.sha.slice(0, 8)} (${job.ref}).`];
  for (const x of result.suites.filter((s) => !s.ok && !s.flaky && !s.report)) {
    const { assert, tail40 } = failureExcerpt(sectionOf(runDir, x.s));
    parts.push(`\n**${x.s}**\nFailing assert: \`${capTail(assert || 'none found', 500)}\`\nLog on the ${WORKER}: ${runDir}\n\`\`\`\n${capTail(tail40 || '(no log section)', 8_000)}\n\`\`\``);
  }
  return parts.join('\n');
}

function finish(job, ctx, result, runDir, prNumber) {
  const bad = result.suites.filter((s) => !s.ok && !s.flaky && !s.report);
  const ok = result.suites.length > 0 && bad.length === 0;
  const full = `${DESKTOP ? 'desktop: ' : ''}${result.suites.length ? describe(result) : 'no result parsed, see log'}`;
  const desc = full.length > 140 ? `${full.slice(0, 137)}...` : full; // GitHub rejects a status description over 140
  postStatus(job.sha, ok ? 'success' : 'failure', ctx, desc);
  if (!ok && prNumber && !DRY) postComment(prNumber, failureComment(job, result, runDir));
  times = mergeTimes(times, result.suites);
  writeJson('times.json', times);
  return ok;
}

// ---------- the runs ----------

const claimed = new Set();
/** Requests claimed or running here (id -> request), for the duplicate check. */
const activeReqs = new Map();
/** Alone requests a train preempted (cutShort): they go first among alone requests (lib pick queue.front) until claimed again. */
const preemptedAlone = new Set();
/** The train heads the last pass saw pending (desktop: those it may take); trainsNow() drops the ones claimed since. */
let pendingNow = [];
const trainsNow = () => pendingNow.filter((t) => !claimed.has(t.sha));

async function runTrain(train, ports = PORTS) {
  const id = `train-${train.n}-${train.sha.slice(0, 8)}`;
  const job = { sha: train.sha, ref: `train/${train.n}` };
  const runDir = path.join(STATE_DIR, 'runs', id);
  log(`train ${train.n} ${train.sha.slice(0, 8)}: start`);
  const locks = {};
  // void-train watch (overlap plan section 3): a head that left the open train PR heads (closed, voided or rebuilt)
  // twice in a row has every slot's command tree killed (cut); nothing new starts and the run ends with closedEnd
  const ctls = Object.fromEntries(ports.map((p) => [p, { child: null, why: '' }]));
  let misses = 0;
  let voided = false;
  const watch = DRY ? null : setInterval(() => {
    if (voided) return;
    misses = voidMisses(misses, train.sha, openTrainHeads());
    if (misses < VOID_MISSES) return;
    voided = true;
    log(`train ${train.n} ${train.sha.slice(0, 8)}: no longer an open train PR head (closed, voided or rebuilt), run stopped`);
    for (const c of Object.values(ctls)) cut(c, 'closed');
  }, TRAIN_VOID_POLL_MS);
  const closedEnd = () => {
    postStatus(train.sha, 'error', 'laptop-e2e', `${DESKTOP ? 'desktop: ' : ''}train closed`);
    writeClaims([train.sha], 'release', `release train ${train.n} (closed)`);
    claimed.delete(train.sha);
  };
  try {
    // every slot, or after TRAIN_SOLO_MS holding some while the rest stay locked: unsharded on the ones held
    for (let since = 0; ;) {
      for (const p of ports) locks[p] ||= await takeLock(p, `train ${train.n}`, train.sha, { once: true });
      const held = ports.filter((p) => locks[p]);
      if (held.length === ports.length) break;
      if (voided) return closedEnd();
      if (held.length) since ||= Date.now();
      if (since && Date.now() - since >= TRAIN_SOLO_MS) {
        log(`train ${train.n}: ${ports.filter((p) => !locks[p]).join('+')} still locked after ${Math.round(TRAIN_SOLO_MS / 60_000)} min, running on ${held.join('+')} alone`);
        // the given-up slot takes pr requests again once its manual run ends (dispatch marked it busy with this train)
        for (const p of ports) if (!locks[p]) { delete lockWait[p]; busy[p] = null; }
        ports = held;
        break;
      }
      await sleep(15_000);
    }
    // fresh `at` after the lock wait; the other worker took it over meanwhile: back off (as runRequest)
    if (writeClaims([train.sha], 'claim', `claim train ${train.n} (lock taken)`) === 'blocked') {
      log(`train ${train.n}: taken over by the other worker during the lock wait, dropped`);
      claimed.delete(train.sha);
      return;
    }
    if (voided) return closedEnd();
    postStatus(train.sha, 'pending', 'laptop-e2e', `${DESKTOP ? 'desktop: ' : ''}${ports.length > 1 ? 'sharded' : 'unsharded on'} ${ports.join('+')}`);
    const prep = await Promise.all(ports.map((p) => prepare(p, train.sha, path.join(runDir, `${p}.log`), undefined, ctls[p])));
    if (voided) return closedEnd();
    if (prep.includes('fetch')) {
      // not a verdict: the pending status is now unclaimed (stale) and the next pass picks the train again
      log(`train ${train.n}: fetch failed, retried next pass`);
      writeClaims([train.sha], 'release', `release train ${train.n}`);
      claimed.delete(train.sha);
      return;
    }
    if (prep.some((r) => r !== 'ok')) {
      const nosha = prep.includes('nosha');
      postStatus(train.sha, nosha ? 'error' : 'failure', 'laptop-e2e', nosha ? 'sha not found' : 'build failed');
      state.trains[train.sha] = { result: nosha ? 'nosha' : 'build', date: new Date().toISOString() };
      return;
    }
    const list = cmd('node', ['scripts/run-e2e.mjs', '--list'], { cwd: SLOTS[ports[0]].dir }).split('\n').map((x) => x.trim()).filter(Boolean);
    const bins = shard(list, times, ports.length);
    bins.forEach((b, i) => log(`bin ${ports[i]}: ${b.suites.length} suites, weight ${Math.round(b.weight)} s`));
    const t0 = Date.now();
    const runs = await Promise.all(ports.map((p, i) => e2e(p, bins[i].suites, TRAIN_JOBS, path.join(runDir, `${p}.log`), ctls[p])));
    if (voided) return closedEnd();
    const prNumber = Number(gh(['pr', 'list', '-R', REPO, '--head', `train/${train.n}`, '--json', 'number', '--jq', '.[0].number'], { soft: true })) || 0;
    // a shard that died before its summary (or lost suites) is a failure, never a partial success
    const broken = ports.findIndex((p, i) => !runComplete(runs[i], bins[i].suites.length, true));
    if (broken >= 0) {
      const p = ports[broken];
      const r = runs[broken];
      log(`train ${train.n}: shard ${p} incomplete (exit ${r.code}, ${r.suites.length}/${bins[broken].suites.length} suites, summary ${r.complete ? 'seen' : 'missing'})`);
      postStatus(train.sha, 'failure', 'laptop-e2e', `shard ${p} gave no result`);
      if (prNumber) postComment(prNumber, `laptop-e2e failed on ${train.sha.slice(0, 8)} (${job.ref}): shard ${p} gave no result (exit ${r.code}, ${r.suites.length}/${bins[broken].suites.length} suites).\nLog on the ${WORKER}: ${path.join(runDir, `${p}.log`)}\n\`\`\`\n${capTail(r.tail40 || '(empty log)', 8_000)}\n\`\`\``);
      state.trains[train.sha] = { result: 'incomplete', shard: p, date: new Date().toISOString() };
      return;
    }
    const slotOf = {};
    runs.forEach((r, i) => r.suites.forEach((s) => { slotOf[s.s] = ports[i]; }));
    const result = { suites: runs.flatMap((r) => r.suites), wall: 0, flakes: [] };
    result.flakes = await rerunFlakes(result, slotOf, job, runDir, ports[0], ctls[ports[0]]);
    if (voided) return closedEnd();
    // the verdict below may release the train at once: the watch must never cut it after this point
    if (watch) clearInterval(watch);
    result.wall = (Date.now() - t0) / 1000;
    const ok = finish(job, 'laptop-e2e', result, runDir, prNumber);
    state.trains[train.sha] = { result: ok ? 'success' : 'failure', wall: result.wall, date: new Date().toISOString() };
  } finally {
    if (watch) clearInterval(watch);
    // only slots this train locked: an unheld one may be serving a manual run
    for (const p of ports) { if (locks[p]) { releaseLock(p, locks[p]); freePort(p); } }
    saveState();
    if (state.trains[train.sha]) writeClaims([train.sha], 'done', `done train ${train.n}`);
    log(`train ${train.n}: done`);
  }
}

async function runRequest(r, port) {
  const runDir = path.join(STATE_DIR, 'runs', r.id);
  const ctx = contextName(r.kind, r.set, r.suites, r.trainRerun);
  const job = { sha: r.sha, ref: r.branch || r.sha.slice(0, 8) };
  log(`${r.id}: ${r.kind} on ${port}`);
  const ports = r.kind === 'alone' ? PORTS : [port];
  const locks = {};
  // yield: a pending train head takes the slot back until the suites / steps start (lib yieldTo)
  let yielded = null;
  // cut short: withdrawn at any point, or (a pr request in its suites) preempted by a pending train (lib cutShort)
  const ctl = { child: null, why: '', by: null };
  let started = false;
  let startedAt = NaN; // an alone run's steps start: under ALONE_PREEMPT_MIN a pending train still cuts it (lib cutShort)
  const watch = DRY ? null : setInterval(() => {
    const trains = trainsNow();
    const others = [...activeReqs.values()].filter((a) => a.id !== r.id);
    const why = cutShort(r, { withdrawn: withdrawnIds.has(r.id), trains, started, others, startedAt, now: Date.now() });
    if (why && !ctl.why) { ctl.by = trains[0] ?? null; cut(ctl, why); }
  }, 5_000);
  const stop = () => Boolean(ctl.why) || Boolean(yielded ??= yieldTo(r, false, trainsNow()));
  let posted = false;
  const giveBack = () => {
    log(`${r.id}: yields to train ${yielded.n}`);
    if (posted) postStatus(r.sha, 'pending', ctx, `queued, yielded to train ${yielded.n}`);
    writeClaims([r.id], 'release', `release ${r.id} (yields to train ${yielded.n})`);
    claimed.delete(r.id);
  };
  const cutEnd = () => {
    if (ctl.why === 'withdrawn') {
      log(`${r.id}: withdrawn by the requester, run stopped`);
      if (posted) postStatus(r.sha, 'error', ctx, 'withdrawn by the requester, run stopped');
      state.done[r.id] = { result: 'withdrawn', date: new Date().toISOString() };
      return;
    }
    const n = ctl.by?.n ?? '?';
    log(`${r.id}: preempted by train ${n}, queued again${r.kind === 'alone' ? ' (head of the alone queue)' : ''}`);
    if (r.kind === 'alone') preemptedAlone.add(r.id);
    if (posted) postStatus(r.sha, 'pending', ctx, `queued, preempted by train ${n}`);
    writeClaims([r.id], 'release', `release ${r.id} (preempted by train ${n})`);
    claimed.delete(r.id);
  };
  try {
    for (const p of ports) {
      locks[p] = await takeLock(p, r.id, r.sha, { stop });
      if (!locks[p] || stop()) return ctl.why ? cutEnd() : giveBack();
    }
    // fresh `at`: a long lock wait never looks like a dead worker; if the other worker took it over meanwhile, back off
    if (writeClaims([r.id], 'claim', `claim ${r.id} (lock taken)`) === 'blocked') {
      log(`${r.id}: taken over by the other worker during the lock wait, dropped`);
      claimed.delete(r.id);
      return;
    }
    postStatus(r.sha, 'pending', ctx, 'running');
    posted = true;
    const prep = await prepare(ports[0], r.sha, path.join(runDir, 'prepare.log'), stop, ctl);
    if (ctl.why) return cutEnd();
    if (prep === 'yield' || (prep === 'ok' && stop())) return ctl.why ? cutEnd() : giveBack();
    if (prep === 'fetch') {
      // not a verdict and not done: the claim is dropped and the next pass takes it again
      postStatus(r.sha, 'pending', ctx, 'fetch failed, retrying');
      log(`${r.id}: fetch failed, retried next pass`);
      writeClaims([r.id], 'release', `release ${r.id}`);
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
      started = true;
      startedAt = t0;
      for (const [i, step] of r.steps.entries()) {
        if (ctl.why) break;
        const line = step.startsWith('serve ') ? `node scripts/laptop-queue/serve.mjs ${step.slice(6)}` : step;
        freePort(ports[0]);
        const code = await sh(line, { cwd: SLOTS[ports[0]].dir, env: { ...r.env, E2E_PORT: ports[0], E2E_GPU: '1' }, logFile: path.join(runDir, `step${i + 1}.log`), ctl });
        if (code === 0) okSteps++;
        freePort(ports[0]);
      }
      if (ctl.why) return cutEnd();
      const good = okSteps === r.steps.length;
      postStatus(r.sha, good ? 'success' : 'failure', ctx, `${okSteps}/${r.steps.length} steps ok, ${Math.round((Date.now() - t0) / 1000)} s`);
      state.done[r.id] = { result: good ? 'success' : 'failure', date: new Date().toISOString() };
      return;
    }
    const list = r.kind === 'full' ? cmd('node', ['scripts/run-e2e.mjs', '--list'], { cwd: SLOTS[port].dir }).split('\n').map((x) => x.trim()).filter(Boolean) : r.suites;
    const jobs = DESKTOP || r.trainRerun ? 1 : r.jobs ?? (r.kind === 'full' ? 3 : 2); // a train rerun: E2E_JOBS=1, unsharded
    const t0 = Date.now();
    started = true;
    const run = await e2e(port, list, jobs, path.join(runDir, `${port}.log`), ctl);
    if (ctl.why) return cutEnd();
    // same completeness rule as a train shard; at least the listed suites (a named suite may expand into parts)
    if (!runComplete(run, list.length)) {
      log(`${r.id}: run incomplete (exit ${run.code}, ${run.suites.length}/${list.length} suites, summary ${run.complete ? 'seen' : 'missing'})`);
      postStatus(r.sha, 'failure', ctx, `slot ${port} gave no result`);
      if (r.pr) postComment(r.pr, `${ctx} failed on ${r.sha.slice(0, 8)} (${job.ref}): slot ${port} gave no result (exit ${run.code}, ${run.suites.length}/${list.length} suites).\nLog on the ${WORKER}: ${path.join(runDir, `${port}.log`)}\n\`\`\`\n${capTail(run.tail40 || '(empty log)', 8_000)}\n\`\`\``);
      state.done[r.id] = { result: 'incomplete', date: new Date().toISOString() };
      return;
    }
    const result = { suites: run.suites, wall: 0, flakes: [] };
    // a request reruns on its own locked slot and worktree (its sha), never on another slot
    result.flakes = await rerunFlakes(result, {}, job, runDir, port, ctl);
    if (ctl.why) return cutEnd();
    result.wall = (Date.now() - t0) / 1000;
    const ok = finish(job, ctx, result, runDir, r.pr);
    // a train rerun that passed also turns the train's own context green (the latest status per context wins in the
    // combined status, so it replaces the desktop's laptop-e2e failure); a failed one leaves laptop-e2e red
    if (ok && r.trainRerun) postStatus(r.sha, 'success', 'laptop-e2e', rerunPassed(r.suites));
    state.done[r.id] = { result: ok ? 'success' : 'failure', wall: result.wall, date: new Date().toISOString() };
  } finally {
    if (watch) clearInterval(watch);
    missing.delete(r.id);
    withdrawnIds.delete(r.id);
    for (const p of ports) { if (locks[p]) releaseLock(p, locks[p]); freePort(p); }
    if (state.done[r.id]) state.done[r.id].key = dupKey(r); // the duplicate check reads it for LQ_DUP_WINDOW_MIN
    saveState();
    if (state.done[r.id] && writeClaims([r.id], 'done', `done ${r.id}`) === true) doneSynced.add(r.id);
    if (!yielded && ctl.why !== 'train') log(`${r.id}: done`);
  }
}

// ---------- the loop ----------

const busy = Object.fromEntries(PORTS.map((p) => [p, null]));

function dispatch(p) {
  if (p.kind === 'train') {
    claimed.add(p.train.sha);
    const ports = p.ports ?? PORTS;
    if (DRY) { log(`dry-run: would run train ${p.train.n} ${p.train.sha.slice(0, 8)} on ${ports.join('+')}`); return planTrain(p.train.sha, ports); }
    const run = runTrain(p.train, ports).catch((e) => {
      log(`train ${p.train.n} service error: ${e.stack ?? e.message}`);
      postStatus(p.train.sha, 'error', 'laptop-e2e', 'service error, see log');
      writeClaims([p.train.sha], 'release', `release train ${p.train.n}`);
      claimed.delete(p.train.sha);
    });
    ports.forEach((x) => { busy[x] = run; });
    return run;
  }
  claimed.add(p.request.id);
  const ports = p.kind === 'alone' ? PORTS : [p.slot];
  if (DRY) { log(`dry-run: would run ${p.request.id} (${p.request.kind}, ${p.request.suites ?? p.request.steps ?? 'full'}) on ${ports.join('+')}`); return Promise.resolve(); }
  activeReqs.set(p.request.id, p.request);
  const run = runRequest(p.request, p.slot ?? PORTS[0]).catch((e) => {
    log(`${p.request.id} service error: ${e.stack ?? e.message}`);
    postStatus(p.request.sha, 'error', contextName(p.request.kind, p.request.set, p.request.suites, p.request.trainRerun), 'service error, see log');
    writeClaims([p.request.id], 'release', `release ${p.request.id}`);
    claimed.delete(p.request.id);
  }).finally(() => activeReqs.delete(p.request.id));
  ports.forEach((x) => { busy[x] = run; });
  return run;
}

/** Dry run: the shard bins for the current full list and the gh commands a train would run. */
let previewed = false;
function planTrain(sha = '<train sha>', ports = PORTS) {
  previewed = true;
  const list = cmd('node', ['scripts/run-e2e.mjs', '--list'], { soft: true }).split('\n').map((x) => x.trim()).filter(Boolean);
  const bins = shard(list, times, ports.length);
  bins.forEach((b, i) => log(`dry-run: bin ${ports[i]} (weight ${Math.round(b.weight)} s): ${b.suites.map((s) => `${s}=${Math.round(times[s] ?? 0) || 'median'}`).join(' ')}`));
  postStatus(sha, 'pending', 'laptop-e2e', `${DESKTOP ? 'desktop: ' : ''}sharded ${ports.join('+')}`);
  postStatus(sha, 'success', 'laptop-e2e', `${list.length}/${list.length} pass, <wall> s`);
  return Promise.resolve();
}

/** Average CPU load % now (NaN when unreadable). */
function cpuLoad() {
  return Number(cmd('powershell', ['-NoProfile', '-NonInteractive', '-Command', '(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average'], { soft: true }));
}

/** A CPU reader that samples once, on first use (one sample per pass). */
function lazyCpu() {
  let v;
  return () => (v === undefined ? (v = cpuLoad()) : v);
}

const ancestorMemo = new Map();
/** True when sha a is an ancestor of (or equal to) b in this checkout; any git error (a sha not fetched) is false. */
function isAncestor(a, b) {
  const key = `${a}>${b}`;
  if (!ancestorMemo.has(key)) {
    let r = false;
    try { git(['merge-base', '--is-ancestor', a, b]); r = true; } catch { r = false; }
    ancestorMemo.set(key, r);
  }
  return ancestorMemo.get(key);
}

/**
 * Marks superseded requests done (no run, no status) in one batched push and drops them from `requests`. Open claims
 * (any worker) and runs here never reach `requests`, so they are never superseded. A lost push is retried next pass.
 */
function applySupersedes(requests) {
  ancestorMemo.clear();
  const sup = superseded(requests, isAncestor);
  if (sup.size === 0) return requests;
  const ids = [...sup.keys()];
  const date = new Date().toISOString();
  if (!DRY && writeClaims(ids, 'done', `superseded ${ids.length} request(s)`) !== true) { log(`supersede push failed for ${ids.length} request(s), retried next pass`); return requests; }
  for (const [id, by] of sup) {
    log(`${id}: superseded by ${by}`);
    if (DRY) continue;
    state.done[id] = { result: 'superseded', by, date };
    doneSynced.add(id);
  }
  saveState();
  return requests.filter((r) => !sup.has(r.id));
}

/**
 * Marks open requests that repeat another request done as duplicates (no run, no status) in one push and drops them
 * (lib duplicates): against the open ones, the ones claimed or running here or on the other worker, and the ones done
 * here within LQ_DUP_WINDOW_MIN. A lost push is retried next pass.
 */
function applyDuplicates(requests) {
  const recent = Object.entries(state.done).filter(([, d]) => d?.key).map(([id, d]) => ({ id, key: d.key, result: d.result, date: d.date }));
  const active = [...activeReqs.values(), ...otherActive].map((r) => ({ ...r, active: true }));
  const dup = duplicates([...requests, ...active], recent, Date.now(), DUP_WINDOW_MS);
  if (dup.size === 0) return requests;
  const ids = [...dup.keys()];
  const date = new Date().toISOString();
  if (!DRY && writeClaims(ids, 'done', `duplicate ${ids.length} request(s)`) !== true) { log(`duplicate push failed for ${ids.length} request(s), retried next pass`); return requests; }
  for (const [id, by] of dup) {
    log(`${id}: duplicate of ${by}`);
    if (DRY) continue;
    state.done[id] = { result: 'duplicate', by, date };
    doneSynced.add(id);
  }
  saveState();
  return requests.filter((r) => !dup.has(r.id));
}

/**
 * Desktop: the train heads it may take now and why none ('' when it may), from the laptop's claim pushes on the branch
 * (desktopTrainGate; pendingTrains only runs while the laptop is silent).
 */
function desktopTrains() {
  const laptop = workerActivity(git(['log', '-n', '2000', '--format=%ct %s', 'origin/laptop-queue', '--', 'claims/'], { soft: true }), 'laptop');
  const gate = (ageMs, train) => desktopTrainGate({ laptop, now: Date.now(), silentMs: LAPTOP_SILENT_MS, trainAgeMs: ageMs, graceMs: TRAIN_GRACE_MS, train });
  const off = gate(Infinity);
  if (off) return { trains: [], why: off };
  const all = pendingTrains().filter((t) => !claimed.has(t.sha));
  // per head: beside the laptop's own train only a different train passes (lib desktopTrainGate)
  const trains = all.filter((t) => !gate(t.ageMs, t.n));
  return { trains, why: all.length && !trains.length ? 'train head too new' : '' };
}

const BUILD_MARKER = process.env.LQ_BUILD_MARKER ?? `${process.env.AUTO_TRAIN_SCRATCH || 'C:/NightShift/scratch'}/auto-train-building.json`; // auto-train's buildMarkerPath
const BUILD_MARKER_MAX_MS = Number(process.env.LQ_BUILD_MARKER_MAX_MIN ?? 30) * 60_000;
let markerLogged = '';
/** Desktop: auto-train's build marker when it blocks new starts (lib buildMarker), else null; logged once per marker. */
function trainBuilding() {
  let text = null;
  let mtime = NaN;
  try { text = fs.readFileSync(BUILD_MARKER, 'utf8'); mtime = fs.statSync(BUILD_MARKER).mtimeMs; } catch { /* no marker */ }
  const m = buildMarker(text, mtime, Date.now(), BUILD_MARKER_MAX_MS);
  if (!m) { markerLogged = ''; return null; }
  const key = `${m.key} ${m.stale}`;
  if (key !== markerLogged) {
    markerLogged = key;
    log(m.stale ? `train ${m.train} build marker ${Math.round(m.ageMs / 60_000)} min old: ignored as stale` : `train ${m.train} building: no new claims (lower trains still start)`);
  }
  return m.stale ? null : m;
}

async function pass() {
  // requests first: listRequests fetches origin/laptop-queue, which the train claim checks read
  const requests = listRequests().filter((r) => !claimed.has(r.id));
  const dt = DESKTOP ? desktopTrains() : null;
  for (const id of preemptedAlone) if (!requests.some((r) => r.id === id)) preemptedAlone.delete(id); // done or withdrawn
  const queue = { trains: DESKTOP ? dt.trains : pendingTrains().filter((t) => !claimed.has(t.sha)), requests, front: preemptedAlone };
  pendingNow = queue.trains; // runs still before their suites / steps yield to these
  // done marks first: a claim (which tells the desktop the laptop is on claims) never lands before them
  if (!syncDone() && !DRY) { log('done claims not pushed: no new requests this pass (trains need a claim push too)'); queue.requests = []; }
  // supersede and duplicates on the full list (before the alone hold and the desktop's pr filter); the desktop waits for
  // claims on the branch like its gate does
  else if (!(DESKTOP && claimCount === 0)) queue.requests = applyDuplicates(applySupersedes(queue.requests));
  // alone runs wait while any open train lacks a laptop-e2e success (trains and their reruns first; CLAUDE.md laptop order)
  // an alone request held past ALONE_AGE_MIN still stops new pr / full claims (only train reruns start), so the slots
  // drain for it while the train runs; only while the train can clear the hold by running (lib holdClears) (Orchestrator audit 2026-10-24: 3 newer PR requests went first at 07:25Z)
  if (!DESKTOP && aloneHold && queue.requests.some((r) => r.kind === 'alone')) {
    const aged = holdClears(aloneHold) ? agedAlone(queue.requests, Date.now()) : null;
    const key = `${aloneHold.n} ${aloneHold.sha} ${aloneHold.laptop} ${aged?.id ?? ''}`;
    if (key !== aloneHoldLogged) { aloneHoldLogged = key; log(`alone requests held: train ${aloneHold.n} ${String(aloneHold.sha).slice(0, 8)} open, laptop-e2e ${aloneHold.laptop || 'none'}${aged ? `; ${aged.id} waited over ${ALONE_AGE_MIN} min: no new pr claims` : ''}`); }
    queue.requests = queue.requests.filter((r) => (aged ? r.trainRerun : r.kind !== 'alone'));
  } else if (!aloneHold) aloneHoldLogged = '';
  const desktopWait = {};
  if (DESKTOP) {
    // auto-train's build (its vitest waits on heavy.lock) goes first: no new request while it builds, and no train at or
    // above the one being built; a lower train (N while N+1 builds on it) still starts (lib trainsUnderMarker)
    const building = trainBuilding();
    if (building) {
      queue.trains = trainsUnderMarker(queue.trains, building);
      if (queue.trains.length === 0) return;
      queue.requests = [];
    }
    const backlog = queue.requests.length;
    queue.requests = queue.requests.filter((r) => r.kind === 'pr' && !r.trainRerun); // a train rerun is the laptop's (desktop failed)
    const why = {};
    const train = queue.trains[0];
    if (train) {
      // laptop silent: the train goes first on the desktop slots that exist, backlog gate dropped (lock, dir, CPU kept);
      // it blocks new requests meanwhile so busy slots drain (as pick does on the laptop)
      const cpu = lazyCpu();
      const ports = PORTS.filter((p) => fs.existsSync(SLOTS[p].dir));
      for (const port of ports) why[port] = busy[port] ? 'busy' : desktopSlotGate({ lockName: path.basename(SLOTS[port].lock), lockHeld: fs.existsSync(SLOTS[port].lock), dirOk: true, backlog: Infinity, cpu: cpu(), minBacklog: 0, maxCpu: DESKTOP_CPU[port] });
      const waits = Object.entries(why).filter(([, w]) => w).map(([p, w]) => `${p} ${w}`);
      log(`queue: train ${train.n} ${train.sha.slice(0, 8)} (laptop silent or on another train), ${backlog} request(s)${ports.length === 0 ? '; no desktop worktree' : ''}${waits.length ? `; waiting: ${waits.join('; ')}` : ''}`);
      if (ports.length === 0 || waits.length) return;
      // the laptop may have woken up and claimed it since the list was read
      if (writeClaims([train.sha], 'claim', `claim train ${train.n}`) !== true) return;
      const run = dispatch({ kind: 'train', train, ports });
      if (!DRY) run.finally(() => ports.forEach((x) => { if (busy[x] === run) busy[x] = null; }));
      return;
    }
    if (queue.requests.length > 0) {
      const cpu = lazyCpu();
      for (const port of PORTS) {
        if (busy[port]) continue;
        // no claims yet: the laptop runs an older service and its finished requests are not marked; never rerun them
        if (claimCount === 0) why[port] = 'no claims on the branch yet (laptop service not updated)';
        else why[port] = desktopSlotGate({ lockName: path.basename(SLOTS[port].lock), lockHeld: fs.existsSync(SLOTS[port].lock), dirOk: fs.existsSync(SLOTS[port].dir), backlog, cpu: cpu(), minBacklog: DESKTOP_BACKLOG, maxCpu: DESKTOP_CPU[port] });
        if (why[port]) desktopWait[port] = true;
      }
    }
    const waits = Object.entries(why).filter(([, w]) => w).map(([p, w]) => `${p} ${w}`);
    log(`queue: ${backlog} request(s), ${queue.requests.length} pr${waits.length ? `; waiting: ${waits.join('; ')}` : ''}${dt.why ? `; trains: ${dt.why}` : ''}`);
    if (queue.requests.length === 0 || PORTS.every((p) => busy[p] || why[p])) return;
  } else log(`queue: ${queue.trains.length} train(s), ${queue.requests.length} request(s)`);
  // a train about to need both slots: no new non-train claim, so the slots drain for it (lib trainSoon)
  if (!DESKTOP && soon && queue.trains.length === 0) {
    if (soon !== soonLogged) { soonLogged = soon; log(`${soon}: no new request claims`); }
    queue.requests = queue.requests.filter((r) => r.trainRerun);
  } else if (!soon) soonLogged = '';
  const virtual = { ...desktopWait };
  // a slot under a manual lock takes no new request (a train keeps its own wait in runTrain)
  if (queue.trains.length === 0) {
    const held = manualLocks(Object.fromEntries(PORTS.map((p) => { try { return [p, fs.readFileSync(SLOTS[p].lock, 'utf8')]; } catch { return [p, null]; } })));
    const key = JSON.stringify(held);
    if (key !== manualLogged) { manualLogged = key; for (const [p, line] of Object.entries(held)) log(`${p} under a manual lock, no new claims there: ${line}`); }
    for (const p of Object.keys(held)) virtual[p] = true;
  }
  let started = false;
  for (let i = 0; i < 4 && !started; i++) {
    const slots = PORTS.map((port) => ({ port, busy: Boolean(busy[port] || virtual[port]) }));
    const p = pick(queue, Date.now(), slots);
    if (!p) break;
    if (p.kind === 'train') {
      queue.trains = queue.trains.filter((t) => t !== p.train);
      // claimed like a request: the desktop may take a train while the laptop is silent
      if (writeClaims([p.train.sha], 'claim', `claim train ${p.train.n}`) !== true) continue;
    } else {
      queue.requests = queue.requests.filter((r) => r !== p.request);
      // the other worker may have taken it since the list was read: skip it this pass
      if (writeClaims([p.request.id], 'claim', `claim ${p.request.id}`) !== true) continue;
      preemptedAlone.delete(p.request.id);
    }
    const run = dispatch(p);
    if (DESKTOP) started = true;
    if (DRY) (p.kind === 'request' ? [p.slot] : PORTS).forEach((x) => { virtual[x] = true; });
    else run.finally(() => PORTS.forEach((x) => { if (busy[x] === run) busy[x] = null; }));
  }
  if (DRY && !previewed && !DESKTOP) { log('dry-run: no train pending; shard preview of the current list:'); await planTrain(); }
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

/** When idle: fast-forward this checkout to LQ_FOLLOW; exit (the task's 1-min trigger restarts us) if the service files changed. */
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
  log(`service start (${WORKER})${ONCE ? ' --once' : ''}${DRY ? ' --dry-run' : ''} in ${HERE}`);
  if (TASK_GUARD_MS > 0) taskGuard(); // before the first pass: a stale task must not race the service for the slot locks
  if (ONCE || DRY) {
    await pass();
    await Promise.all(Object.values(busy).filter(Boolean));
    return;
  }
  for (;;) {
    if (TASK_GUARD_MS > 0 && Date.now() - lastGuard >= TASK_GUARD_MS) taskGuard();
    try {
      // update before taking new work too, so a busy queue still picks up new service code between runs
      if (!Object.values(busy).some(Boolean)) selfUpdate();
      await pass();
      if (!Object.values(busy).some(Boolean)) selfUpdate();
    } catch (e) { log(`pass failed: ${e.message}`); }
    await sleep(POLL_MS);
  }
}

await main();
