// Night Shift watchdog (process audit 2026-10-24 findings 8, 9, 12, 13; Michael approved ~21:50, "Watchdog + release
// path"): a deterministic tick, run every 2 min by a scheduled task (scripts/watchdog-task.ps1) from the dedicated
// checkout C:/NightShift/Mobile-Coop-watchdog-live, that looks at the machine, GitHub, the queues and Pages and writes
// alerts to C:/NightShift/scratch/watch-status.json: { time, alerts: [{ id, severity, kind, subject, detail, since,
// action }], ... }. The orchestrator's cron reads only that file. Contract, checks and fixes: docs/systems/watchdog.md.
// Checks (pure helpers below, tests/watchdog.test.ts; gh / git / fs / process I/O in the shell part):
//   locks      heavy.lock / heavy2.lock: a dead pid, or no pid and old with no node running
//   orphans    tail.exe / grep.exe / node e2e runners whose parent process is gone
//   prs        train-ready PRs CONFLICTING (owner by branch), commits after the label
//   labels     PRs ready for train-ready (CI check green + `checker` status success + `affected-e2e` when present)
//   release    dev behind master, master's version tag missing, member PRs whose head is in master still open
//   pages      /preview/ serves master's version within 15 min of the release
//   autotrain  auto-train status stale / failed / error, its checkout behind origin/master
//   laptop     laptop-queue claims with no sign of life, old requests, stale requests (branch moved)
//   cloud      cloud-queue briefs claimed 90+ min with no branch push
// Alerts only by default. `--fix <list>` (comma list of locks, orphans, prs, labels, release, cloud) turns on the fixes
// of those checks, one at a time; every fix re-reads what it acts on right before acting and is idempotent.
// Usage: node scripts/watchdog.mjs tick [--dry-run] [--fix <list>] [--checks <list>] [--require-affected] [--self-update | --no-self-update]
// --dry-run: no write anywhere (no push, label, comment, close, kill, lock break, self-update); fixes are printed as
// "[dry-run] would ..."; the status and log go to watch-status.dryrun.json / runs/watchdog.dryrun.log. It still runs
// `git fetch origin` (local refs only) so the queues and ancestry are current.
// Files (WATCHDOG_SCRATCH moves them): status C:/NightShift/scratch/watch-status.json, state watch-state.json (alert
// first-seen times, label heads, Pages cache, the mid-action marker), log runs/watchdog.log, lock watchdog.lock.
// Exit: 0 tick done (also when another tick holds the lock), 1 usage error or a crash outside the checks.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { takeTouchLock, pidAlive } from './heavy-lock.mjs';
import { ciState, ciGreenAt, selfUpdatePlan } from './auto-train.mjs';
import { idTime, parseClaim, workerActivity } from './laptop-queue/lib.mjs';

export const CHECKS = ['locks', 'orphans', 'prs', 'labels', 'release', 'pages', 'autotrain', 'laptop', 'cloud'];
export const FIXABLE = ['locks', 'orphans', 'prs', 'labels', 'release', 'cloud'];
export const LABEL = 'train-ready';
export const CHECKER_CONTEXT = 'checker';
export const AFFECTED_CONTEXT = 'affected-e2e';
/** Thresholds in minutes (docs/systems/watchdog.md). */
export const LIMITS = {
  lockStaleMin: 60, lockOldMin: 240, orphanMin: 30, greenMin: 30, devGraceMin: 5, tagGraceMin: 5, memberGraceMin: 10,
  pagesMin: 15, autoTrainStaleMin: 10, autoTrainErrorMin: 5, autoTrainBehindMin: 60, claimSilentMin: 15,
  claimStuckMin: 90, requestOldMin: 60, cloudClaimMin: 90, actionMarkerMin: 15,
};
const SEV_ORDER = { high: 0, warn: 1, info: 2 };
const short = (sha) => String(sha ?? '').slice(0, 8);
const mins = (ms) => Math.floor(ms / 60_000);

// ---- options ---------------------------------------------------------------------------------------------------

const USAGE = 'usage: node scripts/watchdog.mjs tick [--dry-run] [--fix <list>] [--checks <list>] [--require-affected] [--self-update | --no-self-update]\n'
  + `  --fix: comma list of ${FIXABLE.join(', ')}; --checks: comma list of ${CHECKS.join(', ')} (default all)`;

/** A comma list of names, each one of `allowed` -> Set; throws on an unknown name. */
export function parseList(text, allowed, flag) {
  const names = String(text ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  for (const n of names) if (!allowed.includes(n)) throw new Error(`${flag}: unknown name "${n}" (one of ${allowed.join(', ')})\n${USAGE}`);
  return new Set(names);
}

/** argv (after `node script`) -> { cmd, dry, fix: Set, checks: Set, requireAffected, selfUpdate: 'auto' | 'on' | 'off' }. */
export function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  if (cmd !== 'tick') throw new Error(USAGE);
  const o = { cmd, dry: false, fix: new Set(), checks: new Set(CHECKS), requireAffected: false, selfUpdate: 'auto' };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--dry-run') o.dry = true;
    else if (a === '--fix') o.fix = parseList(rest[++i], FIXABLE, '--fix');
    else if (a === '--checks') o.checks = parseList(rest[++i], CHECKS, '--checks');
    else if (a === '--require-affected') o.requireAffected = true;
    else if (a === '--self-update') o.selfUpdate = 'on';
    else if (a === '--no-self-update') o.selfUpdate = 'off';
    else throw new Error(`unknown argument ${a}\n${USAGE}`);
  }
  return o;
}

/** Status, state, log and lock paths in `scratch` (a dry run gets its own status, log and lock; it never writes state). */
export function scratchFiles(scratch, dry) {
  const x = dry ? '.dryrun' : '';
  return {
    status: path.join(scratch, `watch-status${x}.json`),
    state: path.join(scratch, 'watch-state.json'),
    log: path.join(scratch, 'runs', `watchdog${x}.log`),
    lock: path.join(scratch, `watchdog${x}.lock`),
  };
}

// ---- alerts: first-seen times and grace ------------------------------------------------------------------------

/** One alert. `fix` = a fix descriptor ({ check, type, desc, ... }) or null; `graceMin` holds it back after first seen. */
export function alert(kind, subject, severity, detail, { fix = null, graceMin = 0, advice = '' } = {}) {
  return { id: `${kind}:${subject}`, severity, kind, subject, detail, fix, graceMin, advice };
}

/**
 * Stamps each alert with `since` (first seen, carried in `prev` by id) and holds back the ones still inside their
 * grace. -> { shown, held: [{ id, severity, detail, since, graceMin }], since } (`since` = the new map: only the ids seen this tick, so a cleared alert starts over).
 */
export function applySince(alerts, prev, now) {
  const since = {};
  const shown = [];
  const held = [];
  for (const a of alerts) {
    const t0 = Date.parse(prev?.[a.id] ?? '') || now;
    since[a.id] = new Date(t0).toISOString();
    if (a.graceMin && now - t0 < a.graceMin * 60_000) { held.push({ id: a.id, severity: a.severity, detail: a.detail, since: since[a.id], graceMin: a.graceMin }); continue; }
    shown.push({ ...a, since: since[a.id] });
  }
  shown.sort((a, b) => (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3) || a.id.localeCompare(b.id));
  return { shown, held, since };
}

/** The `action` text of an alert: what the fix did / would do, or why it is alert only. */
export function actionText(a, fixOn, result = null) {
  if (!a.fix) return a.advice || 'alert only';
  if (result) return result;
  if (!fixOn.has(a.fix.check)) return `alert only (--fix ${a.fix.check} would: ${a.fix.desc})`;
  return `fix: ${a.fix.desc}`;
}

// ---- 1. locks ----------------------------------------------------------------------------------------------------

/**
 * A lock file's text -> { writer, pid, host, at }. Writers: 'heavy-lock' (scripts/heavy-lock.mjs "<label> | <iso> |
 * pid <n> | host <h>"), 'laptop-queue' (service "laptop-queue | <label> <sha8> pid <n> | <iso>"), 'touch'
 * (takeTouchLock "<label> | pid <n> | <iso>"), 'session' (the noclobber "<session> | <job> | <start>", no pid), 'unknown'.
 */
export function parseLockText(text) {
  const t = String(text ?? '').trim();
  let m = /^(.*) \| (\S+) \| pid (\d+) \| host (.+)$/.exec(t);
  if (m) return { writer: 'heavy-lock', pid: Number(m[3]), host: m[4].trim(), at: Date.parse(m[2]) || null };
  m = /^laptop-queue \| .*\bpid (\d+) \| (\S+)$/.exec(t);
  if (m) return { writer: 'laptop-queue', pid: Number(m[1]), host: null, at: Date.parse(m[2]) || null };
  m = /^(.*?) \| pid (\d+) \| (\S+)$/.exec(t);
  if (m) return { writer: 'touch', pid: Number(m[2]), host: null, at: Date.parse(m[3]) || null };
  if (/ \| /.test(t)) return { writer: 'session', pid: null, host: null, at: null };
  return { writer: 'unknown', pid: null, host: null, at: null };
}
export const KNOWN_LOCK_WRITERS = ['heavy-lock', 'laptop-queue', 'touch'];

/**
 * Alerts for one lock: `l` = { path, text (null = absent), mtimeMs }; `env` = { now, host, alive(pid), nodeLive }.
 * A pid that is not running (on this host) -> high, fixable (break) only when a known writer wrote it; no pid and over
 * lockStaleMin with no node process at all -> warn, alert only; a live pid over lockOldMin -> info.
 */
export function lockAlerts(l, { now, host = os.hostname(), alive = pidAlive, nodeLive = true, limits = LIMITS }) {
  if (l.text == null) return [];
  const p = parseLockText(l.text);
  const at = p.at ?? l.mtimeMs ?? now;
  const age = mins(now - at);
  const desc = `"${String(l.text).trim().slice(0, 160)}"`;
  if (p.pid != null && (p.host == null || p.host.toLowerCase() === String(host).toLowerCase()) && !alive(p.pid)) {
    const known = KNOWN_LOCK_WRITERS.includes(p.writer);
    return [alert('lock-dead-pid', l.path, 'high', `${desc}: pid ${p.pid} is not running (${age} min old)`, {
      fix: known ? { check: 'locks', type: 'break-lock', path: l.path, text: l.text, desc: `break ${path.basename(l.path)} (pid ${p.pid} dead, written by ${p.writer})` } : null,
      advice: known ? '' : 'alert only (unknown writer: remove it by hand once its owner is confirmed gone)',
    })];
  }
  if (p.pid == null && age >= limits.lockStaleMin && !nodeLive) {
    return [alert('lock-stale', l.path, 'warn', `${desc}: no pid, ${age} min old, no node process running`, {
      advice: 'alert only (no pid to verify: remove it by hand when its owner is gone)' })];
  }
  if (p.pid != null && age >= limits.lockOldMin) return [alert('lock-old', l.path, 'info', `${desc}: held ${age} min (pid ${p.pid} alive)`)];
  return [];
}

// ---- 2. orphans --------------------------------------------------------------------------------------------------

export const ORPHAN_NAMES = ['tail.exe', 'grep.exe'];
/** A node e2e runner: scripts/run-e2e.mjs, scripts/e2e-*.mjs, or the runner's `vite preview` server. */
export const E2E_CMD = /(?:^|[\s"'\\/])scripts[\\/](?:run-e2e|e2e-[\w-]+)\.mjs\b|vite(?:\.js)?["']?\s+preview\b/i;
/** Night Shift command lines (only these are ever killed): its folders, its scripts, its e2e ports. */
export const NS_CMD = /NightShift|Mobile-Coop|(?:^|[\s"'\\/])scripts[\\/](?:run-e2e|e2e-[\w-]+|laptop-queue[\\/][\w-]+|auto-train|merge-train|watchdog)\.mjs\b|vite(?:\.js)?["']?\s+preview\s+--port\s+41(?:73|79|89|91|92)\b/i;

/**
 * Orphans in a process list [{ pid, ppid, name, cmd, created (ms) }]: tail.exe / grep.exe / node e2e runners whose
 * parent is gone (no such pid, or that pid started after the child: reused) and that are at least `minAgeMin` old (a
 * Git Bash pipeline's short-lived fork parent makes young pipeline members look parentless). killable = NS_CMD.
 */
export function findOrphans(procs, now, { minAgeMin = LIMITS.orphanMin } = {}) {
  const byPid = new Map(procs.map((p) => [p.pid, p]));
  const out = [];
  for (const p of procs) {
    const name = String(p.name ?? '').toLowerCase();
    const cmd = String(p.cmd ?? '');
    if (!ORPHAN_NAMES.includes(name) && !(name === 'node.exe' && E2E_CMD.test(cmd))) continue;
    const parent = byPid.get(p.ppid);
    const gone = !parent || (parent.created && p.created && parent.created > p.created);
    if (!gone || !p.created) continue;
    const ageMin = (now - p.created) / 60_000;
    if (ageMin < minAgeMin) continue;
    out.push({ ...p, ageMin, killable: NS_CMD.test(cmd) });
  }
  return out;
}

export function orphanAlerts(orphans) {
  return orphans.map((o) => alert('orphan', `pid ${o.pid}`, 'warn',
    `${o.name}, parent ${o.ppid} gone, ${Math.floor(o.ageMin)} min old: ${String(o.cmd).replace(/\s+/g, ' ').slice(0, 200)}`, {
      fix: o.killable ? { check: 'orphans', type: 'kill', pid: o.pid, created: o.created, cmd: o.cmd, desc: `taskkill /PID ${o.pid} /T /F (${o.name})` } : null,
      advice: o.killable ? '' : 'alert only (not a Night Shift command line: never killed)',
    }));
}

// ---- 3 / 4. PRs and labels ---------------------------------------------------------------------------------------

/**
 * A GraphQL pull request node (OPEN_PRS_QUERY) -> { number, title, branch, head, draft, mergeable, labels, labeled,
 * labeledAt, headAt, check, checkGreenAt, statuses: { context: { state, description, at } } } (newest status per context).
 */
export function normalizePr(node) {
  const commit = node?.commits?.nodes?.[0]?.commit ?? {};
  const rollup = commit.statusCheckRollup?.contexts?.nodes ?? [];
  const statuses = {};
  for (const s of rollup) {
    if (s?.__typename !== 'StatusContext') continue;
    const at = Date.parse(s.createdAt || '') || 0;
    if (statuses[s.context] && statuses[s.context].at > at) continue;
    const st = String(s.state).toLowerCase();
    statuses[s.context] = { state: st === 'error' ? 'failure' : st === 'expected' ? 'pending' : st, description: s.description ?? '', at };
  }
  const labels = (node?.labels?.nodes ?? []).map((l) => l.name);
  let labeledAt = null;
  for (const e of node?.timelineItems?.nodes ?? []) {
    if (e?.__typename === 'LabeledEvent' && e.label?.name === LABEL) labeledAt = Math.max(labeledAt ?? 0, Date.parse(e.createdAt) || 0);
  }
  return {
    number: node.number, title: node.title ?? '', branch: node.headRefName, head: node.headRefOid, draft: !!node.isDraft,
    mergeable: node.mergeable ?? 'UNKNOWN', labels, labeled: labels.includes(LABEL), labeledAt,
    headAt: Date.parse(commit.committedDate || '') || null,
    check: ciState(rollup, 'check'), checkGreenAt: ciGreenAt(rollup, null, 'check'), statuses,
  };
}

const statusOf = (pr, ctx) => pr.statuses?.[ctx]?.state ?? 'missing';
export const isTrain = (branch) => /^train\/\d+$/.test(String(branch ?? ''));

/**
 * Whether a PR may get `train-ready` (the label convention, docs/systems/watchdog.md): not a train, not a draft, not
 * CONFLICTING, CI `check` success, commit status `checker` success on the head, and `affected-e2e` success when the
 * head has one (or always, with requireAffected). -> { ready, why }.
 */
export function labelReady(pr, { requireAffected = false } = {}) {
  const no = (why) => ({ ready: false, why });
  if (isTrain(pr.branch)) return no('train PR');
  if (pr.draft) return no('draft');
  if (pr.mergeable === 'CONFLICTING') return no('conflicting');
  if (pr.check !== 'success') return no(`check ${pr.check}`);
  const checker = statusOf(pr, CHECKER_CONTEXT);
  if (checker !== 'success') return no(`${CHECKER_CONTEXT} ${checker}`);
  const aff = statusOf(pr, AFFECTED_CONTEXT);
  if (aff === 'missing' && requireAffected) return no(`${AFFECTED_CONTEXT} missing`);
  if (aff !== 'missing' && aff !== 'success') return no(`${AFFECTED_CONTEXT} ${aff}`);
  const desc = pr.statuses[CHECKER_CONTEXT].description;
  return { ready: true, why: `check green, ${CHECKER_CONTEXT} success${desc ? ` (${desc})` : ''}${aff === 'success' ? `, ${AFFECTED_CONTEXT} success` : ''}` };
}

/**
 * PR and label alerts. `prs` = normalizePr()s; `labelHeads` = { [pr]: head } from the last tick (the head each
 * labelled PR had when first seen labelled). -> { alerts, labelHeads } (the new map: labelled PRs only).
 * - labelled + CONFLICTING -> pr-conflict (high, owner named), alert only.
 * - labelled + commits after the label (head committed after the newest `train-ready` label event, or the head moved
 *   since first seen labelled) and no `checker` success on the new head -> pr-commit-after-label; fix (prs): remove the
 *   label and comment once per head.
 * - not labelled + labelReady -> pr-label-ready; fix (labels) adds the label; without that fix the alert shows once
 *   `check` has been green greenMin min.
 */
export function prAlerts(prs, { now, labelHeads = {}, owner = () => '', labelFix = false, requireAffected = false, limits = LIMITS } = {}) {
  const alerts = [];
  const heads = {};
  for (const pr of prs) {
    if (isTrain(pr.branch)) continue;
    const who = owner(pr.branch, pr.number);
    const subj = `#${pr.number} ${pr.branch}`;
    if (pr.labeled) {
      const prev = labelHeads[pr.number];
      const moved = (pr.labeledAt != null && pr.headAt != null && pr.headAt > pr.labeledAt) || (prev != null && prev !== pr.head);
      const checked = statusOf(pr, CHECKER_CONTEXT) === 'success';
      if (moved && !checked) {
        heads[pr.number] = prev ?? pr.head;
        alerts.push(alert('pr-commit-after-label', subj, 'warn',
          `commits after ${LABEL} (head ${short(pr.head)}${prev && prev !== pr.head ? `, labelled at ${short(prev)}` : ''}), no ${CHECKER_CONTEXT} success on the new head; owner ${who}`, {
            fix: { check: 'prs', type: 'unlabel', pr: pr.number, head: pr.head, branch: pr.branch, desc: `remove ${LABEL} from #${pr.number} and comment` } }));
      } else heads[pr.number] = pr.head;
      if (pr.mergeable === 'CONFLICTING') {
        alerts.push(alert('pr-conflict', subj, 'high', `${LABEL} but CONFLICTING with master; owner ${who}`, { advice: `alert only (tell ${who}: fix the conflict on the branch)` }));
      }
      continue;
    }
    const lr = labelReady(pr, { requireAffected });
    if (!lr.ready) continue;
    const greenMin = pr.checkGreenAt ? mins(now - pr.checkGreenAt) : 0;
    if (!labelFix && greenMin < limits.greenMin) continue;
    alerts.push(alert('pr-label-ready', subj, labelFix ? 'info' : 'warn', `${lr.why}; green ${greenMin} min, no ${LABEL}; owner ${who}`, {
      fix: { check: 'labels', type: 'label', pr: pr.number, head: pr.head, branch: pr.branch, why: lr.why, desc: `add ${LABEL} to #${pr.number}` } }));
  }
  return { alerts, labelHeads: heads };
}

/** Comment bodies (with a per-head marker, so each is posted once per head). */
export const labelComment = (head, why) => `Watchdog: added \`${LABEL}\` on ${short(head)} (${why}).\n\n<!-- watchdog:label:${head} -->`;
export const unlabelComment = (head) => [
  `Watchdog: commits landed after \`${LABEL}\` (head ${short(head)} has no \`${CHECKER_CONTEXT}\` success), so the label was removed and this PR no longer joins trains.`,
  `Run the checker on the new head (it posts the \`${CHECKER_CONTEXT}\` commit status, docs/systems/watchdog.md) and the label comes back, or re-add it by hand.`,
  `<!-- watchdog:unlabel:${head} -->`].join('\n\n');
export const closeMemberComment = (head, version) => `Watchdog: this PR's head ${short(head)} is in master (${version}), so it was merged through a train; closing it.\n\n<!-- watchdog:close:${head} -->`;

/**
 * Owner names by branch / PR: `override` = { branch or branch prefix: owner } (C:/NightShift/scratch/watch-owners.json),
 * then the newest laptop-queue request naming the branch or PR (its requester), then a cloud brief's "Lead:" for its
 * "New branch:", else "job <branch without feature/>". -> owner(branch, pr) -> string.
 */
export function ownerMap({ requests = [], briefs = [], override = {} } = {}) {
  const byBranch = new Map();
  const byPr = new Map();
  for (const b of briefs) if (b.branch && b.lead) byBranch.set(b.branch, b.lead);
  for (const r of [...requests].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    if (!r.requester) continue;
    if (r.branch) byBranch.set(r.branch, r.requester);
    if (r.pr) byPr.set(Number(r.pr), r.requester);
  }
  const prefixes = Object.keys(override ?? {}).sort((a, b) => b.length - a.length);
  return (branch, pr) => {
    const b = String(branch ?? '');
    const o = prefixes.find((p) => b === p || b.startsWith(p));
    if (o) return override[o];
    return byBranch.get(b) ?? (pr != null ? byPr.get(Number(pr)) : undefined) ?? `job ${b.replace(/^feature\//, '') || '?'}`;
  };
}

// ---- 5. releases -------------------------------------------------------------------------------------------------

/**
 * The commit that set master's version: `log` = master's first-parent history newest first [{ sha, at, version }];
 * -> { version, sha, at } of the oldest commit in the newest run of the head's version (the train's merge commit), or null.
 */
export function versionCommit(log) {
  const head = log[0];
  if (!head?.version) return null;
  let pick = head;
  for (const c of log) { if (c.version !== head.version) break; pick = c; }
  return { version: head.version, sha: pick.sha, at: pick.at };
}

/**
 * Release-tail alerts. r = { master, dev, devBehind (dev is an ancestor of master), version, versionSha, tagExists,
 * members: [{ number, branch, head, inMaster }] (open non-train PRs; inMaster = head is an ancestor of master) }.
 */
export function releaseAlerts(r, { limits = LIMITS } = {}) {
  const out = [];
  if (r.master && r.dev && r.dev !== r.master) {
    if (r.devBehind) {
      out.push(alert('release-dev-lag', 'dev', 'warn', `dev ${short(r.dev)} is behind master ${short(r.master)}`, {
        graceMin: limits.devGraceMin,
        fix: { check: 'release', type: 'push-dev', master: r.master, dev: r.dev, desc: `git push origin ${short(r.master)}:refs/heads/dev (fast-forward)` } }));
    } else {
      out.push(alert('release-dev-diverged', 'dev', 'high', `dev ${short(r.dev)} is not an ancestor of master ${short(r.master)}`, { advice: 'alert only (never forced)' }));
    }
  }
  if (r.version && r.tagExists === false) {
    out.push(alert('release-tag-missing', `v${r.version}`, 'warn', `master is ${r.version} but tag v${r.version} is missing${r.versionSha ? ` (release commit ${short(r.versionSha)})` : ''}`, {
      graceMin: limits.tagGraceMin,
      fix: r.versionSha ? { check: 'release', type: 'push-tag', tag: `v${r.version}`, sha: r.versionSha, desc: `git push origin ${short(r.versionSha)}:refs/tags/v${r.version}` } : null,
      advice: r.versionSha ? '' : 'alert only (release commit not found)' }));
  }
  for (const m of r.members ?? []) {
    if (!m.inMaster || isTrain(m.branch) || ['dev', 'master'].includes(m.branch)) continue;
    out.push(alert('release-member-open', `#${m.number} ${m.branch}`, 'warn', `head ${short(m.head)} is in master but the PR is still open`, {
      graceMin: limits.memberGraceMin,
      fix: { check: 'release', type: 'close', pr: m.number, head: m.head, version: r.version, desc: `gh pr close ${m.number} with a comment` } }));
  }
  return out;
}

// ---- 6. Pages ----------------------------------------------------------------------------------------------------

/** The module script of a built index.html (`<script type="module" ... src="...">`), or null. */
export function indexScript(html) {
  const m = /<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/i.exec(String(html ?? '')) ?? /<script\b[^>]*\bsrc="([^"]+)"[^>]*\btype="module"/i.exec(String(html ?? ''));
  return m ? m[1] : null;
}

/** The main menu label in a preview bundle ("v4.95.3 PREVIEW · bd54dfc", src/ui/screens/mainMenu.ts) -> { version, sha } or null. */
export function previewLabel(js) {
  const m = /v(\d+\.\d+\.\d+) PREVIEW(?: [A-Z0-9-]+)?(?:\s(?:\u00b7|\\u00b7|\\xb7|\\xB7|&middot;)\s([0-9a-f]{6,40}))?/.exec(String(js ?? ''));
  return m ? { version: m[1], sha: m[2] ?? null } : null;
}

/** p = { released: { version, at }, served: { version, sha } | null, error, now }. */
export function pagesAlerts(p, { limits = LIMITS } = {}) {
  if (!p.released?.version) return [];
  if (!p.served) {
    return [alert('pages-unreadable', '/preview/', 'warn', `could not read the /preview/ version: ${p.error || 'no label found'}`, { graceMin: limits.pagesMin })];
  }
  if (p.served.version === p.released.version) return [];
  const age = p.released.at ? mins(p.now - p.released.at) : null;
  if (age != null && age < limits.pagesMin) return [];
  return [alert('pages-behind', '/preview/', 'high',
    `/preview/ serves v${p.served.version}${p.served.sha ? ` (${p.served.sha})` : ''}, master is v${p.released.version}${age != null ? ` since ${age} min` : ''}`, {
      advice: 'alert only (check the deploy workflow run for dev / master)' })];
}

// ---- 7. auto-train -----------------------------------------------------------------------------------------------

const ATTENTION = ['rerun-stale', 'rerun-request-failed', 'stale', 'laptop-missing'];

/** a = { status (parsed auto-train-status.json or null), now, head (its checkout HEAD), master, dir }. */
export function autoTrainAlerts(a, { limits = LIMITS } = {}) {
  const out = [];
  const s = a.status;
  if (!s) return [alert('autotrain-stale', 'status', 'high', 'auto-train-status.json missing or unreadable')];
  const age = mins(a.now - (Date.parse(s.time) || 0));
  if (age >= limits.autoTrainStaleMin) out.push(alert('autotrain-stale', 'status', 'high', `status ${age} min old (state ${s.state}): is the task running?`));
  const subj = `train ${s.train ?? '-'}`;
  const why = `${s.state}: ${String(s.reason ?? '').slice(0, 300)}`;
  if (s.state === 'failed') out.push(alert('autotrain-failed', subj, 'high', why, { advice: 'alert only (orchestrator: drop the culprit or fix train/<n>)' }));
  else if (s.state === 'error') out.push(alert('autotrain-error', subj, 'warn', why, { graceMin: limits.autoTrainErrorMin }));
  else if (ATTENTION.includes(s.state)) out.push(alert(`autotrain-${s.state}`, subj, 'warn', why));
  if (a.head && a.master && a.head !== a.master) {
    out.push(alert('autotrain-behind', a.dir || 'checkout', 'warn', `auto-train checkout at ${short(a.head)}, origin/master ${short(a.master)} (it self-updates on idle ticks)`, { graceMin: limits.autoTrainBehindMin }));
  }
  return out;
}

// ---- 8. laptop queue ---------------------------------------------------------------------------------------------

/** Paths that never make a request stale (the queue-audit rule): docs, tests, e2e scripts, fragments, CHANGELOG, *.md. */
export const nonTestFiles = (files) => files.filter((f) => f && !/^(docs\/|tests\/|scripts\/e2e|changes\/|CHANGELOG)|\.md$/.test(f));

/**
 * q = { requests: [{ id, sha, branch, pr, requester, set, pin }], claims: { [id]: claim } (claims/<id>.json, a train:
 * claims/<sha>.json), trainHeads: Set of open train heads, activity: { laptop, desktop } (ms of each worker's newest push
 * on the branch), desktopBeat (ms, the desktop service's newest log write), stale: { [id]: { ref, files } }, now }.
 * Sign of life of an open claim = newest of its `at`, its `beat` (when the service writes one), its worker's newest
 * push and (desktop) the service log. Over claimSilentMin -> lq-claim-silent; claim over claimStuckMin -> lq-claim-stuck.
 */
export function laptopAlerts(q, { limits = LIMITS } = {}) {
  const out = [];
  const reqIds = new Set(q.requests.map((r) => r.id));
  for (const [id, c] of Object.entries(q.claims ?? {})) {
    if (!c || c.done) continue;
    const train = /^[0-9a-f]{40}$/.test(id);
    if (train ? !q.trainHeads?.has(id) : !reqIds.has(id)) continue;
    const at = Date.parse(c.at) || 0;
    const beat = Math.max(at, Date.parse(c.beat ?? '') || 0, q.activity?.[c.worker] || 0, c.worker === 'desktop' ? q.desktopBeat || 0 : 0);
    const subj = train ? `train ${short(id)}` : id;
    const age = mins(q.now - at);
    const silent = mins(q.now - beat);
    if (age >= limits.claimStuckMin) out.push(alert('lq-claim-stuck', subj, 'high', `claimed by ${c.worker} ${age} min ago, not done (last sign of life ${silent} min ago)`));
    else if (silent >= limits.claimSilentMin) out.push(alert('lq-claim-silent', subj, 'warn', `claimed by ${c.worker} ${age} min ago, no sign of life for ${silent} min`));
  }
  for (const r of q.requests) {
    const c = q.claims?.[r.id];
    if (c?.done) continue;
    const who = String(r.requester ?? '?').replace(/^Night Shift \| /, '');
    const st = q.stale?.[r.id];
    if (st && !r.pin) out.push(alert('lq-request-stale', r.id, 'warn', `${who} [${r.set ?? ''}]: ${st.ref} moved past ${short(r.sha)} in ${st.files} non-test file(s); the verdict cannot count`, { advice: `alert only (${who}: withdraw it)` }));
    if (c) continue; // claimed: the claim checks cover it
    const age = mins(q.now - idTime(r.id));
    if (age >= limits.requestOldMin) out.push(alert('lq-request-old', r.id, 'warn', `${who} [${r.set ?? ''}]: queued ${age} min, unclaimed`));
  }
  return out;
}

// ---- 9. cloud queue ----------------------------------------------------------------------------------------------

/** "2026-10-24T10:37Z" / "2026-10-23T21:15+1100" / full ISO -> ms or NaN. */
export function parseLooseIso(s) {
  return Date.parse(String(s ?? '').trim().replace(/([+-]\d\d)(\d\d)$/, '$1:$2'));
}

/** A cloud-queue brief -> { status, by, at (ms), branch, lead, line } (README: line 1 is the status). */
export function parseBrief(text) {
  const t = String(text ?? '').replace(/\r\n/g, '\n');
  const line = t.split('\n')[0] ?? '';
  const m = /^status:\s*(open|claimed|done|blocked)\b\s*(.*)$/.exec(line.trim());
  const status = m ? m[1] : null;
  let by = null, at = null;
  if (status === 'claimed') {
    const c = /^(.*?)\s+(\d{4}-\d\d-\d\dT[\d:.]+(?:Z|[+-]\d\d:?\d\d)?)$/.exec(m[2].trim());
    if (c) { by = c[1]; at = parseLooseIso(c[2]) || null; } else by = m[2].trim() || null;
  }
  const branch = /New branch:\s*`([^`\s]+)`/i.exec(t)?.[1] ?? null;
  const lead = /^Lead:\s*(.+?)(?:\s+\(|$)/m.exec(t)?.[1]?.trim() ?? null;
  return { status, by, at, branch, lead, line };
}

/**
 * b = [{ path, blob, text, pushed (true: the branch has a commit after the claim; false: no such branch or none after
 * the claim; null: unknown) }], now. Claimed claimMin+ min and not pushed -> cloud-claim-stale; fix (cloud) reopens it
 * when the push is known missing.
 */
export function cloudAlerts(briefs, { now, limits = LIMITS } = {}) {
  const out = [];
  for (const b of briefs) {
    const p = parseBrief(b.text);
    if (p.status !== 'claimed' || !p.at || b.pushed === true) continue;
    const age = mins(now - p.at);
    if (age < limits.cloudClaimMin) continue;
    const name = path.posix.basename(b.path);
    out.push(alert('cloud-claim-stale', name, 'warn',
      `claimed by ${p.by ?? '?'} ${age} min ago, ${p.branch ? `no push of ${p.branch} since` : 'branch unknown (no "New branch:" line)'}`, {
        fix: p.branch && b.pushed === false ? { check: 'cloud', type: 'reopen', path: b.path, blob: b.blob, line: p.line, by: p.by, branch: p.branch, age, desc: `reopen ${name} (status: open) with a commit on cloud-queue` } : null,
        advice: p.branch ? 'alert only (push state unknown)' : 'alert only (no branch to check)' }));
  }
  return out;
}

/** The brief text reopened: line 1 `status: open`, a dated watchdog note appended. */
export function reopenText(text, { by, branch, age, now }) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  lines[0] = 'status: open';
  const body = lines.join('\n').replace(/\n+$/, '');
  return `${body}\n\nWatchdog ${new Date(now).toISOString()}: reopened (claimed by ${by ?? '?'} ${age} min before, no push of \`${branch}\`).\n`;
}

// ---- shell -------------------------------------------------------------------------------------------------------

const ARGV = process.argv.slice(2);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.resolve(HERE, '..');
const REPO = process.env.WATCHDOG_REPO || 'Tekcry/Mobile-Coop';
const SCRATCH = process.env.WATCHDOG_SCRATCH || 'C:/NightShift/scratch';
const LIVE_DIR = process.env.WATCHDOG_LIVE_DIR || 'C:/NightShift/Mobile-Coop-watchdog-live';
const LOCKS = (process.env.WATCHDOG_LOCKS || 'C:/NightShift/heavy.lock,C:/NightShift/heavy2.lock').split(',').map((s) => s.trim()).filter(Boolean);
const PAGES_URL = process.env.WATCHDOG_PAGES_URL || 'https://tekcry.github.io/Mobile-Coop/preview/';
const AUTOTRAIN_STATUS = process.env.WATCHDOG_AUTOTRAIN_STATUS || path.join(process.env.AUTO_TRAIN_SCRATCH || SCRATCH, 'auto-train-status.json');
const AUTOTRAIN_VBS = path.join(SCRATCH, 'auto-train-task.vbs');
const DESKTOP_LQ_DIR = process.env.WATCHDOG_LQ_DESKTOP_DIR || path.join(SCRATCH, 'laptop-queue-desktop');
const OWNERS_FILE = path.join(SCRATCH, 'watch-owners.json');
let DRY = false;
let FILES = scratchFiles(SCRATCH, false);

function log(msg) {
  console.log(msg);
  try { fs.mkdirSync(path.dirname(FILES.log), { recursive: true }); fs.appendFileSync(FILES.log, `${new Date().toISOString()} ${DRY ? '[dry] ' : ''}${msg}\n`); } catch { /* best effort */ }
}
const show = (cmd) => cmd.map((a) => (/[\s"';|&]/.test(a) ? JSON.stringify(a) : a)).join(' ');

/** argv, no shell; never throws: { status, out, err }. */
function exec(cmd, { cwd = REPO_DIR, input, timeout = 60_000, buffer = false } = {}) {
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd, input, ...(buffer ? {} : { encoding: 'utf8' }), windowsHide: true, maxBuffer: 128 << 20, timeout });
  if (r.error) return { status: -1, out: buffer ? Buffer.alloc(0) : '', err: String(r.error.message) };
  return { status: r.status ?? -1, out: r.stdout ?? '', err: String(r.stderr ?? '') };
}
function read(cmd, opts) {
  const r = exec(cmd, opts);
  if (r.status !== 0) throw new Error(`${show(cmd)} failed (${r.status}): ${(r.err || String(r.out)).trim().slice(-400)}`);
  return String(r.out).trim();
}
const git = (args, opts) => read(['git', ...args], opts);
const gitOk = (args) => exec(['git', ...args]).status === 0;

/** `git cat-file --batch` over specs ("<rev>:<path>") -> Map spec -> { blob, text } | null. */
function readBlobs(specs) {
  const map = new Map();
  if (!specs.length) return map;
  const r = exec(['git', 'cat-file', '--batch'], { input: `${specs.join('\n')}\n`, buffer: true, timeout: 120_000 });
  if (r.status !== 0) throw new Error(`git cat-file --batch failed: ${r.err.slice(-300)}`);
  const buf = r.out;
  let pos = 0;
  for (const spec of specs) {
    const nl = buf.indexOf(10, pos);
    if (nl < 0) break;
    const header = buf.subarray(pos, nl).toString('utf8');
    pos = nl + 1;
    const m = /^([0-9a-f]{40}) (\w+) (\d+)$/.exec(header);
    if (!m) { map.set(spec, null); continue; }
    const size = Number(m[3]);
    map.set(spec, { blob: m[1], text: buf.subarray(pos, pos + size).toString('utf8') });
    pos += size + 1;
  }
  return map;
}

const readJsonFile = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8').trim().split('\n').pop()); } catch { return null; } };

/** Windows processes [{ pid, ppid, name, cmd, created }] (one PowerShell CIM query). */
function processes(filter = '') {
  const ps = `$ErrorActionPreference='Stop'; Get-CimInstance Win32_Process ${filter} | ForEach-Object { [pscustomobject]@{ pid=$_.ProcessId; ppid=$_.ParentProcessId; name=$_.Name; cmd=$_.CommandLine; created=$(if ($_.CreationDate) { ([DateTimeOffset]$_.CreationDate).ToUnixTimeMilliseconds() } else { 0 }) } } | ConvertTo-Json -Compress -Depth 2`;
  const out = read(['powershell', '-NoProfile', '-NonInteractive', '-Command', ps], { timeout: 60_000 });
  if (!out) return [];
  const j = JSON.parse(out);
  return (Array.isArray(j) ? j : [j]).map((p) => ({ pid: Number(p.pid), ppid: Number(p.ppid), name: p.name ?? '', cmd: p.cmd ?? '', created: Number(p.created) || 0 }));
}

const OPEN_PRS_QUERY = `query($owner:String!,$name:String!){ repository(owner:$owner,name:$name){ pullRequests(states:OPEN,first:100,baseRefName:"master",orderBy:{field:CREATED_AT,direction:DESC}){ nodes{ number title headRefName headRefOid isDraft mergeable labels(first:30){nodes{name}} timelineItems(last:40,itemTypes:[LABELED_EVENT]){nodes{__typename ... on LabeledEvent{createdAt label{name}}}} commits(last:1){nodes{commit{oid committedDate statusCheckRollup{contexts(first:100){nodes{__typename ... on CheckRun{name status conclusion completedAt startedAt} ... on StatusContext{context state description createdAt}}}}}}} } } } }`;

// ---- context: everything the checks read, gathered once per tick ---------------------------------------------------

function gather(o) {
  const ctx = { now: Date.now(), errors: {} };
  const need = (...names) => names.some((n) => o.checks.has(n));
  const tryGet = (name, fn) => { try { return fn(); } catch (e) { ctx.errors[name] = e.message; return null; } };
  const fetched = tryGet('fetch', () => git(['fetch', '-q', 'origin'], { timeout: 180_000 }));
  if (fetched === null) log(`git fetch failed: ${ctx.errors.fetch}`);
  ctx.heads = tryGet('heads', () => Object.fromEntries(git(['ls-remote', '--heads', 'origin']).split('\n').filter(Boolean)
    .map((l) => { const [sha, ref] = l.split('\t'); return [ref.replace(/^refs\/heads\//, ''), sha]; })));
  if (need('locks', 'orphans')) ctx.procs = tryGet('processes', () => processes());
  if (need('prs', 'labels', 'release', 'laptop')) {
    ctx.prs = tryGet('prs', () => {
      const [owner, name] = REPO.split('/');
      const j = JSON.parse(read(['gh', 'api', 'graphql', '-F', `owner=${owner}`, '-F', `name=${name}`, '-f', `query=${OPEN_PRS_QUERY}`], { timeout: 90_000 }));
      return (j?.data?.repository?.pullRequests?.nodes ?? []).map(normalizePr);
    });
  }
  if (need('prs', 'labels', 'laptop')) {
    ctx.lq = tryGet('laptop-queue', () => {
      const names = git(['ls-tree', '-r', '--name-only', 'origin/laptop-queue', 'requests', 'claims']).split('\n').filter((n) => n.endsWith('.json'));
      const blobs = readBlobs(names.map((n) => `origin/laptop-queue:${n}`));
      const requests = [];
      const claims = {};
      for (const n of names) {
        const t = blobs.get(`origin/laptop-queue:${n}`)?.text;
        if (n.startsWith('requests/')) { try { const r = JSON.parse(t); if (r?.id) requests.push(r); } catch { /* bad request: the service flags it */ } }
        else claims[path.posix.basename(n, '.json')] = parseClaim(t);
      }
      const logText = git(['log', '-n', '500', '--format=%ct %s', 'origin/laptop-queue']);
      const activity = { laptop: workerActivity(logText, 'laptop').last || 0, desktop: workerActivity(logText, 'desktop').last || 0 };
      return { requests, claims, activity };
    });
  }
  if (need('prs', 'labels', 'cloud')) {
    ctx.cloud = tryGet('cloud-queue', () => {
      const names = git(['ls-tree', '-r', '--name-only', 'origin/cloud-queue', 'briefs']).split('\n').filter((n) => n.endsWith('.md'));
      const blobs = readBlobs(names.map((n) => `origin/cloud-queue:${n}`));
      return names.map((n) => ({ path: n, ...(blobs.get(`origin/cloud-queue:${n}`) ?? { blob: null, text: '' }) }));
    });
  }
  if (need('release', 'pages', 'autotrain') && ctx.heads?.master) {
    ctx.release = tryGet('release', () => {
      const lines = git(['log', '--first-parent', '-n', '40', '--format=%H %ct', ctx.heads.master]).split('\n').filter(Boolean);
      const commits = lines.map((l) => { const [sha, ct] = l.split(' '); return { sha, at: Number(ct) * 1000 }; });
      const blobs = readBlobs(commits.map((c) => `${c.sha}:package.json`));
      for (const c of commits) { try { c.version = JSON.parse(blobs.get(`${c.sha}:package.json`)?.text ?? '{}').version ?? null; } catch { c.version = null; } }
      return versionCommit(commits);
    });
  }
  ctx.owner = ownerMap({ requests: ctx.lq?.requests ?? [], briefs: (ctx.cloud ?? []).map((b) => parseBrief(b.text)), override: readJsonFile(OWNERS_FILE) ?? {} });
  return ctx;
}

// ---- checks (each returns alerts; I/O here, decisions in the pure helpers) ----------------------------------------

function checkLocks(ctx) {
  if (!ctx.procs) throw new Error(`process list unavailable: ${ctx.errors.processes}`);
  const live = new Set(ctx.procs.map((p) => p.pid));
  const nodeLive = ctx.procs.some((p) => p.name.toLowerCase() === 'node.exe');
  return LOCKS.flatMap((f) => {
    let text = null, mtimeMs = null;
    try { text = fs.readFileSync(f, 'utf8'); mtimeMs = fs.statSync(f).mtimeMs; } catch { /* absent */ }
    return lockAlerts({ path: f, text, mtimeMs }, { now: ctx.now, alive: (pid) => live.has(pid) || pidAlive(pid), nodeLive });
  });
}

function checkOrphans(ctx) {
  if (!ctx.procs) throw new Error(`process list unavailable: ${ctx.errors.processes}`);
  return orphanAlerts(findOrphans(ctx.procs, ctx.now));
}

function checkPrs(ctx, o, state, which) {
  if (!ctx.prs) throw new Error(`PR list unavailable: ${ctx.errors.prs}`);
  const r = prAlerts(ctx.prs, { now: ctx.now, labelHeads: state.labelHeads ?? {}, owner: ctx.owner, labelFix: o.fix.has('labels'), requireAffected: o.requireAffected });
  ctx.labelHeads = r.labelHeads;
  return r.alerts.filter((a) => (which === 'labels' ? a.kind === 'pr-label-ready' : a.kind !== 'pr-label-ready'));
}

function checkRelease(ctx) {
  if (!ctx.heads || !ctx.prs) throw new Error(`refs or PRs unavailable: ${ctx.errors.heads ?? ctx.errors.prs}`);
  const master = ctx.heads.master, dev = ctx.heads.dev;
  const v = ctx.release;
  // ls-remote --exit-code: 0 found, 2 no such ref; anything else (network) is unknown, never "missing"
  const tr = v?.version ? exec(['git', 'ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/v${v.version}`]) : null;
  const tagExists = tr == null ? null : tr.status === 0 ? true : tr.status === 2 ? false : null;
  const members = ctx.prs.filter((p) => !isTrain(p.branch)).map((p) => {
    const r = exec(['git', 'merge-base', '--is-ancestor', p.head, master]);
    return { number: p.number, branch: p.branch, head: p.head, inMaster: r.status === 0 };
  });
  const devBehind = dev && master && dev !== master ? gitOk(['merge-base', '--is-ancestor', dev, master]) : false;
  return releaseAlerts({ master, dev, devBehind, version: v?.version, versionSha: v?.sha, tagExists, members });
}

async function checkPages(ctx, state) {
  const released = ctx.release ? { version: ctx.release.version, at: ctx.release.at } : null;
  if (!released) throw new Error(`master version unavailable: ${ctx.errors.release ?? 'no master ref'}`);
  let served = null, error = '';
  try {
    const get = async (url) => { const r = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { 'cache-control': 'no-cache' } }); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.text(); };
    const html = await get(`${PAGES_URL}?watchdog=${ctx.now}`);
    const src = indexScript(html);
    if (!src) throw new Error('no module script in /preview/index.html');
    const cache = state.pages;
    if (cache?.src === src && cache.version) served = { version: cache.version, sha: cache.sha ?? null };
    else {
      served = previewLabel(await get(new URL(src, PAGES_URL).href));
      if (served) state.pages = { src, ...served };
      else error = `no "v<version> PREVIEW" label in ${src}`;
    }
  } catch (e) { error = e.message; }
  return pagesAlerts({ released, served, error, now: ctx.now });
}

function checkAutoTrain(ctx) {
  let dir = process.env.WATCHDOG_AUTOTRAIN_DIR || null;
  if (!dir) { try { dir = /CurrentDirectory = "([^"]+)"/.exec(fs.readFileSync(AUTOTRAIN_VBS, 'utf8'))?.[1] ?? null; } catch { /* no task */ } }
  let head = null;
  if (dir && fs.existsSync(dir)) { const r = exec(['git', '-C', dir, 'rev-parse', 'HEAD']); if (r.status === 0) head = r.out.trim(); }
  return autoTrainAlerts({ status: readJsonFile(AUTOTRAIN_STATUS), now: ctx.now, head, master: ctx.heads?.master ?? null, dir });
}

function checkLaptop(ctx) {
  if (!ctx.lq) throw new Error(`laptop-queue unavailable: ${ctx.errors['laptop-queue']}`);
  const { requests, claims, activity } = ctx.lq;
  const trainHeads = new Set((ctx.prs ?? []).filter((p) => isTrain(p.branch)).map((p) => p.head));
  let desktopBeat = 0;
  for (const f of ['log.txt', 'runs']) {
    try {
      const p = path.join(DESKTOP_LQ_DIR, f);
      desktopBeat = Math.max(desktopBeat, fs.statSync(p).mtimeMs);
      if (f === 'runs') for (const e of fs.readdirSync(p)) desktopBeat = Math.max(desktopBeat, fs.statSync(path.join(p, e)).mtimeMs);
    } catch { /* absent */ }
  }
  const stale = {};
  for (const r of requests) {
    if (claims[r.id]?.done || r.pin) continue;
    const ref = r.branch ? `origin/${r.branch}` : r.pr ? `#${r.pr}` : null;
    const head = r.branch ? ctx.heads?.[r.branch] : r.pr ? ctx.prs?.find((p) => p.number === Number(r.pr))?.head : null;
    if (!ref || !head || head === r.sha) continue;
    const d = exec(['git', 'diff', '--name-only', r.sha, head]);
    if (d.status !== 0) continue;
    const files = nonTestFiles(d.out.split('\n').map((s) => s.trim())).length;
    if (files > 0) stale[r.id] = { ref, files };
  }
  return laptopAlerts({ requests, claims, trainHeads, activity, desktopBeat, stale, now: ctx.now });
}

function checkCloud(ctx) {
  if (!ctx.cloud) throw new Error(`cloud-queue unavailable: ${ctx.errors['cloud-queue']}`);
  const briefs = ctx.cloud.map((b) => {
    const p = parseBrief(b.text);
    let pushed = null;
    if (p.status === 'claimed' && p.at && p.branch && ctx.heads) {
      const sha = ctx.heads[p.branch];
      if (!sha) pushed = false;
      else {
        const r = exec(['git', 'log', '-1', '--format=%ct', sha]);
        pushed = r.status === 0 ? Number(r.out.trim()) * 1000 >= p.at - 60_000 : null;
      }
    }
    return { ...b, pushed };
  });
  return cloudAlerts(briefs, { now: ctx.now });
}

// ---- fixes (each re-reads what it acts on; dry run prints only) ---------------------------------------------------

function ghPr(n) { return JSON.parse(read(['gh', 'pr', 'view', String(n), '--repo', REPO, '--json', 'state,headRefOid,labels,comments'])); }

/** Runs (or under --dry-run prints) the fix of one alert -> the action text. */
async function runFix(f) {
  const would = (what) => { log(`  [dry-run] would ${what}`); return `[dry-run] would ${what}`; };
  switch (f.type) {
    case 'break-lock': {
      if (DRY) return would(`break ${f.path} ("${String(f.text).trim()}")`);
      let now = null;
      try { now = fs.readFileSync(f.path, 'utf8'); } catch { return 'already gone'; }
      if (now !== f.text) return 'skipped: the lock changed since it was read';
      const aside = `${f.path}.watchdog.${process.pid}`;
      fs.renameSync(f.path, aside);
      if (fs.readFileSync(aside, 'utf8') !== f.text) { try { fs.copyFileSync(aside, f.path, fs.constants.COPYFILE_EXCL); } catch { /* a taker got there */ } fs.rmSync(aside, { force: true }); return 'skipped: replaced while breaking'; }
      fs.rmSync(aside, { force: true });
      log(`  broke ${f.path}: "${String(f.text).trim()}"`);
      return `fixed: broke the lock`;
    }
    case 'kill': {
      if (DRY) return would(`taskkill /PID ${f.pid} /T /F`);
      const p = processes(`-Filter 'ProcessId=${f.pid}'`)[0];
      if (!p) return 'already gone';
      if (p.created !== f.created || p.cmd !== f.cmd || !NS_CMD.test(p.cmd)) return 'skipped: pid now names another process';
      const r = exec(['taskkill', '/PID', String(f.pid), '/T', '/F']);
      log(`  taskkill ${f.pid}: exit ${r.status} ${String(r.out).trim()} ${r.err.trim()}`);
      return r.status === 0 ? 'fixed: killed' : `fix failed: taskkill exit ${r.status}`;
    }
    case 'label':
    case 'unlabel': {
      const add = f.type === 'label';
      if (DRY) return would(`gh pr edit ${f.pr} --${add ? 'add' : 'remove'}-label ${LABEL} + comment`);
      const v = ghPr(f.pr);
      const has = (v.labels ?? []).some((l) => l.name === LABEL);
      if (v.state !== 'OPEN' || v.headRefOid !== f.head) return 'skipped: the PR changed since it was read';
      if (add === has) return `skipped: label already ${add ? 'there' : 'gone'}`;
      read(['gh', 'pr', 'edit', String(f.pr), '--repo', REPO, add ? '--add-label' : '--remove-label', LABEL]);
      const marker = `<!-- watchdog:${f.type}:${f.head} -->`;
      if (!(v.comments ?? []).some((c) => String(c.body).includes(marker))) {
        read(['gh', 'pr', 'comment', String(f.pr), '--repo', REPO, '--body', add ? labelComment(f.head, f.why) : unlabelComment(f.head)]);
      }
      log(`  #${f.pr}: ${add ? 'added' : 'removed'} ${LABEL}`);
      return `fixed: ${add ? 'labelled' : 'label removed'}`;
    }
    case 'close': {
      if (DRY) return would(`gh pr close ${f.pr} --comment "${closeMemberComment(f.head, f.version).split('\n')[0]}"`);
      const v = ghPr(f.pr);
      if (v.state !== 'OPEN') return 'already closed';
      if (v.headRefOid !== f.head) return 'skipped: the head moved';
      const master = git(['ls-remote', 'origin', 'refs/heads/master']).split('\t')[0];
      if (!gitOk(['merge-base', '--is-ancestor', f.head, master])) return 'skipped: the head is not in master';
      read(['gh', 'pr', 'close', String(f.pr), '--repo', REPO, '--comment', closeMemberComment(f.head, f.version)]);
      log(`  closed #${f.pr}`);
      return 'fixed: closed';
    }
    case 'push-dev': {
      if (DRY) return would(`git push origin ${f.master}:refs/heads/dev`);
      const refs = Object.fromEntries(git(['ls-remote', 'origin', 'refs/heads/master', 'refs/heads/dev']).split('\n').map((l) => { const [s, r] = l.split('\t'); return [r, s]; }));
      if (refs['refs/heads/master'] !== f.master || refs['refs/heads/dev'] !== f.dev) return 'skipped: dev or master moved since it was read';
      git(['push', 'origin', `${f.master}:refs/heads/dev`], { timeout: 120_000 });
      log(`  dev -> ${short(f.master)}`);
      return 'fixed: dev moved to master';
    }
    case 'push-tag': {
      if (DRY) return would(`git push origin ${f.sha}:refs/tags/${f.tag}`);
      if (exec(['git', 'ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${f.tag}`]).status === 0) return 'already tagged';
      git(['push', 'origin', `${f.sha}:refs/tags/${f.tag}`], { timeout: 120_000 });
      log(`  tagged ${f.tag} at ${short(f.sha)}`);
      return `fixed: pushed ${f.tag}`;
    }
    case 'reopen': {
      if (DRY) return would(`reopen ${f.path} on cloud-queue (status: open)`);
      const cur = JSON.parse(read(['gh', 'api', `repos/${REPO}/contents/${f.path}?ref=cloud-queue`]));
      const text = Buffer.from(String(cur.content ?? ''), 'base64').toString('utf8');
      if ((text.replace(/\r\n/g, '\n').split('\n')[0] ?? '') !== f.line) return 'skipped: the status line changed';
      const body = JSON.stringify({ message: `watchdog: reopen ${path.posix.basename(f.path)} (claimed by ${f.by ?? '?'}, no push of ${f.branch} in ${f.age} min)`,
        content: Buffer.from(reopenText(text, { by: f.by, branch: f.branch, age: f.age, now: Date.now() })).toString('base64'), sha: cur.sha, branch: 'cloud-queue' });
      read(['gh', 'api', '-X', 'PUT', `repos/${REPO}/contents/${f.path}`, '--input', '-'], { input: body });
      log(`  reopened ${f.path}`);
      return 'fixed: reopened';
    }
    default: return `unknown fix ${f.type}`;
  }
}

// ---- self-update -------------------------------------------------------------------------------------------------

const samePath = (a, b) => path.resolve(a).replace(/\\/g, '/').toLowerCase() === path.resolve(b).replace(/\\/g, '/').toLowerCase();

/** Moves this checkout to origin/master (detached) when it is the dedicated live checkout (or --self-update), clean, and no action is mid-way. */
function selfUpdate(o, state) {
  const on = o.selfUpdate === 'on' || (o.selfUpdate === 'auto' && samePath(REPO_DIR, LIVE_DIR));
  if (!on) return;
  if (DRY) { log('[dry-run] would self-update this checkout to origin/master'); return; }
  const marker = state.action;
  if (marker && Date.now() - (Date.parse(marker.at) || 0) < LIMITS.actionMarkerMin * 60_000) { log(`self-update skipped: an action is mid-way (${marker.what})`); return; }
  try {
    if (exec(['git', 'fetch', '-q', 'origin'], { timeout: 180_000 }).status !== 0) { log('self-update skipped: git fetch failed'); return; }
    const head = exec(['git', 'rev-parse', 'HEAD']).out.trim();
    const master = exec(['git', 'rev-parse', 'origin/master']).out.trim();
    const dirty = exec(['git', 'status', '--porcelain', '--untracked-files=no']).out.trim() !== '';
    const plan = selfUpdatePlan({ head, master, dirty });
    if (plan.action === 'update') {
      const r = exec(['git', 'checkout', '-q', '--detach', 'origin/master']);
      log(r.status === 0 ? `${plan.reason} (takes effect next tick)` : `self-update failed: ${r.err.trim().slice(-300)}`);
    } else if (plan.action === 'skip') log(plan.reason);
  } catch (e) { log(`self-update skipped: ${e.message}`); }
}

// ---- the tick ----------------------------------------------------------------------------------------------------

async function tick(o) {
  const state = readJsonFile(FILES.state) ?? {};
  selfUpdate(o, state);
  const ctx = gather(o);
  const run = {
    locks: () => checkLocks(ctx), orphans: () => checkOrphans(ctx), prs: () => checkPrs(ctx, o, state, 'prs'),
    labels: () => checkPrs(ctx, o, state, 'labels'), release: () => checkRelease(ctx), pages: () => checkPages(ctx, state),
    autotrain: () => checkAutoTrain(ctx), laptop: () => checkLaptop(ctx), cloud: () => checkCloud(ctx),
  };
  const checks = {};
  const all = [];
  for (const name of CHECKS) {
    if (!o.checks.has(name)) { checks[name] = 'off'; continue; }
    try { const a = await run[name](); all.push(...a); checks[name] = 'ok'; } catch (e) {
      checks[name] = `error: ${e.message.slice(0, 300)}`;
      all.push(alert('check-error', name, 'warn', e.message.slice(0, 400)));
    }
  }
  const { shown, held, since } = applySince(all, state.since, ctx.now);
  // fixes: a marker in the state while they run, so a self-update never lands mid-way
  const toFix = shown.filter((a) => a.fix && o.fix.has(a.fix.check));
  if (toFix.length && !DRY) { state.action = { at: new Date().toISOString(), what: toFix.map((a) => a.id).join(', ') }; writeState(state); }
  const results = new Map();
  for (const a of toFix) {
    log(`fix ${a.id}: ${a.fix.desc}`);
    try { results.set(a.id, await runFix(a.fix)); } catch (e) { results.set(a.id, `fix failed: ${e.message.slice(0, 300)}`); log(`  fix failed: ${e.message}`); }
  }
  delete state.action;
  const alerts = shown.map((a) => ({ id: a.id, severity: a.severity, kind: a.kind, subject: a.subject, detail: a.detail, since: a.since, action: actionText(a, o.fix, results.get(a.id)) }));
  const prevIds = new Set(Object.keys(state.shown ?? {}));
  for (const a of alerts) if (!prevIds.has(a.id)) log(`NEW ${a.severity} ${a.id}: ${a.detail} -> ${a.action}`);
  for (const id of prevIds) if (!alerts.some((a) => a.id === id)) log(`CLEARED ${id}`);
  const status = { time: new Date().toISOString(), ...(DRY ? { dryRun: true } : {}), fix: [...o.fix], alerts, held, checks, ms: Date.now() - ctx.now };
  fs.mkdirSync(path.dirname(FILES.status), { recursive: true });
  fs.writeFileSync(FILES.status, `${JSON.stringify(status, null, 1)}\n`);
  if (!DRY) {
    state.since = since;
    state.shown = Object.fromEntries(alerts.map((a) => [a.id, a.since]));
    if (ctx.labelHeads) state.labelHeads = ctx.labelHeads;
    writeState(state);
  }
  log(`tick: ${alerts.length} alert(s) (${alerts.filter((a) => a.severity === 'high').length} high), ${held.length} held in grace, ${status.ms} ms; checks ${Object.entries(checks).filter(([, v]) => v !== 'ok').map(([k, v]) => `${k} ${v}`).join('; ') || 'all ok'}`);
  return status;
}

function writeState(state) {
  try { fs.mkdirSync(path.dirname(FILES.state), { recursive: true }); fs.writeFileSync(FILES.state, `${JSON.stringify(state)}\n`); } catch (e) { log(`state write failed: ${e.message}`); }
}

async function main(argv) {
  const o = parseArgs(argv);
  DRY = o.dry;
  FILES = scratchFiles(SCRATCH, DRY);
  const lock = takeTouchLock(FILES.lock, `watchdog${DRY ? ' dry-run' : ''}`, { staleMin: 10, log });
  if (!lock.release) { log(`lock held (${lock.holder}, ${Math.round(lock.ageMin)} min): skipping this tick`); return 0; }
  try {
    log(`tick${DRY ? ' (dry run: nothing is pushed, labelled, commented, closed, killed or broken)' : ''} in ${REPO_DIR}${o.fix.size ? `, fixes: ${[...o.fix].join(',')}` : ', alerts only'}`);
    const s = await tick(o);
    for (const a of s.alerts) console.log(`  ${a.severity.padEnd(4)} ${a.id}: ${a.detail} -> ${a.action}`);
  } finally { lock.release(); }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(ARGV).then((code) => process.exit(code), (e) => { console.error(`watchdog: ${e.message}`); process.exit(1); });
}
