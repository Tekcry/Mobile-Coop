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
// Train reruns (request.mjs --train-rerun, from auto-train): kind pr, picked right after trains at E2E_JOBS=1, on both slots when
// free (LQ_RERUN_SHARD) else one (laptop only); its context is laptop-e2e/<set> like any request (auto-train's: laptop-e2e/train<n>-rerun), and
// laptop-e2e/rerun-<suites> only when it has no set; a full pass also posts laptop-e2e success on the sha.
// Supersede: an open pr / full request is marked done unrun when the same requester has a newer one (same set, or an
// ancestor sha with overlapping suites); pick runs a requester's oldest open request first, a higher --priority before it (lib.mjs superseded, pick).
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
// Desktop failures (Orchestrator waste audit 2026-10-24, laptop-queue-3): a desktop pr run whose suites fail (after its
// own flake rerun) posts pending "desktop FAIL <suites> (cpu N%), laptop rerun queued" (plus "; desktop cpu>90%" when
// the median of the CPU samples taken every watch tick was over 90) instead of failure, no PR comment, and pushes a
// laptop-only request (lib laptopRerunRequest: same sha / set / pr / requester, the failed suites, "laptopRerun": true;
// with no set its set is the old suites joined by "+", so it posts on the same context). The desktop never claims it;
// the laptop's verdict is final. A failed push leaves the desktop failure as before. A draft PR (the PR board's isDraft,
// lib laptopRerunFor; F34) files no rerun: its desktop failure is final, "; draft PR, no laptop rerun".
// Pinned requests (request.mjs --pin, "pin": true; A/B and baseline runs) are never superseded.
// Train soon (laptop, lib nextTrain / fitsBeforeTrain, laptop-queue-6): while the next train is due only train reruns and
// pr runs that fit before its ETA start. Rules and env: docs/systems/testing-tools.md "Laptop queue" "Train soon".
// Manual locks (lib manualLocks): a slot whose lock is not the service's takes no new request claim (logged once per
// holder); trains still wait on it as before.
// Task guard (Michael 2026-10-24 07:13, after 87 stale NightShift-chain-* one-shots fired at 23:59 and held the slot
// locks): at start and every LQ_TASK_GUARD_MIN (10; 0 = off) min, disables (never stops, kills or deletes) each stale
// scheduled task (lib staleTasks; allowlist lib TASK_ALLOW: the two queue tasks, auto-train and the watchdog, plus env
// LQ_TASK_ALLOW, a comma list) and pushes alerts/<ts>-<worker>-tasks.json to the laptop-queue branch. --dry-run only logs what it would disable.
// Overlapping trains (Michael 2026-10-24 ~21:00, docs/orchestrator/overlap-trains-PLAN.md section 3; inert while no
// stacked trains exist): pending trains run lowest number first and a lower train's rerun goes before a higher train
// (lib pick); the desktop takes a second, different train while the laptop runs one (lib workerActivity openTrain,
// desktopTrainGate); auto-train's build marker holds back only trains at or above the one being built (lib
// trainsUnderMarker); a running train whose head is no longer an open train PR head (closed, voided or rebuilt; two
// checks LQ_TRAIN_VOID_POLL_S (60) s apart, lib voidMisses) is killed, posts laptop-e2e error "train closed" and
// releases its claim. A pending train also cuts an alone run whose steps started under 10 min ago (lib cutShort
// ALONE_PREEMPT_MIN); it is queued again at the head of the alone queue (lib pick queue.front).
// Orchestrator audit 2026-10-24 (train 64 went to the desktop behind a 30-min alone run that pushed nothing):
// - heartbeat: the laptop pushes "heartbeat <n> run(s)" (a claim refresh of every running request / train) every
//   LQ_HEARTBEAT_MIN (5) min while it runs anything, so the desktop never reads a busy laptop as silent (laptop-queue-8:
//   both workers beat);
// - a pr run at or past 80% of its expected wall (times.json, lib runProgress) is never preempted;
// - no new alone claim while a green train-ready PR waits and no train PR is open (lib aloneSoon; an aged alone request
//   still starts);
// - an alone run yields between steps while a train head is pending: claim released, queued at the head of the alone
//   queue, and its finished steps are skipped when it runs again (state.aloneSteps; steps must not rely on worktree
//   files an earlier step left, since prepare cleans the worktree).
// Visual gate (visual-gate job VG6, docs/laptop-queue/visual-gate.md; pure part in visual.mjs): after a green train on
// the laptop whose head has scripts/e2e-visual.mjs, the other slots are released first and e2e-visual runs on the first
// slot; status `visual-gate` (clean / flags / error), a PR comment on flags only. A desktop train posts error "skipped:
// desktop lane (laptop GPU only)". LQ_VISUAL=0 turns it off. auto-train never reads the status (a flag holds nothing).
// Affected e2e on every PR head (process audit 2026-10-24 finding 5; laptop only, after each pass, every
// LQ_AFFECTED_POLL_MIN (2; 0 = off) min, affectedPass): one `gh pr list` (rollup included) of the open PRs; each non-train,
// non-draft head without the label no-affected-e2e, without an affected-e2e status and without an open / claimed /
// running affected request (lib affectedNeeds) gets the suites of request.mjs --affected (lib affectedSuites: merge-base
// with origin/master, diff --name-only --no-renames, DIRECT_COVERS). None: affected-e2e success "no browser suites (docs
// / unit only)". Else a pr request (lib affectedRequest: requester affected-e2e, set affected, the PR number and branch)
// is pushed to requests/ and affected-e2e goes pending; the run posts its verdict on laptop-e2e/affected AND affected-e2e
// (build failed, no result, withdrawn and service errors too; either worker). Affected requests queue per branch (lib
// queueRequester): a newer head on the same branch supersedes the older request (its affected-e2e gets error
// "superseded"), and pick orders them with the leads' pr requests (front, green smallest first, arrival). Heads older than LQ_AFFECTED_MAX_AGE_H
// (24; 0 = no limit) and heads with no merge-base here (forks) are skipped, logged once.
// Spare work (laptop-queue-5; laptop only, sparePass after each pass): once both slots have sat idle with no open
// request and no pending train for LQ_SPARE_IDLE_MIN (5; 0 = off) min, the next job of docs/laptop-queue/spare-jobs.json
// (round-robin, lib spareNext) is pushed as an ordinary request on the origin/master head (requester "laptop-queue
// spare", lib spareRequest); never while a spare request is open, claimed or running, never a set already queued on
// that sha (state.spare, lib spareRecord).
// Never stuck pending (Orchestrator audit 2026-10-25): a retired affected request posts affected-e2e (duplicate: handed
// over to the surviving affected request, or success when it repeats a recent pass; lib duplicateStatuses), one
// withdrawn before it ran posts error (two listings in a row, lib vanishedRequests / withdrawnStatuses; a laptop rerun
// closes its own context too), and a head whose affected-e2e is pending with no open, claimed or running affected
// request is requested again (lib affectedNeeds stuck).
// Conflicts retire (laptop-queue-7): the PR board (lib prBoard, one gh call per LQ_PR_BOARD_S 60 s on both workers) knows
// each open PR's mergeable state; a head CONFLICTING gets no auto request (error posted once), and an open affected
// request on a conflicting current head is marked done unrun (lib conflictRetire / conflictStatuses). LQ_SKIP_CONFLICTING=0
// runs them. UNKNOWN never skips; a lead's named-suite request still runs.
// laptop-queue-15 F51: GitHub computes mergeable lazily, so after origin/master moves each open affected request's PR is
// read on its own (mergeRecheckNow) until known and a CONFLICTING one retires at once (LQ_MERGE_RECHECK_S / _MIN).
// Pick order (laptop-queue-7, lib pickFrom): pr requests go front branches (LQ_FRONT_BRANCHES), green PRs smallest first
// (LQ_GREEN_FIRST; LQ_GREEN_MAX_WAIT_MIN bound), then arrival. A moved train head carries a docs-only verdict or runs
// (carryMoved, LQ_TRAIN_CARRY). An aged alone gets the gap after the coming train (LQ_ALONE_GAP; lastTrainEnd, also
// bumped by this worker's own final train verdict: bumpTrainEnd).
// laptop-queue-8: fixes first (PR label `fix` or request.mjs --fix; LQ_FIX_FIRST) and a superseding request keeps the old
// one's queue place (`place`); a run on an old head stops when a newer head of the same PR queues (LQ_STOP_SUPERSEDED) and
// a train preempt keeps passed suites (`kept`, LQ_KEEP_FINISHED). Desktop: fixes, then the smallest request, none over
// LQ_DESKTOP_MAX_MIN 15 at one job; LQ_DESKTOP_CPU_MODE normal|total. A docs-only PR commit carries affected-e2e (LQ_PR_CARRY).
// laptop-queue-8 G (train 118 stall): a lost train verdict post or done push is retried every pass on both workers
// (syncTrains, LQ_TRAIN_RETRY); a claim carrying `beat` is stale after LQ_CLAIM_BEATS (4) beats; the alone hold drops a
// head whose verdict this worker holds or whose claim is done (lib trainHold lost).
// Slot locks (2026-10-25): heavy-lock.mjs parseLock reads both lock formats, so a desktop slot lock left by a killed
// service ("laptop-queue | ... pid <n> | <iso>", pid dead here) is broken at the gate like a dead heavy-lock line.
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pidAlive, staleName } from '../heavy-lock.mjs';
import { ALONE_AGE_MIN, agedAlone, assertKey, holdClears, manualLocks, slotLockDecision, nextTrain, fitsBeforeTrain, releasingTrain, readyHeads, seenSince, median, desktopFailDesc, laptopRerunRequest, supersedeStatuses, duplicateStatuses, withdrawnStatuses, vanishedRequests, buildMarker, cutShort, trainHold, capTail, claimBlocks, describe, desktopSlotGate, desktopTrainGate, cpuTotalPct, backgroundCpuMs, gatedCpu, dupKey, duplicates, failureExcerpt, lockChanged, mergeTimes, parseClaim, parseRun, pick, pruneDone, requestProblem, contextName, rerunPassed, runComplete, shard, staleTasks, superseded, suiteSection, trainBuildFailed, TASK_ALLOW as TASK_ALLOW_BASE, workerActivity, yieldTo, sortTrains, trainsUnderMarker, voidMisses, VOID_MISSES, runProgress, expectedWallS, suiteParts, aloneSoon, AFFECTED_REQUESTER, AFFECTED_CTX, affectedSuites, affectedNeeds, affectedRequest, prBoard, greenIds, isFront, isFix, placeFor, gateCpu, desktopTooLong, supersededRunning, finishedSuites, keptPlan, conflictRetire, versionAt, isVersionHead, carryFiles, carryFrom, carryDesc, prChain, conflictStatuses, autoQuarantine, countRuns, flakeBudget, flakeSummary, quarantined, FLAKE_BUDGET_DAYS, SPARE_REQUESTER, spareNext, spareRecord, spareRequest, realWaiting, aloneDue, aloneGapOpen, lastTrainEndFrom, holdKeeps, trainRepair, trainFinal } from './lib.mjs';
import { REPEAT_DAYS } from './lib.mjs'; // J20 S3b
import { visualPlan, visualEnv, visualVerdict, visualComment, VISUAL_CONTEXT, VISUAL_SUITE, VISUAL_SH_TIMEOUT_MS } from './visual.mjs';
import { overCapAffected } from './lib.mjs';
import { mergeRecheck, recordMergeable, withMergeable } from './lib.mjs'; // laptop-queue-15 (F51)
import { parseAffectedMax } from '../e2e-affected.mjs';
// the automatic affected cap: E2E_AFFECTED_MAX on the task (prototype mode 2026-10-26: 1), else e2e-affected's AFFECTED_MAX
const AFFECTED_MAX = parseAffectedMax(process.env.E2E_AFFECTED_MAX);
import { partsTable, slowLines, slowRecord, slowSummary } from './lib.mjs'; // laptop-queue-11 (F35, F36)
import { laptopRerunFor } from './lib.mjs';
import { ownQuarantine, ghRetryable, claimGated, claimSkip, claimSkipStatuses } from './lib.mjs'; // laptop-queue-14 (F46, F48, gh retry)

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
const HEARTBEAT_MS = Number(process.env.LQ_HEARTBEAT_MIN ?? 5) * 60_000; // laptop: a claim push while runs go on (0 = off)
const TRAIN_VOID_POLL_MS = Number(process.env.LQ_TRAIN_VOID_POLL_S ?? 60) * 1000;
// a train that has held some slots this long while another stays locked (a manual run) runs unsharded on the ones it holds
const TRAIN_SOLO_MS = Number(process.env.LQ_TRAIN_SOLO_MIN ?? 10) * 60_000;
// lib nextTrain (laptop-queue-6): merge to next train, newly green to its train, laptop success to merge, the late window
const TRAIN_GAP_MS = Number(process.env.LQ_TRAIN_GAP_MIN ?? 6.5) * 60_000;
const TRAIN_BUILD_MAX_MS = Number(process.env.LQ_TRAIN_BUILD_MAX_MIN ?? 20) * 60_000;
const TRAIN_READY_LAG_MS = Number(process.env.LQ_TRAIN_READY_LAG_MIN ?? 3) * 60_000;
const TRAIN_MERGE_LAG_MS = Number(process.env.LQ_TRAIN_MERGE_LAG_MIN ?? 2) * 60_000;
const TRAIN_LATE_MS = Number(process.env.LQ_TRAIN_LATE_MIN ?? 5) * 60_000;
const FIT_PREP_S = Number(process.env.LQ_FIT_PREP_S ?? 120); // claim to first suite (lib fitsBeforeTrain)
const POLL_MS = 30_000;
const DUP_WINDOW_MS = Number(process.env.LQ_DUP_WINDOW_MIN ?? 60) * 60_000;
const AFFECTED_POLL_MS = Number(process.env.LQ_AFFECTED_POLL_MIN ?? 2) * 60_000; // laptop: the affected pass (0 = off)
const SPARE_IDLE_MIN = Number(process.env.LQ_SPARE_IDLE_MIN ?? 5); // laptop: spare work after this many idle min (0 = off)
const PR_BOARD_MS = Number(process.env.LQ_PR_BOARD_S ?? 60) * 1000; // both workers: the PR board read (lib prBoard)
const SKIP_CONFLICTING = process.env.LQ_SKIP_CONFLICTING !== '0'; // 0 = a conflicting PR head still runs
const MERGE_RECHECK_MS = Number(process.env.LQ_MERGE_RECHECK_S ?? 60) * 1000; // F51: re-read gap of an UNKNOWN mergeable after master moves
const MERGE_RECHECK_MAX_MS = Number(process.env.LQ_MERGE_RECHECK_MIN ?? 10) * 60_000; // F51: how long after a master move (0 = off)
const GREEN_FIRST = process.env.LQ_GREEN_FIRST !== '0'; // 0 = arrival order only (lib pick queue.order)
const FRONT_BRANCHES = (process.env.LQ_FRONT_BRANCHES ?? 'mixamo').split(',').map((x) => x.trim()).filter(Boolean); // branch front tier, empty = none
const GREEN_MAX_WAIT_MS = Number(process.env.LQ_GREEN_MAX_WAIT_MIN ?? 30) * 60_000; // starvation bound of the green tier (0 = none)
const AFFECTED_MAX_AGE_MS = Number(process.env.LQ_AFFECTED_MAX_AGE_H ?? 24) * 3600_000; // older PR heads get no auto request (0 = no limit)
const TRAIN_CARRY = process.env.LQ_TRAIN_CARRY !== '0'; // 0 = a moved train head always runs (lib carryFrom; BRIEF A7, A8)
const TRAIN_CARRY_DEPTH = Number(process.env.LQ_TRAIN_CARRY_DEPTH ?? 20); // first-parent commits walked back to the version commit
const RERUN_SHARD = process.env.LQ_RERUN_SHARD !== '0'; // 0 = a train rerun runs on one slot (lib pick queue.shardRerun; BRIEF A10)
const ALONE_GAP = process.env.LQ_ALONE_GAP !== '0'; // 0 = the holds keep an aged alone back as before (lib aloneGapOpen; BRIEF A12)
const FIX_FIRST = process.env.LQ_FIX_FIRST !== '0'; // laptop-queue-8 A3: 0 = no fix tier (lib pick queue.order.fix)
const STOP_SUPERSEDED = process.env.LQ_STOP_SUPERSEDED !== '0'; // laptop-queue-8 A6: 0 = runs on old heads finish
const KEEP_FINISHED = process.env.LQ_KEEP_FINISHED !== '0'; // laptop-queue-8 A10: 0 = a preempted run reruns all its suites
const DESKTOP_MAX_S = Number(process.env.LQ_DESKTOP_MAX_MIN ?? 15) * 60; // laptop-queue-8 A9: longer runs are left to the laptop (0 = no limit)
const CPU_MODE = process.env.LQ_DESKTOP_CPU_MODE === 'total' ? 'total' : 'normal'; // laptop-queue-8 A11: desktop gate load (lib gateCpu)
const PR_CARRY = process.env.LQ_PR_CARRY !== '0'; // laptop-queue-8 A12: 0 = every PR head runs its affected-e2e (no docs-only carry)
const TRAIN_RETRY = process.env.LQ_TRAIN_RETRY !== '0'; // laptop-queue-8 A15, A18: 0 = no re-post / done retry, the hold reads GitHub only
const CLAIM_BEATS = Number(process.env.LQ_CLAIM_BEATS ?? 4); // laptop-queue-8 A17: a beating claim is stale after this many beats (0 = the 3 h rule)
/** lib claimBlocks for this worker now, with the heartbeat bound (A17). */
const blocks = (c) => claimBlocks(c, WORKER, Date.now(), CLAIM_MAX_MS, CLAIM_BEATS);
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
state.suiteRuns ??= {}; // { day: { suite: runs } }, the flake budget's denominator (lib countRuns)
state.quarantineStarts ??= {}; // { suite: ISO } of its last automatic quarantine (lib flakeBudget starts)
state.aloneDue ??= {}; // { id: ms } aged / preempted alone requests a hold kept back (lib aloneDue; BRIEF A12)
state.knownFlaky ??= []; // { suite, sha, date } of each KNOWN FLAKY failure in the budget window (flake-budget.md, T10)
state.blocking ??= {}; // { suite: { since, owner, last, reason, alerted } }: over budget again within REPEAT_DAYS (Q30)
// times.json (refreshed from real runs) over the repo's scripts/e2e-times.json as the seed
let seed = {};
try { seed = JSON.parse(fs.readFileSync(path.join(HERE, 'scripts/e2e-times.json'), 'utf8')); } catch { /* no seed */ }
let times = { ...seed, ...readJson('times.json', {}) };
// laptop-queue-14 F48: the desktop forgives only the committed list; its old automatic entries go (lib ownQuarantine)
if (DESKTOP) {
  const left = readJson('quarantine.json', []);
  if (Array.isArray(left) && left.length) {
    writeJson('quarantine.json', []);
    log(`quarantine: desktop automatic list dropped (${left.map((q) => q?.suite).join(', ')}): a desktop failure goes to the laptop rerun, the laptop's list applies`);
  }
}

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
/** gh, retried once on a TLS handshake timeout (lib ghRetryable; nothing reached GitHub), soft as cmd. */
function gh(args, opts = {}) {
  try { return cmd('gh', args, { ...opts, soft: false }); } catch (e) {
    if (ghRetryable(e)) {
      log(`gh ${args.slice(0, 2).join(' ')}: TLS handshake timeout, retrying once`);
      try { return cmd('gh', args, { ...opts, soft: false }); } catch (e2) { if (opts.soft) return ''; throw e2; }
    }
    if (opts.soft) return '';
    throw e;
  }
}

// laptop-queue-11 F36: a suite's parts come from the run's head (run-e2e PARTS differs by branch), never the times keys
const partsMemo11 = new Map(); // sha -> the head's PARTS table, or the fallback when git could not read it
/**
 * Planning, before a slot is checked out: the PARTS table of `sha`'s run-e2e.mjs (git show here; the service fetches
 * origin every pass), else this checkout's own run-e2e.mjs, else {} (no expansion: a whole suite, never a part the head
 * may lack). lib suiteParts takes it.
 */
function planParts(sha) {
  if (partsMemo11.has(sha)) return partsMemo11.get(sha);
  const head = sha ? partsTable(git(['show', `${sha}:scripts/run-e2e.mjs`], { soft: true })) : null;
  let got = head;
  if (!got) {
    try { got = partsTable(fs.readFileSync(path.join(HERE, 'scripts/run-e2e.mjs'), 'utf8')); } catch { /* none */ }
  }
  got ??= {};
  // the fallback is kept per sha too (an unreadable head would otherwise cost a git show every pass)
  if (partsMemo11.size > 200) partsMemo11.clear();
  partsMemo11.set(sha, got);
  return got;
}
/** Run time, the slot checked out at the head: what its own run-e2e lists for `list` (`--list`), else planParts. */
function runParts(list, port, sha) {
  if (!(list ?? []).length) return [];
  const out = cmd('node', ['scripts/run-e2e.mjs', '--list', ...list], { cwd: SLOTS[port].dir, soft: true }).split('\n').map((x) => x.trim()).filter(Boolean);
  return out.length ? out : suiteParts(list, times, planParts(sha));
}

/** Posts a commit status (dry run: prints the gh command); true when posted (or a dry run), false when the post failed. */
function postStatus(sha, status, context, description) {
  const args = ['api', `repos/${REPO}/statuses/${sha}`, '-f', `state=${status}`, '-f', `context=${context}`, '-f', `description=${description}`];
  if (DRY) { log(`dry-run: gh ${args.join(' ')}`); return true; }
  try { gh(args); log(`status ${context} ${status} on ${sha.slice(0, 8)}: ${description}`); return true; } catch (e) { log(`status post failed: ${String(e.message).split('\n')[0]}`); return false; }
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
/** The open requests of the last listRequests (the affected pass reads which heads already have one). */
let openListed = [];
/** Running request id -> listings in a row it was missing from; ids missing from two are withdrawn (lib cutShort). */
const missing = new Map();
const withdrawnIds = new Set();
/**
 * Laptop: open requests that leave a pending status behind if withdrawn unrun (auto affected requests, laptop reruns;
 * lib withdrawnStatuses), id -> request, and the listings in a row each one was missing from (lib vanishedRequests).
 */
const openTracked = new Map();
let openMisses = new Map();
const tracksWithdraw = (r) => r.requester === AFFECTED_REQUESTER || Boolean(r.laptopRerun);

/** Closes the pending statuses of tracked open requests withdrawn before they ran (two listings in a row). */
function closeWithdrawn(listed) {
  const v = vanishedRequests(openTracked, listed, openMisses);
  openMisses = v.misses;
  for (const r of v.gone) {
    openTracked.delete(r.id);
    if (state.done[r.id] || claimed.has(r.id) || activeReqs.has(r.id) || doneElsewhere.has(r.id)) continue;
    log(`${r.id}: withdrawn by the requester before it ran`);
    for (const s of withdrawnStatuses(r)) postStatus(s.sha, s.state, s.context, s.description);
  }
}

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
    if (!DESKTOP) closeWithdrawn(listed);
  }
  const out = [];
  otherActive = [];
  for (const n of names) {
    const id = path.basename(n, '.json');
    if (state.done[id] || badSeen.has(id) || doneElsewhere.has(id)) continue;
    if (claims.has(id) && !claimed.has(id)) {
      const c = parseClaim(git(['show', `origin/laptop-queue:claims/${id}.json`], { soft: true }));
      if (c?.done) { doneElsewhere.add(id); continue; }
      if (blocks(c)) {
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
  openListed = out;
  if (!DESKTOP) {
    for (const r of out) if (tracksWithdraw(r)) openTracked.set(r.id, r);
    // done, or claimed by the other worker (its run posts its own withdrawal): no longer tracked here
    const elsewhere = new Set(otherActive.map((r) => r.id));
    for (const id of openTracked.keys()) if (state.done[id] || doneElsewhere.has(id) || elsewhere.has(id)) { openTracked.delete(id); openMisses.delete(id); }
  }
  return out;
}

/** A real request this worker could run waits (lib realWaiting on the last listing; the desktop counts only pr work it takes). */
const realOpenNow = (listed = openListed) => realWaiting(DESKTOP ? listed.filter((r) => r.kind === 'pr' && !r.trainRerun && !r.laptopRerun) : listed, claimed);

// ---------- claims (laptop-queue branch) ----------

const QREF = 'refs/remotes/origin/laptop-queue';
const gitIdEnv = () => (git(['config', 'user.email'], { soft: true }) ? {} : { GIT_AUTHOR_NAME: 'laptop-queue', GIT_AUTHOR_EMAIL: 'laptop-queue@localhost', GIT_COMMITTER_NAME: 'laptop-queue', GIT_COMMITTER_EMAIL: 'laptop-queue@localhost' });

/**
 * Changes claims/<id>.json for each id in one commit on top of origin/laptop-queue and pushes it (index in a temp file,
 * the checkout untouched); a lost push race refetches and retries (5 tries). mode 'claim' (open; also refreshes this
 * worker's own `at`; carries `beat` = LQ_HEARTBEAT_MIN, lib claimBlocks A17) skips each id whose claim on the fresh
 * parent blocks this worker (the others are still written: a heartbeat refreshes the rest); 'done' marks finished;
 * 'release' removes the claim (the run gave up). guard (mode 'done', syncTrains): an id whose fresh claim is another
 * worker's live or done claim is skipped the same way. taken (a Map, optional) gets id -> worker for each skipped id
 * (heartbeat stops those runs). Returns true when pushed, 'blocked' when another worker holds every claim, false when
 * the push failed.
 */
function writeClaims(ids, mode, label, { taken = null, guard = false } = {}) {
  if (ids.length === 0) return true;
  if (DRY) { log(`dry-run: would push ${mode} ${ids.length === 1 ? ids[0] : `${ids.length} ids`} (${WORKER})`); return true; }
  const tmpIndex = path.join(os.tmpdir(), `lq-claim-${process.pid}`);
  const env = { GIT_INDEX_FILE: tmpIndex, ...gitIdEnv() };
  try {
    for (let attempt = 1; attempt <= 5; attempt++) {
      git(['fetch', '-q', 'origin', `+refs/heads/laptop-queue:${QREF}`], { soft: true });
      const parent = git(['rev-parse', '--verify', '-q', QREF], { soft: true });
      if (!parent) return false;
      let write = ids;
      if (mode === 'claim' || (mode === 'done' && guard)) {
        write = ids.filter((id) => {
          const have = parseClaim(git(['show', `${parent}:claims/${id}.json`], { soft: true }));
          if (mode === 'claim' ? !blocks(have) : !otherClaim(have)) return true;
          log(`${id}: claimed by ${have.worker}${have.done ? ' (done)' : ''}, skipped`);
          taken?.set(id, have.worker);
          return false;
        });
        if (write.length === 0) return 'blocked';
      }
      fs.rmSync(tmpIndex, { force: true });
      git(['read-tree', parent], { env });
      if (mode === 'release') {
        for (const id of write) git(['update-index', '--force-remove', `claims/${id}.json`], { env });
      } else {
        const rec = { worker: WORKER, pid: process.pid, at: new Date().toISOString(), done: mode === 'done' };
        if (mode === 'claim' && HEARTBEAT_MS > 0) rec.beat = HEARTBEAT_MS; // lib claimBlocks heartbeat bound (A17)
        const blob = git(['hash-object', '-w', '--stdin'], { input: `${JSON.stringify(rec)}\n` });
        git(['update-index', '--add', '--index-info'], { env, input: write.map((id) => `100644 ${blob}\tclaims/${id}.json\n`).join('') });
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

/**
 * Adds or replaces one file (rel path) on the laptop-queue branch in one commit, writeClaims' plumbing; true when pushed.
 * mustExist (laptop-queue-8: a request rewrite, place or kept): false, nothing written, when the fresh parent no longer
 * holds the file, so a rewrite never recreates a request withdrawn meanwhile.
 */
function pushFile(rel, text, label, { mustExist = false } = {}) {
  const tmpIndex = path.join(os.tmpdir(), `lq-file-${process.pid}`);
  const env = { GIT_INDEX_FILE: tmpIndex, ...gitIdEnv() };
  try {
    for (let attempt = 1; attempt <= 5; attempt++) {
      git(['fetch', '-q', 'origin', `+refs/heads/laptop-queue:${QREF}`], { soft: true });
      const parent = git(['rev-parse', '--verify', '-q', QREF], { soft: true });
      if (!parent) return false;
      if (mustExist) {
        try { git(['cat-file', '-e', `${parent}:${rel}`]); } catch { log(`${rel} gone, not rewritten`); return false; }
      }
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

/**
 * (affected-cap A7) Re-files every open, unclaimed automatic affected request naming more suites than AFFECTED_MAX (lib
 * overCapAffected): its suites recomputed with lib affectedSuites (the default cap) and its file rewritten under the same
 * id, so it keeps its queue place, its claim key and its withdrawal tracking; affected-e2e is re-posted pending with the
 * new count. A request withdrawn meanwhile (its file gone from the queue branch) is never recreated. At or under the cap:
 * left alone (idempotent). Laptop only (the affected turn); never throws.
 */
const refileLogged = new Set();
function refileOverCap() {
  try {
    for (const r of overCapAffected(openListed.filter((o) => !claimed.has(o.id) && !activeReqs.has(o.id)), AFFECTED_MAX)) {
      const was = new Set(r.suites.map((s) => String(s).split(':')[0])).size;
      const got = affectedSuites((args) => git(args), r.sha, { max: AFFECTED_MAX });
      if (!got || !got.suites.length) {
        if (!refileLogged.has(r.id)) { refileLogged.add(r.id); log(`${r.id}: no capped pick here (${got ? 'no browser suite' : 'no merge-base'}), not re-filed`); }
        continue;
      }
      if (got.suites.join(' ') === r.suites.join(' ')) continue;
      if (DRY) { log(`dry-run: ${r.id}: would re-file at cap ${AFFECTED_MAX}: ${was} -> ${got.suites.join(' ')}`); continue; }
      git(['fetch', '-q', 'origin', `+refs/heads/laptop-queue:${QREF}`], { soft: true });
      try { git(['cat-file', '-e', `${QREF}:requests/${r.id}.json`]); } catch { log(`${r.id}: gone from the queue (withdrawn), not re-filed`); continue; }
      const note = `${r.note ?? ''} (re-filed at cap ${AFFECTED_MAX})`.trim();
      if (!pushFile(`requests/${r.id}.json`, `${JSON.stringify({ ...r, suites: got.suites, note }, null, 2)}\n`, `re-file ${r.id}`)) continue;
      r.suites = got.suites;
      r.note = note;
      log(`${r.id}: re-filed at cap ${AFFECTED_MAX}: ${was} -> ${got.suites.join(' ')}`);
      postStatus(r.sha, 'pending', AFFECTED_CTX, `queued: ${got.suites.length} suite(s), laptop-e2e/affected (re-filed at the cap)`);
    }
  } catch (e) { log(`re-file failed: ${String(e.message).split('\n')[0]}`); }
}

// ---------- task guard ----------

const TASK_GUARD_MS = Number(process.env.LQ_TASK_GUARD_MIN ?? 10) * 60_000;
// exact names; NightShift-run-* one-shots with an EndBoundary are allowed in staleTasks
const TASK_ALLOW = [...TASK_ALLOW_BASE,
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

// ---------- affected e2e on every PR head (laptop; process audit 2026-10-24, finding 5) ----------

let lastAffected = 0;
/** PR head shas this process enqueued (the next listing may not show the request yet); dropped once not an open head. */
const affectedSeen = new Set();
/** Heads skipped with a log line once (no merge-base here, too old). */
const affectedLogged = new Set();

/**
 * One affected pass (lib affectedNeeds): every open non-train, non-draft PR head with no affected-e2e status and no
 * affected request gets the suites request.mjs --affected would pick (lib affectedSuites). None: affected-e2e success
 * "no browser suites (docs / unit only)". Else a pr request (lib affectedRequest) is pushed to the laptop-queue branch
 * and affected-e2e goes pending; runRequest posts the verdict. A head older than LQ_AFFECTED_MAX_AGE_H or one whose
 * merge-base is unreadable here (a fork, not fetched) is skipped, logged once. Never throws.
 */
function affectedPass() {
  lastAffected = Date.now();
  try {
    const prs = JSON.parse(gh(['pr', 'list', '-R', REPO, '--state', 'open', '--limit', '200', '--json', 'number,headRefName,headRefOid,isDraft,labels,mergeable,statusCheckRollup']) || '[]');
    const heads = new Set(prs.map((p) => p.headRefOid));
    for (const s of affectedSeen) if (!heads.has(s)) affectedSeen.delete(s);
    const reqs = [...openListed, ...activeReqs.values(), ...otherActive];
    // a head whose request the listing shows needs no `seen` guard any more: if that request later leaves without a
    // final status, the stuck pending head is requested again (lib affectedNeeds stuck)
    for (const r of reqs) if (r?.requester === AFFECTED_REQUESTER) affectedSeen.delete(r.sha);
    const needs = affectedNeeds(prs, reqs, affectedSeen);
    for (const n of needs) {
      const tag = `affected: #${n.pr} ${n.sha.slice(0, 8)} (${n.branch})${n.stuck ? ' [affected-e2e pending with no request: requested again]' : ''}`;
      const ct = Number(git(['show', '-s', '--format=%ct', n.sha], { soft: true })) * 1000;
      if (AFFECTED_MAX_AGE_MS > 0 && ct && Date.now() - ct > AFFECTED_MAX_AGE_MS) {
        if (!affectedLogged.has(n.sha)) { affectedLogged.add(n.sha); log(`${tag}: head older than ${AFFECTED_MAX_AGE_MS / 3600_000} h, no auto request`); }
        continue;
      }
      if (PR_CARRY && !(n.conflicting && SKIP_CONFLICTING) && prCarry(n, reqs)) continue; // laptop-queue-8 A12
      const got = affectedSuites((args) => git(args), n.sha, { max: AFFECTED_MAX });
      if (!got) {
        if (!affectedLogged.has(n.sha)) { affectedLogged.add(n.sha); log(`${tag}: no merge-base with origin/master here (fork or not fetched), skipped`); }
        continue;
      }
      if (got.suites.length === 0) {
        postStatus(n.sha, 'success', AFFECTED_CTX, 'no browser suites (docs / unit only)');
        affectedSeen.add(n.sha);
        continue;
      }
      if (n.conflicting && SKIP_CONFLICTING) {
        postStatus(n.sha, 'error', AFFECTED_CTX, `not run: PR #${n.pr} conflicts with master (a new head runs again)`);
        affectedSeen.add(n.sha);
        if (!affectedLogged.has(n.sha)) { affectedLogged.add(n.sha); log(`affected: #${n.pr} ${n.sha.slice(0, 8)}: CONFLICTING, not run`); }
        continue;
      }
      const r = affectedRequest({ now: Date.now(), ...n, suites: got.suites, suffix: randomBytes(2).toString('hex') });
      if (DRY) { log(`dry-run: ${tag}: would enqueue ${r.id}: ${got.files.length} file(s), ${got.suites.join(' ')}`); continue; }
      if (!pushFile(`requests/${r.id}.json`, `${JSON.stringify(r, null, 2)}\n`, `request ${r.id}`)) { log(`${tag}: request push failed, retried next affected pass`); continue; }
      affectedSeen.add(n.sha);
      log(`${tag}: enqueued ${r.id}: ${got.files.length} file(s), ${got.suites.join(' ')}`);
      postStatus(n.sha, 'pending', AFFECTED_CTX, `queued: ${got.suites.length} suite(s), laptop-e2e/affected`);
    }
  } catch (e) { log(`affected pass failed: ${String(e.message).split('\n')[0]}`); }
}

/** PR heads whose carry check said "runs" (read once per head per process; a wait reads again). */
const prCarryChecked = new Set();
const prCarryWaitLogged = new Set();

/**
 * Docs-only verdict carry for a PR head H (laptop-queue-8 A12; laptop-queue-7's lib carryFrom / carryFiles / carryDesc):
 * the chain is H's first-parent commits back to the merge-base with origin/master (at most LQ_TRAIN_CARRY_DEPTH, lib
 * prChain), each with its affected-e2e state; live(P) = an open, claimed or running affected request on P. A success on
 * the newest final verdict with a docs-only delta -> affected-e2e success "carried from <C8>, docs-only delta" (true);
 * an older pending head with a live affected request and a docs-only delta -> H waits this pass (true); else false (H
 * runs as before). A git or gh error -> false. Only affected-e2e: the leads' laptop-e2e/<set> and checker never carry.
 */
function prCarry(n, reqs) {
  if (prCarryChecked.has(n.sha)) return false;
  const mergeBase = git(['merge-base', 'origin/master', n.sha], { soft: true });
  if (!mergeBase) return false;
  const lines = git(['log', '--first-parent', '-n', String(TRAIN_CARRY_DEPTH), '--format=%H', n.sha], { soft: true }).split('\n');
  const chain = prChain(lines, mergeBase);
  if (chain.length === 0) { prCarryChecked.add(n.sha); return false; }
  const rows = [];
  try {
    for (const c of chain) {
      const st = gh(['api', `repos/${REPO}/commits/${c}/status`, '--jq', `[.statuses[] | select(.context == "${AFFECTED_CTX}") | .state][0] // ""`]).trim();
      rows.push({ sha: c, laptop: st });
      if (st === 'success' || st === 'failure' || st === 'error') break;
    }
  } catch (e) {
    log(`affected: #${n.pr} ${n.sha.slice(0, 8)}: carry status read failed, runs as before: ${String(e.message).split('\n')[0]}`);
    return false;
  }
  const live = (p) => reqs.some((r) => r?.sha === p && r.requester === AFFECTED_REQUESTER);
  const got = carryFrom(rows, (c) => filesBetween(c, n.sha), live);
  if (got?.from) {
    if (!postStatus(n.sha, 'success', AFFECTED_CTX, carryDesc(got.from))) return false;
    affectedSeen.add(n.sha);
    log(`affected: #${n.pr} ${n.sha.slice(0, 8)}: carried from ${got.from.slice(0, 8)}, docs-only delta`);
    return true;
  }
  if (got?.wait) {
    const key = `${n.sha} ${got.wait}`;
    if (!prCarryWaitLogged.has(key)) { prCarryWaitLogged.add(key); log(`affected: #${n.pr} ${n.sha.slice(0, 8)}: waits for ${got.wait.slice(0, 8)}, docs-only delta`); }
    return true;
  }
  prCarryChecked.add(n.sha);
  return false;
}

/** When both slots went idle with an empty queue (null: not idle), and the last spare wait reason logged. */
let spareIdleSince = null;
let spareLogged = '';
let spareDryLogged = false; // --dry-run: "would enqueue" once per idle spell

/**
 * Spare work (lib spareNext): after LQ_SPARE_IDLE_MIN idle minutes (both slots free, no open request, no pending
 * train) the next spare job is pushed as a request on the origin/master head and recorded in state.spare. Never throws.
 * Not idle either while the next train is due (nextTrain), an open train lacks its laptop pass (aloneHold) or
 * green train-ready PRs wait for a train (aloneSoon): a spare job must never hold a train.
 */
function sparePass() {
  try {
    const notIdle = () => { spareIdleSince = null; spareDryLogged = false; };
    if (Object.values(busy).some(Boolean) || openListed.length || pendingNow.length || next || aloneHold) return notIdle();
    spareIdleSince ??= Date.now();
    let jobs = [];
    try { jobs = JSON.parse(fs.readFileSync(path.join(HERE, 'docs/laptop-queue/spare-jobs.json'), 'utf8')).jobs ?? []; } catch { /* no list: nothing to do */ }
    const sha = git(['rev-parse', 'origin/master'], { soft: true });
    const openSpare = [...openListed, ...activeReqs.values(), ...otherActive].some((r) => r.requester === SPARE_REQUESTER);
    const nx = spareNext({ now: Date.now(), idleSince: spareIdleSince, idleMin: SPARE_IDLE_MIN, openSpare, sha, jobs, history: state.spare });
    if (!nx.job) { if (!nx.why.startsWith('idle ') && nx.why !== spareLogged) { spareLogged = nx.why; log(`spare: ${nx.why}`); } return; }
    // green train-ready PRs while no train PR is open (readyNow, this pass)
    const trainNext = openTrainCount === 0 ? aloneSoon(0, ready.green.length) : '';
    if (trainNext) { log(`spare: ${trainNext}: no spare work`); return notIdle(); }
    spareLogged = '';
    const n = (state.spare?.n ?? 0) + 1;
    const r = spareRequest({ now: Date.now(), job: nx.job, sha, n, suffix: randomBytes(2).toString('hex') });
    const problem = requestProblem(r);
    if (problem) { log(`spare: ${nx.job.set}: bad request (${problem}), skipped`); state.spare = spareRecord(state.spare, sha, nx.index, nx.job.set); saveState(); return; }
    if (DRY) { if (!spareDryLogged) log(`dry-run: spare: would enqueue ${r.id} (${nx.job.set}) on ${sha.slice(0, 8)}`); spareDryLogged = true; return; }
    if (!pushFile(`requests/${r.id}.json`, `${JSON.stringify(r, null, 2)}\n`, `request ${r.id}`)) { log('spare: request push failed, retried next pass'); return; }
    state.spare = spareRecord(state.spare, sha, nx.index, nx.job.set);
    saveState();
    spareIdleSince = null;
    log(`spare: idle ${SPARE_IDLE_MIN} min: enqueued ${r.id} (${nx.job.set}) on master ${sha.slice(0, 8)}`);
  } catch (e) { log(`spare pass failed: ${String(e.message).split('\n')[0]}`); }
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
 * (default 24) are skipped. Only the head of an open train/<n> PR whose subject is the train's version commit runs, or
 * a head moved past it (carryMoved: a docs-only delta carries, else it runs as a normal train): a closed train, a PR
 * not open yet or a pre-version head is never run; a failed PR list skips every train this pass.
 * A head whose auto-train/* status is failure or error is skipped (logged once per head per process), and so is one
 * the other worker claimed (claims/<sha>.json; claimBlocks). The stale-pending rule needs that claim check: a train
 * the other worker runs is `pending` too.
 */
const buildFailLogged = new Set();
/** The open train holding alone requests back this pass (lib trainHold), or null; a failed PR list holds them too. */
let aloneHold = null;
let aloneHoldLogged = '';
let aloneHoldAt = 0; // when the hold line was last logged (A19)
const HOLD_LOG_MS = 15 * 60_000;
/** The next train while it holds new claims (lib nextTrain: { why, etaMs, untilMs }), else null; set by pendingTrains (laptop). */
let next = null;
let soonLogged = '';
let aloneSoonLogged = '';
/** The newest final laptop-e2e on an open train head ever seen (ms; lib lastTrainEndFrom) and its train, kept in state. */
let lastTrainEnd = Number.isFinite(state.lastTrainEnd) ? state.lastTrainEnd : NaN;
let lastTrainN = state.lastTrainN ?? '?';
/** This worker just posted a final laptop-e2e on train n: lastTrainEnd = that time, never back (a release within a pass
 *  leaves no open head for pendingTrains to read the end from). */
function bumpTrainEnd(n) {
  if (DRY) return;
  const end = lastTrainEndFrom([{ laptop: 'success', laptopAt: new Date().toISOString() }], lastTrainEnd);
  if (end === lastTrainEnd) return;
  lastTrainEnd = end; lastTrainN = n ?? '?'; state.lastTrainEnd = end; state.lastTrainN = lastTrainN;
  saveState();
}
const gapLogged = new Set(); // due alone ids whose "gap after train" line is logged
let openTrainCount = -1; // open train/<n> PRs at the last listing (-1: unknown)
let manualLogged = '';
let orderLogged = ''; // the last "order:" log line's front / green ids
const tooLongLogged = new Set(); // desktop: request ids already logged as left to the laptop (laptop-queue-8 A9)
/** The open PR board (lib prBoard), read by prBoardNow every LQ_PR_BOARD_S s; empty after a GitHub error. */
let board = new Map();
let lastBoard = 0;

/**
 * Reads the open PRs once per LQ_PR_BOARD_S (both workers) into `board`. A GitHub error leaves it empty: nothing is
 * skipped and nothing is green, never act on a GitHub error.
 */
function prBoardNow() {
  if (Date.now() - lastBoard < PR_BOARD_MS) return;
  lastBoard = Date.now();
  try { board = prBoard(JSON.parse(gh(['pr', 'list', '-R', REPO, '--state', 'open', '--limit', '200', '--json', 'number,headRefOid,mergeable,statusCheckRollup,labels,isDraft']) || '[]')); }
  catch (e) { board = new Map(); log(`pr board read failed: ${String(e.message).split('\n')[0]}`); }
}

/** laptop-queue-15 F51: mergeRecheck's state (master sha, per PR head the last `gh pr view` mergeable read). */
let recheck = null;
/**
 * F51: after origin/master moves (fetched by listRequests), reads each open affected request's PR mergeable state
 * (lib mergeRecheck: every LQ_MERGE_RECHECK_S 60 s while UNKNOWN, for LQ_MERGE_RECHECK_MIN 10 min) and lays the
 * CONFLICTING reads on the board (lib withMergeable), so applyConflicts retires them this pass and posts their error
 * statuses. A failed read counts as UNKNOWN. LQ_SKIP_CONFLICTING=0 or LQ_MERGE_RECHECK_MIN=0: off.
 */
function mergeRecheckNow(requests) {
  if (!SKIP_CONFLICTING || MERGE_RECHECK_MAX_MS <= 0) return;
  const master = git(['rev-parse', 'origin/master'], { soft: true });
  const r = mergeRecheck(recheck, { master: master || null, requests, board, now: Date.now(), retryMs: MERGE_RECHECK_MS, maxMs: MERGE_RECHECK_MAX_MS });
  if (r.state !== recheck && recheck) log(`master moved to ${String(master).slice(0, 8)}: re-checking open affected requests for conflicts`);
  recheck = r.state;
  for (const d of r.due) {
    let v = null;
    try { v = JSON.parse(gh(['pr', 'view', String(d.pr), '-R', REPO, '--json', 'headRefOid,mergeable']) || 'null'); } catch (e) { log(`PR #${d.pr} mergeable read failed: ${String(e.message).split('\n')[0]}`); }
    recheck = recordMergeable(recheck, d.pr, v?.headRefOid ?? d.head, v?.mergeable, Date.now());
  }
  board = withMergeable(board, recheck);
}

/** Train-ready PRs this pass (readyNow): green / running heads and the green ones' first-seen-green times (ms). */
let ready = { green: [], running: [], firstSeen: [] };

/**
 * Reads the train-ready PRs once per pass (lib readyHeads), before sparePass and the alone check read them: a head an
 * open train head or origin/master (fetched by listRequests) contains is not a candidate. Keeps state.trainReady (lib
 * seenSince; saved only when it changed). A GitHub error leaves no candidates: never hold on a GitHub error.
 */
function readyNow(openPrs) {
  try {
    const prs = JSON.parse(gh(['pr', 'list', '-R', REPO, '--state', 'open', '--label', 'train-ready', '--json', 'headRefOid,statusCheckRollup', '--jq', '[.[] | {head: .headRefOid, check: ([.statusCheckRollup[]? | select(.name == "check") | {status, conclusion}] | first)}]']) || '[]');
    const h = readyHeads(prs, (head) => isAncestor(head, 'origin/master') || openPrs.some((p) => isAncestor(head, p.sha)));
    const seen = seenSince(state.trainReady, h.green, Date.now());
    if (JSON.stringify(seen) !== JSON.stringify(state.trainReady ?? {})) { state.trainReady = seen; saveState(); }
    ready = { ...h, firstSeen: h.green.map((x) => seen[x]) };
  } catch { ready = { green: [], running: [], firstSeen: [] }; }
}

/** lib nextTrain from GitHub: a building train PR (no version head yet), else a releasing train or the last release. */
function nextTrainNow(openPrs, heads = []) {
  const now = Date.now();
  const lim = { buildMaxMs: TRAIN_BUILD_MAX_MS, gapMs: TRAIN_GAP_MS, readyLagMs: TRAIN_READY_LAG_MS, mergeLagMs: TRAIN_MERGE_LAG_MS, lateMs: TRAIN_LATE_MS };
  const cand = { green: ready.firstSeen, running: ready.running.length, now };
  // the version head, or a head moved past it (a fix on top, lib versionAt): never "building"
  const isVersion = (p) => trainChain(p.sha, p.n) !== null;
  const b = openPrs.find((p) => !isVersion(p));
  if (b) return nextTrain({ building: { n: b.n, ageMs: now - Date.parse(b.createdAt) }, now }, lim);
  if (!ready.green.length && !ready.running.length) return null; // no candidate: no merged-PR call
  // a train with its laptop-e2e success is released (and the next one built) within minutes: hold the slots for it
  const rel = releasingTrain(heads, now);
  if (rel) return nextTrain({ ...cand, releasing: { n: rel.n, laptopAtMs: now - rel.ageMs } }, lim);
  if (openPrs.length) return null;
  try {
    const last = JSON.parse(gh(['pr', 'list', '-R', REPO, '--state', 'merged', '--limit', '30', '--json', 'headRefName,mergedAt', '--jq', '[.[] | select(.headRefName | startswith("train/"))][0] // null']) || 'null');
    if (!last) return null;
    return nextTrain({ ...cand, lastMerge: { n: String(last.headRefName).replace(/^train\//, ''), atMs: Date.parse(last.mergedAt) } }, lim);
  } catch { return null; /* unreadable: no hold (never block on a GitHub error) */ }
}

/**
 * Train n's chain under head sha (lib versionAt within LQ_TRAIN_CARRY_DEPTH first-parent commits): the shas from the
 * head's parent back to the version commit, newest first ([] when the head is the version commit), or null when no
 * version commit of train n is found (a pre-version head).
 */
function trainChain(sha, n) {
  const lines = git(['log', '--first-parent', '-n', String(TRAIN_CARRY_DEPTH), '--format=%H%x09%s', sha], { soft: true }).split('\n');
  const v = versionAt(lines, n, TRAIN_CARRY_DEPTH);
  return v ? lines.map((l) => l.trim()).filter(Boolean).slice(1, v.index + 1).map((l) => l.split('\t')[0]) : null;
}

/** The changed files from a to b (git diff --name-only), or null on a git error. */
function filesBetween(a, b) {
  try { return git(['diff', '--no-renames', '--name-only', a, b]).split('\n').map((x) => x.trim()).filter(Boolean); } catch { return null; }
}

/** A commit's laptop-e2e state ('' when none); throws on a gh error. */
const laptopState = (sha) => gh(['api', `repos/${REPO}/commits/${sha}/status`, '--jq', '[.statuses[] | select(.context == "laptop-e2e") | .state][0] // ""']).trim();

/**
 * Moved train heads (BRIEF A7): head -> 'run' once its chain read says it runs as a normal train (read once per head per
 * process). A carry or a wait is not kept: a carry sets state.trains, a wait reads again next pass.
 */
const carryChecked = new Map();
const carryWaitLogged = new Set();

/**
 * A moved train head with no laptop-e2e status (lib carryFrom): 'carried' (success posted), 'wait' (a live docs-only
 * ancestor run; neither worker starts it), 'skip' (a gh error, this pass) or 'run' (a normal sharded train).
 */
function carryMoved(sha, n, chain) {
  if (carryChecked.get(sha) === 'run') return 'run';
  const rows = [];
  try {
    // newest first, stopping at the first final verdict (carryFrom never reads past it)
    for (const c of chain) {
      const laptop = laptopState(c);
      rows.push({ sha: c, laptop });
      if (laptop === 'success' || laptop === 'failure' || laptop === 'error') break;
    }
  } catch (e) {
    log(`train ${n} ${sha.slice(0, 8)}: chain status read failed, skipped this pass: ${String(e.message).split('\n')[0]}`);
    return 'skip';
  }
  const now = Date.now();
  // a dead run (restart, crash, lost final post) is not live: H never waits on it for good (claimBlocks is true for
  // any done claim, so a done claim with a lost final post must not count)
  const live = (p) => {
    if (runningTrains.has(p)) return true; // running here (claimed stays set after a run ends: checker FIX 1)
    const c = parseClaim(git(['show', `origin/laptop-queue:claims/${p}.json`], { soft: true }));
    return !!c && !c.done && blocks(c);
  };
  const r = carryFrom(rows, (c) => filesBetween(c, sha), live);
  if (r?.from) {
    // a failed post records nothing: the next pass carries again (state.trains would skip H for good)
    if (!postStatus(sha, 'success', 'laptop-e2e', carryDesc(r.from))) return 'skip';
    bumpTrainEnd(n);
    state.trains[sha] = { result: 'carried', from: r.from, n, state: 'success', desc: carryDesc(r.from), posted: true, doneSynced: true, date: new Date().toISOString() };
    saveState();
    log(`train ${n} ${sha.slice(0, 8)}: carried from ${r.from.slice(0, 8)}, docs-only delta`);
    return 'carried';
  }
  if (r?.wait) {
    const key = `${sha} ${r.wait}`;
    if (!carryWaitLogged.has(key)) { carryWaitLogged.add(key); log(`train ${n} ${sha.slice(0, 8)}: waits for ${r.wait.slice(0, 8)}, docs-only delta`); }
    return 'wait';
  }
  carryChecked.set(sha, 'run');
  return 'run';
}

const TRAIN_MAX_AGE_S = Number(process.env.LQ_TRAIN_MAX_AGE_H ?? 24) * 3600;

/**
 * The open train PRs and their heads' laptop-e2e states this pass: { openPrs, heads } (heads = [{ n, sha, pr, createdAt,
 * laptop, laptopAt }]: every open train PR head except those that can never get a verdict here, older than
 * LQ_TRAIN_MAX_AGE_H or a failed auto-train/* build; a status read error is 'unknown'), or null when the PR list failed
 * (the error state is set: trains skipped, the hold on, no next-train hold). pass() reads it on the laptop before
 * syncTrains (laptop-queue-8 G) and hands it to pendingTrains.
 */
function trainHeadsNow() {
  let openPrs;
  try {
    openPrs = JSON.parse(gh(['pr', 'list', '-R', REPO, '--state', 'open', '--limit', '200', '--json', 'number,headRefName,headRefOid,createdAt', '--jq', '[.[] | select(.headRefName | startswith("train/")) | {n: (.headRefName | ltrimstr("train/")), sha: .headRefOid, pr: .number, createdAt}]']) || '[]');
  } catch (e) {
    log(`train PR list failed, trains skipped this pass: ${String(e.message).split('\n')[0]}`);
    aloneHold = { n: '?', sha: '', laptop: 'unknown' };
    next = null; // never hold new claims on a GitHub error (checker FIX)
    ready = { green: [], running: [], firstSeen: [] };
    openTrainCount = -1;
    return null;
  }
  git(['fetch', '-q', 'origin', '+refs/heads/train/*:refs/remotes/origin/train/*'], { soft: true });
  openTrainCount = openPrs.length;
  // every open train PR head without a laptop-e2e success holds alone requests (a status read error counts as none),
  // except heads that can never get one here: older than LQ_TRAIN_MAX_AGE_H or a failed auto-train/* build (as below)
  const heads = openPrs.flatMap((p) => {
    const ct = Number(git(['show', '-s', '--format=%ct', p.sha], { soft: true }));
    if (ct && !(Date.now() / 1000 - ct < TRAIN_MAX_AGE_S)) return [];
    let sts = null;
    try { sts = JSON.parse(gh(['api', `repos/${REPO}/commits/${p.sha}/status`, '--jq', '[.statuses[] | {context, state, updated_at}]']) || '[]'); } catch { /* unknown: holds */ }
    if (sts && trainBuildFailed(sts)) return [];
    const l = sts?.find((s) => s.context === 'laptop-e2e');
    return [{ ...p, laptop: sts ? (l?.state ?? '') : 'unknown', laptopAt: l?.updated_at ?? '' }];
  });
  return { openPrs, heads };
}

/** The claim on sha on the laptop-queue branch (QREF, fetched by listRequests), or null. */
const claimOn = (sha) => parseClaim(git(['show', `${QREF}:claims/${sha}.json`], { soft: true }));
/** Another worker's claim on sha that is live (open and blocking) or done: that worker's name, else ''. */
const otherClaim = (c) => (c && c.worker !== WORKER && (c.done || blocks(c)) ? c.worker : '');

/**
 * laptop-queue-8 A18: train sha finished here (state.trains holds a final state, legacy `result` included) or carries a
 * done claim (any worker), so a '' / pending laptop-e2e on it is a lost post, not a train still to run; false while
 * another worker's live claim is on it (its run owns the status).
 */
function trainLost(sha) {
  const c = claimOn(sha);
  if (c && !c.done && c.worker !== WORKER && blocks(c)) return false;
  return Boolean(trainFinal(state.trains[sha])) || Boolean(c?.done);
}

/**
 * laptop-queue-8 A15, A16 (train 118: the laptop-e2e post and the done push both lost in a GitHub outage): every pass on
 * both workers, right after listRequests, each state.trains entry younger than LQ_TRAIN_MAX_AGE_H gets its verdict
 * posted again while GitHub shows none or pending, and its done claim pushed again while it has not landed (lib
 * trainRepair). gh comes from heads (this pass's open train heads, laptop) or, when heads were not read (null: the
 * desktop, a failed PR list), from one laptopState read per entry not yet posted. Entries posted and synced are
 * skipped without a read. A claim of another worker (live or done) owns the head: no post, no done push.
 */
function syncTrains(heads) {
  if (!TRAIN_RETRY) return;
  const now = Date.now();
  let changed = false;
  for (const [sha, e] of Object.entries(state.trains)) {
    if (e.posted === true && e.doneSynced === true) continue;
    if (e.superseded && e.doneSynced === true) continue; // another worker's done claim owns the head
    if (runningTrains.has(sha)) continue; // its own run posts and pushes done (runTrain finally)
    if (!(now - Date.parse(e.date ?? '') < TRAIN_MAX_AGE_S * 1000)) continue;
    const head = heads?.find((h) => h.sha === sha) ?? null;
    const n = e.n ?? head?.n ?? '';
    const tag = `train ${n || '?'} ${sha.slice(0, 8)}`;
    const c = claimOn(sha);
    const other = otherClaim(c);
    if (other) {
      if (e.superseded !== other) { e.superseded = other; changed = true; log(`${tag}: ${other} holds its claim${c.done ? ' (done)' : ''}, no re-post`); }
      if (c.done && e.doneSynced !== true) { e.doneSynced = true; changed = true; }
      continue;
    }
    let ghState = null;
    if (e.posted !== true) {
      if (heads) ghState = head ? head.laptop : null;
      else {
        // a gh error skips only the post (retried next pass); the done push is git and still goes (checker polish)
        try { ghState = laptopState(sha); } catch (err) { ghState = null; log(`${tag}: status read failed, post retried next pass: ${String(err.message).split('\n')[0]}`); }
      }
    }
    // laptop: heads were read and sha is not an open train head (a legacy entry, a moved head): never posted again
    if (heads && !head && e.posted !== true) { e.posted = true; changed = true; }
    if (['success', 'failure', 'error'].includes(ghState)) { e.posted = true; changed = true; }
    const r = trainRepair(e, ghState, '', DESKTOP ? 'desktop: ' : '');
    if (r.post && postStatus(sha, r.post.state, 'laptop-e2e', r.post.desc)) {
      e.posted = true; changed = true;
      if (head) { head.laptop = r.post.state; head.laptopAt = new Date().toISOString(); }
      bumpTrainEnd(n || '?');
      log(`${tag}: laptop-e2e ${r.post.state} re-posted (lost post)`);
    }
    if (!r.done) continue;
    if (c?.done && c.worker === WORKER) { e.doneSynced = true; changed = true; continue; }
    // guard: the fresh parent may carry another worker's live claim since QREF was read; never push done over it
    if (writeClaims([sha], 'done', n ? `done train ${n}` : `done train ? ${sha.slice(0, 8)}`, { guard: true }) === true) {
      if (!DRY) { e.doneSynced = true; changed = true; }
      log(`${tag}: done claim pushed (lost push)`);
    }
  }
  if (changed) saveState();
}

/**
 * Train heads to run this pass (see above). read = trainHeadsNow() when pass() already read it (laptop), null when that
 * read failed; omitted, it is read here (desktop).
 */
function pendingTrains(read = trainHeadsNow()) {
  const out = [];
  const maxAge = TRAIN_MAX_AGE_S;
  if (!read) return out;
  const { openPrs, heads } = read;
  const open = new Set(openPrs.map((p) => p.sha));
  aloneHold = trainHold(heads, TRAIN_RETRY ? trainLost : () => false);
  // laptop-queue-7 A12: the newest train end any worker posted (a train run, a carry, a train-rerun pass), never back
  const end = lastTrainEndFrom(heads, lastTrainEnd);
  if (end !== lastTrainEnd && Number.isFinite(end)) {
    lastTrainEnd = end;
    lastTrainN = heads.find((h) => Date.parse(h.laptopAt ?? '') === end)?.n ?? '?';
    state.lastTrainEnd = end;
    state.lastTrainN = lastTrainN;
    saveState();
  }
  // after the status reads: the releasing case needs each head's laptop-e2e success time (lib releasingTrain); readyNow
  // first, in the same pass, so sparePass and the alone check never read the previous pass's candidates
  if (!DESKTOP) { readyNow(openPrs); next = nextTrainNow(openPrs, heads); }
  for (const line of git(['ls-remote', 'origin', 'refs/heads/train/*'], { soft: true }).split('\n')) {
    const m = /^([0-9a-f]{40})\trefs\/heads\/train\/(\S+)$/.exec(line);
    if (!m || state.trains[m[1]] || !open.has(m[1])) continue;
    // merge-train `build` opens the PR before it pushes the version commit: run only the version head (versionSubject)
    // or a head moved past it (a fix on top: lib versionAt finds the version commit; BRIEF A7)
    const subject = git(['show', '-s', '--format=%s', m[1]], { soft: true });
    const chain = isVersionHead(subject, m[2]) ? [] : trainChain(m[1], m[2]);
    if (!chain) continue;
    const age = Date.now() / 1000 - Number(git(['show', '-s', '--format=%ct', m[1]], { soft: true }));
    if (!(age < maxAge)) continue;
    try { git(['merge-base', '--is-ancestor', m[1], 'origin/master']); continue; } catch { /* not merged */ }
    // the other worker's open claim (or a done one) keeps it off; origin/laptop-queue was fetched by listRequests
    if (!claimed.has(m[1]) && blocks(parseClaim(git(['show', `origin/laptop-queue:claims/${m[1]}.json`], { soft: true })))) continue;
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
    // a moved head with no laptop-e2e status: carry a docs-only verdict, wait on a live docs-only run, or run (sharded)
    if (st === '' && chain.length && TRAIN_CARRY && carryMoved(m[1], m[2], chain) !== 'run') continue;
    if (st === '' || (st === 'pending' && !claimed.has(m[1]))) out.push({ sha: m[1], n: m[2], stale: st === 'pending', ageMs: age * 1000 });
  }
  return sortTrains(out); // ls-remote order is text order; the lowest train runs first (overlap plan section 3)
}

/** The open train/<n> PRs as a Map n -> head sha, or null when the listing failed (the void-train watch then waits). */
function openTrainHeads() {
  try {
    const rows = JSON.parse(gh(['pr', 'list', '-R', REPO, '--state', 'open', '--limit', '200', '--json', 'headRefName,headRefOid', '--jq', '[.[] | select(.headRefName | startswith("train/")) | {n: (.headRefName | ltrimstr("train/")), sha: .headRefOid}]']) || '[]');
    return new Map(rows.map((r) => [String(r.n), r.sha]));
  } catch { return null; }
}

const followMemo = new Map();
/**
 * True when head is a descendant of a running train's sha over a carry-safe delta (lib carryFiles; BRIEF A8): the run
 * on sha still tests head. Fetches train/<n> once when head is not here yet; a git error is false (not memoised).
 */
function followsTrain(sha, n, head) {
  if (!TRAIN_CARRY || !head || head === sha) return false;
  const key = `${sha}>${head}`;
  if (followMemo.has(key)) return followMemo.get(key);
  if (!git(['rev-parse', '-q', '--verify', `${head}^{commit}`], { soft: true })) {
    git(['fetch', '-q', 'origin', `+refs/heads/train/${n}:refs/remotes/origin/train/${n}`], { soft: true });
  }
  try { git(['merge-base', '--is-ancestor', sha, head]); } catch { return false; }
  const files = filesBetween(sha, head);
  if (!files) return false;
  const r = carryFiles(files);
  followMemo.set(key, r);
  return r;
}

/**
 * The open train heads the void watch reads for a run on train.sha: train n's head counts as train.sha while it is a
 * docs-only descendant (followsTrain); null when the listing failed.
 */
function voidHeads(train) {
  const heads = openTrainHeads();
  if (!heads) return null;
  const set = new Set(heads.values());
  if (followsTrain(train.sha, train.n, heads.get(String(train.n)))) set.add(train.sha);
  return set;
}

/**
 * After a train pass: train n's current head, when it moved to a docs-only descendant of the run's sha and has no
 * laptop-e2e status yet, gets the carried success too (BRIEF A8).
 */
function carryOnto(train) {
  const head = openTrainHeads()?.get(String(train.n));
  if (!head || !followsTrain(train.sha, train.n, head)) return;
  let st;
  try { st = laptopState(head); } catch (e) { log(`train ${train.n} ${head.slice(0, 8)}: status read failed, no carry: ${String(e.message).split('\n')[0]}`); return; }
  if (st !== '') return;
  if (!postStatus(head, 'success', 'laptop-e2e', carryDesc(train.sha))) return; // nothing recorded: pendingTrains carries it
  bumpTrainEnd(train.n);
  state.trains[head] = { result: 'carried', from: train.sha, n: train.n, state: 'success', desc: carryDesc(train.sha), posted: true, doneSynced: true, date: new Date().toISOString() };
  log(`train ${train.n} ${head.slice(0, 8)}: carried from ${train.sha.slice(0, 8)}, docs-only delta`);
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

/**
 * Promise.all over a multi-slot run's children: when one rejects, every ctl is cut at once (no live child keeps a
 * worktree whose lock the finally frees), and the first error is thrown once all have settled (checker FIX b).
 */
async function settleAll(promises, ctls) {
  const res = await Promise.allSettled(promises.map((p) => p.catch((e) => { for (const c of ctls) cut(c, 'error'); throw e; })));
  const bad = res.find((x) => x.status === 'rejected');
  if (bad) throw bad.reason;
  return res.map((x) => x.value);
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
      if (breakIfStale(port, have)) continue;
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
 * Waste audit 2026-10-25 (4191 blocked by heavy.lock 21:57 to 01:20+): breaks the slot lock when it holds `text` and
 * names a pid that is dead on this host, the file reading `text` again (lib slotLockDecision; a lock with no pid or a
 * live pid is respected). Breaks as heavy-lock.mjs tryTake does: rename to <lock>.stale.<pid>, and when the renamed text
 * is not `text` (a fresh taker won the race) copy it back. Logged; --dry-run only logs. true when broken.
 */
function breakIfStale(port, text) {
  const lock = SLOTS[port].lock;
  const read = () => { try { return fs.readFileSync(lock, 'utf8').trim(); } catch { return null; } };
  const d = slotLockDecision(text, read(), { host: os.hostname(), alive: pidAlive });
  if (d.action !== 'break') return false;
  if (DRY) { log(`dry-run: ${port} ${path.basename(lock)} is stale (${d.why}), would break: ${text}`); return false; }
  const stale = staleName(lock);
  try { fs.renameSync(lock, stale); } catch { return false; }
  try {
    let moved = null;
    try { moved = fs.readFileSync(stale, 'utf8').trim(); } catch { /* gone */ }
    if (moved !== text) {
      try { fs.copyFileSync(stale, lock, fs.constants.COPYFILE_EXCL); } catch { /* a third taker got there */ }
      return false;
    }
    log(`${port} ${path.basename(lock)} is stale (${d.why}): broke "${text}"`);
    return true;
  } finally { fs.rmSync(stale, { force: true }); }
}

/**
 * The desktop slot gate's lock check: true while the slot lock exists after a stale break (breakIfStale). The holder
 * text is logged once per change ("4191 held by heavy.lock: <text>"), so a long block names its holder.
 */
const holderLogged = {}; // port -> the holder text last logged
function slotLockHeld(port) {
  const lock = SLOTS[port].lock;
  const read = () => { try { return fs.readFileSync(lock, 'utf8').trim(); } catch { return null; } };
  let text = read();
  if (text !== null && breakIfStale(port, text)) text = read();
  if (text === null) { delete holderLogged[port]; return false; }
  if (holderLogged[port] !== text) { holderLogged[port] = text; log(`${port} held by ${path.basename(lock)}: ${text}`); }
  return true;
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
async function e2e(port, suites, jobs, logFile, ctl, { env: extra = {}, timeoutMs } = {}) {
  freePort(port);
  const env = { E2E_PORT: port, E2E_JOBS: String(jobs), E2E_GPU: '1', E2E_SUITE_TIMEOUT: '900', E2E_QUARANTINE_FILE: file('quarantine.json'), ...extra };
  const code = await sh(`node scripts/run-e2e.mjs ${suites.join(' ')}`, { cwd: SLOTS[port].dir, env, logFile, ctl, ...(timeoutMs ? { timeoutMs } : {}) });
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
 * Reruns each failed (non-quarantined) suite once alone; a pass is a flake (state.flakes, counted against the suite's
 * flake budget, see updateBudget). Mutates result.suites, returns flake names. Replaces "flake stands" (process audit
 * 2026-10-24): a suite that keeps flaking goes over budget and into quarantine with an owner and an expiry instead.
 */
async function rerunFlakes(result, slotOf, job, runDir, fallback = PORTS[0], ctl) {
  const flakes = [];
  for (const x of result.suites.filter((s) => !s.ok && !s.flaky && !s.report)) {
    const key = assertKey(failureExcerpt(sectionOf(runDir, x.s)).assert);
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

/** Pushes alerts/<ts>-<worker>-fixjob-<suite>.json for a blocking suite (Q30; the orchestrator's cron opens the fix job). */
function pushFixJob(suite, entry) {
  const at = new Date().toISOString();
  const rel = `alerts/${at.replace(/[-:]/g, '').replace(/\.\d+/, '')}-${WORKER}-fixjob-${suite.replace(/[^\w.-]/g, '_')}.json`; // no ':' in a path (e2e-sectorops:6)
  if (DRY) { log(`dry-run: would push ${rel}`); return true; }
  const body = `${JSON.stringify({ suite, owner: entry.owner, last: entry.last, since: entry.since, reason: entry.reason, worker: WORKER }, null, 2)}
`;
  if (pushFile(rel, body, `fix job for ${suite}`)) { log(`blocking: alert pushed ${rel}`); return true; }
  log(`blocking: alert push failed for ${suite}, retried at the next budget update`);
  return false;
}

/**
 * Counts this result's suite runs, prunes state.flakes and state.knownFlaky to the budget window, quarantines
 * over-budget suites for 48 h in quarantine.json (run-e2e reads it through E2E_QUARANTINE_FILE) or, over budget again
 * within REPEAT_DAYS of the last auto quarantine, marks them blocking and pushes a fix-job alert (Q30), writes
 * flake-budget.md, and returns the summary of the suites this result flaked or failed as KNOWN FLAKY plus any new
 * BLOCKING lines ('' when none) for the PR comment, and whether it recorded a new flake.
 */
function updateBudget(result, sha = '') {
  const now = Date.now();
  const inWindow = (x) => now - Date.parse(x.date) < FLAKE_BUDGET_DAYS * 86400_000;
  state.suiteRuns = countRuns(state.suiteRuns, result.suites.filter((x) => !x.report && !x.kept).map((x) => x.s), now);
  state.flakes = state.flakes.filter(inWindow);
  for (const x of result.suites) if (!x.ok && x.flaky) state.knownFlaky.push({ suite: x.s, sha, date: new Date(now).toISOString() });
  state.knownFlaky = state.knownFlaky.filter(inWindow);
  for (const [s, b] of Object.entries(state.blocking)) if (!(now - Date.parse(b?.since) < REPEAT_DAYS * 86400_000)) delete state.blocking[s];
  let repo = { owners: {}, quarantine: [] };
  try {
    const j = JSON.parse(fs.readFileSync(path.join(HERE, 'scripts/e2e-quarantine.json'), 'utf8'));
    repo = { owners: j?.owners && typeof j.owners === 'object' ? j.owners : {}, quarantine: Array.isArray(j?.quarantine) ? j.quarantine : [] };
  } catch { /* no file or unreadable: nothing committed */ }
  const read = readJson('quarantine.json', []);
  const own = ownQuarantine(read, now, DESKTOP); // F48: the desktop keeps no automatic list (lib ownQuarantine)
  const budgetRows = (quarantine) => flakeBudget(state.flakes, state.suiteRuns, now, undefined, undefined, state.quarantineStarts, { known: state.knownFlaky, quarantine, blocking: Object.keys(state.blocking) });
  const { added, blocking } = DESKTOP ? { added: [], blocking: [] } : autoQuarantine(budgetRows([...repo.quarantine, ...own]), [repo.quarantine, own], repo.owners, now, undefined, state.quarantineStarts);
  for (const q of added) state.quarantineStarts[q.suite] = new Date(now).toISOString();
  for (const q of added) log(`quarantine ${q.suite} until ${q.expiry} (owner ${q.owner}): ${q.reason}`);
  const fresh = [];
  for (const x of blocking) {
    if (state.blocking[x.suite]) continue; // once per suite per REPEAT_DAYS (expired entries were dropped above)
    state.blocking[x.suite] = { since: new Date(now).toISOString(), owner: x.owner, last: x.last, reason: x.reason, alerted: false };
    log(`blocking ${x.suite} (owner ${x.owner}): ${x.reason}`);
    fresh.push(`BLOCKING: ${x.suite} needs a fix job (owner ${x.owner})`);
  }
  for (const [s, b] of Object.entries(state.blocking)) if (!b.alerted) b.alerted = pushFixJob(s, b);
  const quarantine = [...repo.quarantine, ...own, ...added];
  const rows = budgetRows(quarantine);
  const extra = { blocking: state.blocking, suiteRuns: state.suiteRuns };
  writeJson('quarantine.json', [...own, ...added]);
  if (!DRY) { try { fs.writeFileSync(file('flake-budget.md'), `${[flakeSummary(rows, quarantine, repo.owners, now, extra) || 'No flakes in the window.', slowSummary(state.slow)].filter(Boolean).join('\n\n')}
`); } catch { /* summary only */ } }
  saveState();
  const touched = new Set([...(result.flakes ?? []), ...result.suites.filter((x) => !x.ok && x.flaky).map((x) => x.s)]);
  const mine = rows.filter((r) => touched.has(r.suite));
  for (const s of touched) if (!mine.some((r) => r.suite === s) && quarantined(quarantine, s, now)) mine.push({ suite: s, runs: 0, flakes: 0, known: 0, rate: 0, over: false });
  const summary = [fresh.join('\n'), flakeSummary(mine, quarantine, repo.owners, now, extra)].filter(Boolean).join('\n\n');
  return { summary, fresh: (result.flakes ?? []).length > 0 };
}

/**
 * laptop-queue-11 F35: the SLOW lines (#568's run-e2e: a passing suite over 75% of its kill limit) in a finished run's
 * logs (the last run-e2e block of each, flake reruns too; the worst per suite) go on result.slow (lib describe appends
 * "; slow: ..." to the status) and into state.slow (pruned to the budget window; flake-budget.md lists them). No SLOW
 * line (master today): result.slow = [], nothing changes.
 */
function noteSlow(job, result, runDir) {
  const worst = new Map();
  let names = [];
  try { names = fs.readdirSync(runDir).filter((f) => f.endsWith('.log')); } catch { /* no logs */ }
  for (const f of names) {
    let text = '';
    try { text = fs.readFileSync(path.join(runDir, f), 'utf8').split(/^\$ node scripts\/run-e2e.mjs /m).pop() ?? ''; } catch { continue; }
    for (const x of slowLines(text)) if (!(worst.get(x.s)?.sec >= x.sec)) worst.set(x.s, x);
  }
  result.slow = [...worst.values()];
  state.slow = slowRecord(state.slow, result.slow, { sha: job.sha, ref: job.ref, now: Date.now() });
  if (result.slow.length) log(`${job.sha.slice(0, 8)}: slow ${result.slow.map((x) => `${x.s} ${x.sec}/${x.limit}s`).join(', ')}`);
}

/**
 * Posts the verdict on ctx (a context or a list: an affected request posts affected-e2e too), comments a failure, folds
 * the times. handedOff (desktop): a failure whose laptop rerun is queued posts pending with this description instead,
 * and no failure comment (the laptop rerun's verdict is the final one).
 */
function finish(job, ctx, result, runDir, prNumber, { handedOff = '' } = {}) {
  noteSlow(job, result, runDir); // laptop-queue-11 F35: result.slow for describe, state.slow for flake-budget.md
  const bad = result.suites.filter((s) => !s.ok && !s.flaky && !s.report);
  const ok = result.suites.length > 0 && bad.length === 0;
  // laptop-queue-8 A10: "; K kept" when passes kept from a run a train preempted count in this verdict
  const full = `${DESKTOP ? 'desktop: ' : ''}${result.suites.length ? describe(result) : 'no result parsed, see log'}${result.kept > 0 ? `; ${result.kept} kept` : ''}`;
  const desc = full.length > 140 ? `${full.slice(0, 137)}...` : full; // GitHub rejects a status description over 140
  const late = !ok && handedOff;
  // laptop-queue-8 A15: whether every post landed and what was posted (runTrain records them; syncTrains re-posts)
  result.posted = true;
  result.desc = late ? handedOff : desc;
  for (const c of [ctx].flat()) if (!postStatus(job.sha, ok ? 'success' : late ? 'pending' : 'failure', c, late ? handedOff : desc)) result.posted = false; // an affected request: also affected-e2e
  const { summary: budget, fresh } = updateBudget(result, job.sha);
  if (late) { /* the laptop rerun comments its own failure */ } else if (!ok && prNumber && !DRY) postComment(prNumber, failureComment(job, result, runDir) + (budget ? `

${budget}` : ''));
  // a pass comments only when it recorded a new flake, not on every quarantined failure (e2e-pad would comment every train)
  else if (fresh && budget && prNumber && !DRY) postComment(prNumber, `laptop-e2e passed on ${job.sha.slice(0, 8)} (${job.ref}) with flakes.

${budget}`);
  times = mergeTimes(times, result.suites);
  writeJson('times.json', times);
  return ok;
}

// ---------- the runs ----------

const claimed = new Set();
/** Requests claimed or running here (id -> request), for the duplicate check. */
const activeReqs = new Map();
/** laptop-queue-8 A6: running id -> the newer request that stops it (lib supersededRunning, set each pass; cutShort). */
let runningSup = new Map();
/** A request run's share of its expected wall (runRequest's watch writes it; lib supersededRunning reads it). */
const progressById = new Map();
/** Alone requests a train preempted (cutShort): they go first among alone requests (lib pick queue.front) until claimed again. */
const preemptedAlone = new Set();
/** Train heads running here, for the heartbeat. */
const runningTrains = new Set();
let lastBeat = Date.now();
/** Request ids / train shas running here whose claim another worker now holds (heartbeat): id -> worker; the run stops (cutShort 'taken'). */
const takenBy = new Map();
/**
 * Both workers: refresh the claims of everything running here every HEARTBEAT_MS (one push), so the desktop gate sees a
 * live laptop and a claim whose heartbeat stopped goes stale after LQ_CLAIM_BEATS beats (laptop-queue-8 A17). A failed
 * push retries every loop (lastBeat moves only on a landed push). An id another worker now holds (its claim went stale
 * here, e.g. a long push outage, and was taken over) stops its run here: no status, no done claim (checker FIX 1).
 */
function heartbeat() {
  if (DRY || !(HEARTBEAT_MS > 0)) return;
  const ids = [...activeReqs.keys(), ...runningTrains].filter((id) => !takenBy.has(id));
  if (ids.length === 0) { lastBeat = Date.now(); return; }
  if (Date.now() - lastBeat < HEARTBEAT_MS) return;
  const taken = new Map();
  const res = writeClaims(ids, 'claim', `heartbeat ${ids.length} run(s)`, { taken });
  for (const [id, worker] of taken) { takenBy.set(id, worker); log(`${id}: claim taken by ${worker}, stopped`); }
  if (res === true) lastBeat = Date.now();
  else if (res !== 'blocked') log(`heartbeat push failed for ${ids.length} run(s), retried next loop`);
}
/** The train heads the last pass saw pending (desktop: those it may take); trainsNow() drops the ones claimed since. */
let pendingNow = [];
const trainsNow = () => pendingNow.filter((t) => !claimed.has(t.sha));

/**
 * laptop-queue-8 A15: posts a train's final laptop-e2e and records it in state.trains with what syncTrains needs to
 * retry a lost post or done push ({ ...extra, n, state, desc, posted, doneSynced }).
 */
function trainVerdict(train, st, desc, extra) {
  const posted = postStatus(train.sha, st, 'laptop-e2e', desc);
  state.trains[train.sha] = { ...extra, n: train.n, state: st, desc, posted, doneSynced: false, date: new Date().toISOString() };
}

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
  let taken = ''; // heartbeat: another worker now holds this train's claim (takenBy); stop, post nothing, push no done
  const watch = DRY ? null : setInterval(() => {
    if (voided) return;
    if (takenBy.has(train.sha)) {
      taken = takenBy.get(train.sha);
      voided = true;
      for (const c of Object.values(ctls)) cut(c, 'taken');
      return;
    }
    misses = voidMisses(misses, train.sha, voidHeads(train)); // a docs-only descendant head is not a miss (BRIEF A8)
    if (misses < VOID_MISSES) return;
    voided = true;
    log(`train ${train.n} ${train.sha.slice(0, 8)}: no longer an open train PR head (closed, voided or rebuilt), run stopped`);
    for (const c of Object.values(ctls)) cut(c, 'closed');
  }, TRAIN_VOID_POLL_MS);
  const closedEnd = () => {
    if (taken) { log(`train ${train.n} ${train.sha.slice(0, 8)}: claim taken by ${taken}, run stopped (no status, no done)`); claimed.delete(train.sha); return; }
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
    const prep = await settleAll(ports.map((p) => prepare(p, train.sha, path.join(runDir, `${p}.log`), undefined, ctls[p])), Object.values(ctls));
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
      trainVerdict(train, nosha ? 'error' : 'failure', nosha ? 'sha not found' : 'build failed', { result: nosha ? 'nosha' : 'build' });
      return;
    }
    const list = cmd('node', ['scripts/run-e2e.mjs', '--list'], { cwd: SLOTS[ports[0]].dir }).split('\n').map((x) => x.trim()).filter(Boolean);
    const bins = shard(list, times, ports.length);
    bins.forEach((b, i) => log(`bin ${ports[i]}: ${b.suites.length} suites, weight ${Math.round(b.weight)} s`));
    // the expected e2e wall (heaviest shard at TRAIN_JOBS) restamps the pending status: auto-train polls every 30 s
    // once this status is older than it (laptop-queue-3; auto-train's laptopLate)
    const expS = Math.max(...bins.filter((b) => b.suites.length).map((b) => expectedWallS(b.suites, times, TRAIN_JOBS)));
    if (Number.isFinite(expS)) postStatus(train.sha, 'pending', 'laptop-e2e', `${DESKTOP ? 'desktop: ' : ''}${ports.length > 1 ? 'sharded' : 'unsharded on'} ${ports.join('+')}, expect ~${Math.round(expS)} s`);
    const t0 = Date.now();
    const runs = await settleAll(ports.map((p, i) => e2e(p, bins[i].suites, TRAIN_JOBS, path.join(runDir, `${p}.log`), ctls[p])), Object.values(ctls));
    if (voided) return closedEnd();
    const prNumber = Number(gh(['pr', 'list', '-R', REPO, '--head', `train/${train.n}`, '--json', 'number', '--jq', '.[0].number'], { soft: true })) || 0;
    // a shard that died before its summary (or lost suites) is a failure, never a partial success
    const broken = ports.findIndex((p, i) => !runComplete(runs[i], bins[i].suites.length, true));
    if (broken >= 0) {
      const p = ports[broken];
      const r = runs[broken];
      log(`train ${train.n}: shard ${p} incomplete (exit ${r.code}, ${r.suites.length}/${bins[broken].suites.length} suites, summary ${r.complete ? 'seen' : 'missing'})`);
      trainVerdict(train, 'failure', `shard ${p} gave no result`, { result: 'incomplete', shard: p });
      bumpTrainEnd(train.n);
      if (prNumber) postComment(prNumber, `laptop-e2e failed on ${train.sha.slice(0, 8)} (${job.ref}): shard ${p} gave no result (exit ${r.code}, ${r.suites.length}/${bins[broken].suites.length} suites).\nLog on the ${WORKER}: ${path.join(runDir, `${p}.log`)}\n\`\`\`\n${capTail(r.tail40 || '(empty log)', 8_000)}\n\`\`\``);
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
    bumpTrainEnd(train.n);
    state.trains[train.sha] = { result: ok ? 'success' : 'failure', wall: result.wall, n: train.n, state: ok ? 'success' : 'failure', desc: result.desc, posted: result.posted, doneSynced: false, date: new Date().toISOString() };
    if (ok && !DRY) carryOnto(train); // the head moved mid-run to a docs-only descendant: it carries this pass (BRIEF A8)
    saveState();
    try { await runVisual(train, ports, locks, ctls[ports[0]], runDir, prNumber, ok); } catch (e) { log(`train ${train.n} visual-gate service error: ${e.stack ?? e.message}`); postStatus(train.sha, 'error', VISUAL_CONTEXT, 'service error, see log'); }
  } finally {
    if (watch) clearInterval(watch);
    // only slots this train locked: an unheld one may be serving a manual run
    for (const p of ports) { if (locks[p]) { releaseLock(p, locks[p]); freePort(p); } }
    saveState();
    takenBy.delete(train.sha);
    if (state.trains[train.sha] && !taken) { state.trains[train.sha].doneSynced = writeClaims([train.sha], 'done', `done train ${train.n}`) === true && !DRY; saveState(); }
    log(`train ${train.n}: done`);
  }
}

/**
 * The visual-gate post-step (visual.mjs visualPlan; visual-gate BRIEF A12, A19, A20): the other slots go back to the
 * queue first (the TRAIN_SOLO move above; the finally then skips them), e2e-visual runs on ports[0], its block in
 * visual.log sets the `visual-gate` status, and a flagged run comments on the train PR.
 */
async function runVisual(train, ports, locks, ctl, runDir, prNumber, trainOk) {
  const plan = visualPlan({ enabled: process.env.LQ_VISUAL !== '0', desktop: DESKTOP, hasScript: fs.existsSync(path.join(SLOTS[ports[0]].dir, 'scripts', 'e2e-visual.mjs')), trainOk, ports });
  if (!plan.run) {
    if (plan.status) postStatus(train.sha, plan.status.state, VISUAL_CONTEXT, plan.status.description);
    return;
  }
  for (const p of plan.release) {
    if (locks[p]) releaseLock(p, locks[p]);
    freePort(p);
    locks[p] = null;
    busy[p] = null;
  }
  postStatus(train.sha, 'pending', VISUAL_CONTEXT, `running on ${plan.port}`);
  const logFile = path.join(runDir, 'visual.log');
  const run = await e2e(plan.port, [VISUAL_SUITE], 1, logFile, ctl, { env: visualEnv(train), timeoutMs: VISUAL_SH_TIMEOUT_MS });
  let text = '';
  // this run's part only (as e2e): a log appended by an earlier try on the same head must not lend its block
  try { text = fs.readFileSync(logFile, 'utf8').split(/^\$ node scripts\/run-e2e.mjs /m).pop() ?? ''; } catch { /* no log */ }
  const v = visualVerdict(text, { code: run.code, timedOut: run.code === 124 });
  postStatus(train.sha, v.state, VISUAL_CONTEXT, v.description);
  const body = visualComment(v, { sha: train.sha, n: train.n });
  if (body && prNumber && !DRY) postComment(prNumber, body);
  log(`train ${train.n} ${train.sha.slice(0, 8)}: visual-gate ${v.state}: ${v.description}`);
}

async function runRequest(r, port, pair = null) {
  const runDir = path.join(STATE_DIR, 'runs', r.id);
  const ctx = contextName(r.kind, r.set, r.suites, r.trainRerun);
  // an auto affected request (lib AFFECTED_REQUESTER) posts each verdict on affected-e2e too (the PR head's own check)
  const verdictCtx = r.requester === AFFECTED_REQUESTER ? [ctx, AFFECTED_CTX] : [ctx];
  const verdict = (st, desc) => { for (const c of verdictCtx) postStatus(r.sha, st, c, desc); };
  const job = { sha: r.sha, ref: r.branch || r.sha.slice(0, 8) };
  log(`${r.id}: ${r.kind} on ${(pair ?? [port]).join('+')}`);
  let ports = r.kind === 'alone' ? PORTS : [port];
  const locks = {};
  // yield: a pending train head takes the slot back until the suites / steps start (lib yieldTo)
  let yielded = null;
  // cut short: withdrawn at any point, or (a pr request in its suites) preempted by a pending train (lib cutShort)
  const ctl = { child: null, why: '', by: null };
  // laptop-queue-7 A10: a train rerun lib pick put on both slots (pair) runs its parts split over them at E2E_JOBS=1,
  // one ctl per slot (a cut kills both trees); a slot that fails its lock or prepare goes back to the queue and every
  // part runs on the other slot alone, as a one-slot rerun
  const ctls = { [port]: ctl };
  if (pair?.length > 1) {
    const two = r.kind === 'pr' && r.trainRerun && shard(suiteParts(r.suites, times, planParts(r.sha)), times, pair.length).every((b) => b.suites.length);
    if (two) { ports = [...pair]; for (const p of pair) ctls[p] ??= { child: null, why: '', by: null }; }
    else for (const p of pair) if (p !== port) busy[p] = null; // nothing to split: the other slot takes queue work again
  }
  const dropSlot = (p, why) => {
    if (locks[p]) releaseLock(p, locks[p]);
    locks[p] = null;
    freePort(p);
    busy[p] = null; // takes queue work again (dispatch marked it busy with this run)
    ports = ports.filter((x) => x !== p);
    port = ports[0];
    log(`${r.id}: ${p} ${why}, rerun on ${port} alone`);
    if (posted) postStatus(r.sha, 'pending', ctx, 'running');
  };
  let started = false;
  let startedAt = NaN; // an alone run's steps start: under ALONE_PREEMPT_MIN a pending train still cuts it (lib cutShort)
  let yieldedSteps = false; // an alone run gave the slots to a train between steps (not done)
  let progress = () => NaN; // a pr run's share of its expected wall: past PREEMPT_MAX_PROGRESS it is never cut
  // desktop: whole-machine CPU % over each watch tick once the suites start (in-process os.cpus() deltas, no PowerShell;
  // every process counts here, BelowNormal ones too, since this is load the run actually shared the machine with); the
  // median goes into a handed-off failure's status (lib desktopFailDesc, "; desktop cpu>90%")
  const cpuSamples = [];
  let cpuPrev = null;
  const watch = DRY ? null : setInterval(() => {
    if (DESKTOP && started) {
      const now = os.cpus();
      const v = cpuTotalPct(cpuPrev, now);
      if (Number.isFinite(v)) cpuSamples.push(v);
      cpuPrev = now;
    }
    const trains = trainsNow();
    const others = [...activeReqs.values()].filter((a) => a.id !== r.id);
    const due = r.kind === 'alone' && ALONE_GAP && aloneGapOpen(state.aloneDue, r.id, lastTrainEnd); // started in its gap (A12)
    progressById.set(r.id, progress());
    const why = cutShort(r, { taken: takenBy.get(r.id) ?? '', withdrawn: withdrawnIds.has(r.id), superseded: runningSup.get(r.id)?.id ?? '', trains, started, others, startedAt, now: Date.now(), progress: progress(), realOpen: spare && realOpenNow(), due });
    if (why && !ctl.why) { ctl.by = why === 'superseded' ? runningSup.get(r.id) : trains[0] ?? null; for (const c of Object.values(ctls)) cut(c, why); }
  }, 5_000);
  const stop = () => Boolean(ctl.why) || Boolean(yielded ??= yieldTo(r, false, trainsNow()));
  let posted = false;
  const spare = r.requester === SPARE_REQUESTER;
  // spare work yielding or cut by a train or a waiting real request is done, never queued again (laptop-queue-5)
  const spareDone = (by) => {
    log(`${r.id}: spare work stopped for ${by}: done, not queued again`);
    if (posted) postStatus(r.sha, 'error', ctx, `stopped for ${by} (spare work, not rerun)`);
    state.done[r.id] = { result: 'spare-cut', date: new Date().toISOString() };
    if (state.aloneSteps) delete state.aloneSteps[r.id];
  };
  const giveBack = () => {
    if (spare) return spareDone(`train ${yielded.n}`);
    log(`${r.id}: yields to train ${yielded.n}`);
    if (posted) postStatus(r.sha, 'pending', ctx, `queued, yielded to train ${yielded.n}`);
    writeClaims([r.id], 'release', `release ${r.id} (yields to train ${yielded.n})`);
    claimed.delete(r.id);
  };
  // laptop-queue-8 A10: the passes this request already holds (r.kept on this sha, lib keptPlan) and, on a train
  // preempt, the passed suites of the cut run written back to the request file (same id) for the next run, either worker
  let keptNow = [];
  const keepFinished = () => {
    const passes = new Map(keptNow.map((k) => [k.s, k]));
    let lines = 0;
    for (const p of ports) {
      let text = '';
      try { text = fs.readFileSync(path.join(runDir, `${p}.log`), 'utf8'); } catch { continue; }
      // log order: a later fail of the same suite (the log appends across tries) drops an earlier pass
      for (const x of finishedSuites(text)) { lines++; if (x.ok && !x.report) passes.set(x.s, { s: x.s, sec: x.sec }); else passes.delete(x.s); }
    }
    if (passes.size === 0) { log(`${r.id}: keeps no finished suite${lines ? '' : ' (no result lines; a head before laptop-queue-8 prints none at E2E_JOBS=1)'}`); return; }
    let fresh = r;
    try { fresh = JSON.parse(git(['show', `origin/laptop-queue:requests/${r.id}.json`])); } catch { /* the listed copy */ }
    const next = { ...fresh, kept: { sha: r.sha, suites: [...passes.values()] } };
    if (DRY) { log(`dry-run: ${r.id}: would keep ${passes.size} finished suite(s)`); return; }
    if (pushFile(`requests/${r.id}.json`, `${JSON.stringify(next, null, 2)}\n`, `kept ${r.id}`, { mustExist: true })) log(`${r.id}: keeps ${passes.size} finished suite(s)`);
    else log(`${r.id}: kept push failed, the next run reruns all`);
  };
  const cutEnd = () => {
    if (ctl.why === 'taken') {
      // checker FIX 1: another worker holds the claim now (heartbeat); its run owns the head: no status, no done claim
      log(`${r.id}: run stopped, ${takenBy.get(r.id) ?? 'the other worker'} holds the claim`);
      claimed.delete(r.id);
      return;
    }
    if (ctl.why === 'withdrawn') {
      log(`${r.id}: withdrawn by the requester, run stopped`);
      for (const c of verdictCtx) if (posted || c === AFFECTED_CTX) postStatus(r.sha, 'error', c, 'withdrawn by the requester, run stopped');
      state.done[r.id] = { result: 'withdrawn', date: new Date().toISOString() };
      if (state.aloneSteps) delete state.aloneSteps[r.id];
      return;
    }
    if (ctl.why === 'superseded') {
      // laptop-queue-8 A7: a newer head of the same PR is queued; the old head's error never blocks (train-ready reads
      // the current head)
      const by = ctl.by?.id ?? '?';
      const desc = `stopped: new head ${String(ctl.by?.sha ?? '?').slice(0, 8)} queued (${by})`;
      log(`${r.id}: stopped, new head ${String(ctl.by?.sha ?? '?').slice(0, 8)} queued (${by})`);
      for (const c of verdictCtx) if (posted || c === AFFECTED_CTX) postStatus(r.sha, 'error', c, desc.length > 140 ? `${desc.slice(0, 137)}...` : desc);
      state.done[r.id] = { result: 'superseded-run', by, date: new Date().toISOString() };
      return;
    }
    const n = ctl.by?.n ?? '?';
    if (spare) return spareDone(ctl.why === 'real' ? 'a waiting real request' : `train ${n}`);
    log(`${r.id}: preempted by train ${n}, queued again${r.kind === 'alone' ? ' (head of the alone queue)' : ''}`);
    if (r.kind === 'alone') preemptedAlone.add(r.id);
    if (KEEP_FINISHED && r.kind === 'pr' && !r.trainRerun && started) keepFinished();
    if (posted) postStatus(r.sha, 'pending', ctx, `queued, preempted by train ${n}`);
    writeClaims([r.id], 'release', `release ${r.id} (preempted by train ${n})`);
    claimed.delete(r.id);
  };
  try {
    if (r.kind !== 'alone' && ports.length > 1) {
      // a sharded rerun never waits for its second slot: one try each; none taken: wait on the picked slot, as today
      for (const p of ports) locks[p] = await takeLock(p, r.id, r.sha, { once: true });
      const held = ports.filter((p) => locks[p]);
      for (const p of [...ports]) if (!locks[p] && (held.length || p !== port)) dropSlot(p, 'lock held');
    }
    for (const p of ports) {
      locks[p] ||= await takeLock(p, r.id, r.sha, { stop });
      if (!locks[p] || stop()) return ctl.why ? cutEnd() : giveBack();
    }
    // fresh `at`: a long lock wait never looks like a dead worker; if the other worker took it over meanwhile, back off
    if (writeClaims([r.id], 'claim', `claim ${r.id} (lock taken)`) === 'blocked') {
      log(`${r.id}: taken over by the other worker during the lock wait, dropped`);
      claimed.delete(r.id);
      return;
    }
    postStatus(r.sha, 'pending', ctx, r.kind !== 'alone' && ports.length > 1 ? `rerun sharded on ${ports.join('+')}` : 'running');
    posted = true;
    // laptop-queue-8 A10: a pr request a train preempted runs only the suites it has not passed on this sha (lib keptPlan);
    // every suite kept: no prepare (fetch, npm ci, build) and no e2e call, the verdict comes from the kept passes
    const plan = r.kind === 'pr' && KEEP_FINISHED ? keptPlan(r, r.sha, times) : { kept: [], rest: r.suites };
    const allKept = r.kind === 'pr' && plan.rest.length === 0;
    let prep;
    if (allKept) prep = 'ok';
    else if (r.kind !== 'alone' && ports.length > 1) {
      const tried = [...ports];
      const preps = await settleAll(tried.map((p) => prepare(p, r.sha, path.join(runDir, `prepare-${p}.log`), stop, ctls[p])), Object.values(ctls));
      const yielding = preps.includes('yield');
      const good = tried.filter((p, i) => preps[i] === 'ok');
      // one slot prepared: the other goes back to the queue; none: today's one-slot failure path (fetch: not a verdict)
      if (good.length && !yielding && !ctl.why) tried.forEach((p, i) => { if (preps[i] !== 'ok') dropSlot(p, `prepare ${preps[i]}`); });
      prep = good.length && !yielding ? 'ok' : ['yield', 'fetch'].find((x) => preps.includes(x)) ?? preps[0];
    } else prep = await prepare(ports[0], r.sha, path.join(runDir, 'prepare.log'), stop, ctl);
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
      verdict(prep === 'nosha' ? 'error' : 'failure', prep === 'nosha' ? 'sha not found' : 'build failed');
      state.done[r.id] = { result: prep, date: new Date().toISOString() };
      return;
    }
    if (r.kind === 'alone') {
      const t0 = Date.now();
      // a run that yielded between steps resumes after its finished ones (state.aloneSteps, same sha and steps)
      const resume = state.aloneSteps?.[r.id];
      const from = resume && resume.sha === r.sha && resume.n === r.steps.length ? resume.done : 0;
      let okSteps = from ? resume.ok : 0;
      if (from) log(`${r.id}: resumes at step ${from + 1}/${r.steps.length} (${okSteps} ok so far)`);
      started = true;
      startedAt = t0;
      for (const [i, step] of r.steps.entries()) {
        if (i < from) continue;
        if (ctl.why) break;
        // between steps: a pending train head takes the slots; the finished steps are kept for the rerun
        const tr = i > from ? trainsNow()[0] : null;
        if (tr && spare) { ctl.by = tr; ctl.why = 'train'; return cutEnd(); }
        if (spare && realOpenNow()) { ctl.why = 'real'; return cutEnd(); }
        if (tr) {
          (state.aloneSteps ??= {})[r.id] = { sha: r.sha, n: r.steps.length, done: i, ok: okSteps, date: new Date().toISOString() };
          log(`${r.id}: yields to train ${tr.n} after step ${i}/${r.steps.length}, queued again (head of the alone queue)`);
          postStatus(r.sha, 'pending', ctx, `queued, yielded to train ${tr.n} after step ${i}/${r.steps.length}`);
          writeClaims([r.id], 'release', `release ${r.id} (yields to train ${tr.n})`);
          claimed.delete(r.id);
          preemptedAlone.add(r.id);
          yieldedSteps = true;
          return;
        }
        const line = step.startsWith('serve ') ? `node scripts/laptop-queue/serve.mjs ${step.slice(6)}` : step;
        freePort(ports[0]);
        const code = await sh(line, { cwd: SLOTS[ports[0]].dir, env: { ...r.env, E2E_PORT: ports[0], E2E_GPU: '1' }, logFile: path.join(runDir, `step${i + 1}.log`), ctl });
        if (code === 0) okSteps++;
        freePort(ports[0]);
        // a finished step is kept for a rerun after a cut or a yield (never a step the cut killed)
        if (!ctl.why) (state.aloneSteps ??= {})[r.id] = { sha: r.sha, n: r.steps.length, done: i + 1, ok: okSteps, date: new Date().toISOString() };
      }
      if (ctl.why) return cutEnd();
      if (state.aloneSteps) delete state.aloneSteps[r.id];
      const good = okSteps === r.steps.length;
      postStatus(r.sha, good ? 'success' : 'failure', ctx, `${okSteps}/${r.steps.length} steps ok, ${Math.round((Date.now() - t0) / 1000)} s`);
      state.done[r.id] = { result: good ? 'success' : 'failure', date: new Date().toISOString() };
      return;
    }
    keptNow = plan.kept;
    if (keptNow.length) log(`${r.id}: ${keptNow.length} suite(s) kept from a preempted run, runs ${plan.rest.length}`);
    const list = r.kind === 'full' ? cmd('node', ['scripts/run-e2e.mjs', '--list'], { cwd: SLOTS[port].dir }).split('\n').map((x) => x.trim()).filter(Boolean) : plan.rest;
    // a train rerun: E2E_JOBS=1 per slot; split over both slots when pick gave it both (laptop-queue-7 A10), else one
    const jobs = DESKTOP || r.trainRerun ? 1 : r.jobs ?? (r.kind === 'full' ? 3 : 2);
    const split = ports.length > 1;
    const bins = split ? shard(runParts(list, port, r.sha), times, ports.length) : [{ suites: list }];
    if (split) bins.forEach((b, i) => log(`${r.id}: bin ${ports[i]}: ${b.suites.length} parts, weight ${Math.round(b.weight)} s`));
    const t0 = Date.now();
    started = true;
    progress = () => runProgress(list, times, jobs, Date.now() - t0);
    // every suite kept: no e2e call, the verdict comes from the kept passes
    const runs = list.length ? await settleAll(ports.map((p, i) => e2e(p, bins[i].suites, jobs, path.join(runDir, `${p}.log`), split ? ctls[p] : ctl)), Object.values(ctls)) : [];
    if (ctl.why) return cutEnd();
    // same completeness rule as a train shard, per slot; at least the listed suites (a named suite may expand into parts)
    const broken = list.length ? ports.findIndex((p, i) => !runComplete(runs[i], bins[i].suites.length)) : -1;
    if (broken >= 0) {
      const [bp, run, n] = [ports[broken], runs[broken], bins[broken].suites.length];
      log(`${r.id}: run incomplete${split ? ` on ${bp}` : ''} (exit ${run.code}, ${run.suites.length}/${n} suites, summary ${run.complete ? 'seen' : 'missing'})`);
      verdict('failure', `slot ${bp} gave no result`);
      if (r.pr) postComment(r.pr, `${ctx} failed on ${r.sha.slice(0, 8)} (${job.ref}): slot ${bp} gave no result (exit ${run.code}, ${run.suites.length}/${n} suites).\nLog on the ${WORKER}: ${path.join(runDir, `${bp}.log`)}\n\`\`\`\n${capTail(run.tail40 || '(empty log)', 8_000)}\n\`\`\``);
      state.done[r.id] = { result: 'incomplete', date: new Date().toISOString() };
      return;
    }
    const slotOf = {};
    if (split) runs.forEach((x, i) => x.suites.forEach((s) => { slotOf[s.s] = ports[i]; }));
    const keptRows = keptNow.map((k) => ({ s: k.s, ok: true, flaky: false, report: false, sec: k.sec, kept: true }));
    const result = { suites: [...keptRows, ...runs.flatMap((x) => x.suites)], wall: 0, flakes: [], kept: keptRows.length };
    // a request reruns on its own locked slot(s) and worktree (its sha): a sharded rerun's suite on the slot that ran it
    result.flakes = await rerunFlakes(result, slotOf, job, runDir, port, ctl);
    if (ctl.why) return cutEnd();
    result.wall = (Date.now() - t0) / 1000;
    // desktop: failed suites go to the laptop (a laptop-only request, lib laptopRerunRequest), whose verdict is final;
    // this run posts pending meanwhile (Orchestrator waste audit 2026-10-24: desktop failures under load were noise)
    const bad = result.suites.filter((s) => !s.ok && !s.flaky && !s.report).map((s) => s.s);
    let handedOff = '';
    let rerunId = '';
    const lr = DESKTOP && bad.length ? laptopRerunFor(r, board) : null; // F34: a draft PR's desktop failure is final
    if (lr && !lr.rerun) { result.note = lr.why; log(`${r.id}: #${r.pr} is a draft: ${lr.why}, the desktop failure stands`); }
    if (lr?.rerun) {
      const rr = laptopRerunRequest(r, bad, { now: Date.now(), suffix: randomBytes(2).toString('hex') });
      const desc = desktopFailDesc(bad, median(cpuSamples));
      if (DRY) log(`dry-run: ${r.id}: would queue the laptop rerun ${rr.id} (${bad.join(' ')}): ${desc}`);
      else if (pushFile(`requests/${rr.id}.json`, `${JSON.stringify(rr, null, 2)}\n`, `request ${rr.id}`)) {
        handedOff = desc;
        rerunId = rr.id;
        log(`${r.id}: ${desc} as ${rr.id}`);
      } else log(`${r.id}: laptop rerun push failed, the desktop failure stands`);
    }
    const ok = finish(job, verdictCtx, result, runDir, r.pr, { handedOff });
    // a train rerun that passed also turns the train's own context green (the latest status per context wins in the
    // combined status, so it replaces the desktop's laptop-e2e failure); a failed one leaves laptop-e2e red
    if (ok && r.trainRerun) {
      postStatus(r.sha, 'success', 'laptop-e2e', rerunPassed(r.suites, /confirm rerun/.test(r.note ?? '') ? 'confirm rerun' : undefined));
      bumpTrainEnd('?');
    }
    state.done[r.id] = { result: ok ? 'success' : rerunId ? 'laptop-rerun' : 'failure', wall: result.wall, date: new Date().toISOString(), ...(rerunId ? { rerun: rerunId } : {}) };
  } finally {
    if (watch) clearInterval(watch);
    progressById.delete(r.id);
    takenBy.delete(r.id);
    missing.delete(r.id);
    withdrawnIds.delete(r.id);
    for (const p of ports) { if (locks[p]) releaseLock(p, locks[p]); freePort(p); }
    if (state.done[r.id]) state.done[r.id].key = dupKey(r); // the duplicate check reads it for LQ_DUP_WINDOW_MIN
    if (state.done[r.id] && state.aloneDue[r.id]) { delete state.aloneDue[r.id]; gapLogged.delete(r.id); } // done or withdrawn (A12)
    saveState();
    if (state.done[r.id] && writeClaims([r.id], 'done', `done ${r.id}`) === true) doneSynced.add(r.id);
    if (!yielded && !yieldedSteps && ctl.why !== 'train' && ctl.why !== 'taken') log(`${r.id}: done`);
  }
}

// ---------- the loop ----------

const busy = Object.fromEntries(PORTS.map((p) => [p, null]));

function dispatch(p) {
  if (p.kind === 'train') {
    claimed.add(p.train.sha);
    const ports = p.ports ?? PORTS;
    if (DRY) { log(`dry-run: would run train ${p.train.n} ${p.train.sha.slice(0, 8)} on ${ports.join('+')}`); return planTrain(p.train.sha, ports); }
    runningTrains.add(p.train.sha);
    const run = runTrain(p.train, ports).catch((e) => {
      log(`train ${p.train.n} service error: ${e.stack ?? e.message}`);
      postStatus(p.train.sha, 'error', 'laptop-e2e', 'service error, see log');
      writeClaims([p.train.sha], 'release', `release train ${p.train.n}`);
      claimed.delete(p.train.sha);
    }).finally(() => runningTrains.delete(p.train.sha));
    ports.forEach((x) => { busy[x] = run; });
    return run;
  }
  claimed.add(p.request.id);
  const ports = p.ports ?? (p.kind === 'alone' ? PORTS : [p.slot]); // p.ports: a sharded train rerun (both slots)
  if (DRY) { log(`dry-run: would run ${p.request.id} (${p.request.kind}, ${p.request.suites ?? p.request.steps ?? 'full'}) on ${ports.join('+')}`); return Promise.resolve(); }
  activeReqs.set(p.request.id, p.request);
  // busy before the call: runRequest's synchronous start may free a slot it does not use (busy[p] = null), which the
  // marking after the call must not undo (checker FIX a)
  const mark = Promise.resolve();
  ports.forEach((x) => { busy[x] = mark; });
  const run = runRequest(p.request, p.slot ?? PORTS[0], p.ports).catch((e) => {
    log(`${p.request.id} service error: ${e.stack ?? e.message}`);
    postStatus(p.request.sha, 'error', contextName(p.request.kind, p.request.set, p.request.suites, p.request.trainRerun), 'service error, see log');
    if (p.request.requester === AFFECTED_REQUESTER) postStatus(p.request.sha, 'error', AFFECTED_CTX, 'service error, see log');
    writeClaims([p.request.id], 'release', `release ${p.request.id}`);
    claimed.delete(p.request.id);
  }).finally(() => activeReqs.delete(p.request.id));
  ports.forEach((x) => { if (busy[x] === mark) busy[x] = run; });
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
  log(DESKTOP ? 'dry-run: visual-gate would post error "skipped: desktop lane (laptop GPU only)"' : `dry-run: then e2e-visual on ${ports[0]} when laptop-e2e passes and the head has scripts/e2e-visual.mjs (env ${JSON.stringify(visualEnv({ n: '<n>', sha }))}), status visual-gate`);
  return Promise.resolve();
}

// Two Get-Process snapshots 1 s apart of the processes below Normal base priority (BelowNormal 6, Idle 4), with the wall
// time between them; lib backgroundCpuMs reads it. Get-Process is ~0.15 s (the per-process WMI perf class took ~18 s
// under load). Processes whose CPU time is unreadable (other users' / protected) print nothing: they stay in the load.
const BG_CPU_PS = [
  "$f = { Get-Process | Where-Object { $_.Id -ne 0 -and $_.BasePriority -lt 8 -and $_.TotalProcessorTime -ne $null } }",
  "& $f | ForEach-Object { \"a $($_.Id) $([long]$_.TotalProcessorTime.TotalMilliseconds)\" }",
  '$sw = [Diagnostics.Stopwatch]::StartNew()',
  'Start-Sleep -Milliseconds 1000',
  "& $f | ForEach-Object { \"b $($_.Id) $([long]$_.TotalProcessorTime.TotalMilliseconds)\" }",
  '"el $($sw.ElapsedMilliseconds)"',
].join('; ');

/**
 * Desktop gate CPU: { gated, total } %. total = whole machine (os.cpus() deltas over the ~2 s call); gated = total minus
 * the processes below Normal priority (lib gatedCpu; Orchestrator waste audit 2026-10-24: a BelowNormal Blender bake held
 * 4192 for ~62 min). gated is NaN when the PowerShell read fails (the gate then says 'cpu unknown').
 */
function cpuGated() {
  const before = os.cpus();
  const out = cmd('powershell', ['-NoProfile', '-NonInteractive', '-Command', BG_CPU_PS], { soft: true });
  const after = os.cpus();
  const total = cpuTotalPct(before, after);
  const { bgMs, elapsedMs } = backgroundCpuMs(out);
  return { gated: gatedCpu({ total, bgMs, elapsedMs, cores: after.length }), total };
}

/** A gate CPU reader (cpuGated) that samples once, on first use (one sample per pass). */
function lazyCpu() {
  let v;
  return () => (v === undefined ? (v = cpuGated()) : v);
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
    // an auto affected request's older head: its pending affected-e2e is closed (the newer head has its own); a laptop
    // rerun's "desktop FAIL ..., laptop rerun queued" pending is closed too (lib supersedeStatuses)
    // (an affected survivor on the same sha takes affected-e2e over instead)
    for (const s of supersedeStatuses(requests.find((r) => r.id === id), by, requests.find((r) => r.id === by))) postStatus(s.sha, s.state, s.context, s.description);
  }
  saveState();
  const places = keepPlaces(sup, requests);
  return requests.filter((r) => !sup.has(r.id)).map((r) => places.get(r.id) ?? r);
}

/**
 * laptop-queue-8 A6: sets runningSup (lib supersededRunning) for the pr requests claimed or running here against the open
 * requests (after supersede, duplicates and conflicts) plus the ones claimed or running on either worker; each run's
 * watch then stops (lib cutShort 'superseded'). A newer request still open takes the stopped run's queue place (A4,
 * keepPlaces); a claimed or running one needs none. Returns the open requests with the places applied.
 */
function stopSuperseded(requests) {
  if (!STOP_SUPERSEDED || activeReqs.size === 0) { runningSup = new Map(); return requests; }
  const running = [...activeReqs.values()];
  const cands = [...requests, ...otherActive, ...running];
  const sup = supersededRunning(running, cands, isAncestor, (id) => progressById.get(id));
  const next = new Map();
  for (const [rid, nid] of sup) {
    const n = cands.find((c) => c.id === nid);
    if (!runningSup.has(rid) && n) log(`${rid}: newer head ${String(n.sha).slice(0, 8)} queued (${nid}), stopping the run`);
    if (n) next.set(rid, n);
  }
  runningSup = next;
  const open = new Set(requests.map((x) => x.id));
  const toOpen = new Map([...sup].filter(([, nid]) => open.has(nid)));
  if (toOpen.size === 0) return requests;
  const places = keepPlaces(toOpen, [...running, ...requests]);
  return requests.map((x) => places.get(x.id) ?? x);
}

/**
 * laptop-queue-8 A4: a survivor of a supersede keeps the older request's queue place (lib placeFor). Rewrites each open
 * survivor's request file once with `place` (mustExist; same id) and returns Map id -> the request with its place, for
 * the ones pushed (dry run: logged only, applied this pass). A lost push is logged, not retried: the request queues by
 * its id.
 */
function keepPlaces(sup, requests) {
  const out = new Map();
  for (const [id, place] of placeFor(sup, requests)) {
    const r = requests.find((x) => x.id === id);
    if (!r || r.place === place) continue;
    const next = { ...r, place };
    if (DRY) log(`dry-run: ${id}: would keep the place of ${place}`);
    else if (!pushFile(`requests/${id}.json`, `${JSON.stringify(next, null, 2)}
`, `place ${id}`, { mustExist: true })) { log(`${id}: place push failed, queues by its id`); continue; }
    else log(`${id}: keeps the place of ${place}`);
    out.set(id, next);
  }
  return out;
}

/**
 * Marks open requests that repeat another request done as duplicates (no run) in one push and drops them (lib
 * duplicates): against the open ones, the ones claimed or running here or on the other worker, and the ones done here
 * within LQ_DUP_WINDOW_MIN. An auto affected request posts affected-e2e (lib duplicateStatuses: handed over to the
 * surviving affected request, or success when it repeats a recent pass); others post nothing. A lost push is retried
 * next pass.
 */
function applyDuplicates(requests) {
  const recent = Object.entries(state.done).filter(([, d]) => d?.key).map(([id, d]) => ({ id, key: d.key, result: d.result, date: d.date }));
  const active = [...activeReqs.values(), ...otherActive].map((r) => ({ ...r, active: true }));
  const dup = duplicates([...requests, ...active], recent, Date.now(), DUP_WINDOW_MS);
  if (dup.size === 0) return requests;
  const ids = [...dup.keys()];
  const date = new Date().toISOString();
  if (!DRY && writeClaims(ids, 'done', `duplicate ${ids.length} request(s)`) !== true) { log(`duplicate push failed for ${ids.length} request(s), retried next pass`); return requests; }
  const all = [...requests, ...active];
  for (const [id, by] of dup) {
    log(`${id}: duplicate of ${by}`);
    if (DRY) continue;
    state.done[id] = { result: 'duplicate', by, date };
    doneSynced.add(id);
    for (const s of duplicateStatuses(all.find((r) => r.id === id), by, all.find((r) => r.id === by) ?? null, state.done[by]?.result)) postStatus(s.sha, s.state, s.context, s.description);
  }
  saveState();
  return requests.filter((r) => !dup.has(r.id));
}

/**
 * Retires the open affected requests whose PR head conflicts with master (lib conflictRetire) as done unrun, in one
 * push like applyDuplicates, and posts their error statuses (lib conflictStatuses). LQ_SKIP_CONFLICTING=0: none.
 * A lost push is retried next pass.
 */
/**
 * laptop-queue-14 F46 (two desktop slots burned 53 min on red-CI heads) + closed PRs: reads the request's PR fresh
 * (gh pr view) just before the claim; a merged / closed PR, a sha no longer the PR head, or a failed CI `check` on it
 * (lib claimSkip) withdraws it: a done claim, error statuses (lib claimSkipStatuses), a log line. true = withdrawn (or
 * the done push failed: not claimed this pass). A GitHub error runs it.
 */
function skipAtClaim(r) {
  if (!claimGated(r)) return false;
  let pr = null;
  try { pr = JSON.parse(gh(['pr', 'view', String(r.pr), '-R', REPO, '--json', 'state,headRefOid,statusCheckRollup']) || 'null'); } catch (e) { log(`${r.id}: PR #${r.pr} read failed (${String(e.message).split('\n')[0]}), runs`); return false; }
  const why = claimSkip(r, pr);
  if (!why) return false;
  const statuses = claimSkipStatuses(r, why, pr?.headRefOid);
  if (DRY) { log(`${r.id}: would be withdrawn at claim, ${statuses[0].description.replace(/^not run: /, '')}`); return true; }
  // claim first (claimBlocks: another worker's live claim keeps it), then the done mark
  const got = writeClaims([r.id], 'claim', `claim ${r.id} (to withdraw)`);
  if (got === 'blocked') return true;
  if (got !== true || writeClaims([r.id], 'done', `withdrawn ${r.id} (${why})`) !== true) {
    if (got === true) writeClaims([r.id], 'release', `release ${r.id} (withdraw failed)`);
    log(`${r.id}: withdraw push failed, retried next pass`);
    return true;
  }
  log(`${r.id}: withdrawn at claim, ${statuses[0].description.replace(/^not run: /, '')}`);
  state.done[r.id] = { result: `withdrawn-${why}`, date: new Date().toISOString(), key: dupKey(r) };
  doneSynced.add(r.id);
  saveState();
  for (const s of statuses) postStatus(s.sha, s.state, s.context, s.description);
  return true;
}

function applyConflicts(requests) {
  if (!SKIP_CONFLICTING) return requests;
  const ids = conflictRetire(requests, board);
  if (ids.length === 0) return requests;
  const date = new Date().toISOString();
  if (!DRY && writeClaims(ids, 'done', `conflict ${ids.length} request(s)`) !== true) { log(`conflict push failed for ${ids.length} request(s), retried next pass`); return requests; }
  for (const id of ids) {
    const r = requests.find((x) => x.id === id);
    log(`${id}: not run, PR #${r.pr} conflicts with master`);
    if (DRY) continue;
    state.done[id] = { result: 'conflict', date };
    doneSynced.add(id);
    for (const s of conflictStatuses(r)) postStatus(s.sha, s.state, s.context, s.description);
  }
  saveState();
  return requests.filter((r) => !ids.includes(r.id));
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

/**
 * laptop-queue-7 A12: the due marks after the holds (lib aloneDue): an aged or preempted alone request a hold dropped
 * this pass (in before, not in after) is stamped; logs once per id when stamped and when its gap opens. An empty
 * listing (a failed ls-tree reads the same) keeps the marks.
 */
function dueMarks(listed, before, after) {
  if (listed.length === 0) return;
  const kept = new Set(after.map((r) => r.id));
  const held = new Set(before.filter((r) => r.kind === 'alone' && !kept.has(r.id)).map((r) => r.id));
  const prev = state.aloneDue;
  const due = aloneDue(prev, { requests: listed, front: preemptedAlone, now: Date.now(), held });
  for (const id of Object.keys(due)) if (!(id in prev)) log(`${id}: aged alone due after the next train`);
  for (const id of gapLogged) if (!(id in due)) gapLogged.delete(id);
  for (const id of Object.keys(due)) {
    if (ALONE_GAP && !gapLogged.has(id) && aloneGapOpen(due, id, lastTrainEnd)) { gapLogged.add(id); log(`${id}: gap after train ${lastTrainN}: alone goes first`); }
  }
  if (JSON.stringify(due) !== JSON.stringify(prev)) { state.aloneDue = due; saveState(); }
}

async function pass() {
  // requests first: listRequests fetches origin/laptop-queue, which the train claim checks read
  const listed = listRequests(); // running ones included (aloneDue keeps their marks)
  // laptop-queue-8 G: the open train heads once (laptop; pendingTrains reads them on the desktop), then lost train
  // verdicts and done claims on both workers, before the hold reads the heads
  const trainRead = DESKTOP ? undefined : trainHeadsNow();
  syncTrains(trainRead?.heads ?? null);
  const requests = listed.filter((r) => !claimed.has(r.id));
  prBoardNow();
  mergeRecheckNow(requests); // F51: after a master move, conflicting affected requests retire in applyConflicts below
  const dt = DESKTOP ? desktopTrains() : null;
  for (const id of preemptedAlone) if (!requests.some((r) => r.id === id)) preemptedAlone.delete(id); // done or withdrawn
  // realOpen: a real request on the full listing (before the hold filters below) keeps a spare from starting (lib pick)
  const queue = { trains: DESKTOP ? dt.trains : pendingTrains(trainRead).filter((t) => !claimed.has(t.sha)), requests, front: preemptedAlone, realOpen: realOpenNow(requests) };
  pendingNow = queue.trains; // runs still before their suites / steps yield to these
  // done marks first: a claim (which tells the desktop the laptop is on claims) never lands before them
  if (!syncDone() && !DRY) { log('done claims not pushed: no new requests this pass (trains need a claim push too)'); queue.requests = []; }
  // supersede and duplicates on the full list (before the alone hold and the desktop's pr filter); the desktop waits for
  // claims on the branch like its gate does
  else if (!(DESKTOP && claimCount === 0)) queue.requests = applyConflicts(applyDuplicates(applySupersedes(queue.requests)));
  queue.requests = stopSuperseded(queue.requests);
  // alone runs wait while any open train lacks a laptop-e2e success (trains and their reruns first; CLAUDE.md laptop order)
  // an alone request held past ALONE_AGE_MIN still stops new pr / full claims (only train reruns start), so the slots
  // drain for it while the train runs; only while the train can clear the hold by running (lib holdClears) (Orchestrator audit 2026-10-24: 3 newer PR requests went first at 07:25Z)
  const beforeHolds = queue.requests; // A12: the aged / preempted alone requests the holds below drop get a due mark
  if (!DESKTOP && aloneHold && queue.requests.some((r) => r.kind === 'alone')) {
    const aged = holdClears(aloneHold) ? agedAlone(queue.requests, Date.now()) : null;
    const key = `${aloneHold.n} ${aloneHold.sha} ${aloneHold.laptop} ${aged?.id ?? ''}`;
    // laptop-queue-8 A19: repeated every 15 min while an aged alone stops pr claims, so a stuck hold shows in the log tail
    if (key !== aloneHoldLogged || (aged && Date.now() - aloneHoldAt >= HOLD_LOG_MS)) { aloneHoldLogged = key; aloneHoldAt = Date.now(); log(`alone requests held: train ${aloneHold.n} ${String(aloneHold.sha).slice(0, 8)} open, laptop-e2e ${aloneHold.laptop || 'none'}${aged ? `; ${aged.id} waited over ${ALONE_AGE_MIN} min: no new pr claims` : ''}`); }
    queue.requests = queue.requests.filter((r) => (aged ? r.trainRerun : r.kind !== 'alone'));
  } else if (!aloneHold) aloneHoldLogged = '';
  // before any train PR exists: a green train-ready PR keeps new alone claims back (aged and preempted ones still start)
  // (the green train-ready heads come from readyNow, read by pendingTrains this pass)
  const aloneSoonWhy = !DESKTOP && openTrainCount === 0 && queue.requests.some((r) => r.kind === 'alone') ? aloneSoon(0, ready.green.length) : '';
  if (aloneSoonWhy) {
    const aged = agedAlone(queue.requests, Date.now());
    if (aloneSoonWhy !== aloneSoonLogged) { aloneSoonLogged = aloneSoonWhy; log(`${aloneSoonWhy}: no new alone claims`); }
    queue.requests = queue.requests.filter((r) => r.kind !== 'alone' || r === aged || preemptedAlone.has(r.id) || (ALONE_GAP && aloneGapOpen(state.aloneDue, r.id, lastTrainEnd)));
  } else if (!aloneSoonWhy) aloneSoonLogged = '';
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
    // a train rerun and a laptop rerun of a desktop failure are the laptop's (the desktop failed them)
    queue.requests = queue.requests.filter((r) => r.kind === 'pr' && !r.trainRerun && !r.laptopRerun);
    // laptop-queue-8 A9: a run estimated over LQ_DESKTOP_MAX_MIN at E2E_JOBS=1 is the laptop's (the backlog above counts it)
    queue.requests = queue.requests.filter((r) => {
      if (!desktopTooLong(r, times, DESKTOP_MAX_S)) return true;
      if (!tooLongLogged.has(r.id)) { tooLongLogged.add(r.id); log(`${r.id}: ~${Math.round(expectedWallS(keptPlan(r, r.sha, times).rest, times, 1) / 60)} min on the desktop, left to the laptop`); }
      return false;
    });
    const why = {};
    const train = queue.trains[0];
    if (train) {
      // laptop silent: the train goes first on the desktop slots that exist, backlog gate dropped (lock, dir, CPU kept);
      // it blocks new requests meanwhile so busy slots drain (as pick does on the laptop)
      const cpu = lazyCpu();
      const ports = PORTS.filter((p) => fs.existsSync(SLOTS[p].dir));
      for (const port of ports) why[port] = busy[port] ? 'busy' : desktopSlotGate({ lockName: path.basename(SLOTS[port].lock), lockHeld: slotLockHeld(port), dirOk: true, backlog: Infinity, cpu: gateCpu(cpu(), CPU_MODE), cpuTotal: cpu().total, cpuMode: CPU_MODE, minBacklog: 0, maxCpu: DESKTOP_CPU[port] });
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
        else why[port] = desktopSlotGate({ lockName: path.basename(SLOTS[port].lock), lockHeld: slotLockHeld(port), dirOk: fs.existsSync(SLOTS[port].dir), backlog, cpu: gateCpu(cpu(), CPU_MODE), cpuTotal: cpu().total, cpuMode: CPU_MODE, minBacklog: DESKTOP_BACKLOG, maxCpu: DESKTOP_CPU[port] });
        if (why[port]) desktopWait[port] = true;
      }
    }
    const waits = Object.entries(why).filter(([, w]) => w).map(([p, w]) => `${p} ${w}`);
    log(`queue: ${backlog} request(s), ${queue.requests.length} pr${waits.length ? `; waiting: ${waits.join('; ')}` : ''}${dt.why ? `; trains: ${dt.why}` : ''}`);
    if (queue.requests.length === 0 || PORTS.every((p) => busy[p] || why[p])) return;
  } else log(`queue: ${queue.trains.length} train(s), ${queue.requests.length} request(s)`);
  // the next train is due: only train reruns and pr runs that end before its ETA start, so the slots drain for it
  // (lib nextTrain, fitsBeforeTrain); a fitted run an early train catches falls to cutShort's 80% rule
  const fitted = new Set();
  if (!DESKTOP && next && queue.trains.length === 0) {
    if (next.why !== soonLogged) { soonLogged = next.why; log(`${next.why}, next train ~${new Date(next.etaMs).toISOString().slice(11, 16)}Z: only runs that fit start`); }
    const now = Date.now();
    queue.requests = queue.requests.filter((r) => {
      const fits = !r.trainRerun && fitsBeforeTrain(r, { now, etaMs: next.etaMs, times, prepS: FIT_PREP_S });
      if (fits) fitted.add(r.id);
      // an aged / preempted alone whose gap after a train is open still starts (lib holdKeeps; BRIEF A12)
      return holdKeeps(r, { next, due: ALONE_GAP ? state.aloneDue : null, lastTrainEnd, fits });
    });
  } else if (!next) soonLogged = '';
  if (!DESKTOP) dueMarks(listed, beforeHolds, queue.requests);
  const virtual = { ...desktopWait };
  // a slot under a manual lock takes no new request (a train keeps its own wait in runTrain)
  if (queue.trains.length === 0) {
    const held = manualLocks(Object.fromEntries(PORTS.map((p) => { try { return [p, fs.readFileSync(SLOTS[p].lock, 'utf8')]; } catch { return [p, null]; } })));
    const key = JSON.stringify(held);
    if (key !== manualLogged) { manualLogged = key; for (const [p, line] of Object.entries(held)) log(`${p} under a manual lock, no new claims there: ${line}`); }
    for (const p of Object.keys(held)) virtual[p] = true;
  }
  // fixes first (laptop-queue-8 A1), then front, then green PR heads smallest wall first, then arrival (lib pick
  // queue.order); built after every filter above. The desktop (A8): fixes, then smallest expected wall at E2E_JOBS=1.
  if (DESKTOP || GREEN_FIRST || FIX_FIRST) {
    const green = GREEN_FIRST && !DESKTOP ? greenIds(queue.requests, board) : new Set();
    const fix = new Set(FIX_FIRST ? queue.requests.filter((r) => isFix(r, board)).map((r) => r.id) : []);
    const wallS = {};
    for (const r of queue.requests) if (DESKTOP || green.has(r.id)) wallS[r.id] = expectedWallS(r.suites, times, DESKTOP ? 1 : r.jobs ?? 2);
    const frontBranches = GREEN_FIRST && !DESKTOP ? FRONT_BRANCHES : [];
    queue.order = { fix, green, wallS, frontBranches, maxWaitMs: GREEN_MAX_WAIT_MS, smallest: DESKTOP };
    const frontIds = frontBranches.length ? queue.requests.filter((r) => r.kind !== 'alone' && isFront(r, FRONT_BRANCHES)).map((r) => r.id) : [];
    const key = `${[...fix].sort().join(',')}|${frontIds.join(',')}|${[...green].sort().join(',')}`;
    if (key !== orderLogged) { orderLogged = key; if (fix.size || frontIds.length || green.size) log(`order: fix ${fix.size}, front ${frontIds.length}, green ${green.size} (smallest first)`); }
  }
  // laptop-queue-7 A10: an open train rerun whose suites expand to 2+ parts may shard across both slots (lib pick)
  if (!DESKTOP && RERUN_SHARD) queue.shardRerun = new Set(queue.requests.filter((r) => r.trainRerun && suiteParts(r.suites, times, planParts(r.sha)).length >= 2).map((r) => r.id));
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
      if (skipAtClaim(p.request)) continue; // laptop-queue-14 F46: red CI, stale sha or closed PR, withdrawn
      // the other worker may have taken it since the list was read: skip it this pass
      if (writeClaims([p.request.id], 'claim', `claim ${p.request.id}`) !== true) continue;
      preemptedAlone.delete(p.request.id);
      if (fitted.has(p.request.id)) log(`${p.request.id}: fits before the next train (~${Math.round(expectedWallS(p.request.suites, times, p.request.jobs ?? 2))} s)`);
    }
    const run = dispatch(p);
    if (DESKTOP) started = true;
    if (DRY) (p.kind === 'request' ? p.ports ?? [p.slot] : PORTS).forEach((x) => { virtual[x] = true; });
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
  const changed = git(['diff', '--name-only', head, target, '--', 'scripts/laptop-queue', 'scripts/run-e2e.mjs', 'scripts/e2e-affected.mjs']) !== '';
  git(['checkout', '-q', '--detach', target]);
  log(`fast-forwarded to ${target.slice(0, 8)}${changed ? ', restarting' : ''}`);
  if (changed) process.exit(0);
}

async function main() {
  if (!DRY) takePidLock();
  log(`service start (${WORKER})${ONCE ? ' --once' : ''}${DRY ? ' --dry-run' : ''} in ${HERE}`);
  if (TASK_GUARD_MS > 0) taskGuard(); // before the first pass: a stale task must not race the service for the slot locks
  const affectedDue = () => !DESKTOP && AFFECTED_POLL_MS > 0 && Date.now() - lastAffected >= AFFECTED_POLL_MS;
  if (ONCE || DRY) {
    await pass();
    if (affectedDue()) { refileOverCap(); affectedPass(); } // after pass: its listing is the one affectedNeeds reads
    await Promise.all(Object.values(busy).filter(Boolean));
    return;
  }
  for (;;) {
    if (TASK_GUARD_MS > 0 && Date.now() - lastGuard >= TASK_GUARD_MS) taskGuard();
    try {
      // update before taking new work too, so a busy queue still picks up new service code between runs
      if (!Object.values(busy).some(Boolean)) selfUpdate();
      heartbeat();
      await pass();
      if (affectedDue()) { refileOverCap(); affectedPass(); }
      if (!DESKTOP && SPARE_IDLE_MIN > 0) sparePass();
      if (!Object.values(busy).some(Boolean)) selfUpdate();
    } catch (e) { log(`pass failed: ${e.message}`); }
    await sleep(POLL_MS);
  }
}

await main();
