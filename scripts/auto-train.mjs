// Auto train (Michael 2026-10-23 ~19:10, "Yes, fully automatic"): a rolling merge train with no human step. One `tick`
// (every 5 min from a scheduled task, scripts/auto-train-task.ps1) looks at GitHub and does at most one thing:
//   open train (an open PR whose head is train/<n>): CI `check` + the laptop's commit status `laptop-e2e` on its head
//     both success -> `merge-train release` (exit 3, master moved -> `merge-train build` the same members, next version);
//     a desktop `laptop-e2e` failure ("desktop: ...; FAIL: a,b") -> ONE laptop rerun of those suites per head
//     (request.mjs --train-rerun, state "laptop-rerun", recorded as `rerun` in the status; its pass posts `laptop-e2e`
//     success and releases, its fail `laptop-e2e/train<n>-rerun` -> "failed");
//     any other failure -> state "failed" (nothing destructive: the orchestrator decides which member leaves); pending ->
//     wait; no laptop status 3 h after the head was pushed -> state "stale"; CI green but no laptop status 10 min
//     after (AUTO_TRAIN_LAPTOP_MISSING_MIN) -> state "laptop-missing" (waitingMin in the status).
//   no open train: open PRs to master labelled `train-ready` with a green `check` on their head (plus feature/menu
//     when it differs from master in docs only, riding along) -> `merge-train build <n+1> <version> "<title>" ...`,
//     paced: only once the last release is --min-interval min old (default 60) or the laptop queue is idle.
// It calls scripts/merge-train.mjs (next to this file) only through its CLI, with cwd = the train worktree
// (--worktree, default C:/NightShift/Mobile-Coop-train). It reads GitHub through gh / ls-remote (no fetch of its own),
// never forces a push, never touches dev or master; every write (gh or merge-train) goes through act(), which only
// prints under --dry-run. Contract and states: docs/systems/auto-train.md.
// Usage: node scripts/auto-train.mjs tick [--dry-run] [--worktree <dir>] [--min-interval <min>] [--max-per-day <n>]
// --preview-next (with --dry-run only): ignore an open train and show the build the next tick without one would make.
// Release is `merge-train release ... --head <the tested head> --no-fallback` (pinned; never the old-style path); a
// train without a version commit is state "error" ("rebuild"). merge-train build exit 4 (vitest not run) is pending.
// A failed rebuild after release exit 3 is recorded (`rebuildFailed`) and skipped until the train head or master moves.
// Files: lock C:/NightShift/scratch/auto-train.lock (wx, stale when untouched 30 min; a heartbeat keeps a long build's
// lock fresh; merge-train takes the same lock for a hand run), log C:/NightShift/scratch/runs/auto-train.log, status
// C:/NightShift/scratch/auto-train-status.json (one line: state, train, version, head, reason, time, ...); --dry-run
// uses auto-train.dryrun.lock, runs/auto-train.dryrun.log and auto-train-status.dryrun.json. Build marker
// C:/NightShift/scratch/auto-train-building.json ({ train, version, pid, at }; dry: auto-train-building.dryrun.json),
// written just before `merge-train build` and deleted in a finally. AUTO_TRAIN_SCRATCH env moves them all.
// Exit: 0 tick done (the outcome is the status state; also when another tick holds the lock), 1 usage or error.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { takeTouchLock } from './heavy-lock.mjs';

export const LABEL = 'train-ready';
export const LAPTOP_CONTEXT = 'laptop-e2e';
export const VITEST_CONTEXT = 'auto-train/vitest';
export const MENU_BRANCH = 'feature/menu';
export const STALE_HOURS = 3;
export const LOCK_STALE_MIN = 30;
export const LAPTOP_MISSING_MIN = 10;

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
  const items = (rollup ?? []).filter((r) => (r.__typename === 'StatusContext' ? r.context : r.name) === name);
  if (!items.length) return 'missing';
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
  if (!norm.length) return 'pending';
  if (norm.some((x) => x.s === 'pending')) return 'pending';
  return norm.sort((a, b) => b.time - a.time)[0].s;
}

/** A commit status context in a combined-status JSON (`gh api .../commits/<sha>/status`) -> { state, description } (state 'missing' when absent). */
export function contextStatus(combined, context) {
  const list = (combined?.statuses ?? []).filter((s) => s.context === context)
    .sort((a, b) => (Date.parse(b.updated_at || b.created_at || '') || 0) - (Date.parse(a.updated_at || a.created_at || '') || 0));
  if (!list.length) return { state: 'missing', description: '' };
  const s = String(list[0].state).toLowerCase();
  return { state: s === 'error' ? 'failure' : s, description: list[0].description ?? '' };
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

/** Laptop queue tree paths (origin/laptop-queue) -> 'idle' | 'busy': busy while any pending request JSON or running marker exists. */
export function laptopQueueState(paths) {
  const busy = paths.some((p) => {
    const segs = p.split('/');
    const base = segs[segs.length - 1].toLowerCase();
    const dirs = segs.slice(0, -1).map((s) => s.toLowerCase());
    if (dirs.includes('running') || base.startsWith('running')) return true;
    return base.endsWith('.json') && (dirs.includes('pending') || base.startsWith('pending'));
  });
  return busy ? 'busy' : 'idle';
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

// ---- build marker (audit 2026-10-24 item 3): the laptop queue sees a `merge-train build` (vitest under heavy.lock) --

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
  const m = /;\s*FAIL:\s*(.*)$/.exec(d);
  if (!m || m[1].trim().endsWith('...')) return [];
  const suites = m[1].split(',').map((s) => s.trim()).filter(Boolean);
  if (!suites.every((s) => /^[A-Za-z0-9._:+-]+$/.test(s))) return [];
  return [...new Set(suites)];
}

/**
 * One laptop rerun per train head after a desktop failure. `train` as in decide() plus `rerun` (the
 * `laptop-e2e/train<n>-rerun` status); `prev` = the last status JSON (its `rerun: { head, id, suites, set }`).
 * -> null (not a desktop laptop failure, or no suites: decide() keeps "failed"), or { action: 'request' | 'wait' |
 * 'none', state, reason, suites, set } (+ `rerun` = the recorded request for this head).
 */
export function rerunPlan(train, prev) {
  if (!train || train.laptop?.state !== 'failure' || train.vitest === 'failure' || train.ci === 'failure') return null;
  const suites = desktopFailSuites(train.laptop.description);
  if (!suites?.length) return null;
  const t = `train ${train.n}`;
  const set = rerunSet(train.n);
  const rec = prev?.rerun && prev.rerun.head === train.head ? prev.rerun : null;
  if (!rec) {
    return { action: 'request', state: 'laptop-rerun', suites, set,
      reason: `${t}: desktop failed ${suites.join(',')} on ${short(train.head)}: requesting one laptop rerun (${set})` };
  }
  const recSuites = rec.suites ?? suites;
  const r = train.rerun ?? { state: 'missing', description: '' };
  if (r.state === 'failure') {
    return { action: 'none', state: 'failed', suites: recSuites, set, rerun: rec,
      reason: `${t}: laptop rerun ${rec.id} of ${recSuites.join(',')} failed on ${short(train.head)}${r.description ? ` (${r.description})` : ''}` };
  }
  return { action: 'wait', state: 'laptop-rerun', suites: recSuites, set, rerun: rec,
    reason: `${t}: laptop rerun ${rec.id} of ${recSuites.join(',')} on ${short(train.head)} ${r.state === 'missing' ? 'queued' : r.state}` };
}

/** request.mjs arguments of the rerun (scripts/laptop-queue/request.mjs; `--train-rerun` runs it right after trains). */
export const rerunArgs = ({ sha, suites, pr, set }) => ['--sha', sha, '--suites', suites.join(' '), '--pr', String(pr), '--set', set,
  '--requester', 'auto-train', '--train-rerun'];

/** True when every path is documentation (Markdown anywhere or under docs/). */
export const docsOnly = (files) => files.length > 0 && files.every((f) => /\.md$/i.test(f) || f.startsWith('docs/'));

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
const LAPTOP_MISSING = (() => { const v = Number(process.env.AUTO_TRAIN_LAPTOP_MISSING_MIN); return process.env.AUTO_TRAIN_LAPTOP_MISSING_MIN && Number.isFinite(v) && v >= 0 ? v : LAPTOP_MISSING_MIN; })();
let CWD = 'C:/NightShift/Mobile-Coop-train';
let LOCK_TEXT = null; // our tick lock's text, handed to merge-train (AUTO_TRAIN_LOCK_TEXT) so it runs under it

function log(msg) {
  const line = `${new Date().toISOString()} ${DRY ? '[dry] ' : ''}${msg}`;
  console.log(msg);
  try { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, `${line}\n`); } catch { /* log is best effort */ }
}

const show = (cmd) => cmd.map((a) => (/[\s"';|&]/.test(a) ? JSON.stringify(a) : a)).join(' ');

/** Runs argv (no shell) in the train worktree; never throws: { status, out, err }. */
function exec(cmd, { input } = {}) {
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd: CWD, encoding: 'utf8', input, windowsHide: true, maxBuffer: 64 << 20, timeout: 120_000 });
  if (r.error) return { status: -1, out: '', err: String(r.error.message) };
  return { status: r.status ?? -1, out: r.stdout ?? '', err: r.stderr ?? '' };
}

/** Read-only command: trimmed stdout, throws on failure. */
function read(cmd) {
  const r = exec(cmd);
  if (r.status !== 0) throw new Error(`${show(cmd)} failed (${r.status}): ${(r.err || r.out).trim().slice(-800)}`);
  return r.out.trim();
}
const readJson = (cmd) => JSON.parse(read(cmd) || 'null');

/** Every gh / git write: printed under --dry-run, run otherwise. */
function act(cmd) {
  if (DRY) { log(`  [dry-run] would run: ${show(cmd)}`); return ''; }
  log(`  > ${show(cmd)}`);
  return read(cmd);
}

/** merge-train through its CLI (async, so the lock heartbeat keeps running): { code, out }. Printed only under --dry-run. */
function mergeTrain(args) {
  const script = process.env.MERGE_TRAIN || path.join(HERE, 'merge-train.mjs');
  const cmd = ['node', script, ...args];
  if (DRY) { log(`  [dry-run] would run (cwd ${CWD}): ${show(cmd)}`); return Promise.resolve({ code: 0, out: '', dry: true }); }
  log(`  > (cwd ${CWD}) ${show(cmd)}`);
  return new Promise((resolve) => {
    const env = { ...process.env, AUTO_TRAIN_LOCK: LOCK, AUTO_TRAIN_LOCK_TEXT: LOCK_TEXT ?? '' };
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
  const r = exec(['gh', 'api', pathname, ...(jq ? ['--jq', jq] : [])]);
  if (r.status !== 0) { if (/HTTP 404|Not Found/.test(r.err + r.out)) return null; throw new Error(`gh api ${pathname}: ${(r.err || r.out).trim().slice(-400)}`); }
  return r.out.trim();
}
const apiRaw = (pathname) => {
  const r = exec(['gh', 'api', '-H', 'Accept: application/vnd.github.raw', pathname]);
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
  if (cmd !== 'tick') throw new Error('usage: node scripts/auto-train.mjs tick [--dry-run] [--worktree <dir>] [--min-interval <min>] [--max-per-day <n>] [--preview-next]');
  const o = { minInterval: 60, maxPerDay: 0, worktree: CWD };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    const num = () => { const v = Number(rest[++i]); if (!Number.isFinite(v) || v < 0) throw new Error(`${a} needs a number >= 0`); return v; };
    if (a === '--dry-run') continue;
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
    members: membersFromSubjects(subjects, n),
    ci: ciState(p.statusCheckRollup, 'check'),
    ciGreenAt: ciGreenAt(p.statusCheckRollup, combined, 'check'),
    laptop: contextStatus(combined, LAPTOP_CONTEXT),
    rerun: contextStatus(combined, rerunContext(n)),
    vitest: contextStatus(combined, VITEST_CONTEXT).state,
    ageMin: (Date.now() - since) / 60_000,
  };
}

/** Train-ready PRs with a green check on their head, plus feature/menu when it is docs-only ahead of master. */
function candidates(labelExists) {
  const out = [];
  if (labelExists) {
    const prs = readJson(['gh', 'pr', 'list', '--state', 'open', '--base', 'master', '--label', LABEL, '--limit', '100', '--json', 'number,headRefName,headRefOid,title,statusCheckRollup']);
    for (const p of prs) {
      const ci = ciState(p.statusCheckRollup, 'check');
      if (ci !== 'success') { log(`  #${p.number} ${p.headRefName}: check ${ci}, not a candidate`); continue; }
      out.push({ pr: p.number, branch: p.headRefName, head: p.headRefOid, title: p.title });
    }
  }
  if (!out.some((c) => c.branch === MENU_BRANCH)) {
    const cmp = api(`repos/{owner}/{repo}/compare/master...${MENU_BRANCH}`, '{ahead: .ahead_by, files: [.files[].filename]}');
    const c = cmp && JSON.parse(cmp);
    if (c && c.ahead > 0 && c.files.length < 300 && docsOnly(c.files)) out.push({ pr: null, branch: MENU_BRANCH, head: undefined, title: null });
    else if (c && c.ahead > 0) log(`  ${MENU_BRANCH}: ${c.ahead} commit(s) ahead but not docs-only, left for the orchestrator`);
  }
  return out;
}

/** Members with fragments read at their heads, stacked bases marked build:false; then the plan. */
export function plan(members) {
  const tips = stackedTips(members.filter((m) => m.head), contains);
  for (const m of members) {
    if (m.head && !tips.includes(m)) { m.build = false; log(`  ${m.branch} (#${m.pr}): contained in another candidate's head, rides with its tip`); }
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

/** 'idle' | 'busy' from origin/laptop-queue, or null when that branch does not exist. */
function laptopQueue() {
  const t = api('repos/{owner}/{repo}/git/trees/laptop-queue?recursive=1', '[.tree[] | select(.type == "blob") | .path]');
  return t == null ? null : laptopQueueState(JSON.parse(t));
}

function nextN() {
  const branches = read(['git', 'ls-remote', '--heads', 'origin', 'refs/heads/train/*']).split('\n').map((l) => l.split('\t')[1] ?? '').filter(Boolean);
  const titles = readJson(['gh', 'pr', 'list', '--state', 'all', '--limit', '100', '--json', 'title,headRefName']).flatMap((p) => [p.title, p.headRefName]);
  return nextTrainNumber(branches, titles);
}

/** One comment per PR head asking the lead to clear its conflict. */
function commentLeftOut(cands, left, n) {
  for (const l of left) {
    const c = cands.find((x) => x.branch === l.branch);
    if (!c?.pr) continue;
    const marker = `<!-- auto-train:left-out:${c.head} -->`;
    const bodies = readJson(['gh', 'pr', 'view', String(c.pr), '--json', 'comments']).comments.map((x) => x.body);
    if (bodies.some((b) => b.includes(marker))) continue;
    act(['gh', 'pr', 'comment', String(c.pr), '--body', [
      `Auto-train: \`${c.branch}\` (${short(c.head)}) was left out of train ${n}: ${l.why}.`,
      `Please fix the conflict with master on this branch (or on train/${n}); it keeps the \`${LABEL}\` label and joins the next train once \`check\` is green.`,
      marker].join('\n\n')]);
  }
}

/** Builds train n from `cands`; returns the status fields. */
async function build(n, cands, { rebuildOf } = {}) {
  const p = plan(cands);
  log(`build train ${n}: ${p.version} (${p.kind}, master ${p.masterVersion}) "${p.title}" <- ${p.branches.join(' ')}`);
  log(`  build marker ${FILES.building} (deleted when the build ends)`);
  const r = await withBuildMarker(FILES.building, { train: n, version: p.version }, () => mergeTrain(['build', String(n), p.version, p.title, ...p.branches]));
  const base = { train: n, version: p.version, members: p.branches };
  if (r.dry) return { ...base, state: 'building', reason: `${rebuildOf ? 'rebuild' : 'build'} would run (dry run)` };
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
  const leftOut = left.map((l) => `${l.branch}: ${l.why}`);
  if (r.code === 0) {
    if (rebuildOf) {
      const pr = readJson(['gh', 'pr', 'list', '--head', `train/${n}`, '--state', 'open', '--json', 'number'])[0]?.number;
      if (pr) act(['gh', 'pr', 'edit', String(pr), '--title', `${p.version}: Train ${n}: ${p.title}`]);
    }
    return { ...base, head, state: 'built', reason: `train ${n} built; waiting for CI and ${LAPTOP_CONTEXT}`, leftOut };
  }
  if (r.code === 2) {
    if (head) act(['gh', 'api', '-X', 'POST', `repos/{owner}/{repo}/statuses/${head}`, '-f', 'state=failure', '-f', `context=${VITEST_CONTEXT}`, '-f', 'description=vitest failed at train build']);
    return { ...base, head, state: 'failed', reason: `train ${n}: vitest failed at build (merge-train exit 2)`, leftOut };
  }
  if (r.code === 3) return { ...base, head, state: 'failed', reason: `train ${n}: every member left out on conflicts (merge-train exit 3)`, leftOut };
  if (r.code === 4) {
    // vitest not run (heavy lock busy): the train is pushed and CI's check runs the unit tests; the next tick goes on.
    return { ...base, head, state: 'pending', reason: `train ${n} built; vitest not run at build (heavy lock busy, merge-train exit 4): retry next tick`, leftOut };
  }
  return { ...base, head, state: 'error', reason: `merge-train build exit ${r.code}: ${r.out.trim().split('\n').slice(-3).join(' | ')}`, leftOut };
}

/** No open train: candidates, pacing, build. */
async function noTrain(o, labelExists) {
  const cands = candidates(labelExists);
  const queue = laptopQueue();
  const paceReason = pacing({ now: Date.now(), releases: releaseTimes(), minIntervalMin: o.minInterval, maxPerDay: o.maxPerDay, queue });
  const d = decide({ train: null, candidates: cands, paceReason });
  log(`decision: ${d.state} - ${d.reason}${queue ? ` (laptop queue ${queue})` : ''}`);
  if (d.action !== 'build') return { state: d.state, reason: d.reason, candidates: cands.map((c) => c.branch) };
  return build(nextN(), cands);
}

async function step(o) {
  const labelExists = ensureLabel();
  const t = o.previewNext ? null : openTrain();
  if (!t) return noTrain(o, labelExists);
  const d = decide({ train: t, laptopMissingMin: LAPTOP_MISSING });
  log(`train ${t.n} #${t.pr} ${short(t.head)} ${t.version ?? '?'}: CI ${t.ci}, laptop ${t.laptop.state}${t.laptop.description ? ` (${t.laptop.description})` : ''}, age ${Math.round(t.ageMin)} min -> ${d.state}: ${d.reason}`);
  const prev = readStatus(FILES.realStatus);
  // The rerun record rides along in every status of the same head, so that head never requests twice.
  const base = { train: t.n, version: t.version, head: t.head, pr: t.pr, ...(prev?.rerun?.head === t.head ? { rerun: prev.rerun } : {}) };
  const rp = rerunPlan(t, prev);
  if (rp) return rerunStep(t, rp, base);
  if (d.action !== 'release') return { ...base, state: d.state, reason: d.reason, ...(d.waitingMin != null ? { waitingMin: d.waitingMin } : {}) };
  const master = exec(['git', 'ls-remote', 'origin', 'refs/heads/master']).out.split('\t')[0].trim() || null;
  if (rebuildSkip(prev, t.head, master)) {
    log(`skip: ${prev.reason} (train head and master unchanged)`);
    return { ...base, state: 'failed', reason: prev.reason, rebuildFailed: prev.rebuildFailed };
  }
  const r = await mergeTrain(releaseArgs(t));
  if (r.dry) return { ...base, state: 'releasing', reason: `${d.reason}; release would run (dry run)` };
  if (r.code === 0) {
    log(`RELEASED train ${t.n} as ${t.version}`);
    const next = await noTrain(o, labelExists);
    return { ...next, released: `${t.version} (train ${t.n})` };
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
 * queued for this head. A failed request (non-zero exit, e.g. request.mjs without --train-rerun) is logged in the status
 * and retried next tick; it is never fatal.
 */
function rerunStep(t, rp, base) {
  log(`laptop rerun: ${rp.reason}`);
  if (rp.action !== 'request') return { ...base, state: rp.state, reason: rp.reason };
  const cmd = ['node', path.join(HERE, 'laptop-queue', 'request.mjs'), ...rerunArgs({ sha: t.head, suites: rp.suites, pr: t.pr, set: rp.set })];
  if (DRY) { log(`  [dry-run] would run (cwd ${CWD}): ${show(cmd)}`); return { ...base, state: rp.state, reason: `${rp.reason} (dry run)` }; }
  log(`  > (cwd ${CWD}) ${show(cmd)}`);
  const r = exec(cmd);
  const id = r.out.trim().split('\n').pop()?.trim() ?? '';
  if (r.status !== 0 || !id) {
    const why = (r.err || r.out).trim().split('\n').slice(-2).join(' | ').slice(0, 300) || 'no request id printed';
    log(`  rerun request failed (exit ${r.status}): ${why}`);
    return { ...base, state: rp.state, reason: `${rp.reason}; request failed (exit ${r.status}): ${why}; retry next tick`,
      rerunRequestFailed: { head: t.head, exit: r.status, why } };
  }
  const rerun = { head: t.head, id, suites: rp.suites, set: rp.set, at: new Date().toISOString() };
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
  let status;
  try { status = await step(o); } catch (e) {
    const prevRerun = readStatus(FILES.realStatus)?.rerun; // an error tick keeps the rerun record (no second request)
    status = { state: 'error', reason: e.message.slice(0, 500), ...(prevRerun ? { rerun: prevRerun } : {}) };
    log(`ERROR: ${e.message}`);
  }
  finally { unlock(); }
  const line = JSON.stringify({ state: status.state, train: status.train ?? null, version: status.version ?? null, head: status.head ?? null,
    reason: status.reason, time: new Date().toISOString(), ...(DRY ? { dryRun: true } : {}),
    ...Object.fromEntries(Object.entries(status).filter(([k]) => !['state', 'train', 'version', 'head', 'reason'].includes(k))) });
  fs.writeFileSync(STATUS, `${line}\n`);
  log(`status: ${line}`);
  return status.state === 'error' ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(ARGV).then((code) => process.exit(code), (e) => { console.error(`auto-train: ${e.message}`); process.exit(1); });
}
