// Auto train (Michael 2026-10-23 ~19:10, "Yes, fully automatic"): a rolling merge train with no human step. One `tick`
// (every 5 min from a scheduled task, scripts/auto-train-task.ps1) looks at GitHub and does at most one thing:
//   open train (an open PR whose head is train/<n>): CI `check` + the laptop's commit status `laptop-e2e` on its head
//     both success -> `merge-train release` (exit 3, master moved -> `merge-train build` the same members, next version);
//     a desktop `laptop-e2e` failure ("desktop: ...; FAIL: a,b") -> ONE laptop rerun of those suites per head
//     (request.mjs --set train<n>-rerun --train-rerun, state "laptop-rerun", recorded as `rerun` in the status); a
//     `laptop-e2e/train<n>-rerun` success on the head with CI green releases through decide() (also on master's
//     request.mjs, which runs it as a plain pr request and posts only that context), its failure -> "failed", no
//     verdict AUTO_TRAIN_RERUN_STALE_MIN (60) min after the request -> "rerun-stale", a request that failed 6 times ->
//     "rerun-request-failed";
//     a laptop `laptop-e2e` failure (or a failed laptop rerun) -> auto-drop (Michael 2026-10-24 ~21:00, "Auto-drop on
//     failure"): the member(s) whose change maps to a failing suite (pickDrops: the --affected DIRECT_COVERS map
//     in scripts/e2e-affected.mjs, then most src/ files under the suite's folders, then the newest-labelled; never
//     feature/menu) lose `train-ready` with a comment (suite + assert), the train PR is closed with a comment and the
//     next train is built in the same tick ("DROPPED" log lines, `dropped: [{ pr, branch, suite }]` in the status);
//     what it cannot work out stays "failed" for the orchestrator (also: a desktop failure with a cut FAIL list, a rerun
//     failure with no FAIL list, over AUTODROP_MAX_SUITES suites, tier 1 taking every code member, a suite the last
//     auto-dropped train also failed: `lastDrop` in the status), as does every failure under --no-autodrop;
//     CI / build-time vitest failures stay "failed" (nothing destructive); pending ->
//     wait; no laptop status 3 h after the head was pushed -> state "stale"; CI green but no laptop status 10 min
//     after (AUTO_TRAIN_LAPTOP_MISSING_MIN) -> state "laptop-missing" (waitingMin in the status).
//   no open train: open PRs to master, never a draft (F34: `draftSkipped` in the status), that are train-ready:
//     labelled `train-ready` with a green `check` on their head,
//     or unlabelled and meeting the train-ready rule on their head (scripts/train-ready.mjs; its owner is docs/RULES.md
//     "Getting to master") without having lost the label since that head was pushed; auto-train adds the label when it
//     builds them (AUTO_TRAIN_UNLABELLED=0: labelled only). Plus feature/menu when it differs from master in docs only,
//     riding along -> `merge-train build <n+1> <version> "<title>" ...`, paced: only once the last release is
//     --min-interval min old (default 60) or the laptop queue is idle (no open laptop claim other than spare work; desktop
//     claims and unclaimed requests never hold a train); held (state "holding") per head while a candidate's check
//     still runs: F50, to its expected CI finish (its CI run's start + the median CI time of the open PRs' green
//     checks, typicalCiMin, + AUTO_TRAIN_CHECK_WAIT_MARGIN_MIN 2), at most AUTO_TRAIN_CHECK_WAIT_CAP_MIN (20) min, else
//     (start or median unknown) AUTO_TRAIN_CHECK_WAIT_MIN (3) min from first seen; the candidates are re-read right
//     before the build, at build start and once more after its plan (AUTO_TRAIN_REREAD=0: the first re-read only).
//     merge-train build exit 6 (nothing new to release) -> idle with `nothingNew` in the status, no
//     build until a member head or master moves.
// It calls scripts/merge-train.mjs (next to this file) only through its CLI, with cwd = the train worktree
// (--worktree, default C:/NightShift/Mobile-Coop-train). It reads GitHub through gh / ls-remote (no fetch of its own),
// never forces a push, never touches dev or master; every write (gh or merge-train) goes through act(), which only
// prints under --dry-run. Contract and states: docs/systems/auto-train.md.
// Usage: node scripts/auto-train.mjs tick [--dry-run] [--no-autodrop] [--worktree <dir>] [--min-interval <min>] [--max-per-day <n>]
// --preview-next (with --dry-run only): ignore an open train and show the build the next tick without one would make.
// Fast poll: a tick that ends waiting (pending, laptop-rerun, holding) keeps its lock and runs the step again every
// AUTO_TRAIN_FAST_POLL_S (60) s up to AUTO_TRAIN_FAST_POLL_MAX_MIN (4) min from its start, stopping on any state
// change; --once and --dry-run never poll. Every AUTO_TRAIN_FAST_POLL_LATE_S (30) s instead once the open train's
// laptop-e2e pending status is older than its expected wall ("expect ~N s" in it, else LAPTOP_EXPECT_MIN 10 min).
// Release is `merge-train release ... --head <the tested head> --no-fallback` (pinned; never the old-style path); a
// train without a version commit is state "error" ("rebuild"). merge-train build runs no vitest (CI's `test` does).
// Release has no deploy wait (MERGE_TRAIN_DEPLOY_WAIT_MIN = AUTO_TRAIN_DEPLOY_WAIT_MIN, 0): every later tick checks
// /preview/version.json while `deployWatch` is in the status and runs `merge-train repair` once when it is still stale
// AUTO_TRAIN_DEPLOY_REPAIR_MIN (20) min after the release (0: never), closing the watch that long after the repair.
// Read-only gh / git calls retry once per step after AUTO_TRAIN_GH_RETRY_S (5) s on a transient failure (not on a
// timeout, a first try over 30 s or an HTTP 4xx other than 499); writes (act) never retry.
// A failed rebuild after release exit 3 is recorded (`rebuildFailed`) and skipped until the train head or master moves.
// Files: lock C:/NightShift/scratch/auto-train.lock (wx, stale when untouched 30 min; a heartbeat keeps a long build's
// lock fresh; merge-train takes the same lock for a hand run), log C:/NightShift/scratch/runs/auto-train.log, status
// C:/NightShift/scratch/auto-train-status.json (one line: state, train, version, head, reason, time, ...); --dry-run
// uses auto-train.dryrun.lock, runs/auto-train.dryrun.log and auto-train-status.dryrun.json. Build marker
// C:/NightShift/scratch/auto-train-building.json ({ train, version, pid, at }; dry: auto-train-building.dryrun.json),
// written just before `merge-train build`, deleted by merge-train as soon as the version commit is pushed
// (AUTO_TRAIN_BUILD_MARKER) and again in a finally. AUTO_TRAIN_SCRATCH env moves them all.
// Exit: 0 tick done (the outcome is the status state; also when another tick holds the lock), 1 usage or error.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fetchWithRetry } from './fetch-retry.mjs';
import { takeTouchLock } from './heavy-lock.mjs';
import { coverFolders, DIRECT_COVERS, suiteSetFor } from './e2e-affected.mjs';
import { cmpVersion, pagesRoot, parsePreviewVersion } from './merge-train.mjs';
import * as tr from './train-ready.mjs';

export const LABEL = tr.LABEL;
export const LAPTOP_CONTEXT = 'laptop-e2e';
export const VITEST_CONTEXT = 'auto-train/vitest';
export const MENU_BRANCH = 'feature/menu';
export const STALE_HOURS = 3;
export const LOCK_STALE_MIN = 30;
export const LAPTOP_MISSING_MIN = 10;
/** Minutes a recorded laptop rerun may go without a verdict before the state turns "rerun-stale". */
export const RERUN_STALE_MIN = 60;
/** Failed rerun requests (request.mjs non-zero exit) per head before the state turns "rerun-request-failed". */
export const RERUN_REQUEST_MAX = 6;

// ---- pure helpers (tests/autoTrain.test.ts) -----------------------------------------------------------------------

/** "X.Y.Z" bumped: minor -> X.(Y+1).0, patch -> X.Y.(Z+1). */
export function bumpVersion(version, kind) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  if (!m) throw new Error(`bad version "${version}"`);
  const [maj, min, pat] = m.slice(1).map(Number);
  return kind === 'patch' ? `${maj}.${min}.${pat + 1}` : `${maj}.${min + 1}.0`;
}

/** A changes/*.md fragment -> { title, kind }: "# <title>" on line 1, `kind: minor|patch` on the next non-blank line (default minor). */
export function fragmentInfo(text) {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');
  const t = /^#\s+(\S.*)$/.exec(lines[0] ?? '');
  const next = lines.slice(1).find((l) => l.trim() !== '') ?? '';
  const k = /^kind:\s*(minor|patch)\s*$/i.exec(next.trim());
  return { title: t ? t[1].trim() : null, kind: k ? k[1].toLowerCase() : 'minor' };
}

/** minor when any fragment is minor or missing (null), patch only when every one says `kind: patch`. */
export function releaseKind(fragments) {
  return fragments.some((f) => f == null || fragmentInfo(f).kind !== 'patch') ? 'minor' : 'patch';
}

/** The fragment path of a branch: changes/<branch with / as ->.md. */
export const fragmentPath = (branch) => `changes/${branch.replace(/\//g, '-')}.md`;

/** Titles joined with "; " (duplicates and blanks dropped), whole titles only up to `max` chars, then "; +k more". */
export function joinTitles(titles, max = 200) {
  const uniq = [...new Set(titles.map((t) => String(t ?? '').trim()).filter(Boolean))];
  let out = '';
  for (let i = 0; i < uniq.length; i++) {
    const next = out ? `${out}; ${uniq[i]}` : uniq[i];
    const restTag = i + 1 < uniq.length ? `; +${uniq.length - i - 1} more` : '';
    if (next.length + restTag.length > max && out) return `${out}; +${uniq.length - i} more`;
    out = next.length > max ? `${next.slice(0, max - 3).trimEnd()}...` : next;
  }
  return out;
}

/**
 * Stacked PRs: drops every candidate whose head is contained in another candidate's head (only the tip goes to the
 * build). `contains(a, b)` = head a is an ancestor of head b. Keeps the input order; identical heads keep the first.
 */
export function stackedTips(cands, contains) {
  return cands.filter((c, i) => !cands.some((o, j) => j !== i && o.head !== undefined && c.head !== undefined
    && (o.head === c.head ? j < i : contains(c.head, o.head))));
}

/** The highest train number named by `train/<k>` branches or "train <k>" subjects / titles, plus one. */
export function nextTrainNumber(branches, subjects = []) {
  let hi = 0;
  for (const b of branches) { const m = /(?:^|\/)train\/(\d+)$/.exec(b.trim()); if (m) hi = Math.max(hi, Number(m[1])); }
  for (const s of subjects) for (const m of String(s).matchAll(/\btrain[ /](\d+)\b/gi)) hi = Math.max(hi, Number(m[1]));
  return hi + 1;
}

/** The newest version commit subject "<version>: version at merge, train <n> (G183)" -> { version, n, index } or null. */
export function versionFromSubjects(subjects, n) {
  for (let i = subjects.length - 1; i >= 0; i--) {
    const m = /^(\d+\.\d+\.\d+): version at merge, train (\d+) \(G183\)$/.exec(String(subjects[i]).trim());
    if (m && (n == null || Number(m[2]) === Number(n))) return { version: m[1], n: Number(m[2]), index: i };
  }
  return null;
}

/**
 * `subjects` (gh's first 100 commits plus the head's subject) with the head's newest commit subjects appended, oldest
 * first, when train n's version commit is not among them; `recent()` returns those subjects one per line (or null).
 */
export function withRecentSubjects(subjects, n, recent) {
  if (versionFromSubjects(subjects, n)) return subjects;
  const more = String(recent() ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
  return more.length ? [...subjects, ...more] : subjects;
}

/** A train PR title "<version>: Train <n>: <title>" -> { version, n, title } or null. */
export function parseTrainTitle(t) {
  const m = /^(\d+\.\d+\.\d+): Train (\d+): (.+)$/.exec(String(t ?? '').trim());
  return m ? { version: m[1], n: Number(m[2]), title: m[3].trim() } : null;
}

/** A CHANGELOG release heading "## <version> - Train <n>: <title> (<date>, PR #x...)" -> { version, n (null without "Train <n>:"), title } or null. */
export function parseChangelogHeading(h) {
  const m = /^## (\d+\.\d+\.\d+) - (?:Train (\d+): )?(.+?)(?: \(\d{4}-\d\d-\d\d, PR #[^)]*\))?\s*$/.exec(String(h ?? '').trim());
  return m ? { version: m[1], n: m[2] ? Number(m[2]) : null, title: m[3].trim() } : null;
}

/** Members of train <n>: branches of its "Merge origin/<b> into train/<n>" subjects, oldest first, master excluded. */
export function membersFromSubjects(subjects, n) {
  const out = [];
  const re = new RegExp(`^Merge origin/(.+) into train/${n}$`);
  for (const s of subjects) {
    const m = re.exec(String(s).trim());
    if (m && m[1] !== 'master' && !out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

/**
 * F44 (trains 127 and 128, 2026-10-26): members of train <n> from `git log --first-parent --merges --reverse
 * --format=%s origin/master..<head>` output (`log`, one subject per line, oldest first), which has no cap. gh's PR
 * commits (`subjects`) stop at the oldest 100 and count every member's own commits, so a big train lost its merges
 * there and auto-drop found nobody. Falls back to `subjects` only when the git log is unreadable (null) or names none.
 */
export function trainMembers(log, n, subjects = []) {
  const fromGit = log == null ? [] : membersFromSubjects(String(log).split('\n'), n);
  return fromGit.length ? fromGit : membersFromSubjects(subjects, n);
}

/** "LEFT OUT: <branch> - <why>" lines of merge-train build output -> [{ branch, why }]. */
export function parseLeftOut(output) {
  return [...String(output ?? '').matchAll(/^LEFT OUT: (\S+) - (.*)$/gm)].map((m) => ({ branch: m[1], why: m[2].trim() }));
}

const FAIL = new Set(['FAILURE', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE', 'ERROR']);
const IGNORED = new Set(['CANCELLED', 'SKIPPED', 'NEUTRAL', 'STALE']);

/**
 * CI state of the check `name` in a gh statusCheckRollup: 'success' | 'failure' | 'pending' | 'missing'. Running or
 * queued entries win (a rerun is going); cancelled / skipped ones are ignored; otherwise the newest finished entry.
 */
export function ciState(rollup, name = 'check') {
  const items = (rollup ?? []).filter((r) => rollupName(r) === name);
  if (!items.length) return 'missing';
  return rollupItemsState(items) ?? 'pending';
}

/** A rollup entry's name: a StatusContext's context, a CheckRun's name. */
const rollupName = (r) => (r?.__typename === 'StatusContext' ? r.context : r?.name);

/** The state of one name's rollup entries: 'success' | 'failure' | 'pending', or null when every entry is ignored (cancelled / skipped). */
function rollupItemsState(items) {
  const norm = items.map((r) => {
    const time = Date.parse(r.completedAt || r.startedAt || r.createdAt || '') || 0;
    if (r.__typename === 'StatusContext') {
      const s = String(r.state).toUpperCase();
      return { time, s: s === 'SUCCESS' ? 'success' : FAIL.has(s) ? 'failure' : 'pending' };
    }
    if (String(r.status).toUpperCase() !== 'COMPLETED') return { time, s: 'pending' };
    const c = String(r.conclusion).toUpperCase();
    if (IGNORED.has(c)) return null;
    return { time, s: c === 'SUCCESS' ? 'success' : 'failure' };
  }).filter(Boolean);
  if (!norm.length) return null;
  if (norm.some((x) => x.s === 'pending')) return 'pending';
  return norm.sort((a, b) => b.time - a.time)[0].s;
}

/** The CI jobs the aggregate `check` needs (.github/workflows/deploy.yml); `check` appears only once they are done. */
export const CHECK_SIBLINGS = ['lint', 'test', 'build-check'];
/** Minutes the build waits for a train-ready PR whose `check` is still running (AUTO_TRAIN_CHECK_WAIT_MIN). */
export const CHECK_WAIT_MIN = 3;

/**
 * Audit 2 item 1 (PR #299 missed train 47: its `check` was "missing" 43 s before it went green): why CI is still
 * running toward `name` on a head, or null when it is not (check finished, CI failed, or no CI activity at all).
 * Running: `name` itself pending (queued / in progress); or any other check run or status pending; or `name` missing
 * while its sibling jobs (CHECK_SIBLINGS) all passed (the aggregate job is about to be created). Any failed entry
 * (newest per name; cancelled / skipped ignored) means CI failed: null.
 */
export function checkWaitReason(rollup, name = 'check', siblings = CHECK_SIBLINGS) {
  const states = new Map();
  for (const nm of new Set((rollup ?? []).map(rollupName).filter(Boolean))) {
    const s = rollupItemsState((rollup ?? []).filter((r) => rollupName(r) === nm));
    if (s) states.set(nm, s);
  }
  const own = states.get(name) ?? null;
  if (own === 'success' || own === 'failure') return null;
  if ([...states.values()].includes('failure')) return null;
  if (own === 'pending') return `${name} running`;
  const running = [...states].filter(([nm, s]) => nm !== name && s === 'pending').map(([nm]) => nm);
  if (running.length) return `${name} missing, CI running (${running.join(', ')})`;
  const sibs = siblings.filter((s) => states.has(s));
  if (sibs.length && sibs.every((s) => states.get(s) === 'success')) return `${name} missing, ${sibs.join(', ')} green (${name} not created yet)`;
  return null;
}

/**
 * Waste audit 2026-10-25 (the status said "CI missing" while CI ran): the CI word for a status / reason line.
 * ciState(), but 'running' while CI is still working toward `name` (checkWaitReason: `name` queued / in progress, any
 * other check run or status without a conclusion yet, or the sibling jobs green and `name` not created yet); 'missing'
 * stays only when the head has no check run or status at all (or nothing is running and `name` never appeared), and
 * 'pending' only for a lone cancelled / skipped `name` with nothing else going. Our own statuses (laptop-e2e*,
 * auto-train/*, checker) are not CI and never make it 'running'. decide() reads success / failure only.
 */
export function ciLabel(rollup, name = 'check') {
  const s = ciState(rollup, name);
  if (s === 'success' || s === 'failure') return s;
  const ci = (rollup ?? []).filter((r) => r?.__typename !== 'StatusContext' || !isOwnContext(r.context));
  return checkWaitReason(ci, name) ? 'running' : s;
}
const isOwnContext = (c) => String(c).startsWith(LAPTOP_CONTEXT) || String(c).startsWith('auto-train/') || c === 'checker';

/** F50: the hard cap (min from first seen waiting) of a hold to a PR's expected CI finish (AUTO_TRAIN_CHECK_WAIT_CAP_MIN). */
export const CHECK_WAIT_CAP_MIN = 20;
/** F50: minutes added to the expected CI finish (AUTO_TRAIN_CHECK_WAIT_MARGIN_MIN). */
export const CHECK_WAIT_MARGIN_MIN = 2;

/**
 * F50: when the head's current CI run started (ms) or null: the earliest startedAt of the check runs `name` and its
 * siblings (CHECK_SIBLINGS, the jobs of the same workflow run) in a gh statusCheckRollup.
 */
export function ciRunStartedAt(rollup, name = 'check', siblings = CHECK_SIBLINGS) {
  const names = new Set([name, ...siblings]);
  const t = (rollup ?? []).filter((r) => r?.__typename !== 'StatusContext' && names.has(r?.name)).map((r) => Date.parse(r.startedAt ?? '')).filter((x) => x > 0);
  return t.length ? Math.min(...t) : null;
}

/**
 * F50: the typical CI time (min) from the open PR list already read (gh pr list ... statusCheckRollup): the median of
 * completedAt of a successful `name` check run minus ciRunStartedAt, over heads where that is over 1 and at most 60 min.
 * null under `minSamples` such heads (holdForChecks then holds the flat wait).
 */
export function typicalCiMin(prs, { name = 'check', minSamples = 3 } = {}) {
  const d = [];
  for (const p of prs ?? []) {
    const roll = p?.statusCheckRollup ?? [];
    const c = roll.find((r) => r?.__typename !== 'StatusContext' && r?.name === name && String(r.conclusion).toUpperCase() === 'SUCCESS');
    const end = Date.parse(c?.completedAt ?? '');
    const start = ciRunStartedAt(roll, name);
    if (!(end > 0) || start == null) continue;
    const min = (end - start) / 60_000;
    if (min > 1 && min <= 60) d.push(min);
  }
  if (d.length < minSamples) return null;
  d.sort((a, b) => a - b);
  const m = d.length >> 1;
  return d.length % 2 ? d[m] : (d[m - 1] + d[m]) / 2;
}

/**
 * Audit 2 item 1: hold the build while a train-ready PR's `check` is still running, so it rides this train.
 * `waiting` = [{ pr, branch, head, why, ciStartedAt? }] (train-ready PRs whose check is not success, `why` =
 * checkWaitReason, null when not running; `ciStartedAt` = ciRunStartedAt ms); `firstSeen` = { [head]: ISO } from the
 * last status (`checkWait`). F50 (train 131 gave up on #591 71 s before its CI finished): with `typicalMin`
 * (typicalCiMin) and a head's `ciStartedAt`, the head waits until its expected CI finish (ciStartedAt + typicalMin +
 * `marginMin`), at least `waitMin` and at most `capMin` from when it was first seen waiting; otherwise `waitMin` from
 * first seen (the old flat wait). waitMin 0: no hold. -> { hold, reason, waiting: [{ ...c, waitedMin, expired, untilMs }],
 * firstSeen } (the new map: only heads still waiting, so a green or failed head drops out).
 */
export function holdForChecks(waiting, now, firstSeen = {}, waitMin = CHECK_WAIT_MIN, { typicalMin = null, marginMin = CHECK_WAIT_MARGIN_MIN, capMin = CHECK_WAIT_CAP_MIN } = {}) {
  const next = {};
  const list = [];
  for (const c of waiting ?? []) {
    if (!c?.why || !c.head) continue;
    const t0 = Date.parse(firstSeen?.[c.head] ?? '') || now;
    next[c.head] = new Date(t0).toISOString();
    const waitedMin = Math.max(0, (now - t0) / 60_000);
    const flat = t0 + waitMin * 60_000;
    const expected = typicalMin > 0 && c.ciStartedAt > 0 ? c.ciStartedAt + (typicalMin + marginMin) * 60_000 : null;
    const untilMs = waitMin <= 0 ? t0 : expected == null ? flat : Math.min(Math.max(expected, flat), t0 + Math.max(capMin, waitMin) * 60_000);
    list.push({ ...c, waitedMin, expired: now >= untilMs, untilMs, ...(expected != null ? { expectedAt: expected } : {}) });
  }
  const live = list.filter((c) => !c.expired);
  const left = (c) => (c.expectedAt != null ? `, expected CI finish in ${Math.max(0, Math.ceil((c.untilMs - now) / 60_000))} min` : '');
  const anyExp = list.some((c) => c.expectedAt != null);
  const reason = live.length
    ? `holding the build ${anyExp ? `to the expected CI finish (CI start + ${Math.round(typicalMin * 10) / 10} + ${marginMin} min, cap ${capMin} min; else ${waitMin} min)` : `up to ${waitMin} min`} for ${live.map((c) => `#${c.pr} (${c.why}, ${Math.floor(c.waitedMin * 60)} s${left(c)})`).join(', ')}`
    : list.length ? `not waiting longer for ${list.map((c) => `#${c.pr}`).join(', ')} (${anyExp ? 'expected CI finish or cap passed' : `${waitMin} min passed`})` : '';
  return { hold: live.length > 0, reason, waiting: list, firstSeen: next };
}

/** A commit status context in a combined-status JSON (`gh api .../commits/<sha>/status`) -> { state, description } (state 'missing' when absent). */
export function contextStatus(combined, context) {
  const list = (combined?.statuses ?? []).filter((s) => s.context === context)
    .sort((a, b) => (Date.parse(b.updated_at || b.created_at || '') || 0) - (Date.parse(a.updated_at || a.created_at || '') || 0));
  if (!list.length) return { state: 'missing', description: '' };
  const s = String(list[0].state).toLowerCase();
  return { state: s === 'error' ? 'failure' : s, description: list[0].description ?? '', ...(s === 'error' ? { error: true } : {}) };
}

/**
 * When CI `name` turned green on a head (ms) or null: the newest successful check run's completedAt in the gh
 * statusCheckRollup, or the newest successful commit status' updated_at in the combined status.
 */
export function ciGreenAt(rollup, combined, name = 'check') {
  const runs = (rollup ?? []).filter((r) => r.__typename !== 'StatusContext' && r.name === name
    && String(r.status).toUpperCase() === 'COMPLETED' && String(r.conclusion).toUpperCase() === 'SUCCESS')
    .map((r) => Date.parse(r.completedAt || '') || 0);
  const statuses = (combined?.statuses ?? []).filter((s) => s.context === name && String(s.state).toLowerCase() === 'success')
    .map((s) => Date.parse(s.updated_at || s.created_at || '') || 0);
  const t = Math.max(0, ...runs, ...statuses);
  return t > 0 ? t : null;
}

/**
 * Laptop missing: minutes the train has waited for a `laptop-e2e` status since CI turned green (floored), or null
 * when CI is not green, the laptop has posted any status, the green time is unknown or under `thresholdMin` ago.
 */
export function laptopMissing({ ci, laptop, ciGreenAt: greenAt, now, thresholdMin = LAPTOP_MISSING_MIN }) {
  if (ci !== 'success' || laptop?.state !== 'missing' || !greenAt) return null;
  const waitMin = (now - greenAt) / 60_000;
  return waitMin >= thresholdMin ? Math.floor(waitMin) : null;
}

// ---- gh retry (F12: HTTP 499 error tick 2026-10-26 13:50): one retry of a failed read-only call per tick ----------

/** Seconds before the one retry of a failed read-only gh / git call (AUTO_TRAIN_GH_RETRY_S; 0 = no retry). */
export const GH_RETRY_S = 5;
/** A first try slower than this (ms) is not retried: a second slow wait would stall the tick. */
export const GH_RETRY_SLOW_MS = 30_000;

/**
 * Whether a failed read-only call (exec's { status, out, err, error, signal }) that took `ms` is worth one retry
 * (BRIEF A3): never on success, on a timeout (ETIMEDOUT or killed by a signal: exec already waited 120 s) or after a
 * first try over GH_RETRY_SLOW_MS; never on a definite HTTP 4xx (401 / 404 / 422 do not heal in seconds) except
 * HTTP 499 (the client closed the request); yes on HTTP 5xx, 499 and any other non-zero exit.
 */
export function ghRetryable(r, ms = 0) {
  if (!r || r.status === 0) return false;
  if (r.error?.code === 'ETIMEDOUT' || r.signal) return false;
  if (ms > GH_RETRY_SLOW_MS) return false;
  const text = `${r.err ?? ''}\n${r.out ?? ''}`;
  if (/HTTP 499\b/.test(text)) return true;
  return !/HTTP 4\d\d\b/.test(text);
}

/**
 * Runs `once()` (-> exec's result), timed by `now`; when ghRetryable, `waitMs` > 0 and `budget.left` > 0 (one retry
 * per tick: step resets it) it spends the budget, logs, waits `waitMs` through `wait` and runs `once()` again.
 * -> the last result.
 */
export function withRetry(once, { waitMs = GH_RETRY_S * 1000, wait, now = Date.now, budget = { left: 1 }, log = () => {}, what = 'read' } = {}) {
  const t0 = now();
  const r = once();
  if (!(waitMs > 0) || !(budget.left > 0) || !ghRetryable(r, now() - t0)) return r;
  budget.left--;
  log(`  ${what} failed (${r.status}: ${String(r.err || r.out).trim().split('\n').pop()?.slice(0, 200) ?? ''}): retrying in ${Math.round(waitMs / 1000)} s`);
  wait(waitMs);
  return once();
}

// ---- nothing new to release (F12: train 102 7 min late) ------------------------------------------------------------

/** merge-train build's exit when every member fragment is already in CHANGELOG.md (nothing pushed). */
export const NOTHING_NEW_EXIT = 6;

/** The sorted `<branch>@<head>` keys of the candidates that have a head (the PRs; feature/menu has none). */
export const memberHeads = (cands) => (cands ?? []).filter((c) => c?.branch && c.head).map((c) => `${c.branch}@${c.head}`).sort();

/**
 * The status of a `merge-train build` that exited NOTHING_NEW_EXIT (BRIEF A1). A new train -> 'idle' with `nothingNew:
 * { heads, master }` (nothingNewSkip skips the build while they stay); a rebuild after release exit 3 (`rebuildOf`) ->
 * 'failed', so step's failed() records `rebuildFailed` (an idle there would drop the open train).
 */
export function buildExitState({ n, base, cands = [], master = null, rebuildOf = null }) {
  if (rebuildOf) return { ...base, state: 'failed', reason: `train ${n}: nothing new to release (merge-train exit ${NOTHING_NEW_EXIT})` };
  return { ...base, state: 'idle', nothingNew: { heads: memberHeads(cands), master },
    reason: `train ${n}: nothing new to release (every member fragment is already in CHANGELOG.md): ${(base?.members ?? []).join(', ')}` };
}

/** True when the last status's `nothingNew` names the same candidate heads (any order) and master: the build would exit 6 again. */
export function nothingNewSkip(prev, cands, master) {
  const nn = prev?.nothingNew;
  if (!nn || !Array.isArray(nn.heads) || !nn.master || nn.master !== master) return false;
  const was = [...nn.heads].sort();
  const now = memberHeads(cands);
  return now.length === was.length && now.every((h, i) => h === was[i]);
}

/**
 * The status after a step: keeps the last `nothingNew` record until a status sets its own or a release moves master (a
 * deterministic key: the same heads on the same master give the same exit 6, also after a pacing wait or a hold).
 */
export function carryNothingNew(prev, status) {
  if (!status || 'nothingNew' in status || status.released || !prev?.nothingNew) return status;
  return { ...status, nothingNew: prev.nothingNew };
}

// ---- release without the deploy wait (F18: ~6 min per train) -------------------------------------------------------

/** Minutes after a release before a still-stale /preview/ gets `merge-train repair`, and after that before the watch closes (AUTO_TRAIN_DEPLOY_REPAIR_MIN; 0 = never repair). */
export const DEPLOY_REPAIR_MIN = 20;

/**
 * The deploy watch a release leaves (`deployWatch: { version, at, repaired }`, BRIEF A6), checked each tick against the
 * version /preview/ serves (`served`, null when unreadable). -> { action: 'none' | 'ok' | 'wait' | 'repair' | 'give-up',
 * reason }: ok (the version or a newer one is served; drop the watch); repair once `repairMin` after the release; give
 * up (drop the watch) `repairMin` after the repair; else wait. repairMin 0: watch only.
 */
export function deployPlan(watch, { now, served = null, repairMin = DEPLOY_REPAIR_MIN }) {
  if (!watch?.version) return { action: 'none', reason: 'no deploy watch' };
  const v = watch.version;
  if (served && (served === v || cmpVersion(served, v) > 0)) return { action: 'ok', reason: `/preview/ serves ${served} (released ${v})` };
  const ageMin = (now - (Date.parse(watch.at) || now)) / 60_000;
  const seen = served ? `serves ${served}` : 'unreadable';
  if (!watch.repaired) {
    if (repairMin > 0 && ageMin >= repairMin) return { action: 'repair', reason: `PREVIEW STALE ${Math.floor(ageMin)} min after ${v} (/preview/ ${seen}): merge-train repair` };
    return { action: 'wait', reason: `/preview/ ${seen}, waiting for ${v} (${Math.floor(ageMin)} min since the release)` };
  }
  const sinceMin = (now - (Date.parse(watch.repaired) || now)) / 60_000;
  if (sinceMin >= repairMin) return { action: 'give-up', reason: `PREVIEW STALE ${Math.floor(sinceMin)} min after the repair of ${v} (/preview/ ${seen}): watch closed, the watchdog's pages-behind alert is the orchestrator's` };
  return { action: 'wait', reason: `/preview/ ${seen}, waiting for ${v} (${Math.floor(sinceMin)} min since the repair)` };
}

/** The status after a step: `prev.deployWatch` rides along until a status sets its own (a new release's watch, or null: dropped). */
export function carryDeployWatch(prev, status) {
  if (!status || 'deployWatch' in status || !prev?.deployWatch) return status;
  return { ...status, deployWatch: prev.deployWatch };
}

/** Hours after which an open claim no longer counts as running (the service's LQ_CLAIM_MAX_H: a dead worker's). */
export const QUEUE_CLAIM_STALE_H = 3;
/** The id slug of spare work (laptop-queue lib requestId of SPARE_REQUESTER "laptop-queue spare"): it yields to a train. */
export const SPARE_ID_TAG = '-laptop-queue-spare-';

/**
 * Laptop queue (origin/laptop-queue) -> 'idle' | 'busy' for pacing (F19, BRIEF A8). `paths` = the branch's file paths
 * (requests/<id>.json, claims/<id>.json, alerts/...; kept for the caller, unused: requests no longer count);
 * `claims` = { [id]: { worker, at, done } } claim texts parsed. Busy only while the laptop runs something: an open claim
 * (not done, `at` under QUEUE_CLAIM_STALE_H old) with `worker` 'laptop' whose id is not spare work (SPARE_ID_TAG). A
 * desktop claim or an unclaimed request never holds a train (pacing was off from 2026-10-25 15:35 because they did).
 */
export function laptopQueueState(paths, { claims = {}, now = Date.now() } = {}) {
  return Object.entries(claims).some(([id, c]) => c && c.done === false && c.worker === 'laptop' && !id.includes(SPARE_ID_TAG)
    && now - Date.parse(c.at) < QUEUE_CLAIM_STALE_H * 3600_000) ? 'busy' : 'idle';
}

// ---- train-ready PRs without the label (F16: #460 missed train 103) ------------------------------------------------

/**
 * A PR's statuses re-read from its head's own combined status (`gh api .../commits/<head>/status`, BRIEF A4: gh's
 * statusCheckRollup reads `commits(last:1)`, newest by date, not always the head): true only when `combined.sha` is
 * the PR's head and the train-ready rule still passes with that status's `checker` and `affected-e2e`. `pr` = the flat
 * PR of splitCandidates.
 */
export function headStatusAgrees(pr, combined, { requireAffected = true } = {}) {
  if (!pr?.head || !combined?.sha || combined.sha !== pr.head) return false;
  const statuses = { ...pr.statuses };
  for (const ctx of [tr.CHECKER_CONTEXT, tr.AFFECTED_CONTEXT]) {
    const s = contextStatus(combined, ctx);
    if (s.state === 'missing') delete statuses[ctx];
    else statuses[ctx] = { state: s.state, description: s.description, ...(s.error ? { error: true } : {}) };
  }
  return tr.trainReady({ ...pr, statuses }, { requireAffected }).ready;
}

/**
 * The open PRs to master (gh pr list: number, headRefName, headRefOid, title, isDraft, mergeable, labels,
 * statusCheckRollup) -> { cands, waiting, ruleReady, held }. Labelled (`train-ready`): a green `check` is a candidate,
 * else waiting (as before F16). Unlabelled, with `unlabelled` on (AUTO_TRAIN_UNLABELLED): the train-ready rule
 * (scripts/train-ready.mjs) on the head, then `heldOff(flat)` (lost the label since this head: out) and `agrees(flat)`
 * (headStatusAgrees on the head's combined status) -> a candidate with `unlabelled: true` (also in `ruleReady`); one
 * that fails the rule only on a `check` CI is still running toward goes to `waiting` (F23: it holds the build like a
 * labelled one). `held` = [{ pr, branch, head, why }] kept out by heldOff / agrees. The injected checks default to "out".
 * F34 (#487 rode train 122 as a draft): a draft goes to `drafts` before any other rule, labelled or not.
 */
export function splitCandidates(prs, { unlabelled = true, heldOff = () => true, agrees = () => false } = {}) {
  const cands = [];
  const waiting = [];
  const ruleReady = [];
  const held = [];
  const drafts = [];
  for (const p of prs ?? []) {
    const rollup = p.statusCheckRollup ?? [];
    const c = { pr: p.number, branch: p.headRefName, head: p.headRefOid, title: p.title };
    if (p.isDraft) { drafts.push(c); continue; }
    const labels = (p.labels ?? []).map((l) => (typeof l === 'string' ? l : l?.name)).filter(Boolean);
    if (labels.includes(LABEL)) {
      if (ciState(rollup, 'check') === 'success') cands.push(c);
      else waiting.push({ ...c, why: checkWaitReason(rollup, 'check'), ci: ciLabel(rollup, 'check') });
      continue;
    }
    if (!unlabelled) continue;
    const flat = { ...c, draft: !!p.isDraft, mergeable: p.mergeable ?? 'UNKNOWN', labels, check: ciState(rollup, 'check'), statuses: tr.statusesFromRollup(rollup) };
    const ready = tr.trainReady(flat).ready;
    const why = ready ? null : checkWaitReason(rollup, 'check');
    if (!ready && !(why && tr.trainReady({ ...flat, check: 'success' }).ready)) continue;
    if (heldOff(flat)) { held.push({ ...c, why: `${LABEL} was removed on this head` }); continue; }
    if (!agrees({ ...flat, check: 'success' })) { held.push({ ...c, why: `its head's own status disagrees with the rollup (${tr.CHECKER_CONTEXT} / ${tr.AFFECTED_CONTEXT})` }); continue; }
    if (ready) { cands.push({ ...c, unlabelled: true }); ruleReady.push(c); } else waiting.push({ ...c, why, ci: ciLabel(rollup, 'check'), unlabelled: true });
  }
  return { cands, waiting, ruleReady, held, drafts };
}

/**
 * F34: the drafts splitCandidates dropped -> { lines, draftSkipped: [pr], draftHeads: { [pr]: head8 } }. A log line
 * ("#<n> draft: not a candidate") only for a draft whose head differs from `prevHeads` (the last status's draftHeads),
 * so each draft head is logged once.
 */
export function draftNotes(drafts, prevHeads = {}) {
  const draftHeads = {};
  const lines = [];
  for (const d of drafts ?? []) {
    draftHeads[d.pr] = short(d.head); // 8 chars: the status line stays short with ~30 open drafts
    if (prevHeads?.[d.pr] !== draftHeads[d.pr]) lines.push(`  #${d.pr} draft: not a candidate (${d.branch} ${short(d.head)})`);
  }
  return { lines, draftSkipped: (drafts ?? []).map((d) => d.pr), draftHeads };
}

/** F34: the status with `draftSkipped` / `draftHeads` from this step's PR list (`notes`), else the last status's (no list read). None: no keys. */
export function withDrafts(status, notes, prev) {
  const src = notes ?? prev;
  const { draftSkipped: _s, draftHeads: _h, ...out } = status ?? {};
  return src?.draftSkipped?.length ? { ...out, draftSkipped: src.draftSkipped, draftHeads: src.draftHeads ?? {} } : out;
}

/**
 * BRIEF A5: `train-ready` is added to every unlabelled member (`unlabelled: true`) right before `merge-train build`
 * through `add(pr)` (throws on failure), so auto-drop, left-out, the watchdog's G325 check and the laptop queue see one
 * label. A member whose add fails, or under `dry` (the add is only printed), is left out of this build.
 * -> { members: the rest, left: [{ pr, branch, why }] }.
 */
export function labelTaken(members, { add, dry = false, log = () => {} } = {}) {
  const kept = [];
  const left = [];
  for (const m of members ?? []) {
    if (!m?.unlabelled || !m.pr) { kept.push(m); continue; }
    let why = null;
    try { add(m.pr); if (dry) why = 'dry run: label not added'; } catch (e) { why = `adding ${LABEL} failed: ${String(e?.message ?? e).slice(0, 200)}`; }
    if (why) { left.push({ pr: m.pr, branch: m.branch, why }); log(`  #${m.pr} ${m.branch}: left out (${why})`); continue; }
    log(`  #${m.pr} ${m.branch}: ${LABEL} added (train-ready by rule on ${short(m.head)})`);
    kept.push(m);
  }
  return { members: kept, left };
}

// ---- re-read at build start (F23: #521 missed train 119 by 27 s) ---------------------------------------------------

/** The `<branch>@<head>` keys of a candidate list (feature/menu with an empty head). */
const memberKeys = (cands) => (cands ?? []).map((c) => `${c.branch}@${c.head ?? ''}`).sort();

/** True when two candidate lists have the same branch@head set (any order). */
export function sameMembers(a, b) {
  const x = memberKeys(a);
  const y = memberKeys(b);
  return x.length === y.length && x.every((k, i) => k === y[i]);
}

/** "+<branch>" for each new or moved member of `b`, "-<branch>" for each one gone since `a` (log text). */
export function memberChanges(a, b) {
  const ka = new Set(memberKeys(a));
  const kb = new Set(memberKeys(b));
  return [...(b ?? []).filter((c) => !ka.has(`${c.branch}@${c.head ?? ''}`)).map((c) => `+${c.branch}`),
    ...(a ?? []).filter((c) => !kb.has(`${c.branch}@${c.head ?? ''}`)).map((c) => `-${c.branch}`)];
}

/**
 * BRIEF A11: the candidates read at build start (`reread()`), planned (`plan(cands)`), then read once more; a changed
 * set (a PR that turned green while the plan read fragments, or a moved head) is planned again from that second read.
 * At most `passes` plans (1 = one read and one plan). -> { cands, p, changed } (changed: memberChanges, [] when equal).
 */
export async function freshPlan({ reread, plan, passes = 2 }) {
  const c1 = await reread();
  const p1 = await plan(c1);
  if (passes < 2) return { cands: c1, p: p1, changed: [] };
  const c2 = await reread();
  if (sameMembers(c1, c2)) return { cands: c1, p: p1, changed: [] };
  return { cands: c2, p: await plan(c2), changed: memberChanges(c1, c2) };
}

/**
 * Self-update of the checkout the scripts run from, on an idle tick or right after a release: { action: 'none' |
 * 'update' | 'skip', reason }. Updates (a detached checkout of origin/master) only when HEAD differs from it, the
 * working tree is clean and the move is a fast-forward (`ff` = HEAD is an ancestor of origin/master; undefined = not
 * checked). `when` names the trigger in the log line.
 */
export function selfUpdatePlan({ head, master, dirty, ff, when = '' }) {
  if (!head || !master) return { action: 'skip', reason: 'self-update skipped: could not read HEAD or origin/master' };
  if (head === master) return { action: 'none', reason: `up to date at ${head.slice(0, 8)}` };
  if (dirty) return { action: 'skip', reason: `self-update skipped: the working tree is not clean (HEAD ${head.slice(0, 8)}, origin/master ${master.slice(0, 8)})` };
  if (ff === false) return { action: 'skip', reason: `self-update skipped: origin/master ${master.slice(0, 8)} is not a fast-forward of HEAD ${head.slice(0, 8)}` };
  return { action: 'update', reason: `self-updated to ${master.slice(0, 8)}${when ? ` (${when})` : ''}` };
}

/** Local calendar day key (YYYY-MM-DD) of a time in ms. */
const dayKey = (ms) => new Date(ms).toLocaleDateString('en-CA');

/**
 * Pacing for building the next train: null (go) or the reason to wait. `releases` = merge times (ms) of train PRs;
 * `queue` = 'idle' | 'busy' | null (no laptop queue branch: interval only). Builds once the newest release is
 * `minIntervalMin` old, or earlier when the laptop queue is idle; `maxPerDay` (0 = off) caps today's releases.
 */
export function pacing({ now, releases = [], minIntervalMin = 60, maxPerDay = 0, queue = null }) {
  if (maxPerDay > 0) {
    const today = releases.filter((t) => dayKey(t) === dayKey(now)).length;
    if (today >= maxPerDay) return `max ${maxPerDay} releases per day reached (${today} today)`;
  }
  if (!minIntervalMin || !releases.length) return null;
  const ageMin = (now - Math.max(...releases)) / 60_000;
  if (ageMin >= minIntervalMin) return null;
  if (queue === 'idle') return null;
  return `last release ${Math.floor(ageMin)} min ago (< ${minIntervalMin}) and laptop queue ${queue ?? 'unknown (no laptop-queue branch)'}`;
}

/**
 * The state machine. `train` = null or { n, head, version, ci, laptop: { state, description }, vitest: state,
 * ageMin, ciGreenAt (ms or null) }; `candidates` = the build members after filtering (tips, docs-only menu included);
 * `paceReason` = pacing(); `now` and `laptopMissingMin` feed laptopMissing().
 * -> { state, action: 'release' | 'build' | 'none', reason } (+ waitingMin on 'laptop-missing').
 */
export function decide({ train, candidates = [], paceReason = null, now = Date.now(), laptopMissingMin = LAPTOP_MISSING_MIN }) {
  if (train) {
    const t = `train ${train.n}`;
    if (!train.version) return { state: 'error', action: 'none', reason: `${t}: no version in its version commit, title or CHANGELOG` };
    // A train whose build died before the version commit must never release (the old-style path merges untested work).
    if (!train.versionCommit) return { state: 'error', action: 'none', reason: `train ${train.n} has no version commit: rebuild` };
    if (train.vitest === 'failure') return { state: 'failed', action: 'none', reason: `${t}: vitest failed at build on ${short(train.head)}` };
    if (train.ci === 'failure') return { state: 'failed', action: 'none', reason: `${t}: CI check failed on ${short(train.head)}` };
    // A desktop failure whose laptop rerun passed on this head (`laptop-e2e/train<n>-rerun` success in the head's
    // combined status) is releasable: Orchestrator, "treat a laptop pass as releasable". On master's request.mjs the
    // rerun posts only that context, never `laptop-e2e` success, so without this the train would wait forever.
    // a confirm rerun (confirmPlan; `train.confirm` = its suites, from the status's rerun record) releases the same way,
    // so a lost laptop-e2e success post never leaves the train waiting
    const rerunSuites = train.laptop.state === 'failure' && train.rerun?.state === 'success' ? desktopFailSuites(train.laptop.description) ?? (train.confirm?.length ? train.confirm : null) : null;
    if (rerunSuites?.length && train.ci === 'success') {
      return { state: 'releasing', action: 'release', rerunRelease: rerunSuites,
        reason: `${t}: CI green and the laptop rerun of ${rerunSuites.join(',')} passed (${rerunContext(train.n)} success on ${short(train.head)}; ${train.confirm?.length && !desktopFailSuites(train.laptop.description) ? 'confirm rerun of a laptop' : 'desktop'} ${LAPTOP_CONTEXT} failure)` };
    }
    if (train.laptop.state === 'failure') {
      return { state: 'failed', action: 'none', reason: `${t}: ${LAPTOP_CONTEXT} failed on ${short(train.head)}${train.laptop.description ? ` (${train.laptop.description})` : ''}` };
    }
    if (train.ci === 'success' && train.laptop.state === 'success') return { state: 'releasing', action: 'release', reason: `${t}: CI and laptop green (${train.laptop.description || 'pass'})` };
    if (train.laptop.state === 'missing' && train.ageMin >= STALE_HOURS * 60) {
      return { state: 'stale', action: 'none', reason: `${t}: no ${LAPTOP_CONTEXT} status ${Math.round(train.ageMin)} min after ${short(train.head)} was pushed` };
    }
    const waitingMin = laptopMissing({ ci: train.ci, laptop: train.laptop, ciGreenAt: train.ciGreenAt, now, thresholdMin: laptopMissingMin });
    if (waitingMin != null) {
      return { state: 'laptop-missing', action: 'none', waitingMin, reason: `${t}: no ${LAPTOP_CONTEXT} status ${waitingMin} min after CI went green on ${short(train.head)}` };
    }
    return { state: 'pending', action: 'none', reason: `${t}: CI ${train.ci}, laptop ${train.laptop.state}${train.laptop.description ? ` (${train.laptop.description})` : ''}` };
  }
  if (!candidates.some((c) => c.pr)) return { state: 'idle', action: 'none', reason: `no open ${LABEL} PR with a green check` };
  if (paceReason) return { state: 'waiting', action: 'none', reason: paceReason };
  return { state: 'building', action: 'build', reason: `${candidates.length} member(s): ${candidates.map((c) => c.branch).join(', ')}` };
}

/** The build arguments: { version, title, branches } from master's version and each candidate's fragment (null = missing). */
export function planBuild(masterVersion, members) {
  const prs = members.filter((m) => m.pr);
  const kind = releaseKind(prs.map((m) => m.fragment ?? null));
  const titles = prs.map((m) => (m.fragment ? fragmentInfo(m.fragment).title : null) ?? m.title);
  return { version: bumpVersion(masterVersion, kind), kind, title: joinTitles(titles) || 'docs', branches: members.filter((m) => m.build !== false).map((m) => m.branch) };
}

/**
 * The exit-3 loop guard: true when the last status recorded a failed rebuild for this train head and master has not
 * moved since (release would exit 3 and the rebuild fail again).
 */
export function rebuildSkip(prev, head, master) {
  const r = prev?.rebuildFailed;
  return !!r && !!head && !!master && r.head === head && r.master === master;
}

/** The release argv for an open train: pinned to its tested head, never the old-style fallback. */
export const releaseArgs = (t) => ['release', String(t.n), t.version, t.title, '--head', t.head, '--no-fallback', ...(t.resume ? ['--resume'] : [])];

/** Status, log and lock file paths in `scratch`; a dry run gets its own (*.dryrun.*), so it never touches the real ones. */
export function scratchFiles(scratch, dry) {
  const x = dry ? '.dryrun' : '';
  return {
    lock: path.join(scratch, `auto-train${x}.lock`),
    log: path.join(scratch, 'runs', `auto-train${x}.log`),
    status: path.join(scratch, `auto-train-status${x}.json`),
    realStatus: path.join(scratch, 'auto-train-status.json'),
    building: buildMarkerPath(scratch, dry),
  };
}

// ---- build marker (audit 2026-10-24 item 3): the laptop queue sees a `merge-train build` until its version commit is pushed

/** The build marker in `scratch`: auto-train-building.json (a dry run: auto-train-building.dryrun.json). */
export const buildMarkerPath = (scratch, dry) => path.join(scratch, `auto-train-building${dry ? '.dryrun' : ''}.json`);

/** Writes the marker { train, version, pid, at } through `fsi` (injected fs); never throws: true when written. */
export function writeBuildMarker(file, { train, version, pid = process.pid, at = new Date().toISOString() }, fsi = fs) {
  try {
    fsi.mkdirSync(path.dirname(file), { recursive: true });
    fsi.writeFileSync(file, `${JSON.stringify({ train, version, pid, at })}\n`);
    return true;
  } catch { return false; }
}

/** Deletes the marker through `fsi`; never throws (absent is fine): true when gone. */
export function clearBuildMarker(file, fsi = fs) {
  try { fsi.rmSync(file, { force: true }); return true; } catch { return false; }
}

/** Runs `fn` with the marker written just before and deleted in a finally (also when `fn` throws or rejects). */
export async function withBuildMarker(file, info, fn, fsi = fs) {
  writeBuildMarker(file, info, fsi);
  try { return await fn(); } finally { clearBuildMarker(file, fsi); }
}

// ---- laptop rerun after a desktop failure (audit 2026-10-24 item 2) ----------------------------------------------

/** The desktop worker's `laptop-e2e` description prefix (scripts/laptop-queue/service.mjs, LQ_WORKER=desktop). */
export const DESKTOP_PREFIX = 'desktop:';
/** The rerun's request set and its failure context (`laptop-e2e/<set>`; a pass posts `laptop-e2e` itself). */
export const rerunSet = (n) => `train${n}-rerun`;
export const rerunContext = (n) => `${LAPTOP_CONTEXT}/${rerunSet(n)}`;

/**
 * The failed suites of a desktop `laptop-e2e` description ("desktop: 37/39 pass, 512 s; known flaky: x; FAIL: a,b",
 * scripts/laptop-queue/lib.mjs describe): null when it is not the desktop's; [] when no suite list can be trusted (no
 * "FAIL:" part, a list cut by the 140-char limit ("..."), or an odd name).
 */
export function desktopFailSuites(description) {
  const d = String(description ?? '').trim();
  if (!d.startsWith(DESKTOP_PREFIX)) return null;
  return failSuites(d);
}

/**
 * The failed suites of any `laptop-e2e` description, the laptop's or the desktop's ("[desktop: ]37/39 pass, 512 s;
 * known flaky: x; FAIL: a,b"): [] when no suite list can be trusted (no "FAIL:" part, a list cut by the 140-char limit
 * ("..."), or an odd name).
 */
export function failSuites(description) {
  const m = /;\s*FAIL:\s*(.*)$/.exec(String(description ?? '').trim());
  if (!m || m[1].trim().endsWith('...')) return [];
  const suites = m[1].split(',').map((s) => s.trim()).filter(Boolean);
  if (!suites.every((s) => /^[A-Za-z0-9._:+-]+$/.test(s))) return [];
  return [...new Set(suites)];
}

/**
 * One laptop rerun per train head after a desktop failure. `train` as in decide() plus `rerun` (the
 * `laptop-e2e/train<n>-rerun` status); `prev` = the last status JSON (its `rerun: { head, id, suites, set, at }` and
 * `rerunRequestFailed: { head, exit, why, count }`); `now` and `staleMin` time a recorded rerun out.
 * -> null (not a desktop laptop failure, or no suites: decide() keeps "failed"; or the rerun passed on this head with
 * CI green: decide() releases), or { action: 'request' | 'wait' | 'none', state, reason, suites, set } (+ `rerun` =
 * the recorded request for this head, `requestFailed` = the failed-request record for this head).
 * States: laptop-rerun (request / wait), failed (the rerun failed), rerun-stale (no verdict `staleMin` min after the
 * request), rerun-request-failed (RERUN_REQUEST_MAX failed requests on this head).
 */
export function rerunPlan(train, prev, { now = Date.now(), staleMin = RERUN_STALE_MIN } = {}) {
  if (!train || train.laptop?.state !== 'failure' || train.vitest === 'failure' || train.ci === 'failure') return null;
  const suites = desktopFailSuites(train.laptop.description);
  if (!suites?.length) return null;
  const t = `train ${train.n}`;
  const set = rerunSet(train.n);
  const r = train.rerun ?? { state: 'missing', description: '' };
  // the rerun passed on this head and CI is green: decide() releases (the normal release path)
  if (r.state === 'success' && train.ci === 'success') return null;
  const rec = prev?.rerun && prev.rerun.head === train.head ? prev.rerun : null;
  if (!rec) {
    const failed = prev?.rerunRequestFailed && prev.rerunRequestFailed.head === train.head ? prev.rerunRequestFailed : null;
    const tries = failed ? Number(failed.count) || 1 : 0;
    if (tries >= RERUN_REQUEST_MAX) {
      return { action: 'none', state: 'rerun-request-failed', suites, set, requestFailed: failed,
        reason: `${t}: the laptop rerun request of ${suites.join(',')} on ${short(train.head)} failed ${tries} times (last: exit ${failed.exit}: ${failed.why}); not retried` };
    }
    return { action: 'request', state: 'laptop-rerun', suites, set, ...(failed ? { requestFailed: failed } : {}),
      reason: `${t}: desktop failed ${suites.join(',')} on ${short(train.head)}: requesting one laptop rerun (${set})${tries ? `, try ${tries + 1}/${RERUN_REQUEST_MAX}` : ''}` };
  }
  const recSuites = rec.suites ?? suites;
  if (r.state === 'success') {
    return { action: 'wait', state: 'laptop-rerun', suites: recSuites, set, rerun: rec,
      reason: `${t}: laptop rerun ${rec.id} of ${recSuites.join(',')} passed on ${short(train.head)}; waiting for CI check (${train.ci})` };
  }
  const ageMin = (now - Date.parse(rec.at)) / 60_000;
  if (r.state !== 'failure' && ageMin >= staleMin) {
    return { action: 'none', state: 'rerun-stale', suites: recSuites, set, rerun: rec,
      reason: `${t}: laptop rerun ${rec.id} of ${recSuites.join(',')} on ${short(train.head)}: no ${rerunContext(train.n)} verdict ${Math.floor(ageMin)} min after the request (${r.state === 'missing' ? 'no status' : r.state})` };
  }
  if (r.state === 'failure') {
    return { action: 'none', state: 'failed', suites: recSuites, set, rerun: rec,
      reason: `${t}: laptop rerun ${rec.id} of ${recSuites.join(',')} failed on ${short(train.head)}${r.description ? ` (${r.description})` : ''}` };
  }
  return { action: 'wait', state: 'laptop-rerun', suites: recSuites, set, rerun: rec,
    reason: `${t}: laptop rerun ${rec.id} of ${recSuites.join(',')} on ${short(train.head)} ${r.state === 'missing' ? 'queued' : r.state}` };
}

/** request.mjs arguments of the rerun (scripts/laptop-queue/request.mjs; `--train-rerun` runs it right after trains). */
export const rerunArgs = ({ sha, suites, pr, set, confirm = false }) => ['--sha', sha, '--suites', suites.join(' '), '--pr', String(pr), '--set', set,
  '--requester', 'auto-train', '--train-rerun', ...(confirm ? ['--note', 'confirm rerun'] : [])];

// ---- fast poll (audit 2 item 3): a waiting tick re-checks every minute instead of waiting for the next 5-min run ----

/** Seconds between fast polls (AUTO_TRAIN_FAST_POLL_S) and the window from the tick's start (AUTO_TRAIN_FAST_POLL_MAX_MIN). */
export const FAST_POLL_S = 60;
export const FAST_POLL_MAX_MIN = 4;
/**
 * Seconds between fast polls once the train's laptop-e2e pending status is older than its expected wall (laptopLate;
 * AUTO_TRAIN_FAST_POLL_LATE_S): the verdict is due, so a release waits under a minute for it (Orchestrator waste audit
 * 2026-10-24: release lag was 1.3-2.7 min at 60 s).
 */
export const FAST_POLL_LATE_S = 30;
/** Minutes a train's laptop run is expected to take when its pending status names no "expect ~N s" (laptopLate). */
export const LAPTOP_EXPECT_MIN = 10;

/** When the newest status of `context` went pending (ms), or null when it is not pending or its time is unreadable. */
export function pendingSince(combined, context) {
  const list = (combined?.statuses ?? []).filter((s) => s.context === context)
    .sort((a, b) => (Date.parse(b.updated_at || b.created_at || '') || 0) - (Date.parse(a.updated_at || a.created_at || '') || 0));
  if (!list.length || String(list[0].state).toLowerCase() !== 'pending') return null;
  return Date.parse(list[0].updated_at || list[0].created_at || '') || null;
}

/**
 * True when the laptop's pending verdict is due: `since` (pendingSince) is older than the expected wall, the laptop
 * service's "expect ~N s" in the description (the heaviest shard, posted when the suites start) or `defaultMin`.
 */
export function laptopLate({ since, description = '', now, defaultMin = LAPTOP_EXPECT_MIN }) {
  if (!since) return false;
  const m = /expect ~(\d+) s/.exec(String(description));
  const expectMs = m ? Number(m[1]) * 1000 : defaultMin * 60_000;
  return now - since > expectMs;
}
/** The waiting states a tick keeps polling: an open train waiting on CI / the laptop / a laptop rerun, or the build hold. */
export const FAST_POLL_STATES = ['pending', 'laptop-rerun', 'holding'];

/**
 * Whether the tick polls again (it keeps its tick lock): `state` = this step's state, `startedAt` / `now` in ms,
 * opts { pollS, maxMin, once, dry, prevState } (`prevState` = the state before this step, null on the first one).
 * Polls only in a waiting state (FAST_POLL_STATES), never under --once or --dry-run, stops on any state change, and
 * only while the next poll starts within `maxMin` of the tick's start (4: done before the next 5-min task run).
 * `late` (laptopLate: the laptop verdict is past its expected wall) polls every `lateS` s instead, when shorter.
 * -> { poll, delayMs, reason }.
 */
export function fastPollPlan(state, startedAt, now, { pollS = FAST_POLL_S, maxMin = FAST_POLL_MAX_MIN, once = false, dry = false, prevState = null, late = false, lateS = FAST_POLL_LATE_S } = {}) {
  const no = (reason) => ({ poll: false, delayMs: 0, reason });
  if (once) return no('--once');
  if (dry) return no('dry run');
  if (!(pollS > 0) || !(maxMin > 0)) return no('fast poll off');
  if (prevState != null && state !== prevState) return no(`state changed (${prevState} -> ${state})`);
  if (!FAST_POLL_STATES.includes(state)) return no(`${state} is not a waiting state`);
  const s = late && lateS > 0 && lateS < pollS ? lateS : pollS;
  const delayMs = s * 1000;
  const at = now + delayMs - startedAt;
  if (at > maxMin * 60_000) return no(`fast poll window over (${maxMin} min)`);
  return { poll: true, delayMs, reason: `${state}: polling again in ${s} s${s !== pollS ? ' (laptop verdict due)' : ''} (${Math.round(at / 1000)} s into the tick, up to ${maxMin} min)` };
}

/** True when every path is documentation (Markdown anywhere or under docs/). */
export const docsOnly = (files) => files.length > 0 && files.every((f) => /\.md$/i.test(f) || f.startsWith('docs/'));

// ---- auto-drop on a failed train (Michael 2026-10-24 ~21:00, "Auto-drop on failure"; --no-autodrop: the old wait) ----

/** A suite job name without its part ("e2e-ctcourse:4" -> "e2e-ctcourse"). */
export const suiteBase = (s) => String(s ?? '').trim().split(':')[0];

/**
 * The failing asserts of the newest laptop-queue failure comment on this head (scripts/laptop-queue/service.mjs
 * failureComment: "laptop-e2e failed on <sha8> (<ref>)." then "**<suite>**\nFailing assert: `<line>`" per suite).
 * `bodies` = the PR's comment bodies, oldest first. -> { [suite]: assert ('' for "none found") }, {} without one.
 */
export function failureAsserts(bodies, head) {
  const tag = `laptop-e2e failed on ${short(head)}`;
  const body = [...(bodies ?? [])].reverse().find((b) => head && String(b).startsWith(tag));
  const out = {};
  for (const m of String(body ?? '').replace(/\r\n/g, '\n').matchAll(/^\*\*(\S+)\*\*\nFailing assert: `(.*)`$/gm)) {
    if (!(m[1] in out)) out[m[1]] = m[2] === 'none found' ? '' : m[2];
  }
  return out;
}

/**
 * Whether a failed open train is auto-dropped: `d` = decide(), `rp` = rerunPlan(). -> null (not a laptop failure: CI
 * red, build-time vitest, a desktop failure still on its laptop rerun, rerun-stale, ...) or { failing, reason }:
 * failing = the description's FAIL list (the rerun's own description, else the suites it reran), [] when unknown.
 */
export function autoDropCase(train, d, rp) {
  if (!train) return null;
  if (rp) {
    if (rp.state !== 'failed') return null;
    // a rerun with no FAIL list (service error, a slot gave no result, build failed) is no member's failure
    const own = failSuites(train.rerun?.description);
    if (!own.length) return null;
    return { failing: own, reason: rp.reason };
  }
  if (d?.state !== 'failed' || train.laptop?.state !== 'failure' || train.ci === 'failure' || train.vitest === 'failure') return null;
  // a desktop failure whose FAIL list is cut (no laptop rerun was possible) stays "failed" for the orchestrator
  if (desktopFailSuites(train.laptop.description) !== null) return null;
  // confirm: the train's own first failure; a guessed drop (tier 2-3) waits for one rerun first (confirmPlan)
  return { failing: failSuites(train.laptop.description), reason: d.reason, confirm: true };
}

/** At most this many failing suites (distinct, parts as their suite) are auto-dropped; more is master / the machine, not a member. */
export const AUTODROP_MAX_SUITES = 3;

/**
 * The failing suites (as their base suite) that the last auto-dropped train (`lastDrop: { train, failing }`, carried in
 * the status) also failed: a repeat points at master or a flake, not a member, so no drop. A record of train `n`
 * itself (a retried drop of the same train) never counts.
 */
export function repeatedSuites(lastDrop, failing, n) {
  if (!lastDrop?.failing?.length || lastDrop.train === n) return [];
  const before = new Set(lastDrop.failing.map(suiteBase));
  return [...new Set((failing ?? []).map(suiteBase))].filter((s) => before.has(s));
}

/** The status after a step: keeps the last auto-drop record (`lastDrop`) until a release or a newer drop replaces it. */
export function carryLastDrop(prev, status) {
  if (!status || status.lastDrop || status.released || !prev?.lastDrop) return status;
  return { ...status, lastDrop: prev.lastDrop };
}

/**
 * Which members leave a train whose laptop run failed `failing` (suite names, parts allowed). members = [{ pr, branch,
 * files, labeledAt }] (files: the member's `git diff --name-only origin/master...<head>`; labeledAt: ms the
 * `train-ready` label was last added, or null). Never the docs member (feature/menu) nor a member without a PR.
 * Tier 1: every member whose `--affected` suites (scripts/e2e-affected.mjs DIRECT_COVERS, the narrow map: fewer
 * over-drops than the --quick map; `map` overrides it) include a failing suite.
 * Tier 2 (none matched): the member with the most src/ files under the failing suites' folders (coverFolders: any
 * QUICK_COVERS row naming the suite, the broad map).
 * Tier 3 (all zero, or a tie at the top: then among the tied): the newest-labelled member (higher PR number on a tie).
 * Docs-only members never leave in tiers 2-3; a train with one code member drops it (tier 3).
 * -> { drops: [{ pr, branch, suite, tier }], reason } (drops [] when nothing can be dropped: reason says why).
 */
export function pickDrops(members, failing, { map = DIRECT_COVERS } = {}) {
  const fails = [...new Set((failing ?? []).map(suiteBase).filter(Boolean))];
  const pool = (members ?? []).filter((m) => m?.pr && m.branch !== MENU_BRANCH);
  if (!fails.length) return { drops: [], reason: 'no failing suite named' };
  if (!pool.length) return { drops: [], reason: 'no member with a PR besides the docs member' };
  if (fails.length > AUTODROP_MAX_SUITES) return { drops: [], reason: `${fails.length} suites failed (over ${AUTODROP_MAX_SUITES}: master or the machine, not one member)` };
  const code = pool.filter((m) => !docsOnly(m.files ?? []));
  const tier1 = pool.flatMap((m) => {
    const s = suiteSetFor(m.files ?? [], map);
    const hit = fails.find((f) => s.has(f));
    return hit ? [{ pr: m.pr, branch: m.branch, suite: hit, tier: 1 }] : [];
  });
  if (tier1.length && code.length >= 2 && code.every((m) => tier1.some((x) => x.pr === m.pr))) {
    return { drops: [], reason: `every code member (${code.map((m) => `#${m.pr}`).join(', ')}) touches ${fails.join(',')}: not dropping the whole train` };
  }
  if (tier1.length) return { drops: tier1, reason: `${tier1.map((x) => `#${x.pr}`).join(', ')} touch the failing suite (--affected map)` };
  if (!code.length) return { drops: [], reason: 'every member is docs-only' };
  const scored = code.map((m) => {
    const src = (m.files ?? []).filter((f) => f.startsWith('src/'));
    let best = { suite: fails[0], n: 0 };
    for (const s of fails) {
      const folders = coverFolders(s);
      const n = src.filter((f) => folders.some((p) => f.startsWith(p))).length;
      if (n > best.n) best = { suite: s, n };
    }
    return { m, ...best };
  });
  const top = Math.max(...scored.map((x) => x.n));
  const lead = scored.filter((x) => x.n === top);
  if (top > 0 && lead.length === 1) {
    const x = lead[0];
    return { drops: [{ pr: x.m.pr, branch: x.m.branch, suite: x.suite, tier: 2 }], reason: `no member maps to ${fails.join(',')}; #${x.m.pr} has the most src/ files under its folders (${top})` };
  }
  const among = top > 0 ? lead : scored;
  const x = [...among].sort((a, b) => (b.m.labeledAt ?? -Infinity) - (a.m.labeledAt ?? -Infinity) || b.m.pr - a.m.pr)[0];
  const why = code.length === 1 ? 'the only code member' : top > 0 ? `a tie at ${top} src/ files under its folders, newest ${LABEL}` : `no member touches its folders, newest ${LABEL}`;
  return { drops: [{ pr: x.m.pr, branch: x.m.branch, suite: x.suite, tier: 3 }], reason: `no member maps to ${fails.join(',')}; #${x.m.pr}: ${why}` };
}

/**
 * Confirm before a guess (laptop-queue-5): the train's own laptop failure whose drop is a guess (every pick tier 2-3: no
 * member maps to the failing suite) first reruns the failing suites once on the same head (request.mjs --train-rerun,
 * set train<n>-rerun, recorded as `rerun` like a desktop rerun); only a failed rerun drops, a pass posts laptop-e2e
 * success and the train releases. -> null (drop now: a tier-1 pick, or the rerun failed) or a rerunPlan-shaped
 * { action: 'request' | 'wait' | 'none', state, reason, suites, set } (+ `requestFailed`).
 */
export function confirmPlan(train, prev, drops, failing, { now = Date.now(), staleMin = RERUN_STALE_MIN } = {}) {
  if (!train || !drops?.length || drops.some((x) => x.tier === 1)) return null;
  const t = `train ${train.n}`;
  const set = rerunSet(train.n);
  const rec = prev?.rerun && prev.rerun.head === train.head ? prev.rerun : null;
  const suites = rec?.suites ?? [...new Set(failing ?? [])];
  if (!rec) {
    const failed = prev?.rerunRequestFailed && prev.rerunRequestFailed.head === train.head ? prev.rerunRequestFailed : null;
    const tries = failed ? Number(failed.count) || 1 : 0;
    if (tries >= RERUN_REQUEST_MAX) {
      return { action: 'none', state: 'rerun-request-failed', suites, set, requestFailed: failed,
        reason: `${t}: the confirm rerun request of ${suites.join(',')} on ${short(train.head)} failed ${tries} times (last: exit ${failed.exit}: ${failed.why}); not retried` };
    }
    return { action: 'request', state: 'laptop-rerun', suites, set, confirm: true, ...(failed ? { requestFailed: failed } : {}),
      reason: `${t}: no member maps to ${suites.join(',')}: one confirm rerun (${set}) on ${short(train.head)} before a drop${tries ? `, try ${tries + 1}/${RERUN_REQUEST_MAX}` : ''}` };
  }
  const r = train.rerun ?? { state: 'missing', description: '' };
  if (r.state === 'failure') return null;
  const ageMin = (now - Date.parse(rec.at)) / 60_000;
  if (r.state !== 'success' && ageMin >= staleMin) {
    return { action: 'none', state: 'rerun-stale', suites, set,
      reason: `${t}: confirm rerun ${rec.id} of ${suites.join(',')} on ${short(train.head)}: no ${rerunContext(train.n)} verdict ${Math.floor(ageMin)} min after the request` };
  }
  return { action: 'wait', state: 'laptop-rerun', suites, set,
    reason: `${t}: confirm rerun ${rec.id} of ${suites.join(',')} on ${short(train.head)} ${r.state === 'missing' ? 'queued' : r.state}${r.state === 'success' ? ' (releases once CI is green)' : ''}` };
}

/** The `gh pr edit` argv dropping LABEL (null without it) and the comment (null when one with `marker` exists). */
function memberLabelPlan({ pr, labels = [], bodies = [], marker, paragraphs }) {
  const comment = bodies.some((b) => String(b).includes(marker)) ? null : [...paragraphs, marker].join('\n\n');
  const remove = labels.includes(LABEL) ? ['gh', 'pr', 'edit', String(pr), '--remove-label', LABEL] : null;
  return { remove, comment };
}

const TIER_WHY = {
  1: (s) => `its change touches \`${s}\` (the \`--affected\` folder map, scripts/e2e-affected.mjs)`,
  2: (s) => `no member's change maps to \`${s}\`; this one has the most \`src/\` files under that suite's folders`,
  3: (s) => `no member's change maps to \`${s}\`; dropped as the newest \`${LABEL}\` member (or the only one)`,
};

/**
 * A member dropped from failed train n: { remove, comment } as leftOutPlan, one comment per train and head
 * (`<!-- auto-train:dropped:train<n>:<head> -->`), naming the train, the failing suite and its assert line.
 */
export function dropPlan({ pr, branch, head, n, suite, tier, assert = '', labels = [], bodies = [] }) {
  return memberLabelPlan({ pr, labels, bodies, marker: `<!-- auto-train:dropped:train${n}:${head} -->`, paragraphs: [
    `Auto-train: \`${branch}\` (${short(head)}) was dropped from train ${n}: \`${suite}\` failed there; ${(TIER_WHY[tier] ?? TIER_WHY[3])(suite)}.`,
    `Failing assert: \`${String(assert || 'none found').replace(/`/g, "'").slice(0, 500)}\``,
    `Train ${n} is closed and the next train is built from the other members. The \`${LABEL}\` label has been removed: fix the failure on this branch, then re-add \`${LABEL}\` once \`check\` is green.`] });
}

/** The comment closing failed train n (head, failing suites, the dropped members). */
export function closeTrainBody({ n, head, failing, drops }) {
  return [`Auto-train: train ${n} failed ${failing.join(', ')} on ${short(head)}; closed without merging.`,
    `Dropped (\`${LABEL}\` removed, commented): ${drops.map((d) => `#${d.pr} \`${d.branch}\` (${d.suite})`).join(', ')}.`,
    'The next train is built at once from the remaining train-ready PRs.'].join('\n\n');
}

const short = (sha) => String(sha ?? '').slice(0, 8);

// ---- shell -------------------------------------------------------------------------------------------------------

const ARGV = process.argv.slice(2);
const DRY = ARGV.includes('--dry-run');
const SCRATCH = process.env.AUTO_TRAIN_SCRATCH || 'C:/NightShift/scratch';
const FILES = scratchFiles(SCRATCH, DRY);
const LOCK = FILES.lock;
const LOG = FILES.log;
const STATUS = FILES.status;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const envMin = (name, dflt) => { const v = Number(process.env[name]); return process.env[name] && Number.isFinite(v) && v >= 0 ? v : dflt; };
const LAPTOP_MISSING = envMin('AUTO_TRAIN_LAPTOP_MISSING_MIN', LAPTOP_MISSING_MIN);
const RERUN_STALE = envMin('AUTO_TRAIN_RERUN_STALE_MIN', RERUN_STALE_MIN);
const CHECK_WAIT = envMin('AUTO_TRAIN_CHECK_WAIT_MIN', CHECK_WAIT_MIN);
const CHECK_WAIT_CAP = envMin('AUTO_TRAIN_CHECK_WAIT_CAP_MIN', CHECK_WAIT_CAP_MIN);
const CHECK_WAIT_MARGIN = envMin('AUTO_TRAIN_CHECK_WAIT_MARGIN_MIN', CHECK_WAIT_MARGIN_MIN);
const POLL_S = envMin('AUTO_TRAIN_FAST_POLL_S', FAST_POLL_S);
const POLL_MAX_MIN = envMin('AUTO_TRAIN_FAST_POLL_MAX_MIN', FAST_POLL_MAX_MIN);
const POLL_LATE_S = envMin('AUTO_TRAIN_FAST_POLL_LATE_S', FAST_POLL_LATE_S);
const GH_RETRY = envMin('AUTO_TRAIN_GH_RETRY_S', GH_RETRY_S);
/** The release's deploy wait handed to merge-train (MERGE_TRAIN_DEPLOY_WAIT_MIN): 0 = dispatch only, the ticks watch (F18). */
const DEPLOY_WAIT = envMin('AUTO_TRAIN_DEPLOY_WAIT_MIN', 0);
const DEPLOY_REPAIR = envMin('AUTO_TRAIN_DEPLOY_REPAIR_MIN', DEPLOY_REPAIR_MIN);
/** F16: unlabelled PRs that meet the train-ready rule on their head are candidates (0 = labelled PRs only). */
const UNLABELLED = envMin('AUTO_TRAIN_UNLABELLED', 1) > 0;
/** F23: the candidates are read again at build start and after the plan (0 = the one read before the build). */
const REREAD = envMin('AUTO_TRAIN_REREAD', 1) > 0;
/** The read-only retry budget of one step (withRetry): reset at the start of each step. */
const GH_BUDGET = { left: 1 };
let DRAFTS = null; // F34: draftNotes of the last PR list this process read (candidates), for the status (safeStep)
let CWD = 'C:/NightShift/Mobile-Coop-train';
let LOCK_TEXT = null; // our tick lock's text, handed to merge-train (AUTO_TRAIN_LOCK_TEXT) so it runs under it

function log(msg) {
  const line = `${new Date().toISOString()} ${DRY ? '[dry] ' : ''}${msg}`;
  console.log(msg);
  try { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, `${line}\n`); } catch { /* log is best effort */ }
}

const show = (cmd) => cmd.map((a) => (/[\s"';|&]/.test(a) ? JSON.stringify(a) : a)).join(' ');

/** Runs argv (no shell) in the train worktree; never throws: { status, out, err, error, signal } (error / signal for ghRetryable). */
function exec(cmd, { input } = {}) {
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd: CWD, encoding: 'utf8', input, windowsHide: true, maxBuffer: 64 << 20, timeout: 120_000 });
  if (r.error) return { status: -1, out: '', err: String(r.error.message), error: r.error, signal: r.signal ?? null };
  return { status: r.status ?? -1, out: r.stdout ?? '', err: r.stderr ?? '', signal: r.signal ?? null };
}

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** exec for a read-only call, retried once per step on a transient failure (F12: withRetry, AUTO_TRAIN_GH_RETRY_S). */
const execRetry = (cmd) => withRetry(() => exec(cmd), { waitMs: GH_RETRY * 1000, wait: sleepSync, budget: GH_BUDGET, log, what: show(cmd).slice(0, 120) });

/** Runs argv in the checkout this script lives in (not the train worktree); never throws: { status, out, err }. */
function execHere(cmd) {
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd: path.resolve(HERE, '..'), encoding: 'utf8', windowsHide: true, timeout: 120_000 });
  if (r.error) return { status: -1, out: '', err: String(r.error.message) };
  return { status: r.status ?? -1, out: r.stdout ?? '', err: r.stderr ?? '' };
}

/**
 * Idle tick (no train open, nothing building) or right after a release (the train merged, the next not built yet):
 * fast-forwards this checkout to origin/master so the next tick runs current scripts. Never between a train's build
 * and its release. Audit 2026-10-25: back-to-back trains never had an idle tick, the checkout sat at train 80 with
 * master at 86.
 */
function selfUpdate(when = 'idle') {
  try {
    if (DRY) { log(`  [dry-run] would self-update this checkout to origin/master (${when})`); return; }
    // only master is read; narrow + lock-race retry (fetch-retry.mjs: another worktree's fetch holds a ref lock)
    if (fetchWithRetry(execHere, ['master'], { log }).status !== 0) { log('self-update skipped: git fetch failed'); return; }
    const head = execHere(['git', 'rev-parse', 'HEAD']).out.trim();
    const master = execHere(['git', 'rev-parse', 'origin/master']).out.trim();
    const dirty = execHere(['git', 'status', '--porcelain']).out.trim() !== '';
    const ff = head && master ? execHere(['git', 'merge-base', '--is-ancestor', head, master]).status === 0 : undefined;
    const plan = selfUpdatePlan({ head, master, dirty, ff, when });
    if (plan.action === 'update') {
      const r = execHere(['git', 'checkout', '-q', '--detach', 'origin/master']);
      log(r.status === 0 ? plan.reason : `self-update failed: ${r.err.trim().slice(-300)}`);
    } else if (plan.action === 'skip') log(plan.reason);
  } catch (e) { log(`self-update skipped: ${e.message}`); }
}

/** A command run once (no retry: act's writes): trimmed stdout, throws on failure. */
function readOnce(cmd, run = exec) {
  const r = run(cmd);
  if (r.status !== 0) throw new Error(`${show(cmd)} failed (${r.status}): ${(r.err || r.out).trim().slice(-800)}`);
  return r.out.trim();
}
/** Read-only command: trimmed stdout, throws on failure; a transient failure is retried once per step (execRetry). */
const read = (cmd) => readOnce(cmd, execRetry);
const readJson = (cmd) => JSON.parse(read(cmd) || 'null');

/** Every gh / git write: printed under --dry-run, run otherwise. */
function act(cmd) {
  if (DRY) { log(`  [dry-run] would run: ${show(cmd)}`); return ''; }
  log(`  > ${show(cmd)}`);
  return readOnce(cmd);
}

/** merge-train through its CLI (async, so the lock heartbeat keeps running): { code, out }. Printed only under --dry-run. */
function mergeTrain(args, extraEnv = {}) {
  const script = process.env.MERGE_TRAIN || path.join(HERE, 'merge-train.mjs');
  const cmd = ['node', script, ...args];
  if (DRY) { log(`  [dry-run] would run (cwd ${CWD}): ${show(cmd)}`); return Promise.resolve({ code: 0, out: '', dry: true }); }
  log(`  > (cwd ${CWD}) ${show(cmd)}`);
  return new Promise((resolve) => {
    const env = { ...process.env, AUTO_TRAIN_LOCK: LOCK, AUTO_TRAIN_LOCK_TEXT: LOCK_TEXT ?? '', ...extraEnv };
    const p = spawn(cmd[0], cmd.slice(1), { cwd: CWD, windowsHide: true, env });
    let out = '';
    const take = (d) => { const s = d.toString(); out += s; process.stdout.write(s); try { fs.appendFileSync(LOG, s); } catch { /* best effort */ } };
    p.stdout.on('data', take); p.stderr.on('data', take);
    p.on('error', (e) => resolve({ code: 1, out: `${out}\n${e.message}` }));
    p.on('close', (code) => resolve({ code: code ?? 1, out }));
  });
}

/** gh api GET; null on 404. */
function api(pathname, jq) {
  const r = execRetry(['gh', 'api', pathname, ...(jq ? ['--jq', jq] : [])]);
  if (r.status !== 0) { if (/HTTP 404|Not Found/.test(r.err + r.out)) return null; throw new Error(`gh api ${pathname}: ${(r.err || r.out).trim().slice(-400)}`); }
  return r.out.trim();
}
const apiRaw = (pathname) => {
  const r = execRetry(['gh', 'api', '-H', 'Accept: application/vnd.github.raw', pathname]);
  if (r.status !== 0) { if (/HTTP 404|Not Found/.test(r.err + r.out)) return null; throw new Error(`gh api ${pathname}: ${(r.err || r.out).trim().slice(-400)}`); }
  return r.out;
};
const fileAt = (file, ref) => apiRaw(`repos/{owner}/{repo}/contents/${file}?ref=${encodeURIComponent(ref)}`);

/** Head a is an ancestor of head b (local objects when present, else the GitHub compare API). */
function contains(a, b) {
  const has = (s) => exec(['git', 'cat-file', '-e', `${s}^{commit}`]).status === 0;
  if (has(a) && has(b)) return exec(['git', 'merge-base', '--is-ancestor', a, b]).status === 0;
  const s = api(`repos/{owner}/{repo}/compare/${a}...${b}`, '.status');
  return s === 'ahead' || s === 'identical';
}

// ---- the tick ----------------------------------------------------------------------------------------------------

function parseOpts(argv) {
  const [cmd, ...rest] = argv;
  if (cmd !== 'tick') throw new Error('usage: node scripts/auto-train.mjs tick [--dry-run] [--once] [--no-autodrop] [--worktree <dir>] [--min-interval <min>] [--max-per-day <n>] [--preview-next]');
  const o = { minInterval: 60, maxPerDay: 0, worktree: CWD };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    const num = () => { const v = Number(rest[++i]); if (!Number.isFinite(v) || v < 0) throw new Error(`${a} needs a number >= 0`); return v; };
    if (a === '--dry-run') continue;
    else if (a === '--once') o.once = true;
    else if (a === '--no-autodrop') o.noAutodrop = true;
    else if (a === '--min-interval') o.minInterval = num();
    else if (a === '--max-per-day') o.maxPerDay = num();
    else if (a === '--worktree') o.worktree = rest[++i];
    else if (a === '--preview-next') o.previewNext = true;
    else throw new Error(`unknown argument ${a}`);
  }
  if (o.previewNext && !DRY) throw new Error('--preview-next needs --dry-run');
  return o;
}

function ensureLabel() {
  const names = readJson(['gh', 'label', 'list', '--limit', '200', '--json', 'name']).map((l) => l.name);
  if (names.includes(LABEL)) return true;
  act(['gh', 'label', 'create', LABEL, '--color', '0e8a16', '--description', 'Ready for the next merge train (scripts/auto-train.mjs)']);
  return !DRY;
}

/** The open train PR (lowest n when several), with what the decision needs. */
function openTrain() {
  const prs = readJson(['gh', 'pr', 'list', '--state', 'open', '--base', 'master', '--limit', '100', '--json', 'number,headRefName,headRefOid,title,createdAt,statusCheckRollup'])
    .filter((p) => /^train\/\d+$/.test(p.headRefName))
    .sort((a, b) => Number(a.headRefName.split('/')[1]) - Number(b.headRefName.split('/')[1]));
  if (!prs.length) return null;
  if (prs.length > 1) log(`WARNING: ${prs.length} open trains (${prs.map((p) => `#${p.number}`).join(', ')}): acting on the oldest`);
  const p = prs[0];
  const n = Number(p.headRefName.split('/')[1]);
  const commits = readJson(['gh', 'pr', 'view', String(p.number), '--json', 'commits']).commits;
  const subjects = commits.map((c) => c.messageHeadline);
  // `gh pr view --json commits` stops at 100 commits, which cuts off the version commit at the head of a big train:
  // read the head's own subject too.
  const headSubject = api(`repos/{owner}/{repo}/commits/${p.headRefOid}`, '.commit.message | split("\\n")[0]');
  if (headSubject) subjects.push(headSubject.trim());
  // A fix commit on top of a big train pushes its version commit past that cap as well (train 112, 2026-10-26: "no
  // version commit: rebuild" after a doc-lint fix): read the head's newest 100 commits only when it is still missing.
  const all = withRecentSubjects(subjects, n, () => api(`repos/{owner}/{repo}/commits?sha=${p.headRefOid}&per_page=100`,
    '[.[].commit.message | split("\\n")[0]] | reverse | .[]'));
  subjects.splice(0, subjects.length, ...all);
  const vc = versionFromSubjects(subjects, n);
  const fromTitle = parseTrainTitle(p.title);
  let version = vc?.version ?? null;
  let title = fromTitle?.title ?? null;
  if (!version || !title) {
    const cl = fileAt('CHANGELOG.md', p.headRefOid);
    // The heading counts only when it names this train (else it is master's last release, not this train's version).
    const h0 = cl && parseChangelogHeading(cl.split('\n').find((l) => /^## \d/.test(l)));
    const h = h0 && h0.n === n ? h0 : null;
    version = version ?? fromTitle?.version ?? h?.version ?? null;
    title = title ?? h?.title ?? null;
  }
  const combined = JSON.parse(api(`repos/{owner}/{repo}/commits/${p.headRefOid}/status`) || '{}');
  const headTime = Date.parse(commits[commits.length - 1]?.committedDate || '') || 0;
  const since = Math.max(Date.parse(p.createdAt) || 0, headTime);
  return {
    pr: p.number, n, head: p.headRefOid, version, title: title || `train ${n}`,
    versionCommit: !!vc,
    resume: !!vc && vc.index < subjects.length - 1,
    members: trainMembers(trainMergeLog(n, p.headRefOid), n, subjects),
    ci: ciLabel(p.statusCheckRollup, 'check'),
    ciGreenAt: ciGreenAt(p.statusCheckRollup, combined, 'check'),
    laptop: contextStatus(combined, LAPTOP_CONTEXT),
    laptopSince: pendingSince(combined, LAPTOP_CONTEXT),
    rerun: contextStatus(combined, rerunContext(n)),
    vitest: contextStatus(combined, VITEST_CONTEXT).state,
    ageMin: (Date.now() - since) / 60_000,
  };
}

/**
 * F44: the first-parent merge subjects of origin/master..<head> (oldest first) from the train worktree after a narrow
 * fetch of master and train/<n>, or null when git cannot read them (trainMembers then falls back to gh's subjects).
 */
function trainMergeLog(n, head) {
  if (fetchWithRetry(exec, ['master', `train/${n}`], { log }).status !== 0) log(`train ${n}: git fetch failed, reading members from local refs`);
  const r = exec(['git', 'log', '--first-parent', '--merges', '--reverse', '--format=%s', `origin/master..${head}`]);
  if (r.status === 0) return r.out;
  log(`train ${n}: git log of its merges failed (${(r.err || r.out).trim().slice(-200)}): members from gh's capped commit list`);
  return null;
}

/** When `train-ready` was last removed from a PR (ms), or null when never; throws when unreadable (F16 heldOff). */
function unlabeledAt(pr) {
  // every page (oldest first): the last removal wins
  const out = read(['gh', 'api', '--paginate', `repos/{owner}/{repo}/issues/${pr}/events?per_page=100`, '--jq', `.[] | select(.event == "unlabeled" and .label.name == "${LABEL}") | .created_at`]);
  return Date.parse(out.split('\n').filter(Boolean).pop() ?? '') || null;
}

/** When a head was pushed (ms): its earliest check suite (made by the push), or null when it has none (F16 heldOff). */
function headPushedAt(head) {
  return Date.parse(api(`repos/{owner}/{repo}/commits/${head}/check-suites?per_page=100`, '[.check_suites[].created_at] | min // ""') ?? '') || null;
}

/** F16 for one unlabelled ruled-ready PR: true (stay out) when it lost the label on this head, or on a read failure. */
function isHeldOff(pr) {
  try { return tr.heldOff({ unlabeledAt: unlabeledAt(pr.pr), headPushedAt: headPushedAt(pr.head) }); } catch (e) { log(`  #${pr.pr} ${pr.branch}: label history unreadable (${e.message.slice(0, 200)}): left out`); return true; }
}

/** F16 for one unlabelled ruled-ready PR: its head's own combined status agrees (headStatusAgrees); false on a read failure. */
function headAgrees(pr) {
  try { return headStatusAgrees(pr, JSON.parse(api(`repos/{owner}/{repo}/commits/${pr.head}/status`) || 'null')); } catch (e) { log(`  #${pr.pr} ${pr.branch}: head status unreadable (${e.message.slice(0, 200)}): left out`); return false; }
}

/**
 * Train-ready PRs (splitCandidates: labelled with a green check, or unlabelled meeting the rule on their head, F16),
 * plus feature/menu when it is docs-only ahead of master. -> { cands, waiting }: `waiting` = the PRs whose check is not
 * green yet, with `why` = checkWaitReason (null when CI is not running: failed or no activity) for holdForChecks.
 */
function candidates() {
  const prs = readJson(['gh', 'pr', 'list', '--state', 'open', '--base', 'master', '--limit', '100', '--json', 'number,headRefName,headRefOid,title,isDraft,mergeable,labels,statusCheckRollup']);
  if (prs.length >= 100) log(`WARNING: ${prs.length} open PRs to master read (the list's limit): older PRs are not candidates this tick`);
  const s = splitCandidates(prs, { unlabelled: UNLABELLED, heldOff: isHeldOff, agrees: headAgrees });
  DRAFTS = draftNotes(s.drafts, DRAFTS?.draftHeads ?? readStatus(FILES.realStatus)?.draftHeads);
  for (const l of DRAFTS.lines) log(l);
  for (const w of s.waiting) log(`  #${w.pr} ${w.branch}: check ${w.ci}, not a candidate${w.unlabelled ? ' yet (train-ready by rule otherwise, no label)' : ''}${w.why ? ` (CI still running: ${w.why})` : ''}`);
  for (const h of s.held) log(`  #${h.pr} ${h.branch}: train-ready by rule on ${short(h.head)} but left out: ${h.why}`);
  for (const r of s.ruleReady) log(`  #${r.pr} ${r.branch}: train-ready by rule on ${short(r.head)} (no label)`);
  const out = s.cands;
  // F50: each waiting head's CI start and the typical CI time from this same list (holdForChecks' expected finish)
  const rollOf = new Map(prs.map((p) => [p.number, p.statusCheckRollup]));
  const waiting = s.waiting.map((w) => ({ ...w, ciStartedAt: ciRunStartedAt(rollOf.get(w.pr)) }));
  const typicalMin = typicalCiMin(prs);
  if (!out.some((c) => c.branch === MENU_BRANCH)) {
    const cmp = api(`repos/{owner}/{repo}/compare/master...${MENU_BRANCH}`, '{ahead: .ahead_by, files: [.files[].filename]}');
    const c = cmp && JSON.parse(cmp);
    if (c && c.ahead > 0 && c.files.length < 300 && docsOnly(c.files)) out.push({ pr: null, branch: MENU_BRANCH, head: undefined, title: null });
    else if (c && c.ahead > 0) log(`  ${MENU_BRANCH}: ${c.ahead} commit(s) ahead but not docs-only, left for the orchestrator`);
  }
  return { cands: out, waiting, typicalMin };
}

/** Members with fragments read at their heads, stacked bases marked build:false; then the plan. */
export function plan(members) {
  const tips = stackedTips(members.filter((m) => m.head), contains);
  for (const m of members) {
    if (m.head && !tips.includes(m)) { m.build = false; log(`  ${m.branch} (#${m.pr}): contained in another candidate's head, rides with its tip`); } else delete m.build; // a re-plan (labelTaken) starts afresh
    if (m.pr) m.fragment = fileAt(fragmentPath(m.branch), m.head ?? m.branch);
  }
  const masterVersion = JSON.parse(fileAt('package.json', 'master')).version;
  return { masterVersion, ...planBuild(masterVersion, members) };
}

/** The last train releases (merge times, ms). */
function releaseTimes() {
  return readJson(['gh', 'pr', 'list', '--state', 'merged', '--base', 'master', '--limit', '40', '--json', 'headRefName,mergedAt'])
    .filter((p) => /^train\/\d+$/.test(p.headRefName)).map((p) => Date.parse(p.mergedAt)).filter(Boolean);
}

/** 'idle' | 'busy' from origin/laptop-queue (request names and claim texts, one GraphQL read), or null when that branch does not exist. */
function laptopQueue() {
  const q = 'query($owner:String!,$name:String!){repository(owner:$owner,name:$name){ref(qualifiedName:"refs/heads/laptop-queue"){name}'
    + ' req:object(expression:"laptop-queue:requests"){... on Tree{entries{name}}}'
    + ' cl:object(expression:"laptop-queue:claims"){... on Tree{entries{name object{... on Blob{text}}}}}}}';
  const r = execRetry(['gh', 'api', 'graphql', '-F', 'owner={owner}', '-F', 'name={repo}', '-f', `query=${q}`, '--jq',
    '.data.repository | {ref: (.ref != null), requests: [.req.entries[]?.name], claims: [.cl.entries[]? | {name, text: .object.text}]}']);
  if (r.status !== 0) throw new Error(`gh api graphql (laptop queue): ${(r.err || r.out).trim().slice(-400)}`);
  const d = JSON.parse(r.out);
  if (!d.ref) return null;
  const claims = {};
  for (const c of d.claims) { try { claims[c.name.replace(/\.json$/, '')] = JSON.parse(c.text); } catch { /* unreadable claim */ } }
  const paths = [...d.requests.map((n) => `requests/${n}`), ...d.claims.map((c) => `claims/${c.name}`)];
  return laptopQueueState(paths, { claims, now: Date.now() });
}

function nextN() {
  const branches = read(['git', 'ls-remote', '--heads', 'origin', 'refs/heads/train/*']).split('\n').map((l) => l.split('\t')[1] ?? '').filter(Boolean);
  const titles = readJson(['gh', 'pr', 'list', '--state', 'all', '--limit', '100', '--json', 'title,headRefName']).flatMap((p) => [p.title, p.headRefName]);
  return nextTrainNumber(branches, titles);
}

/**
 * A left-out member: { remove: the `gh pr edit` argv dropping LABEL (null when the PR does not carry it), comment: the
 * comment body (null when this head already has one, by its marker) }. The label goes so the member stops being a
 * candidate (no repeat empty builds); the lead re-adds it after fixing the conflict (audit 2026-10-24 item 4).
 */
export function leftOutPlan({ pr, branch, head, n, why, labels = [], bodies = [] }) {
  return memberLabelPlan({ pr, labels, bodies, marker: `<!-- auto-train:left-out:${head} -->`, paragraphs: [
    `Auto-train: \`${branch}\` (${short(head)}) was left out of train ${n}: ${why}.`,
    why.startsWith('doc-lint')
      ? `Please fix the doc on this branch so it passes doc-lint together with master and the train's other members (each may pass alone, e.g. a shared doc budget). The \`${LABEL}\` label has been removed, so this PR no longer joins trains: re-add \`${LABEL}\` once it is fixed and \`check\` is green.`
      : `Please fix the conflict with master on this branch (or on train/${n}). The \`${LABEL}\` label has been removed, so this PR no longer joins trains: re-add \`${LABEL}\` once the conflict is fixed and \`check\` is green.`] });
}

/** A PR's labels and comment bodies (for leftOutPlan / dropPlan). */
function prLabelsBodies(pr) {
  const v = readJson(['gh', 'pr', 'view', String(pr), '--json', 'comments,labels']);
  return { labels: (v?.labels ?? []).map((x) => x.name), bodies: (v?.comments ?? []).map((x) => x.body) };
}

/** Applies a leftOutPlan / dropPlan: label removal (a failure is logged, not fatal), then the comment. */
function applyMemberPlan(pr, branch, p, what) {
  if (p.remove) {
    log(`  #${pr} ${branch}: ${what}, removing ${LABEL}`);
    try { act(p.remove); } catch (e) { log(`  #${pr}: label removal failed: ${e.message}`); }
  }
  if (p.comment) act(['gh', 'pr', 'comment', String(pr), '--body', p.comment]);
}

/** Per left-out PR: drop its `train-ready` label (logged; a failure is logged, not fatal) and comment once per head. */
function commentLeftOut(cands, left, n) {
  for (const l of left) {
    const c = cands.find((x) => x.branch === l.branch);
    if (!c?.pr) continue;
    applyMemberPlan(c.pr, c.branch, leftOutPlan({ pr: c.pr, branch: c.branch, head: c.head, n, why: l.why, ...prLabelsBodies(c.pr) }), `left out of train ${n}`);
  }
}

/** A member head's changed files vs master: `git diff --name-only origin/master...<head>` when the head is local, else the compare API; null when unreadable. */
function memberFiles(head) {
  try {
    if (exec(['git', 'cat-file', '-e', `${head}^{commit}`]).status === 0) {
      const r = exec(['git', 'diff', '--name-only', `origin/master...${head}`]);
      if (r.status === 0) return r.out.split('\n').map((s) => s.trim()).filter(Boolean);
    }
    const s = api(`repos/{owner}/{repo}/compare/master...${head}`, '[.files[].filename]');
    return s ? JSON.parse(s) : null;
  } catch (e) { log(`  diff of ${short(head)} unreadable: ${e.message}`); return null; }
}

/** When `train-ready` was last added to a PR (ms), or null. */
function labeledAt(pr) {
  try {
    // every page (oldest first): the last labelled time wins
    const r = exec(['gh', 'api', '--paginate', `repos/{owner}/{repo}/issues/${pr}/events?per_page=100`, '--jq', `.[] | select(.event == "labeled" and .label.name == "${LABEL}") | .created_at`]);
    if (r.status !== 0) return null;
    return Date.parse(r.out.trim().split('\n').filter(Boolean).pop() ?? '') || null;
  } catch { return null; }
}

/**
 * Auto-drop (Michael 2026-10-24 ~21:00): a failed laptop run drops the member(s) pickDrops names (label removed, one
 * comment each with the failing suite and assert), closes the train PR with a comment and builds the next train from
 * the remaining train-ready PRs in this tick (pacing skipped: the failed train already passed it). Anything it cannot
 * work out (no failing suite, an unreadable diff, nothing to drop) keeps the old state "failed" for the orchestrator.
 */
async function autoDrop(t, o, labelExists, base, c, prev) {
  const left = (why) => { log(`autodrop: ${why}: left for the orchestrator`); return { ...base, state: 'failed', reason: `${c.reason}; autodrop: ${why}, left for the orchestrator` }; };
  const asserts = failureAsserts(prLabelsBodies(t.pr).bodies, t.head);
  const failing = c.failing.length ? c.failing : Object.keys(asserts);
  if (!failing.length) return left('no failing suite in the description or a failure comment');
  const again = repeatedSuites(base.lastDrop, failing, t.n);
  if (again.length) return left(`${again.join(',')} also failed train ${base.lastDrop.train}, which was auto-dropped (master or a flake, not a member)`);
  const prs = readJson(['gh', 'pr', 'list', '--state', 'open', '--base', 'master', '--limit', '100', '--json', 'number,headRefName,headRefOid']);
  const members = [];
  for (const b of t.members) {
    const p = prs.find((x) => x.headRefName === b);
    if (b === MENU_BRANCH || !p) continue;
    const files = memberFiles(p.headRefOid);
    if (!files) return left(`the diff of ${b} is unreadable`);
    members.push({ pr: p.number, branch: b, head: p.headRefOid, files, labeledAt: labeledAt(p.number) });
  }
  const pick = pickDrops(members, failing);
  if (!pick.drops.length) return left(pick.reason);
  // a guessed drop (tier 2-3) on the train's own first failure waits for one confirm rerun (confirmPlan)
  const cp = c.confirm ? confirmPlan(t, prev, pick.drops, failing, { now: Date.now(), staleMin: RERUN_STALE }) : null;
  if (cp) return rerunStep(t, { ...cp, reason: `${cp.reason} (${pick.reason})` }, base);
  log(`autodrop: train ${t.n} failed ${failing.join(',')}: ${pick.reason}`);
  for (const d of pick.drops) {
    const m = members.find((x) => x.pr === d.pr);
    const assert = asserts[d.suite] ?? Object.entries(asserts).find(([s]) => suiteBase(s) === d.suite)?.[1] ?? '';
    log(`DROPPED #${d.pr} ${d.branch} from train ${t.n}: ${d.suite} (tier ${d.tier})${assert ? `: ${assert.slice(0, 200)}` : ''}`);
    try { applyMemberPlan(d.pr, d.branch, dropPlan({ ...d, head: m.head, n: t.n, assert, ...prLabelsBodies(d.pr) }), `dropped from train ${t.n}`); } catch (e) { log(`  #${d.pr}: drop comment failed: ${e.message}`); }
  }
  act(['gh', 'pr', 'close', String(t.pr), '--comment', closeTrainBody({ n: t.n, head: t.head, failing, drops: pick.drops })]);
  log(`closed train ${t.n} #${t.pr}; building the next train now`);
  const dropped = pick.drops.map(({ pr, branch, suite }) => ({ pr, branch, suite }));
  const next = await noTrain(o, labelExists, { exclude: dropped.map((d) => d.branch), afterDrop: true });
  return { ...next, dropped, closedTrain: { train: t.n, pr: t.pr, head: t.head, failing }, dropReason: pick.reason,
    lastDrop: { train: t.n, failing: [...new Set(failing.map(suiteBase))], at: new Date().toISOString() } };
}

/**
 * Builds train n from `cands`; returns the status fields. A new train (no `rebuildOf`): with `reread` (F23) its
 * candidates are read again at build start and after the plan (freshPlan); the final set is skipped when it had nothing
 * new to release (F12) and its unlabelled members get `train-ready` first (F16, labelTaken: a failed add, or any under
 * --dry-run, leaves that member out and the rest is planned again).
 */
async function build(n, cands, { rebuildOf, reread } = {}) {
  let p;
  const labelLeft = [];
  if (rebuildOf) p = plan(cands);
  else {
    if (reread) {
      const f = await freshPlan({ reread, plan, passes: 2 });
      if (f.changed.length) log(`  re-read at build start: ${f.changed.join(', ')}`);
      cands = f.cands;
      p = f.p;
    } else p = plan(cands);
    const idle = (reason) => { log(`decision (build start): idle - ${reason}`); return { state: 'idle', reason, candidates: cands.map((c) => c.branch) }; };
    if (!cands.some((c) => c.pr)) return idle('no candidate left at build start');
    const nn = nothingNewIdle(cands);
    if (nn) return nn;
    const lt = labelTaken(cands, { add: (pr) => act(['gh', 'pr', 'edit', String(pr), '--add-label', LABEL]), dry: DRY, log });
    if (lt.left.length) {
      labelLeft.push(...lt.left.map((l) => `${l.branch}: ${l.why}`));
      cands = lt.members;
      if (!cands.some((c) => c.pr)) return { ...idle(`no member left once the unlabelled ones were left out (${labelLeft.join('; ')})`), leftOut: labelLeft };
      p = plan(cands);
    }
  }
  log(`build train ${n}: ${p.version} (${p.kind}, master ${p.masterVersion}) "${p.title}" <- ${p.branches.join(' ')}`);
  log(`  build marker ${FILES.building} (deleted once the version commit is pushed)`);
  const r = await withBuildMarker(FILES.building, { train: n, version: p.version },
    () => mergeTrain(['build', String(n), p.version, p.title, ...p.branches], { AUTO_TRAIN_BUILD_MARKER: FILES.building }));
  const base = { train: n, version: p.version, members: p.branches };
  if (r.dry) return { ...base, state: 'building', reason: `${rebuildOf ? 'rebuild' : 'build'} would run (dry run)`, ...(labelLeft.length ? { leftOut: labelLeft } : {}) };
  // F12 (train 102): nothing new to release is no error and nothing was pushed (no left-out comments); a new train is
  // idle and skipped until a candidate head or master moves (nothingNewSkip), a rebuild stays failed (rebuildFailed)
  if (r.code === NOTHING_NEW_EXIT) {
    log(`${rebuildOf ? 'rebuild' : 'build'} of train ${n}: nothing new to release (merge-train exit ${NOTHING_NEW_EXIT})${rebuildOf ? '' : ': skipped until a member head or master moves'}`);
    return buildExitState({ n, base, cands, master: rebuildOf ? null : masterSha(), rebuildOf });
  }
  const head = exec(['git', 'ls-remote', 'origin', `refs/heads/train/${n}`]).out.split('\t')[0].trim() || null;
  const leftLines = parseLeftOut(r.out);
  // Left out: merge-train's "LEFT OUT:" lines, plus any member head the pushed train head does not contain.
  const left = r.code === 3 ? p.branches.map((b) => leftLines.find((l) => l.branch === b) ?? { branch: b, why: 'conflict' }) : [...leftLines];
  if (r.code !== 3 && head) {
    for (const b of p.branches) {
      const c = cands.find((x) => x.branch === b);
      if (c?.head && !left.some((l) => l.branch === b) && !contains(c.head, head)) left.push({ branch: b, why: 'not merged into the train (conflict)' });
    }
  }
  if (left.length) commentLeftOut(cands, left, n);
  const leftOut = [...labelLeft, ...left.map((l) => `${l.branch}: ${l.why}`)];
  if (r.code === 0) {
    if (rebuildOf) {
      const pr = readJson(['gh', 'pr', 'list', '--head', `train/${n}`, '--state', 'open', '--json', 'number'])[0]?.number;
      if (pr) act(['gh', 'pr', 'edit', String(pr), '--title', `${p.version}: Train ${n}: ${p.title}`]);
    }
    return { ...base, head, state: 'built', reason: `train ${n} built; waiting for CI and ${LAPTOP_CONTEXT}`, leftOut };
  }
  if (r.code === 3) return { ...base, head, state: 'failed', reason: `train ${n}: every member left out on conflicts or doc-lint (merge-train exit 3)`, leftOut };
  return { ...base, head, state: 'error', reason: `merge-train build exit ${r.code}: ${r.out.trim().split('\n').slice(-3).join(' | ')}`, leftOut };
}

/** origin/master's sha (ls-remote) or null. */
const masterSha = () => exec(['git', 'ls-remote', 'origin', 'refs/heads/master']).out.split('\t')[0].trim() || null;

/** F12: the idle status when the last build of these heads on this master had nothing new to release (it would exit 6 again), else null. */
function nothingNewIdle(cands) {
  const last = readStatus(FILES.realStatus);
  if (!last?.nothingNew) return null;
  const master = masterSha();
  if (!nothingNewSkip(last, cands, master)) return null;
  const reason = `nothing new to release in ${cands.map((c) => c.branch).join(', ')} on master ${short(master)} (merge-train exit ${NOTHING_NEW_EXIT} on these heads): no build until a head or master moves`;
  log(`decision: idle - ${reason}`);
  return { state: 'idle', reason, candidates: cands.map((c) => c.branch), nothingNew: last.nothingNew };
}

/**
 * No open train: candidates, pacing, build. After an auto-drop: `exclude` = the dropped branches (also when their label
 * removal failed or under --dry-run), `afterDrop` skips pacing (the failed train already passed it).
 */
async function noTrain(o, labelExists, { exclude = [], afterDrop = false } = {}) {
  const pick = () => {
    const r = candidates();
    return { ...r, cands: r.cands.filter((c) => !exclude.includes(c.branch)), waiting: r.waiting.filter((c) => !exclude.includes(c.branch)) };
  };
  const { cands, waiting, typicalMin } = pick();
  const queue = laptopQueue();
  const paceReason = afterDrop ? null : pacing({ now: Date.now(), releases: releaseTimes(), minIntervalMin: o.minInterval, maxPerDay: o.maxPerDay, queue });
  const d = decide({ train: null, candidates: cands, paceReason });
  // audit 2 item 1: a train-ready PR whose check is still running holds the build per head (first seen waiting:
  // `checkWait` in the status, carried across ticks); F50: to its expected CI finish (capped), else CHECK_WAIT
  const h = holdForChecks(waiting, Date.now(), readStatus(FILES.realStatus)?.checkWait ?? {}, CHECK_WAIT, { typicalMin, marginMin: CHECK_WAIT_MARGIN, capMin: CHECK_WAIT_CAP });
  const checkWait = Object.keys(h.firstSeen).length ? { checkWait: h.firstSeen } : {};
  if (d.action === 'build' && h.hold) {
    log(`decision: holding - ${h.reason}`);
    return { state: 'holding', reason: h.reason, candidates: cands.map((c) => c.branch), ...checkWait };
  }
  if (h.reason) log(`  ${h.reason}`);
  log(`decision: ${d.state} - ${d.reason}${queue ? ` (laptop queue ${queue})` : ''}`);
  if (d.state === 'idle') selfUpdate();
  if (d.action !== 'build') return { state: d.state, reason: d.reason, candidates: cands.map((c) => c.branch), ...checkWait };
  // re-read the candidates right before the build, so the member list is fresh (a PR that just went green rides along)
  const fresh = pick().cands;
  const fd = decide({ train: null, candidates: fresh, paceReason });
  if (fd.action !== 'build') { log(`decision (re-read): ${fd.state} - ${fd.reason}`); return { state: fd.state, reason: fd.reason, candidates: fresh.map((c) => c.branch) }; }
  const added = fresh.filter((c) => !cands.some((x) => x.branch === c.branch && x.head === c.head)).map((c) => c.branch);
  if (added.length) log(`  re-read: ${added.join(', ')} new or moved since the decision`);
  // F12: the last build of these heads on this master had nothing new to release: it would exit 6 again (build checks
  // its final re-read set too)
  const nn = nothingNewIdle(fresh);
  if (nn) return nn;
  // F23: build re-reads the candidates after nextN() and after its plan (freshPlan; AUTO_TRAIN_REREAD=0: not again)
  return build(nextN(), fresh, { reread: REREAD ? () => pick().cands : null });
}

async function step(o) {
  GH_BUDGET.left = 1; // one read-only retry per step (F12)
  const labelExists = ensureLabel();
  const t = o.previewNext ? null : openTrain();
  const prev = readStatus(FILES.realStatus);
  if (!t) {
    // a build held right after an auto-drop (fast poll / next tick) keeps the drop's exclusions and skips pacing
    const ad = prev?.state === 'holding' && prev.dropped?.length ? prev : null;
    const next = await noTrain(o, labelExists, ad ? { exclude: ad.dropped.map((x) => x.branch), afterDrop: true } : {});
    return ad ? { ...next, dropped: ad.dropped, closedTrain: ad.closedTrain, dropReason: ad.dropReason } : next;
  }
  // a confirm rerun recorded for this head lets decide() release on its pass (confirmPlan)
  if (prev?.rerun?.confirm && prev.rerun.head === t.head) t.confirm = prev.rerun.suites;
  const d = decide({ train: t, laptopMissingMin: LAPTOP_MISSING });
  log(`train ${t.n} #${t.pr} ${short(t.head)} ${t.version ?? '?'}: CI ${t.ci}, laptop ${t.laptop.state}${t.laptop.description ? ` (${t.laptop.description})` : ''}, age ${Math.round(t.ageMin)} min -> ${d.state}: ${d.reason}`);
  // The rerun record rides along in every status of the same head, so that head never requests twice; the last
  // auto-drop record (lastDrop) rides along until a release (carryLastDrop).
  const base = { train: t.n, version: t.version, head: t.head, pr: t.pr, ...(prev?.rerun?.head === t.head ? { rerun: prev.rerun } : {}),
    ...(prev?.lastDrop ? { lastDrop: prev.lastDrop } : {}) };
  // a releasable train (a laptop-e2e pass, or a desktop failure whose laptop rerun passed) goes the normal release way
  const rp = d.action === 'release' ? null : rerunPlan(t, prev, { now: Date.now(), staleMin: RERUN_STALE });
  // a laptop failure (or a failed laptop rerun) drops the culprit and rebuilds at once; --no-autodrop: wait as before
  const drop = o.noAutodrop ? null : autoDropCase(t, d, rp);
  if (drop) return autoDrop(t, o, labelExists, base, drop, prev);
  if (rp) return rerunStep(t, rp, base);
  // the laptop verdict is past its expected wall: the fast poll goes to POLL_LATE_S (laptopLate)
  const late = d.state === 'pending' && laptopLate({ since: t.laptopSince, description: t.laptop.description, now: Date.now() });
  if (d.action !== 'release') return { ...base, state: d.state, reason: d.reason, ...(d.waitingMin != null ? { waitingMin: d.waitingMin } : {}), ...(late ? { laptopLate: true } : {}) };
  const master = masterSha();
  if (rebuildSkip(prev, t.head, master)) {
    log(`skip: ${prev.reason} (train head and master unchanged)`);
    return { ...base, state: 'failed', reason: prev.reason, rebuildFailed: prev.rebuildFailed };
  }
  // F18: no deploy wait inside the release (~6 min per train); the next ticks watch /preview/ (deployStep)
  const r = await mergeTrain(releaseArgs(t), { MERGE_TRAIN_DEPLOY_WAIT_MIN: String(DEPLOY_WAIT) });
  if (r.dry) return { ...base, state: 'releasing', reason: `${d.reason}; release would run (dry run)${d.rerunRelease ? `: released on the laptop rerun of ${d.rerunRelease.join(',')}` : ''}` };
  if (r.code === 0) {
    const onRerun = d.rerunRelease ? `released on the laptop rerun of ${d.rerunRelease.join(',')}` : '';
    log(`RELEASED train ${t.n} as ${t.version}${onRerun ? `: ${onRerun}` : ''}`);
    // between trains: the next one is built (and later released) by the merge-train.mjs of the new master
    selfUpdate(`after releasing train ${t.n}`);
    const deployWatch = { version: t.version, at: new Date().toISOString(), repaired: null };
    // the release is done: an error building the next train still records it and its deploy watch
    const next = await noTrain(o, labelExists).catch((e) => { log(`ERROR after the release: ${e.message}`); return { state: 'error', reason: `released ${t.version}; next build: ${e.message.slice(0, 400)}` }; });
    return { ...next, released: `${t.version} (train ${t.n}${onRerun ? `, ${onRerun}` : ''})`, deployWatch };
  }
  if (r.code === 3) {
    log(`master moved since train ${t.n} was built: rebuilding ${t.members.join(', ')} with the next version`);
    const prs = readJson(['gh', 'pr', 'list', '--state', 'open', '--base', 'master', '--limit', '100', '--json', 'number,headRefName,headRefOid,title']);
    const members = t.members.map((b) => { const p = prs.find((x) => x.headRefName === b); return { pr: p?.number ?? null, branch: b, head: p?.headRefOid, title: p?.title ?? null }; });
    // A failed rebuild is recorded so the next ticks skip (no release -> exit 3 -> rebuild loop every 5 min) until the
    // train head or master changes.
    const failed = (s) => ({ ...s, state: s.state === 'error' ? 'error' : 'failed', reason: `rebuild failed for ${t.head}: ${s.reason}`, rebuildFailed: { head: t.head, master } });
    if (!members.length) return failed({ ...base, state: 'failed', reason: `train ${t.n}: master moved and no members found to rebuild` });
    const b = await build(t.n, members, { rebuildOf: t.version });
    if (b.state === 'failed' || b.state === 'error') return failed({ pr: t.pr, ...b, head: b.head ?? t.head });
    return b;
  }
  if (r.code === 2) return { ...base, state: 'failed', reason: `train ${t.n}: CI failed at release (merge-train exit 2)` };
  if (/not the tested head/.test(r.out)) return { ...base, state: 'pending', reason: `train ${t.n}: its head moved after the check (release --head STOP): re-read next tick` };
  return { ...base, state: 'error', reason: `merge-train release exit ${r.code}: ${r.out.trim().split('\n').slice(-3).join(' | ')}` };
}

/**
 * A desktop failure: queue one laptop rerun of the failed suites (request.mjs --train-rerun), or report the one already
 * queued for this head. A failed request (non-zero exit or no id printed) is logged in the status (`rerunRequestFailed`
 * with its count for this head) and retried next tick, up to RERUN_REQUEST_MAX tries (then "rerun-request-failed");
 * it is never fatal.
 */
function rerunStep(t, rp, base) {
  log(`laptop rerun: ${rp.reason}`);
  if (rp.action !== 'request') return { ...base, state: rp.state, reason: rp.reason, ...(rp.requestFailed ? { rerunRequestFailed: rp.requestFailed } : {}) };
  const cmd = ['node', path.join(HERE, 'laptop-queue', 'request.mjs'), ...rerunArgs({ sha: t.head, suites: rp.suites, pr: t.pr, set: rp.set, confirm: Boolean(rp.confirm) })];
  if (DRY) { log(`  [dry-run] would run (cwd ${CWD}): ${show(cmd)}`); return { ...base, state: rp.state, reason: `${rp.reason} (dry run)` }; }
  log(`  > (cwd ${CWD}) ${show(cmd)}`);
  const r = exec(cmd);
  const id = r.out.trim().split('\n').pop()?.trim() ?? '';
  if (r.status !== 0 || !id) {
    const why = (r.err || r.out).trim().split('\n').slice(-2).join(' | ').slice(0, 300) || 'no request id printed';
    const count = (rp.requestFailed ? Number(rp.requestFailed.count) || 1 : 0) + 1;
    log(`  rerun request failed (exit ${r.status}, ${count}/${RERUN_REQUEST_MAX}): ${why}`);
    return { ...base, state: rp.state, reason: `${rp.reason}; request failed (exit ${r.status}): ${why}; ${count < RERUN_REQUEST_MAX ? 'retry next tick' : 'no more retries'} (${count}/${RERUN_REQUEST_MAX})`,
      rerunRequestFailed: { head: t.head, exit: r.status, why, count } };
  }
  const rerun = { head: t.head, id, suites: rp.suites, set: rp.set, at: new Date().toISOString(), ...(rp.confirm ? { confirm: true } : {}) };
  return { ...base, state: rp.state, reason: `train ${t.n}: laptop rerun ${id} of ${rp.suites.join(',')} queued (${rp.set})`, rerun };
}

/** The last status line (JSON) or null. */
function readStatus(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').trim().split('\n').pop()); } catch { return null; }
}

/**
 * Takes the tick lock (scripts/heavy-lock.mjs takeTouchLock: wx, stale when untouched 30 min, heartbeat every minute);
 * merge-train build / release / single take the same lock, so a hand run and a tick never overlap. A dry run uses its
 * own lock file. Returns a release function or null (held: skip this tick).
 */
function takeLock() {
  const t = takeTouchLock(LOCK, `auto-train${DRY ? ' dry-run' : ''}`, { staleMin: LOCK_STALE_MIN, log });
  if (!t.release) { log(`lock held (${t.holder}, ${Math.round(t.ageMin)} min): skipping this tick`); return null; }
  LOCK_TEXT = t.text;
  return t.release;
}

async function main(argv) {
  const o = parseOpts(argv);
  CWD = o.worktree;
  if (!fs.existsSync(CWD)) throw new Error(`train worktree ${CWD} does not exist (--worktree)`);
  const unlock = takeLock();
  if (!unlock) return 0;
  log(`tick${DRY ? ' (dry run: nothing is created, pushed, merged, labelled or commented)' : ''} in ${CWD}`);
  const startedAt = Date.now();
  let status;
  try {
    status = await safeStep(o);
    writeStatus(status);
    // audit 2 item 3: a waiting tick keeps its lock and re-checks every POLL_S s up to POLL_MAX_MIN from its start,
    // stopping at once on a state change (the step already acted on it: release, build, ...); status written each poll
    for (let prevState = null; ;) {
      const fp = fastPollPlan(status.state, startedAt, Date.now(), { pollS: POLL_S, maxMin: POLL_MAX_MIN, once: !!o.once, dry: DRY, prevState, late: !!status.laptopLate, lateS: POLL_LATE_S });
      if (!fp.poll) { if (prevState != null || FAST_POLL_STATES.includes(status.state)) log(`fast poll: stop (${fp.reason})`); break; }
      log(`fast poll: ${fp.reason}`);
      await new Promise((r) => setTimeout(r, fp.delayMs));
      prevState = status.state;
      status = await safeStep(o);
      writeStatus(status);
    }
  } finally { unlock(); }
  return status.state === 'error' ? 1 : 0;
}

/**
 * F18: the deploy watch of the last release, checked on every tick (BRIEF A7: back-to-back trains leave no idle tick).
 * Fetches /preview/version.json (AUTO_TRAIN_PAGES_URL or the repo's Pages root; 15 s, a failure reads as unknown) and
 * applies deployPlan: a repair runs `merge-train repair` (no deploy wait) under the tick lock. Never throws.
 * -> the watch to carry: undefined (none), null (dropped: served, or given up) or the watch (`repaired` set after a repair).
 */
async function deployStep(prev) {
  const watch = prev?.deployWatch;
  if (!watch?.version) return undefined;
  try {
    const root = process.env.AUTO_TRAIN_PAGES_URL || pagesRoot('Tekcry/Mobile-Coop');
    const url = `${root.replace(/\/?$/, '/')}preview/version.json?t=${Date.now()}`;
    const text = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15_000) }).then((x) => (x.ok ? x.text() : null), () => null);
    const plan = deployPlan(watch, { now: Date.now(), served: parsePreviewVersion(text)?.version ?? null, repairMin: DEPLOY_REPAIR });
    log(`deploy watch ${watch.version}: ${plan.action} - ${plan.reason}`);
    if (plan.action === 'ok' || plan.action === 'give-up') return null;
    if (plan.action !== 'repair') return watch;
    const r = await mergeTrain(['repair'], { MERGE_TRAIN_DEPLOY_WAIT_MIN: '0' });
    log(`${plan.reason} (exit ${r.dry ? 'dry run' : r.code})`);
    return { ...watch, repaired: new Date().toISOString() };
  } catch (e) { log(`deploy watch ${watch.version}: check failed (${e.message}); kept`); return watch; }
}

/**
 * step() after the deploy watch (deployStep), with errors turned into an error status that keeps the rerun record (no
 * second request), the failed-request count, checkWait, lastDrop, nothingNew and the deploy watch.
 */
async function safeStep(o) {
  const before = readStatus(FILES.realStatus);
  const watch = await deployStep(before);
  const carry = (s) => withDrafts(carryDeployWatch({ deployWatch: watch }, carryNothingNew(before, s)), DRAFTS, before);
  try { return carry(carryLastDrop(before, await step(o))); } catch (e) {
    const prevStatus = readStatus(FILES.realStatus);
    log(`ERROR: ${e.message}`);
    return carry({ state: 'error', reason: e.message.slice(0, 500), ...(prevStatus?.rerun ? { rerun: prevStatus.rerun } : {}),
      ...(prevStatus?.rerunRequestFailed ? { rerunRequestFailed: prevStatus.rerunRequestFailed } : {}),
      ...(prevStatus?.checkWait ? { checkWait: prevStatus.checkWait } : {}), ...(prevStatus?.lastDrop ? { lastDrop: prevStatus.lastDrop } : {}) });
  }
}

/** Writes the one-line status JSON (and logs it). */
function writeStatus(status) {
  const line = JSON.stringify({ state: status.state, train: status.train ?? null, version: status.version ?? null, head: status.head ?? null,
    reason: status.reason, time: new Date().toISOString(), ...(DRY ? { dryRun: true } : {}),
    ...Object.fromEntries(Object.entries(status).filter(([k]) => !['state', 'train', 'version', 'head', 'reason'].includes(k))) });
  fs.writeFileSync(STATUS, `${line}\n`);
  log(`status: ${line}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(ARGV).then((code) => process.exit(code), (e) => { console.error(`auto-train: ${e.message}`); process.exit(1); });
}
